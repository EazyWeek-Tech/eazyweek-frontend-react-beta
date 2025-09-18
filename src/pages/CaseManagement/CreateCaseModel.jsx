import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";

const CreateCaseModel = ({ isOpen, onClose, onSubmit }) => {
  const [activeTab, setActiveTab] = useState("sign-in");
  const [caseCategories, setCaseCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("");
  const [subSubCategories, setSubSubCategories] = useState([]);
  const [selectedSubCategoryCode, setSelectedSubCategoryCode] = useState("");
  const [subSubSubCategories, setSubSubSubCategories] = useState([]);
  const [selectedSubSubCategoryCode, setSelectedSubSubCategoryCode] = useState("");
  const [selectedSubSubSubCategoryCode, setSelectedSubSubSubCategoryCode] = useState("");
  const [caseMediums, setCaseMediums] = useState([]);
  const [caseSources, setCaseSources] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [specificResolutions, setSpecificResolutions] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const toastRef = useRef(null);

  // App-level toast (fixed position)
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const toastTimer = useRef(null);
  const showToast = (message, type = "success", timeout = 4000) => {
    setToast({ visible: true, message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), timeout);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  // Install global fetch logger once
  useEffect(() => {
    if (typeof window !== "undefined" && !window.__fetchLoggerInstalled) {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init = {}) => {
        const method = (init && init.method) || "GET";
        const url = typeof input === "string" ? input : input?.url;
        let payload = init?.body;
        try {
          if (typeof payload === "string") payload = JSON.parse(payload);
        } catch {
          /* leave as string if not JSON */
        }
        try {
          console.log("[API REQUEST]", method, url, {
            headers: init?.headers,
            credentials: init?.credentials,
            payload,
          });
          const response = await originalFetch(input, init);
          const clone = response.clone();
          (async () => {
            try {
              const text = await clone.text();
              let data = null;
              try {
                data = text ? JSON.parse(text) : null;
              } catch {
                data = text;
              }
              console.log(
                "[API RESPONSE]",
                method,
                url,
                { status: response.status, ok: response.ok },
                data
              );
            } catch {
              console.log("[API RESPONSE]", method, url, {
                status: response.status,
                ok: response.ok,
                note: "non-text/stream body",
              });
            }
          })();
          return response;
        } catch (e) {
          console.error("[API ERROR]", method, url, e);
          throw e;
        }
      };
      window.__fetchLoggerInstalled = true;
    }
  }, []);

  const [currentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Display name for logged-in user
  const getUserDisplay = (u) => {
    if (!u) return "";
    const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    return full || u.userName || u.email || u.userId || "";
  };

  useEffect(() => {
    if (toastRef.current) toastRef.current.style.display = "none";

    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/CaseCategory/CaseCategory`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        setCaseCategories(data);
      } catch (error) {
        console.error("Failed to fetch case categories:", error);
      }
    };

    const fetchCaseMediums = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/CaseDropDown/Medium`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        setCaseMediums(data);
      } catch (error) {
        console.error("Error fetching case mediums:", error);
      }
    };

    const fetchServices = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/CaseDropDown/Service`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    const fetchTherapists = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/CaseDropDown/Medium/Doctors`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        setTherapists(data.filter((doc) => doc.code && doc.name !== "< - Select one - >"));
      } catch (error) {
        console.error("Error fetching therapists:", error);
      }
    };

    const fetchServiceCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/CaseCategory/CaseServiceCategory`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        setServiceCategories(data);
      } catch (error) {
        console.error("Error fetching service categories:", error);
      }
    };

    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Employees`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        const validEmployees = data.filter(
          (emp) => emp.employeeCode && emp.employeeName !== "Assign To"
        );
        setEmployees(validEmployees);
      } catch (err) {
        console.error("Error fetching employees:", err);
        setEmployees([]);
      }
    };

    fetchCategories();
    fetchCaseMediums();
    fetchServices();
    fetchTherapists();
    fetchServiceCategories();
    fetchEmployees();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const fetchCustomers = async () => {
        if (!customerSearchText.trim()) {
          setCustomerOptions([]);
          return;
        }
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/CaseDropDown/Customer?SearchText=${encodeURIComponent(
              customerSearchText
            )}`,
            {
              method: "GET",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            }
          );
          const data = await res.json();
          setCustomerOptions(data);
        } catch (err) {
          console.error("Error fetching customers:", err);
          setCustomerOptions([]);
        }
      };
      fetchCustomers();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [customerSearchText]);

  useEffect(() => {
    if (
      selectedCategoryCode &&
      selectedSubCategoryCode &&
      selectedSubSubCategoryCode &&
      selectedSubSubSubCategoryCode
    ) {
      const fetchCaseOperationDetails = async () => {
        const url = `${API_BASE_URL}/api/CaseOperation/${selectedCategoryCode}/${selectedSubCategoryCode}/${selectedSubSubCategoryCode}/${selectedSubSubSubCategoryCode}`;
        try {
          const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
          const data = await response.json();

          if (data.priority) handleChange("priority", data.priority || "");
          if (data.mobilephone) handleChange("employeno", data.mobilephone.trim());
          if (data.firstemailid && data.assignTOName) {
            handleChange("email", data.firstemailid.trim());
            handleChange("emailDisplay", data.assignTOName);
          }
          handleChange("assignedTo", data.assignTOName || "");
          handleChange("employeeCode", data.assignToCode || "");
          handleChange("assignedemailid", data.firstemailid || "");
          handleChange("cc", normalizeEmailList(data.emailCC) || "");
          handleChange("owner", data.firstassignmentname || "");
        } catch (error) {
          console.error("Error fetching case operation details:", error);
        }
      };
      fetchCaseOperationDetails();
    }
  }, [
    selectedCategoryCode,
    selectedSubCategoryCode,
    selectedSubSubCategoryCode,
    selectedSubSubSubCategoryCode,
  ]);

  useEffect(() => {
    if (currentUser) {
      const ownerName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();
      handleChange("owner", ownerName);
    }
  }, [currentUser]);

  const [formValues, setFormValues] = useState({
    title: "",
    category: "",
    subcategory: "",
    subSubcategory: "",
    subSubSubcategory: "",
    caseMedium: "",
    caseSource: "",
    priority: "",
    customer: "",
    customerCode: "",
    product: "",
    service: "",
    serviceCategory: "",
    assignedTo: "",
    employeeCode: "",
    owner: "",
    issuedesciption: "",
    clientThreat: "",
    therapist: "",
    doctorCode: "",
    firsttimeresolution: "",
    response: "",
    employeno: "",
    assignedemailid: "",
    email: "",
    emailDisplay: "",
    cc: "",
    moreCC: "",
    specificResolution: "",
    remarks: "",
  });

  const handleChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormValues({
      title: "",
      category: "",
      subcategory: "",
      subSubcategory: "",
      subSubSubcategory: "",
      caseMedium: "",
      caseSource: "",
      priority: "",
      customer: "",
      customerCode: "",
      product: "",
      service: "",
      serviceCategory: "",
      assignedTo: "",
      employeeCode: "",
      owner: "",
      issuedesciption: "",
      clientThreat: "",
      therapist: "",
      doctorCode: "",
      firsttimeresolution: "",
      response: "",
      employeno: "",
      assignedemailid: "",
      email: "",
      emailDisplay: "",
      cc: "",
      moreCC: "",
      specificResolution: "",
      remarks: "",
    });
    setSelectedCategoryCode("");
    setSelectedSubCategoryCode("");
    setSelectedSubSubCategoryCode("");
    setSelectedSubSubSubCategoryCode("");
    setSubCategories([]);
    setSubSubCategories([]);
    setSubSubSubCategories([]);
    setProducts([]);
    setSpecificResolutions([]);
    setCustomerSearchText("");
    setCustomerOptions([]);
  };

  // Helpers for email + center names
  const getCategoryName = (code) => {
    const c = caseCategories.find((x) => x.categoryCode === code);
    return c?.categoryName || "";
  };
  const getSubCategoryName = (code) => {
    const s = subCategories.find((x) => x.subCategoryCode === code);
    return s?.subCategoryName || "";
  };
  const getCenterName = () => {
    return (
      currentUser?.centerName ||
      currentUser?.center ||
      currentUser?.centerDesc ||
      currentUser?.centerDescription ||
      currentUser?.centerCode ||
      ""
    );
  };
  // Normalize a list of email addresses:
// - split on comma/semicolon/newline
// - trim, drop empties
// - strip quotes/CR/LF
// - dedupe case-insensitively
// - join with semicolons (avoids ',' in header)
const normalizeEmailList = (raw) => {
  if (!raw) return "";
  const parts = String(raw)
    .split(/[,;\n]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/[\r\n"]/g, ""));
  const seen = new Set();
  const uniq = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) { seen.add(k); uniq.push(p); }
  }
  return uniq.join("; ");
};

  const sendCaseAssignmentEmail = async (caseNo) => {
    const mailBody = {
      emailTo: (formValues.email || "").trim().replace(/[\r\n"]/g, ""),
      centerName: getCenterName(),
      caseNo: caseNo || "",
      categoryName: getCategoryName(formValues.category),
      subCategoryName: getSubCategoryName(formValues.subcategory),
      issueDescription: formValues.issuedesciption || "",
      newResponse: formValues.response || "",
      firstTimeResolution: formValues.firsttimeresolution || "",
      emailCC: normalizeEmailList(formValues.cc),
moreCC: normalizeEmailList(formValues.moreCC),
    };
    if (!mailBody.emailTo) {
      console.warn("CaseMail skipped: no emailTo set.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseMail`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mailBody),
      });
      if (!res.ok) console.error("CaseMail failed with status:", res.status);
    } catch (err) {
      console.error("Error sending CaseMail:", err);
    }
  };

  // ========= Validation =========
  const isComplaintCategory = () => {
    const cat = caseCategories.find((c) => c.categoryCode === formValues.category);
    return !!cat && /complaint/i.test(cat.categoryName || "");
  };

  const validateGeneralTab = () => {
    const errs = {};
    if (!formValues.title?.trim()) errs.title = "Case Title is required.";
    // ASCII-only title
    if (/[^\x20-\x7E]/.test(formValues.title)) {
      errs.title = "Only English (ASCII) characters are allowed.";
    }
    if (!formValues.category) errs.category = "Case Category is required.";
    if (!formValues.subcategory) errs.subcategory = "Case Sub Category is required.";
    if (!formValues.subSubcategory) errs.subSubcategory = "Case Sub Sub Category is required.";
    if (!formValues.subSubSubcategory)
      errs.subSubSubcategory = "Case Sub Sub Sub Category is required.";
    if (!formValues.caseMedium) errs.caseMedium = "Case Medium is required.";
    if (!formValues.caseSource) errs.caseSource = "Case Source is required.";
    if (!formValues.priority) errs.priority = "Priority is required.";
    if (!customerSearchText?.trim()) errs.customerSearchText = "Search Customer is required.";
    if (!formValues.customerCode) errs.customerCode = "Customer is required.";

    const createdByDisplay = getUserDisplay(currentUser);
    if (!createdByDisplay) errs.createdBy = "Created By is required.";
    const createdDateDisplay = new Date().toLocaleDateString();
    if (!createdDateDisplay) errs.createdDate = "Created Date is required.";

    return errs;
  };

  const validateIssueTab = () => {
    const errs = {};
    if (!formValues.issuedesciption?.trim())
      errs.issuedesciption = "Issue Description is required.";
    if (!formValues.clientThreat) errs.clientThreat = "Client Threat is required.";
    if (!formValues.doctorCode) errs.doctorCode = "Therapist is required.";
    if (!formValues.employeno?.trim()) errs.employeno = "Employee Mobile is required.";
    if (!formValues.employeeCode) errs.employeeCode = "Assigned To is required.";
    if (!formValues.email?.trim()) errs.email = "Email is required.";
    if (!formValues.cc?.trim()) errs.cc = "CC is required.";
    
    return errs;
  };
  // ==============================

  const handleSignInClick = (e) => {
    e.preventDefault();
    setActiveTab("sign-in");
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();
    if (activeTab !== "sign-in") {
      if (toastRef.current) {
        toastRef.current.style.display = "block";
        setTimeout(() => {
          if (toastRef.current) toastRef.current.style.display = "none";
        }, 3000);
      }
      return;
    }
    setActiveTab("register");
  };

  // Sanitize title to ASCII only (blocks Arabic/other scripts)
  const sanitizeAscii = (s) => s.replace(/[^\x20-\x7E]/g, "");

  const handleSave = async () => {
    const generalErrs = validateGeneralTab();
    const issueErrs = activeTab === "register" ? validateIssueTab() : {};
    const allErrs = { ...generalErrs, ...issueErrs };

    if (Object.keys(allErrs).length > 0) {
      setValidationErrors((prev) => ({ ...prev, ...allErrs }));
      if (Object.keys(generalErrs).length > 0) setActiveTab("sign-in");
      else if (Object.keys(issueErrs).length > 0) setActiveTab("register");
      return;
    }

    const user = currentUser;
    if (isSaving) return;
    setIsSaving(true);

    const payload = {
      casetitle: formValues.title,
      caseno: "",
      category: formValues.category,
      subCategory: formValues.subcategory,
      subSubCategory: formValues.subSubcategory,
      subSubSubCategory: formValues.subSubSubcategory,
      casemedium: formValues.caseMedium,
      casesource: formValues.caseSource,
      priority: formValues.priority,
      custID: formValues.customerCode,
      productCode: formValues.product,
      servicecode: formValues.service,
      serviceccode: formValues.serviceCategory,
      createdby: user?.userId,
      createddate: new Date().toISOString(),
      issuedesciption: formValues.issuedesciption,
      clientThreat: formValues.clientThreat,
      doctorCode: formValues.doctorCode,
      firsttimeresolution: formValues.firsttimeresolution,
      response: formValues.response,
      assignedto: "",
      employeno: formValues.employeno,
      assignedemailid: formValues.email,
      cc: formValues.cc,
      moreCC: formValues.moreCC,
      categorySpecificResolution: formValues.specificResolution,
      remarks: formValues.remarks,
      casedisposition: "",
      caseWith: user?.userId,
      status: "Open",
      operation: "Save",
      materialCost: 0,
      labourCost: 0,
      otherCharges: 0,
      totalCharges: 0,
      isdraft: 1,
      centercode: user?.centerCode,
      departmentcode: "",
      custcliniccode: "",
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/CaseOperation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.code === "200") {
        localStorage.setItem("lastSavedCaseNo", result.name);
        showToast(`Case saved successfully (Case No: ${result.name})`, "success");
        setActiveTab("register");
      } else {
        showToast(`Failed to save case: ${result.name || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Error during case save:", error);
      showToast("Network or server error while saving the case.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    const generalErrs = validateGeneralTab();
    const issueErrs = validateIssueTab();
    const allErrs = { ...generalErrs, ...issueErrs };
    if (Object.keys(allErrs).length > 0) {
      setValidationErrors(allErrs);
      if (Object.keys(generalErrs).length > 0) setActiveTab("sign-in");
      else setActiveTab("register");
      return;
    }

    setValidationErrors({});
    const savedCaseNo = localStorage.getItem("lastSavedCaseNo") || "";
    const user = currentUser;

    const payload = {
      casetitle: formValues.title,
      caseno: savedCaseNo,
      category: formValues.category,
      subCategory: formValues.subcategory,
      subSubCategory: formValues.subSubcategory,
      subSubSubCategory: formValues.subSubSubcategory,
      casemedium: formValues.caseMedium,
      casesource: formValues.caseSource,
      priority: formValues.priority,
      custID: formValues.customerCode,
      productCode: formValues.product,
      servicecode: formValues.service,
      serviceccode: formValues.serviceCategory,
      createdby: user?.userId,
      createddate: new Date().toISOString(),
      issuedesciption: formValues.issuedesciption,
      clientThreat: formValues.clientThreat,
      doctorCode: formValues.doctorCode,
      firsttimeresolution: formValues.firsttimeresolution,
      response: formValues.response,
      assignedto: formValues.employeeCode,
      employeno: formValues.employeno,
      assignedemailid: formValues.email,
      cc: formValues.cc,
      moreCC: formValues.moreCC,
      categorySpecificResolution: formValues.specificResolution,
      remarks: formValues.remarks,
      casedisposition: "",
      caseWith: formValues.employeeCode,
      status: "Open",
      operation: "Submit",
      materialCost: 0,
      labourCost: 0,
      otherCharges: 0,
      totalCharges: 0,
      isdraft: 0,
      centercode: user?.centerCode,
      departmentcode: "",
      custcliniccode: "",
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/CaseOperation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.code === "200") {
  const finalCaseNo = result?.name || savedCaseNo || "";
  await sendCaseAssignmentEmail(finalCaseNo);

  // show toast
  showToast(`Case submitted successfully (Case No: ${finalCaseNo})`, "success");

  // include the final case no in the payload we bubble up
  const payloadWithCaseNo = { ...payload, caseno: finalCaseNo };
  onSubmit && onSubmit(payloadWithCaseNo);

  // reset and close
  resetForm();
  setActiveTab("sign-in");

  // Close the popup
  if (typeof onClose === "function") {
    onClose();
    // If you want to let the toast be visible BEFORE close, delay it:
    // setTimeout(() => onClose(), 1200);
  }
} else {
  showToast(`Failed to save case: ${result.name || "Unknown error"}`, "error");
}

    } catch (error) {
      console.error("Error during case save:", error);
      showToast("Network or server error while saving the case.", "error");
    }
  };

  // RENDER: toast ALWAYS; modal conditionally
  return (
    <>
      {/* Fixed-position toast (always rendered) */}
      <div
        className={`app-toast ${toast.type}`}
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          padding: "10px 14px",
          background: toast.type === "error" ? "#d9534f" : "#28a745",
          color: "#fff",
          borderRadius: 8,
          boxShadow: "0 4px 14px rgba(0,0,0,.2)",
          opacity: toast.visible ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity .25s ease",
          zIndex: 9999,
        }}
      >
        {toast.message}
      </div>

      {isOpen && (
        <div className="modal-window show">
          <div>
            <h2 className="frmttl">
              Create Case
              <a onClick={onClose} className="modal-close" title="Close">
                <i className="bx bx-x"></i>
              </a>
            </h2>

            <ul className="popuptabs clearfix">
              <li>
                <a
                  href="#"
                  id="sign-in"
                  className={`sign-in ${activeTab === "sign-in" ? "active" : ""}`}
                  onClick={handleSignInClick}
                >
                  General
                </a>
              </li>
              <li>
                <a
                  href="#"
                  id="register"
                  className={`register ${activeTab === "register" ? "active" : ""} ${
                    activeTab === "sign-in" ? "" : "disabled"
                  }`}
                  onClick={handleRegisterClick}
                >
                  Issues and Responses
                </a>
              </li>

              <div ref={toastRef} className="toastmsg">
                Please fill the General Tab
              </div>
            </ul>

            {/* General Tab */}
            <div className={`formwrap sign-in ${activeTab === "sign-in" ? "active" : ""}`}>
              {/* Case Title */}
              <div className="form-group">
                <label htmlFor="caseTitle">
                  Case Title <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  id="caseTitle"
                  placeholder="Enter Case Title"
                  value={formValues.title}
                  onChange={(e) => {
                    const sanitized = sanitizeAscii(e.target.value);
                    handleChange("title", sanitized);
                    setValidationErrors((p) => ({ ...p, title: null }));
                  }}
                  className={validationErrors.title ? "error-border" : ""}
                />
                {validationErrors.title && (
                  <div className="error-text">{validationErrors.title}</div>
                )}
              </div>

              {/* Case Category */}
              <div className="form-group">
                <label htmlFor="caseCategory">
                  Case Category <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="caseCategory"
                  value={selectedCategoryCode}
                  onChange={async (e) => {
                    const code = e.target.value;
                    setSelectedCategoryCode(code);

                    if (!code) {
                      handleChange("category", "");
                      setSubCategories([]);
                      setSelectedSubCategoryCode("");
                      setSubSubCategories([]);
                      setSelectedSubSubCategoryCode("");
                      setSubSubSubCategories([]);
                      setProducts([]);
                      setSpecificResolutions([]);
                      setValidationErrors((p) => ({
                        ...p,
                        category: "Case Category is required.",
                      }));
                      return;
                    }

                    setValidationErrors((p) => ({ ...p, category: null }));

                    const selected = caseCategories.find((c) => c.categoryCode === code);
                    handleChange("category", selected?.categoryCode || "");

                    try {
                      const res = await fetch(
                        `${API_BASE_URL}/api/CaseCategory/CaseSubCategory?CategoryCode=${code}`,
                        {
                          method: "GET",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                        }
                      );
                      const data = await responseToJsonSafe(res);
                      setSubCategories(data || []);
                    } catch (error) {
                      console.error("Error fetching subcategories:", error);
                      setSubCategories([]);
                    }

                    // Products
                    try {
                      const prodRes = await fetch(
                        `${API_BASE_URL}/api/CaseDropDown/Product?CategoryCode=${code}`,
                        {
                          method: "GET",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                        }
                      );
                      const prodData = await responseToJsonSafe(prodRes);
                      setProducts(prodData || []);
                    } catch (err) {
                      console.error("Error fetching products:", err);
                      setProducts([]);
                    }

                    // Specific Resolutions
                    try {
                      const specificRes = await fetch(
                        `${API_BASE_URL}/api/CaseDropDown/Medium/SpecificResolution?CategoryCode=${code}`,
                        {
                          method: "GET",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                        }
                      );
                      const specificData = await responseToJsonSafe(specificRes);
                      setSpecificResolutions(specificData || []);
                    } catch (err) {
                      console.error("Error fetching Specific Resolutions:", err);
                      setSpecificResolutions([]);
                    }
                  }}
                  className={validationErrors.category ? "error-border" : ""}
                >
                  <option value="">Select Category</option>
                  {caseCategories.map((cat) => (
                    <option key={cat.categoryCode} value={cat.categoryCode}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
                {validationErrors.category && (
                  <div className="error-text">{validationErrors.category}</div>
                )}
              </div>

              {/* Sub Category */}
              <div className="form-group">
                <label htmlFor="caseSubCategory">
                  Case Sub Category <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="caseSubCategory"
                  value={selectedSubCategoryCode}
                  disabled={!selectedCategoryCode}
                  onChange={async (e) => {
                    const code = e.target.value;
                    setSelectedSubCategoryCode(code);

                    if (!code) {
                      handleChange("subcategory", "");
                      setSubSubCategories([]);
                      setSelectedSubSubCategoryCode("");
                      setSubSubSubCategories([]);
                      setValidationErrors((p) => ({
                        ...p,
                        subcategory: "Case Sub Category is required.",
                      }));
                      return;
                    }

                    setValidationErrors((p) => ({ ...p, subcategory: null }));

                    const selected = subCategories.find((s) => s.subCategoryCode === code);
                    handleChange("subcategory", selected?.subCategoryCode || "");

                    try {
                      const res = await fetch(
                        `${API_BASE_URL}/api/CaseCategory/CaseSubSubCategory?CategoryCode=${selectedCategoryCode}&SubCategoryCode=${code}`,
                        {
                          method: "GET",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                        }
                      );
                      const data = await responseToJsonSafe(res);
                      setSubSubCategories(data || []);
                    } catch (err) {
                      console.error("Error fetching sub-subcategories:", err);
                      setSubSubCategories([]);
                    }
                  }}
                  className={validationErrors.subcategory ? "error-border" : ""}
                >
                  <option value="">Select Sub Category</option>
                  {subCategories.map((sub) => (
                    <option key={sub.subCategoryCode} value={sub.subCategoryCode}>
                      {sub.subCategoryName}
                    </option>
                  ))}
                </select>
                {validationErrors.subcategory && (
                  <div className="error-text">{validationErrors.subcategory}</div>
                )}
              </div>

              {/* Sub Sub Category */}
              <div className="form-group">
                <label htmlFor="caseSubSubCategory">
                  Case Sub Sub Category <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="caseSubSubCategory"
                  value={selectedSubSubCategoryCode}
                  disabled={!selectedCategoryCode || !selectedSubCategoryCode}
                  onChange={async (e) => {
                    const code = e.target.value;
                    setSelectedSubSubCategoryCode(code);

                    if (!code) {
                      handleChange("subSubcategory", "");
                      setSubSubSubCategories([]);
                      setValidationErrors((p) => ({
                        ...p,
                        subSubcategory: "Case Sub Sub Category is required.",
                      }));
                      return;
                    }

                    setValidationErrors((p) => ({ ...p, subSubcategory: null }));

                    const selected = subSubCategories.find((item) => item.subCategoryCode === code);
                    handleChange("subSubcategory", selected?.subCategoryCode || "");

                    try {
                      const res = await fetch(
                        `${API_BASE_URL}/api/CaseCategory/CaseSubSubSubCategory?CategoryCode=${selectedCategoryCode}&SubCategoryCode=${selectedSubCategoryCode}&SubSubCategoryCode=${code}`,
                        {
                          method: "GET",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                        }
                      );
                      const data = await responseToJsonSafe(res);
                      setSubSubSubCategories(data || []);
                    } catch (err) {
                      console.error("Error fetching sub sub sub categories:", err);
                      setSubSubSubCategories([]);
                    }
                  }}
                  className={validationErrors.subSubcategory ? "error-border" : ""}
                >
                  <option value="">Select Sub Sub Category</option>
                  {subSubCategories.map((item, index) => (
                    <option key={`${item.subCategoryCode || index}`} value={item.subCategoryCode}>
                      {item.subSubCategoryName}
                    </option>
                  ))}
                </select>
                {validationErrors.subSubcategory && (
                  <div className="error-text">{validationErrors.subSubcategory}</div>
                )}
              </div>

              {/* Sub Sub Sub Category */}
              <div className="form-group">
                <label htmlFor="caseSubSubSubCategory">
                  Case Sub Sub Sub Category <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="caseSubSubSubCategory"
                  value={selectedSubSubSubCategoryCode}
                  disabled={
                    !selectedCategoryCode || !selectedSubCategoryCode || !selectedSubSubCategoryCode
                  }
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedSubSubSubCategoryCode(code);

                    const selected = subSubSubCategories.find(
                      (item) => item.subSubCategoryCode === code
                    );
                    handleChange("subSubSubcategory", selected?.subSubCategoryCode || "");

                    setValidationErrors((p) => ({
                      ...p,
                      subSubSubcategory: code ? null : "Case Sub Sub Sub Category is required.",
                    }));
                  }}
                  className={validationErrors.subSubSubcategory ? "error-border" : ""}
                >
                  <option value="">Select Sub Sub Sub Category</option>
                  {subSubSubCategories.map((item, index) => (
                    <option key={item.subSubCategoryCode || index} value={item.subSubCategoryCode}>
                      {item.subSubSubCategoryName}
                    </option>
                  ))}
                </select>
                {validationErrors.subSubSubcategory && (
                  <div className="error-text">{validationErrors.subSubSubcategory}</div>
                )}
              </div>

              {/* Case Medium */}
              <div className="form-group">
                <label htmlFor="caseMedium">
                  Case Medium <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="caseMedium"
                  value={formValues.caseMedium}
                  onChange={async (e) => {
                    const mediumValue = e.target.value;
                    handleChange("caseMedium", mediumValue);
                    setValidationErrors((p) => ({
                      ...p,
                      caseMedium: mediumValue ? null : "Case Medium is required.",
                    }));

                    if (selectedCategoryCode && mediumValue) {
                      try {
                        const res = await fetch(
                          `${API_BASE_URL}/api/CaseDropDown/Medium/Source?CategoryCode=${selectedCategoryCode}&MediumCode=${mediumValue}`,
                          {
                            method: "GET",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                          }
                        );
                        const data = await responseToJsonSafe(res);
                        setCaseSources(data || []);
                      } catch (error) {
                        console.error("Failed to fetch case sources:", error);
                        setCaseSources([]);
                      }
                    } else {
                      setCaseSources([]);
                    }
                  }}
                  className={validationErrors.caseMedium ? "error-border" : ""}
                >
                  <option value="">Select Medium</option>
                  {caseMediums
                    .filter((item) => item.code !== "< - Select one - >")
                    .map((item, index) => (
                      <option key={index} value={item.name.trim()}>
                        {item.name.trim()}
                      </option>
                    ))}
                </select>
                {validationErrors.caseMedium && (
                  <div className="error-text">{validationErrors.caseMedium}</div>
                )}
              </div>

              {/* Case Source */}
              <div className="form-group">
                <label htmlFor="caseSource">
                  Case Source <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="caseSource"
                  value={formValues.caseSource}
                  disabled={
                    !selectedCategoryCode || !formValues.caseMedium || caseSources.length === 0
                  }
                  onChange={(e) => {
                    handleChange("caseSource", e.target.value);
                    setValidationErrors((p) => ({
                      ...p,
                      caseSource: e.target.value ? null : "Case Source is required.",
                    }));
                  }}
                  className={validationErrors.caseSource ? "error-border" : ""}
                >
                  <option value="">Select Source</option>
                  {caseSources.map((source, index) => (
                    <option key={index} value={source.code}>
                      {source.name.trim()}
                    </option>
                  ))}
                </select>
                {validationErrors.caseSource && (
                  <div className="error-text">{validationErrors.caseSource}</div>
                )}
              </div>

              {/* Priority */}
              <div className="form-group">
                <label htmlFor="priority">
                  Priority <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="priority"
                  value={formValues.priority}
                  onChange={(e) => {
                    handleChange("priority", e.target.value);
                    setValidationErrors((p) => ({
                      ...p,
                      priority: e.target.value ? null : "Priority is required.",
                    }));
                  }}
                  className={validationErrors.priority ? "error-border" : ""}
                >
                  <option value="">Select Priority</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                {validationErrors.priority && (
                  <div className="error-text">{validationErrors.priority}</div>
                )}
              </div>

              {/* Search Customer */}
              <div className="form-group">
                <label htmlFor="customerSearch">
                  Search Customer <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="search"
                  id="customerSearch"
                  placeholder="Search Customer"
                  value={customerSearchText}
                  onChange={(e) => {
                    setCustomerSearchText(e.target.value);
                    setValidationErrors((p) => ({
                      ...p,
                      customerSearchText: e.target.value?.trim()
                        ? null
                        : "Search Customer is required.",
                    }));
                  }}
                  className={validationErrors.customerSearchText ? "error-border" : ""}
                />
                {validationErrors.customerSearchText && (
                  <div className="error-text">{validationErrors.customerSearchText}</div>
                )}
              </div>

              {/* Customer */}
              <div className="form-group">
                <label htmlFor="customer">
                  Customer <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="customer"
                  value={formValues.customerCode}
                  disabled={customerOptions.length === 0}
                  onChange={(e) => {
                    const selectedCode = e.target.value;
                    const selected = customerOptions.find((cust) => cust.code === selectedCode);
                    handleChange("customerCode", selectedCode);
                    handleChange("customer", selected?.name || "");
                    setValidationErrors((p) => ({
                      ...p,
                      customerCode: selectedCode ? null : "Customer is required.",
                    }));
                  }}
                  className={validationErrors.customerCode ? "error-border" : ""}
                >
                  <option value="">Select Customer</option>
                  {customerOptions.map((cust, index) => (
                    <option key={index} value={cust.code}>
                      {cust.name.trim()}
                    </option>
                  ))}
                </select>
                {validationErrors.customerCode && (
                  <div className="error-text">{validationErrors.customerCode}</div>
                )}
              </div>

              {/* Product (optional) */}
              <div className="form-group">
                <label htmlFor="product">Product</label>
                <select
                  id="product"
                  value={formValues.product}
                  disabled={!selectedCategoryCode || products.length === 0}
                  onChange={(e) => handleChange("product", e.target.value)}
                >
                  <option value="">Select Product</option>
                  {products
                    .filter((p) => p.code !== "0")
                    .map((product, index) => (
                      <option key={index} value={product.code}>
                        {product.name.trim()}
                      </option>
                    ))}
                </select>
              </div>

              {/* Service (optional) */}
              <div className="form-group">
                <label htmlFor="service">Service</label>
                <select
                  id="service"
                  value={formValues.service}
                  onChange={(e) => handleChange("service", e.target.value)}
                >
                  <option value="">Select Service</option>
                  {services
                    .filter((s) => s.code !== "0")
                    .map((service, index) => (
                      <option key={index} value={service.code}>
                        {service.name.trim()}
                      </option>
                    ))}
                </select>
              </div>

              {/* Service Category (optional) */}
              <div className="form-group">
                <label htmlFor="serviceCategory">Service Category</label>
                <select
                  id="serviceCategory"
                  value={formValues.serviceCategory}
                  onChange={(e) => handleChange("serviceCategory", e.target.value)}
                >
                  <option value="">Select Service Category</option>
                  {serviceCategories.map((cat, index) => (
                    <option key={index} value={cat.categoryCode}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Created By */}
              <div className="form-group">
                <label htmlFor="createdBy">
                  Created By <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  id="createdBy"
                  value={getUserDisplay(currentUser)}
                  readOnly
                  className={validationErrors.createdBy ? "error-border" : ""}
                />
                {validationErrors.createdBy && (
                  <div className="error-text">{validationErrors.createdBy}</div>
                )}
              </div>

              {/* Created Date */}
              <div className="form-group">
                <label htmlFor="createdDate">
                  Created Date <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  id="createdDate"
                  disabled
                  value={new Date().toLocaleDateString()}
                  className={validationErrors.createdDate ? "error-border" : ""}
                />
                {validationErrors.createdDate && (
                  <div className="error-text">{validationErrors.createdDate}</div>
                )}
              </div>

              <div className="buttongrp">
                <a className="pribtn" onClick={handleSave}>
                  Save
                </a>
                <a className="secbtn" onClick={handleSubmit}>
                  Submit
                </a>
                <a className="secbtn" onClick={onClose}>
                  Cancel
                </a>
              </div>
            </div>

            {/* Issues and Responses Tab */}
            <div className={`formwrap register ${activeTab === "register" ? "active" : ""}`}>
              {/* Issue Description (required) */}
              <div className="form-group">
                <label htmlFor="issuedesciption">
                  Issue Description <span style={{ color: "red" }}>*</span>
                </label>
                <textarea
                  id="issuedesciption"
                  rows="5"
                  value={formValues.issuedesciption}
                  onChange={(e) => {
                    handleChange("issuedesciption", e.target.value);
                    setValidationErrors((prev) => ({ ...prev, issuedesciption: null }));
                  }}
                  className={validationErrors.issuedesciption ? "error-border" : ""}
                ></textarea>
                {validationErrors.issuedesciption && (
                  <div className="error-text">{validationErrors.issuedesciption}</div>
                )}
              </div>

              {/* Attachment (optional) */}
              <div className="form-group">
                <label htmlFor="attachment">Attachment</label>
                <input
                  type="file"
                  id="attachment"
                  onChange={(e) => handleChange("attachment", e.target.files[0])}
                />
                <div className="error"></div>
              </div>

              {/* Client Threat (required) */}
              <div className="form-group">
                <label htmlFor="clientThreat">
                  Client Threat <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="clientThreat"
                  value={formValues.clientThreat}
                  onChange={(e) => {
                    handleChange("clientThreat", e.target.value);
                    setValidationErrors((prev) => ({ ...prev, clientThreat: null }));
                  }}
                  className={validationErrors.clientThreat ? "error-border" : ""}
                >
                  <option value="">-- Select --</option>
                  <option value="Legal">Legal</option>
                  <option value="Verbal">Verbal</option>
                  <option value="Written">Written</option>
                  <option value="Physical">Physical</option>
                </select>
                {validationErrors.clientThreat && (
                  <div className="error-text">{validationErrors.clientThreat}</div>
                )}
              </div>

              {/* Therapist (required) */}
              <div className="form-group">
                <label htmlFor="therapist">
                  Therapist <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="therapist"
                  value={formValues.doctorCode}
                  onChange={(e) => {
                    const selectedCode = e.target.value;
                    const selectedDoc = therapists.find((doc) => doc.code === selectedCode);
                    handleChange("doctorCode", selectedCode);
                    handleChange("therapist", selectedDoc?.name || "");
                    setValidationErrors((prev) => ({ ...prev, doctorCode: null }));
                  }}
                  className={validationErrors.doctorCode ? "error-border" : ""}
                >
                  <option value="">Select Therapist</option>
                  {therapists
                    .filter((doc) => doc.code !== "")
                    .map((doc, index) => (
                      <option key={index} value={doc.code}>
                        {doc.name.trim()}
                      </option>
                    ))}
                </select>
                {validationErrors.doctorCode && (
                  <div className="error-text">{validationErrors.doctorCode}</div>
                )}
              </div>

              {/* First Time Resolution (optional) */}
              <div className="form-group">
                <label htmlFor="firsttimeresolution">First Time Resolution</label>
                <textarea
                  id="firsttimeresolution"
                  rows="5"
                  value={formValues.firsttimeresolution}
                  onChange={(e) => handleChange("firsttimeresolution", e.target.value)}
                ></textarea>
                <div className="error"></div>
              </div>

              {/* Add Response (optional) */}
              <div className="form-group">
                <label htmlFor="response">Add Response</label>
                <textarea
                  id="response"
                  rows="5"
                  value={formValues.response}
                  onChange={(e) => handleChange("response", e.target.value)}
                ></textarea>
                <div className="error"></div>
              </div>

              {/* Employee Mobile (required) */}
              <div className="form-group">
                <label htmlFor="employeno">
                  Employee Mobile <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  id="employeno"
                  value={formValues.employeno}
                  readOnly
                  onClick={(e) => e.target.select()}
                  className={validationErrors.employeno ? "error-border" : ""}
                />
                {validationErrors.employeno && (
                  <div className="error-text">{validationErrors.employeno}</div>
                )}
              </div>

              {/* Assigned To (required) */}
              <div className="form-group">
                <label htmlFor="assignedTo">
                  Assigned To <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="assignedTo"
                  value={formValues.employeeCode || ""}
                  onChange={(e) => {
                    const selectedCode = e.target.value;
                    const selectedEmp = employees.find((emp) => emp.employeeCode === selectedCode);
                    handleChange("employeeCode", selectedCode);
                    handleChange("employeno", selectedEmp?.mobileNo || "");
                    handleChange("email", selectedEmp?.emailID || "");
                    handleChange("emailDisplay", selectedEmp?.employeeName || "");
                    setValidationErrors((prev) => ({ ...prev, employeeCode: null, email: null }));
                  }}
                  className={validationErrors.employeeCode ? "error-border" : ""}
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp, index) => (
                    <option
                      key={`${emp.employeeCode}-${emp.recId}-${index}`}
                      value={emp.employeeCode}
                    >
                      {emp.employeeName}
                    </option>
                  ))}
                </select>
                {validationErrors.employeeCode && (
                  <div className="error-text">{validationErrors.employeeCode}</div>
                )}
              </div>

              {/* Email (required) */}
              <div className="form-group">
                <label htmlFor="email">
                  Email <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="email"
                  value={formValues.email}
                  disabled={!formValues.email}
                  onChange={(e) => {
                    const email = e.target.value;
                    const selectedName = e.target.options[e.target.selectedIndex].text;
                    handleChange("email", email);
                    handleChange("emailDisplay", selectedName);
                    setValidationErrors((prev) => ({ ...prev, email: null }));
                  }}
                  className={validationErrors.email ? "error-border" : ""}
                >
                  {formValues.email && formValues.emailDisplay ? (
                    <option value={formValues.email}>{formValues.emailDisplay}</option>
                  ) : (
                    <option value="">No email available</option>
                  )}
                </select>
                {validationErrors.email && (
                  <div className="error-text">{validationErrors.email}</div>
                )}
              </div>

              {/* CC (required) */}
              <div className="form-group">
                <label htmlFor="cc">
                  CC
                </label>
                <select
                  id="cc"
                  value={formValues.cc}
                  disabled={!formValues.cc}
                  onChange={(e) => {
                    handleChange("cc", e.target.value);
                  }}
                >
                  <option value="">Select CC</option>
                  <option value={formValues.cc}>{formValues.cc}</option>
                </select>
              </div>

              {/* More CC (optional) */}
              <div className="form-group">
                <label htmlFor="moreCC">More CC</label>
                <textarea
                  id="moreCC"
                  rows="5"
                  value={formValues.moreCC}
                  onChange={(e) => handleChange("moreCC", e.target.value)}
                ></textarea>
                <div className="error"></div>
              </div>

              {/* Category Specific Resolution (conditionally required) */}
              <div className="form-group">
               <label htmlFor="specificResolution">Category Specific Resolution </label>

                <select
                  id="specificResolution"
                  value={formValues.specificResolution}
                  disabled={!selectedCategoryCode || specificResolutions.length === 0}
                  onChange={(e) => {
                    handleChange("specificResolution", e.target.value);
                    setValidationErrors((prev) => ({ ...prev, specificResolution: null }));
                  }}
                  className={validationErrors.specificResolution ? "error-border" : ""}
                >
                  <option value="">Select Specific Resolution</option>
                  {specificResolutions.map((res, index) => (
                    <option key={index} value={res.name.trim()}>
                      {res.name.trim()}
                    </option>
                  ))}
                </select>
                {validationErrors.specificResolution && (
                  <div className="error-text">{validationErrors.specificResolution}</div>
                )}
              </div>

              {/* Remarks (optional) */}
              <div className="form-group">
                <label htmlFor="remarks">Remarks</label>
                <textarea
                  id="remarks"
                  rows="5"
                  value={formValues.remarks}
                  onChange={(e) => handleChange("remarks", e.target.value)}
                ></textarea>
                <div className="error"></div>
              </div>

              <div className="buttongrp">
                <a className="pribtn" onClick={handleSave}>
                  Save
                </a>
                <a className="secbtn" onClick={handleSubmit}>
                  Submit
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Safe JSON helper so we don't crash if a non-JSON response arrives
async function responseToJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default CreateCaseModel;
