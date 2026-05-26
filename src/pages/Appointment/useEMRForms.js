import { useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authPost = async (url, body) => {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(body),
  });
  return r.json();
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

    try {
      const res = await authPost(`${API_BASE_URL}/api/EMR/Appointment/CheckStatusChange`, {
        appointmentId, serviceCode, toStatus,
      });

      const { canProceed } = res?.data || {};
      if (canProceed !== false) return true;

      // Need forms — show modal via promise
      return new Promise((res) => {
        setResolve(() => res);
        const whenToFill = toStatus === "Start" ? "Before Service Starts" : "After Service Starts";
        setModalProps({ appointmentId, serviceCode, custId, centerCode, whenToFill, macroContext });
      });
    } catch {
      return true; // fail open
    }
  }, []);

  const handleComplete = useCallback(() => {
    setModalProps(null);
    if (resolve) { resolve(true); setResolve(null); }
  }, [resolve]);

  const handleClose = useCallback(() => {
    setModalProps(null);
    if (resolve) { resolve(false); setResolve(null); }
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