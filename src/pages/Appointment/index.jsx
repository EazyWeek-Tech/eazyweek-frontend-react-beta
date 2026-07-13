import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, Routes, Route } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import AppointmentDrawer from "./AppointmentDrawer";
import InvoicePage from "../Invoice";
import { useEMRForms } from "./useEMRForms";
import FormFillModal from "./FormFillModal";
import { useCustomerNotes } from "../Customer/CustomerDetails/CustomerNotePopup";
import { CustomerFormPanel } from "../Masters/CustomerMaster";
import { usePermissions } from "../Settings/usePermissions";
import './index.css'

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authPost = async (url, payload) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((json && json.message) || `POST ${url} failed`);
    err.status = res.status;
    err.serverMessage = (json && json.message) || "";
    throw err;
  }
  return json.data ?? json;
};
const authGet = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((json && json.message) || `GET ${url} failed`);
    err.status = res.status;
    err.serverMessage = (json && json.message) || "";
    throw err;
  }
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

// ── Appointment Details Sidebar ────────────────────────────────────────────────
// Module-level cache — survives re-renders, cleared on page reload
const _formStatusCache = new Map();
const fetchFormStatus = (appointmentId, serviceCode) => {
  const key = `${appointmentId}|${serviceCode}`;
  if (_formStatusCache.has(key)) return Promise.resolve(_formStatusCache.get(key));
  const tok = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  return fetch(
    `${API_BASE_URL}/api/EMR/Appointment/${encodeURIComponent(appointmentId)}/FormStatus?serviceCode=${encodeURIComponent(serviceCode)}`,
    { headers: { Authorization: `Bearer ${tok}` } }
  ).then(r => r.ok ? r.json() : null)
   .then(d => {
     const data = d?.data ?? d ?? {};
     _formStatusCache.set(key, data);
     return data;
   }).catch(() => ({}));
};

