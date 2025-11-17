import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "./Toast";
import { API_BASE_URL } from "../../../config";
import { FormPreview } from "../../EMR/AdvanceFormBuilder/FormPreview";

// Form Selection Modal Component
const FormSelectionModal = ({ isOpen, onClose, forms, loading, onSelectForm, title }) => {
  const [selectedFormIndex, setSelectedFormIndex] = useState(0);
  const [selectedFormConfig, setSelectedFormConfig] = useState(null);
  const [loadingFormConfig, setLoadingFormConfig] = useState(false);

  useEffect(() => {
    if (forms.length > 0 && selectedFormIndex < forms.length) {
      const form = forms[selectedFormIndex];
      setLoadingFormConfig(true);
      fetch(`${API_BASE_URL}/api/form/by-name?name=${form.formName}`, {
        method: "GET",
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          setSelectedFormConfig(data);
        })
        .catch((error) => {
          console.error("Error fetching form config:", error);
          setSelectedFormConfig(null);
        })
        .finally(() => {
          setLoadingFormConfig(false);
        });
    }
  }, [forms, selectedFormIndex]);

  if (!isOpen) return null;

  const parsedSchema = selectedFormConfig?.schemaJson ? JSON.parse(selectedFormConfig.schemaJson) : null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h3>{title}</h3>
        {loading ? (
          <p>Loading forms...</p>
        ) : forms.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px' }}>
              {forms.map((form, index) => (
                <button
                  key={form.id}
                  onClick={() => setSelectedFormIndex(index)}
                  style={{
                    padding: '10px 15px',
                    margin: '5px',
                    backgroundColor: selectedFormIndex === index ? '#007bff' : '#f8f9fa',
                    color: selectedFormIndex === index ? 'white' : 'black',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {form.formName}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: '20px' }}>
              {loadingFormConfig ? (
                <p>Loading form preview...</p>
              ) : parsedSchema ? (
                <FormPreview config={parsedSchema} />
              ) : (
                <p>No preview available.</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'end' }}>
              {/* <button
                onClick={() => onSelectForm(forms[selectedFormIndex])}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Select Form
              </button> */}
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <p>No forms available for this service.</p>
        )}
      </div>
    </div>
  );
};

// ---------- helpers ----------
// const norm = (v) => String(v ?? "").trim().toLowerCase();

const AppointmentDetailsSide = ({
  appointment,
  onClose,
  onEdit,
  onRefresh,
  onStatusUpdated,
}) => {
  const navigate = useNavigate();

  // Keep a fresh copy for status/isPaymentMade/etc.
  const [apptDetails, setApptDetails] = useState(appointment || null);
  const [status, setStatus] = useState(appointment?.status || "Booked");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);

  const [consentForms, setConsentForms] = useState([]);
  const [loadingConsentForms, setLoadingConsentForms] = useState(false);
  const [treatmentForms, setTreatmentForms] = useState([]);
  const [loadingTreatmentForms, setLoadingTreatmentForms] = useState(false);

  // Service display should come from the appointment directly (no API)
  const serviceDisplay = appointment?.serviceName || "—";

  const BASE_STATUSES = [
    "Booked",
    "Confirmed",
    "Checked In",
    "Active",
    "Completed",
    "Cancelled",
    "No Show",
  ];
  const RESTRICTED_FROM_NO_SHOW_CANCEL = ["Checked In", "Active", "Completed"];
  const isRestrictedNow = RESTRICTED_FROM_NO_SHOW_CANCEL.includes(status);
  const VISIBLE_STATUSES = BASE_STATUSES.filter(
    (s) => !(isRestrictedNow && (s === "Cancelled" || s === "No Show"))
  );

  const centerCode = useMemo(() => {
    const stored =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    return stored ? JSON.parse(stored).centerCode : "";
  }, []);

  const apptId = appointment?.appointmentId;
  const apptLineNo = appointment?.lineNo;

  const apptDateISO = useMemo(() => {
    const raw = appointment?.appointmentDate; // "YYYY-MM-DDTHH:mm:ss"
    if (raw && typeof raw === "string") {
      const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
    return new Date().toISOString().split("T")[0];
  }, [appointment?.appointmentDate]);

  const postJson = async (url, payload) => {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`POST ${url} failed`);
    return await res.json();
  };

  // Hydrate latest appointment row for that day (status/isPaymentMade)
  useEffect(() => {
    let cancelled = false;
    const loadLatest = async () => {
      if (!apptId || !centerCode || !apptDateISO) return;
      try {
        setLoading(true);
        const payload = {
          appointmentdate: apptDateISO,
          searchtext: "",
          centerCode,
        };
        const list = await postJson(
          `${API_BASE_URL}/api/Appointment/GetAppDetails`,
          payload
        );
        const fresh = Array.isArray(list)
          ? list.find((r) => r.appointmentId === apptId)
          : null;
        if (!cancelled && fresh) {
          const merged = {
            ...appointment,
            ...fresh,
            starttime: fresh.startTime,
            doctorname: fresh.doctorName,
            isPaymentMade:
              fresh.isPaymentMade ?? appointment?.isPaymentMade ?? 0,
          };
          setApptDetails(merged);
          if (merged.status && merged.status !== status) setStatus(merged.status);
        }
      } catch (e) {
        console.error("GetAppDetails error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadLatest();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptId, apptDateISO, centerCode]);

  const sendStatusUpdate = async (payload, newStatusForUpdate) => {
    try {
      const result = await postJson(
        `${API_BASE_URL}/api/Appointment/AppOperation`,
        payload
      );
      if (result?.success) {
        setToast({ message: "Appointment updated successfully!", type: "success" });

        // Update local copy immediately
        setApptDetails((prev) =>
          prev ? { ...prev, status: newStatusForUpdate } : prev
        );

        // Notify scheduler so header counts refresh instantly
        onStatusUpdated?.(apptId, newStatusForUpdate);

        // Optional: refetch in the parent
        onRefresh?.();
      } else {
        setToast({
          message: result?.message || "Update failed. Please try again.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Status update error:", error);
      setToast({ message: "Error while updating appointment.", type: "error" });
    }
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;

    // Prevent moving to Cancelled / No Show after in-progress states
    if (
      RESTRICTED_FROM_NO_SHOW_CANCEL.includes(status) &&
      (newStatus === "Cancelled" || newStatus === "No Show")
    ) {
      setToast({
        message:
          "You can't mark this appointment as Cancelled/No Show after it is Checked In/Active/Completed.",
        type: "error",
      });
      return;
    }

    setStatus(newStatus);

    const payload = {
      appointmentId: apptId,
      status: newStatus,
      operation: "STATUSUPDATE",
      centerCode: centerCode,
      lineNo: apptLineNo,
    };
    sendStatusUpdate(payload, newStatus);
  };

  // ----- Navigation helpers (kept from your original) -----
  const buildQuery = (a) => {
    const q = new URLSearchParams();
    if (a?.custId) q.append("custid", a.custId);
    if (a?.fullName) q.append("custname", a.fullName);
    if (a?.appointmentId) q.append("appointmentid", a.appointmentId);
    return q.toString();
  };

  const goToPaymentPage = () => {
    const a = apptDetails || appointment || {};
    const q = new URLSearchParams();
    if (a.custId) q.append("custid", a.custId);
    if (a.fullName) q.append("custname", a.fullName);
    if (a.appointmentId) q.append("appointmentid", a.appointmentId);
    if (a.isPaymentMade !== undefined && a.isPaymentMade !== null) {
      q.append("isPaymentMade", a.isPaymentMade);
    }
    navigate(`/invoice?${q.toString()}`);
  };

  const goToCustomerPage = () => {
    const a = apptDetails || appointment || {};
    const q = new URLSearchParams();
    if (a.custId) q.append("custid", a.custId);
    if (a.fullName) q.append("fullname", a.fullName);
    if (a.number) q.append("number", a.number);
    navigate(`/customer?${q.toString()}`);
  };

  // const goToConsultationConsentPage = () => {
  //   const a = apptDetails || appointment || {};
  //   const q = new URLSearchParams();
  //   if (a.custId) q.append("custid", a.custId);
  //   if (a.fullName) q.append("custname", a.fullName);
  //   if (a.appointmentId) q.append("appointmentid", a.appointmentId);
  //   navigate(`/consultation?${q.toString()}`);
  // };

  const goToMedicalHistoryPage = () => {
    const a = apptDetails || appointment || {};
    const q = new URLSearchParams();
    if (a.custId) q.append("custid", a.custId);
    if (a.fullName) q.append("custname", a.fullName);
    if (a.appointmentId) q.append("appointmentid", a.appointmentId);

    navigate(`/history?${q.toString()}`);
  };





  const goToConsent = () => {
    setConsentModalOpen(true);
  };


  const goToTreatment = () => {
    setTreatmentModalOpen(true);
  };

  // Fetch consent forms when modal opens (only first form)
  useEffect(() => {
    if (consentModalOpen) {
      const serviceId = apptDetails?.serviceCode || appointment?.serviceCode;
      if (serviceId) {
        setLoadingConsentForms(true);
        fetch(`${API_BASE_URL}/api/serviceForm/all/${serviceId}`, {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            setConsentForms((data || []).slice(0, 1));
          })
          .catch((error) => {
            console.error("Error fetching consent forms:", error);
            setConsentForms([]);
          })
          .finally(() => {
            setLoadingConsentForms(false);
          });
      } else {
        setConsentForms([]);
        setLoadingConsentForms(false);
      }
    }
  }, [consentModalOpen, apptDetails?.serviceCode, appointment?.serviceCode]);

  // Fetch treatment forms when modal opens (excluding first form)
  useEffect(() => {
    if (treatmentModalOpen) {
      const serviceId = apptDetails?.serviceCode || appointment?.serviceCode;
      if (serviceId) {
        setLoadingTreatmentForms(true);
        fetch(`${API_BASE_URL}/api/serviceForm/all/${serviceId}`, {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            setTreatmentForms((data || []).slice(1));
          })
          .catch((error) => {
            console.error("Error fetching treatment forms:", error);
            setTreatmentForms([]);
          })
          .finally(() => {
            setLoadingTreatmentForms(false);
          });
      } else {
        setTreatmentForms([]);
        setLoadingTreatmentForms(false);
      }
    }
  }, [treatmentModalOpen, apptDetails?.serviceCode, appointment?.serviceCode]);

  const handleSelectConsentForm = (form) => {
    const a = apptDetails || appointment || {};
    const query = buildQuery(a);
    navigate(`/generalform?formId=${form.formId}&${query}`);
    setConsentModalOpen(false);
  };

  // const handleSelectTreatmentForm = (form) => {
  //   const a = apptDetails || appointment || {};
  //   const query = buildQuery(a);
  //   navigate(`/generalform?formId=${form.formId}&${query}`);
  //   setTreatmentModalOpen(false);
  // };

  const handleDeleteAppointment = () => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    const payload = {
      appointmentId: apptId,
      status: "",
      operation: "DELETE",
      centerCode: centerCode,
      lineNo: apptLineNo,
    };
    postJson(`${API_BASE_URL}/api/Appointment/AppOperation`, payload)
      .then(() => {
        setToast({ message: "Appointment deleted successfully!", type: "success" });
        onRefresh?.();
        setTimeout(() => {
          onClose?.();
        }, 2000);
      })
      .catch(() =>
        setToast({ message: "Delete failed. Please try again.", type: "error" })
      );
  };

  const handleEditClick = () => {
    if (!onEdit) return;
    const nameParts = (apptDetails?.fullName || "").split(" ");
    const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
    const lastName = nameParts.slice(-1).join(" ") || "";
    onEdit({ ...(apptDetails || appointment), firstName, lastName });
    onClose?.();
  };

  // ---------- UI ----------
  return (
    <div className={`smdiv expand`}>
      <div className="resizable" id="resizableDiv">
        <div className="rightcls" onClick={onClose}>
          <img
            src={`${import.meta.env.BASE_URL}images/dblrigh.svg`}
            alt="Close"
            width="16"
            height="16"
          />
        </div>

        <div className="apptcdet custdiv">
          <div className="csttopdiv">
            <img src={`${import.meta.env.BASE_URL}images/usericon.png`} width="30" alt="User Icon" />
            <h3 className="cstnm">
              {apptDetails?.fullName || ""}
              <div className="cstno">{apptDetails?.number || "—"}</div>
              <div className="cstid">{apptDetails?.custId || "—"}</div>
            </h3>
          </div>

          <div className="cdtprof">
            <a
              href="#"
              className="cstlnk"
              onClick={(e) => {
                e.preventDefault();
                goToCustomerPage();
              }}
            >
              <img src={`${import.meta.env.BASE_URL}images/custome.svg`} width="16" alt="Customer Profile" />
              Customer Profile
            </a>
          </div>
        </div>

        <div className="apptblk">
          <div className="hdflx">
            <h2 className="dethead">Appointment Details</h2>
            <div className="acticons">
              <button className="edit tooltip" data-tooltip="Edit Appointment" data-tooltip-pos="top" onClick={handleEditClick}>
                <span className="stimg">
                  <img src={`${import.meta.env.BASE_URL}images/edtwht.svg`} alt="Edit" />
                </span>
              </button>
              <button className="delete tooltip" data-tooltip="Delete Appointment" data-tooltip-pos="left" onClick={handleDeleteAppointment}>
                <span className="stimg">
                  <img src={`${import.meta.env.BASE_URL}images/deletewt.svg`} alt="Delete" />
                </span>
              </button>
            </div>
          </div>

          <div className="apptsts appflx">
            <div className="form-group slctgrp">
              <label>Status</label>
              <select id="stSelect" value={status} onChange={handleStatusChange} disabled={loading}>
                {VISIBLE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
             
            </div>

            {/* ✅ Payment — preserved (Paid / Partially Paid badge) */}
              {Number(apptDetails?.isPaymentMade) > 0 && (
                <div className=" ">
                  <div className="detaildiv pytmd">
                    <div className="appdtlbl">Payment:</div>
                    <div className="appdtval">
                      {Number(apptDetails.isPaymentMade) === 1
                        ? "Paid"
                        : "Partially Paid"}
                    </div>
                  </div>
                </div>
              )}
          </div>

          <div className="medhistdiv">
            <div className="aptdetailwrp">
              <div className="dtntime">
                <div className="icondiv">
                  <img src={`${import.meta.env.BASE_URL}images/Datentime.svg`} alt="Date and Time" />
                </div>
                <div className="detaildiv">
                  <div className="appdtlbl">Date & Time</div>
                  <div className="appdtval">
                    {apptDetails?.startTime || ""} - {apptDetails?.endTime || ""}
                  </div>
                </div>
              </div>

              <div className="dtntime">
                <div className="icondiv">
                  <img src={`${import.meta.env.BASE_URL}images/services.svg`} alt="Services" />
                </div>
                <div className="detaildiv">
                  <div className="appdtlbl">Services</div>
                  <div className="appdtval">
                    {serviceDisplay}
                  </div>
                </div>
              </div>

              {/* ✅ Notes — preserved */}
              <div className="dtntime">
                <div className="icondiv">
                  <img src={`${import.meta.env.BASE_URL}images/noteslist.svg`} alt="Notes" />
                </div>
                <div className="detaildiv">
                  <div className="appdtlbl">Notes</div>
                  <div className="appdtval">{apptDetails?.notes || "—"}</div>
                </div>
              </div>

              
            </div>
          </div>
        </div>

        <div className="apptactdiv">
          <div className="hdflx">
            <h2 className="dethead">Appointment Execution</h2>
          </div>

          <button onClick={goToMedicalHistoryPage} className="cstlnk" style={{ width: "100%" }}>
            <img src={`${import.meta.env.BASE_URL}images/medical.svg`} alt="Medical History" />
            Medical History
          </button>

          <div className="apptcdet">
            {/* Consent — code-based route */}
            <button onClick={goToConsent} className="cstlnk">
              <img src={`${import.meta.env.BASE_URL}images/consent.svg`} alt="Consent Forms" />
              Consent  Form
            </button>

            {/* Treatment — code-based route */}
            <button onClick={goToTreatment} className="cstlnk">
              <img src={`${import.meta.env.BASE_URL}images/consent.svg`} alt="Treatment Forms" />
              Treatment Form
            </button>
          </div>

          {/* Payment CTA — preserved */}
          <button onClick={goToPaymentPage} className="pndpay">
            <span className="stimg">
              <img src={`${import.meta.env.BASE_URL}images/paymentpend.svg`} alt="Make Payment" />
              Make Payment
            </span>
          </button>
        </div>
      </div>

      <FormSelectionModal
        isOpen={consentModalOpen}
        onClose={() => setConsentModalOpen(false)}
        forms={consentForms}
        loading={loadingConsentForms}
        onSelectForm={handleSelectConsentForm}
        title="Select Consent Form"
      />

      <FormSelectionModal
        isOpen={treatmentModalOpen}
        onClose={() => setTreatmentModalOpen(false)}
        forms={treatmentForms}
        loading={loadingTreatmentForms}
        // onSelectForm={handleSelectTreatmentForm}
        title="Select Treatment Form"
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AppointmentDetailsSide;
