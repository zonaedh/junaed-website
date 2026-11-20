"use client";

import { useActionState, useRef, useState } from "react";
import { uploadMedia, type UploadState } from "./actions";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/media/types";

/**
 * Uploader: drag and drop, multi-file, with per-file progress state.
 *
 * The form posts to a Server Action, so the browser sends the files and the
 * server does the validating, the sharp work and the storage write. Nothing
 * here trusts the filename or the declared type — see lib/media/process.ts.
 */

const initialState: UploadState = { status: "idle" };

export function MediaUploader() {
  const [state, formAction, pending] = useActionState(uploadMedia, initialState);
  const [dragging, setDragging] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function describe(files: FileList | null) {
    if (!files) return setChosen([]);
    setChosen(Array.from(files).map((file) => file.name));
  }

  return (
    <form action={formAction} className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!inputRef.current || !event.dataTransfer.files.length) return;
          inputRef.current.files = event.dataTransfer.files;
          describe(event.dataTransfer.files);
        }}
        className={`grid place-items-center rounded-[14px] border-2 border-dashed px-5 py-9 text-center transition-colors ${
          dragging ? "border-violet-500 bg-violet-50" : "border-line bg-surface"
        }`}
      >
        <p className="text-sm font-bold">Drop files here, or choose them</p>
        <p className="mt-1 max-w-[420px] text-xs leading-[1.6] text-muted">
          JPEG, PNG, WebP, AVIF, SVG and PDF. Up to {formatBytes(MAX_UPLOAD_BYTES)}{" "}
          each. Images are converted to WebP and stripped of metadata.
        </p>

        <input
          ref={inputRef}
          type="file"
          name="files"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,application/pdf"
          onChange={(event) => describe(event.target.files)}
          className="mt-4 block w-full max-w-[320px] text-xs file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-violet-950 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
        />

        {chosen.length > 0 ? (
          <p className="mt-3 text-xs text-muted">
            {chosen.length} file{chosen.length === 1 ? "" : "s"} ready:{" "}
            {chosen.slice(0, 3).join(", ")}
            {chosen.length > 3 ? ` +${chosen.length - 3} more` : ""}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || chosen.length === 0}
          className="mt-4 min-h-10 rounded-lg bg-violet-950 px-4 text-sm font-bold text-white transition-opacity disabled:opacity-40"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>

      {state.status !== "idle" ? (
        <div
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            state.status === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-900"
          }`}
        >
          {state.message}
          {state.failed && state.failed.length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {state.failed.map((item) => (
                <li key={item.name}>
                  {item.name}: {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
