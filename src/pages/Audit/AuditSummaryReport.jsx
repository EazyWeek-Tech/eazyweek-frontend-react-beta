"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const norm = (s) => (s ?? "").toString().trim();
const todayISO = () => new Date().toISOString().slice(0, 10);

/** Return YYYY-MM-DD from input that might be DD-MM-YYYY or ISO already */
function toISODateOnly(s) {
  const t = norm(s);
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const d = new Date(t);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}

/** Best-effort grab from any of several keys */
const pick = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v) !== "") return v;
  }
  return fallback;
};

/* ===========================
   Searchable Dropdown (single/multi)
   =========================== */
function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "None selected",
  multiple = false,
  disabled = false,
  width = "100%",
  maxMenuHeight = 280,
  showSelectAll = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = norm(query).toLowerCase();
    if (!q) return options;
    return options.filter((o) => norm(o.label).toLowerCase().includes(q));
  }, [options, query]);

  const isSelected = (val) => (multiple ? Array.isArray(value) && value.includes(val) : value === val);

  const displayText = useMemo(() => {
    if (multiple) {
      const vals = Array.isArray(value) ? value : [];
      if (!vals.length) return placeholder;
      const labels = vals
        .map((v) => options.find((o) => o.value === v)?.label || v)
        .filter(Boolean);
      return labels.join(", ");
    } else {
      if (!value) return placeholder;
      return options.find((o) => o.value === value)?.label || value;
    }
  }, [value, options, multiple, placeholder]);

  const toggleItem = (val) => {
    if (multiple) {
      const arr = Array.isArray(value) ? [...value] : [];
      const idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(val);
      onChange(arr);
    } else {
      onChange(val);
      setOpen(false);
    }
  };

  const clearSearch = () => setQuery("");

  const allSelected =
    multiple &&
    Array.isArray(value) &&
    filtered.length > 0 &&
    filtered.every((o) => value.includes(o.value));

  const toggleSelectAll = () => {
    if (!multiple) return;
    const arr = Array.isArray(value) ? [...value] : [];
    if (allSelected) {
      onChange(arr.filter((v) => !filtered.some((o) => o.value === v)));
    } else {
      const union = new Set(arr);
      filtered.forEach((o) => union.add(o.value));
      onChange(Array.from(union));
    }
  };

  return (
    <div className={`dd-wrap ${disabled ? "disabled" : ""}`} style={{ width }} ref={wrapRef}>
      <button
        type="button"
        className="dd-input"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`dd-text ${displayText === placeholder ? "muted" : ""}`}>{displayText}</span>
        <span className="dd-caret">▾</span>
      </button>

      {open && (
        <div className="dd-menu" style={{ maxHeight: maxMenuHeight }}>
          <div className="dd-search">
            <span className="ico">🔍</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
            {query && (
              <button className="clear" onClick={clearSearch} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          {multiple && showSelectAll && (
            <label className="dd-option select-all">
              <input type="checkbox" checked={!!allSelected} onChange={toggleSelectAll} />
              <span>Select all</span>
            </label>
          )}

          <div className="dd-list" role="listbox" aria-multiselectable={multiple}>
            {filtered.map((o) => (
              <label key={o.value} className="dd-option">
                <input type="checkbox" checked={!!isSelected(o.value)} onChange={() => toggleItem(o.value)} />
                <span>{o.label}</span>
              </label>
            ))}
            {!filtered.length && <div className="dd-empty">No matches</div>}
          </div>
        </div>
      )}

      <style jsx>{`
        .dd-wrap { position: relative; }
        .dd-wrap.disabled { opacity: .6; pointer-events: none; }
        .dd-input {
          width: 100%; height: 36px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
          background: #fff; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; cursor: pointer;
        }
        .dd-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dd-text.muted { color: #98a1b3; }
        .dd-caret { color: #5a6270; font-size: 12px; }
        .dd-menu {
          position: absolute; left: 0; right: 0; z-index: 30; background: #fff; border: 1px solid #e6ebf2;
          box-shadow: 0 8px 26px rgba(0,0,0,.08); border-radius: 8px; margin-top: 6px; overflow: auto; width: 280px;
        }
        .dd-search { display: grid; grid-template-columns: 20px 1fr 22px; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid #eef1f6; }
        .dd-search input { height: 28px; border: 1px solid #e3e8f1; border-radius: 6px; padding: 0 8px; outline: none; }
        .dd-search .ico { text-align: center; color: #7a8599; }
        .dd-search .clear { background: none; border: none; font-size: 18px; line-height: 1; color: #7a8599; cursor: pointer; }
        .dd-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; user-select: none; }
        .dd-option + .dd-option { border-top: 1px solid #f6f7fb; }
        .dd-option:hover { background: #f7f9fc; }
        .dd-empty { padding: 12px; color: #8a94a7; text-align: center; }
        .select-all { font-weight: 700; }
      `}</style>
    </div>
  );
}

