"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const todayISO = () => new Date().toISOString().slice(0, 10);
const norm = (s) => (s ?? "").toString().trim();
const isDigitalVal = (s) => norm(s).toLowerCase() === "digital";

/* robust ISO (handles yyyy-mm-dd and dd-mm-yyyy) */
function toISODate(s) {
  const t = norm(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const dd = String(d).padStart(2, "0");
    const mm = String(mo).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  const d = new Date(t);
  return isNaN(d) ? todayISO() : d.toISOString().slice(0, 10);
}

/* month label → number (1–12); accepts "Jan" or 1..12 or "09" */
const toMonthNumber = (m) => {
  const t = (m ?? "").toString().trim();
  if (!t) return new Date().getMonth() + 1;
  const n = Number(t);
  if (!Number.isNaN(n) && n >= 1 && n <= 12) return n;
  const idx = MONTHS.findIndex((x) => x.toLowerCase().startsWith(t.toLowerCase().slice(0, 3)));
  return idx >= 0 ? idx + 1 : new Date().getMonth() + 1;
};

/* send midnight UTC DateTime */
const toMidnightUtc = (isoDate /* yyyy-mm-dd */) => `${isoDate}T00:00:00.000Z`;

/* ---------- Session helpers for clinic prefill ---------- */
const tryParseJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };
const pickTopCode = (o) => norm(o?.topCode ?? o?.loginCode ?? o?.centerCode ?? "");
function getSessionObj() {
  if (typeof window === "undefined") return {};
  const globals = window.__SESSION__ || window.__USER__ || window.__APP__ || {};
  if (globals && typeof globals === "object" && Object.keys(globals).length) return globals;

  const keys = ["user", "session", "auth", "currentUser", "loggedInUser"];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    if (!storage) continue;
    for (const k of keys) {
      const raw = storage.getItem(k);
      if (!raw) continue;
      const parsed = tryParseJSON(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  }
  return {};
}

export default function AuditCreate() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // segments
  const [segments, setSegments] = useState([]);
  const [segmentCode, setSegmentCode] = useState(norm(state?.segment));
  const [segmentName, setSegmentName] = useState("");

  // common options
  const [employees, setEmployees] = useState([]);
  const [clinics, setClinics] = useState([]);

  // digital-only options
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  // common fields
  const sessionTopCodeRef = useMemo(() => pickTopCode(getSessionObj()), []);
  const [clinicCode, setClinicCode] = useState(state?.clinicCode || ""); // will be prefilled from session topCode
  const [month, setMonth] = useState(() => toMonthNumber(state?.month)); // 1–12
  const [year, setYear] = useState(state?.year || "");
  const [auditDate, setAuditDate] = useState(state?.auditDate || todayISO());

  // standard
  const [employeeCode, setEmployeeCode] = useState(state?.employeeCode || "");

  // digital
  const [doctorCode, setDoctorCode] = useState(state?.doctorCode || "");
  const [departmentCode, setDepartmentCode] = useState(state?.departmentCode || "");
  const [managerCode, setManagerCode] = useState(state?.managerCode || "");

  const [loadingSeg, setLoadingSeg] = useState(false);
  const [loadingOpts, setLoadingOpts] = useState(false);
  const [checkingDup, setCheckingDup] = useState(false);
  const [toast, setToast] = useState(null);

  const isDigitalSeg = isDigitalVal(segmentCode) || isDigitalVal(segmentName);
  const auditDateISO = toISODate(auditDate);

  const showToast = (message, type = "error", ms = 2200) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const out = [];
    for (let y = now + 1; y >= now - 3; y--) out.push(String(y));
    return out;
  }, []);

  // load segments
  useEffect(() => {
    (async () => {
      try {
        setLoadingSeg(true);
        const r = await fetch(`${API_BASE_URL}/api/Audit/AuditSegment`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const list = (Array.isArray(d) ? d : [d])
          .filter(Boolean)
          .map((s) => ({ code: norm(s.code), name: norm(s.name) }));
        setSegments(list);

        if (segmentCode || segmentName) {
          const match =
            list.find((s) => norm(s.code) === norm(segmentCode)) ||
            list.find((s) => norm(s.name) === norm(segmentCode)) ||
            list.find((s) => norm(s.code) === norm(segmentName)) ||
            list.find((s) => norm(s.name) === norm(segmentName));
          if (match) {
            setSegmentCode(match.code);
            setSegmentName(match.name);
          }
        }
      } catch (e) {
        console.error(e);
        showToast("Failed to load audit segments");
      } finally {
        setLoadingSeg(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load clinics (common) + prefill from session topCode
  useEffect(() => {
    (async () => {
      try {
        setLoadingOpts(true);
        let centers = [];
        try {
          const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" });
          const payload = await r.json();
          centers = Array.isArray(payload) ? payload : payload ? [payload] : [];
        } catch {
          centers = []; // if this fails, no fallback list — we rely on session code only for display
        }
        setClinics(centers);

        // Prefill clinicCode using session topCode/loginCode (case-insensitive)
        const sessTop = sessionTopCodeRef;
        if (sessTop) {
          const match =
            centers.find((c) => norm(c.code).toLowerCase() === norm(sessTop).toLowerCase()) ||
            centers.find((c) => norm(c.name).toLowerCase() === norm(sessTop).toLowerCase());
          if (match) {
            setClinicCode(match.code);
            return;
          }
          // If no match but session has a value, still set that as code (name will stay blank)
          setClinicCode(sessTop);
          return;
        }

        // Fallback: if only one center returned, use it
        if (!clinicCode && centers.length === 1) setClinicCode(centers[0].code);
      } catch (e) {
        console.error(e);
        showToast("Failed to load form options");
      } finally {
        setLoadingOpts(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE_URL, sessionTopCodeRef]);

  // DIGITAL: doctors + departments
  useEffect(() => {
    if (!isDigitalSeg) return;
    const seg = encodeURIComponent(segmentName || segmentCode);
    (async () => {
      try {
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationDoctor/${seg}`, { credentials: "include" });
          const d = await r.json();
          setDoctors(Array.isArray(d) ? d : d ? [d] : []);
        } catch {
          setDoctors([]);
        }
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationDepartment`, { credentials: "include" });
          const d = await r.json();
          setDepartments(Array.isArray(d) ? d : d ? [d] : []);
        } catch {
          setDepartments([]);
        }
      } catch (e) {
        console.error(e);
        showToast("Failed to load Digital options");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDigitalSeg, segmentCode, segmentName]);

  // NON-DIGITAL: employees
  useEffect(() => {
    if (!segmentCode && !segmentName) {
      setEmployees([]);
      return;
    }
    if (isDigitalSeg) {
      setEmployees([]);
      return;
    }
    const seg = encodeURIComponent(segmentName || segmentCode);
    (async () => {
      try {
        setLoadingOpts(true);
        const r = await fetch(`${API_BASE_URL}/api/Audit/LoadEmployeesInAudit/${seg}`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const list = Array.isArray(d) ? d : d ? [d] : [];
        const mapped = list
          .map((x) => ({
            employeeCode: x.code ?? x.employeeCode ?? "",
            employeeName: x.name ?? x.employeeName ?? "",
          }))
          .filter((e) => e.employeeCode || e.employeeName);
        setEmployees(mapped);
      } catch (e) {
        console.error(e);
        setEmployees([]);
        showToast("Failed to load employees for the selected segment");
      } finally {
        setLoadingOpts(false);
      }
    })();
  }, [segmentCode, segmentName, isDigitalSeg]);

  // DIGITAL: Manager (needs AuditDate) -> fallback Employee
  useEffect(() => {
    if (!isDigitalSeg) return;
    const seg = encodeURIComponent(segmentName || segmentCode);
    const d = auditDateISO;
    const loadManagerThenEmployee = async () => {
      const shapes = [`${d}T00:00:00`, d, `${d}T00:00:00+05:30`, `${d}T00:00:00Z`].map((AuditDate) =>
        new URLSearchParams({ AuditDate }).toString()
      );
      for (const qs of shapes) {
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationManager/${seg}?${qs}`, {
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          if (r.status === 404) break;
          if (r.ok) {
            const d = await r.json();
            const list = (Array.isArray(d) ? d : d ? [d] : [])
              .map((m) => ({ code: m.code ?? m.employeeCode ?? "", name: m.name ?? m.employeeName ?? "" }))
              .filter((x) => x.code || x.name);
            setManagers(list);
            return;
          }
        } catch (e) {
          console.error("Manager fetch error:", e);
        }
      }
      try {
        const rEmp = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationEmployee/${seg}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (rEmp.ok) {
          const d = await rEmp.json();
          const list = (Array.isArray(d) ? d : d ? [d] : [])
            .map((x) => ({ code: x.code ?? "", name: x.name ?? "" }))
            .filter((x) => x.code || x.name);
          setManagers(list);
          return;
        }
        setManagers([]);
        showToast("Could not load managers/employees for Digital.");
      } catch (e) {
        console.error("Employee fetch error:", e);
        setManagers([]);
        showToast("Could not load managers/employees for Digital.");
      }
    };
    loadManagerThenEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDigitalSeg, segmentCode, segmentName, auditDateISO]);

  // clear opposite layout fields
  useEffect(() => {
    if (isDigitalSeg) {
      setEmployeeCode("");
    } else {
      setDoctorCode("");
      setDepartmentCode("");
      setManagerCode("");
    }
  }, [isDigitalSeg]);

  const segLabel =
    segments.find((s) => norm(s.code) === norm(segmentCode))?.name ||
    segments.find((s) => norm(s.name) === norm(segmentCode))?.name ||
    segmentName ||
    segmentCode;

  const clinicName = clinics.find((c) => norm(c.code).toLowerCase() === norm(clinicCode).toLowerCase())?.name || "";

  // POST duplicate check
  async function duplicateCheck(payload) {
    try {
      const r = await fetch(`${API_BASE_URL}/api/Audit/AuditCreationDupicateCheck`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) return await r.json();
      const t = await r.text().catch(() => "");
      throw new Error(`Duplicate check failed (HTTP ${r.status}) ${t}`);
    } catch (e) {
      console.error(e);
      showToast("Duplicate check failed. Please try again.");
      return null;
    }
  }

  // NEXT
  const onNext = async () => {
    if (!segmentCode && !segmentName) return showToast("Please choose an audit segment");
    // clinic must be prefilled — if still missing, stop
    if (!clinicCode) return showToast("Could not resolve clinic from session. Please re-login and try again.");
    if (!month || !year) return showToast("Please choose month and year");
    if (!auditDateISO) return showToast("Please choose audit date");

    if (isDigitalSeg) {
      if (!doctorCode) return showToast("Please choose Doctor/Therapist");
      if (!departmentCode) return showToast("Please choose Department");
      if (!managerCode) return showToast("Please choose Manager");
    } else {
      if (!employeeCode) return showToast("Please choose Employee");
    }

    const segForRoute = norm(segmentCode || segmentName).toLowerCase();
    const employeeForCheck = isDigitalSeg ? doctorCode : employeeCode;

    // send month as STRING to duplicate check
    const auditMonthStr = MONTHS[(month - 1 + 12) % 12];

    const dupPayload = {
      employeeCode: employeeForCheck,
      auditSegment: segmentCode || segmentName,
      auditDate: toMidnightUtc(auditDateISO),
      auditMonth: auditMonthStr, // <- string
    };

    setCheckingDup(true);
    const dupResp = await duplicateCheck(dupPayload);
    setCheckingDup(false);
    if (!dupResp) return;

    const isDup =
      dupResp.isDuplicate === true ||
      dupResp.duplicate === true ||
      dupResp.exists === true ||
      (dupResp.success === false && /duplicate|exists|already/i.test(dupResp.message ?? ""));

    if (isDup) return showToast(dupResp.message || "Audit already exists for the selected date/person");

    const employeeNameSel = !isDigitalSeg
      ? employees.find((e) => e.employeeCode === employeeCode)?.employeeName || ""
      : "";

    const qs = new URLSearchParams({
      segment: segmentCode || segmentName,
      clinicCode: clinicCode || "",
      clinicName: clinicName || "",
      auditMonth: auditMonthStr,
      year: String(year || ""),
      auditDate: auditDateISO,
      mode: isDigitalSeg ? "digital" : "standard",
      ...(isDigitalSeg
        ? { doctorCode, departmentCode, managerCode }
        : { employeeCode, employeeName: employeeNameSel }),
    }).toString();

    navigate(`/audit/${segForRoute}/form?${qs}`);
  };

  return (
    <div className="wrap">
      <h1 className="title">Create Audit</h1>

      {/* Segment select */}
      <div className="card">
        <div className="row">
          <label>Audit Segment</label>
          <select
            value={segmentCode}
            onChange={(e) => {
              const code = norm(e.target.value);
              setSegmentCode(code);
              const match = segments.find((s) => norm(s.code) === code);
              setSegmentName(match?.name || "");
            }}
            disabled={loadingSeg}
          >
            <option value="">— Select Segment —</option>
            {segments.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(segmentCode || segmentName) && (
        <div className="card">
          <h2 className="subtitle">{`${segLabel} Audit${clinicName ? " - " + clinicName : ""}`}</h2>

          {/* CLINIC: ALWAYS READONLY, PREFILLED FROM SESSION TOPCODE */}
          <div className="grid">
            <div className="row">
              <label>Clinic</label>
              <input value={clinicName || clinicCode || ""} readOnly />
            </div>

            {isDigitalSeg ? (
              <>
                <div className="row">
                  <label>Audit Month</label>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                    {MONTHS.map((label, i) => (
                      <option key={i + 1} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">&lt; -- Select Year -- &gt;</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Date</label>
                  <input type="date" value={auditDateISO} onChange={(e) => setAuditDate(e.target.value)} />
                </div>

                <div className="row">
                  <label>Doctor/Therapist</label>
                  <select value={doctorCode} onChange={(e) => setDoctorCode(e.target.value)}>
                    <option value="">&lt; - Select one - &gt;</option>
                    {doctors.map((d) => (
                      <option key={d.code ?? d.name} value={d.code ?? d.name}>
                        {d.name ?? d.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Department</label>
                  <select value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)}>
                    <option value="">&lt; - Select one - &gt;</option>
                    {departments.map((d) => (
                      <option key={d.code ?? d.name} value={d.code ?? d.name}>
                        {d.name ?? d.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Manager</label>
                  <select value={managerCode} onChange={(e) => setManagerCode(e.target.value)}>
                    <option value="">&lt; - Select one - &gt;</option>
                    {managers.map((m, i) => {
                      const value = m.code ?? m.employeeCode ?? `idx-${i}`;
                      const label = m.name ?? m.employeeName ?? (m.code ?? m.employeeCode ?? "—");
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="row">
                  <label>Employee</label>
                  <select value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)}>
                    <option value="">&lt; - Select one - &gt;</option>
                    {employees.map((e) => (
                      <option key={e.employeeCode} value={e.employeeCode}>
                        {e.employeeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Month</label>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                    {MONTHS.map((label, i) => (
                      <option key={i + 1} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">— Select Year —</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Date</label>
                  <input type="date" value={auditDateISO} onChange={(e) => setAuditDate(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="actions">
            <button className="btn primary" onClick={onNext} disabled={checkingDup}>
              {checkingDup ? "CHECKING..." : "NEXT"}
            </button>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .wrap { max-width: 680px; margin: 0 auto; padding: 20px; }
        .title { text-align: center; margin: 6px 0 18px; font-size: 24px; color: #0b1f3a; }
        .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 16px; margin-bottom: 16px; }
        .subtitle { margin: 0 0 14px; font-size: 18px; color: #0b1f3a; }
        .row { display: flex; flex-direction: column; gap: 6px; }
        .grid { display: grid; gap: 14px 18px; }
        label { font-size: 16px; font-weight: 700; color: #5a6270; }
        select, input[type="date"], input[readonly] {
          height: 38px; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; outline: none; background: #fff;
        }
        input[readonly] { background: #f7f9fc; color: #1b2636; }
        .actions { display: flex; justify-content: center; margin-top: 18px; }
        .btn { background: #1d2c43; color: #fff; border: none; border-radius: 8px; padding: 10px 22px; font-weight: 700; cursor: pointer; }
        .btn.primary { background: #112032; }
        .btn[disabled] { opacity: .7; cursor: not-allowed; }
        .toast { position: fixed; bottom: 16px; right: 16px; color:#fff; background:#d7263d; padding:10px 14px; border-radius:8px; font-weight:600; box-shadow:0 6px 18px rgba(0,0,0,0.15); z-index:9999; }
        .toast.success { background:#138a36; }
        @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
