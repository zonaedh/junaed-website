# DECISIONS.md
Short decision records. Don't re-debate "Accepted" items without the user's approval.
Format: **ID · Title · Status · Date** → Decision → Why → Trade-off.

---

**D-001 · Hosting on Vercel, Namecheap only for backups · Accepted**
Decision: Run Next.js + admin on Vercel Hobby. Namecheap cPanel stores encrypted backups via SFTP.
Why: Namecheap shared hosting cannot run server-side Next.js. Trade-off: Hobby tier is non-commercial; 10s function limit.

**D-002 · Single Next.js app, host-based routing · Accepted**
Decision: One repo/app; proxy routes `admin.` host to `(admin)` and root to `(site)`.
Why: Shared code, one deploy. Trade-off: shared blast radius → strict proxy + tests.

**D-003 · Neon Postgres + Drizzle · Accepted**
Why: Serverless-friendly; Namecheap MySQL not reliably reachable from Vercel.

**D-004 · Cloudflare R2 for media · Accepted**
Why: Vercel filesystem is ephemeral. 10 GB free, S3-compatible.

**D-005 · Custom auth (Argon2id + sessions + TOTP) · Accepted**
Why: Full server-side control, no tokens in browser storage.

**D-006 · Upstash Redis for rate limiting/IP block cache · Accepted**

**D-007 · Resend + React Email · Accepted** (user requirement)

**D-008 · Tiptap editor for posts/pages · Accepted**

**D-009 · First-party analytics + optional GA4 Data API · Accepted**

**D-010 · Math captcha (signed token) + honeypot + time check · Accepted** (user requirement)

**D-011 · Backup: weekly via GitHub Actions, keep last 3, hard-delete older, encrypted · Accepted (pending user confirmation of schedule)**

**D-012 · Admin never indexed: header + meta + robots + no sitemap · Accepted**
Implemented in Phase 1 as `src/proxy.ts`: every admin-host response carries
`X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`, the admin host serves
`Disallow: /` robots.txt, admin routes are absent from the public sitemap, and
`/admin*` returns 404 on the public host. Verified with curl (see phase-01 log).

**D-013 · Next.js 16.4 + Tailwind v4; Cache Components disabled · Accepted · 2026-11-20**
Decision: `create-next-app` installed Next.js 16.4.6 with Tailwind v4 and enabled
`cacheComponents` + `partialPrefetching` by default. Both flags are turned **off**
in `next.config.ts`.
Why: Cache Components requires every dynamic read to sit under a Suspense
boundary or be explicitly cached. The admin panel is entirely dynamic (session
cookies, per-user DB reads) and Phase 1's public pages are static. Enabling it
now would add a large class of prerender errors for zero benefit.
Trade-off: We do not get partial prerendering yet. Revisit in Phase 7 when the
dashboard exists and we know which shells are worth caching.

**D-014 · Middleware is now `proxy.ts` (Next.js 16 rename) · Accepted · 2026-11-20**
Decision: Host routing and admin headers live in `src/proxy.ts` exporting
`proxy()`, not `middleware.ts`.
Why: Next.js 16 renamed Middleware to Proxy; `middleware.ts` is the legacy name.
Trade-off: Any older tutorial or snippet using `middleware.ts` will not apply.

**D-015 · Vitest 5 for unit tests · Accepted · 2026-11-20**
Decision: `vitest@5` + `vite` as dev dependencies, config at `vitest.config.mts`.
Why: `vitest@3` pulled `tinypool` with two critical advisories (prototype
pollution → RCE). `npm audit` is clean at vitest 5.
Trade-off: Installed with `--legacy-peer-deps` because of a peer-range conflict;
`vite` is declared explicitly so the runner resolves. Revisit when vitest ships
peer ranges matching our toolchain.

**D-016 · Zod for all server-side validation · Accepted · 2026-11-20**
Decision: `zod@4` schemas in `src/lib/validation/*`, parsed on the server in
every Server Action. Client-side checks are convenience only.
Why: AGENT_GUIDE §5 requires server-side validation of all input; one schema
shared by both sides avoids drift.

**D-017 · Contact form is validation-only until Phase 5 · Accepted · 2026-11-20**
Decision: `submitContact` validates, checks the honeypot and enforces a 3s
minimum fill time, then logs to the server console. It does **not** persist,
email, or notify anyone yet, and the UI says "received", not "sent".
Why: Rate limiting, captcha, DB and Resend are Phase 5 scope. Shipping a form
that silently drops messages while claiming delivery would be a lie.
Trade-off: The form is not usable in production until Phase 5. This is recorded
in HANDOFF.md as a launch blocker.

