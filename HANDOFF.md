# HANDOFF.md
> Overwrite this file at every checkpoint. Keep it short, specific and true.
> A new agent must be able to continue from this file alone (plus AGENT_GUIDE.md).

**Last updated:** 2026-11-21 03:40 (UTC+6) · **By:** saffron

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

**Current sync state:** `main` is in sync with `origin/main` (0 ahead, 0 behind).
Phases 0–5 are pushed. Phase 5 is tagged `phase-05-complete`.

## 1. Where We Are
- **Current phase:** Phase 5 complete and verified in a browser.
- **Phase progress:** Phase 0 local done (hosted half blocked on owner), Phase 1 complete,
  Phase 2 complete + verified, Phase 3 complete, Phase 4 complete, Phase 5 complete.
- **Branch:** `main` — all phases committed and pushed.
- **Gates:** lint, typecheck, 146/146 tests and build all pass as of this handoff.

## 2. What Phase 5 Delivered
The contact form is now a real pipeline, not a dead end:

- **Gates:** honeypot → minimum fill time → signed maths captcha → rate limit → spam score.
- **Persistence:** leads land in the `leads` table with IP hash and message hash (never a
  raw IP), deduped by message hash.
- **Notifications:** Telegram and Resend adapters are fully written and dormant. Adding
  `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` or `RESEND_API_KEY` plus the Settings toggle is
  the entire remaining job. No code change.
- **Admin inbox:** `/admin/leads` with status filters, search, unread sidebar badge;
  `/admin/leads/[id]` with status controls and private notes; `/admin/leads/export` CSV.

Key files: `src/lib/contact/{captcha,spam,rate-limit,notify}.ts`,
`src/lib/leads/repository.ts`, `src/app/(site)/contact/actions.ts`,
`src/app/admin/(panel)/leads/**`.

## 3. Credentials Still Missing
Three subsystems are built but dormant. None block Phase 6:

| Subsystem | Env vars | Fallback today |
|---|---|---|
| Email (Resend) | `RESEND_API_KEY` | notifications skipped |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | notifications skipped |
| Rate limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | in-memory, per-process |

**Upstash matters before launch.** The in-memory limiter is correct in dev but will not
hold across multiple instances.

## 4. Next Phase Starting Notes
1. **Phase 6 is analytics and SEO** — read `MVP.md` §6 before touching anything.
2. Configure Upstash before any real traffic.
3. Leads list has no pagination; fine now, needed past a few hundred rows.

## 5. Local Environment
- `npm run db:local` — PGlite on 127.0.0.1:5433 (D-022).
- `npm run dev` — dev server on :3000. **Restart after adding settings keys**; the
  registry is read at boot.
- Owner login for local testing: `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` in `.env.local`.
- PowerShell, not bash. No `&&`. Write files with editor tools, never `Set-Content` with
  an inline template literal containing backticks.
