import React from "react";
import GeneralTab from "./GeneralTab";
import AppointmentTab from "./AppointmentTab";
import NotesTab from "./NotesTab";
import InvoicesTab from "./InvoiceTab";
import CreditMemoTab from "./CreditMemoTab";
import PackagesTab from "./PackagesTab";

const TabContent = ({ activeTab }) => {
  return (
    <div className="tab-content">
      {activeTab === "General" && <GeneralTab />}
            {activeTab === "Appointment" && <AppointmentTab />}

             {activeTab === "Notes" && <NotesTab />}

             {activeTab === "Invoices" && <InvoicesTab />}             
             {activeTab === "Credit Memo" && <CreditMemoTab />}

              {activeTab === "Packages" && <PackagesTab />}

    </div>
  );
};

export default TabContent;