import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser  = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const authGet  = async (url) => { const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => { const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) }); return r.json(); };
const authPut  = async (url, body) => { const r = await fetch(url, { method:"PUT",  headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) }); return r.json(); };

const todayStr = () => new Date().toISOString().split("T")[0];

const ITEM_TYPES = ["Service","Product","Package","Category"];

export default function SimpleDiscount() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const editId          = searchParams.get("edit") || "";
  const isEdit          = !!editId;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    discountName:     "",
    applicationLevel: "Item Level",
    startDate:        todayStr(),
    endDate:          "",
    enableDiscount:   false,
    owner:            "",
    discountValueType:"Percentage",
    discountValue:    "",
  });

  // ── Centres ─────────────────────────────────────────────────────────────────
  const [allCentres,      setAllCentres]      = useState([]);
  const [selectedCentres, setSelectedCentres] = useState([]); // [{ centerCode, centerName }]

  // ── Applicable Items ────────────────────────────────────────────────────────
  const [itemTypeChecks, setItemTypeChecks]   = useState({ Service:false, Product:false, Package:false, Category:false });
  const [itemSearch,     setItemSearch]       = useState({ Service:"", Product:"", Package:"", Category:"" });
  const [itemSuggestions,setItemSuggestions]  = useState({ Service:[], Product:[], Package:[], Category:[] });
  const [selectedItems,  setSelectedItems]    = useState([]); // [{ itemType, itemCode, itemName }]
  const debounceRef = useRef({});

  // ── UI state ────────────────────────────────────────────────────────────────
  const [saving,        setSaving]        = useState(false);
  const [loadingEdit,   setLoadingEdit]   = useState(false);
  const [errors,        setErrors]        = useState({});
  const [toast,         setToast]         = useState(null);
  const [saveAttempted, setSaveAttempted] = useState(false);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load centres on mount ───────────────────────────────────────────────────
  useEffect(() => {
    authGet(`${API_BASE_URL}/api/Master/LoadCenters`)
      .then(data => setAllCentres(Array.isArray(data) ? data : []))
      .catch(() => setAllCentres([]));
  }, []);

  // ── Load discount for edit ──────────────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    authGet(`${API_BASE_URL}/api/Discount/${editId}`)
      .then(d => {
        if (!d) return;
        setForm({
          discountName:      d.discountName      || "",
          applicationLevel:  d.applicationLevel  || "Item Level",
          startDate:         d.startDate ? d.startDate.split("T")[0] : "",
          endDate:           d.endDate   ? d.endDate.split("T")[0]   : "",
          enableDiscount:    d.enableDiscount     || false,
          owner:             d.owner             || "",
          discountValueType: d.discountValueType || "Percentage",
          discountValue:     d.discountValue     || "",
        });
        setSelectedCentres(d.centres || []);
        setSelectedItems(d.items    || []);
        // Re-check item type boxes based on loaded items
        const checks = { Service:false, Product:false, Package:false, Category:false };
        (d.items || []).forEach(i => { if (checks[i.itemType] !== undefined) checks[i.itemType] = true; });
        setItemTypeChecks(checks);
      })
      .catch(() => showToast("Failed to load discount.", "error"))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  // ── Business Rule 5: Enable toggle → auto-set start date to today ───────────
  const handleEnableToggle = () => {
    const next = !form.enableDiscount;
    setForm(p => ({
      ...p,
      enableDiscount: next,
      startDate: next && (!p.startDate || p.startDate > todayStr()) ? todayStr() : p.startDate,
    }));
  };

  // ── Item type search ─────────────────────────────────────────────────────────
  const searchItems = (type, val) => {
    setItemSearch(p => ({ ...p, [type]: val }));
    clearTimeout(debounceRef.current[type]);
    if (!val.trim()) { setItemSuggestions(p => ({ ...p, [type]: [] })); return; }
    const u = getUser();
    debounceRef.current[type] = setTimeout(async () => {
      try {
        let url = "";
        if (type === "Service")  url = `${API_BASE_URL}/api/Master/GetServiceByName/${encodeURIComponent(val.trim())}/${u.centerCode||""}?requireCentrePrice=false`;
        if (type === "Product")  url = `${API_BASE_URL}/api/Master/GetProductByName/${encodeURIComponent(val.trim())}/${u.centerCode||""}`;
        if (type === "Category") url = `${API_BASE_URL}/api/Master/Categories`;
        if (type === "Package")  url = `${API_BASE_URL}/api/Package/List?search=${encodeURIComponent(val.trim())}&allEntities=1`;
        const data = await authGet(url);
        const list = Array.isArray(data) ? data : [];
        const suggestions = list.map(i => ({
          itemCode: i.serviceCode || i.productCode || i.categoryCode || i.packageCode || i.PACKAGECODE || "",
          itemName: i.serviceName || i.productName || i.categoryName || i.packageName || i.PACKAGENAME || "",
        })).filter(i => i.itemCode && i.itemName);
        setItemSuggestions(p => ({ ...p, [type]: suggestions }));
      } catch { setItemSuggestions(p => ({ ...p, [type]: [] })); }
    }, 300);
  };

  const addItem = (type, item) => {
    const exists = selectedItems.find(i => i.itemType === type && i.itemCode === item.itemCode);
    if (!exists) setSelectedItems(p => [...p, { itemType: type, itemCode: item.itemCode, itemName: item.itemName }]);
    setItemSearch(p => ({ ...p, [type]: "" }));
    setItemSuggestions(p => ({ ...p, [type]: [] }));
  };

  const removeItem = (idx) => setSelectedItems(p => p.filter((_,i) => i !== idx));

  // ── Centre helpers ───────────────────────────────────────────────────────────
  const toggleCentre = (centre) => {
    setSelectedCentres(prev => {
      const exists = prev.find(c => c.centerCode === centre.code);
      return exists
        ? prev.filter(c => c.centerCode !== centre.code)
        : [...prev, { centerCode: centre.code, centerName: centre.name }];
    });
    setErrors(p => ({ ...p, centres: undefined }));
  };

  const selectAllCentres = () => {
    setSelectedCentres(allCentres.map(c => ({ centerCode: c.code, centerName: c.name })));
    setErrors(p => ({ ...p, centres: undefined }));
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = (action) => {
    const e = {};
    if (!form.discountName.trim())   e.discountName    = "Discount Name is required.";
    if (!form.startDate)             e.startDate       = "Start Date is required.";
    if (!form.endDate)               e.endDate         = "End Date is required.";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
                                     e.endDate         = "End Date must be on or after Start Date.";
    if (!selectedCentres.length)     e.centres         = "Required: Please select at least one Centre where this discount will apply, or use Select All to apply to all centres.";
    if (!form.discountValueType)     e.discountValueType = "Discount Type is required.";
    if (!form.discountValue || parseFloat(form.discountValue) <= 0)
                                     e.discountValue   = "Discount Value must be greater than 0.";
    if (form.discountValueType === "Percentage" && parseFloat(form.discountValue) > 100)
                                     e.discountValue   = "Percentage cannot exceed 100.";
    if (form.applicationLevel === "Item Level" && !selectedItems.length)
                                     e.items           = "Please add at least one applicable item.";
    if (form.enableDiscount && action === "draft")
                                     e.enableDiscount  = "Enabled Discounts cannot be saved as Drafts.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSave = async (action) => {
    setSaveAttempted(true);
    if (!validate(action)) return;
    setSaving(action);
    try {
      const u = getUser();
      const payload = {
        ...form,
        discountType:    "simple",
        action,
        centres:         selectedCentres,
        items:           form.applicationLevel === "Item Level" ? selectedItems : [],
        legalEntityCode: u.legalEntityCode || u.centerCode || "",
        createdBy:       u.userId || u.employeeCode || "",
        modifiedBy:      u.userId || u.employeeCode || "",
      };
      const res = isEdit
        ? await authPut(`${API_BASE_URL}/api/Discount/${editId}`, payload)
        : await authPost(`${API_BASE_URL}/api/Discount/Create`, payload);

      if (!res.success) throw new Error(res.message || "Save failed.");
      showToast(res.message || (action === "draft" ? "Saved as Draft." : "Discount activated!"));
      setTimeout(() => navigate("/discounts/manage"), 1500);
    } catch (e) {
      showToast(e.message, "error");
    } finally { setSaving(false); }
  };

  const F = (k) => form[k];
  const S = (k) => (v) => setForm(p => ({ ...p, [k]: typeof v === "object" ? v.target.value : v }));

  if (loadingEdit) return <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>Loading discount…</div>;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ marginBottom:12, padding:"10px 16px", borderRadius:8, fontWeight:600, fontSize:13,
          background: toast.type==="error" ? "#fdf3f3" : "#e6f4ef",
          border: `1px solid ${toast.type==="error" ? "#f0c4c0" : "#b3d9cc"}`,
          color: toast.type==="error" ? "#b91c1c" : "#2e7d5e" }}>
          {toast.type==="error" ? "⚠ " : "✓ "}{toast.msg}
        </div>
      )}

      {/* ── Basic Information ── */}
      <section className="section">
        <h4>Basic Information</h4>
        <div className="grid-2">
          <div className="field">
            <label>Discount Name *</label>
            <input type="text" value={F("discountName")} onChange={S("discountName")}
              placeholder="e.g. 20% off all Laser services"
              style={{ borderColor: saveAttempted && errors.discountName ? "#b91c1c" : undefined }} />
            {saveAttempted && errors.discountName && <span style={{ color:"#b91c1c", fontSize:11 }}>{errors.discountName}</span>}
          </div>
          <div className="field">
            <label>Application Level *</label>
            <select value={F("applicationLevel")} onChange={S("applicationLevel")}>
              <option value="Item Level">Item Level</option>
              <option value="Invoice Level">Invoice Level</option>
            </select>
          </div>
          <div className="field">
            <label>Start Date *</label>

            <input type="date" value={F("startDate")} onChange={S("startDate")} min={todayStr()}
              style={{ borderColor: saveAttempted && errors.startDate ? "#b91c1c" : undefined }} />
            {saveAttempted && errors.startDate && <span style={{ color:"#b91c1c", fontSize:11 }}>{errors.startDate}</span>}
          </div>
          <div className="field">
            <label>End Date *</label>
            <input type="date" value={F("endDate")} onChange={S("endDate")} min={todayStr()}
              style={{ borderColor: saveAttempted && errors.endDate ? "#b91c1c" : undefined }} />
            {saveAttempted && errors.endDate && <span style={{ color:"#b91c1c", fontSize:11 }}>{errors.endDate}</span>}
          </div>
          <div className="field">
            <label>Owner (Team / Department)</label>
            <input type="text" value={F("owner")} onChange={S("owner")} placeholder="e.g. Marketing, Derm Team" />
          </div>
        </div>

        <div className="inline" style={{ marginTop:12 }}>
          <div className={`switch ${F("enableDiscount") ? "on" : ""}`} onClick={handleEnableToggle}>
            <div className="knob" />
          </div>
          <div className="muted">Enable Discount</div>
        </div>
        {saveAttempted && errors.enableDiscount && (
          <div style={{ color:"#b91c1c", fontSize:12, marginTop:6 }}>⚠ {errors.enableDiscount}</div>
        )}
        <div className="help" style={{ marginTop:10 }}>
          <strong>Important:</strong> Discounts will only become active once the start date is reached, regardless of the Enable Discount setting. Use the toggle to temporarily disable active discounts.
        </div>
      </section>

      {/* ── Centre Selection ── */}
      <section className="section">
        <h4>Centre Selection <span style={{ color:"#cc5454" }}>*</span></h4>
        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
          <button className="btn-link" onClick={selectAllCentres}>Select All</button>
          {selectedCentres.length > 0 && (
            <button className="btn-link" onClick={() => setSelectedCentres([])}>Clear</button>
          )}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {allCentres.map(c => {
            const sel = selectedCentres.find(s => s.centerCode === c.code);
            return (
              <button key={c.code} onClick={() => toggleCentre(c)}
                style={{ padding:"6px 14px", borderRadius:999, border:`1.5px solid ${sel ? "#334b71" : "#e2e8f0"}`,
                  background: sel ? "#334b71" : "#fff", color: sel ? "#fff" : "#334b71",
                  fontWeight:700, fontSize:12, cursor:"pointer" }}>
                {c.name || c.code}
              </button>
            );
          })}
        </div>
        {selectedCentres.length > 0 && (
          <div style={{ marginTop:8, fontSize:12, color:"#2e7d5e" }}>
            ✓ {selectedCentres.length} centre{selectedCentres.length>1?"s":""} selected
          </div>
        )}
        {saveAttempted && errors.centres && (
          <div className="warn" style={{ marginTop:10 }}>⚠ {errors.centres}</div>
        )}
      </section>

      {/* ── Discount Configuration ── */}
      <section className="section">
        <h4>Discount Configuration</h4>
        <div className="grid-2">
          <div className="field">
            <label>Discount Type *</label>
            <select value={F("discountValueType")} onChange={S("discountValueType")}>
              <option value="Percentage">Percentage (%)</option>
              <option value="Amount">Fixed Amount (SAR)</option>
            </select>
          </div>
          <div className="field">
            <label>Discount Value {F("discountValueType") === "Percentage" ? "(%)" : "(SAR)"} *</label>
            <input type="number" min={0} max={F("discountValueType")==="Percentage"?100:undefined}
              value={F("discountValue")} onChange={S("discountValue")} placeholder="e.g. 20"
              style={{ borderColor: saveAttempted && errors.discountValue ? "#b91c1c" : undefined }} />
            {saveAttempted && errors.discountValue && <span style={{ color:"#b91c1c", fontSize:11 }}>{errors.discountValue}</span>}
          </div>
        </div>
      </section>

      {/* ── Applicable Items (only when Item Level) ── */}
      <section className="section" style={{ opacity: F("applicationLevel")==="Invoice Level" ? 0.45 : 1,
        pointerEvents: F("applicationLevel")==="Invoice Level" ? "none" : "auto" }}>
        <h4>Applicable Items
          {F("applicationLevel")==="Invoice Level" && <span style={{ fontSize:11, fontWeight:400, color:"#94a3b8", marginLeft:8 }}>(disabled — Invoice Level selected)</span>}
        </h4>

        {/* Item type checkboxes */}
        <div style={{ display:"flex", gap:16, marginBottom:14, flexWrap:"wrap" }}>
          {ITEM_TYPES.map(type => (
            <label key={type} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13, fontWeight:600 }}>
              <input type="checkbox" checked={itemTypeChecks[type]}
                onChange={() => setItemTypeChecks(p => ({ ...p, [type]: !p[type] }))} />
              {type}
            </label>
          ))}
        </div>

        {/* Search + add per checked type */}
        {ITEM_TYPES.filter(t => itemTypeChecks[t]).map(type => (
          <div key={type} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:700, color:"#334b71" }}>Search {type}</label>
            <div style={{ position:"relative", marginTop:4 }}>
              <input type="text" value={itemSearch[type]}
                onChange={e => searchItems(type, e.target.value)}
                placeholder={`Type to search ${type.toLowerCase()}s…`}
                style={{ width:"100%", padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box" }} />
              {itemSuggestions[type].length > 0 && (
                <ul style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0",
                  borderRadius:8, zIndex:999, listStyle:"none", margin:0, padding:"4px 0", maxHeight:200, overflowY:"auto",
                  boxShadow:"0 8px 24px rgba(0,0,0,.1)" }}>
                  {itemSuggestions[type].map((s,i) => (
                    <li key={i} onMouseDown={() => addItem(type, s)}
                      style={{ padding:"8px 12px", cursor:"pointer", fontSize:13 }}
                      onMouseEnter={e => e.currentTarget.style.background="#f1f5f9"}
                      onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                      {s.itemName} <span style={{ color:"#94a3b8", fontSize:11 }}>({s.itemCode})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        {/* Selected items tags */}
        {selectedItems.length > 0 && (
          <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:6 }}>
            {selectedItems.map((item, idx) => (
              <span key={idx} style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#e9edf5",
                color:"#334b71", border:"1px solid #e2e8f0", padding:"5px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>
                <span style={{ fontSize:10, background:"#334b71", color:"#fff", borderRadius:4, padding:"1px 5px" }}>{item.itemType}</span>
                {item.itemName}
                <button onClick={() => removeItem(idx)}
                  style={{ background:"none", border:"none", color:"#b91c1c", cursor:"pointer", fontSize:14, lineHeight:1, padding:0 }}>×</button>
              </span>
            ))}
          </div>
        )}
        {saveAttempted && errors.items && (
          <div style={{ color:"#b91c1c", fontSize:12, marginTop:8 }}>⚠ {errors.items}</div>
        )}
      </section>

      {/* ── Actions ── */}
      <div className="btns">
        <button className="btn btn-secondary"
          disabled={!!saving || F("enableDiscount")}
          title={F("enableDiscount") ? "Enabled Discounts cannot be saved as Drafts" : ""}
          style={{ opacity: F("enableDiscount") ? 0.45 : 1, cursor: F("enableDiscount") ? "not-allowed" : "pointer" }}
          onClick={() => handleSave("draft")}>
          {saving==="draft" ? "Saving…" : "Save as Draft"}
        </button>
        <button className="btn btn-primary" disabled={!!saving}
          onClick={() => handleSave("submit")}>
          {saving==="submit" ? "Submitting…" : "Submit & Activate"}
        </button>
      </div>
    </>
  );
}