import React, { useState, useEffect, useCallback, useMemo } from "react";
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
const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_CHIP = {
  Available: { label: "Available", dot: "#16a34a", bg: "#e6f4ef", color: "#166534", border: "#b3d9cc" },
  Busy:      { label: "Busy",      dot: "#dc2626", bg: "#fdecec", color: "#b91c1c", border: "#f0c4c0" },
  WeekOff:   { label: "Week Off",  dot: "#f59e0b", bg: "#fff4e5", color: "#b45309", border: "#f5d9a8" },
};

const rights = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    const role = (u.role || u.userRole || u.securityRole || "").toLowerCase().replace(/\s/g, "");
    const entityLevel = u.isEntityLevel === true;
    const canManage = entityLevel || ["admin", "areamanager", "clinicmanager"].includes(role);
    return { entityLevel, canManage, centerCode: u.centerCode || "" };
  } catch { return { entityLevel: false, canManage: false, centerCode: "" }; }
};

export default function RosterView() {
  const { entityLevel, canManage, centerCode: userCentre } = rights();

  const [centres, setCentres] = useState([]);
  const [centre, setCentre]   = useState(entityLevel ? "" : userCentre);
  const [date, setDate]       = useState(todayISO());
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);
  const [busyFor, setBusyFor] = useState(null);   // { employeeCode, employeeName } | null
  const [remark, setRemark]   = useState("");
  const [working, setWorking] = useState(false);

  // Filters + pagination (client-side over the centre/day roster)
  const [nameQ,   setNameQ]   = useState("");
  const [statusF, setStatusF] = useState("");
  const [jobF,    setJobF]    = useState("");
  const [shiftF,  setShiftF]  = useState("");
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 10;
  const [auto, setAuto]       = useState(false);
  const [histFor, setHistFor] = useState(null);
  const [hist, setHist]       = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (!entityLevel) return;
    api(`/api/master/LoadCenters`).then((j) => setCentres(j.data || [])).catch(() => {});
  }, [entityLevel]);

  const loadRoster = useCallback(async () => {
    const cc = entityLevel ? centre : userCentre;
    if (!cc) { setRows([]); return; }
    setLoading(true);
    try {
      const j = await api(`/api/Workforce/Shift/Roster?${new URLSearchParams({ centerCode: cc, date }).toString()}`);
      setRows(j.data || []);
    } catch (e) { showToast(e.message, "error"); setRows([]); }
    finally { setLoading(false); }
  }, [entityLevel, centre, userCentre, date]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  // Distinct option lists come from whatever the roster actually contains.
  const jobs   = useMemo(() => [...new Set(rows.map((r) => r.job).filter(Boolean))].sort(), [rows]);
  const shifts = useMemo(() => [...new Set(rows.map((r) => r.shiftName).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = nameQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !`${r.employeeName} ${r.employeeCode}`.toLowerCase().includes(q)) return false;
      if (statusF && r.status !== statusF) return false;
      if (jobF && r.job !== jobF) return false;
      if (shiftF === "__none__") { if (r.hasShift) return false; }
      else if (shiftF && r.shiftName !== shiftF) return false;
      return true;
    });
  }, [rows, nameQ, statusF, jobF, shiftF]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [nameQ, statusF, jobF, shiftF, rows]);

  // Auto-refresh (lightweight polling; true real-time would use websockets).
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => { loadRoster(); }, 10000);
    return () => clearInterval(id);
  }, [auto, loadRoster]);

  const openHistory = async (row) => {
    setHistFor(row); setHist([]); setHistLoading(true);
    try {
      const j = await api(`/api/Workforce/Shift/StatusAudit?${new URLSearchParams({ employeeCode: row.employeeCode }).toString()}`);
      setHist(j.data || []);
    } catch (e) { showToast(e.message, "error"); }
    finally { setHistLoading(false); }
  };

  const postStatus = async (employeeCode, action, rmk = "") => {
    setWorking(true);
    try {
      await api(`/api/Workforce/Shift/Status`, {
        method: "POST",
        body: JSON.stringify({ employeeCode, date, action, remark: rmk }),
      });
      await loadRoster();
    } catch (e) { showToast(e.message, "error"); }
    finally { setWorking(false); }
  };

  const openBusy = (row) => { setBusyFor(row); setRemark(""); };
  const confirmBusy = async () => { const r = busyFor; setBusyFor(null); await postStatus(r.employeeCode, "Busy", remark); };

  return (
    <div style={sx.page}>
      <div style={sx.crumb}>Dashboard › Shift Management › Roster</div>
      <h2 style={sx.h2}>Roster</h2>
      {toast && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.type === "success" ? "#e6f4ef" : "#fdf3f3",
          border: `1px solid ${toast.type === "success" ? "#b3d9cc" : "#f0c4c0"}`,
          color: toast.type === "success" ? "#2e7d5e" : "#b91c1c" }}>{toast.msg}</div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        {entityLevel && (
          <select style={{ ...sx.in, maxWidth: 240 }} value={centre} onChange={(e) => setCentre(e.target.value)}>
            <option value="">Select centre</option>
            {centres.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        )}
        <input style={{ ...sx.in, maxWidth: 180 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button style={sx.secBtn} disabled={loading} onClick={loadRoster}>{loading ? "Loading…" : "Refresh"}</button>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569" }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-refresh
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          {Object.values(STATUS_CHIP).map((c) => (
            <span key={c.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: c.dot, display: "inline-block" }} />{c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      {(!entityLevel || centre) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <input style={{ ...sx.in, flex: "1 1 220px", minWidth: 180 }} placeholder="Search name or code…"
            value={nameQ} onChange={(e) => setNameQ(e.target.value)} />
          <select style={{ ...sx.in, minWidth: 150 }} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Available">Available</option>
            <option value="Busy">Busy</option>
            <option value="WeekOff">Week Off</option>
          </select>
          <select style={{ ...sx.in, minWidth: 150 }} value={jobF} onChange={(e) => setJobF(e.target.value)}>
            <option value="">All jobs</option>
            {jobs.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
          <select style={{ ...sx.in, minWidth: 150 }} value={shiftF} onChange={(e) => setShiftF(e.target.value)}>
            <option value="">All shifts</option>
            {shifts.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="__none__">No shift</option>
          </select>
        </div>
      )}

      {entityLevel && !centre ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0" }}>
          Select a centre to view its roster.
        </div>
      ) : (
        <>
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f1f5f9" }}>
              {["Employee", "Job", "Shift", "Status", ...(canManage ? [""] : [])].map((h, i) => (
                <th key={i} style={sx.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canManage ? 5 : 4} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={canManage ? 5 : 4} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>{rows.length ? "No employees match the filters." : "No active employees in this centre."}</td></tr>
              ) : pageRows.map((r) => {
                const chip = STATUS_CHIP[r.status] || STATUS_CHIP.WeekOff;
                return (
                  <tr key={r.employeeCode} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ ...sx.td }}>
                      <div style={{ fontWeight: 700, color: NAVY }}>{r.employeeName}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.employeeCode}</div>
                    </td>
                    <td style={{ ...sx.td, color: "#64748b" }}>{r.job || "—"}</td>
                    <td style={sx.td}>
                      {r.hasShift ? (
                        <div>
                          <div>{r.shiftName} <span style={{ color: "#94a3b8" }}>{r.startTime}–{r.endTime}</span></div>
                          {r.breaks && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Break: {r.breaks}</div>}
                        </div>
                      ) : <span style={{ color: "#94a3b8" }}>No shift</span>}
                    </td>
                    <td style={sx.td}>
                      <button onClick={() => openHistory(r)} title="View status history"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
                        fontSize: 12, fontWeight: 700, background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, cursor: "pointer" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: chip.dot }} />{chip.label}
                      </button>
                      {r.remark && r.status === "Busy" && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>“{r.remark}”</div>}
                    </td>
                    {canManage && (
                      <td style={{ ...sx.td, whiteSpace: "nowrap" }}>
                        {r.hasShift && r.status !== "Busy" && (
                          <button style={sx.actBtn} disabled={working} onClick={() => openBusy(r)}>Mark Busy</button>
                        )}
                        {r.hasShift && r.status !== "WeekOff" && (
                          <button style={{ ...sx.actBtn, marginLeft: 6 }} disabled={working} onClick={() => postStatus(r.employeeCode, "WeekOff")}>Week Off</button>
                        )}
                        {r.manualStatus && (
                          <button style={{ ...sx.actBtn, marginLeft: 6, borderColor: "#16a34a", color: "#166534" }} disabled={working} onClick={() => postStatus(r.employeeCode, "Available")}>Revert</button>
                        )}
                        {!r.hasShift && <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
            <button onClick={() => setPage(1)} disabled={page === 1} style={pgBtn(page === 1)}>«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pgBtn(page === 1)}>‹ Prev</button>
            <span style={{ fontSize: 13, color: "#475569", padding: "0 6px" }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pgBtn(page === totalPages)}>Next ›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pgBtn(page === totalPages)}>»</button>
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>
              {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          </div>
        )}
        </>
      )}

      {/* Mark Busy remark modal */}
      {busyFor && (
        <div style={sx.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setBusyFor(null); }}>
          <div style={sx.modal}>
            <div style={{ fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 4 }}>Mark Busy</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>{busyFor.employeeName} · {date}</div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Remark (optional)</label>
            <textarea rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="e.g. On client call"
              style={{ width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #ced4da", borderRadius: 8, fontSize: 13, resize: "vertical", outline: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button style={sx.cancelBtn} onClick={() => setBusyFor(null)}>Cancel</button>
              <button style={sx.priBtn} disabled={working} onClick={confirmBusy}>{working ? "Saving…" : "Mark Busy"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Status history modal */}
      {histFor && (
        <div style={sx.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setHistFor(null); }}>
          <div style={{ ...sx.modal, maxWidth: 580 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: NAVY }}>Status history — {histFor.employeeName}</div>
              <button onClick={() => setHistFor(null)} style={{ border: "none", background: "transparent", fontSize: 16, color: "#64748b", cursor: "pointer" }}>✕</button>
            </div>
            {histLoading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
            ) : hist.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>No manual status changes recorded.</div>
            ) : (
              <div style={{ maxHeight: 340, overflow: "auto", border: "1px solid #eef2f7", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: "#f1f5f9" }}>
                    <th style={sx.th}>Date</th><th style={sx.th}>Change</th><th style={sx.th}>Remark</th><th style={sx.th}>By</th><th style={sx.th}>When</th>
                  </tr></thead>
                  <tbody>
                    {hist.map((h, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={sx.td}>{h.statusDate}</td>
                        <td style={sx.td}>{h.oldValue || "—"} → <b>{h.newValue}</b></td>
                        <td style={{ ...sx.td, color: "#64748b" }}>{h.remark || "—"}</td>
                        <td style={{ ...sx.td, color: "#64748b" }}>{h.actionBy}</td>
                        <td style={{ ...sx.td, color: "#94a3b8", whiteSpace: "nowrap" }}>{h.actionDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const sx = {
  page: { padding: 28, fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#0f172a" },
  crumb: { fontSize: 11, color: "#94a3b8", marginBottom: 6 },
  h2: { fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 16 },
  in: { padding: "8px 12px", border: "1px solid #ced4da", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff" },
  th: { padding: "11px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#475569", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", letterSpacing: ".06em" },
  td: { padding: "12px 14px", fontSize: 13 },
  secBtn: { background: "#fff", color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  actBtn: { padding: "4px 12px", border: `1px solid ${NAVY}`, borderRadius: 6, background: "#fff", color: NAVY, fontWeight: 700, fontSize: 12, cursor: "pointer" },
  priBtn: { background: NAVY, color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  cancelBtn: { background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 9, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal: { background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(2,6,23,.3)" },
};

const pgBtn = (disabled) => ({
  padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0",
  background: "#fff", color: disabled ? "#c8d5e8" : NAVY,
  cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500,
});