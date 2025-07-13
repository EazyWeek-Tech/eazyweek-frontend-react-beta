import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const AppointmentTab = ({ custId }) => {
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);

  useEffect(() => {
    console.log(custId);
    const fetchAppointments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Customer/FetchCustomerAppointment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ custID: custId }), // Passing the custId in the request
          credentials: "include",
        });

        if (!response.ok) throw new Error("Error fetching appointments");
        const data = await response.json();

        // Filter and categorize appointments based on 'appointmentType'
        const upcoming = data.filter((appt) => appt.appointmentType === "UpComing");
        const past = data.filter((appt) => appt.appointmentType === "Past");

        setUpcomingAppointments(upcoming);
        setPastAppointments(past);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
    };

    if (custId) fetchAppointments(); // Fetch appointments only if custId is available
  }, [custId]);

  const renderTable = (data, title) => (
    <div className="appt-section">
      <h4 className="sectttl">{title}</h4>
      <table className="appt-table">
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>Receipt No</th>
            <th>Service</th>
            
            <th>Service Date</th>
            <th>Status</th>
            <th>Therapist</th>
            <th>Payment Type</th>
          </tr>
        </thead>
        <tbody>
          {data.map((appt, idx) => (
            <tr key={idx}>
              <td>{appt.invoiceNo || "N/A"}</td>
              <td>{appt.receiptNo || "N/A"}</td>
              <td width="350">{appt.service || "N/A"}</td>
              <td width="150">{appt.serviceDate || "N/A"}</td>
              <td>{appt.status || "N/A"}</td>
              <td width="150">{appt.therapist || "N/A"}</td>
              <td>{appt.paymentType || "N/A"}</td>
              
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Placeholder */}
      <div className="pagination">
        <span>Page 1 of 1</span>
      </div>
    </div>
  );

  return (
    <div className="appointment-tab">
      {renderTable(upcomingAppointments, "Upcoming Appointments")}
      {renderTable(pastAppointments, "Past Appointments")}

      <style>{`
        .appt-section h4 {
          color: #333;
          margin-bottom: 10px;
        }
          .appointment-tab{padding: 30px;width: calc(100% - 300px)}
        .appt-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 14px;
        }
        .appt-table th {
          background: #f0f0f0;
          padding: 15px 10px;
          text-align: left;
          font-size: 15px;
          border-bottom: 1px solid #ccc;
        }
        .appt-table td {
          font-size: 15px;
          line-height: 19px;
          padding: 15px 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        .action-btn {
          background-color: #334B71;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        }
        .pagination {
          text-align: right;
          color: #555;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default AppointmentTab;
