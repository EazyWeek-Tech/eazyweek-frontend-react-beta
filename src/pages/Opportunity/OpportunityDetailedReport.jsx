// src/pages/Opportunity/OpportunityDetailedReport.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";

// App auth uses a Bearer token (same as Header.jsx); attach it to every request.
const AUTH_HEADERS = () => {
  const t = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/* ===========================
   Utils
   =========================== */
const norm = (s) => (s ?? "").toString().trim();

function toISODateOnly(s) {
  const t = norm(s);
  if (!t) return "";
  const m0 = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m0) return m0[1];
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const d = new Date(t);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}

const atStartOfDayZ = (dateISO) => (dateISO ? `${dateISO}T00:00:00Z` : "");
const atEndOfDayZ   = (dateISO) => (dateISO ? `${dateISO}T23:59:59Z` : "");

const pick = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) { const s = v.map((x) => norm(x)).filter(Boolean).join(", "); if (s) return s; continue; }
    if (typeof v === "object") { const s = norm(v?.label ?? v?.name ?? v?.value ?? ""); if (s) return s; continue; }
    const s = norm(v);
    if (s) return s;
  }
  return fallback;
};

const getKeyCI = (obj, key) => {
  if (!obj || !key) return undefined;
  const target = norm(key).toLowerCase().replace(/[_\s]/g, "");
  if (obj[key] !== undefined) return obj[key];
  for (const k of Object.keys(obj)) {
    const kk = norm(k).toLowerCase().replace(/[_\s]/g, "");
    if (kk === target) return obj[k];
  }
  return undefined;
};

const pickCI = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = getKeyCI(obj, k);
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) { const s = v.map((x) => norm(x)).filter(Boolean).join(", "); if (s) return s; continue; }
    if (typeof v === "object") { const s = norm(v?.label ?? v?.name ?? v?.value ?? v?.text ?? ""); if (s) return s; continue; }
    const s = norm(v);
    if (s) return s;
  }
  return fallback;
};

const padLeadId = (v, width = 7) => {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(Math.trunc(n)).padStart(width, "0");
};

const formatLeadId = (leadIdRaw, ruleCodeRaw) => {
  const raw = norm(leadIdRaw);
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper.startsWith("LD-EX-") || upper.startsWith("LD-MN-") || upper.startsWith("LD-")) return raw;
  const padded = padLeadId(raw, 7);
  if (!padded) return "";
  const rule = norm(ruleCodeRaw).toUpperCase();
  if (rule === "MANUAL LEAD") return `LD-MN-${padded}`;
  if (rule === "R7")          return `LD-EX-${padded}`;
  return `LD-${padded}`;
};

const DEFAULT_FROM_DATE_ISO = "2020-01-22";
const todayISODate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const getSessionContext = () => {
  try {
    const tryParse = (v) => { try { return JSON.parse(v); } catch { return null; } };
    const candidates = [
      localStorage.getItem("sessionValues"), localStorage.getItem("session"), localStorage.getItem("userSession"),
      sessionStorage.getItem("sessionValues"), sessionStorage.getItem("session"), sessionStorage.getItem("userSession"),
    ].map((x) => (x ? tryParse(x) : null)).filter(Boolean);
    const fallback = {
      sessionId: sessionStorage.getItem("sessionId") || localStorage.getItem("sessionId") || "",
      loginCode: sessionStorage.getItem("loginCode") || localStorage.getItem("loginCode") || "",
      topCode:   sessionStorage.getItem("topCode")   || localStorage.getItem("topCode")   || "",
      userID:    sessionStorage.getItem("userID")    || localStorage.getItem("userID")    || "",
    };
    const pick = (o, ...ks) => { for (const src of [o, o?.data]) { if(!src) continue; for (const k of ks) if (src[k]!=null && src[k]!=="") return src[k]; } return ""; };
    const src = candidates.find((c)=>pick(c,"loginCode","LoginCode")||pick(c,"topCode","TopCode")) || candidates[0] || fallback;
    return {
      sessionId: norm(pick(src,"sessionId","SessionId")),
      loginCode: norm(pick(src,"loginCode","LoginCode")),
      topCode:   norm(pick(src,"topCode","TopCode")),
      userID:    norm(pick(src,"userID","UserID","userId")),
    };
  } catch { return { sessionId: "", loginCode: "", topCode: "", userID: "" }; }
};

const matchesLoginClinic = (centerLabel, centerValue, loginCode, topCode) => {
  const l = norm(centerLabel).toLowerCase(), v = norm(centerValue).toLowerCase();
  const a = norm(loginCode).toLowerCase(),   b = norm(topCode).toLowerCase();
  if (!a && !b) return false;
  if (a && (l===a||v===a||l.includes(a)||v.includes(a))) return true;
  if (b && (l===b||v===b||l.includes(b)||v.includes(b))) return true;
  return false;
};

const buildQS = (obj) => {
  const qs = new URLSearchParams();
  Object.entries(obj||{}).forEach(([k,v]) => {
    if (v===undefined||v===null) return;
    if (Array.isArray(v)) { v.forEach((item)=>{ if(item===undefined||item===null)return; const s=String(item).trim(); if(!s)return; qs.append(k,s); }); return; }
    const s = String(v).trim(); if(!s)return; qs.set(k,s);
  });
  return qs.toString();
};

const normStatus      = (v) => norm(v).toLowerCase().replace(/\s+/g," ");
const manualConvertedYesNo = (s) => normStatus(s)==="converted"?"YES":"NO";
const manualClosedBy  = (leadStatusRaw, modifiedByRaw) => {
  const s = normStatus(leadStatusRaw);
  return (s==="converted"||s==="not converted") ? norm(modifiedByRaw) : "";
};

/* ===========================
   Report Type & Column Configs
   =========================== */
const getReportType = (oppRuleCodes, isManualSelected) => {
  if (isManualSelected) return "manual";
  const rules = (Array.isArray(oppRuleCodes)?oppRuleCodes:[]).map((r)=>norm(r).toUpperCase());
  if (!rules.length) return "default";
  const hasExternal = rules.includes("R7"), hasNoShow = rules.includes("R3");
  if (rules.length===1) { if(hasExternal)return"external"; if(hasNoShow)return"noshow"; return"default"; }
  const nd = rules.filter((r)=>r==="R7"||r==="R3");
  if (nd.length===rules.length) { if(hasExternal&&!hasNoShow)return"external"; if(hasNoShow&&!hasExternal)return"noshow"; }
  return "default";
};