<!-- Add new decisions below -->

---

## D-018 — Database client is lazily initialised

**Date:** 2026-11-20
**Status:** Accepted

**Context.** `next build` imports every route module to collect page data. The original
`src/db/index.ts` created the Postgres pool at import time and threw if `DATABASE_URL`
was missing, so a build could not run without production credentials. CI and Vercel
preview deploys would both have failed.

**Decision.** `db` is a Proxy that creates the pool on first property access. `closeDb()`
is exported for scripts (seed, migrations). Importing `@/db` has no side effects.

**Consequences.** Builds never need a database. A missing `DATABASE_URL` now surfaces on
the first query instead of at import, so callers must handle it — the login action does
(see D-021). Never reintroduce top-level connection code.

---

## D-019 — Pure logic is split from database-touching code

**Date:** 2026-11-20
**Status:** Accepted

**Context.** The first RBAC and lockout tests imported the real modules, which pulled in
the Postgres driver and failed without a database. Tests that need a database to run are
tests that stop being run.

**Decision.** Rules live in dependency-free modules (`role-hierarchy.ts`,
`lockout-policy.ts`). The DB-touching modules (`rbac.ts`, `lockout.ts`) import and
re-export them.

**Consequences.** The security rules are unit-tested on every run with no infrastructure.
This is the pattern for any new module that mixes policy with persistence.

---

## D-020 — `/admin` is reachable on loopback only

**Date:** 2026-11-20
**Status:** Accepted

**Context.** The proxy 404s `/admin` on any non-admin host. Locally there is no admin
subdomain, so the admin panel could not be opened at all — the whole phase was
unverifiable in a browser.

**Decision.** Loopback hosts (`localhost`, `127.0.0.1`, `::1`) pass `/admin` through,
still carrying the noindex header. Every other host keeps the 404.

**Consequences.** The panel is developable locally. Production behaviour is unchanged and
pinned by tests. The loopback branch cannot run in production: a deployed request always
carries the real domain in the Host header.

---

## D-021 — Login errors are generic except for lockout and infrastructure

**Date:** 2026-11-20
**Status:** Accepted

**Context.** Two failure modes needed separating. A wrong password must not reveal
whether an account exists. A broken deployment must not show a stack trace to a visitor,
but must be loud in the logs.

**Decision.** Every credential failure returns "Email or password is incorrect." Lockout
names a wait time, because that is actionable and does not reveal account existence.
Infrastructure failures return "Sign-in is temporarily unavailable." and log the real
error server-side.

**Consequences.** No stack trace, file path or missing-variable name can reach a browser
through the login path. Any new action that touches the database or a secret must follow
the same shape.

---

## D-022 — Local dev database is PGlite behind the real `pg` driver

**Date:** 2026-11-20
**Status:** Accepted

**Context.** Phase 3's definition of done is "change it in admin, see it live in
seconds". That cannot be verified without a database. No Docker, no Postgres server
and no `psql` were available on the machine, and the Neon project was not created
yet. Building Phase 3 blind would have produced unverifiable work.

**Decision.** `scripts/db-local.ts` runs PGlite (PostgreSQL compiled to WebAssembly)
and exposes it over the Postgres wire protocol on `127.0.0.1:5433`. Application code
connects with the ordinary `pg` driver, so `src/db/index.ts`, Drizzle, the schema
and every query are identical to production. Production still uses Neon — only the
connection string differs.

**Why `pg` and not `postgres`.** Both work against Neon. Only `pg` sends enum
parameters correctly through PGlite's socket layer: the `postgres` driver produced
"unnamed prepared statement does not exist" on any query binding an enum value. One
driver everywhere means local and production run the same code path.

**Rejected alternatives.**
- *Embedded Postgres binaries* — the bundled Windows `initdb` crashes with an access
  violation in this environment, with and without spaces in the path.
- *Docker* — not installed.
- *Writing Phase 3 against the schema without a DB* — no way to prove the loop.

**Consequences.** The full schema has now been migrated and seeded against a real
Postgres for the first time, and login + 2FA are proven end to end. PGlite is
single-writer and serialises queries: fine for one developer, never for production.
It is a dev dependency and is never imported by application code. Data lives in
`.pglite/` (gitignored).

---

## D-023 — Login redirects are host-aware

**Date:** 2026-11-20
**Status:** Accepted

**Context.** Login redirected to `/dashboard`, which only resolves on the admin host
because the proxy rewrites it into the admin tree. On loopback there is no rewrite, so
a successful login landed on a 404. Logout had the same defect with `/login`.

