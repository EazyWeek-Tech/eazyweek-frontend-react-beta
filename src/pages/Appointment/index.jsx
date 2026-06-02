import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, Routes, Route } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import AppointmentDrawer from "./AppointmentDrawer";
import InvoicePage from "../Invoice";
import { useEMRForms } from "./useEMRForms";
import FormFillModal from "./FormFillModal";
import { useCustomerNotes } from "../Customer/CustomerDetails/CustomerNotePopup";
import './index.css'

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authPost = async (url, payload) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`POST ${url} failed`);
  const json = await res.json();
  return json.data ?? json;
};
const authGet = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  if (!res.ok) throw new Error(`GET ${url} failed`);
  const json = await res.json();
  return json.data ?? json;
};
const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); }
  catch { return {}; }
};
const convertTo24 = (t) => {
  if (!t) return "";
  const m = String(t).trim().replace(/\u202F|\u00A0/g, " ")
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?$/i);
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const min = m[2], mer = (m[3] || "").toUpperCase();
  if (mer.startsWith("P") && h !== 12) h += 12;
  if (mer.startsWith("A") && h === 12) h = 0;
  return `${String(h).padStart(2,"0")}:${min}`;
};
const getStatusClass = (s) => {
  switch ((s||"").toLowerCase()) {
    case "booked":     return "bked";
    case "confirmed":  return "cnfrmd";
    case "completed":  return "donest";
    case "active":     return "active";
    case "checked in": return "chkinst";
    case "no show":    return "noshow";
    case "cancelled":  return "cancelled";
    default:           return "";
  }
};

