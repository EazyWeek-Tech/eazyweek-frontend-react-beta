// src/pages/Reports/LiabilityReport.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ─────────────────────────────────────────────────────────────────────────────
   LIABILITY REPORT  (one row per liability item)

   Value paid but not yet consumed — Package, Advance and Credit Note. Server-side
   filtering: predefined dropdowns load once from
   GET /api/LiabilityReport/FilterOptions; View sends the selected filters to
   GET /api/LiabilityReport.

   Filters (the 6 blue columns): Invoice Date (From/To) · Center · Invoice Type ·
   Liability Type · Item Category · Item Subcategory.

   Import paths assume src/pages/Reports/LiabilityReport.jsx — adjust depth if moved.
   Permission activity: RPT.INVOICE_SALES.
   ───────────────────────────────────────────────────────────────────────────── */

const REPORT_ACTIVITY = "RPT.INVOICE_SALES";
const ALL = "All";

/* ISR-011 / ISR-080 — filters accept more than one value. Values are joined with
   this delimiter into a single query param, so the API contract stays "one
   string per filter". A pipe rather than a comma: category and centre names can
   legitimately contain a comma, and SQL Server's STRING_SPLIT (used to unpack
   this server-side) accepts only a single-character separator.
   Keep in sync with MULTI_DELIM in the matching repository. */
const MULTI_DELIM = "|";

/* Declared at module scope on purpose. The single-value Select below sits inside
   the component, which is harmless for a native <select> but would remount a
   control with its own open/search state on every parent render and snap the
   popover shut mid-click. */
