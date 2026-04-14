import React, { useEffect, useState } from "react";
import TabList from "./TabList";
import TabContent from "./TabContent";
import { API_BASE_URL } from "../../../config";

const tabs = [
  "General",
  "Appointment",
  "Invoices",
  "Loyalty",
  "Packages",
  "Forms",
  "Cases",
  "Credit Memo",
  "Notes",
];

// ✅ Read centerCode from the user object saved in localStorage at login
const getCenterCode = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return (
      user?.centerCode ||
      user?.CenterCode ||
      user?.center_code ||
      user?.CENTERCODE ||
      ""
    );
  } catch {
    return "";
  }
};

const CustomerDetails = ({ custId }) => {
  const [activeTab, setActiveTab] = useState("General");
  const [customerData, setCustomerData] = useState(null);

  const centerCode = getCenterCode();

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!custId) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/Customer/FetchCustomerDetails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // ✅ FIX: pass centerCode so SpFetchCustomerDetails WHERE clause matches
          body: JSON.stringify({ custID: custId, centerCode }),
          credentials: "include",
        });

        const text = await response.text();

        if (!response.ok) {
          console.error("FetchCustomerDetails failed:", text);
          throw new Error(`API Error: ${text}`);
        }

        const data = JSON.parse(text);
        console.log("Customer Data:", data);

        // ✅ Ensure centerCode is always set on the customer object
        //    so GeneralTab payload includes it even if SP didn't return it
        setCustomerData({ ...data, centerCode: data.centerCode || centerCode });
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
        <TabContent
          activeTab={activeTab}
          customer={customerData}
          custId={custId}
        />
      </div>
    </div>
  );
};

export default CustomerDetails;