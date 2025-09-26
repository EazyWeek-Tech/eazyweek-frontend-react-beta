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
  const cleanupList = (s) => clean(s).replace(/\s*,\s*/g, ",").replace(/,+$/g, "");
  return {
    emailTo: clean(selected?.email),
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
    if (res.ok && (out?.success ?? true)) {
      setToast?.({ type: "success", message: "Assignment email sent." });
    } else {
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

  // Capture the status we ARRIVED with (to determine L1 vs L2 reliably)
  const initialStatusRef = useRef(null);

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

  const canEditCase = React.useMemo(() => {
    if (trim(assignedFromUrl)) return urlAssignedMatchesUser;
    return codeMatchesAssigned || assignedMatchesByDisplay || assignedMatchesLoggedInUser;
  }, [
    assignedFromUrl,
    urlAssignedMatchesUser,
    codeMatchesAssigned,
    assignedMatchesByDisplay,
    assignedMatchesLoggedInUser,
  ]);

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
            data.emailTOCode
            // NOTE: do NOT fall back to nextLevelID here
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

          categorySpecificResolution: trim(data.categorySpecificResolution),

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

        // capture arrival status once
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

  // Arrived level (status-driven): if you arrived WIP -> L2; if Open -> L1
  const arrivedAsL2 = (initialStatusRef.current || selectedCaseData?.caseStatus || "").trim() === "WIP";

  // Actions
  const handleAction = async (actionType, overrides = {}) => {
    const generalData =
      overrides.generalData ?? generalRef.current?.getGeneralData?.() ?? {};
    const effectiveStatus = trim(overrides.status ?? status);
    const effectiveDisposition = trim(overrides.disposition ?? disposition);

    const issuesData = issuesRef.current?.getIssuesData?.() ?? {};
    const effectiveSelected =
      { ...(overrides.selectedCaseData ?? selectedCaseData), ...issuesData };

    const req = buildRequiredBlock({
      actionType,
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

    const payload = buildFullPayload({
      general: generalData,
      current: effectiveSelected,
      status: effectiveStatus,
      disposition: effectiveDisposition,
      operation: actionType,
    });

    if (actionType === "submit") {
      // Must have a response at both levels
      if (!trim(effectiveSelected?.response)) {
        setToast({ type: "error", message: "Please add a response before submitting." });
        return;
      }

      const nextCodeRaw = selectedCaseData?.secondSlaCode || selectedCaseData?.nextLevelID || "";

      // Stage logic is purely status-driven based on how we ARRIVED
      if (!arrivedAsL2) {
        // L1 → hand off to L2, force WIP and set next assignee
        if (nextCodeRaw) {
          payload.assignedto = nextCodeRaw;
          payload.caseWith   = nextCodeRaw;
        }
        payload.status = "WIP";
      } else {
        // L2 → can submit only when Closed with disposition
        const needsClosed = trim(payload.status) !== "Closed";
        const needsDisp = !trim(payload.casedisposition);
        if (needsClosed || needsDisp) {
          const msg = `Please ${needsClosed ? "set Case Status to 'Closed'" : ""}${
            needsClosed && needsDisp ? " and " : ""
          }${needsDisp ? "select Case Disposition" : ""} before submitting.`;
          setToast({ type: "error", message: msg });
          return;
        }
        payload.assignedto = "";
        payload.caseWith   = "";
        payload.status     = "Closed";
      }
    }

    if (actionType === "updateStatus" && USE_PLACEHOLDERS_ON_UPDATE_STATUS) {
      const fill = (v, fallback = "N/A") => (isNonEmpty(v) ? v : fallback);
      const emailFill = (v) => (isNonEmpty(v) ? v : "-");
      const ccFill = (v) => (isNonEmpty(v) ? v : "-");

      payload.assignedto = fill(payload.assignedto, "");
      payload.caseWith = fill(payload.caseWith, "");
      payload.assignedemailid = emailFill(payload.assignedemailid);
      payload.cc = ccFill(payload.cc);
      payload.moreCC = ccFill(payload.moreCC);

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
      const res = await fetch(`${API_BASE_URL}/api/CaseOperation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let result; try { result = JSON.parse(responseText); } catch { throw new Error(responseText || "Invalid JSON response from server"); }

      if (result?.code === "200") {
        if (payload.status) {
          setStatus(payload.status);
          setSelectedCaseData((prev) =>
            prev
              ? {
                  ...prev,
                  caseStatus: payload.status,
                  disposition: payload.casedisposition || prev.disposition,
                  assignToCode: payload.assignedto || "",
                  assignName: payload.assignedto ? prev?.secondSlaName || prev?.assignName : "",
                }
              : prev
          );
        }

        if (actionType === "submit") {
          if (payload.status === "WIP") {
            // L1 handoff
            setToast({ type: "success", message: "Handed off to Level 2. Status set to WIP." });

            // email L2
            try {
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
              const mailPayload = buildCaseMailPayload({ selected: mailBase, centerNameFallback: "Bright Clinics" });
              const nextEmp = await lookupEmployeeByCode(selectedCaseData?.secondSlaCode || selectedCaseData?.nextLevelID);
              if (nextEmp?.emailID) mailPayload.emailTo = nextEmp.emailID;
              await sendCaseMail(mailPayload, setToast);
            } catch (e) {
              console.error("CaseMail error:", e);
            }

            navigate(-1);
          } else if (payload.status === "Closed") {
            // L2 close
            setToast({ type: "success", message: "Case closed by Level 2." });
            navigate(-1);
          } else {
            setToast({
              type: "success",
              message: `Case submitted successfully. Case No: ${result.name || effectiveSelected?.caseNo}`,
            });
          }
        } else if (actionType === "save") {
          setToast({
            type: "success",
            message: `Case saved successfully. Case No: ${result.name || effectiveSelected?.caseNo}`,
          });
        } else if (actionType === "updateStatus") {
          const s = (payload.status || "").trim();
          if (s === "WIP") navigate(-1);
          else setToast({ type: "success", message: `Status updated to ${s || "—"}.` });
        }
      } else {
        throw new Error(result?.message || "API did not return code 200");
      }
    } catch (err) {
      console.error(`${actionType} error:`, err);
      setToast({ type: "error", message: `Failed to ${actionType} case. Reason: ${err.message}` });
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
        display: "none",
      }}
      title="Debug: which stage of handoff this case is in"
    >
      {stageHint}
    </span>
  ) : null;

  // Submit is disabled when:
  // - saving, or
  // - no response typed (from IssuesTab), or
  // - at L2 and status is not Closed yet.
  const submitDisabled =
    saving ||
    !isResponseFilled ||
    (arrivedAsL2 && status !== "Closed");

  const submitDisabledReason = () => {
    if (saving) return "Saving in progress…";
    if (!isResponseFilled) return "Add a response to enable Submit.";
    if (arrivedAsL2 && status !== "Closed") return "At Level 2, set Case Status to Closed to submit.";
    return "";
  };

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
                          message: "For Complaint cases, Category Specific Resolution is required before closing.",
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

                  try {
                    await handleAction("updateStatus", { status: newStatus, disposition });
                  } catch {
                    setStatus(prevStatus);
                    setSelectedCaseData((prev) =>
                      prev ? { ...prev, caseStatus: prevStatus } : prev
                    );
                    setToast({ type: "error", message: "Failed to save case status." });
                  }
                }}
              >
                <option value="">Select Case Status</option>
                <option value="Open">Open</option>
                <option value="WIP">WIP</option>
                <option value="Closed">Closed</option>
              </select>
              {arrivedAsL2 && status !== "Closed" && (
                <div style={{fontSize: 12, color: "#6b7280", marginTop: 4}}>
                  At Level 2, set <strong>Case Status</strong> to <strong>Closed</strong> to enable Submit.
                </div>
              )}

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
          <span className={`tablinks ${activeTab === "general" ? "active" : ""}`} onClick={() => setActiveTab("general")}>
            General
          </span>
          <span className={`tablinks ${activeTab === "issues" ? "active" : ""}`} onClick={() => setActiveTab("issues")}>
            Issues and Responses
          </span>
          <span className={`tablinks ${activeTab === "sla" ? "active" : ""}`} onClick={() => setActiveTab("sla")}>
            SLA Details
          </span>
          <span className={`tablinks ${activeTab === "journey" ? "active" : ""}`} onClick={() => setActiveTab("journey")}>
            Case Journey
          </span>
          <span className={`tablinks ${activeTab === "expense" ? "active" : ""}`} onClick={() => setActiveTab("expense")}>
            Expense
          </span>
        </div>

        <div className="tabcontent" style={{ display: "block" }}>
          {renderTabContent()}
        </div>

        {canEditCase && ["general", "issues", "expense"].includes(activeTab) && (
          <div className="buttongrp mt-3">
            <button type="button" className="pribtn" onClick={() => handleAction("save")} disabled={saving}>
              Save
            </button>
            <button
              type="button"
              className="secbtn"
              onClick={() => handleAction("submit")}
              disabled={submitDisabled}
              title={submitDisabledReason()}
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
