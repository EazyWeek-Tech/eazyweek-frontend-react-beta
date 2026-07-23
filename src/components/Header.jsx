import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import ClinicSwitcher from "./ClinicSwitcher";

const TOKEN = () => localStorage.getItem("token");

const Header = ({ onToggleSidebar, onLogout }) => {
  const navigate    = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user,            setUser]            = useState(null);
  const [imageSrc,        setImageSrc]        = useState("images/defaultuser.png");
  const [toast,           setToast]           = useState({ show: false, type: "success", text: "" });
  const toastTimerRef = useRef(null);

  /* ── Toast ───────────────────────────────────────────────────────────── */
  const showToast = (text, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, type, text });
    toastTimerRef.current = setTimeout(() => setToast(p => ({ ...p, show: false })), 2500);
  };
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  /* ── Load user ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!stored) return;
    const parsed = JSON.parse(stored);
    setUser(parsed);
    if (parsed?.empPicBinaryValue) {
      setImageSrc(`data:image/jpeg;base64,${parsed.empPicBinaryValue}`);
    } else if (parsed?.empImageName) {
      setImageSrc(
        parsed.empImageName.startsWith("http")
          ? parsed.empImageName
          : `${API_BASE_URL}/${parsed.empImageName}`
      );
    }
  }, []);

  const handleImageError = () => setImageSrc("images/defaultuser.png");

  /* ── Logout ──────────────────────────────────────────────────────────── */
  const handleLogout = async (e) => {
    e.preventDefault();
    try { await fetch(`${API_BASE_URL}/api/logout`, { method: "POST", credentials: "include" }).catch(() => {}); }
    finally {
      localStorage.clear(); sessionStorage.clear();
      onLogout?.();
      navigate("/login", { replace: true });
      window.location.reload();
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setShowProfileMenu(false);
    navigate("/reset-password");
  };

  const fullName  = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "User";
  const userEmail = user?.username ?? user?.userName ?? "";

  /* ── UI ──────────────────────────────────────────────────────────────── */
  return (
    <header className="tphdr">
      <div className="hdrflex">
        <div className="hdr-lhs">
          <div className="c-icon" onClick={onToggleSidebar}>
            <i className="bx bx-menu"></i>
          </div>
          <span className="c-name">{user?.centerName || "Clinic"}</span>
        </div>

        <div className="hdr-rhs">
          {/* ── Clinic hierarchy dropdown (shared with the Appointment header) ── */}
          <div style={{ marginRight: 20 }}>
            <ClinicSwitcher variant="light" onError={(m) => showToast(m, "error")} />
          </div>

          {/* User dropdown */}
          <div className="userdd" onClick={() => setShowProfileMenu(p => !p)}>
            <div className="user-top">
              <img src={imageSrc} alt="User" onError={handleImageError} width={36} height={36} />
              <div className="usrdt">
                <h3 className="usrnm">{fullName}</h3>
                <div className="u-c-name">{userEmail}</div>
              </div>
            </div>
            {showProfileMenu && (
              <div className="usrmenu active">
                <ul>
                  <li>
                    <a href="#" onClick={handleResetPassword}>
                      <i className="bx bx-lock-alt" style={{ marginRight: 8 }}></i>
                      Reset Password
                    </a>
                  </li>
                  <li className="menu-divider" />
                  <li>
                    <a href="#" onClick={handleLogout}>
                      <i className="bx bx-log-out" style={{ marginRight: 8 }}></i>
                      Log Out
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast.show && <div className={`hdr-toast ${toast.type}`}>{toast.text}</div>}

      <style>{`
        .modal{z-index: 99;}

        .menu-divider { height: 1px; background: #e5e7eb; margin: 4px 0; pointer-events: none; }
        .hdr-toast { position: fixed; top: 18px; right: 18px; padding: 10px 14px; border-radius: 10px; font-family: Inter, sans-serif; font-size: 13px; font-weight: 600; box-shadow: 0 6px 18px rgba(0,0,0,0.12); z-index: 99999; }
        .hdr-toast.success { background: #e9f8ee; border: 1px solid #b8ebc6; color: #166534; }
        .hdr-toast.error { background: #fdecec; border: 1px solid #f8b4b4; color: #991b1b; }
      `}</style>
    </header>
  );
};

export default Header;