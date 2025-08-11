import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // If using URL param

const CustomerFormHistory = () => {
  // You can also pass `customerName` as a prop
  const { customerName = "John Doe" } = useParams(); // fallback to "John Doe"

  // Sample data for ONE customer
  const sampleForms = [
    {
      id: 1,
      formType: "Consent",
      filledDate: "2025-07-30T10:00:00",
      status: "Submitted",
    },
    {
      id: 2,
      formType: "Feedback",
      filledDate: "2025-07-29T14:30:00",
      status: "Approved",
    },
    {
      id: 3,
      formType: "Insurance",
      filledDate: "2025-07-27T09:20:00",
      status: "Pending",
    }
  ];

  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [search, setSearch] = useState("");
  const [formTypeFilter, setFormTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setForms(sampleForms);
    setFilteredForms(sampleForms);
  }, []);

  useEffect(() => {
    const filtered = forms.filter((form) => {
      return (
        form.formType.toLowerCase().includes(search.toLowerCase()) &&
        (formTypeFilter ? form.formType === formTypeFilter : true) &&
        (statusFilter ? form.status === statusFilter : true)
      );
    });
    setFilteredForms(filtered);
  }, [search, formTypeFilter, statusFilter, forms]);

  return (
    <div className="frbformlistpg">
      <h2>Forms Filled by {customerName}</h2>

      <div className="frbformfilters">
        <input
          type="text"
          placeholder="Search by form type"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select onChange={(e) => setFormTypeFilter(e.target.value)} value={formTypeFilter}>
          <option value="">All Form Types</option>
          <option value="Consent">Consent</option>
          <option value="Feedback">Feedback</option>
          <option value="Insurance">Insurance</option>
        </select>
        <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
          <option value="">All Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
        </select>
      </div>

      <table className="frbformtable">
        <thead>
          <tr>
            <th>Form Type</th>
            <th>Date Filled</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredForms.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: "center" }}>No forms found.</td>
            </tr>
          ) : (
            filteredForms.map((form, i) => (
              <tr key={i}>
                <td>{form.formType}</td>
                <td>{new Date(form.filledDate).toLocaleDateString()}</td>
                <td>{form.status}</td>
                <td>
                  <button onClick={() => alert(`Viewing form ID: ${form.id}`)}>
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <style>{`
        .frbformlistpg {
          padding: 20px;
          font-family: Arial, sans-serif;
        }

        .frbformfilters {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .frbformfilters input,
        .frbformfilters select {
          padding: 8px;
          font-size: 14px;
        }

        .frbformtable {
          width: 100%;
          border-collapse: collapse;
        }

        .frbformtable th,
        .frbformtable td {
          border: 1px solid #ccc;
          padding: 10px;
          text-align: left;
        }

        .frbformtable th {
          background: #f0f0f0;
        }

        .frbformtable button {
          background-color: #007bff;
          color: #fff;
          padding: 5px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .frbformtable button:hover {
          background-color: #0056b3;
        }
      `}</style>
    </div>
  );
};

export default CustomerFormHistory;
