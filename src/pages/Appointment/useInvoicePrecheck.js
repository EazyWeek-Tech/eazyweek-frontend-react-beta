import { useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import { cfPost, hasNationality } from "./customerFields";

/* ─── useInvoicePrecheck ────────────────────────────────────────────────────────
   Same gating shape as useEMRForms: an async check that returns a promise the
   caller awaits before proceeding, plus modal props to render.

     runPrecheck({ custId, centerCode })  → Promise<boolean>
         true  = every detail the invoice needs is on file, go to billing
         false = receptionist closed the modal without completing, stay put

     checking       → true while the check is running (render the "checking" screen)
     showPrecheck   → true when the fix-it modal should render
     precheckProps  → spread onto <InvoicePrecheckModal {...precheckProps} />

   Nationality is deliberately NOT mandatory at booking time — a walk-in can be
   created and seated in seconds. It IS mandatory at billing time, because the
   invoice derives the Citizen / Expat status from it. This hook is the point
   where that debt gets collected, with the customer's details already on screen
   so the receptionist only has to pick one dropdown value.

   Fails OPEN: if the lookup itself errors we let billing continue rather than
   trapping a paying customer at the counter over a failed GET.
   ──────────────────────────────────────────────────────────────────────────── */

export const useInvoicePrecheck = () => {
  const [modalProps, setModalProps] = useState(null);
  const [checking,   setChecking]   = useState(false);
  const [resolve,    setResolve]    = useState(null);

  const runPrecheck = useCallback(async ({ custId, centerCode }) => {
    if (!custId) return true;   // unlinked bookings are blocked earlier, at save

    setChecking(true);
    let customer = null;
    try {
      customer = await cfPost(`${API_BASE_URL}/api/Customer/FetchCustomerDetails`, {
        custID: custId,
      });
    } catch {
      setChecking(false);
      return true;              // fail open
    }
    setChecking(false);

    if (!customer || customer.success === false) return true;

    // Everything the invoice needs before it can be generated. Add to this list
    // as billing grows — the modal renders whatever comes back in `missing`.
    const missing = [];
    if (!hasNationality(customer.nationalityCode)) missing.push("nationality");

    if (!missing.length) return true;

    return new Promise((res) => {
      setResolve({ fn: res });
      setModalProps({
        customer,
        centerCode: centerCode || customer.centerCode || "",
        missing,
      });
    });
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
    runPrecheck,
    checking,
    showPrecheck: !!modalProps,
    precheckProps: modalProps ? {
      ...modalProps,
      onComplete: handleComplete,
      onClose:    handleClose,
    } : null,
  };
};