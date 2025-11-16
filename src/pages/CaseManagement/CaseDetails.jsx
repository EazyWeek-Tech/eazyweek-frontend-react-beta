import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
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
  const ss = (k) => trim(sessionStorage.getItem(k));
  const objKeys = ["user", "userDetails", "currentUser", "authUser", "sessionUser"];
  const fromJson = (k) => {
    for (const key of objKeys) {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        const val = obj?.[k] ?? obj?.[k?.toLowerCase?.()] ?? obj?.[k?.toUpperCase?.()];
        if (isNonEmpty(val)) return trim(val);
      } catch {}
    }
    return "";
  };
  const topGuess = firstNonEmpty(ss("topCode"), fromJson("topCode"));
  const centerGuess = firstNonEmpty(
    topGuess,
    general?.centerCode,
    current?.centerCode,
    ss("centerCode"),
    ss("CenterCode"),
    ss("centercode"),
    ss("job"),
    fromJson("centerCode"),
    fromJson("job")
  );

  console.log(centerGuess);
  const departmentGuess = firstNonEmpty(
    general?.departmentCode,
    current?.departmentCode,
    ss("departmentCode"),
    ss("DepartmentCode"),
    ss("deptCode"),
    ss("depCode"),
    fromJson("departmentCode")
  );
  const clinicGuess = firstNonEmpty(
    general?.custClinicCode,
    current?.custClinicCode,
    ss("custClinicCode"),
    ss("clinicCode"),
    ss("ClinicCode"),
    fromJson("custClinicCode"),
    fromJson("clinicCode")
  );

  return {
    centercode: "Bright" || "",
    departmentcode: departmentGuess || "department",
    custcliniccode: clinicGuess || "Bright",
  };
};

const readSessionUser = () => {
  const get = (k) => (sessionStorage.getItem(k) ?? "").toString();
  const objKeys = ["user", "userDetails", "currentUser", "authUser", "sessionUser"];
  let code = "", name = "", firstName = "", lastName = "";

  for (const k of objKeys) {
    const raw = sessionStorage.getItem(k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      code = firstNonEmpty(code, obj.userId, obj.userID, obj.employeeCode, obj.empCode, obj.code);
      firstName = firstNonEmpty(firstName, obj.firstName, obj.firstname, obj.FirstName);
      lastName  = firstNonEmpty(lastName,  obj.lastName,  obj.lastname,  obj.LastName);
      name = firstNonEmpty(
        name,
        obj.userName,
        obj.username,
        obj.name,
        (firstName || lastName) ? `${firstName || ""} ${lastName || ""}` : ""
      );
    } catch {}
  }
  code = firstNonEmpty(code, get("userId"), get("userid"), get("employeeCode"), get("empCode"));
  firstName = firstNonEmpty(firstName, get("firstName"), get("firstname"), get("FirstName"));
  lastName  = firstNonEmpty(lastName,  get("lastName"),  get("lastname"),  get("LastName"));
  name = firstNonEmpty(name, get("userName"), get("username"),
    (firstName || lastName) ? `${firstName || ""} ${lastName || ""}` : ""
  );

  if (!code && !name && !firstName && !lastName) return null;
  const fullName = firstNonEmpty(`${firstName} ${lastName}`.trim(), name);
  return { code, name, firstName, lastName, fullName };
};

