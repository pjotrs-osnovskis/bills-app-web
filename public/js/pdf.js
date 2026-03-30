function getJsPDF(callback) {
  const check = () => {
    const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (JsPDF) {
      callback(JsPDF);
      return true;
    }
    return false;
  };
  if (check()) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
  script.async = false;
  script.onload = function () {
    setTimeout(function () {
      if (!check()) callback(null);
    }, 50);
  };
  script.onerror = function () { callback(null); };
  document.head.appendChild(script);
}

function generateBillPdf(bill, companiesList, customersList, options) {
  if (!bill) return;
  const billsLocale = (options && options.billsLocale && ['lv', 'en', 'ru'].includes(options.billsLocale)) ? options.billsLocale : 'en';
  const L = typeof getBillsLabels === 'function' ? getBillsLabels(billsLocale) : getBillsLabels('en');
  getJsPDF(function (jsPDF) {
    if (!jsPDF) {
      if (options && typeof options.onPdfError === 'function') {
        options.onPdfError(new Error(typeof t === 'function' ? t('msg.pdfLibFailed') : 'PDF library failed to load.'));
      } else {
        alert(typeof t === 'function' ? t('msg.pdfLibFailed') : 'PDF library failed to load. Please refresh the page.');
      }
      return;
    }
    const companies = companiesList || (window.getCompanies ? window.getCompanies() : []);
    const customers = customersList || (window.getCustomers ? window.getCustomers() : []);
    const company = companies.find(function (c) { return c.id === bill.companyId; });
    const customer = customers.find(function (c) { return c.id === bill.customerId; });
    const doc = new jsPDF({ compress: true });
    function formatDateLV(isoStr) {
      if (!isoStr || typeof isoStr !== 'string') return '';
      const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? m[3] + '.' + m[2] + '.' + m[1] : isoStr;
    }
    let fontFamily = 'helvetica';
    if (typeof window.applyJsPdfFont === 'function') {
      try {
        window.applyJsPdfFont(doc);
        if (window.JSPDF_FONT_FAMILY) fontFamily = window.JSPDF_FONT_FAMILY;
      } catch (e) {}
    }
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const left = margin;
    const right = pageW - margin;
    const contentRight = right;
    const contentW = right - left;
    function textRightEdge(str, xRight, y) {
      if (typeof doc.getTextDimensions === 'function') {
        const d = doc.getTextDimensions(str);
        doc.text(str, xRight - d.w, y);
      } else {
        doc.text(str, xRight, y, { align: 'right' });
      }
    }
    function textAtContentRight(str, y) {
      doc.text(str, contentRight, y, { align: 'right' });
    }
    const rowGap = 10;
    const fontSize = 10;
    const fontSizeSmall = 9;
    const fontSizeTitle = 12;
    function lh(s) { return s * 1.1; }
    function lhDetail(s) { return s * 0.6; }

    function drawContent(row1Bottom) {
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(fontSizeSmall);
      if (typeof doc.setCharacterSpacing === 'function') doc.setCharacterSpacing(0);

      let y = row1Bottom + rowGap;
      doc.text(L.date + ': ' + formatDateLV(bill.date), left, y, { maxWidth: contentW });
      y += lhDetail(fontSizeSmall);
      if (bill.supplyDate) {
        doc.text(L.supplyDate + ': ' + formatDateLV(bill.supplyDate), left, y, { maxWidth: contentW });
        y += lhDetail(fontSizeSmall);
      }
      doc.setFont(fontFamily, 'bold');
      const paymentDueRaw = bill.paymentDueDate || (function () {
        if (!bill.date) return '';
        const d = new Date(bill.date);
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
      }());
      doc.text(L.paymentDue + ': ' + formatDateLV(paymentDueRaw), left, y, { maxWidth: contentW });
      doc.setFont(fontFamily, 'normal');
      y += lhDetail(fontSizeSmall);

      const custName = customer ? customer.name : '';
      const custAddressLines = customer && customer.address
        ? customer.address.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean)
        : [];
      const custReg = customer && customer.registrationNumber ? L.regNr + ' ' + customer.registrationNumber : '';
      const custVat = customer && customer.vatNumber ? L.vatNr + ' ' + customer.vatNumber : '';
      const customerBlockWidth = contentW * 0.48;
      let yR = row1Bottom + rowGap;
      if (custName || custAddressLines.length || custReg || custVat) {
        doc.setFont(fontFamily, 'bold');
        if (typeof doc.splitTextToSize === 'function') {
          const nameLines = doc.splitTextToSize(custName, customerBlockWidth);
          nameLines.forEach(function (line) {
            doc.text(line, right, yR, { align: 'right' });
            yR += lhDetail(fontSizeSmall);
          });
        } else {
          doc.text(custName, right, yR, { align: 'right' });
          yR += lhDetail(fontSizeSmall);
        }
        doc.setFont(fontFamily, 'normal');
        custAddressLines.forEach(function (line) {
          if (typeof doc.splitTextToSize === 'function') {
            const wrapped = doc.splitTextToSize(line, customerBlockWidth);
            wrapped.forEach(function (l) {
              doc.text(l, right, yR, { align: 'right' });
              yR += lhDetail(fontSizeSmall);
            });
          } else {
            doc.text(line, right, yR, { align: 'right' });
            yR += lhDetail(fontSizeSmall);
          }
        });
        if (custReg) {
          doc.text(custReg, right, yR, { align: 'right' });
          yR += lhDetail(fontSizeSmall);
        }
        if (custVat) {
          doc.text(custVat, right, yR, { align: 'right' });
          yR += lhDetail(fontSizeSmall);
        }
      }
      y = Math.max(y, yR) + rowGap;

      const colWBase = [70, 28, 22, 24];
      const colWSum = colWBase.reduce(function (a, b) { return a + b; }, 0);
      const colW = colWBase.map(function (w) { return (w / colWSum) * contentW; });
      const colR = [left + colW[0], left + colW[0] + colW[1], left + colW[0] + colW[1] + colW[2], left + colW[0] + colW[1] + colW[2] + colW[3]];
      const headers = [L.tableDescription, L.tableQty, L.tablePrice, L.tableTotal];
      doc.setFontSize(fontSizeSmall);
      doc.setFont(fontFamily, 'bold');
      doc.text(headers[0], left, y);
      for (let i = 1; i < headers.length; i++) {
        doc.text(headers[i], colR[i], y, { align: 'right' });
      }
      const ruleLineWidth = 0.2;
      const ruleLineColor = [200, 200, 200];
      const tableRuleGap = lhDetail(fontSizeSmall);
      y += tableRuleGap;
      doc.setDrawColor(ruleLineColor[0], ruleLineColor[1], ruleLineColor[2]);
      doc.setLineWidth(ruleLineWidth);
      doc.line(left, y, contentRight, y);
      y += ruleLineWidth + tableRuleGap;
      doc.setDrawColor(0, 0, 0);
      doc.setFont(fontFamily, 'normal');

      function unitLabel(unit, qty) {
        return typeof L.unit === 'function' ? L.unit(unit, qty) : (unit === 'hour' ? 'stunda' : unit === 'service' ? 'pakalpojums' : 'gabals');
      }
      (bill.items || []).forEach(function (item) {
        const qty = item.quantity || 0;
        const unitLabelStr = unitLabel(item.unit, qty);
        const name = (item.name || '').slice(0, 36);
        const price = Number(item.pricePerUnit || 0);
        const rawAmount = (qty || 0) * price;
        const discountPct = parseFloat(item.discountPercent) || 0;
        const discountAmount = discountPct > 0 && rawAmount > 0 ? Math.round(rawAmount * (discountPct / 100) * 100) / 100 : 0;
        const netAmount = item.amount != null ? item.amount : (rawAmount - discountAmount);
        const hasDiscount = discountAmount > 0;
        doc.text(name, left, y);
        doc.text(String(qty) + ' ' + unitLabelStr, colR[1], y, { align: 'right' });
        doc.text(price.toFixed(2), colR[2], y, { align: 'right' });
        doc.text((hasDiscount ? rawAmount : netAmount).toFixed(2), colR[3], y, { align: 'right' });
        y += lhDetail(fontSizeSmall);
        if (hasDiscount) {
          doc.setFontSize(fontSizeSmall - 1);
          doc.text(L.discount, left + 6, y);
          doc.text(Number(discountPct).toFixed(0) + '%', colR[1], y, { align: 'right' });
          doc.text('-' + Number(discountAmount).toFixed(2), colR[3], y, { align: 'right' });
          y += lhDetail(fontSizeSmall - 1);
          doc.setFontSize(fontSizeSmall);
        }
      });

      y += rowGap;
      const itemsSubtotal = (bill.items || []).reduce(function (s, i) { return s + (i.amount != null ? i.amount : 0); }, 0);
      const itemsRawSubtotal = (bill.items || []).reduce(function (s, i) {
        const qty = parseFloat(i.quantity) || 0;
        const price = parseFloat(i.pricePerUnit) || 0;
        return s + qty * price;
      }, 0);
      const totalItemDiscounts = Math.round((itemsRawSubtotal - itemsSubtotal) * 100) / 100;
      const billPct = parseFloat(bill.discountPercent) || 0;
      const billDiscountAmt = itemsSubtotal > 0 && billPct > 0 ? Math.round(itemsSubtotal * (billPct / 100) * 100) / 100 : 0;
      const hasItemDiscounts = totalItemDiscounts > 0;
      const hasBillDiscount = billDiscountAmt > 0;
      if (hasItemDiscounts || hasBillDiscount) {
        const beforeVal = hasItemDiscounts ? itemsRawSubtotal : itemsSubtotal;
        textAtContentRight(L.subtotalBeforeDiscount + ': ' + Number(beforeVal).toFixed(2) + ' €', y);
        y += lhDetail(fontSizeSmall);
      }
      if (hasItemDiscounts) {
        textAtContentRight(L.itemDiscounts + ': -' + Number(totalItemDiscounts).toFixed(2) + ' €', y);
        y += lhDetail(fontSizeSmall);
      }
      if (hasBillDiscount) {
        const discountDesc = (bill.discountDescription || '').trim() ? ' – ' + (bill.discountDescription || '').trim() : '';
        textAtContentRight(L.discountPct + ' (' + Number(billPct).toFixed(0) + '%)' + discountDesc + ': -' + Number(billDiscountAmt).toFixed(2) + ' €', y);
        y += lhDetail(fontSizeSmall);
      }
      textAtContentRight(L.subtotalNoVat + ': ' + Number(bill.subtotal || 0).toFixed(2) + ' €', y);
      y += lhDetail(fontSizeSmall);
      var vatByRate = bill.vatByRate && typeof bill.vatByRate === 'object' ? bill.vatByRate : null;
      if (vatByRate && Object.keys(vatByRate).length > 0) {
        var vatRates = Object.keys(vatByRate).map(Number).sort(function (a, b) { return b - a; });
        vatRates.forEach(function (rate) {
          var vatLabel = typeof L.vatLine === 'function' ? L.vatLine(rate) : (L.vat21 || ('VAT (' + rate + '%)'));
          textAtContentRight(vatLabel + ': ' + Number(vatByRate[rate]).toFixed(2) + ' €', y);
          y += lhDetail(fontSizeSmall);
        });
      } else {
        textAtContentRight(L.vat21 + ': ' + Number(bill.totalVat || 0).toFixed(2) + ' €', y);
        y += lhDetail(fontSizeSmall);
      }
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(fontSize);
      textAtContentRight(L.totalWithVat + ': ' + Number(bill.totalGross || 0).toFixed(2) + ' €', y);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(fontSizeSmall);

      const footerLh = fontSizeSmall * 0.48;
      const footerLineGap = 6;
      const addressLines = company && company.legalAddress
        ? company.legalAddress.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean)
        : [];
      const bankLineCount = company ? (company.bankName ? 1 : 0) + (company.bankSwiftBic ? 1 : 0) + (company.bankAccount ? 1 : 0) : 0;
      const leftColLineCount = company ? 1 + addressLines.length + (company.registrationNumber ? 1 : 0) + (company.vatNumber ? 1 : 0) : 0;
      const rightColLineCount = bankLineCount;
      const footerBottomLineCount = company ? Math.max(leftColLineCount, rightColLineCount) : 0;
      const footerBottomHeight = footerBottomLineCount * footerLh;
      const footerLineWidth = ruleLineWidth;
      const footerGap = footerLineGap;
      const yContacts = pageH - margin - footerLh;
      const yBlockBottom = yContacts - footerGap - footerLineWidth - footerGap;
      const yFooterLine = yBlockBottom + footerGap;
      const yFooterBottom = yBlockBottom - footerBottomHeight;
      const footerColW = contentW / 3;
      const footerCol1 = left;
      const footerCol2 = left + footerColW;
      const footerCol2Center = left + footerColW + footerColW / 2;
      const footerCol3Right = contentRight;
      const atsauceGap = 6;
      const yAtsauce = yFooterBottom - atsauceGap - lh(fontSizeSmall);
      doc.text(L.electronicNotice, left + contentW / 2, yAtsauce, { align: 'center', maxWidth: contentW });

      if (company) {
        const yLeftStart = yBlockBottom - (leftColLineCount - 1) * footerLh;
        const yRightStart = yBlockBottom - (rightColLineCount - 1) * footerLh;

        doc.setFont(fontFamily, 'bold');
        doc.text(company.name, footerCol1, yLeftStart, { maxWidth: footerColW });
        let yLeft = yLeftStart + footerLh;
        doc.setFont(fontFamily, 'normal');
        addressLines.forEach(function (line) {
          doc.text(line, footerCol1, yLeft, { maxWidth: footerColW });
          yLeft += footerLh;
        });
        if (company.registrationNumber) {
          doc.text(L.regNr + ' ' + company.registrationNumber, footerCol1, yLeft, { maxWidth: footerColW });
          yLeft += footerLh;
        }
        if (company.vatNumber) {
          doc.text(L.vatNr + ' ' + company.vatNumber, footerCol1, yLeft, { maxWidth: footerColW });
          yLeft += footerLh;
        }

        let yRight = yRightStart;
        if (company.bankName) {
          doc.text(company.bankName, footerCol3Right, yRight, { align: 'right', maxWidth: footerColW });
          yRight += footerLh;
        }
        if (company.bankSwiftBic) {
          doc.text('SWIFT/BIC: ' + company.bankSwiftBic, footerCol3Right, yRight, { align: 'right', maxWidth: footerColW });
          yRight += footerLh;
        }
        if (company.bankAccount) {
          doc.text('IBAN: ' + company.bankAccount, footerCol3Right, yRight, { align: 'right', maxWidth: footerColW });
          yRight += footerLh;
        }
      }

      doc.setDrawColor(ruleLineColor[0], ruleLineColor[1], ruleLineColor[2]);
      doc.setLineWidth(footerLineWidth);
      doc.line(left, yFooterLine, contentRight, yFooterLine);
      doc.setDrawColor(0, 0, 0);

      if (company) {
        const contactParts = [company.email, company.website, company.phone].filter(Boolean);
        const n = contactParts.length;
        if (n === 1) {
          doc.text(contactParts[0], left + contentW / 2, yContacts, { align: 'center', maxWidth: contentW });
        } else if (n === 2) {
          doc.text(contactParts[0], left, yContacts, { maxWidth: contentW });
          doc.text(contactParts[1], contentRight, yContacts, { align: 'right', maxWidth: contentW });
        } else if (n >= 3) {
          doc.text(contactParts[0], left, yContacts, { maxWidth: contentW });
          doc.text(contactParts[1], left + contentW / 2, yContacts, { align: 'center', maxWidth: contentW });
          doc.text(contactParts[2], contentRight, yContacts, { align: 'right', maxWidth: contentW });
        }
      }

      const filename = (bill.number || 'reckins').replace(/\s/g, '-') + '.pdf';
      const blob = doc.output('blob');
      if (options && typeof options.asBlobCallback === 'function') {
        options.asBlobCallback(blob, filename);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }

    const row1Y = margin;
    const row1MinH = 8;
    doc.setFontSize(fontSizeTitle);
    doc.setFont(fontFamily, 'bold');

    const hasImageLogo = company && company.logoType === 'image' && company.logo;
    const hasTextLogo = company && company.logoType === 'text' && company.logoText;

    if (hasImageLogo) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const logoUrl = company.logo.startsWith('http') ? company.logo : (window.location.origin + company.logo);
      img.onload = function () {
        const maxW = 45;
        const maxH = 20;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxW || h > maxH) {
          const r = Math.min(maxW / w, maxH / h);
          w *= r;
          h *= r;
        }
        const maxPxW = 200;
        const maxPxH = 90;
        const scale = Math.min(maxPxW / img.naturalWidth, maxPxH / img.naturalHeight, 1);
        const pxW = Math.max(1, Math.round(img.naturalWidth * scale));
        const pxH = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = pxW;
        canvas.height = pxH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, pxW, pxH);
          try {
            const dataUrl = canvas.toDataURL('image/png');
            doc.addImage(dataUrl, 'PNG', left, row1Y, w, h);
          } catch (e) {
            doc.addImage(img, 'PNG', left, row1Y, w, h);
          }
        } else {
          doc.addImage(img, 'PNG', left, row1Y, w, h);
        }
        const row1H = Math.max(h, row1MinH);
        const textY = row1Y + row1H / 2 + 1.5;
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(fontSizeTitle);
        if (typeof doc.setCharacterSpacing === 'function') doc.setCharacterSpacing(0);
        textAtContentRight(L.invoiceTitle + ' ' + (bill.number || '—'), textY);
        drawContent(row1Y + row1H);
      };
      img.onerror = function () {
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(fontSizeTitle);
        if (typeof doc.setCharacterSpacing === 'function') doc.setCharacterSpacing(0);
        textAtContentRight(L.invoiceTitle + ' ' + (bill.number || '—'), row1Y + row1MinH / 2 + 1.5);
        drawContent(row1Y + row1MinH);
      };
      img.src = logoUrl;
    } else {
      const row1H = row1MinH;
      textAtContentRight(L.invoiceTitle + ' ' + (bill.number || '—'), row1Y + row1H / 2 + 1.5);
      if (hasTextLogo) {
        doc.text(company.logoText, left, row1Y + row1H / 2 + 1.5, { maxWidth: contentW });
      }
      drawContent(row1Y + row1H);
    }
  });
}

window.generateBillPdf = generateBillPdf;
