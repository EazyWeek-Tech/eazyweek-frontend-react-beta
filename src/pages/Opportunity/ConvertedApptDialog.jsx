// src/pages/Opportunity/ConvertedApptDialog.jsx
//
// Shared "Lead Converted — book an appointment?" dialog (FRD §6.3, Case B).
//
// Shown for ONE case only: the campaign has Appt Booking Mandatory = No and the
// lead has just been converted. When booking IS mandatory the caller must route
// straight to the Appointment screen without asking — there is no choice to make.
//
//   Yes → caller navigates to /appointment with the ltrConversion state. If the
//         agent leaves without booking, Appointment/index.jsx reverts the lead to
//         WIP + "Appointment Booking Failed" (RevertConversionAppointment).
//   No  → the lead stays Converted with Appointment ID = Pending, and is mapped
//         later from the Appointment ID dropdown on Campaign Details.
//
// Used by NoShowEntryDetails (R1–R4), MasterLeadForm (R5/R6), ExternalLeadForm
// (R7) and ManualOppCustomerDetails (manual), so the wording stays in one place.

const OVERLAY = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
};
const CARD = {
  background: "#fff", borderRadius: 12, padding: 24,
  width: "min(460px, 92vw)", boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
};
const BTN = {
  background: "#18396E", color: "#fff", border: 0, borderRadius: 10,
  padding: "10px 22px", fontWeight: 700, cursor: "pointer",
};
const BTN_GHOST = { ...BTN, background: "#e0e0e0", color: "#333" };

export default function ConvertedApptDialog({
  open,
  custId = "",
  existing = false,        // true = an existing customer was linked, not created
  showProfileNote = false, // true = a customer was just auto-created on conversion
  onBook,
  onSkip,
}) {
  if (!open) return null;

  const cid = String(custId || "").trim();

  return (
    <div style={OVERLAY}>
      <div style={CARD}>
        <h3 style={{ margin: "0 0 4px", color: "#05224C" }}>
          {existing ? "Opportunity Converted" : "Lead Converted"}
        </h3>

        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>
          {existing ? "This record is linked to customer" : "The customer has been created"}
          {cid ? <> {existing ? null : "as "}<strong>{cid}</strong></> : null}.
          {" "}Would you like to book an appointment now?
        </p>

        {showProfileNote && (
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#888" }}>
            Nationality, date of birth and gender are not set yet — complete them in
            Customer Master before this customer is billed.
          </p>
        )}

        {/* The agent has to know that opening the booking screen and walking away
            costs them the conversion — that is the whole difference between the
            two buttons. */}
        <p style={{ margin: "0 0 20px", fontSize: 12, color: "#888" }}>
          Choose <strong>No</strong> to keep the lead Converted and map an appointment
          later from the Appointment ID column. If you choose <strong>Yes</strong> and
          then leave without saving a booking, the lead goes back to WIP.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onSkip} style={BTN_GHOST}>No, map it later</button>
          <button onClick={onBook} style={BTN}>Yes, book appointment</button>
        </div>
      </div>
    </div>
  );
}