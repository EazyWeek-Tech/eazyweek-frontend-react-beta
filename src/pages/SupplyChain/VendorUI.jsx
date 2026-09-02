import React, { useEffect } from "react";
import { toneFor } from "./vendorConstants";

/* ---- field wrapper ---- */
export function Field({ label, required, hint, error, full, children }) {
  return (
    <div className={`vm-field${full ? " vm-full" : ""}`}>
      {label && (
        <label className="vm-label">
          {label}
          {required && <span className="vm-req">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="vm-error">{error}</div>
      ) : hint ? (
        <div className="vm-hint">{hint}</div>
      ) : null}
    </div>
  );
}

/* ---- text input ---- */
export function TextInput({ error, ...rest }) {
  return <input className={`vm-input${error ? " has-error" : ""}`} {...rest} />;
}

/* ---- select ---- */
export function Select({ error, options, placeholder, ...rest }) {
  return (
    <select className={`vm-select${error ? " has-error" : ""}`} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const value = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return (
          <option key={value} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

/* ---- switch ---- */
export function Switch({ checked, onChange, disabled, label }) {
  return (
    <div className="vm-toggle-ctl">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`vm-switch${checked ? " is-on" : ""}`}
        onClick={() => onChange(!checked)}
      />
      <span className="vm-toggle-state">{checked ? "Yes" : "No"}</span>
    </div>
  );
}

/* ---- segmented yes / no ---- */
export function YesNo({ value, onChange, disabled }) {
  return (
    <div className="vm-seg">
      <button
        type="button"
        disabled={disabled}
        className={value ? "is-on" : ""}
        onClick={() => onChange(true)}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={disabled}
        className={!value ? "is-on" : ""}
        onClick={() => onChange(false)}
      >
        No
      </button>
    </div>
  );
}

/* ---- badge ---- */
export function Badge({ value, tone, children }) {
  return (
    <span className={`vm-badge tone-${tone || toneFor(value)}`}>
      {children || value}
    </span>
  );
}

/* ---- toast ---- */
export function Toast({ toast, onClear }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onClear, 3500);
    return () => clearTimeout(t);
  }, [toast, onClear]);

  if (!toast) return null;
  return (
    <div className={`vm-toast${toast.type === "error" ? " is-error" : ""}`}>
      {toast.message}
    </div>
  );
}

/* ---- breadcrumb ---- */
export function Crumb({ items }) {
  return (
    <div className="vm-crumb">
      {items.map((it, i) => (
        <span
          key={i}
          className={it.onClick ? "vm-crumb-link" : ""}
          onClick={it.onClick}
        >
          {it.label}
        </span>
      ))}
    </div>
  );
}