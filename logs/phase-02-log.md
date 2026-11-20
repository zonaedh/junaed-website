# Phase 2 — Database, Auth & Admin Shell

**Dates:** 2026-11-20
**Agent:** saffron
**Status:** Complete (code + verification). Database migrations pending a live DATABASE_URL.

---

## 1. What This Phase Delivered

| Area | Files | State |
| --- | --- | --- |
| Database schema (19 tables) | `src/db/schema.ts` | Written, typechecked |
| Drizzle config | `drizzle.config.ts` | Written |
| Lazy DB client | `src/db/index.ts` | Written |
| Env validation | `src/lib/env.ts` | Written |
| Password hashing (Argon2id) | `src/lib/auth/password.ts` | Written + tested |
| Session management | `src/lib/auth/session.ts` | Written |
| TOTP 2FA | `src/lib/auth/totp.ts` | Written |
| Login lockout | `src/lib/auth/lockout.ts` + `lockout-policy.ts` | Written + tested |
| RBAC | `src/lib/rbac.ts` + `role-hierarchy.ts` | Written + tested |
| Audit log writer | `src/lib/audit.ts` | Written |
| Encryption (AES-256-GCM) | `src/lib/security/encryption.ts` | Written |
| IP hashing | `src/lib/security/hash.ts` | Written |
| Login action + form | `src/app/admin/(auth)/login/` | Working |
| Admin shell + sidebar | `src/components/admin/admin-shell.tsx` | Working |
| Dashboard | `src/app/admin/(panel)/dashboard/` | Working |
| 2FA enrolment | `src/app/admin/(panel)/account/2fa/` | Working |
| 13 section placeholders | `src/app/admin/(panel)/*/` | No 404s |
| Seed script | `src/db/seed.ts` | Written, needs DB |

---

## 2. Verification (exact commands and results)

```
npm run lint       -> clean, 0 errors 0 warnings
npm run typecheck  -> clean
npm run test       -> 6 files, 47 tests passed
npm run build      -> passed, 25 routes + proxy
npm audit          -> 0 vulnerabilities
```

Browser verification (localhost:3000, Next dev):
- `/admin/login` renders, 0 console errors.
- Submitting the form with no database returns "Sign-in is temporarily unavailable."
  The server log records the real cause. No stack trace reaches the browser.
- `Host: admin.junaedhossain.com` -> `x-robots-tag: noindex, nofollow, noarchive, nosnippet`
- `Host: junaedhossain.com` + `/admin` -> 404
- `Host: admin.junaedhossain.com` + `/dashboard` -> 307 to `/login`
- `Host: admin.junaedhossain.com` + `/robots.txt` -> `Disallow: /`

---

## 3. Bugs Found And Fixed In This Phase

These are the ones worth remembering. Each was found by running the thing, not by reading it.

### B1. Client bundle pulled the database into the browser
`admin-shell.tsx` is a Client Component and imported `ROLE_LABELS` from `@/lib/rbac`,
which imports `@/lib/auth/session`, which imports the Postgres driver. The build failed
with a module-not-found for `postgres` in the Client Component Browser trace.
**Fix:** the pure role data lives in `src/lib/role-hierarchy.ts`; the client imports
from there. `rbac.ts` re-exports it for server code.
**Rule:** a `"use client"` file may only import from modules with no server dependencies.

### B2. `next build` required a live database
The DB client created its pool at import time and threw when `DATABASE_URL` was absent.
`next build` imports every route to collect page data, so a build could not run without
production credentials — CI and preview deploys would have failed.
**Fix:** `src/db/index.ts` now exposes a lazy Proxy that connects on first query, plus
`closeDb()` for scripts. Importing the module has no side effects.

### B3. Every first-step login failed validation (silent, would have shipped)
`formData.get("totp")` returns `null` for an absent field. Zod's `.optional()` accepts
`undefined` but rejects `null`, so the whole login schema failed before the database was
touched. The user saw "Email or password is incorrect." — indistinguishable from a real
wrong password. The action returned in 4 ms, which is what gave it away.
**Fix:** `.nullish()` plus a transform mapping `null`/`""` to `undefined`.
**Pinned by:** `src/lib/validation/auth.test.ts` (5 tests).

### B4. A missing env var leaked a stack trace into the browser
With no `.env.local`, `hashIp()` threw during login and Next surfaced the full stack,
including file paths and the names of the missing variables.
**Fix:** the login action wraps all infrastructure access in a try/catch, logs the real
error server-side, and returns a generic message. AGENTS/security rule: no stack traces
in production responses.

### B5. The admin panel was unreachable in local development
The proxy 404s `/admin` on any non-admin host. On localhost there is no admin subdomain,
so the panel could not be opened at all.
**Fix:** loopback hosts (`localhost`, `127.0.0.1`, `::1`) get a pass-through for `/admin`,
still carrying the noindex header. Real domains keep the 404.
**Pinned by:** 3 tests in `src/proxy.test.ts`.

### B6. otplib v13 removed the `authenticator` object
The installed otplib is v13, which is a functional API (`generateSecret`, `generateURI`,
`verifySync`). The v12 `authenticator.keyuri()` call did not exist.
**Fix:** `src/lib/auth/totp.ts` rewritten against the real v13 surface.

---

## 4. Decisions Made

- **D-018:** Database client is lazily initialised via a Proxy. A build must never need
  a live database.
- **D-019:** Pure logic (role hierarchy, lockout policy) is split from DB-touching code
  so it can be unit-tested without a database. This is now the pattern for new modules.
- **D-020:** `/admin` is reachable on loopback only. Production behaviour is unchanged.
- **D-021:** Login failures are generic for every cause except lockout (which names a
  wait time). Infrastructure failures get their own message and are logged server-side.

---

## 5. What Is NOT Done

- **No migrations have been generated or run.** `npm run db:generate` needs a real
  `DATABASE_URL` in `.env.local`. The schema is written and typechecks; it has never
  touched a database.
- **No seed has run.** The owner account does not exist yet.
- **2FA enrolment has never been exercised end to end**, because that needs a real user
  row and a real database.
- **Session creation, lockout persistence and audit writes are untested against a live
  database.** The pure logic is tested; the SQL is not.
- **No password reset flow.** Noted in the login form copy as "ask the owner".
- **Phase 2.5 items** (disable 2FA, regenerate recovery codes) are not built.

---

## 6. Exact Next Step

Put a Neon `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into `.env.local`, then:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

Then open `http://localhost:3000/admin/login`, sign in with the seeded owner, and
complete 2FA enrolment at `/admin/account/2fa`. That is the first real end-to-end proof
of Phase 2.
