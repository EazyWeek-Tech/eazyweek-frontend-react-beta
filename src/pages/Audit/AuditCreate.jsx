"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const todayISO = () => new Date().toISOString().slice(0, 10);
const norm = (s) => (s ?? "").toString().trim();
const isDigitalVal = (s) => norm(s).toLowerCase() === "digital";

function toISODate(s) {
  const t = norm(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  const d = new Date(t);
  return isNaN(d) ? todayISO() : d.toISOString().slice(0, 10);
}

const toMonthNumber = (m) => {
  const t = (m ?? "").toString().trim();
  if (!t) return new Date().getMonth() + 1;
  const n = Number(t);
  if (!Number.isNaN(n) && n >= 1 && n <= 12) return n;
  const idx = MONTHS.findIndex((x) => x.toLowerCase().startsWith(t.toLowerCase().slice(0, 3)));
  return idx >= 0 ? idx + 1 : new Date().getMonth() + 1;
};

const toMidnightUtc = (isoDate) => `${isoDate}T00:00:00.000Z`;

const tryParseJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };
const pickTopCode = (o) => norm(o?.topCode ?? o?.loginCode ?? o?.centerCode ?? "");
const pickUserId = (o) => norm(o?.userID ?? o?.userId ?? o?.employeeCode ?? o?.empCode ?? "");

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

const Field = ({ label, children }) => (
  <div className="field">
    <label className="field-label">{label}</label>
    <div className="field-control">{children}</div>
  </div>
);

