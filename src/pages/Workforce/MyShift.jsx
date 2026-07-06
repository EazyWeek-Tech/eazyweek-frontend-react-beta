import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const api = async (path) => {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status}).`);
  return json;
};

const NAVY = "#334b71";
const todayISO = () => new Date().toISOString().slice(0, 10);

const CHIP = {
  Available: { label: "Available", dot: "#16a34a", bg: "#e6f4ef", color: "#166534", border: "#b3d9cc" },
  Busy:      { label: "Busy",      dot: "#dc2626", bg: "#fdecec", color: "#b91c1c", border: "#f0c4c0" },
  WeekOff:   { label: "Week Off",  dot: "#f59e0b", bg: "#fff4e5", color: "#b45309", border: "#f5d9a8" },
};

const toMin = (t) => { const [h, m] = String(t || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const payable = (shift) => {
  const dur = toMin(shift.endTime) - toMin(shift.startTime);
  const unpaid = (shift.breaks || []).filter((b) => !b.isPaid).reduce((s, b) => s + (b.durationMin || 0), 0);
  const mins = Math.max(0, dur - unpaid);
  return { mins, hours: (mins / 60).toFixed(2), unpaid };
};

export default function MyShift() {
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try { const j = await api(`/api/Workforce/Shift/MyShift?${new URLSearchParams({ date }).toString()}`); setData(j.data); }
    catch (e) { setErr(e.message); setData(null); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const chip = data ? (CHIP[data.status] || CHIP.WeekOff) : CHIP.WeekOff;

  return (
    <div style={sx.page}>
      <div style={sx.crumb}>Dashboard › Shift Management › My Shift</div>
      <h2 style={sx.h2}>My Shift</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <input style={sx.in} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button style={sx.secBtn} disabled={loading} onClick={load}>{loading ? "Loading…" : "Refresh"}</button>
        {data && (
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999,
            fontSize: 14, fontWeight: 700, background: chip.bg, color: chip.color, border: `1px solid ${chip.border}` }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: chip.dot }} />{chip.label}
          </span>
        )}
      </div>

      {err && <div style={{ ...sx.card, color: "#b91c1c", background: "#fdf3f3", border: "1px solid #f0c4c0" }}>{err}</div>}

      {!err && !loading && data && (
        <>
          {data.status === "Busy" && data.remark && (
            <div style={{ ...sx.card, marginBottom: 14, color: "#b45309", background: "#fff4e5", border: "1px solid #f5d9a8" }}>
              Marked Busy — “{data.remark}”
            </div>
          )}

          {data.shifts.length === 0 ? (
            <div style={{ ...sx.card, color: "#64748b" }}>
              No shift scheduled for {data.date}. Enjoy your day off.
            </div>
          ) : data.shifts.map((s, i) => {
            const p = payable(s);
            return (
              <div key={i} style={{ ...sx.card, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>{s.shiftName}</div>
                  <div style={{ fontSize: 15, color: "#334155", fontWeight: 600 }}>{s.startTime} – {s.endTime}</div>
                </div>

                <div style={sx.sect}>BREAKS</div>
                {s.breaks.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>No breaks.</div>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    {s.breaks.map((b, j) => (
                      <div key={j} style={{ fontSize: 13, color: "#334155", padding: "4px 0" }}>
                        {b.breakStart} · {b.durationMin} min
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 999,
                          background: b.isPaid ? "#e6f4ef" : "#f1f5f9", color: b.isPaid ? "#166534" : "#64748b" }}>
                          {b.isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ borderTop: "1px solid #eef2f7", paddingTop: 12, display: "flex", gap: 24, fontSize: 13, color: "#475569" }}>
                  <span>Shift length: <b>{((toMin(s.endTime) - toMin(s.startTime)) / 60).toFixed(2)} h</b></span>
                  {p.unpaid > 0 && <span>Unpaid breaks: <b>{p.unpaid} min</b></span>}
                  <span>Payable hours: <b style={{ color: NAVY }}>{p.hours} h</b></span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

const sx = {
  page: { padding: 28, fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#0f172a", maxWidth: 720 },
  crumb: { fontSize: 11, color: "#94a3b8", marginBottom: 6 },
  h2: { fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 16 },
  in: { padding: "8px 12px", border: "1px solid #ced4da", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff" },
  secBtn: { background: "#fff", color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  card: { background: "#fff", borderRadius: 12, boxShadow: "0 2px 4px rgba(0,0,0,0.06)", padding: 22, fontSize: 14 },
  sect: { fontWeight: 700, fontSize: 12, color: "#334155", letterSpacing: ".5px", marginBottom: 8 },
};