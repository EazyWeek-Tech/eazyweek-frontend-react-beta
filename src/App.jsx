import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./components/Login";
import CaseManagement from "./pages/CaseManagement";
import Appointment from "./pages/Appointment";
import Invoice from "./pages/Invoice";
import Dashboard from "./pages/Dashboard";
import CaseDetailsPage from "./pages/CaseManagement/CaseDetails";

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(
    JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user"))
  );

  const navigate = useNavigate();

  const API_BASE_URL = "https://insightweb-hkhqgch8hadvcbb0.uaenorth-01.azurewebsites.net";

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
      const res = await fetch(`${API_BASE_URL}/api/Employees`, {
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
        `${API_BASE_URL}/api/CaseOperation/CaseDB`,
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
    navigate("/dashboard");
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.clear();
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Add Routes WITHOUT Sidebar + Header */}
      <Route path="/appointment" element={<Appointment />} />
      <Route path="/invoice" element={<Invoice />} />

      {/*Add Routes WITH Sidebar + Header */}
      <Route
        path="/*"
        element={
          <div className={`ot-wrapper ${isSidebarCollapsed ? "collapsed" : ""}`}>
            <Sidebar collapsed={isSidebarCollapsed} />
            <section className="rhs-sect">
              <Header onToggleSidebar={toggleSidebar} onLogout={handleLogout} />
              <div className="home-sect">
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
    <Route path="cases" element={<CaseManagement />} />
    <Route path="/cases/:caseNumber" element={<CaseDetailsPage />} />

    <Route index element={<Navigate to="/dashboard" replace />} /> {/* ← This handles "/" */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </section>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
