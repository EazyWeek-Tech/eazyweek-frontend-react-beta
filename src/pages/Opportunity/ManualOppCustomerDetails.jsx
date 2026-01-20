// src/pages/Opportunity/ManualOppCustomerDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/** ---------------- Helpers ---------------- */
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const norm = (v) => safe(v).trim().toLowerCase();
const pad2 = (n) => String(n).padStart(2, "0");

/** ✅ Defaults for Follow-up */
const DEFAULT_FOLLOWUP_TIME_LABEL = "01:30 PM";

// ✅ Campaign
const GET_CAMPAIGN_URL = (oppCode) =>
  `${API_BASE_URL}/api/LeadOpp/getCampaign/${encodeURIComponent(oppCode)}`;

// ✅ robust oppCode resolver (works even if params not present)
const getOppCodeFromUrl = (paramsOppCode, location) => {
  const direct = safe(paramsOppCode).trim();
  if (direct) return direct;

  const parts = (location?.pathname || "").split("/").filter(Boolean);
  // expecting: ["manuallead", "Bright-00522", "BRI197?"]
  const idx = parts.findIndex((p) => norm(p) === "manuallead");
  return idx >= 0 ? safe(parts[idx + 1]).trim() : "";
};



/** ✅ Local date/time formatter (NO UTC / NO 'Z') */
const toLocalDateTimeString = (dateObj) => {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (Number.isNaN(+d)) return "";
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`; // ✅ no Z
};

const getTomorrowInputDate = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // yyyy-MM-dd
};

function toInputDate(value) {
  if (!value) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [d, m, y] = value.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const d = new Date(value);
    if (!isNaN(d)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch {}
  return "";
}

// ---- Safe JSON helper (handles session-expired HTML / non-JSON) ----
const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 180)}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!/application\/json/i.test(ct)) {
    if (/session/i.test(text) || /login/i.test(text) || text.startsWith("<!DOCTYPE")) {
      throw new Error("Session expired or non-JSON response from server.");
    }
    throw new Error(`Expected JSON but got: ${text.slice(0, 180)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse JSON: ${text.slice(0, 180)}`);
  }
};

/** ---------------- Follow-up History helpers ---------------- */
const FOLLOWUP_HISTORY_URL = (leadId) =>
  `${API_BASE_URL}/api/LeadOpp/getLeadFollowUpList?leadId=${encodeURIComponent(leadId)}`;

const formatFollowUpDateDDMMYY = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const formatTimeSpanTo12Hr = (timeStr) => {
  // "13:30:00" -> "1:30 PM"
  const t = safe(timeStr).trim();
  if (!t) return "";
  const parts = t.split(":");
  const hh = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return "";

  const ampm = hh >= 12 ? "PM" : "AM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${hour12}:${pad2(mm)} ${ampm}`;
};


const resolveMediumValueFromSeervices = (mediumOptions, seervices) => {
  const s = safe(seervices).trim().toLowerCase();
  if (!s) return "";

  const exactLabel = (mediumOptions || []).find((o) => norm(o.label) === s);
  if (exactLabel) return safe(exactLabel.value);

  const exactCode = (mediumOptions || []).find((o) => norm(o.code) === s);
  if (exactCode) return safe(exactCode.value);

  const contains = (mediumOptions || []).find((o) => norm(o.label).includes(s) || s.includes(norm(o.label)));
  return contains ? safe(contains.value) : "";
};

// ✅ Send DATE ONLY (no timezone conversion possible)
const toFollowUpDateOnly = (yyyyMmDd) => {
  const minAllowed = getTomorrowInputDate();
  let dateStr = safe(yyyyMmDd).trim() || minAllowed;
  if (dateStr < minAllowed) dateStr = minAllowed;
  return dateStr; // "YYYY-MM-DD"
};


// ✅ TimeSpan friendly converter from "hh:mm AM/PM" => "HH:mm:ss" or null
const toTimeSpanOrNull = (timeLabel) => {
  const s = safe(timeLabel).trim();
  if (!s) return null;

  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;

  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = String(m[3]).toUpperCase();

  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  if (ap === "PM" && hh !== 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
};

const getCustomerIdFromUrl = (custIdParam, location) => {
  const direct = safe(custIdParam).trim();
  if (direct) return direct;

  const parts = (location?.pathname || "").split("/").filter(Boolean);
  return safe(parts[parts.length - 1]).trim();
};

const isValidEmail = (email) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const toNumberOr0 = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

// ✅ Strip LD- and leading zeroes for edit endpoint
const stripProspectId = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;

  const s = String(v).trim();
  const noPrefix = s.replace(/^LD-/i, "");
  const numeric = noPrefix.replace(/^0+/, "");
  const id = Number(numeric);
  return Number.isNaN(id) ? 0 : id;
};

const findOptionLabelByValue = (options, value) => {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const opt = (options || []).find((o) => String(o.value ?? "").trim() === v);
  return safe(opt?.label).trim();
};

const parseTimeToForm = (timeStr) => {
  const t = safe(timeStr).trim();
  if (!t) return "";

  const parts = t.split(":");
  let hh = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return "";

  const ampm = hh >= 12 ? "PM" : "AM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${String(hour12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ampm}`;
};

// Time dropdown options: "12:00 AM" ... "11:30 PM"
const TIME_OPTIONS = (() => {
  const out = [{ label: "--", value: "" }];
  for (let h24 = 0; h24 < 24; h24++) {
    for (const m of [0, 30]) {
      const ampm = h24 >= 12 ? "PM" : "AM";
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      const label = `${pad2(h12)}:${pad2(m)} ${ampm}`;
      out.push({ label, value: label });
    }
  }
  return out;
})();

// Lead ID generators (unchanged)
const pad8 = (n) => String(n).padStart(8, "0");
const nextLeadId = (kind) => {
  const counterKey = kind === "External" ? "ew_lead_counter_external" : "ew_lead_counter_manual";
  const current = parseInt(localStorage.getItem(counterKey) || "0", 10) || 0;
  const next = current + 1;
  localStorage.setItem(counterKey, String(next));
  return `LD-${pad8(next)}`;
};

/** ---------------- Defaults ---------------- */
const LANG_INIT = ["Arabic", "English"];

// ✅ APIs
const MASTER_LEAD_URL = `${API_BASE_URL}/api/Master/GetMasterDataLead`;
const FETCH_CUSTOMER_URL = `${API_BASE_URL}/api/Customer/FetchCustomerDetails`;
const SUBSOURCE_URL = `${API_BASE_URL}/api/Opportunity/OppSubSource`;
const DISPOSITION_URL = `${API_BASE_URL}/api/Disposition/List`;
const SUBDISPOSITION_URL = `${API_BASE_URL}/api/Disposition/SubDispositionList`;
const LEAD_SUBSTATUS_URL = (statusCode) => `${API_BASE_URL}/api/Opportunity/OppLeadSubStatus/${encodeURIComponent(statusCode)}`;
const CREATE_OPP_URL = `${API_BASE_URL}/api/LeadOpp/createOpp`;

const GET_LEAD_URL = (id) => `${API_BASE_URL}/api/LeadOpp/getLead/${id}`;
const UPDATE_LEAD_URL = (id) => `${API_BASE_URL}/api/LeadOpp/lead/update/${id}`;

// ✅ Employees
const EMPLOYEES_URL = `${API_BASE_URL}/api/Employees`;

const LS_NEW_LEAD_KEY = (oppCode) => `EW_OPP_NEW_LEAD_${oppCode}`;

// Logged-in user
const getLoggedInUser = () => {
  const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const pickUserIdentity = (u) => {
  const employeeCode = u?.userId || u?.employeeCode || u?.empCode || u?.EmployeeCode || u?.EmpCode || "";
  const name =
    u?.employeeName ||
    u?.fullName ||
    `${safe(u?.firstName)} ${safe(u?.lastName)}`.trim() ||
    u?.name ||
    "";
  const email = u?.emailID || u?.email || u?.EmailID || u?.Email || "";

  return {
    employeeCode: safe(employeeCode).trim(),
    email: safe(email).trim(),
    name: safe(name).trim(),
  };
};

/** ---------------- Component ---------------- */
const ManualOppCustomerDetails = () => {
  const params = useParams();
  const oppCode = params.oppCode;
  const custId = params.custId ?? params.custid ?? "";
  const leadOppIdParam = params.leadOppId || params.id || params.leadOpp_ID || "";

  const locationObj = useLocation();
  const { state } = locationObj;
  const navigate = useNavigate();

  const resolvedOppCode = useMemo(
  () => getOppCodeFromUrl(params.oppCode, locationObj),
  [params.oppCode, locationObj.pathname]
);

const [campaignRecId, setCampaignRecId] = useState(0);
const [campaignLoading, setCampaignLoading] = useState(false);


  const row = state?.row || null;
  const leadOppIdFromState = state?.leadOpp_ID ?? state?.leadOppId ?? state?.id ?? row?.leadOpp_ID ?? row?.leadOppId;

  const numericLeadOppId = useMemo(() => {
    const fromParam = stripProspectId(leadOppIdParam);
    if (fromParam) return fromParam;
    const fromState = stripProspectId(leadOppIdFromState);
    return fromState || 0;
  }, [leadOppIdParam, leadOppIdFromState]);

  const isEdit = !!numericLeadOppId;

  const leadKind = state?.leadKind || "Manual";
  const [leadId] = useState(() => nextLeadId(leadKind));
  const [langOptions] = useState(LANG_INIT);

  /** ✅ Minimum allowed date for picker (tomorrow only) */
  const minFollowUpDate = useMemo(() => getTomorrowInputDate(), []);

  /** ---- Employees ---- */
  const [employees, setEmployees] = useState([]);
  const [salesOwnerRecId, setSalesOwnerRecId] = useState(0);

  const empLookup = useMemo(() => {
    const byCode = new Map();
    const byEmail = new Map();
    const byName = new Map();
    for (const e of employees) {
      const recId = toNumberOr0(e?.recId);
      if (!recId) continue;
      const codeKey = norm(e?.employeeCode);
      const emailKey = norm(e?.emailID);
      const nameKey = norm(e?.employeeName);
      if (codeKey) byCode.set(codeKey, recId);
      if (emailKey) byEmail.set(emailKey, recId);
      if (nameKey) byName.set(nameKey, recId);
    }
    return { byCode, byEmail, byName };
  }, [employees]);

  const resolveEmpRecId = ({ employeeCode, email, name }) => {
    const ck = norm(employeeCode);
    if (ck && empLookup.byCode.has(ck)) return empLookup.byCode.get(ck);
    const ek = norm(email);
    if (ek && empLookup.byEmail.has(ek)) return empLookup.byEmail.get(ek);
    const nk = norm(name);
    if (nk && empLookup.byName.has(nk)) return empLookup.byName.get(nk);
    return 0;
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const data = await fetchJSON(EMPLOYEES_URL, { method: "GET" });
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        if (!alive) return;
        setEmployees(list);

        const u = getLoggedInUser();
        const ident = pickUserIdentity(u);
        const recId = resolveEmpRecId(ident);
        setSalesOwnerRecId(toNumberOr0(recId));
      } catch (e) {
        console.error("❌ Employees load failed:", e);
      }
    };
    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ---- Option lists ---- */
  const [doctorOptions, setDoctorOptions] = useState([{ label: "< - Select one - >", value: "" }]);
  const [mediumOptions, setMediumOptions] = useState([{ label: "< - Select one - >", value: "" }]);
  const [sourceOptions, setSourceOptions] = useState([{ label: "< - Select one - >", value: "" }]);
  const [verticalOptions, setVerticalOptions] = useState([{ label: "< - Select one - >", value: "" }]);
  const [centerOptions, setCenterOptions] = useState([{ label: "< - Select one - >", value: "" }]);
  const [subSourceOptions, setSubSourceOptions] = useState([{ label: "< - Select one - >", value: "" }]);
  const [dispositionOptions, setDispositionOptions] = useState([{ label: "< - Select one - >", value: "" }]);
  const [subDispositionOptions, setSubDispositionOptions] = useState([{ label: "< - Select one - >", value: "" }]);

  /** ---- Loading ---- */
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [mediumLoading, setMediumLoading] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [subSourceLoading, setSubSourceLoading] = useState(false);
  const [verticalLoading, setVerticalLoading] = useState(false);
  const [centerLoading, setCenterLoading] = useState(false);
  const [dispLoading, setDispLoading] = useState(false);
  const [subDispLoading, setSubDispLoading] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);

  const [isClosed, setIsClosed] = useState(false);
const [toast, setToast] = useState({ show: false, msg: "" });


/* Toast */
const showToast = (msg) => {
  setToast({ show: true, msg });
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => setToast({ show: false, msg: "" }), 3000);


};


  /** ---------------- Follow-up History modal ---------------- */
