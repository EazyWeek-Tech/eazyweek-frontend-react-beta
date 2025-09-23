"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "datatables.net-dt";           // JS (ESM) — no jQuery needed
import "datatables.net-fixedcolumns-dt";             // JS plugin (ESM) registers itself
import { API_BASE_URL } from "../../config";

// NOTE: CSS is already included via CDN in index.html (DataTables v2 + FixedColumns v5)
// If you ever want to import CSS from NPM instead, add:
//   import "datatables.net-dt/css/dataTables.dataTables.css";
//   import "datatables.net-fixedcolumns-dt/css/fixedColumns.dataTables.css";

const CaseHierarchyDashboard = () => {
  const navigate = useNavigate();

  const tableRef = useRef(null);
  const dtRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [rows, setRows] = useState([]);
  const [busyRow, setBusyRow] = useState(null); // { recId, action }

  const LIST_API = `${API_BASE_URL}/api/CaseOperation/CaseHierarchyDB`;

  const showToast = (message, type = "error", ms = 2500) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(LIST_API, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : data ? [data] : []);
    } catch (e) {
      console.error(e);
      showToast("Failed to load case hierarchy.");
    } finally {
      setLoading(false);
    }
  }, [LIST_API]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const safe = (v) => (v ?? "").toString();
  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        safe(r.centerName),
        safe(r.categoryName),
        safe(r.subCategoryName),
        safe(r.subSubCategoryName),
        safe(r.subSubSubCategoryName),
        safe(r.firstAssignement),
        safe(r.firstGroupAssignement),
        safe(r.secondAssignement),
        safe(r.secondGroupAssignement),
        safe(r.thirdAssignement),
        safe(r.thirdGroupAssignement),
        safe(r.caseStatus),
      ].join(" | ").toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  // Actions
  const doDelete = async (recId) => {
    if (!recId) return showToast("Row missing recId.");
    setBusyRow({ recId, action: "delete" });
    try {
      const id = encodeURIComponent(recId);
      const url = `${API_BASE_URL}/api/CaseOperation/CaseDeleteHierarchy/${id}`;
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      let payload = null;
      try { payload = await res.json(); } catch {}
      if (!res.ok || payload?.status === false || payload?.success === false) {
        throw new Error(payload?.message || `Delete failed (HTTP ${res.status})`);
      }
      showToast(payload?.message || "Deleted successfully", "success");
      await fetchRows();
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to delete");
    } finally {
      setBusyRow(null);
    }
  };

  const doActivate = async (recId) => {
    if (!recId) return showToast("Row missing recId.");
    setBusyRow({ recId, action: "activate" });
    try {
      const id = encodeURIComponent(recId);
      const url = `${API_BASE_URL}/api/CaseOperation/GetCaseHierarchyDetails/${id}`;
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      let payload = null;
      try { payload = await res.json(); } catch {}
      if (!res.ok || payload?.status === false || payload?.success === false) {
        throw new Error(payload?.message || `Activate failed (HTTP ${res.status})`);
      }
      showToast(payload?.message || "Activated successfully", "success");
      await fetchRows();
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to activate");
    } finally {
      setBusyRow(null);
    }
  };

  const onEdit = (recId) => {
    if (!recId) return showToast("Row missing recId.");
    navigate(`/case-hierarchy/edit/${recId}`);
  };

  // SVG strings for actions column
  const svgCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
    <path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle></svg>`;
  const svgEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
    <path d="M12 20h9"></path><path d="M16.5 3.5l4 4L7 21l-4 1 1-4 12.5-14.5z"></path></svg>`;
  const svgTrash = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6M14 11v6"></path>
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>`;

  // Define DataTables columns
  const dtColumns = [
    { data: "centerName", title: "Clinic Name", className: "text-nowrap", width: "140px" },
    { data: "categoryName", title: "Category", className: "text-nowrap", width: "180px" },
    { data: "subCategoryName", title: "Sub Category", className: "text-nowrap", width: "180px" },
    { data: "subSubCategoryName", title: "Sub Sub Category", className: "text-nowrap", width: "180px" },
    { data: "subSubSubCategoryName", title: "Sub Sub Sub Category", className: "text-nowrap", width: "200px" },
    { data: "firstAssignement", title: "Primary Assignment", className: "text-nowrap", width: "240px" },
    { data: "firstGroupAssignement", title: "Primary Group", className: "text-nowrap", width: "280px" },
    { data: "secondAssignement", title: "Secondary Assignment", className: "text-nowrap", width: "240px" },
    { data: "secondGroupAssignement", title: "Secondary Group", className: "text-nowrap", width: "280px" },
    { data: "thirdAssignement", title: "Third Assignment", className: "text-nowrap", width: "240px" },
    { data: "thirdGroupAssignement", title: "Third Group", className: "text-nowrap", width: "280px" },
    {
      data: null,
      title: "Status",
      className: "text-nowrap",
      width: "110px",
      render: (row) => {
        const s = (row.caseStatus || (row.status ? "Active" : "Inactive"))?.toString() || "";
        const cls = s.toLowerCase() === "active" ? "badge active" : "badge inactive";
        return `<span class="${cls}">${s}</span>`;
      },
    },
    {
      data: null,
      title: "Actions",
      className: "text-nowrap actions-col",
      width: "120px",
      orderable: false,
      searchable: false,
      render: (row) => {
        const isActive =
          (row.caseStatus && row.caseStatus.toLowerCase() === "active") || row.status === true;
        const dis = isActive ? "disabled" : "";
        return `
          <div class="row-actions">
            <button class="iconbtn green btn-activate" ${dis} data-id="${row.recId}" title="Activate" aria-label="Activate">
              ${svgCheck}
            </button>
            <button class="iconbtn blue btn-edit" data-id="${row.recId}" title="Edit" aria-label="Edit">
              ${svgEdit}
            </button>
            <button class="iconbtn red btn-delete" data-id="${row.recId}" title="Delete" aria-label="Delete">
              ${svgTrash}
            </button>
          </div>
        `;
      },
    },
  ];

  // Initialize DataTable once
  useEffect(() => {
    if (!tableRef.current) return;
    if (dtRef.current) return; // guard

    dtRef.current = new DataTable(tableRef.current, {
      data: rows,
      columns: dtColumns,
      deferRender: true,
      processing: true,
      autoWidth: false,
      scrollX: true,
      paging: true,
      pageLength: perPage,
      lengthChange: false,   // external page length
      searching: true,      // external search
      order: [[0, "asc"]],
      // Freeze first 2 and last 2 columns (v5 API)
      fixedColumns: {
        start: 2,
        end: 2,
      },
      // keep native info + paging controls; minimal layout
      dom: "rt<'dt-footer'ip>",
    });

    // Document-level delegated handlers (works for cloned fixed columns too)
    const handler = (e) => {
      const btnActivate = e.target.closest?.(".btn-activate");
      const btnEdit = e.target.closest?.(".btn-edit");
      const btnDelete = e.target.closest?.(".btn-delete");
      if (btnActivate) {
        const id = btnActivate.getAttribute("data-id");
        if (id && window.confirm("Activate this record?")) doActivate(id);
      } else if (btnEdit) {
        const id = btnEdit.getAttribute("data-id");
        if (id) onEdit(id);
      } else if (btnDelete) {
        const id = btnDelete.getAttribute("data-id");
        if (id && window.confirm("Delete this record?")) doDelete(id);
      }
    };
    document.addEventListener("click", handler);

    return () => {
      document.removeEventListener("click", handler);
      if (dtRef.current) {
        dtRef.current.destroy();
        dtRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableRef.current]);

  // Update table data when rows change
  useEffect(() => {
    if (!dtRef.current) return;
    const api = dtRef.current;
    api.clear();
    api.rows.add(rows).draw(false);
  }, [rows]);

  // Sync external search
  useEffect(() => {
    if (!dtRef.current) return;
    dtRef.current.search(searchTerm).draw(false);
  }, [searchTerm]);

  // Sync page length
  useEffect(() => {
    if (!dtRef.current) return;
    if (dtRef.current.page.len() !== perPage) {
      dtRef.current.page.len(perPage).draw(false);
    }
  }, [perPage]);

  const exportCSV = () => {
    try {
      const header = [
        "Clinic Name",
        "Category",
        "Sub Category",
        "Sub Sub Category",
        "Sub Sub Sub Category",
        "Primary Assignment",
        "Primary Group",
        "Secondary Assignment",
        "Secondary Group",
        "Third Assignment",
        "Third Group",
        "Status",
      ];
      const lines = filteredRows.map((r) => [
        safe(r.centerName),
        safe(r.categoryName),
        safe(r.subCategoryName),
        safe(r.subSubCategoryName),
        safe(r.subSubSubCategoryName),
        safe(r.firstAssignement),
        safe(r.firstGroupAssignement),
        safe(r.secondAssignement),
        safe(r.secondGroupAssignement),
        safe(r.thirdAssignement),
        safe(r.thirdGroupAssignement),
        safe(r.caseStatus || (r.status ? "Active" : "Inactive")),
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
      a.download = `case-hierarchy-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      showToast("Failed to export");
    }
  };

  return (
    <div className="case-page">
      <div className="header">
        <div>
          <h1 className="title">Case Hierarchy</h1>
          <div className="breadcrumb">
            <a href="/" className="breadcrumb-link">Dashboard</a>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Case Hierarchy</span>
          </div>
        </div>

        <div className="actions">
          <button className="btn" onClick={() => navigate("/case-hierarchy/create")}>Create New</button>
          <button className="btn" onClick={exportCSV}>Export</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="left">
          <label htmlFor="perpage">entries per page</label>
          <select id="perpage" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="right">
          <label htmlFor="search">Search:</label>
          <input
            id="search"
            className="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search..."
          />
        </div>
      </div>

      <div className="table-wrap">
        <table
          ref={tableRef}
          id="caseTable"
          className="display nowrap stripe row-border order-column"
          style={{ width: "100%" }}
        >
          <thead>
            <tr>
              <th>Clinic Name</th>
              <th>Category</th>
              <th>Sub Category</th>
              <th>Sub Sub Category</th>
              <th>Sub Sub Sub Category</th>
              <th>Primary Assignment</th>
              <th>Primary Group</th>
              <th>Secondary Assignment</th>
              <th>Secondary Group</th>
              <th>Third Assignment</th>
              <th>Third Group</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody /> {/* DataTables will populate */}
        </table>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .title { margin: 0 0 20px 0; font-size: 22px; color: #0b1f3a; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; color: #6c7a89; font-size: 14px; margin-top: 4px; }
        .breadcrumb-link { color: #334b71; text-decoration: none; font-weight: 600; }
        .breadcrumb-link:hover { text-decoration: underline; }
        .breadcrumb-separator { color: #9aa3b2; user-select: none; }
        .breadcrumb-current { color: #93a1b3; }

        .actions { display: flex; gap: 10px; }
        .btn { background: #1d2c43; color: #fff; border: none; border-radius: 6px; padding: 8px 14px; font-weight: 600; cursor: pointer; }

        .toolbar { display: flex; align-items: center; justify-content: space-between; margin: 10px 0 12px; }
        .left { display: flex; align-items: center; gap: 8px; color: #647187; }
        .left select { height: 32px; border: 1px solid #d8dee8; border-radius: 6px; padding: 0 8px; outline: none; }
        .right { display: flex; align-items: center; gap: 8px; }
        .search { width: 240px; height: 32px; border: 1px solid #d8dee8; border-radius: 6px; padding: 0 8px; outline: none; }

        .table-wrap { background: #fff; border-radius: 8px; padding: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }

        /* Action buttons */
        .row-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .iconbtn {
          width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
          border-radius: 6px; border: 1px solid #d8dee8; background: #fff; cursor: pointer;
        }
        .iconbtn[disabled] { opacity: .45; cursor: not-allowed; }
        .iconbtn.green { color: #0f7a4f; background: #ecfdf3; border-color: #b8f2d0; }
        .iconbtn.blue { color: #1d2c43; }
        .iconbtn.red { color: #b94b56; }

        /* Status badge */
        .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid #e7ecf3; }
        .badge.active { background: #ecfdf3; color: #0f7a4f; border-color: #b8f2d0; }
        .badge.inactive { background: #fff1f2; color: #9f1239; border-color: #ffd5db; }

        /* Toast */
        .toast { position: fixed; bottom: 16px; right: 16px; color: #fff; background: #d7263d; padding: 10px 14px; border-radius: 8px; font-weight: 600; box-shadow: 0 6px 18px rgba(0,0,0,0.15); z-index: 9999; }
        .toast.success { background: #138a36; }
      `}</style>
    </div>
  );
};

export default CaseHierarchyDashboard;
