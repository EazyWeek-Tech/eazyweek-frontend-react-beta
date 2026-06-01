import { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` });
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCenterCode = () => { const u = getUser(); return (u.centerCode || "").trim(); };
const getUserId     = () => { const u = getUser(); return (u.employeeCode || u.userId || u.userID || "").trim(); };

// ─── Audit Rights ─────────────────────────────────────────────────────────────
// canWrite:       centre-level AND roleCode === SQ001
// isEntityLevel:  user logged in at entity level (view-only for all clinics)
const getAuditRights = () => {
  const u = getUser();
  const roleCode      = (u.roleCode || "").trim().toUpperCase();
  const isEntityLevel = u.isEntityLevel === true;
  const canWrite      = !isEntityLevel && roleCode === "SQ001";
  return { canWrite, isEntityLevel, roleCode };
};




const AuditCreateDashboard = () => {
  const navigate = useNavigate();
  const { canWrite, isEntityLevel } = getAuditRights();

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [rows, setRows] = useState([]);

  // --- helper to normalize API response ---
  const normalize = (list) =>
    list.map((r) => ({
      auditNo:       r.auditNo      || r.AUDITNO      || "",
      auditMonthYear:r.auditMonth   || r.AUDITMONTH   || "",
      auditDate:     r.auditDate    || r.AUDITDATE     || "",
      employeeId:    r.employeeCode || r.EMPLOYEECODE  || "",
      employeeName:  r.employeeName || r.EMPLOYEE      || "",
      clinic:        r.clinicName   || r.CNAME         || "",
      auditSegment:  r.auditSegment || r.AUDITSEGMENT  || "",
      auditScore:    r.auditScore   ?? r["Audit Score"] ?? "",
      auditor:       r.auditorName  || r.AuditorName   || r.AUDITOR || "",
      createdDate:   r.createdDate  || r.CREATEDDATE   || "",
      createdDateRaw: (() => {
        const d = r.createdDate || r.CREATEDDATE || "";
        const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
      })(),
      createdDateISO: (() => {
        const d = r.createdDate || r.CREATEDDATE || "";
        const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
      })(),
      statusText: "Draft",
      _raw: r,
    }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let res = await fetch(`${API_BASE_URL}/api/Audit/LoadDraftAudits/1`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
          body: JSON.stringify({}),
        });

        if (!res.ok && (res.status === 404 || res.status === 405)) {
          res = await fetch(`${API_BASE_URL}/api/Audit/LoadDraftAudits`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
            body: JSON.stringify({ viewForOthers: "1" }),
          });
        }

        if (!res.ok && (res.status === 404 || res.status === 405)) {
          res = await fetch(`${API_BASE_URL}/api/Audit/LoadDraftAudits/1`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
          });
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const data = json?.data ?? json;
        const raw = Array.isArray(data) ? data : data ? [data] : [];
        // Accept rows with any of: auditNo, AUDITNO, auditno
        const list = raw.filter(r => r && (r.auditNo || r.AUDITNO || r.auditno));
        // Normalize handles both camelCase (from our repo) and UPPERCASE (from old SP)
        setRows(normalize(list.length ? list : raw.filter(Boolean)));
        console.log("[AuditDashboard] loaded", raw.length, "rows →", list.length, "after filter");
      } catch (err) {
        console.error("Failed to load audits:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API_BASE_URL]);

  const safe = (v) => (v ?? "").toString();

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        safe(r.auditNo),
        safe(r.auditMonthYear),
        safe(r.auditDate),
        safe(r.employeeId),
        safe(r.employeeName),
        safe(r.clinic),
        safe(r.auditSegment),
        safe(r.auditScore),
        safe(r.auditor),
        safe(r.createdDate),
        safe(r.statusText),
      ]
        .join(" | ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, searchTerm]);

  const goToAudit = (row) => {
    const url =
      `/audit/${encodeURIComponent(row.auditNo)}`
      + `?clinic=${encodeURIComponent(row.clinic || "")}`
      + `&employee=${encodeURIComponent(row.employeeId || "")}`
      + `&empCode=${encodeURIComponent(row.employeeId || "")}`
      + `&employeeName=${encodeURIComponent(row.employeeName || "")}`
      + `&auditor=${encodeURIComponent(row.auditor || "")}`;
    navigate(url);
  };

  const columns = [
    {
      id: "auditNo",
      name: "Audit No",
      selector: (row) => row.auditNo,
      sortable: true,
      cell: (row) => (
        <button className="linkbtn" onClick={() => goToAudit(row)}>
          {row.auditNo}
        </button>
      ),
    },
    { id: "auditMonthYear", name: "Audit Month / Year", selector: (row) => row.auditMonthYear, sortable: true, minWidth: "140px" },
    { id: "auditDate", name: "Audit Date", selector: (row) => row.auditDate, sortable: true },
    { id: "employeeId", name: "Employee ID", selector: (row) => row.employeeId, sortable: true },
    {
      id: "employeeName",
      name: "Employee Name",
      selector: (row) => row.employeeName,
      sortable: true,
      wrap: true,
      minWidth: "200px",
      grow: 2,
    },
    { id: "clinic", name: "Clinic", selector: (row) => row.clinic, minWidth: "160px", sortable: true },
    {
      id: "auditSegment",
      name: "Audit Segment",
      selector: (row) => row.auditSegment,
      sortable: true,
      minWidth: "130px",
      wrap: true,
    },
    { id: "auditScore", name: "Audit Score", selector: (row) => row.auditScore, right: true, sortable: true },
    { id: "auditor", name: "Auditor", selector: (row) => row.auditor, sortable: true },
    {
      id: "createdDate",
      name: "Created Date",
      selector: (row) => row.createdDate,
      sortable: true,
      sortFunction: (a, b) => {
        const parse = (s) => {
          if (!s) return 0;
          const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (m) return new Date(`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`).getTime();
          const d = new Date(s);
          return isNaN(d) ? 0 : d.getTime();
        };
        return parse(a.createdDate) - parse(b.createdDate);
      },
    },
    {
      id: "createdDateISO",
      name: "",
      selector: (row) => row.createdDateISO,
      omit: true,
    },
    {
      id: "statusText",
      name: "Status",
      selector: (row) => row.statusText,
      sortable: true,
      cell: (row) => (
        <span className={`status ${safe(row.statusText).toLowerCase()}`}>{row.statusText}</span>
      ),
    },
  ];

  const exportCSV = () => {
    const header = [
      "Audit No", "Audit Month / Year", "Audit Date", "Employee ID",
      "Employee Name", "Clinic", "Audit Segment", "Audit Score",
      "Auditor", "Created Date", "Status",
    ];
    const lines = filteredRows.map((r) => [
      safe(r.auditNo), safe(r.auditMonthYear), safe(r.auditDate),
      safe(r.employeeId), safe(r.employeeName), safe(r.clinic),
      safe(r.auditSegment), safe(r.auditScore), safe(r.auditor),
      safe(r.createdDate), safe(r.statusText),
    ]);
    const csv = [header, ...lines]
      .map((arr) =>
        arr.map((v) => {
          const s = v?.toString() ?? "";
          const needsWrap = /[",\n]/.test(s);
          const esc = s.replace(/"/g, '""');
          return needsWrap ? `"${esc}"` : esc;
        }).join(",")
      ).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-drafts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="audit-page">
      <div className="header">
        <div>
          <h1 className="title">Audit Dashboard</h1>
          <br />
          <div className="breadcrumb">
            <a href="/" className="breadcrumb-link">Dashboard</a>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Audit Create Dashboard</span>
          </div>
        </div>

        <div className="actions">
          {canWrite && <button className="pribtn" onClick={() => navigate("/audit/create")}>New Audit</button>}
          <button className="pribtn" onClick={exportCSV}>Export</button>
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
            placeholder="Search audits…"
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
        persistTableHead
        defaultSortFieldId="createdDateISO"
        defaultSortAsc={false}
        noDataComponent={<div style={{padding:24,color:"#94a3b8"}}>No audit drafts found.</div>}
      />

      <style jsx>{`
        .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .title { margin: 20px 0 10px 0; font-size: 22px; color: #334b71; }
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
        .rdt_TableBody div{font-size: 12px; line-height: 16px;}
        .rdt_TableHead div{font-weight: 700;}
      `}</style>
    </div>
  );
};

export default AuditCreateDashboard;