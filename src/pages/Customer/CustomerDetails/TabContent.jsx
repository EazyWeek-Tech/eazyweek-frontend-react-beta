import React from "react";
import GeneralTab from "./GeneralTab";
import AppointmentTab from "./AppointmentTab";
import CreditMemoTab from "./CreditMemoTab";
import AdvanceTab from "./AdvanceTab";
import NotesTab from "./NotesTab";
import PackagesTab from "./PackagesTab";
import InvoiceTab from "./InvoiceTab";
import CaseTab from "./CaseTab";
import CustomerFormsPage from "./CustomerFormsPage";
import LoyaltyTab from "./LoyaltyTab";
import MembershipTab from "./MembershipTab";

const TabContent = ({ activeTab, customer, custId, recId }) => {

  switch (activeTab) {
    case "General":
      return <GeneralTab customer={customer} custId={custId} />;
    case "Appointment":
      return <AppointmentTab custId={custId} />;
    case "Credit Memo":
      return <CreditMemoTab custId={custId} />;
    case "Advance Payments":
      return <AdvanceTab custId={custId} />;
    case "Notes":
      return <NotesTab custId={custId} />;
    case "Packages":
      return <PackagesTab custId={custId} />;
    case "Membership":
      return <MembershipTab custId={custId} />;
      case "Forms":
        return <CustomerFormsPage custId={custId} />;
       case "Loyalty":
          return <LoyaltyTab custId={custId} recId={recId} />;

      case "Invoices": 
      return <InvoiceTab custId={custId} recId={recId} />;
        case "Cases":
      return <CaseTab custId={custId} />;
    default:
      return <div>Select a tab</div>;
  }
};

export default TabContent;