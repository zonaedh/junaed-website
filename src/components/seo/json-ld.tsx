import { serializeJsonLd } from "@/lib/seo/core";

/**
 * Renders one or more JSON-LD nodes.
 *
 * A server component with no client JS: the script tag goes into the HTML the
 * crawler receives. `serializeJsonLd` escapes `<` so a `</script>` inside any
 * string (a post title, a description) cannot break out of the block.
 */
export function JsonLd({ nodes }: { nodes: unknown | unknown[] }) {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  if (list.length === 0) return null;

  return (
    <>
      {list.map((node, index) => (
        <script
          key={index}
          type="application/ld+json"
          // The payload is JSON we built ourselves and `<` is escaped above.
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(node) }}
        />
      ))}
    </>
  );
}
