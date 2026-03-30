(function () {
  'use strict';

  // ── Form switching ──────────────────────────────────────────────────────────

  function showForm(formId) {
    document.querySelectorAll('.auth-local-form').forEach(function (f) {
      f.classList.add('hidden');
    });
    var target = document.getElementById(formId);
    if (target) target.classList.remove('hidden');
  }

  // ── Error / success helpers ─────────────────────────────────────────────────

  function setMsg(elId, msg, isError) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('hidden', !msg);
    if (isError) {
      el.classList.add('auth-local-error');
      el.classList.remove('auth-local-success');
    } else {
      el.classList.add('auth-local-success');
      el.classList.remove('auth-local-error');
    }
  }

  function clearMsg(elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
  }

  // ── Loading state ───────────────────────────────────────────────────────────

  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset.origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '…';
    } else {
      btn.disabled = false;
      if (btn.dataset.origText) btn.textContent = btn.dataset.origText;
    }
  }

  // ── Fetch helper ────────────────────────────────────────────────────────────

  async function postJson(url, data) {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'same-origin'
    });
    var json = await res.json().catch(function () { return {}; });
    return { ok: res.ok, status: res.status, data: json };
  }

  function onAuthReady() {
    // ── Check for ?reset=TOKEN in URL ─────────────────────────────────────────
    var resetToken = null;
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('reset')) {
      resetToken = urlParams.get('reset');
    }

    if (resetToken) {
      // Hide Google button and divider; show reset form
      var googleBtn = document.getElementById('auth-google-link');
      if (googleBtn) googleBtn.style.display = 'none';
      var divider = document.querySelector('.auth-divider');
      if (divider) divider.style.display = 'none';
      var titleEl = document.querySelector('.auth-login-title');
      if (titleEl) titleEl.setAttribute('data-i18n', 'auth.resetTitle');
      var subtitleEl = document.querySelector('.auth-login-subtitle');
      if (subtitleEl) subtitleEl.style.display = 'none';
      showForm('auth-local-reset-form');
    }
    // else: default login form is visible (not hidden) by default

    // ── Toggle: login → register ──────────────────────────────────────────────
    var registerLink = document.getElementById('auth-register-link');
    if (registerLink) {
      registerLink.addEventListener('click', function () {
        clearMsg('auth-local-error');
        showForm('auth-local-register-form');
      });
    }

    // ── Toggle: login → forgot ────────────────────────────────────────────────
    var forgotLink = document.getElementById('auth-forgot-link');
    if (forgotLink) {
      forgotLink.addEventListener('click', function () {
        clearMsg('auth-local-error');
        showForm('auth-local-forgot-form');
      });
    }

    // ── Toggle: register → login ──────────────────────────────────────────────
    var backLoginLink = document.getElementById('auth-back-login-link');
    if (backLoginLink) {
      backLoginLink.addEventListener('click', function () {
        clearMsg('auth-reg-error');
        showForm('auth-local-login-form');
      });
    }

    // ── Toggle: forgot → login ────────────────────────────────────────────────
    var backLoginFromForgot = document.getElementById('auth-back-login-from-forgot');
    if (backLoginFromForgot) {
      backLoginFromForgot.addEventListener('click', function () {
        clearMsg('auth-forgot-error');
        clearMsg('auth-forgot-success');
        showForm('auth-local-login-form');
      });
    }

    // ── Login submit ──────────────────────────────────────────────────────────
    var loginForm = document.getElementById('auth-local-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearMsg('auth-local-error');
        var btn = document.getElementById('auth-local-login-btn');
        setLoading(btn, true);
        var email = document.getElementById('auth-email').value;
        var password = document.getElementById('auth-password').value;
        var result = await postJson('/auth/login/local', { email: email, password: password });
        setLoading(btn, false);
        if (!result.ok) {
          setMsg('auth-local-error', result.data.error || 'Sign-in failed.', true);
          return;
        }
        if (result.data.csrfToken && typeof api !== 'undefined') {
          api.setCsrfToken(result.data.csrfToken);
        }
        window.location.reload();
      });
    }

    // ── Register submit ───────────────────────────────────────────────────────
    var registerForm = document.getElementById('auth-local-register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearMsg('auth-reg-error');
        var btn = document.getElementById('auth-local-register-btn');
        setLoading(btn, true);
        var name = document.getElementById('auth-reg-name').value;
        var email = document.getElementById('auth-reg-email').value;
        var password = document.getElementById('auth-reg-password').value;
        var result = await postJson('/auth/register', { name: name, email: email, password: password });
        setLoading(btn, false);
        if (!result.ok) {
          setMsg('auth-reg-error', result.data.error || 'Registration failed.', true);
          return;
        }
        if (result.data.csrfToken && typeof api !== 'undefined') {
          api.setCsrfToken(result.data.csrfToken);
        }
        window.location.reload();
      });
    }

    // ── Forgot password submit ────────────────────────────────────────────────
    var forgotForm = document.getElementById('auth-local-forgot-form');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearMsg('auth-forgot-error');
        clearMsg('auth-forgot-success');
        var btn = document.getElementById('auth-local-forgot-btn');
        setLoading(btn, true);
        var email = document.getElementById('auth-forgot-email').value;
        var result = await postJson('/auth/forgot-password', { email: email });
        setLoading(btn, false);
        if (!result.ok) {
          setMsg('auth-forgot-error', result.data.error || 'Request failed.', true);
          return;
        }
        setMsg('auth-forgot-success', result.data.message || 'Check your email for a reset link.', false);
        btn.disabled = true;
      });
    }

    // ── Reset password submit ─────────────────────────────────────────────────
    var resetForm = document.getElementById('auth-local-reset-form');
    if (resetForm) {
      resetForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearMsg('auth-reset-error');
        clearMsg('auth-reset-success');
        var password = document.getElementById('auth-reset-password').value;
        var confirm = document.getElementById('auth-reset-password-confirm').value;
        if (password !== confirm) {
          setMsg('auth-reset-error', 'Passwords do not match.', true);
          return;
        }
        var btn = document.getElementById('auth-local-reset-btn');
        setLoading(btn, true);
        var result = await postJson('/auth/reset-password', { token: resetToken, password: password });
        setLoading(btn, false);
        if (!result.ok) {
          setMsg('auth-reset-error', result.data.error || 'Reset failed.', true);
          return;
        }
        setMsg('auth-reset-success', typeof t === 'function' ? t('auth.resetSuccess') : 'Password changed. You can now sign in.', false);
        btn.disabled = true;
        // After success, redirect to login (strip ?reset= from URL) after short delay
        setTimeout(function () {
          window.location.href = window.location.pathname;
        }, 2500);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onAuthReady);
  } else {
    onAuthReady();
  }
}());
