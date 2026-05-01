import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const TOKEN = () => localStorage.getItem("token");

const Header = ({ onToggleSidebar, onLogout }) => {
  const navigate      = useNavigate();
  const dropdownRef   = useRef();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser]                       = useState(null);
  const [imageSrc, setImageSrc]               = useState("images/defaultuser.png");
  const [clinics, setClinics]                 = useState([]);
  const [selectedClinic, setSelectedClinic]   = useState(null);
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const [sessionCenterCode, setSessionCenterCode] = useState("");
  const [toast, setToast]                     = useState({ show: false, type: "success", text: "" });
  const toastTimerRef = useRef(null);

  /* ── No Zone mapping ─────────────────────────────────────────────────── */
  const NOZONE_UI_CODE      = "NOZONE";
  const NOZONE_UI_NAME      = "Centriq Clinics";
  const NOZONE_SESSION_CODE = "Centriq Clinics";

  const toSessionCode   = (uiCode)      => uiCode === NOZONE_UI_CODE ? NOZONE_SESSION_CODE : uiCode;
  const fromSessionCode = (sessionCode) => sessionCode === NOZONE_SESSION_CODE ? NOZONE_UI_CODE : sessionCode;

  /* ── Toast ───────────────────────────────────────────────────────────── */
  const showToast = (text, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, type, text });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, show: false })), 2500);
  };
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  /* ── Load user from storage ──────────────────────────────────────────── */
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

  /* ── Read initial session center from storage ────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("userSession") || sessionStorage.getItem("userSession");
      if (!raw) {
        // Fallback: use centerCode from JWT user
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        setSessionCenterCode(u?.centerCode || "");
        return;
      }
      const s = JSON.parse(raw);
      // Node session returns: { success, message, data: { sessionId, loginCode, topCode, userID } }
      const code =
        s?.data?.loginCode ||
        s?.data?.LoginCode ||
        s?.loginCode       ||
        s?.LoginCode       ||
        s?.data?.topCode   ||
        s?.topCode         ||
        "";
      setSessionCenterCode(code || "");
    } catch {
      setSessionCenterCode("");
    }
  }, []);

  /* ── Session API calls ───────────────────────────────────────────────── */
  const setSessionToApi = async (centerCode) => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const sessionCode = toSessionCode(centerCode);
    await fetch(`${API_BASE_URL}/api/session/set`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
      body: JSON.stringify({
        LoginCode: sessionCode,
        TopCode:   sessionCode,
        userID:    u?.employeeCode || u?.userId || "", // ✅ Node uses employeeCode
      }),
    });
  };

  const getSessionFromApi = async () => {
    const res  = await fetch(`${API_BASE_URL}/api/session/get`, {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${TOKEN()}` },
    });
    const json = await res.json();
    // Store full response so we can read data.loginCode later
    localStorage.setItem("userSession", JSON.stringify(json));
    sessionStorage.setItem("userSession", JSON.stringify(json));

    const code =
      json?.data?.loginCode ||
      json?.data?.LoginCode ||
      json?.loginCode       ||
      json?.LoginCode       || "";
    setSessionCenterCode(code);
    return json;
  };

  /* ── Fetch clinics — runs when sessionCenterCode is known ────────────── */
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/api/master/LoadCenters`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        });
        const json = await res.json();
        const data = json.data || json;

        const mapped = (Array.isArray(data) ? data : []).map((c) => ({
          code: (c.centerCode || c.code || "").toString().trim(),
          name: (c.centerName || c.name || "").toString().trim(),
        })).filter((x) => x.code && x.name);

        const noZone    = { code: NOZONE_UI_CODE, name: NOZONE_UI_NAME };
        const finalList = [noZone, ...mapped];
        setClinics(finalList);

        // ✅ Set selected clinic based on session center code
        const uiCode = fromSessionCode(sessionCenterCode);
        const match  = uiCode
          ? finalList.find((c) => c.code === uiCode)
          : null;

        // If no match from session, use user's centerCode from JWT
        if (!match) {
          const u         = JSON.parse(localStorage.getItem("user") || "{}");
          const userCode  = fromSessionCode(u?.centerCode || "");
          const userMatch = finalList.find((c) => c.code === userCode);
          setSelectedClinic(userMatch || finalList[0] || null);
        } else {
          setSelectedClinic(match);
        }
      } catch (err) {
        console.error("Failed to load clinics", err);
        showToast("Failed to load clinics", "error");
      }
    };
    fetchClinics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCenterCode]);

  /* ── Outside click ───────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Clinic change ───────────────────────────────────────────────────── */
  const handleClinicChange = async (clinic) => {
    try {
      if (!clinic?.code || clinic.code === selectedClinic?.code) {
        setDropdownOpen(false);
        return;
      }

      setSelectedClinic(clinic);
      setDropdownOpen(false);

      // 1. Re-issue JWT token with new clinic role
      const res  = await fetch(`${API_BASE_URL}/api/auth/switch-clinic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({ centerCode: toSessionCode(clinic.code) }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
      }

      // 2. Update session
      await setSessionToApi(clinic.code);
      await getSessionFromApi();

      // 3. Reload to apply new role + center throughout the app
      navigate("/dashboard", { replace: true });
      window.location.reload();

    } catch (e) {
      console.error("Failed to switch clinic", e);
      showToast("Failed to change clinic", "error");
    }
  };

  /* ── Logout ──────────────────────────────────────────────────────────── */
  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE_URL}/api/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      onLogout?.();
      navigate("/login", { replace: true });
      window.location.reload();
    }
  };

  /* ── Reset password ──────────────────────────────────────────────────── */
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
          <span className="c-name">{selectedClinic?.name || "Clinic"}</span>
        </div>

        <div className="hdr-rhs">
          {/* Clinic dropdown */}
          <div className="clinic-dropdown" ref={dropdownRef}>
            <div className="clinic-selected" onClick={() => setDropdownOpen((p) => !p)}>
              {selectedClinic?.name || "Select Clinic"}
              <span className="arrow">▾</span>
            </div>
            {dropdownOpen && (
              <div className="clinic-options">
                {clinics.map((clinic) => (
                  <div
                    key={clinic.code}
                    className={`clinic-option ${clinic.code === selectedClinic?.code ? "active" : ""}`}
                    onClick={() => handleClinicChange(clinic)}
                  >
                    {clinic.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="userdd" onClick={() => setShowProfileMenu((p) => !p)}>
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
        .clinic-dropdown { position: relative; font-family: Inter, sans-serif; margin-right: 20px; z-index: 999; }
        .clinic-selected { background: white; border: 1px solid #ccc; padding: 8px 12px; border-radius: 6px; cursor: pointer; min-width: 160px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
        .clinic-options { position: absolute; top: 100%; left: 0; background: white; border: 1px solid #ccc; border-radius: 6px; margin-top: 4px; width: 100%; box-shadow: 0 2px 6px rgba(0,0,0,0.15); max-height: 300px; overflow-y: auto; }
        .clinic-option { padding: 10px 12px; cursor: pointer; }
        .clinic-option:hover { background: #f4f4f4; }
        .clinic-option.active { background: #e8f0fe; font-weight: bold; }
        .arrow { margin-left: 8px; }
        .menu-divider { height: 1px; background: #e5e7eb; margin: 4px 0; pointer-events: none; }
        .hdr-toast { position: fixed; top: 18px; right: 18px; padding: 10px 14px; border-radius: 10px; font-family: Inter, sans-serif; font-size: 13px; font-weight: 600; box-shadow: 0 6px 18px rgba(0,0,0,0.12); z-index: 99999; animation: hdrToastIn 0.18s ease-out; }
        .hdr-toast.success { background: #e9f8ee; border: 1px solid #b8ebc6; color: #166534; }
        .hdr-toast.error { background: #fdecec; border: 1px solid #f8b4b4; color: #991b1b; }
        @keyframes hdrToastIn { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </header>
  );
};

export default Header;