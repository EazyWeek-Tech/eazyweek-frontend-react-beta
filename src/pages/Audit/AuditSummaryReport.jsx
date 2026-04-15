"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const norm = (s) => (s ?? "").toString().trim();

function toISODateOnly(s) {
  const t = norm(s);
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  let m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  const d = new Date(t);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const tryJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };
const pickCode = (o) => norm(o?.topCode ?? o?.loginCode ?? o?.centerCode ?? o?.tCenterCode ?? "");
const pickName = (o) => norm(o?.centerName ?? o?.clinicName ?? "");

function getSessionClinic() {
  if (typeof window === "undefined") return { code: "", name: "" };
  const g = window.__SESSION__ || window.__USER__ || window.__APP__ || {};
  const fromGlobal = pickCode(g);
  if (fromGlobal) return { code: fromGlobal, name: pickName(g) };
  const priorityKeys = ["userSession", "user", "session", "auth", "currentUser", "loggedInUser"];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    if (!storage) continue;
    for (const k of priorityKeys) {
      const raw = storage.getItem(k);
      if (!raw) continue;
      const p = tryJSON(raw);
      if (p && typeof p === "object") { const c = pickCode(p); const n = pickName(p); if (c) return { code: c, name: n }; }
    }
  }
  return { code: "", name: "" };
}

function getYearOptions() {
  const cur = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => ({ value: String(cur - i), label: String(cur - i) }));
}

const MONTH_OPTIONS = MONTHS.map(m => ({ value: m, label: m }));
const YEAR_OPTIONS = getYearOptions();
const PAGE_SIZE = 10;

