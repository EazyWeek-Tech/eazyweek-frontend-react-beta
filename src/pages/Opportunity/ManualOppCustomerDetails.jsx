// src/pages/Opportunity/ManualOppCustomerDetails.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";
  import CallButton from "../../components/CallButton";
import { OPP_THEME_CSS } from "./opportunityTheme";
import ConvertedApptDialog from "./ConvertedApptDialog";


/** ---------------- Helpers ---------------- */
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const norm = (v) => safe(v).trim().toLowerCase();

/** Follow-up belongs to WIP only — any other disposition hides the pair. */
const isWipLabel = (label) => {
  const s = norm(label);
  return s === "wip" || s === "work in progress";
};
const pad2 = (n) => String(n).padStart(2, "0");



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

  /* The EDIT route is /manuallead/edit/:leadOppId — it carries no campaign code,
     so the segment after "manuallead" is the literal word "edit". Reading it as
     an oppCode produced URLs like /opportunity/edit/details, which is why a
     converted manual lead did not land back on its campaign. The campaign page
     passes the real code in navigate state, so prefer that. */
  const fromState = safe(location?.state?.oppCode).trim();
  if (fromState) return fromState;

  const parts = (location?.pathname || "").split("/").filter(Boolean);
  // expecting: ["manuallead", "Bright-00522", "BRI197?"]
  const idx = parts.findIndex((p) => norm(p) === "manuallead");
  const next = idx >= 0 ? safe(parts[idx + 1]).trim() : "";
  return norm(next) === "edit" ? "" : next;
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
  // Follow-up is optional — a blank field is sent as null, not silently defaulted.
  const dateStr = safe(yyyyMmDd).trim();
  if (!dateStr) return null;
  const minAllowed = getTodayInputDate();
  return dateStr < minAllowed ? minAllowed : dateStr; // "YYYY-MM-DD"
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
/** ✅ Session resolver for centre preselect (Bright / LNS / MXM / Silk ...)
 *  Returns the ACTIVE centre code the app stores at login and rewrites on
 *  "Change Centre".
 *
 *  Priority:
 *    1. direct string keys  (loginCode / topCode / centerCode)  ← freshest
 *    2. session objects     (userSession, session, auth, ...)
 *    3. logged-in user obj  (user.centerCode)
 *
 *  ⚠ The previous version fell through to `raw.trim()` for ANY candidate key
 *  that merely EXISTED. So `userSession` returned its whole JSON blob and
 *  `token` returned the JWT — neither matches a centre code or name, which is
 *  why the Centre preselect silently did nothing on a Lead page load. The
 *  guards below make sure only a short code/name can ever be returned.
 */
const CENTRE_KEY_FIELDS = [
  "loginCode",
  "LoginCode",
  "topCode",
  "TopCode",
  "centerCode",
  "CenterCode",
  "centreCode",
  "CentreCode",
  "center",
  "centre",
  "clinicCode",
  "branchCode",
  "companyCode",
];