const COLUMN_CONFIGS = {
  noshow: [
    { key:"clinic",          header:"Clinic" },
    { key:"createdDate",     header:"Created Date" },
    { key:"oppCode",         header:"Campaign Code" },
    { key:"oppName",         header:"Campaign Name",       clickable:true },
    { key:"appointmentDate", header:"Appointment Date" },
    { key:"leadId",          header:"Lead ID" },
    { key:"leadName",        header:"Lead Name" },
    { key:"mobileNo",        header:"Mobile" },
    { key:"therapistName",   header:"Doctor/Therapist Name" },
    { key:"reasons",         header:"Reasons" },
    { key:"disposition",     header:"Disposition" },
    { key:"subDisposition",  header:"Sub-Disposition" },
    { key:"oppStatus",       header:"Lead Status",          clickable:true },
    { key:"salesOwner",      header:"Sales Owner" },
   { key: "modifiedBy",   header: "Modified By"   },
{ key: "modifiedDate", header: "Modified Date"  },
{ key: "closedBy",     header: "Closed By"      },
{ key: "closedDate",   header: "Closed Date"    },
  ],
  external: [
    { key:"clinic",          header:"Clinic" },
    { key:"createdDate",     header:"Created Date" },
    { key:"oppCode",         header:"Campaign Code" },
    { key:"oppName",         header:"Campaign Name",       clickable:true },
    { key:"leadId",          header:"Lead ID" },
    { key:"leadName",        header:"Lead Name" },
    { key:"mobileNo",        header:"Mobile" },
    { key:"interestedIn",    header:"Interested In" },
    { key:"therapistName",   header:"Doctor/Therapist Name" },
    { key:"medium",          header:"Medium" },
    { key:"source",          header:"Source" },
    { key:"subSource",       header:"Sub-Source" },
    { key:"disposition",     header:"Disposition" },
    { key:"subDisposition",  header:"Sub-Disposition" },
    { key:"oppStatus",       header:"Lead Status",          clickable:true },
    { key:"salesOwner",      header:"Sales Owner" },
   { key: "modifiedBy",   header: "Modified By"   },
{ key: "modifiedDate", header: "Modified Date"  },
{ key: "closedBy",     header: "Closed By"      },
{ key: "closedDate",   header: "Closed Date"    },
  ],
  manual: [
    { key:"clinic",          header:"Clinic" },
    { key:"createdDate",     header:"Created Date" },
    { key:"oppCode",         header:"Campaign Code" },
    { key:"oppName",         header:"Campaign Name",       clickable:true },
    { key:"leadId",          header:"Lead ID" },
    { key:"leadName",        header:"Lead Name" },
    { key:"mobileNo",        header:"Mobile" },
    { key:"interestedIn",    header:"Interested In" },
    { key:"therapistName",   header:"Doctor/Therapist Name" },
    { key:"medium",          header:"Medium" },
    { key:"source",          header:"Source" },
    { key:"subSource",       header:"Sub-Source" },
    { key:"disposition",     header:"Disposition" },
    { key:"subDisposition",  header:"Sub-Disposition" },
    { key:"oppStatus",       header:"Lead Status",          clickable:true },
    { key:"salesOwner",      header:"Sales Owner" },
   { key: "modifiedBy",   header: "Modified By"   },
{ key: "modifiedDate", header: "Modified Date"  },
{ key: "closedBy",     header: "Closed By"      },
{ key: "closedDate",   header: "Closed Date"    },
  ],
  default: [
    { key:"createdDate",     header:"Created Date" },
    { key:"leadId",          header:"Lead ID" },
    { key:"leadName",        header:"Lead Name" },
    { key:"oppName",         header:"Campaign Name",       clickable:true },
    { key:"appointmentDate", header:"Appointment Date" },
    { key:"therapistName",   header:"Therapist Name" },
    { key:"mobileNo",        header:"Mobile No" },
    { key:"campaignStatus",  header:"Campaign Status" },
    { key:"converted",       header:"Converted" },
    { key:"oppStatus",       header:"Lead Status",          clickable:true },
    { key:"salesOwner",      header:"Sales Owner" },
    { key:"reasons",         header:"Reasons" },
    { key:"createdBy",       header:"Created By" },
    { key: "modifiedBy",   header: "Modified By"   },
{ key: "modifiedDate", header: "Modified Date"  },
{ key: "closedBy",     header: "Closed By"      },
{ key: "closedDate",   header: "Closed Date"    },
    { key:"clinic",          header:"Clinic" },
  ],
};

/* ===========================
   SearchableDropdown
   =========================== */
