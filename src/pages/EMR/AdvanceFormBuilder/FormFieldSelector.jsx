import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  Type,
  Mail,
  FileText,
  List,
  CheckSquare,
  Circle,
  Hash,
  Upload,
  Calendar,
} from "lucide-react";
import "./FormFieldSelector.css"; // Import the external CSS file

const fieldTypes = [
  {
    type: "text",
    label: "Text Input",
    icon: Type,
    description: "Single line text",
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    description: "Email validation",
  },
  {
    type: "textarea",
    label: "Text Area",
    icon: FileText,
    description: "Multi-line text",
  },
  {
    type: "select",
    label: "Dropdown",
    icon: List,
    description: "Select options",
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: CheckSquare,
    description: "True/false option",
  },
  {
    type: "radio",
    label: "Radio Button",
    icon: Circle,
    description: "Single choice",
  },
  { type: "number", label: "Number", icon: Hash, description: "Numeric input" },
  {
    type: "file",
    label: "File Upload",
    icon: Upload,
    description: "File attachment",
  },
  {
    type: "date",
    label: "Date Picker",
    icon: Calendar,
    description: "Date selection",
  },
];

export const FormFieldSelector = ({ onAddField }) => {
  if (!fieldTypes.length) {
    return (
      <div className="form-field-selector-error">No field types available.</div>
    );
  }

  return (
    <Card className="form-field-selector-card p-6 border-builder-border shadow-md sticky top-6">
      <h1 className="form-field-selector-title text-lg font-semibold mb-4">
        Field Types
      </h1>
      <div className="form-field-selector-list space-y-2"> 
        {fieldTypes.map(({ type, label,description }) => (
          <Button
            key={type}
            variant="ghost"
            className="field-button w-full justify-start h-auto p-3 hover:bg-builder-hover transition-all duration-200 group"
            onClick={() => onAddField(type)}
            aria-label={`Add ${label} field`}
          >
            <div className="field-button-content">
              <div className="field-icon-container w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Icon className="field-icon w-4 h-4 text-primary" />
              </div>
              <div className="field-text text-left">
                <div className="field-label font-medium text-sm">{label}</div>
                <div className="field-description text-xs text-muted-foreground">
                  {description}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
};