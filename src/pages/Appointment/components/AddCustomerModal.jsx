import React, { useState, useEffect, useRef, useMemo } from "react";
import Toast from "./Toast";
import { API_BASE_URL } from "../../../config";
// ⬇️ Put your provided JSON into this path
import countriesDial from "../../../data/countriesDial.json";

const AddCustomerModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    countryCode: "+966",         // default KSA
    mobile: "",
    firstName: "",
    lastName: "",
    email: "",
    gender: "",
    nationalityCountry: "10",    // Default to Saudi (keep your existing default)
    nationality: "",
    nationalityLabel: "",
    nationalityStatus: "",
    nationalitynumber: ""
  });

  const [errors, setErrors] = useState({});
  const [countryOptions, setCountryOptions] = useState([]);
  const [toast, setToast] = useState(null);
  const [countryList, setCountryList] = useState([]);

  // Refs for focusing on conflict
  const mobileRef = useRef(null);
  const emailRef = useRef(null);

  // Duplicate confirmation modal state
  const [dupDialog, setDupDialog] = useState({
    open: false,
    reason: "", // "mobile" | "email" | "both"
    matches: [],
    pendingPayload: null
  });

  // ---------- Dial code helpers ----------
  // Build a stable list of options "🇸🇦 Saudi Arabia (+966)"
  const dialOptions = useMemo(() => {
    // Some countries share dial codes (e.g., +1). Keep all; label shows country.
    return (countriesDial || [])
      .filter(c => c?.dial_code)
      .map(c => ({
        value: c.dial_code.trim(),
        label: `${c.dial_code}`,
        code: c.code
      }));
  }, []);

  // Set of valid dial codes for validation
  const validDialCodes = useMemo(
    () => new Set(dialOptions.map(o => o.value)),
    [dialOptions]
  );

  const isValidCountryCode = (cc) => validDialCodes.has(cc);
  const isValidMobile = (m) => /^\d{10}$/.test(m);
  const isValidEmail = (e) => /\S+@\S+\.\S+/.test(e);

  // --- Load Countries (for nationalityCountry dropdown) ---
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Master/LoadCountry`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (Array.isArray(data)) setCountryList(data);
      } catch (err) {
        console.error("Error loading country list", err);
      }
    };
    fetchCountries();
  }, [API_BASE_URL]);

  // --- Load Nationalities based on nationalityCountry ---
  useEffect(() => {
    const fetchNationalities = async () => {
      try {
        if (!formData.nationalityCountry) return;
        const res = await fetch(`${API_BASE_URL}/api/Master/Nationality/${formData.nationalityCountry}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setCountryOptions(data);
          setFormData((prev) => ({
            ...prev,
            nationality: data[0]?.id?.toString() || "",
            nationalityLabel: data[0]?.name || "",
          }));
        }
      } catch (err) {
        console.error("Error loading nationality list", err);
      }
    };

    fetchNationalities();
  }, [formData.nationalityCountry, API_BASE_URL]);

  // --- Auto nationality status (84 => Citizen; else Expat) ---
  useEffect(() => {
    const status = formData.nationality === "84" ? "Citizen" : "Expat";
    setFormData((prev) => ({ ...prev, nationalityStatus: status }));
  }, [formData.nationality]);

  // --- Validation ---
  const validateField = (fieldId, value) => {
    let error = "";
    switch (fieldId) {
      case "countryCode":
        if (!value || !isValidCountryCode(value)) error = "Select a valid country code.";
        break;
      case "mobile":
        if (!value || !isValidMobile(value)) error = "Mobile number must be 9 digits.";
        break;
      case "firstName":
        if (!value) error = "First name is required.";
        break;
      case "lastName":
        if (!value) error = "Last name is required.";
        break;
      case "email":
        if (!value || !isValidEmail(value)) error = "Enter a valid email.";
        break;
      case "gender":
        if (!value) error = "Select gender.";
        break;
      case "nationality":
        if (!value) error = "Select nationality.";
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [fieldId]: error }));
  };

  const validateForm = () => {
    const formErrors = {};
    let isValid = true;

    if (!formData.countryCode || !isValidCountryCode(formData.countryCode)) {
      formErrors.countryCode = "Select a valid country code.";
      isValid = false;
    }
    if (!formData.mobile || !isValidMobile(formData.mobile)) {
      formErrors.mobile = "Mobile number must be 10 digits.";
      isValid = false;
    }
    if (!formData.firstName) {
      formErrors.firstName = "First name is required.";
      isValid = false;
    }
    if (!formData.lastName) {
      formErrors.lastName = "Last name is required.";
      isValid = false;
    }
    if (!formData.email || !isValidEmail(formData.email)) {
      formErrors.email = "Enter a valid email.";
      isValid = false;
    }
    if (!formData.gender) {
      formErrors.gender = "Select gender.";
      isValid = false;
    }
    if (!formData.nationality) {
      formErrors.nationality = "Select nationality.";
      isValid = false;
    }

    setErrors(formErrors);
    return isValid;
  };

  // --- Change/Blur handlers ---
  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === "countryCode") {
      setFormData((prev) => ({ ...prev, countryCode: value }));
      if (errors.countryCode) validateField("countryCode", value);
      return;
    }

    if (id === "mobile") {
      // Keep only digits, cap at 10
      const v = value.replace(/\D/g, "").slice(0, 9);
      setFormData((prev) => ({ ...prev, mobile: v }));
      if (errors.mobile) validateField("mobile", v);
      return;
    }

    if (id === "nationality") {
      const selected = countryOptions.find((c) => c.id?.toString() === value);
      setFormData((prev) => ({
        ...prev,
        nationality: value,
        nationalityLabel: selected?.name || ""
      }));
      if (errors.nationality) validateField("nationality", value);
      return;
    }

    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    validateField(id, value);
  };

  // --- Duplicate check using /api/Customer/LoadCustomers ---
  const findDuplicates = async (mobile10, email) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Customer/LoadCustomers`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      const list = await res.json();

      if (!Array.isArray(list)) return { matches: [], reason: "" };

      const last10 = (s) => (s || "").replace(/\D/g, "").slice(-10);

      const byMobile = list.filter((c) => last10(c.mobile) === mobile10);
      const byEmail = email ? list.filter((c) => (c.email || "").toLowerCase() === email.toLowerCase()) : [];

      const matches = [...new Map([...byMobile, ...byEmail].map(m => [m.custId || m.id || m.mobile, m])).values()];

      let reason = "";
      if (byMobile.length && byEmail.length) reason = "both";
      else if (byMobile.length) reason = "mobile";
      else if (byEmail.length) reason = "email";

      return { matches, reason };
    } catch (err) {
      console.error("Duplicate check failed", err);
      return { matches: [], reason: "" };
    }
  };

  // --- Create call ---
  const createDataHandler = async (dataToSubmit) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Appointment/CreateCustomer`, {
        method: "POST",
        credentials: "include",
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
    } catch (error) {
      console.error(error);
      setToast({ message: "An error occurred. Try again later.", type: "error" });
    }
  };

  // --- Submit handler with duplicate flow ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

     const stored =localStorage.getItem("user") || sessionStorage.getItem("user");
    const centerCode = stored ? JSON.parse(stored).centerCode : "";

   const payload = {
  id: "",
  mobile: formData.mobile, // backend expects mobile without country code
  phoneCode: formData.countryCode, // ✅ NEW FIELD
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,
  gender: formData.gender,
  nationalityId: Number(formData.nationality),
  nationalityStatus: formData.nationalityStatus,
  centerCode: centerCode,
  fullName: `${formData.firstName} ${formData.lastName}`.trim(),
  custId: "",
  employeeCode: "",
  topClinicCode: "",
  lastVisit: "",
  membership: "",
  centerName: ""
};


    // Duplicate check
    const { matches, reason } = await findDuplicates(formData.mobile, formData.email);

    if (matches.length > 0) {
      setDupDialog({
        open: true,
        reason,
        matches: matches.slice(0, 3).map((m) => ({
          name: (m.fullName || `${m.firstName || ""} ${m.lastName || ""}`).trim(),
          mobile: m.mobile || "",
          email: m.email || "",
          custId: m.custId || m.id || ""
        })),
        pendingPayload: payload
      });
      return;
    }

    // No duplicates → proceed
    createDataHandler(payload);
  };

  const proceedAfterDuplicate = () => {
    if (dupDialog.pendingPayload) {
      createDataHandler(dupDialog.pendingPayload);
    }
    setDupDialog({ open: false, reason: "", matches: [], pendingPayload: null });
  };

  const cancelAfterDuplicate = () => {
    const reason = dupDialog.reason;
    setDupDialog({ open: false, reason: "", matches: [], pendingPayload: null });

    if (reason === "mobile" || reason === "both") {
      if (mobileRef.current) mobileRef.current.focus();
      setToast({ message: "Please update the mobile number.", type: "info" });
    } else if (reason === "email") {
      if (emailRef.current) emailRef.current.focus();
      setToast({ message: "Please update the email address.", type: "info" });
    }
  };

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
            {/* Country Code + Mobile */}
            <div className="frmdiv">
              <label htmlFor="mobile">
                Mobile: <span className="rd">*</span>
              </label>
              <div className="inptdiv" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {/* Country Code from JSON */}
                <select
  id="countryCode"
  value={formData.countryCode}
  onChange={handleChange}
  onBlur={handleBlur}
  style={{ width: 80 }}
>
  {!isValidCountryCode(formData.countryCode) && formData.countryCode && (
    <option value={formData.countryCode}>{formData.countryCode}</option>
  )}
  {dialOptions.map(opt => (
    <option key={`${opt.code}-${opt.value}`} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>


                {/* 10-digit mobile without country code */}
                <input
                  type="text"
                  id="mobile"
                  ref={mobileRef}
                  value={formData.mobile}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={9}
                  placeholder="9-digit mobile"
                  style={{ flex: 1 }}
                />
              </div>
              {errors.countryCode && <div className="error">{errors.countryCode}</div>}
              {errors.mobile && <div className="error">{errors.mobile}</div>}
            </div>

            {/* First/Last */}
            {["firstName", "lastName"].map((field) => (
              <div className="frmdiv" key={field}>
                <label htmlFor={field}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}: <span className="rd">*</span>
                </label>
                <div className="inptdiv">
                  <input
                    type="text"
                    id={field}
                    value={formData[field]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors[field] && <div className="error">{errors[field]}</div>}
                </div>
              </div>
            ))}

            {/* Email */}
            <div className="frmdiv">
              <label htmlFor="email">
                Email: <span className="rd">*</span>
              </label>
              <div className="inptdiv">
                <input
                  type="text"
                  id="email"
                  ref={emailRef}
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {errors.email && <div className="error">{errors.email}</div>}
              </div>
            </div>

            {/* Gender */}
            <div className="frmdiv">
              <label htmlFor="gender">Gender: <span className="rd">*</span></label>
              <div className="inptdiv">
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && <div className="error">{errors.gender}</div>}
              </div>
            </div>

            {/* Country (drives nationality list) */}
            <div className="frmdiv">
              <label htmlFor="nationalityCountry">Country:</label>
              <div className="inptdiv">
                <select
                  id="nationalityCountry"
                  value={formData.nationalityCountry}
                  onChange={handleChange}
                >
                  <option value="">Select Country</option>
                  {countryList.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nationality */}
            <div className="frmdiv">
              <label htmlFor="nationality">Nationality: <span className="rd">*</span></label>
              <div className="inptdiv">
                <select
                  id="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
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
                <div>Citizenship status of customer is {formData.nationalityStatus}</div>
              </div>
            )}

            <div className="btnbar">
              <input type="submit" className="prilnk" value="Add Customer" />
              <input type="button" className="seclnk" value="Cancel" onClick={onClose} />
            </div>
          </form>
        </div>
      </div>

      {/* Duplicate Confirmation Modal */}
      {dupDialog.open && (
        <div className="popouter" style={{ position: "fixed", inset: 0, zIndex: 1001 }}>
          <div className="popovrly" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}></div>
          <div className="popin" style={{ position: "relative", margin: "5% auto", maxWidth: 520, background: "#fff", borderRadius: 8 }}>
            <div className="popuphdr">
              Duplicate Found
              <span className="clsbtn" onClick={cancelAfterDuplicate}>
                <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
              </span>
            </div>
            <div className="popfrm" style={{ padding: "16px 20px" }}>
              <p style={{ marginBottom: 12 }}>
                Same entry found by <b>{dupDialog.reason === "both" ? "mobile & email" : dupDialog.reason}</b>.
                Do you want to continue with the same {dupDialog.reason === "both" ? "details" : dupDialog.reason}?
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AddCustomerModal;
