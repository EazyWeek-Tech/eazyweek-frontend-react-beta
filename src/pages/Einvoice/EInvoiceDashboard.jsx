import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';
import { usePermissions } from '../Settings/usePermissions';
import SearchableDropdown from './SearchableDropdown';
import {
  DATE_PRESETS,
  STATUS_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  presetRange,
  validateRange,
  invoiceTypeLabel,
  docTypeClass,
  statusClass,
  formatSAR,
  apiRequest,
  openPdf,
  getCurrentCentreCode,
  isEntityCentre,
  findCentreByCode,
  centreCodeOf,
  centreNameOf,
  resolveCentreName,
  fetchCentreOptions,
  sameCode,
} from './einvoiceUtils';

const PERM_VIEW = 'EINV.VIEW';
const PERM_MANAGE = 'EINV.MANAGE';
const REFRESH_ROLES = ['admin', 'manager'];
const REFRESH_BATCH_SIZE = 50;
const DEFAULT_PERIOD = 'Current Date';

function isRefreshable(row) {
  if (!row || row.einvoiceStatus !== 'Failed') return false;
  return String(row.zakatInvoiceNo || '').trim() === '';
}

function refreshRoleAllowed(perms) {
  const names = [];
  if (perms.role) names.push(perms.role);
  if (perms.roleName) names.push(perms.roleName);
  if (perms.roleCode) names.push(perms.roleCode);
  if (Array.isArray(perms.roles)) {
    perms.roles.forEach((r) => {
      if (typeof r === 'string') names.push(r);
      else if (r) names.push(r.ROLENAME || r.roleName || r.name || r.ROLECODE || r.roleCode);
    });
  }
  const flat = names.filter(Boolean).map((v) => String(v).toLowerCase());
  if (flat.length === 0) return null;
  return flat.some((n) => REFRESH_ROLES.some((allowed) => n.indexOf(allowed) !== -1));
}

const EInvoiceDashboard = ({ onOpenDetail, onOpenPrint }) => {
  const perms = usePermissions() || {};
  const hasPerm = perms.hasPermission;
  const canView = typeof hasPerm === 'function' ? hasPerm(PERM_VIEW) : true;
  const canManage = typeof hasPerm === 'function' ? hasPerm(PERM_MANAGE) : true;
  const roleAllowed = refreshRoleAllowed(perms);
  const canRefresh = canManage && (roleAllowed === null ? true : roleAllowed);

  /* ---- filters ---- */
  const [datePreset, setDatePreset] = useState(DEFAULT_PERIOD);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('');
  const [docType, setDocType] = useState('');
  const [selectedCentres, setSelectedCentres] = useState([]);
  const [search, setSearch] = useState('');
  const [dateError, setDateError] = useState('');

  /* ---- data ---- */
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [centres, setCentres] = useState([]);
  const [centreError, setCentreError] = useState('');
  const [entityCode, setEntityCode] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  /* ---- KPI summary (counts + amounts, generated in the selected period) ---- */
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const summarySeq = useRef(0);

  /* ---- actions ---- */
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [resolveFor, setResolveFor] = useState(null);
  const [resolveNo, setResolveNo] = useState('');
  const [resolveRemarks, setResolveRemarks] = useState('');

  const requestSeq = useRef(0);
  const sessionCentre = useMemo(() => getCurrentCentreCode(), []);
  const entityLevel =
    !sessionCentre || isEntityCentre(sessionCentre) || sameCode(entityCode, sessionCentre);

  const showToast = useCallback((message, kind = 'info') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ---- effective centre ---- */
  const sessionCentreMatch = useMemo(
    () => (entityLevel ? null : findCentreByCode(centres, sessionCentre)),
    [centres, sessionCentre, entityLevel]
  );
  const effectiveCentre = sessionCentreMatch
    ? centreCodeOf(sessionCentreMatch)
    : sessionCentre;
  const sessionCentreName = useMemo(
    () => resolveCentreName(centres, sessionCentre),
    [centres, sessionCentre]
  );
  const rowCentres = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => {
      const code = String(r.centerCode || '').trim();
      if (!code) return;
      const key = code.toUpperCase();
      if (!seen.has(key)) seen.set(key, { CENTERCODE: code, CLINICNAME: r.clinicName || code });
    });
    return Array.from(seen.values());
  }, [rows]);

  const centreOptions = centres.length > 0 ? centres : rowCentres;

  const selectableCentres = useMemo(
    () =>
      centreOptions.filter(
        (c) => !isEntityCentre(centreCodeOf(c)) && !sameCode(entityCode, centreCodeOf(c))
      ),
    [centreOptions, entityCode]
  );

  const centreDropdownOptions = useMemo(
    () =>
      selectableCentres.map((c) => {
        const code = centreCodeOf(c);
        return { value: code, label: centreNameOf(c) || code };
      }),
    [selectableCentres]
  );
  const centreCodes = useMemo(
    () => (entityLevel ? selectedCentres : [effectiveCentre].filter(Boolean)),
    [entityLevel, selectedCentres, effectiveCentre]
  );

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
  const handlePrint = async (row) => {
    try {
      await openPdf(`${API_BASE_URL}/api/EInvoice/Legacy/Print/${encodeURIComponent(row.id)}`);
    } catch (err) {
      showToast(err.message, 'error');
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
        centreCodes,
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
  }, [datePreset, dateError, fromDate, toDate, range, status, docType, centreCodes, search, page, limit]);

  useEffect(() => {
    if (!canView) return undefined;
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [canView, load]);

  /* ---- KPI summary fetch: period + centre scope only ---- */
  const loadSummary = useCallback(async () => {
    if (datePreset === 'Custom Days' && (dateError || !fromDate || !toDate)) return;
    const seq = ++summarySeq.current;
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Legacy/Summary`, {
        method: 'POST',
        body: JSON.stringify({
          fromDate: range ? range.from : null,
          toDate: range ? range.to : null,
          centreCodes,
        }),
      });
      if (seq !== summarySeq.current) return;
      setSummary(json.data || null);
    } catch (err) {
      if (seq !== summarySeq.current) return;
      setSummary(null);
      setSummaryError(err.message);
    } finally {
      if (seq === summarySeq.current) setSummaryLoading(false);
    }
  }, [datePreset, dateError, fromDate, toDate, range, centreCodes]);

  useEffect(() => {
    if (!canView) return undefined;
    const timer = setTimeout(loadSummary, 300);
    return () => clearTimeout(timer);
  }, [canView, loadSummary]);

  useEffect(() => {
    if (!canView) return;
    fetchCentreOptions(API_BASE_URL)
      .then((result) => {
        setCentres(result.centres);
        setEntityCode(result.entityCode || '');
        setCentreError(result.centres.length ? '' : 'The clinic list came back empty.');
      })
      .catch((err) => {
        setCentres([]);
        setCentreError(err.message || 'Could not load the clinic list.');
      });
  }, [canView]);


  useEffect(() => {
    setPage(1);
  }, [datePreset, fromDate, toDate, status, docType, centreCodes, search, limit]);

  const handleCentreSelect = (values) => {
    setSelectedCentres(Array.isArray(values) ? values : []);
    setPage(1);
  };

  const handleResetFilters = () => {
    setDatePreset(DEFAULT_PERIOD);
    setFromDate('');
    setToDate('');
    setStatus('');
    setDocType('');
    setSearch('');
    setDateError('');
    setSelectedIds([]);
    setPage(1);
    setSelectedCentres([]);
  };

  /* ---- selection ---- */
  const refreshableIds = useMemo(
    () => rows.filter(isRefreshable).map((r) => r.id),
    [rows]
  );

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => refreshableIds.indexOf(id) !== -1));
  }, [refreshableIds]);

  const allSelected = refreshableIds.length > 0 && selectedIds.length === refreshableIds.length;

  const toggleRow = (id) =>
    setSelectedIds((prev) => (prev.indexOf(id) === -1 ? prev.concat(id) : prev.filter((v) => v !== id)));

  const toggleAll = () => setSelectedIds(allSelected ? [] : refreshableIds.slice());

  /* ---- refresh ---- */
  const runRefresh = async () => {
    setConfirmRefresh(false);
    if (selectedIds.length === 0) return;

    const batches = [];
    for (let i = 0; i < selectedIds.length; i += REFRESH_BATCH_SIZE) {
      batches.push(selectedIds.slice(i, i + REFRESH_BATCH_SIZE));
    }

    setBusy(true);
    let sent = 0;
    let failed = 0;
    let firstError = '';

    try {
      for (let b = 0; b < batches.length; b += 1) {
        const batch = batches[b];
        try {
          const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Legacy/Refresh`, {
            method: 'POST',
            body: JSON.stringify({ ids: batch }),
          });
          const results = Array.isArray(json.data) ? json.data : [];
          results.forEach((r) => {
            if (r.ok) sent += 1;
            else {
              failed += 1;
              if (!firstError) firstError = r.message || '';
            }
          });
          if (results.length === 0) {
            sent += batch.length;
          }
        } catch (err) {
          failed += batch.length;
          if (!firstError) firstError = err.message || '';
        }
      }

      const summary = `${sent} of ${sent + failed} invoice${sent + failed === 1 ? '' : 's'} sent for refresh`;
      const kind = sent === 0 ? 'error' : failed > 0 ? 'info' : 'success';
      showToast(firstError ? `${summary}. ${firstError}` : summary, kind);
      setSelectedIds([]);
      load();
    } finally {
      setBusy(false);
    }
  };

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
  const refreshableCount = refreshableIds.length;

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
          {failedCount} document{failedCount === 1 ? '' : 's'} on this page did not reach ZATCA.
          {refreshableCount > 0
            ? ` ${refreshableCount} of them have no ZATCA number yet and can be ticked and resent.`
            : ' None can be resent, because they already carry a ZATCA number.'}
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
          <label htmlFor="einv-type">Invoice Type</label>
          <select id="einv-type" value={docType} onChange={(e) => setDocType(e.target.value)}>
            <option value="">All</option>
            {INVOICE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className={entityLevel ? 'fld fld-multi' : 'fld'}>
          <label htmlFor="einv-centre">Centre</label>
          {entityLevel ? (
            <>
              <SearchableDropdown
                options={centreDropdownOptions}
                value={selectedCentres}
                onChange={handleCentreSelect}
                multiple
                placeholder="All clinics"
              />
              {centreError && selectableCentres.length === 0 && (
                <span className="fld-hint hint-error">{centreError}</span>
              )}
            </>
          ) : (
            <SearchableDropdown
              options={[{ value: effectiveCentre, label: sessionCentreName || effectiveCentre }]}
              value={effectiveCentre}
              onChange={() => {}}
              disabled
            />
          )}
        </div>

        <div className="fld fld-grow">
          <label htmlFor="einv-search">Search</label>
          <input
            id="einv-search"
            type="text"
            value={search}
            placeholder="Invoice no, ZATCA no, customer, invoice type, status"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="fld fld-action">
          {canRefresh && (
            <button
              type="button"
              className="btn-refresh"
              disabled={selectedIds.length === 0 || busy}
              onClick={() => setConfirmRefresh(true)}>
              {busy ? 'Refreshing…' : `Refresh${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
            </button>
          )}
         
        </div>

        <div className='fld'>
           <button type="button" className="btn-ghost" onClick={handleResetFilters} disabled={busy}>
            Reset Filter
          </button>
        </div>
      </div>

      {dateError && <p className="einvoice-error">{dateError}</p>}

      {/* ---- KPI summary: e-invoices generated in the selected period ---- */}
      <div className="einv-kpis">
        <div className="einv-kpi-note">
          Counts and amounts cover e-invoices generated in the selected period only.
          {summaryError ? ` Summary not loaded: ${summaryError}` : ''}
        </div>
        <div className="einv-kpi-grid">
          {[
            { label: 'Total E-Invoices', value: summary ? summary.total : null, tone: 'navy' },
            { label: 'Successful', value: summary ? summary.successful : null, tone: 'green' },
            { label: 'Failed', value: summary ? summary.failed : null, tone: 'coral' },
            { label: 'Resolved', value: summary ? summary.resolved : null, tone: 'gold' },
          ].map((k) => (
            <div key={k.label} className={`einv-kpi-card tone-${k.tone}`}>
              <div className="einv-kpi-value">{summaryLoading ? '…' : k.value == null ? '—' : k.value.toLocaleString('en-US')}</div>
              <div className="einv-kpi-label">{k.label}</div>
            </div>
          ))}
          {[
            { label: 'Total Amount without VAT', value: summary ? summary.amountWithoutVat : null },
            { label: 'VAT', value: summary ? summary.vatAmount : null },
            { label: 'Total Amount with VAT', value: summary ? summary.amountWithVat : null },
          ].map((k) => (
            <div key={k.label} className="einv-kpi-card tone-amount">
              <div className="einv-kpi-value">{summaryLoading ? '…' : k.value == null ? '—' : formatSAR(k.value)}</div>
              <div className="einv-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

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
              <th className="col-check">
                <input
                  type="checkbox"
                  aria-label="Select all failed invoices"
                  checked={allSelected}
                  disabled={!canRefresh || refreshableIds.length === 0}
                  onChange={toggleAll}
                />
              </th>
              <th>Centre</th>
              <th>Invoice date</th>
              <th>Customer</th>
              <th>Invoice no</th>
              <th>ZATCA no</th>
              <th>Resolved invoice no</th>
              <th>Invoice Type</th>
              <th className="col-amount">Amount</th>
              <th>Status</th>
              <th>Details</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="row-message">Loading e-invoices…</td></tr>
            ) : loadError ? (
              <tr><td colSpan={12} className="row-message row-error">{loadError}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={12} className="row-message">No e-invoices in this period.</td></tr>
            ) : (
              rows.map((row) => {
                const selectable = canRefresh && isRefreshable(row);
                return (
                  <tr key={row.id} className={selectedIds.indexOf(row.id) !== -1 ? 'row-selected' : ''}>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        aria-label={`Select invoice ${row.posInvoiceNo || row.id}`}
                        checked={selectedIds.indexOf(row.id) !== -1}
                        disabled={!selectable || busy}
                        title={
                          selectable
                            ? ''
                            : row.einvoiceStatus === 'Failed'
                              ? 'Already has a ZATCA number, so it cannot be resent'
                              : 'Only failed invoices without a ZATCA number can be refreshed'
                        }
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
                    <td>{row.clinicName || row.centerCode}</td>
                    <td>{row.invoiceDate || '—'}</td>
                    <td>{row.customerName || '—'}</td>
                    <td>{row.posInvoiceNo || '—'}</td>
                    <td>{row.zakatInvoiceNo || '—'}</td>
                    <td>{row.resolvedInvoiceNo || '—'}</td>
                    <td>
                      <span className={`type-badge ${docTypeClass(row.dType)}`}>{invoiceTypeLabel(row)}</span>
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
                      {row.einvoiceStatus === 'Success' && (
                        <button type="button" className="btn-link" onClick={() => handlePrint(row)}>
                          Print
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
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

      {/* ---- refresh confirmation ---- */}
      {confirmRefresh && (
        <div className="einvoice-overlay" role="dialog" aria-modal="true" aria-label="Refresh selected invoices">
          <div className="einvoice-dialog">
            <h2>Refresh selected invoices</h2>
            <p className="dialog-note">
              {selectedIds.length} failed invoice{selectedIds.length === 1 ? '' : 's'} will be sent to
              ZATCA again. Statuses update once ClearTax answers.
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmRefresh(false)}>Cancel</button>
              <button type="button" className="btn-primary" disabled={busy} onClick={runRefresh}>
                Refresh now
              </button>
            </div>
          </div>
        </div>
      )}

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