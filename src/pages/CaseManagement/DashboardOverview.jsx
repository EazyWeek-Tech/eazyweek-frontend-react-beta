import React from "react";

const stats = [
  {
    label: "Total Cases",
    value: 100,
    icon: <i className="bx bx-briefcase"></i>,
  },
  {
    label: "WIP",
    value: 10,
    icon: <i className="bx bxs-hourglass-bottom"></i>,
  },
  { label: "Open", value: 24, icon: <i className="bx bx-lock-open-alt"></i> },
  { label: "Closed", value: 31, icon: <i className="bx bx-lock-alt"></i> },
  {
    label: "Resolved",
    value: 27,
    icon: <img src="/images/thumbsup.png" width="28" alt="" />,
  },
  {
    label: "Unresolved",
    value: 2,
    icon: <img src="/images/unresolved.png" width="28" alt="" />,
  },
  {
    label: "Request",
    value: 23,
    icon: <img src="/images/request.png" width="28" alt="" />,
  },
  { label: "Query", value: 1, icon: <i className="bx bx-question-mark"></i> },
  {
    label: "Complaint",
    value: 10,
    icon: <img src="/images/complaint.png" width="28" alt="" />,
  },
  {
    label: "Incident Report",
    value: 2,
    icon: <img src="/images/incident.png" width="28" alt="" />,
  },
  {
    label: "Repair",
    value: 2,
    icon: <img src="/images/repair.png" width="28" alt="" />,
  },
  {
    label: "Maintenance",
    value: 2,
    icon: <img src="/images/main.png" width="28" alt="" />,
  },
];

const DashboardOverview = () => {
  return (
    <div className="casesoverview">
      <div className="quickovwrap">
        {stats.map((stat, index) => (
          <div key={index} className="qkpgcell">
            <div className="pgicon">{stat.icon}</div>
            <div className="dtdiv">
              <label className="dtlbl">{stat.label}</label>
              <h3 className="dtval">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardOverview;
