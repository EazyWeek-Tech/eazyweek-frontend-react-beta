import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getFeatureSet } from "../config/licenseConfig";

/**
 * EazyWeek navigation -- built to EazyWeek_Nav_Prototype.html.
 *
 * Shape from the prototype: a permanently open 280px rail (brand, "Jump to"
 * search, grouped modules) whose submenus open as a panel anchored to the TOP
 * of the rail, beside it -- not as an accordion under the row. A module with
 * a nested group (Invoice -> Reports) renders that group as a labelled
 * section inside the panel, so there is no second level of expanding.
 *
 * The rail sits closed at 80px and opens to 280px on hover, expanding as an
 * OVERLAY so the page never reflows. That keeps the 80px flow footprint of the
 * old .lhs-nav, so index.css needs no change at all -- .rhs-sect can stay at
 * calc(100% - 110px). This component no longer uses the .lhs-nav class, so
 * those rules simply stop matching.
 *
 * Paths marked TODO have no route in App.jsx yet; they are wired to the most
 * likely path so the menu renders, but they need confirming.
 */

/* ==========================================================================
   Styles live in this file so the sidebar drops in as a single component.
   Injected into <head> once, keyed by id, so remounts never duplicate it.
   ========================================================================== */
const STYLE_ID = "ez-sidebar-styles";

/* Hover intent.
   Reaching the panel means travelling diagonally across the rows below the one
   you started on. With no delay, each row crossed switched the panel and
   leaving the rail's edge closed it, so the panel changed or vanished before
   the pointer ever arrived. Opening is quick, switching between modules waits
   long enough to cross a few rows, and leaving has a grace period. */
const HOVER_OPEN_MS = 90;
const HOVER_SWITCH_MS = 220;
const HOVER_CLOSE_MS = 320;

