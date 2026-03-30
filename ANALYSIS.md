# Qlynton – Product Analysis
*Invoice app for small European businesses. Current stack: Node.js + Express, Firebase Firestore, vanilla JS frontend, Google OAuth, jsPDF client-side PDF generation.*

---

## What the app does today

Qlynton is a B2B invoicing tool aimed at small Latvian companies. Users log in with Google, manage one or more company profiles, maintain a customer list and a service catalogue, create invoices, and download them as PDFs. The PDF supports three languages (Latvian, English, Russian). Data lives in Firebase Firestore, scoped per Google user ID. There is also a legacy file-based store for local/offline use. The app can run as an Electron desktop app or as a hosted web service.

Core capabilities that already work:
- Company profiles (name, address, reg. number, VAT number, bank details, logo)
- Customer management with an "inactive" flag when a customer has existing invoices
- Service catalogue with default VAT rates and last-used price
- Invoice creation with line items, per-item and per-invoice discounts, payment due dates
- Invoice numbering with configurable prefix (e.g. LD-0001)
- PDF download in LV / EN / RU
- JSON import / export for backup
- Dark / light theme, language switcher on the login screen

---

## Missing functionality (priority order for SaaS launch)

### 1. Invoice lifecycle / status tracking
There is no status on invoices. Once created, there is no way to mark them as Draft, Sent, Paid, Overdue, or Cancelled. This is the single most important missing feature — without it users cannot manage cash flow or know what is outstanding.

Required statuses: Draft → Sent → Paid / Partially paid / Overdue / Cancelled.
Payment should record: date paid, amount received, payment method.

### 2. Dashboard / overview
There is no home screen summary. Users land directly on the invoice list. A dashboard should show: total outstanding, overdue amount, invoices sent this month vs last month, top customers by revenue. This is table-stakes for any invoicing SaaS.

### 3. Email sending
Invoices can only be downloaded as PDF. There is no way to email them to a customer from inside the app. This requires an outbound email integration (e.g. Resend, SendGrid, or AWS SES). The email should carry the PDF as attachment and optionally a plain-text payment link.

### 4. Payment reminders
No automated follow-up on overdue invoices. Users should be able to set a reminder schedule (e.g. 3 days before due, on due date, 7 days after due) and have the app send reminder emails automatically.

### 5. Quotes / pro-forma invoices
No way to create a quote or pro-forma that can later be converted to a final invoice. Many small businesses need this step in their sales process.

### 6. Credit notes
No ability to issue a credit note (partial or full) against an existing invoice. This is required both legally and practically when goods are returned or a billing error is corrected.

### 7. Recurring invoices
No recurring or subscription billing. Users who invoice the same customer the same amount every month have to create the invoice manually each time.

### 8. Google Drive integration
Explicitly mentioned as a future goal but not implemented. When an invoice PDF is generated or emailed, it should optionally be saved to the user's Google Drive in a folder of their choice.

### 9. VAT breakdown by rate
The PDF prints a single line "VAT (21%)" regardless of the actual rates on the line items. When a bill mixes 21%, 12%, and 0% VAT items, EU VAT rules require each rate to appear on a separate line with its own subtotal. The current implementation is non-compliant for mixed-rate invoices.

### 10. Reverse-charge / intra-EU VAT
No support for the EU cross-border reverse-charge mechanism (VAT 0% with a mandatory "VAT reverse charge" note on the invoice). This is required when selling B2B to VAT-registered companies in other EU member states.

### 11. Reports and accounting export
No VAT period summary report. No revenue by customer or by period. No CSV or Excel export that accountants can import into accounting software (e.g. Jumis, SAF-T for Baltic states). This is a significant gap for the target market.

### 12. Multi-user / team access
One Google account = one workspace. There is no concept of inviting a colleague or accountant to view the same data. Even a simple "read-only accountant" role would open the product to slightly larger teams.

### 13. Subscription management and billing
There is no subscription tier, payment wall, usage limit, or plan management. Before going to market the app needs: free trial, pricing plans, Stripe integration for card billing, and a basic billing portal.

### 14. Onboarding flow
A new user who signs in for the first time sees an empty invoice list with no guidance. There should be a setup wizard: add your company → add a customer → create your first invoice.

### 15. Multi-currency support
Only EUR is supported. Latvian companies sometimes invoice in USD, GBP, or CHF. The currency should be configurable per invoice and the PDF should reflect it.

### 16. Expense / cost tracking
No way to record expenses. Not critical for v1 SaaS but frequently requested by the target audience.

### 17. Customer-facing payment page
No hosted payment page where a customer can view and pay an invoice online (Stripe checkout or similar). This would materially speed up cash collection.

---

## Technical flaws and bugs

### Critical

**Invoice deletion breaks sequential numbering.**
Latvian law (and most EU jurisdictions) requires invoices to be numbered sequentially without gaps. Deleting an invoice leaves a gap in the number sequence. Once an invoice is issued (sent) it must not be deleted — it must be cancelled via a credit note. There is currently no protection against deleting or modifying a sent/paid invoice.

**Totals are not recalculated server-side.**
The POST /api/bills endpoint stores whatever `subtotal`, `totalVat`, and `totalGross` values the client sends without verifying them. A client that sends tampered totals will have those stored and printed on the PDF. Totals must be calculated server-side from the items array.

**Session store is MemoryStore.**
`express-session` defaults to MemoryStore. This leaks memory over time, does not survive a server restart (all users are logged out), and does not work across multiple server instances. A persistent session store (e.g. `connect-redis` or Firestore-backed) is required before production.

**VAT label hardcoded to 21%.**
`L.vat21` is the key in all three locales and always prints "VAT (21%)" or "PVN (21%)". If items carry 12% or 0% VAT the printed percentage is wrong. This is a compliance issue.

### High priority

**No CSRF protection.**
All state-changing API endpoints (`POST`, `PUT`, `DELETE`) are protected only by the session cookie. There are no CSRF tokens. A forged cross-site request from a malicious page could modify or delete the user's data.

**Multer has no file size or MIME type limit.**
The logo upload endpoint accepts any file of any size. No validation of `file.mimetype` and no `limits` option is passed to multer. This allows arbitrary file uploads to the server's `public/uploads` directory, which is served statically.

**Invoice number sequence is global, not per-company.**
`nextDocumentNumber` scans all bills across all companies for the highest number and adds 1. A user with two companies (e.g. LD prefix and IP prefix) would end up with LD-0001, IP-0002, LD-0003 — the per-company numbering is broken. Each company needs its own independent sequence counter.

**Logo URLs not stored in Firebase.**
When running in web/Firebase mode, uploaded logos are stored on the server's local disk (in `public/uploads`). If the server restarts or is replaced (e.g. on Render's ephemeral disk), all logos are lost. Logos must be uploaded to Firebase Storage or another persistent object store.

**Import endpoint replaces all data without confirmation.**
`POST /api/import` overwrites companies, customers, services, and bills without any merge logic or confirmation step. A misclick on an old export file destroys all current data.

**All console logging in production.**
`server.js` logs every request method and URL with no log level control. This will flood logs in production and may expose sensitive URL parameters.

### Medium priority

**No rate limiting on auth or API endpoints.**
The Google OAuth callback and all API endpoints have no rate limiting. This leaves them open to brute-force and enumeration.

**No input length limits on free-text fields.**
Company name, customer name, service descriptions, etc. have no maximum length validation on the server. A very long string can cause layout issues in the PDF or excessive Firestore document sizes.

**PDF generation is client-side only.**
Because jsPDF runs in the browser, there is no way to generate a PDF on the server for emailing. When email sending is added, a server-side PDF renderer (Puppeteer or a dedicated library) will be needed.

**`basis` and `description` fields defined in the data model but never used.**
PLAN.md lists `basis` and `description` on invoices. Neither field appears in the editor or the PDF. Either implement them or remove them from the model to avoid confusion.

---

## EU / European market compliance gaps

### GDPR
- No privacy policy linked from the app.
- No cookie consent banner (the app uses a session cookie and localStorage).
- No data deletion mechanism (right to erasure). A user who wants to close their account has no way to request deletion of their Firestore data.
- No data retention policy — invoices are stored indefinitely.
- No data portability export in a standard format (JSON export exists but is app-specific).

### Invoice legal requirements (Latvia and broader EU)
- **Sequential numbering without gaps** — enforced neither by the UI nor the API (see bug above).
- **Immutability after issue** — issued invoices must not be editable. Currently any invoice can be modified at any time.
- **5–7 year retention** — no policy or technical control to prevent deletion of old invoices within the legally required retention window.
- **Mixed VAT rates** — EU VAT Directive Article 226 requires each applicable VAT rate and the corresponding VAT amount to be stated on the invoice. A single "VAT 21%" line for mixed-rate invoices is non-compliant.
- **Reverse charge notation** — intra-EU B2B sales require the text "VAT reverse charge" on the invoice. Not supported.
- **Supply date** — the field exists in the data model and PLAN.md but it is optional in the UI and not printed on the PDF. In Latvia the supply date is a required field on invoices.

### e-Invoicing (growing requirement)
The EU mandate for electronic invoicing (EN 16931 / Peppol UBL) is being rolled out for B2G transactions across member states. Latvia requires e-invoicing for government contracts. No XML/UBL export is available. This is not a blocker for v1 but will become one.

---

## SaaS / subscription readiness

The app has no monetisation layer at all. To sell it as a subscription product the following are needed:

- **Stripe integration** — monthly/annual subscription, card billing, invoice receipt to the customer's email.
- **Pricing tiers** — e.g. Free (5 invoices/month, 1 company), Starter (unlimited invoices, 1 company, email sending), Pro (multiple companies, team access, Google Drive, recurring invoices).
- **Usage enforcement** — middleware that checks whether the user's plan allows the current action (e.g. creating a 6th invoice on the free plan).
- **Billing portal** — upgrade, downgrade, cancel, update payment method.
- **Email verification** — currently any Google account can sign in; no additional verification.
- **Trial period** — most SaaS products offer 14 or 30 days free without a card.
- **Onboarding emails** — welcome, first-invoice-created, trial-ending reminder, payment-failed.

---

## Quick wins before launch

These are low-effort changes that meaningfully improve the product:

1. Add invoice status field (Draft / Sent / Paid) — even without automation, letting users manually set the status unblocks basic cash-flow tracking.
2. Print supply date on the PDF — the field already exists in the data model.
3. Fix the VAT label so it reflects the actual rate(s) on the invoice.
4. Add server-side total recalculation.
5. Add `limits` to the multer config (max 2 MB, images only).
6. Replace MemoryStore with a persistent session store.
7. Add a cookie/privacy notice (even a minimal one) to comply with EU ePrivacy Directive.
8. Protect delete and edit actions on invoices that are marked Sent or Paid.
9. Add a basic dashboard screen showing outstanding and overdue totals.
10. Show a guided empty state to new users instead of a blank invoice list.
