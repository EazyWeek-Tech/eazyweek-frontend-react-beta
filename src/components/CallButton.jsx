"use client";
import React, { useMemo, useState } from "react";

/**
 * CallButton
 * Props:
 * - firstNumber: string (logged-in user)
 * - secondNumber: string (client)
 * - label?: string
 * - className?: string
 * - disabled?: boolean
 * - onSuccess?: (data) => void
 * - onError?: (error) => void
 */
const DEFAULT_BASE_URL = "http://10.1.2.65/call_bridge.php";

const digitsOnly = (v) => (v ?? "").toString().replace(/[^\d]/g, "");

const CallButton = ({
  firstNumber,
  secondNumber,
  label = "Call",
  className = "",
  disabled = false,
  onSuccess,
  onError,
  baseUrl = DEFAULT_BASE_URL,
}) => {
  const [loading, setLoading] = useState(false);
  const [lastMsg, setLastMsg] = useState("");

  const a = useMemo(() => digitsOnly(firstNumber), [firstNumber]);
  const b = useMemo(() => digitsOnly(secondNumber), [secondNumber]);

  const canCall = !!a && !!b && !disabled && !loading;

  const buildUrl = () => {
    const url = new URL(baseUrl);
    url.searchParams.set("first_number", a);
    url.searchParams.set("second_number", b);
    return url.toString();
  };

  const handleCall = async () => {
    if (!canCall) return;

    setLoading(true);
    setLastMsg("");

    try {
      const url = buildUrl();

      // NOTE:
      // If this endpoint doesn't send CORS headers, browser will block it.
      // In that case, use the proxy option (below).
      const res = await fetch(url, { method: "GET" });

      // Some PHP endpoints respond with text/html, some with JSON.
      const text = await res.text();

      if (!res.ok) {
        const err = new Error(`Call API failed (${res.status})`);
        err.details = text;
        throw err;
      }

      // Try JSON parse, else keep text
      let data = text;
      try {
        data = JSON.parse(text);
      } catch {}

      const msg = typeof data === "string" ? data : "Call triggered";
      setLastMsg(msg);

      onSuccess?.(data);
    } catch (e) {
      setLastMsg(e?.message || "Failed to trigger call");
      onError?.(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className={`call-btn-wrap ${className}`}>
      <button
        type="button"
        onClick={handleCall}
        disabled={!canCall}
        className="btn-call"
        title={!a ? "Missing agent number" : !b ? "Missing client number" : "Call"}
        style={{
          cursor: canCall ? "pointer" : "not-allowed",
          opacity: canCall ? 1 : 0.6,
        }}
      >
        {loading ? "Calling..." : label}
      </button>

      {/* optional tiny status */}
      {lastMsg ? (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
          {lastMsg}
        </div>
      ) : null}
    </div>

    <style>{`
        .call-btn-wrap{display: flex; justify-content: flex-end;}
         .btn-call{padding: 8px 10px; color:#fff; background: #21b953; font-weight: 600;  border: none; border-radius: 8px; }
    `}
       
    </style>
    </>
  );
};

export default CallButton;
