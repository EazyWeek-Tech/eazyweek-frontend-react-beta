// src/pages/Opportunity/CreateCampaign.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/* ── Theme ──────────────────────────────────────────────────────────────────── */
const C = {
  navy:"#334b71", navyDk:"#071D49", navyLt:"#e9edf5",
  border:"#e7ecf4", bg:"#f4f6fa", text:"#10223f", sub:"#64748b",
  green:"#166534", greenBg:"#dcfce7", red:"#b91c1c", redBg:"#fef2f2",
  yellow:"#92400e", yellowBg:"#fef3c7",
};

/* ── Rules config ────────────────────────────────────────────────────────────── */
const RULES = [
  { code:"R1",          label:"R1 — Paid for X but not for Y",                   hasSegment:true,  hasDays:true,  hasDateRange:true  },
  { code:"R2",          label:"R2 — Paid X Category in Y days, No future appt in Z days for Category P", hasSegment:true,  hasDays:true,  hasDateRange:true  },
  { code:"R3",          label:"R3 — No Show Appointment",                        hasSegment:true,  hasDays:true,  hasDateRange:true  },
  { code:"R4",          label:"R4 — Cancelled Appointment",                      hasSegment:true,  hasDays:true,  hasDateRange:true  },
  { code:"R5",          label:"R5 — Customer Special Day",                       hasSegment:true,  hasDays:false, hasDateRange:true  },
  { code:"R6",          label:"R6 — Customer Type",                              hasSegment:true,  hasDays:false, hasDateRange:true  },
  { code:"R7",          label:"R7 — External Source",                            hasSegment:false, hasDays:false, hasDateRange:true  },
  { code:"Manual Lead", label:"Manual Lead — Manual campaign",                   hasSegment:false, hasDays:false, hasDateRange:false },
];

