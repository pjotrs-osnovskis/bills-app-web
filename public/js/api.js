const API_BASE = '';

let _csrfToken = null;

function setCsrfToken(token) {
  _csrfToken = token;
}

function csrfHeaders() {
  return _csrfToken ? { 'X-CSRF-Token': _csrfToken } : {};
}

async function apiGet(path) {
  const res = await fetch(API_BASE + path, { credentials: 'include' });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(body),
    credentials: 'include'
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(body),
    credentials: 'include'
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(API_BASE + path, { method: 'DELETE', headers: csrfHeaders(), credentials: 'include' });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

async function getAuth() {
  const res = await fetch(API_BASE + '/auth/me', { credentials: 'include' });
  if (typeof window !== 'undefined') window.APP_SHOW_CLIENT_DEV_HINTS = false;
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  if (data.csrfToken) setCsrfToken(data.csrfToken);
  if (typeof window !== 'undefined') {
    window.APP_SHOW_CLIENT_DEV_HINTS = data.showClientDevHints === true;
    if (typeof window.applyClientDevHintsVisibility === 'function') window.applyClientDevHintsVisibility();
  }
  return data.user || null;
}

async function postForgotPassword(email) {
  const res = await fetch(API_BASE + '/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: String(email || '').trim().toLowerCase() }),
    credentials: 'include'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && data.error) ? data.error : res.statusText;
    throw new Error(msg);
  }
  return data;
}

const api = {
  getAuth,
  getAccount: () => apiGet('/auth/account'),
  putAccount: (body) => apiPut('/auth/account', body),
  postForgotPassword,
  setCsrfToken,
  getCompanies: () => apiGet('/api/companies'),
  postCompany: (body) => apiPost('/api/companies', body),
  putCompany: (id, body) => apiPut('/api/companies/' + id, body),
  deleteCompany: (id) => apiDelete('/api/companies/' + id),
  getCustomers: () => apiGet('/api/customers'),
  postCustomer: (body) => apiPost('/api/customers', body),
  putCustomer: (id, body) => apiPut('/api/customers/' + id, body),
  deleteCustomer: (id) => apiDelete('/api/customers/' + id),
  getServices: () => apiGet('/api/services'),
  postService: (body) => apiPost('/api/services', body),
  putService: (id, body) => apiPut('/api/services/' + id, body),
  deleteService: (id) => apiDelete('/api/services/' + id),
  getBills: () => apiGet('/api/bills'),
  getBill: (id) => apiGet('/api/bills/' + id),
  postBill: (body) => apiPost('/api/bills', body),
  putBill: (id, body) => apiPut('/api/bills/' + id, body),
  deleteBill: (id) => apiDelete('/api/bills/' + id),
  getSettings: () => apiGet('/api/settings'),
  putSettings: (body) => apiPut('/api/settings', body),
  uploadLogo: (file) => {
    const form = new FormData();
    form.append('logo', file);
    return fetch(API_BASE + '/api/upload-logo', { method: 'POST', headers: csrfHeaders(), body: form, credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
  },
  exportData: () => fetch(API_BASE + '/api/export', { credentials: 'include' }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText))),
  importData: (data) => apiPost('/api/import', data),
  getDriveStatus: () => apiGet('/api/drive/status'),
  putDriveSettings: (body) => apiPut('/api/drive/settings', body),
  disconnectDrive: () => apiDelete('/api/drive/disconnect'),
  uploadToDrive: (body) => apiPost('/api/drive/upload', body),
  getGoogleConfig: () => apiGet('/api/config/google'),
  getDriveAccessToken: () => apiGet('/api/drive/access-token')
};
