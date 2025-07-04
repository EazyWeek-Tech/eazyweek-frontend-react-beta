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
        const sorted = [
          ...data.filter((item) => item.typeOfData === "Initiated"),
          ...data.filter((item) => item.typeOfData === "Response"),
        ];
        setJourneyData(sorted);
      } catch (error) {
        console.error("Failed to fetch journey data:", error);
        setJourneyData([]);
      }
    };

    fetchJourney();
  }, [caseNo]);

  const renderRow = (entry, isInitiation = false) => (
    <div
      className="jrnygrd"
      key={`${entry.subject}-${entry.typeOfData}-${entry.from || ''}-${entry.to || ''}`}
    >
      <div className="jrnycell jrnyfrst">
        {isInitiation ? "Initiation By" : "Response"}
      </div>
      <div className="jrnycell jrnysec">
        <div className="emrespwrp">
          <div className="emailresp">
            <div className="emlbl">From:</div>
            <div className="emlval">{entry.from || ""}</div>
          </div>
          <div className="emailresp">
            <div className="emlbl">To:</div>
            <div className="emlval">{entry.to || ""}</div>
          </div>
          <div className="emailresp">
            <div className="emlbl">CC:</div>
            <div className="emlval">{entry.cc || ""}</div>
          </div>
          <div className="emailresp">
            <div className="emlbl">Subject:</div>
            <div className="emlval">{entry.subject || ""}</div>
          </div>
        </div>
      </div>
      <div className="jrnycell jrnythr">
        <hr />
      </div>
      <div className="jrnycell jrnyfr">
        <textarea readOnly defaultValue={entry.issueDescription || ""} />
      </div>
    </div>
  );

  return (
    <div className="jrnyform tabform">
      <div className="jrnygrd">
        <div className="jrnycell jrnyfrst"></div>
        <div className="jrnycell jrnysec csttl">Case Journey</div>
        <div className="jrnycell jrnythr"></div>
        <div className="jrnycell jrnyfr"></div>
      </div>
      {journeyData.map((entry) =>
        renderRow(entry, entry.typeOfData === "Initiated")
      )}
    </div>
  );
});

export default JourneyTab;
