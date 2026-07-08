// src/components/DashboardOverview.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";

/**
 * Case Management dashboard — top section of the /cases page (Dashboards FRD §4.6).
 * Drop-in replacement for the old KPI/CASE-TYPES strip: self-fetching, no props,
 * renders above the existing cases table. Executive style (navy/teal, Lato, SVG).
 *
 * Source: GET /api/CaseOperation/CaseDashboard?fromDate&toDate  (period-filtered;
 * centre stays session-scoped, driven by the app's top-nav centre selector).
 * Read defensively as body.data ?? body.
 *
 * Notes: PRIORITY is High/Normal/Low (real values). Average resolution time and
 * the SLA-breach list aren't derivable from CLINIC_CASEDETAILS yet, so the
 * endpoint returns null/[] and those two widgets show an "awaiting source" state.
 */

/* ----------------------------- tokens ----------------------------- */
const COLORS = {
  primary: "#18396E", accent: "#A7D1CD", coral: "#DD7766",
  green: "#2F8F6B", blue: "#5C86A8", gold: "#D19A3E", red: "#CE5C48",
  ink: "#13294B",
};
const FONT = "'Lato', system-ui, sans-serif";
const card = { background: "#fff", border: "1px solid #e5e9ee", borderRadius: 16, padding: "20px 22px" };
const grp = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const CAT_COLORS = [COLORS.primary, COLORS.blue, COLORS.coral, COLORS.gold, "#7C9A8E", "#9AA4B1", COLORS.accent, COLORS.ink];

/* --------------------------- date helpers ------------------------- */
const iso = (d) => d.toISOString().slice(0, 10);
function computeRange(range, customFrom, customTo) {
  const today = new Date();
  const start = new Date(today), end = new Date(today);
  if (range === "Current Week") start.setDate(today.getDate() - today.getDay());
  else if (range === "Current Month") start.setDate(1);
  else if (range === "Custom Range") return { fromDate: customFrom || "", toDate: customTo || "" };
  return { fromDate: iso(start), toDate: iso(end) };
}
const RANGE_FACTOR = { "Current Date": 1, "Current Week": 5.4, "Current Month": 22, "Custom Range": 1 };
const customFactor = (from, to) =>
  !from || !to ? 1 : Math.max(1, (new Date(to) - new Date(from)) / 86400000 + 1);

