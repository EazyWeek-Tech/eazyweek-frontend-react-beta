// ============================================================================
// SecurityAuditLog.jsx — read-only viewer for the permission-change audit trail
// (NFR-02 / TC-045). Shows WHO changed WHAT, WHEN, and the OLD -> NEW value for
// every role-permission change and role create/delete.
//
// Reads GET /api/Security/audit (gated SEC.VIEW server-side). No writes.
// Integration shim matches RoleMaster.jsx (API_BASE / getToken).
// ============================================================================
import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = "/api"; // e.g. "http://localhost:8080/api" in dev
function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

// Server timezone. Timestamps are stored UTC; we render them in the server's
// zone so everyone (incl. viewers in other regions) sees "server time".
// UAE / Gulf Standard Time = UTC+4. Change here if the server moves (e.g. "Asia/Riyadh").
const SERVER_TZ = "Asia/Dubai";
const SERVER_TZ_LABEL = "GST";

async function authFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { ok: res.ok, status: res.status, json };
}
const unwrap = (json) =>
  Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : json?.data ?? [];

const fmtWhen = (v) => {
  if (!v) return "—";
  // ChangedAt is server UTC (SYSUTCDATETIME). Render it AS UTC — not the
  // viewer's local zone — so it always matches server time.
  let iso = String(v);
  // Plain "YYYY-MM-DD HH:MM:SS" (no zone) => treat as UTC.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(iso) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(iso)) {
    iso = iso.replace(" ", "T") + "Z";
  }
  const d = new Date(iso);
  if (isNaN(d)) return String(v);
  return d.toLocaleString("en-GB", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: SERVER_TZ,
  }) + " " + SERVER_TZ_LABEL;
};

// Describe a row's change in plain language.
function describe(row) {
  if (row.entityType === "ROLE") {
    if (row.action === "ROLE_CREATE") return { tone: "grant",  text: `Role created — ${row.newValue || ""}` };
    if (row.action === "ROLE_DELETE") return { tone: "revoke", text: `Role deleted — ${row.oldValue || ""}` };
    return { tone: "muted", text: row.action };
  }
  // PERMISSION
  const label = [row.module, row.area, row.activityName].filter(Boolean).join(" · ") || row.activityCode || "—";
  if (row.action === "GRANT")  return { tone: "grant",  text: `Granted — ${label}` };
  if (row.action === "REVOKE") return { tone: "revoke", text: `Revoked — ${label}` };
  return { tone: "muted", text: `${label} (${row.oldValue} → ${row.newValue})` };
}

