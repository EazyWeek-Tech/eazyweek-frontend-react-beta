"use client";

import { useNavigate } from "react-router-dom";
import { useRef, useState, useMemo, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const OpportunityForm = ({ onBack, onNext, mode = "create" }) => {
  const navigate = useNavigate();
  const formRef = useRef(null);

  // ---------- EXTERNAL SOURCE (NEW) ----------
  const [externalSource, setExternalSource] = useState(""); // S1..S4
  const [externalSubSource, setExternalSubSource] = useState(""); // SS1..SS3 (depends on source)

  const EXTERNAL_SOURCE_OPTIONS = [
    { value: "", label: "< - Select one - >" },
    { value: "S1", label: "Social Media Campaign" },
    { value: "S2", label: "Google Ads" },
    { value: "S3", label: "Others" },
    { value: "S4", label: "Website" },
    { value: "S5", label: "WhatsApp" },
    { value: "S6", label: "Instagram Post"  },
    { value: "S7", label: "Instagram Message"  },
  ];

  const EXTERNAL_SUBSOURCE_MAP = {
    S1: [ 
      { value: "", label: "< - Select one - >" },
      { value: "SS1", label: "Instagram" },
      { value: "SS2", label: "Tiktok" },
      { value: "SS3", label: "Facebook" },
    ],
    S2: [
      { value: "", label: "< - Select one - >" },
      { value: "SS1", label: "Google Ads" },
    ],
    S3: [
      { value: "", label: "< - Select one - >" },
      { value: "SS1", label: "Manual Upload" },
    ],
    S4: [
      { value: "", label: "< - Select one - >" },
      { value: "SS1", label: "Referral" },
      { value: "SS2", label: "Enquiry" },
      { value: "SS3", label: "Booking" },
    ],
    S5: [
      { value: "", label: "< - Select one - >" },
      { value: "SS5", label: "Outbound/Inbound" },
      { value: "SS4", label: "" },
    ],

    S6: [
      { value: "", label: "< - Select one - >" },
      { value: "SS1", label: "Outbound/Inbound" },
    ],
    S7: [
      { value: "", label: "< - Select one - >" },
      { value: "SS1", label: "Outbound/Inbound" },
    ],
    S8: [
      { value: "", label: "< - Select one - >" },
      { value: "SS1", label: "" },
    ],
  };


  const subSourceOptions = useMemo(() => {
    return EXTERNAL_SUBSOURCE_MAP[externalSource] || [{ value: "", label: "< - Select one - >" }];
  }, [externalSource]);

  // Reset Sub-Source whenever Source changes
  useEffect(() => {
    setExternalSubSource("");
  }, [externalSource]);

  const today = new Date().toISOString().slice(0, 10);

  // ✅ Local "today" (avoids UTC shift from toISOString)
const todayLocalYMD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // yyyy-MM-dd
};


// yyyy-MM-dd -> Date (local-safe)
const ymdToDate = (ymd) => {
  if (!ymd) return null;
  const [y, m, d] = String(ymd).split("-");
  return new Date(Number(y), Number(m) - 1, Number(d));
};

// Date -> yyyy-MM-dd
const dateToYMD = (dt) => {
  if (!(dt instanceof Date) || isNaN(dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// today - N days (returns yyyy-MM-dd)
const minusDaysFromToday = (n) => {
  const today = ymdToDate(todayLocalYMD());
  if (!today || !n) return "";
  const d = new Date(today);
  d.setDate(d.getDate() - Number(n));
  return dateToYMD(d);
};

const computeDynamicCampaignDates = (vals) => {
  const endDate = todayLocalYMD();

  // numeric window: 1/7/30/90
  const numeric = numericDays(vals.windowType);
  if (numeric) {
    return { startDate: minusDaysFromToday(numeric), endDate };
  }

  // custom: windowType == 0, use customDays
  if (isCustom(vals.windowType)) {
    const cd = String(vals.customDays || "").trim();
    if (!cd) return null;
    return { startDate: minusDaysFromToday(cd), endDate };
  }

  // date range: windowType == 9999 -> use difference between 2 dates as X
  if (isRange(vals.windowType)) {
    const diff = daysBetween(vals.fromDate, vals.toDate); // your existing helper
    if (!diff) return null;
    return { startDate: minusDaysFromToday(diff), endDate };
  }

  return null;
};


  // ---------- CATEGORY OPTIONS ----------
  const [catLoading, setCatLoading] = useState(false);
  const [catOptions, setCatOptions] = useState([]); // [{label, value, raw}]
  useEffect(() => {
    let isMounted = true;
    const loadCats = async () => {
      try {
        setCatLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/Opportunity/OppLoadCategory`, {
          credentials: "include",
        });
        const data = await res.json();
        const mapped = Array.isArray(data)
          ? data.map((d) => ({
              label: d.name ?? d.code ?? "",
              value: d.code ?? d.name ?? "",
              raw: d,
            }))
          : [];
        if (isMounted) setCatOptions(mapped);
      } catch (e) {
        console.error("Failed to load categories", e);
        if (isMounted) setCatOptions([]);
      } finally {
        if (isMounted) setCatLoading(false);
      }
    };
    loadCats();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---------- DYNAMIC RULES (TRANSACTION / MASTERS) ----------
  const [transactionRules, setTransactionRules] = useState([]);
  const [masterRules, setMasterRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // DB code -> internal ruleId used by RuleForm switch()
  const ruleCodeToId = {
    R1: "paidForXButNotY",
    R2: "paidForXCategoryInYDays",
    R3: "noShowAppointment",
    R4: "cancelledAppointment",
    R5: "customerSpecialDay",
    R6: "customerType",
    R7: "externalSourceRule",
  };

  const mapApiRule = (r) => ({
    id: ruleCodeToId[r?.code] ?? (r?.code || ""),
    title: r?.name ?? r?.code ?? "",
    desc: r?.name ?? r?.code ?? "",
    raw: r,
  });

  useEffect(() => {
    let alive = true;

    const loadRules = async (type, setter) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Opportunity/OppLoadRules/${type}`, {
          credentials: "include",
        });
        const data = await res.json();
        const arr = Array.isArray(data) ? data.map(mapApiRule) : [];
        if (alive) setter(arr);
      } catch (e) {
        console.error("Failed to load rules:", type, e);
        if (alive) setter([]);
      }
    };

    const run = async () => {
      setRulesLoading(true);
      await Promise.all([loadRules("TRANSACTION", setTransactionRules), loadRules("MASTERS", setMasterRules)]);
      setRulesLoading(false);
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ Manual rule (UPDATED: includes raw.code = "Manual Lead")
  const manualRules = [
    {
      id: "manualCreateLead",
      title: "Create Manual Lead",
      desc: "Create a lead without auto-segmentation.",
      raw: { code: "Manual Lead", name: "Manual Lead" }, // ✅ THIS IS THE KEY CHANGE
    },
  ];
  const externalRules = [
  {
    id: "externalSourceRule",
    title: "Create External Source Lead/Opportunity",
    desc: "Create a lead from external source + sub source within a date range.",
    raw: { code: "R7", name: "External Source" },
  },
];


  const ALL_RULES = [...transactionRules, ...masterRules, ...externalRules, ...manualRules];
  const TX_IDS = useMemo(() => transactionRules.map((r) => r.id), [transactionRules]);
  const MS_IDS = useMemo(() => masterRules.map((r) => r.id), [masterRules]);
  const MANUAL_ID = "manualCreateLead";

  // ---------- STATE ----------
  const [opportunityName, setOpportunityName] = useState("");
  const [selectedRule, setSelectedRule] = useState("");
  const isManualLeadSelected = selectedRule === MANUAL_ID; // ✅ NEW (used for modal gating)

  const [ruleValues, setRuleValues] = useState({
    // R1
    paidForXButNotY: {
      categoryX: [],
      categoryY: [],
      fetchType: "", // "1" | "2"
      categoryWindow: "", // "", "1","7","30","90","0","9999" — hidden for static
      customDays: "",
      fromDate: "",
      toDate: "",
    },
    // R2
    paidForXCategoryInYDays: {
      categoryX: [],
      fromDate1: "",
      toDate1: "",
      zDays: "",
      fromDate2: "",
      toDate2: "",
      categoryP: [],
      fetchType: "",
    },
    // R3
    noShowAppointment: {
      fetchType: "",
      windowType: "", // hidden for static
      customDays: "",
      fromDate: "",
      toDate: "",
    },
    // R4
    cancelledAppointment: {
      fetchType: "",
      windowType: "", // hidden for static
      customDays: "",
      fromDate: "",
      toDate: "",
    },
    // R5
    customerSpecialDay: { dayType: "", fetchType: "", fromDate: "", toDate: "" },
    // R6
    customerType: { type: "", fetchType: "" },
    //R7
    externalSourceRule: {
  extFromDate: "",
  extToMode: "current", // "current" | "custom"
  extToDate: "",
},

    // Manual
    manualCreateLead: {
      note: "",
      fetchType: "1", // fixed to Static for manual lead
      manualFromDate: "",
      manualToMode: "current", // "current" | "custom"
      manualToDate: "",
    },
  });

  const [errors, setErrors] = useState({ name: "", rule: "", fields: "" });
  const nameRef = useRef(null);
  const rulesRef = useRef(null);

  // ---------- Activate Modal State ----------
  const [activateOpen, setActivateOpen] = useState(false);
  const [campStart, setCampStart] = useState("");
  const [campEnd, setCampEnd] = useState("");
  const [activateErr, setActivateErr] = useState("");

  // ---------- SCROLL WHEN RULE SELECTED ----------
  useEffect(() => {
    if (selectedRule && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstInput = formRef.current.querySelector("input, select, textarea, [data-msel]");
      if (firstInput) firstInput.focus?.({ preventScroll: true });
    }
  }, [selectedRule]);

  // ---------- HELPERS ----------
  const selectRule = (id) => {
    setSelectedRule(id);
    if (errors.rule || errors.fields) setErrors((prev) => ({ ...prev, rule: "", fields: "" }));
  };
  const clearSelection = () => setSelectedRule("");
  const setField = (ruleId, field, value) => {
    setRuleValues((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], [field]: value },
    }));
    if (errors.fields) setErrors((prev) => ({ ...prev, fields: "" }));
  };

  // Required fields baseline (dynamic filtering for static happens in isRuleValid)
  const requiredFields = useMemo(
    () => ({
      paidForXButNotY: ["categoryX", "categoryY", "categoryWindow"],
      paidForXCategoryInYDays: ["categoryX", "fromDate1", "toDate1", "zDays", "fromDate2", "toDate2", "categoryP"],
      noShowAppointment: ["windowType"],
      cancelledAppointment: ["windowType"],
      customerSpecialDay: ["dayType"],
      customerType: ["type"],
      manualCreateLead: [],
      externalSourceRule: [],

    }),
    []
  );

  const isCustom = (v) => String(v) === "0";
  const isRange = (v) => String(v) === "9999";
  const numericDays = (v) => {
    const s = (v ?? "").toString();
    if (!s || isCustom(s) || isRange(s)) return "";
    return s;
  };

  const daysBetween = (start, end) => {
    if (!start || !end) return "";
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e)) return "";
    const ms = e.getTime() - s.getTime();
    if (ms < 0) return "";
    const d = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return String(d);
  };

  const toDMY = (ymd) => {
    if (!ymd) return "";
    const [y, m, d] = (ymd || "").split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  };
  const safeDMY = (ymd) => (ymd ? toDMY(ymd) : "");

  // Compute the exact noShowDays value the API expects
  const computeNoShowDays = (v) => {
    if (String(v.fetchType) === "1") return "9999"; // STATIC sentinel
    if (isCustom(v.windowType)) return String(v.customDays || "");
    if (isRange(v.windowType)) return daysBetween(v.fromDate, v.toDate) || "";
    return numericDays(v.windowType); // 1 / 7 / 30 / 90
  };

  const isRuleValid = (ruleId) => {
    if (!ruleId) return false;
    const vals = ruleValues[ruleId] || {};

    // ✅ External rule does NOT use fetchType
  if (ruleId === "externalSourceRule") {
    if (!vals.extFromDate) return false;
    if (vals.extToMode === "custom" && !vals.extToDate) return false;
    if (!externalSource) return false;
    if (!externalSubSource) return false;
    return true;
  }

    const ft = String(vals.fetchType || "");

    if (!["1", "2"].includes(ft)) return false;

    // ✅ Manual Create Lead: from/to date rules
    if (ruleId === "manualCreateLead") {
      const from = (vals.manualFromDate || "").toString().trim();
      const toMode = (vals.manualToMode || "current").toString();
      const toDate = (vals.manualToDate || "").toString().trim();

      if (!from) return false;
      if (toMode === "custom" && !toDate) return false;
      return true;
    }

    // dynamically filter required fields for static
    let baseReq = requiredFields[ruleId] || [];
    if (ft === "1") {
      baseReq = baseReq.filter((k) => !["categoryWindow", "windowType"].includes(k));
    }
    const isFilled = (v) => (Array.isArray(v) ? v.length > 0 : (v ?? "").toString().trim() !== "");
    if (!baseReq.every((k) => isFilled(vals[k]))) return false;

    // Rule-specific checks
    if (ruleId === "paidForXButNotY") {
      if (ft === "1") {
        if (!isFilled(vals.fromDate) || !isFilled(vals.toDate)) return false;
      } else {
        if (isCustom(vals.categoryWindow) && !isFilled(vals.customDays)) return false;
        if (isRange(vals.categoryWindow)) {
          if (!isFilled(vals.fromDate) || !isFilled(vals.toDate)) return false;
        }
      }
    }

    if (ruleId === "noShowAppointment" || ruleId === "cancelledAppointment") {
      if (ft === "1") {
        if (!isFilled(vals.fromDate) || !isFilled(vals.toDate)) return false;
      } else {
        if (isCustom(vals.windowType) && !isFilled(vals.customDays)) return false;
        if (isRange(vals.windowType)) {
          if (!isFilled(vals.fromDate) || !isFilled(vals.toDate)) return false;
        }
      }
    }

    if (ruleId === "noShowAppointment") {
      const nd = computeNoShowDays(vals);
      if (!nd) return false;
    }

   if (ruleId === "externalSourceRule") {
  if (!vals.extFromDate) return false;
  if (vals.extToMode === "custom" && !vals.extToDate) return false;
  if (!externalSource) return false;
  if (!externalSubSource) return false;
  return true;
}

//const isExternalSourceSelected = selectedRule === "externalSourceRule";


    return true;
  };

  const canSubmit = opportunityName.trim() && selectedRule && isRuleValid(selectedRule);

  // ---------- UI payload (for parent) ----------
  const buildPayload = () => ({
    opportunityName: opportunityName.trim(),
    ruleId: selectedRule,
    ruleValues: ruleValues[selectedRule] || {},
    segmentationTransaction: TX_IDS.includes(selectedRule) ? selectedRule : "",
    segmentationMasters: MS_IDS.includes(selectedRule) ? selectedRule : "",
    manualBased: { createManualLead: selectedRule === MANUAL_ID },
    // (optional) include external source if you want to persist it:
    // externalSource,
    // externalSubSource,
  });

  const getSelectedRuleMeta = () => {
    const match = ALL_RULES.find((r) => r.id === selectedRule);
    // ✅ This will now return "Manual Lead" for manualCreateLead because we added raw.code above
    const ruleCode = match?.raw?.code || "";
    return { ruleCode };
  };

  // helpers
  const labelsFromValues = (vals = []) =>
    (Array.isArray(vals) ? vals : []).map((v) => catOptions.find((o) => o.value === v)?.label || v);

  const computeWindowDays = ({ fetchType, windowSelect, fromDate, toDate }) => {
    const ft = String(fetchType || "");
    const ws = String(windowSelect || "");
    if (ft === "1") return daysBetween(fromDate, toDate) || "";
    if (isCustom(ws)) return "";
    if (isRange(ws)) return daysBetween(fromDate, toDate) || "";
    return numericDays(ws);
  };

  // Build EXACT API payload
  const buildApiPayload = (campaignDates) => {
    const { ruleCode } = getSelectedRuleMeta();
    const v = ruleValues[selectedRule] || {};

    const base = {
      request: "save",
      oppCode: "",
      oppName: opportunityName.trim(),
      ruleCode, // ✅ "Manual Lead" for manualCreateLead
      xvalue: "",
      yvalue: "",
      zValue: "",
      pvalue: "",
      ruleDetails: JSON.stringify({ id: selectedRule, vals: v }),
      ruleZFromDate: "",
      ruleZToDate: "",
      isDraft: "1",
      ruleDays: "",
      ruleType: v.fetchType ? String(v.fetchType) : "",
      ruleYFromDate: "",
      ruleYToDate: "",
      staticFromDate: "",
      staticToDate: "",
      ruleFetchType: v.fetchType ? String(v.fetchType) : "",
      ruleCustomDays: "",
      customFromDate: "22/01/2026",
      customToDate: "23/01/2026",
      campStartDate: "21/01/2026",
      campEndDate:"21/12/2026",
      noShowDays: "",
      noShowCustomDays: "",
      cancelDays: "",
      cancelCustomDays: "",
      customerSpecialDays: "",
      customerType: "",
      ExternalSource: "",
ExternalSubSource: "",

    };

    switch (selectedRule) {
      case "paidForXButNotY": {
        base.xvalue = labelsFromValues(v.categoryX).join(",");
        base.yvalue = labelsFromValues(v.categoryY).join(",");

        base.ruleDays = computeWindowDays({
          fetchType: v.fetchType,
          windowSelect: v.categoryWindow,
          fromDate: v.fromDate,
          toDate: v.toDate,
        });

        if (isCustom(v.categoryWindow)) base.ruleCustomDays = String(v.customDays || "");
        if (String(v.fetchType) === "2" && isRange(v.categoryWindow)) {
          base.customFromDate = safeDMY(v.fromDate);
          base.customToDate = safeDMY(v.toDate);
        }
        if (String(v.fetchType) === "1") {
          base.staticFromDate = safeDMY(v.fromDate);
          base.staticToDate = safeDMY(v.toDate);
        }
        break;
      }

      case "paidForXCategoryInYDays": {
        base.xvalue = labelsFromValues(v.categoryX).join(",");
        base.pvalue = labelsFromValues(v.categoryP).join(",");

        const yDays = daysBetween(v.fromDate1, v.toDate1);
        base.ruleDays = yDays || "";
        base.zValue = String(v.zDays || "");

        base.ruleYFromDate = safeDMY(v.fromDate1);
        base.ruleYToDate = safeDMY(v.toDate1);
        base.ruleZFromDate = safeDMY(v.fromDate2);
        base.ruleZToDate = safeDMY(v.toDate2);

        if (String(v.fetchType) === "1") {
          base.staticFromDate = safeDMY(v.fromDate1);
          base.staticToDate = safeDMY(v.toDate1);
        } else {
          base.customFromDate = safeDMY(v.fromDate1);
          base.customToDate = safeDMY(v.toDate1);
        }
        break;
      }

      case "noShowAppointment": {
        const nDays = computeNoShowDays(v);
        base.noShowDays = nDays;
        base.noShowCustomDays = "";

        if (String(v.fetchType) === "1") {
          base.staticFromDate = safeDMY(v.fromDate);
          base.staticToDate = safeDMY(v.toDate);
        } else if (isRange(v.windowType)) {
          base.customFromDate = safeDMY(v.fromDate);
          base.customToDate = safeDMY(v.toDate);
        }

        base.ruleDetails = `No show for ${nDays} days`;
        break;
      }

      case "cancelledAppointment": {
        if (String(v.fetchType) === "1") {
          const computedDays = daysBetween(v.fromDate, v.toDate) || "";
          base.cancelDays = "9999";
          base.cancelCustomDays = "9999";

          base.staticFromDate = safeDMY(v.fromDate);
          base.staticToDate = safeDMY(v.toDate);

          base.customFromDate = safeDMY(v.fromDate);
          base.customToDate = safeDMY(v.toDate);

          base.ruleDetails = `Cancelled appointment for ${computedDays} days`;
        } else {
          let cDays = "";
          cDays =
            (isCustom(v.windowType) ? String(v.customDays || "") : "") ||
            numericDays(v.windowType) ||
            (isRange(v.windowType) ? daysBetween(v.fromDate, v.toDate) : "");

          base.cancelDays = cDays;
          base.cancelCustomDays = isCustom(v.windowType) ? String(v.customDays || "") : "";

          if (isRange(v.windowType)) {
            base.customFromDate = safeDMY(v.fromDate);
            base.customToDate = safeDMY(v.toDate);
          }

          base.ruleDetails = `Cancelled appointment for ${cDays || "X"} days`;
        }
        break;
      }

      case "customerSpecialDay": {
        base.customerSpecialDays = String(v.dayType || "");
        if (String(v.fetchType) === "1") {
          base.staticFromDate = safeDMY(v.fromDate);
          base.staticToDate = safeDMY(v.toDate);
        } else {
          base.customFromDate = safeDMY(v.fromDate);
          base.customToDate = safeDMY(v.toDate);
        }
        base.ruleDetails = "Customer Special Day";
        break;
      }

      case "customerType": {
        base.customerType = v.type || "";
        break;
      }

    case "externalSourceRule": {
  const from = (v.extFromDate || "").toString().trim();

  const toMode = String(v.extToMode || "current"); // "current" | "custom"
  const to =
    toMode === "custom"
      ? (v.extToDate || "").toString().trim()
      : todayLocalYMD();

  const diffDays = daysBetween(from, to) || "0";

  // mandatory
  base.ruleCode = "R7";
  base.ruleDetails = "External source";

  // campaign dates
  base.campStartDate = safeDMY(from);
  base.campEndDate = safeDMY(to);

  // source mapping
  base.ExternalSource = externalSource || "";
  base.ExternalSubSource = externalSubSource || "";

  // no-show ALWAYS 0
  base.noShowDays = "0";
  base.noShowCustomDays = "";

  if (toMode === "current") {
    // ✅ Dynamic
    base.ruleType = "2";
    base.ruleFetchType = "2";
    //base.ruleDays = diffDays; -- Commented to get correct from and to dates for dynamic
    base.ruleDays = "0";
  } else {
    // ✅ Static
    base.ruleType = "1";
    base.ruleFetchType = "1";
    base.ruleDays = "0";

    // static dates (safe for backend validation)
    base.staticFromDate = safeDMY(from);
    base.staticToDate = safeDMY(to);
  }

  break;
}



      case "manualCreateLead": {
        const todayYMD = new Date().toISOString().slice(0, 10);

        const from = (v.manualFromDate || "").toString().trim();
        const to =
          String(v.manualToMode || "current") === "custom"
            ? (v.manualToDate || "").toString().trim()
            : todayYMD;

        // ✅ make it "static"
        base.ruleType = "1";
        base.ruleFetchType = "2";
        base.ruleDays = "9999";

        // ✅ IMPORTANT: send static dates as well (many backends validate these)
        base.staticFromDate = safeDMY(from);
        base.staticToDate = safeDMY(to);

        base.ruleDetails = "Create Manual Lead";

        
        break;
      }

      default:
        break;
    }

    Object.keys(base).forEach((k) => {
      if (base[k] === undefined || base[k] === null) base[k] = "";
    });

    return base;
  };

  const postCreate = async (campaignDates) => {
    const body = buildApiPayload(campaignDates);
    console.log("CreateNewOpp payload:", body);

    const res = await fetch(`${API_BASE_URL}/api/Opportunity/CreateNewOpp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    let data = null;
    let text = "";
    try {
      data = await res.json();
    } catch (_) {
      try {
        text = await res.text();
      } catch (_) {}
    }

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || text || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (data && data.success === false) {
      throw new Error(data.message || "CreateNewOpp returned success:false");
    }
    return data || {};
  };

  // ✅ UPDATED: Manual Lead should NOT open Activate Modal
  const handleActivateClick = async () => {
    setActivateErr("");

    if (!canSubmit) {
      setErrors((prev) => ({
        ...prev,
        name: !opportunityName.trim() ? "Please enter an opportunity name." : "",
        rule: !selectedRule ? "Please choose one rule." : "",
        fields:
          selectedRule && !isRuleValid(selectedRule)
            ? "Please complete the required fields for the selected rule."
            : "",
      }));
      if (!opportunityName.trim() && nameRef.current) nameRef.current.focus();
      else if (!selectedRule && rulesRef.current)
        rulesRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // ✅ Manual Create Lead: submit directly (no popup)
  // ✅ Submit directly (no popup) for:
// Manual, External Source, No Show, Cancelled
if (
  selectedRule === MANUAL_ID ||
  selectedRule === "externalSourceRule" ||
  selectedRule === "noShowAppointment" ||
  selectedRule === "cancelledAppointment"
) {
  try {
    // 1) Manual
    if (selectedRule === MANUAL_ID) {
      const v = ruleValues[MANUAL_ID] || {};
      const from = (v.manualFromDate || "").toString().trim();
      const to =
        String(v.manualToMode || "current") === "custom"
          ? (v.manualToDate || "").toString().trim()
          : todayLocalYMD();

      await postCreate({ startDate: from, endDate: to });
    }

    // 2) External Source
    else if (selectedRule === "externalSourceRule") {
      const v = ruleValues["externalSourceRule"] || {};
      const from = (v.extFromDate || "").toString().trim();
      const to =
        String(v.extToMode || "current") === "custom"
          ? (v.extToDate || "").toString().trim()
          : todayLocalYMD();

      await postCreate({ startDate: from, endDate: to });
    }

    // 3) No Show / Cancelled
    else {
      const v = ruleValues[selectedRule] || {};
      const ft = String(v.fetchType || "");

      // STATIC: campaign dates from date pickers
      if (ft === "1") {
        await postCreate({ startDate: v.fromDate, endDate: v.toDate });
      }
      // DYNAMIC: end=today, start=today-x
      else {
        const cd = computeDynamicCampaignDates(v);
        if (!cd?.startDate || !cd?.endDate) {
          setErrors((prev) => ({
            ...prev,
            fields: "Please complete the required fields for the selected rule.",
          }));
          return;
        }
        await postCreate(cd);
      }
    }

    alert("Saved.");
    onNext?.(buildPayload());
    navigate("/opportunity");
  } catch (e) {
    console.error(e);
    setErrors((prev) => ({ ...prev, fields: e.message || "Failed to save. Please try again." }));
  }
  return;
}

    // ✅ For all other rules: open campaign dates modal
    setActivateOpen(true);
  };

  const confirmActivate = async () => {
    if (!campStart || !campEnd) {
      setActivateErr("Please select both campaign start and end dates.");
      return;
    }
    if (new Date(campStart) > new Date(campEnd)) {
      setActivateErr("Start date cannot be after end date.");
      return;
    }

    try {
      await postCreate({ startDate: campStart, endDate: campEnd });
      setActivateOpen(false);
      alert("Saved (activation-style) with request:'save' and isDraft:'1'.");
      onNext?.(buildPayload());
      navigate("/opportunity");
    } catch (e) {
      console.error(e);
      setActivateErr(e.message || "Failed to save. Please try again.");
    }
  };

  // ---------- MULTISELECT ----------
  const MultiSelect = ({ label, values = [], onChange, placeholder = "None selected", disabledValues = [] }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [local, setLocal] = useState(values);
    const containerRef = useRef(null);
    const [openUpwards, setOpenUpwards] = useState(false);

    useEffect(() => {
      if (open) setLocal(values);
    }, [open, values]);

    // Detect click outside to close
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setOpen(false);
        }
      };
      if (open) document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    // Detect if dropdown should open upwards
    useEffect(() => {
      if (!open) return;
      const rect = containerRef.current?.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect) {
        const spaceBelow = viewportHeight - rect.bottom;
        setOpenUpwards(spaceBelow < 260);
      }
    }, [open]);

    const filtered = useMemo(() => {
      if (!q.trim()) return catOptions;
      const qq = q.toLowerCase();
      return catOptions.filter((o) => (o.label || "").toLowerCase().includes(qq));
    }, [q, catOptions]);

    const selectableFiltered = filtered.filter((o) => !disabledValues.includes(o.value));
    const allSelected = selectableFiltered.length > 0 && selectableFiltered.every((o) => local.includes(o.value));

    const toggleAll = () => {
      if (allSelected) {
        const toRemove = new Set(selectableFiltered.map((o) => o.value));
        setLocal((prev) => prev.filter((v) => !toRemove.has(v)));
      } else {
        const union = new Set(local);
        selectableFiltered.forEach((o) => union.add(o.value));
        setLocal(Array.from(union));
      }
    };

    const toggleOne = (v) => {
      if (disabledValues.includes(v)) return;
      setLocal((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
    };

    const closeWithCommit = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(local);
      setTimeout(() => setOpen(false), 100);
    };

    const shown = open ? local : values;
    const buttonLabel =
      shown.length === 0
        ? placeholder
        : shown.length === 1
        ? catOptions.find((o) => o.value === shown[0])?.label ?? placeholder
        : `${shown.length} selected`;

    return (
      <div className="msel" data-msel tabIndex={0} ref={containerRef}>
        <span className="rf-label">{label}</span>
        <button
          className="msel-btn"
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((v) => !v)}
        >
          {buttonLabel}
          <span className="msel-caret">▾</span>
        </button>

        {open && (
          <div
            className={`msel-dd ${openUpwards ? "msel-up" : ""}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="msel-search">
              <input
                placeholder="Search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="msel-search-input"
                onPointerDown={(e) => e.stopPropagation()}
              />
              <button className="msel-clear" type="button" onClick={() => setQ("")}>
                ✕
              </button>
            </div>

            <div className="msel-row msel-selectall" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                onMouseDown={(e) => e.preventDefault()}
              />
              <span>Select all</span>
            </div>

            <div className="msel-list">
              {catLoading ? (
                <div className="msel-empty">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="msel-empty">No results</div>
              ) : (
                filtered.map((opt) => {
                  const isDisabled = disabledValues.includes(opt.value);
                  const checked = local.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      className={`msel-row ${isDisabled ? "msel-disabled" : ""}`}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <input
                        className="msel-opt"
                        data-val={opt.value}
                        type="checkbox"
                        checked={checked}
                        disabled={isDisabled}
                        onChange={() => toggleOne(opt.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>{opt.label}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="msel-footer">
              <button
                type="button"
                className="msel-done"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={closeWithCommit}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---------- Shared row: Rule Data Fetch Type ----------
  const FetchTypeRow = ({ ruleId, vals }) => (
    <div className="rf-grid" style={{ alignItems: "center", marginBottom: 8 }}>
      <label className="rf-field">
        <span className="rf-label">Segment</span>
        <select
          className="rf-input"
          value={vals.fetchType || ""}
          onChange={(e) => setField(ruleId, "fetchType", e.target.value)}
        >
          <option value="">Select</option>
          <option value="1">Static</option>
          <option value="2">Dynamic</option>
        </select>
      </label>
    </div>
  );

  // ---------- RULE FORMS ----------
  const RuleForm = ({ ruleId }) => {
    if (!ruleId) return null;
    const v = ruleValues[ruleId] || {};
    const isStatic = String(v.fetchType) === "1";

    switch (ruleId) {
      case "paidForXButNotY":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid">
              <MultiSelect
                label="Paid for"
                values={v.categoryX}
                onChange={(arr) => setField(ruleId, "categoryX", arr)}
              />
              <MultiSelect
                label="Category but not for"
                values={v.categoryY}
                onChange={(arr) => setField(ruleId, "categoryY", arr)}
                disabledValues={v.categoryX}
              />

              {/* Hide the days dropdown entirely for STATIC */}
              {!isStatic && (
                <div className="rf-grid" style={{ alignItems: "center", marginBottom: 8 }}>
                  <label className="rf-field">
                    <span className="rf-label">Category for</span>
                    <select
                      className="rf-input"
                      value={v.categoryWindow}
                      onChange={(e) => {
                        const val = e.target.value;
                        setField(ruleId, "categoryWindow", val);
                        if (!isCustom(val)) setField(ruleId, "customDays", "");
                        if (!isRange(val)) {
                          setField(ruleId, "fromDate", "");
                          setField(ruleId, "toDate", "");
                        }
                      }}
                    >
                      <option value="">Select</option>
                      <option value="1">Past 1 day</option>
                      <option value="7">Past 1 Week</option>
                      <option value="30">Past 1 Month</option>
                      <option value="90">Past 3 Month</option>
                      <option value="0">Custom</option>
                      {String(v.fetchType) === "2" && <option value="9999">Date Range</option>}
                    </select>
                    <span className="rf-label">days</span>
                  </label>

                  {isCustom(v.categoryWindow) && (
                    <label className="rf-field">
                      <span className="rf-label">days</span>
                      <input
                        className="rf-input"
                        type="number"
                        min="1"
                        placeholder="e.g., 7"
                        value={v.customDays}
                        onChange={(e) => setField(ruleId, "customDays", e.target.value)}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Date inputs */}
              {isStatic ? (
                <div className="rf-grid" style={{ alignItems: "center" }}>
                  <label className="rf-field">
                    <span className="rf-label">From</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.fromDate}
                      onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                    />
                  </label>
                  <label className="rf-field">
                    <span className="rf-label">To</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.toDate}
                      onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                    />
                  </label>
                </div>
              ) : (
                isRange(v.categoryWindow) && (
                  <div className="rf-grid" style={{ alignItems: "center" }}>
                    <label className="rf-field">
                      <span className="rf-label">From</span>
                      <input
                        type="date"
                        className="rf-input"
                        value={v.fromDate}
                        onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                      />
                    </label>
                    <label className="rf-field">
                      <span className="rf-label">To</span>
                      <input
                        type="date"
                        className="rf-input"
                        value={v.toDate}
                        onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                      />
                    </label>
                  </div>
                )
              )}
            </div>
          </>
        );

      case "paidForXCategoryInYDays":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid" style={{ marginBottom: 10 }}>
              <MultiSelect
                label="Paid for Category (X)"
                values={v.categoryX}
                onChange={(arr) => setField(ruleId, "categoryX", arr)}
              />
              <label className="rf-field">
                <span className="rf-label">From Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={v.fromDate1}
                  onChange={(e) => setField(ruleId, "fromDate1", e.target.value)}
                />
              </label>
              <label className="rf-field">
                <span className="rf-label">To Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={v.toDate1}
                  onChange={(e) => setField(ruleId, "toDate1", e.target.value)}
                />
              </label>
              <label className="rf-field">
                <span className="rf-label">Z Days</span>
                <input
                  type="number"
                  min="1"
                  className="rf-input"
                  value={v.zDays}
                  onChange={(e) => setField(ruleId, "zDays", e.target.value)}
                  placeholder="e.g., 14"
                />
              </label>
              <span className="rf-inline-note">No future appointment window</span>
            </div>

            <div className="rf-grid">
              <label className="rf-field">
                <span className="rf-label">From Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={v.fromDate2}
                  onChange={(e) => setField(ruleId, "fromDate2", e.target.value)}
                />
              </label>
              <label className="rf-field">
                <span className="rf-label">To Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={v.toDate2}
                  onChange={(e) => setField(ruleId, "toDate2", e.target.value)}
                />
              </label>
              <MultiSelect
                label="Category (P)"
                values={v.categoryP}
                onChange={(arr) => setField(ruleId, "categoryP", arr)}
              />
            </div>
          </>
        );

      case "noShowAppointment":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid" style={{ alignItems: "center" }}>
              {String(v.fetchType) !== "1" && (
                <label className="rf-field">
                  <span className="rf-label">No show appointment for</span>
                  <select
                    className="rf-input"
                    value={v.windowType}
                    onChange={(e) => {
                      const t = e.target.value;
                      setField(ruleId, "windowType", t);
                      if (!isCustom(t)) setField(ruleId, "customDays", "");
                      if (!isRange(t)) {
                        setField(ruleId, "fromDate", "");
                        setField(ruleId, "toDate", "");
                      }
                    }}
                  >
                    <option value="">Select</option>
                    <option value="1">Past 1 day</option>
                    <option value="7">Past 1 Week</option>
                    <option value="30">Past 1 Month</option>
                    <option value="90">Past 3 Month</option>
                    <option value="0">Custom</option>
                    {String(v.fetchType) === "2" && <option value="9999">Date Range</option>}
                  </select>
                </label>
              )}

              {isCustom(v.windowType) && String(v.fetchType) !== "1" && (
                <>
                  <span className="rf-label">days</span>
                  <input
                    className="rf-input"
                    type="number"
                    min="1"
                    placeholder="e.g., 7"
                    value={v.customDays}
                    onChange={(e) => setField(ruleId, "customDays", e.target.value)}
                  />
                </>
              )}

              {(String(v.fetchType) === "1" || isRange(v.windowType)) && (
                <>
                  <label className="rf-field">
                    <span className="rf-label">From</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.fromDate}
                      onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                    />
                  </label>
                  <label className="rf-field">
                    <span className="rf-label">To</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.toDate}
                      onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>
          </>
        );

      case "cancelledAppointment":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid" style={{ alignItems: "center" }}>
              {String(v.fetchType) !== "1" && (
                <label className="rf-field">
                  <span className="rf-label">Cancelled appointment for</span>
                  <select
                    className="rf-input"
                    value={v.windowType}
                    onChange={(e) => {
                      const t = e.target.value;
                      setField(ruleId, "windowType", t);
                      if (!isCustom(t)) setField(ruleId, "customDays", "");
                      if (!isRange(t)) {
                        setField(ruleId, "fromDate", "");
                        setField(ruleId, "toDate", "");
                      }
                    }}
                  >
                    <option value="">Select</option>
                    <option value="1">Past 1 day</option>
                    <option value="7">Past 1 Week</option>
                    <option value="30">Past 1 Month</option>
                    <option value="90">Past 3 Month</option>
                    <option value="0">Custom</option>
                    {String(v.fetchType) === "2" && <option value="9999">Date Range</option>}
                  </select>
                </label>
              )}

              {isCustom(v.windowType) && String(v.fetchType) !== "1" && (
                <>
                  <span className="rf-label">days</span>
                  <input
                    className="rf-input"
                    type="number"
                    min="1"
                    placeholder="e.g., 7"
                    value={v.customDays}
                    onChange={(e) => setField(ruleId, "customDays", e.target.value)}
                  />
                </>
              )}

              {(String(v.fetchType) === "1" || isRange(v.windowType)) && (
                <>
                  <label className="rf-field">
                    <span className="rf-label">From</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.fromDate}
                      onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                    />
                  </label>
                  <label className="rf-field">
                    <span className="rf-label">To</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.toDate}
                      onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>
          </>
        );

      case "customerSpecialDay":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid">
              <label className="rf-field">
                <span className="rf-label">Days</span>
                <input
                  type="number"
                  min="1"
                  className="rf-input"
                  value={v.dayType}
                  onChange={(e) => setField(ruleId, "dayType", e.target.value)}
                  placeholder="e.g., 30"
                />
              </label>
              <label className="rf-field">
                <span className="rf-label">From Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={v.fromDate}
                  onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                />
              </label>
              <label className="rf-field">
                <span className="rf-label">To Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={v.toDate}
                  onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                />
              </label>
            </div>
          </>
        );

      case "customerType":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid">
              <label className="rf-field">
                <span className="rf-label">Customer type</span>
                <select
                  className="rf-input"
                  value={v.type}
                  onChange={(e) => setField(ruleId, "type", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="New">New</option>
                  <option value="Existing">Existing</option>
                </select>
              </label>
            </div>
          </>
        );

        case "externalSourceRule":
  return (
    <>
      {/* ✅ Source/Sub Source row */}
      <div className="rf-grid" style={{ alignItems: "center", marginBottom: 10 }}>
        <label className="rf-field" style={{ width: "320px" }}>
          <span className="rf-label">External Medium</span>
          <select
            className="rf-input"
            style={{ width: "auto" }}
            value={externalSource}
            onChange={(e) => setExternalSource(e.target.value)}
          >
            {EXTERNAL_SOURCE_OPTIONS.map((o) => (
              <option key={o.value || "blank"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="rf-field" style={{ width: "320px" }}>
          <span className="rf-label">External Sub Medium</span>
          <select
            className="rf-input"
            style={{ width: "auto" }}
            value={externalSubSource}
            onChange={(e) => setExternalSubSource(e.target.value)}
            disabled={!externalSource}
          >
            {subSourceOptions.map((o) => (
              <option key={o.value || "blank"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ✅ Dates row (like manual) */}
      <div className="rf-grid" style={{ alignItems: "center" }}>
        <label className="rf-field">
          <span className="rf-label">From Date</span>
          <input
            type="date"
            className="rf-input"
            value={v.extFromDate || ""}
            onChange={(e) => setField(ruleId, "extFromDate", e.target.value)}
          />
        </label>

        <label className="rf-field">
          <span className="rf-label">To Date</span>
          <select
            className="rf-input"
            value={v.extToMode || "current"}
            onChange={(e) => {
              const mode = e.target.value;
              setField(ruleId, "extToMode", mode);
              if (mode !== "custom") setField(ruleId, "extToDate", "");
            }}
          >
            <option value="current">Current Date</option>
            <option value="custom">Custom Date</option>
          </select>
        </label>

        {String(v.extToMode || "current") === "custom" && (
          <label className="rf-field">
            <span className="rf-label">To Date</span>
            <input
              type="date"
              className="rf-input"
              value={v.extToDate || ""}
              onChange={(e) => setField(ruleId, "extToDate", e.target.value)}
            />
          </label>
        )}
      </div>
    </>
  );



      case "manualCreateLead":
        return (
          <>
            <div className="rf-grid" style={{ alignItems: "center" }}>
              <label className="rf-field">
                <span className="rf-label">From Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={v.manualFromDate || ""}
                  onChange={(e) => setField(ruleId, "manualFromDate", e.target.value)}
                />
              </label>

              <label className="rf-field">
                <span className="rf-label">To Date</span>
                <select
                  className="rf-input"
                  value={v.manualToMode || "current"}
                  onChange={(e) => {
                    const mode = e.target.value;
                    setField(ruleId, "manualToMode", mode);
                    if (mode !== "custom") setField(ruleId, "manualToDate", "");
                  }}
                >
                  <option value="current">Current Date</option>
                  <option value="custom">Custom Date</option>
                </select>
              </label>

              {String(v.manualToMode || "current") === "custom" && (
                <label className="rf-field">
                  <span className="rf-label">To Date</span>
                  <input
                    type="date"
                    className="rf-input"
                    value={v.manualToDate || ""}
                    onChange={(e) => setField(ruleId, "manualToDate", e.target.value)}
                  />
                </label>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <style jsx>{`
        .wrap { min-height: 100vh; padding: 16px 16px 80px; }
        .hdr { margin-bottom: 16px; }
        .ttl { font-size: 22px; font-weight: 700; margin: 0 0 20px; color: #1f2937; }
        .crumb { color: #6b7280; font-size: 13px; }
        .crumb span { cursor: pointer; text-decoration: underline; }

        .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .row { margin-bottom: 12px; }
        .label { font-weight: 600; color: #374151; margin-bottom: 6px; display: inline-block; }
        .input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .input:focus { outline: none; border-color: #334b71; box-shadow: 0 0 0 3px rgba(51,75,113,.15); }

        .banner { display:flex; align-items:flex-start; gap:10px; margin:14px 0; padding:10px 12px; background:#eef6ff; border:1px solid #c7e1ff; color:#0f3566; border-radius:8px; font-size:13px; }
        .i { width:16px; height:16px; border-radius:50%; border:1px solid #9cc6ff; display:inline-flex; align-items:center; justify-content:center; font-weight:700; }
        .clear { margin-left:auto; font-size:12px; color:#334b71; text-decoration:underline; cursor:pointer; }

        .section { padding:0; border: 1px solid #e5e7eb; border-radius: 10px; margin-top: 14px; overflow: hidden; }
        .s-head { background:#f9fafb; border-bottom:1px solid #e5e7eb; padding: 10px 14px; font-weight:700; color:#111827; }
        .s-body { padding: 14px; }

        .cards { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        @media (max-width: 900px) { .cards { grid-template-columns: 1fr; } }

        .card { position:relative; border:1px solid #e5e7eb; border-radius:10px; padding:12px 12px 12px 44px; cursor:pointer; background:#fff; transition: border-color .15s, box-shadow .15s; }
        .card:hover { border-color:#cbd5e1; }
        .card:focus-within { border-color:#334b71; box-shadow:0 0 0 3px rgba(51,75,113,.15); }
        .selected { border-color:#334b71; box-shadow:0 0 0 3px rgba(51,75,113,.12); }
        .dot { position:absolute; left:12px; top:12px; width:18px; height:18px; border-radius:50%; border:2px solid #9ca3af; }
        .selected .dot { border-color:#334b71; box-shadow: inset 0 0 0 4px #334b71; }
        .ctitle { font-weight:600; color:#111827; font-size:14px;white-space: nowrap; }
        .cdesc { font-size:12px; color:#4b5563; margin-top:2px; }
        .help { margin-left:6px; font-size:12px; border:1px solid #d1d5db; border-radius:50%; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; cursor:help; }

        .rf { font-size: 16px; margin-top: 14px; border:1px dashed #d1d5db; border-radius:10px; padding:14px; background:#fcfcff; }
        .rf-title { font-weight:700; color:#111827; margin-bottom:15px; }
        .rf-grid { display:flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .rf-field { display:flex; align-items: center; gap:6px; }
        .rf-label { font-size:12px; color:#374151; }
        .rf-input { padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; }
        .rf-input:focus { outline:none; border-color:#334b71; box-shadow: 0 0 0 3px rgba(51,75,113,.15); }
        .rf-inline-note { margin:8px 0; font-size:13px; color:#4b5563; }

        .err { color:#b91c1c; font-size:12px; margin-top:6px; }
        .actions { margin-top: 16px; display:flex; gap:10px; justify-content:flex-end; }
        .btn { padding:10px 18px; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
        .back { background:#6b7280; color:#fff; }
        .save { background:#334b71; color:#fff; opacity:1; }
        .save[disabled] { opacity:.5; cursor:not-allowed; }

        /* MultiSelect */
        .msel { position: relative; display:flex; align-items:center; gap:8px; }
        .msel-btn { padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; background:#fff; cursor:pointer; min-width:220px; text-align:left; }
        .msel-btn:focus { outline:none; border-color:#334b71; box-shadow:0 0 0 3px rgba(51,75,113,.15); }
        .msel-caret { float:right; }
        .msel-dd { position:absolute; z-index:9999; top:100%; left:0; margin-top:6px; width:320px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,.12); padding:8px; max-height:360px; overflow:hidden; display:flex; flex-direction:column; }
        .msel-search { display:flex; gap:6px; padding:6px; border-bottom:1px solid #eee; }
        .msel-search-input { flex:1; border:1px solid #d1d5db; border-radius:6px; padding:8px; }
        .msel-clear { border:1px solid #d1d5db; background:#fff; border-radius:6px; padding:0 8px; }
        .msel-row { display:flex; gap:8px; align-items:center; padding:6px 8px; }
        .msel-selectall { font-weight:600; }
        .msel-list { overflow:auto; max-height:220px; padding-right:4px; }
        .msel-empty { padding:10px; color:#6b7280; }
        .msel-disabled { opacity:0.5; cursor:not-allowed; }
        .msel-footer { border-top:1px solid #eee; padding:8px; display:flex; justify-content:flex-end; }
        .msel-done { padding:6px 10px; border:1px solid #d1d5db; background:#fff; border-radius:6px; cursor:pointer; font-size:12px; }
        .msel-done:focus { outline:none; border-color:#334b71; box-shadow:0 0 0 3px rgba(51,75,113,.15); }
        .msel-up { bottom: 100%; top: auto; margin-top: 0; margin-bottom: 6px; }

        /* Activate Modal */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 99999; }
        .modal { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.16); padding: 16px; width: 100%; max-width: 420px; }
        .modal-title { font-weight: 700; color: #111827; margin-bottom: 12px; font-size: 16px; }
        .modal-row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
        .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top: 8px; }
        .modal-err { color:#b91c1c; font-size:12px; margin-top:4px; }
      `}</style>

      <div className="wrap">
        <div className="hdr">
          <h1 className="ttl">Opportunity</h1>
          <div className="crumb">
            <span onClick={() => navigate(-1)}>Opportunity</span> &nbsp;&gt;&nbsp; {mode === "create" ? "Create" : "Details"}
          </div>
        </div>

        <div className="panel">
          <div className="row">
            <label className="label" htmlFor="oppName">Opportunity Name</label>
            <input
              id="oppName"
              className="input"
              value={opportunityName}
              onChange={(e) => {
                setOpportunityName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              ref={nameRef}
              placeholder="Enter opportunity name"
            />
            {errors.name ? <div className="err">{errors.name}</div> : null}
          </div>

          <div className="banner">
            <span className="i">i</span>
            <span><strong>Choose exactly one rule</strong> below. The form for that rule will appear inline.</span>
            {selectedRule ? <span className="clear" onClick={clearSelection}>Clear selection</span> : null}
          </div>

          {/* RULE SELECTION */}
          <div ref={rulesRef}>
            <div className="section">
              <div className="s-head">+ Segmentation Based on Transaction</div>
              <div className="s-body">
                {rulesLoading && transactionRules.length === 0 ? (
                  <div className="banner"><span className="i">i</span> Loading transaction rules…</div>
                ) : (
                  <div className="cards" role="radiogroup" aria-label="Transaction rules">
                    {transactionRules.map((r) => {
                      const sel = selectedRule === r.id;
                      return (
                        <label
                          key={r.id}
                          className={`card ${sel ? "selected" : ""}`}
                          htmlFor={`rule-${r.id}`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              selectRule(r.id);
                            }
                          }}
                        >
                          <input
                            id={`rule-${r.id}`}
                            className="sr"
                            type="radio"
                            name="globalRule"
                            checked={sel}
                            onChange={() => selectRule(r.id)}
                            style={{ position: "absolute", opacity: 0 }}
                          />
                          <span className="dot" aria-hidden="true" />
                          <div className="ctitle">
                            {r.title} {r.help ? <span className="help" title={r.help}>i</span> : null}
                          </div>
                          <div className="cdesc">{r.desc}</div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="section">
              <div className="s-head">+ Segmentation Based on Masters</div>
              <div className="s-body">
                {rulesLoading && masterRules.length === 0 ? (
                  <div className="banner"><span className="i">i</span> Loading master rules…</div>
                ) : (
                  <div className="cards" role="radiogroup" aria-label="Master rules">
                    {masterRules.map((r) => {
                      const sel = selectedRule === r.id;
                      return (
                        <label
                          key={r.id}
                          className={`card ${sel ? "selected" : ""}`}
                          htmlFor={`rule-${r.id}`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              selectRule(r.id);
                            }
                          }}
                        >
                          <input
                            id={`rule-${r.id}`}
                            className="sr"
                            type="radio"
                            name="globalRule"
                            checked={sel}
                            onChange={() => selectRule(r.id)}
                            style={{ position: "absolute", opacity: 0 }}
                          />
                          <span className="dot" aria-hidden="true" />
                          <div className="ctitle">{r.title}</div>
                          <div className="cdesc">{r.desc}</div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="section">
  <div className="s-head">+ External Source</div>
  <div className="s-body">
    <div className="cards" role="radiogroup" aria-label="External source rules">
  {externalRules.map((r) => {
    const sel = selectedRule === r.id;
    return (
      <label
        key={r.id}
        className={`card ${sel ? "selected" : ""}`}
        htmlFor={`rule-${r.id}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectRule(r.id);
          }
        }}
      >
        <input
          id={`rule-${r.id}`}
          className="sr"
          type="radio"
          name="globalRule"
          checked={sel}
          onChange={() => selectRule(r.id)}
          style={{ position: "absolute", opacity: 0 }}
        />
        <span className="dot" aria-hidden="true" />
        <div className="ctitle">{r.title}</div>
        <div className="cdesc">{r.desc}</div>
      </label>
    );
  })}
</div>

  </div>
</div>


            <div className="section">
              <div className="s-head">+ Create Manual Lead/Opportunity:</div>
              <div className="s-body">
                <div className="cards" role="radiogroup" aria-label="Manual rules">
                  {manualRules.map((r) => {
                    const sel = selectedRule === r.id;
                    return (
                      <label
                        key={r.id}
                        className={`card ${sel ? "selected" : ""}`}
                        htmlFor={`rule-${r.id}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectRule(r.id);
                          }
                        }}
                      >
                        <input
                          id={`rule-${r.id}`}
                          className="sr"
                          type="radio"
                          name="globalRule"
                          checked={sel}
                          onChange={() => selectRule(r.id)}
                          style={{ position: "absolute", opacity: 0 }}
                        />
                        <span className="dot" aria-hidden="true" />
                        <div className="ctitle">Create Manual Lead/Opportunity</div>
                        <div className="cdesc">{r.desc}</div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* INLINE RULE FORM */}
          {selectedRule ? (
            <div className="rf" aria-live="polite" ref={formRef}>
              <div className="rf-title">
                Selected Rule:&nbsp;{ALL_RULES.find((r) => r.id === selectedRule)?.title || selectedRule}
              </div>
              <RuleForm ruleId={selectedRule} />
              {errors.fields ? <div className="err">{errors.fields}</div> : null}
            </div>
          ) : null}

          {/* Actions */}
          <div className="actions">
            <button className="btn back" type="button" onClick={onBack}>Back</button>
            <button className="btn save" type="button" onClick={handleActivateClick} disabled={!canSubmit}>Activate</button>
          </div>
        </div>
      </div>

      {/* ✅ UPDATED: Modal will never show for Manual Lead */}
      {activateOpen &&
  ![MANUAL_ID, "externalSourceRule", "noShowAppointment", "cancelledAppointment"].includes(selectedRule) && (

        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-title">Set Campaign Dates</div>
            <div className="modal-row">
              <label className="rf-field" style={{ flex: 1 }}>
                <span className="rf-label">Start Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={campStart}
                  onChange={(e) => {
                    setCampStart(e.target.value);
                    setActivateErr("");
                  }}
                />
              </label>
              <label className="rf-field" style={{ flex: 1 }}>
                <span className="rf-label">End Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={campEnd}
                  onChange={(e) => {
                    setCampEnd(e.target.value);
                    setActivateErr("");
                  }}
                />
              </label>
            </div>
            {activateErr ? <div className="modal-err">{activateErr}</div> : null}
            <div className="modal-actions">
              <button className="btn back" type="button" onClick={() => setActivateOpen(false)}>Cancel</button>
              <button className="btn save" type="button" onClick={confirmActivate}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OpportunityForm;
