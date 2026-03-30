function showView(viewId) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  const el = document.getElementById('view-' + viewId);
  if (el) el.classList.remove('hidden');
  document.querySelectorAll('#header-app [data-view]').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('data-view') === viewId);
  });
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('data-view') === viewId);
  });
}

function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, id] = hash.split('/').filter(Boolean);
  return { path: path || 'bills', id: id || null };
}

function showEditorModal() {
  const overlay = document.getElementById('modal-editor-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

function hideEditorModal() {
  const overlay = document.getElementById('modal-editor-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function performCloseEditorModal() {
  hideEditorModal();
  window.editorIsNew = false;
  window.editorDirty = false;
  window.location.hash = '#/';
  if (window.refreshBillsList) window.refreshBillsList();
  document.querySelectorAll('#header-app [data-view]').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('data-view') === 'bills');
  });
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('data-view') === 'bills');
  });
}

window.showEditorModal = showEditorModal;
window.hideEditorModal = hideEditorModal;
window.performCloseEditorModal = performCloseEditorModal;

function initViews() {
  function applyRoute() {
    const { path, id } = getRoute();
    if (path === 'bills' || path === 'dashboard') {
      showView('bills');
      hideEditorModal();
      if (window.refreshBillsList) window.refreshBillsList();
    } else if (path === 'new') {
      showView('bills');
      document.querySelectorAll('.nav-link').forEach((a) => {
        a.classList.toggle('active', a.getAttribute('data-view') === 'editor');
      });
      showEditorModal();
      if (window.openBillEditor) window.openBillEditor(null);
    } else if (path === 'bill' && id) {
      showView('bills');
      document.querySelectorAll('.nav-link').forEach((a) => {
        a.classList.toggle('active', a.getAttribute('data-view') === 'editor');
      });
      showEditorModal();
      if (window.openBillEditor) window.openBillEditor(id);
    } else if (path === 'settings') {
      hideEditorModal();
      showView('settings');
      if (window.refreshSettings) window.refreshSettings();
    } else if (path === 'faq') {
      hideEditorModal();
      showView('faq');
      if (window.renderFaqPage) window.renderFaqPage();
    } else {
      showView('bills');
      hideEditorModal();
      if (window.refreshBillsList) window.refreshBillsList();
    }
  }
  window.addEventListener('hashchange', applyRoute);
  applyRoute();
}

function showModal(html, options) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  box.innerHTML = html;
  window.modalDirty = false;
  window.modalIsNew = options && options.isNew === true;
  overlay.classList.remove('hidden');
}

function hideDiscardConfirm() {
  const overlay = document.getElementById('discard-confirm-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function showDiscardConfirm() {
  const overlay = document.getElementById('discard-confirm-overlay');
  if (overlay) overlay.classList.remove('hidden');
}
window.showDiscardConfirm = showDiscardConfirm;

function performCloseModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  window.modalDirty = false;
  window.modalIsNew = false;
}

function hideModal(skipConfirm) {
  if (!skipConfirm && (window.modalDirty || window.modalIsNew)) {
    showDiscardConfirm();
    return;
  }
  performCloseModal();
}

function initDiscardConfirm() {
  const cancelBtn = document.getElementById('discard-confirm-cancel');
  const discardBtn = document.getElementById('discard-confirm-discard');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    hideDiscardConfirm();
    window.pendingCloseEditor = false;
  });
  if (discardBtn) discardBtn.addEventListener('click', () => {
    hideDiscardConfirm();
    if (window.pendingCloseEditor) {
      if (window.performCloseEditorModal) window.performCloseEditorModal();
      window.pendingCloseEditor = false;
    } else {
      performCloseModal();
    }
  });
}

initDiscardConfirm();

document.addEventListener('input', (e) => {
  if (e.target.closest('#modal-box')) window.modalDirty = true;
  if (e.target.closest('#modal-editor-overlay')) window.editorDirty = true;
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#modal-box')) window.modalDirty = true;
  if (e.target.closest('#modal-editor-overlay')) window.editorDirty = true;
});
