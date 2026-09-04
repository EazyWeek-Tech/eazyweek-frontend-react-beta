// src/pages/Opportunity/CreateCampaign.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";

// ── R7 bulk-upload: Excel header → payload key ──
const UPLOAD_HEADER_MAP = {
  custmobileno:      "custMobileNo",
  firstname:         "firstName",
  lastname:          "lastName",
  salesowner:        "salesOwner",
  doctor:            "doctor",
  createddate:       "createdDate",
  oppcode:           "oppCode",
  oppname:           "oppName",
  externalsource:    "externalSource",
  externalsubsource: "externalSubSource",
  cliniclocation:    "clinicLocation",
  orulecode:         "oRuleCode",
};
const UPLOAD_REQUIRED = [
  "custMobileNo", "firstName", "lastName", "salesOwner", "doctor", "createdDate",
  "externalSource", "externalSubSource", "clinicLocation", "oRuleCode",
];
const normHeaderKey = (h) => String(h || "").trim().toLowerCase().replace(/[\s_]+/g, "");
const normalizeUploadRow = (raw) => {
  const out = {};
  Object.keys(raw || {}).forEach((k) => {
    const mapped = UPLOAD_HEADER_MAP[normHeaderKey(k)];
    if (!mapped) return;
    let v = raw[k];
    if (v instanceof Date) v = v.toISOString();
    out[mapped] = (v == null ? "" : String(v)).trim();
  });
  out.oRuleCode = "R7"; // forced regardless of file
  return out;
};
const validateUploadRows = (rows, centerCode) => {
  const errs = [];
  rows.forEach((r, i) => {
    const n = i + 1;
    const missing = UPLOAD_REQUIRED.filter((k) => !String(r[k] || "").trim());
    if (missing.length) errs.push(`Row ${n}: missing ${missing.join(", ")}`);
    if (
      String(r.clinicLocation || "").trim() &&
      String(r.clinicLocation).trim().toUpperCase() !== String(centerCode || "").trim().toUpperCase()
    ) {
      errs.push(`Row ${n}: ClinicLocation "${r.clinicLocation}" must match your centre "${centerCode}"`);
    }
  });
  return errs;
};

/* ── Theme ──────────────────────────────────────────────────────────────────── */
const C = {
  navy:"#334b71", navyDk:"#2b3f73", navyLt:"#e9edf5",
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
  { code:"R8",          label:"R8 — Customer Behaviour",                         hasSegment:false, hasDays:false, hasDateRange:true  },
  { code:"Manual Lead", label:"Manual Lead — Manual campaign",                   hasSegment:false, hasDays:false, hasDateRange:false },
];

/* ==== Rule type cards (Step 1) ==== */
const RuleIcon = ({ code, active }) => {
  const s = { width:16, height:16, stroke:"#fff", strokeWidth:2, fill:"none",
    strokeLinecap:"round", strokeLinejoin:"round" };
  const paths = {
    "R3": <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4"/></>,
    "R4": <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16h6"/></>,
    "R5": <><rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M5 12v9h14v-9M12 8c-1.5-3-5-3.5-5-1s3.5 1 5 1c1.5 0 5 1.5 5-1s-3.5-2-5 1z"/></>,
    "R6": <><path d="M3 18h18M4 18l-1-9 5 3 4-6 4 6 5-3-1 9z"/></>,
    "R8": <><path d="M2 12h4l3-7 4 14 3-7h6"/></>,
    "R1": <><path d="M17 2l4 4-4 4M3 6h18M7 22l-4-4 4-4M21 18H3"/></>,
    "R2": <><path d="M12 2L2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5"/></>,
    "R7": <><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/></>,
    "Manual Lead": <><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0114 0v2M19 8v6M16 11h6"/></>,
  };
  return (
    <span style={{ width:30, height:30, borderRadius:"50%", flex:"none",
      background: active ? "#DD7766" : C.navyDk, display:"flex",
      alignItems:"center", justifyContent:"center" }}>
      <svg viewBox="0 0 24 24" style={s}>{paths[code] || paths["R8"]}</svg>
    </span>
  );
};

const RULE_GROUPS_LEFT = [
  { heading:"Missed & Cancelled Appointments", items:[
    { code:"R3", title:"No-show appointment",   desc:"Customer booked but did not attend." },
    { code:"R4", title:"Cancelled appointment", desc:"Customer cancelled a booked visit." },
  ]},
  { heading:"Customer Milestone, Type & Behaviour", items:[
    { code:"R5", title:"Special day",        desc:"Birthday or anniversary is approaching." },
    { code:"R6", title:"Customer type",      desc:"Target by tier, e.g. HNI or Royal." },
    { code:"R8", title:"Customer behaviour", desc:"Visit, spend, experience, loyalty and more." },
  ]},
];
const RULE_GROUPS_RIGHT = [
  { heading:"Payment Patterns", items:[
    { code:"R1", title:"Paid for X Category but not Y Category",
      desc:"Used for cross-sell — customers focused on only one category of services can be guided toward an additional category." },
    { code:"R2", title:"Paid for X Category in Y days, but no future appointment in Z days for P Category",
      desc:"Spent in a category with nothing upcoming." },
  ]},
  { heading:"Sources", items:[
    { code:"R7",          title:"External source", desc:"Leads from website, WhatsApp or social." },
    { code:"Manual Lead", title:"Manual lead",     desc:"Added by hand as a manual campaign." },
  ]},
];

function RuleCard({ item, selected, onSelect }) {
  return (
    <div onClick={()=>onSelect(item.code)}
      style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px",
        borderRadius:12, cursor:"pointer", position:"relative", marginBottom:12,
        border:`1.5px solid ${selected ? "#DD7766" : C.border}`,
        background: selected ? "#fdf2ec" : "#fff",
        boxShadow: selected ? "0 0 0 1px #DD776622" : "none",
        transition:"border-color .15s, background .15s" }}>
      <RuleIcon code={item.code} active={selected} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"Lato,sans-serif", fontWeight:700,
          fontSize:15, color:C.navyDk, lineHeight:1.3 }}>{item.title}</div>
        <div style={{ fontSize:12.5, color:C.sub, marginTop:3, lineHeight:1.45 }}>{item.desc}</div>
      </div>
      {selected && (
        <span style={{ position:"absolute", top:12, right:12, width:20, height:20,
          borderRadius:"50%", background:C.navyDk, color:"#fff", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>✓</span>
      )}
    </div>
  );
}

