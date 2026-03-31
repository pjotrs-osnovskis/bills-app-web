let companies = [];
let customers = [];
let services = [];
let settingsData = {};
let customerIdsWithBills = new Set();
let settingsSidebarInitialized = false;

function getActiveSettingsSection() {
  const activeBtn = document.querySelector('.settings-sidebar-item.active');
  if (activeBtn && activeBtn.dataset.section) return activeBtn.dataset.section;
  const mobile = document.getElementById('settings-section-select');
  if (mobile && mobile.value) return mobile.value;
  return null;
}

function activateSettingsSection(target) {
  if (!target) return;
  if (target === 'email') target = 'drive';
  const items = document.querySelectorAll('.settings-sidebar-item');
  const sections = document.querySelectorAll('#view-settings .settings-section[data-section]');
  const mobileSelect = document.getElementById('settings-section-select');
  items.forEach((i) => i.classList.toggle('active', i.dataset.section === target));
  sections.forEach((s) => s.classList.toggle('hidden', s.dataset.section !== target));
  if (mobileSelect) mobileSelect.value = target;
}

function initSettingsSidebar() {
  if (settingsSidebarInitialized) return;
  settingsSidebarInitialized = true;

  const items = document.querySelectorAll('.settings-sidebar-item');
  const mobileSelect = document.getElementById('settings-section-select');

  items.forEach((item) => {
    item.addEventListener('click', () => activateSettingsSection(item.dataset.section));
  });

  if (mobileSelect) {
    mobileSelect.addEventListener('change', () => activateSettingsSection(mobileSelect.value));
  }
}

function applyClientDevHintsVisibility() {
  const show = typeof window !== 'undefined' && window.APP_SHOW_CLIENT_DEV_HINTS === true;
  document.querySelectorAll('.client-dev-hint-only').forEach((el) => {
    el.classList.toggle('hidden', !show);
  });
}
window.applyClientDevHintsVisibility = applyClientDevHintsVisibility;

async function refreshNavBankLinkData() {
  try {
    const companiesData = await api.getCompanies();
    companies = companiesData;
    updateNavBankLink();
  } catch (e) {
    console.error(e);
  }
}
window.refreshNavBankLinkData = refreshNavBankLinkData;

async function refreshSettings() {
  const viewSettings = document.getElementById('view-settings');
  const sectionToRestore =
    viewSettings && !viewSettings.classList.contains('hidden') ? getActiveSettingsSection() : null;
  initSettingsSidebar();
  try {
    const [companiesData, customersData, servicesData, settingsDataRes, billsData, accountData] = await Promise.all([
      api.getCompanies(),
      api.getCustomers(),
      api.getServices(),
      api.getSettings(),
      api.getBills(),
      api.getAccount().catch(() => null)
    ]);
    companies = companiesData;
    customers = customersData;
    services = servicesData;
    settingsData = settingsDataRes || {};
    customerIdsWithBills = new Set((billsData || []).map((b) => b.customerId).filter(Boolean));
    syncAccountSection(accountData);
    renderCompanies();
    renderCustomers();
    renderServices();
    syncLanguageSelects();
    syncThemeSelect();
    updateNavBankLink();
  } catch (e) {
    console.error(e);
  } finally {
    if (
      sectionToRestore &&
      viewSettings &&
      !viewSettings.classList.contains('hidden')
    ) {
      activateSettingsSection(sectionToRestore);
    }
  }
}

function updateNavBankLink() {
  const navLink = document.getElementById('nav-bank-link');
  if (!navLink) return;
  const defaultCo = companies.find((c) => c.isDefault) || companies[0] || null;
  let href = '';
  let bankName = '';
  if (defaultCo) {
    if (defaultCo.bankId && typeof window.BANK_LIST !== 'undefined') {
      const bank = window.BANK_LIST.find((b) => b.id === defaultCo.bankId);
      if (bank && bank.loginUrl) { href = bank.loginUrl; bankName = getBankInputLabel(bank); }
    }
    if (!href && defaultCo.bankUrl) { href = defaultCo.bankUrl; bankName = defaultCo.bankName || ''; }
  }
  if (href) {
    navLink.href = href;
    const baseLabel = typeof t === 'function' ? t('settings.bankGoLink') : 'Go to online banking';
    const label = bankName ? baseLabel + ' — ' + bankName : baseLabel;
    navLink.title = label;
    navLink.setAttribute('aria-label', label);
    navLink.classList.remove('hidden');
  } else {
    navLink.href = '#';
    navLink.classList.add('hidden');
  }
}
window.updateNavBankLink = updateNavBankLink;

let _accountOriginalName = '';

function syncAccountSection(account) {
  const section = document.getElementById('settings-account-section');
  const nameEl = document.getElementById('account-name');
  const emailEl = document.getElementById('account-email');
  const hintLocal = document.getElementById('account-email-hint-local');
  const hintGoogle = document.getElementById('account-email-hint-google');
  const wrapLocal = document.getElementById('account-password-local-wrap');
  const wrapGoogle = document.getElementById('account-password-google-wrap');
  const saveBtn = document.getElementById('btn-save-account');
  if (!section || !nameEl || !emailEl || !hintLocal || !hintGoogle || !wrapLocal || !wrapGoogle) return;
  if (!account) {
    section.classList.add('settings-account-no-data');
    return;
  }
  section.classList.remove('settings-account-no-data');
  nameEl.value = account.name || '';
  _accountOriginalName = account.name || '';
  emailEl.textContent = account.email || '';
  const isLocal = account.authProvider === 'local';
  hintLocal.classList.toggle('hidden', !isLocal);
  hintGoogle.classList.toggle('hidden', isLocal);
  wrapLocal.classList.toggle('hidden', !isLocal);
  wrapGoogle.classList.toggle('hidden', isLocal);
  // Reset dirty state
  if (saveBtn) saveBtn.classList.add('hidden');
}

async function refreshNavUserLabel() {
  try {
    const user = await api.getAuth();
    const el = document.getElementById('nav-user-account');
    if (el && user) el.textContent = user.name || user.email || user.id;
  } catch (e) {}
}

function initAccountSettings() {
  const btn = document.getElementById('btn-save-account');
  const nameEl = document.getElementById('account-name');
  if (!btn || !nameEl) return;
  // Show save button only when the name value changes
  nameEl.addEventListener('input', () => {
    const isDirty = nameEl.value.trim() !== _accountOriginalName.trim();
    btn.classList.toggle('hidden', !isDirty);
  });
  btn.addEventListener('click', async () => {
    const name = nameEl.value.trim();
    const body = { name };
    try {
      await api.putAccount(body);
      _accountOriginalName = name;
      btn.classList.add('hidden');
      if (typeof window.showToast === 'function') {
        window.showToast({ message: typeof t === 'function' ? t('msg.saved') : 'Saved', type: 'success' });
      }
      await refreshNavUserLabel();
    } catch (e) {
      if (typeof window.showToast === 'function') {
        window.showToast({
          message: (typeof t === 'function' ? t('msg.saveFailed') : 'Save failed') + ': ' + (e.message || e),
          type: 'error',
          duration: 6000
        });
      } else {
        alert((typeof t === 'function' ? t('msg.saveFailed') : 'Save failed') + ': ' + (e.message || e));
      }
    }
  });
}

function openPasswordResetModal() {
  const overlay = document.getElementById('modal-password-reset-overlay');
  const emailTarget = document.getElementById('password-reset-modal-email');
  const accountEmail = document.getElementById('account-email');
  if (emailTarget && accountEmail) emailTarget.textContent = accountEmail.textContent || '';
  if (overlay) overlay.classList.remove('hidden');
}

