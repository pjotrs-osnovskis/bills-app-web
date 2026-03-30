let currentBill = null;
let editorCompanies = [];
let editorCustomers = [];
let editorServices = [];
let editorSettings = {};
let numberLocked = true;

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function sanitizePrefix(val) {
  if (val == null || typeof val !== 'string') return '';
  return String(val).replace(/[^A-Za-z0-9]/g, '');
}

function getPrefix(company, customer) {
  if (customer && customer.billPrefix && String(customer.billPrefix).trim() !== '') return sanitizePrefix(customer.billPrefix) || 'Nr';
  if (company && company.billPrefix && String(company.billPrefix).trim() !== '') return sanitizePrefix(company.billPrefix) || 'Nr';
  if (company && company.name) return sanitizePrefix(String(company.name).trim().toUpperCase().replace(/\s+/g, '-')) || 'Nr';
  const def = (editorSettings && (editorSettings.billNumberPrefix || editorSettings.defaultBillPrefix)) ? String(editorSettings.billNumberPrefix || editorSettings.defaultBillPrefix).trim() : '';
  return (def !== '' ? sanitizePrefix(def) : '') || 'Nr';
}

function addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getPaymentDays(bill) {
  if (!bill || !bill.date || !bill.paymentDueDate) return 30;
  const a = new Date(bill.date);
  const b = new Date(bill.paymentDueDate);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 30;
  const days = Math.round((b - a) / (24 * 60 * 60 * 1000));
  return [15, 30, 45, 60, 90].includes(days) ? days : 30;
}

function getItemsSubtotal(bill) {
  return (bill.items || []).reduce((s, i) => s + (i.amount != null ? i.amount : 0), 0);
}

function getItemsRawSubtotal(bill) {
  return (bill.items || []).reduce(function (s, i) {
    const qty = parseFloat(i.quantity) || 0;
    const price = parseFloat(i.pricePerUnit) || 0;
    return s + qty * price;
  }, 0);
}

function getTotalItemDiscounts(bill) {
  const raw = getItemsRawSubtotal(bill);
  const afterItem = getItemsSubtotal(bill);
  return Math.round((raw - afterItem) * 100) / 100;
}

function getDiscountTotalsRows(bill) {
  const itemsSubtotal = getItemsSubtotal(bill);
  const itemsRawSubtotal = Math.round(getItemsRawSubtotal(bill) * 100) / 100;
  const totalItemDiscounts = getTotalItemDiscounts(bill);
  const billPct = parseFloat(bill.discountPercent) || 0;
  const billDiscountAmount = itemsSubtotal > 0 && billPct > 0 ? Math.round(itemsSubtotal * (billPct / 100) * 100) / 100 : 0;
  const hasItemDiscounts = totalItemDiscounts > 0;
  const hasBillDiscount = billDiscountAmount > 0;
  if (!hasItemDiscounts && !hasBillDiscount) return '';
  let html = '';
  const subBefore = typeof t === 'function' ? t('editor.subtotalBeforeDiscount') : 'Summa bez PVN (pirms atlaides)';
  const itemDisc = typeof t === 'function' ? t('editor.itemDiscounts') : 'Atlaides pa pozīcijām';
  const discLabel = typeof t === 'function' ? t('editor.discount') : 'Atlaide';
  if (hasItemDiscounts || hasBillDiscount) {
    const beforeDiscounts = hasItemDiscounts ? itemsRawSubtotal : itemsSubtotal;
    html += '<div class="total-row total-row-before-discount"><span>' + subBefore + '</span><span>' + Number(beforeDiscounts).toFixed(2) + '</span></div>';
  }
  if (hasItemDiscounts) {
    html += '<div class="total-row total-row-discount"><span>' + itemDisc + '</span><span class="discount-amount">-' + Number(totalItemDiscounts).toFixed(2) + '</span></div>';
  }
  if (hasBillDiscount) {
    const desc = (bill.discountDescription || '').trim() ? escapeHtml(bill.discountDescription) : discLabel;
    html += '<div class="total-row total-row-discount"><span>' + discLabel + ' (' + Number(billPct).toFixed(0) + '%)' + (desc !== discLabel ? ' – ' + desc : '') + '</span><span class="discount-amount">-' + Number(billDiscountAmount).toFixed(2) + '</span></div>';
  }
  return html;
}

function calcVatByRate(items, subtotal, itemsSubtotal) {
  const billDiscountFactor = itemsSubtotal > 0 ? subtotal / itemsSubtotal : 1;
  const vatByRate = {};
  (items || []).forEach(function (item) {
    const vatPct = item.vatPercent != null ? parseFloat(item.vatPercent) : 21;
    if (!vatPct || vatPct <= 0) return;
    const effectiveAmount = Math.round((item.amount || 0) * billDiscountFactor * 100) / 100;
    const vatAmt = Math.round(effectiveAmount * (vatPct / 100) * 100) / 100;
    vatByRate[vatPct] = Math.round(((vatByRate[vatPct] || 0) + vatAmt) * 100) / 100;
  });
  return vatByRate;
}

function updateTotalsDisplay() {
  if (!currentBill) return;
  const itemsSubtotal = getItemsSubtotal(currentBill);
  const discountPercent = Math.min(100, Math.max(0, parseFloat(currentBill.discountPercent) || 0));
  const discountAmount = itemsSubtotal > 0 ? Math.round(itemsSubtotal * (discountPercent / 100) * 100) / 100 : 0;
  const discountedSubtotal = Math.round((itemsSubtotal - discountAmount) * 100) / 100;
  const vatByRate = calcVatByRate(currentBill.items, discountedSubtotal, itemsSubtotal);
  const totalVat = Math.round(Object.values(vatByRate).reduce((s, v) => s + v, 0) * 100) / 100;
  const totalGross = Math.round((discountedSubtotal + totalVat) * 100) / 100;
  currentBill.discountAmount = discountAmount;
  currentBill.subtotal = discountedSubtotal;
  currentBill.vatByRate = vatByRate;
  currentBill.totalVat = totalVat;
  currentBill.totalGross = totalGross;
  const subEl = document.getElementById('bill-subtotal');
  const grossEl = document.getElementById('bill-totalGross');
  if (subEl) subEl.textContent = currentBill.subtotal.toFixed(2);
  if (grossEl) grossEl.textContent = currentBill.totalGross.toFixed(2);
  const vatWrap = document.getElementById('bill-vat-rows');
  if (vatWrap) {
    const t = typeof window.i18n === 'function' ? window.i18n : null;
    const locale = (typeof editorSettings !== 'undefined' && editorSettings.billsLocale) ? editorSettings.billsLocale : 'en';
    const L = typeof getBillsLabels === 'function' ? getBillsLabels(locale) : null;
    const rates = Object.keys(vatByRate).map(Number).sort((a, b) => b - a);
    vatWrap.innerHTML = rates.map(function (rate) {
      const label = L && typeof L.vatLine === 'function' ? L.vatLine(rate) : ('VAT (' + rate + '%)');
      return '<div class="total-row"><span>' + label + '</span><span>' + Number(vatByRate[rate]).toFixed(2) + '</span></div>';
    }).join('');
    if (rates.length === 0) {
      const fallback = t ? t('editor.vat21') : 'VAT';
      vatWrap.innerHTML = '<div class="total-row"><span>' + fallback + '</span><span>0.00</span></div>';
    }
  }
}

function recalcBill() {
  if (!currentBill) return;
  let itemsSubtotal = 0;
  const items = (currentBill.items || []).map((item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.pricePerUnit) || 0;
    const discountPct = Math.min(100, Math.max(0, parseFloat(item.discountPercent) || 0));
    const rawAmount = qty * price;
    const amount = Math.round(rawAmount * (1 - discountPct / 100) * 100) / 100;
    itemsSubtotal += amount;
    return { ...item, quantity: qty, pricePerUnit: price, discountPercent: discountPct, amount };
  });
  itemsSubtotal = Math.round(itemsSubtotal * 100) / 100;
  const discountPercent = Math.min(100, Math.max(0, parseFloat(currentBill.discountPercent) || 0));
  currentBill.discountPercent = discountPercent;
  const discountAmount = itemsSubtotal > 0 ? Math.round(itemsSubtotal * (discountPercent / 100) * 100) / 100 : 0;
  currentBill.discountAmount = discountAmount;
  const discountedSubtotal = Math.round((itemsSubtotal - discountAmount) * 100) / 100;
  const vatByRate = calcVatByRate(items, discountedSubtotal, itemsSubtotal);
  const totalVat = Math.round(Object.values(vatByRate).reduce((s, v) => s + v, 0) * 100) / 100;
  const totalGross = Math.round((discountedSubtotal + totalVat) * 100) / 100;
  currentBill.items = items;
  currentBill.subtotal = discountedSubtotal;
  currentBill.vatByRate = vatByRate;
  currentBill.totalVat = totalVat;
  currentBill.totalGross = totalGross;
  renderBillEditor();
}

