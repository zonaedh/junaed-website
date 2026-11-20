"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { MediaItem } from "@/lib/media/types";

/**
 * Media picker modal — the one control every image field uses.
 *
 * It is a controlled input: the parent holds the media id, the picker only
 * reports a choice. That keeps the form a plain FormData POST, so the server
 * action validates an id exactly like it validates a string.
 *
 * The id is submitted as a hidden input named after the field, so the existing
 * registry-driven save action needs no special case for images.
 */
export function MediaPicker({
  name,
  label,
  value,
  items,
  help,
}: {
  name: string;
  label: string;
  value: string;
  items: MediaItem[];
  help?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(value);
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const current = items.find((item) => String(item.id) === selectedId) ?? null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const images = items.filter((item) => item.mime.startsWith("image/"));
    if (!term) return images;
    return images.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.alt.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term),
    );
  }, [items, search]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div>
      <span className="mb-1 block text-xs font-bold">{label}</span>

      <input type="hidden" name={name} value={selectedId} />

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line bg-white p-2.5">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface">
          {current?.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.thumbUrl}
              alt={current.alt || current.title}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-[10px] text-muted">Empty</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">
            {current ? current.title || current.key : "No image selected"}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="min-h-8 rounded-lg bg-violet-950 px-2.5 text-[11px] font-bold text-white"
            >
              {current ? "Change" : "Choose image"}
            </button>
            {current ? (
              <button
                type="button"
                onClick={() => setSelectedId("")}
                className="min-h-8 rounded-lg border border-line px-2.5 text-[11px] font-bold text-[#5e5a6b] hover:border-red-200 hover:text-red-700"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {help ? <p className="mt-1 text-[11px] text-muted">{help}</p> : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-violet-950/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="flex max-h-[85vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[18px] border border-line bg-white shadow-xl outline-none"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 id={titleId} className="text-sm font-bold">
                Choose an image
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-8 rounded-lg border border-line px-2.5 text-xs font-bold text-muted"
              >
                Cancel
              </button>
            </div>

            <div className="border-b border-line px-4 py-3">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search images"
                className="min-h-9 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-violet-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  No images yet. Upload one in the media library first.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {filtered.map((item) => {
                    const isCurrent = String(item.id) === selectedId;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(String(item.id));
                            setOpen(false);
                          }}
                          className={`block w-full overflow-hidden rounded-[10px] border text-left transition ${
                            isCurrent
                              ? "border-violet-600 ring-2 ring-violet-200"
                              : "border-line hover:border-violet-300"
                          }`}
                        >
                          <span className="block aspect-[4/3] bg-surface">
                            {item.thumbUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.thumbUrl}
                                alt={item.alt || item.title}
                                loading="lazy"
                                className="size-full object-cover"
                              />
                            ) : null}
                          </span>
                          <span className="block truncate px-2 py-1.5 text-[11px] font-semibold">
                            {item.title || item.key}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
