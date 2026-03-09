import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const TIMEOUT_MS = 30 * 60 * 1000; // 15 minutes of inactivity

export function useSessionTimeout(onLogout) {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const logout = useCallback(() => {
    // Mirror exact keys from App.jsx handleLogout
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("userSession");
    sessionStorage.removeItem("ssoToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userSession");
    localStorage.removeItem("ssoToken");
    localStorage.removeItem("remember");

    if (onLogout) onLogout(); // clears React state in App
    navigate("/login", { replace: true });
  }, [navigate, onLogout]);

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start on mount

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearTimeout(timerRef.current);
    };
  }, [resetTimer]);
}