import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Inactivity timeout DISABLED (demo): the session never auto-logs-out.
// The hook is kept as a no-op so existing call sites in App.jsx don't break.
// `logout` is still returned in case a caller invokes it manually.
//
// To re-enable later, restore the timer version from git history (or ask) —
// it used a 30-minute inactivity window resetting on mouse/keyboard/scroll.
export function useSessionTimeout(onLogout) {
  const navigate = useNavigate();

  const logout = useCallback(() => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("userSession");
    sessionStorage.removeItem("ssoToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userSession");
    localStorage.removeItem("ssoToken");
    localStorage.removeItem("remember");

    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  }, [navigate, onLogout]);

  // No timer is started — nothing ever triggers an automatic logout.
  return { logout };
}