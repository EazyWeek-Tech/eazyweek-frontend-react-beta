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

const CreditNoteTab = ({ custId }) => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [page,    setPage]    = useState(1);
  const perPage = 10;

  const loadData = async () => {
    if (!custId) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/SalesReturn/CreditNotes/${custId}`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      setData(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []);
    } catch { setError("Failed to load credit notes."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [custId]);

  const totalPages    = Math.ceil(data.length / perPage);
  const currentItems  = data.slice((page-1)*perPage, page*perPage);
  const totalValue    = data.reduce((s, r) => s + r.amount,  0);
  const totalBalance  = data.reduce((s, r) => s + r.balance, 0);

  const statusBadge = (s) => {
    const styles = {
      OPEN:     { bg:"#e6f4ef", color:"#2e7d5e", border:"#b3d9cc" },
      USED:     { bg:"#eef2f7", color:"#334b71", border:"#c3d0e8" },
      EXPIRED:  { bg:"#fdf3f3", color:"#b91c1c", border:"#f0c4c0" },
      CLOSED:   { bg:"#f1f5f9", color:"#475569", border:"#e2e8f0" },
    }[s] || { bg:"#f1f5f9", color:"#475569", border:"#e2e8f0" };
    return (
      <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700,
        background:styles.bg, color:styles.color, border:`1px solid ${styles.border}` }}>
        {s}
      </span>
    );
  };

  return (
    <div className="cn-wrap">
      <div className="cn-header">
        <div>
          <h2 className="cn-title">Credit Notes</h2>
          <p className="cn-sub">Issued credit notes for this customer</p>
        </div>
        <button onClick={loadData}
          style={{ height:36, padding:"0 16px", background:"#334b71", color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
          ↺ Refresh
        </button>
      </div>

      {loading ? (
        <div className="cn-loading"><div className="cn-spinner" /> Loading credit notes…</div>
      ) : error ? (
        <div className="cn-error"> {error}</div>
      ) : data.length === 0 ? (
        <div className="cn-empty">No credit notes found for this customer.</div>
      ) : (
        <>
          <div className="cn-table-wrap">
            <table className="cn-table">
              <thead>
                <tr>
                  <th>Credit Note No.</th>
                  <th>Date</th>
                  <th>Expiry Date</th>
                  <th className="num">Value (SAR)</th>
                  <th className="num">Balance (SAR)</th>
                  <th>Primary Invoice</th>
                  <th>Return Invoice</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((cn, idx) => (
                  <tr key={idx} className="cn-row">
                    <td><span style={{ fontWeight:700, color:"#334b71" }}>{cn.creditNoteNum || "—"}</span></td>
                    <td className="cn-date">{fmtDate(cn.issueDate)}</td>
                    <td className="cn-date">{fmtDate(cn.expiryDate)}</td>
                    <td className="num" style={{ fontWeight:700 }}>{fmt(cn.amount)}</td>
                    <td className="num" style={{ fontWeight:700, color: cn.balance > 0 ? "#2e7d5e" : "#94a3b8" }}>{fmt(cn.balance)}</td>
                    <td><span style={{ color:"#334b71", fontWeight:600 }}>{cn.originalInvoice || "—"}</span></td>
                    <td><span style={{ color:"#64748b" }}>{cn.returnInvoice || "—"}</span></td>
                    <td>{statusBadge(cn.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="cn-pagination">
              <span className="cn-page-info">Page {page} of {totalPages}</span>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => setPage(p => p-1)} disabled={page===1} className="cn-page-btn">← Prev</button>
                <button onClick={() => setPage(p => p+1)} disabled={page>=totalPages} className="cn-page-btn">Next →</button>
              </div>
            </div>
          )}

          <div className="cn-summary">
            <div className="cn-summary-card">
              <div className="cn-summary-label">Total Credit Notes</div>
              <div className="cn-summary-value">{data.length}</div>
            </div>
            <div className="cn-summary-card">
              <div className="cn-summary-label">Total Value Issued</div>
              <div className="cn-summary-value" style={{ color:"#334b71" }}>SAR {fmt(totalValue)}</div>
            </div>
            <div className="cn-summary-card primary">
              <div className="cn-summary-label">Available Balance</div>
              <div className="cn-summary-value">SAR {fmt(totalBalance)}</div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .cn-wrap { font-family:'Segoe UI',system-ui,sans-serif; padding:28px 32px; max-width:1100px; color:#0f172a;  min-height:100%; }
        .cn-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:22px; }
        .cn-title { margin:0 0 4px; font-size:22px; font-weight:800; color:#1e293b; }
        .cn-sub { margin:0; font-size:13px; color:#64748b; }
        .cn-table-wrap { border-radius:14px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 20px rgba(15,23,42,.06); background:#fff; }
        .cn-table { width:100%; border-collapse:collapse; }
        .cn-table thead th { background:#f1f5f9; color:#475569; font-weight:700; font-size:11px; text-align:left; padding:12px 16px; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:.06em; }
        .cn-table thead th.num { text-align:right; }
        .cn-row td { padding:13px 16px; font-size:13.5px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .cn-row:last-child td { border-bottom:none; }
        .cn-row:hover td { background:#f8faff; }
        .cn-date { color:#64748b; font-size:12.5px; }
        .num { text-align:right; }
        .cn-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; background:#fff; border-radius:14px; border:1px solid #e2e8f0; }
        .cn-loading { display:flex; align-items:center; gap:10px; padding:40px 0; color:#64748b; font-size:13px; }
        .cn-spinner { width:18px; height:18px; border-radius:50%; border:2.5px solid #e2e8f0; border-top-color:#334b71; animation:cn-spin .8s linear infinite; }
        @keyframes cn-spin { to { transform:rotate(360deg); } }
        .cn-error { padding:14px 18px; background:#fdf3f3; border:1px solid #f0c4c0; border-radius:10px; color:#b91c1c; font-size:13px; }
        .cn-pagination { display:flex; align-items:center; justify-content:space-between; margin-top:14px; }
        .cn-page-info { font-size:13px; color:#64748b; }
        .cn-page-btn { height:34px; padding:0 14px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; color:#334b71; font-size:13px; font-weight:700; cursor:pointer; }
        .cn-page-btn:disabled { opacity:.4; cursor:not-allowed; }
        .cn-summary { display:grid; grid-template-columns:1fr 1fr 1.5fr; gap:14px; margin-top:20px; }
        .cn-summary-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:18px 22px; box-shadow:0 2px 10px rgba(15,23,42,.05); }
        .cn-summary-card.primary { background:linear-gradient(135deg,#1e3a5f 0%,#334b71 60%,#3d5a85 100%); border-color:transparent; }
        .cn-summary-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#94a3b8; margin-bottom:8px; }
        .cn-summary-card.primary .cn-summary-label { color:rgba(255,255,255,.65); }
        .cn-summary-value { font-size:24px; font-weight:800; color:#1e293b; letter-spacing:-.5px; }
        .cn-summary-card.primary .cn-summary-value { color:#fff; }
        @media (max-width:768px) { .cn-wrap { padding:16px; } .cn-summary { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
};

export default CreditNoteTab;