"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { countWords, readingMinutes, type TiptapDoc } from "@/lib/posts/content";
import { MediaPicker } from "@/components/admin/media-picker";
import type { MediaItem } from "@/lib/media/types";

/**
 * Tiptap editor for post bodies (MVP.md §4.1).
 *
 * The document is submitted as a hidden input holding Tiptap JSON. That is the
 * same shape stored in `posts.content`, so there is no HTML round trip and no
 * sanitiser to get wrong on the way in or out.
 *
 * Word count and reading time are shown live but recalculated on the server at
 * save time — the display is a convenience, the stored value is derived from
 * the body.
 */
export function PostEditor({
  name,
  initialDoc,
  media,
}: {
  name: string;
  initialDoc: TiptapDoc;
  media: MediaItem[];
}) {
  const [json, setJson] = useState(() => JSON.stringify(initialDoc));
  const [stats, setStats] = useState(() => ({
    words: countWords(initialDoc),
    minutes: readingMinutes(initialDoc),
  }));
  const [imageOpen, setImageOpen] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: "rounded-lg bg-surface p-3" } },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: "Start writing. Use the toolbar for headings, lists and quotes.",
      }),
    ],
    content: initialDoc,
    editorProps: {
      attributes: {
        class:
          "prose-site min-h-[420px] max-w-none px-4 py-3 outline-none focus:outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => {
      const doc = instance.getJSON() as TiptapDoc;
      setJson(JSON.stringify(doc));
      setStats({ words: countWords(doc), minutes: readingMinutes(doc) });
    },
  });

  // Keep the hidden input in sync even if the editor mounts after first paint.
  useEffect(() => {
    if (hiddenRef.current) hiddenRef.current.value = json;
  }, [json]);

  if (!editor) {
    return (
      <div className="rounded-[12px] border border-line bg-surface px-4 py-10 text-center text-sm text-muted">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-white">
      <input ref={hiddenRef} type="hidden" name={name} value={json} readOnly />

      <Toolbar editor={editor} onImage={() => setImageOpen(true)} />

      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-xs text-muted">
        <span>
          {stats.words} word{stats.words === 1 ? "" : "s"} · {stats.minutes} min
          read
        </span>
        <span>Saved with the post, not automatically.</span>
      </div>

      {imageOpen ? (
        <div className="border-t border-line p-4">
          <MediaPicker
            name="__editorImage"
            label="Insert image"
            value=""
            items={media}
            help="Pick an image, then press Insert."
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const field = document.querySelector<HTMLInputElement>(
                  'input[name="__editorImage"]',
                );
                const id = field?.value;
                const item = media.find((entry) => String(entry.id) === id);
                if (item) {
                  editor
                    .chain()
                    .focus()
                    .setImage({ src: item.url, alt: item.alt || item.title })
                    .run();
                }
                setImageOpen(false);
              }}
              className="min-h-9 rounded-lg bg-violet-950 px-3 text-xs font-bold text-white"
            >
              Insert
            </button>
            <button
              type="button"
              onClick={() => setImageOpen(false)}
              className="min-h-9 rounded-lg border border-line px-3 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Toolbar({
  editor,
  onImage,
}: {
  editor: Editor;
  onImage: () => void;
}) {
  const buttons: {
    label: string;
    title: string;
    isActive?: boolean;
    run: () => void;
  }[] = [
    {
      label: "H2",
      title: "Heading 2",
      isActive: editor.isActive("heading", { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "H3",
      title: "Heading 3",
      isActive: editor.isActive("heading", { level: 3 }),
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "B",
      title: "Bold",
      isActive: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "I",
      title: "Italic",
      isActive: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "•",
      title: "Bullet list",
      isActive: editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "1.",
      title: "Numbered list",
      isActive: editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "❝",
      title: "Quote",
      isActive: editor.isActive("blockquote"),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "</>",
      title: "Code block",
      isActive: editor.isActive("codeBlock"),
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "—",
      title: "Divider",
      run: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      label: "↗",
      title: "Link",
      isActive: editor.isActive("link"),
      run: () => {
        const previous = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Link URL", previous ?? "https://");
        if (url === null) return;
        if (url.trim() === "") {
          editor.chain().focus().unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
    },
    {
      label: "▣",
      title: "Image",
      run: onImage,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line bg-surface px-2 py-1.5">
      {buttons.map((button) => (
        <button
          key={button.title}
          type="button"
          title={button.title}
          aria-label={button.title}
          aria-pressed={button.isActive}
          onClick={button.run}
          className={`min-h-8 min-w-8 rounded-md px-2 text-xs font-bold transition-colors ${
            button.isActive
              ? "bg-violet-950 text-white"
              : "text-[#5e5a6b] hover:bg-violet-100 hover:text-violet-900"
          }`}
        >
          {button.label}
        </button>
      ))}
      <span className="ml-auto pr-1 text-[11px] text-muted">
        {editor.isActive("codeBlock") ? "Code" : "Rich text"}
      </span>
    </div>
  );
}
