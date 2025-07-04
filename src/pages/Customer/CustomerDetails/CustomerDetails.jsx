import React, { useState } from "react";
import TabList from "./TabList";
import TabContent from "./TabContent";

const tabs = [
  "General",
  "Appointment",
  "Invoices",
  "Packages",
  "Forms",
  "Cases",
  "Credit Memo",
  "Notes",
];

const CustomerDetails = () => {
  const [activeTab, setActiveTab] = useState("General");

  return (
    <div className="customer-details">
      <div className="tabs-container">
        <TabList tabs={tabs} activeTab={activeTab} onTabClick={setActiveTab} />
        <TabContent activeTab={activeTab} />
      </div>
    </div>
  );
};

export default CustomerDetails;