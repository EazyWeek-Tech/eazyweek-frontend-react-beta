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
import CustomerMaster from "./pages/Masters/CustomerMaster";
import DoctorMaster from "./pages/Masters/DoctorMaster";
import ClinicMaster from "./pages/Masters/ClinicMaster";
import DepartmentMaster from "./pages/Masters/DepartmentMaster";
import ManagerMaster from "./pages/Masters/ManagerMaster";
import SegmentMapping from "./pages/Masters/SegmentMapping";
import EmployeeMaster from "./pages/Masters/EmployeeMaster";
import ProductsMaster from "./pages/Masters/ProductsMaster";
import ItemCategoryMaster from "./pages/Masters/ItemCategoryMaster";
import PurchaseCategoryMaster from "./pages/Masters/PurchaseCategoryMaster";
import ServiceMaster from "./pages/Masters/ServiceMaster";
import OpportunityDashboard from "./pages/Opportunity/OpportunityDashboard";
import EInvoiceDashboard from "./pages/Einvoice/EInvoiceDashboard";
import { CourtesyCallDashboard } from "./pages/CourtesyCall";
import DetailedReport from "./pages/CourtesyCall/DetailedReport";
import AuditDashboard from "./pages/Audit";
import InvoicesTab from "./pages/Customer/CustomerDetails/InvoiceTab";
import InvoiceDetails from "./pages/Customer/CustomerDetails/InvoiceDetails";
import SegmentAddForm from "./pages/Masters/SegmentAddForm";
import DashboardPage from "./pages/Dashboard";
import CourtesyCallDetails from "./pages/CourtesyCall/CourtesyCallDetails";
import EInvoiceDetailedReport from "./pages/Einvoice/EInvoiceDetailedReport";
import OpportunityDetails from "./pages/Opportunity/OpportunityDetails";
import OpportunityForm from "./pages/Opportunity/OpportunityForm";
import OppCustomerDetails from "./pages/Opportunity/OppCustomerDetails"; 
import ManualOppCustomerDetails from "./pages/Opportunity/ManualOppCustomerDetails";
import ConsultationForm from "./pages/EMR/Consultation/ConsultationForm";
import GuestConsentForm from "./pages/EMR/GuestConsentForm/GuestConsentForm";
import ConsultationHistory from "./pages/EMR/Consultation/ConsultationHistory";
import ItemCategoryCreateTabs from "./pages/Masters/ItemCategoryCreateTabs";
import AuditCreateDashboard from "./pages/Audit/AuditCreateDashboard";
import CaseHierarchyDashboard from "./pages/CaseManagement/CaseHierarchyDashboard";
import CaseHierarchyCreate from "./pages/CaseManagement/CaseHierarchyCreate";
import AuditCreate from "./pages/Audit/AuditCreate";
import AuditSummaryReport from "./pages/Audit/AuditSummaryReport";
import AuditDetailedReport from "./pages/Audit/AuditDetailedReport";
import OpportunityDetailedReport from "./pages/Opportunity/OpportunityDetailedReport";
import OpportunitySummaryReport from "./pages/Opportunity/OpportunitySummaryReport";
import CaseDetailedReport from "./pages/CaseManagement/CaseDetailedReport";
import AuditForm from "./pages/Audit/AuditForm";
import CaseCategoryMaster from "./pages/CaseManagement/CaseCategoryMaster";
import CreateCaseCategoryMapping from "./pages/CaseManagement/CreateCaseCategoryMapping";
import CreateCaseCategory from "./pages/CaseManagement/CreateCaseCategory";
import CaseCategoryMappingDashboard from "./pages/CaseManagement/CaseCategoryMappingDashboard";
import AuditDraftDetails from "./pages/Audit/AuditDraftDetails";

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
      <Route path="/customer" element={<Customer />} /> 
       <Route path="/consultation" element={<ConsultationForm />} /> 
         <Route path="/history" element={<GuestConsentForm />} />
        <Route path="/consultation/history" element={<ConsultationHistory />} />
       <Route path="/invoices" element={<InvoicesTab />} />
    <Route path="/invoice-details/:invoiceNum" element={<InvoiceDetails />} />

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
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="/segmentaddform/:employeeCode" element={<SegmentAddForm />} />

    <Route path="cases" element={<CaseManagement />} />
    <Route path="/cases/:caseNumber" element={<CaseDetailsPage />} />
    <Route path="/masters/customers" element={<CustomerMaster />} />
    <Route path="/case-detailed-report" element={<CaseDetailedReport />} />
          <Route path="/masters/practitioners" element={<DoctorMaster />} />
          <Route path="/masters/clinic" element={<ClinicMaster />} />
          <Route path="/masters/department" element={<DepartmentMaster />} />
          <Route path="/masters/managers" element={<ManagerMaster />} />
          <Route path="/masters/segments" element={<SegmentMapping />} />
          <Route path="/masters/employees" element={<EmployeeMaster />} />
          <Route path="/masters/product" element={<ProductsMaster />} />
          <Route path="/masters/service" element={<ServiceMaster />} />
          <Route path="/masters/item-category" element={<ItemCategoryMaster />} />
          <Route path="/masters/purchase-category" element={<PurchaseCategoryMaster />} />
           <Route path="/opportunity" element={<OpportunityDashboard />} />
            <Route path="/einvoice" element={<EInvoiceDashboard />} />
            <Route path="/einvoice/detailed" element={<EInvoiceDetailedReport />} />
             <Route path="/courtesy-call" element={<CourtesyCallDashboard />} />
             <Route path="/courtesy-call/report" element={<DetailedReport />} />
             <Route path="/audit" element={<AuditDashboard />} />
                  <Route path="/opportunity/details/:oppCode" element={<OpportunityDetails />} />
                  <Route path="/opportunity/create" element={<OpportunityForm mode="create" />} />
                  <Route path="/opportunity/:oppCode/customer/:custId" element={<OppCustomerDetails />} />
                  <Route path="/opportunity/:oppCode/manual/:custId" element={<ManualOppCustomerDetails />} />
                  <Route path="/create-category" element={<ItemCategoryCreateTabs />} />
                  <Route path="/auditsegmentview" element={<AuditCreateDashboard />} />
                  <Route path="/courtesy-call/details" element={<CourtesyCallDetails />} />
                  <Route path="/case-hierarchy" element={<CaseHierarchyDashboard />} />
                  <Route path="/case-hierarchy/create" element={<CaseHierarchyCreate />} />
                  <Route path="/case-hierarchy/edit/:recId" element={<CaseHierarchyCreate />} />
<Route path="/audit/create" element={<AuditCreate />} />
<Route path="/audit/summary" element={<AuditSummaryReport />} />
<Route path="/audit/detailed" element={<AuditDetailedReport />} />
<Route path="/opportunity/detailed" element={<OpportunityDetailedReport />} />
<Route path="/opportunity/summary" element={<OpportunitySummaryReport />} />
<Route path="/audit/:segment/form" element={<AuditForm />} />
<Route path="/case-categories" element={<CaseCategoryMaster />} />
<Route path="/create-categories-mapping" element={<CreateCaseCategoryMapping />} />
<Route path="/create-case-category" element={<CreateCaseCategory />} />
<Route path="/categories-mapping" element={<CaseCategoryMappingDashboard />} />

<Route path="/audit/:auditNo" element={<AuditDraftDetails />} />





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
