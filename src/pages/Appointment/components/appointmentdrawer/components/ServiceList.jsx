import React from "react";

const ServiceList = ({ data = [], onDelete }) => {
  if (!data.length) return (
    <div className="service-list srvlist">
      <h4 className="frmlgnd">Booked Services</h4>
      <div className="noadded">No services added.</div>
    </div>
  );

  return (
    <div className="service-list srvlist">
      <h4 className="frmlgnd">Booked Services</h4>
      <div className="srctblwrp">
        <table className="srvctbl">
          <thead>
            <tr>
              <th width="300">Service</th>
              <th>Practitioner</th>
              <th>Equipment</th>
              <th width="90">Start</th>
              <th width="90">End</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => (
              <tr key={index}>
                <td>{entry.service.servicename}</td>
                <td>{entry.service.practitionerName || entry.service.practitioner || "—"}</td>

                <td>{entry.service.equipment || "N/A"}</td>
                <td>{entry.service.start}</td>
                <td>{entry.service.end}</td>
                <td>{entry.service.duration}</td>
                <td>
                  {/* <button className="tblbtn edit" onClick={() => onEdit(index)}>Edit</button> */}
                  <button
                    className="tblbtn delete"
                    onClick={() => onDelete(index)}
                  >
                    <img
                      src={`${import.meta.env.BASE_URL}images/deletewt.svg`}
                      alt="Delete"
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServiceList;
