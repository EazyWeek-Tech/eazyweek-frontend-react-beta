/**
 * Suppresses the BROWSER's native autofill / autocomplete dropdown (Chrome & Edge
 * saved data, plus the common password managers) across the app.
 *
 * It deliberately does NOT touch application-level autocomplete: any input that
 * already declares its own autoComplete value, or is marked data-allow-autofill,
 * is left alone. Custom typeahead components are unaffected — in fact stamping
 * autocomplete="off" on their inputs helps, because it stops the browser's own
 * dropdown from rendering on top of the component's suggestion list.
 *
 * Why several attributes rather than just autocomplete="off":
 *   - Chrome honours "off" for most fields but overrides it where it has a strong
 *     heuristic match (name, email, tel, street address, credit card). For those
 *     an UNRECOGNISED token is what actually works: per the HTML spec a token the
 *     browser cannot parse falls back to "off", and Chrome applies that even where
 *     it would have ignored a literal "off". That is the AUTOFILL_TOKEN below.
 *   - Password inputs are a special case. "new-password" is the one value that
 *     reliably suppresses the saved-credential dropdown; "off" does not.
 *   - Password managers are extensions and ignore the autocomplete attribute
 *     entirely, so each needs its own opt-out attribute.
 *
 * None of this can suppress a third-party manager the user has configured to fill
 * unconditionally. Treat it as best-effort hardening, not a guarantee.
 *
 * Usage — call once, e.g. in src/main.jsx after render:
 *     import { initAutofillSuppression } from "./utils/suppressAutofill";
 *     initAutofillSuppression();
 */

// Two different browser features need two different values, and using the wrong
// one re-enables the other:
//
//   FORM HISTORY  — the browser remembering values you previously typed into a
//                   field, offered on focus with nothing typed. Suppressed by the
//                   literal "off". An unrecognised token does NOT suppress it.
//
//   PROFILE FILL  — Chrome filling name / email / phone / address from a saved
//                   profile. Chrome overrides "off" here when it recognises the
//                   field, so an unrecognised token is what actually works, by
//                   stopping the heuristic matching the field to a known type.
//
// So: unrecognised token only for fields Chrome would profile, literal "off"
// everywhere else. Applying the token to a plain text field like a service picker
// leaves its typed history intact — which is the wrong default.
const HISTORY_OFF    = "off";
const AUTOFILL_TOKEN = "off-ezw";

// Last resort for Chrome's ADDRESS autofill (the dropdown headed by a person icon
// and footed by "Manage addresses..."). Chrome ignores the autocomplete attribute
// outright on fields its classifier reads as address fields — name="firstName"
// with a "First Name" label and placeholder is a textbook match — so neither "off"
// nor an unrecognised token has any effect there. That is deliberate Chrome
// behaviour, not something a page can override.
//
// "one-time-code" is a VALID token pointing at a category Chrome holds no saved
// data for, so the classifier stops treating the field as an address field and has
// nothing to offer. Opt in with data-hard-no-autofill on the field or an ancestor.
//
// Verify in your own Chrome before relying on it, and skip it on any field that
// really is a one-time code: on mobile, Chrome and Safari may offer an SMS code.
const HARD_OFF = "one-time-code";

// Field identifiers Chrome maps to a saved profile.
// Anchored at a word boundary so "servicename" / "roomname" / "formname" are NOT
// treated as profile fields — only a real name token is ("firstname", "custname",
// or a bare "name"). Matching "name" as a bare substring was the bug that left the
// Service picker on the profile token and its typed history intact.
const PROFILE_HINT = new RegExp(
  "(^|[^a-z])(" +
    "(first|last|full|middle|given|family|sur|cust|customer|patient|nick|display)?name|" +
    "e?mail|phone|mobile|tel|address|street|city|town|state|province|zip|postal|country|" +
    "compan(y|ies)|organi[sz]ation|birth|bday|dob|nationality" +
  ")", "i");

// One attribute cannot block both features at once, so every field is a choice.
// This app defaults to "off" — blocking typed history — because almost every
// name / email / mobile field here describes the CUSTOMER being entered, not the
// logged-in user:
//
//   profile fill  offers the OPERATOR's own saved details. Wrong data, easy to
//                 ignore, and it never exposes anyone else's information.
//   typed history offers the PREVIOUS CUSTOMER's name, mobile and email to
//                 whoever fills the form next. On a shared reception machine that
//                 is a disclosure between two patients.
//
// The second is the one worth blocking, so "off" wins by default. "off" also
// suppresses profile fill on most non-checkout fields in current Chrome, so the
// token is only needed where you observe Chrome overriding it.
// DEFAULT IS "off" — see the note above isProfileField for why. Opt a field (or a
// subtree) into the token with data-profile-fill-off when Chrome is ignoring "off"
// and pushing saved-profile data at it.
const prefersProfileToken = (el) => !!el.closest("[data-profile-fill-off]");
const prefersHardOff      = (el) => !!el.closest("[data-hard-no-autofill]");

