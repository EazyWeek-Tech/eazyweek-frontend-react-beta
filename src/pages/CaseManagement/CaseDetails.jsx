import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import GeneralTab from "./CaseDetails/GeneralTab";
import IssuesTab from "./CaseDetails/IssuesTab";
import SLATab from "./CaseDetails/SLATab";
import JourneyTab from "./CaseDetails/JourneyTab";
import ExpenseTab from "./CaseDetails/ExpenseTab";
import { Link } from "react-router-dom";
import Toast from "../../components/Toast";
import { API_BASE_URL } from "../../config";

// ---- sessionStorage-only current user ----
const trim = (s) => (s ?? "").toString().trim();
const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    const t = trim(v);
    if (t) return t;
  }
  return "";
};

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
      } catch { /* ignore */ }
    }
  }
  // Flat keys (matches your example)
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

const CaseDetailsPage = () => {
  const { caseNumber } = useParams();
  const [activeTab, setActiveTab] = useState("general");
  const [selectedCaseData, setSelectedCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disposition, setDisposition] = useState("");
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => readSessionUser());
  const actionTabs = new Set(["general", "issues", "expense"]);

  const generalRef = useRef();
  const issuesRef = useRef();
  const expenseRef = useRef();
  const journeyRef = useRef();
  const slaRef = useRef();

  const formatCreatedDate = (raw) => {
    if (!raw || raw === "0001-01-01T00:00:00") return "-";
    // dd/MM/yyyy
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
    setCurrentUser(readSessionUser()); // refresh once on mount
  }, []);

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseDetails/${caseNumber}`,
          { credentials: "include" }
        );
        const data = await response.json();

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

          // Medium / Source (use CODES so dropdowns preselect)
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

          // Therapist for IssuesTab preselect
          therapistName: trim(data.therapistName),
          therapistCode: trim(data.therapistCode),

          // Assignment (pick first non-empty from payload variants)
          assignedTo: trim(
            firstNonEmpty(data.assignToCode)
          ),
          assignToCode: trim(
            firstNonEmpty(
              data.assignToCode,
              data.assignTOCode,
              data.assignCode,
              data.emailTOCode,
              data.nextLevelID
            )
          ),

          employeeMobile: trim(data.empMobileNo),
          email: trim(data.emailTOEMailID),
          emailTo: trim(data.emailTOName),

          cc: trim((data.emailCC || "").replace(/\s+,/g, ",")).replace(/,+$/g, ""),
          moreCc: trim(data.moreCC),
          remarks: trim(data.remarks),

          materialCost: data.materialCost ?? 0,
          labourCost: data.labourCOst ?? 0,
          otherCharges: data.otherCharges ?? 0,
          total: data.total ?? 0,

          slaIdeal: data.slaIdeal || {},
          slaActual: data.slaActual || {},
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

  // handleAction with status override
  const handleAction = async (actionType, overrides = {}) => {
    const generalData = overrides.generalData ?? generalRef.current?.getGeneralData?.() ?? {};
    const slaData = overrides.slaData ?? slaRef.current?.getSLAData?.() ?? {};
    const effectiveStatus = trim(overrides.status ?? status);
    const effectiveDisposition = trim(overrides.disposition ?? disposition);
    const effectiveSelected = overrides.selectedCaseData ?? selectedCaseData;

    const payload = {
      casetitle: trim(generalData.title) || "",
      caseno: effectiveSelected?.caseNo || "",
      category: generalData.categoryCode || "",
      subCategory: generalData.subCategory || "",
      subSubCategory: generalData.subSubCategory || "",
      subSubSubCategory: generalData.subSubSubCategory || "",
      casemedium: generalData.medium || "-",
      casesource: generalData.source || "-",
      priority: generalData.priority || "",
      custID: generalData.customer || "",
      productCode: generalData.productCode || "",
      servicecode: generalData.service || "",
      serviceccode: generalData.serviceCategory || "",
      createdby: generalData.createdBy || "",
      createddate: new Date().toISOString(),

      issuedesciption: effectiveSelected?.issueDescription || "",
      clientThreat: effectiveSelected?.clientThreat || "-",
      doctorCode: effectiveSelected?.therapistCode || "",
      firsttimeresolution: effectiveSelected?.firstTimeResolution || "",
      response: "",

      assignedto: effectiveSelected?.assignedTo || "",
      employeno: effectiveSelected?.employeeMobile || "",
      assignedemailid: effectiveSelected?.email || "",
      cc: effectiveSelected?.cc || "-",
      moreCC: effectiveSelected?.moreCc || "",
      categorySpecificResolution: "",
      remarks: effectiveSelected?.remarks || "",

      casedisposition: effectiveDisposition || "",
      caseWith: effectiveSelected?.assignToCode || "",

      caseStatus: effectiveStatus || "",
      status: effectiveStatus || "",

      operation: actionType, // e.g., "updateStatus" or "save"
      materialCost: 0,
      labourCost: 0,
      otherCharges: 0,
      totalCharges: 0,
      isdraft: 0,
      centercode: "",
      departmentcode: "",
      custcliniccode: "",
    };

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
        throw new Error("Invalid JSON response from server");
      }

      if (result?.code === "200") {
        setToast({
          type: "success",
          message: `Case ${actionType}d successfully. Case No: ${result.name}`,
        });
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
            <div className="csdetval">{selectedCaseData.assignedTo}</div>
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
                  if (newStatus === "Closed" && !disposition) {
                    setToast({ type: "error", message: "Please select Case Disposition before closing the case." });
                    return;
                  }
                  if (newStatus !== status) {
                    setStatus(newStatus);
                    setSelectedCaseData((prev) => (prev ? { ...prev, caseStatus: newStatus } : prev));
                    try {
                      await handleAction("updateStatus", { status: newStatus, disposition });
                    } catch (err) {
                      console.error("Error saving case on status change:", err);
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
     {/*  <button type="button" className="secbtn" onClick={() => handleAction("assign")} disabled={saving}>
        Assign To Next Level
      </button>
      <button type="button" className="secbtn" onClick={() => handleAction("saveNext")} disabled={saving}>
        Save and Next
      </button> */}
    </div>
)}
      </section>
    </section>
  );
};

export default CaseDetailsPage;
