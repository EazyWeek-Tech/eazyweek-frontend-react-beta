import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../../../config";


const CreateDataHandler = async (query) => {
  const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
  const centerCode = stored ? JSON.parse(stored).centerCode : "";
  const res = await fetch(`${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(query)}/${centerCode}`);
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

const CustomerForm = ({ prefillData, setCustomerData, setLoading, customerFormData, setCustomerFormData, resetTrigger }) => {
  const emptyData = {
    custid: "",
    number: "",
    firstname: "",
    lastname: "",
    email: "",
    gender: "",
  };

  const [formData, setFormData] = useState(emptyData);
  const [errors, setErrors] = useState({});
  const [mobileSuggestions, setMobileSuggestions] = useState([]);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [isPrefilled, setIsPrefilled] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
  if (!prefillData && !resetTrigger) return;
    console.log(prefillData)
  const resetData = {
    number: prefillData?.number || prefillData?.mobile || "",
    firstname: prefillData?.firstname || prefillData?.name?.split(" ")[0] || "",
    lastname: prefillData?.lastname || (prefillData?.name?.split(" ").slice(1).join(" ") || ""),
    email: prefillData?.email || "",
    gender: prefillData?.gender || "",
    custid: prefillData?.custid || ""
  };

  const isDifferent = Object.keys(resetData).some(key => resetData[key] !== formData[key]);
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
      if (type === "number") setMobileSuggestions(matches);
      if (type === "firstname") setNameSuggestions(matches);
       console.log(data);
    } catch (err) {
      console.error("Suggestion fetch failed:", err);
      if (type === "number") setMobileSuggestions([]);
      if (type === "firstname") setNameSuggestions([]);
    } finally {
      setIsFetching(false);
      setLoading?.(false);
      
    }
   
  };

  const handleChange = async (e) => {
    const { id, value } = e.target;
    const updated = { ...formData, [id]: value };
    syncCustomerData(updated);

    if (id === "number" && value.length >= 3) {
      fetchAndSetSuggestions("number", value);
    } else if (id === "firstname" && value.length >= 2) {
      fetchAndSetSuggestions("firstname", value);
    } else {
      if (id === "number") setMobileSuggestions([]);
      if (id === "firstname") setNameSuggestions([]);
    }
  };

  const handleSuggestionSelect = (item) => {
    const selected = {
  number: item.mobile || "",
  firstname: item.firstName || "",
  lastname: item.lastName || "",
  email: item.email || "",
  gender: item.gender || "",
  custid: item.custId || item.custid || item.id || "", 
};

    setFormData(selected);
    setCustomerData?.(selected);
    setCustomerFormData?.(selected);
    setIsPrefilled(true);
    setShowToast(true);
    setMobileSuggestions([]);
    setNameSuggestions([]);
  };

  const handleBlur = (e) => validateField(e.target.id);

  const validateField = (field) => {
    let newErrors = { ...errors };
    let isValid = true;

    switch (field) {
      case "number":
        if (!formData.number || formData.number.length !== 10) {
          newErrors.number = "Mobile number must be 10 digits.";
          isValid = false;
        } else delete newErrors.number;
        break;
      case "firstname":
        if (!formData.firstname) {
          newErrors.firstname = "First name is required.";
          isValid = false;
        } else delete newErrors.firstname;
        break;
      case "lastname":
        if (!formData.lastname) {
          newErrors.lastname = "Last name is required.";
          isValid = false;
        } else delete newErrors.lastname;
        break;
      case "email":
        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = "Valid email required.";
          isValid = false;
        } else delete newErrors.email;
        break;
      case "gender":
        if (!formData.gender) {
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

  return (
    <>
      <div className="bscdetwrp">
        <div className="frmlgnd">Customer Details</div>
        <form autoComplete="off">
          <input type="hidden" id="custid" value={formData.custid} />

          <div className="form-group" style={{ position: "relative" }}>
            <input
              type="text"
              id="number"
              placeholder=" "
              value={formData.number}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label htmlFor="number" className="frmlbl">Mobile Number</label>
            {errors.number && <div className="error">{errors.number}</div>}
            {isFetching && <img src={`${import.meta.env.BASE_URL}images/Loading_icon.gif`} alt="Loading" style={{ position: "absolute", right: 10, top: 10, width: 20 }} />}
            {mobileSuggestions.length > 0 && (
              <ul className="suggestions">
                {mobileSuggestions.map((item, index) => (
                  <li key={index} onClick={() => handleSuggestionSelect(item)}>{item.firstName} – {item.mobile}</li>
                ))}
              </ul>
            )}
          </div>

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
                  <li key={index} onClick={() => handleSuggestionSelect(item)}>{item.firstName} – {item.mobile}</li>
                ))}
              </ul>
            )}
          </div>

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
