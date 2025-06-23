// src/components/FormFooter.jsx
import React from "react";

const FormFooter = ({ onCancel, onSave }) => {
  return (
    <div className="apptbtnbar">
      <button
        className="editbtn savebn"
        type="button"
        onClick={onSave} // ✅ Call handler passed from parent
      >
        Save
      </button>
      <button className="restbtn" type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
};

export default FormFooter;
