import React, { useEffect, useState } from "react";
import TabList from "./TabList";
import TabContent from "./TabContent";
import { API_BASE_URL } from "../../../config";
const tabs = ["General", "Appointment", "Invoices", "Packages", "Forms", "Cases", "Credit Memo", "Advance Payments", "Notes", "Loyalty", "Membership"];

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const getCenterCode = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.centerCode || user?.CenterCode || user?.center_code || user?.CENTERCODE || "";
  } catch { return ""; }
};

const CustomerDetails = ({ custId, recId }) => {
  const [activeTab, setActiveTab]     = useState("General");
  const [customerData, setCustomerData] = useState(null);

  const centerCode = getCenterCode();

  useEffect(() => {
    if (!custId) return;
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Customer/FetchCustomerDetails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TOKEN()}`,
          },
          body: JSON.stringify({ custID: custId, centerCode }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || `API Error ${res.status}`);

        // Unwrap envelope { success, data } and ensure centerCode is set
        const data = json?.data ?? json;
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
          recId={recId}
        />
      </div>
    </div>
  );
};

export default CustomerDetails;