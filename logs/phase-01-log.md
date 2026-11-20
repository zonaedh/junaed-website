# Phase 01 Log — Project Setup + Public Site Port
**Dates:** 2026-11-20 → 2026-11-20 · **Agent:** saffron · **Branch/Tag:** `main` / `phase-01-complete`

## 1. Goal
Pixel-faithful port of `junaed_hossain.html` into real Next.js routes, still on
static seed content, plus host-based routing and admin noindex.

## 2. What Was Built

**Toolchain**
- Next.js 16.4.6, React 19.3, TypeScript strict, Tailwind v4, ESLint 9, Vitest 5.
- `next.config.ts` — `poweredByHeader: false`, `reactStrictMode`, AVIF/WebP images, R2 remote pattern placeholder. `cacheComponents` and `partialPrefetching` deliberately off (D-013).
- `src/app/globals.css` — design tokens as Tailwind v4 `@theme`: full violet 50–950 scale, `ink`, `muted`, `line`, `surface`, radii 22/24/32, soft shadow, 1160px container, `wrap` utility, `.js-reveal` animation, `.prose-site` rich-text styles.
- `next/font` for Inter + Manrope (self-hosted, no CDN link, no layout shift).

**Components**
- `src/components/ui/button.tsx` — `Button`, `ButtonLink`, `ArrowUpRight`.
- `src/components/ui/eyebrow.tsx` — uppercase label with leading rule, `tone` for dark sections.
- `src/components/ui/section-head.tsx` — eyebrow + h2 + highlight word + body.
- `src/components/ui/reveal.tsx` — IntersectionObserver fade-up; DOM-only effect (no setState), `<noscript>` fallback in the site layout.
- `src/components/site/header.tsx` — desktop nav, ⌘ mobile panel with Escape/outside-click/scroll-lock, `aria-expanded`/`aria-controls`, active-route state.
- `src/components/site/footer.tsx` — server-rendered year, nav + legal links.
- `src/components/site/service-card.tsx` — full-card link via `after:absolute`.
- `src/components/site/project-card.tsx` — the three original mock-window art treatments.
- `src/components/site/contact-form.tsx` — `useActionState`, inline field errors, honeypot, success state with focus management.

**Routes (25 total)**
- `(site)/page.tsx` — hero (with the original portrait/orb/float-card composition), services, portfolio, dark about, CTA.
- `(site)/services` + `[slug]` (4 services, breadcrumbs, deliverables sidebar).
- `(site)/portfolio` + `[slug]` (challenge / approach / at-a-glance).
- `(site)/about`, `(site)/blog` + `[slug]` (3 posts), `(site)/contact`.
- `(site)/privacy-policy`, `(site)/terms`, `(site)/thank-you`.
- `not-found.tsx`, `(site)/error.tsx`.
- `admin/page.tsx` — Phase 1 placeholder so the noindex header can be verified.
- `sitemap.ts` (admin excluded), `robots.ts` (public host only).

**Routing and security**
- `src/proxy.ts` — admin host gets `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` on every response, serves `Disallow: /` robots.txt, rewrites bare paths into `/admin/*`; public host 404s `/admin*` and `/api/admin*`.

**Data**
- `src/lib/content.ts` — typed seed content for services, projects, posts. Phase 3/4 swap the data source, not the components.
- `src/lib/site.ts` — site config and navigation.

## 3. Database / Config Changes
- No database.
- New env vars: none required to run Phase 1. `NEXT_PUBLIC_SITE_URL` and `ADMIN_URL` are read with safe defaults.

## 4. Decisions Made
- D-013 Cache Components disabled.
- D-014 `proxy.ts` replaces `middleware.ts`.
- D-015 Vitest 5 (critical advisories in vitest 3's `tinypool`).
- D-016 Zod for server-side validation.
- D-017 Contact form is validation-only until Phase 5.

## 5. Test Results
| Check | Result |
|---|---|
| `npm run lint` | pass, 0 problems |
| `npm run typecheck` | pass |
| `npm run test` | pass, 19 tests in 2 files |
| `npm run build` | pass, 25 routes (static + SSG) |
| `npm audit` | 0 vulnerabilities |
| Admin noindex header | `curl -I -H "Host: admin.localhost:3000" /` → `x-robots-tag: noindex, nofollow, noarchive, nosnippet` |
| Admin robots.txt | returns `User-agent: *` / `Disallow: /` |
| Public host `/admin` | 404 |
| Public host no noindex leak | no `x-robots-tag` on public responses |
| Contact form | submitted in browser, server action validated, success state rendered |
| Console errors | 0 |
| Manual QA | home checked at 1568×980 and 390×844; matches the original layout |

**Not done:** Lighthouse has not been run. MVP.md's Phase 1 acceptance asks for
≥95 on mobile; that needs a production build served over HTTPS or a deployed URL,
so it is deferred to the first Vercel deploy (blocked on the owner).

## 6. Deviations From Plan
- **Blog was built in Phase 1, not Phase 4.** MVP.md lists `/blog` and `/blog/[slug]`
  in the Phase 1 route list, so the routes exist now with 3 seed posts and no editor.
  The CMS, categories, scheduling and pagination remain Phase 4 work.
- **`/services/[slug]` and `/portfolio/[slug]` are SSG from seed data**, not DB-driven. Expected; Phase 3/4 replaces the source.
- **No `500.tsx`.** Next.js App Router uses `error.tsx` for route errors; a static
  `500` page is not a supported convention. `(site)/error.tsx` covers it.
- **Portfolio art is CSS, not images.** The original used CSS mock windows; keeping
  them avoids shipping fake screenshots. Phase 4 replaces them with `next/image`.

## 7. Known Issues / Tech Debt
- Contact form does not deliver anything (D-017). **Launch blocker.**
- Hero and About images are CSS placeholders until the media library exists.
- No `loading.tsx` skeletons yet — pages are static so there is nothing to wait for.
- `npm install` needed `--legacy-peer-deps` for vitest 5; `vite` is pinned explicitly.
- Lighthouse not measured.

## 8. Manual Steps Done By User
- None yet.

## 9. How To Test This Phase
1. `npm install`
2. `npm run dev`
3. Open http://localhost:3000 — compare against `junaed_hossain.html`.
4. Click every nav item: each is a real URL, not an anchor.
5. Resize to phone width; open the ☰ menu; press Escape to close.
6. Go to `/contact`, submit the form; you should see "Message received".
7. Check the admin host:
   `curl -I -H "Host: admin.localhost:3000" http://localhost:3000/`
   → must include `x-robots-tag: noindex, nofollow, noarchive, nosnippet`.
8. `curl -o NUL -w "%{http_code}" http://localhost:3000/admin` → `404`.
9. `npm run lint && npm run typecheck && npm run test && npm run build`

## 10. Next Phase Starting Notes
- Phase 2 needs a Neon database URL before migrations can run. Start with the
  Drizzle schema and auth primitives, which need no live DB.
- First three things: (1) `src/db/schema.ts` with the MVP.md §3 tables, (2) Argon2id
  + session helpers in `src/lib/auth/`, (3) `requireRole()` in `src/lib/rbac.ts`.
- The admin placeholder at `src/app/admin/page.tsx` must be replaced by the real
  login screen; keep the noindex metadata.
