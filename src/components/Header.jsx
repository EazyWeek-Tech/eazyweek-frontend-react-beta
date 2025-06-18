import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Header = ({ onToggleSidebar, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.clear();
    onLogout(); // Notify parent
    navigate("/login", { replace: true });
  };

  const fullName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "User";
  const centerName = user?.centerName ?? "Clinic";
  const userEmail = user?.userName ?? "user@clinic.com";
  const imageSrc = user?.empImageName
    ? `https://localhost:44317/uploads/${user.empImageName}`
    : "images/user.png";

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
          <div className="srch-div">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="0.5" y="0.5" width="47" height="47" rx="23.5" stroke="#E9EDF5" />
              <path
                d="M23 31C27.4183 31 31 27.4183 31 23C31 18.5817 27.4183 15 23 15C18.5817 15 15 18.5817 15 23C15 27.4183 18.5817 31 23 31Z"
                stroke="#3F4942"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M33 33L28.65 28.65"
                stroke="#3F4942"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="noti-div">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="0.5" y="0.5" width="47" height="47" rx="23.5" stroke="#E9EDF5" />
              <path
                d="M30 20C30 18.4087 29.3679 16.8826 28.2426 15.7574C27.1174 14.6321 25.5913 14 24 14C22.4087 14 20.8826 14.6321 19.7574 15.7574C18.6321 16.8826 18 18.4087 18 20C18 27 15 29 15 29H33C33 29 30 27 30 20Z"
                stroke="#3F4942"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M25.73 33C25.5542 33.3031 25.3019 33.5547 24.9982 33.7295C24.6946 33.9044 24.3504 33.9965 24 33.9965C23.6496 33.9965 23.3054 33.9044 23.0018 33.7295C22.6982 33.5547 22.4458 33.3031 22.27 33"
                stroke="#3F4942"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="userdd" onClick={() => setShowProfileMenu((prev) => !prev)}>
            <div className="user-top">
              <img src={imageSrc} alt="User" />
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
                  <li>
                    <a href="#">Profile</a>
                  </li>
                  <li>
                    <a href="#" onClick={handleLogout}>Log Out</a>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
