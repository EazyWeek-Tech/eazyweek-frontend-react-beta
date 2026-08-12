import React, { useEffect, useState, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";
import { makeRequireAccess, checkAccess } from "../Settings/masterAccess";
import { useNavigate } from "react-router-dom";

import { useFormConfig } from "../Settings/useFormConfig";

const TOKEN       = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authHeaders = () => ({ Authorization: `Bearer ${TOKEN()}` });
const jsonHeaders = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });
const getUser     = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCC       = () => (getUser().centerCode || "").trim();

// ── Blank form — only kept fields ─────────────────────────────────────────────
const BLANK_FORM = {
  customerId:      "",  // read-only / auto-generated
  firstName:       "",
  middleName:      "",
  lastName:        "",
  preferredName:   "",
  gender:          "",
  birthDay:        "",
  anniversary:     "",
  phoneCode:       "",  // mobile country/dialing code — saved to PHONE_CODE
  mobilePhone:     "",
  nationalityCode: 0,
  nationalityId:   "",
  countryCode:     "",
  language:        0,
  refBy:           "",
  customerType:    "",  // Citizen | Expat — derived from nationality
  isLoyaltyEnrolled: false,
};

// Mobile dialing codes shown before the mobile number (stored in PHONE_CODE).
const PHONE_CODES = [
  { code: "+966", label: "+966 Saudi Arabia" },
  { code: "+971", label: "+971 UAE" },
  { code: "+973", label: "+973 Bahrain" },
  { code: "+965", label: "+965 Kuwait" },
  { code: "+968", label: "+968 Oman" },
  { code: "+974", label: "+974 Qatar" },
  { code: "+20",  label: "+20 Egypt" },
  { code: "+962", label: "+962 Jordan" },
  { code: "+961", label: "+961 Lebanon" },
  { code: "+963", label: "+963 Syria" },
  { code: "+249", label: "+249 Sudan" },
  { code: "+212", label: "+212 Morocco" },
  { code: "+91",  label: "+91 India" },
  { code: "+92",  label: "+92 Pakistan" },
  { code: "+880", label: "+880 Bangladesh" },
  { code: "+63",  label: "+63 Philippines" },
  { code: "+44",  label: "+44 United Kingdom" },
  { code: "+1",   label: "+1 USA / Canada" },
];

// ── Input sanitizers & classification helper ─────────────────────────────────
// Names: allow Unicode letters (incl. Arabic), combining marks, spaces, . ' -
// Blocks digits and special characters (TC-APT-18 / TC-APT-19).
const NAME_STRIP     = /[^\p{L}\p{M}\s.'-]/gu;
const sanitizeName   = (v) => String(v ?? "").replace(NAME_STRIP, "");
// Mobile / phone: digits only — the dial code is a separate field. Capped at 15.
// Blocks alphabets & special characters (TC-CRT-24 / TC-APT-29 / TC-INV-22).
const sanitizeDigits = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 15);
const NAME_FIELDS    = ["firstName", "middleName", "lastName", "preferredName"];
const PHONE_FIELDS   = ["mobilePhone", "homePhone", "workPhone"];

// Citizen only when the selected nationality's country resolves to the centre's
// country; ANY other selected nationality — including ones with no country
// mapping in the master data — is an Expat (TC-EXPT-03). Returns null until a
// nationality is chosen and the centre country is known.
const classifyCustomerType = (code, natCountry, centreCountryId) => {
  if (!code || !centreCountryId) return null;
  return natCountry && natCountry === centreCountryId ? "Citizen" : "Expat";
};

// ── Field accessors + column config (PackageMaster-style list) ───────────────
const getCustCode  = (r) => r.custId     || "";
const getFirst     = (r) => r.firstName  || "";
const getLast      = (r) => r.lastName   || "";
const getPhone     = (r) => r.mobile     || "";
const getLastVisit = (r) => r.lastVisit  || "";
const getOnboarded = (r) => r.onboardedDate || "";
const getCenter    = (r) => r.centerName || "";

const COLUMNS = [
  { label: "Code",       field: "code",      get: getCustCode,  kind: "code" },
  { label: "First Name", field: "first",     get: getFirst,     cfgKey: "firstName" },
  { label: "Last Name",  field: "last",      get: getLast,      cfgKey: "lastName" },
  { label: "Phone No.",  field: "phone",     get: getPhone,     cfgKey: "mobilePhone" },
  // sortGet: these two render as dd-mm-yyyy but must sort on the yyyy-mm-dd key
  // the API sends alongside, otherwise the column orders by day of month.
  { label: "Onboarded Date", field: "onboarded", get: getOnboarded, sortGet: (r) => r.onboardedSort || "", muted: true },
  { label: "Last Visit", field: "lastVisit", get: getLastVisit, sortGet: (r) => r.lastVisitSort || "", muted: true },
  { label: "Center",     field: "center",    get: getCenter,    muted: true },
  { label: "Actions",    field: null },
];

