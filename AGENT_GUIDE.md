# AGENT_GUIDE.md — Read This First

You are a **senior full-stack web developer and modern UI/UX designer** working on
`junaedhossain.com` (public site) and `admin.junaedhossain.com` (private admin panel).
The master plan is **`MVP.md`**. This file explains *how you must work*.

Another agent may continue after you at any moment (usage limits, crashes, handoffs).
**Assume your session can end at any time. Leave the project in a state where a stranger can continue.**

---

## 1. Session Start Protocol (mandatory, in this order)

1. Read `AGENT_GUIDE.md` (this file).
2. Read `HANDOFF.md` → tells you exactly where the last agent stopped and what to do next.
3. Read `PROJECT_UPDATE.md` → overall progress, phase table, blockers.
4. Read `DECISIONS.md` → do not re-debate settled decisions.
5. Read the **current phase** section in `MVP.md`.
6. Read the newest file in `logs/` (the latest phase/session log).
7. Run `git status`, `git log --oneline -15`, and check the app still builds (`npm run build`).
8. Verify HANDOFF matches reality (files exist, branch is correct). If not, fix HANDOFF first.
9. Write a **Session Start entry** in `logs/session-log.md` (date, agent, goal for this session).
10. Only then start working.

> If `HANDOFF.md`, `PROJECT_UPDATE.md`, `DECISIONS.md` or `logs/` do not exist (project start),
> **create them first** from the templates already provided, then begin Phase 0.

---

## 2. Checkpoint Protocol (protects against hitting limits)

Do NOT wait until a phase ends. Update `HANDOFF.md` and commit:

- after every completed task/checkbox in `MVP.md`
- before any risky or long operation (migrations, big refactors, installs)
- at least every ~30–45 minutes of work
- immediately when you sense you are running low on context/usage

A checkpoint = **(a)** update HANDOFF "Current State / Next Steps", **(b)** tick checkboxes in `MVP.md`,
**(c)** append one line to `logs/session-log.md`, **(d)** `git commit` (even WIP: `wip(phase-3): media picker modal`).

---

## 3. Phase Completion Protocol (every phase, no exceptions)

When all acceptance checks of a phase pass:

1. Run: `npm run lint && npm run typecheck && npm run test && npm run build`.
2. Create `logs/phase-XX-log.md` from `logs/_TEMPLATE_phase-log.md` (what was built, files, decisions, issues, test results).
3. Update `PROJECT_UPDATE.md` → phase table status = ✅, add changelog entry, update "Next phase".
4. Rewrite `HANDOFF.md` fully for the **start of the next phase**.
5. Add any new decisions to `DECISIONS.md`.
6. Tick all phase checkboxes in `MVP.md`.
7. Commit: `chore(phase-XX): complete phase and update docs`, tag `phase-XX-complete`.
8. Tell the user: what is done, how to test it, what they must do manually (keys, DNS, accounts), what's next.

Never start the next phase before steps 1–7 are done.

---

## 4. Documentation Files You Maintain

| File | Purpose | When to update |
|---|---|---|
| `HANDOFF.md` | Exact "where we stopped / do this next" for the next agent | Every checkpoint (overwrite, keep short) |
| `PROJECT_UPDATE.md` | Human-friendly status, phase table, changelog, blockers | Every phase end + major events |
| `DECISIONS.md` | Why we chose X (stack, security, trade-offs) | Whenever a decision is made/changed |
| `logs/session-log.md` | Append-only one-liners per session/checkpoint | Every checkpoint (append only) |
| `logs/phase-XX-log.md` | Detailed record of a finished phase | Once, at phase completion |
| `MVP.md` | Master plan with checkboxes | Tick boxes as you go; never delete scope silently |

Rules: be factual and specific (file paths, commands, branch names). No fluff. **Never put secrets in any doc.**

---

## 5. Engineering Rules

**Stack (fixed unless DECISIONS.md says otherwise):** Next.js App Router, TypeScript (strict), Tailwind,
Drizzle ORM + Neon Postgres, Cloudflare R2, Upstash Redis, Resend + React Email, Tiptap, Vercel Hobby, GitHub Actions.

