"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config"; // adjust path if needed

const PAGE_SIZE = 10;
const TYPES = ["Category", "SubCategory", "SubSubCategory", "SubSubSubCategory"];

const CaseCategoryMaster = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
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
      const url = `${API_BASE_URL}/api/Master/GetCaseCategory/${encodeURIComponent(typeName)}`;
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
  }, []);

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

  // --- helpers per panel (no search; just paginate) ---
  const pageSlice = (typeName) => {
    const list = byType[typeName] || [];
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const cur = Math.min(page[typeName] || 1, totalPages);
    const start = (cur - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return {
      pageItems: list.slice(start, end),
      totalPages,
      total: list.length,
      currentPage: cur,
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

  // --- reusable panel (no search, no count) ---
  const Panel = ({ title, typeName, showCustomerCentric = false }) => {
    const { pageItems, totalPages, currentPage } = pageSlice(typeName);

    return (
      <div className="category-section">
        <div className="category-header">
          <h2 className="category-title">{title}</h2>
        </div>

        <table className="category-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Category Name</th>
              {showCustomerCentric && <th>Customer Centric</th>}
              <th style={{ width: 90, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={showCustomerCentric ? 4 : 3} className="empty">
                  No records found.
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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
        .page-title { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0; }
        .breadcrumb { font-size: 14px; color: #6b7280; }
        .breadcrumb-link { color: #334b71; text-decoration: none; cursor: pointer; }
        .breadcrumb-link:hover { text-decoration: underline; }
        .breadcrumb-separator { margin: 0 8px; }
        .breadcrumb-current { color: #6b7280; }

        .header-buttons { display: flex; gap: 10px; }
        .header-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: transform 0.05s ease, box-shadow 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .header-btn:active { transform: translateY(1px); }
        .create-btn { background-color: #334b71; color: #fff; }
        .create-btn:hover { background-color: #2a3f5f; }
        .close-btn { background-color:#666; color: #fff; }

        .categories-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .category-section {
          background: white;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background:#05224C;
          padding: 12px 16px;
        }
        .category-title { font-size: 14px; font-weight: 700; color: #fff; margin: 0; text-transform: uppercase; letter-spacing: .5px; }

        .category-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .category-table thead th {
          position: sticky; top: 0; background-color: #334b71; color: #fff;
          padding: 12px 14px; font-size: 12px; text-align: left; z-index: 1;
        }
        .category-table tbody td {
          padding: 12px 14px; border-top: 1px solid #f0f2f5; color: #374151; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .category-table tbody tr:hover { background-color: #f9fafb; }
        .category-code { font-weight: 600; color: #334b71; }
        .category-extra { color: #111827; }
        .actions { text-align: right; }
        .del-btn {
          padding: 6px 10px;
          border: 1px solid #f3c1b8;
          border-radius: 8px;
          color: #fff;
          background:rgb(144, 3, 3);
          font-weight: 600;
          cursor: pointer;
          transition: background .15s, border-color .15s, transform .05s;
        }
        .del-btn:disabled { opacity: .6; cursor: not-allowed; }

        .empty { text-align: center; color: #6b7280; padding: 24px; }

        .pagination-container { display: flex; justify-content: center; gap: 6px; padding: 12px 14px 16px; }
        .pagination-btn {
          padding: 8px 12px; border: 1px solid #e5e7eb; background-color: white; color: #374151; cursor: pointer; border-radius: 6px; font-size: 13px; transition: all .15s;
        }
        .pagination-btn:hover { background-color: #f3f4f6; border-color: #d1d5db; }
        .pagination-btn.active { background-color: #334b71; border-color: #334b71; color: white; }

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
          </div>
          <div className="header-buttons">
            <button className="header-btn create-btn" onClick={handleCreateNew}>
              Create New
            </button>
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
            <Panel title="Case Category" typeName="Category" showCustomerCentric />
            <Panel title="Case Sub Category" typeName="SubCategory" />
            <Panel title="Case Sub Sub Category" typeName="SubSubCategory" />
            <Panel title="Case Sub Sub Sub Category" typeName="SubSubSubCategory" />
          </div>
        )}
      </div>
    </>
  );
};

export default CaseCategoryMaster;
