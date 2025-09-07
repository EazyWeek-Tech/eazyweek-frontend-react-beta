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
  // already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  // try dd-mm-yyyy or d-m-yyyy
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [ , d, mo, y ] = m;
    const dd = String(d).padStart(2, "0");
    const mm = String(mo).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  // fallback via Date (may shift tz; slice to date only)
  const d = new Date(t);
  return isNaN(d) ? todayISO() : d.toISOString().slice(0,10);
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

  // digital-only options (from new endpoints)
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  // common fields
  const [clinicCode, setClinicCode] = useState(state?.clinicCode || "");
  const [month, setMonth] = useState(state?.month || MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(state?.year || "");
  const [auditDate, setAuditDate] = useState(state?.auditDate || todayISO());

  // standard form
  const [employeeCode, setEmployeeCode] = useState(state?.employeeCode || "");

  // digital form
  const [doctorCode, setDoctorCode] = useState(state?.doctorCode || "");
  const [departmentCode, setDepartmentCode] = useState(state?.departmentCode || "");
  const [managerCode, setManagerCode] = useState(state?.managerCode || "");

  const [loadingSeg, setLoadingSeg] = useState(false);
  const [loadingOpts, setLoadingOpts] = useState(false);
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
        const list = (Array.isArray(d) ? d : [d]).filter(Boolean).map((s) => ({
          code: norm(s.code),
          name: norm(s.name),
        }));
        setSegments(list);

        // resolve label for any prefilled segment (code OR name)
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

  // load clinics (common)
  useEffect(() => {
    (async () => {
      try {
        setLoadingOpts(true);

        // Clinics (fallback sample)
        let centers = [];
        try {
          const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" });
          const payload = await r.json();
          centers = Array.isArray(payload) ? payload : (payload ? [payload] : []);
        } catch {
          centers = [{ code: "Bright", name: "Bright Clinics" }];
        }
        setClinics(centers);

        // Default clinic if only one
        if (!clinicCode && centers.length === 1) setClinicCode(centers[0].code);
      } catch (e) {
        console.error(e);
        showToast("Failed to load form options");
      } finally {
        setLoadingOpts(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DIGITAL: doctors + departments (segment-based)
  useEffect(() => {
    if (!isDigitalSeg) return;
    const seg = encodeURIComponent(segmentName || segmentCode);

    (async () => {
      try {
        // Doctors by segment
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationDoctor/${seg}`, { credentials: "include" });
          const d = await r.json();
          const list = Array.isArray(d) ? d : (d ? [d] : []);
          setDoctors(list);
        } catch {
          setDoctors([]);
        }

        // Departments (segment-agnostic per spec)
        try {
          const r = await fetch(`${API_BASE_URL}/api/Audit/LoadAuditCreationDepartment`, { credentials: "include" });
          const d = await r.json();
          const list = Array.isArray(d) ? d : (d ? [d] : []);
          setDepartments(list);
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

  // NON-DIGITAL: employees by segment
  useEffect(() => {
    // clear when segment missing or when Digital segment
    if (!segmentCode && !segmentName) { setEmployees([]); return; }
    if (isDigitalSeg) { setEmployees([]); return; }

    const seg = encodeURIComponent(segmentName || segmentCode);

    (async () => {
      try {
        setLoadingOpts(true);
        const r = await fetch(`${API_BASE_URL}/api/Audit/LoadEmployeesInAudit/${seg}`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const list = Array.isArray(d) ? d : (d ? [d] : []);

        // map API { name, code } -> UI { employeeName, employeeCode }
        const mapped = list.map(x => ({
          employeeCode: x.code ?? x.employeeCode ?? "",
          employeeName: x.name ?? x.employeeName ?? "",
        })).filter(e => e.employeeCode || e.employeeName);

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

  // DIGITAL: managers need both segment and auditDate (as DateTime)
  useEffect(() => {
    if (!isDigitalSeg) return;
    const seg = encodeURIComponent(segmentName || segmentCode);
    // Build RFC 3339 DateTime from the date-only control
    const isoDT = encodeURIComponent(`${auditDateISO}T00:00:00Z`);

    (async () => {
      try {
        // Pass AuditDate as a PATH param (…/{Segment}/{AuditDate})
        const url = `${API_BASE_URL}/api/Audit/LoadAuditCreationManager/${seg}/${isoDT}`;
        const r = await fetch(url, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const list = Array.isArray(d) ? d : (d ? [d] : []);
        setManagers(list);
      } catch (e) {
        console.error(e);
        // if the API complains about DateTime, user sees the toast
        showToast("Could not load managers. Check the audit date.");
        setManagers([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDigitalSeg, segmentCode, segmentName, auditDateISO]);

  // when switching segment, clear fields from the other layout
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

  const clinicName = clinics.find((c) => c.code === clinicCode)?.name || "";

  const onNext = () => {
    if (!segmentCode && !segmentName) return showToast("Please choose an audit segment");
    if (!clinicCode && !isDigitalSeg) return showToast("Please choose/confirm clinic");
    if (!month || !year) return showToast("Please choose month and year");
    if (!auditDateISO) return showToast("Please choose audit date");

    const segForRoute = norm(segmentCode || segmentName).toLowerCase();

    if (isDigitalSeg) {
      if (!doctorCode) return showToast("Please choose Doctor/Therapist");
      if (!departmentCode) return showToast("Please choose Department");
      if (!managerCode) return showToast("Please choose Manager");

      navigate(`/audit/${segForRoute}/form`, {
        state: {
          segment: segmentCode || segmentName,
          clinicCode,
          clinicName,
          month,
          year,
          auditDate: auditDateISO,             // ensure ISO goes forward too
          doctorCode,
          departmentCode,
          managerCode,
        },
      });
    } else {
      if (!employeeCode) return showToast("Please choose Employee");

      navigate(`/audit/${segForRoute}/form`, {
        state: {
          segment: segmentCode || segmentName,
          clinicCode,
          clinicName,
          month,
          year,
          auditDate: auditDateISO,             // ensure ISO
          employeeCode,
        },
      });
    }
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
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {(segmentCode || segmentName) && (
        <div className="card">
          <h2 className="subtitle">{`${segLabel} Audit${clinicName ? " - " + clinicName : ""}`}</h2>

          {isDigitalSeg ? (
            <>
              <div className="grid">
                <div className="row">
                  <label>Clinic</label>
                  <input value={clinicName} readOnly />
                </div>

                <div className="row">
                  <label>Audit Month</label>
                  <select value={month} onChange={(e) => setMonth(e.target.value)}>
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">&lt; -- Select Year -- &gt;</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Date</label>
                  <input
                    type="date"
                    value={auditDateISO}
                    onChange={(e) => setAuditDate(e.target.value)}
                  />
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
                    {managers.map((m) => (
                      <option key={m.code ?? m.employeeCode ?? m.name} value={m.code ?? m.employeeCode ?? m.name}>
                        {m.name ?? m.employeeName ?? (m.code ?? m.employeeCode)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="actions">
                <button className="btn primary" onClick={onNext}>NEXT</button>
              </div>
            </>
          ) : (
            <>
              <div className="grid">
                <div className="row">
                  <label>Employee</label>
                  <select value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)}>
                    <option value="">&lt; - Select one - &gt;</option>
                    {employees.map((e) => (
                      <option key={e.employeeCode} value={e.employeeCode}>
                        {e.employeeName} ({e.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Clinic</label>
                  <select value={clinicCode} onChange={(e) => setClinicCode(e.target.value)}>
                    <option value="">Select clinic</option>
                    {clinics.map((c) => (
                      <option key={c.code ?? c.name} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Month</label>
                  <select value={month} onChange={(e) => setMonth(e.target.value)}>
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">— Select Year —</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="row">
                  <label>Audit Date</label>
                  <input
                    type="date"
                    value={auditDateISO}
                    onChange={(e) => setAuditDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="actions">
                <button className="btn primary" onClick={onNext}>NEXT</button>
              </div>
            </>
          )}
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .wrap { max-width: 680px; margin: 0 auto; padding: 20px; }
        .title { text-align: center; margin: 6px 0 18px; font-size: 24px; color: #0b1f3a; }
        .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 16px; margin-bottom: 16px; }
        .subtitle { margin: 0 0 14px; font-size: 18px; color: #0b1f3a; }
        .row { display: flex; flex-direction: column; gap: 6px; }
        .grid { display: grid;  gap: 14px 18px; }
        label { font-size: 16px; font-weight: 700; color: #5a6270; }
        select, input[type="date"], input[readonly] {
          height: 38px; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; outline: none; background: #fff;
        }
        input[readonly] { background: #f7f9fc; color: #1b2636; }
        .actions { display: flex; justify-content: center; margin-top: 18px; }
        .btn { background: #1d2c43; color: #fff; border: none; border-radius: 8px; padding: 10px 22px; font-weight: 700; cursor: pointer; }
        .btn.primary { background: #112032; }
        .toast { position: fixed; bottom: 16px; right: 16px; color:#fff; background:#d7263d; padding:10px 14px; border-radius:8px; font-weight:600; box-shadow:0 6px 18px rgba(0,0,0,0.15); z-index:9999; }
        .toast.success { background:#138a36; }
        @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