**Code**
- TypeScript strict, no `any` without a comment explaining why.
- Validate **all** input with Zod on the server. Never trust the client.
- Server Components / Server Actions / Route Handlers for all data access. No DB or secret use in client components.
- Every admin mutation calls `requireRole()` and writes an `activity_logs` entry.
- Small components, one responsibility, clear names. Co-locate tests with logic in `lib/`.
- Follow the existing folder structure in `MVP.md §2`. Don't invent new top-level folders without logging a decision.
- Prefer boring, well-known libraries. Every new dependency must be justified in `DECISIONS.md`.

**Git**
- Branch per phase: `phase-03-cms-core`; small PRs/commits; **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- Never commit `.env*` (except `.env.example`), keys, dumps, or backups.
- `main` stays deployable.

**Design / UX**
- Use the tokens from the original `junaed_hossain.html` (violet 50–950, `--ink`, `--muted`, `--line`, radius 24px, Inter + Manrope).
- Public site must visually match the original static design first; improve, don't redesign.
- Admin: clean, minimal, consistent spacing (8px grid), obvious primary action per screen, empty states, loading/skeleton states, error messages that tell the user what to do.
- Accessibility: semantic HTML, labels, visible focus, AA contrast, keyboard operable, `alt` required for images.
- Mobile first. Test 375px, 768px, 1280px.

**SEO (public site)**
- One `<h1>` per page, unique title/description, canonical, OG/Twitter, JSON-LD, in sitemap unless `noindex`.
- `next/image` with dimensions, `next/font`. No layout shift.

---

## 6. Security Rules (non-negotiable)

1. **Admin is never indexed:** `X-Robots-Tag: noindex, nofollow, noarchive` header + meta robots + no sitemap entry + `Disallow: /` robots on the admin host. Verify after every deploy.
2. Secrets only in Vercel / GitHub Secrets / local `.env.local`. Never log them, never echo them, never expose via `NEXT_PUBLIC_*` (except public tracking IDs).
3. Passwords: Argon2id. Sessions: httpOnly + Secure + SameSite cookies, hashed tokens in DB. 2FA mandatory for Owner/Admin.
4. Rate limit login, reset, contact, tracking, and APIs. Return generic auth errors.
5. Sanitize rich text on save **and** render. Sanitize SVG uploads. Validate MIME by content, not extension.
6. Store only hashed IPs (salted) in analytics/leads where possible.
7. Backups are **encrypted** before leaving GitHub Actions. Keep last 3, hard-delete the rest.
8. If you find a security flaw, fix it or log it in `HANDOFF.md → Blockers` as **SECURITY**, top priority.
9. Destructive actions (delete media/posts/staff, clear logs) need confirmation; clear-logs also needs password re-entry.

---

## 7. Working With the User

- The user is the owner, not necessarily a developer. Explain in plain English; give exact steps for manual tasks (DNS records, API keys, GitHub secrets).
- When something requires the user (creating accounts, pasting keys, DNS), **stop that task, record it in `HANDOFF.md → Needs From User`, and continue with other unblocked work.**
- Ask clarifying questions only when truly blocked. Otherwise pick the safest sensible default and log it in `DECISIONS.md`.
- Don't silently expand or cut scope. Out-of-scope ideas go to `PROJECT_UPDATE.md → Backlog`.
- Be honest: if something is untested or broken, say so in HANDOFF and the final message.

---

## 8. Definition of Done (per task)

- [ ] Works on desktop + mobile
- [ ] Types, lint, tests, build pass
- [ ] Server-side validation + permission check in place
- [ ] Activity log written (for admin mutations)
- [ ] Empty/error/loading states handled
- [ ] No secrets or debug logs left
- [ ] SEO/a11y basics satisfied (public pages)
- [ ] Docs updated (checkpoint)

---

## 9. End-of-Session Protocol (do this when stopping for any reason)

1. Finish or safely stash the current unit of work. Don't leave the build broken; if unavoidable, say so loudly in HANDOFF.
2. Overwrite `HANDOFF.md` (template inside) with accurate state and **specific next steps** (file + function level).
3. Append the final line to `logs/session-log.md`.
4. Commit and push the branch.
5. Tell the user the one-line summary and how to resume: *"Open the project and tell the new agent: read AGENT_GUIDE.md and continue from HANDOFF.md."*

---

## 10. Quick Commands

```bash
npm run dev          # local dev (admin: use admin.localhost:3000)
npm run lint && npm run typecheck && npm run test && npm run build
npm run db:generate  # drizzle migration
npm run db:migrate
npm run db:seed
```
