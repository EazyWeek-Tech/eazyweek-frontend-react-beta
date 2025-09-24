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
const USE_PLACEHOLDERS_ON_UPDATE_STATUS = true; // still honored but only within schema keys

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

// NEW: normalize employee codes like "CENT-00170" => "CENT00170"
const normCodeId = (s) => trim(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

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

  const centerGuess = firstNonEmpty(
    general?.centerCode,
    current?.centerCode,
    ss("centerCode"),
    ss("CenterCode"),
    ss("centercode"),
    ss("job"),
    fromJson("centerCode"),
    fromJson("job")
  );
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
    centercode: centerGuess || "",
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
      code = firstNonEmpty(
        code,
        obj.userId,
        obj.userID,
        obj.employeeCode,
        obj.empCode,
        obj.code
      );
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
// Minimal required for basic guardrails (front-end)
// --------------------------------------------
function buildRequiredBlock({ actionType, general, current, status, disposition }) {
  const org = readOrgContext(general, current);

  const must = {
    caseno: current?.caseNo,
    centercode: org.centercode,
  };

  if (actionType === "updateStatus") {
    must.status = trim(status);
    // Closing requires disposition
    if (trim(status) === "Closed") {
      must.casedisposition = trim(disposition);
    }
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
// Exact schema payload builder (single shape)
// --------------------------------------------
function buildFullPayload({ general, current, status, disposition, operation }) {
  const org = readOrgContext(general, current);

  const assigneeCode = trim(current?.assignToCode) || trim(current?.assignedTo) || "";
  const createddate = new Date().toISOString();

  // helpers → ensure correct defaults by type
  const S = (v) => (isNonEmpty(v) ? String(v) : "");
  const N = (v) => (Number.isFinite(+v) ? Number(v) : 0);

  // IMPORTANT: return EXACTLY the keys from the provided schema.
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
    createdby:               S(mergeVal(general?.createdBy, current?.createdBy)),
    createddate, // always set

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
  const [firstSlaCode, setFirstSlaCode] = useState("");
  const [stage1Code, setStage1Code] = useState(""); 


  const assignedMatchesLoggedInUser = React.useMemo(() => {
    const urlName = normalizeName(assignedFromUrl);
    const userFullName = normalizeName(currentUser?.fullName || currentUser?.name);
    if (!urlName || !userFullName) return false;
    return urlName === userFullName;
  }, [assignedFromUrl, currentUser?.fullName, currentUser?.name]);

  // New: if the UI's assigned display equals logged-in user, allow actions
  const assignedMatchesByDisplay = React.useMemo(() => {
    // use the same fallback order you show in the header
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

  useEffect(() => {
    console.log(
      "assignedDisplay vs user:",
      firstNonEmpty(assignedFromUrl, selectedCaseData?.assignName, selectedCaseData?.assignToCode, ""),
      " ~ ",
      currentUser?.fullName || currentUser?.name,
      " => ",
      assignedMatchesByDisplay
    );
  }, [assignedFromUrl, selectedCaseData, currentUser, assignedMatchesByDisplay]);

  // 1) Add these memos near the others (below assignedMatchesLoggedInUser/assignedMatchesByDisplay)

  const codeMatchesAssigned = React.useMemo(() => {
    return norm(currentUser?.code) && norm(currentUser?.code) === norm(selectedCaseData?.assignToCode);
  }, [currentUser?.code, selectedCaseData?.assignToCode]);

  const urlAssignedMatchesUser = React.useMemo(() => {
    const urlName = normalizeName(assignedFromUrl);
    const userFullName = normalizeName(currentUser?.fullName || currentUser?.name);
    return !!urlName && !!userFullName && urlName === userFullName;
  }, [assignedFromUrl, currentUser?.fullName, currentUser?.name]);

  // Final authority: if URL provides assignedTo, require it to match the user.
  // Otherwise fall back to code/name checks from API.
  const canEditCase = React.useMemo(() => {
    if (trim(assignedFromUrl)) {
      return urlAssignedMatchesUser; // URL is source of truth
    }
    return codeMatchesAssigned || assignedMatchesByDisplay || assignedMatchesLoggedInUser;
  }, [
    assignedFromUrl,
    urlAssignedMatchesUser,
    codeMatchesAssigned,
    assignedMatchesByDisplay,
    assignedMatchesLoggedInUser,
  ]);

  useEffect(() => {
    setCurrentUser(readSessionUser());
  }, []);

  const generalRef = useRef();
  const issuesRef = useRef();
  const expenseRef = useRef();
  const journeyRef = useRef();
  const slaRef = useRef();

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
            data.emailTOCode,
            data.nextLevelID
          )
        );
        const mappedAssignName = trim(
          firstNonEmpty(data.assignTOName, data.assignName, data.emailTOName)
        );

        setSelectedCaseData({
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

          categorySpecificResolution: trim(data.categorySpecificResolution),

          materialCost: data.materialCost ?? 0,
          labourCost: data.labourCOst ?? 0,
          otherCharges: data.otherCharges ?? 0,
          total: data.total ?? 0,

          slaIdeal: data.slaIdeal || {},
          slaActual: data.slaActual || {},
          disposition: trim(data.disposition),

          caseStatus: trim(data.caseStatus),

          // expose second SLA details for orchestration
          secondSlaName: trim(data.secondSlaName),
          secondSlaCode: trim(data.nextLevelID), // next assignee code
          firstSlaName: trim(data.firstSlaName || ""),
        });

        setDisposition(trim(data.disposition));
        setStatus(trim(data.caseStatus));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching case details:", error);
        setLoading(false);
      }
    };

    fetchCaseDetails();
  }, [caseNumber]);
  // Normalize helpers (reuse your existing ones if already in file)
