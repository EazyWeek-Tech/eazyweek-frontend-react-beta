import React from "react";

const AppointmentTab = () => {
  const upcomingAppointments = [
    {
      invoiceNo: "1175",
      receiptNo: "0",
      service: "Consultation - Consultant (Consultation - Consultant) 1S - Expat_B",
      serviceDate: "Tue, Jul 01 2025 3:30PM - 3:50PM",
      status: "OPEN",
      therapist: "Hasnasa Samir Abdelaziz Abosena",
      paymentType: "",
      action: "Edit",
    },
  ];

  const pastAppointments = [
    {
      invoiceNo: "1157",
      receiptNo: "0",
      service: "Hair Reduction (FBL W/O B&A - Gentle Lase) 1S - Expat_B",
      serviceDate: "Tue, Jun 17 2025 3:40PM - 4:40PM",
      status: "OPEN",
      therapist: "Aaliya Mukhtar Ahmad",
      paymentType: "",
      action: "Rebook",
    },
    // Add more past appointments here...
  ];

  const renderTable = (data, title) => (
    <div className="appt-section">
      <h4 className="sectttl">{title}</h4>
      <table className="appt-table">
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>Receipt No</th>
            <th>Service</th>
            <th>Refund</th>
            <th>Service Date</th>
            <th>Status</th>
            <th>Therapist</th>
            <th>Payment Type</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((appt, idx) => (
            <tr key={idx}>
              <td>{appt.invoiceNo}</td>
              <td>{appt.receiptNo}</td>
              <td width="350">{appt.service}</td>
              <td>
                {/* Refund icons placeholder */}
                <a href="" title="" data-tooltip="View Log" className="tooltip"
                data-tooltip-pos="down">
                    <img src="/images/log.png" title="" alt="" width={18}/></a> 
                <a href="" title="" data-tooltip="View or edit data" className="tooltip"
                data-tooltip-pos="down">
                    <img src="/images/editwrite.png" title="" width={18} alt="" />
                </a>
              </td>
              <td width="150">{appt.serviceDate}</td>
              <td>{appt.status}</td>
              <td width="150">{appt.therapist}</td>
              <td >{appt.paymentType}</td>
              <td width="75">
                <button className="action-btn">{appt.action}</button>
              </td>
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
        .appt-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .appt-table th {
          background: #f0f0f0;
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ccc;
        }
        .appt-table td {
            font-size: 13px;
            line-height: 19px;
          padding: 8px;
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
