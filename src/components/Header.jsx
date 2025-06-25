import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../config'; 

const Header = ({ onToggleSidebar, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [imageSrc, setImageSrc] = useState("images/defaultuser.png");

  useEffect(() => {
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (stored) {
      const parsedUser = JSON.parse(stored);
      console.log(parsedUser);
      setUser(parsedUser);
      if (parsedUser?.empImageName) {
        setImageSrc(`${API_BASE_URL}/${parsedUser.empImageName}`);
      }
    }
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.clear();
    onLogout(); // Notify parent
    navigate("/login", { replace: true });
  };

  const handleImageError = () => {
    setImageSrc("images/defaultuser.png");
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
          <div className="srch-div">
            {/* ...Search Icon... */}
          </div>

          <div className="noti-div">
            {/* ...Notification Icon... */}
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
    </header>
  );
};

export default Header;
