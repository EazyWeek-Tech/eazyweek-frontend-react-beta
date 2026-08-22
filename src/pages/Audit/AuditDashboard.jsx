// src/pages/Audit/AuditDashboard.jsx
// Audit dashboard — Dashboards FRD §4.4. Self-contained, EazyWeek `C` palette,
// hand-rolled SVG (matches CaseDashboard). No external chart lib, no CSS file.
//
// Widgets (Home_Dashboard_Calculation_Revised.xlsx · Audit Dashboard tab):
//   - Draft vs. submitted audits .......... Donut + centre total (no change)
//   - Segment-wise audits submitted ....... Vertical bar (no change)
//   - Average audit score by segment ...... Vertical bar, fixed 0-100 (changed
//                                           from the monthly score-trend line)
//   - Audit score by subsegment ........... Per-segment grouped bars, previous
//                                           3 months vs selected period (added)
//   - Employee performance ................ Audited employees by segment,
//                                           score high → low (added)
//
// Data (real):
//   POST /api/Audit/LoadAuditSummaryReport  { fromDate,toDate,dateFlag:"1" }
//        → submitted audits (ISDRAFT=0): auditSegment, auditScore, employeeName
//   POST /api/Audit/LoadAuditDetailedReport { fromDate,toDate,dateFlag:"1" }
//        → per-criteria rows: auditSegment, subSegment, score, submittedDate
//        (fetched over period + previous 3 months for the subsegment buckets)
//   POST /api/Audit/LoadDraftAudits/1       → current draft audits
//
// Data policy: NO sample figures are ever shown. While the endpoints are in
// flight the page shows the shared EazyWeek progress bar; if they fail it shows
// a retry panel. Every figure here comes from an endpoint or is not rendered.
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../config";
import DashboardGate, { DASHBOARD_VIEW } from "../../components/DashboardGate"; // adjust path if needed
// Shared EazyWeek loading indicators (same module Dashboard.jsx uses).
// This file assumes src/pages/Audit/ -> src/pages/Dashboard/; adjust if it moves.
import { DashboardLoadingBar, TileSkeleton, ChartLoading, LoadError } from "../Dashboard/DashboardLoadingBar";

/* ── palette ─────────────────────────────────────────────────────────────── */
const C = {
  navy:"#334b71", navyDk:"#2b3f73", open:"#cc6b5c", wip:"#d4a853", closed:"#8da0b8",
  cvt:"#4a9e8a", grid:"#eef2f7", axis:"#6e7b8f", border:"#e7ecf4", bg:"#f4f6fa",
  text:"#10223f", sub:"#64748b",
};
const FONT = "Lato,sans-serif";
const card = { background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.05)" };
const grp = (n) => Math.round(Number(n)||0).toLocaleString("en-US");
const num = (v) => (Number.isFinite(+v) ? +v : 0);
const CAT_COLORS = [C.navy, C.cvt, C.wip, C.open, C.closed, "#7b6fb0", "#A7D1CD", "#EDAF90"];

/* ── auth ───────────────────────────────────────────────────────────────── */
const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const apiPost = (url, body, signal) => fetch(url, {
  method:"POST", credentials:"include", signal,
  headers:{ "Content-Type":"application/json", ...(TOKEN() ? { Authorization:`Bearer ${TOKEN()}` } : {}) },
  body: JSON.stringify(body || {}),
});
const asArray = (d) => Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : (d ? [d] : []));

/* ── dates ──────────────────────────────────────────────────────────────── */
// Local calendar parts, NOT toISOString(): at UTC+3 any local time before 03:00
// rolls the date back a day, so "Current Date" would ask the API for yesterday.
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const parseDMY = (s) => {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/); // CONVERT(103) dd/mm/yyyy
  if (m) return new Date(+m[3], +m[2]-1, +m[1]);
  const d = new Date(s); return isNaN(d.getTime()) ? null : d;
};
function periodBounds(range, f, t) {
  const today = new Date();
  const start = new Date(today); start.setHours(0,0,0,0);
  const end   = new Date(today); end.setHours(23,59,59,999);
  if (range === "Current Week")  start.setDate(today.getDate() - today.getDay());
  else if (range === "Current Month") start.setDate(1);
  else if (range === "Custom Range") {
    if (!f || !t) return null;
    const s = new Date(f); s.setHours(0,0,0,0);
    const e = new Date(t); e.setHours(23,59,59,999);
    if (e < s) return null;
    return { start:s, end:e };
  }
  return { start, end };
}

