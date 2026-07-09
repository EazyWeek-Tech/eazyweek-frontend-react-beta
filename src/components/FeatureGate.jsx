import React from "react";
import {
  getFeatureSet,
  hasFeature,
  getFeatureMeta,
  getTierLabel,
  tiersThatInclude,
} from "../config/licenseConfig"; // adjust path if this file lives elsewhere

// C palette
const C = {
  navy: "#334b71",
  coral: "#cc6b5c",
  gold: "#d4a853",
  slate: "#8da0b8",
  green: "#4a9e8a",
  ink: "#2b3444",
  line: "#e6eaf0",
  paper: "#ffffff",
  wash: "#f5f7fa",
};

/**
 * UpgradeNotice — the "why it's locked + how to get it" screen.
 * Shown when a tenant's plan doesn't include `feature`.
 */
export function UpgradeNotice({ feature, currentUser, onContact }) {
  const meta = getFeatureMeta(feature);
  const currentTier = currentUser?.licenseTier || "launch";
  const includedTierKeys = tiersThatInclude(feature); // e.g. ["grow","scale"]
  const includedLabels = includedTierKeys.map(getTierLabel);

  const availabilityLine =
    includedLabels.length > 0
      ? `Included in the ${includedLabels.join(" and ")} ${
          includedLabels.length > 1 ? "plans" : "plan"
        }.`
      : "Available as a custom add-on.";

  const handleContact = () => {
    if (typeof onContact === "function") onContact(feature);
  };

  return (
    <div
      style={{
        fontFamily: "'Lato', sans-serif",
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: C.wash,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: C.paper,
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          padding: "40px 36px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(51,75,113,0.08)",
        }}
      >
        {/* Lock badge */}
        <div
          style={{
            width: 68,
            height: 68,
            margin: "0 auto 22px",
            borderRadius: "50%",
            background: "rgba(212,168,83,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i
            className="bx bx-lock-alt"
            style={{ fontSize: 32, color: C.gold }}
          ></i>
        </div>

        {/* Title */}
        <h2
          style={{
            margin: "0 0 6px",
            color: C.navy,
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          {meta.label}
        </h2>

        <p
          style={{
            margin: "0 0 18px",
            color: C.slate,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Not included in your {getTierLabel(currentTier)} plan
        </p>

        {/* Blurb */}
        {meta.blurb ? (
          <p
            style={{
              margin: "0 0 22px",
              color: C.ink,
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            {meta.blurb}
          </p>
        ) : null}

        {/* Availability pills */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 26,
          }}
        >
          {includedLabels.length > 0 ? (
            includedLabels.map((label) => (
              <span
                key={label}
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: C.green,
                  background: "rgba(74,158,138,0.12)",
                  border: `1px solid rgba(74,158,138,0.3)`,
                  borderRadius: 999,
                  padding: "5px 12px",
                }}
              >
                {label}
              </span>
            ))
          ) : (
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: C.coral,
                background: "rgba(204,107,92,0.12)",
                border: `1px solid rgba(204,107,92,0.3)`,
                borderRadius: 999,
                padding: "5px 12px",
              }}
            >
              Custom add-on
            </span>
          )}
        </div>

        {/* How to get it */}
        <div
          style={{
            background: C.wash,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 22,
          }}
        >
          <p style={{ margin: "0 0 4px", color: C.navy, fontSize: 14, fontWeight: 700 }}>
            {availabilityLine}
          </p>
          <p style={{ margin: 0, color: C.slate, fontSize: 13.5, lineHeight: 1.55 }}>
            To unlock it, contact your EazyWeek account manager to upgrade your plan.
          </p>
        </div>

        <button
          onClick={handleContact}
          style={{
            appearance: "none",
            border: "none",
            cursor: "pointer",
            background: C.navy,
            color: "#fff",
            fontFamily: "'Lato', sans-serif",
            fontSize: 14.5,
            fontWeight: 700,
            borderRadius: 10,
            padding: "12px 26px",
          }}
        >
          Contact to upgrade
        </button>
      </div>
    </div>
  );
}

/**
 * FeatureGate — wrap a route element. Renders children if the tenant's plan
 * includes `feature`, otherwise shows the UpgradeNotice.
 *
 * Usage in your router:
 *   <Route path="/loyalty" element={
 *     <FeatureGate feature="loyalty" currentUser={user}>
 *       <LoyaltyPage />
 *     </FeatureGate>
 *   } />
 *
 * Rollout-safe: if the user has no licenseTier yet (login not wired to return
 * it), the gate lets everything through — same posture as the Sidebar guard.
 */
export default function FeatureGate({ feature, currentUser, onContact, children }) {
  // No tier resolved yet -> don't gate (avoids locking pages during rollout).
  if (!currentUser?.licenseTier) return children;

  const featureSet = getFeatureSet(currentUser);
  if (hasFeature(feature, featureSet)) return children;

  return (
    <UpgradeNotice feature={feature} currentUser={currentUser} onContact={onContact} />
  );
}