function closePasswordResetModal() {
  const overlay = document.getElementById('modal-password-reset-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function initPasswordResetModal() {
  const openBtn = document.getElementById('btn-open-password-reset');
  const cancelBtn = document.getElementById('btn-password-reset-cancel');
  const sendBtn = document.getElementById('btn-password-reset-send');
  const overlay = document.getElementById('modal-password-reset-overlay');
  if (openBtn) openBtn.addEventListener('click', openPasswordResetModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closePasswordResetModal);
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePasswordResetModal();
    });
  }
  if (sendBtn) {
    sendBtn.addEventListener('click', async function () {
      const emailEl = document.getElementById('account-email');
      const email = emailEl ? emailEl.textContent.trim() : '';
      if (!email) return;
      sendBtn.disabled = true;
      try {
        const data = await api.postForgotPassword(email);
        const msg = (data && data.message) ? data.message : (typeof t === 'function' ? t('account.passwordResetSentGeneric') : 'If an account exists, a reset link has been sent.');
        if (typeof window.showToast === 'function') {
          window.showToast({ message: msg, type: 'info', duration: 6000 });
        }
        closePasswordResetModal();
      } catch (e) {
        if (typeof window.showToast === 'function') {
          window.showToast({ message: e.message || String(e), type: 'error', duration: 6000 });
        }
      } finally {
        sendBtn.disabled = false;
      }
    });
  }
}

function initAccountTranslationsSync() {
  const orig = window.applyTranslations;
  if (typeof orig !== 'function') return;
  window.applyTranslations = function () {
    orig.apply(this, arguments);
    applyClientDevHintsVisibility();
    const v = document.getElementById('view-settings');
    if (v && !v.classList.contains('hidden')) {
      api.getAccount().then(syncAccountSection).catch(() => {});
    }
  };
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function getBankDisplayName(bank) {
  if (!bank) return '';
  return (bank.legalName || bank.name || '').trim();
}

function getBankInputLabel(bank) {
  if (!bank) return '';
  const legalName = (bank.legalName || bank.name || '').trim();
  if (!bank.country || typeof window.BANK_LIST === 'undefined') return legalName;
  const sameName = window.BANK_LIST.filter((b) => b.name === bank.name);
  if (sameName.length > 1) return legalName + ' (' + bank.country + ')';
  return legalName;
}

function getBankLabelForDropdown(bank) {
  if (!bank) return '';
  const base = getBankDisplayName(bank);
  const sw = (bank.swiftBic || '').trim();
  return sw ? base + ' — ' + sw : base;
}

function sanitizePrefix(val) {
  if (val == null || typeof val !== 'string') return '';
  return String(val).replace(/[^A-Za-z0-9]/g, '');
}

const SERVICE_UNIT_OPTIONS = [
  { value: 'hour', label: 'St.' },
  { value: 'service', label: 'Pak.' },
  { value: 'pc', label: 'Gab.' }
];
window.SERVICE_UNIT_OPTIONS = SERVICE_UNIT_OPTIONS;

function getUnitLabelLatvian(unit, qty) {
  const n = Math.abs(parseFloat(qty));
  const mod10 = n % 10;
  const mod100 = n % 100;
  const singular = mod10 === 1 && mod100 !== 11;
  if (unit === 'hour') return singular ? 'stunda' : 'stundas';
  if (unit === 'service') return singular ? 'pakalpojums' : 'pakalpojumi';
  return singular ? 'gabals' : 'gabali';
}
window.getUnitLabelLatvian = getUnitLabelLatvian;

function serviceUnitToOption(unit, measure) {
  if (measure === 'hourly' || unit === 'hour') return 'hour';
  if (unit && SERVICE_UNIT_OPTIONS.some((o) => o.value === unit)) return unit;
  return 'pc';
}

async function saveCompanyFromModal(payload) {
  try {
    if (payload.id) {
      const id = payload.id;
      delete payload.id;
      await api.putCompany(id, payload);
    } else {
      delete payload.id;
      await api.postCompany(payload);
    }
    hideModal(true);
    await refreshSettings();
  } catch (e) {
    alert((typeof t === 'function' ? t('msg.saveFailed') : 'Neizdevās saglabāt') + ': ' + e.message);
  }
}

function closeAllSettingsDropdowns() {
  document.querySelectorAll('.actions-dropdown-menu').forEach((m) => {
    m.classList.add('hidden');
    m.style.position = '';
    m.style.top = '';
    m.style.left = '';
  });
  document.querySelectorAll('.btn-actions-trigger').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

function setupSettingsRowDropdown(rowEl, config) {
  const dropdownEl = rowEl.querySelector('.actions-dropdown');
  if (!dropdownEl) return;
  const trigger = dropdownEl.querySelector('.btn-actions-trigger');
  const menu = dropdownEl.querySelector('.actions-dropdown-menu');
  if (!trigger || !menu) return;
  const id = trigger.getAttribute('data-id');
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !menu.classList.contains('hidden');
    closeAllSettingsDropdowns();
    if (!isOpen) {
      menu.classList.remove('hidden');
      const rect = trigger.getBoundingClientRect();
      menu.style.position = 'fixed';
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.left = Math.max(24, Math.min(rect.right - 160, document.documentElement.clientWidth - 184)) + 'px';
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
  dropdownEl.querySelectorAll('.actions-dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      if (item.hasAttribute('disabled')) return;
      const action = item.getAttribute('data-action');
      if (action === 'edit') config.openModal(id);
      if (action === 'delete' && typeof window.scheduleRowDelete === 'function') {
        window.scheduleRowDelete({
          rowEl: rowEl,
          actionsEl: rowEl.querySelector('td.actions'),
          refreshFn: config.refreshFn,
          performDelete: () => config.doDelete(id, true),
          itemName: config.getItemName(id),
          delayMs: 5000,
          onUndoRestore: (r) => setupSettingsRowDropdown(r, config)
        });
      } else if (action === 'delete') {
        if (confirm(config.confirmDelete(id))) config.doDelete(id, false);
      }
      menu.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
    });
  });
}

const companyTableConfig = {
  openModal: (id) => openCompanyModal(id),
  doDelete: (id, skip) => doDeleteCompany(id, skip),
  getItemName: (id) => (companies.find((c) => c.id === id) || {}).name || (typeof t === 'function' ? t('settings.companyName') : 'Uzņēmums'),
  refreshFn: refreshSettings,
  confirmDelete: () => (typeof t === 'function' ? t('bills.confirmDelete') : 'Dzēst šo uzņēmumu?')
};

