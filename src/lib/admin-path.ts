import { headers } from "next/headers";

/**
 * Admin base path for the current request.
 *
 * The admin panel is designed to live on its own host (`admin.example.com`),
 * where the proxy rewrites `/settings` into the `/admin` route tree. On
 * loopback there is no admin subdomain and no rewrite, so the panel is served
 * under `/admin/...` instead (D-020).
 *
 * Every admin link and redirect therefore has to know which world it is in.
 * `""` means the admin host (clean URLs); `"/admin"` means loopback.
 *
 * Server-side only — it reads request headers. Client components derive the
 * same thing from `usePathname()` instead.
 */
export async function getAdminBase(): Promise<string> {
  const host = (await headers()).get("host") ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1";

  return isLoopback ? "/admin" : "";
}

/** Prefix an admin path for the current host. */
export async function adminHref(path: string): Promise<string> {
  const base = await getAdminBase();
  return `${base}${path}`;
}
