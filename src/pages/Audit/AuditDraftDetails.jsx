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
const norm = (s) => (s ?? "").toString().trim();
const isBlank = (v) => v == null || (typeof v === "string" && v.trim() === "");

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

// --- Auditor (logged-in user) helpers ---
const tryParseJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };

// FIX #6: unified key picker — handles both userID (capital D) and userId
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

// --- Employee helpers ---
const normalizeName = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const pickEmpCode = (emp) =>
  norm(emp?.empCode ?? emp?.employeeCode ?? emp?.code ?? emp?.EmpCode ?? emp?.EmployeeCode);

// ---- Simple HTML sanitizer (no external libs) ----
function sanitizeHtml(html) {
  if (typeof window === "undefined") return "";
  const ALLOWED = new Set(["b","strong","i","em","u","br","p","ul","ol","li","span","div"]);
  const container = document.createElement("div");
  container.innerHTML = String(html || "");

  const walk = (node) => {
    const kids = Array.from(node.childNodes);
    for (const child of kids) {
      if (child.nodeType === 8) {
        node.removeChild(child);
        continue;
      }
      if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (!ALLOWED.has(tag)) {
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
          continue;
        }
        for (const attr of Array.from(child.attributes)) {
          const name = attr.name.toLowerCase();
          if (
            name.startsWith("on") ||
            name === "style" ||
            name === "href" ||
            name === "src" ||
            name === "srcdoc" ||
            name === "xlink:href"
          ) {
            child.removeAttribute(attr.name);
          } else if (name !== "class") {
            child.removeAttribute(attr.name);
          }
        }
      }
      if (child.childNodes && child.childNodes.length) walk(child);
    }
  };

  walk(container);
  return container.innerHTML;
}

// FIX #5: valuePresent must always be "0" or "1" — never "-1"
const encodeValuePresent = (s) => (s === 1 ? "1" : "0");

