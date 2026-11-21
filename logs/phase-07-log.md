# Phase 7 — Analytics, tracking and the dashboard

**Date:** 2026-11-21
**Status:** Complete, verified in a browser and over HTTP
**Gates:** lint clean · typecheck clean · 226/226 tests · build succeeds

## What shipped

### 7.1 Consent and tag loading
- `src/lib/analytics/core.ts` — pure logic: consent parsing/serialisation, date-range
  resolution, path normalisation, referrer classification, UA parsing, UTM parsing,
  conversion rate. 48 tests in `core.test.ts`.
- `src/components/analytics/consent-banner.tsx` — Accept and Reject are the same size
  and one click each. An unrecognised or outdated cookie counts as unset, never as
  consent. Writes `jh_consent=<choice>.<version>` and fires a `jh:consent` window event.
- `src/components/analytics/tracking-tags.tsx` — GTM, GA4, Meta Pixel and Clarity.
  Nothing loads until consent is granted; when `consentRequired` is on and the visitor
  has not answered, not even the GTM container loads. Consent Mode v2 defaults are
  pushed before the first tag.

### 7.2 Custom scripts
- `src/lib/analytics/scripts.ts` — repository: cached active set under the `scripts`
  tag, create/update/delete, and a rollback that keeps the previous code.
- `src/lib/analytics/script-rules.ts` — the pure rules (`scriptAppliesTo`,
  `scriptWarnings`), split out because the admin form is a client component and
  `scripts.ts` pulls in the Postgres driver (D-038).
- `src/components/analytics/custom-scripts.tsx` — server component; renders matching
  snippets into the first response. Scoped by path prefix.
- Admin at `/admin/scripts`: add, edit, enable/disable, roll back, delete, with live
  warnings for `document.write`, `eval(`, unbalanced tags, unsandboxed iframes, and
  oversized snippets.

### 7.3 First-party tracking
- `src/app/api/track/route.ts` — POST only, always 204. Drops bots, honours DNT,
  normalises and validates the path, stores a readable referrer label rather than a
  full external URL, and never stores a raw IP.
- `src/lib/security/hash.ts` — `hashIp` salts with the secret plus the calendar day, so
  a visitor is recognisable within a day and uncorrelatable across days.
- `src/components/analytics/analytics-tracker.tsx` — one beacon per navigation via
  `sendBeacon` with a `fetch`/`keepalive` fallback, plus `click_phone`, `click_email`,
  `click_whatsapp`, `view_portfolio_item`, `scroll_75` (once per page) and
  `generate_lead` on contact success.

### 7.4 Dashboard and alerts
- `src/app/admin/(panel)/dashboard/page.tsx` — real KPIs, daily series chart, widgets.
- `src/app/admin/(panel)/analytics/page.tsx` — range selector, breakdowns, daily series.
- `src/app/admin/(panel)/alerts/page.tsx` — list, mark read, mark all read, unread badge
  in the sidebar.
- Lead conversion event wired into the contact form.

## Verification (browser and HTTP, not just unit tests)

| Check | Result |
|---|---|
| Banner renders on first visit | yes, screenshot confirmed |
| Accept writes cookie and dismisses | `jh_consent=accepted.1`, banner gone |
| Beacon writes a row | `/blog` view recorded: hashed visitor, `Direct` referrer, `desktop`/`Chrome` |
| Bot filtering | route drops on UA before insert |
| Snippet scoped to `/blog` | injected on `/blog`, absent on `/` and `/admin/login` |
| Save keeps previous code | `previous_code` populated on edit |
| Rollback swaps code | `code` and `previous_code` exchanged correctly |
| Delete removes the row | `scripts` count back to 0 |
| Alert mark-read | "0 unread of 1 shown", button disabled |
| Admin surfaces render | dashboard, analytics, alerts, scripts all 200 |

## Three things that will bite you

1. **A client component must never import `@/lib/analytics/scripts`.** It pulls `@/db`
   and the Postgres driver into the browser bundle; the build fails with
   `Can't resolve 'util/types'`. Import the pure rules from
   `@/lib/analytics/script-rules` instead (D-038).
2. **Head snippets need the root layout.** `(site)/layout.tsx` only renders
   `body_start` and `body_end`. Head-location snippets are mounted in `src/app/layout.tsx`
   and skipped when the path starts with `/admin`.
3. **Two page views in dev are StrictMode, not a bug.** `reactStrictMode: true` double
   invokes effects in development. Production sends one beacon per navigation.

## Not done, deliberately

- No session-level unique visitor count: `sessionHash` is written as `null`. Day-salted
  visitor hashes give honest daily uniques; a session id would need a cookie, which is a
  consent-scope decision for the owner, not a default.
- No geo-IP beyond the `x-vercel-ip-country` / `cf-ipcountry` headers. Locally these are
  absent, so `country` is `null` in dev.