const SIDEBAR_CSS = `
/* ==========================================================================
   EazyWeek sidebar -- matches EazyWeek_Nav_Prototype.html

   Shape taken from the prototype recording: a permanently open 280px rail
   (brand, "Jump to" search, grouped modules) with submenus opening as a panel
   anchored to the TOP of the rail rather than inline under the row.

   LAYOUT: the rail holds its 280px in normal flow inside .ot-wrapper, so
   index.css needs one change -- see the note in the component header.
   ========================================================================== */

.ez-nav {
  --ez-field: #2b3f73;
  --ez-field-deep: #22335f;
  --ez-ink: #e8edf7;
  --ez-ink-dim: #a9b8d6;
  --ez-ink-faint: #7f93bb;
  --ez-accent: #dd7766;
  --ez-hover: #dd7766;
  --ez-active: rgba(255, 255, 255, 0.13);
  --ez-rule: rgba(255, 255, 255, 0.1);

  --ez-rail: 80px;   /* closed */
  --ez-w: 280px;     /* open */
  --ez-flyout-w: 268px;
  --ez-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --ez-ease-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* the in-flow footprint never changes -- only the fixed panel on top of it
     grows, so opening the rail cannot reflow the page */
  position: relative;
  flex: 0 0 var(--ez-rail);
  width: var(--ez-rail);
  min-width: var(--ez-rail);
  max-width: var(--ez-rail);
  align-self: stretch;
  background: var(--ez-field);
  font-family: "Inter", system-ui, sans-serif;
  font-size: 14px;
}

.ez-panel {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 900;
  display: flex;
  flex-direction: column;
  width: var(--ez-rail);
  overflow: hidden;
  background: var(--ez-field);
  color: var(--ez-ink);
  transition: width 0.34s var(--ez-ease), box-shadow 0.34s var(--ez-ease);
}
.ez-nav.is-open .ez-panel {
  width: var(--ez-w);
  box-shadow: 6px 0 28px rgba(5, 34, 76, 0.22);
}

/* everything that only makes sense once the rail is open */
.ez-wordmark,
.ez-nav .ez-search input,
.ez-kbd,
.ez-label,
.ez-nav .ez-chev {
  opacity: 0;
  transform: translateX(-6px);
  pointer-events: none;
  transition: opacity 0.22s var(--ez-ease), transform 0.28s var(--ez-ease-out);
}
.ez-nav.is-open .ez-wordmark,
.ez-nav.is-open .ez-search input,
.ez-nav.is-open .ez-kbd,
.ez-nav.is-open .ez-label,
.ez-nav.is-open .ez-chev {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.ez-nav .ez-search input{outline: transparent;}

/* ---------- brand ---------- */
.ez-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 20px;
  flex: 0 0 auto;
}
.ez-nav .ez-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  text-decoration: none;
}
.ez-nav .ez-logo img { width: 32px; height: auto; }
.ez-wordmark {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* ---------- "Jump to" search ---------- */
.ez-search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 10px;
  padding: 10px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  transition: background-color 0.18s var(--ez-ease), box-shadow 0.18s var(--ez-ease);
}
.ez-search:focus-within {
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}
.ez-search .bx { font-size: 17px; color: var(--ez-ink-faint);padding:10px 0; }
.ez-nav .ez-search input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  background: none;
  outline: none;
  color: #fff;
  font: inherit;
  font-size: 13px;
}
.ez-nav .ez-search input::placeholder { color: var(--ez-ink-faint); }
.ez-kbd {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--ez-rule);
  color: var(--ez-ink-faint);
  font-size: 11px;
  line-height: 16px;
}

/* closed: the search shrinks to just its icon, and group headings that would
   truncate to "VIS" / "CU5" become a hairline rule instead */
.ez-nav:not(.is-open) .ez-search {
  margin-left: 22px;
  margin-right: 22px;
  padding: 0 9px;
}
.ez-nav:not(.is-open) .ez-group-title {
  position: relative;
  height: 1px;
  margin: 18px 24px 12px;
  padding: 0;
  color: transparent;
  background: var(--ez-rule);
  overflow: hidden;
}
.ez-nav:not(.is-open) .ez-head { padding-left: 30px; }

/* ---------- scroll area ---------- */
.ez-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 0 28px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}
.ez-scroll::-webkit-scrollbar { width: 5px; }
.ez-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 5px;
}

/* ---------- group headings ---------- */
.ez-group-title {
  margin: 16px 0 4px;
  padding: 0 20px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ez-ink-faint);
  white-space: nowrap;
}

.ez-root {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ez-item { position: relative; }

/* ---------- module row ---------- */
.ez-nav .ez-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 10px 14px 10px 20px;
  background: none;
  border: 0;
  color: var(--ez-ink-dim);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.16s var(--ez-ease), background-color 0.16s var(--ez-ease);
}
.ez-nav .ez-head::before {
  content: "";
  position: absolute;
  left: 0;
  top: 5px;
  bottom: 5px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--ez-accent);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 0.26s var(--ez-ease-out), background-color 0.16s var(--ez-ease);
}
.ez-nav .ez-icon {
  display: block;
  font-size: 20px;
  flex: 0 0 20px;
  line-height: 1;
  transition: transform 0.26s var(--ez-ease-out);
}
.ez-label {
  flex: 1 1 auto;
  min-width: 0;          /* without this a flex child will not ellipsis */
  overflow: hidden;
  text-overflow: ellipsis;
}
.ez-nav .ez-chev {
  display: block;
  flex: 0 0 auto;
  font-size: 17px;
  color: var(--ez-ink-faint);
  transition: transform 0.24s var(--ez-ease-out), color 0.16s var(--ez-ease);
}

/* open module + current module */
.ez-item.is-open > .ez-head,
.ez-nav .ez-head.is-active {
  color: #fff;
  background: var(--ez-active);
}
.ez-item.is-open > .ez-head::before,
.ez-nav .ez-head.is-active::before,
.ez-item.is-current > .ez-head::before { transform: scaleY(1); }
.ez-item.is-current > .ez-head { color: #fff; }
.ez-item.is-current > .ez-head .ez-icon { color: var(--ez-accent); }
.ez-item.is-open > .ez-head .ez-chev { transform: translateX(2px); color: #fff; }

/* ---------- flyout panel ----------
   Anchored to the top of the rail, exactly as in the prototype: it does not
   follow the hovered row down the list.                                     */
.ez-flyout {
  position: fixed;
  top: 0;
  bottom: 0;            /* full viewport height, flush with the rail */
  left: var(--ez-w);
  z-index: 899;
  /* only ever shown while the rail is open, so it never floats beside a
     closed 80px rail */
  width: var(--ez-flyout-w);
  display: flex;
  flex-direction: column;
  padding: 14px 0 16px;
  background: #fff;
  border-right: 1px solid #e4e8f0;
  box-shadow: 10px 0 30px rgba(5, 34, 76, 0.12);

  opacity: 0;
  visibility: hidden;
  transform: translateX(-10px);
  transition: opacity 0.24s var(--ez-ease), transform 0.34s var(--ez-ease-out),
    visibility 0.24s;
}
.ez-flyout.is-shown {
  opacity: 1;
  visibility: visible;
  transform: none;
}

.ez-flyout-body {
  flex: 1 1 auto;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d7dded transparent;
}
.ez-flyout-body::-webkit-scrollbar { width: 5px; }
.ez-flyout-body::-webkit-scrollbar-thumb { background: #d7dded; border-radius: 5px; }

.ez-flyout-title {
  flex: 0 0 auto;
  margin: 0 0 8px;
  padding: 0 18px 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1c2b4a;
  border-bottom: 1px solid #eef1f6;
}
.ez-flyout-section {
  margin: 12px 0 2px;
  padding: 0 18px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8b9ab5;
}
.ez-flyout ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ez-nav .ez-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 18px;
  white-space: nowrap;
  color: #3d4c6b;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;

  /* staggered reveal -- --i is set inline per row */
  opacity: 0;
  transform: translateX(-8px);
  transition:
    opacity 0.22s var(--ez-ease) calc(var(--i, 0) * 24ms),
    transform 0.28s var(--ez-ease-out) calc(var(--i, 0) * 24ms),
    color 0.14s var(--ez-ease),
    background-color 0.14s var(--ez-ease);
}
.ez-flyout.is-shown .ez-link {
  opacity: 1;
  transform: none;
}
.ez-flyout .ez-sub-indent { padding-left: 30px; }

/* submenu rows carry their own icon; the dot is the fallback for any row
   that has not been given one */
.ez-nav .ez-subicon {
  display: block;
  flex: 0 0 18px;
  font-size: 17px;
  line-height: 1;
  color: #8391ac;
  transition: color 0.16s var(--ez-ease), transform 0.22s var(--ez-ease-out);
}
.ez-dot {
  flex: 0 0 5px;
  height: 5px;
  width: 5px;
  margin: 0 6px;
  border-radius: 50%;
  background: #c3cbdb;
  transition: background-color 0.16s var(--ez-ease), transform 0.22s var(--ez-ease-out);
}
.ez-nav .ez-link.is-active { color: #1c2b4a; font-weight: 600; }
.ez-nav .ez-link.is-active .ez-subicon { color: var(--ez-accent); }
.ez-nav .ez-link.is-active .ez-dot { background: var(--ez-accent); transform: scale(1.5); }

/* ---------- search results ---------- */
.ez-empty {
  padding: 6px 18px 2px;
  color: #8b9ab5;
  font-size: 13px;
}
.ez-crumb {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 42%;
  margin-left: auto;
  padding-left: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #9aa7c0;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

/* ---------- hover wash ----------
   Rows go solid coral, so anything inside carrying its own colour -- the
   current-module icon, the active dot, the chevron -- is forced white. Each
   selector is deliberately one class heavier than the rule it beats.        */
.ez-nav .ez-head:hover,
.ez-nav .ez-link:hover {
  background: var(--ez-hover);
  color: #fff;
}
.ez-nav .ez-item .ez-head:hover::before {
  transform: scaleY(1);
  background: #fff;
}
.ez-nav .ez-item .ez-head:hover .ez-icon,
.ez-nav .ez-item .ez-head:hover .ez-chev {
  color: #fff;
}
.ez-nav .ez-item .ez-head:hover .ez-icon { transform: translateY(-1px) scale(1.06); }
.ez-nav .ez-flyout .ez-link:hover .ez-subicon,
.ez-nav .ez-flyout .ez-link.is-active:hover .ez-subicon {
  color: #fff;
  transform: scale(1.06);
}
.ez-nav .ez-flyout .ez-link:hover .ez-dot,
.ez-nav .ez-flyout .ez-link.is-active:hover .ez-dot {
  background: #fff;
  transform: scale(1.4);
}
.ez-nav .ez-flyout .ez-link:hover .ez-crumb { color: rgba(255, 255, 255, 0.8); }

/* ---------- focus + reduced motion ---------- */
.ez-nav a:focus-visible,
.ez-nav button:focus-visible {
  outline: 2px solid var(--ez-accent);
  outline-offset: -2px;
}
/* the search box shows focus through its own background + inset ring, so it
   does not take the accent outline as well */
.ez-nav .ez-search input:focus,
.ez-nav .ez-search input:focus-visible {
  outline: none;
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .ez-nav *,
  .ez-panel,
  .ez-flyout {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`;

