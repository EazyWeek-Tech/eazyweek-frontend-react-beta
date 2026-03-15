import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import GeneralTab from "./CaseDetails/GeneralTab";
import IssuesTab from "./CaseDetails/IssuesTab";
import SLATab from "./CaseDetails/SLATab";
import JourneyTab from "./CaseDetails/JourneyTab";
import ExpenseTab from "./CaseDetails/ExpenseTab";
import Toast from "../../components/Toast";
import { API_BASE_URL } from "../../config";

// --------------------------------------------
// Config
// --------------------------------------------
const USE_PLACEHOLDERS_ON_UPDATE_STATUS = true;

// --------------------------------------------
// Utils
// --------------------------------------------
const sanitizeEmailList = (str) => {
  if (!str) return "";
  return str
    .split(",")
    .map((email) =>
      email
        .trim()
        // ✅ Remove all non-printable and non-ASCII characters
        .replace(/[^\x20-\x7E]/g, "")
        .trim()
    )
    .filter((email) => email.length > 0 && isLikelyEmail(email))
    .join(",");
};
const trim = (s) => (s ?? "").toString().trim();
const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    const t = trim(v);
    if (t) return t;
  }
  return "";
};
const isNonEmpty = (v) =>
  v !== undefined && v !== null && (typeof v === "number" || trim(v) !== "");
const mergeVal = (g, c) => {
  const gv = typeof g === "string" ? trim(g) : g;
  const cv = typeof c === "string" ? trim(c) : c;
  return isNonEmpty(gv) ? gv : cv;
};
const norm = (s) => (s ?? "").toString().trim().toLowerCase();
const normalizeName = (s) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
const normCodeId = (s) => trim(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

const normNameBase = (s) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^dr\.?\s*/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");

const readOrgContext = (general, current) => {
  const ss = (k) => getStore(k);

  // include common object keys (case variations)
  const objKeys = [
    "user",
    "userDetails",
    "currentUser",
    "authUser",
    "sessionUser",
    "userSession",
    "UserSession",
    "usersession",
  ];

  const fromJson = (k) => {
    for (const key of objKeys) {
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (!raw) continue;

      try {
        const obj = JSON.parse(raw);
        const val =
          obj?.[k] ??
          obj?.[k?.toLowerCase?.()] ??
          obj?.[k?.toUpperCase?.()];
        if (isNonEmpty(val)) return trim(val);
      } catch {}
    }
    return "";
  };

  // ✅ This is your requirement:
  // take centerCode from localStorage.UserSession.loginCode (fallback to topCode)
  const loginCode = firstNonEmpty(
    ss("loginCode"),
    ss("LoginCode"),
    fromJson("loginCode"),
    fromJson("LoginCode"),
    fromJson("topCode"),
    fromJson("TopCode")
  );

  const topGuess = firstNonEmpty(
    ss("topCode"),
    ss("TopCode"),
    fromJson("topCode"),
    fromJson("TopCode"),
    loginCode
  );

  const centerGuess = firstNonEmpty(
    loginCode,                  // ✅ highest priority
    topGuess,
    general?.centerCode,
    current?.centerCode,
    ss("centerCode"),
    ss("CenterCode"),
    ss("centercode"),
    ss("job"),
    fromJson("centerCode"),
    fromJson("CenterCode"),
    fromJson("job")
  );

  const departmentGuess = firstNonEmpty(
    general?.departmentCode,
    current?.departmentCode,
    ss("departmentCode"),
    ss("DepartmentCode"),
    ss("deptCode"),
    ss("depCode"),
    fromJson("departmentCode"),
    fromJson("DepartmentCode")
  );

  const clinicGuess = firstNonEmpty(
    general?.custClinicCode,
    current?.custClinicCode,
    ss("custClinicCode"),
    ss("clinicCode"),
    ss("ClinicCode"),
    fromJson("custClinicCode"),
    fromJson("clinicCode"),
    fromJson("ClinicCode")
  );

  return {
    centercode: centerGuess || "",
    centerCode: centerGuess || "",       // ✅ alias for backend expecting centerCode
    departmentcode: departmentGuess || "",
    departmentCode: departmentGuess || "", // ✅ alias
    custcliniccode: clinicGuess || "",
    custClinicCode: clinicGuess || "",     // ✅ alias
  };
};


const readSessionUser = () => {
  const getAny = (k) =>
    (sessionStorage.getItem(k) ?? localStorage.getItem(k) ?? "").toString();

  const objKeys = ["user", "userDetails", "currentUser", "authUser", "sessionUser", "userSession"];

  let code = "",
    name = "",
    firstName = "",
    lastName = "";

  for (const k of objKeys) {
    const raw = sessionStorage.getItem(k) ?? localStorage.getItem(k);
    if (!raw) continue;

    try {
      const obj = JSON.parse(raw);

      code = firstNonEmpty(
        code,
        obj.userId,
        obj.userID,
        obj.employeeCode,
        obj.empCode,
        obj.code,
        obj.loginCode // sometimes loginCode is the “code”
      );

      firstName = firstNonEmpty(firstName, obj.firstName, obj.firstname, obj.FirstName);
      lastName = firstNonEmpty(lastName, obj.lastName, obj.lastname, obj.LastName);

      name = firstNonEmpty(
        name,
        obj.userName,
        obj.username,
        obj.name,
        (firstName || lastName) ? `${firstName || ""} ${lastName || ""}` : ""
      );
    } catch {}
  }

  // fallback direct keys (both storages)
  code = firstNonEmpty(
    code,
    getAny("userId"),
    getAny("userID"),
    getAny("employeeCode"),
    getAny("empCode"),
    getAny("loginCode")
  );

  firstName = firstNonEmpty(firstName, getAny("firstName"), getAny("firstname"), getAny("FirstName"));
  lastName = firstNonEmpty(lastName, getAny("lastName"), getAny("lastname"), getAny("LastName"));

  name = firstNonEmpty(
    name,
    getAny("userName"),
    getAny("username"),
    (firstName || lastName) ? `${firstName || ""} ${lastName || ""}` : ""
  );

  if (!code && !name && !firstName && !lastName) return null;

  const fullName = firstNonEmpty(`${firstName} ${lastName}`.trim(), name);
  return { code: trim(code), name: trim(name), firstName: trim(firstName), lastName: trim(lastName), fullName: trim(fullName) };
};


// --------------------------------------------
// Guardrails
// --------------------------------------------
function buildRequiredBlock({ actionType, general, current, status, disposition }) {
  const org = readOrgContext(general, current);

  const must = {
    caseno: current?.caseNo,
    centercode: org.centercode,
    centerCode: org.centerCode, // ✅ add this
  };

  if (actionType === "updateStatus") {
    must.status = trim(status);
    if (trim(status) === "Closed") must.casedisposition = trim(disposition);
  }
  return must;
}

function validateRequired(requiredObj) {
  const missing = Object.entries(requiredObj)
    .filter(([, v]) => !isNonEmpty(v))
    .map(([k]) => k);
  return { ok: missing.length === 0, missing };
}
const getStore = (k) =>
  trim(localStorage.getItem(k)) || trim(sessionStorage.getItem(k));

// --------------------------------------------
// Payload builder
// --------------------------------------------
function buildFullPayload({ general, current, status, disposition, operation }) {
  const org = readOrgContext(general, current);
  const assigneeCode = trim(current?.assignToCode) || trim(current?.assignedTo) || "";
  const createddate = new Date().toISOString();
  const S = (v) => (isNonEmpty(v) ? String(v) : "");
  const N = (v) => (Number.isFinite(+v) ? Number(v) : 0);
  const sessionUser = readSessionUser();

  return {
    casetitle: S(mergeVal(general?.title, current?.title)),
    caseno: S(current?.caseNo),
    category: S(mergeVal(general?.categoryCode, current?.categoryCode)),
    subCategory: S(mergeVal(general?.subCategory, current?.subCategory)),
    subSubCategory: S(mergeVal(general?.subSubCategory, current?.subSubCategory)),
    subSubSubCategory: S(mergeVal(general?.subSubSubCategory, current?.subSubSubCategory)),
    casemedium: S(mergeVal(general?.medium, current?.medium)),
    casesource: S(mergeVal(general?.source, current?.source)),
    priority: S(mergeVal(general?.priority, current?.priority)),
    custID: S(mergeVal(general?.customer, current?.customer)),
    productCode: S(mergeVal(general?.productCode, current?.productCode)),
    servicecode: S(mergeVal(general?.service, current?.service)),
    serviceccode: S(mergeVal(general?.serviceCategory, current?.serviceCategory)),
    createdby: S(sessionUser?.code || sessionUser?.name || ""),
    createddate,

    issuedesciption: S(current?.issueDescription),
    clientThreat: S(current?.clientThreat),
    doctorCode: S(current?.therapistCode),
    firsttimeresolution: S(current?.firstTimeResolution),
    response: S(current?.response),

    assignedto: S(assigneeCode),
    employeno: S(current?.employeeMobile),
    assignedemailid: S(current?.email),
    cc: S((current?.cc || "").replace(/\s+,/g, ",").replace(/,+$/g, "")),
    moreCC: S(current?.moreCc),

    categorySpecificResolution: S(
      mergeVal(general?.categorySpecificResolution, current?.categorySpecificResolution)
    ),
    remarks: S(current?.remarks),

    casedisposition: S(isNonEmpty(disposition) ? trim(disposition) : current?.disposition),
    caseWith: S(assigneeCode),
    status: S(trim(status)),

    operation: S(operation),

    materialCost: N(current?.materialCost),
    labourCost: N(current?.labourCOst),
    otherCharges: N(current?.otherCharges),
    totalCharges: N(current?.total),

    isdraft: operation === "save" ? 1 : 0,
    centercode: S(org.centercode),
    centerCode: S(org.centercode),          // ✅ add this
    departmentcode: S(org.departmentcode),
    departmentCode: S(org.departmentcode),  // ✅ add this
    custcliniccode: S(org.custcliniccode),
    custClinicCode: S(org.custcliniccode),  // ✅ add this

  };
}
// --------------------------------------------
// Centers (for centerName from centercode)
// --------------------------------------------
// --------------------------------------------
// Centers (for centerName from centercode)
// --------------------------------------------
let __centersCache = null;
let __centersLoaded = false;

async function loadCentersOnce() {
  if (__centersLoaded) return Array.isArray(__centersCache) ? __centersCache : [];
  __centersLoaded = true;

  try {
    const res = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    __centersCache = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("LoadCenters failed:", e);
    __centersCache = [];
  }

  return __centersCache;
}

function getCenterNameFromCenters(centers, centerCodeRaw) {
  const code = normCodeId(centerCodeRaw); // MXM -> MXM
  if (!code) return "";

  const hit = (centers || []).find((c) => normCodeId(c?.code) === code);
  return trim(hit?.name || "");
}

async function resolveCenterNameForMail({ generalData, selectedCaseData }) {
  // ✅ Always prefer session/loginCode/topCode (your requirement)
  const org = readOrgContext(generalData || {}, selectedCaseData || {});
  const centerCode = trim(org?.centercode || org?.centerCode || "");

  const centers = await loadCentersOnce();
  const name = getCenterNameFromCenters(centers, centerCode);

  // return best available
  return name || centerCode || "Bright Clinics";
}


// --------------------------------------------
// Mail helpers
// --------------------------------------------
async function lookupEmployeeByCode(codeRaw) {
  const code = normCodeId(codeRaw);
  if (!code) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/Employees`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const list = await res.json();
    if (!Array.isArray(list)) return null;
    const hit = list.find((e) => normCodeId(e?.employeeCode) === code);
    return hit
      ? {
          employeeCode: trim(hit.employeeCode),
          employeeName: trim(hit.employeeName),
          emailID: trim(hit.emailID),
          mobileNo: trim(hit.mobileNo),
        }
      : null;
  } catch {
    return null;
  }
}

const isLikelyEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s ?? "").toString().trim());

const cleanupList = (s) => {
  const parts = (s ?? "")
    .toString()
    .replace(/;/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out.join(",");
};

const appendEmailToList = (listStr, email) => {
  const e = (email ?? "").toString().trim();
  if (!e || !isLikelyEmail(e)) return cleanupList(listStr);

  const merged = cleanupList([listStr, e].filter(Boolean).join(","));
  return merged;
};
function buildCaseMailPayload({
  selected,
  centerNameFallback = "Bright Clinics",
  ownerEmail = "",
  centerNameResolved = "",   // ✅ NEW
}) {
  const clean = (s) => (s ?? "").toString().trim();

  const normalizedToList = cleanupList(selected?.email || "");
  const emailToFirst =
    normalizedToList.split(",").find((x) => isLikelyEmail(x)) || clean(selected?.email);
// Keep existing cc + always include case owner email in CC (not To)
// Also keep "moreCc" behavior as-is (it already appends ownerEmail there)
const emailCC = appendEmailToList(cleanupList(selected?.cc || ""));
const moreCC = appendEmailToList(selected?.moreCc || "", ownerEmail);


  return {
    emailTo: sanitizeEmailList(emailToFirst),

    // ✅ use resolved center name
    centerName: clean(centerNameResolved) || clean(selected?.centerName) || centerNameFallback,

    caseNo: clean(selected?.caseNo),
    categoryName: clean(selected?.caseCategory || selected?.categoryName),
    subCategoryName: clean(selected?.subCategoryName),
    issueDescription: clean(selected?.issueDescription),
    newResponse: clean(selected?.response),
    firstTimeResolution: clean(selected?.firstTimeResolution),

    emailCC: sanitizeEmailList(emailCC),
     moreCC: sanitizeEmailList(moreCC),
  };
}

async function sendCaseMail(payload, setToast) {
  try {
    if (!payload.emailTo) {
      setToast?.({
        type: "error",
        message: "Email not sent: missing 'To' email for Assigned To.",
      });
      return;
    }
    const res = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseMail`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const txt = await res.text();
    let out;
    try {
      out = JSON.parse(txt);
    } catch {
      out = { success: res.ok };
    }
    if (!(res.ok && (out?.success ?? true))) {
      setToast?.({
        type: "error",
        message: `Failed to send email${out?.message ? `: ${out.message}` : ""}`,
      });
    }
  } catch (err) {
    setToast?.({ type: "error", message: `Email error: ${err.message}` });
  }
}


