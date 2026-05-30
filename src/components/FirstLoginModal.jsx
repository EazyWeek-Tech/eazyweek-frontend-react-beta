import React, { useState } from "react";
import { API_BASE_URL } from "../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authPost = async (url, body) => {
  const r = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` },
    body: JSON.stringify(body),
  });
  return r.json();
};

/**
 * FirstLoginModal
 * Shown when isFirstLogin = true immediately after login.
 * Employee must set a new password before accessing any module.
 *
 * Props:
 *   employeeCode  — the logged-in employee's code
 *   onDone        — called after successful password reset (dismisses modal)
 */
const FirstLoginModal = ({ employeeCode, onDone }) => {
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error,      setError]      = useState("");
  const [saving,     setSaving]     = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!newPwd || newPwd.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPwd !== confirmPwd)         { setError("Passwords do not match.");                 return; }

    setSaving(true);
    try {
      const res = await authPost(`${API_BASE_URL}/api/employee/ResetPassword`, {
        employeeCode, newPassword: newPwd,
      });
      if (!res.success) { setError(res.message || "Failed to reset password."); return; }

      await authPost(`${API_BASE_URL}/api/employee/FirstLoginDone`, { employeeCode });
      onDone();
    } catch { setError("Network error. Please try again."); }
    finally  { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(7,29,73,.65)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:99999,
      fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:36, width:420,
        boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>

        {/* Icon */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:40 }}>🔐</div>
          <div style={{ fontWeight:800, fontSize:20, color:"#1e293b", marginTop:8 }}>
            Welcome to EazyWeek
          </div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:6 }}>
            For security, you must set a new password before you can access the system.
          </div>
        </div>

        {error && (
          <div style={{ padding:"10px 14px", background:"#fdf3f3", border:"1px solid #f0c4c0",
            borderRadius:8, fontSize:12, color:"#b91c1c", marginBottom:14 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#334b71", marginBottom:5 }}>
            New Password <span style={{ color:"#b91c1c" }}>*</span>
          </label>
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
            placeholder="Minimum 6 characters"
            style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #e2e8f0", borderRadius:8,
              fontSize:13, outline:"none", boxSizing:"border-box" }} />
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#334b71", marginBottom:5 }}>
            Confirm Password <span style={{ color:"#b91c1c" }}>*</span>
          </label>
          <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
            placeholder="Re-enter new password"
            style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #e2e8f0", borderRadius:8,
              fontSize:13, outline:"none", boxSizing:"border-box" }} />
        </div>

        <button onClick={handleSubmit} disabled={saving}
          style={{ width:"100%", padding:"12px", background:"#334b71", color:"#fff",
            border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:"pointer",
            opacity: saving ? 0.7 : 1 }}>
          {saving ? "Setting password…" : "Set New Password & Continue"}
        </button>

        <div style={{ textAlign:"center", fontSize:11, color:"#94a3b8", marginTop:12 }}>
          This action is required. You cannot access EazyWeek until the password is changed.
        </div>
      </div>
    </div>
  );
};

export default FirstLoginModal;