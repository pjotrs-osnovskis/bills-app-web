const pendingDeletes = new Map();

function showToast(opts) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const message = typeof opts === 'string' ? opts : (opts.message || '');
  const type = (opts && (opts.type === 'success' || opts.type === 'error' || opts.type === 'info')) ? opts.type : 'info';
  const duration = (opts && typeof opts.duration === 'number') ? opts.duration : 4000;
  const spinner = opts && opts.spinner;
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.setAttribute('role', 'status');
  if (spinner) {
    const spinEl = document.createElement('span');
    spinEl.className = 'toast-spinner';
    spinEl.setAttribute('aria-hidden', 'true');
    toast.appendChild(spinEl);
  }
  toast.appendChild(document.createTextNode(message));
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-dismiss';
  closeBtn.setAttribute('aria-label', typeof t === 'function' ? t('common.close') : 'Close');
  closeBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
  toast.appendChild(closeBtn);
  container.appendChild(toast);
  let removed = false;
  function remove() {
    if (removed) return;
    removed = true;
    toast.classList.add('toast-exit');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
  }
  closeBtn.addEventListener('click', remove);
  const tId = setTimeout(remove, duration);
  toast._toastTimeoutId = tId;
  return remove;
}

function showDeletedToast(opts) {
  const container = document.getElementById('toast-container');
  if (!container) return function () {};
  const message = opts.message || '';
  const onUndo = typeof opts.onUndo === 'function' ? opts.onUndo : function () {};
  const onDismiss = typeof opts.onDismiss === 'function' ? opts.onDismiss : function () {};
  const duration = typeof opts.duration === 'number' ? opts.duration : 5000;
  const toast = document.createElement('div');
  toast.className = 'toast toast-deleted';
  toast.setAttribute('role', 'status');
  const textSpan = document.createElement('span');
  textSpan.className = 'toast-deleted-msg';
  textSpan.textContent = message;
  toast.appendChild(textSpan);
  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'toast-undo-btn';
  undoBtn.textContent = typeof t === 'function' ? t('undo.undo') : 'Undo';
  toast.appendChild(undoBtn);
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-dismiss';
  closeBtn.setAttribute('aria-label', typeof t === 'function' ? t('common.close') : 'Close');
  closeBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
  toast.appendChild(closeBtn);
  container.appendChild(toast);
  let removed = false;
  let tId;
  function remove() {
    if (removed) return;
    removed = true;
    if (tId) clearTimeout(tId);
    toast.classList.add('toast-exit');
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
  }
  undoBtn.addEventListener('click', function () {
    remove();
    onUndo();
  });
  closeBtn.addEventListener('click', function () {
    remove();
    onDismiss();
  });
  tId = setTimeout(function () {
    tId = null;
    remove();
    onDismiss();
  }, duration);
  toast._toastTimeoutId = tId;
  return remove;
}

window.showToast = showToast;
window.showDeletedToast = showDeletedToast;

function setRowVisible(rowEl, visible) {
  if (visible) {
    rowEl.style.display = rowEl.tagName === 'TR' ? 'table-row' : '';
  } else {
    rowEl.style.display = 'none';
  }
}

function cancelPendingDeleteForRow(rowEl) {
  const state = pendingDeletes.get(rowEl);
  if (!state) return;
  pendingDeletes.delete(rowEl);
  setRowVisible(rowEl, true);
  if (state.removeToast) state.removeToast();
}

window.scheduleRowDelete = function(opts) {
  const delayMs = opts.delayMs || 5000;
  const rowEl = opts.rowEl;
  const actionsEl = opts.actionsEl;
  const performDelete = opts.performDelete;
  const itemName = opts.itemName || '';
  const onUndoRestore = opts.onUndoRestore || null;

  cancelPendingDeleteForRow(rowEl);

  const message = (typeof t === 'function' ? t('msg.itemDeleted') : '{{item}} was deleted').replace('{{item}}', itemName || '');

  let removeToast = function () {};

  function commitDelete() {
    removeToast();
    performDelete();
    if (rowEl.parentNode) rowEl.parentNode.removeChild(rowEl);
    pendingDeletes.delete(rowEl);
  }

  setRowVisible(rowEl, false);

  removeToast = showDeletedToast({
    message: message,
    duration: delayMs,
    onUndo: function () {
      removeToast();
      setRowVisible(rowEl, true);
      pendingDeletes.delete(rowEl);
    },
    onDismiss: commitDelete
  });

  pendingDeletes.set(rowEl, { removeToast: removeToast, onUndoRestore: onUndoRestore, actionsEl: actionsEl });
};

