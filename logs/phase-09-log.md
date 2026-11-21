# Phase 9 — Backups, CI/CD, QA and launch

**Date:** 2026-11-21
**Status:** Code and infrastructure complete and verified locally. Launch itself is
**blocked** on four owner-supplied credentials — see §6.
**Gates:** lint clean · typecheck clean · 342/342 tests · build succeeds

## What shipped

### 9.1 Backups
- `src/lib/backup/rules.ts` — the retention rule as pure, tested logic: filename
  contract, `planRetention`, staleness, `formatBytes`. 28 tests in `rules.test.ts`.
- `src/lib/backup/repository.ts` — cached reads under the `backups` tag, plus
  `recordBackup` and `markBackupFailed`.
- `src/lib/backup/dispatch.ts` — triggers `workflow_dispatch` through the GitHub
  REST API. Returns a plain explanation when the token is missing rather than
  pretending a run started.
- `src/app/admin/(panel)/backups` — replaces the placeholder. Shows the last runs,
  a staleness banner, the run-now button, and a restore guide.
- `.github/workflows/backup-weekly.yml` — Sunday 02:00 UTC plus manual dispatch:
  `pg_dump` → gzip → `age` encrypt → SFTP upload → **verify size** → prune to the
  newest 3 → write to `backups_log` → Telegram.

### 9.2 CI/CD
- `.github/workflows/ci.yml` — lint, typecheck, tests and build on every PR and
  push to `main`, plus a separate `npm audit --audit-level=high` job. The build
  step runs with placeholder secrets, which was verified locally to actually work.
- `.github/workflows/db-migrate.yml` — `workflow_dispatch` only, requires typing
  `migrate`, and targets a `production` GitHub Environment for the reviewer rule.

### 9.3 QA
- `docs/qa-checklist.md` — every row marked verified, blocked, or not run. No row
  is marked done because it is probably fine.

### 9.4 Launch
- `docs/launch-runbook.md` — ordered launch day, the four blockers, the restore
  drill, and a rollback path.

## Verification (browser and HTTP, not just unit tests)

| Check | Result |
|---|---|
| Backups page renders | yes, browser confirmed |
| Staleness banner with no backups | fires: "No run has ever succeeded" |
| Run-now with no token | returns the real reason, does not pretend |
| Row after a failed dispatch | `failed`, not stuck on `running` |
| Activity log | `backup.failed` recorded with the reason |
| CI build with placeholder env | `npm run build` succeeds with the exact CI values |
| All four workflow YAML files | parse cleanly |
| `npm audit` | zero vulnerabilities |

## Deviations from plan

- **Backups run weekly, keeping the newest 3.** MVP.md itself flagged this as
  ambiguous ("weekly. last 3 backup file will stay daily"). Implemented as weekly
  runs, keep 3, as the spec's own retention rule describes. If daily runs are
  wanted, change the cron and nothing else.
- **The restore drill has not been run.** It needs a real Neon branch and a real
  archive, neither of which exists yet. It is written into the runbook as a
  launch-day step, not claimed as done.
- **Launch is not done.** The site is not deployed. Everything in §9.3 and §9.4
  that needs a live URL or a mail provider is marked blocked, not complete.
- **No media/R2 backup.** The spec calls it optional and says the DB is the
  priority. Not built; noted in the runbook.

## Known issues / tech debt

- The `production` GitHub Environment needs a required-reviewer rule configured by
  hand; without it `db-migrate.yml` runs as soon as it is dispatched.
- The backup workflow writes to `backups_log` directly over `psql`, so the row
  bypasses `logActivity`. That is deliberate (the workflow has no session) but it
  means backup rows are not in the activity log.
- `listRecentBackups` is cached for 300s, so a row written by the workflow can
  take up to five minutes to appear.

## Blocked on the owner

1. Vercel project and production deploy
2. Neon production database
3. Cloudflare R2 bucket
4. Resend API key and a verified domain

Until these exist, the QA checklist cannot be finished and the launch cannot be
called done.

## Next

Phase 10 does not exist in MVP.md; Phase 9 is the last planned phase. What remains
is the owner-supplied infrastructure above, then the launch runbook.
