# Bills App – Test Report

**Date:** 2026-02-24  
**Scope:** API, data flow, UI (Bills list), Export. Manual check for Editor + PDF.

---

## 1. Backend API (all passed)

| Test | Method | Endpoint | Result |
|------|--------|----------|--------|
| List companies (empty) | GET | /api/companies | 200, [] |
| Create company | POST | /api/companies | 201, body with id, name, legalAddress, reg no., VAT, phone, email |
| Create customer | POST | /api/customers | 201, body with id, name, address, reg no., VAT |
| Create service | POST | /api/services | 201, body with id, name, unit, defaultVatPercent, lastPrice, measure |
| List companies | GET | /api/companies | 200, 1 company |
| List customers | GET | /api/customers | 200, 1 customer |
| Create bill | POST | /api/bills | 201, body with id, number "Nr. 1", date, companyId, customerId, items[], subtotal, totalVat, totalGross |
| List bills | GET | /api/bills | 200, 1 bill with same data |
| Get bill by id | GET | /api/bills/:id | 200, full bill |
| Update bill | PUT | /api/bills/:id | 200, updated description |
| Get settings | GET | /api/settings | 200 |
| Update settings | PUT | /api/settings | 200 |
| Export | GET | /api/export | 200, JSON with companies, customers, services, bills, settings, exportedAt |

---

## 2. Frontend (manual)

- **Bills list:** After reload, table shows one bill: Nr. 1, 2025-02-24, Acme Corp, 121.00. Open and Delete buttons present.
- **Customer filter:** Dropdown includes "Acme Corp" (loaded from API).
- **Navigation:** Bills / New bill / Settings switch views; hash routing works (#/, #/new, #/settings, #/bill/:id).
- **Editor + PDF:** Guard added so PDF is only generated when a bill is loaded (avoids errors when opening editor by link before data is fetched).

---

## 3. Suggested manual checks

1. **Settings:** Add/edit company, add customer (modal), add service (inline row), Save. Reload and confirm data persists.
2. **New bill:** Create bill, click company/customer blocks → select or add new, add line (choose service from dropdown), change qty/price, confirm totals, Save. Check bill appears in list.
3. **Open bill:** Click Open on a bill, confirm form and totals, click PDF → PDF downloads with Latvian labels.
4. **Export/Import:** Settings → Export JSON, save file. Clear data (or use another browser), Import JSON, confirm companies/customers/bills reappear.

---

## 4. Files created during test

- `test-export.json` (in project root) – sample export from GET /api/export. Safe to delete.

---

**Conclusion:** Backend and bills list behaviour are verified. Editor, Save, and PDF depend on async load; guard added for PDF. Full flow (Settings → New bill → Save → PDF, Export/Import) should be verified manually in the browser.
