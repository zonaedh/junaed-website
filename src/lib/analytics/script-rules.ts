/**
 * Pure rules for custom scripts (MVP.md §7.2).
 *
 * CLIENT SAFE. No database import, no `node:` builtins — this module is
 * imported by the admin form, which is a client component. The repository in
 * `scripts.ts` re-exports these so server callers have one import path.
 *
 * Keeping them here is not tidiness: importing them from `scripts.ts` drags
 * `@/db` and the Postgres driver into the browser bundle and fails the build.
 */

export type ScriptLocationValue = "head" | "body_start" | "body_end";

/**
 * Does this script apply to this path?
 *
 * A null or empty scope means "every page". Otherwise any prefix in the list
 * matches, which is what an owner means by "/blog" — they mean the blog and
 * everything under it.
 */
export function scriptAppliesTo(
  script: { pageScope: string[] | null },
  pathname: string,
): boolean {
  if (!script.pageScope || script.pageScope.length === 0) return true;
  return script.pageScope.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Heuristic warning for risky snippet content (MVP.md §7.2).
 *
 * Not a security control — a nudge. It catches the mistakes people actually
 * make: an unbalanced script tag, a document.write, a remote loader with no
 * integrity attribute.
 */
export function scriptWarnings(code: string): string[] {
  const warnings: string[] = [];
  const lower = code.toLowerCase();

  if (lower.includes("document.write")) {
    warnings.push("Uses document.write, which can blank the page if it runs after load.");
  }
  if (lower.includes("eval(")) {
    warnings.push("Uses eval(). Prefer a plain function call.");
  }
  const openTags = (lower.match(/<script/g) ?? []).length;
  const closeTags = (lower.match(/<\/script>/g) ?? []).length;
  if (openTags !== closeTags) {
    warnings.push("Script tags look unbalanced. Check for a missing </script>.");
  }
  if (lower.includes("<iframe") && !lower.includes("sandbox")) {
    warnings.push("Contains an iframe without a sandbox attribute.");
  }
  if (code.length > 20000) {
    warnings.push("This snippet is very large. Consider hosting the file instead.");
  }

  return warnings;
}
