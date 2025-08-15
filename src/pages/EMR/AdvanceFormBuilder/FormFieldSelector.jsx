import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Type,
  Mail,
  FileText,
  List,
  CheckSquare,
  Circle,
  Hash,
  Upload,
  Calendar
} from "lucide-react";

const fieldTypes = [
  { type: "text", label: "Text Input", icon: Type, description: "Single line text" },
  { type: "email", label: "Email", icon: Mail, description: "Email validation" },
  { type: "textarea", label: "Text Area", icon: FileText, description: "Multi-line text" },
  { type: "select", label: "Dropdown", icon: List, description: "Select options" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, description: "True/false option" },
  { type: "radio", label: "Radio Button", icon: Circle, description: "Single choice" },
  { type: "number", label: "Number", icon: Hash, description: "Numeric input" },
  { type: "file", label: "File Upload", icon: Upload, description: "File attachment" },
  { type: "date", label: "Date Picker", icon: Calendar, description: "Date selection" },
];

export const FormFieldSelector = ({ onAddField }) => {
  return (
    <Card className="p-6 border-builder-border shadow-soft sticky top-6">
      <h2 className="text-lg font-semibold mb-4">Field Types</h2>
      <div className="space-y-2">
        {fieldTypes.map(({ type, label, icon: Icon, description }) => (
          <Button
            key={type}
            variant="ghost"
            className="w-full justify-start h-auto p-3 hover:bg-builder-hover transition-all duration-200 group"
            onClick={() => onAddField(type)}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
};
