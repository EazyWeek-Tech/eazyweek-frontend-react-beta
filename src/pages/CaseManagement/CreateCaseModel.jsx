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
  const [centers, setCenters] = useState([]);
  const [assignSearch, setAssignSearch] = useState("");
const [assignOpen, setAssignOpen] = useState(false);
const [assignActiveIndex, setAssignActiveIndex] = useState(-1);
const assignWrapRef = useRef(null);
const [fileError, setFileError] = useState("");

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
    attachment:null
  });

  // holds the real case no once server generates it
  const [caseNo, setCaseNo] = useState("");

  const toastRef = useRef(null);

  const pickEmployee = (emp) => {
  if (!emp) return;

  handleChange("employeeCode", emp.employeeCode || "");
  handleChange("employeno", emp.mobileNo || "");
  handleChange("email", emp.emailID || "");
  handleChange("emailDisplay", emp.employeeName || "");

  setAssignSearch(emp.employeeName || "");
  setAssignOpen(false);
  setAssignActiveIndex(-1);

  setValidationErrors((prev) => ({
    ...prev,
    employeeCode: null,
    email: null,
  }));
};

const filteredEmployees = (employees || []).filter((emp) => {
  const q = (assignSearch || "").toLowerCase().trim();
  if (!q) return true;
  const name = (emp.employeeName || "").toLowerCase();
  const code = (emp.employeeCode || "").toLowerCase();
  const mobile = (emp.mobileNo || "").toLowerCase();
  const email = (emp.emailID || "").toLowerCase();
  return (
    name.includes(q) ||
    code.includes(q) ||
    mobile.includes(q) ||
    email.includes(q)
  );
});

// Close dropdown on outside click
useEffect(() => {
  const onDocDown = (e) => {
    if (!assignWrapRef.current) return;
    if (!assignWrapRef.current.contains(e.target)) {
      setAssignOpen(false);
      setAssignActiveIndex(-1);
    }
  };
  document.addEventListener("mousedown", onDocDown);
  return () => document.removeEventListener("mousedown", onDocDown);
}, []);

// Keep search box in sync if employeeCode is set from API/config
useEffect(() => {
  if (!formValues.employeeCode) return;
  const emp = (employees || []).find((x) => x.employeeCode === formValues.employeeCode);
  if (emp?.employeeName) setAssignSearch(emp.employeeName);
}, [formValues.employeeCode, employees]);


  // App-level toast (fixed position)
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });


  const fetchCenters = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const data = await responseToJsonSafe(res);
    setCenters(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Error fetching centers:", err);
    setCenters([]);
  }
};

