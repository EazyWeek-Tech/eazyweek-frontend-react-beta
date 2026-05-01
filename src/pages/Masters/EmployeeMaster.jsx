import React, { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import EmployeeEditForm from "./EmployeeEditForm";
import EmployeeCreateForm from "./EmployeeCreateForm";

const TOKEN = () => localStorage.getItem("token");

// Add at top of EmployeeMaster component
const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
const isAdmin = currentUser?.role === "Admin";

const EmployeeMaster = () => {
  const [employees, setEmployees]     = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState(null);
  const [view, setView]               = useState("list"); // list | edit | create
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const LIMIT = 20;

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.append("search", search);
      const res = await fetch(`${API_BASE_URL}/api/employee?${params}`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data);
        setTotal(json.pagination?.total || 0);
      }
    } catch {
      showToast("Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleRowClick = (emp) => {
    setSelectedEmployee(emp);
    setView("edit");
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
    setView("list");
    fetchEmployees();
  };

  const totalPages = Math.ceil(total / LIMIT);

  // ── Edit view ──────────────────────────────────────────────────────────────
  if (view === "edit" && selectedEmployee) {
    return (
      <EmployeeEditForm
        employee={selectedEmployee}
        onBack={handleBackToList}
        onSaved={handleBackToList}
      />
    );
  }

  // ── Create view ───────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <EmployeeCreateForm
        onBack={handleBackToList}
        onSaved={handleBackToList}
      />
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <div style={s.breadcrumb}>
            <a href="/dashboard" style={s.breadLink}>Dashboard</a>
            <span style={s.breadSep}> › </span>
            <span>Manage Employees</span>
          </div>
          <h1 style={s.title}>Employees</h1>
          <p style={s.subtitle}>{total} active employees</p>
        </div>
{isAdmin && (
  <button style={s.addBtn} onClick={() => setView("create")}>
    + Add Employee
  </button>
)}
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 400, marginBottom: 16 }}>
        <span style={s.searchIcon}>🔍</span>
        <input
          style={s.searchInput}
          placeholder="Search by name, code, email, mobile..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <button style={s.clearBtn} onClick={() => setSearchInput("")}>✕</button>
        )}
      </div>

      {/* Table */}
      <div style={s.card}>
        {loading ? (
          <div style={s.loader}>Loading employees...</div>
        ) : employees.length === 0 ? (
          <div style={s.loader}>No employees found</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Code", "Name", "Role", "Center", "Mobile", "Email", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.RECID}
                  style={s.tr}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}
                >
                  <td style={s.td}>
                    <span style={s.codeTag}>{emp.EMPLOYEECODE}</span>
                  </td>
                  <td style={s.td}>
                    {`${emp.FIRSTNAME || ""} ${emp.LASTNAME || ""}`.trim()}
                  </td>
                  <td style={s.td}>
                    <span style={s.roleBadge}>{emp.ROLE || emp.JOB || "—"}</span>
                  </td>
                  <td style={s.td}>{emp.CENTERCODE || "—"}</td>
                  <td style={s.td}>{emp.MOBILEPHONE || "—"}</td>
                  <td style={s.td}>{emp.EMAIL || "—"}</td>
                 <td style={s.td}>
  {isAdmin && (
    <button style={s.editBtn} onClick={() => handleRowClick(emp)}>
      Edit →
    </button>
  )}
</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button
            style={s.pageBtn}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Page {page} of {totalPages}
          </span>
          <button
            style={s.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, ...(toast.type === "error" ? s.toastError : s.toastSuccess) }}>
          {toast.text}
        </div>
      )}
    </div>
  );
};

const s = {
  page: { padding: "24px", fontFamily: "Inter, sans-serif", maxWidth: 1200, margin: "0 auto" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  breadcrumb: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  breadLink: { color: "#334B71", textDecoration: "none" },
  breadSep: { margin: "0 6px" },
  title: { fontSize: 24, fontWeight: 600, color: "#111827", margin: "0 0 4px" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: 0 },
  addBtn: { background: "#334B71", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 },
  searchInput: { width: "100%", padding: "9px 36px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" },
  clearBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  loader: { textAlign: "center", padding: 40, color: "#6b7280", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  tr: { cursor: "pointer", transition: "background 0.1s" },
  td: { padding: "12px 16px", fontSize: 13, color: "#374151", borderBottom: "1px solid #f3f4f6" },
  codeTag: { background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500 },
  roleBadge: { background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 4, fontSize: 12 },
  editBtn: { background: "#334B71", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 500 },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 16 },
  pageBtn: { background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#374151" },
  toast: { position: "fixed", bottom: 24, right: 24, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 14px rgba(0,0,0,0.12)" },
  toastSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #6ee7b7" },
  toastError: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" },
};

export default EmployeeMaster;