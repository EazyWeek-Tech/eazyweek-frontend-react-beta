import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config";

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
         const response = await fetch(
    `${API_BASE_URL}/api/CaseOperation/CaseDetails/${caseNumber}`,
    {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    }
  );

  if (response.status === 401) {
    console.error("401 Unauthorized: Not logged in / cookie not sent");
    return;
  }

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
      // ✅ For SLA: show all non-draft rows but deduplicate consecutive 
      // same-person blocks and skip rows where response is empty
      // (empty rows are placeholder rows for owner/assignee tracking)
      const submitted = data.filter((entry) => !entry.isDraft);
      
      // Build deduplicated list — keep one entry per person per handoff
      // ✅ Deduplicate consecutive same-person blocks only
      // Keeps repeated people if they appear again after someone else
      const deduped = [];
      let lastCaseWith = null;
      for (const entry of submitted) {
        const key = entry.caseWith || "";
        if (key !== lastCaseWith) {
          deduped.push(entry);
          lastCaseWith = key;
        }
      }

      setActualList(
        deduped.map((entry, index, arr) => {
          // ✅ diffHours = time FROM previous entry TO this entry
          // index 0 (first block) gets empty — no value between Creation and first block
          // index 1+ gets time from previous block to this block
          let diffDisplay = "";
          if (index > 0) {
            const prev = new Date(arr[index - 1].caseReceiveDate);
            const current = new Date(entry.caseReceiveDate);
            const totalMinutes = Math.round((current - prev) / (1000 * 60));
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            if (hours > 0 && minutes > 0) {
              diffDisplay = `${hours} hr ${minutes} min`;
            } else if (hours > 0) {
              diffDisplay = `${hours} hr`;
            } else if (minutes > 0) {
              diffDisplay = `${minutes} min`;
            } else {
              diffDisplay = "0 min";
            }
          }
          return {
            caseWith: entry.caseWith || "",
            timestamp: formatDateTime(entry.caseReceiveDate),
            diffHours: diffDisplay,
          };
        })
      );
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

  useEffect(() => {
  if (!ideal || Object.keys(ideal).length === 0) return;

  console.group("🟦 SLA Ideal Values");
  console.log("Initial SLA Name:", ideal.initial);
  console.log("Mid SLA Name:", ideal.mid);
  console.log("Late SLA Name:", ideal.late);
  console.log("Final SLA Name:", ideal.final);
  console.log("First SLA Hours:", ideal.firstSlaHours);
  console.log("Second SLA Hours:", ideal.secondSlaHours);
  console.groupEnd();
}, [ideal]);


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
              <div className="flow-time">
                {item.diffHours}

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