useEffect(() => {
  fetchCenters();
}, []); // run once on mount



  const toastTimer = useRef(null);
  const showToast = (message, type = "success", timeout = 4000) => {
    setToast({ visible: true, message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), timeout);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

useEffect(() => {
  if (!isComplaintCategory()) {
    setValidationErrors((p) => ({ ...p, doctorCode: null }));
  }
}, [selectedCategoryCode, caseCategories]);

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
              console.log("[API RESPONSE]", method, url, { status: response.status, ok: response.ok }, data);
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
      const stored =localStorage.getItem("user") || sessionStorage.getItem("user");
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

  // -----------------------------
  // ✅ CenterCode helpers (YOUR REQUEST)
  // centercode should be loginCode or topCode (e.g., "MXM")
  // -----------------------------
  const trim = (v) => (v ?? "").toString().trim();

  // ✅ Complaint category check (robust: tries multiple possible fields)
const isComplaintCategory = () => {
  const code = selectedCategoryCode || formValues.category;
  if (!code) return false;

  const cat = (caseCategories || []).find((c) => c.categoryCode === code);

  const type =
    (cat?.categoryType || cat?.type || cat?.categoryGroup || "").toString().trim().toLowerCase();

  const name =
    (cat?.categoryName || "").toString().trim().toLowerCase();

  // If API sends a "type" field, prefer that.
  if (type) return type === "complaint" || type.includes("complaint");

  // Otherwise fallback to name-based match
  return name === "complaint" || name.includes("complaint");
};

  const firstNonEmpty = (...vals) => {
    for (const v of vals) {
      const t = trim(v);
      if (t) return t;
    }
    return "";
  };

  // Read nested JSON objects saved in storage (common keys)
  const readFromStoredUserObjects = (field) => {
    const objKeys = [
      "session",          // some apps store session JSON in this key
      "sessionInfo",
      "sessionData",
      "userSession",
      "auth",
      "user",
      "userDetails",
      "currentUser",
      "authUser",
      "sessionUser",
    ];

    for (const k of objKeys) {
      const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        const val =
          obj?.[field] ??
          obj?.[field?.toLowerCase?.()] ??
          obj?.[field?.toUpperCase?.()];
        if (trim(val)) return trim(val);
      } catch {}
    }
    return "";
  };




  // ✅ centercode = loginCode or topCode (priority: loginCode -> topCode)
  const readCenterFromSession = () => {
    const ss = (k) => trim(sessionStorage.getItem(k));
    const ls = (k) => trim(localStorage.getItem(k));

    // 1) direct primitive keys (some apps store session fields as plain keys)
    const direct = firstNonEmpty(
      ss("loginCode"),
      ss("LoginCode"),
      ss("topCode"),
      ss("TopCode"),

      ls("loginCode"),
      ls("LoginCode"),
      ls("topCode"),
      ls("TopCode")
    );

    // 2) stored JSON objects (your sample looks like a JSON session object)
    const fromObj = firstNonEmpty(
      readFromStoredUserObjects("loginCode"),
      readFromStoredUserObjects("LoginCode"),
      readFromStoredUserObjects("topCode"),
      readFromStoredUserObjects("TopCode")
    );

    // 3) last-resort fallback (kept for safety if nothing found)
    // (if you want, we can remove these completely)
    const legacyFallback = firstNonEmpty(
      ss("centerCode"),
      ss("CenterCode"),
      ss("centercode"),
      ls("centerCode"),
      ls("CenterCode"),
      ls("centercode"),
      readFromStoredUserObjects("centerCode"),
      readFromStoredUserObjects("CenterCode"),
      readFromStoredUserObjects("centercode")
    );

    return firstNonEmpty(direct, fromObj, legacyFallback);
  };

  // optional: centerName (kept as-is; not used for centercode)
  const readCenterNameFromSession = () => {
    const ss = (k) => trim(sessionStorage.getItem(k));
    const ls = (k) => trim(localStorage.getItem(k));

    const direct = firstNonEmpty(
      ss("centerName"),
      ss("CenterName"),
      ss("centerDesc"),
      ss("centerDescription"),
      ls("centerName"),
      ls("CenterName"),
      ls("centerDesc"),
      ls("centerDescription")
    );

    const fromObj = firstNonEmpty(
      readFromStoredUserObjects("centerName"),
      readFromStoredUserObjects("centerDesc"),
      readFromStoredUserObjects("centerDescription")
    );

    return firstNonEmpty(direct, fromObj);
  };

  // reset local state when dialog is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("sign-in");
      setCaseNo("");
      localStorage.removeItem("lastSavedCaseNo");
    }
  }, [isOpen]);

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
        const validEmployees = data.filter((emp) => emp.employeeCode && emp.employeeName !== "Assign To");
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
            `${API_BASE_URL}/api/CaseDropDown/Customer?SearchText=${encodeURIComponent(customerSearchText)}`,
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
    if (selectedCategoryCode && selectedSubCategoryCode && selectedSubSubCategoryCode && selectedSubSubSubCategoryCode) {
      const fetchCaseOperationDetails = async () => {
        const url = `${API_BASE_URL}/api/CaseOperation/${selectedCategoryCode}/${selectedSubCategoryCode}/${selectedSubSubCategoryCode}/${selectedSubSubSubCategoryCode}`;
        try {
          const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
          const data = await response.json();
          console.log("[CASE OP CONFIG]", data);

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
  }, [selectedCategoryCode, selectedSubCategoryCode, selectedSubSubCategoryCode, selectedSubSubSubCategoryCode]);

  useEffect(() => {
    if (currentUser) {
      const ownerName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();
      handleChange("owner", ownerName);
    }
  }, [currentUser]);

 
const handleChange = (field, value) => {
  if (field === "attachment") {
    const file = value;

    if (!file) {
      setFormValues((prev) => ({ ...prev, attachment: null }));
      setFileError("");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      setFileError("Only PDF, JPG, JPEG, and PNG files are allowed.");
      setFormValues((prev) => ({ ...prev, attachment: null }));
      return;
    }

    if (file.size > maxSize) {
      setFileError("File size should not exceed 2MB.");
      setFormValues((prev) => ({ ...prev, attachment: null }));
      return;
    }

    setFileError("");
    setFormValues((prev) => ({ ...prev, attachment: file }));
    return;
  }

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
      attachment:null
    });
      setFileError("");

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
    setCaseNo("");
    localStorage.removeItem("lastSavedCaseNo");
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

  const getClinicNameFromCenters = (centerCode) => {
  const code = trim(centerCode).toUpperCase();
  if (!code) return "";
  const hit = (centers || []).find((c) => trim(c.code).toUpperCase() === code);
  return trim(hit?.name || "");
};

  // email uses centerName; centercode uses loginCode/topCode (separate concerns)
  // ✅ Center display should be loginCode/topCode (e.g., "LNS", "MXM")
