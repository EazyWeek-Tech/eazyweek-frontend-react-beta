import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../../config";

/* ---- constants ---- */

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const HEADER_MAP = {
  INVOICENO: "zakatInvoiceNo",
  ZAKATINVOICENO: "zakatInvoiceNo",
  ZAKATINVOICEID: "zakatInvoiceNo",
  POSINVOICENO: "posInvoiceNo",
  RESOLVEDINVOICENO: "resolvedInvoiceNo",
};

const REQUIRED_HEADERS = ["INVOICENO", "POSINVOICENO", "RESOLVEDINVOICENO"];

const STATUS_STYLE = {
  updated: { bg: "#f0fdf4", fg: "#166534", bd: "#bbf7d0" },
  unchanged: { bg: "#f8fafc", fg: "#475569", bd: "#e2e8f0" },
  rejected: { bg: "#fff5f5", fg: "#991b1b", bd: "#fecaca" },
  skipped: { bg: "#fffbeb", fg: "#92400e", bd: "#fde68a" },
};

/* ---- helpers ---- */

const normHeader = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const cleanCell = (v) =>
  v === null || v === undefined
    ? ""
    : String(v)
        .replace(/&nbsp;/gi, " ")
        .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN()}`,
});

function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: "array", cellText: false, cellDates: false });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });

  const headerIdx = matrix.findIndex((r) =>
    r.some((c) => HEADER_MAP[normHeader(c)])
  );
  if (headerIdx < 0) {
    throw new Error(
      `No header row found. Expected columns: INVOICENO, POS INVOICENO, RESOLVED INVOICENO`
    );
  }

  const headers = matrix[headerIdx].map(normHeader);
  const missing = REQUIRED_HEADERS.filter(
    (h) => !headers.some((x) => HEADER_MAP[x] === HEADER_MAP[h])
  );
  if (missing.length) {
    throw new Error(`Missing column(s): ${missing.join(", ")}`);
  }

  const rows = [];
  for (let i = headerIdx + 1; i < matrix.length; i += 1) {
    const row = { rowNo: i + 1, zakatInvoiceNo: "", posInvoiceNo: "", resolvedInvoiceNo: "" };
    headers.forEach((h, col) => {
      const key = HEADER_MAP[h];
      if (key) row[key] = cleanCell(matrix[i][col]);
    });
    if (row.zakatInvoiceNo || row.posInvoiceNo || row.resolvedInvoiceNo) rows.push(row);
  }
  return { sheetName, rows };
}

/* ---- component ---- */

const EInvoiceStatusUpload = ({ onClose }) => {
  const fileRef = useRef(null);
  const [context, setContext] = useState(null);
  const [centreCode, setCentreCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/api/EInvoice/Legacy/Upload/Context`, {
      credentials: "include",
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const ctx = data && data.data ? data.data : null;
        setContext(ctx);
        if (ctx && ctx.centreCode) setCentreCode(ctx.centreCode);
      })
      .catch(() => alive && setContext({ centreCode: "", isEntity: true, centres: [] }));
    return () => {
      alive = false;
    };
  }, []);

  const counts = useMemo(() => {
    const zakat = rows.filter((r) => r.zakatInvoiceNo).length;
    const resolved = rows.filter((r) => r.posInvoiceNo || r.resolvedInvoiceNo).length;
    return { zakat, resolved };
  }, [rows]);

  const needsCentre = context && context.isEntity && !centreCode && counts.resolved > 0;

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    setResult(null);
    setError("");
    setParseError("");
    setRows([]);
    setFileName(file ? file.name : "");
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(buffer);
      if (parsed.rows.length === 0) throw new Error("The sheet has no data rows");
      setRows(parsed.rows);
    } catch (err) {
      setParseError(err.message || "Unable to read this file");
    }
  };

  const reset = () => {
    setRows([]);
    setFileName("");
    setParseError("");
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const publish = async () => {
    if (!rows.length || publishing) return;
    const ok = window.confirm(
      `Publish ${rows.length} row(s)? ${counts.zakat} will be marked Success and ${counts.resolved} marked Resolved.`
    );
    if (!ok) return;

    setPublishing(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/EInvoice/Legacy/Upload/Status`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({
          centreCode,
          rows: rows.map(({ rowNo, zakatInvoiceNo, posInvoiceNo, resolvedInvoiceNo }) => ({
            rowNo,
            zakatInvoiceNo,
            posInvoiceNo,
            resolvedInvoiceNo,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || !data.data) {
        throw new Error((data && data.message) || `Publish failed (HTTP ${res.status})`);
      }
      setResult({ message: data.message, ...data.data });
    } catch (err) {
      setError(err.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const displayRows = result ? result.rows : rows;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 24,
        marginTop: 20,
        width: "100%",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* ===== HEADER ===== */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1F4E79" }}>
            E-Invoice Failed Status Excel Upload
          </div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 4, lineHeight: 1.6 }}>
            Columns: <b>INVOICENO</b> (Zakat Invoice No &rarr; marked Success),{" "}
            <b>POS INVOICENO</b> + <b>RESOLVED INVOICENO</b> (failed invoice &rarr; marked
            Resolved). A row fills one or the other.
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20 }}
            aria-label="Close"
          >
            <i className="bx bx-x" />
          </button>
        )}
      </div>

      <hr style={{ margin: "16px 0", border: 0, borderTop: "1px solid #e5e7eb" }} />

      {/* ===== CONTROLS ===== */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4 }}>
            Excel file (.xlsx / .xls)
          </label>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4 }}>
            Centre (for POS / Resolved rows)
          </label>
          <select
            value={centreCode}
            onChange={(e) => setCentreCode(e.target.value)}
            disabled={!context || (!context.isEntity && Boolean(context.centreCode))}
            style={{ minWidth: 220, padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            <option value="">
              {context && context.isEntity ? "Auto-detect (reject if ambiguous)" : "Logged-in centre"}
            </option>
            {(context ? context.centres : []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button type="button" className="pribtn" onClick={reset} disabled={publishing}>
            Clear
          </button>
          <button
            type="button"
            className="pribtn"
            onClick={publish}
            disabled={!rows.length || publishing || Boolean(result)}
          >
            {publishing ? (
              <>
                <i className="bx bx-loader-alt bx-spin" style={{ marginRight: 6 }} />
                Publishing...
              </>
            ) : (
              <>
                <i className="bx bx-upload" style={{ marginRight: 6 }} />
                Publish
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== MESSAGES ===== */}
      {parseError && <Banner kind="rejected">{parseError}</Banner>}
      {error && <Banner kind="rejected">{error}</Banner>}
      {needsCentre && (
        <Banner kind="skipped">
          POS invoice numbers are not unique across centres. Rows whose POS Invoice No exists at more
          than one centre will be rejected unless a centre is selected.
        </Banner>
      )}
      {fileName && !parseError && !result && (
        <Banner kind="unchanged">
          <b>{fileName}</b> &mdash; {rows.length} row(s): {counts.zakat} Success update(s),{" "}
          {counts.resolved} Resolved update(s). Review below, then Publish.
        </Banner>
      )}
      {result && (
        <Banner kind={result.updated > 0 ? "updated" : "rejected"}>
          <b>{result.message}.</b>
          {result.warnings > 0 && ` ${result.warnings} warning(s) — see the rows below.`}
        </Banner>
      )}

      {/* ===== GRID ===== */}
      {displayRows.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#1F4E79" }}>
                <Th>#</Th>
                <Th>INVOICENO</Th>
                <Th>POS INVOICENO</Th>
                <Th>RESOLVED INVOICENO</Th>
                {result && <Th>Centre</Th>}
                {result && <Th>Result</Th>}
                {result && <Th>Message</Th>}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r) => {
                const st = result ? STATUS_STYLE[r.status] || STATUS_STYLE.unchanged : null;
                return (
                  <tr key={r.rowNo} style={{ background: st ? st.bg : "#fff" }}>
                    <Td muted>{r.rowNo}</Td>
                    <Td>{r.zakatInvoiceNo}</Td>
                    <Td>{r.posInvoiceNo}</Td>
                    <Td>{r.resolvedInvoiceNo}</Td>
                    {result && <Td>{r.centerCode}</Td>}
                    {result && (
                      <Td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            color: st.fg,
                            border: `1px solid ${st.bd}`,
                          }}
                        >
                          {r.status}
                        </span>
                      </Td>
                    )}
                    {result && (
                      <Td>
                        {r.message}
                        {r.warnings && r.warnings.length > 0 && (
                          <div style={{ color: "#92400e", marginTop: 2 }}>
                            {r.warnings.join("; ")}
                          </div>
                        )}
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ---- small presentational pieces ---- */

const Banner = ({ kind, children }) => {
  const st = STATUS_STYLE[kind] || STATUS_STYLE.unchanged;
  return (
    <div
      style={{
        marginTop: 14,
        padding: "8px 12px",
        borderRadius: 6,
        fontSize: 13,
        background: st.bg,
        color: st.fg,
        border: `1px solid ${st.bd}`,
      }}
    >
      {children}
    </div>
  );
};

const Th = ({ children }) => (
  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>
    {children}
  </th>
);

const Td = ({ children, muted }) => (
  <td
    style={{
      padding: "8px 10px",
      borderBottom: "1px solid #f1f5f9",
      color: muted ? "#94a3b8" : "#334155",
      verticalAlign: "top",
    }}
  >
    {children}
  </td>
);

export default EInvoiceStatusUpload;