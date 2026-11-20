import Image from "next/image";
import type { TiptapNode, TiptapDoc } from "@/lib/posts/content";

/**
 * Render a Tiptap document as React elements.
 *
 * Deliberately not `dangerouslySetInnerHTML`. A JSONB column is data, and data
 * that reaches the DOM as HTML is how stored XSS happens. Every node is mapped
 * to a specific element here; anything unrecognised renders nothing. The
 * document is also pruned before it gets here (lib/posts/content.ts).
 */

function renderText(node: TiptapNode, key: string) {
  let element: React.ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        element = <strong>{element}</strong>;
        break;
      case "italic":
        element = <em>{element}</em>;
        break;
      case "code":
        element = <code>{element}</code>;
        break;
      case "strike":
        element = <s>{element}</s>;
        break;
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
        // Only http(s), mailto and site-relative links survive.
        const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : "#";
        element = (
          <a href={safe} rel="noopener noreferrer nofollow" target="_blank">
            {element}
          </a>
        );
        break;
      }
      default:
        break;
    }
  }

  return <span key={key}>{element}</span>;
}

function renderNode(node: TiptapNode, key: string): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={key}>
          {(node.content ?? []).map((child, index) =>
            renderNode(child, `${key}-${index}`),
          )}
        </p>
      );

    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const children = (node.content ?? []).map((child, index) =>
        renderNode(child, `${key}-${index}`),
      );
      if (level === 3) return <h3 key={key}>{children}</h3>;
      if (level === 4) return <h4 key={key}>{children}</h4>;
      return <h2 key={key}>{children}</h2>;
    }

    case "text":
      return renderText(node, key);

    case "bulletList":
      return (
        <ul key={key}>
          {(node.content ?? []).map((child, index) =>
            renderNode(child, `${key}-${index}`),
          )}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key}>
          {(node.content ?? []).map((child, index) =>
            renderNode(child, `${key}-${index}`),
          )}
        </ol>
      );

    case "listItem":
      return (
        <li key={key}>
          {(node.content ?? []).map((child, index) =>
            renderNode(child, `${key}-${index}`),
          )}
        </li>
      );

    case "blockquote":
      return (
        <blockquote key={key}>
          {(node.content ?? []).map((child, index) =>
            renderNode(child, `${key}-${index}`),
          )}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre key={key}>
          <code>
            {(node.content ?? []).map((child) => child.text ?? "").join("")}
          </code>
        </pre>
      );

    case "horizontalRule":
      return <hr key={key} />;

    case "hardBreak":
      return <br key={key} />;

    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      if (!src) return null;
      return (
        <Image
          key={key}
          src={src}
          alt={alt}
          width={1200}
          height={800}
          sizes="(max-width: 768px) 100vw, 720px"
          className="h-auto w-full rounded-[14px]"
        />
      );
    }

    default:
      return null;
  }
}

export function PostBody({ doc }: { doc: TiptapDoc }) {
  return (
    <div className="prose-site">
      {(doc.content ?? []).map((node, index) =>
        renderNode(node, `node-${index}`),
      )}
    </div>
  );
}
