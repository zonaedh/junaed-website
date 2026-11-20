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
