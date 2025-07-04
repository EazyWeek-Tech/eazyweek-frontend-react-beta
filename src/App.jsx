import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./components/Login";
import CaseManagement from "./pages/CaseManagement";
import Appointment from "./pages/Appointment";
import Invoice from "./pages/Invoice";
import Dashboard from "./pages/Dashboard";
import CaseDetailsPage from "./pages/CaseManagement/CaseDetails";
import Customer from "./pages/Customer";
/* import CustomerMaster from "./pages/Masters/CustomerMaster";
import DoctorMaster from "./pages/Masters/DoctorMaster";
import ClinicMaster from "./pages/Masters/ClinicMaster";
import DepartmentMaster from "./pages/Masters/DepartmentMaster";
import ManagerMaster from "./pages/Masters/ManagerMaster";
import SegmentMapping from "./pages/Masters/SegmentMapping";
import EmployeeMaster from "./pages/Masters/EmployeeMaster";
import ProductsMaster from "./pages/Masters/ProductsMaster";
import ItemCategoryMaster from "./pages/Masters/ItemCategoryMaster";
import PurchaseCategoryMaster from "./pages/Masters/PurchaseCategoryMaster";
import ServiceMaster from "./pages/Masters/ServiceMaster"; */

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(
    JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user"))
  );

  const navigate = useNavigate();


  const handleLoginSuccess = (user) => {
    setUser(user);
    navigate("/dashboard", { replace: true }); // ✅ redirect to /cases
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
     {/*  <Route path="/customer" element={<Customer />} /> */}
     

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
    {/*  <Route path="/masters/customers" element={<CustomerMaster />} />
          <Route path="/masters/practitioners" element={<DoctorMaster />} />
          <Route path="/masters/clinic" element={<ClinicMaster />} />
          <Route path="/masters/department" element={<DepartmentMaster />} />
          <Route path="/masters/managers" element={<ManagerMaster />} />
          <Route path="/masters/segments" element={<SegmentMapping />} />
          <Route path="/masters/employees" element={<EmployeeMaster />} />
          <Route path="/masters/product" element={<ProductsMaster />} />
          <Route path="/masters/service" element={<ServiceMaster />} />
          <Route path="/masters/item-category" element={<ItemCategoryMaster />} />
          <Route path="/masters/purchase-category" element={<PurchaseCategoryMaster />} /> */}



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
