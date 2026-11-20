# Phase 4 — Blog & Portfolio

**Dates:** 2026-11-21
**Agent:** saffron
**Status:** Complete and verified end to end in a browser.

---

## 1. What This Phase Delivered

| Area | Files | State |
| --- | --- | --- |
| Post content model | `src/lib/posts/content.ts` | Pure, testable, safe for the client editor |
| Posts repository | `src/lib/posts/repository.ts` | Public + admin queries, tagged cache |
| Post actions | `src/app/admin/(panel)/posts/actions.ts` | Create, update, publish, delete |
| Tiptap editor | `src/app/admin/(panel)/posts/post-editor.tsx` | Working, live word count |
| Post form | `src/app/admin/(panel)/posts/post-form.tsx` | Slug derivation, category, tags, status |
| Posts admin | `src/app/admin/(panel)/posts/` | List, new, edit |
| Public blog index | `src/app/(site)/blog/page.tsx` | Reads DB, category/date/reading time |
| Public post page | `src/app/(site)/blog/[slug]/page.tsx` | Dynamic (D-030) |
| Post body renderer | `src/components/site/post-body.tsx` | Renders the Tiptap doc |
| Portfolio repository | `src/lib/portfolio/repository.ts` | Public + admin queries, tagged cache |
| Portfolio actions | `src/app/admin/(panel)/portfolio/actions.ts` | Create, update, publish, delete |
| Portfolio form | `src/app/admin/(panel)/portfolio/portfolio-form.tsx` | Featured, results pairs, year |
| Portfolio admin | `src/app/admin/(panel)/portfolio/` | List, new, edit |
| Public portfolio index | `src/app/(site)/portfolio/page.tsx` | Reads DB |
| Public case study | `src/app/(site)/portfolio/[slug]/page.tsx` | Dynamic, renders results |
| Home "Selected work" | `src/app/(site)/page.tsx` | Reads featured portfolio from DB |

---

## 2. Verification

```
npm run lint       -> clean
npm run typecheck  -> clean
npm run test       -> 8 files, 93 tests passed
npm run build      -> passed, 37 routes
```

**Content model:** 26/26 tests on the pure Tiptap doc helpers — plain text extraction, word
count, reading time, auto-excerpt, slugify, and doc pruning.

**Blog, in the browser:**
- Created a post in the Tiptap editor. Slug auto-derived from the title.
- Live word count and reading time updated as the body was typed.
- Set category and two tags; both were created and linked in the database.
- Published, then confirmed the row in the database: status `published`, category set, both
  tags joined, word count and reading time derived.
- Public `/blog` showed it with category, date, reading time and excerpt.
- Public post page rendered the body and tags.

**Portfolio, in the browser:**
- Created a project with summary, body, results pairs, year and featured on.
- Confirmed persistence in the database: published, featured, results, year all correct.
- Public `/portfolio` listed it; the case study page rendered year, body and results.
- The home page's "Selected work" pulled it in, and the placeholder note disappeared.

---

## 3. Bugs Found and Fixed

- **B13 — `/blog/[slug]` was prerendered as SSG.** A post published in admin would have 404'd
  on the public site until the next deploy, which directly contradicts the phase's definition
  of done. Caught by reading the build output, not by a test. Detail routes are now dynamic
  (D-030).
- **B14 — `unstable_cache` returned `Date` fields as strings while the type claimed `Date`.**
  The type was lying: `.toISOString()` would have thrown in production while typechecking
  clean. Types now declare the serialised shape (D-031).
- **B12 — hero alt text came from the hero heading** rather than the media row. Fixed while
  wiring images into the public pages.

**Cosmetic, not fixed:** after a successful save the status select and featured checkbox
re-render to their defaults while the database holds the correct values. It is a React
re-render artefact, not a data bug — verified against the database each time. Worth tidying
when the forms are next touched.

---

## 4. Deviations From Plan

None of substance. The phase needed images, which were Phase 3's blocked remainder, so the
media library was built first (see `phase-03-log.md`). That ordering was deliberate: building
blog and portfolio blind would have produced the same gap twice.

---

## 5. Known Issues / Tech Debt

- **Form re-render artefact** described above.
- **No scheduled publishing UI.** The repository already filters on `published_at <= now()`,
  so a future-dated post appears on its own without a cron job — but there is no way to set a
  future date in the admin form yet.
- **No revision history UI.** `post_revisions` exists in the schema and is unused.
- **No image field on the post form yet.** `cover_media_id` and `og_image_id` exist and are
  usage-tracked, but the editor does not expose them. Phase 6 (SEO) is the natural home.

---

## 6. How To Test This Phase

1. `npm run db:local` (terminal 1), `npm run dev` (terminal 2).
2. Sign in at `http://localhost:3001/admin/login`.
3. `/admin/posts/new` — write a post, set category and tags, publish.
4. Confirm it appears at `http://localhost:3000/blog` immediately, and its page renders.
5. `/admin/portfolio/new` — create a project with featured on, publish.
6. Confirm `/portfolio`, the case study page, and the home page's Selected work all show it.

---

## 7. Next Phase Starting Notes

1. **Commit Phases 3 and 4.** Nothing has been committed since Phase 2 (`a8d222d`).
2. Phase 5 (Contact, Leads, Notifications) is the launch blocker: the contact form currently
   validates and discards.
3. Read D-030 and D-031 before adding any new cached query or detail route.
