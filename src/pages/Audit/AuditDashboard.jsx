import "./AuditDashboard.css";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = (url) => fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }).then(r => r.json());
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCenterCode = () => (getUser().centerCode || "").trim();

const PALETTE_8 = ["#334b71","#cc6b5c","#F3DCB0","#8da0b8","#A7D1CD","#EDAF90","#e9eef5","#FF9F9D"];

const safetyAuditCategories = [
  "Emergency Preparedness","Fire Safety Compliance","Hazardous Materials","PPE Safety",
  "Incident Management","Safety Training","Safety Equipment","Security",
];

// ── Charts ─────────────────────────────────────────────────────────────────────
const LineChart = ({ data, title, colors }) => {
  const maxValue = 10, chartWidth = 400, chartHeight = 200;
  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-wrapper">
        <div className="chart-area">
          <svg width={chartWidth} height={chartHeight} className="line-chart">
            {[0,2,4,6,8,10].map(v => (
              <g key={v}>
                <line x1="50" y1={chartHeight-30-(v/maxValue)*(chartHeight-60)} x2={chartWidth-20} y2={chartHeight-30-(v/maxValue)*(chartHeight-60)} stroke="#e0e0e0" strokeDasharray="2,2"/>
                <text x="40" y={chartHeight-30-(v/maxValue)*(chartHeight-60)+4} fontSize="12" fill="#666" textAnchor="end">{v}</text>
              </g>
            ))}
            <text x="120" y={chartHeight-10} fontSize="12" fill="#666" textAnchor="middle">Last 3 Months</text>
            <text x="320" y={chartHeight-10} fontSize="12" fill="#666" textAnchor="middle">This Month</text>
            <polyline points={data.map((d,i)=>`${120+i*200},${chartHeight-30-(d.value/maxValue)*(chartHeight-60)}`).join(" ")} fill="none" stroke={colors[0]} strokeWidth="2"/>
            {data.map((d,i) => <circle key={i} cx={120+i*200} cy={chartHeight-30-(d.value/maxValue)*(chartHeight-60)} r="4" fill={colors[0]}/>)}
          </svg>
        </div>
      </div>
    </div>
  );
};