async function openBillEditor(billId) {
  window.editorDirty = false;
  window.editorIsNew = !billId;
  const editorRoot = document.getElementById('bill-editor-root');
  if (editorRoot) editorRoot.innerHTML = '<div class="editor-loading"><div class="app-loading-spinner"></div></div>';
  editorCompanies = await api.getCompanies();
  editorCustomers = await api.getCustomers();
  editorServices = await api.getServices();
  editorSettings = await api.getSettings();
  if (billId) {
    try {
      currentBill = await api.getBill(billId);
    } catch (e) {
      alert((typeof t === 'function' ? t('msg.loadBillFailed') : 'Neizdevās ielādēt rēķinu') + ': ' + e.message);
      currentBill = null;
    }
  } else {
    const defaultCompany = editorCompanies.find((c) => c.isDefault) || null;
    const prefix = getPrefix(defaultCompany, null);
    const bills = await api.getBills();
    let nextDocNum = 1;
    bills.forEach((b) => {
      const n = parseInt(b.documentNumber, 10);
      if (!isNaN(n) && n >= nextDocNum) nextDocNum = n + 1;
    });
    const numStr = String(nextDocNum).padStart(4, '0');
    currentBill = {
      id: null,
      prefix,
      documentNumber: nextDocNum,
      number: prefix + '-' + numStr,
      date: new Date().toISOString().slice(0, 10),
      supplyDate: null,
      paymentDueDate: null,
      companyId: defaultCompany ? defaultCompany.id : null,
      customerId: null,
      discountPercent: 0,
      discountDescription: '',
      items: [],
      subtotal: 0,
      totalVat: 0,
      totalGross: 0
    };
    numberLocked = true;
  }
  if (currentBill && currentBill.id) numberLocked = true;
  document.getElementById('editor-title').textContent = currentBill.id ? (typeof t === 'function' ? t('editor.titleEdit') + ' ' + currentBill.number : 'Edit bill ' + currentBill.number) : (typeof t === 'function' ? t('editor.titleNew') : 'New bill');
  renderBillEditor();
}

