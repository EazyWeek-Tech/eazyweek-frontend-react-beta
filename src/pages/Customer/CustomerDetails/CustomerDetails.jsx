import React, { useEffect, useState } from "react";
import TabList from "./TabList";
import TabContent from "./TabContent";
import { API_BASE_URL } from "../../../config";

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

const CustomerDetails = ({ custId }) => {
  const [activeTab, setActiveTab] = useState("General");
  const [customerData, setCustomerData] = useState(null);

  useEffect(() => {
  const fetchCustomer = async () => {
    if (!custId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/Customer/FetchCustomerDetails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custID: custId }),
        credentials: "include"
      });

      const text = await response.text();

      if (!response.ok) {
        console.error("FetchCustomerDetails failed:", text);
        throw new Error(`API Error: ${text}`);
      }

      const data = JSON.parse(text);
      console.log("Customer Data:", data);
      setCustomerData(data);
    } catch (err) {
      console.error("Failed to fetch customer details:", err);
    }
  };

  fetchCustomer();
}, [custId]);


  return (
    <div className="customer-details">
      <div className="tabs-container">
        <TabList tabs={tabs} activeTab={activeTab} onTabClick={setActiveTab} />
        <TabContent activeTab={activeTab} customer={customerData} custId={custId} />
      </div>
    </div>
  );
};

export default CustomerDetails;
