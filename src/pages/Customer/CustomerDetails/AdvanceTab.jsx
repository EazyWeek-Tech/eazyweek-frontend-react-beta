import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const fmtDate = (d) => {
  if (!d) return "—";
  const s = typeof d === "string" ? d : new Date(d).toISOString();
  const [y, m, day] = s.split("T")[0].split("-");
  return `${day}/${m}/${y}`;
};
const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Admin gate — project-wide role master is still pending, so we read the role off
// the session user when present. Adjust the field/markers here once roles are final.
const sessionUser = (() => {
  try { return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}"); }
  catch { return {}; }
})();
const ROLE_STR = String(
  sessionUser.role || sessionUser.roleCode || sessionUser.roleName || sessionUser.userRole || ""
).toLowerCase();
// If no role is present in the session yet, default to allowing (front-end deferral,
// matching the rest of the app). Tighten to `false` once roles are wired.
const IS_ADMIN = ROLE_STR === "" ? true : (ROLE_STR.includes("admin") || ROLE_STR === "acco1");

const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

const AdvanceTab = ({ custId }) => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [page,    setPage]    = useState(1);
  const perPage = 10;

  // Extend-validity modal state
  const [extendRow,   setExtendRow]   = useState(null);
  const [newDate,     setNewDate]     = useState("");
  const [reason,      setReason]      = useState("");
  const [saving,      setSaving]      = useState(false);
  const [modalError,  setModalError]  = useState("");
  const [toast,       setToast]       = useState(null);

  const loadData = async () => {
    if (!custId) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advance/Customer/${custId}`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      setData(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []);
    } catch { setError("Failed to load advance payments."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [custId]);

  const totalPages   = Math.ceil(data.length / perPage);
  const currentItems = data.slice((page - 1) * perPage, page * perPage);
  const totalCollected = useMemo(() => data.reduce((s, r) => s + Number(r.totalAmount || 0), 0), [data]);
  const totalRedeemed  = useMemo(() => data.reduce((s, r) => s + Number(r.redeemedAmount || 0), 0), [data]);
  const totalBalance   = useMemo(() => data.reduce((s, r) => s + Number(r.remainingBalance || 0), 0), [data]);

  const statusBadge = (s) => {
    const styles = {
      "Active":            { bg: "#e6f4ef", color: "#2e7d5e", border: "#b3d9cc" },
      "Partially Redeemed":{ bg: "#eef2f7", color: "#334b71", border: "#c3d0e8" },
      "Fully Redeemed":    { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
      "Expired":           { bg: "#fdf3f3", color: "#b91c1c", border: "#f0c4c0" },
      "Cancelled":         { bg: "#fdf3f3", color: "#b91c1c", border: "#f0c4c0" },
    }[s] || { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
    return (
      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
        background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`, whiteSpace: "nowrap" }}>
        {s}
      </span>
    );
  };

  const canExtend = (r) => IS_ADMIN && Number(r.remainingBalance || 0) > 0 && r.status !== "Fully Redeemed";

  const openExtend = (r) => {
    setExtendRow(r);
    setNewDate("");
    setReason("");
    setModalError("");
  };
  const closeExtend = () => { if (!saving) setExtendRow(null); };

  const submitExtend = async () => {
    setModalError("");
    if (!newDate)            { setModalError("Pick a new expiry date."); return; }
    if (!reason.trim())      { setModalError("A reason is required."); return; }
    if (new Date(newDate) <= new Date()) { setModalError("New expiry date must be in the future."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advance/ExtendValidity`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({
          centerCode:    extendRow.centerCode,
          advanceNum:    extendRow.advanceNum,
          newExpiryDate: newDate,
          reason:        reason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        setModalError(json.message || "Extension failed.");
      } else {
        setToast({ type: "success", msg: `Validity extended for ${extendRow.advanceNum}.` });
        setExtendRow(null);
        await loadData();
        setTimeout(() => setToast(null), 3500);
      }
    } catch (e) {
      setModalError("Extension failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adv-wrap">
      <div className="adv-header">
        <div>
          <h2 className="adv-title">Advance Payments</h2>
          <p className="adv-sub">Advances collected for this customer and their remaining balance</p>
        </div>
        <button onClick={loadData}
          style={{ height: 36, padding: "0 16px", background: "#334b71", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="adv-loading"><div className="adv-spinner" /> Loading advance payments…</div>
      ) : error ? (
        <div className="adv-error">{error}</div>
      ) : data.length === 0 ? (
        <div className="adv-empty">No advance payments found for this customer.</div>
      ) : (
        <>
          <div className="adv-table-wrap">
            <table className="adv-table">
              <thead>
                <tr>
                  <th>Advance No.</th>
                  <th>Collected</th>
                  <th>Expiry</th>
                  <th className="num">Base (SAR)</th>
                  <th className="num">VAT (SAR)</th>
                  <th className="num">Value (SAR)</th>
                  <th className="num">Redeemed</th>
                  <th className="num">Balance</th>
                  <th>Status</th>
                  {IS_ADMIN && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((r, idx) => (
                  <tr key={idx} className="adv-row">
                    <td><span style={{ fontWeight: 700, color: "#334b71" }}>{r.advanceNum || "—"}</span></td>
                    <td className="adv-date">{fmtDate(r.collectionDate)}</td>
                    <td className="adv-date">{fmtDate(r.expiryDate)}</td>
                    <td className="num">{fmt(r.baseAmount)}</td>
                    <td className="num">{fmt(r.vatAmount)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{fmt(r.totalAmount)}</td>
                    <td className="num" style={{ color: "#64748b" }}>{fmt(r.redeemedAmount)}</td>
                    <td className="num" style={{ fontWeight: 700, color: Number(r.remainingBalance) > 0 ? "#2e7d5e" : "#94a3b8" }}>{fmt(r.remainingBalance)}</td>
                    <td>{statusBadge(r.status)}</td>
                    {IS_ADMIN && (
                      <td>
                        {canExtend(r) ? (
                          <button className="adv-extend-btn" onClick={() => openExtend(r)}>Extend</button>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="adv-pagination">
              <span className="adv-page-info">Page {page} of {totalPages}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="adv-page-btn">← Prev</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="adv-page-btn">Next →</button>
              </div>
            </div>
          )}

          <div className="adv-summary">
            <div className="adv-summary-card">
              <div className="adv-summary-label">Total Advances</div>
              <div className="adv-summary-value">{data.length}</div>
            </div>
            <div className="adv-summary-card">
              <div className="adv-summary-label">Total Collected</div>
              <div className="adv-summary-value" style={{ color: "#334b71" }}>SAR {fmt(totalCollected)}</div>
            </div>
            <div className="adv-summary-card">
              <div className="adv-summary-label">Total Redeemed</div>
              <div className="adv-summary-value" style={{ color: "#64748b" }}>SAR {fmt(totalRedeemed)}</div>
            </div>
            <div className="adv-summary-card primary">
              <div className="adv-summary-label">Available Balance</div>
              <div className="adv-summary-value">SAR {fmt(totalBalance)}</div>
            </div>
          </div>
        </>
      )}

      {/* ── Extend Validity modal (admin) ── */}
      {extendRow && (
        <div className="adv-modal-overlay" onClick={closeExtend}>
          <div className="adv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adv-modal-head">
              <span>Extend Validity</span>
              <button className="adv-modal-x" onClick={closeExtend} disabled={saving}>×</button>
            </div>
            <div className="adv-modal-body">
              <div className="adv-modal-meta">
                <div><span>Advance</span><strong>{extendRow.advanceNum}</strong></div>
                <div><span>Balance</span><strong>SAR {fmt(extendRow.remainingBalance)}</strong></div>
                <div><span>Current expiry</span><strong>{fmtDate(extendRow.expiryDate)}</strong></div>
              </div>

              <label className="adv-field-label">New Expiry Date</label>
              <input type="date" className="adv-input" value={newDate} min={tomorrowISO()}
                onChange={(e) => setNewDate(e.target.value)} />

              <label className="adv-field-label">Reason for Extension <span style={{ color: "#b91c1c" }}>*</span></label>
              <textarea className="adv-input" rows={3} value={reason} placeholder="e.g. Customer requested more time to complete treatment"
                onChange={(e) => setReason(e.target.value)} />

              {modalError && <div className="adv-modal-error">{modalError}</div>}
            </div>
            <div className="adv-modal-foot">
              <button className="adv-btn-secondary" onClick={closeExtend} disabled={saving}>Cancel</button>
              <button className="adv-btn-primary" onClick={submitExtend} disabled={saving || !newDate || !reason.trim()}>
                {saving ? "Saving…" : "Confirm Extension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`adv-toast ${toast.type}`}>{toast.msg}</div>}

      <style>{`
        .adv-wrap { font-family:'Segoe UI',system-ui,sans-serif; padding:28px 32px; max-width:1200px; color:#0f172a; background:#f8fafc; min-height:100%; }
        .adv-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:22px; }
        .adv-title { margin:0 0 4px; font-size:22px; font-weight:800; color:#1e293b; }
        .adv-sub { margin:0; font-size:13px; color:#64748b; }
        .adv-table-wrap { border-radius:14px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 20px rgba(15,23,42,.06); background:#fff; }
        .adv-table { width:100%; border-collapse:collapse; }
        .adv-table thead th { background:#f1f5f9; color:#475569; font-weight:700; font-size:11px; text-align:left; padding:12px 14px; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
        .adv-table thead th.num { text-align:right; }
        .adv-row td { padding:13px 14px; font-size:13.5px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .adv-row:last-child td { border-bottom:none; }
        .adv-row:hover td { background:#f8faff; }
        .adv-date { color:#64748b; font-size:12.5px; white-space:nowrap; }
        .num { text-align:right; }
        .adv-extend-btn { height:30px; padding:0 12px; border-radius:7px; border:1.5px solid #334b71; background:#fff; color:#334b71; font-size:12px; font-weight:700; cursor:pointer; }
        .adv-extend-btn:hover { background:#334b71; color:#fff; }
        .adv-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; background:#fff; border-radius:14px; border:1px solid #e2e8f0; }
        .adv-loading { display:flex; align-items:center; gap:10px; padding:40px 0; color:#64748b; font-size:13px; }
        .adv-spinner { width:18px; height:18px; border-radius:50%; border:2.5px solid #e2e8f0; border-top-color:#334b71; animation:adv-spin .8s linear infinite; }
        @keyframes adv-spin { to { transform:rotate(360deg); } }
        .adv-error { padding:14px 18px; background:#fdf3f3; border:1px solid #f0c4c0; border-radius:10px; color:#b91c1c; font-size:13px; }
        .adv-pagination { display:flex; align-items:center; justify-content:space-between; margin-top:14px; }
        .adv-page-info { font-size:13px; color:#64748b; }
        .adv-page-btn { height:34px; padding:0 14px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; color:#334b71; font-size:13px; font-weight:700; cursor:pointer; }
        .adv-page-btn:disabled { opacity:.4; cursor:not-allowed; }
        .adv-summary { display:grid; grid-template-columns:1fr 1fr 1fr 1.4fr; gap:14px; margin-top:20px; }
        .adv-summary-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:18px 22px; box-shadow:0 2px 10px rgba(15,23,42,.05); }
        .adv-summary-card.primary { background:linear-gradient(135deg,#1e3a5f 0%,#334b71 60%,#3d5a85 100%); border-color:transparent; }
        .adv-summary-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#94a3b8; margin-bottom:8px; }
        .adv-summary-card.primary .adv-summary-label { color:rgba(255,255,255,.65); }
        .adv-summary-value { font-size:24px; font-weight:800; color:#1e293b; letter-spacing:-.5px; }
        .adv-summary-card.primary .adv-summary-value { color:#fff; }
        .adv-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.5); display:flex; align-items:center; justify-content:center; z-index:9999; }
        .adv-modal { width:440px; max-width:92vw; background:#fff; border-radius:14px; box-shadow:0 24px 60px rgba(15,23,42,.3); overflow:hidden; }
        .adv-modal-head { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:#334b71; color:#fff; font-weight:700; font-size:15px; }
        .adv-modal-x { background:none; border:none; color:#fff; font-size:22px; line-height:1; cursor:pointer; }
        .adv-modal-body { padding:20px; }
        .adv-modal-meta { display:flex; gap:18px; flex-wrap:wrap; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; margin-bottom:16px; }
        .adv-modal-meta div { display:flex; flex-direction:column; gap:2px; }
        .adv-modal-meta span { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#94a3b8; }
        .adv-modal-meta strong { font-size:13.5px; color:#334b71; }
        .adv-field-label { display:block; font-size:12px; font-weight:700; color:#475569; margin:12px 0 6px; }
        .adv-input { width:100%; box-sizing:border-box; border:1.5px solid #cbd5e1; border-radius:8px; padding:9px 12px; font-size:13.5px; font-family:inherit; color:#0f172a; }
        .adv-input:focus { outline:none; border-color:#334b71; }
        .adv-modal-error { margin-top:12px; padding:10px 12px; background:#fdf3f3; border:1px solid #f0c4c0; border-radius:8px; color:#b91c1c; font-size:12.5px; }
        .adv-modal-foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 20px; border-top:1px solid #f1f5f9; }
        .adv-btn-secondary { height:38px; padding:0 18px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; color:#475569; font-weight:700; font-size:13px; cursor:pointer; }
        .adv-btn-primary { height:38px; padding:0 18px; border-radius:8px; border:none; background:#334b71; color:#fff; font-weight:700; font-size:13px; cursor:pointer; }
        .adv-btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .adv-toast { position:fixed; bottom:24px; right:24px; padding:12px 18px; border-radius:10px; font-size:13px; font-weight:600; color:#fff; background:#2e7d5e; box-shadow:0 8px 24px rgba(15,23,42,.25); z-index:10000; }
        .adv-toast.error { background:#b91c1c; }
        @media (max-width:768px) { .adv-wrap { padding:16px; } .adv-summary { grid-template-columns:1fr 1fr; } }
      `}</style>
    </div>
  );
};

export default AdvanceTab;