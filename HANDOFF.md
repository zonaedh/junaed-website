# HANDOFF.md
> Overwrite this file at every checkpoint. Keep it short, specific and true.
> A new agent must be able to continue from this file alone (plus AGENT_GUIDE.md).

**Last updated:** 2026-11-20 23:30 (UTC+6) · **By:** saffron

## 1. Where We Are
- **Current phase:** Phase 2 — Database, Auth & Admin Shell (not started)
- **Phase progress:** Phase 0 partially complete (local only), Phase 1 complete
- **Branch:** `main`
- **Last commit:** see `git log --oneline -5`
- **Build status:** ✅ passing (lint, typecheck, 19 tests, 25 routes) · **Deployed to:** nothing yet

## 2. What Was Just Done
- Phase 1 finished: full public site ported to Next.js 16.4.6 App Router, 25 routes,
  design tokens from the original HTML, mobile menu, contact form with server-side
  Zod validation, sitemap, robots, 404/error pages.
- `src/proxy.ts` implements host routing + admin noindex, verified with curl.
- Phase 0 local foundation done: git repo on `main`, `.gitignore`, `.env.example`, `logs/`.
- Full detail: `logs/phase-01-log.md`.

## 3. In Progress / Half-Finished
- **Nothing is half-written.** The tree builds and is committed.
- Phase 0's hosted half (GitHub, Vercel, DNS, accounts) is untouched — blocked on the owner.

## 4. Next Steps (do in this order)
1. Read `AGENT_GUIDE.md`, then `logs/phase-01-log.md` §10, then `DECISIONS.md` (D-013 → D-017).
2. **Phase 2, no DB needed yet:**
   - `npm i drizzle-orm postgres` + `npm i -D drizzle-kit`
   - `src/db/schema.ts` — all tables from MVP.md §3 (users, sessions, pages, posts,
     categories, tags, post_tags, portfolio_items, services, media, leads, settings,
     scripts, blocked_ips, activity_logs, page_views, alerts, redirects, backups_log).
   - `src/lib/auth/password.ts` — Argon2id hash/verify (`@node-rs/argon2`).
   - `src/lib/auth/session.ts` — create/verify/revoke, hashed tokens in DB, httpOnly cookie.
   - `src/lib/rbac.ts` — `requireRole()`; roles Owner/Admin/Editor/Support.
3. Replace `src/app/admin/page.tsx` with the real login screen + admin shell.
   **Keep** the `robots: { index: false }` metadata.
4. Once the owner supplies `DATABASE_URL`: `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`.

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
   (`DATABASE_URL_UNPOOLED`).
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
- **No remote repo**, so no CI, no branch protection, no preview deploys.
- Lighthouse not measured — needs a deployed URL.
- `npm install` requires `--legacy-peer-deps` because of the vitest 5 peer range (D-015).

## 7. Important Context
- **Next.js 16.4.6** — middleware is `src/proxy.ts` exporting `proxy()`, not
  `middleware.ts`. Bundled docs are at `node_modules/next/dist/docs/`; read them
  before using any Next API you are unsure about.
- **Tailwind v4** — tokens live in `@theme` inside `src/app/globals.css`. There is no
  `tailwind.config.js`. Custom utilities use `@utility`.
- **Cache Components is off** (D-013). Do not turn it on without reading the guide.
- Seed content is in `src/lib/content.ts`; components take props, so Phase 3/4 only
  changes the data source.
- Admin host locally: `curl -H "Host: admin.localhost:3000" http://localhost:3000/`
- Real secrets are NOT in the repo. `.env.example` lists names only.

## 8. How to Verify State
```powershell
git status; git log --oneline -10
npm run lint; npm run typecheck; npm run test; npm run build
```
Expect: clean tree, 19 tests passing, 25 routes built.