// --------------------------------------------
// Mail trigger (call after successful save/submit)
// --------------------------------------------
async function triggerCaseMail({
  selectedCaseData,
  generalData,
  issuesData,
  assigneeCode,              // employee code to send "To" (preferred)
  fallbackToEmail = "",      // if you already have an email string
  setToast,
}) {
  try {
    const emp = assigneeCode ? await lookupEmployeeByCode(assigneeCode) : null;

    const selected = {
      // base case info
      ...(selectedCaseData || {}),
      ...(generalData || {}),
      ...(issuesData || {}),

      // ensure email goes to resolved employee email (preferred)
      email: trim(emp?.emailID || fallbackToEmail || selectedCaseData?.email || ""),

      // optional: if API expects "centerName" / etc
      centerName: trim(selectedCaseData?.centerName || "Bright Clinics"),

      // keep cc/moreCc from latest state
      cc: trim((issuesData?.cc ?? selectedCaseData?.cc) || ""),
      moreCc: trim((issuesData?.moreCc ?? selectedCaseData?.moreCc) || ""),

      // ensure response present in mail
      response: trim(issuesData?.response ?? selectedCaseData?.response ?? ""),
      firstTimeResolution: trim(
        issuesData?.firstTimeResolution ?? selectedCaseData?.firstTimeResolution ?? ""
      ),
      issueDescription: trim(
        issuesData?.issueDescription ?? selectedCaseData?.issueDescription ?? ""
      ),
    };
    
   const ownerEmail =
  trim(
    selected?.caseOwnerEmail ||
    selected?.ownerEmail ||
    selected?.caseOwnerEMailID ||
    selectedCaseData?.caseOwnerEmail ||
    selectedCaseData?.ownerEmail ||
    selectedCaseData?.caseOwnerEMailID ||
    ""
  ) || "";


  const centerNameResolved = await resolveCenterNameForMail({
  generalData,
  selectedCaseData,
});


const mailPayload = buildCaseMailPayload({
  selected,
  centerNameResolved,
  centerNameFallback: "Bright Clinics",
  ownerEmail, // ✅ now passed correctly
});

console.log("MAIL PAYLOAD", mailPayload);

await sendCaseMail(mailPayload, setToast); // ✅ only once
  } catch (e) {
    // do NOT break save/submit for mail failures
    setToast?.({
      type: "error",
      message: `Case saved/submitted, but email failed: ${e?.message || "Unknown error"}`,
    });
  }
}

