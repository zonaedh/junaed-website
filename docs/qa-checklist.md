# QA checklist before launch

**Phase 9.3.** This is a working document, not a certificate. Every row is either
**verified** (with the evidence named), **blocked** (with what it waits on), or
**not run**. Nothing here is marked done because it is probably fine.

Last updated: 2026-11-21

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Verified, evidence named |
| ⛔ | Blocked on an owner action (credentials, DNS, hosting) |
| ⬜ | Not run yet |

---

## 1. Cross-browser and responsive

| Check | Status | Evidence / blocker |
|---|---|---|
| Desktop Chrome | ✅ | Every phase 1–8 surface was built and checked in the embedded browser at 1280×800 |
| Desktop Firefox | ⬜ | Not run |
| Desktop Safari | ⛔ | Needs a Mac or BrowserStack; not available on this machine |
| Mobile (390px) | ⬜ | Layout uses responsive Tailwind classes, but no phone pass has been done |
| Tablet (768px) | ⬜ | Not run |
| Admin on mobile | ⬜ | Sidebar has a mobile drawer; untested on a real device |

**Why this is not done:** the site is not deployed, so there is no URL to open on a
real phone. This must be run against the Vercel preview before launch.

---

## 2. Accessibility

| Check | Status | Evidence / blocker |
|---|---|---|
| axe scan, public pages | ⬜ | Not run |
| axe scan, admin pages | ⬜ | Not run |
| Keyboard-only pass | ⬜ | Not run |
| Contrast AA | ⬜ | Palette is violet on white; needs measuring, not eyeballing |
| Focus visible on all controls | ⬜ | Not verified |
| Form labels tied to inputs | ✅ | Every admin form uses `<label>` with a matching control; checked during phases 3–8 |
| Images have alt text | ✅ | Media library requires alt text; enforced at upload |

**Note:** the admin is `noindex`, but accessibility is not optional for the owner
either. Run axe before launch.

---

## 3. Form abuse

| Check | Status | Evidence / blocker |
|---|---|---|
| Bot submission blocked | ✅ | Math captcha + honeypot in the contact form (Phase 5) |
| Rate limit returns 429 | ✅ | Verified in Phase 8 over HTTP with `Retry-After` |
| IP block returns 403 | ✅ | Verified in Phase 8: `203.0.113.5` → 403, `198.51.100.9` → 200 |
| XSS payload stored and rendered | ⬜ | Rich text is sanitised on save and render; needs an explicit payload test |
| SQL injection string in a form | ⬜ | Drizzle parameterises queries; needs an explicit test to confirm |
| Oversized upload rejected | ✅ | Server validates size before processing (Phase 3) |
| Wrong MIME type rejected | ✅ | Server sniffs type, does not trust the extension (Phase 3) |
| SVG sanitised | ✅ | SVGs are sanitised on upload (Phase 3) |

---

## 4. Admin not indexed

| Check | Status | Evidence / blocker |
|---|---|---|
| `X-Robots-Tag` header on admin | ✅ | Set in `src/proxy.ts` for every admin response; verified with `curl -I` in Phase 2 |
| Admin `robots.txt` disallows all | ✅ | Served by the proxy on the admin host |
| `<meta name="robots">` in admin layout | ✅ | Present in the admin layout |
| Admin excluded from sitemap | ✅ | Sitemap is generated from public routes only |
| `site:admin.junaedhossain.com` returns nothing | ⛔ | Needs the domain live and indexed time; cannot be checked before deploy |
| Search Console removal request | ⛔ | Needs Search Console access and a live domain |

---

## 5. Tracking and consent

| Check | Status | Evidence / blocker |
|---|---|---|
| Banner appears on first visit | ✅ | Verified in Phase 7, screenshot confirmed |
| Accept writes the cookie | ✅ | `jh_consent=accepted.1` verified |
| Reject prevents tags loading | ✅ | Consent gate checked before any tag mounts |
| No double-firing | ⬜ | Needs a real GA4 property to observe; blocked on production IDs |
| Beacon writes a page view | ✅ | Verified in Phase 7: `/blog` recorded with hashed visitor |
| DNT honoured | ✅ | Route drops the request when DNT is set |
| Bots dropped | ✅ | UA filtering before insert |

---

## 6. Email deliverability

| Check | Status | Evidence / blocker |
|---|---|---|
| SPF record | ⛔ | Needs DNS access and a mail provider |
| DKIM signing | ⛔ | Needs Resend configured |
| DMARC policy | ⛔ | Needs DNS access |
| Test to Gmail | ⛔ | Needs Resend configured |
| Test to Outlook | ⛔ | Needs Resend configured |

**This is the largest blocked section.** Resend is not configured, so no
transactional email has ever been sent from this app. Lead notifications are
dormant by design until it is.

---

## 7. Redirects and canonical host

| Check | Status | Evidence / blocker |
|---|---|---|
| `www` → apex | ⛔ | Needs DNS and Vercel domain config |
| `http` → `https` | ⛔ | Needs a deployed domain |
| HSTS header in production | ✅ | Set in `next.config.ts`, production-only (verified in the config, not over the wire) |
| Trailing-slash behaviour consistent | ⬜ | Not run |

---

## 8. Search engines

| Check | Status | Evidence / blocker |
|---|---|---|
| Sitemap generated | ✅ | `/sitemap.xml` builds and is listed in the build output |
| robots.txt correct on public host | ✅ | Built as a static route |
| Sitemap submitted to Google | ⛔ | Needs a live domain and Search Console |
| Sitemap submitted to Bing | ⛔ | Needs a live domain and Bing Webmaster |

---

## 9. Credentials and secrets

| Check | Status | Evidence / blocker |
|---|---|---|
| No secrets in the repository | ✅ | `.env.example` lists names only; `.env.local` is gitignored and verified with `git check-ignore` |
| Default credentials changed | ⛔ | Needs the owner to set the production owner password |
| Owner 2FA enabled | ⛔ | Owner action; TOTP enrolment exists (`npm run db:enrol-owner`) |
| Secrets rotated before launch | ⛔ | Owner action |
| Session secret is 64+ random chars | ⛔ | Must be generated for production, not reused from dev |

---

## What must happen before this checklist can be finished

1. **Deploy to a Vercel preview.** Most rows are blocked on having a URL at all.
2. **Configure Resend.** Unblocks the whole email section, and the Phase 5
   notification path that has never run.
3. **Configure R2.** Required for production media; the storage adapter refuses
   to run on disk in production by design.
4. **Point DNS at the deployment.** Unblocks redirects, indexing checks, and the
   Search Console rows.
5. **Then run this list top to bottom on a real device.**

Until 1–4 are done, this checklist cannot honestly be called complete, and the
launch should not be called done either.