function renderCompanies() {
  const actionsEl = document.getElementById('companies-actions');
  const root = document.getElementById('companies-root');
  if (!root) return;
  if (actionsEl) {
    actionsEl.innerHTML = '<button type="button" class="btn btn-primary" id="btn-add-company">' + (typeof t === 'function' ? t('settings.addCompany') : 'Pievienot uzņēmumu') + '</button>';
    document.getElementById('btn-add-company').addEventListener('click', () => openCompanyModal(null));
  }
  const editLabel = typeof t === 'function' ? t('common.edit') : 'Rediģēt';
  const deleteLabel = typeof t === 'function' ? t('common.delete') : 'Dzēst';
  const colName = typeof t === 'function' ? t('settings.companyName') : 'Uzņēmuma nosaukums';
  const emptyMsg = typeof t === 'function' ? t('settings.companiesEmpty') : 'Uzņēmumu vēl nav. Pievienojiet, lai izmantotu rēķinos.';
  const showDefaultIndicator = companies.length > 1;
  root.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <colgroup><col><col style="width:80px"></colgroup>
        <thead>
          <tr>
            <th>${escapeHtml(colName)}</th>
            <th class="actions-col"></th>
          </tr>
        </thead>
        <tbody id="companies-tbody">
          ${companies.length === 0 ? '<tr><td colspan="2" class="list-empty">' + escapeHtml(emptyMsg) + '</td></tr>' : companies.map((c) => {
            return `
            <tr class="${showDefaultIndicator && c.isDefault ? 'row-default-company' : ''}">
              <td>${showDefaultIndicator && c.isDefault ? '<span class="company-default-star" aria-label="' + escapeHtml(typeof t === 'function' ? t('settings.companyDefaultStar') : 'Noklusējums') + '">★</span> ' : ''}${escapeHtml(c.name)}</td>
              <td class="actions">
                <div class="actions-dropdown">
                  <button type="button" class="btn btn-icon btn-ghost btn-actions-trigger" data-id="${escapeHtml(c.id)}" aria-haspopup="true" aria-expanded="false" title="${escapeHtml(editLabel)}" aria-label="${escapeHtml(editLabel)}"><span class="material-symbols-outlined" aria-hidden="true">more_vert</span></button>
                  <div class="actions-dropdown-menu hidden" role="menu">
                    <button type="button" role="menuitem" class="actions-dropdown-item" data-action="edit" data-id="${escapeHtml(c.id)}"><span class="material-symbols-outlined" aria-hidden="true">edit</span><span>${escapeHtml(editLabel)}</span></button>
                    <button type="button" role="menuitem" class="actions-dropdown-item actions-dropdown-item-danger" data-action="delete" data-id="${escapeHtml(c.id)}"><span class="material-symbols-outlined" aria-hidden="true">delete</span><span>${escapeHtml(deleteLabel)}</span></button>
                  </div>
                </div>
              </td>
            </tr>
          `; }).join('')}
        </tbody>
      </table>
    </div>
  `;
  const tbody = document.getElementById('companies-tbody');
  if (tbody) tbody.querySelectorAll('tr').forEach((tr) => { if (tr.querySelector('.actions-dropdown')) setupSettingsRowDropdown(tr, companyTableConfig); });
}

function attachCompanyRowListeners(rowEl) {
  setupSettingsRowDropdown(rowEl, companyTableConfig);
}

function initBankCombobox() {
  const wrap = document.getElementById('bank-combobox-wrap');
  const input = document.getElementById('company-bankName');
  const dropdown = document.getElementById('bank-combobox-dropdown');
  const hiddenId = document.getElementById('company-bankId');
  const bankUrlRow = document.getElementById('company-bankUrl-row');
  const bankUrlInput = document.getElementById('company-bankUrl');
  if (!wrap || !input || !dropdown || !hiddenId) return;
  if (typeof window.BANK_LIST === 'undefined' || typeof window.BANK_COUNTRIES === 'undefined') return;
  function toggleBankUrlRow() {
    if (!bankUrlRow) return;
    const hasSelectedBank = !!hiddenId.value;
    const hasCustomBankName = !!(input.value || '').trim();
    const hasCustomBankUrl = !!((bankUrlInput && bankUrlInput.value) || '').trim();
    bankUrlRow.style.display = (!hasSelectedBank && (hasCustomBankName || hasCustomBankUrl)) ? '' : 'none';
  }

  if (bankUrlInput) {
    bankUrlInput.addEventListener('input', toggleBankUrlRow);
  }

  let activeIndex = -1;

  function buildItems(query) {
    const q = (query || '').trim().toLowerCase();
    return window.BANK_LIST.filter((b) =>
      !q ||
      (b.legalName || b.name || '').toLowerCase().includes(q) ||
      ((b.swiftBic || '').toLowerCase().includes(q)) ||
      (window.BANK_COUNTRIES[b.country] || '').toLowerCase().includes(q)
    );
  }

  function renderDropdown(query) {
    const items = buildItems(query);
    const lbl = (k, fb) => (typeof t === 'function' ? t(k) : fb);
    let html = '';
    if (items.length) {
      const grouped = {};
      for (const b of items) {
        (grouped[b.country] = grouped[b.country] || []).push(b);
      }
      for (const cc of Object.keys(window.BANK_COUNTRIES)) {
        if (!grouped[cc]) continue;
        html += `<div class="bank-combobox-group-label">${escapeHtml(window.BANK_COUNTRIES[cc])}</div>`;
        for (const b of grouped[cc]) {
          const inputLabel = getBankInputLabel(b);
          const rowLabel = getBankLabelForDropdown(b);
          const swiftAttr = (b.swiftBic || '').trim();
          html += `<div class="bank-combobox-option" data-id="${escapeHtml(b.id)}" data-name="${escapeHtml(inputLabel)}" data-swift="${escapeHtml(swiftAttr)}">${escapeHtml(rowLabel)}</div>`;
        }
      }
    } else {
      html += `<div class="bank-combobox-empty">${escapeHtml(lbl('settings.bankNoResults', 'No banks found'))}</div>`;
    }
    html += `<div class="bank-combobox-option bank-combobox-option-custom" data-id="" data-name="${escapeHtml(query || '')}">${escapeHtml(lbl('settings.bankCustomOption', 'Custom / Other bank…'))}</div>`;
    dropdown.innerHTML = html;
    activeIndex = -1;
  }

  function openDropdown() {
    renderDropdown(input.value);
    dropdown.classList.remove('hidden');
  }

  function closeDropdown() {
    dropdown.classList.add('hidden');
    activeIndex = -1;
  }

  function pickOption(id, name, swiftFromData) {
    hiddenId.value = id || '';
    input.value = name || '';
    if (bankUrlInput && id) bankUrlInput.value = '';
    const swiftInp = document.getElementById('company-bankSwiftBic');
    if (swiftInp && id) {
      const sw = (swiftFromData || '').trim() || ((window.BANK_LIST.find((x) => x.id === id) || {}).swiftBic || '');
      if (sw) swiftInp.value = sw;
    }
    toggleBankUrlRow();
    closeDropdown();
    if (typeof window.modalDirty !== 'undefined') window.modalDirty = true;
  }

  input.addEventListener('focus', openDropdown);

  input.addEventListener('input', () => {
    hiddenId.value = '';
    toggleBankUrlRow();
    renderDropdown(input.value);
    dropdown.classList.remove('hidden');
    if (typeof window.modalDirty !== 'undefined') window.modalDirty = true;
  });

  dropdown.addEventListener('mousedown', (e) => {
    const opt = e.target.closest('.bank-combobox-option');
    if (!opt) return;
    e.preventDefault();
    pickOption(opt.dataset.id, opt.dataset.name, opt.dataset.swift || '');
  });

  input.addEventListener('blur', () => {
    setTimeout(closeDropdown, 160);
  });

  input.addEventListener('keydown', (e) => {
    const opts = Array.from(dropdown.querySelectorAll('.bank-combobox-option'));
    if (!opts.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, opts.length - 1);
      opts.forEach((o, i) => o.setAttribute('data-active', i === activeIndex ? 'true' : 'false'));
      opts[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      opts.forEach((o, i) => o.setAttribute('data-active', i === activeIndex ? 'true' : 'false'));
      opts[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const opt = opts[activeIndex];
      pickOption(opt.dataset.id, opt.dataset.name, opt.dataset.swift || '');
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  function outsideClick(e) {
    if (!wrap.contains(e.target)) {
      closeDropdown();
      document.removeEventListener('mousedown', outsideClick);
      if (window._bankComboOutsideHandler === outsideClick) window._bankComboOutsideHandler = null;
    }
  }
  if (window._bankComboOutsideHandler) {
    document.removeEventListener('mousedown', window._bankComboOutsideHandler);
    window._bankComboOutsideHandler = null;
  }
  window._bankComboOutsideHandler = outsideClick;
  document.addEventListener('mousedown', outsideClick);
  toggleBankUrlRow();
}

function openCompanyModal(id) {
  const co = id ? companies.find((x) => x.id === id) : null;
  const logoType = (co && co.logoType === 'image') ? 'image' : 'text';
  const showImageUpload = logoType === 'image';
  const hasUploadedLogo = logoType === 'image' && co && co.logo && co.logo.startsWith('/uploads/');
  let logoUrl = co && co.logoType === 'image' ? (co.logo || '') : '';
  const showImageRow = showImageUpload && !!logoUrl;
  const lbl = (k, fallback) => (typeof t === 'function' ? t(k) : fallback);
  showModal(`
    <h3>${co ? lbl('modal.companyEdit', 'Rediģēt uzņēmumu') : lbl('modal.companyNew', 'Pievienot uzņēmumu')}</h3>
    <div class="form-block form-modal-cols">
      <div class="field">
        <label>${lbl('settings.companyName', 'Uzņēmuma nosaukums')}</label>
        <input type="text" id="company-name" class="input" value="${co ? escapeHtml(co.name) : ''}" placeholder="${lbl('settings.companyNamePlaceholder', 'Izmanto rēķinu numuros')}">
      </div>
      <div class="field">
        <label>${lbl('settings.billPrefix', 'Prefikss')}</label>
        <input type="text" id="company-bill-prefix" class="input" value="${co ? escapeHtml(co.billPrefix || '') : ''}" placeholder="${lbl('settings.companyNamePlaceholder', 'Izmanto rēķinu numuros')}">
      </div>
      <div class="field field-full">
        <label class="checkbox-label">
          <input type="checkbox" id="company-isDefault" ${co && co.isDefault ? 'checked' : ''}>
          ${lbl('settings.defaultCompanyDescription', 'Noklusējuma uzņēmums (izmantots, veidojot jaunu rēķinu)')}
        </label>
      </div>
      <div class="field field-full">
        <label>${lbl('settings.legalAddress', 'Juridiskā adrese')}</label>
        <textarea id="company-legalAddress" class="input" placeholder="${lbl('settings.legalAddress', 'Juridiskā adrese')}">${co ? escapeHtml(co.legalAddress || '') : ''}</textarea>
      </div>
      <div class="field">
        <label>${lbl('settings.regNumber', 'Reģ. nr.')}</label>
        <input type="text" id="company-registrationNumber" class="input" value="${co ? escapeHtml(co.registrationNumber || '') : ''}" placeholder="${lbl('settings.regNumber', 'Reģistrācijas numurs')}">
      </div>
      <div class="field">
        <label>${lbl('settings.vatNumber', 'PVN numurs')}</label>
        <input type="text" id="company-vatNumber" class="input" value="${co ? escapeHtml(co.vatNumber || '') : ''}" placeholder="${lbl('settings.vatNumber', 'PVN numurs')}">
      </div>
      <div class="field">
        <label>${lbl('settings.phone', 'Tālrunis')}</label>
        <input type="text" id="company-phone" class="input" value="${co ? escapeHtml(co.phone || '') : ''}" placeholder="${lbl('settings.phone', 'Tālrunis')}">
      </div>
      <div class="field">
        <label>${lbl('settings.email', 'E-pasts')}</label>
        <input type="email" id="company-email" class="input" value="${co ? escapeHtml(co.email || '') : ''}" placeholder="${lbl('settings.email', 'E-pasts')}">
      </div>
      <div class="field">
        <label>${lbl('settings.websiteLabel', 'Mājaslapa')}</label>
        <input type="url" id="company-website" class="input" value="${co ? escapeHtml(co.website || '') : ''}" placeholder="${lbl('settings.website', 'https://...')}">
      </div>
      <div class="field">
        <label>${lbl('settings.logo', 'Logo')}</label>
        <select id="company-logo-type" class="input">
          <option value="text" ${logoType === 'text' ? 'selected' : ''}>${lbl('settings.logoTypeText', 'Teksts')}</option>
          <option value="image" ${logoType === 'image' ? 'selected' : ''}>${lbl('settings.logoTypeImage', 'Augšupielādēt failu')}</option>
        </select>
      </div>
      <div class="field">
        <div id="company-logo-text-wrap" style="display:${logoType === 'text' ? 'block' : 'none'}">
          <label>${lbl('settings.logoText', 'Logo teksts')}</label>
          <input type="text" id="company-logo-text" class="input" value="${co ? escapeHtml(co.logoText || '') : ''}" placeholder="${lbl('settings.logoTextPlaceholder', 'piem., Uzņēmuma nosaukums vai iniciāļi')}">
        </div>
        <div id="company-logo-upload-wrap" style="display:${showImageUpload ? 'block' : 'none'}">
          <label>${lbl('settings.logoTypeImage', 'Augšupielādēt failu')}</label>
          <button type="button" class="btn btn-secondary btn-input-height" id="company-logo-upload-btn">${lbl('settings.upload', 'Augšupielādēt')}</button>
          <input type="file" id="company-logo-file" accept="image/*" hidden>
        </div>
      </div>
      <div class="field field-full" id="company-logo-image-wrap" style="display:${showImageRow ? 'block' : 'none'}">
        <div id="company-logo-filename" style="margin-bottom:6px;font-size:0.9em;color:var(--text-muted, #666)">${hasUploadedLogo && co && co.logo ? (co.logo.startsWith('/uploads/') ? co.logo.split(/[/\\\\]/).pop() : co.logo) : ''}</div>
        <div id="company-logo-preview" style="min-height:40px">${hasUploadedLogo ? '<img src="' + escapeHtml(co.logo) + '" alt="" style="max-height:60px">' : ''}</div>
      </div>
      <div class="field field-full">
        <label>${lbl('settings.bankName', 'Bankas nosaukums')}</label>
        ${(() => {
          const savedBank = co && co.bankId && typeof window.BANK_LIST !== 'undefined'
            ? window.BANK_LIST.find((b) => b.id === co.bankId) : null;
          const displayName = savedBank ? escapeHtml(getBankInputLabel(savedBank)) : (co ? escapeHtml(co.bankName || '') : '');
          const currentBankId = co ? escapeHtml(co.bankId || '') : '';
          return `<div class="bank-combobox" id="bank-combobox-wrap">
            <input type="text" id="company-bankName" class="input bank-combobox-input" autocomplete="off"
              value="${displayName}" placeholder="${lbl('settings.bankSelectPlaceholder', '— Select bank —')}">
            <div class="bank-combobox-dropdown hidden" id="bank-combobox-dropdown"></div>
            <input type="hidden" id="company-bankId" value="${currentBankId}">
          </div>`;
        })()}
      </div>
      <div class="field field-full" id="company-bankUrl-row" style="display:none">
        <label>${lbl('settings.bankUrlLabel', 'Online banking URL')}</label>
        <input type="url" id="company-bankUrl" class="input" value="${co ? escapeHtml(co.bankUrl || '') : ''}" placeholder="${lbl('settings.bankUrlPlaceholder', 'https://online.mybank.com')}">
      </div>
      <div class="field field-full">
        <label>${lbl('settings.swiftBic', 'SWIFT/BIC')}</label>
        <input type="text" id="company-bankSwiftBic" class="input" value="${co ? escapeHtml(co.bankSwiftBic || '') : ''}" placeholder="${lbl('settings.swift', 'HABALV22')}">
      </div>
      <div class="field field-full">
        <label>${lbl('settings.bankAccountLabel', 'Norēķinu rekvizīti (IBAN)')}</label>
        <input type="text" id="company-bankAccount" class="input" value="${co ? escapeHtml(co.bankAccount || '') : ''}" placeholder="${lbl('settings.iban', 'LV00 BANK 0000 0000 0000 0')}">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="modal-cancel-company">${lbl('common.cancel', 'Atcelt')}</button>
        <button type="button" class="btn btn-primary" id="modal-save-company">${lbl('common.save', 'Saglabāt')}</button>
      </div>
    </div>
  `, { isNew: !co });
  const typeSel = document.getElementById('company-logo-type');
  const textWrap = document.getElementById('company-logo-text-wrap');
  const uploadWrap = document.getElementById('company-logo-upload-wrap');
  const imageWrap = document.getElementById('company-logo-image-wrap');
  const fileInp = document.getElementById('company-logo-file');
  typeSel.addEventListener('change', () => {
    const isImage = typeSel.value === 'image';
    textWrap.style.display = isImage ? 'none' : 'block';
    uploadWrap.style.display = isImage ? 'block' : 'none';
    imageWrap.style.display = isImage && logoUrl ? 'block' : 'none';
  });
  document.getElementById('company-logo-upload-btn').addEventListener('click', () => fileInp.click());
  fileInp.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const result = await api.uploadLogo(file);
      logoUrl = result.url || '';
      imageWrap.style.display = 'block';
      document.getElementById('company-logo-filename').textContent = file.name;
      const preview = document.getElementById('company-logo-preview');
      preview.innerHTML = logoUrl ? '<img src="' + logoUrl + '" alt="" style="max-height:60px">' : '';
    } catch (err) {
      alert((typeof t === 'function' ? t('msg.uploadFailed') : 'Augšupielāde neizdevās') + ': ' + err.message);
    }
  });
  // Bank combobox + SWIFT auto-detect
  initBankCombobox();
  const swiftInp = document.getElementById('company-bankSwiftBic');
  if (swiftInp && typeof window.bankBySwift === 'function') {
    swiftInp.addEventListener('blur', () => {
      const hiddenId = document.getElementById('company-bankId');
      if (hiddenId && hiddenId.value) return; // don't override manual selection
      const match = window.bankBySwift(swiftInp.value);
      if (match) {
        const nameInp = document.getElementById('company-bankName');
        const idInp = document.getElementById('company-bankId');
        const urlInp = document.getElementById('company-bankUrl');
        const urlRow = document.getElementById('company-bankUrl-row');
        if (nameInp) nameInp.value = getBankInputLabel(match);
        if (idInp) idInp.value = match.id;
        if (match.swiftBic) swiftInp.value = match.swiftBic;
        if (urlInp) urlInp.value = '';
        if (urlRow) urlRow.style.display = 'none';
      }
    });
  }

  document.getElementById('modal-cancel-company').addEventListener('click', hideModal);
  document.getElementById('modal-save-company').addEventListener('click', () => {
    const lt = typeSel.value;
    const name = document.getElementById('company-name').value.trim();
    if (!name) {
      alert(typeof t === 'function' ? t('msg.companyNameRequired') : 'Uzņēmuma nosaukums ir obligāts.');
      return;
    }
    const selectedBankId = (document.getElementById('company-bankId') || {}).value || '';
    const selectedBank = selectedBankId && typeof window.BANK_LIST !== 'undefined'
      ? window.BANK_LIST.find((b) => b.id === selectedBankId)
      : null;
    const payload = {
      id: co ? co.id : undefined,
      name: name,
      billPrefix: sanitizePrefix(document.getElementById('company-bill-prefix').value),
      isDefault: document.getElementById('company-isDefault').checked,
      legalAddress: document.getElementById('company-legalAddress').value.trim(),
      registrationNumber: document.getElementById('company-registrationNumber').value.trim(),
      vatNumber: document.getElementById('company-vatNumber').value.trim(),
      phone: document.getElementById('company-phone').value.trim(),
      email: document.getElementById('company-email').value.trim(),
      website: document.getElementById('company-website').value.trim(),
      logoType: lt,
      logo: lt === 'image' ? (logoUrl || null) : null,
      logoText: lt === 'text' ? document.getElementById('company-logo-text').value.trim() || null : null,
      bankName: (selectedBank ? (selectedBank.legalName || selectedBank.name || '') : (((document.getElementById('company-bankName') || {}).value || '').trim())),
      bankUrl: selectedBankId ? '' : (((document.getElementById('company-bankUrl') || {}).value || '').trim()),
      bankSwiftBic: document.getElementById('company-bankSwiftBic').value.trim(),
      bankAccount: document.getElementById('company-bankAccount').value.trim(),
      bankId: selectedBankId
    };
    saveCompanyFromModal(payload);
  });
}

async function doDeleteCompany(id, skipRefresh) {
  try {
    await api.deleteCompany(id);
    companies = companies.filter((c) => c.id !== id);
    if (!skipRefresh) await refreshSettings();
  } catch (e) {
    alert((typeof t === 'function' ? t('msg.deleteFailed') : 'Failed to delete') + ': ' + e.message);
    if (skipRefresh && window.refreshSettings) window.refreshSettings();
  }
}

const customerTableConfig = {
  openModal: (id) => openCustomerModal(id),
  doDelete: (id, skip) => doDeleteCustomer(id, skip),
  getItemName: (id) => (customers.find((c) => c.id === id) || {}).name || (typeof t === 'function' ? t('settings.customerName') : 'Klients'),
  refreshFn: refreshSettings,
  confirmDelete: () => (typeof t === 'function' ? t('bills.confirmDelete') : 'Delete this customer?')
};

function renderCustomers() {
  const root = document.getElementById('customers-root');
  const actionsEl = document.getElementById('customers-actions');
  if (!root) return;
  if (actionsEl) {
    actionsEl.innerHTML = '<button type="button" class="btn btn-primary" id="btn-add-customer">' + (typeof t === 'function' ? t('settings.addCustomer') : 'Pievienot klientu') + '</button>';
    document.getElementById('btn-add-customer').addEventListener('click', () => openCustomerModal(null));
  }
  const editLabel = typeof t === 'function' ? t('common.edit') : 'Rediģēt';
  const deleteLabel = typeof t === 'function' ? t('common.delete') : 'Dzēst';
  const colName = typeof t === 'function' ? t('settings.customerName') : 'Nosaukums';
  const colPrefix = 'Prefix';
  const emptyMsg = typeof t === 'function' ? t('settings.customersEmpty') : 'Klientu vēl nav. Pievienojiet, lai izvēlētos rēķinos.';
  root.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <colgroup><col><col><col style="width:56px"></colgroup>
        <thead>
          <tr>
            <th>${escapeHtml(colName)}</th>
            <th>${escapeHtml(colPrefix)}</th>
            <th class="actions-col"></th>
          </tr>
        </thead>
        <tbody id="customers-tbody">
          ${customers.length === 0 ? '<tr><td colspan="3" class="list-empty">' + escapeHtml(emptyMsg) + '</td></tr>' : customers.map((c) => {
            const hasBills = customerIdsWithBills.has(c.id);
            return `
            <tr class="${c.inactive ? 'row-inactive' : ''}">
              <td>${escapeHtml(c.name)}${c.inactive ? ' <em>(' + (typeof t === 'function' ? t('settings.inactive') : 'Neaktīvs') + ')</em>' : ''}</td>
              <td>${escapeHtml(c.billPrefix || '')}</td>
              <td class="actions">
                <div class="actions-dropdown">
                  <button type="button" class="btn btn-icon btn-ghost btn-actions-trigger" data-id="${escapeHtml(c.id)}" aria-haspopup="true" aria-expanded="false" title="${escapeHtml(editLabel)}" aria-label="${escapeHtml(editLabel)}"><span class="material-symbols-outlined" aria-hidden="true">more_vert</span></button>
                  <div class="actions-dropdown-menu hidden" role="menu">
                    <button type="button" role="menuitem" class="actions-dropdown-item" data-action="edit" data-id="${escapeHtml(c.id)}"><span class="material-symbols-outlined" aria-hidden="true">edit</span><span>${escapeHtml(editLabel)}</span></button>
                    <button type="button" role="menuitem" class="actions-dropdown-item actions-dropdown-item-danger" data-action="delete" data-id="${escapeHtml(c.id)}" ${hasBills ? 'disabled' : ''}><span class="material-symbols-outlined" aria-hidden="true">delete</span><span>${escapeHtml(deleteLabel)}</span></button>
                  </div>
                </div>
              </td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  const tbody = document.getElementById('customers-tbody');
  if (tbody) tbody.querySelectorAll('tr').forEach((tr) => { if (tr.querySelector('.actions-dropdown')) setupSettingsRowDropdown(tr, customerTableConfig); });
}

