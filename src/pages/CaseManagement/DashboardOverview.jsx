// src/components/DashboardOverview.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";

const normalizeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    total: 0,
    wip: 0,
    open: 0,
    closed: 0,
    resolved: 0,
    unresolved: 0,
    request: 0,
    query: 0,
    complaint: 0,
    incident: 0,
    repair: 0,
    maintenance: 0,
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchCounts = async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseDBCount`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              // Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            credentials: "include", // ✅ session-based auth
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          const t = await res.text();
          throw new Error(
            `HTTP ${res.status} ${res.statusText} | ${t.slice(0, 200)}`
          );
        }

        const data = await res.json();

        setCounts({
          total: normalizeNum(data?.total),
          wip: normalizeNum(data?.wip),
          open: normalizeNum(data?.open),
          closed: normalizeNum(data?.closed),
          resolved: normalizeNum(data?.resolved),

          // backend variations handled
          unResolved: normalizeNum(
            data?.unresolved ?? data?.unResolved
          ),

          request: normalizeNum(data?.request),
          query: normalizeNum(data?.query),
          complaint: normalizeNum(data?.complaint),
          incident: normalizeNum(data?.incident),
          repair: normalizeNum(data?.repair),

          maintainenece: normalizeNum(
            data?.maintenance ?? data?.maintainenece
          ),
        });
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error("DashboardOverview error:", e);
          setErr(e?.message || "Unknown error");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
    return () => controller.abort();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total Cases", value: counts.total, icon: <i className="bx bx-briefcase"></i> },

      { label: "WIP", value: counts.wip, icon: <i className="bx bxs-hourglass-bottom"></i> },
      { label: "Open", value: counts.open, icon: <i className="bx bx-lock-open-alt"></i> },
      { label: "Closed", value: counts.closed, icon: <i className="bx bx-lock-alt"></i> },
      { label: "Resolved", value: counts.resolved, icon: <img src="/images/thumbsup.png" width="28" alt="" /> },
      { label: "Unresolved", value: counts.unResolved, icon: <img src="/images/unresolved.png" width="28" alt="" /> },

      { label: "Request", value: counts.request, icon: <img src="/images/request.png" width="28" alt="" /> },
      { label: "Query", value: counts.query, icon: <i className="bx bx-question-mark"></i> },
      { label: "Complaint", value: counts.complaint, icon: <img src="/images/complaint.png" width="28" alt="" /> },
      { label: "Incident Report", value: counts.incident, icon: <img src="/images/incident.png" width="28" alt="" /> },
      { label: "Repair", value: counts.repair, icon: <img src="/images/repair.png" width="28" alt="" /> },
      { label: "Maintenance", value: counts.maintainenece, icon: <img src="/images/main.png" width="28" alt="" /> },
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
