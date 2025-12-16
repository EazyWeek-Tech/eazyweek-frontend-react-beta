// src/pages/Opportunity/OpportunityDetails.jsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
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

/** 'dd/MM/yyyy' | ISO | Date -> JS Date (midnight) */
const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const s = String(v).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return Number.isNaN(+d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Extract "HH:mm" from row. Tries followUpTime, appointmentdatetime, or createddate (24h) */
const getRowTimeHHmm = (row) => {
  const tryFields = [
    row?.followUpTime,
    row?.followuptime,
    row?.appointmentdatetime,
    row?.appointmentDateTime,
    row?.createddate,
  ].filter(Boolean);
  for (const f of tryFields) {
    const s = String(f);
    const mm = s.match(/\b(\d{1,2}):(\d{2})\b/);
    if (mm) {
      const h = String(Number(mm[1])).padStart(2, "0");
      const m = mm[2];
      return `${h}:${m}`;
    }
    const d = new Date(s);
    if (!Number.isNaN(+d)) {
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
  }
  return "";
};

const SHIFTS = [
  "09:00 - 14:00",
  "13:00 - 20:00",
  "10:00 - 18:00",
  "14:00 - 22:00",
  "09:00 - 18:00",
  "10:00 - 20:00",
];

const ROLES = [
  "Call Center Agent",
  "Call Center Supervisor",
  "Call Center Head",
  "Service Quality Agent",
  "Service Quality Supervisor",
  "Service Quality Head",
  "HOD",
  "Clinic Manager",
  "Practitioner",
  "Receptionist",
  "Owner",
  "Admin",
];

const ASSIGN_STORE_KEY = (oppCode) => `EW_OPP_ASSIGN_${oppCode}`;
const LS_MANUAL_ASSIGN = (oppCode) => `EW_OPP_MANUAL_ASSIGN_${oppCode}`;

// ✅ NEW: one-time prepend key (set by ManualOppCustomerDetails on submit)
const LS_NEW_LEAD_KEY = (oppCode) => `EW_OPP_NEW_LEAD_${oppCode}`;

const readManualAssignments = (oppCode) => {
  try {
    return JSON.parse(localStorage.getItem(LS_MANUAL_ASSIGN(oppCode)) || "[]");
  } catch {
    return [];
  }
};

const writeManualAssignments = (oppCode, items) => {
  localStorage.setItem(LS_MANUAL_ASSIGN(oppCode), JSON.stringify(items));
};

// Apply saved assignments to rows (by recid preferred)
const applyManualAssignmentsToRows = (oppCode, rows) => {
  const saved = readManualAssignments(oppCode);
  if (!saved.length) return rows;

  const map = new Map(saved.map((x) => [Number(x.recid) || 0, x]));
  return rows.map((r) => {
    const rec = Number(r?.recid ?? r?.RECID ?? r?.RecID ?? r?.recID ?? 0) || 0;
    const hit = map.get(rec);
    if (!hit) return r;
    return {
      ...r,
      salesOwner: hit.salesOwnerName || r.salesOwner,
      salesOwnerCode: hit.salesOwnerCode || r.salesOwnerCode,
    };
  });
};

const loadAssignStore = (oppCode) => {
  try {
    return JSON.parse(localStorage.getItem(ASSIGN_STORE_KEY(oppCode)) || "{}");
  } catch {
    return {};
  }
};

const saveAssignStore = (oppCode, data) => {
  localStorage.setItem(ASSIGN_STORE_KEY(oppCode), JSON.stringify(data));
};

/** Extract follow-up DATE from row (prefers explicit followUpDate) */
const getRowFollowUpDate = (row) => {
  const tryFields = [
    row?.followUpDate,
    row?.followupdate,
    row?.follow_up_date,
    row?.appointmentdatetime,
    row?.appointmentDateTime,
  ].filter(Boolean);
  for (const f of tryFields) {
    const d = toDate(f);
    if (d) return d;
  }
  return null;
};

// Pick the best date field per row
const getOppDateStamp = (row, isManualLead) => {
  const d = isManualLead
    ? getRowFollowUpDate(row) || toDate(row?.appointmentdatetime) || toDate(row?.createddate)
    : toDate(row?.appointmentdatetime) || toDate(row?.createddate) || getRowFollowUpDate(row);

  return d ? +new Date(d.getFullYear(), d.getMonth(), d.getDate()) : NaN;
};

// ---- LocalStorage Assignments (POC) ----
const LS_ASSIGN_KEY = "ew_opp_assignments_v1";

const makeOppKey = (oppCode, row) => {
  const recid = row?.recid ?? row?.RECID ?? row?.recID ?? row?.RecID ?? row?.id;
  return `${String(oppCode || "").trim()}::${String(recid || "").trim()}`;
};

const readAssignments = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_ASSIGN_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeAssignments = (obj) => {
  localStorage.setItem(LS_ASSIGN_KEY, JSON.stringify(obj || {}));
};

// robust recId getter (API casing can vary)
const getRecId = (row) => {
  const id = row?.RECID ?? row?.recID ?? row?.RecID ?? row?.recid ?? row?.id ?? 0;
  return Number(id) || 0;
};

// ---- Performance helpers ----
const hhmmToMinutes = (hhmm) => {
  if (!hhmm) return NaN;
  const parts = String(hhmm).split(":");
  if (parts.length !== 2) return NaN;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
};

const dateToStamp = (d) => {
  if (!d) return NaN;
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return +dd;
};

/** Build half-hour slots from 01:00 -> 07:30 (used in UI filters) */
const HALF_HOURS_1_TO_730 = [
  "01:00","01:30",
  "02:00","02:30",
  "03:00","03:30",
  "04:00","04:30",
  "05:00","05:30",
  "06:00","06:30",
  "07:00","07:30",
];

/** Convert '01:30' + 'PM' -> '13:30' (12h -> 24h) */
const to24h = (slot, meridiem) => {
  if (!slot || !meridiem) return "";
  const [hh, mm] = slot.split(":").map(Number);
  const base = hh % 12; // 12 -> 0
  const h = meridiem === "PM" ? base + 12 : base;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

// ✅ NEW: map locally-saved lead payload into table row shape
const mapLocalLeadToOppRow = (lead, isManualLead) => {
  const meta = lead?.customerMeta || {};
  const custID = (meta?.custID || lead?.custId || lead?.leadId || "").toString().trim() || "—";
  const custName =
    (meta?.custName || `${lead?.firstName || ""} ${lead?.lastName || ""}`.trim()).toString().trim() || "—";
  const custMobileNo = (meta?.mobileNo || lead?.mobile || "").toString().trim() || "—";

  const createdISO = lead?.createdAt || new Date().toISOString();

  // followUpDate is already yyyy-MM-dd in your form; keep as-is
  const followUpDate = lead?.followUpDate || "";
  const followUpTime = lead?.followUpTime || ""; // "HH:mm" (your dropdown)
  const remarks = lead?.remarks || "";

  const oppStatus =
    lead?.status === "Draft" ? "Draft" : "Open";

  // These columns exist in your table, so keep names consistent
  const row = {
    // Keep a stable key-ish field. recid numeric isn't available, so store leadId in an alt field.
    recid: 0,
    id: lead?.leadId || "",
    custID,
    custName,
    custMobileNo,
    oppStatus,

    // manual lead table uses followUpDate; external uses appointmentdatetime
    followUpDate,
    followupdate: "",
    appointmentdatetime: isManualLead ? "" : followUpDate,

    disposition: lead?.leadSubStatusName || lead?.leadSubStatusCode || "",
    remarks,

    customerMessage: "",
    customer_message: "",

    salesOwner: "",
    salesOwnerCode: "",

    createddate: createdISO,
    followUpTime, // helps your time parsing
  };

  // compute helper fields used by filters/search
  const d = isManualLead ? (toDate(followUpDate) || toDate(createdISO)) : (toDate(row.appointmentdatetime) || toDate(createdISO));
  const hhmm = getRowTimeHHmm(row);

  return {
    ...row,
    __dateStamp: dateToStamp(d),
    __timeMin: hhmmToMinutes(hhmm),
    __q: [
      row?.custID,
      row?.custName,
      row?.custMobileNo,
      row?.oppStatus,
      row?.salesOwner,
    ]
      .map((x) => (x ?? "").toString().toLowerCase())
      .join(" | "),
    __localLeadId: lead?.leadId || "", // for dedupe
  };
};

const ModalShell = ({ title, onClose, children, width = 720 }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ew-modal-overlay" onMouseDown={onClose}>
      <div
        className="ew-modal"
        style={{ width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ew-modal-head">
          <div className="ew-modal-title">{title}</div>
          <button className="ew-modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="ew-modal-body">{children}</div>
      </div>
    </div>
  );
};

const AssignChoiceModal = ({ onClose, onPick }) => {
  return (
    <ModalShell title="Assign Opportunity" onClose={onClose} width={520}>
      <div style={{ display: "grid", gap: 12 }}>
        <button className="ew-choice-btn" onClick={() => onPick("availability")}>
          Based on availability
        </button>
        <button className="ew-choice-btn" onClick={() => onPick("auto")}>
          Auto Distribution
        </button>
        <button className="ew-choice-btn" onClick={() => onPick("manual")}>
          Manual Allocation
        </button>
      </div>
    </ModalShell>
  );
};

const ManualAllocationModal = ({
  onClose,
  oppCode,
  oppRows,
  onCommitted,
}) => {
  const [role, setRole] = useState(ROLES[0]);
  const [clinic, setClinic] = useState("All");

  const [clinics, setClinics] = useState([{ code: "All", name: "All" }]);
  const [employees, setEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState("");

  const [oppSelected, setOppSelected] = useState(new Set());
  const [empSelected, setEmpSelected] = useState(null);

  const [temp, setTemp] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const cRes = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" });
        const cData = cRes.ok ? await cRes.json() : [];
        const arr = Array.isArray(cData) ? cData : [];
        setClinics([{ code: "All", name: "All" }, ...arr.map(x => ({ code: x.code, name: x.name }))]);
      } catch {}

      try {
        const eRes = await fetch(`${API_BASE_URL}/api/Employees`, {
          credentials: "include",
        });
        const eData = eRes.ok ? await eRes.json() : [];
        const arr = Array.isArray(eData) ? eData : [];

        // ✅ DEDUPE by employeeCode (fallback: name)
        const map = new Map();
        arr.forEach((x) => {
          const key =
            (x.employeeCode || "").trim() ||
            (x.employeeName || "").trim().toLowerCase();

          if (!key || map.has(key)) return;

          map.set(key, {
            employeeName: x.employeeName || "",
            employeeCode: x.employeeCode || "",
            shift: SHIFTS[map.size % SHIFTS.length],
          });
        });

        setEmployees(Array.from(map.values()));
      } catch {}
    };
    load();
  }, []);

  const oppList = useMemo(() => {
    return (oppRows || []).filter(r => !String(r?.salesOwner || "").trim());
  }, [oppRows]);

  const oppToggle = (recid) => {
    setOppSelected((prev) => {
      const n = new Set(prev);
      if (n.has(recid)) n.delete(recid);
      else n.add(recid);
      return n;
    });
  };

  const oppToggleAll = () => {
    setOppSelected((prev) => {
      const all = oppList.map(r => Number(r?.recid ?? 0)).filter(Boolean);
      const allSelected = all.length > 0 && all.every(id => prev.has(id));
      const n = new Set(prev);
      if (allSelected) all.forEach(id => n.delete(id));
      else all.forEach(id => n.add(id));
      return n;
    });
  };

  const filteredEmployees = useMemo(() => {
    const s = empSearch.trim().toLowerCase();
    let list = employees.slice();
    if (s) list = list.filter(e => e.employeeName.toLowerCase().includes(s));
    return list;
  }, [employees, empSearch]);

  const addToTemp = () => {
    if (!empSelected) return alert("Please select an employee.");
    if (!oppSelected.size) return alert("Please select at least one opportunity.");

    const pickedOpps = oppList.filter(r => oppSelected.has(Number(r?.recid ?? 0)));
    setTemp((prev) => {
      const exists = new Set(prev.map(x => Number(x.recid)));
      const next = [...prev];
      pickedOpps.forEach((r) => {
        const recid = Number(r?.recid ?? 0);
        if (!recid || exists.has(recid)) return;
        next.push({
          recid,
          custID: r.custID,
          salesOwnerCode: empSelected.employeeCode,
          salesOwnerName: empSelected.employeeName,
          shift: empSelected.shift,
        });
      });
      return next;
    });

    setOppSelected(new Set());
  };

  const removeTemp = (recid) => {
    setTemp((prev) => prev.filter(x => Number(x.recid) !== Number(recid)));
  };

  const confirm = () => {
    if (!temp.length) return alert("No allocations added.");

    const saved = readManualAssignments(oppCode);
    const map = new Map(saved.map(x => [Number(x.recid), x]));

    temp.forEach((t) => {
      map.set(Number(t.recid), {
        oppCode,
        recid: Number(t.recid),
        custID: t.custID,
        salesOwnerCode: t.salesOwnerCode,
        salesOwnerName: t.salesOwnerName,
        assignedAt: new Date().toISOString(),
        mode: "manual",
      });
    });

    const finalList = Array.from(map.values());
    writeManualAssignments(oppCode, finalList);

    onCommitted?.({ count: temp.length, modeText: "Manual Allocation" });
    onClose();
  };

  return (
    <ModalShell title="Manual Allocation" onClose={onClose} width={1180}>
      <div className="ew-auto-top">
        <div className="ew-field">
          <div className="ew-lbl">Role :</div>
          <select className="finput" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div className="ew-field">
          <div className="ew-lbl">Clinic :</div>
          <select className="finput" value={clinic} onChange={(e) => setClinic(e.target.value)}>
            {clinics.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 14, marginTop: 14 }}>
        <div className="ew-agent-box">
          <div className="ew-agent-head" style={{ gridTemplateColumns: "52px 160px 1fr 160px 160px" }}>
            <div className="ew-col ew-col-check">
              <input
                type="checkbox"
                checked={oppList.length > 0 && oppList.every(r => oppSelected.has(Number(r?.recid ?? 0)))}
                onChange={oppToggleAll}
              />
            </div>
            <div className="ew-col">Opp ID</div>
            <div className="ew-col">Name</div>
            <div className="ew-col">Created Date</div>
            <div className="ew-col">Disposition</div>
          </div>

          <div className="ew-agent-body" style={{ maxHeight: 360 }}>
            {oppList.map((r) => {
              const id = Number(r?.recid ?? 0);
              return (
                <div className="ew-agent-row" key={id} style={{ gridTemplateColumns: "52px 160px 1fr 160px 160px" }}>
                  <div className="ew-col ew-col-check">
                    <input type="checkbox" checked={oppSelected.has(id)} onChange={() => oppToggle(id)} />
                  </div>
                  <div className="ew-col">{r.custID || id}</div>
                  <div className="ew-col">{r.custName || "-"}</div>
                  <div className="ew-col">{r.createddate || "-"}</div>
                  <div className="ew-col">{r.disposition || "-"}</div>
                </div>
              );
            })}
            {!oppList.length ? <div className="empty-note" style={{ marginTop: 10 }}>No unassigned opportunities.</div> : null}
          </div>
        </div>

        <div>
          <div className="ew-field" style={{ minWidth: "unset" }}>
            <div className="ew-lbl">Search Employee :</div>
            <input
              className="finput"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              placeholder="Type name..."
            />
          </div>

          <div className="ew-agent-box" style={{ marginTop: 10 }}>
            <div className="ew-agent-head" style={{ gridTemplateColumns: "52px 1fr 160px" }}>
              <div className="ew-col ew-col-check"></div>
              <div className="ew-col">Sales Owner</div>
              <div className="ew-col">Shift</div>
            </div>

            <div className="ew-agent-body" style={{ maxHeight: 360 }}>
              {filteredEmployees.map((e) => {
                const checked = empSelected?.employeeCode === e.employeeCode;
                return (
                  <div
                    className="ew-agent-row"
                    key={e.employeeCode}
                    style={{ gridTemplateColumns: "52px 1fr 160px", cursor: "pointer" }}
                    onClick={() => setEmpSelected(e)}
                  >
                    <div className="ew-col ew-col-check">
                      <input type="checkbox" checked={checked} readOnly />
                    </div>
                    <div className="ew-col ew-col-name">{e.employeeName}</div>
                    <div className="ew-col ew-col-shift">{e.shift}</div>
                  </div>
                );
              })}
              {!filteredEmployees.length ? <div className="empty-note" style={{ marginTop: 10 }}>No employees found.</div> : null}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button className="btn-primary" onClick={addToTemp}>Add</button>
          </div>
        </div>
      </div>

      <div className="ew-agent-box" style={{ marginTop: 14 }}>
        <div className="ew-agent-head" style={{ gridTemplateColumns: "1fr 180px 120px" }}>
          <div className="ew-col">Sales Owner</div>
          <div className="ew-col">Opp ID</div>
          <div className="ew-col">Action</div>
        </div>
        <div className="ew-agent-body" style={{ maxHeight: 220 }}>
          {temp.map((t) => (
            <div className="ew-agent-row" key={t.recid} style={{ gridTemplateColumns: "1fr 180px 120px" }}>
              <div className="ew-col">{t.salesOwnerName}</div>
              <div className="ew-col">{t.custID || t.recid}</div>
              <div className="ew-col">
                <button className="btn-export" style={{ padding: "6px 10px" }} onClick={() => removeTemp(t.recid)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!temp.length ? <div className="empty-note" style={{ marginTop: 10 }}>No allocations added yet.</div> : null}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
        <button className="btn-back" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={confirm}>Confirm</button>
      </div>
    </ModalShell>
  );
};

const AutoDistributionModal = ({
  onClose,
  oppCode,
  onStartAssignment,
}) => {
  const ROLE_OPTIONS = ROLES;

  const SHIFT_OPTIONS = SHIFTS;

  const pickRandomShift = () =>
    SHIFT_OPTIONS[Math.floor(Math.random() * SHIFT_OPTIONS.length)];

  const [role, setRole] = useState("Call Center Agent");
  const [clinic, setClinic] = useState("All");

  const [assignMode, setAssignMode] = useState("record");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [noOfRecords, setNoOfRecords] = useState(100);
  const [recSeq, setRecSeq] = useState("Oldest");

  const [search, setSearch] = useState("");

  const [centers, setCenters] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingCenters(true);
      setLoadErr("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Centers HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        if (!alive) return;
        setCenters(arr);
      } catch (e) {
        console.error("Failed to load centers:", e);
        if (!alive) return;
        setCenters([]);
        setLoadErr("Failed to load clinics.");
      } finally {
        if (alive) setLoadingCenters(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingEmployees(true);
      setLoadErr("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/Employees`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Employees HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];

        const mapped = arr.map((e) => ({
          ...e,
          id: Number(e?.recId ?? e?.recID ?? e?.RECID ?? e?.id) || 0,
          employeeName: (e?.employeeName ?? "").toString(),
          employeeCode: (e?.employeeCode ?? "").toString(),
          roleName: (e?.roleName ?? "").toString(),
          clinicCode: (e?.clinicCode ?? "").toString(),
          __shift: pickRandomShift(),
          __q: (e?.employeeName ?? "").toString().toLowerCase(),
        }));

        if (!alive) return;
        setEmployees(mapped);
      } catch (e) {
        console.error("Failed to load employees:", e);
        if (!alive) return;
        setEmployees([]);
        setLoadErr("Failed to load employees.");
      } finally {
        if (alive) setLoadingEmployees(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const filteredEmployees = useMemo(() => {
    let list = employees.slice();

    if (clinic && clinic !== "All") {
      list = list.filter((e) => (e?.clinicCode || "").toString() === clinic);
    }

    if (role) {
      const r = role.toLowerCase();
      list = list.filter((e) => {
        const rn = (e?.roleName || "").toString().toLowerCase();
        return rn ? rn === r : true;
      });
    }

    const s = search.trim().toLowerCase();
    if (s) list = list.filter((e) => (e.__q || "").includes(s));

    return list.filter((e) => e.id);
  }, [employees, clinic, role, search]);

  const allChecked =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedIds.has(e.id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (allChecked) filteredEmployees.forEach((e) => n.delete(e.id));
      else filteredEmployees.forEach((e) => n.add(e.id));
      return n;
    });
  };

  const setModeDate = () => setAssignMode("date");
  const setModeRecord = () => setAssignMode("record");

  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const start = async () => {
    const picked = filteredEmployees.filter((e) => selectedIds.has(e.id));
    if (!picked.length) {
      alert("Please select at least one employee.");
      return;
    }

    if (assignMode === "date") {
      if (!fromDate || !toDate) {
        alert("Please select From and To date.");
        return;
      }
      if (new Date(fromDate) > new Date(toDate)) {
        alert("From date cannot be greater than To date.");
        return;
      }
    } else {
      if (!noOfRecords || Number(noOfRecords) <= 0) {
        alert("Please enter a valid No. of Record.");
        return;
      }
    }

    await onStartAssignment?.({
      oppCode,
      role,
      clinic,
      assignMode,
      fromDate: assignMode === "date" ? fromDate : "",
      toDate: assignMode === "date" ? toDate : "",
      noOfRecords: assignMode === "record" ? Number(noOfRecords) : 0,
      recSeq: assignMode === "record" ? recSeq : "",
      employees: picked.map((e) => ({
        recId: e.id,
        employeeName: e.employeeName,
        employeeCode: e.employeeCode,
        shift: e.__shift,
      })),
    });

    onClose();
  };

  return (
    <ModalShell title="Auto Distribution" onClose={onClose} width={980}>
      {/* ...UNCHANGED... */}
      <div className="ew-auto-top">
        <div className="ew-field">
          <div className="ew-lbl">Role :</div>
          <select className="finput" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="ew-field">
          <div className="ew-lbl">Clinic :</div>
          <select
            className="finput"
            value={clinic}
            onChange={(e) => setClinic(e.target.value)}
            disabled={loadingCenters}
          >
            <option value="All">All</option>
            {centers.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ...rest unchanged... */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
        <button className="btn-back" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={start}>Start Assignment</button>
      </div>
    </ModalShell>
  );
};

const OpportunityDetails = () => {
  const { oppCode } = useParams();
  const location = useLocation();
  const { state } = location;
  const navigate = useNavigate();

  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);
  const [normRows, setNormRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [assignChoiceOpen, setAssignChoiceOpen] = useState(false);
  const [autoDistOpen, setAutoDistOpen] = useState(false);
  const [manualAllocOpen, setManualAllocOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  const openAssignMenu = () => setAssignChoiceOpen(true);
  const closeAssignMenu = () => setAssignChoiceOpen(false);

  const onPickAssignOption = (opt) => {
    closeAssignMenu();
    if (opt === "auto") setAutoDistOpen(true);
    if (opt === "manual") setManualAllocOpen(true);
    if (opt === "availability") setAvailabilityOpen(true);
  };

  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [followDateMode, setFollowDateMode] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  const [timeFromSlot, setTimeFromSlot] = useState("");
  const [timeFromMer, setTimeFromMer] = useState("AM");
  const [timeToSlot, setTimeToSlot] = useState("");
  const [timeToMer, setTimeToMer] = useState("AM");

  const [page, setPage] = useState(1);
  const pageSize = 50;

  // ✅ NEW: avoid double-prepend (in case component re-renders)
  const consumedLocalLeadIdsRef = useRef(new Set());

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchDraft), 250);
    return () => clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const now = new Date();

        const defaultFrom = new Date(now);
        defaultFrom.setDate(now.getDate() - 13);

        const fromDate = state?.fromDate || toISODateOnly(defaultFrom);
        const toDate = state?.toDate || toISODateOnly(now);

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

        const computed = arr.map((r) => {
          const d = getRowFollowUpDate(r);
          const hhmm = getRowTimeHHmm(r);
          return {
            ...r,
            __dateStamp: dateToStamp(d),
            __timeMin: hhmmToMinutes(hhmm),
            __q: [
              r?.custID,
              r?.custName,
              r?.custMobileNo,
              r?.oppStatus,
              r?.salesOwner,
            ]
              .map((x) => (x ?? "").toString().toLowerCase())
              .join(" | "),
          };
        });

        // apply auto store assignments (if any)
        const store = loadAssignStore(oppCode);
        const assignedMap = store.assigned || {};
        const withAssigned = computed.map((r) => {
          const rid = getRecId(r);
          const a = assignedMap[String(rid)];
          if (!a) return r;
          return { ...r, salesOwner: a.employeeName, salesOwnerCode: a.employeeCode };
        });

        // apply manual assignments (if any)
        const withManual = applyManualAssignmentsToRows(oppCode, withAssigned);
        setNormRows(withManual);
      } catch (e) {
        console.error("Failed to load opportunity details:", e);
        setError("Failed to load details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [oppCode, state?.fromDate, state?.toDate]);

  const hasRows = normRows?.length > 0;
  const safe = (v, fallback = "") => (v === null || v === undefined || v === "" ? fallback : v);

  const top = useMemo(() => header ?? (hasRows ? normRows[0] : null), [header, hasRows, normRows]);

  const fallbackHeader = useMemo(
    () => ({
      oppCode: oppCode,
      oppName: state?.oppName || "—",
      oRuleDetails: state?.oRuleDetails || "—",
      oRuleXvalue: state?.oRuleXvalue || "—",
      oRuleCode: state?.oRuleCode || state?.oRuleDetails || "—",
    }),
    [oppCode, state?.oppName, state?.oRuleDetails, state?.oRuleXvalue, state?.oRuleCode]
  );

  const H = top || fallbackHeader;

  const isManualLead = useMemo(() => {
    const code = (H?.oRuleCode || H?.oRuleDetails || "").toString().trim().toLowerCase();
    if (H?.manualLead || H?.isManualLead) return true;
    return code === "manual lead";
  }, [H]);

  // ✅ NEW: after load (or anytime), prepend just-submitted lead (if present) ON TOP
  useEffect(() => {
    if (!oppCode) return;

    let raw = "";
    try {
      raw = localStorage.getItem(LS_NEW_LEAD_KEY(oppCode)) || "";
    } catch {
      raw = "";
    }
    if (!raw) return;

    let lead = null;
    try {
      lead = JSON.parse(raw);
    } catch {
      lead = null;
    }

    if (!lead?.leadId) {
      try { localStorage.removeItem(LS_NEW_LEAD_KEY(oppCode)); } catch {}
      return;
    }

    // prevent duplicates
    if (consumedLocalLeadIdsRef.current.has(lead.leadId)) return;

    const mapped = mapLocalLeadToOppRow(lead, isManualLead);

    setNormRows((prev) => {
      const exists = (prev || []).some(
        (x) => x?.__localLeadId === lead.leadId || x?.id === lead.leadId || x?.custID === lead.leadId
      );
      if (exists) return prev;
      return [mapped, ...(prev || [])];
    });

    setRows((prev) => {
      const exists = (prev || []).some(
        (x) => x?.id === lead.leadId || x?.custID === lead.leadId
      );
      if (exists) return prev;
      return [mapped, ...(prev || [])];
    });

    consumedLocalLeadIdsRef.current.add(lead.leadId);

    // consume once
    try { localStorage.removeItem(LS_NEW_LEAD_KEY(oppCode)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppCode, isManualLead]);

  const ownerOptions = useMemo(() => {
    const set = new Set();
    normRows.forEach((r) => {
      if (r?.salesOwner) set.add(String(r.salesOwner));
    });
    return ["", ...Array.from(set)];
  }, [normRows]);

  const dateRange = useMemo(() => {
    if (followDateMode === "") return null;

    const today = new Date();
    const make = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (followDateMode === "0") {
      return { from: make(today), to: make(today) };
    }
    if (followDateMode === "1") {
      const t = new Date(today);
      t.setDate(today.getDate() + 1);
      return { from: make(t), to: make(t) };
    }
    if (followDateMode === "2") {
      if (!rangeFrom || !rangeTo) return null;
      const f = toDate(rangeFrom);
      const t = toDate(rangeTo);
      if (!f || !t) return null;
      return { from: make(f), to: make(t) };
    }
    return null;
  }, [followDateMode, rangeFrom, rangeTo]);

  const filterTimeFrom = useMemo(() => to24h(timeFromSlot, timeFromMer), [timeFromSlot, timeFromMer]);
  const filterTimeTo = useMemo(() => to24h(timeToSlot, timeToMer), [timeToSlot, timeToMer]);

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    statusFilter,
    ownerFilter,
    followDateMode,
    rangeFrom,
    rangeTo,
    filterTimeFrom,
    filterTimeTo,
    sortConfig?.key,
    sortConfig?.direction,
    isManualLead,
  ]);

  const filteredRows = useMemo(() => {
    let list = normRows.slice();

    const s = searchTerm.trim().toLowerCase();
    if (s) {
      list = list.filter((r) => (r.__q || "").includes(s));
    }

    const fromMin = filterTimeFrom ? hhmmToMinutes(filterTimeFrom) : NaN;
    const toMin = filterTimeTo ? hhmmToMinutes(filterTimeTo) : NaN;

    const inTimeWindow = (r) => {
      if (!filterTimeFrom && !filterTimeTo) return true;
      if (Number.isNaN(r.__timeMin)) return false;
      if (filterTimeFrom && r.__timeMin < fromMin) return false;
      if (filterTimeTo && r.__timeMin > toMin) return false;
      return true;
    };

    if (isManualLead) {
      if (statusFilter) {
        const st = statusFilter.toLowerCase();
        list = list.filter((r) => String(r?.oppStatus || "").toLowerCase() === st);
      }
      if (ownerFilter) {
        const ow = ownerFilter.toLowerCase();
        list = list.filter((r) => String(r?.salesOwner || "").toLowerCase() === ow);
      }
      if (dateRange) {
        const f = +dateRange.from;
        const t = +dateRange.to;
        list = list.filter((r) => !Number.isNaN(r.__dateStamp) && r.__dateStamp >= f && r.__dateStamp <= t);
      }
      list = list.filter(inTimeWindow);
    } else {
      list = list.filter(inTimeWindow);
    }

    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      const dir = direction === "asc" ? 1 : -1;

      const isDateKey =
        key === "followUpDate" ||
        key === "followupdate" ||
        key === "appointmentdatetime" ||
        key === "createddate";

      list.sort((a, b) => {
        if (isDateKey) {
          const da = a.__dateStamp;
          const db = b.__dateStamp;
          const hasA = !Number.isNaN(da);
          const hasB = !Number.isNaN(db);
          if (hasA && hasB) return (da - db) * dir;
          if (hasA && !hasB) return -1 * dir;
          if (!hasA && hasB) return 1 * dir;
        }

        const va = (a?.[key] ?? "").toString().toLowerCase();
        const vb = (b?.[key] ?? "").toString().toLowerCase();
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
    }

    return list;
  }, [
    normRows,
    searchTerm,
    isManualLead,
    statusFilter,
    ownerFilter,
    dateRange,
    filterTimeFrom,
    filterTimeTo,
    sortConfig,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / pageSize)),
    [filteredRows.length]
  );

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  const openCustomer = (row) => {
    const recId = getRecId(row);
    const isManual = isManualLead || row?.manualLead || row?.isManualLead;

    // For locally added lead where custID might be leadId (string), still route works
    navigate(`/opportunity/${oppCode}/customer/${row.custID}`, {
      state: {
        recId,
        oppCode,
        row,
        header: H,
        isManual,
      },
    });
  };

  const exportCSV = () => {
    const colsManual = [
      "CustID","CustName","CustMobileNo","OppStatus","FollowUpDate",
      "Disposition","Remarks","CustomerMessage","SalesOwner","CreatedDate",
    ];
    const colsOther = [
      "CustID","CustName","CustMobileNo","OppStatus","AppointmentDate",
      "Disposition","Remarks","SalesOwner","CreatedDate",
    ];
    const headers = isManualLead ? colsManual : colsOther;

    const escape = (v) => {
      const s = v == null ? "" : String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [headers.join(",")];
    filteredRows.forEach((r) => {
      const rowArr = isManualLead
        ? [
            r.custID,
            r.custName,
            r.custMobileNo,
            r.oppStatus,
            r.followUpDate || r.followupdate || r.appointmentdatetime || "",
            r.disposition,
            r.remarks,
            r.customerMessage || r.customer_message || "",
            r.salesOwner,
            r.createddate,
          ]
        : [
            r.custID,
            r.custName,
            r.custMobileNo,
            r.oppStatus,
            r.appointmentdatetime,
            r.disposition,
            r.remarks,
            r.salesOwner,
            r.createddate,
          ];
      lines.push(rowArr.map(escape).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${H?.oppCode || "opportunity"}-details.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  if (loading) return <div className="loading-msg">Loading…</div>;
  if (error) return <div className="loading-msg" style={{ color: "#c33" }}>{error}</div>;

  const sortArrow = (key) =>
    sortConfig.key === key ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕";

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
                <span className="value">{safe(H.oRuleDetails || H.oRuleCode, "—")}</span>
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

            <div className="header-actions">
              <button className="btn-assign" onClick={openAssignMenu}>Assign</button>
              <button className="btn-export" onClick={exportCSV}>Export</button>
              <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
            </div>
          </div>

          <div className="filters-card">
            {isManualLead ? (
              <div className="filters-grid">
                <div className="fgroup">
                  <label className="flabel">Status :</label>
                  <select className="finput" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All</option>
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="fgroup">
                  <label className="flabel">Sales Owner :</label>
                  <select className="finput" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                    <option value="">- &lt; Select one &gt; -</option>
                    {ownerOptions.map((o, i) => (
                      <option key={i} value={o}>{o || "(Unassigned)"}</option>
                    ))}
                  </select>
                </div>

                <div className="fgroup">
                  <label className="flabel">Follow Up Date :</label>
                  <select
                    className="finput"
                    value={followDateMode}
                    onChange={(e) => setFollowDateMode(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="0">Today</option>
                    <option value="1">Tomorrow</option>
                    <option value="2">Date Range</option>
                  </select>
                </div>

                {followDateMode === "2" && (
                  <>
                    <div className="fgroup">
                      <label className="flabel">From :</label>
                      <input
                        type="date"
                        className="finput"
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                      />
                    </div>
                    <div className="fgroup">
                      <label className="flabel">To :</label>
                      <input
                        type="date"
                        className="finput"
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="fgroup ftime">
                  <label className="flabel">Follow Up time (From) :</label>
                  <div className="ftime-row">
                    <select className="finput" value={timeFromSlot} onChange={(e) => setTimeFromSlot(e.target.value)}>
                      <option value="">—</option>
                      {HALF_HOURS_1_TO_730.map((t) => <option key={`fs-${t}`} value={t}>{t}</option>)}
                    </select>
                    <select className="finput" value={timeFromMer} onChange={(e) => setTimeFromMer(e.target.value)}>
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>

                <div className="fgroup ftime">
                  <label className="flabel">Follow Up time (To) :</label>
                  <div className="ftime-row">
                    <select className="finput" value={timeToSlot} onChange={(e) => setTimeToSlot(e.target.value)}>
                      <option value="">—</option>
                      {HALF_HOURS_1_TO_730.map((t) => <option key={`ts-${t}`} value={t}>{t}</option>)}
                    </select>
                    <select className="finput" value={timeToMer} onChange={(e) => setTimeToMer(e.target.value)}>
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>

                {/* ✅ Add Lead */}
                <div className="factions">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const code = oppCode || (H?.oppCode ?? "");
                      if (!code) return;

                      navigate(`/manuallead/${code}`, {
                        state: { oppCode: code, header: H },
                      });
                    }}
                  >
                    Add Lead
                  </button>
                </div>
              </div>
            ) : (
              <div className="filters-grid">
                {/* unchanged external filters */}
                <div className="fgroup">
                  <label className="flabel">Status :</label>
                  <select className="finput" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All</option>
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="fgroup">
                  <label className="flabel">Sales Owner :</label>
                  <select className="finput" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                    <option value="">- &lt; Select one &gt; -</option>
                    {ownerOptions.map((o, i) => (
                      <option key={i} value={o}>{o || "(Unassigned)"}</option>
                    ))}
                  </select>
                </div>

                <div className="fgroup">
                  <label className="flabel">Follow Up Date :</label>
                  <select
                    className="finput"
                    value={followDateMode}
                    onChange={(e) => setFollowDateMode(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="0">Today</option>
                    <option value="1">Tomorrow</option>
                    <option value="2">Date Range</option>
                  </select>
                </div>

                {followDateMode === "2" && (
                  <>
                    <div className="fgroup">
                      <label className="flabel">From :</label>
                      <input
                        type="date"
                        className="finput"
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                      />
                    </div>
                    <div className="fgroup">
                      <label className="flabel">To :</label>
                      <input
                        type="date"
                        className="finput"
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="fgroup ftime">
                  <label className="flabel">Follow Up time (From) :</label>
                  <div className="ftime-row">
                    <select className="finput" value={timeFromSlot} onChange={(e) => setTimeFromSlot(e.target.value)}>
                      <option value="">—</option>
                      {HALF_HOURS_1_TO_730.map((t) => <option key={`fs-${t}`} value={t}>{t}</option>)}
                    </select>
                    <select className="finput" value={timeFromMer} onChange={(e) => setTimeFromMer(e.target.value)}>
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>

                <div className="fgroup ftime">
                  <label className="flabel">Follow Up time (To) :</label>
                  <div className="ftime-row">
                    <select className="finput" value={timeToSlot} onChange={(e) => setTimeToSlot(e.target.value)}>
                      <option value="">—</option>
                      {HALF_HOURS_1_TO_730.map((t) => <option key={`ts-${t}`} value={t}>{t}</option>)}
                    </select>
                    <select className="finput" value={timeToMer} onChange={(e) => setTimeToMer(e.target.value)}>
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
            <input
              className="finput"
              style={{ width: 280 }}
              placeholder="Search (ID, Name, Phone, Status, Owner)"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </div>

          {pagedRows.length > 0 ? (
            <div className="table-wrap">
              <table className="opptable">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("custID")}>CustID <span className="sort">{sortArrow("custID")}</span></th>
                    <th onClick={() => handleSort("custName")}>CustName <span className="sort">{sortArrow("custName")}</span></th>
                    <th onClick={() => handleSort("custMobileNo")}>CustMobileNo <span className="sort">{sortArrow("custMobileNo")}</span></th>
                    <th onClick={() => handleSort("oppStatus")}>OppStatus <span className="sort">{sortArrow("oppStatus")}</span></th>
                    <th onClick={() => handleSort(isManualLead ? "followUpDate" : "appointmentdatetime")}>
                      {isManualLead ? "Follow Up Date" : "Appointment Date"}{" "}
                      <span className="sort">{sortArrow(isManualLead ? "followUpDate" : "appointmentdatetime")}</span>
                    </th>
                    <th onClick={() => handleSort("disposition")}>Disposition <span className="sort">{sortArrow("disposition")}</span></th>
                    <th onClick={() => handleSort("remarks")}>Remarks <span className="sort">{sortArrow("remarks")}</span></th>
                    {isManualLead ? (
                      <th onClick={() => handleSort("customerMessage")}>
                        Customer Message <span className="sort">{sortArrow("customerMessage")}</span>
                      </th>
                    ) : null}
                    <th onClick={() => handleSort("salesOwner")}>Sales Owner <span className="sort">{sortArrow("salesOwner")}</span></th>
                    <th onClick={() => handleSort("createddate")}>Created Date <span className="sort">{sortArrow("createddate")}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r, i) => (
                    <tr key={`${r.recid || r.custID || r.id || i}-${i}`}>
                      <td>
                        <button className="linkish" onClick={() => openCustomer(r)}>
                          {safe(r.custID, "—")}
                        </button>
                      </td>
                      <td>{safe(r.custName, "—")}</td>
                      <td>{safe(r.custMobileNo, "—")}</td>
                      <td>{safe(r.oppStatus, "—")}</td>
                      {isManualLead ? (
                        <td>{safe(r.followUpDate || r.followupdate || r.appointmentdatetime, "—")}</td>
                      ) : (
                        <td>{safe(r.appointmentdatetime, "—")}</td>
                      )}
                      <td>{safe(r.disposition, "—")}</td>
                      <td>{safe(r.remarks, "—")}</td>
                      {isManualLead ? <td>{safe(r.customerMessage || r.customer_message, "—")}</td> : null}
                      <td>{safe(r.salesOwner, "—")}</td>
                      <td>{safe(r.createddate, "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-note">No data found for this opportunity.</div>
          )}

          {/* pagination unchanged */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Showing <strong>{filteredRows.length ? (page - 1) * pageSize + 1 : 0}</strong>–
              <strong>{Math.min(page * pageSize, filteredRows.length)}</strong> of{" "}
              <strong>{filteredRows.length}</strong>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="btn-export"
                style={{ padding: "8px 12px" }}
                onClick={() => setPage(1)}
                disabled={page <= 1}
              >
                First
              </button>
              <button
                className="btn-export"
                style={{ padding: "8px 12px" }}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <div style={{ fontSize: 13, color: "#334155" }}>
                Page <strong>{page}</strong> / <strong>{totalPages}</strong>
              </div>
              <button
                className="btn-export"
                style={{ padding: "8px 12px" }}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
              <button
                className="btn-export"
                style={{ padding: "8px 12px" }}
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>

      {assignChoiceOpen ? (
        <AssignChoiceModal
          onClose={() => setAssignChoiceOpen(false)}
          onPick={onPickAssignOption}
        />
      ) : null}

      {manualAllocOpen ? (
        <ManualAllocationModal
          onClose={() => setManualAllocOpen(false)}
          oppCode={oppCode}
          oppRows={normRows}
          onCommitted={({ count, modeText }) => {
            setNormRows((prev) => applyManualAssignmentsToRows(oppCode, prev));
            showToast(`${count} opp assigned (${modeText})`);
          }}
        />
      ) : null}

      {autoDistOpen ? (
        <AutoDistributionModal
          onClose={() => setAutoDistOpen(false)}
          oppCode={oppCode}
          onStartAssignment={async (payload) => {
            const store = loadAssignStore(oppCode);
            const assignedMap = store.assigned || {};
            let oppList = normRows.slice();

            if (payload.assignMode === "date") {
              const from = +new Date(payload.fromDate);
              const to = +new Date(payload.toDate);

              oppList = oppList.filter((r) => {
                const stamp = getOppDateStamp(r, isManualLead);
                return !Number.isNaN(stamp) && stamp >= from && stamp <= to;
              });
            } else {
              oppList.sort((a, b) => {
                const da = getOppDateStamp(a, isManualLead);
                const db = getOppDateStamp(b, isManualLead);
                const va = Number.isNaN(da) ? 0 : da;
                const vb = Number.isNaN(db) ? 0 : db;
                return payload.recSeq === "Recent" ? vb - va : va - vb;
              });
              oppList = oppList.slice(0, Number(payload.noOfRecords || 0));
            }

            const emps = payload.employees || [];
            if (!emps.length) return;

            const perEmpCount = {};
            const now = new Date().toISOString();

            oppList.forEach((oppRow, idx) => {
              const emp = emps[idx % emps.length];
              const rid = getRecId(oppRow);

              assignedMap[String(rid)] = {
                employeeCode: emp.employeeCode,
                employeeName: emp.employeeName,
                shift: emp.shift,
                assignedAt: now,
                mode: payload.assignMode,
                fromDate: payload.fromDate || "",
                toDate: payload.toDate || "",
                noOfRecords: payload.noOfRecords || 0,
                recSeq: payload.recSeq || "",
              };

              perEmpCount[emp.employeeName] = (perEmpCount[emp.employeeName] || 0) + 1;
            });

            saveAssignStore(oppCode, { ...store, assigned: assignedMap });

            setNormRows((prev) =>
              prev.map((r) => {
                const rid = getRecId(r);
                const a = assignedMap[String(rid)];
                if (!a) return r;
                return { ...r, salesOwner: a.employeeName, salesOwnerCode: a.employeeCode };
              })
            );

            const modeLabel =
              payload.assignMode === "date"
                ? `Date (${payload.fromDate} to ${payload.toDate})`
                : `Records (${payload.noOfRecords}, ${payload.recSeq})`;

            const summary = Object.entries(perEmpCount)
              .map(([name, count]) => `${count} opp assigned to ${name}`)
              .join(" • ");

            showToast(`${summary} for ${modeLabel}`);
          }}
        />
      ) : null}

      {availabilityOpen ? (
        <ModalShell title="Based on availability" onClose={() => setAvailabilityOpen(false)} width={520}>
          <div className="empty-note">Availability-based assignment will be wired after you share rules.</div>
        </ModalShell>
      ) : null}

      {toast ? <div className="ew-toast">{toast}</div> : null}

      <style jsx="true">{`
        .ew-toast{
          position: fixed;
          left:0;
          right: 0;
          top: 30%;
          margin: 0 auto;
          background: #035a0dff;
          color: #fff;
          padding: 20px;
          border-radius: 10px;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          z-index: 99999;
          max-width: 520px;
        }

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
        .header-actions { display:flex; gap:10px; }
        .btn-back { background:#14233c; color:#fff; border:0; border-radius:8px; padding:10px 18px; font-weight:600; cursor:pointer; }
        .btn-back:hover { opacity:.95; }
        .btn-export { background:#223b63; color:#fff; border:0; border-radius:8px; padding:10px 16px; font-weight:600; cursor:pointer; }
        .btn-export:hover { opacity:.95; }
        .btn-export[disabled] { opacity:.55; cursor:not-allowed; }

        .filters-card { background:#f7f9fc; border:1px solid #e6eaf2; border-radius:10px; padding:16px; margin-top:10px; }
        .filters-grid { display:grid; grid-template-columns: repeat(12, 1fr); gap:12px 16px; align-items:end; }
        .fgroup { grid-column: span 3; }
        .fgroup.ftime { grid-column: span 3; }
        .ftime-row { display:flex; gap:8px; }
        .flabel { display:block; font-size:13px; color:#475569; margin-bottom:6px; font-weight:600; }
        .finput { width:100%; height:36px; border:1px solid #d7ddea; border-radius:6px; padding:6px 10px; background:#fff; color:#222; }
        .factions { grid-column: span 2; display:flex; justify-content:flex-start; gap:8px; }
        .btn-primary { background:#0f2445; color:#fff; border:0; border-radius:8px; padding:10px 16px; font-weight:700; cursor:pointer; }
        .btn-primary:hover { opacity:.95; }

        .table-wrap { margin-top:16px; overflow-x:auto; border-radius:10px; }
        .opptable { width:100%; border-collapse:collapse; min-width:1000px; }
        .opptable thead th { text-align:left; font-weight:600; font-size:14px; color:#445; background:#f6f8fb; padding:12px 14px; border-bottom:1px solid #e8edf5; white-space:nowrap; cursor:pointer; user-select:none; }
        .opptable tbody td { font-size:14px; color:#333; padding:12px 14px; border-bottom:1px solid #f0f2f6; vertical-align:middle; }
        .opptable tbody tr:hover { background:#fafbfe; }
        .linkish { background:none; border:none; padding:0; color:#2b5ec2; cursor:pointer; font-weight:600; }
        .sort { margin-left:6px; color:#6b7280; font-size:12px; }
        .empty-note { margin-top:12px; padding:14px; background:#f9fafc; border:1px dashed #e6eaf2; border-radius:8px; color:#5c6b7a; font-size:14px; }
        .loading-msg { padding:40px; text-align:center; font-size:18px; color:#666; }

        .btn-assign {
          background: #0f2445;
          color: #fff;
          border: 0;
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-assign:hover { opacity: .95; }

        .ew-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 18px;
        }

        .ew-modal {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.25);
          max-width: 96vw;
          max-height: 90vh;
          overflow: hidden;
          border: 1px solid #e6eaf2;
        }

        .ew-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          background: #f7f9fc;
        }

        .ew-modal-title {
          font-weight: 800;
          color: #14233c;
          font-size: 16px;
        }

        .ew-modal-x {
          border: 0;
          background: transparent;
          font-size: 18px;
          cursor: pointer;
          color: #334155;
        }

        .ew-modal-body {
          padding: 16px;
          overflow: auto;
          max-height: calc(90vh - 56px);
        }

        .ew-choice-btn {
          width: 100%;
          text-align: left;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #e6eaf2;
          background: #fff;
          cursor: pointer;
          font-weight: 700;
          color: #223b63;
        }
        .ew-choice-btn:hover { background: #f7f9fc; }

        .ew-auto-top {
          display: flex;
          gap: 14px;
          align-items: end;
          flex-wrap: wrap;
        }

        .ew-field {
          display: grid;
          gap: 6px;
          min-width: 220px;
        }

        .ew-lbl {
          font-size: 13px;
          color: #475569;
          font-weight: 700;
        }

        .ew-check {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: #334155;
          user-select: none;
          margin-right: 6px;
        }

        .ew-agent-box {
          margin-top: 14px;
          border: 1px solid #e6eaf2;
          border-radius: 10px;
          overflow: hidden;
        }

        .ew-agent-head {
          display: grid;
          grid-template-columns: 52px 1fr 240px;
          gap: 0;
          background: #f6f8fb;
          border-bottom: 1px solid #e8edf5;
          font-weight: 800;
          color: #334155;
        }

        .ew-agent-body {
          max-height: 320px;
          overflow: auto;
          background: #fff;
        }

        .ew-agent-row {
          display: grid;
          grid-template-columns: 52px 1fr 240px;
          border-bottom: 1px solid #f0f2f6;
        }

        .ew-agent-row:hover { background: #fafbfe; }

        .ew-col {
          padding: 10px 12px;
          display: flex;
          align-items: center;
        }

        .ew-col-check { justify-content: center; }
        .ew-col-name { font-weight: 700; color: #223b63; }
        .ew-col-shift { color: #334155; }
      `}</style>
    </>
  );
};

export default OpportunityDetails;
