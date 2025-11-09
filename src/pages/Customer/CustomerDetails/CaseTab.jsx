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
        
        .cases-table a{color: #334B71;font-weight: 700;}
         .cases-table { width: 100%; border-collapse: collapse; margin: 20px 0;background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
    overflow: hidden; }
        .cases-table td {padding: 12px 18px;
    font-size: 14px;
    color: #0f172a;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
 }
        .cases-table th { background: #f8fafc;
    color: #0f172a;
    font-weight: 700;
    font-size: 14px;
    text-align: left;
    padding: 14px 18px;
    border-bottom: 1px solid #e2e8f0;
    letter-spacing: .2px; }
          .case-tab{padding: 30px; width: calc(100% - 300px);}
       
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
