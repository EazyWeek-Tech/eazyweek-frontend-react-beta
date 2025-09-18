"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

// helpers
const num = (v) => {
  const n = Number(String(v).replace(/[^\d.-]/g, "")); // handles "3%" etc.
  return Number.isFinite(n) ? n : 0;
};
const txt = (v) => (v == null ? "" : String(v));

// dd/MM/yyyy -> yyyy-MM-dd
const dmyToIso = (dmy) => {
  if (!dmy) return "";
  const [d, m, y] = String(dmy).split(/[\/\-]/);
  if (!y || !m || !d) return "";
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
};

// yyyy-MM-dd -> midnight UTC string
const toMidnightUtc = (iso) => (iso ? `${iso}T00:00:00.000Z` : "");

// Parse "5%" -> 5
const parseWeight = (w) => {
  if (!w) return 0;
  const m = String(w).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

export default function AuditDraftDetails() {
  const navigate = useNavigate();
  const { auditNo = "" } = useParams();
  const [searchParams] = useSearchParams();

  // optional values passed via URL from dashboard
  const clinicFromUrl = searchParams.get("clinic") || "";
  const employeeFromUrl = searchParams.get("employee") || "";
  const auditorFromUrl = searchParams.get("auditor") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);

  // editable state
  const [scores, setScores] = useState({});   // { [criteriaCode]: 0|1|null }
  const [remarks, setRemarks] = useState({}); // { [criteriaCode]: string }

  // saving state / toast
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "error", ms = 2400) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      const tries = [
        () =>
          fetch(
            `${API_BASE_URL}/api/Audit/GetAuditDraftDetails/${encodeURIComponent(
              auditNo
            )}`,
            { method: "GET", credentials: "include", headers: { Accept: "application/json" } }
          ),
        () =>
          fetch(
            `${API_BASE_URL}/api/Audit/GetAuditDraftDetails/${encodeURIComponent(
              auditNo
            )}`,
            {
              method: "POST",
              credentials: "include",
              headers: { Accept: "application/json", "Content-Type": "application/json" },
              body: null,
            }
          ),
      ];

      let data;
      let lastErr = "";
      for (const go of tries) {
        try {
          const res = await go();
          if (!res.ok) {
            const t = await res.text().catch(() => "");
            lastErr = `HTTP ${res.status}${t ? ` · ${t.slice(0, 180)}` : ""}`;
            continue;
          }
          const text = await res.text();
          data = text ? JSON.parse(text) : [];
          break;
        } catch (e) {
          lastErr = e?.message || "Network error";
        }
      }
      if (!data) {
        if (!cancelled) {
          setError(lastErr || "Failed to load audit details");
          setLoading(false);
        }
        return;
      }

      try {
        const list = Array.isArray(data) ? data : [data].filter(Boolean);

        // Header from first row (fallback to URL)
        const h0 = list[0] ?? {};
        const H = {
          auditNo: auditNo,
          managerName: txt(h0.managerName),
          employeeName:
            txt(h0.employeeName ?? h0.employee ?? h0.doctorName ?? h0.therapistName) ||
            employeeFromUrl,
          clinicName: txt(h0.clinicName ?? h0.clinic ?? h0.center) || clinicFromUrl,
          auditorName: txt(h0.auditorName ?? h0.auditor ?? h0.auditorsName) || auditorFromUrl,
          auditSegment: txt(h0.audtiSegment ?? h0.auditSegment ?? h0.segment),
          auditMonth: txt(h0.auditMonth),
          auditDateDMY: txt(h0.auditDate), // e.g., 11/04/2025
        };

        // Normalize rows and seed editable state
        const R = list.map((r, i) => {
          const weightageStr = txt(r.weightage); // e.g., "3%"
          const weightageNum = parseWeight(weightageStr);
          const scoreNum = r.valuePresent != null ? Number(r.valuePresent) : num(r.score);
          const total = r.totalScore != null ? num(r.totalScore) : scoreNum ? weightageNum : 0;

          return {
            id: r.id ?? `${i}`,
            subSegment: txt(r.subSegment),
            criteria: txt(r.criteria),
            criteriaCode: txt(r.criteriaCode), // important for payload
            score: (scoreNum === 0 || scoreNum === 1) ? scoreNum : null, // normalize to 0/1/null
            weightageStr,
            weightageNum,
            totalScore: total,
            remarks: txt(r.auditRemarks),
          };
        });

        // Build maps for UI controls
        const initScores = {};
        const initRemarks = {};
        for (const row of R) {
          const code = row.criteriaCode || row.id;
          initScores[code] = row.score;          // 0|1|null
          initRemarks[code] = row.remarks || "";
        }

        if (!cancelled) {
          setHeader(H);
          setRows(R);
          setScores(initScores);
          setRemarks(initRemarks);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to parse response");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [auditNo, API_BASE_URL, clinicFromUrl, employeeFromUrl, auditorFromUrl]);

  // compute row total
  const rowTotal = (criteriaCode, weightageStr) => {
    const s = scores[criteriaCode];
    if (s === 1) return parseWeight(weightageStr);
    return 0;
  };

  // grand total (sum of row totals)
  const grandTotal = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const code = r.criteriaCode || r.id;
        return sum + rowTotal(code, r.weightageStr);
      }, 0),
    [rows, scores]
  );

  // UI handlers
  const setScore = (criteriaCode, valStr) => {
    const val = valStr === "" ? null : Number(valStr);
    setScores((prev) => ({ ...prev, [criteriaCode]: val }));
  };
  const setRemark = (criteriaCode, value) => {
    setRemarks((prev) => ({ ...prev, [criteriaCode]: value }));
  };

  // validation: 0/1 on all rows
  const validateAllAnswered = () => {
    for (const r of rows) {
      const code = r.criteriaCode || r.id;
      const s = scores[code];
      if (!(s === 0 || s === 1)) return { ok: false, code };
    }
    return { ok: true };
  };

  // Build payload exactly like your AuditForm sample
  const buildPayload = (isDraft) => {
    const subSegmentJson = rows.map((r) => {
      const code = r.criteriaCode || r.id;
      const s = scores[code]; // 0 | 1
      const weight = String(r.weightageStr ?? "");
      const totalVal = s === 1 ? parseWeight(weight) : 0;

      return {
        auditNo: "", // server usually generates; keep blank
        criteria: String(r.criteria || ""),
        score: String(s ?? ""),                 // "0" or "1"
        weightage: weight,                      // "5%"
        totalScore: String(totalVal),           // "0" or "5"
        auditorRemarks: String(remarks[code] ?? ""),
        subSegment: String(r.subSegment || ""),
        criteriaCode: String(code || ""),
        valuePresent: String(s ?? ""),          // mirror 0/1
      };
    });

    // derive year from the audit date when possible
    const iso = dmyToIso(header?.auditDateDMY || "");
    const year = iso ? iso.slice(0, 4) : "";

    return {
      auditSegment: header?.auditSegment || "",
      subSegment: "",
      auditDate: toMidnightUtc(iso),
      auditMonth: header?.auditMonth || "",
      auditor: header?.auditorName || auditorFromUrl || "",
      employeeCode: "",     // unknown here; keep blank (OK per sample)
      doctorCode: "",
      managerCode: "",
      departmentCode: "",
      auditYear: String(year || ""),
      grossTotalScore: grandTotal, // number
      isDraft: isDraft ? 1 : 0,
      subSegmentJson,
    };
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
    const check = validateAllAnswered();
    if (!check.ok) {
      return showToast("Please answer all criteria (0 or 1) before continuing.");
    }
    const payload = buildPayload(isDraft);
    try {
      const res = await postAuditCreation(payload);
      const msg = res?.responseMessage || (isDraft ? "Saved as draft." : "Submitted successfully.");
      showToast(msg, "success", 2600);
    } catch (e) {
      console.error(e);
      showToast(e.message || "Could not save. Please try again.");
    }
  };

  return (
    <div className="audit-details">
      <div className="page-head">
        <div className="crumbs">
          <button className="crumb link" onClick={() => navigate(-1)}>Audit</button>
          <span className="sep">›</span>
          <span className="muted">Create</span>
        </div>
        <h1 className="title">Fill Audit Segment Details</h1>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : error ? (
          <div className="error">Error: {error}</div>
        ) : (
          <>
            {/* Header summary */}
            <div className="summary">
              <div><strong>Audit No :</strong> <span>{header?.auditNo}</span></div>
              <div><strong>Manager Name :</strong> <span>{header?.managerName}</span></div>
              <div><strong>Employee/Doctor/Therapist :</strong> <span>{header?.employeeName}</span></div>
              <div><strong>Audit Segment :</strong> <span>{header?.auditSegment}</span></div>
              <div><strong>Clinic :</strong> <span>{header?.clinicName}</span></div>
              <div><strong>Auditor’s :</strong> <span>{header?.auditorName}</span></div>
              <div><strong>Audit Month :</strong> <span>{header?.auditMonth}</span></div>
              <div><strong>Audit Date :</strong> <span>{header?.auditDateDMY}</span></div>
              <div><strong>Score :</strong> <span>{grandTotal.toFixed(2)}</span></div>
            </div>

            {/* Criteria table */}
            <div className="table-wrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th className="left">Sub Segment</th>
                    <th className="left">Criteria</th>
                    <th className="center" style={{width: 120}}>Score (0/1)</th>
                    <th className="right" style={{width: 110}}>Weightage</th>
                    <th className="right" style={{width: 120}}>Total Score</th>
                    <th className="left" style={{width: 240}}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="empty">No data</td></tr>
                  ) : (
                    rows.map((r) => {
                      const code = r.criteriaCode || r.id;
                      const total = rowTotal(code, r.weightageStr);
                      return (
                        <tr key={code}>
                          <td className="left">{r.subSegment}</td>
                          <td className="left">{r.criteria}</td>
                          <td className="center">
                            <select
                              value={scores[code] === null || scores[code] === undefined ? "" : String(scores[code])}
                              onChange={(e) => setScore(code, e.target.value)}
                            >
                              <option value="">— Select —</option>
                              <option value="0">0</option>
                              <option value="1">1</option>
                            </select>
                          </td>
                          <td className="right">{r.weightageStr || `${r.weightageNum}%`}</td>
                          <td className="right">{total.toFixed(2)}</td>
                          <td className="left">
                            <input
                              value={remarks[code] ?? ""}
                              onChange={(e) => setRemark(code, e.target.value)}
                              placeholder=""
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="footer actions">
              <button
                className="btn"
                onClick={() => onSaveOrSubmit(true)}
                disabled={saving || loading || rows.length === 0}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                className="btn primary"
                onClick={() => onSaveOrSubmit(false)}
                disabled={saving || loading || rows.length === 0}
              >
                {saving ? "Submitting…" : "Submit"}
              </button>
              <button className="btn ghost" onClick={() => navigate(-1)}>Back</button>
            </div>
          </>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .page-head { margin-bottom: 10px; }
        .crumbs { color: #6b7280; display: flex; align-items: center; gap: 8px; }
        .crumb.link { background: none; border: 0; color: #2563eb; cursor: pointer; padding: 0; }
        .sep { color: #9aa4b2; }
        .muted { color: #9aa4b2; }
        .title { margin: 8px 0 0; font-size: 18px; color: #0b1f3a; }

        .card {
          background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06);
          padding: 14px;
        }
        .loading, .error { padding: 20px; }
        .summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(220px, 1fr));
          gap:  18px;
          font-weight: 700;
          padding: 6px 6px 14px;
          border-bottom: 1px solid #eef2f7;
          margin-bottom: 10px;
          color: #111827;
        }
        .summary strong { color: #374151; }

        .table-wrap {
          overflow: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        table.grid { width: 100%; border-collapse: separate; border-spacing: 0; }
        thead th {
          background: #f3f4f6; color: #111827; font-weight: 700; font-size: 13px;
          padding: 10px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 1;
        }
        tbody td { font-size: 13px; color: #111827; padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
        .left { text-align: left; }
        .center { text-align: center; }
        .right { text-align: right; }

        tbody select {
          width: 100%; height: 32px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 6px; background: #fff;
        }
        tbody input {
          width: 100%; height: 32px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0 8px;
          background: #fff;
        }
        .empty { text-align: center; color: #6b7280; padding: 14px; }

        .footer.actions { display: flex; gap: 10px; justify-content: center; padding-top: 14px; }
        .btn { background: #1d2c43; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
        .btn.primary { background: #112032; }
        .btn.ghost { background: #fff; color: #1d2c43; border: 1px solid #d8dee8; }
        .btn[disabled] { opacity:.7; cursor:not-allowed; }

        .audit-details { padding: 8px; }

        .toast { position: fixed; bottom: 16px; right: 16px; color:#fff; background:#d7263d; padding:10px 14px; border-radius:8px; font-weight:600; box-shadow:0 6px 18px rgba(0,0,0,0.15); z-index:9999; }
        .toast.success { background:#138a36; }
      `}</style>
    </div>
  );
}
