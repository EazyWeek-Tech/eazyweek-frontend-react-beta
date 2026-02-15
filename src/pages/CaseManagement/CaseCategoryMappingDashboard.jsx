"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "datatables.net-dt";
import "datatables.net-fixedcolumns-dt";
import { API_BASE_URL } from "../../config";

// List API
const LIST_API = (base) => `${base}/api/Master/LoadCaseCategoryMapping`;
// Delete API
const DELETE_API = (base, id) =>
  `${base}/api/Master/DeleteCaseCategoryMapping/${encodeURIComponent(id)}`;

const CaseCategoryMappingDashboard = () => {
  const navigate = useNavigate();

  const tableRef = useRef(null);
  const dtRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [rows, setRows] = useState([]);
  const [busyRow, setBusyRow] = useState(null); // { recId, action }

  // clinic from session
  const [clinicName, setClinicName] = useState("");

  useEffect(() => {
    try {
      const rawUser =
  localStorage.getItem("user") ||
  sessionStorage.getItem("user") ||
  localStorage.getItem("userDetails") ||
  sessionStorage.getItem("userDetails") ||
  localStorage.getItem("sessionUser") ||
  sessionStorage.getItem("sessionUser");

      if (rawUser) {
        const o = JSON.parse(rawUser);
        const cName = (o.centerName || o.clinicName || "").toString().trim();
        if (cName) setClinicName(cName);
      }
      const flatName =
  (localStorage.getItem("centerName") || sessionStorage.getItem("centerName") || "")
    .toString()
    .trim();

      
      if (!clinicName && flatName) setClinicName(flatName);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message, type = "error", ms = 2200) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  // Load data
  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(LIST_API(API_BASE_URL), {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data ? [data] : [];

      const norm = list.map((r, i) => ({
        recId: r.recID ?? r.recId ?? r.id ?? `${i}`,
        centerName: (r.centerName || r.clinicName || clinicName || "-").toString(),

        categoryName: (r.categoryName ?? "").toString(),
        subCategoryName: (r.subCategoryName ?? "NA").toString(),
        subSubCategoryName: (r.subSubCategoryName ?? "NA").toString(),
        subSubSubCategoryName: (r.subSubSubCategoryName ?? "NA").toString(),
        mappingStatus: r.mappingStatus ?? "",
        status: !!r.status,
        caseStatus: (r.status ? "Active" : "Inactive").toString(),
        categoryCode: r.categoryCode ?? "",
        subCategoryCode: r.subCategoryCode ?? "",
        subSubCategoryCode: r.subSubCategoryCode ?? "",
        subSubSubCategoryCode: r.subSubSubCategoryCode ?? "",
        priority: r.priority ?? r.Priority ?? r.priorityName ?? "",

        defaultAssignment: r.defaultAssignment ?? "",
      }));

      setRows(norm);
    } catch (e) {
      console.error(e);
      showToast("Failed to load category mapping.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [clinicName]);

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
        safe(r.caseStatus),
      ]
        .join(" | ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, searchTerm]);

  // icons
  const svgEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
    <path d="M12 20h9"></path><path d="M16.5 3.5l4 4L7 21l-4 1 1-4 12.5-14.5z"></path></svg>`;
  const svgTrash = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6M14 11v6"></path>
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>`;

  const renderStatus = (row) => {
    if (row.mappingStatus) return row.mappingStatus;
    const s = row.caseStatus || (row.status ? "Active" : "Inactive");
    const cls = (s || "").toLowerCase() === "active" ? "badge active" : "badge inactive";
    return `<span class="${cls}">${s}</span>`;
  };

  const renderActions = (row) => `
    <div class="row-actions">
      <button type="button" class="iconbtn blue btn-edit" data-id="${row.recId}" title="Edit" aria-label="Edit">
        ${svgEdit}
      </button>
      <button type="button" class="iconbtn red btn-delete" data-id="${row.recId}" title="Delete" aria-label="Delete">
        ${svgTrash}
      </button>
    </div>
  `;

  const dtColumns = [
    { data: "centerName", title: "Clinic Name", className: "text-nowrap", width: "160px" },
    { data: "categoryName", title: "Category", className: "text-nowrap", width: "180px" },
    { data: "subCategoryName", title: "Sub Category", className: "text-nowrap", width: "200px" },
    { data: "subSubCategoryName", title: "Sub Sub Category", className: "text-nowrap", width: "200px" },
    { data: "subSubSubCategoryName", title: "Sub Sub Sub Category", className: "text-nowrap", width: "220px" },
    { data: "priority", title: "Priority", className: "text-nowrap", width: "120px" },
    { data: null, title: "Status", className: "text-nowrap", width: "110px", render: renderStatus },
    {
      data: null,
      title: "Actions",
      className: "text-nowrap actions-col",
      width: "110px",
      orderable: false,
      searchable: false,
      render: renderActions,
    },
  ];

  // init DT once
  useEffect(() => {
    if (!tableRef.current || dtRef.current) return;

    dtRef.current = new DataTable(tableRef.current, {
      data: filteredRows,
      columns: dtColumns,
      deferRender: true,
      processing: true,
      autoWidth: false,
      scrollX: true,
      paging: true,
      pageLength: perPage,
      lengthChange: false,
      searching: false,
      order: [[0, "asc"]],
      fixedColumns: { start: 1, end: 2 },
      dom: "rt<'dt-footer'ip>",
    });

    // Robust delegated handlers (table + FC clones + document)
    const handle = (e) => {
      const target = e.target;
      const btnEdit = target.closest?.(".btn-edit");
      const btnDelete = target.closest?.(".btn-delete");

      if (btnEdit) {
        e.preventDefault();
        const id = btnEdit.getAttribute("data-id");
        const row = rows.find((r) => String(r.recId) === String(id));
        if (!row) return showToast("Row not found.");
        try {
          sessionStorage.setItem("editMapping", JSON.stringify(row));
        } catch {}
        // ✅ use the route you actually declared in App.jsx
        navigate(`/create-categories-mapping?mode=edit&recId=${encodeURIComponent(id)}`, {
          state: { mode: "edit", mapping: row },
          replace: false,
        });
      }

      if (btnDelete) {
        e.preventDefault();
        const id = btnDelete.getAttribute("data-id");
        if (!id) return;
        if (!window.confirm("Delete this mapping? This cannot be undone.")) return;
        doDelete(id);
      }
    };

    const tableEl = tableRef.current;
    const fixedStart = document.querySelector(".dtfc-fixed-start");
    const fixedEnd = document.querySelector(".dtfc-fixed-end");
    tableEl.addEventListener("click", handle);
    fixedStart?.addEventListener("click", handle);
    fixedEnd?.addEventListener("click", handle);
    document.addEventListener("click", handle);

    return () => {
      tableEl.removeEventListener("click", handle);
      fixedStart?.removeEventListener("click", handle);
      fixedEnd?.removeEventListener("click", handle);
      document.removeEventListener("click", handle);
      if (dtRef.current) {
        dtRef.current.destroy();
        dtRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, rows, perPage]);

  // redraw on data/filter change
  useEffect(() => {
    if (!dtRef.current) return;
    const api = dtRef.current;
    api.clear();
    api.rows.add(filteredRows).draw(false);
  }, [filteredRows]);

  // per-page
  useEffect(() => {
    if (!dtRef.current) return;
    if (dtRef.current.page.len() !== perPage) {
      dtRef.current.page.len(perPage).draw(false);
    }
  }, [perPage]);

  // external search
  useEffect(() => {
    if (!dtRef.current) return;
    dtRef.current.search(searchTerm).draw(false);
  }, [searchTerm]);

  // Delete
  const doDelete = async (recId) => {
    setBusyRow({ recId, action: "delete" });
    try {
      let res = await fetch(DELETE_API(API_BASE_URL, recId), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        res = await fetch(DELETE_API(API_BASE_URL, recId), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
      }
      let payload = null;
      try {
        payload = await res.json();
      } catch {}
      if (!res.ok || payload?.status === false || payload?.success === false) {
        throw new Error(payload?.message || `Delete failed (HTTP ${res.status})`);
      }
      showToast(payload?.message || "Deleted successfully", "success");
      await fetchRows();
    } catch (e) {
      console.error(e);
      showToast(e.message || "Delete failed");
    } finally {
      setBusyRow(null);
    }
  };

  return (
    <div className="case-page">
      <div className="header">
        <div>
          <h1 className="title">Category Mapping</h1>
          <div className="breadcrumb">
            <a href="/" className="breadcrumb-link">Case Management</a>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Category Mapping</span>
          </div>
        </div>

        <div className="actions">
          <button
            className="btn"
            onClick={() => {
              try { sessionStorage.removeItem("editMapping"); } catch {}
              // ✅ use your declared route and pass mode=create in state
              navigate("/create-categories-mapping", { state: { mode: "create" } });
            }}
          >
            Create New Mapping
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="left">
          <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>&nbsp;entries per page</span>
        </div>

        <div className="right">
          <label htmlFor="search">Search:</label>
          <input
            id="search"
            className="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder=""
          />
        </div>
      </div>

      <div className="table-wrap">
        <table
          ref={tableRef}
          id="categoryMappingTable"
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
               <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody />
        </table>
      </div>

      {loading && <div className="loading">Loading…</div>}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .title { margin: 0 0 14px 0; font-size: 22px; color: #0b1f3a; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; color: #6c7a89; font-size: 14px; margin-top: 4px; }
        .breadcrumb-link { color: #334b71; text-decoration: none; font-weight: 600; }
        .breadcrumb-link:hover { text-decoration: underline; }
        .breadcrumb-separator { color: #9aa3b2; user-select: none; }
        .breadcrumb-current { color: #93a1b3; }

        .actions { display: flex; gap: 10px; }
        .btn { background: #1d2c43; color: #fff; border: none; border-radius: 8px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
        .btn:disabled { opacity: .55; cursor: not-allowed; }

        .toolbar { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 12px; }
        .left { display: flex; align-items: center; gap: 6px; color: #647187; }
        .left select { height: 32px; border: 1px solid #d8dee8; border-radius: 6px; padding: 0 8px; outline: none; }
        .right { display: flex; align-items: center; gap: 8px; }
        .search { width: 220px; height: 32px; border: 1px solid #d8dee8; border-radius: 6px; padding: 0 8px; outline: none; }

        .table-wrap { background: #fff; border-radius: 8px; padding: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.06); min-height: 320px; }

        .row-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .iconbtn {
          width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
          border-radius: 6px; border: 1px solid #d8dee8; background: #fff; cursor: pointer;
        }
        .iconbtn.blue { color: #1d2c43; }
        .iconbtn.red { color: #b94b56; }

        .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid #e7ecf3; }
        .badge.active { background: #ecfdf3; color: #0f7a4f; border-color: #b8f2d0; }
        .badge.inactive { background: #fff1f2; color: #9f1239; border-color: #ffd5db; }

        .loading { margin-top: 8px; color: #647187; font-weight: 600; }
      `}</style>
    </div>
  );
};

export default CaseCategoryMappingDashboard;
