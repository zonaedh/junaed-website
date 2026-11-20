import { NextResponse, type NextRequest } from "next/server";

/**
 * Host-based routing + admin hardening.
 *
 * Next.js 16 renamed Middleware to Proxy; the file is `src/proxy.ts`.
 * See DECISIONS.md D-002 (single app, host routing) and D-012 (admin never
 * indexed).
 *
 * Responsibilities:
 *  1. On the admin host: add X-Robots-Tag noindex to EVERY response, and
 *     serve a `Disallow: /` robots.txt. The header is what actually keeps
 *     Google out; robots.txt alone does not.
 *  2. On the admin host: rewrite `/` and unknown paths into the /admin tree
 *     so admin URLs are clean (admin.example.com/login, not /admin/login).
 *  3. On the public host: block any /admin or /api/admin path so the admin
 *     surface is not reachable from the public domain.
 *
 * No DB or secret access here — proxy runs on every request.
 */

const ADMIN_HOST_PREFIX = "admin.";

function isAdminHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname.startsWith(ADMIN_HOST_PREFIX);
}

/** Paths that must stay reachable on the admin host without rewriting. */
const ADMIN_PASSTHROUGH = ["/_next", "/favicon.ico", "/robots.txt", "/api"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host");
  const adminHost = isAdminHost(host);

  if (adminHost) {
    // robots.txt for the admin host: disallow everything.
    if (pathname === "/robots.txt") {
      return new NextResponse("User-agent: *\nDisallow: /\n", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
          "cache-control": "public, max-age=3600",
        },
      });
    }

    const response = ADMIN_PASSTHROUGH.some((prefix) =>
      pathname.startsWith(prefix),
    )
      ? NextResponse.next()
      : rewriteAdmin(request, pathname, search);

    response.headers.set(
      "x-robots-tag",
      "noindex, nofollow, noarchive, nosnippet",
    );
    return response;
  }

  // Public host: the admin surface must not be reachable here.
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin")
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.next();
}

/**
 * Map an admin-host path onto the /admin route tree.
 *   /            -> /admin
 *   /login       -> /admin/login
 *   /posts/123   -> /admin/posts/123
 * Paths already under /admin are left alone (defensive, avoids double prefix).
 */
function rewriteAdmin(request: NextRequest, pathname: string, search: string) {
  const target = pathname.startsWith("/admin")
    ? pathname
    : pathname === "/"
      ? "/admin"
      : `/admin${pathname}`;

  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip static assets and image optimisation for speed.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
