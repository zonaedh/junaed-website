import { notFound, redirect, permanentRedirect } from "next/navigation";
import { getRedirectMap, recordNotFound } from "@/lib/seo/repository";
import { canonicalPath } from "@/lib/seo/core";

/**
 * Catch-all for unmatched public paths (MVP.md 6.1 and 6.2).
 *
 * This is where the redirect manager and the 404 log live. Next proxy is
 * explicitly not for data fetching (node_modules/next/dist/docs 16-proxy.md),
 * so a database-backed redirect cannot be resolved there. A catch-all route is
 * the supported place for it: it runs in the Node runtime, can read the
 * database, and still returns a real 301/302 rather than a client-side bounce.
 *
 * Order matters:
 *  1. Look for a redirect. A hit returns before anything is logged, so a
 *     working redirect never pollutes the 404 log.
 *  2. Otherwise record the miss and render the 404 page.
 */

type Params = { path?: string[] };

export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

export default async function CatchAllPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { path } = await params;
  const requested = `/${(path ?? []).join("/")}`;

  let target: { to: string; code: number } | null = null;
  try {
    const map = await getRedirectMap();
    target = map[canonicalPath(requested)] ?? null;
  } catch {
    // A database failure must not turn a 404 into a 500.
    target = null;
  }

  if (target) {
    // 301/308 are permanent; 302/307 are temporary. The distinction is what
    // tells a crawler whether to keep the old URL in its index.
    // Legacy rows may hold 301/302 from before the codes were normalised, so
    // both spellings of each kind are honoured.
    if (target.code === 301 || target.code === 308) {
      permanentRedirect(target.to);
    }
    redirect(target.to);
  }

  try {
    await recordNotFound({ path: requested });
  } catch {
    // Logging a 404 is best-effort. Never let it break the response.
  }

  notFound();
}
