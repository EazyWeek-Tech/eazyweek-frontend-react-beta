// src/pages/Opportunity/AssignmentModal.jsx
// ─── Assign / Reassign flow for a campaign's leads (all campaign types) ───────
// Modes:
//   Assign (Based on availability)  → AVAILABILITY, ASSIGN    (round-robin across available agents)
//   Assign (Auto Distribution)      → AUTO,         ASSIGN    (equal split across selected agents)
//   Assign (Manual Allocation)      → manual two-panel        (next update)
//   Reassign (Auto Redistribution)  → AUTO,         REASSIGN
//   Reassign (Manual)               → manual two-panel        (next update)
// Manual-Lead campaigns are reassign-only (creator is always the owner), so the
// two Assign modes are hidden for them.
//
// Pipeline: pick mode → pick agents + rules → Start Assignment (stages to the
// session, nothing live changes) → Review (delete rows) → Confirm & Assign
// (writes SalesOwner + audit) or Cancel (drops the session).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  ...(TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}),
});

const api = async (path, opts = {}) => {
  const res  = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders(), ...opts });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false)
    throw new Error(json.message || `Request failed (${res.status}).`);
  return json;
};

const MODES = [
  { id: "ASSIGN_AVAIL",   label: "Assign (Based on availability)", type: "AVAILABILITY", mode: "ASSIGN",   group: "assign",   flow: "auto"   },
  { id: "ASSIGN_AUTO",    label: "Assign (Auto Distribution)",     type: "AUTO",         mode: "ASSIGN",   group: "assign",   flow: "auto"   },
  { id: "ASSIGN_MANUAL",  label: "Assign (Manual Allocation)",     type: "MANUAL_ALLOC", mode: "ASSIGN",   group: "assign",   flow: "manual" },
  { id: "REASSIGN_AUTO",  label: "Reassign (Auto Redistribution)", type: "AUTO",         mode: "REASSIGN", group: "reassign", flow: "auto"   },
  { id: "REASSIGN_MANUAL",label: "Reassign (Manual)",              type: "MANUAL_ALLOC", mode: "REASSIGN", group: "reassign", flow: "manual" },
];

