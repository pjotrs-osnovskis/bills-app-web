# Bills App (Rēķini) – Project Plan

Latvian B2B invoice app: build, store, and export rēķini. Node + Express backend, JSON file storage, vanilla frontend. Designed for future GitHub + static hosting (e.g. Render).

---

## Stack

| Layer   | Choice |
|--------|--------|
| Backend | Node.js + Express |
| Database | JSON files in `data/` (bills.json, customers.json, companies.json, services.json, settings.json) |
| Frontend | Vanilla HTML, CSS, JS (single-page app in `public/`) |
| PDF | jsPDF (CDN), Latvian labels |
| Font | Poppins (Google Fonts) |
| Repo | Git + GitHub (hosting later: Render / Railway) |

---

## Data Model (JSON)

- **companies**: id, name, legalAddress, registrationNumber, vatNumber?, phone?, email?, logo? (url or base64)
- **customers**: id, name, address, registrationNumber?, vatNumber?, personalCode?
- **services**: id, name, unit (e.g. "hour", "pc"), defaultVatPercent (21/12/0), lastPrice, measure ("hourly" | "units")
- **bills**: id, number ("Nr. 1"), date, supplyDate?, companyId, customerId, basis?, description?, items[], subtotal, totalVat, totalGross, createdAt, updatedAt
- **settings**: nextBillNumber, defaultVatPercent?, defaultCompanyId?

---

## TODO List (Build Order)

1. **Project setup** – package.json, server.js, .gitignore, data/ + JSON read/write helper
2. **Backend API** – GET/POST/PUT/DELETE for companies, customers, services, bills, settings (JSON file CRUD)
3. **Frontend shell** – index.html, nav (Bills | New bill | Settings), Poppins CSS, view switching
4. **Settings** – Company form; Customers list + modal add/edit; Services list + inline add/edit
5. **Bills list** – Load from API, table, filters (date range, customer), Create / Open / Delete
6. **Bill editor** – Bill-shaped layout; click company/customer → modal (select or add); line items + service dropdown, add line, auto totals; Save
7. **PDF** – jsPDF, Latvian labels (Rēķins, Nr., Piegādātājs, Pircējs, etc.)
8. **Export/Import** – Export all data as JSON; Import from JSON (replace/merge)

---

## Latvian Compliance (Rēķins)

- Invoice must contain required info in Latvian (UI in English; PDF labels in Latvian).
- Fields: Nr., date, supplier & customer (name, address, reg no., VAT if applicable), description, line items (name, qty, unit, price, VAT, total), subtotal, VAT total, gross total.
- VAT: 21% standard; support 12%, 0% where applicable.
- No specific font required; using Poppins.

---

## File Layout

```
bills-app/
  PLAN.md           (this file)
  README.md
  .gitignore
  package.json
  server.js
  data/
    .gitkeep
    companies.json
    customers.json
    services.json
    bills.json
    settings.json
  public/
    index.html
    css/
      style.css
    js/
      app.js
      api.js
      views.js
      settings.js
      bills-list.js
      bill-editor.js
      pdf.js
```

---

## Hosting (Later)

- Push to GitHub.
- Connect repo to Render (or Railway): Web Service, Build `npm install`, Start `npm start`.
- Free tier: ephemeral disk; use Export/Import in app for backup, or add free Postgres for persistence.
