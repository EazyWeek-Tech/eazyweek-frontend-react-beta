import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getFeatureSet } from "../config/licenseConfig";

/**
 * EazyWeek navigation.
 *
 * Structure comes from Navigation - UI.xlsx (Sheet2): five groups, each holding
 * modules, each module holding pages -- and in three places a third level
 * ("Reports"). The old flat navItems array could not express that, so the tree
 * below is { group -> items -> children -> children }.
 *
 * LAYOUT NOTE: this component deliberately does NOT use the .lhs-nav class any
 * more. index.css caps .lhs-nav at max-width:80px and sets overflow:hidden,
 * which would clip this menu. Those rules are left untouched and simply no
 * longer match. The 80px flow footprint is reproduced here instead, so
 * .rhs-sect { width: calc(100% - 110px) } keeps working unchanged.
 *
 * PROP NOTE: `collapsed` is inherited from the old component, where it mapped
 * to the .expand class -- i.e. truthy means "pinned open", not "collapsed".
 * Same behaviour is preserved here as .is-pinned.
 *
 * Paths marked TODO have no route in App.jsx yet; they are wired to the most
 * likely path so the menu renders, but they need confirming.
 */

/* ==========================================================================
   Styles live in this file so the sidebar drops in as a single component.
   Injected into <head> once, keyed by id, so remounts never duplicate it.
   ========================================================================== */
const STYLE_ID = "ez-sidebar-styles";

