# Qlynton — Prioritized Product TODO List

> **Status:** Many UI and bug items below are already implemented; see **`TODO.md`** in the repo root for the current **done / pending** checklist (kept up to date). This file stays as a longer product backlog and approach notes.

> **Last Updated:** March 2026
> **Tech Stack:** Node.js/Express · Vanilla JS (no framework) · Firebase/Firestore · Google OAuth · Responsive CSS (Light/Dark theme)
> **Platforms:** Web app · Desktop (Electron)

---

## 📋 Overview

This document organizes 27 tasks across 5 priority groups, ranked by impact to user experience, business value, and technical feasibility. Each task includes background context and recommended approach based on codebase analysis and industry best practices.

---

## 🐛 Bug Fixes

### 1. **Onboarding: "Add item" Modal Cancel Does Not Close Dialog**
- **Issue:** In onboarding wizard (steps 3-5: Services, Customers), clicking "Cancel" on "Add [item]" modal does not properly return to the setup step. Modal state is not cleared.
- **Why it matters:** Foundational UX friction for new users; blocks entire onboarding flow if modal is triggered.
- **Approach:**
  - Review `onboarding.js` modal lifecycle (lines 195–220 approx.) and modal close handlers
  - Ensure `hideModal()` properly clears state: `window.modalDirty = false; window.modalIsNew = false`
  - Verify backdrop click and ESC key handlers work correctly to close modals
  - Check that modal overlay class `.hidden` is applied correctly in all close paths
  - Add test case: Open onboarding → Step 3 (Services) → Click "Add service" → Click Cancel → Verify modal closes and step is still visible

### 2. **My Invoices Table: Full-Width Layout Shifted Out of Container**
- **Issue:** Invoice table (`#view-bills .table-wrap`) is misaligned; horizontal scroll or margin/padding issue pushes table outside viewport on desktop.
- **Why it matters:** Layout break; affects core feature readability and professional appearance.
- **Approach:**
  - Audit CSS for `.view-body`, `.table-wrap`, `.table` (check `style.css` lines ~500–550)
  - Verify `--content-padding-x: 24px` is applied correctly to `.main` or view container
  - Check for negative margins or width: 100% without box-sizing on table wrapper
  - Test with various viewport widths (1024px, 1440px, mobile) in Firefox, Chrome, Safari
  - Consider if table needs `overflow-x: auto` wrapper or if layout constraint is incorrect
  - Verify mobile layout doesn't apply unwanted overflow styles on desktop

### 3. **Dialog Translations Missing in Latvian**
- **Issue:** Some modals (e.g., discount editor, add line item) still show Latvian text hardcoded instead of using i18n keys.
- **Why it matters:** Inconsistent language experience; UX gap for LV users.
- **Approach:**
  - Search codebase for all modal content generation (`showModal()` calls in `bill-editor.js`, `settings.js`)
  - Audit `i18n.js` to ensure all modal strings are defined for all three locales (LV, EN, RU)
  - Replace hardcoded Latvian strings with `typeof t === 'function' ? t('key') : fallback` pattern
  - Test modal rendering in all three language modes (switch language in Settings, reload, open modals)
  - Priority: discount editor, add/edit line, add/edit service, add/edit customer modals

### 4. **Dark Mode Autofill: Browser Autofill Overrides Dark Theme**
- **Issue:** Chrome autofill (e.g., name, email fields) applies light blue background with dark text, breaking dark mode aesthetics.
- **Why it matters:** Visual polish; affects perceived quality in dark mode (significant % of users).
- **Approach:**
  - Use CSS to style autofilled inputs with `-webkit-autofill` selector
  - Apply `-webkit-text-fill-color` for text and `-webkit-box-shadow` inset to override background (reference: MDN :autofill pseudo-class)
  - Target all relevant inputs: company name, customer name, email, phone, address fields
  - Use CSS variables to match dark theme colors dynamically
  - Example pattern:
    ```css
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
      -webkit-text-fill-color: var(--color-text);
      -webkit-box-shadow: 0 0 0px 1000px var(--color-surface) inset;
    }
    ```
  - Test in Chrome, Edge, Firefox, Safari (note: Safari ignores autofill styling by design)

### 5. **New Invoice "Cancel" Button Behavior Inconsistency**
- **Issue:** Editor "Cancel" button behavior may not align with onboarding (click closes without prompt vs. unsaved changes confirmation).
- **Why it matters:** Consistency; prevents accidental data loss.
- **Approach:**
  - Verify `#btn-editor-close` in `bill-editor.js` calls `closeEditor()` which triggers unsaved changes check
  - Ensure `window.editorDirty` is set correctly on all field changes (keyup, change events)
  - Compare with modal cancel handlers in settings.js (should follow same pattern)
  - Test workflow: Create new invoice → Add line → Click Close → Verify confirmation dialog appears

