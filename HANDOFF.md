# HANDOFF.md
> Overwrite this file at every checkpoint. Keep it short, specific and true.
> A new agent must be able to continue from this file alone (plus AGENT_GUIDE.md).

**Last updated:** 2026-11-21 11:50 (UTC+6) · **By:** saffron

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

**Current sync state:** Phase 9 is committed, tagged `phase-09-complete` and pushed.
Phases 0–9 are on `origin/main`.

## 1. Where We Are
- **Current phase:** Phase 9 code complete, verified locally. **Launch is blocked.**
- **Phase progress:** Phase 0 local done (hosted half blocked on owner), Phases 1–9 complete.
- **Gates:** lint, typecheck, 342/342 tests and build all pass as of this handoff.
- **Phase 9 is the last phase in MVP.md.** What remains is infrastructure, not code.

## 2. What Phase 9 Delivered
- **Backups** — `src/lib/backup/rules.ts` (retention as pure tested logic, 28 tests),
  `repository.ts`, `dispatch.ts`, and the real `/admin/backups` page. The workflow is
  `.github/workflows/backup-weekly.yml`: dump → gzip → age encrypt → SFTP → verify size
  → prune to newest 3 → write to `backups_log` → Telegram.
- **CI** — `.github/workflows/ci.yml` runs lint, typecheck, tests and build on every PR,
  plus `npm audit --audit-level=high`. The build step uses placeholder secrets; that was
  verified locally to actually work.
- **Migrations** — `.github/workflows/db-migrate.yml`, dispatch-only, requires typing
  `migrate`, targets a `production` GitHub Environment.
- **Docs** — `docs/qa-checklist.md` (every row verified / blocked / not run) and
  `docs/launch-runbook.md`.

## 3. THE LAUNCH IS BLOCKED ON FOUR OWNER ITEMS
1. **Vercel project + production deploy** — there is no live site.
2. **Neon production database** — dev runs on local PGlite.
3. **Cloudflare R2 bucket** — the storage adapter refuses disk in production by design.
4. **Resend API key + verified domain** — no transactional email has ever been sent.

Do not describe the project as launched until these exist and the runbook is walked.

## 4. Known Issues / Tech Debt
- The `production` GitHub Environment needs a required-reviewer rule set by hand, or
  `db-migrate.yml` runs immediately on dispatch.
- The backup workflow writes to `backups_log` over `psql`, bypassing `logActivity`. The
  workflow has no session, so this is deliberate, but backup rows are not in the activity log.
- `listRecentBackups` is cached 300s, so a workflow-written row can take up to five minutes
  to appear on the page.
- The restore drill has **not** been run. It needs a real archive and a Neon branch. It is
  a launch-day step in the runbook, not a completed item.

## 5. Next Steps
1. Owner supplies the four items in §3.
2. Run `docs/launch-runbook.md` top to bottom.
3. Run `docs/qa-checklist.md` on a real phone against the preview URL.
4. Tag `v1.0.0` when the runbook's definition of "launched" is actually met.
