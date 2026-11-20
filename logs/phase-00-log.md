# Phase 00 Log — Foundations
**Dates:** 2026-11-20 → 2026-11-20 · **Agent:** saffron · **Branch/Tag:** `main` / `phase-00-complete`

## 1. Goal
Repo, hosting, DNS, accounts and secrets hygiene in place so a blank app serves
on both domains over HTTPS.

## 2. What Was Built
- Git repository initialised on branch `main` (was uninitialised; default was `master`).
- `logs/` directory created; `session-log.md` and `_TEMPLATE_phase-log.md` moved into it.
- `.gitignore` written (node_modules, `.next`, `.env*` except `.env.example`, dumps, backups).
- `.env.example` written with every variable from MVP.md, values blank.
- `README.md` for `logs/` already existed and was kept.

## 3. Database / Config Changes
- No database yet.
- New env vars documented (not set): see `.env.example`. Values are NOT recorded anywhere in the repo.

## 4. Decisions Made
- D-013 (Next 16.4 + Tailwind v4, Cache Components disabled) — made during Phase 1 scaffolding but belongs to the foundation.
- D-014 (middleware → `proxy.ts`).

## 5. Test Results
| Check | Result |
|---|---|
| lint / typecheck / tests / build | n/a at Phase 0 (no app yet) |
| Lighthouse (mobile) | not run |
| Security checks | `.env.example` committed with no values; `.gitignore` blocks `.env*` |
| Manual QA | n/a |

## 6. Deviations From Plan
- **GitHub repo, Vercel project, DNS records, and all third-party accounts were NOT created.**
  These require the owner's credentials and cannot be done by an agent. They are
  listed under `HANDOFF.md → Needs From User` with exact steps.
- Because of that, Phase 0 is **partially complete**: the local foundation is done,
  the hosted foundation is blocked on the owner.

## 7. Known Issues / Tech Debt
- No remote repository yet, so no CI, no branch protection, no Vercel preview.
- `main` has no protection because there is no remote.

## 8. Manual Steps Done By User
- None yet.

## 9. How To Test This Phase
1. `git log --oneline` shows the Phase 0 commits.
2. `git status` is clean.
3. Confirm `.env.example` exists and contains no real values.

## 10. Next Phase Starting Notes
- Phase 1 proceeds locally without any of the blocked accounts (no DB or storage needed yet).
- When the owner supplies the GitHub repo URL: `git remote add origin <url>`, push `main`, enable branch protection requiring CI.
