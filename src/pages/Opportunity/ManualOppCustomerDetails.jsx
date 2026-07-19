// src/pages/Opportunity/ManualOppCustomerDetails.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";
  import CallButton from "../../components/CallButton";


/** ---------------- Helpers ---------------- */
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const norm = (v) => safe(v).trim().toLowerCase();
const pad2 = (n) => String(n).padStart(2, "0");


/** ✅ Defaults for Follow-up */
const DEFAULT_FOLLOWUP_TIME_LABEL = "01:30 PM";

// "SS019" -> 19 , "19" -> 19
const subSourceValueToFk = (v) => {
  const s = safe(v).trim();
  if (!s) return 0;

  // if already numeric
  const n = Number(s);
  if (Number.isFinite(n)) return n;

  // extract digits from codes like SS019
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
};

// FK(12) -> "SS012"
const subSourceFkToCode = (fk) => {
  const n = Number(fk);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `SS${String(n).padStart(3, "0")}`;
};


// ✅ Convert API subsource row -> "SS012" style code (preferred by UI)
const toSubSourceCodeFromApi = (x) => {
  // if backend already returns a code like "SS012"
  const apiCode = safe(x?.code).trim();
  if (apiCode) return apiCode;

  // else try building from numeric recid/value/id
  const fk = Number(x?.recid ?? x?.value ?? x?.id ?? 0);
  if (!Number.isFinite(fk) || fk <= 0) return "";

  return subSourceFkToCode(fk); // -> "SS012"
};


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
const getTodayInputDate = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // yyyy-MM-dd
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

const pickTypeFromApi = (obj) => {
  const t =
    safe(obj?.type).trim() ||
    safe(obj?.Type).trim() ||
    safe(obj?.leadType).trim() ||
    safe(obj?.LeadType).trim();
  return t;
};

// ---- Safe JSON helper (handles session-expired HTML / non-JSON) ----
const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const fetchJSON = async (url, options = {}) => {
  const token = getAuthToken();
  const { headers: optHeaders, ...restOptions } = options;
  const res = await fetch(url, {
    credentials: "include",
    ...restOptions,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(optHeaders || {}),
    },
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
  const minAllowed = getTodayInputDate();
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
const SUBSOURCE_URL = `${API_BASE_URL}/api/Master/SubSource`;
const DISPOSITION_URL = `${API_BASE_URL}/api/Disposition/ManualDisposition`;
const SUBDISPOSITION_URL = `${API_BASE_URL}/api/Disposition/ManualSubDisposition`;
const CREATE_OPP_URL = `${API_BASE_URL}/api/LeadOpp/createOpp`;
const LOAD_CUSTOMERS_URL = `${API_BASE_URL}/api/Customer/LoadCustomers`;

const GET_LEAD_URL = (id) => `${API_BASE_URL}/api/LeadOpp/getLead/${id}`;
const UPDATE_LEAD_URL = (id) => `${API_BASE_URL}/api/LeadOpp/lead/update/${id}`;
const LINK_CUSTOMER_URL = (id) => `${API_BASE_URL}/api/LeadOpp/lead/linkCustomer/${id}`;
const NATIONALITY_URL = `${API_BASE_URL}/api/Master/Nationality`;
const CREATE_CUSTOMER_URL = `${API_BASE_URL}/api/Opportunity/CreateCustomer`;

// ✅ Employees
const EMPLOYEES_URL = `${API_BASE_URL}/api/Employees`;
const DOCTORS_URL = (centerCode) =>
  `${API_BASE_URL}/api/Master/Doctors/${encodeURIComponent(centerCode)}`;

const LS_NEW_LEAD_KEY = (oppCode) => `EW_OPP_NEW_LEAD_${oppCode}`;

// Logged-in user
const getLoggedInUser = () => {
  const raw = localStorage.getItem("user") ||  sessionStorage.getItem("user");
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

  // ✅ IMPORTANT: pick recId if present in stored user object
  const recId = toNumberOr0(u?.recId || u?.RecId || u?.employeeRecId || u?.employee_FK);

  return {
    employeeCode: safe(employeeCode).trim(),
    email: safe(email).trim(),
    name: safe(name).trim(),
    recId,
  };
};
/** ✅ Session (Bright/Lines/Maxime) resolver for centre preselect */
const getSessionCentreKey = () => {
  const candidates = [
    // common keys you already tried
    "session",
    "sessionInfo",
    "loginSession",

    // very common in apps
    "userSession",
    "auth",
    "authSession",
    "token",
    "login",
    "loginInfo",

    // sometimes stored as plain text
    "center",
    "centre",
    "centerCode",
    "clinicCode",
    "topCode",
    "loginCode",
  ];

  const stores = [localStorage, sessionStorage];

  const pickFromObject = (obj) => {
    if (!obj || typeof obj !== "object") return "";

    // try lots of possible fields + nested
    const direct =
      obj.loginCode ||
      obj.topCode ||
      obj.centerCode ||
      obj.centreCode ||
      obj.center ||
      obj.centre ||
      obj.clinicCode ||
      obj.branchCode ||
      obj.companyCode ||
      obj?.data?.loginCode ||
      obj?.data?.topCode ||
      obj?.data?.centerCode ||
      obj?.data?.clinicCode ||
      obj?.result?.loginCode ||
      obj?.result?.topCode ||
      obj?.result?.centerCode ||
      obj?.result?.clinicCode ||
      "";

    return safe(direct).trim();
  };

  // 1) try known candidate keys
  for (const st of stores) {
    for (const key of candidates) {
      const raw = st.getItem(key);
      if (!raw) continue;

      // if it looks like JSON
      if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(raw);
          const v = pickFromObject(parsed);
          if (v) return v;
        } catch {
          // ignore JSON errors, fall through
        }
      }

      // plain text fallback
      const txt = raw.trim();
      if (txt) return txt;
    }
  }

  // 2) scan ALL storage keys (sometimes session stored under random key)
  for (const st of stores) {
    for (let i = 0; i < st.length; i++) {
      const k = st.key(i);
      const raw = st.getItem(k);
      if (!raw) continue;

      // only inspect likely keys
      const nk = norm(k);
      if (!nk.includes("session") && !nk.includes("login") && !nk.includes("auth") && !nk.includes("center") && !nk.includes("clinic"))
        continue;

      if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(raw);
          const v = pickFromObject(parsed);
          if (v) return v;
        } catch {}
      }
    }
  }

  return "";
};

