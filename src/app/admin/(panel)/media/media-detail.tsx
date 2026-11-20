"use client";

import { useActionState, useState } from "react";
import {
  deleteMedia,
  updateMedia,
  type DeleteState,
  type MediaEditState,
} from "./actions";
import type { MediaItem, MediaUsage } from "@/lib/media/types";
import { formatBytes } from "@/lib/media/types";

/**
 * Media detail panel: alt text, title, caption, usage, delete.
 *
 * Alt text is the field that actually matters. It is required by the image
 * components on the public site, and an empty alt on a content image is an
 * accessibility failure, so the panel marks it as required and the save
 * action stores whatever is typed verbatim.
 */

const initialEdit: MediaEditState = { status: "idle" };
const initialDelete: DeleteState = { status: "idle" };

export function MediaDetail({
  item,
  usage,
  adminBase,
  onClose,
}: {
  item: MediaItem;
  usage: MediaUsage[];
  adminBase: string;
  onClose: () => void;
}) {
  const [editState, editAction, editPending] = useActionState(
    updateMedia.bind(null, item.id),
    initialEdit,
  );
  const [deleteState, setDeleteState] = useState<DeleteState>(initialDelete);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    const result = await deleteMedia(item.id);
    setDeleteState(result);
    if (result.status === "deleted") {
      onClose();
    }
  }

  return (
    <div className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold">Image details</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-8 rounded-lg border border-line px-2.5 text-xs font-bold text-muted hover:border-violet-200 hover:text-violet-800"
        >
          Close
        </button>
      </div>

      <div className="mb-4 overflow-hidden rounded-[12px] border border-line bg-surface">
        {item.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbUrl}
            alt={item.alt || item.title}
            className="block h-auto w-full"
          />
        ) : (
          <div className="grid h-32 place-items-center text-xs text-muted">
            {item.mime}
          </div>
        )}
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-muted">Type</dt>
        <dd className="font-semibold">{item.mime}</dd>
        <dt className="text-muted">Size</dt>
        <dd className="font-semibold">{formatBytes(item.size)}</dd>
        {item.width && item.height ? (
          <>
            <dt className="text-muted">Dimensions</dt>
            <dd className="font-semibold">
              {item.width} × {item.height}
            </dd>
          </>
        ) : null}
      </dl>

      <form action={editAction} className="space-y-3">
        <div>
          <label htmlFor="alt" className="mb-1 block text-xs font-bold">
            Alt text <span className="text-red-600">*</span>
          </label>
          <textarea
            id="alt"
            name="alt"
            rows={2}
            defaultValue={item.alt}
            maxLength={300}
            placeholder="Describe the image for someone who cannot see it."
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
          {editState.errors?.alt ? (
            <p className="mt-1 text-xs text-red-700">{editState.errors.alt}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="title" className="mb-1 block text-xs font-bold">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={item.title}
            maxLength={200}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label htmlFor="caption" className="mb-1 block text-xs font-bold">
            Caption
          </label>
          <textarea
            id="caption"
            name="caption"
            rows={2}
            defaultValue={item.caption}
            maxLength={600}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={editPending}
            className="min-h-9 rounded-lg bg-violet-950 px-3.5 text-xs font-bold text-white disabled:opacity-40"
          >
            {editPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(item.url);
            }}
            className="min-h-9 rounded-lg border border-line px-3 text-xs font-bold text-[#5e5a6b] hover:border-violet-200 hover:text-violet-800"
          >
            Copy URL
          </button>
          {editState.status === "saved" ? (
            <span className="text-xs font-semibold text-emerald-700">Saved.</span>
          ) : null}
        </div>
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="mb-2 text-xs font-bold">Used in</h3>
        {usage.length === 0 ? (
          <p className="text-xs text-muted">Not used anywhere yet.</p>
        ) : (
          <ul className="space-y-1">
            {usage.map((entry) => (
              <li key={`${entry.href}-${entry.label}`} className="text-xs">
                <a
                  href={entry.href}
                  className="font-semibold text-violet-800 hover:underline"
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        {usage.length > 0 ? (
          <p className="text-xs leading-[1.6] text-muted">
            This image cannot be deleted while it is in use. Remove it from the
            places listed above first.
          </p>
        ) : confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold">Delete permanently?</span>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="min-h-8 rounded-lg bg-red-700 px-3 text-xs font-bold text-white"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-8 rounded-lg border border-line px-3 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-8 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
          >
            Delete image
          </button>
        )}

        {deleteState.status === "blocked" ? (
          <p className="mt-2 text-xs text-red-700">{deleteState.message}</p>
        ) : null}
        {deleteState.status === "error" ? (
          <p className="mt-2 text-xs text-red-700">{deleteState.message}</p>
        ) : null}
      </div>

      <p className="mt-4 text-[11px] text-muted">
        <a href={`${adminBase}/media`} className="hover:underline">
          Manage in the media library
        </a>
      </p>
    </div>
  );
}
