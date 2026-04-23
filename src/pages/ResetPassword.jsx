import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

/* ─────────────────────────────────────────────
   Password strength checker
───────────────────────────────────────────── */
const getStrength = (pwd) => {
  const checks = {
    length:  pwd.length >= 8,
    upper:   /[A-Z]/.test(pwd),
    number:  /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#e24b4a", "#ef9f27", "#639922", "#1d9e75"];
  return { checks, score, label: labels[score], color: colors[score] };
};

/* ─────────────────────────────────────────────
   Eye toggle icon
───────────────────────────────────────────── */
const EyeIcon = ({ visible }) =>
  visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const ResetPassword = () => {
  const navigate = useNavigate();

  const [employeeCode, setEmployeeCode] = useState("");
  const [username, setUsername]         = useState("");
  const [newPassword, setNewPassword]   = useState("");
  const [confirmPwd, setConfirmPwd]     = useState("");
  const [showNew, setShowNew]           = useState(false);
  const [showConf, setShowConf]         = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [toast, setToast]               = useState({ show: false, type: "success", text: "" });

  // Pre-fill employee code from session
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (!stored) return;
      const user = JSON.parse(stored);
      if (user?.userId)   setEmployeeCode(user.userId);
      if (user?.userName) setUsername(user.userName);
    } catch {}
  }, []);

  const strength    = getStrength(newPassword);
  const passwordsMatch = newPassword === confirmPwd && confirmPwd.length > 0;
  const canSave =
    employeeCode.trim().length > 0 &&
    strength.score >= 3 &&
    passwordsMatch;

  /* ── toast ── */
  const showToast = (text, type = "success") => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3000);
  };

  /* ── API call ── */
  const handleConfirmReset = async () => {
    setShowModal(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Employees/ResetPassword`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: employeeCode.trim(),
          newPassword,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(errText || `HTTP ${res.status}`);
      }

      showToast("Password reset successfully.", "success");

      // clear fields after success
      setNewPassword("");
      setConfirmPwd("");
    } catch (err) {
      console.error("Reset password error:", err);
      showToast(err.message || "Failed to reset password.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  return (
    <div className="rp-page">

      {/* ── Page header ── */}
      <div className="rp-page-header">
        <button className="rp-back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <div>
          <h1 className="rp-title">Reset Password</h1>
          <p className="rp-subtitle">Update your account password below.</p>
        </div>
      </div>

      {/* ── Card ── */}
      <div className="rp-card">

        {/* Employee Code */}
        <div className="rp-field">
          <label className="rp-label">Employee Code</label>
          <input
            className="rp-input"
            type="text"
            value={employeeCode}
            disabled
            onChange={(e) => setEmployeeCode(e.target.value)}
            placeholder="e.g. CENT-00101"
          />
        </div>

        {/* Username — read only */}
        <div className="rp-field">
          <label className="rp-label">Username</label>
          <input
            className="rp-input rp-input-disabled"
            type="text"
            value={username}
            disabled
            placeholder="Username"
          />
        </div>

        {/* New Password */}
        <div className="rp-field">
          <label className="rp-label">New Password</label>
          <div className="rp-pwd-wrap">
            <input
              className="rp-input"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={{ paddingRight: 40 }}
            />
            <button
              className="rp-eye"
              type="button"
              onClick={() => setShowNew((p) => !p)}
              tabIndex={-1}
            >
              <EyeIcon visible={showNew} />
            </button>
          </div>

          {/* Strength bar */}
          {newPassword.length > 0 && (
            <>
              <div className="rp-strength-bar">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rp-strength-seg"
                    style={{
                      background: i <= strength.score ? strength.color : "#e5e7eb",
                    }}
                  />
                ))}
              </div>
              <span className="rp-strength-label" style={{ color: strength.color }}>
                {strength.label}
              </span>

              {/* Rules */}
              <div className="rp-rules">
                {[
                  { key: "length",  text: "At least 8 characters" },
                  { key: "upper",   text: "One uppercase letter"  },
                  { key: "number",  text: "One number"            },
                  { key: "special", text: "One special character" },
                ].map(({ key, text }) => (
                  <div key={key} className={`rp-rule ${strength.checks[key] ? "pass" : ""}`}>
                    <span className="rp-rule-dot" />
                    {text}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Confirm Password */}
        <div className="rp-field">
          <label className="rp-label">Confirm Password</label>
          <div className="rp-pwd-wrap">
            <input
              className="rp-input"
              type={showConf ? "text" : "password"}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Re-enter new password"
              style={{ paddingRight: 40 }}
            />
            <button
              className="rp-eye"
              type="button"
              onClick={() => setShowConf((p) => !p)}
              tabIndex={-1}
            >
              <EyeIcon visible={showConf} />
            </button>
          </div>
          {confirmPwd.length > 0 && !passwordsMatch && (
            <span className="rp-mismatch">Passwords do not match</span>
          )}
        </div>

        {/* Actions */}
        <div className="rp-actions">
          <button
            className="rp-btn rp-btn-ghost"
            type="button"
            onClick={() => { setNewPassword(""); setConfirmPwd(""); }}
          >
            Clear
          </button>
          <button
            className="rp-btn rp-btn-primary"
            type="button"
            disabled={!canSave || loading}
            onClick={() => setShowModal(true)}
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── Confirmation modal ── */}
      {showModal && (
        <div className="rp-overlay" onClick={() => setShowModal(false)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ba7517" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="rp-modal-title">Confirm Password Reset</h2>
            <p className="rp-modal-body">
              Are you sure you want to reset the password for{" "}
              <strong>{employeeCode}</strong>? This action cannot be undone.
            </p>
            <div className="rp-modal-actions">
              <button
                className="rp-btn rp-btn-ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="rp-btn rp-btn-primary"
                onClick={handleConfirmReset}
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast.show && (
        <div className={`rp-toast ${toast.type}`}>{toast.text}</div>
      )}

      {/* ── Styles ── */}
      <style>{`
        .rp-page {
          max-width: 520px;
          margin: 0 auto;
          padding: 2rem 1.25rem;
          font-family: Inter, sans-serif;
        }

        /* Header */
        .rp-page-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 1.75rem;
        }
        .rp-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
          color: #374151;
          margin-top: 4px;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .rp-back-btn:hover { background: #f3f4f6; }
        .rp-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 4px;
        }
        .rp-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        /* Card */
        .rp-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
        }

        /* Fields */
        .rp-field { margin-bottom: 1.25rem; }
        .rp-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }
        .rp-input {
          width: 100%;
          height: 38px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 0 12px;
          font-size: 14px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .rp-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .rp-input-disabled {
          background: #f9fafb;
          color: #6b7280;
          cursor: not-allowed;
        }

        /* Password wrap */
        .rp-pwd-wrap { position: relative; }
        .rp-eye {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          color: #9ca3af;
          display: flex;
          align-items: center;
        }
        .rp-eye:hover { color: #374151; }

        /* Strength */
        .rp-strength-bar {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }
        .rp-strength-seg {
          height: 3px;
          flex: 1;
          border-radius: 2px;
          transition: background 0.2s;
        }
        .rp-strength-label {
          font-size: 12px;
          font-weight: 500;
          margin-top: 4px;
          display: block;
        }

        /* Rules */
        .rp-rules {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 8px;
        }
        .rp-rule {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          color: #9ca3af;
          transition: color 0.2s;
        }
        .rp-rule.pass { color: #374151; }
        .rp-rule-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d1d5db;
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .rp-rule.pass .rp-rule-dot { background: #1d9e75; }

        /* Mismatch */
        .rp-mismatch {
          display: block;
          font-size: 12px;
          color: #e24b4a;
          margin-top: 5px;
        }

        /* Actions */
        .rp-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 1rem;
          border-top: 1px solid #f3f4f6;
          margin-top: 0.5rem;
        }
        .rp-btn {
          height: 36px;
          padding: 0 18px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .rp-btn-ghost {
          background: #fff;
          border: 1px solid #d1d5db;
          color: #374151;
        }
        .rp-btn-ghost:hover { background: #f9fafb; }
        .rp-btn-primary {
          background: #111827;
          border: 1px solid transparent;
          color: #fff;
        }
        .rp-btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .rp-btn-primary:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        /* Modal overlay */
        .rp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: rpFadeIn 0.18s ease-out;
        }
        .rp-modal {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          width: 360px;
          max-width: 90vw;
          animation: rpSlideUp 0.18s ease-out;
        }
        .rp-modal-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #faeeda;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }
        .rp-modal-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px;
        }
        .rp-modal-body {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 1.25rem;
        }
        .rp-modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        /* Toast */
        .rp-toast {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          z-index: 99999;
          box-shadow: 0 6px 18px rgba(0,0,0,0.12);
          animation: rpFadeIn 0.2s ease-out;
        }
        .rp-toast.success {
          background: #e9f8ee;
          border: 1px solid #b8ebc6;
          color: #166534;
        }
        .rp-toast.error {
          background: #fdecec;
          border: 1px solid #f8b4b4;
          color: #991b1b;
        }

        @keyframes rpFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rpSlideUp {
          from { transform: translateY(10px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;