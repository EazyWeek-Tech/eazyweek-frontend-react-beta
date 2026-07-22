import { API_BASE_URL } from "../../config";

/* ══ SHARED CUSTOMER FIELD HELPERS ══════════════════════════════════════════
   One source of truth for the bits of customer handling that both the booking
   drawer and the invoice pre-check need. Kept here so the Citizen / Expat rule
   lives in exactly ONE place — if it drifts between two copies, the appointment
   screen and the invoice screen will disagree about the same customer.
   ═══════════════════════════════════════════════════════════════════════════ */

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

export const cfGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json();
  return j.data ?? j;
};

export const cfPost = async (url, payload) => {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  return j.data ?? j;
};

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); }
  catch { return {}; }
};

// Names: Unicode letters (incl. Arabic), marks, spaces, . ' - — same rule as
// Customer Master, so a quick-created customer passes the same validation.
export const sanitizeName   = (v) => String(v ?? "").replace(/[^\p{L}\p{M}\s.'-]/gu, "");
export const sanitizeDigits = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 15);

// KSA numbers arrive as 05xxxxxxxx, 5xxxxxxxx or 9665xxxxxxxx — normalise before
// comparing, otherwise the duplicate check misses the same person.
export const normMobile = (v) =>
  String(v ?? "").replace(/\D/g, "").replace(/^966/, "").replace(/^0/, "");

// ── Nationality master — fetched once per page load, shared by every consumer ─
let _natCache = null;
export const loadNationalities = () => {
  if (!_natCache) {
    _natCache = cfGet(`${API_BASE_URL}/api/Master/Nationality`)
      .then((d) => (Array.isArray(d) ? d : []))
      .catch(() => []);
  }
  return _natCache;
};

export const natCodeOf    = (n) => String(n?.code ?? n?.id ?? n?.NCODE ?? n?.nationalityCode ?? "");
export const natNameOf    = (n) => String(n?.name ?? n?.NATIONALITYNAME ?? n?.nationalityName ?? "");
export const natCountryOf = (n) => String(n?.countryId ?? n?.COUNTRY_ID ?? n?.countryCode ?? "");

// A stored NATIONALITY_ID of 0 / "" / null all mean "never set".
export const hasNationality = (code) => {
  const n = Number(code);
  return Number.isFinite(n) && n > 0;
};

/* Citizen / Expat classification — mirrors classifyCustomerType() in
   CustomerMaster.jsx: Citizen ONLY when the chosen nationality's country matches
   the centre's country; every other nationality (including ones with no country
   mapping in master data) is an Expat. If the centre country cannot be resolved
   we send "" rather than guess — a blank is correctable, a wrong badge is not.
   The repository's UPDATE keeps the existing CUSTOMERTYPE when "" is sent
   (ISNULL(NULLIF(@CUSTTYPE,''), CUSTOMERTYPE)), so a blank is never destructive.

   ⚠ ONE LINE TO ALIGN: point CENTRE_COUNTRY_ID at whatever source
   CustomerFormPanel uses if it is not on the session user object. */
export const CENTRE_COUNTRY_ID = () => {
  const u = getUser();
  return String(u?.countryId ?? u?.countryCode ?? u?.centreCountryId ?? "");
};

export const classifyCustomerType = (natItem) => {
  const centre = CENTRE_COUNTRY_ID();
  if (!natItem || !centre) return "";
  const nc = natCountryOf(natItem);
  return nc && nc === centre ? "Citizen" : "Expat";
};

// ── Customer record lookup ───────────────────────────────────────────────────
export const fetchCustomerDetails = async (custId) => {
  if (!custId) return null;
  try {
    const d = await cfPost(`${API_BASE_URL}/api/Customer/FetchCustomerDetails`, { custID: custId });
    return d && d.success !== false ? d : null;
  } catch { return null; }
};

/* ── ensureCustomerId ─────────────────────────────────────────────────────────
   Find-or-create, used at Save Appointment time. The receptionist never has to
   think about the customer master: if what she typed matches nobody, the record
   is created silently and the booking proceeds against it.

     1. already linked (picked from the search list)  -> use that id
     2. mobile matches an existing customer           -> link to them, no duplicate
     3. otherwise                                     -> create, return the new id

   Throws with a readable message when creation is impossible (no name/mobile,
   or the role lacks MDM.CUSTOMERS_CREATE and the API refuses) so the caller can
   surface it on the existing toast instead of writing an orphan booking.
   ──────────────────────────────────────────────────────────────────────────── */
export const ensureCustomerId = async (form = {}, centerCode = "") => {
  const linked = String(form.custid || "").trim();
  if (linked) return linked;

  const digits = normMobile(form.number);
  const first  = String(form.firstname || "").trim();
  const last   = String(form.lastname  || "").trim();

  // 2 — same mobile at this centre means the same person, not a new one.
  if (digits.length >= 9 && centerCode) {
    try {
      const hits = await cfGet(
        `${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(digits)}/${encodeURIComponent(centerCode)}`
      );
      const hit = (Array.isArray(hits) ? hits : [])
        .find(i => normMobile(i.mobile) === digits);
      if (hit?.custId) return hit.custId;
    } catch { /* lookup failure falls through to create */ }
  }

  // 3 — create. Name and mobile are the minimum a usable record needs.
  if (!first)            throw new Error("Enter the customer's first name before saving.");
  if (digits.length < 9) throw new Error("Enter a valid mobile number before saving.");

  const natList = await loadNationalities();
  const natItem = form.nationalityCode
    ? natList.find(n => natCodeOf(n) === String(form.nationalityCode))
    : null;

  const res = await cfPost(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
    customerId:      "",                    // empty = INSERT
    centerCode,
    firstName:       first,
    lastName:        last,
    email:           form.email  || "",
    mobilePhone:     digits,
    phoneCode:       "+966",
    gender:          form.gender || "",
    nationalityCode: form.nationalityCode || "",
    customerType:    classifyCustomerType(natItem),
  });

  if (res?.success === false) throw new Error(res?.message || "Could not create the customer.");
  const newId = res?.custId || res?.customerId || "";
  if (!newId) throw new Error("Customer was created but no ID came back — please search and select them.");
  return newId;
};