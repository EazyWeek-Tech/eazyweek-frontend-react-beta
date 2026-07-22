import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';
// Permission hook — confirm the export/method name against your other modules.
import { usePermissions } from '../Settings/usePermissions';
import {
  DATE_PRESETS,
  STATUS_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  parseInvoiceDate,
  atMidnight,
  presetRange,
  validateCustomRange,
  invoiceTypeLabel,
  invoiceTypeClass,
  normStatus,
  statusClass,
  formatSAR,
  searchableString,
} from './einvoiceUtils';

/* ─────────────────────────────────────────────────────────────────────────────
   E-INVOICE DASHBOARD  (workbook TST-001 → TST-084)

   API CONTRACT (integration team) — all under API_BASE_URL, cookie-auth:
     GET  /api/EInvoice/LoadEInvoice
          → { success, message, data: EInvoice[] }   (raw array also tolerated)
     POST /api/EInvoice/EInvoiceRefreshUrl
          body: { status, invoiceNumber, custID, refreshUrl }
          → { success, message, data }

   EInvoice row fields consumed here:
     clinicName, invoiceDate (dd/MM/yyyy), customerName, posInvoiceNo,
     zakatInvoiceNo, resolvedInvoiceNo, dType | zakatInvoiceType, amount,
     einvoiceStatus (Success|Failed|Resolved), remarks, custID, refreshUrl, eurl.
   ───────────────────────────────────────────────────────────────────────────── */

// >>> CONFIRM the E-Invoice permission activity code for your RBAC matrix. <<<
const EINVOICE_ACTIVITY = 'MDM.EINV.VIEW';

const rowKey = (inv, idx) => inv.id || inv.posInvoiceNo || `row-${idx}`;

