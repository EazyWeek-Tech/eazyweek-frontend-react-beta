import React, { useCallback, useEffect, useRef, useState } from "react";
import * as appConfig from "../config";

const API_BASE = appConfig.API_BASE_URL || appConfig.default?.API_BASE_URL || "";

/* ---- timing ---- */
const IDLE_MINUTES = parseInt(import.meta.env.VITE_IDLE_MINUTES || "30", 10);
const IDLE_MS      = IDLE_MINUTES * 60 * 1000;
const WARN_MS      = Math.min(2 * 60 * 1000, Math.floor(IDLE_MS / 3));
const REFRESH_MS   = Math.max(60 * 1000, Math.floor(IDLE_MS / 3));
const TICK_MS      = 5 * 1000;
const ACTIVITY_KEY = "ew:lastActivity";

/* ---- token storage ---- */
const readStoredUser = () => {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getToken = () => {
  const u = readStoredUser();
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    (u && u.token) ||
    localStorage.getItem("ssoToken") ||
    ""
  );
};

const writeToken = (token) => {
  if (localStorage.getItem("token")) localStorage.setItem("token", token);
  if (sessionStorage.getItem("token")) sessionStorage.setItem("token", token);
  ["localStorage", "sessionStorage"].forEach((s) => {
    const store = window[s];
    const raw = store.getItem("user");
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      if (!u.token) return;
      u.token = token;
      store.setItem("user", JSON.stringify(u));
    } catch {
      /* leave as-is */
    }
  });
  if (localStorage.getItem("ssoToken")) localStorage.setItem("ssoToken", token);
};

/* ---- component ---- */
export default function SessionGuard({ onLogout }) {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const warningRef = useRef(false);
  const lastRefreshRef = useRef(Date.now());
  const lastWriteRef = useRef(0);
  const loggingOutRef = useRef(false);

  const logout = useCallback(
    (message) => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      localStorage.removeItem(ACTIVITY_KEY);
      onLogout(message);
    },
    [onLogout]
  );

  const readActivity = () => {
    const v = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(v) && v > 0 ? v : Date.now();
  };

  const markActivity = useCallback(() => {
    if (warningRef.current || loggingOutRef.current) return;
    const now = Date.now();
    if (now - lastWriteRef.current < TICK_MS) return;
    lastWriteRef.current = now;
    localStorage.setItem(ACTIVITY_KEY, String(now));
  }, []);

  const doRefresh = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout("Your session has expired. Please log in again.");
        return;
      }
      if (!res.ok) return;
      const body = await res.json();
      const newToken = body?.data?.token;
      if (newToken) {
        writeToken(newToken);
        lastRefreshRef.current = Date.now();
      }
    } catch {
      /* transient network error — retry on next tick */
    }
  }, [logout]);

  const staySignedIn = useCallback(() => {
    warningRef.current = false;
    setWarning(false);
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    lastWriteRef.current = Date.now();
    doRefresh();
  }, [doRefresh]);

  useEffect(() => {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    lastRefreshRef.current = Date.now();

    const tick = () => {
      if (loggingOutRef.current) return;
      const now = Date.now();
      const idle = now - readActivity();

      if (idle >= IDLE_MS) {
        logout(
          `You were logged out after ${IDLE_MINUTES} minutes of inactivity. Please log in again.`
        );
        return;
      }

      if (idle >= IDLE_MS - WARN_MS) {
        warningRef.current = true;
        setWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((IDLE_MS - idle) / 1000)));
        return;
      }

      if (warningRef.current) {
        warningRef.current = false;
        setWarning(false);
      }

      if (now - lastRefreshRef.current >= REFRESH_MS) {
        doRefresh();
      }
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach((e) => window.addEventListener(e, markActivity, { passive: true }));

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    const interval = setInterval(tick, TICK_MS);
    const countdown = setInterval(() => {
      if (!warningRef.current) return;
      const idle = Date.now() - readActivity();
      setSecondsLeft(Math.max(0, Math.ceil((IDLE_MS - idle) / 1000)));
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActivity));
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, [doRefresh, logout, markActivity]);

  if (!warning) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(1, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5, 34, 76, 0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "28px 32px",
          width: 380,
          maxWidth: "90vw",
          boxShadow: "0 12px 40px rgba(5, 34, 76, 0.35)",
          textAlign: "center",
          fontFamily: "inherit",
        }}
      >
        <h3 style={{ margin: "0 0 8px", color: "#05224C", fontSize: 18 }}>
          Are you still there?
        </h3>
        <p style={{ margin: "0 0 4px", color: "#334155", fontSize: 14 }}>
          You will be signed out due to inactivity in
        </p>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#DD7766",
            margin: "8px 0 16px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {mm}:{ss}
        </div>
        <button
          type="button"
          onClick={staySignedIn}
          style={{
            background: "#18396E",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Stay signed in
        </button>
      </div>
    </div>
  );
}