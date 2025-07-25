"use client"

import { useState, useEffect, useMemo } from "react";
import OpportunityForm from "./OpportunityForm";
import CreateRuleForm from "./CreateRuleForm";
import EditOpportunityForm from "./EditOpportunityForm";
import { API_BASE_URL } from "../../config";

const OpportunityDashboard = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [opportunityData, setOpportunityData] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("1");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/Opportunity/LoadOpprotunityList/${statusFilter}`,
          { credentials: "include" }
        );
        const data = await response.json();
        // Wrap single object response into array
       setOpportunityData(Array.isArray(data) ? data : (data ? [data] : []));

      } catch (error) {
        console.error("Failed to load opportunities:", error);
        setOpportunityData([]);
      }
    };

    fetchOpportunities();
  }, [statusFilter]);

  const data = currentView === "dashboard" ? opportunityData : [];

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) => {
      const matchesSearch =
        (item.oppCode?.toLowerCase().includes(searchTerm.toLowerCase()) || "") ||
        (item.oppName?.toLowerCase().includes(searchTerm.toLowerCase()) || "") ||
        (item.centerName?.toLowerCase().includes(searchTerm.toLowerCase()) || "") ||
        (item.segmentType?.toLowerCase().includes(searchTerm.toLowerCase()) || "");

      return matchesSearch;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [searchTerm, sortConfig, data]);

  const totalPages = Math.ceil(filteredAndSortedData.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(currentData.map((item) => item.recID || item.oppCode));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleCreateNewCampaign = () => {
    setCurrentView("create-opportunity");
  };

  const handleEditOppName = () => {
    if (selectedRows.length === 0) {
      alert("Please select at least one opportunity to edit");
      return;
    }
    if (selectedRows.length > 1) {
      alert("Please select only one opportunity to edit");
      return;
    }

    const selectedOpp = opportunityData.find(
      (item) => (item.recID || item.oppCode) === selectedRows[0]
    );
    if (selectedOpp) {
      setSelectedOpportunity(selectedOpp);
      setCurrentView("edit-opportunity");
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedOpportunity(null);
  };

  const handleOpportunityNext = (data) => {
    setCurrentView("create-rule");
  };

  const handleRuleBack = () => {
    setCurrentView("create-opportunity");
  };

  const handleRuleSave = (data) => {
    alert("Rule saved successfully!");
  };

  const handleRuleActivate = (data) => {
    alert("Rule activated successfully!");
    setCurrentView("dashboard");
  };

  const handleEditSave = (updatedOpportunity) => {
    setOpportunityData((prev) =>
      prev.map((item) =>
        (item.recID || item.oppCode) === (updatedOpportunity.recID || updatedOpportunity.oppCode)
          ? updatedOpportunity
          : item
      )
    );
    alert("Opportunity name updated successfully!");
    setCurrentView("dashboard");
    setSelectedRows([]);
  };

  const handleRefresh = () => {
    setStatusFilter("1");
  };

  if (currentView === "create-opportunity") {
    return <OpportunityForm onBack={handleBackToDashboard} onNext={handleOpportunityNext} mode="create" />;
  }

  if (currentView === "create-rule") {
    return (
      <CreateRuleForm
        opportunityData={opportunityData}
        onBack={handleRuleBack}
        onSave={handleRuleSave}
        onActivate={handleRuleActivate}
      />
    );
  }

  if (currentView === "edit-opportunity") {
    return (
      <EditOpportunityForm
        opportunityData={selectedOpportunity}
        onBack={handleBackToDashboard}
        onSave={handleEditSave}
      />
    );
  }
  return (
    <>
      <style jsx="true">{`
        .dashboard-container {
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin: 0 0 10px 0;
        }

        .breadcrumb {
          font-size: 14px;
          color: #6c757d;
        }

        .breadcrumb-link {
          color: #007bff;
          text-decoration: none;
          cursor: pointer;
        }

        .breadcrumb-link:hover {
          text-decoration: underline;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .chart-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid #dee2e6;
        }

        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 15px;
        }

        .chart-placeholder {
          height: 150px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          text-align: center;
        }

        .chart-placeholder.bar {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .chart-placeholder.line {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .action-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .button-group {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background-color: #334b71;
          color: white;
        }

        .btn-primary:hover {
          background-color: #2a3f5f;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #5a6268;
          transform: translateY(-1px);
        }

        .btn-refresh {
          background-color: #28a745;
          color: white;
          padding: 8px 12px;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-refresh:hover {
          background-color: #218838;
          transform: rotate(180deg);
        }

        .controls-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .control-label {
          font-size: 14px;
          color: #495057;
          font-weight: 500;
        }

        .control-select,
        .control-input {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
        }

        .control-select:focus,
        .control-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .data-table th,
        .data-table td {
          padding: 12px 8px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .data-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #495057;
          cursor: pointer;
          user-select: none;
          position: relative;
        }

        .data-table th:hover {
          background-color: #e9ecef;
        }

        .data-table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .data-table tbody tr:nth-child(even) {
          background-color: #fdfdfd;
        }

        .sort-indicator {
          margin-left: 5px;
          font-size: 12px;
          color: #6c757d;
        }

        .checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #007bff;
        }

        .opp-code-link {
          color: #007bff;
          text-decoration: none;
          cursor: pointer;
        }

        .opp-code-link:hover {
          text-decoration: underline;
        }

        .segment-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .segment-static {
          background-color: #e3f2fd;
          color: #1976d2;
        }

        .segment-dynamic {
          background-color: #f3e5f5;
          color: #7b1fa2;
        }

        .pagination-section {
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #dee2e6;
          flex-wrap: wrap;
          gap: 15px;
        }

        .pagination-info {
          font-size: 14px;
          color: #6c757d;
        }

        .pagination-controls {
          display: flex;
          gap: 5px;
          align-items: center;
        }

        .pagination-btn {
          padding: 8px 12px;
          border: 1px solid #dee2e6;
          background: white;
          cursor: pointer;
          font-size: 14px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled) {
          background-color: #f8f9fa;
          border-color: #007bff;
        }

        .pagination-btn.active {
          background-color: #007bff;
          color: white;
          border-color: #007bff;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 15px;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .controls-row {
            flex-direction: column;
            align-items: stretch;
          }

          .control-group {
            justify-content: space-between;
          }

          .button-group {
            justify-content: center;
          }

          .pagination-section {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>

      <div className="dashboard-container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Opportunity Dashboard</h1>
          <div className="breadcrumb">
            <span className="breadcrumb-link">Opportunity</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-title">Rule: Manual Lead</div>
            <div className="chart-placeholder">Chart visualization for Manual Lead rule</div>
          </div>
          <div className="chart-card">
            <div className="chart-title">Rule: Paid for X but not for Y Opp</div>
            <div className="chart-placeholder bar">Bar chart showing paid opportunities</div>
          </div>
          <div className="chart-card">
            <div className="chart-title">Rule: No show appointment for X days</div>
            <div className="chart-placeholder line">Line chart for no-show appointments</div>
          </div>
          <div className="chart-card">
            <div className="chart-title">Rule: Customer Special Day</div>
            <div className="chart-placeholder">Customer special day analytics</div>
          </div>
          <div className="chart-card">
            <div className="chart-title">
              Rule: Paid for X Category in Y days and No future appointment in Z days for Category P
            </div>
            <div className="chart-placeholder bar">Complex rule analytics</div>
          </div>
          <div className="chart-card">
            <div className="chart-title">Rule: Cancelled appointment for X days</div>
            <div className="chart-placeholder line">Cancelled appointments trend</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-section">
          <div className="action-buttons">
            <div className="button-group">
              <button className="btn btn-secondary" onClick={handleEditOppName}>
                Edit Opp Name
              </button>
              <button className="btn btn-secondary">Expire Campaign</button>
              <button className="btn btn-primary" onClick={handleCreateNewCampaign}>
                Create New Campaign
              </button>
            </div>
            <button className="btn-refresh" onClick={handleRefresh} title="Refresh">
              ↻
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-section">
          <div className="controls-row">
            <div className="control-group">
              <label className="control-label">Status:</label>
              <select className="control-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="1">Active</option>
                <option value="0">Draft</option>
                <option value="2">Expired</option>
              </select>
            </div>
            <div className="control-group">
              <label className="control-label">Show</label>
              <select
                className="control-select"
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="control-label">entries per page</span>
            </div>
            <div className="control-group">
              <label className="control-label">Search:</label>
              <input
                type="text"
                className="control-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search opportunities..."
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedRows.length === currentData.length && currentData.length > 0}
                    />
                  </th>
                  <th onClick={() => handleSort("oppCode")}>
                    Opp Code
                    <span className="sort-indicator">
                      {sortConfig.key === "oppCode" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("oppName")}>
                    Opp Name
                    <span className="sort-indicator">
                      {sortConfig.key === "oppName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("clinic")}>
                    Clinic
                    <span className="sort-indicator">
                      {sortConfig.key === "clinic" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("fromDate")}>
                    From Date
                    <span className="sort-indicator">
                      {sortConfig.key === "fromDate" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("toDate")}>
                    To Date
                    <span className="sort-indicator">
                      {sortConfig.key === "toDate" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("totalOpportunities")}>
                    Total Opportunities
                    <span className="sort-indicator">
                      {sortConfig.key === "totalOpportunities" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("noOfOpenOpportunities")}>
                    No.Of Open Opportunities
                    <span className="sort-indicator">
                      {sortConfig.key === "noOfOpenOpportunities" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("noOfClosedOpportunities")}>
                    No.Of Closed Opportunities
                    <span className="sort-indicator">
                      {sortConfig.key === "noOfClosedOpportunities"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("noOfConvertedOutOfClosed")}>
                    No.Of Converted out of Closed
                    <span className="sort-indicator">
                      {sortConfig.key === "noOfConvertedOutOfClosed"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("segmentType")}>
                    Segment Type
                    <span className="sort-indicator">
                      {sortConfig.key === "segmentType" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedRows.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                      />
                    </td>
                    <td>
                      <a href="#" className="opp-code-link">
                        {item.oppCode}
                      </a>
                    </td>
                    <td>{item.oppName}</td>
                    <td>{item.clinic}</td>
                    <td>{item.fromDate}</td>
                    <td>{item.toDate}</td>
                    <td>{item.totalOpportunities}</td>
                    <td>{item.noOfOpenOpportunities}</td>
                    <td>{item.noOfClosedOpportunities}</td>
                    <td>{item.noOfConvertedOutOfClosed}</td>
                    <td>
                      <span className={`segment-badge segment-${item.segmentType.toLowerCase()}`}>
                        {item.segmentType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-section">
            <div className="pagination-info">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedData.length)} of{" "}
              {filteredAndSortedData.length} entries
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalPages > 5 && <span className="pagination-btn">...</span>}
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default OpportunityDashboard