function renderBillEditor() {
  const root = document.getElementById('bill-editor-root');
  if (!currentBill) {
    root.innerHTML = '<p>' + (typeof t === 'function' ? t('editor.notLoaded') : 'Rēķins nav ielādēts.') + '</p>';
    return;
  }
  const company = editorCompanies.find((c) => c.id === currentBill.companyId);
  const customer = editorCustomers.find((c) => c.id === currentBill.customerId);
  if (!currentBill.id && numberLocked) {
    const p = getPrefix(company, customer);
    currentBill.prefix = p;
    currentBill.number = currentBill.documentNumber != null ? p + '-' + String(currentBill.documentNumber).padStart(4, '0') : p + '-????';
  }
  const unitOptions = window.SERVICE_UNIT_OPTIONS || [{ value: 'pc', label: 'Gab.' }, { value: 'hour', label: 'St.' }, { value: 'service', label: 'Pak.' }];
  let companyLogoHtml = '';
  if (company && company.logoType === 'image' && company.logo) {
    companyLogoHtml = `<div class="bill-logo"><img src="${escapeHtml(company.logo)}" alt="" style="max-height:48px;max-width:160px"></div>`;
  } else if (company && company.logoType === 'text' && company.logoText) {
    companyLogoHtml = `<div class="bill-logo bill-logo-text">${escapeHtml(company.logoText)}</div>`;
  }
  root.innerHTML = `
    <div class="bill-editor-scroll">
    <div class="bill-header">
      <div class="bill-block" id="bill-block-company" data-type="company">
        <h4>${typeof t === 'function' ? t('editor.supplier') : 'Piegādātājs / Mans uzņēmums'}</h4>
        ${companyLogoHtml}
        <div>${company ? escapeHtml(company.name) + '<br>' + escapeHtml(company.legalAddress) + (company.registrationNumber ? '<br>' + (typeof t === 'function' ? t('editor.reg') : 'Reģ.') + ' ' + escapeHtml(company.registrationNumber) : '') + (company.vatNumber ? '<br>' + (typeof t === 'function' ? t('editor.pvn') : 'PVN') + ' ' + escapeHtml(company.vatNumber) : '') : (typeof t === 'function' ? t('editor.clickCompany') : 'Noklikšķiniet, lai izvēlētos vai pievienotu uzņēmumu')}</div>
      </div>
      <div class="bill-block" id="bill-block-customer" data-type="customer">
        <h4>${typeof t === 'function' ? t('editor.buyer') : 'Pircējs / Klients'}</h4>
        <div>${customer ? escapeHtml(customer.name) + '<br>' + escapeHtml(customer.address || '') + (customer.registrationNumber ? '<br>' + (typeof t === 'function' ? t('editor.reg') : 'Reģ.') + ' ' + escapeHtml(customer.registrationNumber) : '') + (customer.vatNumber ? '<br>' + (typeof t === 'function' ? t('editor.pvn') : 'PVN') + ' ' + escapeHtml(customer.vatNumber) : '') : (typeof t === 'function' ? t('editor.clickCustomer') : 'Noklikšķiniet, lai izvēlētos vai pievienotu klientu')}</div>
      </div>
    </div>
    <div class="bill-meta">
      <div class="meta-item meta-item-number">
        <label>${typeof t === 'function' ? t('editor.number') : 'Numurs'}</label>
        ${numberLocked
          ? `<span class="bill-number-locked" id="bill-number-display">${escapeHtml(currentBill.number)}</span><button type="button" class="btn btn-icon btn-secondary bill-number-edit" id="bill-number-edit" title="${typeof t === 'function' ? t('editor.editNumber') : 'Rediģēt numuru'}" aria-label="${typeof t === 'function' ? t('editor.editNumber') : 'Rediģēt numuru'}"><span class="material-icons" aria-hidden="true">edit</span></button>`
          : `<input type="text" id="bill-number" class="input" value="${escapeHtml(currentBill.number)}"><button type="button" class="btn btn-icon btn-primary bill-number-save" id="bill-number-save" title="${typeof t === 'function' ? t('common.save') : 'Saglabāt'}" aria-label="${typeof t === 'function' ? t('common.save') : 'Saglabāt'}"><span class="material-icons" aria-hidden="true">check</span></button>`}
      </div>
      <div class="meta-item">
        <label>${typeof t === 'function' ? t('editor.date') : 'Datums'}</label>
        <input type="date" id="bill-date" class="input" value="${escapeHtml(currentBill.date)}">
      </div>
      <div class="meta-item">
        <label>${typeof t === 'function' ? t('editor.paymentDue') : 'Apmaksas termiņš'}</label>
        <select id="bill-payment-days" class="input">
          <option value="15" ${getPaymentDays(currentBill) === 15 ? 'selected' : ''}>${typeof t === 'function' ? t('editor.days15') : '15 dienas'}</option>
          <option value="30" ${getPaymentDays(currentBill) === 30 ? 'selected' : ''}>${typeof t === 'function' ? t('editor.days30') : '30 dienas'}</option>
          <option value="45" ${getPaymentDays(currentBill) === 45 ? 'selected' : ''}>${typeof t === 'function' ? t('editor.days45') : '45 dienas'}</option>
          <option value="60" ${getPaymentDays(currentBill) === 60 ? 'selected' : ''}>${typeof t === 'function' ? t('editor.days60') : '60 dienas'}</option>
          <option value="90" ${getPaymentDays(currentBill) === 90 ? 'selected' : ''}>${typeof t === 'function' ? t('editor.days90') : '90 dienas'}</option>
        </select>
      </div>
    </div>
    <div class="table-wrap">
      <table class="table bill-table">
        <thead>
          <tr>
            <th class="col-name">${typeof t === 'function' ? t('editor.colName') : 'Nosaukums'}</th>
            <th class="col-qty">${typeof t === 'function' ? t('editor.colQty') : 'Daudzums'}</th>
            <th class="col-price">${typeof t === 'function' ? t('editor.colPrice') : 'Cena'}</th>
            <th class="col-amount">${typeof t === 'function' ? t('editor.colAmount') : 'Summa'}</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="bill-items-tbody"></tbody>
      </table>
    </div>
    <div class="add-line-wrap">
      <button type="button" class="btn btn-primary" id="btn-add-line">${typeof t === 'function' ? t('editor.addLine') : 'Pievienot rindu'}</button>
      ${(currentBill.discountPercent || 0) > 0
        ? '<button type="button" class="btn btn-secondary" id="btn-edit-discount">' + (typeof t === 'function' ? t('editor.editDiscount') : 'Rediģēt atlaidi') + '</button><button type="button" class="btn btn-secondary" id="btn-remove-discount">' + (typeof t === 'function' ? t('editor.removeDiscount') : 'Noņemt atlaidi') + '</button>'
        : '<button type="button" class="btn btn-secondary" id="btn-add-discount">' + (typeof t === 'function' ? t('editor.addDiscount') : 'Pievienot atlaidi') + '</button>'}
    </div>
    </div>
    <div class="bill-totals">
      ${getDiscountTotalsRows(currentBill)}
      <div class="total-row"><span>${typeof t === 'function' ? t('editor.subtotalNoVat') : 'Summa bez PVN'}</span><span id="bill-subtotal">${(currentBill.subtotal || 0).toFixed(2)}</span></div>
      <div id="bill-vat-rows">${(function () {
        const locale = (typeof editorSettings !== 'undefined' && editorSettings.billsLocale) ? editorSettings.billsLocale : 'en';
        const L = typeof getBillsLabels === 'function' ? getBillsLabels(locale) : null;
        const vatByRate = currentBill.vatByRate && typeof currentBill.vatByRate === 'object' ? currentBill.vatByRate : null;
        if (vatByRate && Object.keys(vatByRate).length > 0) {
          const rates = Object.keys(vatByRate).map(Number).sort((a, b) => b - a);
          return rates.map(function (rate) {
            const label = L && typeof L.vatLine === 'function' ? L.vatLine(rate) : ('VAT (' + rate + '%)');
            return '<div class="total-row"><span>' + label + '</span><span>' + Number(vatByRate[rate]).toFixed(2) + '</span></div>';
          }).join('');
        }
        const fallback = typeof t === 'function' ? t('editor.vat21') : 'PVN (21%)';
        return '<div class="total-row"><span>' + fallback + '</span><span>' + (currentBill.totalVat || 0).toFixed(2) + '</span></div>';
      })()}</div>
      <div class="total-row gross"><span>${typeof t === 'function' ? t('editor.totalWithVat') : 'Kopā ar PVN'}</span><span id="bill-totalGross">${(currentBill.totalGross || 0).toFixed(2)}</span></div>
    </div>
  `;
  const tbody = document.getElementById('bill-items-tbody');
  const items = currentBill.items || [];
  const itemsEmptyMsg = typeof t === 'function' ? t('editor.itemsEmpty') : 'No items yet. Add a line to get started.';
  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="list-empty">' + escapeHtml(itemsEmptyMsg) + '</td></tr>';
  } else {
  const unitLabel = (u) => {
    const key = 'unit.' + (u || 'pc');
    const translated = typeof window.t === 'function' ? window.t(key) : key;
    return translated !== key ? translated : (unitOptions.find((o) => o.value === (u || 'pc')) || {}).label || (u || '');
  };
  items.forEach((item, idx) => {
    if (!item.id) item.id = 'i_' + idx;
    const tr = document.createElement('tr');
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.pricePerUnit) || 0;
    const discountPct = Math.min(100, Math.max(0, parseFloat(item.discountPercent) || 0));
    const rawAmount = qty * price;
    const discountAmount = discountPct > 0 && rawAmount > 0 ? Math.round(rawAmount * (discountPct / 100) * 100) / 100 : 0;
    const qtyUnitText = item.quantity + ' ' + unitLabel(item.unit);
    tr.innerHTML = `
      <td class="col-name"><span class="item-name-text">${escapeHtml(item.name || '')}</span></td>
      <td class="col-qty"><span class="item-qty-unit-text">${escapeHtml(qtyUnitText)}</span></td>
      <td class="col-price"><span class="item-price-text">${Number(item.pricePerUnit || 0).toFixed(2)}</span></td>
      <td class="col-amount"><span>${(item.amount != null ? item.amount : 0).toFixed(2)}</span></td>
      <td class="actions">
        <div class="actions-dropdown">
          <button type="button" class="btn btn-icon btn-ghost btn-actions-trigger" data-idx="${idx}" data-item-id="${escapeHtml(item.id || '')}" aria-haspopup="true" aria-expanded="false" title="${typeof t === 'function' ? t('editor.edit') : 'Rediģēt'}" aria-label="${typeof t === 'function' ? t('editor.edit') : 'Rediģēt'}"><span class="material-symbols-outlined" aria-hidden="true">more_vert</span></button>
          <div class="actions-dropdown-menu hidden" role="menu">
            <button type="button" role="menuitem" class="actions-dropdown-item" data-action="edit" data-idx="${idx}"><span class="material-symbols-outlined" aria-hidden="true">edit</span><span>${typeof t === 'function' ? t('common.edit') : 'Rediģēt'}</span></button>
            <button type="button" role="menuitem" class="actions-dropdown-item actions-dropdown-item-danger" data-action="delete" data-idx="${idx}" data-item-id="${escapeHtml(item.id || '')}"><span class="material-symbols-outlined" aria-hidden="true">delete</span><span>${typeof t === 'function' ? t('common.delete') : 'Dzēst'}</span></button>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
    if (discountPct > 0 && discountAmount > 0) {
      const discountTr = document.createElement('tr');
      discountTr.className = 'item-discount-row';
      discountTr.innerHTML = `
        <td class="col-name item-discount-label">${typeof t === 'function' ? t('editor.discount') : 'Atlaide'}</td>
        <td class="col-qty item-discount-pct">${Number(discountPct).toFixed(0)}%</td>
        <td class="col-price"></td>
        <td class="col-amount item-discount-amount">-${Number(discountAmount).toFixed(2)}</td>
        <td class="actions"></td>
      `;
      tbody.appendChild(discountTr);
    }
  });
  }
  document.getElementById('bill-block-company').addEventListener('click', () => openCompanyCustomerModal('company'));
  document.getElementById('bill-block-customer').addEventListener('click', () => openCompanyCustomerModal('customer'));
  const billNumberInput = document.getElementById('bill-number');
  if (billNumberInput) billNumberInput.addEventListener('change', (e) => { currentBill.number = e.target.value; });
  const billNumberEditBtn = document.getElementById('bill-number-edit');
  if (billNumberEditBtn) billNumberEditBtn.addEventListener('click', () => { numberLocked = false; renderBillEditor(); });
  const billNumberSaveBtn = document.getElementById('bill-number-save');
  if (billNumberSaveBtn) billNumberSaveBtn.addEventListener('click', () => {
    const el = document.getElementById('bill-number');
    if (!el) return;
    const val = el.value.trim();
    if (val === '') {
      alert(typeof t === 'function' ? t('msg.billNumberRequired') : 'Numurs ir obligāts.');
      el.focus();
      return;
    }
    currentBill.number = val;
    numberLocked = true;
    renderBillEditor();
  });
  document.getElementById('bill-date').addEventListener('change', (e) => {
    currentBill.date = e.target.value;
    const days = parseInt(document.getElementById('bill-payment-days').value, 10) || 30;
    currentBill.paymentDueDate = addDays(currentBill.date, days);
  });
  const paymentDaysEl = document.getElementById('bill-payment-days');
  if (paymentDaysEl) {
    paymentDaysEl.addEventListener('change', () => {
      const days = parseInt(paymentDaysEl.value, 10) || 30;
      currentBill.paymentDueDate = addDays(currentBill.date, days);
    });
  }
  tbody.querySelectorAll('.actions-dropdown').forEach((dropdownEl) => {
    const trigger = dropdownEl.querySelector('.btn-actions-trigger');
    const menu = dropdownEl.querySelector('.actions-dropdown-menu');
    if (!trigger || !menu) return;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !menu.classList.contains('hidden');
      document.querySelectorAll('.actions-dropdown-menu').forEach((m) => {
        m.classList.add('hidden');
        m.style.position = '';
        m.style.top = '';
        m.style.left = '';
      });
      document.querySelectorAll('.btn-actions-trigger').forEach((b) => b.setAttribute('aria-expanded', 'false'));
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
        const action = item.getAttribute('data-action');
        const idx = parseInt(item.getAttribute('data-idx'), 10);
        const itemId = item.getAttribute('data-item-id') || null;
        if (action === 'edit') openEditLineModal(idx);
        if (action === 'delete') {
          const row = trigger.closest('tr');
          const actionsCell = row && row.querySelector('td.actions');
          const nameCell = row && row.querySelector('td.col-name .item-name-text');
          const itemName = nameCell ? nameCell.textContent.trim() : ('Line ' + (idx + 1));
          if (typeof window.scheduleRowDelete === 'function') {
            window.scheduleRowDelete({
              rowEl: row,
              actionsEl: actionsCell,
              refreshFn: () => renderBillEditor(),
              performDelete: () => {
                const i = itemId
                  ? (currentBill.items || []).findIndex((it) => it.id === itemId)
                  : idx;
                if (i >= 0) {
                  currentBill.items.splice(i, 1);
                  recalcBill();
                }
              },
              itemName: itemName,
              delayMs: 5000,
              onUndoRestore: attachBillLineRowListeners
            });
          } else {
            const i = itemId ? (currentBill.items || []).findIndex((it) => it.id === itemId) : idx;
            if (i >= 0) { currentBill.items.splice(i, 1); recalcBill(); }
          }
        }
        menu.classList.add('hidden');
        trigger.setAttribute('aria-expanded', 'false');
      });
    });
  });
  document.getElementById('btn-add-line').addEventListener('click', openAddLineModal);
  const addDiscountBtn = document.getElementById('btn-add-discount');
  if (addDiscountBtn) addDiscountBtn.addEventListener('click', openDiscountModal);
  const editDiscountBtn = document.getElementById('btn-edit-discount');
  if (editDiscountBtn) editDiscountBtn.addEventListener('click', openDiscountModal);
  const removeDiscountBtn = document.getElementById('btn-remove-discount');
  if (removeDiscountBtn) removeDiscountBtn.addEventListener('click', () => { currentBill.discountPercent = 0; currentBill.discountDescription = ''; recalcBill(); });
}

function openDiscountModal() {
  const itemsSubtotal = getItemsSubtotal(currentBill);
  const pctRaw = Math.min(100, Math.max(0, parseFloat(currentBill.discountPercent) || 0));
  const pct = Math.round(pctRaw / 5) * 5;
  const amount = itemsSubtotal > 0 ? Math.round(itemsSubtotal * (pct / 100) * 100) / 100 : 0;
  const desc = (currentBill.discountDescription || '').trim();
  const discountTitle = typeof t === 'function' ? t('editor.discount') : 'Atlaide';
  const discountDescLabel = typeof t === 'function' ? t('editor.discountDescription') : 'Apraksts';
  const discountDescPh = typeof t === 'function' ? t('editor.discountDescriptionPlaceholder') : 'piem., klienta atlaide';
  const discountPctLabel = typeof t === 'function' ? t('editor.discountPct') : 'Atlaide %';
  const discountEurLabel = typeof t === 'function' ? t('editor.discountEur') : 'Atlaide (€)';
  const cancelLabel = typeof t === 'function' ? t('editor.cancel') : 'Atcelt';
  const saveLabel = typeof t === 'function' ? t('common.save') : 'Saglabāt';
  showModal(`
    <h3>${escapeHtml(discountTitle)}</h3>
    <div class="form-block">
      <div class="field">
        <label>${escapeHtml(discountDescLabel)}</label>
        <input type="text" id="discount-description" class="input" value="${escapeHtml(desc)}" placeholder="${escapeHtml(discountDescPh)}">
      </div>
      <div class="field">
        <label>${escapeHtml(discountPctLabel)}</label>
        <div class="qty-stepper">
          <button type="button" class="btn btn-icon btn-secondary qty-btn" id="discount-pct-minus" aria-label="−">−</button>
          <input type="number" id="discount-pct" class="input qty-input" value="${Number(pct).toFixed(0)}" min="0" max="100" step="5">
          <button type="button" class="btn btn-icon btn-secondary qty-btn" id="discount-pct-plus" aria-label="+">+</button>
        </div>
      </div>
      <div class="field">
        <label>${escapeHtml(discountEurLabel)}</label>
        <div class="qty-stepper">
          <button type="button" class="btn btn-icon btn-secondary qty-btn" id="discount-amount-minus" aria-label="−">−</button>
          <input type="number" id="discount-amount" class="input qty-input" value="${Number(amount).toFixed(2)}" min="0" step="0.5">
          <button type="button" class="btn btn-icon btn-secondary qty-btn" id="discount-amount-plus" aria-label="+">+</button>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="modal-cancel-discount">${escapeHtml(cancelLabel)}</button>
        <button type="button" class="btn btn-primary" id="modal-save-discount">${escapeHtml(saveLabel)}</button>
      </div>
    </div>
  `, { isNew: false });
  const pctInp = document.getElementById('discount-pct');
  const amountInp = document.getElementById('discount-amount');
  function syncFromPct() {
    const p = Math.min(100, Math.max(0, Math.round((parseFloat(pctInp.value) || 0) / 5) * 5));
    pctInp.value = Number(p).toFixed(0);
    if (itemsSubtotal > 0) amountInp.value = Number(Math.round(itemsSubtotal * (p / 100) * 100) / 100).toFixed(2);
  }
  function syncFromAmount() {
    const a = Math.max(0, parseFloat(amountInp.value) || 0);
    const amt = Math.min(a, itemsSubtotal);
    amountInp.value = Number(amt).toFixed(2);
    if (itemsSubtotal > 0) {
      const p = Math.min(100, Math.round((amt / itemsSubtotal) * 100 / 5) * 5);
      pctInp.value = Number(p).toFixed(0);
    }
  }
  document.getElementById('discount-pct-minus').addEventListener('click', () => { pctInp.value = Math.max(0, (parseFloat(pctInp.value) || 0) - 5); syncFromPct(); });
  document.getElementById('discount-pct-plus').addEventListener('click', () => { pctInp.value = Math.min(100, (parseFloat(pctInp.value) || 0) + 5); syncFromPct(); });
  document.getElementById('discount-amount-minus').addEventListener('click', () => { amountInp.value = Math.max(0, (parseFloat(amountInp.value) || 0) - 0.5).toFixed(2); syncFromAmount(); });
  document.getElementById('discount-amount-plus').addEventListener('click', () => { amountInp.value = Math.min(itemsSubtotal, (parseFloat(amountInp.value) || 0) + 0.5).toFixed(2); syncFromAmount(); });
  pctInp.addEventListener('change', syncFromPct);
  amountInp.addEventListener('change', syncFromAmount);
  document.getElementById('modal-cancel-discount').addEventListener('click', hideModal);
  document.getElementById('modal-save-discount').addEventListener('click', () => {
    const description = document.getElementById('discount-description').value.trim();
    const pctVal = Math.min(100, Math.max(0, Math.round((parseFloat(pctInp.value) || 0) / 5) * 5));
    currentBill.discountDescription = description;
    currentBill.discountPercent = pctVal;
    hideModal(true);
    recalcBill();
  });
}

function attachBillLineRowListeners(rowEl, actionsEl) {
  const dropdownEl = (actionsEl || rowEl).querySelector ? (actionsEl || rowEl).querySelector('.actions-dropdown') : null;
  if (!dropdownEl) return;
  const trigger = dropdownEl.querySelector('.btn-actions-trigger');
  const menu = dropdownEl.querySelector('.actions-dropdown-menu');
  if (!trigger || !menu) return;
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !menu.classList.contains('hidden');
    document.querySelectorAll('.actions-dropdown-menu').forEach((m) => {
      m.classList.add('hidden');
      m.style.position = '';
      m.style.top = '';
      m.style.left = '';
    });
    document.querySelectorAll('.btn-actions-trigger').forEach((b) => b.setAttribute('aria-expanded', 'false'));
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
      const action = item.getAttribute('data-action');
      const idx = parseInt(item.getAttribute('data-idx'), 10);
      const itemId = item.getAttribute('data-item-id') || null;
      if (action === 'edit') openEditLineModal(idx);
      if (action === 'delete') {
        const row = trigger.closest('tr');
        const actionsCell = row && row.querySelector('td.actions');
        const nameCell = row && row.querySelector('td.col-name .item-name-text');
        const itemName = nameCell ? nameCell.textContent.trim() : ('Line ' + (idx + 1));
        if (typeof window.scheduleRowDelete === 'function') {
          window.scheduleRowDelete({
            rowEl: row,
            actionsEl: actionsCell,
            refreshFn: () => renderBillEditor(),
            performDelete: () => {
              const i = itemId
                ? (currentBill.items || []).findIndex((it) => it.id === itemId)
                : idx;
              if (i >= 0) {
                currentBill.items.splice(i, 1);
                recalcBill();
              }
            },
            itemName: itemName,
            delayMs: 5000,
            onUndoRestore: attachBillLineRowListeners
          });
        } else {
          const i = itemId ? (currentBill.items || []).findIndex((it) => it.id === itemId) : idx;
          if (i >= 0) { currentBill.items.splice(i, 1); recalcBill(); }
        }
      }
      menu.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
    });
  });
}


const CUSTOM_SERVICE_ID = '__custom__';

function openAddLineModal() {
  const unitOptions = window.SERVICE_UNIT_OPTIONS || [{ value: 'pc', label: 'Gab.' }, { value: 'hour', label: 'St.' }, { value: 'service', label: 'Pak.' }];
  const unitLabel = (u) => {
    const key = 'unit.' + (u || 'pc');
    const translated = typeof window.t === 'function' ? window.t(key) : key;
    return translated !== key ? translated : (unitOptions.find((o) => o.value === (u || 'pc')) || {}).label || (u || '');
  };
  const serviceOpts = editorServices.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  const unitOptsHtml = unitOptions.map((o) => `<option value="${o.value}">${escapeHtml(unitLabel(o.value))}</option>`).join('');
  const t = typeof window.t === 'function' ? window.t : (k) => k;
  showModal(`
    <h3>${t('editor.addLineTitle')}</h3>
    <div class="form-block">
      <div class="field">
        <label>${t('editor.serviceOrProduct')}</label>
        <select id="addline-service" class="input input-full" required>
          <option value="">${t('editor.choose')}</option>
          <option value="${CUSTOM_SERVICE_ID}">${t('editor.customItem')}</option>
          ${serviceOpts}
        </select>
      </div>
      <div id="addline-custom-wrap" class="addline-custom-fields" style="display:none">
        <div class="field">
          <label>${t('editor.colName')}</label>
          <input type="text" id="addline-custom-name" class="input input-full" placeholder="${t('editor.customNamePlaceholder')}">
        </div>
        <div class="field">
          <label>${t('settings.vatPct')}</label>
          <select id="addline-vat" class="input input-full">
            <option value="21">21%</option>
            <option value="12">12%</option>
            <option value="0">0%</option>
          </select>
        </div>
      </div>
      <div class="form-row form-row-unit-qty">
        <div class="field" id="addline-unit-wrap" style="display:none">
          <label>${t('editor.unit')}</label>
          <select id="addline-custom-unit" class="input input-full">${unitOptsHtml}</select>
        </div>
        <div class="field">
          <label id="addline-qty-label">${t('editor.colQty')}</label>
          <div class="qty-stepper">
            <button type="button" class="btn btn-icon btn-secondary qty-btn" id="addline-qty-minus" aria-label="−">−</button>
            <input type="number" id="addline-qty" class="input qty-input" value="1" step="any" min="0">
            <button type="button" class="btn btn-icon btn-secondary qty-btn" id="addline-qty-plus" aria-label="+">+</button>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label>${t('editor.priceEur')}</label>
          <input type="number" id="addline-price" class="input" value="0" step="0.01" min="0">
        </div>
        <div class="field">
          <label>${t('editor.discountPct')}</label>
          <div class="qty-stepper">
            <button type="button" class="btn btn-icon btn-secondary qty-btn" id="addline-discount-minus" aria-label="−">−</button>
            <input type="number" id="addline-discount" class="input qty-input" value="0" step="5" min="0" max="100">
            <button type="button" class="btn btn-icon btn-secondary qty-btn" id="addline-discount-plus" aria-label="+">+</button>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="modal-cancel-addline">${t('editor.cancel')}</button>
        <button type="button" class="btn btn-primary" id="modal-save-addline">${t('editor.add')}</button>
      </div>
    </div>
  `, { isNew: true });
  const serviceSel = document.getElementById('addline-service');
  const priceInp = document.getElementById('addline-price');
  const vatInp = document.getElementById('addline-vat');
  const qtyLabelEl = document.getElementById('addline-qty-label');
  const customWrap = document.getElementById('addline-custom-wrap');
  const customNameInp = document.getElementById('addline-custom-name');
  const customUnitSel = document.getElementById('addline-custom-unit');
  function updateAddLineQtyLabel() {
    const sid = serviceSel.value;
    const isCustom = sid === CUSTOM_SERVICE_ID;
    const u = isCustom ? (customUnitSel ? customUnitSel.value : 'pc') : (() => { const svc = editorServices.find((s) => s.id === sid); return svc ? (svc.unit || 'pc') : null; })();
    qtyLabelEl.textContent = u ? (typeof t === 'function' ? t('editor.colQty') : 'Qty') + ' (' + unitLabel(u) + ')' : (typeof t === 'function' ? t('editor.colQty') : 'Qty');
  }
  const unitWrap = document.getElementById('addline-unit-wrap');
  const addQtyInpEl = document.getElementById('addline-qty');
  const addDiscountInpEl = document.getElementById('addline-discount');
  const addSaveBtn = document.getElementById('modal-save-addline');
  function setAddLineFieldsEnabled(enabled) {
    if (customNameInp) customNameInp.disabled = !enabled;
    if (customUnitSel) customUnitSel.disabled = !enabled;
    if (addQtyInpEl) addQtyInpEl.disabled = !enabled;
    if (priceInp) priceInp.disabled = !enabled;
    if (vatInp) vatInp.disabled = !enabled;
    if (addDiscountInpEl) addDiscountInpEl.disabled = !enabled;
    document.querySelectorAll('#addline-qty-minus, #addline-qty-plus, #addline-discount-minus, #addline-discount-plus').forEach((el) => { el.disabled = !enabled; });
    if (addSaveBtn) addSaveBtn.disabled = !enabled;
  }
  function toggleAddLineCustom() {
    const hasSelection = serviceSel.value !== '';
    setAddLineFieldsEnabled(hasSelection);
    const isCustom = serviceSel.value === CUSTOM_SERVICE_ID;
    if (customWrap) customWrap.style.display = isCustom ? 'block' : 'none';
    if (unitWrap) unitWrap.style.display = isCustom ? 'block' : 'none';
    if (isCustom) {
      if (priceInp) priceInp.value = '0';
      if (vatInp) vatInp.value = '21';
      if (customNameInp) customNameInp.value = '';
      if (customUnitSel) customUnitSel.value = 'hour';
    }
    updateAddLineQtyLabel();
  }
  serviceSel.addEventListener('change', () => {
    const sid = serviceSel.value;
    const svc = editorServices.find((s) => s.id === sid);
    if (svc) {
      priceInp.value = Number(svc.lastPrice || 0).toFixed(2);
      if (vatInp) vatInp.value = svc.vatPercent != null ? svc.vatPercent : 21;
    }
    toggleAddLineCustom();
  });
  if (customUnitSel) customUnitSel.addEventListener('change', updateAddLineQtyLabel);
  toggleAddLineCustom();
  document.getElementById('addline-qty-minus').addEventListener('click', () => { const v = Math.max(0, (parseFloat(addQtyInpEl.value) || 0) - 1); addQtyInpEl.value = v; });
  document.getElementById('addline-qty-plus').addEventListener('click', () => { const v = (parseFloat(addQtyInpEl.value) || 0) + 1; addQtyInpEl.value = v; });
  document.getElementById('addline-discount-minus').addEventListener('click', () => { const v = Math.max(0, (parseFloat(addDiscountInpEl.value) || 0) - 5); addDiscountInpEl.value = v; });
  document.getElementById('addline-discount-plus').addEventListener('click', () => { const v = Math.min(100, (parseFloat(addDiscountInpEl.value) || 0) + 5); addDiscountInpEl.value = v; });
  document.getElementById('modal-cancel-addline').addEventListener('click', hideModal);
  document.getElementById('modal-save-addline').addEventListener('click', () => {
    const sid = serviceSel.value;
    if (!sid) {
      alert(typeof t === 'function' ? t('msg.selectService') : 'Izvēlieties pakalpojumu vai preci.');
      return;
    }
    const isCustom = sid === CUSTOM_SERVICE_ID;
    const customName = customNameInp ? customNameInp.value.trim() : '';
    if (isCustom && !customName) {
      alert(typeof t === 'function' ? t('msg.customNameRequired') : 'Pielāgotam rindas nosaukumam jābūt aizpildītam.');
      return;
    }
    const svc = editorServices.find((s) => s.id === sid);
    const qty = parseFloat(document.getElementById('addline-qty').value) || 0;
    const price = parseFloat(priceInp.value) || 0;
    const discountPct = Math.min(100, Math.max(0, parseFloat(document.getElementById('addline-discount').value) || 0));
    const rawAmount = qty * price;
    const amount = Math.round(rawAmount * (1 - discountPct / 100) * 100) / 100;
    const item = {
      id: 'i_' + Date.now(),
      serviceId: isCustom ? CUSTOM_SERVICE_ID : sid,
      name: isCustom ? customName : (svc ? svc.name : ''),
      unit: isCustom ? (customUnitSel ? customUnitSel.value : 'pc') : (svc ? svc.unit : 'pc'),
      quantity: qty,
      pricePerUnit: price,
      discountPercent: discountPct,
      vatPercent: Math.max(0, parseFloat(vatInp ? vatInp.value : '21') || 0),
      amount
    };
    currentBill.items.push(item);
    hideModal(true);
    recalcBill();
  });
}

function openEditLineModal(idx) {
  const item = currentBill.items[idx];
  if (!item) return;
  const unitOptions = window.SERVICE_UNIT_OPTIONS || [{ value: 'pc', label: 'Gab.' }, { value: 'hour', label: 'St.' }, { value: 'service', label: 'Pak.' }];
  const unitLabel = (u) => {
    const key = 'unit.' + (u || 'pc');
    const translated = typeof window.t === 'function' ? window.t(key) : key;
    return translated !== key ? translated : (unitOptions.find((o) => o.value === (u || 'pc')) || {}).label || (u || '');
  };
  const editQtyLabelText = (typeof t === 'function' ? t('editor.colQty') : 'Qty') + ' (' + unitLabel(item.unit) + ')';
  const isItemCustom = item.serviceId === CUSTOM_SERVICE_ID;
  const serviceOpts = editorServices.map((s) => `<option value="${s.id}" ${!isItemCustom && item.serviceId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
  const unitOptsHtml = unitOptions.map((o) => `<option value="${o.value}" ${item.unit === o.value ? 'selected' : ''}>${escapeHtml(unitLabel(o.value))}</option>`).join('');
  showModal(`
    <h3>${typeof t === 'function' ? t('editor.editLineTitle') : 'Rediģēt rindu'}</h3>
    <div class="form-block">
      <div class="field">
        <label>${typeof t === 'function' ? t('editor.serviceOrProduct') : 'Pakalpojums / prece'}</label>
        <select id="editline-service" class="input input-full" required>
          <option value="">${typeof t === 'function' ? t('editor.choose') : 'Izvēlēties...'}</option>
          <option value="${CUSTOM_SERVICE_ID}" ${isItemCustom ? 'selected' : ''}>${typeof t === 'function' ? t('editor.customItem') : 'Pielāgots'}</option>
          ${serviceOpts}
        </select>
      </div>
      <div id="editline-custom-wrap" class="addline-custom-fields" style="display:${isItemCustom ? 'block' : 'none'}">
        <div class="field">
          <label>${typeof t === 'function' ? t('editor.colName') : 'Nosaukums'}</label>
          <input type="text" id="editline-custom-name" class="input input-full" value="${escapeHtml(item.name || '')}" placeholder="${typeof t === 'function' ? t('editor.customNamePlaceholder') : 'Pakalpojuma vai preces apraksts'}">
        </div>
        <div class="field">
          <label>${typeof t === 'function' ? t('settings.vatPct') : 'VAT %'}</label>
          <select id="editline-vat" class="input input-full">
            <option value="21" ${(item.vatPercent == null ? 21 : item.vatPercent) == 21 ? 'selected' : ''}>21%</option>
            <option value="12" ${(item.vatPercent == null ? 21 : item.vatPercent) == 12 ? 'selected' : ''}>12%</option>
            <option value="0" ${(item.vatPercent == null ? 21 : item.vatPercent) == 0 ? 'selected' : ''}>0%</option>
          </select>
        </div>
      </div>
      <div class="form-row form-row-unit-qty">
        <div class="field" id="editline-unit-wrap" style="display:${isItemCustom ? 'block' : 'none'}">
          <label>${typeof t === 'function' ? t('editor.unit') : 'Mērvienība'}</label>
          <select id="editline-custom-unit" class="input input-full">${unitOptsHtml}</select>
        </div>
        <div class="field">
          <label id="editline-qty-label">${escapeHtml(editQtyLabelText)}</label>
          <div class="qty-stepper">
            <button type="button" class="btn btn-icon btn-secondary qty-btn" id="editline-qty-minus" aria-label="−">−</button>
            <input type="number" id="editline-qty" class="input qty-input" value="${item.quantity}" step="any" min="0">
            <button type="button" class="btn btn-icon btn-secondary qty-btn" id="editline-qty-plus" aria-label="+">+</button>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label>${typeof t === 'function' ? t('editor.priceEur') : 'Cena (€)'}</label>
          <input type="number" id="editline-price" class="input" value="${Number(item.pricePerUnit || 0).toFixed(2)}" step="0.01" min="0">
        </div>
        <div class="field">
          <label>${typeof t === 'function' ? t('editor.discountPct') : 'Atlaide %'}</label>
          <div class="qty-stepper">
            <button type="button" class="btn btn-icon btn-secondary qty-btn" id="editline-discount-minus" aria-label="−">−</button>
            <input type="number" id="editline-discount" class="input qty-input" value="${Math.min(100, Math.max(0, Math.round(parseFloat(item.discountPercent) || 0) / 5) * 5)}" step="5" min="0" max="100">
            <button type="button" class="btn btn-icon btn-secondary qty-btn" id="editline-discount-plus" aria-label="+">+</button>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="modal-cancel-editline">${typeof t === 'function' ? t('editor.cancel') : 'Atcelt'}</button>
        <button type="button" class="btn btn-primary" id="modal-save-editline">${typeof t === 'function' ? t('common.save') : 'Saglabāt'}</button>
      </div>
    </div>
  `);
  const serviceSel = document.getElementById('editline-service');
  const priceInp = document.getElementById('editline-price');
  const editVatInp = document.getElementById('editline-vat');
  const editQtyLabelEl = document.getElementById('editline-qty-label');
  const editCustomWrap = document.getElementById('editline-custom-wrap');
  const editUnitWrap = document.getElementById('editline-unit-wrap');
  const editCustomNameInp = document.getElementById('editline-custom-name');
  const editCustomUnitSel = document.getElementById('editline-custom-unit');
  const editQtyInp = document.getElementById('editline-qty');
  const editDiscountInp = document.getElementById('editline-discount');
  const editSaveBtn = document.getElementById('modal-save-editline');
  function setEditLineFieldsEnabled(enabled) {
    if (editCustomNameInp) editCustomNameInp.disabled = !enabled;
    if (editCustomUnitSel) editCustomUnitSel.disabled = !enabled;
    if (editQtyInp) editQtyInp.disabled = !enabled;
    if (priceInp) priceInp.disabled = !enabled;
    if (editVatInp) editVatInp.disabled = !enabled;
    if (editDiscountInp) editDiscountInp.disabled = !enabled;
    document.querySelectorAll('#editline-qty-minus, #editline-qty-plus, #editline-discount-minus, #editline-discount-plus').forEach((el) => { el.disabled = !enabled; });
    if (editSaveBtn) editSaveBtn.disabled = !enabled;
  }
  function updateEditLineQtyLabel() {
    const sid = serviceSel.value;
    const isCustom = sid === CUSTOM_SERVICE_ID;
    const u = isCustom ? (editCustomUnitSel ? editCustomUnitSel.value : 'pc') : (() => { const svc = editorServices.find((s) => s.id === sid); return svc ? (svc.unit || 'pc') : null; })();
    const qty = parseFloat(document.getElementById('editline-qty').value) || 0;
    editQtyLabelEl.textContent = u ? (typeof t === 'function' ? t('editor.colQty') : 'Qty') + ' (' + unitLabel(u) + ')' : (typeof t === 'function' ? t('editor.colQty') : 'Qty');
  }
  function toggleEditLineCustom() {
    const hasSelection = serviceSel.value !== '';
    setEditLineFieldsEnabled(hasSelection);
    const isCustom = serviceSel.value === CUSTOM_SERVICE_ID;
    if (editCustomWrap) editCustomWrap.style.display = isCustom ? 'block' : 'none';
    if (editUnitWrap) editUnitWrap.style.display = isCustom ? 'block' : 'none';
    if (isCustom && editCustomNameInp && !editCustomNameInp.value.trim()) editCustomNameInp.value = item.name || '';
    updateEditLineQtyLabel();
  }
  serviceSel.addEventListener('change', () => {
    const sid = serviceSel.value;
    const svc = editorServices.find((s) => s.id === sid);
    if (svc) {
      priceInp.value = Number(svc.lastPrice || 0).toFixed(2);
      if (editVatInp) editVatInp.value = svc.vatPercent != null ? svc.vatPercent : 21;
    }
    toggleEditLineCustom();
  });
  if (editCustomUnitSel) editCustomUnitSel.addEventListener('change', updateEditLineQtyLabel);
  toggleEditLineCustom();
  document.getElementById('editline-qty-minus').addEventListener('click', () => { const v = Math.max(0, (parseFloat(editQtyInp.value) || 0) - 1); editQtyInp.value = v; updateEditLineQtyLabel(); });
  document.getElementById('editline-qty-plus').addEventListener('click', () => { const v = (parseFloat(editQtyInp.value) || 0) + 1; editQtyInp.value = v; updateEditLineQtyLabel(); });
  editQtyInp.addEventListener('change', updateEditLineQtyLabel);
  editQtyInp.addEventListener('input', updateEditLineQtyLabel);
  document.getElementById('editline-discount-minus').addEventListener('click', () => { const v = Math.max(0, (parseFloat(editDiscountInp.value) || 0) - 5); editDiscountInp.value = v; });
  document.getElementById('editline-discount-plus').addEventListener('click', () => { const v = Math.min(100, (parseFloat(editDiscountInp.value) || 0) + 5); editDiscountInp.value = v; });
  document.getElementById('modal-cancel-editline').addEventListener('click', hideModal);
  document.getElementById('modal-save-editline').addEventListener('click', () => {
    const sid = serviceSel.value;
    if (!sid) {
      alert(typeof t === 'function' ? t('msg.selectService') : 'Izvēlieties pakalpojumu vai preci.');
      return;
    }
    const isCustom = sid === CUSTOM_SERVICE_ID;
    const customName = editCustomNameInp ? editCustomNameInp.value.trim() : '';
    if (isCustom && !customName) {
      alert(typeof t === 'function' ? t('msg.customNameRequired') : 'Pielāgotam rindas nosaukumam jābūt aizpildītam.');
      return;
    }
    const svc = editorServices.find((s) => s.id === sid);
    const qty = parseFloat(document.getElementById('editline-qty').value) || 0;
    const price = parseFloat(priceInp.value) || 0;
    const discountPct = Math.min(100, Math.max(0, parseFloat(document.getElementById('editline-discount').value) || 0));
    const rawAmount = qty * price;
    const amount = Math.round(rawAmount * (1 - discountPct / 100) * 100) / 100;
    currentBill.items[idx] = {
      ...item,
      serviceId: isCustom ? CUSTOM_SERVICE_ID : sid,
      name: isCustom ? customName : (svc ? svc.name : item.name),
      unit: isCustom ? (editCustomUnitSel ? editCustomUnitSel.value : 'pc') : (svc ? svc.unit : item.unit),
      quantity: qty,
      pricePerUnit: price,
      discountPercent: discountPct,
      vatPercent: Math.max(0, parseFloat(editVatInp ? editVatInp.value : '21') || 0),
      amount
    };
    hideModal(true);
    recalcBill();
  });
}

function openCompanyCustomerModal(type) {
  const list = type === 'company' ? editorCompanies : editorCustomers.filter((c) => !c.inactive);
  const title = type === 'company' ? (typeof t === 'function' ? t('editor.chooseCompany') : 'Izvēlēties uzņēmumu') : (typeof t === 'function' ? t('editor.chooseCustomer') : 'Izvēlēties klientu');
  const closeLabel = typeof t === 'function' ? t('common.close') : 'Aizvērt';
  const addLabel = typeof t === 'function' ? t('editor.add') : 'Pievienot';
  let html = `
    <div class="modal-header-row">
      <h3>${escapeHtml(title)}</h3>
      <button type="button" class="modal-close-icon" id="modal-cancel-select" aria-label="${escapeHtml(closeLabel)}"><span class="material-icons" aria-hidden="true">close</span></button>
    </div>
    <div class="modal-toolbar">
      <button type="button" class="btn btn-primary" id="modal-add-new-entity" title="${escapeHtml(addLabel)}" aria-label="${escapeHtml(addLabel)}">${escapeHtml(addLabel)}<span class="material-icons modal-add-icon" aria-hidden="true">add</span></button>
    </div>
  `;
  if (list.length) {
    html += '<ul class="modal-entity-list">';
    list.forEach((e) => {
      html += `<li><button type="button" class="btn btn-secondary btn-select-entity" data-id="${escapeHtml(e.id)}">${escapeHtml(e.name)}${e.legalAddress || e.address ? ' — ' + (e.legalAddress || e.address).slice(0, 40) : ''}</button></li>`;
    });
    html += '</ul>';
  }
  showModal(html);
  document.getElementById('modal-cancel-select').addEventListener('click', hideModal);
  document.getElementById('modal-add-new-entity').addEventListener('click', () => {
    hideModal(true);
    if (type === 'company') addCompanyFromEditor();
    else addCustomerFromEditor();
  });
  document.querySelectorAll('.btn-select-entity').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (type === 'company') {
        currentBill.companyId = id;
        if (!currentBill.id && numberLocked) {
          const company = editorCompanies.find((c) => c.id === id);
          const customer = editorCustomers.find((c) => c.id === currentBill.customerId);
          const p = getPrefix(company, customer);
          currentBill.prefix = p;
          currentBill.number = currentBill.documentNumber != null ? p + '-' + String(currentBill.documentNumber).padStart(4, '0') : getPrefix(company, customer) + '-????';
        }
      } else {
        currentBill.customerId = id;
        const cust = editorCustomers.find((c) => c.id === id);
        if (!currentBill.id && numberLocked) {
          const company = editorCompanies.find((c) => c.id === currentBill.companyId);
          const p = getPrefix(company, cust);
          currentBill.prefix = p;
          currentBill.number = currentBill.documentNumber != null ? p + '-' + String(currentBill.documentNumber).padStart(4, '0') : getPrefix(company, cust) + '-????';
        }
      }
      hideModal(true);
      renderBillEditor();
    });
  });
}