/* ── SVG: donut ─────────────────────────────────────────────────────────── */
function Donut({ segments, centerValue, unit = "audits", size = 184, thickness = 28 }) {
  const total = segments.reduce((a,s)=>a+(s.value||0),0);
  const r = (size-thickness)/2, cx = size/2, cy = size/2, CIRC = 2*Math.PI*r;
  let off = 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:22, flexWrap:"wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex:"none" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f4" strokeWidth={thickness} />
        {total > 0 && segments.map((s,i) => {
          const len = (s.value/total)*CIRC;
          const el = (<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${CIRC-len}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />);
          off += len; return el;
        })}
        <text x={cx} y={cy-3} textAnchor="middle" fontFamily={FONT} fontSize={30} fontWeight={800} fill={C.text}>{grp(centerValue!=null?centerValue:total)}</text>
        <text x={cx} y={cy+18} textAnchor="middle" fontFamily={FONT} fontSize={12} fontWeight={600} fill={C.sub}>{unit}</text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:10, minWidth:128 }}>
        {segments.map((s,i) => {
          const pct = total ? Math.round((s.value/total)*100) : 0;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:9, fontSize:12.5 }}>
              <span style={{ width:11, height:11, borderRadius:3, background:s.color, flex:"none" }} />
              <span style={{ fontWeight:700, color:C.text }}>{s.label}</span>
              <span style={{ marginLeft:"auto", color:C.sub }}>{grp(s.value)} · {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── SVG: vertical bar ──────────────────────────────────────────────────── */
const niceScale = (max, ticks = 4) => {
  const raw = max/ticks || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw/mag;
  const step = (norm<=1?1:norm<=2?2:norm<=5?5:10)*mag;
  return { niceMax: Math.ceil(max/step)*step || step, step };
};
function VerticalBar({ rows, height = 220, fixedMax = null }) {
  const W = 520, pl = 40, pr = 14, pt = 24, pb = 42;
  const dataMax = Math.max(1, ...rows.map(r=>r.value));
  const { niceMax, step } = fixedMax ? { niceMax: fixedMax, step: fixedMax/4 } : niceScale(dataMax);
  const plotW = W-pl-pr, plotH = height-pt-pb;
  const n = rows.length || 1, band = plotW/n, barW = Math.min(56, band*0.5);
  const X = (i) => pl + band*i + band/2;
  const Y = (v) => pt + plotH - (v/niceMax)*plotH;
  const grid = []; for (let v=0; v<=niceMax+1e-6; v+=step) grid.push(v);
  const tr = (s,m) => (s.length>m ? s.slice(0,m-1)+"…" : s);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display:"block", height:"auto" }}>
      {grid.map((v,i) => (
        <g key={i}>
          <line x1={pl} y1={Y(v)} x2={W-pr} y2={Y(v)} stroke={C.grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={pl-8} y={Y(v)+4} textAnchor="end" fontFamily={FONT} fontSize={11} fill={C.axis}>{grp(v)}</text>
        </g>
      ))}
      {rows.map((r,i) => {
        const h = (r.value/niceMax)*plotH;
        return (
          <g key={i}>
            <rect x={X(i)-barW/2} y={Y(r.value)} width={barW} height={h} rx={4} fill={r.color || C.navy} />
            <text x={X(i)} y={Y(r.value)-8} textAnchor="middle" fontFamily={FONT} fontSize={12.5} fontWeight={800} fill={C.text}>{grp(r.value)}</text>
            <text x={X(i)} y={height-14} textAnchor="middle" fontFamily={FONT} fontSize={10.5} fill={C.sub}>{tr(r.label, 14)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── SVG: grouped bars (bucket groups × subsegment series) ──────────────── */
function GroupedBars({ buckets, series, height = 230 }) {
  const W = 560, pl = 36, pr = 14, pt = 20, pb = 36;
  const plotW = W-pl-pr, plotH = height-pt-pb;
  const vals = buckets.flatMap(b => series.map(sr => (b.values[sr.label] != null ? b.values[sr.label] : 0)));
  const { niceMax, step } = niceScale(Math.max(1, ...vals));
  const nB = buckets.length || 1, band = plotW/nB;
  const nS = series.length || 1;
  const barW = Math.min(26, (band*0.72)/nS);
  const Y = (v) => pt + plotH - (v/niceMax)*plotH;
  const grid = []; for (let v=0; v<=niceMax+1e-6; v+=step) grid.push(v);
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display:"block", height:"auto" }}>
      {grid.map((v,i) => (
        <g key={i}>
          <line x1={pl} y1={Y(v)} x2={W-pr} y2={Y(v)} stroke={C.grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={pl-7} y={Y(v)+4} textAnchor="end" fontFamily={FONT} fontSize={10.5} fill={C.axis}>{fmt(v)}</text>
        </g>
      ))}
      {buckets.map((b,bi) => {
        const groupW = barW*nS + 3*(nS-1);
        const gx = pl + band*bi + (band-groupW)/2;
        return (
          <g key={bi}>
            {series.map((sr,si) => {
              const v = b.values[sr.label];
              if (v == null) return null;
              const x = gx + si*(barW+3);
              return (
                <g key={si}>
                  <rect x={x} y={Y(v)} width={barW} height={(v/niceMax)*plotH} rx={2.5} fill={sr.color} />
                  <text x={x+barW/2} y={Y(v)-5} textAnchor="middle" fontFamily={FONT} fontSize={9.5} fontWeight={700} fill={C.text}>{fmt(v)}</text>
                </g>
              );
            })}
            <text x={pl + band*bi + band/2} y={height-12} textAnchor="middle" fontFamily={FONT} fontSize={11} fill={C.sub}>{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
const SeriesLegend = ({ series }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:7, minWidth:150 }}>
    <div style={{ fontSize:11, fontWeight:800, color:C.navyDk }}>SubSegment</div>
    {series.map((sr,i) => (
      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11.5 }}>
        <span style={{ width:10, height:10, borderRadius:2, background:sr.color, flex:"none" }} />
        <span style={{ color:C.text }}>{sr.label}</span>
      </div>
    ))}
  </div>
);

/* ── data hook ──────────────────────────────────────────────────────────── */
/* Nothing is rendered from this shape until `ready` is true — no figure on the
   page is ever invented. */
const EMPTY = {
  ready:false, donut:[], donutTotal:0, segmentBar:[], segScoreBar:[],
  subsegCharts:[], employeePerf:[], avgScore:null, submitted:null, draft:null,
};

function useAuditDashboard({ range, customFrom, customTo }) {
  const [rows, setRows]   = useState(null);    // submitted rows (period) | null
  const [detail, setDetail] = useState(null);  // per-criteria rows (period + prev 3 months) | null
  const [drafts, setDrafts] = useState(null);  // draft rows | null
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  // Sequence guard: a fast range switch must not let the OLDER response land
  // last and repaint stale figures over the newer ones.
  const seqRef = useRef(0);

  // Custom Range half-entered or reversed: there is nothing to ask the API for.
  const awaitingInput = !periodBounds(range, customFrom, customTo);

  const load = useCallback(async (signal) => {
    const b = periodBounds(range, customFrom, customTo);
    if (!b) { seqRef.current++; setRows(null); setDetail(null); setDrafts(null); setErr(""); setLoading(false); return; }
    const seq = ++seqRef.current;
    setLoading(true); setErr("");
    // Detailed rows are widened to the previous 3 months so the subsegment
    // charts can compare "previous 3 months" against the selected period.
    const prevStart = new Date(b.start); prevStart.setMonth(prevStart.getMonth() - 3);
    try {
      const [sumRes, detRes, draftRes] = await Promise.all([
        apiPost(`${API_BASE_URL}/api/Audit/LoadAuditSummaryReport`, { fromDate: iso(b.start), toDate: iso(b.end), dateFlag: "1" }, signal),
        apiPost(`${API_BASE_URL}/api/Audit/LoadAuditDetailedReport`, { fromDate: iso(prevStart), toDate: iso(b.end), dateFlag: "1" }, signal),
        apiPost(`${API_BASE_URL}/api/Audit/LoadDraftAudits/1`, {}, signal),
      ]);
      if (!sumRes.ok) throw new Error(`HTTP ${sumRes.status}`);
      const nextRows   = asArray(await sumRes.json().catch(()=>[]));
      const nextDetail = detRes && detRes.ok ? asArray(await detRes.json().catch(()=>[])) : [];
      const nextDrafts = draftRes && draftRes.ok ? asArray(await draftRes.json().catch(()=>[])) : [];
      if (seq !== seqRef.current) return;   // superseded by a newer request
      setRows(nextRows); setDetail(nextDetail); setDrafts(nextDrafts); setUpdatedAt(new Date());
    } catch (e) {
      if (e?.name === "AbortError" || seq !== seqRef.current) return;
      setErr(e?.message || "Failed to load"); setRows(null); setDetail(null); setDrafts(null); setUpdatedAt(null);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [range, customFrom, customTo]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [range, customFrom, customTo, load]);

  const data = useMemo(() => {
    const b = periodBounds(range, customFrom, customTo);
    // Not fetched yet, failed, or no usable period: render nothing rather than
    // anything invented. The caller shows the loader / retry panel instead.
    if (!Array.isArray(rows) || !b) return EMPTY;

    // Summary rows are fetched for the period itself; keep the date guard as a
    // belt-and-braces filter (the API compares on SUBMITTEDDATE server-side).
    const inPeriod = rows.filter(r => { const d = parseDMY(r.submittedDate) || parseDMY(r.auditDate); return !d || (d >= b.start && d <= b.end); });
    const submitted = inPeriod.length;
    const draft = (drafts || []).length;

    // Segment-wise submitted (period)
    const segMap = new Map();
    inPeriod.forEach(r => { const k = (r.auditSegment || "—").trim(); segMap.set(k, (segMap.get(k)||0) + 1); });
    const segmentBar = [...segMap.entries()].map(([label,value]) => ({ label, value }))
      .sort((a,b2)=>b2.value-a.value).slice(0,8).map((s,i)=>({ ...s, color:CAT_COLORS[i%CAT_COLORS.length] }));

    // Avg score (period)
    const scores = inPeriod.map(r => num(r.auditScore)).filter(v => v > 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a,v)=>a+v,0)/scores.length) : null;

    // Average audit score by segment (selected period, fixed 0-100)
    const segScore = new Map();
    inPeriod.forEach(r => {
      const sc = num(r.auditScore); if (sc <= 0) return;
      const k = (r.auditSegment || "—").trim();
      const e = segScore.get(k) || { sum:0, cnt:0 };
      e.sum += sc; e.cnt += 1; segScore.set(k, e);
    });
    const segScoreBar = [...segScore.entries()]
      .map(([label,e]) => ({ label, value: Math.round(e.sum/e.cnt) }))
      .sort((a,b2)=>b2.value-a.value).slice(0,10)
      .map((r,i)=>({ ...r, color:CAT_COLORS[i%CAT_COLORS.length] }));

    // Audit score by subsegment — per segment, previous 3 months vs selected
    // period, from the per-criteria detailed rows (avg of the criteria score).
    const detailRows = Array.isArray(detail) ? detail : [];
    const bySeg = new Map();
    detailRows.forEach(r => {
      const d = parseDMY(r.submittedDate) || parseDMY(r.auditDate);
      const sc = num(r.score); if (!d || sc <= 0) return;
      const inCur = d >= b.start && d <= b.end;
      if (!inCur && d >= b.start) return; // future-dated guard
      const segKey = (r.auditSegment || "—").trim();
      const subKey = (r.subSegment || "—").trim();
      const seg2 = bySeg.get(segKey) || new Map();
      const sub = seg2.get(subKey) || { prevSum:0, prevCnt:0, curSum:0, curCnt:0 };
      if (inCur) { sub.curSum += sc; sub.curCnt += 1; } else { sub.prevSum += sc; sub.prevCnt += 1; }
      seg2.set(subKey, sub); bySeg.set(segKey, seg2);
    });
    const round1 = (v) => Math.round(v*10)/10;
    const subsegCharts = [...bySeg.entries()].map(([segment, subs]) => {
      const series = [...subs.keys()].sort().map((label,i) => ({ label, color:CAT_COLORS[i%CAT_COLORS.length] }));
      const bucketOf = (pick) => {
        const values = {};
        series.forEach(sr => {
          const e = subs.get(sr.label);
          const cnt = pick === "prev" ? e.prevCnt : e.curCnt;
          const sum = pick === "prev" ? e.prevSum : e.curSum;
          values[sr.label] = cnt ? round1(sum/cnt) : null;
        });
        return values;
      };
      return {
        segment, series,
        buckets: [
          { label:"Previous 3 months", values: bucketOf("prev") },
          { label:"Selected period",   values: bucketOf("cur") },
        ],
      };
    }).sort((a,b2)=>a.segment.localeCompare(b2.segment));

    // Employee performance — audited employees in the period, by segment,
    // score highest first (average when audited more than once).
    const byEmp = new Map();
    inPeriod.forEach(r => {
      const sc = num(r.auditScore); if (sc <= 0) return;
      const segKey = (r.auditSegment || "—").trim();
      const name = (r.employeeName || r.employeeCode || "—").trim();
      const key = segKey + "||" + name;
      const e = byEmp.get(key) || { segment:segKey, name, sum:0, cnt:0 };
      e.sum += sc; e.cnt += 1; byEmp.set(key, e);
    });
    const perfSegs = new Map();
    [...byEmp.values()].forEach(e => {
      const list = perfSegs.get(e.segment) || [];
      list.push({ name:e.name, audits:e.cnt, avg: Math.round(e.sum/e.cnt) });
      perfSegs.set(e.segment, list);
    });
    const employeePerf = [...perfSegs.entries()]
      .map(([segment, list]) => ({ segment, rows: list.sort((a,b2)=>b2.avg-a.avg) }))
      .sort((a,b2)=>a.segment.localeCompare(b2.segment));

    return {
      ready:true,
      donut:[{ label:"Submitted", value:submitted, color:C.cvt }, { label:"Draft", value:draft, color:C.wip }],
      donutTotal: submitted + draft, segmentBar, segScoreBar, subsegCharts, employeePerf,
      avgScore, submitted, draft,
    };
  }, [rows, detail, drafts, range, customFrom, customTo]);

  return { data, loading, err, awaitingInput, updatedAt, reload: () => load() };
}

/* ── UI helpers ─────────────────────────────────────────────────────────── */
const RANGES = ["Current Date","Current Week","Current Month","Custom Range"];
const seg = { display:"flex", gap:3, background:"#eef2f7", border:`1px solid ${C.border}`, borderRadius:9, padding:3 };
const CardShell = ({ title, sub, children }) => (
  <div style={card}>
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:13, fontWeight:800, color:C.navyDk }}>{title}</div>
      {sub && <div style={{ fontSize:11.5, color:C.sub, marginTop:3 }}>{sub}</div>}
    </div>
    {children}
  </div>
);
const Empty = ({ text }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:180, color:"#9aa4b1", fontSize:13, textAlign:"center", padding:"0 8px" }}>{text}</div>
);

/* ── loading state — shown INSTEAD of sample figures ─────────────────────── */
/* Mirrors the real layout (4 KPI tiles, then chart cards) so the page does not
   jump when the response lands. */
const AuditDashboardLoading = () => (
  <div>
    <div style={{ ...card, marginBottom:16 }}>
      <div style={{ maxWidth:420 }}><DashboardLoadingBar label="Fetching audit data…" /></div>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:16 }}>
      {[0,1,2,3].map((k) => <TileSkeleton key={k} />)}
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:16, marginBottom:16 }}>
      <div style={card}><ChartLoading height={210} label={null} /></div>
      <div style={card}><ChartLoading height={210} label={null} /></div>
    </div>
    <div style={{ marginBottom:24 }}>
      <div style={card}><ChartLoading height={230} label={null} /></div>
    </div>
  </div>
);