document.addEventListener('DOMContentLoaded', async () => {
  const authLoginEl = document.getElementById('auth-login');
  const mainAppEl = document.getElementById('main-app');
  const headerAppEl = document.getElementById('header-app');
  const authErrorEl = document.getElementById('auth-error');
  const navUserNameEl = document.getElementById('nav-user-name');
  const appLoadingEl = document.getElementById('app-loading');
  const bottomNavEl = document.getElementById('bottom-nav');

  function hideLoadingScreen() {
    if (!appLoadingEl) return;
    appLoadingEl.classList.add('app-loading-fade');
    setTimeout(function () {
      appLoadingEl.style.display = 'none';
    }, 260);
  }

  let user = null;
  try {
    user = await api.getAuth();
  } catch (e) {
    user = null;
  }

  if (!user) {
    try {
      const savedLocale = localStorage.getItem('bills-app-locale');
      if (savedLocale && ['lv', 'en', 'ru'].includes(savedLocale)) window.APP_LOCALE = savedLocale;
    } catch (e) {}
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    const authLocaleTrigger = document.getElementById('auth-login-locale-trigger');
    const authLocaleDropdown = document.getElementById('auth-login-locale-dropdown');
    const authLocaleValue = document.getElementById('auth-login-locale-value');
    const authLocaleWrap = authLocaleTrigger && authLocaleTrigger.closest('.auth-login-locale-trigger-wrap');
    const authLocaleOptions = document.querySelectorAll('.auth-login-locale-option');
    if (authLocaleTrigger && authLocaleDropdown && authLocaleValue && typeof window.getLocale === 'function') {
      function setLocaleDisplay(locale) {
        const opt = Array.from(authLocaleOptions).find((o) => o.getAttribute('data-locale') === locale);
        if (opt) {
          authLocaleValue.textContent = opt.textContent;
          authLocaleOptions.forEach((o) => o.setAttribute('aria-selected', o === opt ? 'true' : 'false'));
        }
      }
      setLocaleDisplay(window.getLocale());
      authLocaleTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        const open = authLocaleDropdown.hidden;
        authLocaleDropdown.hidden = !open;
        authLocaleTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (authLocaleWrap) authLocaleWrap.setAttribute('data-open', open ? 'true' : 'false');
      });
      authLocaleOptions.forEach((btn) => {
        btn.addEventListener('click', function () {
          const locale = ['lv', 'en', 'ru'].includes(this.getAttribute('data-locale')) ? this.getAttribute('data-locale') : 'en';
          if (typeof window.setLocale === 'function') window.setLocale(locale);
          try { localStorage.setItem('bills-app-locale', locale); } catch (e) {}
          if (typeof window.applyTranslations === 'function') window.applyTranslations();
          setLocaleDisplay(locale);
          authLocaleDropdown.hidden = true;
          authLocaleTrigger.setAttribute('aria-expanded', 'false');
          if (authLocaleWrap) authLocaleWrap.setAttribute('data-open', 'false');
        });
      });
      document.addEventListener('click', function () {
        if (!authLocaleDropdown.hidden) {
          authLocaleDropdown.hidden = true;
          authLocaleTrigger.setAttribute('aria-expanded', 'false');
          if (authLocaleWrap) authLocaleWrap.setAttribute('data-open', 'false');
        }
      });
    }
    hideLoadingScreen();
    authLoginEl.classList.remove('hidden');
    if (mainAppEl) mainAppEl.classList.add('hidden');
    if (headerAppEl) headerAppEl.classList.add('hidden');
    if (bottomNavEl) bottomNavEl.classList.add('hidden');
    if (window.location.search.includes('auth=failed') && authErrorEl) {
      authErrorEl.classList.remove('hidden');
    }
    return;
  }

  hideLoadingScreen();
  if (bottomNavEl) bottomNavEl.classList.remove('hidden');
  authLoginEl.classList.add('hidden');
  if (mainAppEl) mainAppEl.classList.remove('hidden');
  if (headerAppEl) headerAppEl.classList.remove('hidden');
  const navUserAccountEl = document.getElementById('nav-user-account');
  if (navUserAccountEl) navUserAccountEl.textContent = user.name || user.email || user.id;
  if (authErrorEl) authErrorEl.classList.add('hidden');

  // Theme toggle
  const navThemeBtn = document.getElementById('nav-theme-btn');
  if (navThemeBtn) {
    navThemeBtn.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      if (typeof window.applyTheme === 'function') window.applyTheme(next);
      else {
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('bills-app-theme', next); } catch (e) {}
      }
      api.putSettings({ theme: next }).catch(function () {});
    });
  }

  // Nav language dropdown
  const navLangBtn = document.getElementById('nav-lang-btn');
  const navLangDropdown = document.getElementById('nav-lang-dropdown');
  if (navLangBtn && navLangDropdown) {
    navLangBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      navLangDropdown.hidden = !navLangDropdown.hidden;
    });
    navLangDropdown.querySelectorAll('[data-locale]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const locale = btn.getAttribute('data-locale');
        if (!['lv', 'en', 'ru'].includes(locale)) return;
        if (typeof window.setLocale === 'function') window.setLocale(locale);
        try { localStorage.setItem('bills-app-locale', locale); } catch (e) {}
        navLangDropdown.hidden = true;
        api.putSettings({ locale: locale }).catch(function () {}).finally(function () {
          if (typeof window.applyTranslations === 'function') window.applyTranslations();
          if (window.refreshBillsList) window.refreshBillsList();
          if (window.refreshSettings) window.refreshSettings();
        });
      });
    });
    document.addEventListener('click', function () {
      navLangDropdown.hidden = true;
    });
    navLangDropdown.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  function applyTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('bills-app-theme', theme); } catch (e) {}
  }
  try {
    const settings = await api.getSettings();
    window.APP_LOCALE = (settings && settings.locale && ['lv', 'en', 'ru'].includes(settings.locale)) ? settings.locale : 'en';
    if (settings && (settings.theme === 'light' || settings.theme === 'dark')) applyTheme(settings.theme);
  } catch (e) {
    window.APP_LOCALE = 'en';
  }
  window.applyTheme = applyTheme;
  if (typeof window.applyTranslations === 'function') window.applyTranslations();
  initViews();
  if (typeof window.refreshNavBankLinkData === 'function') {
    window.refreshNavBankLinkData();
  }

  // Onboarding: show wizard for new accounts that haven't completed setup
  (async function () {
    try {
      const [onbSettings, onbCompanies] = await Promise.all([api.getSettings(), api.getCompanies()]);
      if (!onbSettings.onboardingComplete && onbCompanies.length === 0) {
        if (typeof window.showOnboarding === 'function') window.showOnboarding();
      }
    } catch (e) {
      // non-fatal — skip onboarding on error
    }
  }());

  document.getElementById('btn-export').addEventListener('click', async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bills-app-export-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert((typeof t === 'function' ? t('msg.exportFailed') : 'Export failed') + ': ' + e.message);
    }
  });

  document.getElementById('input-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        await api.importData(data);
        showToast({ message: typeof t === 'function' ? t('msg.importDone') : 'Import done.', type: 'success' });
        if (window.refreshBillsList) window.refreshBillsList();
        if (window.refreshSettings) window.refreshSettings();
      } catch (err) {
        showToast({ message: (typeof t === 'function' ? t('msg.importFailed') : 'Import failed') + ': ' + err.message, type: 'error', duration: 6000 });
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  const footerYear = document.getElementById('footer-year');
  if (footerYear) footerYear.textContent = new Date().getFullYear();
  const authFooterYear = document.getElementById('auth-footer-year');
  if (authFooterYear) authFooterYear.textContent = new Date().getFullYear();

  var navAddCustomerBtn = document.getElementById('nav-bottom-add-customer');
  if (navAddCustomerBtn) {
    navAddCustomerBtn.addEventListener('click', function () {
      if (window.openCustomerModal) window.openCustomerModal(null);
    });
  }
});