const Toast = ({ message, type = "info", onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
};

const AddCustomerModal = ({ onClose, onCustomerAdded }) => {
  const [form, setForm] = useState({ firstName:"", lastName:"", mobile:"", email:"", gender:"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!form.firstName || !form.mobile) { setErr("First name and mobile are required."); return; }
    setSaving(true);
    try {
      const user = getUser();
      await authPost(`${API_BASE_URL}/api/Appointment/CreateCustomer`, {
        firstName: form.firstName, lastName: form.lastName,
        mobile: form.mobile, email: form.email, gender: form.gender,
        centerCode: user.centerCode || "", phoneCode: "966",
      });
      onCustomerAdded?.({ name: `${form.firstName} ${form.lastName}`, ...form });
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="popouter" style={{ display:"flex" }}>
      <div className="popovrly" onClick={onClose}></div>
      <div className="popin">
        <div className="popuphdr">
          Add Customer
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>
        <div className="popfrm">
          {["firstName","lastName","mobile","email"].map((f) => (
            <div className="form-group" key={f}>
              <input type="text" id={f} placeholder=" " value={form[f]}
                onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
              <label htmlFor={f} className="frmlbl">
                {f === "firstName" ? "First Name" : f === "lastName" ? "Last Name" : f.charAt(0).toUpperCase() + f.slice(1)}
              </label>
            </div>
          ))}
          <div className="form-group radgrp">
            <label className="frmlbl">Gender</label>
            {["Male","Female"].map(g => (
              <div className="rdbox" key={g}>
                <input type="radio" id={`g_${g}`} name="gender" value={g.toLowerCase()}
                  checked={form.gender === g.toLowerCase()}
                  onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} />
                <label htmlFor={`g_${g}`}>{g}</label>
              </div>
            ))}
          </div>
          {err && <div className="error">{err}</div>}
          <div className="btnbar">
            <button className="prilnk" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="seclnk" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Appointment Details Sidebar ────────────────────────────────────────────────
const AppointmentDetailsSide = ({ appointment, onClose, onEdit, onRefresh, onStatusUpdated }) => {
  const navigate = useNavigate();
  const [appt,   setAppt]   = useState(appointment || null);
  const [status, setStatus] = useState(appointment?.status || "Booked");
  const [toast,  setToast]  = useState(null);
  const [loading,setLoading]= useState(false);

  // ── EMR Forms hook ────────────────────────────────────────────────────────
  const { checkAndShowForms, showModal, modalProps } = useEMRForms();

  // ── Customer Notes — check-in alert ──────────────────────────────────────
  const { NotePopup: CheckinNotePopup, checkNotes: checkCheckinNotes } = useCustomerNotes();

  const user        = useMemo(() => getUser(), []);
  const centerCode  = user.centerCode || "";
  const apptId      = appointment?.appointmentId;
  const apptLineNo  = appointment?.lineNo;
  const apptDateISO = useMemo(() => {
    const raw = appointment?.appointmentDate;
    if (raw && typeof raw === "string") { const m = raw.match(/^(\d{4}-\d{2}-\d{2})/); if (m) return m[1]; }
    return new Date().toISOString().split("T")[0];
  }, [appointment?.appointmentDate]);

  const BASE_STATUSES = ["Booked","Confirmed","Checked In","Active","Completed","Cancelled","No Show"];
  const RESTRICTED    = ["Checked In","Active","Completed"];
  const isRestricted  = RESTRICTED.includes(status);
  const VISIBLE       = BASE_STATUSES.filter(s => !(isRestricted && (s === "Cancelled" || s === "No Show")));

  useEffect(() => {
    if (!apptId || !centerCode || !apptDateISO) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await authPost(`${API_BASE_URL}/api/Appointment/GetAppDetails`, {
          appointmentdate: apptDateISO, searchtext: "", centerCode,
        });
        const fresh = Array.isArray(list) ? list.find(r => r.appointmentId === apptId) : null;
        if (!cancelled && fresh) {
          const merged = { ...appointment, ...fresh, starttime: fresh.startTime, doctorname: fresh.doctorName };
          setAppt(merged);
          if (merged.status && merged.status !== status) setStatus(merged.status);
        }
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [apptId, apptDateISO, centerCode]);

  const sendStatusUpdate = async (payload, newStatus) => {
    try {
      const result = await authPost(`${API_BASE_URL}/api/Appointment/AppOperation`, payload);
      if (result?.success) {
        setToast({ message: "Appointment updated!", type: "success" });
        setAppt(prev => prev ? { ...prev, status: newStatus } : prev);
        onStatusUpdated?.(apptId, newStatus);
        onRefresh?.();
        // ── Fire check-in notes popup ─────────────────────────────────────
        if (newStatus === "Checked In") {
          const custId = appt?.custId || appointment?.custId;
          console.log("[index.jsx] Checked In — firing notes for custId:", custId);
          if (custId) await checkCheckinNotes(custId, "checkin");
        }
      } else setToast({ message: result?.message || "Update failed.", type: "error" });
    } catch { setToast({ message: "Error updating appointment.", type: "error" }); }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (isRestricted && (newStatus === "Cancelled" || newStatus === "No Show")) {
      setToast({ message: "Cannot cancel/no-show after checked in or active.", type: "error" });
      return;
    }
    if (newStatus === "Active" || newStatus === "Completed") {
      const toStatus    = newStatus === "Active" ? "Start" : "Completed";
      const serviceCode = appt?.serviceCode || appt?.allLines?.[0]?.serviceCode || "";
      const canProceed  = await checkAndShowForms({
        appointmentId: apptId, serviceCode, custId: appt?.custId || "", centerCode, toStatus,
        macroContext: {
          customerName:     appt?.fullName         || "",
          serviceName:      appt?.serviceName      || "",
          centreName:       user?.centerName       || "",
          practitionerName: appt?.therapistName    || "",
          appointmentDate:  appt?.startDate        || new Date().toISOString(),
        },
      });
      if (!canProceed) return;
    }
    setStatus(newStatus);
    sendStatusUpdate(
      { appointmentId: apptId, status: newStatus, operation: "STATUSUPDATE", centerCode, lineNo: apptLineNo },
      newStatus
    );
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this appointment?")) return;
    authPost(`${API_BASE_URL}/api/Appointment/AppOperation`, { appointmentId: apptId, status: "", operation: "DELETE", centerCode, lineNo: apptLineNo })
      .then(() => { setToast({ message: "Deleted!", type: "success" }); onRefresh?.(); setTimeout(() => onClose?.(), 1500); })
      .catch(() => setToast({ message: "Delete failed.", type: "error" }));
  };

  const handleEdit = () => {
    if (!onEdit) return;
    const parts = (appt?.fullName || "").split(" ");
    onEdit({ ...(appt || appointment), firstName: parts.slice(0, -1).join(" ") || parts[0], lastName: parts.slice(-1).join(" ") });
    onClose?.();
  };

  const goTo = (path, extra = {}) => {
    const a = appt || appointment || {};
    const q = new URLSearchParams();
    if (a.custId) q.append("custid", a.custId);
    if (a.fullName) q.append("custname", a.fullName);
    if (a.appointmentId) q.append("appointmentid", a.appointmentId);
    Object.entries(extra).forEach(([k, v]) => q.append(k, v));
    navigate(`${path}?${q.toString()}`);
  };

  return (
    <div className="smdiv expand">
      <div className="resizable">
        <div className="rightcls" onClick={onClose}>
          <img src={`${import.meta.env.BASE_URL}images/dblrigh.svg`} alt="Close" width="16" />
        </div>

        <div className="apptcdet custdiv">
          <div className="csttopdiv">
            <img src={`${import.meta.env.BASE_URL}images/usericon.png`} width="30" alt="User" />
            <h3 className="cstnm">
              {appt?.fullName || ""}
              <div className="cstno">{appt?.number || "—"}</div>
              <div className="cstid">{appt?.custId || "—"}</div>
            </h3>
          </div>
          <div className="cdtprof">
            <a href="#" className="cstlnk" onClick={e => { e.preventDefault(); goTo("/customer", { fullname: appt?.fullName, number: appt?.number }); }}>
              <img src={`${import.meta.env.BASE_URL}images/custome.svg`} width="16" alt="" /> Customer Profile
            </a>
          </div>
        </div>

        <div className="apptblk">
          <div className="hdflx">
            <h2 className="dethead">Appointment Details</h2>
            <div className="acticons">
              <button className="edit tooltip" data-tooltip="Edit" onClick={handleEdit}>
                <span className="stimg"><img src={`${import.meta.env.BASE_URL}images/edtwht.svg`} alt="Edit" /></span>
              </button>
              <button className="delete tooltip" data-tooltip="Delete" onClick={handleDelete}>
                <span className="stimg"><img src={`${import.meta.env.BASE_URL}images/deletewt.svg`} alt="Delete" /></span>
              </button>
            </div>
          </div>

          <div className="apptsts appflx">
            <div className="form-group slctgrp">
              <label>Status</label>
              <select value={status} onChange={handleStatusChange} disabled={loading}>
                {VISIBLE.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {Number(appt?.isPaymentMade) > 0 && (
              <div className="detaildiv pytmd">
                <div className="appdtlbl">Payment:</div>
                <div className="appdtval">{Number(appt.isPaymentMade) === 1 ? "Paid" : "Partially Paid"}</div>
              </div>
            )}
          </div>

          <div className="medhistdiv">
            <div className="aptdetailwrp">
              {[
                { icon:"Datentime.svg", label:"Date & Time", val:`${appt?.startTime||""} - ${appt?.endTime||""}` },
                { icon:"services.svg",  label:"Services",
                  val: (appt?.allLines || [appt]).map(l => l?.serviceName).filter(Boolean).join(", ") || "—" },
                { icon:"noteslist.svg", label:"Notes", val: appt?.notes || "—" },
              ].map(({ icon, label, val }) => (
                <div className="dtntime" key={label}>
                  <div className="icondiv"><img src={`${import.meta.env.BASE_URL}images/${icon}`} alt={label} /></div>
                  <div className="detaildiv"><div className="appdtlbl">{label}</div><div className="appdtval">{val}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="apptactdiv">
          <h2 className="dethead">Appointment Execution</h2>
          <button onClick={() => goTo("/history")} className="cstlnk" style={{ width:"100%" }}>
            <img src={`${import.meta.env.BASE_URL}images/medical.svg`} alt="" /> Medical History
          </button>
          <div className="apptcdet">
            <button onClick={() => goTo("/consent")} className="cstlnk">
              <img src={`${import.meta.env.BASE_URL}images/consent.svg`} alt="" /> Consent Form
            </button>
            <button onClick={() => goTo("/treatment")} className="cstlnk">
              <img src={`${import.meta.env.BASE_URL}images/consent.svg`} alt="" /> Treatment Form
            </button>
          </div>
          {(appt?.allLines || [appt]).every(l => Number(l?.isPaymentMade) === 1) ? (
            <div className="pndpay" style={{ opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }}>
              <span className="stimg">
                <img src={`${import.meta.env.BASE_URL}images/paymentpend.svg`} alt="" /> Payment Done
              </span>
            </div>
          ) : (
            <button onClick={() => {
              const a = appt||appointment||{};
              const q = new URLSearchParams();
              if(a.custId)        q.append("custid",          a.custId);
              if(a.fullName)      q.append("custname",        a.fullName);
              if(a.number)        q.append("number",          a.number);
              if(a.appointmentId) q.append("appointmentid",   a.appointmentId);
              if(a.isPaymentMade!=null) q.append("isPaymentMade", a.isPaymentMade);
              const apptDate = a.appointmentDate
                ? new Date(a.appointmentDate).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0];
              q.append("appointmentdate", apptDate);
              navigate(`/invoice?${q.toString()}`);
            }} className="pndpay">
              <span className="stimg"><img src={`${import.meta.env.BASE_URL}images/paymentpend.svg`} alt="" /> Make Payment</span>
            </button>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showModal && modalProps && <FormFillModal {...modalProps} />}
      {CheckinNotePopup}
    </div>
  );
};

const STATUS_STYLE = {
  "All Complete":    { bg:"#dcfce7", color:"#166534", icon:"✅" },
  "Partially Filled":{ bg:"#fef9c3", color:"#854F0B", icon:"🟡" },
  "Not Started":     { bg:"#f1f5f9", color:"#64748b", icon:"📋" },
};

const EMRStatusBadge = ({ appointmentId, serviceCode }) => {
  const [status, setStatus] = React.useState(null);
  const [forms,  setForms]  = React.useState([]);
  const [showTip,setShowTip]= React.useState(false);
  const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

  React.useEffect(() => {
    if (!appointmentId || !serviceCode) return;
    fetch(
      `${API_BASE_URL}/api/EMR/Appointment/${encodeURIComponent(appointmentId)}/FormStatus?serviceCode=${encodeURIComponent(serviceCode)}`,
      { headers: { Authorization: `Bearer ${TOKEN()}` } }
    ).then(r => r.ok ? r.json() : null)
     .then(d => {
       const data = d?.data ?? d;
       if (data?.overall && data.overall !== "No Forms") {
         setStatus(data.overall);
         setForms(data.forms || []);
       }
     }).catch(() => {});
  }, [appointmentId, serviceCode]);

  if (!status) return null;
  const style = STATUS_STYLE[status] || STATUS_STYLE["Not Started"];

  return (
    <div style={{ position:"relative", display:"inline-block" }}
      onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
      <div style={{ background:style.bg, color:style.color, borderRadius:99,
        padding:"1px 7px", fontSize:10, fontWeight:700, cursor:"default",
        display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
        {style.icon} {status}
      </div>
      {showTip && forms.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, marginTop:4,
          background:"#fff", border:"1px solid #e7ecf4", borderRadius:8,
          padding:"8px 12px", zIndex:100, minWidth:220, boxShadow:"0 4px 12px rgba(0,0,0,.1)" }}>
          {forms.map(f => (
            <div key={f.formCode} style={{ fontSize:11, display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"3px 0", borderBottom:"0.5px solid #f1f5f9" }}>
              <span style={{ color:"#334b71", fontWeight:500 }}>{f.formName}</span>
              <span style={{ color: f.status==="Completed" ? "#166534" : "#94a3b8", fontSize:10, fontWeight:700, marginLeft:8 }}>
                {f.status === "Completed" ? "✅ Done" : "⏳ Pending"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FilterHeader = ({ countsOverride = {} }) => {
  const val = (k) => typeof countsOverride[k] === "number" ? countsOverride[k] : 0;
  const items = [
    { key:"Completed",     icon:"completed.svg",   label:"Completed"      },
    { key:"PaymentPending",icon:"paymentpend.svg",  label:"Payment Pending"},
    { key:"Active",        icon:"ongoing.png",      label:"Active/Ongoing" },
    { key:"CheckedIn",     icon:"checkin.svg",      label:"Checked In"     },
    { key:"Confirmed",     icon:"confirmed.png",    label:"Confirmed"      },
    { key:"Booked",        icon:"booked.svg",       label:"Booked"         },
  ];
  return (
    <header className="fltrhdr">
      <div className="fltroptflx">
        <div className="viewfilter">
          <span className="viewrm viewtb">Rooms</span>
          <span className="viewdoc viewtb active">Practitioners</span>
        </div>
        <div className="vwextrabtns">
          <div className="apptstatus">
            {items.map(({ key, icon, label }) => (
              <div key={key} className={`${key.toLowerCase()} statcell`}>
                <div className="stimg">
                  <img src={`${import.meta.env.BASE_URL}images/${icon}`} alt={label} />{label}
                </div>
                <div className="statno">{val(key)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

const SchedulerGrid = ({ onAddCustomer, newCustomer }) => {
  const [isDrawerOpen,        setIsDrawerOpen]       = useState(false);
  const [selectedCustomer,    setSelectedCustomer]   = useState(null);
  const [selectedTimeSlot,    setSelectedTimeSlot]   = useState(null);
  const [selectedDoctor,      setSelectedDoctor]     = useState(null);
  const [doctors,             setDoctors]            = useState([]);
  const [appointments,        setAppointments]       = useState([]);
  const [selectedAppointment, setSelectedAppointment]= useState(null);
  const [editData,            setEditData]           = useState(null);
  const [isSidebarOpen,       setIsSidebarOpen]      = useState(false);
  const [searchTerm,          setSearchTerm]         = useState("");
  const [suggestions,         setSuggestions]        = useState([]);
  const [showAddCustomer,     setShowAddCustomer]    = useState(false);
  const [selectedDate,        setSelectedDate]       = useState(() => new Date().toISOString().split("T")[0]);
  const suggestRef = useRef(null);

  const user = useMemo(() => getUser(), []);

  const timeSlots = useMemo(() => [...Array(145)].map((_, i) => {
    const base = new Date("1970-01-01T10:00:00");
    base.setMinutes(base.getMinutes() + i * 5);
    return base.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:true });
  }), []);

  useEffect(() => { if (newCustomer) { setSelectedCustomer(newCustomer); setEditData(null); setIsDrawerOpen(true); } }, [newCustomer]);

  const fetchDoctors = async () => {
    try {
      const data = await authGet(`${API_BASE_URL}/api/Master/LoadAllPractioner/${user.centerCode||""}`);
      setDoctors(Array.isArray(data) ? data.map(d => ({ id: d.id || d.code || "", name: d.name || "" })) : []);
    } catch (e) { console.error(e); }
  };

  const fetchAppointments = async (date) => {
    try {
      const data = await authPost(`${API_BASE_URL}/api/Appointment/GetAppDetails`, {
        appointmentdate: date, searchtext: "", centerCode: user.centerCode || "",
      });
      setAppointments((Array.isArray(data) ? data : []).map(a => ({
        ...a, starttime: a.startTime, doctorname: a.doctorName, isPaymentMade: a.isPaymentMade ?? 0,
      })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchDoctors(); fetchAppointments(selectedDate); }, [selectedDate]);

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    try {
      const data = await authGet(`${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(query)}/${user.centerCode||""}`);
      setSuggestions(Array.isArray(data) ? data.filter(i =>
        `${i.firstName} ${i.lastName}`.toLowerCase().includes(query.toLowerCase()) || (i.mobile||"").includes(query)
      ) : []);
    } catch { setSuggestions([]); }
  };

  const countsOverride = useMemo(() => {
    const by = (t) => appointments.filter(a => (a.status||"").toLowerCase() === t).length;
    return {
      Completed: by("completed"), Confirmed: by("confirmed"), CheckedIn: by("checked in"),
      Active: by("active"), Booked: by("booked"), Cancelled: by("cancelled"), NoShow: by("no show"),
      PaymentPending: appointments.filter(a => Number(a.isPaymentMade) === 0).length,
    };
  }, [appointments]);

  const normalizeTime = (t) => {
    if (!t) return "";
    const d = new Date(`1970-01-01T${convertTo24(t.trim())}`);
    return d.getHours().toString().padStart(2,"0") + ":" + d.getMinutes().toString().padStart(2,"0");
  };
  const normDoc = (n) => (n||"").replace(/^Dr\.?\s*/i,"").trim().toLowerCase();

  const doctorHeights = useMemo(() => doctors.map(doc => {
    let max = 1;
    const timeCounts = {};
    appointments.forEach(a => {
      const nt = normalizeTime(a.starttime);
      if (!nt) return;
      const matchById   = doc.id && (a.doctorId || a.doctorid) && doc.id === (a.doctorId || a.doctorid);
      const matchByName = normDoc(doc.name || doc) === normDoc(a.doctorname || a.doctorName);
      if (!matchById && !matchByName) return;
      timeCounts[nt] = (timeCounts[nt] || 0) + 1;
      if (timeCounts[nt] > max) max = timeCounts[nt];
    });
    return max * 80 + (max - 1) * 5 + 10;
  }), [doctors, appointments]);

  const renderAppointments = (time, doctor) => {
    const filtered = appointments.filter(a => {
      if (normalizeTime(a.starttime) !== normalizeTime(time)) return false;
      const docId = a.doctorId || a.doctorid || "";
      if (doctor.id && docId) return doctor.id === docId;
      return normDoc(doctor.name || doctor) === normDoc(a.doctorname || a.doctorName);
    });
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
        {filtered.map(appt => {
          const dur = parseInt((appt.duration||"5").replace(/\D/g,""),10) || 5;
          const sc  = getStatusClass(appt.status);
          const ec  = dur === 5 ? "smllappt" : dur === 10 ? "medappt" : "";
          return (
            <div key={`${appt.appointmentId}-${appt.startTime}`}
              className={`appcell ${sc} ${ec}`} style={{ width:`${dur*14}px`, minWidth:"50px" }}>
              <div className="ptflx">
                <div className="ptnm">{appt.fullName}</div>
                <div className={`aptst ${sc}`}><span></span>{appt.status||"Booked"}</div>
              </div>
              <div className="apptype"><strong>{appt.serviceName||"N/A"}</strong></div>
              <EMRStatusBadge
                appointmentId={appt.appointmentId}
                serviceCode={appt.serviceCode || appt.allLines?.[0]?.serviceCode || ""}
              />
              {Number(appt.isPaymentMade) > 0 && <div className="paidst">Paid</div>}
              <span className="expopup" onClick={() => {
                const allLines = appointments.filter(a => a.appointmentId === appt.appointmentId);
                setSelectedAppointment({ ...appt, allLines });
                setIsSidebarOpen(true);
              }}>
                <img src={`${import.meta.env.BASE_URL}images/expand.svg`} alt="Expand" />
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="calsection">
      <header className="appthdr">
        <div className="flx-spcbt">
          <div className="backbtnapp">
            <Link to="/dashboard" className="tooltip" data-tooltip="Go Back" data-tooltip-pos="right">
              <img src={`${import.meta.env.BASE_URL}images/back.svg`} width="24" alt="Back" />
            </Link>
            <span className="c-name">{user.centerName || "Clinic"}</span>
          </div>
          <div className="datepkrdiv">
            <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); fetchAppointments(e.target.value); }} />
          </div>
          <div className="actbtnsdiv">
            <Link to="/dashboard" className="tooltip" data-tooltip="Dashboard" data-tooltip-pos="right">
              <img src={`${import.meta.env.BASE_URL}images/homeicon.svg`} width="24" alt="Home" />
            </Link>
            <div className="apptimg tooltip" data-tooltip="Add Appointment" onClick={() => { setSelectedCustomer(null); setIsDrawerOpen(true); }}>
              <img src={`${import.meta.env.BASE_URL}images/addappt.svg`} alt="Add" />
            </div>
            <span className="apptstgs tooltip" data-tooltip="Add Customer" onClick={() => setShowAddCustomer(true)}>
              <img src={`${import.meta.env.BASE_URL}images/addcustwhite.svg`} alt="Add Customer" />
            </span>
            <div className="search-container" style={{ position:"relative" }}>
              <input type="text" placeholder="Search..." value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); fetchSuggestions(e.target.value); }} />
              {suggestions.length > 0 && (
                <div className="suggestionssrc" ref={suggestRef}>
                  <ul>
                    {suggestions.map((item, idx) => (
                      <li key={idx} style={{ cursor:"pointer", padding:"4px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}
                        onClick={() => { setSearchTerm(`${item.firstName} - ${item.mobile}`); setSuggestions([]); }}>
                        <span>{item.firstName} – {item.mobile}</span>
                        <span onClick={e => { e.stopPropagation(); setSelectedCustomer(item); setIsDrawerOpen(true); setSuggestions([]); setSearchTerm(""); }} className="bookappt">
                          <img src={`${import.meta.env.BASE_URL}images/addapptblk.svg`} alt="Book" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <FilterHeader countsOverride={countsOverride} />

      <div className="msttbl">
        <div className="lfthrdiv">
          <div className="lftcol sticky-header">
            <div className="lftmin lgndiv">
              <div className="lgndth"><div className="vertxt">Doctors</div><div className="hrtxt">Time</div></div>
            </div>
          </div>
          <div className="lftcol sticky-header">
            <div className="lftmin">
              {doctors.map((doc, idx) => (
                <div key={idx} className="lfttm tblcell" style={{ height:`${doctorHeights[idx]}px` }}>
                  {doc.name || doc}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rgtcol">
          {timeSlots.map((time, rowIdx) => (
            <div className="cldrrow" key={rowIdx}>
              <div className="cldrttl clnctm sticky-time">{time}</div>
              {doctors.map((doc, colIdx) => (
                <div key={colIdx} className="cldrcol clncoff"
                  onDoubleClick={() => { setSelectedTimeSlot(time); setSelectedDoctor(doc); setEditData(null); setIsDrawerOpen(true); }}
                  style={{ height:`${doctorHeights[colIdx]}px`, display:"flex", flexDirection:"column", position:"relative" }}>
                  {renderAppointments(time, doc)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {isSidebarOpen && selectedAppointment && (
        <AppointmentDetailsSide
          appointment={selectedAppointment}
          onClose={() => setIsSidebarOpen(false)}
          onEdit={appt => {
            setEditData({ ...appt });
            setSelectedTimeSlot(appt.starttime);
            const docObj = doctors.find(d => d.id === (appt.doctorId || appt.doctorid))
                        || doctors.find(d => normDoc(d.name||d) === normDoc(appt.doctorname||appt.doctorName))
                        || { id: appt.doctorId || "", name: appt.doctorname || appt.doctorName || "" };
            setSelectedDoctor(docObj);
            setSelectedAppointment(null); setIsSidebarOpen(false); setIsDrawerOpen(true);
          }}
          onRefresh={() => fetchAppointments(selectedDate)}
          onStatusUpdated={(id, st) => {
            setAppointments(prev => prev.map(a => a.appointmentId === id ? { ...a, status: st } : a));
            setSelectedAppointment(prev => prev?.appointmentId === id ? { ...prev, status: st } : prev);
          }}
        />
      )}

      {isDrawerOpen && (
        <AppointmentDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          customer={selectedCustomer}
          timeSlot={selectedTimeSlot}
          doctor={selectedDoctor}
          editAppointment={editData}
          selectedDate={selectedDate}
          onRefreshAppointments={() => fetchAppointments(selectedDate)}
        />
      )}

      {showAddCustomer && (
        <AddCustomerModal
          onClose={() => setShowAddCustomer(false)}
          onCustomerAdded={cust => { setSelectedCustomer(cust); setShowAddCustomer(false); }}
        />
      )}
    </section>
  );
};

const Appointment = () => {
  const [newCustomerData, setNewCustomerData] = useState(null);
  return (
    <Routes>
      <Route path="/" element={<SchedulerGrid newCustomer={newCustomerData} onAddCustomer={() => {}} />} />
      <Route path="/payment" element={<InvoicePage />} />
    </Routes>
  );
};

export default Appointment;