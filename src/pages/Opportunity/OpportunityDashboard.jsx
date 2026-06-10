// src/pages/Opportunity/OpportunityDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

import OpportunityForm     from "./OpportunityForm";
import CreateRuleForm      from "./CreateRuleForm";
import EditOpportunityForm from "./EditOpportunityForm";
import OpportunityDetails  from "./OpportunityDetails";

/* ── EazyWeek palette ──────────────────────────────────────────────────────── */
const C = {
  navy:"#334b71", navyDk:"#071D49", navyLt:"#e9edf5",
  open:"#cc6b5c", wip:"#d4a853", closed:"#8da0b8", cvt:"#4a9e8a",
  grid:"#eef2f7", axis:"#6e7b8f", border:"#e7ecf4",
  bg:"#f4f6fa", text:"#10223f", sub:"#64748b",
};

/* ── Rule helpers ─────────────────────────────────────────────────────────── */
const RULE_KEYS = { MANUAL:"MANUAL", PAID_X_NOT_Y:"PAID_X_NOT_Y", NO_SHOW:"NO_SHOW",
  PAID_X_CAT:"PAID_X_CAT", SPECIAL_DAY:"SPECIAL_DAY", CANCELLED:"CANCELLED", EXTERNAL:"EXTERNAL" };

const isManualLeadRow   = (r) => String(r?.oRuleCode||"").trim().toLowerCase()==="manual lead";
const isExternalLeadRow = (r) => {
  const code = String(r?.ruleCode??r?.oRuleCode??r?.rule??"").trim().toUpperCase();
  const name = String(r?.oRuleName??r?.ruleName??r?.oRuleDetails??"").trim().toLowerCase();
  return code==="R7" || name.includes("external");
};
const detectRuleKey = (r) => {
  if (isManualLeadRow(r))   return RULE_KEYS.MANUAL;
  if (isExternalLeadRow(r)) return RULE_KEYS.EXTERNAL;
  const code = String(r?.oRuleCode??r?.ruleCode??"").trim().toUpperCase();
  if (code==="R3") return RULE_KEYS.NO_SHOW;
  if (code==="R4") return RULE_KEYS.CANCELLED;
  if (code==="R1") return RULE_KEYS.PAID_X_NOT_Y;
  if (code==="R2") return RULE_KEYS.PAID_X_CAT;
  if (code==="R5") return RULE_KEYS.SPECIAL_DAY;
  return "";
};

/* ── Date helper ──────────────────────────────────────────────────────────── */
const toISO = (d) => {
  if (!d) return "";
  if (d instanceof Date) { if (Number.isNaN(+d)) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(s); return Number.isNaN(+dt) ? "" : toISO(dt);
};

/* ── API helpers ──────────────────────────────────────────────────────────── */
const TOKEN = () => localStorage.getItem("token")||sessionStorage.getItem("token")||"";
const apiFetch = (url,opts={}) => fetch(url,{ credentials:"include",
  headers:{ Authorization:`Bearer ${TOKEN()}`,...(opts.headers||{}) }, ...opts });
const asArray = (d) => {
  if (Array.isArray(d)) return d; if (!d) return [];
  for (const k of ["data","items","result","results"]) if (Array.isArray(d?.[k])) return d[k];
  return [d];
};
const safeNum = v => Number.isFinite(+v) ? +v : 0;

/* ════════════════════════════════════════════════════════════════════════════
   MODULE-LEVEL COMPONENTS — defined outside any parent component
   Never define components with inputs/state inside another component's render.
   Doing so causes React to remount them on every re-render (focus loss bug).
   ════════════════════════════════════════════════════════════════════════════ */

function ChartCard({ title, dataset }) {
  const hasData = Array.isArray(dataset) && dataset.some(d=>Number(d.value)>0);
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
      padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
      <div style={{ fontSize:11, fontWeight:800, color:C.navyDk, marginBottom:14,
        textTransform:"uppercase", letterSpacing:".05em" }}>{title}</div>
      {!hasData ? (
        <div style={{ height:170, display:"flex", alignItems:"center", justifyContent:"center",
          color:C.sub, fontSize:13 }}>No data</div>
      ) : (
        <div style={{ height:170 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataset} margin={{ top:6, right:10, bottom:0, left:0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill:C.axis, fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill:C.axis, fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:12 }} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {dataset.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function KPIBar({ data }) {
  const total     = data.reduce((s,r)=>s+safeNum(r.totalOpportunities),0);
  const open      = data.reduce((s,r)=>s+safeNum(r.noOfOpenOpportunities),0);
  const closed    = data.reduce((s,r)=>s+safeNum(r.noOfClosedOpportunities),0);
  const converted = data.reduce((s,r)=>s+safeNum(r.noOfConvertedOutOfClosed),0);
  const wip       = Math.max(0, total - open - closed);
  return (
    <div style={{ display:"flex", gap:12, marginBottom:22, flexWrap:"wrap" }}>
      {[{l:"Total",v:total,c:C.navy},{l:"Open",v:open,c:C.open},{l:"WIP",v:wip,c:C.wip},
        {l:"Closed",v:closed,c:C.closed},{l:"Converted",v:converted,c:C.cvt}].map(({l,v,c})=>(
        <div key={l} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
          padding:"14px 20px", flex:1, minWidth:110, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
          <div style={{ fontSize:22, fontWeight:800, color:c }}>{v.toLocaleString()}</div>
          <div style={{ fontSize:12, color:C.sub, fontWeight:600, marginTop:3 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

function SortTH({ col, label, sortConfig, onSort, right }) {
  const icon = sortConfig.key!==col ? "↕" : sortConfig.direction==="asc" ? "↑" : "↓";
  return (
    <th onClick={()=>onSort(col)} style={{ padding:"10px 12px", background:"#f4f6fa", fontWeight:800,
      fontSize:11, color:C.navy, textTransform:"uppercase", letterSpacing:".04em", whiteSpace:"nowrap",
      cursor:"pointer", textAlign:right?"right":"left", borderBottom:`2px solid ${C.border}`, userSelect:"none" }}>
      {label} <span style={{ opacity:.4, fontSize:10 }}>{icon}</span>
    </th>
  );
}

function SegmentBadge({ type }) {
  const isStatic = String(type||"").toLowerCase()==="static";
  return (
    <span style={{ background:isStatic?"#eff6ff":"#f3e5f5", color:isStatic?"#1d4ed8":"#7b1fa2",
      borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{type||"—"}</span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999,
      background:toast.type==="success"?"#166534":"#b91c1c", color:"#fff",
      padding:"12px 20px", borderRadius:8, boxShadow:"0 4px 14px rgba(0,0,0,.2)",
      fontSize:13, fontWeight:600 }}>
      {toast.type==="success"?"✓ ":"⚠ "}{toast.message}
    </div>
  );
}

function Loader() {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(255,255,255,.75)",
      zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:36, height:36, border:`5px solid ${C.navyLt}`,
        borderTop:`5px solid ${C.navy}`, borderRadius:"50%",
        animation:"opp-spin .8s linear infinite" }} />
      <style>{`@keyframes opp-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
const OpportunityDashboard = () => {
  const navigate = useNavigate();
  const [currentView,         setCurrentView]         = useState("dashboard");
  const [selectedOppDetails,  setSelectedOppDetails]  = useState(null);
  const [opportunityData,     setOpportunityData]     = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [searchTerm,          setSearchTerm]          = useState("");
  const [statusFilter,        setStatusFilter]        = useState("1");
  const [currentPage,         setCurrentPage]         = useState(1);
  const [entriesPerPage,      setEntriesPerPage]      = useState(10);
  const [selectedRows,        setSelectedRows]        = useState([]);
  const [sortConfig,          setSortConfig]          = useState({ key:null, direction:"asc" });
  const [toast,               setToast]               = useState(null);
  const [loading,             setLoading]             = useState(false);
  const [canManage,           setCanManage]           = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user")||sessionStorage.getItem("user")||"{}");
      const role = String(u?.role||u?.roleName||u?.userRole||"").trim().toLowerCase().replace(/\s+/g,"");
      setCanManage(role==="admin"||role==="productteam");
    } catch { setCanManage(false); }
  }, []);

  const showToast = (message,type="success") => {
    setToast({message,type}); setTimeout(()=>setToast(null),3500);
  };

  /* Fetch */
  const fetchOpportunities = async (status="1") => {
    setLoading(true);
    try {
      const [baseRes, manualRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/Opportunity/LoadOpprotunityList/${status}`),
        apiFetch(`${API_BASE_URL}/api/LeadOpp/getCapaignListByManualLead?pageNumber=1&pageSize=500`).catch(()=>null),
      ]);
      const baseArr   = asArray(await baseRes.json().catch(()=>[]));
      const manualArr = manualRes ? asArray(await manualRes.json().catch(()=>[])) : [];
      const manualMap = new Map();
      manualArr.forEach(it => {
        const code = String(it?.oppCode||"").trim().toUpperCase();
        if (code) manualMap.set(code,{ totalOpportunities:it?.totalOpportunities??0,
          noOfOpenOpportunities:it?.openOpportunities??0,
          noOfClosedOpportunities:it?.closedOpportunities??0,
          noOfConvertedOutOfClosed:it?.convertedOpportunities??0 });
      });
      const normalize = it => {
        const n = { ...it, clinic:it.clinic??it.centerName??"",
          totalOpportunities:it.totalOpportunities??0,
          noOfOpenOpportunities:it.noOfOpenOpportunities??it.noOfOpen??0,
          noOfClosedOpportunities:it.noOfClosedOpportunities??it.noOfClosed??0,
          noOfConvertedOutOfClosed:it.noOfConvertedOutOfClosed??0,
          recordswithoutSalesOwner:it.recordswithoutSalesOwner??0 };
        if (isManualLeadRow(n)) { const ml=manualMap.get(String(n.oppCode||"").trim().toUpperCase()); if(ml) Object.assign(n,ml); }
        return n;
      };
      setOpportunityData(baseArr.map(normalize));
    } catch(e) { console.error("Fetch failed:",e); setOpportunityData([]); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ fetchOpportunities(statusFilter); },[statusFilter]);

  /* Chart data */
  const summarize = (rows) => {
    const total=rows.reduce((s,r)=>s+safeNum(r.totalOpportunities),0);
    const open=rows.reduce((s,r)=>s+safeNum(r.noOfOpenOpportunities),0);
    const closed=rows.reduce((s,r)=>s+safeNum(r.noOfClosedOpportunities),0);
    const converted=rows.reduce((s,r)=>s+safeNum(r.noOfConvertedOutOfClosed),0);
    return [
      {label:"Total",value:total,fill:C.navy},{label:"Open",value:open,fill:C.open},
      {label:"WIP",value:Math.max(0,total-open-closed),fill:C.wip},
      {label:"Closed",value:closed,fill:C.closed},{label:"Converted",value:converted,fill:C.cvt},
    ];
  };
  const rowsByRule = useMemo(()=>{
    const g={[RULE_KEYS.MANUAL]:[],[RULE_KEYS.PAID_X_NOT_Y]:[],[RULE_KEYS.NO_SHOW]:[],
      [RULE_KEYS.PAID_X_CAT]:[],[RULE_KEYS.SPECIAL_DAY]:[],[RULE_KEYS.CANCELLED]:[],[RULE_KEYS.EXTERNAL]:[]};
    opportunityData.forEach(r=>{const k=detectRuleKey(r);if(k&&g[k])g[k].push(r);});
    return g;
  },[opportunityData]);
  const chartData = useMemo(()=>({
    manual:summarize(rowsByRule[RULE_KEYS.MANUAL]), external:summarize(rowsByRule[RULE_KEYS.EXTERNAL]),
    noShow:summarize(rowsByRule[RULE_KEYS.NO_SHOW]), cancelled:summarize(rowsByRule[RULE_KEYS.CANCELLED]),
    special:summarize(rowsByRule[RULE_KEYS.SPECIAL_DAY]),
  }),[rowsByRule]);

  /* Table */
  const filteredData = useMemo(()=>{
    const q=searchTerm.toLowerCase();
    let rows=opportunityData.filter(i=>(i.oppCode||"").toLowerCase().includes(q)||(i.oppName||"").toLowerCase().includes(q)||
      (i.clinic||"").toLowerCase().includes(q)||(i.centerName||"").toLowerCase().includes(q)||(i.segmentType||"").toLowerCase().includes(q));
    if(sortConfig.key) rows=[...rows].sort((a,b)=>{
      const av=a[sortConfig.key]??"",bv=b[sortConfig.key]??"";
      const cmp=typeof av==="number"?av-bv:String(av).localeCompare(String(bv));
      return sortConfig.direction==="asc"?cmp:-cmp;
    });
    return rows;
  },[opportunityData,searchTerm,sortConfig]);

  const totalPages=Math.ceil(filteredData.length/entriesPerPage);
  const startIdx=(currentPage-1)*entriesPerPage;
  const currentData=filteredData.slice(startIdx,startIdx+entriesPerPage);
  const handleSort=key=>setSortConfig(p=>({key,direction:p.key===key&&p.direction==="asc"?"desc":"asc"}));

  /* Selection */
  const rowId=item=>item.recID||item.oppCode;
  const handleSelectAll=e=>setSelectedRows(e.target.checked?currentData.map(rowId):[]);
  const handleSelectRow=id=>setSelectedRows(prev=>prev.includes(id)?prev.filter(r=>r!==id):[...prev,id]);

  /* Actions */
  const handleCreateNewCampaign=()=>navigate("/opportunity/create");
  const handleEditOppName=()=>{
    if(!selectedRows.length){showToast("Select at least one opportunity","error");return;}
    if(selectedRows.length>1){showToast("Select only one opportunity to edit","error");return;}
    const opp=opportunityData.find(i=>rowId(i)===selectedRows[0]);
    if(opp){setSelectedOpportunity(opp);setCurrentView("edit-opportunity");}
  };
  const handleExpireCampaign=async()=>{
    if(!selectedRows.length){showToast("Select at least one opportunity to expire","error");return;}
    if(!window.confirm("Expire selected opportunities?"))return;
    try{
      const r=await apiFetch(`${API_BASE_URL}/api/Opportunity/ExpireOpportunity`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({expireOpp:"Expired by user",oppCodeListJson:selectedRows.map(c=>({oppCode:c}))})});
      if(!r.ok)throw new Error("Failed to expire");
      showToast("Opportunities expired successfully.");
      setSelectedRows([]);setCurrentPage(1);setStatusFilter("1");await fetchOpportunities("1");
    }catch(e){showToast(e.message||"Error expiring","error");}
  };
  const handleRefresh=async()=>{
    setLoading(true);
    try{
      const codes=selectedRows.length
        ?selectedRows.map(id=>{const r=opportunityData.find(x=>rowId(x)===id);return String(r?.oppCode||id).trim();}).filter(Boolean)
        :["123"];
      for(const code of codes){
        const r=await apiFetch(`${API_BASE_URL}/api/Opportunity/GetLatestData/${encodeURIComponent(code)}`);
        if(!r.ok)throw new Error(`GetLatestData failed for ${code}`);
      }
      await fetchOpportunities(statusFilter);
      showToast(codes[0]==="123"?"Latest data loaded for all campaigns":`Latest data loaded for ${codes.length} campaign(s)`);
    }catch(e){showToast(e?.message||"Failed to get latest data","error");}
    finally{setLoading(false);}
  };
  const handleOpportunityClick=(row)=>{
  if(!row)return;
  const code=String(row?.oppCode||"").trim();
  if(!code)return;
  const now=new Date();
  const from=toISO(row?.fromDate)||toISO(new Date(now.getTime()-13*86400000));
  const to=toISO(row?.toDate)||toISO(now);
  // All campaign types → unified CampaignDetails page
  navigate(`/opportunity/${encodeURIComponent(code)}/details`, {
    state:{
      oppName:      row?.oppName      || "",
      oRuleCode:    row?.oRuleCode    || "",
      oRuleDetails: row?.oRuleDetails || "",
      oRuleXvalue:  row?.oRuleXvalue  || "",
      fromDate:     from,
      toDate:       to,
      segmentType:  row?.segmentType  || "",
    }
  });
};
  const handleBackToDashboard=()=>{setCurrentView("dashboard");setSelectedOpportunity(null);setSelectedOppDetails(null);};

  /* View switchers */
  if(currentView==="details"&&selectedOppDetails) return <OpportunityDetails details={selectedOppDetails} onBack={handleBackToDashboard}/>;
  if(currentView==="create-opportunity") return <OpportunityForm onBack={handleBackToDashboard} onNext={()=>setCurrentView("create-rule")} mode="create"/>;
  if(currentView==="create-rule") return <CreateRuleForm opportunityData={opportunityData} onBack={()=>setCurrentView("create-opportunity")} onSave={()=>alert("Rule saved!")} onActivate={()=>{alert("Activated!");setCurrentView("dashboard");}}/>;
  if(currentView==="edit-opportunity") return <EditOpportunityForm opportunityData={selectedOpportunity} onBack={handleBackToDashboard}
    onSave={upd=>{setOpportunityData(prev=>prev.map(i=>rowId(i)===rowId(upd)?upd:i));showToast("Opportunity updated.");setCurrentView("dashboard");setSelectedRows([]);}}/>;

  /* Dashboard */
  return (
    <div style={{ fontFamily:"Lato,sans-serif", minHeight:"100vh",  color:C.text }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:22, color:C.navyDk }}>📊 Opportunity Dashboard</div>
          
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          {canManage && (<>
            <button onClick={handleEditOppName} style={{ padding:"9px 16px", border:`1px solid ${C.border}`,
              borderRadius:8, background:"#fff", color:C.navy, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              ✏ Edit Opp Name
            </button>
            <button onClick={handleExpireCampaign} style={{ padding:"9px 16px", border:`1px solid #fcd34d`,
              borderRadius:8, background:"#fef9c7", color:"#92400e", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              ⏱ Expire Campaign
            </button>
            <button onClick={handleCreateNewCampaign} style={{ padding:"9px 18px", background:C.navy,
              color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              + Create Campaign
            </button>
          </>)}
          <button onClick={handleRefresh} style={{ padding:"9px 16px", background:C.navyDk,
            color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            ↻ Get Latest Data
          </button>
        </div>
      </div>

      {/* KPI bar */}
      <KPIBar data={opportunityData} />

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:16, marginBottom:24 }}>
        <ChartCard title="Rule: Manual Lead"               dataset={chartData.manual} />
        <ChartCard title="Rule: External Source (R7)"      dataset={chartData.external} />
        <ChartCard title="Rule: No Show Appointment"       dataset={chartData.noShow} />
        <ChartCard title="Rule: Cancelled Appointment"     dataset={chartData.cancelled} />
        <ChartCard title="Rule: Customer Special Day"      dataset={chartData.special} />
      </div>

      {/* Table card */}
      <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
        boxShadow:"0 1px 6px rgba(0,0,0,.05)", overflow:"hidden" }}>

        {/* Toolbar */}
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ fontWeight:800, fontSize:14, color:C.navyDk }}>
            Campaign List
            <span style={{ marginLeft:10, fontSize:12, fontWeight:600, color:C.sub }}>
              {filteredData.length} record{filteredData.length!==1?"s":""}
            </span>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <label style={{ fontSize:13, color:C.sub, fontWeight:600 }}>Status:</label>
              <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setCurrentPage(1);}}
                style={{ padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7,
                  fontSize:13, outline:"none", color:C.text, fontFamily:"Lato,sans-serif" }}>
                <option value="1">Active</option>
                <option value="0">Draft</option>
                <option value="2">Expired</option>
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <label style={{ fontSize:13, color:C.sub, fontWeight:600 }}>Show</label>
              <select value={entriesPerPage} onChange={e=>{setEntriesPerPage(Number(e.target.value));setCurrentPage(1);}}
                style={{ padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7,
                  fontSize:13, outline:"none", fontFamily:"Lato,sans-serif" }}>
                {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              placeholder="Search campaigns…"
              style={{ padding:"8px 12px", border:`1px solid ${C.border}`, borderRadius:8,
                fontSize:13, outline:"none", width:200, fontFamily:"Lato,sans-serif" }} />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={{ padding:"10px 12px", background:"#f4f6fa", borderBottom:`2px solid ${C.border}` }}>
                  <input type="checkbox" style={{ accentColor:C.navy }}
                    checked={selectedRows.length===currentData.length&&currentData.length>0}
                    onChange={handleSelectAll} />
                </th>
                <SortTH col="oppCode"                  label="Campaign Code"         sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="oppName"                  label="Campaign Name"         sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="clinic"                   label="Clinic"                sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="fromDate"                 label="From"                  sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="toDate"                   label="To"                    sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="totalOpportunities"       label="Total"       right     sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="noOfOpenOpportunities"    label="Open"        right     sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="noOfClosedOpportunities"  label="Closed"      right     sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="recordswithoutSalesOwner" label="No Owner"    right     sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="noOfConvertedOutOfClosed" label="Converted"   right     sortConfig={sortConfig} onSort={handleSort} />
                <SortTH col="segmentType"              label="Segment"               sortConfig={sortConfig} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {currentData.length===0 ? (
                <tr><td colSpan={12} style={{ padding:50, textAlign:"center", color:C.sub, fontSize:13 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📋</div>No opportunities found
                </td></tr>
              ) : currentData.map((item,idx)=>(
                <tr key={rowId(item)}
                  style={{ background:idx%2===0?"#fff":"#fafbfd", borderBottom:"1px solid #f1f5f9" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?"#fff":"#fafbfd"}>
                  <td style={{ padding:"10px 12px" }}>
                    <input type="checkbox" style={{ accentColor:C.navy }}
                      checked={selectedRows.includes(rowId(item))} onChange={()=>handleSelectRow(rowId(item))} />
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <button onClick={()=>handleOpportunityClick(item)}
                      style={{ background:"none",border:"none",color:C.navy,fontWeight:700,fontSize:13,cursor:"pointer",padding:0,whiteSpace:"nowrap" }}>
                      {item.oppCode}
                    </button>
                  </td>
                  <td style={{ padding:"10px 12px",fontSize:13,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.oppName}</td>
                  <td style={{ padding:"10px 12px",fontSize:13 }}>{item.clinic||item.centerName}</td>
                  <td style={{ padding:"10px 12px",fontSize:12,color:C.sub,whiteSpace:"nowrap" }}>{item.fromDate}</td>
                  <td style={{ padding:"10px 12px",fontSize:12,color:C.sub,whiteSpace:"nowrap" }}>{item.toDate}</td>
                  <td style={{ padding:"10px 12px",fontSize:13,textAlign:"right",fontWeight:700 }}>{safeNum(item.totalOpportunities).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px",fontSize:13,textAlign:"right",color:C.open,fontWeight:600 }}>{safeNum(item.noOfOpenOpportunities).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px",fontSize:13,textAlign:"right" }}>{safeNum(item.noOfClosedOpportunities).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px",fontSize:13,textAlign:"right",color:"#b45309" }}>{safeNum(item.recordswithoutSalesOwner).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px",fontSize:13,textAlign:"right",color:C.cvt,fontWeight:600 }}>{safeNum(item.noOfConvertedOutOfClosed).toLocaleString()}</td>
                  <td style={{ padding:"10px 12px" }}><SegmentBadge type={item.segmentType}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding:"14px 16px", borderTop:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ fontSize:13, color:C.sub }}>
            Showing {Math.min(startIdx+1,filteredData.length)}–{Math.min(startIdx+entriesPerPage,filteredData.length)} of {filteredData.length}
          </div>
          <div style={{ display:"flex", gap:5 }}>
            {[
              {label:"Previous",disabled:currentPage===1,onClick:()=>setCurrentPage(p=>Math.max(1,p-1))},
              ...Array.from({length:Math.min(5,totalPages)},(_,i)=>({label:i+1,page:i+1,onClick:()=>setCurrentPage(i+1)})),
              ...(totalPages>5?[{label:"…",disabled:true}]:[]),
              {label:"Next",disabled:currentPage===totalPages||!totalPages,onClick:()=>setCurrentPage(p=>Math.min(totalPages,p+1))},
            ].map((btn,i)=>(
              <button key={i} disabled={btn.disabled} onClick={btn.disabled?undefined:btn.onClick}
                style={{ padding:"7px 12px", borderRadius:6, border:`1px solid ${btn.page===currentPage?C.navy:C.border}`,
                  background:btn.page===currentPage?C.navy:"#fff", color:btn.page===currentPage?"#fff":C.text,
                  cursor:btn.disabled?"not-allowed":"pointer", fontSize:13,
                  fontWeight:btn.page===currentPage?700:400, opacity:btn.disabled?0.45:1 }}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Toast toast={toast}/>
      {loading&&<Loader/>}
    </div>
  );
};

export default OpportunityDashboard;