function attachCustomerRowListeners(rowEl) {
  setupSettingsRowDropdown(rowEl, customerTableConfig);
}

function openCustomerModal(id) {
  const c = id ? customers.find((x) => x.id === id) : null;
  const lbl = (k, fallback) => (typeof t === 'function' ? t(k) : fallback);
  showModal(`
    <h3>${c ? lbl('modal.customerEdit', 'Rediģēt klientu') : lbl('modal.customerNew', 'Pievienot klientu')}</h3>
    <div class="form-block form-modal-cols">
      <div class="field">
        <label>${lbl('settings.customerName', 'Nosaukums')}</label>
        <input type="text" id="cust-name" class="input" value="${c ? escapeHtml(c.name) : ''}" placeholder="${lbl('settings.customerName', 'Nosaukums')}">
      </div>
      <div class="field">
        <label>${lbl('settings.billPrefix', 'Prefikss')}</label>
        <input type="text" id="cust-billPrefix" class="input" value="${c ? escapeHtml(c.billPrefix || '') : ''}" placeholder="${lbl('settings.customerPrefixPlaceholder', 'Pārraksta noklusējuma prefiksu')}">
      </div>
      <div class="field field-full">
        <label>${lbl('settings.email', 'E-pasts')}</label>
        <input type="email" id="cust-email" class="input" value="${c ? escapeHtml(c.email || '') : ''}" placeholder="${lbl('settings.email', 'E-pasts')}">
      </div>
      <div class="field field-full">
        <label></label>
        <label class="checkbox-label">
          <input type="checkbox" id="cust-inactive" ${c && c.inactive ? 'checked' : ''}>
          ${lbl('settings.customerInactiveDescription', 'Neaktīvs (paslēpts no nolaižamajiem sarakstiem)')}
        </label>
      </div>
      <div class="field field-full">
        <label>${lbl('settings.address', 'Adrese')}</label>
        <textarea id="cust-address" class="input" placeholder="${lbl('settings.address', 'Adrese')}">${c ? escapeHtml(c.address || '') : ''}</textarea>
      </div>
      <div class="field">
        <label>${lbl('settings.regNumber', 'Reģ. nr.')}</label>
        <input type="text" id="cust-registrationNumber" class="input" value="${c ? escapeHtml(c.registrationNumber || '') : ''}" placeholder="${lbl('settings.regNumber', 'Reģistrācijas numurs')}">
      </div>
      <div class="field">
        <label>${lbl('settings.vatNumber', 'PVN numurs')}</label>
        <input type="text" id="cust-vatNumber" class="input" value="${c ? escapeHtml(c.vatNumber || '') : ''}" placeholder="${lbl('settings.vatNumber', 'PVN numurs')}">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="modal-cancel-customer">${lbl('common.cancel', 'Atcelt')}</button>
        <button type="button" class="btn btn-primary" id="modal-save-customer">${lbl('common.save', 'Saglabāt')}</button>
      </div>
    </div>
  `, { isNew: !c });
  document.getElementById('modal-cancel-customer').addEventListener('click', hideModal);
  document.getElementById('modal-save-customer').addEventListener('click', async () => {
    const box = document.getElementById('modal-box');
    const el = (id) => box ? box.querySelector('[id="' + id + '"]') : null;
    const val = (id) => { const e = el(id); return e && e.value !== undefined ? String(e.value).trim() : ''; };
    const name = val('cust-name');
    if (!name) {
      alert(typeof t === 'function' ? t('msg.customerNameRequired') : 'Klienta nosaukums ir obligāts.');
      return;
    }
    const payload = {
      name: name,
      email: val('cust-email'),
      billPrefix: sanitizePrefix(val('cust-billPrefix')),
      inactive: !!(el('cust-inactive') && el('cust-inactive').checked),
      address: val('cust-address'),
      registrationNumber: val('cust-registrationNumber'),
      vatNumber: val('cust-vatNumber')
    };
    try {
      if (c) await api.putCustomer(c.id, payload);
      else await api.postCustomer(payload);
      hideModal(true);
      await refreshSettings();
    } catch (e) {
      alert((typeof t === 'function' ? t('msg.saveFailed') : 'Neizdevās saglabāt') + ': ' + e.message);
    }
  });
}

