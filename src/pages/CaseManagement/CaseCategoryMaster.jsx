"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config"; // adjust path if needed
import { resolveCategoryAccess } from "../../categoryAccess";

const PAGE_SIZE = 10;
const TYPES = ["Category", "SubCategory", "SubSubCategory", "SubSubSubCategory"];

const CaseCategoryMaster = () => {
  const navigate = useNavigate();
  const [canManage, setCanManage] = useState(false);
  useEffect(() => {
    let ok = true;
    resolveCategoryAccess(API_BASE_URL).then((a) => ok && setCanManage(a.canManage));
    return () => {
      ok = false;
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [search, setSearch] = useState({
    Category: "",
    SubCategory: "",
    SubSubCategory: "",
    SubSubSubCategory: "",
  });
  const [deleting, setDeleting] = useState({}); // { "<recId>|<type>": true }
  const [page, setPage] = useState({
    Category: 1,
    SubCategory: 1,
    SubSubCategory: 1,
    SubSubSubCategory: 1,
  });

  const handleCreateNew = () => navigate("/create-case-category");
  const handleClose = () => navigate(-1);

  // -------- fetch per type ----------
  useEffect(() => {
    let cancelled = false;

    const normalizeList = (list, typeName) =>
      (list || []).map((r, i) => ({
        recId: r.recId ?? r.recID ?? r.id ?? i,
        code: String(r.code ?? r.categoryCode ?? r.subCategoryCode ?? r.subSubCategoryCode ?? r.subSubSubCategoryCode ?? ""),
        name: String(r.name ?? r.categoryName ?? r.subCategoryName ?? r.subSubCategoryName ?? r.subSubSubCategoryName ?? ""),
        type: String(r.type ?? typeName),
        customerCentricCategory:
          typeName === "Category"
            ? (r.customerCentricCategory ?? r.customerCentric ?? r.customer_centric ?? r.customerCentricName ?? "")
            : "", // only for Category
      }));

    const coerceToArray = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      if (raw && typeof raw === "object") return [raw];
      return [];
    };

    const fetchType = async (typeName) => {
      const status = showDrafts ? "draft" : "active";
      const url = `${API_BASE_URL}/api/Master/GetCaseCategory/${encodeURIComponent(typeName)}?status=${status}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${typeName}: HTTP ${res.status}`);
      const raw = await res.json();
      return normalizeList(coerceToArray(raw), typeName);
    };

    const loadAll = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled(TYPES.map(fetchType));
        const merged = results.flatMap((r, idx) =>
          r.status === "fulfilled" ? r.value : []
        );
        if (!cancelled) setAll(merged);
      } catch (e) {
        console.error("Fetch error:", e);
        if (!cancelled) setAll([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [showDrafts]);

  // --- bucket by type ---
  const byType = useMemo(() => {
    const bucket = {
      Category: [],
      SubCategory: [],
      SubSubCategory: [],
      SubSubSubCategory: [],
    };
    for (const item of all) {
      if (bucket[item.type]) bucket[item.type].push(item);
    }
    return bucket;
  }, [all]);

  // --- helpers per panel (filter by search, then paginate) ---
  const pageSlice = (typeName) => {
    const term = (search[typeName] || "").trim().toLowerCase();
    const base = byType[typeName] || [];
    const list = term
      ? base.filter(
          (r) =>
            String(r.name || "").toLowerCase().includes(term) ||
            String(r.code || "").toLowerCase().includes(term)
        )
      : base;
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const cur = Math.min(page[typeName] || 1, totalPages);
    const start = (cur - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return {
      pageItems: list.slice(start, end),
      totalPages,
      total: list.length,
      currentPage: cur,
      searching: !!term,
    };
  };

  const keyOf = (row) => `${row.recId}|${row.type}`;

  const handleDelete = async (row) => {
    const id = keyOf(row);

    if (!row?.recId || !row?.type) {
      alert("Missing RecId or CategoryType for this row.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${row.type} "${row.name}" (code: ${row.code})? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeleting((m) => ({ ...m, [id]: true }));

      // ✅ POST /api/Master/DeleteCaseCategory/{RecId}?CategoryType=<type>
      const url = `${API_BASE_URL}/api/Master/DeleteCaseCategory/${encodeURIComponent(
        row.recId
      )}?CategoryType=${encodeURIComponent(row.type)}`;

      const res = await fetch(url, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Delete failed");
      }

      // Optimistically remove from UI
      setAll((prev) => prev.filter((r) => !(r.recId === row.recId && r.type === row.type)));
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeleting((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
    }
  };

  // --- reusable panel (called directly, not as a component, so the search
  //     input keeps focus across keystrokes) ---
  const renderPanel = ({ title, typeName, showCustomerCentric = false }) => {
    const { pageItems, totalPages, currentPage, total, searching } = pageSlice(typeName);

    return (
      <div className="category-section">
        <div className="category-header">
          <h2 className="category-title">{title}</h2>
          <input
            className="cat-search"
            type="text"
            placeholder="Search code or name…"
            value={search[typeName] || ""}
            onChange={(e) => {
              const v = e.target.value;
              setSearch((s) => ({ ...s, [typeName]: v }));
              setPage((p) => ({ ...p, [typeName]: 1 }));
            }}
          />
        </div>

        <table className="category-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Category Name</th>
              {showCustomerCentric && <th>Customer Centric</th>}
              {canManage && <th style={{ width: 90, textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={2 + (showCustomerCentric ? 1 : 0) + (canManage ? 1 : 0)} className="empty">
                  {searching ? "No matching records." : "No records found."}
                </td>
              </tr>
            ) : (
              pageItems.map((row) => {
                const id = keyOf(row);
                return (
                  <tr key={id}>
                    <td className="category-code">{row.code}</td>
                    <td className="category-name">{row.name}</td>
                    {showCustomerCentric && (
                      <td className="category-extra">
                        {row.customerCentricCategory || "-"}
                      </td>
                    )}
                    {canManage && (
                      <td className="actions">
                        <button
                          className="del-btn"
                          onClick={() => handleDelete(row)}
                          disabled={!!deleting[id]}
                          title="Delete"
                        >
                          {deleting[id] ? "..." : "Delete"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {searching && (
          <div className="search-count">{total} match{total === 1 ? "" : "es"}</div>
        )}

        {totalPages > 1 && (
          <div className="pagination-container" role="navigation" aria-label={`${title} pages`}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`pagination-btn ${p === currentPage ? "active" : ""}`}
                onClick={() => setPage((prev) => ({ ...prev, [typeName]: p }))}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .header-left { display: flex; flex-direction: column; gap: 8px; }
        .page-title { font-size: 24px; font-weight: 800; color: #10223f; margin: 0; }
        .breadcrumb { font-size: 14px; color: #64748b; }
        .breadcrumb-link { color: #334b71; text-decoration: none; cursor: pointer; font-weight: 700; }
        .breadcrumb-link:hover { text-decoration: underline; }
        .breadcrumb-separator { margin: 0 8px; color: #9aa3b2; }
        .breadcrumb-current { color: #93a1b3; }

        .header-buttons { display: flex; gap: 10px; align-items: center; }
        .draft-toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; }
        .draft-toggle input { width: 15px; height: 15px; accent-color: #334b71; cursor: pointer; }
        .draft-flag { display: inline-block; width: max-content; margin-top: 2px; padding: 3px 10px; border-radius: 999px; background: #fff7ed; color: #9a3412; font-size: 12px; font-weight: 700; border: 1px solid #fed7aa; }
        .header-btn {
          padding: 9px 18px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          transition: background .15s ease, transform 0.05s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .header-btn:active { transform: translateY(1px); }
        .create-btn { background-color: #334b71; color: #fff; }
        .create-btn:hover { background-color: #071D49; }
        .close-btn { background-color:#64748b; color: #fff; }
        .close-btn:hover { background-color:#475569; }

        .categories-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .category-section {
          background: #fff;
          overflow: hidden;
          border: 1px solid #e7ecf4;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,.05);
        }
        .category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background:#071D49;
          padding: 12px 16px;
        }
        .category-title { font-size: 13px; font-weight: 800; color: #fff; margin: 0; text-transform: uppercase; letter-spacing: .5px; }
        .cat-search {
          height: 30px; width: 190px; max-width: 50%; border: 1px solid rgba(255,255,255,.25);
          border-radius: 8px; padding: 0 10px; font-size: 13px; outline: none;
          background: rgba(255,255,255,.12); color: #fff;
        }
        .cat-search::placeholder { color: rgba(255,255,255,.7); }
        .cat-search:focus { border-color: #fff; background: rgba(255,255,255,.18); }
        .search-count { padding: 8px 14px 0; font-size: 12px; color: #64748b; font-weight: 600; }

        .category-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .category-table thead th {
          position: sticky; top: 0; background-color: #f4f6fa; color: #10223f; font-weight: 800;
          padding: 11px 14px; font-size: 12px; text-align: left; z-index: 1; border-bottom: 1px solid #e7ecf4;
        }
        .category-table tbody td {
          padding: 11px 14px; border-top: 1px solid #f1f5f9; color: #10223f; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .category-table tbody tr:hover { background-color: #eff6ff; }
        .category-code { font-weight: 700; color: #334b71; }
        .category-extra { color: #10223f; }
        .actions { text-align: right; }
        .del-btn {
          padding: 4px 12px;
          border: none;
          border-radius: 999px;
          color: #b91c1c;
          background:#fdecea;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: background .15s, transform .05s;
        }
        .del-btn:hover { background:#f9d9d4; }
        .del-btn:disabled { opacity: .6; cursor: not-allowed; }

        .empty { text-align: center; color: #64748b; padding: 24px; }

        .pagination-container { display: flex; justify-content: center; gap: 6px; padding: 12px 14px 16px; }
        .pagination-btn {
          min-width: 32px; padding: 7px 12px; border: 1px solid #e7ecf4; background-color: #fff; color: #334b71; cursor: pointer; border-radius: 8px; font-size: 13px; transition: all .15s;
        }
        .pagination-btn:hover { background-color: #f4f6fa; }
        .pagination-btn.active { background-color: #334b71; border-color: #334b71; color: #fff; }

        @media (max-width: 1200px) { .categories-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px) {
          .category-master-container { padding: 16px; }
          .header-section { flex-direction: column; align-items: flex-start; gap: 12px; }
          .categories-grid { grid-template-columns: 1fr; }
          .header-buttons { width: 100%; justify-content: flex-end; }
          .header-btn { width: auto; }
        }
      `}</style>

      <div className="category-master-container">
        {/* Header */}
        <div className="header-section">
          <div className="header-left">
            <div className="breadcrumb">
              <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">Case Category Masters</span>
            </div>
            <h1 className="page-title">Case Category Masters</h1>
            {showDrafts && (
              <span className="draft-flag">Viewing drafts (unsubmitted)</span>
            )}
            {!canManage && (
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                View only — category management is available to Legal-Entity admins.
              </span>
            )}
          </div>
          <div className="header-buttons">
            <label className="draft-toggle" title="Show categories saved as draft (not yet submitted)">
              <input
                type="checkbox"
                checked={showDrafts}
                onChange={(e) => setShowDrafts(e.target.checked)}
              />
              Show drafts
            </label>
            {canManage && (
              <button className="header-btn create-btn" onClick={handleCreateNew}>
                Create New
              </button>
            )}
            <button className="header-btn close-btn" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <p>Loading categories...</p>
        ) : (
          <div className="categories-grid">
            {renderPanel({ title: "Case Category", typeName: "Category", showCustomerCentric: true })}
            {renderPanel({ title: "Case Sub Category", typeName: "SubCategory" })}
            {renderPanel({ title: "Case Sub Sub Category", typeName: "SubSubCategory" })}
            {renderPanel({ title: "Case Sub Sub Sub Category", typeName: "SubSubSubCategory" })}
          </div>
        )}
      </div>
    </>
  );
};

export default CaseCategoryMaster;