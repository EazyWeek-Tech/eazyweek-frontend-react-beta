import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const authGet  = async (url) => { const r = await fetch(url, { headers:{ Authorization:`Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => { const r = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}`}, body:JSON.stringify(body) }); const j = await r.json(); return j; };
const authPut  = async (url, body) => { const r = await fetch(url, { method:"PUT",  headers:{"Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}`}, body:JSON.stringify(body) }); const j = await r.json(); return j; };

const TABS = ["General","Combination","Pricing","Validity","Miscellaneous"];

// ── Shared components ─────────────────────────────────────────────────────────
const Field = ({ label, required, error, children }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:"block", fontWeight:600, fontSize:13, color:"#334b71", marginBottom:4 }}>
      {label}{required && <span style={{ color:"#b91c1c" }}> *</span>}
    </label>
    {children}
    {error && <div style={{ color:"#b91c1c", fontSize:12, marginTop:3 }}>⚠ {error}</div>}
  </div>
);
const Input = ({ value, onChange, placeholder, type="text", readOnly, disabled, style={} }) => (
  <input type={type} value={value||""} onChange={onChange} placeholder={placeholder}
    readOnly={readOnly} disabled={disabled}
    style={{ width:"100%", height:38, padding:"0 10px", border:"1.5px solid #e2e8f0", borderRadius:8,
      fontSize:13, boxSizing:"border-box",
      background: (readOnly||disabled) ? "#f1f5f9" : "#fff",
      color: disabled ? "#94a3b8" : "#1e293b", ...style }} />
);
const Select = ({ value, onChange, options, placeholder, disabled }) => (
  <select value={value||""} onChange={onChange} disabled={disabled}
    style={{ width:"100%", height:38, padding:"0 10px", border:"1.5px solid #e2e8f0", borderRadius:8,
      fontSize:13, background: disabled ? "#f1f5f9" : "#fff", color: disabled ? "#94a3b8" : "#1e293b" }}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
  </select>
);
const Toggle = ({ value, onChange, label, disabled }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, opacity: disabled?0.5:1 }}>
    <div onClick={disabled ? undefined : onChange}
      style={{ width:44, height:24, borderRadius:12, background: value ? "#334b71" : "#e2e8f0",
        position:"relative", cursor: disabled ? "not-allowed" : "pointer", transition:"background .2s" }}>
      <div style={{ position:"absolute", top:3, left: value ? 23 : 3, width:18, height:18,
        borderRadius:9, background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
    <span style={{ fontSize:13, color:"#334b71" }}>{label}: <strong>{value ? "Yes" : "No"}</strong></span>
  </div>
);

// ── TAB 1: GENERAL ────────────────────────────────────────────────────────────
const GeneralTab = ({ form, setForm, errors, isEdit, setErrors, isAdmin = true }) => {
  const [categories,    setCategories]    = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [catLoading,    setCatLoading]    = useState(false);
  const [subLoading,    setSubLoading]    = useState(false);

  // Load categories on mount
  useEffect(() => {
    setCatLoading(true);
    authGet(`${API_BASE_URL}/api/Master/Categories`)
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false));
  }, []);

  // Load sub-categories when category changes
  useEffect(() => {
    if (!form.categoryCode) { setSubCategories([]); return; }
    setSubLoading(true);
    authGet(`${API_BASE_URL}/api/Master/SubCategories/${encodeURIComponent(form.categoryCode)}`)
      .then(data => setSubCategories(Array.isArray(data) ? data : []))
      .catch(() => setSubCategories([]))
      .finally(() => setSubLoading(false));
  }, [form.categoryCode]);

  const handleCategoryChange = (e) => {
    const selected = categories.find(c => c.categoryCode === e.target.value);
    setForm(p => ({
      ...p,
      categoryCode:    e.target.value,
      category:        selected?.categoryName || e.target.value,
      subCategoryCode: "",
      subCategory:     "",
    }));
    setErrors(p => ({ ...p, category: undefined, subCategory: undefined }));
  };

  const handleSubCategoryChange = (e) => {
    const selected = subCategories.find(s => s.subCategoryCode === e.target.value);
    setForm(p => ({
      ...p,
      subCategoryCode: e.target.value,
      subCategory:     selected?.subCategoryName || e.target.value,
    }));
    setErrors(p => ({ ...p, subCategory: undefined }));
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
      <Field label="Package Code" required error={errors.packageCode}>
        <Input value={form.packageCode}
          onChange={e => { setForm(p=>({...p,packageCode:e.target.value})); setErrors(p=>({...p,packageCode:undefined})); }}
          placeholder="e.g. PKG-2001" readOnly={isEdit} />
      </Field>
      <Field label="Package Name" required error={errors.packageName}>
        <Input value={form.packageName}
          onChange={e => { setForm(p=>({...p,packageName:e.target.value})); setErrors(p=>({...p,packageName:undefined})); }}
          placeholder="Package name" />
      </Field>

      <Field label="Category" required error={errors.category}>
        <select value={form.categoryCode||""} onChange={handleCategoryChange}
          style={{ width:"100%", height:38, padding:"0 10px", border:`1.5px solid ${errors.category?"#b91c1c":"#e2e8f0"}`, borderRadius:8, fontSize:13, background:"#fff" }}>
          <option value="">{catLoading ? "Loading…" : "Select category…"}</option>
          {categories.map(c => (
            <option key={c.categoryCode} value={c.categoryCode}>{c.categoryName}</option>
          ))}
        </select>
      </Field>

      <Field label="Sub-Category" required error={errors.subCategory}>
        <select value={form.subCategoryCode||""} onChange={handleSubCategoryChange}
          disabled={!form.categoryCode}
          style={{ width:"100%", height:38, padding:"0 10px",
            border:`1.5px solid ${errors.subCategory?"#b91c1c":"#e2e8f0"}`,
            borderRadius:8, fontSize:13,
            background: !form.categoryCode ? "#f1f5f9" : "#fff",
            color: !form.categoryCode ? "#94a3b8" : "#1e293b" }}>
          <option value="">
            {!form.categoryCode ? "Select a category first" : subLoading ? "Loading…" : subCategories.length === 0 ? "No sub-categories found" : "Select sub-category…"}
          </option>
          {subCategories.map(s => (
            <option key={s.subCategoryCode} value={s.subCategoryCode}>{s.subCategoryName}</option>
          ))}
        </select>
      </Field>

      <Field label="Tag (from Tag Master)">
        <Input value={form.tag} onChange={e => setForm(p=>({...p,tag:e.target.value}))} placeholder="Select from Tag Master" />
      </Field>

      <div style={{ gridColumn:"1/-1", marginTop:8, paddingTop:12, borderTop:"1px solid #f1f5f9" }}>
        <Toggle value={form.addToQuickCart}     onChange={()=>setForm(p=>({...p,addToQuickCart:!p.addToQuickCart}))}     label="Add to Quick Cart (max 10)" />
        <Toggle value={form.allowTransfer}      onChange={()=>setForm(p=>({...p,allowTransfer:!p.allowTransfer}))}       label="Allow Package Transfer" />
        <Toggle value={form.allowLoyaltyAccrue} onChange={()=>setForm(p=>({...p,allowLoyaltyAccrue:!p.allowLoyaltyAccrue}))} label="Allow Loyalty Accrual" />
        <Toggle value={form.allowLoyaltyRedeem} onChange={()=>setForm(p=>({...p,allowLoyaltyRedeem:!p.allowLoyaltyRedeem}))} label="Allow Loyalty Redemption" />
      </div>
    </div>
  );
};