// A usable centre key is a short code / name — never JSON, never a JWT.
const looksLikeCentreKey = (v) => {
  const s = safe(v).trim();
  if (!s || s.length > 40) return false;
  if (/[{}\[\]"]/.test(s)) return false;                 // JSON blob
  if (s.split(".").length === 3 && s.length > 20) return false; // JWT
  return true;
};

const pickCentreFromObject = (obj, depth = 0) => {
  if (!obj || typeof obj !== "object" || depth > 3) return "";

  for (const f of CENTRE_KEY_FIELDS) {
    if (looksLikeCentreKey(obj[f])) return safe(obj[f]).trim();
  }

  for (const nest of ["data", "result", "user", "session", "userSession", "payload"]) {
    const v = pickCentreFromObject(obj[nest], depth + 1);
    if (v) return v;
  }

  return "";
};

const getSessionCentreKey = () => {
  const stores = [];
  try {
    if (typeof sessionStorage !== "undefined") stores.push(sessionStorage);
  } catch {}
  try {
    if (typeof localStorage !== "undefined") stores.push(localStorage);
  } catch {}

  const readRaw = (st, k) => {
    try {
      return st.getItem(k);
    } catch {
      return null;
    }
  };

  const fromJson = (raw) => {
    const t = safe(raw).trim();
    if (!t.startsWith("{") && !t.startsWith("[")) return "";
    try {
      return pickCentreFromObject(JSON.parse(t));
    } catch {
      return "";
    }
  };

  // 1) direct string keys — loginCode is rewritten to the ACTIVE centre on switch
  const DIRECT_KEYS = [
    "loginCode",
    "LoginCode",
    "topCode",
    "TopCode",
    "centerCode",
    "centreCode",
    "center",
    "centre",
    "clinicCode",
  ];
  for (const st of stores) {
    for (const k of DIRECT_KEYS) {
      const raw = readRaw(st, k);
      if (!raw) continue;

      const nested = fromJson(raw);
      if (nested) return nested;

      const t = raw.trim();
      if (looksLikeCentreKey(t)) return t;
    }
  }

  // 2) session / user objects (userSession is the one Header.jsx maintains)
  const OBJECT_KEYS = [
    "userSession",
    "session",
    "sessionInfo",
    "loginSession",
    "authSession",
    "auth",
    "loginInfo",
    "user",
    "userDetails",
    "currentUser",
    "authUser",
    "sessionUser",
  ];
  for (const st of stores) {
    for (const k of OBJECT_KEYS) {
      const v = fromJson(readRaw(st, k));
      if (v) return v;
    }
  }

  // 3) last resort: scan likely-named keys — objects only, never raw text
  for (const st of stores) {
    let n = 0;
    try {
      n = st.length;
    } catch {
      n = 0;
    }
    for (let i = 0; i < n; i++) {
      const k = st.key(i);
      if (!k) continue;

      const nk = norm(k);
      if (
        !nk.includes("session") &&
        !nk.includes("login") &&
        !nk.includes("auth") &&
        !nk.includes("center") &&
        !nk.includes("centre") &&
        !nk.includes("clinic")
      )
        continue;

      const v = fromJson(readRaw(st, k));
      if (v) return v;
    }
  }

  return "";
};

/** ✅ Centre hints carried by a campaign header / API row / grid row.
 *  Column names differ between the getCampaign payload (camelCase) and the raw
 *  SQL projections (UPPERCASE), so read both.
 */
const collectCentreHints = (o) => {
  if (!o || typeof o !== "object") return [];
  return [
    o.centerCode,
    o.CENTERCODE,
    o.centreCode,
    o.CENTRECODE,
    o.clinicCode,
    o.CLINICCODE,
    o.clinicLocation,
    o.ClinicLocation,
    o.CLINICLOCATION,
    o.centerName,
    o.CENTERNAME,
    o.centreName,
    o.CENTRENAME,
    o.center,
    o.centre,
  ]
    .map((v) => safe(v).trim())
    .filter(Boolean);
};

/** ✅ Campaign codes are centre-prefixed: "Bright-00522" -> "Bright".
 *  Only ever used as a hint — it is discarded unless it matches a real option.
 */
const centreCodeFromOppCode = (code) => {
  const s = safe(code).trim();
  if (!s) return "";
  const m = s.match(/^([A-Za-z0-9]+)[-_]/);
  return m ? m[1] : "";
};

/** ✅ Resolve the first hint that matches a loaded Centre option.
 *  Option values are recids (ClinicCentre_FK), hints are codes / names / recids.
 *  Returns "" when nothing matches, so a bad hint can never blank a good value.
 */
const resolveCentreOptionValue = (options, hints) => {
  const opts = (options || []).filter((o) => safe(o?.value).trim());
  if (!opts.length) return "";

  for (const raw of hints || []) {
    const txt = safe(raw).trim();
    if (!txt) continue;
    const h = norm(txt);

    const match =
      opts.find((o) => String(o.value) === txt) ||            // already a recid
      opts.find((o) => norm(o.code) === h) ||                  // Bright / LNS / MXM
      opts.find((o) => norm(o.label) === h) ||                 // exact centre name
      (h.length >= 3
        ? opts.find((o) => norm(o.label).includes(h) || h.includes(norm(o.label)))
        : null);

    if (match?.value) return String(match.value);
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

  const resolvedOppCode = useMemo(
    () => getOppCodeFromUrl(params.oppCode, locationObj),
    // state matters now (see getOppCodeFromUrl) — the pathname alone is not enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.oppCode, locationObj.pathname, locationObj.state?.oppCode]
  );

  const [campaignRecId, setCampaignRecId] = useState(0);
  // ✅ Centre of the campaign this lead is being added to (from getCampaign).
  const [campaignCentreHints, setCampaignCentreHints] = useState([]);
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

    // ✅ optional — both start blank, the user fills them in if they want a follow-up
    followUpDate: "",
    followUpTime: "",

    remarks: "",
  });

  // Follow-up date/time are shown only while the lead is still WIP; for WIP they are
  // mandatory. Any other disposition hides them (and clears them on change).
  const isWipSelected = useMemo(() => {
    const sel = safe(form.dispositionId).trim();
    if (!sel) return false;
    const opt = dispositionOptions.find((o) => String(o.value) === sel);
    return isWipLabel(opt?.label);
  }, [dispositionOptions, form.dispositionId]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Post-conversion dialog (mirrors External Lead Form) ──
  // The customer is created by the save itself (lead/update). This dialog only
  // CONFIRMS that and offers the next step; it collects nothing.
  const [showConvertedPopup, setShowConvertedPopup] = useState(false);
  // LTR: campaign's Appt-Booking-Mandatory flag + conversion context (Case A).
  const [apptMandatory, setApptMandatory] = useState(true);
  const [convertCtx, setConvertCtx] = useState(null);
  const [convertedCustomer, setConvertedCustomer] = useState(null);
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

  /** ✅ Auto-populate Centre (create mode only).
   *
   *  The Centre <select> holds RECIDs (ClinicCentre_FK), while every available
   *  hint is a CODE ("Bright") or a NAME ("Centre A"), so each hint is resolved
   *  against the loaded options and only an actual match is applied.
   *
   *  Hints differ per entry point — which is why this only ever failed on
   *  "+ Add Lead":
   *    • + Add Opportunity  -> /manuallead/:oppCode/:custId
   *                            row / FetchCustomerDetails supply the customer's
   *                            centre, so hints 1-2 hit. This always worked.
   *    • + Add Lead         -> /manuallead/:oppCode
   *                            no customer, no row, and header.clinicLocation
   *                            does not exist — every old hint was empty, so the
   *                            field stayed blank. Hints 3-6 cover it.
   */
  useEffect(() => {
    if (isEdit) return;                                        // getLead supplies clinicCentre_FK
    if (centerTouchedRef.current) return;                      // user picked one — never override
    if (!centerOptions || centerOptions.length <= 1) return;    // options not loaded yet

    setForm((p) => {
      // already holding a valid option value → leave it
      if (p.centerCode && centerOptions.some((o) => String(o.value) === String(p.centerCode))) return p;

      const hints = [
        // 1. the grid row the page was opened from (Opportunity flow)
        row?.clinicLocation,
        ...collectCentreHints(row),
        // 2. the customer's centre already parked in the form by FetchCustomerDetails
        p.centerCode,
        // 3. the centre the user is logged in to (requested default)
        getSessionCentreKey(),
        // 4. the campaign header passed in navigation state
        state?.header?.clinicLocation,
        ...collectCentreHints(state?.header),
        // 5. the campaign fetched by getCampaign
        ...campaignCentreHints,
        // 6. last resort — campaign codes are centre-prefixed ("Bright-00522")
        centreCodeFromOppCode(resolvedOppCode),
      ];

      const value = resolveCentreOptionValue(centerOptions, hints);

      // Diagnostic: if Centre is still blank, this shows which hints existed.
      if (!value) {
        console.warn("⚠ Centre preselect found no match.", {
          hints: hints.map((h) => safe(h).trim()).filter(Boolean),
          sessionCentre: getSessionCentreKey(),
          options: centerOptions
            .filter((o) => o.value)
            .map((o) => ({ code: o.code, name: o.label, recid: o.value })),
        });
      }

      return value ? { ...p, centerCode: value } : p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerOptions, isEdit, form.centerCode, campaignCentreHints, resolvedOppCode]);

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
        // ✅ "+ Add Lead" arrives with no customer, so the campaign's own centre
        //    is one of the few reliable hints available on that path.
        setCampaignCentreHints(collectCentreHints(data));
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
          // No stored date leaves the field blank rather than defaulting to today.
          const fixedDate = apiDate ? (apiDate < min ? min : apiDate) : safe(p.followUpDate);

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
            followUpTime: parsedTime || safe(p.followUpTime),

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

      // Moving off WIP hides the follow-up pair — drop any value it held so a stale
      // date/time is never submitted.
      if (name === "dispositionId") {
        const opt = dispositionOptions.find((o) => String(o.value) === safe(value).trim());
        if (!isWipLabel(opt?.label)) {
          next.followUpDate = "";
          next.followUpTime = "";
        }
      }

      // ✅ optional: clearing leaves it blank; a picked date still respects the minimum
      if (name === "followUpDate") {
  const v = safe(value).trim();
  const min = isEdit ? getTodayInputDate() : getTomorrowInputDate();
  next.followUpDate = !v ? "" : v < min ? min : v;
}

      // ✅ time is optional too — "--" stays "--"

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

    // Mandatory only when the disposition is WIP.
    if (isWipSelected) {
      if (!safe(form.followUpDate).trim()) e.followUpDate = "Follow Up Date is required.";
      if (!safe(form.followUpTime).trim()) e.followUpTime = "Follow Up Time is required.";
    }

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

  // Follow-up is optional — blank in, blank out. Only a filled date is clamped.
  const resolveFollowUpForPayload = (currentForm) => {
      const min = isEdit ? getTodayInputDate() : getTomorrowInputDate();

    const dateValRaw = safe(currentForm?.followUpDate).trim();
    const timeVal = safe(currentForm?.followUpTime).trim();

    const dateVal = !dateValRaw ? "" : dateValRaw < min ? min : dateValRaw;

    return { finalDate: dateVal, finalTime: timeVal };
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

      // ✅ NO UTC — null when the user left it blank, otherwise today or later
      followUpDate: toFollowUpDateOnly(finalDate),

      followUpTime: toTimeSpanOrNull(finalTime),

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
    // The `type === "lead" ? 0` shortcut used to sit here and was wrong once
    // conversion started auto-creating customers: a converted Lead DOES carry a
    // Customer_FK, and sending 0 made the backend blank it on every later save —
    // which lost the CustID and let the next conversion mint a second customer.
    // Send whatever the record actually has, whatever the Prospect Type says.
    // (The backend now COALESCEs too, so 0 is never destructive either way.)
    const customerFkForUpdate =
      toNumberOr0(originalCustomerRecIdFromApi) || toNumberOr0(leadApi?.customer_FK) || 0;

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

      // ✅ NO UTC — null when the user left it blank, otherwise today or later
      followUpDate: toFollowUpDateOnly(finalDate),

      followUpTime: toTimeSpanOrNull(finalTime),

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

  // dialog styles (kept inline to mirror the external form)
  const cBtn   = { background: "#18396E", color: "#fff", border: 0, borderRadius: 10, padding: "10px 22px", fontWeight: 700, cursor: "pointer" };

  // Route to Appointment Booking with the converted lead's customer.
  // Called two ways: directly after a converting save when the campaign has
  // Appt Booking Mandatory = Yes (no dialog — FRD 6.2 Case A), and from the
  // dialog's Yes button when it is No (FRD 6.3). Both take the customer and the
  // context as arguments because setState has not flushed on the direct path.
  const goToBooking = (custIdArg, ctxArg) => {
    const newCustId = String(custIdArg || convertedCustomer?.custId || "").trim();
    const ctx = ctxArg || convertCtx;
    if (!newCustId) { navigate(isEdit ? -1 : (isLead ? -1 : -2)); return; }
    navigate(APPOINTMENT_ROUTE, { state: {
      ltrConversion: {
        leadSource: ctx?.leadSource || "MANUAL",
        leadRecId:  ctx?.leadRecId || String(numericLeadOppId || ""),
        oppCode:    ctx?.oppCode || safe(resolvedOppCode).trim(),
        custId:     newCustId,
      },
      newCustomer: {
        custId: newCustId, custid: newCustId,
        firstName: safe(form.firstName).trim(),
        lastName:  safe(form.lastName).trim(),
        mobile:    safe(form.mobile).trim(),
        name:      `${safe(form.firstName).trim()} ${safe(form.lastName).trim()}`.trim(),
      },
    }});
  };

  // Dialog action — Yes. Same destination and same revert-on-abandon rule as the
  // mandatory path: leaving the booking screen unsaved puts the lead back to
  // WIP + "Appointment Booking Failed".
  const handleBookAppointment = () => {
    setShowConvertedPopup(false);
    goToBooking();
  };

  // Dialog action — No. The lead stays Converted with Appointment ID = Pending
  // and is mapped later from the Appointment ID dropdown on Campaign Details.
  const handleSkipAppointment = () => {
    setShowConvertedPopup(false);
    navigate(isEdit ? -1 : (isLead ? -1 : -2));
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
        // updateLead returns { success, message, data:{ convert, customer, customerError } }
        const rd = saveRes?.data ?? saveRes;
        if (rd?.convert) {
          // LTR: conversion context for post-customer routing. Prefer the save
          // response's flag over the campaign fetch, and keep a local copy — the
          // direct (mandatory) route below runs before setState has flushed.
          const mandatory = (rd?.apptMandatory ?? apptMandatory) !== false;
          const ctx = {
            apptMandatory: mandatory,
            leadSource: "MANUAL",
            leadRecId:  String(numericLeadOppId || ""),
            oppCode:    safe(resolvedOppCode).trim(),
          };
          setConvertCtx(ctx);

          if (rd.customerError) {
            // Lead converted but the customer write failed — never fail silently.
            alert(
              "The lead was converted, but the customer could not be created:\n\n" +
              rd.customerError +
              "\n\nPlease add the customer from Customer Master."
            );
            setSaving(false);
            navigate(-1);
            return;
          }

          const cust = rd.customer || null;
          if (cust && cust.custId) {
            setConvertedCustomer(cust);
            showToast(
              cust.existing
                ? `Converted - linked to customer ${cust.custId}`
                : `Lead converted - customer ${cust.custId} created`
            );
            setSaving(false);

            // Case A (FRD 6.2) — booking mandatory: no dialog at all, go straight
            // to the Appointment screen. The conversion only sticks if a booking
            // is saved there; abandoning it reverts the lead to WIP.
            if (mandatory) { goToBooking(cust.custId, ctx); return; }

            // Case B (FRD 6.3) — booking not mandatory: ask.
            setShowConvertedPopup(true);
            return;
          }
        }
        navigate(-1);
        return;
      }

      const apiRes = await createLeadOpp("Open");
      // createOpp returns { success, message, data:{ leadOppId, convert, customer, customerError } }
      const cd = apiRes?.data ?? apiRes;

      try {
        const saved = {
          leadId,
          leadKind,
          oppCode: safe(oppCode),
          custId: safe(cd?.customer?.custId || resolvedCustId),
          status: "Open",
          apiRes,
          salesOwnerRecId: toNumberOr0(salesOwnerRecId),
          createdAt: toLocalDateTimeString(new Date()),
        };
        localStorage.setItem(LS_NEW_LEAD_KEY(oppCode), JSON.stringify(saved));
        window.dispatchEvent(new Event("ew_lead_created"));
      } catch {}

      // Created directly as Converted — same flow as converting from the edit
      // screen: the customer already exists, so confirm it and offer booking.
      if (cd?.convert) {
        // Same as the edit branch: response flag wins, local copy for the direct route.
        const mandatory = (cd?.apptMandatory ?? apptMandatory) !== false;
        const ctx = {
          apptMandatory: mandatory,
          leadSource: "MANUAL",
          leadRecId:  String(cd?.leadOppId || ""),
          oppCode:    safe(resolvedOppCode).trim(),
        };
        setConvertCtx(ctx);

        if (cd.customerError) {
          alert(
            "The lead was created as Converted, but the customer could not be created:\n\n" +
            cd.customerError +
            "\n\nPlease add the customer from Customer Master."
          );
          setSaving(false);
          navigate(isLead ? -1 : -2);
          return;
        }

        const cust = cd.customer || null;
        if (cust && cust.custId) {
          setConvertedCustomer(cust);
          showToast(
            cust.existing
              ? `Lead converted - linked to existing customer ${cust.custId}`
              : `Lead converted - customer ${cust.custId} created`
          );
          setSaving(false);

          // Case A — booking mandatory: straight to the Appointment screen.
          if (mandatory) { goToBooking(cust.custId, ctx); return; }

          // Case B — booking not mandatory: ask.
          setShowConvertedPopup(true);
          return;
        }
      }

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
    <div className="ewOpp">
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

          {/* Row-major, two columns — the field order matches the previous
              (pre-retheme) manual lead form exactly. */}
          <div className="formGrid2">
            <div className="field">
              <label>
                First Name <span className="req">*</span>
              </label>
              <input className={`inp ${errors.firstName ? "err" : ""}`} name="firstName" autoComplete="one-time-code" value={form.firstName} onChange={onChange} placeholder="First Name" />
              {errors.firstName && <div className="errText">{errors.firstName}</div>}
            </div>

            <div className="field">
              <label>
                Last Name <span className="req">*</span>
              </label>
              <input className={`inp ${errors.lastName ? "err" : ""}`} name="lastName" autoComplete="one-time-code" value={form.lastName} onChange={onChange} placeholder="Last Name" />
              {errors.lastName && <div className="errText">{errors.lastName}</div>}
            </div>

            <div className="field">
              <label>Country Code</label>
              <input className="inp" name="countryCode" autoComplete="one-time-code" value={form.countryCode} onChange={onChange} placeholder="Country Code" />
            </div>

            <div className="field">
              <label>
                Mobile <span className="req">*</span>
              </label>
              <input className={`inp ${errors.mobile ? "err" : ""}`} name="mobile" autoComplete="one-time-code" value={form.mobile} disabled={!isLead} inputMode="numeric" maxLength={15} onChange={(e) => { const digits = safe(e.target.value).replace(/[^\d]/g, "").slice(0, 15); setForm((p) => ({ ...p, mobile: digits })); }} placeholder="Mobile" />
              {errors.mobile && <div className="errText">{errors.mobile}</div>}
            </div>

            <div className="field">
              <label>Email</label>
              <input className={`inp ${errors.email ? "err" : ""}`} name="email" autoComplete="one-time-code" value={form.email} onChange={onChange} placeholder="Email" />
              {errors.email && <div className="errText">{errors.email}</div>}
            </div>

            {/* Email sat alone on its row in the old layout — this keeps Preferred
                Language starting a fresh row on the left. */}
            <div className="fieldSpacer" aria-hidden="true" />

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

        </fieldset>

        <fieldset className="fs">
          {/* Card header. A plain div, not a <legend>: Chrome imposes its own layout
              on a rendered legend, so a title-plus-action row cannot be laid out
              inside one reliably. Matches the other three campaign forms. */}
          <div className="fsHead" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}>
            <div className="fsTitle">Lead Disposition</div>
            {/* Session history — same control and placement as R1–R7. */}
            <button
              type="button"
              className="fuBtn"
              onClick={openFollowUpModal}
              style={{
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1.35,
                letterSpacing: 0,
                textTransform: "none",
                whiteSpace: "nowrap",
                color: "#fff",
                background: "#334b71",
                border: "1px solid #334b71",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Check Follow Up History
            </button>
          </div>

          {/* Same two-column, row-major order as the previous form:
              Disposition / Sub-Disposition, then the follow-up pair. */}
          <div className="formGrid2">
            <div className="field">
              <label>
                Disposition <span className="req">*</span>
              </label>
              <select className="inp" name="dispositionId" value={form.dispositionId} onChange={onChange} disabled={dispLoading}>
                {dispositionOptions.map((d) => (
                  <option key={d.value || d.label} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>
                Sub-Disposition <span className="req">*</span>
              </label>
              <select className="inp" name="subDispositionId" value={form.subDispositionId} onChange={onChange} disabled={subDispLoading || !form.dispositionId}>
                {subDispositionOptions.map((s) => (
                  <option key={s.value || s.label} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Follow-up is a WIP-only field pair. */}
            {isWipSelected && (
              <>
                <div className="field">
                  <label>
                    Follow Up Date <span className="req">*</span>
                  </label>
                  <input type="date" className="inp" name="followUpDate" value={form.followUpDate} onChange={onChange} min={minFollowUpDate} />
                  {errors.followUpDate && <div className="errText">{errors.followUpDate}</div>}
                </div>

                <div className="field">
                  <label>
                    Follow Up Time <span className="req">*</span>
                  </label>
                  <select className="inp" name="followUpTime" value={form.followUpTime} onChange={onChange}>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value || t.label} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {errors.followUpTime && <div className="errText">{errors.followUpTime}</div>}
                </div>
              </>
            )}
          </div>


          <div className="field mtWide">
            <label>Remarks</label>
            <textarea className="txta" rows={5} name="remarks" value={form.remarks} onChange={onChange} />
          </div>
        </fieldset>

        <div className="btnRow">
          {lockForm && (
            <div style={{ alignSelf: "center", marginRight: "auto", fontSize: 13, color: "#8a6d3b", background: "#fcf8e3", border: "1px solid #faebcc", borderRadius: 8, padding: "8px 12px" }}>
              This lead is closed and can no longer be updated.
            </div>
          )}

          {!lockForm && (
            <button className="btn" onClick={handleSubmit} disabled={saving || leadLoading || (isEdit && !leadApi)}>
              {isEdit ? "Update" : "Submit"}
            </button>
          )}

          <button className="btn ghost" onClick={() => navigate(-1)} disabled={saving}>
            Back
          </button>
        </div>
      </div>

      {errors.salesOwner && <div className="errText">{errors.salesOwner}</div>}

      <style jsx="true">{OPP_THEME_CSS}</style>

      {/* LTR Case B (FRD 6.3) — only reached when the campaign has
          Appt Booking Mandatory = No. */}
      <ConvertedApptDialog
        open={showConvertedPopup}
        custId={convertedCustomer?.custId || ""}
        existing={!!convertedCustomer?.existing}
        showProfileNote={!convertedCustomer?.existing}
        onBook={handleBookAppointment}
        onSkip={handleSkipAppointment}
      />
    </div>
  );
};

export default ManualOppCustomerDetails;