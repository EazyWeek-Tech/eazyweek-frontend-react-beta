import { useState } from "react";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Checkbox } from "../../../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { FileText } from "lucide-react";
import { useToast } from "./use-toast";
import "./FormPreview.css"; // Import the external CSS file

export const FormPreview = ({ config }) => {
  const [formData, setFormData] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
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
    setFormData({});
    setCurrentStep(0);
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const renderField = (field) => {
    if (!isFieldVisible(field.id)) return null;
    const commonProps = { id: field.id, placeholder: field.placeholder, value: formData[field.id] || "" };

    switch (field.type) {
      case "text":
      case "email":
      case "number":
      case "date":
        return <Input {...commonProps} type={field.type} onChange={(e) => updateFormData(field.id, e.target.value)} />;
      case "file":
        return <Input {...commonProps} type="file" onChange={(e) => updateFormData(field.id, e.target.files?.[0] || null)} />;
      case "textarea":
        return <Textarea {...commonProps} rows={4} onChange={(e) => updateFormData(field.id, e.target.value)} />;
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox id={field.id} checked={formData[field.id] || false} onCheckedChange={(checked) => updateFormData(field.id, checked)} />
            <Label htmlFor={field.id} className="text-sm font-normal">{field.placeholder || "Check this option"}</Label>
          </div>
        );
      case "radio":
        return (
          <RadioGroup value={formData[field.id] || ""} onValueChange={(value) => updateFormData(field.id, value)}>
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                <Label htmlFor={`${field.id}-${index}`} className="text-sm font-normal">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "select":
        return (
          <Select value={formData[field.id] || ""} onValueChange={(value) => updateFormData(field.id, value)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  const getCurrentStepFields = () => {
    if (!config.isMultiStep) return config.fields.filter(field => isFieldVisible(field.id));
    const currentStepFieldIds = config.steps[currentStep]?.fields || [];
    return config.fields.filter(field => currentStepFieldIds.includes(field.id) && isFieldVisible(field.id));
  };

  if (config.fields.length === 0) {
    return (
      <div className="form-preview-empty">
        <div className="form-preview-empty-icon">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h3 className="form-preview-empty-title">No fields to preview</h3>
        <p className="form-preview-empty-description">Add some fields to your form to see the preview</p>
      </div>
    );
  }

  const currentStepFields = getCurrentStepFields();
  const currentStepInfo = config.steps[currentStep];

  return (
    <div className="form-preview-container">
      <div className="form-preview-card">
        <div className="form-preview-header">
          <h2 className="form-preview-title">{config.title}</h2>
          {config.description && <p className="form-preview-description">{config.description}</p>}
          {config.isMultiStep && (
            <div className="form-preview-progress">
              <div className="form-preview-progress-info">
                <span className="form-preview-progress-step">Step {currentStep + 1} of {config.steps.length}</span>
                <span className="form-preview-progress-percentage">{Math.round(((currentStep + 1) / config.steps.length) * 100)}% Complete</span>
              </div>
              <div className="form-preview-progress-bar">
                <div
                  className="form-preview-progress-fill"
                  style={{ width: `${((currentStep + 1) / config.steps.length) * 100}%` }}
                />
              </div>
              {currentStepInfo && (
                <div className="form-preview-step-info">
                  <h3 className="form-preview-step-title">{currentStepInfo.title}</h3>
                  {currentStepInfo.description && <p className="form-preview-step-description">{currentStepInfo.description}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="form-preview-form">
          <div className="form-preview-fields">
            {currentStepFields.map((field) => (
              <div key={field.id} className="form-preview-field">
                <Label htmlFor={field.id} className="form-preview-label">
                  {field.label}
                  {field.required && <span className="form-preview-required">*</span>}
                </Label>
                <div className="form-preview-input">{renderField(field)}</div>
              </div>
            ))}
          </div>
          <div className="form-preview-actions">
            {config.isMultiStep && currentStep > 0 ? (
              <Button type="button" variant="outline" onClick={goToPreviousStep} className="form-preview-btn-previous">
                Previous
              </Button>
            ) : <div />}
            <Button type="submit" className="form-preview-btn-submit">
              {config.isMultiStep && currentStep < config.steps.length - 1 ? "Next Step" : "Submit Form"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};