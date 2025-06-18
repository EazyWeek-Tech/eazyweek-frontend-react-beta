// src/components/Toast.jsx
import React from "react";

const Toast = ({ type = "info", message, onClose }) => {
  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

export default Toast;
