# Phase 05 Log — Contact Pipeline & Lead Inbox
**Dates:** 2026-11-21 → 2026-11-21 · **Agent(s):** saffron · **Branch/Tag:** `main` / `phase-05-complete`

## 1. Goal
Turn the contact form from a dead end into a working pipeline: validate and gate the
submission, persist the lead, notify the owner, and give the owner an admin inbox to
read, triage, annotate and export enquiries (MVP.md §5).

## 2. What Was Built
- **Math captcha** — signed, stateless challenge token carrying its own answer and
  expiry; no server-side session needed. `src/lib/contact/captcha.ts`
- **Spam scoring** — pure function over links, banned keywords, repeated-character runs,
  shout-case ratio and contact-detail flooding; returns a score and reasons.
  `src/lib/contact/spam.ts`
- **Rate limiter** — Upstash REST when configured, in-memory sliding window fallback in
  dev, so the gate is real locally without a Redis account.
  `src/lib/contact/rate-limit.ts`
- **Notification adapters** — Telegram and Resend (owner alert + visitor auto-reply),
  both dormant and no-op when their credentials are absent.
  `src/lib/contact/notify.ts`
- **Lead repository** — create, dedupe by message hash, filtered list, status, notes,
  delete, export query. `src/lib/leads/repository.ts`
- **Contact action wired end to end** — honeypot → fill-time → captcha → rate limit →
  spam score → persist → notify, with per-field errors echoed back and a fresh
  challenge issued on failure. `src/app/(site)/contact/actions.ts`
- **Form UI** — captcha field, phone field, values preserved on error.
  `src/components/site/contact-form.tsx`
- **Admin inbox** — list with status filters, search, unread badge in the sidebar;
  detail page with status controls and private notes; CSV export.
  `src/app/admin/(panel)/leads/**`, `src/components/admin/admin-shell.tsx`
- **Settings** — spam keyword list, Telegram toggle, email toggle added to the registry
  (form, validation and public read follow automatically per D-025).
  `src/lib/settings-registry.ts`

## 3. Database / Config Changes
- Migrations: none new — the `leads` table already existed in `drizzle/0000_late_saracen.sql`.
- New env vars (names only, `.env.example` updated):
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`,
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `CAPTCHA_SECRET`.
  All optional; every subsystem degrades to a working local fallback without them.

## 4. Decisions Made
- D-032 — captcha is a signed stateless token, not a session store.
- D-033 — spam is scored and silently accepted, never rejected with a reason.
- D-034 — notification adapters are dormant drivers, same pattern as R2 (D-027).

## 5. Test Results
| Check | Result |
|---|---|
| lint | pass |
| typecheck | pass |
| tests | 146 passed / 146 (10 files) |
| build | pass — `/admin/leads`, `/admin/leads/[id]`, `/admin/leads/export` all compiled |
| Security checks | captcha rejection verified, spam blocked and not stored, rate limit in place, RBAC on every admin route, export requires session |
| Manual QA | full browser run, see §9 |

## 6. Deviations From Plan
- Three Phase 5 sub-systems need credentials the owner has not supplied (Resend,
  Upstash, Telegram). Built as real adapters with dormant drivers rather than stubs,
  so supplying a key is the only remaining step. Same call as R2 in Phase 3.
- Added a phone field to the schema; MVP.md listed it as optional and the inbox needed
  it to be useful for callbacks.

## 7. Known Issues / Tech Debt
- In-memory rate limiter is per-process: correct for dev, insufficient for a
  multi-instance production deploy. Upstash must be configured before launch.
- Email and Telegram notifications are untested against live providers (no keys).
- No pagination on the leads list yet; fine at current volume, needed past a few
  hundred rows.

## 8. Manual Steps Done By User
- None required for this phase. To activate notifications later: add `RESEND_API_KEY`
  and/or `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, then enable the matching toggle in
  Settings → Contact.

## 9. How To Test This Phase
1. `npm run db:local`, then `npm run dev`.
2. Open `/contact`, fill the form, answer the maths question, submit → "Message received".
3. Submit again with a wrong captcha → rejected, values preserved, new question issued.
4. Submit a message stuffed with links → accepted silently, nothing stored.
5. Sign in at `/admin/login`, open **Leads** → the real lead is listed, badge shows unread.
6. Open the lead → change status, save a note.
7. Click **Export CSV** → downloads with all columns including phone and notes.

Verified in a browser this session: lead persisted with IP hash and message hash,
status change and notes persisted, export returned `200 text/csv` with the correct
attachment filename.

## 10. Next Phase Starting Notes
1. Phase 6 is analytics and SEO — read MVP.md §6 before touching anything.
2. Upstash should be configured before any real traffic; the in-memory limiter will not
   hold across instances.
3. The notification adapters are ready — supplying keys is the whole job.
