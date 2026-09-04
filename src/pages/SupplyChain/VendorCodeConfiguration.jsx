import React, { useCallback, useEffect, useState } from "react";
import { Field, TextInput, Toast, YesNo } from "./VendorUI";
import { getVendorCodeConfig, saveVendorCodeConfig } from "./vendorApi";
import "./vendor.css";

export default function VendorCodeConfiguration({ canEdit = true }) {
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cfg = await getVendorCodeConfig();
        if (!alive || !cfg) return;
        setAutoGenerate(Boolean(cfg.autoGenerate ?? cfg.AUTOGENERATE));
        setPrefix(cfg.prefix ?? cfg.PREFIX ?? "");
      } catch {
        /* defaults to manual entry */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    if (autoGenerate && !prefix.trim()) {
      setError("A prefix is required when Vendor Code is auto-generated.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await saveVendorCodeConfig({ autoGenerate, prefix: prefix.trim() });
      setToast({ message: "Vendor Code Configuration saved." });
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="vm-scope vm-embed">
        <div className="vm-card vm-loading">Loading vendor code configuration…</div>
      </div>
    );
  }

  return (
    <div className="vm-scope vm-embed">
      <div className="vm-card">
        <h2 className="vm-section-title">Vendor Code Configuration</h2>
        <p className="vm-section-note">
          Organization-level configuration for Supply Chain.
        </p>

        <div className="vm-toggle-row">
          <div className="vm-toggle-copy">
            <h4>Auto-generate Vendor Code</h4>
            <p>
              When off, users enter a Vendor Code manually when creating a
              vendor. When on, the system generates it automatically using the
              prefix below.
            </p>
          </div>
          <YesNo value={autoGenerate} onChange={setAutoGenerate} disabled={!canEdit} />
        </div>

        <Field
          label="Prefix"
          error={error}
          hint={
            autoGenerate
              ? "Used as the leading part of every generated code."
              : "Used only when Auto-generate Vendor Code is on."
          }
        >
          <TextInput
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            disabled={!autoGenerate || !canEdit}
            placeholder="e.g. VEN-KSA-"
            error={error}
          />
        </Field>

        <div className="vm-notice vm-notice-blue" style={{ marginTop: 16 }}>
          <b>Current setting: {autoGenerate ? "Auto-generated" : "Manual"}.</b>{" "}
          {autoGenerate
            ? `Codes are generated as ${prefix || "PREFIX-"}000148.`
            : "Vendor Code is open for entry on the Vendor Master form."}{" "}
          Each code must still be unique within this legal entity.
        </div>

        {canEdit && (
          <div className="vm-actions">
            <button
              type="button"
              className="vm-btn vm-btn-primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Vendor Code Configuration"}
            </button>
          </div>
        )}
      </div>

      <Toast toast={toast} onClear={clearToast} />
    </div>
  );
}