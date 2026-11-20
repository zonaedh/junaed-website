# PROJECT_UPDATE.md
Human-readable status of **junaedhossain.com + admin panel**. Update at every phase end and major event.

**Last updated:** 2026-11-20 · **Overall progress:** 2.5 / 10 phases

## Phase Status
| # | Phase | Status | Started | Completed | Log |
|---|---|---|---|---|---|
| 0 | Foundations | 🟨 Partly done (local only; hosting/DNS blocked on owner) | 2026-11-20 | — | [phase-00](logs/phase-00-log.md) |
| 1 | Setup + Public Site Port | ✅ Complete (except Lighthouse) | 2026-11-20 | 2026-11-20 | [phase-01](logs/phase-01-log.md) |
| 2 | DB, Auth & Admin Shell | ✅ Complete (code; DB migrations pending a live DATABASE_URL) | 2026-11-20 | 2026-11-20 | [phase-02](logs/phase-02-log.md) |
| 3 | CMS Core (Pages, Settings, Media) | ⬜ | | | |
| 4 | Blog & Portfolio | ⬜ | | | |
| 5 | Contact, Leads, Notifications | ⬜ | | | |
| 6 | On-Page SEO | ⬜ | | | |
| 7 | Analytics, Tracking, Dashboard | ⬜ | | | |
| 8 | Security, IP Block, Logs, Staff | ⬜ | | | |
| 9 | Backups, CI/CD, QA, Launch | ⬜ | | | |

Legend: ⬜ not started · 🟨 in progress · ✅ complete · ⛔ blocked

## Live URLs
- Public: https://junaedhossain.com — not deployed
- Admin: https://admin.junaedhossain.com — not deployed (noindex verified locally only)
- Repo: not created · Vercel project: not created

## Changelog (newest first)
- 2026-11-20 — **Phase 2 complete.** 19-table Drizzle schema, Argon2id passwords,
  hashed-token sessions, TOTP 2FA with encrypted secrets and recovery codes, login
  lockout, RBAC, audit logging, AES-256-GCM encryption, salted IP hashing. Admin panel:
  login, role-filtered sidebar shell, dashboard, 2FA enrolment, 13 section placeholders.
  Six bugs found and fixed, two of them serious (build required a live DB; every
  first-step login failed validation). lint/typecheck/47 tests/build all pass.
  **Migrations have not been run — no database exists yet.**
- 2026-11-20 — **Phase 1 complete.** Public site ported to Next.js 16.4.6: 25 routes,
  design tokens from the original HTML, mobile menu, contact form with server-side
  validation, sitemap/robots, 404/error. Host routing + admin noindex in `src/proxy.ts`,
  verified with curl. lint/typecheck/19 tests/build all pass.
- 2026-11-20 — Phase 0 local foundation: git repo on `main`, `.gitignore`, `.env.example`, `logs/`.
- 2026-11-20 — Project plan created (MVP.md, AGENT_GUIDE.md).

## Current Blockers
- **Needs the owner:** GitHub repo, Vercel, Neon, Cloudflare R2, Upstash, Resend,
  Telegram bot, Namecheap DNS, 2FA. Exact steps in `HANDOFF.md → Needs From User`.
  **Phase 2 is now blocked on Neon:** migrations, seed, login and 2FA cannot be
  proven end to end until `DATABASE_URL` exists. That is the highest-value item.
- **Contact form does not deliver** (validation only until Phase 5). Launch blocker.
- Lighthouse not measured (needs a deployed URL).

## Open Questions to User
See bottom of `MVP.md`. Working assumptions are recorded in `HANDOFF.md` §5A so
work can continue.

## Backlog (out of MVP scope)
- i18n, newsletter, comments, booking/payments, site search, A/B testing, PWA
