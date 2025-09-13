import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GeneralTab from "./CaseDetails/GeneralTab";
import IssuesTab from "./CaseDetails/IssuesTab";
import SLATab from "./CaseDetails/SLATab";
import JourneyTab from "./CaseDetails/JourneyTab";
import ExpenseTab from "./CaseDetails/ExpenseTab";
import { Link } from "react-router-dom";
import Toast from "../../components/Toast";
import { API_BASE_URL } from "../../config";

// --------------------------------------------
// Config
// --------------------------------------------
const USE_PLACEHOLDERS_ON_UPDATE_STATUS = true; // set false to fail instead of filling

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

const pruneEmpty = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => isNonEmpty(v)));

const readOrgContext = (general, current) => {
  const ss = (k) => trim(sessionStorage.getItem(k));
  // look inside common JSON blobs
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
    ss("job"),             // some envs store center in "job"
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
    CENTERCODE: centerGuess,
    DEPARTMENTCODE: 'department',  // optional
    CUSTCLINICCODE: 'Bright',      // optional
  };
};

// --------------------------------------------
// Minimal required validation per action
// --------------------------------------------
function buildRequiredBlock({ actionType, general, current, status, disposition }) {
  const org = readOrgContext(general, current);

  if (actionType === "updateStatus") {
    return pruneEmpty({
      caseno: current?.caseNo,
      status: trim(status),
      CENTERCODE: org.CENTERCODE,
      CASEDISPOSITION: trim(status) === "Closed" ? trim(disposition) : "N/A",
    });
  }

  // save / submit minimal set
  return pruneEmpty({
    CASETITLE: mergeVal(general?.title, current?.title),
    Category: mergeVal(general?.categoryCode, current?.categoryCode),
    SubCategory: mergeVal(general?.subCategory, current?.subCategory),
    CASEMEDIUM: mergeVal(general?.medium, current?.medium),
    CASESOURCE: mergeVal(general?.source, current?.source),
    Priority: mergeVal(general?.priority, current?.priority),
    CustID: mergeVal(general?.customer, current?.customer),
    CREATEDBY: mergeVal(general?.createdBy, current?.createdBy),
    ASSIGNEDEMAILID: mergeVal(undefined, current?.email),
    EMPLOYENO: mergeVal(undefined, current?.employeeMobile),
    CENTERCODE: org.CENTERCODE,
  });
}

function validateRequired(requiredObj) {
  const missing = Object.entries(requiredObj)
    .filter(([, v]) => !isNonEmpty(v))
    .map(([k]) => k);
  return { ok: missing.length === 0, missing };
}

// --------------------------------------------
// For updateStatus: force-fill keys backend marks as "required"
// without overwriting real values. Uses placeholders only if empty.
// --------------------------------------------
function fillRequiredForUpdateStatus(lower, current, status, disposition) {
  // Fields that backend has complained about in your logs:
  const MUST_HAVE = [
    "CASETITLE","Category","SubCategory","SubSubCategory","SubSubSubCategory",
    "CASEMEDIUM","CASESOURCE","Priority","CustID",
    "ProductCode","SERVICECODE","SERVICECCODE","CREATEDBY",
    "ISSUEDESCIPTION","ClientThreat","DoctorCode","FIRSTTIMERESOLUTION",
    "RESPONSE","ASSIGNEDEMAILID","EMPLOYENO","CC","MoreCC","REMARKS",
    "CategorySpecificResolution","CASEDISPOSITION","CENTERCODE"
    // department/clinic optional on your system; add if your server insists
  ];

  // Create an upper-case view of current case for convenience
  const fromCurrent = {
    CASETITLE: current?.title,
    Category: current?.categoryCode,
    SubCategory: current?.subCategory,
    SubSubCategory: current?.subSubCategory,
    SubSubSubCategory: current?.subSubSubCategory,
    CASEMEDIUM: current?.medium,
    CASESOURCE: current?.source,
    Priority: current?.priority,
    CustID: current?.customer,
    ProductCode: current?.productCode,
    SERVICECODE: current?.service,
    SERVICECCODE: current?.serviceCategory,
    CREATEDBY: current?.createdBy,
    ISSUEDESCIPTION: current?.issueDescription,
    ClientThreat: current?.clientThreat,
    DoctorCode: current?.therapistCode,
    FIRSTTIMERESOLUTION: current?.firstTimeResolution,
    RESPONSE: current?.response,
    ASSIGNEDEMAILID: current?.email,
    EMPLOYENO: current?.employeeMobile,
    CC: current?.cc,
    MoreCC: current?.moreCc,
    REMARKS: current?.remarks,
    CategorySpecificResolution: current?.categorySpecificResolution,
    CASEDISPOSITION: trim(status) === "Closed" ? trim(disposition) : (current?.disposition || "N/A"),
    CENTERCODE: lower.CENTERCODE || lower.centercode || "N/A",
  };

  // placeholders (keep email-ish fields as "-" to avoid bad addresses)
  const PLACEHOLDER = {
    default: "N/A",
    email: "-",
    cc: "-",
  };

  const out = { ...lower };

  for (const key of MUST_HAVE) {
    if (isNonEmpty(out[key])) continue; // already present & non-empty

    const cur = trim(fromCurrent[key] ?? "");
    if (isNonEmpty(cur)) {
      out[key] = cur;
      continue;
    }

    if (!USE_PLACEHOLDERS_ON_UPDATE_STATUS) {
      // leave it empty; backend may 400 and we surface the error
      continue;
    }

    // fill with safe placeholder
    if (key === "ASSIGNEDEMAILID") out[key] = PLACEHOLDER.email;
    else if (key === "CC" || key === "MoreCC") out[key] = PLACEHOLDER.cc;
    else out[key] = PLACEHOLDER.default;
  }

  return out;
}

// --------------------------------------------
// Session user
// --------------------------------------------
const readSessionUser = () => {
  // Try JSON blobs
  const objKeys = ["user", "userDetails", "currentUser", "authUser", "sessionUser"];
  for (const k of objKeys) {
    const raw = sessionStorage.getItem(k);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        const code = firstNonEmpty(obj.userId, obj.userID, obj.employeeCode, obj.empCode, obj.code);
        const name = firstNonEmpty(
          obj.userName,
          obj.username,
          (obj.firstName || obj.lastName) ? `${obj.firstName || ""} ${obj.lastName || ""}` : "",
          obj.name
        );
        if (code || name) return { code, name };
      } catch {}
    }
  }
  // Flat keys
  const code = firstNonEmpty(
    sessionStorage.getItem("userId"),
    sessionStorage.getItem("userid"),
    sessionStorage.getItem("employeeCode"),
    sessionStorage.getItem("empCode")
  );
  const name = firstNonEmpty(
    sessionStorage.getItem("userName"),
    sessionStorage.getItem("username"),
    `${sessionStorage.getItem("firstName") || ""} ${sessionStorage.getItem("lastName") || ""}`
  );
  return (code || name) ? { code, name } : null;
};

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
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => readSessionUser());

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
    setCurrentUser(readSessionUser());
  }, []);

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseDetails/${caseNumber}`,
          { credentials: "include" }
        );
        const data = await response.json();

        const mappedAssignCode = trim(firstNonEmpty(
          data.assignToCode,
          data.assignCode,
          data.emailTOCode,
          data.nextLevelID
        ));
        const mappedAssignName = trim(firstNonEmpty(
          data.assignTOName,
          data.assignName,
          data.emailTOName
        ));

        setSelectedCaseData({
          caseNo: trim(data.caseNo),
          title: trim(data.caseTitle),

          // Category chain
          categoryCode: trim(data.categoryCode),
          caseCategory: trim(data.categoryName),
          subCategory: trim(data.subCategoryCode),
          subCategoryName: trim(data.subCategoryName),
          subSubCategory: trim(data.subSubCategoryCode),
          subSubCategoryName: trim(data.subSubCategoryName),
          subSubSubCategory: trim(data.subSubSubCategoryCode),
          subSubSubCategoryName: trim(data.subSubSubCategoryName),

          // Medium / Source
          medium: trim(firstNonEmpty(data.mediumCode, data.mediumName)),
          mediumName: trim(firstNonEmpty(data.mediumName, data.mediumCode)),
          source: trim(data.sourceCode),
          sourceName: trim(data.sourceName),

          priority: trim(data.priority),

          // Owner vs Customer
          ownerCode: trim(data.caseOwnerCode),
          ownerName: trim(data.caseOwnerName),

          customer: trim(data.custID),
          customerId: trim(data.custID),
          customerName: trim(data.custName),

          // Product/Service
          productCode: trim(data.productCode),
          product: trim(data.productName),
          service: trim(data.serviceCode),
          serviceName: trim(data.serviceName),
          serviceCategory: trim(data.sServiceCategoryCode),

          createdBy: trim(data.createdBy),
          createdDate: formatCreatedDate(data.createdDate),

          // Issue
          issueDescription: trim(data.issueDescription),
          firstTimeResolution: trim(data.firstTimeResolution),
          clientThreat: trim(data.clientThreat),

          therapistName: trim(data.therapistName),
          therapistCode: trim(data.therapistCode),

          // Assignment
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

  // Build the final full payload (prunes empties, mirrors uppercase);
  // For updateStatus we then "force-fill" required keys to satisfy the backend.
  function buildFullPayload({ general, current, status, disposition, operation }) {
    const org = readOrgContext(general, current);

    const base = {
      caseno: current?.caseNo || "",
      operation: operation || "",
      createddate: new Date().toISOString(),

      // General
      casetitle: mergeVal(general?.title, current?.title),
      category: mergeVal(general?.categoryCode, current?.categoryCode),
      subCategory: mergeVal(general?.subCategory, current?.subCategory),
      subSubCategory: mergeVal(general?.subSubCategory, current?.subSubCategory),
      subSubSubCategory: mergeVal(general?.subSubSubCategory, current?.subSubSubCategory),
      casemedium: mergeVal(general?.medium, current?.medium),
      casesource: mergeVal(general?.source, current?.source),
      priority: mergeVal(general?.priority, current?.priority),
      custID: mergeVal(general?.customer, current?.customer),
      productCode: mergeVal(general?.productCode, current?.productCode),
      servicecode: mergeVal(general?.service, current?.service),
      serviceccode: mergeVal(general?.serviceCategory, current?.serviceCategory),
      createdby: mergeVal(general?.createdBy, current?.createdBy),

      // Issues
      issuedesciption: mergeVal(undefined, current?.issueDescription),
      clientThreat: mergeVal(undefined, current?.clientThreat),
      doctorCode: mergeVal(undefined, current?.therapistCode),
      firsttimeresolution: mergeVal(undefined, current?.firstTimeResolution),
      response: mergeVal(undefined, current?.response),

      // Assignment / contacts
      assignedto: mergeVal(undefined, current?.assignedTo),
      employeno: mergeVal(undefined, current?.employeeMobile),
      assignedemailid: mergeVal(undefined, current?.email),
      cc: mergeVal(undefined, current?.cc),
      moreCC: mergeVal(undefined, current?.moreCc),
      categorySpecificResolution: mergeVal(undefined, current?.categorySpecificResolution),
      remarks: mergeVal(undefined, current?.remarks),

      // Status
      casedisposition: isNonEmpty(disposition) ? trim(disposition) : (current?.disposition || undefined),
      caseWith: mergeVal(undefined, current?.assignToCode),
      status: trim(status) || undefined,
      caseStatus: trim(status) || undefined,

      // Costs
      materialCost: isNonEmpty(current?.materialCost) ? current.materialCost : undefined,
      labourCost: isNonEmpty(current?.labourCOst) ? current.labourCOst : undefined,
      otherCharges: isNonEmpty(current?.otherCharges) ? current.otherCharges : undefined,
      totalCharges: isNonEmpty(current?.total) ? current.total : undefined,

      // Org (Center required to avoid inserts)
      isdraft: operation === "save" ? 1 : 0,
      centercode: readOrgContext(general, current).CENTERCODE,
      ...(isNonEmpty(readOrgContext(general, current).DEPARTMENTCODE) ? { departmentcode: readOrgContext(general, current).DEPARTMENTCODE } : {}),
      ...(isNonEmpty(readOrgContext(general, current).CUSTCLINICCODE) ? { custcliniccode: readOrgContext(general, current).CUSTCLINICCODE } : {}),
    };

    // Drop empties (normal path)
    let lower = pruneEmpty(base);

    // Add uppercase aliases for present keys
    const aliasMap = {
      casetitle: "CASETITLE",
      category: "Category",
      subCategory: "SubCategory",
      subSubCategory: "SubSubCategory",
      subSubSubCategory: "SubSubSubCategory",
      casemedium: "CASEMEDIUM",
      casesource: "CASESOURCE",
      priority: "Priority",
      custID: "CustID",
      productCode: "ProductCode",
      servicecode: "SERVICECODE",
      serviceccode: "SERVICECCODE",
      createdby: "CREATEDBY",
      issuedesciption: "ISSUEDESCIPTION",
      clientThreat: "ClientThreat",
      doctorCode: "DoctorCode",
      firsttimeresolution: "FIRSTTIMERESOLUTION",
      response: "RESPONSE",
      assignedemailid: "ASSIGNEDEMAILID",
      employeno: "EMPLOYENO",
      cc: "CC",
      moreCC: "MoreCC",
      categorySpecificResolution: "CategorySpecificResolution",
      remarks: "REMARKS",
      casedisposition: "CASEDISPOSITION",
      caseStatus: "CASESTATUS",
      centercode: "CENTERCODE",
      departmentcode: "DEPARTMENTCODE",
      custcliniccode: "CUSTCLINICCODE",
    };

    let payload = { ...lower };
    for (const [low, up] of Object.entries(aliasMap)) {
      if (low in lower) payload[up] = lower[low];
    }

    // SPECIAL: updateStatus must include all "required" keys non-empty → fill placeholders if needed
    if (base.operation === "updateStatus") {
      payload = fillRequiredForUpdateStatus(payload, current, status, payload.CASEDISPOSITION);
    }

    return payload;
  }

  // Actions
  const handleAction = async (actionType, overrides = {}) => {
    const generalData = overrides.generalData ?? generalRef.current?.getGeneralData?.() ?? {};
    const effectiveStatus = trim(overrides.status ?? status);
    const effectiveDisposition = trim(overrides.disposition ?? disposition);
    const effectiveSelected = overrides.selectedCaseData ?? selectedCaseData;

    // Minimal validation (center + basics; closes require disposition)
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
        // include server text in toast for faster debugging
        throw new Error(responseText || "Invalid JSON response from server");
      }

      if (result?.code === "200") {
        setToast({
          type: "success",
          message: `Case ${actionType}d successfully. Case No: ${result.name || effectiveSelected?.caseNo}`,
        });

        if (payload.status) {
          setStatus(payload.status);
          setSelectedCaseData((prev) => prev ? { ...prev, caseStatus: payload.status, disposition: payload.CASEDISPOSITION || prev.disposition } : prev);
        }

        if (actionType === "updateStatus") navigate(-1);
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
      case "issues":
        return <IssuesTab ref={issuesRef} data={selectedCaseData} />;
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

  return (
    <section>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="brdcrmb">
        <ul>
          <li><Link to="/cases">Case Management</Link></li>
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
            <div className="csdetval">{selectedCaseData.ownerName}</div>
            <div className="csdetlbl">Owner</div>
          </div>
          <div className="casedet">
            <div className="csdetval">
              {selectedCaseData.assignName || selectedCaseData.assignToCode || "-"}
            </div>
            <div className="csdetlbl">Assigned To</div>
          </div>
        </div>
      </div>

      <div className="casedetwrp">
        <div className="casecell">
          <div className="form-group">
            <label>Case Disposition</label>
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
                    setToast({ type: "error", message: "Please select Case Disposition before closing the case." });
                    e.target.value = prevStatus || "";
                    return;
                  }

                  // optimistic UI
                  setStatus(newStatus);
                  setSelectedCaseData((prev) => (prev ? { ...prev, caseStatus: newStatus } : prev));

                  try {
                    await handleAction("updateStatus", { status: newStatus, disposition });
                  } catch {
                    // rollback
                    setStatus(prevStatus);
                    setSelectedCaseData((prev) => (prev ? { ...prev, caseStatus: prevStatus } : prev));
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
        <div className="step complete">Created<div className="node"></div></div>
        <div className={`step ${status === "Closed" || status === "WIP" ? "complete" : status === "Open" ? "in-progress" : ""}`}>
          Awaiting Action<div className="node"></div>
        </div>
        <div className={`step ${status === "Closed" ? "complete" : status === "WIP" ? "in-progress" : ""}`}>
          WIP <span>(2 hours)</span><div className="node"></div>
        </div>
        <div className={`step ${status === "Closed" ? "complete" : ""}`}>Closed<div className="node"></div></div>
      </div>

      <section className="tabsform">
        <div className="tab">
          <span className={`tablinks ${activeTab === "general" ? "active" : ""}`} onClick={() => setActiveTab("general")}>General</span>
          <span className={`tablinks ${activeTab === "issues" ? "active" : ""}`} onClick={() => setActiveTab("issues")}>Issues and Responses</span>
          <span className={`tablinks ${activeTab === "sla" ? "active" : ""}`} onClick={() => setActiveTab("sla")}>SLA Details</span>
          <span className={`tablinks ${activeTab === "journey" ? "active" : ""}`} onClick={() => setActiveTab("journey")}>Case Journey</span>
          <span className={`tablinks ${activeTab === "expense" ? "active" : ""}`} onClick={() => setActiveTab("expense")}>Expense</span>
        </div>

        <div className="tabcontent" style={{ display: "block" }}>
          {renderTabContent()}
        </div>

        {currentUser?.code === selectedCaseData?.assignToCode &&
          ["general", "issues", "expense"].includes(activeTab) && (
            <div className="buttongrp mt-3">
              <button type="button" className="pribtn" onClick={() => handleAction("save")} disabled={saving}>
                Save
              </button>
              <button type="button" className="secbtn" onClick={() => handleAction("submit")} disabled={saving}>
                Submit
              </button>
            </div>
          )}
      </section>
    </section>
  );
};

export default CaseDetailsPage;