function addCompanyFromEditor() {
  const lbl = (key, fallback) => typeof t === 'function' ? t(key) : fallback;
  let newCompanyLogoUrl = '';
  showModal(`
    <h3>${lbl('modal.companyNew', 'Add company')}</h3>
    <div class="form-block form-modal-cols">
      <div class="field">
        <label>${lbl('settings.companyName', 'Company name')}</label>
        <input type="text" id="new-company-name" class="input" placeholder="${lbl('settings.companyName', 'Company name')}">
      </div>
      <div class="field">
        <label>${lbl('settings.billPrefix', 'Prefix')}</label>
        <input type="text" id="new-company-bill-prefix" class="input" placeholder="${lbl('settings.companyNamePlaceholder', 'Used in invoice numbers')}">
      </div>
      <div class="field field-full">
        <label class="checkbox-label">
          <input type="checkbox" id="new-company-isDefault">
          ${lbl('settings.defaultCompany', 'Default company')}
        </label>
      </div>
      <div class="field field-full">
        <label>${lbl('settings.legalAddress', 'Legal address')}</label>
        <textarea id="new-company-legalAddress" class="input" placeholder="${lbl('settings.legalAddress', 'Legal address')}"></textarea>
      </div>
      <div class="field">
        <label>${lbl('settings.regNumber', 'Registration number')}</label>
        <input type="text" id="new-company-registrationNumber" class="input" placeholder="${lbl('settings.regNumber', 'Registration number')}">
      </div>
      <div class="field">
        <label>${lbl('settings.vatNumber', 'VAT number')}</label>
        <input type="text" id="new-company-vatNumber" class="input" placeholder="${lbl('settings.vatNumber', 'VAT number')}">
      </div>
      <div class="field">
        <label>${lbl('settings.phone', 'Phone')}</label>
        <input type="text" id="new-company-phone" class="input" placeholder="${lbl('settings.phone', 'Phone')}">
      </div>
      <div class="field">
        <label>${lbl('settings.email', 'Email')}</label>
        <input type="email" id="new-company-email" class="input" placeholder="${lbl('settings.email', 'Email')}">
      </div>
      <div class="field">
        <label>${lbl('settings.websiteLabel', 'Website')}</label>
        <input type="url" id="new-company-website" class="input" placeholder="https://...">
      </div>
      <div class="field">
        <label>${lbl('settings.logo', 'Logo')}</label>
        <select id="new-company-logo-type" class="input">
          <option value="text">${lbl('settings.logoTypeText', 'Text')}</option>
          <option value="image">${lbl('settings.logoTypeImage', 'Upload file')}</option>
        </select>
      </div>
      <div class="field" id="new-company-logo-text-wrap">
        <label>${lbl('settings.logoText', 'Logo text')}</label>
        <input type="text" id="new-company-logo-text" class="input" placeholder="${lbl('settings.logoTextPlaceholder', 'e.g. Company name or initials')}">
      </div>
      <div class="field" id="new-company-logo-upload-wrap" style="display:none">
        <label>${lbl('settings.logoTypeImage', 'Upload file')}</label>
        <button type="button" class="btn btn-secondary btn-input-height" id="new-company-logo-upload-btn">${lbl('settings.upload', 'Upload')}</button>
        <input type="file" id="new-company-logo-file" accept="image/*" hidden>
      </div>
      <div class="field field-full">
        <label>${lbl('settings.bankName', 'Bank name')}</label>
        <input type="text" id="new-company-bankName" class="input" placeholder="${lbl('settings.bankName', 'Bank name')}">
      </div>
      <div class="field field-full">
        <label>SWIFT/BIC</label>
        <input type="text" id="new-company-bankSwiftBic" class="input" placeholder="HABALV22">
      </div>
      <div class="field field-full">
        <label>${lbl('settings.bankAccountLabel', 'Bank account (IBAN)')}</label>
        <input type="text" id="new-company-bankAccount" class="input" placeholder="LV00 BANK 0000 0000 0000 0">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="modal-cancel-newco">${lbl('common.cancel', 'Cancel')}</button>
        <button type="button" class="btn btn-primary" id="modal-save-newco">${lbl('modal.saveAndSelect', 'Save and select')}</button>
      </div>
    </div>
  `, { isNew: true });
  const logoTypeSel = document.getElementById('new-company-logo-type');
  const logoTextWrap = document.getElementById('new-company-logo-text-wrap');
  const logoUploadWrap = document.getElementById('new-company-logo-upload-wrap');
  logoTypeSel.addEventListener('change', () => {
    const isImage = logoTypeSel.value === 'image';
    logoTextWrap.style.display = isImage ? 'none' : 'block';
    logoUploadWrap.style.display = isImage ? 'block' : 'none';
  });
  document.getElementById('new-company-logo-upload-btn').addEventListener('click', () => document.getElementById('new-company-logo-file').click());
  document.getElementById('new-company-logo-file').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const result = await api.uploadLogo(file);
      newCompanyLogoUrl = result.url || '';
    } catch (err) {
      alert((typeof t === 'function' ? t('msg.uploadFailed') : 'Augšupielāde neizdevās') + ': ' + err.message);
    }
  });
  document.getElementById('modal-cancel-newco').addEventListener('click', hideModal);
  document.getElementById('modal-save-newco').addEventListener('click', async () => {
    const name = document.getElementById('new-company-name').value.trim();
    if (!name) {
      alert(typeof t === 'function' ? t('msg.companyNameRequired') : 'Uzņēmuma nosaukums ir obligāts.');
      return;
    }
    const lt = document.getElementById('new-company-logo-type').value;
    const payload = {
      name: name,
      billPrefix: sanitizePrefix(document.getElementById('new-company-bill-prefix').value),
      isDefault: document.getElementById('new-company-isDefault').checked,
      legalAddress: document.getElementById('new-company-legalAddress').value.trim(),
      registrationNumber: document.getElementById('new-company-registrationNumber').value.trim(),
      vatNumber: document.getElementById('new-company-vatNumber').value.trim(),
      phone: document.getElementById('new-company-phone').value.trim(),
      email: document.getElementById('new-company-email').value.trim(),
      website: document.getElementById('new-company-website').value.trim(),
      logoType: lt,
      logo: lt === 'image' ? (newCompanyLogoUrl || null) : null,
      logoText: lt === 'text' ? (document.getElementById('new-company-logo-text').value.trim() || null) : null,
      bankName: document.getElementById('new-company-bankName').value.trim(),
      bankSwiftBic: document.getElementById('new-company-bankSwiftBic').value.trim(),
      bankAccount: document.getElementById('new-company-bankAccount').value.trim()
    };
    try {
      const created = await api.postCompany(payload);
      editorCompanies.push(created);
      currentBill.companyId = created.id;
      hideModal(true);
      renderBillEditor();
    } catch (e) {
      alert((typeof t === 'function' ? t('msg.saveFailed') : 'Neizdevās') + ': ' + e.message);
    }
  });
}

