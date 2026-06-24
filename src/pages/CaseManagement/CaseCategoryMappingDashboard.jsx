"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "datatables.net-dt";
import "datatables.net-fixedcolumns-dt";
import { API_BASE_URL } from "../../config";
import { resolveCategoryAccess } from "../../categoryAccess";

// List API
const LIST_API = (base) => `${base}/api/Master/LoadCaseCategoryMapping`;
// Delete API
const DELETE_API = (base, id) =>
  `${base}/api/Master/DeleteCaseCategoryMapping/${encodeURIComponent(id)}`;

const safe = (v) => (v ?? "").toString();
const normCode = (v) => safe(v).trim().toUpperCase();
const normStr = (v) => safe(v).trim();

function tryParseJSON(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * ✅ Reads the *ACTIVE* center code from storage.
 * This must match what your top dropdown writes.
 *
 * Priority order:
 * 1) session-like objects (loginCode/topCode)
 * 2) flat keys (centerCode/loginCode)
 * 3) user object fallback (user.centerCode)
 */
function readActiveCenterFromStorage() {
  // ---- 1) session/auth objects that may be updated by the dropdown ----
  const sessionKeys = [
    "session",
    "sessionInfo",
    "auth",
    "authInfo",
    "userSession",
    "appSession",
    "currentSession",
    "selectedCenter",      // <-- common
    "selectedClinic",      // <-- common
    "activeCenter",        // <-- common
    "activeClinic",        // <-- common
    "center",              // <-- sometimes used
  ];

  for (const k of sessionKeys) {
    const raw =
      localStorage.getItem(k) ||
      sessionStorage.getItem(k);

    const obj = tryParseJSON(raw);
    if (obj && typeof obj === "object") {
      const code = normCode(obj.loginCode || obj.topCode || obj.centerCode || obj.code);
      const name = normStr(obj.centerName || obj.name || obj.clinicName);
      if (code) return { code, name };
    }
  }

  // ---- 2) flat keys (sometimes dropdown writes plain value) ----
  const flatCode =
    localStorage.getItem("loginCode") ||
    sessionStorage.getItem("loginCode") ||
    localStorage.getItem("topCode") ||
    sessionStorage.getItem("topCode") ||
    localStorage.getItem("centerCode") ||
    sessionStorage.getItem("centerCode") ||
    localStorage.getItem("activeCenterCode") ||
    sessionStorage.getItem("activeCenterCode") ||
    localStorage.getItem("selectedCenterCode") ||
    sessionStorage.getItem("selectedCenterCode");

  const flatName =
    localStorage.getItem("centerName") ||
    sessionStorage.getItem("centerName") ||
    localStorage.getItem("activeCenterName") ||
    sessionStorage.getItem("activeCenterName") ||
    localStorage.getItem("selectedCenterName") ||
    sessionStorage.getItem("selectedCenterName");

  if (flatCode) return { code: normCode(flatCode), name: normStr(flatName) };

  // ---- 3) fallback: user object (usually original assigned center) ----
  const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
  const u = tryParseJSON(rawUser);
  if (u && typeof u === "object") {
    const code = normCode(u.centerCode);
    const name = normStr(u.centerName);
    if (code) return { code, name };
  }

  return { code: "", name: "" };
}