function RuleTypeCards({ value, onSelect, error }) {
  const col = (groups) => (
    <div>
      {groups.map(g => (
        <div key={g.heading} style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.sub, textTransform:"uppercase",
            letterSpacing:".05em", margin:"6px 0 10px" }}>{g.heading}</div>
          {g.items.map(it => (
            <RuleCard key={it.code} item={it} selected={value===it.code} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontFamily:"Lato,sans-serif", fontWeight:700,
        fontSize:19, color:C.navyDk, marginBottom:2 }}>Rule type</div>
      <div style={{ fontSize:13, color:C.sub, marginBottom:14 }}>
        Choose how this campaign should find customers.
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1px 1fr", gap:"0 22px" }}>
        {col(RULE_GROUPS_LEFT)}
        <div style={{ background:C.border }} />
        {col(RULE_GROUPS_RIGHT)}
      </div>
      {error && <div style={{ fontSize:11, color:C.red, marginTop:4 }}> {error}</div>}
    </div>
  );
}

/* ==== Customer Behaviour (R8) config ==== */
const CB_AREAS = [
  { key:"VISIT_DATE", label:"Visit Date" },
  { key:"SPEND",      label:"Spend" },
  { key:"EXPERIENCE", label:"Experience" },
  { key:"MEMBERSHIP", label:"Membership" },
  { key:"LOYALTY",    label:"Loyalty" },
  { key:"VISIT_FREQ", label:"Visit Frequency" },
  { key:"SPEND_VISIT",label:"Spend + Visit" },
];
const CB_AREA_LABEL = (k) => CB_AREAS.find(a=>a.key===k)?.label || k;

const CB_WINDOW_OPTS = [
  { value:"7",      label:"Past 1 Week" },
  { value:"30",     label:"Past 1 Month" },
  { value:"90",     label:"Past 3 Months" },
  { value:"180",    label:"Past 6 Months" },
  { value:"365",    label:"Past 1 Year" },
  { value:"CUSTOM", label:"Custom" },
];
const CB_ACTIVE_OPTS = [
  { value:"DAY1",   label:"Day 1" },
  { value:"30",     label:"Past 1 Month" },
  { value:"90",     label:"Past 3 Months" },
  { value:"180",    label:"Past 6 Months" },
  { value:"365",    label:"Past 1 Year" },
  { value:"CUSTOM", label:"Custom Date Range" },
];
const CB_VISIT_COUNT_OPTS = [
  { value:"2",  label:"2 or more" },
  { value:"3",  label:"3 or more" },
  { value:"5",  label:"5 or more" },
  { value:"7",  label:"7 or more" },
  { value:"10", label:"10 or more" },
];

function CbAreaTabs({ value, onSelect }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:".04em", marginBottom:10 }}>
        <span style={{ color:C.sub, textTransform:"uppercase" }}>Target Area</span>
        <span style={{ color:"#DD7766" }}> — SELECT ONE</span>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {CB_AREAS.map(a => {
          const active = value === a.key;
          return (
            <button key={a.key} type="button" onClick={()=>onSelect(a.key)}
              style={{ padding:"8px 16px", borderRadius:99, cursor:"pointer",
                fontSize:13, fontWeight:700, fontFamily:"Lato,sans-serif",
                border:`1px solid ${active ? C.navyDk : C.border}`,
                background: active ? C.navyDk : "#fff",
                color: active ? "#fff" : C.text }}>
              {active ? "✓ " : ""}{a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CbChips({ options, value = [], onToggle }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8, padding:"10px 12px",
      border:`1px solid ${C.border}`, borderRadius:8, background:"#fff" }}>
      {options.map(o => {
        const active = value.includes(o.value);
        return (
          <span key={o.value} onClick={()=>onToggle(o.value)}
            style={{ padding:"4px 12px", borderRadius:99, cursor:"pointer",
              fontSize:12, fontWeight:700,
              border:`1px solid ${active ? "#DD7766" : C.border}`,
              background: active ? "#fdf2ec" : "#f8fafc",
              color: active ? "#b4523f" : C.sub }}>
            {o.label}
          </span>
        );
      })}
    </div>
  );
}

function CbAmountInput({ value, onChange, placeholder, prefix }) {
  return (
    <div style={{ position:"relative" }}>
      {prefix && (
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
          fontSize:13, fontWeight:700, color:C.sub, pointerEvents:"none" }}>{prefix}</span>
      )}
      <input type="text" inputMode="decimal" value={value} placeholder={placeholder}
        onChange={e=>onChange(e.target.value.replace(/[^\d.]/g,""))}
        style={{ width:"100%", padding:prefix?"10px 12px 10px 46px":"10px 12px",
          border:`1px solid ${C.border}`, borderRadius:8, fontSize:13,
          fontFamily:"Lato,sans-serif", outline:"none", background:"#fff",
          color:C.text, boxSizing:"border-box" }} />
    </div>
  );
}

function CbSubTitle({ children }) {
  return (
    <div style={{ fontFamily:"Lato,sans-serif", fontWeight:700,
      fontSize:16, color:C.navyDk, margin:"4px 0 14px" }}>{children}</div>
  );
}

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

// Service categories — full list (endpoint takes no query/centre params).
const loadServiceCategories = async () => {
  try {
    const d = await authGet(`${API_BASE_URL}/api/Master/ServiceCategory`);
    return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
  } catch { return []; }
};

// Whole-day span between two YYYY-MM-DD strings (To − From). null if either missing/invalid.
const daysBetween = (from, to) => {
  if (!from || !to) return null;
  const a = new Date(from), b = new Date(to);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
};

/* ════════════════════════════════════════════════════════════════════════════
   MODULE-LEVEL COMPONENTS
   ════════════════════════════════════════════════════════════════════════════ */

function StepBar({ step }) {
  const steps = ["General Info", "Rule Config", "Activate"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:28, gap:0, marginLeft:0 }}>
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
      {error && <div style={{ fontSize:11, color:C.red,  marginTop:4 }}> {error}</div>}
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

// CategoryMultiSelect — like ServiceMultiSelect but for Service Categories.
// The /api/Master/ServiceCategory endpoint returns the FULL list (no query/centre
// param), so we fetch once and filter client-side. value: array of category names.
function CategoryMultiSelect({ value = [], onChange, placeholder, excludeNames = [] }) {
  const [all,     setAll]     = useState([]);
  const [query,   setQuery]   = useState("");
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  const selected = Array.isArray(value) ? value : (value ? [value] : []);

  const getCatName = (s) =>
    s.categoryName || s.CategoryName || s.CATEGORYNAME ||
    s.serviceCategory || s.SERVICECATEGORY ||
    s.name || s.NAME || s.value || String(s);
  const getCatCode = (s) =>
    s.categoryCode || s.CATEGORYCODE || s.code || s.CODE || "";

  // Load the full category list once on mount.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadServiceCategories().then(list => {
      if (!alive) return;
      setAll(Array.isArray(list) ? list : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const blocked = new Set([...selected, ...excludeNames].map(n => String(n).toLowerCase()));
  const q = query.trim().toLowerCase();
  const suggestions = all
    .filter(s => !blocked.has(getCatName(s).toLowerCase()))
    .filter(s => !q || getCatName(s).toLowerCase().includes(q))
    .slice(0, 50);

  const handlePick = (cat) => {
    const name = getCatName(cat);
    if (!selected.includes(name)) onChange([...selected, name]);
    setQuery(""); setOpen(false);
  };
  const handleRemove = (name) => onChange(selected.filter(s => s !== name));

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
        <input value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(()=>setOpen(false), 180)}
          placeholder={selected.length ? "Add more…" : (placeholder||"Select service category…")}
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
              const name = getCatName(s);
              const code = getCatCode(s);
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

// Small inline readout that shows the computed day span for a date range.
function DaysReadout({ from, to }) {
  const d = daysBetween(from, to);
  let text = "= — days", color = C.sub;
  if (d !== null) {
    if (d > 0)       { text = `= ${d} day${d === 1 ? "" : "s"}`; color = C.navy; }
    else             { text = "check dates"; color = C.red; }
  }
  return (
    <span style={{ marginLeft:10, fontSize:12, fontWeight:700, color,
      whiteSpace:"nowrap", alignSelf:"center" }}>{text}</span>
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
      {toast.type==="success"?"✓ ":" "}{toast.message}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
export default function CreateCampaign() {
  // Entry is guarded at the dashboard; this also guards direct navigation.
  const { guard } = usePermissions();
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
    campaignSpend: "",    // FRD §4.1 — optional numeric (SAR)
    apptMandatory: "Yes", // FRD §4.1 — Yes/No, default Yes
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

  /* ---- Step 2 — R8 Customer Behaviour config ---- */
  const [cb, setCb] = useState({
    targetArea: "VISIT_DATE",
    vdPreset:"", vdFrom:"", vdTo:"", vdCategories:[],
    spFromAmt:"0", spToAmt:"", spCategories:[],
    exRatings:[], exDurPreset:"", exFrom:"", exTo:"", exStatuses:["Open","WIP","Closed"],
    mbPreset:"", mbFrom:"", mbTo:"", mbFromAmt:"", mbToAmt:"",
    loPreset:"DAY1", loFrom:"", loTo:"", loFromPts:"", loToPts:"",
    vfCount:"", vfCategory:"", vfSubCategory:"",
    svPreset:"", svFrom:"", svTo:"", svFromAmt:"0", svToAmt:"",
  });
  const setCbField = (k, v) => setCb(p => ({ ...p, [k]: v }));
  const toggleIn = (arr, v) => arr.includes(v) ? arr.filter(x=>x!==v) : [...arr, v];

  // Step 2 — R7 Excel bulk upload
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadRows,     setUploadRows]     = useState([]);
  const [uploadErrors,   setUploadErrors]   = useState([]);
  const [parsing,        setParsing]        = useState(false);

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setUploadFileName(file.name);
    setUploadRows([]);
    setUploadErrors([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb  = XLSX.read(ev.target.result, { type: "array", cellDates: true });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const rows = raw
          .map(normalizeUploadRow)
          .filter((r) => Object.values(r).some((v) => String(v || "").trim()));
        const errs = validateUploadRows(rows, general.centerCode);
        setUploadRows(rows);
        setUploadErrors(errs);
        if (!rows.length)      showToast("No data rows found in the file.", "error");
        else if (errs.length)  showToast(`${errs.length} validation issue(s) found.`, "error");
        else                   showToast(`${rows.length} row(s) ready to upload.`);
      } catch (err) {
        setUploadRows([]);
        setUploadErrors([`Could not read file: ${err.message}`]);
        showToast("Could not read the Excel file.", "error");
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => { setParsing(false); showToast("File read error.", "error"); };
    reader.readAsArrayBuffer(file);
  };

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
    const nm = general.oppName.trim();
    if (!nm) {
      e.oppName = "Campaign Name is required.";
    } else if (nm.length < 2) {
      e.oppName = "Campaign Name must be at least 2 characters.";
    } else if (nm.length > 100) {
      e.oppName = "Campaign Name must be 100 characters or fewer.";
    } else if (!/[\p{L}\p{N}]/u.test(nm)) {
      e.oppName = "Campaign Name must include at least one letter or number.";
    } else if (!/^[\p{L}\p{M}\p{N} \-_()&,.'\/]+$/u.test(nm)) {
      e.oppName = "Only letters (any language), numbers, spaces and - _ ( ) & , . ' / are allowed.";
    }
    if (!general.ruleCode)          e.ruleCode   = "Rule Type is required.";
    if (!general.centerCode)        e.centerCode = "Centre is required.";
    if (!general.fromDate)          e.fromDate   = "From Date is required.";
    if (general.ruleType === "1" && !general.toDate)
      e.toDate = "To Date is required for Static campaigns.";
    // A single-day campaign is valid, so equal dates pass — only To before From fails.
    if (general.ruleType === "1" && general.toDate && general.fromDate
        && new Date(general.toDate) < new Date(general.fromDate))
      e.toDate = "To Date cannot be before From Date.";
    const spendRaw = String(general.campaignSpend ?? "").trim().replace(/,/g, "");
    if (spendRaw !== "") {
      const spendNum = Number(spendRaw);
      if (!Number.isFinite(spendNum) || spendNum < 0)
        e.campaignSpend = "Campaign Spend must be a valid non-negative number.";
    }
    setGeneralErrors(e);
    return !Object.keys(e).length;
  };

  /* ── Step 2 Validation ────────────────────────────────────────────────────── */
  const validateStep2 = () => {
    const e = {};
    if (selectedRule?.hasDays && general.ruleCode !== "R2" && general.ruleType === "2") {
      if (!rule.ruleDays) e.ruleDays = "Please select Rule Days.";
      if (rule.ruleDays === "0" && !rule.customDays)
        e.customDays = "Enter custom days (minimum 1).";
    }
    if (general.ruleCode === "R2") {
      if (!Array.isArray(rule.xvalue) || rule.xvalue.length === 0)
        e.xvalue = "Select at least one paid-for category.";
      const yd = daysBetween(rule.yFromDate, rule.yToDate);
      const zd = daysBetween(rule.zFromDate, rule.zToDate);
      if (!rule.yFromDate || !rule.yToDate) e.yRange = "Pick the purchase date range.";
      else if (yd === null || yd < 1)       e.yRange = "Purchase 'to' date must be after the 'from' date.";
      if (!rule.zFromDate || !rule.zToDate) e.zRange = "Pick the future check date range.";
      else if (zd === null || zd < 1)       e.zRange = "Future 'to' date must be after the 'from' date.";
    }
    if (general.ruleCode === "R7" && !rule.externalSource)
      e.externalSource = "External Source is required.";
    if (general.ruleCode === "R8") {
      const amtOk = (v) => { const n = Number(String(v||"").trim()); return Number.isFinite(n) && n >= 0; };
      const pairOk = (f, t) => {
        const from = Number(String(f||"0").trim() || 0), to = Number(String(t||"").trim());
        return Number.isFinite(to) && to > 0 && to >= from;
      };
      if (cb.targetArea === "VISIT_DATE") {
        if (!cb.vdPreset) e.cbVdPreset = "Select the last appointment period.";
        if (cb.vdPreset === "CUSTOM") {
          if (!cb.vdFrom || !cb.vdTo) e.cbVdRange = "Pick the From and To dates.";
          else if (new Date(cb.vdTo) < new Date(cb.vdFrom)) e.cbVdRange = "To Date cannot be before From Date.";
        }
      } else if (cb.targetArea === "SPEND") {
        if (!amtOk(cb.spFromAmt)) e.cbSpFrom = "0 or greater — negative values are not allowed.";
        if (!pairOk(cb.spFromAmt, cb.spToAmt)) e.cbSpTo = "Must be greater than 0 and not less than From Amt.";
      } else if (cb.targetArea === "EXPERIENCE") {
        const hasRating = cb.exRatings.length > 0;
        const hasComplaint = !!cb.exDurPreset;
        if (!hasRating && !hasComplaint)
          e.cbExAny = "Select at least one rating, or set a complaint duration — or both.";
        if (cb.exDurPreset === "CUSTOM") {
          if (!cb.exFrom || !cb.exTo) e.cbExRange = "Pick the complaint From and To dates.";
          else if (new Date(cb.exTo) < new Date(cb.exFrom)) e.cbExRange = "To Date cannot be before From Date.";
        }
        if (hasComplaint && cb.exStatuses.length === 0)
          e.cbExStatus = "Select at least one complaint status.";
      } else if (cb.targetArea === "MEMBERSHIP") {
        if (!cb.mbPreset) e.cbMbPreset = "Select the active-members period.";
        if (cb.mbPreset === "CUSTOM") {
          if (!cb.mbFrom || !cb.mbTo) e.cbMbRange = "Pick the From and To dates.";
          else if (new Date(cb.mbTo) < new Date(cb.mbFrom)) e.cbMbRange = "To Date cannot be before From Date.";
        }
        if (String(cb.mbToAmt).trim() !== "" && !pairOk(cb.mbFromAmt, cb.mbToAmt))
          e.cbMbAmt = "To Amt must be greater than 0 and not less than From Amt.";
      } else if (cb.targetArea === "LOYALTY") {
        if (!cb.loPreset) e.cbLoPreset = "Select the active loyalty member period.";
        if (cb.loPreset === "CUSTOM") {
          if (!cb.loFrom || !cb.loTo) e.cbLoRange = "Pick the From and To dates.";
          else if (new Date(cb.loTo) < new Date(cb.loFrom)) e.cbLoRange = "To Date cannot be before From Date.";
        }
        if (String(cb.loToPts).trim() !== "" && !pairOk(cb.loFromPts, cb.loToPts))
          e.cbLoPts = "To Pts must be greater than 0 and not less than From Pts.";
      } else if (cb.targetArea === "VISIT_FREQ") {
        if (!cb.vfCount) e.cbVfCount = "Select how many visits.";
      } else if (cb.targetArea === "SPEND_VISIT") {
        if (!cb.svPreset) e.cbSvPreset = "Select the visited period.";
        if (cb.svPreset === "CUSTOM") {
          if (!cb.svFrom || !cb.svTo) e.cbSvRange = "Pick the From and To dates.";
          else if (new Date(cb.svTo) < new Date(cb.svFrom)) e.cbSvRange = "To Date cannot be before From Date.";
        }
        if (!pairOk(cb.svFromAmt, cb.svToAmt)) e.cbSvAmt = "To Amt must be greater than 0 and not less than From Amt.";
      }
    }
    setRuleErrors(e);
    return !Object.keys(e).length;
  };

  /* ── Build submission payload ─────────────────────────────────────────────── */
  const buildPayload = () => {
    const effectiveDays = rule.ruleDays === "0" ? rule.customDays : rule.ruleDays;
    const ruleDetails = buildRuleDetails(effectiveDays);

    // R2: convert the two date ranges into day-spans for Y (lookback) and Z (forward).
    const isR2  = general.ruleCode === "R2";
    const r2Y   = isR2 ? daysBetween(rule.yFromDate, rule.yToDate) : null;
    const r2Z   = isR2 ? daysBetween(rule.zFromDate, rule.zToDate) : null;

    return {
      oppName:           general.oppName.trim(),
      ruleCode:          general.ruleCode,
      centerCode:        general.centerCode,
      fromDate:          general.fromDate,
      toDate:            general.ruleType === "1" ? general.toDate : null,
      ruleType:          general.ruleType,          // "1"=Static, "2"=Dynamic
      campaignSpend:     (() => { const s = String(general.campaignSpend ?? "").trim().replace(/,/g, ""); return s === "" ? null : Number(s); })(),
      apptMandatory:     general.apptMandatory !== "No",   // true = Yes (default)
      ruleDays:          general.ruleType === "2" ? (effectiveDays || "") : "",
      ruleDetails,
      xvalue:            Array.isArray(rule.xvalue) ? rule.xvalue.join(",") : rule.xvalue,
      yvalue:            isR2 ? String(r2Y ?? "") : (Array.isArray(rule.yvalue) ? rule.yvalue.join(",") : rule.yvalue),
      zvalue:            isR2 ? String(r2Z ?? "") : rule.zvalue,
      pvalue:            Array.isArray(rule.pvalue) ? rule.pvalue.join(",") : rule.pvalue,
      externalSource:    rule.externalSource,
      externalSubSource: rule.externalSubSource,
      yFromDate:         rule.yFromDate,
      yToDate:           rule.yToDate,
      zFromDate:         rule.zFromDate,
      zToDate:           rule.zToDate,
      ...(general.ruleCode === "R8" ? buildCbPayload() : {}),
    };
  };

  /* ---- R8 payload — structured cbConfig plus legacy-column packing ---- */
  const buildCbPayload = () => {
    const a = cb.targetArea;
    const num = (v) => { const s = String(v ?? "").trim(); return s === "" ? null : Number(s); };
    const cfg = { targetArea: a };
    let xvalue = a, yvalue = "", zvalue = "", pvalue = "", yFromDate = "", yToDate = "";
    if (a === "VISIT_DATE") {
      cfg.preset = cb.vdPreset; cfg.fromDate = cb.vdFrom; cfg.toDate = cb.vdTo;
      cfg.categories = cb.vdCategories;
      yvalue = cb.vdCategories.join(",");
      zvalue = cb.vdPreset === "CUSTOM" ? "" : cb.vdPreset;
      if (cb.vdPreset === "CUSTOM") { yFromDate = cb.vdFrom; yToDate = cb.vdTo; }
    } else if (a === "SPEND") {
      cfg.fromAmt = num(cb.spFromAmt) ?? 0; cfg.toAmt = num(cb.spToAmt);
      cfg.categories = cb.spCategories;
      yvalue = cb.spCategories.join(",");
      zvalue = `${cfg.fromAmt}-${cfg.toAmt ?? ""}`;
    } else if (a === "EXPERIENCE") {
      cfg.ratings = cb.exRatings; cfg.complaintPreset = cb.exDurPreset;
      cfg.complaintFrom = cb.exFrom; cfg.complaintTo = cb.exTo;
      cfg.complaintStatuses = cb.exDurPreset ? cb.exStatuses : [];
      yvalue = cb.exRatings.join(",");
      pvalue = cb.exDurPreset ? cb.exStatuses.join(",") : "";
      zvalue = cb.exDurPreset === "CUSTOM" ? "" : cb.exDurPreset;
      if (cb.exDurPreset === "CUSTOM") { yFromDate = cb.exFrom; yToDate = cb.exTo; }
    } else if (a === "MEMBERSHIP") {
      cfg.preset = cb.mbPreset; cfg.fromDate = cb.mbFrom; cfg.toDate = cb.mbTo;
      cfg.fromAmt = num(cb.mbFromAmt) ?? 0; cfg.toAmt = num(cb.mbToAmt);
      zvalue = `${cfg.fromAmt}-${cfg.toAmt ?? ""}`;
      yvalue = cb.mbPreset === "CUSTOM" ? "" : cb.mbPreset;
      if (cb.mbPreset === "CUSTOM") { yFromDate = cb.mbFrom; yToDate = cb.mbTo; }
    } else if (a === "LOYALTY") {
      cfg.preset = cb.loPreset; cfg.fromDate = cb.loFrom; cfg.toDate = cb.loTo;
      cfg.fromPts = num(cb.loFromPts) ?? 0; cfg.toPts = num(cb.loToPts);
      zvalue = `${cfg.fromPts}-${cfg.toPts ?? ""}`;
      yvalue = cb.loPreset === "CUSTOM" ? "" : cb.loPreset;
      if (cb.loPreset === "CUSTOM") { yFromDate = cb.loFrom; yToDate = cb.loTo; }
    } else if (a === "VISIT_FREQ") {
      cfg.minVisits = num(cb.vfCount);
      cfg.category = cb.vfCategory; cfg.subCategory = cb.vfSubCategory;
      yvalue = cb.vfCategory; pvalue = cb.vfSubCategory; zvalue = cb.vfCount;
    } else if (a === "SPEND_VISIT") {
      cfg.preset = cb.svPreset; cfg.fromDate = cb.svFrom; cfg.toDate = cb.svTo;
      cfg.fromAmt = num(cb.svFromAmt) ?? 0; cfg.toAmt = num(cb.svToAmt);
      zvalue = `${cfg.fromAmt}-${cfg.toAmt ?? ""}`;
      yvalue = cb.svPreset === "CUSTOM" ? "" : cb.svPreset;
      if (cb.svPreset === "CUSTOM") { yFromDate = cb.svFrom; yToDate = cb.svTo; }
    }
    return { targetArea:a, cbConfig:cfg, xvalue, yvalue, zvalue, pvalue, yFromDate, yToDate };
  };

  const cbSummaryLines = () => {
    const a = cb.targetArea;
    const cats = (arr) => arr.length ? arr.join(", ") : "All categories";
    const winTxt = (preset, from, to, optsMap) => preset === "CUSTOM"
      ? `${from || "—"} → ${to || "—"}`
      : (optsMap.find(o=>o.value===preset)?.label || "—");
    const amtTxt = (f, t, pre="SAR ") => `${pre}${f || 0} → ${pre}${t || "—"}`;
    if (a === "VISIT_DATE") return [
      ["Last Appointment", winTxt(cb.vdPreset, cb.vdFrom, cb.vdTo, CB_WINDOW_OPTS)],
      ["Category", cats(cb.vdCategories)],
    ];
    if (a === "SPEND") return [
      ["Spend", amtTxt(cb.spFromAmt, cb.spToAmt)],
      ["Category Spent On", cats(cb.spCategories)],
    ];
    if (a === "EXPERIENCE") {
      const out = [];
      if (cb.exRatings.length) out.push(["Rating As", cb.exRatings.join(", ")]);
      if (cb.exDurPreset) {
        out.push(["Complaint Duration", winTxt(cb.exDurPreset, cb.exFrom, cb.exTo, CB_WINDOW_OPTS)]);
        out.push(["Complaint Status", cb.exStatuses.length === 3 ? "All statuses" : cb.exStatuses.join(", ")]);
      }
      return out;
    }
    if (a === "MEMBERSHIP") return [
      ["Active Members From", winTxt(cb.mbPreset, cb.mbFrom, cb.mbTo, CB_ACTIVE_OPTS)],
      ["Spent", amtTxt(cb.mbFromAmt, cb.mbToAmt)],
    ];
    if (a === "LOYALTY") return [
      ["Active Loyalty Member From", winTxt(cb.loPreset, cb.loFrom, cb.loTo, CB_ACTIVE_OPTS)],
      ["Loyalty Points", amtTxt(cb.loFromPts, cb.loToPts, "")],
    ];
    if (a === "VISIT_FREQ") return [
      ["Customers Who Have Visited", CB_VISIT_COUNT_OPTS.find(o=>o.value===cb.vfCount)?.label || "—"],
      ["Category", cb.vfCategory || "All categories"],
      ["Subcategory", cb.vfSubCategory || "All subcategories"],
    ];
    if (a === "SPEND_VISIT") return [
      ["Customers Who Visited", winTxt(cb.svPreset, cb.svFrom, cb.svTo, CB_WINDOW_OPTS)],
      ["Spend (same window)", amtTxt(cb.svFromAmt, cb.svToAmt)],
    ];
    return [];
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
      const yd = daysBetween(rule.yFromDate, rule.yToDate);
      const zd = daysBetween(rule.zFromDate, rule.zToDate);
      if (xStr)         parts.push(`Paid for: ${xStr}`);
      if (yd && yd > 0) parts.push(`within ${yd} days`);
      if (zd && zd > 0) parts.push(`no future appt in ${zd} days`);
      if (pStr)         parts.push(`for category: ${pStr}`);
    } else if (general.ruleCode === "R5") {
      if (rule.xvalue) parts.push(`Special Day: ${rule.xvalue}`);
    } else if (general.ruleCode === "R6") {
      if (rule.xvalue) parts.push(`Customer Type: ${rule.xvalue}`);
    } else if (general.ruleCode === "R7") {
      parts.push(`Source: ${rule.externalSource}`);
      if (rule.externalSubSource) parts.push(`Sub: ${rule.externalSubSource}`);
    } else if (general.ruleCode === "R8") {
      parts.push(`Customer Behaviour: ${CB_AREA_LABEL(cb.targetArea)}`);
      cbSummaryLines().forEach(([l, v]) => parts.push(`${l}: ${v}`));
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
    // R7: block activation while the uploaded file has unresolved validation issues.
    if (general.ruleCode === "R7" && isManualUpload && uploadRows.length && uploadErrors.length) {
      showToast("Please fix the Excel validation issues before activating.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await authPost(`${API_BASE_URL}/api/Opportunity/CreateCampaign`, payload);
      if (res?.success === false) throw new Error(res.message);
      const newOppCode = res?.data?.oppCode || oppCodePreview || "";

      // R7 — push the uploaded external-source rows into the freshly created campaign
      if (general.ruleCode === "R7" && isManualUpload && uploadRows.length) {
        const up = await authPost(`${API_BASE_URL}/api/Opportunity/UploadExternalSource`, {
          oppCode: newOppCode,
          oppName: general.oppName,
          rows:    uploadRows,
        });
        if (up?.success === false) throw new Error(up.message || "Row upload failed.");
        showToast(`Campaign ${newOppCode} created — ${up?.data?.inserted ?? uploadRows.length} row(s) uploaded.`);
      } else {
        showToast(`Campaign ${newOppCode || ""} created successfully!`);
      }
      setTimeout(() => navigate("/opportunity"), 1500);
    } catch(e) {
      showToast(e.message || "Failed to create campaign.", "error");
    } finally { setSaving(false); }
  };

  /* ── Render helpers ───────────────────────────────────────────────────────── */
  const today = new Date().toISOString().split("T")[0];

  /* ---- R8 Visit Frequency dropdown data ---- */
  const [cbCategories, setCbCategories] = useState([]);
  useEffect(() => {
    if (general.ruleCode !== "R8") return;
    let alive = true;
    loadServiceCategories().then(list => { if (alive) setCbCategories(Array.isArray(list)?list:[]); });
    return () => { alive = false; };
  }, [general.ruleCode]);
  const cbCatName = (s) =>
    s.categoryName || s.CategoryName || s.CATEGORYNAME ||
    s.serviceCategory || s.SERVICECATEGORY || s.name || s.NAME || s.value || String(s);
  const cbCategoryOpts = cbCategories.map(s => ({ value: cbCatName(s), label: cbCatName(s) }));
  const [cbSubCategories, setCbSubCategories] = useState([]);
  useEffect(() => {
    if (general.ruleCode !== "R8" || !cb.vfCategory) { setCbSubCategories([]); return; }
    let alive = true;
    authGet(`${API_BASE_URL}/api/Master/ServiceSubCategory/${encodeURIComponent(cb.vfCategory)}`)
      .then(d => { if (alive) setCbSubCategories(Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : [])); })
      .catch(() => { if (alive) setCbSubCategories([]); });
    return () => { alive = false; };
  }, [general.ruleCode, cb.vfCategory]);
  const cbSubCategoryOpts = cbSubCategories.map(s => ({ value: cbCatName(s), label: cbCatName(s) }));
  const subSourceOptions = externalSources
    .find(s => s.sourceCode === rule.externalSource)?.subSources || [];

  // Bulk Excel upload is only for the "Others" source + "Manual Upload" sub-source combo.
  const selectedSourceObj = externalSources.find(s => s.sourceCode === rule.externalSource);
  const selectedSubSrcObj = subSourceOptions.find(s => s.subSourceCode === rule.externalSubSource);
  const isManualUpload =
    String(selectedSourceObj?.name || "").trim().toLowerCase() === "others" &&
    String(selectedSubSrcObj?.name || "").trim().toLowerCase() === "manual upload";

  // Clear any staged file if the source/sub-source no longer matches the manual-upload combo.
  useEffect(() => {
    if (!isManualUpload && (uploadRows.length || uploadFileName || uploadErrors.length)) {
      setUploadRows([]); setUploadErrors([]); setUploadFileName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManualUpload]);

  return (
    <div style={{ fontFamily:"Lato,sans-serif", padding:"24px 28px", color:C.text,
      maxWidth: step === 1 ? 1080 : 760, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontWeight:800, fontSize:22, color:C.navyDk }}> Create Campaign</div>
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
          <FieldRow label="Campaign Name" required error={generalErrors.oppName}
            hint="Letters, numbers, spaces and - _ ( ) & , . ' / only">
            <FInput value={general.oppName} placeholder="e.g. No Show - May 2026"
              onChange={e=>setGeneral(p=>({...p,oppName:e.target.value}))} />
          </FieldRow>

          <RuleTypeCards value={general.ruleCode} error={generalErrors.ruleCode}
            onSelect={code=>setGeneral(p=>({...p,ruleCode:code}))} />

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

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <FieldRow label="Campaign Spend" error={generalErrors.campaignSpend}
              hint="Optional. Total spend on this campaign (SAR). Used for Lead Acquisition Cost.">
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
                  fontSize:13, fontWeight:700, color:C.sub, pointerEvents:"none" }}>SAR</span>
                <input type="text" inputMode="decimal" value={general.campaignSpend}
                  placeholder="e.g. 11480"
                  onChange={e=>setGeneral(p=>({...p,campaignSpend:e.target.value}))}
                  style={{ width:"100%", padding:"10px 12px 10px 46px", border:`1px solid ${C.border}`,
                    borderRadius:8, fontSize:13, fontFamily:"Lato,sans-serif", outline:"none",
                    background:"#fff", color:C.text, boxSizing:"border-box" }} />
              </div>
            </FieldRow>

            <FieldRow label="Appt Booking Mandatory on Conversion" required
              hint="Yes auto-routes to Appointment Booking when a lead is marked Converted.">
              <div style={{ display:"flex", gap:10 }}>
                {["Yes","No"].map(opt => {
                  const active = general.apptMandatory === opt;
                  return (
                    <button key={opt} type="button"
                      onClick={()=>setGeneral(p=>({...p,apptMandatory:opt}))}
                      style={{ flex:1, padding:"10px 12px", borderRadius:8, cursor:"pointer",
                        fontSize:13, fontWeight:700, fontFamily:"Lato,sans-serif",
                        border:`1px solid ${active ? C.navy : C.border}`,
                        background: active ? C.navy : "#fff",
                        color: active ? "#fff" : C.text }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
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
            <FieldRow label="Paid for (X) — Service Category" hint="Service categories the customer paid for (multi-select)" required>
              <CategoryMultiSelect value={rule.xvalue}
                placeholder="Select service categories…"
                excludeNames={rule.yvalue}
                onChange={v=>setRule(p=>({...p,xvalue:v}))} />
            </FieldRow>
            <FieldRow label="But Not for (Y) — Service Category"
              hint="Service categories they haven't purchased — cannot overlap with X" required>
              <CategoryMultiSelect value={rule.yvalue}
                placeholder="Select service categories…"
                excludeNames={rule.xvalue}
                onChange={v=>setRule(p=>({...p,yvalue:v}))} />
            </FieldRow>
          </>)}

          {/* R2 — Paid for X in window A, then NO P appointment in window B (win-back) */}
          {general.ruleCode === "R2" && (<>
            <div style={{ padding:"10px 14px", borderRadius:8, background:"#f0f4fa",
              border:`1px solid ${C.border}`, fontSize:12, color:C.sub,
              marginBottom:16, fontWeight:600 }}>
              Win-back rule: find customers who <b>paid</b> for the chosen categories during one
              period, but then had <b>no appointment</b> for the check categories during a second
              period. Both periods are exact date ranges — either one can be in the past
              (e.g. paid in Nov–Dec, no visit since January).
            </div>

            <FieldRow label="① Paid for these service categories" required
              hint="Categories the customer paid for during the period below">
              <CategoryMultiSelect value={rule.xvalue}
                placeholder="Select service categories…"
                excludeNames={rule.pvalue}
                onChange={v=>setRule(p=>({...p,xvalue:v}))} />
            </FieldRow>

            <FieldRow label="② …paid during this period" required
              hint="The active window — any date range, e.g. Nov 2025 → Dec 2025"
              error={ruleErrors.yRange}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <FInput type="date" value={rule.yFromDate} max={rule.yToDate||undefined}
                  onChange={e=>setRule(p=>({...p,yFromDate:e.target.value}))} />
                <span style={{ color:C.sub, fontSize:13 }}>to</span>
                <FInput type="date" value={rule.yToDate} min={rule.yFromDate||undefined}
                  onChange={e=>setRule(p=>({...p,yToDate:e.target.value}))} />
                <DaysReadout from={rule.yFromDate} to={rule.yToDate} />
              </div>
            </FieldRow>

            <FieldRow label="③ AND had no appointment for these categories"
              hint="Categories to check for a booking — can be the same as the paid-for list">
              <CategoryMultiSelect value={rule.pvalue}
                placeholder="Select service categories…"
                onChange={v=>setRule(p=>({...p,pvalue:v}))} />
            </FieldRow>

            <FieldRow label="④ …during this period" required
              hint="The silent window — any date range, past or future, e.g. Jan 2026 → today"
              error={ruleErrors.zRange}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <FInput type="date" value={rule.zFromDate} max={rule.zToDate||undefined}
                  onChange={e=>setRule(p=>({...p,zFromDate:e.target.value}))} />
                <span style={{ color:C.sub, fontSize:13 }}>to</span>
                <FInput type="date" value={rule.zToDate} min={rule.zFromDate||undefined}
                  onChange={e=>setRule(p=>({...p,zToDate:e.target.value}))} />
                <DaysReadout from={rule.zFromDate} to={rule.zToDate} />
              </div>
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
            <FieldRow label="Customer Type" required hint="Target new or existing customers">
              <FSelect value={Array.isArray(rule.xvalue) ? rule.xvalue[0]||"" : rule.xvalue}
                onChange={e=>setRule(p=>({...p,xvalue:e.target.value}))}
                placeholder="Select customer type…"
                options={[
                  { value:"New",      label:"New Customer" },
                  { value:"Existing", label:"Existing Customer" },
                ]} />
            </FieldRow>
          )}

          {/* ==== R8 — Customer Behaviour ==== */}
          {general.ruleCode === "R8" && (<>
            <CbAreaTabs value={cb.targetArea}
              onSelect={k=>{ setCbField("targetArea", k); setRuleErrors({}); }} />

            {cb.targetArea === "VISIT_DATE" && (<>
              <CbSubTitle>Visit Date</CbSubTitle>
              <FieldRow label="Last Appointment" required error={ruleErrors.cbVdPreset}
                hint="When the customer's last appointment falls.">
                <FSelect value={cb.vdPreset} placeholder="Select period…"
                  options={CB_WINDOW_OPTS}
                  onChange={e=>setCbField("vdPreset", e.target.value)} />
              </FieldRow>
              {cb.vdPreset === "CUSTOM" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <FieldRow label="From Date" required error={ruleErrors.cbVdRange}>
                    <FInput type="date" value={cb.vdFrom} max={cb.vdTo||undefined}
                      onChange={e=>setCbField("vdFrom", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="To Date" required>
                    <FInput type="date" value={cb.vdTo} min={cb.vdFrom||undefined}
                      onChange={e=>setCbField("vdTo", e.target.value)} />
                  </FieldRow>
                </div>
              )}
              <FieldRow label="Category"
                hint="Leave empty to include all categories (all selected by default).">
                <CategoryMultiSelect value={cb.vdCategories}
                  placeholder="All categories — add to narrow…"
                  onChange={v=>setCbField("vdCategories", v)} />
              </FieldRow>
            </>)}

            {cb.targetArea === "SPEND" && (<>
              <CbSubTitle>Spend</CbSubTitle>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <FieldRow label="From Amt" required error={ruleErrors.cbSpFrom}
                  hint="0 or greater — negative values are not allowed.">
                  <CbAmountInput prefix="SAR" value={cb.spFromAmt} placeholder="0"
                    onChange={v=>setCbField("spFromAmt", v)} />
                </FieldRow>
                <FieldRow label="To Amt" required error={ruleErrors.cbSpTo}
                  hint="Must be greater than 0.">
                  <CbAmountInput prefix="SAR" value={cb.spToAmt} placeholder="e.g. 2000"
                    onChange={v=>setCbField("spToAmt", v)} />
                </FieldRow>
              </div>
              <FieldRow label="Category Spent On"
                hint="Leave empty to include all categories (all selected by default).">
                <CategoryMultiSelect value={cb.spCategories}
                  placeholder="All categories — add to narrow…"
                  onChange={v=>setCbField("spCategories", v)} />
              </FieldRow>
            </>)}

            {cb.targetArea === "EXPERIENCE" && (<>
              <CbSubTitle>Experience</CbSubTitle>
              {ruleErrors.cbExAny && (
                <div style={{ fontSize:12, color:C.red, fontWeight:600, marginBottom:10 }}>
                   {ruleErrors.cbExAny}
                </div>
              )}
              <FieldRow label="Rating As"
                hint="Sourced from Courtesy Call — Experience Rating.">
                <CbChips value={cb.exRatings}
                  options={["1","2","3","4","5"].map(v=>({value:v,label:v}))}
                  onToggle={v=>setCbField("exRatings", toggleIn(cb.exRatings, v))} />
              </FieldRow>
              <CbSubTitle>Complaint (independent of Rating — fill in either, or both)</CbSubTitle>
              <FieldRow label="Complaint Duration" error={ruleErrors.cbExRange}
                hint="Leave unset if this campaign targets ratings only.">
                <FSelect value={cb.exDurPreset} placeholder="Not used…"
                  options={CB_WINDOW_OPTS}
                  onChange={e=>setCbField("exDurPreset", e.target.value)} />
              </FieldRow>
              {cb.exDurPreset === "CUSTOM" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <FieldRow label="From Date" required>
                    <FInput type="date" value={cb.exFrom} max={cb.exTo||undefined}
                      onChange={e=>setCbField("exFrom", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="To Date" required>
                    <FInput type="date" value={cb.exTo} min={cb.exFrom||undefined}
                      onChange={e=>setCbField("exTo", e.target.value)} />
                  </FieldRow>
                </div>
              )}
              {cb.exDurPreset && (
                <FieldRow label="Complaint Status" error={ruleErrors.cbExStatus}
                  hint="All statuses selected by default.">
                  <CbChips value={cb.exStatuses}
                    options={["Open","WIP","Closed"].map(v=>({value:v,label:v}))}
                    onToggle={v=>setCbField("exStatuses", toggleIn(cb.exStatuses, v))} />
                </FieldRow>
              )}
            </>)}

            {cb.targetArea === "MEMBERSHIP" && (<>
              <CbSubTitle>Membership</CbSubTitle>
              <FieldRow label="Active Members From" required error={ruleErrors.cbMbPreset}>
                <FSelect value={cb.mbPreset} placeholder="Select period…"
                  options={CB_ACTIVE_OPTS}
                  onChange={e=>setCbField("mbPreset", e.target.value)} />
              </FieldRow>
              {cb.mbPreset === "CUSTOM" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <FieldRow label="From Date" required error={ruleErrors.cbMbRange}>
                    <FInput type="date" value={cb.mbFrom} max={cb.mbTo||undefined}
                      onChange={e=>setCbField("mbFrom", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="To Date" required>
                    <FInput type="date" value={cb.mbTo} min={cb.mbFrom||undefined}
                      onChange={e=>setCbField("mbTo", e.target.value)} />
                  </FieldRow>
                </div>
              )}
              <CbSubTitle>And have spent</CbSubTitle>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <FieldRow label="From Amt" error={ruleErrors.cbMbAmt}>
                  <CbAmountInput prefix="SAR" value={cb.mbFromAmt} placeholder="0"
                    onChange={v=>setCbField("mbFromAmt", v)} />
                </FieldRow>
                <FieldRow label="To Amt" hint="Optional — leave blank for no upper limit.">
                  <CbAmountInput prefix="SAR" value={cb.mbToAmt} placeholder="e.g. 5000"
                    onChange={v=>setCbField("mbToAmt", v)} />
                </FieldRow>
              </div>
            </>)}

            {cb.targetArea === "LOYALTY" && (<>
              <CbSubTitle>Loyalty</CbSubTitle>
              <FieldRow label="Active Loyalty Member From" required error={ruleErrors.cbLoPreset}>
                <FSelect value={cb.loPreset} placeholder="Select period…"
                  options={CB_ACTIVE_OPTS}
                  onChange={e=>setCbField("loPreset", e.target.value)} />
              </FieldRow>
              {cb.loPreset === "CUSTOM" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <FieldRow label="From Date" required error={ruleErrors.cbLoRange}>
                    <FInput type="date" value={cb.loFrom} max={cb.loTo||undefined}
                      onChange={e=>setCbField("loFrom", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="To Date" required>
                    <FInput type="date" value={cb.loTo} min={cb.loFrom||undefined}
                      onChange={e=>setCbField("loTo", e.target.value)} />
                  </FieldRow>
                </div>
              )}
              <CbSubTitle>And have loyalty points</CbSubTitle>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <FieldRow label="From Pts Value" error={ruleErrors.cbLoPts}>
                  <CbAmountInput value={cb.loFromPts} placeholder="0"
                    onChange={v=>setCbField("loFromPts", v)} />
                </FieldRow>
                <FieldRow label="To Pts Value" hint="Optional — leave blank for no upper limit.">
                  <CbAmountInput value={cb.loToPts} placeholder="e.g. 5000"
                    onChange={v=>setCbField("loToPts", v)} />
                </FieldRow>
              </div>
            </>)}

            {cb.targetArea === "VISIT_FREQ" && (<>
              <CbSubTitle>Visit Frequency</CbSubTitle>
              <FieldRow label="Customers Who Have Visited" required error={ruleErrors.cbVfCount}>
                <FSelect value={cb.vfCount} placeholder="Select…"
                  options={CB_VISIT_COUNT_OPTS}
                  onChange={e=>setCbField("vfCount", e.target.value)} />
              </FieldRow>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <FieldRow label="Category — optional">
                  <FSelect value={cb.vfCategory} placeholder="All categories"
                    options={cbCategoryOpts}
                    onChange={e=>setCbField("vfCategory", e.target.value)} />
                </FieldRow>
                <FieldRow label="Subcategory — optional">
                  <FSelect value={cb.vfSubCategory} placeholder="All subcategories"
                    options={cbSubCategoryOpts}
                    onChange={e=>setCbField("vfSubCategory", e.target.value)} />
                </FieldRow>
              </div>
            </>)}

            {cb.targetArea === "SPEND_VISIT" && (<>
              <CbSubTitle>Spend + Visit</CbSubTitle>
              <FieldRow label="Customers Who Visited" required error={ruleErrors.cbSvPreset}>
                <FSelect value={cb.svPreset} placeholder="Select period…"
                  options={CB_WINDOW_OPTS}
                  onChange={e=>setCbField("svPreset", e.target.value)} />
              </FieldRow>
              {cb.svPreset === "CUSTOM" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <FieldRow label="From Date" required error={ruleErrors.cbSvRange}>
                    <FInput type="date" value={cb.svFrom} max={cb.svTo||undefined}
                      onChange={e=>setCbField("svFrom", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="To Date" required>
                    <FInput type="date" value={cb.svTo} min={cb.svFrom||undefined}
                      onChange={e=>setCbField("svTo", e.target.value)} />
                  </FieldRow>
                </div>
              )}
              <CbSubTitle>And have spend (within that same window)</CbSubTitle>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <FieldRow label="From Amt" error={ruleErrors.cbSvAmt}>
                  <CbAmountInput prefix="SAR" value={cb.svFromAmt} placeholder="0"
                    onChange={v=>setCbField("svFromAmt", v)} />
                </FieldRow>
                <FieldRow label="To Amt" hint="Must be greater than 0.">
                  <CbAmountInput prefix="SAR" value={cb.svToAmt} placeholder="e.g. 1500"
                    onChange={v=>setCbField("svToAmt", v)} />
                </FieldRow>
              </div>
            </>)}
          </>)}

          {/* R7 — External Source */}
          {general.ruleCode === "R7" && (<>
            <FieldRow label="External Source" required error={ruleErrors.externalSource}>
              <FSelect value={rule.externalSource}
                onChange={e=>{
                  setRule(p=>({...p,externalSource:e.target.value,externalSubSource:""}));
                }}
                placeholder="Select source…"
                options={externalSources.map(s=>({value:s.sourceCode, label:s.name}))} />
            </FieldRow>
            {subSourceOptions.length > 0 && (
              <FieldRow label="External Sub-Source">
                <FSelect value={rule.externalSubSource}
                  onChange={e=>setRule(p=>({...p,externalSubSource:e.target.value}))}
                  placeholder="Select sub-source…"
                  options={subSourceOptions.map(s=>({value:s.subSourceCode, label:s.name||s.subSourceCode}))} />
              </FieldRow>
            )}

            {/* R7 — Excel bulk upload (only for source "Others" + sub-source "Manual Upload") */}
            {isManualUpload && (
            <FieldRow label="Bulk Upload (Excel)"
              hint="Required columns: CustMobileNo, FirstName, LastName, Sales Owner, Doctor, CreatedDate, ExternalSource, ExternalSubSource, ClinicLocation, ORuleCode. OppCode & OppName come from Step 1. ClinicLocation must match your centre; ORuleCode is set to R7. Rows are inserted into the campaign on Activate.">
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload}
                style={{ fontSize:13 }} />
              {parsing && (
                <div style={{ fontSize:12, color:"#6b7280", marginTop:6 }}>Reading file…</div>
              )}
              {uploadFileName && !parsing && (
                <div style={{ fontSize:12, marginTop:6, color: uploadErrors.length ? C.red : "#15803d" }}>
                  {uploadFileName} — {uploadRows.length} row(s)
                  {uploadErrors.length ? `, ${uploadErrors.length} issue(s)` : " ✓ ready"}
                </div>
              )}
              {uploadErrors.length > 0 && (
                <div style={{ marginTop:8, maxHeight:140, overflowY:"auto", background:"#fff5f5",
                  border:`1px solid ${C.red}`, borderRadius:8, padding:"8px 10px" }}>
                  {uploadErrors.slice(0,50).map((er,i)=>(
                    <div key={i} style={{ fontSize:11, color:C.red }}> {er}</div>
                  ))}
                  {uploadErrors.length>50 && (
                    <div style={{ fontSize:11, color:C.red }}>…and {uploadErrors.length-50} more</div>
                  )}
                </div>
              )}
            </FieldRow>
            )}
          </>)}

          {/* Rule Days — only for Dynamic campaigns (Static uses fixed date range instead).
              R2 derives its Y/Z days from the two date ranges above, so it's excluded here. */}
          {selectedRule.hasDays && general.ruleCode !== "R2" && general.ruleType === "2" && (
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
                    <div style={{ fontSize:11, color:C.red, marginTop:4 }}> {ruleErrors.customDays}</div>
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
          <InfoRow label="Campaign Spend"
            value={String(general.campaignSpend ?? "").trim()===""
              ? "—"
              : `SAR ${Number(String(general.campaignSpend).replace(/,/g,"")).toLocaleString()}`} />
          <InfoRow label="Appt Booking Mandatory on Conversion"
            value={general.apptMandatory==="No" ? "No" : "Yes"}
            badge={general.apptMandatory==="No"
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
          {general.ruleCode === "R8" && (<>
            <InfoRow label="Target Area" value={CB_AREA_LABEL(cb.targetArea)}
              badge={{bg:"#fdf2ec", color:"#b4523f"}} />
            {cbSummaryLines().map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
          </>)}
          {general.ruleCode === "R7" && (<>
            <InfoRow label="External Source"
              value={externalSources.find(s=>s.sourceCode===rule.externalSource)?.name || rule.externalSource} />
            {rule.externalSubSource && (
              <InfoRow label="Sub-Source"
                value={externalSources.find(s=>s.sourceCode===rule.externalSource)
                  ?.subSources?.find(ss=>ss.subSourceCode===rule.externalSubSource)?.name
                  || rule.externalSubSource} />
            )}
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
            <button onClick={() => guard("OPP.CAMPAIGN_CREATION", handleActivate)} disabled={saving}
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