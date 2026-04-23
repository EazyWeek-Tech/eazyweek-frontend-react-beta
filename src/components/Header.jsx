import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const Header = ({ onToggleSidebar, onLogout }) => {
  const navigate = useNavigate();
  const dropdownRef = useRef();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [imageSrc, setImageSrc] = useState("images/defaultuser.png");

  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ✅ Toast state
  const [toast, setToast] = useState({ show: false, type: "success", text: "" });
  const toastTimerRef = useRef(null);

  // ✅ track current session center code (so dropdown picks correctly)
  const [sessionCenterCode, setSessionCenterCode] = useState("");

  /* -------------------- No Zone mapping -------------------- */
  const NOZONE_UI_CODE = "NOZONE";
  const NOZONE_UI_NAME = "Centriq Clinics";
  const NOZONE_SESSION_CODE = "Centriq Clinics";

  const toSessionCenterCode = (uiCode) =>
    uiCode === NOZONE_UI_CODE ? NOZONE_SESSION_CODE : uiCode;

  const fromSessionCenterCode = (sessionCode) =>
    sessionCode === NOZONE_SESSION_CODE ? NOZONE_UI_CODE : sessionCode;

  const clearCenterStickyKeys = () => {
    const keys = ["loginCode", "topCode", "userID", "userId", "LoginCode", "TopCode"];
    try {
      keys.forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      const jsonKeys = ["userSession", "UserSession"];
      jsonKeys.forEach((jk) => {
        const raw = localStorage.getItem(jk) || sessionStorage.getItem(jk);
        if (!raw) return;
        try {
          const obj = JSON.parse(raw);
          delete obj.loginCode;
          delete obj.LoginCode;
          delete obj.topCode;
          delete obj.TopCode;
          delete obj.userID;
          delete obj.userId;
          localStorage.setItem(jk, JSON.stringify(obj));
          sessionStorage.setItem(jk, JSON.stringify(obj));
        } catch {}
      });
    } catch (e) {
      console.error("clearCenterStickyKeys failed", e);
    }
  };

  /* -------------------- headers helper -------------------- */
  const commonHeaders = useMemo(() => ({ "Content-Type": "application/json" }), []);
  const headersFor = (method = "GET") => {
    if (method === "GET") {
      const { ["Content-Type"]: _, ...rest } = commonHeaders;
      return rest;
    }
    return commonHeaders;
  };

  const showToast = (text, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, type, text });
    toastTimerRef.current = setTimeout(() => {
      setToast((p) => ({ ...p, show: false }));
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  /* -------------------- load logged-in user -------------------- */
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

  /* -------------------- read session center from storage (initial) -------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("userSession") || sessionStorage.getItem("userSession");
      if (!raw) return;
      const s = JSON.parse(raw);
      const code = s?.LoginCode || s?.loginCode || s?.TopCode || s?.centerCode || "";
      setSessionCenterCode(code || "");
    } catch {
      setSessionCenterCode("");
    }
  }, []);

  /* -------------------- session APIs -------------------- */
  const setSessionToApi = async (uiCenterCode) => {
    if (!user?.userId) return;
    const centerCode = toSessionCenterCode(uiCenterCode);
    const payload = { LoginCode: centerCode, TopCode: centerCode, userID: user.userId };
    const res = await fetch(`${API_BASE_URL}/api/session/set`, {
      method: "POST",
      credentials: "include",
      headers: headersFor("POST"),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Session set failed (${res.status}): ${t.slice(0, 200)}`);
    }
  };

  const getSessionFromApi = async () => {
    const res = await fetch(`${API_BASE_URL}/api/session/get`, {
      method: "GET",
      credentials: "include",
      headers: headersFor("GET"),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Session get failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    localStorage.setItem("userSession", JSON.stringify(data));
    sessionStorage.setItem("userSession", JSON.stringify(data));
    const code = data?.LoginCode || data?.loginCode || data?.TopCode || data?.centerCode || "";
    setSessionCenterCode(code || "");
    return data;
  };

  /* -------------------- fetch centers -------------------- */
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
          method: "GET",
          credentials: "include",
          headers: headersFor("GET"),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map((c) => ({
          code: (c.centerCode || c.code || "").toString().trim(),
          name: (c.centerName || c.name || "").toString().trim(),
        }));
        const noZoneOption = { code: NOZONE_UI_CODE, name: NOZONE_UI_NAME };
        const finalList = [noZoneOption, ...mapped.filter((x) => x.code && x.name)];
        setClinics(finalList);
        const uiSessionCode = fromSessionCenterCode(sessionCenterCode);
        const match = uiSessionCode ? finalList.find((c) => c.code === uiSessionCode) : null;
        setSelectedClinic(match || finalList[0] || null);
      } catch (err) {
        console.error("Failed to load clinics", err);
        showToast("Failed to load clinics", "error");
      }
    };
    fetchClinics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCenterCode]);

  /* -------------------- outside click -------------------- */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* -------------------- clinic change -------------------- */
  const hardReload = () => window.location.reload();

  const handleClinicChange = async (clinic) => {
    try {
      if (!clinic?.code) return;
      if (clinic.code === selectedClinic?.code) {
        setDropdownOpen(false);
        return;
      }
      setSelectedClinic(clinic);
      setDropdownOpen(false);
      clearCenterStickyKeys();
      await setSessionToApi(clinic.code);
      const newSession = await getSessionFromApi();
      localStorage.setItem("userSession", JSON.stringify(newSession));
      sessionStorage.setItem("userSession", JSON.stringify(newSession));
      navigate("/dashboard", { replace: true });
      hardReload();
    } catch (e) {
      console.error("Failed to update session on clinic change", e);
      showToast("Failed to change clinic session", "error");
    }
  };

  /* -------------------- logout -------------------- */
  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (err) {
        console.error("Storage clear failed", err);
      }
      onLogout?.();
      navigate("/login", { replace: true });
      window.location.reload();
    }
  };

  /* -------------------- reset password -------------------- */
  const handleResetPassword = (e) => {
    e.preventDefault();
    setShowProfileMenu(false);
    navigate("/reset-password");
  };

  const fullName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "User";
  const userEmail = user?.userName ?? "";

  /* ==================== UI ==================== */
  return (
    <header className="tphdr">
      <div className="hdrflex">
        <div className="hdr-lhs">
          <div className="c-icon" onClick={onToggleSidebar}>
            <i className="bx bx-menu"></i>
          </div>
          <span className="c-name">{selectedClinic?.name || "Clinic"}</span>
        </div>

        <div className="hdr-rhs">
          {/* -------- clinic dropdown -------- */}
          <div className="clinic-dropdown" ref={dropdownRef}>
            <div
              className="clinic-selected"
              onClick={() => setDropdownOpen((p) => !p)}
            >
              {selectedClinic?.name || "Select Clinic"}
              <span className="arrow">▾</span>
            </div>

            {dropdownOpen && (
              <div className="clinic-options">
                {clinics.map((clinic) => (
                  <div
                    key={clinic.code}
                    className={`clinic-option ${
                      clinic.code === selectedClinic?.code ? "active" : ""
                    }`}
                    onClick={() => handleClinicChange(clinic)}
                  >
                    {clinic.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* -------- user dropdown -------- */}
          <div className="userdd" onClick={() => setShowProfileMenu((p) => !p)}>
            <div className="user-top">
              <img
                src={imageSrc}
                alt="User"
                onError={handleImageError}
                width={36}
                height={36}
              />
              <div className="usrdt">
                <h3 className="usrnm">{fullName}</h3>
                <div className="u-c-name">{userEmail}</div>
              </div>
            </div>

            {showProfileMenu && (
              <div className="usrmenu active">
                <ul>
                  {/* ✅ Reset Password link — added before logout */}
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

      {/* ✅ Toast */}
      {toast.show && (
        <div className={`hdr-toast ${toast.type}`}>{toast.text}</div>
      )}

      <style>{`
        .clinic-dropdown {
          position: relative;
          font-family: Inter, sans-serif;
          margin-right: 20px;
          z-index: 999;
        }
        .clinic-selected {
          background: white;
          border: 1px solid #ccc;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          min-width: 160px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .clinic-options {
          position: absolute;
          top: 100%;
          left: 0;
          background: white;
          border: 1px solid #ccc;
          border-radius: 6px;
          margin-top: 4px;
          width: 100%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        .clinic-option {
          padding: 10px 12px;
          cursor: pointer;
        }
        .clinic-option:hover { background: #f4f4f4; }
        .clinic-option.active {
          background: #e8f0fe;
          font-weight: bold;
        }
        .arrow { margin-left: 8px; }

        /* ✅ Profile menu divider */
        .menu-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 4px 0;
          pointer-events: none;
        }

        /* ✅ Toast styles */
        .hdr-toast {
          position: fixed;
          top: 18px;
          right: 18px;
          padding: 10px 14px;
          border-radius: 10px;
          font-family: Inter, sans-serif;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 6px 18px rgba(0,0,0,0.12);
          z-index: 99999;
          animation: hdrToastIn 0.18s ease-out;
        }
        .hdr-toast.success {
          background: #e9f8ee;
          border: 1px solid #b8ebc6;
          color: #166534;
        }
        .hdr-toast.error {
          background: #fdecec;
          border: 1px solid #f8b4b4;
          color: #991b1b;
        }
        @keyframes hdrToastIn {
          from { transform: translateY(-8px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </header>
  );
};

export default Header;