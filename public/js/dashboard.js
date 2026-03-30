function escapeHtmlDash(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function fmtEur(val) {
  return Number(val || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function getDashboardEffectiveStatus(bill, today) {
  if (bill.status === 'sent' && bill.paymentDueDate && bill.paymentDueDate < today) return 'overdue';
  return bill.status || 'draft';
}

function renderEmptyState() {
  const body = document.querySelector('#view-dashboard .view-body');
  if (!body) return;
  const t = typeof window.i18n === 'function' ? window.i18n : null;
  body.innerHTML =
    '<div class="empty-state">' +
    '<span class="material-symbols-outlined empty-state-icon" aria-hidden="true">receipt_long</span>' +
    '<h2 class="empty-state-title">' + (t ? t('dashboard.emptyTitle') : 'Welcome to Qlynton') + '</h2>' +
    '<p class="empty-state-text">' + (t ? t('dashboard.emptyText') : 'Get started by adding your company details and creating your first invoice.') + '</p>' +
    '<div class="empty-state-actions">' +
    '<a href="#/settings" class="btn btn-primary">' + (t ? t('dashboard.emptySetup') : 'Set up your company') + '</a>' +
    '<a href="#/new" class="btn btn-secondary">' + (t ? t('nav.createNewBill') : 'Create invoice') + '</a>' +
    '</div>' +
    '</div>';
}

async function refreshDashboard() {
  try {
    const [bills, customers, settings, companies] = await Promise.all([api.getBills(), api.getCustomers(), api.getSettings(), api.getCompanies()]);
    if (bills.length === 0 && companies.length === 0) {
      renderEmptyState();
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    let outstanding = 0;
    let overdue = 0;
    let paidMonth = 0;
    let draftCount = 0;
    const overdueList = [];

    bills.forEach(function (b) {
      const eff = getDashboardEffectiveStatus(b, today);
      if (eff === 'overdue') {
        overdue += Number(b.totalGross) || 0;
        outstanding += Number(b.totalGross) || 0;
        overdueList.push(b);
      } else if (eff === 'sent') {
        outstanding += Number(b.totalGross) || 0;
      } else if (eff === 'paid' && b.updatedAt && b.updatedAt.slice(0, 7) === thisMonth) {
        paidMonth += Number(b.totalGross) || 0;
      } else if (eff === 'draft') {
        draftCount++;
      }
    });

    const t = typeof window.i18n === 'function' ? window.i18n : null;

    const el = function (id) { return document.getElementById(id); };
    if (el('stat-outstanding')) el('stat-outstanding').textContent = fmtEur(outstanding);
    if (el('stat-overdue')) el('stat-overdue').textContent = fmtEur(overdue);
    if (el('stat-paid-month')) el('stat-paid-month').textContent = fmtEur(paidMonth);
    if (el('stat-drafts')) el('stat-drafts').textContent = draftCount;

    const overdueSection = el('dashboard-overdue-section');
    const overdueTbody = el('dashboard-overdue-tbody');
    if (overdueSection && overdueTbody) {
      if (overdueList.length > 0) {
        overdueSection.style.display = '';
        overdueList.sort(function (a, b) { return (a.paymentDueDate || '') < (b.paymentDueDate || '') ? -1 : 1; });
        const editLabel = t ? t('common.edit') : 'Edit';
        overdueTbody.innerHTML = overdueList.map(function (b) {
          const cust = customers.find(function (c) { return c.id === b.customerId; });
          const custName = cust ? cust.name : (b.customerId || '—');
          return '<tr>' +
            '<td>' + escapeHtmlDash(b.number) + '</td>' +
            '<td>' + escapeHtmlDash(custName) + '</td>' +
            '<td>' + escapeHtmlDash(b.paymentDueDate || '') + '</td>' +
            '<td class="total-cell">' + fmtEur(b.totalGross) + '</td>' +
            '<td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-bill-id="' + escapeHtmlDash(b.id) + '">' + escapeHtmlDash(editLabel) + '</button></td>' +
            '</tr>';
        }).join('');
        overdueTbody.querySelectorAll('[data-bill-id]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            window.location.hash = '#/bill/' + btn.getAttribute('data-bill-id');
          });
        });
      } else {
        overdueSection.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

window.refreshDashboard = refreshDashboard;
