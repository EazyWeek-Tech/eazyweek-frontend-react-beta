import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const TOKEN = () => localStorage.getItem("token");

const Header = ({ onToggleSidebar, onLogout }) => {
  const navigate    = useNavigate();
  const dropdownRef = useRef();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user,            setUser]            = useState(null);
  const [imageSrc,        setImageSrc]        = useState("images/defaultuser.png");
  const [hierarchy,       setHierarchy]       = useState({ entity: null, zones: [] });
  const [selectedClinic,  setSelectedClinic]  = useState(null);
  const [dropdownOpen,    setDropdownOpen]    = useState(false);
  const [sessionCenterCode, setSessionCenterCode] = useState("");
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

  /* ── Read session center ─────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("userSession") || sessionStorage.getItem("userSession");
      if (!raw) {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        setSessionCenterCode(u?.centerCode || "");
        return;
      }
      const s = JSON.parse(raw);
      const code = s?.data?.loginCode || s?.data?.LoginCode || s?.loginCode || s?.LoginCode || "";
      setSessionCenterCode(code || "");
    } catch { setSessionCenterCode(""); }
  }, []);

  /* ── Session API ─────────────────────────────────────────────────────── */
  const setSessionToApi = async (centerCode) => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    await fetch(`${API_BASE_URL}/api/session/set`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
      body: JSON.stringify({
        LoginCode: centerCode,
        TopCode:   centerCode,
        userID:    u?.employeeCode || u?.userId || "",
      }),
    });
  };

  const getSessionFromApi = async () => {
    const res  = await fetch(`${API_BASE_URL}/api/session/get`, {
      method: "GET", credentials: "include",
      headers: { Authorization: `Bearer ${TOKEN()}` },
    });
    const json = await res.json();
    localStorage.setItem("userSession", JSON.stringify(json));
    sessionStorage.setItem("userSession", JSON.stringify(json));
    const code = json?.data?.loginCode || json?.data?.LoginCode || json?.loginCode || "";
    setSessionCenterCode(code);
    return json;
  };

  /* ── Fetch hierarchy ─────────────────────────────────────────────────── */
  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/api/Settings/Centre/Hierarchy`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        });
        const json = await res.json();
        const data = json.data ?? json;
        setHierarchy({ entity: data.entity || null, zones: data.zones || [] });

        // Resolve selected clinic from session code
        const allClinics = [
          ...(data.entity ? [data.entity] : []),
          ...(data.zones || []).flatMap(z => z.clinics),
        ];
        const match = allClinics.find(c => c.code === sessionCenterCode);
        if (match) {
          setSelectedClinic(match);
        } else {
          // fallback: user's centerCode from JWT
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          const fb = allClinics.find(c => c.code === u?.centerCode) || allClinics[0] || null;
          setSelectedClinic(fb);
        }
      } catch (err) {
        console.error("Failed to load clinic hierarchy", err);
        showToast("Failed to load clinics", "error");
      }
    };
    fetchHierarchy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCenterCode]);

  /* ── Outside click ───────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Clinic switch ───────────────────────────────────────────────────── */
  const handleClinicChange = async (clinic) => {
    if (!clinic?.code || clinic.code === selectedClinic?.code) {
      setDropdownOpen(false); return;
    }
    try {
      setSelectedClinic(clinic);
      setDropdownOpen(false);

      const res  = await fetch(`${API_BASE_URL}/api/auth/switch-clinic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({ centerCode: clinic.code }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("token", data.data.token);
        // Merge isEntityLevel into user object so all pages can read it
        const updatedUser = {
          ...data.data.user,
          isEntityLevel: !!clinic.isEntity,
          centerCode:    clinic.code,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        // Even if switch-clinic fails, store entity level flag
        const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({
          ...existingUser,
          isEntityLevel: !!clinic.isEntity,
          centerCode:    clinic.code,
        }));
      }

      await setSessionToApi(clinic.code);
      await getSessionFromApi();

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
          <span className="c-name">{selectedClinic?.name || "Clinic"}</span>
        </div>

        <div className="hdr-rhs">
          {/* ── Clinic hierarchy dropdown ── */}
          <div className="clinic-dropdown" ref={dropdownRef}>
            <div className="clinic-selected" onClick={() => setDropdownOpen(p => !p)}>
              {selectedClinic?.name || "Select Clinic"}
              <span className="arrow">▾</span>
            </div>

            {dropdownOpen && (
              <div className="clinic-options">
                {/* Legal Entity row */}
                {hierarchy.entity && (
                  <div
                    className={`clinic-option entity-row ${hierarchy.entity.code === selectedClinic?.code ? "active" : ""}`}
                    onClick={() => handleClinicChange(hierarchy.entity)}
                  >
                    🏢 {hierarchy.entity.name}
                  </div>
                )}

                {/* Zone groups with clinics */}
                {hierarchy.zones.map(({ zone, clinics }) => (
                  <div key={zone}>
                    {/* Zone label — not clickable */}
                    <div className="zone-label">{zone}</div>
                    {clinics.map(clinic => (
                      <div
                        key={clinic.code}
                        className={`clinic-option clinic-row ${clinic.code === selectedClinic?.code ? "active" : ""}`}
                        onClick={() => handleClinicChange(clinic)}
                      >
                        {clinic.name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
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
        .clinic-dropdown { position: relative; font-family: Inter, sans-serif; margin-right: 20px; z-index: 999; }
        .clinic-selected { background: white; border: 1px solid #ccc; padding: 8px 12px; border-radius: 6px; cursor: pointer; min-width: 180px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
        .clinic-options { position: absolute; top: calc(100% + 4px); left: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; width: 240px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 360px; overflow-y: auto; padding: 6px 0; }

        /* Entity row */
        .entity-row { padding: 10px 14px; font-size: 13px; font-weight: 700; color: #334b71; cursor: pointer; border-bottom: 1px solid #f1f5f9; }
        .entity-row:hover { background: #f0f4fa; }
        .entity-row.active { background: #e6eef8; }

        /* Zone label — not clickable */
        .zone-label { padding: 8px 14px 4px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; }

        /* Clinic rows indented */
        .clinic-row { padding: 8px 14px 8px 24px; font-size: 13px; color: #374151; cursor: pointer; }
        .clinic-row:hover { background: #f4f6fa; }
        .clinic-row.active { background: #e8f0fe; font-weight: 600; color: #334b71; }

        .arrow { font-size: 11px; color: #94a3b8; }
        .menu-divider { height: 1px; background: #e5e7eb; margin: 4px 0; pointer-events: none; }
        .hdr-toast { position: fixed; top: 18px; right: 18px; padding: 10px 14px; border-radius: 10px; font-family: Inter, sans-serif; font-size: 13px; font-weight: 600; box-shadow: 0 6px 18px rgba(0,0,0,0.12); z-index: 99999; }
        .hdr-toast.success { background: #e9f8ee; border: 1px solid #b8ebc6; color: #166534; }
        .hdr-toast.error { background: #fdecec; border: 1px solid #f8b4b4; color: #991b1b; }
      `}</style>
    </header>
  );
};

export default Header;