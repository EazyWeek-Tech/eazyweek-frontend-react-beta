import React from "react";
import GeneralTab from "./GeneralTab";
import AppointmentTab from "./AppointmentTab";
import CreditMemoTab from "./CreditMemoTab";
import NotesTab from "./NotesTab";
import PackagesTab from "./PackagesTab";
import InvoiceTab from "./InvoiceTab";

const TabContent = ({ activeTab, customer }) => {
  switch (activeTab) {
    case "General":
      return <GeneralTab customer={customer} />;
    case "Appointment":
      return <AppointmentTab />;
    case "Credit Memo":
      return <CreditMemoTab />;
    case "Notes":
      return <NotesTab />;
    case "Packages":
      return <PackagesTab />;
    case "Invoices":
      return <InvoiceTab />;
    default:
      return <div>Select a tab</div>;
  }
};

export default TabContent;
