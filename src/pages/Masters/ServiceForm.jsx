"use client";

import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token");

const fetchGET = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json().catch(() => ({}));
  return json.data ?? json;
};

const postJSON = async (url, body) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    try {
      const errJson = await res.json();
      throw new Error(errJson.message || errJson.error || `HTTP ${res.status}`);
    } catch (jsonErr) {
      if (jsonErr.message && !jsonErr.message.startsWith("HTTP")) throw jsonErr;
      throw new Error(`HTTP ${res.status}`);
    }
  }
  const json = await res.json().catch(() => ({}));
  return json.data ?? json;
};

const URLS = {
  general:      `${API_BASE_URL}/api/Master/InsertServiceGeneral`,
  pricing:      `${API_BASE_URL}/api/Master/InsertServicePrice`,
  bom:          `${API_BASE_URL}/api/Master/InsertServiceBOM`,
  practitioner: `${API_BASE_URL}/api/Master/InsertServicePractioner`,
  forms:        `${API_BASE_URL}/api/Master/InsertServiceForms`,
};

const Toast = ({ type, message, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success"
    ? { background:"#ecfdf5", color:"#065f46", border:"1px solid #6ee7b7" }
    : type === "error"
    ? { background:"#fef2f2", color:"#991b1b", border:"1px solid #fca5a5" }
    : { background:"#fffbeb", color:"#92400e", border:"1px solid #fde68a" };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, padding:"10px 18px", borderRadius:10,
      fontSize:13, fontWeight:600, zIndex:9999, boxShadow:"0 4px 14px rgba(0,0,0,0.12)", ...bg }}>
      {message}
    </div>
  );
};