/* ── main ───────────────────────────────────────────────────────────────── */
const AuditDashboard = () => {
  const [range, setRange] = useState("Current Month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { data, loading, err, awaitingInput, updatedAt, reload } = useAuditDashboard({ range, customFrom, customTo });
  const lastUpdated = updatedAt ? updatedAt.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "—";
  const invalidCustom = range === "Custom Range" && customFrom && customTo && new Date(customTo) < new Date(customFrom);

  return (
    <div style={{ fontFamily:FONT, minHeight:"100vh", color:C.text }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:12, color:C.sub }}>
            <span style={{ color:C.navy, fontWeight:600 }}>Dashboard</span>
            <span style={{ margin:"0 7px", color:"#c2ccd6" }}>›</span>Audit
          </div>
          <div style={{ fontWeight:800, fontSize:22, color:C.navyDk, marginTop:3 }}>Audit Overview</div>
        </div>
        <div style={seg}>
          {RANGES.map((r) => {
            const a = range === r;
            return (
              <button key={r} onClick={() => setRange(r)}
                style={{ border:"none", cursor:"pointer", fontFamily:FONT, fontSize:12.5, fontWeight:a?800:600,
                  padding:"6px 12px", borderRadius:7, background:a?"#fff":"transparent", color:a?C.navy:C.sub,
                  boxShadow:a?"0 1px 3px rgba(20,30,45,.12)":"none" }}>{r}</button>
            );
          })}
        </div>
      </div>

      {range === "Custom Range" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap", justifyContent:"flex-end" }}>
          <label style={{ fontSize:13, color:C.sub, display:"flex", alignItems:"center", gap:6 }}>From
            <input type="date" value={customFrom} onChange={(e)=>setCustomFrom(e.target.value)}
              style={{ padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT }} />
          </label>
          <label style={{ fontSize:13, color:C.sub, display:"flex", alignItems:"center", gap:6 }}>To
            <input type="date" value={customTo} min={customFrom||undefined} onChange={(e)=>setCustomTo(e.target.value)}
              style={{ padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT }} />
          </label>
          {invalidCustom && <span style={{ fontSize:12, color:C.open, fontWeight:700 }}>To Date cannot be earlier than From Date.</span>}
        </div>
      )}

      {/* status line */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <span style={{ fontSize:11.5, fontWeight:700, padding:"3px 10px", borderRadius:20,
          background: err ? "#FDF0EC" : data.ready ? "#E6F1EC" : "#EEF2F7",
          color:      err ? "#B0503A" : data.ready ? C.cvt    : C.sub }}>
          {loading ? "Loading…" : err ? "Not loaded" : data.ready ? "Live data" : "No data"}
        </span>
        <span style={{ fontSize:12, color:C.sub }}>Last updated {lastUpdated}</span>
        <button onClick={reload} style={{ marginLeft:"auto", cursor:"pointer", fontFamily:FONT, fontSize:12, fontWeight:600, padding:"6px 12px", borderRadius:9, background:"#fff", color:C.navy, border:`1px solid ${C.border}` }}>Refresh</button>
      </div>

      {/* Body — loader while in flight, retry panel on failure, real figures once
          the response lands. Never a placeholder number. */}
      {loading ? <AuditDashboardLoading />
      : err ? <LoadError height={220} message="Could not load audit data." retryLabel="Retry" onRetry={reload} />
      : awaitingInput ? <div style={card}><Empty text="Choose a From and To date to load the audit dashboard." /></div>
      : (
      <>
      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:16 }}>
        {[
          { l:"Submitted", v:data.submitted, c:C.cvt },
          { l:"Draft",     v:data.draft,     c:C.wip },
          { l:"Total",     v:data.donutTotal, c:C.navy },
          { l:"Avg score", v:data.avgScore == null ? "—" : data.avgScore, c:C.navyDk }, // — = no scored audits, not "not loaded"
        ].map((k) => (
          <div key={k.l} style={{ ...card, borderRadius:14, padding:"15px 18px" }}>
            <div style={{ fontSize:26, fontWeight:800, color:k.c }}>{typeof k.v === "number" ? grp(k.v) : k.v}</div>
            <div style={{ fontSize:12.5, color:C.sub, fontWeight:600, marginTop:4 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Donut + segment bar */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:16, marginBottom:16 }}>
        <CardShell title="Draft vs. submitted audits" sub="Within the selected period">
          {data.donutTotal > 0 ? <Donut segments={data.donut} centerValue={data.donutTotal} /> : <Empty text="No audits in the selected period." />}
        </CardShell>
        <CardShell title="Segment-wise audits submitted" sub="Submitted audits grouped by segment">
          {data.segmentBar.length ? <VerticalBar rows={data.segmentBar} /> : <Empty text="No submitted audits in the selected period." />}
        </CardShell>
      </div>

      {/* Average score by segment (replaces the monthly score-trend line) */}
      <div style={{ marginBottom:16 }}>
        <CardShell title="Average audit score by segment" sub="Within the selected period · fixed 0–100 scale">
          {data.segScoreBar.length ? <VerticalBar rows={data.segScoreBar} fixedMax={100} /> : <Empty text="No scored audits in the selected period." />}
        </CardShell>
      </div>

      {/* Audit score by subsegment — per segment, previous 3 months vs period */}
      {data.subsegCharts.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(420px,1fr))", gap:16, marginBottom:16 }}>
          {data.subsegCharts.map((ch) => (
            <CardShell key={ch.segment} title={`${ch.segment} — score by subsegment`} sub="Average criteria score · previous 3 months vs selected period">
              <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
                <div style={{ flex:"1 1 300px", minWidth:260 }}>
                  <GroupedBars buckets={ch.buckets} series={ch.series} />
                </div>
                <SeriesLegend series={ch.series} />
              </div>
            </CardShell>
          ))}
        </div>
      )}

      {/* Employee performance — audited employees, by segment, highest first */}
      <div style={{ marginBottom:24 }}>
        <CardShell title="Employee performance" sub="Employees audited in the selected period · arranged by segment, score highest to lowest">
          {data.employeePerf.length === 0 ? <Empty text="No scored audits in the selected period." /> : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:18 }}>
              {data.employeePerf.map((grpBlock) => (
                <div key={grpBlock.segment}>
                  <div style={{ fontSize:12.5, fontWeight:800, color:C.navyDk, marginBottom:8 }}>{grpBlock.segment}</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                    <thead>
                      <tr>
                        {["Employee","Audits","Avg score"].map((h,i) => (
                          <th key={h} style={{ textAlign:i===0?"left":"right", padding:"6px 8px", color:C.sub, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grpBlock.rows.map((r,i) => (
                        <tr key={i}>
                          <td style={{ padding:"6px 8px", borderBottom:`1px solid ${C.grid}`, color:C.text, fontWeight:600 }}>{r.name}</td>
                          <td style={{ padding:"6px 8px", borderBottom:`1px solid ${C.grid}`, textAlign:"right", color:C.sub }}>{grp(r.audits)}</td>
                          <td style={{ padding:"6px 8px", borderBottom:`1px solid ${C.grid}`, textAlign:"right", fontWeight:800,
                            color: r.avg >= 85 ? C.cvt : r.avg >= 60 ? C.wip : C.open }}>{grp(r.avg)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </CardShell>
      </div>
      </>
      )}
    </div>
  );
};

export default function AuditDashboardGated() {
  return (
    <DashboardGate code={DASHBOARD_VIEW.AUDIT_DASHBOARD}>
      <AuditDashboard />
    </DashboardGate>
  );
}