// ── Standalone Autocomplete (must be outside CombinationTab to avoid re-mount) ─
// onType = user is typing (clears selection), onSelect = user picked from list (keeps selection)
// onDisplayVal = just updates the displayed text without clearing selection
const Autocomplete = ({ displayVal, onType, sugg, onSelect, onAdd, qty, onQty, disabled, label, placeholder }) => {
  const [open, setOpen] = useState(false);
  // Results arrive asynchronously (after the debounce + network round-trip), by
  // which point onChange's setOpen(true) may have been undone by an onBlur. Re-open
  // whenever suggestions land so the dropdown reliably shows.
  useEffect(() => { if (sugg.length > 0) setOpen(true); }, [sugg]);
  return (
    <div style={{ background:"#f8fafc", borderRadius:10, padding:14, marginBottom:12, border:"1px solid #e2e8f0", opacity: disabled?0.45:1 }}>
      <div style={{ fontWeight:700, fontSize:13, color:"#334b71", marginBottom:10 }}>{label}</div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <div style={{ flex:2, position:"relative" }}>
          <input
            value={displayVal}
            onChange={e => { onType(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            disabled={disabled}
            style={{ width:"100%", height:36, padding:"0 10px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box", background:disabled?"#f1f5f9":"#fff" }}
          />
          {open && sugg.length > 0 && (
            <ul style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, zIndex:999, listStyle:"none", margin:0, padding:"4px 0", maxHeight:200, overflowY:"auto", boxShadow:"0 4px 16px rgba(0,0,0,.12)" }}>
              {sugg.map((s,i) => {
                const name = s.serviceName||s.SERVICENAME||s.productName||s.PRODUCTNAME||"";
                const code = s.serviceCode||s.SERVICECODE||s.productCode||s.PRODUCTCODE||s.code||"";
                return (
                  <li key={i}
                    onMouseDown={e => {
                      e.preventDefault();   // prevent input blur
                      onSelect(s, name);    // store selection AND display text in one call
                      setOpen(false);
                    }}
                    style={{ padding:"9px 12px", cursor:"pointer", fontSize:13, display:"flex", flexDirection:"column", gap:2 }}
                    onMouseEnter={e=>e.currentTarget.style.background="#f0f4fa"}
                    onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                    <span>{name}</span>
                    {code && <span style={{ fontSize:11, color:"#94a3b8" }}>Code: {code}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <input type="number" min={1} step={1} value={qty} onChange={e=>onQty(e.target.value)}
          placeholder="Qty" disabled={disabled}
          style={{ width:70, height:36, padding:"0 10px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, background:disabled?"#f1f5f9":"#fff" }} />
        <button onClick={onAdd} disabled={disabled}
          style={{ height:36, padding:"0 16px", background: disabled?"#94a3b8":"#334b71", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor: disabled?"not-allowed":"pointer", fontSize:13 }}>
          + Add
        </button>
      </div>
    </div>
  );
};

// ── TAB 2: COMBINATION ────────────────────────────────────────────────────────
const CombinationTab = ({ form, setForm, errors = {}, setErrors = () => {}, isAdmin = true }) => {
  const [svcSearch,  setSvcSearch]  = useState("");
  const [svcSugg,    setSvcSugg]    = useState([]);
  const [selSvc,     setSelSvc]     = useState(null);
  const [svcQty,     setSvcQty]     = useState("");
  const [prodSearch, setProdSearch] = useState("");
  const [prodSugg,   setProdSugg]   = useState([]);
  const [selProd,    setSelProd]    = useState(null);
  const [prodQty,    setProdQty]    = useState("");
  const [err,        setErr]        = useState("");
  const deb = useRef(null);

  const showSvc  = form.packageConsistsOf !== "Products";
  const showProd = form.packageConsistsOf !== "Services";

  // Runs the actual API search.
  const runSearch = async (val, type) => {
    const u = getUser();
    try {
      const q = encodeURIComponent(val.trim());
      const url = type === "svc"
        // requireCentrePrice=false → include services not yet priced at this centre
        ? `${API_BASE_URL}/api/Master/GetServiceByName/${q}/${u.centerCode||""}?requireCentrePrice=false`
        : `${API_BASE_URL}/api/Master/GetProductByName/${q}/${u.centerCode||""}`;
      const data = await authGet(url);
      const list = Array.isArray(data) ? data : [];
      if (type === "svc") setSvcSugg(list); else setProdSugg(list);
    } catch {}
  };

  // Fires on every input change — React triggers onChange for typing AND paste.
  // A jump of more than one character = paste/autofill → search immediately (skip
  // the debounce); the dropdown then shows the matches (by name or code) to pick.
  const handleType = (val, type) => {
    const prev = type === "svc" ? svcSearch : prodSearch;
    const isPaste = val.length - prev.length > 1;
    if (type === "svc") { setSvcSearch(val); setSelSvc(null); setSvcSugg([]); }
    else                { setProdSearch(val); setSelProd(null); setProdSugg([]); }
    clearTimeout(deb.current);
    if (val.trim().length < 2) return;             // ignore 0–1 char queries
    if (isPaste) { runSearch(val, type); return; } // instant search on paste
    deb.current = setTimeout(() => runSearch(val, type), 250);
  };

  // Called when user selects from dropdown — sets both the item AND the display text atomically
  const handleSelect = (item, name, type) => {
    if (type === "svc") { setSelSvc(item); setSvcSearch(name); setSvcSugg([]); }
    else                { setSelProd(item); setProdSearch(name); setProdSugg([]); }
  };

  const addItem = (type) => {
    const isSvc  = type === "Service";
    const sel    = isSvc ? selSvc  : selProd;
    const qty    = parseInt(isSvc ? svcQty : prodQty);
    const qtyStr = isSvc ? svcQty : prodQty;
    if (!sel) { setErr(`Please select a ${type.toLowerCase()} from the list.`); return; }
    if (!Number.isInteger(qty) || qty <= 0 || String(qtyStr).includes("."))
      { setErr("Quantity must be a whole positive number. Decimals are not permitted."); return; }
    setErr("");
    const code = isSvc ? (sel.serviceCode||sel.SERVICECODE||sel.code||'') : (sel.productCode||sel.PRODUCTCODE||sel.code||'');
    const name = isSvc ? (sel.serviceName||sel.SERVICENAME||sel.name||'') : (sel.productName||sel.PRODUCTNAME||sel.name||'');
    setForm(p => ({ ...p, items:[...(p.items||[]), { itemType:type, itemCode:code, itemName:name, quantity:qty }] }));
    setErr("");
    // Clear items-level error from validation since user just added one
    setErrors(p => { const e={...p}; delete e.items; return e; });
    if (isSvc) { setSvcSearch(""); setSelSvc(null); setSvcQty(""); setSvcSugg([]); }
    else       { setProdSearch(""); setSelProd(null); setProdQty(""); setProdSugg([]); }
  };

  const removeItem = idx => {
    setForm(p=>({...p, items:p.items.filter((_,i)=>i!==idx)}));
    // Clear any qty errors for shifted items
    setErrors(p => {
      const e = {...p};
      Object.keys(e).forEach(k => { if (k.startsWith("itemQty_")) delete e[k]; });
      return e;
    });
  };

  // Autocomplete is defined outside this component to prevent re-mount on each render

  return (
    <div>
      <Field label="Package Consists Of" required>
        <Select value={form.packageConsistsOf||"Services"} onChange={e=>setForm(p=>({...p,packageConsistsOf:e.target.value}))}
          options={["Services","Products","Services & Products"]} />
      </Field>
      {err && <div style={{ color:"#b91c1c", fontSize:12, marginBottom:10 }}>⚠ {err}</div>}

      <Autocomplete disabled={!showSvc} label="Add Service" placeholder="Search active services…"
        displayVal={svcSearch} onType={v=>handleType(v,"svc")} sugg={svcSugg} onSelect={(s,name)=>handleSelect(s,name,"svc")}
        qty={svcQty} onQty={setSvcQty} onAdd={()=>addItem("Service")} />

      <Autocomplete disabled={!showProd} label="Add Product" placeholder="Search products…"
        displayVal={prodSearch} onType={v=>handleType(v,"prod")} sugg={prodSugg} onSelect={(s,name)=>handleSelect(s,name,"prod")}
        qty={prodQty} onQty={setProdQty} onAdd={()=>addItem("Product")} />

      {errors.items && (
        <div style={{ color:"#b91c1c", fontSize:13, padding:"8px 12px", background:"#fdf3f3", border:"1px solid #f0c4c0", borderRadius:8, marginBottom:10 }}>
          ⚠ {errors.items}
        </div>
      )}

      {(form.items||[]).length > 0 && (
        <>
          <div style={{ fontWeight:700, fontSize:13, color:"#334b71", marginBottom:8 }}>Package Details</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            <thead>
              <tr style={{ background:"#f1f5f9" }}>
                {["Type","Code","Name","Qty",""].map(h=>(
                  <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(form.items||[]).map((item,i)=>(
                <tr key={i} style={{ borderBottom:"1px solid #f1f5f9", background: errors[`itemQty_${i}`] ? "#fdf3f3" : undefined }}>
                  <td style={{ padding:"9px 12px" }}><span style={{ background: item.itemType==="Service"?"#eef2f7":"#fef3c7", color: item.itemType==="Service"?"#334b71":"#92400e", borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600 }}>{item.itemType}</span></td>
                  <td style={{ padding:"9px 12px", fontWeight:700, color:"#334b71" }}>{item.itemCode}</td>
                  <td style={{ padding:"9px 12px" }}>{item.itemName}</td>
                  <td style={{ padding:"9px 12px", fontWeight:700 }}>
                    {item.quantity}
                    {errors[`itemQty_${i}`] && (
                      <div style={{ color:"#b91c1c", fontSize:11, fontWeight:400 }}>⚠ {errors[`itemQty_${i}`]}</div>
                    )}
                  </td>
                  <td style={{ padding:"9px 12px" }}>
                    <button onClick={()=>removeItem(i)} style={{ background:"none", border:"none", color:"#b91c1c", cursor:"pointer", fontWeight:700 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

// ── TAB 3: PRICING (per-centre) ───────────────────────────────────────────────
const PricingTab = ({ form, setForm, errors = {} }) => {
  const updateRow = (idx, field, val) => {
    setForm(p => {
      const pricing = [...(p.pricing||[])];
      pricing[idx] = { ...pricing[idx], [field]: val };
      // If Tax Included = Yes, force Tax% to 0
      if (field === "taxIncluded" && val === "Yes") pricing[idx].taxPercent = "0";
      return { ...p, pricing };
    });
  };

  if (!form.pricing?.length) return (
    <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
      No centres configured. Centres are auto-populated from Legal Entity configuration.
    </div>
  );

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr style={{ background:"#f1f5f9" }}>
            {["Centre","Price (SAR)","Tax Included","Tax %","Release to Centre",""].map(h=>(
              <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(form.pricing||[]).map((row,idx)=>(
            <tr key={idx} style={{ borderBottom:"1px solid #f1f5f9" }}>
              <td style={{ padding:"10px 12px", fontWeight:700, color:"#334b71" }}>{row.centerName || row.centerCode}</td>
              <td style={{ padding:"10px 12px" }}>
                <Input type="number" value={row.price} onChange={e=>updateRow(idx,"price",e.target.value)} placeholder="0.00" style={{ width:120 }} />
              </td>
              <td style={{ padding:"10px 12px" }}>
                <Select value={row.taxIncluded||"No"} onChange={e=>updateRow(idx,"taxIncluded",e.target.value)} options={["Yes","No"]} />
              </td>
              <td style={{ padding:"10px 12px" }}>
                <Input type="number" value={row.taxPercent} onChange={e=>updateRow(idx,"taxPercent",e.target.value)}
                  placeholder="0" disabled={row.taxIncluded==="Yes"} style={{ width:80 }} />
              </td>
              <td style={{ padding:"10px 12px", textAlign:"center" }}>
                <input type="checkbox" checked={!!row.releasedToCentre} onChange={e=>updateRow(idx,"releasedToCentre",e.target.checked)}
                  style={{ width:18, height:18, cursor:"pointer" }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop:10, fontSize:12, color:"#94a3b8" }}>
        ⚠ Package is purchasable at a centre only when "Release to Centre" is checked.
        When Tax Included = Yes, Tax % is automatically set to 0 and disabled.
      </div>
    </div>
  );
};

// ── TAB 4: VALIDITY ───────────────────────────────────────────────────────────
const ValidityTab = ({ form, setForm, errors }) => (
  <div>
    <Field label="Package Expiry Type" required error={errors.expiryType}>
      <div style={{ display:"flex", gap:16, marginTop:4 }}>
        {["Expires","Never Expires"].map(opt=>(
          <label key={opt} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, fontWeight:600 }}>
            <input type="radio" name="expiryType" value={opt}
              checked={opt === "Never Expires" ? form.neverExpires : !form.neverExpires}
              onChange={()=>setForm(p=>({...p, neverExpires: opt==="Never Expires", expiryTenure: opt==="Never Expires"?"":"365"}))}
              style={{ width:16, height:16 }} />
            {opt}
          </label>
        ))}
      </div>
    </Field>
    <Field label="Expiry Tenure (Days)" error={errors.expiryTenure}>
      <Input type="number" value={form.neverExpires ? "" : (form.expiryTenure||"")}
        onChange={e=>setForm(p=>({...p,expiryTenure:e.target.value}))}
        disabled={form.neverExpires} placeholder={form.neverExpires ? "N/A — Never Expires" : "e.g. 365"} />
    </Field>
    {form.neverExpires && form.gracePeriod && (
      <div style={{ padding:'8px 12px', background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:8, fontSize:12, color:'#92400e', marginBottom:8 }}>
        ⚠ Grace Period has no effect when package Never Expires.
      </div>
    )}
    <Toggle value={form.gracePeriod} onChange={()=>setForm(p=>({...p,gracePeriod:!p.gracePeriod,graceTenure:""}))}
      label="Allow Grace Beyond Expiry" />
    <Field label="Grace Tenure (Days)" error={errors.graceTenure}>
      <Input type="number" value={form.gracePeriod ? (form.graceTenure||"") : ""}
        onChange={e=>setForm(p=>({...p,graceTenure:e.target.value}))}
        disabled={!form.gracePeriod} placeholder={form.gracePeriod ? "e.g. 30" : "N/A"} />
    </Field>
  </div>
);

// ── TAB 5: MISCELLANEOUS ──────────────────────────────────────────────────────
const MiscTab = ({ form, setForm }) => (
  <div>
    <p style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>
      Five optional fields for additional business-defined information. Labels are admin-configurable.
    </p>
    {[1,2,3,4,5].map(n=>(
      <Field key={n} label={`Additional Field ${n}`}>
        <Input value={form[`addField${n}`]||""}
          onChange={e=>setForm(p=>({...p,[`addField${n}`]:e.target.value}))}
          placeholder={`Additional Field ${n}`} />
      </Field>
    ))}
  </div>
);

// ── EMPTY FORM STATE ──────────────────────────────────────────────────────────
const EMPTY = {
  packageCode:"", packageName:"",
  categoryCode:"", category:"",
  subCategoryCode:"", subCategory:"",
  tag:"", status:"Draft",
  addToQuickCart:false, allowTransfer:false, allowLoyaltyAccrue:false, allowLoyaltyRedeem:false,
  packageConsistsOf:"Services", items:[],
  pricing:[],
  neverExpires:false, expiryTenure:"365", gracePeriod:false, graceTenure:"",
  addField1:"", addField2:"", addField3:"", addField4:"", addField5:"",
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const PackageMaster = () => {
  // ── Access rights ─────────────────────────────────────────────────────────
  const _rights = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const role = (u.role || u.userRole || u.securityRole || "").toLowerCase().replace(/\s/g, "");
      const isAdmin       = role === "admin";
      const isEntityLevel = u.isEntityLevel === true;
      const canWrite      = isAdmin && isEntityLevel;
      return { isAdmin, isEntityLevel, canCreate: canWrite, canEdit: canWrite, canDelete: canWrite };
    } catch {
      return { isAdmin:false, isEntityLevel:false, canCreate:false, canEdit:false, canDelete:false };
    }
  })();
  const { isAdmin, isEntityLevel, canCreate, canEdit, canDelete } = _rights;

  const [view,      setView]      = useState("list");
  const [packages,  setPackages]  = useState([]);
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("");
  const [sortField, setSortField] = useState("PACKAGECODE");
  const [sortDir,   setSortDir]   = useState("asc");   // "asc" | "desc"
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);
  const [loading,   setLoading]   = useState(false);
  const [editCode,  setEditCode]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [activeTab, setActiveTab] = useState(0);
  const [errors,    setErrors]    = useState({});
  const [toast,     setToast]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4500); };

  const loadList = async () => {
    setLoading(true);
    try {
      const u = getUser();
      const centerCode = u.centerCode || "";
      const leCode     = u.legalEntityCode || u.leCode || centerCode;
      // releasedToCentre=1 → also include packages released to this centre even when
      // owned by another legal entity, so a centre-level user sees what's available
      // at their centre (not only packages their own entity owns).
      const data = await authGet(`${API_BASE_URL}/api/Package/List?search=${encodeURIComponent(search)}&status=${status}&centerCode=${encodeURIComponent(centerCode)}&releasedToCentre=1`);
      setPackages(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load packages","error"); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ if(view==="list") loadList(); },[view,search,status]);

  // Reset to first page whenever the result set changes
  useEffect(()=>{ setPage(1); }, [search, status, packages, pageSize]);

  // Click a header to sort; clicking the active column flips direction
  const toggleSort = (field) => {
    if (!field) return;
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const sortedPackages = (() => {
    const arr = [...packages];
    arr.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (typeof av === "boolean" || typeof bv === "boolean") {
        av = av ? 1 : 0; bv = bv ? 1 : 0;
        return sortDir === "asc" ? av - bv : bv - av;
      }
      av = (av ?? "").toString().toLowerCase();
      bv = (bv ?? "").toString().toLowerCase();
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  })();

  const totalPages  = Math.max(1, Math.ceil(sortedPackages.length / pageSize));
  const safePage    = Math.min(page, totalPages);
  const pagedPackages = sortedPackages.slice((safePage - 1) * pageSize, safePage * pageSize);

  const [formDirty, setFormDirty] = useState(false);

  const openCreate = async () => {
    setSaveAttempted(false); setFormDirty(false);
    const u = getUser();
    let pricing = [];
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
      const res   = await fetch(`${API_BASE_URL}/api/Settings/Centre/Hierarchy`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json  = await res.json();
      const hier  = json.data ?? json;
      const allCentres = [
        // Entity row excluded from pricing — packages are released to branch centres only
        ...(hier.zones  || []).flatMap(z => z.clinics.map(c => ({ code: c.code, name: c.name }))),
      ];
      pricing = allCentres.map(cc => ({
        centerCode: cc.code || "", centerName: cc.name || cc.code || "",
        price: "", taxIncluded: "No", taxPercent: "", releasedToCentre: false,
      }));
    } catch {}
    if (!pricing.length) {
      pricing = [{ centerCode: u.centerCode||"", centerName: u.centerName||u.centerCode||"", price:"", taxIncluded:"No", taxPercent:"", releasedToCentre:false }];
    }
    setForm({...EMPTY, pricing});
    setEditCode(null); setActiveTab(0); setErrors({}); setView("form");
  };

  const openEdit = async (code) => {
    setSaveAttempted(false); setFormDirty(false);
    try {
      const data = await authGet(`${API_BASE_URL}/api/Package/${code}`);
      setForm({
        ...EMPTY,
        packageCode:        data.PACKAGECODE,
        packageName:        data.PACKAGENAME,
        category:           data.CATEGORY        || "",
        categoryCode:       data.CATEGORYCODE     || data.CATEGORY || "",
        subCategory:        data.SUBCATEGORY      || "",
        subCategoryCode:    data.SUBCATEGORYCODE  || data.SUBCATEGORY || "",
        tag:                data.TAG              || "",
        status:             data.STATUS           || "Draft",
        addToQuickCart:     !!data.ADDTOQUICKCART,
        allowTransfer:      !!data.ALLOWTRANSFER,
        allowLoyaltyAccrue: !!data.ALLOWLOYALTYACCRUE,
        allowLoyaltyRedeem: !!data.ALLOWLOYALTYREDEEM,
        packageConsistsOf:  data.PACKAGECONSISTSOF || "Services",
        neverExpires:       !!data.NEVEREXPIRES,
        expiryTenure:       data.EXPIRYTENURE      || "365",
        gracePeriod:        !!data.GRACEPERIOD,
        graceTenure:        data.GRACETENURE        || "",
        addField1:          data.ADDFIELD1          || "",
        addField2:          data.ADDFIELD2          || "",
        addField3:          data.ADDFIELD3          || "",
        addField4:          data.ADDFIELD4          || "",
        addField5:          data.ADDFIELD5          || "",
        items: (data.items||[]).map(i=>({ itemType:i.ITEMTYPE, itemCode:i.ITEMCODE, itemName:i.ITEMNAME, quantity:i.QUANTITY })),
        pricing: (data.pricing||[]).map(p=>({ centerCode:p.CENTERCODE, centerName:p.CENTERNAME||p.CENTERCODE, price:p.PRICE, taxIncluded:p.TAXINCLUDED||"No", taxPercent:p.TAXPERCENT||"", releasedToCentre:!!p.RELEASEDTOCENTRE })),
      });
      setEditCode(code); setActiveTab(0); setErrors({}); setView("form");
    } catch { showToast("Failed to load package","error"); }
  };

  // Tab index each error belongs to — so we can jump to the right tab
  const ERROR_TAB = {
    packageCode:    0, packageName: 0, category: 0, subCategory: 0,
    items:          1, itemQty:     1,
    pricing:        2,
    expiryType:     3, expiryTenure:3, graceTenure: 3,
  };

  const validate = (isSubmit) => {
    const e = {};

    // ── Tab 0: General ────────────────────────────────────────────────────
    if (!form.packageCode?.trim())
      e.packageCode = "Package Code is required.";
    else if (!/^[A-Za-z0-9_\-]+$/.test(form.packageCode.trim()))
      e.packageCode = "Package Code must be alphanumeric (letters, numbers, hyphens, underscores only).";

    if (!form.packageName?.trim())
      e.packageName = "Package Name is required.";

    if (!form.category?.trim())
      e.category = "Category is required.";

    if (isSubmit && !form.subCategory?.trim())
      e.subCategory = "Sub-Category is required before submitting.";

    // ── Tab 1: Combination ────────────────────────────────────────────────
    if (isSubmit && (!form.items || form.items.length === 0))
      e.items = "Please add at least one service or product to the package.";

    (form.items || []).forEach((item, i) => {
      const qty    = String(item.quantity || "").trim();
      const qtyNum = parseFloat(qty);
      if (!qty)
        e[`itemQty_${i}`] = `Line ${i+1} (${item.itemCode}): Quantity is required.`;
      else if (qty.includes("."))
        e[`itemQty_${i}`] = `Line ${i+1} (${item.itemCode}): Quantity must be a whole number — decimals not permitted.`;
      else if (!Number.isInteger(qtyNum) || qtyNum <= 0)
        e[`itemQty_${i}`] = `Line ${i+1} (${item.itemCode}): Quantity must be a positive whole number.`;
    });

    // ── Tab 2: Pricing ────────────────────────────────────────────────────
    if (isSubmit && Array.isArray(form.pricing)) {
      form.pricing.forEach((p, i) => {
        const centre = p.centerName || p.centerCode || `Row ${i+1}`;
        if (p.releasedToCentre) {
          if (p.price === "" || p.price === null || p.price === undefined || parseFloat(p.price) < 0)
            e[`pricing_price_${i}`] = `${centre}: Price is required and must be non-negative when Released to Centre.`;
        }
        if (p.taxIncluded === "No" && p.taxPercent !== "" && p.taxPercent !== null) {
          const tax = parseFloat(p.taxPercent);
          if (isNaN(tax) || tax < 0)
            e[`pricing_tax_${i}`] = `${centre}: Tax % must be a non-negative number.`;
        }
        if (p.taxIncluded === "Yes" && parseFloat(p.taxPercent) !== 0)
          e[`pricing_taxincl_${i}`] = `${centre}: Tax % must be 0 when Tax Included is Yes.`;
      });
    }

    // ── Tab 3: Validity ───────────────────────────────────────────────────
    if (isSubmit && !form.neverExpires) {
      if (!form.expiryTenure || parseInt(form.expiryTenure) <= 0)
        e.expiryTenure = "Expiry Tenure (Days) is required and must be a positive number.";
      else if (String(form.expiryTenure).includes("."))
        e.expiryTenure = "Expiry Tenure must be a whole number of days.";
    }
    if (form.gracePeriod && (!form.graceTenure || parseInt(form.graceTenure) <= 0))
      e.graceTenure = "Grace Tenure (Days) is required when Grace Period is enabled.";

    setErrors(e);

    // Jump to the first tab that has an error
    if (Object.keys(e).length > 0) {
      const firstKey    = Object.keys(e)[0];
      const baseKey     = firstKey.replace(/_\d+$/, "").replace(/_(price|tax|taxincl)_\d+$/, "");
      const tabForError = ERROR_TAB[baseKey] ?? (firstKey.startsWith("pricing") ? 2 : firstKey.startsWith("item") ? 1 : 0);
      setActiveTab(tabForError);
    }

    return Object.keys(e).length === 0;
  };

  // Parse pipe-separated API error into field errors where possible
  const parseApiError = (msg) => {
    if (!msg) return;
    const parts = msg.split(" | ");
    const e     = {};
    parts.forEach(part => {
      if      (part.includes("Package Code"))    e.packageCode  = part;
      else if (part.includes("Package Name"))    e.packageName  = part;
      else if (part.includes("Category") && !part.includes("Sub")) e.category = part;
      else if (part.includes("Sub-Category"))    e.subCategory  = part;
      else if (part.includes("Expiry Tenure"))   e.expiryTenure = part;
      else if (part.includes("Grace Tenure"))    e.graceTenure  = part;
      else if (part.includes("Quick Cart"))      e.packageCode  = part; // show near top
    });
    if (Object.keys(e).length > 0) {
      setErrors(prev => ({ ...prev, ...e }));
      const firstKey    = Object.keys(e)[0];
      const tabForError = ERROR_TAB[firstKey] ?? 0;
      setActiveTab(tabForError);
    }
    showToast(parts[0], "error"); // show first error in toast too
  };

  const handleSave = async (action) => {
    const isSubmit = action === "submit";
    setSaveAttempted(true);
    setErrors({});
    if (!validate(isSubmit)) return;
    setSaving(action);
    try {
      const u       = getUser();
      const payload = {
        ...form,
        action,
        legalEntityCode: u.legalEntityCode || u.centerCode || "",
        createdBy:       u.userId || u.employeeCode || "",
        modifiedBy:      u.userId || u.employeeCode || "",
      };
      const url    = editCode ? `${API_BASE_URL}/api/Package/${editCode}` : `${API_BASE_URL}/api/Package/Create`;
      const result = editCode ? await authPut(url, payload) : await authPost(url, payload);
      if (result?.success === false) {
        parseApiError(result.message || "Save failed");
        return;
      }
      showToast(result?.message || (isSubmit ? "Package submitted and released!" : "Package saved as draft!"));
      setFormDirty(false);
      setView("list");
    } catch(err) {
      parseApiError(err.message || "An unexpected error occurred.");
    } finally { setSaving(false); }
  };

  const statusBadge = (s) => {
    const cfg = { Active:{bg:"#e6f4ef",color:"#2e7d5e"}, Draft:{bg:"#fef3c7",color:"#92400e"}, Inactive:{bg:"#f1f5f9",color:"#475569"} }[s] || {bg:"#f1f5f9",color:"#475569"};
    return <span style={{ background:cfg.bg, color:cfg.color, borderRadius:999, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{s}</span>;
  };

  // ── List View ────────────────────────────────────────────────────────────────
  if (view === "list") return (
    <div style={{ padding:28, fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#0f172a" }}>
      {toast && <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13, fontWeight:600, background:toast.type==="success"?"#e6f4ef":"#fdf3f3", border:`1px solid ${toast.type==="success"?"#b3d9cc":"#f0c4c0"}`, color:toast.type==="success"?"#2e7d5e":"#b91c1c" }}>{toast.msg}</div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1e293b" }}>Package Master</h2>
        {canCreate && <button onClick={openCreate} style={{ height:40, padding:"0 20px", background:"#334b71", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Create New Package</button>}
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:18 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by code or name…"
          style={{ flex:1, height:40, padding:"0 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:13 }} />
        <select value={status} onChange={e=>setStatus(e.target.value)}
          style={{ height:40, padding:"0 12px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:13, background:"#fff" }}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Draft">Draft</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
      {loading ? <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading…</div> : (
        <div style={{ borderRadius:14, overflow:"hidden", border:"1px solid #e2e8f0", background:"#fff" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#f1f5f9" }}>
              {[
                { label:"Package Code", field:"PACKAGECODE" },
                { label:"Package Name", field:"PACKAGENAME" },
                { label:"Category",     field:"CATEGORY" },
                { label:"Sub-Category", field:"SUBCATEGORY" },
                { label:"Centres",      field:"CENTRES" },
                { label:"Quick Cart",   field:"ADDTOQUICKCART" },
                { label:"Status",       field:"STATUS" },
                { label:"Actions",      field:null },
              ].map(col=>(
                <th key={col.label} onClick={()=>toggleSort(col.field)}
                  style={{ padding:"11px 14px", textAlign:"left", fontWeight:700, fontSize:11, color:"#475569", borderBottom:"1px solid #e2e8f0", textTransform:"uppercase", letterSpacing:".06em", cursor: col.field?"pointer":"default", userSelect:"none", whiteSpace:"nowrap" }}>
                  {col.label}
                  {col.field && (
                    <span style={{ marginLeft:6, color: sortField===col.field?"#334b71":"#cbd5e1", fontSize:10 }}>
                      {sortField===col.field ? (sortDir==="asc" ? "▲" : "▼") : "↕"}
                    </span>
                  )}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {sortedPackages.length===0 ? (
                <tr><td colSpan={8} style={{ textAlign:"center", padding:40, color:"#94a3b8", fontSize:13 }}>No packages found.</td></tr>
              ) : pagedPackages.map((pkg,i)=>(
                <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8faff"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td style={{ padding:"12px 14px", fontWeight:700, color:"#334b71" }}>{pkg.PACKAGECODE}</td>
                  <td style={{ padding:"12px 14px" }}>{pkg.PACKAGENAME}</td>
                  <td style={{ padding:"12px 14px", color:"#64748b" }}>{pkg.CATEGORY}</td>
                  <td style={{ padding:"12px 14px", color:"#64748b" }}>{pkg.SUBCATEGORY}</td>
                  <td style={{ padding:"12px 14px", color:"#64748b", fontSize:12 }}>{pkg.CENTRES||"—"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ background: pkg.ADDTOQUICKCART?"#e6f4ef":"#f1f5f9", color: pkg.ADDTOQUICKCART?"#2e7d5e":"#94a3b8", borderRadius:999, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                      {pkg.ADDTOQUICKCART ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>{statusBadge(pkg.STATUS)}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <button onClick={()=>openEdit(pkg.PACKAGECODE)} style={{ padding:"4px 12px", border:"1px solid #334b71", borderRadius:6, background:"#fff", color:"#334b71", fontWeight:700, cursor:"pointer", fontSize:12 }}>{canEdit ? "Edit" : "View"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && sortedPackages.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#64748b" }}>
            <span>Rows per page:</span>
            <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}
              style={{ height:32, padding:"0 8px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, background:"#fff" }}>
              {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ marginLeft:8 }}>
              {(safePage-1)*pageSize + 1}–{Math.min(safePage*pageSize, sortedPackages.length)} of {sortedPackages.length}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={safePage<=1}
              style={{ height:32, padding:"0 12px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff", color: safePage<=1?"#cbd5e1":"#334b71", fontWeight:700, fontSize:13, cursor: safePage<=1?"not-allowed":"pointer" }}>
              ‹ Prev
            </button>
            <span style={{ fontSize:13, color:"#475569", fontWeight:600 }}>Page {safePage} of {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages, p+1))} disabled={safePage>=totalPages}
              style={{ height:32, padding:"0 12px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff", color: safePage>=totalPages?"#cbd5e1":"#334b71", fontWeight:700, fontSize:13, cursor: safePage>=totalPages?"not-allowed":"pointer" }}>
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Form View ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:28, fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#0f172a", maxWidth:'100%' }}>
      {toast && <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13, fontWeight:600, background:toast.type==="success"?"#e6f4ef":"#fdf3f3", border:`1px solid ${toast.type==="success"?"#b3d9cc":"#f0c4c0"}`, color:toast.type==="success"?"#2e7d5e":"#b91c1c" }}>{toast.msg}</div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:"#1e293b" }}>
            {editCode ? `Edit Package — ${form.packageName?.trim()}` : "Create New Package"}
          </h2>
          <button onClick={()=>setView("list")} style={{ background:"none", border:"none", color:"#334b71", cursor:"pointer", fontSize:13, fontWeight:600, padding:0 }}>
            ← Back to List
          </button>
        </div>
        {/* Save + Submit buttons */}
        <div style={{ display:"flex", gap:10 }}>
          {canEdit && (<>
          <button onClick={()=>handleSave("save")} disabled={!!saving}
            style={{ height:40, padding:"0 20px", background:"#fff", color:"#334b71", border:"1.5px solid #334b71", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", opacity:saving?0.7:1 }}>
            {saving==="save" ? "Saving…" : "Save (Draft)"}
          </button>
          <button onClick={()=>handleSave("submit")} disabled={!!saving}
            style={{ height:40, padding:"0 20px", background:"#334b71", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", opacity:saving?0.7:1 }}>
            {saving==="submit" ? "Submitting…" : "Submit & Release"}
          </button>
          </>)}
        </div>
      </div>

      {/* Status banner */}
      {form.status && (
        <div style={{ marginBottom:16, padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600,
          background: form.status==="Active"?"#e6f4ef" : form.status==="Draft"?"#fef3c7" : "#f1f5f9",
          color: form.status==="Active"?"#2e7d5e" : form.status==="Draft"?"#92400e" : "#475569" }}>
          Status: {form.status} {form.status==="Draft" ? "— Click 'Submit & Release' to make available at centres." : ""}
        </div>
      )}

      {/* Validation summary banner */}
      {saveAttempted && Object.keys(errors).length > 0 && (
        <div style={{ marginBottom:16, padding:"12px 16px", background:"#fdf3f3", border:"1px solid #f0c4c0", borderRadius:10 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#b91c1c", marginBottom:6 }}>
            ⚠ Please fix the following before {Object.keys(errors).length === 1 ? "saving" : `saving (${Object.keys(errors).length} issues)`}:
          </div>
          <ul style={{ margin:0, paddingLeft:18, fontSize:12, color:"#b91c1c" }}>
            {Object.values(errors).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Package name + code shown above the tabs */}
      <div style={{ display:"flex", alignItems:"baseline", gap:12, flexWrap:"wrap", marginBottom:16 }}>
        <span style={{ fontSize:18, fontWeight:800, color:"#1e293b" }}>
          {form.packageName?.trim() || (editCode ? "Package" : "New Package")}
        </span>
        {form.packageCode?.trim() && (
          <span style={{ fontSize:12.5, fontWeight:700, color:"#334b71", background:"#eef2f8", padding:"3px 10px", borderRadius:999 }}>
            {form.packageCode}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", borderBottom:"2px solid #e2e8f0", marginBottom:24 }}>
        {TABS.map((t,i)=>{
          const tabHasError = saveAttempted && Object.keys(errors).some(k => {
            const tabMap = {0:["packageCode","packageName","category","subCategory"], 1:["items","itemQty"], 2:["pricing"], 3:["expiryTenure","expiryType","graceTenure"]};
            return (tabMap[i]||[]).some(prefix => k.startsWith(prefix));
          });
          return (
            <button key={t} onClick={()=>setActiveTab(i)}
              style={{ padding:"10px 20px", border:"none", background:"none", fontWeight:700, fontSize:13, cursor:"pointer", position:"relative",
                color: activeTab===i?"#334b71":"#94a3b8",
                borderBottom: activeTab===i?"2px solid #334b71":"2px solid transparent", marginBottom:-2 }}>
              {t}
              {tabHasError && <span style={{ position:"absolute", top:8, right:6, width:7, height:7, borderRadius:"50%", background:"#b91c1c" }} />}
            </button>
          );
        })}
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", padding:24, minHeight:300 }}>
        {activeTab===0 && <GeneralTab     form={form} setForm={p => { setFormDirty(true); setForm(p); }} errors={saveAttempted ? errors : {}} isEdit={!!editCode} setErrors={setErrors} isAdmin={canEdit} />}
        {activeTab===1 && <CombinationTab form={form} setForm={setForm} errors={saveAttempted ? errors : {}} setErrors={setErrors} isAdmin={canEdit} />}
        {activeTab===2 && <PricingTab     form={form} setForm={setForm} errors={saveAttempted ? errors : {}} />}
        {activeTab===3 && <ValidityTab    form={form} setForm={setForm} errors={saveAttempted ? errors : {}} />}
        {activeTab===4 && <MiscTab        form={form} setForm={setForm} />}
      </div>

      <div style={{ display:"flex", gap:12, marginTop:20 }}>
        {canEdit && (<>
        <button onClick={()=>handleSave("save")} disabled={!!saving}
          style={{ height:40, padding:"0 20px", background:"#fff", color:"#334b71", border:"1.5px solid #334b71", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
          {saving==="save" ? "Saving…" : "Save (Draft)"}
        </button>
        <button onClick={()=>handleSave("submit")} disabled={!!saving}
          style={{ height:40, padding:"0 20px", background:"#334b71", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
          {saving==="submit" ? "Submitting…" : "Submit & Release"}
        </button>
        </>)}
        <button onClick={()=>setView("list")} style={{ height:40, padding:"0 18px", background:"#fff", color:"#64748b", border:"1.5px solid #e2e8f0", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PackageMaster;