const SearchableSingleSelect = ({
  options,
  value,
  onChange,
  placeholder = "Type to search...",
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    const opt = (options || []).find((o) => safe(o.value).trim() === safe(value).trim());
    setQ(opt?.label || "");
  }, [value, options]);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = React.useMemo(() => {
    const t = safe(q).toLowerCase().trim();
    const list = (options || []).filter((o) => safe(o.value).trim() !== "");
    if (!t) return list.slice(0, 100);
    return list
      .filter((o) => safe(o.label).toLowerCase().includes(t) || safe(o.value).toLowerCase().includes(t))
      .slice(0, 100);
  }, [q, options]);

  return (
    <div className={`ssWrap ${disabled ? "isDisabled" : ""}`} ref={wrapRef}>
      <input
        className="inp"
        value={q}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => !disabled && setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          if (!safe(e.target.value).trim()) onChange(""); // clear selection
        }}
      />

      {open && !disabled && (
        <div className="ssMenu">
          {filtered.length === 0 ? (
            <div className="ssItem muted">No results</div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.value || o.label}
                className={`ssItem ${safe(o.value).trim() === safe(value).trim() ? "active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setOpen(false);
                }}
                title={o.label}
              >
                <div className="ssLabel">{o.label}</div>
                <div className="ssCode">{o.value}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};


/** ---------------- Component ---------------- */
const ManualOppCustomerDetails = () => {
  const params = useParams();
  const oppCode = params.oppCode;
  const custId = params.custId ?? params.custid ?? "";
  const leadOppIdParam = params.leadOppId || params.id || params.leadOpp_ID || "";

  const centerTouchedRef = useRef(false);


  const locationObj = useLocation();
  const { state } = locationObj;
  const navigate = useNavigate();
  // LTR: mount path of the Appointment module.  VERIFY against your router.
  const APPOINTMENT_ROUTE = "/appointment";

  const resolvedOppCode = useMemo(() => getOppCodeFromUrl(params.oppCode, locationObj), [params.oppCode, locationObj.pathname]);

  const [campaignRecId, setCampaignRecId] = useState(0);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [leadApi, setLeadApi] = useState(null); // ✅ full GET /getLead/{id} response

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
const minFollowUpDate = useMemo(
  () => (isEdit ? getTodayInputDate() : getTomorrowInputDate()),
  [isEdit]
);

  /** ---- Employees ---- */
  const [employees, setEmployees] = useState([]);
  const [salesOwnerRecId, setSalesOwnerRecId] = useState(0);

  // ✅ Preserve ORIGINAL creator (SalesOwner = X) + original dates when editing
  const [originalSalesOwnerRecId, setOriginalSalesOwnerRecId] = useState(0);
  const [createdDateFromApi, setCreatedDateFromApi] = useState("");
  const [appointmentDateFromApi, setAppointmentDateFromApi] = useState("");

  // ✅ Preserve original customer_FK/type/campaign/subsource from API for update payload
  const [originalCustomerRecIdFromApi, setOriginalCustomerRecIdFromApi] = useState(0);
  const [originalTypeFromApi, setOriginalTypeFromApi] = useState("");
  const [originalCampaignRecIdFromApi, setOriginalCampaignRecIdFromApi] = useState(0);
  const [originalLeadSubSourceFkFromApi, setOriginalLeadSubSourceFkFromApi] = useState(0);

  const resolveEmpRecIdFromList = (list, ident) => {
    const directRec = toNumberOr0(ident?.recId);
    if (directRec) return directRec;

    const codeKey = norm(ident?.employeeCode);
    const emailKey = norm(ident?.email);
    const nameKey = norm(ident?.name);

    const arr = Array.isArray(list) ? list : [];

    if (codeKey) {
      const byCode = arr.find((e) => norm(e?.employeeCode) === codeKey);
      const rid = toNumberOr0(byCode?.recId);
      if (rid) return rid;
    }

    if (emailKey) {
      const byEmail = arr.find((e) => norm(e?.emailID) === emailKey);
      const rid = toNumberOr0(byEmail?.recId);
      if (rid) return rid;
    }

    if (nameKey) {
      const byName = arr.find((e) => norm(e?.employeeName) === nameKey);
      const rid = toNumberOr0(byName?.recId);
      if (rid) return rid;
    }

    return 0;
  };

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

        // ✅ Resolve sales owner safely using:
        // 1) logged-in user recId (fast + best)
        // 2) match against employeeCode/email/name in employees list
        const u = getLoggedInUser();
        const ident = pickUserIdentity(u);
        const recId = resolveEmpRecIdFromList(list, ident);

        setSalesOwnerRecId(toNumberOr0(recId));
      } catch (e) {
        console.error("❌ Employees load failed:", e);

        // ✅ last fallback: if user object had recId, still set it
        const u = getLoggedInUser();
        const ident = pickUserIdentity(u);
        if (alive) setSalesOwnerRecId(toNumberOr0(ident?.recId));
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
      const list = Array.isArray(data)        ? data
                 : Array.isArray(data?.data)  ? data.data
                 : [];
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
mediumCode: "Manual",
subMedium: "Manual",
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

  // ── Convert → Create-Customer popup (mirrors External Lead Form) ──
  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  // LTR: campaign's Appt-Booking-Mandatory flag + conversion context (Case A).
  const [apptMandatory, setApptMandatory] = useState(true);
  const [convertCtx, setConvertCtx] = useState(null);
  const [creatingCustomer, setCreatingCustomer]   = useState(false);
  const [nationalityOptions, setNationalityOptions] = useState([]);
  const [customerForm, setCustomerForm] = useState({
    firstName: "", lastName: "", mobileNo: "", email: "",
    countryCode: "", nationalityId: "", dateOfBirth: "", gender: "",
  });
  const [customerRecId, setCustomerRecId] = useState(0);

  useEffect(() => {
  const key = getSessionCentreKey();
  console.log("SESSION KEY:", key);

  // log current center options once loaded

  
  if (centerOptions?.length > 1) {
    console.table(
      centerOptions
        .filter((c) => c.value) // skip Select one
        .map((c) => ({ code: c.code, name: c.label, recid: c.value }))
    );
  }
}, [centerOptions]);


  /** ---------------- Customer Fetch ---------------- */
  useEffect(() => {
    const id = getCustomerIdFromUrl(custId, locationObj);

    const loadCustomer = async () => {
      try {
        const resp = await fetchJSON(FETCH_CUSTOMER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custID: id }),
        });
        // FetchCustomerDetails returns { success, message, data:{...} } — unwrap (robust if raw too)
        const data = resp?.data ?? resp;
setForm((p) => ({
  ...p,
  firstName: safe(p.firstName || data?.firstName),
  lastName: safe(p.lastName || data?.lastName),
  email: safe(p.email || data?.email),
  mobile: safe(p.mobile || data?.mobilePhone),

  // ✅ center handling
  centerCode: isEdit
    ? safe(p.centerCode) // don’t override in edit
    : safe(p.centerCode || data?.centerCode), // create: keep existing (session preselect) else API
}));

      } catch (e) {
        console.error("❌ FetchCustomerDetails failed:", e);
      }
    };

    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custId, locationObj.pathname, isEdit]);

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

        console.log("SESSION KEY:", getSessionCentreKey());
console.table(centersMapped.map(c => ({ code: c.code, name: c.label, recid: c.value })));


        // ✅ CHANGE #1: Preselect centre from SESSION (creation only)
        // - Only if NOT edit
        // - Only if form.centerCode is empty
        // - Match session loginCode/topCode (e.g., "Bright") with option label text ("Bright Clinics")
       // ✅ CHANGE #1: Preselect centre from SESSION (creation only)
if (!isEdit) {
  const key = norm(getSessionCentreKey()); // e.g. "bright" or "lns"

  if (key && !centerTouchedRef.current) {
    setForm((p) => {
      // don't override if already chosen / set
      if (safe(p.centerCode).trim()) return p;

      // ✅ BEST: match by code (Bright/LNS/MXM)
      const byCode = centersMapped.find((c) => norm(c.code) === key);

      // fallback: match by name (Bright Clinics / Lines Clinics / ...)
      const byName = centersMapped.find((c) => norm(c.label).includes(key));

      const match = byCode || byName;
      return match?.value ? { ...p, centerCode: String(match.value) } : p;
    });
  }
}



        const sourcesMapped = (Array.isArray(data?.sources) ? data.sources : [])
          .map((s) => ({ label: safe(s?.name).trim(), value: String(s?.value ?? ""), code: safe(s?.code).trim() }))
          .filter((x) => x.label);
        setSourceOptions([{ label: "< - Select one - >", value: "" }, ...sourcesMapped]);

        // Doctors from GetMasterDataLead.doctorMappings (employee RECID + name, centre-scoped).
        // Value = recid (matches the int Doctor_FK); drop any that didn't resolve to a RECID.
        const docsMapped = (Array.isArray(data?.doctorMappings) ? data.doctorMappings : [])
          .map((d) => {
            const name = `${safe(d?.firstName).trim()} ${safe(d?.lastName).trim()}`.trim();
            return {
              label: name || safe(d?.employeeCode).trim(),
              value: String(toNumberOr0(d?.recid ?? d?.value)),
            };
          })
          .filter((x) => x.label && x.value && x.value !== "0");
        setDoctorOptions([{ label: "< - Select one - >", value: "" }, ...docsMapped, { label: "None", value: "0" }]);

        const vertMapped = (Array.isArray(data?.appointmentVerticals) ? data.appointmentVerticals : [])
          .map((v) => ({ label: safe(v?.name).trim(), value: String(v?.value ?? ""), code: safe(v?.code).trim() }))
          .filter((x) => x.label);
        setVerticalOptions([{ label: "< - Select one - >", value: "" }, ...vertMapped]);

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
  }, [isEdit]);

  /** Auto-populate Centre from the selected customer (create mode only).
     The Centre <select> option values are recids (Doctor_FK/ClinicCentre_FK need
     the recid), but the customer carries a centre CODE ("Bright") / NAME
     ("Bright Clinics"). Resolve that hint against the loaded options and set the
     matching recid, so the Centre field shows the customer's clinic instead of
     staying blank. */
  useEffect(() => {
    if (isEdit) return;
    if (centerTouchedRef.current) return;
    if (!centerOptions || centerOptions.length <= 1) return;   // options not loaded yet
    setForm((p) => {
      // already holding a valid option value → leave it
      if (p.centerCode && centerOptions.some((o) => String(o.value) === String(p.centerCode))) return p;
      const hint = norm(row?.clinicLocation || state?.header?.clinicLocation || p.centerCode);
      if (!hint) return p;
      const match =
        centerOptions.find((o) => norm(o.code) === hint) ||
        centerOptions.find((o) => norm(o.label) === hint) ||
        centerOptions.find((o) => norm(o.label).includes(hint) || hint.includes(norm(o.label)));
      return match?.value ? { ...p, centerCode: String(match.value) } : p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerOptions, isEdit, form.centerCode]);

 useEffect(() => {
  let alive = true;

  const run = async () => {
    const srcValue = safe(form.sourceName).trim();
    if (!srcValue) {
      setSubSourceOptions([{ label: "< - Select one - >", value: "" }]);
      setForm((p) => ({ ...p, subSourceName: "" }));
      return;
    }

    // sourceName is value/recid, but API needs SourceCode like "S001"
    const srcOpt = (sourceOptions || []).find((s) => String(s.value) === String(srcValue));
    const srcCode = safe(srcOpt?.code).trim();

    if (!srcCode) {
      setSubSourceOptions([{ label: "< - Select one - >", value: "" }]);
      setForm((p) => ({ ...p, subSourceName: "" }));
      return;
    }

    setSubSourceLoading(true);
    try {
      const data = await fetchJSON(
        `${API_BASE_URL}/api/Master/SubSource/${encodeURIComponent(srcCode)}`,
        { method: "GET" }
      );

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.result)
        ? data.result
        : Array.isArray(data?.items)
        ? data.items
        : [];

      const opts = [
  { label: "", value: "" },
  ...list
    .map((x) => {
      const code = toSubSourceCodeFromApi(x); // ✅ UI value becomes "SS012"
      const label =
        safe(x?.name).trim() ||
        safe(x?.subSourceName).trim() ||
        code;

      return {
        value: code,  // ✅ IMPORTANT: value must match form.subSourceName ("SSxxx")
        label,
      };
    })
    .filter((o) => safe(o.value).trim()),
];


      if (!alive) return;

      setSubSourceOptions(opts);

      // keep selection only if still valid
      setForm((p) => {
        const cur = safe(p.subSourceName).trim();
        if (!cur) return p;
        const exists = opts.some((o) => safe(o.value).trim() === cur);
        return exists ? p : { ...p, subSourceName: "" };
      });
    } catch (e) {
      console.error("OppSubSource failed:", e);
      if (!alive) return;
      setSubSourceOptions([{ label: "< - Select one - >", value: "" }]);
      setForm((p) => ({ ...p, subSourceName: "" }));
    } finally {
      if (alive) setSubSourceLoading(false);
    }
  };

  run();
  return () => {
    alive = false;
  };
}, [form.sourceName, sourceOptions]);




  /** ---------------- Disposition load ---------------- */
  useEffect(() => {
    const loadDispositions = async () => {
      setDispLoading(true);
      try {
        const data = await fetchJSON(DISPOSITION_URL, { method: "GET" });
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

        const mapped = arr
          .filter((d) => d?.isActive !== false)
          .map((d) => ({ label: safe(d?.dispositionName).trim(), value: String(d?.dispositionId ?? d?.dispositionID ?? "") }))
          .filter((x) => x.label && x.value)
          .filter((x) => ["wip","converted","not converted"].includes(norm(x.label)));

        setDispositionOptions([{ label: "< - Select one - >", value: "" }, ...mapped]);

        // New lead/opp: prefill disposition to WIP (matches the backend's WIP default).
        // Edit keeps the record's own disposition (set from getLead), so only do this on create.
        if (!isEdit) {
          const wip = mapped.find((x) => norm(x.label) === "wip");
          if (wip) setForm((p) => (p.dispositionId ? p : { ...p, dispositionId: wip.value }));
        }
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
        const data = await fetchJSON(`${SUBDISPOSITION_URL}?dispositionId=${dispId}`, { method: "GET" });
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const mapped = arr
          .filter((s) => s?.isActive !== false && toNumberOr0(s?.dispositionId ?? s?.dispositionID) === dispId)
          .map((s) => ({ label: safe(s?.subDispositionName).trim(), value: String(s?.subDispositionId ?? s?.subDispositionID ?? "") }))
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
        const resp = await fetchJSON(GET_CAMPAIGN_URL(code), { method: "GET" });
        if (!alive) return;

        // getCampaign returns { success, data:{...} } — unwrap like CampaignDetails (d?.data ?? d).
        const data = resp?.data ?? resp;
        // Campaign_FK must be CLINIC_OPPORTUNITYDETAILS.RECID (campaignDetailId) — the value the
        // campaign list filters on — NOT the summary recid. Mirror CampaignDetails' precedence.
        const recid = toNumberOr0(data?.campaignDetailId ?? data?.recid ?? data?.recId);
        setCampaignRecId(recid);
        // LTR: capture Appt-Booking-Mandatory (default Yes) for Case A routing.
        setApptMandatory(data?.apptBookingMandatory !== 0 && data?.apptBookingMandatory !== false);
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
        const resp = await fetchJSON(GET_LEAD_URL(numericLeadOppId), { method: "GET" });
        if (!alive) return;

        // getLead may return { success, data:{...} } — unwrap so prefill reads the right keys.
        const data = resp?.data ?? resp;
        setLeadApi(data);

        // ✅ Store SalesOwner (creator = X) once from API (do NOT overwrite on updates)
        setOriginalSalesOwnerRecId(toNumberOr0(data?.salesOwner_FK));

        // ✅ Preserve original created/appointment dates from API (so update doesn't mutate them)
        setCreatedDateFromApi(safe(data?.createdDate));
        setAppointmentDateFromApi(safe(data?.appointmentDate));

        // ✅ Preserve original type and customer FK from API
        setOriginalTypeFromApi(pickTypeFromApi(data));
        setOriginalCustomerRecIdFromApi(toNumberOr0(data?.customer_FK));

        // ✅ Preserve original campaign + leadSubSource from API
        setOriginalCampaignRecIdFromApi(toNumberOr0(data?.campaign_FK));
        setOriginalLeadSubSourceFkFromApi(toNumberOr0(data?.leadSubSource_FK));

        const statusLower = safe(data?.status).trim().toLowerCase();
        const closed = statusLower === "closed";

        setIsClosed(closed);
        if (closed) {
          showToast("A Closed Lead/Opportunity cannot be updated.");
        }

        const parsedTime = parseTimeToForm(data?.followUpTime);
        const mediumValue = resolveMediumValueFromSeervices(mediumOptions, 'Manual');

        setForm((p) => {
          const apiDate = toInputDate(data?.followUpDate);
          const min = getTodayInputDate();
          const fixedDate = apiDate ? (apiDate < min ? min : apiDate) : p.followUpDate || min;

          return {
            ...p,
            firstName: safe(data?.firstName ?? p.firstName),
            lastName: safe(data?.lastName ?? p.lastName),
            countryCode: safe(data?.countryCode ?? p.countryCode),
            mobile: safe(data?.mobile ?? p.mobile),
            email: safe(data?.email ?? p.email),
            preferredLanguage: safe(data?.prefLang ?? p.preferredLanguage),

            centerCode: String(data?.clinicCentre_FK ?? p.centerCode ?? ""),
            doctor: String(toNumberOr0(data?.doctor_FK)), // 0 / null -> "0" = "None" option

            interestedVerticalCode: String(data?.interestIn_FK ?? p.interestedVerticalCode ?? ""),
            sourceName: String(data?.leadSource_FK ?? p.sourceName ?? ""),
            subSourceName: subSourceFkToCode(data?.leadSubSource_FK) || safe(p.subSourceName),


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
  }, [isEdit, numericLeadOppId]);

  /** ---------------- Events ---------------- */
  const onChange = (e) => {
    const { name, value } = e.target;

    
  if (name === "centerCode") centerTouchedRef.current = true;
if (name === "sourceName") {
  setForm((p) => ({ ...p, sourceName: value, subSourceName: "" }));

  setErrors((prev) => {
    const { sourceName: _s, subSourceName: _ss, ...rest } = prev;
    return rest;
  });

  return;
}




    setForm((p) => {
      const next = { ...p, [name]: value };

      // ✅ enforce tomorrow minimum on date change
      if (name === "followUpDate") {
  const v = safe(value).trim();
  const min = isEdit ? getTodayInputDate() : getTomorrowInputDate();
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
    else if (!/^\d{7,15}$/.test(form.mobile.trim())) e.mobile = "Enter a valid mobile number (7–15 digits, numbers only).";
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";

    if (!form.centerCode) e.centerCode = "Centre is required.";
    if (!form.doctor) e.doctor = "Doctor/Therapist is required.";
    if (!form.interestedVerticalCode) e.interestedVerticalCode = "Interested in is required.";
    if (!isValidEmail(form.email)) e.email = "Please enter a valid email.";

    if (!safe(form.dispositionId).trim()) e.dispositionId = "Disposition is required.";
    if (!safe(form.subDispositionId).trim()) e.subDispositionId = "Sub-Disposition is required.";

    if (!toNumberOr0(salesOwnerRecId) && !toNumberOr0(pickUserIdentity(getLoggedInUser())?.recId)) {
      e.salesOwner = "Sales Owner not resolved. Please re-login or refresh.";
    }
    if (!safe(form.sourceName).trim()) e.sourceName = "Lead Source is required.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resolvedCustId = safe(custId).trim();
  const hasCustomerInUrl = !!resolvedCustId && resolvedCustId !== "0";

  const effectiveTypeForUpdate = useMemo(() => {
    if (!isEdit) return "";

    const apiType = safe(leadApi?.type).trim(); // "Opportunity" from GET
    if (apiType) return apiType;

    // fallback (should rarely happen)
    if (toNumberOr0(leadApi?.customer_FK) > 0) return "Opportunity";
    return "Lead";
  }, [isEdit, leadApi]);

  const isLeadEffective = useMemo(() => {
    if (!isEdit) return null;
    return norm(effectiveTypeForUpdate) === "lead";
  }, [isEdit, effectiveTypeForUpdate]);

  // ✅ EDIT mode: derive Lead/Opportunity from API (more reliable than URL)
  const isLead = useMemo(() => {
    if (isEdit) {
      const t = norm(originalTypeFromApi);
      if (t === "lead") return true;
      if (t === "opportunity") return false;

      // fallback: if API has customer_FK > 0, it is Opportunity
      if (toNumberOr0(originalCustomerRecIdFromApi) > 0) return false;

      // final fallback
      return true;
    }

    // CREATE mode: keep your existing behavior
    return state?.isLead === true ? true : !hasCustomerInUrl;
  }, [isEdit, originalTypeFromApi, originalCustomerRecIdFromApi, state?.isLead, hasCustomerInUrl]);

  useEffect(() => {
    // Opportunity only (customer is present in URL)
    if (isLead) {
      setCustomerRecId(0);
      return;
    }

    const cid = safe(custId).trim();
    if (!cid) {
      setCustomerRecId(0);
      return;
    }

    let alive = true;

    const run = async () => {
      try {
        const data = await fetchJSON(LOAD_CUSTOMERS_URL, { method: "GET" });
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

        const match = list.find((x) => safe(x?.custId).trim().toLowerCase() === cid.toLowerCase());
        const rec = toNumberOr0(match?.recId);

        if (alive) setCustomerRecId(rec);
      } catch (e) {
        console.error("❌ LoadCustomers failed:", e);
        if (alive) setCustomerRecId(0);
      }
    };

    run();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLead, custId]);

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
      const min = isEdit ? getTodayInputDate() : getTomorrowInputDate();

    const dateValRaw = safe(currentForm?.followUpDate).trim();
    const timeVal = safe(currentForm?.followUpTime).trim();

    const dateVal = !dateValRaw ? min : dateValRaw < min ? min : dateValRaw;
    const finalTime = timeVal || DEFAULT_FOLLOWUP_TIME_LABEL;

    return { finalDate: dateVal, finalTime };
  };

  /** ---------------- Create / Update ---------------- */
  const createLeadOpp = async (status) => {
    const mediumName = "Manual";
const subMediumName = safe(form.subMedium || "Manual");

const isDirectClosed = isClosedDisposition(form.dispositionId, dispositionOptions);
const modifierRecId =
  toNumberOr0(salesOwnerRecId) ||
  toNumberOr0(pickUserIdentity(getLoggedInUser())?.recId) ||
  0;


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
      customer_FK: isLead ? 0 : toNumberOr0(customerRecId),

      clinicCentre_FK: toNumberOr0(form.centerCode),
      doctor_FK: toNumberOr0(form.doctor),
      seervices: '',
      medium:"Manual",
      subMedium:"Manual",

      interestIn_FK: toNumberOr0(form.interestedVerticalCode),
      leadSource_FK: toNumberOr0(form.sourceName),
      leadSubSource_FK: subSourceValueToFk(form.subSourceName),


      disposition_FK: toNumberOr0(form.dispositionId),
      subDisposition_FK: toNumberOr0(form.subDispositionId),

      salesOwner_FK: toNumberOr0(salesOwnerRecId) || toNumberOr0(pickUserIdentity(getLoggedInUser())?.recId) || 0,

      campaign_FK: toNumberOr0(campaignRecId),

      // ✅ NO UTC
      appointmentDate: nowLocal,

      // ✅ NO UTC + always tomorrow or later
      followUpDate: toFollowUpDateOnly(finalDate),

      followUpTime: toTimeSpanOrNull(finalTime || DEFAULT_FOLLOWUP_TIME_LABEL),

      remarks: form.remarks,
      customerMsg: "",

      // ✅ If user creates directly as Converted/Not Converted, treat as "modified" too
  modifiedBy: isDirectClosed ? modifierRecId : 0,
  modifiedDate: isDirectClosed ? nowLocal : null,
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
    if (!originalSalesOwnerRecId) {
      console.warn("️ originalSalesOwnerRecId is 0. SalesOwner may overwrite if backend updates it.");
    }
const mediumName = "Manual";
const subMediumName = safe(form.subMedium || "Manual");


    const finalStatus = resolvePayloadStatus({
      baseStatus: "Open",
      dispositionId: form.dispositionId,
      dispositionOptions,
    });

    // ✅ LOCK type to original API record (prevents Opportunity -> Lead regression)
    const apiType = safe(originalTypeFromApi).trim() || safe(leadApi?.type).trim();
    const typeForUpdate = apiType || "Lead";

    // ✅ LOCK customer FK to original API record (prevents 10151 -> 0)
    const customerFkForUpdate =
      norm(typeForUpdate) === "lead"
        ? 0
        : (toNumberOr0(originalCustomerRecIdFromApi) || toNumberOr0(leadApi?.customer_FK) || 0);

    // ✅ LOCK campaign FK to original API record (prevents 1108 -> 0)
    const campaignFkForUpdate =
      toNumberOr0(originalCampaignRecIdFromApi) ||
      toNumberOr0(leadApi?.campaign_FK) ||
      toNumberOr0(campaignRecId) ||
      0;

    // ✅ SubSource: prefer current selection, else keep original API value
    const leadSubSourceFkForUpdate =
  subSourceValueToFk(form.subSourceName) || toNumberOr0(originalLeadSubSourceFkFromApi) || 0;


    const { finalDate, finalTime } = resolveFollowUpForPayload(form);
    const nowLocal = toLocalDateTimeString(new Date());

    const payload = {
      leadOpp_ID: numericLeadOppId,
      firstName: form.firstName,
      lastName: form.lastName,
      countryCode: form.countryCode,
      mobile: form.mobile,
      email: form.email,

      type: typeForUpdate,

      status: finalStatus,
      prefLang: form.preferredLanguage,

      customer_FK: customerFkForUpdate,

      clinicCentre_FK: toNumberOr0(form.centerCode),
      doctor_FK: toNumberOr0(form.doctor),
      seervices: '',
      medium:'Manual',
      subMedium:'Manual',

      interestIn_FK: toNumberOr0(form.interestedVerticalCode),
      leadSource_FK: toNumberOr0(form.sourceName),
      leadSubSource_FK: leadSubSourceFkForUpdate,

      disposition_FK: toNumberOr0(form.dispositionId),
      subDisposition_FK: toNumberOr0(form.subDispositionId),

      // ✅ Preserve original creator
      salesOwner_FK: toNumberOr0(originalSalesOwnerRecId) || 0,

      // ✅ Preserve original campaign on edit
      campaign_FK: campaignFkForUpdate,

      // ✅ Preserve original appointment date
      appointmentDate: appointmentDateFromApi || null,

      // ✅ NO UTC + always tomorrow or later
      followUpDate: toFollowUpDateOnly(finalDate),

      followUpTime: toTimeSpanOrNull(finalTime || DEFAULT_FOLLOWUP_TIME_LABEL),

      remarks: form.remarks,
      customerMsg: safe(row?.customerMsg || ""),

      modifiedBy: toNumberOr0(salesOwnerRecId),
      modifiedDate: nowLocal,
      createdDate: createdDateFromApi || null,
    };

    console.log("[updateLeadOpp] typeForUpdate:", typeForUpdate);
    console.log("[updateLeadOpp] customerFkForUpdate:", customerFkForUpdate);
    console.log("[updateLeadOpp] campaignFkForUpdate:", campaignFkForUpdate);
    console.log("[updateLeadOpp] leadSubSourceFkForUpdate:", leadSubSourceFkForUpdate);

    return fetchJSON(UPDATE_LEAD_URL(numericLeadOppId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  // popup styles (kept inline to mirror the external form)
  const cInput = { width: "100%", marginTop: 4, padding: "8px 10px", border: "1px solid #cfd6e4", borderRadius: 8, boxSizing: "border-box" };
  const cBtn   = { background: "#0b1b37", color: "#fff", border: 0, borderRadius: 10, padding: "10px 22px", fontWeight: 700, cursor: "pointer" };

  // Load nationality options for the convert popup
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchJSON(NATIONALITY_URL, { method: "GET" });
        const list = Array.isArray(data) ? data : (data?.items || data?.data || []);
        if (alive) {
          setNationalityOptions(
            list.map((n) => ({ id: n.id ?? n.RECID ?? n.value, name: n.name ?? n.NATIONALITYNAME ?? n.label }))
          );
        }
      } catch { /* non-fatal */ }
    })();
    return () => { alive = false; };
  }, []);

  // Create the customer, then back-stamp it onto the lead (Customer_FK) via linkCustomer.
  const handleCreateCustomer = async () => {
    const cf = customerForm;
    const miss = [];
    if (!safe(cf.firstName).trim())   miss.push("First name");
    if (!safe(cf.lastName).trim())    miss.push("Last name");
    if (!safe(cf.countryCode).trim()) miss.push("Country code");
    if (!safe(cf.mobileNo).trim())    miss.push("Mobile");
    if (!isValidEmail(cf.email))      miss.push("Email");
    if (!String(cf.nationalityId || "").trim()) miss.push("Nationality");
    if (!safe(cf.dateOfBirth).trim()) miss.push("Date of birth");
    if (!safe(cf.gender).trim())      miss.push("Gender");
    if (miss.length) { alert("Please fill: " + miss.join(", ")); return; }

    setCreatingCustomer(true);
    try {
      const resC = await fetchJSON(CREATE_CUSTOMER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName:     safe(cf.firstName).trim(),
          lastName:      safe(cf.lastName).trim(),
          countryCode:   safe(cf.countryCode).trim(),
          mobileNo:      safe(cf.mobileNo).trim(),
          email:         safe(cf.email).trim(),
          nationalityId: cf.nationalityId,
          dateOfBirth:   cf.dateOfBirth,
          gender:        cf.gender,
          oppCode:       safe(resolvedOppCode).trim(),
        }),
      });

      // attach the freshly-created customer to this lead
      const newRecId = resC?.recId ?? resC?.data?.recId ?? resC?.customerRecId;
      if (newRecId) {
        await fetchJSON(LINK_CUSTOMER_URL(numericLeadOppId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerRecId: newRecId }),
        });
      }

      setCreatingCustomer(false);
      setShowCustomerPopup(false);
      showToast(`Customer created${resC && resC.custId ? " - " + resC.custId : ""}`);
      // LTR Case A (FRD §6.2): route to Appointment Booking when mandatory; else go back.
      const newCustId = resC?.custId || resC?.customerId || "";
      if (convertCtx?.apptMandatory && newCustId) {
        navigate(APPOINTMENT_ROUTE, { state: {
          ltrConversion: {
            leadSource: convertCtx.leadSource,
            leadRecId:  convertCtx.leadRecId,
            oppCode:    convertCtx.oppCode,
            custId:     newCustId,
          },
          newCustomer: {
            custId: newCustId, custid: newCustId,
            firstName: safe(cf.firstName).trim(),
            lastName:  safe(cf.lastName).trim(),
            mobile:    safe(cf.mobileNo).trim(),
            name:      `${safe(cf.firstName).trim()} ${safe(cf.lastName).trim()}`.trim(),
          },
        }});
        return;
      }
      navigate(-1);
    } catch (err) {
      setCreatingCustomer(false);
      alert(`Create customer failed: ${err?.message || err}`);
    }
  };

  const handleSubmit = async () => {
    if (isEdit && isClosed) {
      showToast("A Closed Lead/Opportunity cannot be updated.");
      return;
    }

    if (isEdit && !leadApi) {
      showToast("Loading lead details. Please wait...");
      return;
    }

    if (!validate()) {
      alert("Submit blocked by validation. Check required fields.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const saveRes = await updateLeadOpp();
        // updateLead returns { success, message, data:{ convert, prefill } }
        const rd = saveRes?.data ?? saveRes;
        if (rd?.convert) {
          const pf = rd.prefill || {};
          // LTR: remember conversion context for post-customer routing (Case A).
          setConvertCtx({
            apptMandatory,
            leadSource: "MANUAL",
            leadRecId:  String(numericLeadOppId || ""),
            oppCode:    safe(resolvedOppCode).trim(),
          });
          setCustomerForm((prev) => ({
            ...prev,
            firstName:   pf.firstName   || safe(form.firstName),
            lastName:    pf.lastName    || safe(form.lastName),
            mobileNo:    pf.mobileNo    || safe(form.mobile),
            countryCode: pf.countryCode || safe(form.countryCode),
            email:       pf.email       || safe(form.email),
          }));
          setShowCustomerPopup(true);
          setSaving(false);
          return;
        }
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
     const loggedInMobile = "501947803";         // replace with your real logged-in user mobile
  const clientMobile = "550355156"; 

  /** ---------------- UI ---------------- */
  return (
    <>
      {toast.show && <div className="toast">{toast.msg}</div>}

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
                        <th>Disposition</th>
                        <th>Sub-Disposition</th>
                        <th>Follow Up Date</th>
                        <th>Follow Up Time</th>
                        <th>Remarks</th>
                        <th>Modified By</th>
                        <th>Modified On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fuRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "14px" }}>
                            No follow up history found.
                          </td>
                        </tr>
                      ) : (
                        fuRows.map((r, idx) => (
                          <tr key={r?.followUpId ?? idx}>
                            <td>{idx + 1}</td>
                            <td>{safe(r?.disposition)}</td>
                            <td>{safe(r?.subDisposition)}</td>
                            <td>{formatFollowUpDateDDMMYY(r?.followUpDate)}</td>
                            <td>{formatTimeSpanTo12Hr(r?.followUpTime)}</td>
                            <td>{safe(r?.remarks ?? r?.remark)}</td>
                            <td>{safe(r?.modifiedBy ?? r?.salesOwner)}</td>
                            <td>{safe(r?.modifiedOn)}</td>
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
{/* 
           { <CallButton
  firstNumber={loggedInMobile}
  secondNumber={clientMobile}
  leadId={numericLeadOppId || undefined} // optional as per doc
  label="Call Client"
  onSuccess={(data) => console.log("Call OK:", data)}
  onError={(e) => console.error("Call failed:", e)}
/> } */}

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
                <input className={`inp ${errors.mobile ? "err" : ""}`} name="mobile" value={form.mobile} disabled={!isLead} inputMode="numeric" maxLength={15} onChange={(e) => { const digits = safe(e.target.value).replace(/[^\d]/g, "").slice(0, 15); setForm((p) => ({ ...p, mobile: digits })); }} placeholder="Mobile" />
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
               <label>Lead Medium</label>
<input className="inp" name="mediumCode" value={form.mediumCode} disabled />

              </div>

              <div className="field">
  <label>Submedium</label>
  <input className="inp" name="subMedium" value={form.subMedium} disabled />
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
                <SearchableSingleSelect
  options={subSourceOptions}
  value={form.subSourceName}
  disabled={subSourceLoading || !safe(form.sourceName).trim()}
  placeholder={!safe(form.sourceName).trim() ? "Select Source first" : "Type to search subsource..."}
  onChange={(val) => setForm((p) => ({ ...p, subSourceName: val }))}
 />

              </div>


              
              <div className="field">
                <label>Other</label>
                <input className="inp" name="interestedOther" value={form.interestedOther} onChange={onChange} />
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
                <input type="date" className="inp" name="followUpDate" value={form.followUpDate} onChange={onChange} min={minFollowUpDate} />
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
            <button className="btn" onClick={handleSubmit} disabled={saving || leadLoading || (isEdit && !leadApi)}>
              {isEdit ? "Update" : "Submit"}
            </button>
          )}

          <button className="btn" onClick={() => navigate(-1)} disabled={saving}>
            Back
          </button>
        </div>
      </div>

      {errors.salesOwner && <div className="errText">{errors.salesOwner}</div>}

      <style jsx="true">{`
        .toast {
          position: fixed;
          right: 18px;
          top: 40%;
          background: #c66752;
          color: #fff;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
          z-index: 9999;
          text-align: center;
          display: flex;
          justify-content: center;
        }

        .pageWrap {
          padding: 18px 18px 28px;
          background: #fff;
        }
        .pageHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }
        .pageTitle {
          font-size: 18px;
          font-weight: 700;
          color: #1d2a3b;
        }

        .ssWrap {
  position: relative;
  width: 100%;
}
.ssWrap.isDisabled {
  opacity: 0.7;
}
.ssMenu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  background: #fff;
  border: 1px solid #d7dee8;
  border-radius: 10px;
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.12);
  max-height: 280px;
  overflow: auto;
  z-index: 9999;
}
.ssItem {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ssItem:last-child {
  border-bottom: 0;
}
.ssItem:hover {
  background: #f8fafc;
}
.ssItem.active {
  background: #eef2ff;
}
.ssItem.muted {
  cursor: default;
  color: #6b7280;
}
.ssLabel {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}
.ssCode {
  font-size: 12px;
  font-weight: 800;
  color: #64748b;
  flex: 0 0 auto;
}

        .subTitle {
          margin-top: 2px;
          font-size: 12px;
          color: #7b8798;
        }
        .fs {
          border: 1px solid #e6ebf2;
          border-radius: 10px;
          padding: 14px 14px 16px;
          margin-bottom: 14px;
          background: #fff;
        }
        .fs legend {
          padding: 0 8px;
          font-weight: 800;
          font-size: 16px;
          color: #1f2937;
        }
        .formGrid3 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          margin-top: 8px;
        }
        .formGrid2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          margin-top: 8px;
        }
        .col {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .col .field {
          min-width: 35%;
        }
        .field label {
          display: inline-block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }
        .req {
          color: #c62828;
          font-weight: 900;
        }
        .inp {
          width: 100%;
          height: 40px;
          border-radius: 8px;
          border: 1px solid #d7dee8;
          padding: 0 12px;
          background: #fff;
          outline: none;
        }
        .inp:focus {
          border-color: #94a3b8;
        }
        .txta {
          width: 100%;
          border-radius: 8px;
          border: 1px solid #d7dee8;
          padding: 10px 12px;
          background: #fff;
          outline: none;
          resize: vertical;
        }
        .errText {
          margin-top: 6px;
          font-size: 12px;
          color: #d32f2f;
          font-weight: 600;
        }
        .mtWide {
          margin-top: 12px;
        }
        .btnRow {
          display: flex;
          gap: 16px;
          margin-top: 16px;
        }
        .btn {
          background: #0b1b37;
          color: #fff;
          border: 0;
          border-radius: 10px;
          padding: 11px 26px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .btn:hover:not(:disabled) {
          opacity: 0.95;
        }

        .fuLinkRow {
          margin: 8px 0 10px;
          display: flex;
          justify-content: flex-end;
        }
        .fuLink {
          background: transparent;
          border: 0;
          padding: 0;
          color: #0b1b37;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
        }
        .fuLink:hover {
          opacity: 0.85;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }
        .modalCard {
          width: min(860px, 96vw);
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.22);
          overflow: hidden;
        }
        .modalHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #e6ebf2;
        }
        .modalTitle {
          font-size: 15px;
          font-weight: 900;
          color: #1d2a3b;
        }
        .modalClose {
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
        .modalClose:hover {
          background: #f6f8fb;
        }

        .modalBody {
          padding: 14px 16px 18px;
        }
        .errBox {
          color: #b42318;
          font-weight: 800;
          background: #fff2f2;
          border: 1px solid #ffd2d2;
          border-radius: 10px;
        }
        .tblWrap {
          overflow: auto;
        }
        .tbl {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .tbl th {
          text-align: left;
          background: #f6f8fb;
          border: 1px solid #e6ebf2;
          padding: 10px 10px;
          font-weight: 900;
          color: #1f2937;
        }
        .tbl td {
          border: 1px solid #e6ebf2;
          padding: 10px 10px;
          color: #334155;
          font-weight: 600;
        }

        @media (max-width: 1100px) {
          .formGrid3 {
            grid-template-columns: 1fr;
          }
          .formGrid2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {showCustomerPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "min(560px, 92vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 4px", color: "#0b1b37" }}>Create Customer</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#555" }}>
              This lead is being converted. Confirm the details below to add them as a customer.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ fontSize: 13 }}>First name*
                <input value={customerForm.firstName} onChange={(e) => setCustomerForm((p) => ({ ...p, firstName: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Last name*
                <input value={customerForm.lastName} onChange={(e) => setCustomerForm((p) => ({ ...p, lastName: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Country code*
                <input value={customerForm.countryCode} onChange={(e) => setCustomerForm((p) => ({ ...p, countryCode: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Mobile*
                <input value={customerForm.mobileNo} onChange={(e) => setCustomerForm((p) => ({ ...p, mobileNo: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13, gridColumn: "1 / -1" }}>Email*
                <input value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Nationality*
                <select value={customerForm.nationalityId} onChange={(e) => setCustomerForm((p) => ({ ...p, nationalityId: e.target.value }))} style={cInput}>
                  <option value="">Select...</option>
                  {nationalityOptions.map((n) => (<option key={n.id} value={n.id}>{n.name}</option>))}
                </select>
              </label>
              <label style={{ fontSize: 13 }}>Date of birth*
                <input type="date" value={customerForm.dateOfBirth} onChange={(e) => setCustomerForm((p) => ({ ...p, dateOfBirth: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Gender*
                <select value={customerForm.gender} onChange={(e) => setCustomerForm((p) => ({ ...p, gender: e.target.value }))} style={cInput}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCustomerPopup(false)} disabled={creatingCustomer} style={{ ...cBtn, background: "#e0e0e0", color: "#333" }}>Cancel</button>
              <button onClick={handleCreateCustomer} disabled={creatingCustomer} style={cBtn}>{creatingCustomer ? "Creating..." : "Create Customer"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManualOppCustomerDetails;