import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";
import { makeRequireAccess, checkAccess } from "../Settings/masterAccess";

/* ============================================================================
   PRODUCT MASTER (Phase 2)
   Single-file list + 5-tab creation/edit form, built on the Package Master
   shell. Tabs: General · Sales · Purchase · Inventory · Miscellaneous.
   Access: entity-level Admin can create/edit; centre-level is view-only.
============================================================================ */

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const authGet  = async (url) => { const r = await fetch(url, { headers:{ Authorization:`Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => { const r = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}`}, body:JSON.stringify(body) }); return r.json(); };
const authPut  = async (url, body) => { const r = await fetch(url, { method:"PUT",  headers:{"Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}`}, body:JSON.stringify(body) }); return r.json(); };

const TABS          = ["General", "Sales", "Purchase", "Inventory", "Miscellaneous"];
const PRODUCT_TYPES = ["Consumable", "Retail", "Sample"];
const TRACKING_AT   = ["None", "Batch", "Serial"];
const INV_CHECK     = [
  { value:"Bypass",  label:"Allow Inventory Bypassing",     hint:"Inventory is not tracked; billing is always allowed." },
  { value:"Warning", label:"Warning Message on No Inventory", hint:"Billing is allowed, but a warning shows when stock is insufficient." },
  { value:"Block",   label:"Block Sales on No Inventory",    hint:"Billing is stopped when stock is insufficient at the selling centre." },
];

/* ── EAN-13 helpers (client-side format/checksum + preview encoder) ─────────── */
const ean13CheckDigit = (f) => { let s=0; for (let i=0;i<12;i++){ const d=+f[i]; s+=(i%2===0)?d:d*3; } return (10-(s%10))%10; };
const isValidEan13    = (c) => /^\d{13}$/.test(String(c||"")) && ean13CheckDigit(String(c).slice(0,12)) === +String(c)[12];

const EAN = {
  L:{0:"0001101",1:"0011001",2:"0010011",3:"0111101",4:"0100011",5:"0110001",6:"0101111",7:"0111011",8:"0110111",9:"0001011"},
  G:{0:"0100111",1:"0110011",2:"0011011",3:"0100001",4:"0011101",5:"0111001",6:"0000101",7:"0010001",8:"0001001",9:"0010111"},
  R:{0:"1110010",1:"1100110",2:"1101100",3:"1000010",4:"1011100",5:"1001110",6:"1010000",7:"1000100",8:"1001000",9:"1110100"},
  P:{0:"LLLLLL",1:"LLGLGG",2:"LLGGLG",3:"LLGGGL",4:"LGLLGG",5:"LGGLLG",6:"LGGGLL",7:"LGLGLG",8:"LGLGGL",9:"LGGLGL"},
};
const encodeEan13 = (code) => {
  if (!/^\d{13}$/.test(code)) return null;
  const first=+code[0], left=code.slice(1,7), right=code.slice(7,13), par=EAN.P[first];
  let bits="101";
  for (let i=0;i<6;i++) bits += EAN[par[i]][+left[i]];
  bits+="01010";
  for (let i=0;i<6;i++) bits += EAN.R[+right[i]];
  bits+="101";
  return bits; // 95 modules
};
const BarcodePreview = ({ code }) => {
  const bits = isValidEan13(code) ? encodeEan13(code) : null;
  if (!bits) return null;
  const mod=2, h=48, quiet=6*mod, w=bits.length*mod + quiet*2;
  return (
    <div style={{ marginTop:8, display:"inline-block", background:"#fff", padding:"8px 10px 4px", border:"1px solid #e2e8f0", borderRadius:8 }}>
      <svg width={w} height={h+16} role="img" aria-label={`Barcode ${code}`}>
        <rect x="0" y="0" width={w} height={h+16} fill="#fff" />
        {bits.split("").map((b,i)=> b==="1"
          ? <rect key={i} x={quiet + i*mod} y="2" width={mod} height={h} fill="#111" />
          : null)}
        <text x={w/2} y={h+13} textAnchor="middle" fontSize="11" fontFamily="monospace" fill="#334b71" letterSpacing="2">{code}</text>
      </svg>
    </div>
  );
};

/* ── Shared components (identical to Package Master shell) ──────────────────── */
const Field = ({ label, required, error, children }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:"block", fontWeight:600, fontSize:13, color:"#334b71", marginBottom:4 }}>
      {label}{required && <span style={{ color:"#b91c1c" }}> *</span>}
    </label>
    {children}
    {error && <div style={{ color:"#b91c1c", fontSize:12, marginTop:3 }}>⚠ {error}</div>}
  </div>
);
const Input = ({ value, onChange, placeholder, type="text", readOnly, disabled, maxLength, style={} }) => (
  <input type={type} value={value ?? ""} onChange={onChange} placeholder={placeholder}
    readOnly={readOnly} disabled={disabled} maxLength={maxLength}
    style={{ width:"100%", height:38, padding:"0 10px", border:"1.5px solid #e2e8f0", borderRadius:8,
      fontSize:13, boxSizing:"border-box",
      background:(readOnly||disabled)?"#f1f5f9":"#fff",
      color: disabled?"#94a3b8":"#1e293b", ...style }} />
);
const Select = ({ value, onChange, options, placeholder, disabled }) => (
  <select value={value ?? ""} onChange={onChange} disabled={disabled}
    style={{ width:"100%", height:38, padding:"0 10px", border:"1.5px solid #e2e8f0", borderRadius:8,
      fontSize:13, background: disabled?"#f1f5f9":"#fff", color: disabled?"#94a3b8":"#1e293b" }}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
  </select>
);
const Toggle = ({ value, onChange, label, disabled }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, opacity: disabled?0.5:1 }}>
    <div onClick={disabled ? undefined : onChange}
      style={{ width:44, height:24, borderRadius:12, background: value?"#334b71":"#e2e8f0",
        position:"relative", cursor: disabled?"not-allowed":"pointer", transition:"background .2s" }}>
      <div style={{ position:"absolute", top:3, left: value?23:3, width:18, height:18,
        borderRadius:9, background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
    <span style={{ fontSize:13, color:"#334b71" }}>{label}: <strong>{value ? "Yes" : "No"}</strong></span>
  </div>
);

/* ── TAB 1: GENERAL ────────────────────────────────────────────────────────── */
const GeneralTab = ({ form, setForm, errors, isEdit, setErrors, barcodeMandatory }) => {
  const [categories,    setCategories]    = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [catLoading,    setCatLoading]    = useState(false);
  const [subLoading,    setSubLoading]    = useState(false);
  const [bcState,       setBcState]       = useState({ checking:false, dupName:null }); // live duplicate state
  const bcTimer = useRef(null);

  useEffect(() => {
    setCatLoading(true);
    authGet(`${API_BASE_URL}/api/Product/Categories`)
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false));
  }, []);

  useEffect(() => {
    if (!form.categoryCode) { setSubCategories([]); return; }
    setSubLoading(true);
    authGet(`${API_BASE_URL}/api/Product/SubCategories/${encodeURIComponent(form.categoryCode)}`)
      .then(d => setSubCategories(Array.isArray(d) ? d : []))
      .catch(() => setSubCategories([]))
      .finally(() => setSubLoading(false));
  }, [form.categoryCode]);

  const handleCategoryChange = (e) => {
    const sel = categories.find(c => c.categoryCode === e.target.value);
    setForm(p => ({ ...p, categoryCode:e.target.value, category: sel?.categoryName || e.target.value, subCategoryCode:"", subCategory:"" }));
    setErrors(p => ({ ...p, category:undefined, subCategory:undefined }));
  };
  const handleSubCategoryChange = (e) => {
    const sel = subCategories.find(s => s.subCategoryCode === e.target.value);
    setForm(p => ({ ...p, subCategoryCode:e.target.value, subCategory: sel?.subCategoryName || e.target.value }));
    setErrors(p => ({ ...p, subCategory:undefined }));
  };

  // Barcode: digits-only, live checksum + debounced duplicate check
  const onBarcode = (raw) => {
    const val = raw.replace(/\D/g, "").slice(0, 13);
    setForm(p => ({ ...p, barcode: val }));
    setErrors(p => ({ ...p, barcode: undefined }));
    setBcState({ checking:false, dupName:null });
    if (bcTimer.current) clearTimeout(bcTimer.current);
    if (val.length === 13 && isValidEan13(val)) {
      setBcState({ checking:true, dupName:null });
      bcTimer.current = setTimeout(async () => {
        try {
          const r = await authGet(`${API_BASE_URL}/api/Product/CheckBarcode/${val}?productCode=${encodeURIComponent(form.productCode||"")}`);
          setBcState({ checking:false, dupName: r.duplicate ? (r.ownerName || r.ownerCode) : null });
        } catch { setBcState({ checking:false, dupName:null }); }
      }, 450);
    }
  };
  const generateBarcode = async () => {
    try {
      const r = await authGet(`${API_BASE_URL}/api/Product/GenerateBarcode`);
      if (r.barcode) { setForm(p => ({ ...p, barcode:r.barcode })); setBcState({ checking:false, dupName:null }); setErrors(p=>({ ...p, barcode:undefined })); }
    } catch {}
  };

  const bcHasLen  = (form.barcode || "").length > 0;
  const bcBadSum  = bcHasLen && (form.barcode.length !== 13 || !isValidEan13(form.barcode));
  const bcDupMsg  = bcState.dupName ? `This barcode is already assigned to ${bcState.dupName}.` : "";

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
      <Field label="Product Code" required error={errors.productCode}>
        <Input value={form.productCode}
          onChange={e => { setForm(p=>({...p,productCode:e.target.value})); setErrors(p=>({...p,productCode:undefined})); }}
          placeholder="e.g. PRD-1001" readOnly={isEdit} maxLength={50} />
      </Field>
      <Field label="Product Name" required error={errors.productName}>
        <Input value={form.productName}
          onChange={e => { setForm(p=>({...p,productName:e.target.value})); setErrors(p=>({...p,productName:undefined})); }}
          placeholder="Product name" maxLength={200} />
      </Field>

      <div style={{ gridColumn:"1 / span 2" }}>
        <Field label="Product Description">
          <textarea value={form.productDesc || ""} onChange={e=>setForm(p=>({...p,productDesc:e.target.value}))}
            placeholder="Free-text description" rows={2}
            style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box", resize:"vertical", fontFamily:"inherit" }} />
        </Field>
      </div>

      <Field label="Category" required error={errors.category}>
        <select value={form.categoryCode||""} onChange={handleCategoryChange}
          style={{ width:"100%", height:38, padding:"0 10px", border:`1.5px solid ${errors.category?"#b91c1c":"#e2e8f0"}`, borderRadius:8, fontSize:13, background:"#fff" }}>
          <option value="">{catLoading ? "Loading…" : "Select category…"}</option>
          {categories.map(c => <option key={c.categoryCode} value={c.categoryCode}>{c.categoryName}</option>)}
        </select>
      </Field>

      <Field label="Sub-Category" required error={errors.subCategory}>
        <select value={form.subCategoryCode||""} onChange={handleSubCategoryChange} disabled={!form.categoryCode}
          style={{ width:"100%", height:38, padding:"0 10px", border:`1.5px solid ${errors.subCategory?"#b91c1c":"#e2e8f0"}`, borderRadius:8, fontSize:13,
            background:!form.categoryCode?"#f1f5f9":"#fff", color:!form.categoryCode?"#94a3b8":"#1e293b" }}>
          <option value="">
            {!form.categoryCode ? "Select a category first" : subLoading ? "Loading…" : subCategories.length===0 ? "No sub-categories found" : "Select sub-category…"}
          </option>
          {subCategories.map(s => <option key={s.subCategoryCode} value={s.subCategoryCode}>{s.subCategoryName}</option>)}
        </select>
      </Field>

      {/* Barcode */}
      <div style={{ gridColumn:"1 / span 2" }}>
        <Field label="Barcode (EAN-13)" required={barcodeMandatory}
          error={errors.barcode || (bcBadSum ? "Invalid barcode — checksum mismatch." : "") || bcDupMsg}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ flex:"0 0 260px" }}>
              <Input value={form.barcode} onChange={e=>onBarcode(e.target.value)}
                placeholder="Enter or scan a valid 13-digit EAN-13 barcode" />
            </div>
            <button type="button" onClick={generateBarcode}
              style={{ height:38, padding:"0 14px", background:"#fff", color:"#334b71", border:"1.5px solid #334b71", borderRadius:8, fontWeight:700, fontSize:12.5, cursor:"pointer" }}>
              Generate Barcode
            </button>
            {bcState.checking && <span style={{ fontSize:12, color:"#64748b" }}>Checking…</span>}
            {!bcBadSum && !bcState.checking && bcHasLen && form.barcode.length===13 && !bcState.dupName &&
              <span style={{ fontSize:12, color:"#2e7d5e", fontWeight:600 }}>✓ Valid</span>}
          </div>
          <div style={{ fontSize:11.5, color:"#94a3b8", marginTop:4 }}>
            Enter or scan a valid 13-digit EAN-13 barcode. Use “Generate Barcode” for internal / in-store items without a manufacturer code.
          </div>
          <BarcodePreview code={form.barcode} />
        </Field>
      </div>

      {/* Product Type — single-select, exactly one required */}
      <div style={{ gridColumn:"1 / span 2" }}>
        <Field label="Product Type" required error={errors.productType}>
          <div style={{ display:"flex", gap:20, marginTop:4 }}>
            {PRODUCT_TYPES.map(t => (
              <label key={t} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, fontWeight:600, color:"#334b71" }}>
                <input type="radio" name="productType" value={t} checked={form.productType===t}
                  onChange={()=>{ setForm(p=>({...p,productType:t})); setErrors(p=>({...p,productType:undefined})); }}
                  style={{ width:16, height:16 }} />
                {t}
              </label>
            ))}
          </div>
          <div style={{ fontSize:11.5, color:"#94a3b8", marginTop:6 }}>
            Only <strong>Retail</strong> products appear in the Invoice product dropdown. Consumable and Sample are hidden from sale.
          </div>
        </Field>
      </div>
    </div>
  );
};

