"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token");

// ── Auth fetch helpers ────────────────────────────────────────────────────────
const fetchGET = async (url) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json().catch(() => ({}));
  return json.data ?? json;
};

const postJSON = async (url, body) => {
  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const json = await res.json().catch(() => ({}));
  return json.data ?? json;
};

// ── Endpoints ─────────────────────────────────────────────────────────────────
const URLS = {
  general:      `${API_BASE_URL}/api/Master/InsertServiceGeneral`,
  pricing:      `${API_BASE_URL}/api/Master/InsertServicePrice`,
  bom:          `${API_BASE_URL}/api/Master/InsertServiceBOM`,
  practitioner: `${API_BASE_URL}/api/Master/InsertServicePractioner`,
  forms:        `${API_BASE_URL}/api/Master/InsertServiceForms`,
  formsNamesAPI:`${API_BASE_URL}/api/form/names`,
};

// ── Simple Toast ──────────────────────────────────────────────────────────────
const Toast = ({ type, message, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success" ? { background:"#ecfdf5", color:"#065f46", border:"1px solid #6ee7b7" }
           : type === "error"   ? { background:"#fef2f2", color:"#991b1b", border:"1px solid #fca5a5" }
           :                      { background:"#fffbeb", color:"#92400e", border:"1px solid #fde68a" };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, padding:"10px 18px", borderRadius:10,
      fontSize:13, fontWeight:600, zIndex:9999, boxShadow:"0 4px 14px rgba(0,0,0,0.12)", ...bg }}>
      {message}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const ServiceForm = ({ service = null, onBack, mode = "create" }) => {
  const [activeTab, setActiveTab] = useState("General");
  const tabs = ["General","Pricing","BOM","Practitioner Mapping","Forms","Miscellaneous"];

  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => setToast({ message, type });

  const [tabStatus, setTabStatus] = useState({
    General:"unsaved", Pricing:"unsaved", BOM:"unsaved",
    "Practitioner Mapping":"unsaved", Forms:"unsaved", Miscellaneous:"unsaved",
  });
  const [dirty, setDirty] = useState({
    General:false, Pricing:false, BOM:false,
    "Practitioner Mapping":false, Forms:false, Miscellaneous:false,
  });
  const markDirty = (tab) => setDirty((d) => d[tab] ? d : { ...d, [tab]: true });
  const markSaved = (tab, state = "saved") => {
    setDirty((d)  => ({ ...d, [tab]: false }));
    setTabStatus((s) => ({ ...s, [tab]: state }));
  };

  const toArray = (d) => (Array.isArray(d) ? d : d ? [d] : []);

  // ── Form data ───────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    serviceCode:     service?.code        || "",
    serviceName:     service?.name        || "",
    arabicServiceName: service?.arabicName || "",
    serviceDescription: service?.description || "",
    serviceCategory:    service?.category    || "",
    serviceSubCategory: service?.subcategory || "",
    serviceSubSubCategory: service?.subSubcategory || "",
    serviceTime:     service?.time        || " ",
    allowIdealBOMConsumption: service?.allowIdealBOM || "No",
    allowBOMConsumptionWithIntervention: service?.allowBOMIntervention || "No",
    allowLoyaltyAccrual:     service?.allowLoyaltyAccrual    || "No",
    allowLoyaltyRedemption:  service?.allowLoyaltyRedemption || "No",
    additionalField1: service?.additionalField1 || "",
    additionalField2: service?.additionalField2 || "",
    additionalField3: service?.additionalField3 || "",
    additionalField4: service?.additionalField4 || "",
    additionalField5: service?.additionalField5 || "",
    serviceStatus:   service?.status || "Active",
    pricingData: service?.pricingData || [
      { centerCode:"Bright",  centerName:"Bright Clinics",  price:"0", taxIncluded:"", taxPercent:"0", storeRelease:false },
      { centerCode:"LNS",     centerName:"Lines Clinics",   price:"0", taxIncluded:"", taxPercent:"0", storeRelease:false },
      { centerCode:"MXM",     centerName:"Maxime Clinics",  price:"0", taxIncluded:"", taxPercent:"0", storeRelease:false },
      { centerCode:"INFENI",  centerName:"Infeni Clinic",   price:"0", taxIncluded:"", taxPercent:"0", storeRelease:false },
      { centerCode:"Silk",    centerName:"Silk Clinic",     price:"0", taxIncluded:"", taxPercent:"0", storeRelease:false },
    ],
  });

  const [doctorMappings, setDoctorMappings] = useState(service?.doctorMappings || []);
  const [nurseMappings,  setNurseMappings]  = useState(service?.nurseMappings  || []);
  const [practitionerMapping, setPractitionerMapping] = useState({ leftClinic:"", doctor:"", rightClinic:"", nurses:"" });

  const [formsData, setFormsData] = useState(
    Array.isArray(service?.formsData)
      ? service.formsData.map((f,i) => ({ ...f, id:Date.now()+i, selected:false }))
      : service?.formsData
        ? [{ ...service.formsData, id:Date.now(), selected:false }]
        : [{ stageForFormCompletion:"form-not-required", blockFromProceeding:"Yes", form:"", id:Date.now(), selected:false }]
  );
  const [newForm, setNewForm] = useState({ stageForFormCompletion:"form-not-required", blockFromProceeding:"Yes", form:"" });

  const [miscellaneousData, setMiscellaneousData] = useState({
    optionalField1: service?.miscellaneousData?.optionalField1 || "",
    optionalField2: service?.miscellaneousData?.optionalField2 || "",
    optionalField3: service?.miscellaneousData?.optionalField3 || "",
    optionalField4: service?.miscellaneousData?.optionalField4 || "",
    optionalField5: service?.miscellaneousData?.optionalField5 || "",
  });

  // ── BOM ─────────────────────────────────────────────────────────────────────
  const [searchConsumables, setSearchConsumables] = useState("s");
  const [selectedConsumable, setSelectedConsumable] = useState("");
  const [consumableOpts, setConsumableOpts]         = useState([{ name:"Select one", code:"0" }]);
  const [consumableLoad, setConsumableLoad]         = useState(false);
  const [consumableErr, setConsumableErr]           = useState("");
  const [bomItems, setBomItems] = useState(Array.isArray(service?.bomItems) ? service.bomItems : []);

  // ── Categories ───────────────────────────────────────────────────────────────
  const [categories,     setCategories]     = useState([]);
  const [subCategories,  setSubCategories]  = useState([]);
  const [subSubCategories, setSubSubCategories] = useState([]);
  const [catLoading, setCatLoading]   = useState(false);
  const [subLoading, setSubLoading]   = useState(false);
  const [ssLoading,  setSsLoading]    = useState(false);
  const [catError,   setCatError]     = useState("");
  const [subError,   setSubError]     = useState("");
  const [ssError,    setSsError]      = useState("");

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

  // ── Clinics + Practitioners ──────────────────────────────────────────────────
  const [clinics,     setClinics]     = useState([]);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [clinicError,   setClinicError]   = useState("");
  const [leftPractitioners,  setLeftPractitioners]  = useState([]);
  const [rightPractitioners, setRightPractitioners] = useState([]);
  const [leftLoad,  setLeftLoad]  = useState(false);
  const [rightLoad, setRightLoad] = useState(false);
  const [leftErr,   setLeftErr]   = useState("");
  const [rightErr,  setRightErr]  = useState("");
  const [docFilter,   setDocFilter]   = useState("");
  const [nurseFilter, setNurseFilter] = useState("");
  const [formnames,   setFormnames]   = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setClinicLoading(true); setClinicError("");
        const data = await fetchGET(`${API_BASE_URL}/api/master/LoadCenters`);
        setClinics(toArray(data).map((x) => ({ code: x.code ?? "", name: x.name ?? "" })).filter((c) => c.code && c.name));
      } catch { setClinicError("Failed to load clinics"); }
      finally { setClinicLoading(false); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchGET(URLS.formsNamesAPI);
        setFormnames(Array.isArray(data) ? data : []);
      } catch { console.error("Failed to load form names"); }
    })();
  }, []);

  useEffect(() => {
    const center = practitionerMapping.leftClinic;
    if (!center) { setLeftPractitioners([]); setLeftErr(""); return; }
    let cancel = false;
    (async () => {
      try {
        setLeftLoad(true); setLeftErr("");
        const data = await fetchGET(`${API_BASE_URL}/api/Master/LoadAllPractioner/${encodeURIComponent(center)}`);
        if (cancel) return;
        setLeftPractitioners(toArray(data).map((x) => ({ id: x.id ?? "", name: x.name ?? "" })).filter((p) => p.id && p.name));
      } catch { setLeftErr("Failed to load practitioners"); }
      finally { setLeftLoad(false); }
    })();
    return () => { cancel = true; };
  }, [practitionerMapping.leftClinic]);

  useEffect(() => {
    const center = practitionerMapping.rightClinic;
    if (!center) { setRightPractitioners([]); setRightErr(""); return; }
    let cancel = false;
    (async () => {
      try {
        setRightLoad(true); setRightErr("");
        const data = await fetchGET(`${API_BASE_URL}/api/Master/LoadAllPractioner/${encodeURIComponent(center)}`);
        if (cancel) return;
        setRightPractitioners(toArray(data).map((x) => ({ id: x.id ?? "", name: x.name ?? "" })).filter((p) => p.id && p.name));
      } catch { setRightErr("Failed to load practitioners"); }
      finally { setRightLoad(false); }
    })();
    return () => { cancel = true; };
  }, [practitionerMapping.rightClinic]);

  // Fetch existing forms for edit mode
  useEffect(() => {
    if (mode === "edit" && formData.serviceCode) {
      (async () => {
        try {
          const data = await fetchGET(`${API_BASE_URL}/api/serviceForm/all/${formData.serviceCode}`);
          if (data.forms && Array.isArray(data.forms)) {
            setFormsData(data.forms.map((f, i) => ({
              id: Date.now() + i, selected: false,
              form: f.formName, stageForFormCompletion: f.formStageForCompletion,
              blockFromProceeding: f.formBlockIfNotFilled, formId: f.formId,
            })));
          }
          if (data.misc) setMiscellaneousData({ ...data.misc });
        } catch { console.error("Failed to load forms data"); }
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
    setFormData((p) => ({ ...p, serviceCategory: e.target.value, serviceSubCategory: "", serviceSubSubCategory: "" }));
  };
  const handleSubCategoryChange = (e) => {
    markDirty("General");
    setFormData((p) => ({ ...p, serviceSubCategory: e.target.value, serviceSubSubCategory: "" }));
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
  const handlePractitionerMappingChange = (field, value) => { markDirty("Practitioner Mapping"); setPractitionerMapping((p) => ({ ...p, [field]: value })); };
  const handleDoctorMappingSelection    = (id) => { markDirty("Practitioner Mapping"); setDoctorMappings((p) => p.map((m) => m.id === id ? { ...m, selected: !m.selected } : m)); };
  const handleNurseMappingSelection     = (id) => { markDirty("Practitioner Mapping"); setNurseMappings((p)  => p.map((m) => m.id === id ? { ...m, selected: !m.selected } : m)); };
  const handleFormSelection = (id) => { markDirty("Forms"); setFormsData((p) => p.map((f) => f.id === id ? { ...f, selected: !f.selected } : f)); };
  const handleMiscellaneousDataChange = (field, value) => { markDirty("Miscellaneous"); setMiscellaneousData((p) => ({ ...p, [field]: value })); };

  // ── BOM search ────────────────────────────────────────────────────────────────
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
    if (bomItems.some((b) => b.code === selectedConsumable)) { showToast("This consumable is already in the BOM.", "error"); return; }
    setBomItems((p) => [...p, { id:Date.now(), code:selectedConsumable, name:picked?.name || selectedConsumable, qty:"1.00", uom:"", selected:false }]);
    setSelectedConsumable("");
  };

  const handleBOMItemSelection = (id) => { markDirty("BOM"); setBomItems((p) => p.map((it) => it.id === id ? { ...it, selected: !it.selected } : it)); };

  // ── Forms ─────────────────────────────────────────────────────────────────────
  const getFormId = async (formName) => {
    const data = await fetchGET(`${API_BASE_URL}/api/form/by-name?name=${encodeURIComponent(formName)}`);
    if (!data.id) throw new Error(`Form ${formName} has no id`);
    return data.id;
  };

  const handleAddForm = async () => {
    if (!newForm.form) { showToast("Please select a form", "error"); return; }
    try {
      const formId = await getFormId(newForm.form);
      markDirty("Forms");
      setFormsData((p) => [...p, { ...newForm, id:Date.now(), selected:false, formId }]);
      setNewForm({ stageForFormCompletion:"form-not-required", blockFromProceeding:"Yes", form:"" });
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleRemoveForms = () => { markDirty("Forms"); setFormsData((p) => p.filter((f) => !f.selected)); };

  // ── Validation ────────────────────────────────────────────────────────────────
  const validateGeneral = () => {
    const errs = [];
    if (!formData.serviceCode?.trim())          errs.push("Service Code");
    if (!formData.serviceName?.trim())          errs.push("Service Name");
    if (!formData.serviceSubCategory?.trim())   errs.push("Service Sub Category");
    if (!formData.serviceTime?.trim() || formData.serviceTime === " ") errs.push("Service Time");
    if (!formData.allowIdealBOMConsumption)     errs.push("Allow Ideal BOM Consumption");
    if (!formData.allowBOMConsumptionWithIntervention) errs.push("Allow BOM Consumption with intervention");
    return errs;
  };

  // ── Build payloads ────────────────────────────────────────────────────────────
  const buildGeneralPayload = (isDraft) => {
    const selectedSS = subSubCategories.find((s) => s.subSubCategoryCode === formData.serviceSubSubCategory);
    return {
      serviceCode:     formData.serviceCode,
      serviceName:     formData.serviceName,
      serviceArabicName: formData.arabicServiceName || "",
      serviceDesc:     formData.serviceDescription  || "",
      serviceCategoryCode:      formData.serviceCategory       || "",
      serviceSubCategoryCode:   formData.serviceSubCategory    || "",
      serviceSubSubCategoryCode:selectedSS?.subSubCategoryCodeRaw ?? "",
      serviceTime:     formData.serviceTime || "",
      allowIdealBOMConsumption:                 formData.allowIdealBOMConsumption || "No",
      allowIdealBOMConsumptionWithIntervention: formData.allowBOMConsumptionWithIntervention || "No",
      allowLoyalityAccurul:     formData.allowLoyaltyAccrual    || "No",
      allowLoyalityRedemption:  formData.allowLoyaltyRedemption || "No",
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
      serviceCode:   formData.serviceCode || "",
      price:         Number(p.price        || 0),
      taxIncluded:   String(p.taxIncluded  || ""),
      taxPercentage: Number(p.taxPercent   || 0),
      serviceRecID:  0,
      storeRelease:  p.storeRelease ? "Yes" : "No",
    })),
    isDraft,
  });

  const buildFormsPayload = (isDraft = 0) => ({
    serviceCode:             formData.serviceCode || "",
    formStageForCompletion:  formsData[0]?.stageForFormCompletion || "",
    formBlockIfNotFilled:    formsData[0]?.blockFromProceeding    || "Yes",
    form:                    formsData[0]?.form                   || "",
    field1: miscellaneousData.optionalField1 || "",
    field2: miscellaneousData.optionalField2 || "",
    field3: miscellaneousData.optionalField3 || "",
    field4: miscellaneousData.optionalField4 || "",
    field5: miscellaneousData.optionalField5 || "",
    isDraft,
  });

  // ── Save/Submit actions ───────────────────────────────────────────────────────
  const onSaveGeneral = async (asDraft = true) => {
    const missing = validateGeneral();
    if (missing.length) { showToast(`Please fill: ${missing.join(", ")}`, "error"); return; }
    try {
      await postJSON(URLS.general, buildGeneralPayload(asDraft));
      markSaved("General", asDraft ? "draft" : "saved");
      showToast(`General ${asDraft ? "saved as draft" : "submitted"} successfully.`);
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
      for (const b of bomItems) await postJSON(URLS.bom, { serviceCode: formData.serviceCode, productCode: b.code, isDraft: 1 });
      markSaved("BOM","draft"); showToast("BOM saved as draft.");
    } catch (e) { showToast(`Failed: ${e.message}`, "error"); }
  };
  const onSubmitBOM = async () => {
    try {
      for (const b of bomItems) await postJSON(URLS.bom, { serviceCode: formData.serviceCode, productCode: b.code, isDraft: 0 });
      markSaved("BOM","saved"); showToast("BOM submitted.");
    } catch (e) { showToast("Failed to submit BOM.", "error"); }
  };

  const buildPractitionerRows = () => [
    ...doctorMappings.map((d) => ({ serviceCode: formData.serviceCode, practionerType:"Doctor", clinicCode: d.clinicCode, doctorCode: d.doctorCode || "" })),
    ...nurseMappings.map((n)  => ({ serviceCode: formData.serviceCode, practionerType:"Nurses", clinicCode: n.clinicCode, doctorCode: n.nurseCode  || "" })),
  ];
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
    try {
      const formsToSave = [];
      for (const f of formsData) {
        if (!f.form) continue;
        const formId = f.formId || await getFormId(f.form);
        formsToSave.push({ id:0, serviceId:formData.serviceCode, formId, version:1, createdDate:new Date().toISOString(), isActive:true, formStageForCompletion:f.stageForFormCompletion, formBlockIfNotFilled:f.blockFromProceeding, isDraft:1 });
      }
      await postJSON(`${API_BASE_URL}/api/serviceForm`, {
        form: formsToSave[0] || { id:0, serviceId:formData.serviceCode, formId:0, version:1, createdDate:new Date().toISOString(), isActive:true, formStageForCompletion:"form-not-required", formBlockIfNotFilled:"Yes", isDraft:1 },
        forms: formsToSave,
        misc: { ...miscellaneousData },
      });
      markSaved("Forms","draft"); showToast("Forms saved as draft.");
    } catch (e) { showToast("Failed to save forms.", "error"); }
  };

  const onSubmitForms = async () => {
    try {
      const formsToSave = [];
      for (const f of formsData) {
        if (!f.form) continue;
        const formId = f.formId || await getFormId(f.form);
        formsToSave.push({ id:0, serviceId:formData.serviceCode, formId, version:1, createdDate:new Date().toISOString(), isActive:true, formStageForCompletion:f.stageForFormCompletion, formBlockIfNotFilled:f.blockFromProceeding, isDraft:0 });
      }
      if (formsToSave.length > 0) {
        await postJSON(`${API_BASE_URL}/api/serviceForm`, { form:formsToSave[0], forms:formsToSave });
      }
      await postJSON(URLS.forms, buildFormsPayload(0));
      markSaved("Forms","saved"); markSaved("Miscellaneous","saved");
      showToast("Forms submitted.");
    } catch (e) { showToast(`Failed: ${e.message}`, "error"); }
  };

  const onSaveMisc          = () => { markSaved("Miscellaneous","draft"); showToast("Miscellaneous saved locally."); };
  const onSubmitMiscViaForms = () => onSubmitForms();

  // ── Time options ─────────────────────────────────────────────────────────────
  const timeOptions = [
    { value:" ", label:"< - Select one - >" },
    { value:"10",  label:"10 mins"         }, { value:"20",  label:"20 mins" },
    { value:"30",  label:"30 mins"         }, { value:"40",  label:"40 mins" },
    { value:"50",  label:"50 mins"         }, { value:"1",   label:"1 hour"  },
    { value:"110", label:"1 hr 10 mins"    }, { value:"120", label:"1 hr 20 mins" },
    { value:"130", label:"1 hr 30 mins"    }, { value:"140", label:"1 hr 40 mins" },
    { value:"150", label:"1 hr 50 mins"    }, { value:"2",   label:"2 hours" },
    { value:"210", label:"2 hr 10 mins"    }, { value:"220", label:"2 hr 20 mins" },
  ];

  // ── Add Doctor/Nurse helper ───────────────────────────────────────────────────
  const addPractitioner = (side) => {
    const isDoctor = side === "doctor";
    const practStr = isDoctor ? practitionerMapping.doctor : practitionerMapping.nurses;
    const center   = isDoctor ? practitionerMapping.leftClinic : practitionerMapping.rightClinic;
    if (!center || !practStr) return;
    const [practCode, practName] = (practStr || "").split("|");
    const clinicName = clinics.find((c) => c.code === center)?.name || center;
    if (isDoctor) {
      if (doctorMappings.some((m) => m.doctorCode === practCode && m.clinicCode === center)) { showToast("Doctor already mapped to this clinic.", "error"); return; }
      markDirty("Practitioner Mapping");
      setDoctorMappings((p) => [...p, { id:Date.now(), doctorCode:practCode, doctorName:practName, clinicCode:center, clinicName, selected:false }]);
      setPractitionerMapping((p) => ({ ...p, doctor:"" }));
    } else {
      if (nurseMappings.some((m) => m.nurseCode === practCode && m.clinicCode === center)) { showToast("Nurse already mapped to this clinic.", "error"); return; }
      markDirty("Practitioner Mapping");
      setNurseMappings((p) => [...p, { id:Date.now(), nurseCode:practCode, nurseName:practName, clinicCode:center, clinicName, selected:false }]);
      setPractitionerMapping((p) => ({ ...p, nurses:"" }));
    }
  };

  const badgeColor = { saved:"#d1fae5", draft:"#fef3c7", unsaved:"#f3f4f6" };
  const badgeText  = { saved:"#065f46",  draft:"#92400e", unsaved:"#374151" };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .sf-page { padding:24px; font-family:Inter,sans-serif; max-width:1100px; margin:0 auto; }
        .sf-hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
        .sf-title { font-size:22px; font-weight:600; color:#111827; margin:0 0 4px; }
        .sf-back { padding:8px 18px; background:#334B71; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:14px; }
        .sf-card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.08); overflow:hidden; }
        .sf-tabs { display:flex; border-bottom:1px solid #e5e7eb; background:#f9fafb; align-items:center; justify-content:space-between; flex-wrap:wrap; }
        .sf-tab { padding:12px 16px; background:none; border:none; border-bottom:3px solid transparent; cursor:pointer; font-size:13px; font-weight:500; color:#6b7280; display:flex; align-items:center; gap:5px; }
        .sf-tab:hover { background:#f3f4f6; color:#374151; }
        .sf-tab.active { color:#334B71; border-bottom-color:#334B71; background:#fff; }
        .sf-status-wrap { padding:0 16px; display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .sf-badge { font-size:11px; padding:3px 10px; border-radius:999px; font-weight:600; }
        .sf-body { padding:28px; }
        .sf-section { font-size:12px; font-weight:700; color:#334B71; text-transform:uppercase; letter-spacing:.05em; border-bottom:2px solid #334B71; padding-bottom:6px; margin:20px 0 18px; }
        .sf-row { display:flex; align-items:flex-start; margin-bottom:18px; }
        .sf-lbl { min-width:220px; font-weight:500; color:#495057; font-size:14px; padding-top:10px; }
        .sf-req { color:crimson; margin-left:3px; }
        .sf-inp-wrap { flex:1; max-width:420px; }
        .sf-inp,.sf-sel,.sf-ta { width:100%; padding:9px 12px; border:1px solid #ced4da; border-radius:6px; font-size:14px; background:#fff; box-sizing:border-box; }
        .sf-inp:focus,.sf-sel:focus,.sf-ta:focus { outline:none; border-color:#334B71; box-shadow:0 0 0 3px rgba(51,75,113,.12); }
        .sf-radio-grp { display:flex; gap:20px; padding-top:10px; }
        .sf-actions { display:flex; gap:10px; margin-top:20px; padding-top:16px; border-top:1px solid #e5e7eb; }
        .sf-btn { padding:9px 20px; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:600; }
        .sf-btn.primary { background:#334B71; color:#fff; }
        .sf-btn.secondary { background:#343a40; color:#fff; }
        .sf-btn:disabled { opacity:.5; cursor:not-allowed; }
        .pt-tbl { width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
        .pt-tbl th { background:#f9fafb; padding:11px 14px; text-align:left; font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid #e5e7eb; }
        .pt-tbl td { padding:10px 14px; border-bottom:1px solid #f3f4f6; font-size:13px; vertical-align:middle; }
        .pt-inp { width:90px; padding:6px 8px; border:1px solid #ced4da; border-radius:4px; font-size:13px; text-align:center; }
        .pt-sel { width:90px; padding:6px 8px; border:1px solid #ced4da; border-radius:4px; font-size:13px; background:#fff; }
        .note-box { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; font-size:13px; color:#1e40af; margin-bottom:20px; }
        .pract-col { flex:1; }
        .pract-cols { display:flex; gap:40px; }
        @media(max-width:768px) { .sf-row{flex-direction:column;} .sf-lbl{min-width:auto;padding-top:0;margin-bottom:6px;} .pract-cols{flex-direction:column;} }
      `}</style>

      <div className="sf-page">
        {/* Header */}
        <div className="sf-hdr">
          <div>
            <div style={{ fontSize:12, color:"#9ca3af", marginBottom:6 }}>
              <a href="/dashboard" style={{ color:"#334B71", textDecoration:"none" }}>Dashboard</a>
              <span style={{ margin:"0 6px" }}> › </span>
              <span style={{ cursor:"pointer", color:"#334B71" }} onClick={onBack}>Manage Service</span>
              <span style={{ margin:"0 6px" }}> › </span>
              <span>{mode === "edit" ? `Edit — ${formData.serviceCode}` : "Create New Service"}</span>
            </div>
            <h1 className="sf-title">{mode === "edit" ? "Edit Service" : "Create Service"}</h1>
          </div>
          <button className="sf-back" onClick={onBack}>← Back To List</button>
        </div>

        <div className="note-box">
          <strong>Note:</strong> Each tab saves independently. Complete them in any order.
        </div>

        <div className="sf-card">
          {/* Tabs */}
          <div className="sf-tabs">
            <div style={{ display:"flex", flexWrap:"wrap" }}>
              {tabs.map((tab) => (
                <button key={tab} className={`sf-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                  {dirty[tab] && <span style={{ color:"#f59e0b" }}>●</span>}
                  {tab}
                </button>
              ))}
            </div>
            <div className="sf-status-wrap">
              <span className="sf-badge" style={{ background: badgeColor[tabStatus[activeTab]], color: badgeText[tabStatus[activeTab]] }}>
                {tabStatus[activeTab]}
              </span>
              <label style={{ fontSize:13, fontWeight:500, color:"#495057" }}>Status:</label>
              <input className="sf-inp" style={{ width:110 }} name="serviceStatus" value={formData.serviceStatus} onChange={handleInputChange} readOnly={mode==="create"} />
            </div>
          </div>

          <div className="sf-body">

            {/* ── GENERAL ─────────────────────────────────────────────────────── */}
            {activeTab === "General" && (
              <>
                <div className="sf-section">General Information</div>

                {[
                  { label:"Service Code",      name:"serviceCode",    req:true },
                  { label:"Service Name",      name:"serviceName",    req:true },
                  { label:"Arabic Name",       name:"arabicServiceName" },
                  { label:"Description",       name:"serviceDescription", ta:true },
                ].map(({ label, name, req, ta }) => (
                  <div className="sf-row" key={name}>
                    <label className="sf-lbl">{label} {req && <span className="sf-req">*</span>}</label>
                    <div className="sf-inp-wrap">
                      {ta
                        ? <textarea className="sf-ta" name={name} value={formData[name]} onChange={handleInputChange} rows={3} />
                        : <input   className="sf-inp" name={name} value={formData[name]} onChange={handleInputChange} />
                      }
                    </div>
                  </div>
                ))}

                {/* Category */}
                <div className="sf-row">
                  <label className="sf-lbl">Service Category</label>
                  <div className="sf-inp-wrap">
                    <select className="sf-sel" name="serviceCategory" value={formData.serviceCategory} onChange={handleCategoryChange}>
                      <option value="">{catLoading ? "Loading..." : "Select Category"}</option>
                      {categories.map((c) => <option key={c.categoryCode} value={c.categoryCode}>{c.categoryName}</option>)}
                    </select>
                    {catError && <div style={{ color:"crimson", marginTop:4, fontSize:12 }}>{catError}</div>}
                  </div>
                </div>

                <div className="sf-row">
                  <label className="sf-lbl">Sub Category <span className="sf-req">*</span></label>
                  <div className="sf-inp-wrap">
                    <select className="sf-sel" name="serviceSubCategory" value={formData.serviceSubCategory} onChange={handleSubCategoryChange} disabled={!formData.serviceCategory}>
                      <option value="">{subLoading ? "Loading..." : "< - Select one - >"}</option>
                      {subCategories.map((s) => <option key={s.subCategoryCode} value={s.subCategoryCode}>{s.subCategoryName}</option>)}
                    </select>
                    {subError && <div style={{ color:"crimson", marginTop:4, fontSize:12 }}>{subError}</div>}
                  </div>
                </div>

                <div className="sf-row">
                  <label className="sf-lbl">Sub Sub Category</label>
                  <div className="sf-inp-wrap">
                    <select className="sf-sel" name="serviceSubSubCategory" value={formData.serviceSubSubCategory} onChange={handleInputChange} disabled={!formData.serviceSubCategory}>
                      <option value="">{ssLoading ? "Loading..." : "< - Select one - >"}</option>
                      {subSubCategories.map((s) => <option key={s.subSubCategoryCode} value={s.subSubCategoryCode}>{s.subSubCategoryName}</option>)}
                    </select>
                    {ssError && <div style={{ color:"crimson", marginTop:4, fontSize:12 }}>{ssError}</div>}
                  </div>
                </div>

                <div className="sf-row">
                  <label className="sf-lbl">Service Time <span className="sf-req">*</span></label>
                  <div className="sf-inp-wrap">
                    <select className="sf-sel" name="serviceTime" value={formData.serviceTime} onChange={handleInputChange}>
                      {timeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {[
                  { label:"Allow Ideal BOM Consumption",        key:"allowIdealBOMConsumption",              req:true },
                  { label:"Allow BOM with Intervention",        key:"allowBOMConsumptionWithIntervention",   req:true },
                  { label:"Allow Loyalty Accrual",              key:"allowLoyaltyAccrual" },
                  { label:"Allow Loyalty Redemption",           key:"allowLoyaltyRedemption" },
                ].map(({ label, key, req }) => (
                  <div className="sf-row" key={key}>
                    <label className="sf-lbl">{label} {req && <span className="sf-req">*</span>}</label>
                    <div className="sf-inp-wrap">
                      <div className="sf-radio-grp">
                        {["Yes","No"].map((v) => (
                          <label key={v} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
                            <input type="radio" name={key} value={v} checked={formData[key] === v} onChange={(e) => handleRadioChange(key, e.target.value)} style={{ accentColor:"#334B71" }} />
                            {v}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="sf-section">Additional Fields</div>
                {[1,2,3,4,5].map((n) => (
                  <div className="sf-row" key={n}>
                    <label className="sf-lbl">Additional Field {n}</label>
                    <div className="sf-inp-wrap">
                      <input className="sf-inp" name={`additionalField${n}`} value={formData[`additionalField${n}`]} onChange={handleInputChange} />
                    </div>
                  </div>
                ))}

                <div className="sf-actions">
                  <button className="sf-btn primary"   onClick={() => onSaveGeneral(true)}>Save as Draft</button>
                  <button className="sf-btn secondary" onClick={() => onSaveGeneral(false)}>Submit General</button>
                </div>
              </>
            )}

            {/* ── PRICING ──────────────────────────────────────────────────────── */}
            {activeTab === "Pricing" && (
              <>
                <div className="sf-section">Pricing per Clinic</div>
                <div style={{ overflowX:"auto" }}>
                  <table className="pt-tbl">
                    <thead>
                      <tr>
                        <th>Center</th><th>Price</th><th>Tax Included</th><th>Tax %</th><th>Store Release</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.pricingData.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight:500 }}>{p.centerName || p.centerCode}</td>
                          <td><input type="number" className="pt-inp" value={p.price}      min="0" step="0.01" onChange={(e) => handlePricingChange(i,"price",e.target.value)} /></td>
                          <td>
                            <select className="pt-sel" value={p.taxIncluded} onChange={(e) => handlePricingChange(i,"taxIncluded",e.target.value)}>
                              <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
                            </select>
                          </td>
                          <td><input type="number" className="pt-inp" value={p.taxPercent} min="0" max="100" step="0.01" onChange={(e) => handlePricingChange(i,"taxPercent",e.target.value)} /></td>
                          <td style={{ textAlign:"center" }}><input type="checkbox" checked={!!p.storeRelease} onChange={() => handlePricingCheckboxChange(i,"storeRelease")} style={{ width:16, height:16, accentColor:"#334B71" }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="sf-actions">
                  <button className="sf-btn primary"   onClick={onSavePricing}>Save as Draft</button>
                  <button className="sf-btn secondary" onClick={onSubmitPricing}>Submit Pricing</button>
                </div>
              </>
            )}

            {/* ── BOM ──────────────────────────────────────────────────────────── */}
            {activeTab === "BOM" && (
              <>
                <div className="sf-section">Bill of Materials</div>

                <div className="sf-row">
                  <label className="sf-lbl">Search Consumables</label>
                  <div className="sf-inp-wrap" style={{ display:"flex", gap:8 }}>
                    <input className="sf-inp" value={searchConsumables} onChange={(e) => setSearchConsumables(e.target.value)} placeholder="Type keyword..." style={{ flex:1 }} />
                    <button className="sf-btn secondary" onClick={handleSearchConsumables} disabled={consumableLoad}>{consumableLoad ? "..." : "🔍"}</button>
                  </div>
                </div>
                {consumableErr && <div style={{ color:"crimson", marginBottom:12, fontSize:13 }}>{consumableErr}</div>}

                <div className="sf-row">
                  <label className="sf-lbl">Select Consumable</label>
                  <div className="sf-inp-wrap" style={{ display:"flex", gap:8 }}>
                    <select className="sf-sel" value={selectedConsumable} onChange={(e) => setSelectedConsumable(e.target.value)} style={{ flex:1 }}>
                      {consumableOpts.map((o, i) => <option key={i} value={o.code}>{o.name}{o.code && o.code!=="0" ? ` (${o.code})` : ""}</option>)}
                    </select>
                    <button className="sf-btn primary" onClick={handleAddConsumable}>+ Add</button>
                  </div>
                </div>

                <div className="sf-section">Ideal BOM Items</div>
                <table className="pt-tbl">
                  <thead><tr><th style={{ width:50 }}></th><th>Code</th><th>Name</th><th>Qty</th><th>UOM</th></tr></thead>
                  <tbody>
                    {bomItems.map((it) => (
                      <tr key={it.id}>
                        <td><input type="checkbox" checked={it.selected} onChange={() => handleBOMItemSelection(it.id)} style={{ accentColor:"#334B71" }} /></td>
                        <td>{it.code}</td><td>{it.name}</td><td>{it.qty}</td><td>{it.uom}</td>
                      </tr>
                    ))}
                    {bomItems.length === 0 && <tr><td colSpan={5} style={{ padding:24, textAlign:"center", color:"#9ca3af", fontStyle:"italic" }}>No consumables added yet.</td></tr>}
                  </tbody>
                </table>
                {bomItems.some((b) => b.selected) && (
                  <button className="sf-btn secondary" style={{ marginTop:10 }} onClick={() => { markDirty("BOM"); setBomItems((p) => p.filter((b) => !b.selected)); }}>Remove Selected</button>
                )}

                <div className="sf-actions">
                  <button className="sf-btn primary"   onClick={onSaveBOM}>Save as Draft</button>
                  <button className="sf-btn secondary" onClick={onSubmitBOM}>Submit BOM</button>
                </div>
              </>
            )}

            {/* ── PRACTITIONER MAPPING ─────────────────────────────────────────── */}
            {activeTab === "Practitioner Mapping" && (
              <>
                <div className="sf-section">Practitioner Mapping</div>
                <div className="pract-cols">
                  {/* Doctors */}
                  <div className="pract-col">
                    <h3 style={{ fontSize:15, fontWeight:600, color:"#334B71", marginBottom:14 }}>Doctors</h3>
                    <div className="sf-row">
                      <label className="sf-lbl" style={{ minWidth:80 }}>Clinic</label>
                      <div className="sf-inp-wrap">
                        <select className="sf-sel" value={practitionerMapping.leftClinic} onChange={(e) => handlePractitionerMappingChange("leftClinic", e.target.value)}>
                          <option value="">{clinicLoading ? "Loading…" : "Select one"}</option>
                          {clinics.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl" style={{ minWidth:80 }}>Doctor</label>
                      <div className="sf-inp-wrap" style={{ display:"flex", gap:8 }}>
                        <select className="sf-sel" value={practitionerMapping.doctor} onChange={(e) => handlePractitionerMappingChange("doctor", e.target.value)} disabled={!practitionerMapping.leftClinic} style={{ flex:1 }}>
                          <option value="">{leftLoad ? "Loading…" : "< - Select one - >"}</option>
                          {leftPractitioners.map((p) => <option key={p.id} value={`${p.id}|${p.name}`}>{p.name}</option>)}
                        </select>
                        <button className="sf-btn primary" disabled={!practitionerMapping.leftClinic || !practitionerMapping.doctor} onClick={() => addPractitioner("doctor")}>+ Add</button>
                      </div>
                    </div>
                    {leftErr && <div style={{ color:"crimson", fontSize:12 }}>{leftErr}</div>}

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"10px 0 6px" }}>
                      <input className="sf-inp" placeholder="Filter..." style={{ width:180 }} value={docFilter} onChange={(e) => setDocFilter(e.target.value)} />
                      <button className="sf-btn secondary" style={{ fontSize:12, padding:"5px 12px" }}
                        onClick={() => { markDirty("Practitioner Mapping"); setDoctorMappings((p) => p.filter((m) => !m.selected)); }}>
                        Remove selected
                      </button>
                    </div>
                    <table className="pt-tbl">
                      <thead><tr><th style={{ width:40 }}></th><th>Doctor</th><th>Clinic</th></tr></thead>
                      <tbody>
                        {doctorMappings
                          .filter((m) => !docFilter || (m.doctorName + m.clinicName).toLowerCase().includes(docFilter.toLowerCase()))
                          .map((m) => (
                            <tr key={m.id}>
                              <td><input type="checkbox" checked={m.selected} onChange={() => handleDoctorMappingSelection(m.id)} style={{ accentColor:"#334B71" }} /></td>
                              <td>{m.doctorName}</td><td>{m.clinicName}</td>
                            </tr>
                          ))}
                        {doctorMappings.length === 0 && <tr><td colSpan={3} style={{ padding:16, color:"#9ca3af", fontStyle:"italic" }}>No doctors mapped.</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {/* Nurses */}
                  <div className="pract-col">
                    <h3 style={{ fontSize:15, fontWeight:600, color:"#334B71", marginBottom:14 }}>Nurses</h3>
                    <div className="sf-row">
                      <label className="sf-lbl" style={{ minWidth:80 }}>Clinic</label>
                      <div className="sf-inp-wrap">
                        <select className="sf-sel" value={practitionerMapping.rightClinic} onChange={(e) => handlePractitionerMappingChange("rightClinic", e.target.value)}>
                          <option value="">{clinicLoading ? "Loading…" : "Select one"}</option>
                          {clinics.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl" style={{ minWidth:80 }}>Nurse</label>
                      <div className="sf-inp-wrap" style={{ display:"flex", gap:8 }}>
                        <select className="sf-sel" value={practitionerMapping.nurses} onChange={(e) => handlePractitionerMappingChange("nurses", e.target.value)} disabled={!practitionerMapping.rightClinic} style={{ flex:1 }}>
                          <option value="">{rightLoad ? "Loading…" : "< - Select one - >"}</option>
                          {rightPractitioners.map((p) => <option key={p.id} value={`${p.id}|${p.name}`}>{p.name}</option>)}
                        </select>
                        <button className="sf-btn primary" disabled={!practitionerMapping.rightClinic || !practitionerMapping.nurses} onClick={() => addPractitioner("nurse")}>+ Add</button>
                      </div>
                    </div>
                    {rightErr && <div style={{ color:"crimson", fontSize:12 }}>{rightErr}</div>}

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"10px 0 6px" }}>
                      <input className="sf-inp" placeholder="Filter..." style={{ width:180 }} value={nurseFilter} onChange={(e) => setNurseFilter(e.target.value)} />
                      <button className="sf-btn secondary" style={{ fontSize:12, padding:"5px 12px" }}
                        onClick={() => { markDirty("Practitioner Mapping"); setNurseMappings((p) => p.filter((m) => !m.selected)); }}>
                        Remove selected
                      </button>
                    </div>
                    <table className="pt-tbl">
                      <thead><tr><th style={{ width:40 }}></th><th>Nurse</th><th>Clinic</th></tr></thead>
                      <tbody>
                        {nurseMappings
                          .filter((m) => !nurseFilter || (m.nurseName + m.clinicName).toLowerCase().includes(nurseFilter.toLowerCase()))
                          .map((m) => (
                            <tr key={m.id}>
                              <td><input type="checkbox" checked={m.selected} onChange={() => handleNurseMappingSelection(m.id)} style={{ accentColor:"#334B71" }} /></td>
                              <td>{m.nurseName}</td><td>{m.clinicName}</td>
                            </tr>
                          ))}
                        {nurseMappings.length === 0 && <tr><td colSpan={3} style={{ padding:16, color:"#9ca3af", fontStyle:"italic" }}>No nurses mapped.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="sf-actions">
                  <button className="sf-btn primary"   onClick={onSavePractitioners}>Save as Draft</button>
                  <button className="sf-btn secondary" onClick={onSubmitPractitioners}>Submit Practitioner Mapping</button>
                </div>
              </>
            )}

            {/* ── FORMS ────────────────────────────────────────────────────────── */}
            {activeTab === "Forms" && (
              <>
                <div className="sf-section">Add Form</div>

                <div className="sf-row">
                  <label className="sf-lbl">Stage for Completion</label>
                  <div className="sf-inp-wrap">
                    <select className="sf-sel" value={newForm.stageForFormCompletion} onChange={(e) => setNewForm((p) => ({ ...p, stageForFormCompletion: e.target.value }))}>
                      <option value="form-not-required">Form not required</option>
                      <option value="before-service">Before Service</option>
                      <option value="during-service">During Service</option>
                      <option value="after-service">After Service</option>
                    </select>
                  </div>
                </div>

                <div className="sf-row">
                  <label className="sf-lbl">Block from Proceeding</label>
                  <div className="sf-inp-wrap">
                    <div className="sf-radio-grp">
                      {["Yes","No"].map((v) => (
                        <label key={v} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
                          <input type="radio" value={v} checked={newForm.blockFromProceeding === v} onChange={(e) => setNewForm((p) => ({ ...p, blockFromProceeding: e.target.value }))} style={{ accentColor:"#334B71" }} />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sf-row">
                  <label className="sf-lbl">Form</label>
                  <div className="sf-inp-wrap" style={{ display:"flex", gap:8 }}>
                    <select className="sf-sel" value={newForm.form} onChange={(e) => setNewForm((p) => ({ ...p, form: e.target.value }))} style={{ flex:1 }}>
                      <option value="">Select Form</option>
                      {formnames.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <button className="sf-btn primary" onClick={handleAddForm}>+ Add</button>
                  </div>
                </div>

                <div className="sf-section">Added Forms</div>
                <table className="pt-tbl">
                  <thead><tr><th style={{ width:50 }}></th><th>Stage</th><th>Block</th><th>Form</th></tr></thead>
                  <tbody>
                    {formsData.filter((f) => f.form).map((f) => (
                      <tr key={f.id}>
                        <td><input type="checkbox" checked={f.selected} onChange={() => handleFormSelection(f.id)} style={{ accentColor:"#334B71" }} /></td>
                        <td>{f.stageForFormCompletion}</td>
                        <td>{f.blockFromProceeding}</td>
                        <td>{f.form}</td>
                      </tr>
                    ))}
                    {formsData.filter((f) => f.form).length === 0 && (
                      <tr><td colSpan={4} style={{ padding:24, textAlign:"center", color:"#9ca3af", fontStyle:"italic" }}>No forms added yet.</td></tr>
                    )}
                  </tbody>
                </table>
                {formsData.some((f) => f.selected) && (
                  <button className="sf-btn secondary" style={{ marginTop:10 }} onClick={handleRemoveForms}>Remove Selected</button>
                )}

                <div className="sf-actions">
                  <button className="sf-btn primary"   onClick={onSaveForms}>Save as Draft</button>
                  <button className="sf-btn secondary" onClick={onSubmitForms}>Submit Forms</button>
                </div>
              </>
            )}

            {/* ── MISCELLANEOUS ────────────────────────────────────────────────── */}
            {activeTab === "Miscellaneous" && (
              <>
                <div className="sf-section">Optional Fields</div>
                <div style={{ display:"flex", gap:40 }}>
                  <div style={{ flex:1 }}>
                    {[1,2,3].map((n) => (
                      <div className="sf-row" key={n}>
                        <label className="sf-lbl">Optional Field {n}</label>
                        <div className="sf-inp-wrap">
                          <input className="sf-inp" value={miscellaneousData[`optionalField${n}`]} onChange={(e) => handleMiscellaneousDataChange(`optionalField${n}`, e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex:1 }}>
                    {[4,5].map((n) => (
                      <div className="sf-row" key={n}>
                        <label className="sf-lbl">Optional Field {n}</label>
                        <div className="sf-inp-wrap">
                          <input className="sf-inp" value={miscellaneousData[`optionalField${n}`]} onChange={(e) => handleMiscellaneousDataChange(`optionalField${n}`, e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="note-box" style={{ marginTop:16 }}>
                  <strong>Note:</strong> These fields are submitted together with the Forms tab.
                </div>

                <div className="sf-actions">
                  <button className="sf-btn primary"   onClick={onSaveMisc}>Save Locally</button>
                  <button className="sf-btn secondary" onClick={onSubmitMiscViaForms}>Submit via Forms</button>
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

export default ServiceForm;