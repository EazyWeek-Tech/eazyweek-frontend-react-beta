import React from "react";
import { useSearchParams, Link } from "react-router-dom";

const tabIcons = {
  General: "images/user.svg",
  Appointment: "images/appt.svg",
  Invoices: "images/invoice.svg",
  Packages: "images/package.svg",
  Forms: "images/form.svg",
  Cases: "images/cases.svg",
  "Credit Memo": "images/creditmemo.svg",
  Notes: "images/notes1.svg",
};

const TabList = ({ tabs, activeTab, onTabClick, custId }) => {
  const [searchParams] = useSearchParams();
  const fullName = searchParams.get("fullname") || "";

  const handleTabClick = (tab) => {
    console.log(custId);
    onTabClick(tab, custId);
  };

  return (
    <div className="vertical-tabs">
      <div className="fnameclass">{fullName}</div>

      {tabs.map((tab) => (
        <div
          key={tab}
          className={`csttab ${activeTab === tab ? "active" : ""}`}
          onClick={() => handleTabClick(tab)}
        >
          <div className="tab-icon">
            <img src={`/${tabIcons[tab] || "default.svg"}`} alt={tab} />
          </div>
          <div>{tab}</div>
        </div>
      ))}

      <style jsx="true">{`
        .fnameclass {
          font-size: 28px;
          line-height: 30px;
          color: #fff;
          padding: 20px 10px;
          font-weight: 600;
        }
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
          background-color: #324e78;
        }
        .tab-icon {
          margin-right: 10px;
          width: 20px;
          height: 20px;
        }
        .tab-icon img {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default TabList;
