import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import Toast from "./Toast";

const AppointmentDetails = ({ appointment, onClose, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState(appointment?.status || "Booked");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const createDataHandler = async (payload) => {
    try {
      const response = await fetch("/AppointmentOperationHandler.ashx", {
        method: "POST",
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
        setToast({ message: "Appointment status updated!", type: "success" });
        if (typeof window.refreshAppointments === 'function') window.refreshAppointments();
      } else {
        setToast({ message: "Update failed. Please try again.", type: "error" });
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);
      setToast({ message: "Error updating appointment.", type: "error" });
    }
      console.log(payload)
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);

    const payload = {
      appointmentid: appointment?.appointmentId,
      status: newStatus,
      operation: "STAUTSUPDATE",
    };

    createDataHandler(payload);
  };

  const handleDeleteAppointment = () => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;

    const payload = {
      appointmentid: appointment?.appointmentId,
      status: " ",
      operation: "DELETE",
    };

    createDataHandler(payload).then(() => {
      setToast({ message: "Appointment deleted successfully!", type: "success" });
      if (typeof window.refreshAppointments === 'function') window.refreshAppointments();
      setTimeout(() => {
        onClose();
      }, 2000);
    });
  };

  const handleEditClick = () => {
  if (typeof onEdit === 'function') {
    const nameParts = (appointment.fullname || "").split(" ");
    const firstname = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
    const lastname = nameParts.slice(-1).join(" ") || "";

    const enrichedAppointment = {
      ...appointment,
      firstname,
      lastname
    };

    onEdit(enrichedAppointment);
    onClose?.();
  }
};


  const goToPaymentPage = () => {
  const queryParams = new URLSearchParams();
  if (appointment?.custid) queryParams.append("custid", appointment.custid);
  if (appointment?.fullname) queryParams.append("custname", appointment.fullname);
  if (appointment?.appointmentId) queryParams.append("appointmentid", appointment.appointmentId);

  navigate(`/payment?${queryParams.toString()}`);
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
              {appointment?.fullname || ""}
              <div className="cstno">{appointment?.number || "—"}</div>
              <div className="cstid">{appointment?.custid || "—"}</div>
            </h3>
          </div>

          <div className="cdtprof">
            <a href="#" className="cstlnk">
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
                  <div className="dtlbl">Date & Time</div>
                  <div className="dtval">
                    {appointment?.starttime || ""} - {appointment?.endtime || ""}
                  </div>
                </div>
              </div>

              <div className="dtntime">
                <div className="icondiv">
                  <img src={`${import.meta.env.BASE_URL}images/services.svg`} alt="Services" />
                </div>
                <div className="detaildiv">
                  <div className="dtlbl">Services</div>
                  <div className="dtval">{appointment?.servicename || "—"}</div>
                </div>
              </div>

              <div className="dtntime">
                <div className="icondiv">
                  <img src={`${import.meta.env.BASE_URL}images/noteslist.svg`} alt="Notes" />
                </div>
                <div className="detaildiv">
                  <div className="dtlbl">Notes</div>
                  <div className="dtval">{appointment?.notes || "—"}</div>
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
            <a href="#" className="cstlnk">
              <img src={`${import.meta.env.BASE_URL}images/medical.svg`} alt="Medical History" />
              Medical History
            </a>
            <a href="#" className="cstlnk">
              <img src={`${import.meta.env.BASE_URL}images/consent.svg`} alt="Consent Forms" />
              Consent and Treatment Forms
            </a>
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

export default AppointmentDetails;
