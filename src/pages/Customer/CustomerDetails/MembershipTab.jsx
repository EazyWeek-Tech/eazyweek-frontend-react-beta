import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const fmtDate = (d) => {
  if (!d) return "—";
  const s = typeof d === "string" ? d : new Date(d).toISOString();
  const [y, m, day] = s.split("T")[0].split("-");
  return `${day}/${m}/${y}`;
};
const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Customer 360 — Membership section (FRD §6)
const MembershipTab = ({ custId }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!custId) { setLoading(false); return; }
    (async () => {
      setLoading(true); setError("");
      try {
        const res  = await fetch(`${API_BASE_URL}/api/Membership/Customer360/${encodeURIComponent(custId)}`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        });
        const json = await res.json();
        setData(json.data || json);
      } catch { setError("Failed to load membership details."); }
      finally { setLoading(false); }
    })();
  }, [custId]);

  const statusStyle = (s) => ({
    Active:                  { bg: "#e6f4ef", color: "#2e7d5e", border: "#b3d9cc" },
    Expired:                 { bg: "#fdf3f3", color: "#b91c1c", border: "#f0c4c0" },
    "Program Discontinued":  { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" },
    "Not a Member":          { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
  }[s] || { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" });

  return (
    <div className="mtab-wrap">
      <div className="mtab-header">
        <h2 className="mtab-title">Membership</h2>
        <p className="mtab-sub">Membership status and benefits availed by this customer</p>
      </div>

      {loading ? (
        <div className="mtab-loading"><div className="mtab-spinner" /> Loading membership…</div>
      ) : error ? (
        <div className="mtab-error"> {error}</div>
      ) : !data ? (
        <div className="mtab-empty">No membership information.</div>
      ) : (
        <>
          {/* Status card */}
          <div className="mtab-status-card">
            <div className="mtab-status-row">
              <div className="mtab-status-main">
                {(() => { const st = statusStyle(data.status); return (
                  <span style={{ display:"inline-block", padding:"4px 14px", borderRadius:999, fontSize:13, fontWeight:800,
                    background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
                    {data.status}
                  </span>
                ); })()}
                {data.programName && <span className="mtab-prog">{data.programName}</span>}
              </div>
            </div>
            <div className="mtab-status-grid">
              <div className="mtab-stat">
                <div className="mtab-stat-label">Next Expiry</div>
                <div className="mtab-stat-val">{data.neverExpires ? "Never Expires" : fmtDate(data.nextExpiry)}</div>
              </div>
              <div className="mtab-stat">
                <div className="mtab-stat-label">Joined</div>
                <div className="mtab-stat-val">{fmtDate(data.purchaseDate)}</div>
              </div>
              {data.programDiscontinuedDate && (
                <div className="mtab-stat">
                  <div className="mtab-stat-label">Program Discontinued</div>
                  <div className="mtab-stat-val" style={{ color:"#9a3412" }}>{fmtDate(data.programDiscontinuedDate)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Benefits availed */}
          <div className="mtab-benefits">
            <div className="mtab-benefits-head">
              <h3>Benefits Availed</h3>
              <div className="mtab-total">
                Total Benefits Availed: <strong>SAR {fmt(data.totalBenefit)}</strong>
              </div>
            </div>

            {(!data.benefits || data.benefits.length === 0) ? (
              <div className="mtab-empty">No member benefits availed yet.</div>
            ) : (
              <div className="mtab-table-wrap">
                <table className="mtab-table">
                  <thead>
                    <tr><th>Benefits Availed On</th><th className="num">Amount (SAR)</th></tr>
                  </thead>
                  <tbody>
                    {data.benefits.map((b, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight:700, color:"#334b71" }}>{b.invoiceNo}</td>
                        <td className="num">{fmt(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .mtab-wrap { font-family:'Segoe UI',system-ui,sans-serif; padding:28px 32px; max-width:1000px; color:#0f172a; background:#f8fafc; }
        .mtab-header { margin-bottom:20px; }
        .mtab-title { margin:0 0 4px; font-size:22px; font-weight:800; color:#1e293b; }
        .mtab-sub { margin:0; font-size:13px; color:#64748b; }
        .mtab-loading { display:flex; align-items:center; gap:10px; padding:40px 0; color:#64748b; font-size:13px; }
        .mtab-spinner { width:18px; height:18px; border-radius:50%; border:2.5px solid #e2e8f0; border-top-color:#334b71; animation:mtab-spin .8s linear infinite; }
        @keyframes mtab-spin { to { transform:rotate(360deg); } }
        .mtab-error { padding:14px 18px; background:#fdf3f3; border:1px solid #f0c4c0; border-radius:10px; color:#b91c1c; font-size:13px; }
        .mtab-empty { text-align:center; padding:40px 20px; color:#94a3b8; font-size:14px; background:#fff; border-radius:14px; border:1px solid #e2e8f0; }
        .mtab-status-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:20px 24px; box-shadow:0 2px 10px rgba(15,23,42,.05); margin-bottom:20px; }
        .mtab-status-row { margin-bottom:16px; }
        .mtab-status-main { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .mtab-prog { font-size:15px; font-weight:700; color:#1e293b; }
        .mtab-status-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; }
        .mtab-stat-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#94a3b8; margin-bottom:4px; }
        .mtab-stat-val { font-size:15px; font-weight:700; color:#334b71; }
        .mtab-benefits { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:20px 24px; box-shadow:0 2px 10px rgba(15,23,42,.05); }
        .mtab-benefits-head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
        .mtab-benefits-head h3 { margin:0; font-size:16px; font-weight:800; color:#1e293b; }
        .mtab-total { font-size:14px; color:#475569; }
        .mtab-total strong { color:#2e7d5e; font-size:16px; }
        .mtab-table-wrap { border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; }
        .mtab-table { width:100%; border-collapse:collapse; }
        .mtab-table thead th { background:#f1f5f9; color:#475569; font-weight:700; font-size:11px; text-align:left; padding:11px 14px; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:.06em; }
        .mtab-table thead th.num, .mtab-table td.num { text-align:right; }
        .mtab-table td { padding:11px 14px; font-size:13.5px; border-bottom:1px solid #f1f5f9; }
        .mtab-table tr:last-child td { border-bottom:none; }
      `}</style>
    </div>
  );
};

export default MembershipTab;