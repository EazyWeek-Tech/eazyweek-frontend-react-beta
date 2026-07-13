// ============================================================================
// SecuritySettings.jsx — the "Settings > Legal Entity > Security" page.
// Two tabs: Roles & Permissions (RoleMaster) and Audit Trail (SecurityAuditLog).
// Point your existing Security route at THIS component instead of RoleMaster.
//
// Adjust the two import paths below if these files aren't co-located.
// ============================================================================
import React, { useState } from "react";
import RoleMaster from "./RoleMaster";
import SecurityAuditLog from "./SecurityAuditLog";

const TABS = [
  { key: "roles", label: "Roles & Permissions" },
  { key: "audit", label: "Audit Trail" },
];

export default function SecuritySettings() {
  const [tab, setTab] = useState("roles");

  return (
    <div className="secset-wrap">
      <div className="secset-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`secset-tab ${tab === t.key ? "secset-tab-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="secset-body">
        {tab === "roles" ? <RoleMaster /> : <SecurityAuditLog />}
      </div>

      <style>{`
        .secset-wrap{font-family:Lato,system-ui,sans-serif}
        .secset-tabs{display:flex;gap:4px;border-bottom:1px solid #e7ecf4;padding:0 20px;margin-bottom:4px}
        .secset-tab{appearance:none;background:none;border:none;border-bottom:3px solid transparent;
          padding:12px 16px;font-size:14px;font-weight:700;color:#64748b;cursor:pointer}
        .secset-tab:hover{color:#334b71}
        .secset-tab-active{color:#071D49;border-bottom-color:#334b71}
      `}</style>
    </div>
  );
}