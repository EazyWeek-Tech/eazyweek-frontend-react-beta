// src/pages/Reports/SalesReport.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ─────────────────────────────────────────────────────────────────────────────
   ITEMIZED SALES REPORT  (one row per invoice line)

   Server-side filtering. Predefined dropdowns load once from
   GET /api/SalesReport/FilterOptions. Selecting filters + View sends them to
   GET /api/SalesReport, which returns only the matching rows.

   Filters (the 8 blue columns): Invoice Date (From/To) · Center · Invoice Type ·
   Item Type · Item Category · Item Subcategory · Practitioner · Salesperson.

   Import paths assume src/pages/Reports/SalesReport.jsx — adjust depth if moved.
   Permission activity: RPT.INVOICE_SALES.
   ───────────────────────────────────────────────────────────────────────────── */

const REPORT_ACTIVITY = "RPT.INVOICE_SALES";
const ALL = "All";

/* 46 columns, workbook order. kind drives formatting + export. */
const COLUMNS = [
  { key: "invoiceDate",             label: "Invoice Date",              kind: "date"  },
  { key: "invoiceNo",               label: "Invoice No",                kind: "text"  },
  { key: "centerCode",              label: "Center Code",               kind: "text"  },
  { key: "centerName",              label: "Center Name",               kind: "text"  },
  { key: "invoiceType",             label: "Invoice Type",              kind: "text"  },
  { key: "originalInvoiceNo",       label: "Original Invoice No",       kind: "text"  },
  { key: "originalInvoiceLineNo",   label: "Original Invoice Line No",  kind: "num"   },
  { key: "invoiceLineNumber",       label: "Invoice Line Number",       kind: "num"   },
  { key: "customerAccount",         label: "Customer Account",          kind: "text"  },
  { key: "customerName",            label: "Customer Name",             kind: "text"  },
  { key: "customerNationality",     label: "Customer Nationality",      kind: "text"  },
  { key: "itemType",                label: "Item Type",                 kind: "text"  },
  { key: "itemCode",                label: "Item Code",                 kind: "text"  },
  { key: "itemCategory",            label: "Item Category",             kind: "text"  },
  { key: "itemSubcategory",         label: "Item Subcategory",          kind: "text"  },
  { key: "itemName",                label: "Item Name",                 kind: "text"  },
  { key: "practitionerID",          label: "Practitioner ID",           kind: "text"  },
  { key: "practitionerName",        label: "Practitioner Name",         kind: "text"  },
  { key: "qty",                     label: "Qty",                       kind: "num"   },
  { key: "serviceQty",              label: "Service Qty",               kind: "num"   },
  { key: "basePrice",               label: "Base Price",                kind: "money" },
  { key: "basePriceAfterOverride",  label: "Base Price After Override", kind: "money" },
  { key: "discountAmount",          label: "Discount Amount",           kind: "money" },
  { key: "finalBasePrice",          label: "Final Base Price",          kind: "money" },
  { key: "taxPercent",              label: "Tax %",                     kind: "pct"   },
  { key: "taxAmount",               label: "Tax Amount",                kind: "money" },
  { key: "salesPriceIncludingTax",  label: "Sales Price Including Tax", kind: "money" },
  { key: "appliedPackageInvoiceNo", label: "Applied Package Invoice No",kind: "text"  },
  { key: "appliedPackageInvoiceLineNo", label: "Applied Package Line No", kind: "num" },
  { key: "appliedPackageCode",      label: "Applied Package Code",      kind: "text"  },
  { key: "appliedPackageAmount",    label: "Applied Package Amount",    kind: "money" },
  { key: "appliedAdvanceInvoiceNo", label: "Applied Advance Invoice No",kind: "text"  },
  { key: "appliedAdvanceAmount",    label: "Applied Advance Amount",    kind: "money" },
  { key: "totalAppliedAmount",      label: "Total Applied Amount",      kind: "money" },
  { key: "paymentCollected",        label: "Payment Collected",         kind: "money" },
  { key: "paymentReferenceNo",      label: "Payment Reference No",      kind: "text"  },
  { key: "discountCampaignID",      label: "Discount Campaign ID",      kind: "text"  },
  { key: "discountName",            label: "Discount Name",             kind: "text"  },
  { key: "paymentType",             label: "Payment Type",              kind: "text"  },
  { key: "salespersonID",           label: "Salesperson ID",            kind: "text"  },
  { key: "salespersonName",         label: "Salesperson Name",          kind: "text"  },
  { key: "equipment",               label: "Equipment",                 kind: "text"  },
  { key: "room",                    label: "Room",                      kind: "text"  },
  { key: "member",                  label: "Member",                    kind: "text"  },
  { key: "enrolledInLoyaltyProgram",label: "Enrolled In Loyalty",       kind: "text"  },
  { key: "loyaltyPointsAccrued",    label: "Loyalty Points Accrued",    kind: "num"   },
];

const MONEY_TOTAL_KEYS = ["discountAmount", "taxAmount", "salesPriceIncludingTax", "paymentCollected"];

/* helpers */
const norm = (s) => (s ?? "").toString().trim();
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
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
  if (col.kind === "money") return fmtSAR(v);
  if (col.kind === "pct")   return v == null || v === "" ? "—" : `${Number(v)}%`;
  if (col.kind === "date")  return toDDMMYYYY(v);
  if (col.kind === "num")   return v == null || v === "" ? "—" : String(v);
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
const SalesReport = () => {
  const perms = usePermissions() || {};
  const canView = typeof perms.hasPermission === "function" ? perms.hasPermission(REPORT_ACTIVITY) : true;

  // Filters
  const [fromDate, setFromDate]             = useState("");
  const [toDate, setToDate]                 = useState("");
  const [center, setCenter]                 = useState(ALL);
  const [invoiceType, setInvoiceType]       = useState(ALL);
  const [itemType, setItemType]             = useState(ALL);
  const [itemCategory, setItemCategory]     = useState(ALL);
  const [itemSubcategory, setItemSubcategory] = useState(ALL);
  const [practitioner, setPractitioner]     = useState(ALL);
  const [salesperson, setSalesperson]       = useState(ALL);

  // Predefined dropdown options
  const [options, setOptions] = useState({
    centers: [], invoiceTypes: ["Sale", "Refund", "Advance"],
    itemTypes: [], itemCategories: [], itemSubcategories: [],
    practitioners: [], salespersons: [],
  });

  const [rows, setRows]         = useState([]);
  const [hasViewed, setHasViewed] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [perPage, setPerPage]   = useState(25);
  const [page, setPage]         = useState(1);

  // Load predefined filter options once.
  useEffect(() => {
    if (!canView) return;
    let alive = true;
    (async () => {
      try {
        const data = await authGet(`${API_BASE_URL}/api/SalesReport/FilterOptions`);
        if (!alive || !data) return;
        setOptions((prev) => ({
          ...prev,
          centers:           data.centers || [],
          invoiceTypes:      data.invoiceTypes || prev.invoiceTypes,
          itemTypes:         data.itemTypes || [],
          itemCategories:    data.itemCategories || [],
          itemSubcategories: data.itemSubcategories || [],
          practitioners:     data.practitioners || [],
          salespersons:      data.salespersons || [],
        }));
      } catch {
        /* dropdowns fall back to empty — the report still runs on date + type */
      }
    })();
    return () => { alive = false; };
  }, [canView]);

  const dateValid = Boolean(fromDate && toDate) && new Date(toDate) >= new Date(fromDate);

  // View → server-side fetch with the selected filters.
  const handleView = useCallback(async () => {
    if (!fromDate || !toDate) { setError("Select both From Date and To Date."); return; }
    if (new Date(toDate) < new Date(fromDate)) { setError("To Date can't be before From Date."); return; }
    setError("");
    setLoading(true);
    try {
      const params = { fromDate, toDate, centre: center === ALL ? ALL : center };
      if (invoiceType     !== ALL) params.invoiceType     = invoiceType;
      if (itemType        !== ALL) params.itemType        = itemType;
      if (itemCategory    !== ALL) params.itemCategory    = itemCategory;
      if (itemSubcategory !== ALL) params.itemSubcategory = itemSubcategory;
      if (practitioner    !== ALL) params.practitioner    = practitioner;
      if (salesperson     !== ALL) params.salesperson     = salesperson;
      const qs = new URLSearchParams(params).toString();
      const data = await authGet(`${API_BASE_URL}/api/SalesReport?${qs}`);
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
  }, [fromDate, toDate, center, invoiceType, itemType, itemCategory, itemSubcategory, practitioner, salesperson]);

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setCenter(ALL); setInvoiceType(ALL); setItemType(ALL);
    setItemCategory(ALL); setItemSubcategory(ALL); setPractitioner(ALL); setSalesperson(ALL);
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
        if (c.kind === "money" || c.kind === "num" || c.kind === "pct") return v == null || v === "" ? "" : Number(v);
        if (c.kind === "date") return toDDMMYYYY(v);
        return norm(v);
      })),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `SalesReport_${fromDate}_to_${toDate}.xlsx`);
  };

  const sx = {
    page:    { padding: 20, fontFamily: "Lato, system-ui, sans-serif", color: "#05224C" },
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
    neg:     { color: "#b91c1c" },
    pager:   { display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, flexWrap: "wrap" },
    empty:   { padding: 40, textAlign: "center", color: "#5b6b7a" },
  };

  if (!canView) {
    return (
      <div style={sx.page}>
        <h1 style={sx.h1}>Sales Report</h1>
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
      <h1 style={sx.h1}>Sales Report</h1>
      <p style={sx.sub}>Itemized sales, refunds and advances — one row per invoice line. Refund amounts show as negative.</p>

      <div style={sx.card}>
        <div style={sx.filters}>
          <div style={sx.field}>
            <label style={sx.label}>From Date <span style={{color:"#b91c1c"}}>*</span></label>
            <input style={sx.input} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div style={sx.field}>
            <label style={sx.label}>To Date <span style={{color:"#b91c1c"}}>*</span></label>
            <input style={sx.input} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Select label="Center" value={center} onChange={setCenter}
                  items={options.centers} render={(c) => ({ val: c.name, text: c.name })} />
          <Select label="Invoice Type"     value={invoiceType}     onChange={setInvoiceType}     items={options.invoiceTypes} />
          <Select label="Item Type"        value={itemType}        onChange={setItemType}        items={options.itemTypes} />
          <Select label="Item Category"    value={itemCategory}    onChange={setItemCategory}    items={options.itemCategories} />
          <Select label="Item Subcategory" value={itemSubcategory} onChange={setItemSubcategory} items={options.itemSubcategories} />
          <Select label="Practitioner"     value={practitioner}    onChange={setPractitioner}    items={options.practitioners} />
          <Select label="Salesperson"      value={salesperson}     onChange={setSalesperson}     items={options.salespersons} />
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
            <div style={sx.empty}>No sales lines for this range and filters. Widen the dates or clear a filter.</div>
          ) : (
            <>
              <div style={sx.summary}>
                <div style={sx.sumItem}><span>Lines</span><span style={sx.sumVal}>{rows.length}</span></div>
                {MONEY_TOTAL_KEYS.map((k) => {
                  const col = COLUMNS.find((c) => c.key === k);
                  return (
                    <div key={k} style={sx.sumItem}>
                      <span>{col.label}</span>
                      <span style={{ ...sx.sumVal, ...(totals[k] < 0 ? sx.neg : {}) }}>{fmtSAR(totals[k])}</span>
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
                      <tr key={`${r.invoiceNo}-${r.invoiceLineNumber}-${i}`}>
                        {COLUMNS.map((c) => {
                          const numeric = c.kind === "money" || c.kind === "num" || c.kind === "pct";
                          const negative = c.kind === "money" && Number(r[c.key] || 0) < 0;
                          return (
                            <td key={c.key} style={{ ...sx.td, ...(numeric ? sx.tdNum : {}), ...(negative ? sx.neg : {}) }}>
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

export default SalesReport;