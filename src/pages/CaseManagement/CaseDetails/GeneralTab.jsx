import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { API_BASE_URL } from "../../../config";

const GeneralTab = forwardRef(({ data }, ref) => {
  const [formValues, setFormValues] = useState({ ...data });
  const [caseMediums, setCaseMediums] = useState([]);
  const [caseSources, setCaseSources] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [initialSourceFetched, setInitialSourceFetched] = useState(false);
  useImperativeHandle(ref, () => ({
    getGeneralData: () => formValues,
  }));

  useEffect(() => {
    setFormValues({ ...data });
    fetchCaseMediums();
    fetchServices();
    fetchServiceCategories();

    console.log('FORM DATA');
    console.log(data)
  }, [data]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!customerSearchText.trim()) {
        setCustomerOptions([]);
        return;
      }

      fetch(`${API_BASE_URL}/api/CaseDropDown/Customer?SearchText=${encodeURIComponent(customerSearchText)}`)
        .then(res => res.json())
        .then(setCustomerOptions)
        .catch(() => setCustomerOptions([]));
    }, 400);

    return () => clearTimeout(timeout);
  }, [customerSearchText]);

  useEffect(() => {
    if (data.medium && data.categoryCode && !initialSourceFetched) {
      fetchCaseSources(data.medium, data.categoryCode);
      setInitialSourceFetched(true);
    }
  }, [data.medium, data.categoryCode, initialSourceFetched]);

  const fetchCaseMediums = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/CaseDropDown/Medium`);
      const result = await response.json();
      setCaseMediums(result);
    } catch (error) {
      console.error("Error fetching mediums:", error);
    }
  };

  const fetchCaseSources = async (mediumCode, categoryCode) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/CaseDropDown/Medium/Source?CategoryCode=${categoryCode}&MediumCode=${mediumCode}`
      );
      const data = await res.json();
      setCaseSources(data);
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("${API_BASE_URL}/api/CaseDropDown/Service");
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const fetchServiceCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/CaseCategory/CaseServiceCategory`);
      const data = await res.json();
      setServiceCategories(data);
    } catch (error) {
      console.error("Error fetching service categories:", error);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    const updated = { ...formValues, [id]: value };
    setFormValues(updated);

    if (id === "medium") {
      fetchCaseSources(value, formValues.categoryCode);
    }
  };

  return (
    <form className="genform tabform">
      <div className="form-group">
        <label htmlFor="title">Case Title</label>
        <input
          type="text"
          id="title"
          placeholder="Enter Case Title"
          value={formValues.title || ""}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="caseCategory">Case Category</label>
        <select
          id="caseCategory"
          value={formValues.caseCategory || ""}
          onChange={handleChange}
          disabled
        >
          <option value={formValues.categoryCode}>{formValues.caseCategory}</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="subCategory">Case Sub Category</label>
        <select
          id="subCategory"
          value={formValues.subCategory || ""}
          onChange={handleChange}
          disabled
        >
          <option value={formValues.subCategory}>{formValues.subCategoryName}</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="subSubCategory">Case Sub Sub Category</label>
        <select
          id="subSubCategory"
          value={formValues.subSubCategory || ""}
          onChange={handleChange}
          disabled
        >
          <option value={formValues.subSubCategory}>{formValues.subSubCategoryName}</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="subSubSubCategory">Case Sub Sub Sub Category</label>
        <select
          id="subSubSubCategory"
          value={formValues.subSubSubCategory || ""}
          onChange={handleChange}
          disabled
        >
          <option value={formValues.subSubSubCategory}>{formValues.subSubSubCategoryName}</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="medium">Case Medium</label>
        <select id="medium" value={formValues.medium || ""} onChange={handleChange}>
          <option value="">Select Medium</option>
          {caseMediums.filter(m => m.name !== "< - Select one - >").map((m, i) => (
            <option key={i} value={m.name.trim()}>{m.name.trim()}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="source">Case Source</label>
        <select id="source" value={formValues.source || ""} onChange={handleChange}>
          <option value="">Select Source</option>
          {caseSources.map((s, i) => (
            <option key={i} value={s.code}>{s.name.trim()}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="priority">Priority</label>
        <select id="priority" value={formValues.priority || ""} onChange={handleChange}>
          <option value="">Select Priority</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="customerSearch">Search Customer</label>
        <input
          type="search"
          id="customerSearch"
          placeholder="Search Customer"
          value={customerSearchText}
          onChange={(e) => setCustomerSearchText(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="customer">Customer</label>
        <select
          id="customer"
          value={formValues.customer || ""}
          onChange={(e) => setFormValues(prev => ({ ...prev, customer: e.target.value }))}
        >
          <option value="">Select Customer</option>
          {customerOptions.length === 0 && formValues.customer && (
            <option value={formValues.customer}>{formValues.customer}</option>
          )}
          {customerOptions.map((cust, i) => (
            <option key={i} value={cust.name.trim()}>{cust.name.trim()}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="product">Product</label>
        <select id="product" value={formValues.productCode || ""} onChange={handleChange}>
          <option value={formValues.productCode}>{formValues.product}</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="service">Service</label>
        <select id="service" value={formValues.service || ""} onChange={handleChange}>
          <option value="">Select Service</option>
          {services.filter(s => s.code !== "< - Select one - >").map((s, i) => (
            <option key={i} value={s.code}>{s.name.trim()}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="serviceCategory">Service Category</label>
        <select id="serviceCategory" value={formValues.serviceCategory || ""} onChange={handleChange}>
          <option value="">Select Category</option>
          {serviceCategories.map((c, i) => (
            <option key={i} value={c.categoryCode}>{c.categoryName}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="createdBy">Created By</label>
        <input type="text" id="createdBy" value={formValues.createdBy || ""} disabled />
      </div>

      <div className="form-group">
        <label htmlFor="createdDate">Created Date</label>
        <input type="text" id="createdDate" value={formValues.createdDate || ""} disabled />
      </div>
    </form>
  );
});

export default GeneralTab;