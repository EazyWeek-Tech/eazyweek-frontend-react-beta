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

const TabList = ({ tabs, activeTab, onTabClick }) => {
  return (
    <div className="vertical-tabs">
      {tabs.map((tab) => (
        <div
          key={tab}
          className={`csttab ${activeTab === tab ? "active" : ""}`}
          onClick={() => onTabClick(tab)}
        >
          <div className="tab-icon">{tabIcons[tab] || "📁"}</div>
          <div>{tab}</div>
        </div>
      ))}

      <style>{`
        
        
      `}</style>
    </div>
  );
};

export default TabList;
