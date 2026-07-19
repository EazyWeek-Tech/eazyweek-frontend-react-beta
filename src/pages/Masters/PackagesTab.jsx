import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const fmtDate = (d) => {
  if (!d) return "Never";
  const s = typeof d === "string" ? d : new Date(d).toISOString();
  const [y, m, day] = s.split("T")[0].split("-");
  return `${day}/${m}/${y}`;
};
const fmt = (n) => Number(n || 0).toLocaleString();

const PackagesTab = ({ custId }) => {
  const [packages, setPackages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    if (!custId) return;
    (async () => {
      setLoading(true); setError("");
      try {
        const res  = await fetch(`${API_BASE_URL}/api/Package/CustomerPackages/${custId}`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        });
        const json = await res.json();
        setPackages(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []);
      } catch { setError("Failed to load packages."); }
      finally { setLoading(false); }
    })();
  }, [custId]);

  const statusBadge = (pkg) => {
    // Status is computed server-side (grace-aware Expired / Exhausted); trust it,
    // with a light Exhausted fallback for zero-balance rows.
    let s = pkg.status;
    if (s === "Active" && pkg.balanceQty === 0) s = "Exhausted";
    const styles = {
      Active:    { bg:"#e6f4ef", color:"#2e7d5e", border:"#b3d9cc" },
      Exhausted: { bg:"#f1f5f9", color:"#475569", border:"#e2e8f0" },
      Expired:   { bg:"#fdf3f3", color:"#b91c1c", border:"#f0c4c0" },
    }[s] || { bg:"#f1f5f9", color:"#475569", border:"#e2e8f0" };
    return (
      <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700,
        background:styles.bg, color:styles.color, border:`1px solid ${styles.border}` }}>
        {s}
      </span>
    );
  };

  return (
    <div className="pkg-wrap">
      <div className="pkg-header">
        <h2 className="pkg-title">Packages</h2>
        <p className="pkg-sub">Purchased package portfolio for this customer</p>
      </div>

      {loading ? <div className="pkg-loading"><div className="pkg-spinner" /> Loading packages…</div>
      : error   ? <div className="pkg-error"> {error}</div>
      : packages.length === 0 ? <div className="pkg-empty">No packages purchased yet.</div>
      : (
        <div className="pkg-table-wrap">
          <table className="pkg-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Date</th>
                <th>Package Code</th>
                <th>Package Name</th>
                <th className="num">Purchased Qty</th>
                <th className="num">Balance Qty</th>
                <th>Expiry Date</th>
                <th>Transferred To</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, idx) => (
                <tr key={idx} className="pkg-row">
                  <td style={{ fontWeight:700, color:"#334b71" }}>{pkg.invoiceNum}</td>
                  <td style={{ color:"#64748b", fontSize:12.5 }}>{fmtDate(pkg.invoiceDate)}</td>
                  <td style={{ fontWeight:700, color:"#334b71" }}>{pkg.packageCode}</td>
                  <td>{pkg.packageName}</td>
                  <td className="num">{fmt(pkg.purchasedQty)}</td>
                  <td className="num" style={{ fontWeight:700, color: pkg.balanceQty === 0 ? "#94a3b8" : "#2e7d5e" }}>
                    {fmt(pkg.balanceQty)}
                  </td>
                  <td style={{ color: pkg.neverExpires ? "#2e7d5e" : "#64748b" }}>
                    {pkg.neverExpires ? "Never Expires" : fmtDate(pkg.expiryDate)}
                  </td>
                  <td style={{ color: pkg.transferredTo ? "#334b71" : "#94a3b8" }}>
                    {pkg.transferredTo || "None"}
                  </td>
                  <td>{statusBadge(pkg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {!loading && packages.length > 0 && (
        <div className="pkg-summary">
          <div className="pkg-s-card primary">
            <div className="pkg-s-label">Total Packages</div>
            <div className="pkg-s-value">{packages.length}</div>
          </div>
          <div className="pkg-s-card">
            <div className="pkg-s-label">Active</div>
            <div className="pkg-s-value" style={{ color:"#2e7d5e" }}>
              {packages.filter(p => p.status === "Active" && p.balanceQty > 0).length}
            </div>
          </div>
          <div className="pkg-s-card">
            <div className="pkg-s-label">Total Balance Sessions</div>
            <div className="pkg-s-value" style={{ color:"#334b71" }}>
              {packages.reduce((s, p) => s + p.balanceQty, 0)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pkg-wrap { font-family:'Segoe UI',system-ui,sans-serif; padding:28px 32px; max-width:1100px; color:#0f172a; background:#f8fafc; }
        .pkg-header { margin-bottom:20px; }
        .pkg-title { margin:0 0 4px; font-size:22px; font-weight:800; color:#1e293b; }
        .pkg-sub { margin:0; font-size:13px; color:#64748b; }
        .pkg-table-wrap { border-radius:14px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 20px rgba(15,23,42,.06); background:#fff; }
        .pkg-table { width:100%; border-collapse:collapse; }
        .pkg-table thead th { background:#f1f5f9; color:#475569; font-weight:700; font-size:11px; text-align:left; padding:12px 14px; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:.06em; }
        .pkg-table thead th.num { text-align:right; }
        .pkg-row td { padding:12px 14px; font-size:13.5px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .pkg-row:last-child td { border-bottom:none; }
        .pkg-row:hover td { background:#f8faff; }
        .num { text-align:right; }
        .pkg-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; background:#fff; border-radius:14px; border:1px solid #e2e8f0; }
        .pkg-loading { display:flex; align-items:center; gap:10px; padding:40px 0; color:#64748b; font-size:13px; }
        .pkg-spinner { width:18px; height:18px; border-radius:50%; border:2.5px solid #e2e8f0; border-top-color:#334b71; animation:pkg-spin .8s linear infinite; }
        @keyframes pkg-spin { to { transform:rotate(360deg); } }
        .pkg-error { padding:14px 18px; background:#fdf3f3; border:1px solid #f0c4c0; border-radius:10px; color:#b91c1c; font-size:13px; }
        .pkg-summary { display:grid; grid-template-columns:1.5fr 1fr 1fr; gap:14px; margin-top:20px; }
        .pkg-s-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:18px 22px; box-shadow:0 2px 10px rgba(15,23,42,.05); }
        .pkg-s-card.primary { background:linear-gradient(135deg,#1e3a5f 0%,#334b71 60%,#3d5a85 100%); border-color:transparent; }
        .pkg-s-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#94a3b8; margin-bottom:8px; }
        .pkg-s-card.primary .pkg-s-label { color:rgba(255,255,255,.65); }
        .pkg-s-value { font-size:28px; font-weight:800; color:#1e293b; }
        .pkg-s-card.primary .pkg-s-value { color:#fff; }
      `}</style>
    </div>
  );
};

export default PackagesTab;