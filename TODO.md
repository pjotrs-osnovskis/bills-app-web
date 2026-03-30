# Qlynton – Todo & Roadmap

> Last updated: 2026-03-30
> Legend: ✅ Done · 🔄 In progress · 🟡 Pending (clear path) · 🔵 Needs design/research

---

## ✅ Completed (this session)

| # | Item |
|---|------|
| 1 | Onboarding modal cancel → closes sub-dialog, returns to setup steps (not discard confirm) |
| 2 | My Invoices table full width — padding misalignment fixed |
| 3 | Mobile table borders — removed `border-top` from expanded rows (bills + services tables) |
| 4 | Dark mode autofill — browser autofill keeps dark/light theme background |
| 5 | New invoice cancel — removed stale `modalIsNew` flag causing false discard confirm |
| 6 | Logo — header 22px/bold, auth page 26px, onboarding logo color → neutral (not green) |
| 7 | Language & theme icons — hidden from nav header (available in Settings) |
| 8 | Settings add buttons — all show `+ Add` across all 3 languages |
| 9 | Filters auto-apply on change — date, customer, status all apply immediately |
| 10 | Date "from" → auto-sets "to" to today if empty |
| 11 | Apply button → replaced with "Clear filters" |
| 12 | Invoice list column order — STATUS before TOTAL, fixed column widths |
| 13 | Invoice list loading spinner — shown while `openBillEditor` fetches data |
| 14 | "Add service" label → "Add service or product" (all languages) |
| 15 | Onboarding — modal mock animation, location hint at top, skip/back/finish wording |
| 16 | Modal z-index raised above onboarding overlay |
| 19 | LV string audit — all keys present in all 3 language blocks, no hardcoded LV UI strings |
| 28 | Email settings — subject/body templates, token hint, saved via `PUT /api/settings` (recipient = customer email, not a default in Settings) |
| 29 | Customer form — Email field (`email` in model, API, form, save payload) |
| 30 | Language & theme in Settings — app language + bills language + theme selects verified |
| 34 | Account section in Settings — name, email, avatar (Google), password change (local); `GET`/`PUT /auth/account` |
| 36 | Settings: Account tab visibility — `syncAccountSection` no longer removes the panel `hidden` class (conflicted with section tabs); optional `settings-account-no-data` for empty account |
| 37 | Settings: `refreshSettings` restores active section after reload (sidebar + mobile select) |

---

## 🔄 In Progress

| # | Item | Notes |
|---|------|-------|
| — | *(none)* | |

---

## 🟡 Pending — Clear Implementation Path

### Auth (custom)

| # | Item | Notes |
|---|------|-------|
| 31 | Custom registration | **Done:** `POST /auth/register`; password hashing via **scrypt** (`password-utils.js`); Firestore-backed user store; session login after register. |
| 32 | Custom login form | **Done:** local email/password in auth UI; `POST /auth/login/local`. |
| 33 | Forgot password | **Partial:** `POST /auth/forgot-password` + `POST /auth/reset-password`; reset link logged to server console when no transactional email is configured; client handles `?reset=` token. **Gap:** email delivery of reset link (SMTP or transactional API). **Prerequisite (production):** a **valid sending domain** you control — configure DNS (**SPF**, **DKIM**, often **DMARC**) so reset mail is not spam-binned; many providers (Resend, SendGrid, etc.) give DNS records to add. Alternatively use the provider’s shared domain for testing only. **Blocked until:** domain + provider verification done. |
| 34 | Account edit view | **Done:** Settings → Account (`GET`/`PUT /auth/account`). |
| 35 | Safe credential storage | **Documented:** `README-WEB.md` — scrypt (`password-utils.js`), httpOnly session, rate limit. JWT not used (sessions only). |

---

## 🔵 Needs Design / Research

### 1. Google Drive Integration

**Goal:** Save generated PDFs directly to user's Google Drive, optionally into monthly folders.

**Technical approach:**
- Use **Google Drive API v3** via OAuth 2.0 (scope: `drive.file` — only files created by the app, minimal permission)
- OAuth flow: user clicks "Connect Google Drive" → Google consent screen → store refresh token per user
- On PDF export: call Drive API `files.create` with the PDF blob + folder ID
- **Folder options (recommended UX):**
  - Option A: single fixed folder (user picks once via folder picker)
  - Option B: auto-create monthly folders like `Qlynton/2026-03` on first save of the month
  - Best approach: **offer both** — a root folder picker + a toggle "Create monthly sub-folders (YYYY-MM)"

