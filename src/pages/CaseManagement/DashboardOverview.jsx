// src/components/DashboardOverview.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

// ✅ If you already use API_BASE_URL in your project, replace API with API_BASE_URL below.
// import { API_BASE_URL } from "../config";

const API = "https://insightweb-hkhqgch8hadvcbb0.uaenorth-01.azurewebsites.net";

const BODY = {
  owner: "",
  priority: "",
  assignTo: "",
  status: "",
};

const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchCases = async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(`${API}/api/CaseOperation/CaseDB`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // If you use JWT instead of cookie-session, uncomment and set correct key:
            // Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          // ✅ IMPORTANT for session-based auth (your error was "Session expired or not set.")
          credentials: "include",
          body: JSON.stringify(BODY),
          signal: controller.signal,
        });

        if (!res.ok) {
          const t = await res.text();
          throw new Error(
            `HTTP ${res.status} ${res.statusText} | ${t.slice(0, 200)}`
          );
        }

        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error("DashboardOverview error:", e);
          setErr(e?.message || "Unknown error");
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
    return () => controller.abort();
  }, []);

  const counts = useMemo(() => {
    const c = {
      total: rows.length,

      // status based
      wip: 0,
      open: 0,
      closed: 0,
      resolved: 0,
      unresolved: 0,

      // category based
      request: 0,
      query: 0,
      complaint: 0,
      incident: 0,
      repair: 0,
      maintenance: 0,
    };

    for (const r of rows) {
      const status = normalize(r?.status);
      const category = normalize(r?.category);

      // ✅ Status counts
      if (status === "wip") c.wip += 1;
      else if (status === "open") c.open += 1;
      else if (status === "closed") c.closed += 1;
      else if (status === "resolved") c.resolved += 1;
      else if (status === "unresolved") c.unresolved += 1;

      // ✅ Category counts
      if (category === "request") c.request += 1;
      else if (category === "query") c.query += 1;
      else if (category === "complaint") c.complaint += 1;
      else if (category === "incident report") c.incident += 1;
      else if (category === "repair") c.repair += 1;
      else if (category === "maintenance") c.maintenance += 1;
    }

    return c;
  }, [rows]);

  const stats = useMemo(
    () => [
      // ---- Total ----
      {
        label: "Total Cases",
        value: counts.total,
        icon: <i className="bx bx-briefcase"></i>,
      },

      // ---- Status (after total, before request) ----
      {
        label: "WIP",
        value: counts.wip,
        icon: <i className="bx bxs-hourglass-bottom"></i>,
      },
      {
        label: "Open",
        value: counts.open,
        icon: <i className="bx bx-lock-open-alt"></i>,
      },
      {
        label: "Closed",
        value: counts.closed,
        icon: <i className="bx bx-lock-alt"></i>,
      },
      {
        label: "Resolved",
        value: counts.resolved,
        icon: <img src="/images/thumbsup.png" width="28" alt="" />,
      },
      {
        label: "Unresolved",
        value: counts.unresolved,
        icon: <img src="/images/unresolved.png" width="28" alt="" />,
      },

      // ---- Category ----
      {
        label: "Request",
        value: counts.request,
        icon: <img src="/images/request.png" width="28" alt="" />,
      },
      {
        label: "Query",
        value: counts.query,
        icon: <i className="bx bx-question-mark"></i>,
      },
      {
        label: "Complaint",
        value: counts.complaint,
        icon: <img src="/images/complaint.png" width="28" alt="" />,
      },
      {
        label: "Incident Report",
        value: counts.incident,
        icon: <img src="/images/incident.png" width="28" alt="" />,
      },
      {
        label: "Repair",
        value: counts.repair,
        icon: <img src="/images/repair.png" width="28" alt="" />,
      },
      {
        label: "Maintenance",
        value: counts.maintenance,
        icon: <img src="/images/main.png" width="28" alt="" />,
      },
    ],
    [counts]
  );

  return (
    <div className="casesoverview">
      {loading ? (
        <div
          className="overviewLoader"
          style={{ padding: 16, display: "flex", gap: 10, alignItems: "center" }}
        >
          <div className="spinner" />
          <span>Loading overview...</span>
        </div>
      ) : err ? (
        <div style={{ padding: 16, color: "#b00020" }}>
          <b>DashboardOverview API error:</b>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{err}</div>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default DashboardOverview;