const TOKEN    = () => localStorage.getItem("token")||sessionStorage.getItem("token")||"";
const authGet  = async (url) => { const r = await fetch(url,{headers:{Authorization:`Bearer ${TOKEN()}`}}); const j=await r.json(); return j.data??j; };
const authPost = async (url, body) => { const r = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${TOKEN()}`},body:JSON.stringify(body)}); return r.json(); };

const searchServices = async (query, centerCode) => {
  if (!query || query.length < 2) return [];
  try {
    const d = await authGet(`${API_BASE_URL}/api/Master/GetServiceByName/${encodeURIComponent(query)}/${encodeURIComponent(centerCode||"")}`);
    return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
  } catch { return []; }
};

/* ════════════════════════════════════════════════════════════════════════════
   MODULE-LEVEL COMPONENTS
   ════════════════════════════════════════════════════════════════════════════ */

function StepBar({ step }) {
  const steps = ["General Info", "Rule Config", "Activate"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:28, gap:0 }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const done   = step > n;
        const active = step === n;
        return (
          <div key={n} style={{ display:"flex", alignItems:"center", flex:1 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:"none" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", display:"flex",
                alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13,
                background: done ? C.green : active ? C.navy : "#d3dbe8",
                color: done||active ? "#fff" : C.sub }}>
                {done ? "✓" : n}
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:active?C.navy:done?C.green:C.sub,
                whiteSpace:"nowrap" }}>{s}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex:1, height:2, background:done?C.green:"#d3dbe8", margin:"0 8px", marginBottom:16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldRow({ label, required, error, children, hint }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.sub,
        textTransform:"uppercase", letterSpacing:".04em", marginBottom:5 }}>
        {label}{required && <span style={{ color:C.red }}> *</span>}
      </label>
      {children}
      {hint  && <div style={{ fontSize:11, color:C.sub,  marginTop:4 }}>{hint}</div>}
      {error && <div style={{ fontSize:11, color:C.red,  marginTop:4 }}>⚠ {error}</div>}
    </div>
  );
}

function FInput({ value, onChange, placeholder, type, min, readOnly }) {
  return (
    <input type={type||"text"} value={value} onChange={onChange}
      placeholder={placeholder} min={min} readOnly={readOnly}
      style={{ width:"100%", padding:"10px 12px", border:`1px solid ${C.border}`,
        borderRadius:8, fontSize:13, fontFamily:"Lato,sans-serif", outline:"none",
        background:readOnly?"#f8fafc":"#fff", color:readOnly?C.sub:C.text,
        boxSizing:"border-box" }} />
  );
}

function FSelect({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={onChange}
      style={{ width:"100%", padding:"10px 12px", border:`1px solid ${C.border}`,
        borderRadius:8, fontSize:13, fontFamily:"Lato,sans-serif", outline:"none",
        background:"#fff", color:value?C.text:C.sub }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}


// ServiceMultiSelect — module-level (focus-loss rule: never define inside another component)
// - Multi-select: selected services shown as removable tags
// - Exclusion: pass excludeNames[] to hide already-selected services from other fields
// - value: array of service name strings  onChange: (newArray) => void
function ServiceMultiSelect({ value = [], onChange, placeholder, centerCode, excludeNames = [] }) {
  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);

  const selected = Array.isArray(value) ? value : (value ? [value] : []);

  const getSvcName = (s) =>
    s.serviceName || s.servicename || s.SERVICENAME || s.serviceCode || String(s);
  const getSvcCode = (s) =>
    s.serviceCode || s.SERVICECODE || "";

  const handleInput = async (e) => {
    const q = e.target.value;
    setQuery(q);
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    const results = await searchServices(q, centerCode);
    // Filter out already selected AND excluded names
    const blocked = new Set([...selected, ...excludeNames].map(n => n.toLowerCase()));
    const filtered = results.filter(s => !blocked.has(getSvcName(s).toLowerCase()));
    setSuggestions(filtered.slice(0, 10));
    setOpen(filtered.length > 0);
    setLoading(false);
  };

  const handlePick = (svc) => {
    const name = getSvcName(svc);
    if (!selected.includes(name)) {
      onChange([...selected, name]);
    }
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  };

  const handleRemove = (name) => {
    onChange(selected.filter(s => s !== name));
  };

  return (
    <div>
      {/* Selected tags */}
      {selected.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
          {selected.map(name => (
            <span key={name} style={{ display:"inline-flex", alignItems:"center", gap:5,
              background:C.navyLt, color:C.navy, borderRadius:99,
              padding:"4px 10px", fontSize:12, fontWeight:700, border:`1px solid ${C.border}` }}>
              {name}
              <span onClick={()=>handleRemove(name)}
                style={{ cursor:"pointer", color:C.red, fontWeight:800,
                  fontSize:14, lineHeight:1, marginLeft:2 }}>×</span>
            </span>
          ))}
        </div>
      )}
      {/* Search input */}
      <div style={{ position:"relative" }}>
        <input value={query} onChange={handleInput}
          onBlur={() => setTimeout(()=>setOpen(false), 180)}
          placeholder={selected.length ? "Add more…" : (placeholder||"Type service name…")}
          style={{ width:"100%", padding:"10px 36px 10px 12px", border:`1px solid ${C.border}`,
            borderRadius:8, fontSize:13, fontFamily:"Lato,sans-serif", outline:"none",
            boxSizing:"border-box" }} />
        {loading && (
          <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
            fontSize:11, color:C.sub }}>⟳</div>
        )}
        {/* Dropdown */}
        {open && suggestions.length > 0 && (
          <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:200,
            background:"#fff", border:`1px solid ${C.border}`, borderRadius:8,
            boxShadow:"0 4px 14px rgba(0,0,0,.1)", maxHeight:220, overflowY:"auto", marginTop:2 }}>
            {suggestions.map((s, i) => {
              const name = getSvcName(s);
              const code = getSvcCode(s);
              return (
                <div key={i} onMouseDown={()=>handlePick(s)}
                  style={{ padding:"9px 14px", cursor:"pointer", fontSize:13,
                    borderBottom:`1px solid ${C.border}`, background:"#fff" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.navyLt}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                  <span style={{ fontWeight:600, color:C.text }}>{name}</span>
                  {code && <span style={{ fontSize:11, color:C.sub, marginLeft:8 }}>({code})</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
      padding:"24px", marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
      {title && <div style={{ fontWeight:800, fontSize:14, color:C.navyDk, marginBottom:18,
        paddingBottom:12, borderBottom:`1px solid ${C.border}` }}>{title}</div>}
      {children}
    </div>
  );
}

function InfoRow({ label, value, badge }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
      <span style={{ fontSize:13, color:C.sub, fontWeight:600 }}>{label}</span>
      {badge ? (
        <span style={{ background:badge.bg, color:badge.color, borderRadius:99,
          padding:"3px 12px", fontSize:12, fontWeight:700 }}>{value}</span>
      ) : (
        <span style={{ fontSize:13, color:C.text, fontWeight:700 }}>{value||"—"}</span>
      )}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999,
      background:toast.type==="success"?C.green:C.red, color:"#fff",
      padding:"12px 20px", borderRadius:8, boxShadow:"0 4px 14px rgba(0,0,0,.2)",
      fontSize:13, fontWeight:600 }}>
      {toast.type==="success"?"✓ ":"⚠ "}{toast.message}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
export default function CreateCampaign() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(1);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  // Lookup data
  const [centres,         setCentres]         = useState([]);
  const [externalSources, setExternalSources] = useState([]);
  const [oppCodePreview,  setOppCodePreview]  = useState("");

  // Step 1 — General Info
  const userCenterCode = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      return u.centerCode || u.centreCode || u.CenterCode || "";
    } catch { return ""; }
  })();

  const [general, setGeneral] = useState({
    oppName:    "",
    ruleCode:   "",
    centerCode: userCenterCode,   // pre-selected from JWT
    fromDate:   "",
    toDate:     "",       // blank = Dynamic
    ruleType:   "",       // "1"=Static, "2"=Dynamic — derived from toDate logic
  });
  const [generalErrors, setGeneralErrors] = useState({});

  // Step 2 — Rule config
  const [rule, setRule] = useState({
    ruleDays:          "",   // "1","7","30","90","0"(custom)
    customDays:        "",
    xvalue:            [],   // array for multi-select service fields
    yvalue:            [],   // array — excludes xvalue items
    zvalue:            "",   // numeric string for R2 Z days
    pvalue:            [],   // array for R2 P category — excludes xvalue
    externalSource:    "",
    externalSubSource: "",
    subSources:        [],
    yFromDate:         "",
    yToDate:           "",
    zFromDate:         "",
    zToDate:           "",
  });
  const [ruleErrors, setRuleErrors] = useState({});

  const showToast = (message, type="success") => {
    setToast({message,type}); setTimeout(()=>setToast(null),4000);
  };

  /* Load centres and external sources on mount */
  useEffect(() => {
    authGet(`${API_BASE_URL}/api/Opportunity/Centres`)
      .then(d => setCentres(Array.isArray(d)?d:[]));
    authGet(`${API_BASE_URL}/api/Opportunity/ExternalSources`)
      .then(d => setExternalSources(Array.isArray(d)?d:[]));
  }, []);

  /* Preview OppCode when centre changes */
  useEffect(() => {
    if (!general.centerCode) { setOppCodePreview(""); return; }
    authGet(`${API_BASE_URL}/api/Opportunity/PreviewOppCode?centerCode=${encodeURIComponent(general.centerCode)}`)
      .then(d => setOppCodePreview(d?.oppCode || ""));
  }, [general.centerCode]);

  /* Derive ruleType when toDate changes:
     - toDate filled → Static (type=1)
     - toDate blank  → Dynamic (type=2, ToDate = today at runtime)  */
  useEffect(() => {
    setGeneral(p => ({
      ...p,
      ruleType: p.toDate ? "1" : "2",
    }));
  }, [general.toDate]);

  const selectedRule = RULES.find(r => r.code === general.ruleCode);

  /* ── Step 1 Validation ────────────────────────────────────────────────────── */
  const validateStep1 = () => {
    const e = {};
    if (!general.oppName.trim())    e.oppName    = "Campaign Name is required.";
    if (!general.ruleCode)          e.ruleCode   = "Rule Type is required.";
    if (!general.centerCode)        e.centerCode = "Centre is required.";
    if (!general.fromDate)          e.fromDate   = "From Date is required.";
    if (general.ruleType === "1" && !general.toDate)
      e.toDate = "To Date is required for Static campaigns.";
    if (general.ruleType === "1" && general.toDate && general.fromDate
        && new Date(general.toDate) <= new Date(general.fromDate))
      e.toDate = "To Date must be after From Date.";
    setGeneralErrors(e);
    return !Object.keys(e).length;
  };

  /* ── Step 2 Validation ────────────────────────────────────────────────────── */
  const validateStep2 = () => {
    const e = {};
    if (selectedRule?.hasDays && general.ruleType === "2") {
      if (!rule.ruleDays) e.ruleDays = "Please select Rule Days.";
      if (rule.ruleDays === "0" && !rule.customDays)
        e.customDays = "Enter custom days (minimum 1).";
    }
    if (general.ruleCode === "R7" && !rule.externalSource)
      e.externalSource = "External Source is required.";
    setRuleErrors(e);
    return !Object.keys(e).length;
  };

  /* ── Build submission payload ─────────────────────────────────────────────── */
  const buildPayload = () => {
    const effectiveDays = rule.ruleDays === "0" ? rule.customDays : rule.ruleDays;
    const ruleDetails = buildRuleDetails(effectiveDays);

    return {
      oppName:           general.oppName.trim(),
      ruleCode:          general.ruleCode,
      centerCode:        general.centerCode,
      fromDate:          general.fromDate,
      toDate:            general.ruleType === "1" ? general.toDate : null,
      ruleType:          general.ruleType,          // "1"=Static, "2"=Dynamic
      ruleDays:          general.ruleType === "2" ? (effectiveDays || "") : "",
      ruleDetails,
      xvalue:            Array.isArray(rule.xvalue) ? rule.xvalue.join(",") : rule.xvalue,
      yvalue:            Array.isArray(rule.yvalue) ? rule.yvalue.join(",") : rule.yvalue,
      zvalue:            rule.zvalue,
      pvalue:            Array.isArray(rule.pvalue) ? rule.pvalue.join(",") : rule.pvalue,
      externalSource:    rule.externalSource,
      externalSubSource: rule.externalSubSource,
      yFromDate:         rule.yFromDate,
      yToDate:           rule.yToDate,
      zFromDate:         rule.zFromDate,
      zToDate:           rule.zToDate,
    };
  };

  const buildRuleDetails = (days) => {
    const parts = [];
    const xStr = Array.isArray(rule.xvalue) ? rule.xvalue.join(", ") : rule.xvalue;
    const yStr = Array.isArray(rule.yvalue) ? rule.yvalue.join(", ") : rule.yvalue;
    const pStr = Array.isArray(rule.pvalue) ? rule.pvalue.join(", ") : rule.pvalue;
    if (general.ruleCode === "R3") parts.push(`No show for ${days} days`);
    else if (general.ruleCode === "R4") parts.push(`Cancelled for ${days} days`);
    else if (general.ruleCode === "R1") {
      if (xStr) parts.push(`Paid for: ${xStr}`);
      if (yStr) parts.push(`Not for: ${yStr}`);
      if (days) parts.push(`${days} days`);
    } else if (general.ruleCode === "R2") {
      if (xStr)        parts.push(`Paid for: ${xStr}`);
      if (rule.yvalue) parts.push(`within ${rule.yvalue} days`);
      if (rule.zvalue) parts.push(`no future appt in ${rule.zvalue} days`);
      if (pStr)        parts.push(`for category: ${pStr}`);
    } else if (general.ruleCode === "R5") {
      if (rule.xvalue) parts.push(`Special Day: ${rule.xvalue}`);
    } else if (general.ruleCode === "R6") {
      if (rule.xvalue) parts.push(`Customer Type: ${rule.xvalue}`);
    } else if (general.ruleCode === "R7") {
      parts.push(`Source: ${rule.externalSource}`);
      if (rule.externalSubSource) parts.push(`Sub: ${rule.externalSubSource}`);
    } else if (general.ruleCode === "Manual Lead") {
      parts.push("Manual Lead Campaign");
    }
    return parts.join(" | ");
  };

  /* ── Navigate steps ───────────────────────────────────────────────────────── */
  const handleNext = () => {
    // Manual Lead has no rule config — skip to step 3
    if (step === 1) {
      if (!validateStep1()) return;
      if (general.ruleCode === "Manual Lead") { setStep(3); return; }
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3 && general.ruleCode === "Manual Lead") { setStep(1); return; }
    setStep(s => s - 1);
  };

  /* ── Submit ───────────────────────────────────────────────────────────────── */
  const handleActivate = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await authPost(`${API_BASE_URL}/api/Opportunity/CreateCampaign`, payload);
      if (res?.success === false) throw new Error(res.message);
      showToast(`Campaign ${res?.data?.oppCode || ""} created successfully!`);
      setTimeout(() => navigate("/opportunity"), 1500);
    } catch(e) {
      showToast(e.message || "Failed to create campaign.", "error");
    } finally { setSaving(false); }
  };

  /* ── Render helpers ───────────────────────────────────────────────────────── */
  const today = new Date().toISOString().split("T")[0];
  const subSourceOptions = externalSources
    .find(s => s.source === rule.externalSource)?.subSources || [];

  return (
    <div style={{ fontFamily:"Lato,sans-serif", padding:"24px 28px", color:C.text, maxWidth:760, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontWeight:800, fontSize:22, color:C.navyDk }}>📣 Create Campaign</div>
        <div style={{ fontSize:13, color:C.sub, marginTop:3 }}>
          <span style={{ color:C.navy, cursor:"pointer" }}
            onClick={()=>navigate("/opportunity")}>Opportunity</span>
          {" › "} Create Campaign
        </div>
      </div>

      <StepBar step={step} />

      {/* ── STEP 1: General Info ──────────────────────────────────────────── */}
      {step === 1 && (
        <SectionCard title="General Information">
          <FieldRow label="Campaign Name" required error={generalErrors.oppName}>
            <FInput value={general.oppName} placeholder="e.g. No Show - May 2026"
              onChange={e=>setGeneral(p=>({...p,oppName:e.target.value}))} />
          </FieldRow>

          <FieldRow label="Rule Type" required error={generalErrors.ruleCode}>
            <FSelect value={general.ruleCode}
              onChange={e=>setGeneral(p=>({...p,ruleCode:e.target.value}))}
              placeholder="Select Rule Type…"
              options={RULES.map(r=>({value:r.code,label:r.label}))} />
          </FieldRow>

          <FieldRow label="Centre" required error={generalErrors.centerCode}>
            <FSelect value={general.centerCode}
              onChange={e=>setGeneral(p=>({...p,centerCode:e.target.value}))}
              placeholder="Select Centre…"
              options={centres.map(c=>({value:c.centerCode,label:`${c.centreName} (${c.centerCode})`}))} />
          </FieldRow>

          {general.centerCode && oppCodePreview && (
            <FieldRow label="Campaign Code (auto-generated)">
              <FInput value={oppCodePreview} readOnly />
            </FieldRow>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <FieldRow label="From Date" required error={generalErrors.fromDate}>
              <FInput type="date" value={general.fromDate}
                onChange={e=>setGeneral(p=>({...p,fromDate:e.target.value}))} />
            </FieldRow>
            <FieldRow label="To Date"
              hint="Leave blank for Dynamic (today's date, rolling). Fill in for Static (fixed end date)."
              error={generalErrors.toDate}>
              <FInput type="date" value={general.toDate} min={general.fromDate||today}
                onChange={e=>setGeneral(p=>({...p,toDate:e.target.value}))} />
            </FieldRow>
          </div>

          {/* Static/Dynamic indicator */}
          {general.fromDate && (
            <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:8,
              background: general.ruleType==="1" ? C.yellowBg : C.greenBg,
              border:`1px solid ${general.ruleType==="1"?"#fcd34d":"#86efac"}`,
              fontSize:13, fontWeight:600,
              color: general.ruleType==="1" ? C.yellow : C.green }}>
              {general.ruleType === "1"
                ? "📌 Static Campaign — fixed end date, runs until To Date."
                : "🔄 Dynamic Campaign — To Date = today's date, updates daily."}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── STEP 2: Rule Config ───────────────────────────────────────────── */}
      {step === 2 && selectedRule && (
        <SectionCard title={`Rule Configuration — ${selectedRule.label}`}>

          {/* Segment (R1-R6 only) */}
          {selectedRule.hasSegment && (
            <FieldRow label="Segment Type"
              hint="Static = fixed date range. Dynamic = relative to today.">
              <div style={{ padding:"10px 14px", borderRadius:8,
                background:general.ruleType==="1"?C.yellowBg:C.greenBg,
                border:`1px solid ${general.ruleType==="1"?"#fcd34d":"#86efac"}`,
                fontSize:13, fontWeight:700,
                color:general.ruleType==="1"?C.yellow:C.green }}>
                {general.ruleType === "1" ? "📌 Static" : "🔄 Dynamic"} — set on previous screen via To Date
              </div>
            </FieldRow>
          )}

          {/* R1 — Paid X Not Y */}
          {general.ruleCode === "R1" && (<>
            <FieldRow label="Paid for (X) — Services" hint="Services the customer paid for (multi-select)" required>
              <ServiceMultiSelect value={rule.xvalue} centerCode={general.centerCode}
                placeholder="Search and add services…"
                excludeNames={rule.yvalue}
                onChange={v=>setRule(p=>({...p,xvalue:v}))} />
            </FieldRow>
            <FieldRow label="But Not for (Y) — Services"
              hint="Services they haven't purchased — cannot overlap with X" required>
              <ServiceMultiSelect value={rule.yvalue} centerCode={general.centerCode}
                placeholder="Search and add services…"
                excludeNames={rule.xvalue}
                onChange={v=>setRule(p=>({...p,yvalue:v}))} />
            </FieldRow>
          </>)}

          {/* R2 — Paid X Category in Y days, No future appt in Z days for Category P */}
          {general.ruleCode === "R2" && (<>
            <div style={{ padding:"10px 14px", borderRadius:8, background:"#f0f4fa",
              border:`1px solid ${C.border}`, fontSize:12, color:C.sub,
              marginBottom:16, fontWeight:600 }}>
              Rule: Customer paid for Category X in the past Y days and has no future appointment in Z days for Category P
            </div>
            <FieldRow label="X — Services (paid for)" required
              hint="Services the customer already paid for (multi-select)">
              <ServiceMultiSelect value={rule.xvalue} centerCode={general.centerCode}
                placeholder="Search and add services…"
                excludeNames={rule.pvalue}
                onChange={v=>setRule(p=>({...p,xvalue:v}))} />
            </FieldRow>
            <FieldRow label="Y — Lookback Days (purchased within)" required
              hint="How many past days to check for the X purchase">
              <FInput type="number" value={rule.yvalue} min="1"
                placeholder="e.g. 30"
                onChange={e=>setRule(p=>({...p,yvalue:e.target.value.replace(/\D/g,"")}))} />
            </FieldRow>
            <FieldRow label="Z — Forward Days (no future appointment within)" required
              hint="How many future days to check for absence of appointment">
              <FInput type="number" value={rule.zvalue} min="1"
                placeholder="e.g. 7"
                onChange={e=>setRule(p=>({...p,zvalue:e.target.value.replace(/\D/g,"")}))} />
            </FieldRow>
            <FieldRow label="P — Services to check for future appointment"
              hint="Services to verify have no upcoming booking (cannot overlap with X)">
              <ServiceMultiSelect value={rule.pvalue} centerCode={general.centerCode}
                placeholder="Search and add services…"
                excludeNames={rule.xvalue}
                onChange={v=>setRule(p=>({...p,pvalue:v}))} />
            </FieldRow>
          </>)}

          {/* R5 — Customer Special Day */}
          {general.ruleCode === "R5" && (
            <FieldRow label="Services to promote (X value)" hint="Services to offer on the special day (multi-select)">
              <ServiceMultiSelect value={rule.xvalue} centerCode={general.centerCode}
                placeholder="Search and add services…"
                onChange={v=>setRule(p=>({...p,xvalue:v}))} />
            </FieldRow>
          )}

          {/* R6 — Customer Type */}
          {general.ruleCode === "R6" && (
            <FieldRow label="Customer Type (X value)">
              <FInput value={rule.xvalue} placeholder="e.g. VIP"
                onChange={e=>setRule(p=>({...p,xvalue:e.target.value}))} />
            </FieldRow>
          )}

          {/* R7 — External Source */}
          {general.ruleCode === "R7" && (<>
            <FieldRow label="External Source" required error={ruleErrors.externalSource}>
              <FSelect value={rule.externalSource}
                onChange={e=>{
                  setRule(p=>({...p,externalSource:e.target.value,externalSubSource:""}));
                }}
                placeholder="Select source…"
                options={externalSources.map(s=>({value:s.source,label:s.source}))} />
            </FieldRow>
            {subSourceOptions.length > 0 && (
              <FieldRow label="External Sub-Source">
                <FSelect value={rule.externalSubSource}
                  onChange={e=>setRule(p=>({...p,externalSubSource:e.target.value}))}
                  placeholder="Select sub-source…"
                  options={subSourceOptions.map(s=>({value:s,label:s}))} />
              </FieldRow>
            )}
          </>)}

          {/* Rule Days — only for Dynamic campaigns (Static uses fixed date range instead) */}
          {selectedRule.hasDays && general.ruleType === "2" && (
            <FieldRow label="Rule Days" required error={ruleErrors.ruleDays}
              hint="How many past days to look back for this rule.">
              <FSelect value={rule.ruleDays}
                onChange={e=>{
                  const v = e.target.value;
                  if (v === "9999") {
                    // Date Range selected in Dynamic — guide user to Static
                    showToast("For a Date Range campaign, please set a To Date on the previous screen. That makes it a Static campaign.", "error");
                    return; // don't apply the value
                  }
                  setRule(p=>({...p,ruleDays:v,customDays:""}));
                }}
                placeholder="Select days…"
                options={[
                  {value:"1",    label:"Past 1 Day"},
                  {value:"7",    label:"Past 1 Week"},
                  {value:"30",   label:"Past 1 Month"},
                  {value:"90",   label:"Past 3 Months"},
                  {value:"0",    label:"Custom"},
                  {value:"9999", label:"Date Range"},
                ]} />
              {rule.ruleDays === "0" && (
                <div style={{ marginTop:10 }}>
                  <FInput type="number" value={rule.customDays} min="1"
                    placeholder="Enter number of days e.g. 45"
                    onChange={e=>setRule(p=>({...p,customDays:e.target.value.replace(/\D/g,"")}))} />
                  {ruleErrors.customDays && (
                    <div style={{ fontSize:11, color:C.red, marginTop:4 }}>⚠ {ruleErrors.customDays}</div>
                  )}
                </div>
              )}
            </FieldRow>
          )}
        </SectionCard>
      )}

      {/* ── STEP 3: Review & Activate ─────────────────────────────────────── */}
      {step === 3 && (
        <SectionCard title="Review & Activate">
          <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:8,
            background:"#eff6ff", border:"1px solid #bfdbfe", fontSize:13,
            fontWeight:600, color:"#1d4ed8" }}>
            ℹ Campaign will be activated immediately. There is no draft option.
          </div>

          <InfoRow label="Campaign Name"  value={general.oppName} />
          <InfoRow label="Campaign Code"  value={oppCodePreview} />
          <InfoRow label="Rule Type"      value={RULES.find(r=>r.code===general.ruleCode)?.label} />
          <InfoRow label="Centre"         value={centres.find(c=>c.centerCode===general.centerCode)?.centreName || general.centerCode} />
          <InfoRow label="From Date"      value={general.fromDate} />
          <InfoRow label="To Date"
            value={general.ruleType==="1" ? general.toDate : "Dynamic (today's date)"}
            badge={general.ruleType==="1"
              ? {bg:C.yellowBg,color:C.yellow}
              : {bg:C.greenBg,color:C.green}} />
          <InfoRow label="Segment"
            value={general.ruleType==="1" ? "Static" : "Dynamic"}
            badge={general.ruleType==="1"
              ? {bg:C.yellowBg,color:C.yellow}
              : {bg:C.greenBg,color:C.green}} />

          {/* Rule-specific summary */}
          {general.ruleCode !== "Manual Lead" && general.ruleCode !== "R7" && rule.ruleDays && (
            <InfoRow label="Rule Days"
              value={rule.ruleDays==="0" ? `Custom (${rule.customDays} days)` : rule.ruleDays+" days"} />
          )}
          {general.ruleCode === "R1" && (<>
            {rule.xvalue?.length > 0 && <InfoRow label="Paid for (X)" value={rule.xvalue.join(", ")} />}
            {rule.yvalue?.length > 0 && <InfoRow label="Not for (Y)"  value={rule.yvalue.join(", ")} />}
          </>)}
          {general.ruleCode === "R7" && (<>
            <InfoRow label="External Source"     value={rule.externalSource} />
            {rule.externalSubSource && <InfoRow label="Sub-Source" value={rule.externalSubSource} />}
          </>)}

          <div style={{ marginTop:20, padding:"12px 14px", borderRadius:8,
            background:"#f8fafc", border:`1px solid ${C.border}`,
            fontSize:12, color:C.sub, fontWeight:600 }}>
            Rule Details: {buildRuleDetails(rule.ruleDays==="0"?rule.customDays:rule.ruleDays)}
          </div>
        </SectionCard>
      )}

      {/* ── Navigation buttons ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
        <button onClick={step===1 ? ()=>navigate("/opportunity") : handleBack}
          style={{ padding:"10px 20px", background:"#f4f6fa", color:C.navy,
            border:`1px solid ${C.border}`, borderRadius:8, fontWeight:700,
            fontSize:13, cursor:"pointer" }}>
          {step === 1 ? "← Cancel" : "← Back"}
        </button>

        <div style={{ display:"flex", gap:10 }}>
          {step < 3 && (
            <button onClick={handleNext}
              style={{ padding:"10px 24px", background:C.navy, color:"#fff",
                border:"none", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              Next →
            </button>
          )}
          {step === 3 && (
            <button onClick={handleActivate} disabled={saving}
              style={{ padding:"10px 28px", background:saving?"#94a3b8":C.green,
                color:"#fff", border:"none", borderRadius:8, fontWeight:700,
                fontSize:13, cursor:saving?"not-allowed":"pointer" }}>
              {saving ? "Creating…" : "✓ Activate Campaign"}
            </button>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}