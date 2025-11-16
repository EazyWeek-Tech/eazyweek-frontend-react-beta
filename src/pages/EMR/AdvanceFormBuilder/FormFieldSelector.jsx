/* eslint-disable no-unused-vars */
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../../components/ui/collapsible";
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
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import "./FormFieldSelector.css"; // Import the external CSS file

const fieldCategories = {
  Basic: [
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
      type: "time",
      label: "Time",
      icon: Clock,
      description: "Time selection",
    },
    {
      type: "select",
      label: "Dropdown",
      icon: List,
      description: "Select options",
    },
    {
      type: "radio",
      label: "Radio Button",
      icon: Circle,
      description: "Single choice",
    },
    {
      type: "checkbox",
      label: "Checkbox",
      icon: CheckSquare,
      description: "True/false option",
    },
    {
      type: "selectboxes",
      label: "Select Boxes",
      icon: CheckSquare,
      description: "Multiple select options",
    },
  ],
  Advanced: [
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
    type: "signature",
    label: "Signature",
    icon: Pen,
    description: "Digital signature",
  },
  {
    type: "facecard",
    label: "Face Card",
    icon: Pen,
    description: "Pace Card for skin care",
  },
  ],
  Personal: [
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
  ],
};

export const FormFieldSelector = ({ onAddField }) => {
  const [openCategories, setOpenCategories] = useState({
    Basic: true,
    Advanced: false,
    Personal: false,
  });

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <Card className="FFS-form-field-selector-card p-6 FFP-AdvFormBuilder-border AdvFormBuilder-shadow-md sticky top-6">
      <h1 className="FFS-form-field-selector-title text-lg font-semibold mb-4">
        Field Types
      </h1>
      <Droppable droppableId="field-selector">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="FFS-form-field-selector-list space-y-2 "
          >
            {Object.entries(fieldCategories).map(([categoryName, fields], categoryIndex) => (
              <Collapsible
                className="FFS-field-Collapsible"
                key={categoryName}
                open={openCategories[categoryName]}
                onOpenChange={() => toggleCategory(categoryName)}
              >
                <CollapsibleTrigger className=" FFS-field-CollapsibleTrigger">
                  <span className="font-medium text-sm">{categoryName}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openCategories[categoryName] ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {fields.map(({ type, label, icon: Icon, description }, fieldIndex) => {
                    const globalIndex = Object.values(fieldCategories).slice(0, categoryIndex).reduce((acc, cat) => acc + cat.length, 0) + fieldIndex;
                    return (
                      <Draggable key={type} draggableId={`selector-${type}`} index={globalIndex}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`FFS-field-button w-full justify-start h-auto p-3 hover:AdvFormBuilder-bg-hover transition-all duration-200 group FFS-selector-button ${snapshot.isDragging ? "dragging" : ""}`}
                            onClick={() => onAddField(type)}
                            aria-label={`Add ${label} field`}
                          >
                            <div className="FFS-field-button-content">
                              <div className="FFS-field-icon-container w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Icon className="FFS-field-icon w-4 h-4 text-primary" />
                              </div>
                              <div className="FFS-field-text text-left">
                                <div className="FFS-field-label font-medium text-sm">{label}</div>
                                <div className="FFS-field-description text-xs text-muted-foreground">
                                  {description}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </Card>
  );
};
