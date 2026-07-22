// src/pages/Reports/LiabilityReport.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
const authGet = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const json = await res.json();
  return Array.isArray(json) ? json : (json?.data ?? json);
};

/* component */
const LiabilityReport = () => {
  const perms = usePermissions() || {};
  const canView = typeof perms.hasPermission === "function" ? perms.hasPermission(REPORT_ACTIVITY) : true;

  // Filters — dates start empty and are mandatory.
  const [fromDate, setFromDate]             = useState("");
  const [toDate, setToDate]                 = useState("");
  const [center, setCenter]                 = useState(ALL);
  const [invoiceType, setInvoiceType]       = useState(ALL);
  const [liabilityType, setLiabilityType]   = useState(ALL);
  const [itemCategory, setItemCategory]     = useState(ALL);
  const [itemSubcategory, setItemSubcategory] = useState(ALL);

  const [options, setOptions] = useState({
    centers: [], invoiceTypes: ["Sale", "Advance", "Refund"],
    liabilityTypes: ["Package", "Advance", "Credit Note"],
    itemCategories: [], itemSubcategories: [],
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
        }));
      } catch { /* dropdowns fall back to fixed lists / empty */ }
    })();
    return () => { alive = false; };
  }, [canView]);

  const dateValid = Boolean(fromDate && toDate) && new Date(toDate) >= new Date(fromDate);

  const handleView = useCallback(async () => {
    if (!fromDate || !toDate) { setError("Select both From Date and To Date."); return; }
    if (new Date(toDate) < new Date(fromDate)) { setError("To Date can't be before From Date."); return; }
    setError("");
    setLoading(true);
    try {
      const params = { fromDate, toDate, centre: center === ALL ? ALL : center };
      if (invoiceType     !== ALL) params.invoiceType     = invoiceType;
      if (liabilityType   !== ALL) params.liabilityType   = liabilityType;
      if (itemCategory    !== ALL) params.itemCategory    = itemCategory;
      if (itemSubcategory !== ALL) params.itemSubcategory = itemSubcategory;
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
    setCenter(ALL); setInvoiceType(ALL); setLiabilityType(ALL);
    setItemCategory(ALL); setItemSubcategory(ALL);
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
    field:   { display: "flex", flexDirection: "column", gap: 4 },
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
          <Select label="Center" value={center} onChange={setCenter}
                  items={options.centers} render={(c) => ({ val: c.name, text: c.name })} />
          <Select label="Invoice Type"     value={invoiceType}     onChange={setInvoiceType}     items={options.invoiceTypes} />
          <Select label="Liability Type"   value={liabilityType}   onChange={setLiabilityType}   items={options.liabilityTypes} />
          <Select label="Item Category"    value={itemCategory}    onChange={setItemCategory}    items={options.itemCategories} />
          <Select label="Item Subcategory" value={itemSubcategory} onChange={setItemSubcategory} items={options.itemSubcategories} />
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