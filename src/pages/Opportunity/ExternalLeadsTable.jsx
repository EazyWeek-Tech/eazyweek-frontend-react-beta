"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/** -----------------------------
 * Date helpers
 * ----------------------------- */
const toISODateOnly = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(s);
  return Number.isNaN(+dt) ? "" : toISODateOnly(dt);
};

const getTodayInputDate = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDDMMYYYY = (v) => {
  if (!v) return "—";
  const iso = toISODateOnly(v);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
};

const formatDDMMYYYYDash = (v) => {
  if (!v) return "—";
  const iso = toISODateOnly(v);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}-${m}-${y}`;
};

const safe = (v, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : v;

/** -----------------------------
 * Misc helpers
 * ----------------------------- */
const padLeadId = (v, width = 7) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(Math.trunc(n)).padStart(width, "0");
};

const toTimeLabel12h = (hhmmss, ampm) => {
  const t = String(hhmmss || "").trim();
  const ap = String(ampm || "").trim().toUpperCase();
  const m = t.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) return ap ? ap : "";
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  let labelAmpm = ap || (hh >= 12 ? "PM" : "AM");
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${labelAmpm}`;
};

/** -----------------------------
 * SearchableSelect component
 * ----------------------------- */
function SearchableSelect({ options = [], value, onChange, placeholder = "All" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = (opt) => {
    onChange(opt);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
    setQuery("");
  };

  const displayLabel = value || placeholder;

  return (
    <div className="ss-wrap" ref={wrapRef}>
      <div
        className={`ss-control ${open ? "ss-open" : ""}`}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <span className={`ss-value ${!value ? "ss-placeholder" : ""}`}>
          {displayLabel}
        </span>
        <span className="ss-actions">
          {value && (
            <span className="ss-clear" onClick={handleClear} title="Clear">✕</span>
          )}
          <span className="ss-arrow">{open ? "▲" : "▼"}</span>
        </span>
      </div>

      {open && (
        <div className="ss-dropdown">
          <div className="ss-search-wrap">
            <input
              ref={inputRef}
              className="ss-search"
              placeholder="Type to search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="ss-list">
            <div
              className={`ss-item ${!value ? "ss-item-active" : ""}`}
              onClick={() => handleSelect("")}
            >
              All
            </div>
            {filtered.length === 0 && (
              <div className="ss-no-results">No results</div>
            )}
            {filtered.map((opt, i) => (
              <div
                key={i}
                className={`ss-item ${value === opt ? "ss-item-active" : ""}`}
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** -----------------------------
 * API URLs
 * ----------------------------- */
const GET_CAMPAIGN_URL = (oppCode) =>
  `${API_BASE_URL}/api/LeadOpp/getCampaign/${encodeURIComponent(oppCode)}`;

const GET_FILTER_OPTIONS_URL = (oppCode) =>
  `${API_BASE_URL}/api/Opportunity/GetExternalOppFilterOptions/${encodeURIComponent(oppCode)}`;

/** -----------------------------
 * Fetch leads (server-side pagination + filtering)
 * ----------------------------- */
const fetchOppDetails = async ({
  oppCode, fromISO, toISO,
  page = 1, pageSize = 10,
  searchTerm = "", statusFilter = "", ownerFilter = "", dispFilter = ""
}) => {
  const code = String(oppCode || "").trim();
  const from = fromISO ? toISODateOnly(fromISO) : getTodayInputDate();
  const to = toISO ? toISODateOnly(toISO) : getTodayInputDate();

  const payload = {
    oppCode: code,
    fromDate: `${from}T00:00:00.000Z`,
    toDate: `${to}T23:59:59.999Z`,
    pageNumber: page,
    pageSize,
    searchTerm,
    statusFilter,
    ownerFilter,
    dispFilter,
  };

  const res = await fetch(`${API_BASE_URL}/api/Opportunity/LoadExternalOppDetails`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
  const data = JSON.parse(text);

  if (data?.data && Array.isArray(data.data))
    return { rows: data.data, totalCount: data.totalCount ?? data.data.length };
  if (Array.isArray(data))
    return { rows: data, totalCount: data.length };
  return { rows: [], totalCount: 0 };
};

/** -----------------------------
 * Row mapper
 * ----------------------------- */
const normalizeOppStatus = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "1") return "Open";
  if (s === "2") return "Closed";
  const t = s.toLowerCase();
  if (t === "open") return "Open";
  if (t === "closed" || t === "close") return "Closed";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const mapExternalRow = (x) => {
  const oppStatus = normalizeOppStatus(x?.oppStatus);
  return {
    recid: x?.recid ?? x?.recId ?? "",
    custID: (x?.custID ?? "").toString(),
    custName: (x?.custName ?? "").toString(),
    custMobileNo: (x?.custMobileNo ?? "").toString(),
    therapistCode: (x?.therapistCode ?? "").toString().trim(),
    therapistname: (x?.therapistname ?? x?.therapistName ?? "").toString().trim(),
    interestedInCode: (x?.interestedInCode ?? "").toString().trim(),
    interestedInName: (x?.interestedInName ?? "").toString().trim(),
    dispositionCode: (x?.dispositionCode ?? "").toString().trim(),
    disposition: (x?.disposition ?? "").toString().trim(),
    subDispositionCode: (x?.subDispositionCode ?? "").toString().trim(),
    subDisposition: (x?.subDisposition ?? "").toString().trim(),
    followUpDate: (x?.followUpDate ?? "").toString().trim(),
    medium: (x?.medium ?? "").toString().trim(),
    subMedium: (x?.subMedium ?? "").toString().trim(),
    source: (x?.source ?? "").toString().trim(),
    subSource: (x?.subSource ?? "").toString().trim(),
    followUptime: (x?.followUptime ?? "").toString().trim(),
    followUpAMPM: (x?.followUpAMPM ?? "").toString().trim(),
    followUpTimeLabel: toTimeLabel12h(x?.followUptime, x?.followUpAMPM),
    modifieddate: x?.modifieddate ?? x?.modifiedDate ?? "",
    modifiedBy: x?.modifiedBy ?? "",
    oppStatus,
    remarks: (x?.remarks ?? "").toString(),
    salesOwner: (x?.salesOwner ?? "").toString(),
    createddate: x?.createddate ?? x?.createdDate ?? "",
  };
};

/** -----------------------------
 * Main component
 * ----------------------------- */
export default function ExternalLeadsTable({ oppCode, header, onToast }) {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const segmentTypeFromState = location?.state?.segmentType || "";
  const segmentTypeFromUrl = params?.segmentType || "";
  const segmentType = String(segmentTypeFromState || segmentTypeFromUrl || "").trim();
  const isStaticSegment = segmentType.toLowerCase() === "static";

  const fromDateFromUrl = params?.fromDate || "";
  const toDateFromUrl = params?.toDate || "";
  const oppCodeFromUrl = params?.oppCode || params?.OppCode || "";

  const effectiveOppCode = (oppCode || header?.oppCode || oppCodeFromUrl || "")
    .toString().trim();

  // Pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Campaign header
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignErr, setCampaignErr] = useState("");
  const [campaignHeader, setCampaignHeader] = useState(null);

  // Filter options from API
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [dispositionOptions, setDispositionOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Data
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [fromDate, setFromDate] = useState(() => (isStaticSegment ? "" : getTodayInputDate()));
  const [toDate, setToDate] = useState(() => (isStaticSegment ? "" : getTodayInputDate()));
  const [dateTouched, setDateTouched] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    if (isStaticSegment) {
      setFromDate("");
      setToDate("");
    } else {
      setFromDate((p) => (p ? p : getTodayInputDate()));
      setToDate((p) => (p ? p : getTodayInputDate()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaticSegment]);

  // 250ms debounce on search
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchDraft), 250);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // -----------------------------
  // Load campaign header
  // -----------------------------
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const code = effectiveOppCode;
      if (!code) return;
      setCampaignLoading(true);
      setCampaignErr("");
      try {
        const res = await fetch(GET_CAMPAIGN_URL(code), {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
        const data = JSON.parse(text);
        if (!alive) return;
        const minimal = data ? {
          oppCode: (data.oppCode ?? "").toString().trim(),
          oppName: (data.oppName ?? "").toString().trim(),
          oRuleCode: (data.oRuleCode ?? "").toString().trim(),
          type: (data.oRuleDetails ?? data.oRuleCode ?? "").toString().trim(),
          oppCampStartDate: data.oppCampStartDate ?? "",
          oppCampEndDate: data.oppCampEndDate ?? "",
        } : null;
        setCampaignHeader(minimal);
      } catch (e) {
        console.error("Campaign header load failed", e);
        if (!alive) return;
        setCampaignHeader(null);
        setCampaignErr("Failed to load campaign details.");
      } finally {
        if (alive) setCampaignLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [effectiveOppCode]);

  const uiHeader = campaignHeader || header || {};
  const uiOppCode = (uiHeader?.oppCode || effectiveOppCode || "").toString().trim();
  const isR7 = String(uiHeader?.oRuleCode || "").trim().toUpperCase() === "R7";

  // -----------------------------
  // Load filter options (owners + dispositions)
  // -----------------------------
  useEffect(() => {
    if (!uiOppCode || !isR7) return;
    let alive = true;

    const run = async () => {
      setOptionsLoading(true);
      try {
        const res = await fetch(GET_FILTER_OPTIONS_URL(uiOppCode), {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = JSON.parse(text);
        if (!alive) return;
        setOwnerOptions(data?.owners ?? []);
        setDispositionOptions(data?.dispositions ?? []);
      } catch (e) {
        console.error("Filter options load failed", e);
      } finally {
        if (alive) setOptionsLoading(false);
      }
    };

    run();
    return () => { alive = false; };
  }, [uiOppCode, isR7]);

  // -----------------------------
  // Load leads — server-side pagination + filtering
  // -----------------------------
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!uiOppCode) return;
      if (campaignHeader && !isR7) {
        setRows([]);
        setTotalCount(0);
        setErr("");
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr("");
      try {
        const apiFrom = isStaticSegment ? getTodayInputDate() : (fromDate || getTodayInputDate());
        const apiTo = isStaticSegment ? getTodayInputDate() : (toDate || getTodayInputDate());

        const { rows: list, totalCount: count } = await fetchOppDetails({
          oppCode: uiOppCode,
          fromISO: apiFrom,
          toISO: apiTo,
          page,
          pageSize: PAGE_SIZE,
          searchTerm,
          statusFilter,
          ownerFilter,
          dispFilter: dispositionFilter,
        });

        if (!alive) return;
        setRows((list || []).map(mapExternalRow));
        setTotalCount(count);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setRows([]);
        setTotalCount(0);
        setErr(e?.message || "Failed to load external leads.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [uiOppCode, isR7, campaignHeader, fromDate, toDate, isStaticSegment,
      page, searchTerm, statusFilter, ownerFilter, dispositionFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, ownerFilter, dispositionFilter, sortKey, sortDir, fromDate, toDate]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  // Client-side sort only (server handles filtering)
  const pagedRows = useMemo(() => {
    if (!sortKey) return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = (a?.[sortKey] ?? "").toString().toLowerCase();
      const bv = (b?.[sortKey] ?? "").toString().toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const SortMark = ({ k }) => (
    <span className="sort" title="Sort" onClick={() => toggleSort(k)} role="button">↕</span>
  );

  const renderPageButtons = () => {
    const windowSize = 5;
    let start = Math.max(1, safePage - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const nodes = [];
    if (start > 1) {
      nodes.push(<button key="p1" className="pager-num" onClick={() => setPage(1)}>1</button>);
      if (start > 2) nodes.push(<span key="dots1" className="pager-dots">…</span>);
    }
    for (let i = start; i <= end; i++) {
      nodes.push(
        <button key={`p${i}`} className={`pager-num ${i === safePage ? "active" : ""}`} onClick={() => setPage(i)}>
          {i}
        </button>
      );
    }
    if (end < totalPages) {
      if (end < totalPages - 1) nodes.push(<span key="dots2" className="pager-dots">…</span>);
      nodes.push(
        <button key={`p${totalPages}`} className="pager-num" onClick={() => setPage(totalPages)}>
          {totalPages}
        </button>
      );
    }
    return nodes;
  };

  const goToExternalLeadForm = (row) => {
    const leadOppId = row?.recid || row?.recId || "";
    navigate(
      `/opportunity/external/${encodeURIComponent(uiOppCode)}/lead/${encodeURIComponent(leadOppId)}`,
      { state: { oppCode: uiOppCode, header: uiHeader, row, leadKind: "External", leadOppId } }
    );
  };

  return (
    <>
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate("/opportunity")}>Opportunity</span>
        {" > "}
        <span className="breadcrumb-current">Details</span>
      </div>

      <div className="details-card">
        <div className="details-header">
          <div className="title-col">
            <div className="pair">
              <span className="label">Opportunity Code :</span>
              <span className="value pill">{safe(uiHeader?.oppCode || uiOppCode)}</span>
            </div>
            <div className="pair">
              <span className="label">Opportunity Name :</span>
              <span className="value">{safe(uiHeader?.oppName)}</span>
            </div>
            <div className="pair">
              <span className="label">Rule Details :</span>
              <span className="value">External Source</span>
            </div>
            {fromDateFromUrl || toDateFromUrl ? (
              <div className="pair">
                <span className="label">Campaign Period :</span>
                <span className="value">
                  {formatDDMMYYYYDash(fromDateFromUrl)} - {formatDDMMYYYYDash(toDateFromUrl)}
                </span>
              </div>
            ) : null}
            {campaignLoading ? <div style={{ fontSize: 12, color: "#64748b" }}>Loading campaign…</div> : null}
            {campaignErr ? <div style={{ fontSize: 12, color: "#c33" }}>{campaignErr}</div> : null}
            {!campaignLoading && campaignHeader && !isR7 ? (
              <div style={{ fontSize: 12, color: "#c33" }}>
                This page is only for External Rule <strong>R7</strong>.
              </div>
            ) : null}
          </div>
          <div className="header-actions">
            <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-card">
          <div className="filters-grid">

            <div className="fgroup">
              <label className="flabel">Status :</label>
              <select className="finput" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="fgroup">
              <label className="flabel">
                Sales Owner :
                {optionsLoading && <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>loading…</span>}
              </label>
              <SearchableSelect
                options={ownerOptions}
                value={ownerFilter}
                onChange={setOwnerFilter}
                placeholder="All Owners"
              />
            </div>

            <div className="fgroup">
              <label className="flabel">From :</label>
              <input
                type="date"
                className="finput"
                value={fromDate}
                onChange={(e) => { setDateTouched(true); setFromDate(e.target.value); }}
              />
            </div>

            <div className="fgroup">
              <label className="flabel">To :</label>
              <input
                type="date"
                className="finput"
                value={toDate}
                onChange={(e) => { setDateTouched(true); setToDate(e.target.value); }}
              />
            </div>

            <div className="fgroup">
              <label className="flabel">
                Disposition :
                {optionsLoading && <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>loading…</span>}
              </label>
              <SearchableSelect
                options={dispositionOptions}
                value={dispositionFilter}
                onChange={setDispositionFilter}
                placeholder="All Dispositions"
              />
            </div>

          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: 12, marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
          <input
            className="finput"
            style={{ width: 320 }}
            placeholder="Search (Customer, Mobile, Remarks)"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>

        {loading ? <div className="loading-msg">Loading…</div> : null}
        {err ? <div className="loading-msg" style={{ color: "#c33" }}>{err}</div> : null}

        {!loading && !err && pagedRows.length ? (
          <>
            <div className="table-wrap">
              <table className="opptable">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("custID")}>Lead ID <SortMark k="custID" /></th>
                    <th onClick={() => toggleSort("custName")}>Lead Name <SortMark k="custName" /></th>
                    <th onClick={() => toggleSort("custMobileNo")}>MobileNo <SortMark k="custMobileNo" /></th>
                    <th onClick={() => toggleSort("oppStatus")}>Status <SortMark k="oppStatus" /></th>
                    <th onClick={() => toggleSort("disposition")}>Disposition <SortMark k="disposition" /></th>
                    <th onClick={() => toggleSort("remarks")}>Remarks <SortMark k="remarks" /></th>
                    <th onClick={() => toggleSort("salesOwner")}>Sales Owner <SortMark k="salesOwner" /></th>
                    <th onClick={() => toggleSort("modifiedBy")}>Modified By <SortMark k="modifiedBy" /></th>
                    <th onClick={() => toggleSort("modifieddate")}>Modified Date <SortMark k="modifieddate" /></th>
                    <th onClick={() => toggleSort("createddate")}>Created Date <SortMark k="createddate" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r, idx) => (
                    <tr key={`${r.recid || "x"}-${idx}`}>
                      <td>
                        <span
                          className="leadLink"
                          role="button"
                          tabIndex={0}
                          onClick={() => goToExternalLeadForm(r)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") goToExternalLeadForm(r); }}
                          title="Open Lead"
                        >
                          {r.recid ? `LD-EX-${padLeadId(r.recid)}` : "—"}
                        </span>
                      </td>
                      <td>{safe(r.custName)}</td>
                      <td>{safe(r.custMobileNo)}</td>
                      <td>{safe(r.oppStatus)}</td>
                      <td>{safe(r.disposition)}</td>
                      <td>{safe(r.remarks)}</td>
                      <td>{safe(r.salesOwner)}</td>
                      <td>{safe(r.modifiedBy)}</td>
                      <td>{formatDDMMYYYY(r.modifieddate)}</td>
                      <td>{formatDDMMYYYY(r.createddate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pager">
              <div className="pager-left">
                Showing{" "}
                <strong>{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalCount)}</strong>{" "}
                of <strong>{totalCount}</strong>
              </div>
              <div className="pager-right">
                <button className="pager-btn" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </button>
                {renderPageButtons()}
                <button className="pager-btn" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}

        {!loading && !err && !pagedRows.length ? (
          <div className="empty-note">No entries found.</div>
        ) : null}
      </div>

      <style jsx>{`
        .details-card { background: #fff; padding: 24px 0; }

        .leadLink { color: #334b71; font-weight: 700; cursor: pointer; }
        .leadLink:hover { opacity: 0.85; }

        .details-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
        .title-col { display: grid; gap: 8px; }
        .pair { font-size: 16px; color: #333; }
        .label { display: inline-block; font-weight: 600; color: #555; margin-right: 8px; min-width: 180px; }
        .value { color: #222; }
        .pill { background: #eef3ff; color: #334b71; padding: 4px 10px; border-radius: 20px; font-size: 14px; }
        .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-back { background: #14233c; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; font-weight: 600; cursor: pointer; }
        .btn-back:hover { opacity: 0.95; }

        .filters-card { background: #f7f9fc; border: 1px solid #e6eaf2; border-radius: 10px; padding: 16px; margin-top: 10px; }
        .filters-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px 16px; align-items: end; }
        .fgroup { grid-column: span 3; position: relative; }
        .flabel { display: block; font-size: 13px; color: #475569; margin-bottom: 6px; font-weight: 600; }
        .finput { width: 100%; height: 36px; border: 1px solid #d7ddea; border-radius: 6px; padding: 6px 10px; background: #fff; color: #222; box-sizing: border-box; }

        /* SearchableSelect styles */
        .ss-wrap { position: relative; width: 100%; }
        .ss-control {
          display: flex; align-items: center; justify-content: space-between;
          height: 36px; border: 1px solid #d7ddea; border-radius: 6px;
          padding: 0 10px; background: #fff; cursor: pointer;
          font-size: 14px; color: #222; box-sizing: border-box;
          user-select: none;
        }
        .ss-control.ss-open { border-color: #334b71; box-shadow: 0 0 0 2px #eef3ff; }
        .ss-value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ss-placeholder { color: #94a3b8; }
        .ss-actions { display: flex; align-items: center; gap: 6px; margin-left: 6px; flex-shrink: 0; }
        .ss-clear { font-size: 11px; color: #94a3b8; cursor: pointer; line-height: 1; padding: 2px; }
        .ss-clear:hover { color: #c33; }
        .ss-arrow { font-size: 10px; color: #64748b; }
        .ss-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: #fff; border: 1px solid #d7ddea; border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 9999;
          overflow: hidden;
        }
        .ss-search-wrap { padding: 8px; border-bottom: 1px solid #f0f2f6; }
        .ss-search {
          width: 100%; height: 32px; border: 1px solid #d7ddea; border-radius: 6px;
          padding: 4px 10px; font-size: 13px; color: #222; box-sizing: border-box;
          outline: none;
        }
        .ss-search:focus { border-color: #334b71; }
        .ss-list { max-height: 220px; overflow-y: auto; }
        .ss-item {
          padding: 9px 12px; font-size: 13px; color: #333;
          cursor: pointer; transition: background 0.12s;
        }
        .ss-item:hover { background: #f1f5ff; }
        .ss-item-active { background: #eef3ff; color: #334b71; font-weight: 600; }
        .ss-no-results { padding: 10px 12px; font-size: 13px; color: #94a3b8; }

        .table-wrap { margin-top: 16px; overflow-x: auto; border-radius: 10px; }
        .opptable { width: 100%; border-collapse: collapse; min-width: 1200px; }
        .opptable thead th {
          text-align: left; font-weight: 600; font-size: 14px; color: #445;
          background: #f6f8fb; padding: 12px 14px; border-bottom: 1px solid #e8edf5;
          white-space: nowrap; user-select: none; cursor: pointer;
        }
        .opptable tbody td {
          font-size: 14px; color: #333; padding: 12px 14px;
          border-bottom: 1px solid #f0f2f6; vertical-align: middle; white-space: nowrap;
        }
        .opptable tbody tr:hover { background: #fafbfe; }
        .sort { margin-left: 8px; opacity: 0.7; cursor: pointer; }

        .empty-note {
          margin-top: 12px; padding: 14px; background: #f9fafc;
          border: 1px dashed #e6eaf2; border-radius: 8px; color: #5c6b7a; font-size: 14px;
        }
        .loading-msg { padding: 40px; text-align: center; font-size: 18px; color: #666; }

        .pager { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .pager-left { font-size: 13px; color: #64748b; }
        .pager-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .pager-btn { height: 34px; padding: 0 12px; border: 1px solid #d7ddea; background: #fff; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .pager-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pager-num { height: 34px; min-width: 34px; padding: 0 10px; border: 1px solid #d7ddea; background: #fff; border-radius: 8px; cursor: pointer; }
        .pager-num.active { background: #14233c; color: #fff; border-color: #14233c; }
        .pager-dots { padding: 0 6px; color: #64748b; }

        .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 12px; }
        .breadcrumb-link { cursor: pointer; color: #334b71; font-weight: 600; }
        .breadcrumb-link:hover { text-decoration: underline; }
        .breadcrumb-current { color: #64748b; }
      `}</style>
    </>
  );
}