function addCustomerFromEditor() {
  const lbl = (key, fallback) => typeof t === 'function' ? t(key) : fallback;
  showModal(`
    <h3>${lbl('modal.customerNew', 'Jauns klients')}</h3>
    <div class="form-block">
      <div class="field"><label>${lbl('settings.customerName', 'Nosaukums')}</label><input type="text" id="new-cust-name" class="input"></div>
      <div class="field"><label>${lbl('settings.billPrefix', 'Rēķina prefikss')}</label><input type="text" id="new-cust-billPrefix" class="input" placeholder="${lbl('settings.customerPrefixPlaceholder', 'Pārraksta noklusējuma prefiksu')}"></div>
      <div class="field"><label>${lbl('settings.address', 'Adrese')}</label><textarea id="new-cust-address" class="input"></textarea></div>
      <div class="field"><label>${lbl('settings.regNumber', 'Reģistrācijas numurs')}</label><input type="text" id="new-cust-reg" class="input"></div>
      <div class="field"><label>${lbl('settings.vatNumber', 'PVN numurs')}</label><input type="text" id="new-cust-vat" class="input"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="modal-cancel-newcust">${lbl('common.cancel', 'Atcelt')}</button>
        <button type="button" class="btn btn-primary" id="modal-save-newcust">${lbl('modal.saveAndSelect', 'Saglabāt un izvēlēties')}</button>
      </div>
    </div>
  `, { isNew: true });
  document.getElementById('modal-cancel-newcust').addEventListener('click', () => hideModal(true));
  document.getElementById('modal-save-newcust').addEventListener('click', async () => {
    const name = document.getElementById('new-cust-name').value.trim();
    if (!name) {
      alert(typeof t === 'function' ? t('msg.customerNameRequired') : 'Klienta nosaukums ir obligāts.');
      return;
    }
    const payload = {
      name: name,
      address: document.getElementById('new-cust-address').value.trim(),
      registrationNumber: document.getElementById('new-cust-reg').value.trim(),
      vatNumber: document.getElementById('new-cust-vat').value.trim(),
      billPrefix: sanitizePrefix(document.getElementById('new-cust-billPrefix').value)
    };
    try {
      const created = await api.postCustomer(payload);
      editorCustomers.push(created);
      currentBill.customerId = created.id;
      hideModal(true);
      renderBillEditor();
    } catch (e) {
      alert((typeof t === 'function' ? t('msg.saveFailed') : 'Neizdevās') + ': ' + e.message);
    }
  });
}

