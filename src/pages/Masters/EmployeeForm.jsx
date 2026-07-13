import React, { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet  = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json(); return j.data ?? j;
};
const authPost = async (url, body, method = "POST") => {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` },
    body: JSON.stringify(body),
  });
  return r.json();
};

const today = () => new Date().toISOString().split("T")[0];

const COUNTRY_CODES = [
  { code:"+966", label:"🇸🇦 +966" }, { code:"+971", label:"🇦🇪 +971" },
  { code:"+965", label:"🇰🇼 +965" }, { code:"+973", label:"🇧🇭 +973" },
  { code:"+974", label:"🇶🇦 +974" }, { code:"+968", label:"🇴🇲 +968" },
  { code:"+91",  label:"🇮🇳 +91"  }, { code:"+44",  label:"🇬🇧 +44"  },
  { code:"+1",   label:"🇺🇸 +1"   }, { code:"+20",  label:"🇪🇬 +20"  },
];
// Roles loaded from CLINIC_ROLE via API

// ── Reusable field components ──────────────────────────────────────────────────
const F = ({ label, required, error, hint, children }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#334b71", marginBottom:5 }}>
      {label}{required && <span style={{ color:"#b91c1c", marginLeft:2 }}>*</span>}
    </label>
    {children}
    {error && <div style={{ fontSize:11, color:"#b91c1c", marginTop:3 }}>{error}</div>}
    {hint  && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{hint}</div>}
  </div>
);

const Inp = ({ value, onChange, disabled, placeholder, type="text", max }) => (
  <input type={type} value={value||""} onChange={onChange} disabled={disabled}
    placeholder={placeholder} max={max}
    style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0", borderRadius:8,
      fontSize:13, outline:"none", background: disabled?"#f8fafc":"#fff",
      color: disabled?"#94a3b8":"#0f172a", boxSizing:"border-box" }} />
);

const Sel = ({ value, onChange, disabled, children }) => (
  <select value={value||""} onChange={onChange} disabled={disabled}
    style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0", borderRadius:8,
      fontSize:13, outline:"none", background: disabled?"#f8fafc":"#fff",
      color: disabled?"#94a3b8":"#0f172a", boxSizing:"border-box" }}>
    {children}
  </select>
);

const PhoneRow = ({ ccVal, ccChange, numVal, numChange, disabled, onValidate, error }) => (
  <div>
    <div style={{ display:"flex", gap:8 }}>
      <select value={ccVal||""} onChange={ccChange} disabled={disabled}
        style={{ width:110, padding:"9px 8px", border:"1.5px solid #e2e8f0", borderRadius:8,
          fontSize:12, background: disabled?"#f8fafc":"#fff" }}>
        <option value="">Code</option>
        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <Inp value={numVal} onChange={numChange} disabled={disabled} placeholder="Phone number"
        onBlur={() => onValidate && onValidate(ccVal, numVal)} />
    </div>
    {error && <div style={{ fontSize:11, color:"#b91c1c", marginTop:3 }}>{error}</div>}
  </div>
);

const Grid3 = ({ children }) => (
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>{children}</div>
);
const Grid2 = ({ children }) => (
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>{children}</div>
);

const Section = ({ title }) => (
  <div style={{ fontWeight:800, fontSize:12, color:"#64748b", letterSpacing:".08em",
    textTransform:"uppercase", borderBottom:"1.5px solid #e7ecf4",
    paddingBottom:6, marginBottom:16, marginTop:24 }}>
    {title}
  </div>
);

// ── Main Form ─────────────────────────────────────────────────────────────────
const EmployeeForm = ({ employeeCode, isAdmin: isAdminProp, isEntityLevel: isEntityLevelProp, onBack, onSaved }) => {
  const isEdit = !!employeeCode;

  // Always re-derive rights from localStorage — don't rely solely on prop
  // (guards against stale prop values or direct URL access)
  const _selfRights = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const role = (u.role || u.userRole || "").toLowerCase().replace(/\s/g, "");
      const isAdmin       = role === "admin";
      const isEntityLevel = u.isEntityLevel === true;
      return { isAdmin, isEntityLevel };
    } catch { return { isAdmin: false, isEntityLevel: false }; }
  })();

  // Use self-derived if prop not explicitly passed, otherwise take the more permissive
  const isAdmin       = isAdminProp       === true ? true : _selfRights.isAdmin;
  const isEntityLevel = isEntityLevelProp === true ? true : _selfRights.isEntityLevel;

  const BLANK = {
    employeeCode:"", title:"", firstName:"", middleName:"", lastName:"",
    gender:"", dateOfBirth:"",
    nationality:"", nationalityIdType:"", nationalityId:"",
    email:"", mobileCountryCode:"+966", mobilePhone:"",
    workCountryCode:"", workPhone:"",
    address1:"", address2:"", city:"", state:"", postalCode:"", country:"",
    job:"", primaryCentre:"", employmentStartDate:"",
    history:[], roles:[],
  };

  const [form,    setForm]    = useState(BLANK);
  const [tab,     setTab]     = useState(0);   // 0=Profile 1=Employment 2=History 3=Roles
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(null); // null | "save" | "submit"
  const [loading, setLoading] = useState(isEdit);
  const [toast,   setToast]   = useState(null);
  const [centres,      setCentres]      = useState([]);  // all: entity + branches
  const [branchCentres,setBranchCentres] = useState([]);  // branches only (for Employment History)
  const [nationalities,setNationalities] = useState([]);
  const [idTypes,      setIdTypes]       = useState([]);
  const [jobs,         setJobs]          = useState([]);
  const [cities,       setCities]        = useState([]);
  const [roles,        setRoles]         = useState([]);
  const [isDirty,      setIsDirty]       = useState(false);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load master data on mount
  useEffect(() => {
    // Load all centres including entity level
    authGet(`${API_BASE_URL}/api/Settings/Centre/Hierarchy`)
      .then(d => {
        const entity   = d.entity   ? [{ code: d.entity.code,   name: d.entity.name   }] : [];
        const branches = (d.zones || []).flatMap(z => z.clinics.map(c => ({ code: c.code, name: c.name })));
        setCentres([...entity, ...branches]);     // Roles tab: entity + branches
        setBranchCentres(branches);               // Employment History tab: branches only
      })
      .catch(() => {
        authGet(`${API_BASE_URL}/api/master/LoadCenters`)
          .then(d => {
            const list = Array.isArray(d) ? d : [];
            setCentres(list);
            setBranchCentres(list);
          })
          .catch(() => {});
      });
    authGet(`${API_BASE_URL}/api/master/Nationality`)
      .then(d => setNationalities(Array.isArray(d) ? d : []))
      .catch(() => {});
    authGet(`${API_BASE_URL}/api/master/Jobs`)
      .then(d => setJobs(Array.isArray(d) ? d : []))
      .catch(() => {});
    authGet(`${API_BASE_URL}/api/master/Cities`)
      .then(d => setCities(Array.isArray(d) ? d : []))
      .catch(() => {});
    authGet(`${API_BASE_URL}/api/master/Roles`)
      .then(d => setRoles(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Load ID types when nationality changes (EM-037)
  useEffect(() => {
    if (!form.nationality) { setIdTypes([]); return; }
    // Find the nationality code from loaded list
    const nat = nationalities.find(n => n.name === form.nationality);
    const code = nat?.code || "";
    authGet(`${API_BASE_URL}/api/master/NationalityIdTypes?nationalityCode=${encodeURIComponent(code)}`)
      .then(d => setIdTypes(Array.isArray(d) ? d : []))
      .catch(() => setIdTypes([]));
  }, [form.nationality, nationalities]);

  // Load employee data for edit
  useEffect(() => {
    if (!isEdit) return;
    authGet(`${API_BASE_URL}/api/employee/${encodeURIComponent(employeeCode)}`)
      .then(d => {
        if (!d) return;
        setForm({
          employeeCode:        d.EMPLOYEECODE      || "",
          title:               d.TITLE             || "",
          firstName:           d.FIRSTNAME         || "",
          middleName:          d.MIDDLENAME        || "",
          lastName:            d.LASTNAME          || "",
          gender:              d.GENDER            || "",
          dateOfBirth:         d.DATEOFBIRTH?.split("T")[0] || "",
          nationality:         d.NATIONALITY       || "",
          nationalityIdType:   d.NATIONALITYIDTYPE || "",
          nationalityId:       d.NATIONALITYID     || "",
          email:               d.EMAIL             || "",
          // Parse phone: if MOBILEPHONE already contains country code prefix, split it out
          mobileCountryCode: (() => {
            if (d.MOBILECOUNTRYCODE) return d.MOBILECOUNTRYCODE;
            const ph = d.MOBILEPHONE || "";
            const m = ph.match(/^(\+\d{1,4})\s(.+)$/);
            return m ? m[1] : "+966";
          })(),
          mobilePhone: (() => {
            if (d.MOBILECOUNTRYCODE) return d.MOBILEPHONE || "";
            const ph = d.MOBILEPHONE || "";
            const m = ph.match(/^(\+\d{1,4})\s(.+)$/);
            return m ? m[2] : ph;
          })(),
          workCountryCode: (() => {
            if (d.WORKCOUNTRYCODE) return d.WORKCOUNTRYCODE;
            const ph = d.WORKPHONE || "";
            const m = ph.match(/^(\+\d{1,4})\s(.+)$/);
            return m ? m[1] : "";
          })(),
          workPhone: (() => {
            if (d.WORKCOUNTRYCODE) return d.WORKPHONE || "";
            const ph = d.WORKPHONE || "";
            const m = ph.match(/^(\+\d{1,4})\s(.+)$/);
            return m ? m[2] : ph;
          })(),
          address1:            d.ADDRESS1          || "",
          address2:            d.ADDRESS2          || "",
          city:                d.CITY              || "",
          state:               d.STATE             || "",
          postalCode:          d.POSTALCODE        || "",
          country:             d.COUNTRY           || "",
          job:                 d.JOB               || "",
          primaryCentre:       d.CENTERCODE        || "",
          employmentStartDate: d.EMPLOYMENTSTARTDATE?.split("T")[0] || "",
          history: (d.history || []).map(h => ({
            id: h.RECID, centreCode: h.CENTERCODE, startDate: h.STARTDATE?.split("T")[0] || "",
            endDate: h.ENDDATE?.split("T")[0] || "", job: h.JOB || "",
          })),
          roles: (d.roles || []).map(r => ({
            id: r.RECID, centreCode: r.CENTERCODE, role: r.ROLE, primaryClinic: !!r.PRIMARYCLINIC,
          })),
        });
      })
      .catch(() => showToast("Failed to load employee.", "error"))
      .finally(() => setLoading(false));
  }, [employeeCode]);

  const set = useCallback((field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setIsDirty(true);
    setErrors(p => ({ ...p, [field]: undefined }));
  }, []);

  // Phone validation via API (EM-031)
  const validatePhoneField = async (field, countryCode, number) => {
    if (!countryCode || !number) return;
    try {
      const res = await authPost(`${API_BASE_URL}/api/master/ValidatePhone`,
        { countryCode, number });
      if (!res.data?.valid) {
        setErrors(p => ({ ...p, [field]: res.data?.message || res.message }));
      }
    } catch { /* fail silently */ }
  };

  // ID document validation via API (EM-038)
  const validateIdField = async (idType, idNumber) => {
    if (!idType || !idNumber) return;
    try {
      const res = await authPost(`${API_BASE_URL}/api/master/ValidateIdentityDoc`,
        { idType, idNumber });
      if (!res.data?.valid) {
        setErrors(p => ({ ...p, nationalityId: res.data?.message || res.message }));
      }
    } catch { /* fail silently */ }
  };

  // City auto-fetch → State + Country (EM-041/042)
  const handleCityChange = async (cityCode) => {
    set("city", cityCode);
    if (!cityCode) return;
    try {
      const res = await authGet(`${API_BASE_URL}/api/master/Cities/${encodeURIComponent(cityCode)}`);
      if (res?.state)   set("state",   res.state);
      if (res?.country) set("country", res.country);
    } catch { /* fail silently */ }
  };

  // Employment History helpers
  const addHistoryRow  = () => { setForm(p => ({ ...p, history: [...p.history, { centreCode:"", startDate:"", endDate:"", job:"" }] })); setIsDirty(true); };
  const delHistoryRow  = (i) => { setForm(p => ({ ...p, history: p.history.filter((_,idx)=>idx!==i) })); setIsDirty(true); };
  const setHistoryRow  = (i, field, val) => {
    setForm(p => {
      const h    = [...p.history];
      h[i]       = { ...h[i], [field]: val };
      const row  = h[i];
      // EM-064/065: validate end date on change
      if ((field === "endDate" || field === "startDate") && row.endDate && row.startDate) {
        if (new Date(row.endDate) < new Date(row.startDate)) {
          setErrors(prev => ({ ...prev, [`hist_${i}_endDate`]: "End Date cannot be before Start Date" }));
        } else {
          setErrors(prev => { const e = {...prev}; delete e[`hist_${i}_endDate`]; return e; });
        }
        if (new Date(row.endDate) > new Date()) {
          setErrors(prev => ({ ...prev, [`hist_${i}_endDate`]: "End Date cannot be a future date" }));
        }
      }
      return { ...p, history: h };
    });
    setIsDirty(true);
  };

  // Roles helpers
  const addRoleRow  = () => { setForm(p => ({ ...p, roles: [...p.roles, { centreCode:"", role:"", primaryClinic: false }] })); setIsDirty(true); };
  const delRoleRow  = (i) => { setForm(p => ({ ...p, roles: p.roles.filter((_,idx)=>idx!==i) })); setIsDirty(true); };
  const setRoleRow  = (i, field, val) => {
    setForm(p => { const r = [...p.roles]; r[i] = { ...r[i], [field]: val }; return { ...p, roles: r }; });
    setIsDirty(true);
  };

  const handleBack = () => {
    if (isDirty) {
      const ok = window.confirm("You have unsaved changes. Leave without saving?");
      if (!ok) return;
    }
    onBack();
  };

  // ── Submit / Save ──────────────────────────────────────────────────────────
  const handleSave = async (action) => {
    setSaving(action);
    try {
      const payload = { ...form, action };
      const url     = isEdit
        ? `${API_BASE_URL}/api/employee/${encodeURIComponent(form.employeeCode)}`
        : `${API_BASE_URL}/api/employee/Create`;
      const method  = isEdit ? "PUT" : "POST";
      const res     = await authPost(url, payload, method);

      if (!res.success) {
        showToast(res.message || "Failed to save.", "error");
        return;
      }
      setIsDirty(false);
      showToast(res.message || "Saved.");
      if (action === "submit") onSaved();
    } catch { showToast("Network error.", "error"); }
    finally  { setSaving(null); }
  };

  // ── Terminate ──────────────────────────────────────────────────────────────
  const handleTerminate = async () => {
    if (!window.confirm(`Terminate ${form.firstName} ${form.lastName}? This will deactivate their system account.`))
      return;
    try {
      const res = await authPost(`${API_BASE_URL}/api/employee/${encodeURIComponent(form.employeeCode)}/Terminate`, {}, "PUT");
      if (!res.success) { showToast(res.message || "Failed to terminate.", "error"); return; }
      showToast("Employee terminated.");
      onSaved();
    } catch { showToast("Network error.", "error"); }
  };

  // ── Reset Password ─────────────────────────────────────────────────────────
  const [resetPwd, setResetPwd] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const handleResetPassword = async () => {
    if (!resetPwd || resetPwd.length < 6) { showToast("Password must be at least 6 characters.", "error"); return; }
    try {
      const res = await authPost(`${API_BASE_URL}/api/employee/ResetPassword`, {
        employeeCode: form.employeeCode, newPassword: resetPwd,
      });
      if (!res.success) { showToast(res.message || "Failed.", "error"); return; }
      showToast("Password reset successfully.");
      setShowResetModal(false);
      setResetPwd("");
    } catch { showToast("Network error.", "error"); }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const tabStyle = (i) => ({
    padding:"10px 20px", border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
    borderBottom: tab===i ? "2px solid #334b71" : "2px solid transparent",
    color: tab===i ? "#334b71" : "#94a3b8",
    background:"transparent", transition:"all .15s",
  });

  if (loading) return (
    <div style={{ textAlign:"center", padding:60, color:"#94a3b8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      Loading…
    </div>
  );

  // EM-116: If non-admin tries to access create form via direct URL, redirect back
  if (!isEdit && !isAdmin) {
    return (
      <div style={{ padding:40, fontFamily:"'Segoe UI',system-ui,sans-serif", textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:16 }}></div>
        <div style={{ fontWeight:800, fontSize:20, color:"#1e293b", marginBottom:8 }}>Access Denied</div>
        <div style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>
          Only Admin users can create new employees.
        </div>
        <button onClick={onBack}
          style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:8,
            padding:"10px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
          ← Back to List
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding:24, fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#0f172a", maxWidth:960 }}>

      {/* Toast */}
      {toast && (
        <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13,
          fontWeight:600, background:toast.type==="success"?"#e6f4ef":"#fdf3f3",
          border:`1px solid ${toast.type==="success"?"#b3d9cc":"#f0c4c0"}`,
          color:toast.type==="success"?"#2e7d5e":"#b91c1c" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <button onClick={handleBack}
            style={{ background:"none", border:"none", color:"#334b71", cursor:"pointer",
              fontSize:13, fontWeight:600, padding:0, marginBottom:6 }}>
            ← Back to List
          </button>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:"#1e293b" }}>
              {isEdit ? `Edit Employee — ${form.employeeCode}` : "Create Employee"}
            </h2>
            <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>
              Master Module → Manage Employees
            </div>
          </div>
        </div>

        {/* Global action buttons — admin only */}
        {isAdmin && (
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {isEdit && (
              <>
                <button onClick={() => setShowResetModal(true)}
                  style={{ padding:"9px 16px", border:"1px solid #e2e8f0", borderRadius:8,
                    background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", color:"#334b71" }}>
                  🔑 Reset Password
                </button>
                <button onClick={handleTerminate}
                  style={{ padding:"9px 16px", border:"1px solid #f0c4c0", borderRadius:8,
                    background:"#fdf3f3", fontSize:13, fontWeight:600, cursor:"pointer", color:"#b91c1c" }}>
                  ✕ Terminate
                </button>
              </>
            )}
            <button onClick={() => handleSave("save")} disabled={!!saving}
              style={{ padding:"9px 18px", border:"1.5px solid #334b71", borderRadius:8,
                background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", color:"#334b71",
                opacity: saving ? 0.7 : 1 }}>
              {saving==="save" ? "Saving…" : " Save"}
            </button>
            <button onClick={() => handleSave("submit")} disabled={!!saving}
              style={{ padding:"9px 18px", border:"none", borderRadius:8,
                background:"#334b71", fontSize:13, fontWeight:700, cursor:"pointer", color:"#fff",
                opacity: saving ? 0.7 : 1 }}>
              {saving==="submit" ? "Submitting…" : "✈ Submit"}
            </button>
          </div>
        )}
      </div>

      {/* Non-admin read-only banner */}
      {!isAdmin && (
        <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13,
          background:"#f0f4fa", border:"1px solid #c8d5e8", color:"#334b71", fontWeight:600 }}>
          👁 View Only — You can only edit Mobile Phone and Work Phone fields.
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom:"1px solid #e7ecf4", marginBottom:20 }}>
        {["Profile","Employment Details","Employment History","Roles"].map((t,i) => (
          <button key={t} style={tabStyle(i)} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* ── Tab 0: Profile ──────────────────────────────────────────────────── */}
      {tab === 0 && (
        <div style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:12, padding:24 }}>

          <Section title="Personal Information" />
          <Grid3>
            <F label="Employee Code" required error={errors.employeeCode}>
              <Inp value={form.employeeCode}
                onChange={e => set("employeeCode", e.target.value.toUpperCase())}
                disabled={isEdit || !isAdmin}
                placeholder="e.g. EMP-001" />
            </F>
            <F label="Title">
              <Sel value={form.title} onChange={e => set("title",e.target.value)} disabled={!isAdmin}>
                <option value="">Select title</option>
                {["Mr","Miss","Mrs","Dr"].map(t => <option key={t}>{t}</option>)}
              </Sel>
            </F>
            <F label="Gender">
              <Sel value={form.gender} onChange={e => set("gender",e.target.value)} disabled={!isAdmin}>
                <option value="">Select gender</option>
                {["Male","Female","Other"].map(g => <option key={g}>{g}</option>)}
              </Sel>
            </F>
          </Grid3>
          <Grid3>
            <F label="First Name" required error={errors.firstName}>
              <Inp value={form.firstName} onChange={e => set("firstName",e.target.value)} disabled={!isAdmin} placeholder="First name" />
            </F>
            <F label="Middle Name">
              <Inp value={form.middleName} onChange={e => set("middleName",e.target.value)} disabled={!isAdmin} placeholder="Middle name" />
            </F>
            <F label="Last Name" required error={errors.lastName}>
              <Inp value={form.lastName} onChange={e => set("lastName",e.target.value)} disabled={!isAdmin} placeholder="Last name" />
            </F>
          </Grid3>
          <Grid3>
            <F label="Date of Birth" required hint="Must not be a future date">
              <Inp type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth",e.target.value)}
                disabled={!isAdmin} max={today()} />
            </F>
            <F label="Nationality" required error={errors.nationality}>
              <Sel value={form.nationality} onChange={e => { set("nationality",e.target.value); set("nationalityIdType",""); }} disabled={!isAdmin}>
                <option value="">Select nationality</option>
                {nationalities.length > 0
                  ? nationalities.map(n => <option key={n.code} value={n.name}>{n.name}</option>)
                  : <option disabled>Loading...</option>
                }
              </Sel>
            </F>
            <F label="Nationality ID Type" required error={errors.nationalityIdType}
              hint={!form.nationality ? "Select Nationality first" : undefined}>
              <Sel value={form.nationalityIdType} onChange={e => set("nationalityIdType",e.target.value)}
                disabled={!isAdmin || !form.nationality}>
                <option value="">Select type</option>
                {idTypes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </Sel>
            </F>
          </Grid3>
          <div style={{ maxWidth:320 }}>
            <F label="Nationality ID" required error={errors.nationalityId}>
              <Inp value={form.nationalityId}
                onChange={e => set("nationalityId",e.target.value)}
                disabled={!isAdmin} placeholder="ID number"
                onBlur={() => validateIdField(form.nationalityIdType, form.nationalityId)} />
            </F>
          </div>

          <Section title="Contact Details" />
          <Grid3>
            <F label="Email" required error={errors.email}>
              <Inp type="email" value={form.email}
                onChange={e => {
                  set("email", e.target.value);
                  // Live email format validation
                  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (e.target.value && !emailRx.test(e.target.value.trim())) {
                    setErrors(p => ({ ...p, email: "Please enter a valid email address (e.g. user@domain.com)" }));
                  }
                }}
                disabled={!isAdmin} placeholder="name@company.com" />
            </F>
            <F label="Mobile Phone" required error={errors.mobilePhone}>
              <PhoneRow
                ccVal={form.mobileCountryCode} ccChange={e => set("mobileCountryCode",e.target.value)}
                numVal={form.mobilePhone}       numChange={e => set("mobilePhone",e.target.value)}
                disabled={false}
                onValidate={(cc,num) => validatePhoneField("mobilePhone", cc, num)}
                error={errors.mobilePhone}
              />
            </F>
            <F label="Work Phone">
              <PhoneRow
                ccVal={form.workCountryCode} ccChange={e => set("workCountryCode",e.target.value)}
                numVal={form.workPhone}       numChange={e => set("workPhone",e.target.value)}
                disabled={false}
                onValidate={(cc,num) => validatePhoneField("workPhone", cc, num)}
                error={errors.workPhone}
              />
            </F>
          </Grid3>

          <Section title="Residential Address" />
          <Grid3>
            <F label="Address Line 1">
              <Inp value={form.address1} onChange={e => set("address1",e.target.value)} disabled={!isAdmin} />
            </F>
            <F label="Address Line 2">
              <Inp value={form.address2} onChange={e => set("address2",e.target.value)} disabled={!isAdmin} />
            </F>
            <F label="City" hint="Selecting a city auto-fills State and Country">
              <Sel value={form.city} onChange={e => handleCityChange(e.target.value)} disabled={!isAdmin}>
                <option value="">Select or type city</option>
                {cities && cities.map(ci => (
                  <option key={ci.code} value={ci.code}>{ci.city}, {ci.country}</option>
                ))}
              </Sel>
            </F>
          </Grid3>
          <Grid3>
            <F label="State" hint={form.city ? "Auto-fetched from City" : undefined}>
              <Inp value={form.state} onChange={e => set("state",e.target.value)} disabled={!isAdmin} />
            </F>
            <F label="Postal Code">
              <Inp value={form.postalCode} onChange={e => set("postalCode",e.target.value)} disabled={!isAdmin} />
            </F>
            <F label="Country" hint={form.city || form.state ? "Auto-fetched" : undefined}>
              <Inp value={form.country} onChange={e => set("country",e.target.value)} disabled={!isAdmin} />
            </F>
          </Grid3>
        </div>
      )}

      {/* ── Tab 1: Employment Details ────────────────────────────────────────── */}
      {tab === 1 && (
        <div style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:12, padding:24 }}>
          <Section title="Employment Details" />
          <Grid3>
            <F label="Job" required error={errors.job}>
              <Sel value={form.job} onChange={e => set("job",e.target.value)} disabled={!isAdmin}>
                <option value="">Select job</option>
                {jobs.length > 0
                  ? jobs.map(j => <option key={j.name} value={j.name}>{j.name}</option>)
                  : <option disabled>Loading...</option>
                }
              </Sel>
            </F>
            <F label="Employment Start Date" required error={errors.employmentStartDate}
              hint="Must not be a future date">
              <Inp type="date" value={form.employmentStartDate}
                onChange={e => set("employmentStartDate",e.target.value)}
                disabled={!isAdmin} max={today()} />
            </F>
            <F label="Primary Centre">
              <Sel value={form.primaryCentre} onChange={e => set("primaryCentre",e.target.value)} disabled={!isAdmin}>
                <option value="">Select centre</option>
                {centres.map(c => <option key={c.code || c.CENTERCODE} value={c.code || c.CENTERCODE}>
                  {c.name || c.CENTERNAME || c.code}
                </option>)}
              </Sel>
            </F>
          </Grid3>
        </div>
      )}

      {/* ── Tab 2: Employment History ────────────────────────────────────────── */}
      {tab === 2 && (
        <div style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:12, padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:14, color:"#1e293b" }}>Employment History</div>
            {isAdmin && (
              <button onClick={addHistoryRow}
                style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:8,
                  padding:"7px 14px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                + Add Row
              </button>
            )}
          </div>

          {form.history.length === 0 ? (
            <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
              No employment history records. {isAdmin ? "Click \"+ Add Row\" to add one." : ""}
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f1f5f9" }}>
                  {["Centre","Start Date","End Date","Job",""].map(h => (
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:11, fontWeight:700,
                      color:"#475569", borderBottom:"1px solid #e2e8f0", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.history.map((h,i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"8px 12px" }}>
                      <Sel value={h.centreCode} onChange={e => setHistoryRow(i,"centreCode",e.target.value)} disabled={!isAdmin}>
                        <option value="">Select centre</option>
                        {branchCentres.map(c => <option key={c.code||c.CENTERCODE} value={c.code||c.CENTERCODE}>
                          {c.name||c.CENTERNAME||c.code}
                        </option>)}
                      </Sel>
                    </td>
                    <td style={{ padding:"8px 12px" }}>
                      <Inp type="date" value={h.startDate} max={today()}
                        onChange={e => setHistoryRow(i,"startDate",e.target.value)} disabled={!isAdmin} />
                    </td>
                    <td style={{ padding:"8px 12px" }}>
                      <Inp type="date" value={h.endDate} max={today()}
                        onChange={e => setHistoryRow(i,"endDate",e.target.value)} disabled={!isAdmin} />
                      {errors[`hist_${i}_endDate`] && (
                        <div style={{ fontSize:11, color:"#b91c1c", marginTop:2 }}>
                          {errors[`hist_${i}_endDate`]}
                        </div>
                      )}
                    </td>
                    <td style={{ padding:"8px 12px" }}>
                      <Sel value={h.job} onChange={e => setHistoryRow(i,"job",e.target.value)} disabled={!isAdmin}>
                        <option value="">Select job</option>
                        {jobs.map(j => <option key={j.name} value={j.name}>{j.name}</option>)}
                      </Sel>
                    </td>
                    <td style={{ padding:"8px 12px" }}>
                      {isAdmin && (
                        <button onClick={() => delHistoryRow(i)}
                          style={{ background:"none", border:"none", color:"#b91c1c",
                            cursor:"pointer", fontSize:16, padding:"2px 6px" }} title="Remove">🗑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab 3: Roles ─────────────────────────────────────────────────────── */}
      {tab === 3 && (
        <div style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:12, padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:14, color:"#1e293b" }}>Role Assignments</div>
            {isAdmin && (
              <button onClick={addRoleRow}
                style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:8,
                  padding:"7px 14px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                + Add Row
              </button>
            )}
          </div>

          {form.roles.length === 0 ? (
            <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
              No roles assigned. {isAdmin ? "Click \"+ Add Row\" to assign a centre and role." : ""}
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f1f5f9" }}>
                  {["Centre","Role","Primary Clinic",""].map(h => (
                    <th key={h} style={{ padding:"9px 12px", textAlign: h === "Primary Clinic" ? "center" : "left",
                      fontSize:11, fontWeight:700, color:"#475569", borderBottom:"1px solid #e2e8f0", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.roles.map((r,i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"8px 12px" }}>
                      <Sel value={r.centreCode} onChange={e => setRoleRow(i,"centreCode",e.target.value)} disabled={!isAdmin}>
                        <option value="">Select centre</option>
                        {centres.map(c => <option key={c.code||c.CENTERCODE} value={c.code||c.CENTERCODE}>
                          {c.name||c.CENTERNAME||c.code}
                        </option>)}
                      </Sel>
                    </td>
                    <td style={{ padding:"8px 12px" }}>
                      <Sel value={r.role} onChange={e => setRoleRow(i,"role",e.target.value)} disabled={!isAdmin}>
                        <option value="">Select role</option>
                        {roles.map(rl => <option key={rl.code} value={rl.name}>{rl.name}</option>)}
                      </Sel>
                    </td>
                    {/* Primary Clinic — radio button, only one can be primary */}
                    <td style={{ padding:"8px 12px", textAlign:"center" }}>
                      <input
                        type="radio"
                        name="primaryClinic"
                        checked={!!r.primaryClinic}
                        disabled={!isAdmin}
                        onChange={() => {
                          if (!isAdmin) return;
                          // Set this row as primary, unset all others
                          setForm(p => ({
                            ...p,
                            roles: p.roles.map((row, idx) => ({
                              ...row,
                              primaryClinic: idx === i,
                            })),
                          }));
                          setIsDirty(true);
                        }}
                        style={{ width:16, height:16, cursor: isAdmin ? "pointer" : "default" }}
                      />
                    </td>
                    <td style={{ padding:"8px 12px" }}>
                      {isAdmin && (
                        <button onClick={() => delRoleRow(i)}
                          style={{ background:"none", border:"none", color:"#b91c1c",
                            cursor:"pointer", fontSize:16, padding:"2px 6px" }} title="Remove">🗑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:9999 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:28, width:380 }}>
            <div style={{ fontWeight:800, fontSize:16, color:"#1e293b", marginBottom:16 }}>
              🔑 Reset Password
            </div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:12 }}>
              Set a new temporary password for <strong>{form.firstName} {form.lastName}</strong>.
              The employee will be prompted to change it on first login.
            </div>
            <F label="New Password">
              <Inp type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)}
                placeholder="Min 6 characters" />
            </F>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
              <button onClick={() => { setShowResetModal(false); setResetPwd(""); }}
                style={{ padding:"9px 18px", border:"1px solid #e2e8f0", borderRadius:8,
                  background:"#fff", fontSize:13, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleResetPassword}
                style={{ padding:"9px 18px", border:"none", borderRadius:8,
                  background:"#334b71", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeForm;