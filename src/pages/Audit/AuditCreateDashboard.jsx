"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config"; // adjust path

const AuditCreateDashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
 // const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [rows, setRows] = useState([]);

  const AUDIT_API = `${API_BASE_URL}/api/Audit/LoadAuditDashboard`; // replace if different

  useEffect(() => {
    const fetchAudits = async () => {
      setLoading(true);
      try {
        const res = await fetch(AUDIT_API, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
       // setToast({ type: "error", message: "Failed to load audits" });
      } finally {
        setLoading(false);
      }
    };
    fetchAudits();
  }, []);

  const safe = (v) => (v ?? "").toString();

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return [
        safe(r.auditNo),
        safe(r.auditMonthYear) || safe(r.auditMonth) || safe(r.auditMonthYearDisplay),
        safe(r.auditDate),
        safe(r.employeeId) || safe(r.employeeCode),
        safe(r.employeeName),
        safe(r.clinic) || safe(r.centerName),
        safe(r.auditSegment),
        safe(r.auditScore),
        safe(r.auditor),
        safe(r.auditCreatedDate) || safe(r.createdDate),
        safe(r.status),
      ]
        .join(" | ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, searchTerm]);

  const columns = [
    {
      name: "Audit No",
      selector: (row) => row.auditNo,
      sortable: true,
      cell: (row) => (
        <button className="linkbtn" onClick={() => navigate(`/audit/${row.auditNo}`)}>
          {row.auditNo}
        </button>
      ),
    },
    { name: "Audit Month / Year", selector: (row) => row.auditMonthYear || row.auditMonthYearDisplay || "", sortable: true },
    { name: "Audit Date", selector: (row) => row.auditDate || "", sortable: true },
    { name: "Employee ID", selector: (row) => row.employeeId || row.employeeCode || "", sortable: true },
    { name: "Employee Name", selector: (row) => row.employeeName || "", sortable: true, wrap: true },
    { name: "Clinic", selector: (row) => row.clinic || row.centerName || "", sortable: true },
    { name: "Audit Segment", selector: (row) => row.auditSegment || "", sortable: true },
    { name: "Audit Score", selector: (row) => row.auditScore ?? "", right: true, sortable: true },
    { name: "Auditor", selector: (row) => row.auditor || "", sortable: true },
    { name: "Audit Created Date", selector: (row) => row.auditCreatedDate || row.createdDate || "", sortable: true },
    {
      name: "Status",
      selector: (row) => row.status || "",
      sortable: true,
      cell: (row) => <span className={`status ${safe(row.status).toLowerCase()}`}>{row.status || ""}</span>,
    },
  ];

  const exportCSV = () => {
    try {
      const header = [
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
        "Status",
      ];
      const lines = filteredRows.map((r) => [
        safe(r.auditNo),
        safe(r.auditMonthYear) || safe(r.auditMonthYearDisplay),
        safe(r.auditDate),
        safe(r.employeeId) || safe(r.employeeCode),
        safe(r.employeeName),
        safe(r.clinic) || safe(r.centerName),
        safe(r.auditSegment),
        safe(r.auditScore),
        safe(r.auditor),
        safe(r.auditCreatedDate) || safe(r.createdDate),
        safe(r.status),
      ]);
      const csv = [header, ...lines]
        .map((arr) =>
          arr
            .map((v) => {
              const s = v?.toString() ?? "";
              const needsWrap = /[",\n]/.test(s);
              const esc = s.replace(/"/g, '""');
              return needsWrap ? `"${esc}"` : esc;
            })
            .join(",")
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to export" });
    }
  };

  return (
    <div className="audit-page">
      <div className="header">
        <div>
          <h1 className="title">Audit Dashboard</h1>
          <div className="breadcrumb">
            <a href="/" className="breadcrumb-link">Dashboard</a>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Create</span>
          </div>
        </div>

        <div className="actions">
          <button className="btn" onClick={() => navigate("/audit/create")}>New Audit</button>
          <button className="btn" onClick={exportCSV}>Export</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="left">
          <label htmlFor="perpage">entries per page</label>
          <select
            id="perpage"
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="right">
          <label htmlFor="search">Search:</label>
          <input
            id="search"
            className="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        pagination
        paginationPerPage={perPage}
        paginationRowsPerPageOptions={[10, 25, 50, 100]}
        progressPending={loading}
        highlightOnHover
        dense={false}
        striped
        persistTableHead
      />

      {/* {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>} */}

      <style jsx>{`
        .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .title { margin: 20px 0 10px 0; font-size: 22px; color: #0b1f3a; }
        .crumbs { display: flex; align-items: center; gap: 6px; color: #6c7a89; font-size: 14px; }
        .crumb { background: none; border: none; color: #334b71; cursor: pointer; padding: 0; font-weight: 600; }
        .sep { color: #9aa3b2; user-select: none; }
        .actions { display: flex; gap: 10px; }
        .btn { background: #1d2c43; color: #fff; border: none; border-radius: 6px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
        .toolbar { display: flex; align-items: center; justify-content: space-between; margin: 10px 0 12px; }
        .left { display: flex; align-items: center; gap: 8px; color: #647187; }
        .left select { height: 32px; border: 1px solid #d8dee8; border-radius: 6px; padding: 0 8px; outline: none; }
        .right { display: flex; align-items: center; gap: 8px; }
        .search { width: 220px; height: 32px; border: 1px solid #d8dee8; border-radius: 6px; padding: 0 8px; outline: none; }
        .linkbtn { color: #2b63c6; background: none; border: none; padding: 0; cursor: pointer; font-weight: 700; }
        .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid #e7ecf3; background: #f6f8fb; color: #334b71; }
        .status.draft { background: #fff7ed; color: #9a5300; border-color: #fde1c2; }
        .status.approved { background: #ecfdf5; color: #0f7a4f; border-color: #c8f3e1; }
        .status.rejected { background: #fff1f2; color: #9f1239; border-color: #ffd5db; }
        .toast { position: fixed; bottom: 16px; right: 16px;  color: #fff; background: #d7263d; padding: 10px 14px; border-radius: 8px; font-weight: 600; box-shadow: 0 6px 18px rgba(0,0,0,0.15); z-index: 9999; }
        .toast.success { background: #138a36; }
      `}</style>
    </div>
  );
};

export default AuditCreateDashboard;