const SIDEBAR_CSS = `
/* ==========================================================================
   EazyWeek sidebar
   --------------------------------------------------------------------------
   Layout contract with index.css:
     .ot-wrapper is display:flex, .rhs-sect is width:calc(100% - 110px).
     So the rail must occupy exactly 80px of flow, the same as the old
     .lhs-nav, and must EXPAND AS AN OVERLAY on top of the content rather
     than pushing it — otherwise the page reflows on every hover.

   .ez-nav (in flow)  = an 80px spacer, never changes width.
   .ez-panel (fixed)  = the visible rail, 80px -> 272px on hover / when pinned.

   The component no longer carries the .lhs-nav class, so none of the old
   sidebar rules in index.css apply to it. Nothing there needs deleting.
   ========================================================================== */

.ez-nav {
  --ez-field: #2b3f73;
  --ez-ink: #e8edf7;
  --ez-ink-dim: #a9b8d6;
  --ez-ink-faint: #7f93bb;
  --ez-accent: #dd7766;
  --ez-hover: rgba(255, 255, 255, 0.07);
  --ez-active: rgba(255, 255, 255, 0.13);
  --ez-rule: rgba(255, 255, 255, 0.6);

  --ez-rail: 80px;
  --ez-open: 272px;
  --ez-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --ez-ease-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* in-flow spacer — matches the old .lhs-nav footprint exactly */
  flex: 0 0 var(--ez-rail);
  width: var(--ez-rail);
  min-width: var(--ez-rail);
  max-width: var(--ez-rail);
  align-self: stretch;
  background: var(--ez-field);
  font-family: "Inter", system-ui, sans-serif;
  font-size: 14px;
}

/* the visible rail, lifted out of flow so expanding never reflows the page */
.ez-panel {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 900;
  display: flex;
  flex-direction: column;
  width: var(--ez-rail);
  background: var(--ez-field);
  color: var(--ez-ink);
  overflow: hidden;
  transition: width 0.3s var(--ez-ease), box-shadow 0.3s var(--ez-ease);
}

.ez-nav:hover .ez-panel,
.ez-nav.is-pinned .ez-panel {
  width: var(--ez-open);
  box-shadow: 6px 0 28px rgba(5, 34, 76, 0.22);
}

/* ---------- brand ---------- */
.ez-brand {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 20px;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--ez-rule);
}
.ez-nav .ez-logo img {
  width: 40px;
  height: auto;
  transition: transform 0.3s var(--ez-ease-out);
}
.ez-nav:is(:hover, .is-pinned) .ez-logo img {
  transform: scale(1.05);
}

/* ---------- scroll area ---------- */
.ez-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0 28px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}
.ez-scroll::-webkit-scrollbar { width: 5px; }
.ez-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 5px;
}

/* ---------- group headings ----------
   In rail state the text would truncate to "VIS" / "CU5", so it collapses
   to a hairline rule instead and fades back in as the rail opens.          */
.ez-group { position: relative; }

.ez-group-title {
  position: relative;
  margin: 16px 0 4px;
  padding: 0 20px;
  height: 16px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ez-ink-faint);
  white-space: nowrap;
  overflow: hidden;
}
/* the hairline shown while collapsed */
.ez-group-title::before {
  content: "";
  position: absolute;
  left: 24px;
  right: 24px;
  top: 7px;
  height: 1px;
  background: var(--ez-rule);
  opacity: 1;
  transition: opacity 0.18s var(--ez-ease);
}
.ez-group-title span {
  position: relative;
  display: inline-block;
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.24s var(--ez-ease) 0.06s, transform 0.3s var(--ez-ease-out) 0.06s;
}
.ez-nav:is(:hover, .is-pinned) .ez-group-title::before { opacity: 0; }
.ez-nav:is(:hover, .is-pinned) .ez-group-title span {
  opacity: 1;
  transform: none;
}

/* ---------- lists ---------- */
.ez-root,
.ez-sub-list {
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
  padding: 11px 16px 11px 26px;
  background: none;
  border: 0;
  color: var(--ez-ink-dim);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.18s var(--ez-ease), background-color 0.18s var(--ez-ease);
}

/* left accent bar — scales in from the centre */
.ez-nav .ez-head::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--ez-accent);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 0.26s var(--ez-ease-out);
}

.ez-nav .ez-head:hover {
  color: #fff;
  background: var(--ez-hover);
}
.ez-nav .ez-head:hover::before { transform: scaleY(0.5); }

.ez-item.is-open > .ez-head,
.ez-nav .ez-head.is-active {
  color: #fff;
  background: var(--ez-active);
}
.ez-item.is-open > .ez-head::before,
.ez-nav .ez-head.is-active::before { transform: scaleY(1); }

.ez-nav .ez-icon {
  display: block;
  font-size: 22px;
  flex: 0 0 22px;
  line-height: 1;
  transition: transform 0.26s var(--ez-ease-out);
}
.ez-nav .ez-head:hover .ez-icon { transform: translateY(-1px) scale(1.08); }

/* labels are hidden in rail state and slide in as it opens */
.ez-label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transform: translateX(-6px);
  pointer-events: none;
  transition: opacity 0.24s var(--ez-ease), transform 0.3s var(--ez-ease-out);
}
.ez-nav:is(:hover, .is-pinned) .ez-label {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

/* chevron */
.ez-nav .ez-chev {
  display: block;
  flex: 0 0 auto;
  font-size: 18px;
  color: var(--ez-ink-faint);
  opacity: 0;
  transition: transform 0.28s var(--ez-ease-out), opacity 0.2s var(--ez-ease),
    color 0.2s var(--ez-ease);
}
.ez-nav:is(:hover, .is-pinned) .ez-chev { opacity: 1; }
.ez-item.is-open > .ez-head .ez-chev,
.ez-branch.is-open > .ez-link .ez-chev {
  transform: rotate(180deg);
  color: var(--ez-accent);
}

/* ---------- the accordion ----------
   grid-template-rows 0fr -> 1fr animates to the real height with no JS
   measuring and no max-height guess that clips a long submenu.            */
.ez-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.32s var(--ez-ease-out);
}
.ez-item.is-open > .ez-collapse,
.ez-branch.is-open > .ez-collapse {
  grid-template-rows: 1fr;
}
.ez-collapse-inner {
  overflow: hidden;
  min-height: 0;
}
/* submenus stay shut while the rail is closed — hovering opens the rail,
   so there is never a state where you need a flyout */
.ez-nav:not(:hover):not(.is-pinned) .ez-collapse {
  grid-template-rows: 0fr;
}

/* ---------- submenu links ---------- */
.ez-nav .ez-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 16px 8px 36px;
  background: none;
  border: 0;
  color: var(--ez-ink-dim);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;

  /* staggered reveal — --i is set inline per row */
  opacity: 0;
  transform: translateX(-10px);
  transition:
    opacity 0.24s var(--ez-ease) calc(var(--i, 0) * 26ms),
    transform 0.3s var(--ez-ease-out) calc(var(--i, 0) * 26ms),
    color 0.16s var(--ez-ease),
    background-color 0.16s var(--ez-ease);
}
.ez-item.is-open .ez-link,
.ez-branch.is-open .ez-link {
  opacity: 1;
  transform: none;
}
.ez-nav .ez-link:hover {
  color: #fff;
  background: var(--ez-hover);
}
.ez-nav .ez-link.is-active {
  color: #fff;
  font-weight: 600;
}

/* third level indents once more */
.ez-branch .ez-sub-list .ez-link { padding-left: 52px; }

/* marker dot */
.ez-dot {
  flex: 0 0 5px;
  height: 5px;
  width: 5px;
  border-radius: 50%;
  background: var(--ez-ink-faint);
  transition: background-color 0.18s var(--ez-ease), transform 0.24s var(--ez-ease-out);
}
.ez-nav .ez-link:hover .ez-dot { transform: scale(1.4); background: var(--ez-ink); }
.ez-nav .ez-link.is-active .ez-dot { background: var(--ez-accent); transform: scale(1.5); }

.ez-branch.is-open > .ez-link--branch { color: #fff; }

/* ---------- focus + reduced motion ---------- */
.ez-nav a:focus-visible,
.ez-nav button:focus-visible {
  outline: 2px solid var(--ez-accent);
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .ez-nav *,
  .ez-panel {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`;

