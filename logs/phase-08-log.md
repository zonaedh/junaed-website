# Phase 8 — Security hardening, logs, IP blocking, staff accounts

**Date:** 2026-11-21
**Status:** Complete, verified in a browser and over HTTP
**Gates:** lint clean · typecheck clean · 314/314 tests · build succeeds

## What shipped

### 8.1 Rate limiting and abuse protection
- `src/lib/security/ip.ts` — pure address logic: parse, normalise IPv4/IPv6, CIDR
  containment, and `clientAddressFromHeaders` (X-Forwarded-For → X-Real-IP → CF
  header, first hop only). 39 tests in `ip.test.ts`.
- `src/lib/security/rate-limit-rules.ts` — the rules as pure data: `global:public`
  120/min, `global:api` 60/min, `api:track` 60/min, `auth:login` 5/15 min,
  `auth:reset` 3/hour, contact burst 3/10 min and 10/day. `ruleForPath` maps a
  path to its rule; `retryAfterSeconds` floors at 1.
- `src/lib/security/proxy-limiter.ts` — in-process fixed-window counter with an
  opportunistic sweep. Cheap enough for the proxy; per-instance by design (D-040).
- `src/proxy.ts` — `guardRequest` runs before any routing: block list first, then
  the rate limit. 403 for a blocked address, 429 with `Retry-After` for a flood.
  Both responses carry `no-store` and `x-robots-tag`.
- Per-endpoint limits wired into the login action (IP limit plus allowlist), the
  contact action, and the tracker route.

### 8.2 IP blocking
- `src/lib/security/blocks.ts` — repository with a 60-second in-process cache, so
  the proxy never queries the database per request (the Next docs forbid slow
  data fetching in the proxy). Cost: up to a minute of staleness on a new block.
- Admin at `/admin/security`: add an IP or CIDR with a reason and optional expiry,
  list active blocks, unblock. Every add and remove is written to the activity log.
- Spam filter settings live in Settings → Security and are read by the contact
  form: links allowed, block disposable domains, auto-block after N submissions
  in 24h, and an admin IP allowlist for `/login`.
- Auto-block: repeated spam submissions from one address add a temporary block
  through the same repository, so the proxy enforces it with no extra path.

### 8.3 Activity logs
- `src/lib/audit.ts` — `logActivity` never throws into the caller; a failed audit
  write is logged and the user action still stands. `ACTIONS` holds the canonical
  action keys so the admin filters stay consistent.
- `src/lib/security/activity-log.ts` — filtered, paginated reads plus the
  retention clear.
- Admin at `/admin/activity`: filter by user, action and date, search, paginate.
  **Clean logs** is owner-only and requires password re-entry; the clear itself is
  logged. Default retention is 90 days.

### 8.4 Staff accounts
- `src/lib/staff/rules.ts` — the permission rules as pure, tested logic (24 tests):
  who may manage whom, the owner-protection floor, and self-service limits.
- `src/lib/staff/repository.ts` — accounts with 2FA state and live session count.
- `src/app/admin/(panel)/staff` — add an account, change role, activate/deactivate,
  force a password reset, revoke sessions, reset 2FA, with the owner row protected.
- Rules are enforced server-side in the actions, not only hidden in the UI.

### 8.5 Platform hardening
- CSP, HSTS (production only), `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy` all set in `next.config.ts`;
  `poweredByHeader: false`.
- `.github/dependabot.yml` added. `npm audit` reports zero vulnerabilities.
- The Security settings group appears in the settings form automatically through
  the registry (D-025), so there is one place to edit them.

## Verification (browser and HTTP, not just unit tests)

| Check | Result |
|---|---|
| Security page renders with live settings | yes, browser confirmed |
| Add a block for 203.0.113.5 | recorded, listed as 1 active block |
| Blocked IP on the public site | `curl` → **403** |
| Blocked IP on `/admin/security` | `curl` → **403** |
| Normal IP (198.51.100.9) | `curl` → **200** |
| Block event in the activity log | yes, visible at `/admin/activity` |
| Unblock 203.0.113.5 | removed, page back to "Nothing is blocked" |
| Same IP after unblock | `curl` → **200** |
| Staff page, owner row | renders; owner exposes only self-service controls |
| Settings → Security group | all four new settings render with live values |

## Deviations from plan

- **One-click "Block this IP" from a lead: not built.** Leads store only `ipHash`,
  a salted per-day hash, never the raw address — that is the Phase 7 privacy model
  and it is deliberate. A hash cannot be turned back into an IP, so a one-click
  block from a lead would mean either storing raw IPs or blocking a hash the proxy
  cannot match. Blocking from the activity log has the same constraint for the same
  reason. Blocking is done from `/admin/security` by address, which is the only
  place the raw address is known. Recorded as D-041.
- **Staff invite by email: not built as email.** Resend is still not configured, so
  adding a staff account creates it with a password the owner sets and hands over
  through a channel they control. The screen says so plainly. This is the same
  deferral Phase 5 recorded for password reset.
- **CSP is not nonce-based.** `script-src` keeps `'unsafe-inline'` because Next's
  inline bootstrap and the JSON-LD blocks need it, and a nonce would force every
  route dynamic and give up static rendering. `'unsafe-eval'` is development-only.
  Documented in `next.config.ts`.
- **Rate limiting is in-process, not Redis/Upstash.** No Upstash is configured, so
  the limiter is per-instance and resets on deploy. It is a cheap first gate, not a
  distributed one; the account lockout is the durable ceiling. Recorded as D-040.

## Known issues / tech debt

- The block-list cache means a newly added block can take up to 60 seconds to take
  effect on a warm instance. Acceptable for abuse control; not acceptable if this
  ever becomes a compliance control.
- The in-process limiter does not survive a restart and is not shared across
  instances. Moving to Upstash is a drop-in replacement for `proxy-limiter.ts`.
- The admin IP allowlist is off by default. Turning it on with an address that
  omits the owner will lock the owner out of `/login`; the warning is on the page.

## How to test this phase

1. `npm run db:local`, then `npm run dev`.
2. Open `/admin/security`, block `203.0.113.5` with a reason.
3. `curl.exe -s -o NUL -w "%{http_code}" -H "X-Forwarded-For: 203.0.113.5" http://localhost:3000/` → 403.
4. Same request with `198.51.100.9` → 200.
5. Unblock it; the same request returns 200 again.
6. Open `/admin/activity` and confirm the block and unblock are both recorded.
7. Open `/admin/staff` and confirm the owner row cannot be demoted or deleted.
8. Submit the contact form repeatedly to trip the spam counter and watch the
   auto-block appear on `/admin/security`.

## Next phase starting notes

1. Phase 9 is backups, CI/CD, QA and launch. Start with the GitHub Actions workflow
   and the `npm audit` gate, since Dependabot is already in place.
2. The R2 bucket and Resend key are still the two blockers for a production deploy;
   both are owner actions.
3. Before launch, decide whether the limiter moves to Upstash. If the site runs more
   than one instance, the in-process limiter is not sufficient on its own.
