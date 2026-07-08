// src/pages/Appointment/AppointmentDashboard.jsx
// Appointment Management dashboard — Dashboards FRD §4.2. Self-contained, `C`
// palette, hand-rolled SVG. Source: POST /api/Appointment/AppDashboard.
//   - Status-wise count ......... Donut (Completed/Scheduled/No-show/Cancelled) [Fig 4]
//   - No-show / cancellation .... 2-line trend over the period                  [Fig 5]
//   - Practitioner utilization .. Vertical bars vs. a target line               [Fig 6]
import { useState, useEffect, useMemo, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const C = {
  navy:"#334b71", navyDk:"#071D49", open:"#cc6b5c", wip:"#d4a853", closed:"#8da0b8",
  cvt:"#4a9e8a", grid:"#eef2f7", axis:"#6e7b8f", border:"#e7ecf4", text:"#10223f", sub:"#64748b",
};
const FONT = "Lato,sans-serif";
const card = { background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.05)" };
const grp = (n) => Math.round(Number(n)||0).toLocaleString("en-US");
const num = (v) => (Number.isFinite(+v) ? +v : 0);
const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const iso = (d) => d.toISOString().slice(0,10);
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function periodBounds(range, f, t) {
  const today = new Date();
  const start = new Date(today); start.setHours(0,0,0,0);
  const end   = new Date(today); end.setHours(23,59,59,999);
  if (range === "Current Week")  start.setDate(today.getDate() - today.getDay());
  else if (range === "Current Month") start.setDate(1);
  else if (range === "Custom Range") {
    if (!f || !t) return null;
    const s = new Date(f); s.setHours(0,0,0,0); const e = new Date(t); e.setHours(23,59,59,999);
    if (e < s) return null; return { start:s, end:e };
  }
  return { start, end };
}
// group daily rows into up to `max` consecutive buckets
function bucketize(daily, max = 6) {
  if (!daily.length) return [];
  const size = Math.ceil(daily.length / max);
  const out = [];
  for (let i = 0; i < daily.length; i += size) {
    const chunk = daily.slice(i, i + size);
    const total = chunk.reduce((a,r)=>a+r.total,0);
    const noShow = chunk.reduce((a,r)=>a+r.noShow,0);
    const cancelled = chunk.reduce((a,r)=>a+r.cancelled,0);
    const d = new Date(chunk[0].date);
    out.push({
      label: isNaN(d) ? chunk[0].date : `${MON[d.getMonth()]} ${d.getDate()}`,
      noShowRate: total ? +(noShow/total*100).toFixed(1) : 0,
      cancelRate: total ? +(cancelled/total*100).toFixed(1) : 0,
    });
  }
  return out;
}

/* Donut */
function Donut({ segments, centerValue, unit = "appts", size = 184, thickness = 28 }) {
  const total = segments.reduce((a,s)=>a+(s.value||0),0);
  const r=(size-thickness)/2, cx=size/2, cy=size/2, CIRC=2*Math.PI*r; let off=0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:22, flexWrap:"wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex:"none" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f4" strokeWidth={thickness} />
        {total>0 && segments.map((s,i)=>{ const len=(s.value/total)*CIRC; const el=(<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${len} ${CIRC-len}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />); off+=len; return el; })}
        <text x={cx} y={cy-3} textAnchor="middle" fontFamily={FONT} fontSize={30} fontWeight={800} fill={C.text}>{grp(centerValue!=null?centerValue:total)}</text>
        <text x={cx} y={cy+18} textAnchor="middle" fontFamily={FONT} fontSize={12} fontWeight={600} fill={C.sub}>{unit}</text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:10, minWidth:140 }}>
        {segments.map((s,i)=>{ const pct=total?Math.round((s.value/total)*100):0; return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:9, fontSize:12.5 }}>
            <span style={{ width:11, height:11, borderRadius:3, background:s.color, flex:"none" }} />
            <span style={{ fontWeight:700, color:C.text }}>{s.label}</span>
            <span style={{ marginLeft:"auto", color:C.sub }}>{grp(s.value)} · {pct}%</span>
          </div>
        ); })}
      </div>
    </div>
  );
}

