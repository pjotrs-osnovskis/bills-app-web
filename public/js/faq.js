(function () {
  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function getLocale() {
    return typeof window.getLocale === 'function' ? window.getLocale() : 'en';
  }

  function getSections() {
    const loc = getLocale();
    const data = window.FAQ_CONTENT || {};
    if (data[loc] && data[loc].length) return data[loc];
    return data.en || [];
  }

  function normalize(text) {
    return (text || '').toLowerCase().trim();
  }

  function matchesQuery(text, q) {
    if (!q) return true;
    return normalize(text).indexOf(q) !== -1;
  }

  function renderFaqPage() {
    const root = document.getElementById('faq-root');
    const emptyEl = document.getElementById('faq-empty');
    if (!root) return;
    const input = document.getElementById('faq-search');
    const raw = input && input.value ? String(input.value) : '';
    const q = normalize(raw);
    const sections = getSections();
    const parts = [];
    let any = false;
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const sectionTitle = sec.title || '';
      const sectionMatch = matchesQuery(sectionTitle, q);
      const itemBlocks = [];
      const items = sec.items || [];
      for (let ii = 0; ii < items.length; ii++) {
        const it = items[ii];
        const question = it.q || '';
        const answer = it.a || '';
        if (!q || sectionMatch || matchesQuery(question, q) || matchesQuery(answer, q)) {
          itemBlocks.push(
            '<div class="faq-item">' +
              '<h3 class="faq-q">' + escapeHtml(question) + '</h3>' +
              '<div class="faq-a">' + escapeHtml(answer).replace(/\n/g, '<br>') + '</div>' +
            '</div>'
          );
          any = true;
        }
      }
      if (itemBlocks.length) {
        parts.push(
          '<section class="faq-section" aria-labelledby="faq-sec-' + escapeHtml(sec.id || String(si)) + '">' +
            '<h2 class="faq-section-title" id="faq-sec-' + escapeHtml(sec.id || String(si)) + '">' + escapeHtml(sectionTitle) + '</h2>' +
            '<div class="faq-section-items">' + itemBlocks.join('') + '</div>' +
          '</section>'
        );
      }
    }
    root.innerHTML = parts.join('');
    if (emptyEl) {
      if (q && !any) {
        emptyEl.classList.remove('hidden');
        const t = typeof window.t === 'function' ? window.t('faq.noResults') : 'No questions match your search.';
        emptyEl.textContent = t;
      } else {
        emptyEl.classList.add('hidden');
      }
    }
  }

  function initFaq() {
    const search = document.getElementById('faq-search');
    if (search) {
      search.addEventListener('input', function () {
        renderFaqPage();
      });
    }
    const origApply = window.applyTranslations;
    if (typeof origApply === 'function') {
      window.applyTranslations = function () {
        origApply.apply(this, arguments);
        renderFaqPage();
      };
    }
  }

  window.renderFaqPage = renderFaqPage;
  window.initFaq = initFaq;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaq);
  } else {
    initFaq();
  }
})();
