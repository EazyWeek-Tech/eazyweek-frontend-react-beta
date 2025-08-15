import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../config'; 

const Header = ({ onToggleSidebar, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [imageSrc, setImageSrc] = useState("images/defaultuser.png");
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
  const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (stored) {
    const parsedUser = JSON.parse(stored);
    setUser(parsedUser);

    if (parsedUser?.empPicBinaryValue) {
      // ✅ Use base64 image directly and skip API URL check
      setImageSrc(`data:image/jpeg;base64,${parsedUser.empPicBinaryValue}`);
    } else if (parsedUser?.empImageName) {
      const isFullUrl = parsedUser.empImageName.startsWith("http");
      const imagePath = isFullUrl
        ? parsedUser.empImageName
        : `${API_BASE_URL}/${parsedUser.empImageName}`;
      setImageSrc(imagePath); // Use API path only if binary is not present
    } else {
      setImageSrc("images/defaultuser.png");
    }
  }
}, []);



  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        setClinics(data);
        if (data.length) {
          setSelectedClinic(data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch clinics", err);
      }
    };
    fetchClinics();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.clear();
    onLogout();
    navigate("/login", { replace: true });
  };

  const handleImageError = () => {
  if (user?.empPicBinaryValue) {
    setImageSrc(`data:image/jpeg;base64,${user.empPicBinaryValue}`);
  } else {
    setImageSrc("images/defaultuser.png");
  }
};


  const fullName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "User";
  const centerName = user?.centerName ?? "Clinic";
  const userEmail = user?.userName ?? "user@clinic.com";

  return (
    <header className="tphdr">
      <div className="hdrflex">
        <div className="hdr-lhs">
          <div className="c-icon" onClick={onToggleSidebar}>
            <i className="bx bx-menu"></i>
          </div>
          <span className="c-name">{centerName}</span>
        </div>

        <div className="hdr-rhs">
          <div className="clinic-dropdown" ref={dropdownRef}>
            <div
              className="clinic-selected"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {selectedClinic?.name || "Select Clinic"}
              <span className="arrow">▾</span>
            </div>
            {dropdownOpen && (
              <div className="clinic-options">
                <div
  className={`clinic-option ${selectedClinic?.name === "Centriq Clinics" ? "active" : ""}`}
  onClick={() => {
    setSelectedClinic({ name: "Centriq Clinics", code: "CENTRIQ" });
    setDropdownOpen(false);
  }}
>
  Centriq Clinics
</div>

<div className="zone-group">
  <div className="clinic-option zone-label">Zone ▸</div>
  <div className="zone-submenu">
    {clinics.map((clinic) => (
      <div
        key={clinic.code}
        className={`clinic-option ${
          clinic.code === selectedClinic?.code ? "active" : ""
        }`}
        onClick={() => {
          setSelectedClinic(clinic);
          setDropdownOpen(false);
        }}
      >
        {clinic.name}
      </div>
    ))}
  </div>
</div>

              </div>
            )}
          </div>

          <div className="userdd" onClick={() => setShowProfileMenu((prev) => !prev)}>
            <div className="user-top">
              <img src={imageSrc} alt="User" onError={handleImageError} width={36} height={36} />
              <div className="usrdt">
                <h3 className="usrnm">{fullName}</h3>
                <div className="u-c-name">{userEmail}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 6L8 10L12 6"
                  stroke="#121212"
                  strokeWidth="1.33333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {showProfileMenu && (
              <div className="usrmenu active">
                <ul>
                  <li><a href="#">Profile</a></li>
                  <li><a href="#" onClick={handleLogout}>Log Out</a></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
      .zone-group {
  position: relative;
}
.zone-submenu {
  position: absolute;
  left: 100%;
  top: 0;
  background: white;
  border: 1px solid #ccc;
  border-radius: 6px;
  white-space: nowrap;
  display: none;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  z-index: 1000;
}
.zone-group:hover .zone-submenu {
  display: block;
}
.zone-label::after {
  content: '';
}

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
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
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
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        .clinic-option {
          padding: 10px 12px;
          cursor: pointer;
        }
        .clinic-option:hover {
          background: #f4f4f4;
        }
        .clinic-option.active {
          background: #e8f0fe;
          font-weight: bold;
        }
        .arrow {
          margin-left: 8px;
        }
      `}</style>
    </header>
  );
};

export default Header;
