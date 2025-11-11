import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import ToggleSwitch from "./ToggleSwitch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Badge } from "../../../components/ui/badge";
import {
  Trash2,
  GripVertical,
  Plus,
  Eye,
  Code,
  Settings,
  Layers,
  Workflow,
  ChevronDown,
} from "lucide-react";
import { FormFieldSelector } from "./FormFieldSelector";
import { FormPreview } from "./FormPreview";
import { ConditionalRuleEditor } from "./ConditionalRuleEditor";
import { ValidationRuleEditor } from "./ValidationRuleEditor";
import { StepManager } from "./StepManager";
// import { useToast } from "./use-toast";
import "./AdvancedFormBuilder.css";
import { API_BASE_URL } from "../../../config";

export const AdvancedFormBuilder = () => {
  const [config, setConfig] = useState({
    title: "Custom Form",
    description: "",
    steps: [{ id: "step-1", title: "General Information", fields: [] }],
    fields: [],
    isMultiStep: false,
  });
  const [selectedField, setSelectedField] = useState(null);
  const [currentView, setCurrentView] = useState("builder");
  const [selectedChildFieldTypes, setSelectedChildFieldTypes] = useState([]);
  // const { toast } = useToast();

  const addField = (type, parentId = null) => {
    const newField = {
      id: `field-${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: type === "textarea" ? "Enter your message..." : `Enter your ${type}...`,
      required: false,
      conditionalRules: [],
      validationRules: [],
      parentId,
    };

    // Add type-specific properties
    if (type === "select" || type === "radio" || type === "selectboxes") {
      newField.options = ["Option 1", "Option 2"];
    }
    if (type === "number") {
      newField.min = "";
      newField.max = "";
      newField.step = 1;
    }
    if (type === "date" || type === "datetime" || type === "time") {
      newField.min = "";
      newField.max = "";
    }
    if (type === "textarea") {
      newField.rows = 4;
    }
    if (type === "file" || type === "image") {
      newField.accept = type === "image" ? "image/*" : "";
    }
    if (type === "table") {
      newField.rows = 1;
      newField.columns = 2;
    }
    if (type === "signature" || type === "annotation") {
      newField.width = type === "signature" ? 300 : 400;
      newField.height = type === "signature" ? 100 : 200;
    }
    if (type === "tabs") {
      newField.options = ["Tab 1", "Tab 2"];
    }
    if (type === "panel") {
      newField.layout = "vertical"; // default layout
    }

    const updatedFields = [...config.fields, newField];
    const updatedSteps = [...config.steps];
    if (!parentId) {
      updatedSteps[0].fields.push(newField.id);
    }

    setConfig({ ...config, fields: updatedFields, steps: updatedSteps });
    setSelectedField(newField);
  };

  const updateField = (id, updates) => {
    const updatedFields = config.fields.map(field => {
      if (field.id === id) {
        return { ...field, ...updates };
      }
      return field;
    });
    setConfig({ ...config, fields: updatedFields });
    if (selectedField?.id === id) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  const deleteField = (id) => {
    const updatedFields = config.fields.filter(field => field.id !== id);
    const updatedSteps = config.steps.map(step => ({
      ...step,
      fields: step.fields.filter(fieldId => fieldId !== id)
    }));
    setConfig({ ...config, fields: updatedFields, steps: updatedSteps });
    if (selectedField?.id === id) {
      setSelectedField(null);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    const draggableId = result.draggableId;
    if (sourceId === "field-selector" && destId === "form-fields") {
      // Add new field from selector to main form
      const type = draggableId.split('-')[1];
      const newField = {
        id: `field-${Date.now()}`,
        type,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
        placeholder: type === "textarea" ? "Enter your message..." : `Enter your ${type}...`,
        required: false,
        conditionalRules: [],
        validationRules: [],
      };

      // Add type-specific properties
      if (type === "select" || type === "radio" || type === "selectboxes") {
        newField.options = ["Option 1", "Option 2"];
      }
      if (type === "number") {
        newField.min = "";
        newField.max = "";
        newField.step = 1;
      }
      if (type === "date" || type === "datetime" || type === "time") {
        newField.min = "";
        newField.max = "";
      }
      if (type === "textarea") {
        newField.rows = 4;
      }
      if (type === "file" || type === "image") {
        newField.accept = type === "image" ? "image/*" : "";
      }
      if (type === "table") {
        newField.rows = 1;
        newField.columns = 2;
      }
      if (type === "signature" || type === "annotation") {
        newField.width = type === "signature" ? 300 : 400;
        newField.height = type === "signature" ? 100 : 200;
      }
      if (type === "tabs") {
        newField.options = ["Tab 1", "Tab 2"];
      }

      const updatedFields = [...config.fields];
      updatedFields.splice(result.destination.index, 0, newField);
      const updatedSteps = [...config.steps];
      updatedSteps[0].fields.splice(result.destination.index, 0, newField.id);

      setConfig({ ...config, fields: updatedFields, steps: updatedSteps });
    } else if (sourceId === "field-selector" && destId.startsWith("panel-")) {
      // Add new field from selector directly to panel
      const panelId = destId.replace("panel-", "");
      const type = draggableId.split('-')[1];
      const newField = {
        id: `field-${Date.now()}`,
        type,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
        placeholder: type === "textarea" ? "Enter your message..." : `Enter your ${type}...`,
        required: false,
        conditionalRules: [],
        validationRules: [],
        parentId: panelId,
      };

      // Add type-specific properties
      if (type === "select" || type === "radio" || type === "selectboxes") {
        newField.options = ["Option 1", "Option 2"];
      }
      if (type === "number") {
        newField.min = "";
        newField.max = "";
        newField.step = 1;
      }
      if (type === "date" || type === "datetime" || type === "time") {
        newField.min = "";
        newField.max = "";
      }
      if (type === "textarea") {
        newField.rows = 4;
      }
      if (type === "file" || type === "image") {
        newField.accept = type === "image" ? "image/*" : "";
      }
      if (type === "table") {
        newField.rows = 1;
        newField.columns = 2;
      }
      if (type === "signature" || type === "annotation") {
        newField.width = type === "signature" ? 300 : 400;
        newField.height = type === "signature" ? 100 : 200;
      }
      if (type === "tabs") {
        newField.options = ["Tab 1", "Tab 2"];
      }

      const updatedFields = [...config.fields, newField];
      setConfig({ ...config, fields: updatedFields });
    } else if (sourceId === "form-fields" && destId === "form-fields") {
      // Reorder top-level fields
      const topLevelFields = config.fields.filter(f => !f.parentId);
      const [reorderedItem] = topLevelFields.splice(result.source.index, 1);
      topLevelFields.splice(result.destination.index, 0, reorderedItem);

      // Rebuild fields array with new order
      const updatedFields = [];
      topLevelFields.forEach(field => {
        updatedFields.push(field);
        if (field.type === 'panel') {
          updatedFields.push(...config.fields.filter(f => f.parentId === field.id));
        }
      });

      const updatedSteps = [...config.steps];
      updatedSteps[0].fields = topLevelFields.map(field => field.id);

      setConfig({ ...config, fields: updatedFields, steps: updatedSteps });
    } else if (sourceId.startsWith("panel-") && destId === "form-fields") {
      // Move field out of panel to top level
      const fieldId = draggableId;
      const updatedFields = config.fields.map(f => f.id === fieldId ? { ...f, parentId: null } : f);
      setConfig({ ...config, fields: updatedFields });
    } else if (sourceId === "form-fields" && destId.startsWith("panel-")) {
      // Move field into panel
      const panelId = destId.replace("panel-", "");
      const fieldId = draggableId;
      const updatedFields = config.fields.map(f => f.id === fieldId ? { ...f, parentId: panelId } : f);

      // Insert at the correct position within the panel
      const panelChildren = updatedFields.filter(f => f.parentId === panelId);
      const fieldIndex = panelChildren.findIndex(f => f.id === fieldId);
      if (fieldIndex !== -1) {
        const [movedField] = panelChildren.splice(fieldIndex, 1);
        panelChildren.splice(result.destination.index, 0, movedField);
      }

      // Rebuild fields array
      const otherFields = updatedFields.filter(f => f.parentId !== panelId);
      const topLevel = otherFields.filter(f => !f.parentId);
      const panelIndex = topLevel.findIndex(f => f.id === panelId);
      const beforePanel = topLevel.slice(0, panelIndex + 1);
      const afterPanel = topLevel.slice(panelIndex + 1);
      const newFields = [...beforePanel, ...panelChildren, ...afterPanel];

      // Update steps to remove the field from top-level
      const updatedSteps = [...config.steps];
      updatedSteps[0].fields = updatedSteps[0].fields.filter(id => id !== fieldId);

      setConfig({ ...config, fields: newFields, steps: updatedSteps });
    } else if (sourceId.startsWith("panel-") && destId.startsWith("panel-")) {
      // Reorder within or between panels
      const destPanelId = destId.replace("panel-", "");
      const fieldId = draggableId;

      const updatedFields = config.fields.map(f => {
        if (f.id === fieldId) {
          return { ...f, parentId: destPanelId };
        }
        return f;
      });

      // Reorder within the destination panel
      const panelChildren = updatedFields.filter(f => f.parentId === destPanelId);
      const fieldIndex = panelChildren.findIndex(f => f.id === fieldId);
      if (fieldIndex !== -1) {
        const [movedField] = panelChildren.splice(fieldIndex, 1);
        panelChildren.splice(result.destination.index, 0, movedField);
      }

      // Rebuild fields array
      const otherFields = updatedFields.filter(f => f.parentId !== destPanelId);
      const topLevel = otherFields.filter(f => !f.parentId);
      const panelIndex = topLevel.findIndex(f => f.id === destPanelId);
      const beforePanel = topLevel.slice(0, panelIndex + 1);
      const afterPanel = topLevel.slice(panelIndex + 1);
      const newFields = [...beforePanel, ...panelChildren, ...afterPanel];

      setConfig({ ...config, fields: newFields });
    } else if (sourceId === "form-fields" && destId === "field-selector") {
      // Remove field
      const fieldId = draggableId;
      deleteField(fieldId);
    } else if (sourceId.startsWith("panel-") && destId === "field-selector") {
      // Remove field from panel
      const fieldId = draggableId;
      deleteField(fieldId);
    }
  };
  const commonHeaders = {
    "Content-Type": "application/json",
  };
  const headersFor = (method = "GET") => {
    if (String(method).toUpperCase() === "GET") {
      const { ["Content-Type"]: _, ...rest } = commonHeaders;
      return rest;
    }
    return commonHeaders;
  };

  // const exportForm = () => {
  //   const exportData = {
  //     ...config,
  //     created: new Date().toISOString(),
  //     version: "2.0"
  //   };
  //   const blob = new Blob([JSON.stringify(exportData, null, 2)], {
  //     type: "application/json"
  //   });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = "advanced-form-config.json";
  //   a.click();
  //   URL.revokeObjectURL(url);
  //   toast({
  //     title: "Form exported successfully!",
  //     description: "Your advanced form configuration has been downloaded.",
  //   });
  // };
  return (
    <div className="AdvFormBuilder-container">
      <div className="AdvFormBuilder-wrapper">
        <div className="AdvFormBuilder-header">
          <div>
            <h1 className="AdvFormBuilder-title">
              {currentView === 'builder' ? 'Create Form' : 'Form Preview'}
            </h1>
          </div>
          <div className="AdvFormBuilder-actions">
            {currentView === 'builder' && (
              <div className="AdvBuilder-button">
                <Button
                onClick={async () => {
                  const formConfig = {
                    ...config,
                    fields: config.fields.map((field) => ({
                      id: field.id,
                      type: field.type,
                      label: field.label,
                      placeholder: field.placeholder || "",
                      required: field.required ? "required" : "optional",
                      parentId: field.parentId || null,
                      // Include other field-specific properties
                      ...(field.options && { options: field.options }),
                      ...(field.min !== undefined && { min: field.min }),
                      ...(field.max !== undefined && { max: field.max }),
                      ...(field.step !== undefined && { step: field.step }),
                      ...(field.rows !== undefined && { rows: field.rows }),
                      ...(field.columns !== undefined && { columns: field.columns, }),                      ...(field.accept && { accept: field.accept }),                      ...(field.width !== undefined && { width: field.width, }),                      ...(field.height !== undefined && { height: field.height, }),                      ...(field.layout && { layout: field.layout }),                      conditionalRules: field.conditionalRules || [],                      validationRules: field.validationRules || [],                    })),                  };
                    await fetch(`${API_BASE_URL}/api/form/save`, {
                      method: "POST",
                      headers: headersFor("POST"),
                      body: JSON.stringify({
                        schemaJson: JSON.stringify(formConfig), // Convert object to string
                        name: "Name",
                      }),
                      credentials: "include",
                    });
                    console.log("Form Configuration JSON:", JSON.stringify(formConfig, null, 2));
                    alert("Form configuration saved! Check console for JSON.");
                  }}
                  className="mr-2 destructive"
                >
                  Save Form
                </Button>
              </div>
            )}
            <ToggleSwitch
              leftLabel="Builder"
              rightLabel="Preview"
              value={currentView === 'preview' ? 'Preview' : 'Builder'}
              onChange={(value) => setCurrentView(value === 'Preview' ? 'preview' : 'builder')}
            />
          </div>
        </div>

        {currentView === 'builder' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="AdvFormBuilder-grid">
              {/* Field Selector & Form Settings */}
              <div className="AdvFormBuilder-sidebar">
                <Card className="AdvFormBuilder-card">
                  <div className="AdvFormBuilder-card-header">
                    <h2 className="AdvFormBuilder-card-title">Form Settings</h2>
                    <Settings className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="AdvFormBuilder-form-settings">
                    <div className="AdvFormBuilder-form-setting">
                      <Label htmlFor="form-title" className="AdvFormBuilder-label">Form Title</Label>
                      <Input
                        id="form-title"
                        value={config.title}
                        onChange={(e) => setConfig({ ...config, title: e.target.value })}
                        className="mt-1 AdvFormBuilder-input"
                      />
                    </div>

                    {/* <div className="form-builder-toggle">
                      <ToggleSwitch
                        leftLabel="Single Step"
                        rightLabel="Multi-Step"
                        value={config.isMultiStep ? "Multi-Step" : "Single Step"}
                        onChange={(value) => setConfig({ ...config, isMultiStep: value === "Multi-Step" })}
                      />
                    </div> */}
                  </div>
                </Card>

                <Droppable droppableId="field-selector">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      <FormFieldSelector onAddField={addField} />
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {config.isMultiStep && (
                  <StepManager
                    steps={config.steps}
                    fields={config.fields}
                    onUpdateSteps={(steps) => setConfig({ ...config, steps })}
                  />
                )}
              </div>

              {/* Form Builder */}
              <div className="AdvFormBuilder-main">
                <Card className="AdvFormBuilder-card AdvFormBuilder-fields-container">
                  <div className="AdvFormBuilder-fields-header">
                    <div className="AdvFormBuilder-fields-header-left">
                      <h2 className="AdvFormBuilder-card-title">Form Fields</h2>
                      {config.fields.length > 0 && (
                        <Badge variant="outline">
                          {config.fields.length} field{config.fields.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    {config.isMultiStep && (
                      <Badge variant="secondary">
                        <Workflow className="w-3 h-3 mr-1" />
                        {config.steps.length} steps
                      </Badge>
                    )}
                  </div>

                  <Droppable droppableId="form-fields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="AdvFormBuilder-fields-list">
                        {config.fields.length === 0 ? (
                          <div className="AdvFormBuilder-empty-state">
                            <div className="AdvFormBuilder-empty-icon">
                              <Plus className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="AdvFormBuilder-empty-title">No fields yet</h3>
                            <p className="AdvFormBuilder-empty-text">
                              Start building your{" "} {config.isMultiStep ? "multi-step " : ""}form by adding fields from the sidebar
                            </p>
                          </div>
                        ) : (
                          config.fields.filter((field) => !field.parentId).map((field, index) => (                            <Draggable key={field.id} draggableId={field.id} index={index}>                              {(provided, snapshot) => (                                <div                                  ref={provided.innerRef}                                  {...provided.draggableProps}                                  className={`AdvFormBuilder-field ${snapshot.isDragging ? "dragging" : ""} ${selectedField?.id === field.id ? "selected" : ""}`}                                  style={{                                    borderColor: selectedField?.id === field.id ? "var(--primary)" : "var(--builder-border)",                                    boxShadow: selectedField?.id === field.id ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "var(--shadow-sm)",                                    backgroundColor: selectedField?.id === field.id ? "var(--primary-light)" : "var(--card-bg)",                                  }}                                >                                  <div className="AdvFormBuilder-field-content">                                    <div                                      {...provided.dragHandleProps}                                      className="AdvFormBuilder-field-drag-handle"                                    >                                      <GripVertical className="w-4 h-4" />                                    </div>                                    <div className="AdvFormBuilder-field-info" onClick={() => setSelectedField(field)}>                                      <div className="AdvFormBuilder-field-label">                                        <Label className="font-medium">{field.label}</Label>                                        {field.required && (                                          <span className="AdvFormBuilder-field-required">  *</span>                                        )}                                        {field.conditionalRules && field.conditionalRules.length > 0 && (                                          <Badge variant="outline" className="text-xs">                                            Conditional                                          </Badge>                                        )}                                      </div>                                      <div className="AdvFormBuilder-field-type">                                        {field.type} field                                        {config.isMultiStep && (
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              Step{" "} {(config.steps.findIndex((step) => step.fields.includes(field.id)) || 0) + 1}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteField(field.id);
                                        }}
                                        className="AdvFormBuilder-field-delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>

                                    {field.type === "panel" && (
                                      <Droppable
                                        droppableId={`panel-${field.id}`}
                                      >
                                        {(panelProvided) => (
                                          <div
                                            ref={panelProvided.innerRef}
                                            {...panelProvided.droppableProps}
                                            className="AdvFormBuilder-panel-children"
                                            style={{
                                              marginTop: "8px",
                                              padding: "8px",
                                              border:
                                                "1px dashed var(--builder-border)",
                                              borderRadius: "4px",
                                              minHeight: "40px",
                                              backgroundColor: "var(--card-bg)",
                                            }}
                                          >
                                            {config.fields.filter(
                                              (f) => f.parentId === field.id
                                            ).length === 0 ? (
                                              <div className="text-xs text-muted-foreground text-center py-2">
                                                Drop fields here to add to panel
                                              </div>
                                            ) : (
                                              config.fields
                                                .filter(
                                                  (f) => f.parentId === field.id
                                                )
                                                .map(
                                                  (childField, childIndex) => (
                                                    <Draggable
                                                      key={childField.id}
                                                      draggableId={
                                                        childField.id
                                                      }
                                                      index={childIndex}
                                                    >
                                                      {(
                                                        childProvided,
                                                        childSnapshot
                                                      ) => (
                                                        <div
                                                          ref={
                                                            childProvided.innerRef
                                                          }
                                                          {...childProvided.draggableProps}
                                                          className={`AdvFormBuilder-field AdvFormBuilder-panel-child ${
                                                            childSnapshot.isDragging
                                                              ? "dragging"
                                                              : ""
                                                          } ${
                                                            selectedField?.id ===
                                                            childField.id
                                                              ? "selected"
                                                              : ""
                                                          }`}
                                                          onClick={() =>
                                                            setSelectedField(
                                                              childField
                                                            )
                                                          }
                                                          style={{
                                                            borderColor:
                                                              selectedField?.id ===
                                                              childField.id
                                                                ? "var(--primary)"
                                                                : "var(--builder-border)",
                                                            boxShadow:
                                                              selectedField?.id ===
                                                              childField.id
                                                                ? "0 0 0 3px rgba(59, 130, 246, 0.1)"
                                                                : "var(--shadow-sm)",
                                                            backgroundColor:
                                                              selectedField?.id ===
                                                              childField.id
                                                                ? "var(--primary-light)"
                                                                : "var(--card-bg)",
                                                            marginBottom: "4px",
                                                          }}
                                                        >
                                                          <div className="AdvFormBuilder-field-content">
                                                            <div
                                                              {...childProvided.dragHandleProps}
                                                              className="AdvFormBuilder-field-drag-handle"
                                                            >
                                                              <GripVertical className="w-4 h-4" />
                                                            </div>
                                                            <div className="AdvFormBuilder-field-info">
                                                              <div className="AdvFormBuilder-field-label">
                                                                <Label className="font-medium text-sm">
                                                                  {
                                                                    childField.label
                                                                  }
                                                                </Label>
                                                                {childField.required && (
                                                                  <span className="AdvFormBuilder-field-required">
                                                                    *
                                                                  </span>
                                                                )}
                                                              </div>
                                                              <div className="AdvFormBuilder-field-type text-xs">
                                                                {
                                                                  childField.type
                                                                }{" "}
                                                                field
                                                              </div>
                                                            </div>
                                                            <Button
                                                              size="sm"
                                                              variant="ghost"
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteField(
                                                                  childField.id
                                                                );
                                                              }}
                                                              className="AdvFormBuilder-field-delete"
                                                            >
                                                              <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </Draggable>
                                                  )
                                                )
                                            )}
                                            {panelProvided.placeholder}
                                          </div>
                                        )}
                                      </Droppable>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </Card>
              </div>

              {/* Advanced Field Editor */}
              <div className="AdvFormBuilder-properties">
                <Card className="AdvFormBuilder-card">
                  <h2 className="AdvFormBuilder-card-title">
                    Field Properties
                  </h2>

                  {selectedField ? (
                    <Tabs defaultValue="basic" className="AdvFormBuilder-tabs">
                      <TabsList className="AdvFormBuilder-tabs-list">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="logic">Logic</TabsTrigger>
                        <TabsTrigger value="validation">Rules</TabsTrigger>
                      </TabsList>

                      <TabsContent
                        value="basic"
                        className="AdvFormBuilder-tabs-content"
                      >
                        <div className="AdvFormBuilder-properties-content">
                          <div className="AdvFormBuilder-field-setting">
                            <Label
                              htmlFor="field-label"
                              className="AdvFormBuilder-label"
                            >
                              Label
                            </Label>
                            <Input
                              id="field-label"
                              value={selectedField.label}
                              onChange={(e) =>
                                updateField(selectedField.id, {
                                  label: e.target.value,
                                })
                              }
                              className="mt-1 AdvFormBuilder-input"
                            />
                          </div>

                          <div className="AdvFormBuilder-field-setting">
                            <Label
                              htmlFor="field-placeholder"
                              className="AdvFormBuilder-label"
                            >
                              Placeholder
                            </Label>
                            <Input
                              id="field-placeholder"
                              value={selectedField.placeholder || ""}
                              onChange={(e) =>
                                updateField(selectedField.id, {
                                  placeholder: e.target.value,
                                })
                              }
                              className="mt-1 AdvFormBuilder-input"
                            />
                          </div>

                          <div className="AdvFormBuilder-toggle">
                            <ToggleSwitch
                              leftLabel="Optional"
                              rightLabel="Required"
                              value={
                                selectedField.required ? "Required" : "Optional"
                              }
                              onChange={(value) =>
                                updateField(selectedField.id, {
                                  required: value === "Required",
                                })
                              }
                            />
                          </div>

                          {(selectedField.type === "select" ||
                            selectedField.type === "radio" ||
                            selectedField.type === "selectboxes") && (
                            <div className="AdvFormBuilder-field-setting">
                              <Label className="AdvFormBuilder-label">
                                Options
                              </Label>
                              <div className="AdvFormBuilder-options">
                                {selectedField.options?.map((option, index) => (
                                  <Input
                                    key={index}
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [
                                        ...(selectedField.options || []),
                                      ];
                                      newOptions[index] = e.target.value;
                                      updateField(selectedField.id, {
                                        options: newOptions,
                                      });
                                    }}
                                    className="AdvFormBuilder-input AdvFormBuilder-option-input"
                                  />
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const newOptions = [
                                      ...(selectedField.options || []),
                                      `Option ${
                                        (selectedField.options?.length || 0) + 1
                                      }`,
                                    ];
                                    updateField(selectedField.id, {
                                      options: newOptions,
                                    });
                                  }}
                                  className="AdvFormBuilder-add-option"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Option
                                </Button>
                              </div>
                            </div>
                          )}

                          {selectedField.type === "number" && (
                            <>
                              <div className="AdvFormBuilder-field-setting">
                                <Label
                                  htmlFor="field-min"
                                  className="AdvFormBuilder-label"
                                >
                                  Minimum Value
                                </Label>
                                <Input
                                  id="field-min"
                                  type="number"
                                  value={selectedField.min || ""}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      min: e.target.value,
                                    })
                                  }
                                  className="mt-1 AdvFormBuilder-input"
                                />
                              </div>
                              <div className="AdvFormBuilder-field-setting">
                                <Label
                                  htmlFor="field-max"
                                  className="AdvFormBuilder-label"
                                >
                                  Maximum Value
                                </Label>
                                <Input
                                  id="field-max"
                                  type="number"
                                  value={selectedField.max || ""}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      max: e.target.value,
                                    })
                                  }
                                  className="mt-1 AdvFormBuilder-input"
                                />
                              </div>
                              <div className="AdvFormBuilder-field-setting">
                                <Label
                                  htmlFor="field-step"
                                  className="AdvFormBuilder-label"
                                >
                                  Step
                                </Label>
                                <Input
                                  id="field-step"
                                  type="number"
                                  value={selectedField.step || 1}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      step: parseFloat(e.target.value),
                                    })
                                  }
                                  className="mt-1 AdvFormBuilder-input"
                                />
                              </div>
                            </>
                          )}

                          {(selectedField.type === "date" ||
                            selectedField.type === "datetime" ||
                            selectedField.type === "time") && (
                            <>
                              <div className="AdvFormBuilder-field-setting">
                                <Label
                                  htmlFor="field-min-date"
                                  className="AdvFormBuilder-label"
                                >
                                  Minimum Date/Time
                                </Label>
                                <Input
                                  id="field-min-date"
                                  type={selectedField.type}
                                  value={selectedField.min || ""}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      min: e.target.value,
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div className="AdvFormBuilder-field-setting">
                                <Label
                                  htmlFor="field-max-date"
                                  className="AdvFormBuilder-label"
                                >
                                  Maximum Date/Time
                                </Label>
                                <Input
                                  id="field-max-date"
                                  type={selectedField.type}
                                  value={selectedField.max || ""}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      max: e.target.value,
                                    })
                                  }
                                  className="mt-1 AdvFormBuilder-input"
                                />
                              </div>
                            </>
                          )}

                          {selectedField.type === "textarea" && (
                            <div className="AdvFormBuilder-field-setting">
                              <Label
                                htmlFor="field-rows"
                                className="AdvFormBuilder-label"
                              >
                                Rows
                              </Label>
                              <Input
                                id="field-rows"
                                type="number"
                                value={selectedField.rows || 4}
                                onChange={(e) =>
                                  updateField(selectedField.id, {
                                    rows: parseInt(e.target.value),
                                  })
                                }
                                className="mt-1 AdvFormBuilder-input"
                              />
                            </div>
                          )}

                          {(selectedField.type === "file" ||
                            selectedField.type === "image") && (
                            <div className="AdvFormBuilder-field-setting">
                              <Label
                                htmlFor="field-accept"
                                className="AdvFormBuilder-label"
                              >
                                Accept File Types
                              </Label>
                              <Input
                                id="field-accept"
                                value={selectedField.accept || ""}
                                onChange={(e) =>
                                  updateField(selectedField.id, {
                                    accept: e.target.value,
                                  })
                                }
                                className="mt-1 AdvFormBuilder-input"
                                placeholder="e.g., .pdf,.doc,image/*"
                              />
                            </div>
                          )}

                          {selectedField.type === "table" && (
                            <>
                              <div className="AdvFormBuilder-field-setting">
                                <Label
                                  htmlFor="field-rows"
                                  className="AdvFormBuilder-label"
                                >
                                  Number of Rows
                                </Label>
                                <Input
                                  id="field-rows"
                                  type="number"
                                  value={selectedField.rows || 1}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      rows: parseInt(e.target.value),
                                    })
                                  }
                                  className="mt-1 AdvFormBuilder-input"
                                />
                              </div>
                              <div className="AdvFormBuilder-field-setting">
                                <Label
                                  htmlFor="field-columns"
                                  className="AdvFormBuilder-label"
                                >
                                  Number of Columns
                                </Label>
                                <Input
                                  id="field-columns"
                                  type="number"
                                  value={selectedField.columns || 2}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      columns: parseInt(e.target.value),
                                    })
                                  }
                                  className="mt-1 AdvFormBuilder-input"
                                />
                              </div>
                            </>
                          )}

                          {(selectedField.type === "signature" ||
                            selectedField.type === "annotation") && (
                            <>
                              <div className="AdvFormBuilder-field-setting">
                                <Label
                                  htmlFor="field-width"
                                  className="AdvFormBuilder-label"
                                >
                                  Width
                                </Label>
                                <Input
                                  id="field-width"
                                  type="number"
                                  value={
                                    selectedField.width ||
                                    (selectedField.type === "signature"
                                      ? 300
                                      : 400)
                                  }
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      width: parseInt(e.target.value),
                                    })
                                  }
                                  className="mt-1 AdvFormBuilder-input"
                                />
                              </div>
                              <div className="AdvFormBuilder-field-setting">
                                <Label
                                  htmlFor="field-height"
                                  className="AdvFormBuilder-label"
                                >
                                  Height
                                </Label>
                                <Input
                                  id="field-height"
                                  type="number"
                                  value={
                                    selectedField.height ||
                                    (selectedField.type === "signature"
                                      ? 100
                                      : 200)
                                  }
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      height: parseInt(e.target.value),
                                    })
                                  }
                                  className="mt-1 AdvFormBuilder-input"
                                />
                              </div>
                            </>
                          )}

                          {selectedField.type === "tabs" && (
                            <div className="AdvFormBuilder-field-setting">
                              <Label className="AdvFormBuilder-label">
                                Tab Names
                              </Label>
                              <div className="AdvFormBuilder-options">
                                {selectedField.options?.map((option, index) => (
                                  <Input
                                    key={index}
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [
                                        ...(selectedField.options || []),
                                      ];
                                      newOptions[index] = e.target.value;
                                      updateField(selectedField.id, {
                                        options: newOptions,
                                      });
                                    }}
                                    className="AdvFormBuilder-input AdvFormBuilder-option-input"
                                  />
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const newOptions = [
                                      ...(selectedField.options || []),
                                      `Tab ${
                                        (selectedField.options?.length || 0) + 1
                                      }`,
                                    ];
                                    updateField(selectedField.id, {
                                      options: newOptions,
                                    });
                                  }}
                                  className="AdvFormBuilder-add-option"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Tab
                                </Button>
                              </div>
                            </div>
                          )}

                          {selectedField.type === "panel" && (
                            <>
                              <div className="AdvFormBuilder-field-setting">
                                <Label className="AdvFormBuilder-label">
                                  Layout Type
                                </Label>
                                <select
                                  value={selectedField.layout || "vertical"}
                                  onChange={(e) =>
                                    updateField(selectedField.id, {
                                      layout: e.target.value,
                                    })
                                  }
                                  className="mt-1 AdvFormBuilder-input"
                                >
                                  <option value="vertical">Vertical</option>
                                  <option value="horizontal">Horizontal</option>
                                </select>
                              </div>
                              <div className="AdvFormBuilder-field-setting">
                                <Label className="AdvFormBuilder-label">
                                  Add Child Field
                                </Label>
                                <div className="relative">
                                  <select
                                    multiple
                                    className="mt-1 AdvFormBuilder-input w-full"
                                    style={{ height: "120px" }}
                                    value={selectedChildFieldTypes}
                                    onChange={(e) => {
                                      const selectedOptions = Array.from(
                                        e.target.selectedOptions,
                                        (option) => option.value
                                      );
                                      setSelectedChildFieldTypes(
                                        selectedOptions
                                      );
                                    }}
                                  >
                                    <option value="text">Text Input</option>
                                    <option value="email">Email</option>
                                    <option value="textarea">Text Area</option>
                                    <option value="number">Number</option>
                                    <option value="date">Date Picker</option>
                                    <option value="datetime">Date/Time</option>
                                    <option value="time">Time</option>
                                    <option value="select">Dropdown</option>
                                    <option value="radio">Radio Button</option>
                                    <option value="checkbox">Checkbox</option>
                                    <option value="selectboxes">
                                      Select Boxes
                                    </option>
                                    <option value="file">File Upload</option>
                                    <option value="image">Image</option>
                                    <option value="signature">Signature</option>
                                    <option value="annotation">
                                      Annotation Pad
                                    </option>
                                    <option value="table">Table</option>
                                    <option value="tabs">Tabs</option>
                                    <option value="content">Content</option>
                                    <option value="phone">Phone Number</option>
                                    <option value="currency">Currency</option>
                                    <option value="city">City</option>
                                    <option value="address1">
                                      Address Line 1
                                    </option>
                                    <option value="address2">
                                      Address Line 2
                                    </option>
                                    <option value="pincode">Pincode</option>
                                    <option value="country">Country</option>
                                    <option value="state">State</option>
                                    <option value="firstname">
                                      First Name
                                    </option>
                                    <option value="lastname">Last Name</option>
                                    <option value="mobilephone">
                                      Mobile Phone
                                    </option>
                                    <option value="homephone">
                                      Home Phone
                                    </option>
                                    <option value="birthday">Birthday</option>
                                    <option value="gender">Gender</option>
                                  </select>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const newFields =
                                        selectedChildFieldTypes.map((type) => {
                                          const newField = {
                                            id: `field-${Date.now()}-${Math.random()}`,
                                            type,
                                            label: `${
                                              type.charAt(0).toUpperCase() +
                                              type.slice(1)
                                            } Field`,
                                            placeholder:
                                              type === "textarea"
                                                ? "Enter your message..."
                                                : `Enter your ${type}...`,
                                            required: false,
                                            conditionalRules: [],
                                            validationRules: [],
                                            parentId: selectedField.id,
                                          };

                                          // Add type-specific properties
                                          if (
                                            type === "select" ||
                                            type === "radio" ||
                                            type === "selectboxes"
                                          ) {
                                            newField.options = [
                                              "Option 1",
                                              "Option 2",
                                            ];
                                          }
                                          if (type === "number") {
                                            newField.min = "";
                                            newField.max = "";
                                            newField.step = 1;
                                          }
                                          if (
                                            type === "date" ||
                                            type === "datetime" ||
                                            type === "time"
                                          ) {
                                            newField.min = "";
                                            newField.max = "";
                                          }
                                          if (type === "textarea") {
                                            newField.rows = 4;
                                          }
                                          if (
                                            type === "file" ||
                                            type === "image"
                                          ) {
                                            newField.accept =
                                              type === "image" ? "image/*" : "";
                                          }
                                          if (type === "table") {
                                            newField.rows = 1;
                                            newField.columns = 2;
                                          }
                                          if (
                                            type === "signature" ||
                                            type === "annotation"
                                          ) {
                                            newField.width =
                                              type === "signature" ? 300 : 400;
                                            newField.height =
                                              type === "signature" ? 100 : 200;
                                          }
                                          if (type === "tabs") {
                                            newField.options = [
                                              "Tab 1",
                                              "Tab 2",
                                            ];
                                          }
                                          if (type === "panel") {
                                            newField.layout = "vertical";
                                          }

                                          return newField;
                                        });

                                      const updatedFields = [
                                        ...config.fields,
                                        ...newFields,
                                      ];
                                      setConfig({
                                        ...config,
                                        fields: updatedFields,
                                      });
                                      setSelectedField(
                                        newFields[newFields.length - 1]
                                      );
                                      setSelectedChildFieldTypes([]);
                                    }}
                                    className="mt-2 AdvFormBuilder-add-option"
                                    disabled={
                                      selectedChildFieldTypes.length === 0
                                    }
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Selected Fields (
                                    {selectedChildFieldTypes.length})
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="logic"
                        className="AdvFormBuilder-tabs-content"
                      >
                        <ConditionalRuleEditor
                          field={selectedField}
                          availableFields={config.fields.filter(
                            (f) => f.id !== selectedField.id
                          )}
                          onUpdateRules={(rules) =>
                            updateField(selectedField.id, {
                              conditionalRules: rules,
                            })
                          }
                        />
                      </TabsContent>

                      <TabsContent
                        value="validation"
                        className="AdvFormBuilder-tabs-content"
                      >
                        <ValidationRuleEditor
                          field={selectedField}
                          onUpdateRules={(rules) =>
                            updateField(selectedField.id, {
                              validationRules: rules,
                            })
                          }
                        />
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="AdvFormBuilder-no-selection">
                      <div className="AdvFormBuilder-no-selection-icon">
                        <Settings className="w-6 h-6" />
                      </div>
                      <p>Select a field to edit its properties</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </DragDropContext>
        ) : (
          <FormPreview config={config} />
        )}
      </div>
    </div>
  );
};
