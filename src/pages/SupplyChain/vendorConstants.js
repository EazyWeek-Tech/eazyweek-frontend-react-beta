/* ---- performance tracking ---- */
export const QUALITY_LEVELS = [
  "Not Defined",
  "Meets Expectation",
  "Occasionally Compromised",
  "Exceeds Expectation",
];

export const RESPONSE_TIMES = [
  "Not Defined",
  "Below Expectation",
  "Delayed",
  "Proactive",
];

export const DELIVERY_PATTERNS = [
  "Not Defined",
  "Before Time",
  "On Time",
  "Occasionally Late",
  "Always Late",
];

/* ---- payment terms ---- */
export const PAYMENT_TERMS = [
  "Cash on Delivery (COD)",
  "Advance Payment",
  "Net 45 Days",
  "Net 90 Days",
  "Net 180 Days",
];

export const FALLBACK_CURRENCIES = [
  { code: "SAR", name: "SAR — Saudi Riyal" },
  { code: "AED", name: "AED — UAE Dirham" },
  { code: "USD", name: "USD — US Dollar" },
];

export const FALLBACK_COUNTRIES = [
  "Saudi Arabia",
  "United Arab Emirates",
  "Bahrain",
  "Kuwait",
  "Oman",
  "Qatar",
];

/* ---- badge tones ---- */
const TONE = {
  "Before Time": "green",
  "On Time": "teal",
  "Occasionally Late": "amber",
  "Always Late": "coral",
  "Exceeds Expectation": "green",
  "Meets Expectation": "teal",
  "Occasionally Compromised": "amber",
  Proactive: "green",
  Delayed: "amber",
  "Below Expectation": "coral",
  "Not Defined": "grey",
};

export const toneFor = (value) => TONE[value] || "grey";

/* ---- file upload ---- */
export const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png";
export const DOC_MAX_BYTES = 10 * 1024 * 1024;
export const DOC_MIME = ["application/pdf", "image/jpeg", "image/png"];

/* ---- permissions ---- */
export const PERM = {
  VIEW: "VEN.VIEW",
  CREATE: "VEN.CREATE",
  EDIT: "VEN.EDIT",
  GROUP_MANAGE: "VEN.GROUP_MANAGE",
  CODE_CONFIG: "VEN.CODE_CONFIG",
};

/* ---- empty record ---- */
export const emptyVendor = () => ({
  vendorCode: "",
  vendorName: "",
  vendorGroupCode: "NA",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateRegion: "",
  country: "Saudi Arabia",
  postalCode: "",
  isActive: false,
  isBlocked: false,
  regDocNumber: "",
  regDocName: "",
  regDocMimeType: "",
  regDocData: "",
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  iban: "",
  swiftCode: "",
  branchName: "",
  paymentTerms: "",
  currency: "SAR",
  creditLimit: "",
  remarks: "",
  qualityLevel: "Not Defined",
  responseTime: "Not Defined",
  deliveryPattern: "Not Defined",
});