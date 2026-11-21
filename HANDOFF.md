# HANDOFF.md
> Overwrite this file at every checkpoint. Keep it short, specific and true.
> A new agent must be able to continue from this file alone (plus AGENT_GUIDE.md).

**Last updated:** 2026-11-21 11:45 (UTC+6) · **By:** saffron

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

**Current sync state:** Phase 8 is committed, tagged `phase-08-complete` and pushed.
Phases 0–8 are on `origin/main`.

## 1. Where We Are
- **Current phase:** Phase 8 complete, verified in a browser and over HTTP.
- **Phase progress:** Phase 0 local done (hosted half blocked on owner), Phases 1–8 complete.
- **Gates:** lint, typecheck, 314/314 tests and build all pass as of this handoff.

## 2. What Phase 8 Delivered
- **Rate limiting** — pure rules in `src/lib/security/rate-limit-rules.ts`, an in-process
  fixed-window limiter in `proxy-limiter.ts`, enforced in `src/proxy.ts` before routing.
  403 for a blocked address, 429 with `Retry-After` for a flood. Login, contact and tracker
  have their own buckets.
- **IP blocking** — `src/lib/security/blocks.ts` with a 60-second cache so the proxy never
  queries per request. Admin at `/admin/security`: add IP/CIDR with reason and expiry,
  list, unblock. Spam filter settings and auto-block live in Settings → Security.
- **Activity logs** — `logActivity` never throws into the caller. `/admin/activity` has
  filters, search and pagination; the clear is owner-only, password-gated, itself logged,
  with 90-day default retention.
- **Staff accounts** — pure permission rules in `src/lib/staff/rules.ts` (24 tests), enforced
  server-side in the actions. Add, change role, deactivate, revoke sessions, reset 2FA.
  The owner cannot be demoted or deleted by anyone.
- **Hardening** — CSP, HSTS (prod only), `poweredByHeader: false` in `next.config.ts`;
  `.github/dependabot.yml`; `npm audit` clean.

## 3. Three Deviations You Must Know About
1. **No one-click block from a lead or log entry (D-041).** Leads store only `ipHash`, a
   salted per-day hash. A hash cannot be reversed into an address, so blocking is done by
   typing the address at `/admin/security`. This is deliberate, not an oversight.
2. **Staff invites are not emailed (D-042).** Resend is still unconfigured. Adding a staff
   account sets a password the owner hands over out of band. The screen says so.
3. **Rate limiting is in-process, not Redis/Upstash (D-040).** Per-instance, resets on
   deploy. Fine for one instance; revisit before launch if the site scales out.

## 4. Known Issues / Tech Debt
- A newly added block can take up to 60 seconds to take effect on a warm instance (cache).
- The limiter does not survive a restart and is not shared across instances.
- The admin IP allowlist is off by default. Turning it on without including the owner's own
  address locks the owner out of `/login`; the page warns about this.

## 5. Next Phase Starting Notes (Phase 9 — Backups, CI/CD, QA, Launch)
1. Start with the GitHub Actions workflow and the `npm audit` gate; Dependabot is in place.
2. R2 bucket and Resend key are the two remaining production blockers, both owner actions.
3. Decide on Upstash before launch if the site will run more than one instance.