async function doDeleteCustomer(id, skipRefresh) {
  try {
    await api.deleteCustomer(id);
    customers = customers.filter((c) => c.id !== id);
    if (!skipRefresh) await refreshSettings();
  } catch (e) {
    alert((typeof t === 'function' ? t('msg.deleteFailed') : 'Failed to delete') + ': ' + e.message);
    if (skipRefresh && window.refreshSettings) window.refreshSettings();
  }
}

const serviceTableConfig = {
  openModal: (id) => openServiceModal(id),
  doDelete: (id, skip) => doDeleteService(id, skip),
  getItemName: (id) => (services.find((s) => s.id === id) || {}).name || (typeof t === 'function' ? t('settings.serviceName') : 'Pakalpojums'),
  refreshFn: refreshSettings,
  confirmDelete: () => (typeof t === 'function' ? t('bills.confirmDelete') : 'Delete this service?')
};

function renderServices() {
  const root = document.getElementById('services-root');
  const actionsEl = document.getElementById('services-actions');
  if (!root) return;
  if (actionsEl) {
    actionsEl.innerHTML = '<button type="button" class="btn btn-primary" id="btn-add-service">' + (typeof t === 'function' ? t('settings.addService') : 'Pievienot pakalpojumu') + '</button>';
    document.getElementById('btn-add-service').addEventListener('click', () => openServiceModal(null));
  }
  const editLabel = typeof t === 'function' ? t('common.edit') : 'Rediģēt';
  const deleteLabel = typeof t === 'function' ? t('common.delete') : 'Dzēst';
  const emptyMsg = typeof t === 'function' ? t('settings.servicesEmpty') : 'Pakalpojumu vēl nav. Pievienojiet, lai izmantotu kā rēķinu rindas.';
  root.innerHTML = `
    <div class="table-wrap">
      <table class="table table-services">
        <colgroup><col class="col-svc-name"><col class="col-svc-unit"><col class="col-svc-vat"><col class="col-svc-price"><col style="width:56px"></colgroup>
        <thead>
          <tr>
            <th class="col-svc-name">${typeof t === 'function' ? t('settings.serviceName') : 'Nosaukums'}</th>
            <th class="col-svc-unit">${typeof t === 'function' ? t('editor.unit') : 'Mērvienība'}</th>
            <th class="col-svc-vat">${typeof t === 'function' ? t('settings.vatPct') : 'PVN %'}</th>
            <th class="col-svc-price">${typeof t === 'function' ? t('editor.colPrice') : 'Cena'}</th>
            <th class="actions-col"></th>
          </tr>
        </thead>
        <tbody id="services-tbody">
          ${services.length === 0 ? '<tr><td colspan="5" class="list-empty">' + escapeHtml(emptyMsg) + '</td></tr>' : services.map((s) => {
            const unitVal = serviceUnitToOption(s.unit, s.measure);
            const unitLabel = (typeof t === 'function' && t('unit.' + unitVal) !== ('unit.' + unitVal)) ? t('unit.' + unitVal) : ((SERVICE_UNIT_OPTIONS.find((o) => o.value === unitVal) || {}).label || s.unit || '');
            return `
            <tr>
              <td class="col-svc-name"><span class="svc-name-text">${escapeHtml(s.name)}</span></td>
              <td class="col-svc-unit">${escapeHtml(unitLabel)}</td>
              <td class="col-svc-vat">${s.defaultVatPercent != null ? s.defaultVatPercent + '%' : '—'}</td>
              <td class="col-svc-price">${Number(s.lastPrice || 0).toFixed(2)}</td>
              <td class="actions">
                <div class="actions-dropdown">
                  <button type="button" class="btn btn-icon btn-ghost btn-actions-trigger" data-id="${escapeHtml(s.id)}" aria-haspopup="true" aria-expanded="false" title="${escapeHtml(editLabel)}" aria-label="${escapeHtml(editLabel)}"><span class="material-symbols-outlined" aria-hidden="true">more_vert</span></button>
                  <div class="actions-dropdown-menu hidden" role="menu">
                    <button type="button" role="menuitem" class="actions-dropdown-item" data-action="edit" data-id="${escapeHtml(s.id)}"><span class="material-symbols-outlined" aria-hidden="true">edit</span><span>${escapeHtml(editLabel)}</span></button>
                    <button type="button" role="menuitem" class="actions-dropdown-item actions-dropdown-item-danger" data-action="delete" data-id="${escapeHtml(s.id)}"><span class="material-symbols-outlined" aria-hidden="true">delete</span><span>${escapeHtml(deleteLabel)}</span></button>
                  </div>
                </div>
              </td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  const tbody = document.getElementById('services-tbody');
  if (tbody) tbody.querySelectorAll('tr').forEach((tr) => { if (tr.querySelector('.actions-dropdown')) setupSettingsRowDropdown(tr, serviceTableConfig); });
}