**Decision.** The login action, the logout action and the login page each detect the
host the same way the proxy does and redirect to `/admin/...` on loopback,
`/...` everywhere else.

**Consequences.** Login and logout work on both the admin host and localhost. The
duplication is three small copies of one host check; if a fourth caller appears it
should move into a shared helper.

---

## D-024 — Admin links and redirects are host-aware

**Date:** 2026-11-21
**Status:** Accepted

**Context.** Every admin nav link and every `requireRole()` redirect was
root-absolute (`/settings`, `/login`, `/dashboard`). That is correct on the
admin host, where the proxy rewrites those paths into the admin tree. On loopback
there is no rewrite, so the entire panel 404'd the moment you clicked anything —
including the sidebar, which made the Phase 3 editors unreachable locally.

**Decision.** `src/lib/admin-path.ts` exposes `getAdminBase()`, which returns
`""` on the admin host and `"/admin"` on loopback. Server components and
actions use it directly; the client shell derives the same value from
`usePathname().startsWith("/admin")`. `requireRole()` in `rbac.ts` now
redirects through it, so the guard is correct on both hosts.

**Consequences.** The panel is fully navigable on localhost, which is what made
Phase 3 verifiable at all. Production URLs are unchanged: on the admin host the
base is empty and every path is exactly what it was. The client-side detection is
sound because the only way to reach an admin route on loopback is through the
`/admin` prefix.

---

## D-025 — Settings and page content are registry-driven

**Date:** 2026-11-21
**Status:** Accepted

**Context.** `settings` is key/value JSONB and `pages.content` is a JSONB
blob. Both are flexible and both rot silently: rename a key, miss one call site,
and the public site falls back to a default with no error anywhere.

**Decision.** Every setting and every page field is declared once in a registry
(`settings-registry.ts`, `pages-definitions.ts`) with its type, label,
default and max length. The admin form is generated from the registry, validation
loops over it, and the public reader resolves stored JSONB against it — coercing
each value and falling back to the documented default when a row is missing or
malformed.

**Why the registries are separate files from the readers.** The admin forms are
`"use client"`. Importing `lib/settings.ts` or `lib/pages.ts` from a client
component pulls in `@/db` and therefore `pg`, which fails the build (B1). The
registries are pure; the readers import them and add the database. This is the
same split that `role-hierarchy.ts` already uses.

**Consequences.** Adding a setting or a page field is one entry, not four
coordinated edits. A missing row renders the default instead of `undefined`. A
page saved as `draft` renders its defaults publicly, so an editor cannot leak
work in progress by accident — verified in the browser.

---

## D-026 — Revalidation uses `{ expire: 0 }`, not `"max"`

**Date:** 2026-11-21
**Status:** Accepted

**Context.** Next 16 requires a second argument to `revalidateTag`. The docs
recommend `profile="max"`, which serves stale content while revalidating in the
background for up to a year.

**Decision.** Admin writes call `revalidateTag(tag, { expire: 0 })`.

**Consequences.** The next request is a blocking revalidate, so the editor sees
their change on the very next page load. `"max"` would have been faster under
load but would have shown the old copy for an indeterminate window — unacceptable
when the phase's definition of done is "see it live within seconds". Settings and
pages are read rarely and change rarely; the blocking cost is irrelevant at this
scale.

---

## D-027 — Media storage is an adapter with a local and an R2 driver

**Date:** 2026-11-21
**Status:** Accepted

**Context.** The media library was blocked for an entire phase waiting on
Cloudflare R2 credentials. That is a bad trade: the upload pipeline, the picker,
the image fields and every usage check are identical regardless of where the
bytes land. Only the write itself depends on R2.

**Decision.** `src/lib/media/storage.ts` defines one `StorageDriver` interface
(`put`, `remove`) with two implementations. The local driver writes to
`public/uploads/`; the R2 driver uses the S3 API against the bucket. Selection
is by environment: R2 wins whenever it is configured, in every environment.
Without R2, development falls back to disk and **production throws at boot**.

**Consequences.** The library is buildable and verifiable today with no
credentials, and turning on R2 is five environment variables rather than a
rewrite. The production throw is deliberate: Vercel's filesystem is ephemeral,
so a deploy that silently accepted uploads to disk would lose every file on the
next cold start. `public/uploads/` is gitignored, and the local driver resolves
and bounds every key so a crafted filename cannot escape the uploads directory.

---

## D-028 — Uploads are re-encoded, not stored as received

**Date:** 2026-11-21
**Status:** Accepted

**Context.** A media library that stores uploaded bytes verbatim inherits every
problem the uploader brings: EXIF GPS coordinates from a phone photo, a 6 MB
JPEG used as a 480px thumbnail, and a `.jpg` that is actually a PHP script.

