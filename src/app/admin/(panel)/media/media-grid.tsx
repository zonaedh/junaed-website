"use client";

import { useMemo, useState } from "react";
import type { MediaItem } from "@/lib/media/types";
import { formatBytes } from "@/lib/media/types";
import { MediaDetail } from "./media-detail";
import type { MediaUsage } from "@/lib/media/types";

/**
 * Media grid with search and type filter.
 *
 * Filtering is client-side over the rows the server already sent. The library
 * is small by design (a portfolio site, not a stock archive), so a round trip
 * per keystroke would be slower and worse.
 */
export function MediaGrid({
  items,
  usageById,
  adminBase,
}: {
  items: MediaItem[];
  usageById: Record<number, MediaUsage[]>;
  adminBase: string;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "image" | "document">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (type === "image" && !item.mime.startsWith("image/")) return false;
      if (type === "document" && item.mime.startsWith("image/")) return false;
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.alt.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term)
      );
    });
  }, [items, search, type]);

  const selected = selectedId
    ? items.find((item) => item.id === selectedId) ?? null
    : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, alt text or filename"
            className="min-h-10 min-w-[220px] flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-violet-500"
          />
          <div className="flex overflow-hidden rounded-lg border border-line">
            {(["all", "image", "document"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                aria-pressed={type === option}
                className={`min-h-10 px-3 text-xs font-bold capitalize transition-colors ${
                  type === option
                    ? "bg-violet-950 text-white"
                    : "bg-white text-[#5e5a6b] hover:bg-violet-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            Nothing uploaded yet. Drop a file above to start the library.
          </p>
        ) : filtered.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            No files match that search.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const inUse = (usageById[item.id] ?? []).length > 0;
              const isSelected = selectedId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    aria-pressed={isSelected}
                    className={`group block w-full overflow-hidden rounded-[12px] border text-left transition ${
                      isSelected
                        ? "border-violet-600 ring-2 ring-violet-200"
                        : "border-line hover:border-violet-200"
                    }`}
                  >
                    <span className="relative block aspect-[4/3] bg-surface">
                      {item.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbUrl}
                          alt={item.alt || item.title}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-[11px] font-bold text-muted">
                          {item.mime === "application/pdf" ? "PDF" : "FILE"}
                        </span>
                      )}
                      {inUse ? (
                        <span className="absolute top-1.5 left-1.5 rounded-full bg-violet-950/85 px-2 py-0.5 text-[10px] font-bold text-white">
                          In use
                        </span>
                      ) : null}
                    </span>
                    <span className="block px-2.5 py-2">
                      <span className="block truncate text-xs font-bold">
                        {item.title || item.key}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {formatBytes(item.size)}
                        {item.width ? ` · ${item.width}×${item.height}` : ""}
                      </span>
                      {!item.alt ? (
                        <span className="mt-0.5 block text-[10px] font-bold text-amber-700">
                          No alt text
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        {selected ? (
          <MediaDetail
            key={selected.id}
            item={selected}
            usage={usageById[selected.id] ?? []}
            adminBase={adminBase}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="rounded-[18px] border border-line bg-surface p-4 text-sm text-muted">
            Select an image to edit its alt text, title and caption.
          </div>
        )}
      </div>
    </div>
  );
}
