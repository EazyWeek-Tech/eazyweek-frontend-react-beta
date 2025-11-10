// src/pages/Opportunity/OpportunityDetails.jsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";

/** Date | 'yyyy-MM-dd' | 'dd/MM/yyyy' -> 'yyyy-MM-dd' */
const toISODateOnly = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
    if (Number.isNaN(+d)) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(s);
  return Number.isNaN(+dt) ? "" : toISODateOnly(dt);
};

const OpportunityDetails = () => {
  const { oppCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError("");

      try {
        // If dates are passed from Dashboard, use them; else: last 14 days window
        const now = new Date();
        const defaultFrom = new Date(now);
        defaultFrom.setDate(now.getDate() - 13);

        const fromDate = state?.fromDate || toISODateOnly(defaultFrom);
        const toDate   = state?.toDate   || toISODateOnly(now);

        const payload = { oppCode, fromDate, toDate };

        const res = await fetch(`${API_BASE_URL}/api/Opportunity/LoadOppDetails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const arr = Array.isArray(data) ? data : (data ? [data] : []);
        setHeader(arr[0] ?? null);
        setRows(arr);
      } catch (e) {
        console.error("Failed to load opportunity details:", e);
        setError("Failed to load details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [oppCode, state?.fromDate, state?.toDate]);

  const hasRows = rows?.length > 0;
  const safe = (v, fallback = "") => (v === null || v === undefined || v === "" ? fallback : v);

  // Primary header source: explicit header -> first row -> null
  const top = useMemo(() => header ?? (hasRows ? rows[0] : null), [header, hasRows, rows]);

  // Fallback header when API returned no rows:
  const fallbackHeader = useMemo(
    () => ({
      oppCode: oppCode,
      oppName: state?.oppName || "—",
      oRuleDetails: state?.oRuleDetails || "—",
      oRuleXvalue: state?.oRuleXvalue || "—",
    }),
    [oppCode, state?.oppName, state?.oRuleDetails, state?.oRuleXvalue]
  );

  // Manual vs rule-driven resolver (kept from your version)
  const inferIsManualLead = (row, hdr) => {
    if (row?.manualLead || row?.isManualLead) return true;
    if (hdr?.manualLead || hdr?.isManualLead) return true;
    if (!row?.oRuleCode && !hdr?.oRuleCode) return true;
    return false;
  };

  const openCustomer = (row) => {
    const isManual = inferIsManualLead(row, top);
    const path = isManual
      ? `/opportunity/${oppCode}/manual/${row.custID}`
      : `/opportunity/${oppCode}/customer/${row.custID}`;
    navigate(path, { state: { row, header: top, isManual } });
  };

  if (loading) return <div className="loading-msg">Loading…</div>;
  if (error) return <div className="loading-msg" style={{ color: "#c33" }}>{error}</div>;

  // Choose which header to show: API header when rows present, else fallback
  const H = top || fallbackHeader;

  return (
    <>
      <div className="dashboard-container">
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate("/opportunity")}>
            Opportunity
          </span>
          {" > "}
          <span className="breadcrumb-current">Details</span>
        </div>

        <div className="details-card">
          <div className="details-header">
            <div className="title-col">
              <div className="pair">
                <span className="label">Opportunity Code :</span>
                <span className="value pill">{safe(H.oppCode, "—")}</span>
              </div>
              <div className="pair">
                <span className="label">Opportunity Name :</span>
                <span className="value">{safe(H.oppName, "—")}</span>
              </div>
              <div className="pair">
                <span className="label">Rule Details :</span>
                <span className="value">{safe(H.oRuleDetails, "—")}</span>
              </div>
              <div className="xywrap">
                <div className="pair">
                  <span className="label short">X :</span>
                  <span className="value">{safe(H.oRuleXvalue, "—")}</span>
                </div>
                {safe(H.oRuleYvalue) ? (
                  <div className="pair">
                    <span className="label short">Y :</span>
                    <span className="value">{H.oRuleYvalue}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
          </div>

          {hasRows ? (
            <div className="table-wrap">
              <table className="opptable">
                <thead>
                  <tr>
                    <th>CustID</th>
                    <th>CustName</th>
                    <th>CustMobileNo</th>
                    <th>OppStatus</th>
                    <th>Appointment Date</th>
                    <th>Disposition</th>
                    <th>Remarks</th>
                    <th>Sales Owner</th>
                    <th>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.recid || r.custID || i}-${i}`}>
                      <td>
                        <button className="linkish" onClick={() => openCustomer(r)}>
                          {safe(r.custID, "—")}
                        </button>
                      </td>
                      <td>{safe(r.custName, "—")}</td>
                      <td>{safe(r.custMobileNo, "—")}</td>
                      <td>{safe(r.oppStatus, "—")}</td>
                      <td>{safe(r.appointmentdatetime, "—")}</td>
                      <td>{safe(r.disposition, "—")}</td>
                      <td>{safe(r.remarks, "—")}</td>
                      <td>{safe(r.salesOwner, "—")}</td>
                      <td>{safe(r.createddate, "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Clean empty state (just the header summary per your screenshot)
            <div className="empty-note">No data found for this opportunity.</div>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .breadcrumb { font-size:14px; color:#6c757d; margin-bottom:16px; }
        .breadcrumb-link { color:#334b71; cursor:pointer; }
        .breadcrumb-link:hover { text-decoration:underline; }
        .breadcrumb-current { color:#888; }
        .details-card { background:#fff; padding:24px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .details-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px; }
        .title-col { display:grid; gap:8px; }
        .pair { font-size:16px; color:#333; }
        .label { display:inline-block; font-weight:600; color:#555; margin-right:8px; min-width:180px; }
        .label.short { min-width:20px; }
        .value { color:#222; }
        .xywrap { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px 24px; max-width:640px; }
        .pill { background:#eef3ff; color:#334b71; padding:4px 10px; border-radius:20px; font-size:14px; }
        .btn-back { background:#14233c; color:#fff; border:0; border-radius:8px; padding:10px 18px; font-weight:600; cursor:pointer; }
        .btn-back:hover { opacity:.95; }
        .table-wrap { margin-top:16px; overflow-x:auto; border-radius:10px; }
        .opptable { width:100%; border-collapse:collapse; min-width:920px; }
        .opptable thead th { text-align:left; font-weight:600; font-size:14px; color:#445; background:#f6f8fb; padding:12px 14px; border-bottom:1px solid #e8edf5; white-space:nowrap; }
        .opptable tbody td { font-size:14px; color:#333; padding:12px 14px; border-bottom:1px solid #f0f2f6; vertical-align:middle; }
        .opptable tbody tr:hover { background:#fafbfe; }
        .linkish { background:none; border:none; padding:0; color:#2b5ec2; cursor:pointer; font-weight:600; }
        .empty-note { margin-top:12px; padding:14px; background:#f9fafc; border:1px dashed #e6eaf2; border-radius:8px; color:#5c6b7a; font-size:14px; }
        .loading-msg { padding:40px; text-align:center; font-size:18px; color:#666; }
      `}</style>
    </>
  );
};

export default OpportunityDetails;
