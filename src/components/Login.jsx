import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  
  const getSessionFromApi = async (loginCenterCode, topCenterCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/session/get/${loginCenterCode}/${topCenterCode}`);
      if (!response.ok) throw new Error("Failed to fetch session info");

      const data = await response.json();
      console.log(data);
      console.log("Session API Response:", data);

      // Store session info if needed
      sessionStorage.setItem("userSession", JSON.stringify(data));
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setUserInfo(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    const url = `${API_BASE_URL}/api/Employees/Login/${email}/${password}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Login failed");

      const data = await response.json();
      console.log("Login API Response:", data);

      if (!data || data.length === 0) {
        setError("Invalid credentials.");
      } else {
        const user = data[0];
        setUserInfo(user);

        // Save user to localStorage or sessionStorage
        if (remember) {
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          sessionStorage.setItem("user", JSON.stringify(user));
        }

        // Now: Call session API
        /* const loginCenterCode = user.centerCode || "";
        const topCenterCode = user.topCenterCode || "";
        if (loginCenterCode && topCenterCode) {
          await getSessionFromApi(loginCenterCode, topCenterCode);
        } */

          const loginCenterCode = "Bright";
const topCenterCode = "Bright";
await getSessionFromApi(loginCenterCode, topCenterCode);

        // Fire parent callback
        onLoginSuccess(user);

        // Navigate to dashboard or home (optional)
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError("Login error. Please try again.");
    }
  };

  return (
    <div className="overlay">
      <div className="popup-container">
        <main>
          <div className="form-container">
            <div className="form active">
              <div className="l-logo">
                <img src="/images/HomeLogo.png" alt="Logo" width="180" />
              </div>
              <p className="subtitle">Sign in to continue to your account</p>

              {error && <div className="message error">{error}</div>}
              {userInfo && (
                <div className="message success">
                  Welcome {userInfo.firstName} {userInfo.lastName}!
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <img
                    src="https://api.iconify.design/mdi:email-outline.svg"
                    alt="Email"
                    className="input-icon"
                  />
                  <input
                    type="text"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <img
                    src="https://api.iconify.design/mdi:lock-outline.svg"
                    alt="Password"
                    className="input-icon"
                  />
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="remember-forgot">
                  <label className="remember">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <a href="#" className="forgot-link">
                    Forgot Password?
                  </a>
                </div>

                <button type="submit" className="signup-btn">
                  Sign In
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