function SearchableDropdown({ options, value, onChange, placeholder = "Select", multiple = false, disabled = false, clearable = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() => {
    const q = norm(query).toLowerCase();
    return q ? options.filter(o => norm(o.label).toLowerCase().includes(q)) : options;
  }, [options, query]);

  const isSel = (v) => multiple ? (Array.isArray(value) && value.includes(v)) : value === v;

  const label = useMemo(() => {
    if (multiple) {
      const vals = Array.isArray(value) ? value : [];
      if (!vals.length) return placeholder;
      return vals.map(v => options.find(o => o.value === v)?.label || v).join(", ");
    }
    return value ? (options.find(o => o.value === value)?.label || value) : placeholder;
  }, [value, options, multiple, placeholder]);

  const toggle = (v) => {
    if (multiple) {
      const arr = Array.isArray(value) ? [...value] : [];
      const i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else arr.push(v);
      onChange(arr);
    } else { onChange(v); setOpen(false); }
  };

  const allSel = multiple && Array.isArray(value) && filtered.length > 0 && filtered.every(o => value.includes(o.value));
  const toggleAll = () => {
    if (!multiple) return;
    const arr = Array.isArray(value) ? [...value] : [];
    if (allSel) onChange(arr.filter(v => !filtered.some(o => o.value === v)));
    else { const u = new Set(arr); filtered.forEach(o => u.add(o.value)); onChange(Array.from(u)); }
  };

  const hasValue = multiple ? (Array.isArray(value) && value.length > 0) : !!value;

  return (
    <div className={`dd${disabled ? " dd-off" : ""}`} ref={ref}>
      <div className="dd-row">
        <button type="button" className="dd-btn" onClick={() => !disabled && setOpen(v => !v)} disabled={disabled}>
          <span className={`dd-lbl${!hasValue ? " ph" : ""}`}>{label}</span>
          <span className="dd-arr">▾</span>
        </button>
        {clearable && hasValue && !disabled && (
          <button type="button" className="dd-clear" onClick={(e) => { e.stopPropagation(); onChange(multiple ? [] : ""); setOpen(false); }} title="Clear">×</button>
        )}
      </div>
      {open && (
        <div className="dd-menu">
          <div className="dd-srch">
            <span>🔍</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." autoFocus />
            {query && <button onClick={() => setQuery("")} className="dd-x">×</button>}
          </div>
          {multiple && <label className="dd-opt dd-all"><input type="checkbox" checked={!!allSel} onChange={toggleAll}/><span>Select all</span></label>}
          <div className="dd-list">
            {filtered.map(o => (
              <label key={o.value} className="dd-opt">
                <input type="checkbox" checked={!!isSel(o.value)} onChange={() => toggle(o.value)}/>
                <span>{o.label}</span>
              </label>
            ))}
            {!filtered.length && <div className="dd-nil">No matches</div>}
          </div>
        </div>
      )}
      <style jsx>{`
        .dd { position: relative; }
        .dd-off { opacity: .55; pointer-events: none; }
        .dd-row { display: flex; align-items: center; gap: 2px; }
        .dd-btn { flex: 1; min-width: 0; height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 6px; background: #fff; border: 1.5px solid #d8dee8; border-radius: 8px; padding: 0 10px; cursor: pointer; font-size: 13px; color: #1b2636; transition: border-color .15s; }
        .dd-btn:hover { border-color: #334b71; }
        .dd-lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: left; }
        .dd-lbl.ph { color: #9aa4b4; }
        .dd-arr { color: #6b7a8d; font-size: 11px; flex-shrink: 0; }
        .dd-clear { width: 26px; height: 26px; background: #f0f2f6; border: none; border-radius: 6px; color: #6b7a8d; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dd-clear:hover { background: #e0e6f0; color: #c0392b; }
        .dd-menu { position: absolute; left: 0; right: 0; z-index: 50; background: #fff; border: 1.5px solid #e0e6f0; box-shadow: 0 8px 28px rgba(0,0,0,.11); border-radius: 10px; margin-top: 4px; overflow: hidden; min-width: 220px; }
        .dd-srch { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid #eef1f6; }
        .dd-srch input { flex: 1; height: 28px; border: 1px solid #e0e6f0; border-radius: 6px; padding: 0 8px; outline: none; font-size: 12px; }
        .dd-x { background: none; border: none; font-size: 16px; color: #9aa4b4; cursor: pointer; }
        .dd-list { max-height: 230px; overflow-y: auto; }
        .dd-opt { display: flex; align-items: center; gap: 8px; padding: 9px 12px; cursor: pointer; font-size: 13px; color: #1b2636; }
        .dd-opt:hover { background: #f5f7fb; }
        .dd-opt + .dd-opt { border-top: 1px solid #f5f7fb; }
        .dd-all { font-weight: 700; background: #f9fafc; }
        .dd-nil { padding: 12px; color: #9aa4b4; text-align: center; font-size: 13px; }
      `}</style>
    </div>
  );
}

