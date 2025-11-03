/* eslint-disable no-unused-vars */
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Draggable, Droppable } from "@hello-pangea/dnd";
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
  Table,
  Sun,
  Clock,
  DollarSign,
  Image,
  PenTool,
  Columns,
  Layout,
  Phone,
  Pen,
  MapPin,
  Home,
  Globe,
  Map,
  User,
  Smartphone,
  Users,
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
    type: "table",
    label: "Table",
    icon: Table,
    description: "Data table input",
  },
  {
    type: "day",
    label: "Day",
    icon: Sun,
    description: "Day selection",
  },
  {
    type: "time",
    label: "Time",
    icon: Clock,
    description: "Time selection",
  },
  {
    type: "currency",
    label: "Currency",
    icon: DollarSign,
    description: "Currency input",
  },
  {
    type: "image",
    label: "Image",
    icon: Image,
    description: "Image upload",
  },
  {
    type: "annotation",
    label: "Annotation Pad",
    icon: PenTool,
    description: "Drawing/annotation",
  },
  {
    type: "file",
    label: "File Upload",
    icon: Upload,
    description: "File attachment",
  },
  {
    type: "columns",
    label: "Columns",
    icon: Columns,
    description: "Column layout",
  },
  {
    type: "panel",
    label: "Panel",
    icon: Layout,
    description: "Panel container",
  },
  {
    type: "tabs",
    label: "Tabs",
    icon: Layout,
    description: "Tabbed content",
  },
  {
    type: "content",
    label: "Content",
    icon: FileText,
    description: "Static content",
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
  {
    type: "number",
    label: "Number",
    icon: Hash,
    description: "Numeric input",
  },
  {
    type: "phone",
    label: "Phone Number",
    icon: Phone,
    description: "Phone number input",
  },
  {
    type: "date",
    label: "Date Picker",
    icon: Calendar,
    description: "Date selection",
  },
  {
    type: "datetime",
    label: "Date/Time",
    icon: Calendar,
    description: "Date and time selection",
  },
  {
    type: "selectboxes",
    label: "Select Boxes",
    icon: CheckSquare,
    description: "Multiple select options",
  },
  {
    type: "signature",
    label: "Signature",
    icon: Pen,
    description: "Digital signature",
  },
  {
    type: "city",
    label: "City",
    icon: MapPin,
    description: "City input",
  },
  {
    type: "address1",
    label: "Address Line 1",
    icon: Home,
    description: "Primary address",
  },
  {
    type: "address2",
    label: "Address Line 2",
    icon: Home,
    description: "Secondary address",
  },
  {
    type: "pincode",
    label: "Pincode",
    icon: MapPin,
    description: "Postal code",
  },
  {
    type: "country",
    label: "Country",
    icon: Globe,
    description: "Country selection",
  },
  {
    type: "state",
    label: "State",
    icon: Map,
    description: "State/Province",
  },
  {
    type: "firstname",
    label: "First Name",
    icon: User,
    description: "First name input",
  },
  {
    type: "lastname",
    label: "Last Name",
    icon: User,
    description: "Last name input",
  },
  {
    type: "mobilephone",
    label: "Mobile Phone",
    icon: Smartphone,
    description: "Mobile phone number",
  },
  {
    type: "homephone",
    label: "Home Phone",
    icon: Phone,
    description: "Home phone number",
  },
  {
    type: "birthday",
    label: "Birthday",
    icon: Calendar,
    description: "Birth date",
  },
  {
    type: "gender",
    label: "Gender",
    icon: Users,
    description: "Gender selection",
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
      <Droppable droppableId="field-selector">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="form-field-selector-list space-y-2"
          >
            {fieldTypes.map(({ type, label, icon: Icon, description }, index) => (
              <Draggable key={type} draggableId={`selector-${type}`} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`field-button w-full justify-start h-auto p-3 hover:bg-builder-hover transition-all duration-200 group selector-button ${snapshot.isDragging ? "dragging" : ""}`}
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
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </Card>
  );
};
