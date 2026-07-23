import React, { forwardRef, useRef, useState, useImperativeHandle } from "react";

/**
 * ClearableInput — a drop-in replacement for <input> that shows an × while the
 * field has a value.
 *
 * Usage: change the tag, keep every prop.
 *
 *     <input          className="inp" name="firstName" value={form.firstName} onChange={onChange} />
 *     <ClearableInput className="inp" name="firstName" value={form.firstName} onChange={onChange} />
 *
 * WHY THE CLEAR IS DONE THE WAY IT IS
 * The obvious implementation — calling onChange with a hand-built object like
 * { target: { name, value: "" } } — breaks on real handlers. Yours read different
 * properties off the event target: CustomerMaster's handleInput uses e.target.name,
 * AppointmentDrawer's handleChange uses e.target.id, and the ManualOpp mobile field
 * runs e.target.value through a digit filter. A fake target satisfies some of those
 * and silently fails the rest.
 *
 * Instead we write the value through the native HTMLInputElement value setter and
 * dispatch a real bubbling "input" event. React's onChange is delegated from that
 * event, so the handler receives a genuine synthetic event whose target IS the real
 * input — name, id, type, dataset and all. Every existing handler keeps working
 * with no changes.
 */

const setNativeValue = (el, value) => {
  const proto = Object.getPrototypeOf(el);
  const desc =
    Object.getOwnPropertyDescriptor(proto, "value") ||
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  if (desc && desc.set) desc.set.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

const ClearableInput = forwardRef(function ClearableInput(
  {
    // wrapper escape hatches — needed when the input sits in a flex row and the
    // sizing has to move from the input to the wrapper (e.g. style={{ flex: 1 }})
    wrapperStyle,
    wrapperClassName,
    clearLabel = "Clear",
    onCleared,
    style,
    ...rest
  },
  ref
) {
  const innerRef = useRef(null);
  useImperativeHandle(ref, () => innerRef.current, []);

  // Controlled inputs are the norm here, but support uncontrolled too.
  const isControlled = rest.value !== undefined;
  const [uncontrolledHasValue, setUncontrolledHasValue] = useState(false);
  const hasValue = isControlled
    ? String(rest.value ?? "") !== ""
    : uncontrolledHasValue;

  const disabled = rest.disabled || rest.readOnly;
  const showClear = hasValue && !disabled;

  const handleChange = (e) => {
    if (!isControlled) setUncontrolledHasValue(e.target.value !== "");
    rest.onChange?.(e);
  };

  const clear = () => {
    const el = innerRef.current;
    if (!el) return;
    setNativeValue(el, "");
    if (!isControlled) setUncontrolledHasValue(false);
    el.focus();
    onCleared?.();
  };

  return (
    <span
      className={wrapperClassName}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: "100%",
        ...wrapperStyle,
      }}
    >
      <input
        {...rest}
        ref={innerRef}
        onChange={handleChange}
        style={{
          width: "100%",
          // room for the button so long values don't run underneath it
          paddingRight: showClear ? 28 : undefined,
          ...style,
        }}
      />
      {showClear && (
        <button
          type="button"                       // never submits the surrounding form
          tabIndex={-1}                       // stays out of the tab order
          aria-label={clearLabel}
          title={clearLabel}
          // mousedown fires before blur — preventing it keeps focus in the field
          onMouseDown={(e) => e.preventDefault()}
          onClick={clear}
          style={{
            position: "absolute",
            right: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            padding: 0,
            border: "none",
            borderRadius: "50%",
            background: "#e2e8f0",
            color: "#475569",
            fontSize: 12,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      )}
    </span>
  );
});

/**
 * ClearButton — the × on its own, for markup that CANNOT be wrapped.
 *
 * Floating-label fields (placeholder=" " plus a sibling <label>) rely on CSS
 * sibling selectors such as `input:not(:placeholder-shown) + label`. Wrapping the
 * input in an element breaks that adjacency and the label stops floating, so in
 * those forms the button has to be a SIBLING inside the existing positioned
 * container rather than a wrapper around the input.
 *
 *     <div className="form-group" style={{ position:"relative" }}>
 *       <input id="firstname" value={form.firstname} onChange={handleChange} />
 *       <label htmlFor="firstname" className="frmlbl">First Name</label>
 *       <ClearButton targetId="firstname" show={!!form.firstname} />
 *     </div>
 *
 * Pass `onClear` instead of relying on the dispatched event when clearing has to
 * reset more than the one field (e.g. a service picker that also holds a code).
 */
export function ClearButton({ targetId, show, onClear, label = "Clear", style }) {
  if (!show) return null;

  const handle = () => {
    if (onClear) { onClear(); return; }
    const el = typeof document !== "undefined" && document.getElementById(targetId);
    if (!el) return;
    setNativeValue(el, "");
    el.focus();
  };

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={handle}
      style={{
        position: "absolute",
        right: 8,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        padding: 0,
        border: "none",
        borderRadius: "50%",
        background: "#e2e8f0",
        color: "#475569",
        fontSize: 12,
        lineHeight: 1,
        cursor: "pointer",
        zIndex: 3,
        ...style,
      }}
    >
      ×
    </button>
  );
}

export default ClearableInput;