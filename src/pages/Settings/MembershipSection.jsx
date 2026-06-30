import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

/**
 * MembershipSection
 * Renders inside Legal Entity → Setup tab, below the toggle card.
 * Self-contained: it talks to /api/Membership (its own lifecycle: create /
 * update / deactivate + post-transaction locking), independent of SaveSetup.
 *
 * Props:
 *   legalEntityCode: string  (the parent's existing.leCode; backend falls back
 *                             to the JWT centerCode if blank)
 */
const MembershipSection = ({ legalEntityCode = "", currency = "SAR" }) => {
  const [form, setForm] = useState({
    activate:     false,
    programName:  "",
    price:        "",
    vatPercent:   "0",
    neverExpires: true,
    validityDays: "",
  });
  const [locked,  setLocked]  = useState(false); // has transactions
  const [exists,  setExists]  = useState(false); // an active program already exists
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);  // { type:'ok'|'err', text }
  const [showDeactivate, setShowDeactivate] = useState(false);

  const qs = legalEntityCode ? `?legalEntityCode=${encodeURIComponent(legalEntityCode)}` : "";

  const load = useCallback(async () => {
    setLoading(true); setMsg(null);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/Membership/Program${qs}`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      const d    = json.data || json;
      setExists(!!d.exists);
      setLocked(!!d.locked);
      setForm({
        activate:     !!d.activate,
        programName:  d.programName || "",
        price:        d.price != null ? String(d.price) : "",
        vatPercent:   d.vatPercent != null ? String(d.vatPercent) : "0",
        neverExpires: d.neverExpires !== undefined ? !!d.neverExpires : true,
        validityDays: d.validityDays != null ? String(d.validityDays) : "",
      });
    } catch {
      setMsg({ type: "err", text: "Failed to load membership setup." });
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Flipping Off on an existing active program needs confirmation.
  const onToggle = (next) => {
    if (!next && exists && form.activate) { setShowDeactivate(true); return; }
    set("activate", next);
    setMsg(null);
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Membership/Program/Save`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({
          legalEntityCode,
          activate:     form.activate,
          programName:  form.programName,
          price:        form.price,
          vatPercent:   form.vatPercent,
          neverExpires: form.neverExpires,
          validityDays: form.neverExpires ? null : form.validityDays,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setMsg({ type: "err", text: json.message || "Save failed." }); return; }
      setMsg({ type: "ok", text: json.message || "Saved." });
      await load();
    } catch {
      setMsg({ type: "err", text: "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Membership/Program/Deactivate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({ legalEntityCode }),
      });
      const json = await res.json();
      setShowDeactivate(false);
      if (!res.ok) { setMsg({ type: "err", text: json.message || "Deactivation failed." }); return; }
      setMsg({ type: "ok", text: json.message || "Program deactivated." });
      await load();
    } catch {
      setShowDeactivate(false);
      setMsg({ type: "err", text: "Deactivation failed." });
    } finally {
      setSaving(false);
    }
  };

  const fieldsDisabled = !form.activate;          // gated by the toggle
  const lockedNonPrice = form.activate && locked; // only price editable

  return (
    <div className="ms-card">
      <div className="ms-head">
        <h3 className="ms-title">Membership</h3>
        <p className="ms-sub">Configure the single membership program for this legal entity.</p>
      </div>

      {loading ? (
        <div className="ms-loading"><span className="ms-spinner" /> Loading membership setup…</div>
      ) : (
        <>
          {msg && <div className={`ms-banner ${msg.type === "ok" ? "ok" : "err"}`}>{msg.text}</div>}

          {lockedNonPrice && (
            <div className="ms-banner warn">
              This program has transactions against it, so its details are locked. You can change the
              <strong> price</strong> only. To change anything else, deactivate it and create a new program.
            </div>
          )}

          {/* Activate toggle — matches the Setup tab switch styling */}
          <div className="ms-row">
            <div>
              <div className="ms-row-label">Activate Membership Program</div>
              <div className="ms-row-sub">Enables the membership program for this legal entity. Fields below unlock when On.</div>
            </div>
            <div className="ms-toggle-group">
              <button type="button" className={`ms-toggle ${form.activate ? "on" : ""}`} onClick={() => onToggle(true)}>Yes</button>
              <button type="button" className={`ms-toggle ${!form.activate ? "off" : ""}`} onClick={() => onToggle(false)}>No</button>
            </div>
          </div>

          {/* Program fields */}
          <div className={`ms-fields ${fieldsDisabled ? "is-disabled" : ""}`}>
            <div className="ms-field">
              <label>Name of Membership Program</label>
              <input type="text" value={form.programName} disabled={fieldsDisabled || lockedNonPrice}
                placeholder="e.g. Glow Membership Program" onChange={(e) => set("programName", e.target.value)} />
            </div>

            <div className="ms-grid2">
              <div className="ms-field">
                <label>Price for Membership ({currency})</label>
                <div className="ms-money">
                  <span className="ms-cur">{currency}</span>
                  <input type="number" min="0" step="0.01" value={form.price} disabled={fieldsDisabled}
                    placeholder="1000" onChange={(e) => set("price", e.target.value)} />
                </div>
                <div className="ms-hint">Currency follows the legal entity ({currency}).</div>
              </div>
              <div className="ms-field">
                <label>Tax / VAT % on Membership</label>
                <input type="number" min="0" max="100" step="0.01" value={form.vatPercent}
                  disabled={fieldsDisabled || lockedNonPrice} placeholder="0"
                  onChange={(e) => set("vatPercent", e.target.value)} />
              </div>
            </div>

            <div className="ms-field">
              <label>Validity of Membership</label>
              <div className="ms-validity">
                <label className="ms-check">
                  <input type="checkbox" checked={form.neverExpires} disabled={fieldsDisabled || lockedNonPrice}
                    onChange={(e) => set("neverExpires", e.target.checked)} />
                  Never Expires
                </label>
                <input type="number" min="1" step="1" value={form.validityDays}
                  disabled={fieldsDisabled || lockedNonPrice || form.neverExpires}
                  placeholder="365" onChange={(e) => set("validityDays", e.target.value)} />
                <span className="ms-unit">days</span>
              </div>
            </div>
          </div>

          <div className="ms-actions">
            <button className="ms-save" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Membership"}
            </button>
          </div>
        </>
      )}

      {/* Deactivation confirmation pop-up (FRD 3.3) */}
      {showDeactivate && (
        <div className="ms-modal-overlay" onClick={() => setShowDeactivate(false)}>
          <div className="ms-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Deactivate membership program?</h3>
            <p>
              Deactivating this program will <strong>nullify all pricing benefits</strong> that customers
              are currently receiving as members. Member prices and member discounts will no longer apply
              to any new invoice. This cannot be undone — you would need to create a new program.
            </p>
            <div className="ms-modal-actions">
              <button className="ms-btn-ghost" onClick={() => setShowDeactivate(false)} disabled={saving}>Cancel</button>
              <button className="ms-btn-danger" onClick={confirmDeactivate} disabled={saving}>
                {saving ? "Deactivating…" : "Yes, deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ms-card { font-family:'Segoe UI',system-ui,sans-serif; background:#fff; border:1px solid #e7ecf4; border-radius:14px; padding:22px 24px; margin-top:16px; color:#0f172a; box-shadow:0 2px 10px rgba(15,23,42,.04); }
        .ms-head { margin-bottom:14px; }
        .ms-title { margin:0 0 4px; font-size:17px; font-weight:800; color:#1e293b; }
        .ms-sub { margin:0; font-size:13px; color:#64748b; }
        .ms-loading { display:flex; align-items:center; gap:10px; padding:20px 0; color:#64748b; font-size:13px; }
        .ms-spinner { width:18px; height:18px; border-radius:50%; border:2.5px solid #e2e8f0; border-top-color:#334B71; animation:ms-spin .8s linear infinite; }
        @keyframes ms-spin { to { transform:rotate(360deg); } }
        .ms-banner { padding:11px 16px; border-radius:10px; font-size:13px; margin-bottom:14px; }
        .ms-banner.ok   { background:#e6f4ef; border:1px solid #b3d9cc; color:#2e7d5e; }
        .ms-banner.err  { background:#fdf3f3; border:1px solid #f0c4c0; color:#b91c1c; }
        .ms-banner.warn { background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; }
        .ms-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid #eef2f7; gap:20px; }
        .ms-row-label { font-size:14px; font-weight:700; color:#334155; }
        .ms-row-sub { font-size:12.5px; color:#64748b; margin-top:3px; }
        .ms-toggle-group { display:inline-flex; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; flex-shrink:0; }
        .ms-toggle { padding:8px 22px; font-size:13px; font-weight:600; background:#fff; border:none; cursor:pointer; color:#64748b; }
        .ms-toggle.on  { background:#334B71; color:#fff; }
        .ms-toggle.off { background:#64748b; color:#fff; }
        .ms-fields { margin-top:16px; transition:opacity .15s; }
        .ms-fields.is-disabled { opacity:.5; pointer-events:none; }
        .ms-field { margin-bottom:16px; }
        .ms-field > label { display:block; font-size:12.5px; font-weight:600; color:#475569; margin-bottom:6px; }
        .ms-field input[type=text], .ms-field input[type=number] { width:100%; padding:9px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; box-sizing:border-box; }
        .ms-field input:disabled { background:#f8fafc; color:#94a3b8; }
        .ms-money { display:flex; align-items:stretch; border:1px solid #d1d5db; border-radius:8px; overflow:hidden; }
        .ms-money .ms-cur { display:inline-flex; align-items:center; padding:0 12px; background:#f1f5f9; color:#475569; font-size:13px; font-weight:700; border-right:1px solid #d1d5db; }
        .ms-money input { border:none; border-radius:0; flex:1; padding:9px 12px; font-size:14px; box-sizing:border-box; }
        .ms-money input:disabled { background:#f8fafc; color:#94a3b8; }
        .ms-hint { font-size:11.5px; color:#94a3b8; margin-top:5px; }
        .ms-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .ms-validity { display:flex; align-items:center; gap:12px; }
        .ms-validity input[type=number] { width:120px; }
        .ms-check { display:inline-flex; align-items:center; gap:7px; font-size:13.5px; color:#334155; font-weight:500; white-space:nowrap; }
        .ms-unit { font-size:13px; color:#94a3b8; }
        .ms-actions { margin-top:18px; display:flex; justify-content:flex-end; }
        .ms-save { padding:10px 22px; background:#334B71; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; }
        .ms-save:hover:not(:disabled) { background:#22314f; }
        .ms-save:disabled { opacity:.6; cursor:not-allowed; }
        .ms-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.55); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .ms-modal { background:#fff; border-radius:14px; padding:26px 28px; max-width:440px; box-shadow:0 20px 60px rgba(15,23,42,.3); }
        .ms-modal h3 { margin:0 0 12px; font-size:18px; font-weight:800; color:#b91c1c; }
        .ms-modal p { margin:0 0 22px; font-size:13.5px; line-height:1.55; color:#475569; }
        .ms-modal-actions { display:flex; justify-content:flex-end; gap:10px; }
        .ms-btn-ghost  { padding:9px 18px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; font-size:13.5px; font-weight:600; color:#475569; cursor:pointer; }
        .ms-btn-danger { padding:9px 18px; background:#dc2626; border:none; border-radius:8px; font-size:13.5px; font-weight:600; color:#fff; cursor:pointer; }
        .ms-btn-danger:disabled, .ms-btn-ghost:disabled { opacity:.6; cursor:not-allowed; }
      `}</style>
    </div>
  );
};

export default MembershipSection;