// ─────────────────────────────────────────────────────────────────────────────
// CustomerMaster page
// ─────────────────────────────────────────────────────────────────────────────
const CustomerMaster = () => {
  const [customers,         setCustomers]         = useState([]);
  const [totalCustomers,    setTotalCustomers]    = useState(0);
  const [searchTerm,        setSearchTerm]        = useState("");
  const [searchQuery,       setSearchQuery]       = useState("");
  const [loading,           setLoading]           = useState(true);
  const [fetching,          setFetching]          = useState(false);
  const [showForm,          setShowForm]          = useState(false);
  const [formData,          setFormData]          = useState(BLANK_FORM);
  const [saving,            setSaving]            = useState(false);
  const [formError,         setFormError]         = useState("");
  const [formSuccess,       setFormSuccess]       = useState("");
  const [nationalities,     setNationalities]     = useState([]);
  const [countries,         setCountries]         = useState([]);
  const [languages,         setLanguages]         = useState([]);
  const [centreCountryId,   setCentreCountryId]   = useState(0);
  const [citizenType,       setCitizenType]       = useState(null);
  const { has, guard, notifyDenied } = usePermissions();
  const requireAccess = makeRequireAccess({ has, guard, notifyDenied });
  const [generatedId,       setGeneratedId]       = useState("");
  const [sortField,         setSortField]         = useState(null);
  const [sortDir,           setSortDir]           = useState("asc");
  const [page,              setPage]              = useState(1);
  const [pageSize,          setPageSize]          = useState(10);
  const [listNotice,        setListNotice]        = useState("");

  const navigate = useNavigate();

  // ── Fetch customer list ───────────────────────────────────────────────────
  // `silent` refreshes the rows in place without flipping `loading`, so a
  // post-save refresh leaves the existing table on screen instead of replacing
  // it with "Loading customers...".
  // Paging, search and sort all happen server-side. The page never holds more
  // than one page of rows, so a 170k-customer centre costs the same as a 200-
  // customer one. seqRef drops a slow response that a newer request has already
  // superseded — typing fast used to let an older page overwrite a newer one.
  const seqRef = useRef(0);
  const fetchCustomers = useCallback(async ({ silent = false } = {}) => {
    const seq = ++seqRef.current;
    try {
      if (!silent) setLoading(true);
      setFetching(true);
      const params = new URLSearchParams({
        search: searchQuery,
        page:   String(page),
        limit:  String(pageSize),
      });
      if (sortField) { params.set("sortField", sortField); params.set("sortDir", sortDir); }
      const res  = await fetch(`${API_BASE_URL}/api/Customer/LoadCustomers?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (seq !== seqRef.current) return;
      const payload = json?.data ?? json;
      const list    = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      setCustomers(list);
      setTotalCustomers(Number(payload?.total ?? list.length) || 0);
    } catch { console.error("Failed to fetch customers"); }
    finally {
      if (seq === seqRef.current) {
        setFetching(false);
        if (!silent) setLoading(false);
      }
    }
  }, [searchQuery, page, pageSize, sortField, sortDir]);

  // Legal Entity → Setup rules. Permissive defaults until the fetch lands, so a
  // slow config call never blocks a save that would otherwise be valid.
  const [policy, setPolicy] = useState({ emailOptional: true, allowDuplicateMobile: true, allowDuplicateEmail: true });
  const fc = useFormConfig("CUSTMST");
  const L = (k, fallback) => `${fc.labelOf(k, fallback)}${fc.isMandatory(k) ? " *" : ""}`;

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // ── Fetch supporting dropdowns ────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Master/Nationality`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setNationalities(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});
    fetch(`${API_BASE_URL}/api/Customer/Policy`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d) setPolicy(p => ({ ...p, ...d })); }).catch(() => {});

    fetch(`${API_BASE_URL}/api/Master/LoadLanguage`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setLanguages(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});

    fetch(`${API_BASE_URL}/api/Master/LoadCountry`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setCountries(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});

    fetch(`${API_BASE_URL}/api/Customer/CentreCountry`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d?.countryId) setCentreCountryId(Number(d.countryId)); }).catch(() => {});
  }, []);

  // ── Search (debounced, sent to the server) ────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Pagination (server-side) ──────────────────────────────────────────────
  useEffect(() => { setPage(1); }, [searchQuery, pageSize, sortField, sortDir]);

  const totalPages     = Math.max(1, Math.ceil(totalCustomers / pageSize));
  const safePage       = Math.min(page, totalPages);
  const pagedCustomers = customers;
  const rangeFrom      = totalCustomers === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeTo        = Math.min(safePage * pageSize, totalCustomers);
  const fmt            = (n) => Number(n || 0).toLocaleString();

  const toggleSort = (field) => {
    if (!field) return;
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const goToCustomerPage = (row) => {
    const qp = new URLSearchParams();
    if (row?.custId)   qp.set("custid",   row.custId);
    if (row?.recId)    qp.set("recid",    row.recId);
    const fullName = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
    if (fullName)      qp.set("fullname", fullName);
    if (row?.mobile)   qp.set("number",   row.mobile);
    navigate(`/customer?${qp.toString()}`);
  };

  const handleInput = (e) => {
    const { name } = e.target;
    let value = e.target.value;
    if (PHONE_FIELDS.includes(name))     value = sanitizeDigits(value);
    else if (NAME_FIELDS.includes(name)) value = sanitizeName(value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNationalityChange = (e) => {
    const code = parseInt(e.target.value) || 0;
    const nat  = nationalities.find(n => Number(n.code || n.NCODE || n.id) === code);
    const natCountry = Number(nat?.countryId || nat?.COUNTRY_ID || 0);
    const ct = classifyCustomerType(code, natCountry, centreCountryId);
    setCitizenType(ct);
    setFormData(prev => ({ ...prev, nationalityCode: code, customerType: ct || "" }));
  };

  const handleOpenCreate = () => {
    const cc = getCC();
    setFormData({ ...BLANK_FORM, centerCode: cc });
    setFormError(""); setFormSuccess(""); setCitizenType(null);
    setGeneratedId("");
    // Load prefix preview
    fetch(`${API_BASE_URL}/api/Customer/CentreSettings/${cc}`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d?.prefixCustomer) setGeneratedId(`${d.prefixCustomer}####`); }).catch(() => {});
    setShowForm(true);
  };

  const handleCloseForm = () => { setShowForm(false); setFormError(""); setFormSuccess(""); setCitizenType(null); };

  const handleSave = async () => {
    const gate = checkAccess({ has, code: "MDM.CUSTOMERS_CREATE", level: "centre" });
    if (!gate.ok) { notifyDenied(gate.message); return; }
    if (!formData.firstName?.trim())  { setFormError("First Name is required."); return; }
    if (!formData.lastName?.trim())   { setFormError("Last Name is required.");  return; }
    if (!formData.phoneCode)          { setFormError("Country code is required."); return; }
    if (!formData.mobilePhone?.trim()){ setFormError("Mobile is required.");     return; }
    if (!/^\d{6,15}$/.test(String(formData.mobilePhone).trim())) {
      setFormError("Enter a valid mobile number (6–15 digits, numbers only)."); return;
    }
    // Email is mandatory only when Legal Entity → Setup says it is.
    if (!policy.emailOptional && !formData.email?.trim()) { setFormError("Email is required."); return; }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRx.test(formData.email.trim())) { setFormError("Please enter a valid email address."); return; }
    // Date of Birth is optional. Nationality is not — the invoice derives the
    // Citizen / Expat status from it, and billing stalls without it.
    if (!formData.nationalityCode) { setFormError("Nationality is required."); return; }
    if (!formData.countryCode) { setFormError("Country is required."); return; }
    const cfgCheck = fc.validate(formData);
    if (!cfgCheck.ok) { setFormError(cfgCheck.message); return; }
    setFormError(""); setSaving(true);
    try {
      const payload = { ...formData, centerCode: getCC(), customerType: citizenType || "", configFormCode: "CUSTMST" };
      const res    = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success ?? result.Success) {
        // Close straight away. The old `setTimeout(..., 1200)` added 1.2s of dead
        // time to every create, and the refresh that followed it blocked the UI
        // on a full LoadCustomers round trip. Confirmation now lives on the list
        // page, so the panel can go as soon as the API answers.
        const newId = result?.data?.custId || result?.data?.CustId || "";
        handleCloseForm();
        setListNotice(newId ? `Customer ${newId} saved successfully.` : "Customer saved successfully.");
        setTimeout(() => setListNotice(""), 4000);
        fetchCustomers({ silent: true });
      } else {
        setFormError(result.message || "Failed to save customer.");
      }
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding:0, fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#0f172a" }}>
      {listNotice && (
        <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13,
          fontWeight:600, background:"#e6f4ef", border:"1px solid #b3d9cc", color:"#2e7d5e" }}>
          {listNotice}
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1e293b" }}>Customer Master</h2>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => { setSearchTerm(""); setSearchQuery(""); setPage(1); fetchCustomers(); }}
            style={{ height:40, padding:"0 16px", background:"#fff", color:"#334b71", border:"1.5px solid #e2e8f0",
              borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            ↻ Refresh
          </button>
          <button onClick={() => requireAccess("MDM.CUSTOMERS_CREATE", handleOpenCreate, { level: "centre" })}
            style={{ height:40, padding:"0 20px", background:"#334b71", color:"#fff", border:"none",
              borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            + Create New Customer
          </button>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:10, alignItems:"center" }}>
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, ID, phone, center…"
          style={{ flex:1, height:40, padding:"0 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:13 }} />
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14,
        fontSize:13, color:"#64748b", minHeight:20 }}>
        {loading ? "Loading…" : (
          <>
            <span>
              Showing <strong style={{ color:"#334b71" }}>{fmt(rangeFrom)}–{fmt(rangeTo)}</strong>
              {" of "}
              <strong style={{ color:"#334b71" }}>{fmt(totalCustomers)}</strong>
              {searchQuery ? " matching customers" : " customers"}
            </span>
            {fetching && (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, color:"#94a3b8" }}>
                <span style={{ width:10, height:10, borderRadius:"50%", border:"2px solid #cbd5e1",
                  borderTopColor:"#334b71", display:"inline-block", animation:"cmspin .7s linear infinite" }} />
                Updating…
              </span>
            )}
            {searchQuery && (
              <button onClick={() => { setSearchTerm(""); setSearchQuery(""); }}
                style={{ background:"none", border:"none", color:"#334b71", fontSize:12,
                  fontWeight:700, cursor:"pointer", padding:0 }}>
                Clear search
              </button>
            )}
          </>
        )}
        <style>{"@keyframes cmspin{to{transform:rotate(360deg)}}"}</style>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading customers…</div>
      ) : (
        <div style={{ borderRadius:14, overflow:"hidden", border:"1px solid #e2e8f0", background:"#fff",
          opacity: fetching ? 0.55 : 1, transition:"opacity .15s" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#334b71" }}>
                {COLUMNS.map((col) => (
                  <th key={col.label} onClick={() => toggleSort(col.field)}
                    style={{ padding:"11px 14px", textAlign:"left", fontWeight:700, fontSize:11, color:"#fff",
                      borderBottom:"1px solid #e2e8f0", textTransform:"uppercase", letterSpacing:".06em",
                      cursor: col.field ? "pointer" : "default", userSelect:"none", whiteSpace:"nowrap" }}>
                    {col.cfgKey ? fc.labelOf(col.cfgKey, col.label) : col.label}
                    {col.field && (
                      <span style={{ marginLeft:6, color: sortField === col.field ? "#fff" : "#cbd5e1", fontSize:10 }}>
                        {sortField === col.field ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedCustomers.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} style={{ textAlign:"center", padding:40, color:"#94a3b8", fontSize:13 }}>
                  {searchQuery ? `No customers match "${searchQuery}".` : "No customers found."}
                </td></tr>
              ) : pagedCustomers.map((row, i) => (
                <tr key={row.recId || row.custId || i} style={{ borderBottom:"1px solid #f1f5f9" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8faff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <td style={{ padding:"12px 14px" }}>
                    <a href="#" onClick={(e) => { e.preventDefault(); goToCustomerPage(row); }}
                      style={{ color:"#334b71", fontWeight:700, textDecoration:"underline", cursor:"pointer" }}>
                      {getCustCode(row)}
                    </a>
                  </td>
                  <td style={{ padding:"12px 14px" }}>{getFirst(row)}</td>
                  <td style={{ padding:"12px 14px" }}>{getLast(row)}</td>
                  <td style={{ padding:"12px 14px" }}>{getPhone(row)}</td>
                  <td style={{ padding:"12px 14px", color:"#64748b" }}>{getOnboarded(row) || "—"}</td>
                  <td style={{ padding:"12px 14px", color:"#64748b" }}>{getLastVisit(row) || "—"}</td>
                  <td style={{ padding:"12px 14px", color:"#64748b" }}>{getCenter(row)}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <button onClick={() => goToCustomerPage(row)}
                      style={{ padding:"4px 12px", border:"1px solid #334b71", borderRadius:6, background:"#fff",
                        color:"#334b71", fontWeight:700, cursor:"pointer", fontSize:12 }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalCustomers > 0 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#64748b" }}>
            <span>Rows per page:</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ height:32, padding:"0 8px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, background:"#fff" }}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ marginLeft:8 }}>
              {fmt(rangeFrom)}–{fmt(rangeTo)} of {fmt(totalCustomers)}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
              style={{ height:32, padding:"0 12px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff",
                color: safePage <= 1 ? "#cbd5e1" : "#334b71", fontWeight:700, fontSize:13, cursor: safePage <= 1 ? "not-allowed" : "pointer" }}>
              ‹ Prev
            </button>
            <span style={{ fontSize:13, color:"#475569", fontWeight:600 }}>Page {fmt(safePage)} of {fmt(totalPages)}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              style={{ height:32, padding:"0 12px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff",
                color: safePage >= totalPages ? "#cbd5e1" : "#334b71", fontWeight:700, fontSize:13, cursor: safePage >= totalPages ? "not-allowed" : "pointer" }}>
              Next ›
            </button>
          </div>
        </div>
      )}

      {/* Slide-in form panel */}
      {showForm && (
        <div style={styles.overlay} onClick={handleCloseForm}>
          <div style={styles.panel} onClick={e => e.stopPropagation()}>
            <div style={styles.panelHeader}>
              <div>
                <span style={{ fontWeight:700, fontSize:16, color:"#334B71" }}>New Customer</span>
                <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
                  ID: <strong>{generatedId || "Auto-generated on save"}</strong>
                  {citizenType && (
                    <span style={{
                      marginLeft:10, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                      background: citizenType === "Citizen" ? "#dcfce7" : "#fef3c7",
                      color:      citizenType === "Citizen" ? "#166534" : "#92400e",
                    }}>
                      {citizenType}
                    </span>
                  )}
                </div>
              </div>
              <button style={styles.closeBtn} onClick={handleCloseForm}>✕</button>
            </div>

            <div style={styles.panelBody}>

              {/* Basic Information */}
              <Section title="Basic Information">
                <FormRow label={L("firstName", "First Name")}>
                  <input style={styles.inp} name="firstName" autoComplete="one-time-code" value={formData.firstName} onChange={handleInput} />
                </FormRow>
                <FormRow label={L("middleName", "Middle Name")}>
                  <input style={styles.inp} name="middleName" autoComplete="one-time-code" value={formData.middleName} onChange={handleInput} />
                </FormRow>
                <FormRow label={L("lastName", "Last Name")}>
                  <input style={styles.inp} name="lastName" autoComplete="one-time-code" value={formData.lastName} onChange={handleInput} />
                </FormRow>
                <FormRow label={L("preferredName", "Preferred Name")}>
                  <input style={styles.inp} name="preferredName" autoComplete="one-time-code" value={formData.preferredName} onChange={handleInput} />
                </FormRow>
                <FormRow label={L("gender", "Gender")}>
                  <select style={styles.sel} name="gender" value={formData.gender} onChange={handleInput}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </FormRow>
                <FormRow label={L("birthDay", "Date of Birth")}>
                  <input style={styles.inp} type="date" name="birthDay" autoComplete="one-time-code" value={formData.birthDay} onChange={handleInput} />
                </FormRow>
                <FormRow label={L("anniversary", "Anniversary")}>
                  <input style={styles.inp} type="date" name="anniversary" autoComplete="one-time-code" value={formData.anniversary} onChange={handleInput} />
                </FormRow>
              </Section>

              {/* Contact */}
              <Section title="Contact">
                <FormRow label={L("mobilePhone", "Mobile")}>
                  <div style={{ display:"flex", gap:8 }}>
                    <select style={{ ...styles.sel, flex:"0 0 150px" }} name="phoneCode"
                      value={formData.phoneCode || ""} onChange={handleInput}>
                      <option value="">Code</option>
                      {PHONE_CODES.map(pc => <option key={pc.code} value={pc.code}>{pc.label}</option>)}
                    </select>
                    <input style={{ ...styles.inp, flex:1 }} name="mobilePhone" autoComplete="one-time-code" value={formData.mobilePhone} onChange={handleInput} inputMode="numeric" maxLength={15} />
                  </div>
                </FormRow>
                <FormRow label={`${fc.labelOf("email", "Email")}${policy.emailOptional ? "" : " *"}`}>
                  <input style={styles.inp} type="email" name="email" autoComplete="one-time-code"
                    value={formData.email || ""} onChange={handleInput}
                    placeholder="customer@example.com" />
                </FormRow>
              </Section>

              {/* Nationality */}
              <Section title="Nationality">
                <FormRow label={L("nationalityCode", "Nationality")}>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <select style={{ ...styles.sel, flex:1 }}
                      name="nationalityCode"
                      value={formData.nationalityCode || ""}
                      onChange={handleNationalityChange}>
                      <option value="">Select Nationality</option>
                      {nationalities.map(n => (
                        <option key={n.code || n.id || n.NCODE} value={n.code || n.id || n.NCODE}>
                          {n.name || n.NATIONALITYNAME}
                        </option>
                      ))}
                    </select>
                    {citizenType && (
                      <span style={{
                        padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:700,
                        background: citizenType === "Citizen" ? "#dcfce7" : "#fef3c7",
                        color:      citizenType === "Citizen" ? "#166534" : "#92400e",
                        whiteSpace: "nowrap",
                      }}>
                        {citizenType}
                      </span>
                    )}
                  </div>
                </FormRow>
                <FormRow label={L("countryCode", "Country")}>
                  <select style={styles.sel} name="countryCode" value={formData.countryCode || ""} onChange={handleInput}>
                    <option value="">Select Country</option>
                    {countries.map(c => (
                      <option key={c.code || c.id} value={c.code || c.id}>{c.name}</option>
                    ))}
                  </select>
                </FormRow>
              </Section>

              {/* Other */}
              <Section title="Other">
                <FormRow label={L("language", "Language")}>
                  <select style={styles.sel} name="language" value={formData.language} onChange={handleInput}>
                    <option value={0}>Select Language</option>
                    <option value={1}>English</option>
                    <option value={2}>Arabic</option>
                  </select>
                </FormRow>
                <FormRow label={L("isLoyaltyEnrolled", "Loyalty Program")}>
                  <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#334b71", cursor:"pointer" }}>
                    <input type="checkbox" checked={!!formData.isLoyaltyEnrolled}
                      onChange={e => setFormData(prev => ({ ...prev, isLoyaltyEnrolled: e.target.checked }))} />
                    Enroll in loyalty program
                  </label>
                </FormRow>
                <FormRow label={L("refBy", "Referred By")}>
                  <input style={styles.inp} name="refBy" autoComplete="one-time-code" value={formData.refBy} onChange={handleInput} />
                </FormRow>
              </Section>

              {formError   && <div style={styles.errBox}> {formError}</div>}
              {formSuccess && <div style={styles.sucBox}>✓ {formSuccess}</div>}
            </div>

            <div style={styles.panelFooter}>
              <button style={styles.cancelBtn} onClick={handleCloseForm}>Cancel</button>
              <button style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CustomerFormPanel — named export for use in Appointment page
// CRITICAL: defined at MODULE LEVEL, not inside any component.
// If defined inside a component, React creates a new type on every render,
// unmounting/remounting the input and losing focus after every keystroke.
// ─────────────────────────────────────────────────────────────────────────────
export function CustomerFormPanel({ onSaved, onClose }) {
  const [formData,        setFormData]        = useState(BLANK_FORM);
  const [saving,          setSaving]          = useState(false);
  const [formError,       setFormError]       = useState("");
  const [formSuccess,     setFormSuccess]     = useState("");
  const [nationalities,   setNationalities]   = useState([]);
  const [countries,       setCountries]       = useState([]);
  const [languages,       setLanguages]       = useState([]);
  const [centreCountryId, setCentreCountryId] = useState(0);
  const [citizenType,     setCitizenType]     = useState(null);
  const [generatedId,     setGeneratedId]     = useState("");

  // Legal Entity → Setup rules. Permissive defaults until the fetch lands, so a
  // slow config call never blocks a save that would otherwise be valid.
  const [policy, setPolicy] = useState({ emailOptional: true, allowDuplicateMobile: true, allowDuplicateEmail: true });
  const fc = useFormConfig("CUSTMST");
  const L = (k, fallback) => `${fc.labelOf(k, fallback)}${fc.isMandatory(k) ? " *" : ""}`;

  useEffect(() => {
    const cc = getCC();
    fetch(`${API_BASE_URL}/api/Customer/CentreSettings/${cc}`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d?.prefixCustomer) setGeneratedId(`${d.prefixCustomer}####`); }).catch(() => {});
    fetch(`${API_BASE_URL}/api/Customer/CentreCountry`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d?.countryId) setCentreCountryId(Number(d.countryId)); }).catch(() => {});
    fetch(`${API_BASE_URL}/api/Master/Nationality`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setNationalities(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});
    fetch(`${API_BASE_URL}/api/Master/LoadLanguage`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setLanguages(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});
    fetch(`${API_BASE_URL}/api/Master/LoadCountry`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setCountries(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});
    fetch(`${API_BASE_URL}/api/Customer/Policy`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d) setPolicy(p => ({ ...p, ...d })); }).catch(() => {});
  }, []);

  const handleInput = (e) => {
    const { name } = e.target;
    let value = e.target.value;
    if (PHONE_FIELDS.includes(name))     value = sanitizeDigits(value);
    else if (NAME_FIELDS.includes(name)) value = sanitizeName(value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNationalityChange = (e) => {
    const code = parseInt(e.target.value) || 0;
    const nat = nationalities.find(n => Number(n.code || n.id || n.NCODE) === code);
    const natCountry = Number(nat?.countryId || nat?.COUNTRY_ID || 0);
    const ct = classifyCustomerType(code, natCountry, centreCountryId);
    setCitizenType(ct);
    setFormData(prev => ({ ...prev, nationalityCode: code, customerType: ct || "" }));
  };

  const handleSave = async () => {
    if (!formData.firstName?.trim())  { setFormError("First Name is required."); return; }
    if (!formData.lastName?.trim())   { setFormError("Last Name is required.");  return; }
    if (!formData.phoneCode)          { setFormError("Country code is required."); return; }
    if (!formData.mobilePhone?.trim()){ setFormError("Mobile is required.");     return; }
    if (!/^\d{6,15}$/.test(String(formData.mobilePhone).trim())) {
      setFormError("Enter a valid mobile number (6–15 digits, numbers only)."); return;
    }
    // Email is mandatory only when Legal Entity → Setup says it is.
    if (!policy.emailOptional && !formData.email?.trim()) { setFormError("Email is required."); return; }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRx.test(formData.email.trim())) { setFormError("Please enter a valid email address."); return; }
    // Date of Birth is optional. Nationality is not — the invoice derives the
    // Citizen / Expat status from it, and billing stalls without it.
    if (!formData.nationalityCode) { setFormError("Nationality is required."); return; }
    if (!formData.countryCode) { setFormError("Country is required."); return; }
    const cfgCheck = fc.validate(formData);
    if (!cfgCheck.ok) { setFormError(cfgCheck.message); return; }
    setFormError(""); setSaving(true);
    try {
      const payload = { ...formData, centerCode: getCC(), customerType: citizenType || "", configFormCode: "CUSTMST" };
      const res    = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify(payload),
      });
      const result = await res.json();
      const data   = result?.data ?? result;
      if (result.success ?? result.Success) {
        setFormSuccess("Customer saved successfully.");
        // Hand back immediately. The caller (appointment / invoice quick-create)
        // owns the confirmation UI, so the old 1s delay only stalled that flow.
        onSaved?.({ ...formData, ...data });
      } else {
        setFormError(result.message || "Failed to save customer.");
      }
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={styles.panelHeader}>
        <div>
          <span style={{ fontWeight:700, fontSize:16, color:"#334B71" }}>New Customer</span>
          <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
            ID: <strong>{generatedId || "Auto-generated on save"}</strong>
            {citizenType && (
              <span style={{
                marginLeft:10, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                background: citizenType === "Citizen" ? "#dcfce7" : "#fef3c7",
                color:      citizenType === "Citizen" ? "#166534" : "#92400e",
              }}>{citizenType}</span>
            )}
          </div>
        </div>
        {onClose && <button style={styles.closeBtn} onClick={onClose}>✕</button>}
      </div>

      <div style={styles.panelBody}>
        <Section title="Basic Information">
          <FormRow label={L("firstName", "First Name")}><input style={styles.inp} name="firstName" autoComplete="one-time-code" value={formData.firstName} onChange={handleInput} /></FormRow>
          <FormRow label={L("middleName", "Middle Name")}><input style={styles.inp} name="middleName" autoComplete="one-time-code" value={formData.middleName} onChange={handleInput} /></FormRow>
          <FormRow label={L("lastName", "Last Name")}><input style={styles.inp} name="lastName" autoComplete="one-time-code" value={formData.lastName} onChange={handleInput} /></FormRow>
          <FormRow label={L("preferredName", "Preferred Name")}><input style={styles.inp} name="preferredName" autoComplete="one-time-code" value={formData.preferredName} onChange={handleInput} /></FormRow>
          <FormRow label={L("gender", "Gender")}>
            <select style={styles.sel} name="gender" value={formData.gender} onChange={handleInput}>
              <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </FormRow>
          <FormRow label={L("birthDay", "Date of Birth")}><input style={styles.inp} type="date" name="birthDay" autoComplete="one-time-code" value={formData.birthDay} onChange={handleInput} /></FormRow>
          <FormRow label={L("anniversary", "Anniversary")}><input style={styles.inp} type="date" name="anniversary" autoComplete="one-time-code" value={formData.anniversary} onChange={handleInput} /></FormRow>
        </Section>

        <Section title="Contact">
          <FormRow label={L("mobilePhone", "Mobile")}>
            <div style={{ display:"flex", gap:8 }}>
              <select style={{ ...styles.sel, flex:"0 0 150px" }} name="phoneCode"
                value={formData.phoneCode || ""} onChange={handleInput}>
                <option value="">Code</option>
                {PHONE_CODES.map(pc => <option key={pc.code} value={pc.code}>{pc.label}</option>)}
              </select>
              <input style={{ ...styles.inp, flex:1 }} name="mobilePhone" autoComplete="one-time-code" value={formData.mobilePhone} onChange={handleInput} inputMode="numeric" maxLength={15} />
            </div>
          </FormRow>
          <FormRow label={`${fc.labelOf("email", "Email")}${policy.emailOptional ? "" : " *"}`}><input style={styles.inp} type="email" name="email" autoComplete="one-time-code" value={formData.email || ""} onChange={handleInput} placeholder="customer@example.com" /></FormRow>
        </Section>

        <Section title="Nationality">
          <FormRow label={L("nationalityCode", "Nationality")}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <select style={{ ...styles.sel, flex:1 }} name="nationalityCode" value={formData.nationalityCode || ""} onChange={handleNationalityChange}>
                <option value="">Select Nationality</option>
                {nationalities.map(n => (
                  <option key={n.code || n.id || n.NCODE} value={n.code || n.id || n.NCODE}>{n.name || n.NATIONALITYNAME}</option>
                ))}
              </select>
              {citizenType && (
                <span style={{ padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:700, whiteSpace:"nowrap",
                  background: citizenType === "Citizen" ? "#dcfce7" : "#fef3c7",
                  color:      citizenType === "Citizen" ? "#166534" : "#92400e" }}>
                  {citizenType}
                </span>
              )}
            </div>
          </FormRow>
          <FormRow label={L("countryCode", "Country")}>
            <select style={styles.sel} name="countryCode" value={formData.countryCode || ""} onChange={handleInput}>
              <option value="">Select Country</option>
              {countries.map(c => <option key={c.code || c.id} value={c.code || c.id}>{c.name}</option>)}
            </select>
          </FormRow>
        </Section>

        <Section title="Other">
          <FormRow label={L("language", "Language")}>
            <select style={styles.sel} name="language" value={formData.language} onChange={handleInput}>
              <option value={0}>Select Language</option>
              <option value={1}>English</option>
              <option value={2}>Arabic</option>
            </select>
          </FormRow>
          <FormRow label={L("isLoyaltyEnrolled", "Loyalty Program")}>
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#334b71", cursor:"pointer" }}>
              <input type="checkbox" checked={!!formData.isLoyaltyEnrolled}
                onChange={e => setFormData(prev => ({ ...prev, isLoyaltyEnrolled: e.target.checked }))} />
              Enroll in loyalty program
            </label>
          </FormRow>
          <FormRow label={L("refBy", "Referred By")}><input style={styles.inp} name="refBy" autoComplete="one-time-code" value={formData.refBy} onChange={handleInput} /></FormRow>
        </Section>

        {formError   && <div style={styles.errBox}> {formError}</div>}
        {formSuccess && <div style={styles.sucBox}>✓ {formSuccess}</div>}
      </div>

      <div style={styles.panelFooter}>
        {onClose && <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>}
        <button style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Customer"}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components at MODULE LEVEL — never inside any component function ───────
const Section = ({ title, children }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ fontSize:11, fontWeight:700, color:"#334B71", textTransform:"uppercase",
      letterSpacing:"0.05em", borderBottom:"2px solid #334B71", paddingBottom:4, marginBottom:14 }}>
      {title}
    </div>
    {children}
  </div>
);

const FormRow = ({ label, children }) => (
  <div style={{ display:"flex", alignItems:"center", marginBottom:12, gap:12 }}>
    <label style={{ minWidth:140, fontSize:13, fontWeight:500, color:"#495057" }}>{label}</label>
    <div style={{ flex:1 }}>{children}</div>
  </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = {
  inp:         { width:"100%", padding:"8px 10px", border:"1px solid #ced4da", borderRadius:6, fontSize:13, boxSizing:"border-box" },
  sel:         { width:"100%", padding:"8px 10px", border:"1px solid #ced4da", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", justifyContent:"flex-end" },
  panel:       { width:500, background:"#fff", display:"flex", flexDirection:"column", height:"100vh", boxShadow:"-4px 0 24px rgba(0,0,0,0.15)" },
  panelHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 24px", borderBottom:"1px solid #e5e7eb", flexShrink:0 },
  panelBody:   { flex:1, overflowY:"auto", padding:"20px 24px" },
  panelFooter: { padding:"16px 24px", borderTop:"1px solid #e5e7eb", display:"flex", gap:12, justifyContent:"flex-end", flexShrink:0 },
  closeBtn:    { background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#6b7280" },
  cancelBtn:   { padding:"9px 20px", background:"#f1f5f9", border:"1px solid #d0d9e8", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:600, color:"#374151" },
  saveBtn:     { padding:"9px 22px", background:"#334B71", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:600 },
  errBox:      { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:6, padding:"10px 14px", color:"#991b1b", fontSize:13, marginTop:12 },
  sucBox:      { background:"#ecfdf5", border:"1px solid #6ee7b7", borderRadius:6, padding:"10px 14px", color:"#065f46", fontSize:13, marginTop:12 },
};

export default CustomerMaster;