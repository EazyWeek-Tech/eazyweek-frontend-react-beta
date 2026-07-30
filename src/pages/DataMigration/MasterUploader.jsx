// src/pages/DataMigration/MasterUploader.jsx
//
// One page serves every master. The route supplies which one:
//   /upload/employees | /upload/services | /upload/products
//   /upload/packages  | /upload/practitioners
//
// Flow: pick file -> parsed in the browser with SheetJS -> rows POSTed to
// /Validate (never writes) -> fix and re-check -> Commit writes everything in
// a single server-side transaction.
//
// The browser only parses. Every rule is enforced again server-side on commit,
// so a hand-crafted request cannot skip validation.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../../config";

// Mirrors getToken() in usePermissions.jsx — same keys, same order. There is no
// shared fetch wrapper to reuse; that file keeps its own inline getToken, so
// matching it is the existing pattern rather than duplication to remove.
const TOKEN = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

const api = async (path, options = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/MasterUpload${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN()}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data ?? json;
};

/* Route segment -> master key. Kept here so the sidebar paths stay readable. */
const ROUTE_TO_MASTER = {
  employees: "employee",
  services: "service",
  products: "product",
  packages: "package",
  practitioners: "practitioner",
};

export default function MasterUploader() {
  const params = useParams();
  const segment = params.master || window.location.pathname.split("/").filter(Boolean).pop();
  const masterKey = ROUTE_TO_MASTER[segment] || segment;

  const [masters, setMasters] = useState([]);
  const [reference, setReference] = useState(null);
  const [file, setFile] = useState(null);
  const [sheets, setSheets] = useState(null);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState(null);
  const [provisionLogins, setProvisionLogins] = useState(true);
  const [showRef, setShowRef] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [skipped, setSkipped] = useState([]);
  const fileRef = useRef(null);

  const master = useMemo(() => masters.find((m) => m.key === masterKey), [masters, masterKey]);

  const say = (message, kind = "info") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    api("/Masters").then(setMasters).catch((e) => say(e.message, "error"));
  }, []);

  // Reset everything when the person navigates between masters.
  useEffect(() => {
    setFile(null);
    setSheets(null);
    setReport(null);
    setSkipped([]);
    if (fileRef.current) fileRef.current.value = "";
  }, [masterKey]);

  const loadReference = async () => {
    if (reference) return setShowRef((v) => !v);
    try {
      setReference(await api("/Reference"));
      setShowRef(true);
    } catch (e) {
      say(e.message, "error");
    }
  };

  /* ── read the workbook in the browser ─────────────────────────────────── */
  const readFile = useCallback(
    async (f) => {
      if (!f) return;
      if (!/\.(xlsx|xlsm|xls)$/i.test(f.name)) {
        say("That is not an Excel file. Use the .xlsx template.", "error");
        return;
      }
      setBusy("Reading the file");
      setReport(null);
      try {
        const buf = await f.arrayBuffer();
        // cellDates keeps real dates as Date objects; the server also accepts
        // Excel serial numbers, so an unformatted date column still works.
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        const expected = (master?.sheets || []).map((s) => s.name);
        // Match tabs loosely — ignore case, spaces, underscores and hyphens —
        // so "Employee Roles" still resolves to the Employee_Roles sheet. A
        // renamed tab silently contributing zero rows is worse than an error.
        const key = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, "");
        const actual = new Map(wb.SheetNames.map((n) => [key(n), n]));
        const found = {};
        const missing = [];
        const renamed = [];
        for (const name of expected) {
          const real = actual.get(key(name));
          if (!real) {
            missing.push(name);
            continue;
          }
          if (real !== name) renamed.push(`"${real}" -> ${name}`);
          found[name] = XLSX.utils.sheet_to_json(wb.Sheets[real], {
            defval: "",
            raw: false,
            blankrows: false,
          });
        }
        setSkipped(missing);
        if (missing.length === expected.length) {
          say(`No matching sheets. This file needs the tabs: ${expected.join(", ")}`, "error");
          setBusy("");
          return;
        }
        if (missing.length) say(`Not in this file: ${missing.join(", ")}. Those tables will be left untouched.`, "warn");
        else if (renamed.length) say(`Matched renamed tab(s): ${renamed.join(", ")}`, "info");
        setFile(f);
        setSheets(found);
      } catch (e) {
        say(`Could not read the file. ${e.message}`, "error");
      } finally {
        setBusy("");
      }
    },
    [master]
  );

  const runValidate = async () => {
    setBusy("Checking rows");
    try {
      const r = await api(`/${masterKey}/Validate`, {
        method: "POST",
        body: JSON.stringify({ sheets, fileName: file?.name }),
      });
      setReport(r);
      say(r.ok ? "All rows passed. Ready to upload." : `${r.summary.errors} row(s) need fixing.`, r.ok ? "ok" : "warn");
    } catch (e) {
      say(e.message, "error");
    } finally {
      setBusy("");
    }
  };

  const runCommit = async () => {
    const n = report?.summary?.rowsValid ?? 0;
    const extra =
      masterKey === "employee" && provisionLogins
        ? "\n\nLogins will be created for every Active employee, all sharing the same starting password until each person resets it."
        : "";
    if (!window.confirm(`Upload ${n} row(s) to ${master?.label}?${extra}`)) return;
    setBusy("Uploading");
    try {
      const r = await api(`/${masterKey}/Commit`, {
        method: "POST",
        body: JSON.stringify({ sheets, fileName: file?.name, provisionLogins }),
      });
      setReport(r);
      if (r.committed) {
        say(`Uploaded ${r.rowsWritten} row(s).`, "ok");
      } else {
        say("Rejected. Nothing was written — fix the listed rows.", "error");
      }
    } catch (e) {
      say(e.message, "error");
    } finally {
      setBusy("");
    }
  };

  const reset = () => {
    setFile(null);
    setSheets(null);
    setReport(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const totalErrors = report?.summary?.errors ?? 0;
  const canCommit = report && report.ok && !report.committed && !busy;

  return (
    <div className="mu-wrap">
      <style>{CSS}</style>

      <header className="mu-head">
        <div>
          <p className="mu-eyebrow">Data Migration</p>
          <h1 className="mu-title">{master ? master.label : "Master Uploader"}</h1>
          <p className="mu-sub">
            Fill the template, check it here, then upload. Nothing is written until you press Upload.
          </p>
        </div>
        <button className="mu-btn mu-btn-ghost" onClick={loadReference} type="button">
          <i className="bx bx-list-ul" /> {showRef ? "Hide" : "Show"} valid codes
        </button>
      </header>

      {showRef && reference && (
        <section className="mu-ref">
          <RefList title="Centres" rows={reference.centres} />
          <RefList title="Legal entities" rows={reference.entities} />
          <RefList title="Roles" rows={reference.roles} />
          <RefList title="Service & package categories" rows={reference.categories} />
          <RefList title="UOM" rows={reference.uoms} />
        </section>
      )}

      {/* ── step 1: file ───────────────────────────────────────────────── */}
      <section
        className={`mu-drop ${dragging ? "is-drag" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          readFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xlsm,.xls"
          className="mu-file"
          onChange={(e) => readFile(e.target.files?.[0])}
        />
        {file ? (
          <>
            <i className="bx bx-spreadsheet mu-drop-icon" />
            <div>
              <p className="mu-drop-name">{file.name}</p>
              <p className="mu-drop-meta">
                {Object.entries(sheets || {})
                  .map(([k, v]) => `${k}: ${v.length} row${v.length === 1 ? "" : "s"}`)
                  .join("  ·  ")}
              </p>
            </div>
            <button className="mu-btn mu-btn-ghost" type="button" onClick={reset}>
              Choose a different file
            </button>
          </>
        ) : (
          <>
            <i className="bx bx-cloud-upload mu-drop-icon" />
            <p className="mu-drop-name">Drop the filled template here</p>
            <p className="mu-drop-meta">
              or <button className="mu-link" type="button" onClick={() => fileRef.current?.click()}>browse for it</button>
              {master ? ` — expects the tabs ${master.sheets.map((s) => s.name).join(", ")}` : ""}
            </p>
          </>
        )}
      </section>

      {/* ── step 2: actions ────────────────────────────────────────────── */}
      {sheets && (
        <section className="mu-actions">
          <button className="mu-btn" onClick={runValidate} disabled={!!busy} type="button">
            {busy === "Checking rows" ? "Checking…" : "Check rows"}
          </button>
          <button className="mu-btn mu-btn-primary" onClick={runCommit} disabled={!canCommit} type="button">
            {busy === "Uploading" ? "Uploading…" : "Upload to database"}
          </button>
          {masterKey === "employee" && (
            <label className="mu-check">
              <input
                type="checkbox"
                checked={provisionLogins}
                onChange={(e) => setProvisionLogins(e.target.checked)}
              />
              Create logins for Active employees
            </label>
          )}
          {report && !report.ok && (
            <span className="mu-hint">Upload stays locked until every row passes.</span>
          )}
        </section>
      )}

      {/* ── step 3: result ─────────────────────────────────────────────── */}
      {report && (
        <section className="mu-report">
          <div className={`mu-banner ${report.committed ? "is-ok" : report.ok ? "is-ready" : "is-bad"}`}>
            {report.committed ? (
              <>
                <strong>Uploaded.</strong> {report.rowsWritten} row(s) written
                {report.loginsProvisioned ? `, ${report.loginsProvisioned} login(s) created` : ""}.
              </>
            ) : report.ok ? (
              <>
                <strong>{report.summary.rowsValid} row(s) ready.</strong> Nothing has been written yet.
                {report.sheets.some((s) => s.present === false) && (
                  <>
                    {" "}
                    Only{" "}
                    {report.sheets.filter((s) => s.present !== false).map((s) => s.name).join(", ")}{" "}
                    {report.sheets.filter((s) => s.present !== false).length === 1 ? "was" : "were"} found in
                    this file.
                  </>
                )}
              </>
            ) : (
              <>
                <strong>{totalErrors} row(s) need fixing.</strong> Nothing was written. Correct these in the
                spreadsheet, then check again.
              </>
            )}
          </div>

          {report.written && (
            <table className="mu-tbl">
              <thead>
                <tr>
                  <th>Sheet</th>
                  <th>Table</th>
                  <th className="num">Added</th>
                  <th className="num">Updated</th>
                </tr>
              </thead>
              <tbody>
                {report.written.map((w) => (
                  <tr key={w.sheet}>
                    <td>{w.sheet}</td>
                    <td className="mu-mono">{w.table}</td>
                    <td className="num">{w.inserted}</td>
                    <td className="num">{w.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {report.sheets.map((s) => (
            <div key={s.name} className="mu-sheet">
              <h3 className="mu-sheet-h">
                {s.name}
                <span className={`mu-sheet-meta ${s.present === false ? "is-absent" : ""}`}>
                  {s.present === false
                    ? "not in this file — this table will be left untouched"
                    : `${s.rowsRead} read · ${s.rowsValid} valid${
                        s.errors.length ? ` · ${s.errors.length} error${s.errors.length === 1 ? "" : "s"}` : ""
                      }`}
                </span>
              </h3>
              {s.errors.length > 0 && (
                <table className="mu-tbl mu-tbl-err">
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>Excel row</th>
                      <th style={{ width: 220 }}>Column</th>
                      <th>What to fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="mu-mono">{e.row}</td>
                        <td className="mu-mono">{e.column}</td>
                        <td>{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {s.errorsTruncated > 0 && (
                <p className="mu-hint">
                  {s.errorsTruncated} further error(s) hidden. Fix these first — many usually share one cause.
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {toast && <div className={`mu-toast is-${toast.kind}`}>{toast.message}</div>}
    </div>
  );
}

function RefList({ title, rows }) {
  if (!rows?.length) return null;
  return (
    <div className="mu-ref-col">
      <h4>{title}</h4>
      <ul>
        {rows.map((r, i) => (
          <li key={i}>
            <span className="mu-mono">{r.code}</span>
            {r.name ? <em>{r.name}</em> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const CSS = `
.mu-wrap{--navy:#1c2b4a;--ink:#28324a;--muted:#8b9ab5;--line:#d7dded;--soft:#eef1f6;--coral:#dd7766;
  padding:28px 32px;color:var(--ink);font-family:inherit;max-width:1180px}
.mu-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:22px}
.mu-eyebrow{margin:0 0 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.mu-title{margin:0;font-size:24px;font-weight:700;color:var(--navy)}
.mu-sub{margin:6px 0 0;font-size:13px;color:var(--muted);max-width:60ch}
.mu-btn{border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:8px;padding:9px 16px;
  font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.mu-btn:hover:not(:disabled){border-color:var(--navy)}
.mu-btn:disabled{opacity:.45;cursor:not-allowed}
.mu-btn-primary{background:var(--navy);border-color:var(--navy);color:#fff}
.mu-btn-ghost{background:transparent}
.mu-link{background:none;border:0;padding:0;color:var(--navy);font:inherit;text-decoration:underline;cursor:pointer}
.mu-drop{position:relative;border:2px dashed var(--line);border-radius:14px;background:#fafbfe;
  padding:34px 24px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;transition:.15s}
.mu-drop.is-drag{border-color:var(--navy);background:var(--soft)}
.mu-drop.has-file{flex-direction:row;justify-content:flex-start;text-align:left;padding:20px 24px;border-style:solid}
.mu-drop.has-file .mu-btn{margin-left:auto}
.mu-file{position:absolute;inset:0;opacity:0;cursor:pointer}
.mu-drop.has-file .mu-file{display:none}
.mu-drop-icon{font-size:30px;color:var(--navy)}
.mu-drop-name{margin:0;font-size:14px;font-weight:600;color:var(--navy)}
.mu-drop-meta{margin:2px 0 0;font-size:12px;color:var(--muted)}
.mu-actions{display:flex;align-items:center;gap:12px;margin:18px 0 4px;flex-wrap:wrap}
.mu-check{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--ink);cursor:pointer}
.mu-hint{font-size:12px;color:var(--muted);margin:0}
.mu-report{margin-top:20px}
.mu-banner{border-radius:10px;padding:13px 16px;font-size:13px;margin-bottom:18px;border:1px solid}
.mu-banner.is-ok{background:#eef7f1;border-color:#bcdcc9;color:#1d5334}
.mu-banner.is-ready{background:var(--soft);border-color:var(--line);color:var(--navy)}
.mu-banner.is-bad{background:#fdf0ee;border-color:#f0c6be;color:#8a3324}
.mu-tbl{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:18px}
.mu-tbl th{background:var(--navy);color:#fff;text-align:left;padding:9px 12px;font-weight:600}
.mu-tbl td{padding:8px 12px;border-bottom:1px solid var(--line)}
.mu-tbl tbody tr:nth-child(even){background:#fafbfe}
.mu-tbl .num{text-align:right}
.mu-tbl-err td:first-child{color:var(--coral);font-weight:600}
.mu-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.mu-sheet{margin-bottom:22px}
.mu-sheet-h{display:flex;align-items:baseline;gap:12px;font-size:14px;color:var(--navy);margin:0 0 8px}
.mu-sheet-meta{font-size:12px;font-weight:400;color:var(--muted)}
.mu-sheet-meta.is-absent{color:var(--coral);font-weight:600}
.mu-ref{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:18px;
  background:#fafbfe;border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:20px}
.mu-ref-col h4{margin:0 0 8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.mu-ref-col ul{list-style:none;margin:0;padding:0;max-height:190px;overflow:auto}
.mu-ref-col li{display:flex;gap:8px;padding:3px 0;font-size:12px;border-bottom:1px solid #f0f3f9}
.mu-ref-col em{font-style:normal;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mu-toast{position:fixed;right:26px;bottom:26px;z-index:60;padding:12px 18px;border-radius:9px;
  font-size:13px;color:#fff;box-shadow:0 8px 24px rgba(28,43,74,.22);max-width:420px}
.mu-toast.is-ok{background:#2c7a52}.mu-toast.is-error{background:#b4442f}
.mu-toast.is-warn{background:#a9772c}.mu-toast.is-info{background:var(--navy)}
@media (max-width:720px){.mu-wrap{padding:20px 16px}.mu-head{flex-direction:column}}
`;