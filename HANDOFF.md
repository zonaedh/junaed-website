# HANDOFF.md
> Overwrite this file at every checkpoint. Keep it short, specific and true.
> A new agent must be able to continue from this file alone (plus AGENT_GUIDE.md).

**Last updated:** 2026-11-21 11:05 (UTC+6) · **By:** saffron

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

**Current sync state:** `main` is in sync with `origin/main` (0 ahead, 0 behind).
Phases 0–6 are pushed. Phase 6 is tagged `phase-06-complete`.

## 1. Where We Are
- **Current phase:** Phase 6 complete and verified in a browser and over HTTP.
- **Phase progress:** Phase 0 local done (hosted half blocked on owner), Phases 1–6 complete.
- **Gates:** lint, typecheck, 178/178 tests and build all pass as of this handoff.

## 2. What Phase 6 Delivered
- **Metadata** — one `buildMetadata()` in `src/lib/seo/metadata.ts`, called by every public
  page. Titles render once (it uses `title: { absolute }` because it applies the template
  itself; the root layout would otherwise apply it a second time).
- **JSON-LD** — Person, WebSite, ProfessionalService on home; Service on service pages;
  BlogPosting on posts; ContactPage; BreadcrumbList everywhere inner.
- **OG images** — dynamic per post via `next/og`. Verified: 200, `image/png`, 92 KB.
- **sitemap.xml / robots.txt / rss.xml** — all dynamic, all reading the database.
- **Security headers** — CSP, XFO, Referrer-Policy, Permissions-Policy, nosniff; HSTS in
  production only.
- **Redirect manager + 404 log** — Admin → SEO. A 404 becomes a redirect in one click.
- **SEO panel in the post editor** — live SERP preview, counters, focus keyword, 0–100 score.

## 3. Three Things That Will Bite You
1. **Redirects are NOT in `proxy.ts`.** Next's docs forbid data fetching there. A catch-all
   route (`src/app/(site)/[...path]/page.tsx`) owns redirects and 404 logging (D-035).
2. **Permanent redirects are 308, not 301.** `permanentRedirect()` has no 301 form. The UI
   says "Permanent (308)" on purpose (D-036). Do not "fix" it back to 301.
3. **The OG image handler takes `{ params }` as a destructured object**, not as a second
   argument. Passing `(request, { params })` throws at runtime while typechecking fine.

## 4. Next Phase Starting Notes
1. **Phase 7 is analytics, tracking and the dashboard** — read `MVP.md` §7 first.
2. Build the **consent banner before any tracker fires**. Loading GA4 or a pixel before
   consent is the one thing in Phase 7 that is genuinely hard to undo.
3. `page_views` already exists in the schema from Phase 2 and is still unused.

## 5. Local Environment
- `npm run db:local` — PGlite on 127.0.0.1:5433 (D-022).
- `npm run dev` — dev server on :3000. **Restart after adding settings keys**; the
  registry is read at boot.
- Owner login for local testing: `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` in `.env.local`.
- PowerShell, not bash. No `&&`. Write files with editor tools, never `Set-Content` with
  an inline template literal containing backticks — it silently eats them.