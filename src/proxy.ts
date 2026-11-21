import { NextResponse, type NextRequest } from "next/server";
import { clientAddressFromHeaders, isAddressBlocked } from "@/lib/security/ip";
import { getActiveBlockEntries } from "@/lib/security/blocks";
import { hit } from "@/lib/security/proxy-limiter";
import { retryAfterSeconds, ruleForPath } from "@/lib/security/rate-limit-rules";

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

/**
 * Loopback hosts, used only so the admin panel is reachable during local
 * development. On localhost there is no admin subdomain to route by, so
 * /admin/... is served directly. This branch can never run in production:
 * a deployed request arrives with the real domain in the Host header.
 */
function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

/** Paths that must stay reachable on the admin host without rewriting. */
const ADMIN_PASSTHROUGH = ["/_next", "/favicon.ico", "/robots.txt", "/api"];

/**
 * Block list + rate limit (MVP.md §8.1, §8.2).
 *
 * Both run before any routing decision, so a blocked client gets 403 on every
 * path — public and admin alike — and a flooding client gets 429 with a
 * Retry-After.
 *
 * The block list is read through a one-minute in-process cache (see
 * lib/security/blocks). The docs are explicit that the proxy is not the place
 * for slow data fetching, and a database round trip on every request would be
 * exactly that. The cost is up to a minute of staleness on a newly added block.
 *
 * The limiter is in-process and therefore per-instance; it is a cheap first
 * gate, not a distributed one (D-040).
 */
async function guardRequest(request: NextRequest): Promise<NextResponse | null> {
  const address = clientAddressFromHeaders(request.headers);

  // No address means no proxy in front (local dev). Nothing to key on, so the
  // guards are skipped rather than shared across every visitor under one key.
  if (!address) return null;

  try {
    const entries = await getActiveBlockEntries();
    if (entries.length > 0 && isAddressBlocked(address, entries)) {
      return new NextResponse("Forbidden", {
        status: 403,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow",
        },
      });
    }
  } catch (error) {
    // A failure here must not take the site down; the limiter still runs.
    console.error("[proxy] block list check failed", error);
  }

  const rule = ruleForPath(request.nextUrl.pathname);
  if (rule) {
    const outcome = hit(`${rule.name}:${address}`, rule.limit, rule.windowMs);
    if (!outcome.allowed) {
      return new NextResponse("Too many requests. Please slow down.", {
        status: 429,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "retry-after": String(retryAfterSeconds(outcome.resetAt)),
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow",
        },
      });
    }
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const guarded = await guardRequest(request);
  if (guarded) return guarded;

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
    // Local development exception: there is no admin subdomain on localhost,
    // so /admin is the only way to open the panel. Still noindexed, because
    // the header costs nothing and keeps dev and prod behaviour aligned.
    if (isLoopbackHost(host)) {
      const response = NextResponse.next();
      response.headers.set(
        "x-robots-tag",
        "noindex, nofollow, noarchive, nosnippet",
      );
      return response;
    }
    return new NextResponse("Not found", { status: 404 });
  }

  // Forward the path so server components can scope custom snippets without
  // becoming client components. Set on the request, not the response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
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
