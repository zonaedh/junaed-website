# PROJECT_UPDATE.md
Human-readable status of **junaedhossain.com + admin panel**. Update at every phase end and major event.

**Last updated:** 2026-11-21 Â· **Overall progress:** 9.7 / 10 phases

## Phase Status
| # | Phase | Status | Started | Completed | Log |
|---|---|---|---|---|---|
| 0 | Foundations | ðŸŸ¨ Partly done (local only; hosting/DNS blocked on owner) | 2026-11-20 | â€” | [phase-00](logs/phase-00-log.md) |
| 1 | Setup + Public Site Port | âœ… Complete (except Lighthouse) | 2026-11-20 | 2026-11-20 | [phase-01](logs/phase-01-log.md) |
| 2 | DB, Auth & Admin Shell | âœ… Complete (verified end-to-end with local PGlite) | 2026-11-20 | 2026-11-20 | [phase-02](logs/phase-02-log.md) |
| 3 | CMS Core (Pages, Settings, Media) | âœ… Complete (media on local disk; R2 is an env swap) | 2026-11-21 | 2026-11-21 | [phase-03](logs/phase-03-log.md) |
| 4 | Blog & Portfolio | âœ… Complete (verified end-to-end) | 2026-11-21 | 2026-11-21 | [phase-04](logs/phase-04-log.md) |
| 5 | Contact, Leads, Notifications | âœ… Complete (notifications dormant until keys supplied) | 2026-11-21 | 2026-11-21 | [phase-05](logs/phase-05-log.md) |
| 6 | On-Page SEO | âœ… Complete (verified end-to-end) | 2026-11-21 | 2026-11-21 | [phase-06](logs/phase-06-log.md) |
| 7 | Analytics, Tracking, Dashboard | âœ… Complete (verified in a browser and over HTTP) | 2026-11-21 | 2026-11-21 | [phase-07](logs/phase-07-log.md) |
| 8 | Security, IP Block, Logs, Staff | âœ… Complete (verified in a browser and over HTTP) | 2026-11-21 | 2026-11-21 | [phase-08](logs/phase-08-log.md) |
| 9 | Backups, CI/CD, QA, Launch | âœ… Built and verified locally; launch blocked on 4 owner credentials | 2026-11-21 | 2026-11-21 | [phase-09](logs/phase-09-log.md) |

Legend: â¬œ not started Â· ðŸŸ¨ in progress Â· âœ… complete Â· â›” blocked

## Live URLs
- Public: https://junaedhossain.com â€” not deployed
- Admin: https://admin.junaedhossain.com â€” not deployed (noindex verified locally only)
- Repo: https://github.com/zonaedh/junaed-website (Phases 0â€“8 pushed) Â· Vercel project: not created

## Changelog (newest first)
- 2026-11-21 â€” **Phase 9 complete (code); launch blocked.** Weekly encrypted backup
  workflow (pg_dump â†’ gzip â†’ age â†’ SFTP â†’ verify size â†’ prune to newest 3 â†’ log â†’
  Telegram), with retention as pure tested logic that sorts by filename date and
  never deletes a file it cannot date. Admin Backups page with staleness banner, a
  run-now button that fails loudly when unconfigured, and a restore guide. CI
  workflow (lint, typecheck, tests, build, audit) and a manual-approval migration
  workflow. QA checklist and launch runbook in `docs/`. Launch blocked on Vercel,
  Neon, R2 and Resend.
- 2026-11-21 â€” **Phase 8 complete.** Rate limiting (global 120/min, API 60/min, login
  5/15 min, reset 3/hour, contact burst and daily) enforced in the proxy with 429 and
  `Retry-After`. IP/CIDR block list with a 60-second cache, enforced on public and admin
  alike (403). Spam filter settings and auto-block after repeated spam. Activity log with
  filters, search, pagination and an owner-only password-gated clear. Staff accounts with
  role changes, deactivate, session revoke and 2FA reset, owner protected. Dependabot
  added; `npm audit` clean. Verified in a browser and over HTTP: blocked IP 403, normal
  IP 200, unblock restores 200.
- 2026-11-21 â€” **Phase 7 complete.** Consent banner and a consent-gated tag loader (GTM,
  GA4, Meta Pixel, Clarity) with Consent Mode v2 defaults pushed first. First-party
  tracking at `POST /api/track`: bots dropped, DNT honoured, paths normalised and
  validated, referrer stored as a label, raw IP never stored (day-salted hash only).
  Custom-scripts manager with live risk warnings, enable/disable and one-click rollback.
  Dashboard with real KPIs, daily series and widgets; analytics page with range selector
  and breakdowns; alerts list with mark-read and a sidebar badge; `generate_lead` wired
  into the contact form. Two real bugs fixed during verification: a client component
  importing the scripts repository pulled the Postgres driver into the browser bundle and
  broke the build (D-038), and head-location snippets had no mount point so they never
  rendered (D-039). lint/typecheck/226 tests/build all pass.
- 2026-11-21 â€” **Phase 6 complete.** Every public page now emits database-driven metadata
  and JSON-LD (Person, WebSite, ProfessionalService, Service, BlogPosting, ContactPage,
  BreadcrumbList). sitemap.xml, robots.txt and rss.xml are dynamic and read the database.
  Dynamic OG images per post via `next/og`. Security headers added: CSP, X-Frame-Options,
  Referrer-Policy, Permissions-Policy, nosniff, and HSTS in production only. Admin â†’ SEO
  gained a redirect manager and a 404 log where a broken URL becomes a redirect in one
  click, plus a live SERP preview and 0â€“100 on-page score in the post editor. Three real
  bugs fixed during verification: titles rendering twice, the OG handler receiving no
  params, and a redirect code the framework cannot emit. lint/typecheck/178 tests/build
  all pass.
- 2026-11-21 â€” **Phase 5 complete.** The contact form is a working pipeline: honeypot,
  minimum fill time, signed stateless maths captcha (D-032), rate limit, and a spam
  scorer that accepts silently rather than teaching bots which signal fired (D-033).
  Leads persist with IP and message hashes, never a raw IP. Telegram and Resend
  adapters are fully written and dormant â€” supplying keys is the whole remaining job
  (D-034). Admin inbox at `/admin/leads` with status filters, search, unread sidebar
  badge, detail page with private notes, and a CSV export. Verified end to end in a
  browser: real submission persisted, wrong captcha rejected with values preserved,
  spam blocked and not stored, status and notes saved, export returned `200 text/csv`.
  lint/typecheck/146 tests/build all pass.
- 2026-11-21 â€” **Phase 4 complete.** Blog (Tiptap editor, slug derivation, word count,
  reading time, tags, categories, draft/publish) and Portfolio (admin CRUD, featured flag,
  results, year) both verified end to end in a browser. Public blog, portfolio and the home
  page's Selected work now read from the database. Three real bugs fixed: SSG on
  `/blog/[slug]` (a published post would have 404'd until deploy), `unstable_cache` returning
  Dates as strings while typed as `Date`, and hero alt text sourced from the heading instead
  of the media row. lint/typecheck/93 tests/build all pass (37 routes).
- 2026-11-21 â€” **Phase 3 complete.** Media library built on a storage adapter (D-027): local
  disk driver now, R2 driver written and dormant, so R2 is a five-variable swap rather than a
  rewrite. Uploads are content-sniffed, EXIF-stripped and re-encoded to WebP with a 480px
  thumbnail (D-028). Deleting an in-use image is refused with a usage list (D-029). Hero and
  about images wired through the registry. Verified with real bytes and in the browser.
- 2026-11-21 â€” **Phase 3 in progress.** Settings editor (`/settings`) and Pages editor (`/pages`) built and wired to DB. Storefront (header, footer, home, about, contact) now reads from DB. Verified end-to-end via local PGlite. Build passes (41 routes).
- 2026-11-20 â€” **Phase 2 complete.** 19-table Drizzle schema, Argon2id passwords,
  hashed-token sessions, TOTP 2FA with encrypted secrets and recovery codes, login
  lockout, RBAC, audit logging, AES-256-GCM encryption, salted IP hashing. Admin panel:
  login, role-filtered sidebar shell, dashboard, 2FA enrolment, 13 section placeholders.
  Six bugs found and fixed, two of them serious (build required a live DB; every
  first-step login failed validation). lint/typecheck/47 tests/build all pass.
  **Migrations have not been run â€” no database exists yet.**
- 2026-11-20 â€” **Phase 1 complete.** Public site ported to Next.js 16.4.6: 25 routes,
  design tokens from the original HTML, mobile menu, contact form with server-side
  validation, sitemap/robots, 404/error. Host routing + admin noindex in `src/proxy.ts`,
  verified with curl. lint/typecheck/19 tests/build all pass.
- 2026-11-20 â€” Phase 0 local foundation: git repo on `main`, `.gitignore`, `.env.example`, `logs/`.
- 2026-11-20 â€” Project plan created (MVP.md, AGENT_GUIDE.md).

## Current Blockers
- **Needs the owner:** GitHub repo, Vercel, Neon, Cloudflare R2, Upstash, Resend,
  Telegram bot, Namecheap DNS, 2FA. Exact steps in `HANDOFF.md â†’ Needs From User`.
  **Neon is still needed for any deploy**, but local development is unblocked via PGlite
  (D-022), so Phases 3 and 4 were completed and verified without it.
- **Contact form does not deliver** (validation only until Phase 5). Launch blocker.
- **R2 not configured.** Media works locally on disk; a production deploy with no R2 throws
  at boot by design (D-027). Blocks deploying media, not developing it.
- Lighthouse not measured (needs a deployed URL).

## Open Questions to User
See bottom of `MVP.md`. Working assumptions are recorded in `HANDOFF.md` Â§5A so
work can continue.

## Backlog (out of MVP scope)
- i18n, newsletter, comments, booking/payments, site search, A/B testing, PWA
