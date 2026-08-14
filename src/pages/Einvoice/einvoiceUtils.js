/* ---- filter options ---- */
export const DATE_PRESETS = [
  'Past 1 Day',
  'Past 1 Week',
  'Past 1 Month',
  'Past 3 Months',
  'Custom Days',
];

export const STATUS_OPTIONS = ['Success', 'Failed', 'Pending', 'Resolved', 'Skipped'];

export const DOC_TYPE_OPTIONS = [
  { value: 'INVOICE', label: 'Tax Invoice' },
  { value: 'RETURN', label: 'Credit Note' },
  { value: 'ADVANCE', label: 'Advance Payment' },
];

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

export function presetRange(preset) {
  if (!preset || preset === 'Custom Days') return null;
  const to = new Date();
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