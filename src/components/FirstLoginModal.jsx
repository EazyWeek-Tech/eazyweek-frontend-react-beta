import React, { useState } from "react";
import { API_BASE_URL } from "../config";

const getStrength = (pwd) => {
  const checks = {
    length:  pwd.length >= 6,
    upper:   /[A-Z]/.test(pwd),
    number:  /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#e24b4a", "#ef9f27", "#639922", "#1d9e75"];
  return { checks, score, label: labels[score] || "", color: colors[score] || "#ccc" };
};

const EyeIcon = ({ visible }) =>
  visible ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

/**
 * FirstLoginModal
 * Shows when isFirstLogin = true after login.
 * Forces employee to change password before accessing the app.
 *
 * Props:
 *   employeeCode: string
 *   onComplete: () => void — called after successful password change
 */
const FirstLoginModal = ({ employeeCode, onComplete }) => {
  const [newPassword, setNewPassword]   = useState("");
  const [confirmPwd, setConfirmPwd]     = useState("");
  const [showNew, setShowNew]           = useState(false);
  const [showConf, setShowConf]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  const strength = getStrength(newPassword);
  const passwordsMatch = newPassword === confirmPwd && confirmPwd.length > 0;
  const canSave = strength.score >= 2 && passwordsMatch;

  const handleSubmit = async () => {
    if (!canSave) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");

      // 1. Reset password
      const res = await fetch(`${API_BASE_URL}/api/employee/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeCode, newPassword }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to reset password");
        return;
      }

      // 2. Mark first login done
      await fetch(`${API_BASE_URL}/api/employee/first-login-done`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeCode }),
      });

      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Top accent */}
        <div style={s.accent} />

        <div style={s.body}>
          {/* Icon */}
          <div style={s.iconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334B71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h2 style={s.title}>Welcome! Set your password</h2>
          <p style={s.subtitle}>
            This is your first login. Please set a new password to continue.
          </p>

          {error && <div style={s.error}>{error}</div>}

          {/* New password */}
          <div style={s.field}>
            <label style={s.label}>New Password</label>
            <div style={s.pwdWrap}>
              <input
                style={s.input}
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoFocus
              />
              <button style={s.eye} type="button" onClick={() => setShowNew((p) => !p)}>
                <EyeIcon visible={showNew} />
              </button>
            </div>

            {/* Strength bar */}
            {newPassword.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={s.strengthBar}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ ...s.strengthSeg, background: i <= strength.score ? strength.color : "#e5e7eb" }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strength.color, fontWeight: 500 }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={s.field}>
            <label style={s.label}>Confirm Password</label>
            <div style={s.pwdWrap}>
              <input
                style={{ ...s.input, borderColor: confirmPwd && !passwordsMatch ? "#e24b4a" : "#d1d5db" }}
                type={showConf ? "text" : "password"}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-enter password"
              />
              <button style={s.eye} type="button" onClick={() => setShowConf((p) => !p)}>
                <EyeIcon visible={showConf} />
              </button>
            </div>
            {confirmPwd && !passwordsMatch && (
              <span style={{ fontSize: 11, color: "#e24b4a", marginTop: 4, display: "block" }}>Passwords do not match</span>
            )}
          </div>

          <button
            style={{ ...s.btn, opacity: (!canSave || loading) ? 0.5 : 1 }}
            disabled={!canSave || loading}
            onClick={handleSubmit}
          >
            {loading ? "Setting password..." : "Set Password & Continue →"}
          </button>

          <p style={s.note}>You cannot skip this step.</p>
        </div>
      </div>
    </div>
  );
};

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" },
  modal: { background: "#fff", borderRadius: 16, width: 420, maxWidth: "92vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  accent: { height: 5, background: "linear-gradient(90deg, #334B71, #A7D1CD)" },
  body: { padding: "28px 28px 24px" },
  iconWrap: { width: 48, height: 48, borderRadius: 12, background: "#EEF2F8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 6px" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.6 },
  error: { background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" },
  pwdWrap: { position: "relative" },
  input: { width: "100%", padding: "10px 38px 10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#111827" },
  eye: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center" },
  strengthBar: { display: "flex", gap: 4, marginBottom: 4 },
  strengthSeg: { height: 3, flex: 1, borderRadius: 2, transition: "background 0.2s" },
  btn: { width: "100%", padding: "12px", background: "#334B71", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 8, transition: "opacity 0.2s" },
  note: { textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 12, marginBottom: 0 },
};

export default FirstLoginModal;