const useStyleEffect =
  typeof React.useInsertionEffect === "function" ? React.useInsertionEffect : useEffect;

const useSidebarStyles = () => {
  useStyleEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const tag = document.createElement("style");
    tag.id = STYLE_ID;
    tag.appendChild(document.createTextNode(SIDEBAR_CSS));
    document.head.appendChild(tag);
  }, []);
};

/* Flatten every reachable page once, for the "Jump to" search. */
const flattenPages = (groups) => {
  const out = [];
  groups.forEach((group, gi) => {
    group.items.forEach((item, ii) => {
      const moduleKey = nodeKey(`g${gi}`, item, ii);
      const walk = (node, key, trail) => {
        if (node.children) {
          node.children.forEach((c, i) =>
            walk(c, nodeKey(key, c, i), [...trail, node.name || node.label])
          );
          return;
        }
        if (!node.path) return;
        out.push({
          key,
          moduleKey,
          path: node.path,
          name: node.name || node.label,
          icon: node.icon,
          trail,
        });
      };
      walk(item, moduleKey, []);
    });
  });
  return out;
};

const NAV_GROUPS = [
  {
    group: "Business Pipeline",
    items: [
      {
        label: "Opportunity",
        icon: "bx-bell",
        feature: "opportunity",
        children: [
          { name: "Opportunity Dashboard", icon: "bx-grid-alt", path: "/opportunity" },
          { name: "Lead to Revenue Funnel", icon: "bx-filter", path: "/ltr-funnel" },
          { name: "Lead Disposition Rules", icon: "bx-list-check", path: "/masters/disposition" },
          { name: "Campaigns", icon: "bx-broadcast", path: "/opportunity" }, // TODO confirm campaigns route
          { name: "Opportunity Report - Detailed", icon: "bx-file", path: "/opportunity/detailed", feature: "reporting" },
          { name: "Opportunity Report - Summary", icon: "bx-bar-chart-alt-2", path: "/opportunity/summary", feature: "reporting" },
        ],
      },
    ],
  },
  {
    group: "Visit Operations",
    items: [
      {
        label: "Appointment",
        icon: "bx-calendar",
        feature: "appointment",
        children: [
          { name: "Schedule Board", icon: "bx-calendar-check", path: "/appointment" },
          { name: "Appointment Dashboard", icon: "bx-grid-alt", path: "/appointment/dashboard" },
        ],
      },
      {
        label: "Invoice",
        icon: "bx-receipt",
        feature: "billing",
        children: [
          { name: "Create Invoice", icon: "bx-receipt", path: "/invoice" },
          { name: "Cash Management", icon: "bx-wallet", path: "/invoice/cash-management" },
          { name: "Invoice Dashboard", icon: "bx-grid-alt", path: "/invoice/dashboard" },
          {
            name: "Reports",
            feature: "reporting",
            children: [
              { name: "Itemised Sales Report", icon: "bx-list-ul", path: "/reports/itemised-report" },
              { name: "Liability Report", icon: "bx-shield", path: "/reports/liability-report" },
              { name: "Payment Report", icon: "bx-credit-card", path: "/reports/payment-report" },
            ],
          },
        ],
      },
      {
        label: "E-Invoice",
        icon: "bx-file",
        feature: "billing",
        children: [
          { name: "E-Invoices List Page", icon: "bx-list-ul", path: "/einvoice" },
          { name: "E-Invoice Dashboard", icon: "bx-grid-alt", path: "/einvoice/detailed" }, // TODO confirm dashboard vs detailed
        ],
      },
    ],
  },
  {
    group: "Customer Care",
    items: [
      { label: "Customer 360", icon: "bx-user-circle", path: "/masters/customers" },
      {
        label: "Courtesy Call",
        icon: "bx-phone-call",
        feature: "courtesyCall",
        children: [
          { name: "Courtesy Call Queue", icon: "bx-phone", path: "/courtesy-call" },
          { name: "Courtesy Call Report - Detailed", icon: "bx-file", path: "/courtesy-call/report", feature: "reporting" },
        ],
      },
      {
        label: "Case Management",
        icon: "bx-purchase-tag-alt",
        feature: "caseManagement",
        children: [
          { name: "Create Case", icon: "bx-plus-circle", path: "/cases" },
          { name: "Case Categories", icon: "bx-category", path: "/case-categories" },
          { name: "Case Routing Rules", icon: "bx-shuffle", path: "/categories-mapping" },
          { name: "Escalation & SLA Rules", icon: "bx-trending-up", path: "/case-hierarchy" },
          {
            name: "Reports",
            feature: "reporting",
            children: [{ name: "Case Mgmt Report - Detailed", icon: "bx-file", path: "/case-detailed-report" }],
          },
        ],
      },
      {
        label: "Audit",
        icon: "bx-task",
        feature: "audit",
        children: [
          { name: "Create Audit", icon: "bx-plus-circle", path: "/auditsegmentview" },
          { name: "Audit Dashboard", icon: "bx-grid-alt", path: "/audit" },
          {
            name: "Reports",
            feature: "reporting",
            children: [
              { name: "Audit Report - Detailed", icon: "bx-file", path: "/audit/detailed" },
              { name: "Audit Report - Summary", icon: "bx-bar-chart-alt-2", path: "/audit/summary" },
            ],
          },
        ],
      },
    ],
  },
  {
    group: "Insights",
    items: [
      {
        label: "Operations, Marketing & Service Quality",
        icon: "bx-bar-chart-alt-2",
        feature: "reporting",
        children: [
          { name: "Itemised Sales Report", icon: "bx-list-ul", path: "/reports/itemised-report" },
          { name: "Liability Report", icon: "bx-shield", path: "/reports/liability-report" },
          { name: "Payment Report", icon: "bx-credit-card", path: "/reports/payment-report" },
          { name: "Opportunity Report - Detailed", icon: "bx-file", path: "/opportunity/detailed" },
          { name: "Opportunity Report - Summary", icon: "bx-bar-chart-alt-2", path: "/opportunity/summary" },
          { name: "Case Mgmt Report - Detailed", icon: "bx-file", path: "/case-detailed-report" },
          { name: "Audit Report - Detailed", icon: "bx-file", path: "/audit/detailed" },
          { name: "Audit Report - Summary", icon: "bx-bar-chart-alt-2", path: "/audit/summary" },
          { name: "Courtesy Call Report - Detailed", icon: "bx-file", path: "/courtesy-call/report" },
        ],
      },
    ],
  },
  {
    group: "Admin",
    items: [
      {
        label: "Organisation Structure",
        icon: "bx-network-chart",
        children: [
          { name: "Legal Entity", icon: "bx-buildings", path: "/settings/legal-entity" },
          { name: "Zone Setup", icon: "bx-map-alt", path: "/settings/zone-setup", feature: "multiLocation" },
          { name: "Centre Setup", icon: "bx-building-house", path: "/settings/centre-setup" },
          { name: "Organisation Hierarchy", icon: "bx-network-chart", path: "/settings/org-setup", feature: "multiLocation" },
        ],
      },
      {
        label: "Master Data",
        icon: "bx-data",
        children: [
          { name: "Customer", icon: "bx-user", path: "/masters/customers" },
          { name: "Service", icon: "bx-spa", path: "/masters/service" },
          { name: "Product", icon: "bx-box", path: "/masters/product" },
          { name: "Package", icon: "bx-package", path: "/masters/packages" },
          { name: "Employee", icon: "bx-id-card", path: "/masters/employees" },
          { name: "Practitioner & Centre Mapping", icon: "bx-user-pin", path: "/masters/practitioners" },
        ],
      },
      {
        label: "EMR",
        icon: "bx-detail",
        feature: "emr",
        children: [
          { name: "Form Builder", icon: "bx-edit-alt", path: "/emr/forms" },
          { name: "Ready Form Templates", icon: "bx-copy", path: "/emr/templates" }, // TODO not built yet
        ],
      },
      {
        label: "Shift Management",
        icon: "bx-time",
        children: [
          { name: "Shift Master", icon: "bx-time", path: "/shift/master" },
          { name: "Roster", icon: "bx-calendar-week", path: "/shift/roster" },
          { name: "My Shift", icon: "bx-user-check", path: "/shift/my" },
        ],
      },
      {
        label: "On Demand Triggers",
        icon: "bx-cloud-download",
        children: [{ name: "Run - Customer spent vs Customer Type", icon: "bx-play-circle", path: "/on-demand" }],
      },
      {
  label: "Data Migration",
  icon: "bx-upload",
  children: [
    { name: "Upload - Employees",     icon: "bx-id-card",         path: "/upload/employees" },
    { name: "Upload - Services",      icon: "bx-spa",             path: "/upload/services" },
    { name: "Upload - Products",      icon: "bx-box",             path: "/upload/products" },
    { name: "Upload - Packages",      icon: "bx-package",         path: "/upload/packages" },
    { name: "Upload - Practitioners", icon: "bx-user-voice",      path: "/upload/practitioners" },
    { name: "Upload - Customers",     icon: "bx-user",            path: "/upload/customers" },    // TODO
    { name: "Upload - Liabilities",   icon: "bx-shield",          path: "/upload/liabilities" },  // TODO
    { name: "Upload - Centres",       icon: "bx-building-house",  path: "/upload/centres" },      // TODO
  ],
},
      {
        label: "Settings",
        icon: "bx-cog",
        children: [
          { name: "Form Configuration", icon:"bx-lock", path:"/settings/formconfiguration", feature: "formconfiguartion"}, 
          { name: "Loyalty Setup", icon: "bx-gift", path: "/loyalty", feature: "loyalty" },
          { name: "Security Settings", icon: "bx-lock-alt", path: "/settings/security" },
           { name: "Audit Criteria", icon: "bx-form", path: "/audit/criteria" },
          { name: "Discount & Promotion", icon: "bx-purchase-tag", path: "/discounts/manage", feature: "discounts" },
        ],
      },
    ],
  },
  {
    // Renamed from the workbook's "Built-In Integrations" / "Custom
    // Integration" to match the prototype recording, which also adds Meta ads.
    group: "Integrations",
    items: [
      {
        label: "Ready API",
        icon: "bx-plug",
        children: [
          { name: "WhatsApp / WABA", icon: "bxl-whatsapp", path: "/integrations/waba" }, // TODO
          { name: "Instagram (CTWA)", icon: "bxl-instagram", path: "/integrations/instagram" }, // TODO
          { name: "Website", icon: "bx-globe", path: "/integrations/website" }, // TODO
          { name: "Meta ads", icon: "bxl-meta", path: "/integrations/meta-ads" }, // TODO
        ],
      },
      { label: "Custom API", icon: "bx-code-alt", path: "/integrations/custom" }, // TODO
    ],
  },
];

