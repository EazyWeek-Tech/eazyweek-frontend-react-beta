// src/pages/Opportunity/DispositionMaster.jsx
import { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "../../config";

/* ── Theme ──────────────────────────────────────────────────────────────────── */
const C = {
  navy:"#334b71", navyDk:"#071D49", navyLt:"#e9edf5",
  border:"#e7ecf4", bg:"#f4f6fa", text:"#10223f", sub:"#64748b",
  green:"#166534", greenBg:"#dcfce7", red:"#b91c1c", redBg:"#fef2f2",
};

const TRANS_TYPES = ["Transaction","ManualLead","ExternalSource"];

/* ── API helpers ─────────────────────────────────────────────────────────────── */
const TOKEN    = () => localStorage.getItem("token")||sessionStorage.getItem("token")||"";
const authGet  = async (url) => {
  const r = await fetch(url, { headers:{ Authorization:`Bearer ${TOKEN()}` } });
  const j = await r.json(); return j.data ?? j;
};
const authPost = async (url, body) => {
  const r = await fetch(url,{ method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) });
  return r.json();
};
const authPut  = async (url, body) => {
  const r = await fetch(url,{ method:"PUT",  headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) });
  return r.json();
};
const authDel  = async (url) => {
  const r = await fetch(url, { method:"DELETE", headers:{ Authorization:`Bearer ${TOKEN()}` } });
  return r.json();
};

/* ════════════════════════════════════════════════════════════════════════════
   MODULE-LEVEL COMPONENTS — defined outside all other components (focus-loss rule)
   ════════════════════════════════════════════════════════════════════════════ */

