import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { getFeatureSet, filterNavByLicense } from "../config/licenseConfig";

const Sidebar = ({ collapsed, currentUser }) => {
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuLabel) => {
  setExpandedMenus((prev) => {
    const isAlreadyExpanded = prev[menuLabel];
    return isAlreadyExpanded ? {} : { [menuLabel]: true };
  });
};


  const navItems = [
    // 1. Appointments
    {
      label: "Appointment",
      icon: "bx-calendar",
      feature: "appointment",
      submenu: [
        { name: "Appointment Dashboard", path: "/appointment/dashboard" },
        { name: "Appointment", path: "/appointment" },
      ],
    },
    // 2. Invoice
    {
      label: "Invoice",
      icon: "bx-receipt",
      feature: "billing",
      submenu: [
        { name: "Invoice Dashboard", path: "/invoice/dashboard" },
        { name: "Invoice", path: "/invoice" },
        { name: "Cash Management", path: "/invoice/cash-management" }

      ],
    },
    // 3. Opportunity
    {
      label: "Opportunity",
      icon: "bxl-graphql",
      feature: "opportunity",
      submenu: [
        { name: "Opportunity", path: "/opportunity" },
        { name: "Lead Funnel", path: "/ltr-funnel" },
        { name: "Disposition Mapping", path: "/masters/disposition" },
        { name: "Detailed report", path: "/opportunity/detailed", feature: "reporting" },
        { name: "Summary report", path: "/opportunity/summary", feature: "reporting" },
        { name: "E-mail", path: "/opportunity/email" },
      ],
    },
    // 4. E-invoice
    {
      label: "E-Invoice",
      icon: "bx-receipt",
      feature: "billing",
      submenu: [
        { name: "E-Invoice", path: "/einvoice" },
        { name: "Detailed Report", path: "/einvoice/detailed", feature: "reporting" }
      ],
    },
    // 5. Courtesy Call
    {
      label: "Courtesy Call",
      icon: "bx-phone-call",
      feature: "courtesyCall",
      submenu: [
        { name: "Courtesty Call", path: "/courtesy-call" },
        { name: "Detailed Report", path: "/courtesy-call/report", feature: "reporting" },
      ],
    },
    // 6. Case Management
    {
      label: "Case Management",
      icon: "bx-customize",
      feature: "caseManagement",
      submenu: [
        { name: "Cases", path: "/cases" },
        { name: "Case Categories", path: "/case-categories" },
        { name: "Categories Mapping", path: "/categories-mapping" },
        { name: "Case Hierarchy", path: "/case-hierarchy" },
        { name: "Case Detailed Report", path: "/case-detailed-report", feature: "reporting" },
      ],
    },
    // 7. Audit
    {
      label: "Audit",
      icon: "bx-calculator",
      feature: "audit",
      submenu: [
        {name: "Audit Dashboard", path:"/audit"},
        { name: "Create", path: "/auditsegmentview" },
        { name: "Summary Report", path: "/audit/summary", feature: "reporting" },
        { name: "Detailed Report", path: "/audit/detailed", feature: "reporting" },
      ],
    },
    // 8. Masters ....
    {
      label: "Masters",
      icon: "bx-edit",
      submenu: [
        { name: "Customers", path: "/masters/customers" },
        { name: "Clinic", path: "/masters/clinic" },
    //    { name: "Department", path: "/masters/department" },
        { name: "Doctor / Therapist", path: "/masters/practitioners" },
        { name: "Employee", path: "/masters/employees" },
    //    { name: "Segment Mapping", path: "/masters/segments" },
    //    { name: "Managers", path: "/masters/managers" },
        { name: "Product", path: "/masters/product" },
        { name: "Service", path: "/masters/service" },
        { name: "Roles", path: "/settings/security" },
    //    { name: "Item Category", path: "/masters/item-category" },
    //    { name: "Item Category Mapping", path: "/masters/item-category-mapping" },
    //    { name: "Purchase Category", path: "/masters/purchase-category" },
    //    { name: "Purchase Category Mapping", path: "/masters/purchase-category-mapping" },
        { name: "Packages", path:'/masters/packages'}
      ],
    },
    // --- modules below keep their existing order after Masters ---
    {
  label: "Shift Management",
  icon: "bx-time-five",
  submenu: [
    { name: "Shift Master", path: "/shift/master" },
    { name: "Roster", path: "/shift/roster" },
    { name: "My Shift", path: "/shift/my" }
  ],
},
    {
      label: "Mapped Forms",
      icon: "bx-file-blank",
      feature: "emr",
      submenu: [{ name: "List Forms", path: "/emr/forms" }],
    },
    
// ,{ name: "Injectable Consent", path: "/consent-form/injectable-treatment-consent" },
// { name: "Hyaluronidase Consent", path: "/consent-form/hyaluronidase-consent" },
// { name: "Antiaging Consent", path: "/consent-form/antiaging-consent" },

// { name:"Laser Session", path:"/custom-forms/laser-session"}
// ,{ name:"Consultation Assessment", path:"/custom-forms/consultation-assessment"},
// { name:"Hyaluronidase Treatment", path:"/custom-forms/hyaluronidase-treatment"},
    //   ],

    // },
    //{
      //label:"Personalised Form Creator",
      //icon:"bx-customize",
      //submenu:[
    // { name:"Advanced Form Builder", path:"/custom-forms/form-builder"},
    // { name:"Advanced Form Builder Preview", path:"/custom-forms/form-builder/preview"},
   // { name:"Create Form", path:"/emr/builder/:formCode"},
    //  ]
   // },
    {
      label: "On Demand",
      icon: "bx-cloud-download",
      submenu: [
        { name: "On Demand Triggers", path: "/on-demand" },
        {name: "Excel Upload", path:"/upload/oppuploader"},
      
      ],
    },
    {
      label: "Settings",
      icon: "bx-cog",
      submenu: [
        { name: "Security Settings", path: "/settings/security" },
        { name: "Loyalty", path: "/loyalty", feature: "loyalty" },
        
        { name: "Legal Entity", path: "/settings/legal-entity" },
         { name: "Centre Setup", path: "/settings/centre-setup" },
         { name: "Zone Setup", path: "/settings/zone-setup", feature: "multiLocation" },
          { name: "Organization Hierarchy", path: "/settings/org-setup", feature: "multiLocation" },
        { name: "Discount", path: "/discounts", feature: "discounts" }
      ],
    },
  ];

  // License gating — only applies once currentUser carries a licenseTier
  // (i.e. after login/JWT is wired to return it). Until then every module
  // shows, exactly as before: no risk of hiding menus during rollout.
  const visibleNavItems = currentUser?.licenseTier
    ? filterNavByLicense(navItems, getFeatureSet(currentUser))
    : navItems;

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

          {visibleNavItems.map((item, idx) => (
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