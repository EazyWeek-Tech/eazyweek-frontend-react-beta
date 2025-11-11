import { FormPreview } from "./FormPreview";
import { useNavigate } from "react-router-dom";
import "./FormPreview.css"

const GetFormByDetails = () => {
  const navigate = useNavigate();
  const handlenavigate = () => {
    navigate("/custom-forms/form-builder");
  };
  const configData = {
    title: "Custom Form",
    description: "",
    steps: [
      {
        id: "step-1",
        title: "General Information",
        fields: ["field-1762847061346", "field-1762847112842"],
      },
    ],
    fields: [
      {
        id: "field-1762847061346",
        type: "panel",
        label: "Billing",
        placeholder: "",
        required: "optional",
        parentId: null,
        conditionalRules: [],
        validationRules: [],
      },
      {
        id: "field-1762847082362-0.9850351553984178",
        type: "text",
        label: "billing number",
        placeholder: "Enter your text...",
        required: "required",
        parentId: "field-1762847061346",
        conditionalRules: [],
        validationRules: [],
      },
      {
        id: "field-1762847082362-0.8687339762915529",
        type: "email",
        label: "Emailield",
        placeholder: "Enter your email...",
        required: "optional",
        parentId: "field-1762847061346",
        conditionalRules: [],
        validationRules: [],
      },
      {
        id: "field-1762847082362-0.8819150643160226",
        type: "textarea",
        label: "Textarea Field",
        placeholder: "Enter your message...",
        required: "optional",
        parentId: "field-1762847061346",
        rows: 4,
        conditionalRules: [],
        validationRules: [],
      },
      {
        id: "field-1762847082362-0.6557276959023056",
        type: "number",
        label: "Number Field",
        placeholder: "Enter your number...",
        required: "optional",
        parentId: "field-1762847061346",
        min: "",
        max: "",
        step: 1,
        conditionalRules: [],
        validationRules: [],
      },
      {
        id: "field-1762847082362-0.7460993496216899",
        type: "datetime",
        label: "Datetime Field",
        placeholder: "Enter your datetime...",
        required: "optional",
        parentId: "field-1762847061346",
        min: "",
        max: "",
        conditionalRules: [],
        validationRules: [],
      },
      {
        id: "field-1762847112842",
        type: "table",
        label: "Table Field",
        placeholder: "Enter your table...",
        required: "optional",
        parentId: null,
        rows: 4,
        columns: 4,
        conditionalRules: [],
        validationRules: [],
      },
    ],
    isMultiStep: false,
  };
  return (
    <div className="AdvFormBuilder-container">
      <div className="AdvFormBuilder-wrapper">
        <div className="">
          <div className="Form-Data-flex">
            <h1 className="AdvFormBuilder-title">Form Preview</h1>
            <button onClick={handlenavigate} className="formpreview-bydata">Add</button>
          </div>
        </div>
        <FormPreview config={configData} />
      </div>
    </div>
  );
};

export default GetFormByDetails;
