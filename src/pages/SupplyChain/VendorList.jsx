import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Crumb, Toast } from "./VendorUI";
import { DELIVERY_PATTERNS, QUALITY_LEVELS } from "./vendorConstants";
import { listVendors } from "./vendorApi";
import "./vendor.css";

const PAGE_SIZE = 25;

export default function VendorList({ canCreate = true, canEdit = true }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [delivery, setDelivery] = useState("");
  const [quality, setQuality] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await listVendors({
          search,
          deliveryPattern: delivery,
          qualityLevel: quality,
          status,
          page,
          limit: PAGE_SIZE,
        });
        if (!alive) return;
        const data = Array.isArray(res) ? res : res && res.data ? res.data : [];
        setRows(data);
        setTotal(Array.isArray(res) ? data.length : (res && res.total) || data.length);
      } catch (err) {
        if (alive) {
          setRows([]);
          setTotal(0);
          setToast({ type: "error", message: err.message });
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [search, delivery, quality, status, page]);

  const onFilter = (setter) => (e) => {
    setPage(1);
    setter(e.target.value);
  };

  const open = (v) =>
    navigate(`/supply-chain/vendors/${encodeURIComponent(v.vendorCode)}`);
  const edit = (v) =>
    navigate(`/supply-chain/vendors/${encodeURIComponent(v.vendorCode)}/edit`);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="vm-scope">
      <Crumb items={[{ label: "Supply Chain" }, { label: "Vendor Management" }]} />

      <div className="vm-head">
        <h1 className="vm-title">Vendors</h1>
        {canCreate && (
          <button
            type="button"
            className="vm-btn vm-btn-primary"
            onClick={() => navigate("/supply-chain/vendors/new")}
          >
            + New Vendor
          </button>
        )}
      </div>

      {/* ---- filters ---- */}
      <div className="vm-filterbar">
        <div className="vm-search">
          <span className="vm-search-icon">⌕</span>
          <input
            className="vm-input"
            value={search}
            onChange={onFilter(setSearch)}
            placeholder="Search vendor name or code"
            aria-label="Search vendor name or code"
          />
        </div>

        <span className="vm-filter-label">Filters</span>

        <label className="vm-filter">
          <span>Delivery Pattern:</span>
          <select
            className="vm-select"
            value={delivery}
            onChange={onFilter(setDelivery)}
          >
            <option value="">All</option>
            {DELIVERY_PATTERNS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="vm-filter">
          <span>Quality Level:</span>
          <select
            className="vm-select"
            value={quality}
            onChange={onFilter(setQuality)}
          >
            <option value="">All</option>
            {QUALITY_LEVELS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>

        <label className="vm-filter">
          <span>Status:</span>
          <select className="vm-select" value={status} onChange={onFilter(setStatus)}>
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Blocked">Blocked</option>
          </select>
        </label>
      </div>

      {/* ---- table ---- */}
      <div className="vm-table-wrap">
        {loading ? (
          <div className="vm-loading">Loading vendors…</div>
        ) : rows.length === 0 ? (
          <div className="vm-empty">
            <b>No vendors match these filters</b>
            Clear the filters, or create a vendor to get started.
          </div>
        ) : (
          <table className="vm-table">
            <thead>
              <tr>
                <th>Vendor Code</th>
                <th>Vendor Name</th>
                <th>Status</th>
                <th>Delivery Pattern</th>
                <th>Quality Level</th>
                <th>Payment Terms</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.vendorCode}>
                  <td className="vm-cell-code">{v.vendorCode}</td>
                  <td>
                    <span className="vm-cell-name" onClick={() => open(v)}>
                      {v.vendorName}
                    </span>
                  </td>
                  <td>
                    <Badge
                      tone={v.isActive ? "green" : "grey"}
                      value={v.isActive ? "Active" : "Draft"}
                    />
                    {v.isBlocked && (
                      <>
                        {" "}
                        <Badge tone="coral" value="Blocked" />
                      </>
                    )}
                  </td>
                  <td>
                    <Badge value={v.deliveryPattern || "Not Defined"} />
                  </td>
                  <td>
                    <Badge value={v.qualityLevel || "Not Defined"} />
                  </td>
                  <td>{v.paymentTerms || "—"}</td>
                  <td>
                    <span className="vm-cell-actions">
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            className="vm-btn-link"
                            onClick={() => edit(v)}
                          >
                            Edit
                          </button>
                          <span className="vm-sep">·</span>
                        </>
                      )}
                      <button
                        type="button"
                        className="vm-btn-link"
                        onClick={() => open(v)}
                      >
                        View
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && rows.length > 0 && (
        <div className="vm-actions" style={{ borderTop: 0, paddingTop: 0 }}>
          <span className="vm-count vm-spacer">
            Showing {from}–{to} of {total} vendors
          </span>
          <button
            type="button"
            className="vm-btn vm-btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="vm-btn vm-btn-ghost"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      <Toast toast={toast} onClear={clearToast} />
    </div>
  );
}