/* ------------------------- SVG: donut ----------------------------- */
function Donut({ segments, centerValue, size = 184, thickness = 28 }) {
  const total = segments.reduce((a, s) => a + (s.value || 0), 0);
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: "none" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f4" strokeWidth={thickness} />
        {total > 0 && segments.map((s, i) => {
          const len = (s.value / total) * C;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />
          );
          offset += len; return el;
        })}
        <text x={cx} y={cy - 3} textAnchor="middle" fontFamily={FONT} fontSize={31} fontWeight={800} fill={COLORS.ink} style={{ fontVariantNumeric: "tabular-nums" }}>
          {grp(centerValue != null ? centerValue : total)}
        </text>
        <text x={cx} y={cy + 19} textAnchor="middle" fontFamily={FONT} fontSize={12} fontWeight={600} fill="#8b95a2">cases</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 128 }}>
        {segments.map((s, i) => {
          const pct = total ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flex: "none" }} />
              <span style={{ fontWeight: 600, color: "#33404e" }}>{s.label}</span>
              <span style={{ marginInlineStart: "auto", color: "#8b95a2", fontVariantNumeric: "tabular-nums" }}>{grp(s.value)} · {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- SVG: vertical bar chart --------------------- */
function niceScale(max, ticks = 4) {
  const raw = max / ticks || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  return { niceMax: Math.ceil(max / step) * step || step, step };
}
function VerticalBar({ rows, height = 220 }) {
  const W = 520, pl = 44, pr = 14, pt = 24, pb = 40;
  const dataMax = Math.max(1, ...rows.map((r) => r.value));
  const { niceMax, step } = niceScale(dataMax);
  const plotW = W - pl - pr, plotH = height - pt - pb;
  const n = rows.length || 1, band = plotW / n;
  const barW = Math.min(52, band * 0.52);
  const X = (i) => pl + band * i + band / 2;
  const Y = (v) => pt + plotH - (v / niceMax) * plotH;
  const gridVals = [];
  for (let v = 0; v <= niceMax + 1e-6; v += step) gridVals.push(v);
  const trunc = (s, m) => (s.length > m ? s.slice(0, m - 1) + "…" : s);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block", height: "auto" }}>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={pl} y1={Y(v)} x2={W - pr} y2={Y(v)} stroke="#EAEFEE" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={pl - 8} y={Y(v) + 4} textAnchor="end" fontFamily={FONT} fontSize={11} fill="#9aa4b1">{grp(v)}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const h = (r.value / niceMax) * plotH;
        return (
          <g key={i}>
            <rect x={X(i) - barW / 2} y={Y(r.value)} width={barW} height={h} rx={4} fill={r.color || COLORS.primary} />
            <text x={X(i)} y={Y(r.value) - 8} textAnchor="middle" fontFamily={FONT} fontSize={12.5} fontWeight={700} fill={COLORS.ink} style={{ fontVariantNumeric: "tabular-nums" }}>{grp(r.value)}</text>
            <text x={X(i)} y={height - 14} textAnchor="middle" fontFamily={FONT} fontSize={10.5} fill="#6b7684">{trunc(r.label, 12)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------- data hook ---------------------------- */
const MOCK = {
  total: 1175, open: 503, wip: 225, closed: 446, resolved: 382, unResolved: 27,
  priority: { High: 210, Normal: 180, Low: 113 },
  category: [
    { name: "Complaint", count: 665 }, { name: "Request", count: 238 }, { name: "Query", count: 79 },
    { name: "Repair", count: 17 }, { name: "Maintenance", count: 15 }, { name: "Incident", count: 0 },
  ],
  averageResolutionDays: null,
  slaBreach: [],
};

function useCaseDashboard({ range, customFrom, customTo }) {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true); setErr("");
    const { fromDate, toDate } = computeRange(range, customFrom, customTo);
    try {
      const p = new URLSearchParams();
      if (fromDate && toDate) { p.set("fromDate", fromDate); p.set("toDate", toDate); }
      const res = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseDashboard?${p}`, {
        method: "GET", headers: { "Content-Type": "application/json" },
        credentials: "include", signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const d = body?.data ?? body;
      setRaw({
        total: num(d?.total), open: num(d?.open), wip: num(d?.wip), closed: num(d?.closed),
        resolved: num(d?.resolved), unResolved: num(d?.unResolved ?? d?.unresolved),
        priority: { High: num(d?.priority?.High), Normal: num(d?.priority?.Normal), Low: num(d?.priority?.Low) },
        category: Array.isArray(d?.category) ? d.category.map((c) => ({ name: String(c?.name ?? ""), count: num(c?.count ?? c?.cnt) })) : [],
        averageResolutionDays: d?.averageResolutionDays == null ? null : num(d.averageResolutionDays),
        slaBreach: Array.isArray(d?.slaBreach) ? d.slaBreach : [],
      });
      setUpdatedAt(new Date());
    } catch (e) {
      if (e?.name === "AbortError") return;
      setErr(e?.message || "Failed to load"); setRaw(null); setUpdatedAt(new Date());
    } finally { setLoading(false); }
  }, [range, customFrom, customTo]);

  useEffect(() => {
    if (range === "Custom Range" && (!customFrom || !customTo || new Date(customTo) < new Date(customFrom))) {
      setLoading(false); return;
    }
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [range, customFrom, customTo, load]);

  const data = useMemo(() => {
    const live = !!raw;
    const f = range === "Custom Range" ? customFactor(customFrom, customTo) : (RANGE_FACTOR[range] || 1);
    const src = live ? raw : {
      total: Math.round(MOCK.total * f), open: Math.round(MOCK.open * f), wip: Math.round(MOCK.wip * f),
      closed: Math.round(MOCK.closed * f), resolved: Math.round(MOCK.resolved * f), unResolved: Math.round(MOCK.unResolved * f),
      priority: { High: Math.round(MOCK.priority.High * f), Normal: Math.round(MOCK.priority.Normal * f), Low: Math.round(MOCK.priority.Low * f) },
      category: MOCK.category.map((c) => ({ name: c.name, count: Math.round(c.count * f) })),
      averageResolutionDays: MOCK.averageResolutionDays, slaBreach: MOCK.slaBreach,
    };
    const statusSegments = [
      { label: "Closed", value: src.closed, color: COLORS.green },
      { label: "WIP", value: src.wip, color: COLORS.blue },
      { label: "Open", value: src.open, color: COLORS.gold },
    ];
    const resolvedSegments = [
      { label: "Resolved", value: src.resolved, color: COLORS.green },
      { label: "Unresolved", value: src.unResolved, color: COLORS.red },
    ];
    const priority = [
      { label: "High", value: src.priority.High, color: COLORS.red },
      { label: "Normal", value: src.priority.Normal, color: COLORS.gold },
      { label: "Low", value: src.priority.Low, color: COLORS.green },
    ];
    const category = [...src.category].sort((a, b) => b.count - a.count).slice(0, 8)
      .map((c, i) => ({ label: c.name, value: c.count, color: CAT_COLORS[i % CAT_COLORS.length] }));
    const avgResolution = src.averageResolutionDays == null ? null : `${src.averageResolutionDays} days`;
    const slaBreach = [...src.slaBreach].sort((a, b) => num(a.dueInDays) - num(b.dueInDays));

    return {
      live, counts: src,
      kpis: [
        { label: "Total", value: src.total, color: COLORS.ink },
        { label: "Open", value: src.open, color: COLORS.red },
        { label: "WIP", value: src.wip, color: COLORS.gold },
        { label: "Closed", value: src.closed, color: COLORS.blue },
        { label: "Resolved", value: src.resolved, color: COLORS.green },
        { label: "Unresolved", value: src.unResolved, color: COLORS.red },
      ],
      statusSegments, statusTotal: src.open + src.wip + src.closed,
      resolvedSegments, resolvedTotal: src.resolved + src.unResolved,
      category, priority, avgResolution, slaBreach,
    };
  }, [raw, range, customFrom, customTo]);

  return { data, loading, err, updatedAt, reload: () => load() };
}

/* --------------------------- UI helpers --------------------------- */
const RANGES = ["Current Date", "Current Week", "Current Month", "Custom Range"];
const seg = { border: "1px solid #e2e6ec", borderRadius: 11, padding: 3, background: "#f0f2f5", display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" };
const CardShell = ({ title, sub, children, style }) => (
  <div style={{ ...card, ...style }}>
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: "#8b95a2", marginTop: 3 }}>{sub}</div>}
    </div>
    {children}
  </div>
);
const Awaiting = ({ text }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 90, color: "#9aa4b1", fontSize: 12.5, textAlign: "center", padding: "0 8px" }}>{text}</div>
);

/* --------------------------- component ---------------------------- */
const DashboardOverview = () => {
  const [range, setRange] = useState("Current Date"); // module default (BR-01)
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rangeError, setRangeError] = useState("");

  const { data, loading, err, updatedAt, reload } = useCaseDashboard({ range, customFrom, customTo });

  const validateCustom = (from, to) => {
    if (from && to && new Date(to) < new Date(from)) { setRangeError("To Date cannot be earlier than From Date."); return false; } // BR-09
    setRangeError(""); return true;
  };
  const lastUpdated = updatedAt ? updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div style={{ fontFamily: FONT, color: COLORS.ink }}>
      {/* Toolbar: status line + period filter (top-right, per §2) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: data.live ? "#E6F1EC" : "#F6EBD9", color: data.live ? COLORS.green : "#B07C28" }}>
          {loading ? "Loading…" : data.live ? "Live data" : "Sample data"}
        </span>
        <span style={{ fontSize: 12, color: "#8b95a2" }}>Last updated {lastUpdated}</span>
        {err && !data.live && <span style={{ fontSize: 11.5, color: "#b0704f" }}>API unreachable — showing sample figures</span>}
        <div style={{ ...seg, marginInlineStart: "auto" }}>
          {RANGES.map((r) => {
            const active = range === r;
            return (
              <button key={r} onClick={() => { setRangeError(""); setRange(r); }}
                style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: active ? 700 : 500, padding: "6px 12px", borderRadius: 8, background: active ? "#fff" : "transparent", color: active ? COLORS.primary : "#6b7684", boxShadow: active ? "0 1px 3px rgba(20,30,45,0.12)" : "none" }}>
                {r}
              </button>
            );
          })}
        </div>
      </div>
      {range === "Custom Range" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <label style={{ fontSize: 12.5, color: "#6b7684", display: "flex", alignItems: "center", gap: 7 }}>From
            <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); validateCustom(e.target.value, customTo); }}
              style={{ fontFamily: "inherit", fontSize: 12.5, padding: "6px 10px", border: "1px solid #d7dde4", borderRadius: 8 }} />
          </label>
          <label style={{ fontSize: 12.5, color: "#6b7684", display: "flex", alignItems: "center", gap: 7 }}>To
            <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => { setCustomTo(e.target.value); validateCustom(customFrom, e.target.value); }}
              style={{ fontFamily: "inherit", fontSize: 12.5, padding: "6px 10px", border: "1px solid #d7dde4", borderRadius: 8 }} />
          </label>
          {rangeError && <span style={{ fontSize: 12, color: COLORS.red, fontWeight: 600 }}>{rangeError}</span>}
          <button onClick={reload} style={{ cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 9, background: "#fff", color: COLORS.primary, border: "1px solid #e2e6ec" }}>Apply</button>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 16 }}>
        {data.kpis.map((k, i) => (
          <div key={i} style={{ ...card, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: k.color, fontVariantNumeric: "tabular-nums" }}>{grp(k.value)}</div>
            <div style={{ fontSize: 12.5, color: "#7a8593", fontWeight: 500, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Donuts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <CardShell title="Cases by status" sub="Closed · WIP · Open">
          <Donut segments={data.statusSegments} centerValue={data.statusTotal} />
        </CardShell>
        <CardShell title="Resolved vs. unresolved" sub="Share of cases resolved">
          <Donut segments={data.resolvedSegments} centerValue={data.resolvedTotal} />
        </CardShell>
      </div>

      {/* Vertical bars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <CardShell title="Cases by priority" sub="Open cases · High / Normal / Low">
          <VerticalBar rows={data.priority} />
        </CardShell>
        <CardShell title="Category-wise case count" sub="Cases grouped by case category">
          {data.category.length ? <VerticalBar rows={data.category} /> : <Awaiting text="No cases in the selected period." />}
        </CardShell>
      </div>

      {/* Avg resolution + SLA breach */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) 1fr", gap: 16, marginBottom: 24 }}>
        <CardShell title="Average resolution time" sub="Creation → resolution, in period">
          {data.avgResolution ? (
            <>
              <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: COLORS.primary, fontVariantNumeric: "tabular-nums", marginTop: 6 }}>{data.avgResolution}</div>
              <div style={{ marginTop: 16, height: 1, background: "#edf0f3" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 12.5 }}>
                <span style={{ color: "#7a8593" }}>Resolved</span><span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{grp(data.counts.resolved)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12.5 }}>
                <span style={{ color: "#7a8593" }}>Unresolved</span><span style={{ fontWeight: 700, color: COLORS.red, fontVariantNumeric: "tabular-nums" }}>{grp(data.counts.unResolved)}</span>
              </div>
            </>
          ) : <Awaiting text="Awaiting resolution-time source (needs case close timestamp)." />}
        </CardShell>

        <CardShell title="Cases nearing SLA breach" sub="Ranked by urgency — overdue first">
          {data.slaBreach.length ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 10.5, color: "#9aa4b1", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", paddingBottom: 8, borderBottom: "1px solid #edf0f3" }}>
                <span style={{ width: 92, flex: "none" }}>Case</span><span style={{ flex: 1 }}>Subject</span>
                <span style={{ width: 110, flex: "none" }}>Owner</span><span style={{ width: 96, textAlign: "end", flex: "none" }}>SLA</span>
              </div>
              {data.slaBreach.map((c, i) => {
                const dd = num(c.dueInDays), overdue = dd < 0, dueToday = dd === 0;
                const tagBg = overdue ? "#FBEEEA" : dueToday ? "#F6EBD9" : "#EEF2F7";
                const tagCol = overdue ? COLORS.red : dueToday ? "#B07C28" : COLORS.blue;
                const tagTxt = overdue ? `Overdue ${Math.abs(dd)}d` : dueToday ? "Due today" : `Due ${dd}d`;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 12.5, padding: "11px 0", borderBottom: "1px solid #f4f6f8" }}>
                    <span style={{ width: 92, flex: "none", fontWeight: 700, color: COLORS.primary, fontVariantNumeric: "tabular-nums" }}>{c.caseNo}</span>
                    <span style={{ flex: 1, color: "#33404e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingInlineEnd: 10 }}>{c.subject}</span>
                    <span style={{ width: 110, flex: "none", color: "#6b7684" }}>{c.owner}</span>
                    <span style={{ width: 96, textAlign: "end", flex: "none" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: tagBg, color: tagCol, whiteSpace: "nowrap" }}>{tagTxt}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : <Awaiting text="Awaiting SLA-breach source (response / escalation feed)." />}
        </CardShell>
      </div>
    </div>
  );
};

export default DashboardOverview;