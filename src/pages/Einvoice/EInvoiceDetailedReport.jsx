import React, { useState, useMemo, useCallback } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { usePermissions } from '../Settings/usePermissions';
import {
  STATUS_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  invoiceTypeLabel,
  normStatus,
  statusClass,
} from './einvoiceUtils';

/* ─────────────────────────────────────────────────────────────────────────────
   E-INVOICE DETAILED REPORT  (workbook TST-085 → TST-092)

   Filters (TST-089): From Date | To Date | Status | Invoice Type | Clinic Name
   Actions (TST-086): View | Export | Reset
   Date is MANDATORY — grid populates only after a valid date + View (TST-090).
   Columns (TST-087): Clinic | Created By | Invoice Date | Invoice Type |
                      Invoice No | Zakat Invoice No | Resolved Invoice No |
                      Status | Remarks

   API (integration team):
     POST /api/EInvoice/EInvoiceReport
       body: { fromDate, toDate, status, dateFlag:'1' }
       → { success, message, data: EInvoice[] }   (raw array tolerated)
   Invoice Type + Clinic are applied client-side to the returned rows.
   ───────────────────────────────────────────────────────────────────────────── */

const EINVOICE_ACTIVITY = 'MDM.EINV.VIEW';

const EInvoiceDetailedReport = () => {
  const perms = usePermissions() || {};
  const canView =
    typeof perms.hasPermission === 'function' ? perms.hasPermission(EINVOICE_ACTIVITY) : true;

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');

  const [rows, setRows] = useState([]);         // server result
  const [hasViewed, setHasViewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Clinic options come from the loaded rows (post-View).
  const clinicOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.clinicName).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  // Date mandatory (TST-090).
  const dateValid = Boolean(fromDate && toDate) && new Date(toDate) >= new Date(fromDate);

  const handleView = useCallback(async () => {
    if (!fromDate || !toDate) { setError('Please select both From Date and To Date.'); return; }
    if (new Date(toDate) < new Date(fromDate)) { setError('To Date must be after From Date.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/EInvoice/EInvoiceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fromDate, toDate, status: statusFilter, dateFlag: '1' }),
      });
      const json = await res.json();
      const data = json?.data ?? json;
      setRows(Array.isArray(data) ? data : data ? [data] : []);
      setHasViewed(true);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load report:', err);
      setError('Failed to load report. Please try again.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter]);

  const handleReset = () => {
    setFromDate('');
    setToDate('');
    setStatusFilter('');
    setTypeFilter('');
    setClinicFilter('');
    setRows([]);
    setHasViewed(false);
    setError('');
    setCurrentPage(1);
    setSortConfig({ key: null, direction: 'asc' });
  };

  // Client-side status/type/clinic narrowing of the loaded rows.
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && normStatus(r) !== statusFilter) return false;
      if (typeFilter && invoiceTypeLabel(r) !== typeFilter) return false;
      if (clinicFilter && r.clinicName !== clinicFilter) return false;
      return true;
    });
  }, [rows, statusFilter, typeFilter, clinicFilter]);

  const sorted = useMemo(() => {
    if (!sortConfig.key) return filtered;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    const val = (r) => {
      if (sortConfig.key === 'invoiceType') return invoiceTypeLabel(r);
      if (sortConfig.key === 'status') return normStatus(r);
      return (r[sortConfig.key] ?? '').toString().toLowerCase();
    };
    return [...filtered].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / entriesPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return sorted.slice(start, start + entriesPerPage);
  }, [sorted, currentPage, entriesPerPage]);

  const handleSort = (key) =>
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const handleExport = () => {
    const exportData = filtered.map((r) => ({
      Clinic: r.clinicName,
      'Created By': r.createdBy,
      'Invoice Date': r.invoiceDate,
      'Invoice Type': invoiceTypeLabel(r),
      'Invoice No': r.posInvoiceNo,
      'Zakat Invoice No': r.zakatInvoiceNo,
      'Resolved Invoice No': r.resolvedInvoiceNo,
      Status: normStatus(r),
      Remarks: r.remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'E-Invoices');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'einvoice_detailed_report.xlsx');
  };

  const renderPaginationNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else if (currentPage <= 3) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 2) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
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

  const sortArrow = (key) => (sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '');

  if (!canView) {
    return (
      <div className="einvoice-dashboard">
        <div className="einvoice-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to view the E-Invoice report.</p>
        </div>
      </div>
    );
  }

  const startIdx = sorted.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const endIdx = Math.min(currentPage * entriesPerPage, sorted.length);

  return (
    <div className="einvoice-dashboard">
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">E-Invoice Detailed Report</span>
      </div>

      <div className="dashboard-header">
        <h1>E-Invoice Report</h1>
      </div>

      {/* Filters (TST-089) */}
      <div className="einvoice-filters">
        <div className="fltdiv">
          <label>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="fltdiv">
          <label>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="fltdiv">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="fltdiv">
          <label>Invoice Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            {INVOICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="fltdiv">
          <label>Clinic Name</label>
          <select value={clinicFilter} onChange={(e) => setClinicFilter(e.target.value)} disabled={clinicOptions.length === 0}>
            <option value="">All</option>
            {clinicOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="report-actions">
          <button className="btn-primary" onClick={handleView} disabled={!dateValid || loading}>
            {loading ? 'Loading…' : 'View'}
          </button>
          <button className="btn-primary" onClick={handleExport} disabled={filtered.length === 0}>Export</button>
          <button className="btn-secondary" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {error && <div className="einvoice-date-error">{error}</div>}

      <div className="dashboard-controls">
        <div className="entries-control">
          <select value={entriesPerPage} onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries per page</span>
        </div>
      </div>

      {loading ? (
        <div className="loader-wrapper"><div className="loader" /></div>
      ) : (
        <div className="table-container">
          <table className="einvoice-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('clinicName')}>Clinic{sortArrow('clinicName')}</th>
                <th onClick={() => handleSort('createdBy')}>Created By{sortArrow('createdBy')}</th>
                <th onClick={() => handleSort('invoiceDate')}>Invoice Date{sortArrow('invoiceDate')}</th>
                <th onClick={() => handleSort('invoiceType')}>Invoice Type{sortArrow('invoiceType')}</th>
                <th onClick={() => handleSort('posInvoiceNo')}>Invoice No{sortArrow('posInvoiceNo')}</th>
                <th onClick={() => handleSort('zakatInvoiceNo')}>Zakat Invoice No{sortArrow('zakatInvoiceNo')}</th>
                <th onClick={() => handleSort('resolvedInvoiceNo')}>Resolved Invoice No{sortArrow('resolvedInvoiceNo')}</th>
                <th onClick={() => handleSort('status')}>Status{sortArrow('status')}</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {!hasViewed ? (
                <tr><td colSpan={9} className="no-records">Select a date range and click View to load the report.</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="no-records">No records found</td></tr>
              ) : (
                paginated.map((r, idx) => {
                  const status = normStatus(r);
                  return (
                    <tr key={r.id || r.posInvoiceNo || idx}>
                      <td>{r.clinicName}</td>
                      <td>{r.createdBy}</td>
                      <td>{r.invoiceDate}</td>
                      <td>{invoiceTypeLabel(r)}</td>
                      <td>{r.posInvoiceNo}</td>
                      <td>{r.zakatInvoiceNo}</td>
                      <td>{status === 'Resolved' ? (r.resolvedInvoiceNo || '—') : '—'}</td>
                      <td><span className={`status ${statusClass(status)}`}>{status}</span></td>
                      <td className="col-remarks">{r.remarks}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination-container">
        <div className="pagination-info">
          Showing {startIdx} to {endIdx} of {sorted.length} entries
        </div>
        <div className="pagination-controls">
          <button className="pagination-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&lt;&lt;</button>
          <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>&lt;</button>
          {renderPaginationNumbers()}
          <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>&gt;</button>
          <button className="pagination-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>&gt;&gt;</button>
        </div>
      </div>
    </div>
  );
};

export default EInvoiceDetailedReport;