/* useInsertionEffect lands the <style> before layout is read. Read off the
   React namespace rather than as a named import, so this stays safe on React
   17 where the export does not exist; it falls back to useEffect. */
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

const NAV_GROUPS = [
  {
    group: "Business Pipeline",
    items: [
      {
        label: "Opportunity",
        icon: "bx-bell",
        feature: "opportunity",
        children: [
          { name: "Opportunity Dashboard", path: "/opportunity/dashboard" },
          { name: "Lead to Revenue Funnel", path: "/ltr-funnel" },
          { name: "Lead Disposition Rules", path: "/masters/disposition" },
          { name: "Campaigns", path: "/opportunity" }, // TODO confirm campaigns route
          { name: "Opportunity Report - Detailed", path: "/opportunity/detailed", feature: "reporting" },
          { name: "Opportunity Report - Summary", path: "/opportunity/summary", feature: "reporting" },
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
          { name: "Schedule Board", path: "/appointment" },
          { name: "Appointment Dashboard", path: "/appointment/dashboard" },
        ],
      },
      {
        label: "Invoice",
        icon: "bx-receipt",
        feature: "billing",
        children: [
          { name: "Create Invoice", path: "/invoice" },
          { name: "Cash Management", path: "/invoice/cash-management" },
          { name: "Invoice Dashboard", path: "/invoice/dashboard" },
          {
            name: "Reports",
            feature: "reporting",
            children: [
              { name: "Itemised Sales Report", path: "/reports/itemised-report" },
              { name: "Liability Report", path: "/reports/liability-report" },
              { name: "Payment Report", path: "/reports/payment-report" },
            ],
          },
        ],
      },
      {
        label: "E-Invoice",
        icon: "bx-file",
        feature: "billing",
        children: [
          { name: "E-Invoices List Page", path: "/einvoice" },
          { name: "E-Invoice Dashboard", path: "/einvoice/detailed" }, // TODO confirm dashboard vs detailed
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
          { name: "Courtesy Call Queue", path: "/courtesy-call" },
          { name: "Courtesy Call Report - Detailed", path: "/courtesy-call/report", feature: "reporting" },
        ],
      },
      {
        label: "Case Management",
        icon: "bx-purchase-tag-alt",
        feature: "caseManagement",
        children: [
          { name: "Create Case", path: "/cases" },
          { name: "Case Categories", path: "/case-categories" },
          { name: "Case Routing Rules", path: "/categories-mapping" },
          { name: "Escalation & SLA Rules", path: "/case-hierarchy" },
          {
            name: "Reports",
            feature: "reporting",
            children: [{ name: "Case Management Report - Detailed", path: "/case-detailed-report" }],
          },
        ],
      },
      {
        label: "Audit",
        icon: "bx-task",
        feature: "audit",
        children: [
          { name: "Create Audit", path: "/auditsegmentview" },
          { name: "Audit Dashboard", path: "/audit" },
          {
            name: "Reports",
            feature: "reporting",
            children: [
              { name: "Audit Report - Detailed", path: "/audit/detailed" },
              { name: "Audit Report - Summary", path: "/audit/summary" },
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
          { name: "Itemised Sales Report", path: "/reports/itemised-report" },
          { name: "Liability Report", path: "/reports/liability-report" },
          { name: "Payment Report", path: "/reports/payment-report" },
          { name: "Opportunity Report - Detailed", path: "/opportunity/detailed" },
          { name: "Opportunity Report - Summary", path: "/opportunity/summary" },
          { name: "Case Management Report - Detailed", path: "/case-detailed-report" },
          { name: "Audit Report - Detailed", path: "/audit/detailed" },
          { name: "Audit Report - Summary", path: "/audit/summary" },
          { name: "Courtesy Call Report - Detailed", path: "/courtesy-call/report" },
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
          { name: "Legal Entity", path: "/settings/legal-entity" },
          { name: "Zone Setup", path: "/settings/zone-setup", feature: "multiLocation" },
          { name: "Centre Setup", path: "/settings/centre-setup" },
          { name: "Organisation Hierarchy", path: "/settings/org-setup", feature: "multiLocation" },
        ],
      },
      {
        label: "Master Data",
        icon: "bx-data",
        children: [
          { name: "Customer", path: "/masters/customers" },
          { name: "Service", path: "/masters/service" },
          { name: "Product", path: "/masters/product" },
          { name: "Package", path: "/masters/packages" },
          { name: "Employee", path: "/masters/employees" },
          { name: "Practitioner & Centre Mapping", path: "/masters/practitioners" },
        ],
      },
      {
        label: "EMR",
        icon: "bx-detail",
        feature: "emr",
        children: [
          { name: "Form Builder", path: "/emr/forms" },
          { name: "Ready Form Templates", path: "/emr/templates" }, // TODO not built yet
        ],
      },
      {
        label: "Shift Management",
        icon: "bx-time",
        children: [
          { name: "Shift Master", path: "/shift/master" },
          { name: "Roster", path: "/shift/roster" },
          { name: "My Shift", path: "/shift/my" },
        ],
      },
      {
        label: "On Demand Triggers",
        icon: "bx-cloud-download",
        children: [{ name: "Run - Customer spent vs Customer Type", path: "/on-demand" }],
      },
      {
        label: "Data Migration",
        icon: "bx-upload",
        children: [
          { name: "Upload - Customers", path: "/upload/customers" }, // TODO
          { name: "Upload - Liabilities", path: "/upload/liabilities" }, // TODO
          { name: "Upload - Packages", path: "/upload/packages" }, // TODO
          { name: "Upload - Services", path: "/upload/services" }, // TODO
          { name: "Upload - Products", path: "/upload/products" }, // TODO
          { name: "Upload - Centres", path: "/upload/centres" }, // TODO
        ],
      },
      {
        label: "Settings",
        icon: "bx-cog",
        children: [
          { name: "Loyalty Setup", path: "/loyalty", feature: "loyalty" },
          { name: "Security Settings", path: "/settings/security" },
          { name: "Discount & Promotion", path: "/discounts/manage", feature: "discounts" },
        ],
      },
      {
        label: "Integrations",
        icon: "bx-plug",
        children: [
          {
            name: "Built-In Integrations",
            children: [
              { name: "WABA", path: "/integrations/waba" }, // TODO
              { name: "Instagram (CTWA)", path: "/integrations/instagram" }, // TODO
              { name: "Website", path: "/integrations/website" }, // TODO
            ],
          },
          { name: "Custom Integration", path: "/integrations/custom" }, // TODO
        ],
      },
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

/* Collect every branch key that contains the current pathname, so the
   active page's parents open automatically on load / route change. */
const branchesFor = (groups, pathname) => {
  const open = {};
  const walk = (nodes, prefix) => {
    let hit = false;
    nodes.forEach((node, i) => {
      const key = nodeKey(prefix, node, i);
      if (node.children) {
        if (walk(node.children, key)) {
          open[key] = true;
          hit = true;
        }
      } else if (node.path && (pathname === node.path || pathname.startsWith(node.path + "/"))) {
        hit = true;
      }
    });
    return hit;
  };
  groups.forEach((g, gi) => walk(g.items, `g${gi}`));
  return open;
};

const Sidebar = ({ collapsed, currentUser }) => {
  useSidebarStyles();

  const location = useLocation();

  const groups = useMemo(() => {
    if (!currentUser?.licenseTier) return NAV_GROUPS;
    const features = getFeatureSet(currentUser);
    return NAV_GROUPS.map((g) => ({ ...g, items: pruneByFeatures(g.items, features) })).filter(
      (g) => g.items.length
    );
  }, [currentUser]);

  const [open, setOpen] = useState({});

  // Open the branch that holds the current route.
  useEffect(() => {
    setOpen((prev) => ({ ...prev, ...branchesFor(groups, location.pathname) }));
  }, [location.pathname, groups]);

  const toggle = (key, depth) =>
    setOpen((prev) => {
      const wasOpen = !!prev[key];

      // Module level: accordion -- opening one closes the rest.
      if (depth === 0) return wasOpen ? {} : { [key]: true };

      // Deeper levels (Reports, Built-In Integrations): independent toggle,
      // everything already open stays open.
      const next = { ...prev };
      if (wasOpen) {
        // closing a branch closes anything nested inside it
        Object.keys(next).forEach((k) => k.startsWith(key) && delete next[k]);
      } else {
        next[key] = true;
      }
      return next;
    });

  const renderChildren = (nodes, prefix, depth) => (
    <ul className="ez-sub-list">
      {nodes.map((node, i) => {
        const key = nodeKey(prefix, node, i);
        const style = { "--i": i };

        if (node.children) {
          const isOpen = !!open[key];
          return (
            <li key={key} className={`ez-branch ${isOpen ? "is-open" : ""}`} style={style}>
              <button
                type="button"
                className="ez-link ez-link--branch"
                aria-expanded={isOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(key, depth);
                }}
              >
                <span className="ez-dot" />
                <span className="ez-label">{node.name}</span>
                <i className="bx bx-chevron-down ez-chev" />
              </button>
              <div className="ez-collapse">
                <div className="ez-collapse-inner">
                  {renderChildren(node.children, key, depth + 1)}
                </div>
              </div>
            </li>
          );
        }

        return (
          <li key={key} style={style}>
            <NavLink
              to={node.path}
              className={({ isActive }) => `ez-link ${isActive ? "is-active" : ""}`}
            >
              <span className="ez-dot" />
              <span className="ez-label">{node.name}</span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`ez-nav ${collapsed ? "is-pinned" : ""}`}
      onMouseLeave={() => setOpen(branchesFor(groups, location.pathname))}
    >
      <div className="ez-panel">
        <div className="ez-brand">
          <a href="/dashboard" className="sw-logo ez-logo">
            <img src="/images/smallezywk.png" alt="EazyWeek" />
          </a>
        </div>

        <nav className="ez-scroll">
          <ul className="ez-root">
            <li className="ez-item">
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `ez-head ${isActive ? "is-active" : ""}`}
              >
                <i className="bx bx-home-alt ez-icon" />
                <span className="ez-label">Home</span>
              </NavLink>
            </li>
          </ul>

          {groups.map((group, gi) => (
            <section className="ez-group" key={group.group}>
              <p className="ez-group-title">
                <span>{group.group}</span>
              </p>
              <ul className="ez-root">
                {group.items.map((item, ii) => {
                  const key = nodeKey(`g${gi}`, item, ii);
                  const isOpen = !!open[key];

                  // Module with no submenu (Customer 360) -- plain link.
                  if (!item.children) {
                    return (
                      <li className="ez-item" key={key}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) => `ez-head ${isActive ? "is-active" : ""}`}
                        >
                          <i className={`bx ${item.icon} ez-icon`} />
                          <span className="ez-label">{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  }

                  return (
                    <li className={`ez-item ${isOpen ? "is-open" : ""}`} key={key}>
                      <button
                        type="button"
                        className="ez-head"
                        aria-expanded={isOpen}
                        onClick={() => toggle(key, 0)}
                      >
                        <i className={`bx ${item.icon} ez-icon`} />
                        <span className="ez-label">{item.label}</span>
                        <i className="bx bx-chevron-down ez-chev" />
                      </button>

                      <div className="ez-collapse">
                        <div className="ez-collapse-inner">
                          {renderChildren(item.children, key, 1)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;