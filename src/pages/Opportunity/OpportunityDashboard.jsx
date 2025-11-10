"use client"

import { useState, useEffect, useMemo } from "react";
import OpportunityForm from "./OpportunityForm";
import CreateRuleForm from "./CreateRuleForm";
import EditOpportunityForm from "./EditOpportunityForm";
import { API_BASE_URL } from "../../config";
import OpportunityDetails from "./OpportunityDetails";
import { useNavigate } from "react-router-dom";

/* charts */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";

/* ---- Color system (matched to your screenshot) ---- */
const COLORS = {
  total: "#334b71",     // deep navy
  open: "#cc6b5c",      // warm coral
  wip: "#F3DCB0",       // soft sand
  closed: "#8da0b8",    // slate
  converted: "#A7D1CD", // teal-ish
  grid: "#eef2f7",
  axis: "#6e7b8f",
};

/* -------------------- STATIC CHART DATA -------------------- */
const STATUS_DATA_MANUAL_LEAD = [
  { label: "Total", value: 10, fill: COLORS.total },
  { label: "Open", value: 4, fill: COLORS.open },
  { label: "WIP", value: 1, fill: COLORS.wip },
  { label: "Closed", value: 3, fill: COLORS.closed },
  { label: "Converted", value: 2, fill: COLORS.converted },
];

const STATUS_DATA_PAID_X_NOT_Y = [
  { label: "Total", value: 285, fill: COLORS.total },
  { label: "Open", value: 235, fill: COLORS.open },
  { label: "WIP", value: 20, fill: COLORS.wip },
  { label: "Closed", value: 20, fill: COLORS.closed },
  { label: "Converted", value: 10, fill: COLORS.converted },
];

const STATUS_DATA_NO_SHOW = [
  { label: "Total", value: 9, fill: COLORS.total },
  { label: "Open", value: 9, fill: COLORS.open },
  { label: "WIP", value: 0, fill: COLORS.wip },
  { label: "Closed", value: 0, fill: COLORS.closed },
  { label: "Converted", value: 6, fill: COLORS.converted },
];

const STATUS_DATA_PAID_X_CAT = [
  { label: "Total", value: 6, fill: COLORS.total },
  { label: "Open", value: 3, fill: COLORS.open },
  { label: "WIP", value: 0, fill: COLORS.wip },
  { label: "Closed", value: 3, fill: COLORS.closed },
  { label: "Converted", value: 3, fill: COLORS.converted },
];

const STACKED_CUSTOMER_SPECIAL_DAY = [
  { name: "Bright-00112", Total: 120, Open: 60, WIP: 40, Closed: 20, Converted: 0 },
];

const STACKED_CANCELLED_APPT = [
  { name: "Bright-00111", Total: 10,   Open: 4,  WIP: 2,  Closed: 2,  Converted: 2 },
  { name: "Bright-00187", Total: 20,   Open: 8,  WIP: 4,  Closed: 4,  Converted: 4 },
  { name: "Bright-00195", Total: 30,  Open: 10, WIP: 0,  Closed: 15, Converted: 5 },
  { name: "Bright-00217", Total: 20,   Open: 8,  WIP: 4,  Closed: 4,  Converted: 4 },
];

/* Small helpers */
const n = (v) => (Number.isFinite(+v) ? +v : 0);

/** Convert Date | 'yyyy-MM-dd' | 'dd/MM/yyyy' -> 'yyyy-MM-dd' */
const toISODateOnly = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
    if (Number.isNaN(+d)) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;               // already yyyy-MM-dd
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);           // dd/MM/yyyy
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(s);                                     // last resort
  return Number.isNaN(+dt) ? "" : toISODateOnly(dt);
};

