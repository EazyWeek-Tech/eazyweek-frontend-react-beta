import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";
import { Link } from 'react-router-dom';

const CaseTab = ({ custId }) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch cases based on customer ID
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseListByCustWise/${custId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) throw new Error("Error fetching cases");
        const data = await response.json();

        // Process the cases data
        const processedCases = data.map((caseItem) => ({
          caseNo: caseItem.caseNO,
          caseTitle: caseItem.caseTitle,
          status: caseItem.status,
          priority: caseItem.priority,
          category: caseItem.category,
          subCategory: caseItem.subCategory,
          subSubCategory: caseItem.subSubCategory,
          subSubSubCategory: caseItem.subSubSubCategory,
          caseWith: caseItem.caseWith,
          assignTo: caseItem.assignTo,
          owner: caseItem.owner,
          createdDate: new Date(caseItem.createdDate).toLocaleString(),
          createdBy: caseItem.createdBy,
        }));

        setCases(processedCases);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching cases:", error);
        setLoading(false);
      }
    };

    if (custId) {
      fetchCases();
    }
  }, [custId]);

  // Render table with case data
  const renderTable = () => (
    <div className="appt-section">
      <h4 className="sectttl">Cases</h4>
      <table className="cases-table">
        <thead>
          <tr>
            <th>Case No</th>
            <th>Case Status</th>
            <th>Created Date</th>
            <th>Case Owner</th>
             <th>Assigned To</th>
            <th>Case Category</th>
            <th>Sub Category</th>
           <th>Case Sub Sub Category</th>
            
          </tr>
        </thead>
        <tbody>
          {cases.length > 0 ? (
            cases.map((caseItem, idx) => (
              <tr key={idx}>
                <td><Link to={`/cases/${caseItem.caseNo}`}>{caseItem.caseNo}</Link></td>
                <td dangerouslySetInnerHTML={{ __html: caseItem.status }}></td>
                <td>{caseItem.createdDate}</td>
                <td>{caseItem.owner}</td>
                <td>{caseItem.assignTo}</td>
                <td>{caseItem.category}</td>
                <td>{caseItem.subCategory}</td>
                <td>{caseItem.subSubCategory}</td>
                
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10" style={{ textAlign: "center", padding: "10px" }}>
                No cases available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Placeholder */}
      <div className="pagination">
        <span>Page 1 of 1</span>
        <div className="pagination-links">
          <button disabled className="action-btn">Previous</button>
          <button disabled className="action-btn">Next</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="case-tab">
      {loading ? <p>Loading cases...</p> : renderTable()}

      <style>{`
        .appt-section h4 {
          color: #333;
          margin-bottom: 10px;
        }
        .cases-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 16px;
        }
          .case-tab{padding: 30px; width: calc(100% - 300px);}
        .cases-table th {
          background: #f0f0f0;
          padding: 15px 10px;
          text-align: left;
          border-bottom: 1px solid #ccc;
        }
        .cases-table td {
          font-size: 16px;
          line-height: 19px;
          padding: 15px 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        .action-btn {
          background-color: #334B71;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          margin: 0 0 0 10px;
        }
        .pagination {
          text-align: right;
          color: #555;
          font-size: 12px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 20px;
        }
      `}</style>
    </div>
  );
};

export default CaseTab;
