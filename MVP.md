# MVP.md — junaedhossain.com Portfolio + Admin Panel

**Public site:** `junaedhossain.com`
**Admin panel:** `admin.junaedhossain.com` (noindex, never in Google)
**Stack:** Next.js (App Router) · TypeScript · Tailwind · Postgres · Vercel (Hobby) · GitHub Actions · Namecheap (cPanel backup storage)

---

## 0. Review of your `junaed_hossain.html`

### What is good (keep it)
- Clean violet design system already defined as CSS variables (`--violet-50…950`, `--ink`, `--muted`, `--line`, `--radius:24px`).
- Fonts: **Inter** (body) + **Manrope** (headings). Good pairing.
- Sections: Hero → Services (4 cards) → Portfolio (3 cards) → About → CTA → Contact → Footer.
- Reveal-on-scroll animation, mobile menu toggle, semantic `<header>/<main>/<nav>/<footer>`, `aria-label`s.

### What must change for production
| Issue in current file | Fix in Next.js build |
|---|---|
| Single page with `#anchors` | Separate real routes: `/`, `/services`, `/portfolio`, `/about`, `/blog`, `/contact` |
| Hero image is a CSS placeholder (`.portrait-placeholder`) | `<Image>` fed from admin-editable media field |
| About panel is a text "JH." block | Editable About image + text |
| Portfolio is 3 hard-coded mock cards | Database-driven, add/edit/delete, each with its own case-study page |
| Contact form is JS-only (`preventDefault`) | Server Action + DB + Telegram + Resend + math captcha + rate limit |
| `mailto:hello@example.com` placeholder | Real email from Site Settings |
| No canonical, OG, Twitter, JSON-LD, sitemap, robots | Full SEO layer (Phase 6) |
| Google Fonts via CDN link | `next/font` (self-hosted, no layout shift, better privacy/perf) |
| Copyright year via JS | Rendered server-side |
| Inline styles (`style="color:var(--violet-600)"`) | Tailwind tokens / component props |
| No tracking, no consent | Server-injected tracking + consent banner |

---

## 1. Key Architecture Decisions

> **Important:** Namecheap shared hosting **cannot run Next.js server-side properly**. So:
> **Vercel runs the website + admin. Namecheap/cPanel is used only as backup storage.** This matches your plan.

| Concern | Decision | Why |
|---|---|---|
| Hosting | Vercel Hobby, **one Next.js app**, host-based routing via middleware (`admin.` → `/(admin)`, root → `/(site)`) | One repo, one deploy, shared code. Use two Vercel domains on the same project. |
| Database | **Neon Postgres** (free tier) + **Drizzle ORM** | Serverless-friendly. Namecheap MySQL is not reachable reliably from Vercel (dynamic IPs). |
| Media storage | **Cloudflare R2** (free 10 GB, S3 API) | Vercel's filesystem is read-only/ephemeral, so uploads cannot be saved locally. |
| Auth | Custom session auth: **Argon2id** + httpOnly/Secure/SameSite cookies + **TOTP 2FA** | Everything server-side, no tokens in browser storage. |
| Rate limit | **Upstash Redis** (free) | Works across serverless instances. |
| Email | **Resend** + **React Email** (HTML templates) | Your requirement. |
| Editor | **Tiptap** (WordPress-like block/rich editor) | Clean, extensible, outputs JSON/HTML. |
| Analytics | First-party lightweight tracker (own DB) + GA4 Data API for charts | Dashboard works even if ad-blockers block GA. |
| Backups | **GitHub Actions** (weekly) → `pg_dump` → encrypt → SFTP to cPanel → retention cleanup | Vercel Hobby cron is too limited/10s timeout. |
| Captcha | Server-signed math challenge (e.g. `2 + 4 = ?`) + honeypot + time check | No third-party, no cookies. |

**Note on Vercel Hobby:** Terms limit Hobby to non-commercial use. A personal portfolio is fine; if the site starts generating client business directly, consider Vercel Pro. Function limit is ~10s, so no heavy jobs in request handlers.

