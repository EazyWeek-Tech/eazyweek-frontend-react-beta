import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { FileText } from "lucide-react";
import { useToast } from "./use-toast";
import * as FieldComponents from "./FieldComponents";
import "./FormPreview.css"; // Import the external CSS file
import "./panel-styles.css"; // Import panel-specific styles

export const FormPreview = ({ config }) => {
  const [formData, setFormData] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const { toast } = useToast();

  const isFieldVisible = (fieldId) => {
    const field = config.fields.find(f => f.id === fieldId);
    if (!field?.conditionalRules || field.conditionalRules.length === 0) return true;

    return field.conditionalRules.every(rule => {
      const ruleField = config.fields.find(f => f.id === rule.field);
      if (!ruleField) return false;
      const fieldValue = formData[rule.field];
      switch (rule.operator) {
        case "equals": return fieldValue === rule.value;
        case "not_equals": return fieldValue !== rule.value;
        case "contains": return String(fieldValue || "").includes(rule.value);
        case "greater_than": return Number(fieldValue) > Number(rule.value);
        case "less_than": return Number(fieldValue) < Number(rule.value);
        default: return false;
      }
    });
  };

  const validateField = (field, value) => {
    if (!field.validationRules) return null;
    for (const rule of field.validationRules) {
      switch (rule.type) {
        case "min_length": if (String(value || "").length < Number(rule.value)) return rule.message; break;
        case "max_length": if (String(value || "").length > Number(rule.value)) return rule.message; break;
        case "pattern":
          try {
            const regex = new RegExp(String(rule.value));
            if (!regex.test(String(value || ""))) return rule.message;
          } catch {
            return "Invalid pattern";
          }
          break;
      }
    }
    return null;
  };

  const updateFormData = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Generate JSON for all fields metadata
    const fieldsMetadata = config.fields.map(field => ({
      id: field.id,
      label: field.label,
      placeholder: field.placeholder || "",
      required: field.required ? "required" : "optional",
      type: field.type,
      parentId: field.parentId || null
    }));

    console.log("Fields Metadata JSON:", JSON.stringify(fieldsMetadata, null, 2));

    const currentStepFields = config.isMultiStep
      ? config.steps[currentStep]?.fields.filter(fieldId => isFieldVisible(fieldId)) || []
      : config.fields.filter(field => isFieldVisible(field.id)).map(f => f.id);

    const errors = [];
    currentStepFields.forEach(fieldId => {
      const field = config.fields.find(f => f.id === fieldId);
      if (!field) return;
      const value = formData[fieldId];
      if (field.required && (!value || value === "")) {
        errors.push(`${field.label} is required`);
        return;
      }
      const validationError = validateField(field, value);
      if (validationError) errors.push(`${field.label}: ${validationError}`);
    });

    if (errors.length > 0) {
      toast({ title: "Validation Error", description: errors.join(", "), variant: "destructive" });
      return;
    }

    if (config.isMultiStep && currentStep < config.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    toast({
      title: "Form Submitted!",
      description: config.isMultiStep
        ? `Multi-step form completed with ${Object.keys(formData).length} fields.`
        : "Your form has been submitted successfully."
    });

    console.log("Form Data:", formData);
    // Preserve signatures and annotations on form clear
    const preservedData = Object.keys(formData).reduce((acc, key) => {
      const field = config.fields.find(f => f.id === key);
      if (field && (field.type === 'signature' || field.type === 'annotation')) {
        acc[key] = formData[key];
      }
      return acc;
    }, {});
    setFormData(preservedData);
    setCurrentStep(0);
    setFormKey(prev => prev + 1);
  };

  // const goToPreviousStep = () => {
  //   if (currentStep > 0) setCurrentStep(currentStep - 1);
  // };

  const renderField = (field) => {
    if (!isFieldVisible(field.id)) return null;

    if (field.type === 'panel') {
      const childFields = config.fields.filter(f => f.parentId === field.id);
      const layout = field.layout || 'vertical';
      return (
        <div className="FP-form-field-component FP-form-field-panel">
          <div className="FP-card panel-container">
            <div className="panel-label">{field.label}</div>
            <div className={`panel-children ${layout === 'horizontal' ? 'panel-horizontal' : 'panel-vertical'}`}>
              {childFields.map(child => (
                <div key={child.id} style={{ display:"flex", flexDirection:"row", flexWrap:"wrap", width: `${child.width }%` }}>
                <div key={child.id} className={`panel-child ${layout === 'horizontal' ? 'panel-child-horizontal' : 'panel-child-vertical'}`}>
                  {renderField(child)}
                </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const ComponentName = field.type.charAt(0).toUpperCase() + field.type.slice(1) + 'Field';
    const Component = FieldComponents[ComponentName];

    if (Component) {
      return (
        <Component
          field={field}
          value={formData[field.id]}
          onChange={updateFormData}
          error={null} // You can implement error handling here
        />
      );
    }

    // Fallback for unknown field types
    return <Input type={field?.type || "text"} placeholder={field.placeholder} value={formData[field.id] || ""} onChange={(e) => updateFormData(field.id, e.target.value)} />;
  };

  const getCurrentStepFields = () => {
    if (!config?.isMultiStep) return config?.fields?.filter(field => isFieldVisible(field.id) && !field.parentId);
    const currentStepFieldIds = config?.steps[currentStep]?.fields || [];
    return config?.fields?.filter(field => currentStepFieldIds.includes(field?.id) && isFieldVisible(field?.id) && !field?.parentId);
  };

  if (config?.fields?.length === 0) {
    return (
      <div className="FP-form-preview-empty">
        <div className="FP-form-preview-empty-icon">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h3 className="FP-form-preview-empty-title">No fields to preview</h3>
        <p className="FP-form-preview-empty-description">Add some fields to your form to see the preview</p>
      </div>
    );
  }

  const currentStepFields = getCurrentStepFields();
  const currentStepInfo = config?.steps[currentStep];

  return (
    <div className="FP-form-preview-container">
      <div className="FP-form-preview-card">
        <div className="FP-form-preview-header">
          <h2 className="FP-form-preview-title">{config?.title}</h2>
          {config?.description && <p className="FP-form-preview-description">{config?.description}</p>}
          {config?.isMultiStep && (
            <div className="FP-form-preview-progress">
              <div className="FP-form-preview-progress-info">
                <span className="FP-form-preview-progress-step">Step {currentStep + 1} of {config.steps.length}</span>
                <span className="FP-form-preview-progress-percentage">{Math.round(((currentStep + 1) / config.steps.length) * 100)}% Complete</span>
              </div>
              <div className="FP-form-preview-progress-bar">
                <div
                  className="FP-form-preview-progress-fill"
                  style={{ width: `${((currentStep + 1) / config.steps.length) * 100}%` }}
                />
              </div>
              {currentStepInfo && (
                <div className="FP-form-preview-step-info">
                  <h3 className="FP-form-preview-step-title">{currentStepInfo?.title}</h3>
                  {currentStepInfo?.description && <p className="FP-form-preview-step-description">{currentStepInfo?.description}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <form key={formKey} onSubmit={handleSubmit} className="FP-form-preview-form">
          <div className="FP-form-preview-fields">
            {currentStepFields?.map((field) => (
              <div key={field.id} className="FP-form-preview-field" style={{ width: `${field.width || 100}%` }}>
                {/* <Label htmlFor={field.id} className="FP-form-preview-label">
                  {field.label}
                  {field.required && <span className="FP-form-preview-required">*</span>}
                </Label> */}
                <div className="FP-form-preview-input">{renderField(field)}</div>
              </div>
            ))}
          </div>
          {/* <div className="FP-form-preview-actions">
            {config?.isMultiStep && currentStep > 0 ? (
              <Button type="button" variant="outline" onClick={goToPreviousStep} className="FP-form-preview-btn-previous">
                Previous
              </Button>
            ) : <div />}
            <Button type="submit" className="FP-form-preview-btn-submit">
              {config?.isMultiStep && currentStep < config.steps.length - 1 ? "Next Step" : "Submit Form"}
            </Button>
          </div> */}
        </form>
      </div>
    </div>
  );
};