export default function AuditDraftDetails() {
  const navigate = useNavigate();
  const { auditNo = "" } = useParams();
  const [searchParams] = useSearchParams();

  // URL params
  const clinicFromUrl = searchParams.get("clinic") || "";
  const employeeNameFromUrl = searchParams.get("employeeName") || "";
  const employeeCodeFromUrl =
    searchParams.get("empCode") || searchParams.get("employee") || "";
  const auditorFromUrl = searchParams.get("auditor") || "";

  // FIX #6: getSessionUserId now handles both userID and userId casing
  const [auditorCode, setAuditorCode] = useState(() => getSessionUserId() || auditorFromUrl || "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);

  // editable state
  const [scores, setScores] = useState({});   // { [criteriaCode]: -1|0|1 }
  const [remarks, setRemarks] = useState({}); // { [criteriaCode]: string }

  const [auditedEmployeeCode, setAuditedEmployeeCode] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "error", ms = 2400) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  // keep auditor in sync if session hydrates after mount
  useEffect(() => {
    const onStorage = () => {
      const id = getSessionUserId();
      if (id && id !== auditorCode) setAuditorCode(id);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [auditorCode]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      let data;
      let lastErr = "";
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/Audit/GetAuditDraftDetails/${encodeURIComponent(String(auditNo || "").trim())}`,
          { method: "POST", credentials: "include", headers: { Accept: "application/json" } }
        );
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          lastErr = `HTTP ${res.status}${t ? ` · ${t.slice(0, 180)}` : ""}`;
        } else {
          const text = await res.text();
          data = text ? JSON.parse(text) : [];
        }
      } catch (e) {
        lastErr = e?.message || "Network error";
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
        const h0 = list[0] ?? {};

        // FIX #4: employeeName IS now read from the API payload (employeeName field).
        // The stored proc SpGetDraftAuditSegmentCriteria should return EMPLOYEE or EmployeeName.
        // We try multiple possible field names so this works regardless of SP column alias.
        const H = {
          auditNo: auditNo,
          managerName: txt(h0.managerName),
          // FIX #4: prefer direct API field; fall back to URL param
          employeeName: txt(h0.employeeName ?? h0.employee ?? h0.EmployeeName ?? h0.Employee ?? ""),
          clinicName: clinicFromUrl,
          auditorName: auditorFromUrl,
          auditSegment: txt(h0.audtiSegment || h0.auditSegment || ""), // handle both typo and correct spelling
          auditMonth: txt(h0.auditMonth),
          auditDateDMY: txt(h0.auditDate),
          employeeCode: employeeCodeFromUrl || txt(h0.employeeCode ?? h0.EmployeeCode ?? ""),
          managerCode: txt(h0.managerCode),
        };

        const R = list.map((r, i) => {
          const criteriaCode = txt(r.criteriaCode || `${i}`);
          const criteriaTxt = txt(r.criteria);
          const subSegmentTxt = txt(r.subSegment);

          const weightageRaw = txt(r.weightage);
          const weightageNum = parseWeight(weightageRaw);
          const weightageStr = weightageRaw || String(weightageNum);

          // Score arrives as "1.000000"/"0.000000"/"-1.000000". Blank → -1.
          const scoreRaw = r.score;
          let normalizedScore = -1;
          if (!isBlank(scoreRaw)) {
            const n = Number(scoreRaw);
            if (Number.isFinite(n)) {
              if (n < 0) normalizedScore = -1;
              else if (n >= 0.5) normalizedScore = 1;
              else normalizedScore = 0;
            }
          }

          const totalFromApi = (r.totalScore ?? r.totalScore === 0) ? Number(r.totalScore) : null;
          const total = totalFromApi != null ? totalFromApi : (normalizedScore === 1 ? weightageNum : 0);

          const remarksTxt = txt(r.auditRemarks);

          return {
            id: criteriaCode,
            subSegment: subSegmentTxt,
            criteria: criteriaTxt,
            criteriaCode,
            auditSegmentFromApi: txt(r.audtiSegment || r.auditSegment || ""),
            score: normalizedScore,
            weightageStr,
            weightageNum,
            totalScore: total,
            remarks: remarksTxt,
          };
        });

        const initScores = {};
        const initRemarks = {};
        for (const row of R) {
          const code = row.criteriaCode || row.id;
          initScores[code] = row.score;
          initRemarks[code] = row.remarks || "";
        }

        if (!cancelled) {
          setHeader(H);
          setRows(R);
          setScores(initScores);
          setRemarks(initRemarks);
        }

        // --- Resolve audited employee code ---
        // 1) From URL ?empCode=... or ?employee=...
        if (employeeCodeFromUrl) {
          if (!cancelled) setAuditedEmployeeCode(employeeCodeFromUrl.trim());
          return;
        }

        // 2) From header (now populated from API when available)
        if (H.employeeCode) {
          if (!cancelled) setAuditedEmployeeCode(H.employeeCode);
          return;
        }

        // 3) From /api/Employees by matching name (fallback — only when code is not available)
        const targetName = normalizeName(employeeNameFromUrl || H.employeeName);
        if (!targetName) return;

        try {
          const r = await fetch(`${API_BASE_URL}/api/Employees`, {
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const arrRaw = await r.json();
          const arr = Array.isArray(arrRaw) ? arrRaw : arrRaw ? [arrRaw] : [];

          const nameOf = (e) => e?.employeeName ?? e?.name ?? e?.fullName ?? e?.empName;
          const exact = arr.find(e => normalizeName(nameOf(e)) === targetName);
          const loose = exact ? null : arr.find(e => normalizeName(nameOf(e)).includes(targetName));

          const code = pickEmpCode(exact || loose);
          if (code && !cancelled) setAuditedEmployeeCode(code);
        } catch {
          // silent fallback
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditNo, API_BASE_URL, clinicFromUrl, employeeNameFromUrl, employeeCodeFromUrl, auditorFromUrl]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, scores]
  );

  const setScore = (criteriaCode, valStr) => {
    const val = Number(valStr);
    setScores((prev) => ({ ...prev, [criteriaCode]: val }));
  };

  const setRemark = (criteriaCode, value) => {
    setRemarks((prev) => ({ ...prev, [criteriaCode]: value }));
  };

  const validateAllAnswered = () => {
    for (const r of rows) {
      const code = r.criteriaCode || r.id;
      const s = scores[code];
      if (!(s === 0 || s === 1)) return { ok: false, code };
    }
    return { ok: true };
  };

  const buildPayload = (isDraft) => {
    const subSegmentJson = rows.map((r) => {
      const code = r.criteriaCode || r.id;
      const s = scores[code]; // -1 | 0 | 1
      const weightNum = Number(r.weightageNum || 0);

      const scoreStr =
        s === 0 || s === 1
          ? String(s)
          : isDraft
          ? "-1"
          : "0";

      // FIX #7: totalScore is always a numeric string — never blank or undefined
      const totalStr = scoreStr === "1" ? String(weightNum) : "0";

      return {
        auditNo: "",
        criteria: String(r.criteria || ""),
        score: scoreStr,              // "-1" | "0" | "1"
        weightage: String(weightNum), // normalized numeric string
        totalScore: totalStr,         // always "0" or numeric weight — never blank
        auditorRemarks: String(remarks[code] ?? ""),
        subSegment: String(r.subSegment || ""),
        criteriaCode: String(code || ""),
        // FIX #5: valuePresent is always "0" or "1" — never "-1"
        valuePresent: encodeValuePresent(s),
      };
    });

    const iso = dmyToIso(header?.auditDateDMY || "");
    const year = iso ? iso.slice(0, 4) : "";

    const managerCodeOut = txt(header?.managerCode || "");
    const doctorCodeOut = "";
    const departmentCodeOut = "";

    return {
      request: isDraft ? "save" : "submit",
      auditSegment: header?.auditSegment || "",
      subSegment: "",
      auditDate: toMidnightUtc(iso),
      auditMonth: header?.auditMonth || "",
      auditor: String(auditorCode || ""),
      employeeCode: String(auditedEmployeeCode || ""),
      doctorCode: doctorCodeOut,
      managerCode: managerCodeOut,
      departmentCode: departmentCodeOut,
      auditYear: String(year || ""),
      grossTotalScore: grandTotal,
      isDraft: isDraft ? 1 : 0,
      subSegmentJson,
    };
  };

  const isArabic = (s) => /[\u0600-\u06FF]/.test(String(s || ""));

  const Txt = ({ children }) => {
    const t = children ?? "";
    const arabic = isArabic(t);
    return (
      <span
        className={arabic ? "arb" : "auto-dir"}
        lang={arabic ? "ar" : undefined}
        dir={arabic ? "rtl" : "auto"}
        title={String(t)}
      >
        {t}
      </span>
    );
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
    if (!isDraft) {
      const check = validateAllAnswered();
      if (!check.ok) {
        return showToast("Please answer all criteria (0 or 1) before continuing.");
      }
    }

    const payload = buildPayload(isDraft);
    try {
      const res = await postAuditCreation(payload);
      const msg = res?.responseMessage || (isDraft ? "Saved as draft." : "Submitted successfully.");
      showToast(msg, "success", 1600);

      if (isDraft) {
        setTimeout(() => navigate(-1), 250);
      } else {
        navigate("/auditsegmentview");
      }
    } catch (e) {
      console.error(e);
      showToast(e.message || "Could not save. Please try again.");
    }
  };

  // FIX #4: prefer API-resolved name when available; URL param is secondary
  const displayEmployeeName = header?.employeeName || employeeNameFromUrl || "";
  const displayEmployeeCode =
    auditedEmployeeCode || employeeCodeFromUrl || header?.employeeCode || "";

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
              <div><strong>Audit No :</strong> <span><Txt>{header?.auditNo}</Txt></span></div>
              <div><strong>Manager Name :</strong> <span><Txt>{header?.managerName}</Txt></span></div>
              <div>
                <strong>Employee/Doctor/Therapist :</strong>{" "}
                <span>
                  <Txt>{displayEmployeeName || "—"}</Txt>
                  {displayEmployeeCode ? <> (<Txt>{displayEmployeeCode}</Txt>)</> : null}
                </span>
              </div>
              <div><strong>Audit Segment :</strong> <span><Txt>{header?.auditSegment}</Txt></span></div>
              <div><strong>Clinic :</strong> <span><Txt>{header?.clinicName || clinicFromUrl}</Txt></span></div>
              <div><strong>Auditor's :</strong> <span><Txt>{header?.auditorName}</Txt></span></div>
              <div><strong>Audit Month :</strong> <span><Txt>{header?.auditMonth}</Txt></span></div>
              <div><strong>Audit Date :</strong> <span><Txt>{header?.auditDateDMY}</Txt></span></div>
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
                          <td className="left"><Txt>{r.subSegment}</Txt></td>

                          <td className="left">
                            <div
                              className="rich"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.criteria) }}
                            />
                          </td>

                          <td className="center">
                            <select
                              value={scores[code] === null || scores[code] === undefined ? "" : String(scores[code])}
                              onChange={(e) => setScore(code, e.target.value)}
                            >
                              <option value="-1">Select</option>
                              <option value="0">0</option>
                              <option value="1">1</option>
                            </select>
                          </td>
                          <td className="right">{r.weightageStr || `${r.weightageNum}%`}</td>
                          <td className="right">{total.toFixed(2)}</td>
                          <td className="left">
                            <input
                              className={/[\u0600-\u06FF]/.test(remarks[code] || "") ? "arb" : ""}
                              value={remarks[code] ?? ""}
                              onChange={(e) => setRemark(code, e.target.value)}
                              dir={/[\u0600-\u06FF]/.test(remarks[code] || "") ? "rtl" : "auto"}
                              lang={/[\u0600-\u06FF]/.test(remarks[code] || "") ? "ar" : undefined}
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
          gap: 18px;
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
        tbody td { font-size: 13px; color: #111827; padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        .left { text-align: left; }
        .center { text-align: center; }
        .right { text-align: right; }

        .rich { line-height: 1.35; }
        .rich p { margin: 0 0 6px; }
        .rich ul, .rich ol { margin: 6px 0 6px 18px; padding: 0; }
        .rich li { margin: 2px 0; }
        .rich b, .rich strong { font-weight: 700; }

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