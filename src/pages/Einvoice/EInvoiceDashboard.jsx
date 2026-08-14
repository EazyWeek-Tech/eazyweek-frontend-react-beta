import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';
import { usePermissions } from '../Settings/usePermissions';
import {
  DATE_PRESETS,
  STATUS_OPTIONS,
  DOC_TYPE_OPTIONS,
  presetRange,
  validateRange,
  docTypeLabel,
  docTypeClass,
  statusClass,
  formatSAR,
  apiRequest,
  openPdf,
} from './einvoiceUtils';

const PERM_VIEW = 'EINV.VIEW';
const PERM_MANAGE = 'EINV.MANAGE';

const EInvoiceDashboard = ({ onOpenDetail, onOpenPrint }) => {
  const perms = usePermissions() || {};
  const hasPerm = perms.hasPermission;
  const canView = typeof hasPerm === 'function' ? hasPerm(PERM_VIEW) : true;
  const canManage = typeof hasPerm === 'function' ? hasPerm(PERM_MANAGE) : true;

  /* ---- filters ---- */
  const [datePreset, setDatePreset] = useState('Past 1 Month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('');
  const [docType, setDocType] = useState('');
  const [centreCode, setCentreCode] = useState('');
  const [search, setSearch] = useState('');
  const [dateError, setDateError] = useState('');

  /* ---- data ---- */
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [centres, setCentres] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  /* ---- actions ---- */
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [resolveFor, setResolveFor] = useState(null);
  const [resolveNo, setResolveNo] = useState('');
  const [resolveRemarks, setResolveRemarks] = useState('');

  const requestSeq = useRef(0);

  const showToast = useCallback((message, kind = 'info') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ---- effective date range ---- */
  const range = useMemo(
    () => (datePreset === 'Custom Days' ? { from: fromDate, to: toDate } : presetRange(datePreset)),
    [datePreset, fromDate, toDate]
  );

  useEffect(() => {
    if (datePreset !== 'Custom Days') {
      setDateError('');
      return;
    }
    setDateError(fromDate && toDate ? validateRange(fromDate, toDate) : '');
  }, [datePreset, fromDate, toDate]);

  /* ---- load ---- */
  const handleRefresh = async (row) => {
    setBusy(true);
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Legacy/Refresh`, {
        method: 'POST',
        body: JSON.stringify({ ids: [row.id] }),
      });
      const outcome = (json.data || [])[0] || {};
      showToast(outcome.message || json.message, outcome.ok ? 'success' : 'error');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async (row) => {
    try {
      await openPdf(`${API_BASE_URL}/api/EInvoice/Legacy/Print/${encodeURIComponent(row.id)}`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const load = useCallback(async () => {
    if (datePreset === 'Custom Days' && (dateError || !fromDate || !toDate)) return;

    const seq = ++requestSeq.current;
    setLoading(true);
    setLoadError('');
    try {
      const body = {
        fromDate: range ? range.from : null,
        toDate: range ? range.to : null,
        status: status || null,
        docType: docType || null,
        centreCode: centreCode || null,
        search: search.trim() || null,
        page,
        limit,
      };
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Legacy/List`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (seq !== requestSeq.current) return;
      setRows(Array.isArray(json.data) ? json.data : []);
      setTotal((json.meta && json.meta.total) || 0);

    } catch (err) {
      if (seq !== requestSeq.current) return;
      setRows([]);
      setTotal(0);
      setLoadError(err.message);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [datePreset, dateError, fromDate, toDate, range, status, docType, centreCode, search, page, limit]);

  useEffect(() => {
    if (!canView) return undefined;
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [canView, load]);

  useEffect(() => {
    if (!canView) return;
    apiRequest(`${API_BASE_URL}/api/EInvoice/Centre`)
      .then((json) => setCentres(Array.isArray(json.data) ? json.data : []))
      .catch(() => setCentres([]));
  }, [canView]);

  useEffect(() => {
    setPage(1);
  }, [datePreset, fromDate, toDate, status, docType, centreCode, search, limit]);

  /* ---- resolve ---- */
  const openResolve = (row) => {
    setResolveFor(row);
    setResolveNo(row.resolvedInvoiceNo || '');
    setResolveRemarks('');
  };

  const submitResolve = async () => {
    if (!resolveNo.trim()) return;
    setBusy(true);
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Resolve`, {
        method: 'POST',
        body: JSON.stringify({
          recId: resolveFor.id,
          resolvedInvoiceNo: resolveNo.trim(),
          remarks: resolveRemarks.trim() || null,
        }),
      });
      showToast(json.message, 'success');
      setResolveFor(null);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!canView) {
    return (
      <div className="einvoice-page">
        <div className="einvoice-empty">
          <h2>No access to e-invoices</h2>
          <p>Ask an administrator to grant you the E-Invoice view permission.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIdx = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);
  const failedCount = rows.filter((r) => r.einvoiceStatus === 'Failed').length;

  return (
    <div className="einvoice-page">
      {/* ---- header ---- */}
      <div className="einvoice-head">
        <div>
          <h1>E-Invoices</h1>
          <p className="einvoice-sub">Documents reported to ZATCA through ClearTax</p>
        </div>
      </div>

      {failedCount > 0 && (
        <div className="einvoice-banner">
          {failedCount} document{failedCount === 1 ? '' : 's'} on this page did not reach ZATCA. Select
          and retry, or open one to see what ClearTax returned.
        </div>
      )}

      {/* ---- filters ---- */}
      <div className="einvoice-filters">
        <div className="fld">
          <label htmlFor="einv-period">Period</label>
          <select id="einv-period" value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
            {DATE_PRESETS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {datePreset === 'Custom Days' && (
          <>
            <div className="fld">
              <label htmlFor="einv-from">From</label>
              <input
                id="einv-from"
                type="date"
                value={fromDate}
                className={dateError ? 'input-error' : ''}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="fld">
              <label htmlFor="einv-to">To</label>
              <input
                id="einv-to"
                type="date"
                value={toDate}
                className={dateError ? 'input-error' : ''}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="fld">
          <label htmlFor="einv-status">Status</label>
          <select id="einv-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="fld">
          <label htmlFor="einv-type">Document type</label>
          <select id="einv-type" value={docType} onChange={(e) => setDocType(e.target.value)}>
            <option value="">All</option>
            {DOC_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="fld">
          <label htmlFor="einv-centre">Centre</label>
          <select id="einv-centre" value={centreCode} onChange={(e) => setCentreCode(e.target.value)}>
            <option value="">All</option>
            {centres.map((c) => (
              <option key={c.CENTERCODE} value={c.CENTERCODE}>{c.CLINICNAME || c.CENTERCODE}</option>
            ))}
          </select>
        </div>

        <div className="fld fld-grow">
          <label htmlFor="einv-search">Search</label>
          <input
            id="einv-search"
            type="text"
            value={search}
            placeholder="Invoice number, ZATCA number, customer"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {dateError && <p className="einvoice-error">{dateError}</p>}

      {/* ---- toolbar ---- */}
      <div className="einvoice-toolbar">
        <div className="toolbar-left">
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} aria-label="Rows per page">
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>
      </div>

      {/* ---- grid ---- */}
      <div className="einvoice-table-wrap">
        <table className="einvoice-table">
          <thead>
            <tr>
              <th>Centre</th>
              <th>Invoice date</th>
              <th>Customer</th>
              <th>Invoice no</th>
              <th>ZATCA no</th>
              <th>Type</th>
              <th className="col-amount">Amount</th>
              <th>Status</th>
              <th>Details</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="row-message">Loading e-invoices…</td></tr>
            ) : loadError ? (
              <tr><td colSpan={10} className="row-message row-error">{loadError}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="row-message">No e-invoices in this period.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.clinicName || row.centerCode}</td>
                  <td>{row.invoiceDate || '—'}</td>
                  <td>{row.customerName || '—'}</td>
                  <td>{row.posInvoiceNo || '—'}</td>
                  <td>{row.zakatInvoiceNo || '—'}</td>
                  <td>
                    <span className={`type-badge ${docTypeClass(row.dType)}`}>{docTypeLabel(row.dType)}</span>
                  </td>
                  <td className="col-amount">{formatSAR(row.amount)}</td>
                  <td>
                    <span className={`status ${statusClass(row.einvoiceStatus)}`}>{row.einvoiceStatus}</span>
                    {row.attempts > 1 && <span className="attempts" style={{display:'none'}}>{row.attempts} attempts</span>}
                  </td>
                  <td className="col-remarks" title={row.remarks || ''}>{row.remarks || '—'}</td>
                  <td className="col-actions">
                    {canManage && (
                      <button type="button" className="btn-link" onClick={() => onOpenDetail(row.id)} style={{display: 'none'}}>
                        Open
                      </button>
                    )}
                    {canManage && row.einvoiceStatus === 'Failed' && (
                      <button
                        type="button"
                        className="btn-link"
                        disabled={busy}
                        onClick={() => handleRefresh(row)}>
                        Refresh
                      </button>
                    )}
                    {row.einvoiceStatus === 'Success' && (
                      <button type="button" className="btn-link" onClick={() => handlePrint(row)}>
                        Print
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---- pagination ---- */}
      <div className="einvoice-pager">
        <span>{total === 0 ? 'No results' : `Showing ${startIdx}–${endIdx} of ${total}`}</span>
        <div className="pager-controls">
          <button type="button" onClick={() => setPage(1)} disabled={page === 1}>First</button>
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </button>
          <span className="pager-position">Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}>
            Next
          </button>
          <button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last</button>
        </div>
      </div>

      {/* ---- resolve dialog ---- */}
      {resolveFor && (
        <div className="einvoice-overlay" role="dialog" aria-modal="true" aria-label="Mark as resolved">
          <div className="einvoice-dialog">
            <h2>Mark as resolved</h2>
            <p className="dialog-note">
              Record the number this document was finally reported under, outside EazyWeek.
              This does not resubmit anything to ZATCA.
            </p>
            <div className="fld">
              <label htmlFor="resolve-no">Reported invoice number</label>
              <input
                id="resolve-no"
                type="text"
                value={resolveNo}
                onChange={(e) => setResolveNo(e.target.value)}
                autoFocus
              />
            </div>
            <div className="fld">
              <label htmlFor="resolve-remarks">Notes</label>
              <textarea
                id="resolve-remarks"
                rows={3}
                value={resolveRemarks}
                onChange={(e) => setResolveRemarks(e.target.value)}
              />
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn-ghost" onClick={() => setResolveFor(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                disabled={!resolveNo.trim() || busy}
                onClick={submitResolve}>
                Mark as resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`einvoice-toast ${toast.kind}`}>{toast.message}</div>}
    </div>
  );
};

export default EInvoiceDashboard;