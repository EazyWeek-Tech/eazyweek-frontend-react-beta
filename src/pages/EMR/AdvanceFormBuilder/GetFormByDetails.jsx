import { FormPreview } from "./FormPreview";
import { useNavigate } from "react-router-dom";
import "./FormPreview.css";

const GetFormByDetails = () => {
  const navigate = useNavigate();
  const handlenavigate = () => {
    navigate("/custom-forms/form-builder");
  };
  const configData = {
    id: 11,
    name: "Name",
    schemaJson:
      '{"title":"Custom Form","description":"","steps":[{"id":"step-1","title":"General Information","fields":["field-1762881690439","field-1762881692668","field-1762881694909","field-1762881697216","field-1762881699117"]}],"fields":[{"id":"field-1762881690439","type":"text","label":"Text Field","placeholder":"Enter your text...","required":"optional","parentId":null,"conditionalRules":[],"validationRules":[]},{"id":"field-1762881692668","type":"email","label":"Email Field","placeholder":"Enter your email...","required":"optional","parentId":null,"conditionalRules":[],"validationRules":[]},{"id":"field-1762881694909","type":"table","label":"Table Field","placeholder":"Enter your table...","required":"optional","parentId":null,"rows":1,"columns":2,"conditionalRules":[],"validationRules":[]},{"id":"field-1762881697216","type":"annotation","label":"Annotation Field","placeholder":"Enter your annotation...","required":"optional","parentId":null,"width":400,"height":200,"conditionalRules":[],"validationRules":[]},{"id":"field-1762881699117","type":"panel","label":"Panel Field","placeholder":"Enter your panel...","required":"optional","parentId":null,"layout":"vertical","conditionalRules":[],"validationRules":[]},{"id":"field-1762881707057-0.282118210408443","type":"text","label":"Text Field","placeholder":"Enter your text...","required":"optional","parentId":"field-1762881699117","conditionalRules":[],"validationRules":[]},{"id":"field-1762881707057-0.7651582798932343","type":"email","label":"Email Field","placeholder":"Enter your email...","required":"optional","parentId":"field-1762881699117","conditionalRules":[],"validationRules":[]},{"id":"field-1762881707057-0.6485418294889492","type":"textarea","label":"Textarea Field","placeholder":"Enter your message...","required":"optional","parentId":"field-1762881699117","rows":4,"conditionalRules":[],"validationRules":[]},{"id":"field-1762881707057-0.2994439794271203","type":"number","label":"Number Field","placeholder":"Enter your number...","required":"optional","parentId":"field-1762881699117","min":"","max":"","step":1,"conditionalRules":[],"validationRules":[]},{"id":"field-1762881707057-0.6190974064299272","type":"date","label":"Date Field","placeholder":"Enter your date...","required":"optional","parentId":"field-1762881699117","min":"","max":"","conditionalRules":[],"validationRules":[]},{"id":"field-1762881707057-0.15486549839326436","type":"datetime","label":"Datetime Field","placeholder":"Enter your datetime...","required":"optional","parentId":"field-1762881699117","min":"","max":"","conditionalRules":[],"validationRules":[]}],"isMultiStep":false}',
    createdAt: "2025-11-11T17:20:56.403",
    version: 1,
    updatedAt: "2025-11-11T17:23:07.43858+00:00",
  };
  const parsedSchema = JSON.parse(configData.schemaJson);
  return (
    <div className="AdvFormBuilder-container">
      <div className="AdvFormBuilder-wrapper">
        <div className="">
          <div className="Form-Data-flex">
            <h1 className="AdvFormBuilder-title">Form Preview</h1>
            <button onClick={handlenavigate} className="formpreview-bydata">
              Add
            </button>
          </div>
        </div>
        <FormPreview config={parsedSchema} />
      </div>
    </div>
  );
};

export default GetFormByDetails;
