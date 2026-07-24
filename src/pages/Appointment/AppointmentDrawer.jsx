import React, { useState, useEffect, useRef, useCallback } from "react";
import { ClearButton } from "../../components/ClearableInput";
import { API_BASE_URL } from "../../config";
import { useCustomerNotes } from "../Customer/CustomerDetails/CustomerNotePopup";
import {
  sanitizeName, sanitizeDigits,
  loadNationalities, natCodeOf, natNameOf, ensureCustomerId,
} from "./customerFields";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet  = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const json = await res.json();
  return json.data ?? json;
};
const authPost = async (url, payload) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return json.data ?? json;
};
const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); }
  catch { return {}; }
};

/* Customer-field helpers (sanitizers, nationality master, Citizen/Expat rule)
   live in ./customerFields so the booking drawer and the invoice pre-check
   share ONE definition — see the note there about CENTRE_COUNTRY_ID. */

const Toast = ({ message, type = "info", onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
};

const AddNoteModal = ({ onClose, onSubmit }) => {
  const [note, setNote] = useState("");
  return (
    <div className="popouter" id="addnote" style={{ display:"flex" }}>
      <div className="popovrly"></div>
      <div className="popin">
        <div className="popuphdr">Add Note
          <span className="clsbtn" onClick={onClose}><img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" /></span>
        </div>
        <div className="popfrm">
          <div className="frmdiv">
            <label>Add Note: <span className="rd">*</span></label>
            <textarea placeholder="Enter your note..." value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="btnbar">
            <input type="submit" className="prilnk" value="Add Note" onClick={() => { if (note.trim()) onSubmit(note); }} />
            <input type="button" className="seclnk" value="Cancel" onClick={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
};

const toMins = (t) => {
  const [hp, mp] = t.split(":");
  const [m, per] = mp.split(" ");
  let h = parseInt(hp, 10);
  if (per === "PM" && h !== 12) h += 12;
  if (per === "AM" && h === 12) h -= 12;
  return h * 60 + parseInt(m, 10);
};
const fromMins = (total) => {
  const h = Math.floor(total / 60), m = total % 60;
  const per = h >= 12 ? "PM" : "AM";
  const dh  = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${String(m).padStart(2,"0")} ${per}`;
};
const calcEnd = (start, dur) => fromMins(toMins(start) + parseInt(String(dur||0), 10));

const TIME_SLOTS = [...Array(144)].map((_, i) => {
  const mins = 600 + i * 5;
  const h = Math.floor(mins/60), m = mins%60;
  const per = h >= 12 ? "PM" : "AM";
  const dh  = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${String(m).padStart(2,"0")} ${per}`;
});

// Suggestion rows show the FULL name plus the mobile, so two customers sharing a
// first name (or a household sharing a surname) can be told apart before picking.
const custLabel = (i) => {
  const name = [i.firstName, i.lastName].filter(Boolean).join(" ").trim();
  return [name, i.mobile || ""].filter(Boolean).join(" – ");
};

// lockIdentity: the customer was just created by a lead conversion, so mobile /
// first name / last name are fixed. Editing them here would also blank `custid`
// (see handleChange), detaching the booking from the customer the conversion made
// and breaking the LTR confirm step.
const CustomerForm = ({ prefill, onChange, lockIdentity = false }) => {
  const EMPTY = { custid:"", number:"", firstname:"", lastname:"", email:"", gender:"", nationalityCode:"" };
  const [form,    setForm]    = useState(EMPTY);
  const [mobSugg, setMobSugg] = useState([]);
  const [nmSugg,  setNmSugg]  = useState([]);
  const [lnSugg,  setLnSugg]  = useState([]);

  const debounce   = useRef(null);
  const prevCustid = useRef("__init__");


  // ── Nationality master ────────────────────────────────────────────────────
  // Optional at booking time. Filling it here saves the receptionist the
  // pre-check prompt at Make Payment; leaving it blank costs nothing now.
  const [natList, setNatList] = useState([]);

  useEffect(() => { loadNationalities().then(setNatList); }, []);

  useEffect(() => {
    if (!prefill) return;
    const incomingId = prefill.custid || prefill.custId || "";
    if (incomingId === prevCustid.current) return;
    prevCustid.current = incomingId;
    const next = {
      number:    prefill.number    || prefill.mobile || "",
      firstname: prefill.firstname || prefill.firstName || (prefill.name||"").split(" ")[0] || "",
      lastname:  prefill.lastname  || prefill.lastName  || (prefill.name||"").split(" ").slice(1).join(" ") || "",
      email:     prefill.email     || "",
      gender:    prefill.gender    || "",
      nationalityCode: String(prefill.nationalityCode ?? prefill.nationalityId ?? ""),
      custid:    incomingId,
    };
    setForm(next);
  }, [prefill]);

  const sync = (updated) => { setForm(updated); onChange?.(updated); };

  const fetchSugg = async (type, val) => {
    const user = getUser();
    if (!val || val.length < 2 || !user.centerCode) return;
    try {
      const data = await authGet(`${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(val)}/${user.centerCode}`);
      const arr  = Array.isArray(data) ? data : [];
      if (type === "number")    setMobSugg(arr.filter(i => (i.mobile||"").startsWith(val)));
      if (type === "firstname") setNmSugg(arr.filter(i => (i.firstName||"").toLowerCase().includes(val.toLowerCase())));
      if (type === "lastname")  setLnSugg(arr.filter(i => (i.lastName ||"").toLowerCase().includes(val.toLowerCase())));
    } catch {
      if      (type === "number")   setMobSugg([]);
      else if (type === "lastname") setLnSugg([]);
      else                          setNmSugg([]);
    }
  };

  /* Typing after a pick BREAKS the link. Previously custid survived an edit, so
     you could select Ahmed, retype the mobile, and book Ahmed's slot under
     someone else's number. Any manual edit now clears it — re-select or Add. */
  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "number") {
      const digits = sanitizeDigits(value).slice(0,10);
      sync({ ...form, number: digits, custid: "" });
      if (digits.length >= 3) { clearTimeout(debounce.current); debounce.current = setTimeout(() => fetchSugg("number", digits), 300); }
      else setMobSugg([]);
      return;
    }
    if (id === "firstname") {
      const clean = sanitizeName(value);
      sync({ ...form, firstname: clean, custid: "" });
      if (clean.length >= 2) { clearTimeout(debounce.current); debounce.current = setTimeout(() => fetchSugg("firstname", clean), 300); }
      else setNmSugg([]);
      return;
    }
    if (id === "lastname") {
      const clean = sanitizeName(value);
      sync({ ...form, lastname: clean, custid: "" });
      if (clean.length >= 2) { clearTimeout(debounce.current); debounce.current = setTimeout(() => fetchSugg("lastname", clean), 300); }
      else setLnSugg([]);
      return;
    }
    sync({ ...form, [id]: value });
  };

  const selectSugg = (item) => {
    const next = {
      number: item.mobile||"", firstname: item.firstName||"", lastname: item.lastName||"",
      email: item.email||"", gender: item.gender||"",
      nationalityCode: String(item.nationalityId ?? item.nationalityCode ?? ""),
      custid: item.custId||item.custid||item.id||"",
    };
    prevCustid.current = next.custid;
    setForm(next); onChange?.(next);
    setMobSugg([]); setNmSugg([]); setLnSugg([]);
  };

  return (
    <div className={`bscdetwrp${lockIdentity ? " cf-lock" : ""}`}>
      <style>{`
        .cf-natlbl{position:static!important;transform:none!important;display:block;
          font-size:11px;font-weight:600;color:#5b6b85;margin-bottom:4px}
        .cf-nat{width:100%}
        .cf-lock input:disabled{background:#f4f6fa;color:#5b6b85;cursor:not-allowed;
          border-color:#dbe4f0;-webkit-text-fill-color:#5b6b85;opacity:1}
      `}</style>
      <div className="frmlgnd">Customer Details</div>
      {lockIdentity && (
        <div style={{ margin:"0 0 10px", fontSize:11, color:"#5b6b85", background:"#f1f5fb", border:"1px solid #dbe4f0", borderRadius:6, padding:"6px 9px" }}>
          Name and mobile are set from the converted lead and can't be changed here.
        </div>
      )}
      <form autoComplete="off">
        <input type="hidden" id="custid" value={form.custid} />
        <div className="form-group" style={{ position:"relative" }}>
          <input type="text" id="number" placeholder=" " autoComplete="one-time-code" value={form.number} onChange={handleChange} disabled={lockIdentity} maxLength={10} inputMode="numeric" style={{ paddingRight: 28 }} />
          <label htmlFor="number" className="frmlbl">Mobile Number</label>
          {!lockIdentity && <ClearButton targetId="number" show={!!form.number} />}
          {!lockIdentity && mobSugg.length > 0 && (
            <ul className="suggestions">{mobSugg.map((i,idx) => (
              <li key={idx} onClick={() => selectSugg(i)}>{custLabel(i)}</li>
            ))}</ul>
          )}
        </div>
        <div className="form-group" style={{ position:"relative" }}>
          <input type="text" id="firstname" placeholder=" " autoComplete="one-time-code" value={form.firstname} onChange={handleChange} disabled={lockIdentity} style={{ paddingRight: 28 }} />
          <label htmlFor="firstname" className="frmlbl">First Name</label>
          {!lockIdentity && <ClearButton targetId="firstname" show={!!form.firstname} />}
          {!lockIdentity && nmSugg.length > 0 && (
            <ul className="suggestions">{nmSugg.map((i,idx) => (
              <li key={idx} onClick={() => selectSugg(i)}>{custLabel(i)}</li>
            ))}</ul>
          )}
        </div>
        <div className="form-group" style={{ position:"relative" }}>
          <input type="text" id="lastname" placeholder=" " autoComplete="one-time-code" value={form.lastname} onChange={handleChange} disabled={lockIdentity} style={{ paddingRight: 28 }} />
          <label htmlFor="lastname" className="frmlbl">Last Name</label>
          {!lockIdentity && <ClearButton targetId="lastname" show={!!form.lastname} />}
          {!lockIdentity && lnSugg.length > 0 && (
            <ul className="suggestions">{lnSugg.map((i,idx) => (
              <li key={idx} onClick={() => selectSugg(i)}>{custLabel(i)}</li>
            ))}</ul>
          )}
        </div>
        <div className="form-group">
          <input type="email" id="email" placeholder=" " value={form.email} onChange={handleChange} />
          <label htmlFor="email" className="frmlbl">Email Address</label>
        </div>

        {/* Nationality — optional here so a walk-in can be booked in seconds.
            It IS required at billing: Make Payment runs a pre-check and asks for
            it then (see useInvoicePrecheck). Filling it in now saves that step. */}
        <div className="form-group">
          <label htmlFor="nationalityCode" className="frmlbl cf-natlbl">Nationality</label>
          <select id="nationalityCode" className="cf-nat" value={form.nationalityCode}
            onChange={e => sync({ ...form, nationalityCode: e.target.value })}>
            <option value="">Select nationality</option>
            {natList.map((n, i) => (
              <option key={`${natCodeOf(n)}-${i}`} value={natCodeOf(n)}>{natNameOf(n)}</option>
            ))}
          </select>
        </div>

        <div className="form-group radgrp">
          <label className="frmlbl">Gender</label>
          <div className="rdopts">
            {["male","female"].map(g => (
              <div className="rdbox" key={g}>
                <input type="radio" id={`g_${g}`} name="gender" value={g}
                  checked={form.gender?.toLowerCase() === g}
                  onChange={e => sync({ ...form, gender: e.target.value })} />
                <label htmlFor={`g_${g}`}>{g.charAt(0).toUpperCase()+g.slice(1)}</label>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};

const ServiceRequestForm = ({ onAddService, resetKey, initialData, lastEndTime, selectedDoctor, selectedTime }) => {
  const INIT = { servicename:"", servicecode:"", preference:"any", practitioner:"", practitionerName:"",
    startTime:"10:00 AM", duration:"5", endTime:"10:05 AM", room:"", note:"", equipment:"N/A" };

  const [form,          setForm]          = useState(INIT);
  const [errors,        setErrors]        = useState({});
  const [svcSugg,       setSvcSugg]       = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [rooms,         setRooms]         = useState([]);
  const [showNote,      setShowNote]      = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    const user = getUser();
    if (!user.centerCode) return;
    authGet(`${API_BASE_URL}/api/Master/LoadRoom/${user.centerCode}`)
      .then(d => setRooms(Array.isArray(d) ? d : []))
      .catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
      if (initialData.servicecode) fetchPractitioners(initialData.servicecode, initialData.practitioner);
    } else {
      const start = selectedTime || lastEndTime || "10:00 AM";
      const defaultDur = "5";
      const doctorId   = selectedDoctor?.id   || (typeof selectedDoctor === "string" ? "" : "");
      const doctorName = selectedDoctor?.name || (typeof selectedDoctor === "string" ? selectedDoctor : "");
      setForm({ ...INIT, startTime: start, endTime: calcEnd(start, defaultDur),
        duration: defaultDur, practitioner: doctorId, practitionerName: doctorName });
      setPractitioners([]);
    }
  }, [resetKey, initialData, lastEndTime, selectedDoctor, selectedTime]);

  const fetchPractitioners = async (serviceCode, preselect) => {
    const user = getUser();
    try {
      const data = await authGet(`${API_BASE_URL}/api/Master/GetPractionerByServiceCode/${encodeURIComponent(serviceCode)}/${user.centerCode||""}`);
      setPractitioners(Array.isArray(data) ? data : []);
      if (preselect) setForm(p => ({ ...p, practitioner: preselect }));
    } catch { setPractitioners([]); }
  };

  const handleServiceChange = (e) => {
    const val = e.target.value;
    setForm(p => ({ ...p, servicename: val }));
    clearTimeout(debounce.current);
    if (val.length < 2) { setSvcSugg([]); return; }
    debounce.current = setTimeout(async () => {
      const user = getUser();
      try {
        const data = await authGet(`${API_BASE_URL}/api/Master/GetServiceByName/${encodeURIComponent(val)}/${user.centerCode||""}`);
        setSvcSugg(Array.isArray(data) ? data : []);
      } catch { setSvcSugg([]); }
    }, 300);
  };

  const handleServiceSelect = async (svc) => {
    // serviceTime field from GetServiceByName (SERVICEINTIME column)
    // serviceTime is the field returned by GetServiceByName (= SERVICEINTIME in DB)
    const rawDur = svc.serviceTime ?? svc.serviceInTime ?? svc.servicetime ??
                   svc.duration ?? svc.serviceDuration ?? svc.inTime ?? 5;
    // Parse to integer minutes — strip non-numeric chars if string like "60 mins"
    const parsedMins = parseInt(String(rawDur).replace(/\D/g, ""), 10) || 5;
    // Round UP to nearest 5 (durOpts only contains multiples of 5)
    const dur = String(Math.ceil(parsedMins / 5) * 5);
    setForm(p => ({
      ...p,
      servicename:  svc.serviceName  || "",
      servicecode:  svc.serviceCode  || "",
      practitioner: "",
      duration:     dur,
      endTime:      calcEnd(p.startTime, dur),
    }));
    setSvcSugg([]);
    if (svc.serviceCode) await fetchPractitioners(svc.serviceCode);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "room") {
      const rm = rooms.find(r => (r.RoomNo??r.roomNo) === value || String(r.id) === String(value));
      setForm(p => ({ ...p, room: value, equipment: rm?.Equipment ?? rm?.equipment ?? "N/A", roomDisplay: rm?.RoomNo ?? rm?.roomNo ?? value }));
    } else { setForm(p => ({ ...p, [id]: value })); }
  };

  const handleStartChange = (e) => { const val = e.target.value; setForm(p => ({ ...p, startTime: val, endTime: calcEnd(val, p.duration) })); };
  const handleDurChange = (e) => { const val = e.target.value; setForm(p => ({ ...p, duration: val, endTime: calcEnd(p.startTime, val) })); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.servicename) { setErrors({ servicename: "Service is required." }); return; }
    if (!form.practitioner) { setErrors({ practitioner: "Please select a practitioner." }); return; }
    setErrors({});
    const pract = practitioners.find(p => String(p.id) === String(form.practitioner));
    onAddService?.({
      servicename: form.servicename, servicecode: form.servicecode,
      preference: form.preference.charAt(0).toUpperCase() + form.preference.slice(1),
      practitioner: form.practitioner, practitionerName: pract?.name || form.practitionerName || "",
      amount: 100, start: form.startTime, end: form.endTime,
      duration: `${form.duration} mins`, note: form.note, equipment: form.equipment, room: form.room,
    });
  };

  const durOpts = (() => { const o=[]; for(let i=5;i<=720;i+=5) o.push(i); return o; })();

  return (
    <>
      <div className="srvwrp">
        <div className="frmlgnd">Requesting Services</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ position:"relative" }}>
            <input type="text" id="servicename" placeholder=" " value={form.servicename} onChange={handleServiceChange} style={{ paddingRight: 28 }} />
            <label htmlFor="servicename" className="frmlbl">Service</label>
            {/* Clearing the service must also drop the resolved code, the loaded
                practitioner and any open suggestions — otherwise a stale
                servicecode/practitioner stays attached to an empty field. */}
            <ClearButton
              targetId="servicename"
              show={!!form.servicename}
              onClear={() => {
                setForm(p => ({ ...p, servicename:"", servicecode:"", practitioner:"", practitionerName:"" }));
                setSvcSugg([]);
                setPractitioners([]);
                document.getElementById("servicename")?.focus();
              }}
            />
            {errors.servicename && <div className="error">{errors.servicename}</div>}
            {svcSugg.length > 0 && (
              <ul className="suggestions">{svcSugg.map((s,i) => (
                <li key={i} onClick={() => handleServiceSelect(s)}
                  style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <span>{s.serviceName}</span>
                  {s.serviceCode && <span style={{ fontSize:11, color:"#94a3b8" }}>Code: {s.serviceCode}</span>}
                </li>
              ))}</ul>
            )}
          </div>
          <div className="form-group radgrp">
            <label className="frmlbl">Preference</label>
            <div className="rdopts">
              {["any","male","female"].map(v => (
                <div className="rdbox" key={v}>
                  <input type="radio" id={`pref_${v}`} name="preference" value={v}
                    checked={form.preference === v} onChange={e => setForm(p => ({ ...p, preference: e.target.value }))} />
                  <label htmlFor={`pref_${v}`}>{v.charAt(0).toUpperCase()+v.slice(1)}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="form-group slctgrp">
            <label>Practitioner:</label>
            <select id="practitioner" className="pract" value={form.practitioner} onChange={handleChange}>
              <option value="">Select Practitioner</option>
              {practitioners.map((p,i) => <option key={i} value={p.id}>{p.name}</option>)}
            </select>
            {errors.practitioner && <div className="error">{errors.practitioner}</div>}
          </div>
          <div className="form-group slctgrp">
            <label>Start Time:</label>
            <select id="startTime" value={form.startTime} onChange={handleStartChange}>
              {TIME_SLOTS.map((t,i) => <option key={i} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group slctgrp">
            <label>Duration:</label>
            <select id="duration" value={form.duration} onChange={handleDurChange}>
              {durOpts.map(m => <option key={m} value={m}>{m} mins</option>)}
            </select>
          </div>
          <div className="form-group">
            <input type="text" id="endtm" placeholder=" " value={form.endTime} readOnly />
            <label htmlFor="endtm" className="frmlbl">End Time</label>
          </div>
          <div className="lstfrmsect">
            <div className="form-group slctgrp rmslct">
              <label>Room:</label>
              <select id="room" value={form.room} onChange={handleChange}>
                <option value="">Select Room</option>
                {rooms.map((r,i) => <option key={i} value={r.id}>{r.roomNo??r.RoomNo}</option>)}
              </select>
            </div>
            <span className="notebtn tooltip" data-tooltip="Add Note" onClick={() => setShowNote(true)}>
              <img src={`${import.meta.env.BASE_URL}images/notes.svg`} alt="Note" />
            </span>
            <button className="lnkbtn" type="submit">
              <img src={`${import.meta.env.BASE_URL}images/addservice.svg`} alt="Add" /> Add Service
            </button>
          </div>
        </form>
      </div>
      {showNote && (
        <AddNoteModal onClose={() => setShowNote(false)}
          onSubmit={note => { setForm(p => ({ ...p, note })); setShowNote(false); }} />
      )}
    </>
  );
};

const ServiceList = ({ data = [], onDelete }) => (
  <div className="service-list srvlist">
    <h4 className="frmlgnd">Booked Services</h4>
    {data.length === 0 ? <div className="noadded">No services added.</div> : (
      <div className="srctblwrp">
        <table className="srvctbl">
          <thead><tr>
            <th width="300">Service</th><th>Practitioner</th><th>Equipment</th>
            <th width="90">Start</th><th width="90">End</th><th>Duration</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {data.map((entry, idx) => (
              <tr key={idx}>
                <td>{entry.service.servicename}</td>
                <td>{entry.service.practitionerName || entry.service.practitioner || "—"}</td>
                <td>{entry.service.equipment || "N/A"}</td>
                <td>{entry.service.start}</td>
                <td>{entry.service.end}</td>
                <td>{entry.service.duration}</td>
                <td>
                  <button className="tblbtn delete" onClick={() => onDelete(idx)}>
                    <img src={`${import.meta.env.BASE_URL}images/deletewt.svg`} alt="Delete" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// ── Appointment Drawer ─────────────────────────────────────────────────────────
const AppointmentDrawer = ({
  isOpen, onClose, timeSlot, doctor, customer,
  editAppointment, selectedDate, onRefreshAppointments,
  allowPastDates = false,
  defaultStatus = undefined,
  onBooked,   // LTR: fired on a successful new booking → { referenceId, custID, appointmentId }
  lockCustomerIdentity = false,  // LTR: arrived from a lead conversion — identity is fixed
}) => {
  const drawerRef    = useRef(null);
  const [height,     setHeight]     = useState(433);
  const [rescheduleDate, setRescheduleDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [isResizing, setIsResizing] = useState(false);
  const [resetKey,   setResetKey]   = useState(Date.now());

  const [customerData, setCustomerData] = useState(null);
  const [serviceList,  setServiceList]  = useState([]);
  const [lastEndTime,  setLastEndTime]  = useState("10:00 AM");
  const [editingIdx,   setEditingIdx]   = useState(null);
  const [editingSvc,   setEditingSvc]   = useState(null);
  const [toast,        setToast]        = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [bookingRefId, setBookingRefId] = useState(() => crypto.randomUUID());

  // ── Booking notes popup ──────────────────────────────────────────────────
  const { NotePopup: BookingNotePopup, checkNotes: checkBookingNotes } = useCustomerNotes();

  useEffect(() => {
    if (drawerRef.current) {
      if (isOpen) { drawerRef.current.classList.add("expand"); setResetKey(Date.now()); }
      else drawerRef.current.classList.remove("expand");
    }
  }, [isOpen]);

  useEffect(() => {
    const onMove = (e) => { if (!isResizing) return; const n = window.innerHeight - e.clientY; setHeight(Math.min(Math.max(n,300), window.innerHeight-50)); };
    const onUp   = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isResizing]);

  useEffect(() => {
    if (!isOpen) return;
    setServiceList([]); setEditingIdx(null); setEditingSvc(null); setLastEndTime("10:00 AM");
    setBookingRefId(crypto.randomUUID());
    const data = editAppointment || customer;
    if (data) {
      setCustomerData({
        name:      data.fullName || `${data.firstName||""} ${data.lastName||""}`.trim(),
        number:    data.number   || data.mobile || "",
        email:     data.email    || "",
        gender:    data.gender   || "",
        custid:    data.custid   || data.custId || "",
        firstname: data.firstName || (data.fullName||"").split(" ")[0] || "",
        lastname:  data.lastName  || (data.fullName||"").split(" ").slice(1).join(" ") || "",
      });
      if (editAppointment?.serviceName) {
        const svc = {
          servicename: editAppointment.serviceName, servicecode: editAppointment.serviceCode,
          practitioner: editAppointment.doctorId||"", startTime: editAppointment.startTime||"10:00 AM",
          duration: (editAppointment.duration||"5").replace(" mins",""),
          endTime: editAppointment.endTime||"", room: editAppointment.room||"",
          note: editAppointment.notes||"", preference:"any", equipment:"N/A",
        };
        setEditingSvc(svc);
      }
    } else { setCustomerData(null); }
  }, [isOpen, editAppointment, customer]);

  const handleAddService = useCallback((svcData) => {
    if (!customerData) { setToast({ message:"Customer data missing.", type:"error" }); return; }
    const entry = { customer: { ...customerData }, service: { ...svcData } };
    if (editingIdx !== null) {
      setServiceList(p => { const u=[...p]; u[editingIdx]=entry; return u; });
      setEditingIdx(null); setEditingSvc(null);
    } else {
      setServiceList(p => [...p, entry]);
    }
    setLastEndTime(svcData.end);
    setResetKey(Date.now());
  }, [customerData, editingIdx]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!customerData || !serviceList.length) { setToast({ message:"Missing customer or service data.", type:"error" }); return; }


    const bookingDate = editAppointment?.isReschedule ? rescheduleDate : selectedDate;
    const today = new Date().toISOString().split("T")[0];
    const isBookingPast = bookingDate < today;

    setSubmitting(true);

    const user = getUser();

    // ── Reschedule: UPDATE the existing appointment rows — no new entry ─────
    if (editAppointment?.isReschedule && editAppointment?.appointmentId) {
      try {
        const lines = serviceList.map((e, i) => ({
          lineNo:    e.service.lineNo || String(i + 1),
          startTime: e.service.start,
          endTime:   e.service.end,
          duration:  e.service.duration,
          practioner:e.service.practitioner,
          room:      e.service.room || "",
        }));
        // Use SaveAppointment route (avoids separate rate-limited endpoint)
        // existingAppointmentId triggers UPDATE path in the repo
        const result = await authPost(
          `${API_BASE_URL}/api/Appointment/SaveAppointment`,
          {
            existingAppointmentId: editAppointment.appointmentId,
            appointmentDate:       bookingDate,
            centerCode:            user.centerCode || "",
            custID:                customerData?.custid || "",
            userId:                user.userId || user.employeeCode || "",
            saveAppointment:       lines.map(l => ({
              startTime:   l.startTime,
              endTime:     l.endTime,
              duration:    l.duration,
              lineNo:      l.lineNo,
              practioner:  l.practioner,
              room:        l.room || "",
              serviceCode: "",
              preference:  "",
              notes:       "",
              amount:      "0",
            })),
          }
        );
        if (result?.success !== false) {
          setToast({ message: "Appointment rescheduled!", type: "success" });
          onRefreshAppointments?.();
          setTimeout(() => onClose?.(), 1200);
        } else {
          setToast({ message: result?.message || "Reschedule failed.", type: "error" });
        }
      } catch (e) {
        setToast({ message: e.message || "Reschedule failed.", type: "error" });
      } finally {
        setSubmitting(false);
      }
      return; // don't fall through to SaveAppointment
    }

    const freshRefId = crypto.randomUUID();
    setBookingRefId(freshRefId);
    // Auto-set status for past bookings
    const bookingStatus = isBookingPast
      ? (defaultStatus || "Completed")
      : (defaultStatus || "Booked");

    /* The customer must exist in the master before the row is written. If the
       receptionist typed a walk-in who was never registered, create them here —
       silently, no extra click. Same mobile as an existing customer links to
       that record instead of duplicating it. (Reschedule rows are already
       linked, so this only runs on the new-booking path.) */
    let bookingCustId = customerData.custid || "";
    try {
      bookingCustId = await ensureCustomerId(customerData, user.centerCode || "");
      if (bookingCustId !== customerData.custid) {
        setCustomerData(p => ({ ...(p || {}), custid: bookingCustId }));
      }
    } catch (e) {
      setToast({ message: e?.message || "Could not save the customer.", type:"error" });
      setSubmitting(false);
      return;
    }

    const payload = {
      custID:          bookingCustId,
      appointmentDate: bookingDate,
      userId:          user.userId || user.employeeCode || "",
      centerCode:      user.centerCode || "",
      referenceId:     freshRefId,
      status:          bookingStatus,
      saveAppointment: serviceList.map((e, i) => ({
        startTime:   e.service.start,
        endTime:     e.service.end,
        duration:    e.service.duration,
        lineNo:      String(i+1),
        serviceCode: e.service.servicecode,
        practioner:  e.service.practitioner,
        preference:  e.service.preference,
        notes:       e.service.note,
        amount:      String(e.service.amount||"100"),
        room:        e.service.room,
      })),
    };
    try {
      const result = await authPost(`${API_BASE_URL}/api/Appointment/SaveAppointment`, payload);
      if (result?.success !== false) {
        setToast({ message:"Appointment saved!", type:"success" });

        // ── LTR: report the booking back to the caller (lead→appointment flow) ─
        //  VERIFY the appointment-id field on SaveAppointment's response; the
        // conversion link falls back to the client referenceId if none is present.
        onBooked?.({
          referenceId:   freshRefId,
          custID:        bookingCustId,
          appointmentId: result?.appointmentId ?? result?.appointmentID ?? result?.apptId ?? result?.id ?? freshRefId,
        });

        // ── Fire booking notes popup after successful save ─────────────────
        if (bookingCustId) {
          await checkBookingNotes(bookingCustId, "booking");
        }

        setServiceList([]); setCustomerData(null);
        setBookingRefId(crypto.randomUUID());
        onRefreshAppointments?.();
        setTimeout(() => onClose?.(), 1200);
      } else {
        const msg = result.message || "Submission failed.";
        if (msg.toLowerCase().includes("duplicate")) {
          setToast({ message: "Previous attempt already saved. Please check the grid or try again.", type:"warning" });
          onRefreshAppointments?.();
        } else {
          setToast({ message: msg, type:"error" });
        }
      }
    } catch (e) { setToast({ message: e.message, type:"error" }); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      {isOpen && (
        <div style={{ position:"fixed", bottom:`${height}px`, width:"100%", height:"10px", cursor:"ns-resize", zIndex:1000 }}
          onMouseDown={() => setIsResizing(true)} />
      )}
      <div ref={drawerRef} className={`appointdrwr ${isOpen?"expand":""}`} style={{ height:`${height}px` }}>
        <div className="apptfrm flxwrp">
          <div className="clpse" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#000">
              <path d="M480-237 240-477l51-51 189 189 189-189 51 51-240 240Zm0-240L240-717l51-51 189 189 189-189 51 51-240 240Z"/>
            </svg>
          </div>
          {/* Past date booking banner */}
          {(() => {
            const bDate = editAppointment?.isReschedule ? rescheduleDate : selectedDate;
            const tod   = new Date().toISOString().split("T")[0];
            return bDate && bDate < tod ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 20px",
                background:"#fef9c3", borderBottom:"1px solid #fde68a" }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#92400e" }}>
                   Past date — appointment will be saved as <strong>Completed</strong>
                </span>
              </div>
            ) : null;
          })()}

          {/* Reschedule banner */}
          {editAppointment?.isReschedule && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 20px",
              background:"#fffbeb", borderBottom:"1px solid #fde68a" }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#92400e" }}>
                ↺ Rescheduling appointment — select new date and time below
              </span>
              <input type="date" value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                style={{ padding:"5px 10px", border:"1px solid #fde68a", borderRadius:6,
                  fontSize:13, fontFamily:"Lato,sans-serif", background:"#fff", cursor:"pointer" }}
              />
            </div>
          )}

          <div className="apptfrmflx">
            <CustomerForm key={`cf-${resetKey}`} prefill={customerData} onChange={setCustomerData} lockIdentity={lockCustomerIdentity} />
            <ServiceRequestForm key={`sf-${resetKey}`}
              onAddService={handleAddService} resetKey={resetKey}
              initialData={editingSvc} lastEndTime={lastEndTime}
              selectedDoctor={doctor} selectedTime={timeSlot} />
            <ServiceList data={serviceList} onDelete={i => setServiceList(p => p.filter((_,idx) => idx !== i))} />
          </div>

          <div className="drwr-actions">
            <button className="submitbtn editbtn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : "Save Appointment"}
            </button>
            <button
              className="restbtn"
              disabled={lockCustomerIdentity}
              title={lockCustomerIdentity ? "Not available for a converted lead — finish or leave the page." : undefined}
              style={lockCustomerIdentity ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={() => { if (lockCustomerIdentity) return; onClose?.(); }}>Cancel</button>
            <button
              className="restbtn"
              disabled={lockCustomerIdentity}
              title={lockCustomerIdentity ? "Not available for a converted lead — the customer is fixed." : undefined}
              style={lockCustomerIdentity ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={() => {
                if (lockCustomerIdentity) return;
                setServiceList([]); setCustomerData(null); setResetKey(Date.now());
              }}>Reset</button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Customer Notes popup — fires after appointment is booked */}
      {BookingNotePopup}
    </>
  );
};

export default AppointmentDrawer;