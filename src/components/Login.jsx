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
  
  const getSessionFromApi = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/session/get`, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) throw new Error("Failed to fetch session info");

    const data = await response.json();
    console.log("Session GET Response:", data);

    sessionStorage.setItem("userSession", JSON.stringify(data));
  } catch (error) {
    console.error("Error fetching session:", error);
  }
};

const setSessionToApi = async ({ user }) => {
  console.log(user)
  try {
    const payload = { LoginCode: "Bright", TopCode: "Bright", userID: user.userId };
    const response = await fetch(`${API_BASE_URL}/api/session/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });

    if (!response.ok) throw new Error(`Failed to set session: ${response.status}`);

    console.log("Session Set API Response:", await response.text());
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

  const url = `${API_BASE_URL}/api/Employees/Login/${email}/${password}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
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

      if (remember) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        sessionStorage.setItem("user", JSON.stringify(user));
      }

      //  Now set session based on real user data
      await setSessionToApi({ user });
      await getSessionFromApi();

      onLoginSuccess(user);
      console.log(user)
      navigate("/dashboard", { replace: true });
    }
  } catch (err) {
    console.error(err);
    setError("Login error. Please try again.");
  }finally {
    setLoading(false); // Hide loader
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

    {loading && (
  <div className="loader-wrapper">
    <div className="loader"></div>
  </div>
)}

<style>{ `

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

` }

</style>
    </>
  );
};

export default Login;