const OpportunityDashboard = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedOppDetails, setSelectedOppDetails] = useState(null);
  const [opportunityData, setOpportunityData] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("1");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  useEffect(() => {
    const fetchOpportunities = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/Opportunity/LoadOpprotunityList/${statusFilter}`,
          { credentials: "include" }
        );
        const data = await response.json();
        setOpportunityData(Array.isArray(data) ? data : (data ? [data] : []));
      } catch (error) {
        console.error("Failed to load opportunities:", error);
        setOpportunityData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOpportunities();
  }, [statusFilter]);

  const data = currentView === "dashboard" ? opportunityData : [];

  /**
   * Load details. If API returns empty/invalid, show a local fallback panel with:
   * Opportunity Code, Opportunity Name, Rule Details, X
   */
  const handleViewDetails = async (row) => {
    try {
      const payload = {
        oppCode: row?.oppCode,
        fromDate: toISODateOnly(row?.fromDate),
        toDate:   toISODateOnly(row?.toDate),
      };

      const response = await fetch(`${API_BASE_URL}/api/Opportunity/LoadOppDetails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      let resData = null;
      try { resData = await response.json(); } catch { resData = null; }

      const first = Array.isArray(resData) ? resData[0] : null;

      if (first && Object.keys(first || {}).length > 0) {
        setSelectedOppDetails(first);
      } else {
        // ---- Fallback details (requested behavior) ----
        setSelectedOppDetails({
          __fallback: true,
          oppCode: row?.oppCode || "",
          oppName: row?.oppName || "",
          // Fallback label/text — adjust as needed:
          ruleDetails: "Cancelled appointment for X days",
          x: "7",
        });
      }
      setCurrentView("details");
    } catch (error) {
      console.error("Failed to load opportunity details:", error);
      // On hard error, still show fallback with whatever we know.
      setSelectedOppDetails({
        __fallback: true,
        oppCode: row?.oppCode || "",
        oppName: row?.oppName || "",
        ruleDetails: "Cancelled appointment for X days",
        x: "7",
      });
      setCurrentView("details");
      showToast("Failed to load details", "error");
    }
  };

  const handleCreateNewCampaign = () => navigate("/opportunity/create");

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) => {
      const s = searchTerm.toLowerCase();
      return (
        (item.oppCode?.toLowerCase().includes(s) || "") ||
        (item.oppName?.toLowerCase().includes(s) || "") ||
        (item.centerName?.toLowerCase().includes(s) || "") ||
        (item.segmentType?.toLowerCase().includes(s) || "")
      );
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
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
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
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

  const handleEditOppName = () => {
    if (selectedRows.length === 0) return alert("Please select at least one opportunity to edit");
    if (selectedRows.length > 1) return alert("Please select only one opportunity to edit");

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
    setSelectedOppDetails(null);
  };

  const handleOpportunityNext = () => setCurrentView("create-rule");
  const handleRuleBack = () => setCurrentView("create-opportunity");
  const handleRuleSave = () => alert("Rule saved successfully!");
  const handleRuleActivate = () => { alert("Rule activated successfully!"); setCurrentView("dashboard"); };

  const handleExpireCampaign = async () => {
    if (selectedRows.length === 0) {
      showToast("Please select at least one opportunity to expire", "error");
      return;
    }
    const confirmExpire = window.confirm("Are you sure you want to expire the selected opportunities?");
    if (!confirmExpire) return;

    const payload = {
      expireOpp: "Expired by user",
      oppCodeListJson: selectedRows.map((code) => ({ oppCode: code })),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/Opportunity/ExpireOpportunity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to expire opportunity");

      showToast("Selected opportunities expired successfully!", "success");
      setSelectedRows([]);
      setStatusFilter("2");
    } catch (error) {
      console.error("Expire error:", error);
      showToast("Error expiring opportunities.", "error");
    }
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

  const handleRefresh = () => setStatusFilter("1");

  // Optional alternate navigation-based flow (kept for reference)
  const handleOpportunityClick = (oppCode, fromDate, toDate) => {
    const now = new Date();
    const from = fromDate ? fromDate : toISODateOnly(new Date(now.setDate(now.getDate() - 13)));
    const to   = toDate   ? toDate   : toISODateOnly(new Date());
    navigate(`/opportunity/details/${oppCode}`, {
      state: { fromDate: toISODateOnly(from), toDate: toISODateOnly(to) },
    });
  };

  /* -------------------- CHART CARDS -------------------- */
  const SimpleBarCard = ({ title, dataset }) => (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={dataset} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: COLORS.axis, fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {dataset.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const StackedByClinicCard = ({ title, dataset }) => (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={dataset} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: COLORS.axis, fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 12 }} />
            <Legend verticalAlign="top" height={24} />
            <Tooltip />
            <Bar dataKey="Total" stackId="a" fill={COLORS.total} />
            <Bar dataKey="Open" stackId="a" fill={COLORS.open} />
            <Bar dataKey="WIP" stackId="a" fill={COLORS.wip} />
            <Bar dataKey="Closed" stackId="a" fill={COLORS.closed} />
            <Bar dataKey="Converted" stackId="a" fill={COLORS.converted} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  /* -------------------- VIEW SWITCHERS -------------------- */
  if (currentView === "details" && selectedOppDetails) {
    // If we set a fallback object, render the simple block here
    if (selectedOppDetails.__fallback) {
      return (
        <>
          <style jsx="true">{`
            .fallback-wrap { padding: 20px; }
            .fallback-card {
              background: #fff;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 18px;
              box-shadow: 0 2px 6px rgba(0,0,0,.06);
              max-width: 720px;
              margin: 0 auto;
            }
            .fb-row { display: grid; grid-template-columns: 220px 1fr; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #eee; }
            .fb-row:last-child { border-bottom: 0; }
            .fb-key { color: #374151; font-weight: 600; }
            .fb-val { color: #111827; }
            .fb-ttl { font-size: 18px; font-weight: 700; margin: 0 0 14px; color: #1f2937; }
            .fb-actions { margin-top: 16px; display: flex; gap: 10px; }
            .btn { padding: 10px 16px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
            .back { background: #6b7280; color: #fff; }
          `}</style>
          <div className="fallback-wrap">
            <div className="fallback-card">
              <div className="fb-ttl">Opportunity Details</div>
              <div className="fb-row">
                <div className="fb-key">Opportunity Code :</div>
                <div className="fb-val">{selectedOppDetails.oppCode || "-"}</div>
              </div>
              <div className="fb-row">
                <div className="fb-key">Opportunity Name :</div>
                <div className="fb-val">{selectedOppDetails.oppName || "-"}</div>
              </div>
              <div className="fb-row">
                <div className="fb-key">Rule Details :</div>
                <div className="fb-val">{selectedOppDetails.ruleDetails || "-"}</div>
              </div>
              <div className="fb-row">
                <div className="fb-key">X :</div>
                <div className="fb-val">{selectedOppDetails.x || "-"}</div>
              </div>

              <div className="fb-actions">
                <button className="btn back" onClick={handleBackToDashboard}>Back</button>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Otherwise render your full details component
    return <OpportunityDetails details={selectedOppDetails} onBack={handleBackToDashboard} />;
  }

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

  /* -------------------- DASHBOARD -------------------- */
  return (
    <>
      <style jsx="true">{`
        .dashboard-container { min-height: 100vh; }
        .page-header { margin-bottom: 30px; }
        .page-title { font-size: 24px; font-weight: 600; color: #333; margin: 0 0 10px 0; }
        .breadcrumb { font-size: 14px; color: #6c757d; }
        .loader-wrapper {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(255, 255, 255, 0.7); z-index: 9998; display: flex; justify-content: center; align-items: center;
        }
        .data-table th, .data-table td{white-space: nowrap;font-size: 13px;}
        .loader { border: 6px solid #f3f3f3; border-top: 6px solid #334b71; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .breadcrumb-link { color: #334b71; text-decoration: none; cursor: pointer; }
        .breadcrumb-link:hover { text-decoration: underline; }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .chart-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid #dee2e6; }
        .chart-title { font-size: 12px; line-height: 18px; font-weight: 600; color: #333; margin-bottom: 15px; }

        .action-section { background: white; border-radius: 0; padding: 0; box-shadow: none; margin-bottom: 20px; }
        .action-buttons { display: flex; gap: 15px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .button-group { display: flex; gap: 15px; flex-wrap: wrap; }
        .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; }
        .btn-primary { background-color: #334b71; color: white; }
        .btn-primary:hover { background-color: #2a3f5f; transform: translateY(-1px); }
        .btn-secondary { background-color: #6c757d; color: white; }
        .btn-secondary:hover { background-color: #5a6268; transform: translateY(-1px); }
        .btn-refresh { background-color: #28a745; color: white; padding: 8px 12px; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
        .btn-refresh:hover { background-color: #218838; transform: rotate(180deg); }

        .controls-section { background: white; border-radius: 0; padding: 20px 0; box-shadow: none; margin-bottom: 20px; }
        .controls-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .control-group { display: flex; align-items: center; gap: 10px; }
        .control-label { font-size: 14px; color: #495057; font-weight: 500; }
        .control-select, .control-input { padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; }
        .control-select:focus, .control-input:focus { outline: none; border-color: #334b71; box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25); }

        .table-container { background: white; box-shadow: none; border-radius:0; overflow: hidden; }
        .table-wrapper { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 15px; line-height:20px; }
        .data-table th, .data-table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .data-table th { background-color: #f8f9fa; font-weight: 600; color: #495057; cursor: pointer; user-select: none; }
        .data-table th:hover { background-color: #e9ecef; }
        .data-table tbody tr:hover { background-color: #f8f9fa; }
        .data-table tbody tr:nth-child(even) { background-color: #fdfdfd; }
        .sort-indicator { margin-left: 5px; font-size: 12px; color: #6c757d; }
        .checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #334b71; }
        .opp-code-link { color: #334b71; text-decoration: none; cursor: pointer; background:none; border: none;white-space:nowrap; font-weight:600 }
        .opp-code-link:hover { text-decoration: underline; }
        .segment-badge { padding: 4px 8px; border-radius: 12px; font-size: 14px; font-weight: 500; }
        .segment-static { background-color: #e3f2fd; color: #1976d2; }
        .segment-dynamic { background-color: #f3e5f5; color: #7b1fa2; }

        .pagination-section { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #dee2e6; flex-wrap: wrap; gap: 15px; }
        .pagination-info { font-size: 14px; color: #6c757d; }
        .pagination-controls { display: flex; gap: 5px; align-items: center; }
        .pagination-btn { padding: 8px 12px; border: 1px solid #dee2e6; background: white; cursor: pointer; font-size: 14px; border-radius: 4px; transition: all 0.2s ease; }
        .pagination-btn:hover:not(:disabled) { background-color: #f8f9fa; border-color: #334b71; }
        .pagination-btn.active { background-color: #334b71; color: white; border-color: #334b71; }
        .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 768px) {
          .dashboard-container { padding: 15px; }
          .charts-grid { grid-template-columns: 1fr; }
          .controls-row { flex-direction: column; align-items: stretch; }
          .control-group { justify-content: space-between; }
          .button-group { justify-content: center; }
          .pagination-section { flex-direction: column; text-align: center; }
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
          <SimpleBarCard title="Rule: Manual Lead" dataset={STATUS_DATA_MANUAL_LEAD} />
          <SimpleBarCard title="Rule: Paid for X but not for Y Opp" dataset={STATUS_DATA_PAID_X_NOT_Y} />
          <SimpleBarCard title="Rule: No show appointment for X days" dataset={STATUS_DATA_NO_SHOW} />
          <StackedByClinicCard title="Rule: Customer Special Day" dataset={STACKED_CUSTOMER_SPECIAL_DAY} />
          <SimpleBarCard title="Rule: Paid for X Category in Y days and No future appointment in Z days for Category P" dataset={STATUS_DATA_PAID_X_CAT} />
          <StackedByClinicCard title="Rule: Cancelled appointment for X days" dataset={STACKED_CANCELLED_APPT} />
        </div>

        {/* Actions */}
        <div className="action-section">
          <div className="action-buttons">
            <div className="button-group">
              <button className="btn btn-secondary" onClick={handleEditOppName}>Edit Opp Name</button>
              <button className="btn btn-secondary" onClick={handleExpireCampaign}>Expire Campaign</button>
              <button className="btn btn-primary" onClick={handleCreateNewCampaign}>Create New Campaign</button>
            </div>
            <button className="btn-refresh" onClick={handleRefresh} title="Refresh">↻</button>
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
                onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
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

        {/* Table */}
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
                        ? sortConfig.direction === "asc" ? "↑" : "↓" : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("noOfConvertedOutOfClosed")}>
                    No.Of Converted out of Closed
                    <span className="sort-indicator">
                      {sortConfig.key === "noOfConvertedOutOfClosed"
                        ? sortConfig.direction === "asc" ? "↑" : "↓" : "↕"}
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
                  <tr key={item.recID || item.oppCode}>
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedRows.includes(item.recID || item.oppCode)}
                        onChange={() => handleSelectRow(item.recID || item.oppCode)}
                      />
                    </td>
                    <td>
                      <button
                        className="opp-code-link"
                        onClick={() => handleViewDetails(item)}    // ← fetch details, show fallback if none
                      >
                        {item.oppCode}
                      </button>
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
                      <span className={`segment-badge segment-${(item.segmentType || "").toLowerCase()}`}>
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
              Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
            </div>
            <div className="pagination-controls">
              <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="pagination-btn">...</span>}
              <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: toast.type === "success" ? "#28a745" : "#dc3545",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "4px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            zIndex: 9999,
          }}
        >
          {toast.message}
        </div>
      )}

      {loading && (
        <div className="loader-wrapper">
          <div className="loader"></div>
        </div>
      )}
    </>
  );
};

export default OpportunityDashboard;
