import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

const triggers = [
  {
    id: "sla-escalation",
    title: "SLA Escalation",
    description:
      "Manually run the SLA escalation check. This will scan all open/WIP cases, identify any that have exceeded their SLA limits, and send escalation emails to the configured escalation contacts.",
    icon: "bx-alarm-exclamation",
    color: "#1F4E79",
    endpoint: `${API_BASE_URL}/api/CaseOperation/TriggerSLAEscalation`,
    method: "POST",
  },
];

const OnDemandTriggers = () => {
  const [states, setStates] = useState(
    Object.fromEntries(triggers.map((t) => [t.id, { running: false, result: null }]))
  );

  const runTrigger = async (trigger) => {
    setStates((prev) => ({
      ...prev,
      [trigger.id]: { running: true, result: null },
    }));

    try {
      const res = await fetch(trigger.endpoint, {
        method: trigger.method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      setStates((prev) => ({
        ...prev,
        [trigger.id]: {
          running: false,
          result: {
            success: res.ok && (data.success ?? true),
            message: data.message || (res.ok ? "Completed successfully." : "Failed."),
          },
        },
      }));
    } catch (err) {
      setStates((prev) => ({
        ...prev,
        [trigger.id]: {
          running: false,
          result: { success: false, message: `Error: ${err.message}` },
        },
      }));
    }
  };

  return (
    <section>
      <div className="pg-head">
        <h2 className="pg-ttl">On Demand Triggers</h2>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 24 }}>
        {triggers.map((trigger) => {
          const state = states[trigger.id];
          return (
            <div
              key={trigger.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 24,
                width: 340,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {/* Icon + Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "#EEF3FB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className={`bx ${trigger.icon}`}
                    style={{ fontSize: 22, color: trigger.color }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1F4E79" }}>
                    {trigger.title}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 16 }}>
                {trigger.description}
              </p>

              {/* Button */}
              <button
                className="pribtn"
                style={{ width: "100%" }}
                onClick={() => runTrigger(trigger)}
                disabled={state.running}
              >
                {state.running ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" style={{ marginRight: 6 }} />
                    Running...
                  </>
                ) : (
                  <>
                    <i className="bx bx-play-circle" style={{ marginRight: 6 }} />
                    Run Now
                  </>
                )}
              </button>

              {/* Result */}
              {state.result && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    background: state.result.success ? "#f0fdf4" : "#fff5f5",
                    color: state.result.success ? "#166534" : "#991b1b",
                    border: `1px solid ${state.result.success ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  <i
                    className={`bx ${state.result.success ? "bx-check-circle" : "bx-x-circle"}`}
                    style={{ marginRight: 6 }}
                  />
                  {state.result.message}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default OnDemandTriggers;