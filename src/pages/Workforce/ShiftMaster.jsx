import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}) },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status}).`);
  return json;
};

const NAVY = "#334b71";
const DOW = [
  { n: 1, l: "Mon" }, { n: 2, l: "Tue" }, { n: 3, l: "Wed" }, { n: 4, l: "Thu" },
  { n: 5, l: "Fri" }, { n: 6, l: "Sat" }, { n: 0, l: "Sun" },
];

const rights = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    const role = (u.role || u.userRole || u.securityRole || "").toLowerCase().replace(/\s/g, "");
    const entityLevel = u.isEntityLevel === true;
    const canManage = entityLevel || ["admin", "areamanager", "clinicmanager"].includes(role);
    return { entityLevel, canManage, centerCode: u.centerCode || "" };
  } catch { return { entityLevel: false, canManage: false, centerCode: "" }; }
};

const emptyTemplate = (centerCode) => ({
  recid: null, shiftName: "", startTime: "09:00", endTime: "17:00",
  centerCode: centerCode || "", role: "", breaks: [],
});

export default function ShiftMaster() {
  const { entityLevel, canManage, centerCode: userCentre } = rights();

  const [view, setView]         = useState("list");   // list | form | assign
  const [centres, setCentres]   = useState([]);
  const [filterCentre, setFilterCentre] = useState(entityLevel ? "" : userCentre);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);

  const [form, setForm]         = useState(emptyTemplate(userCentre));
  const [saving, setSaving]     = useState(false);

  const [assignTpl, setAssignTpl] = useState(null);
  const [emps, setEmps]         = useState([]);
  const [selEmps, setSelEmps]   = useState(() => new Set());
  const [empSearch, setEmpSearch] = useState("");
  const [aMode, setAMode]       = useState("single"); // single | recurring
  const [aDate, setADate]       = useState("");
  const [aFrom, setAFrom]       = useState("");
  const [aTo, setATo]           = useState("");
  const [aDows, setADows]       = useState(() => new Set([1, 2, 3, 4, 5]));

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (!entityLevel) return;
    api(`/api/master/LoadCenters`).then((j) => setCentres(j.data || [])).catch(() => {});
  }, [entityLevel]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ centerCode: entityLevel ? filterCentre : userCentre, includeInactive: "1" });
      const j = await api(`/api/Workforce/Shift/Templates?${qs.toString()}`);
      setTemplates(j.data || []);
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [entityLevel, filterCentre, userCentre]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ── Template form ──────────────────────────────────────────────────────────
  const openCreate = () => { setForm(emptyTemplate(entityLevel ? (filterCentre || "") : userCentre)); setView("form"); };
  const openEdit = async (recid) => {
    try { const j = await api(`/api/Workforce/Shift/Template/${recid}`); setForm({ ...j.data, role: j.data.role || "" }); setView("form"); }
    catch (e) { showToast(e.message, "error"); }
  };

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const addBreak = () => setForm((p) => ({ ...p, breaks: [...p.breaks, { breakStart: "13:00", durationMin: 30, isPaid: false }] }));
  const setBreak = (i, k, v) => setForm((p) => ({ ...p, breaks: p.breaks.map((b, idx) => idx === i ? { ...b, [k]: v } : b) }));
  const rmBreak = (i) => setForm((p) => ({ ...p, breaks: p.breaks.filter((_, idx) => idx !== i) }));

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const body = {
        shiftName: form.shiftName, startTime: form.startTime, endTime: form.endTime,
        centerCode: entityLevel ? form.centerCode : userCentre, role: form.role,
        breaks: form.breaks.map((b) => ({ breakStart: b.breakStart, durationMin: Number(b.durationMin) || 0, isPaid: !!b.isPaid })),
      };
      if (form.recid) await api(`/api/Workforce/Shift/Template/${form.recid}`, { method: "PUT", body: JSON.stringify(body) });
      else await api(`/api/Workforce/Shift/Template`, { method: "POST", body: JSON.stringify(body) });
      showToast(form.recid ? "Shift template updated." : "Shift template created.");
      setView("list"); loadTemplates();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const deactivate = async (recid) => {
    if (!window.confirm("Deactivate this shift template? Existing assignments are kept.")) return;
    try { await api(`/api/Workforce/Shift/Template/${recid}/Deactivate`, { method: "POST" }); showToast("Template deactivated."); loadTemplates(); }
    catch (e) { showToast(e.message, "error"); }
  };

  // ── Assign ─────────────────────────────────────────────────────────────────
  const openAssign = async (tpl) => {
    setAssignTpl(tpl); setSelEmps(new Set()); setEmpSearch(""); setAMode("single"); setADate(""); setAFrom(""); setATo(""); setADows(new Set([1, 2, 3, 4, 5]));
    setView("assign");
    try { const j = await api(`/api/Workforce/Shift/Employees?${new URLSearchParams({ centerCode: tpl.centerCode }).toString()}`); setEmps(j.data || []); }
    catch (e) { showToast(e.message, "error"); setEmps([]); }
  };
  const toggleEmp = (code) => setSelEmps((p) => { const n = new Set(p); n.has(code) ? n.delete(code) : n.add(code); return n; });
  const toggleDow = (n) => setADows((p) => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s; });

  const doAssign = async () => {
    if (!selEmps.size) { showToast("Select at least one employee.", "error"); return; }
    setSaving(true);
    try {
      const body = {
        shiftTemplateId: assignTpl.recid, employeeCodes: [...selEmps], mode: aMode,
        ...(aMode === "single" ? { date: aDate } : { fromDate: aFrom, toDate: aTo, daysOfWeek: [...aDows] }),
      };
      const j = await api(`/api/Workforce/Shift/Assign`, { method: "POST", body: JSON.stringify(body) });
      showToast(j.message || "Assigned.");
      setView("list");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const toastBar = toast && (
    <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
      background: toast.type === "success" ? "#e6f4ef" : "#fdf3f3",
      border: `1px solid ${toast.type === "success" ? "#b3d9cc" : "#f0c4c0"}`,
      color: toast.type === "success" ? "#2e7d5e" : "#b91c1c" }}>{toast.msg}</div>
  );

  if (view === "form") {
    return (
      <div style={sx.page}>
        <div style={sx.crumb}>Dashboard › Shift Management › {form.recid ? "Edit" : "Create"} Template</div>
        <h2 style={sx.h2}>{form.recid ? "Edit Shift Template" : "Create Shift Template"}</h2>
        {toastBar}
        <div style={sx.card}>
          <Row label="Shift Name"><input style={sx.in} value={form.shiftName} onChange={(e) => setF("shiftName", e.target.value)} placeholder="e.g. Morning Shift" /></Row>
          <Row label="Start Time"><input style={sx.in} type="time" value={form.startTime} onChange={(e) => setF("startTime", e.target.value)} /></Row>
          <Row label="End Time"><input style={sx.in} type="time" value={form.endTime} onChange={(e) => setF("endTime", e.target.value)} /></Row>
          <Row label="Location (Centre)">
            {entityLevel ? (
              <select style={sx.in} value={form.centerCode} onChange={(e) => setF("centerCode", e.target.value)}>
                <option value="">Select centre</option>
                {centres.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            ) : <input style={{ ...sx.in, background: "#f8fafc" }} value={userCentre} disabled />}
          </Row>
          <Row label="Role (optional)"><input style={sx.in} value={form.role} onChange={(e) => setF("role", e.target.value)} placeholder="e.g. Stylist" /></Row>

          <div style={{ ...sx.sectTitle, marginTop: 22 }}>BREAKS</div>
          {form.breaks.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>No breaks configured.</div>}
          {form.breaks.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#64748b", width: 60 }}>Break {i + 1}</span>
              <input type="time" style={{ ...sx.in, maxWidth: 140 }} value={b.breakStart} onChange={(e) => setBreak(i, "breakStart", e.target.value)} />
              <input type="number" min="1" style={{ ...sx.in, maxWidth: 120 }} value={b.durationMin} onChange={(e) => setBreak(i, "durationMin", e.target.value)} placeholder="Minutes" />
              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                <input type="checkbox" checked={!!b.isPaid} onChange={(e) => setBreak(i, "isPaid", e.target.checked)} /> Paid
              </label>
              <button style={sx.link} onClick={() => rmBreak(i)}>Remove</button>
            </div>
          ))}
          <button style={sx.secBtn} onClick={addBreak}>+ Add Break</button>
          {(() => {
            const toMin = (t) => { const [h, m] = String(t || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
            const dur = toMin(form.endTime) - toMin(form.startTime);
            const unpaid = form.breaks.filter((b) => !b.isPaid).reduce((s, b) => s + (Number(b.durationMin) || 0), 0);
            const pay = Math.max(0, dur - unpaid);
            return dur > 0 ? (
              <div style={{ marginTop: 14, fontSize: 13, color: "#475569" }}>
                Shift length <b>{(dur / 60).toFixed(2)} h</b>{unpaid > 0 && <> · Unpaid breaks <b>{unpaid} min</b></>} · Payable <b style={{ color: NAVY }}>{(pay / 60).toFixed(2)} h</b>
              </div>
            ) : null;
          })()}

          <div style={sx.actions}>
            <button style={sx.priBtn} disabled={saving} onClick={saveTemplate}>{saving ? "Saving…" : "Save"}</button>
            <button style={sx.cancelBtn} onClick={() => setView("list")}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "assign" && assignTpl) {
    const q = empSearch.trim().toLowerCase();
    const shownEmps = q ? emps.filter((e) => `${e.employeeName} ${e.employeeCode} ${e.job || ""}`.toLowerCase().includes(q)) : emps;
    return (
      <div style={sx.page}>
        <div style={sx.crumb}>Dashboard › Shift Management › Assign</div>
        <h2 style={sx.h2}>Assign “{assignTpl.shiftName}” ({assignTpl.startTime}–{assignTpl.endTime})</h2>
        {toastBar}
        <div style={sx.card}>
          <div style={sx.sectTitle}>EMPLOYEES</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <input style={{ ...sx.in, maxWidth: 320 }} placeholder="Search name, code or job…" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} />
            {selEmps.size > 0 && <span style={{ fontSize: 12, color: "#64748b" }}>{selEmps.size} selected</span>}
          </div>
          <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 18 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#f1f5f9" }}>
                <th style={sx.th}></th><th style={sx.th}>Code</th><th style={sx.th}>Name</th><th style={sx.th}>Job</th>
              </tr></thead>
              <tbody>
                {shownEmps.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>{emps.length ? "No employees match your search." : "No active employees in this centre."}</td></tr>}
                {shownEmps.map((e) => (
                  <tr key={e.employeeCode} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={sx.td}><input type="checkbox" checked={selEmps.has(e.employeeCode)} onChange={() => toggleEmp(e.employeeCode)} /></td>
                    <td style={{ ...sx.td, fontWeight: 700, color: NAVY }}>{e.employeeCode}</td>
                    <td style={sx.td}>{e.employeeName}</td>
                    <td style={{ ...sx.td, color: "#64748b" }}>{e.job || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={sx.sectTitle}>WHEN</div>
          <div style={{ display: "flex", gap: 18, marginBottom: 14 }}>
            <label style={sx.radio}><input type="radio" checked={aMode === "single"} onChange={() => setAMode("single")} /> Single date</label>
            <label style={sx.radio}><input type="radio" checked={aMode === "recurring"} onChange={() => setAMode("recurring")} /> Recurring range</label>
          </div>

          {aMode === "single" ? (
            <Row label="Date"><input style={sx.in} type="date" value={aDate} onChange={(e) => setADate(e.target.value)} /></Row>
          ) : (
            <>
              <Row label="From"><input style={sx.in} type="date" value={aFrom} onChange={(e) => setAFrom(e.target.value)} /></Row>
              <Row label="To"><input style={sx.in} type="date" value={aTo} onChange={(e) => setATo(e.target.value)} /></Row>
              <Row label="Days">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DOW.map((d) => (
                    <button key={d.n} onClick={() => toggleDow(d.n)}
                      style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        border: `1px solid ${aDows.has(d.n) ? NAVY : "#cbd5e1"}`,
                        background: aDows.has(d.n) ? NAVY : "#fff", color: aDows.has(d.n) ? "#fff" : "#475569" }}>{d.l}</button>
                  ))}
                </div>
              </Row>
            </>
          )}

          <div style={sx.actions}>
            <button style={sx.priBtn} disabled={saving} onClick={doAssign}>{saving ? "Assigning…" : `Assign to ${selEmps.size} employee${selEmps.size === 1 ? "" : "s"}`}</button>
            <button style={sx.cancelBtn} onClick={() => setView("list")}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // list
  return (
    <div style={sx.page}>
      {!canManage && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, fontSize: 13,
          background: "#f0f4fa", border: "1px solid #c8d5e8", color: NAVY, fontWeight: 600 }}>
          👁 View Only — only Managers/Admins can create or assign shifts.
        </div>
      )}
      {toastBar}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={sx.crumb}>Dashboard › Shift Management › Shift Master</div>
          <h2 style={{ ...sx.h2, margin: 0 }}>Shift Master</h2>
        </div>
        {canManage && <button style={sx.priBtn} onClick={openCreate}>+ Create Shift Template</button>}
      </div>

      {entityLevel && (
        <div style={{ marginBottom: 16 }}>
          <select style={{ ...sx.in, maxWidth: 260 }} value={filterCentre} onChange={(e) => setFilterCentre(e.target.value)}>
            <option value="">All centres</option>
            {centres.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f1f5f9" }}>
            {["Shift Name", "Time", "Centre", "Role", "Breaks", "Status", ""].map((h) => (
              <th key={h} style={sx.th}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No shift templates yet.</td></tr>
            ) : templates.map((t) => (
              <tr key={t.recid} style={{ borderBottom: "1px solid #f1f5f9", opacity: t.active ? 1 : 0.55 }}>
                <td style={{ ...sx.td, fontWeight: 700, color: NAVY }}>{t.shiftName}</td>
                <td style={sx.td}>{t.startTime}–{t.endTime}</td>
                <td style={{ ...sx.td, color: "#64748b" }}>{t.centerCode}</td>
                <td style={{ ...sx.td, color: "#64748b" }}>{t.role || "—"}</td>
                <td style={sx.td}>{t.breakCount}</td>
                <td style={sx.td}>
                  <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: t.active ? "#e6f4ef" : "#f1f5f9", color: t.active ? "#2e7d5e" : "#64748b",
                    border: `1px solid ${t.active ? "#b3d9cc" : "#e2e8f0"}` }}>{t.active ? "Active" : "Inactive"}</span>
                </td>
                <td style={{ ...sx.td, whiteSpace: "nowrap" }}>
                  {t.active
                    ? <button style={sx.rowBtn} onClick={() => openEdit(t.recid)}>{canManage ? "Edit" : "View"}</button>
                    : <span style={{ color: "#94a3b8", fontSize: 12 }}>Inactive</span>}
                  {canManage && t.active && <button style={{ ...sx.rowBtn, marginLeft: 6 }} onClick={() => openAssign(t)}>Assign</button>}
                  {canManage && t.active && <button style={{ ...sx.rowBtn, marginLeft: 6, borderColor: "#f0c4c0", color: "#b91c1c" }} onClick={() => deactivate(t.recid)}>Deactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Row = ({ label, children }) => (
  <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
    <label style={{ minWidth: 160, textAlign: "right", marginRight: 18, fontWeight: 500, color: "#495057", fontSize: 14 }}>{label} :</label>
    <div style={{ flex: 1, maxWidth: 420 }}>{children}</div>
  </div>
);

const sx = {
  page: { padding: 28, fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#0f172a" },
  crumb: { fontSize: 11, color: "#94a3b8", marginBottom: 6 },
  h2: { fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 16 },
  card: { background: "#fff", borderRadius: 12, boxShadow: "0 2px 4px rgba(0,0,0,0.06)", padding: 28, maxWidth: 720 },
  sectTitle: { fontWeight: 700, fontSize: 13, color: "#334155", borderBottom: `2px solid ${NAVY}`, paddingBottom: 8, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".5px" },
  in: { width: "100%", padding: "8px 12px", border: "1px solid #ced4da", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff" },
  th: { padding: "11px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", letterSpacing: ".06em" },
  td: { padding: "12px 14px", fontSize: 13 },
  actions: { display: "flex", gap: 12, marginTop: 26, paddingTop: 18, borderTop: "1px solid #eef2f7" },
  priBtn: { background: NAVY, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  secBtn: { background: "#fff", color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  cancelBtn: { background: "#6c757d", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  rowBtn: { padding: "4px 12px", border: `1px solid ${NAVY}`, borderRadius: 6, background: "#fff", color: NAVY, fontWeight: 700, fontSize: 12, cursor: "pointer" },
  link: { background: "none", border: "none", color: "#b91c1c", fontSize: 12, cursor: "pointer", textDecoration: "underline" },
  radio: { fontSize: 14, display: "flex", alignItems: "center", gap: 6, color: "#334155", cursor: "pointer" },
};