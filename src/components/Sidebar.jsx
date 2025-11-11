import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const Sidebar = ({ collapsed }) => {
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuLabel) => {
  setExpandedMenus((prev) => {
    const isAlreadyExpanded = prev[menuLabel];
    return isAlreadyExpanded ? {} : { [menuLabel]: true };
  });
};


  const navItems = [
    {
      label: "Opportunity",
      icon: "bxl-graphql",
      submenu: [
        { name: "Opportunity", path: "/opportunity" },
        { name: "Detailed report", path: "/opportunity/detailed" },
        { name: "Summary report", path: "/opportunity/summary" },
        { name: "E-mail", path: "/opportunity/email" },
      ],
    },
    {
      label: "Case Management",
      icon: "bx-customize",
      submenu: [
        { name: "Cases", path: "/cases" },
        { name: "Case Categories", path: "/case-categories" },
        { name: "Categories Mapping", path: "/categories-mapping" },
        { name: "Case Hierarchy", path: "/case-hierarchy" },
        { name: "Case Detailed Report", path: "/case-detailed-report" },
      ],
    },
    {
      label: "Courtesy Call",
      icon: "bx-phone-call",
      submenu: [
        { name: "Courtesty Call", path: "/courtesy-call" },
        { name: "Detailed Report", path: "/courtesy-call/report" },
      ],
    },
    {
      label: "Appointment",
      icon: "bx-calendar",
      submenu: [
        { name: "Appointment", path: "/appointment" },
      ],
    },
    {
      label: "Audit",
      icon: "bx-calculator",
      submenu: [
        {name: "Audit Dashboard", path:"/audit"},
        { name: "Create", path: "/auditsegmentview" },
        { name: "Summary Report", path: "/audit/summary" },
        { name: "Detailed Report", path: "/audit/detailed" },
      ],
    },
    {
      label: "E-Invoice",
      icon: "bx-receipt",
      submenu: [
        { name: "E-Invoice", path: "/einvoice" },
        { name: "Detailed Report", path: "/einvoice/detailed" }
      ],
    },
    {
      label: "Invoice",
      icon: "bx-receipt",
      submenu: [{ name: "Invoice", path: "/invoice" }],
    },
    {
      label: "Masters",
      icon: "bx-edit",
      submenu: [
        { name: "Customers", path: "/masters/customers" },
        { name: "Clinic", path: "/masters/clinic" },
        { name: "Department", path: "/masters/department" },
        { name: "Doctor / Therapist", path: "/masters/practitioners" },
        { name: "Employee", path: "/masters/employees" },
        { name: "Segment Mapping", path: "/masters/segments" },
        { name: "Managers", path: "/masters/managers" },
        { name: "Product", path: "/masters/product" },
        { name: "Service", path: "/masters/service" },
        { name: "Item Category", path: "/masters/item-category" },
        { name: "Item Category Mapping", path: "/masters/item-category-mapping" },
        { name: "Purchase Category", path: "/masters/purchase-category" },
        { name: "Purchase Category Mapping", path: "/masters/purchase-category-mapping" },
      ],
    },
    {
      label: "Consent Forms",
      icon: "bx-file-blank",
      submenu: [{ name: "Laser Session Consent", path: "/consent-form/laser-session-consent" }
,{ name: "Injectable Treatment Consent", path: "/consent-form/injectable-treatment-consent" },
{ name: "Hyaluronidase Consent", path: "/consent-form/hyaluronidase-consent" },
{ name: "Antiaging Consent", path: "/consent-form/antiaging-consent" }

      ],

    },
    {
      label:"Custom Forms",
      icon:"bx-customize",
      submenu:[{ name:"Laser Session", path:"/custom-forms/laser-session"}
,{ name:"Consultation Assessment", path:"/custom-forms/consultation-assessment"},
{ name:"Hyaluronidase Treatment", path:"/custom-forms/hyaluronidase-treatment"},
{ name:"General Form", path:"/custom-forms/general-form"},
{ name:"Advanced Form Builder", path:"/custom-forms/form-builder"},
{ name:"Advanced Form Builder Preview", path:"/custom-forms/form-builder/preview"},
      ]
    },
    {
      label: "On Demand",
      icon: "bx-cloud-download",
      submenu: [{ name: "On Demand Triggers", path: "/on-demand" }],
    },
    {
      label: "Settings",
      icon: "bx-cog",
      submenu: [
        { name: "Settings", path: "/settings" },
        { name: "Loyalty", path: "/loyalty" },
        { name: "Membership", path: "/membership" },
        { name: "Discount", path: "/discounts" }
      ],
    },
  ];

  return (
    <aside
      className={`lhs-nav ${collapsed ? "expand" : ""}`}
      onMouseLeave={() => setExpandedMenus({})}
    >
      <div className="smlnav">
         <a href="/dashboard" className="sw-logo">
          <img
            src="/images/smallezywk.png"
            alt="logo"
          />
          {/* <span>INSIGHT</span> */}
        </a>

        <ul className="lhs-mnu">
          <li>
            <a href="/dashboard" >
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
              <div>
                <i className={`nav-icon bx ${item.icon}`}></i>
                <span>{item.label}</span>
              </div>
              <div className="mlti-sub-mnu">
                {item.submenu.map((sub, i) => (
                  <NavLink key={i} to={sub.path}>
                    {sub.name}
                  </NavLink>
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