export default function AuditSummaryReport() {
  const navigate = useNavigate();
  const sessionClinic = useMemo(() => getSessionClinic(), []);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [segmentCodes, setSegmentCodes] = useState([]);
  const [auditorCodes, setAuditorCodes] = useState([]);
  const [employeeCode, setEmployeeCode] = useState("");
  const [auditMonths, setAuditMonths] = useState([]);
  const [auditYears, setAuditYears] = useState([]);

  const [clinicDisplayName, setClinicDisplayName] = useState(sessionClinic.name || sessionClinic.code || "");
  const [segments, setSegments] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);

  const showToast = (msg, type = "error") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600); };
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => rows.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE), [rows, page]);

  const clinicCode = sessionClinic.code;
  const clinicLabel = clinicDisplayName || sessionClinic.code || "—";

  useEffect(() => {
    (async () => {
      try {
        const [segR, audR, clinR] = await Promise.all([
          fetch(`${API_BASE_URL}/api/Audit/AuditSegment`, { credentials: "include" }).then(r => r.json()).catch(() => []),
          fetch(`${API_BASE_URL}/api/Audit/LoadAuditors`, { credentials: "include" }).then(r => r.json()).catch(() => []),
          fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" }).then(r => r.json()).catch(() => []),
        ]);
        setSegments((Array.isArray(segR) ? segR : []).map(x => ({ value: norm(x.code)||norm(x.name), label: norm(x.name)||norm(x.code) })));
        setAuditors((Array.isArray(audR) ? audR : []).map(x => ({ value: x.code ?? x.employeeCode ?? "", label: x.name ?? x.employeeName ?? "" })).filter(a => a.value));
        const clinList = Array.isArray(clinR) ? clinR : [];
        const code = sessionClinic.code;
        if (code) {
          const match = clinList.find(c => norm(c.code).toLowerCase() === norm(code).toLowerCase());
          if (match) setClinicDisplayName(match.name ?? match.centerName ?? code);
        }
      } catch { showToast("Failed to load filter options"); }
    })();
  }, []);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!segmentCodes.length) { setEmployees([]); setEmployeeCode(""); return; }
      const results = await Promise.all(
        segmentCodes.map(seg => fetch(`${API_BASE_URL}/api/Audit/LoadEmployeesInAudit/${encodeURIComponent(seg)}`, { credentials: "include" }).then(r => r.ok ? r.json() : []).catch(() => []))
      );
      const seen = new Set(); const mapped = [];
      for (const x of results.flat()) {
        const code = x.code ?? x.employeeCode ?? ""; const name = x.name ?? x.employeeName ?? ""; const key = code || name;
        if (!key || seen.has(key)) continue; seen.add(key); mapped.push({ value: key, label: name || code });
      }
      mapped.sort((a,b) => a.label.localeCompare(b.label));
      if (!abort) { setEmployees(mapped); if (employeeCode && !mapped.some(o => o.value === employeeCode)) setEmployeeCode(""); }
    })();
    return () => { abort = true; };
  }, [segmentCodes.join("|")]);

  const validate = () => {
    const e = {};
    if (!fromDate) e.fromDate = "Required";
    if (!toDate) e.toDate = "Required";
    if (fromDate && toDate && fromDate > toDate) e.toDate = "Must be after From Date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const runSearch = async () => {
    setSearched(true);
    if (!validate()) return;
    setLoading(true); setPage(1);
    try {
      const body = {
        fromDate: `${fromDate}T00:00:00Z`,
        toDate: `${toDate}T23:59:59Z`,
        clinic: clinicCode || "",
        auditSegment: segmentCodes.join(","),
        auditor: auditorCodes.join(","),
        employee: employeeCode || "",
        auditSubSegment: "",
        dateFlag: "1",
        isDigitalInTheList: "",
      };
      const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditSummaryReport`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      let arr = await r.json().catch(() => []);
      if (!Array.isArray(arr)) arr = arr ? [arr] : [];
      if (auditMonths.length) arr = arr.filter(x => auditMonths.includes(norm(x.auditMonth ?? "").split("/")[0]));
      if (auditYears.length) arr = arr.filter(x => auditYears.includes((norm(x.auditMonth ?? "").split("/")[1]) || ""));
      setRows(arr.map((x, i) => ({
        key: x.auditNo || `r${i}`, auditNo: x.auditNo ?? "", monthYear: x.auditMonth ?? "",
        auditDate: x.auditDate ?? "", employeeId: x.employeeCode ?? "", employeeName: x.employeeName ?? "",
        clinic: x.clinicName ?? "", segment: x.auditSegment ?? "", score: x.auditScore ?? "",
        auditor: x.auditorName ?? "", createdDate: x.createdDate ?? "", submittedDate: x.submittedDate ?? "",
      })));
    } catch { showToast("Failed to load report"); setRows([]); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!rows.length) return;
    const cols = [["Audit No","auditNo"],["Month/Year","monthYear"],["Audit Date","auditDate"],["Employee ID","employeeId"],["Employee Name","employeeName"],["Clinic","clinic"],["Segment","segment"],["Score","score"],["Auditor","auditor"],["Created","createdDate"],["Submitted","submittedDate"]];
    const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const thStyle = `style="background:#334b71;color:#fff;font-weight:bold;border:1px solid #ccc;padding:6px 10px;font-size:12px;"`;
    const tdStyle = `style="border:1px solid #e5e7eb;padding:5px 10px;font-size:12px;mso-number-format:'\\@';"`;
    const thead = `<tr>${cols.map(([h]) => `<th ${thStyle}>${esc(h)}</th>`).join("")}</tr>`;
    const tbody = rows.map(r => `<tr>${cols.map(([,k]) => `<td ${tdStyle}>${esc(r[k])}</td>`).join("")}</tr>`).join("");
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"/><style>table,td,th{font-family:Arial,sans-serif;}</style></head><body><table cellspacing="0" cellpadding="0">${thead}${tbody}</table></body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
    a.download = `AuditSummary_${todayLocalISO()}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const reset = () => { setFromDate(""); setToDate(""); setSegmentCodes([]); setAuditorCodes([]); setEmployeeCode(""); setAuditMonths([]); setAuditYears([]); setRows([]); setSearched(false); setErrors({}); };

  return (
    <div className="rw">
      <div className="rw-hd">
        <div>
          <h1 className="rw-ttl">Audit Summary Report</h1>
          <div className="rw-bc"><span className="bc-lnk" onClick={() => navigate("/audit")}>Audit</span><span className="bc-sep">›</span><span className="bc-cur">Summary Report</span></div>
        </div>
        {rows.length > 0 && <span className="rw-badge">{rows.length} record{rows.length !== 1 ? "s" : ""}</span>}
      </div>

      <div className="fc">
        <div className="fc-sect">Date Range <span className="req">*</span> <span className="fc-note">— Submitted Date</span></div>
        <div className="fg fg-2">
          <div className="ff">
            <label>From Date <span className="req">*</span></label>
            <input type="date" value={fromDate} onChange={e => setFromDate(toISODateOnly(e.target.value))} className={errors.fromDate ? "fi fi-err" : "fi"} />
            {errors.fromDate && <span className="ferr">{errors.fromDate}</span>}
          </div>
          <div className="ff">
            <label>To Date <span className="req">*</span></label>
            <input type="date" value={toDate} onChange={e => setToDate(toISODateOnly(e.target.value))} className={errors.toDate ? "fi fi-err" : "fi"} />
            {errors.toDate && <span className="ferr">{errors.toDate}</span>}
          </div>
        </div>

        <div className="fc-sect" style={{marginTop:18}}>Filters</div>
        <div className="fg fg-4">
          <div className="ff">
            <label>Clinic</label>
            <input className="fi fi-ro" value={clinicLabel} readOnly />
          </div>
          <div className="ff">
            <label>Audit Segment</label>
            <SearchableDropdown options={segments} value={segmentCodes} onChange={setSegmentCodes} multiple placeholder="All segments" />
          </div>
          <div className="ff">
            <label>Auditor</label>
            <SearchableDropdown options={auditors} value={auditorCodes} onChange={setAuditorCodes} multiple placeholder="All auditors" />
          </div>
          <div className="ff">
            <label>Employee</label>
            <SearchableDropdown options={employees} value={employeeCode} onChange={v => setEmployeeCode(v)} placeholder="All employees" disabled={!segmentCodes.length} clearable={false} />
            {employeeCode && <button className="sel-clr" onClick={() => setEmployeeCode("")}>✕ Clear employee</button>}
          </div>
          <div className="ff">
            <label>Audit Month</label>
            <SearchableDropdown options={MONTH_OPTIONS} value={auditMonths} onChange={setAuditMonths} multiple placeholder="All months" />
          </div>
          <div className="ff">
            <label>Audit Year</label>
            <SearchableDropdown options={YEAR_OPTIONS} value={auditYears} onChange={setAuditYears} multiple placeholder="All years" />
          </div>
        </div>

        <div className="fa">
          <button className="btn-rst" onClick={reset}>Reset</button>
          <button className="btn-xls" onClick={exportExcel} disabled={!rows.length}>Export Excel</button>
          <button className="btn-go" onClick={runSearch} disabled={loading}>{loading ? "Searching…" : "Search"}</button>
        </div>
      </div>

      <div className="tc">
        <div className="tw">
          <table className="tbl">
            <thead><tr>
              <th>Audit No</th><th>Month / Year</th><th>Audit Date</th><th>Employee ID</th>
              <th>Employee Name</th><th>Clinic</th><th>Segment</th><th>Score</th>
              <th>Auditor</th><th>Created</th><th>Submitted</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="ts"><span className="sp"/>&nbsp;Loading…</td></tr>}
              {!loading && !pageRows.length && <tr><td colSpan={11} className="ts">{searched ? "No records found." : "Set filters and click Search."}</td></tr>}
              {!loading && pageRows.map((r,i) => (
                <tr key={`${r.key}-${i}`} className={i%2===0?"":"ta"}>
                  <td><button className="lnk" onClick={() => navigate(`/audit/view/${encodeURIComponent(r.auditNo)}`)}>{r.auditNo}</button></td>
                  <td>{r.monthYear}</td><td>{r.auditDate}</td>
                  <td><span className="ec">{r.employeeId}</span></td>
                  <td>{r.employeeName}</td><td>{r.clinic}</td>
                  <td><span className="sp-seg">{r.segment}</span></td>
                  <td><strong>{r.score}</strong></td>
                  <td>{r.auditor}</td><td>{r.createdDate}</td><td>{r.submittedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="pg">
            <span className="pg-info">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,rows.length)} of {rows.length}</span>
            <div className="pg-btns">
              <button className="pb" disabled={page<=1} onClick={() => setPage(1)}>«</button>
              <button className="pb" disabled={page<=1} onClick={() => setPage(p=>p-1)}>‹</button>
              <span className="pg-num">{page} / {pageCount}</span>
              <button className="pb" disabled={page>=pageCount} onClick={() => setPage(p=>p+1)}>›</button>
              <button className="pb" disabled={page>=pageCount} onClick={() => setPage(pageCount)}>»</button>
            </div>
          </div>
        )}
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <style jsx>{`
        .rw-hd { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
        .rw-ttl { font-size:22px; font-weight:800; color:#334b71; letter-spacing:-0.3px; }
        .rw-bc { display:flex; align-items:center; gap:6px; margin-top:4px; font-size:13px; }
        .bc-lnk { color:#334b71; cursor:pointer; font-weight:600; } .bc-lnk:hover { text-decoration:underline; }
        .bc-sep { color:#c0c8d8; } .bc-cur { color:#8a94a6; }
        .rw-badge { background:#334b71; color:#fff; font-size:12px; font-weight:700; padding:4px 12px; border-radius:20px; }

        .fc { background:#fff; border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.03); padding:20px 24px; margin-bottom:16px; }
        .fc-sect { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#8a94a6; margin-bottom:12px; }
        .fc-note { text-transform:none; letter-spacing:0; font-weight:600; font-size:11px; }
        .req { color:#c0392b; }
        .fg { display:grid; gap:14px 20px; }
        .fg-2 { grid-template-columns:repeat(2,1fr); }
        .fg-4 { grid-template-columns:repeat(4,1fr); }
        .ff { display:flex; flex-direction:column; gap:5px; }
        label { font-size:12px; font-weight:700; color:#4b5668; }
        .fi { height:38px; border:1.5px solid #d8dee8; border-radius:8px; padding:0 10px; outline:none; background:#fff; font-size:13px; color:#1b2636; transition:border-color .15s; width:100%; box-sizing:border-box; }
        .fi:focus { border-color:#334b71; box-shadow:0 0 0 3px rgba(51,75,113,.08); }
        .fi-err { border-color:#c0392b; }
        .fi-ro { background:#f7f9fc; color:#4b5668; cursor:default; }
        .ferr { font-size:11px; color:#c0392b; font-weight:600; }
        .sel-clr { background:none; border:none; color:#c0392b; font-size:11px; font-weight:700; cursor:pointer; padding:2px 0; text-align:left; }
        .sel-clr:hover { text-decoration:underline; }

        .fa { display:flex; align-items:center; gap:10px; justify-content:flex-end; margin-top:20px; padding-top:16px; border-top:1px solid #eaecf0; }
        .btn-rst { background:none; color:#6b7a8d; border:1.5px solid #d8dee8; border-radius:8px; padding:8px 18px; font-size:13px; font-weight:700; cursor:pointer; }
        .btn-rst:hover { border-color:#334b71; color:#334b71; }
        .btn-xls { background:#f0f2f6; color:#334b71; border:none; border-radius:8px; padding:8px 18px; font-size:13px; font-weight:700; cursor:pointer; }
        .btn-xls:hover:not(:disabled) { background:#dde3ef; }
        .btn-xls:disabled { opacity:.5; cursor:not-allowed; }
        .btn-go { background:#334b71; color:#fff; border:none; border-radius:8px; padding:8px 24px; font-size:13px; font-weight:700; cursor:pointer; transition:background .15s; }
        .btn-go:hover:not(:disabled) { background:#334b71; }
        .btn-go:disabled { opacity:.65; cursor:not-allowed; }

        .tc { background:#fff; border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.03); overflow:hidden; }
        .tw { overflow-x:auto; }
        .tbl { width:100%; border-collapse:collapse; min-width:1100px; }
        .tbl thead tr { background:#334b71; }
        .tbl th { padding:11px 14px; text-align:left; font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:#fff; white-space:nowrap; }
        .tbl tbody tr { border-bottom:1px solid #f3f4f6; transition:background .1s; }
        .tbl tbody tr:hover { background:#f8f9fb; }
        .ta { background:#fafbfd; }
        .tbl td { padding:10px 14px; font-size:13px; color:#1b2636; white-space:nowrap; }
        td.ts { text-align:center; padding:36px; color:#8a94a6; font-size:14px; }
        .sp { display:inline-block; width:16px; height:16px; border:2px solid #e0e6f0; border-top-color:#334b71; border-radius:50%; animation:spin .7s linear infinite; vertical-align:middle; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .lnk { background:none; border:none; color:#334b71; font-weight:700; cursor:pointer; font-size:13px; padding:0; }
        .lnk:hover { text-decoration:underline; }
        .ec { font-family:monospace; font-size:12px; color:#6b7a8d; }
        .sp-seg { background:#eef2fa; color:#334b71; font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px; }

        .pg { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-top:1px solid #eaecf0; }
        .pg-info { font-size:12px; color:#8a94a6; font-weight:600; }
        .pg-btns { display:flex; align-items:center; gap:4px; }
        .pb { background:#f0f2f6; border:none; border-radius:6px; width:30px; height:30px; font-size:14px; cursor:pointer; color:#334b71; }
        .pb:hover:not(:disabled) { background:#334b71; color:#fff; }
        .pb:disabled { opacity:.4; cursor:not-allowed; }
        .pg-num { font-size:12px; font-weight:700; color:#4b5668; padding:0 8px; }

        .toast { position:fixed; bottom:24px; right:24px; padding:12px 18px; border-radius:10px; font-size:14px; font-weight:600; color:#fff; box-shadow:0 8px 24px rgba(0,0,0,.15); z-index:9999; animation:tin .2s ease; }
        @keyframes tin { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .toast-error { background:#c0392b; }
        .toast-success { background:#138a36; }

        @media(max-width:1100px) { .fg-4{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:700px) { .rw{padding:16px;} .fg-2,.fg-4{grid-template-columns:1fr;} }
      `}</style>
    </div>
  );
}