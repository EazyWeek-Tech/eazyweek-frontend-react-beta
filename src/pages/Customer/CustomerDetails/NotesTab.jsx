import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const NotesTab = ({ custId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Change this to adjust how many items are shown per page

  // Fetch notes for the customer
  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/Customer/FetchCustomerAppointment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custID: custId }),
          credentials: "include",
        });

        if (!response.ok) throw new Error("Error fetching notes");
        const data = await response.json();

        // Extract notes from the data
        const notesData = data.map(appt => ({
          serviceDate: appt.serviceDate,
          notes: appt.notes || "No notes available",
          noteType: appt.appointmentType === "Past" ? "Past Appointment" : "Upcoming Appointment",
          addedBy: appt.addedBy,
          center: appt.centerName,
        }));

        setNotes(notesData);
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (custId) fetchNotes(); // Fetch notes only if custId is available
  }, [custId]);

  const renderTable = () => (
    <div className="appt-section">
      <h4 className="sectttl">Notes</h4>
      <table className="notes-table">
        <thead>
          <tr>
            <th>Date Created</th>
            <th>Note</th>
            <th>Note Type</th>
            <th>Added By</th>
            <th>Center</th>
          </tr>
        </thead>
        <tbody>
          {notes.length > 0 ? (
            notes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((note, idx) => (
              <tr key={idx}>
                <td>{note.serviceDate}</td>
                <td>{note.notes}</td>
                <td>{note.noteType}</td>
                <td>{note.addedBy}</td>
                <td>{note.center}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "10px" }}>
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <span>Page {currentPage} of {Math.ceil(notes.length / itemsPerPage)}</span>
        <div className="pagination-links">
          <button  className="action-btn" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
            Previous
          </button>
          <button className="action-btn" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(notes.length / itemsPerPage)))} disabled={currentPage === Math.ceil(notes.length / itemsPerPage)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );

  const handleAddNote = async () => {
    // Logic for adding a note will go here
    alert("Note added (this is a placeholder action).");
  };

  return (
    <div className="notes-tab">
      {/* Add Note Form */}
      <div className="add-note-section">
        <label className="note-label">Add a Note for this Guest:</label>
        <textarea className="note-textarea" rows="3" placeholder="Enter your note here..."></textarea>

        <div className="note-options">
          <label><input type="checkbox" /> Show on opening Guest History</label>
          <label><input type="checkbox" /> Show during check-in</label>
          <label><input type="checkbox" /> Show when booking Appointment</label>
          <label><input type="checkbox" /> Show when taking payment</label>
          <label><input type="checkbox" /> Private</label>
        </div>

        <button className="add-note-btn" onClick={handleAddNote}>Add</button>
      </div>

      {loading ? <p>Loading notes...</p> : renderTable()}

      <style>{`
        .notes-tab {
          font-family: Arial, sans-serif;
          font-size: 14px;
          padding: 30px;
          width: calc( 100% - 300px )
        }

        .add-note-section {
          margin-bottom: 20px;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
        }

        .note-label {
          font-weight: bold;
          display: block;
          margin-bottom: 10px;
        }

        .action-btn {
          background-color: #334B71;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          margin: 0 0 0 10px;
        }

        .action-btn:disabled{background: #666;}

        .note-options{margin: 0 0 20px;}

        .note-textarea {
          width: 100%;
          padding: 6px;
          border: 1px solid #ccc;
          border-radius: 4px;
          margin-bottom: 10px;
        }

        .note-options label {
          display: inline-block;
          margin-right: 15px;
          margin-bottom: 5px;
        }

        .add-note-btn {
          background-color: #334B71;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }

       .notes-table a{color: #334B71;font-weight: 700;}
         .notes-table { width: 100%; border-collapse: collapse; margin: 20px 0;background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
    overflow: hidden; }
        .notes-table td {padding: 12px 18px;
    font-size: 14px;
    color: #0f172a;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
 }
        .notes-table th { background: #f8fafc;
    color: #0f172a;
    font-weight: 700;
    font-size: 14px;
    text-align: left;
    padding: 14px 18px;
    border-bottom: 1px solid #e2e8f0;
    letter-spacing: .2px; }

        .pagination {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #555;
        }

      `}</style>
    </div>
  );
};

export default NotesTab;
