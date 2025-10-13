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

const toDMY = (iso /* yyyy-mm-dd */) => {
  const [y, m, d] = (iso || "").split("-");
  if (!y || !m || !d) return iso || "";
  return `${d}-${Number(m)}-${y}`;
};

const toMidnightUtc = (iso /* yyyy-mm-dd */) => (iso ? `${iso}T00:00:00.000Z` : "");

// Parse "5%" or " 10 % " → 5 (number)
const parseWeight = (w) => {
  if (!w) return 0;
  const m = String(w).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

// --- Auditor (logged-in user) helpers ---
const tryParseJSON = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};
const pickUserId = (o) =>
  norm(o?.userID ?? o?.userId ?? o?.employeeCode ?? o?.empCode ?? "");

// extract clinic info from a session-like object
const pickClinic = (o) => ({
  code: norm(o?.centerCode ?? o?.loginCode ?? o?.topCode ?? ""),
  name: norm(o?.centerName ?? o?.clinicName ?? ""),
});

function getSessionUserId() {
  if (typeof window === "undefined") return "";
  // Common globals
  const globalObj = window.__SESSION__ || window.__USER__ || window.__APP__ || {};
  const fromGlobal = pickUserId(globalObj);
  if (fromGlobal) return fromGlobal;

  // Common storage keys
  const keys = ["user", "session", "auth", "currentUser", "loggedInUser"];
  for (const storage of [window.sessionStorage, window.localStorage]) {
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

  // 1) globals
  const globalObj = window.__SESSION__ || window.__USER__ || window.__APP__ || {};
  const picked = pickClinic(globalObj);
  if (picked.code || picked.name) return picked;

  // 2) storage
  const keys = ["user", "session", "auth", "currentUser", "loggedInUser"];
  for (const storage of [window.sessionStorage, window.localStorage]) {
    if (!storage) continue;
    for (const k of keys) {
      const raw = storage.getItem(k);
      if (!raw) continue;
      const parsed = tryParseJSON(raw);
      if (parsed && typeof parsed === "object") {
        const fromStore = pickClinic(parsed);
        if (fromStore.code || fromStore.name) return fromStore;
      }
    }
  }
  return { code: "", name: "" };
}

export default function AuditForm() {
  const qs = useQuery();
  const navigate = useNavigate();

  // header data passed via URL from AuditCreate
  const segment = norm(qs.get("segment"));
  const clinicCodeQS = norm(qs.get("clinicCode"));
  const clinicNameQS = decodePlus(norm(qs.get("clinicName") || qs.get("clinic")));
  const auditMonth = norm(qs.get("auditMonth")); // "Sep"
  const year = norm(qs.get("year"));
  const auditDateISO = norm(qs.get("auditDate")); // yyyy-mm-dd
  const mode = norm(qs.get("mode")); // "digital" | "standard"

  // who is audited
  const employeeCode = norm(qs.get("employeeCode")); // standard
  const employeeNameQS = norm(qs.get("employeeName")); // optional name from URL
  const doctorCode = norm(qs.get("doctorCode")); // digital
  const departmentCode = norm(qs.get("departmentCode")); // digital
  const managerCode = norm(qs.get("managerCode")); // digital

  // Auditor (logged-in user) → from session; fallback to ?auditor=<code> if provided
  const [auditorCode, setAuditorCode] = useState(
    norm(qs.get("auditor")) || getSessionUserId()
  );

  // session clinic (used when URL doesn't provide clinic)
  const sessionClinic = useMemo(() => getSessionClinic(), []);
  const [clinicDisplayName, setClinicDisplayName] = useState(
    clinicNameQS || sessionClinic.name || ""
  );
  const [clinicDisplayCode, setClinicDisplayCode] = useState(
    clinicCodeQS || sessionClinic.code || ""
  );

  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(false);

  // row state
  // Use -1 to represent "not selected"
  const [scores, setScores] = useState({}); // { [criteriaCode]: -1|0|1 }
  const [remarks, setRemarks] = useState({}); // { [criteriaCode]: string }

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // resolved employee name (prefer URL value)
  const [employeeName, setEmployeeName] = useState(employeeNameQS || "");

  const showToast = (message, type = "error", ms = 2400) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  // keep auditor in sync if session populates after mount (e.g., SSO)
  useEffect(() => {
    const onStorage = () => {
      const id = getSessionUserId();
      if (id && id !== auditorCode) setAuditorCode(id);

      // also refresh clinic if session changes
      const sc = getSessionClinic();
      if (sc.code && !clinicCodeQS) setClinicDisplayCode(sc.code);
      if (sc.name && !clinicNameQS) setClinicDisplayName(sc.name);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditorCode, clinicCodeQS, clinicNameQS]);

  // Resolve Clinic display name
  useEffect(() => {
    let cancelled = false;

    const code = clinicCodeQS || sessionClinic.code;
    const namePrefilled = clinicNameQS || sessionClinic.name;

    if (namePrefilled) {
      setClinicDisplayName(namePrefilled);
      if (!clinicDisplayCode) setClinicDisplayCode(code || "");
      return () => {
        cancelled = true;
      };
    }

    if (!code) return; // nothing to resolve

    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const payload = await r.json();
        const centers = Array.isArray(payload) ? payload : payload ? [payload] : [];
        const match =
          centers.find((c) => norm(c.code) === code) ||
          centers.find((c) => norm(c.name) === code);
        if (!cancelled) {
          setClinicDisplayName(match?.name || "");
          setClinicDisplayCode(code);
        }
      } catch {
        if (!cancelled) {
          setClinicDisplayName("");
          setClinicDisplayCode(code); // at least show code
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE_URL, clinicCodeQS, clinicNameQS, sessionClinic.code, sessionClinic.name]);

  // load criteria by segment
  useEffect(() => {
    if (!segment) return;
    (async () => {
      try {
        setLoading(true);
        const seg = encodeURIComponent(segment);
        const r = await fetch(
          `${API_BASE_URL}/api/Audit/LoadAuditSegmentCriteria/${seg}`,
          {
            credentials: "include",
            headers: { Accept: "application/json" },
          }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const list = Array.isArray(data) ? data : data ? [data] : [];

        // initialize scores with -1 (force user to choose 0/1 for each row)
        const initScores = {};
        for (const row of list) {
          if (row?.criteriaCode) initScores[row.criteriaCode] = -1;
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
  }, [segment, API_BASE_URL]);

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
    const val = Number(valStr); // "-1" | "0" | "1" -> -1|0|1
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

  // Build payload: on Save send "-1" for unselected; on Submit force "0"/"1"
  const buildPayload = (isDraft) => {
    const normalizeWeight = (w) => {
      const n = String(w ?? "").match(/-?\d+(\.\d+)?/);
      return n ? String(Number(n[0])) : "0";
    };

    const encodeScore = (s) => {
      if (s === 0 || s === 1) return String(s); // "0" | "1"
      return isDraft ? "-1" : "0"; // SAVE => "-1", SUBMIT => "0"
    };

    const valuePresentOf = (s) => {
      // Keep valuePresent strictly "0"/"1" so backend doesn't choke on -1 here.
      return s === 1 ? "1" : "0";
    };

    const subSegmentJson = criteria.map((row) => {
      const code = String(row?.criteriaCode ?? "");
      const weightStr = normalizeWeight(row?.weightage);
      const scoreStr = encodeScore(scores[code]); // "-1" | "0" | "1"

      // totalScore must be numeric; treat -1 like 0
      const totalStr = scoreStr === "1" ? weightStr : "0";

      return {
        auditNo: "",
        criteria: String(row?.criteria ?? ""),
        score: scoreStr, // "-1" | "0" | "1"
        weightage: weightStr, // numeric string
        totalScore: totalStr, // "0" or weight
        auditorRemarks: String((remarks[code] ?? "").trim()),
        subSegment: String(row?.subSegment ?? ""),
        criteriaCode: code,
        valuePresent: valuePresentOf(scores[code]), // "1" only when selected 1; else "0"
      };
    });

    const headerSubSegment = subSegmentJson.length ? subSegmentJson[0].subSegment : "";

    // Gross total from numeric totals
    const grossFromRows = subSegmentJson.reduce(
      (sum, r) => sum + Number(r.totalScore || "0"),
      0
    );

    // Prefer provided year, otherwise infer from auditDate
    const yearFromAuditDate = /^\d{4}/.test(auditDateISO) ? auditDateISO.slice(0, 4) : "";
    const auditYearOut = String(year || yearFromAuditDate || "0");

    return {
      request: isDraft ? "save" : "submit",
      auditSegment: segment,
      subSegment: headerSubSegment,
      auditDate: toMidnightUtc(auditDateISO),
      auditMonth: String(auditMonth || ""),
      auditor: String(auditorCode || ""),
      employeeCode: mode === "digital" ? "" : employeeCode,
      grossTotalScore: grossFromRows,
      auditNo: "",
      auditYear: auditYearOut,
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

  // Save can be incomplete; Submit must be complete
  const onSaveOrSubmit = async (isDraft) => {
    if (!isDraft) {
      const check = validateAllAnswered();
      if (!check.ok) {
        return showToast("Please answer all criteria (Yes/No) before submitting.");
      }
    }

    const payload = buildPayload(isDraft);

    // quick console preview
    try {
      const sample = payload.subSegmentJson.map((r) => ({
        criteriaCode: r.criteriaCode,
        score: r.score,
        totalScore: r.totalScore,
        weightage: r.weightage,
        valuePresent: r.valuePresent,
      }));
      console.group(isDraft ? "SAVE payload check" : "SUBMIT payload check");
      console.table(sample);
      console.groupEnd();
    } catch {
      /* noop */
    }

    try {
      const res = await postAuditCreation(payload);
      const msg =
        res?.responseMessage || (isDraft ? "Saved as draft." : "Submitted successfully.");
      showToast(msg, "success", 800);
      navigate("/auditsegmentview");
    } catch (e) {
      console.error(e);
      showToast(e.message || "Could not save. Please try again.");
    }
  };

  // Resolve employee name:
  // Prefer the URL-provided name (employeeNameQS). If missing, fetch from /api/Employees.
  useEffect(() => {
    if (mode === "digital") return; // not applicable in digital mode
    if (!employeeCode) {
      setEmployeeName("");
      return;
    }

    // If the name was provided in the URL, use it directly (no fetch)
    if (employeeNameQS) {
      setEmployeeName(employeeNameQS);
      return;
    }

    let cancelled = false;

    const pickCode = (emp) =>
      norm(
        emp?.empCode ??
          emp?.employeeCode ??
          emp?.code ??
          emp?.EmpCode ??
          emp?.EmployeeCode
      ).toUpperCase();

    const pickName = (emp) =>
      norm(
        emp?.employeeName ??
          emp?.name ??
          emp?.fullName ??
          emp?.empName ??
          emp?.EmployeeName ??
          emp?.FullName
      );

    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/Employees`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const list = await r.json();
        const arr = Array.isArray(list) ? list : list ? [list] : [];

        const targetCode = norm(employeeCode).toUpperCase();
        const found =
          arr.find((e) => pickCode(e) === targetCode) ||
          // secondary loose match for backends that use short codes
          arr.find((e) => pickCode(e).endsWith(targetCode));

        const name = found ? pickName(found) : "";
        if (!cancelled) setEmployeeName(name || "");
      } catch (err) {
        console.warn("Employee name lookup failed:", err);
        if (!cancelled) setEmployeeName("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [API_BASE_URL, mode, employeeCode, employeeNameQS]);

  return (
    <div className="wrap">
      <h1 className="title">Fill Audit Segment Details</h1>

      {/* Header summary */}
      <div className="summary">
        <div>
          <b>Audit Segment :</b> {segment || "—"}
        </div>
        <div>
          <b>Clinic :</b>{" "}
          {clinicDisplayName ||
            clinicNameQS ||
            clinicDisplayCode ||
            clinicCodeQS ||
            "—"}
        </div>
        <div>
          <b>Audit Month :</b> {auditMonth ? `${auditMonth} / ${year || "—"}` : "—"}
        </div>
        <div>
          <b>Audit Date :</b> {toDMY(auditDateISO) || "—"}
        </div>
        {mode === "digital" ? (
          <>
            <div>
              <b>Doctor/Therapist :</b> {doctorCode || "—"}
            </div>
            <div>
              <b>Department :</b> {departmentCode || "—"}
            </div>
            <div>
              <b>Manager :</b> {managerCode || "—"}
            </div>
          </>
        ) : (
          <div>
            <b>Employee Name :</b> {employeeName || employeeCode || "—"}
          </div>
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
                <th style={{ width: 36 }}>#</th>
                <th>Sub Segment</th>
                <th>Criteria</th>
                <th style={{ width: 120 }}>Score (0/1)</th>
                <th style={{ width: 100 }}>Weightage</th>
                <th style={{ width: 120 }}>Total Score</th>
                <th style={{ width: 220 }}>Remarks (optional)</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((row, idx) => {
                const code = row.criteriaCode;
                const weight = row.weightage;
                const s = scores[code]; // -1 | 0 | 1
                const total = rowTotal(code, weight);

                return (
                  <tr key={code || idx}>
                    <td>{idx + 1}</td>
                    <td>{row.subSegment || "—"}</td>
                    <td>
                      <div
                        className="criteriaHtml"
                        dangerouslySetInnerHTML={{ __html: row.criteria || "" }}
                      />
                    </td>
                    <td>
                      <select
                        value={String(s ?? -1)}
                        onChange={(e) => handleScoreChange(code, e.target.value)}
                      >
                        <option value="-1">— Select —</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                      </select>
                    </td>
                    <td>{weight || "—"}</td>
                    <td>
                      <b>{total}</b>
                    </td>
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
                  <td colSpan={7} style={{ textAlign: "center", padding: "16px" }}>
                    No criteria found.
                  </td>
                </tr>
              )}
            </tbody>
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
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px;
        }
        .title {
          margin: 6px 0 14px;
          font-size: 22px;
          color: #0b1f3a;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          font-weight: 700;
          background: #fff;
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }
        .card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          padding: 12px;
        }
        .tbl {
          width: 100%;
          border-collapse: collapse;
        }
        th,
        td {
          border: 1px solid #e5e8ef;
          padding: 8px;
          vertical-align: top;
          font-size: 14px;
          line-height: 18px;
        }
        th {
          background: #f7f9fc;
          text-align: left;
        }
        .criteriaHtml b {
          font-weight: 700;
        }
        select,
        input[type="text"] {
          width: 100%;
          height: 34px;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          padding: 0 8px;
        }
        .actions {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 14px;
        }
        .btn {
          background: #1d2c43;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 8px 18px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn.primary {
          background: #112032;
        }
        .btn[disabled] {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .loading {
          padding: 16px;
          text-align: center;
        }
        .toast {
          position: fixed;
          bottom: 16px;
          right: 16px;
          color: #fff;
          background: #d7263d;
          padding: 10px 14px;
          border-radius: 8px;
          font-weight: 600;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
        }
        .toast.success {
          background: #138a36;
        }
        @media (max-width: 900px) {
          .summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
