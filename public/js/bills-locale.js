(function (global) {
  const BILLS_LOCALE = {
    lv: {
      date: 'Datums',
      supplyDate: 'Piegādes datums',
      paymentDue: 'Apmaksas termiņš',
      regNr: 'Reģ. nr.',
      vatNr: 'PVN nr.',
      tableDescription: 'Nosaukums',
      tableQty: 'Daudzums',
      tablePrice: 'Cena',
      tableTotal: 'Kopā',
      discount: 'Atlaide',
      subtotalBeforeDiscount: 'Summa bez PVN (pirms atlaides)',
      itemDiscounts: 'Atlaides pa pozīcijām',
      discountPct: 'Atlaide',
      subtotalNoVat: 'Summa bez PVN',
      vat21: 'PVN (21%)',
      vatLine: function (rate) { return 'PVN (' + rate + '%)'; },
      totalWithVat: 'Kopā ar PVN',
      electronicNotice: 'Šis rēķins ir izveidots elektroniski un ir derīgs bez paraksta.',
      invoiceTitle: 'Rēķins',
      unit: function (unit, qty) {
        const n = Math.abs(parseFloat(qty)) || 0;
        const mod10 = n % 10;
        const mod100 = n % 100;
        const singular = mod10 === 1 && mod100 !== 11;
        if (unit === 'hour') return singular ? 'stunda' : 'stundas';
        if (unit === 'service') return singular ? 'pakalpojums' : 'pakalpojumi';
        return singular ? 'gabals' : 'gabali';
      }
    },
    en: {
      date: 'Date',
      supplyDate: 'Supply date',
      paymentDue: 'Due date',
      regNr: 'Reg. no.',
      vatNr: 'VAT no.',
      tableDescription: 'Description',
      tableQty: 'Qty',
      tablePrice: 'Price',
      tableTotal: 'Total',
      discount: 'Discount',
      subtotalBeforeDiscount: 'Subtotal before discount',
      itemDiscounts: 'Item discounts',
      discountPct: 'Discount',
      subtotalNoVat: 'Subtotal (excl. VAT)',
      vat21: 'VAT (21%)',
      vatLine: function (rate) { return 'VAT (' + rate + '%)'; },
      totalWithVat: 'Total (incl. VAT)',
      electronicNotice: 'This invoice was created electronically and is valid without a signature.',
      invoiceTitle: 'Invoice',
      unit: function (unit, qty) {
        const n = Math.abs(parseFloat(qty)) || 0;
        if (unit === 'hour') return n === 1 ? 'hour' : 'hours';
        if (unit === 'service') return n === 1 ? 'service' : 'services';
        return n === 1 ? 'pc' : 'pcs';
      }
    },
    ru: {
      date: 'Дата',
      supplyDate: 'Дата поставки',
      paymentDue: 'Срок оплаты',
      regNr: 'Рег. №',
      vatNr: 'НДС №',
      tableDescription: 'Наименование',
      tableQty: 'Кол-во',
      tablePrice: 'Цена',
      tableTotal: 'Всего',
      discount: 'Скидка',
      subtotalBeforeDiscount: 'Сумма без НДС (до скидки)',
      itemDiscounts: 'Скидки по позициям',
      discountPct: 'Скидка',
      subtotalNoVat: 'Сумма без НДС',
      vat21: 'НДС (21%)',
      vatLine: function (rate) { return 'НДС (' + rate + '%)'; },
      totalWithVat: 'Всего с НДС',
      electronicNotice: 'Настоящий счёт создан в электронном виде и действителен без подписи.',
      invoiceTitle: 'Счёт',
      unit: function (unit, qty) {
        const n = Math.abs(parseFloat(qty)) || 0;
        const mod10 = n % 10;
        const mod100 = n % 100;
        const singular = mod10 === 1 && mod100 !== 11;
        if (unit === 'hour') return singular ? 'час' : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? 'часа' : 'часов';
        if (unit === 'service') return singular ? 'услуга' : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? 'услуги' : 'услуг';
        return singular ? 'шт.' : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? 'шт.' : 'шт.';
      }
    }
  };

  function getBillsLabels(locale) {
    const code = (locale && BILLS_LOCALE[locale]) ? locale : 'en';
    return BILLS_LOCALE[code];
  }

  global.BILLS_LOCALE = BILLS_LOCALE;
  global.getBillsLabels = getBillsLabels;
})(typeof window !== 'undefined' ? window : this);
