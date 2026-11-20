# Phase 3 — CMS Core (Pages, Settings, Media)

**Dates:** 2026-11-21
**Agent:** saffron
**Status:** Complete. Media runs on local disk; R2 is a five-variable swap, not a rewrite.

---

## 1. What This Phase Delivered

| Area | Files | State |
| --- | --- | --- |
| Settings registry | `src/lib/settings-registry.ts` | 14 typed settings, 5 groups |
| Settings reader | `src/lib/settings.ts` | Coerces stored JSONB, falls back to defaults |
| Settings editor | `src/app/admin/(panel)/settings/` | Working, generated from registry |
| Page definitions | `src/lib/pages-definitions.ts` | 5 pages, 23 fields on Home |
| Page reader | `src/lib/pages.ts` | Registry-resolved, draft-safe |
| Pages editor | `src/app/admin/(panel)/pages/[key]/` | Working |
| Storage adapter | `src/lib/media/storage.ts` | Local + R2 drivers (D-027) |
| Image pipeline | `src/lib/media/process.ts` | Content-sniff, EXIF strip, WebP, thumbnail (D-028) |
| Media repository | `src/lib/media/repository.ts` | CRUD, soft delete |
| Media usage scan | `src/lib/media/usage.ts` | Blocks delete while referenced (D-029) |
| Media library UI | `src/app/admin/(panel)/media/` | Grid, uploader, detail panel |
| Media picker | `src/components/admin/media-picker.tsx` | Modal, wired into page form |
| Image field kind | registry `kind: "image"` | Hero + about images |
| Storefront wiring | header, footer, home, about, contact | Read from DB |
| Host-aware admin paths | `src/lib/admin-path.ts` | Fixes B10 (D-024) |

---

## 2. Verification

```
npm run lint       -> clean
npm run typecheck  -> clean
npm run test       -> 8 files, 93 tests passed
npm run build      -> passed, 37 routes
npm run build (DATABASE_URL unset) -> passed
```

**Image pipeline, against real bytes:** 20/20 tests. A 1200×1500 JPEG was uploaded and
stored as a 3 KB WebP plus a 480px thumbnail. EXIF was asserted present in the source and
absent in the output — not assumed.

**Browser, end to end:**
- Uploaded a real image through the actual form. Both files written, both WebP.
- Set alt text; the detail panel showed "Not used anywhere yet" correctly.
- Wired the image into the home hero via the pages editor and the picker.
- Confirmed the public site rendered it, with `src` and `alt` read from the DOM.
- Attempted to delete the in-use image: refused, with "Used in: Home — Hero image".

---

## 3. Bugs Found and Fixed

- **B12 — hero alt text came from the hero heading, not the media row.** The image rendered
  but the alt was wrong: an accessibility defect and an SEO one. Now reads `media.alt`.
- **B15 — the settings form duplicated the key→field map.** Exactly the drift D-025 exists to
  prevent. Now generated from the registry.
- **B16 — usage tracking ran an N+1 query per portfolio row.** Now one query.

---

## 4. Deviations From Plan

The plan said media required R2. It did not: only the byte write depends on R2, and the
upload pipeline, picker, image fields and usage scan are identical either way. Building the
adapter instead of waiting unblocked the phase and removed R2 as a development dependency
(D-027). Production still refuses to write to disk, because Vercel's filesystem is ephemeral.

---

## 5. Known Issues / Tech Debt

- **R2 not configured.** Media works locally. A production deploy with no R2 throws at boot
  by design. This blocks *deploying* media, not developing it.
- **Live preview with a signed token** and **"last edited by"** were not built. Neither is
  required by the phase's definition of done; both are carried forward.
- Deletes are soft, so orphaned files can accumulate on disk after a soft delete. The R2
  driver removes the object; the local driver does too, but a failed remove is swallowed.

---

## 6. How To Test This Phase

1. `npm run db:local` (terminal 1), `npm run dev` (terminal 2).
2. Sign in at `http://localhost:3001/admin/login`.
3. `/admin/media` — upload an image. Confirm a WebP appears with a thumbnail.
4. Set alt text on it.
5. `/admin/pages/home` — set the hero image via the picker, save.
6. Reload `http://localhost:3000` — the image is live.
7. Back in `/admin/media`, try to delete that image. It must be refused with a usage list.

---

## 7. Next Phase Starting Notes

1. Phase 4 (Blog & Portfolio) builds directly on the media library — both need cover images.
2. Commit this phase before starting Phase 4. It is uncommitted.
3. Read D-027 to D-031 before touching media or any cached query.