// --------------------------------------------
// Guardrails
// --------------------------------------------
function buildRequiredBlock({ actionType, general, current, status, disposition }) {
  const org = readOrgContext(general, current);
  const must = { caseno: current?.caseNo, centercode: org.centercode };
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
    casetitle:               S(mergeVal(general?.title, current?.title)),
    caseno:                  S(current?.caseNo),
    category:                S(mergeVal(general?.categoryCode, current?.categoryCode)),
    subCategory:             S(mergeVal(general?.subCategory, current?.subCategory)),
    subSubCategory:          S(mergeVal(general?.subSubCategory, current?.subSubCategory)),
    subSubSubCategory:       S(mergeVal(general?.subSubSubCategory, current?.subSubSubCategory)),
    casemedium:              S(mergeVal(general?.medium, current?.medium)),
    casesource:              S(mergeVal(general?.source, current?.source)),
    priority:                S(mergeVal(general?.priority, current?.priority)),
    custID:                  S(mergeVal(general?.customer, current?.customer)),
    productCode:             S(mergeVal(general?.productCode, current?.productCode)),
    servicecode:             S(mergeVal(general?.service, current?.service)),
    serviceccode:            S(mergeVal(general?.serviceCategory, current?.serviceCategory)),
    createdby:               S(sessionUser?.code || sessionUser?.name || ""),
    createddate,

    issuedesciption:         S(current?.issueDescription),
    clientThreat:            S(current?.clientThreat),
    doctorCode:              S(current?.therapistCode),
    firsttimeresolution:     S(current?.firstTimeResolution),
    response:                S(current?.response),

    assignedto:              S(assigneeCode),
    employeno:               S(current?.employeeMobile),
    assignedemailid:         S(current?.email),
    cc:                      S((current?.cc || "").replace(/\s+,/g, ",").replace(/,+$/g, "")),
    moreCC:                  S(current?.moreCc),

    categorySpecificResolution: S(
      mergeVal(general?.categorySpecificResolution, current?.categorySpecificResolution)
    ),
    remarks:                 S(current?.remarks),

    casedisposition:         S(isNonEmpty(disposition) ? trim(disposition) : current?.disposition),
    caseWith:                S(assigneeCode),
    status:                  S(trim(status)),

    operation:               S(operation),

    materialCost:            N(current?.materialCost),
    labourCost:              N(current?.labourCOst),
    otherCharges:            N(current?.otherCharges),
    totalCharges:            N(current?.total),

    isdraft:                 operation === "save" ? 1 : 0,

    centercode:              S(org.centercode),
    departmentcode:          S(org.departmentcode),
    custcliniccode:          S(org.custcliniccode),
  };
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
function buildCaseMailPayload({ selected, centerNameFallback = "Bright Clinics" }) {
  const clean = (s) => (s ?? "").toString().trim();
  const isLikelyEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

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

  const normalizedToList = cleanupList(selected?.email || "");
  const emailToFirst = normalizedToList.split(",").find(isLikelyEmail) || clean(selected?.email);
  console.log('To:' + emailToFirst);
  return {
    emailTo: emailToFirst,
    centerName: clean(selected?.centerName) || centerNameFallback,
    caseNo: clean(selected?.caseNo),
    categoryName: clean(selected?.caseCategory || selected?.categoryName),
    subCategoryName: clean(selected?.subCategoryName),
    issueDescription: clean(selected?.issueDescription),
    newResponse: clean(selected?.response),
    firstTimeResolution: clean(selected?.firstTimeResolution),
    emailCC: cleanupList(selected?.cc),
    moreCC: cleanupList(selected?.moreCc),
  };
}
async function sendCaseMail(payload, setToast) {
  try {
    if (!payload.emailTo) {
      setToast?.({ type: "error", message: "Email not sent: missing 'To' email for Assigned To." });
      return;
    }
    const res = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseMail`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const txt = await res.text();
    let out; try { out = JSON.parse(txt); } catch { out = { success: res.ok }; }
    if (!(res.ok && (out?.success ?? true))) {
      setToast?.({ type: "error", message: `Failed to send email${out?.message ? `: ${out.message}` : ""}` });
    }
  } catch (err) {
    setToast?.({ type: "error", message: `Email error: ${err.message}` });
  }
}

// --------------------------------------------
// Component
// --------------------------------------------
const CaseDetailsPage = () => {
  const { caseNumber } = useParams();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const ownerFromUrl = trim(searchParams.get("owner"));
  const assignedFromUrl = trim(searchParams.get("assignedTo"));

  const [activeTab, setActiveTab] = useState("general");
  const [selectedCaseData, setSelectedCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disposition, setDisposition] = useState("");
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => readSessionUser());
  const [stage1Code, setStage1Code] = useState("");
  const [isResponseFilled, setIsResponseFilled] = useState(false);

  const initialStatusRef = useRef(null);
  const issuesRef = useRef();
  const generalRef = useRef();
  const expenseRef = useRef();
  const journeyRef = useRef();
  const slaRef = useRef();

  // NEW: tab loader state + timer ref
  const [tabLoading, setTabLoading] = useState(false);
  const tabTimerRef = useRef(null);

  // NEW: hierarchy state at page-level
  const [hierarchy, setHierarchy] = useState(null);
  const [hierLoading, setHierLoading] = useState(false);
  const [hierErr, setHierErr] = useState("");

  // NEW: employees cache for debug & stage mapping
  const [employees, setEmployees] = useState([]);

  // L2 dialog state
  const [l2DialogOpen, setL2DialogOpen] = useState(false);
  const [l2ReassignCode, setL2ReassignCode] = useState("");
  const [l2DialogError, setL2DialogError] = useState("");

  // cleanup loader timeout on unmount
  useEffect(() => {
    return () => {
      if (tabTimerRef.current) {
        clearTimeout(tabTimerRef.current);
      }
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

        const mappedAssignCode = trim(
          firstNonEmpty(
            data.assignToCode,
            data.assignCode,
            data.emailTOCode
          )
        );
        const mappedAssignName = trim(
          firstNonEmpty(data.assignTOName, data.assignName, data.emailTOName)
        );

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

          assignedTo: mappedAssignCode,
          assignToCode: mappedAssignCode,
          assignName: mappedAssignName,

          employeeMobile: trim(data.empMobileNo),
          email: trim(data.emailTOEMailID),
          emailTo: trim(data.emailTOName),

          cc: trim((data.emailCC || "").replace(/\s+,/g, ",")).replace(/,+$/g, ""),
          moreCc: trim(data.moreCC),
          remarks: trim(data.remarks),

          categorySpecificResolution: trim(data.specificResolutionName || data.categorySpecificResolution),

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
        };

        setSelectedCaseData(mapped);
        setDisposition(mapped.disposition);
        setStatus(mapped.caseStatus);

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

  // NEW: fetch hierarchy at page level (using same inputs as IssuesTab)
  useEffect(() => {
    const cat  = trim(selectedCaseData?.caseCategory || selectedCaseData?.categoryName);
    const sub  = trim(selectedCaseData?.subCategoryName);
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
        const url = `${API_BASE_URL}/api/CaseOperation/CaseHierarchyDB` +
          `?categoryName=${encodeURIComponent(cat)}` +
          `&subCategoryName=${encodeURIComponent(sub)}` +
          `&subSubCategoryName=${encodeURIComponent(sub2)}` +
          `&subSubSubCategoryName=${encodeURIComponent(sub3)}`;

        const res = await (async () => {
          const r = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          const text = await r.text();
          if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}: ${text.slice(0,180)}`);
          let json; try { json = JSON.parse(text); } catch { throw new Error(`Invalid JSON: ${text.slice(0,180)}`); }
          return json;
        })();

        let hit = res;
        if (Array.isArray(res)) {
          hit = res.find(
            (r) =>
              trim(r?.categoryName).toLowerCase() === cat.toLowerCase() &&
              trim(r?.subCategoryName).toLowerCase() === sub.toLowerCase() &&
              trim(r?.subSubCategoryName).toLowerCase() === sub2.toLowerCase() &&
              trim(r?.subSubSubCategoryName || "NA").toLowerCase() === sub3.toLowerCase()
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
    selectedCaseData?.subSubSubCategoryName
  ]);

  useEffect(() => { setCurrentUser(readSessionUser()); }, []);
  useEffect(() => {
    if (activeTab === "issues" && issuesRef.current?.hasResponse) {
      setIsResponseFilled(Boolean(issuesRef.current.hasResponse()));
    }
  }, [activeTab, selectedCaseData]);

  const codeMatchesAssigned = React.useMemo(() => {
    return norm(currentUser?.code) && norm(currentUser?.code) === norm(selectedCaseData?.assignToCode);
  }, [currentUser?.code, selectedCaseData?.assignToCode]);

  const urlAssignedMatchesUser = React.useMemo(() => {
    const urlName = normalizeName(assignedFromUrl);
    const userFullName = normalizeName(currentUser?.fullName || currentUser?.name);
    return !!urlName && !!userFullName && urlName === userFullName;
  }, [assignedFromUrl, currentUser?.fullName, currentUser?.name]);

  const allowEditWhenUnassignedWIP =
    trim(selectedCaseData?.caseStatus) === "WIP" &&
    trim(assignedFromUrl) === "-";
  console.log(allowEditWhenUnassignedWIP);

  const assignedMatchesLoggedInUser = React.useMemo(() => {
    const urlName = normalizeName(assignedFromUrl);
    const userFullName = normalizeName(currentUser?.fullName || currentUser?.name);
    if (!urlName || !userFullName) return false;
    return urlName === userFullName;
  }, [assignedFromUrl, currentUser?.fullName, currentUser?.name]);

  const assignedMatchesByDisplay = React.useMemo(() => {
    const assignedDisplayLocal = firstNonEmpty(
      assignedFromUrl,
      selectedCaseData?.assignName,
      selectedCaseData?.assignToCode,
      ""
    );
    const userFullName = normalizeName(currentUser?.fullName || currentUser?.name);
    const disp = normalizeName(assignedDisplayLocal);
    return !!disp && !!userFullName && disp === userFullName;
  }, [
    assignedFromUrl,
    selectedCaseData?.assignName,
    selectedCaseData?.assignToCode,
    currentUser?.fullName,
    currentUser?.name,
  ]);

  const canEditCase = React.useMemo(() => {
    const isWIPUnassigned =
      trim(selectedCaseData?.caseStatus) === "WIP" &&
      trim(selectedCaseData?.assignToCode) === "-";

    if (trim(assignedFromUrl)) return urlAssignedMatchesUser;

    return (
      codeMatchesAssigned ||
      assignedMatchesByDisplay ||
      assignedMatchesLoggedInUser ||
      isWIPUnassigned
    );
  }, [
    assignedFromUrl,
    urlAssignedMatchesUser,
    codeMatchesAssigned,
    assignedMatchesByDisplay,
    assignedMatchesLoggedInUser,
    selectedCaseData?.caseStatus,
    selectedCaseData?.assignToCode,
  ]);

  // --- Resolve Stage 1 (and cache Employees for debug) ---
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
        setEmployees(arr); // cache for debug + other lookups

        const want = normNameBase(targetName);
        const match = arr.find((e) => {
          const nm = normNameBase(e?.employeeName);
          return nm === want;
        });
        setStage1Code((match?.employeeCode ?? "").toString().trim());
      } catch (err) {
        console.error("Failed to resolve Stage 1 (firstSlaName) code:", err);
        setStage1Code("");
      }
    };
    fetchEmp();
  }, [selectedCaseData?.firstSlaName]);

  const arrivedAsL2 =
    (initialStatusRef.current || selectedCaseData?.caseStatus || "").trim() === "WIP";

  const postCaseOperation = async (payload, label = "CaseOperation") => {
    const ts = new Date().toISOString();
    console.groupCollapsed(`[${ts}] POST ${API_BASE_URL}/api/CaseOperation — ${label}`);
    try {
      console.log("Request essentials →", {
        caseno: payload.caseno,
        operation: payload.operation,
        status: payload.status,
        assignedto: payload.assignedto,
        caseWith: payload.caseWith,
        response_len: (payload.response || "").length
      });
      console.log("Request payload (full) →", payload);

      const res = await fetch(`${API_BASE_URL}/api/CaseOperation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch {}

      console.log("HTTP status →", res.status, res.statusText);
      if (parsed !== undefined) {
        console.log("Response (parsed JSON) →", parsed);
      } else {
        console.log("Response (raw text) →", text);
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      if (!parsed || parsed.code !== "200") {
        throw new Error(parsed?.message || "API did not return code 200");
      }
      return parsed;
    } catch (err) {
      console.error("CaseOperation error →", err);
      throw err;
    } finally {
      console.groupEnd();
    }
  };

  // --------------------------------------------
  // L1/L2 detection (page-level; uses hierarchy + case)
  // --------------------------------------------
  const ownerDisplay = firstNonEmpty(
    ownerFromUrl,
    selectedCaseData?.ownerName,
    selectedCaseData?.ownerCode,
    "-"
  );
  const assignedDisplay = firstNonEmpty(
    assignedFromUrl,
    selectedCaseData?.assignName,
    selectedCaseData?.assignToCode,
    "-"
  );

  // Current assignee (code/name)
  const curCode = normCodeId(selectedCaseData?.assignToCode);
  const curName = normNameBase(assignedDisplay || "");

  // ---------- Level 1 signals (compute first) ----------
  const l1Code = normCodeId(stage1Code || "");
  const l1Name = normNameBase(
    firstNonEmpty(hierarchy?.firstAssignement, selectedCaseData?.firstSlaName, "")
  );
  const isAtLevel1Now =
    (!!l1Code && !!curCode && l1Code === curCode) ||
    (!!l1Name && !!curName && l1Name === curName);

  // ---------- Level 2 signals ----------
  const l2Code = normCodeId(
    firstNonEmpty(selectedCaseData?.secondSlaCode, selectedCaseData?.nextLevelID, "")
  );
  const l2Name = normNameBase(
    firstNonEmpty(hierarchy?.secondAssignement, selectedCaseData?.secondSlaName, "")
  );
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
  // NEW: Debug logging — current vs next assignee with employee codes
  // --------------------------------------------
  useEffect(() => {
    if (!selectedCaseData) return;

    const urlNameRaw = trim(assignedFromUrl);
    const urlNameNorm = normNameBase(urlNameRaw);
    let currentEmp = null;

    if (urlNameNorm && Array.isArray(employees) && employees.length) {
      currentEmp = employees.find(
        (e) => normNameBase(e?.employeeName) === urlNameNorm
      );
    }

    const currentInfo = {
      source: "URL param (?assignedTo=) / grid",
      nameFromUrl: urlNameRaw || "(not provided)",
      resolvedEmployeeName: currentEmp?.employeeName || urlNameRaw || "(not resolved)",
      employeeCode: (currentEmp?.employeeCode || "").toString().trim() || "(not found in Employees)",
    };

    const nextInfo = {
      source: "CaseDetails GET API",
      name: trim(
        selectedCaseData.assignName ||
        selectedCaseData.secondSlaName ||
        selectedCaseData.firstSlaEName ||
        ""
      ) || "(empty)",
      employeeCode: trim(
        selectedCaseData.assignToCode ||
        selectedCaseData.secondSlaCode ||
        selectedCaseData.nextLevelID ||
        ""
      ) || "(empty)",
    };

    console.groupCollapsed("DEBUG: Case assignee mapping (current vs next)");
    console.log("Case No:", selectedCaseData.caseNo);
    console.log("Current assignee (from URL / grid):", currentInfo);
    console.log("Next assignee (from CaseDetails API):", nextInfo);
    console.log("Note: Backend bug suspicion — API is returning next assignee in assignToCode/assignName.");
    console.groupEnd();
  }, [assignedFromUrl, selectedCaseData, employees]);

  // --------------------------------------------
  // Assignee resolver used when persisting a response
  // --------------------------------------------
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

  // --- open dialog when submit is clicked at Level 2 ---
  const onSubmitClick = async () => {
    if (isAtLevel2Now) {
      setL2DialogOpen(true);
      setL2DialogError("");
      return;
    }
    handleAction("submit");
  };

  // -----------------------------
  // Actions
  // -----------------------------
    const handleAction = async (actionType, overrides = {}) => {
    const generalData =
      overrides.generalData ?? generalRef.current?.getGeneralData?.() ?? {};
    const effectiveStatus = trim(overrides.status ?? status);
    const effectiveDisposition = trim(overrides.disposition ?? disposition);

    const issuesData = issuesRef.current?.getIssuesData?.() ?? {};
    const effectiveSelected = {
      ...(overrides.selectedCaseData ?? selectedCaseData),
      ...issuesData,
    };

    const closingViaSubmit =
      actionType === "submit" && effectiveStatus === "Closed";

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
    const newAssigneeCode  = trim(effectiveSelected?.assignToCode || effectiveSelected?.assignedTo || "");
    const ownerCode        = trim(selectedCaseData?.ownerCode || selectedCaseData?.caseOwnerCode || "");
    const hierarchyNext    = trim(selectedCaseData?.secondSlaCode || selectedCaseData?.nextLevelID || "");

    const hasUserPickedAssignee = !!newAssigneeCode && norm(newAssigneeCode) !== norm(prevAssigneeCode);
    const isHierarchyChoice     = !!hierarchyNext && norm(newAssigneeCode) === norm(hierarchyNext);
    const isAssignToCreator     = !!ownerCode && norm(newAssigneeCode) === norm(ownerCode);
    const isManualReassign      = hasUserPickedAssignee && !isHierarchyChoice;
    const treatAsManual         = isManualReassign || (isAssignToCreator && !isHierarchyChoice);

    // Preflight persist response for non-submit actions
    const responseText = trim(effectiveSelected?.response || "");
    if (responseText && actionType !== "submit") {
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
        (initialStatusRef.current && initialStatusRef.current !== "Closed")
          ? initialStatusRef.current
          : ((selectedCaseData?.caseStatus && selectedCaseData.caseStatus !== "Closed")
              ? selectedCaseData.caseStatus
              : "WIP");

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
        preSubmitPayload.caseWith   = assigneeForSubmit;
      }
      if (isBadAssignee(preSubmitPayload.assignedto)) {
        preSubmitPayload.assignedto = currentUser?.code || ownerCode || "-";
        preSubmitPayload.caseWith   = preSubmitPayload.assignedto;
      }

      console.groupCollapsed("⓪ PRESUBMIT (persist response before non-submit action)");
      console.log({
        status: preSubmitPayload.status,
        assignedto: preSubmitPayload.assignedto,
        response_len: (preSubmitPayload.response || "").length,
      });
      console.groupEnd();

      await postCaseOperation(preSubmitPayload, "submit (preflight persist response)");
    }

    // Closing via submit (UNCHANGED)
    if (closingViaSubmit) {
      try {
        if (!trim(effectiveSelected?.response)) {
          setToast({ type: "error", message: "Please add a response before submitting." });
          return;
        }
        setSaving(true);

        const nonClosedStatus =
          (initialStatusRef.current && initialStatusRef.current !== "Closed")
            ? initialStatusRef.current
            : ((selectedCaseData?.caseStatus && selectedCaseData.caseStatus !== "Closed")
                ? selectedCaseData.caseStatus
                : "WIP");

        const assigneeForSubmit = resolveAssigneeForSubmit({
          newAssigneeCode: newAssigneeCode,
          prevAssigneeCode: prevAssigneeCode,
          stage1Code: stage1Code,
          stage2Code: "",
          ownerCode: ownerCode,
          currentAssigneeCode: selectedCaseData?.assignToCode,
          currentAssigneeName: selectedCaseData?.assignName,
          currentUserCode: currentUser?.code,
        });

        const submitPayload = buildFullPayload({
          general: generalData,
          current: {
            ...effectiveSelected,
            assignToCode: assigneeForSubmit || effectiveSelected?.assignToCode
          },
          status: nonClosedStatus,
          disposition: effectiveDisposition,
          operation: "submit",
        });

        submitPayload.assignedto = assigneeForSubmit || submitPayload.assignedto || currentUser?.code || ownerCode || "-";
        submitPayload.caseWith   = submitPayload.assignedto;

        console.groupCollapsed("① SUBMIT (persist response before close)");
        console.log({
          status: submitPayload.status,
          assignedto: submitPayload.assignedto,
          caseWith: submitPayload.caseWith,
          response_len: (submitPayload.response || "").length,
          response_preview: (submitPayload.response || "").slice(0,120)
        });
        console.groupEnd();

        await postCaseOperation(submitPayload, "submit (close flow — persist response)");

        const closePayload = buildFullPayload({
          general: generalData,
          current: { ...effectiveSelected, response: "" },
          status: "Closed",
          disposition: effectiveDisposition,
          operation: "updateStatus",
        });
        closePayload.assignedto = "-";
        closePayload.caseWith   = "-";

        if (USE_PLACEHOLDERS_ON_UPDATE_STATUS) {
          const fill = (v, fb = "N/A") => (isNonEmpty(v) ? v : fb);
          const emailFill = (v) => (isNonEmpty(v) ? v : "-");
          const ccFill = (v) => (isNonEmpty(v) ? v : "-");

          closePayload.assignedto      = fill(closePayload.assignedto, "-");
          closePayload.caseWith        = fill(closePayload.caseWith, "-");
          closePayload.assignedemailid = emailFill(closePayload.assignedemailid);
          closePayload.cc              = ccFill(closePayload.cc);
          closePayload.moreCC          = ccFill(closePayload.moreCC);

          const stringyKeys = [
            "casetitle","category","subCategory","subSubCategory","subSubSubCategory",
            "casemedium","casesource","priority","custID","productCode",
            "servicecode","serviceccode","createdby","issuedesciption","clientThreat",
            "doctorCode","firsttimeresolution","response","categorySpecificResolution",
            "remarks","casedisposition"
          ];
          for (const k of stringyKeys) closePayload[k] = closePayload[k] ?? "";
          closePayload.materialCost = closePayload.materialCost ?? 0;
          closePayload.labourCost   = closePayload.labourCost ?? 0;
          closePayload.otherCharges = closePayload.otherCharges ?? 0;
          closePayload.totalCharges = closePayload.totalCharges ?? 0;
        }

        console.groupCollapsed("② UPDATESTATUS (close)");
        console.log({
          status: closePayload.status,
          assignedto: closePayload.assignedto,
          caseWith: closePayload.caseWith,
          response_len: (closePayload.response || "").length
        });
        console.groupEnd();

        await postCaseOperation(closePayload, "updateStatus (close flow — set Closed)");

        const ccCombined = [effectiveSelected?.cc, effectiveSelected?.moreCc].filter(Boolean).join(",");
        const anyEmailPresent =
          /[^\s@]+@[^\s@]+\.[^\s@]+/.test(effectiveSelected?.email || "") ||
          /[^\s@]+@[^\s@]+\.[^\s@]+/.test(ccCombined || "");

        if (anyEmailPresent) {
          const closureMail = buildCaseMailPayload({
            selected: {
              caseNo: effectiveSelected?.caseNo,
              caseCategory: selectedCaseData?.caseCategory || selectedCaseData?.categoryName,
              subCategoryName: selectedCaseData?.subCategoryName,
              issueDescription: effectiveSelected?.issueDescription,
              response: effectiveSelected?.response,
              firstTimeResolution: effectiveSelected?.firstTimeResolution,
              cc: effectiveSelected?.cc,
              moreCc: effectiveSelected?.moreCc,
              email: effectiveSelected?.email,
              centerName: selectedCaseData?.centerName,
            },
            centerNameFallback: "Bright Clinics",
          });

          if (!closureMail.emailTo) {
            const prefer = await lookupEmployeeByCode(
              firstNonEmpty(
                selectedCaseData?.assignToCode,
                selectedCaseData?.ownerCode,
                currentUser?.code
              )
            );
            if (prefer?.emailID) closureMail.emailTo = prefer.emailID;
          }

          await sendCaseMail(closureMail, setToast);
        }

        setStatus("Closed");
        setSelectedCaseData((prev) =>
          prev ? { ...prev, caseStatus: "Closed", disposition: closePayload.casedisposition } : prev
        );
        setToast({ type: "success", message: "Case closed successfully." });
        try { issuesRef.current?.reloadResponses?.(); } catch {}
        navigate(-1);
      } catch (err) {
        console.error("close via submit error:", err);
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

    // 🔹 SPECIAL CASE: SAVE → force current assignee into payload
    if (actionType === "save") {
      const urlNameRaw = trim(assignedFromUrl);
      const urlNameNorm = normNameBase(urlNameRaw);

      let currentEmp = null;
      if (urlNameNorm && Array.isArray(employees) && employees.length) {
        currentEmp = employees.find(
          (e) => normNameBase(e?.employeeName) === urlNameNorm
        );
      }

      const resolvedCode = trim(
        currentEmp?.employeeCode ||
        selectedCaseData?.assignToCode ||
        selectedCaseData?.assignedTo ||
        ""
      );
      const resolvedMobile = trim(
        currentEmp?.mobileNo ||
        selectedCaseData?.employeeMobile ||
        ""
      );
      const resolvedEmail = trim(
        currentEmp?.emailID ||
        selectedCaseData?.email ||
        ""
      );

      payload.assignedto      = resolvedCode || payload.assignedto || "";
      payload.caseWith        = resolvedCode || payload.caseWith   || "";
      payload.employeno       = resolvedMobile || payload.employeno || "";
      payload.assignedemailid = resolvedEmail  || payload.assignedemailid || "";

      console.groupCollapsed("DEBUG: SAVE payload current assignee mapping");
      console.log("URL ?assignedTo=", urlNameRaw);
      console.log("Resolved current assignee for SAVE →", {
        employeeCode: resolvedCode,
        mobileNo: resolvedMobile,
        emailID: resolvedEmail,
      });
      console.groupEnd();
    }

    if (actionType !== "submit") {
      payload.response = "";
    }

    if (treatAsManual && isAssignToCreator) {
      payload.assignedto = ownerCode;
      payload.caseWith   = ownerCode;
    }

    if (actionType === "submit") {
      if (!trim(effectiveSelected?.response)) {
        setToast({ type: "error", message: "Please add a response before submitting." });
        return;
      }
      if (treatAsManual && !isAssignToCreator) {
        payload.assignedto = newAssigneeCode || payload.assignedto || "";
        payload.caseWith   = newAssigneeCode || payload.caseWith   || "";
      }
      payload.status = "WIP";
    }

    if (actionType === "updateStatus" && USE_PLACEHOLDERS_ON_UPDATE_STATUS) {
      const fill = (v, fb = "N/A") => (isNonEmpty(v) ? v : fb);
      const emailFill = (v) => (isNonEmpty(v) ? v : "-");
      const ccFill = (v) => (isNonEmpty(v) ? v : "-");

      payload.assignedto      = fill(payload.assignedto, "");
      payload.caseWith        = fill(payload.caseWith, "");
      payload.assignedemailid = emailFill(payload.assignedemailid);
      payload.cc              = ccFill(payload.cc);
      payload.moreCC          = ccFill(payload.moreCC);

      const stringyKeys = [
        "casetitle","category","subCategory","subSubCategory","subSubSubCategory",
        "casemedium","casesource","priority","custID","productCode",
        "servicecode","serviceccode","createdby","issuedesciption","clientThreat",
        "doctorCode","firsttimeresolution","response","categorySpecificResolution",
        "remarks","casedisposition"
      ];
      for (const k of stringyKeys) payload[k] = payload[k] ?? "";
      payload.materialCost = payload.materialCost ?? 0;
      payload.labourCost   = payload.labourCost ?? 0;
      payload.otherCharges = payload.otherCharges ?? 0;
      payload.totalCharges = payload.totalCharges ?? 0;
    }

    try {
      setSaving(true);
      const result = await postCaseOperation(payload, actionType);

      if (result?.code === "200") {
        if (actionType === "updateStatus" && isNonEmpty(effectiveStatus)) {
          setStatus(effectiveStatus);
        }

        const appliedAssignee = trim(payload.assignedto || "");
        setSelectedCaseData((prev) =>
          prev ? {
            ...prev,
            caseStatus: actionType === "updateStatus" && isNonEmpty(effectiveStatus)
              ? effectiveStatus
              : prev.caseStatus,
            disposition: payload.casedisposition || prev.disposition,
            assignToCode: appliedAssignee || prev.assignToCode || "",
            assignName: prev.assignName,
          } : prev
        );

        if (actionType === "submit") {
          if (treatAsManual) {
            setToast({ type: "success", message: "Case reassigned (status will be handled by backend)." });
            navigate(-1);
          } else {
            setToast({
              type: "success",
              message: `Case submitted successfully. Case No: ${result.name || effectiveSelected?.caseNo}`,
            });
            try { issuesRef.current?.reloadResponses?.(); } catch {}
            navigate(-1);
          }
        } else if (actionType === "save") {
          if (treatAsManual) {
            setToast({ type: "success", message: "Case reassigned (status unchanged locally)." });
          } else {
            setToast({
              type: "success",
              message: `Case saved successfully. Case No: ${result.name || effectiveSelected?.caseNo}`,
            });
          }
        } else if (actionType === "updateStatus") {
          setToast({ type: "success", message: `Status updated to ${effectiveStatus || "—"}.` });
        }

        const shouldEmail =
          treatAsManual ||
          (actionType === "submit" &&
            !arrivedAsL2 &&
            (isHierarchyChoice || (!hasUserPickedAssignee && !!hierarchyNext)) );

        if (shouldEmail) {
          const mailBase = {
            caseNo: effectiveSelected?.caseNo,
            caseCategory: selectedCaseData?.caseCategory || selectedCaseData?.categoryName,
            subCategoryName: selectedCaseData?.subCategoryName,
            issueDescription: effectiveSelected?.issueDescription,
            response: effectiveSelected?.response,
            firstTimeResolution: effectiveSelected?.firstTimeResolution,
            cc: effectiveSelected?.cc,
            moreCc: effectiveSelected?.moreCc,
            email: effectiveSelected?.email,
            centerName: selectedCaseData?.centerName,
          };
          const mailPayload = buildCaseMailPayload({
            selected: mailBase,
            centerNameFallback: "Bright Clinics",
          });

          const emailLookupCode = treatAsManual ? (newAssigneeCode || ownerCode) : hierarchyNext;
          const nextEmp = await lookupEmployeeByCode(emailLookupCode);
          if (nextEmp?.emailID) mailPayload.emailTo = nextEmp.emailID;

          await sendCaseMail(mailPayload, setToast);
        }
      }
    } catch (err) {
      console.error(`${actionType} error:`, err);
      setToast({ type: "error", message: `Failed to ${actionType} case. Reason: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };


  // --------------------------------------------
  // Tab click handler with loader (3 seconds)
  // --------------------------------------------
  const handleTabClick = (tabKey) => {
    if (tabKey === activeTab) return;
    if (tabTimerRef.current) {
      clearTimeout(tabTimerRef.current);
    }
    setTabLoading(true);
    setActiveTab(tabKey);
    tabTimerRef.current = setTimeout(() => {
      setTabLoading(false);
    }, 3000); // 3 seconds
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralTab ref={generalRef} data={selectedCaseData} />;
      case "issues": {
        const assignedDisplayForIssues =
          trim(assignedFromUrl) ||
          firstNonEmpty(selectedCaseData?.assignName, selectedCaseData?.assignToCode, "-");
        return (
          <IssuesTab
            ref={issuesRef}
            data={selectedCaseData}
            assignedToName={assignedDisplayForIssues}
            assignedToCode={selectedCaseData ? selectedCaseData.assignToCode : ""}
            onResponseChange={(ok) => setIsResponseFilled(ok)}
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

  if (loading) return <div>Loading case details...</div>;
  if (!selectedCaseData) return <div>Case not found</div>;

  const isComplaintCase =
    /complaint/i.test(
      trim(selectedCaseData?.caseCategory) ||
        trim(selectedCaseData?.categoryName) ||
        ""
    );

  const stageHint = (() => {
    const assignedNow = trim(stage1Code || "");
    const stage2Code = trim(
      selectedCaseData?.secondSlaCode || selectedCaseData?.nextLevelID || ""
    );
    if (!assignedNow && !stage2Code) return "";
    if (assignedNow && stage2Code && assignedNow === stage2Code) return "Stage 2";
    if (assignedNow) return "Stage 1";
    return "";
  })();

  const stageBadge = stageHint ? (
    <span
      style={{
        marginLeft: 8,
        fontSize: 10,
        lineHeight: "14px",
        padding: "1px 6px",
        borderRadius: 8,
        border: "1px solid #d0d7de",
        background: "#f6f8fa",
        color: "#57606a",
        verticalAlign: "middle",
        display: "none", // keep hidden for QA switch if needed
      }}
      title="Debug: which stage of handoff this case is in"
    >
      {stageHint}
    </span>
  ) : null;

  const showButtonsBase = canEditCase && ["general", "issues", "expense"].includes(activeTab);
  const showSaveButton = showButtonsBase && status !== "Closed";
  const submitDisabled = saving || !isResponseFilled;

  const closed = status === "Closed";

  return (
    <section>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

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
            <div className="csdetval">
              {assignedDisplay} {stageBadge}
            </div>
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
            fontSize: 14
          }}
        >
          <strong>Heads up:</strong> This case is currently at <strong>Level 2</strong>.{" "}
          On submit, you can either close the case or reassign it to someone else if more information is needed.
        </div>
      )}

      <div className="casedetwrp">
        <div className="casecell">
          <div className="form-group">
            <label>Case Disposition{status === "Closed" ? " *" : ""}</label>
            <select
              value={disposition}
              onChange={(e) => setDisposition(e.target.value)}
              disabled={saving || closed}
            >
              <option value="">Select Case Disposition</option>
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
                  setSelectedCaseData((prev) =>
                    prev
                      ? { ...prev, categorySpecificResolution: e.target.value }
                      : prev
                  )
                }
                disabled={saving || closed}
              >
                <option value="">Select</option>
                <option value="Resolved">Resolved</option>
                <option value="Unresolved">Unresolved</option>
              </select>
            </div>
          </div>
        )}

        <div className="casecell">
          <div className="casecell">
            <div className="form-group">
              <label>Case Status</label>
              <select
                value={status}
                disabled={saving || closed}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  const prevStatus = status;

                  if (newStatus === "Closed" && !trim(disposition)) {
                    setToast({
                      type: "error",
                      message: "Please select Case Disposition before closing the case.",
                    });
                    e.target.value = prevStatus || "";
                    return;
                  }

                  if (newStatus === "Closed") {
                    const isComplaint = /complaint/i.test(
                      trim(selectedCaseData?.caseCategory) ||
                        trim(selectedCaseData?.categoryName) ||
                        ""
                    );
                    if (isComplaint) {
                      const generalData = generalRef.current?.getGeneralData?.() ?? {};
                      const csr =
                        trim(generalData?.categorySpecificResolution) ||
                        trim(selectedCaseData?.categorySpecificResolution);
                      if (!csr) {
                        setToast({
                          type: "error",
                          message:
                            "For Complaint cases, Category Specific Resolution is required before closing.",
                        });
                        e.target.value = prevStatus || "";
                        return;
                      }
                    }
                  }

                  setStatus(newStatus);
                  setSelectedCaseData((prev) =>
                    prev ? { ...prev, caseStatus: newStatus } : prev
                  );

                  if (newStatus !== "Closed") {
                    try {
                      await handleAction("updateStatus", { status: newStatus, disposition });
                    } catch {
                      setStatus(prevStatus);
                      setSelectedCaseData((prev) =>
                        prev ? { ...prev, caseStatus: prevStatus } : prev
                      );
                      setToast({ type: "error", message: "Failed to save case status." });
                    }
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
          <span
            className={`tablinks ${activeTab === "general" ? "active" : ""}`}
            onClick={() => handleTabClick("general")}
          >
            General
          </span>
          <span
            className={`tablinks ${activeTab === "issues" ? "active" : ""}`}
            onClick={() => handleTabClick("issues")}
          >
            Issues and Responses
          </span>
          <span
            className={`tablinks ${activeTab === "sla" ? "active" : ""}`}
            onClick={() => handleTabClick("sla")}
          >
            SLA Details
          </span>
          <span
            className={`tablinks ${activeTab === "journey" ? "active" : ""}`}
            onClick={() => handleTabClick("journey")}
          >
            Case Journey
          </span>
          <span
            className={`tablinks ${activeTab === "expense" ? "active" : ""}`}
            onClick={() => handleTabClick("expense")}
          >
            Expense
          </span>
        </div>

        <div className="tabcontent" style={{ display: "block" }}>
          {tabLoading ? (
            <div className="loader-wrapper">
              <div className="loader"></div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>

        {canEditCase && ["general", "issues", "expense"].includes(activeTab) && (
          <div className="buttongrp mt-3">
            {showSaveButton && (
              <button
                type="button"
                className="pribtn"
                onClick={() => handleAction("save")}
                disabled={saving}
              >
                Save
              </button>
            )}
            <button
              type="button"
              className="secbtn"
              onClick={onSubmitClick}
              disabled={submitDisabled}
              title={saving ? "Saving in progress…" : (!isResponseFilled ? "Add a response to enable Submit." : "")}
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
            zIndex: 1000
          }}
          onClick={() => setL2DialogOpen(false)}
        >
          <div
            style={{
              width: "min(520px, 92vw)",
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #eee" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Submit at Level 2</h3>
            </div>

            <div style={{ padding: 16 }}>
              <p style={{ marginTop: 0, color: "#444" }}>
                This case is currently assigned to the <strong>Level 2</strong> assignee.
                Choose how you want to proceed:
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 12,
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: 12,
                  background: "#fafafa"
                }}
              >
                {/* Option A: Close the case now */}
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Option A: Close the case</div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 2 }}>
                    Closes the case now. Make sure you’ve entered a response and selected a disposition.
                  </div>
                  <button
                    className="pribtn"
                    style={{ marginTop: 8 }}
                    onClick={async () => {
                      if (!trim(disposition)) {
                        setToast?.({ type: "error", message: "Please select Case Disposition before closing." });
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

                {/* Option B: Reassign to someone else */}
                <div style={{ borderTop: "1px dashed #e6e6e6", paddingTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                    Option B: Assign to another person (needs more info)
                  </div>
                  {/* you can plug in your reassign UI here later */}
                </div>
              </div>
            </div>

            <div style={{ padding: 12, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="secbtn" onClick={() => setL2DialogOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CaseDetailsPage;