/* ------------------------------------------------------------------ */
/* License gating — recursive, because the tree is now three deep.     */
/* Same guard as before: with no licenseTier on currentUser, nothing   */
/* is hidden, so rollout stays risk-free.                              */
/* ------------------------------------------------------------------ */
const pruneByFeatures = (nodes, features) =>
  nodes
    .map((node) => {
      if (node.feature && !features?.[node.feature]) return null;
      if (!node.children) return node;
      const children = pruneByFeatures(node.children, features);
      return children.length ? { ...node, children } : null;
    })
    .filter(Boolean);

const nodeKey = (prefix, node, i) => `${prefix}/${node.label || node.name || i}`;

/* ------------------------------------------------------------------ */
/* Resolving "which row is the current page"                          */
/*                                                                    */
/* NavLink's own isActive cannot do this job here, for two reasons:   */
/*                                                                    */
/*   1. Ten routes appear TWICE — the Insights group deliberately     */
/*      re-lists every report that already lives under its module.    */
/*      A URL match lights up both copies.                            */
/*   2. Ten routes are prefixes of others (/audit vs /audit/detailed, */
/*      /invoice vs /invoice/dashboard, ...). NavLink without `end`   */
/*      matches on prefix, so "Audit Dashboard" also lights up while  */
/*      you are on the Audit detailed report.                         */
/*                                                                    */
/* So one key is resolved for the whole menu: longest path wins (that */
/* kills the prefix case), first occurrence wins on a tie (a report   */
/* highlights in its own module rather than in Insights), and a row   */
/* the user actually clicked overrides both for as long as the URL    */
/* still matches it.                                                  */
/* ------------------------------------------------------------------ */
const findActive = (groups, pathname) => {
  let best = null;

  const visit = (node, key, moduleKey) => {
    if (node.children) {
      node.children.forEach((child, i) => visit(child, nodeKey(key, child, i), moduleKey));
      return;
    }
    if (!node.path) return;
    const hit = pathname === node.path || pathname.startsWith(node.path + "/");
    if (!hit) return;
    if (!best || node.path.length > best.length) {
      best = { key, moduleKey, length: node.path.length };
    }
  };

  groups.forEach((group, gi) => {
    group.items.forEach((item, ii) => {
      const moduleKey = nodeKey(`g${gi}`, item, ii);
      if (item.children) {
        item.children.forEach((child, i) => visit(child, nodeKey(moduleKey, child, i), moduleKey));
      } else {
        visit(item, moduleKey, moduleKey);
      }
    });
  });

  return best || {};
};

