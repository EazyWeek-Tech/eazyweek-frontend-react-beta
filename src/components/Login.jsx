import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const commonHeaders = {
    "Content-Type": "application/json",
  };

  // helper that returns headers suitable for the method. We keep the canonical
  // object intact but omit Content-Type for GET requests to avoid preflight/CORS
  // issues while still storing the canonical header shape in the file.
  const headersFor = (method = "GET") => {
    if (String(method).toUpperCase() === "GET") {
      const { ["Content-Type"]: _, ...rest } = commonHeaders;
      return rest;
    }
    return commonHeaders;
  };

  const getSessionFromApi = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/session/get`, {
        method: "GET",
        credentials: "include",
        headers: headersFor("GET"),
      });

      if (!response.ok) throw new Error("Failed to fetch session info");

      const data = await response.json();
      console.log("Session GET Response:", data);

      localStorage.setItem("userSession", JSON.stringify(data));

    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  const setSessionToApi = async ({ user }) => {
  try {
    const centerCode =
      user?.centerCode ||
      user?.CenterCode ||
      user?.center_code ||
      user?.CENTERCODE ||
      "";

    const payload = {
      LoginCode: centerCode,
      TopCode: centerCode,
      userID: user?.employeeCode || "", // ✅ changed from userId to employeeCode
    };

    console.log("Session Set Payload:", payload);

    const response = await fetch(`${API_BASE_URL}/api/session/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!response.ok) throw new Error(`Failed to set session: ${response.status}`);
    console.log("Session Set Response:", await response.text());

  } catch (error) {
    console.error("Error setting session:", error);
  }
};



  const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);
  setUserInfo(null);
  setLoading(true);

  if (!email || !password) {
    setError("Email and password are required.");
    setLoading(false);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });

    const data = await response.json();
    console.log("Login API Response:", data);

    if (!response.ok || !data.success) {
      setError(data.message || "Invalid credentials.");
      setLoading(false);
      return;
    }

    const { user, token } = data.data;

    // Store token and user
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("remember", remember ? "1" : "0");

    // Set session with centerCode (keeping existing session logic)
    await setSessionToApi({ user });
    await getSessionFromApi();

    onLoginSuccess(user);
    // In Login.js handleSubmit, after onLoginSuccess(user):
const isFirst = await fetch(`${API_BASE_URL}/api/employee/first-login-check?employeeCode=${user.employeeCode}`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

if (isFirst.data?.isFirstLogin) {
  // show FirstLoginModal before navigating
  setShowFirstLoginModal(true); // add this state
} else {
  navigate("/dashboard", { replace: true });
}
    //navigate("/dashboard", { replace: true });

  } catch (err) {
    console.error(err);
    setError("Login error. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <div className="overlay">
        <div className="popup-container">
          <main>
            <div className="form-container">
              <div className="form active">
                <div className="l-logo">
                  <img
                    src="https://insightlive.azurewebsites.net/ImageAssets/NNL.png"
                    alt="Logo"
                    width="180"
                  />
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

                  <button type="submit" className="signup-btn" disabled={loading}>
                    {loading ? "Signing In....." : "Sign In"}
                  </button>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>

      {loading && (
        <div className="loader-wrapper">
          <div className="loader"></div>
        </div>
      )}

      <style>
        {`
          .loader-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }

          .loader {
            border: 6px solid #f3f3f3;
            border-top: 6px solid #3E5D8A;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default Login;