const BarChart = ({ data, title, colors, showLegend = true }) => {
  const chartHeight = 200, topPad = 30, bottomPad = 30;
  const categories = Object.keys(data[0]).filter(k => k !== "period");
  const allVals = data.flatMap(row => categories.map(k => Math.max(0, Number(row[k]||0))));
  const maxValue = Math.max(5, ...allVals) + 2;
  const barWidth = 24, barGap = 6;
  const groupInnerWidth = categories.length * (barWidth + barGap);
  const leftPad = 60, rightPad = 24;
  const chartWidth = leftPad + data.length * groupInnerWidth + (data.length-1)*40 + rightPad;
  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-wrapper">
        <div className="chart-area">
          <svg width={chartWidth} height={chartHeight} className="bar-chart">
            {Array.from({length:6},(_,i)=>(i*maxValue)/5).map(v => {
              const y = chartHeight-bottomPad-(v/maxValue)*(chartHeight-topPad-bottomPad);
              return <g key={v}><line x1={leftPad} y1={y} x2={chartWidth-rightPad} y2={y} stroke="#e0e0e0" strokeDasharray="2,2"/><text x={leftPad-10} y={y+4} fontSize="12" fill="#666" textAnchor="end">{Math.round(v)}</text></g>;
            })}
            {data.map((row,pi) => {
              const startX = leftPad + pi*(groupInnerWidth+40);
              return <g key={pi}>
                {categories.map((cat,ci) => {
                  const v = Math.max(0, Number(row[cat]||0));
                  const h = (v/maxValue)*(chartHeight-topPad-bottomPad);
                  return <rect key={cat} x={startX+ci*(barWidth+barGap)} y={chartHeight-bottomPad-h} width={barWidth} height={h} fill={colors[ci%colors.length]}/>;
                })}
                <text x={startX+groupInnerWidth/2} y={chartHeight-8} fontSize="12" fill="#666" textAnchor="middle">{row.period}</text>
              </g>;
            })}
          </svg>
        </div>
        {showLegend && (
          <div className="chart-legend">
            {categories.map((cat,i) => (
              <div key={cat} className="legend-item">
                <div className="legend-color" style={{backgroundColor:colors[i%colors.length]}}/>
                <span>{cat}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Summary cards from live data ───────────────────────────────────────────────
const SummaryCards = ({ centerCode }) => {
  const [counts, setCounts] = useState({ draft:0, submitted:0, telephone:0, digital:0 });

  useEffect(() => {
    if (!centerCode) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/Audit/LoadDraftAudits/1`, {
          method:"POST", headers:{ Authorization:`Bearer ${TOKEN()}`, "Content-Type":"application/json" }
        });
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        const draft = list.filter(x => x.isDraft || x.auditScore === 0).length;
        const telephone = list.filter(x => (x.auditSegment||"").toLowerCase().includes("telephone")).length;
        const digital   = list.filter(x => (x.auditSegment||"").toLowerCase().includes("digital")).length;
        setCounts({ draft, submitted: list.length - draft, telephone, digital });
      } catch {}
    })();
  }, [centerCode]);

  const cards = [
    { label:"Draft Audits",     value: counts.draft,     color:"#fef3c7", text:"#92400e" },
    { label:"Submitted Audits", value: counts.submitted,  color:"#e6f4ef", text:"#2e7d5e" },
    { label:"Telephone Audits", value: counts.telephone,  color:"#e0e7ff", text:"#3730a3" },
    { label:"Digital Audits",   value: counts.digital,    color:"#fdf3f3", text:"#b91c1c" },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background:c.color, borderRadius:12, padding:"18px 20px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>{c.label}</div>
          <div style={{ fontSize:32, fontWeight:800, color:c.text }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const AuditDashboard = () => {
  const [month, setMonth] = useState(new Date().toLocaleString("default",{month:"long"}));
  const [year,  setYear]  = useState(new Date().getFullYear());
  const centerCode = getCenterCode();

  // Static chart data (trend data would come from an API in future)
  const telephoneData = [{ period:"Last 3 Months", value:6 }, { period:"This Month", value:8 }];
  const digitalData   = [
    { period:"Last 3 Months", "General Content Form":8,"ETVS Form":10,"Pricing Queries":11,"Pricing History":6,"Service Form":14 },
    { period:"This Month",    "General Content Form":8,"ETVS Form":10,"Pricing Queries":11,"Pricing History":6,"Service Form":14 },
  ];
  const medicalData = [
    { period:"Last 3 Months","Emergency Kit":6,"Equipment & Drugs":30,"Infection Control":10,"Medical Records":18,"Open Medication":18 },
    { period:"This Month",   "Emergency Kit":6,"Equipment & Drugs":30,"Infection Control":10,"Medical Records":18,"Open Medication":18 },
  ];
  const safetyData = [
    { period:"Last 3 Months","Emergency Preparedness":12,"Fire Safety":10,"Hazardous Materials":8,"PPE Safety":14,"Incident Management":9,"Safety Training":11,"Safety Equipment":13,"Security":7 },
    { period:"This Month",   "Emergency Preparedness":10,"Fire Safety":9,"Hazardous Materials":7,"PPE Safety":12,"Incident Management":8,"Safety Training":10,"Safety Equipment":12,"Security":6 },
  ];
  const groomingData = [
    { period:"Last 3 Months","Uniform Compliance":15,"Personal Hygiene":12,"Grooming Standards":14,"ID Badge":11 },
    { period:"This Month",   "Uniform Compliance":13,"Personal Hygiene":11,"Grooming Standards":12,"ID Badge":10 },
  ];
  const housekeepingData = [
    { period:"Last 3 Months","Clinic Cleanliness":16,"Restroom Hygiene":14,"Waste Disposal":12,"Linen Management":13 },
    { period:"This Month",   "Clinic Cleanliness":14,"Restroom Hygiene":12,"Waste Disposal":11,"Linen Management":12 },
  ];

  return (
    <div className="audit-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <div className="breadcrumb">
            <a href="/" className="breadcrumb-link">Dashboard</a>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Audit</span>
          </div>
          <h1 className="page-title">Audit Overview</h1>
        </div>
        <div className="header-right">
          <select className="month-select" value={month} onChange={e=>setMonth(e.target.value)}>
            {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m=><option key={m}>{m}</option>)}
          </select>
          <select className="year-select" value={year} onChange={e=>setYear(Number(e.target.value))}>
            {[2026,2025,2024,2023].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <SummaryCards centerCode={centerCode} />

      <div className="charts-section">
        <LineChart data={telephoneData} title="Telephone Audit — Criteria" colors={["#334b71"]}/>
        <BarChart data={digitalData}   title="Digital Audit — Criteria"   colors={["#334b71","#cc6b5c","#F3DCB0","#8da0b8","#A7D1CD"]}/>
        <BarChart data={medicalData}   title="Medical Audit — Criteria"   colors={["#334b71","#cc6b5c","#F3DCB0","#8da0b8","#A7D1CD"]}/>
        <BarChart data={safetyData}    title="Safety Audit — Criteria"    colors={PALETTE_8} showLegend={false}/>
        <div className="chart-legend" style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {safetyAuditCategories.map((cat,i)=>(
            <div key={cat} className="legend-item"><div className="legend-color" style={{backgroundColor:PALETTE_8[i]}}/><span>{cat}</span></div>
          ))}
        </div>
        <div className="housekeeping-section">
          <h3 className="section-title">Housekeeping and Grooming Audit</h3>
          <div className="housekeeping-grid">
            <BarChart data={groomingData}     title="Grooming"     colors={[PALETTE_8[0],PALETTE_8[1],PALETTE_8[3],PALETTE_8[5]]}/>
            <BarChart data={housekeepingData} title="Housekeeping" colors={[PALETTE_8[2],PALETTE_8[3],PALETTE_8[4],PALETTE_8[6]]}/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditDashboard;