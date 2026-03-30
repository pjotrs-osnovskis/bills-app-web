let bills = [];
let customersForFilter = [];
let sortBy = 'date';
let sortDir = 'desc';

function getFilterValues() {
  return {
    from: document.getElementById('filter-date-from').value,
    to: document.getElementById('filter-date-to').value,
    customerId: document.getElementById('filter-customer').value,
    status: document.getElementById('filter-status') ? document.getElementById('filter-status').value : '',
    search: document.getElementById('filter-search') ? document.getElementById('filter-search').value.trim().toLowerCase() : ''
  };
}

function applyFilters(list, filters) {
  const today = new Date().toISOString().slice(0, 10);
  return list.filter((b) => {
    if (filters.from && b.date < filters.from) return false;
    if (filters.to && b.date > filters.to) return false;
    if (filters.customerId && b.customerId !== filters.customerId) return false;
    const effectiveStatus = getEffectiveStatus(b, today);
    if (filters.status && effectiveStatus !== filters.status) return false;
    if (filters.search) {
      const num = (b.number || '').toLowerCase();
      const cust = (customersForFilter.find((c) => c.id === b.customerId) || {}).name || '';
      if (!num.includes(filters.search) && !cust.toLowerCase().includes(filters.search)) return false;
    }
    return true;
  });
}

function getEffectiveStatus(bill, today) {
  if (!today) today = new Date().toISOString().slice(0, 10);
  if (bill.status === 'sent' && bill.paymentDueDate && bill.paymentDueDate < today) return 'overdue';
  return bill.status || 'draft';
}

function updateBillsStats(allBills) {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  let outstanding = 0, overdue = 0, paidMonth = 0, draftCount = 0;
  (allBills || []).forEach(function (b) {
    const eff = getEffectiveStatus(b, today);
    if (eff === 'overdue') { overdue += Number(b.totalGross) || 0; outstanding += Number(b.totalGross) || 0; }
    else if (eff === 'sent') { outstanding += Number(b.totalGross) || 0; }
    else if (eff === 'paid' && b.updatedAt && b.updatedAt.slice(0, 7) === thisMonth) { paidMonth += Number(b.totalGross) || 0; }
    else if (eff === 'draft') { draftCount++; }
  });
  const fmt = (v) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const el = (id) => document.getElementById(id);
  if (el('stat-outstanding')) el('stat-outstanding').textContent = fmt(outstanding);
  if (el('stat-overdue')) {
    el('stat-overdue').textContent = fmt(overdue);
    const chip = el('stat-overdue').closest('.bills-stat-chip');
    if (chip) chip.classList.toggle('bills-stat-chip-overdue-active', overdue > 0);
  }
  if (el('stat-paid-month')) el('stat-paid-month').textContent = fmt(paidMonth);
  if (el('stat-drafts')) el('stat-drafts').textContent = draftCount;
}

async function refreshBillsList() {
  try {
    const [billsData, customersData] = await Promise.all([api.getBills(), api.getCustomers()]);
    bills = billsData;
    customersForFilter = customersData;
  } catch (e) {
    console.error(e);
    document.getElementById('bills-tbody').innerHTML = '<tr><td colspan="6" class="list-empty">' + (typeof t === 'function' ? t('bills.loadError') : 'Failed to load bills.') + '</td></tr>';
    return;
  }
  updateBillsStats(bills);
  const filters = getFilterValues();
  let list = applyFilters(bills, filters);
  list = sortBillsList(list);
  renderBillsTable(list);
  renderCustomerFilter();
  updateSortHeaders();
}

function sortBillsList(list) {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    let va; let vb;
    if (sortBy === 'number') { va = a.number || ''; vb = b.number || ''; return dir * (va < vb ? -1 : va > vb ? 1 : 0); }
    if (sortBy === 'date') { va = creationSortKey(a); vb = creationSortKey(b); return dir * (va < vb ? -1 : va > vb ? 1 : 0); }
    if (sortBy === 'customer') {
      va = (customersForFilter.find((c) => c.id === a.customerId) || {}).name || a.customerId || '';
      vb = (customersForFilter.find((c) => c.id === b.customerId) || {}).name || b.customerId || '';
      return dir * (va < vb ? -1 : va > vb ? 1 : 0);
    }
    if (sortBy === 'total') { va = Number(a.totalGross) || 0; vb = Number(b.totalGross) || 0; return dir * (va - vb); }
    if (sortBy === 'status') {
      const today = new Date().toISOString().slice(0, 10);
      va = getEffectiveStatus(a, today); vb = getEffectiveStatus(b, today);
      return dir * (va < vb ? -1 : va > vb ? 1 : 0);
    }
    return 0;
  });
}

