import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authJSON = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` });

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
// No role present yet ⇒ default to allowing (front-end deferral). Tighten once roles are wired.
const IS_ADMIN = ROLE_STR === "" ? true : (ROLE_STR.includes("admin") || ROLE_STR === "acco1" || ROLE_STR.includes("manager"));

const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

const REFUND_METHODS = ["Cash", "Credit/Debit Card", "Bank Transfer", "Cheque", "Payment Gateway", "Other"];

const AdvanceTab = ({ custId }) => {
  const [data,    setData]    = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [page,    setPage]    = useState(1);
  const perPage = 10;

  // Extend-validity modal state
  const [extendRow,  setExtendRow]  = useState(null);
  const [newDate,    setNewDate]    = useState("");
  const [reason,     setReason]     = useState("");
  const [saving,     setSaving]     = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast,      setToast]      = useState(null);

  // Refund modal state
  const [refundRow,    setRefundRow]    = useState(null);
  const [refundCtx,    setRefundCtx]    = useState(null);
  const [ctxLoading,   setCtxLoading]   = useState(false);
  const [rfAmount,     setRfAmount]     = useState("");
  const [rfMethod,     setRfMethod]     = useState("");
  const [rfReason,     setRfReason]     = useState("");
  const [rfOverrideReason, setRfOverrideReason] = useState("");
  const [rfSaving,     setRfSaving]     = useState(false);
  const [rfError,      setRfError]      = useState("");
  const [actingId,     setActingId]     = useState(null); // approve/reject in-flight

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const loadData = async () => {
    if (!custId) return;
    setLoading(true); setError("");
    try {
      const [advRes, refRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Advance/Customer/${custId}`, { headers: { Authorization: `Bearer ${TOKEN()}` } }),
        fetch(`${API_BASE_URL}/api/Advance/Refunds/${custId}`,  { headers: { Authorization: `Bearer ${TOKEN()}` } }),
      ]);
      const advJson = await advRes.json();
      const refJson = await refRes.json();
      setData(Array.isArray(advJson.data) ? advJson.data : Array.isArray(advJson) ? advJson : []);
      setRefunds(Array.isArray(refJson.data) ? refJson.data : Array.isArray(refJson) ? refJson : []);
    } catch { setError("Failed to load advance payments."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [custId]);

  const totalPages   = Math.ceil(data.length / perPage);
  const currentItems = data.slice((page - 1) * perPage, page * perPage);
  const totalCollected = useMemo(() => data.reduce((s, r) => s + Number(r.totalAmount || 0), 0), [data]);
  const totalRedeemed  = useMemo(() => data.reduce((s, r) => s + Number(r.redeemedAmount || 0), 0), [data]);
  const totalBalance   = useMemo(() => data.reduce((s, r) => s + Number(r.remainingBalance || 0), 0), [data]);
  const pendingRefunds = useMemo(() => refunds.filter((r) => r.status === "Pending Approval"), [refunds]);

  const statusBadge = (s) => {
    const styles = {
      "Active":             { bg: "#e6f4ef", color: "#2e7d5e", border: "#b3d9cc" },
      "Partially Redeemed": { bg: "#eef2f7", color: "#334b71", border: "#c3d0e8" },
      "Fully Redeemed":     { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
      "Partially Refunded": { bg: "#fff4e6", color: "#b45309", border: "#fcd9a8" },
      "Fully Refunded":     { bg: "#fdf3f3", color: "#b91c1c", border: "#f0c4c0" },
      "Forfeited":          { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
      "Expired":            { bg: "#fdf3f3", color: "#b91c1c", border: "#f0c4c0" },
      "Processed":          { bg: "#e6f4ef", color: "#2e7d5e", border: "#b3d9cc" },
      "Pending Approval":   { bg: "#fff4e6", color: "#b45309", border: "#fcd9a8" },
      "Rejected":           { bg: "#fdf3f3", color: "#b91c1c", border: "#f0c4c0" },
    }[s] || { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
    return (
      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
        background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`, whiteSpace: "nowrap" }}>
        {s}
      </span>
    );
  };

  const canExtend  = (r) => IS_ADMIN && r.allowValidityExtension !== false && Number(r.remainingBalance || 0) > 0 && !["Fully Redeemed", "Fully Refunded", "Forfeited"].includes(r.rawStatus || r.status);
  const canRefund  = (r) => Number(r.remainingBalance || 0) > 0 && !["Fully Redeemed", "Fully Refunded", "Forfeited"].includes(r.rawStatus || r.status);
  const canForfeit = (r) => IS_ADMIN && r.isExpired && Number(r.remainingBalance || 0) > 0 && (r.rawStatus || r.status) !== "Forfeited";

  // ── Extend validity ──
  const openExtend  = (r) => { setExtendRow(r); setNewDate(""); setReason(""); setModalError(""); };
  const closeExtend = () => { if (!saving) setExtendRow(null); };
  const submitExtend = async () => {
    setModalError("");
    if (!newDate)                        { setModalError("Pick a new expiry date."); return; }
    if (!reason.trim())                  { setModalError("A reason is required."); return; }
    if (new Date(newDate) <= new Date()) { setModalError("New expiry date must be in the future."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advance/ExtendValidity`, {
        method: "POST", headers: authJSON(),
        body: JSON.stringify({ centerCode: extendRow.centerCode, advanceNum: extendRow.advanceNum, newExpiryDate: newDate, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) { setModalError(json.message || "Extension failed."); }
      else { showToast("success", `Validity extended for ${extendRow.advanceNum}.`); setExtendRow(null); await loadData(); }
    } catch { setModalError("Extension failed. Please try again."); }
    finally { setSaving(false); }
  };

  // ── Refund ──
  const openRefund = async (r) => {
    setRefundRow(r); setRefundCtx(null); setRfAmount(""); setRfReason(""); setRfOverrideReason(""); setRfError("");
    setCtxLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advance/RefundContext/${r.advanceNum}?centerCode=${encodeURIComponent(r.centerCode)}`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      const ctx = json.data ?? json;
      setRefundCtx(ctx);
      setRfMethod(ctx.originalMethodName || "Cash");
    } catch { setRfError("Could not load refund details."); }
    finally { setCtxLoading(false); }
  };
  const closeRefund = () => { if (!rfSaving) { setRefundRow(null); setRefundCtx(null); } };

  const rfNum        = parseFloat(rfAmount || 0);
  const rfRatio      = refundCtx && refundCtx.totalAmount > 0 ? refundCtx.vatAmount / refundCtx.totalAmount : 0;
  const rfVatPreview = Math.round(rfNum * rfRatio * 100) / 100;
  const rfBasePreview = Math.round((rfNum - rfVatPreview) * 100) / 100;
  const rfIsOverride = !!(refundCtx && rfMethod && rfMethod !== (refundCtx.originalMethodName || ""));
  const rfNeedsApproval = !!(refundCtx && refundCtx.approvalThreshold != null && rfNum > refundCtx.approvalThreshold);

  const submitRefund = async () => {
    setRfError("");
    const bal = Number(refundCtx?.remainingBalance || 0);
    if (!(rfNum > 0))         { setRfError("Enter a refund amount greater than zero."); return; }
    if (rfNum > bal + 0.01)   { setRfError(`Refund cannot exceed remaining balance of SAR ${fmt(bal)}.`); return; }
    if (!rfReason.trim())     { setRfError("A refund reason is required."); return; }
    if (rfIsOverride && !IS_ADMIN) { setRfError("Only an admin can change the refund method from the original."); return; }
    if (rfIsOverride && !rfOverrideReason.trim()) { setRfError("A documented reason is required to change the refund method."); return; }
    setRfSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advance/Refund`, {
        method: "POST", headers: authJSON(),
        body: JSON.stringify({
          centerCode: refundRow.centerCode, advanceNum: refundRow.advanceNum,
          refundAmount: rfNum, refundMethodName: rfMethod,
          methodOverride: rfIsOverride, methodOverrideReason: rfOverrideReason.trim(),
          reason: rfReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) { setRfError(json.message || "Refund failed."); }
      else {
        const pending = json.data && json.data.status === "Pending Approval";
        showToast("success", pending ? `Refund ${json.data.refundNum} submitted for approval.` : `Refund ${json.data?.refundNum || ""} processed.`);
        setRefundRow(null); setRefundCtx(null); await loadData();
      }
    } catch { setRfError("Refund failed. Please try again."); }
    finally { setRfSaving(false); }
  };

  const forfeitAdvance = async (row) => {
    if (!window.confirm(`Forfeit advance ${row.advanceNum}? Its remaining balance of SAR ${fmt(row.remainingBalance)} will be recognised as revenue. This cannot be undone.`)) return;
    setActingId(row.advanceNum);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advance/Forfeit`, {
        method: "POST", headers: authJSON(),
        body: JSON.stringify({ centerCode: row.centerCode, advanceNum: row.advanceNum }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) showToast("error", json.message || "Forfeit failed.");
      else { showToast("success", `Advance ${row.advanceNum} forfeited.`); await loadData(); }
    } catch { showToast("error", "Forfeit failed."); }
    finally { setActingId(null); }
  };

  const approveRefund = async (row) => {
    setActingId(row.refundId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advance/Refund/Approve`, {
        method: "POST", headers: authJSON(),
        body: JSON.stringify({ centerCode: row.centerCode, refundId: row.refundId }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) showToast("error", json.message || "Approval failed.");
      else { showToast("success", `Refund ${row.refundNum} approved.`); await loadData(); }
    } catch { showToast("error", "Approval failed."); }
    finally { setActingId(null); }
  };

  const rejectRefund = async (row) => {
    const rr = window.prompt(`Reject refund ${row.refundNum}? Optionally enter a reason:`, "");
    if (rr === null) return; // cancelled
    setActingId(row.refundId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advance/Refund/Reject`, {
        method: "POST", headers: authJSON(),
        body: JSON.stringify({ centerCode: row.centerCode, refundId: row.refundId, rejectReason: rr }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) showToast("error", json.message || "Rejection failed.");
      else { showToast("success", `Refund ${row.refundNum} rejected.`); await loadData(); }
    } catch { showToast("error", "Rejection failed."); }
    finally { setActingId(null); }
  };

  return (
    <div className="adv-wrap">
      <div className="adv-header">
        <div>
          <h2 className="adv-title">Advance Payments</h2>
          <p className="adv-sub">Advances collected for this customer, their balance, and refunds</p>
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
          {/* Pending approvals (admin) */}
          {IS_ADMIN && pendingRefunds.length > 0 && (
            <div className="adv-pending">
              <div className="adv-pending-head">Refunds Pending Approval ({pendingRefunds.length})</div>
              {pendingRefunds.map((r) => (
                <div key={r.refundId} className="adv-pending-row">
                  <div>
                    <div style={{ fontWeight: 700, color: "#334b71" }}>{r.refundNum} · {r.advanceNum}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      SAR {fmt(r.refundAmount)} (VAT {fmt(r.refundVat)}) · {r.refundMethodName || "—"} · {r.reason}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="adv-approve-btn" disabled={actingId === r.refundId} onClick={() => approveRefund(r)}>Approve</button>
                    <button className="adv-reject-btn"  disabled={actingId === r.refundId} onClick={() => rejectRefund(r)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                  <th className="num">Refunded</th>
                  <th className="num">Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                    <td className="num" style={{ color: "#b45309" }}>{fmt(r.refundedAmount)}</td>
                    <td className="num" style={{ fontWeight: 700, color: Number(r.remainingBalance) > 0 ? "#2e7d5e" : "#94a3b8" }}>{fmt(r.remainingBalance)}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {canRefund(r) && <button className="adv-refund-btn" onClick={() => openRefund(r)}>Refund</button>}
                        {canExtend(r) && <button className="adv-extend-btn" onClick={() => openExtend(r)}>Extend</button>}
                        {canForfeit(r) && <button className="adv-forfeit-btn" disabled={actingId === r.advanceNum} onClick={() => forfeitAdvance(r)}>Forfeit</button>}
                        {!canRefund(r) && !canExtend(r) && !canForfeit(r) && <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>}
                      </div>
                    </td>
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

          {/* Refund history */}
          {refunds.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: "0 0 12px" }}>Refund History</h3>
              <div className="adv-table-wrap">
                <table className="adv-table">
                  <thead>
                    <tr>
                      <th>Refund No.</th>
                      <th>Advance</th>
                      <th>Date</th>
                      <th className="num">Amount</th>
                      <th className="num">VAT Reversed</th>
                      <th>Method</th>
                      <th>Credit Note</th>
                      <th>Status</th>
                      <th>Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((r, i) => (
                      <tr key={i} className="adv-row">
                        <td><span style={{ fontWeight: 700, color: "#334b71" }}>{r.refundNum}</span></td>
                        <td>{r.advanceNum}</td>
                        <td className="adv-date">{fmtDate(r.refundDate || r.requestedDate)}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{fmt(r.refundAmount)}</td>
                        <td className="num">{fmt(r.refundVat)}</td>
                        <td>{r.refundMethodName || "—"}</td>
                        <td>{r.creditNoteRef || "—"}</td>
                        <td>{statusBadge(r.status)}</td>
                        <td style={{ color: "#64748b", fontSize: 12.5 }}>{r.approvedBy || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Extend Validity modal (admin) ── */}
      {extendRow && (
        <div className="adv-modal-overlay" onClick={closeExtend}>
          <div className="adv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adv-modal-head"><span>Extend Validity</span><button className="adv-modal-x" onClick={closeExtend} disabled={saving}>×</button></div>
            <div className="adv-modal-body">
              <div className="adv-modal-meta">
                <div><span>Advance</span><strong>{extendRow.advanceNum}</strong></div>
                <div><span>Balance</span><strong>SAR {fmt(extendRow.remainingBalance)}</strong></div>
                <div><span>Current expiry</span><strong>{fmtDate(extendRow.expiryDate)}</strong></div>
              </div>
              <label className="adv-field-label">New Expiry Date</label>
              <input type="date" className="adv-input" value={newDate} min={tomorrowISO()} onChange={(e) => setNewDate(e.target.value)} />
              <label className="adv-field-label">Reason for Extension <span style={{ color: "#b91c1c" }}>*</span></label>
              <textarea className="adv-input" rows={3} value={reason} placeholder="e.g. Customer requested more time to complete treatment" onChange={(e) => setReason(e.target.value)} />
              {modalError && <div className="adv-modal-error">{modalError}</div>}
            </div>
            <div className="adv-modal-foot">
              <button className="adv-btn-secondary" onClick={closeExtend} disabled={saving}>Cancel</button>
              <button className="adv-btn-primary" onClick={submitExtend} disabled={saving || !newDate || !reason.trim()}>{saving ? "Saving…" : "Confirm Extension"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund modal ── */}
      {refundRow && (
        <div className="adv-modal-overlay" onClick={closeRefund}>
          <div className="adv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adv-modal-head"><span>Refund Advance</span><button className="adv-modal-x" onClick={closeRefund} disabled={rfSaving}>×</button></div>
            <div className="adv-modal-body">
              {ctxLoading ? (
                <div className="adv-loading"><div className="adv-spinner" /> Loading…</div>
              ) : !refundCtx ? (
                <div className="adv-modal-error">{rfError || "Could not load refund details."}</div>
              ) : (
                <>
                  <div className="adv-modal-meta">
                    <div><span>Advance</span><strong>{refundRow.advanceNum}</strong></div>
                    <div><span>Remaining</span><strong>SAR {fmt(refundCtx.remainingBalance)}</strong></div>
                    <div><span>Collected via</span><strong>{refundCtx.originalMethodName || "—"}</strong></div>
                  </div>

                  <label className="adv-field-label">Refund Amount <span style={{ color: "#b91c1c" }}>*</span></label>
                  <input type="number" className="adv-input" min={0.01} step={0.01} value={rfAmount}
                    max={refundCtx.remainingBalance} placeholder={`Max SAR ${fmt(refundCtx.remainingBalance)}`}
                    onChange={(e) => setRfAmount(e.target.value)} />
                  {rfNum > 0 && (
                    <div className="adv-vat-preview">
                      Base refunded: <strong>SAR {fmt(rfBasePreview)}</strong> · VAT reversed: <strong>SAR {fmt(rfVatPreview)}</strong>
                    </div>
                  )}

                  <label className="adv-field-label">Refund Method</label>
                  <select className="adv-input" value={rfMethod} onChange={(e) => setRfMethod(e.target.value)}>
                    {[...new Set([refundCtx.originalMethodName, ...REFUND_METHODS].filter(Boolean))].map((m) => (
                      <option key={m} value={m}>{m}{m === refundCtx.originalMethodName ? " (original)" : ""}</option>
                    ))}
                  </select>
                  {rfIsOverride && (
                    <>
                      {!IS_ADMIN && <div className="adv-modal-error" style={{ marginTop: 8 }}>Changing the refund method requires an admin.</div>}
                      <label className="adv-field-label">Reason for Method Change <span style={{ color: "#b91c1c" }}>*</span></label>
                      <input className="adv-input" value={rfOverrideReason} placeholder="Why is the refund not via the original method?" onChange={(e) => setRfOverrideReason(e.target.value)} />
                    </>
                  )}

                  <label className="adv-field-label">Refund Reason <span style={{ color: "#b91c1c" }}>*</span></label>
                  <textarea className="adv-input" rows={2} value={rfReason} maxLength={255} placeholder="e.g. Customer cancelled treatment" onChange={(e) => setRfReason(e.target.value)} />

                  {rfNeedsApproval && (
                    <div className="adv-approval-note">This refund exceeds the approval threshold (SAR {fmt(refundCtx.approvalThreshold)}) and will be submitted for Manager/Admin approval.</div>
                  )}
                  {rfError && <div className="adv-modal-error">{rfError}</div>}
                </>
              )}
            </div>
            <div className="adv-modal-foot">
              <button className="adv-btn-secondary" onClick={closeRefund} disabled={rfSaving}>Cancel</button>
              <button className="adv-btn-primary" onClick={submitRefund} disabled={rfSaving || ctxLoading || !refundCtx || !(rfNum > 0) || !rfReason.trim()}>
                {rfSaving ? "Processing…" : rfNeedsApproval ? "Submit for Approval" : "Process Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`adv-toast ${toast.type}`}>{toast.msg}</div>}

      <style>{`
        .adv-wrap { font-family:'Segoe UI',system-ui,sans-serif; padding:28px 32px; max-width:1240px; color:#0f172a; background:#f8fafc; min-height:100%; }
        .adv-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:22px; }
        .adv-title { margin:0 0 4px; font-size:22px; font-weight:800; color:#1e293b; }
        .adv-sub { margin:0; font-size:13px; color:#64748b; }
        .adv-table-wrap { border-radius:14px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 20px rgba(15,23,42,.06); background:#fff; }
        .adv-table { width:100%; border-collapse:collapse; }
        .adv-table thead th { background:#f1f5f9; color:#475569; font-weight:700; font-size:11px; text-align:left; padding:11px 12px; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:.05em; white-space:nowrap; }
        .adv-table thead th.num { text-align:right; }
        .adv-row td { padding:12px; font-size:13px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .adv-row:last-child td { border-bottom:none; }
        .adv-row:hover td { background:#f8faff; }
        .adv-date { color:#64748b; font-size:12.5px; white-space:nowrap; }
        .num { text-align:right; }
        .adv-refund-btn { height:30px; padding:0 12px; border-radius:7px; border:1.5px solid #b45309; background:#fff; color:#b45309; font-size:12px; font-weight:700; cursor:pointer; }
        .adv-refund-btn:hover { background:#b45309; color:#fff; }
        .adv-extend-btn { height:30px; padding:0 12px; border-radius:7px; border:1.5px solid #334b71; background:#fff; color:#334b71; font-size:12px; font-weight:700; cursor:pointer; }
        .adv-extend-btn:hover { background:#334b71; color:#fff; }
        .adv-forfeit-btn { height:30px; padding:0 12px; border-radius:7px; border:1.5px solid #64748b; background:#fff; color:#64748b; font-size:12px; font-weight:700; cursor:pointer; }
        .adv-forfeit-btn:hover { background:#475569; color:#fff; }
        .adv-forfeit-btn:disabled { opacity:.5; cursor:not-allowed; }
        .adv-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; background:#fff; border-radius:14px; border:1px solid #e2e8f0; }
        .adv-loading { display:flex; align-items:center; gap:10px; padding:30px 0; color:#64748b; font-size:13px; }
        .adv-spinner { width:18px; height:18px; border-radius:50%; border:2.5px solid #e2e8f0; border-top-color:#334b71; animation:adv-spin .8s linear infinite; }
        @keyframes adv-spin { to { transform:rotate(360deg); } }
        .adv-error { padding:14px 18px; background:#fdf3f3; border:1px solid #f0c4c0; border-radius:10px; color:#b91c1c; font-size:13px; }
        .adv-pending { background:#fffbeb; border:1px solid #fcd9a8; border-radius:14px; padding:16px 18px; margin-bottom:18px; }
        .adv-pending-head { font-size:13px; font-weight:800; color:#b45309; text-transform:uppercase; letter-spacing:.05em; margin-bottom:10px; }
        .adv-pending-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 0; border-top:1px solid #fce7c8; }
        .adv-pending-row:first-of-type { border-top:none; }
        .adv-approve-btn { height:32px; padding:0 14px; border-radius:7px; border:none; background:#2e7d5e; color:#fff; font-size:12.5px; font-weight:700; cursor:pointer; }
        .adv-reject-btn { height:32px; padding:0 14px; border-radius:7px; border:1.5px solid #b91c1c; background:#fff; color:#b91c1c; font-size:12.5px; font-weight:700; cursor:pointer; }
        .adv-approve-btn:disabled, .adv-reject-btn:disabled { opacity:.5; cursor:not-allowed; }
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
        .adv-modal { width:460px; max-width:92vw; background:#fff; border-radius:14px; box-shadow:0 24px 60px rgba(15,23,42,.3); overflow:hidden; }
        .adv-modal-head { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:#334b71; color:#fff; font-weight:700; font-size:15px; }
        .adv-modal-x { background:none; border:none; color:#fff; font-size:22px; line-height:1; cursor:pointer; }
        .adv-modal-body { padding:20px; max-height:70vh; overflow:auto; }
        .adv-modal-meta { display:flex; gap:18px; flex-wrap:wrap; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; margin-bottom:16px; }
        .adv-modal-meta div { display:flex; flex-direction:column; gap:2px; }
        .adv-modal-meta span { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#94a3b8; }
        .adv-modal-meta strong { font-size:13.5px; color:#334b71; }
        .adv-field-label { display:block; font-size:12px; font-weight:700; color:#475569; margin:12px 0 6px; }
        .adv-input { width:100%; box-sizing:border-box; border:1.5px solid #cbd5e1; border-radius:8px; padding:9px 12px; font-size:13.5px; font-family:inherit; color:#0f172a; background:#fff; }
        .adv-input:focus { outline:none; border-color:#334b71; }
        .adv-vat-preview { margin-top:8px; padding:8px 12px; background:#eef4ff; border:1px solid #dce6f0; border-radius:8px; font-size:12.5px; color:#334b71; }
        .adv-approval-note { margin-top:12px; padding:10px 12px; background:#fffbeb; border:1px solid #fcd9a8; border-radius:8px; color:#b45309; font-size:12.5px; }
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