# Launch runbook

**Phase 9.4.** The ordered list of what to do on launch day, and what to check
after. Written so it can be followed by someone who is tired, which is the state
people are in on launch day.

Last updated: 2026-11-21

---

## Before launch day: the four blockers

Nothing below matters until these are done. Each is an owner action.

| # | Blocker | What it unblocks |
|---|---|---|
| 1 | **Vercel project + production deploy** | Everything. There is no live site today. |
| 2 | **Neon production database** | Real data. Dev runs on local PGlite. |
| 3 | **Cloudflare R2 bucket** | Media uploads. The storage adapter refuses disk in production by design (D-027). |
| 4 | **Resend API key + verified domain** | Lead notifications, password reset, staff invites. |

Then, in the same sitting:

| # | Item | Where |
|---|---|---|
| 5 | DNS: apex + `www` + `admin` | Namecheap |
| 6 | Generate production secrets (64+ chars each) | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| 7 | Set all env vars in Vercel, split by environment | Vercel → Settings → Environment Variables |
| 8 | Set the GitHub Actions secrets for the backup job | GitHub → Settings → Secrets → Actions |
| 9 | Create the `production` Environment with a required reviewer | GitHub → Settings → Environments |

---

## Launch day, in order

### 1. Database

```powershell
# Against the production DATABASE_URL_UNPOOLED
npm run db:migrate
```

Then seed the owner account once, and **remove the seed variables afterwards**:

```powershell
npm run db:seed
npm run db:enrol-owner   # enrols TOTP for the owner
```

Confirm: the owner can log in, 2FA is prompted, and the dashboard renders.

### 2. Content

- [ ] Replace `hello@example.com` and every placeholder address in Settings.
- [ ] Replace illustrative portfolio items with real ones.
- [ ] Publish the real About and Home copy.
- [ ] Check every page renders with real content, not lorem ipsum.
- [ ] Upload the real logo and favicon through the media library.

### 3. Tracking

- [ ] Put the real GTM container ID and GA4 measurement ID in Settings.
- [ ] Confirm the consent banner appears on a fresh browser profile.
- [ ] Accept, then confirm exactly one page view lands in GA4 (not two).
- [ ] Reject in a second profile, confirm nothing loads.

### 4. Security pass

- [ ] Owner password is strong and stored in a password manager.
- [ ] Owner 2FA is on.
- [ ] `/admin/security` shows zero unintended blocks.
- [ ] Admin IP allowlist is **off** unless the owner's address is included.
- [ ] `curl -I https://admin.junaedhossain.com` shows `X-Robots-Tag: noindex`.
- [ ] `curl -I https://junaedhossain.com` shows HSTS.
- [ ] `poweredByHeader` is off: no `X-Powered-By` in the response.

### 5. Backups

- [ ] Run the backup workflow manually from the Actions tab.
- [ ] Confirm the archive lands in `/home/<cpanel_user>/backups/junaed/`.
- [ ] Confirm the row appears on `/admin/backups` as `success`.
- [ ] **Restore drill:** decrypt the archive and restore into a scratch Neon
      branch. Confirm the site runs against it. This is the step people skip and
      regret.
- [ ] Confirm the retention step left exactly three archives.

### 6. Final checks

- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all green.
- [ ] CI workflow green on `main`.
- [ ] Submit the sitemap to Google Search Console and Bing Webmaster.
- [ ] Run the QA checklist (`docs/qa-checklist.md`) on a real phone.
- [ ] Tag the release: `git tag v1.0.0` and push the tag.

---

## After launch: first 48 hours

- [ ] Watch the Vercel error log. A 500 on a public page is the thing to catch first.
- [ ] Check `/admin/activity` for failed logins you did not make.
- [ ] Confirm the first real lead arrives and notifies.
- [ ] Confirm the first scheduled backup ran on Sunday.
- [ ] Check Search Console for crawl errors after the first few days.

---

## Rollback

If the deploy is broken and the fix is not obvious in ten minutes:

1. **Vercel → Deployments → previous deployment → Promote to Production.** This is
   the fastest path and does not touch the database.
2. If the database is the problem, restore the newest archive per
   `/admin/backups` → Restore guide, into a scratch branch first.
3. Never restore production directly from an unverified archive.

---

## What "launched" means

Launched means: the public site is live on the real domain, the owner can log in
with 2FA, media uploads work, one real lead has arrived and notified, and one
backup has succeeded and been restored into a scratch branch.

Anything less is "deployed", which is a different and much weaker claim.