// --------------------------------------------
// Session sync (centerCode) helpers
// --------------------------------------------
const SESSION_SET_API = (base) => `${base}/api/session/set`;

const readUserSessionRaw = () => {
  // Try common keys (your app uses UserSession/sessionId etc.)
  const keys = ["UserSession", "userSession", "sessionUser", "user", "userDetails", "currentUser", "authUser"];
  for (const k of keys) {
    const raw = localStorage.getItem(k) ?? sessionStorage.getItem(k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      const loginCode = firstNonEmpty(obj?.loginCode, obj?.LoginCode, obj?.topCode, obj?.TopCode);
      const topCode = firstNonEmpty(obj?.topCode, obj?.TopCode, obj?.loginCode, obj?.LoginCode);
      const userID = firstNonEmpty(obj?.userID, obj?.userId, obj?.UserID, obj?.employeeCode, obj?.empCode);
      if (loginCode || topCode || userID) {
        return {
          key: k,
          rawObj: obj,
          loginCode: trim(loginCode),
          topCode: trim(topCode),
          userID: trim(userID),
        };
      }
    } catch {}
  }

  // fallback direct keys
  const loginCode = trim(localStorage.getItem("loginCode") ?? sessionStorage.getItem("loginCode"));
  const topCode = trim(localStorage.getItem("topCode") ?? sessionStorage.getItem("topCode"));
  const userID = trim(localStorage.getItem("userID") ?? sessionStorage.getItem("userID"));
  if (loginCode || topCode || userID) return { key: null, rawObj: null, loginCode, topCode, userID };

  return null;
};

const writeUserSessionCenter = ({ centerCode, userID }) => {
  // update common direct keys (safe)
  localStorage.setItem("loginCode", centerCode);
  localStorage.setItem("topCode", centerCode);
  if (userID) localStorage.setItem("userID", userID);

  sessionStorage.setItem("loginCode", centerCode);
  sessionStorage.setItem("topCode", centerCode);
  if (userID) sessionStorage.setItem("userID", userID);

  // update JSON object if present
  const keys = ["UserSession", "userSession"];
  for (const k of keys) {
    const raw = localStorage.getItem(k) ?? sessionStorage.getItem(k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      obj.loginCode = centerCode;
      obj.topCode = centerCode;
      if (userID) obj.userID = obj.userID || userID;

      // write back to BOTH storages (covers whichever your app reads later)
      localStorage.setItem(k, JSON.stringify(obj));
      sessionStorage.setItem(k, JSON.stringify(obj));
    } catch {}
  }
};

