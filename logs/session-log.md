# session-log.md (append only)
Format: `YYYY-MM-DD HH:MM | agent | phase | START/CHECKPOINT/END | one-line summary | commit`

2026-11-20 00:00 | planner | pre-phase | END | Created MVP.md, AGENT_GUIDE.md and tracking docs. Awaiting user answers to open questions. | n/a
2026-11-20 23:20 | monitor | phase-1 | CHECKPOINT | MONITOR: Phase 1 routes being written (about/blog/contact/portfolio/services). Build FAILS on missing @/components/site/contact-form. Repo has 0 commits, all files untracked. No secrets found. | n/a

2026-11-20 23:15 | saffron | phase-00/01 | START | Session start. Read AGENT_GUIDE, MVP, HANDOFF, DECISIONS, logs. Repo had no git, no app, no logs/ dir. Created logs/, moved session-log + template into it, git init on `main`.
2026-11-20 23:18 | saffron | phase-01 | CHECKPOINT | Scaffolded Next.js 16.4.6 (TS, Tailwind v4, App Router, src/). Disabled cacheComponents + partialPrefetching (D-013). Renamed middleware->proxy (D-014). Added .env.example, .gitignore, design tokens.
2026-11-20 23:20 | saffron | phase-01 | CHECKPOINT | Built public site: layout, header/mobile menu, footer, Button/Eyebrow/SectionHead/Reveal, ServiceCard, ProjectCard. 12 routes incl. services/[slug], portfolio/[slug], blog/[slug], legal, thank-you, 404, error.
2026-11-20 23:21 | saffron | phase-01 | CHECKPOINT | Contact form + server action (validation only, D-017). Zod schema + 9 tests. Proxy host routing + admin noindex + 10 tests. sitemap.ts, robots.ts.
2026-11-20 23:23 | saffron | phase-01 | CHECKPOINT | lint + typecheck + 19 tests + build all pass (25 routes). Vitest bumped to 5 for critical advisories (D-015).
2026-11-20 23:24 | saffron | phase-01 | CHECKPOINT | Verified in browser: home desktop+mobile match original design, contact form submits, 0 console errors. curl verified admin noindex header, admin robots Disallow, public /admin 404.

2026-11-20 23:32 | saffron | phase-00/01 | END | Phase 1 complete and tagged `phase-01-complete` (commit cc8990c). Phase 0 local foundation tagged `phase-00-local`; hosting/DNS/accounts pending owner. Docs written: logs/phase-00-log.md, logs/phase-01-log.md, HANDOFF, PROJECT_UPDATE, DECISIONS (D-013..D-017), MVP.md ticked. NOTE: MVP.md was briefly corrupted by a PowerShell UTF-8 round-trip and restored from the original text; verified 0 replacement chars, no BOM. Stopping before Phase 2. | cc8990c

---

## 2026-11-20 23:45 — Phase 2 complete (saffron)

**Session goal:** build Phase 2 — database schema, auth, admin shell.

**Outcome:** Complete in code and verified as far as possible without a live database.

### Delivered
- `src/db/schema.ts` — 19 tables per MVP.md §3, Drizzle + Postgres.
- `drizzle.config.ts`, `src/db/index.ts` (lazy client), `src/db/seed.ts`.
- Auth: `password.ts` (Argon2id, OWASP params), `session.ts` (hashed tokens,
  httpOnly cookie, 7-day sliding), `totp.ts` (encrypted secrets, recovery codes),
  `lockout.ts` + `lockout-policy.ts`, `rbac.ts` + `role-hierarchy.ts`.
- `src/lib/audit.ts`, `src/lib/security/encryption.ts` (AES-256-GCM),
  `src/lib/security/hash.ts` (salted daily IP hashes).
- Admin: login screen + action, shell with role-filtered sidebar, dashboard,
  2FA enrolment, 13 section placeholders.
- `.env.local` created locally with generated secrets (gitignored, empty DATABASE_URL).

### Verification
- `npm run lint` clean · `npm run typecheck` clean · `npm run test` 47 passed ·
  `npm run build` passed (25 routes) · `npm audit` 0 vulnerabilities.
- Browser: `/admin/login` renders with 0 console errors; form failure is handled
  with a generic message and the real cause is logged server-side.
- Host routing re-verified: admin host noindex header present, public host 404s
  `/admin`, `/dashboard` redirects to `/login`, admin `robots.txt` disallows all.

### Bugs found and fixed
1. Client component imported `rbac.ts` → Postgres driver in the browser bundle.
2. `next build` required a live database (import-time pool creation).
3. **Login validation rejected `null` for the absent 2FA field** — every first-step
   login failed before reaching the database, showing "wrong password".
4. A missing env var leaked a stack trace into the browser.
5. `/admin` was unreachable on localhost, making the panel undevelopable.
6. otplib v13 removed the `authenticator` object the code was written against.

### Notes for the next session
- The database has never been touched. Migrations are not generated.
- `npm run build` can fail with "Another next build process is already running"
  after a killed dev server; delete `.next\lock` and `.next\dev\lock`.
- PowerShell heredocs mangle backticks — write files with the editor tools or Node,
  never `Set-Content` with an inline template literal containing backticks.

### Next
Phase 3, but only after a `DATABASE_URL` exists. Proving login + 2FA end to end is
the first thing to do when the database arrives.

2026-11-20 23:58 | monitor | phase-02 | CHECKPOINT | MONITOR: Phase 2 verified. Build passes (41 routes), 47 tests pass. Uncommitted local PGlite & drizzle changes in working tree. No secrets found. | a8d222d
2026-11-21 00:20 | monitor | phase-03 | CHECKPOINT | MONITOR: Phase 3 in progress (settings + pages editors built & wired to DB, verified with local PGlite). Build passes (41 routes). Uncommitted files in working tree. R2 credentials needed for media. | a8d222d



2026-11-21 00:45 | saffron | phase-03/04 | END | Phases 3 and 4 complete. Media library on a storage adapter (local disk now, R2 dormant, D-027), image pipeline with content-sniff + EXIF strip + WebP + thumbnail (D-028), delete guard on in-use media (D-029). Blog (Tiptap, slug, word count, tags, categories) and Portfolio (CRUD, featured, results) verified end to end in a browser. Bugs fixed: SSG on /blog/[slug] (B13, D-030), unstable_cache Date-as-string type lie (B14, D-031), hero alt from heading (B12), settings form key-map duplication (B15), usage N+1 (B16). lint/typecheck/93 tests/build all pass (37 routes); build also passes with DATABASE_URL unset. Test data and orphan uploads removed. DECISIONS D-027..D-031 written; HANDOFF, PROJECT_UPDATE, phase-03-log, phase-04-log updated. NOTHING COMMITTED since a8d222d. | a8d222d