const AppointmentDetailsSide = ({ appointment, onClose, onEdit, onReschedule, onRefresh, onStatusUpdated }) => {
  const navigate = useNavigate();
  const [appt,   setAppt]   = useState(appointment || null);
  const [status, setStatus] = useState(appointment?.status || "Booked");
  const [toast,  setToast]  = useState(null);
  const { has, guard, notifyDenied } = usePermissions();
  const [loading,setLoading]= useState(false);

  // ── EMR Forms hook ────────────────────────────────────────────────────────
  const { checkAndShowForms, showModal, modalProps } = useEMRForms();

  // ── Form status for sidebar ───────────────────────────────────────────────
  const [sidebarForms,       setSidebarForms]       = useState([]);
  const [sidebarFormStatus,  setSidebarFormStatus]  = useState(null);
  const [sidebarFormsLoading,setSidebarFormsLoading]= useState(false);
  // Member flag for this appointment's customer (FRD 5.3 rule 12)
  const [memberFlag, setMemberFlag] = useState(null);
  useEffect(() => {
    const cid = appointment?.custId || appt?.custId || "";
    if (!cid) { setMemberFlag(null); return; }
    fetch(`${API_BASE_URL}/api/Membership/CustomerStatus/${encodeURIComponent(cid)}`, { headers: { Authorization: `Bearer ${TOKEN()}` } })
      .then(r => r.json()).then(j => { const d = j.data || j; setMemberFlag(d && d.isMember ? d : null); })
      .catch(() => setMemberFlag(null));
  }, [appointment?.custId]);

  // Active forms mapped to this service (Consent/Treatment)
  const [activeForms,        setActiveForms]        = useState([]);
  const [activeFormsLoaded,  setActiveFormsLoaded]  = useState(false);
  // Medical history form — shown if first visit or not filled
  const [showMedHistory,     setShowMedHistory]     = useState(false);
  const [medHistFilled,      setMedHistFilled]      = useState(false);

  // ── Direct form open modal ────────────────────────────────────────────────
  const [directModal,    setDirectModal]    = useState(false);
  const [directFormCode, setDirectFormCode] = useState(null);
  const [directMacro,    setDirectMacro]    = useState({});

  const openFormDirect = (formCode, macroCtx = {}) => {
    setDirectFormCode(formCode);
    setDirectMacro(macroCtx);
    setDirectModal(true);
  };

  const MED_HIST_CODE = "MED-HIST-001";

  useEffect(() => {
    const svcCode   = appointment?.serviceCode || appointment?.allLines?.[0]?.serviceCode || "";
    const apptIdVal = appointment?.appointmentId;
    const custId    = appointment?.custId || "";
    if (!apptIdVal || !svcCode) return;
    setSidebarFormsLoading(true);

    // 1. Form fill status for service forms + customer forms combined
    const tok = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    Promise.all([
      fetchFormStatus(apptIdVal, svcCode),
      custId ? fetch(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`, {
        headers: { Authorization: `Bearer ${tok}` }
      }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
    ]).then(([statusData, customerData]) => {
      const serviceForms = (statusData?.forms || []);

      // Merge customer forms (Medical History etc.) into the status list
      const inner = customerData?.data ?? customerData;
      const customerForms = [
        ...(Array.isArray(inner?.customerForms) ? inner.customerForms : []),
        ...(Array.isArray(inner)                ? inner               : []),
      ];

      // Build merged list — customer forms shown as filled if they exist
      const customerFormRows = customerForms.map(cf => ({
        formCode:   cf.formCode,
        formName:   cf.formName || cf.formCode,
        whenToFill: "Customer",
        isMandatory: true,
        status:     "Completed",   // if it's in the list, it was filled
      }));

      // Combine: service forms first, then customer forms not already in list
      const serviceFormCodes = new Set(serviceForms.map(f => f.formCode));
      const merged = [
        ...serviceForms,
        ...customerFormRows.filter(cf => !serviceFormCodes.has(cf.formCode)),
      ];

      setSidebarForms(merged);

      // Recalculate overall status including customer forms
      const completed = merged.filter(f => f.status === "Completed").length;
      const overall = merged.length === 0         ? null
                    : completed === merged.length  ? "All Complete"
                    : completed > 0                ? "Partially Filled"
                    :                                "Not Started";
      setSidebarFormStatus(overall);
    }).finally(() => setSidebarFormsLoading(false));

    // 2. Forms mapped to this specific serviceCode
    fetch(`${API_BASE_URL}/api/EMR/Service/${encodeURIComponent(svcCode)}/Forms`, {
      headers: { Authorization: `Bearer ${tok}` }
    }).then(r => r.ok ? r.json() : null)
      .then(d => {
        const forms = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setActiveForms(forms);
      })
      .catch(() => {})
      .finally(() => setActiveFormsLoaded(true));

    // 3. Medical history — show if customer has no prior submissions
    if (custId) {
      fetch(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || sessionStorage.getItem("token") || ""}` }
      }).then(r => r.ok ? r.json() : null)
        .then(d => {
          // Response: { data: { submissions: [], customerForms: [...] } }
          const inner = d?.data ?? d;
          const submissions = [
            ...(Array.isArray(inner?.customerForms) ? inner.customerForms : []),
            ...(Array.isArray(inner?.submissions)   ? inner.submissions   : []),
            ...(Array.isArray(inner)                ? inner               : []),
          ];
          const medHistSub  = submissions.find(s => s.formCode === MED_HIST_CODE);
          setMedHistFilled(!!medHistSub);
          setShowMedHistory(true); // always show button; indicator shows filled/pending
          // Auto-open Medical History for first-time customers (no prior submissions at all)
          if (!medHistSub && submissions.length === 0) {
            openFormDirect(MED_HIST_CODE, {
              customerName: appointment?.fullName || appt?.fullName || "",
            });
          }
        }).catch(() => setShowMedHistory(true));
    } else {
      setShowMedHistory(true);
    }
  }, [appointment?.appointmentId, appointment?.serviceCode, appointment?.custId]);

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

  // ── Date-aware status logic ──────────────────────────────────────────────
  const today     = new Date().toISOString().split("T")[0];
  const isPast    = apptDateISO < today;
  const isFuture  = apptDateISO > today;
  const isToday   = apptDateISO === today;

  // Future appointments: only Booked, Confirmed, Cancelled allowed
  // Past/Today appointments: full workflow + can mark Completed directly
  // Already restricted (Checked In / Active / Completed): no Cancel/No Show
  const RESTRICTED = ["Checked In", "Active", "Completed"];
  const isRestricted = RESTRICTED.includes(status);

  const VISIBLE = (() => {
    if (isRestricted) {
      // Once in progress/done — allow progression but not cancel/no-show
      return ["Checked In", "Active", "Completed"];
    }
    if (isFuture) {
      // Future — only pre-appointment statuses
      return ["Booked", "Confirmed", "Cancelled"];
    }
    // Past or today — full range including Completed (for walk-ins / past bookings)
    return ["Booked", "Confirmed", "Checked In", "Active", "Completed", "Cancelled", "No Show"];
  })();

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
    const prevStatus = appt?.status || appointment?.status || "";
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

        // ── On Completed: mark all EMR forms as complete + generate courtesy call
        if (newStatus === "Completed") {
          const serviceCode = appt?.serviceCode || appt?.allLines?.[0]?.serviceCode || "";
          const custId      = appt?.custId || appointment?.custId || "";

          // Mark any unfilled forms as auto-completed so badge shows "All Complete"
          if (apptId && serviceCode) {
            authPost(`${API_BASE_URL}/api/EMR/Appointment/MarkFormsComplete`, {
              appointmentId: apptId,
              serviceCode,
              custId,
              centerCode,
            }).then(r => console.log("[EMR] MarkFormsComplete:", r))
              .catch(e => console.warn("[EMR] MarkFormsComplete failed:", e.message));
          }

          // Generate courtesy call — only when the appointment is actually
          // transitioning INTO Completed (guards against a second trigger, e.g.
          // at invoice time, re-firing for an already-completed appointment).
          const groupId = appt?.appointmentId || appointment?.appointmentId || apptId;
          if (groupId && prevStatus !== "Completed") {
            authPost(`${API_BASE_URL}/api/Courtesy/GenerateCourtesyCalls`, {
              appointmentGroupId: groupId,
            }).then(r => console.log("[CourtesyCall] result:", r))
              .catch(e => console.warn("[CourtesyCall] generation failed:", e.message));
          }
        }
      } else setToast({ message: result?.message || "Update failed.", type: "error" });
    } catch (e) {
      if (e?.status === 403) notifyDenied(e.serverMessage || e.message || "Access denied. You do not have permission for this action.");
      else setToast({ message: "Error updating appointment.", type: "error" });
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    // Permission gate (FRD 4.2): cancel/no-show need Delete, other changes need Edit.
    const _needed = (newStatus === "Cancelled" || newStatus === "No Show") ? "APPT.DELETE" : "APPT.EDIT";
    if (!has(_needed)) { notifyDenied("Your role does not have this right. Contact Admin/Product Team."); return; }
    if (isRestricted && (newStatus === "Cancelled" || newStatus === "No Show")) {
      setToast({ message: "Cannot cancel or no-show an appointment that is already in progress or completed.", type: "error" });
      return;
    }
    if (isFuture && !["Booked", "Confirmed", "Cancelled"].includes(newStatus)) {
      setToast({ message: "Future appointments can only be set to Booked, Confirmed, or Cancelled.", type: "error" });
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
      if (!canProceed) {
        // Form was shown (sidebar still open since we didn't close it) — user cancelled
        return;
      }
      // Forms complete — close sidebar so status change is visible on calendar
      onClose?.();
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
      .catch((e) => {
        if (e?.status === 403) notifyDenied(e.serverMessage || e.message || "Access denied. You do not have permission to delete this appointment.");
        else setToast({ message: "Delete failed.", type: "error" });
      });
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
              {memberFlag && (
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:6, padding:"3px 10px", borderRadius:999, background:"linear-gradient(135deg,#6d4c9e,#8b5cf6)", color:"#fff", fontSize:11, fontWeight:700, width:"fit-content", whiteSpace:"nowrap" }}
                  title={memberFlag.programName || "Active member"}>
                  ★ Member{memberFlag.programName ? ` — ${memberFlag.programName}` : ""}
                </span>
              )}
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
             
              {/* Reschedule — only for non-completed/non-active statuses */}
              {!["Completed","Active","Checked In"].includes(status) && onReschedule && (
                <button className="edit " data-tooltip="Reschedule"
                  onClick={() => guard("APPT.EDIT", () => { onReschedule?.(appt || appointment); onClose?.(); })}
                  style={{ marginLeft:2 }}>
                    Reschedule
                </button>
              )}
              <button className="delete " data-tooltip="Delete" onClick={() => guard("APPT.DELETE", handleDelete)}>
                Delete
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

          {/* ── Medical History ── always shown; indicator if filled ── */}
          {showMedHistory && (() => {
            const a = appt || appointment || {};
            const openMedHist = () => {
              openFormDirect(MED_HIST_CODE, {
                customerName:     a.fullName         || "",
                serviceName:      a.serviceName      || "",
                centreName:       user?.centerName   || "",
                practitionerName: a.therapistName    || "",
                appointmentDate:  a.startDate        || new Date().toISOString(),
                MobileNumber:     a.number           || "",
                Gender:           a.gender           || "",
              });
            };
            return (
              <button onClick={openMedHist} className="cstlnk" style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <img src={`${import.meta.env.BASE_URL}images/medical.svg`} alt="" /> Medical History
                </span>
                {medHistFilled
                  ? <span style={{ fontSize:10, fontWeight:700, background:"#dcfce7", color:"#166534", borderRadius:99, padding:"1px 8px", border:"1px solid #b3d9cc" }}>✅ Filled</span>
                  : <span style={{ fontSize:10, fontWeight:700, background:"#fef9c3", color:"#92400e", borderRadius:99, padding:"1px 8px", border:"1px solid #fde68a" }}>⏳ Pending</span>
                }
              </button>
            );
          })()}

          {/* ── Consent / Treatment forms — shown only if mapped to this service ── */}
          {(activeForms.length > 0 || !activeFormsLoaded) && (
          <div className="apptcdet">
            {!activeFormsLoaded ? (
              <div style={{ fontSize:11, color:"#94a3b8", padding:"4px 0" }}>Loading forms…</div>
            ) : (
              activeForms.map(form => {
                const filled = sidebarForms.find(f => f.formCode === form.formCode);
                const isFilled = filled?.status === "Completed";
                const openForm = () => {
                  const a = appt || appointment || {};
                  openFormDirect(form.formCode, {
                    customerName:     a.fullName         || "",
                    serviceName:      a.serviceName      || "",
                    centreName:       user?.centerName   || "",
                    practitionerName: a.therapistName    || "",
                    appointmentDate:  a.startDate        || new Date().toISOString(),
                  });
                };
                return (
                  <button key={form.formCode} onClick={openForm} className="cstlnk"
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:4 }}>
                    <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <img src={`${import.meta.env.BASE_URL}images/consent.svg`} alt="" />
                      <span style={{ fontSize:11 }}>{form.formName}</span>
                    </span>
                    {isFilled
                      ? <span style={{ fontSize:10, fontWeight:700, background:"#dcfce7", color:"#166534", borderRadius:99, padding:"1px 8px", border:"1px solid #b3d9cc", whiteSpace:"nowrap" }}>✅ Done</span>
                      : <span style={{ fontSize:10, fontWeight:700, background:"#f1f5f9", color:"#6e7b8f", borderRadius:99, padding:"1px 8px", border:"1px solid #e5ebf3", whiteSpace:"nowrap" }}>Open</span>
                    }
                  </button>
                );
              })
            )}
          </div>
          )}

          {/* ── EMR Form Status ── */}
          <div style={{ margin:"10px 0 6px", padding:"10px 12px",
            background:"#f8fafc", borderRadius:8, border:"1px solid #e7ecf4" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#6e7b8f",
              textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8,
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>📋 Forms</span>
              {!sidebarFormsLoading && sidebarFormStatus && (() => {
                const s = STATUS_STYLE[sidebarFormStatus] || STATUS_STYLE["Not Started"];
                return (
                  <span style={{ background:s.bg, color:s.color, borderRadius:99,
                    padding:"2px 9px", fontSize:10, fontWeight:700 }}>
                    {s.icon} {sidebarFormStatus}
                  </span>
                );
              })()}
            </div>
            {sidebarFormsLoading ? (
              <div style={{ fontSize:12, color:"#94a3b8" }}>Loading…</div>
            ) : sidebarForms.length === 0 ? (
              <div style={{ fontSize:12, color:"#cc6b5c", fontWeight:600,
                display:"flex", alignItems:"center", gap:6,
                padding:"6px 10px", background:"#fff5f5",
                border:"1px solid #f5c4b0", borderRadius:7 }}>
                ⚠ No forms filled for this appointment
              </div>
            ) : (
              sidebarForms.map(f => (
                <div key={f.formCode} style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", padding:"5px 0",
                  borderBottom:"0.5px solid #f1f5f9", fontSize:12 }}>
                  <span style={{ color:"#334b71", fontWeight:500 }}>{f.formName}</span>
                  <span style={{
                    fontSize:10, fontWeight:700,
                    color:      f.status === "Completed" ? "#166534" : "#92400e",
                    background: f.status === "Completed" ? "#dcfce7" : "#fef9c3",
                    border:     `1px solid ${f.status === "Completed" ? "#b3d9cc" : "#fde68a"}`,
                    padding:"1px 7px", borderRadius:99
                  }}>
                    {f.status === "Completed" ? "✅ Done" : "⏳ Pending"}
                  </span>
                </div>
              ))
            )}
          </div>
          {(appt?.allLines || [appt]).every(l => Number(l?.isPaymentMade) === 1) ? (
            <div className="pndpay" style={{ opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }}>
              <span className="stimg">
                <img src={`${import.meta.env.BASE_URL}images/paymentpend.svg`} alt="" /> Payment Done
              </span>
            </div>
          ) : (() => {
              const a = appt||appointment||{};
              // Block payment if mandatory forms not complete
              const mandatoryPending = sidebarForms.some(f =>
                f.isMandatory && f.status !== "Completed"
              );
              if (mandatoryPending) {
                return (
                  <div title="Please fill all mandatory forms before making payment"
                    className="pndpay" style={{ opacity:0.45, cursor:"not-allowed", pointerEvents:"none" }}>
                    <span className="stimg">
                      <img src={`${import.meta.env.BASE_URL}images/paymentpend.svg`} alt="" /> Make Payment
                    </span>
                    <div style={{ fontSize:10, color:"#b91c1c", marginTop:2, textAlign:"center" }}>
                      Forms pending
                    </div>
                  </div>
                );
              }
              return (
                <button onClick={() => {
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
              );
            })()}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showModal && modalProps && <FormFillModal {...modalProps}
        onComplete={() => {
          // Refresh sidebar form status after consent/treatment form submitted
          const svcCode = appt?.serviceCode || appointment?.serviceCode || "";
          const aId     = appt?.appointmentId || appointment?.appointmentId || "";
          const custId  = appt?.custId || appointment?.custId || "";
          const key     = `${aId}|${svcCode}`;
          _formStatusCache.delete(key);
          const tok = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
          Promise.all([
            fetchFormStatus(aId, svcCode),
            custId ? fetch(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`, {
              headers: { Authorization: `Bearer ${tok}` }
            }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
          ]).then(([statusData, customerData]) => {
            const serviceForms = statusData?.forms || [];
            const inner = customerData?.data ?? customerData;
            const customerForms = [
              ...(Array.isArray(inner?.customerForms) ? inner.customerForms : []),
              ...(Array.isArray(inner)                ? inner               : []),
            ];
            const customerFormRows = customerForms.map(cf => ({
              formCode: cf.formCode, formName: cf.formName || cf.formCode,
              whenToFill: "Customer", isMandatory: true, status: "Completed",
            }));
            const serviceFormCodes = new Set(serviceForms.map(f => f.formCode));
            const merged = [
              ...serviceForms,
              ...customerFormRows.filter(cf => !serviceFormCodes.has(cf.formCode)),
            ];
            setSidebarForms(merged);
            const completed = merged.filter(f => f.status === "Completed").length;
            setSidebarFormStatus(
              merged.length === 0        ? null
              : completed === merged.length ? "All Complete"
              : completed > 0               ? "Partially Filled"
              :                               "Not Started"
            );
          });
          // Also resolve the useEMRForms promise so status change proceeds
          modalProps.onComplete?.();
        }}
      />}
      {directModal && directFormCode && (
        <FormFillModal
          formCodeOverride={directFormCode}
          appointmentId={appt?.appointmentId || appointment?.appointmentId || ""}
          custId={appt?.custId || appointment?.custId || ""}
          serviceCode={appt?.serviceCode || appointment?.serviceCode || ""}
          centerCode={centerCode}
          macroContext={directMacro}
          onClose={() => { setDirectModal(false); setDirectFormCode(null); }}
          onComplete={() => {
            const fc = directFormCode;
            setDirectModal(false);
            setDirectFormCode(null);
            // Refresh form status after submission
            const svcCode = appt?.serviceCode || appointment?.serviceCode || "";
            const aId     = appt?.appointmentId || appointment?.appointmentId || "";
            const custId  = appt?.custId || appointment?.custId || "";
            const key = `${aId}|${svcCode}`;
            _formStatusCache.delete(key);
            const tok = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
            // Refresh both service forms AND customer forms to get accurate merged status
            Promise.all([
              fetchFormStatus(aId, svcCode),
              custId ? fetch(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`, {
                headers: { Authorization: `Bearer ${tok}` }
              }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
            ]).then(([statusData, customerData]) => {
              const serviceForms = statusData?.forms || [];
              const inner = customerData?.data ?? customerData;
              const customerForms = [
                ...(Array.isArray(inner?.customerForms) ? inner.customerForms : []),
                ...(Array.isArray(inner)                ? inner               : []),
              ];
              const customerFormRows = customerForms.map(cf => ({
                formCode:   cf.formCode,
                formName:   cf.formName || cf.formCode,
                whenToFill: "Customer",
                isMandatory: true,
                status:     "Completed",
              }));
              const serviceFormCodes = new Set(serviceForms.map(f => f.formCode));
              const merged = [
                ...serviceForms,
                ...customerFormRows.filter(cf => !serviceFormCodes.has(cf.formCode)),
              ];
              setSidebarForms(merged);
              const completed = merged.filter(f => f.status === "Completed").length;
              const overall = merged.length === 0        ? null
                            : completed === merged.length ? "All Complete"
                            : completed > 0               ? "Partially Filled"
                            :                               "Not Started";
              setSidebarFormStatus(overall);
            });
            if (fc === MED_HIST_CODE) setMedHistFilled(true);
          }}
        />
      )}
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
  const [tipPos, setTipPos] = React.useState({ top:0, left:0 });
  const [showTip,setShowTip]= React.useState(false);
  const badgeRef = React.useRef(null);
  const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

  const fetchStatus = React.useCallback(() => {
    if (!appointmentId || !serviceCode) return;
    fetchFormStatus(appointmentId, serviceCode).then(data => {
      if (data?.overall && data.overall !== "No Forms") {
        setStatus(data.overall);
        setForms(data.forms || []);
      }
    });
  }, [appointmentId, serviceCode]);

  const handleMouseEnter = () => {
    fetchStatus(); // lazy — only fetches once on first hover
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTipPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setShowTip(true);
  };

  if (!status) return null;
  const style = STATUS_STYLE[status] || STATUS_STYLE["Not Started"];

  return (
    <>
      <div ref={badgeRef} style={{ display:"inline-block" }}
        onMouseEnter={handleMouseEnter} onMouseLeave={() => setShowTip(false)}>
        <div style={{ background:style.bg, color:style.color, borderRadius:99,
          padding:"1px 7px", fontSize:10, fontWeight:700, cursor:"default",
          display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
          {style.icon} {status}
        </div>
      </div>
      {showTip && forms.length > 0 && (
        <div style={{ position:"fixed", top: tipPos.top, left: tipPos.left, zIndex:9999,
          background:"#fff", border:"1px solid #e7ecf4", borderRadius:8,
          padding:"8px 12px", minWidth:220, boxShadow:"0 4px 12px rgba(0,0,0,.1)" }}
          onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
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
    </>
  );
};

const FilterHeader = ({ countsOverride = {}, activeFilter = "", onFilterChange }) => {
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
    <div className="fltroptflx">
      {/* <div className="viewfilter">
        <span className="viewrm viewtb">Rooms</span>
        <span className="viewdoc viewtb active">Practitioners</span>
      </div> */}
      <div className="vwextrabtns">
        <div className="apptstatus">
          {/* All pill */}
          <div
            className={`statcell${activeFilter === "" ? " filter-active" : ""}`}
            style={{ cursor:"pointer" }}
            onClick={() => onFilterChange?.("")}>
            <div className="stimg" style={{ paddingLeft:12, paddingRight:12 }}>All</div>
            <div className="statno">{Object.values(countsOverride).reduce((a,b)=>a+(typeof b==="number"?b:0),0)}</div>
          </div>
          {items.map(({ key, icon, label }) => (
            <div key={key}
              className={`${key.toLowerCase()} statcell${activeFilter === key ? " filter-active" : ""}`}
              style={{ cursor:"pointer" }}
              onClick={() => onFilterChange?.(activeFilter === key ? "" : key)}>
              <div className="stimg">
                <img src={`${import.meta.env.BASE_URL}images/${icon}`} alt={label} />{label}
              </div>
              <div className="statno">{val(key)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  const [activeFilter,        setActiveFilter]       = useState(""); // "" = All
  const suggestRef = useRef(null);

  const user = useMemo(() => getUser(), []);
  const { has, guard, notifyDenied } = usePermissions();

  // ── Doctor-only access ──────────────────────────────────────────────────
  // If the logged-in user is a practitioner/doctor, restrict the grid to
  // show only their own appointments.
  const loggedInRole = (
    user.role || user.userRole || user.securityRole || ""
  ).toLowerCase().replace(/\s/g, "");

  // The logged-in user's employee code
  const loggedInDoctorCode = user.employeeCode || user.practitionerCode || user.code || "";

  // isDoctorRole = true when the logged-in employeeCode exists in the
  // practitioners list loaded for this centre.
  // This is set after fetchDoctors resolves — default false until then.
  const [isDoctorRole, setIsDoctorRole] = useState(false);

  const timeSlots = useMemo(() => [...Array(145)].map((_, i) => {
    const mins = 600 + i * 5;   // start at 10:00 AM (600 min)
    const h    = Math.floor(mins / 60);
    const m    = mins % 60;
    const per  = h >= 12 ? "PM" : "AM";
    const dh   = h % 12 === 0 ? 12 : h % 12;   // no leading zero, matches TIME_SLOTS in AppointmentDrawer
    return `${dh}:${String(m).padStart(2,"0")} ${per}`;
  }), []);

  useEffect(() => { if (newCustomer) { setSelectedCustomer(newCustomer); setEditData(null); setIsDrawerOpen(true); } }, [newCustomer]);

  const fetchDoctors = async () => {
    try {
      const data = await authGet(`${API_BASE_URL}/api/Master/LoadAllPractioner/${user.centerCode||""}`);
      const all = Array.isArray(data)
        ? data.map(d => ({ id: d.id || d.code || "", name: d.name || "" }))
        : [];

      // Check if the logged-in employeeCode exists in the practitioners list.
      // This is the most reliable way — no role/job guessing needed.
      const selfInList = loggedInDoctorCode
        ? all.find(d => d.id === loggedInDoctorCode)
        : null;

      if (selfInList) {
        // Logged-in user IS a practitioner → show only their column
        setIsDoctorRole(true);
        setDoctors([selfInList]);
      } else {
        // Receptionist / admin → show all practitioners
        setIsDoctorRole(false);
        setDoctors(all);
      }
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
      PaymentPending: appointments.filter(a => {
        const st = (a.status || "").toLowerCase();
        return Number(a.isPaymentMade) === 0 && st !== "cancelled" && st !== "no show";
      }).length,
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

  // ── View mode: "doctor" = doctors top, time left (vertical span)
  //              "time"   = time top, doctor left (horizontal span)
  const [viewMode, setViewMode] = useState("doctor"); // default: doctor view

  // Convert "10:00 AM" → minutes since midnight
  const toMins = (t) => {
    const h24 = convertTo24(String(t || "").trim());
    if (!h24) return 0;
    const [h, m] = h24.split(":").map(Number);
    return h * 60 + m;
  };

  // Get duration in minutes from appointment — prefers startTime/endTime diff, falls back to duration field
  const getDurMins = (appt) => {
    const st = appt.starttime || appt.startTime || "";
    const et = appt.endtime   || appt.endTime   || "";
    if (st && et) {
      const diff = toMins(et) - toMins(st);
      if (diff > 0) return diff;
    }
    // Fall back to duration field ("30 mins", "30", etc.)
    const raw = parseInt((appt.duration || "30").replace(/[^0-9]/g, ""), 10) || 30;
    return raw;
  };

  // Slot height/width in px (one 5-min slot = SLOT_PX)
  const SLOT_PX = 20;

  // Shared appointment card content
  const ApptCard = ({ appt, onOpen }) => {
    const sc = getStatusClass(appt.status);
    return (
      <div className={`appcell-v2 ${sc}`} onClick={onOpen}>
        <div className="av2-name">{appt.fullName}</div>
        <div className="av2-svc">{appt.serviceName || "—"}</div>
        <div className={`aptst ${sc}`} style={{marginTop:2}}>
          <span/>{appt.status || "Booked"}
        </div>
        <EMRStatusBadge
          appointmentId={appt.appointmentId}
          serviceCode={appt.serviceCode || appt.allLines?.[0]?.serviceCode || ""}
        />
        {Number(appt.isPaymentMade) > 0 && <div className="paidst">Paid</div>}
      </div>
    );
  };

  const openSidebar = (appt) => {
    const allLines = appointments.filter(a => a.appointmentId === appt.appointmentId);
    setSelectedAppointment({ ...appt, allLines });
    setIsSidebarOpen(true);
  };

  // ── Filtered appointments for grid display ───────────────────────────────
  const filteredAppointments = useMemo(() => {
    if (!activeFilter) return appointments;
    if (activeFilter === "PaymentPending")
      return appointments.filter(a => {
        const st = (a.status || "").toLowerCase();
        return Number(a.isPaymentMade) === 0 && st !== "cancelled" && st !== "no show";
      });
    return appointments.filter(a =>
      (a.status || "").toLowerCase() === activeFilter.toLowerCase()
    );
  }, [appointments, activeFilter]);

  // ── DOCTOR VIEW ─────────────────────────────────────────────────────────
  // Rows = doctors (left sticky), Cols = time slots (top sticky)
  // Each cell = one 5-min slot. Appointments are rendered as ABSOLUTELY
  // POSITIONED blocks inside a relative container so multiple appointments
  // at the same start time (overbooking) all appear side by side.
  //
  // Layout per cell: position:relative container spanning the full row height.
  // Each appointment block is positioned: left = startSlot * SLOT_W, width = dur/5 * SLOT_W.
  // We render ONE cell per doctor row (spanning ALL time slots) and place
  // appointments inside it absolutely.

  const SLOT_W = 60; // px per 5-min slot in Doctor View

  // Pre-compute appointments per doctor for DoctorView
  const apptsByDoctor = useMemo(() => {
    const map = {};
    doctors.forEach((doc, di) => {
      map[di] = filteredAppointments.filter(a => {
        const docId = a.doctorId || a.doctorid || "";
        if (doc.id && docId) return doc.id === docId;
        return normDoc(doc.name || doc) === normDoc(a.doctorname || a.doctorName);
      });
    });
    return map;
  }, [doctors, filteredAppointments]);

  const DoctorView = () => (
    <div className="grid-outer">
      <table className="cal-table" style={{ tableLayout:"fixed" }}>
        <thead>
          <tr>
            <th className="corner-cell">
              <span className="corner-doc">Doctor</span>
              <span className="corner-time">Time →</span>
            </th>
            {timeSlots.map((t, i) => (
              <th key={i} className="time-header-cell" style={{ width:SLOT_W, minWidth:SLOT_W }}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doctors.map((doc, di) => {
            const docAppts = apptsByDoctor[di] || [];
            // Total width = all slots
            const totalW = timeSlots.length * SLOT_W;
            // Row height = max stacked cards × CARD_H, min 64px
                    const CARD_H_ROW = 80;
                    const maxStack = docAppts.length > 0
                      ? Math.max(...timeSlots.map((_, si) => {
                          const slotMins = toMins(timeSlots[si]);
                          return docAppts.filter(a => {
                            const s = toMins(a.starttime || a.startTime);
                            const e = s + getDurMins(a);
                            return s <= slotMins && slotMins < e;
                          }).length;
                        }))
                      : 0;
                    const rowH = Math.max(64, maxStack * CARD_H_ROW + 4);

            return (
              <tr key={di} className="doc-row">
                <td className="doc-label-cell" style={{ height:rowH }}>{doc.name || doc}</td>
                {/* Single td spanning ALL time columns — appointments rendered inside absolutely */}
                <td colSpan={timeSlots.length}
                  style={{ position:"relative", padding:0, height:rowH, verticalAlign:"top" }}
                  onDoubleClick={e => {
                    // Calculate which time slot was clicked
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const slotIdx = Math.floor(clickX / SLOT_W);
                    const slotTime = timeSlots[Math.max(0, Math.min(slotIdx, timeSlots.length - 1))];
                    setSelectedTimeSlot(slotTime);
                    setSelectedDoctor(doc);
                    setEditData(null);
                    if (!has("APPT.CREATE")) { notifyDenied("Your role does not have this right. Contact Admin/Product Team."); return; }
                    setIsDrawerOpen(true);
                  }}>

                  {/* Time grid lines */}
                  <div style={{ position:"absolute", inset:0, display:"flex", pointerEvents:"none" }}>
                    {timeSlots.map((_, i) => (
                      <div key={i} style={{
                        width:SLOT_W, flexShrink:0,
                        borderRight:`1px solid ${i % 12 === 11 ? "#c8d5e8" : "#E9EDF5"}`,
                        height:"100%",
                        background: i % 12 === 0 ? "rgba(51,75,113,.03)" : "transparent"
                      }} />
                    ))}
                  </div>

                  {/* Appointment blocks — stacked vertically when overlapping */}
                  {(() => {
                    if (!docAppts.length) return null;

                    // Group overlapping appointments into lanes
                    // Sort by start time
                    const sorted = [...docAppts].sort((a, b) =>
                      toMins(a.starttime || a.startTime) - toMins(b.starttime || b.startTime)
                    );

                    // Assign lane (row within the cell) to each appointment
                    const lanes = []; // lanes[i] = end time (mins) of last appt in lane i
                    const apptLane = sorted.map(appt => {
                      const startMins = toMins(appt.starttime || appt.startTime);
                      const endMins   = startMins + getDurMins(appt);
                      // Find first free lane
                      let lane = lanes.findIndex(laneEnd => laneEnd <= startMins);
                      if (lane === -1) { lane = lanes.length; lanes.push(endMins); }
                      else lanes[lane] = endMins;
                      return lane;
                    });

                    const totalLanes = Math.max(1, lanes.length);
                    const laneH = Math.max(28, Math.floor(60 / totalLanes)); // height per lane

                    // Stack appointments vertically — each takes full width
                    // Group by start slot so overlapping ones stack on top of each other
                    const CARD_H = 80; // height per stacked card
                    const baseMins = toMins(timeSlots[0]);

                    return sorted.map((appt, idx) => {
                      const startMins = toMins(appt.starttime || appt.startTime);
                      const dur       = getDurMins(appt);
                      const span      = Math.max(1, Math.round(dur / 5));
                      const slotIdx   = Math.round((startMins - baseMins) / 5);
                      if (slotIdx < 0) return null;

                      const leftPx  = slotIdx * SLOT_W;
                      const widthPx = span * SLOT_W - 3;
                      // Stack: each card sits below the previous one at the same slot
                      const topPx   = apptLane[idx] * CARD_H + 2;
                      const height  = CARD_H - 4;
                      const sc      = getStatusClass(appt.status);

                      return (
                        <div key={appt.appointmentId + idx}
                          className={`appcell-v2 ${sc}`}
                          onClick={() => openSidebar(appt)}
                          style={{
                            position:"absolute",
                            left:leftPx, top:topPx,
                            width:widthPx, height,
                            minHeight:"unset", minWidth:"unset",
                            padding:"5px 8px",
                            overflow:"hidden", zIndex:2,
                          }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                            <div className="av2-name" style={{ fontSize:11, fontWeight:700 }}>{appt.fullName}</div>
                            <div className={`aptst ${sc}`} style={{ fontSize:9, padding:"1px 5px", flexShrink:0, marginLeft:4 }}>
                              <span/>{appt.status || "Booked"}
                            </div>
                          </div>
                          <div className="av2-svc" style={{ fontSize:10, marginTop:2 }}>{appt.serviceName}</div>
                          <EMRStatusBadge
                            appointmentId={appt.appointmentId}
                            serviceCode={appt.serviceCode || appt.allLines?.[0]?.serviceCode || ""}
                          />
                          {Number(appt.isPaymentMade) > 0 && <div className="paidst">Paid</div>}
                        </div>
                      );
                    });
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── TIME VIEW ───────────────────────────────────────────────────────────
  // Rows = time slots (left sticky), Cols = doctors (top sticky)
  // Each column = one doctor. Appointments rendered as absolutely positioned
  // blocks within a single tall <td> per doctor, so overbooking works.

  const SLOT_H = 36; // px per 5-min row (matches .time-row height)

  // Pre-compute appointments per doctor for TimeView
  const apptsByDoctorTV = useMemo(() => {
    const map = {};
    doctors.forEach((doc, di) => {
      map[di] = filteredAppointments.filter(a => {
        const docId = a.doctorId || a.doctorid || "";
        if (doc.id && docId) return doc.id === docId;
        return normDoc(doc.name || doc) === normDoc(a.doctorname || a.doctorName);
      });
    });
    return map;
  }, [doctors, filteredAppointments]);

  const TimeView = () => {
    const totalH = timeSlots.length * SLOT_H;
    const baseMins = toMins(timeSlots[0]);

    return (
      <div className="grid-outer">
        <table className="cal-table">
          <thead>
            <tr>
              <th className="corner-cell">
                <span className="corner-doc">Time</span>
                <span className="corner-time">Doctor →</span>
              </th>
              {doctors.map((doc, di) => (
                <th key={di} className="doc-header-cell">
                  <div className="doc-name">{doc.name || doc}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Single row containing one tall cell per doctor */}
            <tr>
              {/* Time label column — one cell per slot (actual rows for alignment) */}
              <td style={{ padding:0, verticalAlign:"top", position:"sticky", left:0, zIndex:20, background:"#fff" }}>
                {timeSlots.map((t, i) => (
                  <div key={i} style={{
                    height:SLOT_H, display:"flex", alignItems:"flex-end", justifyContent:"center",
                    borderBottom:"1px solid #E9EDF5", borderRight:"2px solid #c8d5e8",
                    fontSize:10, fontWeight:500, color:"#64748b", padding:"0 8px 4px",
                    background:"#fff", minWidth:100, width:100,
                  }}>{t}</div>
                ))}
              </td>

              {/* One tall cell per doctor */}
              {doctors.map((doc, di) => {
                const docAppts = apptsByDoctorTV[di] || [];

                // Assign lanes for overlapping appointments
                const sorted = [...docAppts].sort((a, b) =>
                  toMins(a.starttime || a.startTime) - toMins(b.starttime || b.startTime)
                );
                const lanes = [];
                const apptLane = sorted.map(appt => {
                  const startMins = toMins(appt.starttime || appt.startTime);
                  const endMins   = startMins + getDurMins(appt);
                  let lane = lanes.findIndex(e => e <= startMins);
                  if (lane === -1) { lane = lanes.length; lanes.push(endMins); }
                  else lanes[lane] = endMins;
                  return lane;
                });
                const totalLanes = Math.max(1, lanes.length);
                const laneW = totalLanes > 1 ? `${Math.floor(100 / totalLanes)}%` : "100%";

                return (
                  <td key={di}
                    style={{ position:"relative", padding:0, verticalAlign:"top",
                      height:totalH, width:160, minWidth:160,
                      borderRight:"1px solid #E9EDF5" }}
                    onDoubleClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickY   = e.clientY - rect.top;
                      const slotIdx  = Math.floor(clickY / SLOT_H);
                      const slotTime = timeSlots[Math.max(0, Math.min(slotIdx, timeSlots.length - 1))];
                      setSelectedTimeSlot(slotTime);
                      setSelectedDoctor(doc);
                      setEditData(null);
                      if (!has("APPT.CREATE")) { notifyDenied("Your role does not have this right. Contact Admin/Product Team."); return; }
                      setIsDrawerOpen(true);
                    }}>

                    {/* Horizontal grid lines */}
                    <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
                      {timeSlots.map((_, i) => (
                        <div key={i} style={{
                          height:SLOT_H,
                          borderBottom:`1px solid ${i % 12 === 11 ? "#c8d5e8" : "#E9EDF5"}`,
                          background: i % 12 === 0 ? "rgba(51,75,113,.03)" : "transparent",
                        }} />
                      ))}
                    </div>

                    {/* Appointment blocks */}
                    {sorted.map((appt, idx) => {
                      const startMins = toMins(appt.starttime || appt.startTime);
                      const dur       = getDurMins(appt);
                      const endMins   = startMins + dur;
                      const heightPx  = Math.max(SLOT_H - 4, Math.round(dur / 5) * SLOT_H - 4);

                      // Find how many earlier appointments overlap with this one
                      const overlapCount = sorted.slice(0, idx).filter(prev => {
                        const pStart = toMins(prev.starttime || prev.startTime);
                        const pEnd   = pStart + getDurMins(prev);
                        return pStart < endMins && pEnd > startMins; // true overlap
                      }).length;

                      // Position at actual time — only offset sideways width if overlapping
                      const baseTop  = Math.round((startMins - baseMins) / 5) * SLOT_H + 2;
                      const colW     = totalLanes > 1 ? 100 / totalLanes : 100;
                      // If truly overlapping, split width; otherwise full width
                      const hasOverlap = sorted.some((other, oi) => {
                        if (oi === idx) return false;
                        const oStart = toMins(other.starttime || other.startTime);
                        const oEnd   = oStart + getDurMins(other);
                        return oStart < endMins && oEnd > startMins;
                      });
                      const cardLeft  = hasOverlap ? `${apptLane[idx] * colW}%` : "0";
                      const cardWidth = hasOverlap ? `calc(${colW}% - 2px)` : "calc(100% - 2px)";
                      const sc        = getStatusClass(appt.status);

                      return (
                        <div key={appt.appointmentId + idx}
                          className={`appcell-v2 ${sc}`}
                          onClick={() => openSidebar(appt)}
                          style={{
                            position:"absolute",
                            top:baseTop,
                            left:cardLeft,
                            width:cardWidth,
                            height:heightPx,
                            minHeight:"unset", minWidth:"unset",
                            padding:"5px 8px",
                            overflow:"hidden", zIndex:2,
                          }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                            <div className="av2-name" style={{ fontSize:11, fontWeight:700 }}>{appt.fullName}</div>
                            <div className={`aptst ${sc}`} style={{ fontSize:9, padding:"1px 5px", flexShrink:0, marginLeft:4 }}>
                              <span/>{appt.status || "Booked"}
                            </div>
                          </div>
                          {heightPx > 40 && <div className="av2-svc" style={{ fontSize:10, marginTop:2 }}>{appt.serviceName}</div>}
                          <EMRStatusBadge
                            appointmentId={appt.appointmentId}
                            serviceCode={appt.serviceCode || appt.allLines?.[0]?.serviceCode || ""}
                          />
                          {Number(appt.isPaymentMade) > 0 && <div className="paidst">Paid</div>}
                        </div>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="calsection">
      <header className="appthdr">
        <div className="flx-spcbt">
          <div className="backbtnapp">
            <Link to="/dashboard"  data-tooltip="Go Back" data-tooltip-pos="right">
              <img src={`${import.meta.env.BASE_URL}images/back.svg`} width="24" alt="Back" />
            </Link>
            <span className="c-name">{user.centerName || "Clinic"}</span>
          </div>
          <div className="datepkrdiv">
            <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); fetchAppointments(e.target.value); }} />
          </div>
          <div className="actbtnsdiv">
            <Link to="/dashboard"  data-tooltip="Dashboard" data-tooltip-pos="right">
              <img src={`${import.meta.env.BASE_URL}images/homeicon.svg`} width="24" alt="Home" />
            </Link>
            {/* Only show add buttons for non-doctor roles */}
            {!isDoctorRole && (
              <>
                <div className="apptimg tooltip" data-tooltip="Add Appointment" onClick={() => guard("APPT.CREATE", () => { setSelectedCustomer(null); setIsDrawerOpen(true); })}>
                  <img src={`${import.meta.env.BASE_URL}images/addappt.svg`} alt="Add" />
                </div>
                <span className="apptstgs tooltip" data-tooltip="Add Customer" onClick={() => guard("MDM.CUSTOMERS_CREATE", () => setShowAddCustomer(true))}>
                  <img src={`${import.meta.env.BASE_URL}images/addcustwhite.svg`} alt="Add Customer" />
                </span>
              </>
            )}
            {isDoctorRole && (
              <span style={{
                fontSize:11, fontWeight:700, color:"#fff",
                background:"rgba(255,255,255,.2)", border:"1px solid rgba(255,255,255,.3)",
                borderRadius:6, padding:"4px 10px", whiteSpace:"nowrap"
              }}>
                My Appointments
              </span>
            )}
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
                        <span onClick={e => { e.stopPropagation(); guard("APPT.CREATE", () => { setSelectedCustomer(item); setIsDrawerOpen(true); setSuggestions([]); setSearchTerm(""); }); }} className="bookappt">
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

      {/* Filter header + view toggle */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"8px 16px", background:"#fff", borderBottom:"1px solid #E9EDF5",
        position:"sticky", top:"56px", zIndex:90,
        boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
        <FilterHeader countsOverride={countsOverride} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        {/* View mode toggle */}
        <div style={{ display:"flex", border:"1px solid #c8d5e8", borderRadius:8, overflow:"hidden", flexShrink:0 }}>
          <button
            onClick={() => setViewMode("doctor")}
            style={{ padding:"7px 14px", border:"none", cursor:"pointer", fontSize:12,
              fontWeight:700, fontFamily:"Lato,sans-serif",
              background: viewMode === "doctor" ? "#334B71" : "#f4f6fa",
              color:       viewMode === "doctor" ? "#fff"    : "#334B71",
              display:"flex", alignItems:"center", gap:5, transition:"background .15s" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="0" y="0" width="4" height="14" rx="1"
                fill={viewMode==="doctor"?"#fff":"#334B71"} opacity=".9"/>
              <rect x="5" y="0" width="9" height="6" rx="1"
                fill={viewMode==="doctor"?"#fff":"#334B71"} opacity=".6"/>
              <rect x="5" y="8" width="9" height="6" rx="1"
                fill={viewMode==="doctor"?"#fff":"#334B71"} opacity=".6"/>
            </svg>
            Doctor View
          </button>
          <button
            onClick={() => setViewMode("time")}
            style={{ padding:"7px 14px", border:"none", cursor:"pointer", fontSize:12,
              fontWeight:700, fontFamily:"Lato,sans-serif",
              background: viewMode === "time" ? "#334B71" : "#f4f6fa",
              color:       viewMode === "time" ? "#fff"   : "#334B71",
              display:"flex", alignItems:"center", gap:5, transition:"background .15s" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="0" y="0" width="14" height="4" rx="1"
                fill={viewMode==="time"?"#fff":"#334B71"} opacity=".9"/>
              <rect x="0" y="5" width="6" height="9" rx="1"
                fill={viewMode==="time"?"#fff":"#334B71"} opacity=".6"/>
              <rect x="8" y="5" width="6" height="9" rx="1"
                fill={viewMode==="time"?"#fff":"#334B71"} opacity=".6"/>
            </svg>
            Time View
          </button>
        </div>
      </div>

      {/* View toggle + grid */}
      {viewMode === "doctor" ? <DoctorView /> : <TimeView />}

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
          onReschedule={appt => {
            // Reschedule: pre-fill service/customer but let user pick new date+time
            // isReschedule flag tells the drawer to show date picker prominently
            setEditData({ ...appt, isReschedule: true });
            setSelectedTimeSlot(null);   // clear time so user picks new slot
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
          onClose={() => { setIsDrawerOpen(false); setEditData(null); setSelectedTimeSlot(null); }}
          customer={selectedCustomer}
          timeSlot={selectedTimeSlot}
          doctor={selectedDoctor}
          editAppointment={editData}
          selectedDate={selectedDate}
          onRefreshAppointments={() => fetchAppointments(selectedDate)}
          allowPastDates={true}
          defaultStatus={
            selectedDate && selectedDate < new Date().toISOString().split("T")[0]
              ? "Completed"
              : undefined
          }
        />
      )}

      {showAddCustomer && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1200, display:"flex", justifyContent:"flex-end" }}
          onClick={() => setShowAddCustomer(false)}>
          <div style={{ width:500, background:"#fff", display:"flex", flexDirection:"column", height:"100vh", boxShadow:"-4px 0 24px rgba(0,0,0,0.18)", overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <CustomerFormPanel
              onClose={() => setShowAddCustomer(false)}
              onSaved={(data) => {
                const custId = data?.custId || data?.customerId || "";
                if (custId) {
                  setSelectedCustomer({
                    custId,
                    custid:    custId,
                    firstName: data?.firstName || "",
                    lastName:  data?.lastName  || "",
                    mobile:    data?.mobile    || data?.mobilePhone || "",
                    name:      `${data?.firstName || ""} ${data?.lastName || ""}`.trim(),
                  });
                  setIsDrawerOpen(true);
                }
                setShowAddCustomer(false);
              }}
            />
          </div>
        </div>
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