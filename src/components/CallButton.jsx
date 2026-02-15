// src/components/CallButton.jsx
import React, { useMemo, useState } from "react";

/**
 * Altius Click-to-Call
 *
 * Base: https://linesclinicsbridge.altius.cc
 * Endpoint: /api/initiateCall (GET)
 * Header: apiKey: <key>
 *
 * Props:
 *  - firstNumber: agent mobile
 *  - secondNumber: customer mobile
 *  - leadId?: string | number (optional)
 *  - label?: string
 *  - apiKey?: string
 *  - baseUrl?: string
 *  - onSuccess?: (data) => void
 *  - onError?: (err) => void
 */

const DEFAULT_BASE_URL = "https://linesclinicsbridge.altius.cc";
const DEFAULT_API_KEY = "2e6l0gbrflegasilk2o"; // test key

/**
 * Normalize mobile number:
 * - keep digits only
 * - remove leading zeros
 * - DO NOT force 10 digits (important for KSA numbers)
 */
const normalizeMobile = (v) => {
  let s = (v ?? "").toString().trim();

  // keep digits only
  s = s.replace(/[^\d]/g, "");

  // remove leading zeros (0055xxxx → 55xxxx)
  s = s.replace(/^0+/, "");

  return s;
};

export default function CallButton({
  firstNumber,
  secondNumber,
  leadId,
  label = "Call Client",
  apiKey = DEFAULT_API_KEY,
  baseUrl = DEFAULT_BASE_URL,
  onSuccess,
  onError,
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const agentNo = useMemo(
    () => normalizeMobile(firstNumber),
    [firstNumber]
  );
  const customerNo = useMemo(
    () => normalizeMobile(secondNumber),
    [secondNumber]
  );

  const disabled = loading || !agentNo || !customerNo;

  const initiateCall = async () => {
    setMsg("");

    if (!agentNo) {
      const err = new Error("Agent mobile not available");
      onError?.(err);
      setMsg(err.message);
      return;
    }

    if (!customerNo) {
      const err = new Error("Customer mobile not available");
      onError?.(err);
      setMsg(err.message);
      return;
    }

    // Build URL
    const url = new URL("/api/initiateCall", baseUrl);
    url.searchParams.set("agentNo", agentNo);
    url.searchParams.set("customerNo", customerNo);

    if (leadId !== null && leadId !== undefined && String(leadId).trim() !== "") {
      url.searchParams.set("leadId", String(leadId));
    }

    setLoading(true);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          apiKey, // ✅ SAME AS YOUR CURL
          Accept: "application/json",
        },
      });

      const text = await res.text();
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // non-JSON response
      }

      if (!res.ok) {
        const err = new Error(
          `Call API failed: HTTP ${res.status} ${res.statusText}${
            text ? ` - ${text.slice(0, 150)}` : ""
          }`
        );
        onError?.(err);
        setMsg(err.message);
        return;
      }

      if (data && data.success === false) {
        const err = new Error(data.message || "Call initiation failed");
        onError?.(err);
        setMsg(err.message);
        return;
      }

      onSuccess?.(data);
      setMsg(data?.message || "Call initiated successfully");
    } catch (e) {
      onError?.(e);
      setMsg(e?.message || "Unable to connect to call service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        onClick={initiateCall}
        disabled={disabled}
        className="btn"
      >
        {loading ? "Calling..." : label}
      </button>

      {!!msg && (
        <div
          style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}
          title={msg}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