/* ── TAB 2: SALES (product-level + per-centre grid) ────────────────────────── */
const SalesTab = ({ form, setForm, errors = {}, uomOptions, membershipActive }) => {
  const updateRow = (idx, field, val) => {
    setForm(p => {
      const pricing = [...(p.pricing||[])];
      pricing[idx] = { ...pricing[idx], [field]: val };
      if (field === "taxIncluded" && val === "Yes") pricing[idx].taxPercent = "0";
      return { ...p, pricing };
    });
  };
  const updateMember = (idx, field, val) => {
    const other = field === "memberPrice" ? "memberDiscount" : "memberPrice";
    setForm(p => {
      const pricing = [...(p.pricing||[])];
      pricing[idx] = { ...pricing[idx], [field]: val, [other]: val !== "" ? "" : pricing[idx][other] };
      return { ...p, pricing };
    });
  };

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px", marginBottom:8 }}>
        <Field label="Sale UOM">
          <Select value={form.saleUOM} onChange={e=>setForm(p=>({...p,saleUOM:e.target.value}))}
            options={uomOptions} placeholder="Select UOM…" />
        </Field>
        <div style={{ paddingTop:22 }}>
          <Toggle value={form.mapSalesPerson} label="Mapping Sales Person / Practitioner"
            onChange={()=>setForm(p=>({...p,mapSalesPerson:!p.mapSalesPerson}))} />
          <div style={{ fontSize:11.5, color:"#94a3b8" }}>
            When Yes, the system prompts for a sales person / practitioner at billing. Default is Yes.
          </div>
        </div>
      </div>

      <div style={{ fontWeight:700, fontSize:13, color:"#334b71", margin:"12px 0 8px" }}>Per-Centre Pricing</div>
      {!form.pricing?.length ? (
        <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
          No centres configured. Centres are auto-populated from Legal Entity configuration.
        </div>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:980 }}>
            <thead>
              <tr style={{ background:"#f1f5f9" }}>
                {["Centre","MRP","Selling Price","Tax Incl.","Tax %","Release","Block Sale","Member Price","Member Disc. %"].map(h=>(
                  <th key={h} style={{ padding:"10px 10px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(form.pricing||[]).map((row,idx)=>{
                const enabled = membershipActive && !!row.releasedToCentre;
                const hasMp = row.memberPrice !== "" && row.memberPrice != null;
                const hasMd = row.memberDiscount !== "" && row.memberDiscount != null;
                return (
                  <tr key={idx} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"8px 10px", fontWeight:700, color:"#334b71", whiteSpace:"nowrap" }}>{row.centerName || row.centerCode}</td>
                    <td style={{ padding:"8px 10px" }}><Input type="number" value={row.mrp}   onChange={e=>updateRow(idx,"mrp",e.target.value)}   placeholder="0.00" style={{ width:90 }} /></td>
                    <td style={{ padding:"8px 10px" }}><Input type="number" value={row.price} onChange={e=>updateRow(idx,"price",e.target.value)} placeholder="0.00" style={{ width:100 }} /></td>
                    <td style={{ padding:"8px 10px" }}><Select value={row.taxIncluded||"No"} onChange={e=>updateRow(idx,"taxIncluded",e.target.value)} options={["Yes","No"]} /></td>
                    <td style={{ padding:"8px 10px" }}><Input type="number" value={row.taxPercent} onChange={e=>updateRow(idx,"taxPercent",e.target.value)} placeholder="0" disabled={row.taxIncluded==="Yes"} style={{ width:70 }} /></td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>
                      <input type="checkbox" checked={!!row.releasedToCentre} onChange={e=>updateRow(idx,"releasedToCentre",e.target.checked)} style={{ width:18, height:18, cursor:"pointer" }} />
                    </td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>
                      <input type="checkbox" checked={!!row.blockedForSale} onChange={e=>updateRow(idx,"blockedForSale",e.target.checked)} style={{ width:18, height:18, cursor:"pointer" }} />
                    </td>
                    <td style={{ padding:"8px 10px" }}>
                      <Input type="number" value={hasMd?"NA":row.memberPrice} onChange={e=>updateMember(idx,"memberPrice",e.target.value)} placeholder={enabled?"0.00":"—"} disabled={!enabled||hasMd} style={{ width:100 }} />
                    </td>
                    <td style={{ padding:"8px 10px" }}>
                      <Input type="number" value={hasMp?"NA":row.memberDiscount} onChange={e=>updateMember(idx,"memberDiscount",e.target.value)} placeholder={enabled?"0":"—"} disabled={!enabled||hasMp} style={{ width:70 }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {errors.pricing && (
            <div style={{ color:"#b91c1c", fontSize:12.5, marginTop:8 }}>⚠ {errors.pricing}</div>
          )}
          <div style={{ marginTop:10, fontSize:12, color:"#94a3b8" }}>
            ⚠ A product is sellable at a centre only when “Release” is checked. “Block Sale” stops sale at that centre (invoice shows “This product is blocked for sale”).
            When Tax Included = Yes, Tax % is set to 0 and disabled. Member Price / Member Discount need the membership program active and the centre released; enter one or the other, not both.
          </div>
        </div>
      )}
    </div>
  );
};

/* ── TAB 3: PURCHASE ───────────────────────────────────────────────────────── */
const PurchaseTab = ({ form, setForm, uomOptions, errors = {} }) => {
  const [vendors, setVendors] = useState([]);
  useEffect(() => {
    authGet(`${API_BASE_URL}/api/Product/Vendors`)
      .then(d => setVendors(Array.isArray(d) ? d : []))
      .catch(() => setVendors([]));
  }, []);
  const handleVendor = (e) => {
    const v = vendors.find(x => x.vendorCode === e.target.value);
    setForm(p => ({ ...p, primaryVendorCode:e.target.value, primaryVendorName: v?.vendorName || "" }));
  };
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
      <Field label="Purchase UOM">
        <Select value={form.purchaseUOM} onChange={e=>setForm(p=>({...p,purchaseUOM:e.target.value}))} options={uomOptions} placeholder="Select UOM…" />
      </Field>
      <Field label="Primary Vendor">
        <select value={form.primaryVendorCode||""} onChange={handleVendor}
          style={{ width:"100%", height:38, padding:"0 10px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, background:"#fff" }}>
          <option value="">{vendors.length ? "Select vendor…" : "No vendors found"}</option>
          {vendors.map(v => <option key={v.vendorCode} value={v.vendorCode}>{v.vendorName}</option>)}
        </select>
      </Field>
      <Field label="Min Purchase Qty" error={errors.minPurchaseQty}>
        <Input type="number" value={form.minPurchaseQty} onChange={e=>{ setForm(p=>({...p,minPurchaseQty:e.target.value})); }} placeholder="e.g. 1" />
      </Field>
    </div>
  );
};

/* ── TAB 4: INVENTORY ──────────────────────────────────────────────────────── */
const InventoryTab = ({ form, setForm, uomOptions }) => (
  <div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
      <Field label="Inventory UOM">
        <Select value={form.inventoryUOM} onChange={e=>setForm(p=>({...p,inventoryUOM:e.target.value}))} options={uomOptions} placeholder="Select UOM…" />
      </Field>
    </div>

    <Field label="Inventory Tracking At">
      <div style={{ display:"flex", gap:20, marginTop:4 }}>
        {TRACKING_AT.map(t => (
          <label key={t} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, fontWeight:600, color:"#334b71" }}>
            <input type="radio" name="trackingAt" value={t} checked={(form.inventoryTrackingAt||"None")===t}
              onChange={()=>setForm(p=>({...p,inventoryTrackingAt:t}))} style={{ width:16, height:16 }} />
            {t === "None" ? "None" : `${t} No.`}
          </label>
        ))}
      </div>
    </Field>

    <Field label="Inventory Check on Sales">
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:4 }}>
        {INV_CHECK.map(o => (
          <label key={o.value} style={{ display:"flex", alignItems:"flex-start", gap:8, cursor:"pointer" }}>
            <input type="radio" name="invCheck" value={o.value} checked={(form.inventoryCheckOnSales||"Bypass")===o.value}
              onChange={()=>setForm(p=>({...p,inventoryCheckOnSales:o.value}))} style={{ width:16, height:16, marginTop:2 }} />
            <span>
              <span style={{ fontSize:13, fontWeight:600, color:"#334b71" }}>{o.label}</span>
              <span style={{ display:"block", fontSize:11.5, color:"#94a3b8" }}>{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </Field>

    <div style={{ marginTop:8, padding:"8px 12px", background:"#f1f5f9", borderRadius:8, fontSize:11.5, color:"#64748b" }}>
      Stock levels per warehouse (opening stock, adjustment, batch/serial capture) are managed in the Inventory phase.
    </div>
  </div>
);

/* ── TAB 5: MISCELLANEOUS ──────────────────────────────────────────────────── */
const MiscTab = ({ form, setForm }) => (
  <div>
    <p style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>
      Five custom fields for additional business-defined information. Labels are admin-configurable; values are searchable on the product list.
    </p>
    {[1,2,3,4,5].map(n=>(
      <Field key={n} label={`Custom Field ${n}`}>
        <Input value={form[`field${n}`]||""} onChange={e=>setForm(p=>({...p,[`field${n}`]:e.target.value}))} placeholder={`Custom Field ${n}`} maxLength={500} />
      </Field>
    ))}
  </div>
);

/* ── EMPTY FORM STATE ──────────────────────────────────────────────────────── */
const EMPTY = {
  productCode:"", productName:"", productDesc:"",
  categoryCode:"", category:"", subCategoryCode:"", subCategory:"",
  barcode:"", productType:"",
  saleUOM:"", mapSalesPerson:true,
  purchaseUOM:"", primaryVendorCode:"", primaryVendorName:"", minPurchaseQty:"",
  inventoryUOM:"", inventoryTrackingAt:"None", inventoryCheckOnSales:"Bypass",
  field1:"", field2:"", field3:"", field4:"", field5:"",
  status:"Draft", pricing:[],
};

const emptyPricingRow = (code, name) => ({
  centerCode: code || "", centerName: name || code || "",
  mrp:"", price:"", taxIncluded:"No", taxPercent:"", releasedToCentre:false, blockedForSale:false, memberPrice:"", memberDiscount:"",
});

/* ── MAIN COMPONENT ────────────────────────────────────────────────────────── */
const ProductMaster = () => {
  const { has: hasPerm, guard, notifyDenied } = usePermissions();
  const requireAccess = makeRequireAccess({ has: hasPerm, guard, notifyDenied });

  const [view,      setView]      = useState("list");
  const [products,  setProducts]  = useState([]);
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("");
  const [sortField, setSortField] = useState("PRODUCTNAME");
  const [sortDir,   setSortDir]   = useState("asc");
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
  const [uomOptions, setUomOptions] = useState([]);
  const [barcodeMandatory, setBarcodeMandatory] = useState(false);
  const [membershipActive, setMembershipActive] = useState(false);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4500); };

  // one-time reference data
  useEffect(() => {
    authGet(`${API_BASE_URL}/api/Product/UOM`).then(d => setUomOptions((Array.isArray(d)?d:[]).map(u => ({ value:u.uomCode, label:`${u.uomName} (${u.uomCode})` })))).catch(()=>setUomOptions([]));
    authGet(`${API_BASE_URL}/api/Product/Settings`).then(d => setBarcodeMandatory(!!d.barcodeMandatory)).catch(()=>setBarcodeMandatory(false));
    authGet(`${API_BASE_URL}/api/Membership/Program`).then(d => setMembershipActive(!!d.activate)).catch(()=>setMembershipActive(false));
  }, []);

  const loadList = async () => {
    setLoading(true);
    try {
      const u = getUser();
      const centerCode = u.centerCode || "";
      const data = await authGet(`${API_BASE_URL}/api/Product/List?search=${encodeURIComponent(search)}&status=${status}&centerCode=${encodeURIComponent(centerCode)}&releasedToCentre=1`);
      setProducts(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load products","error"); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ if(view==="list") loadList(); },[view,search,status]);
  useEffect(()=>{ setPage(1); }, [search, status, products, pageSize]);

  const toggleSort = (field) => {
    if (!field) return;
    if (sortField === field) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortField(field); setSortDir("asc"); }
  };
  const sortedProducts = (() => {
    const arr = [...products];
    arr.sort((a,b)=>{
      let av=a[sortField], bv=b[sortField];
      if (typeof av==="boolean"||typeof bv==="boolean"){ av=av?1:0; bv=bv?1:0; return sortDir==="asc"?av-bv:bv-av; }
      av=(av??"").toString().toLowerCase(); bv=(bv??"").toString().toLowerCase();
      const cmp=av.localeCompare(bv,undefined,{numeric:true}); return sortDir==="asc"?cmp:-cmp;
    });
    return arr;
  })();
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paged      = sortedProducts.slice((safePage-1)*pageSize, safePage*pageSize);

  // Load all branch centres (entity row excluded from pricing), same as Package
  const loadCentres = async () => {
    try {
      const hier = await authGet(`${API_BASE_URL}/api/Settings/Centre/Hierarchy`);
      const centres = (hier.zones || []).flatMap(z => (z.clinics||[]).map(c => ({ code:c.code, name:c.name })));
      if (centres.length) return centres;
    } catch {}
    const u = getUser();
    return [{ code:u.centerCode||"", name:u.centerName||u.centerCode||"" }];
  };

  const openCreate = async () => {
    setSaveAttempted(false);
    const centres = await loadCentres();
    setForm({ ...EMPTY, pricing: centres.map(c => emptyPricingRow(c.code, c.name)) });
    setEditCode(null); setActiveTab(0); setErrors({}); setView("form");
  };

  const openEdit = async (code) => {
    setSaveAttempted(false);
    try {
      const [data, centres] = await Promise.all([ authGet(`${API_BASE_URL}/api/Product/${encodeURIComponent(code)}`), loadCentres() ]);
      // Merge DB pricing over the full centre list so every centre shows a row
      const byCentre = {};
      (data.pricing||[]).forEach(r => { byCentre[r.CENTERCODE] = r; });
      const pricing = centres.map(c => {
        const r = byCentre[c.code];
        return r ? {
          centerCode:c.code, centerName:c.name || r.CENTERNAME || c.code,
          mrp: r.MRP!=null?String(r.MRP):"", price: r.PRICE!=null?String(r.PRICE):"",
          taxIncluded: r.TAXINCLUDED || "No", taxPercent: r.TAXPERCENT!=null?String(r.TAXPERCENT):"",
          releasedToCentre: !!r.RELEASEDTOCENTRE, blockedForSale: !!r.BLOCKEDFORSALE,
          memberPrice: r.MEMBERPRICE!=null?String(r.MEMBERPRICE):"", memberDiscount: r.MEMBERDISCOUNT!=null?String(r.MEMBERDISCOUNT):"",
        } : emptyPricingRow(c.code, c.name);
      });
      setForm({
        ...EMPTY,
        productCode: data.PRODUCTCODE, productName: data.PRODUCTNAME, productDesc: data.PRODUCTDESC || "",
        category: data.CATEGORY || "", categoryCode: data.CATEGORYCODE || data.CATEGORY || "",
        subCategory: data.SUBCATEGORY || "", subCategoryCode: data.SUBCATEGORYCODE || "",
        barcode: data.BARCODE || "", productType: data.PRODUCTTYPE || "",
        saleUOM: data.SALEUOM || "", mapSalesPerson: data.MAPSALESPERSON == null ? true : !!data.MAPSALESPERSON,
        purchaseUOM: data.PURCHASEUOM || "", primaryVendorCode: data.PRIMARYVENDORCODE || "", primaryVendorName: data.PRIMARYVENDORNAME || "",
        minPurchaseQty: data.MINPURCHASEQTY != null ? String(data.MINPURCHASEQTY) : "",
        inventoryUOM: data.INVENTORYUOM || "", inventoryTrackingAt: data.INVENTORYTRACKINGAT || "None", inventoryCheckOnSales: data.INVENTORYCHECKONSALES || "Bypass",
        field1: data.FIELD1||"", field2: data.FIELD2||"", field3: data.FIELD3||"", field4: data.FIELD4||"", field5: data.FIELD5||"",
        status: data.STATUS || "Draft", pricing,
      });
      setEditCode(code); setActiveTab(0); setErrors({}); setView("form");
    } catch { showToast("Failed to load product","error"); }
  };

  // Client-side validation (mirror of server validateProduct)
  const validate = (action) => {
    const e = {};
    const isSubmit = action === "submit";
    if (!editCode) {
      if (!form.productCode?.trim()) e.productCode = "Product Code is required.";
      else if (!/^[A-Za-z0-9_\-]+$/.test(form.productCode.trim())) e.productCode = "Alphanumeric only (letters, numbers, - and _).";
    }
    if (!form.productName?.trim()) e.productName = "Product Name is required.";
    else if (form.productName.length > 200) e.productName = "Product Name must be 200 characters or fewer.";
    if (!editCode && form.productCode && form.productCode.length > 50) e.productCode = "Product Code must be 50 characters or fewer.";
    if (!form.category?.trim())    e.category    = "Category is required.";
    if (isSubmit && !form.subCategory?.trim()) e.subCategory = "Sub-Category is required before submitting.";
    if (isSubmit && !PRODUCT_TYPES.includes(form.productType)) e.productType = "Select a Product Type (Consumable, Retail, or Sample).";
    // Custom fields — 500 char cap
    for (let n = 1; n <= 5; n++) {
      if ((form[`field${n}`] || "").length > 500) { e[`field${n}`] = `Custom Field ${n} must be 500 characters or fewer.`; }
    }
    if (form.barcode) {
      if (!isValidEan13(form.barcode)) e.barcode = "Invalid barcode — must be a valid 13-digit EAN-13.";
    } else if (isSubmit && barcodeMandatory) {
      e.barcode = "Barcode is required (configured as mandatory).";
    }
    if (isSubmit) {
      const has = (v) => v !== "" && v != null && v !== "NA";
      const num = (v) => parseFloat(v);
      const msgs = [];
      (form.pricing || []).forEach((p) => {
        const centre = p.centerName || p.centerCode || "Centre";
        if (p.releasedToCentre && !has(p.price)) msgs.push(`${centre}: Selling Price required (Release).`);
        if (has(p.price)  && (isNaN(num(p.price))  || num(p.price)  < 0)) msgs.push(`${centre}: Selling Price must be ≥ 0.`);
        if (has(p.mrp)    && (isNaN(num(p.mrp))    || num(p.mrp)    < 0)) msgs.push(`${centre}: MRP must be ≥ 0.`);
        if (has(p.memberPrice) && (isNaN(num(p.memberPrice)) || num(p.memberPrice) < 0)) msgs.push(`${centre}: Member Price must be ≥ 0.`);
        if (has(p.memberDiscount) && (isNaN(num(p.memberDiscount)) || num(p.memberDiscount) < 0 || num(p.memberDiscount) > 100)) msgs.push(`${centre}: Member Discount must be 0–100.`);
        if (has(p.taxPercent) && (isNaN(num(p.taxPercent)) || num(p.taxPercent) < 0 || num(p.taxPercent) > 100)) msgs.push(`${centre}: Tax % must be 0–100.`);
        if (has(p.memberPrice) && has(p.memberDiscount)) msgs.push(`${centre}: Set Member Price or Member Discount, not both.`);
      });
      if (msgs.length) e.pricing = msgs.join(" ");
    }
    // Min Purchase Qty — optional, but when provided must be a positive number
    if (form.minPurchaseQty !== "" && form.minPurchaseQty != null) {
      const q = Number(form.minPurchaseQty);
      if (!Number.isFinite(q)) e.minPurchaseQty = "Min Purchase Qty must be a numeric value.";
      else if (q <= 0)         e.minPurchaseQty = "Min Purchase Qty must be greater than 0.";
    }
    return e;
  };

  const handleSave = async (action) => {
    const gate = checkAccess({ has: hasPerm, code: editCode ? "MDM.PRODUCTS_EDIT" : "MDM.PRODUCTS_CREATE" });
    if (!gate.ok) { notifyDenied(gate.message); return; }
    setSaveAttempted(true);
    const e = validate(action);
    setErrors(e);
    if (Object.keys(e).length) { showToast("Please fix the highlighted fields.","error"); return; }
    setSaving(action);
    try {
      const payload = { ...form, action };
      const res = editCode
        ? await authPut(`${API_BASE_URL}/api/Product/${encodeURIComponent(editCode)}`, payload)
        : await authPost(`${API_BASE_URL}/api/Product/Create`, payload);
      if (res && (res.success === false || res.error)) {
        showToast(res.message || res.error || "Save failed.","error");
      } else {
        showToast(res.message || (action==="submit" ? "Product submitted and released." : "Product saved as draft."));
        setTimeout(()=>{ setView("list"); }, 500);
      }
    } catch { showToast("Save failed.","error"); }
    finally { setSaving(false); }
  };

  const th = (label, field) => (
    <th onClick={()=>toggleSort(field)}
      style={{ padding:"11px 14px", textAlign:"left", fontWeight:700, fontSize:11, color:"#475569", textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid #e2e8f0", cursor: field?"pointer":"default", whiteSpace:"nowrap" }}>
      {label}{field && sortField===field && <span style={{ color:"#334b71" }}> {sortDir==="asc"?"▲":"▼"}</span>}
    </th>
  );

  /* ── LIST VIEW ───────────────────────────────────────────────────────────── */
  if (view === "list") {
    return (
      <div style={{ padding:28, fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#0f172a" }}>
        {toast && <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13, fontWeight:600, background:toast.type==="success"?"#e6f4ef":"#fdf3f3", border:`1px solid ${toast.type==="success"?"#b3d9cc":"#f0c4c0"}`, color:toast.type==="success"?"#2e7d5e":"#b91c1c" }}>{toast.msg}</div>}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:12, color:"#9ca3af", marginBottom:6 }}>
              <a href="/dashboard" style={{ color:"#334B71", textDecoration:"none" }}>Dashboard</a>
              <span style={{ margin:"0 6px" }}>›</span><span>Masters</span>
              <span style={{ margin:"0 6px" }}>›</span><span>Products</span>
            </div>
            <h1 style={{ fontSize:24, fontWeight:800, color:"#1e293b", margin:"0 0 4px" }}>Products</h1>
            <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>{sortedProducts.length} products</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={loadList} style={{ padding:"9px 14px", background:"#f1f5f9", border:"1px solid #e7ecf4", borderRadius:8, cursor:"pointer", fontSize:13, color:"#334B71", fontWeight:600 }}>↻ Refresh</button>
            <button onClick={() => requireAccess("MDM.PRODUCTS_CREATE", openCreate)} style={{ padding:"10px 20px", background:"#334B71", color:"#fff", border:"none", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:14 }}>+ Create New Product</button>
          </div>
        </div>

        <div style={{ display:"flex", gap:"1rem", alignItems:"center", flexWrap:"wrap", marginBottom:14 }}>
          <input type="text" placeholder="Search products, code, barcode…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:6, minWidth:260, fontSize:14 }} />
          <select value={status} onChange={e=>setStatus(e.target.value)} style={{ padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:6, fontSize:14 }}>
            <option value="">All Status</option><option value="Active">Active</option><option value="Draft">Draft</option><option value="Inactive">Inactive</option>
          </select>
        </div>

        <div style={{ border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden", background:"#fff", boxShadow:"0 4px 20px rgba(15,23,42,.06)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#f1f5f9" }}>
              {th("Code","PRODUCTCODE")}{th("Name","PRODUCTNAME")}{th("Category","CATEGORY")}{th("Type","PRODUCTTYPE")}{th("Barcode","BARCODE")}{th("Price","SELLINGPRICE")}{th("Status","STATUS")}
              <th style={{ padding:"11px 14px", borderBottom:"1px solid #e2e8f0" }}></th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding:40, textAlign:"center", color:"#6b7280" }}>Loading products…</td></tr>
              ) : paged.length===0 ? (
                <tr><td colSpan={8} style={{ padding:50, textAlign:"center", color:"#94a3b8" }}>No products found.</td></tr>
              ) : paged.map((p,i)=>(
                <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                  <td style={{ padding:"11px 14px", fontWeight:700, color:"#334b71" }}>{p.PRODUCTCODE}</td>
                  <td style={{ padding:"11px 14px" }}>{p.PRODUCTNAME}</td>
                  <td style={{ padding:"11px 14px", color:"#64748b" }}>{p.CATEGORY || "—"}</td>
                  <td style={{ padding:"11px 14px" }}>
                    {p.PRODUCTTYPE ? <span style={{ background:"#eef2f7", color:"#334b71", borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600 }}>{p.PRODUCTTYPE}</span> : "—"}
                  </td>
                  <td style={{ padding:"11px 14px", fontFamily:"monospace", fontSize:12.5, color:"#64748b" }}>{p.BARCODE || "—"}</td>
                  <td style={{ padding:"11px 14px" }}>{Number(p.SELLINGPRICE||0).toLocaleString()}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600,
                      background: p.STATUS==="Active"?"#d1fae5":p.STATUS==="Draft"?"#fef3c7":"#f1f5f9",
                      color: p.STATUS==="Active"?"#065f46":p.STATUS==="Draft"?"#92400e":"#6b7280" }}>{p.STATUS||"—"}</span>
                  </td>
                  <td style={{ padding:"11px 14px", textAlign:"right" }}>
                    <button onClick={()=>requireAccess("MDM.PRODUCTS_EDIT", () => openEdit(p.PRODUCTCODE))} style={{ fontSize:13, padding:"5px 12px", borderRadius:6, border:"none", background:"#fef3c7", color:"#92400e", fontWeight:500, cursor:"pointer" }}>
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedProducts.length>0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#64748b" }}>
              <span>Rows per page:</span>
              <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} style={{ height:32, padding:"0 8px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, background:"#fff" }}>
                {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{ marginLeft:8 }}>{(safePage-1)*pageSize+1}–{Math.min(safePage*pageSize, sortedProducts.length)} of {sortedProducts.length}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage<=1} style={{ height:32, padding:"0 12px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff", color:safePage<=1?"#cbd5e1":"#334b71", fontWeight:700, fontSize:13, cursor:safePage<=1?"not-allowed":"pointer" }}>‹ Prev</button>
              <span style={{ fontSize:13, color:"#475569", fontWeight:600 }}>Page {safePage} of {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage>=totalPages} style={{ height:32, padding:"0 12px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff", color:safePage>=totalPages?"#cbd5e1":"#334b71", fontWeight:700, fontSize:13, cursor:safePage>=totalPages?"not-allowed":"pointer" }}>Next ›</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── FORM VIEW ───────────────────────────────────────────────────────────── */
  const tabErrorKeys = {
    0:["productCode","productName","category","subCategory","barcode","productType"],
    1:["pricing","saleUOM"], 2:["minPurchaseQty"], 3:[], 4:["field1","field2","field3","field4","field5"],
  };

  return (
    <div style={{ padding:28, fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#0f172a" }}>
      {toast && <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13, fontWeight:600, background:toast.type==="success"?"#e6f4ef":"#fdf3f3", border:`1px solid ${toast.type==="success"?"#b3d9cc":"#f0c4c0"}`, color:toast.type==="success"?"#2e7d5e":"#b91c1c" }}>{toast.msg}</div>}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:"#1e293b" }}>{editCode ? `Edit Product — ${form.productName?.trim()}` : "Create New Product"}</h2>
          <button onClick={()=>setView("list")} style={{ background:"none", border:"none", color:"#334b71", cursor:"pointer", fontSize:13, fontWeight:600, padding:0 }}>← Back to List</button>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {(<>
            <button onClick={()=>handleSave("save")} disabled={!!saving} style={{ height:40, padding:"0 20px", background:"#fff", color:"#334b71", border:"1.5px solid #334b71", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", opacity:saving?0.7:1 }}>{saving==="save"?"Saving…":"Save (Draft)"}</button>
            <button onClick={()=>handleSave("submit")} disabled={!!saving} style={{ height:40, padding:"0 20px", background:"#334b71", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", opacity:saving?0.7:1 }}>{saving==="submit"?"Submitting…":"Submit & Release"}</button>
          </>)}
        </div>
      </div>

      {form.status && (
        <div style={{ marginBottom:16, padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600,
          background: form.status==="Active"?"#e6f4ef":form.status==="Draft"?"#fef3c7":"#f1f5f9",
          color: form.status==="Active"?"#2e7d5e":form.status==="Draft"?"#92400e":"#475569" }}>
          Status: {form.status} {form.status==="Draft" ? "— Click 'Submit & Release' to make available at centres." : ""}
        </div>
      )}

      {saveAttempted && Object.keys(errors).length>0 && (
        <div style={{ marginBottom:16, padding:"12px 16px", background:"#fdf3f3", border:"1px solid #f0c4c0", borderRadius:10 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#b91c1c", marginBottom:6 }}>⚠ Please fix the following:</div>
          <ul style={{ margin:0, paddingLeft:18, fontSize:12, color:"#b91c1c" }}>
            {Object.values(errors).filter(Boolean).map((m,i)=><li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"baseline", gap:12, flexWrap:"wrap", marginBottom:16 }}>
        <span style={{ fontSize:18, fontWeight:800, color:"#1e293b" }}>{form.productName?.trim() || (editCode ? "Product" : "New Product")}</span>
        {form.productCode?.trim() && <span style={{ fontSize:12.5, fontWeight:700, color:"#334b71", background:"#eef2f8", padding:"3px 10px", borderRadius:999 }}>{form.productCode}</span>}
      </div>

      <div style={{ display:"flex", borderBottom:"2px solid #e2e8f0", marginBottom:24 }}>
        {TABS.map((t,i)=>{
          const tabHasError = saveAttempted && Object.keys(errors).some(k => (tabErrorKeys[i]||[]).includes(k));
          return (
            <button key={t} onClick={()=>setActiveTab(i)} style={{ padding:"10px 20px", border:"none", background:"none", fontWeight:700, fontSize:13, cursor:"pointer", position:"relative", color: activeTab===i?"#334b71":"#94a3b8", borderBottom: activeTab===i?"2px solid #334b71":"2px solid transparent", marginBottom:-2 }}>
              {t}{tabHasError && <span style={{ position:"absolute", top:8, right:6, width:7, height:7, borderRadius:"50%", background:"#b91c1c" }} />}
            </button>
          );
        })}
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", padding:24, minHeight:300, pointerEvents:"auto", opacity:1 }}>
        {activeTab===0 && <GeneralTab   form={form} setForm={setForm} errors={saveAttempted?errors:{}} isEdit={!!editCode} setErrors={setErrors} barcodeMandatory={barcodeMandatory} />}
        {activeTab===1 && <SalesTab     form={form} setForm={setForm} errors={saveAttempted?errors:{}} uomOptions={uomOptions} membershipActive={membershipActive} />}
        {activeTab===2 && <PurchaseTab  form={form} setForm={setForm} uomOptions={uomOptions} errors={saveAttempted?errors:{}} />}
        {activeTab===3 && <InventoryTab form={form} setForm={setForm} uomOptions={uomOptions} />}
        {activeTab===4 && <MiscTab      form={form} setForm={setForm} />}
      </div>

      <div style={{ display:"flex", gap:12, marginTop:20 }}>
        {(<>
          <button onClick={()=>handleSave("save")} disabled={!!saving} style={{ height:40, padding:"0 20px", background:"#fff", color:"#334b71", border:"1.5px solid #334b71", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>{saving==="save"?"Saving…":"Save (Draft)"}</button>
          <button onClick={()=>handleSave("submit")} disabled={!!saving} style={{ height:40, padding:"0 20px", background:"#334b71", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>{saving==="submit"?"Submitting…":"Submit & Release"}</button>
        </>)}
        <button onClick={()=>setView("list")} style={{ height:40, padding:"0 18px", background:"#fff", color:"#64748b", border:"1.5px solid #e2e8f0", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
};

export default ProductMaster;