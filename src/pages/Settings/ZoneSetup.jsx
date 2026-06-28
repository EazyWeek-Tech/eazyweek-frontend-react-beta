import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser  = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const authGet  = async (url) => { const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => { const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) }); return r.json(); };
const authPut  = async (url, body) => { const r = await fetch(url, { method:"PUT",  headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) }); return r.json(); };
const authDel  = async (url)       => { const r = await fetch(url, { method:"DELETE", headers:{ Authorization:`Bearer ${TOKEN()}` } }); return r.json(); };

const EMPTY_FORM = { zoneCode:"", zoneName:"", displayName:"", leCode:"" };

export default function ZoneSetup() {





  // ── Access Rights ─────────────────────────────────────────────────────────
  const _rights = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const role = (u.role || u.userRole || u.securityRole || "").toLowerCase().replace(/\s+/g, "");
      const ALLOWED   = ["admin", "productteam"];
      const isAdmin   = ALLOWED.includes(role);
      const isEntityLevel = u.isEntityLevel === true;
      const canManage = isAdmin && isEntityLevel;
      return { isAdmin, isEntityLevel, canCreate: canManage, canEdit: canManage, canDelete: canManage };
    } catch {
      return { isAdmin:false, isEntityLevel:false, canCreate:false, canEdit:false, canDelete:false };
    }
  })();
  const { isAdmin, isEntityLevel, canCreate, canEdit, canDelete } = _rights;

  const [zones,           setZones]           = useState([]);
  const [selected,        setSelected]        = useState(null);  // zoneCode for edit
  const [form,            setForm]            = useState(EMPTY_FORM);
  const [availableCentres,setAvailableCentres]= useState([]);
  const [mappedCentres,   setMappedCentres]   = useState([]);
  const [legalEntities,   setLegalEntities]   = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [errors,          setErrors]          = useState({});
  const [saveAttempted,   setSaveAttempted]   = useState(false);
  const [toast,           setToast]           = useState(null);
  const [showForm,        setShowForm]        = useState(false);
  const [confirmDelete,   setConfirmDelete]   = useState(null);
  const [centrePicker,    setCentrePicker]    = useState("");   // ZN-38: controlled select reset

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const loadZones = async () => {
    setLoading(true);
    try {
      // Fetch LE first to get leCode, then fetch zones with it
      const le = await authGet(`${API_BASE_URL}/api/Settings/LegalEntity`);
      const leCode = le?.leCode || "";
      if (le?.leCode) {
        setLegalEntities([le]);
        setForm(p => ({ ...p, leCode: le.leCode }));
      }
      const zs = await authGet(`${API_BASE_URL}/api/Settings/Zone/List?leCode=${leCode}`);
      setZones(Array.isArray(zs) ? zs : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadZones(); }, []);

  // ZN-43: track whether form is "settled" before fetching available centres
  const [formReady, setFormReady] = useState(false);

  useEffect(() => {
    if (!form.leCode || !formReady) return;
    authGet(`${API_BASE_URL}/api/Settings/Zone/AvailableCentres?leCode=${form.leCode}&excludeZone=${encodeURIComponent(form.zoneName || "")}`)
      .then(data => setAvailableCentres(Array.isArray(data) ? data : []));
  }, [form.leCode, form.zoneName, formReady]);

  const handleNew = () => {
    setSelected(null);
    const le = legalEntities[0];
    setForm({ ...EMPTY_FORM, leCode: le?.leCode || "" });
    setMappedCentres([]);
    setSaveAttempted(false);
    setErrors({});
    setCentrePicker("");
    setFormReady(false);
    setShowForm(true);
    // ZN-43: defer formReady so effect fires once form is fully settled
    setTimeout(() => setFormReady(true), 0);
  };

  const handleEdit = async (zoneCode) => {
    setFormReady(false);   // ZN-43: pause effect until form is settled
    setSelected(zoneCode);
    const data = await authGet(`${API_BASE_URL}/api/Settings/Zone/${zoneCode}`);
    setForm({ zoneCode: data.zoneCode, zoneName: data.zoneName, displayName: data.displayName, leCode: data.leCode });
    setMappedCentres(data.centres || []);
    setSaveAttempted(false);
    setErrors({});
    setCentrePicker("");
    setShowForm(true);
    setTimeout(() => setFormReady(true), 0);
  };

  const addCentre = (centre) => {
    if (mappedCentres.find(c => c.centerCode === centre.centerCode)) return;
    setMappedCentres(p => [...p, centre]);
  };

  const removeCentre = (code) => setMappedCentres(p => p.filter(c => c.centerCode !== code));

  const validate = () => {
    const e = {};
    if (!form.zoneCode?.trim() || form.zoneCode.length !== 4) e.zoneCode    = "Zone Code must be exactly 4 characters.";
    if (!form.zoneName?.trim())   e.zoneName    = "Zone Name is required.";
    if (!form.displayName?.trim())e.displayName = "Display Name is required.";
    if (!form.leCode)             e.leCode      = "Legal Entity is required.";
    if (!mappedCentres.length)    e.centres     = "At least one Centre must be mapped.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    setSaveAttempted(true);
    if (!validate()) return;
    setSaving(true);
    try {
      const u = getUser();
      const payload = { ...form, centres: mappedCentres, createdBy: u.employeeCode || "" };
      const res = selected
        ? await authPut(`${API_BASE_URL}/api/Settings/Zone/${selected}`, payload)
        : await authPost(`${API_BASE_URL}/api/Settings/Zone/Create`, payload);
      if (!res.success) throw new Error(res.message);
      showToast(res.message || "Zone saved.");
      setShowForm(false);
      loadZones();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (zoneCode) => {
    try {
      const res = await authDel(`${API_BASE_URL}/api/Settings/Zone/${zoneCode}`);
      if (!res.success) throw new Error(res.message);
      showToast(res.message);
      setConfirmDelete(null);
      loadZones();
    } catch (e) { showToast(e.message, "error"); }
  };

  const F = (k) => form[k];
  const S = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // Available centres not yet mapped
  const unmapped = availableCentres.filter(c => !mappedCentres.find(m => m.centerCode === c.centerCode));


  // ── Access Guard ─────────────────────────────────────────────────────────────
  if (!isAdmin) return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      minHeight:"60vh", fontFamily:"Lato,sans-serif", gap:12,
    }}>
      <div style={{ fontSize:48 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:800, color:"#b91c1c" }}>Access Denied</div>
      <div style={{ fontSize:13, color:"#64748b", textAlign:"center", maxWidth:380 }}>
        You do not have permission to access this page.<br/>
        This area is restricted to <strong>Admin</strong> and <strong>Product Team</strong> users only.
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"Lato,sans-serif", background:"#f7f9fc", minHeight:"100vh", color:"#10223f" }}>
      {!canEdit && (
        <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13,
          background:"#f0f4fa", border:"1px solid #c8d5e8", color:"#334b71", fontWeight:600 }}>
          👁 View Only — Only Admins at entity level can make changes.
        </div>
      )}

      <style>{`
        .zs-wrap { max-width:1000px; margin:0 auto; padding:28px 20px 60px; }
        .zs-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .zs-title { font-size:22px; font-weight:800; color:#071D49; }
        .zs-sub { font-size:13px; color:#64748b; margin-top:2px; }
        .card { background:#fff; border:1px solid #e7ecf4; border-radius:12px; padding:20px; margin-bottom:14px; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .field { display:flex; flex-direction:column; gap:5px; }
        .field label { font-size:12px; font-weight:700; color:#2a3b57; }
        .field input,.field select { border:1px solid #e7ecf4; border-radius:8px; padding:10px 12px; font-size:13px; outline:none; width:100%; box-sizing:border-box; }
        .field input:focus,.field select:focus { border-color:#334b71; }
        .field .err { color:#b91c1c; font-size:11px; }
        .primary-btn { background:#334b71; color:#fff; border:none; border-radius:10px; padding:10px 22px; font-weight:800; font-size:13px; cursor:pointer; }
        .primary-btn:disabled { opacity:0.55; cursor:not-allowed; }
        .ghost-btn { background:#fff; border:1px solid #e7ecf4; border-radius:10px; padding:10px 18px; font-weight:700; font-size:13px; color:#334b71; cursor:pointer; }
        .danger-btn { background:#fff; border:1px solid #f0c4c0; border-radius:8px; padding:7px 14px; font-weight:700; font-size:12px; color:#b91c1c; cursor:pointer; }
        .zone-row { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid #f1f5f9; }
        .zone-row:last-child { border-bottom:none; }
        .zone-badge { background:#e9edf5; color:#334b71; border-radius:999px; padding:3px 10px; font-size:11px; font-weight:700; }
        .centre-tag { display:inline-flex; align-items:center; gap:6px; background:#e9edf5; color:#334b71; border:1px solid #e2e8f0; padding:5px 10px; border-radius:20px; font-size:12px; font-weight:600; margin:3px; }
        .del-tag { background:none; border:none; color:#b91c1c; cursor:pointer; font-size:14px; line-height:1; padding:0; }
      `}</style>

      <div className="zs-wrap">
        {/* Header */}
        <div className="zs-header">
          <div>
            <div className="zs-title"> Zone Setup</div>
            <div className="zs-sub">Define operational zones and map centres to them</div>
          </div>
          {canCreate && <button className="primary-btn" onClick={handleNew}>+ Create Zone</button>}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:8, fontWeight:600, fontSize:13,
            background:toast.type==="error"?"#fdf3f3":"#e6f4ef",
            border:`1px solid ${toast.type==="error"?"#f0c4c0":"#b3d9cc"}`,
            color:toast.type==="error"?"#b91c1c":"#2e7d5e" }}>
            {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
          </div>
        )}

        {/* Zone List */}
        <div className="card">
          <div style={{ fontWeight:800, fontSize:15, color:"#071D49", marginBottom:14 }}>
            Zones {!loading && `(${zones.length})`}
          </div>
          {loading ? (
            <div style={{ textAlign:"center", padding:30, color:"#64748b" }}>Loading zones…</div>
          ) : zones.length === 0 ? (
            <div style={{ textAlign:"center", padding:30, color:"#94a3b8" }}>
              <div style={{ fontSize:32, marginBottom:8 }}></div>
              No zones created yet. Click "+ Create Zone" to get started.
            </div>
          ) : zones.map(z => (
            <div key={z.zoneCode} className="zone-row">
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:"#334b71" }}>
                  {z.zoneName}
                  <span style={{ marginLeft:8, fontSize:11, color:"#94a3b8", fontWeight:400 }}>({z.zoneCode})</span>
                </div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                  {z.displayName} · <span className="zone-badge">{z.centreCount} centre{z.centreCount!==1?"s":""}</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="ghost-btn" style={{ padding:"7px 14px", fontSize:12 }} onClick={()=>{ if(canEdit) handleEdit(z.zoneCode); }}>Edit</button>
                {canDelete && <button className="danger-btn" onClick={() => setConfirmDelete(z)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <div className="card">
            <div style={{ fontWeight:800, fontSize:15, color:"#071D49", marginBottom:16 }}>
              {selected ? "✏️ Edit Zone" : "➕ Create Zone"}
            </div>

            {/* Basic Info */}
            <div style={{ border:"1px solid #e7ecf4", borderRadius:10, padding:16, marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:13, color:"#071D49", marginBottom:12 }}> Basic Zone Information</div>
              <div className="grid-2">
                <div className="field">
                  <label>Legal Entity Code *</label>
                  <select value={F("leCode")} onChange={S("leCode")} disabled={!!selected}
                    style={{ background:selected?"#f8fafc":"#fff", borderColor:saveAttempted&&errors.leCode?"#b91c1c":undefined }}>
                    <option value="">Select legal entity…</option>
                    {legalEntities.map(le => <option key={le.leCode} value={le.leCode}>{le.leName} ({le.leCode})</option>)}
                  </select>
                  {saveAttempted && errors.leCode && <span className="err">{errors.leCode}</span>}
                </div>
                <div className="field">
                  <label>Zone Code * <span style={{ color:"#94a3b8", fontWeight:400 }}>(exactly 4 chars)</span></label>
                  <input value={F("zoneCode")} maxLength={4} readOnly={!!selected}
                    onChange={e => !selected && setForm(p => ({ ...p, zoneCode: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() }))}
                    style={{ background:selected?"#f8fafc":"#fff", borderColor:saveAttempted&&errors.zoneCode?"#b91c1c":undefined }}
                    placeholder="e.g. NRTH" />
                  {saveAttempted && errors.zoneCode && <span className="err">{errors.zoneCode}</span>}
                </div>
                <div className="field">
                  <label>Name * <span style={{ color:"#94a3b8", fontWeight:400 }}>(max 60 chars)</span></label>
                  <input value={F("zoneName")} maxLength={60} onChange={S("zoneName")}
                    style={{ borderColor:saveAttempted&&errors.zoneName?"#b91c1c":undefined }}
                    placeholder="e.g. North Zone" />
                  {saveAttempted && errors.zoneName && <span className="err">{errors.zoneName}</span>}
                </div>
                <div className="field">
                  <label>Display Name * <span style={{ color:"#94a3b8", fontWeight:400 }}>(max 20 chars)</span></label>
                  <input value={F("displayName")} maxLength={20} onChange={S("displayName")}
                    style={{ borderColor:saveAttempted&&errors.displayName?"#b91c1c":undefined }}
                    placeholder="e.g. North" />
                  {saveAttempted && errors.displayName && <span className="err">{errors.displayName}</span>}
                </div>
              </div>
            </div>

            {/* Centre Mapping */}
            <div style={{ border:"1px solid #e7ecf4", borderRadius:10, padding:16, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#071D49" }}> Centre Mapping</div>
                  <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Link centres to this zone. Each centre can only belong to one zone.</div>
                </div>
              </div>

              {/* Dropdown to add centre */}
              <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                <select style={{ flex:1, border:"1px solid #e7ecf4", borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none" }}
                  value={centrePicker}
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) return;
                    const centre = availableCentres.find(c => c.centerCode === val);
                    if (centre) addCentre(centre);
                    setCentrePicker("");  // ZN-38: reset to placeholder
                  }}>
                  <option value="">+ Add Centre…</option>
                  {unmapped.map(c => (
                    <option key={c.centerCode} value={c.centerCode}>{c.centreName} ({c.centerCode})</option>
                  ))}
                </select>
              </div>

              {/* Mapped centres */}
              {mappedCentres.length === 0 ? (
                <div style={{ color:"#94a3b8", fontSize:12, padding:"8px 0" }}>No centres mapped yet.</div>
              ) : (
                <div>
                  {mappedCentres.map(c => (
                    <span key={c.centerCode} className="centre-tag">
                       {c.centreName} <span style={{ color:"#94a3b8" }}>({c.centerCode})</span>
                      <button className="del-tag" onClick={() => removeCentre(c.centerCode)}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {saveAttempted && errors.centres && (
                <div style={{ color:"#b91c1c", fontSize:12, marginTop:8 }}>⚠ {errors.centres}</div>
              )}

              <div style={{ marginTop:12, padding:"10px 14px", background:"#e9edf5", borderRadius:8, fontSize:12, color:"#334b71" }}>
                Hierarchy: Legal Entity → Zone → Centre. Centre codes must exist in the Centre Master.
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
              <button className="ghost-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="primary-btn" onClick={() => { if(!canEdit) return; handleSave(); }} disabled={saving}>
                {saving ? "Saving…" : ` ${selected ? "Update Zone" : "Save Zone"}`}
              </button>
            </div>
          </div>
        )}

        {/* Confirm Delete Dialog */}
        {confirmDelete && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
            <div style={{ background:"#fff", borderRadius:14, padding:28, maxWidth:400, width:"90%", textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
              <div style={{ fontWeight:800, fontSize:16, color:"#334b71", marginBottom:8 }}>Delete Zone?</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
                Deleting <strong>{confirmDelete.zoneName}</strong> will reset all mapped centres back to <strong>No Zone</strong>. This cannot be undone.
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
                <button className="ghost-btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
                {canDelete && (<button style={{ background:"#b91c1c", color:"#fff", border:"none", borderRadius:10, padding:"10px 22px", fontWeight:800, fontSize:13, cursor:"pointer" }}
                  onClick={()=>{ if(canDelete) handleDelete(confirmDelete.zoneCode); }}>
                  Yes, Delete
                </button>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}