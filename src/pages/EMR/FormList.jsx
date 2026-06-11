import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); }
  catch { return {}; }
};

// Only Admin/ProductTeam users at entity level can create or delete forms
const getFormRights = () => {
  const u    = getUser();
  const role = (u.role || u.userRole || u.securityRole || "").toLowerCase().replace(/\s+/g, "");
  const ALLOWED = ["admin", "productteam"];
  const isAdmin       = ALLOWED.includes(role);
  const isEntityLevel = u.isEntityLevel === true;  // strict — entity level only, no fallback
  const canManage     = isAdmin && isEntityLevel;
  return { isAdmin, canCreate: canManage, canDelete: canManage };
};
const authGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json(); return j.data ?? j;
};
const authPost = async (url, body) => {
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body: JSON.stringify(body) });
  return r.json();
};
const authDelete = async (url) => {
  const r = await fetch(url, { method:"DELETE", headers:{ Authorization:`Bearer ${TOKEN()}` } });
  const j = await r.json(); return j;
};

const FORM_TYPES = ["Consent/Treatment", "Customer"];
const STATUSES   = ["Active", "Inactive"];

export default function FormList() {
  const navigate = useNavigate();
  const [forms,      setForms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStat, setFilterStat] = useState("Active");
  const [showCreate, setShowCreate] = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [toast,      setToast]      = useState(null);
  const [newForm,    setNewForm]    = useState({ formCode:"", formName:"", formType:"Consent/Treatment" });
  const [errors,     setErrors]     = useState({});
  const [deleting,   setDeleting]   = useState(null); // formCode being deleted

  const { canCreate, canDelete } = getFormRights();

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.append("formType", filterType);
    if (filterStat) params.append("status",   filterStat);
    authGet(`${API_BASE_URL}/api/EMR/Forms/List?${params}`)
      .then(data => setForms(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterType, filterStat]);

  const handleDelete = async (e, formCode, formName) => {
    e.stopPropagation(); // prevent row click navigating to builder
    if (!window.confirm(`Delete form "${formName}" (${formCode})? This cannot be undone.`)) return;
    setDeleting(formCode);
    try {
      const res = await authDelete(`${API_BASE_URL}/api/EMR/Forms/${formCode}`);
      if (res.success !== false) {
        showToast(`Form "${formName}" deleted.`, "success");
        load(); // refresh list
      } else {
        showToast(res.message || "Delete failed.", "error");
      }
    } catch {
      showToast("Delete failed.", "error");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = forms.filter(f =>
    !search || f.formName?.toLowerCase().includes(search.toLowerCase()) ||
               f.formCode?.toLowerCase().includes(search.toLowerCase())
  );

  // FC-009: Draft save — Form Name only required
  // Publish — Form Code + Form Name + Form Type all required
  const doCreate = async (asDraft) => {
    const e = {};
    if (!newForm.formName?.trim()) e.formName = "Form Name is required.";

    if (!asDraft) {
      // Publish requires all fields
      if (!newForm.formCode?.trim())      e.formCode = "Form Code is required.";
      if (newForm.formCode?.length !== 4) e.formCode = "Form Code must be exactly 4 characters.";
      if (!newForm.formType)              e.formType = "Form Type is required.";
    }

    setErrors(e);
    if (Object.keys(e).length) return;

    // For draft: auto-generate a temp formCode if not provided
    const formCode = newForm.formCode?.trim()
      ? newForm.formCode.trim().toUpperCase()
      : "D" + Date.now().toString().slice(-3);  // e.g. D123 — unique temp draft code

    setCreating(true);
    try {
      const res = await authPost(`${API_BASE_URL}/api/EMR/Forms/Create`, {
        formCode: formCode,
        formName: newForm.formName.trim(),
        formType: newForm.formType || "Consent/Treatment",
        status:   asDraft ? "Draft" : "Active",
      });
      if (!res.success) throw new Error(res.message);
      showToast(asDraft ? "Form saved as draft." : (res.message || "Form created."));
      setShowCreate(false);
      setNewForm({ formCode:"", formName:"", formType:"Consent/Treatment" });
      // Navigate to builder in both cases
      navigate(`/emr/builder/${res.data?.formCode || formCode}`);
    } catch (err) { showToast(err.message, "error"); }
    finally { setCreating(false); }
  };

  const handleSaveDraft = () => doCreate(true);
  const handleCreate    = () => doCreate(false);

  const typeColor = (t) => t === "Consent/Treatment"
    ? { bg:"#e9edf5", color:"#334b71" }
    : { bg:"#e6f4ef", color:"#2e7d5e" };

  const statColor = (s) => s === "Active"
    ? { bg:"#dcfce7", color:"#166534" }
    : { bg:"#f1f5f9", color:"#64748b" };

  return (
    <div style={{ fontFamily:"Lato,sans-serif", background:"#f7f9fc", minHeight:"100vh" }}>
      <style>{`
        .fl-wrap { max-width:1000px; margin:0 auto; padding:28px 20px 60px; }
        .fl-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
        .fl-title { font-size:22px; font-weight:800; color:#071D49; }
        .fl-sub { font-size:13px; color:#64748b; margin-top:2px; }
        .pri-btn { background:#334b71; color:#fff; border:none; border-radius:10px; padding:10px 22px; font-weight:800; font-size:13px; cursor:pointer; }
        .pri-btn:disabled { opacity:.55; cursor:not-allowed; }
        .ghost-btn { background:#fff; border:1px solid #e7ecf4; border-radius:10px; padding:9px 18px; font-weight:700; font-size:13px; color:#334b71; cursor:pointer; }
        .card { background:#fff; border:1px solid #e7ecf4; border-radius:12px; padding:20px; margin-bottom:14px; }
        .form-row { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background .1s; }
        .form-row:last-child { border-bottom:none; }
        .form-row:hover { background:#f8fafc; }
        .badge { border-radius:999px; padding:3px 10px; font-size:11px; font-weight:700; }
        .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
        .field label { font-size:12px; font-weight:700; color:#2a3b57; }
        .field input, .field select { border:1px solid #e7ecf4; border-radius:8px; padding:10px 12px; font-size:13px; outline:none; }
        .field input:focus, .field select:focus { border-color:#334b71; }
        .err { color:#b91c1c; font-size:11px; margin-top:2px; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:9999; }
        .modal { background:#fff; border-radius:14px; padding:28px; max-width:440px; width:90%; }
      `}</style>

      <div className="fl-wrap">
        {/* Header */}
        <div className="fl-header">
          <div>
            <div className="fl-title">📋 EMR Forms</div>
            <div className="fl-sub">Create and manage electronic medical record forms</div>
          </div>
          {canCreate && (
            <button className="pri-btn" onClick={() => setShowCreate(true)}>+ Create Form</button>
          )}
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

        {/* Filters */}
        <div className="card" style={{ padding:"14px 16px", marginBottom:14 }}>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
            <input placeholder="Search forms…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex:1, minWidth:200, border:"1px solid #e7ecf4", borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none" }} />
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ border:"1px solid #e7ecf4", borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none" }}>
              <option value="">All Types</option>
              {FORM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStat} onChange={e => setFilterStat(e.target.value)}
              style={{ border:"1px solid #e7ecf4", borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none" }}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Form list */}
        <div className="card" style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #f1f5f9", fontWeight:800, fontSize:14, color:"#071D49" }}>
            Forms {!loading && `(${filtered.length})`}
          </div>
          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>Loading forms…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:40, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
              <div style={{ fontWeight:700, fontSize:14, color:"#334b71", marginBottom:4 }}>No forms found</div>
              <div style={{ fontSize:13, color:"#94a3b8" }}>Click "+ Create Form" to get started.</div>
            </div>
          ) : filtered.map(f => {
            const tc = typeColor(f.formType);
            const sc = statColor(f.status);
            return (
              <div key={f.formCode} className="form-row"
                onClick={() => navigate(`/emr/builder/${f.formCode}`)}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:"#334b71" }}>
                    {f.formName}
                    <span style={{ marginLeft:8, fontSize:11, color:"#94a3b8", fontWeight:400 }}>({f.formCode})</span>
                  </div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>
                    {new Date(f.createdDate).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span className="badge" style={{ background:tc.bg, color:tc.color }}>{f.formType}</span>
                  <span className="badge" style={{ background:sc.bg, color:sc.color }}>{f.status}</span>
                  {canDelete && (
                    <button
                      onClick={(e) => handleDelete(e, f.formCode, f.formName)}
                      disabled={deleting === f.formCode}
                      title="Delete form"
                      style={{
                        background:"#fef2f2", border:"1px solid #fecaca", borderRadius:6,
                        padding:"4px 8px", cursor:"pointer", fontSize:14, color:"#dc2626",
                        opacity: deleting === f.formCode ? 0.5 : 1,
                        flexShrink:0, lineHeight:1,
                      }}>
                      {deleting === f.formCode ? "…" : "🗑"}
                    </button>
                  )}
                  <span style={{ fontSize:18, color:"#94a3b8" }}>›</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:17, color:"#071D49", marginBottom:4 }}>Create New Form</div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>Form Type is locked after creation.</div>

            <div className="field">
              <label>
                Form Code
                <span style={{ color:"#94a3b8", fontWeight:400, marginLeft:4 }}>
                  (exactly 4 characters — required to publish)
                </span>
              </label>
              <input value={newForm.formCode} maxLength={4}
                onChange={e => setNewForm(p => ({ ...p, formCode: e.target.value.toUpperCase() }))}
                placeholder="e.g. EMR1"
                style={{ borderColor: errors.formCode ? "#b91c1c" : undefined }} />
              {errors.formCode && <span className="err">{errors.formCode}</span>}
              <span style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>
                Leave blank to save as draft — a temporary code will be assigned.
              </span>
            </div>

            <div className="field">
              <label>Form Name *</label>
              <input value={newForm.formName}
                onChange={e => setNewForm(p => ({ ...p, formName: e.target.value }))}
                placeholder="e.g. Laser Consent Form"
                style={{ borderColor: errors.formName ? "#b91c1c" : undefined }} />
              {errors.formName && <span className="err">{errors.formName}</span>}
            </div>

            <div className="field">
              <label>Form Type *</label>
              <select value={newForm.formType}
                onChange={e => setNewForm(p => ({ ...p, formType: e.target.value }))}
                style={{ borderColor: errors.formType ? "#b91c1c" : undefined }}>
                {FORM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.formType && <span className="err">{errors.formType}</span>}
            </div>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8, flexWrap:"wrap" }}>
              <button className="ghost-btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="ghost-btn" onClick={handleSaveDraft} disabled={creating}
                style={{ borderColor:"#c8d5e8", color:"#334b71" }}>
                {creating ? "Saving…" : "Save as Draft"}
              </button>
              <button className="pri-btn" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create & Build →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}