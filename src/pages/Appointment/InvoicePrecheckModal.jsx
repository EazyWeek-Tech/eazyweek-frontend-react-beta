import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";
import {
  cfPost, loadNationalities, natCodeOf, natNameOf,
  classifyCustomerType, hasNationality,
} from "./customerFields";

/* ─── InvoicePrecheckModal ──────────────────────────────────────────────────────
   Two states, one component:

   1. checking  — the brief "we are verifying this customer" screen shown while
                  useInvoicePrecheck fetches the customer record.
   2. fix-it    — customer details prefilled and read-only, with the missing
                  field(s) as the only thing to fill in. Save writes the customer
                  and hands control back so billing continues in the same click.

   The details are shown read-only on purpose: this modal exists to unblock an
   invoice, not to become a second Customer Master. Anything else that needs
   correcting belongs in the customer screen where the full validation lives.
   ──────────────────────────────────────────────────────────────────────────── */

const Row = ({ label, value }) => (
  <div style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid #f1f5f9" }}>
    <div style={{ width:130, flexShrink:0, fontSize:12, color:"#64748b" }}>{label}</div>
    <div style={{ fontSize:13, color:"#10223f", fontWeight:600 }}>{value || "—"}</div>
  </div>
);

const InvoicePrecheckModal = ({
  checking = false,
  customer,
  centerCode,
  missing = [],
  onComplete,
  onClose,
}) => {
  const { has } = usePermissions();
  const [natList, setNatList] = useState([]);
  const [natCode, setNatCode] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => { if (!checking) loadNationalities().then(setNatList); }, [checking]);

  // ── State 1: verifying ────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="popouter" style={{ display:"flex", zIndex:9999 }}>
        <div className="popovrly" />
        <div className="popin" style={{ maxWidth:420, width:"92%", textAlign:"center", padding:"46px 30px" }}>
          <div style={{ width:34, height:34, margin:"0 auto 16px", borderRadius:"50%",
            border:"3px solid #e7ecf4", borderTopColor:"#334b71", animation:"ipcSpin .8s linear infinite" }} />
          <style>{`@keyframes ipcSpin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ fontSize:14, fontWeight:700, color:"#10223f", marginBottom:6 }}>
            Checking customer details
          </div>
          <div style={{ fontSize:12, color:"#64748b", lineHeight:1.5 }}>
            Verifying that everything the invoice needs is on file before opening billing.
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const canEdit = has("MDM.CUSTOMERS_EDIT") || has("MDM.CUSTOMERS_SAVE") || has("MDM.CUSTOMERS_CREATE");
  const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();

  const save = async () => {
    setErr("");
    if (!canEdit) {
      setErr("Your role cannot update customer details. Ask an Admin to add the nationality, then try again.");
      return;
    }
    if (missing.includes("nationality") && !hasNationality(natCode)) {
      setErr("Please select a nationality.");
      return;
    }

    setSaving(true);
    try {
      const natItem = natList.find(n => natCodeOf(n) === String(natCode));
      /* The repository's UPDATE rewrites every column, so the whole record goes
         back — sending only the changed field would blank out the rest. */
      const res = await cfPost(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        ...customer,
        customerId:      customer.customerId,       // non-empty = UPDATE path
        centerCode:      centerCode || customer.centerCode || "",
        nationalityCode: natCode,
        customerType:    classifyCustomerType(natItem),
      });
      if (res?.success === false) throw new Error(res?.message || "Could not save the customer.");
      onComplete?.();
    } catch (e) {
      setErr(e?.message || "Could not save the customer.");
      setSaving(false);
    }
  };

  // ── State 2: collect what is missing ──────────────────────────────────────
  return (
    <div className="popouter" style={{ display:"flex", zIndex:9999 }}>
      <div className="popovrly" onClick={onClose} />
      <div className="popin" style={{ maxWidth:520, width:"95%", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>

        <div className="popuphdr" style={{ flexShrink:0 }}>
          <div>
            <div>Customer details needed</div>
            <div style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginTop:2 }}>
              Required before this invoice can be generated
            </div>
          </div>
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>

        <div className="popfrm" style={{ flex:1, overflowY:"auto" }}>
          <div style={{ padding:"10px 14px", marginBottom:14, borderRadius:8, fontSize:12,
            background:"#fdf7e9", border:"1px solid #f0d9a8", color:"#7a5a12", lineHeight:1.5 }}>
            <b>Nationality is missing</b> for this customer. The invoice uses it to set the
            Citizen / Expat status, so please add it before continuing to payment.
          </div>

          <div style={{ marginBottom:16 }}>
            <Row label="Customer ID"  value={customer.customerId} />
            <Row label="Name"         value={fullName} />
            <Row label="Mobile"       value={customer.mobilePhone} />
            <Row label="Email"        value={customer.email} />
            <Row label="Gender"       value={customer.gender} />
          </div>

          {missing.includes("nationality") && (
            <div className="form-group">
              <label htmlFor="ipc_nat" style={{ display:"block", fontSize:11, fontWeight:600,
                color:"#5b6b85", marginBottom:4 }}>
                Nationality <span style={{ color:"#b91c1c" }}>*</span>
              </label>
              <select id="ipc_nat" value={natCode} style={{ width:"100%" }}
                onChange={e => { setNatCode(e.target.value); setErr(""); }}>
                <option value="">Select nationality</option>
                {natList.map((n, i) => (
                  <option key={`${natCodeOf(n)}-${i}`} value={natCodeOf(n)}>{natNameOf(n)}</option>
                ))}
              </select>
            </div>
          )}

          {err && <div style={{ color:"#b91c1c", fontSize:12, marginTop:10 }}>{err}</div>}
        </div>

        <div className="btnbar" style={{ flexShrink:0, borderTop:"1px solid #f1f5f9", paddingTop:14 }}>
          <button className="seclnk" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="pribtnblue" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save & Continue to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrecheckModal;