import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useParams } from "react-router-dom";
const API_BASE_URL = "https://insightweb-hkhqgch8hadvcbb0.uaenorth-01.azurewebsites.net";
const SLATab = forwardRef((_, ref) => {
  const { caseNumber } = useParams();
  const [ideal, setIdeal] = useState({});
  const [actualList, setActualList] = useState([]);
  const [categoryData, setCategoryData] = useState({
    caseCategory: "",
    subCategory: "",
    subSubCategory: "",
    subSubSubCategory: ""
  });
const convertHoursRangeToDays = (hourRange) => {
  if (!hourRange) return "";
  const parts = hourRange.split("-").map(h => parseInt(h.trim(), 10));
  if (parts.some(isNaN)) return hourRange; // return as-is if parsing fails
  return parts.map(h => Math.round(h / 24)).join("-");
};

const getSecondValueFromRange = (range) => {
  if (!range) return "";
  const parts = range.split("-").map(p => p.trim());
  return parts[1] || "";
};
  useImperativeHandle(ref, () => ({
    getSLAData: () => ({
      slaIdeal: ideal,
      slaActual: actualList,
    }),
  }));

  useEffect(() => {
    const fetchSLA = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseDetails/${caseNumber}`);
        const data = await response.json();

        setIdeal({
          initial: data.firstSlaName?.trim() || "",
          mid: data.firstSlaEName?.trim() || "",
          late: data.secondSlaName?.trim() || "",
          final: data.secondSlaEName?.trim() || "",
          firstSlaHours: data.firstSlaHours?.trim() || "",
          secondSlaHours: data.secondSlaHours?.trim() || ""
        });

        setCategoryData({
          caseCategory: data.categoryName || "",
          subCategory: data.subCategoryName || "",
          subSubCategory: data.subSubCategoryName || "",
          subSubSubCategory: data.subSubSubCategoryName || "",
        });
      } catch (err) {
        console.error("Error fetching SLA tab data:", err);
      }
    };


    const fetchActualSLA = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseResponse/${caseNumber}/ActualResponse`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setActualList(data.map((entry) => ({
            caseWith: entry.caseWith || "",
            timestamp: formatDateTime(entry.caseReceiveDate),
          })));
        }
      } catch (err) {
        console.error("Failed to fetch actual SLA:", err);
      }
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return "-";
      const d = new Date(dateStr);
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    fetchSLA();
    fetchActualSLA();
  }, [caseNumber]);

  return (
    <div className="slaform tabform">
      <div className="form-group">
        <label htmlFor="category">Category</label>
        <input type="text" id="category" value={categoryData.caseCategory} readOnly />
      </div>
      <div className="form-group">
        <label htmlFor="subcategory">Sub Category</label>
        <input type="text" id="subcategory" value={categoryData.subCategory} readOnly />
      </div>
      <div className="form-group">
        <label htmlFor="subsubcategory">Sub Sub Category</label>
        <input type="text" id="subsubcategory" value={categoryData.subSubCategory} readOnly />
      </div>
      <div className="form-group">
        <label htmlFor="subsubsubcategory">Sub Sub Sub Category</label>
        <input type="text" id="subsubsubcategory" value={categoryData.subSubSubCategory} readOnly />
      </div>

      <div className="sla-tables">
        <div className="section-title">Ideal</div>
        <table className="tblstyle">
          <tbody>
            <tr>
              <td rowSpan="2">Creation</td>
              <td rowSpan="2" width="100">{ideal.firstSlaHours}<hr className="tmline" /></td>
              <td className="small-label">1st level Assignment</td>
              <td rowSpan="2" width="100">{ideal.secondSlaHours}<hr className="tmline" /></td>
            </tr>
            <tr>
              <td rowSpan="2">
                <div className="box blue">
                  <input type="text" value={ideal.initial} readOnly />
                </div>
                <div className="inflex">
                                    <div className="small-label">&gt;{getSecondValueFromRange(ideal.firstSlaHours)}</div>

                  <div className="arrow-down"></div>
                </div>
                <div className="box red">
                  <input type="text" value={ideal.mid} readOnly />
                </div>
              </td>
              <td>
                <div className="box blue">
                  <input type="text" value={ideal.mid} readOnly />
                </div>
                <div className="inflex">
                  <div className="arrow-down"></div>
                  <div className="small-label">{convertHoursRangeToDays(ideal.secondSlaHours)}</div>
                </div>
                <div className="box red">
                  <input type="text" value={ideal.final} readOnly />
                </div>
                <div className="inflex">
                  <div className="end-label">End</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="section-title">Actual</div>
        <div className="actual-flow">
          <div className="flow-label">Creation</div>
          <div className="flow-line"></div>
          {actualList.map((item, index) => (
            <div key={index} className="flow-item">
              <div className="flow-time">0

                <div>
                  <hr className="tmline" />
                </div>
              </div>
              <div className="box blue">
                <input type="text" value={item.caseWith} readOnly />
              </div>
              {index !== actualList.length - 1 && <div className="flow-line"></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default SLATab;