const EInvoiceDashboard = () => {
  // ── permission gate (TST-082) ──
  const perms = usePermissions() || {};
  const canView =
    typeof perms.hasPermission === 'function' ? perms.hasPermission(EINVOICE_ACTIVITY) : true;

  // ── data ──
  const [invoiceData, setInvoiceData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── filters ──
  const [datePreset, setDatePreset] = useState('');     // '' = no filter (TST-013)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ── grid controls ──
  const [entriesPerPage, setEntriesPerPage] = useState(10);   // default 10 (TST-060)
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // ── selection / actions ──
  const [selected, setSelected] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, kind = 'info') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── load ──
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/EInvoice/LoadEInvoice`, { credentials: 'include' });
      const json = await res.json();
      const data = json?.data ?? json;               // tolerate {success,data} or raw array
      setInvoiceData(Array.isArray(data) ? data : data ? [data] : []);
    } catch (err) {
      console.error('Failed to fetch E-Invoices:', err);
      setInvoiceData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) fetchInvoices();
  }, [canView, fetchInvoices]);

  // Clinic selector options derived from the (isolation-enforced) dataset.
  // Single-clinic users therefore see only their clinic (TST-081); switching
  // filters client-side and resets to page 1 (TST-080).
  const clinicOptions = useMemo(() => {
    const set = new Set(invoiceData.map((i) => i.clinicName).filter(Boolean));
    return Array.from(set).sort();
  }, [invoiceData]);

  // ── active date range (preset or validated custom) ──
  const activeRange = useMemo(() => {
    if (!datePreset) return null;
    if (datePreset === 'Custom Days') {
      if (dateError || !fromDate || !toDate) return null;
      return { from: atMidnight(new Date(fromDate)), to: atMidnight(new Date(toDate)) };
    }
    return presetRange(datePreset);
  }, [datePreset, fromDate, toDate, dateError]);

  // ── filtering ──
  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return invoiceData.filter((item) => {
      // date
      if (activeRange) {
        const d = parseInvoiceDate(item.invoiceDate);
        if (!d) return false;
        const dm = atMidnight(d);
        if (dm < activeRange.from || dm > activeRange.to) return false;
      }
      // status
      if (statusFilter && normStatus(item) !== statusFilter) return false;
      // invoice type
      if (typeFilter && invoiceTypeLabel(item) !== typeFilter) return false;
      // clinic
      if (clinicFilter && item.clinicName !== clinicFilter) return false;
      // search (substring across all searchable fields)
      if (term && !searchableString(item).includes(term)) return false;
      return true;
    });
  }, [invoiceData, activeRange, statusFilter, typeFilter, clinicFilter, searchTerm]);

  // ── sorting ──
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    const { key, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;
    const val = (inv) => {
      if (key === 'invoiceDate') return parseInvoiceDate(inv.invoiceDate)?.getTime() || 0;
      if (key === 'amount') return Number(inv.amount) || 0;
      if (key === 'invoiceType') return invoiceTypeLabel(inv);
      if (key === 'status') return normStatus(inv);
      return (inv[key] ?? '').toString().toLowerCase();
    };
    return [...filteredData].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // ── pagination ──
  const totalPages = Math.max(1, Math.ceil(sortedData.length / entriesPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return sortedData.slice(start, start + entriesPerPage);
  }, [sortedData, currentPage, entriesPerPage]);

  // Keep currentPage in range whenever the result set shrinks.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const resetToFirstPage = () => setCurrentPage(1);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ── date filter handlers ──
  const onPresetChange = (value) => {
    setDatePreset(value);
    // Switching away from Custom Days clears the custom inputs (TST-014).
    if (value !== 'Custom Days') {
      setFromDate('');
      setToDate('');
      setDateError('');
    }
    resetToFirstPage();
  };

  const onCustomDateChange = (which, value) => {
    const nextFrom = which === 'from' ? value : fromDate;
    const nextTo = which === 'to' ? value : toDate;
    if (which === 'from') setFromDate(value); else setToDate(value);
    setDateError(validateCustomRange(nextFrom, nextTo));
    resetToFirstPage();
  };

  // ── selection ──
  const pageKeys = useMemo(
    () => paginatedData.map((inv, idx) => rowKey(inv, idx)),
    [paginatedData]
  );
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));

  const toggleRow = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageKeys.forEach((k) => next.delete(k));
      else pageKeys.forEach((k) => next.add(k));
      return next;
    });
  };

  const selectedInvoices = useMemo(() => {
    const keyed = new Map(sortedData.map((inv, idx) => [rowKey(inv, idx), inv]));
    return Array.from(selected).map((k) => keyed.get(k)).filter(Boolean);
  }, [selected, sortedData]);

  // ── refresh flow (TST-064/065/069) ──
  const onRefreshClick = () => {
    if (selected.size === 0) return;      // button also disabled in that state
    setConfirmOpen(true);
  };

  const doRefresh = async () => {
    setConfirmOpen(false);
    setRefreshing(true);
    try {
      const targets = selectedInvoices.filter((inv) => normStatus(inv) === 'Failed');
      if (targets.length === 0) {
        showToast('Selected invoices are not in Failed status.', 'info');
        return;
      }
      await Promise.all(
        targets.map((inv) =>
          fetch(`${API_BASE_URL}/api/EInvoice/EInvoiceRefreshUrl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              status: 'Failed',
              invoiceNumber: inv.posInvoiceNo,
              custID: inv.custID,
              refreshUrl: inv.refreshUrl,
            }),
          })
        )
      );
      showToast('Refresh requested. Statuses will update to Success / Resolved.', 'success');
      setSelected(new Set());
      await fetchInvoices();
    } catch (err) {
      console.error('Invoice refresh failed:', err);
      showToast('Failed to refresh invoices. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // ── print (TST-061/062/063) ──
  // Success → this invoice's ZATCA document; Resolved → the document of the
  // invoice it was resolved against; Failed → blocked with a message.
  const handlePrint = (inv) => {
    const status = normStatus(inv);
    if (status === 'Failed') {
      showToast('Invoice not cleared — cannot print ZATCA invoice', 'error');
      return;
    }
    const targetNo = status === 'Resolved' && inv.resolvedInvoiceNo ? inv.resolvedInvoiceNo : inv.posInvoiceNo;
    // >>> INTEGRATION: point this at the invoice-document / PDF route. <<<
    const url = `${API_BASE_URL}/api/EInvoice/PrintDocument?invoiceNo=${encodeURIComponent(targetNo)}`;
    window.open(url, '_blank', 'noopener');
  };

  // ── pagination buttons ──
  const renderPaginationNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages.map((page, i) => (
      <button
        key={i}
        className={`pagination-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
        onClick={() => typeof page === 'number' && setCurrentPage(page)}
        disabled={page === '...'}>
        {page}
      </button>
    ));
  };

  const sortArrow = (key) =>
    sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '';

  // ── access denied (TST-082) ──
  if (!canView) {
    return (
      <div className="einvoice-dashboard">
        <div className="einvoice-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to view the E-Invoice module.</p>
        </div>
      </div>
    );
  }

  const startIdx = sortedData.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const endIdx = Math.min(currentPage * entriesPerPage, sortedData.length);

  return (
    <div className="einvoice-dashboard">
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">E-Invoice</span>
      </div>

      <div className="dashboard-header">
        <h1>EINVOICES</h1>
      </div>

      {/* Filters (TST-002/015/024/038/080) */}
      <div className="einvoice-filters">
        <div className="fltdiv">
          <label>INVOICE DATE</label>
          <select value={datePreset} onChange={(e) => onPresetChange(e.target.value)}>
            <option value="">Select…</option>
            {DATE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {datePreset === 'Custom Days' && (
          <>
            <div className="fltdiv">
              <label>From Date</label>
              <input
                type="date"
                className={dateError ? 'input-error' : ''}
                value={fromDate}
                onChange={(e) => onCustomDateChange('from', e.target.value)}
              />
            </div>
            <div className="fltdiv">
              <label>To Date</label>
              <input
                type="date"
                className={dateError ? 'input-error' : ''}
                value={toDate}
                onChange={(e) => onCustomDateChange('to', e.target.value)}
              />
            </div>
          </>
        )}

        <div className="fltdiv">
          <label>STATUS</label>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetToFirstPage(); }}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="fltdiv">
          <label>INVOICE TYPE</label>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); resetToFirstPage(); }}>
            <option value="">All</option>
            {INVOICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="fltdiv">
          <label>CLINIC</label>
          <select
            value={clinicFilter}
            disabled={clinicOptions.length <= 1}
            onChange={(e) => { setClinicFilter(e.target.value); setSelected(new Set()); resetToFirstPage(); }}>
            <option value="">All</option>
            {clinicOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {dateError && <div className="einvoice-date-error">{dateError}</div>}

      {/* Controls row: entries + search (left), Refresh Invoice (right, TST-064) */}
      <div className="dashboard-controls">
        <div className="controls-left">
          <div className="entries-control">
            <select value={entriesPerPage} onChange={(e) => { setEntriesPerPage(Number(e.target.value)); resetToFirstPage(); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries per page</span>
          </div>

          <div className="search-control">
            <label>SEARCH</label>
            <input
              type="text"
              value={searchTerm}
              placeholder="Search…"
              onChange={(e) => { setSearchTerm(e.target.value); resetToFirstPage(); }}
            />
          </div>
        </div>

        <button
          className="refresh-invoice-btn"
          onClick={onRefreshClick}
          disabled={selected.size === 0 || refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh Invoice'}
        </button>
      </div>

      {/* Grid (TST-053) */}
      {loading ? (
        <div className="loader-wrapper"><div className="loader" /></div>
      ) : (
        <div className="table-container">
          <table className="einvoice-table">
            <thead>
              <tr>
                <th className="col-check">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllOnPage} aria-label="Select all" />
                </th>
                <th onClick={() => handleSort('clinicName')}>Clinic{sortArrow('clinicName')}</th>
                <th onClick={() => handleSort('invoiceDate')}>Invoice Date{sortArrow('invoiceDate')}</th>
                <th onClick={() => handleSort('customerName')}>Customer Name{sortArrow('customerName')}</th>
                <th onClick={() => handleSort('posInvoiceNo')}>Invoice No{sortArrow('posInvoiceNo')}</th>
                <th onClick={() => handleSort('zakatInvoiceNo')}>Zakat Invoice No{sortArrow('zakatInvoiceNo')}</th>
                <th onClick={() => handleSort('resolvedInvoiceNo')}>Resolved Invoice No{sortArrow('resolvedInvoiceNo')}</th>
                <th onClick={() => handleSort('invoiceType')}>Invoice Type{sortArrow('invoiceType')}</th>
                <th onClick={() => handleSort('amount')}>Amount{sortArrow('amount')}</th>
                <th onClick={() => handleSort('status')}>Status{sortArrow('status')}</th>
                <th>Remarks</th>
                <th>Print</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="no-records">No records found</td>
                </tr>
              ) : (
                paginatedData.map((inv, idx) => {
                  const key = rowKey(inv, idx);
                  const status = normStatus(inv);
                  const typeLabel = invoiceTypeLabel(inv);
                  const isResolved = status === 'Resolved';
                  const isFailed = status === 'Failed';
                  return (
                    <tr key={key} className={selected.has(key) ? 'row-selected' : ''}>
                      <td className="col-check">
                        <input type="checkbox" checked={selected.has(key)} onChange={() => toggleRow(key)} />
                      </td>
                      <td>{inv.clinicName}</td>
                      <td>{inv.invoiceDate}</td>
                      <td>{inv.customerName}</td>
                      <td>{inv.posInvoiceNo}</td>
                      <td>{inv.zakatInvoiceNo}</td>
                      <td>{isResolved ? (inv.resolvedInvoiceNo || '—') : '—'}</td>
                      <td>
                        <span className={`type-badge ${invoiceTypeClass(typeLabel)}`}>{typeLabel}</span>
                      </td>
                      <td className="col-amount">{formatSAR(inv.amount)}</td>
                      <td>
                        <span className={`status ${statusClass(status)}`}>{status}</span>
                      </td>
                      <td className="col-remarks">{inv.remarks}</td>
                      <td>
                        <button
                          className="print-btn"
                          title={isFailed ? 'Invoice not cleared — cannot print' : 'Print Invoice'}
                          disabled={isFailed}
                          onClick={() => handlePrint(inv)}>
                          🖨️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination (TST-060/077/078/079) */}
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {startIdx} to {endIdx} of {sortedData.length} entries
        </div>
        <div className="pagination-controls">
          <button className="pagination-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&lt;&lt;</button>
          <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>&lt;</button>
          {renderPaginationNumbers()}
          <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>&gt;</button>
          <button className="pagination-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>&gt;&gt;</button>
        </div>
      </div>

      {/* Confirm popup (TST-069) */}
      {confirmOpen && (
        <div className="einvoice-modal-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="einvoice-modal" onClick={(e) => e.stopPropagation()}>
            <p>Do you want to refresh the invoice?</p>
            <div className="einvoice-modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmOpen(false)}>No</button>
              <button className="btn-primary" onClick={doRefresh}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`einvoice-toast ${toast.kind}`}>{toast.message}</div>}
    </div>
  );
};

export default EInvoiceDashboard;