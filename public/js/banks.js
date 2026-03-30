/* Static bank list — grouped by country.
   swiftBic: typical 8-character BIC shown in the picker (public head-office / common codes).
   swiftPrefixes: used for auto-detection when SWIFT/BIC is entered.
   loginUrl: direct link to the bank's online banking login page.
*/
window.BANK_LIST = [
  // ── Latvia ──────────────────────────────────────────────────────────────────
  { id: 'swedbank-lv', name: 'Swedbank', legalName: 'Swedbank AS',        country: 'LV', loginUrl: 'https://ib.swedbank.lv/',             swiftBic: 'HABALV22', swiftPrefixes: ['HABALV'] },
  { id: 'seb-lv',      name: 'SEB',      legalName: 'AS SEB banka',       country: 'LV', loginUrl: 'https://ibanka.seb.lv/',              swiftBic: 'UNLALV2X', swiftPrefixes: ['UNLALV'] },
  { id: 'citadele-lv', name: 'Citadele', legalName: 'AS Citadele banka',  country: 'LV', loginUrl: 'https://online.citadele.lv/',         swiftBic: 'PARXLV22', swiftPrefixes: ['PARXLV'] },
  { id: 'luminor-lv',  name: 'Luminor',  legalName: 'Luminor Bank AS',    country: 'LV', loginUrl: 'https://online.luminor.lv/',          swiftBic: 'RIKOLV2X', swiftPrefixes: ['RIKOLV'] },
  { id: 'revolut-lv',  name: 'Revolut',  legalName: 'Revolut Bank UAB',   country: 'LV', loginUrl: 'https://app.revolut.com/',            swiftBic: 'REVOLT21', swiftPrefixes: ['REVOLT'] },

  // ── Lithuania ────────────────────────────────────────────────────────────────
  { id: 'swedbank-lt', name: 'Swedbank', legalName: 'Swedbank AB',        country: 'LT', loginUrl: 'https://ib.swedbank.lt/',             swiftBic: 'HABALT22', swiftPrefixes: ['HABALT'] },
  { id: 'seb-lt',      name: 'SEB',      legalName: 'AB SEB bankas',      country: 'LT', loginUrl: 'https://ib.seb.lt/',                  swiftBic: 'CBVILT2X', swiftPrefixes: ['CBVILT'] },
  { id: 'citadele-lt', name: 'Citadele', legalName: 'AB Citadele bankas', country: 'LT', loginUrl: 'https://online.citadele.lt/',         swiftBic: 'PARXLT22', swiftPrefixes: ['PARXLT'] },
  { id: 'luminor-lt',  name: 'Luminor',  legalName: 'Luminor Bank AS',    country: 'LT', loginUrl: 'https://online.luminor.lt/',          swiftBic: 'AGBLLT2X', swiftPrefixes: ['AGBLLT'] },
  { id: 'revolut-lt',  name: 'Revolut',  legalName: 'Revolut Bank UAB',   country: 'LT', loginUrl: 'https://app.revolut.com/',            swiftBic: 'REVOLT21', swiftPrefixes: ['REVOLT'] },

  // ── Estonia ──────────────────────────────────────────────────────────────────
  { id: 'swedbank-ee', name: 'Swedbank',  legalName: 'Swedbank AS',        country: 'EE', loginUrl: 'https://ib.swedbank.ee/',             swiftBic: 'HABAEE22', swiftPrefixes: ['HABAEE'] },
  { id: 'seb-ee',      name: 'SEB',       legalName: 'AS SEB Pank',        country: 'EE', loginUrl: 'https://e.seb.ee/',                   swiftBic: 'EEUHEE2X', swiftPrefixes: ['EEUHEE'] },
  { id: 'lhv-ee',      name: 'LHV',       legalName: 'AS LHV Pank',        country: 'EE', loginUrl: 'https://www.lhv.ee/internetbank/',    swiftBic: 'LHVBEE22', swiftPrefixes: ['LHVBEE'] },
  { id: 'luminor-ee',  name: 'Luminor',   legalName: 'Luminor Bank AS',    country: 'EE', loginUrl: 'https://online.luminor.ee/',          swiftBic: 'NDEAEE2X', swiftPrefixes: ['NDEAEE'] },
  { id: 'coop-ee',     name: 'Coop Pank', legalName: 'Coop Pank AS',       country: 'EE', loginUrl: 'https://i.cooppank.ee/',              swiftBic: 'EKRDEE22', swiftPrefixes: ['EKRDEE'] },
  { id: 'revolut-ee',  name: 'Revolut',   legalName: 'Revolut Bank UAB',   country: 'EE', loginUrl: 'https://app.revolut.com/',            swiftBic: 'REVOLT21', swiftPrefixes: ['REVOLT'] },

  // ── Germany ──────────────────────────────────────────────────────────────────
  { id: 'n26',         name: 'N26',           legalName: 'N26 Bank GmbH',      country: 'DE', loginUrl: 'https://app.n26.com/login',           swiftBic: 'NTSBDEB1', swiftPrefixes: ['NTSBDEB'] },
  { id: 'deutsche',    name: 'Deutsche Bank', legalName: 'Deutsche Bank AG',   country: 'DE', loginUrl: 'https://meine.deutsche-bank.de/',     swiftBic: 'DEUTDEFF', swiftPrefixes: ['DEUT'] },

  // ── France ───────────────────────────────────────────────────────────────────
  { id: 'bnp',         name: 'BNP Paribas', legalName: 'BNP Paribas SA',       country: 'FR', loginUrl: 'https://mabanque.bnpparibas.com/',    swiftBic: 'BNPAFRPP', swiftPrefixes: ['BNPA'] },

  // ── Netherlands ──────────────────────────────────────────────────────────────
  { id: 'ing',         name: 'ING',         legalName: 'ING Bank N.V.',        country: 'NL', loginUrl: 'https://mijn.ing.nl/',                swiftBic: 'INGBNL2A', swiftPrefixes: ['INGB'] },

  // ── Austria ───────────────────────────────────────────────────────────────────
  { id: 'raiffeisen',  name: 'Raiffeisen',  legalName: 'Raiffeisen Bank Intl', country: 'AT', loginUrl: 'https://mein.elba.raiffeisen.at/',    swiftBic: 'RZBAATWW', swiftPrefixes: ['RZOO', 'RLNW'] },

  // ── Italy ─────────────────────────────────────────────────────────────────────
  { id: 'unicredit',   name: 'UniCredit',   legalName: 'UniCredit S.p.A.',     country: 'IT', loginUrl: 'https://www.unicredit.it/it/privati.html', swiftBic: 'UNCRITMM', swiftPrefixes: ['UNCR'] },

  // ── Europe / international ────────────────────────────────────────────────────
  { id: 'wise',        name: 'Wise',     legalName: 'Wise Payments Limited', country: 'EU', loginUrl: 'https://wise.com/login',              swiftBic: 'TRWIGB22', swiftPrefixes: ['TRWI'] },
  { id: 'revolut-eu',  name: 'Revolut',  legalName: 'Revolut Bank UAB',      country: 'EU', loginUrl: 'https://app.revolut.com/',            swiftBic: 'REVOLT21', swiftPrefixes: ['REVOLT'] },

  // ── United Kingdom ────────────────────────────────────────────────────────────
  { id: 'barclays',    name: 'Barclays',    legalName: 'Barclays Bank UK PLC', country: 'GB', loginUrl: 'https://app.barclays.co.uk/',         swiftBic: 'BUKBGB22', swiftPrefixes: ['BUKB'] },
  { id: 'hsbc',        name: 'HSBC',        legalName: 'HSBC UK Bank PLC',     country: 'GB', loginUrl: 'https://www.hsbc.co.uk/',             swiftBic: 'MIDLGB22', swiftPrefixes: ['MIDL'] },
  { id: 'lloyds',      name: 'Lloyds',      legalName: 'Lloyds Bank PLC',      country: 'GB', loginUrl: 'https://online.lloydsbank.co.uk/',    swiftBic: 'LOYDGB2L', swiftPrefixes: ['LOYD'] },
  { id: 'natwest',     name: 'NatWest',     legalName: 'National Westminster Bank PLC', country: 'GB', loginUrl: 'https://www.natwest.com/', swiftBic: 'NWBKGB2L', swiftPrefixes: ['NWBK'] },
  { id: 'monzo',       name: 'Monzo',       legalName: 'Monzo Bank Ltd',       country: 'GB', loginUrl: 'https://monzo.com/',                  swiftBic: 'MONZGB2L', swiftPrefixes: ['MONZ'] },
  { id: 'revolut-gb',  name: 'Revolut',     legalName: 'Revolut Ltd',          country: 'GB', loginUrl: 'https://app.revolut.com/',            swiftBic: 'REVOGGB2', swiftPrefixes: ['REVOGB'] },
];

/* Country code → display name, in preferred display order */
window.BANK_COUNTRIES = {
  LV: 'Latvia',
  LT: 'Lithuania',
  EE: 'Estonia',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  AT: 'Austria',
  IT: 'Italy',
  EU: 'Europe / International',
  GB: 'United Kingdom',
};

/* SWIFT/BIC prefix → bank id lookup */
window.bankBySwift = function (bic) {
  if (!bic) return null;
  const upper = bic.toUpperCase();
  return window.BANK_LIST.find((b) =>
    (b.swiftPrefixes || []).some((p) => upper.startsWith(p.toUpperCase()))
  ) || null;
};