**Concerns to resolve:**
- Token storage: encrypt refresh token at rest (server-side, per user)
- If app is multi-user: each user has their own Drive connection
- Folder picker UI: use Google Picker API (requires loading their JS SDK) or just let users type/paste a folder ID
- Error handling: token expiry, quota exceeded, permission revoked

**Recommended UX flow:**
1. Settings → Integrations → Google Drive: [Connect] button
2. After OAuth: show connected account + root folder field + monthly folder toggle
3. On invoice download: auto-save to Drive (or offer "Save to Drive" as secondary action)

---

### 2. Bank List & "Go to Bank" Links

**Goal:** In banking settings, let users pick their bank from a list, then provide a one-click link to that bank's online banking login page.

**Technical approach:**
- Maintain a static JSON list of banks: `{ id, name, country, loginUrl, swiftPrefix[] }`
- Could auto-suggest bank when user enters SWIFT/IBAN (match prefix)
- "Go to bank" = `<a href="${bank.loginUrl}" target="_blank" rel="noopener">` — simple, no API needed

**Data to gather (curated list):**
- LV: Swedbank (swedbank.lv), SEB, Citadele, Luminor, Revolut
- LT/EE: same banks, different country domains
- EU: Wise, N26, Monzo, HSBC, Barclays, BNP, Deutsche Bank, etc.
- Structure: grouped by country; user picks country → filtered list

**Concerns:**
- Login URLs change; needs occasional maintenance
- Don't store credentials — this is only a convenience link
- Consider: just show a "Search your bank" input that filters the list

**Recommended UX:**
1. Settings → Company → Banking: after IBAN/SWIFT field, show "Your bank" selector
2. Searchable dropdown grouped by country
3. If match found: show bank logo + "Go to online banking →" link

---

### 3. Account & Multi-Company Model

**Current state (already correct):**
- Data is already scoped to `req.user.id` — all companies, customers, bills, services belong to one user
- Multiple companies per account already works in Settings (user can create more than one)
- Google OAuth already creates a user identity (`id` = Google profile ID)

**Email/password auth** is implemented (local accounts + sessions). Remaining gaps: see Auth table (forgot-password email delivery, optional bcrypt policy). No structural change to the data model is required; it already handles one owner with multiple companies.

---

### 4. FAQ / Help Page

**Implemented:** `#/faq` view (`#view-faq`), header help icon + footer link, searchable FAQ (`public/js/faq-data.js` + `public/js/faq.js`). Content in **lv / en / ru** (sections: Getting started, Invoices, Settings & data).

**Optional later:** screenshots in answers; more sections (e.g. customers & services, PDF-only tips).

---

### 5. Email "Send Invoice" Feature

**Goal:** Send an invoice PDF as an email attachment directly from the app.

**Options (in order of complexity):**
| Option | How | Pros | Cons |
|--------|-----|------|------|
| `mailto:` link | Build a `mailto:?subject=…&body=…` link; user's email client opens with pre-filled fields | Zero backend, works everywhere | Can't attach PDF via mailto |
| Server-side email | Backend uses Nodemailer + SMTP (e.g. SendGrid free tier) | Full control, attachment works | Requires SMTP credentials in settings |
| Client-side download + mailto | Download PDF first, then open mailto with instructions | Simple hybrid | User must attach manually |

**Implemented (app today):** Env-based SMTP in `server.js` (`POST /api/email/invoice`); subject/body templates in Settings; recipient = **customer** email. If SMTP is not configured: download PDF + `mailto:` + toast to attach manually.

**Optional product follow-ups:** per-user SMTP in Settings; Web Share API on supported devices; Google Drive (Research §1).

**Settings fields (current):** subject + body templates (tokens as above). No default “To” — always the invoice customer.

---

## Priority Order (recommended next steps)

```
Done in product: 28–30 (settings/email/customer), 31–32–34 (auth), send-invoice (SMTP + fallback), Account in Settings

Short-term:
  33 (forgot password — email the reset link; **requires valid domain + DNS for reliable delivery** — deferred until ready)
  35 (optional: document scrypt; optional bcrypt if policy requires it)

Medium-term (integrations):
  Research 1 (Drive) → implement
  Research 2 (banks) → implement (the data part is a day's work, the UI is simple)

Long-term (architecture):
  Research 3 (multi-user/company scoping) → migrate data model → implement
  Research 4 (FAQ) → content + implementation
```
