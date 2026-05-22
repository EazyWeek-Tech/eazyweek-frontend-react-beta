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
const MAX_SLOTS  = 4;

const EMPTY_SLOT = () => ({ itemType:"", itemCode:"", itemName:"", minQty:1, discountValue:"" });

export default function MixMatch() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const editId          = searchParams.get("edit") || "";
  const isEdit          = !!editId;

  const [form, setForm] = useState({
    discountName:      "",
    applicationLevel:  "Item Level",
    startDate:         "",
    endDate:           "",
    enableDiscount:    false,
    owner:             "",
    mixMatchValueType: "Percentage",
  });

  // ── Up to 4 slots ─────────────────────────────────────────────────────────
  const [slots, setSlots] = useState([EMPTY_SLOT(), EMPTY_SLOT()]);

  // ── Applicable items (controls how many slots are active) ─────────────────
  const [itemTypeChecks,  setItemTypeChecks]  = useState({ Service:false, Product:false, Package:false, Category:false });
  const [itemSearch,      setItemSearch]      = useState({ Service:"", Product:"", Package:"", Category:"" });
  const [itemSuggestions, setItemSuggestions] = useState({ Service:[], Product:[], Package:[], Category:[] });
  const [selectedItems,   setSelectedItems]   = useState([]); // controls active slot count
  const debounceRef = useRef({});

  const [allCentres,      setAllCentres]      = useState([]);
  const [selectedCentres, setSelectedCentres] = useState([]);

  // ── Slot search (per-slot item search) ────────────────────────────────────
  const [slotSearch,      setSlotSearch]      = useState(["","","",""]);
  const [slotSuggestions, setSlotSuggestions] = useState([[],[],[],[]]);
  const slotDebounce = useRef([null,null,null,null]);

  const [saving,        setSaving]        = useState(false);
  const [loadingEdit,   setLoadingEdit]   = useState(false);
  const [errors,        setErrors]        = useState({});
  const [toast,         setToast]         = useState(null);
  const [saveAttempted, setSaveAttempted] = useState(false);

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  // Active slots = number of selected applicable items, max 4
  const activeSlots = Math.min(Math.max(selectedItems.length, 2), MAX_SLOTS);

  useEffect(() => {
    authGet(`${API_BASE_URL}/api/Master/LoadCenters`)
      .then(data => setAllCentres(Array.isArray(data) ? data : []))
      .catch(() => setAllCentres([]));
  }, []);

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
          enableDiscount:    d.enableDiscount    || false,
          owner:             d.owner             || "",
          mixMatchValueType: d.mixMatchValueType || "Percentage",
        });
        setSelectedCentres(d.centres || []);
        setSelectedItems(d.items    || []);
        const checks = { Service:false, Product:false, Package:false, Category:false };
        (d.items || []).forEach(i => { if (checks[i.itemType] !== undefined) checks[i.itemType] = true; });
        setItemTypeChecks(checks);
        // Load slots
        const loadedSlots = Array.from({ length: MAX_SLOTS }, (_, i) => {
          const s = (d.mixMatchSlots || []).find(s => s.slotNum === i+1);
          return s ? { itemType:s.itemType, itemCode:s.itemCode, itemName:s.itemName, minQty:s.minQty, discountValue:s.discountValue } : EMPTY_SLOT();
        });
        setSlots(loadedSlots);
        setSlotSearch(loadedSlots.map(s => s.itemName || ""));
      })
      .catch(() => showToast("Failed to load discount.", "error"))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const handleEnableToggle = () => {
    const next = !form.enableDiscount;
    setForm(p => ({ ...p, enableDiscount: next, startDate: next && (!p.startDate || p.startDate > todayStr()) ? todayStr() : p.startDate }));
  };

  // ── Applicable items search ───────────────────────────────────────────────
  const searchApplicableItems = (type, val) => {
    setItemSearch(p => ({ ...p, [type]: val }));
    clearTimeout(debounceRef.current[type]);
    if (!val.trim()) { setItemSuggestions(p => ({ ...p, [type]: [] })); return; }
    const u = getUser();
    debounceRef.current[type] = setTimeout(async () => {
      try {
        let url = "";
        if (type === "Service")  url = `${API_BASE_URL}/api/Master/GetServiceByName/${encodeURIComponent(val)}/${u.centerCode||""}`;
        if (type === "Product")  url = `${API_BASE_URL}/api/Master/GetProductByName/${encodeURIComponent(val)}/${u.centerCode||""}`;
        if (type === "Category") url = `${API_BASE_URL}/api/Master/Categories`;
        if (type === "Package")  url = `${API_BASE_URL}/api/Package/List?search=${encodeURIComponent(val)}&status=Active`;
        const data = await authGet(url);
        const list = Array.isArray(data) ? data : [];
        setItemSuggestions(p => ({ ...p, [type]: list.map(i => ({
          itemCode: i.serviceCode||i.productCode||i.categoryCode||i.packageCode||i.PACKAGECODE||"",
          itemName: i.serviceName||i.productName||i.categoryName||i.packageName||i.PACKAGENAME||"",
        })).filter(i => i.itemCode && i.itemName) }));
      } catch { setItemSuggestions(p => ({ ...p, [type]: [] })); }
    }, 300);
  };

  const addApplicableItem = (type, item) => {
    if (selectedItems.length >= MAX_SLOTS) { showToast("Maximum 4 applicable items allowed.", "error"); return; }
    if (!selectedItems.find(i => i.itemType === type && i.itemCode === item.itemCode))
      setSelectedItems(p => [...p, { itemType: type, itemCode: item.itemCode, itemName: item.itemName }]);
    setItemSearch(p => ({ ...p, [type]: "" }));
    setItemSuggestions(p => ({ ...p, [type]: [] }));
  };

  const removeApplicableItem = (idx) => setSelectedItems(p => p.filter((_,i) => i !== idx));

  // ── Per-slot search ───────────────────────────────────────────────────────
  const searchSlotItem = (slotIdx, val) => {
    setSlotSearch(p => { const n=[...p]; n[slotIdx]=val; return n; });
    clearTimeout(slotDebounce.current[slotIdx]);
    if (!val.trim()) { setSlotSuggestions(p => { const n=[...p]; n[slotIdx]=[]; return n; }); return; }
    const u = getUser();
    // Search across all applicable item types
    slotDebounce.current[slotIdx] = setTimeout(async () => {
      try {
        const results = [];
        for (const type of ITEM_TYPES.filter(t => itemTypeChecks[t])) {
          let url = "";
          if (type === "Service")  url = `${API_BASE_URL}/api/Master/GetServiceByName/${encodeURIComponent(val)}/${u.centerCode||""}`;
          if (type === "Product")  url = `${API_BASE_URL}/api/Master/GetProductByName/${encodeURIComponent(val)}/${u.centerCode||""}`;
          if (type === "Category") url = `${API_BASE_URL}/api/Master/Categories`;
          if (type === "Package")  url = `${API_BASE_URL}/api/Package/List?search=${encodeURIComponent(val)}&status=Active`;
          const data = await authGet(url);
          (Array.isArray(data) ? data : []).forEach(i => {
            const code = i.serviceCode||i.productCode||i.categoryCode||i.packageCode||i.PACKAGECODE||"";
            const name = i.serviceName||i.productName||i.categoryName||i.packageName||i.PACKAGENAME||"";
            if (code && name) results.push({ itemType: type, itemCode: code, itemName: name });
          });
        }
        // Also allow selecting from applicable items directly
        selectedItems.forEach(i => {
          if (i.itemName.toLowerCase().includes(val.toLowerCase()) && !results.find(r => r.itemCode === i.itemCode))
            results.push(i);
        });
        setSlotSuggestions(p => { const n=[...p]; n[slotIdx]=results.slice(0,10); return n; });
      } catch { setSlotSuggestions(p => { const n=[...p]; n[slotIdx]=[]; return n; }); }
    }, 300);
  };

  const selectSlotItem = (slotIdx, item) => {
    // DC-MNM-005: All slots must be the same item type
    const configuredType = slots.find(s => s.itemCode && s.itemCode !== slots[slotIdx].itemCode)?.itemType || "";
    if (configuredType && item.itemType !== configuredType) {
      showToast(`All slots must use the same item type. Current slots use '${configuredType}'.`, "error");
      return;
    }
    setSlots(p => {
      const n = [...p];
      n[slotIdx] = { ...n[slotIdx], itemType: item.itemType, itemCode: item.itemCode, itemName: item.itemName };
      return n;
    });
    setSlotSearch(p => { const n=[...p]; n[slotIdx]=item.itemName; return n; });
    setSlotSuggestions(p => { const n=[...p]; n[slotIdx]=[]; return n; });
  };

  const updateSlot = (slotIdx, field, val) => {
    setSlots(p => { const n=[...p]; n[slotIdx]={ ...n[slotIdx], [field]: val }; return n; });
  };

  const toggleCentre = (centre) => {
    setSelectedCentres(prev => prev.find(c => c.centerCode === centre.code)
      ? prev.filter(c => c.centerCode !== centre.code)
      : [...prev, { centerCode: centre.code, centerName: centre.name }]);
  };

  const F = (k) => form[k];
  const S = (k) => (v) => setForm(p => ({ ...p, [k]: typeof v === "object" ? v.target.value : v }));

  const validate = (action) => {
    const e = {};
    if (!form.discountName.trim())     e.discountName    = "Discount Name is required.";
    if (!form.startDate)               e.startDate       = "Start Date is required.";
    if (!form.endDate)                 e.endDate         = "End Date is required.";
    if (form.endDate < form.startDate) e.endDate         = "End Date must be on or after Start Date.";
    if (!selectedCentres.length)       e.centres         = "Required: Please select at least one Centre.";
    if (!form.mixMatchValueType)       e.mixMatchValueType = "Discount Type is required.";
    if (!selectedItems.length)         e.applicableItems = "Please select at least one Applicable Item to define the combination.";
    const configuredSlots = slots.slice(0, activeSlots).filter(s => s.itemCode);
    if (!configuredSlots.length)       e.slots           = "Please configure at least one item slot in the combination grid.";
    slots.slice(0, activeSlots).forEach((s, i) => {
      if (s.itemCode && (!s.discountValue || parseFloat(s.discountValue) < 0))
        e[`slot_${i}`] = `Slot ${i+1}: Discount Value must be 0 or greater.`;
      if (form.mixMatchValueType === "Percentage" && parseFloat(s.discountValue) > 100)
        e[`slot_${i}`] = `Slot ${i+1}: Percentage cannot exceed 100.`;
    });
    if (form.enableDiscount && action === "draft")
      e.enableDiscount = "Enabled Discounts cannot be saved as Drafts.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (action) => {
    setSaveAttempted(true);
    if (!validate(action)) return;
    setSaving(action);
    try {
      const u = getUser();
      const mixMatchSlots = slots.slice(0, activeSlots)
        .filter(s => s.itemCode)
        .map((s, i) => ({ slotNum: i+1, ...s, minQty: parseInt(s.minQty)||1, discountValue: parseFloat(s.discountValue)||0 }));
      const payload = {
        ...form, discountType: "mix", action,
        centres:        selectedCentres,
        items:          selectedItems,
        mixMatchSlots,
        legalEntityCode: u.legalEntityCode || u.centerCode || "",
        createdBy:  u.userId || u.employeeCode || "",
        modifiedBy: u.userId || u.employeeCode || "",
      };
      const res = isEdit
        ? await authPut(`${API_BASE_URL}/api/Discount/${editId}`, payload)
        : await authPost(`${API_BASE_URL}/api/Discount/Create`, payload);
      if (!res.success) throw new Error(res.message || "Save failed.");
      showToast(res.message || (action==="draft" ? "Saved as Draft." : "Discount activated!"));
      setTimeout(() => navigate("/discounts/manage"), 1500);
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  if (loadingEdit) return <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>Loading discount…</div>;

  return (
    <>
      {toast && (
        <div style={{ marginBottom:12, padding:"10px 16px", borderRadius:8, fontWeight:600, fontSize:13,
          background:toast.type==="error"?"#fdf3f3":"#e6f4ef",
          border:`1px solid ${toast.type==="error"?"#f0c4c0":"#b3d9cc"}`,
          color:toast.type==="error"?"#b91c1c":"#2e7d5e" }}>
          {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
        </div>
      )}

      {/* ── Basic Information ── */}
      <section className="section">
        <h4>Basic Information</h4>
        <div className="grid-2">
          <div className="field">
            <label>Discount Name *</label>
            <input type="text" value={F("discountName")} onChange={S("discountName")}
              placeholder="e.g. Buy one Laser get one Facial with 50% off"
              style={{ borderColor:saveAttempted&&errors.discountName?"#b91c1c":undefined }} />
            {saveAttempted && errors.discountName && <span style={{ color:"#b91c1c", fontSize:11 }}>{errors.discountName}</span>}
          </div>
          <div className="field">
            <label>Application Level</label>
            <select value={F("applicationLevel")} onChange={S("applicationLevel")}>
              <option value="Item Level">Item Level</option>
            </select>
          </div>
          <div className="field">
            <label>Start Date *</label>
            <input type="date" value={F("startDate")} onChange={S("startDate")}
              style={{ borderColor:saveAttempted&&errors.startDate?"#b91c1c":undefined }} />
            {saveAttempted && errors.startDate && <span style={{ color:"#b91c1c", fontSize:11 }}>{errors.startDate}</span>}
          </div>
          <div className="field">
            <label>End Date *</label>
            <input type="date" value={F("endDate")} onChange={S("endDate")}
              style={{ borderColor:saveAttempted&&errors.endDate?"#b91c1c":undefined }} />
            {saveAttempted && errors.endDate && <span style={{ color:"#b91c1c", fontSize:11 }}>{errors.endDate}</span>}
          </div>
          <div className="field">
            <label>Owner (Team / Department)</label>
            <input type="text" value={F("owner")} onChange={S("owner")} placeholder="e.g. Marketing" />
          </div>
        </div>
        <div className="inline" style={{ marginTop:12 }}>
          <div className={`switch ${F("enableDiscount")?"on":""}`} onClick={handleEnableToggle}><div className="knob"/></div>
          <div className="muted">Enable Discount</div>
        </div>
        {saveAttempted && errors.enableDiscount && <div style={{ color:"#b91c1c", fontSize:12, marginTop:6 }}>⚠ {errors.enableDiscount}</div>}
        <div className="help" style={{ marginTop:10 }}>
          <strong>Important:</strong> Discounts will only become active once the start date is reached. Use the toggle to temporarily disable active discounts.
        </div>
      </section>

      {/* ── Centre Selection ── */}
      <section className="section">
        <h4>Centre Selection <span style={{ color:"#cc5454" }}>*</span></h4>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <button className="btn-link" onClick={() => setSelectedCentres(allCentres.map(c => ({ centerCode:c.code, centerName:c.name })))}>Select All</button>
          {selectedCentres.length > 0 && <button className="btn-link" onClick={() => setSelectedCentres([])}>Clear</button>}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {allCentres.map(c => {
            const sel = selectedCentres.find(s => s.centerCode === c.code);
            return (
              <button key={c.code} onClick={() => toggleCentre(c)}
                style={{ padding:"6px 14px", borderRadius:999, border:`1.5px solid ${sel?"#334b71":"#e2e8f0"}`,
                  background:sel?"#334b71":"#fff", color:sel?"#fff":"#334b71", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                {c.name||c.code}
              </button>
            );
          })}
        </div>
        {selectedCentres.length > 0 && <div style={{ marginTop:8, fontSize:12, color:"#2e7d5e" }}>✓ {selectedCentres.length} centre{selectedCentres.length>1?"s":""} selected</div>}
        {saveAttempted && errors.centres && <div className="warn" style={{ marginTop:10 }}>⚠ {errors.centres}</div>}
      </section>

      {/* ── Applicable Items — controls active slot count ── */}
      <section className="section">
        <h4>Applicable Items <span style={{ fontSize:11, fontWeight:400, color:"#64748b" }}>(select up to 4 — determines active combination slots)</span></h4>
        <div style={{ display:"flex", gap:16, marginBottom:14, flexWrap:"wrap" }}>
          {ITEM_TYPES.map(type => (
            <label key={type} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13, fontWeight:600 }}>
              <input type="checkbox" checked={itemTypeChecks[type]}
                onChange={() => setItemTypeChecks(p => ({ ...p, [type]: !p[type] }))} />
              {type}
            </label>
          ))}
        </div>
        {ITEM_TYPES.filter(t => itemTypeChecks[t]).map(type => (
          <div key={type} style={{ marginBottom:10 }}>
            <label style={{ fontSize:12, fontWeight:700, color:"#334b71" }}>Search {type}</label>
            <div style={{ position:"relative", marginTop:4 }}>
              <input type="text" value={itemSearch[type]} onChange={e => searchApplicableItems(type, e.target.value)}
                placeholder={`Type to search ${type.toLowerCase()}s…`}
                style={{ width:"100%", padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box" }} />
              {itemSuggestions[type].length > 0 && (
                <ul style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0",
                  borderRadius:8, zIndex:999, listStyle:"none", margin:0, padding:"4px 0", maxHeight:180, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.1)" }}>
                  {itemSuggestions[type].map((s,i) => (
                    <li key={i} onMouseDown={() => addApplicableItem(type, s)}
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
        {selectedItems.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
            {selectedItems.map((item, idx) => (
              <span key={idx} style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#e9edf5",
                color:"#334b71", border:"1px solid #e2e8f0", padding:"5px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>
                <span style={{ fontSize:10, background:"#334b71", color:"#fff", borderRadius:4, padding:"1px 5px" }}>{item.itemType}</span>
                {item.itemName}
                <button onClick={() => removeApplicableItem(idx)} style={{ background:"none", border:"none", color:"#b91c1c", cursor:"pointer", fontSize:14, lineHeight:1, padding:0 }}>×</button>
              </span>
            ))}
          </div>
        )}
        {saveAttempted && errors.applicableItems && <div style={{ color:"#b91c1c", fontSize:12, marginTop:8 }}>⚠ {errors.applicableItems}</div>}
      </section>

      {/* ── Discount Type (single for all slots) ── */}
      <section className="section">
        <h4>Discount Configuration</h4>
        <div style={{ maxWidth:300 }}>
          <div className="field">
            <label>Discount Type * (applies to all slots)</label>
            <select value={F("mixMatchValueType")} onChange={S("mixMatchValueType")}>
              <option value="Percentage">Percentage (%)</option>
              <option value="Amount">Fixed Amount (SAR)</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Combination Grid (up to 4 slots) ── */}
      <section className="section" style={{ opacity: F("applicationLevel")==="Invoice Level" ? 0.45 : 1, pointerEvents: F("applicationLevel")==="Invoice Level" ? "none" : "auto" }}>
        <h4>Item Combinations Grid
          <span style={{ fontSize:11, fontWeight:400, color:"#64748b", marginLeft:8 }}>
            {activeSlots} active slot{activeSlots>1?"s":""} (based on applicable items selected)
          </span>
        </h4>
        {saveAttempted && errors.slots && <div style={{ color:"#b91c1c", fontSize:12, marginBottom:10 }}>⚠ {errors.slots}</div>}

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:600 }}>
            <thead>
              <tr style={{ background:"#f1f5f9" }}>
                <th style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0", width:40 }}>#</th>
                <th style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0" }}>Item</th>
                <th style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0", width:100 }}>Min Qty</th>
                <th style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0", width:140 }}>
                  Discount Value {F("mixMatchValueType")==="Percentage"?"(%)":"(SAR)"}
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MAX_SLOTS }, (_, i) => {
                const active = i < activeSlots;
                const slot   = slots[i] || EMPTY_SLOT();
                return (
                  <tr key={i} style={{ borderBottom:"1px solid #f1f5f9", opacity:active?1:0.35 }}>
                    <td style={{ padding:"10px 12px", fontWeight:700, color:"#94a3b8" }}>{i+1}</td>
                    <td style={{ padding:"10px 12px" }}>
                      {active ? (
                        <div style={{ position:"relative" }}>
                          <input type="text" value={slotSearch[i]}
                            onChange={e => searchSlotItem(i, e.target.value)}
                            disabled={!active}
                            placeholder="Search item…"
                            style={{ width:"100%", padding:"6px 10px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, boxSizing:"border-box" }} />
                          {slotSuggestions[i]?.length > 0 && (
                            <ul style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0",
                              borderRadius:8, zIndex:999, listStyle:"none", margin:0, padding:"4px 0", maxHeight:160, overflowY:"auto", boxShadow:"0 8px 20px rgba(0,0,0,.1)" }}>
                              {slotSuggestions[i].map((s,si) => (
                                <li key={si} onMouseDown={() => selectSlotItem(i, s)}
                                  style={{ padding:"7px 12px", cursor:"pointer", fontSize:12 }}
                                  onMouseEnter={e => e.currentTarget.style.background="#f1f5f9"}
                                  onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                                  <span style={{ fontSize:10, background:"#334b71", color:"#fff", borderRadius:3, padding:"1px 4px", marginRight:5 }}>{s.itemType}</span>
                                  {s.itemName}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <span style={{ color:"#cbd5e1", fontSize:12 }}>N/A — disabled</span>
                      )}
                    </td>
                    <td style={{ padding:"10px 12px" }}>
                      <input type="number" min={1} step={1} value={slot.minQty} disabled={!active}
                        onChange={e => updateSlot(i, "minQty", e.target.value)}
                        style={{ width:70, padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, background:!active?"#f8fafc":"#fff" }} />
                    </td>
                    <td style={{ padding:"10px 12px" }}>
                      {active ? (
                        <>
                          <input type="number" min={0} max={F("mixMatchValueType")==="Percentage"?100:undefined}
                            value={slot.discountValue} onChange={e => updateSlot(i, "discountValue", e.target.value)}
                            placeholder="0"
                            style={{ width:100, padding:"6px 8px", border:`1px solid ${saveAttempted&&errors[`slot_${i}`]?"#b91c1c":"#e2e8f0"}`, borderRadius:6, fontSize:13 }} />
                          {saveAttempted && errors[`slot_${i}`] && <div style={{ color:"#b91c1c", fontSize:10, marginTop:2 }}>{errors[`slot_${i}`]}</div>}
                        </>
                      ) : (
                        <span style={{ color:"#cbd5e1", fontSize:12 }}>N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="help" style={{ marginTop:12, background:"#ecfbef", borderColor:"#cfe9d5", color:"#1b6a32" }}>
          <strong>Example:</strong> Buy Laser (Slot 1, Qty 1, 0% off) + Facial (Slot 2, Qty 1, 50% off) — customer gets Facial at 50% discount when both are in the cart.
        </div>
      </section>

      <div className="btns">
        <button className="btn btn-secondary"
          disabled={!!saving || F("enableDiscount")}
          title={F("enableDiscount") ? "Enabled Discounts cannot be saved as Drafts" : ""}
          style={{ opacity: F("enableDiscount") ? 0.45 : 1, cursor: F("enableDiscount") ? "not-allowed" : "pointer" }}
          onClick={() => handleSave("draft")}>
          {saving==="draft" ? "Saving…" : "Save as Draft"}
        </button>
        <button className="btn btn-primary" disabled={!!saving} onClick={() => handleSave("submit")}>
          {saving==="submit" ? "Submitting…" : "Submit & Activate"}
        </button>
      </div>
    </>
  );
}