const getCenterName = () => {
  const code = readCenterFromSession(); // loginCode/topCode like "MXM"
  return getClinicNameFromCenters(code) || code; // fallback to code if name not found yet
};


    // -----------------------------
  // ✅ Logged-in user email lookup (from /api/Employees)
  // -----------------------------
  const getLoggedInUserEmail = async () => {
    const userCode = trim(currentUser?.userId); // ex: "CENT-00184"
    if (!userCode) return "";

    // 1) try from already fetched employees list
    const fromState = (employees || []).find(
      (e) => trim(e.employeeCode) === userCode && trim(e.emailID)
    );
    if (fromState?.emailID) return trim(fromState.emailID);

    // 2) fallback: fetch fresh from API
    try {
      const res = await fetch(`${API_BASE_URL}/api/Employees`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await responseToJsonSafe(res);
      const fromApi = (data || []).find(
        (e) => trim(e.employeeCode) === userCode && trim(e.emailID)
      );
      return trim(fromApi?.emailID || "");
    } catch (err) {
      console.error("Failed to lookup logged-in user email:", err);
      return "";
    }
  };

  const buildMailCC = async () => {
  // Only use CC coming from config (data.emailCC -> formValues.cc)
  const merged = normalizeEmailList(formValues.cc);
  return { mergedCC: merged };
};

  const buildMoreCCWithOwner = async () => {
  // Case owner = logged-in user (case creator/owner)
  const ownerEmail = await getLoggedInUserEmail();

  const mergedMoreCC = normalizeEmailList(
    [formValues.moreCC, ownerEmail].filter(Boolean).join(",")
  );

  return { mergedMoreCC, ownerEmail };
};
const extractEmail = (s) => {
  const t = (s || "").trim().replace(/[\r\n"]/g, "");
  // match: Name <email@x.com> OR just email@x.com
  const m = t.match(/<?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/i);
  return m ? m[1].toLowerCase() : "";
};

const normalizeEmailList = (raw) => {
  if (!raw) return "";
  const parts = String(raw)
    .split(/[,;\n]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const uniq = [];

  for (const p of parts) {
    const key = extractEmail(p) || p.toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);

    // store clean email only (recommended)
    const emailOnly = extractEmail(p);
    uniq.push(emailOnly || p);
  }

  return uniq.join(",");
};

    const sendCaseAssignmentEmail = async (caseNoParam) => {
    const { mergedCC } = await buildMailCC();
const { mergedMoreCC } = await buildMoreCCWithOwner();


    const mailBody = {
      emailTo: (formValues.email || "").trim().replace(/[\r\n"]/g, ""),
      centerName: getCenterName(),
      caseNo: caseNoParam || "",
      categoryName: getCategoryName(formValues.category),
      subCategoryName: getSubCategoryName(formValues.subcategory),
      issueDescription: formValues.issuedesciption || "",
      newResponse: formValues.response || "",
      firstTimeResolution: formValues.firsttimeresolution || "",

      // ✅ include creator email + existing CCs in same chain
      emailCC: mergedCC,

      // keep moreCC too if your backend uses it separately
      moreCC: mergedMoreCC,
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

  const validateGeneralTab = () => {
  const errs = {};
  if (!formValues.title?.trim()) errs.title = "Case Title is required.";
  if (/[^\x20-\x7E]/.test(formValues.title)) {
    errs.title = "Only English (ASCII) characters are allowed.";
  }
  if (!formValues.category) errs.category = "Case Category is required.";
  if (!formValues.subcategory) errs.subcategory = "Case Sub Category is required.";
  if (!formValues.subSubcategory) errs.subSubcategory = "Case Sub Sub Category is required.";
  if (!formValues.subSubSubcategory) errs.subSubSubcategory = "Case Sub Sub Sub Category is required.";
  if (!formValues.caseMedium) errs.caseMedium = "Case Medium is required.";
  if (!formValues.caseSource) errs.caseSource = "Case Source is required.";
  if (!formValues.priority) errs.priority = "Priority is required.";

  // ✅ Customer is OPTIONAL
  if (customerSearchText?.trim() && !formValues.customerCode) {
    errs.customerCode = "Please select a customer from the list (or clear search).";
  }

  const createdByDisplay = getUserDisplay(currentUser);
  if (!createdByDisplay) errs.createdBy = "Created By is required.";
  const createdDateDisplay = new Date().toLocaleDateString();
  if (!createdDateDisplay) errs.createdDate = "Created Date is required.";

  return errs;
};

  const validateIssueTab = () => {
    const errs = {};
    if (!formValues.issuedesciption?.trim()) errs.issuedesciption = "Issue Description is required.";
    if (!formValues.clientThreat) errs.clientThreat = "Client Threat is required.";
    // ✅ Therapist required ONLY for Complaint category
if (isComplaintCategory() && !formValues.doctorCode) {
  errs.doctorCode = "Therapist is required for Complaint cases.";
}
    if (!formValues.employeno?.trim()) errs.employeno = "Employee Mobile is required.";
    if (!formValues.employeeCode) errs.employeeCode = "Assigned To is required.";
    if (!formValues.email?.trim()) errs.email = "Email is required.";
    return errs;
  };
  // ==============================

  const handleSignInClick = (e) => {
    e.preventDefault();
    setActiveTab("sign-in");
  };

  // validate General tab before allowing switch to Issues
  const handleRegisterClick = (e) => {
    e.preventDefault();
    const generalErrs = validateGeneralTab();
    if (Object.keys(generalErrs).length > 0) {
      setValidationErrors((prev) => ({ ...prev, ...generalErrs }));
      setActiveTab("sign-in");
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
    const { mergedMoreCC } = await buildMoreCCWithOwner();

    if (Object.keys(allErrs).length > 0) {
      console.log("[CREATE CASE] Save blocked by validation", { generalErrs, issueErrs });
      setValidationErrors((prev) => ({ ...prev, ...allErrs }));
      if (Object.keys(generalErrs).length > 0) setActiveTab("sign-in");
      else if (Object.keys(issueErrs).length > 0) setActiveTab("register");
      return;
    }

    const user = currentUser;
    if (isSaving) return;
    setIsSaving(true);

    //  Convert attachment to base64
    let attachmentBase64 = "";
    let attachmentFileName = "";
    if (formValues.attachment) {
      attachmentBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(formValues.attachment);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      attachmentFileName = formValues.attachment.name;
    }

    const savedCaseNoFromStorage = localStorage.getItem("lastSavedCaseNo") || "";
    const savedCaseNoEffective = caseNo || savedCaseNoFromStorage || "";

    // When saving from General: create new → empty caseno
    // When saving from Issues: update existing → use saved case no
    const casenoForSave = activeTab === "register" ? savedCaseNoEffective : "";

    const payload = {
      casetitle: formValues.title,
      caseno: casenoForSave,
      attachmentBase64: attachmentBase64,
      attachmentFileName: attachmentFileName,
      category: formValues.category,
      subCategory: formValues.subcategory,
      subSubCategory: formValues.subSubcategory,
      subSubSubCategory: formValues.subSubSubcategory,
      casemedium: formValues.caseMedium,
      casesource: formValues.caseSource,
      priority: formValues.priority,
      custID: formValues.customerCode || "0",
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
      assignedto: formValues.employeeCode || "",  // ✅ L1 assignee from hierarchy
employeno: formValues.employeno,
      assignedemailid: formValues.email,
      cc: formValues.cc,
      moreCC: mergedMoreCC,
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

      // ✅ centercode MUST be loginCode / topCode (e.g., "MXM")
      centercode: readCenterFromSession() || "",

      departmentcode: "",
      custcliniccode: "",
    };

    try {
      console.log("[CREATE CASE] Save payload", payload);
      const response = await fetch(`${API_BASE_URL}/api/CaseOperation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("[CREATE CASE] Save result", result);

      const resultCode = result?.code != null ? String(result.code) : "";

      if (resultCode === "200") {
        let finalCaseNo = (result?.name || "").toString().trim();

        // if backend accidentally returns literal "casenoForSave", ignore it
        if (!finalCaseNo || finalCaseNo.toLowerCase() === "casenoforsave") {
          finalCaseNo = savedCaseNoEffective;
        }

        if (finalCaseNo) {
          setCaseNo(finalCaseNo);
          localStorage.setItem("lastSavedCaseNo", finalCaseNo);
        }

        // ✅ Send email on SAVE also
     //   await sendCaseAssignmentEmail(finalCaseNo || casenoForSave || savedCaseNoEffective || "");

        showToast(`Case saved successfully${finalCaseNo ? ` (Case No: ${finalCaseNo})` : ""}`, "success");

        // ALWAYS go to Issues on successful Save from General
        if (activeTab === "sign-in") {
          console.log("[CREATE CASE] switching tab to 'register'");
          setTimeout(() => setActiveTab("register"), 0);
        } else if (activeTab === "register") {
          // Save from Issues tab → auto-close popup & refresh case table
          const payloadWithCaseNo = {
            ...payload,
            caseno: finalCaseNo || casenoForSave || "",
          };

          if (onSubmit) {
            onSubmit(payloadWithCaseNo); // parent will refresh CaseTable
          }

          resetForm();
          setActiveTab("sign-in");

          if (typeof onClose === "function") {
            onClose();
          }
        }
      } else {
        showToast(`Failed to save case: ${result.name || result.message || "Unknown error"}`, "error");
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
    const { mergedMoreCC } = await buildMoreCCWithOwner();
    if (Object.keys(allErrs).length > 0) {
      setValidationErrors(allErrs);
      if (Object.keys(generalErrs).length > 0) setActiveTab("sign-in");
      else setActiveTab("register");
      return;
    }

    setValidationErrors({});
    const savedCaseNoFromStorage = localStorage.getItem("lastSavedCaseNo") || "";
    const savedCaseNoEffective = caseNo || savedCaseNoFromStorage || "";
    const user = currentUser;

    //  Convert attachment to base64
const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
});

let attachmentBase64 = "";
let attachmentFileName = "";
if (formValues.attachment) {
  attachmentBase64 = await toBase64(formValues.attachment);
  attachmentFileName = formValues.attachment.name;
}

    const payload = {
      casetitle: formValues.title,
      attachmentBase64: attachmentBase64,
attachmentFileName: attachmentFileName,
      caseno: savedCaseNoEffective,
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
      moreCC: mergedMoreCC,
      categorySpecificResolution: formValues.specificResolution,
      remarks: formValues.remarks,
      casedisposition: "",
      caseWith: formValues.employeeCode,
      status: "Open",
      operation: "CreateCase",
      materialCost: 0,
      labourCost: 0,
      otherCharges: 0,
      totalCharges: 0,
      isdraft: 0,

      // ✅ centercode MUST be loginCode / topCode (e.g., "MXM")
      centercode: readCenterFromSession() || "",

      departmentcode: "",
      custcliniccode: "",
    };

    try {
      console.log("[CREATE CASE] Submit payload", payload);
      const response = await fetch(`${API_BASE_URL}/api/CaseOperation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log("[CREATE CASE] Submit result", result);

      if (String(result.code) === "200") {
        let finalCaseNo = (result?.name || "").toString().trim();
        if (!finalCaseNo || finalCaseNo.toLowerCase() === "casenoforsave") {
          finalCaseNo = savedCaseNoEffective;
        }

        if (finalCaseNo) {
          setCaseNo(finalCaseNo);
          localStorage.setItem("lastSavedCaseNo", finalCaseNo);
        }

        await sendCaseAssignmentEmail(finalCaseNo);

        showToast(`Case submitted successfully${finalCaseNo ? ` (Case No: ${finalCaseNo})` : ""}`, "success");

        const payloadWithCaseNo = { ...payload, caseno: finalCaseNo };
        onSubmit && onSubmit(payloadWithCaseNo);

        resetForm();
        setActiveTab("sign-in");

        if (typeof onClose === "function") {
          onClose();
        }
      } else {
        showToast(`Failed to save case: ${result.name || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Error during case save:", error);
      showToast("Network or server error while saving the case.", "error");
    }
  };

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
                  className={`register ${activeTab === "register" ? "active" : ""}`}
                  onClick={handleRegisterClick}
                >
                  Issues and Responses
                </a>
              </li>

              <div ref={toastRef} className="toastmsg">
                Please fill the General Tab
              </div>
            </ul>

            {/* ---------------------------
                General Tab
                --------------------------- */}
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
                {validationErrors.title && <div className="error-text">{validationErrors.title}</div>}
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
                {validationErrors.category && <div className="error-text">{validationErrors.category}</div>}
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
                {validationErrors.subcategory && <div className="error-text">{validationErrors.subcategory}</div>}
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
                {validationErrors.subSubcategory && <div className="error-text">{validationErrors.subSubcategory}</div>}
              </div>

              {/* Sub Sub Sub Category */}
              <div className="form-group">
                <label htmlFor="caseSubSubSubCategory">
                  Case Sub Sub Sub Category <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="caseSubSubSubCategory"
                  value={selectedSubSubSubCategoryCode}
                  disabled={!selectedCategoryCode || !selectedSubCategoryCode || !selectedSubSubCategoryCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedSubSubSubCategoryCode(code);

                    const selected = subSubSubCategories.find((item) => item.subSubCategoryCode === code);
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
                {validationErrors.caseMedium && <div className="error-text">{validationErrors.caseMedium}</div>}
              </div>

              {/* Case Source */}
              <div className="form-group">
                <label htmlFor="caseSource">
                  Case Source <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  id="caseSource"
                  value={formValues.caseSource}
                  disabled={!selectedCategoryCode || !formValues.caseMedium || caseSources.length === 0}
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
                    <option key={index} value={source.name.trim()}>
                      {source.name.trim()}
                    </option>
                  ))}
                </select>
                {validationErrors.caseSource && <div className="error-text">{validationErrors.caseSource}</div>}
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
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
                {validationErrors.priority && <div className="error-text">{validationErrors.priority}</div>}
              </div>

              {/* Search Customer */}
              <div className="form-group">
                <label htmlFor="customerSearch">
                  Search Customer 
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
                      customerSearchText: e.target.value?.trim() ? null : "Search Customer is required.",
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
                  Customer 
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
                {validationErrors.customerCode && <div className="error-text">{validationErrors.customerCode}</div>}
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
                <select id="service" value={formValues.service} onChange={(e) => handleChange("service", e.target.value)}>
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
                {validationErrors.createdBy && <div className="error-text">{validationErrors.createdBy}</div>}
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
                {validationErrors.createdDate && <div className="error-text">{validationErrors.createdDate}</div>}
              </div>

              <div className="buttongrp">
  <a className="pribtn" onClick={handleRegisterClick}>
    Next
  </a>
  <a className="secbtn" onClick={onClose}>
    Cancel
  </a>
</div>
            </div>

            {/* ---------------------------
                Issues and Responses Tab
                --------------------------- */}
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
    accept=".pdf,.jpg,.jpeg,.png"
    onChange={(e) => handleChange("attachment", e.target.files[0])}
  />
  {fileError && <div className="error-text">{fileError}</div>}
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
                  <option value="NA">NA</option>
                </select>
                {validationErrors.clientThreat && (
                  <div className="error-text">{validationErrors.clientThreat}</div>
                )}
              </div>

              {/* Therapist (required) */}
              <div className="form-group">
                <label htmlFor="therapist">
  Therapist {isComplaintCategory() && <span style={{ color: "red" }}>*</span>}
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
              {/* Assigned To (required) - AUTOCOMPLETE */}
<div className="form-group" ref={assignWrapRef} style={{ position: "relative" }}>
  <label htmlFor="assignedToSearch">
    Assigned To <span style={{ color: "red" }}>*</span>
  </label>

  <input
    id="assignedToSearch"
    type="text"
    placeholder="Type name / code / mobile / email..."
    value={assignSearch}
    onChange={(e) => {
      const v = e.target.value;
      setAssignSearch(v);
      setAssignOpen(true);
      setAssignActiveIndex(-1);

      // If user starts typing again, clear selection to force re-pick
      handleChange("employeeCode", "");
      handleChange("employeno", "");
      handleChange("email", "");
      handleChange("emailDisplay", "");

      setValidationErrors((prev) => ({
        ...prev,
        employeeCode: v.trim() ? "Please select an employee from the list." : "Assigned To is required.",
        email: null,
      }));
    }}
    onFocus={() => setAssignOpen(true)}
    onKeyDown={(e) => {
      if (!assignOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAssignActiveIndex((i) => Math.min(i + 1, filteredEmployees.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setAssignActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const emp = filteredEmployees[assignActiveIndex];
        if (emp) pickEmployee(emp);
      } else if (e.key === "Escape") {
        setAssignOpen(false);
        setAssignActiveIndex(-1);
      }
    }}
    className={validationErrors.employeeCode ? "error-border" : ""}
    autoComplete="off"
  />

  {validationErrors.employeeCode && (
    <div className="error-text">{validationErrors.employeeCode}</div>
  )}

  {assignOpen && filteredEmployees.length > 0 && (
    <div
      className="autocomplete-menu"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "58px",
        zIndex: 9999,
        background: "#fff",
        border: "1px solid #ddd",
        borderTop: "none",
        maxHeight: 220,
        overflowY: "auto",
      }}
    >
      {filteredEmployees.slice(0, 50).map((emp, idx) => {
        const active = idx === assignActiveIndex;
        return (
          <div
            key={`${emp.employeeCode}-${emp.recId ?? idx}`}
            onMouseDown={(e) => {
              // prevent input blur before click
              e.preventDefault();
              pickEmployee(emp);
            }}
            onMouseEnter={() => setAssignActiveIndex(idx)}
            style={{
              padding: "8px 10px",
              cursor: "pointer",
              background: "#fff",
              borderBottom: "1px solid #eee",
            }}
          >
            <div style={{ fontWeight: 400 }}>
              {emp.employeeName}
             
            </div>
          </div>
        );
      })}
    </div>
  )}

  {assignOpen && filteredEmployees.length === 0 && (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "100%",
        zIndex: 9999,
        background: "#fff",
        border: "1px solid #ddd",
        padding: "8px 10px",
      }}
    >
      No matches
    </div>
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
                    <option value={formValues.email}>{formValues.email}</option>
                  ) : (
                    <option value="">No email available</option>
                  )}
                </select>
                {validationErrors.email && (
                  <div className="error-text">{validationErrors.email}</div>
                )}
              </div>

              {/* CC (optional) */}
              <div className="form-group">
                <label htmlFor="cc">CC</label>
                <select id="cc" value={formValues.cc} disabled={!formValues.cc} onChange={(e) => handleChange("cc", e.target.value)}>
                  <option value="">Select CC</option>
                  <option value={formValues.cc}>{formValues.cc}</option>
                </select>
              </div>

              {/* More CC (optional) */}
              <div className="form-group">
                <label htmlFor="moreCC">More CC</label>
                <textarea id="moreCC" rows="5" value={formValues.moreCC} onChange={(e) => handleChange("moreCC", e.target.value)}></textarea>
                <div className="error"></div>
              </div>

              {/* Remarks (optional) */}
              <div className="form-group">
                <label htmlFor="remarks">Remarks</label>
                <textarea id="remarks" rows="5" value={formValues.remarks} onChange={(e) => handleChange("remarks", e.target.value)}></textarea>
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
