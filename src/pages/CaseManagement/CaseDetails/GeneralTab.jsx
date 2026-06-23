import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { API_BASE_URL } from "../../../config";
const trim = (s) => (s ?? "").toString().trim();

// ---- Safe JSON helper (handles session-expired HTML / non-JSON) ----
const fetchJSON = async (url) => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0,180)}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!/application\/json/i.test(ct)) {
    if (/session/i.test(text) || /login/i.test(text) || text.startsWith("<!DOCTYPE")) {
      throw new Error("Session expired or non-JSON response from server.");
    }
    throw new Error(`Expected JSON but got: ${text.slice(0,180)}`);
  }

  try {
    const __j = JSON.parse(text);
    return __j && typeof __j === "object" && "data" in __j ? __j.data : __j;
  } catch {
    throw new Error(`Invalid JSON: ${text.slice(0,180)}`);
  }
};

// For customer option shape variations
const getCustId = (c) => c?.custId || c?.custID || c?.code || c?.id || "";
const getCustName = (c) => (c?.name || c?.fullName || "").trim();

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
    setFormValues({
      ...data,
      source: trim(data?.source),
      sourceName: trim(data?.sourceName) || trim(data?.source),
    });
    fetchCaseMediums();
    fetchServices();
    fetchServiceCategories();

    // Preload Sources once on mount when data has medium + category
    if (data?.medium && data?.categoryCode && !initialSourceFetched) {
      fetchCaseSources(data.medium, data.categoryCode);
      setInitialSourceFetched(true);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Debounced Customer search
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!customerSearchText.trim()) {
        setCustomerOptions([]);
        return;
      }
      try {
        const url = `${API_BASE_URL}/api/CaseDropDown/Customer?SearchText=${encodeURIComponent(
          customerSearchText
        )}`;
        const list = await fetchJSON(url);
        setCustomerOptions(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("Customer search failed:", e);
        setCustomerOptions([]);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [customerSearchText]);

  const fetchCaseMediums = async () => {
    try {
      const result = await fetchJSON(`${API_BASE_URL}/api/CaseDropDown/Medium`);
      setCaseMediums(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Error fetching mediums:", error);
      setCaseMediums([]);
    }
  };

  const fetchCaseSources = async (mediumCode, categoryCode) => {
    try {
      const url = `${API_BASE_URL}/api/CaseDropDown/Medium/Source?CategoryCode=${encodeURIComponent(
        categoryCode || ""
      )}&MediumCode=${encodeURIComponent(mediumCode || "")}`;
      const data = await fetchJSON(url);
      setCaseSources(
      Array.isArray(data)
        ? data.map((s) => {
            const nm = trim(s.name);
            return {
              ...s,
              name: nm,           
              code: trim(s.code), 
              value: nm,          
            };
          })
        : []
    );
    } catch (error) {
      console.error("Error fetching sources:", error);
      setCaseSources([]);
    }
  };

  const fetchServices = async () => {
    try {
      const data = await fetchJSON(`${API_BASE_URL}/api/CaseDropDown/Service`);
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching services:", error);
      setServices([]);
    }
  };

  const fetchServiceCategories = async () => {
    try {
      const data = await fetchJSON(`${API_BASE_URL}/api/CaseCategory/CaseServiceCategory`);
      setServiceCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching service categories:", error);
      setServiceCategories([]);
    }
  };

 const handleChange = (e) => {
  const { id, value } = e.target;

  // Special handling for source: value is the NAME (Facebook DM)
  if (id === "source") {
    setFormValues((prev) => ({
      ...prev,
      source: value,       // store name
      sourceName: value,   // store name
    }));
    return;
  }

  const updated = { ...formValues, [id]: value };
  setFormValues(updated);

  if (id === "medium") {
    fetchCaseSources(value, formValues.categoryCode);
  }
};

  return (
    <form className="genform tabform">
      <fieldset disabled="disabled">
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
          <option value={formValues.subSubSubCategory}>
            {formValues.subSubSubCategoryName}
          </option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="medium">Case Medium</label>
        <select id="medium" value={formValues.medium || ""} onChange={handleChange}>
          <option value="">Select Medium</option>
          {caseMediums
            .filter((m) => m.name !== "< - Select one - >")
            .map((m) => (
              <option key={m.code || m.name} value={trim(m.code || m.name)}>
                {m.name?.trim() || m.code}
              </option>
            ))}
        </select>
      </div>

      <div className="form-group">
  <label htmlFor="source">Case Source</label>
  {(() => {
    const currentSource = trim(formValues.sourceName || formValues.source); // NAME
    const hasSourceOption = caseSources.some((s) => trim(s.value) === currentSource);

    return (
      <select id="source" value={currentSource} onChange={handleChange}>
        <option value="">Select Source</option>

        {!hasSourceOption && currentSource && (
          <option value={currentSource}>{currentSource}</option>
        )}

        {caseSources.map((s, i) => (
          <option key={i} value={trim(s.value)}>
            {s.name}
          </option>
        ))}
      </select>
    );
  })()}
</div>

      <div className="form-group">
        <label htmlFor="priority">Priority</label>
        <select id="priority" value={formValues.priority || ""} onChange={handleChange}>
          <option value="">Select Priority</option>
          <option value="Low">Low</option>
          <option value="Normal">Normal</option>
          <option value="High">High</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="customer">Customer</label>
        <select
          id="customer"
          value={formValues.customer || formValues.customerId || ""}
          onChange={(e) => {
            const id = e.target.value;
            const found = customerOptions.find((c) => getCustId(c) === id);
            setFormValues((prev) => ({
              ...prev,
              customer: id,                 // store ID for POST (custID)
              customerId: id,
              customerName: getCustName(found) || prev.customerName || "",
            }));
          }}
        >
          <option value="">Select Customer</option>
          {customerOptions.length === 0 &&
            (formValues.customer || formValues.customerId) &&
            formValues.customerName && (
              <option value={formValues.customer || formValues.customerId}>
                {formValues.customerName}
              </option>
            )}
          {customerOptions.map((cust, i) => (
            <option key={i} value={getCustId(cust)}>
              {getCustName(cust) || getCustId(cust)}
            </option>
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
          {services
            .filter((s) => s.code !== "< - Select one - >")
            .map((s, i) => (
              <option key={i} value={s.code}>
                {s.name?.trim() || s.code}
              </option>
            ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="serviceCategory">Service Category</label>
        <select
          id="serviceCategory"
          value={formValues.serviceCategory || ""}
          onChange={handleChange}
        >
          <option value="">Select Category</option>
          {serviceCategories.map((c, i) => (
            <option key={i} value={c.categoryCode}>
              {c.categoryName}
            </option>
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
      </fieldset>
    </form>
  );
});

export default GeneralTab;