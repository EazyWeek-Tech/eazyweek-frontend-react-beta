import React from "react";

const tabIcons = {
  General: "👤",
  Appointment: "📅",
  Invoices: "🧾",
  Packages: "📦",
  Forms: "📝",
  Cases: "📂",
  "Credit Memo": "💳",
  Notes: "🗒️",
};

const TabList = ({ tabs, activeTab, onTabClick, custId }) => {
  const handleTabClick = (tab) => {
    console.log(custId)
    // Pass both the selected tab and custId to the onTabClick handler
    onTabClick(tab, custId);
  };

  return (
    <div className="vertical-tabs">
      {tabs.map((tab) => (
        <div
          key={tab}
          className={`csttab ${activeTab === tab ? "active" : ""}`}
          onClick={() => handleTabClick(tab)} // Send tab and custId on click
        >
          <div className="tab-icon">{tabIcons[tab] || "📁"}</div>
          <div>{tab}</div>
        </div>
      ))}

      <style>{`
        .vertical-tabs {
          display: flex;
          flex-direction: column;
        }

        .csttab {
          padding: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .csttab.active {
          background-color: #f0f0f0;
        }

        .tab-icon {
          margin-right: 10px;
        }
      `}</style>
    </div>
  );
};

export default TabList;