/* ===========================
   Page: Audit Summary Report
   =========================== */
export default function AuditSummaryReport() {
  const navigate = useNavigate();
  const { state } = useLocation() || {};

  const defaultFrom = `${new Date().getFullYear()}-01-01`;
  const [fromDate, setFromDate] = useState(toISODateOnly(state?.fromDate) || defaultFrom);
  const [toDate, setToDate] = useState(toISODateOnly(state?.toDate) || todayISO());

  // filters
  const [segmentCodes, setSegmentCodes] = useState(
    Array.isArray(state?.segments) ? state.segments.map(norm) : norm(state?.segment) ? [norm(state?.segment)] : []
  );
  const [auditorCodes, setAuditorCodes] = useState(
    Array.isArray(state?.auditorCodes) ? state.auditorCodes.map(norm) : []
  );
  const [clinic, setClinic] = useState(norm(state?.clinic) || "");
  const [employeeCode, setEmployeeCode] = useState(norm(state?.employeeCode) || "");

  // options
  const [segments, setSegments] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [auditors, setAuditors] = useState([]);

  // data & ui
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize), [rows, page]);

  const showToast = (message, type = "error", ms = 2200) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  // load options
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Segments
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/AuditSegment`, { credentials: "include" });
          const d = await r.json();
          const list = (Array.isArray(d) ? d : d ? [d] : []).map((x) => ({
            value: norm(x.code) || norm(x.name),
            label: norm(x.name) || norm(x.code),
          }));
          setSegments(list);
          if (segmentCodes.length) {
            const valSet = new Set(list.map((o) => o.value));
            setSegmentCodes(segmentCodes.filter((v) => valSet.has(v)));
          }
        } catch {
          setSegments([]);
        }

        // Clinics
        try {
          const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" });
          const d = await r.json();
          const list = (Array.isArray(d) ? d : d ? [d] : []).map((x) => ({
            value: x.code ?? x.centerCode ?? norm(x.name),
            label: x.name ?? x.centerName ?? (x.code ?? ""),
          }));
          setClinics(list);
          if (clinic && !list.some((o) => o.value === clinic)) setClinic("");
        } catch {
          setClinics([]);
        }

        // Auditors
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditors`, { credentials: "include" });
          const d = await r.json();
          const list = (Array.isArray(d) ? d : d ? [d] : []).map((x) => ({
            value: x.code ?? x.employeeCode ?? "",
            label: x.name ?? x.employeeName ?? "",
          })).filter((a) => a.value || a.label);
          setAuditors(list);
          if (auditorCodes.length) {
            const ok = new Set(list.map((o) => o.value));
            setAuditorCodes(auditorCodes.filter((v) => ok.has(v)));
          }
        } catch {
          setAuditors([]);
        }
      } catch (e) {
        console.error(e);
        showToast("Failed to load filters");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load employees for ALL selected segments and merge
  useEffect(() => {
    let abort = false;
    async function loadEmployees() {
      if (!segmentCodes?.length) {
        setEmployees([]);
        setEmployeeCode("");
        return;
      }
      try {
        const results = await Promise.all(
          segmentCodes.map((seg) =>
            fetch(`${API_BASE_URL}/api/Audit/LoadEmployeesInAudit/${encodeURIComponent(seg)}`, { credentials: "include" })
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => [])
          )
        );
        const merged = results.flatMap((d) => (Array.isArray(d) ? d : d ? [d] : []));
        const seen = new Set();
        const mapped = [];
        for (const x of merged) {
          const code = x.code ?? x.employeeCode ?? "";
          const name = x.name ?? x.employeeName ?? "";
          const key = code || name;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          mapped.push({ value: key, label: name || code });
        }
        mapped.sort((a, b) => a.label.localeCompare(b.label));
        if (!abort) {
          setEmployees(mapped);
          if (employeeCode && !mapped.some((o) => o.value === employeeCode)) setEmployeeCode("");
        }
      } catch (e) {
        if (!abort) {
          console.error(e);
          setEmployees([]);
        }
      }
    }
    loadEmployees();
    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentCodes.join("|")]);

  // load summary
  const loadSummary = async () => {
    setLoading(true);
    setPage(1);
    try {
      // IMPORTANT: Use DATE-ONLY strings as per your sample
      const body = {
        fromDate: toISODateOnly(fromDate),
        toDate: toISODateOnly(toDate),
        clinic: clinic || "",
        auditSegment: segmentCodes.join(","), // multi -> csv
        auditor: auditorCodes.join(","), // multi -> csv
        employee: employeeCode || "",
        auditSubSegment: "",
        dateFlag: "0",
        isDigitalInTheList: "",
      };

      console.log("Audit Summary payload:", body);

      const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditSummaryReport`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const arr = Array.isArray(d) ? d : d ? [d] : [];

      // Map EXACT fields from your response type
      const normalized = arr.map((x, i) => ({
        key: pick(x, ["auditNo", "auditNumber", "auditId", "code"], `row-${i}`),
        auditNo: x.auditNo ?? "",
        monthYear: x.auditMonth ?? "", // e.g., "December/2023"
        auditDate: x.auditDate ?? "", // already "DD/MM/YYYY"
        employeeId: x.employeeCode ?? "",
        employeeName: x.employeeName ?? "",
        clinic: x.clinicName ?? "",
        segment: x.auditSegment ?? "",
        score: x.auditScore ?? "",
        auditor: x.auditorName ?? "",
        createdDate: x.createdDate ?? "", // already "DD/MM/YYYY"
        submittedDate: x.submittedDate ?? "", // already "DD/MM/YYYY"
      }));

      setRows(normalized);
    } catch (e) {
      console.error(e);
      showToast("Failed to load summary report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onClickAudit(no) {
    if (!no) return;
    navigate(`/audit/view/${encodeURIComponent(no)}`, { state: { from: "summary" } });
  }

  function quoteCSV(val) {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = [
      "Audit No",
      "Audit Month / Year",
      "Audit Date",
      "Employee ID",
      "Employee Name",
      "Clinic",
      "Audit Segment",
      "Audit Score",
      "Auditor",
      "Audit Created Date",
      "Audit Submitted Date",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.auditNo,
          r.monthYear,
          r.auditDate,
          r.employeeId,
          quoteCSV(r.employeeName),
          quoteCSV(r.clinic),
          quoteCSV(r.segment),
          r.score,
          quoteCSV(r.auditor),
          r.createdDate,
          r.submittedDate,
        ]
          .map((v) => v ?? "")
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Audit_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="wrap">
      <h1 className="title">Audit Summary Report</h1>
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("/")}>
          DashBoard
        </span>
        <span className="sep"> &gt; </span>
        <span className="crumb-dim">Summary Report</span>
      </div>

      <div className="filters">
        <div className="grid">
          <div className="frow">
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(toISODateOnly(e.target.value))} />
          </div>
          <div className="frow">
            <label>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(toISODateOnly(e.target.value))} />
          </div>
          <div className="frow">
            <label>Clinic</label>
            <SearchableDropdown options={clinics} value={clinic} onChange={setClinic} multiple={false} placeholder="None selected" />
          </div>
          <div className="frow">
            <label>Audit Segment</label>
            <SearchableDropdown options={segments} value={segmentCodes} onChange={setSegmentCodes} multiple placeholder="None selected" />
          </div>
          <div className="frow">
            <label>Auditor</label>
            <SearchableDropdown options={auditors} value={auditorCodes} onChange={setAuditorCodes} multiple placeholder="None selected" />
          </div>
          <div className="frow">
            <label>Employee</label>
            <SearchableDropdown options={employees} value={employeeCode} onChange={setEmployeeCode} multiple={false} placeholder="None selected" />
          </div>
        </div>

        <div className="actions">
          <button className="btn" onClick={loadSummary} disabled={loading}>
            View
          </button>
          <button className="btn" onClick={exportCSV} disabled={!rows.length}>
            Export
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Audit No</th>
              <th>Audit Month / Year</th>
              <th>Audit Date</th>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Clinic</th>
              <th>Audit Segment</th>
              <th>Audit Score</th>
              <th>Auditor</th>
              <th>Audit Created Date</th>
              <th>Audit Submitted Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="loading">Loading…</td></tr>}
            {!loading && !pageRows.length && <tr><td colSpan={11} className="empty">No data</td></tr>}
            {!loading &&
              pageRows.map((r, idx) => (
                <tr key={`${r.key}-${idx}`}>
                  <td><button className="link" onClick={() => onClickAudit(r.auditNo)}>{r.auditNo}</button></td>
                  <td>{r.monthYear}</td>
                  <td>{r.auditDate}</td>
                  <td>{r.employeeId}</td>
                  <td>{r.employeeName}</td>
                  <td>{r.clinic}</td>
                  <td>{r.segment}</td>
                  <td>{r.score}</td>
                  <td>{r.auditor}</td>
                  <td>{r.createdDate}</td>
                  <td>{r.submittedDate}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="pager">
          <button className="pagebtn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span className="pageno">{page}</span>
          <button className="pagebtn" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</button>
          <span className="pagecount">/ {pageCount}</span>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .title { font-size: 22px; font-weight: 700; color: #0b1f3a; margin: 0 0 6px; }
        .breadcrumb { color: #5e6a7b; margin: 18px 0; }
        .crumb-link { color: #2e5aac; cursor: pointer; }
        .crumb-dim { color: #8893a5; }
        .sep { margin: 0 6px; }

        .filters { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 16px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px 18px; }
        .frow { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 14px; font-weight: 700; color: #5a6270; }
        input[type="date"] { height: 36px; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; outline: none; background: #fff; }

        .actions { margin-top: 10px; display: flex; gap: 12px; justify-content: flex-end; }
        .btn { background: #334b71; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }

        .table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 10px 0; }
        table.tbl { width: 100%; border-collapse: separate; border-spacing: 0 0; }
        .tbl thead th { text-align: left; font-size: 13px; color: #6c7688; font-weight: 700; padding: 10px 14px; border-bottom: 1px solid #eef1f6; }
        .tbl tbody td { font-size: 14px; color: #1b2636; padding: 12px 14px; border-bottom: 1px solid #f1f4f9; }
        .link { background: none; border: none; color: #2e5aac; cursor: pointer; padding: 0; text-decoration: none; font-weight: 600; }
        .loading, .empty { text-align: center; color: #6b7280; padding: 18px; }

        .pager { display: flex; align-items: center; gap: 8px; justify-content: flex-end; padding: 10px 14px; }
        .pagebtn { background: #fff; color: #6b7280; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
        .pageno, .pagecount { color: #4b5563; font-weight: 600; }

        .toast { position: fixed; height: 50px; bottom: 16px; right: 16px; color:#fff; background:#d7263d; padding:10px 14px; border-radius:8px; font-weight:600; box-shadow:0 6px 18px rgba(0,0,0,0.15); z-index:9999; }
        .toast.success { background:#138a36; }

        @media (max-width: 1100px) { .grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
