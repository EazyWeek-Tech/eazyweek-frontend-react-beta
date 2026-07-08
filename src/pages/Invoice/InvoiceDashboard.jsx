// src/pages/Invoice/InvoiceDashboard.jsx
// Invoicing & Refunds dashboard — Dashboards FRD §4.3. Self-contained, `C` palette.
// Source: GET /api/Invoice/Dashboard  (+ GET /api/EInvoice/LoadEInvoice for status).
//   - Sales trend .......... line + area                                  [Fig 7]
//   - Open vs. closed ...... donut (count + value)
//   - Sale by item type .... horizontal bars, Refunds negative/red        [Fig 8]
//   - Discount ............. daily discount bars (Promotion vs Manual split
//                            not stored separately — see note; BR-07)     [Fig 9]
//   - E-invoice status ..... Total / Success / Failed stacked bar (BR-08)  [Fig 10]
import { useState, useEffect, useMemo, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const C = {
  navy:"#334b71", navyDk:"#071D49", open:"#cc6b5c", wip:"#d4a853", closed:"#8da0b8",
  cvt:"#4a9e8a", grid:"#eef2f7", axis:"#6e7b8f", border:"#e7ecf4", text:"#10223f", sub:"#64748b",
};
const FONT = "Lato,sans-serif";
const card = { background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.05)" };
const num = (v) => (Number.isFinite(+v) ? +v : 0);
const grp = (n) => Math.round(Number(n)||0).toLocaleString("en-US");
const fmtSAR = (n) => { const v=Number(n)||0; const a=Math.abs(v); if(a>=1e6) return `SAR ${(v/1e6).toFixed(a>=1e7?1:2)}M`; if(a>=1e3) return `SAR ${(v/1e3).toFixed(1)}k`; return `SAR ${grp(v)}`; };
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
function bucketSeries(daily, key, max = 12) {
  if (!daily.length) return [];
  const size = Math.ceil(daily.length / max);
  const out = [];
  for (let i = 0; i < daily.length; i += size) {
    const chunk = daily.slice(i, i + size);
    const val = chunk.reduce((a,r)=>a+num(r[key]),0);
    const d = new Date(chunk[0].date);
    out.push({ label: isNaN(d) ? chunk[0].date : `${MON[d.getMonth()]} ${d.getDate()}`, value: val });
  }
  return out;
}
const ITEM_MAP = [
  { keys:["service"],  label:"Service" }, { keys:["package"], label:"Package" },
  { keys:["product"],  label:"Products" }, { keys:["advance"], label:"Advance" },
  { keys:["gift"],     label:"Gift Card" }, { keys:["refund"], label:"Refunds" },
];
function normalizeItemTypes(rows) {
  const acc = {};
  rows.forEach(r => {
    const t = String(r.itemType||"").toLowerCase();
    const hit = ITEM_MAP.find(m => m.keys.some(k => t.includes(k)));
    const label = hit ? hit.label : (r.itemType ? r.itemType : "Other");
    acc[label] = (acc[label]||0) + num(r.amount);
  });
  return ITEM_MAP.map(m => ({ label:m.label, value: acc[m.label]||0, refund:m.label==="Refunds" }))
    .map(x => x.refund ? { ...x, value: -Math.abs(x.value) } : x);
}

/* Donut */
function Donut({ segments, centerValue, unit, size = 176, thickness = 26 }) {
  const total = segments.reduce((a,s)=>a+(s.value||0),0);
  const r=(size-thickness)/2, cx=size/2, cy=size/2, CIRC=2*Math.PI*r; let off=0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:22, flexWrap:"wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex:"none" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f4" strokeWidth={thickness} />
        {total>0 && segments.map((s,i)=>{ const len=(s.value/total)*CIRC; const el=(<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${len} ${CIRC-len}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />); off+=len; return el; })}
        <text x={cx} y={cy-2} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={800} fill={C.text}>{grp(centerValue!=null?centerValue:total)}</text>
        <text x={cx} y={cy+18} textAnchor="middle" fontFamily={FONT} fontSize={12} fontWeight={600} fill={C.sub}>{unit}</text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:11, minWidth:170 }}>
        {segments.map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:9, fontSize:12.5 }}>
            <span style={{ width:11, height:11, borderRadius:3, background:s.color, flex:"none" }} />
            <span style={{ fontWeight:700, color:C.text }}>{s.label}</span>
            <span style={{ marginLeft:"auto", color:C.sub }}>{grp(s.value)}{s.sub?` · ${s.sub}`:""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Line + area (sales) */
function AreaLine({ points, height = 240 }) {
  const W=640, pl=78, pr=16, pt=18, pb=34, plotW=W-pl-pr, plotH=height-pt-pb;
  const max = Math.max(1, ...points.map(p=>p.value)); const n=points.length;
  const X=(i)=> n<=1 ? pl+plotW/2 : pl + (i*plotW)/(n-1);
  const Y=(v)=> pt + plotH - (v/max)*plotH;
  const line = points.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(p.value).toFixed(1)).join(" ");
  const area = points.length ? `${line} L${X(n-1)} ${pt+plotH} L${X(0)} ${pt+plotH} Z` : "";
  const ticks=[0,0.25,0.5,0.75,1].map(f=>max*f);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display:"block", height:"auto" }}>
      <defs><linearGradient id="salesg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.navy} stopOpacity={0.22} /><stop offset="100%" stopColor={C.navy} stopOpacity={0} /></linearGradient></defs>
      {ticks.map((v,i)=>(<g key={i}><line x1={pl} y1={Y(v)} x2={W-pr} y2={Y(v)} stroke={C.grid} strokeWidth={1} vectorEffect="non-scaling-stroke" /><text x={pl-8} y={Y(v)+4} textAnchor="end" fontFamily={FONT} fontSize={10.5} fill={C.axis}>{fmtSAR(v)}</text></g>))}
      {points.length>0 && <path d={area} fill="url(#salesg)" />}
      {points.length>0 && <path d={line} fill="none" stroke={C.navy} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {points.map((p,i)=><circle key={i} cx={X(i)} cy={Y(p.value)} r={3} fill="#fff" stroke={C.navy} strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
      {points.map((p,i)=>(i%Math.ceil(n/8||1)===0 || i===n-1) ? <text key={"x"+i} x={X(i)} y={height-12} textAnchor="middle" fontFamily={FONT} fontSize={10.5} fill={C.sub}>{p.label}</text> : null)}
    </svg>
  );
}

/* Horizontal bars (signed — refunds negative) */
function HBars({ rows, height }) {
  const W=620, labelW=94, valW=82, rowH=34, pt=8, pb=8;
  const H = height || pt+pb+rows.length*rowH;
  const plotL=labelW, plotR=W-valW, plotW=plotR-plotL;
  const vals=rows.map(r=>r.value);
  const maxPos=Math.max(0, ...vals, 1);
  const maxNeg=Math.max(0, ...vals.map(v=>-v));
  const hasNeg=maxNeg>0;
  const zeroX=hasNeg ? plotL + (maxNeg/(maxPos+maxNeg))*plotW : plotL;
  const scale=plotW/((maxPos+(hasNeg?maxNeg:0))||1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display:"block", height:"auto" }}>
      {hasNeg && <line x1={zeroX} y1={pt} x2={zeroX} y2={H-pb} stroke={C.border} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      {rows.map((r,i)=>{
        const y=pt+i*rowH+(rowH-16)/2, bh=16;
        const w=Math.abs(r.value)*scale;
        const x=r.value<0 ? zeroX-w : zeroX;
        const col=r.value<0 ? C.open : C.navy;
        return (
          <g key={i}>
            <text x={labelW-12} y={y+bh/2+4} textAnchor="end" fontFamily={FONT} fontSize={12} fill={C.text} fontWeight={600}>{r.label}</text>
            <rect x={x} y={y} width={Math.max(1,w)} height={bh} rx={3} fill={col} />
            <text x={W-valW+10} y={y+bh/2+4} textAnchor="start" fontFamily={FONT} fontSize={11.5} fontWeight={700} fill={r.value<0?C.open:C.text}>{fmtSAR(r.value)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* Vertical bars (discount) */
const niceScale = (max, ticks=4) => { const raw=max/ticks||1; const mag=Math.pow(10,Math.floor(Math.log10(raw||1))); const norm=raw/mag; const step=(norm<=1?1:norm<=2?2:norm<=5?5:10)*mag; return { niceMax:Math.ceil(max/step)*step||step, step }; };
function VBars({ rows, height = 220, color = C.navy }) {
  const W=640, pl=66, pr=14, pt=20, pb=40, plotW=W-pl-pr, plotH=height-pt-pb;
  const { niceMax, step } = niceScale(Math.max(1,...rows.map(r=>r.value)));
  const n=rows.length||1, band=plotW/n, barW=Math.min(46, band*0.55);
  const X=(i)=>pl+band*i+band/2, Y=(v)=>pt+plotH-(v/niceMax)*plotH;
  const grid=[]; for(let v=0; v<=niceMax+1e-6; v+=step) grid.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display:"block", height:"auto" }}>
      {grid.map((v,i)=>(<g key={i}><line x1={pl} y1={Y(v)} x2={W-pr} y2={Y(v)} stroke={C.grid} strokeWidth={1} vectorEffect="non-scaling-stroke" /><text x={pl-8} y={Y(v)+4} textAnchor="end" fontFamily={FONT} fontSize={10.5} fill={C.axis}>{fmtSAR(v)}</text></g>))}
      {rows.map((r,i)=>{ const h=(r.value/niceMax)*plotH; return (<g key={i}><rect x={X(i)-barW/2} y={Y(r.value)} width={barW} height={h} rx={4} fill={color} />{(i%Math.ceil(n/8||1)===0||i===n-1)&&<text x={X(i)} y={height-14} textAnchor="middle" fontFamily={FONT} fontSize={10.5} fill={C.sub}>{r.label}</text>}</g>); })}
    </svg>
  );
}

/* Stacked horizontal (e-invoice Total/Success/Failed) */
function EInvoiceBar({ success, failed }) {
  const total = success + failed; const W=620, H=90, pl=10, pr=10, y=24, h=34;
  const scale = total ? (W-pl-pr)/total : 0;
  const sw = success*scale, fw = failed*scale;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display:"block", height:"auto" }}>
        {total>0 ? (<>
          <rect x={pl} y={y} width={Math.max(0,sw)} height={h} fill={C.cvt} rx={0} />
          <rect x={pl+sw} y={y} width={Math.max(0,fw)} height={h} fill={C.open} />
          {sw>36 && <text x={pl+sw/2} y={y+h/2+4} textAnchor="middle" fontFamily={FONT} fontSize={13} fontWeight={800} fill="#fff">{grp(success)}</text>}
          {fw>28 && <text x={pl+sw+fw/2} y={y+h/2+4} textAnchor="middle" fontFamily={FONT} fontSize={13} fontWeight={800} fill="#fff">{grp(failed)}</text>}
        </>) : <text x={W/2} y={y+h/2+4} textAnchor="middle" fontFamily={FONT} fontSize={12} fill="#9aa4b1">No e-invoices in the selected period.</text>}
        <text x={pl} y={y+h+20} fontFamily={FONT} fontSize={12} fill={C.sub}>Total {grp(total)}</text>
      </svg>
      <div style={{ display:"flex", gap:18, justifyContent:"center", marginTop:4 }}>
        <span style={{ display:"flex", alignItems:"center", gap:7, fontSize:12.5 }}><span style={{ width:11, height:11, borderRadius:3, background:C.cvt }} /><span style={{ fontWeight:700 }}>Success</span> <span style={{ color:C.sub }}>{grp(success)}</span></span>
        <span style={{ display:"flex", alignItems:"center", gap:7, fontSize:12.5 }}><span style={{ width:11, height:11, borderRadius:3, background:C.open }} /><span style={{ fontWeight:700 }}>Failed</span> <span style={{ color:C.sub }}>{grp(failed)}</span></span>
      </div>
    </div>
  );
}

const MOCK = {
  salesDaily: Array.from({length:7},(_,i)=>({ date:`2026-07-0${i+1}`, sales:[3200,4100,3800,4600,5200,4900,2650][i] })),
  openClosed: { openCnt:38, openVal:210000, closedCnt:164, closedVal:980000 },
  itemType: [{itemType:"service",amount:172000},{itemType:"package",amount:98000},{itemType:"products",amount:52000},{itemType:"advance",amount:38000},{itemType:"gift card",amount:16000},{itemType:"refund",amount:9000}],
  discountDaily: Array.from({length:7},(_,i)=>({ date:`2026-07-0${i+1}`, discount:[1200,1450,980,1600,1300,1100,900][i] })),
  einvoice: { success:268, failed:14 },
};

function useInvoiceDashboard({ range, customFrom, customTo }) {
  const [raw, setRaw] = useState(null);
  const [ein, setEin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true); setErr("");
    const b = periodBounds(range, customFrom, customTo);
    if (!b) { setLoading(false); return; }
    const hdr = { headers:{ ...(TOKEN()?{ Authorization:`Bearer ${TOKEN()}` }:{}) }, credentials:"include", signal };
    try {
      const p = new URLSearchParams({ fromDate: iso(b.start), toDate: iso(b.end) });
      const res = await fetch(`${API_BASE_URL}/api/Invoice/Dashboard?${p}`, hdr);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json(); setRaw(body?.data ?? body);
      // E-invoice status (separate module; best-effort)
      try {
        const er = await fetch(`${API_BASE_URL}/api/EInvoice/LoadEInvoice`, hdr);
        const ej = await er.json(); const list = Array.isArray(ej) ? ej : (ej?.data ?? []);
        let success=0, failed=0;
        list.forEach(x => { const s=String(x.einvoiceStatus||"").toLowerCase(); if(s.includes("success")) success++; else if(s.includes("fail")) failed++; });
        setEin({ success, failed });
      } catch { setEin(null); }
      setUpdatedAt(new Date());
    } catch (e) { if (e?.name==="AbortError") return; setErr(e?.message||"Failed"); setRaw(null); setEin(null); setUpdatedAt(new Date()); }
    finally { setLoading(false); }
  }, [range, customFrom, customTo]);

  useEffect(() => { const ctrl=new AbortController(); load(ctrl.signal); return ()=>ctrl.abort(); }, [range, customFrom, customTo, load]);

  const data = useMemo(() => {
    const live = !!raw && (raw.salesDaily || raw.openClosed);
    const src = live ? raw : MOCK;
    const oc = src.openClosed || { openCnt:0, openVal:0, closedCnt:0, closedVal:0 };
    const totalSales = (src.salesDaily||[]).reduce((a,r)=>a+num(r.sales),0);
    const einData = live ? (ein || { success:0, failed:0 }) : MOCK.einvoice;
    return {
      live: !!live,
      salesTrend: bucketSeries(src.salesDaily||[], "sales"),
      totalSales,
      openClosed: { openCnt:num(oc.openCnt), openVal:num(oc.openVal), closedCnt:num(oc.closedCnt), closedVal:num(oc.closedVal) },
      itemType: normalizeItemTypes(src.itemType||[]),
      discountTrend: bucketSeries(src.discountDaily||[], "discount"),
      einvoice: einData,
    };
  }, [raw, ein]);

  return { data, loading, err, updatedAt, reload: () => load() };
}

