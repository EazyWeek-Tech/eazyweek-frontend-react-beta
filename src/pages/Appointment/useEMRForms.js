import { useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authPost = async (url, body) => {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  // Unwrap { success, data } envelope
  return j?.data !== undefined ? j.data : j;
};

const authGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json();
  return j.data ?? j;
};

// ─── useEMRForms ──────────────────────────────────────────────────────────────
// Returns:
//   checkAndShowForms({ appointmentId, serviceCode, custId, centerCode, toStatus })
//     → Promise<boolean>  true = proceed, false = blocked (mandatory forms pending)
//   modalProps  → pass to <FormFillModal {...modalProps} /> in your JSX
//   showModal   → boolean, true when modal should render

export const useEMRForms = () => {
  const [modalProps, setModalProps] = useState(null);
  const [resolve,    setResolve]    = useState(null);

  const checkAndShowForms = useCallback(async ({
    appointmentId, serviceCode, custId, centerCode, toStatus,
    macroContext = {},   // EMR-FB-019: { customerName, serviceName, centreName, practitionerName, appointmentDate }
  }) => {
    if (!["Start", "Completed"].includes(toStatus)) return true;

    const whenToFill = toStatus === "Start" ? "Before Service Starts" : "After Service Starts";

    try {
      // One fetch serves both gates below.
      let apptForms = null;
      if (appointmentId) {
        apptForms = await authGet(
          `${API_BASE_URL}/api/EMR/Appointment/${encodeURIComponent(appointmentId)}/Forms` +
          `?serviceCode=${encodeURIComponent(serviceCode || "")}&custId=${encodeURIComponent(custId || "")}`
        );
      }

      // ── Step 1: On Start, first visit + a Customer Form → show it first ────
      if (toStatus === "Start" && custId && centerCode &&
          apptForms?.isFirstVisit && apptForms?.customerForm) {
        const customerFormFilled = await new Promise((done) => {
          setResolve({ fn: done });
          setModalProps({
            appointmentId,
            serviceCode,
            custId,
            centerCode,
            whenToFill:         null,        // Customer Form has no whenToFill
            isCustomerFormEdit: false,
            existingRecId:      null,        // new fill — not an edit
            formCodeOverride:   apptForms.customerForm.formCode,
            macroContext,
          });
        });

        // If practitioner closed without filling → block the status change
        if (!customerFormFilled) return false;
      }

      /* ── Step 2: consent / treatment forms ─────────────────────────────────
         These used to open ONLY when CheckStatusChange answered canProceed:false,
         which the backend decides from isMandatory. Any consent or treatment form
         that was not flagged mandatory therefore never appeared on its own — the
         practitioner had to know to go looking for it.

         Now we open whatever is genuinely pending for this transition. Mandatory
         forms still cannot be skipped (FormFillModal only renders Skip for
         optional ones), and if nothing is pending the modal completes itself
         immediately, so the status change is never delayed for no reason. */
      const pending = (apptForms?.serviceForms || []).filter(
        (f) => f.whenToFill === whenToFill && !f.isSubmitted
      );

      if (pending.length) {
        return new Promise((done) => {
          setResolve({ fn: done });
          setModalProps({ appointmentId, serviceCode, custId, centerCode, whenToFill, macroContext });
        });
      }

      // Backstop: the server may block for a reason the form list does not show.
      const res = await authPost(`${API_BASE_URL}/api/EMR/Appointment/CheckStatusChange`, {
        appointmentId, serviceCode, toStatus,
      });

      // authPost already unwraps data, so res = { canProceed, missing }
      const { canProceed } = res || {};
      if (canProceed !== false) return true;

      return new Promise((done) => {
        setResolve({ fn: done });
        setModalProps({ appointmentId, serviceCode, custId, centerCode, whenToFill, macroContext });
      });
    } catch {
      return true; // fail open
    }
  }, []);

  const handleComplete = useCallback(() => {
    setModalProps(null);
    if (resolve?.fn) { resolve.fn(true); setResolve(null); }
  }, [resolve]);

  const handleClose = useCallback(() => {
    setModalProps(null);
    if (resolve?.fn) { resolve.fn(false); setResolve(null); }
  }, [resolve]);

  return {
    checkAndShowForms,
    showModal:  !!modalProps,
    modalProps: modalProps ? {
      ...modalProps,
      onComplete: handleComplete,
      onClose:    handleClose,
    } : null,
  };
};