const [fuOpen, setFuOpen] = useState(false);
const [fuLoading, setFuLoading] = useState(false);
const [fuRows, setFuRows] = useState([]);
const [fuError, setFuError] = useState("");

const closeFollowUpModal = () => {
  setFuOpen(false);
  setFuError("");
};

const openFollowUpModal = async () => {
  if (!numericLeadOppId) {
    showToast("Lead ID not found. Follow up history cannot be loaded.");
    return;
  }

  setFuOpen(true);
  setFuLoading(true);
  setFuError("");
  setFuRows([]);

  try {
    const data = await fetchJSON(FOLLOWUP_HISTORY_URL(numericLeadOppId), { method: "GET" });
    const list = Array.isArray(data) ? data : [];
    setFuRows(list);
  } catch (e) {
    console.error("❌ getLeadFollowUpList failed:", e);
    setFuError(e?.message || "Failed to load follow up history.");
  } finally {
    setFuLoading(false);
  }
};

// ESC to close
useEffect(() => {
  if (!fuOpen) return;
  const onKey = (ev) => {
    if (ev.key === "Escape") closeFollowUpModal();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [fuOpen]);
  /** ---- Form ---- */
  const [form, setForm] = useState({
    countryCode: "",
    mobile: safe(row?.custMobileNo || row?.mobileNo || row?.mobile || ""),
    firstName: safe(row?.firstName || (row?.custName ? String(row?.custName).split(" ")[0] : "")),
    lastName: safe(row?.lastName || (row?.custName ? String(row?.custName).split(" ").slice(1).join(" ") : "")),
    email: safe(row?.email || row?.emailID || ""),
    preferredLanguage: safe(row?.preferredLanguage || row?.preferedLanguage || "English"),

    centerCode: "",
    interestedVerticalCode: "",
    interestedOther: "",

    doctor: "",
    mediumCode: "",
    sourceName: "",
    subSourceName: "",

    leadStatus: "LS004",
    leadSubStatus: "",
    dispositionId: "",
    subDispositionId: "",

    // ✅ always tomorrow
    followUpDate: getTomorrowInputDate(),
    followUpTime: DEFAULT_FOLLOWUP_TIME_LABEL,

    remarks: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /** ---------------- Customer Fetch ---------------- */
  useEffect(() => {
    const id = getCustomerIdFromUrl(custId, locationObj);

    const loadCustomer = async () => {
      try {
        const data = await fetchJSON(FETCH_CUSTOMER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custID: id }),
        });

        setForm((p) => ({
          ...p,
          firstName: safe(p.firstName || data?.firstName),
          lastName: safe(p.lastName || data?.lastName),
          email: safe(p.email || data?.email),
          mobile: safe(p.mobile || data?.mobilePhone),
          centerCode: safe(p.centerCode || data?.centerCode),
        }));
      } catch (e) {
        console.error("❌ FetchCustomerDetails failed:", e);
      }
    };

    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custId, locationObj.pathname]);

  /** ---------------- Master API load ---------------- */
  useEffect(() => {
    const loadMaster = async () => {
      setCenterLoading(true);
      setSourceLoading(true);
      setDoctorLoading(true);
      setVerticalLoading(true);
      setMediumLoading(true);

      try {
        const data = await fetchJSON(MASTER_LEAD_URL, { method: "GET" });

        const centersMapped = (Array.isArray(data?.centers) ? data.centers : [])
          .map((c) => ({
            label: safe(c?.name).trim(),
            value: String(c?.recid ?? c?.value ?? ""),
            code: safe(c?.code).trim(),
          }))
          .filter((x) => x.label);
        setCenterOptions([{ label: "< - Select one - >", value: "" }, ...centersMapped]);

        const sourcesMapped = (Array.isArray(data?.sources) ? data.sources : [])
          .map((s) => ({ label: safe(s?.name).trim(), value: String(s?.value ?? ""), code: safe(s?.code).trim() }))
          .filter((x) => x.label);
        setSourceOptions(sourcesMapped.length ? sourcesMapped : [{ label: "< - Select one - >", value: "" }]);

        const docsMapped = (Array.isArray(data?.doctorMappings) ? data.doctorMappings : [])
          .map((d) => {
            const name = `${safe(d?.firstName).trim()} ${safe(d?.lastName).trim()}`.trim();
            return {
              label: name || safe(d?.employeeCode).trim(),
              value: String(d?.recid ?? d?.value ?? ""),
              code: safe(d?.employeeCode).trim(),
            };
          })
          .filter((x) => x.label && x.value);
        setDoctorOptions([{ label: "< - Select one - >", value: "" }, ...docsMapped]);

        const vertMapped = (Array.isArray(data?.appointmentVerticals) ? data.appointmentVerticals : [])
          .map((v) => ({ label: safe(v?.name).trim(), value: String(v?.value ?? ""), code: safe(v?.code).trim() }))
          .filter((x) => x.label);
        setVerticalOptions(vertMapped.length ? vertMapped : [{ label: "< - Select one - >", value: "" }]);

        const medMapped = (Array.isArray(data?.oppMediums) ? data.oppMediums : [])
          .map((m) => ({ label: safe(m?.name).trim(), value: String(m?.value ?? ""), code: safe(m?.code).trim() }))
          .filter((x) => x.label);
        setMediumOptions(medMapped.length ? medMapped : [{ label: "< - Select one - >", value: "" }]);
      } catch (e) {
        console.error("Failed to load master lead data", e);
        setCenterOptions([{ label: "< - Select one - >", value: "" }]);
        setSourceOptions([{ label: "< - Select one - >", value: "" }]);
        setDoctorOptions([{ label: "< - Select one - >", value: "" }]);
        setVerticalOptions([{ label: "< - Select one - >", value: "" }]);
        setMediumOptions([{ label: "< - Select one - >", value: "" }]);
      } finally {
        setCenterLoading(false);
        setSourceLoading(false);
        setDoctorLoading(false);
        setVerticalLoading(false);
        setMediumLoading(false);
      }
    };

    loadMaster();
  }, []);

  /** ---------------- SubSource load ---------------- */
  useEffect(() => {
    const loadSubSources = async () => {
      setSubSourceLoading(true);
      try {
        const data = await fetchJSON(SUBSOURCE_URL, { method: "GET" });
        const arr = Array.isArray(data) ? data : [];
        const mapped = arr.map((s) => ({ label: safe(s?.name).trim(), value: safe(s?.code).trim() })).filter((x) => x.label);
        setSubSourceOptions(mapped.length ? mapped : [{ label: "< - Select one - >", value: "" }]);
      } catch (e) {
        console.error("Failed to load subsources", e);
        setSubSourceOptions([{ label: "< - Select one - >", value: "" }]);
      } finally {
        setSubSourceLoading(false);
      }
    };
    loadSubSources();
  }, []);

  /** ---------------- Disposition load ---------------- */
  useEffect(() => {
    const loadDispositions = async () => {
      setDispLoading(true);
      try {
        const data = await fetchJSON(DISPOSITION_URL, { method: "GET" });
        const arr = Array.isArray(data) ? data : [];

        const mapped = arr
          .filter((d) => d?.isActive !== false)
          .map((d) => ({ label: safe(d?.dispositionName).trim(), value: String(d?.dispositionID ?? "") }))
          .filter((x) => x.label && x.value)
          .filter((x) => norm(x.label) !== "pending");

        setDispositionOptions([{ label: "< - Select one - >", value: "" }, ...mapped]);
      } catch (e) {
        console.error("Failed to load dispositions", e);
        setDispositionOptions([{ label: "< - Select one - >", value: "" }]);
      } finally {
        setDispLoading(false);
      }
    };
    loadDispositions();
  }, []);

  /** ---------------- SubDisposition load ---------------- */
  useEffect(() => {
    const dispId = toNumberOr0(form.dispositionId);
    if (!dispId) {
      setSubDispositionOptions([{ label: "< - Select one - >", value: "" }]);
      setForm((p) => ({ ...p, subDispositionId: "" }));
      return;
    }

    const loadSubDisps = async () => {
      setSubDispLoading(true);
      try {
        const data = await fetchJSON(SUBDISPOSITION_URL, { method: "GET" });
        const arr = Array.isArray(data) ? data : [];
        const mapped = arr
          .filter((s) => s?.isActive !== false && toNumberOr0(s?.dispositionID) === dispId)
          .map((s) => ({ label: safe(s?.subDispositionName).trim(), value: String(s?.subDispositionID ?? "") }))
          .filter((x) => x.label && x.value);

        setSubDispositionOptions([{ label: "< - Select one - >", value: "" }, ...mapped]);
      } catch (e) {
        console.error("Failed to load subdispositions", e);
        setSubDispositionOptions([{ label: "< - Select one - >", value: "" }]);
      } finally {
        setSubDispLoading(false);
      }
    };

    loadSubDisps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.dispositionId]);

  useEffect(() => {
  const code = safe(resolvedOppCode).trim();
  if (!code) {
    setCampaignRecId(0);
    return;
  }

  let alive = true;

  const run = async () => {
    setCampaignLoading(true);
    try {
      const data = await fetchJSON(GET_CAMPAIGN_URL(code), { method: "GET" });
      if (!alive) return;

      const recid = toNumberOr0(data?.recid);
      setCampaignRecId(recid);
    } catch (e) {
      console.error("❌ getCampaign failed:", e);
      if (alive) setCampaignRecId(0);
    } finally {
      if (alive) setCampaignLoading(false);
    }
  };

  run();
  return () => {
    alive = false;
  };
}, [resolvedOppCode]);


  /** ---------------- ✅ EDIT MODE: GET Lead and Prefill ---------------- */
  useEffect(() => {
    if (!isEdit) return;

    let alive = true;

    const run = async () => {
      setLeadLoading(true);
      try {
        const data = await fetchJSON(GET_LEAD_URL(numericLeadOppId), { method: "GET" });
        if (!alive) return;

        const statusLower = safe(data?.status).trim().toLowerCase();
const closed = statusLower === "closed";

setIsClosed(closed);
if (closed) {
  showToast("A Closed Lead/Opportunity cannot be updated.");
}


        const parsedTime = parseTimeToForm(data?.followUpTime);
        const mediumValue = resolveMediumValueFromSeervices(mediumOptions, data?.seervices);

        setForm((p) => {
          const apiDate = toInputDate(data?.followUpDate);
          const min = getTomorrowInputDate();
          const fixedDate = apiDate ? (apiDate < min ? min : apiDate) : (p.followUpDate || min);

          return {
            ...p,
            firstName: safe(data?.firstName ?? p.firstName),
            lastName: safe(data?.lastName ?? p.lastName),
            countryCode: safe(data?.countryCode ?? p.countryCode),
            mobile: safe(data?.mobile ?? p.mobile),
            email: safe(data?.email ?? p.email),
            preferredLanguage: safe(data?.prefLang ?? p.preferredLanguage),

            centerCode: String(data?.clinicCentre_FK ?? p.centerCode ?? ""),
            doctor: String(data?.doctor_FK ?? p.doctor ?? ""),

            interestedVerticalCode: String(data?.interestIn_FK ?? p.interestedVerticalCode ?? ""),
            sourceName: String(data?.leadSource_FK ?? p.sourceName ?? ""),
            subSourceName: String(data?.leadSubSource_FK ?? p.subSourceName ?? ""),

            dispositionId: String(data?.disposition_FK ?? p.dispositionId ?? ""),
            subDispositionId: String(data?.subDisposition_FK ?? p.subDispositionId ?? ""),

            mediumCode: mediumValue || p.mediumCode,

            followUpDate: fixedDate,
            followUpTime: parsedTime || p.followUpTime || DEFAULT_FOLLOWUP_TIME_LABEL,

            remarks: safe(data?.remarks ?? p.remarks),
          };
        });
      } catch (e) {
        console.error("❌ getLead failed:", e);
        alert(e?.message || "Failed to load lead details.");
      } finally {
        if (alive) setLeadLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [isEdit, numericLeadOppId, mediumOptions]);

  /** ---------------- Events ---------------- */
  const onChange = (e) => {
    const { name, value } = e.target;

    setForm((p) => {
      const next = { ...p, [name]: value };

      // ✅ enforce tomorrow minimum on date change
      if (name === "followUpDate") {
        const v = safe(value).trim();
        const min = getTomorrowInputDate();
        if (!v) next.followUpDate = min;
        else next.followUpDate = v < min ? min : v;
      }

      // ✅ default time if cleared
      if (name === "followUpTime" && !safe(value).trim()) {
        next.followUpTime = DEFAULT_FOLLOWUP_TIME_LABEL;
      }

      return next;
    });

    setErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.mobile.trim()) e.mobile = "Mobile is required.";
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";

    if (!form.centerCode) e.centerCode = "Centre is required.";
    if (!form.doctor) e.doctor = "Doctor/Therapist is required.";
    if (!form.interestedVerticalCode) e.interestedVerticalCode = "Interested in is required.";
    if (!form.mediumCode) e.mediumCode = "Lead medium is required.";
    if (!form.sourceName) e.sourceName = "Lead source is required.";
    if (!isValidEmail(form.email)) e.email = "Please enter a valid email.";

    if (!safe(form.dispositionId).trim()) e.dispositionId = "Disposition is required.";
    if (!safe(form.subDispositionId).trim()) e.subDispositionId = "Sub-Disposition is required.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resolvedCustId = safe(custId).trim();
  const hasCustomerInUrl = !!resolvedCustId && resolvedCustId !== "0";
  const isLead = state?.isLead === true ? true : !hasCustomerInUrl;

  const isClosedDisposition = (dispId, dispOptions) => {
    const id = String(dispId || "").trim();
    if (!id) return false;
    const opt = (dispOptions || []).find((o) => String(o.value) === id);
    const label = (opt?.label || "").trim().toLowerCase();
    return label === "converted" || label === "not converted";
  };

  const resolvePayloadStatus = ({ baseStatus = "Open", dispositionId, dispositionOptions }) => {
    return isClosedDisposition(dispositionId, dispositionOptions) ? "Closed" : baseStatus;
  };

  const resolveFollowUpForPayload = (currentForm) => {
    const min = getTomorrowInputDate();
    const dateValRaw = safe(currentForm?.followUpDate).trim();
    const timeVal = safe(currentForm?.followUpTime).trim();

    const dateVal = !dateValRaw ? min : dateValRaw < min ? min : dateValRaw;
    const finalTime = timeVal || DEFAULT_FOLLOWUP_TIME_LABEL;

    return { finalDate: dateVal, finalTime };
  };

  /** ---------------- Create / Update ---------------- */
  const createLeadOpp = async (status) => {
    const mediumName = findOptionLabelByValue(mediumOptions, form.mediumCode);

    const finalStatus = resolvePayloadStatus({
      baseStatus: status,
      dispositionId: form.dispositionId,
      dispositionOptions,
    });

    const { finalDate, finalTime } = resolveFollowUpForPayload(form);
    const nowLocal = toLocalDateTimeString(new Date());

    const payload = {
      leadOpp_ID: 0,
      firstName: form.firstName,
      lastName: form.lastName,
      countryCode: form.countryCode,
      mobile: form.mobile,
      email: form.email,

      type: isLead ? "Lead" : "Opportunity",
      status: finalStatus,

      prefLang: form.preferredLanguage,
      customer_FK: 0,

      clinicCentre_FK: toNumberOr0(form.centerCode),
      doctor_FK: toNumberOr0(form.doctor),
      seervices: mediumName,

      interestIn_FK: toNumberOr0(form.interestedVerticalCode),
      leadSource_FK: toNumberOr0(form.sourceName),
      leadSubSource_FK: 0,

      disposition_FK: toNumberOr0(form.dispositionId),
      subDisposition_FK: toNumberOr0(form.subDispositionId),

      salesOwner_FK: toNumberOr0(salesOwnerRecId),
campaign_FK: toNumberOr0(campaignRecId),

      // ✅ NO UTC
      appointmentDate: nowLocal,

      // ✅ NO UTC + always tomorrow or later
      followUpDate: toFollowUpDateOnly(finalDate),

      followUpTime: toTimeSpanOrNull(finalTime || DEFAULT_FOLLOWUP_TIME_LABEL),

      remarks: form.remarks,
      customerMsg: "",

      // ✅ NO UTC
      modifiedBy: 0,
      modifiedDate: nowLocal,
      createdDate: nowLocal,
    };

    console.log("[createLeadOpp] followUpDate:", payload.followUpDate);

    return fetchJSON(CREATE_OPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const updateLeadOpp = async () => {
    if (!numericLeadOppId) throw new Error("Invalid leadOpp_ID for update.");
    const mediumName = findOptionLabelByValue(mediumOptions, form.mediumCode);

    const finalStatus = resolvePayloadStatus({
      baseStatus: "Open",
      dispositionId: form.dispositionId,
      dispositionOptions,
    });

    const { finalDate, finalTime } = resolveFollowUpForPayload(form);
    const nowLocal = toLocalDateTimeString(new Date());

    const payload = {
      leadOpp_ID: numericLeadOppId,
      firstName: form.firstName,
      lastName: form.lastName,
      countryCode: form.countryCode,
      mobile: form.mobile,
      email: form.email,

      type: isLead ? "Lead" : "Opportunity",
      status: finalStatus,
      prefLang: form.preferredLanguage,

      customer_FK: 0,
      clinicCentre_FK: toNumberOr0(form.centerCode),
      doctor_FK: toNumberOr0(form.doctor),
      seervices: mediumName,

      interestIn_FK: toNumberOr0(form.interestedVerticalCode),
      leadSource_FK: toNumberOr0(form.sourceName),
      leadSubSource_FK: toNumberOr0(form.subSourceName),

      disposition_FK: toNumberOr0(form.dispositionId),
      subDisposition_FK: toNumberOr0(form.subDispositionId),

      salesOwner_FK: toNumberOr0(salesOwnerRecId),
      campaign_FK: toNumberOr0(campaignRecId),

      // ✅ NO UTC
      appointmentDate: nowLocal,

      // ✅ NO UTC + always tomorrow or later
      followUpDate: toFollowUpDateOnly(finalDate),

      followUpTime: toTimeSpanOrNull(finalTime || DEFAULT_FOLLOWUP_TIME_LABEL),

      remarks: form.remarks,
      customerMsg: safe(row?.customerMsg || ""),

      modifiedBy: 0,
      modifiedDate: nowLocal,
      createdDate: form.createdDate, // keep what UI had (if your API needs)
    };

    console.log("[updateLeadOpp] followUpDate:", payload.followUpDate);

    return fetchJSON(UPDATE_LEAD_URL(numericLeadOppId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const handleSubmit = async () => {

    if (isEdit && isClosed) {
    showToast("A Closed Lead/Opportunity cannot be updated.");
    return;
  }

    if (!validate()) {
      alert("Submit blocked by validation. Check required fields.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateLeadOpp();
        navigate(-1);
        return;
      }

      const apiRes = await createLeadOpp("Open");

      try {
        const saved = {
          leadId,
          leadKind,
          oppCode: safe(oppCode),
          custId: safe(resolvedCustId),
          status: "Open",
          apiRes,
          salesOwnerRecId: toNumberOr0(salesOwnerRecId),
          createdAt: toLocalDateTimeString(new Date()),
        };
        localStorage.setItem(LS_NEW_LEAD_KEY(oppCode), JSON.stringify(saved));
        window.dispatchEvent(new Event("ew_lead_created"));
      } catch {}

        navigate(isLead ? -1 : -2);

    } catch (e) {
      console.error("[Submit failed]", e);
      alert(e?.message || "Failed to submit.");
    } finally {
      setSaving(false);
    }
  };

  const lockForm = isEdit && isClosed;


  /** ---------------- UI ---------------- */
  return (
    <>

    {toast.show && (
  <div className="toast">
    {toast.msg}
  </div>
)}

{fuOpen && (
  <div className="modalOverlay" onMouseDown={closeFollowUpModal}>
    <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modalHeader">
        <div className="modalTitle">Follow Up History</div>
        <button type="button" className="modalClose" onClick={closeFollowUpModal}>
          ×
        </button>
      </div>

      {fuLoading ? (
        <div className="modalBody">Loading...</div>
      ) : fuError ? (
        <div className="modalBody errBox">{fuError}</div>
      ) : (
        <div className="modalBody">
          <div className="tblWrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Follow Up Date</th>
                  <th>Follow Up Time</th>
                  <th>Sales Owner</th>
                </tr>
              </thead>
              <tbody>
                {fuRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "14px" }}>
                      No follow up history found.
                    </td>
                  </tr>
                ) : (
                  fuRows.map((r, idx) => (
                    <tr key={r?.followUpId ?? idx}>
                      <td>{idx + 1}</td>
                      <td>{formatFollowUpDateDDMMYY(r?.followUpDate)}</td>
                      <td>{formatTimeSpanTo12Hr(r?.followUpTime)}</td>
                      <td>{safe(r?.salesOwner)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  </div>
)}


      <div className="pageWrap">
        <div className="pageHeader">
          <div className="titleBlock">
            <div className="pageTitle">Lead Details</div>
            <div className="subTitle"></div>
          </div>
        </div>

        <fieldset className="fs">
          <legend>Lead Details</legend>

          <div className="formGrid3">
            <div className="col">
              <div className="field">
                <label>
                  First Name <span className="req">*</span>
                </label>
                <input className={`inp ${errors.firstName ? "err" : ""}`} name="firstName" value={form.firstName} onChange={onChange} placeholder="First Name" />
                {errors.firstName && <div className="errText">{errors.firstName}</div>}
              </div>

              <div className="field">
                <label>
                  Last Name <span className="req">*</span>
                </label>
                <input className={`inp ${errors.lastName ? "err" : ""}`} name="lastName" value={form.lastName} onChange={onChange} placeholder="Last Name" />
                {errors.lastName && <div className="errText">{errors.lastName}</div>}
              </div>

              <div className="field">
                <label>Country Code</label>
                <input className="inp" name="countryCode" value={form.countryCode} onChange={onChange} placeholder="Country Code" />
              </div>

              <div className="field">
                <label>
                  Mobile <span className="req">*</span>
                </label>
                <input className={`inp ${errors.mobile ? "err" : ""}`} name="mobile" value={form.mobile} onChange={onChange} placeholder="Mobile" />
                {errors.mobile && <div className="errText">{errors.mobile}</div>}
              </div>

              <div className="field">
                <label>Email</label>
                <input className={`inp ${errors.email ? "err" : ""}`} name="email" value={form.email} onChange={onChange} placeholder="Email" />
                {errors.email && <div className="errText">{errors.email}</div>}
              </div>
            </div>

            <div className="col">
              <div className="field">
                <label>Preferred Language</label>
                <select className="inp" name="preferredLanguage" value={form.preferredLanguage} onChange={onChange}>
                  {langOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>
                  Centre <span className="req">*</span>
                </label>
                <select className={`inp ${errors.centerCode ? "err" : ""}`} name="centerCode" value={form.centerCode} onChange={onChange} disabled={centerLoading}>
                  {centerOptions.map((o) => (
                    <option key={o.value || o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {errors.centerCode && <div className="errText">{errors.centerCode}</div>}
              </div>

              <div className="field">
                <label>
                  Doctor / Therapist <span className="req">*</span>
                </label>
                <select className={`inp ${errors.doctor ? "err" : ""}`} name="doctor" value={form.doctor} onChange={onChange} disabled={doctorLoading}>
                  {doctorOptions.map((d) => (
                    <option key={d.value || d.label} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                {errors.doctor && <div className="errText">{errors.doctor}</div>}
              </div>

              <div className="field">
                <label>
                  Interested In <span className="req">*</span>
                </label>
                <select className={`inp ${errors.interestedVerticalCode ? "err" : ""}`} name="interestedVerticalCode" value={form.interestedVerticalCode} onChange={onChange} disabled={verticalLoading}>
                  {verticalOptions.map((o) => (
                    <option key={o.value || o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {errors.interestedVerticalCode && <div className="errText">{errors.interestedVerticalCode}</div>}
              </div>

              <div className="field">
                <label>Other</label>
                <input className="inp" name="interestedOther" value={form.interestedOther} onChange={onChange} />
              </div>

              <div className="field">
                <label>
                  Lead Medium <span className="req">*</span>
                </label>
                <select className={`inp ${errors.mediumCode ? "err" : ""}`} name="mediumCode" value={form.mediumCode} onChange={onChange} disabled={mediumLoading}>
                  {mediumOptions.map((opt) => (
                    <option key={opt.value || opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.mediumCode && <div className="errText">{errors.mediumCode}</div>}
              </div>

              <div className="field">
                <label>
                  Lead Source <span className="req">*</span>
                </label>
                <select className={`inp ${errors.sourceName ? "err" : ""}`} name="sourceName" value={form.sourceName} onChange={onChange} disabled={sourceLoading}>
                  {sourceOptions.map((opt) => (
                    <option key={opt.value || opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.sourceName && <div className="errText">{errors.sourceName}</div>}
              </div>

              <div className="field">
                <label>Lead Sub-Source</label>
                <select className="inp" name="subSourceName" value={form.subSourceName} onChange={onChange} disabled={subSourceLoading}>
                  {subSourceOptions.map((opt) => (
                    <option key={opt.value || opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="fs">
          <legend>Lead Disposition</legend>

          <div className="formGrid2">
            <div className="col">
              <div className="field">
                <label>Disposition</label>
                <select className="inp" name="dispositionId" value={form.dispositionId} onChange={onChange} disabled={dispLoading}>
                  {dispositionOptions.map((d) => (
                    <option key={d.value || d.label} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Sub-Disposition</label>
                <select className="inp" name="subDispositionId" value={form.subDispositionId} onChange={onChange} disabled={subDispLoading || !form.dispositionId}>
                  {subDispositionOptions.map((s) => (
                    <option key={s.value || s.label} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

           


            <div className="col">
              <div className="field">
                <label>Follow Up Date</label>
                <input
                  type="date"
                  className="inp"
                  name="followUpDate"
                  value={form.followUpDate}
                  onChange={onChange}
                  min={minFollowUpDate} // ✅ disables today + older
                />
              </div>

              <div className="field">
                <label>Follow Up Time</label>
                <select className="inp" name="followUpTime" value={form.followUpTime} onChange={onChange}>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value || t.label} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

               <div className="fuLinkRow">
  <button type="button" className="fuLink" onClick={openFollowUpModal}>
    Click here to check follow up history
  </button>
</div>
            </div>
          </div>

          <div className="field mtWide">
            <label>Remarks</label>
            <textarea className="txta" rows={5} name="remarks" value={form.remarks} onChange={onChange} />
          </div>
        </fieldset>

        <div className="btnRow">
  {!lockForm && (
    <button className="btn" onClick={handleSubmit} disabled={saving || leadLoading}>
      {isEdit ? "Update" : "Submit"}
    </button>
  )}

  <button className="btn" onClick={() => navigate(-1)} disabled={saving}>
    Back
  </button>
</div>

      </div>

      <style jsx="true">{`
      .toast{
  position: fixed;
  right: 18px;
  top: 40%;
  background: #C66752;
  color: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(0,0,0,.18);
  z-index: 9999;
  text-align: center;
  display: flex;
  justify-content: center;
}

        .pageWrap { padding: 18px 18px 28px; background: #fff; }
        .pageHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
        .pageTitle { font-size: 18px; font-weight: 700; color: #1d2a3b; }
        .subTitle { margin-top: 2px; font-size: 12px; color: #7b8798; }
        .fs { border: 1px solid #e6ebf2; border-radius: 10px; padding: 14px 14px 16px; margin-bottom: 14px; background: #fff; }
        .fs legend { padding: 0 8px; font-weight: 800; font-size: 16px; color: #1f2937; }
        .formGrid3 { display: grid; grid-template-columns: 1fr; gap: 18px; margin-top: 8px; }
        .formGrid2 { display: grid; grid-template-columns: 1fr; gap: 18px; margin-top: 8px; }
        .col { display: flex; flex-wrap: wrap; gap: 12px; }
        .col .field { min-width: 35%; }
        .field label { display: inline-block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        .req { color: #c62828; font-weight: 900; }
        .inp { width: 100%; height: 40px; border-radius: 8px; border: 1px solid #d7dee8; padding: 0 12px; background: #fff; outline: none; }
        .inp:focus { border-color: #94a3b8; }
        .txta { width: 100%; border-radius: 8px; border: 1px solid #d7dee8; padding: 10px 12px; background: #fff; outline: none; resize: vertical; }
        .errText { margin-top: 6px; font-size: 12px; color: #d32f2f; font-weight: 600; }
        .mtWide { margin-top: 12px; }
        .btnRow { display: flex; gap: 16px; margin-top: 16px; }
        .btn { background: #0b1b37; color: #fff; border: 0; border-radius: 10px; padding: 11px 26px; font-weight: 700; cursor: pointer; }
        .btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .btn:hover:not(:disabled) { opacity: 0.95; }

        .fuLinkRow{
  margin: 8px 0 10px;
  display: flex;
  justify-content: flex-end;
}
.fuLink{
  background: transparent;
  border: 0;
  padding: 0;
  color: #0b1b37;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}
.fuLink:hover{ opacity: .85; }

.modalOverlay{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.modalCard{
  width: min(860px, 96vw);
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 18px 45px rgba(0,0,0,.22);
  overflow: hidden;
}
.modalHeader{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #e6ebf2;
}
.modalTitle{
  font-size: 15px;
  font-weight: 900;
  color: #1d2a3b;
}
.modalClose{
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid #e6ebf2;
  background: #fff;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  font-weight: 900;
}
.modalClose:hover{ background: #f6f8fb; }

.modalBody{
  padding: 14px 16px 18px;
}
.errBox{
  color: #b42318;
  font-weight: 800;
  background: #fff2f2;
  border: 1px solid #ffd2d2;
  border-radius: 10px;
}
.tblWrap{ overflow: auto; }
.tbl{
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tbl th{
  text-align: left;
  background: #f6f8fb;
  border: 1px solid #e6ebf2;
  padding: 10px 10px;
  font-weight: 900;
  color: #1f2937;
}
.tbl td{
  border: 1px solid #e6ebf2;
  padding: 10px 10px;
  color: #334155;
  font-weight: 600;
}


        @media (max-width: 1100px) {
          .formGrid3 { grid-template-columns: 1fr; }
          .formGrid2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default ManualOppCustomerDetails;