const CaseCategoryMappingDashboard = () => {
  const navigate = useNavigate();
  const [canManage, setCanManage] = useState(false);
  const [atLegalEntity, setAtLegalEntity] = useState(false);
  useEffect(() => {
    let ok = true;
    resolveCategoryAccess(API_BASE_URL).then((a) => {
      if (ok) {
        setCanManage(a.canManage);
        setAtLegalEntity(a.atLegalEntity);
      }
    });
    return () => {
      ok = false;
    };
  }, []);

  const showAllScope = () => atLegalEntity;

  const tableRef = useRef(null);
  const dtRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [rows, setRows] = useState([]);
  const [busyRow, setBusyRow] = useState(null);

  // ✅ ACTIVE center (must follow top dropdown)
  const [activeCenterCode, setActiveCenterCode] = useState("");
  const [activeCenterName, setActiveCenterName] = useState("");

  const showToast = (message, type = "error", ms = 2200) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  /**
   * ✅ Keep active center in sync with dropdown changes.
   * - Polling is used because storage events do not fire in same tab.
   * - Also refresh on focus/visibilitychange.
   */
  useEffect(() => {
    const sync = () => {
      const { code, name } = readActiveCenterFromStorage();

      setActiveCenterCode((prev) => (prev !== code ? code : prev));
      setActiveCenterName((prev) => (prev !== name ? name : prev));
    };

    // initial sync
    sync();

    // Poll (lightweight): adjust interval if you want (e.g., 300ms / 1000ms)
    const t = setInterval(sync, 600);

    // Sync on focus/visibility changes
    const onFocus = () => sync();
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Load data (always filter by activeCenterCode)
  const fetchRows = useCallback(async () => {
    // "Show all" when operating at the legal-entity level (active centre is the
    // entity). Otherwise filter to the active clinic.
    const showAll = atLegalEntity;

    if (!activeCenterCode && !showAll) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(LIST_API(API_BASE_URL), {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = await res.json();
      // Unwrap { success, message, data:[...] } envelope.
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : raw
        ? [raw]
        : [];

      // Legal-entity admin sees ALL clinics' mappings; a center user sees only
      // their own clinic (the entity code never matches a clinic row).
      const filtered = showAll
        ? list
        : list.filter((r) => normCode(r?.centerCode) === normCode(activeCenterCode));

      const norm = filtered.map((r, i) => ({
        recId: r.recID ?? r.recId ?? r.id ?? `${i}`,
        centerCode: r.centerCode ?? "",
        centerName: (r.centerName || "-").toString(),

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
  }, [activeCenterCode, atLegalEntity]);

  // Refetch when active center changes (dropdown switch)
  useEffect(() => {
    if (!activeCenterCode && !atLegalEntity) return;
    fetchRows();
  }, [activeCenterCode, atLegalEntity, fetchRows]);

  // External search
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
    // mappingStatus from API has HTML already
    if (row.mappingStatus) return row.mappingStatus;
    const s = row.caseStatus || (row.status ? "Active" : "Inactive");
    const cls = (s || "").toLowerCase() === "active" ? "badge active" : "badge inactive";
    return `<span class="${cls}">${s}</span>`;
  };

  const renderActions = (row) =>
    !canManage
      ? `<span class="muted">—</span>`
      : `
    <div class="row-actions">
      <button type="button" class="iconbtn blue btn-edit" data-id="${row.recId}" title="Edit" aria-label="Edit">
        ${svgEdit}
      </button>
      <button type="button" class="iconbtn red btn-delete" data-id="${row.recId}" title="Delete" aria-label="Delete">
        ${svgTrash}
      </button>
    </div>
  `;

  const renderPriority = (row) => {
    const p = safe(row.priority).trim();
    if (!p) return `<span class="pill pill-none">—</span>`;
    const k = p.toLowerCase();
    const cls = k === "high" ? "pill-high" : k === "low" ? "pill-low" : "pill-normal";
    return `<span class="pill ${cls}">${p}</span>`;
  };

  const dtColumns = [
    { data: "centerName", title: "Clinic Name", className: "text-nowrap", width: "160px" },
    { data: "categoryName", title: "Category", className: "text-nowrap", width: "180px" },
    { data: "subCategoryName", title: "Sub Category", className: "text-nowrap", width: "200px" },
    { data: "subSubCategoryName", title: "Sub Sub Category", className: "text-nowrap", width: "200px" },
    { data: "subSubSubCategoryName", title: "Sub Sub Sub Category", className: "text-nowrap", width: "220px" },
    { data: null, title: "Priority", className: "text-nowrap", width: "120px", render: renderPriority },
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
    if (!canManage) return;
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

          {(showAllScope() || !!activeCenterCode) && (
            <div className="scope-note">
              {showAllScope()
                ? "Showing all clinics (Legal Entity)"
                : `Center: ${activeCenterCode}${activeCenterName ? ` - ${activeCenterName}` : ""}`}
            </div>
          )}
        </div>

        <div className="actions">
          {canManage && (
            <button
              className="btn"
              onClick={() => {
                try { sessionStorage.removeItem("editMapping"); } catch {}
                navigate("/create-categories-mapping", { state: { mode: "create" } });
              }}
            >
              Create New Mapping
            </button>
          )}
        </div>
      </div>

      <div className="toolbar">
        <div className="left">
          <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
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
        .case-page { color: #10223f; }
        .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .title { margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #10223f; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 14px; margin-top: 2px; }
        .breadcrumb-link { color: #334b71; text-decoration: none; font-weight: 700; }
        .breadcrumb-link:hover { text-decoration: underline; }
        .breadcrumb-separator { color: #9aa3b2; user-select: none; }
        .breadcrumb-current { color: #93a1b3; }
        .scope-note { margin-top: 6px; color: #64748b; font-weight: 600; font-size: 13px; }

        .actions { display: flex; gap: 10px; }
        .btn { background: #334b71; color: #fff; border: none; border-radius: 10px; padding: 9px 18px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.08); transition: background .15s; }
        .btn:hover { background: #071D49; }
        .btn:disabled { opacity: .55; cursor: not-allowed; }

        .toolbar { display: flex; align-items: center; justify-content: space-between; margin: 10px 0 12px; }
        .left { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 14px; }
        .left select, .search { height: 36px; border: 1px solid #e7ecf4; border-radius: 8px; padding: 0 10px; outline: none; color: #10223f; background: #fff; }
        .left select:focus, .search:focus { border-color: #334b71; box-shadow: 0 0 0 3px rgba(51,75,113,.12); }
        .right { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 14px; }
        .search { width: 240px; }

        .table-wrap { background: #fff; border: 1px solid #e7ecf4; border-radius: 12px; padding: 6px 6px 0; box-shadow: 0 1px 4px rgba(0,0,0,.05); min-height: 320px; overflow: hidden; }

        .row-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .iconbtn {
          width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;
          border-radius: 8px; border: 1px solid #e7ecf4; background: #fff; cursor: pointer; transition: background .12s, border-color .12s;
        }
        .iconbtn.blue { color: #334b71; }
        .iconbtn.blue:hover { background: #eef2f8; border-color: #c9d4e6; }
        .iconbtn.red { color: #b91c1c; }
        .iconbtn.red:hover { background: #fdecea; border-color: #f3c1b8; }

        .loading { margin-top: 8px; color: #64748b; font-weight: 600; }
        .toast { position: fixed; right: 18px; bottom: 18px; z-index: 9999; padding: 10px 16px; border-radius: 10px; color: #fff; font-weight: 700; box-shadow: 0 6px 20px rgba(0,0,0,.18); }
        .toast.success { background: #166534; }
        .toast.error { background: #b91c1c; }
      `}</style>

      {/* Global overrides for DataTables-generated markup + cell pills.
          Plain (non-jsx) <style> so it reliably targets DT's own DOM. */}
      <style>{`
        #categoryMappingTable { border-collapse: separate; border-spacing: 0; }
        #categoryMappingTable thead th {
          background: #f4f6fa; color: #10223f; font-weight: 800; font-size: 12.5px;
          padding: 11px 12px; border-bottom: 1px solid #e7ecf4; text-align: left; white-space: nowrap;
        }
        #categoryMappingTable tbody td {
          padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #10223f; font-size: 13px; background: #fff;
        }
        #categoryMappingTable tbody tr:hover td { background: #eff6ff; }
        #categoryMappingTable .dtfc-fixed-start,
        #categoryMappingTable .dtfc-fixed-end { background: #fff; }
        #categoryMappingTable tbody tr:hover .dtfc-fixed-start,
        #categoryMappingTable tbody tr:hover .dtfc-fixed-end { background: #eff6ff; }

        .dt-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 8px; flex-wrap: wrap; gap: 8px; }
        .dt-footer .dt-info { color: #64748b; font-size: 13px; }
        .dt-footer .dt-paging-button {
          min-width: 32px; height: 32px; margin-left: 4px; padding: 0 10px; border: 1px solid #e7ecf4 !important;
          border-radius: 8px; background: #fff !important; color: #334b71 !important; font-size: 13px; cursor: pointer;
        }
        .dt-footer .dt-paging-button:hover { background: #f4f6fa !important; }
        .dt-footer .dt-paging-button.current { background: #334b71 !important; border-color: #334b71 !important; color: #fff !important; }
        .dt-footer .dt-paging-button.disabled { opacity: .45; cursor: not-allowed; }

        #categoryMappingTable .muted { color: #93a1b3; }
        #categoryMappingTable .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        #categoryMappingTable .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        #categoryMappingTable .badge.active { background: #ecfdf5; color: #047857; }
        #categoryMappingTable .badge.inactive { background: #eef1f6; color: #475569; }
        #categoryMappingTable .pill-high { background: #fdecea; color: #b91c1c; }
        #categoryMappingTable .pill-normal { background: #eff6ff; color: #1d4ed8; }
        #categoryMappingTable .pill-low { background: #ecfdf5; color: #047857; }
        #categoryMappingTable .pill-none { background: #eef1f6; color: #64748b; }
      `}</style>
    </div>
  );
};

export default CaseCategoryMappingDashboard;