function ActiveBadge({ active }) {
  return (
    <span style={{ background:active?C.greenBg:C.redBg, color:active?C.green:C.red,
      borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:700 }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ConvertBadge({ yes }) {
  return yes ? (
    <span style={{ background:"#eff6ff", color:"#1d4ed8", borderRadius:99,
      padding:"2px 10px", fontSize:11, fontWeight:700 }}>Applicable</span>
  ) : (
    <span style={{ background:C.navyLt, color:C.sub, borderRadius:99,
      padding:"2px 10px", fontSize:11, fontWeight:700 }}>—</span>
  );
}

function TransTypeBadge({ type }) {
  const map = {
    Transaction:    { bg:"#e0f2fe", c:"#0369a1" },
    ManualLead:     { bg:"#fef3c7", c:"#92400e" },
    ExternalSource: { bg:"#f3e8ff", c:"#7c3aed" },
  };
  const s = map[type] || { bg:C.navyLt, c:C.sub };
  return (
    <span style={{ background:s.bg, color:s.c, borderRadius:6,
      padding:"2px 9px", fontSize:11, fontWeight:700 }}>{type}</span>
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

function SectionHeader({ title, sub, onAdd, addLabel }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
      <div>
        <div style={{ fontWeight:800, fontSize:14, color:C.navyDk }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>{sub}</div>}
      </div>
      {onAdd && (
        <button onClick={onAdd}
          style={{ padding:"8px 16px", background:C.navy, color:"#fff", border:"none",
            borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
          + {addLabel||"Add"}
        </button>
      )}
    </div>
  );
}

// ── Inline editable row for tables ────────────────────────────────────────────
function InlineTextInput({ value, onChange }) {
  return (
    <input value={value} onChange={onChange}
      style={{ padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:6,
        fontSize:13, fontFamily:"Lato,sans-serif", outline:"none", width:"100%" }} />
  );
}

function InlineSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      style={{ padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:6,
        fontSize:13, fontFamily:"Lato,sans-serif", outline:"none" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ── Modal for Add / Edit ─────────────────────────────────────────────────────── */
function Modal({ title, children, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:9000,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:12, width:480, maxWidth:"95vw",
        boxShadow:"0 8px 30px rgba(0,0,0,.2)", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:800, fontSize:15, color:C.navyDk }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            fontSize:20, cursor:"pointer", color:C.sub, lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"20px" }}>{children}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, required, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.sub,
        textTransform:"uppercase", letterSpacing:".04em", marginBottom:4 }}>
        {label}{required && " *"}
      </label>
      {children}
    </div>
  );
}

function ModalInput({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder}
      style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`,
        borderRadius:8, fontSize:13, fontFamily:"Lato,sans-serif",
        outline:"none", boxSizing:"border-box" }} />
  );
}

function ModalSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`,
        borderRadius:8, fontSize:13, fontFamily:"Lato,sans-serif", outline:"none" }}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ToggleSwitch({ value, onChange, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
      <div onClick={onChange}
        style={{ width:44, height:24, borderRadius:24, background:value?C.navy:"#d3dbe8",
          position:"relative", cursor:"pointer", flexShrink:0 }}>
        <div style={{ width:18, height:18, background:"#fff", borderRadius:"50%",
          position:"absolute", top:3, left:value?23:3, transition:"all .2s",
          boxShadow:"0 1px 3px rgba(0,0,0,.25)" }} />
      </div>
      <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{label}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TABLE COMPONENTS
   ════════════════════════════════════════════════════════════════════════════ */

function TH({ children, right }) {
  return (
    <th style={{ padding:"10px 14px", background:"#f4f6fa", fontWeight:800, fontSize:11,
      color:C.navy, textTransform:"uppercase", letterSpacing:".04em",
      borderBottom:`2px solid ${C.border}`, textAlign:right?"right":"left",
      whiteSpace:"nowrap" }}>
      {children}
    </th>
  );
}

function TD({ children, right }) {
  return (
    <td style={{ padding:"11px 14px", fontSize:13, color:C.text,
      borderBottom:`1px solid #f1f5f9`, textAlign:right?"right":"left" }}>
      {children}
    </td>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding:"4px 10px", border:`1px solid ${color}33`, borderRadius:6,
        background:`${color}11`, color, fontSize:11, fontWeight:700, cursor:"pointer",
        marginRight:4 }}>
      {label}
    </button>
  );
}

function EmptyRow({ cols, msg }) {
  return (
    <tr><td colSpan={cols} style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>
      {msg || "No records found."}
    </td></tr>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
const BASE = `${API_BASE_URL}/api/Disposition`;

export default function DispositionMaster() {
  const [activeTab,      setActiveTab]      = useState("leadStatus");
  const [toast,          setToast]          = useState(null);

  // Data
  const [leadStatuses,   setLeadStatuses]   = useState([]);
  const [leadSubStatuses,setLeadSubStatuses]= useState([]);
  const [dispositions,   setDispositions]   = useState([]);
  const [subDispositions,setSubDispositions]= useState([]);
  const [rules,          setRules]          = useState([]);

  // Filters
  const [transTypeFilter,   setTransTypeFilter]   = useState("");
  const [leadCodeFilter,    setLeadCodeFilter]     = useState("");
  const [dispIdFilter,      setDispIdFilter]       = useState("");

  // Modal
  const [modal,  setModal]  = useState(null); // { type, data }
  const [saving, setSaving] = useState(false);

  const showToast = (message, type="success") => {
    setToast({message,type}); setTimeout(()=>setToast(null),3500);
  };
  const closeModal = () => setModal(null);

  /* Loaders */
  const loadLeadStatuses    = () => authGet(`${BASE}/LeadStatus${transTypeFilter?`?transType=${transTypeFilter}`:""}`).then(d=>setLeadStatuses(Array.isArray(d)?d:[]));
  const loadLeadSubStatuses = () => authGet(`${BASE}/LeadSubStatus${leadCodeFilter?`?leadStatusCode=${leadCodeFilter}`:""}`).then(d=>setLeadSubStatuses(Array.isArray(d)?d:[]));
  const loadDispositions    = () => authGet(`${BASE}/ManualDisposition`).then(d=>setDispositions(Array.isArray(d)?d:[]));
  const loadSubDispositions = () => authGet(`${BASE}/ManualSubDisposition${dispIdFilter?`?dispositionId=${dispIdFilter}`:""}`).then(d=>setSubDispositions(Array.isArray(d)?d:[]));
  const loadRules           = () => authGet(`${BASE}/Rules`).then(d=>setRules(Array.isArray(d)?d:[]));

  useEffect(() => { loadLeadStatuses(); loadDispositions(); loadRules(); }, []);
  useEffect(() => { loadLeadStatuses(); }, [transTypeFilter]);
  useEffect(() => { loadLeadSubStatuses(); }, [leadCodeFilter]);
  useEffect(() => { loadSubDispositions(); }, [dispIdFilter]);

  /* Saved action */
  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      let res;
      const { type, data, id } = modal;

      if (type === "leadStatus") {
        res = id ? await authPut(`${BASE}/LeadStatus/${id}`, data) : await authPost(`${BASE}/LeadStatus`, data);
        await loadLeadStatuses();
      } else if (type === "leadSubStatus") {
        res = id ? await authPut(`${BASE}/LeadSubStatus/${id}`, data) : await authPost(`${BASE}/LeadSubStatus`, data);
        await loadLeadSubStatuses();
      } else if (type === "disposition") {
        res = id ? await authPut(`${BASE}/ManualDisposition/${id}`, data) : await authPost(`${BASE}/ManualDisposition`, data);
        await loadDispositions();
      } else if (type === "subDisposition") {
        res = id ? await authPut(`${BASE}/ManualSubDisposition/${id}`, data) : await authPost(`${BASE}/ManualSubDisposition`, data);
        await loadSubDispositions();
      }

      if (res?.success === false) throw new Error(res.message);
      showToast(res?.message || "Saved successfully.");
      closeModal();
    } catch(e) { showToast(e.message||"Save failed.","error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (type, id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      let res;
      if (type==="leadStatus")     { res = await authDel(`${BASE}/LeadStatus/${id}`);     await loadLeadStatuses(); }
      if (type==="leadSubStatus")  { res = await authDel(`${BASE}/LeadSubStatus/${id}`);  await loadLeadSubStatuses(); }
      if (type==="disposition")    { res = await authDel(`${BASE}/ManualDisposition/${id}`); await loadDispositions(); }
      if (type==="subDisposition") { res = await authDel(`${BASE}/ManualSubDisposition/${id}`); await loadSubDispositions(); }
      if (res?.success===false) throw new Error(res.message);
      showToast(res?.message||"Deleted.");
    } catch(e) { showToast(e.message||"Delete failed.","error"); }
  };

  /* Tab buttons */
  const Tab = ({ id, label }) => (
    <button onClick={()=>setActiveTab(id)}
      style={{ padding:"10px 18px", border:"none", background:"none",
        fontWeight:700, fontSize:13, cursor:"pointer", borderBottom:`3px solid ${activeTab===id?C.navy:"transparent"}`,
        color:activeTab===id?C.navy:C.sub, transition:"all .1s" }}>
      {label}
    </button>
  );

  /* ── Render ── */
  return (
    <div style={{ fontFamily:"Lato,sans-serif", padding:"0 10px", color:C.text }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:22, color:C.navyDk }}> Disposition Master</div>
        <div style={{ fontSize:13, color:C.sub, marginTop:3 }}>
          Manage dispositions for R1–R7 rules and Manual Lead campaigns
        </div>
      </div>

      {/* Rules reference bar */}
      {rules.length > 0 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
          {rules.map(r=>(
            <span key={r.recId} style={{ background:"#fff", border:`1px solid ${C.border}`,
              borderRadius:8, padding:"4px 12px", fontSize:12, fontWeight:700, color:C.navy }}>
              {r.ruleCode} · {r.ruleName} · <span style={{ color:C.sub }}>{r.ruleType}</span>
            </span>
          ))}
          <span style={{ background:"#fef3c7", border:"1px solid #fcd34d",
            borderRadius:8, padding:"4px 12px", fontSize:12, fontWeight:700, color:"#92400e" }}>
            Manual Lead · Manual Lead Type
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`2px solid ${C.border}`, marginBottom:20 }}>
        <Tab id="leadStatus"     label="R1-R7 Dispositions" />
        <Tab id="leadSubStatus"  label="R1-R7 Sub-Dispositions" />
        <Tab id="disposition"    label="Manual Lead Dispositions" />
        <Tab id="subDisposition" label="Manual Lead Sub-Dispositions" />
      </div>

      {/* ── TAB: R1-R7 Lead Status ─────────────────────────────────────────── */}
      {activeTab === "leadStatus" && (
        <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
          boxShadow:"0 1px 6px rgba(0,0,0,.05)", overflow:"hidden" }}>
          <SectionHeader title="R1-R7 Dispositions" sub="Used for Transaction, ExternalSource and ManualLead rule types (CLINIC_LEADSTATUS)"
            onAdd={()=>setModal({type:"leadStatus",data:{name:"",code:"",transType:"Transaction",convertIsApplicable:false,active:true}})}
            addLabel="Add Disposition" />
          {/* Filter */}
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", gap:12 }}>
            <label style={{ fontSize:13, fontWeight:600, color:C.sub }}>Filter by Type:</label>
            <select value={transTypeFilter} onChange={e=>setTransTypeFilter(e.target.value)}
              style={{ padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, outline:"none" }}>
              <option value="">All Types</option>
              {TRANS_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                <TH>Code</TH><TH>Name</TH><TH>Type</TH>
                <TH>Convert Applicable</TH><TH>Status</TH><TH>Actions</TH>
              </tr></thead>
              <tbody>
                {leadStatuses.length===0 ? <EmptyRow cols={6}/> :
                  leadStatuses.map((s,i)=>(
                    <tr key={s.recId} style={{ background:i%2===0?"#fff":"#fafbfd" }}>
                      <TD><span style={{ fontFamily:"monospace", fontWeight:700, color:C.navy }}>{s.code}</span></TD>
                      <TD>{s.name}</TD>
                      <TD><TransTypeBadge type={s.transType}/></TD>
                      <TD><ConvertBadge yes={s.convertIsApplicable}/></TD>
                      <TD><ActiveBadge active={s.active}/></TD>
                      <TD>
                        <ActionBtn label="Edit" color={C.navy}
                          onClick={()=>setModal({type:"leadStatus",id:s.recId,
                            data:{name:s.name,transType:s.transType,convertIsApplicable:s.convertIsApplicable,active:s.active}})} />
                        <ActionBtn label="Delete" color={C.red}
                          onClick={()=>handleDelete("leadStatus",s.recId,s.name)} />
                      </TD>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: R1-R7 Sub-Status ──────────────────────────────────────────── */}
      {activeTab === "leadSubStatus" && (
        <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
          boxShadow:"0 1px 6px rgba(0,0,0,.05)", overflow:"hidden" }}>
          <SectionHeader title="R1-R7 Sub-Dispositions" sub="CLINIC_LEADSUBSTATUS — linked to parent dispositions by CODE"
            onAdd={()=>setModal({type:"leadSubStatus",data:{name:"",code:"",leadStatusCode:"",active:true}})}
            addLabel="Add Sub-Disposition" />
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", gap:12 }}>
            <label style={{ fontSize:13, fontWeight:600, color:C.sub }}>Filter by Parent Code:</label>
            <select value={leadCodeFilter} onChange={e=>setLeadCodeFilter(e.target.value)}
              style={{ padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, outline:"none" }}>
              <option value="">All</option>
              {[...new Set(leadStatuses.map(s=>s.code))].map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                <TH>Code</TH><TH>Name</TH><TH>Parent Disposition</TH><TH>Status</TH><TH>Actions</TH>
              </tr></thead>
              <tbody>
                {leadSubStatuses.length===0 ? <EmptyRow cols={5}/> :
                  leadSubStatuses.map((s,i)=>(
                    <tr key={s.recId} style={{ background:i%2===0?"#fff":"#fafbfd" }}>
                      <TD><span style={{ fontFamily:"monospace", fontWeight:700, color:C.navy }}>{s.code}</span></TD>
                      <TD>{s.name}</TD>
                      <TD><span style={{ background:C.navyLt, color:C.navy, borderRadius:6,
                        padding:"2px 8px", fontSize:11, fontWeight:700 }}>{s.leadStatusCode}</span>
                        {s.parentName && <span style={{ color:C.sub, fontSize:12, marginLeft:6 }}>({s.parentName})</span>}
                      </TD>
                      <TD><ActiveBadge active={s.active}/></TD>
                      <TD>
                        <ActionBtn label="Edit" color={C.navy}
                          onClick={()=>setModal({type:"leadSubStatus",id:s.recId,
                            data:{name:s.name,leadStatusCode:s.leadStatusCode,active:s.active}})} />
                        <ActionBtn label="Delete" color={C.red}
                          onClick={()=>handleDelete("leadSubStatus",s.recId,s.name)} />
                      </TD>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Manual Lead Dispositions ─────────────────────────────────── */}
      {activeTab === "disposition" && (
        <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
          boxShadow:"0 1px 6px rgba(0,0,0,.05)", overflow:"hidden" }}>
          <SectionHeader title="Manual Lead Dispositions" sub="Dispositions table — used exclusively for Manual Lead campaigns"
            onAdd={()=>setModal({type:"disposition",data:{dispositionName:"",isActive:true}})}
            addLabel="Add Disposition" />
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr><TH>ID</TH><TH>Name</TH><TH>Status</TH><TH>Created</TH><TH>Actions</TH></tr></thead>
              <tbody>
                {dispositions.length===0 ? <EmptyRow cols={5}/> :
                  dispositions.map((d,i)=>(
                    <tr key={d.dispositionId} style={{ background:i%2===0?"#fff":"#fafbfd" }}>
                      <TD><span style={{ fontFamily:"monospace", fontWeight:700, color:C.navy }}>{d.dispositionId}</span></TD>
                      <TD>{d.dispositionName}</TD>
                      <TD><ActiveBadge active={d.isActive}/></TD>
                      <TD><span style={{ color:C.sub, fontSize:12 }}>{d.createdDate?.slice(0,10)||""}</span></TD>
                      <TD>
                        <ActionBtn label="Edit" color={C.navy}
                          onClick={()=>setModal({type:"disposition",id:d.dispositionId,
                            data:{dispositionName:d.dispositionName,isActive:d.isActive}})} />
                        <ActionBtn label="Delete" color={C.red}
                          onClick={()=>handleDelete("disposition",d.dispositionId,d.dispositionName)} />
                      </TD>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Manual Sub-Dispositions ──────────────────────────────────── */}
      {activeTab === "subDisposition" && (
        <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
          boxShadow:"0 1px 6px rgba(0,0,0,.05)", overflow:"hidden" }}>
          <SectionHeader title="Manual Lead Sub-Dispositions" sub="SubDispositions table — linked to Manual Lead dispositions"
            onAdd={()=>setModal({type:"subDisposition",data:{subDispositionName:"",dispositionId:"",isActive:true}})}
            addLabel="Add Sub-Disposition" />
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", gap:12 }}>
            <label style={{ fontSize:13, fontWeight:600, color:C.sub }}>Filter by Disposition:</label>
            <select value={dispIdFilter} onChange={e=>setDispIdFilter(e.target.value)}
              style={{ padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, outline:"none" }}>
              <option value="">All</option>
              {dispositions.map(d=><option key={d.dispositionId} value={d.dispositionId}>{d.dispositionName}</option>)}
            </select>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr><TH>ID</TH><TH>Name</TH><TH>Parent Disposition</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
              <tbody>
                {subDispositions.length===0 ? <EmptyRow cols={5}/> :
                  subDispositions.map((s,i)=>(
                    <tr key={s.subDispositionId} style={{ background:i%2===0?"#fff":"#fafbfd" }}>
                      <TD><span style={{ fontFamily:"monospace", fontWeight:700, color:C.navy }}>{s.subDispositionId}</span></TD>
                      <TD>{s.subDispositionName}</TD>
                      <TD><span style={{ background:"#fef3c7", color:"#92400e", borderRadius:6,
                        padding:"2px 8px", fontSize:11, fontWeight:700 }}>{s.parentName}</span></TD>
                      <TD><ActiveBadge active={s.isActive}/></TD>
                      <TD>
                        <ActionBtn label="Edit" color={C.navy}
                          onClick={()=>setModal({type:"subDisposition",id:s.subDispositionId,
                            data:{subDispositionName:s.subDispositionName,dispositionId:s.dispositionId,isActive:s.isActive}})} />
                        <ActionBtn label="Delete" color={C.red}
                          onClick={()=>handleDelete("subDisposition",s.subDispositionId,s.subDispositionName)} />
                      </TD>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modal?.type === "leadStatus" && (
        <Modal title={`${modal.id?"Edit":"Add"} R1-R7 Disposition`} onClose={closeModal}>
          <FieldRow label="Code" required>
            <ModalInput value={modal.data.code||""} placeholder="e.g. LS015"
              onChange={e=>setModal(p=>({...p,data:{...p.data,code:e.target.value}}))} />
          </FieldRow>
          <FieldRow label="Name" required>
            <ModalInput value={modal.data.name} placeholder="e.g. Follow Up"
              onChange={e=>setModal(p=>({...p,data:{...p.data,name:e.target.value}}))} />
          </FieldRow>
          <FieldRow label="Transaction Type" required>
            <ModalSelect value={modal.data.transType}
              onChange={e=>setModal(p=>({...p,data:{...p.data,transType:e.target.value}}))}
              options={TRANS_TYPES.map(t=>({value:t,label:t}))} />
          </FieldRow>
          <ToggleSwitch value={modal.data.convertIsApplicable}
            onChange={()=>setModal(p=>({...p,data:{...p.data,convertIsApplicable:!p.data.convertIsApplicable}}))}
            label="Convert Is Applicable" />
          {modal.id && <ToggleSwitch value={modal.data.active}
            onChange={()=>setModal(p=>({...p,data:{...p.data,active:!p.data.active}}))}
            label="Active" />}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"10px 24px", background:C.navy, color:"#fff", border:"none",
                borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer", opacity:saving?.6:1 }}>
              {saving?"Saving…":modal.id?"Update":"Create"}
            </button>
            <button onClick={closeModal}
              style={{ padding:"10px 18px", background:"#f4f6fa", color:C.navy,
                border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:13, cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === "leadSubStatus" && (
        <Modal title={`${modal.id?"Edit":"Add"} R1-R7 Sub-Disposition`} onClose={closeModal}>
          <FieldRow label="Code">
            <ModalInput value={modal.data.code||""} placeholder="e.g. LS026"
              onChange={e=>setModal(p=>({...p,data:{...p.data,code:e.target.value}}))} />
          </FieldRow>
          <FieldRow label="Name" required>
            <ModalInput value={modal.data.name} placeholder="Sub-disposition name"
              onChange={e=>setModal(p=>({...p,data:{...p.data,name:e.target.value}}))} />
          </FieldRow>
          <FieldRow label="Parent Disposition Code" required>
            <ModalSelect value={modal.data.leadStatusCode}
              onChange={e=>setModal(p=>({...p,data:{...p.data,leadStatusCode:e.target.value}}))}
              options={[{value:"",label:"Select parent…"},
                ...[...new Set(leadStatuses.map(s=>s.code))].map(c=>{
                  const ls=leadStatuses.find(s=>s.code===c);
                  return {value:c,label:`${c} — ${ls?.name||""}`};
                })]} />
          </FieldRow>
          {modal.id && <ToggleSwitch value={modal.data.active}
            onChange={()=>setModal(p=>({...p,data:{...p.data,active:!p.data.active}}))}
            label="Active" />}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"10px 24px", background:C.navy, color:"#fff", border:"none",
                borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              {saving?"Saving…":modal.id?"Update":"Create"}
            </button>
            <button onClick={closeModal}
              style={{ padding:"10px 18px", background:"#f4f6fa", color:C.navy,
                border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:13, cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === "disposition" && (
        <Modal title={`${modal.id?"Edit":"Add"} Manual Lead Disposition`} onClose={closeModal}>
          <FieldRow label="Disposition Name" required>
            <ModalInput value={modal.data.dispositionName} placeholder="e.g. Converted"
              onChange={e=>setModal(p=>({...p,data:{...p.data,dispositionName:e.target.value}}))} />
          </FieldRow>
          {modal.id && <ToggleSwitch value={modal.data.isActive}
            onChange={()=>setModal(p=>({...p,data:{...p.data,isActive:!p.data.isActive}}))}
            label="Active" />}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"10px 24px", background:C.navy, color:"#fff", border:"none",
                borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              {saving?"Saving…":modal.id?"Update":"Create"}
            </button>
            <button onClick={closeModal}
              style={{ padding:"10px 18px", background:"#f4f6fa", color:C.navy,
                border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:13, cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === "subDisposition" && (
        <Modal title={`${modal.id?"Edit":"Add"} Manual Lead Sub-Disposition`} onClose={closeModal}>
          <FieldRow label="Sub-Disposition Name" required>
            <ModalInput value={modal.data.subDispositionName} placeholder="e.g. Appointment Set"
              onChange={e=>setModal(p=>({...p,data:{...p.data,subDispositionName:e.target.value}}))} />
          </FieldRow>
          <FieldRow label="Parent Disposition" required>
            <ModalSelect value={modal.data.dispositionId||""}
              onChange={e=>setModal(p=>({...p,data:{...p.data,dispositionId:e.target.value}}))}
              options={[{value:"",label:"Select disposition…"},
                ...dispositions.map(d=>({value:d.dispositionId,label:d.dispositionName}))]} />
          </FieldRow>
          {modal.id && <ToggleSwitch value={modal.data.isActive}
            onChange={()=>setModal(p=>({...p,data:{...p.data,isActive:!p.data.isActive}}))}
            label="Active" />}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"10px 24px", background:C.navy, color:"#fff", border:"none",
                borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              {saving?"Saving…":modal.id?"Update":"Create"}
            </button>
            <button onClick={closeModal}
              style={{ padding:"10px 18px", background:"#f4f6fa", color:C.navy,
                border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:13, cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      <Toast toast={toast} />
    </div>
  );
}