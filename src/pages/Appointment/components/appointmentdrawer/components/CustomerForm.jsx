import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../../../config";

const CreateDataHandler = async (query) => {
  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  const centerCode = stored ? JSON.parse(stored).centerCode : "";
  const res = await fetch(
    `${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(query)}/${centerCode}`
  );
  if (!res.ok) throw new Error("Failed to fetch");
  return await res.json();
};

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className="toast">{message}</div>;
};

const CustomerForm = ({
  prefillData,
  setCustomerData,
  setLoading,
  customerFormData,
  setCustomerFormData,
  resetTrigger,
}) => {
  const emptyData = {
    custid: "", number: "", firstname: "",
    lastname: "", email: "", gender: "",
  };

  const [formData,          setFormData]          = useState(emptyData);
  const [errors,            setErrors]            = useState({});
  const [mobileSuggestions, setMobileSuggestions] = useState([]);
  const [nameSuggestions,   setNameSuggestions]   = useState([]);
  const [isPrefilled,       setIsPrefilled]       = useState(false);
  const [isFetching,        setIsFetching]        = useState(false);
  const [showToast,         setShowToast]         = useState(false);

  // ── Prefill when parent passes data ────────────────────────────────────
  useEffect(() => {
    if (!prefillData && !resetTrigger) return;
    const resetData = {
      number:    prefillData?.number    || prefillData?.mobile || "",
      firstname: prefillData?.firstname || prefillData?.name?.split(" ")[0] || "",
      lastname:  prefillData?.lastname  || prefillData?.name?.split(" ").slice(1).join(" ") || "",
      email:     prefillData?.email     || "",
      gender:    prefillData?.gender    || "",
      custid:    prefillData?.custid    || "",
    };
    const isDifferent = Object.keys(resetData).some((k) => resetData[k] !== formData[k]);
    if (!isDifferent) return;
    setFormData(resetData);
    setCustomerData?.(resetData);
    setCustomerFormData?.(resetData);
    setIsPrefilled(true);
  }, [prefillData, resetTrigger]);

  const syncCustomerData = (updated) => {
    setFormData(updated);
    setCustomerData?.(updated);
    setCustomerFormData?.(updated);
  };

  // ── Suggestion fetch ────────────────────────────────────────────────────
  const fetchAndSetSuggestions = async (type, value) => {
    try {
      setIsFetching(true);
      setLoading?.(true);
      const data = await CreateDataHandler(value);
      const matches = data.filter((item) =>
        type === "number"
          ? item.mobile.startsWith(value)
          : item.firstName.toLowerCase().includes(value.toLowerCase())
      );
      if (type === "number")    setMobileSuggestions(matches);
      if (type === "firstname") setNameSuggestions(matches);
    } catch (err) {
      console.error("Suggestion fetch failed:", err);
      if (type === "number")    setMobileSuggestions([]);
      if (type === "firstname") setNameSuggestions([]);
    } finally {
      setIsFetching(false);
      setLoading?.(false);
    }
  };

  // ── Validate a single field ─────────────────────────────────────────────
  // ✅ FIX: accepts `currentValue` so it always validates the live input value,
  //         not stale formData state (which is one render behind on blur).
  const validateField = (field, currentValue) => {
    // Fall back to formData if no value passed (e.g. called programmatically)
    const val = currentValue !== undefined ? currentValue : formData[field];

    let newErrors = { ...errors };
    let isValid   = true;

    switch (field) {
      case "number": {
        // ✅ FIX: strip non-digits before length check
        const digits = (val || "").replace(/\D/g, "");
        if (digits.length !== 10) {
          newErrors.number = "Mobile number must be 10 digits.";
          isValid = false;
        } else {
          delete newErrors.number;
        }
        break;
      }
      case "firstname":
        if (!val?.trim()) {
          newErrors.firstname = "First name is required.";
          isValid = false;
        } else delete newErrors.firstname;
        break;
      case "lastname":
        if (!val?.trim()) {
          newErrors.lastname = "Last name is required.";
          isValid = false;
        } else delete newErrors.lastname;
        break;
      case "email":
        if (!val || !/\S+@\S+\.\S+/.test(val)) {
          newErrors.email = "Valid email required.";
          isValid = false;
        } else delete newErrors.email;
        break;
      case "gender":
        if (!val) {
          newErrors.gender = "Please select gender.";
          isValid = false;
        } else delete newErrors.gender;
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  // ── Change handler ──────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === "number") {
      // ✅ FIX: strip non-digits and cap at 10 — keeps state clean
      const digits  = value.replace(/\D/g, "").slice(0, 10);
      const updated = { ...formData, number: digits };
      syncCustomerData(updated);

      // Clear error immediately once 10 digits reached
      if (digits.length === 10) {
        setErrors((prev) => { const e = { ...prev }; delete e.number; return e; });
      }

      if (digits.length >= 3) fetchAndSetSuggestions("number", digits);
      else setMobileSuggestions([]);
      return;
    }

    if (id === "firstname") {
      const updated = { ...formData, firstname: value };
      syncCustomerData(updated);
      if (value.length >= 2) fetchAndSetSuggestions("firstname", value);
      else setNameSuggestions([]);
      return;
    }

    syncCustomerData({ ...formData, [id]: value });
  };

  // ✅ FIX: pass e.target.value so validateField gets the current DOM value,
  //         not the (potentially stale) React state value.
  const handleBlur = (e) => validateField(e.target.id, e.target.value);

  // ── Suggestion select ───────────────────────────────────────────────────
  const handleSuggestionSelect = (item) => {
    const selected = {
      number:    item.mobile     || "",
      firstname: item.firstName  || "",
      lastname:  item.lastName   || "",
      email:     item.email      || "",
      gender:    item.gender     || "",
      custid:    item.custId || item.custid || item.id || "",
    };
    setFormData(selected);
    setCustomerData?.(selected);
    setCustomerFormData?.(selected);
    setIsPrefilled(true);
    setShowToast(true);
    setMobileSuggestions([]);
    setNameSuggestions([]);
    // Clear errors for pre-filled fields
    setErrors({});
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bscdetwrp">
        <div className="frmlgnd">Customer Details</div>
        <form autoComplete="off">
          <input type="hidden" id="custid" value={formData.custid} />

          {/* Mobile */}
          <div className="form-group" style={{ position: "relative" }}>
            <input
              type="text"
              id="number"
              placeholder=" "
              value={formData.number}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={10}
              inputMode="numeric"
            />
            <label htmlFor="number" className="frmlbl">Mobile Number</label>
            {errors.number && <div className="error">{errors.number}</div>}
            {isFetching && (
              <img
                src={`${import.meta.env.BASE_URL}images/Loading_icon.gif`}
                alt="Loading"
                style={{ position: "absolute", right: 10, top: 10, width: 20 }}
              />
            )}
            {mobileSuggestions.length > 0 && (
              <ul className="suggestions">
                {mobileSuggestions.map((item, index) => (
                  <li key={index} onClick={() => handleSuggestionSelect(item)}>
                    {item.firstName} – {item.mobile}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* First Name */}
          <div className="form-group" style={{ position: "relative" }}>
            <input
              type="text"
              id="firstname"
              placeholder=" "
              value={formData.firstname}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label htmlFor="firstname" className="frmlbl">First Name</label>
            {errors.firstname && <div className="error">{errors.firstname}</div>}
            {nameSuggestions.length > 0 && (
              <ul className="suggestions">
                {nameSuggestions.map((item, index) => (
                  <li key={index} onClick={() => handleSuggestionSelect(item)}>
                    {item.firstName} – {item.mobile}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Last Name */}
          <div className="form-group">
            <input
              type="text"
              id="lastname"
              placeholder=" "
              value={formData.lastname}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label htmlFor="lastname" className="frmlbl">Last Name</label>
            {errors.lastname && <div className="error">{errors.lastname}</div>}
          </div>

          {/* Email */}
          <div className="form-group">
            <input
              type="email"
              id="email"
              placeholder=" "
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label htmlFor="email" className="frmlbl">Email Address</label>
            {errors.email && <div className="error">{errors.email}</div>}
          </div>

          {/* Gender */}
          <div className="form-group radgrp">
            <label className="frmlbl">Gender</label>
            <div className="rdbox">
              <input
                type="radio"
                id="gender_male"
                name="gender"
                value="male"
                checked={formData.gender?.toLowerCase() === "male"}
                onChange={(e) => syncCustomerData({ ...formData, gender: e.target.value })}
              />
              <label htmlFor="gender_male">Male</label>
            </div>
            <div className="rdbox">
              <input
                type="radio"
                id="gender_female"
                name="gender"
                value="female"
                checked={formData.gender?.toLowerCase() === "female"}
                onChange={(e) => syncCustomerData({ ...formData, gender: e.target.value })}
              />
              <label htmlFor="gender_female">Female</label>
            </div>
            {errors.gender && <div className="error">{errors.gender}</div>}
          </div>

        </form>
      </div>

      {showToast && (
        <Toast message="Customer loaded successfully" onClose={() => setShowToast(false)} />
      )}
    </>
  );
};

export default CustomerForm;