function setSort(col) {
  if (sortBy === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortBy = col; sortDir = 'desc'; }
  const filters = getFilterValues();
  let list = applyFilters(bills, filters);
  list = sortBillsList(list);
  updateSortHeaders();
  renderBillsTable(list);
}

function updateSortHeaders() {
  document.querySelectorAll('.table .sortable').forEach((th) => {
    const col = th.getAttribute('data-sort');
    const key = th.getAttribute('data-label-key');
    const label = (typeof t === 'function' && key ? t(key) : null) || th.getAttribute('data-label') || col;
    th.textContent = label;
    th.classList.remove('sort-asc', 'sort-desc');
    if (sortBy === col) th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

function renderCustomerFilter() {
  const sel = document.getElementById('filter-customer');
  const current = sel.value;
  sel.innerHTML = '<option value="">' + (typeof t === 'function' ? t('bills.allCustomers') : 'All customers') + '</option>';
  customersForFilter.forEach((c) => {
    if (c.inactive) return;
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatCreationDate(bill) {
  const iso = bill.createdAt || (bill.date ? bill.date + 'T00:00:00.000Z' : null);
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return bill.date || '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return bill.createdAt ? `${day}/${m}/${y} ${h}:${min}` : `${day}/${m}/${y}`;
}

function creationSortKey(bill) {
  return bill.createdAt || (bill.date ? bill.date + 'T00:00:00.000Z' : '');
}

function statusBadge(effectiveStatus) {
  const labels = {
    draft:   typeof t === 'function' ? t('status.draft')   : 'Draft',
    sent:    typeof t === 'function' ? t('status.sent')    : 'Sent',
    paid:    typeof t === 'function' ? t('status.paid')    : 'Paid',
    overdue: typeof t === 'function' ? t('status.overdue') : 'Overdue'
  };
  const label = labels[effectiveStatus] || effectiveStatus;
  return `<span class="status-badge status-${escapeHtml(effectiveStatus)}">${escapeHtml(label)}</span>`;
}

function billMonthKey(b) {
  var d = b.date || (b.createdAt ? b.createdAt.slice(0, 10) : null);
  return d ? d.slice(0, 7) : '';  // "YYYY-MM"
}

function formatMonthLabel(yearMonth) {
  if (!yearMonth) return '';
  var parts = yearMonth.split('-');
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  var month = d.toLocaleString(typeof window.APP_LOCALE === 'string' ? window.APP_LOCALE : 'en', { month: 'long' });
  return month.charAt(0).toUpperCase() + month.slice(1) + ' ' + parts[0];
}

function invoicePdfReadyPromise(billFresh, companies, customers, settings, delivery) {
  return new Promise(function (resolve, reject) {
    if (!window.generateBillPdf) {
      reject(new Error(typeof t === 'function' ? t('msg.pdfNotAvailable') : 'PDF is not available.'));
      return;
    }
    var settled = false;
    var tId = setTimeout(function () {
      if (!settled) {
        settled = true;
        reject(new Error(typeof t === 'function' ? t('msg.pdfEmailTimeout') : 'PDF generation timed out.'));
      }
    }, 120000);
    function onBlob(blob, filename) {
      if (settled) return;
      if (delivery === 'blob') {
        settled = true;
        clearTimeout(tId);
        resolve({ blob: blob, filename: filename });
        return;
      }
      if (delivery === 'download') {
        settled = true;
        clearTimeout(tId);
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        resolve({ filename: filename });
        return;
      }
      settled = true;
      clearTimeout(tId);
      var reader = new FileReader();
      reader.onload = function () {
        var s = reader.result;
        var i = s.indexOf(',');
        resolve({ base64: i >= 0 ? s.slice(i + 1) : s, filename: filename });
      };
      reader.onerror = function () {
        reject(new Error(typeof t === 'function' ? t('msg.pdfReadFailed') : 'Could not read PDF.'));
      };
      reader.readAsDataURL(blob);
    }
    try {
      window.generateBillPdf(billFresh, companies, customers, {
        billsLocale: (settings && settings.billsLocale) || 'en',
        asBlobCallback: onBlob,
        onPdfError: function (err) {
          if (settled) return;
          settled = true;
          clearTimeout(tId);
          reject(err);
        }
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(tId);
        reject(err);
      }
    }
  });
}

function sanitizePdfFilename(name) {
  var raw = name != null && String(name).trim() ? String(name).trim() : 'invoice.pdf';
  if (!/\.pdf$/i.test(raw)) raw = raw.replace(/\.+$/, '') + '.pdf';
  raw = raw.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
  if (!raw || raw === '.pdf') raw = 'invoice.pdf';
  return raw;
}

function isWindowsDesktop() {
  var ua = navigator.userAgent || '';
  if (/Windows/.test(ua) && !/Mobile|Tablet/.test(ua)) return true;
  if (navigator.userAgentData && navigator.userAgentData.platform === 'Windows') return true;
  return false;
}

async function savePdfWithFilePicker(blob, filename) {
  if (typeof window.showSaveFilePicker !== 'function') return false;
  var safeName = sanitizePdfFilename(filename);
  try {
    var handle = await window.showSaveFilePicker({
      suggestedName: safeName,
      types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }]
    });
    var writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (e) {
    if (e && e.name === 'AbortError') return 'aborted';
    return false;
  }
}

async function tryNavigatorSharePdf(blob, filename, titleText) {
  if (!blob || blob.size === 0) return 'unavailable';
  if (typeof window.File !== 'function' || typeof navigator.share !== 'function') {
    return 'unavailable';
  }
  var safeName = sanitizePdfFilename(filename);
  var displayTitle = titleText != null && String(titleText).trim() ? String(titleText).trim() : safeName.replace(/\.pdf$/i, '');
  var pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  var file = new File([pdfBlob], safeName, { type: 'application/pdf', lastModified: Date.now() });
  var sharePayload = { files: [file], title: displayTitle };
  if (typeof navigator.canShare === 'function') {
    if (!navigator.canShare(sharePayload)) {
      sharePayload = { files: [file] };
      if (!navigator.canShare(sharePayload)) return 'unavailable';
    }
  } else {
    sharePayload = { files: [file] };
  }
  try {
    await navigator.share(sharePayload);
    return 'shared';
  } catch (shareErr) {
    if (shareErr && shareErr.name === 'AbortError') return 'aborted';
    return 'unavailable';
  }
}

function triggerBlobDownload(blob, filename) {
  var safe = sanitizePdfFilename(filename);
  var dlUrl = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = dlUrl;
  a.download = safe;
  a.click();
  URL.revokeObjectURL(dlUrl);
}

async function shareBillPdf(id) {
  try {
    const bill = bills.find((b) => b.id === id);
    if (!bill) return;
    const [billFresh, companies, customers, settings] = await Promise.all([
      api.getBill(id),
      api.getCompanies(),
      api.getCustomers(),
      api.getSettings()
    ]);
    const pdfResult = await invoicePdfReadyPromise(billFresh, companies, customers, settings, 'blob');
    if (!pdfResult.blob || pdfResult.blob.size === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast({
          message: typeof t === 'function' ? t('msg.pdfEmptyOrInvalid') : 'Could not build a PDF file.',
          type: 'error',
          duration: 8000
        });
      }
      return;
    }
    var safeName = sanitizePdfFilename(pdfResult.filename);
    var titleForShare = billFresh && billFresh.number ? 'Invoice ' + String(billFresh.number) : safeName.replace(/\.pdf$/i, '');

    if (isWindowsDesktop()) {
      var saved = await savePdfWithFilePicker(pdfResult.blob, safeName);
      if (saved === true) return;
      if (saved === 'aborted') return;
      triggerBlobDownload(pdfResult.blob, safeName);
      return;
    }

    const shareResult = await tryNavigatorSharePdf(pdfResult.blob, safeName, titleForShare);
    if (shareResult === 'shared' || shareResult === 'aborted') return;
    triggerBlobDownload(pdfResult.blob, safeName);
  } catch (e) {
    const m = (e && e.message) ? e.message : String(e);
    if (typeof window.showToast === 'function') {
      window.showToast({ message: (typeof t === 'function' ? t('msg.sharePdfFailed') : 'Could not share PDF') + ': ' + m, type: 'error', duration: 8000 });
    } else {
      alert((typeof t === 'function' ? t('msg.sharePdfFailed') : 'Could not share PDF') + ': ' + m);
    }
  }
}

function renderBillsTable(list) {
  const tbody = document.getElementById('bills-tbody');
  if (list.length === 0) {
    const emptyTitle = typeof t === 'function' ? t('bills.emptyTitle') : 'No invoices yet';
    const emptyText  = typeof t === 'function' ? t('bills.empty')      : 'Create your first invoice to get started.';
    const btnLabel   = typeof t === 'function' ? t('nav.createNewBill') : 'Create new invoice';
    tbody.innerHTML =
      '<tr><td colspan="6" class="list-empty">' +
        '<div class="empty-state">' +
          '<span class="material-symbols-outlined empty-state-icon" aria-hidden="true">receipt_long</span>' +
          '<h2 class="empty-state-title">' + emptyTitle + '</h2>' +
          '<p class="empty-state-text">' + emptyText + '</p>' +
          '<div class="empty-state-actions">' +
            '<a href="#/new" class="btn btn-primary">' + btnLabel + '</a>' +
          '</div>' +
        '</div>' +
      '</td></tr>';
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const editLabel = typeof t === 'function' ? t('common.edit') : 'Edit';
  const duplicateLabel = typeof t === 'function' ? t('bills.duplicate') : 'Duplicate';
  const downloadLabel = typeof t === 'function' ? t('bills.downloadPdf') : 'Download PDF';
  const sharePdfLabel = typeof t === 'function' ? t('bills.sharePdf') : 'Share…';
  const saveToDriveLabel = typeof t === 'function' ? t('bills.saveToDrive') : 'Save to Drive';
  const deleteLabel = typeof t === 'function' ? t('common.delete') : 'Delete';
  const markSentLabel = typeof t === 'function' ? t('status.markSent') : 'Mark as Sent';
  const markPaidLabel = typeof t === 'function' ? t('status.markPaid') : 'Mark as Paid';
  const markDraftLabel = typeof t === 'function' ? t('status.markDraft') : 'Revert to Draft';
  var lastMonthKey = null;
  tbody.innerHTML = list.map((b) => {
    const cust = customersForFilter.find((c) => c.id === b.customerId);
    const custName = cust ? cust.name : (b.customerId || '—');
    const effectiveStatus = getEffectiveStatus(b, today);
    const storedStatus = b.status || 'draft';
    var monthKey = billMonthKey(b);
    var separatorRow = '';
    if (monthKey && monthKey !== lastMonthKey) {
      separatorRow = `<tr class="month-separator-row"><td colspan="6"><strong>${escapeHtml(formatMonthLabel(monthKey))}</strong></td></tr>`;
      lastMonthKey = monthKey;
    }
    return separatorRow + `
      <tr>
        <td>${escapeHtml(b.number)}</td>
        <td>${escapeHtml(formatCreationDate(b))}</td>
        <td>${escapeHtml(custName)}</td>
        <td class="status-cell">${statusBadge(effectiveStatus)}</td>
        <td class="total-cell">${Number(b.totalGross).toFixed(2)} €</td>
        <td class="actions">
          <button type="button" class="btn btn-icon btn-ghost btn-pdf-download" data-id="${escapeHtml(b.id)}" title="${escapeHtml(downloadLabel)}" aria-label="${escapeHtml(downloadLabel)}"><span class="material-symbols-outlined" aria-hidden="true">download</span></button>
          <div class="actions-dropdown">
            <button type="button" class="btn btn-icon btn-ghost btn-actions-trigger" data-id="${escapeHtml(b.id)}" aria-haspopup="true" aria-expanded="false" title="${escapeHtml(editLabel)}" aria-label="${escapeHtml(editLabel)}"><span class="material-symbols-outlined" aria-hidden="true">more_vert</span></button>
            <div class="actions-dropdown-menu hidden" role="menu">
              <button type="button" role="menuitem" class="actions-dropdown-item" data-action="edit" data-id="${escapeHtml(b.id)}"><span class="material-symbols-outlined" aria-hidden="true">edit</span><span>${escapeHtml(editLabel)}</span></button>
              <button type="button" role="menuitem" class="actions-dropdown-item actions-dropdown-item-download" data-action="download" data-id="${escapeHtml(b.id)}"><span class="material-symbols-outlined" aria-hidden="true">download</span><span>${escapeHtml(downloadLabel)}</span></button>
              <button type="button" role="menuitem" class="actions-dropdown-item" data-action="share-pdf" data-id="${escapeHtml(b.id)}"><span class="material-symbols-outlined" aria-hidden="true">ios_share</span><span>${escapeHtml(sharePdfLabel)}</span></button>
              <button type="button" role="menuitem" class="actions-dropdown-item" data-action="duplicate" data-id="${escapeHtml(b.id)}"><span class="material-symbols-outlined" aria-hidden="true">content_copy</span><span>${escapeHtml(duplicateLabel)}</span></button>
              ${storedStatus !== 'sent' ? `<button type="button" role="menuitem" class="actions-dropdown-item" data-action="mark-sent" data-id="${escapeHtml(b.id)}"><span class="material-symbols-outlined" aria-hidden="true">send</span><span>${escapeHtml(markSentLabel)}</span></button>` : ''}
              ${storedStatus !== 'paid' ? `<button type="button" role="menuitem" class="actions-dropdown-item" data-action="mark-paid" data-id="${escapeHtml(b.id)}"><span class="material-symbols-outlined" aria-hidden="true">payments</span><span>${escapeHtml(markPaidLabel)}</span></button>` : ''}
              ${storedStatus !== 'draft' ? `<button type="button" role="menuitem" class="actions-dropdown-item" data-action="mark-draft" data-id="${escapeHtml(b.id)}"><span class="material-symbols-outlined" aria-hidden="true">draft</span><span>${escapeHtml(markDraftLabel)}</span></button>` : ''}
              <button type="button" role="menuitem" class="actions-dropdown-item" data-action="save-to-drive" data-id="${escapeHtml(b.id)}"><span class="material-symbols-outlined" aria-hidden="true">add_to_drive</span><span>${escapeHtml(saveToDriveLabel)}</span></button>
              <button type="button" role="menuitem" class="actions-dropdown-item actions-dropdown-item-danger" data-action="delete" data-id="${escapeHtml(b.id)}"><span class="material-symbols-outlined" aria-hidden="true">delete</span><span>${escapeHtml(deleteLabel)}</span></button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  tbody.querySelectorAll('.actions-dropdown').forEach(attachDropdownListeners);
  tbody.querySelectorAll('.btn-pdf-download').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      downloadBillPdf(btn.getAttribute('data-id'));
    });
  });
}

function closeAllActionsDropdowns() {
  document.querySelectorAll('.actions-dropdown-menu').forEach((m) => {
    m.classList.add('hidden');
    m.style.position = '';
    m.style.top = '';
    m.style.left = '';
  });
  document.querySelectorAll('.btn-actions-trigger').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

function attachDropdownListeners(dropdownEl) {
  const trigger = dropdownEl.querySelector('.btn-actions-trigger');
  const menu = dropdownEl.querySelector('.actions-dropdown-menu');
  if (!trigger || !menu) return;
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !menu.classList.contains('hidden');
    closeAllActionsDropdowns();
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
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
      const id = item.getAttribute('data-id');
      const action = item.getAttribute('data-action');
      if (action === 'edit') window.location.hash = '#/bill/' + id;
      else if (action === 'duplicate') duplicateBill(id);
      else if (action === 'download') downloadBillPdf(id);
      else if (action === 'share-pdf') shareBillPdf(id);
      else if (action === 'mark-sent') updateBillStatus(id, 'sent');
      else if (action === 'mark-paid') updateBillStatus(id, 'paid');
      else if (action === 'mark-draft') updateBillStatus(id, 'draft');
      else if (action === 'save-to-drive') saveInvoiceToDrive(id);
      else if (action === 'delete') {
        const row = dropdownEl.closest('tr');
        const actionsCell = row && row.querySelector('td.actions');
        const numberCell = row && row.querySelector('td:first-child');
        const itemName = numberCell ? numberCell.textContent.trim() : id;
        if (typeof window.scheduleRowDelete === 'function') {
          window.scheduleRowDelete({
            rowEl: row,
            actionsEl: actionsCell,
            refreshFn: refreshBillsList,
            performDelete: () => doDeleteBill(id, true),
            itemName: itemName,
            delayMs: 5000,
            onUndoRestore: (rowEl) => attachDropdownListeners(rowEl.querySelector('.actions-dropdown'))
          });
        } else {
          if (confirm(typeof t === 'function' ? t('bills.confirmDelete') : 'Delete this invoice?')) doDeleteBill(id, false);
        }
      }
    });
  });
}

// kept for backward compat (scheduleRowDelete callback)
function attachBillRowListeners(rowEl) {
  const dropdownEl = rowEl.querySelector('.actions-dropdown');
  if (dropdownEl) attachDropdownListeners(dropdownEl);
}

async function updateBillStatus(id, status) {
  try {
    const bill = bills.find((b) => b.id === id);
    if (!bill) return;
    await api.putBill(id, { status });
    bill.status = status;
    const filters = getFilterValues();
    let list = applyFilters(bills, filters);
    list = sortBillsList(list);
    renderBillsTable(list);
  } catch (e) {
    alert((typeof t === 'function' ? t('msg.saveFailed') : 'Failed') + ': ' + e.message);
  }
}

async function duplicateBill(id) {
  try {
    const bill = await api.getBill(id);
    let prefix = bill.prefix != null && String(bill.prefix).trim() !== '' ? String(bill.prefix).trim() : null;
    if (!prefix && bill.number) {
      const m = String(bill.number).match(/^(.+?)-(\d+)$/);
      if (m) prefix = m[1].trim();
    }
    if (!prefix) prefix = 'Nr';
    const today = new Date().toISOString().slice(0, 10);
    const newBill = {
      prefix,
      status: 'draft',
      date: today,
      supplyDate: null,
      paymentDueDate: bill.paymentDueDate || null,
      discountPercent: bill.discountPercent != null ? bill.discountPercent : 0,
      discountDescription: bill.discountDescription || '',
      companyId: bill.companyId,
      customerId: bill.customerId,
      items: (bill.items || []).map((i) => ({ ...i })),
      subtotal: bill.subtotal,
      totalVat: bill.totalVat,
      totalGross: bill.totalGross
    };
    const created = await api.postBill(newBill);
    window.location.hash = '#/bill/' + created.id;
  } catch (e) {
    alert((typeof t === 'function' ? t('msg.duplicateFailed') : 'Failed to duplicate') + ': ' + e.message);
  }
}

async function downloadBillPdf(id) {
  try {
    const [bill, companies, customers, settings] = await Promise.all([api.getBill(id), api.getCompanies(), api.getCustomers(), api.getSettings()]);
    if (window.generateBillPdf) window.generateBillPdf(bill, companies, customers, { billsLocale: (settings && settings.billsLocale) || 'en' });
    else alert(typeof t === 'function' ? t('msg.pdfNotAvailable') : 'PDF export is not available.');
  } catch (e) {
    alert((typeof t === 'function' ? t('msg.saveFailed') : 'Failed') + ': ' + e.message);
  }
}

async function saveInvoiceToDrive(id) {
  let dismissLoading;
  try {
    const driveStatus = await api.getDriveStatus();
    if (!driveStatus || !driveStatus.connected) {
      const msg = typeof t === 'function' ? t('msg.driveNotConnected') : 'Google Drive is not connected. Connect it in Settings.';
      if (typeof window.showToast === 'function') window.showToast({ message: msg, type: 'error', duration: 6000 });
      else alert(msg);
      return;
    }
    if (typeof window.showToast === 'function') {
      dismissLoading = window.showToast({
        message: typeof t === 'function' ? t('msg.savingToDrive') : 'Saving to Google Drive…',
        type: 'info',
        duration: 60000,
        spinner: true
      });
    }
    const [billFresh, companies, customers, settings] = await Promise.all([
      api.getBill(id),
      api.getCompanies(),
      api.getCustomers(),
      api.getSettings()
    ]);
    const pdfPayload = await invoicePdfReadyPromise(billFresh, companies, customers, settings, 'base64');
    await api.uploadToDrive({ pdfBase64: pdfPayload.base64, filename: pdfPayload.filename });
    if (typeof dismissLoading === 'function') dismissLoading();
    if (typeof window.showToast === 'function') {
      window.showToast({ message: typeof t === 'function' ? t('msg.savedToDrive') : 'Saved to Google Drive.', type: 'success' });
    }
  } catch (e) {
    if (typeof dismissLoading === 'function') dismissLoading();
    if (typeof window.showToast === 'function') {
      window.showToast({ message: (typeof t === 'function' ? t('msg.saveFailed') : 'Failed') + ': ' + (e.message || e), type: 'error', duration: 6000 });
    } else {
      alert((typeof t === 'function' ? t('msg.saveFailed') : 'Failed') + ': ' + (e.message || e));
    }
  }
}

async function doDeleteBill(id, skipRefresh) {
  try {
    await api.deleteBill(id);
    bills = bills.filter((b) => b.id !== id);
    if (!skipRefresh) await refreshBillsList();
  } catch (e) {
    alert((typeof t === 'function' ? t('msg.deleteFailed') : 'Failed to delete') + ': ' + e.message);
    if (skipRefresh && window.refreshBillsList) window.refreshBillsList();
  }
}

function openFilterDatePicker(inputId) {
  var el = document.getElementById(inputId);
  if (!el) return;
  try {
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      el.focus();
    }
  } catch (err) {
    el.focus();
  }
}

function getPresetDateRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  const pad = function (n) { return String(n).padStart(2, '0'); };
  const isoDate = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  if (preset === 'this-month') {
    return { from: y + '-' + pad(m + 1) + '-01', to: isoDate(new Date(y, m + 1, 0)) };
  }
  if (preset === 'last-month') {
    const lastMonthStart = new Date(y, m - 1, 1);
    const lastMonthEnd = new Date(y, m, 0);
    return { from: isoDate(lastMonthStart), to: isoDate(lastMonthEnd) };
  }
  if (preset === 'last-3-months') {
    const from = new Date(y, m - 2, 1);
    return { from: isoDate(from), to: isoDate(new Date(y, m + 1, 0)) };
  }
  if (preset === 'this-year') {
    return { from: y + '-01-01', to: y + '-12-31' };
  }
  if (preset === 'all-time') {
    return { from: '', to: '' };
  }
  return null;
}

function initBillsList() {
  // ── Filter panel toggle (mobile) ──
  var filterToggleBtn = document.getElementById('filter-toggle-btn');
  var filtersPanel = document.getElementById('filters-panel');
  if (filterToggleBtn && filtersPanel) {
    filterToggleBtn.addEventListener('click', function () {
      var isOpen = filtersPanel.classList.toggle('filters-open');
      filterToggleBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Update has-value class on filter-control-wrap elements
  function updateFilterClearBtns() {
    var pairs = [
      { inputId: 'filter-search',    clearId: 'filter-clear-search' },
      { inputId: 'filter-date-from', clearId: 'filter-clear-date-from' },
      { inputId: 'filter-date-to',   clearId: 'filter-clear-date-to' },
      { inputId: 'filter-customer',  clearId: 'filter-clear-customer' },
      { inputId: 'filter-status',    clearId: 'filter-clear-status' }
    ];
    pairs.forEach(function (p) {
      var input = document.getElementById(p.inputId);
      var btn = document.getElementById(p.clearId);
      if (!input || !btn) return;
      var wrap = btn.closest('.filter-control-wrap');
      if (!wrap) return;
      var hasVal = input.value !== '' && input.value !== null;
      wrap.classList.toggle('has-value', hasVal);
    });
  }

  // Wire each × button to clear its input and refresh
  function wireFilterClearBtn(clearId, inputId, isPresetRelated) {
    var btn = document.getElementById(clearId);
    var input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', function () {
      input.value = '';
      if (isPresetRelated) {
        document.querySelectorAll('.filter-preset-btn').forEach(function (b) { b.classList.remove('active'); });
      }
      updateFilterClearBtns();
      refreshBillsList();
    });
  }
  wireFilterClearBtn('filter-clear-search',    'filter-search',    false);
  wireFilterClearBtn('filter-clear-date-from', 'filter-date-from', true);
  wireFilterClearBtn('filter-clear-date-to',   'filter-date-to',   true);
  wireFilterClearBtn('filter-clear-customer',  'filter-customer',  false);
  wireFilterClearBtn('filter-clear-status',    'filter-status',    false);

  var calFrom = document.getElementById('filter-calendar-from');
  var calTo = document.getElementById('filter-calendar-to');
  if (calFrom) {
    calFrom.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openFilterDatePicker('filter-date-from');
    });
  }
  if (calTo) {
    calTo.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openFilterDatePicker('filter-date-to');
    });
  }

  // Clear all filters button
  var clearFiltersBtn = document.getElementById('btn-clear-filters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function () {
      var searchEl2 = document.getElementById('filter-search');
      var fromEl2 = document.getElementById('filter-date-from');
      var toEl2 = document.getElementById('filter-date-to');
      var custEl2 = document.getElementById('filter-customer');
      var statEl2 = document.getElementById('filter-status');
      if (searchEl2) searchEl2.value = '';
      if (fromEl2) fromEl2.value = '';
      if (toEl2) toEl2.value = '';
      if (custEl2) custEl2.value = '';
      if (statEl2) statEl2.value = '';
      document.querySelectorAll('.filter-preset-btn').forEach(function (b) { b.classList.remove('active'); });
      updateFilterClearBtns();
      refreshBillsList();
    });
  }

  // Filter preset chips
  document.querySelectorAll('.filter-preset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const preset = btn.getAttribute('data-preset');
      const range = getPresetDateRange(preset);
      if (!range) return;
      const fromEl = document.getElementById('filter-date-from');
      const toEl = document.getElementById('filter-date-to');
      if (fromEl) fromEl.value = range.from;
      if (toEl) toEl.value = range.to;
      document.querySelectorAll('.filter-preset-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      updateFilterClearBtns();
      refreshBillsList();
    });
  });

  // Date filter: auto-apply on change; if "from" is set and "to" is empty, default "to" to today
  var fromEl = document.getElementById('filter-date-from');
  var toEl = document.getElementById('filter-date-to');
  if (fromEl) {
    fromEl.addEventListener('change', function () {
      document.querySelectorAll('.filter-preset-btn').forEach(function (b) { b.classList.remove('active'); });
      if (fromEl.value && toEl && !toEl.value) {
        toEl.value = new Date().toISOString().slice(0, 10);
      }
      updateFilterClearBtns();
      refreshBillsList();
    });
  }
  if (toEl) {
    toEl.addEventListener('change', function () {
      document.querySelectorAll('.filter-preset-btn').forEach(function (b) { b.classList.remove('active'); });
      updateFilterClearBtns();
      refreshBillsList();
    });
  }

  // Live search on Enter key or input change with short debounce
  const searchEl = document.getElementById('filter-search');
  if (searchEl) {
    let debounceTimer;
    searchEl.addEventListener('input', () => {
      updateFilterClearBtns();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refreshBillsList, 250);
    });
    searchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { clearTimeout(debounceTimer); refreshBillsList(); }
    });
  }

  // Status and customer filters apply immediately on change
  const statusEl = document.getElementById('filter-status');
  if (statusEl) statusEl.addEventListener('change', function () { updateFilterClearBtns(); refreshBillsList(); });

  const customerEl = document.getElementById('filter-customer');
  if (customerEl) customerEl.addEventListener('change', function () { updateFilterClearBtns(); refreshBillsList(); });

  // Initialise clear button visibility
  updateFilterClearBtns();

  document.querySelectorAll('.table .sortable').forEach((th) => {
    th.addEventListener('click', () => setSort(th.getAttribute('data-sort')));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.actions-dropdown')) closeAllActionsDropdowns();
  });
}

window.refreshBillsList = refreshBillsList;

document.addEventListener('DOMContentLoaded', initBillsList);
