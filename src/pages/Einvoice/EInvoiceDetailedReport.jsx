import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { usePermissions } from '../Settings/usePermissions';
import {
  STATUS_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  invoiceTypeCode,
  invoiceTypeLabel,
  normStatus,
  statusClass,
  apiRequest,
  getCurrentCentreCode,
  isEntityCentre,
} from './einvoiceUtils';

const EINVOICE_ACTIVITY = 'EINV.VIEW';

/* ---- centre name resolution ---- */
const CENTRE_CODE_KEYS = ['CENTERCODE', 'CENTRECODE', 'centerCode', 'centreCode', 'CenterCode', 'CentreCode', 'code'];
const CENTRE_NAME_KEYS = ['CLINICNAME', 'CENTRENAME', 'CENTERNAME', 'CENTREDESC', 'clinicName', 'centreName', 'centerName', 'name'];
const CENTRE_NAME_STORAGE_KEYS = [
  'centreName', 'centrename', 'CentreName', 'CENTRENAME',
  'centerName', 'CENTERNAME', 'clinicName', 'CLINICNAME',
  'currentCentreName', 'selectedCentreName', 'centreDisplayName', 'LoginCentreName',
];

const pickField = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return '';
};

const centreCodeOf = (c) => pickField(c, CENTRE_CODE_KEYS);
const centreNameOf = (c) => pickField(c, CENTRE_NAME_KEYS);

const sameCode = (a, b) =>
  Boolean(a) && Boolean(b) && String(a).trim().toUpperCase() === String(b).trim().toUpperCase();

const findCentreByCode = (list, code) =>
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

const storedCentreName = (code) => {
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

const resolveCentreName = (list, code) => {
  if (!code) return '';
  const match = findCentreByCode(list, code);
  const fromList = match ? centreNameOf(match) : '';
  if (fromList && !sameCode(fromList, code)) return fromList;
  return storedCentreName(code) || code;
};

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
  const [hasViewed, setHasViewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    if (!canView) return;
    apiRequest(`${API_BASE_URL}/api/EInvoice/Centre`)
      .then((json) => {
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setCentres(list);
      })
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

  const dateValid = Boolean(fromDate && toDate) && new Date(toDate) >= new Date(fromDate);

  const handleView = useCallback(async () => {
    if (!fromDate || !toDate) { setError('From Date and To Date are both required.'); return; }
    if (new Date(toDate) < new Date(fromDate)) { setError('To Date must be on or after From Date.'); return; }
    setError('');
    setLoading(true);
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Legacy/Report`, {
        method: 'POST',
        body: JSON.stringify({
          fromDate,
          toDate,
          dateFlag: '1',
          status: statusFilter || null,
          docType: typeFilter || null,
          centreCodes: selectedCentres,
        }),
      });
      setRows(Array.isArray(json.data) ? json.data : []);
      setHasViewed(true);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || 'Failed to load the report. Please try again.');
      setRows([]);
      setHasViewed(true);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter, typeFilter, selectedCentres]);

  const handleReset = () => {
    setFromDate('');
    setToDate('');
    setStatusFilter('');
    setTypeFilter('');
    setSelectedCentres(entityLevel ? [] : [sessionCentre]);
    setRows([]);
    setHasViewed(false);
    setError('');
    setCurrentPage(1);
    setSortConfig({ key: null, direction: 'asc' });
  };

  const handleCentreSelect = (e) => {
    const picked = Array.from(e.target.selectedOptions).map((o) => o.value).filter(Boolean);
    setSelectedCentres(picked);
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && normStatus(r) !== statusFilter) return false;
      if (typeFilter && invoiceTypeCode(r) !== typeFilter) return false;
      return true;
    });
  }, [rows, statusFilter, typeFilter]);

  const sorted = useMemo(() => {
    if (!sortConfig.key) return filtered;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    const val = (r) => {
      if (sortConfig.key === 'invoiceType') return invoiceTypeLabel(r);
      if (sortConfig.key === 'status') return normStatus(r);
      if (sortConfig.key === 'invoiceDate') {
        const t = r.invoiceDateValue ? new Date(r.invoiceDateValue).getTime() : NaN;
        return Number.isNaN(t) ? 0 : t;
      }
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
      Clinic: r.clinicName || centreNameByCode(r.centerCode || r.CENTERCODE) || '',
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
            <select
              id="rpt-centres"
              multiple
              size={4}
              value={selectedCentres}
              onChange={handleCentreSelect}>
              {selectableCentres.map((c) => {
                const code = centreCodeOf(c);
                return <option key={code} value={code}>{centreNameOf(c) || code}</option>;
              })}
            </select>
            <span className="fltdiv-hint">
              {selectedCentres.length === 0
                ? 'All clinics'
                : `${selectedCentres.length} clinic${selectedCentres.length === 1 ? '' : 's'} selected`}
            </span>
          </div>
        ) : (
          <div className="fltdiv">
            <label htmlFor="rpt-centre">Clinic Name</label>
            <select id="rpt-centre" value={sessionCentre} disabled>
              <option value={sessionCentre}>{sessionCentreName}</option>
            </select>
          </div>
        )}

        <div className="report-actions">
          <button className="btn-primary" onClick={handleView} disabled={!dateValid || loading}>
            {loading ? 'Loading…' : 'View'}
          </button>
          <button className="btn-primary" onClick={handleExport} disabled={!hasViewed || filtered.length === 0}>
            Export
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
                      <td>{r.clinicName || centreNameByCode(r.centerCode || r.CENTERCODE) || '—'}</td>
                      <td>{r.createdBy || '—'}</td>
                      <td>{r.invoiceDate || '—'}</td>
                      <td>{invoiceTypeLabel(r)}</td>
                      <td>{r.posInvoiceNo || '—'}</td>
                      <td>{r.zakatInvoiceNo || '—'}</td>
                      <td>{status === 'Resolved' ? (r.resolvedInvoiceNo || '—') : '—'}</td>
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
      )}
    </div>
  );
};

export default EInvoiceDetailedReport;