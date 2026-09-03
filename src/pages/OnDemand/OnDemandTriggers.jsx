import React, { useState } from "react";
import { API_BASE_URL } from "../../config";
import EInvoiceStatusUpload from "../Einvoice/EInvoiceStatusUpload";
import CourtesyCallUpload from "../CourtesyCall/CourtesyCallUpload";
import CustomerTypeUpload from "../CourtesyCall/CustomerTypeUpload";

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

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
  {
    id: "zenoti-appointment-sync",
    title: "Zenoti Appointment Sync",
    description:
      "Manually pull newly received Zenoti appointments into EazyWeek. Resolves the centre and customer for each appointment, creates the appointment record, and generates the courtesy call and its service items. Runs automatically on a schedule - use this if the scheduled run has not picked up recent appointments.",
    icon: "bx-calendar-check",
    color: "#1F4E79",
    endpoint: `${API_BASE_URL}/api/Sync/TriggerZenotiSync`,
    method: "POST",
  },
];

const OnDemandTriggers = () => {
  const [states, setStates] = useState(
    Object.fromEntries(triggers.map((t) => [t.id, { running: false, result: null }]))
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ccUploadOpen, setCcUploadOpen] = useState(false);
  const [ctUploadOpen, setCtUploadOpen] = useState(false);

  const runTrigger = async (trigger) => {
    setStates((prev) => ({
      ...prev,
      [trigger.id]: { running: true, result: null },
    }));

    try {
      const res = await fetch(trigger.endpoint, {
        method: trigger.method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN()}`,
        },
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

        {/* ===== E-INVOICE EXCEL UPLOAD CARD ===== */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 24,
            width: 340,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
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
              <i className="bx bx-spreadsheet" style={{ fontSize: 22, color: "#1F4E79" }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1F4E79" }}>
              E-Invoice Failed Status Excel Upload
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 16 }}>
            Upload the ZATCA correction sheet. Rows with an INVOICENO mark that e-invoice as
            Success; rows with a POS INVOICENO and RESOLVED INVOICENO mark the failed invoice as
            Resolved under the new number. Preview first, then Publish.
          </p>
          <button
            className="pribtn"
            style={{ width: "100%" }}
            onClick={() => setUploadOpen((v) => !v)}
          >
            <i className={`bx ${uploadOpen ? "bx-chevron-up" : "bx-upload"}`} style={{ marginRight: 6 }} />
            {uploadOpen ? "Hide Upload" : "Open Upload"}
          </button>
        </div>

        {/* ===== COURTESY CALL EXCEL UPLOAD CARD ===== */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 24,
            width: 340,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
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
              <i className="bx bx-phone-call" style={{ fontSize: 22, color: "#1F4E79" }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1F4E79" }}>
              Courtesy Call Excel Upload
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 16 }}>
            Upload the Zenoti completed-appointments sheet. One courtesy call is created per
            patient per centre per appointment date, with each row as a service item. First Visit
            = Yes marks the customer New, No marks Existing; existing pending calls get missing
            items added and their customer type corrected. Completed calls are left untouched.
            Preview first, then Publish.
          </p>
          <button
            className="pribtn"
            style={{ width: "100%" }}
            onClick={() => setCcUploadOpen((v) => !v)}
          >
            <i className={`bx ${ccUploadOpen ? "bx-chevron-up" : "bx-upload"}`} style={{ marginRight: 6 }} />
            {ccUploadOpen ? "Hide Upload" : "Open Upload"}
          </button>
        </div>

        {/* ===== CUSTOMER TYPE EXCEL UPDATE CARD ===== */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 24,
            width: 340,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
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
              <i className="bx bx-user-check" style={{ fontSize: 22, color: "#1F4E79" }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1F4E79" }}>
              Customer Type Excel Update
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 16 }}>
            Upload a sheet of patients with their correct type (First Visit Yes = New, No =
            Existing; blank = New) to fix the customer type on existing courtesy calls. No calls
            or items are created. Completed calls are left untouched. Preview first, then Publish.
          </p>
          <button
            className="pribtn"
            style={{ width: "100%" }}
            onClick={() => setCtUploadOpen((v) => !v)}
          >
            <i className={`bx ${ctUploadOpen ? "bx-chevron-up" : "bx-upload"}`} style={{ marginRight: 6 }} />
            {ctUploadOpen ? "Hide Upload" : "Open Upload"}
          </button>
        </div>
      </div>

      {uploadOpen && <EInvoiceStatusUpload onClose={() => setUploadOpen(false)} />}
      {ccUploadOpen && <CourtesyCallUpload onClose={() => setCcUploadOpen(false)} />}
      {ctUploadOpen && <CustomerTypeUpload onClose={() => setCtUploadOpen(false)} />}
    </section>
  );
};

export default OnDemandTriggers;