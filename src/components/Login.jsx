import React, { useState } from "react";
import { API_BASE_URL } from "../config";

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

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
      console.log("Data");
      console.log(data);

      if (data.length === 0) {
        setError("Invalid credentials.");
      } else {
        const user = data[0];
        setUserInfo(user);

        if (remember) {
  localStorage.setItem("user", JSON.stringify(user));
} else {
  localStorage.setItem("user", JSON.stringify(user));
}

        onLoginSuccess(user);
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
                <img
                  src="/images/HomeLogo.png"
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