/* Two-line trend (rates %) */
function TrendLines({ points, height = 240 }) {
  const W=560, pl=40, pr=16, pt=18, pb=34, plotW=W-pl-pr, plotH=height-pt-pb;
  const maxRaw = Math.max(5, ...points.flatMap(p=>[p.noShowRate,p.cancelRate]));
  const max = Math.ceil(maxRaw/5)*5;
  const n = points.length;
  const X=(i)=> n<=1 ? pl+plotW/2 : pl + (i*plotW)/(n-1);
  const Y=(v)=> pt + plotH - (v/max)*plotH;
  const path=(key)=>points.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(p[key]).toFixed(1)).join(" ");
  const ticks=[0,0.25,0.5,0.75,1].map(f=>Math.round(max*f));
  const lines=[{key:"noShowRate",c:C.open,name:"No-show rate %"},{key:"cancelRate",c:C.wip,name:"Cancellation rate %"}];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display:"block", height:"auto" }}>
        {ticks.map((v,i)=>(<g key={i}><line x1={pl} y1={Y(v)} x2={W-pr} y2={Y(v)} stroke={C.grid} strokeWidth={1} vectorEffect="non-scaling-stroke" /><text x={pl-8} y={Y(v)+4} textAnchor="end" fontFamily={FONT} fontSize={11} fill={C.axis}>{v}</text></g>))}
        {points.map((p,i)=>(<text key={i} x={X(i)} y={height-12} textAnchor="middle" fontFamily={FONT} fontSize={11} fill={C.sub}>{p.label}</text>))}
        {lines.map((ln,li)=>(<g key={li}>
          {n>0 && <path d={path(ln.key)} fill="none" stroke={ln.c} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          {points.map((p,i)=><circle key={i} cx={X(i)} cy={Y(p[ln.key])} r={3.2} fill="#fff" stroke={ln.c} strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
        </g>))}
      </svg>
      <div style={{ display:"flex", gap:18, marginTop:8, justifyContent:"center" }}>
        {lines.map((ln,i)=>(<div key={i} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12.5 }}><span style={{ width:16, height:3, borderRadius:2, background:ln.c }} /><span style={{ color:C.sub, fontWeight:600 }}>{ln.name}</span></div>))}
      </div>
    </div>
  );
}

/* Vertical bars with a target line */
const niceScale = (max, ticks=4) => { const raw=max/ticks||1; const mag=Math.pow(10,Math.floor(Math.log10(raw))); const norm=raw/mag; const step=(norm<=1?1:norm<=2?2:norm<=5?5:10)*mag; return { niceMax:Math.ceil(max/step)*step||step, step }; };
function UtilBars({ rows, target = 80, height = 270 }) {
  const W=620, pl=44, pr=16, pt=24, pb=78, plotW=W-pl-pr, plotH=height-pt-pb;
  const niceMax = Math.max(100, Math.ceil(Math.max(target, ...rows.map(r=>r.value))/10)*10);
  const n=rows.length||1, band=plotW/n, barW=Math.min(48, band*0.5);
  const X=(i)=>pl+band*i+band/2, Y=(v)=>pt+plotH-(v/niceMax)*plotH;
  const grid=[]; for(let v=0; v<=niceMax+1e-6; v+=niceMax/4) grid.push(Math.round(v));
  const tr=(s,m)=>(s.length>m?s.slice(0,m-1)+"…":s);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display:"block", height:"auto" }}>
      {grid.map((v,i)=>(<g key={i}><line x1={pl} y1={Y(v)} x2={W-pr} y2={Y(v)} stroke={C.grid} strokeWidth={1} vectorEffect="non-scaling-stroke" /><text x={pl-8} y={Y(v)+4} textAnchor="end" fontFamily={FONT} fontSize={11} fill={C.axis}>{v}</text></g>))}
      {rows.map((r,i)=>{ const h=(r.value/niceMax)*plotH; const col=r.value>=target?C.cvt:(r.value>=target*0.8?C.wip:C.open); return (
        <g key={i}>
          <rect x={X(i)-barW/2} y={Y(r.value)} width={barW} height={h} rx={4} fill={col} />
          <text x={X(i)} y={Y(r.value)-8} textAnchor="middle" fontFamily={FONT} fontSize={12} fontWeight={800} fill={C.text}>{`${r.value}%`}</text>
          <text transform={`rotate(-30 ${X(i)} ${height-pb+16})`} x={X(i)} y={height-pb+16} textAnchor="end" fontFamily={FONT} fontSize={10.5} fill={C.sub}>{tr(r.name,16)}</text>
        </g>
      ); })}
      <line x1={pl} y1={Y(target)} x2={W-pr} y2={Y(target)} stroke={C.navyDk} strokeWidth={1.5} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
      <text x={W-pr} y={Y(target)-6} textAnchor="end" fontFamily={FONT} fontSize={11} fontWeight={700} fill={C.navyDk}>{`Target ${target}%`}</text>
    </svg>
  );
}

