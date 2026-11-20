# HANDOFF.md
> Overwrite this file at every checkpoint. Keep it short, specific and true.
> A new agent must be able to continue from this file alone (plus AGENT_GUIDE.md).

**Last updated:** 2026-11-20 23:45 (UTC+6) · **By:** saffron

## 1. Where We Are
- **Current phase:** Phase 2 complete (code + verification). Phase 3 is next.
- **Phase progress:** Phase 0 local done (hosted half blocked on owner), Phase 1 complete, Phase 2 complete.
- **Branch:** `main`
- **Last commit:** see `git log --oneline -5`
- **Build status:** passing (lint, typecheck, 47 tests, 25 routes) · **Deployed to:** nothing yet

## 2. What Was Just Done
- Phase 2: 19-table Drizzle schema, Argon2id passwords, hashed-token sessions,
  TOTP 2FA with encrypted secrets and recovery codes, login lockout, RBAC,
  audit logging, AES-256-GCM encryption, IP hashing.
- Admin panel: login screen, sidebar shell with role-filtered nav, dashboard,
  2FA enrolment page, and 13 section placeholders so no sidebar link 404s.
- Six real bugs found and fixed — see `logs/phase-02-log.md` section 3. Two of
  them (B2, B3) would have blocked deployment or silently broken login.
- Full detail: `logs/phase-02-log.md`.

## 3. In Progress / Half-Finished
- **Nothing is half-written.** The tree builds, tests pass, and it is committed.
- **The database has never been touched.** Schema written, migrations not generated.
  This is the single most important thing to know about Phase 2's state.

## 4. Next Steps (do in this order)
1. Read `AGENT_GUIDE.md`, then `logs/phase-02-log.md` sections 5 and 6, then
   `DECISIONS.md` (D-018 to D-021).
2. **If a `DATABASE_URL` exists in `.env.local`:** run `npm run db:generate`,
   `npm run db:migrate`, `npm run db:seed`, then prove login + 2FA end to end.
   Do this before building anything new — it is the untested half of Phase 2.
3. **If it does not:** Phase 3 (public content from the database) can be written
   against the schema, but every page will need a live DB to verify. Prefer getting
   the database first.
4. Phase 3 scope: settings + pages tables wired to the storefront, media library
   on R2, admin Settings and Pages editors.

## 5. Needs From User (blocking items)

**A. Answers to the 7 Open Questions at the bottom of `MVP.md`.** Until answered I
assume: weekly backups keeping last 3; DB-only backup for now; English only;
categories SEO / Digital Marketing / Design / WordPress; assume EU/UK visitors so
consent blocks scripts by default; one Telegram chat; placeholder photos acceptable.

**B. Create these accounts and send me the values (never commit them):**

1. **GitHub repo** — github.com/new → name `junaedhossain` → Private → do not
   initialise with a README. Then send me the repo URL. I will push `main` and add CI.
2. **Vercel** — vercel.com/signup with GitHub → Add New Project → import
   `junaedhossain` → Framework: Next.js (auto). Then Settings → Domains → add
   `junaedhossain.com` and `admin.junaedhossain.com`.
3. **Neon Postgres** — neon.tech → New Project → region closest to your visitors →
   copy the **pooled** connection string (`DATABASE_URL`) and the **unpooled** one
   (`DATABASE_URL_UNPOOLED`). **This is the one that unblocks the most work.**
4. **Cloudflare R2** — dash.cloudflare.com → R2 → Create bucket `junaed-media` →
   Manage R2 API Tokens → Create token with Object Read & Write → send Account ID,
   Access Key ID, Secret Access Key, and enable a public URL for the bucket.
5. **Upstash Redis** — console.upstash.com → Create Database → copy
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
6. **Resend** — resend.com → API Keys → create → send the key. Then Domains → add
   `junaedhossain.com` and add the SPF/DKIM/DMARC records it shows to Namecheap DNS.
7. **Telegram bot** — open Telegram, message `@BotFather` → `/newbot` → name it →
   copy the token. Then message your new bot once, and open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` to find your `chat_id`.

**C. DNS on Namecheap** (Advanced DNS for `junaedhossain.com`):
- `A` record, Host `@`, Value `76.76.21.21`, TTL Automatic
- `CNAME`, Host `admin`, Value `cname.vercel-dns.com`
- `CNAME`, Host `www`, Value `cname.vercel-dns.com`
- Then in Vercel → Domains, set `www` to redirect to the apex domain.

**D. Enable 2FA** on GitHub, Vercel, Namecheap, Neon and Cloudflare.

**E. Real content, when ready:** hero photo, about photo, and real portfolio items
with client permission. Placeholders are in place so nothing is blocked.

## 6. Blockers / Known Issues
- **LAUNCH BLOCKER (not security):** the contact form validates but does not
  deliver anything (D-017). Phase 5 fixes it. Do not launch before then.
- **No live database yet**, so migrations, seed, login and 2FA are unproven end to end.
- **No remote repo**, so no CI, no branch protection, no preview deploys.
- Lighthouse not measured — needs a deployed URL.
- `npm install` requires `--legacy-peer-deps` because of the vitest 5 peer range (D-015).
- **`.env.local` exists locally with generated secrets and an empty `DATABASE_URL`.**
  It is gitignored. Fill in `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to proceed.

## 7. Important Context
- **Next.js 16.4.6** — middleware is `src/proxy.ts` exporting `proxy()`, not
  `middleware.ts`. Bundled docs are at `node_modules/next/dist/docs/`; read them
  before using any Next API you are unsure about.
- **Tailwind v4** — tokens live in `@theme` inside `src/app/globals.css`. There is no
  `tailwind.config.js`. Custom utilities use `@utility`.
- **Cache Components is off** (D-013). Do not turn it on without reading the guide.
- **A `"use client"` file must never import `@/lib/rbac` or `@/db`** — it drags the
  Postgres driver into the browser bundle and fails the build (B1). Import
  `@/lib/role-hierarchy` instead.
- **The DB client is lazy** (D-018). Importing `@/db` has no side effects; the pool is
  created on first query. Never add top-level connection code back.
- **Admin host locally:** `http://localhost:3000/admin` now works (D-020).
  To test real host routing: `curl -H "Host: admin.localhost:3000" http://localhost:3000/`
- Seed content is in `src/lib/content.ts`; components take props, so Phase 3/4 only
  changes the data source.
- Real secrets are NOT in the repo. `.env.example` lists names only.

## 8. How to Verify State
```powershell
git status; git log --oneline -10
npm run lint; npm run typecheck; npm run test; npm run build
```
Expect: clean tree, 47 tests passing, 25 routes built.
If `npm run build` says "Another next build process is already running", delete
`.next\lock` and `.next\dev\lock` — a killed dev server leaves them behind.
