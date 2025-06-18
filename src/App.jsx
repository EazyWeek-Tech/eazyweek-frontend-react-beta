import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardOverview from "./components/DashboardOverview";
import FilterBar from "./components/FilterBar";
import CreateCaseModel from "./components/CreateCaseModel";
import CaseTable from "./components/CaseTable";
import CaseDetails from "./components/CaseDetails";
import Login from "./components/Login";

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caseRecords, setCaseRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    owner: "",
    priority: "",
    assignTo: "",
    status: "",
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [highlightCaseNo, setHighlightCaseNo] = useState(null);
  const [user, setUser] = useState(
    JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user"))
  );

  const navigate = useNavigate();

  const handleLoginSuccess = (user) => {
    setUser(user);
    navigate("/cases", { replace: true }); // ✅ redirect to /cases
  };

  useEffect(() => {
    if (user) {
      fetchCases({ owner: "", priority: "", assignTo: "", status: "" });
      fetchEmployees();
    }
  }, [user]);

  const applyClientFilters = (records, filters) => {
    return records.filter((rec) => {
      return (
        (!filters.owner || rec.createdby === filters.owner) &&
        (!filters.priority || rec.priority === filters.priority) &&
        (!filters.assignTo || rec.assignedto === filters.assignTo) &&
        (!filters.status || rec.status === filters.status)
      );
    });
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("https://localhost:44317/api/Employees", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      const filtered = data.filter(
        (emp) => emp.employeeCode && emp.employeeName !== "Assign To"
      );
      setEmployees(filtered);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchCases = async (filters) => {
    try {
      const res = await fetch(
        "https://localhost:44317/api/CaseOperation/CaseDB",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filters),
        }
      );
      const data = await res.json();
      console.log('case data')
      console.log(data)
      const mapped = data.map((item) => ({
        caseno: item.caseNO,
        casetitle: item.caseTitle ?? "-",
        status: item.status,
        priority: item.priority ?? "-",
        category: item.category,
        subCategory: item.subCategory,
        subSubCategory: item.subSubCategory,
        subSubSubCategory: item.subSubSubCategory,
        assignedto: item.assignTo?.trim() || "-",
        createdby: item.owner || "-",
        createddate:
          item.createdDate && item.createdDate !== "0001-01-01T00:00:00"
            ? new Date(item.createdDate).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "-",
      }));
      mapped.sort(
        (a, b) => new Date(b.createddate) - new Date(a.createddate)
      );
      setCaseRecords(mapped);
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const handleCreateCase = async (newCase) => {
    setToastMessage(`Case ${newCase.caseno} created successfully`);
    setHighlightCaseNo(newCase.caseno);
    setIsModalOpen(false);
    await fetchCases(filters);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      setToastMessage(null);
      setHighlightCaseNo(null);
    }, 4000);
  };

  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className={`ot-wrapper ${isSidebarCollapsed ? "collapsed" : ""}`}>
      <Sidebar collapsed={isSidebarCollapsed} />
      <section className="rhs-sect">
        <Header
          onToggleSidebar={toggleSidebar}
          onLogout={() => {
            setUser(null);
            sessionStorage.clear();
            localStorage.clear();
            navigate("/login", { replace: true });
          }}
        />
        <div className="home-sect">
          <Routes>
            <Route path="/" element={<Navigate to="/cases" replace />} />
            <Route
              path="/cases"
              element={
                <>
                  <div className="pg-head">
                    <h2 className="pg-ttl">Cases</h2>
                  </div>
                  <DashboardOverview />
                  <div className="pgcases-out">
                    <FilterBar
                      onCreateCase={() => setIsModalOpen(true)}
                      onFilter={setFilters}
                      employeeList={employees}
                    />
                  </div>
                  <CaseTable
                    records={applyClientFilters(caseRecords, filters)}
                    highlightCaseNo={highlightCaseNo}
                  />
                </>
              }
            />
            <Route path="/cases/:caseNumber" element={<CaseDetails />} />
            <Route path="/login" element={<Navigate to="/cases" replace />} />
          </Routes>
        </div>
      </section>

      <CreateCaseModel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCase}
      />

      {toastMessage && (
        <div className="toast-notification">{toastMessage}</div>
      )}

      <style>{`
        .toast-notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #4caf50;
          color: white;
          padding: 12px 16px;
          border-radius: 4px;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 1000;
        }
        .highlight-row {
          background-color: #fffbcc !important;
          transition: background-color 0.5s ease;
        }
      `}</style>
    </div>
  );
}

export default AppWrapper;