function attachServiceRowListeners(rowEl) {
  setupSettingsRowDropdown(rowEl, serviceTableConfig);
}

function openServiceModal(id) {
  const s = id ? services.find((x) => x.id === id) : null;
  const lbl = (k, fallback) => (typeof t === 'function' ? t(k) : fallback);
  const unitOptionsHtml = SERVICE_UNIT_OPTIONS.map((o) => {
    const label = (typeof t === 'function' && t('unit.' + o.value) !== ('unit.' + o.value)) ? t('unit.' + o.value) : o.label;
    return `<option value="${o.value}" ${(s && serviceUnitToOption(s.unit, s.measure) === o.value) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
  showModal(`
    <h3>${s ? lbl('modal.serviceEdit', 'Rediģēt pakalpojumu') : lbl('modal.serviceNew', 'Pievienot pakalpojumu')}</h3>
    <div class="form-block">
      <div class="field">
        <label>${lbl('settings.serviceName', 'Nosaukums')}</label>
        <input type="text" id="svc-name" class="input input-full" value="${s ? escapeHtml(s.name) : ''}" placeholder="${lbl('settings.serviceName', 'Nosaukums')}">
      </div>
      <div class="field">
        <label>${lbl('editor.unit', 'Mērvienība')}</label>
        <select id="svc-unit" class="input input-full">
          ${unitOptionsHtml}
        </select>
      </div>
      <div class="field">
        <label>${lbl('settings.vatPct', 'PVN %')}</label>
        <select id="svc-vat" class="input input-full">
          <option value="21" ${(s ? (s.defaultVatPercent ?? 21) : 21) === 21 ? 'selected' : ''}>21%</option>
          <option value="12" ${(s ? (s.defaultVatPercent ?? 21) : 21) === 12 ? 'selected' : ''}>12%</option>
          <option value="0" ${(s ? (s.defaultVatPercent ?? 21) : 21) === 0 ? 'selected' : ''}>0%</option>
        </select>
      </div>
      <div class="field">
        <label>${lbl('editor.priceEur', 'Cena (€)')}</label>
        <input type="number" id="svc-price" class="input input-full" value="${s ? Number(s.lastPrice || 0).toFixed(2) : '0'}" step="0.01" min="0">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="modal-cancel-svc">${lbl('common.cancel', 'Atcelt')}</button>
        <button type="button" class="btn btn-primary" id="modal-save-svc">${lbl('common.save', 'Saglabāt')}</button>
      </div>
    </div>
  `, { isNew: !s });
  document.getElementById('modal-cancel-svc').addEventListener('click', hideModal);
  document.getElementById('modal-save-svc').addEventListener('click', async () => {
    const name = document.getElementById('svc-name').value.trim();
    if (!name) {
      alert(typeof t === 'function' ? t('msg.serviceNameRequired') : 'Nosaukums ir obligāts.');
      return;
    }
    const unit = document.getElementById('svc-unit').value || 'pc';
    const payload = {
      name,
      unit,
      defaultVatPercent: parseInt(document.getElementById('svc-vat').value || '21', 10),
      lastPrice: parseFloat(document.getElementById('svc-price').value || '0') || 0,
      measure: unit === 'hour' ? 'hourly' : 'units'
    };
    try {
      if (s) await api.putService(s.id, payload);
      else await api.postService(payload);
      hideModal(true);
      await refreshSettings();
    } catch (e) {
      alert((typeof t === 'function' ? t('msg.saveFailed') : 'Neizdevās saglabāt') + ': ' + e.message);
    }
  });
}

async function doDeleteService(id, skipRefresh) {
  try {
    await api.deleteService(id);
    services = services.filter((s) => s.id !== id);
    if (!skipRefresh) await refreshSettings();
  } catch (e) {
    alert((typeof t === 'function' ? t('msg.deleteFailed') : 'Failed to delete') + ': ' + e.message);
    if (skipRefresh && window.refreshSettings) window.refreshSettings();
  }
}

function syncLanguageSelects() {
  const localeEl = document.getElementById('setting-locale');
  const billsLocaleEl = document.getElementById('setting-bills-locale');
  if (localeEl) localeEl.value = (settingsData.locale && ['lv', 'en', 'ru'].includes(settingsData.locale)) ? settingsData.locale : 'en';
  if (billsLocaleEl) billsLocaleEl.value = (settingsData.billsLocale && ['lv', 'en', 'ru'].includes(settingsData.billsLocale)) ? settingsData.billsLocale : 'en';
}

function syncThemeSelect() {
  const themeEl = document.getElementById('setting-theme');
  if (themeEl) themeEl.value = (settingsData.theme === 'light' || settingsData.theme === 'dark') ? settingsData.theme : 'light';
}

function initThemeSettings() {
  const themeEl = document.getElementById('setting-theme');
  if (!themeEl) return;
  themeEl.addEventListener('change', async () => {
    const theme = themeEl.value === 'dark' ? 'dark' : 'light';
    try {
      await api.putSettings({ theme });
      settingsData = { ...settingsData, theme };
      if (typeof window.applyTheme === 'function') window.applyTheme(theme);
      if (typeof window.showToast === 'function') {
        window.showToast({ message: typeof t === 'function' ? t('msg.saved') : 'Saved', type: 'success' });
      }
    } catch (e) {
      alert((typeof t === 'function' ? t('msg.saveFailed') : 'Save failed') + ': ' + (e.message || e));
    }
  });
}

function formatMonthPreview(fmt) {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(-2);
  const m = now.getMonth();
  const mm = String(m + 1).padStart(2, '0');
  const mSingle = String(m + 1);
  const f = fmt && fmt.trim() ? fmt.trim() : 'YYYY-MM';
  return f
    .replace(/YYYY/g, yyyy)
    .replace(/YY/g, yy)
    .replace(/MMMM/g, MONTH_NAMES[m])
    .replace(/MMM/g, MONTH_SHORT[m])
    .replace(/MM/g, mm)
    .replace(/\bM\b/g, mSingle);
}

function updateFolderFormatRow(checked) {
  const row = document.getElementById('drive-folder-format-row');
  if (row) row.style.display = checked ? '' : 'none';
}

function updateFolderFormatPresetLabels() {
  const presetEl = document.getElementById('setting-drive-folder-format-preset');
  if (!presetEl) return;
  Array.from(presetEl.options).forEach((opt) => {
    const fmt = (opt.value || '').trim();
    if (!fmt) return;
    const sample = formatMonthPreview(fmt);
    opt.textContent = sample + ' (' + fmt + ')';
  });
}

function syncDriveSettings(status) {
  const disconnectedBlock = document.getElementById('drive-disconnected-block');
  const connectedBlock = document.getElementById('drive-connected-block');
  const disconnectedLead = document.getElementById('drive-disconnected-lead');
  const emailEl = document.getElementById('drive-connected-email');
  const rootFolderIdEl = document.getElementById('setting-drive-root-folder');
  const rootFolderNameEl = document.getElementById('setting-drive-root-folder-name');
  const monthlyEl = document.getElementById('setting-drive-monthly-folders');
  const formatEl = document.getElementById('setting-drive-folder-format');
  const formatPresetEl = document.getElementById('setting-drive-folder-format-preset');
  if (!disconnectedBlock || !connectedBlock) return;
  if (status && status.connected) {
    disconnectedBlock.classList.add('hidden');
    connectedBlock.classList.remove('hidden');
    if (disconnectedLead) disconnectedLead.classList.add('hidden');
    if (emailEl) emailEl.textContent = status.connectedEmail || '';
    if (rootFolderIdEl) rootFolderIdEl.value = settingsData.driveRootFolderId || '';
    if (rootFolderNameEl) rootFolderNameEl.value = settingsData.driveRootFolderName || '';
    if (monthlyEl) monthlyEl.checked = !!settingsData.driveMonthlyFolders;
    const PRESETS = ['YYYY-MM', 'YYYY/MM', 'MM-YYYY', 'MMM-YY', 'MMMM YYYY', 'YYYY-MMMM'];
    const rawFmt = settingsData.driveFolderFormat || 'YYYY-MM';
    const fmt = PRESETS.includes(rawFmt) ? rawFmt : 'YYYY-MM';
    updateFolderFormatPresetLabels();
    if (formatPresetEl) formatPresetEl.value = fmt;
    if (formatEl) formatEl.value = fmt;
    updateFolderFormatRow(!!settingsData.driveMonthlyFolders);
  } else {
    disconnectedBlock.classList.remove('hidden');
    connectedBlock.classList.add('hidden');
    if (disconnectedLead) disconnectedLead.classList.remove('hidden');
  }
}

async function openDriveFolderPicker() {
  let googleConfig;
  try {
    googleConfig = await api.getGoogleConfig();
  } catch (e) {
    alert('Could not load Google config: ' + (e.message || e));
    return;
  }
  if (!googleConfig || !googleConfig.apiKey) {
    alert('GOOGLE_API_KEY is not configured. Add it to your .env file.');
    return;
  }

  let accessToken;
  try {
    const result = await api.getDriveAccessToken();
    accessToken = result.accessToken;
  } catch (e) {
    alert('Could not get Drive access token: ' + (e.message || e));
    return;
  }

  // Load the Picker library if not already loaded
  await new Promise((resolve, reject) => {
    if (window.google && window.google.picker) return resolve();
    if (!window.gapi) return reject(new Error('Google API script not loaded yet. Try again in a moment.'));
    window.gapi.load('picker', { callback: resolve, onerror: reject });
  });

  const pickerBuilder = new window.google.picker.PickerBuilder()
    .setTitle('Select a folder')
    .addView(
      new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
        .setSelectFolderEnabled(true)
        .setMimeTypes('application/vnd.google-apps.folder')
    )
    .setOAuthToken(accessToken)
    .setCallback((data) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const folder = data.docs && data.docs[0];
        if (folder) {
          const idInput = document.getElementById('setting-drive-root-folder');
          const nameInput = document.getElementById('setting-drive-root-folder-name');
          if (idInput) idInput.value = folder.id;
          if (nameInput) nameInput.value = folder.name || folder.id;
        }
      }
    });
  const picker = pickerBuilder.build();
  picker.setVisible(true);
}

function initDriveSettings() {
  const saveBtn = document.getElementById('btn-save-drive-settings');
  const disconnectBtn = document.getElementById('btn-disconnect-drive');
  const monthlyEl = document.getElementById('setting-drive-monthly-folders');
  const formatEl = document.getElementById('setting-drive-folder-format');
  const formatPresetEl = document.getElementById('setting-drive-folder-format-preset');
  const browseBtn = document.getElementById('btn-browse-drive-folder');
  if (!saveBtn && !disconnectBtn) return;

  const PRESETS = ['YYYY-MM', 'YYYY/MM', 'MM-YYYY', 'MMM-YY', 'MMMM YYYY', 'YYYY-MMMM'];
  updateFolderFormatPresetLabels();

  if (monthlyEl) {
    monthlyEl.addEventListener('change', () => {
      updateFolderFormatRow(monthlyEl.checked);
    });
  }

  if (formatPresetEl) {
    formatPresetEl.addEventListener('change', () => {
      const val = formatPresetEl.value;
      if (formatEl) formatEl.value = val;
    });
  }

  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      openDriveFolderPicker().catch((e) => {
        alert((typeof t === 'function' ? t('msg.error') : 'Error') + ': ' + (e.message || e));
      });
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const driveRootFolderId = (document.getElementById('setting-drive-root-folder') || {}).value || '';
      const driveRootFolderName = (document.getElementById('setting-drive-root-folder-name') || {}).value || '';
      const driveMonthlyFolders = !!(document.getElementById('setting-drive-monthly-folders') || {}).checked;
      const presetVal = formatPresetEl ? formatPresetEl.value : '';
      const driveFolderFormat = presetVal || (document.getElementById('setting-drive-folder-format') || {}).value || '';
      try {
        await api.putDriveSettings({ driveRootFolderId, driveRootFolderName, driveMonthlyFolders, driveFolderFormat });
        settingsData = { ...settingsData, driveRootFolderId, driveRootFolderName, driveMonthlyFolders, driveFolderFormat };
        if (typeof window.showToast === 'function') {
          window.showToast({ message: typeof t === 'function' ? t('msg.saved') : 'Saved', type: 'success' });
        }
      } catch (e) {
        alert((typeof t === 'function' ? t('msg.saveFailed') : 'Save failed') + ': ' + (e.message || e));
      }
    });
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
      try {
        await api.disconnectDrive();
        settingsData = { ...settingsData, driveRootFolderId: '', driveRootFolderName: '', driveMonthlyFolders: false, driveFolderFormat: '' };
        syncDriveSettings({ connected: false });
        if (typeof window.showToast === 'function') {
          window.showToast({ message: typeof t === 'function' ? t('settings.driveDisconnect') : 'Disconnected', type: 'success' });
        }
      } catch (e) {
        alert((typeof t === 'function' ? t('msg.saveFailed') : 'Save failed') + ': ' + (e.message || e));
      }
    });
  }

  api.getAuth().then((user) => {
    if (!user) {
      syncDriveSettings(null);
      return null;
    }
    return api.getDriveStatus().then((status) => {
      if (status) {
        settingsData = {
          ...settingsData,
          driveRootFolderName: status.rootFolderName || '',
          driveFolderFormat: status.folderFormat || ''
        };
      }
      syncDriveSettings(status);
      return null;
    });
  }).catch(() => {
    syncDriveSettings(null);
  });
}

function initLanguageSettings() {
  const localeEl = document.getElementById('setting-locale');
  const billsLocaleEl = document.getElementById('setting-bills-locale');
  if (!localeEl || !billsLocaleEl) return;
  async function saveLanguageAndNotify() {
    const locale = ['lv', 'en', 'ru'].includes(localeEl.value) ? localeEl.value : 'en';
    const billsLocale = ['lv', 'en', 'ru'].includes(billsLocaleEl.value) ? billsLocaleEl.value : 'en';
    try {
      await api.putSettings({ locale, billsLocale });
      settingsData = { ...settingsData, locale, billsLocale };
      if (typeof window.showToast === 'function') {
        window.showToast({ message: typeof t === 'function' ? t('msg.saved') : 'Saved', type: 'success' });
      }
      if (typeof window.setLocale === 'function') window.setLocale(locale);
      try { localStorage.setItem('bills-app-locale', locale); } catch (e) {}
      if (typeof window.applyTranslations === 'function') window.applyTranslations();
      if (typeof window.refreshBillsList === 'function') window.refreshBillsList();
    } catch (e) {
      alert((typeof t === 'function' ? t('msg.saveFailed') : 'Save failed') + ': ' + (e.message || e));
    }
  }
  localeEl.addEventListener('change', saveLanguageAndNotify);
  billsLocaleEl.addEventListener('change', saveLanguageAndNotify);
}

document.addEventListener('DOMContentLoaded', () => {
  initAccountSettings();
  initPasswordResetModal();
  initAccountTranslationsSync();
  initThemeSettings();
  initDriveSettings();
  initLanguageSettings();
  window.refreshSettings = refreshSettings;
  window.openCustomerModal = openCustomerModal;
});