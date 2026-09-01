// src/pages/Reports/TopServicesReport.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ---- constants ---- */
const REPORT_ACTIVITY = "RPT.TOP_SERVICES";
const ALL = "All";
const MULTI_DELIM = "|";
const DEFAULT_SORT = { key: "timesPurchased", dir: "desc" };

const COLUMNS = [
  { key: "centre",               label: "Centre",                                kind: "text"  },
  { key: "serviceId",            label: "Service ID",                            kind: "text"  },
  { key: "serviceName",          label: "Service Name",                          kind: "text"  },
  { key: "serviceCategory",      label: "Service Category",                      kind: "text"  },
  { key: "serviceSubcategory",   label: "Service Subcategory",                   kind: "text"  },
  { key: "timesPurchased",       label: "Number of Times Purchased",             kind: "num"   },
  { key: "totalSalesWithoutVAT", label: "Total Sales without VAT",               kind: "money" },
  { key: "averageSalePrice",     label: "Average Sale Price",                    kind: "money" },
];

const HTTP_MESSAGES = {
  401: "Your session has expired. Sign in again to run this report.",
  403: "You don't have permission to view the Top Performing Services report. Ask an administrator to grant the Top Performing Services report permission (RPT.TOP_SERVICES).",
  404: "The report service isn't responding at the expected address. Contact support.",
  408: "The report took too long to build. Narrow the date range and try again.",
  500: "The server couldn't build the report. Try again, and contact support if it keeps happening.",
  502: "The report service is unavailable right now. Try again in a moment.",
  503: "The report service is unavailable right now. Try again in a moment.",
  504: "The report took too long to build. Narrow the date range and try again.",
};

/* ---- helpers ---- */
const norm = (s) => (s ?? "").toString().trim();
const pad2 = (n) => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const firstOfMonthISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`; };
const toDDMMYYYY = (v) => { const [y, m, d] = norm(v).slice(0, 10).split("-"); return y && m && d ? `${d}/${m}/${y}` : norm(v); };
const nf = new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfInt = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const isTopXValid = (s) => s === "" || (/^\d+$/.test(s) && Number(s) >= 1);

function getToken() {
  if (typeof window === "undefined") return "";
  for (const store of [window.localStorage, window.sessionStorage]) {
    if (!store) continue;
    for (const k of ["token", "accessToken", "jwt", "authToken"]) {
      const t = store.getItem(k);
      if (t) return t.replace(/^"|"$/g, "");
    }
  }
  return "";
}

const authGet = async (url) => {
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  } catch {
    const netErr = new Error("Can't reach the server. Check your connection and try again.");
    netErr.status = 0;
    throw netErr;
  }
  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const serverMsg = (payload?.message || payload?.error || "").toString().trim();
    const err = new Error(serverMsg || HTTP_MESSAGES[res.status] || `The report couldn't be loaded (error ${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return Array.isArray(payload) ? payload : (payload?.data ?? payload);
};

