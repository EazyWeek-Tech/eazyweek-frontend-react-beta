import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import { useSessionTimeout } from "./hooks/useSessionTimeout";

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
import LoyaltyProgramConfig from "./pages/Loyalty/LoyaltyProgramConfig";
import LoyaltyListing from "./pages/Loyalty/LoyaltyListing";
import MembershipConfig from "./pages/Membership/MembershipConfig";
import DiscountManagement from "./pages/Discount/DiscountManagement";
import DiscountConfig from "./pages/Discount/DiscountConfig";
import DiscountList from "./pages/Discount/DiscountList";
import { AdvancedFormBuilder } from "./pages/EMR/AdvanceFormBuilder/AdvancedFormBuilder";
import LaserSessionCF from "./pages/CustomForms/LaserSession/LaserSessionCF";
import HyaluronidaseCF from "./pages/CustomForms/Hyaluronidase/HyaluronidaseCF";
import InjectableTreatment from "./pages/CustomForms/InjectableTreatment/InjectableTreatment";
import LaserSessionForm from "./pages/CustomForms/LaserSession/LaserSessionForm";
import ConsultationAssessmentForm from "./pages/CustomForms/InjectableTreatment/ConsultationAssessmentForm";
import HyaluronidaseTreatmentForm from "./pages/CustomForms/Hyaluronidase/HyaluronidaseTreatmentForm";
import GeneralForm from "./pages/CustomForms/GenralForm/GeneralForm";
import InjectablesConsentForm from "./pages/CustomForms/Antiaging/InjectablesConsentForm";
import GetFormByDetails from "./pages/EMR/AdvanceFormBuilder/GetFormByDetails";
import AddLeadCustomerList from "./pages/Opportunity/AddLeadCustomerList";
import LaserConsentForm from "./pages/CustomForms/LaserSession/LaserSessionCF";
import DispositionMaster from "./pages/Opportunity/DispositionMaster";
import DispositionMappingCreate from "./pages/Opportunity/DispositionMappingCreate";
import ManualLeadEdit from "./pages/Opportunity/ManualLeadEdit";
import LTRFunnelDashboard from "./pages/Opportunity/LTRFunnelDashboard";
import ExternalLeadForm from "./pages/Opportunity/ExternalLeadForm";
import NoShowEntryDetails from "./pages/Opportunity/NoShowEntryDetails";
import CancelledEntryDetails from "./pages/Opportunity/CancelledEntryDetails";
import OppUploader from "./pages/Opportunity/OppUploader";
import OnDemandTriggers from "./pages/OnDemand/OnDemandTriggers";
import ResetPassword from "./pages/ResetPassword"; 
import FirstLoginModal from "./components/FirstLoginModal";
import PackageMaster from "./pages/Masters/PackageMaster";
import LegalEntitySetup from "./pages/Settings/LegalEntitySetup";
import CentreSetup from "./pages/Settings/CentreSetup";
import OrgHierarchy from "./pages/Settings/OrgHierarchy";
import ZoneSetup from "./pages/Settings/ZoneSetup";
import FormBuilder from "./pages/EMR/FormBuilder";
import FormList from "./pages/EMR/FormList";
import CreateCampaign from "./pages/Opportunity/CreateCampaign";
import CampaignDetails from "./pages/Opportunity/CampaignDetails";
import MasterLeadForm from "./pages/Opportunity/MasterLeadForm";
import ProductMaster from "./pages/Masters/ProductMaster";
import ShiftMaster from "./pages/Workforce/ShiftMaster";
import RosterView from "./pages/Workforce/RosterView";
import MyShift from "./pages/Workforce/MyShift";
import AppointmentDashboard from "./pages/Appointment/AppointmentDashboard";
import InvoiceDashboard from "./pages/Invoice/InvoiceDashboard";
import FeatureGate from "./components/FeatureGate";
import { PermissionProvider } from "./pages/Settings/usePermissions";
import SecuritySettings from "./pages/Masters/SecuritySettings";

// 🔹 NEW: helper to bootstrap user from storage OR from ?token=
const getInitialUser = () => {
  try {
    const stored =
     localStorage.getItem("user") || sessionStorage.getItem("user") 
    if (stored) {
      return JSON.parse(stored);
    }

    // Check for SSO token in query string (coming from Insight)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      const ssoUser = {
        isSso: true,
        token,
      };

      localStorage.setItem("ssoToken", token);
localStorage.setItem("user", JSON.stringify(ssoUser));


      // Clean the URL (remove ?token=...)
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());

      return ssoUser;
    }

    return null;
  } catch (e) {
    console.error("Error initializing user from storage / token", e);
    return null;
  }
};

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
 
  const [showFirstLogin, setShowFirstLogin] = useState(
  () => localStorage.getItem("isFirstLogin") === "true"
);
const firstLoginCode = localStorage.getItem("firstLoginEmployeeCode") || "";



  // 🔹 UPDATED: use helper to initialize user (handles ?token=)
  const [user, setUser] = useState(getInitialUser);

  const navigate = useNavigate();

  const handleLoginSuccess = (user) => {
  setUser(user);

  // Read flag set synchronously by Login.jsx before calling this
  const isFirst = localStorage.getItem("isFirstLogin") === "true";
  if (isFirst) {
    setShowFirstLogin(true);  // modal renders immediately
    return;                   // don't navigate
  }

  navigate("/dashboard", { replace: true });
};
  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("user");
sessionStorage.removeItem("userSession");
sessionStorage.removeItem("ssoToken");

localStorage.removeItem("user");
localStorage.removeItem("userSession");
localStorage.removeItem("ssoToken");
localStorage.removeItem("remember");

    navigate("/login", { replace: true });
  };

  useSessionTimeout(handleLogout);

  // If still no user after storage / token check → show login routes
  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