**Security rule applied everywhere:** all data reads/writes happen in Server Components, Server Actions or Route Handlers. No DB credentials, API keys or secrets ever reach the browser. Only the tracking IDs (GA/GTM/Pixel/Clarity) are public by nature.

---

## 2. Repository Structure

```
junaedhossain/
├─ .github/workflows/
│  ├─ ci.yml                 # lint, typecheck, test, build on PR
│  ├─ backup-weekly.yml      # DB dump → cPanel
│  └─ db-migrate.yml         # manual/prod migrations
├─ src/
│  ├─ app/
│  │  ├─ (site)/             # junaedhossain.com
│  │  │  ├─ page.tsx                 # Home
│  │  │  ├─ services/[slug]/page.tsx
│  │  │  ├─ portfolio/[slug]/page.tsx
│  │  │  ├─ blog/[slug]/page.tsx
│  │  │  ├─ about/ contact/ privacy-policy/ terms/ thank-you/
│  │  │  ├─ sitemap.ts  robots.ts  rss.xml/route.ts
│  │  ├─ (admin)/            # admin.junaedhossain.com
│  │  │  ├─ login/ dashboard/ pages/ posts/ media/ portfolio/
│  │  │  ├─ leads/ analytics/ seo/ email/ scripts/ settings/
│  │  │  ├─ staff/ security/ backups/ activity/
│  │  ├─ api/ (track, health, cron-safe endpoints)
│  ├─ components/ (ui, site, admin, widgets)
│  ├─ db/ (schema.ts, migrations, seed.ts)
│  ├─ lib/ (auth, rbac, ratelimit, captcha, spam, telegram, resend, seo, storage, audit)
│  ├─ emails/ (contact-received, lead-autoreply, staff-invite, password-reset, alert)
│  └─ middleware.ts
├─ scripts/backup/ (dump.sh, upload.sh, retention.sh)
├─ MVP.md
└─ .env.example
```

---

## 3. Database Schema (core tables)

| Table | Key fields |
|---|---|
| `users` | id, name, email, password_hash, role, totp_secret(enc), is_active, last_login_at |
| `sessions` | id, user_id, token_hash, ip, user_agent, expires_at |
| `pages` | id, key (`home`,`about`,`contact`…), title, content (JSON blocks), seo fields, status |
| `posts` | id, title, slug, excerpt, content, cover_media_id, category_id, status (draft/scheduled/published), published_at, seo fields |
| `categories`, `tags`, `post_tags` | taxonomy |
| `portfolio_items` | id, title, slug, summary, content, cover_media_id, gallery, client, tags, sort_order, status |
| `services` | id, title, slug, icon, summary, content, sort_order, status |
| `media` | id, key, url, mime, size, width, height, alt, title, caption, folder |
| `leads` | id, name, email, phone?, message, status (new/read/replied/spam/archived), ip_hash, ua, source_page, created_at |
| `settings` | key, value (JSON) — site name, tagline, logo, favicon, contact info, socials, widget config, email config |
| `scripts` | id, location (`head`/`body_start`/`body_end`), name, code, is_active |
| `blocked_ips` | id, ip/CIDR, reason, created_by, expires_at |
| `activity_logs` | id, user_id, action, entity, entity_id, meta, ip, created_at |
| `page_views` | id, path, referrer, country, device, browser, visitor_hash, session_hash, created_at |
| `alerts` | id, type, severity, message, is_read, created_at |
| `redirects` | id, from_path, to_path, code (301/302) |
| `backups_log` | id, filename, size, status, created_at |

---

## 4. Roles & Permissions (Staff accounts)

| Role | Access |
|---|---|
| **Owner** | Everything, incl. staff, security, backups, scripts, clear logs |
| **Admin** | All content, leads, SEO, analytics, settings (no owner/staff-delete, no backups) |
| **Editor** | Pages, posts, portfolio, media, SEO fields |
| **Support** | Leads + read-only dashboard |

Permission checks are enforced **server-side in every action** (`requireRole()`), never by hiding UI only.

---

# PHASES

Each phase ends with a **deployable, testable** result. Don't start the next phase until the acceptance checklist passes.

---

## Phase 0 — Foundations (½–1 day)

