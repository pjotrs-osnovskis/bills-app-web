(function () {
  if (typeof window.JSPDF_FONT_URL === 'undefined') window.JSPDF_FONT_URL = '/fonts/Roboto-Light-base64.txt';
  if (typeof window.JSPDF_FONT_FAMILY === 'undefined') window.JSPDF_FONT_FAMILY = 'Roboto-Light';
  if (typeof window.JSPDF_FONT_FILENAME === 'undefined') window.JSPDF_FONT_FILENAME = 'Roboto-Light-normal.ttf';
  if (typeof window.JSPDF_FONT_BOLD_URL === 'undefined') window.JSPDF_FONT_BOLD_URL = '/fonts/Roboto-Bold-base64.txt';
  if (typeof window.JSPDF_FONT_BOLD_FILENAME === 'undefined') window.JSPDF_FONT_BOLD_FILENAME = 'Roboto-Bold-normal.ttf';
  window.JSPDF_FONT_BASE64 = null;
  window.JSPDF_FONT_BOLD_BASE64 = null;
  if (window.JSPDF_FONT_URL) {
    fetch(window.JSPDF_FONT_URL).then(function (r) { return r.text(); }).then(function (t) {
      var s = t.trim();
      if (s.length > 100) window.JSPDF_FONT_BASE64 = s;
    }).catch(function () {});
  }
  if (window.JSPDF_FONT_BOLD_URL) {
    fetch(window.JSPDF_FONT_BOLD_URL).then(function (r) { return r.text(); }).then(function (t) {
      var s = t.trim();
      if (s.length > 100) window.JSPDF_FONT_BOLD_BASE64 = s;
    }).catch(function () {});
  }
  window.applyJsPdfFont = function (doc) {
    if (!doc || !window.JSPDF_FONT_BASE64 || !window.JSPDF_FONT_FAMILY) return;
    var filename = window.JSPDF_FONT_FILENAME || 'Roboto-Light-normal.ttf';
    doc.addFileToVFS(filename, window.JSPDF_FONT_BASE64);
    doc.addFont(filename, window.JSPDF_FONT_FAMILY, 'normal');
    if (window.JSPDF_FONT_BOLD_BASE64) {
      var boldFilename = window.JSPDF_FONT_BOLD_FILENAME || 'Roboto-Bold-normal.ttf';
      doc.addFileToVFS(boldFilename, window.JSPDF_FONT_BOLD_BASE64);
      doc.addFont(boldFilename, window.JSPDF_FONT_FAMILY, 'bold');
    } else {
      doc.addFont(filename, window.JSPDF_FONT_FAMILY, 'bold');
    }
  };
})();
