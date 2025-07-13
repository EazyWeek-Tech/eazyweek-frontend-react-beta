import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

const ClinicForm = ({ onBack }) => {
  const [zone, setZone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = { zone, code, name, address };

    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/ClinicInsert`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setSuccess("Clinic added successfully.");
        setZone("");
        setCode("");
        setName("");
        setAddress("");
        setTimeout(() => onBack(), 1500);
      } else {
        setError(result.message || "Failed to add clinic.");
      }
    } catch (err) {
      setError("An error occurred while saving the clinic.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="clinic-form">
      <div>
        <label>Zone :</label>
        <select value={zone} onChange={(e) => setZone(e.target.value)} required>
          <option value="">-- Select Zone --</option>
          <option value="North">North</option>
          <option value="South">South</option>
          <option value="East">East</option>
          <option value="West">West</option>
        </select>
      </div>

      <div>
        <label>Clinic Code :</label>
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
      </div>

      <div>
        <label>Clinic Name :</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label>Clinic Address :</label>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={4} required />
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      <div className="button-row">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onBack}>Back</button>
      </div>

      <style jsx>{`
        .clinic-form {
          max-width: 500px;
          margin: 40px auto;
          padding: 20px;
        }

        .clinic-form div {
          margin-bottom: 15px;
          display: flex;
          flex-direction: column;
        }

        .clinic-form label {
          margin-bottom: 5px;
          font-weight: 500;
        }

        .clinic-form input,
        .clinic-form select,
        .clinic-form textarea {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }

        .button-row {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
        }

        .button-row button {
          padding: 10px 20px;
          font-size: 14px;
          background-color: #334b71;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .button-row button[disabled] {
          background-color: #6c757d;
          cursor: not-allowed;
        }

        .button-row button:hover:not([disabled]) {
          background-color: #22314f;
        }
      `}</style>
    </form>
  );
};

export default ClinicForm;
