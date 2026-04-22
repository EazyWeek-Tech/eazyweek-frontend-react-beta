"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const norm = (s) => (s ?? "").toString().trim();
const decodePlus = (s) => (s ? s.replace(/\+/g, " ") : s);

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const toDMY = (iso) => {
  const [y, m, d] = (iso || "").split("-");
  if (!y || !m || !d) return iso || "";
  return `${d}-${Number(m)}-${y}`;
};

const toMidnightUtc = (iso) => (iso ? `${iso}T00:00:00.000Z` : "");
const parseWeight = (w) => { if (!w) return 0; const m = String(w).match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : 0; };
const encodeValuePresent = (s) => (s === 1 ? "1" : "0");

const tryParseJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };
const pickUserId = (o) => norm(o?.userID ?? o?.userId ?? o?.employeeCode ?? o?.empCode ?? "");
const pickClinic = (o) => ({ code: norm(o?.centerCode ?? o?.loginCode ?? o?.topCode ?? ""), name: norm(o?.centerName ?? o?.clinicName ?? "") });

function getSessionUserId() {
  if (typeof window === "undefined") return "";
  const globalObj = window.__SESSION__ || window.__USER__ || window.__APP__ || {};
  const fromGlobal = pickUserId(globalObj);
  if (fromGlobal) return fromGlobal;
  const keys = ["userSession", "user", "session", "auth", "currentUser", "loggedInUser"];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    if (!storage) continue;
    for (const k of keys) {
      const raw = storage.getItem(k);
      if (!raw) continue;
      const parsed = tryParseJSON(raw);
      const id = parsed ? pickUserId(parsed) : norm(raw);
      if (id) return id;
    }
  }
  return "";
}

function getSessionClinic() {
  if (typeof window === "undefined") return { code: "", name: "" };
  const globalObj = window.__SESSION__ || window.__USER__ || window.__APP__ || {};
  const picked = pickClinic(globalObj);
  if (picked.code || picked.name) return picked;
  const keys = ["userSession", "user", "session", "auth", "currentUser", "loggedInUser"];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    if (!storage) continue;
    for (const k of keys) {
      const raw = storage.getItem(k);
      if (!raw) continue;
      const parsed = tryParseJSON(raw);
      if (parsed && typeof parsed === "object") { const fromStore = pickClinic(parsed); if (fromStore.code || fromStore.name) return fromStore; }
    }
  }
  return { code: "", name: "" };
}

const ScoreBadge = ({ score }) => {
  if (score === 1) return <span className="score-badge score-yes">Yes</span>;
  if (score === 0) return <span className="score-badge score-no">No</span>;
  return <span className="score-badge score-pending">—</span>;
};

