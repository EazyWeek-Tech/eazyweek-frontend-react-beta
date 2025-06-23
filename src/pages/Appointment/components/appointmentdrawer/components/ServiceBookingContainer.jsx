import React, { useState, useEffect } from "react";
import CustomerForm from "./CustomerForm";
import ServiceRequestForm from "./ServiceRequestForm";
import ServiceList from "./ServiceList";
import FormFooter from "./FormFooter";
import Toast from "../../Toast";

const createDataHandler = async (payload) => {
  try {
    const response = await fetch("/SaveAppointmentHandler.ashx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      return { success: false, message: data.message || "Submission failed" };
    }
    return { success: true, message: "Appointment submitted successfully!" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

const ServiceBookingContainer = ({ prefillData, customer, doctor, timeSlot, onClose, onRefreshAppointments }) => {
  const [customerFormData, setCustomerFormData] = useState(customer || null);
  const [serviceList, setServiceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(Date.now());
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [lastEndTime, setLastEndTime] = useState("10:00 AM");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const data = prefillData || customer;
    if (data) {
      setCustomerFormData({
        name: data.fullname || `${data.firstname || ''} ${data.lastname || ''}`.trim(),
        number: data.number || data.mobile || '',
        email: data.email || '',
        gender: data.gender || '',
        custid: data.custid || ''
      });

      if (prefillData) {
        setServiceList([
          {
            service: {
              servicename: prefillData.servicename,
              servicecode: prefillData.servicecode,
              practitioner: prefillData.doctorname,
              start: prefillData.starttime,
              end: prefillData.endtime,
              room: prefillData.room,
              note: prefillData.notes,
              duration: prefillData.duration?.replace("mins", "") || "5",
              preference: prefillData.preference || "any",
              amount: 100,
              equipment: prefillData.equipment || "N/A"
            },
            customer: {
              name: prefillData.fullname,
              number: prefillData.number,
              email: prefillData.email,
              gender: prefillData.gender,
              custid: prefillData.custid
            }
          }
        ]);
      }
      setResetKey(Date.now());
    }
  }, [prefillData, customer]);

  const handleAddService = (serviceData) => {
    if (!customerFormData) {
      setToast({ message: "Customer data is missing.", type: "error" });
      return;
    }
    const combinedData = {
      customer: JSON.parse(JSON.stringify(customerFormData)),
      service: JSON.parse(JSON.stringify(serviceData))
    };
    if (editingIndex !== null) {
      const updatedList = [...serviceList];
      updatedList[editingIndex] = combinedData;
      setServiceList(updatedList);
      setEditingIndex(null);
      setEditingService(null);

      if (typeof onRefreshAppointments === 'function') onRefreshAppointments();
      if (typeof window.refreshAppointments === 'function') window.refreshAppointments();
    } else {
      setServiceList((prev) => [...prev, combinedData]);
    }
    setLastEndTime(serviceData.end);
    setResetKey(Date.now());
  };

  const handleDelete = (index) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this service?");
    if (!confirmDelete) return;
    setServiceList((prev) => prev.filter((_, i) => i !== index));
    setToast({ message: "Service removed.", type: "info" });
    if (typeof onRefreshAppointments === 'function') onRefreshAppointments();
    if (typeof window.refreshAppointments === 'function') window.refreshAppointments();
  };

  const handleEdit = (index) => {
    const entry = serviceList[index];
    setEditingService(entry.service);
    setEditingIndex(index);
    setResetKey(Date.now());
  };

  const handleSubmitAll = async () => {
    if (!customerFormData || serviceList.length === 0) {
      setToast({ message: "Missing customer or service data.", type: "error" });
      return;
    }
    const payload = serviceList.map((entry, index) => ({
      CustID: entry.customer.custid || " ",
      AppointmentDate: new Date().toISOString().split("T")[0],
      StartTime: entry.service.start,
      EndTime: entry.service.end,
      Duration: entry.service.duration,
      LineNo: index + 1,
      ServiceCode: entry.service.servicecode,
      ServiceName: entry.service.servicename,
      Practioner: entry.service.practitioner,
      Preference: entry.service.preference,
      Notes: entry.service.note,
      Amount: entry.service.amount,
      Room: entry.service.room,
    }));

    const result = await createDataHandler(payload);

    if (result.success) {
      setToast({ message: result.message, type: "success" });
      setServiceList([]);
      setCustomerFormData(null);
      setEditingIndex(null);
      setEditingService(null);
      setLastEndTime("10:00 AM");
      setResetKey(Date.now());

      if (typeof onClose === 'function') onClose();
      if (typeof onRefreshAppointments === 'function') onRefreshAppointments();
      if (typeof window.refreshAppointments === 'function') window.refreshAppointments();
    } else {
      setToast({ message: result.message, type: "error" });
    }
  };

  return (
    <>
      <div className="apptfrmflx">
        <CustomerForm
          key={resetKey}
          prefillData={customerFormData}
          setCustomerData={setCustomerFormData}
          setLoading={setLoading}
          customerFormData={customerFormData}
          setCustomerFormData={setCustomerFormData}
        />

        <ServiceRequestForm
          onAddService={handleAddService}
          resetKey={resetKey}
          initialData={editingService}
          lastEndTime={lastEndTime}
          selectedDoctor={doctor}
          selectedTime={timeSlot}
        />

        <ServiceList
          data={serviceList}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </div>

      <div style={{ marginTop: "10px", display: "flex", gap: "15px", justifyContent: "center", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
        <button className="submitbtn editbtn" onClick={handleSubmitAll}>
          Save Appointment
        </button>
        <button
          className="restbtn"
          onClick={() => {
            setServiceList([]);
            setCustomerFormData(null);
            setEditingIndex(null);
            setEditingService(null);
            setLastEndTime("10:00 AM");
            setResetKey(Date.now());
            if (typeof onClose === 'function') onClose();
          }}
        >
          Cancel
        </button>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default ServiceBookingContainer;
