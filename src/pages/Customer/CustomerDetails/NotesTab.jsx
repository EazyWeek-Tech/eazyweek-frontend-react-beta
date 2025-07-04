import React from "react";

const NotesTab = () => {
  return (
    <div className="notes-tab">
      {/* Add Note Section */}
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

        <button className="add-note-btn">Add</button>
      </div>

      {/* Notes List */}
      <div className="notes-list">
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
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "10px" }}>No data available</td>
            </tr>
          </tbody>
        </table>

        <div className="pagination">
          <span>Showing 0 to 0 of 0 entries</span>
          <div className="pagination-links">
            <button disabled>Previous</button>
            <button disabled>Next</button>
          </div>
        </div>
      </div>

      <style>{`
        .notes-tab {
          font-family: Arial, sans-serif;
          font-size: 14px;
          padding: 10px;
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

        .notes-table {
          width: 100%;
          border-collapse: collapse;
        }

        .notes-table th {
          background-color: #f0f0f0;
          padding: 8px;
          border-bottom: 1px solid #ccc;
          text-align: left;
        }

        .notes-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #e0e0e0;
        }

        .pagination {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #555;
        }

        .pagination-links button {
          margin-left: 5px;
          padding: 3px 8px;
          border: 1px solid #ccc;
          background: #f8f8f8;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default NotesTab;
