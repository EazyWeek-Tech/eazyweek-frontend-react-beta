/* ==================== FORM FIELD CATALOG ==================== */

const BLANK = [""];
const BLANK_OR_ZERO = ["", "0"];

/* ---- courtesy call ---- */

const CCALL = {
  formCode: "CCALL",
  formName: "Courtesy Call",
  allowLabel: true,
  validateOn: "submit",
  sections: [
    { key: "before", name: "Before Call Parameters" },
    { key: "after", name: "After Call Parameters" },
  ],
  fields: [
    {
      key: "customerType",
      label: "Customer Type",
      section: "before",
      control: "readonly",
      defaultMandatory: false,
      lockMandatory: true,
      allowLabel: true,
      allowHide: false,
      emptyValues: BLANK,
    },
    {
      key: "futureAppointmentTaken",
      label: "Future Appointment Taken",
      section: "before",
      control: "yesno",
      defaultMandatory: false,
      emptyValues: BLANK_OR_ZERO,
    },
    {
      key: "googleReview",
      label: "Google Review",
      section: "after",
      control: "yesno",
      defaultMandatory: false,
      emptyValues: BLANK_OR_ZERO,
    },
    {
      key: "receivedPostCareCmmunication",
      label: "Received Post Care Communication",
      section: "after",
      control: "yesno",
      defaultMandatory: false,
      emptyValues: BLANK_OR_ZERO,
    },
    {
      key: "receivedInvoice",
      label: "Received Invoice",
      section: "after",
      control: "yesno",
      defaultMandatory: false,
      emptyValues: BLANK_OR_ZERO,
    },
    {
      key: "customerFeedback",
      label: "Customer Feedback",
      section: "after",
      control: "select",
      payloadKey: "complaintDetails",
      defaultMandatory: false,
      emptyValues: BLANK,
    },
    {
      key: "overallSatisfied",
      label: "Overall Satisfied",
      section: "after",
      control: "yesno",
      defaultMandatory: false,
      emptyValues: BLANK_OR_ZERO,
    },
    {
      key: "experienceRating",
      label: "Experience Rating (1–5)",
      section: "after",
      control: "rating",
      defaultMandatory: false,
      emptyValues: BLANK,
    },
    {
      key: "agentRating",
      label: "Call Center Agent Rating (1–5)",
      section: "after",
      control: "rating",
      defaultMandatory: false,
      emptyValues: BLANK,
    },
    {
      key: "customerComplaintforService",
      label: "Customer Complaint for Service",
      section: "after",
      control: "select",
      defaultMandatory: false,
      emptyValues: BLANK,
    },
    {
      key: "customerComplaintRemarks",
      label: "Customer Remarks",
      section: "after",
      control: "textarea",
      defaultMandatory: false,
      emptyValues: BLANK,
    },
    {
      key: "agentdecision",
      label: "Agent Decision",
      section: "after",
      control: "textarea",
      defaultMandatory: false,
      emptyValues: BLANK,
    },
  ],
};

/* ---- registry ---- */

const FORMS = { [CCALL.formCode]: CCALL };

const DEFAULTS = {
  defaultMandatory: false,
  defaultVisible: true,
  lockMandatory: false,
  allowLabel: true,
  allowHide: true,
  emptyValues: BLANK,
  control: "text",
  section: "",
};

const getForm = (formCode) => FORMS[String(formCode || "").trim().toUpperCase()] || null;

const getFormCodes = () => Object.keys(FORMS);

const getFields = (formCode) => {
  const form = getForm(formCode);
  if (!form) return [];
  return form.fields.map((f, i) => ({
    ...DEFAULTS,
    allowLabel: form.allowLabel === false ? false : DEFAULTS.allowLabel,
    ...f,
    payloadKey: f.payloadKey || f.key,
    catalogOrder: i + 1,
  }));
};

const getField = (formCode, fieldKey) =>
  getFields(formCode).find((f) => f.key === String(fieldKey || "").trim()) || null;

const isBlank = (field, value) => {
  const v = value === null || value === undefined ? "" : String(value).trim();
  const empties = (field && field.emptyValues) || BLANK;
  return empties.some((e) => v === e);
};

module.exports = {
  FORMS,
  DEFAULTS,
  getForm,
  getFormCodes,
  getFields,
  getField,
  isBlank,
};