export default function AuditForm() {
  const qs = useQuery();
  const navigate = useNavigate();

  const segment = norm(qs.get("segment"));
  const clinicCodeQS = norm(qs.get("clinicCode"));
  const clinicNameQS = decodePlus(norm(qs.get("clinicName") || qs.get("clinic")));
  const auditMonth = norm(qs.get("auditMonth"));
  const year = norm(qs.get("year"));
  const auditDateISO = norm(qs.get("auditDate"));
  const mode = norm(qs.get("mode"));
  const employeeCode = norm(qs.get("employeeCode"));
  const employeeNameQS = decodePlus(norm(qs.get("employeeName")));
  const doctorCode = norm(qs.get("doctorCode"));
  const doctorNameQS = decodePlus(norm(qs.get("doctorName")));
  const departmentCode = norm(qs.get("departmentCode"));
  const managerCode = norm(qs.get("managerCode"));

  const [auditorCode, setAuditorCode] = useState(norm(qs.get("auditor")) || getSessionUserId());
  const sessionClinic = useMemo(() => getSessionClinic(), []);
  const [clinicDisplayName, setClinicDisplayName] = useState(clinicNameQS || sessionClinic.name || "");
  const [clinicDisplayCode, setClinicDisplayCode] = useState(clinicCodeQS || sessionClinic.code || "");
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedAuditNo, setSavedAuditNo] = useState("");
  const [toast, setToast] = useState(null);
  const [employeeName, setEmployeeName] = useState(employeeNameQS || "");
  const [doctorName, setDoctorName] = useState(doctorNameQS || "");

  const showToast = (message, type = "error", ms = 2400) => { setToast({ type, message }); setTimeout(() => setToast(null), ms); };

  const answeredCount = criteria.filter((r) => { const s = scores[r.criteriaCode]; return s === 0 || s === 1; }).length;
  const progressPct = criteria.length > 0 ? Math.round((answeredCount / criteria.length) * 100) : 0;

  const grossTotal = criteria.reduce((sum, row) => {
    const s = scores[row.criteriaCode];
    return sum + (s === 1 ? parseWeight(row.weightage) : 0);
  }, 0);

  useEffect(() => {
    const onStorage = () => { const id = getSessionUserId(); if (id && id !== auditorCode) setAuditorCode(id); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [auditorCode]);

  useEffect(() => {
    let cancelled = false;
    const code = clinicCodeQS || sessionClinic.code;
    const namePrefilled = clinicNameQS || sessionClinic.name;
    if (namePrefilled) { setClinicDisplayName(namePrefilled); if (!clinicDisplayCode) setClinicDisplayCode(code || ""); return () => { cancelled = true; }; }
    if (!code) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include", headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const payload = await r.json();
        const centers = Array.isArray(payload) ? payload : payload ? [payload] : [];
        const match = centers.find((c) => norm(c.code) === code);
        if (!cancelled) { setClinicDisplayName(match?.name || ""); setClinicDisplayCode(code); }
      } catch { if (!cancelled) { setClinicDisplayName(""); setClinicDisplayCode(code); } }
    })();
    return () => { cancelled = true; };
  }, [API_BASE_URL, clinicCodeQS, clinicNameQS, sessionClinic.code, sessionClinic.name]);

  useEffect(() => {
    if (!segment) return;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditSegmentCriteria/${encodeURIComponent(segment)}`, { credentials: "include", headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const list = Array.isArray(data) ? data : data ? [data] : [];
        const initScores = {};
        for (const row of list) { if (row?.criteriaCode) initScores[row.criteriaCode] = -1; }
        setScores(initScores);
        setCriteria(list);
      } catch { showToast("Failed to load audit criteria"); }
      finally { setLoading(false); }
    })();
  }, [segment, API_BASE_URL]);

  useEffect(() => {
    // For digital mode, use doctorName from QS (already set in state)
    if (mode === "digital") { if (doctorNameQS) setDoctorName(doctorNameQS); return; }
    // For standard mode, use employeeName from QS if available
    if (employeeNameQS) { setEmployeeName(employeeNameQS); return; }
    // Fallback: fetch employees for this segment and find by code
    if (!employeeCode || !segment) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/Audit/LoadEmployeesInAudit/${encodeURIComponent(segment)}`, { credentials: "include", headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const list = await r.json();
        const arr = Array.isArray(list) ? list : list ? [list] : [];
        const targetCode = norm(employeeCode).toUpperCase();
        const found = arr.find((e) => norm(e.code ?? e.employeeCode ?? "").toUpperCase() === targetCode);
        if (!cancelled) setEmployeeName(found ? norm(found.name ?? found.employeeName ?? "") : employeeCode);
      } catch { if (!cancelled) setEmployeeName(employeeCode); }
    })();
    return () => { cancelled = true; };
  }, [API_BASE_URL, mode, segment, employeeCode, employeeNameQS, doctorNameQS]);

  const validateAllAnswered = () => { for (const row of criteria) { const s = scores[row.criteriaCode]; if (!(s === 0 || s === 1)) return { ok: false }; } return { ok: true }; };

  const buildPayload = (isDraft) => {
    const normalizeWeight = (w) => { const n = String(w ?? "").match(/-?\d+(\.\d+)?/); return n ? String(Number(n[0])) : "0"; };
    const encodeScore = (s) => { if (s === 0 || s === 1) return String(s); return isDraft ? "-1" : "0"; };
    const subSegmentJson = criteria.map((row) => {
      const code = String(row?.criteriaCode ?? "");
      const weightStr = normalizeWeight(row?.weightage);
      const scoreStr = encodeScore(scores[code]);
      const totalStr = scoreStr === "1" ? weightStr : "0";
      return { auditNo: "", criteria: String(row?.criteria ?? ""), score: scoreStr, weightage: weightStr, totalScore: totalStr, auditorRemarks: String((remarks[code] ?? "").trim()), subSegment: String(row?.subSegment ?? ""), criteriaCode: code, valuePresent: encodeValuePresent(scores[code]) };
    });
    const grossFromRows = subSegmentJson.reduce((sum, r) => sum + Number(r.totalScore || "0"), 0);
    return {
      request: isDraft ? "save" : "submit",
      auditSegment: segment,
      subSegment: subSegmentJson.length ? subSegmentJson[0].subSegment : "",
      auditDate: toMidnightUtc(auditDateISO),
      auditMonth: String(auditMonth || ""),
      auditor: String(auditorCode || ""),
      employeeCode: mode === "digital" ? "" : employeeCode,
      grossTotalScore: grossFromRows,
      auditNo: savedAuditNo,
      auditYear: String(year || "0"),
      doctorCode: mode === "digital" ? String(doctorCode || "") : "",
      managerCode: mode === "digital" ? String(managerCode || "") : "",
      departmentCode: mode === "digital" ? String(departmentCode || "") : "",
      isDraft: isDraft ? 1 : 0,
      subSegmentJson,
      status: "",
      responseMessage: "",
    };
  };

  const postAuditCreation = async (payload) => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/Audit/AuditCreation`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.responseMessage || `Save failed (HTTP ${r.status})`);
      return data;
    } finally { setSaving(false); }
  };

  const onSaveOrSubmit = async (isDraft) => {
    if (!isDraft) { const check = validateAllAnswered(); if (!check.ok) return showToast("Please answer all criteria before submitting."); }
    try {
      const res = await postAuditCreation(buildPayload(isDraft));
      if (isDraft) {
        const returnedAuditNo = res?.auditNo || res?.auditno || res?.AuditNo || "";
        if (returnedAuditNo) setSavedAuditNo(returnedAuditNo);
        showToast(res?.responseMessage || "Saved as draft.", "success", 800);
        setTimeout(() => navigate("/auditsegmentview"), 900);
      } else {
        showToast(res?.responseMessage || "Submitted successfully.", "success", 800);
        setTimeout(() => navigate("/auditsegmentview"), 900);
      }
    } catch (e) { showToast(e.message || "Could not save. Please try again."); }
  };

  const clinicLabel = clinicDisplayName || clinicNameQS || clinicDisplayCode || clinicCodeQS || "—";
  const personLabel = mode === "digital" ? (doctorName || doctorNameQS || doctorCode || "—") : (employeeName || employeeNameQS || employeeCode || "—");

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
            <span className="page-eyebrow">Audit Module</span>
            <h1 className="page-title">Fill Audit Segment Details</h1>
          </div>
          <div className="score-chip">
            <span className="score-chip-label">Score</span>
            <span className="score-chip-value">{grossTotal.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="summary-bar">
          <div className="summary-item">
            <span className="summary-label">Segment</span>
            <span className="summary-value">{segment || "—"}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <span className="summary-label">Clinic</span>
            <span className="summary-value">{clinicLabel}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <span className="summary-label">Period</span>
            <span className="summary-value">{auditMonth && year ? `${auditMonth} ${year}` : "—"}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <span className="summary-label">Date</span>
            <span className="summary-value">{toDMY(auditDateISO) || "—"}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <span className="summary-label">{mode === "digital" ? "Doctor" : "Employee"}</span>
            <span className="summary-value">{personLabel}</span>
          </div>
        </div>

        {!loading && criteria.length > 0 && (
          <div className="progress-bar-wrap">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="progress-label">{answeredCount} of {criteria.length} answered</span>
          </div>
        )}

        <div className="table-card">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <span>Loading criteria...</span>
            </div>
          ) : (
            <>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th className="col-num">#</th>
                    <th className="col-sub">Sub Segment</th>
                    <th className="col-criteria">Criteria</th>
                    <th className="col-score">Score</th>
                    <th className="col-weight">Weight</th>
                    <th className="col-total">Total</th>
                    <th className="col-remarks">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((row, idx) => {
                    const code = row.criteriaCode;
                    const s = scores[code];
                    const total = s === 1 ? parseWeight(row.weightage) : 0;
                    const isAnswered = s === 0 || s === 1;
                    return (
                      <tr key={code || idx} className={isAnswered ? "row-answered" : ""}>
                        <td className="col-num">{idx + 1}</td>
                        <td className="col-sub">
                          <span className="subseg-pill">{row.subSegment || "—"}</span>
                        </td>
                        <td className="col-criteria">
                          <div className="criteria-html" dangerouslySetInnerHTML={{ __html: row.criteria || "" }} />
                        </td>
                        <td className="col-score">
                          <div className="score-toggle">
                            <button className={`toggle-btn ${s === 1 ? "toggle-yes active" : "toggle-yes"}`} onClick={() => setScores((p) => ({ ...p, [code]: s === 1 ? -1 : 1 }))}>Yes</button>
                            <button className={`toggle-btn ${s === 0 ? "toggle-no active" : "toggle-no"}`} onClick={() => setScores((p) => ({ ...p, [code]: s === 0 ? -1 : 0 }))}>No</button>
                          </div>
                        </td>
                        <td className="col-weight">{row.weightage || "—"}</td>
                        <td className="col-total"><span className={total > 0 ? "total-positive" : "total-zero"}>{total}</span></td>
                        <td className="col-remarks">
                          <input type="text" value={remarks[code] ?? ""} onChange={(e) => setRemarks((p) => ({ ...p, [code]: e.target.value }))} placeholder="Optional..." className="remark-input" />
                        </td>
                      </tr>
                    );
                  })}
                  {criteria.length === 0 && (
                    <tr><td colSpan={7} className="empty-state">No criteria found for this segment.</td></tr>
                  )}
                </tbody>
              </table>

              {criteria.length > 0 && (
                <div className="table-footer">
                  <div className="footer-score">
                    <span className="footer-score-label">Gross Total</span>
                    <span className="footer-score-value">{grossTotal.toFixed(2)}</span>
                  </div>
                  <div className="footer-actions">
                    <button className="btn-ghost" onClick={() => onSaveOrSubmit(true)} disabled={saving || criteria.length === 0}>
                      {saving ? "Saving..." : "Save Draft"}
                    </button>
                    <button className="btn-primary" onClick={() => onSaveOrSubmit(false)} disabled={saving || criteria.length === 0}>
                      {saving ? "Submitting..." : `Submit  (${answeredCount}/${criteria.length})`}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === "success" ? "✓" : "!"}</span>
          {toast.message}
        </div>
      )}

      <style jsx>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .page { min-height: 100vh; background: #f0f2f5; font-family: 'Segoe UI', system-ui, sans-serif; }

        .page-header { background: #334b71; padding: 0 32px; border-bottom: 3px solid #1a3a6b; }
        .page-header-inner { max-width: 1240px; margin: 0 auto; padding: 20px 0; display: flex; align-items: flex-end; justify-content: space-between; }
        .back-btn { display: block; background: none; border: none; color: #6b8fc7; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 6px; }
        .back-btn:hover { color: #a8c4e8; }
        .page-eyebrow { display: none; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #6b8fc7; margin-bottom: 4px; }
        .page-title { font-size: 20px; font-weight: 700; color: #fff;margin: 0 !important }
        .score-chip { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 10px 20px; text-align: center; }
        .score-chip-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #6b8fc7; }
        .score-chip-value { display: block; font-size: 26px; font-weight: 800; color: #fff; line-height: 1.1; margin-top: 2px; }

        .home-sect{padding:0}
        .page-body { max-width: 1240px; margin: 0 auto; padding: 24px 32px 48px; display: flex; flex-direction: column; gap: 16px; }

        .summary-bar {
          background: #fff;
          border-radius: 12px;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          flex-wrap: wrap;
        }
        .summary-item { display: flex; flex-direction: column; gap: 3px; padding: 0 20px; flex: 1; min-width: 120px; }
        .summary-item:first-child { padding-left: 0; }
        .summary-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8a94a6; }
        .summary-value { font-size: 13px; font-weight: 600; color: #1b2636; }
        .summary-divider { width: 1px; height: 36px; background: #eaecf0; flex-shrink: 0; }

        .progress-bar-wrap { display: flex; align-items: center; gap: 12px; }
        .progress-bar-track { flex: 1; height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #334b71; border-radius: 999px; transition: width 0.3s ease; }
        .progress-label { font-size: 12px; font-weight: 600; color: #8a94a6; white-space: nowrap; }

        .table-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04); overflow: hidden; }

        .audit-table { width: 100%; border-collapse: collapse; }
        .audit-table thead tr { background: #f8f9fb; border-bottom: 2px solid #eaecf0; }
        .audit-table th { padding: 13px 14px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #8a94a6; white-space: nowrap; }
        .audit-table tbody tr { border-bottom: 1px solid #f3f4f6; transition: background 0.1s; }
        .audit-table tbody tr:hover { background: #fafbfc; }
        .audit-table tbody tr.row-answered { background: #f8fffe; }
        .audit-table tbody tr:last-child { border-bottom: none; }
        .audit-table td { padding: 12px 14px; vertical-align: middle; font-size: 13px; color: #1b2636; }

        .col-num { width: 40px; text-align: center; color: #8a94a6; font-weight: 600; }
        .col-sub { width: 130px; }
        .col-criteria { }
        .col-score { width: 120px; }
        .col-weight { width: 80px; text-align: center; color: #8a94a6; }
        .col-total { width: 80px; text-align: center; }
        .col-remarks { width: 200px; }

        .subseg-pill { display: inline-block; background: #f0f2f5; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 600; color: #4b5668; }

        .criteria-html { line-height: 1.5; }
        .criteria-html b, .criteria-html strong { font-weight: 700; }

        .score-toggle { display: flex; gap: 4px; }
        .toggle-btn { flex: 1; height: 30px; border-radius: 6px; border: 1.5px solid #d8dee8; background: #fff; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; color: #8a94a6; }
        .toggle-btn:hover { border-color: #334b71; color: #334b71; }
        .toggle-yes.active { background: #e8f5e9; border-color: #138a36; color: #138a36; }
        .toggle-no.active { background: #fdecea; border-color: #c0392b; color: #c0392b; }

        .total-positive { font-weight: 700; color: #138a36; }
        .total-zero { color: #c0c8d8; }

        .remark-input { width: 100%; height: 32px; border: 1.5px solid #e5e7eb; border-radius: 7px; padding: 0 10px; font-size: 12px; color: #1b2636; background: #f8f9fb; outline: none; transition: border-color 0.15s; }
        .remark-input:focus { border-color: #334b71; background: #fff; box-shadow: 0 0 0 3px rgba(11,31,58,0.06); }

        .table-footer { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-top: 2px solid #eaecf0; background: #f8f9fb; }
        .footer-score { display: flex; align-items: baseline; gap: 10px; }
        .footer-score-label { font-size: 12px; font-weight: 700; color: #8a94a6; text-transform: uppercase; letter-spacing: 0.08em; }
        .footer-score-value { font-size: 24px; font-weight: 800; color: #334b71; }
        .footer-actions { display: flex; gap: 10px; }

        .btn-primary { background: #334b71; color: #fff; border: none; border-radius: 8px; padding: 10px 22px; font-size: 14px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover { background: #1a3a6b; }
        .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
        .btn-ghost { background: #fff; color: #334b71; border: 1.5px solid #d8dee8; border-radius: 8px; padding: 10px 22px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #334b71; background: #f8f9fb; }
        .btn-ghost:disabled { opacity: 0.65; cursor: not-allowed; }

        .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px; color: #8a94a6; font-size: 14px; }
        .loading-spinner { width: 32px; height: 32px; border: 3px solid #eaecf0; border-top-color: #334b71; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { text-align: center; padding: 40px; color: #8a94a6; font-size: 14px; }

        .score-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .score-yes { background: #e8f5e9; color: #138a36; }
        .score-no { background: #fdecea; color: #c0392b; }
        .score-pending { background: #f0f2f5; color: #8a94a6; }

        .toast { position: fixed; bottom: 24px; right: 24px; display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.18); z-index: 9999; animation: toastIn 0.2s ease; }
        @keyframes toastIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .toast-error { background: #c0392b; }
        .toast-success { background: #138a36; }
        .toast-icon { width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }

        @media (max-width: 900px) {
          .page-body { padding: 16px; }
          .summary-bar { gap: 12px; }
          .summary-divider { display: none; }
          .summary-item { padding: 0; min-width: 100px; }
          .col-remarks { display: none; }
        }
      `}</style>
    </div>
  );
}