### 6. **Mobile Table Borders: Cleanup Expanded Row Styles**
- **Issue:** Code comment indicates partial border removal in mobile expanded rows; leftover CSS needs cleanup (partially commented out in `#view-bills` table).
- **Why it matters:** Technical debt; prevents proper mobile rendering.
- **Approach:**
  - Search `style.css` for commented-out mobile table border rules
  - Determine intended design: should expanded rows have visible borders or not?
  - If removing borders: implement CSS rule for mobile breakpoint that removes/hides borders on expanded rows
  - Add CSS class (e.g., `.expanded-row-mobile`) to toggle border visibility via media query
  - Test on iOS Safari, Android Chrome, and desktop to ensure no visual regression

---

## 🎨 UI/UX Polish

### 7. **Logo Color: Replace Green with White**
- **Issue:** Logo uses green color (#0f766e) per branding; spec requires all logos to be white (never agreed on green).
- **Why it matters:** Brand consistency; professional appearance; dark mode compatibility.
- **Approach:**
  - Find all logo instances: auth page `.auth-login-logo`, header `.header-logo`, onboarding `.onb-logo`, loading screen `.app-loading-logo`
  - Verify if logos are CSS-based text (current approach) or image files
  - If text-based: change color to white (`color: #ffffff` or `color: white`)
  - If images: ensure SVG/PNG logos use white fill; convert if necessary
  - Recalculate logo size using UX best practices:
    - Desktop header: 24–32px height recommended
    - Auth page hero: 48–64px for prominence
    - Mobile: scale down to 20–24px to preserve space
  - Test contrast: white logo on light backgrounds may require drop shadow or outline
  - Consider light theme: may need dark logo or solid background treatment on light backgrounds

### 8. **Filters: Apply on Select (Not Click "Apply" Button)**
- **Issue:** Current UX requires manual "Apply" button click after setting filters; should apply immediately on select for better reactivity.
- **Why it matters:** Modern UX; reduces clicks; faster discovery.
- **Approach:**
  - In `bills-list.js`, add event listeners to filter inputs: `change` event on selects, `input` event on text/date fields
  - Call `applyFilters()` and `renderBillsTable()` on each change (instead of waiting for "Apply" button)
  - Auto-set `filter-date-to` to today when `filter-date-from` is selected (if not already set):
    ```javascript
    document.getElementById('filter-date-from').addEventListener('change', (e) => {
      if (e.target.value && !document.getElementById('filter-date-to').value) {
        document.getElementById('filter-date-to').value = new Date().toISOString().slice(0, 10);
        // trigger re-filter
      }
    });
    ```
  - Keep "Apply" button for mobile if UX requires explicit action, or rebrand as "Clear filters" button (see task #20)
  - Test performance: if bill list is large (1000+), may need debouncing on search input (300ms)

### 9. **Filters: Remove "Apply" Button, Add "Clear Filters" Button**
- **Issue:** After implementing auto-apply (task #8), the "Apply" button becomes redundant. Users should have explicit way to clear all filters.
- **Why it matters:** Clearer action; users can quickly reset to full list view.
- **Approach:**
  - Replace "Apply" button HTML in `index.html` line ~220 with `<button id="btn-clear-filters" data-i18n="bills.clearFilters">Clear filters</button>`
  - Add translation key to `i18n.js`: `'bills.clearFilters': 'Clear filters'` (all locales)
  - In `bills-list.js`, add click handler:
    ```javascript
    document.getElementById('btn-clear-filters').addEventListener('click', () => {
      document.getElementById('filter-search').value = '';
      document.getElementById('filter-date-from').value = '';
      document.getElementById('filter-date-to').value = '';
      document.getElementById('filter-customer').value = '';
      document.getElementById('filter-status').value = '';
      // trigger re-filter
      refreshBillsList();
    });
    ```
  - Test: Apply filters → Click "Clear filters" → Verify all bills reappear

### 10. **Filters: Allow Clearing Individual Filters**
- **Issue:** Users cannot easily clear a single filter without clearing all; adds friction.
- **Why it matters:** Incremental refinement UX; power user feature.
- **Approach:**
  - Add small "X" or clear button (icon) inside each filter field or next to dropdown/input
  - Use Material Design icon: `<span class="material-symbols-outlined">close</span>`
  - Style as icon button with low visual weight (gray, appears on hover in light mode)
  - Add click handler to each clear button to empty that specific field value
  - Alternatively: add `list-style: none` and render filter pills as removable chips (more modern, used on mobile)
  - Test on mobile: ensure buttons don't conflict with touch targets

### 11. **Filters: Visual Redesign (Remove Green, Use Bold Text)**
- **Issue:** Selected filters use green background color; redesign uses bold text indicator instead (per design spec).
- **Why it matters:** Consistency with revised design language; reduce color usage.
- **Approach:**
  - Find green color in selected filter state (likely `--color-accent` or `--color-primary` applied to filter pill)
  - Replace with bold/font-weight: 700 for active/selected state
  - Update CSS classes: `.filter-preset-btn.active` or `.filter-applied` should use `font-weight: bold` instead of `background-color: green`
  - If using pill/chip style: keep background subtle (light gray), bold text for contrast
  - Test all filter states: default, hover, active/selected, disabled
  - Verify readability in both light and dark themes

### 12. **Desktop Filters: Use Same Pill/Button Style as Mobile**
- **Issue:** Desktop filter presets use different visual treatment than mobile; should be unified.
- **Why it matters:** Consistent design language; reduced CSS maintenance.
- **Approach:**
  - Review mobile filter preset styles (if separate breakpoint)
  - Unify `.filter-preset-btn` styling across all viewports
  - If mobile uses pill/chip style (rounded, light background, border): apply same to desktop
  - Ensure spacing and sizing work well in both layouts (desktop: horizontal row, mobile: grid or stack)
  - Test at breakpoints: 320px (mobile), 768px (tablet), 1440px (desktop)

### 13. **Navbar: Move Language & Theme Icons to Settings Only**
- **Issue:** Language and theme toggles currently in navbar/header (`#nav-lang-btn`, `#nav-theme-btn`); should be in Settings page only.
- **Why it matters:** Cleaner header; settings are in one place; reduces cognitive load.
- **Approach:**
  - In `index.html`, keep navbar icons for now (can hide with `hidden` class or `display: none` via CSS)
  - Verify Settings page (`#view-settings`) already has theme and language selects (lines ~276–302)
  - If icons are used elsewhere: add conditional display based on view (only show on settings view)
  - Remove navbar language dropdown click handlers from `app.js` (lines ~244–268) or wrap in conditional
  - Update mobile bottom nav: ensure no duplicated controls
  - Test all views: verify theme and language controls work in Settings

### 14. **Mobile Bottom Nav: Replace "Settings" with "Add Customer" FAB, Move Settings to Top**
- **Issue:** Mobile bottom nav has Settings button (line ~385); redesign moves Settings to top icon, replaces bottom nav item with "Add Customer" FAB.
- **Why it matters:** Mobile UX improvement; faster access to primary action (create customer); Settings less frequently used.
- **Approach:**
  - In `index.html` bottom nav: change the "Settings" item to "Add Customer" with plus icon
  - Move Settings to header area: either as icon button in top-right or collapsible menu
  - Test mobile layout: ensure header icon doesn't conflict with other controls
  - Update mobile CSS: `bottom-nav` may need layout adjustment if only 2 items remain
  - Consider if "Add Customer" should open a modal or navigate to Settings page
  - Test iOS and Android: bottom nav safe area, FAB placement

### 15. **Settings Page: Replace "Add [Specific]" Labels with "[+ Add]"**
- **Issue:** Section headers show "Add Company", "Add Customer", etc.; spec requires unified "[+ Add]" label.
- **Why it matters:** Visual consistency; cleaner header presentation.
- **Approach:**
  - In `settings.js`, audit `renderCompanies()`, `renderCustomers()`, `renderServices()` functions (lines ~147–300+)
  - Find where section action buttons are created with i18n keys like `'settings.addCompany'`, `'settings.addCustomer'`
  - Update i18n labels or button text to `'[+ Add]'` format (single, reusable label)
  - Alternative: keep specific labels but prefix all with "[+ " and suffix "]"
  - Test in all three languages: ensure "[+ Add]" is universal or translates properly (e.g., "[+ Pievienot]" in LV)

### 16. **Mobile Tables: Remove Expand/Collapse Dropdown, Show All Rows Expanded**
- **Issue:** Mobile table view uses expand/collapse for rows (dropdown toggle); spec requires all rows permanently expanded for easier scanning.
- **Why it matters:** Simplified mobile UX; faster information access; no interaction burden.
- **Approach:**
  - In `bills-list.js`, find expand/collapse logic (likely in `renderBillsTable()`)
  - Remove expand/collapse icon/button from mobile rows
  - Ensure all row details are always visible on mobile (may require CSS layout changes)
  - Use media query to hide `.expand-toggle` button on mobile (`@media (max-width: 768px)`)
  - Test on mobile: verify all row data is visible without scrolling horizontally
  - Ensure text wraps properly and doesn't overflow

### 17. **Invoice List: Add "Download PDF" Button Next to 3-Dots Menu**
- **Issue:** Invoice list row menu has 3-dots icon; should add separate "Download PDF" button for direct one-click access.
- **Why it matters:** Common action deserves prominent placement; reduces menu depth.
- **Approach:**
  - In `bills-list.js`, find row rendering code (likely `renderBillsTable()` around line ~200–250)
  - Add button before 3-dots menu: `<button class="btn btn-icon" aria-label="Download PDF"><span class="material-symbols-outlined">download</span></button>`
  - Add click handler to generate PDF and trigger download (reuse existing PDF generation logic from `pdf.js`)
  - Test: Click download button → PDF is generated and downloaded with name format `invoice_[number]_[date].pdf`
  - Consider icon + tooltip vs. icon + text based on space constraints

### 18. **Invoice List: Add Month/Year Labels Between Rows**
- **Issue:** Invoice list should have visual date separators; add bold text labels (e.g., "March 2026", "February 2026") between grouped rows by month.
- **Why it matters:** Better scannability; clearer time context.
- **Approach:**
  - In `bills-list.js`, modify `renderBillsTable()` to group bills by month
  - Before rendering each month group, insert a `<tr>` with class `table-month-separator`:
    ```javascript
    const monthLabel = new Date(bill.date).toLocaleDateString(window.APP_LOCALE, { year: 'numeric', month: 'long' });
    // Insert <tr><td colspan="6" class="table-month-separator"><strong>monthLabel</strong></td></tr>
    ```
  - Style `.table-month-separator` in CSS: `font-weight: bold`, `padding: 16px 0 8px`, `color: var(--color-text-muted)`
  - Test: Verify month labels appear between bill rows; ensure table zebra-striping (if used) doesn't interfere
  - Test sorting: when sorting by column other than date, verify month labels are removed or re-calculated

### 19. **Button Focus State: Add Border-Radius to Focus Outline**
- **Issue:** Focus outline on button clicks appears as sharp rectangle; should match button's border-radius (accessibility + aesthetics).
- **Why it matters:** Accessibility (WCAG 2.4.13); professional appearance; consistency.
- **Approach:**
  - In `style.css`, find button/input focus styles (search for `:focus`, `:focus-visible`)
  - Add `outline-offset: 2px` and `outline: 2px solid var(--color-border-focus)` with matching radius:
    ```css
    button:focus-visible,
    input:focus-visible,
    select:focus-visible {
      outline: 2px solid var(--color-border-focus);
      outline-offset: 2px;
      border-radius: var(--radius-sm); /* or specific value if different */
    }
    ```
  - Ensure outline respects button's `.btn-radius` (currently 10px per line 42)
  - Test: Tab through all interactive elements; verify outline is visible and follows rounded shape
  - Verify contrast ratio is at least 3:1 (current color should pass)

---

## ⚙️ Features

### 20. **Email Integration: Add "Mail To" with PDF Attachment, Editable Templates in Settings**
- **Issue:** Users must manually download PDF and send email; app should support sending invoices directly via email with customizable subject/body templates.
- **Why it matters:** Critical invoicing workflow; significantly improves user experience; increases payment collection speed.
- **Approach:**

  **Phase 1: Client-Side (Initial)**
  - Add "Email invoice" button to invoice actions row (next to PDF download)
  - Clicking opens email compose modal with:
    - To: field (pre-filled from customer email if available, make editable)
    - Subject: field (pre-filled from template)
    - Body: textarea (pre-filled from template)
    - PDF preview checkbox (toggle to include attachment in intent)
  - Use `mailto:` link as initial implementation (opens default mail client):
    ```javascript
    const mailto = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
    ```
  - Limitation: `mailto:` cannot attach files; inform users to download PDF separately or implement server-side solution

  **Phase 2: Settings & Templates**
  - Add "Email Settings" section in Settings page:
    - Default email subject template: e.g., `"Invoice {{invoiceNumber}} - {{companyName}}"`
    - Default email body template: e.g., `"Dear {{customerName}},\n\nPlease find attached invoice {{invoiceNumber}}..."`
    - Test template rendering with placeholders
  - Store templates in `api.getSettings()` / `api.putSettings()`
  - Allow users to save/edit custom templates in a modal

  **Phase 3: Server-Side (Advanced)**
  - Implement SMTP integration on server (use `nodemailer` npm package)
  - Add `/api/send-invoice-email` POST endpoint (requires auth)
  - Handle: PDF generation, SMTP configuration, error handling, rate limiting
  - Requires additional env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`
  - Send email with invoice PDF as attachment
  - Track email send status in bill object (optional: `sentAt`, `emailsSent` count)

  **Technical Recommendations** (from research):
  - Email HTML should be plain text or simple HTML (< 100KB total size)
  - Use responsive email template: 600px width, semantic HTML
  - Test across Gmail, Outlook, Apple Mail, mobile clients
  - Implement rate limiting: max 5 emails per 5 minutes per user
  - Log all email sends for audit trail

  **Dependencies:**
  - `nodemailer` for SMTP (npm install)
  - `html-to-text` for text-only fallback

### 21. **Google Drive Integration: Add Folder Selection, Permissions, and Monthly Folder Organization**
- **Issue:** No cloud storage integration; users must manage invoices locally.
- **Why it matters:** Backup, collaboration, professional document management; aligns with SaaS best practices.
- **Approach:**

  **Phase 1: Basic Google Drive Save**
  - Add "Save to Google Drive" button in invoice actions or settings
  - Authenticate with Google Drive API (requires `https://www.googleapis.com/auth/drive.file` scope)
  - Generate PDF, upload to user's Drive root or designated folder
  - Store Drive file ID in bill object for future retrieval/updates

  **Phase 2: Folder Selection**
  - Implement folder picker modal (Google Drive Picker API or custom folder list)
  - Allow user to select destination folder on first use or per-invoice
  - Remember last used folder for convenience
  - Create folder structure if needed: `/Qlynton Invoices/` root

  **Phase 3: Monthly Folder Organization**
  - Add setting: "Organize invoices in monthly folders"
  - Configurable folder name format: e.g., `"{{year}}-{{month}}"` → `"2026-03"` or `"March 2026"`
  - On save, check if folder for current month exists; create if not
  - Upload invoice PDF to month folder automatically

  **Technical Recommendations** (from research):
  - Use `drive.file` scope (narrow, per-file access) instead of full Drive scope
  - Implement incremental auth: request Drive permissions only when user first clicks "Save to Drive"
  - Handle rate limiting: Google Drive API allows 1000 queries/100 seconds per user
  - Cache folder structure to reduce API calls
  - Provide offline indication if Drive is unavailable

  **Implementation Steps:**
  1. Install Google Drive API client: `npm install googleapis`
  2. Add Drive scope to passport Google OAuth strategy
  3. Create `/api/drive/folders` endpoint to list user's Drive folders
  4. Create `/api/drive/upload-invoice` endpoint: accepts bill ID, returns file ID
  5. Store `driveFileId` in bill object
  6. Add UI in Settings for folder selection and format configuration
  7. Test: Create invoice → Click "Save to Drive" → Verify file appears in Drive

### 22. **Banks List: Add European Banks with Login URLs, Multi-Country Support**
- **Issue:** Onboarding "Banking" step (step 2) mentions banking but doesn't provide bank selection; needs list of major European banks.
- **Why it matters:** Educational value; helps users set up banking context; internationalization support.
- **Approach:**

  **Phase 1: Static Banks List**
  - Create banks database (JSON or Firebase collection) with:
    - Bank name (EN, LV, RU translations)
    - Country code (LV, SE, DK, DE, NL, etc.)
    - Login URL (e.g., `https://www.swedbank.lv/`)
    - Logo URL (optional)
    - IBAN code (e.g., `LV`)
  - Add "Select your bank" dropdown in onboarding step 2
  - When bank selected, show "Go to Bank Login" button that opens bank URL in new tab
  - Also add "Other / Not listed" option
  - Store selected bank in company settings (optional)

  **Phase 2: Multi-Country Support**
  - Add country selector above bank dropdown
  - Filter banks list by selected country
  - Support major EU countries: Latvia, Lithuania, Estonia, Sweden, Germany, Netherlands, etc.
  - Translate bank names and country names to all app languages

  **Phase 3: Link Integration (Optional)**
  - Store bank login URL in company object
  - Add quick link button in Settings: "Log in to [Bank]" → opens in new tab
  - Useful for recurring/batch payment processing

  **UX Pattern (from research):**
  - Use searchable dropdown (type-ahead) if list grows beyond 20 banks
  - Country selector as first step, then bank list filtered by country (reduces cognitive load)
  - Group banks by popularity: "Popular in [Country]" at top

  **Data Structure:**
  ```javascript
  {
    id: 'swedbank-lv',
    name: { en: 'Swedbank', lv: 'Swedbank', ru: 'Swedbank' },
    country: 'LV',
    loginUrl: 'https://www.swedbank.lv/',
    iban: 'LV',
    logo: 'https://...'
  }
  ```

  **Implementation:**
  1. Create `data/banks.json` with list of banks
  2. Add dropdown to onboarding step 2 HTML
  3. Add country filter logic in `onboarding.js`
  4. Add click handler to "Go to Bank" button: `window.open(bankLoginUrl)`
  5. Test: Go through onboarding → Select country → Select bank → Click "Go to Bank" → Verify URL opens

---

## 🔐 Auth & Account

### 23. **Custom Registration: Add Email/Password Sign-Up Flow**
- **Issue:** Currently Google OAuth only; no custom email/password option for users without Google accounts.
- **Why it matters:** Broader user base; offline registration; user autonomy.
- **Approach:**

  **Phase 1: Sign-Up Form UI**
  - Add "Sign up with email" option on login page (or separate tab/link)
  - Form fields:
    - Email (required, validate format)
    - Password (required, min 8 chars, strength indicator)
    - Password confirmation (show/hide toggle, removed if validation allows)
    - Company name (optional, pre-fill onboarding)
    - Checkbox: "I agree to Terms and Privacy" (required, linked to `/terms` and `/privacy`)
  - Validation rules (from UX research):
    - Email: valid format + uniqueness check on server
    - Password: min 8 chars, show requirements near field, offer "show/hide" toggle
    - Remove "confirm password" field (UX studies: 56% higher conversion without it)
  - Error messages: show inline after submit, allow user to retry without clearing filled fields

  **Phase 2: Backend Implementation**
  - Add `/auth/signup` POST endpoint in `server.js`
  - Hash password with `bcrypt` (npm install bcrypt)
  - Create user in Firebase Auth (or custom DB table for local dev)
  - Auto-login after signup (set session)
  - Return user object and CSRF token (same as Google OAuth flow)
  - Rate limiting: max 5 signup attempts per IP per hour (prevent enumeration attacks)

  **Phase 3: Email Verification (Optional)**
  - Send verification email with link (requires SMTP setup, see task #20)
  - User must click link to activate account
  - Store `emailVerified` flag in user object

  **Security Considerations:**
  - Use HTTPS only (enforce in production)
  - Hash passwords with bcrypt (salted, slow hashing)
  - Validate email format server-side
  - Store user IDs, not emails, in session
  - Implement CSRF protection (already done with X-CSRF-Token header)
  - Add rate limiting to prevent brute-force attacks

  **Implementation:**
  1. Create HTML form in `index.html` (add tab or separate section on auth page)
  2. Add form handling JS: validate client-side, send to `/auth/signup`
  3. Add backend endpoint: hash password, create user, return session
  4. Test: Sign up with email → Verify login works → Verify settings persisted

### 24. **Account Edit View: Pre-fill Google Profile Data, Allow Editing**
- **Issue:** Users logged in via Google cannot edit their profile (name, email, picture) in the app; data is read-only from OAuth.
- **Why it matters:** User autonomy; allows customization; accounts feel personal.
- **Approach:**

  **Phase 1: Account Settings Page**
  - Add "Account" or "Profile" section in Settings (alongside Companies, Customers, Services)
  - Display: Name, Email, Picture (avatar)
  - Allow edit: Name field editable; Email editable if email/password signup exists
  - Avatar: allow upload or use Google profile picture

  **Phase 2: Profile Data Storage**
  - Store profile info in Firebase user profile (`displayName`, `photoURL`)
  - Or create separate `users` collection with `id`, `email`, `name`, `picture`, `provider` (google/email)
  - Pre-fill form from stored profile on load

  **Phase 3: Edit & Save**
  - Name: editable text input, save via `/api/profile/update`
  - Email: editable only if not Google OAuth; requires verification on change
  - Picture: file upload or Google picture preview
  - Add save button, success toast feedback

  **Implementation:**
  1. Create `/api/profile/update` PUT endpoint (requires auth, validates input)
  2. Add HTML form section in Settings for account details
  3. Load user profile on Settings page load
  4. Add save handler: validate, send to `/api/profile/update`, show toast
  5. Test: Log in with Google → Go to Settings → Edit name → Save → Verify change persisted and reflected in nav bar

### 25. **Custom Login Form: Add Back Button, Forgot Password Page & Functionality**
- **Issue:** Login page is terminal (no back option); no forgot password flow for email/password users.
- **Why it matters:** User recovery; accessibility; standard UX pattern.
- **Approach:**

  **Phase 1: Back Button**
  - Add "Back" link/button on email/password login form (if separate from Google login)
  - Clicking "Back" returns to main login screen with Google + Email options
  - Clear form fields on back navigation (privacy)

  **Phase 2: Forgot Password Page**
  - New page: `/forgot-password` (accessible from login form link)
  - Form: email input + "Send reset link" button
  - User enters email → server sends password reset link via email (requires SMTP, task #20)
  - Link includes token valid for 1 hour: `/reset-password?token=xyz`

  **Phase 3: Password Reset Flow**
  - User clicks link in email → `/reset-password?token=xyz` page
  - Form: new password + confirm + "Reset password" button
  - Server validates token, verifies user, updates password
  - On success: redirect to login with "Password reset successful" message
  - On error: show "Link expired or invalid, request new link"

  **Technical Implementation:**
  - Generate reset tokens: `crypto.randomBytes(32).toString('hex')`, store in users table with `resetTokenExpiry`
  - Email reset link: `https://app.qlynton.lv/reset-password?token=...`
  - Validate token server-side, hash new password, clear token after use
  - Rate limit: max 3 reset requests per email per hour

  **Implementation Steps:**
  1. Add `/auth/forgot-password` GET (form page) and POST (send email) endpoints
  2. Add `/auth/reset-password` GET (form page) and POST (update password) endpoints
  3. Update auth login form to include "Forgot password?" link
  4. Test: Enter email → Receive reset email → Click link → Enter new password → Log in with new password

---

## 🏗️ Infrastructure / Settings

### 26. **Secure Credential Storage & Transfer: Review & Audit Best Practices**
- **Issue:** App uses Firebase Auth + Google OAuth; need to ensure credentials and sensitive data follow security best practices.
- **Why it matters:** User privacy; compliance (GDPR, regulations); prevent data breaches.
- **Approach:**

  **Audit Checklist:**
  - [ ] HTTPS enforced on all routes (production: check `secure` flag in cookie settings, line 86 `server.js`)
  - [ ] Session cookies: `httpOnly: true` (prevents JS access), `secure: true` (HTTPS only in prod)
  - [ ] CSRF protection: X-CSRF-Token header validated on all POST/PUT/DELETE (lines 132–139 `server.js`)
  - [ ] API authentication: All `/api/` routes require `requireAuth()` (line 146)
  - [ ] Password hashing: If email/password signup added (task #23), verify bcrypt with salt rounds ≥ 10
  - [ ] No secrets in code: Verify `.env` is in `.gitignore`, no API keys in `public/` folder
  - [ ] Firebase Rules: Review Firestore security rules (if using Firebase DB) to ensure user data isolation
  - [ ] Data encryption: PDFs stored locally or in Drive; ensure no PII in plaintext
  - [ ] Rate limiting: Implement on login attempts, signup, password reset (prevent brute-force)
  - [ ] Logging: Avoid logging passwords, tokens, or API keys
  - [ ] Google OAuth scope: Currently requesting `profile` + `email` (minimal, good)

  **Implementation:**
  1. Add rate limiting middleware (npm: `express-rate-limit`):
     - 5 attempts per 15 min on `/auth/login`
     - 3 attempts per hour on `/auth/signup`
  2. Review Firestore security rules (if applicable):
     - Users can only read/write their own data
     - Public reads disabled (except Terms/Privacy)
  3. Add HTTPS enforcement:
     - Redirect http → https in production
     - Add HSTS header (Force browser to use HTTPS)
  4. Test: Attempt to access API without auth → verify 401 response
  5. Test: Attempt rapid login requests → verify rate limit response

  **GDPR Compliance:**
  - [ ] Privacy Policy page includes: data collected, storage, retention, user rights
  - [ ] Terms of Service includes: age restriction (18+), acceptable use, limitation of liability
  - [ ] "I agree to Terms" checkbox on signup (required)
  - [ ] Data export: `/api/export` endpoint (already exists, task #26 verification)
  - [ ] Data deletion: Self-serve account deletion endpoint (see task #26b below)

### 27. **Multi-Company Support: Implement Per-Account Company Data Architecture**
- **Issue:** Current schema allows multiple companies per user, but no UI to switch between them; unclear if company isolation is enforced.
- **Why it matters:** Power user feature (freelancers managing multiple businesses); business growth enabler; requires careful data isolation.
- **Approach:**

  **Phase 1: Company Selector UI**
  - Add company dropdown in header or Settings page
  - Display: "Current company: [Company Name]" with dropdown to switch
  - Clicking dropdown shows list of user's companies
  - On select, reload page or update active company in session
  - Store active company ID in session or localStorage (sessionStorage if session-based)

  **Phase 2: Data Isolation**
  - Audit API endpoints to ensure company filtering:
    - `/api/bills` → filter by active company only (not all bills across all companies)
    - `/api/customers` → filter by active company only
    - `/api/services` → filter by active company only
    - `/api/invoices` → must include `companyId` in request
  - Add `companyId` field to all data operations (bills, customers, services)
  - Verify Firestore queries or database calls include company filter (security: prevent data leakage)

  **Phase 3: Invoice Generation**
  - Ensure invoice includes correct company details (header, footer, contact info)
  - On invoice creation, default company to active company, allow override
  - When switching companies, invoices should filter to that company's invoices only

  **Technical Considerations:**
  - Active company stored in session: `req.session.activeCompanyId`
  - All API calls auto-filter by company (add middleware to ensure this)
  - When retrieving bills/customers/services, append WHERE clause: `company_id = req.session.activeCompanyId`
  - Test data isolation: Create 2 companies with 2 users, verify user A cannot see user B's data or companies

  **Implementation Steps:**
  1. Add `activeCompanyId` to session/localStorage on login
  2. Add company selector dropdown in header
  3. Update API middleware to filter all queries by company
  4. Add company filter to: `/api/bills`, `/api/customers`, `/api/services`
  5. Test: Create company A + invoices → Create company B + invoices → Switch to A → Verify only A's invoices visible
  6. Test: Log in as different user → Verify cannot access other user's companies or data

---

## 🔄 Cross-Cutting Tasks (Not Prioritized Above)

These tasks are lower priority or dependencies of higher-priority work:

- **Create FAQ Page** (task #11 original): Questions about product, settings, how-to's. Best done after feature set stabilizes. Suggest post-launch.
- **Invoice Preview** (mentioned in ROADMAP): Rendered PDF thumbnail before sending. Depends on PDF generation optimization (task #20).
- **Dashboard with Graphs** (mentioned in ROADMAP): Outstanding, Paid this month, trend charts. Requires chart library (Chart.js, D3.js). Prioritize for Phase 2.

---

## 🎯 Top 5 Immediate Priorities (Next Sprint)

Based on impact to user experience and business value:

1. **Email Integration (Task #20)** — Critical invoicing workflow; enables core use case (sending invoices)
2. **Onboarding Modal Cancel Bug (Task #1)** — Foundational UX blocker; new users cannot complete setup
3. **My Invoices Table Layout (Task #2)** — Visual regression; affects core feature usability
4. **Custom Registration (Task #23)** — Expands addressable market; complements Google OAuth
5. **Filters: Auto-Apply + Clear Button (Tasks #8–9)** — Modern UX; high-frequency interaction; quick wins

---

## 📚 Research Sources

The following external resources informed technical recommendations:

### Email & Document Integration
- [Email Design Best Practices 2026 — Brevo](https://www.brevo.com/blog/email-design-best-practices/)
- [HTML Email Best Practices — Mailchimp](https://templates.mailchimp.com/getting-started/html-email-basics/)
- [Email Attachment Best Practices — Fyxer](https://www.fyxer.com/blog/sending-documents-by-email-template/)

### Google Drive & Cloud Integration
- [Google Drive API Roles & Permissions](https://developers.google.com/workspace/drive/api/guides/ref-roles)
- [Limited & Expansive Access in Google Drive](https://developers.google.com/workspace/drive/api/guides/limited-expansive-access)
- [Google Drive Permission Changes 2026](https://workspaceupdates.googleblog.com/2025/02/updating-access-experience-in-google-drive.html)

### UI/UX Design Patterns
- [Dropdown Menu Design Guide — UXPin](https://www.uxpin.com/studio/blog/dropdown-interaction-patterns-a-complete-guide/)
- [Better Country Selectors — UBOS](https://ubos.tech/news/better-country-selectors-a-modern-ux-solution/)
- [Multi-Country Bank Selection UX](https://www.smashingmagazine.com/2011/11/redesigning-the-country-selector/)
- [Mobile Banking App Design Best Practices 2026 — Purrweb](https://www.purrweb.com/blog/banking-app-design/)

### Dark Mode & Accessibility
- [CSS :autofill Pseudo-Selector — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:autofill)
- [Dark Mode Autofill Solutions — CSS-Tricks](https://css-tricks.com/snippets/css/change-autocomplete-styles-webkit-browsers/)
- [Focus Indicators Best Practices — Sara Soueidan](https://www.sarasoueidan.com/blog/focus-indicators/)
- [Focus Outline Accessibility Guide — Pope Tech](https://blog.pope.tech/2026/03/04/a-guide-to-accessible-focus-indicators/)
- [WCAG 2.4.13 Focus Appearance — AllAccessible](https://www.allaccessible.org/blog/wcag-2413-focus-appearance-guide/)

### Authentication & Registration
- [Login & Signup UX Guide 2025 — Authgear](https://www.authgear.com/post/login-signup-ux-guide/)
- [Registration Form Best Practices — FusionAuth](https://fusionauth.io/articles/identity-basics/registration-best-practices/)
- [Signup Form Design Patterns — Eleken](https://www.eleken.co/blog-posts/sign-up-flows/)
- [Best Practices for Registration Forms — Echobind](https://echobind.com/post/designing-signup-and-login-forms/)

---

**Document Version:** 1.0
**Created:** March 23, 2026
**For:** Qlynton Invoice App
**Status:** Ready for Sprint Planning
