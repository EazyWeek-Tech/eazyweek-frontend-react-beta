/* ---- filter options ---- */
export const DATE_PRESETS = [
  'Current Date',
  'Past 1 Day',
  'Past 1 Week',
  'Past 1 Month',
  'Past 3 Months',
  'Active Financial Year',
  'Custom Days',
];

export const FY_START_MONTH = 1;

export const STATUS_OPTIONS = ['Success', 'Failed', 'Resolved'];

export const DOC_TYPE_OPTIONS = [
  { value: 'INVOICE', label: 'Tax Invoice' },
  { value: 'RETURN', label: 'Credit Note' },
  { value: 'ADVANCE', label: 'Advance Payment' },
];

export const INVOICE_TYPE_OPTIONS = DOC_TYPE_OPTIONS;

export const SOURCE_OPTIONS = [
  { value: 'ZENOTI', label: 'Zenoti' },
  { value: 'EAZYWEEK', label: 'EazyWeek' },
  { value: 'BOTH', label: 'Both (parallel run)' },
];

/* ---- dates ---- */
export function toInputDate(date) {
  const pad = (v) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function financialYearStart(today = new Date()) {
  const startMonthIndex = Math.min(12, Math.max(1, Number(FY_START_MONTH) || 1)) - 1;
  const start = new Date(today.getFullYear(), startMonthIndex, 1);
  if (start > today) start.setFullYear(start.getFullYear() - 1);
  return start;
}

export function presetRange(preset) {
  if (!preset || preset === 'Custom Days') return null;
  const to = new Date();
  if (preset === 'Current Date') {
    const today = toInputDate(to);
    return { from: today, to: today };
  }
  if (preset === 'Active Financial Year') {
    return { from: toInputDate(financialYearStart(to)), to: toInputDate(to) };
  }
  const from = new Date(to);
  if (preset === 'Past 1 Day') from.setDate(from.getDate() - 1);
  else if (preset === 'Past 1 Week') from.setDate(from.getDate() - 7);
  else if (preset === 'Past 1 Month') from.setMonth(from.getMonth() - 1);
  else if (preset === 'Past 3 Months') from.setMonth(from.getMonth() - 3);
  else return null;
  return { from: toInputDate(from), to: toInputDate(to) };
}

export function validateRange(fromStr, toStr) {
  if (!fromStr || !toStr) return 'Select both a from and a to date';
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const today = new Date(toInputDate(new Date()));
  if (from > today || to > today) return 'Dates cannot be in the future';
  if (to < from) return 'The to date must be on or after the from date';
  return '';
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ---- display ---- */
export function docTypeLabel(value) {
  const match = DOC_TYPE_OPTIONS.find((o) => o.value === value);
  return match ? match.label : value || '—';
}

export function docTypeClass(value) {
  if (value === 'INVOICE') return 'type-tax';
  if (value === 'RETURN') return 'type-return';
  if (value === 'ADVANCE') return 'type-prepay';
  return '';
}

const ZAKAT_TYPE_TO_CODE = {
  invoice: 'INVOICE',
  advance: 'ADVANCE',
  return: 'RETURN',
};

export function invoiceTypeCode(input) {
  if (!input) return '';
  if (typeof input === 'string') {
    const direct = String(input).trim();
    const upper = direct.toUpperCase();
    if (DOC_TYPE_OPTIONS.some((o) => o.value === upper)) return upper;
    return ZAKAT_TYPE_TO_CODE[direct.toLowerCase()] || '';
  }
  return (
    invoiceTypeCode(input.dType) ||
    invoiceTypeCode(input.invoiceType) ||
    invoiceTypeCode(input.zakatInvoiceType) ||
    ''
  );
}

export function invoiceTypeLabel(input) {
  const code = invoiceTypeCode(input);
  if (code) return docTypeLabel(code);
  if (typeof input === 'string') return input || '—';
  return (input && (input.zakatInvoiceType || input.invoiceType)) || '—';
}

export function normStatus(input) {
  if (!input) return '';
  const raw =
    typeof input === 'string'
      ? input
      : input.einvoiceStatus || input.status || input.zakatStatusText || '';
  const value = String(raw).trim();
  if (!value) return '';
  const match = STATUS_OPTIONS.find((s) => s.toLowerCase() === value.toLowerCase());
  return match || value;
}

export function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success') return 'success';
  if (s === 'failed') return 'failed';
  if (s === 'resolved') return 'resolved';
  if (s === 'pending') return 'pending';
  if (s === 'skipped') return 'skipped';
  return '';
}

export function formatSAR(amount) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return `SAR ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function prettyJson(value) {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch (err) {
    return String(value);
  }
}

/* ---- entity vs centre ---- */
export const ENTITY_CENTRE_CODES = ['CENTRIQ CLINICS'];

export function isEntityCentre(code) {
  const value = String(code || '').trim().toUpperCase();
  if (!value) return false;
  return ENTITY_CENTRE_CODES.indexOf(value) !== -1;
}

export function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const nested = [payload.data, payload.rows, payload.result, payload.records, payload.recordset];
  for (let i = 0; i < nested.length; i += 1) {
    const value = nested[i];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const inner = [value.rows, value.data, value.recordset, value.records];
      for (let k = 0; k < inner.length; k += 1) {
        if (Array.isArray(inner[k])) return inner[k];
      }
    }
  }
  return [];
}

/* ---- centre name resolution ---- */
const CENTRE_CODE_KEYS = ['CENTERCODE', 'CENTRECODE', 'centerCode', 'centreCode', 'CenterCode', 'CentreCode', 'code'];
const CENTRE_NAME_KEYS = ['CLINICNAME', 'CENTRENAME', 'CENTERNAME', 'CENTREDESC', 'clinicName', 'centreName', 'centerName', 'name'];
const CENTRE_NAME_STORAGE_KEYS = [
  'centreName', 'centrename', 'CentreName', 'CENTRENAME',
  'centerName', 'CENTERNAME', 'clinicName', 'CLINICNAME',
  'currentCentreName', 'selectedCentreName', 'centreDisplayName', 'LoginCentreName',
];

export const pickField = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return '';
};

export const centreCodeOf = (c) => pickField(c, CENTRE_CODE_KEYS);
export const centreNameOf = (c) => pickField(c, CENTRE_NAME_KEYS);

export const sameCode = (a, b) =>
  Boolean(a) && Boolean(b) && String(a).trim().toUpperCase() === String(b).trim().toUpperCase();

export const findCentreByCode = (list, code) =>
  (Array.isArray(list) ? list : []).find((c) => sameCode(centreCodeOf(c), code)) || null;

const safeGet = (fn) => {
  try { return fn(); } catch (e) { return null; }
};

const webStores = () =>
  [safeGet(() => window.sessionStorage), safeGet(() => window.localStorage)].filter(Boolean);

const scanForCentreName = (node, code, depth) => {
  if (!node || depth > 4) return '';
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = scanForCentreName(item, code, depth + 1);
      if (hit) return hit;
    }
    return '';
  }
  if (typeof node !== 'object') return '';
  if (sameCode(centreCodeOf(node), code)) {
    const name = centreNameOf(node);
    if (name && !sameCode(name, code)) return name;
  }
  for (const key of Object.keys(node)) {
    const hit = scanForCentreName(node[key], code, depth + 1);
    if (hit) return hit;
  }
  return '';
};

export const storedCentreName = (code) => {
  if (!code) return '';
  for (const store of webStores()) {
    for (const key of CENTRE_NAME_STORAGE_KEYS) {
      const value = safeGet(() => store.getItem(key));
      if (value && value.trim() && !sameCode(value, code)) return value.trim();
    }
  }
  for (const store of webStores()) {
    const count = safeGet(() => store.length) || 0;
    for (let i = 0; i < count; i += 1) {
      const raw = safeGet(() => store.getItem(store.key(i)));
      if (!raw) continue;
      const head = raw.trim().charAt(0);
      if (head !== '{' && head !== '[') continue;
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) { continue; }
      const hit = scanForCentreName(parsed, code, 0);
      if (hit) return hit;
    }
  }
  return '';
};

export const resolveCentreName = (list, code) => {
  if (!code) return '';
  const match = findCentreByCode(list, code);
  const fromList = match ? centreNameOf(match) : '';
  if (fromList && !sameCode(fromList, code)) return fromList;
  return storedCentreName(code) || code;
};

export function findCentre(centres, code) {
  const key = String(code || '').trim().toUpperCase();
  if (!key || !Array.isArray(centres)) return null;
  const fields = ['CENTERCODE', 'CLINICNAME', 'CNAME', 'BRANCH'];
  return (
    centres.find((c) =>
      fields.some((f) => String((c && c[f]) || '').trim().toUpperCase() === key)
    ) || null
  );
}

/* ---- session centre ---- */
const CENTRE_KEYS = [
  'centerCode',
  'centreCode',
  'CENTERCODE',
  'activeCenterCode',
  'activeCentreCode',
  'currentCenterCode',
  'centercode',
];

const SESSION_USER_KEYS = ['user', 'userDetails', 'loginUser', 'authUser', 'userInfo'];

function readableStores() {
  const stores = [];
  try {
    if (typeof sessionStorage !== 'undefined') stores.push(sessionStorage);
  } catch (err) {}
  try {
    if (typeof localStorage !== 'undefined') stores.push(localStorage);
  } catch (err) {}
  return stores;
}

function usableValue(value) {
  const v = value === null || value === undefined ? '' : String(value).trim();
  if (!v || v === 'null' || v === 'undefined') return '';
  return v;
}

export function getCurrentCentreCode() {
  const stores = readableStores();

  for (let i = 0; i < stores.length; i += 1) {
    for (let k = 0; k < CENTRE_KEYS.length; k += 1) {
      const found = usableValue(stores[i].getItem(CENTRE_KEYS[k]));
      if (found) return found;
    }
  }

  for (let i = 0; i < stores.length; i += 1) {
    for (let u = 0; u < SESSION_USER_KEYS.length; u += 1) {
      const raw = stores[i].getItem(SESSION_USER_KEYS[u]);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
          for (let k = 0; k < CENTRE_KEYS.length; k += 1) {
            const found = usableValue(obj[CENTRE_KEYS[k]]);
            if (found) return found;
          }
        }
      } catch (err) {}
    }
  }

  return '';
}

/* ---- centre hierarchy ---- */
export function groupCentresByZone(list) {
  const groups = [];
  const index = new Map();
  (Array.isArray(list) ? list : []).forEach((c) => {
    const zone = String((c && c.ZONE) || '').trim();
    if (!index.has(zone)) {
      const entry = { zone, clinics: [] };
      index.set(zone, entry);
      groups.push(entry);
    }
    index.get(zone).clinics.push(c);
  });
  return groups;
}

export async function fetchCentreOptions(apiBase) {
  try {
    const json = await apiRequest(`${apiBase}/api/Settings/Centre/Hierarchy`);
    const data = (json && json.data) || {};
    const zones = Array.isArray(data.zones) ? data.zones : [];
    const centres = [];
    zones.forEach((z) => {
      const zoneName = String((z && z.zone) || '').trim();
      (Array.isArray(z && z.clinics) ? z.clinics : []).forEach((c) => {
        const code = centreCodeOf(c);
        if (!code || c.isEntity) return;
        centres.push({ CENTERCODE: code, CLINICNAME: centreNameOf(c) || code, ZONE: zoneName });
      });
    });
    if (centres.length > 0) {
      const entity = data.entity || null;
      return {
        entityCode: entity ? centreCodeOf(entity) : '',
        entityName: entity ? centreNameOf(entity) : '',
        centres,
      };
    }
  } catch (err) {}

  const fallback = await apiRequest(`${apiBase}/api/EInvoice/Centre`);
  const centres = extractList(fallback)
    .map((c) => ({
      CENTERCODE: centreCodeOf(c),
      CLINICNAME: centreNameOf(c) || centreCodeOf(c),
      ZONE: '',
    }))
    .filter((c) => c.CENTERCODE);
  return { entityCode: '', entityName: '', centres };
}

/* ---- transport ---- */
const TOKEN = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token') || '';

export async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN()}`,
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (err) {
    throw new Error(`Server returned a non-JSON response (HTTP ${response.status})`);
  }

  if (!response.ok || (body && body.success === false)) {
    throw new Error((body && body.message) || `Request failed (HTTP ${response.status})`);
  }
  return body;
}

/* ---- binary fetch (ClearTax print) ---- */
export async function openPdf(url) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Could not load the print (HTTP ${response.status})`;
    try {
      const body = JSON.parse(text);
      if (body && body.message) message = body.message;
    } catch (err) {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const opened = window.open(objectUrl, '_blank');
  if (!opened) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('The print was blocked by the browser. Allow pop-ups for this site.');
  }
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}