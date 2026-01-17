// src/pages/Opportunity/ManualOppCustomerDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/** ---------------- Helpers ---------------- */
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const norm = (v) => safe(v).trim().toLowerCase();

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

// Send ISO date safely
const toIsoOrNow = (yyyyMmDd) => {
  if (!yyyyMmDd) return new Date().toISOString();
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
};

// ✅ TimeSpan friendly converter => "HH:mm:ss" or null
const toTimeSpanOrNull = (hhmm, ampm) => {
  if (!hhmm) return null;

  const [hhStr, mmStr] = String(hhmm).split(":");
  let hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);

  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  const ap = String(ampm || "AM").toUpperCase();
  if (ap === "PM" && hh !== 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
};

const looksLikeCustomerCode = (v) => {
  const s = safe(v).trim();
  if (!s) return false;
  return /^[A-Za-z]{2,}[-_]*\d{1,}$/.test(s);
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

const parseTimeToForm = (timeStr) => {
  // expects "HH:mm:ss" or "HH:mm"
  const t = safe(timeStr).trim();
  if (!t) return { hhmm: "", ampm: "AM" };

  const parts = t.split(":");
  let hh = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return { hhmm: "", ampm: "AM" };

  let ampm = "AM";
  let displayH = hh;

  if (hh >= 12) {
    ampm = "PM";
    displayH = hh === 12 ? 12 : hh - 12;
  } else {
    ampm = "AM";
    displayH = hh === 0 ? 12 : hh;
  }

  const hhmm = `${String(displayH).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  return { hhmm, ampm };
};

const LEAD_STATUS_OPTIONS = [
  { label: "Duplicate", value: "LS001" },
  { label: "Bad Lead", value: "LS002" },
  { label: "Not Converted", value: "LS003" },
  { label: "WIP", value: "LS004" },
  { label: "Inquiry Feedback", value: "LS005" },
  { label: "Appointment Set(for service)", value: "LS006" },
  { label: "Converted", value: "LS007" },
];

// Time dropdown options
const TIME_OPTIONS = (() => {
  const out = [{ label: "--", value: "" }];
  for (let h = 1; h <= 12; h++) {
    out.push({ label: `${String(h).padStart(2, "0")}:00`, value: `${String(h).padStart(2, "0")}:00` });
    out.push({ label: `${String(h).padStart(2, "0")}:30`, value: `${String(h).padStart(2, "0")}:30` });
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
const LEAD_SUBSTATUS_URL = (statusCode) =>
  `${API_BASE_URL}/api/Opportunity/OppLeadSubStatus/${encodeURIComponent(statusCode)}`;
const CREATE_OPP_URL = `${API_BASE_URL}/api/LeadOpp/createOpp`;

const GET_LEAD_URL = (id) => `${API_BASE_URL}/api/LeadOpp/getLead/${id}`;
const UPDATE_LEAD_URL = (id) => `${API_BASE_URL}/api/LeadOpp/lead/update/${id}`;

// ✅ Employees
const EMPLOYEES_URL = `${API_BASE_URL}/api/Employees`;

const LS_NEW_LEAD_KEY = (oppCode) => `EW_OPP_NEW_LEAD_${oppCode}`;

// Logged-in user (adjust keys if needed)
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

  // edit route param: /manuallead/edit/:leadOppId
  const leadOppIdParam = params.leadOppId || params.id || params.leadOpp_ID || "";

  const locationObj = useLocation();
  const { state } = locationObj;
  const navigate = useNavigate();

  const row = state?.row || null;
  const header = state?.header || null;

  const leadOppIdFromState = state?.leadOpp_ID ?? state?.leadOppId ?? state?.id ?? row?.leadOpp_ID ?? row?.leadOppId;

  const numericLeadOppId = useMemo(() => {
    const fromParam = stripProspectId(leadOppIdParam);
    if (fromParam) return fromParam;
    const fromState = stripProspectId(leadOppIdFromState);
    return fromState || 0;
  }, [leadOppIdParam, leadOppIdFromState]);

  const isEdit = !!numericLeadOppId;

  const leadKind = state?.leadKind || (header?.oRuleCode ? "External" : "Manual");
  const [leadId] = useState(() => nextLeadId(leadKind));
  const [langOptions] = useState(LANG_INIT);

  /** ---- Employees (sales owner) ---- */
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
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
      setEmpLoading(true);
      try {
        const data = await fetchJSON(EMPLOYEES_URL, { method: "GET" });
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        if (!alive) return;
        setEmployees(list);

        // ✅ resolve current user recId
        const u = getLoggedInUser();
        const ident = pickUserIdentity(u);
        const recId = resolveEmpRecId(ident);
        setSalesOwnerRecId(toNumberOr0(recId));
      } catch (e) {
        console.error("❌ Employees load failed:", e);
      } finally {
        if (alive) setEmpLoading(false);
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

  const [leadSubStatusOptions, setLeadSubStatusOptions] = useState([{ label: "< - Select one - >", value: "" }]);
  const [leadSubStatusLoading, setLeadSubStatusLoading] = useState(false);

  const [dispLoading, setDispLoading] = useState(false);
  const [subDispLoading, setSubDispLoading] = useState(false);

  /** ---- Customer details ---- */
  const [customerDetails, setCustomerDetails] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  /** ---- Lead details (edit fetch) ---- */
  const [leadLoading, setLeadLoading] = useState(false);

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

    followUpDate: toInputDate(row?.followUpDate || ""),
    followUpTime: "",
    followUpTimeAmPm: "AM",
    remarks: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /** ---------------- Customer Fetch ---------------- */
  useEffect(() => {
    const id = getCustomerIdFromUrl(custId, locationObj);
    if (!looksLikeCustomerCode(id)) return;

    const loadCustomer = async () => {
      setCustomerLoading(true);
      try {
        const data = await fetchJSON(FETCH_CUSTOMER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custID: id }),
        });

        setCustomerDetails(data || null);

        // only fill basics if still empty (do not override edit fetch later)
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
      } finally {
        setCustomerLoading(false);
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
          .map((c) => ({ label: safe(c?.name).trim(), value: safe(c?.code).trim() }))
          .filter((x) => x.label);
        setCenterOptions([{ label: "< - Select one - >", value: "" }, ...centersMapped]);

        const sourcesMapped = (Array.isArray(data?.sources) ? data.sources : [])
          .map((s) => ({ label: safe(s?.name).trim(), value: String(s?.value ?? ""), code: safe(s?.code).trim() }))
          .filter((x) => x.label);
        setSourceOptions(sourcesMapped.length ? sourcesMapped : [{ label: "< - Select one - >", value: "" }]);

        const docsMapped = (Array.isArray(data?.doctorMappings) ? data.doctorMappings : [])
          .map((d) => {
            const name = `${safe(d?.firstName).trim()} ${safe(d?.lastName).trim()}`.trim();
            return { label: name || safe(d?.employeeCode).trim(), value: safe(d?.employeeCode).trim() };
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
        const mapped = arr
          .map((s) => ({ label: safe(s?.name).trim(), value: safe(s?.code).trim() }))
          .filter((x) => x.label);
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
          .filter((x) => x.label && x.value);
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

  /** ---------------- Lead Sub-Status load ---------------- */
  const loadLeadSubStatuses = async (leadStatusCode) => {
    if (!leadStatusCode) {
      setLeadSubStatusOptions([{ label: "< - Select one - >", value: "" }]);
      return;
    }

    setLeadSubStatusLoading(true);
    try {
      const data = await fetchJSON(LEAD_SUBSTATUS_URL(leadStatusCode), { method: "GET" });
      const arr = Array.isArray(data) ? data : data ? [data] : [];
      const mapped = arr
        .map((o) => ({ label: safe(o?.name ?? o?.Name).trim(), value: safe(o?.code ?? o?.Code).trim() }))
        .filter((x) => x.label);
      setLeadSubStatusOptions([{ label: "< - Select one - >", value: "" }, ...mapped]);
    } catch (e) {
      console.error("Failed to load lead sub status", e);
      setLeadSubStatusOptions([{ label: "< - Select one - >", value: "" }]);
    } finally {
      setLeadSubStatusLoading(false);
    }
  };

  useEffect(() => {
    loadLeadSubStatuses(form.leadStatus);
    setForm((p) => ({ ...p, leadSubStatus: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.leadStatus]);

  /** ---------------- ✅ EDIT MODE: GET Lead and Prefill ---------------- */
  useEffect(() => {
    if (!isEdit) return;

    let alive = true;

    const run = async () => {
      setLeadLoading(true);
      try {
        const data = await fetchJSON(GET_LEAD_URL(numericLeadOppId), { method: "GET" });

        if (!alive) return;

        // followUpTime => convert to UI hh:mm + AM/PM
        const parsedTime = parseTimeToForm(data?.followUpTime);

        setForm((p) => ({
          ...p,

          firstName: safe(data?.firstName ?? p.firstName),
          lastName: safe(data?.lastName ?? p.lastName),
          countryCode: safe(data?.countryCode ?? p.countryCode),
          mobile: safe(data?.mobile ?? p.mobile),
          email: safe(data?.email ?? p.email),
          preferredLanguage: safe(data?.prefLang ?? p.preferredLanguage),

          // master-driven dropdown values
          centerCode: safe(data?.clinicCentre_FK ? p.centerCode || "" : p.centerCode), // if you later bind center by FK, update this
          // NOTE: your UI uses centerCode (code string). API returns clinicCentre_FK (number).
          // If you have a mapping of FK->code, we can plug it in. For now we keep existing centerCode.

          doctor: safe(data?.doctor_FK ? p.doctor || "" : p.doctor), // same note as centerCode

          interestedVerticalCode: String(data?.interestIn_FK ?? p.interestedVerticalCode ?? ""),
          sourceName: String(data?.leadSource_FK ?? p.sourceName ?? ""),
          subSourceName: String(data?.leadSubSource_FK ?? p.subSourceName ?? ""),

          dispositionId: String(data?.disposition_FK ?? p.dispositionId ?? ""),
          subDispositionId: String(data?.subDisposition_FK ?? p.subDispositionId ?? ""),

          // lead status in your form is LS0xx - API gives status text ("Open") and type ("Opportunity")
          // keep existing form.leadStatus unless you have a mapping.
          // leadStatus: p.leadStatus,

          followUpDate: toInputDate(data?.followUpDate || p.followUpDate),
          followUpTime: parsedTime.hhmm || p.followUpTime,
          followUpTimeAmPm: parsedTime.ampm || p.followUpTimeAmPm,

          remarks: safe(data?.remarks ?? p.remarks),
        }));
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
  }, [isEdit, numericLeadOppId]);

  /** ---------------- Events ---------------- */
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
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
    if (!form.leadStatus) e.leadStatus = "Lead status is required.";
    if (!isValidEmail(form.email)) e.email = "Please enter a valid email.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** ---------------- Create / Update ---------------- */
  const resolvedCustId = getCustomerIdFromUrl(custId, locationObj);

  const hasCustomerInUrl =
    !!safe(resolvedCustId).trim() && safe(resolvedCustId).trim() !== "0" && looksLikeCustomerCode(resolvedCustId);

  const isLead = state?.isLead === true ? true : !hasCustomerInUrl;

  const createLeadOpp = async (status) => {
    const leadStatusName = LEAD_STATUS_OPTIONS.find((x) => x.value === form.leadStatus)?.label || "";
    const leadSubStatusName = leadSubStatusOptions.find((x) => x.value === form.leadSubStatus)?.label || "";

    const payload = {
      leadOpp_ID: 0,
      firstName: form.firstName,
      lastName: form.lastName,
      countryCode: form.countryCode,
      mobile: form.mobile,
      email: form.email,

      type: isLead ? "Lead" : "Opportunity",
      status,

      prefLang: form.preferredLanguage,

      customer_FK: 0,

      clinicCentre_FK: 5,
      doctor_FK: 26,

      interestIn_FK: toNumberOr0(form.interestedVerticalCode),
      leadSource_FK: toNumberOr0(form.sourceName),
      leadSubSource_FK: 0,

      disposition_FK: toNumberOr0(form.dispositionId),
      subDisposition_FK: toNumberOr0(form.subDispositionId),

      salesOwner_FK: toNumberOr0(salesOwnerRecId),

      appointmentDate: new Date().toISOString(),
      followUpDate: toIsoOrNow(form.followUpDate),
      followUpTime: toTimeSpanOrNull(form.followUpTime, form.followUpTimeAmPm),
      remarks: form.remarks,

      customerMsg: [
        !isLead && looksLikeCustomerCode(resolvedCustId) ? `CustomerID:${resolvedCustId}` : "",
        `LeadStatus:${leadStatusName}`,
        leadSubStatusName ? `LeadSubStatus:${leadSubStatusName}` : "",
      ]
        .filter(Boolean)
        .join(" | "),

      seervices: String(form.mediumCode || ""),

      modifiedBy: 0,
      modifiedDate: new Date().toISOString(),
      createdDate: new Date().toISOString(),
    };

    return fetchJSON(CREATE_OPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const updateLeadOpp = async () => {
    if (!numericLeadOppId) throw new Error("Invalid leadOpp_ID for update.");

    const payload = {
      leadOpp_ID: numericLeadOppId,
      firstName: form.firstName,
      lastName: form.lastName,
      countryCode: form.countryCode,
      mobile: form.mobile,
      email: form.email,

      type: isLead ? "Lead" : "Opportunity",
      status: "Open",
      prefLang: form.preferredLanguage,

      customer_FK: 0,
      clinicCentre_FK: 0,
      doctor_FK: 0,
      interestIn_FK: toNumberOr0(form.interestedVerticalCode),
      leadSource_FK: toNumberOr0(form.sourceName),
      leadSubSource_FK: toNumberOr0(form.subSourceName),

      disposition_FK: toNumberOr0(form.dispositionId),
      subDisposition_FK: toNumberOr0(form.subDispositionId),

      salesOwner_FK: toNumberOr0(salesOwnerRecId),

      appointmentDate: new Date().toISOString(),
      followUpDate: toIsoOrNow(form.followUpDate),
      followUpTime: toTimeSpanOrNull(form.followUpTime, form.followUpTimeAmPm),

      remarks: form.remarks,
      customerMsg: safe(row?.customerMsg || ""),
      seervices: String(form.mediumCode || ""),

      modifiedBy: 0,
      modifiedDate: new Date().toISOString(),
      createdDate: new Date().toISOString(),
    };

    return fetchJSON(UPDATE_LEAD_URL(numericLeadOppId), {
      method: "PUT", // change to POST if backend expects POST
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const handleSubmit = async () => {
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
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(LS_NEW_LEAD_KEY(oppCode), JSON.stringify(saved));
        window.dispatchEvent(new Event("ew_lead_created"));
      } catch {}

      navigate(-1);
    } catch (e) {
      console.error("[Submit failed]", e);
      alert(e?.message || "Failed to submit.");
    } finally {
      setSaving(false);
    }
  };

  /** ---------------- UI ---------------- */
  return (
    <>
      <div className="pageWrap">
        <div className="pageHeader">
          <div className="titleBlock">
            <div className="pageTitle">Lead Details</div>
            <div className="subTitle">
              {leadKind} Lead • {oppCode ? `Opportunity: ${oppCode}` : "Opportunity"}
              {customerLoading ? " • Loading customer..." : ""}
              {isLead ? " • Type: Lead" : " • Type: Opportunity"}
              {empLoading ? " • Loading employees..." : ""}
              {leadLoading ? " • Loading lead..." : ""}
              {salesOwnerRecId ? ` • SalesOwner: ${salesOwnerRecId}` : " • SalesOwner: 0"}
              {isEdit ? ` • Edit ID: ${numericLeadOppId}` : " • New"}
            </div>
          </div>
        </div>

        {/* --- your existing UI below unchanged --- */}
        {/* (I kept the UI structure same; only button text changed) */}

        {/* ... KEEP YOUR EXISTING JSX FROM HERE ... */}

        <fieldset className="fs">
          <legend>Lead Details</legend>

          <div className="formGrid3">
            <div className="col">
              <div className="field">
                <label>
                  First Name <span className="req">*</span>
                </label>
                <input
                  className={`inp ${errors.firstName ? "err" : ""}`}
                  name="firstName"
                  value={form.firstName}
                  onChange={onChange}
                  placeholder="First Name"
                />
                {errors.firstName && <div className="errText">{errors.firstName}</div>}
              </div>

              <div className="field">
                <label>
                  Last Name <span className="req">*</span>
                </label>
                <input
                  className={`inp ${errors.lastName ? "err" : ""}`}
                  name="lastName"
                  value={form.lastName}
                  onChange={onChange}
                  placeholder="Last Name"
                />
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
                <select
                  className={`inp ${errors.interestedVerticalCode ? "err" : ""}`}
                  name="interestedVerticalCode"
                  value={form.interestedVerticalCode}
                  onChange={onChange}
                  disabled={verticalLoading}
                >
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
                <label>
                  Lead Status <span className="req">*</span>
                </label>
                <select className={`inp ${errors.leadStatus ? "err" : ""}`} name="leadStatus" value={form.leadStatus} onChange={onChange}>
                  {LEAD_STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {errors.leadStatus && <div className="errText">{errors.leadStatus}</div>}
              </div>

              <div className="field">
                <label>Lead Sub-Status</label>
                <select className="inp" name="leadSubStatus" value={form.leadSubStatus} onChange={onChange} disabled={leadSubStatusLoading || !form.leadStatus}>
                  {leadSubStatusOptions.map((s) => (
                    <option key={s.value || s.label} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

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
                <input type="date" className="inp" name="followUpDate" value={form.followUpDate} onChange={onChange} />
              </div>

              <div className="field">
                <label>Follow Up Time</label>
                <div className="timeRow">
                  <select className="inp" name="followUpTime" value={form.followUpTime} onChange={onChange}>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value || t.label} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>

                  <select className="inp ampm" name="followUpTimeAmPm" value={form.followUpTimeAmPm} onChange={onChange}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="field mtWide">
            <label>Remarks</label>
            <textarea className="txta" rows={5} name="remarks" value={form.remarks} onChange={onChange} />
          </div>
        </fieldset>

        <div className="btnRow">
          <button className="btn" onClick={handleSubmit} disabled={saving || leadLoading}>
            {isEdit ? "Update" : "Submit"}
          </button>
          <button className="btn" onClick={() => navigate(-1)} disabled={saving}>
            Back
          </button>
        </div>
      </div>

      <style jsx="true">{`
        .pageWrap { padding: 18px 18px 28px; background: #fff; }
        .pageHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
        .pageTitle { font-size: 18px; font-weight: 700; color: #1d2a3b; }
        .subTitle { margin-top: 2px; font-size: 12px; color: #7b8798; }
        .fs { border: 1px solid #e6ebf2; border-radius: 10px; padding: 14px 14px 16px; margin-bottom: 14px; background: #fff; }
        .fs legend { padding: 0 8px; font-weight: 800; font-size: 16px; color: #1f2937; }
        .formGrid3 { display: grid; grid-template-columns: 1fr; gap: 18px; margin-top: 8px; }
        .formGrid2 { display: grid; grid-template-columns: 1fr; gap: 18px; margin-top: 8px; }
        .col { display: flex; flex-wrap: wrap; gap: 12px; }
        .col .field { min-width: 40%; }
        .field label { display: inline-block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        .req { color: #c62828; font-weight: 900; }
        .inp { width: 100%; height: 40px; border-radius: 8px; border: 1px solid #d7dee8; padding: 0 12px; background: #fff; outline: none; }
        .inp:focus { border-color: #94a3b8; }
        .txta { width: 100%; border-radius: 8px; border: 1px solid #d7dee8; padding: 10px 12px; background: #fff; outline: none; resize: vertical; }
        .errText { margin-top: 6px; font-size: 12px; color: #d32f2f; font-weight: 600; }
        .timeRow { display: grid; grid-template-columns: 1fr 110px; gap: 10px; }
        .ampm { max-width: 110px; }
        .mtWide { margin-top: 12px; }
        .btnRow { display: flex; gap: 16px; margin-top: 16px; }
        .btn { background: #0b1b37; color: #fff; border: 0; border-radius: 10px; padding: 11px 26px; font-weight: 700; cursor: pointer; }
        .btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .btn:hover:not(:disabled) { opacity: 0.95; }
        @media (max-width: 1100px) {
          .formGrid3 { grid-template-columns: 1fr; }
          .formGrid2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default ManualOppCustomerDetails;
