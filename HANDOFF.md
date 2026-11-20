# HANDOFF.md
> Overwrite this file at every checkpoint. Keep it short, specific and true.
> A new agent must be able to continue from this file alone (plus AGENT_GUIDE.md).

**Last updated:** 2026-11-21 01:10 (UTC+6) · **By:** saffron

## 0. Repository — push at every phase and every checkpoint

**Remote:** `https://github.com/zonaedh/junaed-website.git` · remote `origin` · branch `main`

A phase is **not complete** until it is pushed. Neither is a checkpoint. Work that exists only
on the local machine does not count, because the next agent may not be on this machine.

```powershell
git push origin main
git rev-list --left-right --count HEAD...origin/main   # must print: 0   0
```

If the push is rejected, **never force-push** over history you did not create. Fetch, merge,
resolve, push. Full protocol: `AGENT_GUIDE.md` §3.

**Current sync state:** `main` is at `57101ca`, identical to `origin/main` (0 ahead, 0 behind).
Phases 0–4 are pushed. Phase 5 has not started.


## 1. Where We Are
- **Current phase:** Phase 3 complete, Phase 4 complete. Both verified in a browser.
- **Phase progress:** Phase 0 local done (hosted half blocked on owner), Phase 1 complete,
  Phase 2 complete + verified, Phase 3 complete, Phase 4 complete.
- **Branch:** `main` — Phases 3 and 4 are committed and **pushed** (`f9f1916`, `8b404ea`,
  merge `57101ca`). Remote and local are identical.
- **Build status:** passing — lint, typecheck, **93 tests**, production build (37 routes).
  Build also passes with `DATABASE_URL` unset.

## 2. What Was Just Done
- **Media library, built and proven.** Upload → content-sniffed MIME → EXIF-stripped WebP +
  480px thumbnail → row in `media`. Verified with real bytes: a 1200×1500 JPEG went in and
  came out as a 3 KB WebP with EXIF confirmed present before and absent after.
- **Storage adapter (D-027).** One `StorageDriver` interface, two drivers. Local disk now,
  R2 written and dormant. **R2 is no longer a blocker** — it is five env vars.
- **Media usage guard (D-029).** Deleting an image that a page references is refused, with
  "Used in: Home — Hero image" shown instead of a delete button. Verified in the browser.
- **Image fields in the registry (D-025 extension).** Hero and about images are now one
  registry entry each, and are usage-tracked automatically.
- **Blog, end to end.** Tiptap editor, slug derivation, word count and reading time, tags,
  categories, draft/publish. Public index and post page read from the database.
- **Portfolio, end to end.** Admin CRUD, featured flag, results pairs, year. Public index,
  case study page, and the home page's "Selected work" all read from the database.

## 3. Bugs Fixed This Session
- **B12 — hero alt text came from the hero heading, not the media row.** The image rendered
  but the alt was wrong, which is an accessibility defect and an SEO one. Now reads the
  media library's `alt`.
- **B13 — `/blog/[slug]` was prerendered as SSG.** A post published in admin would have 404'd
  until the next deploy, contradicting the phase's own definition of done. Caught by reading
  the build output. Detail routes are now dynamic (D-030).
- **B14 — `unstable_cache` returned `Date` fields as strings while the type claimed `Date`.**
  The type was lying; any `.toISOString()` would have thrown in production while typechecking
  clean. Types now declare the serialised shape (D-031).
- **B15 — the settings form duplicated the key→field map**, which is exactly the drift D-025
  exists to prevent. Now generated from the registry.
- **B16 — usage tracking ran an N+1 query per portfolio row.** Now one query.

## 4. Next Steps (do in this order)
1. **Confirm the remote is in sync** before touching anything: `git status` and
   `git rev-list --left-right --count HEAD...origin/main` → `0  0`.
2. Read `DECISIONS.md` D-022 to D-031.
3. **Phase 5 — Contact, Leads, Notifications.** The contact form currently validates and
   discards. This is the launch blocker.
4. **Phase 3/4 remainder, when credentials arrive:** R2 (swap env vars, no code change),
   live preview with a signed token, "last edited by".
5. **When Phase 5 passes its gates: commit, tag `phase-05-complete`, and push.** That is part
   of finishing the phase, not an afterthought.

## 5. Needs From User (blocking items)

**A. Answers to the 7 Open Questions at the bottom of `MVP.md`.** Until answered I assume:
weekly backups keeping last 3; DB-only backup for now; English only; categories SEO /
Digital Marketing / Design / WordPress; assume EU/UK visitors so consent blocks scripts by
default; one Telegram chat; placeholder photos acceptable.

**B. Create these accounts and send me the values (never commit them):**

1. **GitHub repo** — github.com/new → name `junaedhossain` → Private → do not initialise with
   a README. Then send me the repo URL. I will push `main` and add CI.
2. **Vercel** — vercel.com/signup with GitHub → Add New Project → import `junaedhossain` →
   Framework: Next.js (auto). Then Settings → Domains → add `junaedhossain.com` and
   `admin.junaedhossain.com`.
3. **Neon Postgres** — neon.tech → New Project → region closest to your visitors → copy the
   **pooled** connection string (`DATABASE_URL`) and the **unpooled** one
   (`DATABASE_URL_UNPOOLED`). Local dev no longer waits on it; deploys do.
