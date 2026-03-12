import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { API_BASE_URL } from "../../../config";

const JourneyTab = forwardRef(({ caseNo }, ref) => {
  const [journeyData, setJourneyData] = useState([]);

  useImperativeHandle(ref, () => ({
    getJourneyData: () => journeyData || [],
  }));

  useEffect(() => {
    const fetchJourney = async () => {
      if (!caseNo) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseJourney/${caseNo}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();

        // SP now returns rows in correct order (ORDER BY RECID ASC)
        // No client-side sorting needed
        setJourneyData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch journey data:", error);
        setJourneyData([]);
      }
    };

    fetchJourney();
  }, [caseNo]);

  const getStageLabel = (entry) => {
    const stage = (entry.stageType || "").toString().trim();
    if (stage === "Initiated")     return "Initiation By";
    if (stage === "Closed")        return "Closure";
    if (stage === "EscalatedToL2") return "Escalated to L2";
    return "Response";
  };

  const renderRow = (entry, index) => (
    <div
      className="jrnygrd"
      key={entry.recid || `journey-row-${index}`}
    >
      <div className="jrnycell jrnyfrst">
        {getStageLabel(entry)}
      </div>

      <div className="jrnycell jrnysec">
        <div className="emrespwrp">

          <div className="emailresp">
            <div className="emlbl">From:</div>
            <div className="emlval">
              {entry.createdBy || entry.from || ""}
            </div>
          </div>

          <div className="emailresp">
            <div className="emlbl">To:</div>
            <div className="emlval">
              {entry.emailTo || entry.to || ""}
            </div>
          </div>

          <div className="emailresp">
            <div className="emlbl">CC:</div>
            <div className="emlval">
              {entry.emailCC || entry.cc || ""}
            </div>
          </div>

          <div className="emailresp">
            <div className="emlbl">Subject:</div>
            <div className="emlval">
              {entry.caseTitle || entry.subject || ""}
            </div>
          </div>

        </div>
      </div>

      <div className="jrnycell jrnythr">
        <hr />
      </div>

      <div className="jrnycell jrnyfr">
        <textarea
          readOnly
          defaultValue={
            entry.response ||
            entry.issueDesciption ||
            entry.issueDescription ||
            ""
          }
        />
      </div>
    </div>
  );

  return (
    <div className="jrnyform tabform">
      {/* Header row */}
      <div className="jrnygrd">
        <div className="jrnycell jrnyfrst"></div>
        <div className="jrnycell jrnysec csttl">Case Journey</div>
        <div className="jrnycell jrnythr"></div>
        <div className="jrnycell jrnyfr"></div>
      </div>

      {/* Journey rows */}
      {journeyData.length === 0 ? (
        <div style={{ padding: "16px", color: "#888", textAlign: "center" }}>
          No journey data available.
        </div>
      ) : (
        journeyData.map((entry, index) => renderRow(entry, index))
      )}
    </div>
  );
});

export default JourneyTab;