**Decision.** `src/lib/media/process.ts` runs every upload through `sharp`:
MIME is detected from the **file's own bytes**, not the declared type or the
extension; the image is auto-rotated, re-encoded to WebP, and a 480px thumbnail
is generated alongside it. Re-encoding drops EXIF as a side effect, which is
asserted in the tests rather than assumed.

**Consequences.** Stored files are always WebP and always safe to serve. The
original is not retained, so a future need for the source file would require
changing this. Dimensions are recorded on the row, which is what lets the public
site reserve layout space and avoid a shift on load.

---

## D-029 — A media row cannot be deleted while anything references it

**Date:** 2026-11-21
**Status:** Accepted

**Context.** Image fields store a media **id**. Deleting a row that a page still
points at leaves that page rendering a gap, with no error anywhere — the same
silent-rot failure D-025 exists to prevent, one layer down.

**Decision.** `src/lib/media/usage.ts` scans every place an id can be referenced
before a delete is permitted: page content fields declared as `image` in the
registry, settings declared as `image`, post covers and OG images, and portfolio
covers and OG images. The admin shows "Used in …" with links, and the delete
control is replaced by that explanation when usage is non-empty.

**Consequences.** Because the page scan is registry-driven, adding an image
field makes it usage-tracked automatically. Deletes are soft (`deleted_at`), so
a mistaken delete is recoverable in the database even though the UI refuses the
common case.

---

## D-030 — Blog and portfolio detail pages are dynamic; indexes are cached by tag

**Date:** 2026-11-21
**Status:** Accepted

**Context.** The first build of `/blog/[slug]` prerendered it as SSG. That
contradicts the phase's own definition of done: a post published in admin would
404 on the public site until the next deploy. The build output made the
contradiction visible, which is the only reason it was caught.

**Decision.** Detail routes (`/blog/[slug]`, `/portfolio/[slug]`) render
dynamically. Index and listing queries go through `unstable_cache` tagged
`posts` / `portfolio` (plus a per-slug tag), and admin writes call
`revalidateTag(tag, { expire: 0 })` per D-026.

**Consequences.** A newly published post is reachable immediately and its index
entry appears on the next request. The cost is a database read per detail page
view, which is the correct trade for a site at this scale and is the only way
"publish and it is live" can be true.

---

## D-031 — `unstable_cache` results are typed as serialised, not as the row

**Date:** 2026-11-21
**Status:** Accepted

**Context.** `unstable_cache` serialises its return value. A `Date` field comes
back as a string at runtime while the TypeScript type still claimed `Date`. The
type was lying, and any `.toISOString()` on it would have thrown in production
while typechecking cleanly.

**Decision.** Repository types declare the serialised shape (`publishedAt:
string | null`) and call sites format from that. The type now describes what is
actually there.

**Consequences.** Date formatting moved to the call site, which is where the
display format belongs anyway. Any future cached query returning dates must
follow the same rule.
---

## D-032 — The contact captcha is a signed stateless token

**Date:** 2026-11-21
**Status:** Accepted

**Context.** A maths captcha needs the server to know the right answer when the form
comes back, but a contact form is the last place you want a session store or a table
of pending challenges — it is anonymous, high-volume and disposable.

**Decision.** The challenge is rendered as `question + token`, where the token is an
HMAC over the answer, a nonce and an expiry, signed with `CAPTCHA_SECRET`. The server
verifies by recomputing the HMAC and checking expiry. Nothing is stored.

**Consequences.** No cleanup job, no table, no session. The trade is that a token
cannot be invalidated early, which is irrelevant for a 15-minute challenge. Rotating
`CAPTCHA_SECRET` invalidates every outstanding challenge at once.

---

## D-033 — Spam is scored and silently accepted, never rejected with a reason

**Date:** 2026-11-21
**Status:** Accepted

**Context.** The obvious implementation rejects a spammy submission with "your message
looks like spam". That tells a bot exactly which signal fired and lets it iterate.

**Decision.** The spam scorer returns a score and reasons. Above threshold the action
returns the same success response a real submission gets and stores nothing. The
visitor sees "Message received"; the bot learns nothing.

**Consequences.** A false positive is invisible to a legitimate visitor, which is the
real cost. The threshold is deliberately conservative and the keyword list is
owner-editable in Settings, so a legitimate message caught by a keyword can be
corrected without a deploy.

---

## D-034 — Notification adapters are dormant drivers, not stubs

**Date:** 2026-11-21
**Status:** Accepted