const RANGES = ["Current Date","Current Week","Current Month","Custom Range"];
const seg = { display:"flex", gap:3, background:"#eef2f7", border:`1px solid ${C.border}`, borderRadius:9, padding:3 };
const CardShell = ({ title, sub, children }) => (
  <div style={card}><div style={{ marginBottom:14 }}><div style={{ fontSize:13, fontWeight:800, color:C.navyDk }}>{title}</div>{sub && <div style={{ fontSize:11.5, color:C.sub, marginTop:3 }}>{sub}</div>}</div>{children}</div>
);
const Empty = ({ text }) => (<div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:160, color:"#9aa4b1", fontSize:13 }}>{text}</div>);

export default function InvoiceDashboard() {
  const [range, setRange] = useState("Current Month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { data, loading, err, updatedAt, reload } = useInvoiceDashboard({ range, customFrom, customTo });
  const lastUpdated = updatedAt ? updatedAt.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "—";
  const invalid = range === "Custom Range" && customFrom && customTo && new Date(customTo) < new Date(customFrom);
  const oc = data.openClosed;

  return (
    <div style={{ fontFamily:FONT, minHeight:"100vh", color:C.text, padding:"4px 0 40px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:12, color:C.sub }}><span style={{ color:C.navy, fontWeight:600 }}>Dashboard</span><span style={{ margin:"0 7px", color:"#c2ccd6" }}>›</span>Invoicing &amp; Refunds</div>
          <div style={{ fontWeight:800, fontSize:22, color:C.navyDk, marginTop:3 }}>Invoicing &amp; Refunds</div>
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

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:16 }}>
        {[{l:"Total sales",v:fmtSAR(data.totalSales),c:C.navy},{l:"Invoices",v:grp(oc.openCnt+oc.closedCnt),c:C.navyDk},{l:"Closed",v:grp(oc.closedCnt),c:C.cvt},{l:"Open",v:grp(oc.openCnt),c:C.open}].map(k=>(
          <div key={k.l} style={{ ...card, borderRadius:14, padding:"15px 18px" }}><div style={{ fontSize:23, fontWeight:800, color:k.c }}>{k.v}</div><div style={{ fontSize:12.5, color:C.sub, fontWeight:600, marginTop:4 }}>{k.l}</div></div>
        ))}
      </div>

      <div style={{ marginBottom:16 }}>
        <CardShell title="Sales trend" sub="Invoice value over the selected period">
          {data.salesTrend.length ? <AreaLine points={data.salesTrend} /> : <Empty text="No sales in the selected period." />}
        </CardShell>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:16, marginBottom:16 }}>
        <CardShell title="Open vs. closed invoices" sub="Count and value split">
          {(oc.openCnt+oc.closedCnt)>0 ? <Donut centerValue={oc.openCnt+oc.closedCnt} unit="invoices" segments={[
            { label:"Closed", value:oc.closedCnt, color:C.cvt, sub:fmtSAR(oc.closedVal) },
            { label:"Open",   value:oc.openCnt,   color:C.open, sub:fmtSAR(oc.openVal) },
          ]} /> : <Empty text="No invoices in the selected period." />}
        </CardShell>
        <CardShell title="Sale by item type" sub="Service · Package · Products · Advance · Gift Card · Refunds">
          <HBars rows={data.itemType} />
        </CardShell>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:16, marginBottom:24 }}>
        <CardShell title="Discount" sub="Total discount over the period — Promotion vs. Manual split pending source (BR-07)">
          {data.discountTrend.length ? <VBars rows={data.discountTrend} color={C.wip} /> : <Empty text="No discounts in the selected period." />}
        </CardShell>
        <CardShell title="E-invoice status" sub="Total · Success · Failed (BR-08)">
          <EInvoiceBar success={num(data.einvoice.success)} failed={num(data.einvoice.failed)} />
        </CardShell>
      </div>
    </div>
  );
}