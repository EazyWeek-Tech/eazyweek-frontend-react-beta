import React, { useState, useEffect, useRef, useMemo } from "react";
import { isValidPhoneNumber, getExampleNumber } from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";
import Toast from "./Toast";
import { API_BASE_URL } from "../../../config";
import { useDialCodes } from "../../../data/useDialCodes";

// ── Phone example placeholder ──────────────────────────────────────────────
const getPhoneExample = (isoCode) => {
  if (!isoCode) return "";
  try {
    const ex = getExampleNumber(isoCode, examples);
    return ex ? ex.formatNational() : "";
  } catch { return ""; }
};

const isValidEmail = (e) => /\S+@\S+\.\S+/.test(e);

// ── DialCodeInput — searchable autocomplete for dial codes ─────────────────
// Defined OUTSIDE AddCustomerModal so it has a stable reference.
const DialCodeInput = ({ value, onChange, dialOptions, dialLoading }) => {
  const [query,    setQuery]    = useState(value || "");
  const [open,     setOpen]     = useState(false);
  const [focused,  setFocused]  = useState(false);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  // Sync query when value is set externally (e.g. on mount)
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
        // If user typed something invalid, revert to last valid value
        const exact = dialOptions.find((o) => o.value === query);
        if (!exact) setQuery(value || "");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query, value, dialOptions]);

  // Filter options: match dial code or country name
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dialOptions.slice(0, 80); // show first 80 when empty
    return dialOptions.filter(
      (o) =>
        o.value.toLowerCase().includes(q) ||
        o.countryName.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [query, dialOptions]);

  const handleInput = (e) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const handleSelect = (opt) => {
    setQuery(opt.value);
    setOpen(false);
    onChange(opt.value);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setFocused(true);
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[0]);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: 110, flexShrink: 0 }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={dialLoading ? "…" : "+966"}
        disabled={dialLoading}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          border: "1px solid #dde1ea",
          borderRadius: 6,
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          background: dialLoading ? "#f7f8fc" : "#fff",
        }}
        autoComplete="off"
      />

      {open && filtered.length > 0 && (
        <ul style={{
          position:   "absolute",
          top:        "calc(100% + 4px)",
          left:       0,
          zIndex:     9999,
          background: "#fff",
          border:     "1px solid #dde1ea",
          borderRadius: 8,
          boxShadow:  "0 4px 16px rgba(0,0,0,0.12)",
          listStyle:  "none",
          margin:     0,
          padding:    "4px 0",
          width:      220,
          maxHeight:  240,
          overflowY:  "auto",
        }}>
          {filtered.map((opt) => (
            <li
              key={`${opt.isoCode}-${opt.value}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
              style={{
                padding:    "7px 12px",
                cursor:     "pointer",
                fontSize:   13,
                display:    "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap:        8,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f0f4fa"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ color: "#6b7280", fontWeight: 600, minWidth: 44 }}>{opt.value}</span>
              <span style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.countryName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── AddCustomerModal ───────────────────────────────────────────────────────
const AddCustomerModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    countryCode:        "+966",
    mobile:             "",
    firstName:          "",
    lastName:           "",
    email:              "",
    gender:             "",
    nationalityCountry: "10",
    nationality:        "",
    nationalityLabel:   "",
    nationalityStatus:  "",
    nationalitynumber:  "",
  });

  const [errors,         setErrors]         = useState({});
  const [countryOptions, setCountryOptions] = useState([]);
  const [countryList,    setCountryList]    = useState([]);
  const [toast,          setToast]          = useState(null);
  const [phoneValid,     setPhoneValid]     = useState(null);

  const mobileRef = useRef(null);
  const emailRef  = useRef(null);

  const [dupDialog, setDupDialog] = useState({
    open: false, reason: "", matches: [], pendingPayload: null,
  });

  const { dialOptions, validDialCodes, isoFromDialCode, loading: dialLoading } = useDialCodes();

  const currentIso = useMemo(
    () => isoFromDialCode(formData.countryCode),
    [formData.countryCode, isoFromDialCode]
  );

  const phonePlaceholder = useMemo(
    () => getPhoneExample(currentIso),
    [currentIso]
  );

  // ── Validation ────────────────────────────────────────────────────────────
  const isValidCountryCode = (cc) => validDialCodes.has(cc);

  const checkPhoneValid = (mobile, dialCode, isoCode) => {
    if (!mobile || !dialCode || !isoCode) return null;
    try { return isValidPhoneNumber(`${dialCode}${mobile}`, isoCode); }
    catch { return false; }
  };

  const validateField = (fieldId, value) => {
    let error = "";
    switch (fieldId) {
      case "countryCode":
        if (!value || !isValidCountryCode(value)) error = "Select a valid country code.";
        break;
      case "mobile": {
        if (!value) { error = "Mobile number is required."; break; }
        const valid = checkPhoneValid(value, formData.countryCode, currentIso);
        if (valid === false)
          error = `Invalid number${phonePlaceholder ? ` — e.g. ${phonePlaceholder}` : ""}.`;
        break;
      }
      case "firstName":  if (!value) error = "First name is required."; break;
      case "lastName":   if (!value) error = "Last name is required.";  break;
      case "email":      if (!value || !isValidEmail(value)) error = "Enter a valid email."; break;
      case "gender":     if (!value) error = "Select gender.";          break;
      case "nationality":if (!value) error = "Select nationality.";     break;
      default: break;
    }
    setErrors((prev) => ({ ...prev, [fieldId]: error }));
    return !error;
  };

  const validateForm = () => [
    validateField("countryCode",  formData.countryCode),
    validateField("mobile",       formData.mobile),
    validateField("firstName",    formData.firstName),
    validateField("lastName",     formData.lastName),
    validateField("email",        formData.email),
    validateField("gender",       formData.gender),
    validateField("nationality",  formData.nationality),
  ].every(Boolean);

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Master/LoadCountry`, {
      method: "GET", headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCountryList(d))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!formData.nationalityCountry) return;
    fetch(`${API_BASE_URL}/api/Master/Nationality/${formData.nationalityCountry}`, {
      method: "GET", headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d)) return;
        setCountryOptions(d);
        setFormData((prev) => ({
          ...prev,
          nationality:      d[0]?.id?.toString() || "",
          nationalityLabel: d[0]?.name || "",
        }));
      })
      .catch(console.error);
  }, [formData.nationalityCountry]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      nationalityStatus: formData.nationality === "84" ? "Citizen" : "Expat",
    }));
  }, [formData.nationality]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  // Called by DialCodeInput when user selects a code
  const handleDialCodeChange = (newCode) => {
    setFormData((prev) => ({ ...prev, countryCode: newCode }));
    if (errors.countryCode) validateField("countryCode", newCode);
    if (formData.mobile) {
      const newIso = isoFromDialCode(newCode);
      setPhoneValid(checkPhoneValid(formData.mobile, newCode, newIso));
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === "mobile") {
      const v = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, mobile: v }));
      if (v) {
        setPhoneValid(checkPhoneValid(v, formData.countryCode, currentIso));
        if (errors.mobile) validateField("mobile", v);
      } else {
        setPhoneValid(null);
      }
      return;
    }

    if (id === "nationality") {
      const selected = countryOptions.find((c) => c.id?.toString() === value);
      setFormData((prev) => ({
        ...prev, nationality: value, nationalityLabel: selected?.name || "",
      }));
      if (errors.nationality) validateField("nationality", value);
      return;
    }

    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleBlur = (e) => validateField(e.target.id, e.target.value);

  // ── Duplicate check ───────────────────────────────────────────────────────
  const findDuplicates = async (mobile, email) => {
    try {
      const res  = await fetch(`${API_BASE_URL}/api/Customer/LoadCustomers`, {
        method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include",
      });
      const list = await res.json();
      if (!Array.isArray(list)) return { matches: [], reason: "" };

      const last10   = (s) => (s || "").replace(/\D/g, "").slice(-10);
      const byMobile = list.filter((c) => last10(c.mobile) === mobile);
      const byEmail  = email
        ? list.filter((c) => (c.email || "").toLowerCase() === email.toLowerCase())
        : [];
      const matches  = [...new Map([...byMobile, ...byEmail].map(
        (m) => [m.custId || m.id || m.mobile, m]
      )).values()];

      let reason = "";
      if (byMobile.length && byEmail.length) reason = "both";
      else if (byMobile.length)              reason = "mobile";
      else if (byEmail.length)               reason = "email";

      return { matches, reason };
    } catch { return { matches: [], reason: "" }; }
  };

  const createDataHandler = async (dataToSubmit) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Appointment/CreateCustomer`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
      });
      const data = await response.json();
      if (response.ok && (data?.success ?? true)) {
        setToast({ message: "Customer added successfully!", type: "success" });
        setTimeout(() => onClose(), 1200);
      } else {
        setToast({ message: data?.message || "Failed to add customer.", type: "error" });
      }
    } catch {
      setToast({ message: "An error occurred. Try again later.", type: "error" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const stored     = localStorage.getItem("user") || sessionStorage.getItem("user");
    const centerCode = stored ? JSON.parse(stored).centerCode : "";

    const payload = {
      id: "", mobile: formData.mobile, phoneCode: formData.countryCode,
      firstName: formData.firstName, lastName: formData.lastName,
      email: formData.email, gender: formData.gender,
      nationalityId: Number(formData.nationality),
      nationalityStatus: formData.nationalityStatus,
      centerCode,
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
      custId: "", employeeCode: "", topClinicCode: "",
      lastVisit: "", membership: "", centerName: "",
    };

    const { matches, reason } = await findDuplicates(formData.mobile, formData.email);
    if (matches.length > 0) {
      setDupDialog({
        open: true, reason,
        matches: matches.slice(0, 3).map((m) => ({
          name:   (m.fullName || `${m.firstName || ""} ${m.lastName || ""}`).trim(),
          mobile: m.mobile || "", email: m.email || "",
          custId: m.custId || m.id || "",
        })),
        pendingPayload: payload,
      });
      return;
    }
    createDataHandler(payload);
  };

  const proceedAfterDuplicate = () => {
    if (dupDialog.pendingPayload) createDataHandler(dupDialog.pendingPayload);
    setDupDialog({ open: false, reason: "", matches: [], pendingPayload: null });
  };

  const cancelAfterDuplicate = () => {
    const reason = dupDialog.reason;
    setDupDialog({ open: false, reason: "", matches: [], pendingPayload: null });
    if (reason === "mobile" || reason === "both") {
      mobileRef.current?.focus();
      setToast({ message: "Please update the mobile number.", type: "info" });
    } else if (reason === "email") {
      emailRef.current?.focus();
      setToast({ message: "Please update the email address.", type: "info" });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="popouter" id="addcust">
      <div className="popovrly"></div>
      <div className="popin">
        <div className="popuphdr">
          Add Customer
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>

        <div className="popfrm">
          <form onSubmit={handleSubmit}>

            {/* ── Country Code + Mobile ──────────────────────── */}
            <div className="frmdiv">
              <label htmlFor="mobile">
                Mobile: <span className="rd">*</span>
              </label>
              <div className="inptdiv" style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>

                {/* ✅ Autocomplete dial code — type code or country name */}
                <DialCodeInput
                  value={formData.countryCode}
                  onChange={handleDialCodeChange}
                  dialOptions={dialOptions}
                  dialLoading={dialLoading}
                />

                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    id="mobile"
                    ref={mobileRef}
                    value={formData.mobile}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={phonePlaceholder || "Enter mobile number"}
                    style={{
                      width: "100%",
                      borderColor: phoneValid === true
                        ? "#38a169"
                        : phoneValid === false && formData.mobile
                        ? "#e53e3e"
                        : undefined,
                    }}
                  />
                  {phoneValid === true && !errors.mobile && (
                    <div style={{ fontSize: 11, color: "#38a169", marginTop: 3 }}>✓ Valid number</div>
                  )}
                  {!errors.mobile && phonePlaceholder && phoneValid !== true && (
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>e.g. {phonePlaceholder}</div>
                  )}
                </div>
              </div>
              {errors.countryCode && <div className="error">{errors.countryCode}</div>}
              {errors.mobile      && <div className="error">{errors.mobile}</div>}
            </div>

            {/* ── First / Last Name ──────────────────────────── */}
            {["firstName", "lastName"].map((field) => (
              <div className="frmdiv" key={field}>
                <label htmlFor={field}>
                  {field === "firstName" ? "First Name" : "Last Name"}: <span className="rd">*</span>
                </label>
                <div className="inptdiv">
                  <input type="text" id={field} value={formData[field]} onChange={handleChange} onBlur={handleBlur} />
                  {errors[field] && <div className="error">{errors[field]}</div>}
                </div>
              </div>
            ))}

            {/* ── Email ─────────────────────────────────────── */}
            <div className="frmdiv">
              <label htmlFor="email">Email: <span className="rd">*</span></label>
              <div className="inptdiv">
                <input type="text" id="email" ref={emailRef} value={formData.email} onChange={handleChange} onBlur={handleBlur} />
                {errors.email && <div className="error">{errors.email}</div>}
              </div>
            </div>

            {/* ── Gender ────────────────────────────────────── */}
            <div className="frmdiv">
              <label htmlFor="gender">Gender: <span className="rd">*</span></label>
              <div className="inptdiv">
                <select id="gender" value={formData.gender} onChange={handleChange} onBlur={handleBlur}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && <div className="error">{errors.gender}</div>}
              </div>
            </div>

            {/* ── Country ───────────────────────────────────── */}
            <div className="frmdiv">
              <label htmlFor="nationalityCountry">Country:</label>
              <div className="inptdiv">
                <select id="nationalityCountry" value={formData.nationalityCountry} onChange={handleChange}>
                  <option value="">Select Country</option>
                  {countryList.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Nationality ───────────────────────────────── */}
            <div className="frmdiv">
              <label htmlFor="nationality">Nationality: <span className="rd">*</span></label>
              <div className="inptdiv">
                <select id="nationality" value={formData.nationality} onChange={handleChange} onBlur={handleBlur}>
                  <option value="">Select Nationality</option>
                  {countryOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {errors.nationality && <div className="error">{errors.nationality}</div>}
              </div>
            </div>

            {formData.nationality === "84" && (
              <div className="frmdiv">
                <div>Citizenship status: <b>{formData.nationalityStatus}</b></div>
              </div>
            )}

            <div className="btnbar">
              <input type="submit" className="prilnk" value="Add Customer" />
              <input type="button" className="seclnk" value="Cancel" onClick={onClose} />
            </div>

          </form>
        </div>
      </div>

      {/* ── Duplicate Modal ───────────────────────────────────── */}
      {dupDialog.open && (
        <div className="popouter" style={{ position: "fixed", inset: 0, zIndex: 1001 }}>
          <div className="popovrly" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div className="popin" style={{ position: "relative", margin: "5% auto", maxWidth: 520, background: "#fff", borderRadius: 8 }}>
            <div className="popuphdr">
              Duplicate Found
              <span className="clsbtn" onClick={cancelAfterDuplicate}>
                <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
              </span>
            </div>
            <div className="popfrm" style={{ padding: "16px 20px" }}>
              <p style={{ marginBottom: 12 }}>
                Same entry found by <b>{dupDialog.reason === "both" ? "mobile & email" : dupDialog.reason}</b>. Do you want to continue?
              </p>
              {dupDialog.matches.length > 0 && (
                <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 6, padding: 10, marginBottom: 12 }}>
                  {dupDialog.matches.map((m) => (
                    <div key={`${m.custId}-${m.mobile}`} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px dashed #e5e5e5" }}>
                      <div><b>{m.name || "(No name)"}</b> {m.custId ? `• ${m.custId}` : ""}</div>
                      <div>Mobile: {m.mobile || "-"}</div>
                      <div>Email: {m.email || "-"}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="btnbar" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="seclnk" onClick={cancelAfterDuplicate} type="button">No, Change</button>
                <button className="prilnk" onClick={proceedAfterDuplicate} type="button">Yes, Continue</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AddCustomerModal;