function SearchableDropdown({ options, value, onChange, placeholder="None selected", multiple=false, disabled=false, width="100%", maxMenuHeight=280, showSelectAll=true, disabledValues=[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) { if(!wrapRef.current)return; if(!wrapRef.current.contains(e.target))setOpen(false); }
    document.addEventListener("mousedown", onDocClick);
    return ()=>document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(()=>{ const q=norm(query).toLowerCase(); if(!q)return options; return options.filter((o)=>norm(o.label).toLowerCase().includes(q)); },[options,query]);
  const isDisabledOption = (val)=>Array.isArray(disabledValues)&&disabledValues.includes(val);
  const isSelected = (val)=>multiple?Array.isArray(value)&&value.includes(val):value===val;

  const displayText = useMemo(()=>{
    if(multiple){ const vals=Array.isArray(value)?value:[]; if(!vals.length)return placeholder; return vals.map((v)=>options.find((o)=>o.value===v)?.label||v).filter(Boolean).join(", "); }
    if(!value)return placeholder;
    return options.find((o)=>o.value===value)?.label||value;
  },[value,options,multiple,placeholder]);

  const toggleItem = (val)=>{
    if(isDisabledOption(val))return;
    if(multiple){ const arr=Array.isArray(value)?[...value]:[]; const idx=arr.indexOf(val); if(idx>=0)arr.splice(idx,1); else arr.push(val); onChange(arr); }
    else{ onChange(val); setOpen(false); }
  };

  const allSelected = multiple&&Array.isArray(value)&&filtered.length>0&&filtered.every((o)=>value.includes(o.value));
  const toggleSelectAll = ()=>{
    if(!multiple)return;
    const selectable=filtered.filter((o)=>!isDisabledOption(o.value));
    const arr=Array.isArray(value)?[...value]:[];
    const allSel=selectable.length>0&&selectable.every((o)=>arr.includes(o.value));
    if(allSel){ onChange(arr.filter((v)=>!selectable.some((o)=>o.value===v))); }
    else{ const union=new Set(arr); selectable.forEach((o)=>union.add(o.value)); onChange(Array.from(union)); }
  };

  return (
    <div className={`dd-wrap ${disabled?"disabled":""}`} style={{width}} ref={wrapRef}>
      <button type="button" className="dd-input" onClick={()=>!disabled&&setOpen((v)=>!v)} disabled={disabled} aria-haspopup="listbox" aria-expanded={open}>
        <span className={`dd-text ${displayText===placeholder?"muted":""}`}>{displayText}</span>
        <span className="dd-caret">▾</span>
      </button>
      {open&&(
        <div className="dd-menu" style={{maxHeight:maxMenuHeight}}>
          <div className="dd-search">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search"/>
            {query&&<button className="clear" onClick={()=>setQuery("")} aria-label="Clear">×</button>}
          </div>
          {multiple&&showSelectAll&&(
            <label className="dd-option select-all">
              <input type="checkbox" checked={!!allSelected} onChange={toggleSelectAll}/>
              <span>Select all</span>
            </label>
          )}
          <div className="dd-list" role="listbox" aria-multiselectable={multiple}>
            {filtered.map((o)=>(
              <label key={o.value} className="dd-option">
                <input type="checkbox" checked={!!isSelected(o.value)} onChange={()=>toggleItem(o.value)} disabled={isDisabledOption(o.value)}/>
                <span style={isDisabledOption(o.value)?{opacity:0.6}:undefined}>{o.label}</span>
              </label>
            ))}
            {!filtered.length&&<div className="dd-empty">No matches</div>}
          </div>
        </div>
      )}
      <style jsx>{`
        .dd-wrap{position:relative}
        .dd-wrap.disabled{opacity:.6;pointer-events:none}
        .dd-input{width:100%;height:36px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:1px solid #e7ecf4;border-radius:8px;padding:0 10px;cursor:pointer;font-size:13px;color:#10223f;font-family:Lato,sans-serif}
        .dd-input:hover{border-color:#cdd6e6}
        .dd-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .dd-text.muted{color:#94a3b8}
        .dd-caret{color:#64748b;font-size:12px}
        .dd-menu{position:absolute;left:0;right:0;z-index:30;background:#fff;border:1px solid #e7ecf4;box-shadow:0 8px 26px rgba(16,34,63,.10);border-radius:10px;margin-top:6px;overflow:auto;width:280px}
        .dd-search{display:grid;grid-template-columns:1fr 22px;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #eef2f7}
        .dd-search input{height:30px;width:100%;border:1px solid #e7ecf4;border-radius:6px;padding:0 10px;outline:none;font-size:13px;color:#10223f;font-family:Lato,sans-serif}
        .dd-search input:focus{border-color:#334b71}
        .dd-search .clear{background:none;border:none;font-size:18px;line-height:1;color:#94a3b8;cursor:pointer}
        .dd-option{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;user-select:none;font-size:13px;color:#10223f}
        .dd-option+.dd-option{border-top:1px solid #f1f4f9}
        .dd-option:hover{background:#f4f6fa}
        .dd-option input{width:16px;height:16px;accent-color:#334b71}
        .dd-empty{padding:12px;color:#94a3b8;text-align:center;font-size:13px}
        .select-all{font-weight:700}
      `}</style>
    </div>
  );
}

/* ===========================
   Endpoints
   =========================== */
const OPP_DETAIL_PAGED_ENDPOINT = `${API_BASE_URL}/api/Opportunity/OppDetailReportPaged`;
const OPP_NAMES_ENDPOINT        = `${API_BASE_URL}/api/Opportunity/GetOppNames`;
const MANUAL_LEAD_LIST_ENDPOINT = `${API_BASE_URL}/api/LeadOpp/report/leadopps/list`;

/* ===========================
   Main Component
   =========================== */
export default function OpportunityDetailedReport() {
  const { has } = usePermissions();
  const navigate  = useNavigate();
  useLocation();

  // Dates
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");

  // Filters
  const [campaignStatusCode, setCampaignStatusCode] = useState("");
  const [oppRuleCodes,       setOppRuleCodes]       = useState([]);
  const [selectedSalesOwner, setSelectedSalesOwner] = useState(""); //  NEW

  const MANUAL_RULE_VALUE = "Manual Lead";
  const isManualSelected  = useMemo(()=>Array.isArray(oppRuleCodes)&&oppRuleCodes.includes(MANUAL_RULE_VALUE),[oppRuleCodes]);

  const sessionCtx = useMemo(()=>getSessionContext(),[]);
  const isCentriq  = norm(sessionCtx?.loginCode).toLowerCase()==="centriq clinics";

  const [userRoleName, setUserRoleName] = useState("");
  useEffect(()=>{
    const raw=localStorage.getItem("user")||localStorage.getItem("loggedInUser")||sessionStorage.getItem("user")||sessionStorage.getItem("loggedInUser");
    if(raw){ try{ const u=JSON.parse(raw); setUserRoleName(String(u?.roleName||"").trim()); }catch{} }
  },[]);

  const role      = (userRoleName||"").toLowerCase();
  const canExport = role!=="team member"&&role!=="clinic manager"&&role!=="finance reviwer";
  const canView   = role!=="clinic manager"&&role!=="finance reviwer";

  const [clinicCode,  setClinicCode]  = useState("");
  const [clinicCodes, setClinicCodes] = useState([]);
  const [oppNames,    setOppNames]    = useState([]);

  //  NEW: Sales owner options
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);

  const campaignStatusOptions = [{ value:"1",label:"Active" },{ value:"2",label:"Expired" }];
  const oppRuleOptions = [
    { value:"R1",          label:"Paid for X but not for Y" },
    { value:"R2",          label:"Paid for X Category in Y days and No future appointment in Z days for Category P" },
    { value:"R3",          label:"No show appointment for X days" },
    { value:"R4",          label:"Cancelled appointment for X days" },
    { value:"Manual Lead", label:"Manual Lead" },
    { value:"R5",          label:"Customer Special Day" },
    { value:"R6",          label:"Customer Type" },
    { value:"R7",          label:"External Source" },
  ];

  const disabledRuleValues = useMemo(()=>{ if(!isManualSelected)return[]; return oppRuleOptions.map((x)=>x.value).filter((v)=>v!==MANUAL_RULE_VALUE); },[isManualSelected]); // eslint-disable-line

  const [clinics,        setClinics]        = useState([]);
  const [datesTouched, setDatesTouched] = useState(false);

  const [oppNameOptions, setOppNameOptions] = useState([]);
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOppNames, setLoadingOppNames] = useState(false);
  const [toast, setToast] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [page,          setPage]          = useState(1);
  const [nonManualPage, setNonManualPage] = useState(1);
  const NON_MANUAL_PAGE_SIZE = 10;
  const pageSize             = 10;
  const [nonManualTotalCount, setNonManualTotalCount] = useState(0);
  const [manualMeta, setManualMeta] = useState({ pageNumber:1,pageSize:10,totalRecords:0,totalPages:1 });

  const pageCount = useMemo(()=>isManualSelected?Math.max(1,Number(manualMeta?.totalPages||1)):Math.max(1,Math.ceil(nonManualTotalCount/NON_MANUAL_PAGE_SIZE)),[isManualSelected,manualMeta,nonManualTotalCount]);
  const pageRows  = useMemo(()=>rows,[rows]);

  const reportType    = useMemo(()=>getReportType(oppRuleCodes,isManualSelected),[oppRuleCodes,isManualSelected]);
  const activeColumns = useMemo(()=>COLUMN_CONFIGS[reportType]||COLUMN_CONFIGS.default,[reportType]);
  const colSpanCount  = activeColumns.length;

  const showToast = (message,type="error",ms=2200)=>{ setToast({type,message}); setTimeout(()=>setToast(null),ms); };

  const campaignIdToOppCode = useMemo(()=>{ const m=new Map(); (oppNameOptions||[]).forEach((o)=>{ if(o?.value&&o?.oppcode)m.set(String(o.value),String(o.oppcode)); }); return m; },[oppNameOptions]);

  const selectedOppNameCSV = useMemo(()=>{
    const selectedIds=Array.isArray(oppNames)?oppNames.map(String):[];
    return selectedIds.map((id)=>oppNameOptions.find((o)=>String(o.value)===String(id))?.label).filter(Boolean).join(",");
  },[oppNames,oppNameOptions]);

  const [stripDisposition, setStripDisposition] = useState("");
  const [stripSalesOwner,  setStripSalesOwner]  = useState("");

  const stripDispositionOptions = useMemo(()=>{
    const seen = new Set();
    const opts = [];
    rows.forEach((r)=>{ const v=norm(r.disposition); if(v&&!seen.has(v)){ seen.add(v); opts.push({value:v,label:v}); } });
    return opts.sort((a,b)=>a.label.localeCompare(b.label));
  },[rows]);

  const stripSalesOwnerOptions = useMemo(()=>{
    const seen = new Set();
    const opts = [];
    rows.forEach((r)=>{ const v=norm(r.salesOwner); if(v&&!seen.has(v)){ seen.add(v); opts.push({value:v,label:v}); } });
    return opts.sort((a,b)=>a.label.localeCompare(b.label));
  },[rows]);

  const filteredPageRows = useMemo(()=>{
    return pageRows.filter((r)=>{
      const dispMatch = !stripDisposition || norm(r.disposition)===stripDisposition;
      const ownerMatch = !stripSalesOwner || norm(r.salesOwner)===stripSalesOwner;
      return dispMatch && ownerMatch;
    });
  },[pageRows, stripDisposition, stripSalesOwner]);

  //  NEW: Disposition summary computed from loaded rows
  const dispositionSummary = useMemo(()=>{
    if(!filteredPageRows.length) return [];
    const counts = {};
    filteredPageRows.forEach((r)=>{ const key=norm(r.disposition)||norm(r.oppStatus)||"Unknown"; counts[key]=(counts[key]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  },[filteredPageRows]); 

  //  NEW: Selected sales owner label for display
  const selectedSalesOwnerLabel = useMemo(()=>{
    if(!selectedSalesOwner) return "";
    return salesOwnerOptions.find((o)=>o.value===selectedSalesOwner)?.label||"";
  },[selectedSalesOwner,salesOwnerOptions]);

  // Refs for stable callbacks
  const clinicsRef          = useRef(clinics);
  const clinicCodeRef       = useRef(clinicCode);
  const clinicCodesRef      = useRef(clinicCodes);
  const fromDateRef         = useRef(fromDate);
  const toDateRef           = useRef(toDate);
  const campaignStatusRef   = useRef(campaignStatusCode);
  const oppRuleCodesRef     = useRef(oppRuleCodes);
  const oppNamesRef         = useRef(oppNames);
  const oppNameOptionsRef   = useRef(oppNameOptions);
  const isCentriqRef        = useRef(isCentriq);
  const isManualSelectedRef = useRef(isManualSelected);
  const salesOwnerRef       = useRef(selectedSalesOwner); //  NEW

  useEffect(()=>{ clinicsRef.current=clinics; },[clinics]);
  useEffect(()=>{ clinicCodeRef.current=clinicCode; },[clinicCode]);
  useEffect(()=>{ clinicCodesRef.current=clinicCodes; },[clinicCodes]);
  useEffect(()=>{ fromDateRef.current=fromDate; },[fromDate]);
  useEffect(()=>{ toDateRef.current=toDate; },[toDate]);
  useEffect(()=>{ campaignStatusRef.current=campaignStatusCode; },[campaignStatusCode]);
  useEffect(()=>{ oppRuleCodesRef.current=oppRuleCodes; },[oppRuleCodes]);
  useEffect(()=>{ oppNamesRef.current=oppNames; },[oppNames]);
  useEffect(()=>{ oppNameOptionsRef.current=oppNameOptions; },[oppNameOptions]);
  useEffect(()=>{ isCentriqRef.current=isCentriq; },[isCentriq]);
  useEffect(()=>{ isManualSelectedRef.current=isManualSelected; },[isManualSelected]);
  useEffect(()=>{ salesOwnerRef.current=selectedSalesOwner; },[selectedSalesOwner]); //  NEW

  const getSelectedClinicCentreId = useCallback(()=>{
    const cl=clinicsRef.current,cc=clinicCodeRef.current,ccs=clinicCodesRef.current,isc=isCentriqRef.current;
    if(!isc){ const opt=cl.find((c)=>norm(c.value)===norm(cc)); const id=opt?.recid; return id!==""&&id!==undefined&&id!==null?Number(id):undefined; }
    const sel=Array.isArray(ccs)?ccs:[];
    if(sel.length!==1)return undefined;
    const opt=cl.find((c)=>norm(c.value)===norm(sel[0])); const id=opt?.recid;
    return id!==""&&id!==undefined&&id!==null?Number(id):undefined;
  },[]);

  /* ---- Load clinics ---- */
  useEffect(()=>{
    (async()=>{
      try{
        setLoading(true);
        const r=await fetch(`${API_BASE_URL}/api/Settings/Centre/Hierarchy`,{credentials:"include",headers:AUTH_HEADERS()});
        const j=await r.json();
        const zones=Array.isArray(j?.data?.zones)?j.data.zones:[];
        const listAll=zones.flatMap((z)=>(Array.isArray(z?.clinics)?z.clinics:[]).map((c)=>({ value:norm(c.code??c.centerCode??c.name), label:c.name??(c.code??""), recid:c.recid??c.recId??c.id??"", zone:z?.zone??"" })));
        let list=listAll;
        if(!isCentriq){
          // Clinic level: match the logged-in clinic (userSession topCode, then loginCode)
          // against the hierarchy by CODE to get its name; payload uses the code.
          const want=norm(sessionCtx?.topCode)||norm(sessionCtx?.loginCode);
          let chosen=want?listAll.find((c)=>norm(c.value).toLowerCase()===want.toLowerCase()):null;
          if(!chosen) chosen=listAll.find((c)=>matchesLoginClinic(c.label,c.value,sessionCtx?.loginCode,sessionCtx?.topCode));
          if(!chosen) chosen=listAll[0]||null;
          list=chosen?[chosen]:[]; setClinicCode(chosen?.value||""); setClinicCodes([]);
        } else { setClinicCode(""); setClinicCodes([]); }
        setClinics(list);
      }catch(e){ console.error(e); setClinics([]); }finally{ setLoading(false); }
    })();
  },[]);// eslint-disable-line

  //  NEW: Load sales owners
  useEffect(()=>{
    (async()=>{
      try{
        const r=await fetch(`${API_BASE_URL}/api/Employees`,{credentials:"include",headers:AUTH_HEADERS()});

        const d=await r.json();
        const list=(Array.isArray(d)?d:d?[d]:[]).map((x)=>({
  value: norm(x.employeeCode??""),
  label: norm(x.employeeName??"") || (((x.firstName??"")+' '+(x.lastName??'')).trim()),
})).filter((o)=>o.value&&o.label);
        setSalesOwnerOptions(list);
      }catch(e){ console.error(e); }
    })();
  },[]);

  /* ---- Campaign names ---- */
  useEffect(()=>{
    const status=norm(campaignStatusCode);
    const rules=Array.isArray(oppRuleCodes)?oppRuleCodes.map(norm).filter(Boolean):[];
    if(!status||!rules.length){ setOppNameOptions([]); setOppNames([]); return; }
    const ac=new AbortController();
    (async()=>{
      setLoadingOppNames(true);
      try{
        const results=await Promise.all(rules.map(async(rule)=>{
          const r=await fetch(OPP_NAMES_ENDPOINT,{ method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...AUTH_HEADERS()},body:JSON.stringify({campStatus:status,ruleCode:rule}),signal:ac.signal });
          if(!r.ok)throw new Error(`HTTP ${r.status}`);
          const d=await r.json(); return Array.isArray(d)?d:d?[d]:[];
        }));
        const flat=results.flat();
        const uniq=Array.from(new Map(flat.map((x)=>({oppName:norm(x?.oppName),recid:x?.recid,oppcode:norm(x?.oppcode)})).filter((x)=>x.oppName&&x.recid!==undefined&&x.recid!==null).map((x)=>[String(x.recid),{value:String(x.recid),label:x.oppName,oppcode:x.oppcode,recid:x.recid}])).values()).sort((a,b)=>a.label.localeCompare(b.label));
        setOppNameOptions(uniq);
        setOppNames((prev)=>{ const pa=Array.isArray(prev)?prev:[]; if(!pa.length)return[]; const allowed=new Set(uniq.map((o)=>o.value)); return pa.filter((v)=>allowed.has(String(v))); });
      }catch(e){ if(e?.name==="AbortError")return; console.error(e); setOppNameOptions([]); setOppNames([]); showToast("Failed to load campaign names"); }
      finally{ setLoadingOppNames(false); }
    })();
    return()=>ac.abort();
  },[campaignStatusCode,oppRuleCodes]);// eslint-disable-line

  /* ---- fetchManualPage ---- */
  const fetchManualPage = useCallback(async(pageNumber,size)=>{
    const effectiveFromISO=toISODateOnly(fromDateRef.current)||DEFAULT_FROM_DATE_ISO;
    const effectiveToISO=toISODateOnly(toDateRef.current)||todayISODate();
    const isCent=isCentriqRef.current,cCodes=clinicCodesRef.current,cCode=clinicCodeRef.current;
    const names=oppNamesRef.current,nameOpts=oppNameOptionsRef.current,campStat=campaignStatusRef.current;
    const clinicCSV=isCent?(Array.isArray(cCodes)?cCodes:[]).map(norm).filter(Boolean).join(","):cCode||"";
    const oppStatusInt=campStat!==""&&!Number.isNaN(Number(campStat))?Number(campStat):undefined;
    const clinicCentreId=getSelectedClinicCentreId();
    const selectedCampaignIds=Array.isArray(names)?names.map((x)=>Number(x)).filter((n)=>typeof n==="number"&&!Number.isNaN(n)):[];
    const selectedOppNameCSVLocal=(Array.isArray(names)?names:[]).map((id)=>nameOpts.find((o)=>String(o.value)===String(id))?.label).filter(Boolean).join(",");
    const qs=buildQS({ FromDate:atStartOfDayZ(effectiveFromISO),ToDate:atEndOfDayZ(effectiveToISO),OppStatus:oppStatusInt,ClinicCode:clinicCSV||"",ORuleCode:MANUAL_RULE_VALUE,CampaignIds:selectedCampaignIds,clinicCentreId,OppName:selectedOppNameCSVLocal,DateFlag:"0",PageNumber:pageNumber,PageSize:size });
    const r=await fetch(`${MANUAL_LEAD_LIST_ENDPOINT}?${qs}`,{method:"GET",credentials:"include",headers:AUTH_HEADERS()});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return r.json();
  },[getSelectedClinicCentreId]);

  /* ---- normalizeRow ---- */
  const normalizeRow = useCallback((x,i,isManual,resolvedOppCode)=>{
    const fmt=(s)=>{ const iso=toISODateOnly(s); if(!iso)return""; const dt=new Date(iso); return isNaN(dt)?"":(new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})).format(dt); };
const fmtSafe=(s)=>{ const r=fmt(s); return r.endsWith("1900")?"":r; };
    const yesNo=(v)=>{ const s=String(v??"").toLowerCase(); if(["1","true","y","yes"].includes(s))return"YES"; if(["0","false","n","no"].includes(s))return"NO"; return s?"YES":"NO"; };
    const createdRaw=pick(x,["createdDate","createdOn"]);
    const leadOppIdRaw=pick(x,["leadOpp_ID","leadOppId","id","leadID","leadId"]);
    const ruleCodeRaw=pick(x,["oRuleCode","ruleCode","oppRule","oRule","rule"]);
    const dispositionRaw=pickCI(x,["DispositionName","disposition","Disposition","dispositionName","leadDisposition"]);
    const subDispositionRaw=pickCI(x,["SubDispositionName","subDisposition","SubDisposition","subDispositionName"]);
    const closedDateRaw=pickCI(x,["ClosedDate","closedDate","closedOn","closeDate","ModifiedDate","modifiedDate"]);
    const interestedInRaw=pickCI(x,["InterestedIn","InteresetedVerticalName","interestedIn","interestedInName","InterestedInName"]);
    const mediumRaw=pickCI(x,["Medium","MediumName","medium","leadMedium"]);
    const sourceRaw=pickCI(x,["Source","SourceName","source","leadSource"]);
    const subSourceRaw=pickCI(x,["SubSource","SubSourceName","subSource","sub_source"]);

    if(isManual){
      const campaignStatusRaw=pick(x,["status","campaignStatus","campaignState"]);
      const leadStatusRaw=pick(x,["oppStatus","leadStatus","statusName","Status","status"]);
      const modifiedByRaw=pick(x,["modifiedBy","modifiedByName"]);
      const mobileNo=norm(pickCI(x,["mobile","mobileNo","mobileNumber","phone","phoneNo"]));
      const therapistNameRaw=pick(x,["therapistName","therapist","providerName","doctorName"]);
      return {
        key:        pick(x,["leadOpp_ID","id"],`m-${i}`),
        oppCode:    resolvedOppCode||"",
        createdDate:fmt(createdRaw),
        leadId:     formatLeadId(leadOppIdRaw,ruleCodeRaw),
        leadName:   pick(x,["customerName","leadName","custName","name"]),
        oppName:    pick(x,["oppName"]),
        campaignStatus:campaignStatusRaw,
        converted:  manualConvertedYesNo(leadStatusRaw),
        therapistName:therapistNameRaw||"None",
        appointmentDate:"",
        oppStatus:  pick(x,["Status","status","oppStatus","leadStatus"]),
        mobileNo,
        salesOwner: pick(x,["saleOwner","salesOwner","salesowner"]),
        reasons:    "",
        createdBy:  pick(x,["saleOwner","salesOwner","salesowner"]),
        modifiedBy:   norm(x?.modifiedBy ?? x?.ModifiedBy ?? "") || norm(modifiedByRaw),
        modifiedDate: fmtSafe(norm(x?.modifiedDate ?? x?.ModifiedDate ?? "")),
        closedBy:     norm(x?.closedBy ?? x?.ClosedBy ?? "") || manualClosedBy(leadStatusRaw, modifiedByRaw),
        closedDate:   fmt(norm(x?.closedDate ?? x?.ClosedDate ?? "")),
        clinic:     pick(x,["clinicName","centerName","clinic"]),
        disposition:    dispositionRaw||leadStatusRaw,
        subDisposition: subDispositionRaw,
        interestedIn:   interestedInRaw,
        medium:         mediumRaw,
        source:         sourceRaw,
        subSource:      subSourceRaw,
      };
    }

    const leadIdRaw=pick(x,["leadID","leadId","leadid","leadCode","id","custId","customerId"]);
    const fromRaw=pick(x,["fromDate","campaignFromDate"]);
    const toRaw=pick(x,["toDate","campaignToDate"]);
    const ruleRaw=pick(x,["ruleCode","oppRule","oRuleCode","rule"]);
    const apptRaw=pick(x,["appointmentDate","apptDate","appointment_date","AppointmentDate"]);
    const isExternalRow=norm(ruleRaw).toUpperCase()==="R7";
    const therapistNameRaw=pick(x,["therapistName","therapist","providerName","doctorName"]);
    const mobileRaw=pickCI(x,["mobileNo","mobile","mobileNumber","phone","phoneNo","phoneNumber","mobile_no","mobile_no.","customerMobile","customerMobileNo","custMobile"]);
    const mobileNo=norm(mobileRaw);
    const oppStatusRaw=pick(x,["statusName","oppStatus","status"]);

    return {
      key:            pick(x,["oppCode","opportunityCode","code","id"],`row-${i}`),
      oppCode:        pick(x,["oppCode","opportunityCode","code"]),
      fromDate:       fmt(fromRaw),
      toDate:         fmt(toRaw),
      createdDate:    fmt(pick(x,["createdDate","createdOn"])),
      appointmentDate:isExternalRow?"":fmt(apptRaw),
      mobileNo,
      leadId:         formatLeadId(leadIdRaw,ruleRaw),
      therapistName:  therapistNameRaw,
      ruleCode:       ruleRaw,
      salesOwner:     pickCI(x,["salesOwner","salesowner","SalesOwner","sales_owner","salesOwnerName","salesOwnerFullName","salesOwnerEmpCode","salesOwnerEmployeeCode","ownerName","owner"]),
      reasons:        pickCI(x,["reasons","Reasons","reason","reasonName","reasonText","reasonDesc","remarksReason","remarks"]),
      leadName:       pick(x,["leadName","customerName","custName","name"]),
      oppName:        pick(x,["oppName","opportunityName","nameOfOpp"]),
      campaignStatus: pick(x,["campaignStatus","campaignState","statusCampaign"]),
      converted:      yesNo(pick(x,["converted","isConverted"])),
      oppStatus:      oppStatusRaw,
      createdBy:      pick(x,["createdByName","createdBy","ownerName"]),
        modifiedBy:     norm(x?.modifiedBy   ?? x?.ModifiedBy   ?? ""),
      modifiedDate:   fmtSafe(norm(x?.modifiedDate ?? x?.ModifiedDate ?? "")),

      closedBy:       norm(x?.closedBy     ?? x?.ClosedBy     ?? ""),
      closedDate:     norm(x?.closedDate   ?? x?.ClosedDate   ?? ""),
      clinic:         pick(x,["CNAME","centerName","clinicName","center"]),
      disposition:    dispositionRaw||oppStatusRaw,
      subDisposition: subDispositionRaw,
      interestedIn:   interestedInRaw,
      medium:         mediumRaw,
      source:         sourceRaw,
      subSource:      subSourceRaw,
    };
  },[]);

  /* ---- loadDetailed ---- */
  const loadDetailed = useCallback(async(pageOverride)=>{
    setDatesTouched(true);
    const curFromDate=fromDateRef.current,curToDate=toDateRef.current;
    const curIsManual=isManualSelectedRef.current,curOppRuleCodes=oppRuleCodesRef.current;
    const curCampaignStatus=campaignStatusRef.current,curClinicCode=clinicCodeRef.current;
    const curClinicCodes=clinicCodesRef.current,curIsCentriq=isCentriqRef.current;
    const curOppNames=oppNamesRef.current,curOppNameOptions=oppNameOptionsRef.current;
    const curSalesOwner=salesOwnerRef.current; //  NEW

    if(!curFromDate||!curToDate){ showToast("Please select both From Date and To Date","error"); return; }
    setLoading(true);
    if(Number(pageOverride||1)===1) setHasSearched(false); //  reset on fresh search
    const requestedPage=Number(pageOverride||1);
    if(curIsManual)setPage(requestedPage); else setNonManualPage(requestedPage);

    try{
      const effectiveFromISO=toISODateOnly(curFromDate)||DEFAULT_FROM_DATE_ISO;
      const effectiveToISO=toISODateOnly(curToDate)||todayISODate();
      const clinicCSV=curIsCentriq?(Array.isArray(curClinicCodes)?curClinicCodes:[]).map(norm).filter(Boolean).join(","):curClinicCode||"";
      let arr=[];

      if(curIsManual){
        const manualResp=await fetchManualPage(requestedPage,pageSize);
        arr=Array.isArray(manualResp?.data)?manualResp.data:[];
        setManualMeta({ pageNumber:Number(manualResp?.pageNumber||requestedPage||1),pageSize:Number(manualResp?.pageSize||pageSize),totalRecords:Number(manualResp?.totalRecords||0),totalPages:Number(manualResp?.totalPages||1) });
      } else {
        const rulesCSV=(Array.isArray(curOppRuleCodes)?curOppRuleCodes:[]).map(norm).filter(Boolean).join(",");
        const curSelectedOppNameCSV=(Array.isArray(curOppNames)?curOppNames:[]).map((id)=>curOppNameOptions.find((o)=>String(o.value)===String(id))?.label).filter(Boolean).join(",");
        const body={
          fromDate:   atStartOfDayZ(effectiveFromISO),
          toDate:     atEndOfDayZ(effectiveToISO),
          oppStatus:  curCampaignStatus||"",
          clinicCode: clinicCSV||"",
          oppRule:    rulesCSV||"",
          oppName:    curSelectedOppNameCSV,
          dateFlag:   "0",
          pageNumber: requestedPage,
          pageSize:   NON_MANUAL_PAGE_SIZE,
          salesOwner: curSalesOwner||"",  //  NEW
        };
        const r=await fetch(OPP_DETAIL_PAGED_ENDPOINT,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...AUTH_HEADERS()},body:JSON.stringify(body)});
        if(!r.ok)throw new Error(`HTTP ${r.status}`);
        const d=await r.json();
        arr=Array.isArray(d?.data)?d.data:[];
        setNonManualTotalCount(Number(d?.totalCount||0));
        setManualMeta({pageNumber:1,pageSize,totalRecords:0,totalPages:1});
      }

      const normalized=arr.map((x,i)=>{ const campId=pick(x,["camp_id","campId","campaignId","recid"]); return normalizeRow(x,i,curIsManual,campaignIdToOppCode.get(String(campId))); });
      setRows(normalized);
      setHasSearched(true); 
      setStripDisposition(""); //  reset strip on new search
      setStripSalesOwner("");  //  reset strip on new search
    }catch(e){
      console.error(e); showToast("Failed to load opportunity report");
      setRows([]); setManualMeta({pageNumber:1,pageSize,totalRecords:0,totalPages:1}); setNonManualTotalCount(0); setPage(1); setNonManualPage(1);
    }finally{ setLoading(false); }
  },[fetchManualPage,normalizeRow,campaignIdToOppCode]);

  function onClickOpp(code){ const c=norm(code); if(!c)return; navigate(`/opportunity/view/${encodeURIComponent(c)}`,{state:{from:"opp-detail"}}); }

  /* ---- exportExcel ---- */
  async function exportExcel(){
    setDatesTouched(true);
    if(!nonManualTotalCount&&!rows.length)return;
    let exportRows=rows;
    if(isManualSelected){
      try{
        const first=await fetchManualPage(1,pageSize); const totalPages=Number(first?.totalPages||1); const all=[];
        const pushData=(resp)=>{ const data=Array.isArray(resp?.data)?resp.data:[]; all.push(...data); };
        pushData(first);
        for(let p=2;p<=totalPages;p++){ const next=await fetchManualPage(p,pageSize); pushData(next); }
        exportRows=all.map((x,i)=>{ const campId=pick(x,["camp_id","campId","campaignId","recid"]); return normalizeRow(x,i,true,campaignIdToOppCode.get(String(campId))); });
      }catch(e){ console.error(e); showToast("Manual export failed"); return; }
    } else {
      try{
        const effectiveFromISO=toISODateOnly(fromDate)||DEFAULT_FROM_DATE_ISO;
        const effectiveToISO=toISODateOnly(toDate)||todayISODate();
        const clinicCSV=isCentriq?(Array.isArray(clinicCodes)?clinicCodes:[]).map(norm).filter(Boolean).join(","):clinicCode||"";
        const rulesCSV=(Array.isArray(oppRuleCodes)?oppRuleCodes:[]).map(norm).filter(Boolean).join(",");
        const body={ fromDate:atStartOfDayZ(effectiveFromISO),toDate:atEndOfDayZ(effectiveToISO),oppStatus:campaignStatusCode||"",clinicCode:clinicCSV||"",oppRule:rulesCSV||"",oppName:selectedOppNameCSV,dateFlag:"0",pageNumber:0,pageSize:NON_MANUAL_PAGE_SIZE,salesOwner:selectedSalesOwner||"" };
        const r=await fetch(OPP_DETAIL_PAGED_ENDPOINT,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...AUTH_HEADERS()},body:JSON.stringify(body)});
        if(!r.ok)throw new Error(`HTTP ${r.status}`);
        const d=await r.json(); const allRaw=Array.isArray(d?.data)?d.data:[];
        exportRows=allRaw.map((x,i)=>normalizeRow(x,i,false,null));
      }catch(e){ console.error(e); showToast("Export failed"); return; }
    }

    const hasCampCodeCol=activeColumns.some((c)=>c.key==="oppCode");
    const headers=activeColumns.map((c)=>c.header);
    if(!hasCampCodeCol)headers.push("Campaign Code");
    const aoa=[headers,...exportRows.map((r)=>{ const vals=activeColumns.map((c)=>r[c.key]??""); if(!hasCampCodeCol)vals.push(r.oppCode??""); return vals; })];
    const XLSXMod=await import("xlsx"); const XLSX=XLSXMod.default||XLSXMod;
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"]=headers.map((h,cIdx)=>{ const maxLen=Math.max(h.length,...aoa.slice(1).map((row)=>String(row?.[cIdx]??"").length)); return{wch:Math.min(Math.max(12,maxLen+2),40)}; });
    ws["!autofilter"]={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:aoa.length-1,c:headers.length-1}})};
    XLSX.utils.book_append_sheet(wb,ws,"Opportunity Detail");
    XLSX.writeFile(wb,`Opportunity_Detailed_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  /* ---- Page buttons ---- */
  const renderNonManualPageButtons=()=>{
    const windowSize=5,totalPages=pageCount,currentPage=nonManualPage;
    let start=Math.max(1,currentPage-Math.floor(windowSize/2));
    let end=Math.min(totalPages,start+windowSize-1);
    start=Math.max(1,end-windowSize+1);
    const nodes=[];
    if(start>1){ nodes.push(<button key="p1" className="pagebtn" onClick={()=>loadDetailed(1)}>1</button>); if(start>2)nodes.push(<span key="d1" className="pagecount">…</span>); }
    for(let i=start;i<=end;i++) nodes.push(<button key={i} className={`pagebtn ${i===currentPage?"pagebtn-active":""}`} onClick={()=>loadDetailed(i)}>{i}</button>);
    if(end<totalPages){ if(end<totalPages-1)nodes.push(<span key="d2" className="pagecount">…</span>); nodes.push(<button key={`p${totalPages}`} className="pagebtn" onClick={()=>loadDetailed(totalPages)}>{totalPages}</button>); }
    return nodes;
  };

  /* ===========================
     RENDER
  =========================== */
  // View-only report, gated on its Reports permission (FRD 4.10). Without the
  // right the user gets Access Denied instead of the report (TC-040).
  if (!has("RPT.OPPORTUNITY_DETAILED")) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", fontFamily:"Lato,sans-serif", gap:12 }}>
      <div style={{ fontSize:18, fontWeight:800, color:"#b91c1c" }}>Access Denied</div>
      <div style={{ fontSize:13, color:"#64748b", textAlign:"center", maxWidth:420 }}>
        You do not have permission to view the Opportunity Detailed report.
      </div>
    </div>
  );

  return (
    <div className="wrap">
      <h1 className="title">Opportunity Detail Report</h1>

      <div className="breadcrumb">
        <span className="crumb-link" onClick={()=>navigate("/")}>DashBoard</span>
        <span className="sep"> &gt; </span>
        <span className="crumb-dim">Opportunity Detail</span>
      </div>

      <div className="filters">
        <div className="grid">
          {/* From Date */}
<div className="frow">
  <label>Created From Date <span className="req">*</span></label>
  <input
    type="date"
    value={fromDate}
    onChange={(e)=>setFromDate(toISODateOnly(e.target.value))}
    className={datesTouched && !fromDate ? "input-error" : ""}  // ✅ guard with datesTouched
  />
</div>

{/* To Date */}
<div className="frow">
  <label>Created To Date <span className="req">*</span></label>
  <input
    type="date"
    value={toDate}
    onChange={(e)=>setToDate(toISODateOnly(e.target.value))}
    className={datesTouched && !toDate ? "input-error" : ""}  // ✅ guard with datesTouched
  />
</div>

          {/* Campaign Status */}
          <div className="frow">
            <label>Campaign Status</label>
            <SearchableDropdown options={campaignStatusOptions} value={campaignStatusCode} onChange={setCampaignStatusCode} placeholder="None selected" multiple={false}/>
          </div>

          {/* Campaign Rule */}
          <div className="frow">
            <label>Campaign Rule</label>
            <SearchableDropdown
              options={oppRuleOptions} value={oppRuleCodes}
              onChange={(next)=>{ const arr=Array.isArray(next)?next:[]; const hasManual=arr.includes(MANUAL_RULE_VALUE); if(hasManual)setOppRuleCodes([MANUAL_RULE_VALUE]); else setOppRuleCodes(arr.filter((v)=>v!==MANUAL_RULE_VALUE)); }}
              placeholder="None selected" multiple showSelectAll disabledValues={disabledRuleValues}
            />
          </div>

          {/* Campaign Name */}
          <div className="frow">
            <label>Campaign Name</label>
            <SearchableDropdown
              options={oppNameOptions} value={oppNames} onChange={setOppNames} multiple
              placeholder={!campaignStatusCode||!(oppRuleCodes||[]).length?"Select status & rule first":"None selected"}
              disabled={!campaignStatusCode||!(oppRuleCodes||[]).length||loadingOppNames}
            />
            {loadingOppNames&&<small className="hint">Loading campaign names…</small>}
          </div>

          {/* Clinic */}
          <div className="frow">
            <label>Clinic</label>
            {isCentriq
              ? <SearchableDropdown options={clinics} value={clinicCodes} onChange={setClinicCodes} placeholder="None selected" multiple showSelectAll/>
              : <SearchableDropdown options={clinics} value={clinicCode} onChange={setClinicCode} placeholder="None selected" multiple={false} disabled={true} showSelectAll={false}/>
            }
          </div>

          
        </div>

        <div className="actions">
          {canView&&<button className="btn" onClick={()=>loadDetailed(1)} disabled={loading}>View</button>}
          {canExport&&<button className="btn" onClick={exportExcel} disabled={!rows.length}>Export</button>}
        </div>
      </div>

       {hasSearched && rows.length > 0 && (
        <div className="filter-strip">
          <span className="strip-label">Filter Results:</span>
          <div className="strip-field">
            <label>Disposition</label>
            <SearchableDropdown
              options={stripDispositionOptions}
              value={stripDisposition}
              onChange={setStripDisposition}
              placeholder="All"
              multiple={false}
              showSelectAll={false}
              width="180px"
            />
          </div>
          <div className="strip-field">
            <label>Sales Owner</label>
            <SearchableDropdown
              options={stripSalesOwnerOptions}
              value={stripSalesOwner}
              onChange={setStripSalesOwner}
              placeholder="All"
              multiple={false}
              showSelectAll={false}
              width="200px"
            />
          </div>
          {(stripDisposition||stripSalesOwner) && (
            <button className="strip-clear" onClick={()=>{ setStripDisposition(""); setStripSalesOwner(""); }}>
              ✕ Clear
            </button>
          )}
          <span className="strip-count">
            Showing <strong>{filteredPageRows.length}</strong> of <strong>{rows.length}</strong> on this page
          </span>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>{activeColumns.map((col)=><th key={col.key}>{col.header}</th>)}</tr>
            </thead>
            <tbody>
              {loading&&<tr><td colSpan={colSpanCount} className="loading">Loading…</td></tr>}
              {!loading && !filteredPageRows.length &&<tr><td colSpan={colSpanCount} className="empty">No data</td></tr>}
              {!loading && filteredPageRows.map((r, idx) => (
                <tr key={`${r.key}-${idx}`}>
                  {activeColumns.map((col)=>(
                    <td key={col.key}>
                      {col.clickable
                        ? <button className="link" onClick={()=>onClickOpp(r.oppCode)}>{r[col.key]}</button>
                        : r[col.key]??""
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/*  NEW: Disposition Summary Panel */}
        {dispositionSummary.length>0&&(
          <div className="disp-summary">
            {selectedSalesOwnerLabel&&(
              <span className="disp-owner">Sales Owner: <strong>{selectedSalesOwnerLabel}</strong></span>
            )}
            <span className="disp-label">Disposition Summary:</span>
            {dispositionSummary.map(([name,count])=>(
              <span key={name} className="disp-chip">{name}: <strong>{count}</strong></span>
            ))}
          </div>
        )}

        {/* Pager */}
        <div className="pager">
          {!isManualSelected&&nonManualTotalCount>0&&(
            <span className="pager-info">
              Showing <strong>{(nonManualPage-1)*NON_MANUAL_PAGE_SIZE+1}–{Math.min(nonManualPage*NON_MANUAL_PAGE_SIZE,nonManualTotalCount)}</strong> of <strong>{nonManualTotalCount}</strong>
            </span>
          )}
          <button className="pagebtn" disabled={isManualSelected?page<=1:nonManualPage<=1} onClick={()=>{ if(isManualSelected)loadDetailed(page-1); else loadDetailed(nonManualPage-1); }}>Prev</button>
          {!isManualSelected&&renderNonManualPageButtons()}
          {isManualSelected&&<span className="pageno">{page}</span>}
          <button className="pagebtn" disabled={isManualSelected?page>=pageCount:nonManualPage>=pageCount} onClick={()=>{ if(isManualSelected)loadDetailed(page+1); else loadDetailed(nonManualPage+1); }}>Next</button>
          {isManualSelected&&<span className="pagecount">/ {pageCount}</span>}
        </div>
      </div>

      {toast&&<div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .wrap{font-family:Lato,sans-serif;min-height:100vh;color:#10223f}
        .title{font-size:22px;font-weight:800;color:#071D49;margin:0 0 6px}
        .breadcrumb{color:#64748b;margin:18px 0;font-size:13px}
        .crumb-link{color:#334b71;cursor:pointer;font-weight:600}
        .crumb-dim{color:#94a3b8}
        .sep{margin:0 6px}
        .req{color:#cc6b5c;margin-left:2px}
        .filters{background:#fff;border:1px solid #e7ecf4;border-radius:12px;box-shadow:0 1px 2px rgba(16,34,63,.04);padding:18px;margin-bottom:16px}
        .grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px 18px}
        .frow{display:flex;flex-direction:column;gap:6px}
        label{font-size:12px;font-weight:700;color:#475569}
        input[type="date"]{height:36px;border:1px solid #e7ecf4;border-radius:8px;padding:0 10px;outline:none;background:#fff;font-size:13px;color:#10223f;font-family:Lato,sans-serif}
        input[type="date"]:focus{border-color:#334b71}
        input[type="date"].input-error{border-color:#cc6b5c;background:#fdf3f1}
        .hint{color:#64748b;font-size:12px;margin-top:2px}
        .actions{margin-top:14px;display:flex;gap:12px;justify-content:flex-end}
        .btn{background:#334b71;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-weight:700;font-size:13px;cursor:pointer;font-family:Lato,sans-serif}
        .btn:hover{background:#2a3f60}
        .btn[disabled]{opacity:.55;cursor:not-allowed}
        .table-wrap{background:#fff;border:1px solid #e7ecf4;border-radius:12px;box-shadow:0 1px 2px rgba(16,34,63,.04);padding:6px 0}
        .table-scroll{max-height:420px;overflow:auto}
        table.tbl{width:100%;min-width:1200px;border-collapse:separate;border-spacing:0}
        .tbl thead th{position:sticky;top:0;background:#f4f6fa;z-index:2;text-align:left;font-size:12px;color:#475569;font-weight:700;padding:11px 14px;border-bottom:1px solid #e7ecf4;white-space:nowrap;text-transform:uppercase;letter-spacing:.03em}
        .tbl tbody td{font-size:12px;color:#10223f; white-space:nowrap; padding:8px 14px;border-bottom:1px solid #f1f4f9;vertical-align:top;line-height:1.35}
        .tbl tbody tr:hover{background:#f8fafc}
        .link{background:none;border:none;padding:0;font-size:12px;color:#334b71;cursor:pointer;font-weight:600;text-align:left;font-family:Lato,sans-serif}
        .link:hover{text-decoration:underline}
        .loading,.empty{text-align:center;color:#64748b;padding:18px;font-size:13px}
        .disp-summary{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid #eef2f7;font-size:12px;color:#475569}
        .disp-owner{margin-right:8px;color:#071D49;font-size:12px}
        .disp-label{font-weight:700;color:#475569;margin-right:4px}
        .disp-chip{background:#eef2f7;border-radius:20px;padding:3px 10px;color:#10223f;font-size:12px}
        .pager{display:flex;align-items:center;gap:8px;justify-content:flex-end;padding:12px 14px;flex-wrap:wrap}
        .pager-info{font-size:13px;color:#64748b;margin-right:4px}
        .pagebtn{background:#fff;color:#10223f;border:1px solid #e7ecf4;border-radius:7px;padding:6px 11px;cursor:pointer;font-size:13px;font-weight:600;font-family:Lato,sans-serif}
        .pagebtn:hover:not(:disabled){border-color:#334b71;color:#334b71}
        .pagebtn:disabled{opacity:0.45;cursor:not-allowed}
        .pagebtn-active{background:#334b71!important;color:#fff!important;border-color:#334b71!important}
        .pageno,.pagecount{color:#64748b;font-weight:600;font-size:13px}
        .toast{position:fixed;bottom:16px;right:16px;color:#fff;background:#cc6b5c;padding:10px 14px;border-radius:8px;font-weight:600;box-shadow:0 6px 18px rgba(16,34,63,.18);z-index:9999}
        .toast.success{background:#4a9e8a}
        .filter-strip{display:flex;align-items:center;flex-wrap:wrap;gap:12px;background:#e9edf5;border:1px solid #e7ecf4;border-radius:10px;padding:12px 16px;margin-bottom:12px}
        .strip-label{font-size:12px;font-weight:700;color:#334b71;margin-right:4px}
        .strip-field{display:flex;flex-direction:column;gap:4px}
        .strip-field label{font-size:11px;font-weight:700;color:#475569}
        .strip-clear{background:#cc6b5c;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;align-self:flex-end}
        .strip-count{font-size:12px;color:#64748b;margin-left:auto}
        @media(max-width:1200px){.grid{grid-template-columns:repeat(4,1fr)}}
        @media(max-width:700px){.grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}