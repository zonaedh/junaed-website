import { getActiveScripts } from "@/lib/analytics/scripts";
import { scriptAppliesTo } from "@/lib/analytics/script-rules";

/**
 * Renders the owner's custom snippets (MVP.md §7.2).
 *
 * A server component, so the HTML is in the first response rather than added
 * after hydration. That is what a snippet author expects.
 *
 * Scoping is applied here because it depends on the current path. `pathname`
 * comes from the caller, which reads it from the request — this component must
 * not call `usePathname`, because it has to stay a server component.
 */
export async function CustomScripts({
  pathname,
  location,
}: {
  pathname: string;
  location: "head" | "body_start" | "body_end";
}) {
  let scripts: Awaited<ReturnType<typeof getActiveScripts>> = [];

  try {
    scripts = await getActiveScripts();
  } catch {
    // A database failure must not take the page down.
    return null;
  }

  const matching = scripts.filter(
    (script) => script.location === location && scriptAppliesTo(script, pathname),
  );

  if (matching.length === 0) return null;

  return (
    <>
      {matching.map((script) => (
        <script
          key={script.id}
          // The owner pasted this deliberately; it is the whole point of the
          // feature. The admin warns on risky content and keeps a rollback.
          dangerouslySetInnerHTML={{ __html: script.code }}
        />
      ))}
    </>
  );
}