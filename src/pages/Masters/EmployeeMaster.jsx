import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import EmployeeForm from "./EmployeeForm";

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json(); return j.data ?? j;
};

const statusBadge = (status) => {
  const cfg = {
    Active:     { bg:"#e6f4ef", color:"#2e7d5e", border:"#b3d9cc" },
    Draft:      { bg:"#fef9e7", color:"#854F0B", border:"#f5d78b" },
    Terminated: { bg:"#fdf3f3", color:"#b91c1c", border:"#f0c4c0" },
  }[status] || { bg:"#f1f5f9", color:"#475569", border:"#e2e8f0" };
  return (
    <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:999, fontSize:11,
      fontWeight:700, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
      {status || "—"}
    </span>
  );
};

const EmployeeMaster = () => {



  // ── Access rights ─────────────────────────────────────────────────────────
  // isEntityLevel and role come directly from the JWT user object
  // canWrite = Admin role AND at entity level
  const _rights = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const role = (u.role || u.userRole || u.securityRole || "").toLowerCase().replace(/\s/g, "");
      const isAdmin       = role === "admin";
      const isEntityLevel = u.isEntityLevel === true;
      const canWrite      = isAdmin && isEntityLevel;
      return { isAdmin, isEntityLevel, canCreate: canWrite, canEdit: canWrite, canDelete: canWrite };
    } catch {
      return { isAdmin:false, isEntityLevel:false, canCreate:false, canEdit:false, canDelete:false };
    }
  })();
  const { isAdmin, isEntityLevel, canCreate, canEdit, canDelete } = _rights;

  const [employees, setEmployees] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("");
  const [view,      setView]      = useState("list"); // list | create | edit
  const [editCode,  setEditCode]  = useState(null);
  const [toast,     setToast]     = useState(null);

  const LIMIT      = 10;
  const totalPages = Math.ceil(total / LIMIT);


  // EM-002/003: Create button only at Legal Entity level
  // At LE level: legalEntityCode exists and matches centerCode (user logged in at LE, not a branch)


  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, status, page, limit: LIMIT });
      const res    = await authGet(`${API_BASE_URL}/api/employee/List?${params}`);
      // res is { data: [...], total, page, limit }
      const rows = Array.isArray(res) ? res : (res?.data || []);
      setEmployees(rows);
      setTotal(res?.total || rows.length);
    } catch { showToast("Failed to load employees.", "error"); }
    finally  { setLoading(false); }
  }, [search, status, page]);

  useEffect(() => { loadList(); }, [loadList]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Also reset page when status filter changes
  useEffect(() => { setPage(1); }, [status]);

  if (view === "create" || view === "edit") {
    return (
      <EmployeeForm
        employeeCode={view === "edit" ? editCode : null}
        isAdmin={isAdmin}
        isEntityLevel={isEntityLevel}
        onBack={() => { setView("list"); setEditCode(null); loadList(); }}
        onSaved={() => { setView("list"); setEditCode(null); loadList(); showToast("Employee saved successfully."); }}
      />
    );
  }

  return (
    <div style={{ padding:28, fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#0f172a" }}>
      {!isAdmin && (
        <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13,
          background:"#f0f4fa", border:"1px solid #c8d5e8", color:"#334b71", fontWeight:600 }}>
          👁 View Only — Only Admins at entity level can make changes.
        </div>
      )}

      {toast && (
        <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13,
          fontWeight:600, background:toast.type==="success"?"#e6f4ef":"#fdf3f3",
          border:`1px solid ${toast.type==="success"?"#b3d9cc":"#f0c4c0"}`,
          color:toast.type==="success"?"#2e7d5e":"#b91c1c" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:11, color:"#94a3b8", marginBottom:4 }}>
            Dashboard › Masters › Employees
          </div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1e293b" }}>Employees</h2>
        </div>
        {canCreate && (
          <button onClick={() => setView("create")}
            style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:10,
              padding:"10px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            + Create New Employee
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by code, name or email…"
          style={{ flex:1, height:38, padding:"0 14px", border:"1.5px solid #e2e8f0",
            borderRadius:10, fontSize:13, outline:"none" }} />
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ height:38, padding:"0 12px", border:"1.5px solid #e2e8f0",
            borderRadius:10, fontSize:13, background:"#fff" }}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Draft">Draft</option>
          <option value="Terminated">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ borderRadius:14, overflow:"hidden", border:"1px solid #e2e8f0", background:"#fff" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f1f5f9" }}>
              {["Employee Code","First Name","Last Name","Job","Primary Centre","Status",""].map(h => (
                <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontWeight:700,
                  fontSize:11, color:"#475569", borderBottom:"1px solid #e2e8f0",
                  textTransform:"uppercase", letterSpacing:".06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign:"center", padding:40, color:"#94a3b8" }}>Loading…</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign:"center", padding:40, color:"#94a3b8" }}>No employees found.</td></tr>
            ) : employees.map(emp => (
              <tr key={emp.EMPLOYEECODE}
                style={{ borderBottom:"1px solid #f1f5f9", cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.background="#f8faff"}
                onMouseLeave={e => e.currentTarget.style.background=""}>
                <td style={{ padding:"12px 14px", fontWeight:700, color:"#334b71" }}>
                  {emp.EMPLOYEECODE}
                </td>
                <td style={{ padding:"12px 14px" }}>{emp.FIRSTNAME || "—"}</td>
                <td style={{ padding:"12px 14px" }}>{emp.LASTNAME  || "—"}</td>
                <td style={{ padding:"12px 14px", color:"#64748b" }}>{emp.JOB || "—"}</td>
                <td style={{ padding:"12px 14px", color:"#64748b" }}>{emp.PRIMARYCENTRE || "—"}</td>
                <td style={{ padding:"12px 14px" }}>{statusBadge(emp.STATUS)}</td>
                <td style={{ padding:"12px 14px" }}>
                  <button
                    onClick={() => { setEditCode(emp.EMPLOYEECODE); setView("edit"); }}
                    style={{ padding:"4px 12px", border:"1px solid #334b71", borderRadius:6,
                      background:"#fff", color:"#334b71", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                    {isAdmin ? "Edit" : "View"} →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center",
          gap:8, marginTop:16 }}>
          <button onClick={() => setPage(1)} disabled={page === 1}
            style={pgBtn(page === 1)}>«</button>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            style={pgBtn(page === 1)}>‹ Prev</button>

          {/* Page number buttons */}
          {Array.from({ length: totalPages }, (_,i) => i+1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx-1] > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) => p === "..." ? (
              <span key={`dots-${i}`} style={{ fontSize:13, color:"#94a3b8", padding:"0 4px" }}>…</span>
            ) : (
              <button key={p} onClick={() => setPage(p)}
                style={{ ...pgBtn(false),
                  background: p === page ? "#334b71" : "#fff",
                  color: p === page ? "#fff" : "#334b71",
                  fontWeight: p === page ? 700 : 400,
                  border: `1px solid ${p === page ? "#334b71" : "#e2e8f0"}`,
                }}>
                {p}
              </button>
            ))
          }

          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
            style={pgBtn(page === totalPages)}>Next ›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
            style={pgBtn(page === totalPages)}>»</button>

          <span style={{ fontSize:12, color:"#94a3b8", marginLeft:8 }}>
            {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT, total)} of {total} employees
          </span>
        </div>
      )}
    </div>
  );
};

const pgBtn = (disabled) => ({
  padding:"6px 12px", borderRadius:7, border:"1px solid #e2e8f0",
  background:"#fff", color: disabled ? "#c8d5e8" : "#334b71",
  cursor: disabled ? "not-allowed" : "pointer", fontSize:13, fontWeight:500,
});

export default EmployeeMaster;