const Sidebar = ({ currentUser }) => {
  useSidebarStyles();

  const location = useLocation();
  const searchRef = useRef(null);

  const groups = useMemo(() => {
    if (!currentUser?.licenseTier) return NAV_GROUPS;
    const features = getFeatureSet(currentUser);
    return NAV_GROUPS.map((g) => ({ ...g, items: pruneByFeatures(g.items, features) })).filter(
      (g) => g.items.length
    );
  }, [currentUser]);

  const pages = useMemo(() => flattenPages(groups), [groups]);

  // Which module's panel is showing, and its data.
  const [openItem, setOpenItem] = useState(null); // { key, item }
  const [query, setQuery] = useState("");
  const [clicked, setClicked] = useState(null);
  const [hovering, setHovering] = useState(false);
  // Set the moment a page link is used. Holds the rail shut even though the
  // pointer has not moved off it yet; cleared when the pointer does leave.
  const [dismissed, setDismissed] = useState(false);

  const isOpen = hovering && !dismissed;

  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const stopTimers = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);
  useEffect(() => stopTimers, [stopTimers]);

  const resolved = useMemo(() => findActive(groups, location.pathname), [groups, location.pathname]);
  const active = clicked && clicked.path === location.pathname ? clicked : resolved;

  const searching = query.trim().length > 0;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set();
    return pages
      .filter((p) => p.name.toLowerCase().includes(q) || p.trail.join(" ").toLowerCase().includes(q))
      // Ten routes appear in two places (Insights re-lists every report), so
      // without this every report matched twice. First occurrence wins, which
      // is the one in its own module.
      .filter((p) => !seen.has(p.path) && seen.add(p.path))
      .slice(0, 12);
  }, [query, pages]);

  // Shuts the panel and clears the search. Deliberately does NOT set
  // `dismissed` -- this runs on mount via the route effect below, and setting
  // it here left the rail dismissed before the pointer ever touched it, so the
  // first hover did nothing until you moved off and back.
  const closePanel = useCallback(() => {
    setOpenItem(null);
    setQuery("");
  }, []);

  const handleLeave = useCallback(() => {
    setHovering(false);
    setDismissed(false);
    setOpenItem(null);
    setQuery("");
  }, []);

  // Every navigation closes the panel and clears the search.
  useEffect(() => {
    closePanel();
  }, [location.pathname, closePanel]);

  // "/" focuses the search box, Escape closes.
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        clearTimeout(closeTimer.current);
        setHovering(true);
        setDismissed(false);
        searchRef.current?.focus();
      } else if (e.key === "Escape") {
        handleLeave();
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleLeave]);

  // Hovering a module: cancel any pending close, then schedule the switch.
  const hoverModule = useCallback(
    (key, item) => {
      clearTimeout(closeTimer.current);
      if (openItem?.key === key) return;
      clearTimeout(openTimer.current);
      openTimer.current = setTimeout(
        () => {
          setQuery("");
          setOpenItem({ key, item });
        },
        openItem ? HOVER_SWITCH_MS : HOVER_OPEN_MS
      );
    },
    [openItem]
  );

  // Hovering a row with no submenu (Home, Customer 360, Custom API): close the
  // panel, but on the same delay, so merely passing over one does not kill it.
  const hoverLeafRow = useCallback(() => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpenItem(null), HOVER_SWITCH_MS);
  }, []);

  // Arriving at the panel cancels both the pending switch from whichever rows
  // were crossed on the way, and the pending close.
  const enterPanel = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  const openPage = (key, moduleKey, path) => {
    stopTimers();
    setClicked({ key, moduleKey, path });
    closePanel();
    setDismissed(true); // hold it shut even though the pointer is still on it
  };

  const showPanel = isOpen && (searching || !!openItem);
  const panelTitle = searching ? "Results" : openItem?.item.label;

  /* One row inside the panel. */
  const renderLink = (node, key, moduleKey, i, indent, crumb) => (
    <li key={key}>
      <NavLink
        to={node.path}
        style={{ "--i": i }}
        className={`ez-link ${indent ? "ez-sub-indent" : ""} ${
          key === active.key ? "is-active" : ""
        }`}
        onClick={() => openPage(key, moduleKey, node.path)}
      >
        {node.icon ? (
          <i className={`bx ${node.icon} ez-subicon`} />
        ) : (
          <span className="ez-dot" />
        )}
        <span className="ez-label">{node.name || node.label}</span>
        {crumb ? <span className="ez-crumb">{crumb}</span> : null}
      </NavLink>
    </li>
  );

  /* Panel body: either search results, or the open module's children with any
     nested group rendered as a labelled section rather than a submenu. */
  const renderPanelBody = () => {
    if (searching) {
      if (!results.length) return <p className="ez-empty">No pages match that.</p>;
      return (
        <ul>
          {results.map((r, i) =>
            renderLink(r, r.key, r.moduleKey, i, false, r.trail[0])
          )}
        </ul>
      );
    }
    if (!openItem) return null;

    const { key: moduleKey, item } = openItem;
    let n = 0;
    return (
      <>
        {item.children.map((child, ci) => {
          const childKey = nodeKey(moduleKey, child, ci);
          if (!child.children) {
            return <ul key={childKey}>{renderLink(child, childKey, moduleKey, n++, false)}</ul>;
          }
          return (
            <div key={childKey}>
              <p className="ez-flyout-section">{child.name}</p>
              <ul>
                {child.children.map((leaf, li) =>
                  renderLink(leaf, nodeKey(childKey, leaf, li), moduleKey, n++, true)
                )}
              </ul>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <aside
      className={`ez-nav ${isOpen ? "is-open" : ""}`}
      onMouseEnter={() => {
        clearTimeout(closeTimer.current);
        setHovering(true);
      }}
      onMouseLeave={() => {
        clearTimeout(openTimer.current);
        closeTimer.current = setTimeout(handleLeave, HOVER_CLOSE_MS);
      }}
    >
      <div className="ez-panel">
        <div className="ez-brand">
          <a href="/dashboard" className="sw-logo ez-logo">
            <img src="/images/smallezywk.png" alt="" />
            <span className="ez-wordmark">eazyweek</span>
          </a>
        </div>

        <div className="ez-search">
          <i className="bx bx-search" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            placeholder="Jump to..."
            aria-label="Jump to a page"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenItem(null);
            }}
          />
          <span className="ez-kbd">/</span>
        </div>

        <nav className="ez-scroll">
          <ul className="ez-root">
            <li className={`ez-item ${location.pathname === "/dashboard" ? "is-current" : ""}`}>
              <NavLink
                to="/dashboard"
                className="ez-head"
                onMouseEnter={hoverLeafRow}
                onClick={() => openPage(null, null, "/dashboard")}
              >
                <i className="bx bx-home-alt ez-icon" />
                <span className="ez-label">Home</span>
              </NavLink>
            </li>
          </ul>

          {groups.map((group, gi) => (
            <section key={group.group}>
              <p className="ez-group-title">{group.group}</p>
              <ul className="ez-root">
                {group.items.map((item, ii) => {
                  const key = nodeKey(`g${gi}`, item, ii);
                  const isCurrent = key === active.moduleKey;
                  const menuOpen = openItem?.key === key;

                  // Module with no submenu (Customer 360, Custom API).
                  if (!item.children) {
                    return (
                      <li className={`ez-item ${isCurrent ? "is-current" : ""}`} key={key}>
                        <NavLink
                          to={item.path}
                          className={`ez-head ${key === active.key ? "is-active" : ""}`}
                          onMouseEnter={hoverLeafRow}
                          onClick={() => openPage(key, key, item.path)}
                        >
                          <i className={`bx ${item.icon} ez-icon`} />
                          <span className="ez-label">{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  }

                  return (
                    <li
                      className={`ez-item ${menuOpen ? "is-open" : ""} ${
                        isCurrent ? "is-current" : ""
                      }`}
                      key={key}
                    >
                      <button
                        type="button"
                        className="ez-head"
                        aria-expanded={menuOpen}
                        onMouseEnter={() => hoverModule(key, item)}
                        onFocus={() => setOpenItem({ key, item })}
                        onClick={() => setOpenItem(menuOpen ? null : { key, item })}
                      >
                        <i className={`bx ${item.icon} ez-icon`} />
                        <span className="ez-label">{item.label}</span>
                        <i className="bx bx-chevron-right ez-chev" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </div>

      <div
        className={`ez-flyout ${showPanel ? "is-shown" : ""}`}
        role="menu"
        onMouseEnter={enterPanel}
      >
        {panelTitle ? <p className="ez-flyout-title">{panelTitle}</p> : null}
        <div className="ez-flyout-body">{renderPanelBody()}</div>
      </div>
    </aside>
  );
};

export default Sidebar;