const normNameBase = (s) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^dr\.?\s*/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");

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
      const text = await res.text();
      const list = JSON.parse(text);

      const want = normNameBase(targetName);
      const match = (Array.isArray(list) ? list : []).find((e) => {
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


  // Actions
  const handleAction = async (actionType, overrides = {}) => {
    const generalData =
      overrides.generalData ?? generalRef.current?.getGeneralData?.() ?? {};
    const effectiveStatus = trim(overrides.status ?? status);
    const effectiveDisposition = trim(overrides.disposition ?? disposition);
    // Merge Issues tab live values into the base case object
    const issuesData = issuesRef.current?.getIssuesData?.() ?? {};
    const effectiveSelected =
      { ...(overrides.selectedCaseData ?? selectedCaseData), ...issuesData };

    // Front-end guardrails
    const req = buildRequiredBlock({
      actionType,
      general: generalData,
      current: effectiveSelected,
      status: effectiveStatus,
      disposition: effectiveDisposition,
    });
    const { ok, missing } = validateRequired(req);
    if (!ok) {
      setToast({
        type: "error",
        message: `Missing required fields: ${missing.join(", ")}`,
      });
      return;
    }

    // Build EXACT schema payload
    const payload = buildFullPayload({
      general: generalData,
      current: effectiveSelected,
      status: effectiveStatus,
      disposition: effectiveDisposition,
      operation: actionType,
    });

    // -------- Submit flow orchestration (robust Stage 1/2 detection) --------
    if (actionType === "submit") {
      // normalized code comparison; fallback to names
      const currCodeRaw =
        effectiveSelected?.assignToCode ||
        effectiveSelected?.assignedTo ||
        selectedCaseData?.assignToCode ||
        "";
      const nextCodeRaw =
        selectedCaseData?.secondSlaCode || selectedCaseData?.nextLevelID || "";

      const currCode = normCodeId(currCodeRaw);
      const nextCode = normCodeId(nextCodeRaw);

      const assignedName = normalizeName(
        effectiveSelected?.assignName || selectedCaseData?.assignName || ""
      );
      const firstName = normalizeName(selectedCaseData?.firstSlaName || "");
      const secondName = normalizeName(selectedCaseData?.secondSlaName || "");

      let isStage1 = false;
      let isStage2 = false;

      if (nextCode) {
        isStage2 = currCode && currCode === nextCode;
        isStage1 = currCode && currCode !== nextCode;
      } else if (secondName) {
        isStage2 = assignedName && assignedName === secondName;
        isStage1 = assignedName && firstName && assignedName === firstName;
      } else {
        // last resort: infer from status
        isStage1 = (status || "").trim() === "Open";
        isStage2 = (status || "").trim() === "WIP";
      }

      if (isStage1) {
        // Hand off to second SLA (use raw nextCode to preserve exact formatting)
        if (nextCodeRaw) {
          payload.assignedto = nextCodeRaw;
          payload.caseWith   = nextCodeRaw;
        }
        // If currently Open, move to WIP on first submit
        const currentOrPayloadStatus = trim(payload.status || status);
        payload.status = currentOrPayloadStatus ? currentOrPayloadStatus : "WIP";
        if (trim(status) === "Open") payload.status = "WIP";
      } else if (isStage2) {
        // Require closing before final submit
        const finalStatus = trim(payload.status || status);
        if (finalStatus !== "Closed") {
          setToast({
            type: "error",
            message:
              "Please set Case Status to 'Closed' before submitting at the second level.",
          });
          return;
        }
        // On final close/submit, AssignedTo should go empty
        payload.assignedto = "";
        payload.caseWith   = "";
        payload.status     = "Closed";
      } else {
        // No second level configured — submit with current assignee/status as-is
      }
    }

    // For updateStatus: optionally fill empty strings with placeholders to appease strict validators (still within schema keys)
    if (actionType === "updateStatus" && USE_PLACEHOLDERS_ON_UPDATE_STATUS) {
      const fill = (v, fallback = "N/A") => (isNonEmpty(v) ? v : fallback);
      const emailFill = (v) => (isNonEmpty(v) ? v : "-");
      const ccFill = (v) => (isNonEmpty(v) ? v : "-");

      payload.assignedto = fill(payload.assignedto, "");
      payload.caseWith = fill(payload.caseWith, "");

      payload.assignedemailid = emailFill(payload.assignedemailid);
      payload.cc = ccFill(payload.cc);
      payload.moreCC = ccFill(payload.moreCC);

      // Some backends insist these strings exist even if unchanged
      const stringyKeys = [
        "casetitle","category","subCategory","subSubCategory","subSubSubCategory",
        "casemedium","casesource","priority","custID","productCode",
        "servicecode","serviceccode","createdby","issuedesciption","clientThreat",
        "doctorCode","firsttimeresolution","response","categorySpecificResolution",
        "remarks","casedisposition"
      ];
      for (const k of stringyKeys) payload[k] = payload[k] ?? "";
      // numeric
      payload.materialCost = payload.materialCost ?? 0;
      payload.labourCost   = payload.labourCost ?? 0;
      payload.otherCharges = payload.otherCharges ?? 0;
      payload.totalCharges = payload.totalCharges ?? 0;
    }

    console.log("Sending payload to API:", JSON.stringify(payload, null, 2));

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/api/CaseOperation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(responseText || "Invalid JSON response from server");
      }

      if (result?.code === "200") {
        setToast({
          type: "success",
          message: `Case ${actionType}d successfully. Case No: ${
            result.name || effectiveSelected?.caseNo
          }`,
        });

        if (payload.status) {
          setStatus(payload.status);
          setSelectedCaseData((prev) =>
            prev
              ? {
                  ...prev,
                  caseStatus: payload.status,
                  disposition: payload.casedisposition || prev.disposition,
                  // update current assignee in UI after submit handoff/final close
                  assignToCode: payload.assignedto || "",
                  assignName: payload.assignedto ? prev?.secondSlaName || prev?.assignName : "",
                }
              : prev
          );
        }

        // Navigate only for WIP, stay for Closed (when updating status explicitly)
        if (actionType === "updateStatus") {
          const s = (payload.status || "").trim();
          if (s === "WIP") {
            navigate(-1);
          }
          // Closed => stay on details page
        }
      } else {
        throw new Error(result?.message || "API did not return code 200");
      }
    } catch (err) {
      console.error(`${actionType} error:`, err);
      setToast({
        type: "error",
        message: `Failed to ${actionType} case. Reason: ${err.message}`,
      });
    } finally {
      setSaving(false);
    }
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

  const ownerDisplay = firstNonEmpty(
    ownerFromUrl,
    selectedCaseData.ownerName,
    selectedCaseData.ownerCode,
    "-"
  );
  const assignedDisplay = firstNonEmpty(
    assignedFromUrl,
    selectedCaseData.assignName,
    selectedCaseData.assignToCode,
    "-"
  );

  const isComplaintCase =
    /complaint/i.test(
      trim(selectedCaseData?.caseCategory) ||
        trim(selectedCaseData?.categoryName) ||
        ""
    );

 // ---- Tiny Stage badge (Stage 1 / Stage 2) near Assigned To ----
const stageHint = (() => {
  // Nahlah (Stage 1) code resolved from Employees API
  const assignedNow = trim(stage1Code || "");

  // Hana (Stage 2) code comes from case payload (secondSlaCode/nextLevelID)
  const stage2Code = trim(
    selectedCaseData?.secondSlaCode || selectedCaseData?.nextLevelID || ""
  );

  if (!assignedNow && !stage2Code) return "";
  if (assignedNow && stage2Code && assignedNow === stage2Code) return "Stage 2";
  if (assignedNow) return "Stage 1";
  return "";
})();



console.log(stageHint)

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
        display: "none",
      }}
      title="Debug: which stage of handoff this case is in"
    >
      {stageHint}
    </span>
  ) : null;

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

      <div className="casedetwrp">
        <div className="casecell">
          <div className="form-group">
            <label>Case Disposition{status === "Closed" ? " *" : ""}</label>
            <select
              value={disposition}
              onChange={(e) => setDisposition(e.target.value)}
              disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  const prevStatus = status;

                  if (newStatus === "Closed" && !trim(disposition)) {
                    setToast({
                      type: "error",
                      message:
                        "Please select Case Disposition before closing the case.",
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
                      const generalData =
                        generalRef.current?.getGeneralData?.() ?? {};
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

                  // optimistic UI
                  setStatus(newStatus);
                  setSelectedCaseData((prev) =>
                    prev ? { ...prev, caseStatus: newStatus } : prev
                  );

                  try {
                    await handleAction("updateStatus", {
                      status: newStatus,
                      disposition,
                    });
                  } catch {
                    // rollback
                    setStatus(prevStatus);
                    setSelectedCaseData((prev) =>
                      prev ? { ...prev, caseStatus: prevStatus } : prev
                    );
                    setToast({
                      type: "error",
                      message: "Failed to save case status.",
                    });
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
        <div
          className={`step ${
            status === "Closed" || status === "WIP"
              ? "complete"
              : status === "Open"
              ? "in-progress"
              : ""
          }`}
        >
          Awaiting Action<div className="node"></div>
        </div>
        <div
          className={`step ${
            status === "Closed"
              ? "complete"
              : status === "WIP"
              ? "in-progress"
              : ""
          }`}
        >
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
            onClick={() => setActiveTab("general")}
          >
            General
          </span>
          <span
            className={`tablinks ${activeTab === "issues" ? "active" : ""}`}
            onClick={() => setActiveTab("issues")}
          >
            Issues and Responses
          </span>
          <span
            className={`tablinks ${activeTab === "sla" ? "active" : ""}`}
            onClick={() => setActiveTab("sla")}
          >
            SLA Details
          </span>
          <span
            className={`tablinks ${activeTab === "journey" ? "active" : ""}`}
            onClick={() => setActiveTab("journey")}
          >
            Case Journey
          </span>
          <span
            className={`tablinks ${activeTab === "expense" ? "active" : ""}`}
            onClick={() => setActiveTab("expense")}
          >
            Expense
          </span>
        </div>

        <div className="tabcontent" style={{ display: "block" }}>
          {renderTabContent()}
        </div>

        {canEditCase && ["general", "issues", "expense"].includes(activeTab) && (
          <div className="buttongrp mt-3">
            <button
              type="button"
              className="pribtn"
              onClick={() => handleAction("save")}
              disabled={saving}
            >
              Save
            </button>
            <button
              type="button"
              className="secbtn"
              onClick={() => handleAction("submit")}
              disabled={saving}
            >
              Submit
            </button>
          </div>
        )}
      </section>
    </section>
  );
};

export default CaseDetailsPage;
