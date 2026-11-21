# Phase 06 Log — On-Page SEO
**Dates:** 2026-11-21 → 2026-11-21 · **Agent(s):** saffron · **Branch/Tag:** `main` / `phase-06-complete`

## 1. Goal
Give every public page correct, database-driven metadata and structured data; make the
sitemap, robots and RSS dynamic; add security headers; and give the owner a redirect
manager plus a 404 log that turns a broken URL into a redirect in one click (MVP.md §6).

## 2. What Was Built
- **SEO core (pure, tested)** — title templating, canonical normalisation, JSON-LD
  builders (Person, WebSite, ProfessionalService, Service, Article/BlogPosting,
  ContactPage, BreadcrumbList), and the on-page checklist scorer.
  `src/lib/seo/core.ts` + `core.test.ts` (32 tests)
- **Metadata builder** — one `buildMetadata()` every public page calls, with a written
  fallback chain for title, description and OG image. `src/lib/seo/metadata.ts`
- **SEO repository** — redirect map (cached, tagged), 404 log (upsert on path), resolved
  SEO defaults. `src/lib/seo/repository.ts`
- **Wired into every public page** — home, about, services (+detail), portfolio
  (+detail), blog (+detail), contact. Each emits its own JSON-LD.
  `src/components/seo/json-ld.tsx` renders it with `<` escaped.
- **Dynamic OG images** — `next/og` card per post, using the real title.
  `src/app/(site)/blog/[slug]/opengraph-image.tsx`
- **Dynamic sitemap** — reads posts and portfolio from the DB, excludes drafts and
  `noindex` rows, uses real `lastModified`. `src/app/sitemap.ts`
- **RSS feed** — `src/app/rss.xml/route.ts`, hand-escaped XML.
- **Security headers** — CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy,
  nosniff; HSTS in production only. `next.config.ts`
- **Redirects manager** — admin CRUD with enable/disable/delete, enforced by a catch-all
  route. `src/app/admin/(panel)/seo/**`, `src/app/(site)/[...path]/page.tsx`
- **404 log** — every genuine miss is recorded (upsert on path, so a crawler hammering
  one URL produces one row with a rising hit count), shown in the SEO tab with a
  one-click "Redirect it".
- **SEO panel in the post editor** — live SERP preview, title/description counters,
  focus keyword, and a 10-point checklist scored 0–100. `posts/seo-panel.tsx`
- **Global SEO settings** — title template, default description, default share image,
  Twitter handle, Google/Bing verification, site URL, social profiles.

## 3. Database / Config Changes
- Migrations: `drizzle/0001_spicy_logan.sql` (new `not_found_log` table),
  `drizzle/0002_fat_apocalypse.sql` (`posts.focus_keyword`). Both additive.
- New settings keys: `seo.defaultOgImage`, `seo.twitterHandle`,
  `seo.googleVerification`, `seo.bingVerification`, `site.url`, `site.socialLinkedin`,
  `site.socialGithub`, `site.socialTwitter`.
- No new env vars.

## 4. Decisions Made
- D-035 — redirects are enforced by a catch-all route, not the proxy.
- D-036 — permanent redirects are stored and sent as 308, not 301.
- D-037 — the 404 log upserts on path so it ranks distinct URLs, not hits.

## 5. Test Results
| Check | Result |
|---|---|
| lint | pass |
| typecheck | pass |
| tests | 178 passed / 178 (11 files) |
| build | pass — 40 routes incl. `/rss.xml`, `/sitemap.xml`, OG image |
| Security headers | verified live: CSP, XFO DENY, Referrer-Policy, Permissions-Policy, nosniff |
| Manual QA | full browser + HTTP run, see §9 |

## 6. Deviations From Plan
- MVP.md asks for a 301 redirect manager. Next has no API that emits a literal 301:
  `permanentRedirect()` sends 308. Rather than store a code we would not honour, the UI
  offers Permanent (308) / Temporary (307) and legacy 301/302 rows are still honoured
  on read (D-036).
- The spec suggested enforcing redirects in middleware. Next's own docs say the proxy
  must not do data fetching, so a catch-all route owns it instead (D-035).
- `FAQPage` schema was not added: there is no FAQ block on the site yet, and emitting
  FAQ markup for content that does not exist is a rich-result violation.

## 7. Known Issues / Tech Debt
- CSP allows `'unsafe-inline'` for scripts. Removing it needs a nonce threaded through
  every page, which costs static rendering. Revisit if a stricter policy is required.
- The 404 log has no retention policy yet; it is small and will stay small.
- Internal-link suggestions in the editor (a "nice-to-have" in MVP.md) were not built.

## 8. Manual Steps Done By User
- None required. To activate verification, paste the Google/Bing codes into
  Settings → SEO; the meta tags appear on the next request.

## 9. How To Test This Phase
1. `npm run db:local`, then `npm run dev`.
2. View source on `/` — one `<title>`, canonical, og:url, and Person/WebSite/
   ProfessionalService JSON-LD.
3. View source on any inner page — title renders once as `Page | Junaed Hossain`.
4. Open `/sitemap.xml`, `/robots.txt`, `/rss.xml`.
5. Visit a URL that does not exist → 404 page, and the path appears in Admin → SEO.
6. In Admin → SEO, click "Redirect it", enter a destination, then request the old URL →
   308 to the new one, and the 404 log stops growing for it.
7. Open a post in the editor → the SEO panel scores live as you type.

Verified this session: headers, titles, canonicals, JSON-LD types, a real 92 KB PNG
from the OG route, sitemap containing the published post with `lastmod`, RSS with the
item, a 404 logged once, and a working 308 redirect that does not re-log.

## 10. Next Phase Starting Notes
1. Phase 7 is analytics, tracking and the dashboard — read MVP.md §7 first.
2. Phase 7 needs a consent banner before any tracker fires; build consent first.
3. The `page_views` table already exists from Phase 2 and is unused so far.