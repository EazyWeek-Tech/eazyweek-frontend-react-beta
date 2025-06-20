import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import GeneralTab from "./CaseDetails/GeneralTab";
import IssuesTab from "./CaseDetails/IssuesTab";
import SLATab from "./CaseDetails/SLATab";
import JourneyTab from "./CaseDetails/JourneyTab";
import ExpenseTab from "./CaseDetails/ExpenseTab";
import Toast from "../components/Toast";
import { Link } from "react-router-dom";


const CaseDetailsPage = () => {
  const { caseNumber } = useParams();
  const [activeTab, setActiveTab] = useState("general");
  const [selectedCaseData, setSelectedCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disposition, setDisposition] = useState("");
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState(null);

  const generalRef = useRef();
  const issuesRef = useRef();
  const expenseRef = useRef();
  const journeyRef = useRef();
  const slaRef = useRef();

  const API_BASE_URL = "https://insightweb-hkhqgch8hadvcbb0.uaenorth-01.azurewebsites.net";

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseDetails/${caseNumber}`
        );
        const data = await response.json();
const userId = sessionStorage.getItem("userid");
    console.log(userId)
        setSelectedCaseData({
          caseNo: data.caseNo,
          title: data.caseTitle,
          categoryCode: data.categoryCode,
          caseCategory: data.categoryName,
          subCategory: data.subCategoryCode,
          subCategoryName: data.subCategoryName,
          subSubCategory: data.subSubCategoryCode,
          subSubCategoryName: data.subSubCategoryName,
          subSubSubCategory: data.subSubSubCategoryCode,
          subSubSubCategoryName: data.subSubSubCategoryName,
          medium: data.mediumName,
          source: data.sourceName,
          priority: data.priority,
          customer: data.createdBy,
          productCode: data.productCode,
          product: data.productName,
          service: data.serviceCode,
          serviceCategory: data.sServiceCategoryCode,
          
          createdBy: data.createdBy,
          createdDate: data.createdDate && data.createdDate !== "0001-01-01T00:00:00"
            ? (() => {
                const [d, m, yAndTime] = data.createdDate.split("-");
                const [y, t] = yAndTime.split(" ");
                const isoString = `${y}-${m}-${d}T${t}`;
                const dateObj = new Date(isoString);
                return isNaN(dateObj)
                  ? "-"
                  : dateObj.toLocaleString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
              })()
            : "-",

          issueDescription: data.issueDescription,
          firstTimeResolution: data.firstTimeResolution,
          clientThreat: data.clientThreat,
          therapist: data.therapistName,
          assignedTo: data.assignTOName,
          assignToCode: data.assignTOCode,
          employeeMobile: data.empMobileNo,
          email: data.emailTOEMailID,
          emailTo: data.emailToName,
          cc: data.emailCC,
          moreCc: data.moreCC,
          remarks: data.remarks,

          materialCost: 0,
          labourCost: 0,
          otherCharges: 0,
          total: 0,

          slaIdeal: data.slaIdeal || {},
          slaActual: data.slaActual || {},
        });
        setDisposition(data.disposition || "");
        setStatus(data.caseStatus || "");
        setLoading(false);
      } catch (error) {
        console.error("Error fetching case details:", error);
        setLoading(false);
      }
    };

    fetchCaseDetails();
  }, [caseNumber]);

  const handleAction = async (actionType) => {
    const generalData = generalRef.current?.getGeneralData?.() || {};
    const slaData = slaRef.current?.getSLAData?.() || {};

    const payload = {
      casetitle: generalData.title,
      caseno: selectedCaseData?.caseNo || "",
      category: generalData.categoryCode,
      subCategory: generalData.subCategory,
      subSubCategory: generalData.subSubCategory,
      subSubSubCategory: generalData.subSubSubCategory,
      casemedium: generalData.medium,
      casesource: generalData.source,
      priority: generalData.priority,
      custID: generalData.customer,
      productCode: generalData.productCode,
      servicecode: generalData.service,
      serviceccode: generalData.serviceCategory,
      createdby: generalData.createdBy,
      createddate: new Date().toISOString(),
      issuedesciption: selectedCaseData?.issueDescription,
      clientThreat: selectedCaseData?.clientThreat,
      doctorCode: "",
      firsttimeresolution: selectedCaseData?.firstTimeResolution,
      response: "",
      assignedto: selectedCaseData?.assignedTo,
      employeno: selectedCaseData?.employeeMobile,
      assignedemailid: selectedCaseData?.email,
      cc: selectedCaseData?.cc,
      moreCC: selectedCaseData?.moreCc,
      categorySpecificResolution: "",
      remarks: selectedCaseData?.remarks,
      casedisposition: disposition,
      caseWith: selectedCaseData.assignToCode,
      status: status,
      operation: actionType,
      materialCost: 0,
      labourCost: 0,
      otherCharges: 0,
      totalCharges: 0,
      isdraft: 0,
      centercode: "",
      departmentcode: "",
      custcliniccode: ""
    };
    
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      const res = await fetch(`${API_BASE_URL}/api/CaseOperation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const responseText = await res.text();
      console.log("Raw API response:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error("Invalid JSON response from server");
      }

      if (result?.code === "200") {
  setToast({ type: "success", message: `Case ${actionType}d successfully. Case No: ${result.name}` });
} else {
  throw new Error(result?.message || "Unknown error");
}

    } catch (err) {
      console.error(`${actionType} error:`, err);
      setToast({ type: "error", message: `Failed to ${actionType} case. Reason: ${err.message}` });
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
    <section className="home-sect">
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
            <div className="csdetval">{selectedCaseData.customer}</div>
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
            <select value={disposition} onChange={(e) => setDisposition(e.target.value)}>
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
      onChange={async (e) => {
        const newStatus = e.target.value;

        if (newStatus === "Closed" && !disposition) {
          setToast({ type: "error", message: "Please select Case Disposition before closing the case." });
          return;
        }

        setStatus(newStatus);

        // Trigger API update on status change
        try {
          await handleAction("save");
        } catch (err) {
          console.error("Error saving case on status change:", err);
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

        {sessionStorage.getItem("userid") === selectedCaseData?.assignToCode && (
  <div className="buttongrp mt-3">
    <button type="button" className="pribtn" onClick={() => handleAction("save")}>Save</button>
    <button type="button" className="secbtn" onClick={() => handleAction("submit")}>Submit</button>
    <button type="button" className="secbtn" onClick={() => handleAction("assign")}>Assign To Next Level</button>
    <button type="button" className="secbtn" onClick={() => handleAction("saveNext")}>Save and Next</button>
  </div>
)}
      </section>
    </section>
  );
};

export default CaseDetailsPage;