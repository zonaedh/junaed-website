# HANDOFF.md
> Overwrite this file at every checkpoint. Keep it short, specific and true.
> A new agent must be able to continue from this file alone (plus AGENT_GUIDE.md).

**Last updated:** 2026-11-21 11:25 (UTC+6) · **By:** saffron

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

**Current sync state:** Phase 7 is committed and pushed. Phases 0–7 are on `origin/main`.
Phase 7 is tagged `phase-07-complete`.

## 1. Where We Are
- **Current phase:** Phase 7 complete, verified in a browser and over HTTP.
- **Phase progress:** Phase 0 local done (hosted half blocked on owner), Phases 1–7 complete.
- **Gates:** lint, typecheck, 226/226 tests and build all pass as of this handoff.

## 2. What Phase 7 Delivered
- **Consent first** — `ConsentBanner` writes `jh_consent` and fires `jh:consent`. Nothing
  third-party loads before an explicit accept; with `consentRequired` on, not even the GTM
  container loads.
- **Tag loader** — GTM, GA4, Meta Pixel, Clarity, all gated on consent, with Consent Mode v2
  defaults pushed ahead of the first tag.
- **First-party tracking** — `POST /api/track`, always 204. Bots dropped, DNT honoured, path
  normalised and validated, referrer stored as a label, raw IP never stored.
- **Custom scripts** — admin CRUD at `/admin/scripts` with live risk warnings, enable/disable,
  and a one-click rollback that keeps the previous code.
- **Dashboard** — real KPIs, daily series chart, widgets, alerts bell.
- **Analytics page** — range selector, breakdowns, daily series.
- **Alerts** — list, mark read, mark all read, unread sidebar badge.
- **Lead conversion event** — `generate_lead` fires from the contact form.

## 3. Three Things That Will Bite You
1. **A client component must never import `@/lib/analytics/scripts`.** It pulls `@/db` and the
   Postgres driver into the browser bundle; the build fails with `Can't resolve 'util/types'`.
   Import the pure rules from `@/lib/analytics/script-rules` (D-038).
2. **Head snippets mount in the root layout, not the site layout.** `(site)/layout.tsx` renders
   only `body_start` and `body_end`. `src/app/layout.tsx` renders `head` and skips it for
   `/admin` paths (D-039).
3. **Two page views in dev are StrictMode.** `reactStrictMode: true` double-invokes effects in
   development only. Production sends one beacon per navigation. Do not "fix" it.

## 4. Next Phase Starting Notes
1. **Phase 8 is performance, accessibility and launch readiness** — read `MVP.md` §8 first.
2. The root layout is now async and reads `headers()`, so every route is dynamic. If Phase 8
   wants static pages, that is the thing to unpick first — and the public layout already reads
   the database per request, so it is not a new constraint.
3. `sessionHash` on `page_views` is written as `null` on purpose. A real session id needs a
   cookie, which is a consent-scope decision for the owner.

## 5. Local Environment
- `npm run db:local` — PGlite on 127.0.0.1:5433 (D-022).
- `npm run dev` — dev server on :3000. **Restart after adding settings keys**; the
  registry is read at boot.
- Load the site at `http://localhost:3000`, not `127.0.0.1` — Next blocks cross-origin HMR
  from `127.0.0.1` in dev and the page will not hydrate.
