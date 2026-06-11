import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const fmtDate = (d) => {
  if (!d) return "N/A";
  const [y, m, day] = new Date(d).toISOString().split("T")[0].split("-");
  return `${day}/${m}/${y}`;
};

const PackagesTab = ({ custId }) => {
  const [packageData,   setPackageData]   = useState([]);
  const [filtered,      setFiltered]      = useState([]);
  const [statusFilter,  setStatusFilter]  = useState("All");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [currentPage,   setCurrentPage]   = useState(1);
  const itemsPerPage = 10;

  const loadPackages = async () => {
    if (!custId) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE_URL}/api/Package/CustomerPackages/${custId}`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
setPackageData([...data].sort((a, b) => new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0)));

    } catch { setError("Failed to load packages."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPackages(); }, [custId]);

  // Compute live status per row
  const withStatus = packageData.map(pkg => {
    const today   = new Date();
    const expiry  = pkg.expiryDate ? new Date(pkg.expiryDate) : null;
    let status    = pkg.status || "Active";
    if (status === "Active" && expiry && expiry < today) status = "Expired";
    if (status === "Active" && pkg.balanceQty === 0)     status = "Exhausted";
    return { ...pkg, computedStatus: status };
  });

  // Filter by status
  useEffect(() => {
    setFiltered(statusFilter === "All" ? withStatus : withStatus.filter(p => p.computedStatus === statusFilter));
    setCurrentPage(1);
  }, [statusFilter, packageData]);

  const totalPages     = Math.ceil(filtered.length / itemsPerPage);
  const currentItems   = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusBadge = (status) => {
    const cfg = {
      Active:    { bg: "#e6f4ef", color: "#2e7d5e", border: "#b3d9cc" },
      Exhausted: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
      Expired:   { bg: "#fdf3f3", color: "#b91c1c", border: "#f0c4c0" },
    }[status] || { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
    return (
      <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
        {status}
      </span>
    );
  };

  return (
    <div className="packages-tab">
      {/* Filter + Refresh */}
      <div className="filter-section">
        <label>View Package with status: </label>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {["All", "Active", "Exhausted", "Expired"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={loadPackages}
          style={{ marginLeft: 12, padding: "5px 14px", background: "#334b71", color: "#fff",
            border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          ↺ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: "#64748b" }}>Loading packages…</div>
      ) : error ? (
        <div style={{ padding: "12px 16px", background: "#fdf3f3", border: "1px solid #f0c4c0",
          borderRadius: 8, color: "#b91c1c", fontSize: 13 }}>⚠ {error}</div>
      ) : (
        <>
          <table className="packages-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Package Code</th>
                <th>Package Name</th>
                <th>Purchased Qty</th>
                <th>Balance Qty</th>
                <th>Purchase Date</th>
                <th>Expiry Date</th>
                <th>Expiry With Grace</th>
                <th>Transferred To</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                    No packages found{statusFilter !== "All" ? ` with status "${statusFilter}"` : ""}.
                  </td>
                </tr>
              ) : currentItems.map((pkg, idx) => (
                <tr key={idx}>
                  <td><a href="#" style={{ color: "#334B71", fontWeight: 700 }}>{pkg.invoiceNum}</a></td>
                  <td style={{ fontWeight: 700, color: "#334b71" }}>{pkg.packageCode}</td>
                  <td>{pkg.packageName}</td>
                  <td style={{ textAlign: "center" }}>{pkg.purchasedQty}</td>
                  <td style={{ textAlign: "center", fontWeight: 700,
                    color: pkg.balanceQty === 0 ? "#94a3b8" : "#2e7d5e" }}>
                    {pkg.balanceQty}
                  </td>
                  <td>{fmtDate(pkg.invoiceDate)}</td>
                  <td style={{ color: pkg.computedStatus === "Expired" ? "#b91c1c" : undefined }}>
                    {pkg.neverExpires ? "Never Expires" : fmtDate(pkg.expiryDate)}
                  </td>
                  <td style={{ color: "#64748b" }}>
                    {pkg.neverExpires ? "N/A" : fmtDate(pkg.expiryDate)}
                  </td>
                  <td>{pkg.transferredTo || "None"}</td>
                  <td>{statusBadge(pkg.computedStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <span>Page {currentPage} of {totalPages}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}
                  style={{ padding: "4px 12px", border: "1.5px solid #e2e8f0", borderRadius: 6,
                    background: "#fff", cursor: "pointer", fontWeight: 700, opacity: currentPage === 1 ? 0.4 : 1 }}>
                  ← Prev
                </button>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}
                  style={{ padding: "4px 12px", border: "1.5px solid #e2e8f0", borderRadius: 6,
                    background: "#fff", cursor: "pointer", fontWeight: 700, opacity: currentPage >= totalPages ? 0.4 : 1 }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .packages-tab { font-family: Arial, sans-serif; font-size: 14px; padding: 10px; }
        .filter-section { margin-bottom: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .filter-select { padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-left: 5px; font-size: 13px; }
        .packages-table a { color: #334B71; font-weight: 700; text-decoration: none; }
        .packages-table a:hover { text-decoration: underline; }
        .packages-table { width: 100%; border-collapse: collapse; margin: 10px 0; background: #fff;
          border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 6px 16px rgba(15,23,42,0.06); overflow: hidden; }
        .packages-table td { padding: 12px 18px; font-size: 14px; line-height: 20px; color: #0f172a;
          border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .packages-table tr:last-child td { border-bottom: none; }
        .packages-table tr:hover td { background: #f8faff; }
        .packages-table th { background: #f8fafc; color: #0f172a; font-weight: 700; font-size: 13px;
          text-align: left; padding: 13px 18px; border-bottom: 1px solid #e2e8f0; letter-spacing: .2px; }
      `}</style>
    </div>
  );
};

export default PackagesTab;