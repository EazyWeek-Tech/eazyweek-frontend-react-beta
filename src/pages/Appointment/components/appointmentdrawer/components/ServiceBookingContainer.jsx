import React, { useState, useEffect } from "react";
import CustomerForm from "./CustomerForm";
import ServiceRequestForm from "./ServiceRequestForm";
import ServiceList from "./ServiceList";
import FormFooter from "./FormFooter";
import Toast from "../../Toast";
import { API_BASE_URL } from "../../../../../config";

const createDataHandler = async (payload) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/Appointment/SaveAppointment`, {
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

const ServiceBookingContainer = ({
  prefillData,
  customer,
  doctor,
  timeSlot,
  onClose,
  onRefreshAppointments,
  isOpen
}) => {
  const [customerFormData, setCustomerFormData] = useState(null);
  const [serviceList, setServiceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(Date.now());
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [lastEndTime, setLastEndTime] = useState("10:00 AM");
  const [toast, setToast] = useState(null);

  // ✅ Central reset function
  const resetAllForms = () => {
    setServiceList([]);
    setCustomerFormData(null);
    setEditingIndex(null);
    setEditingService(null);
    setLastEndTime("10:00 AM");
    setResetKey(Date.now());
  };

  // ✅ Reset when drawer opens or new customer/edit data comes
  useEffect(() => {
  if (isOpen) {
    resetAllForms();

    const data = prefillData || customer;
    console.log(prefillData)
    if (data) {
      setCustomerFormData({
        name: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        number: data.number || data.mobile || '',
        email: data.email || '',
        gender: data.gender || '',
        custid: data.custid || ''
      });

      if (prefillData?.serviceName && prefillData?.serviceCode) {
        setServiceList([
          {
            service: {
              servicename: prefillData.serviceName,
              servicecode: prefillData.serviceCode,
              practitioner: prefillData.doctorName,
              start: prefillData.startTime,
              end: prefillData.endTime,
              room: prefillData.room,
              note: prefillData.notes,
              duration: prefillData.duration?.replace(" mins", "") || "5",
              preference: prefillData.preference || "any",
              amount: 100,
              equipment: prefillData.equipment || "N/A"
            },
            customer: {
              name: prefillData.fullName,
              number: prefillData.number,
              email: prefillData.email,
              gender: prefillData.gender,
              custid: prefillData.custid
            }
          }
        ]);

        setEditingService({
          servicename: prefillData.serviceName,
          servicecode: prefillData.serviceCode,
          practitioner: prefillData.doctorId || "",
          startTime: prefillData.startTime,
          duration: prefillData.duration?.replace(" mins", "") || "5",
          endTime: prefillData.endTime,
          room: prefillData.room,
          note: prefillData.notes,
          preference: prefillData.preference || "any",
          amount: 100,
          equipment: prefillData.equipment || "N/A"
        });
      }
    }
  }
}, [isOpen, prefillData, customer]);


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
    } else {
      setServiceList((prev) => [...prev, combinedData]);
    }

    setLastEndTime(serviceData.end);
    setResetKey(Date.now());
  };

  const handleDelete = (index) => {
    if (window.confirm("Are you sure you want to delete this service?")) {
      setServiceList((prev) => prev.filter((_, i) => i !== index));
    }
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

    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    const parsedUser = stored ? JSON.parse(stored) : {};

    const payload = {
      custID: customerFormData.custid || "",
      appointmentDate: new Date().toISOString().split("T")[0],
      userId: parsedUser.userID || "",
      centerCode: parsedUser.centerCode || "",
      saveAppointment: serviceList.map((entry, index) => ({
        startTime: entry.service.start,
        endTime: entry.service.end,
        duration: entry.service.duration,
        lineNo: (index + 1).toString(),
        serviceCode: entry.service.servicecode,
        practioner: entry.service.practitioner,
        preference: entry.service.preference,
        notes: entry.service.note,
        amount: entry.service.amount.toString(),
        room: entry.service.room,
      })),
    };

    const result = await createDataHandler(payload);

    if (result.success) {
      setToast({ message: result.message, type: "success" });
      resetAllForms();
      if (typeof onClose === 'function') onClose();
      if (typeof onRefreshAppointments === 'function') onRefreshAppointments();
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
            resetAllForms();
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