function collectBillFromForm() {
  const numEl = document.getElementById('bill-number');
  if (numEl) currentBill.number = numEl.value;
  currentBill.date = document.getElementById('bill-date').value;
  const daysEl = document.getElementById('bill-payment-days');
  const days = daysEl ? (parseInt(daysEl.value, 10) || 30) : 30;
  currentBill.paymentDueDate = addDays(currentBill.date, days);
  recalcBill();
}

async function saveBill() {
  collectBillFromForm();
  try {
    if (currentBill.id) {
      await api.putBill(currentBill.id, currentBill);
      if (window.performCloseEditorModal) window.performCloseEditorModal();
    } else {
      const company = editorCompanies.find((c) => c.id === currentBill.companyId);
      const customer = editorCustomers.find((c) => c.id === currentBill.customerId);
      currentBill.prefix = getPrefix(company, customer);
      const created = await api.postBill(currentBill);
      currentBill.id = created.id;
      currentBill.number = created.number;
      currentBill.documentNumber = created.documentNumber;
      if (window.performCloseEditorModal) window.performCloseEditorModal();
    }
  } catch (e) {
    alert((typeof t === 'function' ? t('msg.saveFailed') : 'Neizdevās saglabāt') + ': ' + e.message);
  }
}

function initBillEditor() {
  const closeBtn = document.getElementById('btn-editor-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.editorDirty || window.editorIsNew) {
        window.pendingCloseEditor = true;
        if (window.showDiscardConfirm) window.showDiscardConfirm();
        else if (window.performCloseEditorModal) window.performCloseEditorModal();
      } else {
        if (window.performCloseEditorModal) window.performCloseEditorModal();
      }
    });
  }
  document.getElementById('btn-save-bill').addEventListener('click', saveBill);
}

window.openBillEditor = openBillEditor;
window.getCurrentBill = () => currentBill;

document.addEventListener('DOMContentLoaded', initBillEditor);