const MultiSelect = ({ label, values, onChange, items, render, sx, disabled }) => {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef             = useRef(null);

  const opts = useMemo(
    () => (items || []).map((o) => (render ? render(o) : { val: o, text: o })),
    [items, render]
  );

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  // Close on outside click or Escape. mousedown rather than click so a selection
  // inside the panel still registers before the panel goes away.
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
  const toggle = (val) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);

  // Empty selection means All — the same contract the ALL sentinel had.
  const summary =
    selected.length === 0 ? "All"
      : selected.length === 1
        ? (opts.find((o) => o.val === selected[0])?.text || selected[0])
        : `${selected.length} selected`;

  const visible = search
    ? opts.filter((o) => String(o.text).toLowerCase().includes(search.toLowerCase()))
    : opts;

  return (
    <div style={sx.field} ref={wrapRef}>
      <label style={sx.label}>{label}</label>
      <button
        type="button"
        disabled={disabled}
        style={{
          ...sx.input,
          ...sx.msButton,
          ...(selected.length && !disabled ? sx.msButtonActive : {}),
          ...(disabled ? sx.msButtonDisabled : {}),
        }}
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        title={
          disabled
            ? "Your account is limited to this centre"
            : (selected.length > 1 ? selected.join(", ") : undefined)
        }
      >
        <span style={sx.msSummary}>{summary}</span>
        {!disabled && <span style={sx.msCaret}>▾</span>}
      </button>

      {open && !disabled && (
        <div style={sx.msPanel}>
          <div style={sx.msTools}>
            <input
              style={sx.msSearch}
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <button type="button" style={sx.msLink} onClick={() => onChange(visible.map((o) => o.val))}>
              Select all
            </button>
            <button type="button" style={sx.msLink} onClick={() => onChange([])}>
              Clear
            </button>
          </div>
          <div style={sx.msList}>
            {visible.length === 0 && <div style={sx.msEmpty}>No matches</div>}
            {visible.map((o, i) => (
              <label key={`${o.val}-${i}`} style={sx.msRow}>
                <input
                  type="checkbox"
                  checked={selected.includes(o.val)}
                  onChange={() => toggle(o.val)}
                />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* 27 columns, workbook order. kind drives formatting + export. */
const COLUMNS = [
  { key: "invoiceDate",            label: "Invoice Date",             kind: "date"  },
  { key: "invoiceNo",              label: "Invoice No",               kind: "text"  },
  { key: "centerCode",             label: "Center Code",              kind: "text"  },
  { key: "centerName",             label: "Center Name",              kind: "text"  },
  { key: "invoiceType",            label: "Invoice Type",             kind: "text"  },
  { key: "invoiceLineNumber",      label: "Invoice Line Number",      kind: "num"   },
  { key: "customerAccount",        label: "Customer Account",         kind: "text"  },
  { key: "customerName",           label: "Customer Name",            kind: "text"  },
  { key: "customerNationality",    label: "Customer Nationality",     kind: "text"  },
  { key: "liabilityType",          label: "Liability Type",           kind: "text"  },
  { key: "itemCode",               label: "Item Code",                kind: "text"  },
  { key: "itemCategory",           label: "Item Category",            kind: "text"  },
  { key: "itemSubcategory",        label: "Item Subcategory",         kind: "text"  },
  { key: "itemName",               label: "Item Name",                kind: "text"  },
  { key: "practitionerID",         label: "Practitioner ID",          kind: "text"  },
  { key: "practitionerName",       label: "Practitioner Name",        kind: "text"  },
  { key: "purchasedQty",           label: "Purchased Qty",            kind: "num"   },
  { key: "purchasedServiceQty",    label: "Purchased Service Qty",    kind: "num"   },
  { key: "amountPerUnit",          label: "Amount per Unit",          kind: "money" },
  { key: "lineAmount",             label: "Line Amount",              kind: "money" },
  { key: "taxPercent",             label: "Tax Percent",              kind: "pct"   },
  { key: "taxAmount",              label: "Tax Amount",               kind: "money" },
  { key: "lineAmountIncludingTax", label: "Line Amount Including Tax",kind: "money" },
  { key: "consumedQty",            label: "Consumed Qty",             kind: "num"   },
  { key: "consumedLineAmount",     label: "Consumed Line Amount",     kind: "money" },
  { key: "balanceQty",             label: "Balance Qty",              kind: "num"   },
  { key: "balanceLineAmount",      label: "Balance Line Amount",      kind: "money" },
];

const MONEY_TOTAL_KEYS = ["lineAmountIncludingTax", "consumedLineAmount", "balanceLineAmount"];

/* helpers */
const norm = (s) => (s ?? "").toString().trim();
function toDDMMYYYY(v) {
  const s = norm(v);
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : s;
}
const nf = new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSAR = (v) => {
  const n = Number(v || 0);
  return `${n < 0 ? "-" : ""}SAR ${nf.format(Math.abs(n))}`;
};
const fmtCell = (row, col) => {
  const v = row[col.key];
  if (v == null || v === "") return "—";
  if (col.kind === "money") return fmtSAR(v);
  if (col.kind === "pct")   return `${Number(v)}%`;
  if (col.kind === "date")  return toDDMMYYYY(v);
  if (col.kind === "num")   return String(v);
  return norm(v) || "—";
};
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
/* The old handler threw a bare `Request failed (403)`, which told the user
   neither what went wrong nor what to do about it. Prefer the API's own message
   when it sends one; otherwise say what happened and name the fix. */
const HTTP_MESSAGES = {
  401: "Your session has expired. Sign in again to run this report.",
  403: "You don't have permission to view this report. Ask an administrator to grant the Invoice Sales report permission (RPT.INVOICE_SALES).",
  404: "The report service isn't responding at the expected address. Contact support.",
  408: "The report took too long to build. Narrow the date range and try again.",
  500: "The server couldn't build the report. Try again, and contact support if it keeps happening.",
  502: "The report service is unavailable right now. Try again in a moment.",
  503: "The report service is unavailable right now. Try again in a moment.",
  504: "The report took too long to build. Narrow the date range and try again.",
};
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
  try { payload = await res.json(); } catch { /* empty or non-JSON body */ }

  if (!res.ok) {
    const serverMsg = (payload?.message || payload?.error || "").toString().trim();
    const err = new Error(
      serverMsg || HTTP_MESSAGES[res.status] || `The report couldn't be loaded (error ${res.status}).`
    );
    err.status = res.status;
    throw err;
  }
  return Array.isArray(payload) ? payload : (payload?.data ?? payload);
};

/* component */
const LiabilityReport = () => {
  const perms = usePermissions() || {};
  const canView = typeof perms.hasPermission === "function" ? perms.hasPermission(REPORT_ACTIVITY) : true;

  // Filters — dates start empty and are mandatory.
  const [fromDate, setFromDate]             = useState("");
  const [toDate, setToDate]                 = useState("");
  /* ISR-011 / ISR-080 — each filter holds an ARRAY now; an empty array means All,
     which keeps the meaning the ALL sentinel had. */
  const [center, setCenter]                 = useState([]);
  const [invoiceType, setInvoiceType]       = useState([]);
  const [liabilityType, setLiabilityType]   = useState([]);
  const [itemCategory, setItemCategory]     = useState([]);
  const [itemSubcategory, setItemSubcategory] = useState([]);

  /* Assume locked until the server says otherwise, so a slow or failed options
     call never briefly offers a control the user shouldn't have. FilterOptions
     now returns centreLocked / lockedCentre. */
  const [options, setOptions] = useState({
    centers: [], invoiceTypes: ["Sale", "Advance", "Refund"],
    liabilityTypes: ["Package", "Advance", "Credit Note"],
    itemCategories: [], itemSubcategories: [],
    centreLocked: true, lockedCentre: null,
  });

  const [rows, setRows]         = useState([]);
  const [hasViewed, setHasViewed] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [perPage, setPerPage]   = useState(25);
  const [page, setPage]         = useState(1);

  useEffect(() => {
    if (!canView) return;
    let alive = true;
    (async () => {
      try {
        const data = await authGet(`${API_BASE_URL}/api/LiabilityReport/FilterOptions`);
        if (!alive || !data) return;
        setOptions((prev) => ({
          ...prev,
          centers:           data.centers || [],
          invoiceTypes:      data.invoiceTypes || prev.invoiceTypes,
          liabilityTypes:    data.liabilityTypes || prev.liabilityTypes,
          itemCategories:    data.itemCategories || [],
          itemSubcategories: data.itemSubcategories || [],
          centreLocked:      !!data.centreLocked,
          lockedCentre:      data.lockedCentre || null,
        }));
        if (data.centreLocked) {
          const only = data.lockedCentre || (data.centers && data.centers[0] && (data.centers[0].code || data.centers[0].name));
          if (only) setCenter([only]);
        }
      } catch (e) {
        /* Dropdowns fall back to fixed lists, but a 401/403 means the whole
           report is barred — say so rather than showing empty filters. */
        if (alive && (e.status === 401 || e.status === 403)) setError(e.message);
      }
    })();
    return () => { alive = false; };
  }, [canView]);

  /* Options may be plain strings or { code, name } objects depending on what the
     endpoint returns. Match on the NAME either way, because the report columns
     hold names. */
  const byName = useCallback(
    (o) => (o && typeof o === "object" ? { val: o.name, text: o.name } : { val: o, text: o }),
    []
  );

  const dateValid = Boolean(fromDate && toDate) && new Date(toDate) >= new Date(fromDate);

  const handleView = useCallback(async () => {
    if (!fromDate || !toDate) { setError("Select both From Date and To Date."); return; }
    if (new Date(toDate) < new Date(fromDate)) { setError("To Date can't be before From Date."); return; }
    setError("");
    setLoading(true);
    try {
      // Empty array => omit the filter entirely (server reads blank as All).
      const many = (arr) => (arr && arr.length ? arr.join(MULTI_DELIM) : "");
      const params = { fromDate, toDate, centre: center.length ? many(center) : ALL };
      if (invoiceType.length)     params.invoiceType     = many(invoiceType);
      if (liabilityType.length)   params.liabilityType   = many(liabilityType);
      if (itemCategory.length)    params.itemCategory    = many(itemCategory);
      if (itemSubcategory.length) params.itemSubcategory = many(itemSubcategory);
      const qs = new URLSearchParams(params).toString();
      const data = await authGet(`${API_BASE_URL}/api/LiabilityReport?${qs}`);
      setRows(data || []);
      setHasViewed(true);
      setPage(1);
    } catch (e) {
      setRows([]);
      setHasViewed(true);
      setError(e.message || "Couldn't load the report. Try again.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, center, invoiceType, liabilityType, itemCategory, itemSubcategory]);

  const handleReset = () => {
    setFromDate(""); setToDate("");
    setCenter([]); setInvoiceType([]); setLiabilityType([]);
    setItemCategory([]); setItemSubcategory([]);
    setRows([]); setHasViewed(false); setError(""); setPage(1);
  };

  const totals = useMemo(() => {
    const t = {};
    for (const k of MONEY_TOTAL_KEYS) t[k] = rows.reduce((s, r) => s + Number(r[k] || 0), 0);
    return t;
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const pageRows = useMemo(() => rows.slice((page - 1) * perPage, page * perPage), [rows, page, perPage]);

  const handleExport = () => {
    if (!rows.length) return;
    const aoa = [
      COLUMNS.map((c) => c.label),
      ...rows.map((r) => COLUMNS.map((c) => {
        const v = r[c.key];
        if (v == null || v === "") return "";
        if (c.kind === "money" || c.kind === "num" || c.kind === "pct") return Number(v);
        if (c.kind === "date") return toDDMMYYYY(v);
        return norm(v);
      })),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Liability Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `LiabilityReport_${fromDate}_to_${toDate}.xlsx`);
  };

  const sx = {
    page:    { padding: 20, fontFamily: "Segoe UI, system-ui, sans-serif", color: "#05224C" },
    h1:      { fontSize: 20, fontWeight: 700, margin: "0 0 4px" },
    sub:     { fontSize: 13, color: "#5b6b7a", margin: "0 0 16px" },
    card:    { background: "#fff", border: "1px solid #e3e9f0", borderRadius: 10, padding: 16, marginBottom: 16 },
    filters: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 },
    field:   { display: "flex", flexDirection: "column", gap: 4, position: "relative" },
    /* multi-select (ISR-011 / ISR-080) */
    msButton:       { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", textAlign: "left", background: "#fff" },
    msButtonActive: { borderColor: "#18396E", color: "#18396E", fontWeight: 600 },
    msButtonDisabled: { background: "#f4f6f9", color: "#5b6b80", cursor: "not-allowed", opacity: 1 },
    msSummary:      { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    msCaret:        { fontSize: 10, opacity: 0.6, flexShrink: 0 },
    msPanel:  { position: "absolute", zIndex: 40, top: "100%", left: 0, marginTop: 4, minWidth: "100%", maxWidth: 320, background: "#fff", border: "1px solid #dce4ee", borderRadius: 6, boxShadow: "0 8px 24px rgba(5,34,76,0.14)" },
    msTools:  { display: "flex", alignItems: "center", gap: 6, padding: 8, borderBottom: "1px solid #eef2f7" },
    msSearch: { flex: 1, minWidth: 0, padding: "4px 6px", border: "1px solid #dce4ee", borderRadius: 4, fontSize: 12 },
    msLink:   { background: "none", border: "none", padding: 0, color: "#18396E", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" },
    msList:   { maxHeight: 220, overflowY: "auto", padding: 4 },
    msRow:    { display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", fontSize: 13, cursor: "pointer", borderRadius: 4 },
    msEmpty:  { padding: "10px 6px", fontSize: 12, color: "#7c8a9e", textAlign: "center" },
    label:   { fontSize: 12, fontWeight: 600, color: "#33475b" },
    input:   { height: 34, border: "1px solid #cdd7e2", borderRadius: 6, padding: "0 8px", fontSize: 13, background: "#fff" },
    actions: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" },
    btn:     { height: 36, padding: "0 16px", borderRadius: 6, border: "1px solid transparent", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    primary: { background: "#18396E", color: "#fff" },
    ghost:   { background: "#fff", color: "#18396E", borderColor: "#cdd7e2" },
    summary: { display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, marginBottom: 10 },
    sumItem: { display: "flex", flexDirection: "column" },
    sumVal:  { fontWeight: 700, fontSize: 15 },
    scroll:  { overflowX: "auto", border: "1px solid #e3e9f0", borderRadius: 8 },
    table:   { borderCollapse: "collapse", width: "max-content", minWidth: "100%", fontSize: 12.5 },
    th:      { position: "sticky", top: 0, background: "#f2f6fb", borderBottom: "2px solid #dce4ee", padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 700 },
    td:      { borderBottom: "1px solid #eef2f7", padding: "7px 10px", whiteSpace: "nowrap" },
    tdNum:   { textAlign: "right", fontVariantNumeric: "tabular-nums" },
    pager:   { display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, flexWrap: "wrap" },
    empty:   { padding: 40, textAlign: "center", color: "#5b6b7a" },
  };

  if (!canView) {
    return (
      <div style={sx.page}>
        <h1 style={sx.h1}>Liability Report</h1>
        <div style={{ ...sx.card, ...sx.empty }}>You don't have access to this report. Ask an administrator for the Invoice Sales report permission.</div>
      </div>
    );
  }

  const Select = ({ label, value, onChange, items, render }) => (
    <div style={sx.field}>
      <label style={sx.label}>{label}</label>
      <select style={sx.input} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>All</option>
        {items.map((o, i) => {
          const { val, text } = render ? render(o) : { val: o, text: o };
          return <option key={`${val}-${i}`} value={val}>{text}</option>;
        })}
      </select>
    </div>
  );

  return (
    <div style={sx.page}>
      <h1 style={sx.h1}>Liability Report</h1>
      <p style={sx.sub}>Paid-but-not-yet-consumed value — packages, advances and credit notes. Shows purchased, consumed and outstanding balance per item.</p>

      <div style={sx.card}>
        <div style={sx.filters}>
          <div style={sx.field}>
            <label style={sx.label}>From Date <span style={{ color: "#b91c1c" }}>*</span></label>
            <input style={sx.input} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div style={sx.field}>
            <label style={sx.label}>To Date <span style={{ color: "#b91c1c" }}>*</span></label>
            <input style={sx.input} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          {/* Sends the centre CODE, not the display name. The old version sent
              c.name, which only works where CENTERCODE happens to equal CNAME —
              on a tenant like LMGP (code ELTE, name "Elevate") it matches
              nothing. Confirm the repository filters on CENTERCODE. */}
          <MultiSelect label="Center" values={center} onChange={setCenter} sx={sx}
                  disabled={options.centreLocked}
                  items={options.centers} render={(c) => ({ val: c.code || c.name, text: c.name })} />
          <MultiSelect label="Invoice Type"     values={invoiceType}     onChange={setInvoiceType}     items={options.invoiceTypes}   sx={sx} />
          <MultiSelect label="Liability Type"   values={liabilityType}   onChange={setLiabilityType}   items={options.liabilityTypes} sx={sx} />
          {/* Category/Subcategory tolerate either a plain string list or the
              master-sourced { code, name } shape the Sales Report now returns. */}
          <MultiSelect label="Item Category"    values={itemCategory}    onChange={setItemCategory}
                       items={options.itemCategories}    render={byName} sx={sx} />
          <MultiSelect label="Item Subcategory" values={itemSubcategory} onChange={setItemSubcategory}
                       items={options.itemSubcategories} render={byName} sx={sx} />
        </div>

        <div style={sx.actions}>
          <button style={{ ...sx.btn, ...sx.primary, opacity: dateValid ? 1 : 0.6 }} onClick={handleView} disabled={loading}>
            {loading ? "Loading…" : "View"}
          </button>
          <button style={{ ...sx.btn, ...sx.ghost }} onClick={handleExport} disabled={!rows.length}>Export to Excel</button>
          <button style={{ ...sx.btn, ...sx.ghost }} onClick={handleReset}>Reset</button>
        </div>
        {error && <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 10 }}>{error}</div>}
      </div>

      {hasViewed && (
        <div style={sx.card}>
          {rows.length === 0 ? (
            <div style={sx.empty}>No liabilities for this range and filters. Widen the dates or clear a filter.</div>
          ) : (
            <>
              <div style={sx.summary}>
                <div style={sx.sumItem}><span>Rows</span><span style={sx.sumVal}>{rows.length}</span></div>
                {MONEY_TOTAL_KEYS.map((k) => {
                  const col = COLUMNS.find((c) => c.key === k);
                  return (
                    <div key={k} style={sx.sumItem}>
                      <span>{col.label}</span>
                      <span style={sx.sumVal}>{fmtSAR(totals[k])}</span>
                    </div>
                  );
                })}
              </div>

              <div style={sx.scroll}>
                <table style={sx.table}>
                  <thead>
                    <tr>{COLUMNS.map((c) => <th key={c.key} style={sx.th}>{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr key={`${r.invoiceNo}-${r.liabilityType}-${r.invoiceLineNumber}-${i}`}>
                        {COLUMNS.map((c) => {
                          const numeric = c.kind === "money" || c.kind === "num" || c.kind === "pct";
                          return (
                            <td key={c.key} style={{ ...sx.td, ...(numeric ? sx.tdNum : {}) }}>
                              {fmtCell(r, c)}
                            </td>
                          );
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

export default LiabilityReport;