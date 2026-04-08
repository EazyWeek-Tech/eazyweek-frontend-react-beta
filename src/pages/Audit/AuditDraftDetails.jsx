"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const txt = (v) => (v == null ? "" : String(v));
const norm = (s) => (s ?? "").toString().trim();
const isBlank = (v) => v == null || (typeof v === "string" && v.trim() === "");

const dmyToIso = (dmy) => {
  if (!dmy) return "";
  const [d, m, y] = String(dmy).split(/[\/\-]/);
  if (!y || !m || !d) return "";
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
};

const toMidnightUtc = (iso) => (iso ? `${iso}T00:00:00.000Z` : "");
const parseWeight = (w) => { if (!w) return 0; const m = String(w).match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : 0; };
const encodeValuePresent = (s) => (s === 1 ? "1" : "0");

const tryParseJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };
const pickUserId = (o) => norm(o?.userID ?? o?.userId ?? o?.employeeCode ?? o?.empCode ?? "");

function getSessionUserId() {
  if (typeof window === "undefined") return "";
  const globalObj = window.__SESSION__ || window.__USER__ || window.__APP__ || {};
  const fromGlobal = pickUserId(globalObj);
  if (fromGlobal) return fromGlobal;
  const keys = ["user", "session", "auth", "currentUser", "loggedInUser"];
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

const normalizeName = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const pickEmpCode = (emp) => norm(emp?.empCode ?? emp?.employeeCode ?? emp?.code ?? "");

function sanitizeHtml(html) {
  if (typeof window === "undefined") return "";
  const ALLOWED = new Set(["b","strong","i","em","u","br","p","ul","ol","li","span","div"]);
  const container = document.createElement("div");
  container.innerHTML = String(html || "");
  const walk = (node) => {
    const kids = Array.from(node.childNodes);
    for (const child of kids) {
      if (child.nodeType === 8) { node.removeChild(child); continue; }
      if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (!ALLOWED.has(tag)) { while (child.firstChild) node.insertBefore(child.firstChild, child); node.removeChild(child); continue; }
        for (const attr of Array.from(child.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on") || ["style","href","src","srcdoc","xlink:href"].includes(name)) { child.removeAttribute(attr.name); }
          else if (name !== "class") { child.removeAttribute(attr.name); }
        }
      }
      if (child.childNodes && child.childNodes.length) walk(child);
    }
  };
  walk(container);
  return container.innerHTML;
}

const isArabic = (s) => /[\u0600-\u06FF]/.test(String(s || ""));

/*
  Score normalization from the API response.

  The SP stores:
    score = "1.000000"  → user picked Yes
    score = ""          → either user picked No (score=0 sent, SP saved as blank)
                          OR row was genuinely unanswered (score=-1 sent)

  We use valuePresent to break the tie:
    valuePresent = 1 → score was 1 (Yes)
    valuePresent = 0 AND score blank AND totalScore = 0 → ambiguous; treat as unanswered (-1)

  But a previously saved No (score=0) ALSO has valuePresent=0 and totalScore=0,
  so we cannot reliably distinguish No from unanswered from the API alone.

  The correct SP fix is to store score=0 distinctly from score=-1.
  Until then, we treat ALL blank-score rows as unanswered (-1) on load,
  forcing the user to re-confirm their No answers when editing a draft.
  This is the safest behavior — it never wrongly marks something as answered.
*/
function normalizeScoreFromApi(scoreRaw, valuePresent) {
  const vp = Number(valuePresent);
  const n = isBlank(scoreRaw) ? NaN : Number(scoreRaw);

  if (Number.isFinite(n)) {
    if (n >= 0.5) return 1;
    if (n < 0)   return -1;
    if (n === 0 && vp === 0)  return 0;
    if (n === 0 && vp === -1) return -1;
    if (n === 0 && vp !== 1)  return -1;
  }

  if (vp === 1)  return 1;
  if (vp === 0)  return 0;
  return -1;
}

export default function AuditDraftDetails() {
  const navigate = useNavigate();
  const { auditNo = "" } = useParams();
  const [searchParams] = useSearchParams();

  const clinicFromUrl = searchParams.get("clinic") || "";
  const employeeNameFromUrl = searchParams.get("employeeName") || "";
  const employeeCodeFromUrl = searchParams.get("empCode") || searchParams.get("employee") || "";
  const auditorFromUrl = searchParams.get("auditor") || "";

  const [auditorCode, setAuditorCode] = useState(() => getSessionUserId() || auditorFromUrl || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState({});
  const [auditedEmployeeCode, setAuditedEmployeeCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "error", ms = 2400) => { setToast({ type, message }); setTimeout(() => setToast(null), ms); };

  const grandTotal = useMemo(
    () => rows.reduce((sum, r) => { const code = r.criteriaCode || r.id; const s = scores[code]; return sum + (s === 1 ? parseWeight(r.weightageStr) : 0); }, 0),
    [rows, scores]
  );
  const answeredCount = rows.filter((r) => { const s = scores[r.criteriaCode || r.id]; return s === 0 || s === 1; }).length;
  const progressPct = rows.length > 0 ? Math.round((answeredCount / rows.length) * 100) : 0;

  useEffect(() => {
    const onStorage = () => { const id = getSessionUserId(); if (id && id !== auditorCode) setAuditorCode(id); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [auditorCode]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError("");
      let data; let lastErr = "";
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/Audit/GetAuditDraftDetails/${encodeURIComponent(String(auditNo || "").trim())}`,
          { method: "POST", credentials: "include", headers: { Accept: "application/json" } }
        );
        if (!res.ok) { const t = await res.text().catch(() => ""); lastErr = `HTTP ${res.status}${t ? ` · ${t.slice(0,180)}` : ""}`; }
        else { const text = await res.text(); data = text ? JSON.parse(text) : []; }
      } catch (e) { lastErr = e?.message || "Network error"; }

      if (!data) { if (!cancelled) { setError(lastErr || "Failed to load audit details"); setLoading(false); } return; }

      try {
        const list = Array.isArray(data) ? data : [data].filter(Boolean);
        const h0 = list[0] ?? {};
        const H = {
          auditNo,
          managerName: txt(h0.managerName),
          employeeName: txt(h0.employeeName ?? h0.employee ?? h0.EmployeeName ?? h0.Employee ?? ""),
          clinicName: clinicFromUrl,
          auditorName: auditorFromUrl,
          auditSegment: txt(h0.audtiSegment || h0.auditSegment || ""),
          auditMonth: txt(h0.auditMonth),
          auditDateDMY: txt(h0.auditDate),
          auditYear: txt(h0.auditYear ?? h0.AUDITYEAR ?? ""),
          employeeCode: employeeCodeFromUrl || txt(h0.employeeCode ?? h0.EmployeeCode ?? ""),
          managerCode: txt(h0.managerCode),
        };

        const R = list.map((r, i) => {
          const criteriaCode = txt(r.criteriaCode || `${i}`);
          const weightageRaw = txt(r.weightage);
          const weightageNum = parseWeight(weightageRaw);

          const normalizedScore = normalizeScoreFromApi(r.score, r.valuePresent);

          const totalFromApi = (r.totalScore ?? r.totalScore === 0) ? Number(r.totalScore) : null;
          return {
            id: criteriaCode,
            subSegment: txt(r.subSegment),
            criteria: txt(r.criteria),
            criteriaCode,
            score: normalizedScore,
            weightageStr: weightageRaw || String(weightageNum),
            weightageNum,
            totalScore: totalFromApi != null ? totalFromApi : (normalizedScore === 1 ? weightageNum : 0),
            remarks: txt(r.auditRemarks),
          };
        });

        const initScores = {}; const initRemarks = {};
        for (const row of R) { const code = row.criteriaCode || row.id; initScores[code] = row.score; initRemarks[code] = row.remarks || ""; }
        if (!cancelled) { setHeader(H); setRows(R); setScores(initScores); setRemarks(initRemarks); }

        if (employeeCodeFromUrl) { if (!cancelled) setAuditedEmployeeCode(employeeCodeFromUrl.trim()); return; }
        if (H.employeeCode) { if (!cancelled) setAuditedEmployeeCode(H.employeeCode); return; }

        const targetName = normalizeName(employeeNameFromUrl || H.employeeName);
        if (!targetName) return;
        try {
          const r = await fetch(`${API_BASE_URL}/api/Employees`, { credentials: "include", headers: { Accept: "application/json" } });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const arr = await r.json();
          const nameOf = (e) => e?.employeeName ?? e?.name ?? e?.fullName ?? e?.empName;
          const found = (Array.isArray(arr) ? arr : arr ? [arr] : []).find((e) => normalizeName(nameOf(e)) === targetName);
          const code = pickEmpCode(found);
          if (code && !cancelled) setAuditedEmployeeCode(code);
        } catch {}
      } catch (e) { if (!cancelled) setError(e.message || "Failed to parse response"); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [auditNo, API_BASE_URL, clinicFromUrl, employeeNameFromUrl, employeeCodeFromUrl, auditorFromUrl]);

  const validateAllAnswered = () => {
    for (const r of rows) { const s = scores[r.criteriaCode || r.id]; if (!(s === 0 || s === 1)) return { ok: false }; }
    return { ok: true };
  };

  const buildPayload = (isDraft) => {
    const subSegmentJson = rows.map((r) => {
      const code = r.criteriaCode || r.id;
      const s = scores[code];
      const weightNum = Number(r.weightageNum || 0);
      const scoreStr = (s === 0 || s === 1) ? String(s) : (isDraft ? "-1" : "0");
      const totalStr = scoreStr === "1" ? String(weightNum) : "0";
      return {
        auditNo: auditNo,
        criteria: String(r.criteria || ""),
        score: scoreStr,
        weightage: String(weightNum),
        totalScore: totalStr,
        auditorRemarks: String(remarks[code] ?? ""),
        subSegment: String(r.subSegment || ""),
        criteriaCode: String(code || ""),
        valuePresent: encodeValuePresent(s),
      };
    });
    const iso = dmyToIso(header?.auditDateDMY || "");
    return {
      request: isDraft ? "save" : "submit",
      auditSegment: header?.auditSegment || "",
      subSegment: "",
      auditDate: toMidnightUtc(iso),
      auditMonth: header?.auditMonth || "",
      auditor: String(auditorCode || ""),
      employeeCode: String(auditedEmployeeCode || ""),
      doctorCode: "",
      managerCode: txt(header?.managerCode || ""),
      departmentCode: "",
      auditYear: String(header?.auditYear || ""),
      grossTotalScore: grandTotal,
      isDraft: isDraft ? 1 : 0,
      auditNo: auditNo,
      subSegmentJson,
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
      showToast(res?.responseMessage || (isDraft ? "Saved as draft." : "Submitted successfully."), "success", 1600);
      if (isDraft) { setTimeout(() => navigate(-1), 250); } else { navigate("/auditsegmentview"); }
    } catch (e) { showToast(e.message || "Could not save. Please try again."); }
  };

  const displayEmployeeName = header?.employeeName || employeeNameFromUrl || "";
  const displayEmployeeCode = auditedEmployeeCode || employeeCodeFromUrl || header?.employeeCode || "";

  const Txt = ({ children }) => {
    const t = children ?? "";
    const arabic = isArabic(t);
    return <span dir={arabic ? "rtl" : "auto"} lang={arabic ? "ar" : undefined}>{t}</span>;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="crumbs">
              <button className="crumb-link" onClick={() => navigate(-1)}>← Audit List</button>
              <span className="crumb-sep">›</span>
              <span className="crumb-current">Draft Details</span>
            </div>
            <h1 className="page-title">Fill Audit Segment Details</h1>
          </div>
          {!loading && !error && (
            <div className="score-chip">
              <span className="score-chip-label">Score</span>
              <span className="score-chip-value">{grandTotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="full-loading">
            <div className="loading-spinner" />
            <span>Loading audit draft...</span>
          </div>
        ) : error ? (
          <div className="error-card">
            <div className="error-icon">!</div>
            <div>
              <div className="error-title">Failed to load</div>
              <div className="error-msg">{error}</div>
            </div>
            <button className="btn-ghost" onClick={() => navigate(-1)}>Go Back</button>
          </div>
        ) : (
          <>
            <div className="summary-grid">
              <div className="summary-item"><span className="summary-label">Audit No</span><span className="summary-value highlight"><Txt>{header?.auditNo}</Txt></span></div>
              <div className="summary-item"><span className="summary-label">Segment</span><span className="summary-value"><Txt>{header?.auditSegment}</Txt></span></div>
              <div className="summary-item"><span className="summary-label">Clinic</span><span className="summary-value"><Txt>{header?.clinicName || clinicFromUrl || "—"}</Txt></span></div>
              <div className="summary-item"><span className="summary-label">Period</span><span className="summary-value"><Txt>{header?.auditMonth || "—"}</Txt></span></div>
              <div className="summary-item"><span className="summary-label">Audit Date</span><span className="summary-value"><Txt>{header?.auditDateDMY || "—"}</Txt></span></div>
              <div className="summary-item"><span className="summary-label">Manager</span><span className="summary-value"><Txt>{header?.managerName || "—"}</Txt></span></div>
              <div className="summary-item"><span className="summary-label">Employee / Doctor</span><span className="summary-value"><Txt>{displayEmployeeName || displayEmployeeCode || "—"}</Txt></span></div>
              <div className="summary-item"><span className="summary-label">Auditor</span><span className="summary-value"><Txt>{header?.auditorName || auditorCode || "—"}</Txt></span></div>
            </div>

            {rows.length > 0 && (
              <div className="progress-bar-wrap">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="progress-label">{answeredCount} of {rows.length} answered</span>
              </div>
            )}

            <div className="table-card">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th className="col-sub">Sub Segment</th>
                    <th className="col-criteria">Criteria</th>
                    <th className="col-score">Score</th>
                    <th className="col-weight">Weight</th>
                    <th className="col-total">Total</th>
                    <th className="col-remarks">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="empty-state">No data found for this audit.</td></tr>
                  ) : (
                    rows.map((r) => {
                      const code = r.criteriaCode || r.id;
                      const s = scores[code];
                      const total = s === 1 ? parseWeight(r.weightageStr) : 0;
                      const isAnswered = s === 0 || s === 1;
                      return (
                        <tr key={code} className={isAnswered ? "row-answered" : ""}>
                          <td className="col-sub">
                            <span className="subseg-pill"><Txt>{r.subSegment || "—"}</Txt></span>
                          </td>
                          <td className="col-criteria">
                            <div className="criteria-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.criteria) }} />
                          </td>
                          <td className="col-score">
                            <div className="score-toggle">
                              <button
                                className={`toggle-btn toggle-yes${s === 1 ? " active" : ""}`}
                                onClick={() => setScores((p) => ({ ...p, [code]: s === 1 ? -1 : 1 }))}
                              >Yes</button>
                              <button
                                className={`toggle-btn toggle-no${s === 0 ? " active" : ""}`}
                                onClick={() => setScores((p) => ({ ...p, [code]: s === 0 ? -1 : 0 }))}
                              >No</button>
                            </div>
                          </td>
                          <td className="col-weight">{r.weightageStr || `${r.weightageNum}`}</td>
                          <td className="col-total"><span className={total > 0 ? "total-positive" : "total-zero"}>{total.toFixed(2)}</span></td>
                          <td className="col-remarks">
                            <input
                              value={remarks[code] ?? ""}
                              onChange={(e) => setRemarks((p) => ({ ...p, [code]: e.target.value }))}
                              dir={isArabic(remarks[code] || "") ? "rtl" : "auto"}
                              lang={isArabic(remarks[code] || "") ? "ar" : undefined}
                              placeholder="Optional..."
                              className="remark-input"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div className="table-footer">
                <div className="footer-score">
                  <span className="footer-score-label">Gross Total</span>
                  <span className="footer-score-value">{grandTotal.toFixed(2)}</span>
                </div>
                <div className="footer-actions">
                  <button className="btn-outline" onClick={() => navigate(-1)}>Back</button>
                  <button className="btn-ghost" onClick={() => onSaveOrSubmit(true)} disabled={saving || rows.length === 0}>
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                  <button className="btn-primary" onClick={() => onSaveOrSubmit(false)} disabled={saving || rows.length === 0}>
                    {saving ? "Submitting..." : `Submit (${answeredCount}/${rows.length})`}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
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
        .page-header-inner { max-width: 90%; margin: 0 auto; padding: 5px 0; display: flex; align-items: center; justify-content: space-between; }
        .crumbs { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .crumb-link { background: none; border: none; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; }
        .crumb-link:hover { color: #d0ddf0; }
        .crumb-sep { color: #fff; font-size: 13px; }
        .crumb-current { color: #fff; font-size: 13px; }
        .page-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0; }
        .score-chip { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 10px 20px; text-align: center; }
        .score-chip-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #fff; }
        .score-chip-value { display: block; font-size: 26px; font-weight: 800; color: #fff; line-height: 1.1; margin-top: 2px; }

        .page-body { max-width: 90%; margin: 0 auto; padding: 24px 32px 48px; display: flex; flex-direction: column; gap: 16px; }

        .full-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px; color: #8a94a6; font-size: 14px; }
        .loading-spinner { width: 36px; height: 36px; border: 3px solid #eaecf0; border-top-color: #0b1f3a; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .error-card { background: #fff; border-radius: 14px; padding: 24px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .error-icon { width: 40px; height: 40px; border-radius: 50%; background: #fdecea; color: #c0392b; font-weight: 800; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .error-title { font-weight: 700; color: #1b2636; font-size: 15px; }
        .error-msg { font-size: 13px; color: #8a94a6; margin-top: 2px; }

        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .summary-item { background: #fff; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .summary-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8a94a6; margin-bottom: 5px; }
        .summary-value { font-size: 13px; font-weight: 600; color: #1b2636; }
        .summary-value.highlight { color: #0b1f3a; font-size: 15px; font-weight: 800; }

        .progress-bar-wrap { display: flex; align-items: center; gap: 12px; }
        .progress-bar-track { flex: 1; height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #0b1f3a; border-radius: 999px; transition: width 0.3s ease; }
        .progress-label { font-size: 12px; font-weight: 600; color: #8a94a6; white-space: nowrap; }

        .table-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04); overflow: hidden; }

        .audit-table { width: 100%; border-collapse: collapse; }
        .audit-table thead tr { background: #334b71; border-bottom: 2px solid #1a3a6b; }
        .audit-table th { padding: 13px 14px; text-align: left; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; white-space: nowrap; }
        .audit-table tbody tr { border-bottom: 1px solid #f3f4f6; transition: background 0.1s; }
        .audit-table tbody tr:hover { background: #fafbfc; }
        .audit-table tbody tr.row-answered { background: #f8fffe; }
        .audit-table tbody tr:last-child { border-bottom: none; }
        .audit-table td { padding: 12px 14px; vertical-align: middle; font-size: 14px; color: #1b2636; }

        .col-sub { width: 250px; }
        .col-criteria { }
        .col-score { width: 120px; }
        .col-weight { width: 80px; text-align: center; color: #8a94a6; }
        .col-total { width: 90px; text-align: center; }
        .col-remarks { width: 200px; }

        .subseg-pill { display: inline-block; background: #f0f2f5; border-radius: 6px; padding: 5px 8px; font-size: 13px; font-weight: 600; color: #4b5668; }

        .criteria-html { line-height: 1.5; }
        .criteria-html b, .criteria-html strong { font-weight: 700; }

        .score-toggle { display: flex; gap: 4px; }
        .toggle-btn { flex: 1; height: 30px; border-radius: 6px; border: 1.5px solid #d8dee8; background: #fff; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; color: #8a94a6; }
        .toggle-btn:hover { border-color: #0b1f3a; color: #0b1f3a; }
        .toggle-yes.active { background: #e8f5e9; border-color: #138a36; color: #138a36; }
        .toggle-no.active { background: #fdecea; border-color: #c0392b; color: #c0392b; }

        .total-positive { font-weight: 700; color: #138a36; }
        .total-zero { color: #c0c8d8; }

        .remark-input { width: 100%; height: 32px; border: 1.5px solid #e5e7eb; border-radius: 7px; padding: 0 10px; font-size: 12px; color: #1b2636; background: #f8f9fb; outline: none; transition: border-color 0.15s; }
        .remark-input:focus { border-color: #0b1f3a; background: #fff; box-shadow: 0 0 0 3px rgba(11,31,58,0.06); }

        .table-footer { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-top: 2px solid #eaecf0; background: #f8f9fb; }
        .footer-score { display: flex; align-items: baseline; gap: 10px; }
        .footer-score-label { font-size: 12px; font-weight: 700; color: #8a94a6; text-transform: uppercase; letter-spacing: 0.08em; }
        .footer-score-value { font-size: 24px; font-weight: 800; color: #0b1f3a; }
        .footer-actions { display: flex; gap: 10px; }

        .btn-primary { background: #0b1f3a; color: #fff; border: none; border-radius: 8px; padding: 10px 22px; font-size: 14px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover { background: #1a3a6b; }
        .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
        .btn-ghost { background: #fff; color: #0b1f3a; border: 1.5px solid #d8dee8; border-radius: 8px; padding: 10px 22px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #0b1f3a; }
        .btn-ghost:disabled { opacity: 0.65; cursor: not-allowed; }
        .btn-outline { background: transparent; color: #8a94a6; border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 10px 22px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .btn-outline:hover { border-color: #c0c8d8; color: #4b5668; }

        .empty-state { text-align: center; padding: 40px; color: #8a94a6; font-size: 14px; }

        .toast { position: fixed; bottom: 24px; right: 24px; display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.18); z-index: 9999; animation: toastIn 0.2s ease; }
        @keyframes toastIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .toast-error { background: #c0392b; }
        .toast-success { background: #138a36; }
        .toast-icon { width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }

        @media (max-width: 900px) {
          .page-body { padding: 16px; }
          .summary-grid { grid-template-columns: repeat(2, 1fr); }
          .col-remarks { display: none; }
          .page-header { padding: 0 16px; }
        }
        @media (max-width: 480px) {
          .summary-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}