const ServiceForm = ({ service = null, onBack, mode = "create" }) => {
  const [activeTab, setActiveTab] = useState("General");
  const tabs = ["General","Pricing","BOM","Practitioner Mapping","Miscellaneous","EMR Forms"];
  // After first successful general save, treat subsequent saves as edits
  const [localMode, setLocalMode] = useState(mode);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => setToast({ message, type });

  const [tabStatus, setTabStatus] = useState({
    General:"unsaved", Pricing:"unsaved", BOM:"unsaved",
    "Practitioner Mapping":"unsaved", Miscellaneous:"unsaved",
  });
  const [dirty, setDirty] = useState({
    General:false, Pricing:false, BOM:false,
    "Practitioner Mapping":false, Miscellaneous:false,
  });
  const loadEMRForms = async () => {
    if (emrFormsLoaded) return;
    try {
      const [mappedRes, activeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/EMR/Service/${encodeURIComponent(formData.serviceCode || formData.code || "")}/Forms`,
          { headers:{ Authorization:`Bearer ${TOKEN()}` } }).then(r=>r.json()),
        fetch(`${API_BASE_URL}/api/EMR/Forms/Active`,
          { headers:{ Authorization:`Bearer ${TOKEN()}` } }).then(r=>r.json()),
      ]);
      setEmrForms(Array.isArray(mappedRes.data) ? mappedRes.data : []);
      const allForms = Array.isArray(activeRes.data) ? activeRes.data : [];
      setActiveForms(allForms.filter(f => f.formType !== 'Customer'));
      setEmrFormsLoaded(true);
    } catch(e) { console.error("EMR forms load error:", e); }
  };

  // ── Unsaved-changes guard ──────────────────────────────────────────────────
  const hasUnsavedChanges = () => Object.values(dirty).some(Boolean);

  const handleBackSafe = () => {
    if (hasUnsavedChanges()) {
      const choice = window.confirm(
        "You have unsaved changes.\n\nClick OK to go back anyway (changes will be lost).\nClick Cancel to stay and save."
      );
      if (!choice) return;
    }
    onBack();
  };

  const handleSaveEMRForms = async () => {
    try {
      const res = await postJSON(`${API_BASE_URL}/api/EMR/Service/Forms/Save`, {
        serviceCode: formData.serviceCode || formData.code || "",
        forms: emrForms,
      });
      if (!res.success) throw new Error(res.message);
      markSaved("EMR Forms", "saved");
      showToast("Forms saved successfully.");
    } catch(e) { showToast(e.message || "Failed to save forms.", "error"); }
  };

  const addEMRForm = () => {
    if (emrForms.length >= 11) { showToast("Maximum 11 forms per service.", "error"); return; }
    setEmrForms(p => [...p, {
      formCode:    activeForms[0]?.formCode  || "",
      formName:    activeForms[0]?.formName  || "",
      whenToFill:  "Before Service Starts",
      isMandatory: true,
    }]);
  };

  const updateEMRForm = (idx, field, val) => {
    setEmrForms(p => p.map((f, i) => {
      if (i !== idx) return f;
      if (field === "formCode") {
        const found = activeForms.find(a => a.formCode === val);
        return { ...f, formCode: val, formName: found?.formName || val };
      }
      return { ...f, [field]: val };
    }));
  };

  const removeEMRForm = (idx) => setEmrForms(p => p.filter((_, i) => i !== idx));

  const markDirty = (tab) => setDirty((d) => d[tab] ? d : { ...d, [tab]: true });
  const markSaved = (tab, state = "saved") => {
    setDirty((d)  => ({ ...d, [tab]: false }));
    setTabStatus((s) => ({ ...s, [tab]: state }));
  };

  const toArray = (d) => (Array.isArray(d) ? d : d ? [d] : []);

  // ── Form data ───────────────────────────────────────────────────────────────
  const [emrForms,       setEmrForms]       = useState([]);  // mapped EMR forms
  const [activeForms,    setActiveForms]    = useState([]);  // available EMR forms
  const [emrFormsLoaded, setEmrFormsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    serviceCode:        service?.code        || "",
    serviceName:        service?.name        || "",
    arabicServiceName:  service?.arabicName  || "",
    serviceDescription: service?.description || "",
    serviceCategory:    service?.category    || "",
    serviceSubCategory: service?.subcategory || "",
    serviceSubSubCategory: service?.subSubcategory || "",
    serviceTime:        service?.time        || " ",
    allowIdealBOMConsumption:            service?.allowIdealBOM       || "No",
    allowBOMConsumptionWithIntervention: service?.allowBOMIntervention|| "No",
    allowLoyaltyAccrual:                 service?.allowLoyaltyAccrual || "No",
    allowLoyaltyRedemption:              service?.allowLoyaltyRedemption || "No",
    addToQuickCart:                      service?.addToQuickCart             || "No",
    additionalField1: service?.additionalField1 || "",
    additionalField2: service?.additionalField2 || "",
    additionalField3: service?.additionalField3 || "",
    additionalField4: service?.additionalField4 || "",
    additionalField5: service?.additionalField5 || "",
    serviceStatus:    service?.status || "Active",
    // Pre-fill with whatever came from the API — useEffect will merge with clinic names after LoadCenters
    pricingData: Array.isArray(service?.pricingData) && service.pricingData.length > 0
      ? service.pricingData
      : [],
  });

  // ── Practitioner state ──────────────────────────────────────────────────────
  const [doctorMappings, setDoctorMappings] = useState(service?.doctorMappings || []);
  const [nurseMappings,  setNurseMappings]  = useState(service?.nurseMappings  || []);
  const [practitionerMapping, setPractitionerMapping] = useState({
    leftClinic:"", doctor:"", rightClinic:"", nurses:"",
  });
  const [leftPractitioners,  setLeftPractitioners]  = useState([]);
  const [rightPractitioners, setRightPractitioners] = useState([]);
  const [leftLoad,  setLeftLoad]  = useState(false);
  const [rightLoad, setRightLoad] = useState(false);
  const [leftErr,   setLeftErr]   = useState("");
  const [rightErr,  setRightErr]  = useState("");
  const [docFilter,   setDocFilter]   = useState("");
  const [nurseFilter, setNurseFilter] = useState("");

  // ── BOM state ───────────────────────────────────────────────────────────────
  const [searchConsumables,  setSearchConsumables]  = useState("s");
  const [selectedConsumable, setSelectedConsumable] = useState("");
  const [consumableOpts,     setConsumableOpts]     = useState([{ name:"Select one", code:"0" }]);
  const [consumableLoad,     setConsumableLoad]     = useState(false);
  const [consumableErr,      setConsumableErr]      = useState("");
  const [bomItems, setBomItems] = useState(Array.isArray(service?.bomItems) ? service.bomItems : []);

  // ── Category state ───────────────────────────────────────────────────────────
  const [categories,       setCategories]       = useState([]);
  const [subCategories,    setSubCategories]    = useState([]);
  const [subSubCategories, setSubSubCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [ssLoading,  setSsLoading]  = useState(false);
  const [catError,   setCatError]   = useState("");
  const [subError,   setSubError]   = useState("");
  const [ssError,    setSsError]    = useState("");

  // ── Clinics state ────────────────────────────────────────────────────────────
  const [clinics,       setClinics]       = useState([]);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [clinicError,   setClinicError]   = useState("");

  // ── Forms state ──────────────────────────────────────────────────────────────
  const [formsData, setFormsData] = useState(
    Array.isArray(service?.formsData)
      ? service.formsData.map((f, i) => ({ ...f, id:Date.now()+i, selected:false }))
      : service?.formsData
        ? [{ ...service.formsData, id:Date.now(), selected:false }]
        : [{ stageForFormCompletion:"form-not-required", blockFromProceeding:"Yes", form:"", id:Date.now(), selected:false }]
  );
  const [newForm, setNewForm] = useState({
    stageForFormCompletion:"form-not-required", blockFromProceeding:"Yes", form:"",
  });
  const [miscellaneousData, setMiscellaneousData] = useState({
    optionalField1: service?.miscellaneousData?.optionalField1 || "",
    optionalField2: service?.miscellaneousData?.optionalField2 || "",
    optionalField3: service?.miscellaneousData?.optionalField3 || "",
    optionalField4: service?.miscellaneousData?.optionalField4 || "",
    optionalField5: service?.miscellaneousData?.optionalField5 || "",
  });

  // ── Load categories ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCatLoading(true); setCatError("");
        const data = await fetchGET(`${API_BASE_URL}/api/Master/ServiceCategory`);
        if (cancelled) return;
        setCategories(toArray(data).map((x) => ({
          categoryCode: x.categoryCode ?? x.code ?? "",
          categoryName: x.categoryName ?? x.name ?? "",
        })));
      } catch { setCatError("Failed to load categories"); }
      finally { setCatLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cat = formData.serviceCategory;
      setSubCategories([]); setSubError(""); setSubSubCategories([]); setSsError("");
      if (!cat) return;
      try {
        setSubLoading(true);
        const data = await fetchGET(`${API_BASE_URL}/api/Master/ServiceSubCategory?categoryCode=${encodeURIComponent(cat)}`);
        if (cancelled) return;
        setSubCategories(toArray(data).map((x) => ({
          categoryCode:    x.categoryCode    ?? "",
          subCategoryCode: x.subCategoryCode ?? "",
          subCategoryName: x.subCategoryName ?? "",
        })));
      } catch { setSubError("Failed to load sub categories"); }
      finally { setSubLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [formData.serviceCategory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cat = formData.serviceCategory;
      const sub = formData.serviceSubCategory;
      setSubSubCategories([]); setSsError("");
      if (!cat || !sub) return;
      try {
        setSsLoading(true);
        const data = await fetchGET(`${API_BASE_URL}/api/Master/ServiceSubSubCategory?categoryCode=${encodeURIComponent(cat)}&subCategoryCode=${encodeURIComponent(sub)}`);
        if (cancelled) return;
        setSubSubCategories(toArray(data).map((x, i) => ({
          subSubCategoryCode:    `${cat}|${sub}|${x.subSubCategoryName || i}`,
          subSubCategoryCodeRaw: x.subSubCategoryCode ?? "",
          subSubCategoryName:    x.subSubCategoryName ?? "",
        })));
      } catch { setSsError("Failed to load sub sub categories"); }
      finally { setSsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [formData.serviceCategory, formData.serviceSubCategory]);

  // ── Load clinics ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setClinicLoading(true); setClinicError("");
        const data = await fetchGET(`${API_BASE_URL}/api/master/LoadCenters`);
        const loaded = toArray(data)
          .map((x) => ({ code: x.code ?? "", name: x.name ?? "" }))
          .filter((c) => c.code && c.name);
        setClinics(loaded);

        // Build pricingData rows:
        // Start with what came from the API (real prices), then append any clinics
        // that have no price row yet (new clinics / create mode)
        const existingPrices = service?.pricingData || [];

        const merged = loaded.map((clinic) => {
          // case-insensitive match on centerCode
          const existing = existingPrices.find(
            (p) => String(p.centerCode || "").toLowerCase() === clinic.code.toLowerCase()
          );
          if (existing) {
            // Ensure centerName is the human-readable name from LoadCenters
            return { ...existing, centerName: clinic.name };
          }
          return {
            centerCode:  clinic.code,
            centerName:  clinic.name,
            price:       "0",
            taxIncluded: "",
            taxPercent:  "0",
            storeRelease: false,
            memberPrice: "",
            memberDiscount: "",
          };
        });

        // If API returned prices but none matched clinics (code mismatch),
        // fall back to raw existingPrices so at least something shows
        const hasRealPrices = merged.some((r) => parseFloat(r.price) > 0);
        const fallback = !hasRealPrices && existingPrices.length > 0
          ? existingPrices   // use as-is, codes didn't match clinic list
          : merged;

        setFormData((prev) => ({ ...prev, pricingData: fallback }));
      } catch { setClinicError("Failed to load clinics"); }
      finally { setClinicLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load practitioners from CLINIC_DOCTORS for selected clinic ───────────────
  const fetchPractitionersForClinic = useCallback(async (centerCode, side) => {
    if (!centerCode) {
      side === "left" ? setLeftPractitioners([]) : setRightPractitioners([]);
      side === "left" ? setLeftErr("") : setRightErr("");
      return;
    }
    try {
      side === "left" ? setLeftLoad(true) : setRightLoad(true);
      side === "left" ? setLeftErr("") : setRightErr("");
      const data = await fetchGET(
        `${API_BASE_URL}/api/Master/LoadPractitionersByClinic/${encodeURIComponent(centerCode)}`
      );
      const mapped = toArray(data).map((p) => ({
        id:   p.practitionerCode || p.EMPLOYEE || "",
        name: p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim(),
      })).filter((p) => p.id);
      side === "left" ? setLeftPractitioners(mapped) : setRightPractitioners(mapped);
    } catch {
      side === "left" ? setLeftErr("Failed to load practitioners") : setRightErr("Failed to load practitioners");
    } finally {
      side === "left" ? setLeftLoad(false) : setRightLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchPractitionersForClinic(practitionerMapping.leftClinic, "left");
  }, [practitionerMapping.leftClinic, fetchPractitionersForClinic]);

  useEffect(() => {
    fetchPractitionersForClinic(practitionerMapping.rightClinic, "right");
  }, [practitionerMapping.rightClinic, fetchPractitionersForClinic]);

  // ── Load existing practitioner mappings for service (edit mode) ───────────────
  useEffect(() => {
    if (mode === "edit" && formData.serviceCode) {
      (async () => {
        try {
          const data = await fetchGET(
            `${API_BASE_URL}/api/Master/LoadServicePractitionerMapping/${encodeURIComponent(formData.serviceCode)}`
          );
          const rows = toArray(data);
          const doctors = rows
            .filter((r) => (r.practitionerType || "").toLowerCase() === "doctor")
            .map((r, i) => ({
              id:         Date.now() + i,
              doctorCode: r.practitionerCode || "",
              doctorName: r.fullName         || "",
              clinicCode: r.centerCode       || "",
              clinicName: r.clinicName       || "",
              selected:   false,
            }));
          const nurses = rows
            .filter((r) => (r.practitionerType || "").toLowerCase() === "nurse")
            .map((r, i) => ({
              id:        Date.now() + 1000 + i,
              nurseCode: r.practitionerCode || "",
              nurseName: r.fullName         || "",
              clinicCode:r.centerCode       || "",
              clinicName:r.clinicName       || "",
              selected:  false,
            }));
          if (doctors.length > 0) setDoctorMappings(doctors);
          if (nurses.length  > 0) setNurseMappings(nurses);
        } catch { console.error("Failed to load existing practitioner mapping"); }
      })();
    }
  }, [mode, formData.serviceCode]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    markDirty(activeTab);
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };
  const handleCategoryChange = (e) => {
    markDirty("General");
    setFormData((p) => ({ ...p, serviceCategory: e.target.value, serviceSubCategory:"", serviceSubSubCategory:"" }));
  };
  const handleSubCategoryChange = (e) => {
    markDirty("General");
    setFormData((p) => ({ ...p, serviceSubCategory: e.target.value, serviceSubSubCategory:"" }));
  };
  const handleRadioChange = (name, value) => { markDirty("General"); setFormData((p) => ({ ...p, [name]: value })); };
  const handlePricingChange = (i, field, value) => {
    markDirty("Pricing");
    setFormData((p) => ({ ...p, pricingData: p.pricingData.map((it, idx) => idx === i ? { ...it, [field]: value } : it) }));
  };
  const handlePricingCheckboxChange = (i, field) => {
    markDirty("Pricing");
    setFormData((p) => ({ ...p, pricingData: p.pricingData.map((it, idx) => idx === i ? { ...it, [field]: !it[field] } : it) }));
  };

  // Membership program active? Member Price/Discount entry is allowed only then (FRD 4.3 rule 1).
  const [membershipActive, setMembershipActive] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/Membership/Program`, { headers:{ Authorization:`Bearer ${TOKEN()}` } });
        const j = await r.json(); const d = j.data || j;
        setMembershipActive(!!d.activate);
      } catch { setMembershipActive(false); }
    })();
  }, []);

  // Member Price <-> Member Discount are mutually exclusive (FRD 4.3 rules 2-4).
  const handleMemberChange = (i, field, value) => {
    markDirty("Pricing");
    const other = field === "memberPrice" ? "memberDiscount" : "memberPrice";
    setFormData((p) => ({ ...p, pricingData: p.pricingData.map((it, idx) =>
      idx === i ? { ...it, [field]: value, [other]: value !== "" ? "" : it[other] } : it) }));
  };
  const handlePractitionerMappingChange = (field, value) => {
    markDirty("Practitioner Mapping");
    setPractitionerMapping((p) => ({ ...p, [field]: value }));
  };
  const handleDoctorMappingSelection = (id) => {
    markDirty("Practitioner Mapping");
    setDoctorMappings((p) => p.map((m) => m.id === id ? { ...m, selected: !m.selected } : m));
  };
  const handleNurseMappingSelection = (id) => {
    markDirty("Practitioner Mapping");
    setNurseMappings((p) => p.map((m) => m.id === id ? { ...m, selected: !m.selected } : m));
  };
  const handleFormSelection = (id) => {
    markDirty("Forms");
    setFormsData((p) => p.map((f) => f.id === id ? { ...f, selected: !f.selected } : f));
  };
  const handleMiscellaneousDataChange = (field, value) => {
    markDirty("Miscellaneous", "Forms");
    setMiscellaneousData((p) => ({ ...p, [field]: value }));
  };

  // ── Add practitioner ──────────────────────────────────────────────────────────
  const addPractitioner = (side) => {
    const isDoctor = side === "doctor";
    const practStr = isDoctor ? practitionerMapping.doctor : practitionerMapping.nurses;
    const center   = isDoctor ? practitionerMapping.leftClinic : practitionerMapping.rightClinic;
    if (!center || !practStr) return;
    const [practCode, practName] = (practStr || "").split("|");
    const clinicName = clinics.find((c) => c.code === center)?.name || center;
    if (isDoctor) {
      if (doctorMappings.some((m) => m.doctorCode === practCode && m.clinicCode === center)) {
        showToast("Doctor already mapped to this clinic.", "error"); return;
      }
      markDirty("Practitioner Mapping");
      setDoctorMappings((p) => [...p, { id:Date.now(), doctorCode:practCode, doctorName:practName, clinicCode:center, clinicName, selected:false }]);
      setPractitionerMapping((p) => ({ ...p, doctor:"" }));
    } else {
      if (nurseMappings.some((m) => m.nurseCode === practCode && m.clinicCode === center)) {
        showToast("Nurse already mapped to this clinic.", "error"); return;
      }
      markDirty("Practitioner Mapping");
      setNurseMappings((p) => [...p, { id:Date.now(), nurseCode:practCode, nurseName:practName, clinicCode:center, clinicName, selected:false }]);
      setPractitionerMapping((p) => ({ ...p, nurses:"" }));
    }
  };

  // ── BOM ───────────────────────────────────────────────────────────────────────
  const handleSearchConsumables = async () => {
    try {
      setConsumableErr(""); setConsumableLoad(true);
      const data = await fetchGET(`${API_BASE_URL}/api/Master/Service/SearchConsumables?SearchValue=${encodeURIComponent(searchConsumables || "")}`);
      const rows = toArray(data);
      const normalized = rows.length && rows[0]?.code === "0" ? rows : [{ name:"Select one", code:"0" }, ...rows];
      setConsumableOpts(normalized);
      if (!normalized.some((o) => o.code === selectedConsumable)) setSelectedConsumable("");
    } catch { setConsumableErr("Failed to search consumables."); setConsumableOpts([{ name:"Select one", code:"0" }]); }
    finally { setConsumableLoad(false); }
  };

  const handleAddConsumable = () => {
    if (!selectedConsumable || selectedConsumable === "0") { showToast("Please select a consumable", "error"); return; }
    markDirty("BOM");
    const picked = consumableOpts.find((o) => o.code === selectedConsumable);
    if (bomItems.some((b) => b.code === selectedConsumable)) { showToast("Already in BOM.", "error"); return; }
    setBomItems((p) => [...p, { id:Date.now(), code:selectedConsumable, name:picked?.name || selectedConsumable, qty:"1.00", uom:"", selected:false }]);
    setSelectedConsumable("");
  };
  const handleBOMItemSelection = (id) => {
    markDirty("BOM");
    setBomItems((p) => p.map((it) => it.id === id ? { ...it, selected: !it.selected } : it));
  };

  // ── Forms ─────────────────────────────────────────────────────────────────────
  const handleAddForm = () => {
    if (!newForm.form) { showToast("Please enter a form name", "error"); return; }
    markDirty("Forms");
    setFormsData((p) => [...p, { ...newForm, id:Date.now(), selected:false }]);
    setNewForm({ stageForFormCompletion:"form-not-required", blockFromProceeding:"Yes", form:"" });
  };
  const handleRemoveForms = () => { markDirty("Forms"); setFormsData((p) => p.filter((f) => !f.selected)); };

  // ── Validation ────────────────────────────────────────────────────────────────
  const validateGeneral = () => {
    const errs = [];
    if (!formData.serviceCode?.trim())        errs.push("Service Code");
    if (!formData.serviceName?.trim())        errs.push("Service Name");
    if (!formData.serviceSubCategory?.trim()) errs.push("Sub Category");
    if (!formData.serviceTime?.trim() || formData.serviceTime === " ") errs.push("Service Time");
    if (!formData.allowIdealBOMConsumption)   errs.push("Allow Ideal BOM Consumption");
    if (!formData.allowBOMConsumptionWithIntervention) errs.push("Allow BOM with Intervention");
    return errs;
  };

  // ── Payloads ──────────────────────────────────────────────────────────────────
  const buildGeneralPayload = (isDraft) => {
    const selectedSS = subSubCategories.find((s) => s.subSubCategoryCode === formData.serviceSubSubCategory);
    return {
      serviceCode:     formData.serviceCode,
      serviceName:     formData.serviceName,
      serviceArabicName: formData.arabicServiceName || "",
      serviceDesc:     formData.serviceDescription  || "",
      serviceCategoryCode:       formData.serviceCategory    || "",
      serviceSubCategoryCode:    formData.serviceSubCategory || "",
      serviceSubSubCategoryCode: selectedSS?.subSubCategoryCodeRaw ?? "",
      serviceTime:     formData.serviceTime || "",
      allowIdealBOMConsumption:                 formData.allowIdealBOMConsumption || "No",
      allowIdealBOMConsumptionWithIntervention: formData.allowBOMConsumptionWithIntervention || "No",
      allowLoyalityAccurul:    formData.allowLoyaltyAccrual    || "No",
      allowLoyalityRedemption: formData.allowLoyaltyRedemption || "No",
      addToQuickCart: formData.addToQuickCart || "No",
      additionalField1: formData.additionalField1 || "",
      additionalField2: formData.additionalField2 || "",
      additionalField3: formData.additionalField3 || "",
      additionalField4: formData.additionalField4 || "",
      additionalField5: formData.additionalField5 || "",
      isDraft: isDraft ? 1 : 0,
      isEdit:  localMode === "edit",
    };
  };

  const buildPricingPayload = (isDraft = 0) => ({
    serviceCode: formData.serviceCode || "",
    priceLines: formData.pricingData.map((p) => ({
      serviceCode:   formData.serviceCode || "",
      centerCode:    p.centerCode         || "",
      price:         Number(p.price       || 0),
      taxIncluded:   String(p.taxIncluded || ""),
      taxPercentage: Number(p.taxPercent  || 0),
      serviceRecID:  0,
      storeRelease:  p.storeRelease ? "Yes" : "No",
      memberPrice:    p.memberPrice    === "" || p.memberPrice    == null ? null : Number(p.memberPrice),
      memberDiscount: p.memberDiscount === "" || p.memberDiscount == null ? null : Number(p.memberDiscount),
    })),
    isDraft,
  });

  const buildFormsPayload = (isDraft = 0) => ({
    serviceCode:            formData.serviceCode || "",
    formStageForCompletion: formsData[0]?.stageForFormCompletion || "",
    formBlockIfNotFilled:   formsData[0]?.blockFromProceeding    || "Yes",
    form:                   formsData[0]?.form                   || "",
    field1: miscellaneousData.optionalField1 || "",
    field2: miscellaneousData.optionalField2 || "",
    field3: miscellaneousData.optionalField3 || "",
    field4: miscellaneousData.optionalField4 || "",
    field5: miscellaneousData.optionalField5 || "",
    isDraft,
  });

  const buildPractitionerRows = () => [
    ...doctorMappings.map((d) => ({ serviceCode:formData.serviceCode, practionerType:"Doctor", clinicCode:d.clinicCode, doctorCode:d.doctorCode || "" })),
    ...nurseMappings.map((n)  => ({ serviceCode:formData.serviceCode, practionerType:"Nurse",  clinicCode:n.clinicCode, doctorCode:n.nurseCode  || "" })),
  ];

  // ── Save / Submit ─────────────────────────────────────────────────────────────
  const onSaveGeneral = async (asDraft = true) => {
    const missing = validateGeneral();
    if (missing.length) { showToast(`Please fill: ${missing.join(", ")}`, "error"); return; }
    try {
      await postJSON(URLS.general, buildGeneralPayload(asDraft));
      markSaved("General", asDraft ? "draft" : "saved");
      // Once saved at least once, flip to edit mode so re-submits use UPDATE not INSERT
      setLocalMode("edit");
      showToast(`General ${asDraft ? "saved as draft" : "submitted"}.`);
      if (!asDraft) {
        setTimeout(() => onBack(true), 1200); // true = trigger refresh in parent
      }
    } catch (e) { showToast(`Failed: ${e.message}`, "error"); }
  };

  const onSavePricing = async () => {
    try { await postJSON(URLS.pricing, buildPricingPayload(1)); markSaved("Pricing","draft"); showToast("Pricing saved as draft."); }
    catch (e) { showToast(`Failed: ${e.message}`, "error"); }
  };
  const onSubmitPricing = async () => {
    try { await postJSON(URLS.pricing, buildPricingPayload(0)); markSaved("Pricing","saved"); showToast("Pricing submitted."); }
    catch (e) { showToast(`Failed: ${e.message}`, "error"); }
  };

  const onSaveBOM = async () => {
    try {
      for (const b of bomItems) await postJSON(URLS.bom, { serviceCode:formData.serviceCode, productCode:b.code, isDraft:1 });
      markSaved("BOM","draft"); showToast("BOM saved as draft.");
    } catch (e) { showToast(`Failed: ${e.message}`, "error"); }
  };
  const onSubmitBOM = async () => {
    try {
      for (const b of bomItems) await postJSON(URLS.bom, { serviceCode:formData.serviceCode, productCode:b.code, isDraft:0 });
      markSaved("BOM","saved"); showToast("BOM submitted.");
    } catch (e) { showToast("Failed to submit BOM.", "error"); }
  };

  const onSavePractitioners = async () => {
    try {
      for (const row of buildPractitionerRows()) await postJSON(URLS.practitioner, row);
      markSaved("Practitioner Mapping","draft"); showToast("Practitioner mapping saved as draft.");
    } catch (e) { showToast(`Failed: ${e.message}`, "error"); }
  };
  const onSubmitPractitioners = async () => {
    try {
      for (const row of buildPractitionerRows()) await postJSON(URLS.practitioner, row);
      markSaved("Practitioner Mapping","saved"); showToast("Practitioner mapping submitted.");
    } catch (e) { showToast(`Failed: ${e.message}`, "error"); }
  };

  const onSaveForms = async () => {
    try { await postJSON(URLS.forms, buildFormsPayload(1)); markSaved("Forms","draft"); showToast("Forms saved as draft."); }
    catch (e) { showToast("Failed to save forms.", "error"); }
  };
  const onSubmitForms = async () => {
    try { await postJSON(URLS.forms, buildFormsPayload(0)); markSaved("Forms","saved"); markSaved("Miscellaneous", "Forms","saved"); showToast("Forms submitted."); }
    catch (e) { showToast(`Failed: ${e.message}`, "error"); }
  };
  const onSaveMisc           = () => { markSaved("Miscellaneous", "Forms","draft"); showToast("Miscellaneous saved locally."); };
  const onSubmitMiscViaForms = () => onSubmitForms();

  const timeOptions = [
    { value:" ", label:"< - Select one - >" },
    { value:"10", label:"10 mins"  }, { value:"20",  label:"20 mins"      },
    { value:"30", label:"30 mins"  }, { value:"40",  label:"40 mins"      },
    { value:"50", label:"50 mins"  }, { value:"60",   label:"1 hour"       },
    { value:"70",label:"1h 10m"   }, { value:"80", label:"1h 20m"       },
    { value:"90",label:"1h 30m"   }, { value:"100", label:"1h 40m"       },
    { value:"110",label:"1h 50m"   }, { value:"120",   label:"2 hours"      },
    { value:"130",label:"2h 10m"   }, { value:"140", label:"2h 20m"       },
  ];

  const badgeColor = { saved:"#d1fae5", draft:"#fef3c7", unsaved:"#f3f4f6" };
  const badgeText  = { saved:"#065f46", draft:"#92400e", unsaved:"#374151" };

  const PractitionerColumn = ({ side }) => {
    const isDoctor   = side === "doctor";
    const title      = isDoctor ? "Doctors" : "Nurses";
    const clinicKey  = isDoctor ? "leftClinic"  : "rightClinic";
    const practKey   = isDoctor ? "doctor"      : "nurses";
    const pList      = isDoctor ? leftPractitioners  : rightPractitioners;
    const pLoad      = isDoctor ? leftLoad  : rightLoad;
    const pErr       = isDoctor ? leftErr   : rightErr;
    const mappings   = isDoctor ? doctorMappings : nurseMappings;
    const nameKey    = isDoctor ? "doctorName" : "nurseName";
    const filter     = isDoctor ? docFilter : nurseFilter;
    const setFilter  = isDoctor ? setDocFilter : setNurseFilter;
    const handleSel  = isDoctor ? handleDoctorMappingSelection : handleNurseMappingSelection;
    const removeSelected = () => {
      markDirty("Practitioner Mapping");
      isDoctor ? setDoctorMappings((p) => p.filter((m) => !m.selected))
               : setNurseMappings((p)  => p.filter((m) => !m.selected));
    };

    return (
      <div style={{ flex:1 }}>
        <h3 style={{ fontSize:15, fontWeight:600, color:"#334B71", marginBottom:14, borderBottom:"1px solid #e5e7eb", paddingBottom:8 }}>
          {title}
        </h3>

        {/* Clinic select */}
        <div style={s.row}>
          <label style={{ ...s.lbl, minWidth:70 }}>Clinic</label>
          <select style={s.sel} value={practitionerMapping[clinicKey]}
            onChange={(e) => handlePractitionerMappingChange(clinicKey, e.target.value)}>
            <option value="">{clinicLoading ? "Loading…" : "Select clinic"}</option>
            {clinics.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>

        {/* Practitioner select */}
        <div style={s.row}>
          <label style={{ ...s.lbl, minWidth:70 }}>{isDoctor ? "Doctor" : "Nurse"}</label>
          <div style={{ display:"flex", gap:8, flex:1 }}>
            <select style={{ ...s.sel, flex:1 }} value={practitionerMapping[practKey]}
              onChange={(e) => handlePractitionerMappingChange(practKey, e.target.value)}
              disabled={!practitionerMapping[clinicKey]}>
              <option value="">{pLoad ? "Loading…" : "< - Select one - >"}</option>
              {pList.map((p) => <option key={p.id} value={`${p.id}|${p.name}`}>{p.name}</option>)}
            </select>
            <button style={s.btnPrimary}
              disabled={!practitionerMapping[clinicKey] || !practitionerMapping[practKey]}
              onClick={() => addPractitioner(side)}>
              + Add
            </button>
          </div>
        </div>
        {pErr && <div style={{ color:"crimson", fontSize:12, marginBottom:8 }}>{pErr}</div>}

        {/* No practitioners hint */}
        {practitionerMapping[clinicKey] && !pLoad && pList.length === 0 && (
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, padding:"8px 12px", fontSize:12, color:"#92400e", marginBottom:10 }}>
            No practitioners found in CLINIC_DOCTORS for this clinic. Add them via Doctor Master first.
          </div>
        )}

        {/* Filter + remove */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"10px 0 6px" }}>
          <input style={{ ...s.inp, width:160, fontSize:12 }} placeholder="Filter..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:"#6b7280" }}>{mappings.length} item{mappings.length !== 1 ? "s" : ""}</span>
            {mappings.some((m) => m.selected) && (
              <button style={s.btnDanger} onClick={removeSelected}>Remove</button>
            )}
          </div>
        </div>

        {/* Mapping table */}
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.th} width={40}></th>
              <th style={s.th}>{isDoctor ? "Doctor" : "Nurse"}</th>
              <th style={s.th}>Clinic</th>
            </tr>
          </thead>
          <tbody>
            {mappings
              .filter((m) => !filter || (m[nameKey] + m.clinicName).toLowerCase().includes(filter.toLowerCase()))
              .map((m) => (
                <tr key={m.id} onMouseEnter={(e) => e.currentTarget.style.background="#f9fafb"}
                  onMouseLeave={(e) => e.currentTarget.style.background=""}>
                  <td style={s.td}>
                    <input type="checkbox" checked={m.selected} onChange={() => handleSel(m.id)} style={{ accentColor:"#334B71" }} />
                  </td>
                  <td style={s.td}>{m[nameKey]}</td>
                  <td style={s.td}>{m.clinicName}</td>
                </tr>
              ))}
            {mappings.length === 0 && (
              <tr><td colSpan={3} style={{ padding:20, textAlign:"center", color:"#9ca3af", fontStyle:"italic", fontSize:13 }}>
                No {isDoctor ? "doctors" : "nurses"} mapped yet.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .sf-tabs { display:flex; border-bottom:1px solid #e5e7eb; background:#f9fafb; align-items:center; justify-content:space-between; flex-wrap:wrap; }
        .sf-tab { padding:11px 15px; background:none; border:none; border-bottom:3px solid transparent; cursor:pointer; font-size:13px; font-weight:500; color:#6b7280; display:flex; align-items:center; gap:5px; white-space:nowrap; }
        .sf-tab:hover { background:#f3f4f6; color:#374151; }
        .sf-tab.active { color:#334B71; border-bottom-color:#334B71; background:#fff; }
        @media(max-width:768px) { .pract-cols{flex-direction:column !important;} }
      `}</style>

      <div style={{ padding:24, fontFamily:"Inter,sans-serif", maxWidth:1100, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:12, color:"#9ca3af", marginBottom:6 }}>
              <a href="/dashboard" style={{ color:"#334B71", textDecoration:"none" }}>Dashboard</a>
              <span style={{ margin:"0 6px" }}> › </span>
              <span style={{ cursor:"pointer", color:"#334B71" }} onClick={onBack}>Manage Service</span>
              <span style={{ margin:"0 6px" }}> › </span>
              <span>{mode === "edit" ? `Edit — ${formData.serviceName?.trim()}` : "Create New"}</span>
            </div>
            <h1 style={{ fontSize:22, fontWeight:600, color:"#111827", margin:0 }}>
              {mode === "edit" ? "Edit Service" : "Create Service"}
            </h1>
          </div>
          <button style={s.btnBack} onClick={handleBackSafe}>← Back To List</button>
        </div>

        <div style={s.noteBox}>
          <strong>Note:</strong> Each tab saves independently. Complete them in any order.
        </div>

        <div style={s.card}>
          {/* Service name + code shown above the tabs */}
          <div style={{ padding:"14px 20px", borderBottom:"1px solid #eef1f5", display:"flex", alignItems:"baseline", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:18, fontWeight:700, color:"#1e293b" }}>
              {formData.serviceName?.trim() || (mode === "edit" ? "Service" : "New Service")}
            </span>
            {formData.serviceCode?.trim() && (
              <span style={{ fontSize:12.5, fontWeight:700, color:"#334b71", background:"#eef2f8", padding:"3px 10px", borderRadius:999 }}>
                {formData.serviceCode}
              </span>
            )}
          </div>
          {/* Tabs */}
          <div className="sf-tabs">
            <div style={{ display:"flex", flexWrap:"wrap" }}>
              {tabs.map((tab) => (
                <button key={tab} className={`sf-tab ${activeTab === tab ? "active" : ""}`} onClick={() => { setActiveTab(tab); if (tab === "EMR Forms") loadEMRForms(); }}>
                  {dirty[tab] && <span style={{ color:"#f59e0b", fontSize:10 }}>●</span>}
                  {tab}
                </button>
              ))}
            </div>
            <div style={{ padding:"0 16px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <span style={{ fontSize:11, padding:"3px 10px", borderRadius:999, fontWeight:600,
                background:badgeColor[tabStatus[activeTab]], color:badgeText[tabStatus[activeTab]] }}>
                {tabStatus[activeTab]}
              </span>
              <label style={{ fontSize:13, fontWeight:500, color:"#495057" }}>Status:</label>
              <input style={{ ...s.inp, width:110 }} name="serviceStatus" value={formData.serviceStatus} onChange={handleInputChange} readOnly={mode==="create"} />
            </div>
          </div>

          <div style={{ padding:28 }}>

            {/* ── GENERAL ───────────────────────────────────────────────────── */}
            {activeTab === "General" && (
              <>
                <div style={s.section}>General Information</div>
                {[
                  { label:"Service Code", name:"serviceCode", req:true },
                  { label:"Service Name", name:"serviceName", req:true },
                  { label:"Arabic Name",  name:"arabicServiceName" },
                ].map(({ label, name, req }) => (
                  <div style={s.row} key={name}>
                    <label style={s.lbl}>{label} {req && <span style={{ color:"crimson" }}>*</span>}</label>
                    <div style={s.inp_wrap}><input style={s.inp} name={name} value={formData[name]} onChange={handleInputChange} /></div>
                  </div>
                ))}
                <div style={s.row}>
                  <label style={s.lbl}>Description</label>
                  <div style={s.inp_wrap}><textarea style={{ ...s.inp, height:70, resize:"vertical" }} name="serviceDescription" value={formData.serviceDescription} onChange={handleInputChange} /></div>
                </div>

                <div style={s.row}>
                  <label style={s.lbl}>Category</label>
                  <div style={s.inp_wrap}>
                    <select style={s.sel} name="serviceCategory" value={formData.serviceCategory} onChange={handleCategoryChange}>
                      <option value="">{catLoading ? "Loading..." : "Select Category"}</option>
                      {categories.map((c) => <option key={c.categoryCode} value={c.categoryCode}>{c.categoryName}</option>)}
                    </select>
                    {catError && <div style={{ color:"crimson", fontSize:12, marginTop:4 }}>{catError}</div>}
                  </div>
                </div>
                <div style={s.row}>
                  <label style={s.lbl}>Sub Category <span style={{ color:"crimson" }}>*</span></label>
                  <div style={s.inp_wrap}>
                    <select style={s.sel} name="serviceSubCategory" value={formData.serviceSubCategory} onChange={handleSubCategoryChange} disabled={!formData.serviceCategory}>
                      <option value="">{subLoading ? "Loading..." : "< - Select one - >"}</option>
                      {subCategories.map((s) => <option key={s.subCategoryCode} value={s.subCategoryCode}>{s.subCategoryName}</option>)}
                    </select>
                    {subError && <div style={{ color:"crimson", fontSize:12, marginTop:4 }}>{subError}</div>}
                  </div>
                </div>
                <div style={s.row}>
                  <label style={s.lbl}>Sub Sub Category</label>
                  <div style={s.inp_wrap}>
                    <select style={s.sel} name="serviceSubSubCategory" value={formData.serviceSubSubCategory} onChange={handleInputChange} disabled={!formData.serviceSubCategory}>
                      <option value="">{ssLoading ? "Loading..." : "< - Select one - >"}</option>
                      {subSubCategories.map((x) => <option key={x.subSubCategoryCode} value={x.subSubCategoryCode}>{x.subSubCategoryName}</option>)}
                    </select>
                    {ssError && <div style={{ color:"crimson", fontSize:12, marginTop:4 }}>{ssError}</div>}
                  </div>
                </div>
                <div style={s.row}>
                  <label style={s.lbl}>Service Time <span style={{ color:"crimson" }}>*</span></label>
                  <div style={s.inp_wrap}>
                    <select style={s.sel} name="serviceTime" value={formData.serviceTime} onChange={handleInputChange}>
                      {timeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {[
                  { label:"Allow Ideal BOM Consumption",       key:"allowIdealBOMConsumption",              req:true },
                  { label:"Allow BOM with Intervention",        key:"allowBOMConsumptionWithIntervention",   req:true },
                  { label:"Allow Loyalty Accrual",             key:"allowLoyaltyAccrual" },
                  { label:"Allow Loyalty Redemption",          key:"allowLoyaltyRedemption" },
                  { label:"Add to Quick Cart",                 key:"addToQuickCart" },
                ].map(({ label, key, req }) => (
                  <div style={s.row} key={key}>
                    <label style={s.lbl}>{label} {req && <span style={{ color:"crimson" }}>*</span>}</label>
                    <div style={s.inp_wrap}>
                      <div style={{ display:"flex", gap:20, paddingTop:10 }}>
                        {["Yes","No"].map((v) => (
                          <label key={v} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:14 }}>
                            <input type="radio" value={v} checked={formData[key] === v} onChange={() => handleRadioChange(key, v)} style={{ accentColor:"#334B71" }} /> {v}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <div style={s.section}>Additional Fields</div>
                {[1,2,3,4,5].map((n) => (
                  <div style={s.row} key={n}>
                    <label style={s.lbl}>Additional Field {n}</label>
                    <div style={s.inp_wrap}><input style={s.inp} name={`additionalField${n}`} value={formData[`additionalField${n}`]} onChange={handleInputChange} /></div>
                  </div>
                ))}

                <div style={s.actions}>
                  <button style={s.btnPrimary}   onClick={() => onSaveGeneral(true)}>Save as Draft</button>
                  <button style={s.btnSecondary} onClick={() => onSaveGeneral(false)}>Submit General</button>
                </div>
              </>
            )}

            {/* ── PRICING ───────────────────────────────────────────────────── */}
            {activeTab === "Pricing" && (
              <>
                <div style={s.section}>Pricing per Clinic</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={s.tbl}>
                    <thead>
                      <tr>
                        <th style={s.th}>Center</th><th style={s.th}>Price</th>
                        <th style={s.th}>Tax Included</th><th style={s.th}>Tax %</th><th style={s.th}>Release to Centre</th>
                        <th style={s.th}>Member Price</th><th style={s.th}>Member Discount %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.pricingData.map((p, i) => (
                        <tr key={i}>
                          <td style={{ ...s.td, fontWeight:500 }}>{p.centerName || p.centerCode}</td>
                          <td style={s.td}><input type="number" style={{ ...s.inp, width:90, textAlign:"center" }} value={p.price} min="0" step="0.01" onChange={(e) => handlePricingChange(i,"price",e.target.value)} /></td>
                          <td style={s.td}>
                            <select style={{ ...s.sel, width:90 }} value={p.taxIncluded} onChange={(e) => handlePricingChange(i,"taxIncluded",e.target.value)}>
                              <option value="">Select</option><option>Yes</option><option>No</option>
                            </select>
                          </td>
                          <td style={s.td}><input type="number" style={{ ...s.inp, width:80, textAlign:"center", background: p.taxIncluded==="Yes" ? "#f1f5f9" : "#fff" }} value={p.taxPercent} min="0" max="100" step="0.01" disabled={p.taxIncluded==="Yes"} onChange={(e) => handlePricingChange(i,"taxPercent",e.target.value)} /></td>
                          <td style={{ ...s.td, textAlign:"center" }}><input type="checkbox" checked={!!p.storeRelease} onChange={() => handlePricingCheckboxChange(i,"storeRelease")} style={{ width:16, height:16, accentColor:"#334B71" }} /></td>
                          {(() => {
                            const enabled = membershipActive && !!p.storeRelease;
                            const hasMp = p.memberPrice !== "" && p.memberPrice != null;
                            const hasMd = p.memberDiscount !== "" && p.memberDiscount != null;
                            return (<>
                              <td style={s.td}><input type="number" style={{ ...s.inp, width:90, textAlign:"center", background:(!enabled||hasMd)?"#f1f5f9":"#fff" }} value={hasMd?"NA":(p.memberPrice||"")} min="0" step="0.01" disabled={!enabled||hasMd} placeholder={enabled?"":"—"} onChange={(e) => handleMemberChange(i,"memberPrice",e.target.value)} /></td>
                              <td style={s.td}><input type="number" style={{ ...s.inp, width:90, textAlign:"center", background:(!enabled||hasMp)?"#f1f5f9":"#fff" }} value={hasMp?"NA":(p.memberDiscount||"")} min="0" max="100" step="0.01" disabled={!enabled||hasMp} placeholder={enabled?"":"—"} onChange={(e) => handleMemberChange(i,"memberDiscount",e.target.value)} /></td>
                            </>);
                          })()}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={s.actions}>
                  <button style={s.btnPrimary}   onClick={onSavePricing}>Save as Draft</button>
                  <button style={s.btnSecondary} onClick={onSubmitPricing}>Submit Pricing</button>
                </div>
              </>
            )}

            {/* ── BOM ───────────────────────────────────────────────────────── */}
            {activeTab === "BOM" && (
              <>
                <div style={s.section}>Bill of Materials</div>
                <div style={s.row}>
                  <label style={s.lbl}>Search Consumables</label>
                  <div style={{ ...s.inp_wrap, display:"flex", gap:8 }}>
                    <input style={{ ...s.inp, flex:1 }} value={searchConsumables} onChange={(e) => setSearchConsumables(e.target.value)} placeholder="Type keyword..." />
                    <button style={s.btnSecondary} onClick={handleSearchConsumables} disabled={consumableLoad}>{consumableLoad ? "..." : "🔍 Search"}</button>
                  </div>
                </div>
                {consumableErr && <div style={{ color:"crimson", marginBottom:12, fontSize:13 }}>{consumableErr}</div>}
                <div style={s.row}>
                  <label style={s.lbl}>Select Consumable</label>
                  <div style={{ ...s.inp_wrap, display:"flex", gap:8 }}>
                    <select style={{ ...s.sel, flex:1 }} value={selectedConsumable} onChange={(e) => setSelectedConsumable(e.target.value)}>
                      {consumableOpts.map((o, i) => <option key={i} value={o.code}>{o.name}{o.code && o.code!=="0" ? ` (${o.code})` : ""}</option>)}
                    </select>
                    <button style={s.btnPrimary} onClick={handleAddConsumable}>+ Add</button>
                  </div>
                </div>

                <div style={s.section}>Ideal BOM Items</div>
                <table style={s.tbl}>
                  <thead><tr><th style={s.th} width={50}></th><th style={s.th}>Code</th><th style={s.th}>Name</th><th style={s.th}>Qty</th><th style={s.th}>UOM</th></tr></thead>
                  <tbody>
                    {bomItems.map((it) => (
                      <tr key={it.id}>
                        <td style={s.td}><input type="checkbox" checked={it.selected} onChange={() => handleBOMItemSelection(it.id)} style={{ accentColor:"#334B71" }} /></td>
                        <td style={s.td}>{it.code}</td><td style={s.td}>{it.name}</td><td style={s.td}>{it.qty}</td><td style={s.td}>{it.uom}</td>
                      </tr>
                    ))}
                    {bomItems.length === 0 && <tr><td colSpan={5} style={{ padding:24, textAlign:"center", color:"#9ca3af", fontStyle:"italic" }}>No consumables added yet.</td></tr>}
                  </tbody>
                </table>
                {bomItems.some((b) => b.selected) && (
                  <button style={{ ...s.btnDanger, marginTop:10 }} onClick={() => { markDirty("BOM"); setBomItems((p) => p.filter((b) => !b.selected)); }}>Remove Selected</button>
                )}
                <div style={s.actions}>
                  <button style={s.btnPrimary}   onClick={onSaveBOM}>Save as Draft</button>
                  <button style={s.btnSecondary} onClick={onSubmitBOM}>Submit BOM</button>
                </div>
              </>
            )}

            {/* ── PRACTITIONER MAPPING ──────────────────────────────────────── */}
            {activeTab === "Practitioner Mapping" && (
              <>
                <div style={s.section}>Practitioner Mapping</div>
                {clinicError && <div style={{ color:"crimson", marginBottom:12, fontSize:13 }}>{clinicError}</div>}
                <div style={{ display:"flex", gap:40 }} className="pract-cols">
                  <PractitionerColumn side="doctor" />
                  <PractitionerColumn side="nurse"  />
                </div>
                <div style={s.actions}>
                  <button style={s.btnPrimary}   onClick={onSavePractitioners}>Save as Draft</button>
                  <button style={s.btnSecondary} onClick={onSubmitPractitioners}>Submit Practitioner Mapping</button>
                </div>
              </>
            )}

            {/* ── FORMS ─────────────────────────────────────────────────────── */}
            {/* Forms tab removed — use EMR Forms tab for form mapping */}

            {/* ── MISCELLANEOUS ─────────────────────────────────────────────── */}

            {activeTab === "EMR Forms" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:"#071D49" }}>📋 EMR Forms</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                    Map consent/treatment forms to this service. Max 11 forms.
                  </div>
                </div>
                <button onClick={addEMRForm}
                  style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:8,
                    padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  + Add Form
                </button>
              </div>

              {emrForms.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8",
                  border:"2px dashed #e7ecf4", borderRadius:10 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#334b71", marginBottom:4 }}>No forms mapped</div>
                  <div style={{ fontSize:12 }}>Click "+ Add Form" to link a consent or treatment form.</div>
                </div>
              ) : (
                emrForms.map((f, idx) => (
                  <div key={idx} style={{ border:"1px solid #e7ecf4", borderRadius:10, padding:14,
                    marginBottom:10, display:"grid",
                    gridTemplateColumns:"2fr 1fr auto auto", gap:10, alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>FORM</div>
                      <select value={f.formCode}
                        onChange={e => updateEMRForm(idx, "formCode", e.target.value)}
                        style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8,
                          padding:"8px 10px", fontSize:12, outline:"none" }}>
                        <option value="">Select form…</option>
                        {activeForms.map(a => (
                          <option key={a.formCode} value={a.formCode}>{a.formName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>WHEN TO FILL</div>
                      <select value={f.whenToFill}
                        onChange={e => updateEMRForm(idx, "whenToFill", e.target.value)}
                        style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8,
                          padding:"8px 10px", fontSize:12, outline:"none" }}>
                        <option value="Before Service Starts">Before Service Starts</option>
                        <option value="After Service Starts">After Service Starts</option>
                      </select>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>MANDATORY</div>
                      <div style={{ width:40, height:22, borderRadius:22,
                        background:f.isMandatory?"#334b71":"#d3dbe8",
                        position:"relative", cursor:"pointer" }}
                        onClick={() => updateEMRForm(idx, "isMandatory", !f.isMandatory)}>
                        <div style={{ width:16, height:16, background:"#fff", borderRadius:"50%",
                          position:"absolute", top:3, left:f.isMandatory?21:3,
                          transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.25)" }} />
                      </div>
                    </div>
                    <button onClick={() => removeEMRForm(idx)}
                      style={{ background:"none", border:"none", cursor:"pointer",
                        color:"#b91c1c", fontSize:20, padding:"0 4px" }}>×</button>
                  </div>
                ))
              )}

              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
                <button onClick={handleSaveEMRForms}
                  style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:8,
                    padding:"10px 20px", fontWeight:800, fontSize:13, cursor:"pointer" }}>
                   Save Forms
                </button>
              </div>
            </div>
            )}

            {activeTab === "Miscellaneous" && (
              <>
                <div style={s.section}>Optional Fields</div>
                <div style={{ display:"flex", gap:40 }}>
                  <div style={{ flex:1 }}>
                    {[1,2,3].map((n) => (
                      <div style={s.row} key={n}>
                        <label style={s.lbl}>Optional Field {n}</label>
                        <div style={s.inp_wrap}><input style={s.inp} value={miscellaneousData[`optionalField${n}`]} onChange={(e) => handleMiscellaneousDataChange(`optionalField${n}`, e.target.value)} /></div>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex:1 }}>
                    {[4,5].map((n) => (
                      <div style={s.row} key={n}>
                        <label style={s.lbl}>Optional Field {n}</label>
                        <div style={s.inp_wrap}><input style={s.inp} value={miscellaneousData[`optionalField${n}`]} onChange={(e) => handleMiscellaneousDataChange(`optionalField${n}`, e.target.value)} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={s.noteBox}>
                  <strong>Note:</strong> These fields are submitted together with the Forms tab.
                </div>
                <div style={s.actions}>
                  <button style={s.btnPrimary}   onClick={onSaveMisc}>Save Locally</button>
                  <button style={s.btnSecondary} onClick={onSubmitMiscViaForms}>Submit via Forms</button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </>
  );
};

const s = {
  card:        { background:"#fff", borderRadius:10, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", overflow:"hidden" },
  noteBox:     { background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#1e40af", marginBottom:16 },
  section:     { fontSize:12, fontWeight:700, color:"#334B71", textTransform:"uppercase", letterSpacing:".05em", borderBottom:"2px solid #334B71", paddingBottom:6, marginBottom:18, marginTop:20 },
  row:         { display:"flex", alignItems:"flex-start", marginBottom:18 },
  lbl:         { minWidth:220, fontWeight:500, color:"#495057", fontSize:14, paddingTop:10 },
  inp_wrap:    { flex:1, maxWidth:420 },
  inp:         { width:"100%", padding:"9px 12px", border:"1px solid #ced4da", borderRadius:6, fontSize:14, background:"#fff", boxSizing:"border-box", outline:"none" },
  sel:         { width:"100%", padding:"9px 12px", border:"1px solid #ced4da", borderRadius:6, fontSize:14, background:"#fff", boxSizing:"border-box", outline:"none" },
  tbl:         { width:"100%", borderCollapse:"collapse", border:"1px solid #e5e7eb", borderRadius:8, overflow:"hidden" },
  th:          { background:"#f9fafb", padding:"10px 14px", textAlign:"left", fontSize:12, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", borderBottom:"1px solid #e5e7eb" },
  td:          { padding:"10px 14px", borderBottom:"1px solid #f3f4f6", fontSize:13, color:"#374151" },
  actions:     { display:"flex", gap:10, marginTop:20, paddingTop:16, borderTop:"1px solid #e5e7eb" },
  btnPrimary:  { padding:"9px 20px", background:"#334B71", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:14, fontWeight:600 },
  btnSecondary:{ padding:"9px 20px", background:"#343a40", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:14, fontWeight:600 },
  btnDanger:   { padding:"6px 14px", background:"#fee2e2", color:"#991b1b", border:"1px solid #fca5a5", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:500 },
  btnBack:     { padding:"8px 18px", background:"#334B71", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:14 },
};

export default ServiceForm;