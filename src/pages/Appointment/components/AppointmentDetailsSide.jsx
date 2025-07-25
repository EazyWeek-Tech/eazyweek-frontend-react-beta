import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import Toast from "./Toast";
import { API_BASE_URL } from "../../../config";

const AppointmentDetailsSide = ({ appointment, onClose, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState(appointment?.status || "Booked");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const createDataHandler = async (payload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Appointment/AppOperation`,{
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch failed:", errorText);
        throw new Error("Failed to update status");
      }
      const result = await response.json();
      if (result?.success) {
        setToast({ message: "Appointment updated successfully!", type: "success" });
        if (typeof window.refreshAppointments === 'function') window.refreshAppointments();
        if (typeof onRefresh === 'function') onRefresh();
      } else {
        setToast({ message: result.message || "Update failed. Please try again.", type: "error" });
      }
    } catch (error) {
      console.error("Error:", error);
      setToast({ message: "Error while updating appointment.", type: "error" });
    }
  };


  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    const centerCode = stored ? JSON.parse(stored).centerCode : "";
    const payload = {
      appointmentId: appointment?.appointmentId,
      status: newStatus,
      operation: "STATUSUPDATE",
      centerCode: centerCode,
      lineNo: appointment?.lineNo,
    };
    createDataHandler(payload);
  };


  
  const handleDeleteAppointment = () => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    const centerCode = stored ? JSON.parse(stored).centerCode : "";
    const payload = {
      appointmentId: appointment?.appointmentId,
      status: "",
      operation: "DELETE",
      centerCode: centerCode,
      lineNo: appointment?.lineNo,
    };
    createDataHandler(payload).then(() => {
      setToast({ message: "Appointment deleted successfully!", type: "success" });
      if (typeof window.refreshAppointments === 'function') window.refreshAppointments();
      if (typeof onRefresh === 'function') onRefresh();
      setTimeout(() => {
        onClose();
      }, 2000);
    });
  };


  const handleEditClick = () => {
  if (typeof onEdit === 'function') {
    const nameParts = (appointment.fullName || "").split(" ");
    const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
    const lastName = nameParts.slice(-1).join(" ") || "";

    const enrichedAppointment = {
      ...appointment,
      firstName,
      lastName
    };
    console.log('edit appt click data')
    console.log(enrichedAppointment)
    onEdit(enrichedAppointment);
    onClose?.();
  }
};


  const goToPaymentPage = () => {
  const queryParams = new URLSearchParams();
  if (appointment?.custId) queryParams.append("custid", appointment.custId);
  if (appointment?.fullName) queryParams.append("custname", appointment.fullName);
  if (appointment?.appointmentId) queryParams.append("appointmentid", appointment.appointmentId);

  navigate(`/invoice?${queryParams.toString()}`);
};

const goToConsultationConsentPage = () => {
  const queryParams = new URLSearchParams();
  if (appointment?.custId) queryParams.append("custid", appointment.custId);
  if (appointment?.fullName) queryParams.append("custname", appointment.fullName);
  if (appointment?.appointmentId) queryParams.append("appointmentid", appointment.appointmentId);

  navigate(`/consultation?${queryParams.toString()}`);
};

const goToMedicalHistoryPage = () => {
  const queryParams = new URLSearchParams();
  if (appointment?.custId) queryParams.append("custid", appointment.custId);
  if (appointment?.fullName) queryParams.append("custname", appointment.fullName);
  if (appointment?.appointmentId) queryParams.append("appointmentid", appointment.appointmentId);

  navigate(`/history`);
};

 const goToCustomerPage = () => {
  const queryParams = new URLSearchParams();
  if (appointment?.custId) queryParams.append("custid", appointment.custId);
  if (appointment?.fullName) queryParams.append("fullname", appointment.fullName);
  if (appointment?.number) queryParams.append("number", appointment.number);

  navigate(`/customer?${queryParams.toString()}`);
};



  return (
    <div className={`smdiv expand ${isExpanded ? "expand" : ""}`}>
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
            <img
              src={`${import.meta.env.BASE_URL}images/usericon.png`}
              width="30"
              title="User Icon"
              alt="User Icon"
            />
            <h3 className="cstnm">
              {appointment?.fullName || ""}
              <div className="cstno">{appointment?.number || "—"}</div>
              <div className="cstid">{appointment?.custId || "—"}</div>
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
  <img
    src={`${import.meta.env.BASE_URL}images/custome.svg`}
    width="16"
    alt="Customer Profile"
  />
  Customer Profile
</a>
          </div>
        </div>

        <div className="apptblk">
          <div className="hdflx">
            <h2 className="dethead">Appointment Details</h2>
            <div className="acticons">
              <button
                className="edit tooltip"
                data-tooltip="Edit Appointment"
                data-tooltip-pos="top"
                onClick={handleEditClick}
              >
                <span className="stimg">
                  <img src={`${import.meta.env.BASE_URL}images/edtwht.svg`} alt="Edit" />
                </span>
              </button>
              <button
                className="delete tooltip"
                data-tooltip="Delete Appointment"
                data-tooltip-pos="left"
                onClick={handleDeleteAppointment}
              >
                <span className="stimg">
                  <img src={`${import.meta.env.BASE_URL}images/deletewt.svg`} alt="Delete" />
                </span>
              </button>
            </div>
          </div>

          <div className="apptsts">
            <div className="form-group slctgrp">
              <label>Status</label>
              <select id="stSelect" value={status} onChange={handleStatusChange}>
                <option value="Booked">Booked</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Checked In">Checked In</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No Show">No Show</option>
              </select>
            </div>
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
                    {appointment?.startTime || ""} - {appointment?.endTime || ""}
                  </div>
                </div>
              </div>

              <div className="dtntime">
                <div className="icondiv">
                  <img src={`${import.meta.env.BASE_URL}images/services.svg`} alt="Services" />
                </div>
                <div className="detaildiv">
                  <div className="appdtlbl">Services</div>
                  <div className="appdtval">{appointment?.serviceName || "—"}</div>
                </div>
              </div>

              <div className="dtntime">
                <div className="icondiv">
                  <img src={`${import.meta.env.BASE_URL}images/noteslist.svg`} alt="Notes" />
                </div>
                <div className="detaildiv">
                  <div className="appdtlbl">Notes</div>
                  <div className="appdtval">{appointment?.notes || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="apptactdiv">
          <div className="hdflx">
            <h2 className="dethead">Appointment Execution</h2>
          </div>

          <div className="apptcdet">
            <button onClick={goToMedicalHistoryPage} className="cstlnk">
              <img src={`${import.meta.env.BASE_URL}images/medical.svg`} alt="Medical History" />
              Medical History
            </button>
            <button onClick={goToConsultationConsentPage} className="cstlnk">
              <img src={`${import.meta.env.BASE_URL}images/consent.svg`} alt="Consent Forms" />
              Consent and Treatment Forms
            </button>
          </div>

          <button onClick={goToPaymentPage} className="pndpay">
            <span className="stimg">
              <img
                src={`${import.meta.env.BASE_URL}images/paymentpend.svg`}
                alt="Make Payment"
              />
              Make Payment
            </span>
          </button>
        </div>
      </div>

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
