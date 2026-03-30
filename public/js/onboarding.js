(function () {
  var STEPS = ['welcome', 'company', 'banking', 'services', 'customers', 'done'];

  // Local tracking of items added inline during this wizard session
  var addedServices = [];
  var addedCustomers = [];

  function t(key) {
    return typeof window.t === 'function' ? window.t(key) : key;
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function showBtn(el) { if (el) el.classList.remove('hidden'); }
  function hideBtn(el) { if (el) el.classList.add('hidden'); }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showFieldError(id, msg) {
    var el = getEl(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideFieldError(id) {
    var el = getEl(id);
    if (el) el.classList.add('hidden');
  }

  // ── Chip list renderer ───────────────────────────────────────────────────
  function renderAddedChips(items) {
    if (!items || !items.length) return '';
    return items.map(function (item) {
      return '<span class="onb-added-chip">' +
        '<span class="material-symbols-outlined" aria-hidden="true">check</span>' +
        escapeHtml(item.name) +
        '</span>';
    }).join('');
  }

  // ── Step content renderers ──────────────────────────────────────────────
  function renderWelcomeStep() {
    var feat = function (icon, titleKey, descKey) {
      return '<div class="onb-feature">' +
        '<span class="material-symbols-outlined onb-feature-icon" aria-hidden="true">' + icon + '</span>' +
        '<div class="onb-feature-text">' +
          '<strong>' + t(titleKey) + '</strong>' +
          '<span>' + t(descKey) + '</span>' +
        '</div>' +
      '</div>';
    };
    return '<div class="onb-step-body onb-welcome-body">' +
      '<h2 class="onb-step-title">' + t('onboarding.welcomeTitle') + '</h2>' +
      '<p class="onb-step-subtitle">' + t('onboarding.welcomeSubtitle') + '</p>' +
      '<div class="onb-feature-list">' +
        feat('receipt_long', 'onboarding.feat1Title', 'onboarding.feat1Desc') +
        feat('groups', 'onboarding.feat2Title', 'onboarding.feat2Desc') +
        feat('payments', 'onboarding.feat3Title', 'onboarding.feat3Desc') +
        feat('devices', 'onboarding.feat4Title', 'onboarding.feat4Desc') +
      '</div>' +
    '</div>';
  }

  function renderCompanyStep() {
    return '<div class="onb-step-body">' +
      '<h2 class="onb-step-title">' + t('onboarding.companyTitle') + '</h2>' +
      '<p class="onb-step-subtitle">' + t('onboarding.companySubtitle') + '</p>' +
      '<form class="onb-form" id="onb-company-form" novalidate>' +
        '<div class="onb-field">' +
          '<label class="onb-label" for="onb-company-name">' + t('settings.companyName') + ' <span class="onb-required">*</span></label>' +
          '<input class="input" id="onb-company-name" type="text" placeholder="' + t('settings.companyNamePlaceholder') + '" autocomplete="organization">' +
          '<p class="onb-field-error hidden" id="onb-company-error"></p>' +
        '</div>' +
        '<div class="onb-field">' +
          '<label class="onb-label" for="onb-company-reg">' + t('settings.regNumber') + '</label>' +
          '<input class="input" id="onb-company-reg" type="text" placeholder="40001234567">' +
        '</div>' +
        '<div class="onb-field-row">' +
          '<div class="onb-field">' +
            '<label class="onb-label" for="onb-company-vat">' + t('settings.vatNumber') + '</label>' +
            '<input class="input" id="onb-company-vat" type="text" placeholder="LV40001234567">' +
          '</div>' +
          '<div class="onb-field">' +
            '<label class="onb-label" for="onb-company-addr">' + t('settings.legalAddress') + '</label>' +
            '<input class="input" id="onb-company-addr" type="text" placeholder="Brīvības iela 1, Rīga, LV-1001">' +
          '</div>' +
        '</div>' +
      '</form>' +
    '</div>';
  }

  function renderBankingStep() {
    return '<div class="onb-step-body">' +
      '<h2 class="onb-step-title">' + t('onboarding.bankingTitle') + '</h2>' +
      '<p class="onb-step-subtitle">' + t('onboarding.bankingSubtitle') + '</p>' +
      '<form class="onb-form" id="onb-banking-form" novalidate>' +
        '<div class="onb-field">' +
          '<label class="onb-label" for="onb-bank-name">' + t('onboarding.bankName') + '</label>' +
          '<input class="input" id="onb-bank-name" type="text" placeholder="' + t('onboarding.bankNamePlaceholder') + '">' +
        '</div>' +
        '<div class="onb-field">' +
          '<label class="onb-label" for="onb-bank-iban">' + t('onboarding.iban') + '</label>' +
          '<input class="input" id="onb-bank-iban" type="text" placeholder="' + t('onboarding.ibanPlaceholder') + '" autocomplete="off">' +
        '</div>' +
        '<div class="onb-field">' +
          '<label class="onb-label" for="onb-bank-swift">' + t('onboarding.swift') + '</label>' +
          '<input class="input" id="onb-bank-swift" type="text" placeholder="' + t('onboarding.swiftPlaceholder') + '" autocomplete="off">' +
        '</div>' +
        '<p class="onb-field-error hidden" id="onb-banking-error"></p>' +
      '</form>' +
    '</div>';
  }

  function renderServicesStep() {
    return '<div class="onb-step-body">' +
      '<h2 class="onb-step-title">' + t('onboarding.serviceTitle') + '</h2>' +
      '<p class="onb-step-subtitle">' + t('onboarding.serviceSubtitle') + '</p>' +
      // Location hint — prominent, at top
      '<div class="onb-location-hint-top">' +
        '<span class="material-symbols-outlined" aria-hidden="true">info</span>' +
        t('onboarding.skipHintService') +
      '</div>' +
      // Animated modal dialog mock
      '<div class="onb-modal-mock" aria-hidden="true">' +
        '<div class="onb-modal-mock-dialog">' +
          '<div class="onb-modal-mock-header">' + t('modal.serviceNew') + '</div>' +
          '<div class="onb-modal-mock-body">' +
            '<div class="onb-modal-mock-field">' +
              '<span class="onb-modal-mock-label">' + t('settings.serviceName') + '</span>' +
              '<div class="onb-modal-mock-input">' +
                '<span class="onb-modal-mock-typed">Web Design</span>' +
              '</div>' +
            '</div>' +
            '<div class="onb-modal-mock-row">' +
              '<div class="onb-modal-mock-field">' +
                '<span class="onb-modal-mock-label">' + t('editor.unit') + '</span>' +
                '<div class="onb-modal-mock-select">pc</div>' +
              '</div>' +
              '<div class="onb-modal-mock-field">' +
                '<span class="onb-modal-mock-label">' + t('settings.vatPct') + '</span>' +
                '<div class="onb-modal-mock-select">21%</div>' +
              '</div>' +
            '</div>' +
            '<div class="onb-modal-mock-field">' +
              '<span class="onb-modal-mock-label">' + t('editor.priceEur') + '</span>' +
              '<div class="onb-modal-mock-input">120.00</div>' +
            '</div>' +
          '</div>' +
          '<div class="onb-modal-mock-footer">' +
            '<span class="onb-modal-mock-cancel-btn">' + t('common.cancel') + '</span>' +
            '<span class="onb-modal-mock-save-btn">' +
              t('common.save') +
              '<span class="onb-mock-tap-ring"></span>' +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // Added list
      '<div class="onb-added-list" id="onb-services-list">' + renderAddedChips(addedServices) + '</div>' +
      // Add button
      '<div class="onb-action-row">' +
        '<button type="button" class="btn btn-primary" id="onb-service-open-modal-btn">' +
          '<span class="material-symbols-outlined" aria-hidden="true">add</span>' +
          t('settings.addService') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function renderCustomersStep() {
    return '<div class="onb-step-body">' +
      '<h2 class="onb-step-title">' + t('onboarding.customerTitle') + '</h2>' +
      '<p class="onb-step-subtitle">' + t('onboarding.customerSubtitle') + '</p>' +
      // Location hint — prominent, at top
      '<div class="onb-location-hint-top">' +
        '<span class="material-symbols-outlined" aria-hidden="true">info</span>' +
        t('onboarding.skipHintCustomer') +
      '</div>' +
      // Animated modal dialog mock
      '<div class="onb-modal-mock" aria-hidden="true">' +
        '<div class="onb-modal-mock-dialog">' +
          '<div class="onb-modal-mock-header">' + t('modal.customerNew') + '</div>' +
          '<div class="onb-modal-mock-body">' +
            '<div class="onb-modal-mock-field">' +
              '<span class="onb-modal-mock-label">' + t('settings.customerName') + '</span>' +
              '<div class="onb-modal-mock-input">' +
                '<span class="onb-modal-mock-typed">Acme Corp</span>' +
              '</div>' +
            '</div>' +
            '<div class="onb-modal-mock-row">' +
              '<div class="onb-modal-mock-field">' +
                '<span class="onb-modal-mock-label">' + t('settings.regNumber') + '</span>' +
                '<div class="onb-modal-mock-input">40001234567</div>' +
              '</div>' +
              '<div class="onb-modal-mock-field">' +
                '<span class="onb-modal-mock-label">' + t('settings.vatNumber') + '</span>' +
                '<div class="onb-modal-mock-input">LV40001234567</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="onb-modal-mock-footer">' +
            '<span class="onb-modal-mock-cancel-btn">' + t('common.cancel') + '</span>' +
            '<span class="onb-modal-mock-save-btn">' +
              t('common.save') +
              '<span class="onb-mock-tap-ring"></span>' +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // Added list
      '<div class="onb-added-list" id="onb-customers-list">' + renderAddedChips(addedCustomers) + '</div>' +
      // Add button
      '<div class="onb-action-row">' +
        '<button type="button" class="btn btn-primary" id="onb-customer-open-modal-btn">' +
          '<span class="material-symbols-outlined" aria-hidden="true">add</span>' +
          t('settings.addCustomer') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function renderDoneStep() {
    return '<div class="onb-step-body onb-done-body">' +
      '<span class="onb-done-icon material-symbols-outlined" aria-hidden="true">check_circle</span>' +
      '<h2 class="onb-step-title">' + t('onboarding.doneTitle') + '</h2>' +
      '<p class="onb-step-subtitle">' + t('onboarding.doneSubtitle') + '</p>' +
    '</div>';
  }

  // ── Dot progress indicator ──────────────────────────────────────────────
  function renderDots(currentIdx) {
    var stepLabels = [
      t('onboarding.stepWelcome'),
      t('onboarding.stepCompany'),
      t('onboarding.stepBanking'),
      t('onboarding.stepServices'),
      t('onboarding.stepCustomers'),
      t('onboarding.stepDone')
    ];
    return STEPS.map(function (s, i) {
      var cls = 'onb-dot';
      if (i < currentIdx) cls += ' done';
      else if (i === currentIdx) cls += ' active';
      return '<div class="' + cls + '" title="' + stepLabels[i] + '">' +
        (i < currentIdx
          ? '<span class="material-symbols-outlined">check</span>'
          : '<span>' + (i + 1) + '</span>') +
        '</div>';
    }).join('<div class="onb-dot-line"></div>');
  }

  // ── Render full wizard state ────────────────────────────────────────────
  function renderStep(idx) {
    var step = STEPS[idx];

    var dotsEl = getEl('onb-dots');
    if (dotsEl) dotsEl.innerHTML = renderDots(idx);

    var contentEl = getEl('onb-step-content');
    if (contentEl) {
      if (step === 'welcome') {
        contentEl.innerHTML = renderWelcomeStep();
      } else if (step === 'company') {
        contentEl.innerHTML = renderCompanyStep();
      } else if (step === 'banking') {
        contentEl.innerHTML = renderBankingStep();
      } else if (step === 'services') {
        contentEl.innerHTML = renderServicesStep();
        var addBtn = getEl('onb-service-open-modal-btn');
        if (addBtn) addBtn.onclick = openOnboardingServiceModal;
      } else if (step === 'customers') {
        contentEl.innerHTML = renderCustomersStep();
        var addBtn2 = getEl('onb-customer-open-modal-btn');
        if (addBtn2) addBtn2.onclick = openOnboardingCustomerModal;
      } else if (step === 'done') {
        contentEl.innerHTML = renderDoneStep();
      }
    }

    var btnBack = getEl('onb-btn-back');
    var btnSkip = getEl('onb-btn-skip');
    var btnNext = getEl('onb-btn-next');
    var btnDash = getEl('onb-btn-dashboard');

    // Reset all buttons
    hideBtn(btnBack);
    hideBtn(btnSkip);
    hideBtn(btnNext);
    hideBtn(btnDash);

    if (step === 'done') {
      // Done: only "Go to Dashboard"
      showBtn(btnDash);
    } else if (step === 'welcome') {
      // Welcome: only "Get started" — no Back, no Skip
      showBtn(btnNext);
      if (btnNext) {
        btnNext.textContent = t('onboarding.welcomeGetStarted');
        btnNext.setAttribute('data-action', step);
      }
    } else {
      // All other steps: show Next
      showBtn(btnNext);
      if (btnNext) {
        btnNext.textContent = t('onboarding.saveAndContinue');
        btnNext.setAttribute('data-action', step);
      }
      // Back: visible from step 2 onward (idx > 1 skips back to welcome from company)
      if (idx > 0) showBtn(btnBack);
      // Skip: visible on all steps except company (mandatory)
      if (step !== 'company') showBtn(btnSkip);
    }

    // Focus first input
    setTimeout(function () {
      var first = contentEl && contentEl.querySelector('input:not([type=hidden])');
      if (first) first.focus();
    }, 50);
  }

  // ── Save helpers ─────────────────────────────────────────────────────────
  async function saveCompany() {
    var name = (getEl('onb-company-name') || {}).value;
    if (!name || !name.trim()) {
      showFieldError('onb-company-error', t('msg.companyNameRequired'));
      return false;
    }
    try {
      await api.postCompany({
        name: name.trim(),
        regNumber: ((getEl('onb-company-reg') || {}).value || '').trim(),
        vatNumber: ((getEl('onb-company-vat') || {}).value || '').trim(),
        legalAddress: ((getEl('onb-company-addr') || {}).value || '').trim(),
        isDefault: true
      });
      return true;
    } catch (e) {
      showFieldError('onb-company-error', t('msg.saveFailed') + ': ' + e.message);
      return false;
    }
  }

  async function saveBanking() {
    var bankName = ((getEl('onb-bank-name')  || {}).value || '').trim();
    var iban     = ((getEl('onb-bank-iban')  || {}).value || '').trim();
    var swift    = ((getEl('onb-bank-swift') || {}).value || '').trim();
    if (!bankName && !iban && !swift) return true; // all empty — skip silently
    try {
      var companies = await api.getCompanies();
      if (companies && companies.length > 0) {
        var co = companies[0];
        await api.putCompany(co.id, Object.assign({}, co, {
          bankName: bankName || co.bankName || '',
          bankAccount: iban || co.bankAccount || '',
          bankSwiftBic: swift || co.bankSwiftBic || ''
        }));
      }
      return true;
    } catch (e) {
      showFieldError('onb-banking-error', t('msg.saveFailed') + ': ' + e.message);
      return false;
    }
  }

  // ── Full-form modal handlers (match Settings exactly) ───────────────────
  function openOnboardingServiceModal() {
    var unitOptions = window.SERVICE_UNIT_OPTIONS || [
      { value: 'pc', label: 'Gab.' },
      { value: 'hour', label: 'St.' },
      { value: 'service', label: 'Pak.' }
    ];
    var lbl = function (key, fallback) { return typeof window.t === 'function' ? window.t(key) : fallback; };
    var unitOptsHtml = unitOptions.map(function (o) {
      var label = (typeof window.t === 'function' && window.t('unit.' + o.value) !== ('unit.' + o.value)) ? window.t('unit.' + o.value) : o.label;
      return '<option value="' + o.value + '">' + escapeHtml(label) + '</option>';
    }).join('');
    if (typeof showModal !== 'function') return;
    showModal(
      '<h3>' + lbl('modal.serviceNew', 'Add service') + '</h3>' +
      '<div class="form-block">' +
        '<div class="field">' +
          '<label>' + lbl('settings.serviceName', 'Name') + '</label>' +
          '<input type="text" id="onb-modal-svc-name" class="input input-full" placeholder="' + lbl('settings.serviceName', 'Name') + '">' +
        '</div>' +
        '<div class="field">' +
          '<label>' + lbl('editor.unit', 'Unit') + '</label>' +
          '<select id="onb-modal-svc-unit" class="input input-full">' + unitOptsHtml + '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label>' + lbl('settings.vatPct', 'VAT %') + '</label>' +
          '<select id="onb-modal-svc-vat" class="input input-full">' +
            '<option value="21" selected>21%</option>' +
            '<option value="12">12%</option>' +
            '<option value="0">0%</option>' +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label>' + lbl('editor.priceEur', 'Price (€)') + '</label>' +
          '<input type="number" id="onb-modal-svc-price" class="input input-full" value="0" step="0.01" min="0">' +
        '</div>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-secondary" id="onb-modal-svc-cancel">' + lbl('common.cancel', 'Cancel') + '</button>' +
          '<button type="button" class="btn btn-primary" id="onb-modal-svc-save">' + lbl('common.save', 'Save') + '</button>' +
        '</div>' +
      '</div>',
      { isNew: true }
    );
    document.getElementById('onb-modal-svc-cancel').addEventListener('click', function () { hideModal(true); });
    document.getElementById('onb-modal-svc-save').addEventListener('click', async function () {
      var nameEl = document.getElementById('onb-modal-svc-name');
      var name = nameEl ? nameEl.value.trim() : '';
      if (!name) {
        alert(typeof window.t === 'function' ? window.t('msg.serviceNameRequired') : 'Name is required.');
        return;
      }
      var unit = (document.getElementById('onb-modal-svc-unit') || {}).value || 'service';
      var vatVal = parseInt((document.getElementById('onb-modal-svc-vat') || {}).value || '21', 10);
      var price = parseFloat((document.getElementById('onb-modal-svc-price') || {}).value || '0') || 0;
      try {
        await api.postService({ name: name, unit: unit, defaultVatPercent: vatVal, lastPrice: price, measure: unit === 'hour' ? 'hourly' : 'units' });
        addedServices.push({ name: name });
        var listEl = getEl('onb-services-list');
        if (listEl) listEl.innerHTML = renderAddedChips(addedServices);
        hideModal(true);
      } catch (e) {
        alert((typeof window.t === 'function' ? window.t('msg.saveFailed') : 'Save failed') + ': ' + e.message);
      }
    });
  }

  function openOnboardingCustomerModal() {
    var lbl = function (key, fallback) { return typeof window.t === 'function' ? window.t(key) : fallback; };
    function sanitizePrefix(s) { return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }
    if (typeof showModal !== 'function') return;
    showModal(
      '<h3>' + lbl('modal.customerNew', 'Add customer') + '</h3>' +
      '<div class="form-block form-modal-cols">' +
        '<div class="field">' +
          '<label>' + lbl('settings.customerName', 'Name') + '</label>' +
          '<input type="text" id="onb-modal-cust-name" class="input" placeholder="' + lbl('settings.customerName', 'Name') + '">' +
        '</div>' +
        '<div class="field">' +
          '<label>' + lbl('settings.billPrefix', 'Prefix') + '</label>' +
          '<input type="text" id="onb-modal-cust-prefix" class="input" placeholder="' + lbl('settings.customerPrefixPlaceholder', 'Overrides default prefix') + '">' +
        '</div>' +
        '<div class="field field-full">' +
          '<label>' + lbl('settings.address', 'Address') + '</label>' +
          '<textarea id="onb-modal-cust-address" class="input" placeholder="' + lbl('settings.address', 'Address') + '"></textarea>' +
        '</div>' +
        '<div class="field">' +
          '<label>' + lbl('settings.regNumber', 'Reg. no.') + '</label>' +
          '<input type="text" id="onb-modal-cust-reg" class="input" placeholder="40001234567">' +
        '</div>' +
        '<div class="field">' +
          '<label>' + lbl('settings.vatNumber', 'VAT no.') + '</label>' +
          '<input type="text" id="onb-modal-cust-vat" class="input" placeholder="LV40001234567">' +
        '</div>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-secondary" id="onb-modal-cust-cancel">' + lbl('common.cancel', 'Cancel') + '</button>' +
          '<button type="button" class="btn btn-primary" id="onb-modal-cust-save">' + lbl('common.save', 'Save') + '</button>' +
        '</div>' +
      '</div>',
      { isNew: true }
    );
    document.getElementById('onb-modal-cust-cancel').addEventListener('click', function () { hideModal(true); });
    document.getElementById('onb-modal-cust-save').addEventListener('click', async function () {
      var nameEl = document.getElementById('onb-modal-cust-name');
      var name = nameEl ? nameEl.value.trim() : '';
      if (!name) {
        alert(typeof window.t === 'function' ? window.t('msg.customerNameRequired') : 'Name is required.');
        return;
      }
      var payload = {
        name: name,
        billPrefix: sanitizePrefix((document.getElementById('onb-modal-cust-prefix') || {}).value || ''),
        address: ((document.getElementById('onb-modal-cust-address') || {}).value || '').trim(),
        registrationNumber: ((document.getElementById('onb-modal-cust-reg') || {}).value || '').trim(),
        vatNumber: ((document.getElementById('onb-modal-cust-vat') || {}).value || '').trim(),
        inactive: false
      };
      try {
        await api.postCustomer(payload);
        addedCustomers.push({ name: name });
        var listEl = getEl('onb-customers-list');
        if (listEl) listEl.innerHTML = renderAddedChips(addedCustomers);
        hideModal(true);
      } catch (e) {
        alert((typeof window.t === 'function' ? window.t('msg.saveFailed') : 'Save failed') + ': ' + e.message);
      }
    });
  }

  // ── Complete onboarding ──────────────────────────────────────────────────
  async function completeOnboarding() {
    try { await api.putSettings({ onboardingComplete: true }); } catch (e) {}
    var overlay = getEl('onb-overlay');
    if (overlay) {
      overlay.classList.add('onb-overlay-exit');
      setTimeout(function () { overlay.hidden = true; }, 300);
    }
    if (window.refreshSettings) window.refreshSettings();
    if (window.refreshDashboard) window.refreshDashboard();
  }

  // ── Button handlers ──────────────────────────────────────────────────────
  var currentStepIdx = 0;

  async function handleNext() {
    var btnNext = getEl('onb-btn-next');
    var action  = btnNext ? (btnNext.getAttribute('data-action') || '') : '';

    if (action === 'company') {
      var ok = await saveCompany();
      if (!ok) return;
    } else if (action === 'banking') {
      var ok2 = await saveBanking();
      if (!ok2) return;
    }
    // services / customers: items already saved inline, just advance
    currentStepIdx++;
    renderStep(currentStepIdx);
  }

  function handleSkip() {
    currentStepIdx++;
    renderStep(currentStepIdx);
  }

  function handleBack() {
    if (currentStepIdx > 0) {
      currentStepIdx--;
      renderStep(currentStepIdx);
    }
  }

  function handleDashboard() {
    completeOnboarding().then(function () {
      window.location.hash = '#/';
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────
  function showOnboarding() {
    currentStepIdx = 0;
    addedServices  = [];
    addedCustomers = [];

    var overlay = getEl('onb-overlay');
    if (!overlay) return;
    overlay.hidden = false;
    overlay.classList.remove('onb-overlay-exit');

    var btnNext = getEl('onb-btn-next');
    var btnSkip = getEl('onb-btn-skip');
    var btnBack = getEl('onb-btn-back');
    var btnDash = getEl('onb-btn-dashboard');

    if (btnNext) btnNext.onclick = handleNext;
    if (btnSkip) btnSkip.onclick = handleSkip;
    if (btnBack) btnBack.onclick = handleBack;
    if (btnDash) btnDash.onclick = handleDashboard;

    renderStep(0);
  }

  window.showOnboarding = showOnboarding;
})();
