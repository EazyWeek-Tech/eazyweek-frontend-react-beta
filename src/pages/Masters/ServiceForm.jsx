"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import Toast from "../../components/Toast";

// Endpoints per-tab (match backend exactly)
const URLS = {
  general: `${API_BASE_URL}/api/Master/InsertServiceGeneral`,
  pricing: `${API_BASE_URL}/api/Master/InsertServicePrice`,
  bom: `${API_BASE_URL}/api/Master/InsertServiceBOM`,
  practitioner: `${API_BASE_URL}/api/Master/InsertServicePractioner`, // spelling per backend
  forms: `${API_BASE_URL}/api/Master/InsertServiceForms`,
  formsNamesAPI: `${API_BASE_URL}/api/form/names`,
};

const ServiceForm = ({ service = null, onBack, mode = "create" }) => {
  const [activeTab, setActiveTab] = useState("General");
  const tabs = [
    "General",
    "Pricing",
    "BOM",
    "Practitioner Mapping",
    "Forms",
    "Miscellaneous",
  ];

  // --- Toast ---
  const [toast, setToast] = useState(null);

  // --- per-tab status: "unsaved" | "draft" | "saved"
  const [tabStatus, setTabStatus] = useState({
    General: "unsaved",
    Pricing: "unsaved",
    BOM: "unsaved",
    "Practitioner Mapping": "unsaved",
    Forms: "unsaved",
    Miscellaneous: "unsaved",
  });

  // --- dirty flags for ● indicator on tabs
  const [dirty, setDirty] = useState({
    General: false,
    Pricing: false,
    BOM: false,
    "Practitioner Mapping": false,
    Forms: false,
    Miscellaneous: false,
  });

  const markDirty = (tab) => setDirty((d) => (d[tab] ? d : { ...d, [tab]: true }));
  const markSaved = (tab, state = "saved") => {
    setDirty((d) => ({ ...d, [tab]: false }));
    setTabStatus((s) => ({ ...s, [tab]: state }));
  };

  // ---------- Utility ----------
  const toArray = (d) => (Array.isArray(d) ? d : d ? [d] : []);

  // ---------------- state ----------------
  const [formData, setFormData] = useState({
    serviceCode: service?.code || "",
    serviceName: service?.name || "",
    arabicServiceName: service?.arabicName || "",
    serviceDescription: service?.description || "",
    serviceCategory: service?.category || "",
    serviceSubCategory: service?.subcategory || "",
    serviceSubSubCategory: service?.subSubcategory || "",
    serviceTime: service?.time || " ",
    allowIdealBOMConsumption: service?.allowIdealBOM || "No",
    allowBOMConsumptionWithIntervention: service?.allowBOMIntervention || "No",
    allowLoyaltyAccrual: service?.allowLoyaltyAccrual || "No",
    allowLoyaltyRedemption: service?.allowLoyaltyRedemption || "No",
    additionalField1: service?.additionalField1 || "",
    additionalField2: service?.additionalField2 || "",
    additionalField3: service?.additionalField3 || "",
    additionalField4: service?.additionalField4 || "",
    additionalField5: service?.additionalField5 || "",
    serviceStatus: service?.status || "Active",
    pricingData:
      service?.pricingData || [
        { centerCode: "Bright", centerName: "Bright Clinics", price: "0", taxIncluded: "", taxPercent: "0", storeRelease: false },
        { centerCode: "LNS", centerName: "Lines Clinics", price: "0", taxIncluded: "", taxPercent: "0", storeRelease: false },
        { centerCode: "MXM", centerName: "Maxime Clinics", price: "0", taxIncluded: "", taxPercent: "0", storeRelease: false },
        { centerCode: "INFENI", centerName: "Infeni Clinic", price: "0", taxIncluded: "", taxPercent: "0", storeRelease: false },
        { centerCode: "Silk", centerName: "Silk Clinic", price: "0", taxIncluded: "", taxPercent: "0", storeRelease: false },
      ],
  });

  // Mappings state
  const [doctorMappings, setDoctorMappings] = useState(service?.doctorMappings || []);
  const [nurseMappings, setNurseMappings] = useState(service?.nurseMappings || []);
  const [practitionerMapping, setPractitionerMapping] = useState({ leftClinic: "", doctor: "", rightClinic: "", nurses: "" });

  const [formsData, setFormsData] = useState({
    stageForFormCompletion: service?.formsData?.stageForFormCompletion || "form-not-required",
    blockFromProceeding: service?.formsData?.blockFromProceeding || "Yes",
    form: service?.formsData?.form || "",
  });

  const [miscellaneousData, setMiscellaneousData] = useState({
    optionalField1: service?.miscellaneousData?.optionalField1 || "",
    optionalField2: service?.miscellaneousData?.optionalField2 || "",
    optionalField3: service?.miscellaneousData?.optionalField3 || "",
    optionalField4: service?.miscellaneousData?.optionalField4 || "",
    optionalField5: service?.miscellaneousData?.optionalField5 || "",
  });

  // ---------- BOM: search & options ----------
  const [searchConsumables, setSearchConsumables] = useState("s");
  const [selectedConsumable, setSelectedConsumable] = useState(""); // stores code (e.g., "CON-00001")
  const [consumableOpts, setConsumableOpts] = useState([{ name: "Select one", code: "0", value: null }]);
  const [consumableLoad, setConsumableLoad] = useState(false);
  const [consumableErr, setConsumableErr] = useState("");

  const [bomItems, setBomItems] = useState(Array.isArray(service?.bomItems) ? service.bomItems : []);


  // ---------- Category GETs ----------
  const [categories, setCategories] = useState([]); // [{categoryCode, categoryName}]
  const [subCategories, setSubCategories] = useState([]);
  const [subSubCategories, setSubSubCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [ssLoading, setSsLoading] = useState(false);
  const [catError, setCatError] = useState("");
  const [subError, setSubError] = useState("");
  const [ssError, setSsError] = useState("");

  // Load categories
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCatLoading(true);
        setCatError("");
        const res = await fetch(`${API_BASE_URL}/api/Master/ServiceCategory`, { credentials: "include" });
        const data = await res.json().catch(() => []);
        if (cancelled) return;
        setCategories(
          toArray(data).map((x) => ({
            categoryCode: x.categoryCode ?? x.code ?? "",
            categoryName: x.categoryName ?? x.name ?? "",
          }))
        );
      } catch {
        setCatError("Failed to load categories");
      } finally {
        setCatLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load sub categories when category changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cat = formData.serviceCategory;
      setSubCategories([]); setSubError(""); setSubLoading(false);
      setSubSubCategories([]); setSsError(""); setSsLoading(false);
      if (!cat) return;
      try {
        setSubLoading(true);
        const url = new URL(`${API_BASE_URL}/api/Master/ServiceSubCategory`);
        url.searchParams.set("categoryCode", cat);
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json().catch(() => []);
        if (cancelled) return;
        setSubCategories(
          toArray(data).map((x) => ({
            categoryCode: x.categoryCode ?? "",
            subCategoryCode: x.subCategoryCode ?? "",
            subCategoryName: x.subCategoryName ?? "",
          }))
        );
      } catch {
        setSubError("Failed to load sub categories");
      } finally {
        setSubLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [formData.serviceCategory]);

  // Load sub-sub categories when subcategory changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cat = formData.serviceCategory;
      const sub = formData.serviceSubCategory;
      setSubSubCategories([]); setSsError(""); setSsLoading(false);
      if (!cat || !sub) return;
      try {
        setSsLoading(true);
        const url = new URL(`${API_BASE_URL}/api/Master/ServiceSubSubCategory`);
        url.searchParams.set("categoryCode", cat);
        url.searchParams.set("subCategoryCode", sub);
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json().catch(() => []);
        if (cancelled) return;
        setSubSubCategories(
          toArray(data).map((x, i) => {
            const name = x.subSubCategoryName ?? "";
            const raw = x.subSubCategoryCode ?? (name?.toUpperCase() === "NA" ? "NA" : name);
            return {
              categoryCode: x.categoryCode ?? cat,
              subCategoryCode: x.subCategoryCode ?? sub,
              subSubCategoryName: name,
              subSubCategoryCode: `${cat}|${sub}|${name || i}`,
              subSubCategoryCodeRaw: raw,
            };
          })
        );
      } catch {
        setSsError("Failed to load sub sub categories");
      } finally {
        setSsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [formData.serviceCategory, formData.serviceSubCategory]);

  // ---------- Clinics + practitioners (dynamic) ----------
  const [clinics, setClinics] = useState([]); // [{code,name}]
  const [clinicLoading, setClinicLoading] = useState(false);
  const [clinicError, setClinicError] = useState("");
  const [leftPractitioners, setLeftPractitioners] = useState([]);
  const [rightPractitioners, setRightPractitioners] = useState([]);
  const [leftLoad, setLeftLoad] = useState(false);
  const [rightLoad, setRightLoad] = useState(false);
  const [leftErr, setLeftErr] = useState("");
  const [rightErr, setRightErr] = useState("");
  const [docFilter, setDocFilter] = useState("");
  const [nurseFilter, setNurseFilter] = useState("");
  const [formnames,setFormnames] = useState([])

  useEffect(() => {
    const fetchData=async()=>{
      try {
        const response = await fetch(URLS?.formsNamesAPI, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch services");

        const data = await response.json();
        setFormnames(data);
      } catch (error) {
          console.error("Error fetching services:", error);        
      }
    }
    fetchData()
  }, []);

  // Load clinics on mount
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setClinicLoading(true);
        setClinicError("");
        const res = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" });
        const data = await res.json().catch(() => []);
        if (cancel) return;
        const rows = toArray(data)
          .map((x) => ({ code: x.code ?? "", name: x.name ?? "" }))
          .filter((c) => c.code && c.name);
        setClinics(rows);
      } catch (e) {
        setClinicError("Failed to load clinics");
      } finally {
        setClinicLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Load practitioners when left clinic changes (doctors)
  useEffect(() => {
    const center = practitionerMapping.leftClinic;
    if (!center) { setLeftPractitioners([]); setLeftErr(""); return; }
    let cancel = false;
    (async () => {
      try {
        setLeftLoad(true); setLeftErr("");
        const res = await fetch(`${API_BASE_URL}/api/Master/LoadAllPractioner/${encodeURIComponent(center)}`, { credentials: "include" });
        const data = await res.json().catch(() => []);
        if (cancel) return;
        const rows = toArray(data)
          .map((x) => ({ id: x.id ?? "", name: x.name ?? "" }))
          .filter((p) => p.id && p.name);
        setLeftPractitioners(rows);
      } catch {
        setLeftErr("Failed to load practitioners");
      } finally { setLeftLoad(false); }
    })();
    return () => { cancel = true; };
  }, [practitionerMapping.leftClinic]);

  // Load practitioners when right clinic changes (nurses)
  useEffect(() => {
    const center = practitionerMapping.rightClinic;
    if (!center) { setRightPractitioners([]); setRightErr(""); return; }
    let cancel = false;
    (async () => {
      try {
        setRightLoad(true); setRightErr("");
        const res = await fetch(`${API_BASE_URL}/api/Master/LoadAllPractioner/${encodeURIComponent(center)}`, { credentials: "include" });
        const data = await res.json().catch(() => []);
        if (cancel) return;
        const rows = toArray(data)
          .map((x) => ({ id: x.id ?? "", name: x.name ?? "" }))
          .filter((p) => p.id && p.name);
        setRightPractitioners(rows);
      } catch {
        setRightErr("Failed to load practitioners");
      } finally { setRightLoad(false); }
    })();
    return () => { cancel = true; };
  }, [practitionerMapping.rightClinic]);

  // -------- handlers (with dirty tracking) --------
  const handleCategoryChange = (e) => {
    markDirty("General");
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      serviceCategory: value,
      serviceSubCategory: "",
      serviceSubSubCategory: "",
    }));
  };

  const handleSubCategoryChange = (e) => {
    markDirty("General");
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      serviceSubCategory: value,
      serviceSubSubCategory: "",
    }));
  };

  const handleInputChange = (e) => {
    markDirty(activeTab);
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name, value) => {
    markDirty("General");
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handlePricingChange = (index, field, value) => {
    markDirty("Pricing");
    setFormData((prev) => ({
      ...prev,
      pricingData: prev.pricingData.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    }));
  };
  const handlePricingCheckboxChange = (index, field) => {
    markDirty("Pricing");
    setFormData((prev) => ({
      ...prev,
      pricingData: prev.pricingData.map((it, i) => (i === index ? { ...it, [field]: !it[field] } : it)),
    }));
  };

  const handlePractitionerMappingChange = (field, value) => {
    markDirty("Practitioner Mapping");
    setPractitionerMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleDoctorMappingSelection = (id) => {
    markDirty("Practitioner Mapping");
    setDoctorMappings((prev) => prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m)));
  };
  const handleNurseMappingSelection = (id) => {
    markDirty("Practitioner Mapping");
    setNurseMappings((prev) => prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m)));
  };

  // ----- BOM: API search + add -----
  const handleSearchConsumables = async () => {
    try {
      setConsumableErr("");
      setConsumableLoad(true);
      const url = new URL(`${API_BASE_URL}/api/Master/Service/SearchConsumables`);
      url.searchParams.set("SearchValue", (searchConsumables ?? "").toString());
      const res = await fetch(url.toString(), { method: "GET", credentials: "include" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const data = await res.json().catch(() => []);
      const rows = toArray(data);
      // Fallback to default "Select one" at top if not present
      const normalized =
        rows.length && rows[0]?.code === "0"
          ? rows
          : [{ name: "Select one", code: "0", value: null }, ...rows];
      setConsumableOpts(normalized);
      if (!normalized.some(o => o.code === selectedConsumable)) {
        setSelectedConsumable(""); // clear stale selection
      }
    } catch (e) {
      console.error(e);
      setConsumableErr("Failed to search consumables.");
      setConsumableOpts([{ name: "Select one", code: "0", value: null }]);
    } finally {
      setConsumableLoad(false);
    }
  };

  const handleAddConsumable = () => {
    if (!selectedConsumable || selectedConsumable === "0") {
      alert("Please select a consumable to add");
      return;
    }
    markDirty("BOM");
    const picked = consumableOpts.find(o => o.code === selectedConsumable);
    const name = picked?.name || selectedConsumable;
    const code = selectedConsumable;

    // prevent exact duplicate (same code)
    const dup = bomItems.some(b => b.code === code);
    if (dup) {
      setToast({ type: "error", message: "This consumable is already in the BOM." });
      return;
    }

    setBomItems(prev => [
      ...prev,
      {
        id: Date.now(),
        code,
        name,
        qty: "1.00",
        uom: "",
        selected: false
      }
    ]);
    setSelectedConsumable("");
  };

  const handleBOMItemSelection = (id) => {
    markDirty("BOM");
    setBomItems((prev) => prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)));
  };

  const handleFormsDataChange = (field, value) => { markDirty("Forms"); setFormsData((p) => ({ ...p, [field]: value })); };
  const handleMiscellaneousDataChange = (field, value) => { markDirty("Miscellaneous"); setMiscellaneousData((p) => ({ ...p, [field]: value })); };

  // ----------------- VALIDATION -----------------
  const validateGeneral = () => {
    const errs = [];
    if (!formData.serviceCode?.trim()) errs.push("Service Code");
    if (!formData.serviceName?.trim()) errs.push("Service Name");
    if (!formData.serviceSubCategory?.trim()) errs.push("Service Sub Category");
    if (!formData.serviceTime?.trim() || formData.serviceTime === " ") errs.push("Service Time (Mins)");
    if (!formData.allowIdealBOMConsumption) errs.push("Allow Ideal BOM Consumption");
    if (!formData.allowBOMConsumptionWithIntervention) errs.push("Allow BOM Consumption with intervention");
    return errs;
  };

  // ----------------- BUILD PAYLOADS -----------------
  const buildGeneralPayload = (isDraft) => {
    const selectedSS = subSubCategories.find((s) => s.subSubCategoryCode === formData.serviceSubSubCategory);
    return {
      serviceCode: formData.serviceCode || "",
      serviceName: formData.serviceName || "",
      serviceArabicName: formData.arabicServiceName || "",
      serviceDesc: formData.serviceDescription || "",
      serviceCategoryCode: formData.serviceCategory || "",
      serviceSubCategoryCode: formData.serviceSubCategory || "",
      serviceSubSubCategoryCode: selectedSS?.subSubCategoryCodeRaw ?? "",
      serviceTime: formData.serviceTime || "",
      allowIdealBOMConsumption: formData.allowIdealBOMConsumption || "No",
      allowIdealBOMConsumptionWithIntervention: formData.allowBOMConsumptionWithIntervention || "No",
      allowLoyalityAccurul: formData.allowLoyaltyAccrual || "No",
      allowLoyalityRedemption: formData.allowLoyaltyRedemption || "No",
      additionalField1: formData.additionalField1 || "",
      additionalField2: formData.additionalField2 || "",
      additionalField3: formData.additionalField3 || "",
      additionalField4: formData.additionalField4 || "",
      additionalField5: formData.additionalField5 || "",
      isDraft: isDraft ? 1 : 0,
    };
  };

  const buildPricingPayload = (isDraft = 0) => ({
    serviceCode: formData.serviceCode || "",
    priceLines: formData.pricingData.map((p) => ({
      serviceCode: formData.serviceCode || "",
      price: Number(p.price || 0),
      taxIncluded: (p.taxIncluded || "").toString(),
      taxPercentage: Number(p.taxPercent || 0),
      serviceRecID: 0,
      storeRelease: p.storeRelease ? "Yes" : "No",
    })),
    isDraft,
  });

  // BOM posts one item per request according to backend schema
  const buildBOMItems = (isDraft = 0) =>
    bomItems.map((b) => ({
      serviceCode: formData.serviceCode || "",
      productCode: b.code,
      isDraft,
    }));

  // Practitioner posts one row per request (no clear draft flag supported)
  const buildPractitionerRows = () => {
    const doctorRows = doctorMappings.map((d) => ({
      serviceCode: formData.serviceCode || "",
      practionerType: "Doctor",
      clinicCode: d.clinicCode,
      doctorCode: d.doctorCode || d.id || "",
    }));
    const nurseRows = nurseMappings.map((n) => ({
      serviceCode: formData.serviceCode || "",
      practionerType: "Nurse",
      clinicCode: n.clinicCode,
      doctorCode: n.nurseCode || n.id || "", // API field name is doctorCode
    }));
    return [...doctorRows, ...nurseRows];
  };

  const buildFormsPayload = (isDraft = 0) => ({
    serviceCode: formData.serviceCode || "",
    formStageForCompletion: formsData.stageForFormCompletion || "",
    formBlockIfNotFilled: formsData.blockFromProceeding || "Yes",
    form: formsData.form || "",
    // misc fields ride along with Forms save
    field1: miscellaneousData.optionalField1 || "",
    field2: miscellaneousData.optionalField2 || "",
    field3: miscellaneousData.optionalField3 || "",
    field4: miscellaneousData.optionalField4 || "",
    field5: miscellaneousData.optionalField5 || "",
    isDraft,
  });

  // ----------------- POST HELPERS -----------------
  const postJSON = async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json().catch(() => ({}));
  };

  // ----------------- SAVE / SUBMIT ACTIONS -----------------
  // GENERAL
  const onSaveGeneral = async (asDraft = true) => {
    const missing = validateGeneral();
    if (missing.length) {
      setToast({ type: "error", message: `Please fill required fields: ${missing.join(", ")}` });
      return;
    }
    try {
      await postJSON(URLS.general, buildGeneralPayload(asDraft));
      markSaved("General", asDraft ? "draft" : "saved");
      setToast({ type: "success", message: `General ${asDraft ? "saved as draft" : "submitted"} successfully.` });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to save/submit General. Check inputs and try again." });
    }
  };

  // PRICING
  const onSavePricing = async () => {
    try {
      await postJSON(URLS.pricing, buildPricingPayload(1)); // draft
      markSaved("Pricing", "draft");
      setToast({ type: "success", message: "Pricing saved as draft." });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to save Pricing (draft)." });
    }
  };
  const onSubmitPricing = async () => {
    try {
      await postJSON(URLS.pricing, buildPricingPayload(0)); // submit
      markSaved("Pricing", "saved");
      setToast({ type: "success", message: "Pricing submitted successfully." });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to submit Pricing." });
    }
  };

  // BOM
  const onSaveBOM = async () => {
    try {
      const rows = buildBOMItems(1); // draft
      for (const row of rows) {
        await postJSON(URLS.bom, row);
      }
      markSaved("BOM", "draft");
      setToast({ type: "success", message: "BOM saved as draft." });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to save BOM (draft)." });
    }
  };
  const onSubmitBOM = async () => {
    try {
      const rows = buildBOMItems(0); // submit
      for (const row of rows) {
        await postJSON(URLS.bom, row);
      }
      markSaved("BOM", "saved");
      setToast({ type: "success", message: "BOM submitted successfully." });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to submit BOM." });
    }
  };

  // PRACTITIONERS
  const onSavePractitioners = async () => {
    try {
      const rows = buildPractitionerRows();
      for (const row of rows) {
        await postJSON(URLS.practitioner, row); // no explicit isDraft in schema
      }
      markSaved("Practitioner Mapping", "draft");
      setToast({ type: "success", message: "Practitioner mapping saved as draft." });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to save Practitioner Mapping." });
    }
  };
  const onSubmitPractitioners = async () => {
    try {
      const rows = buildPractitionerRows();
      for (const row of rows) {
        await postJSON(URLS.practitioner, row);
      }
      markSaved("Practitioner Mapping", "saved");
      setToast({ type: "success", message: "Practitioner mapping submitted successfully." });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to submit Practitioner Mapping." });
    }
  };

  // FORMS (+ carries Misc fields)
  const onSaveForms = async () => {
    try {
      await postJSON(URLS.forms, buildFormsPayload(1)); // draft
      markSaved("Forms", "draft");
      setToast({ type: "success", message: "Forms settings saved as draft." });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to save Forms settings (draft)." });
    }
  };
  const onSubmitForms = async () => {
    try {
      // First, fetch form definition by name
      const formName = formsData.form;
      if (!formName) {
        setToast({ type: "error", message: "Please select a form before submitting." });
        return;
      }
      const defUrl = `${API_BASE_URL}/api/form/definition-by-name?name=${encodeURIComponent(formName)}`;
      const defRes = await fetch(defUrl, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!defRes.ok) {
        throw new Error(`Failed to fetch form definition: ${defRes.status}`);
      }
      const defData = await defRes.json();
      const formId = defData.id;
      if (!formId) {
        throw new Error("Form definition does not contain an id.");
      }

      // Now, call /api/serviceForm/save
      const savePayload = {
        id: 0,
        serviceId: formData.serviceCode,
        formId: formId,
        version: 0,
        createdDate: new Date().toISOString(),
        isActive: true,
      };
      // console.log("savePayload",savePayload)
      const saveUrl = `${API_BASE_URL}/api/serviceForm/save`;
      await postJSON(saveUrl, savePayload);

      // Submitting forms also carries misc fields; mark both tabs saved
      markSaved("Forms", "saved");
      markSaved("Miscellaneous", "saved");
      setToast({ type: "success", message: "Forms (and Misc) submitted successfully." });
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to submit Forms." });
    }
  };

  // MISC (local only, plus submit via Forms)
  const onSaveMisc = () => {
    markSaved("Miscellaneous", "draft");
    setToast({ type: "success", message: "Miscellaneous saved locally (included when you submit Forms)." });
  };
  const onSubmitMiscViaForms = async () => {
    await onSubmitForms(); // reuse Forms submit since payload includes misc
  };

  // ----------------- UI -----------------
  const timeOptions = [
    { value: " ", label: "< - Select one - >" },
    { value: "10", label: "10mins" },
    { value: "20", label: "20mins" },
    { value: "30", label: "30mins" },
    { value: "40", label: "40mins" },
    { value: "50", label: "50mins" },
    { value: "1", label: "1 hour" },
    { value: "110", label: "1 hour 10mins" },
    { value: "120", label: "1 hour 20mins" },
    { value: "130", label: "1 hour 30mins" },
    { value: "140", label: "1 hour 40mins" },
    { value: "150", label: "1 hour 50mins" },
    { value: "2", label: "2 hour" },
    { value: "210", label: "2 hour 10mins" },
    { value: "220", label: "2 hour 20mins" },
  ];

  return (
    <>
      <style jsx>{`
        .page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
        .page-title{font-size:24px;font-weight:600;color:#333;margin:0;}
        .back-to-search-btn{padding:10px 20px;background:#343a40;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:500;}
        .back-to-search-btn:hover{background:#23272b;}
        .breadcrumb{margin-bottom:16px;font-size:14px;color:#6c757d;}
        .breadcrumb-link{color:#334B71;text-decoration:none;cursor:pointer;}
        .breadcrumb-link:hover{text-decoration:underline;}
        .breadcrumb-separator{margin:0 8px;}
        .helper-note{margin:8px 0 24px;background:#eef5ff;border:1px solid #d9e7ff;color:#264a86;padding:10px 12px;border-radius:6px;font-size:13px;}
        .form-container{background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);overflow:hidden;}
        .tabs-container{background:#fff;border-bottom:1px solid #dee2e6;padding:0;display:flex;justify-content:space-between;align-items:center;gap:8px}
        .tabs{display:flex;margin:0;padding:0;flex-wrap:wrap}
        .tab{position:relative;padding:0;background:none;border:none;cursor:pointer;font-size:14px;font-weight:500;color:#6c757d;border-bottom:3px solid transparent;transition:all .3s;display:flex;align-items:center;gap:6px}
        .tab:hover{background:#e9ecef;color:#495057;}
        .tab.active{color:#334B71;border-bottom-color:#334B71;background:#fff;}
        .dot{font-size:12px;line-height:12px}
        .badge{font-size:11px;border:1px solid #ccc;border-radius:999px;padding:2px 8px;background:#fff;color:#333}
        .badge.saved{border-color:#3fb950;color:#116329;background:#e9f6ec}
        .badge.draft{border-color:#d29922;color:#8a6a00;background:#fff7db}
        .badge.unsaved{border-color:#d0d7de;color:#57606a;background:#f6f8fa}
        .status-container{padding:0 16px;display:flex;align-items:center;gap:8px}
        .status-label{font-weight:500;color:#495057;font-size:14px;}
        .status-input{padding:8px 12px;border:1px solid #ced4da;border-radius:4px;font-size:14px;background:#fff;min-width:120px;}
        .form-content{padding:28px;}
        .tab span.dot{display:none;}
        .form-row{display:flex;margin-bottom:20px;align-items:flex-start;}
        .form-label{font-weight:500;color:#495057;font-size:14px;min-width:200px;padding-top:10px;text-align:left;}
        .form-input-container{flex:1;max-width:400px;}
        .form-input,.form-select,.form-textarea{width:100%;padding:10px 12px;border:1px solid #ced4da;border-radius:4px;font-size:14px;background:#fff;}
        .form-input:focus,.form-select:focus,.form-textarea:focus{outline:none;border-color:#334B71;box-shadow:0 0 0 3px rgba(0,123,255,.1);}
        .radio-group{display:flex;gap:20px;}
        .radio-input{width:16px;height:16px;accent-color:#334B71;}
        .req{color:crimson;margin-left:4px}
        .tab-actions{display:flex;gap:10px;margin-top:10px}
        .btn{padding:10px 18px;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;transition:all .2s;}
        .btn-primary{background:#334B71;color:#fff;}
        .btn-primary:hover{filter:brightness(.95)}
        .btn-secondary{background:#343a40;color:#fff;}
        .pricing-table-container{overflow-x:auto;border:1px solid #dee2e6;border-radius:4px;}
        .pricing-table{width:100%;border-collapse:collapse;background:#fff;}
        .pricing-table th{background:#f8f9fa;padding:12px;text-align:left;font-weight:600;color:#495057;border-bottom:1px solid #dee2e6;font-size:14px;}
        .pricing-table td{padding:12px;border-bottom:1px solid #dee2e6;vertical-align:middle;}
        .pricing-input{width:80px;padding:6px 8px;border:1px solid #ced4da;border-radius:4px;font-size:14px;text-align:center;}
        .pricing-select{width:100px;padding:6px 8px;border:1px solid #ced4da;border-radius:4px;font-size:14px;background:#fff;}
        .bom-title{font-size:16px;font-weight:600;color:#333;margin:20px 0;text-decoration:underline;}
        .bom-table-container{border:1px solid #dee2e6;border-radius:4px;overflow:hidden;}
        .bom-table{width:100%;border-collapse:collapse;background:#fff;}
        .bom-table th{background:#f8f9fa;padding:12px;text-align:left;font-weight:600;color:#495057;border-bottom:1px solid #dee2e6;font-size:14px;}
        .bom-table td{padding: 12px;}
        .no-bom-items{padding:40px;text-align:center;color:#6c757d;font-style:italic;}
        @media (max-width:768px){
          .form-content{padding:18px;}
          .form-row{flex-direction:column;align-items:flex-start;}
          .form-label{min-width:auto;margin-bottom:8px;padding-top:0;}
          .tabs-container{flex-direction:column;align-items:stretch;}
        }
      `}</style>

      <div className="service-form-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">{mode === "edit" ? "Edit Service" : "Create Service"}</h1>
          <button className="back-to-search-btn" onClick={() => onBack && onBack()}>Back To Search</button>
        </div>

        {/* Breadcrumb */}
        <div className="breadcrumb">
          <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-link">Manage Service</span>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-current">{mode === "edit" ? `Edit Service - ${formData.serviceCode}` : "Create New Service"}</span>
        </div>

        {/* Independence note */}
        <div className="helper-note">
          <strong>Note:</strong> Tabs are <em>independent</em>. Each tab saves to its own endpoint and can be completed in any order.
        </div>

        <div className="form-container">
          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs">
              {tabs.map((tab) => (
                <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)} title={dirty[tab] ? "Unsaved changes" : ""}>
                  {dirty[tab] && <span className="dot">●</span>}
                  <span>{tab}</span>
                </button>
              ))}
            </div>
            <div className="status-container">
              <span className={`badge ${tabStatus[activeTab]}`}>{tabStatus[activeTab]}</span>
              <label className="status-label">Service Status :</label>
              <input type="text" name="serviceStatus" value={formData.serviceStatus} onChange={handleInputChange} className="status-input" readOnly={mode === "create"} />
            </div>
          </div>

          {/* Content */}
          <div className="form-content">
            {/* GENERAL */}
            {activeTab === "General" && (
              <>
                <div className="form-row">
                  <label className="form-label">Service Code <span className="req">*</span></label>
                  <div className="form-input-container">
                    <input required type="text" name="serviceCode" value={formData.serviceCode} onChange={handleInputChange} className="form-input" placeholder="Enter service code" />
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Service Name <span className="req">*</span></label>
                  <div className="form-input-container">
                    <input required type="text" name="serviceName" value={formData.serviceName} onChange={handleInputChange} className="form-input" placeholder="Enter service name" />
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Arabic Service Name</label>
                  <div className="form-input-container">
                    <input type="text" name="arabicServiceName" value={formData.arabicServiceName} onChange={handleInputChange} className="form-input" placeholder="Enter Arabic service name" />
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Service Description</label>
                  <div className="form-input-container">
                    <textarea name="serviceDescription" value={formData.serviceDescription} onChange={handleInputChange} className="form-textarea" placeholder="Enter service description" />
                  </div>
                </div>

                {/* Category */}
                <div className="form-row">
                  <label className="form-label">Service Category</label>
                  <div className="form-input-container">
                    <select name="serviceCategory" value={formData.serviceCategory} onChange={handleCategoryChange} className="form-select">
                      <option value="">{catLoading ? "Loading..." : "Select Category"}</option>
                      {categories.map((c) => (
                        <option key={c.categoryCode} value={c.categoryCode}>{c.categoryName}</option>
                      ))}
                    </select>
                    {catError && <div style={{ color: "crimson", marginTop: 6 }}>{catError}</div>}
                  </div>
                </div>

                {/* Sub Category */}
                <div className="form-row">
                  <label className="form-label">Service Sub Category <span className="req">*</span></label>
                  <div className="form-input-container">
                    <select required name="serviceSubCategory" value={formData.serviceSubCategory} onChange={handleSubCategoryChange} className="form-select" disabled={!formData.serviceCategory}>
                      <option value="">{subLoading ? "Loading..." : "< - Select one - >"}</option>
                      {subCategories.map((s) => (
                        <option key={s.subCategoryCode} value={s.subCategoryCode}>{s.subCategoryName}</option>
                      ))}
                    </select>
                    {subError && <div style={{ color: "crimson", marginTop: 6 }}>{subError}</div>}
                  </div>
                </div>

                {/* Sub Sub Category */}
                <div className="form-row">
                  <label className="form-label">Service Sub Sub Category</label>
                  <div className="form-input-container">
                    <select name="serviceSubSubCategory" value={formData.serviceSubSubCategory} onChange={handleInputChange} className="form-select" disabled={!formData.serviceCategory || !formData.serviceSubCategory}>
                      <option value="">{ssLoading ? "Loading..." : "< - Select one - >"}</option>
                      {subSubCategories.map((s) => (
                        <option key={s.subSubCategoryCode} value={s.subSubCategoryCode}>{s.subSubCategoryName}</option>
                      ))}
                    </select>
                    {ssError && <div style={{ color: "crimson", marginTop: 6 }}>{ssError}</div>}
                  </div>
                </div>

                {/* Service Time */}
                <div className="form-row">
                  <label className="form-label">Service Time(Mins) <span className="req">*</span></label>
                  <div className="form-input-container">
                    <select required name="serviceTime" value={formData.serviceTime} onChange={handleInputChange} className="form-select">
                      {timeOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Radios */}
                {[
                  ["Allow Ideal BOM Consumption", "allowIdealBOMConsumption", true],
                  ["Allow BOM Consumption with intervention", "allowBOMConsumptionWithIntervention", true],
                  ["Allow Loyalty Accrual", "allowLoyaltyAccrual", false],
                  ["Allow Loyalty Redemption", "allowLoyaltyRedemption", false],
                ].map(([label, key, required]) => (
                  <div className="form-row" key={key}>
                    <label className="form-label">{label} {required && <span className="req">*</span>}</label>
                    <div className="form-input-container">
                      <div className="radio-group">
                        <label>
                          <input required={required} type="radio" className="radio-input" name={key} value="Yes" checked={formData[key] === "Yes"} onChange={(e) => handleRadioChange(key, e.target.value)} /> Yes
                        </label>
                        <label>
                          <input required={required} type="radio" className="radio-input" name={key} value="No" checked={formData[key] === "No"} onChange={(e) => handleRadioChange(key, e.target.value)} /> No
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Additional fields */}
                {["additionalField1","additionalField2","additionalField3","additionalField4","additionalField5"].map((f,i)=>(
                  <div className="form-row" key={f}>
                    <label className="form-label">{`Additional Field ${i+1}`}</label>
                    <div className="form-input-container">
                      <input type="text" name={f} value={formData[f]} onChange={handleInputChange} className="form-input" placeholder={`Enter additional field ${i+1}`} />
                    </div>
                  </div>
                ))}

                <div className="tab-actions">
                  <button className="btn btn-primary" onClick={() => onSaveGeneral(true)}>Save as Draft</button>
                  <button className="btn btn-secondary" onClick={() => onSaveGeneral(false)}>Submit General</button>
                </div>
              </>
            )}

            {/* PRICING */}
            {activeTab === "Pricing" && (
              <>
                <div className="pricing-table-container">
                  <table className="pricing-table">
                    <thead>
                      <tr>
                        <th>Center Code</th><th>Center Name</th><th>Price</th><th>Tax Included</th><th>Tax Percent</th><th>Store Release</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.pricingData.map((p, i) => (
                        <tr key={i}>
                          <td>{p.centerCode}</td>
                          <td>{p.centerName}</td>
                          <td><input type="number" className="pricing-input" value={p.price} min="0" step="0.01" onChange={(e) => handlePricingChange(i, "price", e.target.value)} /></td>
                          <td>
                            <select className="pricing-select" value={p.taxIncluded} onChange={(e) => handlePricingChange(i, "taxIncluded", e.target.value)}>
                              <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
                            </select>
                          </td>
                          <td><input type="number" className="pricing-input" value={p.taxPercent} min="0" max="100" step="0.01" onChange={(e) => handlePricingChange(i, "taxPercent", e.target.value)} /></td>
                          <td><input type="checkbox" className="pricing-checkbox" checked={!!p.storeRelease} onChange={() => handlePricingCheckboxChange(i, "storeRelease")} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tab-actions">
                  <button className="btn btn-primary" onClick={onSavePricing}>Save as Draft</button>
                  <button className="btn btn-secondary" onClick={onSubmitPricing}>Submit Pricing</button>
                </div>
              </>
            )}

            {/* BOM */}
            {activeTab === "BOM" && (
              <>
                <div className="form-row">
                  <label className="form-label">Search Consumables:</label>
                  <div className="form-input-container" style={{ display: "flex", gap: 10 }}>
                    <input
                      className="form-input"
                      value={searchConsumables}
                      onChange={(e) => setSearchConsumables(e.target.value)}
                      placeholder="Type a keyword (e.g., s, acne, mask)…"
                    />
                    <button type="button" className="btn btn-secondary" onClick={handleSearchConsumables}>
                      {consumableLoad ? "Searching…" : "🔍"}
                    </button>
                  </div>
                </div>
                {consumableErr && <div style={{ color: "crimson", margin: "6px 0 10px" }}>{consumableErr}</div>}

                <div className="form-row">
                  <label className="form-label">Consumables :</label>
                  <div className="form-input-container" style={{ display: "flex", gap: 10 }}>
                    <select
                      className="form-select"
                      value={selectedConsumable}
                      onChange={(e) => setSelectedConsumable(e.target.value)}
                    >
                      {consumableOpts.map((o, idx) => (
                        <option key={`${o.code}-${idx}`} value={o.code}>
                          {o.name} {o.code && o.code !== "0" ? `(${o.code})` : ""}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-primary" onClick={handleAddConsumable}>Add</button>
                  </div>
                </div>

                <h3 className="bom-title">Ideal of BOM</h3>
                <div className="bom-table-container">
                  <table className="bom-table">
                    <thead>
                      <tr><th style={{width:50}}></th><th>Consumable Code</th><th>Consumable Name</th><th>Qty</th><th>UOM</th></tr>
                    </thead>
                    <tbody>
                      {bomItems.map((it) => (
                        <tr key={it.id}>
                          <td><input type="checkbox" checked={it.selected} onChange={() => handleBOMItemSelection(it.id)} /></td>
                          <td>{it.code}</td><td>{it.name}</td><td>{it.qty}</td><td>{it.uom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bomItems.length === 0 && <div className="no-bom-items">No consumables added to BOM yet.</div>}
                </div>

                <div className="tab-actions">
                  <button className="btn btn-primary" onClick={onSaveBOM}>Save as Draft</button>
                  <button className="btn btn-secondary" onClick={onSubmitBOM}>Submit BOM</button>
                </div>
              </>
            )}

            {/* PRACTITIONER MAPPING */}
            {activeTab === "Practitioner Mapping" && (
              <>
                <div style={{ display: "flex", gap: "60px", justifyContent: "space-between" }}>
                  {/* Doctors column */}
                  <div style={{ flex: 1 }}>
                    <div className="form-row">
                      <label className="form-label">Clinic :</label>
                      <div className="form-input-container">
                        <select className="form-select" value={practitionerMapping.leftClinic} onChange={(e) => handlePractitionerMappingChange("leftClinic", e.target.value)}>
                          <option value="">{clinicLoading ? "Loading…" : "Select one"}</option>
                          {clinics.map((c) => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                        {clinicError && <div style={{ color:"crimson", marginTop:6 }}>{clinicError}</div>}
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Doctor:</label>
                      <div className="form-input-container" style={{ display: "flex", gap: 10 }}>
                        <select className="form-select" value={practitionerMapping.doctor} onChange={(e) => handlePractitionerMappingChange("doctor", e.target.value)} style={{ flex: 1 }} disabled={!practitionerMapping.leftClinic}>
                          <option value="">{leftLoad ? "Loading…" : "< - Select one - >"}</option>
                          {leftPractitioners.map((p) => (
                            <option key={p.id} value={`${p.id}|${p.name}`}>{p.name}</option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-primary" disabled={!practitionerMapping.leftClinic || !practitionerMapping.doctor} onClick={() => {
                          const [practCode, practName] = (practitionerMapping.doctor || "").split("|");
                          const centerCode = practitionerMapping.leftClinic;
                          if (!centerCode || !practCode) return;
                          const clinicName = clinics.find(c => c.code === centerCode)?.name || centerCode;
                          const dup = doctorMappings.some((m) => m.doctorCode === practCode && m.clinicCode === centerCode);
                          if (dup) { setToast({ type: "error", message: "Doctor already mapped to this clinic." }); return; }
                          markDirty("Practitioner Mapping");
                          setDoctorMappings((prev) => [
                            ...prev,
                            { id: Date.now(), doctorCode: practCode, doctorName: practName, clinicCode: centerCode, clinicName, selected: false },
                          ]);
                          setPractitionerMapping((prev) => ({ ...prev, doctor: "" }));
                        }}>Add</button>
                      </div>
                      {leftErr && <div style={{ color:"crimson", marginTop:6 }}>{leftErr}</div>}
                    </div>

                    {/* quick filter + remove */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0 6px" }}>
                      <input placeholder="Filter doctors…" className="form-input" style={{ width: 200 }} value={docFilter} onChange={(e) => setDocFilter(e.target.value)} />
                      <div>
                        <span className="badge saved" style={{ marginRight: 8 }}>{doctorMappings.length} items</span>
                        <button className="btn btn-secondary" onClick={() => { markDirty("Practitioner Mapping"); setDoctorMappings((prev) => prev.filter((m) => !m.selected)); }}>Remove selected</button>
                      </div>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #dee2e6" }}>
                        <thead>
                          <tr style={{ background: "#f8f9fa" }}>
                            <th style={{ padding: 12, width: 50 }}></th>
                            <th style={{ padding: 12, textAlign: "left" }}>Doctor Name</th>
                            <th style={{ padding: 12, textAlign: "left" }}>Clinic Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doctorMappings
                            .filter((m) => !docFilter?.trim() ? true : (m.doctorName + " " + m.clinicName).toLowerCase().includes(docFilter.toLowerCase()))
                            .map((m) => (
                              <tr key={m.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                                <td style={{ padding: 12, textAlign: "center" }}>
                                  <input type="checkbox" checked={m.selected} onChange={() => handleDoctorMappingSelection(m.id)} style={{ width: 16, height: 16, accentColor: "#334B71" }} />
                                </td>
                                <td style={{ padding: 12 }}>{m.doctorName}</td>
                                <td style={{ padding: 12 }}>{m.clinicName}</td>
                              </tr>
                            ))}
                          {doctorMappings.length === 0 && (
                            <tr><td colSpan={3} style={{ padding: 16, color: "#6c757d", fontStyle: "italic" }}>No doctor mappings yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Nurses column */}
                  <div style={{ flex: 1 }}>
                    <div className="form-row">
                      <label className="form-label">Clinic :</label>
                      <div className="form-input-container">
                        <select className="form-select" value={practitionerMapping.rightClinic} onChange={(e) => handlePractitionerMappingChange("rightClinic", e.target.value)}>
                          <option value="">{clinicLoading ? "Loading…" : "Select one"}</option>
                          {clinics.map((c) => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                        {clinicError && <div style={{ color:"crimson", marginTop:6 }}>{clinicError}</div>}
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Nurses:</label>
                      <div className="form-input-container" style={{ display: "flex", gap: 10 }}>
                        <select className="form-select" value={practitionerMapping.nurses} onChange={(e) => handlePractitionerMappingChange("nurses", e.target.value)} style={{ flex: 1 }} disabled={!practitionerMapping.rightClinic}>
                          <option value="">{rightLoad ? "Loading…" : "< - Select one - >"}</option>
                          {rightPractitioners.map((p) => (
                            <option key={p.id} value={`${p.id}|${p.name}`}>{p.name}</option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-primary" disabled={!practitionerMapping.rightClinic || !practitionerMapping.nurses} onClick={() => {
                          const [practCode, practName] = (practitionerMapping.nurses || "").split("|");
                          const centerCode = practitionerMapping.rightClinic;
                          if (!centerCode || !practCode) return;
                          const clinicName = clinics.find(c => c.code === centerCode)?.name || centerCode;
                          const dup = nurseMappings.some((m) => m.nurseCode === practCode && m.clinicCode === centerCode);
                          if (dup) { setToast({ type: "error", message: "Nurse already mapped to this clinic." }); return; }
                          markDirty("Practitioner Mapping");
                          setNurseMappings((prev) => [
                            ...prev,
                            { id: Date.now(), nurseCode: practCode, nurseName: practName, clinicCode: centerCode, clinicName, selected: false },
                          ]);
                          setPractitionerMapping((prev) => ({ ...prev, nurses: "" }));
                        }}>Add</button>
                      </div>
                      {rightErr && <div style={{ color:"crimson", marginTop:6 }}>{rightErr}</div>}
                    </div>

                    {/* quick filter + remove */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0 6px" }}>
                      <input placeholder="Filter nurses…" className="form-input" style={{ width: 200 }} value={nurseFilter} onChange={(e) => setNurseFilter(e.target.value)} />
                      <div>
                        <span className="badge saved" style={{ marginRight: 8 }}>{nurseMappings.length} items</span>
                        <button className="btn btn-secondary" onClick={() => { markDirty("Practitioner Mapping"); setNurseMappings((prev) => prev.filter((m) => !m.selected)); }}>Remove selected</button>
                      </div>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #dee2e6" }}>
                        <thead>
                          <tr style={{ background: "#f8f9fa" }}>
                            <th style={{ padding: 12, width: 50 }}></th>
                            <th style={{ padding: 12, textAlign: "left" }}>Nurse Name</th>
                            <th style={{ padding: 12, textAlign: "left" }}>Clinic Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nurseMappings
                            .filter((m) => !nurseFilter?.trim() ? true : (m.nurseName + " " + m.clinicName).toLowerCase().includes(nurseFilter.toLowerCase()))
                            .map((m) => (
                              <tr key={m.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                                <td style={{ padding: 12, textAlign: "center" }}>
                                  <input type="checkbox" checked={m.selected} onChange={() => handleNurseMappingSelection(m.id)} style={{ width: 16, height: 16, accentColor: "#334B71" }} />
                                </td>
                                <td style={{ padding: 12 }}>{m.nurseName}</td>
                                <td style={{ padding: 12 }}>{m.clinicName}</td>
                              </tr>
                            ))}
                          {nurseMappings.length === 0 && (
                            <tr><td colSpan={3} style={{ padding: 16, color: "#6c757d", fontStyle: "italic" }}>No nurse mappings yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="tab-actions">
                  <button className="btn btn-primary" onClick={onSavePractitioners}>Save as Draft</button>
                  <button className="btn btn-secondary" onClick={onSubmitPractitioners}>Submit Practitioner Mapping</button>
                </div>
              </>
            )}

            {/* FORMS */}
            {activeTab === "Forms" && (
              <>
                <div className="form-row">
                  <label className="form-label">Stage for form completion :</label>
                  <div className="form-input-container">
                    <select className="form-select" value={formsData.stageForFormCompletion} onChange={(e) => handleFormsDataChange("stageForFormCompletion", e.target.value)}>
                      <option value="form-not-required">Form not required</option>
                      <option value="before-service">Before Service</option>
                      <option value="during-service">During Service</option>
                      <option value="after-service">After Service</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Block from proceeding list if form not filled :</label>
                  <div className="form-input-container">
                    <div className="radio-group">
                      <label><input type="radio" className="radio-input" name="blockFromProceeding" value="Yes" checked={formsData.blockFromProceeding === "Yes"} onChange={(e) => handleFormsDataChange("blockFromProceeding", e.target.value)} /> Yes</label>
                      <label><input type="radio" className="radio-input" name="blockFromProceeding" value="No" checked={formsData.blockFromProceeding === "No"} onChange={(e) => handleFormsDataChange("blockFromProceeding", e.target.value)} /> No</label>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Form :</label>
                  <div className="form-input-container">
                    <select className="form-select" value={formsData.form} onChange={(e) => handleFormsDataChange("form", e.target.value)}>
                      <option value="">Select Form</option>
                      {formnames.map((formname) => (
                        <option key={formname} value={formname}>{formname}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="tab-actions">
                  <button className="btn btn-primary" onClick={onSaveForms}>Save as Draft</button>
                  <button className="btn btn-secondary" onClick={onSubmitForms}>Submit Forms</button>
                </div>
              </>
            )}

            {/* MISC */}
            {activeTab === "Miscellaneous" && (
              <>
                <div style={{ display: "flex", gap: "60px" }}>
                  <div style={{ flex: 1 }}>
                    {["optionalField1","optionalField2","optionalField3"].map((f,i)=>(
                      <div className="form-row" key={f}>
                        <label className="form-label">{`Optional Field ${i+1} :`}</label>
                        <div className="form-input-container">
                          <input className="form-input" value={miscellaneousData[f]} onChange={(e) => handleMiscellaneousDataChange(f, e.target.value)} placeholder={`Enter optional field ${i+1}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    {["optionalField4","optionalField5"].map((f,i)=>(
                      <div className="form-row" key={f}>
                        <label className="form-label">{`Optional Field ${i+4} :`}</label>
                        <div className="form-input-container">
                          <input className="form-input" value={miscellaneousData[f]} onChange={(e) => handleMiscellaneousDataChange(f, e.target.value)} placeholder={`Enter optional field ${i+4}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="helper-note" style={{ marginTop: 12 }}>
                  <strong>FYI:</strong> Submitting <em>Forms</em> will also submit these Misc fields since they’re included in the Forms payload.
                </div>

                <div className="tab-actions">
                  <button className="btn btn-primary" onClick={onSaveMisc}>Save (Local)</button>
                  <button className="btn btn-secondary" onClick={onSubmitMiscViaForms}>Submit (via Forms)</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </>
  );
};

export default ServiceForm;
