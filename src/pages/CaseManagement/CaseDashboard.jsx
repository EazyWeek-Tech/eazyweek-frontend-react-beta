// src/pages/Cases/CaseDashboard.jsx
// Combined Case dashboard — replaces index.jsx + DashboardOverview.jsx +
// FilterBar.jsx + CaseTable.jsx, styled to match OpportunityDashboard.
// CreateCaseModel stays a separate modal, controlled from here.
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

import CreateCaseModel from "./CreateCaseModel";

/* ── EazyWeek palette (matches OpportunityDashboard) ───────────────────────── */
const C = {
  navy:"#334b71", navyDk:"#071D49", navyLt:"#e9edf5",
  open:"#cc6b5c", wip:"#d4a853", closed:"#8da0b8", cvt:"#4a9e8a",
  grid:"#eef2f7", axis:"#6e7b8f", border:"#e7ecf4",
  bg:"#f4f6fa", text:"#10223f", sub:"#64748b",
  resolved:"#4a9e8a", unresolved:"#cc6b5c",
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const TOKEN = () =>
  sessionStorage.getItem("ssoToken") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("token") || "";

const apiFetch = (url, opts = {}) => fetch(url, {
  credentials:"include", ...opts,
  headers:{ ...(TOKEN() ? { Authorization:`Bearer ${TOKEN()}` } : {}), ...(opts.headers || {}) },
});

// Unwrap the Node success() envelope: { success, data } → data; tolerate raw.
const asArray = (d) => {
  if (Array.isArray(d)) return d;
  if (!d) return [];
  for (const k of ["data","items","result","results"]) if (Array.isArray(d?.[k])) return d[k];
  return [d];
};
const asObj = (d) => (d && typeof d === "object" && !Array.isArray(d) && d.data && typeof d.data === "object" ? d.data : d) || {};
const safeNum = (v) => (Number.isFinite(+v) ? +v : 0);
const trim = (s) => (s ?? "").toString().trim();
const stripHtml = (html) =>
  (html ?? "").toString().replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// Priority arrives as HTML with a leading Material-Symbols icon whose ligature
// text is e.g. "stat_3"/"stat_1". Drop the icon span and any leftover "stat_*"
// token so only the word (High / Normal / Low) is shown.
const stripPriority = (html) => {
  const noIcon = (html ?? "").toString()
    .replace(/<span[^>]*material-symbols[^>]*>[\s\S]*?<\/span>/gi, " ");
  return stripHtml(noIcon).replace(/\bstat[_a-z0-9-]*\b/gi, " ").replace(/\s+/g, " ").trim();
};

/* ════════════════════════════════════════════════════════════════════════════
   MODULE-LEVEL COMPONENTS — defined outside the parent so React never remounts
   them on re-render (prevents input focus-loss). Same convention as Opportunity.
   ════════════════════════════════════════════════════════════════════════════ */

function KPIBar({ counts }) {
  const items = [
    { l:"Total",      v:counts.total,      c:C.navy },
    { l:"Open",       v:counts.open,       c:C.open },
    { l:"WIP",        v:counts.wip,        c:C.wip },
    { l:"Closed",     v:counts.closed,     c:C.closed },
    { l:"Resolved",   v:counts.resolved,   c:C.resolved },
    { l:"Unresolved", v:counts.unResolved, c:C.unresolved },
  ];
  return (
    <div style={{ display:"flex", gap:12, marginBottom:22, flexWrap:"wrap" }}>
      {items.map(({ l, v, c }) => (
        <div key={l} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
          padding:"14px 20px", flex:1, minWidth:110, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
          <div style={{ fontSize:22, fontWeight:800, color:c }}>{safeNum(v).toLocaleString()}</div>
          <div style={{ fontSize:12, color:C.sub, fontWeight:600, marginTop:3 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

function TypeBar({ counts }) {
  const items = [
    { l:"Request",     v:counts.request,       c:C.navy },
    { l:"Query",       v:counts.query,         c:C.wip },
    { l:"Complaint",   v:counts.complaint,     c:C.open },
    { l:"Incident",    v:counts.incident,      c:C.closed },
    { l:"Repair",      v:counts.repair,        c:C.cvt },
    { l:"Maintenance", v:counts.maintainenece, c:"#7b6fb0" },
  ];
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
      padding:"16px 20px", marginBottom:24, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
      <div style={{ fontSize:11, fontWeight:800, color:C.navyDk, marginBottom:14,
        textTransform:"uppercase", letterSpacing:".05em" }}>Case Types</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:12 }}>
        {items.map(({ l, v, c }) => (
          <div key={l} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px" }}>
            <div style={{ fontSize:20, fontWeight:800, color:c }}>{safeNum(v).toLocaleString()}</div>
            <div style={{ fontSize:12, color:C.sub, fontWeight:600, marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SortTH({ col, label, sortConfig, onSort, right }) {
  const icon = sortConfig.key !== col ? "↕" : sortConfig.direction === "asc" ? "↑" : "↓";
  return (
    <th onClick={() => onSort(col)} style={{ padding:"10px 12px", background:"#f4f6fa", fontWeight:800,
      fontSize:11, color:C.navy, textTransform:"uppercase", letterSpacing:".04em", whiteSpace:"nowrap",
      cursor:"pointer", textAlign:right?"right":"left", borderBottom:`2px solid ${C.border}`, userSelect:"none" }}>
      {label} <span style={{ opacity:.4, fontSize:10 }}>{icon}</span>
    </th>
  );
}

function StatusBadge({ value }) {
  const s = trim(value).toLowerCase();
  const map = {
    open:    { bg:"#fdecea", fg:C.open },
    wip:     { bg:"#fbf3df", fg:"#92400e" },
    closed:  { bg:"#eef1f6", fg:"#475569" },
  };
  const sty = map[s] || { bg:"#eef1f6", fg:C.sub };
  return (
    <span style={{ background:sty.bg, color:sty.fg, borderRadius:8, padding:"2px 9px",
      fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{value || "—"}</span>
  );
}

function PriorityBadge({ value }) {
  const s = trim(value).toLowerCase();
  const map = {
    high:   { bg:"#fdecea", fg:"#b91c1c" },
    normal: { bg:"#eff6ff", fg:"#1d4ed8" },
    low:    { bg:"#ecfdf5", fg:"#047857" },
  };
  const sty = map[s] || { bg:"#eef1f6", fg:C.sub };
  return (
    <span style={{ background:sty.bg, color:sty.fg, borderRadius:8, padding:"2px 9px",
      fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{value || "—"}</span>
  );
}

// Self-contained employee autocomplete (shows name, reports employeeCode).
function EmployeeAutocomplete({ placeholder, employees, valueCode, onChange }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Keep the visible text in sync when the selected code is cleared elsewhere.
  useEffect(() => {
    if (!valueCode) setText("");
  }, [valueCode]);

  useEffect(() => {
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    const list = q ? employees.filter((e) => e.employeeName.toLowerCase().includes(q)) : employees;
    return list.slice(0, 50);
  }, [employees, text]);

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <input
        value={text}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setText(e.target.value); setOpen(true); onChange(""); }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        autoComplete="off"
        style={{ padding:"8px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13,
          outline:"none", width:170, fontFamily:"Lato,sans-serif" }}
      />
      {open && (
        <div style={{ position:"absolute", left:0, right:0, top:"100%", zIndex:9999, background:"#fff",
          border:`1px solid ${C.border}`, borderTop:"none", maxHeight:220, overflowY:"auto", borderRadius:"0 0 8px 8px" }}>
          {matches.length === 0 ? (
            <div style={{ padding:"8px 10px", fontSize:13, color:C.sub }}>No matches</div>
          ) : matches.map((emp) => (
            <div key={emp.employeeCode}
              onMouseDown={(e) => { e.preventDefault(); setText(emp.employeeName); onChange(emp.employeeCode); setOpen(false); }}
              style={{ padding:"8px 10px", cursor:"pointer", fontSize:13, borderBottom:"1px solid #eee" }}>
              {emp.employeeName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999,
      background:toast.type==="success"?"#166534":"#b91c1c", color:"#fff",
      padding:"12px 20px", borderRadius:8, boxShadow:"0 4px 14px rgba(0,0,0,.2)", fontSize:13, fontWeight:600 }}>
      {toast.type==="success"?"✓ ":"⚠ "}{toast.message}
    </div>
  );
}

function Loader() {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(255,255,255,.75)", zIndex:9998,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:36, height:36, border:`5px solid ${C.navyLt}`, borderTop:`5px solid ${C.navy}`,
        borderRadius:"50%", animation:"case-spin .8s linear infinite" }} />
      <style>{`@keyframes case-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const PRIORITIES = ["", "Normal", "High", "Low"];
const STATUSES   = ["", "WIP", "Open", "Closed"];
const ALLOWED_CREATE_CASE_ROLES = ["Admin", "Team Member", "System User"];

/* ── Main component ───────────────────────────────────────────────────────── */
const CaseDashboard = () => {
  const navigate = useNavigate();

  const [user] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null"); }
    catch { return null; }
  });

  const [counts, setCounts] = useState({
    total:0, wip:0, open:0, closed:0, resolved:0, unResolved:0,
    request:0, query:0, complaint:0, incident:0, repair:0, maintainenece:0,
  });
  const [caseRecords, setCaseRecords] = useState([]);
  const [employees,   setEmployees]   = useState([]);

  // Server-side filters (sent to CaseDB)
  const [filters, setFilters] = useState({ owner:"", priority:"", assignTo:"", status:"" });
  // Client-side
  const [searchTerm,     setSearchTerm]     = useState("");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [sortConfig,     setSortConfig]     = useState({ key:"createddateRaw", direction:"desc" });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toast,        setToast]        = useState(null);
  const [loading,      setLoading]      = useState(false);

  const roleName = trim(user?.roleName || user?.role || user?.userRole);
  const canCreateCase = ALLOWED_CREATE_CASE_ROLES.includes(roleName);

  const showToast = (message, type="success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  /* Fetch: counts + employees once */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/CaseOperation/CaseDBCount`, {
          headers:{ "Content-Type":"application/json" },
        });
        const d = asObj(await res.json().catch(() => ({})));
        setCounts({
          total:safeNum(d.total), wip:safeNum(d.wip), open:safeNum(d.open), closed:safeNum(d.closed),
          resolved:safeNum(d.resolved), unResolved:safeNum(d.unresolved ?? d.unResolved),
          request:safeNum(d.request), query:safeNum(d.query), complaint:safeNum(d.complaint),
          incident:safeNum(d.incident), repair:safeNum(d.repair),
          maintainenece:safeNum(d.maintenance ?? d.maintainenece),
        });
      } catch (e) { console.error("CaseDBCount failed:", e); }

      try {
        const res = await apiFetch(`${API_BASE_URL}/api/Employee/Dropdown`, { headers:{ "Content-Type":"application/json" } });
        const list = asArray(await res.json().catch(() => []));
        setEmployees(
          list
            .map((e) => ({ employeeCode:trim(e.employeeCode || e.code), employeeName:trim(e.employeeName || e.name) }))
            .filter((e) => e.employeeCode && e.employeeName && e.employeeName !== "Assign To")
        );
      } catch (e) { console.error("Employees failed:", e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* Fetch: cases whenever the server-side filters change */
  const fetchCases = async (f) => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/CaseOperation/CaseDB`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ owner:f.owner||"", priority:f.priority||"", assignTo:f.assignTo||"", status:f.status||"" }),
      });
      const data = asArray(await res.json().catch(() => []));
      const mapped = data.map((item) => {
        const valid = item.createdDate && item.createdDate !== "0001-01-01T00:00:00";
        return {
          caseno:item.caseNO,
          casetitle:item.caseTitle ?? "-",
          status:item.status,
          priority:item.priority ?? "-",
          priorityText:stripPriority(item.priority) || "-",
          category:item.category,
          subCategory:item.subCategory,
          subSubCategory:item.subSubCategory,
          subSubSubCategory:item.subSubSubCategory,
          assignedto:trim(item.assignTo) || "-",
          createdby:item.owner || "-",
          customerName:item.customerName,
          customerPhoneNo:item.customerPhoneNo,
          createddateRaw:valid ? item.createdDate : null,
          createddate:valid
            ? new Date(item.createdDate).toLocaleString("en-US", {
                year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:true })
            : "-",
        };
      });
      setCaseRecords(mapped);
    } catch (e) { console.error("CaseDB failed:", e); setCaseRecords([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    fetchCases(filters);
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, user]);

  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]:value }));

  /* Table: client-side search + sort + paginate */
  const filteredData = useMemo(() => {
    const q = searchTerm.toLowerCase();
    let rows = caseRecords.filter((i) =>
      (i.caseno||"").toString().toLowerCase().includes(q) ||
      (i.casetitle||"").toLowerCase().includes(q) ||
      (i.category||"").toLowerCase().includes(q) ||
      (i.customerName||"").toLowerCase().includes(q) ||
      (i.createdby||"").toLowerCase().includes(q) ||
      (i.assignedto||"").toLowerCase().includes(q));
    if (sortConfig.key) rows = [...rows].sort((a, b) => {
      let av = a[sortConfig.key] ?? "", bv = b[sortConfig.key] ?? "";
      if (sortConfig.key === "createddateRaw") { av = new Date(av || 0).getTime(); bv = new Date(bv || 0).getTime(); }
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [caseRecords, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / entriesPerPage);
  const startIdx   = (currentPage - 1) * entriesPerPage;
  const currentData = filteredData.slice(startIdx, startIdx + entriesPerPage);
  const handleSort = (key) => setSortConfig((p) => ({ key, direction: p.key === key && p.direction === "asc" ? "desc" : "asc" }));

  const openCase = (row) => {
    const owner = encodeURIComponent(row?.createdby ?? "");
    const isClosed = trim(row?.status).toLowerCase() === "closed";
    const assignedTo = encodeURIComponent(isClosed ? "-" : (row?.assignedto ?? "-"));
    navigate(`/cases/${row.caseno}?owner=${owner}&assignedTo=${assignedTo}`);
  };

  const handleCaseCreated = async (newCase) => {
    setIsCreateOpen(false);
    showToast(`Case ${newCase?.caseno || newCase?.caseNO || ""} created successfully`);
    // surface the newest case on top: clear search, sort by created date desc, go to page 1
    setSearchTerm("");
    setSortConfig({ key: "createddateRaw", direction: "desc" });
    setCurrentPage(1);
    await fetchCases(filters);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ fontFamily:"Lato,sans-serif", minHeight:"100vh", color:C.text }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div style={{ fontWeight:800, fontSize:22, color:C.navyDk }}>Case Dashboard</div>
        {canCreateCase && (
          <button onClick={() => setIsCreateOpen(true)} style={{ padding:"9px 18px", background:C.navy,
            color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            + Create Case
          </button>
        )}
      </div>

      {/* KPI bar */}
      <KPIBar counts={counts} />

      {/* Case types — categories & numbers */}
      <TypeBar counts={counts} />

      {/* Table card */}
      <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
        {/* Toolbar */}
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ fontWeight:800, fontSize:14, color:C.navyDk }}>
            Cases
            <span style={{ marginLeft:10, fontSize:12, fontWeight:600, color:C.sub }}>
              {filteredData.length} record{filteredData.length!==1?"s":""}
            </span>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}
              style={{ padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13,
                outline:"none", color:C.text, fontFamily:"Lato,sans-serif" }}>
              {STATUSES.map((v) => <option key={v} value={v}>{v || "Status"}</option>)}
            </select>
            <select value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)}
              style={{ padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13,
                outline:"none", color:C.text, fontFamily:"Lato,sans-serif" }}>
              {PRIORITIES.map((v) => <option key={v} value={v}>{v || "Priority"}</option>)}
            </select>
            <EmployeeAutocomplete placeholder="Owner"       employees={employees} valueCode={filters.owner}    onChange={(c) => setFilter("owner", c)} />
            <EmployeeAutocomplete placeholder="Assigned To" employees={employees} valueCode={filters.assignTo} onChange={(c) => setFilter("assignTo", c)} />
            <select value={entriesPerPage} onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13,
                outline:"none", fontFamily:"Lato,sans-serif" }}>
              {[10,25,50,100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search cases…"
              style={{ padding:"8px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13,
                outline:"none", width:180, fontFamily:"Lato,sans-serif" }} />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <SortTH col="caseno"            label="Case No."      sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="casetitle"         label="Case Title"    sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="status"            label="Status"        sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="priorityText"      label="Priority"      sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="category"          label="Category"      sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="subCategory"       label="Subcategory"   sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="assignedto"        label="Assigned To"   sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="customerName"      label="Customer"      sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="customerPhoneNo"   label="Number"        sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="createdby"         label="Owner"         sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="createddateRaw"    label="Created"       sortConfig={sortConfig} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr><td colSpan={11} style={{ padding:50, textAlign:"center", color:C.sub, fontSize:13 }}>
                  No cases found
                </td></tr>
              ) : currentData.map((item, idx) => {
                const isClosed = trim(item.status).toLowerCase() === "closed";
                return (
                  <tr key={`${item.caseno}-${idx}`}
                    style={{ background:"#fff", borderBottom:"1px solid #f1f5f9" }}
                    onMouseEnter={(e) => e.currentTarget.style.background="#eff6ff"}
                    onMouseLeave={(e) => e.currentTarget.style.background="#fff"}>
                    <td style={{ padding:"10px 12px" }}>
                      <button onClick={() => openCase(item)}
                        style={{ background:"none", border:"none", color:C.navy, fontWeight:700, fontSize:13,
                          cursor:"pointer", padding:0, whiteSpace:"nowrap" }}>
                        {item.caseno}
                      </button>
                    </td>
                    <td style={{ padding:"10px 12px", fontSize:13, maxWidth:220, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.casetitle}</td>
                    <td style={{ padding:"10px 12px" }}><StatusBadge value={item.status} /></td>
                    <td style={{ padding:"10px 12px" }}><PriorityBadge value={item.priorityText} /></td>
                    <td style={{ padding:"10px 12px", fontSize:13 }}>{item.category || "-"}</td>
                    <td style={{ padding:"10px 12px", fontSize:13 }}>{item.subCategory || "-"}</td>
                    <td style={{ padding:"10px 12px", fontSize:13 }}>{isClosed ? "-" : (item.assignedto || "-")}</td>
                    <td style={{ padding:"10px 12px", fontSize:13 }}>{item.customerName || "-"}</td>
                    <td style={{ padding:"10px 12px", fontSize:13, whiteSpace:"nowrap" }}>{item.customerPhoneNo || "-"}</td>
                    <td style={{ padding:"10px 12px", fontSize:13 }}>{item.createdby || "-"}</td>
                    <td style={{ padding:"10px 12px", fontSize:12, color:C.sub, whiteSpace:"nowrap" }}>{item.createddate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding:"14px 16px", borderTop:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ fontSize:13, color:C.sub }}>
            Showing {filteredData.length ? Math.min(startIdx+1, filteredData.length) : 0}–{Math.min(startIdx+entriesPerPage, filteredData.length)} of {filteredData.length}
          </div>
          <div style={{ display:"flex", gap:5 }}>
            {[
              { label:"Previous", disabled:currentPage===1, onClick:() => setCurrentPage((p) => Math.max(1, p-1)) },
              ...Array.from({ length:Math.min(5, totalPages) }, (_, i) => ({ label:i+1, page:i+1, onClick:() => setCurrentPage(i+1) })),
              ...(totalPages>5 ? [{ label:"…", disabled:true }] : []),
              { label:"Next", disabled:currentPage===totalPages || !totalPages, onClick:() => setCurrentPage((p) => Math.min(totalPages, p+1)) },
            ].map((btn, i) => (
              <button key={i} disabled={btn.disabled} onClick={btn.disabled ? undefined : btn.onClick}
                style={{ padding:"7px 12px", borderRadius:6, border:`1px solid ${btn.page===currentPage?C.navy:C.border}`,
                  background:btn.page===currentPage?C.navy:"#fff", color:btn.page===currentPage?"#fff":C.text,
                  cursor:btn.disabled?"not-allowed":"pointer", fontSize:13,
                  fontWeight:btn.page===currentPage?700:400, opacity:btn.disabled?0.45:1 }}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create modal (unchanged component, controlled from here) */}
      {isCreateOpen && (
        <CreateCaseModel
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCaseCreated}
        />
      )}

      <Toast toast={toast} />
      {loading && <Loader />}
    </div>
  );
};

export default CaseDashboard;