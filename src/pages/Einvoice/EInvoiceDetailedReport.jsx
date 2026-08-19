import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { usePermissions } from '../Settings/usePermissions';
import SearchableDropdown from './SearchableDropdown';
import {
  STATUS_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  invoiceTypeLabel,
  normStatus,
  statusClass,
  formatSAR,
  apiRequest,
  getCurrentCentreCode,
  isEntityCentre,
  centreCodeOf,
  centreNameOf,
  resolveCentreName,
  fetchCentreOptions,
} from './einvoiceUtils';

const EINVOICE_ACTIVITY = 'EINV.VIEW';

const firstNumber = (...values) => {
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (v === null || v === undefined || v === '') continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
};

const amountWithoutVat = (r) => firstNumber(r.amountWithoutVat, r.totalWithoutVat, r.amount);
const amountWithVat = (r) => firstNumber(r.amountWithVat, r.totalWithVat, r.amount);
const vatAmount = (r) => firstNumber(r.vatAmount, r.totalVat, r.vat, 0);

const EInvoiceDetailedReport = () => {
  const perms = usePermissions() || {};
  const canView =
    typeof perms.hasPermission === 'function' ? perms.hasPermission(EINVOICE_ACTIVITY) : true;

  const sessionCentre = useMemo(() => getCurrentCentreCode(), []);
  const entityLevel = !sessionCentre || isEntityCentre(sessionCentre);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [centres, setCentres] = useState([]);
  const [selectedCentres, setSelectedCentres] = useState(entityLevel ? [] : [sessionCentre]);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasViewed, setHasViewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'invoiceDate', direction: 'desc' });
  const [viewNonce, setViewNonce] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!canView) return;
    fetchCentreOptions(API_BASE_URL)
      .then((result) => setCentres(result.centres))
      .catch((err) => {
        console.warn('E-Invoice centre list unavailable:', err && err.message);
        setCentres([]);
      });
  }, [canView]);

  const sessionCentreName = useMemo(
    () => resolveCentreName(centres, sessionCentre),
    [centres, sessionCentre]
  );

  const centreNameByCode = useCallback(
    (code) => (code ? resolveCentreName(centres, code) : ''),
    [centres]
  );

  const selectableCentres = useMemo(
    () => centres.filter((c) => !isEntityCentre(centreCodeOf(c))),
    [centres]
  );

  const centreDropdownOptions = useMemo(
    () =>
      selectableCentres.map((c) => {
        const code = centreCodeOf(c);
        return { value: code, label: centreNameOf(c) || code };
      }),
    [selectableCentres]
  );

  const dateValid = Boolean(fromDate && toDate) && new Date(toDate) >= new Date(fromDate);

  const reportBody = useCallback(
    (extra) => ({
      fromDate,
      toDate,
      dateFlag: '1',
      status: statusFilter || null,
      docType: typeFilter || null,
      centreCodes: selectedCentres,
      sortBy: sortConfig.key || 'invoiceDate',
      sortDir: sortConfig.direction,
      ...extra,
    }),
    [fromDate, toDate, statusFilter, typeFilter, selectedCentres, sortConfig]
  );

  const handleView = () => {
    if (!fromDate || !toDate) { setError('From Date and To Date are both required.'); return; }
    if (new Date(toDate) < new Date(fromDate)) { setError('To Date must be on or after From Date.'); return; }
    setError('');
    setCurrentPage(1);
    setHasViewed(true);
    setViewNonce((n) => n + 1);
  };

  useEffect(() => {
    if (!hasViewed || viewNonce === 0) return undefined;
    let cancelled = false;
    setLoading(true);
    apiRequest(`${API_BASE_URL}/api/EInvoice/Legacy/Report`, {
      method: 'POST',
      body: JSON.stringify(reportBody({ page: currentPage, limit: entriesPerPage })),
    })
      .then((json) => {
        if (cancelled) return;
        setRows(Array.isArray(json.data) ? json.data : []);
        setTotal((json.meta && json.meta.total) || 0);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setTotal(0);
        setError(err.message || 'Failed to load the report. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [viewNonce, currentPage, entriesPerPage, sortConfig, hasViewed]);

  const handleReset = () => {
    setFromDate('');
    setToDate('');
    setStatusFilter('');
    setTypeFilter('');
    setSelectedCentres(entityLevel ? [] : [sessionCentre]);
    setRows([]);
    setTotal(0);
    setHasViewed(false);
    setError('');
    setCurrentPage(1);
    setSortConfig({ key: 'invoiceDate', direction: 'desc' });
  };

  const handleCentreSelect = (values) => {
    setSelectedCentres(Array.isArray(values) ? values : []);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / entriesPerPage));

  const handleSort = (key) => {
    setCurrentPage(1);
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleExport = async () => {
    setExporting(true);
    let all = [];
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Legacy/Report`, {
        method: 'POST',
        body: JSON.stringify(reportBody({ all: true })),
      });
      all = Array.isArray(json.data) ? json.data : [];
    } catch (err) {
      setError(err.message || 'Could not build the export.');
      setExporting(false);
      return;
    }
    const exportData = all.map((r) => ({
      Clinic: r.clinicName || centreNameByCode(r.centerCode || r.CENTERCODE) || '',
      'Invoice Date': r.invoiceDate,
      'Invoice Type': invoiceTypeLabel(r),
      'Invoice No': r.posInvoiceNo,
      'Zakat Invoice No': r.zakatInvoiceNo,
      'Resolved Invoice No': r.resolvedInvoiceNo,
      'Total Amount Without VAT': amountWithoutVat(r),
      'Total Amount With VAT': amountWithVat(r),
      'Total VAT': vatAmount(r),
      Status: normStatus(r),
      Remarks: r.remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'E-Invoices');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'einvoice_detailed_report.xlsx');
    setExporting(false);
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

  const startIdx = total === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const endIdx = Math.min(currentPage * entriesPerPage, total);

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

      {/* ---- filters ---- */}
      <div className="einvoice-filters">
        <div className="fltdiv">
          <label htmlFor="rpt-from">From Date <span className="req">*</span></label>
          <input
            id="rpt-from"
            type="date"
            value={fromDate}
            className={error && !fromDate ? 'input-error' : ''}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="fltdiv">
          <label htmlFor="rpt-to">To Date <span className="req">*</span></label>
          <input
            id="rpt-to"
            type="date"
            value={toDate}
            className={error && !toDate ? 'input-error' : ''}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="fltdiv">
          <label htmlFor="rpt-status">Status</label>
          <select id="rpt-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="fltdiv">
          <label htmlFor="rpt-type">Invoice Type</label>
          <select id="rpt-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            {INVOICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {entityLevel ? (
          <div className="fltdiv fltdiv-multi">
            <label htmlFor="rpt-centres">Clinic Name</label>
            <SearchableDropdown
              options={centreDropdownOptions}
              value={selectedCentres}
              onChange={handleCentreSelect}
              multiple
              placeholder="All clinics"
            />
          </div>
        ) : (
          <div className="fltdiv">
            <label htmlFor="rpt-centre">Clinic Name</label>
            <SearchableDropdown
              options={[{ value: sessionCentre, label: sessionCentreName || sessionCentre }]}
              value={sessionCentre}
              onChange={() => {}}
              disabled
            />
          </div>
        )}

        <div className="report-actions">
          <button className="btn-primary" onClick={handleView} disabled={!dateValid || loading}>
            {loading ? 'Loading…' : 'View'}
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={!hasViewed || total === 0 || exporting}>
            {exporting ? 'Preparing…' : 'Export'}
          </button>
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
                <th onClick={() => handleSort('invoiceDate')}>Invoice Date{sortArrow('invoiceDate')}</th>
                <th onClick={() => handleSort('invoiceType')}>Invoice Type{sortArrow('invoiceType')}</th>
                <th onClick={() => handleSort('posInvoiceNo')}>Invoice No{sortArrow('posInvoiceNo')}</th>
                <th onClick={() => handleSort('zakatInvoiceNo')}>Zakat Invoice No{sortArrow('zakatInvoiceNo')}</th>
                <th onClick={() => handleSort('resolvedInvoiceNo')}>Resolved Invoice No{sortArrow('resolvedInvoiceNo')}</th>
                <th className="col-amount" onClick={() => handleSort('amountWithoutVat')}>
                  Total Amount Without VAT{sortArrow('amountWithoutVat')}
                </th>
                <th className="col-amount" onClick={() => handleSort('amountWithVat')}>
                  Total Amount With VAT{sortArrow('amountWithVat')}
                </th>
                <th className="col-amount" onClick={() => handleSort('vatAmount')}>
                  Total VAT{sortArrow('vatAmount')}
                </th>
                <th onClick={() => handleSort('status')}>Status{sortArrow('status')}</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {!hasViewed ? (
                <tr><td colSpan={11} className="no-records">Select a date range and click View to load the report.</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} className="no-records">No records found</td></tr>
              ) : (
                rows.map((r, idx) => {
                  const status = normStatus(r);
                  return (
                    <tr key={r.id || r.posInvoiceNo || idx}>
                      <td>{r.clinicName || centreNameByCode(r.centerCode || r.CENTERCODE) || '—'}</td>
                      <td>{r.invoiceDate || '—'}</td>
                      <td>{invoiceTypeLabel(r)}</td>
                      <td>{r.posInvoiceNo || '—'}</td>
                      <td>{r.zakatInvoiceNo || '—'}</td>
                      <td>{status === 'Resolved' ? (r.resolvedInvoiceNo || '—') : '—'}</td>
                      <td className="col-amount">{formatSAR(amountWithoutVat(r))}</td>
                      <td className="col-amount">{formatSAR(amountWithVat(r))}</td>
                      <td className="col-amount">{formatSAR(vatAmount(r))}</td>
                      <td><span className={`status ${statusClass(status)}`}>{status}</span></td>
                      <td className="col-remarks" title={r.remarks || ''}>{r.remarks || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {hasViewed && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {startIdx} to {endIdx} of {total} entries
          </div>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&lt;&lt;</button>
            <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>&lt;</button>
            {renderPaginationNumbers()}
            <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>&gt;</button>
            <button className="pagination-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>&gt;&gt;</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EInvoiceDetailedReport;