**Tasks**
- [ ] Create GitHub private repo `junaedhossain` (branch protection on `main`, require CI).
- [ ] Create Vercel project linked to GitHub. Add domains `junaedhossain.com` + `admin.junaedhossain.com`.
- [ ] Namecheap DNS: `A` → `76.76.21.21` (root), `CNAME admin` → `cname.vercel-dns.com`, `CNAME www` → `cname.vercel-dns.com`. Redirect `www` → root.
- [ ] Create accounts: Neon, Cloudflare R2, Upstash, Resend, Telegram (BotFather).
- [ ] Verify domain in Resend (SPF, DKIM, DMARC records on Namecheap).
- [ ] Enable 2FA on GitHub, Vercel, Namecheap, Neon, Cloudflare.
- [x] `.env.example` committed; real secrets only in Vercel + GitHub Secrets.

**Done when:** blank Next.js app loads on both domains over HTTPS.

---

## Phase 1 — Project Setup + Public Site Port (2–3 days)

**Goal:** Pixel-faithful version of your HTML as real Next.js pages, still with static/seed content.

**Tasks**
- [x] `create-next-app` (TypeScript, Tailwind, ESLint, App Router, `src/`).
- [x] Move CSS variables into Tailwind theme (`violet-50…950`, `ink`, `muted`, `line`, radius 24px).
- [x] `next/font` for Inter + Manrope.
- [x] Build shared components: `Header`, `Footer`, `Button`, `Eyebrow`, `SectionHead`, `ServiceCard`, `ProjectCard`, `Reveal` (IntersectionObserver), `MobileMenu`.
- [x] Individual pages (menu items are **separate pages**):
  - [x] `/` Home (hero, services preview, featured portfolio, about teaser, CTA)
  - [x] `/services` + `/services/[slug]` (Digital Marketing, SEO, Graphic Design, WordPress Customization)
  - [x] `/portfolio` + `/portfolio/[slug]`
  - [x] `/about`
  - [x] `/blog` + `/blog/[slug]`
  - [x] `/contact`
- [x] Essential pages: `/privacy-policy`, `/terms`, `/thank-you`, custom `404`, `500`.
- [x] Middleware: host-based routing (`admin.` subdomain → admin routes; blocks admin paths on root domain and vice versa).
- [x] Respect `prefers-reduced-motion`, keyboard focus states, 44px tap targets.

**Done when**
- Every menu link is a real URL; Lighthouse ≥ 95 Performance/Accessibility/Best-Practices on mobile.
- Visual match with `junaed_hossain.html` on desktop/tablet/mobile.

> **Status note (2026-11-20):** all tasks done except the Lighthouse measurement,
> which needs a deployed URL. Deferred to the first Vercel deploy. See `logs/phase-01-log.md`.

---

## Phase 2 — Database, Auth & Admin Shell (3–4 days)

**Goal:** Secure login and a clean admin layout.

**Tasks**
- [x] Drizzle schema + migrations + seed script (creates Owner from env, seeds default pages/services).
      Schema + seed written; **migrations not generated** — needs a live DATABASE_URL.
- [x] Auth: Argon2id hashing, session table, httpOnly+Secure+SameSite=Strict cookie, 7-day sliding expiry, logout-all-devices.
- [x] **TOTP 2FA** (QR setup, recovery codes) — mandatory for Owner/Admin.
      Enrolment built; not yet exercised end to end (no database).
- [x] Login protection: 5 failed attempts → 15 min lockout (per email; per-IP lands in Phase 8 with Upstash), generic error messages.
- [ ] Password reset via Resend (single-use, 30 min token). **Deferred to Phase 5** — needs Resend, which is not configured. Login copy says "ask the owner".
- [x] RBAC helper `requireRole()` used in every server action.
- [~] Admin layout: collapsible sidebar, topbar (search, alerts bell, profile), breadcrumbs, toasts, dark/light toggle, mobile-friendly.
      Sidebar (collapsible + mobile drawer), topbar with profile and sign-out: **done**.
      Search, alerts bell, breadcrumbs, toasts, dark/light toggle: **not built** — deferred to Phase 7/8 where they have data to show.