/* ---- multi-select ---- */
const MultiSelect = ({ label, values, onChange, items, render, sx, disabled, disabledTitle }) => {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef             = useRef(null);

  const opts = useMemo(() => (items || []).map((o) => (render ? render(o) : { val: o, text: o })), [items, render]);

  useEffect(() => { if (disabled && open) setOpen(false); }, [disabled, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = values || [];
  const toggle = (val) => onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  const summary = selected.length === 0 ? ALL
    : selected.length === 1 ? (opts.find((o) => o.val === selected[0])?.text || selected[0])
    : `${selected.length} selected`;
  const visible = search ? opts.filter((o) => String(o.text).toLowerCase().includes(search.toLowerCase())) : opts;

  return (
    <div style={sx.field} ref={wrapRef}>
      <label style={sx.label}>{label}</label>
      <button
        type="button"
        disabled={disabled}
        style={{ ...sx.input, ...sx.msButton, ...(selected.length && !disabled ? sx.msButtonActive : {}), ...(disabled ? sx.msButtonDisabled : {}) }}
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        title={disabled ? disabledTitle : (selected.length > 1 ? summary : undefined)}
      >
        <span style={sx.msSummary}>{summary}</span>
        {!disabled && <span style={sx.msCaret}>▾</span>}
      </button>
      {open && !disabled && (
        <div style={sx.msPanel}>
          <div style={sx.msTools}>
            <input style={sx.msSearch} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            <button type="button" style={sx.msLink} onClick={() => onChange(visible.map((o) => o.val))}>Select all</button>
            <button type="button" style={sx.msLink} onClick={() => onChange([])}>Clear</button>
          </div>
          <div style={sx.msList}>
            {visible.length === 0 && <div style={sx.msEmpty}>No matches</div>}
            {visible.map((o, i) => (
              <label key={`${o.val}-${i}`} style={sx.msRow}>
                <input type="checkbox" checked={selected.includes(o.val)} onChange={() => toggle(o.val)} />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---- component ---- */
const TopServicesReport = () => {
  const perms = usePermissions() || {};
  const canView = typeof perms.hasPermission === "function" ? perms.hasPermission(REPORT_ACTIVITY) : true;

  const [dateRange, setDateRange]     = useState("all");
  const [fromDate, setFromDate]       = useState(firstOfMonthISO());
  const [toDate, setToDate]           = useState(todayISO());
  const [centre, setCentre]           = useState([]);
  const [category, setCategory]       = useState([]);
  const [subcategory, setSubcategory] = useState([]);
  const [practitioner, setPractitioner] = useState(ALL);
  const [topX, setTopX]               = useState("");

  const [options, setOptions] = useState({
    centres: [], categories: [], subcategories: [], practitioners: [],
    centreLocked: true, lockedCentre: null, currency: "SAR",
  });
  const [optionsReady, setOptionsReady] = useState(false);

  const [rows, setRows]           = useState([]);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hasViewed, setHasViewed] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [perPage, setPerPage]     = useState(25);
  const [page, setPage]           = useState(1);
  const [sortKey, setSortKey]     = useState(DEFAULT_SORT.key);
  const [sortDir, setSortDir]     = useState(DEFAULT_SORT.dir);

  const currency = options.currency || "SAR";
  const fmtMoney = useCallback((v) => `${currency} ${nf.format(Number(v || 0))}`, [currency]);

  /* ---- validation ---- */
  const dateError = dateRange === "custom"
    ? (!fromDate || !toDate ? "Select both From Date and To Date."
      : (toDate < fromDate ? "To Date cannot be earlier than From Date." : ""))
    : "";
  const topXError = isTopXValid(topX) ? "" : "Top X Services must be a whole number of 1 or more.";
  const formValid = !dateError && !topXError;

  /* ---- filter options ---- */
  useEffect(() => {
    if (!canView) return undefined;
    let alive = true;
    (async () => {
      try {
        const data = await authGet(`${API_BASE_URL}/api/TopServicesReport/FilterOptions`);
        if (!alive || !data) return;
        setOptions((prev) => ({
          ...prev,
          centres:       data.centres || [],
          categories:    data.categories || [],
          subcategories: data.subcategories || [],
          practitioners: data.practitioners || [],
          centreLocked:  !!data.centreLocked,
          lockedCentre:  data.lockedCentre || null,
          currency:      data.currency || prev.currency,
        }));
        if (data.centreLocked) {
          const only = data.lockedCentre || data.centres?.[0]?.code;
          if (only) setCentre([only]);
        }
      } catch (e) {
        if (alive && (e.status === 401 || e.status === 403)) setError(e.message);
      } finally {
        if (alive) setOptionsReady(true);
      }
    })();
    return () => { alive = false; };
  }, [canView]);

  /* ---- load report ---- */
  const loadReport = useCallback(async () => {
    if (!formValid) { setError(dateError || topXError); return; }
    setError("");
    setLoading(true);
    try {
      const many = (arr) => (arr && arr.length ? arr.join(MULTI_DELIM) : "");
      const params = { dateRange };
      if (dateRange === "custom") { params.fromDate = fromDate; params.toDate = toDate; }
      if (centre.length)      params.centreCodes      = many(centre);
      if (category.length)    params.categoryCodes    = many(category);
      if (subcategory.length) params.subcategoryCodes = many(subcategory);
      if (practitioner && practitioner !== ALL) params.practitionerId = practitioner;
      const qs = new URLSearchParams(params).toString();
      const data = await authGet(`${API_BASE_URL}/api/TopServicesReport?${qs}`);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      if (data?.currency) setOptions((prev) => ({ ...prev, currency: data.currency }));
      setAppliedFilters({ dateRange, fromDate, toDate, centre: [...centre], category: [...category], subcategory: [...subcategory], practitioner, topX });
      setHasViewed(true);
      setPage(1);
    } catch (e) {
      setRows([]);
      setHasViewed(true);
      setError(e.message || "Couldn't load the report. Try again.");
    } finally {
      setLoading(false);
    }
  }, [formValid, dateError, topXError, dateRange, fromDate, toDate, centre, category, subcategory, practitioner, topX]);

  const autoLoaded = useRef(false);
  useEffect(() => {
    if (!canView || !optionsReady || autoLoaded.current || error) return;
    autoLoaded.current = true;
    loadReport();
  }, [canView, optionsReady, error, loadReport]);

  const handleReset = () => {
    setDateRange("all");
    setFromDate(firstOfMonthISO());
    setToDate(todayISO());
    if (!options.centreLocked) setCentre([]);
    setCategory([]); setSubcategory([]); setPractitioner(ALL); setTopX("");
    setSortKey(DEFAULT_SORT.key); setSortDir(DEFAULT_SORT.dir);
    setRows([]); setAppliedFilters(null); setHasViewed(false); setError(""); setPage(1);
    autoLoaded.current = false;
  };

  /* ---- cascade ---- */
  const visibleSubcategories = useMemo(() => {
    const subs = options.subcategories || [];
    if (!category.length) return subs;
    return subs.filter((s) => !s.categoryCode || category.includes(s.categoryCode));
  }, [options.subcategories, category]);

  const handleCategoryChange = useCallback((next) => {
    setCategory(next);
    setSubcategory((prev) => {
      if (!prev.length || !next.length) return prev;
      const allowed = new Set((options.subcategories || []).filter((s) => !s.categoryCode || next.includes(s.categoryCode)).map((s) => s.code));
      return prev.filter((v) => allowed.has(v));
    });
  }, [options.subcategories]);

  const byCode = useCallback((o) => ({ val: o.code, text: o.name || o.code }), []);

  /* ---- sort / top x / paging ---- */
  const compareRows = useCallback((a, b, col, dir) => {
    const mul = dir === "desc" ? -1 : 1;
    const av = a[col.key], bv = b[col.key];
    const aBlank = av == null || av === "";
    const bBlank = bv == null || bv === "";
    if (aBlank && bBlank) return 0;
    if (aBlank) return 1;
    if (bBlank) return -1;
    if (col.kind === "money" || col.kind === "num") return (Number(av) - Number(bv)) * mul;
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * mul;
  }, []);

  const sortedRows = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey) || COLUMNS.find((c) => c.key === DEFAULT_SORT.key);
    return [...rows].sort((a, b) => compareRows(a, b, col, sortDir) || compareRows(a, b, COLUMNS[2], "asc"));
  }, [rows, sortKey, sortDir, compareRows]);

  const appliedTopX = appliedFilters && isTopXValid(appliedFilters.topX) && appliedFilters.topX !== "" ? Number(appliedFilters.topX) : null;
  const displayRows = useMemo(() => (appliedTopX ? sortedRows.slice(0, appliedTopX) : sortedRows), [sortedRows, appliedTopX]);

  const handleSort = (key) => {
    setPage(1);
    if (sortKey === key) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); return; }
    setSortKey(key);
    setSortDir(key === "timesPurchased" || key === "totalSalesWithoutVAT" || key === "averageSalePrice" ? "desc" : "asc");
  };

  const totalPages = Math.max(1, Math.ceil(displayRows.length / perPage));
  const pageRows = useMemo(() => displayRows.slice((page - 1) * perPage, page * perPage), [displayRows, page, perPage]);

  const totals = useMemo(() => ({
    timesPurchased:       displayRows.reduce((s, r) => s + Number(r.timesPurchased || 0), 0),
    totalSalesWithoutVAT: displayRows.reduce((s, r) => s + Number(r.totalSalesWithoutVAT || 0), 0),
  }), [displayRows]);

  /* ---- filter summary ---- */
  const nameOf = (list, code) => (list || []).find((o) => o.code === code)?.name || code;
  const summaryText = useMemo(() => {
    if (!appliedFilters) return "";
    const f = appliedFilters;
    const parts = [
      `Centre: ${f.centre.length ? f.centre.map((c) => nameOf(options.centres, c)).join(", ") : ALL}`,
      `Date Range: ${f.dateRange === "all" ? "All Time" : `${toDDMMYYYY(f.fromDate)} to ${toDDMMYYYY(f.toDate)}`}`,
      `Service Category: ${f.category.length ? f.category.map((c) => nameOf(options.categories, c)).join(", ") : ALL}`,
      `Service Subcategory: ${f.subcategory.length ? f.subcategory.map((c) => nameOf(options.subcategories, c)).join(", ") : ALL}`,
      `Practitioner: ${f.practitioner && f.practitioner !== ALL ? nameOf(options.practitioners, f.practitioner) : ALL}`,
      `Top X Services: ${f.topX ? f.topX : "No limit"}`,
    ];
    return parts.join("  |  ");
  }, [appliedFilters, options]);

  /* ---- export ---- */
  const handleExport = () => {
    if (!displayRows.length) return;
    const aoa = [
      [summaryText],
      [],
      COLUMNS.map((c) => (c.kind === "money" ? `${c.label} (${currency})` : c.label)),
      ...displayRows.map((r) => COLUMNS.map((c) => {
        const v = r[c.key];
        if (c.kind === "money" || c.kind === "num") return v == null || v === "" ? "" : Number(v);
        return norm(v);
      })),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: COLUMNS.length - 1 } }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Top Performing Services");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const tag = appliedFilters?.dateRange === "custom" ? `${appliedFilters.fromDate}_to_${appliedFilters.toDate}` : "AllTime";
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `TopPerformingServices_${tag}.xlsx`);
  };

  /* ---- styles ---- */
  const sx = {
    page:    { padding: 20, fontFamily: "Lato, system-ui, sans-serif", color: "#05224C" },
    h1:      { fontSize: 20, fontWeight: 700, margin: "0 0 4px" },
    sub:     { fontSize: 13, color: "#5b6b7a", margin: "0 0 16px" },
    card:    { background: "#fff", border: "1px solid #e3e9f0", borderRadius: 10, padding: 16, marginBottom: 16 },
    filters: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 },
    field:   { display: "flex", flexDirection: "column", gap: 4, position: "relative" },
    msButton:         { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", textAlign: "left", background: "#fff" },
    msButtonActive:   { borderColor: "#18396E", color: "#18396E", fontWeight: 600 },
    msButtonDisabled: { background: "#f4f6f9", color: "#5b6b80", cursor: "not-allowed", opacity: 1 },
    msSummary: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    msCaret:   { fontSize: 10, opacity: 0.6, flexShrink: 0 },
    msPanel:   { position: "absolute", zIndex: 40, top: "100%", left: 0, marginTop: 4, minWidth: "100%", maxWidth: 320, background: "#fff", border: "1px solid #dce4ee", borderRadius: 6, boxShadow: "0 8px 24px rgba(5,34,76,0.14)" },
    msTools:   { display: "flex", alignItems: "center", gap: 6, padding: 8, borderBottom: "1px solid #eef2f7" },
    msSearch:  { flex: 1, minWidth: 0, padding: "4px 6px", border: "1px solid #dce4ee", borderRadius: 4, fontSize: 12 },
    msLink:    { background: "none", border: "none", padding: 0, color: "#18396E", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" },
    msList:    { maxHeight: 220, overflowY: "auto", padding: 4 },
    msRow:     { display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", fontSize: 13, cursor: "pointer", borderRadius: 4 },
    msEmpty:   { padding: "10px 6px", fontSize: 12, color: "#7c8a9e", textAlign: "center" },
    label:   { fontSize: 12, fontWeight: 600, color: "#33475b" },
    input:   { height: 34, border: "1px solid #cdd7e2", borderRadius: 6, padding: "0 8px", fontSize: 13, background: "#fff" },
    inputError: { borderColor: "#b91c1c" },
    fieldError: { fontSize: 11.5, color: "#b91c1c", marginTop: 2 },
    toggle:  { display: "flex", border: "1px solid #cdd7e2", borderRadius: 6, overflow: "hidden", height: 34 },
    toggleBtn: { flex: 1, border: "none", background: "#fff", color: "#33475b", fontSize: 13, cursor: "pointer", fontWeight: 600 },
    toggleOn:  { background: "#18396E", color: "#fff" },
    actions: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" },
    btn:     { height: 36, padding: "0 16px", borderRadius: 6, border: "1px solid transparent", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    primary: { background: "#18396E", color: "#fff" },
    ghost:   { background: "#fff", color: "#18396E", borderColor: "#cdd7e2" },
    summaryLine: { fontSize: 12.5, color: "#33475b", background: "#f7f9fc", border: "1px solid #e3e9f0", borderRadius: 6, padding: "8px 10px", marginBottom: 12 },
    summary: { display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, marginBottom: 10 },
    sumItem: { display: "flex", flexDirection: "column" },
    sumVal:  { fontWeight: 700, fontSize: 15 },
    scroll:  { overflowX: "auto", border: "1px solid #e3e9f0", borderRadius: 8 },
    table:   { borderCollapse: "collapse", width: "100%", fontSize: 12.5 },
    th:      { position: "sticky", top: 0, background: "#f2f6fb", borderBottom: "2px solid #dce4ee", padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 700, cursor: "pointer", userSelect: "none" },
    thNum:   { textAlign: "right" },
    thActive:{ background: "#e4edf9", color: "#18396E" },
    sortMark:{ marginLeft: 6, fontSize: 10, opacity: 0.55 },
    td:      { borderBottom: "1px solid #eef2f7", padding: "7px 10px", whiteSpace: "nowrap" },
    tdNum:   { textAlign: "right", fontVariantNumeric: "tabular-nums" },
    rank:    { color: "#7c8a9e", width: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" },
    pager:   { display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, flexWrap: "wrap" },
    empty:   { padding: 40, textAlign: "center", color: "#5b6b7a" },
  };

  if (!canView) {
    return (
      <div style={sx.page}>
        <h1 style={sx.h1}>Top Performing Services</h1>
        <div style={{ ...sx.card, ...sx.empty }}>You don't have access to this report. Ask an administrator for the Top Performing Services report permission.</div>
      </div>
    );
  }

  const fmtCell = (row, col) => {
    const v = row[col.key];
    if (col.kind === "money") return fmtMoney(v);
    if (col.kind === "num")   return v == null || v === "" ? "—" : nfInt.format(Number(v));
    return norm(v) || "—";
  };

  return (
    <div style={sx.page}>
      <h1 style={sx.h1}>Top Performing Services</h1>
      <p style={sx.sub}>Services ranked by purchase volume and revenue per centre. Values exclude VAT and are net of refunds.</p>

      {/* ===== FILTERS ===== */}
      <div style={sx.card}>
        <div style={sx.filters}>
          <MultiSelect
            label="Centre" values={centre} onChange={setCentre} sx={sx}
            disabled={options.centreLocked} disabledTitle="Your account is limited to this centre"
            items={options.centres} render={byCode}
          />

          <div style={sx.field}>
            <label style={sx.label}>Date Range</label>
            <div style={sx.toggle}>
              <button type="button" style={{ ...sx.toggleBtn, ...(dateRange === "all" ? sx.toggleOn : {}) }} onClick={() => setDateRange("all")}>All Time</button>
              <button type="button" style={{ ...sx.toggleBtn, ...(dateRange === "custom" ? sx.toggleOn : {}) }} onClick={() => setDateRange("custom")}>Custom Range</button>
            </div>
          </div>

          {dateRange === "custom" && (
            <>
              <div style={sx.field}>
                <label style={sx.label}>From Date <span style={{ color: "#b91c1c" }}>*</span></label>
                <input style={{ ...sx.input, ...(dateError ? sx.inputError : {}) }} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div style={sx.field}>
                <label style={sx.label}>To Date <span style={{ color: "#b91c1c" }}>*</span></label>
                <input style={{ ...sx.input, ...(dateError ? sx.inputError : {}) }} type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
                {dateError && <span style={sx.fieldError}>{dateError}</span>}
              </div>
            </>
          )}

          <MultiSelect label="Service Category" values={category} onChange={handleCategoryChange} items={options.categories} render={byCode} sx={sx} />
          <MultiSelect label="Service Subcategory" values={subcategory} onChange={setSubcategory} items={visibleSubcategories} render={byCode} sx={sx} />

          <div style={sx.field}>
            <label style={sx.label}>Practitioner</label>
            <select style={sx.input} value={practitioner} onChange={(e) => setPractitioner(e.target.value)}>
              <option value={ALL}>All</option>
              {(options.practitioners || []).map((p, i) => <option key={`${p.code}-${i}`} value={p.code}>{p.name || p.code}</option>)}
            </select>
          </div>

          <div style={sx.field}>
            <label style={sx.label}>Top X Services</label>
            <input
              style={{ ...sx.input, ...(topXError ? sx.inputError : {}) }}
              type="number" min="1" step="1" inputMode="numeric" placeholder="No limit"
              value={topX} onChange={(e) => setTopX(e.target.value.trim())}
            />
            {topXError && <span style={sx.fieldError}>{topXError}</span>}
          </div>
        </div>

        <div style={sx.actions}>
          <button style={{ ...sx.btn, ...sx.primary, opacity: formValid ? 1 : 0.6 }} onClick={loadReport} disabled={loading || !formValid}>
            {loading ? "Loading…" : "View"}
          </button>
          <button style={{ ...sx.btn, ...sx.ghost }} onClick={handleExport} disabled={!displayRows.length}>Export to Excel</button>
          <button style={{ ...sx.btn, ...sx.ghost }} onClick={handleReset}>Reset</button>
        </div>
        {error && <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 10 }}>{error}</div>}
      </div>

      {/* ===== RESULTS ===== */}
      {hasViewed && (
        <div style={sx.card}>
          {summaryText && <div style={sx.summaryLine}>{summaryText}</div>}

          {displayRows.length === 0 ? (
            <div style={sx.empty}>No data available for the selected filters.</div>
          ) : (
            <>
              <div style={sx.summary}>
                <div style={sx.sumItem}><span>Services shown</span><span style={sx.sumVal}>{displayRows.length}{appliedTopX && rows.length > appliedTopX ? ` of ${rows.length}` : ""}</span></div>
                <div style={sx.sumItem}><span>Total purchases</span><span style={sx.sumVal}>{nfInt.format(totals.timesPurchased)}</span></div>
                <div style={sx.sumItem}><span>Total sales without VAT</span><span style={sx.sumVal}>{fmtMoney(totals.totalSalesWithoutVAT)}</span></div>
              </div>

              <div style={sx.scroll}>
                <table style={sx.table}>
                  <thead>
                    <tr>
                      <th style={{ ...sx.th, ...sx.thNum, cursor: "default" }}>#</th>
                      {COLUMNS.map((c) => {
                        const active = sortKey === c.key;
                        const numeric = c.kind === "money" || c.kind === "num";
                        return (
                          <th
                            key={c.key}
                            style={{ ...sx.th, ...(numeric ? sx.thNum : {}), ...(active ? sx.thActive : {}) }}
                            onClick={() => handleSort(c.key)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort(c.key); } }}
                            tabIndex={0}
                            role="button"
                            title={`Sort by ${c.label}`}
                            aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                          >
                            {c.kind === "money" ? `${c.label} (${currency})` : c.label}
                            <span style={sx.sortMark}>{active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr key={`${r.centreCode}-${r.serviceId}-${i}`}>
                        <td style={{ ...sx.td, ...sx.rank }}>{(page - 1) * perPage + i + 1}</td>
                        {COLUMNS.map((c) => {
                          const numeric = c.kind === "money" || c.kind === "num";
                          return <td key={c.key} style={{ ...sx.td, ...(numeric ? sx.tdNum : {}) }}>{fmtCell(r, c)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={sx.pager}>
                <span>Rows per page</span>
                <select style={{ ...sx.input, height: 30, width: 80 }} value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span style={{ marginLeft: "auto" }}>Page <strong>{page}</strong> / <strong>{totalPages}</strong></span>
                <button style={{ ...sx.btn, ...sx.ghost, height: 30 }} onClick={() => setPage(1)} disabled={page <= 1}>First</button>
                <button style={{ ...sx.btn, ...sx.ghost, height: 30 }} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
                <button style={{ ...sx.btn, ...sx.ghost, height: 30 }} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
                <button style={{ ...sx.btn, ...sx.ghost, height: 30 }} onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TopServicesReport;