4. **Cloudflare R2** — dash.cloudflare.com → R2 → Create bucket `junaed-media` → Manage R2 API
   Tokens → Create token with Object Read & Write → send Account ID, Access Key ID, Secret
   Access Key, and enable a public URL for the bucket. **No longer blocks development** — the
   library works on local disk today. It blocks *deploying* media, because production refuses
   to write to an ephemeral filesystem (D-027).
5. **Upstash Redis** — console.upstash.com → Create Database → copy `UPSTASH_REDIS_REST_URL`
   and `UPSTASH_REDIS_REST_TOKEN`.
6. **Resend** — resend.com → API Keys → create → send the key. Then Domains → add
   `junaedhossain.com` and add the SPF/DKIM/DMARC records it shows to Namecheap DNS.
7. **Telegram bot** — open Telegram, message `@BotFather` → `/newbot` → name it → copy the
   token. Then message your new bot once, and open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` to find your `chat_id`.

**C. DNS on Namecheap** (Advanced DNS for `junaedhossain.com`):
- `A` record, Host `@`, Value `76.76.21.21`, TTL Automatic
- `CNAME`, Host `admin`, Value `cname.vercel-dns.com`
- `CNAME`, Host `www`, Value `cname.vercel-dns.com`
- Then in Vercel → Domains, set `www` to redirect to the apex domain.

**D. Enable 2FA** on GitHub, Vercel, Namecheap, Neon and Cloudflare.

**E. Real content, when ready:** hero photo, about photo, and real portfolio items with client
permission. Placeholders are in place so nothing is blocked.

## 6. Blockers / Known Issues
- **LAUNCH BLOCKER (not security):** the contact form validates but does not deliver anything
  (D-017). Phase 5 fixes it. Do not launch before then.
- **No live production database.** Local dev is unblocked via PGlite; Neon is still needed for
  any deploy.
- **R2 not configured.** Media works locally on disk. A production deploy with no R2 throws at
  boot by design (D-027) — that is a guard, not a bug.
- **No remote repo**, so no CI, no branch protection, no preview deploys.
- Lighthouse not measured — needs a deployed URL.
- `npm install` requires `--legacy-peer-deps` because of the vitest 5 peer range (D-015).
- **PGlite is single-writer.** Do not run two processes writing at once. If port 5433 is held
  by a stale process, `npm run db:local:stop` or kill the PID on that port.
- **Two dev servers may be running** (3000 and 3001). They are the same app. Kill one before
  benchmarking anything.

## 7. Important Context
- **Next.js 16.4.6** — middleware is `src/proxy.ts` exporting `proxy()`, not `middleware.ts`.
  Bundled docs are at `node_modules/next/dist/docs/`; read them before using any Next API you
  are unsure about.
- **`revalidateTag` needs a second argument in Next 16.** We use `{ expire: 0 }` (D-026). The
  single-argument form is deprecated.
- **`params` is a Promise** in Next 16 page components — `await params`.
- **Tailwind v4** — tokens live in `@theme` inside `src/app/globals.css`. There is no
  `tailwind.config.js`. Custom utilities use `@utility`.
- **Cache Components is off** (D-013). Caching uses `unstable_cache` + `revalidateTag`.
- **`unstable_cache` serialises its result** (D-031). Dates come back as strings. Type them
  as strings and format at the call site.
- **A `"use client"` file must never import `@/lib/rbac`, `@/db`, `@/lib/settings`,
  `@/lib/pages` or `@/lib/media/storage`** — they drag the Postgres driver or `node:fs` into
  the browser bundle and fail the build (B1, B11). Import `@/lib/role-hierarchy`,
  `@/lib/settings-registry`, `@/lib/pages-definitions` or `@/lib/media/types` instead.
- **The DB client is lazy** (D-018). Importing `@/db` has no side effects; the pool is created
  on first query.
- **Admin host locally:** `http://localhost:3001/admin` works (D-020). All admin links and
  redirects are host-aware (D-024) — use `getAdminBase()` for any new one.
- **The owner is enrolled in TOTP locally** via `npm run db:enrol-owner`, which prints a secret
  and a live code. Dev bootstrap only — never run it in production.
- **Adding a setting or page field is one registry entry** (D-025): `src/lib/settings-registry.ts`
  or `src/lib/pages-definitions.ts`. The form, validation, public read and media usage scan all
  follow automatically.
- Real secrets are NOT in the repo. `.env.example` lists names only.

## 8. How to Verify State
``powershell
git status; git log --oneline -10
npm run lint; npm run typecheck; npm run test; npm run build
``
Expect: **93 tests passing**, production build clean (37 routes).
If `npm run build` says "Another next build process is already running", delete
`.next\lock` and `.next\dev\lock` — a killed dev server leaves them behind.

To verify the whole loop from scratch:
``powershell
npm run db:local        # terminal 1, leave running
npm run db:migrate      # terminal 2
npm run db:seed
npm run db:enrol-owner  # prints a secret + code for the owner
npm run dev
# open http://localhost:3001/admin/login, sign in, then:
#   /admin/settings      change the site name, save, reload the public site
#   /admin/pages/home    change the hero heading, save, reload the public site
#   /admin/media         upload an image, set alt text, then try to delete it while in use
#   /admin/posts/new     write a post, publish, confirm it appears at /blog immediately
#   /admin/portfolio/new publish a project, confirm /portfolio and the home page show it
``