- [~] Admin design language: same violet palette, neutral surfaces, 8px grid, max 2 font weights, consistent form components (Input, Select, Switch, Tabs, Modal, Table, EmptyState).
      Palette, typography and form styling: **done**. Shared Input/Select/Switch/Tabs/Modal/Table/EmptyState components: **not built** — build them in Phase 3 when the first real editor needs them.
- [x] **Noindex everywhere on admin:**
  - `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` header via middleware for the admin host.
  - `<meta name="robots" content="noindex,nofollow">` in admin layout.
  - Admin host `robots.txt` → `Disallow: /` (note: robots.txt alone doesn't prevent indexing; the header does).
  - Admin routes **excluded** from sitemap; no public links to admin.
  - Optional: Vercel firewall rule / IP allowlist for `/login` later.

**Done when:** owner can log in with 2FA, roles are enforced, and `curl -I admin.junaedhossain.com` shows the noindex header.

---

## Phase 3 — CMS Core: Pages, Settings, Media (4–5 days)

### 3.1 Media Library (WordPress-style)
- [ ] Upload (drag & drop, multi-file) → server validates type/size (jpg, png, webp, avif, svg-sanitized, pdf), strips EXIF, **sharp** converts to WebP + generates thumbnails → stores in R2.
- [ ] Grid/list view, search, filter by type/date, folders (optional), bulk delete.
- [ ] Edit panel: alt text, title, caption, rename, replace file, copy URL, usage info ("used in…").
- [ ] **Media picker modal** reused by every image field (hero, about, blog cover, portfolio, OG image, logo, favicon).
- [ ] Block deletion of media currently in use (or warn).

### 3.2 Site Settings
- [ ] Tabs: **General** (site name, tagline, description, logo, favicon, timezone) · **Contact** (email, phone, address, WhatsApp) · **Social** links · **Branding** (primary color, optional) · **Footer** text · **Maintenance mode**.
- [ ] Settings cached with `revalidateTag('settings')`; changes reflect instantly.

### 3.3 Editable Page Content
Each page is built from **typed sections** with a form per section (not free-form HTML, so design can't break).

| Page | Editable fields |
|---|---|
| **Home** | Hero eyebrow, H1 (+highlight word), paragraph, CTA buttons, **hero image (left/portrait) via media picker**, floating cards text, services intro, portfolio intro, CTA box |
| **About** | Heading, story (rich text), **about image**, quote, skills/stats, CTA |
| **Services** | Intro + each service (title, icon, summary, full content, SEO) |
| **Contact** | Heading, text, contact details, form labels, success message |
| **Privacy / Terms** | Rich text |
| **Header/Footer** | Menu items (order, label, URL, show/hide), footer links, copyright |

- [ ] Live preview button (opens draft in new tab with signed preview token).
- [ ] Draft / Published status, "last edited by".

**Done when:** you can change hero image, about image, and any text from admin and see it live on the site within seconds.

---

## Phase 4 — Blog & Portfolio (3–4 days)

### 4.1 Blog (WordPress-like single post editor)
- [ ] Posts list: search, status filter, bulk actions, quick edit.
- [ ] **Single post editor** (Tiptap):
  - Title, auto-slug (editable), rich text with H2–H4, lists, quote, code, table, image (media picker), embed (YouTube), callout, divider.
  - Right sidebar: Status (Draft / Scheduled / Published) · Publish date · Category · Tags · Featured image · Excerpt · Author.
  - **SEO box** (see Phase 6): meta title, meta description, canonical, OG image, noindex toggle, live Google snippet preview, SEO checklist score.
  - Autosave draft every 30s, revision history (last 10), "Preview", "Update".
  - Reading time + word count auto-calculated.
- [ ] Categories & tags management.
- [ ] Public: `/blog` (pagination), `/blog/[slug]`, `/blog/category/[slug]`, table of contents, related posts, share buttons, author box.
- [ ] Scheduled publishing: a **GitHub Action every 15 min** (or Vercel daily cron + on-demand check) publishes due posts and revalidates.

### 4.2 Portfolio (add / delete / edit)
- [ ] List with drag-to-reorder, status, featured toggle.
- [ ] Item form: title, slug, category/tags, client, year, summary, cover image, gallery, results/metrics, rich-text case study, external link, SEO box.
- [ ] Delete with confirmation (soft-delete to Trash 30 days, then purge).
- [ ] Public `/portfolio` with category filter and `/portfolio/[slug]` case-study page.
- [ ] Home page "Selected work" pulls items flagged *Featured*.

### 4.3 Services
- [ ] Same pattern (add/edit/reorder) so you can add services later without code.

**Done when:** you can create, schedule and publish a blog post and portfolio item end to end, with images from the media library.

---

## Phase 5 — Contact, Leads, Notifications (3 days)

### 5.1 Contact form (server-side)
- [ ] Fields: name, email, (phone optional), service interested, message.
- [ ] **Math captcha:** server generates e.g. `2 + 4`, stores answer in a **signed, short-lived (10 min) token**; user answers; server verifies. Randomize operands/operators (+ and −, small numbers). Refresh button.
- [ ] Extra layers: hidden **honeypot** field, **minimum fill time** (≥3 s), Zod validation, max lengths, strip HTML.
- [ ] **Rate limit:** 3 submissions / 10 min / IP, 10 / day / IP (Upstash).
- [ ] **Spam filter:** link count limit, banned keyword list (editable in admin), disposable email domain check, repeated-message hash detection, blocked IPs.
- [ ] On success → save lead → redirect `/thank-you` (also fires conversion events).

### 5.2 Leads tab
- [ ] Table: date, name, email, status, source page; filters, search, pagination.
- [ ] Lead detail: message, metadata (IP hash/country/device, referrer), internal notes, status change (New → Read → Replied → Archived / Spam).
- [ ] Actions: reply via email (Resend) from admin, mark spam + block IP, delete, **export CSV**.
- [ ] Unread count badge in sidebar.

### 5.3 Telegram bot notification
- [ ] Bot token + chat ID stored as encrypted env/secret (never client-side).
- [ ] Message on new lead: name, email, message preview, source, "Open in admin" link.
- [ ] Also sends: critical alerts (login from new IP, repeated failed logins, backup failed, spam spike).
- [ ] Settings → Notifications: toggle each event type + "Send test message".

### 5.4 Email tab (Resend)
- [ ] Settings: API key (server env), from name/email, reply-to, admin recipient list.
- [ ] **HTML email templates** (React Email): new-lead (to you), auto-reply (to visitor), staff invite, password reset, alert.
- [ ] Template editor: subject, preheader, header/footer, brand color, logo; preview + send test.
- [ ] Email log (sent/failed, error message).

### 5.5 Floating contact widgets
- [ ] Configurable in admin: enable/disable, position (left/right), WhatsApp number + prefilled message, Phone, Email, Telegram/Messenger link, "Book a call" link, colors, show/hide on specific pages, show-on-scroll delay.
- [ ] Accessible, doesn't cover content on mobile, no CLS, tracked as click events.

**Done when:** a test submission appears in Leads, arrives in Telegram and Resend, and bots/spam are rejected.

---

## Phase 6 — Strong On-Page SEO (3 days)

### 6.1 Technical SEO (automatic)
- [ ] `generateMetadata()` for every page/post/portfolio: title template (`%s | Junaed Hossain`), description, canonical, `robots`, OpenGraph, Twitter card, `hreflang` ready.
- [ ] **Dynamic OG images** (`next/og`) per post/portfolio/page if none uploaded.
- [ ] `sitemap.xml` (dynamic: pages, services, posts, portfolio, categories; with `lastmod`; excludes noindex items & admin).
- [ ] `robots.txt` (site: allow all + sitemap link; admin host: disallow all).
- [ ] `rss.xml` for blog.
- [ ] **JSON-LD structured data:** `Person` + `WebSite` (home), `ProfessionalService`/`Service` (services), `Article`/`BlogPosting` (posts), `BreadcrumbList` (all inner pages), `FAQPage` (optional block), `ContactPage`.
- [ ] Clean URLs, trailing-slash consistency, 301 redirect manager (admin UI), custom 404 with helpful links.
- [ ] `next/image` everywhere with width/height + required alt text; lazy loading; AVIF/WebP.
- [ ] Core Web Vitals budget: LCP < 2.0 s, CLS < 0.05, INP < 200 ms; one H1 per page, logical heading order.
- [ ] Security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy (also helps trust signals).

### 6.2 SEO tab in admin
- [ ] **Global:** default title template, default description, default OG image, site verification (Google Search Console, Bing), social handles.
- [ ] **Per-page/post fields:** SEO title (60-char counter), meta description (160-char counter), focus keyword, canonical override, OG title/description/image, robots (index/noindex, follow/nofollow), schema type.
- [ ] **SERP preview** (desktop + mobile) and **SEO checklist score** (keyword in title/H1/first paragraph/slug, image alts present, meta length, internal links, word count).
- [ ] **Redirects manager** and **404 log** (top broken URLs → one-click create redirect).
- [ ] Internal-link suggestions in the blog editor (nice-to-have).

**Done when:** Rich Results Test + Search Console validate; Lighthouse SEO = 100; sitemap submitted.

---

## Phase 7 — Analytics, Tracking & Dashboard (3–4 days)

### 7.1 Tracking integrations (Settings → Analytics & Tracking)
- [ ] Fields + on/off toggle for each: **Google Tag Manager (GTM-XXXX)**, **GA4 (G-XXXX)**, **Meta Pixel ID**, **Microsoft Clarity ID**.
- [ ] Injected **server-side** into layout via `next/script` (`afterInteractive`), only on the public site, **never on admin**.
- [ ] Recommended setup note: use GTM to host GA4/Pixel/Clarity, *or* load directly — admin warns if both would double-fire.
- [ ] **Consent banner** (cookie consent: Accept / Reject / Customize) — tracking scripts load only after consent where required; Consent Mode v2 signals for GA/GTM.
- [ ] Standard events pushed to `dataLayer`: `generate_lead` (form submit), `click_whatsapp`, `click_phone`, `click_email`, `view_portfolio_item`, `scroll_75`; Meta `Lead` / `Contact` event on `/thank-you`.

### 7.2 Custom head & body scripts
- [ ] Scripts tab: add multiple snippets with name, location (`<head>`, after `<body>`, before `</body>`), page scope (all / specific paths), active toggle.
- [ ] Only Owner/Admin can edit; every change is logged in Activity Logs; keep last version for rollback; **warn** on risky content.

### 7.3 Visitors & Analytics tab (first-party)
- [ ] Lightweight server-side tracker (`/api/track`): path, referrer, device, browser, country (Vercel geo header), UTM; **no raw IP stored** (salted daily hash), bots filtered, respects consent/DNT.
- [ ] Views: Today / 7d / 30d / custom range; unique visitors, page views, top pages, top referrers/sources, countries, devices/browsers, UTM campaigns, bounce/engagement, conversions (leads), realtime "active now".
- [ ] Optional: GA4 Data API connection (service account) to show GA4 numbers inside admin.
- [ ] Data retention setting (default 12 months) + automatic purge.

### 7.4 Dashboard (essentials only)
- [ ] **KPI cards:** visitors (7d + trend), page views, new leads, conversion rate.
- [ ] **Chart:** visitors last 30 days.
- [ ] **Widgets:** latest 5 leads, top 5 pages, top sources, latest blog posts/drafts, quick actions (New Post, New Portfolio, Upload Media), system status (last backup, email OK, Telegram OK), recent activity (5).
- [ ] **Alerts** (bell + page): new lead, failed-login spike, blocked-IP hits, spam spike, backup success/failure, low-disk on cPanel backup folder, SSL/domain expiry reminders. Mark read, filter by severity, optionally forwarded to Telegram.

**Done when:** dashboard shows real data and every tracker fires once (verify with GTM preview, Meta Pixel Helper, GA4 DebugView, Clarity live).

---

## Phase 8 — Security Hardening, Logs, IP Blocking (2–3 days)

### 8.1 Rate limiting & abuse protection
- [ ] Global middleware limiter (e.g. 120 req/min/IP on public, stricter on `/api/*`).
- [ ] Endpoint-specific: login (5/15 min), password reset (3/hour), contact (see Phase 5), tracker (60/min).
- [ ] Return `429` with `Retry-After`; log and raise alert on bursts.

### 8.2 IP blocking (manual) — Security tab
- [ ] Add/remove IP or CIDR with reason & optional expiry; list with search.
- [ ] Block list enforced in middleware (cached in Redis) for both public site and admin.
- [ ] One-click "Block this IP" from a lead or log entry.
- [ ] Optional: admin **IP allowlist** for `/login` (Owner only).
- [ ] Spam filter settings: banned words, max links, disposable-domain list, auto-block after N spam attempts.

### 8.3 Activity logs
- [ ] Log: login/logout/failed login, create/update/delete (pages, posts, portfolio, media, settings, scripts, staff), exports, IP blocks, backup actions — with user, IP, time, and before/after summary.
- [ ] Filters (user, action, date), search, pagination.
- [ ] **Clean logs** button (Owner only): clear older than 30/60/90 days or all (requires password re-entry; this clear action itself is logged). Auto-retention default 90 days.

### 8.4 Staff accounts
- [ ] Invite by email (Resend), set role, activate/deactivate, force password reset, revoke sessions, 2FA status column.
- [ ] Owner cannot be deleted/demoted by others.

### 8.5 Platform hardening checklist
- [ ] CSP (nonce-based), HSTS preload, no inline secrets, `poweredByHeader: false`.
- [ ] CSRF protection on all mutations (Server Actions' origin check + SameSite cookies).
- [ ] Input validation (Zod) + output encoding; sanitize rich-text HTML (DOMPurify/sanitize-html) on save **and** render.
- [ ] Upload hardening (mime sniffing, size limits, randomized filenames, SVG sanitize).
- [ ] Dependabot + `npm audit` in CI; secret scanning on GitHub.
- [ ] Least-privilege DB user; separate dev/prod databases.

**Done when:** blocked IP gets 403, 6th wrong login is locked, spam bot test fails, logs record all of it.

---

## Phase 9 — Backups, CI/CD, QA & Launch (3 days)

### 9.1 Smart weekly backup (GitHub Actions → cPanel)
**Retention rule (as understood):** run **weekly**; keep only the **latest 3 backup files**; everything older is **hard-deleted** from the cPanel drive to avoid junk.

Workflow `backup-weekly.yml` (cron: every Sunday 02:00 UTC + manual trigger):
1. `pg_dump` Neon DB → `.sql.gz`
2. (Optional) Media manifest or R2 → `rclone` incremental copy (media is large; DB is the priority).
3. **Encrypt** archive (`age`/GPG, key in GitHub Secrets) — backups contain leads & user data.
4. Upload via **SFTP** to Namecheap (port `21098`) → `/home/<cpanel_user>/backups/junaed/` using a dedicated limited key/user.
5. **Retention step:** list files matching `backup-YYYY-MM-DD*.gz.age`, sort by date, keep newest **3**, delete the rest.
6. Verify: file size > 0 and checksum matches, then write status to `backups_log` and alert via Telegram (success/failure).

```bash
# retention.sh (concept)
ls -1t backup-*.gz.age | tail -n +4 | xargs -r rm -f
```

- [ ] Admin **Backups tab:** list last 3 backups (date, size, status), "Run backup now" (triggers GitHub `workflow_dispatch` via API), download link instructions, restore guide.
- [ ] **Restore drill:** test restoring into a staging Neon branch once before launch.
- [ ] Alert if no successful backup in 8 days.

> Clarification needed: you wrote *"weekly. last 3 backup file will stay daily"*. I implemented **weekly runs, keep last 3**. If you instead want **daily backups + weekly archives**, say so and I'll change the schedule (e.g. keep last 3 daily + last 3 weekly).

### 9.2 CI/CD (GitHub Actions + Vercel)
- [ ] `ci.yml`: install → lint → typecheck → unit tests → build on every PR.
- [ ] Vercel Preview per PR; production deploy on merge to `main`.
- [ ] `db-migrate.yml`: manual-approval migration job against production.
- [ ] Environment variables split: Development / Preview / Production.

### 9.3 QA checklist before launch
- [ ] Mobile/tablet/desktop, Safari/Chrome/Firefox.
- [ ] Accessibility: axe, keyboard-only pass, contrast AA.
- [ ] Form abuse tests (bot, rate limit, XSS payloads, SQLi strings, oversized upload).
- [ ] Admin not indexed: header check + `site:admin.junaedhossain.com` returns nothing in Google; Search Console removal request if ever discovered.
- [ ] Tracking verified, consent works, no double-firing.
- [ ] Email deliverability (SPF/DKIM/DMARC pass; test to Gmail/Outlook).
- [ ] 301s: `www` → apex, `http` → `https`.
- [ ] Submit sitemap to Google Search Console & Bing Webmaster.
- [ ] Change all default credentials; rotate secrets; confirm Owner 2FA is on.

### 9.4 Launch
- [ ] Replace placeholder content (`hello@example.com`, illustrative portfolio) with real data.
- [ ] Enable production tracking IDs.
- [ ] Final backup run + verify; tag release `v1.0.0`.

---

## Timeline (single developer, focused)

| Phase | Scope | Estimate |
|---|---|---|
| 0 | Foundations | 0.5–1 day |
| 1 | Setup + public port | 2–3 days |
| 2 | DB, auth, admin shell | 3–4 days |
| 3 | Pages, settings, media | 4–5 days |
| 4 | Blog + portfolio | 3–4 days |
| 5 | Contact, leads, Telegram, Resend, widgets | 3 days |
| 6 | SEO | 3 days |
| 7 | Tracking + analytics + dashboard | 3–4 days |
| 8 | Security, IP block, logs, staff | 2–3 days |
| 9 | Backup, CI/CD, QA, launch | 3 days |
| **Total** | | **~4–5 weeks** |

**If you need a faster first release:** ship Phases 0 → 1 → 2 → 3 → 5 (site + login + editable content + contact/leads) first, then add Blog/SEO/Analytics/Backups as v1.1.

---

## Environment Variables (`.env.example`)

```bash
# App
NEXT_PUBLIC_SITE_URL=https://junaedhossain.com
ADMIN_URL=https://admin.junaedhossain.com
SESSION_SECRET=            # 64+ random chars
ENCRYPTION_KEY=            # for TOTP secrets & stored tokens
CAPTCHA_SECRET=            # signs math-captcha tokens
IP_HASH_SALT=

# Database
DATABASE_URL=              # Neon (pooled)
DATABASE_URL_UNPOOLED=     # migrations/backup

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=

# Rate limit
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email
RESEND_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Seed owner (first run only)
SEED_OWNER_EMAIL=
SEED_OWNER_PASSWORD=

# GitHub Actions secrets (backup)
CPANEL_SFTP_HOST=
CPANEL_SFTP_PORT=21098
CPANEL_SFTP_USER=
CPANEL_SFTP_KEY=
BACKUP_AGE_PUBLIC_KEY=
```

---

## Out of Scope for MVP (v1.1+)

- Multi-language / i18n
- Newsletter & email campaigns
- Comments on blog posts
- Online booking/payment
- Full-text search on site
- A/B testing
- Role-custom permission builder
- Mobile app / PWA

---

## Open Questions for You

1. **Backup rule:** weekly + keep last 3 (as built above), or daily + weekly?
2. **Media backup:** is DB-only backup acceptable, or do you also want images copied to cPanel (uses disk space)?
3. **Languages:** English only, or English + Bangla?
4. **Blog categories** you plan to start with (e.g. SEO, Digital Marketing, Design, WordPress)?
5. **Cookie consent:** will you target EU/UK visitors? (Decides if consent must block scripts by default.)
6. **Telegram:** one chat for you only, or a group with staff?
7. **Real content:** do you have the hero/about photo and real portfolio items ready?

---

*Ready to start at Phase 0. Reply with answers to the open questions and I'll begin building Phase 1.*