**Context.** Telegram and Resend both need credentials the owner has not supplied yet.
The choice was between stubbing the calls out and building the real integration behind
a configuration check.

**Decision.** Same pattern as the media storage adapter (D-027): the adapter is fully
implemented, and when its credentials are absent it logs and returns without throwing.
Supplying the key is the only remaining step.

**Consequences.** The contact pipeline is complete and correct today; notifications
turn on with a key and a toggle, no code change. The cost is that the live provider
path is unverified until someone supplies credentials.
---

## D-035 — Redirects are enforced by a catch-all route, not the proxy

**Date:** 2026-11-21
**Status:** Accepted

**Context.** A redirect manager needs to read the database on every request. The obvious
home for that is `proxy.ts`, which already runs on every request.

**Decision.** It is not. Next's own documentation is explicit that the proxy is not for
data fetching and that `fetch` caching options do not apply there. A catch-all route at
`src/app/(site)/[...path]/page.tsx` owns redirect lookup and 404 logging instead: it runs
in the Node runtime, can read the database, and still returns a real redirect status.

**Consequences.** Redirects cost one cached read on a miss, not on every request, because
the catch-all only runs when no real route matched. The trade is that a redirect for a
path that *does* exist as a page cannot be expressed — which is correct, since shadowing
a live page with a redirect is a mistake, not a feature.

---

## D-036 — Permanent redirects are stored and sent as 308, not 301

**Date:** 2026-11-21
**Status:** Accepted

**Context.** MVP.md asks for a 301 redirect manager. Next exposes `permanentRedirect()`
and `redirect()`, which emit 308 and 307 respectively. There is no API that sends a
literal 301.

**Decision.** Store and send 308 for permanent and 307 for temporary. The admin UI says
"Permanent (308)" and "Temporary (307)" rather than promising a code the app cannot
produce. Legacy rows holding 301/302 are still honoured on read.

**Consequences.** 308 and 301 are equally permanent for search engines, so nothing is
lost for SEO. The cost is that an owner who specifically needs a literal 301 (some
legacy crawlers, some CDN rules) cannot get one from this admin, and would need a
`next.config.ts` redirects entry instead.

---

## D-037 — The 404 log upserts on path so it ranks distinct URLs

**Date:** 2026-11-21
**Status:** Accepted

**Context.** A naive 404 log inserts a row per miss. A crawler discovering one dead link
can produce thousands of rows for a single URL, burying the other broken URLs.

**Decision.** `not_found_log` has a unique index on `path` and inserts with an upsert that
increments `hits` and moves `last_seen_at`. The admin lists distinct paths ranked by hit
count.

**Consequences.** The list answers the question the owner actually has: which URLs are
broken, and which matter most. The trade is that per-visitor detail (referrer, user agent,
time of each hit) is overwritten rather than accumulated — acceptable, because the action
this log exists to prompt is "create a redirect", not "investigate one visitor".
---

## D-038 — Pure script rules live in their own module, not in the repository

**Date:** 2026-11-21
**Status:** Accepted

**Context.** The scripts admin form is a client component and needs `scriptWarnings`
to show live warnings while the owner types. It imported them from
`src/lib/analytics/scripts.ts`, which imports `@/db`. That dragged the Postgres driver
into the browser bundle and failed the build with `Can't resolve 'util/types'` inside
`pg/lib/utils.js`.

**Decision.** The pure rules (`scriptAppliesTo`, `scriptWarnings`) live in
`src/lib/analytics/script-rules.ts`, which imports nothing. The repository keeps the
database work only. Client components import from `script-rules`; server components may
import either.

**Consequences.** One more file, and a rule to remember: a helper that a client component
needs must not sit beside database code. This is the same failure the project manual
already warns about for `@/lib/rbac`, `@/db`, `@/lib/settings`, `@/lib/pages` and
`@/lib/media/storage` — it just arrived through a new door.

---

## D-039 — Head snippets mount in the root layout, gated on the path

**Date:** 2026-11-21
**Status:** Accepted

**Context.** Custom snippets have three locations: `head`, `body_start`, `body_end`. The
public site layout renders only the two body positions, because a layout cannot render
into `<head>`. Snippets saved to `head` were silently never injected.

**Decision.** `src/app/layout.tsx` reads `x-pathname` from the proxy and renders
`CustomScripts location="head"`, skipping it entirely when the path starts with `/admin`.

**Consequences.** All three locations now work. The admin gate is checked in the root
layout rather than relying on the snippet's own `pageScope`, so a snippet scoped to `/`
still cannot reach the admin tree. The root layout is now async and reads headers, which
makes every route dynamic — already true for this app, since the public layout reads the
database on every request.
