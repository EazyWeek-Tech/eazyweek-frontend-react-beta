"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const norm = (s) => (s ?? "").toString().trim();

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const toDMY = (iso /* yyyy-mm-dd */) => {
  const [y,m,d] = (iso || "").split("-");
  if (!y || !m || !d) return iso || "";
  return `${d}-${Number(m)}-${y}`;
};

const toMidnightUtc = (iso /* yyyy-mm-dd */) => `${iso}T00:00:00.000Z`;

// Parse "5%" or " 10 % " → 5 (number)
const parseWeight = (w) => {
  if (!w) return 0;
  const m = String(w).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

export default function AuditForm() {
  const qs = useQuery();

  // header data passed via URL from AuditCreate
  const segment        = norm(qs.get("segment"));
  const clinicCode     = norm(qs.get("clinicCode"));
  const clinicName     = norm(qs.get("clinicName"));
  const auditMonth     = norm(qs.get("auditMonth")); // "Sep"
  const year           = norm(qs.get("year"));
  const auditDateISO   = norm(qs.get("auditDate"));  // yyyy-mm-dd
  const mode           = norm(qs.get("mode"));       // "digital" | "standard"

  // who is audited
  const employeeCode   = norm(qs.get("employeeCode"));   // standard
  const doctorCode     = norm(qs.get("doctorCode"));     // digital
  const departmentCode = norm(qs.get("departmentCode")); // digital
  const managerCode    = norm(qs.get("managerCode"));    // digital

  // optional: if your app knows the current user name/id, set it here
  const auditor        = norm(qs.get("auditor")); // leave blank if you don't have it

  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(false);

  // row state
  // scores: null = not answered; 0 or 1 = user choice
  const [scores, setScores] = useState({});    // { [criteriaCode]: 0|1|null }
  const [remarks, setRemarks] = useState({});  // { [criteriaCode]: string }

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "error", ms = 2400) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  // load criteria by segment
  useEffect(() => {
    if (!segment) return;
    (async () => {
      try {
        setLoading(true);
        const seg = encodeURIComponent(segment);
        const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditSegmentCriteria/${seg}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data ? [data] : []);

        // initialize scores with null (force user to choose 0/1 for each row)
        const initScores = {};
        for (const row of list) {
          if (row?.criteriaCode) initScores[row.criteriaCode] = null;
        }
        setScores(initScores);
        setCriteria(list);
      } catch (e) {
        console.error(e);
        showToast("Failed to load audit criteria");
      } finally {
        setLoading(false);
      }
    })();
  }, [segment]);

  // compute a row's total based on score (0/1) and weightage
  const rowTotal = (code, weightage) => {
    const s = scores[code];
    if (s === 1) return parseWeight(weightage);
    return 0;
  };

  // compute gross total (sum of row totals)
  const grossTotal = criteria.reduce((sum, row) => {
    const code = row.criteriaCode;
    return sum + rowTotal(code, row.weightage);
  }, 0);

  const handleScoreChange = (code, valStr) => {
    const val = valStr === "" ? null : Number(valStr);  // "" keeps as null
    setScores((prev) => ({ ...prev, [code]: val }));
  };

  const handleRemarkChange = (code, text) => {
    setRemarks((prev) => ({ ...prev, [code]: text }));
  };

  // Validate all rows answered (0 or 1)
  const validateAllAnswered = () => {
    for (const row of criteria) {
      const code = row.criteriaCode;
      const s = scores[code];
      if (!(s === 0 || s === 1)) {
        return { ok: false, code };
      }
    }
    return { ok: true };
  };

  // Build payload for /api/Audit/AuditCreation
  const buildPayload = (isDraft) => {
    const subSegmentJson = criteria.map((row) => {
      const code = row.criteriaCode;
      const s = scores[code]; // 0 | 1
      const weight = String(row.weightage ?? "");
      const totalVal = s === 1 ? parseWeight(weight) : 0;

      return {
        auditNo: "", // server usually generates; leave blank
        criteria: String(row.criteria ?? ""),
        score: String(s ?? ""),                    // "0" or "1"
        weightage: weight,                         // as string, e.g., "5%"
        totalScore: String(totalVal),              // "0" or "5"
        auditorRemarks: String(remarks[code] ?? ""),
        subSegment: String(row.subSegment ?? ""),
        criteriaCode: String(code ?? ""),
        valuePresent: String(s ?? ""),             // mirror of score (0/1)
      };
    });

    const base = {
      auditSegment: segment,
      subSegment: "", // not required at header level; details inside subSegmentJson
      auditDate: toMidnightUtc(auditDateISO),
      auditMonth: auditMonth,                     // string, e.g., "Sep"
      auditor: auditor,                           // if available
      employeeCode: mode === "digital" ? "" : employeeCode,
      doctorCode:   mode === "digital" ? doctorCode : "",
      managerCode:  mode === "digital" ? managerCode : "",
      departmentCode: mode === "digital" ? departmentCode : "",
      auditYear: String(year || ""),
      grossTotalScore: grossTotal,                // number
      isDraft: isDraft ? 1 : 0,
      subSegmentJson,
    };

    return base;
  };

  const postAuditCreation = async (payload) => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/Audit/AuditCreation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = data?.responseMessage || `Save failed (HTTP ${r.status})`;
        throw new Error(msg);
      }
      return data;
    } finally {
      setSaving(false);
    }
  };

  const onSaveOrSubmit = async (isDraft) => {
    // Must answer every row (0/1)
    const check = validateAllAnswered();
    if (!check.ok) {
      return showToast("Please answer all criteria (Yes/No) before continuing.");
    }

    const payload = buildPayload(isDraft);
    try {
      const res = await postAuditCreation(payload);
      const msg =
        res?.responseMessage ||
        (isDraft ? "Saved as draft." : "Submitted successfully.");
      showToast(msg, "success", 2600);
      // optional: navigate back/list here
    } catch (e) {
      console.error(e);
      showToast(e.message || "Could not save. Please try again.");
    }
  };

  return (
    <div className="wrap">
      <h1 className="title">Fill Audit Segment Details</h1>

      {/* Header summary filled from URL */}
      <div className="summary">
        <div><b>Audit Segment :</b> {segment || "—"}</div>
        <div><b>Clinic :</b> {clinicName || clinicCode || "—"}</div>
        <div><b>Audit Month :</b> {auditMonth ? `${auditMonth} / ${year || "—"}` : "—"}</div>
        <div><b>Audit Date :</b> {toDMY(auditDateISO) || "—"}</div>
        {mode === "digital" ? (
          <>
            <div><b>Doctor/Therapist :</b> {doctorCode || "—"}</div>
            <div><b>Department :</b> {departmentCode || "—"}</div>
            <div><b>Manager :</b> {managerCode || "—"}</div>
          </>
        ) : (
          <div><b>Employee Name :</b> {employeeCode || "—"}</div>
        )}
      </div>

      {/* Criteria table */}
      <div className="card">
        {loading ? (
          <div className="loading">Loading criteria…</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width: 36}}>#</th>
                <th>Sub Segment</th>
                <th>Criteria</th>
                <th style={{width: 120}}>Score (0/1)</th>
                <th style={{width: 100}}>Weightage</th>
                <th style={{width: 120}}>Total Score</th>
                <th style={{width: 220}}>Remarks (optional)</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((row, idx) => {
                const code = row.criteriaCode;
                const weight = row.weightage;
                const s = scores[code]; // null | 0 | 1
                const total = rowTotal(code, weight);

                return (
                  <tr key={code || idx}>
                    <td>{idx + 1}</td>
                    <td>{row.subSegment || "—"}</td>
                    <td>
                      {/* API returns HTML */}
                      <div
                        className="criteriaHtml"
                        dangerouslySetInnerHTML={{ __html: row.criteria || "" }}
                      />
                    </td>
                    <td>
                      <select
                        value={s === null || s === undefined ? "" : String(s)}
                        onChange={(e) => handleScoreChange(code, e.target.value)}
                      >
                        <option value="">— Select —</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                      </select>
                    </td>
                    <td>{weight || "—"}</td>
                    <td><b>{total}</b></td>
                    <td>
                      <input
                        type="text"
                        value={remarks[code] ?? ""}
                        onChange={(e) => handleRemarkChange(code, e.target.value)}
                        placeholder="Add remarks…"
                      />
                    </td>
                  </tr>
                );
              })}
              {criteria.length === 0 && (
                <tr>
                  <td colSpan={7} style={{textAlign:"center", padding:"16px"}}>
                    No criteria found.
                  </td>
                </tr>
              )}
            </tbody>
           {/*  {criteria.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: "right", fontWeight: 700 }}>
                    Gross Total:
                  </td>
                  <td style={{ fontWeight: 700 }}>{grossTotal}</td>
                  <td />
                </tr>
              </tfoot>
            )} */}
          </table>
        )}

        <div className="actions">
          <button
            className="btn"
            onClick={() => onSaveOrSubmit(true)}
            disabled={saving || loading || criteria.length === 0}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            className="btn primary"
            onClick={() => onSaveOrSubmit(false)}
            disabled={saving || loading || criteria.length === 0}
          >
            {saving ? "Submitting…" : "Submit"}
          </button>
          {/* implement your own Back nav if needed */}
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .wrap { max-width: 1200px; margin: 0 auto; padding: 16px; }
        .title { margin: 6px 0 14px; font-size: 22px; color: #0b1f3a; }
        .summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap:  16px;
          font-weight: 700;
          background:#fff; border-radius:10px; padding:12px 14px; margin-bottom:12px;
          box-shadow:0 1px 3px rgba(0,0,0,.06);
        }
        .card { background:#fff; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.06); padding:12px; }
        .tbl { width:100%; border-collapse:collapse; }
        th, td { border:1px solid #e5e8ef; padding:8px; vertical-align:top; font-size: 14px; line-height: 18px; }
        th { background:#f7f9fc; text-align:left; }
        .criteriaHtml b { font-weight: 700; }
        select, input[type="text"] { width:100%; height:34px; border:1px solid #d8dee8; border-radius:8px; padding:0 8px; }
        .actions { display:flex; gap:8px; justify-content:center; margin-top:14px; }
        .btn { background:#1d2c43; color:#fff; border:none; border-radius:8px; padding:8px 18px; font-weight:700; cursor:pointer; }
        .btn.primary { background:#112032; }
        .btn[disabled] { opacity:.7; cursor:not-allowed; }
        .loading { padding:16px; text-align:center; }
        .toast { position: fixed; bottom: 16px; right: 16px; color:#fff; background:#d7263d; padding:10px 14px; border-radius:8px; font-weight:600; box-shadow:0 6px 18px rgba(0,0,0,0.15); z-index:9999; }
        .toast.success { background:#138a36; }
        @media (max-width: 900px) { .summary { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