const PRESENCE_META = {
  available: { label: "Available", cls: "am-badge-ok"   },
  busy:      { label: "Busy",      cls: "am-badge-busy" },
  away:      { label: "Away",      cls: "am-badge-away" },
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function AssignmentModal({ open, onClose, oppCode, kind, centerCode = "", onConfirmed }) {
  const [step, setStep]       = useState("mode");   // mode | auto | manual | review | done
  const [modeId, setModeId]   = useState("");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");

  // agent selection
  const [role, setRole]       = useState("");
  const [clinic, setClinic]   = useState(centerCode || "");
  const [seed]                = useState(() => Math.floor(Math.random() * 1e6)); // stable presence per open
  const [agents, setAgents]   = useState([]);
  const [selected, setSelected] = useState(() => new Set());

  // rules
  const [useDateFilter, setUseDateFilter]   = useState(false);
  const [fromDate, setFromDate]             = useState("");
  const [toDate, setToDate]                 = useState("");
  const [useRecordLimit, setUseRecordLimit] = useState(false);
  const [numberOfRecords, setNumberOfRecords] = useState("");
  const [recordSequence, setRecordSequence] = useState("FIFO");

  // session / review
  const [sessionId, setSessionId] = useState("");
  const [summary, setSummary]     = useState("");
  const [review, setReview]       = useState({ session: null, rows: [] });
  const [doneMsg, setDoneMsg]     = useState("");

  // manual two-panel
  const [mLeads, setMLeads]       = useState([]);
  const [mOwners, setMOwners]     = useState([]);
  const [mSelLeads, setMSelLeads] = useState(() => new Set());
  const [mOwner, setMOwner]       = useState("");
  const [stagedTotal, setStagedTotal] = useState(0);

  const modeMeta     = MODES.find((m) => m.id === modeId) || null;
  const availability = modeMeta?.type === "AVAILABILITY";
  const visibleModes = kind === "manual" ? MODES.filter((m) => m.group === "reassign") : MODES;

  const resetAll = useCallback(() => {
    setStep("mode"); setModeId(""); setErr(""); setBusy(false);
    setRole(""); setClinic(centerCode || ""); setAgents([]); setSelected(new Set());
    setUseDateFilter(false); setFromDate(""); setToDate("");
    setUseRecordLimit(false); setNumberOfRecords(""); setRecordSequence("FIFO");
    setSessionId(""); setSummary(""); setReview({ session: null, rows: [] }); setDoneMsg("");
    setMLeads([]); setMOwners([]); setMSelLeads(new Set()); setMOwner(""); setStagedTotal(0);
  }, [centerCode]);

  useEffect(() => { if (open) setClinic(centerCode || ""); }, [open, centerCode]);

  const loadAgents = useCallback(async (avail) => {
    setBusy(true); setErr("");
    try {
      const qs = new URLSearchParams({ role: role || "", centerCode: clinic || "" });
      if (avail) qs.set("seed", String(seed));
      const json = await api(`/api/Opportunity/Assignment/Employees?${qs.toString()}`);
      const list = json.data || [];
      setAgents(list);
      setSelected(avail
        ? new Set(list.filter((a) => a.presence === "available").map((a) => a.employeeCode))
        : new Set());
    } catch (e) { setErr(e.message); setAgents([]); }
    finally { setBusy(false); }
  }, [role, clinic, seed]);

  const pickMode = (m) => {
    setModeId(m.id); setErr("");
    if (m.flow === "manual") { setStep("manual"); loadManual(m.mode); return; }
    setStep("auto");
    loadAgents(m.type === "AVAILABILITY");
  };

  const toggle = (code) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };
  const selectableCodes = () =>
    (availability ? agents.filter((a) => a.presence === "available") : agents).map((a) => a.employeeCode);
  const allSelected = () => {
    const s = selectableCodes();
    return s.length > 0 && s.every((c) => selected.has(c));
  };
  const toggleAll = () => {
    const s = selectableCodes();
    setSelected(allSelected() ? new Set() : new Set(s));
  };

  const loadReview = useCallback(async (sid) => {
    const json = await api(`/api/Opportunity/Assignment/Review/${sid}`);
    setReview(json.data || { session: null, rows: [] });
  }, []);

  const loadManual = useCallback(async (mode) => {
    const amode = mode || modeMeta?.mode || "REASSIGN";
    setBusy(true); setErr("");
    try {
      const [le, ow] = await Promise.all([
        api(`/api/Opportunity/Assignment/EligibleLeads`, { method: "POST", body: JSON.stringify({ oppCode, assignmentMode: amode }) }),
        api(`/api/Opportunity/Assignment/Employees?${new URLSearchParams({ role: role || "", centerCode: clinic || "" }).toString()}`),
      ]);
      setMLeads(le.data?.leads || []);
      setMOwners(ow.data || []);
      setMSelLeads(new Set());
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }, [oppCode, role, clinic, modeMeta]);

  const toggleLead = (rid) => {
    setMSelLeads((prev) => { const n = new Set(prev); n.has(rid) ? n.delete(rid) : n.add(rid); return n; });
  };
  const allLeadsSelected = () => mLeads.length > 0 && mLeads.every((l) => mSelLeads.has(l.opportunityRecid));
  const toggleAllLeads = () =>
    setMSelLeads(allLeadsSelected() ? new Set() : new Set(mLeads.map((l) => l.opportunityRecid)));

  const reloadEligible = async (amode) => {
    const le = await api(`/api/Opportunity/Assignment/EligibleLeads`, { method: "POST", body: JSON.stringify({ oppCode, assignmentMode: amode }) });
    setMLeads(le.data?.leads || []);
  };

  const addManual = async () => {
    if (!mOwner) { setErr("Select a sales owner."); return; }
    if (!mSelLeads.size) { setErr("Select at least one lead."); return; }
    setBusy(true); setErr("");
    try {
      const json = await api(`/api/Opportunity/Assignment/ManualStage`, {
        method: "POST",
        body: JSON.stringify({
          oppCode, assignmentMode: modeMeta.mode, sessionId: sessionId || null,
          pendingOwner: mOwner, opportunityRecids: [...mSelLeads],
        }),
      });
      const d = json.data || {};
      setSessionId(d.sessionId || sessionId);
      setStagedTotal(d.stagedTotal ?? stagedTotal);
      setMSelLeads(new Set());
      await reloadEligible(modeMeta.mode);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const startAssignment = async () => {
    const codes = [...selected];
    if (!codes.length) {
      setErr(availability ? "No available agents selected." : "Select at least one agent.");
      return;
    }
    if (useDateFilter && (!fromDate || !toDate)) { setErr("Pick both From and To dates, or turn the date filter off."); return; }
    if (useRecordLimit && !(Number(numberOfRecords) > 0)) { setErr("Enter how many records to assign, or turn the limit off."); return; }
    setBusy(true); setErr("");
    try {
      const body = {
        oppCode,
        assignmentType: availability ? "AVAILABILITY" : "AUTO",
        assignmentMode: modeMeta.mode,
        employeeCodes:  codes,
        availableCodes: availability ? codes : [],
        useDateFilter, fromDate, toDate,
        useRecordLimit, numberOfRecords: Number(numberOfRecords) || 0, recordSequence,
      };
      const json = await api(`/api/Opportunity/Assignment/AutoStage`, { method: "POST", body: JSON.stringify(body) });
      const d = json.data || {};
      setSessionId(d.sessionId); setSummary(d.summary || "");
      await loadReview(d.sessionId);
      setStep("review");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const deleteRow = async (stageRecid) => {
    setBusy(true); setErr("");
    try {
      await api(`/api/Opportunity/Assignment/StageRow/${stageRecid}?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
      await loadReview(sessionId);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const confirmAssign = async () => {
    setBusy(true); setErr("");
    try {
      const json = await api(`/api/Opportunity/Assignment/Confirm/${sessionId}`, { method: "POST" });
      setDoneMsg(json.message || "Assignment confirmed.");
      setStep("done");
      onConfirmed && onConfirmed();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const cancelSession = async () => {
    if (sessionId) { try { await api(`/api/Opportunity/Assignment/Cancel/${sessionId}`, { method: "POST" }); } catch (_) {} }
    resetAll(); onClose && onClose();
  };

  const closeModal = () => {
    if ((step === "review" || step === "manual") && sessionId) { cancelSession(); return; }
    resetAll(); onClose && onClose();
  };

  if (!open) return null;

  const wide = step === "auto" || step === "manual" || step === "review";

  return (
    <div className="am-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className={`am-card ${wide ? "am-card-wide" : ""}`} role="dialog" aria-modal="true">
        <div className="am-head">
          <div className="am-title">
            {step === "mode"    && "Assign Opportunity"}
            {step === "auto"    && (modeMeta?.label || "Assign")}
            {step === "manual"  && (modeMeta?.label || "Assign")}
            {step === "review"  && "Review & Confirm"}
            {step === "done"    && "Assignment complete"}
          </div>
          <button className="am-x" onClick={closeModal} aria-label="Close">✕</button>
        </div>

        {err && <div className="am-err">{err}</div>}

        {/* ── STEP: mode picker ─────────────────────────────────────────── */}
        {step === "mode" && (
          <div className="am-body">
            <div className="am-sub">Choose what you want to do.</div>
            <div className="am-modes">
              {visibleModes.map((m, i) => {
                const prevGroup = visibleModes[i - 1]?.group;
                const divide = prevGroup && prevGroup !== m.group;
                return (
                  <React.Fragment key={m.id}>
                    {divide && <div className="am-divider" />}
                    <button className="am-mode" onClick={() => pickMode(m)}>{m.label}</button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP: auto agent selection ────────────────────────────────── */}
        {step === "auto" && (
          <div className="am-body">
            <div className="am-filters">
              <label className="am-field">
                <span>Employee Role</span>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="All roles" />
              </label>
              <label className="am-field">
                <span>Clinic</span>
                <input value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Centre code" />
              </label>
              <button className="am-btn-sec" disabled={busy} onClick={() => loadAgents(availability)}>
                {busy ? "Loading…" : "Reload agents"}
              </button>
            </div>

            <div className="am-tablewrap">
              <table className="am-table">
                <thead>
                  <tr>
                    <th className="am-cbcol">
                      <input type="checkbox" checked={allSelected()} onChange={toggleAll} />
                    </th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Shift</th>
                    {availability && <th>Presence</th>}
                  </tr>
                </thead>
                <tbody>
                  {agents.length === 0 && (
                    <tr><td colSpan={availability ? 5 : 4} className="am-empty">No agents found for this role / clinic.</td></tr>
                  )}
                  {agents.map((a) => {
                    const selectable = !availability || a.presence === "available";
                    const pm = PRESENCE_META[a.presence] || PRESENCE_META.away;
                    return (
                      <tr key={a.employeeCode} className={!selectable ? "am-row-off" : ""}>
                        <td className="am-cbcol">
                          <input type="checkbox" disabled={!selectable}
                            checked={selected.has(a.employeeCode)}
                            onChange={() => toggle(a.employeeCode)} />
                        </td>
                        <td>{a.employeeCode}</td>
                        <td>{a.employeeName}</td>
                        <td>{a.shift || "—"}</td>
                        {availability && <td><span className={`am-badge ${pm.cls}`}>{pm.label}</span></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="am-rules">
              <div className="am-rule">
                <label className="am-check">
                  <input type="checkbox" checked={useDateFilter} onChange={(e) => setUseDateFilter(e.target.checked)} />
                  <span>Filter by created date</span>
                </label>
                {useDateFilter && (
                  <div className="am-inline">
                    <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
                    <span className="am-to">to</span>
                    <input type="date" value={toDate} min={fromDate || undefined} max={todayISO()} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="am-rule">
                <label className="am-check">
                  <input type="checkbox" checked={useRecordLimit} onChange={(e) => setUseRecordLimit(e.target.checked)} />
                  <span>Limit number of records</span>
                </label>
                {useRecordLimit && (
                  <div className="am-inline">
                    <input type="number" min="1" placeholder="Count" value={numberOfRecords}
                      onChange={(e) => setNumberOfRecords(e.target.value)} style={{ width: 100 }} />
                    <select value={recordSequence} onChange={(e) => setRecordSequence(e.target.value)}>
                      <option value="FIFO">FIFO (oldest first)</option>
                      <option value="LIFO">LIFO (newest first)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="am-foot">
              <span className="am-count">{selected.size} agent{selected.size === 1 ? "" : "s"} selected</span>
              <div className="am-foot-btns">
                <button className="am-btn-sec" onClick={() => setStep("mode")}>Back</button>
                <button className="am-btn-pri" disabled={busy} onClick={startAssignment}>
                  {busy ? "Working…" : "Start Assignment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: manual two-panel ────────────────────────────────────── */}
        {step === "manual" && (
          <div className="am-body">
            <div className="am-filters">
              <label className="am-field">
                <span>Employee Role</span>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="All roles" />
              </label>
              <label className="am-field">
                <span>Clinic</span>
                <input value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Centre code" />
              </label>
              <button className="am-btn-sec" disabled={busy} onClick={() => loadManual(modeMeta?.mode)}>
                {busy ? "Loading…" : "Reload"}
              </button>
            </div>

            <div className="am-two">
              <div className="am-panel">
                <div className="am-panel-h">Eligible Leads <span className="am-muted">({mLeads.length})</span></div>
                <div className="am-tablewrap">
                  <table className="am-table">
                    <thead>
                      <tr>
                        <th className="am-cbcol"><input type="checkbox" checked={allLeadsSelected()} onChange={toggleAllLeads} /></th>
                        <th>Lead ID</th><th>Customer</th><th>Created</th><th>Disposition</th><th>Current Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mLeads.length === 0 && <tr><td colSpan={6} className="am-empty">No eligible leads.</td></tr>}
                      {mLeads.map((l) => (
                        <tr key={l.opportunityRecid} className={mSelLeads.has(l.opportunityRecid) ? "am-row-sel" : ""}>
                          <td className="am-cbcol"><input type="checkbox" checked={mSelLeads.has(l.opportunityRecid)} onChange={() => toggleLead(l.opportunityRecid)} /></td>
                          <td>{l.opportunityRecid}</td>
                          <td>{l.custName || "—"}</td>
                          <td>{(l.createdDate || "").slice(0, 10) || "—"}</td>
                          <td>{l.disposition || "—"}</td>
                          <td>{l.salesOwner || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="am-panel am-panel-narrow">
                <div className="am-panel-h">Sales Owner</div>
                <div className="am-tablewrap">
                  <table className="am-table">
                    <thead><tr><th className="am-cbcol"></th><th>Name</th><th>Shift</th></tr></thead>
                    <tbody>
                      {mOwners.length === 0 && <tr><td colSpan={3} className="am-empty">No owners.</td></tr>}
                      {mOwners.map((o) => (
                        <tr key={o.employeeCode} className={mOwner === o.employeeCode ? "am-row-sel" : ""}>
                          <td className="am-cbcol"><input type="radio" name="am-owner" checked={mOwner === o.employeeCode} onChange={() => setMOwner(o.employeeCode)} /></td>
                          <td>{o.employeeName}</td>
                          <td>{o.shift || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="am-addbar">
              <button className="am-btn-pri" disabled={busy || !mOwner || mSelLeads.size === 0} onClick={addManual}>
                {busy ? "Adding…" : "Add to assignment"}
              </button>
              {stagedTotal > 0 && <span className="am-count">{stagedTotal} staged so far</span>}
            </div>

            <div className="am-foot">
              <span />
              <div className="am-foot-btns">
                <button className="am-btn-sec" disabled={busy} onClick={() => (sessionId ? cancelSession() : setStep("mode"))}>
                  {sessionId ? "Cancel" : "Back"}
                </button>
                <button className="am-btn-pri" disabled={busy || stagedTotal === 0}
                  onClick={async () => { await loadReview(sessionId); setStep("review"); }}>
                  Review &amp; Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: review ──────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="am-body">
            {summary && <div className="am-summary">{summary}</div>}
            <div className="am-tablewrap">
              <table className="am-table">
                <thead>
                  <tr>
                    <th>Sales Owner</th>
                    <th>Lead ID</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th className="am-actcol">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {review.rows.length === 0 && (
                    <tr><td colSpan={5} className="am-empty">No staged rows. Nothing to confirm.</td></tr>
                  )}
                  {review.rows.map((r) => (
                    <tr key={r.stageRecid}>
                      <td>{r.pendingOwnerName || r.pendingOwner}</td>
                      <td>{r.opportunityRecid}</td>
                      <td>{r.custName || "—"}</td>
                      <td>{r.custMobileNo || "—"}</td>
                      <td className="am-actcol">
                        <button className="am-del" disabled={busy} onClick={() => deleteRow(r.stageRecid)} title="Remove from this assignment">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="am-foot">
              <span className="am-count">{review.rows.length} lead{review.rows.length === 1 ? "" : "s"} staged</span>
              <div className="am-foot-btns">
                <button className="am-btn-sec" disabled={busy} onClick={cancelSession}>Cancel</button>
                <button className="am-btn-pri" disabled={busy || review.rows.length === 0} onClick={confirmAssign}>
                  {busy ? "Confirming…" : "Confirm & Assign"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: done ────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="am-body">
            <div className="am-done">
              <div className="am-done-ok">✓</div>
              <div>{doneMsg}</div>
            </div>
            <div className="am-foot">
              <span />
              <div className="am-foot-btns">
                <button className="am-btn-pri" onClick={() => { resetAll(); onClose && onClose(); }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .am-overlay { position:fixed; inset:0; background:rgba(15,23,42,.45); display:flex;
          align-items:flex-start; justify-content:center; padding:48px 16px; z-index:1000; overflow:auto; }
        .am-card { background:#fff; width:100%; max-width:560px; border-radius:14px;
          box-shadow:0 20px 60px rgba(2,6,23,.3); overflow:hidden; }
        .am-card-wide { max-width:900px; }
        .am-head { display:flex; align-items:center; justify-content:space-between;
          padding:18px 22px; border-bottom:1px solid #eef2f7; }
        .am-title { font-size:18px; font-weight:700; color:#0f2544; }
        .am-x { border:none; background:transparent; font-size:16px; color:#64748b; cursor:pointer; padding:6px; border-radius:8px; }
        .am-x:hover { background:#f1f5f9; color:#0f172a; }
        .am-body { padding:18px 22px 22px; }
        .am-sub { color:#64748b; font-size:14px; background:#f8fafc; border:1px solid #eef2f7;
          border-radius:10px; padding:12px 14px; margin-bottom:14px; }
        .am-err { margin:14px 22px 0; background:#fef2f2; border:1px solid #fecaca; color:#991b1b;
          border-radius:10px; padding:10px 14px; font-size:13px; }

        .am-modes { display:flex; flex-direction:column; gap:8px; }
        .am-mode { text-align:left; border:1px solid #e6ebf2; background:#fff; border-radius:10px;
          padding:16px 18px; font-size:15px; font-weight:700; color:#0f2544; cursor:pointer; transition:.12s; }
        .am-mode:hover { background:#f4f7fb; border-color:#c9d6e8; }
        .am-divider { height:1px; background:#eef2f7; margin:6px 0; }

        .am-filters { display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap; margin-bottom:14px; }
        .am-field { display:flex; flex-direction:column; gap:5px; font-size:12px; color:#475569; }
        .am-field span { font-weight:600; }
        .am-field input { border:1px solid #d7dfea; border-radius:8px; padding:8px 10px; font-size:14px; min-width:180px; }

        .am-tablewrap { border:1px solid #eef2f7; border-radius:10px; overflow:auto; max-height:320px; }
        .am-table { width:100%; border-collapse:collapse; font-size:13px; }
        .am-table thead th { position:sticky; top:0; background:#f8fafc; text-align:left;
          padding:10px 12px; color:#475569; font-weight:700; border-bottom:1px solid #eef2f7; white-space:nowrap; }
        .am-table tbody td { padding:9px 12px; border-bottom:1px solid #f1f5f9; color:#0f172a; }
        .am-table tbody tr:last-child td { border-bottom:none; }
        .am-cbcol { width:44px; text-align:center; }
        .am-actcol { width:70px; text-align:center; }
        .am-row-off { color:#94a3b8; background:#fcfdfe; }
        .am-empty { text-align:center; color:#94a3b8; padding:20px; }

        .am-badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; }
        .am-badge-ok   { background:#dcfce7; color:#166534; }
        .am-badge-busy { background:#fee2e2; color:#991b1b; }
        .am-badge-away { background:#f1f5f9; color:#64748b; }

        .am-rules { display:flex; gap:26px; flex-wrap:wrap; margin-top:16px; }
        .am-rule { display:flex; flex-direction:column; gap:8px; }
        .am-check { display:flex; align-items:center; gap:8px; font-size:14px; color:#0f172a; font-weight:600; }
        .am-inline { display:flex; align-items:center; gap:8px; }
        .am-inline input, .am-inline select { border:1px solid #d7dfea; border-radius:8px; padding:7px 9px; font-size:13px; }
        .am-to { color:#64748b; font-size:13px; }

        .am-foot { display:flex; align-items:center; justify-content:space-between; margin-top:20px; }
        .am-foot-btns { display:flex; gap:10px; }
        .am-count { font-size:13px; color:#64748b; }
        .am-btn-pri { background:#0f2544; color:#fff; border:none; border-radius:9px; padding:10px 18px; font-size:14px; font-weight:600; cursor:pointer; }
        .am-btn-pri:disabled { opacity:.6; cursor:default; }
        .am-btn-sec { background:#fff; color:#0f2544; border:1px solid #cbd5e1; border-radius:9px; padding:10px 16px; font-size:14px; font-weight:600; cursor:pointer; }

        .am-summary { background:#ecfdf5; border:1px solid #bbf7d0; color:#166534; border-radius:10px; padding:11px 14px; font-size:14px; margin-bottom:14px; font-weight:600; }
        .am-del { border:1px solid #fecaca; background:#fff5f5; color:#b91c1c; border-radius:7px; width:28px; height:28px; cursor:pointer; }
        .am-del:disabled { opacity:.5; cursor:default; }

        .am-two { display:flex; gap:14px; align-items:flex-start; }
        .am-panel { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; }
        .am-panel-narrow { flex:0 0 260px; }
        .am-panel-h { font-size:13px; font-weight:700; color:#0f2544; margin-bottom:6px; }
        .am-muted { color:#94a3b8; font-weight:500; }
        .am-row-sel { background:#eff6ff; }
        .am-addbar { display:flex; align-items:center; gap:12px; margin-top:12px; }

        .am-note { background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; padding:16px; color:#475569; font-size:14px; line-height:1.5; }
        .am-done { display:flex; align-items:center; gap:14px; padding:14px 6px; font-size:15px; color:#0f172a; }
        .am-done-ok { width:40px; height:40px; border-radius:50%; background:#dcfce7; color:#166534; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; }
      `}</style>
    </div>
  );
}