export default function SecurityAuditLog() {
  const [rows, setRows]       = useState([]);
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [entityType, setEntityType] = useState("");   // "" | PERMISSION | ROLE
  const [roleId, setRoleId]         = useState("");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");

  // Roles for the filter dropdown.
  useEffect(() => {
    (async () => {
      const { ok, json } = await authFetch("/Security/roles");
      if (ok) setRoles(unwrap(json));
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const qs = new URLSearchParams();
    if (entityType) qs.set("entityType", entityType);
    if (roleId)     qs.set("roleId", roleId);
    if (fromDate)   qs.set("fromDate", fromDate);
    if (toDate)     qs.set("toDate", toDate);
    const { ok, status, json } = await authFetch(`/Security/audit?${qs.toString()}`);
    if (ok) {
      setRows(unwrap(json));
    } else {
      setRows([]);
      setError(status === 403
        ? "You do not have permission to view the audit log."
        : (json?.message || "Failed to load the audit log."));
    }
    setLoading(false);
  }, [entityType, roleId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const clearFilters = () => { setEntityType(""); setRoleId(""); setFromDate(""); setToDate(""); };

  const empty = !loading && rows.length === 0;

  return (
    <div className="sal-wrap">
      <div className="sal-head">
        <div>
          <h1 className="sal-title">Security — Audit Trail</h1>
          <div className="sal-sub">Every role-permission change (who · when · old → new). Read-only.</div>
        </div>
        <button className="sal-btn" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      <div className="sal-filters">
        <label className="sal-field">
          <span>Type</span>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">All</option>
            <option value="PERMISSION">Permission</option>
            <option value="ROLE">Role</option>
          </select>
        </label>
        <label className="sal-field">
          <span>Role</span>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.RECID} value={r.RECID}>{r.RNAME}</option>
            ))}
          </select>
        </label>
        <label className="sal-field">
          <span>From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="sal-field">
          <span>To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button className="sal-btn sal-btn-ghost" onClick={clearFilters} disabled={loading}>Clear</button>
      </div>

      {error && <div className="sal-error">{error}</div>}

      <div className="sal-tablewrap">
        <table className="sal-table">
          <thead>
            <tr>
              <th style={{ width: 160 }}>When</th>
              <th style={{ width: 140 }}>Changed by</th>
              <th style={{ width: 170 }}>Role</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {empty && (
              <tr><td colSpan={4} className="sal-empty">No audit records for the selected filters.</td></tr>
            )}
            {rows.map((row) => {
              const d = describe(row);
              return (
                <tr key={row.recId}>
                  <td className="sal-when">{fmtWhen(row.changedAt)}</td>
                  <td className="sal-who">{row.changedBy || "—"}</td>
                  <td className="sal-role">{row.roleName}{row.roleCode ? <span className="sal-dim"> ({row.roleCode})</span> : null}</td>
                  <td>
                    <span className={`sal-tag sal-tag-${d.tone}`} />
                    <span className="sal-change">{d.text}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      <style>{`
        .sal-wrap{font-family:Lato,system-ui,sans-serif;color:#10223f;padding:20px;max-width:1100px;margin:0 auto}
        .sal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
        .sal-title{font-size:22px;font-weight:800;color:#071D49;margin:0}
        .sal-sub{font-size:12px;color:#64748b;margin-top:4px}
        .sal-filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;margin-bottom:14px}
        .sal-field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#475569;font-weight:600}
        .sal-field select,.sal-field input{height:34px;border:1px solid #d8dee8;border-radius:8px;padding:0 8px;font-size:13px;outline:none;background:#fff}
        .sal-btn{height:34px;padding:0 16px;border:none;border-radius:8px;background:#334b71;color:#fff;font-weight:700;font-size:13px;cursor:pointer}
        .sal-btn:disabled{opacity:.6;cursor:default}
        .sal-btn-ghost{background:#fff;color:#334b71;border:1px solid #334b71}
        .sal-error{background:#fff1f2;color:#9f1239;border:1px solid #ffd5db;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600;margin-bottom:12px}
        .sal-tablewrap{border:1px solid #e7ecf4;border-radius:12px;overflow:hidden}
        .sal-table{width:100%;border-collapse:collapse;font-size:13px}
        .sal-table thead th{background:#f6f8fb;text-align:left;padding:10px 14px;font-weight:700;color:#334b71;border-bottom:1px solid #e7ecf4;white-space:nowrap}
        .sal-table tbody td{padding:10px 14px;border-bottom:1px solid #f0f3f8;vertical-align:middle}
        .sal-table tbody tr:last-child td{border-bottom:none}
        .sal-when{color:#334b71;font-weight:600;white-space:nowrap}
        .sal-who{font-weight:700}
        .sal-role{font-weight:600}
        .sal-dim{color:#94a3b8;font-weight:500}
        .sal-change{font-weight:600}
        .sal-tag{display:inline-block;width:8px;height:8px;border-radius:999px;margin-right:8px;vertical-align:middle}
        .sal-tag-grant{background:#0f7a4f}
        .sal-tag-revoke{background:#b91c1c}
        .sal-tag-muted{background:#94a3b8}
        .sal-empty{padding:26px;text-align:center;color:#94a3b8}
        .sal-foot{font-size:11px;color:#94a3b8;margin-top:10px}
      `}</style>
    </div>
  );
}