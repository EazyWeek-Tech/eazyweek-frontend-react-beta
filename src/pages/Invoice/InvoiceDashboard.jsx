// src/pages/Invoice/InvoiceDashboard.jsx
// Invoicing & Refunds dashboard — Dashboards FRD §4.3. Self-contained, `C` palette.
// Source: GET /api/Invoice/Dashboard  (+ GET /api/EInvoice/LoadEInvoice for status).
//   - Sales trend .......... line + area                                  [Fig 7]
//   - VAT .................. KPI tile, total for the selected period
//   - Sale by item type .... horizontal bars off a zero axis, sales-value
//                            scale on the x-axis; Refunds negative/red     [Fig 8]
//   - Discount ............. daily discount bars (Promotion vs Manual split
//                            not stored separately — see note; BR-07)     [Fig 9]
//   - E-invoice status ..... Total / Success / Failed stacked bar (BR-08)  [Fig 10]
//
// Data policy: no sample figures. While the endpoints are in flight the page
// shows the shared EazyWeek progress bar and tile skeletons; if they fail it
// shows a retry panel. Every number on the page comes from the response.
import { useState, useEffect, useMemo, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import DashboardGate, { DASHBOARD_VIEW } from "../../components/DashboardGate"; // adjust path if needed
// Shared loading indicators (src/pages/Dashboard/DashboardLoadingBar.jsx).
import { DashboardLoadingBar, TileSkeleton, ChartLoading, LoadError } from "../Dashboard/DashboardLoadingBar";

const C = {
  navy:"#334b71", navyDk:"#2b3f73", open:"#cc6b5c", wip:"#d4a853", closed:"#8da0b8",
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
const niceScale = (max, ticks=4) => { const raw=max/ticks||1; const mag=Math.pow(10,Math.floor(Math.log10(raw||1))); const norm=raw/mag; const step=(norm<=1?1:norm<=2?2:norm<=5?5:10)*mag; return { niceMax:Math.ceil(max/step)*step||step, step }; };

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

// Refund/return keys are matched FIRST — otherwise an itemType like
// "Advance Refund" hits the `advance` substring and lands in the Advance bucket
// with a negative amount, which is what painted Advance red.
const ITEM_MAP = [
  { keys:["refund","return"], label:"Refunds" },
  { keys:["service"],         label:"Service" },
  { keys:["package"],         label:"Package" },
  { keys:["product"],         label:"Products" },
  { keys:["advance"],         label:"Advance" },
  { keys:["gift"],            label:"Gift Card" },
];
const ITEM_ORDER = ["Service","Package","Products","Advance","Gift Card","Refunds"];

function normalizeItemTypes(rows) {
  const acc = {};
  rows.forEach(r => {
    const t = String(r.itemType||"").toLowerCase();
    const hit = ITEM_MAP.find(m => m.keys.some(k => t.includes(k)));
    const label = hit ? hit.label : (r.itemType ? r.itemType : "Other");
    acc[label] = (acc[label]||0) + num(r.amount);
  });
  return ITEM_ORDER.map(label => {
    const refund = label === "Refunds";
    const v = acc[label] || 0;
    // Refunds always sit left of the zero axis; every other type keeps its own sign.
    return { label, refund, value: refund ? -Math.abs(v) : v };
  });
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

/* Horizontal bars — Fig 8: signed, zero axis, value scale along the bottom.
   Colour comes from the row's category (refund), never from the sign. */
function HBars({ rows, height }) {
  const W=660, labelW=104, pr=20, pt=10, rowH=40, axisH=52, barH=22;
  const plotH=rows.length*rowH, H=height || pt+plotH+axisH;
  const plotL=labelW, plotW=(W-pr)-plotL, baseY=pt+plotH;

  const maxPos=Math.max(0, ...rows.map(r=>r.value));
  const maxNeg=Math.max(0, ...rows.map(r=>-r.value));
  const { step }=niceScale(Math.max(maxPos,1), 6);
  const hi=Math.ceil(maxPos/step)*step || step;
  const lo=-Math.ceil(maxNeg/step)*step;
  const span=(hi-lo)||1;
  const X=(v)=>plotL+((v-lo)/span)*plotW;
  const zeroX=X(0);

  const ticks=[]; for(let v=lo; v<=hi+1e-6; v+=step) ticks.push(v);
  const tick=(v)=>{ const a=Math.abs(v), s=v<0?"-":"";
    if(a>=1e6) return `${s}${(a/1e6).toFixed(a>=1e7?0:1)}M`;
    if(a>=1e3) return `${s}${(a/1e3).toFixed(a>=1e4?0:1)}k`;
    return `${s}${grp(a)}`; };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display:"block", height:"auto" }}>
      <line x1={plotL} y1={baseY} x2={W-pr} y2={baseY} stroke={C.border} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {ticks.map((v,i)=>(
        <text key={"t"+i} x={X(v)} y={baseY+20} textAnchor="middle" fontFamily={FONT} fontSize={11} fill={C.axis}>{tick(v)}</text>
      ))}
      <text x={plotL+plotW/2} y={H-8} textAnchor="middle" fontFamily={FONT} fontSize={11.5} fill={C.sub}>Sales value (SAR)</text>

      {rows.map((r,i)=>{
        const y=pt+i*rowH+(rowH-barH)/2;
        const x=X(Math.min(0,r.value)), w=Math.abs(X(r.value)-zeroX);
        return (
          <g key={i}>
            <text x={labelW-14} y={y+barH/2+4} textAnchor="end" fontFamily={FONT} fontSize={12.5} fill={C.text} fontWeight={600}>{r.label}</text>
            <rect x={x} y={y} width={Math.max(1,w)} height={barH} fill={r.refund?C.open:C.navy}>
              <title>{`${r.label}: ${fmtSAR(r.value)}`}</title>
            </rect>
          </g>
        );
      })}

      {/* drawn last so it sits on top of the bars */}
      <line x1={zeroX} y1={pt} x2={zeroX} y2={baseY} stroke={C.axis} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* Vertical bars (discount) */
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

  /* Everything below is null/empty until the endpoint answers — the page
     renders skeletons and empty states rather than invented figures. */
  const data = useMemo(() => {
    const src = raw && (raw.salesDaily || raw.openClosed || raw.itemType) ? raw : null;
    if (!src) return { ready:false, salesTrend:[], totalSales:null, vatTotal:null, invoiceCount:null, itemType:[], discountTrend:[], einvoice:null };
    const oc = src.openClosed || {};
    return {
      ready: true,
      salesTrend: bucketSeries(src.salesDaily||[], "sales"),
      totalSales: (src.salesDaily||[]).reduce((a,r)=>a+num(r.sales),0),
      vatTotal: num(src.vatTotal),
      invoiceCount: num(oc.openCnt) + num(oc.closedCnt),
      itemType: (src.itemType||[]).length ? normalizeItemTypes(src.itemType) : [],
      discountTrend: bucketSeries(src.discountDaily||[], "discount"),
      einvoice: ein,
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

function InvoiceDashboard() {
  const [range, setRange] = useState("Current Month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { data, loading, err, updatedAt, reload } = useInvoiceDashboard({ range, customFrom, customTo });
  const lastUpdated = updatedAt ? updatedAt.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "—";
  const invalid = range === "Custom Range" && customFrom && customTo && new Date(customTo) < new Date(customFrom);
  const DASH = "\u2014";
  const failed = !loading && !!err && !data.ready;
  /* One place decides what a card body shows: bar while fetching, retry panel
     on failure, the chart when there is something to draw, empty state after. */
  const body = (h, has, chart, emptyText) =>
    loading ? <ChartLoading height={h} />
    : failed ? <LoadError height={h} message="Live data could not be loaded." onRetry={reload} />
    : has ? chart
    : <Empty text={emptyText} />;

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
        {loading ? (
          <div style={{ width:240 }}><DashboardLoadingBar height={5} /></div>
        ) : (
          <>
            <span style={{ fontSize:11.5, fontWeight:700, padding:"3px 10px", borderRadius:20, background:failed?"#FDF0EC":"#E6F1EC", color:failed?C.open:C.cvt }}>{failed?"No live data":"Live data"}</span>
            <span style={{ fontSize:12, color:C.sub }}>Last updated {lastUpdated}</span>
            {failed && <span style={{ fontSize:11.5, color:"#b0704f" }}>{err}</span>}
          </>
        )}
        <button onClick={reload} style={{ marginLeft:"auto", cursor:"pointer", fontFamily:FONT, fontSize:12, fontWeight:600, padding:"6px 12px", borderRadius:9, background:"#fff", color:C.navy, border:`1px solid ${C.border}` }}>Refresh</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:16 }}>
        {loading ? [0,1,2].map(i=><TileSkeleton key={i} />) :
          [{l:"Total sales",v:data.totalSales==null?null:fmtSAR(data.totalSales),c:C.navy},
           {l:"Invoices",   v:data.invoiceCount==null?null:grp(data.invoiceCount),c:C.navyDk},
           {l:"VAT",        v:data.vatTotal==null?null:fmtSAR(data.vatTotal),c:C.wip}].map(k=>(
            <div key={k.l} style={{ ...card, borderRadius:14, padding:"15px 18px" }}><div style={{ fontSize:23, fontWeight:800, color:k.v==null?"#b8c0cb":k.c }}>{k.v==null?DASH:k.v}</div><div style={{ fontSize:12.5, color:C.sub, fontWeight:600, marginTop:4 }}>{k.l}</div></div>
          ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:16, marginBottom:16, alignItems:"start" }}>
        <CardShell title="Sales trend" sub="Invoice value over the selected period">
          {body(240, data.salesTrend.length > 0, <AreaLine points={data.salesTrend} />, "No sales in the selected period.")}
        </CardShell>
        <CardShell title="Sale by item type" sub="Service · Package · Products · Advance · Gift Card · Refunds">
          {body(254, data.itemType.length > 0, <HBars rows={data.itemType} />, "No billed items in the selected period.")}
        </CardShell>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:16, marginBottom:24 }}>
        <CardShell title="Discount" sub="Total discount over the period — Promotion vs. Manual split pending source (BR-07)">
          {body(220, data.discountTrend.length > 0, <VBars rows={data.discountTrend} color={C.wip} />, "No discounts in the selected period.")}
        </CardShell>
        <CardShell title="E-invoice status" sub="Total · Success · Failed (BR-08)">
          {body(150, !!data.einvoice, data.einvoice ? <EInvoiceBar success={num(data.einvoice.success)} failed={num(data.einvoice.failed)} /> : null, "No e-invoices in the selected period.")}
        </CardShell>
      </div>
    </div>
  );
}
export default function InvoiceDashboardGated() {
  return (
    <DashboardGate code={DASHBOARD_VIEW.INVOICE_DASHBOARD}>
      <InvoiceDashboard />
    </DashboardGate>
  );
}