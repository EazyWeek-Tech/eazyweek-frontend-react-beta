// ─────────────────────────────────────────────────────────────────────────────
// E-INVOICE — shared frontend helpers (date parsing, presets, type/status maps).
// Used by both EInvoiceDashboard and EInvoiceDetailedReport.
// ─────────────────────────────────────────────────────────────────────────────

// Date filter dropdown — EXACT labels & order (TST-003).
export const DATE_PRESETS = [
  'Past 1 Day',
  'Past 1 Week',
  'Past 1 Month',
  'Past 3 Months',
  'Custom Days',
  'Active Financial Year',
];

// Status filter — EXACT three options (TST-016).
export const STATUS_OPTIONS = ['Success', 'Failed', 'Resolved'];

// Invoice Type filter — EXACT dropdown labels (TST-025).
// value = internal type key, label = dropdown text.
export const INVOICE_TYPE_OPTIONS = [
  { value: 'Tax Invoice', label: 'Tax Invoice' },
  { value: 'Sales Return', label: 'SalesReturn' },
  { value: 'Prepayment Invoice', label: 'Advance Payment' },
];

// Parse a dd/MM/yyyy string (backend CONVERT style 103) into a Date (date-only).
export function parseInvoiceDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  // Accept dd/MM/yyyy (primary), fall back to native parse for ISO etc.
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Strip a Date down to local midnight for inclusive date-only comparisons.
export function atMidnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function todayMidnight() {
  return atMidnight(new Date());
}

// Convert a preset label into an inclusive {from, to} range (both Date, midnight).
// Custom Days returns null — the caller supplies from/to from the date inputs.
export function presetRange(preset) {
  if (!preset || preset === 'Custom Days') return null;
  const to = todayMidnight();
  const from = new Date(to);
  switch (preset) {
    case 'Past 1 Day': from.setDate(from.getDate() - 1); break;
    case 'Past 1 Week': from.setDate(from.getDate() - 7); break;
    case 'Past 1 Month': from.setDate(from.getDate() - 30); break;
    case 'Past 3 Months': from.setDate(from.getDate() - 90); break;
    case 'Active Financial Year': from.setDate(from.getDate() - 365); break;
    default: return null;
  }
  return { from, to };
}

// Validate a Custom Days range. Returns an error string or '' when valid.
// Rules: no future dates (TST-012); To >= From (TST-010); same day allowed (TST-011).
export function validateCustomRange(fromStr, toStr) {
  if (!fromStr || !toStr) return 'Please select both From Date and To Date';
  const from = atMidnight(new Date(fromStr));
  const to = atMidnight(new Date(toStr));
  const today = todayMidnight();
  if (from > today || to > today) return 'Future date not allowed';
  if (to < from) return 'To Date must be after From Date';
  return '';
}

// Resolve an invoice's displayed Invoice Type label (TST-033/034/035).
// Prefers the backend dType code (INV/CRN/RECEIPT); falls back to zakatInvoiceType
// (Sales/Return/Advance) or the raw TRANSTYPE.
export function invoiceTypeLabel(inv) {
  const code = (inv.dType || '').toUpperCase();
  if (code === 'INV') return 'Tax Invoice';
  if (code === 'CRN') return 'Sales Return';
  if (code === 'RECEIPT') return 'Prepayment Invoice';

  const t = (inv.zakatInvoiceType || '').toLowerCase();
  if (t === 'sales') return 'Tax Invoice';
  if (t === 'return') return 'Sales Return';
  if (t === 'advance') return 'Prepayment Invoice';
  return inv.zakatInvoiceType || '—';
}

// CSS modifier for the Invoice Type badge.
export function invoiceTypeClass(label) {
  if (label === 'Tax Invoice') return 'type-tax';
  if (label === 'Sales Return') return 'type-return';
  if (label === 'Prepayment Invoice') return 'type-prepay';
  return '';
}

// Normalise the status string to one of Success / Failed / Resolved.
export function normStatus(inv) {
  return (inv.einvoiceStatus || inv.status || '').trim();
}

// CSS modifier for the Status badge (Success=green, Failed=red, Resolved=amber).
export function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'success') return 'success';
  if (s === 'failed' || s === 'failure') return 'failed';
  if (s === 'resolved') return 'resolved';
  return '';
}

// Format an amount as SAR (project currency).
export function formatSAR(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = Number(amount);
  if (isNaN(n)) return String(amount);
  return `SAR ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Build a single lowercase string of all searchable fields for substring search.
export function searchableString(inv) {
  return [
    inv.clinicName,
    inv.customerName,
    inv.posInvoiceNo,
    inv.zakatInvoiceNo,
    inv.resolvedInvoiceNo,
    invoiceTypeLabel(inv),
    inv.amount,
    normStatus(inv),
    inv.remarks,
    inv.custID,
  ]
    .filter((v) => v !== null && v !== undefined && v !== '')
    .join(' ')
    .toLowerCase();
}