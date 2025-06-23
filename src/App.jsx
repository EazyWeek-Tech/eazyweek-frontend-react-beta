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

  const handleLoginSuccess = (user) => {
    setUser(user);
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
