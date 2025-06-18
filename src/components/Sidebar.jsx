import React, { useState } from "react";

const Sidebar = ({ collapsed }) => {
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuLabel) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuLabel]: !prev[menuLabel],
    }));
  };

  const navItems = [
    {
      label: "Opportunity",
      icon: "bxl-graphql",
      submenu: ["Opportunity", "Detailed report", "Summary report", "E-mail"],
    },
    {
      label: "Case Management",
      icon: "bx-customize",
      submenu: [
        "Cases",
        "Case Categories",
        "Categories Mapping",
        "Case Hierarchy",
        "Case Detailed Report",
      ],
    },
    {
      label: "Courtesy Call",
      icon: "bx-phone-call",
      submenu: ["Courtesty Call", "Detailed Report"],
    },
    {
      label: "Appointment",
      icon: "bx-calendar",
      submenu: ["Appointment"],
    },
    {
      label: "Audit",
      icon: "bx-calculator",
      submenu: ["Create", "Summary Report", "Detailed Report"],
    },
    {
      label: "E-Invoice",
      icon: "bx-receipt",
      submenu: ["E-Invoice"],
    },
    {
      label: "Invoice",
      icon: "bx-receipt",
      submenu: ["Invoice"],
    },
    {
      label: "Masters",
      icon: "bx-edit",
      submenu: [
        "Customers",
        "Clinic",
        "Department",
        "Doctor / Therapist",
        "Employee",
        "Segment Mapping",
        "Managers",
        "Product",
        "Service",
        "Item Category",
        "Item Category Mapping",
        "Purchase Category",
        "Purchase Category Mapping",
      ],
    },
    {
      label: "On Demand",
      icon: "bx-cloud-download",
      submenu: ["On Demand Triggers"],
    },
    {
      label: "Settings",
      icon: "bx-cog",
      submenu: ["Settings"],
    },
  ];

  return (
    <aside className={`lhs-nav ${collapsed ? "expand" : ""}`}>
      <div className="smlnav">
        <div className="sw-logo">
          <img
            src="https://insightuat.azurewebsites.net/ImageAssets/loo.JPG"
            alt="logo"
          />
          <span>INSIGHT</span>
        </div>

        <ul className="lhs-mnu">
          <li>
            <a href="#">
              <i className="nav-icon bx bx-home-alt"></i>
              <span>Home</span>
            </a>
          </li>

          {navItems.map((item, idx) => (
            <li
              key={idx}
              className={`multi-li ${expandedMenus[item.label] ? "expnd" : ""}`}
              onClick={() => toggleMenu(item.label)}
            >
              <a href="javascript:void(0)">
                <i className={`nav-icon bx ${item.icon}`}></i>
                <span>{item.label}</span>
              </a>
              <div className="mlti-sub-mnu">
                {item.submenu.map((sub, i) => (
                  <a key={i} href="#">
                    {sub}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
