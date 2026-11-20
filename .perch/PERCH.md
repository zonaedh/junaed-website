# Perch Project Manual

Project: **junaedhossain.com** (public site) + **admin.junaedhossain.com** (private admin panel).
Master plan: `MVP.md`. How to work: `AGENT_GUIDE.md`. Where we stopped: `HANDOFF.md`.

## Repository — push at every phase and every checkpoint

**Remote:** `https://github.com/zonaedh/junaed-website.git` · remote `origin` · branch `main`

A phase is **not complete** until it is pushed. Neither is a checkpoint. Work that exists only
on this machine does not count, because the next agent may not be on this machine.

```powershell
git push origin main
git rev-list --left-right --count HEAD...origin/main   # must print: 0   0
```

- **Never force-push** over history you did not create. If rejected: fetch, merge, resolve, push.
- Commit in phase-sized units with a message that matches the diff.
- Never commit `.env.local`, `.pglite/`, `public/uploads/`, `.next/` or `node_modules/`.
  All are gitignored — verify with `git check-ignore -v <path>` before staging anything new.
- Never commit secrets. `.env.example` lists names only.

## Before starting any phase

1. Read `AGENT_GUIDE.md`, then `HANDOFF.md`, `PROJECT_UPDATE.md`, `DECISIONS.md`.
2. `git status` and `git log --oneline -15` — confirm the tree is clean and the remote is in sync.
3. Run the gates: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
4. Start the local database with `npm run db:local` (PGlite on 127.0.0.1:5433, D-022).

## Before finishing any phase

Run all four gates, write `logs/phase-XX-log.md`, update `PROJECT_UPDATE.md`, rewrite
`HANDOFF.md`, add decisions to `DECISIONS.md`, commit, tag `phase-XX-complete`, **push**.
See `AGENT_GUIDE.md` §3 for the exact order.

## Engineering constraints that bite

- **Next.js 16.4.6** — middleware is `src/proxy.ts` exporting `proxy()`. Read
  `node_modules/next/dist/docs/` before using an unfamiliar Next API.
- **`params` is a Promise** in page components — `await params`.
- **`revalidateTag` needs a second argument** — use `{ expire: 0 }` (D-026).
- **`unstable_cache` serialises its result** — Dates come back as strings; type them as
  strings and format at the call site (D-031).
- **A `"use client"` file must never import** `@/lib/rbac`, `@/db`, `@/lib/settings`,
  `@/lib/pages` or `@/lib/media/storage` — they pull the Postgres driver or `node:fs` into the
  browser bundle and fail the build. Import the pure registries instead.
- **Adding a setting or page field is one registry entry** (D-025): the form, validation,
  public read and media usage scan all follow automatically.
- **Media storage is an adapter** (D-027): local disk in dev, R2 when configured, and
  production throws at boot without R2 by design.
- **PowerShell, not bash.** No `&&`. Heredocs mangle backticks — write files with the editor
  tools, never `Set-Content` with an inline template literal containing backticks.