const MOCK = {
  status: { completed: 380, scheduled: 147, noShow: 49, cancelled: 36, total: 612 },
  trend: [
    { label:"W1", noShowRate:9, cancelRate:6 }, { label:"W2", noShowRate:8, cancelRate:7 },
    { label:"W3", noShowRate:11, cancelRate:5 }, { label:"W4", noShowRate:7, cancelRate:6 },
    { label:"W5", noShowRate:6, cancelRate:8 }, { label:"W6", noShowRate:8, cancelRate:5 },
  ],
  practitioners: [
    { name:"A. Rossi", value:92 }, { name:"J. Doe", value:78 }, { name:"M. Chen", value:85 },
    { name:"R. Malhotra", value:64 }, { name:"S. Iyer", value:71 },
  ],
};

function useApptDashboard({ range, customFrom, customTo }) {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true); setErr("");
    const b = periodBounds(range, customFrom, customTo);
    if (!b) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/Appointment/AppDashboard`, {
        method:"POST", credentials:"include",
        headers:{ "Content-Type":"application/json", ...(TOKEN()?{ Authorization:`Bearer ${TOKEN()}` }:{}) },
        body: JSON.stringify({ fromDate: iso(b.start), toDate: iso(b.end) }), signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json(); const d = body?.data ?? body;
      setRaw(d); setUpdatedAt(new Date());
    } catch (e) { if (e?.name==="AbortError") return; setErr(e?.message||"Failed"); setRaw(null); setUpdatedAt(new Date()); }
    finally { setLoading(false); }
  }, [range, customFrom, customTo]);

  useEffect(() => { const ctrl = new AbortController(); load(ctrl.signal); return () => ctrl.abort(); }, [range, customFrom, customTo, load]);

  const data = useMemo(() => {
    const live = !!raw && raw.status;
    const st = live ? raw.status : MOCK.status;
    const trend = live ? bucketize((raw.daily||[]).map(x=>({ date:x.date, total:num(x.total), noShow:num(x.noShow), cancelled:num(x.cancelled) }))) : MOCK.trend;
    const pracRows = live ? (raw.practitioners||[]).slice(0,8).map(p=>({ name:p.name, value:num(p.utilization) })) : MOCK.practitioners;
    return {
      live: !!live,
      status: { completed:num(st.completed), scheduled:num(st.scheduled), noShow:num(st.noShow), cancelled:num(st.cancelled), total:num(st.total) || (num(st.completed)+num(st.scheduled)+num(st.noShow)+num(st.cancelled)) },
      trend: trend.length ? trend : MOCK.trend,
      practitioners: pracRows,
    };
  }, [raw]);

  return { data, loading, err, updatedAt, reload: () => load() };
}

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
const Empty = ({ text }) => (<div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:180, color:"#9aa4b1", fontSize:13 }}>{text}</div>);

export default function AppointmentDashboard() {
  const [range, setRange] = useState("Current Month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { data, loading, err, updatedAt, reload } = useApptDashboard({ range, customFrom, customTo });
  const lastUpdated = updatedAt ? updatedAt.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "—";
  const invalid = range === "Custom Range" && customFrom && customTo && new Date(customTo) < new Date(customFrom);
  const st = data.status;

  return (
    <div style={{ fontFamily:FONT, minHeight:"100vh", color:C.text, padding:"4px 0 40px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:12, color:C.sub }}><span style={{ color:C.navy, fontWeight:600 }}>Dashboard</span><span style={{ margin:"0 7px", color:"#c2ccd6" }}>›</span>Appointment Management</div>
          <div style={{ fontWeight:800, fontSize:22, color:C.navyDk, marginTop:3 }}>Appointment Management</div>
        </div>
        <div style={seg}>
          {RANGES.map((r)=>{ const a=range===r; return (<button key={r} onClick={()=>setRange(r)} style={{ border:"none", cursor:"pointer", fontFamily:FONT, fontSize:12.5, fontWeight:a?800:600, padding:"6px 12px", borderRadius:7, background:a?"#fff":"transparent", color:a?C.navy:C.sub, boxShadow:a?"0 1px 3px rgba(20,30,45,.12)":"none" }}>{r}</button>); })}
        </div>
      </div>

      {range === "Custom Range" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap", justifyContent:"flex-end" }}>
          <label style={{ fontSize:13, color:C.sub, display:"flex", alignItems:"center", gap:6 }}>From<input type="date" value={customFrom} onChange={(e)=>setCustomFrom(e.target.value)} style={{ padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT }} /></label>
          <label style={{ fontSize:13, color:C.sub, display:"flex", alignItems:"center", gap:6 }}>To<input type="date" value={customTo} min={customFrom||undefined} onChange={(e)=>setCustomTo(e.target.value)} style={{ padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT }} /></label>
          {invalid && <span style={{ fontSize:12, color:C.open, fontWeight:700 }}>To Date cannot be earlier than From Date.</span>}
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <span style={{ fontSize:11.5, fontWeight:700, padding:"3px 10px", borderRadius:20, background:data.live?"#E6F1EC":"#F6EBD9", color:data.live?C.cvt:"#B07C28" }}>{loading?"Loading…":data.live?"Live data":"Sample data"}</span>
        <span style={{ fontSize:12, color:C.sub }}>Last updated {lastUpdated}</span>
        {err && !data.live && <span style={{ fontSize:11.5, color:"#b0704f" }}>API unreachable — showing sample figures</span>}
        <button onClick={reload} style={{ marginLeft:"auto", cursor:"pointer", fontFamily:FONT, fontSize:12, fontWeight:600, padding:"6px 12px", borderRadius:9, background:"#fff", color:C.navy, border:`1px solid ${C.border}` }}>Refresh</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:16 }}>
        {[{l:"Total",v:st.total,c:C.navy},{l:"Completed",v:st.completed,c:C.cvt},{l:"Scheduled",v:st.scheduled,c:C.navy},{l:"No-show",v:st.noShow,c:C.open},{l:"Cancelled",v:st.cancelled,c:C.wip}].map(k=>(
          <div key={k.l} style={{ ...card, borderRadius:14, padding:"15px 18px" }}><div style={{ fontSize:26, fontWeight:800, color:k.c }}>{grp(k.v)}</div><div style={{ fontSize:12.5, color:C.sub, fontWeight:600, marginTop:4 }}>{k.l}</div></div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:16, marginBottom:16 }}>
        <CardShell title="Status-wise count" sub="Completed · Scheduled · No-show · Cancelled">
          {st.total>0 ? <Donut centerValue={st.total} segments={[
            { label:"Completed", value:st.completed, color:C.cvt },
            { label:"Scheduled", value:st.scheduled, color:C.navy },
            { label:"No-show",   value:st.noShow,    color:C.open },
            { label:"Cancelled", value:st.cancelled, color:C.wip },
          ]} /> : <Empty text="No appointments in the selected period." />}
        </CardShell>
        <CardShell title="No-show / cancellation trend" sub="Rates over the selected period">
          {data.trend.length ? <TrendLines points={data.trend} /> : <Empty text="No appointments to trend." />}
        </CardShell>
      </div>

      <div style={{ marginBottom:24 }}>
        <CardShell title="Practitioner utilization" sub="Completed / total per practitioner vs. an 80% target">
          {data.practitioners.length ? <UtilBars rows={data.practitioners} target={80} /> : <Empty text="No practitioner activity in the selected period." />}
        </CardShell>
      </div>
    </div>
  );
}