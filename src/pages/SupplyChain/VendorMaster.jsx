import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Crumb,
  Field,
  Select,
  Switch,
  TextInput,
  Toast,
} from "./VendorUI";
import {
  DELIVERY_PATTERNS,
  DOC_ACCEPT,
  DOC_MAX_BYTES,
  DOC_MIME,
  FALLBACK_COUNTRIES,
  FALLBACK_CURRENCIES,
  PAYMENT_TERMS,
  QUALITY_LEVELS,
  RESPONSE_TIMES,
  emptyVendor,
} from "./vendorConstants";
import {
  createVendor,
  getCountries,
  getCurrencies,
  getVendor,
  getVendorCodeConfig,
  listVendorGroups,
  updateVendor,
} from "./vendorApi";
import "./vendor.css";

const TABS = [
  { key: "general", label: "General" },
  { key: "registration", label: "Registration" },
  { key: "payment", label: "Payment Terms" },
  { key: "performance", label: "Performance & Remarks" },
];

export default function VendorMaster({
  canCreate = true,
  canEdit = true,
  legalEntityName = "",
}) {
  const navigate = useNavigate();
  const params = useParams();
  const editingCode = params.vendorCode || null;
  const isEdit = Boolean(editingCode);
  const allowed = isEdit ? canEdit : canCreate;

  const [form, setForm] = useState(emptyVendor());
  const [activeTab, setActiveTab] = useState("general");
  const [visited, setVisited] = useState({ general: true });
  const [errors, setErrors] = useState({});
  const [groups, setGroups] = useState([{ value: "NA", label: "NA" }]);
  const [countries, setCountries] = useState(FALLBACK_COUNTRIES);
  const [currencies, setCurrencies] = useState(FALLBACK_CURRENCIES);
  const [codeConfig, setCodeConfig] = useState({ autoGenerate: false, prefix: "" });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const clearToast = useCallback(() => setToast(null), []);
  const set = (key) => (value) =>
    setForm((f) => ({ ...f, [key]: value }));
  const onText = (key) => (e) => set(key)(e.target.value);

  /* ---- masters ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await listVendorGroups({ status: "Active" });
        if (!alive || !Array.isArray(rows)) return;
        const mapped = rows.map((r) => ({
          value: r.groupCode ?? r.GROUPCODE,
          label: r.groupName ?? r.GROUPNAME,
        }));
        if (mapped.length) setGroups(mapped);
      } catch {
        /* keep NA */
      }
      try {
        const rows = await getCountries();
        if (!alive || !Array.isArray(rows) || !rows.length) return;
        setCountries(
          rows.map((r) =>
            typeof r === "string" ? r : r.name ?? r.COUNTRYNAME ?? r.CNAME
          ).filter(Boolean)
        );
      } catch {
        /* keep fallback */
      }
      try {
        const rows = await getCurrencies();
        if (!alive || !Array.isArray(rows) || !rows.length) return;
        setCurrencies(
          rows.map((r) => ({
            code: r.code ?? r.CURRENCYCODE,
            name: r.name ?? r.CURRENCYNAME ?? r.code ?? r.CURRENCYCODE,
          }))
        );
      } catch {
        /* keep fallback */
      }
      try {
        const cfg = await getVendorCodeConfig();
        if (alive && cfg) {
          setCodeConfig({
            autoGenerate: Boolean(cfg.autoGenerate ?? cfg.AUTOGENERATE),
            prefix: cfg.prefix ?? cfg.PREFIX ?? "",
          });
        }
      } catch {
        /* manual entry */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---- existing vendor ---- */
  useEffect(() => {
    if (!isEdit) return undefined;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const data = await getVendor(editingCode);
        if (alive && data) setForm({ ...emptyVendor(), ...data });
      } catch (err) {
        if (alive) setToast({ type: "error", message: err.message });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [editingCode, isEdit]);

  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c.code, label: c.name })),
    [currencies]
  );

  const statusLabel = form.isActive ? "Active" : "Draft";

  /* ---- validation ---- */
  const validateTab = (tab, data) => {
    const e = {};
    if (tab === "general") {
      if (!codeConfig.autoGenerate && !data.vendorCode.trim())
        e.vendorCode = "Vendor Code is required.";
      if (!data.vendorName.trim()) e.vendorName = "Vendor Name is required.";
      if (!data.vendorGroupCode) e.vendorGroupCode = "Vendor Group is required.";
      if (!data.addressLine1.trim())
        e.addressLine1 = "Address Line 1 is required.";
      if (!data.city.trim()) e.city = "City is required.";
      if (!data.country) e.country = "Country is required.";
    }
    if (tab === "registration") {
      if (!data.regDocNumber.trim())
        e.regDocNumber = "Registration Document Number is required.";
      if (!data.regDocName && !data.regDocData)
        e.regDoc = "A registration document must be attached.";
      if (!data.accountHolderName.trim())
        e.accountHolderName = "Account Holder Name is required.";
      if (!data.bankName.trim()) e.bankName = "Bank Name is required.";
      if (!data.accountNumber.trim())
        e.accountNumber = "Account Number is required.";
      if (!data.iban.trim()) e.iban = "IBAN is required.";
      if (!data.swiftCode.trim()) e.swiftCode = "SWIFT / BIC Code is required.";
    }
    if (tab === "payment") {
      if (!data.paymentTerms) e.paymentTerms = "Payment Terms is required.";
      if (!data.currency) e.currency = "Currency is required.";
      if (data.creditLimit !== "" && data.creditLimit !== null) {
        const n = Number(data.creditLimit);
        if (Number.isNaN(n)) e.creditLimit = "Credit Limit must be a number.";
        else if (n < 0) e.creditLimit = "Credit Limit cannot be negative.";
      }
    }
    return e;
  };

  const validateDraft = (data) => {
    const e = {};
    if (!codeConfig.autoGenerate && !data.vendorCode.trim())
      e.vendorCode = "Vendor Code is required.";
    if (!data.vendorName.trim()) e.vendorName = "Vendor Name is required.";
    return e;
  };

  const validateAll = (data) => ({
    ...validateTab("general", data),
    ...validateTab("registration", data),
    ...validateTab("payment", data),
  });

  const goTab = (key) => {
    setVisited((v) => ({ ...v, [key]: true }));
    setActiveTab(key);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const next = () => {
    const e = validateTab(activeTab, form);
    setErrors(e);
    if (Object.keys(e).length) {
      setToast({ type: "error", message: "Complete the required fields on this tab." });
      return;
    }
    const i = TABS.findIndex((t) => t.key === activeTab);
    if (i < TABS.length - 1) goTab(TABS[i + 1].key);
  };

  const back = () => {
    const i = TABS.findIndex((t) => t.key === activeTab);
    if (i > 0) goTab(TABS[i - 1].key);
  };

  /* ---- file ---- */
  const onPickFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!DOC_MIME.includes(file.type)) {
      setToast({ type: "error", message: "Attach a PDF, JPG or PNG file." });
      e.target.value = "";
      return;
    }
    if (file.size > DOC_MAX_BYTES) {
      setToast({ type: "error", message: "The file must be 10MB or smaller." });
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        regDocName: file.name,
        regDocMimeType: file.type,
        regDocData: String(reader.result || ""),
      }));
      setErrors((prev) => ({ ...prev, regDoc: undefined }));
    };
    reader.onerror = () =>
      setToast({ type: "error", message: "That file could not be read." });
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setForm((f) => ({ ...f, regDocName: "", regDocMimeType: "", regDocData: "" }));
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ---- save ---- */
  const persist = async (payload) => {
    setSaving(true);
    try {
      const saved = isEdit
        ? await updateVendor(editingCode, payload)
        : await createVendor(payload);
      const code =
        (saved && (saved.vendorCode || saved.VENDORCODE)) ||
        payload.vendorCode ||
        editingCode;
      setToast({
        message: payload.isActive ? "Vendor saved." : "Vendor saved as draft.",
      });
      if (code) navigate(`/supply-chain/vendors/${encodeURIComponent(code)}`);
      else navigate("/supply-chain/vendors");
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = () => {
    const e = validateDraft(form);
    setErrors(e);
    if (Object.keys(e).length) {
      goTab("general");
      setToast({ type: "error", message: "Vendor Code and Vendor Name are needed to save a draft." });
      return;
    }
    persist({ ...form, isActive: false });
  };

  const saveVendor = () => {
    const e = validateAll(form);
    setErrors(e);
    if (Object.keys(e).length) {
      const firstTab =
        ["general", "registration", "payment"].find(
          (t) => Object.keys(validateTab(t, form)).length
        ) || "general";
      goTab(firstTab);
      setToast({ type: "error", message: "Complete the required fields before saving." });
      return;
    }
    persist(form);
  };

  if (!allowed) {
    return (
      <div className="vm-scope">
        <div className="vm-card vm-empty">
          <b>You do not have permission to open this screen</b>
          Ask an administrator for the Vendor Master permission.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="vm-scope">
        <div className="vm-card vm-loading">Loading vendor…</div>
      </div>
    );
  }

  return (
    <div className="vm-scope">
      <Crumb
        items={[
          { label: "Supply Chain" },
          { label: "Vendor Management", onClick: () => navigate("/supply-chain/vendors") },
          { label: isEdit ? form.vendorCode || editingCode : "New Vendor" },
        ]}
      />

      <div className="vm-head">
        <div>
          <h1 className="vm-title">{isEdit ? form.vendorName || "Vendor" : "New Vendor"}</h1>
          {legalEntityName && (
            <div className="vm-subtitle">
              Legal Entity: <b>{legalEntityName}</b>
            </div>
          )}
        </div>
        <span className="vm-chip-draft">{statusLabel}</span>
      </div>

      <div className="vm-card">
        <div className="vm-tabs" role="tablist">
          {TABS.map((t) => {
            const done = visited[t.key] && t.key !== activeTab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                className={`vm-tab${activeTab === t.key ? " is-active" : ""}${
                  done ? " is-done" : ""
                }`}
                onClick={() => goTab(t.key)}
              >
                <span className="vm-tab-mark">{done ? "✓" : "○"}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ---- general ---- */}
        {activeTab === "general" && (
          <>
            <h2 className="vm-section-title">General</h2>
            <div className="vm-grid">
              <Field
                label="Vendor Code"
                required
                error={errors.vendorCode}
                hint={
                  codeConfig.autoGenerate
                    ? `Generated automatically using the prefix ${codeConfig.prefix || "set in Legal Entity Setup"}.`
                    : ""
                }
              >
                <TextInput
                  value={codeConfig.autoGenerate ? "" : form.vendorCode}
                  onChange={onText("vendorCode")}
                  disabled={codeConfig.autoGenerate || isEdit}
                  placeholder={
                    codeConfig.autoGenerate
                      ? "Generated on save"
                      : "Enter vendor code"
                  }
                  error={errors.vendorCode}
                />
              </Field>

              <Field label="Vendor Name" required error={errors.vendorName}>
                <TextInput
                  value={form.vendorName}
                  onChange={onText("vendorName")}
                  placeholder="e.g. Al Rawabi Medical Supplies"
                  error={errors.vendorName}
                />
              </Field>

              <Field label="Vendor Group" required error={errors.vendorGroupCode}>
                <Select
                  value={form.vendorGroupCode}
                  onChange={onText("vendorGroupCode")}
                  options={groups}
                  error={errors.vendorGroupCode}
                />
              </Field>
            </div>

            <hr className="vm-divider" />

            <h2 className="vm-section-title">Address</h2>
            <div className="vm-grid">
              <Field
                label="Address Line 1 — Street"
                required
                error={errors.addressLine1}
              >
                <TextInput
                  value={form.addressLine1}
                  onChange={onText("addressLine1")}
                  placeholder="Street name, building number"
                  error={errors.addressLine1}
                />
              </Field>

              <Field label="Address Line 2 — Landmark">
                <TextInput
                  value={form.addressLine2}
                  onChange={onText("addressLine2")}
                  placeholder="Nearest landmark (optional)"
                />
              </Field>

              <Field label="City" required error={errors.city}>
                <TextInput
                  value={form.city}
                  onChange={onText("city")}
                  placeholder="e.g. Riyadh"
                  error={errors.city}
                />
              </Field>

              <Field label="State / Region">
                <TextInput
                  value={form.stateRegion}
                  onChange={onText("stateRegion")}
                  placeholder="e.g. Riyadh Province"
                />
              </Field>

              <Field label="Country" required error={errors.country}>
                <Select
                  value={form.country}
                  onChange={onText("country")}
                  options={countries}
                  placeholder="Select country"
                  error={errors.country}
                />
              </Field>

              <Field label="Postal Code">
                <TextInput
                  value={form.postalCode}
                  onChange={onText("postalCode")}
                  placeholder="e.g. 12211"
                />
              </Field>
            </div>

            <hr className="vm-divider" />

            <h2 className="vm-section-title">Status</h2>
            <div className="vm-toggle-row">
              <div className="vm-toggle-copy">
                <h4>
                  Activate<span className="vm-req">*</span>
                </h4>
                <p>
                  New vendors are created in Draft. Only Activated vendors are
                  available for transactions such as Purchase Orders.
                </p>
              </div>
              <Switch
                label="Activate"
                checked={form.isActive}
                onChange={set("isActive")}
              />
            </div>
            <div className="vm-toggle-row">
              <div className="vm-toggle-copy">
                <h4>Block Vendor for Further Transactions</h4>
                <p>
                  Temporarily blocks a vendor from new transactions without
                  deactivating them — use for performance issues or a hold
                  period. The vendor stays Active.
                </p>
              </div>
              <Switch
                label="Block vendor for further transactions"
                checked={form.isBlocked}
                onChange={set("isBlocked")}
              />
            </div>

            <div className="vm-actions">
              <button
                type="button"
                className="vm-btn vm-btn-ghost"
                onClick={saveDraft}
                disabled={saving}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className="vm-btn vm-btn-primary"
                onClick={next}
              >
                Next: Registration →
              </button>
            </div>
          </>
        )}

        {/* ---- registration ---- */}
        {activeTab === "registration" && (
          <>
            <h2 className="vm-section-title">Registration</h2>
            <div className="vm-grid">
              <Field
                label="Registration Document Number"
                required
                full
                error={errors.regDocNumber}
                hint="Must be unique — no two vendors may share the same document number."
              >
                <TextInput
                  value={form.regDocNumber}
                  onChange={onText("regDocNumber")}
                  placeholder="e.g. CR-1010234567"
                  error={errors.regDocNumber}
                />
              </Field>

              <Field
                label="Vendor Registration Document"
                required
                full
                error={errors.regDoc}
                hint="Commercial registration, or a blank/cancelled bank cheque."
              >
                <div className="vm-file">
                  <span
                    className={`vm-file-name${form.regDocName ? " has-file" : ""}`}
                  >
                    {form.regDocName || "No file chosen — PDF, JPG, PNG up to 10MB"}
                  </span>
                  <span className="vm-file-actions">
                    {form.regDocName && (
                      <button
                        type="button"
                        className="vm-file-clear"
                        onClick={clearFile}
                      >
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      className="vm-file-choose"
                      onClick={() => fileRef.current && fileRef.current.click()}
                    >
                      Choose File
                    </button>
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={DOC_ACCEPT}
                    onChange={onPickFile}
                    style={{ display: "none" }}
                  />
                </div>
              </Field>
            </div>

            <hr className="vm-divider" />

            <h2 className="vm-section-title">Bank Details</h2>
            <p className="vm-section-note">
              Used for bank transfer payments to this vendor.
            </p>
            <div className="vm-grid">
              <Field
                label="Account Holder Name"
                required
                error={errors.accountHolderName}
              >
                <TextInput
                  value={form.accountHolderName}
                  onChange={onText("accountHolderName")}
                  placeholder="As per bank records"
                  error={errors.accountHolderName}
                />
              </Field>

              <Field label="Bank Name" required error={errors.bankName}>
                <TextInput
                  value={form.bankName}
                  onChange={onText("bankName")}
                  placeholder="e.g. Al Rajhi Bank"
                  error={errors.bankName}
                />
              </Field>

              <Field label="Account Number" required error={errors.accountNumber}>
                <TextInput
                  value={form.accountNumber}
                  onChange={onText("accountNumber")}
                  placeholder="Bank account number"
                  error={errors.accountNumber}
                />
              </Field>

              <Field label="IBAN" required error={errors.iban}>
                <TextInput
                  value={form.iban}
                  onChange={(e) => set("iban")(e.target.value.toUpperCase())}
                  placeholder="SA00 0000 0000 0000 0000 0000"
                  error={errors.iban}
                />
              </Field>

              <Field label="SWIFT / BIC Code" required error={errors.swiftCode}>
                <TextInput
                  value={form.swiftCode}
                  onChange={(e) => set("swiftCode")(e.target.value.toUpperCase())}
                  placeholder="e.g. RJHISARI"
                  error={errors.swiftCode}
                />
              </Field>

              <Field label="Branch Name">
                <TextInput
                  value={form.branchName}
                  onChange={onText("branchName")}
                  placeholder="Branch (optional)"
                />
              </Field>
            </div>

            <div className="vm-actions">
              <button
                type="button"
                className="vm-btn vm-btn-ghost vm-spacer"
                onClick={back}
              >
                ← Back
              </button>
              <button
                type="button"
                className="vm-btn vm-btn-ghost"
                onClick={saveDraft}
                disabled={saving}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className="vm-btn vm-btn-primary"
                onClick={next}
              >
                Next: Payment Terms →
              </button>
            </div>
          </>
        )}

        {/* ---- payment terms ---- */}
        {activeTab === "payment" && (
          <>
            <h2 className="vm-section-title">Payment Terms</h2>
            <div className="vm-grid">
              <Field label="Payment Terms" required error={errors.paymentTerms}>
                <Select
                  value={form.paymentTerms}
                  onChange={onText("paymentTerms")}
                  options={PAYMENT_TERMS}
                  placeholder="Select payment terms"
                  error={errors.paymentTerms}
                />
              </Field>

              <Field label="Currency" required error={errors.currency}>
                <Select
                  value={form.currency}
                  onChange={onText("currency")}
                  options={currencyOptions}
                  placeholder="Select currency"
                  error={errors.currency}
                />
              </Field>

              <Field
                label="Credit Limit"
                full
                error={errors.creditLimit}
                hint="Optional. Maximum outstanding balance permitted for this vendor."
              >
                <div className="vm-prefix-wrap">
                  <span className="vm-prefix">{form.currency || "SAR"}</span>
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.creditLimit}
                    onChange={onText("creditLimit")}
                    placeholder="e.g. 50,000"
                    error={errors.creditLimit}
                  />
                </div>
              </Field>
            </div>

            <div className="vm-notice vm-notice-info" style={{ marginTop: 18 }}>
              <b>Available Payment Terms:</b> {PAYMENT_TERMS.join(", ")}.
            </div>

            <div className="vm-actions">
              <button
                type="button"
                className="vm-btn vm-btn-ghost vm-spacer"
                onClick={back}
              >
                ← Back
              </button>
              <button
                type="button"
                className="vm-btn vm-btn-ghost"
                onClick={saveDraft}
                disabled={saving}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className="vm-btn vm-btn-primary"
                onClick={next}
              >
                Next: Performance & Remarks →
              </button>
            </div>
          </>
        )}

        {/* ---- performance & remarks ---- */}
        {activeTab === "performance" && (
          <>
            <h2 className="vm-section-title">Performance &amp; Remarks</h2>
            <div className="vm-notice vm-notice-amber">
              <b>Not required to create this vendor.</b> These fields are usually
              unknown until you&apos;ve transacted with a vendor over time. Leave
              them as Not Defined for now — anyone with Edit Vendor Master
              permission can update them later, and changes are reflected
              immediately on the vendor list and record.
            </div>

            <div className="vm-grid">
              <Field label="Remarks" full>
                <textarea
                  className="vm-textarea"
                  value={form.remarks}
                  onChange={onText("remarks")}
                  placeholder="Add any notes about this vendor—certifications, special handling instructions, prior issues, etc."
                />
              </Field>
            </div>

            <hr className="vm-divider" />

            <h2 className="vm-section-title">Performance Tracking</h2>
            <div className="vm-grid">
              <Field label="Quality Level">
                <Select
                  value={form.qualityLevel}
                  onChange={onText("qualityLevel")}
                  options={QUALITY_LEVELS}
                />
              </Field>

              <Field label="Response Time">
                <Select
                  value={form.responseTime}
                  onChange={onText("responseTime")}
                  options={RESPONSE_TIMES}
                />
              </Field>

              <Field
                label="Delivery Pattern (as per lead time)"
                full
                hint="Shown on the vendor list and record once assessed — helps you choose the right vendor when placing a purchase order."
              >
                <Select
                  value={form.deliveryPattern}
                  onChange={onText("deliveryPattern")}
                  options={DELIVERY_PATTERNS}
                />
              </Field>
            </div>

            <div className="vm-badge-cluster">
              <span className="vm-bc-item">
                Quality: <Badge value={form.qualityLevel} />
              </span>
              <span className="vm-bc-item">
                Response: <Badge value={form.responseTime} />
              </span>
              <span className="vm-bc-item">
                Delivery: <Badge value={form.deliveryPattern} />
              </span>
            </div>

            <div className="vm-actions">
              <button
                type="button"
                className="vm-btn vm-btn-ghost vm-spacer"
                onClick={back}
              >
                ← Back
              </button>
              <button
                type="button"
                className="vm-btn vm-btn-ghost"
                onClick={saveDraft}
                disabled={saving}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className="vm-btn vm-btn-primary"
                onClick={saveVendor}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Vendor"}
              </button>
            </div>
          </>
        )}
      </div>

      <Toast toast={toast} onClear={clearToast} />
    </div>
  );
}