const isProfileField = (el) => {
  if (el.tagName === "INPUT" && /^(email|tel)$/i.test(el.type || "")) return true;
  return PROFILE_HINT.test(
    `${el.name || ""} ${el.id || ""} ${el.getAttribute("placeholder") || ""}`
  );
};

// Extension-specific opt-outs. These are ignored by browsers that don't use them.
const MANAGER_ATTRS = {
  "data-lpignore":   "true",   // LastPass
  "data-1p-ignore":  "true",   // 1Password
  "data-bwignore":   "true",   // Bitwarden
  "data-form-type":  "other",  // Dashlane
};

// Input types that never carry meaningful autofill and can be skipped entirely.
const SKIP_TYPES = new Set([
  "hidden", "submit", "button", "reset", "image", "file", "range", "color",
  "checkbox", "radio",
]);

const shouldSkip = (el) => {
  // Explicit opt-out wins, on the field or any ancestor.
  if (el.closest("[data-allow-autofill]")) return true;
  // Respect an autoComplete the developer set deliberately — except a bare "off",
  // which we upgrade to the token that Chrome actually honours.
  // Values the utility itself assigns are re-derivable, so they are not treated as
  // developer intent. HARD_OFF is deliberately NOT listed: once a field carries
  // one-time-code — whether set in JSX or by a previous pass — leave it alone,
  // otherwise the focusin handler resets it a moment after the developer set it.
  const declared = el.getAttribute("autocomplete");
  if (declared && declared !== HISTORY_OFF && declared !== AUTOFILL_TOKEN) return true;
  if (el.tagName === "INPUT" && SKIP_TYPES.has((el.type || "").toLowerCase())) return true;
  return false;
};

/** Stamp suppression attributes on a single field. Safe to call repeatedly. */
export function suppressAutofillOn(el) {
  if (!el || !el.tagName) return;
  if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
  if (shouldSkip(el)) return;

  if (el.tagName === "INPUT" && (el.type || "").toLowerCase() === "password") {
    el.setAttribute("autocomplete", "new-password");
  } else if (prefersHardOff(el)) {
    el.setAttribute("autocomplete", HARD_OFF);
  } else {
    el.setAttribute(
      "autocomplete",
      isProfileField(el) && prefersProfileToken(el) ? AUTOFILL_TOKEN : HISTORY_OFF
    );
  }
  for (const [attr, value] of Object.entries(MANAGER_ATTRS)) {
    if (!el.hasAttribute(attr)) el.setAttribute(attr, value);
  }
}

/** Stamp suppression attributes on every eligible field inside `root`. */
export function suppressAutofillIn(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;

  // Form-level hint. Harmless where ignored, and it stops Chrome offering to save.
  const forms = root.querySelectorAll
    ? root.querySelectorAll("form:not([data-allow-autofill]):not([data-nf-done])")
    : [];
  forms.forEach((f) => {
    f.setAttribute("autocomplete", HISTORY_OFF);
    f.setAttribute("data-nf-done", "1");
  });

  root.querySelectorAll("input, textarea, select").forEach(suppressAutofillOn);
}

let observer = null;
let focusHandler = null;

/**
 * Start suppressing autofill app-wide. Safe to call more than once.
 * Returns a teardown function.
 */
export function initAutofillSuppression() {
  if (typeof document === "undefined") return () => {};
  if (observer) return stopAutofillSuppression;

  suppressAutofillIn(document);

  // Forms in this app are rendered and re-rendered by React, so a one-off pass on
  // load is not enough — new fields appear on every route change and modal open.
  // The observer is attribute-blind and batched, so the cost is negligible.
  let queued = false;
  observer = new MutationObserver((records) => {
    const relevant = records.some(
      (r) => r.addedNodes && r.addedNodes.length > 0
    );
    if (!relevant || queued) return;
    queued = true;
    // Coalesce bursts of React insertions into a single pass.
    requestAnimationFrame(() => {
      queued = false;
      suppressAutofillIn(document);
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Safety net for the timing gap the observer cannot close: a field that mounts
  // and receives focus within the same frame can open the browser dropdown before
  // the queued pass runs. Stamping on focusin (capture phase, so it fires before
  // any component handler) guarantees the attribute is present by the time the
  // browser decides whether to offer suggestions.
  focusHandler = (e) => suppressAutofillOn(e.target);
  document.addEventListener("focusin", focusHandler, true);

  return stopAutofillSuppression;
}

export function stopAutofillSuppression() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (focusHandler) {
    document.removeEventListener("focusin", focusHandler, true);
    focusHandler = null;
  }
}

export default initAutofillSuppression;