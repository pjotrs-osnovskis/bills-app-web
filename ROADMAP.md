# Qlynton — Product Roadmap & Assessment

_Last updated: March 2026_

---

## Current State Assessment

### ✅ What's Working Well
- Invoice creation and editing (full editor with line items, VAT by rate, PDF export)
- Customer and service/product management in Settings
- Multi-language support (LV / EN / RU) throughout the app
- Dark/light theme toggle
- Google OAuth authentication
- JSON import/export for data backup
- Onboarding wizard (5 steps: Company → Banking → Services → Customers → Done)
- Responsive mobile layout with bottom nav (newly implemented)
- Invoice status tracking (Draft → Sent → Paid, with Overdue auto-detection)
- Invoice filtering, sorting, searching and date presets

### ⚠️ Known Gaps / Missing Functionality

#### Critical (affects core invoicing workflow)
- **No email sending** — users must download PDF and send manually
- **No invoice preview** — no way to see the final PDF before downloading
- **No payment links** — invoices can't include a payment link/button
- **No recurring invoices** — manual re-creation needed for recurring billing

#### Important (affects user experience)
- **No client portal** — clients can't view/download invoices self-serve
- **No invoice numbering auto-increment** — users manually type invoice numbers
- **No due date tracking on invoice list** — overdue is detected but no "due in X days" indicator
- **No bulk actions** — can't mark multiple invoices as paid/sent at once
- **No search by amount** — filter only works by number/customer
- **No invoice templates** — can't save layout/content preferences

#### Nice to have
- Dashboard with graphs (Outstanding, Paid this month, Revenue trend)
- Subscription/plan tiers
- Multi-currency support (invoices in non-EUR)
- Quote/estimate creation (pre-invoice)
- Payment reminders (automated follow-up emails)
- File attachments on invoices

---

## Priority Implementation Plan

### Phase 1 — Core UX Polish (current sprint)
| Task | Status |
|------|--------|
| Mobile responsive layout (bottom nav, card list) | ✅ Done |
| Login page redesign (better product explanation) | ✅ Done |
| Onboarding step 1: product overview | ✅ Done |
| Privacy Policy page | ✅ Done |
| Terms of Service page | ✅ Done |
| Remove placeholder stats strip (until dashboard ready) | ✅ Done |
| Onboarding: use real modals for Services/Customers | ✅ Done |
| Per-line VAT % in invoice editor | ✅ Done |

### Phase 2 — Missing Core Features
| Task | Priority | Notes |
|------|----------|-------|
| Invoice auto-number (auto-increment) | HIGH | Biggest source of user friction |
| Email invoice sending | HIGH | Critical for real business use |
| Invoice preview (rendered PDF thumbnail) | HIGH | Users need to see before sending |
| Due date column + "X days overdue" on list | MEDIUM | Better payment tracking |
| Bulk status actions | MEDIUM | Power user feature |
| Dashboard with graphs | MEDIUM | Outstanding, Paid this month, trend |

### Phase 3 — Monetization & Growth
| Task | Priority | Notes |
|------|----------|-------|
| Subscription plan system | HIGH | Required before broader launch |
| Payment gateway integration | HIGH | Accept card/bank transfer |
| Recurring invoices | MEDIUM | Reduces manual work |
| Client portal (read-only) | MEDIUM | Professional feature |
| Automated payment reminders | LOW | Email sequences |
| API for third-party integrations | LOW | Longer term |

---

## Subscription Model Recommendation

Based on competitor analysis (FreshBooks, Xero, Wave, Invoice Ninja):

### Recommended Tiers

**Free** — "Try it out"
- Up to 3 active clients
- Up to 5 invoices/month
- PDF download
- 1 company profile
- All languages

**Pro — €9/month (or €90/year)**
- Unlimited clients & invoices
- Email sending from Qlynton
- Invoice preview
- Recurring invoices
- Multiple company profiles
- Priority support

**Business — €19/month (or €180/year)**
- Everything in Pro
- Client portal
- Payment gateway integration
- Automated payment reminders
- API access
- Custom invoice templates

### Key Decisions
- **Free tier**: Low limits but functional — let users experience value before paying
- **Annual discount**: 2 months free = 17% discount (industry standard)
- **No ads**: Keep the experience clean (Qlynton brand promise)
- **Wave model consideration**: Free forever + payment processing fees. Viable if payment integration is added.

---

## Legal Compliance Checklist (EU / GDPR)

| Requirement | Status |
|-------------|--------|
| Privacy Policy page | ✅ Done |
| Terms of Service page | ✅ Done |
| Footer links to Privacy + Terms | ✅ Done |
| GDPR: Only essential session cookies | ✅ (no tracking cookies used) |
| GDPR: Data export functionality | ✅ (Settings → Export JSON) |
| GDPR: User data deletion on request | ⚠️ Manual only — need self-serve account deletion |
| Cookie consent banner | ✅ Not needed (only essential cookies) |
| Terms acceptance at signup | ⚠️ Not currently required — add "By signing in you agree to..." text |
| Data processing agreement | ⚠️ Needed when adding third-party processors |
| Age verification | ⚠️ Should add "18+ only" to Terms (services) |

---

## UX/UI Assessment

### Desktop
- Clean, professional aesthetic ✅
- Good information hierarchy ✅
- Fast invoice creation flow ✅
- Settings are well-organised ✅
- Invoice table with sort/filter ✅

### Mobile (newly implemented)
- Bottom navigation bar ✅
- Invoice list as cards ✅
- Stacked full-width filters ✅
- Full-screen editor modal ✅
- Bottom sheet modals ✅
- FAB for new invoice ✅

### Areas for Further UX Improvement
1. **Invoice editor scroll**: Long invoices need sticky totals bar (already has this on desktop — verify on mobile)
2. **Empty state CTA**: "Create your first invoice" button in empty list state
3. **Keyboard shortcuts**: Cmd+S to save, Esc to close editor
4. **Loading states**: Skeleton loaders for invoice list loading
5. **Error states**: Better error messaging for API failures
6. **Onboarding skip**: Allow users to bypass onboarding entirely if they want to explore first

---

## Next Immediate Steps (Recommended)

1. **Add "By signing in, you agree to our Terms of Service and Privacy Policy" text** to login card — GDPR best practice
2. **Invoice auto-number** — implement auto-incrementing invoice numbers based on prefix + date + sequence
3. **Email invoice** — add "Send by email" button to invoice actions (start with mailto: link, then SMTP)
4. **Dashboard charts** — implement after stats strip removal. Simple bar/line charts for paid/outstanding by month
5. **Account deletion** — self-serve account deletion in Settings (GDPR right to erasure)