if (user && showFirstLogin) {
  return (
    <FirstLoginModal
      employeeCode={firstLoginCode}
      onDone={() => {
        localStorage.removeItem("isFirstLogin");
        localStorage.removeItem("firstLoginEmployeeCode");
        setShowFirstLogin(false);
        navigate("/dashboard", { replace: true });
      }}
    />
  );
}
  // License gate helper — wraps a route element so locked modules show the upgrade notice
  const gate = (feature, element) => (
    <FeatureGate feature={feature} currentUser={user}>{element}</FeatureGate>
  );

  return (
    <PermissionProvider>
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
      <Route path="/loyalty/config" element={gate("loyalty", <LoyaltyProgramConfig />)} />
      
      <Route path="/membership" element={gate("membership", <MembershipConfig />)} />
      <Route path="/discounts" element={gate("discounts", <DiscountManagement />)} />
      <Route path="/discounts/configure/*" element={gate("discounts", <DiscountConfig />)} />
      <Route path="/discounts/manage" element={gate("discounts", <DiscountList />)} />
      <Route path="/consentform/injectible" element={<InjectableTreatment />} />
      <Route path="/consentform/facial" element={<HyaluronidaseCF />} />
      <Route
        path="/assesmentform/consultation"
        element={<ConsultationAssessmentForm />}
      />
      <Route path="/consentform/laser" element={<LaserConsentForm />} />
      <Route path="/treatmentform/laser" element={<LaserSessionForm />} />
      <Route
        path="/treatmentform/facial"
        element={<HyaluronidaseTreatmentForm />}
      />

      {/*Add Routes WITH Sidebar + Header */}
      
      
      

<Route path="/segmentaddform/:employeeCode" element={<SegmentAddForm />} />

      <Route
        path="/*"
        element={
          <div
            className={`ot-wrapper ${isSidebarCollapsed ? "collapsed" : ""}`}
          >
            <Sidebar collapsed={isSidebarCollapsed} />
            <section className="rhs-sect">
              <Header onToggleSidebar={toggleSidebar} onLogout={handleLogout} />
              <div className="home-sect">
                <Routes>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="/loyalty" element={gate("loyalty", <LoyaltyListing />)} />


                  <Route
                    path="/segmentaddform/:employeeCode"
                    element={<SegmentAddForm />}
                  />
                  <Route
                    path="/opportunity/:oppCode/customers"
                    element={gate("opportunity", <AddLeadCustomerList />)}
                  />
                  <Route
                    path="/opportunity/customers"
                    element={gate("opportunity", <AddLeadCustomerList />)}
                  />

                   <Route
                    path="/masters/packages"
                    element={<PackageMaster />}
                  />


                  <Route path="/on-demand" element={<OnDemandTriggers />} />

                  <Route path="/appointment/dashboard" element={<AppointmentDashboard />} />

                  <Route path="/invoice/dashboard" element={<InvoiceDashboard />} />
                  <Route
  path="/manuallead/:oppCode"
  element={gate("opportunity", <ManualOppCustomerDetails />)}
  
/>
<Route path="/opportunity/master/:oppCode/lead/:custId" element={gate("opportunity", <MasterLeadForm />)} />


<Route path="/shift/roster" element={<RosterView />} />

<Route path="/opportunity/:oppCode/details"  element={gate("opportunity", <CampaignDetails />)} />


<Route path="/emr/forms"           element={<FormList />} />
<Route path="/emr/builder/:formCode" element={<FormBuilder />} />

{/* <Route path="/opportunity/external/:fromDate/:toDate/:oppCode" element={<ExternalLeadsTable />} /> */}


 <Route
  path="/manuallead/:oppCode/:custId"
  element={gate("opportunity", <ManualOppCustomerDetails />)}
  
/>

<Route path="/shift/master" element={<ShiftMaster />} />
<Route path="/shift/my" element={<MyShift />} />


<Route path="/manuallead/edit/:leadOppId" element={gate("opportunity", <ManualLeadEdit />)} />
<Route
  path="/opportunity/external/:oppCode/lead/:leadOppId"
  element={gate("opportunity", <ExternalLeadForm />)}
/>
<Route path="/reset-password" element={<ResetPassword />} />
<Route path="/opportunity/:oppCode/noshow/:custId" element={gate("opportunity", <NoShowEntryDetails />)} />
<Route path="/opportunity/:oppCode/cancelled/:custId" element={gate("opportunity", <CancelledEntryDetails />)} />
<Route path="/opportunity/create" element={gate("opportunity", <CreateCampaign />)} />
<Route path="/ltr-funnel" element={gate("opportunity", <LTRFunnelDashboard />)} />


<Route path="/masters/disposition" element={gate("opportunity", <DispositionMaster />)} />
<Route path="/opportunity/disposition-mapping/create" element={gate("opportunity", <DispositionMappingCreate />)} />
                  <Route path="cases" element={gate("caseManagement", <CaseManagement />)} />
                  <Route
                    path="/cases/:caseNumber"
                    element={gate("caseManagement", <CaseDetailsPage />)}
                  />
                  <Route
                    path="/masters/customers"
                    element={<CustomerMaster />}
                  />
                  <Route
                    path="/case-detailed-report"
                    element={gate("caseManagement", <CaseDetailedReport />)}
                  />
                  <Route
                    path="/masters/practitioners"
                    element={<DoctorMaster />}
                  />
                  <Route path="/masters/clinic" element={<ClinicMaster />} />

                  <Route path="/settings/legal-entity" element={<LegalEntitySetup />} />

                  <Route path="/settings/centre-setup" element={<CentreSetup />} />

                   <Route path="/settings/zone-setup" element={gate("multiLocation", <ZoneSetup />)} />

                  <Route path="/settings/org-setup" element={gate("multiLocation", <OrgHierarchy />)} />

                  <Route
                    path="/masters/department"
                    element={<DepartmentMaster />}
                  />
                  <Route path="/masters/managers" element={<ManagerMaster />} />
                  <Route
                    path="/masters/segments"
                    element={<SegmentMapping />}
                  />
                  <Route
                    path="/masters/employees"
                    element={<EmployeeMaster />}
                  />
                  <Route path="/masters/product" element={<ProductMaster />} />
                  <Route path="/masters/service" element={<ServiceMaster />} />
                  <Route
                    path="/masters/item-category"
                    element={<ItemCategoryMaster />}
                  />
                  <Route
                    path="/masters/purchase-category"
                    element={<PurchaseCategoryMaster />}
                  />
                  <Route
                    path="/opportunity"
                    element={gate("opportunity", <OpportunityDashboard />)}
                  />
                  <Route path="/einvoice" element={<EInvoiceDashboard />} />
                  <Route
                    path="/einvoice/detailed"
                    element={gate("reporting", <EInvoiceDetailedReport />)}
                  />
                  <Route
                    path="/courtesy-call"
                    element={gate("courtesyCall", <CourtesyCallDashboard />)}
                  />
                  <Route
                    path="/courtesy-call/report"
                    element={gate("courtesyCall", <DetailedReport />)}
                  />
                  <Route path="/audit" element={gate("audit", <AuditDashboard />)} />
                  {/* <Route path="/opportunity/details/:fromDate/:toDate/:oppCode" element={<OpportunityDetails />} /> */}

                  <Route
                    path="/opportunity/create"
                    element={gate("opportunity", <OpportunityForm mode="create" />)}
                  />
                  <Route
                    path="/opportunity/:oppCode/customer/:custId"
                    element={gate("opportunity", <OppCustomerDetails />)}
                  />

                  <Route
                    path="/create-category"
                    element={<ItemCategoryCreateTabs />}
                  />
                  <Route
                    path="/auditsegmentview"
                    element={gate("audit", <AuditCreateDashboard />)}
                  />
                  <Route
                    path="/courtesy-call/details"
                    element={gate("courtesyCall", <CourtesyCallDetails />)}
                  />
                  <Route
                    path="/case-hierarchy"
                    element={gate("caseManagement", <CaseHierarchyDashboard />)}
                  />
                  <Route
                    path="/case-hierarchy/create"
                    element={gate("caseManagement", <CaseHierarchyCreate />)}
                  />
                  <Route
                    path="/case-hierarchy/edit/:recId"
                    element={gate("caseManagement", <CaseHierarchyCreate />)}
                  />
                  <Route path="/audit/create" element={gate("audit", <AuditCreate />)} />
                  <Route
                    path="/audit/summary"
                    element={gate("audit", <AuditSummaryReport />)}
                  />
                  <Route
                    path="/audit/detailed"
                    element={gate("audit", <AuditDetailedReport />)}
                  />
                  <Route
                    path="/opportunity/detailed"
                    element={gate("opportunity", <OpportunityDetailedReport />)}
                  />
                  <Route
                    path="/opportunity/summary"
                    element={gate("opportunity", <OpportunitySummaryReport />)}
                  />
                  <Route path="/audit/:segment/form" element={gate("audit", <AuditForm />)} />
                  <Route
                    path="/case-categories"
                    element={gate("caseManagement", <CaseCategoryMaster />)}
                  />

                  <Route path="/settings/security" element={<SecuritySettings />} />


                  <Route
                    path="/create-categories-mapping"
                    element={gate("caseManagement", <CreateCaseCategoryMapping />)}
                  />
                  <Route
                    path="/create-case-category"
                    element={gate("caseManagement", <CreateCaseCategory />)}
                  />
                  <Route
                    path="/categories-mapping"
                    element={gate("caseManagement", <CaseCategoryMappingDashboard />)}
                  />
                  <Route
                    path="/audit/:auditNo"
                    element={gate("audit", <AuditDraftDetails />)}
                  />
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />

                  {/* Mapped Forms / Custom Forms */}
                  
                  <Route
                    path="/consent-form/laser-session-consent"
                    element={<LaserSessionCF />}
                  />
                  <Route
                    path="/consent-form/injectable-treatment-consent"
                    element={<InjectableTreatment />}
                  />
                  <Route
                    path="/consent-form/hyaluronidase-consent"
                    element={<HyaluronidaseCF />}
                  />
                  <Route
                    path="/consent-form/antiaging-consent"
                    element={<InjectablesConsentForm />}
                  />
                  <Route
                    path="/custom-forms/laser-session"
                    element={<LaserSessionForm />}
                  />
                  <Route
                    path="/custom-forms/consultation-assessment"
                    element={<ConsultationAssessmentForm />}
                  />
                  <Route
                    path="/audit/:auditNo"
                    element={gate("audit", <AuditDraftDetails />)}
                  />
                  <Route
                    path="/custom-forms/form-builder"
                    element={<AdvancedFormBuilder />}
                  />
                  <Route
                    path="/custom-forms/form-builder/preview"
                    element={<GetFormByDetails />}
                  />
                  <Route
                    path="/custom-forms/hyaluronidase-treatment"
                    element={<HyaluronidaseTreatmentForm />}
                  />

                  <Route path="/upload/oppuploader" element={<OppUploader />} />

                  <Route
                    path="/custom-forms/general-form"
                    element={<GeneralForm />}
                  />
                  {/* <Route path="/purchase-category/create" element={<CreatePurchaseCategory />} /> */}
                </Routes>
              </div>
            </section>
          </div>
        }
      />
    </Routes>
    </PermissionProvider>
  );
}

export default App;