export default function AuditCreate() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [segments, setSegments] = useState([]);
  const [segmentCode, setSegmentCode] = useState(norm(state?.segment));
  const [segmentName, setSegmentName] = useState("");
  const [employees, setEmployees] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  const sessionObj = useMemo(() => getSessionObj(), []);
  const sessionTopCodeRef = useMemo(() => pickTopCode(sessionObj), [sessionObj]);

  const [clinicCode, setClinicCode] = useState(state?.clinicCode || "");
  const [month, setMonth] = useState(() => toMonthNumber(state?.month));
  const [year, setYear] = useState(state?.year || "");
  const [auditDate, setAuditDate] = useState(state?.auditDate || todayISO());
  const [employeeCode, setEmployeeCode] = useState(state?.employeeCode || "");
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

  useEffect(() => {
    (async () => {
      try {
        setLoadingSeg(true);
        const r = await fetch(`${API_BASE_URL}/api/Audit/AuditSegment`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const list = (Array.isArray(d) ? d : [d]).filter(Boolean).map((s) => ({ code: norm(s.code), name: norm(s.name) }));
        setSegments(list);
        if (segmentCode || segmentName) {
          const match = list.find((s) => norm(s.code) === norm(segmentCode)) || list.find((s) => norm(s.name) === norm(segmentCode));
          if (match) { setSegmentCode(match.code); setSegmentName(match.name); }
        }
      } catch (e) { showToast("Failed to load audit segments"); }
      finally { setLoadingSeg(false); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingOpts(true);
        let centers = [];
        try {
          const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" });
          const payload = await r.json();
          centers = Array.isArray(payload) ? payload : payload ? [payload] : [];
        } catch { centers = []; }
        setClinics(centers);
        const sessTop = sessionTopCodeRef;
        if (sessTop) {
          const match = centers.find((c) => norm(c.code).toLowerCase() === norm(sessTop).toLowerCase());
          setClinicCode(match ? match.code : sessTop);
          return;
        }
        if (!clinicCode && centers.length === 1) setClinicCode(centers[0].code);
      } catch (e) { showToast("Failed to load form options"); }
      finally { setLoadingOpts(false); }
    })();
  }, [API_BASE_URL, sessionTopCodeRef]);

  useEffect(() => {
    if (!isDigitalSeg || !clinicCode) return;
    const seg = encodeURIComponent(segmentName || segmentCode);
    const cc = encodeURIComponent(clinicCode);
    (async () => {
      try {
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationDoctor/${seg}?centerCode=${cc}`, { credentials: "include" });
          const d = await r.json();
          setDoctors(Array.isArray(d) ? d : d ? [d] : []);
        } catch { setDoctors([]); }
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationDepartment`, { credentials: "include" });
          const d = await r.json();
          setDepartments(Array.isArray(d) ? d : d ? [d] : []);
        } catch { setDepartments([]); }
      } catch { showToast("Failed to load Digital options"); }
    })();
  }, [isDigitalSeg, segmentCode, segmentName, clinicCode]);

  useEffect(() => {
    if (!segmentCode && !segmentName) { setEmployees([]); return; }
    if (isDigitalSeg) { setEmployees([]); return; }
    if (!clinicCode) return;
    const seg = encodeURIComponent(segmentName || segmentCode);
    const cc = encodeURIComponent(clinicCode);
    (async () => {
      try {
        setLoadingOpts(true);
        const r = await fetch(`${API_BASE_URL}/api/Audit/LoadEmployeesInAudit/${seg}?centerCode=${cc}`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const list = (Array.isArray(d) ? d : d ? [d] : []).map((x) => ({ employeeCode: x.code ?? x.employeeCode ?? "", employeeName: x.name ?? x.employeeName ?? "" })).filter((e) => e.employeeCode || e.employeeName);
        setEmployees(list);
      } catch { setEmployees([]); showToast("Failed to load employees"); }
      finally { setLoadingOpts(false); }
    })();
  }, [segmentCode, segmentName, isDigitalSeg, clinicCode]);

  useEffect(() => {
    if (!isDigitalSeg || !clinicCode) return;
    const seg = encodeURIComponent(segmentName || segmentCode);
    const cc = encodeURIComponent(clinicCode);
    const loadManagerThenEmployee = async () => {
      const shapes = [`${auditDateISO}T00:00:00`, auditDateISO, `${auditDateISO}T00:00:00Z`].map((AuditDate) => new URLSearchParams({ AuditDate, centerCode: clinicCode }).toString());
      for (const qs of shapes) {
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationManager/${seg}?${qs}`, { credentials: "include", headers: { Accept: "application/json" } });
          if (r.status === 404) break;
          if (r.ok) {
            const d = await r.json();
            const list = (Array.isArray(d) ? d : d ? [d] : []).map((m) => ({ code: m.code ?? m.employeeCode ?? "", name: m.name ?? m.employeeName ?? "" })).filter((x) => x.code || x.name);
            setManagers(list); return;
          }
        } catch {}
      }
      try {
        const rEmp = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationEmployee/${seg}?centerCode=${cc}`, { credentials: "include", headers: { Accept: "application/json" } });
        if (rEmp.ok) {
          const d = await rEmp.json();
          setManagers((Array.isArray(d) ? d : d ? [d] : []).map((x) => ({ code: x.code ?? "", name: x.name ?? "" })).filter((x) => x.code || x.name));
          return;
        }
        setManagers([]); showToast("Could not load managers for Digital.");
      } catch { setManagers([]); showToast("Could not load managers for Digital."); }
    };
    loadManagerThenEmployee();
  }, [isDigitalSeg, segmentCode, segmentName, auditDateISO, clinicCode]);

  useEffect(() => {
    if (isDigitalSeg) { setEmployeeCode(""); }
    else { setDoctorCode(""); setDepartmentCode(""); setManagerCode(""); }
  }, [isDigitalSeg]);

  const segLabel = segments.find((s) => norm(s.code) === norm(segmentCode))?.name || segmentName || segmentCode;
  const clinicName = clinics.find((c) => norm(c.code).toLowerCase() === norm(clinicCode).toLowerCase())?.name || "";

  async function duplicateCheck(payload) {
    try {
      const r = await fetch(`${API_BASE_URL}/api/Audit/AuditCreationDupicateCheck`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) return await r.json();
      throw new Error(`HTTP ${r.status}`);
    } catch { showToast("Duplicate check failed. Please try again."); return null; }
  }

  const onNext = async () => {
    if (!segmentCode && !segmentName) return showToast("Please choose an audit segment");
    if (!clinicCode) return showToast("Could not resolve clinic from session. Please re-login.");
    if (!month || !year) return showToast("Please choose month and year");
    if (!auditDateISO) return showToast("Please choose audit date");
    if (isDigitalSeg) {
      if (!doctorCode) return showToast("Please choose Doctor/Therapist");
      if (!departmentCode) return showToast("Please choose Department");
      if (!managerCode) return showToast("Please choose Manager");
    } else {
      if (!employeeCode) return showToast("Please choose Employee");
    }
    const auditMonthStr = MONTHS[(month - 1 + 12) % 12];
    setCheckingDup(true);
    const dupResp = await duplicateCheck({ employeeCode: isDigitalSeg ? doctorCode : employeeCode, auditSegment: segmentCode || segmentName, auditDate: toMidnightUtc(auditDateISO), auditMonth: auditMonthStr });
    setCheckingDup(false);
    if (!dupResp) return;
    if (dupResp.success !== true) return showToast(dupResp.message || "Audit already exists for the selected date/person");
    const employeeNameSel = !isDigitalSeg ? employees.find((e) => e.employeeCode === employeeCode)?.employeeName || "" : "";
    const qs = new URLSearchParams({ segment: segmentCode || segmentName, clinicCode: clinicCode || "", clinicName: clinicName || "", auditMonth: auditMonthStr, year: String(year || ""), auditDate: auditDateISO, mode: isDigitalSeg ? "digital" : "standard", ...(isDigitalSeg ? { doctorCode, departmentCode, managerCode } : { employeeCode, employeeName: employeeNameSel }) }).toString();
    navigate(`/audit/${norm(segmentCode || segmentName).toLowerCase()}/form?${qs}`);
  };

  const hasSegment = !!(segmentCode || segmentName);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-title-group">
            <span className="page-eyebrow">Audit Module</span>
            <h1 className="page-title">Create Audit</h1>
          </div>
          {hasSegment && clinicName && (
            <div className="page-badge">
              <span className="badge-dot" />
              {clinicName}
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="step-card">
          <div className="step-header">
            <div className="step-number">1</div>
            <div>
              <div className="step-title">Select Segment</div>
              <div className="step-desc">Choose the audit category to proceed</div>
            </div>
          </div>
          <div className="step-body">
            <Field label="Audit Segment">
              <select value={segmentCode} onChange={(e) => { const code = norm(e.target.value); setSegmentCode(code); const match = segments.find((s) => norm(s.code) === code); setSegmentName(match?.name || ""); }} disabled={loadingSeg} className={loadingSeg ? "loading-select" : ""}>
                <option value="">— Select Segment —</option>
                {segments.map((s) => (<option key={s.code} value={s.code}>{s.name}</option>))}
              </select>
            </Field>
          </div>
        </div>

        {hasSegment && (
          <div className="step-card animate-in">
            <div className="step-header">
              <div className="step-number">2</div>
              <div>
                <div className="step-title">{segLabel} Audit Details</div>
                <div className="step-desc">Fill in the audit information below</div>
              </div>
            </div>

            <div className="step-body">
              <div className="section-divider">
                <span>Clinic & Period</span>
              </div>
              <div className="fields-grid fields-grid-3">
                <Field label="Clinic">
                  <input value={clinicName || clinicCode || ""} readOnly className="input-readonly" />
                </Field>
                <Field label="Audit Month">
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                    {MONTHS.map((label, i) => (<option key={i + 1} value={i + 1}>{label}</option>))}
                  </select>
                </Field>
                <Field label="Audit Year">
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">— Select Year —</option>
                    {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </Field>
                <Field label="Audit Date">
                  <input type="date" value={auditDateISO} onChange={(e) => setAuditDate(e.target.value)} />
                </Field>
              </div>

              <div className="section-divider">
                <span>{isDigitalSeg ? "Digital Audit Details" : "Employee"}</span>
              </div>

              {isDigitalSeg ? (
                <div className="fields-grid fields-grid-3">
                  <Field label="Doctor / Therapist">
                    <select value={doctorCode} onChange={(e) => setDoctorCode(e.target.value)}>
                      <option value="">— Select —</option>
                      {doctors.map((d) => (<option key={d.code ?? d.name} value={d.code ?? d.name}>{d.name ?? d.code}</option>))}
                    </select>
                  </Field>
                  <Field label="Department">
                    <select value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)}>
                      <option value="">— Select —</option>
                      {departments.map((d) => (<option key={d.code ?? d.name} value={d.code ?? d.name}>{d.name ?? d.code}</option>))}
                    </select>
                  </Field>
                  <Field label="Manager">
                    <select value={managerCode} onChange={(e) => setManagerCode(e.target.value)}>
                      <option value="">— Select —</option>
                      {managers.map((m, i) => { const value = m.code ?? `idx-${i}`; return (<option key={value} value={value}>{m.name || value}</option>); })}
                    </select>
                  </Field>
                </div>
              ) : (
                <div className="fields-grid fields-grid-3">
                  <Field label="Employee">
                    <select value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)}>
                      <option value="">— Select —</option>
                      {employees.map((e) => (<option key={e.employeeCode} value={e.employeeCode}>{e.employeeName}</option>))}
                    </select>
                  </Field>
                </div>
              )}

              <div className="step-actions">
                <button className="btn-primary" onClick={onNext} disabled={checkingDup}>
                  {checkingDup ? (<><span className="btn-spinner" />Checking...</>) : "Next →"}
                </button>
              </div>
            </div>
          </div>
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

        .page {
          min-height: 100vh;
          background: #f0f2f5;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .page-header {
          background: #0b1f3a;
          padding: 0 32px;
          border-bottom: 3px solid #1a3a6b;
        }
        .page-header-inner {
          max-width: 860px;
          margin: 0 auto;
          padding: 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .page-eyebrow {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6b8fc7;
          margin-bottom: 4px;
        }
        .page-title {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .page-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #a8c4e8;
        }
        .badge-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #4ade80;
          flex-shrink: 0;
        }

        .page-body {
          max-width: 860px;
          margin: 0 auto;
          padding: 28px 32px 48px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .step-card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .animate-in {
          animation: slideIn 0.22s ease;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: #f8f9fb;
          border-bottom: 1px solid #eaecf0;
        }
        .step-number {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: #0b1f3a;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .step-title {
          font-size: 15px;
          font-weight: 700;
          color: #0b1f3a;
        }
        .step-desc {
          font-size: 12px;
          color: #8a94a6;
          margin-top: 2px;
        }

        .step-body {
          padding: 24px;
        }

        .section-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0 18px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8a94a6;
        }
        .section-divider:first-child { margin-top: 0; }
        .section-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #eaecf0;
        }

        .fields-grid {
          display: grid;
          gap: 16px;
        }
        .fields-grid-3 {
          grid-template-columns: repeat(3, 1fr);
        }

        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label {
          font-size: 12px;
          font-weight: 700;
          color: #4b5668;
          letter-spacing: 0.02em;
        }
        .field-control select,
        .field-control input[type="date"],
        .field-control input[type="text"],
        .field-control .input-readonly {
          width: 100%;
          height: 40px;
          border: 1.5px solid #d8dee8;
          border-radius: 8px;
          padding: 0 12px;
          font-size: 14px;
          color: #1b2636;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
          appearance: none;
          -webkit-appearance: none;
        }
        .field-control select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a94a6' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 34px;
        }
        .field-control select:focus,
        .field-control input[type="date"]:focus {
          border-color: #0b1f3a;
          box-shadow: 0 0 0 3px rgba(11,31,58,0.08);
        }
        .field-control .input-readonly {
          background: #f7f9fc;
          color: #4b5668;
          cursor: default;
        }
        .loading-select { opacity: 0.6; }

        .step-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #eaecf0;
        }
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #0b1f3a;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 28px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.02em;
          transition: background 0.15s, transform 0.1s;
        }
        .btn-primary:hover { background: #1a3a6b; }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .btn-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          z-index: 9999;
          animation: toastIn 0.2s ease;
        }
        @keyframes toastIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .toast-error { background: #c0392b; }
        .toast-success { background: #138a36; }
        .toast-icon {
          width: 20px; height: 20px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          flex-shrink: 0;
        }

        @media (max-width: 700px) {
          .page-body { padding: 16px; }
          .fields-grid-3 { grid-template-columns: 1fr; }
          .page-header { padding: 0 16px; }
          .page-badge { display: none; }
        }
      `}</style>
    </div>
  );
}