async function syncSessionCenterIfNeeded({ apiCenterCode, apiBaseUrl }) {
  const centerFromApi = trim(apiCenterCode);
  if (!centerFromApi) return { didSync: false, reason: "API centerCode empty" };

  const current = readUserSessionRaw();
  const currentLogin = trim(current?.loginCode);
  const currentTop = trim(current?.topCode);
  const userID = trim(current?.userID);

  // if missing userID, still allow sync but call may fail depending on backend rules
  const same =
    currentLogin.toLowerCase() === centerFromApi.toLowerCase() &&
    currentTop.toLowerCase() === centerFromApi.toLowerCase();

  if (same) return { didSync: false, reason: "Already matching" };

  // prevent infinite loop
  const guardKey = `__center_sync_done__${centerFromApi}`;
  if (sessionStorage.getItem(guardKey) === "1") {
    return { didSync: false, reason: "Guard active (already tried)" };
  }
  sessionStorage.setItem(guardKey, "1");

  // call backend session set
  const payload = { loginCode: centerFromApi, topCode: centerFromApi, userID: userID || "" };

  const res = await fetch(SESSION_SET_API(apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const txt = await res.text();
  if (!res.ok) {
    throw new Error(`Session set failed: HTTP ${res.status} ${res.statusText} - ${txt.slice(0, 160)}`);
  }

  // update local/session storage too (frontend uses it everywhere)
  writeUserSessionCenter({ centerCode: centerFromApi, userID });

  return { didSync: true, reason: "Session updated" };
}


// --------------------------------------------
// Component
// --------------------------------------------
const CaseDetailsPage = () => {
  const { caseNumber } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("general");
  const [selectedCaseData, setSelectedCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disposition, setDisposition] = useState("");
  const submitClickLockRef = useRef(false);

  const [status, setStatus] = useState("");          // real status (backend truth)
  const [uiStatus, setUiStatus] = useState("");      // ✅ NEW: dropdown display status

  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => readSessionUser());
  const [stage1Code, setStage1Code] = useState("");
  const [isResponseFilled, setIsResponseFilled] = useState(false);

  const [pendingClose, setPendingClose] = useState(false); // close intent gate

  const initialStatusRef = useRef(null);
  const issuesRef = useRef();
  const generalRef = useRef();
  const expenseRef = useRef();
  const journeyRef = useRef();
  const slaRef = useRef();

  // tab loader
  const [tabLoading, setTabLoading] = useState(false);
  const tabTimerRef = useRef(null);

  // hierarchy
  const [hierarchy, setHierarchy] = useState(null);
  const [hierLoading, setHierLoading] = useState(false);
  const [hierErr, setHierErr] = useState("");

  // employees cache
  const [employees, setEmployees] = useState([]);

  // L2 dialog
  const [l2DialogOpen, setL2DialogOpen] = useState(false);
  const [l2ReassignCode, setL2ReassignCode] = useState("");
  const [l2DialogError, setL2DialogError] = useState("");

  useEffect(() => {
    return () => {
      if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
    };
  }, []);

  const formatCreatedDate = (raw) => {
    if (!raw || raw === "0001-01-01T00:00:00") return "-";
    const m = /^(\d{2})\/(\d{2})\/(\d{4})(.*)?$/.exec(raw);
    if (m) {
      const [, dd, MM, yyyy] = m;
      return `${dd}/${MM}/${yyyy}`;
    }
    const d = new Date(raw);
    return isNaN(d)
      ? "-"
      : d.toLocaleString("en-IN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
  };

  // --- Fetch case details ---
  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseDetails/${caseNumber}`,
          { credentials: "include" }
        );
        const data = await response.json();


        // ✅ NEW requirement: auto-sync session centerCode if mismatch
try {
  const apiCenter = trim(data?.centerCode); // e.g. "Bright"
  const didTryKey = `__case_center_sync__${caseNumber}`;

  // run only once per caseNumber load
  if (apiCenter && sessionStorage.getItem(didTryKey) !== "1") {
    sessionStorage.setItem(didTryKey, "1");

    const sync = await syncSessionCenterIfNeeded({
      apiCenterCode: apiCenter,
      apiBaseUrl: API_BASE_URL,
    });

    if (sync?.didSync) {
      // ✅ reload same page (keeps same route)
      window.location.reload();
      return; // stop further mapping/render
    }
  }
} catch (e) {
  console.error("Center sync failed:", e);
  // do NOT block page if sync fails
}


        const mappedCurrentCode = trim(firstNonEmpty(data.caseWithCode, data.caseWithCode));
        const mappedCurrentName = trim(firstNonEmpty(data.caseWithName, data.caseWithName));

        const mappedNextCode = trim(firstNonEmpty(data.assignToCode, data.assignCode, data.emailTOCode));
        const mappedNextName = trim(firstNonEmpty(data.assignTOName, data.assignName, data.emailTOName));

        const mapped = {
          caseNo: trim(data.caseNo),
          title: trim(data.caseTitle),

          categoryCode: trim(data.categoryCode),
          caseCategory: trim(data.categoryName),
          subCategory: trim(data.subCategoryCode),
          subCategoryName: trim(data.subCategoryName),
          subSubCategory: trim(data.subSubCategoryCode),
          subSubCategoryName: trim(data.subSubCategoryName),
          subSubSubCategory: trim(data.subSubSubCategoryCode),
          subSubSubCategoryName: trim(data.subSubSubCategoryName),

          medium: trim(firstNonEmpty(data.mediumCode, data.mediumName)),
          mediumName: trim(firstNonEmpty(data.mediumName, data.mediumCode)),
          source: trim(data.sourceCode),
          sourceName: trim(data.sourceName),

          priority: trim(data.priority),

          ownerCode: trim(data.caseOwnerCode),
          ownerName: trim(data.caseOwnerName),

          customer: trim(data.custID),
          customerId: trim(data.custID),
          customerName: trim(data.custName),

          productCode: trim(data.productCode),
          product: trim(data.productName),
          service: trim(data.serviceCode),
          serviceName: trim(data.serviceName),
          serviceCategory: trim(data.sServiceCategoryCode),

          createdBy: trim(data.createdBy),
          createdDate: formatCreatedDate(data.createdDate),

          issueDescription: trim(data.issueDescription),
          firstTimeResolution: trim(data.firstTimeResolution),
          clientThreat: trim(data.clientThreat),

          therapistName: trim(data.therapistName),
          therapistCode: trim(data.therapistCode),

          caseWithCode: mappedCurrentCode,
          caseWithName: mappedCurrentName,

          assignedTo: mappedNextCode,
          assignToCode: mappedNextCode,
          assignName: mappedNextName,

          employeeMobile: trim(data.empMobileNo),
          email: trim(data.emailTOEMailID),
          emailTo: trim(data.emailTOName),

          cc: trim((data.emailCC || "").replace(/\s+,/g, ",")).replace(/,+$/g, ""),
          moreCc: trim(data.moreCC),
          remarks: trim(data.remarks),

          categorySpecificResolution: trim(
  firstNonEmpty(
    data.specificResolutionName,
    data.specificResolutionCode,          // ✅ fallback (your case)
    data.categorySpecificResolution,
    data.specificResolution
  )
),


          materialCost: data.materialCost ?? 0,
          labourCost: data.labourCOst ?? 0,
          otherCharges: data.otherCharges ?? 0,
          total: data.total ?? 0,

          slaIdeal: data.slaIdeal || {},
          slaActual: data.slaActual || {},
          disposition: trim(data.disposition),

          caseStatus: trim(data.caseStatus),

          secondSlaName: trim(data.secondSlaName),
          secondSlaCode: trim(data.nextLevelID),
          firstSlaName: trim(data.firstSlaName || ""),
          caseOwnerEmail: trim(data.caseOwnerEmail || data.caseOwnerEMailID || data.ownerEmail || ""),
        };

        setSelectedCaseData(mapped);
        setDisposition(mapped.disposition);

        setStatus(mapped.caseStatus);
        setUiStatus(mapped.caseStatus);  // ✅ NEW: sync UI dropdown to fetched status
        setPendingClose(false);          // ✅ NEW: reset close intent after fresh load

        if (!initialStatusRef.current) {
          initialStatusRef.current = (mapped.caseStatus || "").trim();
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching case details:", error);
        setLoading(false);
      }
    };

    fetchCaseDetails();
  }, [caseNumber]);

  // hierarchy fetch
  useEffect(() => {
    const cat = trim(selectedCaseData?.caseCategory || selectedCaseData?.categoryName);
    const sub = trim(selectedCaseData?.subCategoryName);
    const sub2 = trim(selectedCaseData?.subSubCategoryName);
    const sub3 = trim(selectedCaseData?.subSubSubCategoryName || "NA");
    if (!cat || !sub || !sub2) {
      setHierarchy(null);
      return;
    }

    const run = async () => {
      setHierLoading(true);
      setHierErr("");
      try {
        const url =
          `${API_BASE_URL}/api/CaseOperation/CaseHierarchyDB` +
          `?categoryName=${encodeURIComponent(cat)}` +
          `&subCategoryName=${encodeURIComponent(sub)}` +
          `&subSubCategoryName=${encodeURIComponent(sub2)}` +
          `&subSubSubCategoryName=${encodeURIComponent(sub3)}`;

        const r = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const text = await r.text();
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}: ${text.slice(0, 180)}`);

        let res;
        try {
          res = JSON.parse(text);
        } catch {
          throw new Error(`Invalid JSON: ${text.slice(0, 180)}`);
        }

        let hit = res;
        if (Array.isArray(res)) {
          hit =
            res.find(
              (x) =>
                trim(x?.categoryName).toLowerCase() === cat.toLowerCase() &&
                trim(x?.subCategoryName).toLowerCase() === sub.toLowerCase() &&
                trim(x?.subSubCategoryName).toLowerCase() === sub2.toLowerCase() &&
                trim(x?.subSubSubCategoryName || "NA").toLowerCase() === sub3.toLowerCase()
            ) || null;
        }
        setHierarchy(hit?.status ? hit : hit || null);
      } catch (err) {
        console.error("Hierarchy fetch failed:", err);
        setHierarchy(null);
        setHierErr("Hierarchy not found");
      } finally {
        setHierLoading(false);
      }
    };

    run();
  }, [
    selectedCaseData?.caseCategory,
    selectedCaseData?.categoryName,
    selectedCaseData?.subCategoryName,
    selectedCaseData?.subSubCategoryName,
    selectedCaseData?.subSubSubCategoryName,
  ]);

  useEffect(() => {
    setCurrentUser(readSessionUser());
  }, []);

  useEffect(() => {
    if (activeTab === "issues" && issuesRef.current?.hasResponse) {
      setIsResponseFilled(Boolean(issuesRef.current.hasResponse()));
    }
  }, [activeTab, selectedCaseData]);

  // --- Resolve Stage 1 ---
  useEffect(() => {
    const targetName = (selectedCaseData?.firstSlaName || "").trim();
    if (!targetName) {
      setStage1Code("");
      return;
    }
    const fetchEmp = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Employees`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const list = await res.json();
        const arr = Array.isArray(list) ? list : [];
        setEmployees(arr);

        const want = normNameBase(targetName);
        const match = arr.find((e) => normNameBase(e?.employeeName) === want);
        setStage1Code((match?.employeeCode ?? "").toString().trim());
      } catch (err) {
        console.error("Failed to resolve Stage 1 (firstSlaName) code:", err);
        setStage1Code("");
      }
    };
    fetchEmp();
  }, [selectedCaseData?.firstSlaName]);

  const arrivedAsL2 =
    (initialStatusRef.current || selectedCaseData?.caseStatus || "").trim().toUpperCase() === "WIP";

  const postCaseOperation = async (payload, label = "CaseOperation") => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/CaseOperation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {}

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      if (!parsed || parsed.code !== "200") {
        throw new Error(parsed?.message || "API did not return code 200");
      }
      return parsed;
    } catch (err) {
      console.error("CaseOperation error →", err);
      throw err;
    }
  };

  // --------------------------------------------
  // L1/L2 detection (page-level; uses hierarchy + case)
  // --------------------------------------------
  const ownerDisplay = firstNonEmpty(selectedCaseData?.ownerName, selectedCaseData?.ownerCode, "-");

  const assignedDisplay =
    trim(status) === "Closed"
      ? "-"
      : firstNonEmpty(selectedCaseData?.caseWithName, selectedCaseData?.caseWithCode, "-");

  const curCode = normCodeId(selectedCaseData?.caseWithCode);
  const curName = normNameBase(selectedCaseData?.caseWithName || "");

  const l1Code = normCodeId(stage1Code || "");
  const l1Name = normNameBase(firstNonEmpty(hierarchy?.firstAssignement, selectedCaseData?.firstSlaName, ""));
  const isAtLevel1Now =
    (!!l1Code && !!curCode && l1Code === curCode) || (!!l1Name && !!curName && l1Name === curName);

  const l2Code = normCodeId(firstNonEmpty(selectedCaseData?.secondSlaCode, selectedCaseData?.nextLevelID, ""));
  const l2Name = normNameBase(firstNonEmpty(hierarchy?.secondAssignement, selectedCaseData?.secondSlaName, ""));

  const l1DisplayName = firstNonEmpty(hierarchy?.firstAssignement, selectedCaseData?.firstSlaName, "");
  const l2DisplayName = firstNonEmpty(hierarchy?.secondAssignement, selectedCaseData?.secondSlaName, "");

  const isAtLevel2ByCode = !!l2Code && !!curCode && l2Code === curCode;
  const isAtLevel2ByName = !!l2Name && !!curName && l2Name === curName;
  const isAtLevel2Now = (isAtLevel2ByCode || isAtLevel2ByName) && !isAtLevel1Now;

  const showL2Banner = (() => {
    if (!isAtLevel2Now) return false;
    const disp = trim(assignedDisplay);
    if (!disp || disp === "-") return false;
    const dispAsCodeEq = !!l2Code && normCodeId(disp) === l2Code;
    const dispAsNameEq = !!l2Name && normNameBase(disp) === l2Name;
    return dispAsCodeEq || dispAsNameEq;
  })();

    // --------------------------------------------
  // ✅ NEW: Close allowed only at last hierarchy level
  // --------------------------------------------
  const hasTwoLevelHierarchy = (() => {
    // Prefer hierarchy (CaseHierarchyDB) when available
    const h2 = trim(hierarchy?.secondAssignement);
    if (h2) return true;

    // Fallback to case-details fields if hierarchy isn't loaded
    const s2Name = trim(selectedCaseData?.secondSlaName);
    const s2Code = trim(selectedCaseData?.secondSlaCode || selectedCaseData?.nextLevelID);
    return !!(s2Name || s2Code);
  })();

  // last-level means:
  // - if 2 levels exist => must be at level 2
  // - if only 1 level => allowed at current level
  const isAtLastLevel = hasTwoLevelHierarchy ? isAtLevel2Now : true;

  // ✅ Disable close dropdowns if 2-level hierarchy AND user not at L2
  const closeLock = hasTwoLevelHierarchy && !isAtLastLevel;

  const isBadAssignee = (v) => {
    const s = (v ?? "").toString().trim();
    return !s || s === "-" || /^assign\s*to$/i.test(s);
  };

  const resolveAssigneeForSubmit = ({
    newAssigneeCode,
    prevAssigneeCode,
    stage1Code,
    stage2Code,
    ownerCode,
    currentAssigneeCode,
    currentAssigneeName,
    currentUserCode,
  }) => {
    const pick = (v) => (isBadAssignee(v) ? "" : trim(v));
    return (
      pick(newAssigneeCode) ||
      pick(prevAssigneeCode) ||
      pick(stage1Code) ||
      pick(stage2Code) ||
      pick(ownerCode) ||
      pick(currentAssigneeCode) ||
      pick(currentAssigneeName) ||
      pick(currentUserCode) ||
      ""
    );
  };

  // --------------------------------------------
  // Tab click handler with loader (3 seconds)
  // --------------------------------------------
  const handleTabClick = (tabKey) => {
    if (tabKey === activeTab) return;
    if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
    setTabLoading(true);
    setActiveTab(tabKey);
    tabTimerRef.current = setTimeout(() => setTabLoading(false), 3000);
  };

  // --------------------------------------------
  // Close prerequisites (UI gate only)
  // --------------------------------------------
  if (loading) return <div>Loading case details...</div>;
  if (!selectedCaseData) return <div>Case not found</div>;

 const isComplaintCase = (() => {
  const name = trim(selectedCaseData?.caseCategory || selectedCaseData?.categoryName || "").toLowerCase();
  const code = trim(selectedCaseData?.categoryCode || "").toLowerCase();

  // match common variations
  if (name.includes("complaint")) return true;

  // if your DB has complaint category codes, add them here:
  // if (["cmp", "complaint", "cc001"].includes(code)) return true;

  return false;
})();

  const getLatestResponse = () => {
    const issuesData = issuesRef.current?.getIssuesData?.() ?? {};
    return trim(issuesData.response || selectedCaseData?.response || "");
  };

  const getLatestCSR = () => {
    const generalData = generalRef.current?.getGeneralData?.() ?? {};
    return trim(generalData.categorySpecificResolution || selectedCaseData?.categorySpecificResolution || "");
  };

  const checkClosePrereqs = () => {
    const respOk = !!getLatestResponse();
    const dispOk = !!trim(disposition);
    const csrOk = !isComplaintCase || !!getLatestCSR();
    return { ok: respOk && dispOk && csrOk, respOk, dispOk, csrOk };
  };

  // ✅ IMPORTANT: "closed" must be based on REAL status only
  const closed = trim(status) === "Closed";

  // EDIT PERMISSION: only current assignee
  const currentAssigneeCodeNorm = normCodeId(selectedCaseData?.caseWithCode);
  const currentAssigneeNameNorm = normalizeName(selectedCaseData?.caseWithName);
  const currentUserCodeNorm = normCodeId(currentUser?.code);
  const currentUserNameNorm = normalizeName(currentUser?.fullName || currentUser?.name);

  const loggedIsCurrentAssignee =
    (!!currentAssigneeCodeNorm && !!currentUserCodeNorm && currentAssigneeCodeNorm === currentUserCodeNorm) ||
    (!!currentAssigneeNameNorm && !!currentUserNameNorm && currentAssigneeNameNorm === currentUserNameNorm);

    console.log(loggedIsCurrentAssignee)

  const canEditCase = loggedIsCurrentAssignee && !closed;

  const showButtonsBase =
    (canEditCase || (activeTab === "issues" && !closed)) &&
    ["general", "issues", "expense"].includes(activeTab);

  const showSaveButton = showButtonsBase && !closed;

  // ✅ NEW: allow submit when pendingClose even if isResponseFilled flag is stale
  const submitDisabled = saving || (!isResponseFilled && !pendingClose);

  // --------------------------------------------
  // Actions
  // --------------------------------------------
  const handleAction = async (actionType, overrides = {}) => {
    const generalData = overrides.generalData ?? generalRef.current?.getGeneralData?.() ?? {};
    const effectiveStatus = trim(overrides.status ?? status);
    const effectiveDisposition = trim(overrides.disposition ?? disposition);

    const issuesData = issuesRef.current?.getIssuesData?.() ?? {};

const baseSelected = overrides.selectedCaseData ?? selectedCaseData;

// take assignee from IssuesTab ONLY if it’s a real value and user actually changed it
const issuesAssigneeCode = trim(issuesData?.assignToCode || issuesData?.assignedto || "");
const baseAssigneeCode = trim(baseSelected?.assignToCode || baseSelected?.assignedTo || "");

// if IssuesTab assignee is empty/placeholder, ignore it
const issuesAssigneeIsBad =
  !issuesAssigneeCode ||
  issuesAssigneeCode === "-" ||
  /^assign\s*to$/i.test(issuesAssigneeCode);

// treat as changed only if it’s not bad AND different from base
const userChangedAssignee = !issuesAssigneeIsBad && norm(issuesAssigneeCode) !== norm(baseAssigneeCode);

const effectiveSelected = {
  ...baseSelected,
  ...issuesData,

  // ✅ CRITICAL: if user did NOT really change assignee, keep base assignee
  assignToCode: userChangedAssignee ? issuesAssigneeCode : baseAssigneeCode,
  assignedTo: userChangedAssignee ? (issuesData?.assignedTo || issuesData?.assignName) : (baseSelected?.assignedTo || baseSelected?.assignName),
};

    const closingViaSubmit = actionType === "submit" && effectiveStatus === "Closed";

    const req = buildRequiredBlock({
      actionType: closingViaSubmit ? "updateStatus" : actionType,
      general: generalData,
      current: effectiveSelected,
      status: effectiveStatus,
      disposition: effectiveDisposition,
    });
    const { ok, missing } = validateRequired(req);
    if (!ok) {
      setToast({ type: "error", message: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    const prevAssigneeCode = trim(selectedCaseData?.assignToCode || selectedCaseData?.assignedTo || "");
    const newAssigneeCode = trim(effectiveSelected?.assignToCode || effectiveSelected?.assignedTo || "");
    const ownerCode = trim(selectedCaseData?.ownerCode || selectedCaseData?.caseOwnerCode || "");
    const ownerCodeRaw = trim(selectedCaseData?.ownerCode || selectedCaseData?.caseOwnerCode || "");

    const hierarchyNext = trim(selectedCaseData?.secondSlaCode || selectedCaseData?.nextLevelID || "");

    const hasUserPickedAssignee = !!newAssigneeCode && norm(newAssigneeCode) !== norm(prevAssigneeCode);
    const isHierarchyChoice = !!hierarchyNext && norm(newAssigneeCode) === norm(hierarchyNext);
    const isAssignToCreator = !!ownerCode && norm(newAssigneeCode) === norm(ownerCode);
    const isManualReassign = hasUserPickedAssignee && !isHierarchyChoice;
    const treatAsManual = isManualReassign || (isAssignToCreator && !isHierarchyChoice);

    // Preflight persist response for non-submit actions
    const responseText = trim(effectiveSelected?.response || "");
    if (responseText && actionType !== "submit" && actionType !== "save") {
      const stage2Code = trim(selectedCaseData?.secondSlaCode || selectedCaseData?.nextLevelID || "");
      const assigneeForSubmit = resolveAssigneeForSubmit({
        newAssigneeCode: trim(effectiveSelected?.assignToCode || effectiveSelected?.assignedTo || ""),
        prevAssigneeCode: trim(selectedCaseData?.assignToCode || selectedCaseData?.assignedTo || ""),
        stage1Code: trim(stage1Code || ""),
        stage2Code,
        ownerCode: trim(selectedCaseData?.ownerCode || selectedCaseData?.caseOwnerCode || ""),
        currentAssigneeCode: selectedCaseData?.assignToCode,
        currentAssigneeName: selectedCaseData?.assignName,
        currentUserCode: currentUser?.code,
      });

      const nonClosedStatus =
        initialStatusRef.current && initialStatusRef.current !== "Closed"
          ? initialStatusRef.current
          : selectedCaseData?.caseStatus && selectedCaseData.caseStatus !== "Closed"
          ? selectedCaseData.caseStatus
          : "WIP";

      const preSubmitPayload = buildFullPayload({
        general: generalData,
        current: {
          ...effectiveSelected,
          assignToCode: assigneeForSubmit || effectiveSelected?.assignToCode,
        },
        status: nonClosedStatus,
        disposition: effectiveDisposition,
        operation: "submit",
      });

      if (assigneeForSubmit) {
        preSubmitPayload.assignedto = assigneeForSubmit;
        preSubmitPayload.caseWith = assigneeForSubmit;
      }
      if (isBadAssignee(preSubmitPayload.assignedto)) {
        preSubmitPayload.assignedto = currentUser?.code || ownerCode || "-";
        preSubmitPayload.caseWith = preSubmitPayload.assignedto;
      }

      await postCaseOperation(preSubmitPayload, "submit (preflight persist response)");
    }

    // Closing via submit
    // Closing via submit
if (closingViaSubmit) {
  try {
    // ✅ validations stay
    if (!trim(effectiveSelected?.response)) {
      setToast({ type: "error", message: "Please add a response before submitting." });
      return;
    }
    setSaving(true);

    const ownerCode = trim(selectedCaseData?.ownerCode || selectedCaseData?.caseOwnerCode || "");

    // ✅ Build ONE payload ONLY (Closed)
    const closePayload = buildFullPayload({
      general: generalData,
      current: {
        ...effectiveSelected,

        // ✅ make owner the assignee at source
        assignToCode: ownerCode,
        assignedTo: ownerCode,

        // ✅ keep response (don’t blank it)
        response: trim(effectiveSelected?.response || ""),
      },
      status: "Closed",
      disposition: effectiveDisposition,
      operation: "updateStatus",
    });

    // ✅ force these fields (this is what you asked)
    closePayload.assignedto = ownerCode || "-";
    closePayload.caseWith = ownerCode || "-";

    // ✅ keep placeholders if your backend needs them
    if (USE_PLACEHOLDERS_ON_UPDATE_STATUS) {
      const fill = (v, fb = "N/A") => (isNonEmpty(v) ? v : fb);
      const emailFill = (v) => (isNonEmpty(v) ? v : "-");
      const ccFill = (v) => (isNonEmpty(v) ? v : "-");

      closePayload.assignedto = fill(closePayload.assignedto, "-");
      closePayload.caseWith = fill(closePayload.caseWith, "-");
      closePayload.assignedemailid = emailFill(closePayload.assignedemailid);
      closePayload.cc = ccFill(closePayload.cc);
      closePayload.moreCC = ccFill(closePayload.moreCC);

      const stringyKeys = [
        "casetitle",
        "category",
        "subCategory",
        "subSubCategory",
        "subSubSubCategory",
        "casemedium",
        "casesource",
        "priority",
        "custID",
        "productCode",
        "servicecode",
        "serviceccode",
        "createdby",
        "issuedesciption",
        "clientThreat",
        "doctorCode",
        "firsttimeresolution",
        "response",
        "categorySpecificResolution",
        "remarks",
        "casedisposition",
      ];
      for (const k of stringyKeys) closePayload[k] = closePayload[k] ?? "";
      closePayload.materialCost = closePayload.materialCost ?? 0;
      closePayload.labourCost = closePayload.labourCost ?? 0;
      closePayload.otherCharges = closePayload.otherCharges ?? 0;
      closePayload.totalCharges = closePayload.totalCharges ?? 0;
    }

    // ✅ ONLY ONE API call
    await postCaseOperation(closePayload, "updateStatus (single-call close)");

    // ✅ (Optional) send mail AFTER success to OWNER (not L1)
    const issuesDataLatest = issuesRef.current?.getIssuesData?.() ?? {};
    await triggerCaseMail({
      selectedCaseData,
      generalData,
      issuesData: issuesDataLatest,
      assigneeCode: ownerCode, // ✅ mailTo should now resolve owner
      fallbackToEmail: "",
      setToast,
    });

    // ✅ UI updates
    setStatus("Closed");
    setUiStatus("Closed");
    setPendingClose(false);

    setSelectedCaseData((prev) =>
      prev ? { ...prev, caseStatus: "Closed", disposition: closePayload.casedisposition } : prev
    );

    setToast({ type: "success", message: "Case closed successfully." });

    try {
      issuesRef.current?.reloadResponses?.();
    } catch {}

    navigate(-1);
  } catch (err) {
    console.error("close via submit error:", err);
    setPendingClose(true);
    setUiStatus("Closed");
    setToast({ type: "error", message: `Failed to close case. Reason: ${err.message}` });
  } finally {
    setSaving(false);
  }
  return;
}

    // ---- Build base payload for other flows ----
    const operationForBackend = actionType;
    const payload = buildFullPayload({
      general: generalData,
      current: effectiveSelected,
      status: effectiveStatus,
      disposition: effectiveDisposition,
      operation: operationForBackend,
    });

    // SAVE → force current assignee into payload based on caseWith
    if (actionType === "save") {
      const resolvedCode = trim(selectedCaseData?.caseWithCode) || trim(selectedCaseData?.assignToCode) || "";
      const resolvedMobile = trim(selectedCaseData?.employeeMobile || "");
      const resolvedEmail = trim(selectedCaseData?.email || "");

      payload.assignedto = resolvedCode || payload.assignedto || "";
      payload.caseWith = resolvedCode || payload.caseWith || "";
      payload.employeno = resolvedMobile || payload.employeno || "";
      payload.assignedemailid = resolvedEmail || payload.assignedemailid || "";
    }

    if (actionType !== "submit" && actionType !== "save") payload.response = "";

    if (treatAsManual && isAssignToCreator) {
      payload.assignedto = ownerCode;
      payload.caseWith = ownerCode;
    }

    if (actionType === "submit") {
      if (!trim(effectiveSelected?.response)) {
        setToast({ type: "error", message: "Please add a response before submitting." });
        return;
      }
      if (treatAsManual && !isAssignToCreator) {
        payload.assignedto = newAssigneeCode || payload.assignedto || "";
        payload.caseWith = newAssigneeCode || payload.caseWith || "";
      }
      payload.status = "WIP";
    }

    if (actionType === "updateStatus" && USE_PLACEHOLDERS_ON_UPDATE_STATUS) {
      const fill = (v, fb = "N/A") => (isNonEmpty(v) ? v : fb);
      const emailFill = (v) => (isNonEmpty(v) ? v : "-");
      const ccFill = (v) => (isNonEmpty(v) ? v : "-");

      payload.assignedto = fill(payload.assignedto, "");
      payload.caseWith = fill(payload.caseWith, "");
      payload.assignedemailid = emailFill(payload.assignedemailid);
      payload.cc = ccFill(payload.cc);
      payload.moreCC = ccFill(payload.moreCC);

      const stringyKeys = [
        "casetitle",
        "category",
        "subCategory",
        "subSubCategory",
        "subSubSubCategory",
        "casemedium",
        "casesource",
        "priority",
        "custID",
        "productCode",
        "servicecode",
        "serviceccode",
        "createdby",
        "issuedesciption",
        "clientThreat",
        "doctorCode",
        "firsttimeresolution",
        "response",
        "categorySpecificResolution",
        "remarks",
        "casedisposition",
      ];
      for (const k of stringyKeys) payload[k] = payload[k] ?? "";
      payload.materialCost = payload.materialCost ?? 0;
      payload.labourCost = payload.labourCost ?? 0;
      payload.otherCharges = payload.otherCharges ?? 0;
      payload.totalCharges = payload.totalCharges ?? 0;
    }

    try {
      setSaving(true);
      console.log("FINAL PAYLOAD ASSIGNEE", payload.assignedto, payload.caseWith, payload);
      const result = await postCaseOperation(payload, actionType);

      if (result?.code === "200") {
        if (actionType === "updateStatus" && isNonEmpty(effectiveStatus)) {
          setStatus(effectiveStatus);
          setUiStatus(effectiveStatus); // ✅ NEW
          setPendingClose(false);       // ✅ NEW: status changed normally clears close intent
        }

        const appliedAssignee = trim(payload.assignedto || "");
        setSelectedCaseData((prev) =>
          prev
            ? {
                ...prev,
                caseStatus:
                  actionType === "updateStatus" && isNonEmpty(effectiveStatus)
                    ? effectiveStatus
                    : prev.caseStatus,
                disposition: payload.casedisposition || prev.disposition,
                assignToCode: appliedAssignee || prev.assignToCode || "",
                assignName: prev.assignName,
              }
            : prev
        );

        if (actionType === "save") {
  

  setToast({
    type: "success",
    message: `Case saved successfully. Case No: ${result.name || selectedCaseData?.caseNo}`,
  });
  navigate(-1);
  return;
}
if (actionType === "submit") {
  // ✅ send mail on SUBMIT (to next/current assignee in payload)
  const issuesDataLatest = issuesRef.current?.getIssuesData?.() ?? {};
  const generalLatest = generalRef.current?.getGeneralData?.() ?? {};

  const toCode =
    trim(payload?.assignedto) ||
    trim(payload?.caseWith) ||
    trim(selectedCaseData?.assignToCode) ||
    trim(selectedCaseData?.caseWithCode) ||
    "";

  await triggerCaseMail({
    selectedCaseData,
    generalData: generalLatest,
    issuesData: issuesDataLatest,
    assigneeCode: toCode,
    fallbackToEmail: selectedCaseData?.email || "",
    setToast,
  });

  setToast({ type: "success", message: "Case submitted successfully." });
  navigate(-1);
  return;
}


  if (actionType === "updateStatus") {
    setToast({ type: "success", message: `Status updated to ${effectiveStatus || "—"}.` });
  }
      }
    } catch (err) {
      console.error(`${actionType} error:`, err);
      setToast({ type: "error", message: `Failed to ${actionType} case. Reason: ${err.message}` });

      // ✅ NEW: rollback UI status if updateStatus failed
      if (actionType === "updateStatus") {
        setUiStatus(status);
      }
    } finally {
      setSaving(false);
      submitClickLockRef.current = false;
    }
  };

  // --------------------------------------------
  // Submit click
  // --------------------------------------------
  const onSubmitClick = async () => {
    // ✅ NEW: if dropdown is set to Closed (pendingClose), close for ANY level
    if (pendingClose || trim(uiStatus) === "Closed") {
      setPendingClose(false); // avoid double intent
      return handleAction("submit", { status: "Closed" });
    }

    // existing L2 placeholder logic
    const issuesData = issuesRef.current?.getIssuesData?.() ?? {};
    const nextCode = trim(issuesData.assignToCode || "");
    const nextName = trim(issuesData.assignedTo || "");

    const isPlaceholderNext =
      (!nextCode && !nextName) || nextName === "-" || /^assign\s*to$/i.test(nextName);

    const caseClosed = trim(status) === "Closed";

    if (isAtLevel2Now && !caseClosed && isPlaceholderNext) {
      setL2DialogOpen(true);
      setL2DialogError("");
      return;
    }

    // normal submit (handoff)
    return handleAction("submit");
  };

  // --------------------------------------------
  // Render tabs
  // --------------------------------------------
  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralTab ref={generalRef} data={selectedCaseData} />;
      case "issues": {
        const assignedDisplayForIssues = firstNonEmpty(selectedCaseData?.assignName, selectedCaseData?.assignToCode, "");
        return (
          <IssuesTab
            ref={issuesRef}
            data={selectedCaseData}
            assignedToName={assignedDisplayForIssues}
            assignedToCode={selectedCaseData ? selectedCaseData.assignToCode : ""}
            onResponseChange={(ok) => setIsResponseFilled(ok)}
            level1Name={l1DisplayName}
            level2Name={l2DisplayName}
          />
        );
      }
      case "sla":
        return <SLATab ref={slaRef} />;
      case "journey":
        return <JourneyTab ref={journeyRef} caseNo={selectedCaseData.caseNo} />;
      case "expense":
        return <ExpenseTab ref={expenseRef} />;
      default:
        return null;
    }
  };

  return (
    <section>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="brdcrmb">
        <ul>
          <li>
            <Link to="/cases">Case Management</Link>
          </li>
          <li className="current">{selectedCaseData.caseNo}</li>
        </ul>
      </div>

      <div className="pg-head">
        <h2 className="pg-ttl">{selectedCaseData.caseNo}</h2>
        <div className="cs-rhs">
          <div className="casedet">
            <div className="csdetval">{selectedCaseData.priority}</div>
            <div className="csdetlbl">Priority</div>
          </div>
          <div className="casedet">
            <div className="csdetval">{ownerDisplay}</div>
            <div className="csdetlbl">Owner</div>
          </div>
          <div className="casedet">
            <div className="csdetval">{assignedDisplay}</div>
            <div className="csdetlbl">Assigned To</div>
          </div>
        </div>
      </div>

      {showL2Banner && (
        <div
          className="info-banner"
          style={{
            margin: "12px 0 0",
            padding: "10px 12px",
            border: "1px solid #cfe3ff",
            background: "#f3f8ff",
            color: "#0b3d91",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <strong>Heads up:</strong> This case is currently at <strong>Level 2</strong>. On submit, you can either close
          the case or reassign it to someone else if more information is needed.
        </div>
      )}

      {closeLock && (
  <div
    className="info-banner"
    style={{
      margin: "12px 0",
      padding: "10px 12px",
      border: "1px solid #ffe1a6",
      background: "#fff7e6",
      color: "#8a4b00",
      borderRadius: 6,
      fontSize: 14,
    }}
  >
    <strong>Note:</strong> This case has a 2-level hierarchy and can be closed only at <strong>Level 2</strong>.
    Please proceed via escalation/assignment to Level 2.
  </div>
)}

      <div className="casedetwrp">
        <div className="casecell">
          <div className="form-group">
            <label>Case Disposition{closed ? " *" : ""}</label>
          <select
  value={disposition}
  disabled={saving || closed || closeLock}
 onChange={(e) => {
  if (closeLock) {
    setToast({
      type: "error",
      message: "This case can be closed only at Level 2 for this category.",
    });
    return;
  }

  const val = e.target.value;
  setDisposition(val);

  // 🔁 If user clears disposition → restore original status
  if (!val || val === "0") {
    const originalStatus = initialStatusRef.current || status || "Open";
    setPendingClose(false);
    setUiStatus(originalStatus);
    setStatus(originalStatus);

    setToast({
      type: "info",
      message: `Case status restored to ${originalStatus}.`,
    });
    return;
  }

  // ✅ Disposition selected → move to Close intent
  setUiStatus("Closed");
  setPendingClose(true);

  // ✅ Complaint category: CSR must be selected BEFORE anything else
  const csr = getLatestCSR();
  if (isComplaintCase && !csr) {
    setToast({
      type: "error",
      message: "This is a Complaint case. Please select Category Specific Resolution to close the case.",
    });
    handleTabClick("general");
    return;
  }

  // then require response
  const resp = getLatestResponse();
  if (!resp) {
    setToast({
      type: "info",
      message: "Disposition selected. Please add a response and click Submit to close the case.",
    });
    handleTabClick("issues");
    return;
  }

  setToast({
    type: "success",
    message: "All details are ready. Click Submit to close the case.",
  });
}}
>
              <option value="0">Select Case Disposition</option>
              <option value="No Solution">No Solution</option>
              <option value="Resolved">Resolved</option>
              <option value="Unresolved">Unresolved</option>
            </select>
          </div>
        </div>

        {isComplaintCase && (
          <div className="casecell">
            <div className="form-group">
              <label>Category Specific Resolution</label>
              <select
                name="categorySpecificResolution"
                value={selectedCaseData?.categorySpecificResolution || ""}
                onChange={(e) =>
                  setSelectedCaseData((prev) => (prev ? { ...prev, categorySpecificResolution: e.target.value } : prev))
                }
                disabled={saving || closed || closeLock}
              >
                <option value="">Select</option>

<option value="Doctor meet up appointment given">Doctor meet up appointment given</option>
<option value="Refund given">Refund given</option>
<option value="Approval in process (refund /complimentary session)">
  Approval in process (refund /complimentary session)
</option>
<option value="Client not reachable">Client not reachable</option>
<option value="Client is fine and will continue with our services">
  Client is fine and will continue with our services
</option>
<option value="Client might come back later">Client might come back later</option>
<option value="Retained with complimentary session">Retained with complimentary session</option>
<option value="Refund cancelled and retained">Refund cancelled and retained</option>
<option value="Refunded into prepaid card to be used in different service">
  Refunded into prepaid card to be used in different service
</option>
              </select>
            </div>
          </div>
        )}

        <div className="casecell">
          <div className="casecell">
            <div className="form-group">
              <label>Case Status</label>
              <select
                value={uiStatus || status} // ✅ NEW: show "Closed" when user selects it
                disabled={saving || closed || closeLock}
                onChange={async (e) => {
                  const newStatus = e.target.value; 

                  if (closeLock) {
    setToast({
      type: "error",
      message: "Status cannot be changed/closed at Level 1 when this category has 2-level hierarchy.",
    });
    return;
  }

                  const prevUi = uiStatus || status;

                  if (newStatus === "Closed") {
                    const { respOk, dispOk, csrOk } = checkClosePrereqs();

                    if (!respOk) {
                      setToast({ type: "error", message: "Please add a response before closing the case." });
                      setUiStatus(prevUi);
                      handleTabClick("issues");
                      return;
                    }

                    if (!dispOk) {
                      setToast({ type: "error", message: "Please select Case Disposition before closing the case." });
                      setUiStatus(prevUi);
                      return;
                    }

                    if (!csrOk) {
                      setToast({
                        type: "error",
                        message: "For Complaint cases, Category Specific Resolution is required before closing.",
                      });
                      setUiStatus(prevUi);
                      handleTabClick("general");
                      return;
                    }

                    // ✅ NEW: keep dropdown showing Closed, but don't actually lock the page
                    setPendingClose(true);
                    setUiStatus("Closed");

                    setToast({ type: "success", message: "All details are filled. Click Submit to close the case." });
                    handleTabClick("issues");
                    return;
                  }

                  // normal Open/WIP
                  setPendingClose(false);      // ✅ NEW
                  setUiStatus(newStatus);      // ✅ NEW
                  setStatus(newStatus);

                  setSelectedCaseData((prev) => (prev ? { ...prev, caseStatus: newStatus } : prev));

                  try {
                    await handleAction("updateStatus", { status: newStatus, disposition });
                  } catch {
                    // rollback
                    setStatus(status);
                    setUiStatus(status);
                    setSelectedCaseData((prev) => (prev ? { ...prev, caseStatus: status } : prev));
                    setToast({ type: "error", message: "Failed to save case status." });
                  }
                }}
              >
                <option value="">Select Case Status</option>
                <option value="Open">Open</option>
                <option value="WIP">WIP</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="wizard-progress">
        <div className="step complete">
          Created<div className="node"></div>
        </div>
        <div className={`step ${status === "Closed" || status === "WIP" ? "complete" : status === "Open" ? "in-progress" : ""}`}>
          Awaiting Action<div className="node"></div>
        </div>
        <div className={`step ${status === "Closed" ? "complete" : status === "WIP" ? "in-progress" : ""}`}>
          WIP <span>(2 hours)</span>
          <div className="node"></div>
        </div>
        <div className={`step ${status === "Closed" ? "complete" : ""}`}>
          Closed<div className="node"></div>
        </div>
      </div>

      <section className="tabsform">
        <div className="tab">
          <span className={`tablinks ${activeTab === "general" ? "active" : ""}`} onClick={() => handleTabClick("general")}>
            General
          </span>
          <span className={`tablinks ${activeTab === "issues" ? "active" : ""}`} onClick={() => handleTabClick("issues")}>
            Issues and Responses
          </span>
          <span className={`tablinks ${activeTab === "sla" ? "active" : ""}`} onClick={() => handleTabClick("sla")}>
            SLA Details
          </span>
          <span className={`tablinks ${activeTab === "journey" ? "active" : ""}`} onClick={() => handleTabClick("journey")}>
            Case Journey
          </span>
          <span className={`tablinks ${activeTab === "expense" ? "active" : ""}`} onClick={() => handleTabClick("expense")}>
            Expense
          </span>
        </div>

        <div className="tabcontent" style={{ display: "block", position: "relative" }}>
  <div style={{ display: activeTab === "general" ? "block" : "none" }}>
    <GeneralTab ref={generalRef} data={selectedCaseData} />
  </div>

  <div style={{ display: activeTab === "issues" ? "block" : "none" }}>
    <IssuesTab
      ref={issuesRef}
      data={selectedCaseData}
      assignedToName={firstNonEmpty(selectedCaseData?.assignName, selectedCaseData?.assignToCode, "")}
      assignedToCode={selectedCaseData ? selectedCaseData.assignToCode : ""}
      onResponseChange={(ok) => setIsResponseFilled(ok)}
      level1Name={l1DisplayName}
      level2Name={l2DisplayName}
    />
  </div>

  <div style={{ display: activeTab === "sla" ? "block" : "none" }}>
    <SLATab ref={slaRef} />
  </div>

  <div style={{ display: activeTab === "journey" ? "block" : "none" }}>
    <JourneyTab ref={journeyRef} caseNo={selectedCaseData.caseNo} />
  </div>

  <div style={{ display: activeTab === "expense" ? "block" : "none" }}>
    <ExpenseTab ref={expenseRef} />
  </div>

  {tabLoading && (
    <div className="loader-wrapper" style={{ position: "absolute", inset: 0, zIndex: 10 }}>
      <div className="loader"></div>
    </div>
  )}
</div>

        {canEditCase && ["general", "issues", "expense"].includes(activeTab) && (
          <div className="buttongrp mt-3">
            {showSaveButton && (
              <button type="button" className="pribtn" onClick={() => handleAction("save")} disabled={saving}>
                Save
              </button>
            )}
            <button
  type="button"
  className="secbtn"
  onClick={(e) => {
    e.preventDefault();
    if (submitClickLockRef.current) return;   // already clicked
    submitClickLockRef.current = true;        // lock immediately
    onSubmitClick();
  }}
  disabled={submitDisabled || submitClickLockRef.current}
>
  Submit
</button>
          </div>
        )}
      </section>

      {/* L2 Decision Dialog */}
      {l2DialogOpen && (
        <div
          aria-modal="true"
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setL2DialogOpen(false)}
        >
          <div
            style={{
              width: "min(520px, 92vw)",
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #eee" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Submit at Level 2</h3>
            </div>

            <div style={{ padding: 16 }}>
              <p style={{ marginTop: 0, color: "#444" }}>
                This case is currently assigned to the <strong>Level 2</strong> assignee. Choose how you want to proceed:
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 12,
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: 12,
                  background: "#fafafa",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Option A: Close the case</div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 2 }}>
                    Closes the case now. Make sure you’ve entered a response, selected a disposition, and (for Complaint
                    cases) selected Category Specific Resolution.
                  </div>

                  <button
                    className="pribtn"
                    style={{ marginTop: 8 }}
                    onClick={async () => {
                      const { respOk, dispOk, csrOk } = checkClosePrereqs();

                      if (!respOk) {
                        setToast?.({ type: "error", message: "Please add a response before closing the case." });
                        handleTabClick("issues");
                        return;
                      }
                      if (!dispOk) {
                        setToast?.({ type: "error", message: "Please select Case Disposition before closing." });
                        return;
                      }
                      if (!csrOk) {
                        setToast?.({
                          type: "error",
                          message: "For Complaint cases, Category Specific Resolution is required before closing.",
                        });
                        handleTabClick("general");
                        return;
                      }

                      setL2DialogOpen(false);
                      await handleAction("submit", { status: "Closed" });
                    }}
                    disabled={saving}
                  >
                    Close Case
                  </button>
                </div>

                <div style={{ borderTop: "1px dashed #e6e6e6", paddingTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                    Option B: Assign to another person (needs more info)
                  </div>
                  {/* placeholder */}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderTop: "1px solid #eee",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button className="secbtn" onClick={() => setL2DialogOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CaseDetailsPage;
