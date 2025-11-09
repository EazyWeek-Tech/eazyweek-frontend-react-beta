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
} from "lucide-react";
import { FormFieldSelector } from "./FormFieldSelector";
import { FormPreview } from "./FormPreview";
import { ConditionalRuleEditor } from "./ConditionalRuleEditor";
import { ValidationRuleEditor } from "./ValidationRuleEditor";
import { StepManager } from "./StepManager";
// import { useToast } from "./use-toast";
import "./AdvancedFormBuilder.css";

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
  // const { toast } = useToast();

  const addField = (type) => {
    const newField = {
      id: `field-${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: type === "textarea" ? "Enter your message..." : `Enter your ${type}...`,
      required: false,
      conditionalRules: [],
      validationRules: [],
      step: 0,
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
    const updatedSteps = [...config.steps];
    updatedSteps[0].fields.push(newField.id);

    setConfig({ ...config, fields: updatedFields, steps: updatedSteps });
    setSelectedField(newField);
  };

  const updateField = (id, updates) => {
    const updatedFields = config.fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    );
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

    if (result.source.droppableId === "form-fields" && result.destination.droppableId === "form-fields") {
      // Reorder existing fields
      const items = Array.from(config.fields);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // Update the steps array to reflect the new field order
      const updatedSteps = [...config.steps];
      updatedSteps[0].fields = items.map(field => field.id);

      setConfig({ ...config, fields: items, steps: updatedSteps });
    } else if (result.source.droppableId === "field-selector" && result.destination.droppableId === "form-fields") {
      // Add new field from selector
      const type = result.draggableId.split('-')[1];
      const newField = {
        id: `field-${Date.now()}`,
        type,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
        placeholder: type === "textarea" ? "Enter your message..." : `Enter your ${type}...`,
        required: false,
        conditionalRules: [],
        validationRules: [],
        step: 0,
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
    } else if (result.source.droppableId === "form-fields" && result.destination.droppableId === "field-selector") {
      // Remove field by dragging back to selector
      const fieldId = result.draggableId;
      deleteField(fieldId);
    }
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
                          {config.fields.length} field{config.fields.length !== 1 ? 's' : ''}
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
                              Start building your {config.isMultiStep ? "multi-step " : ""}form by adding fields from the sidebar
                            </p>
                          </div>
                        ) : (
                          config.fields.map((field, index) => (
                            <Draggable key={field.id} draggableId={field.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`AdvFormBuilder-field ${snapshot.isDragging ? "dragging" : ""} ${selectedField?.id === field.id ? "selected" : ""}`}
                                  onClick={() => setSelectedField(field)}
                                  style={{
                                    borderColor: selectedField?.id === field.id ? 'var(--primary)' : 'var(--builder-border)',
                                    boxShadow: selectedField?.id === field.id ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'var(--shadow-sm)',
                                    backgroundColor: selectedField?.id === field.id ? 'var(--primary-light)' : 'var(--card-bg)'
                                  }}
                                >
                                  <div className="AdvFormBuilder-field-content">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="AdvFormBuilder-field-drag-handle"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <div className="AdvFormBuilder-field-info">
                                      <div className="AdvFormBuilder-field-label">
                                        <Label className="font-medium">{field.label}</Label>
                                        {field.required && (
                                          <span className="AdvFormBuilder-field-required">*</span>
                                        )}
                                        {field.conditionalRules && field.conditionalRules.length > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            Conditional
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="AdvFormBuilder-field-type">
                                        {field.type} field
                                        {config.isMultiStep && (
                                          <Badge variant="secondary" className="text-xs">
                                            Step {(config.steps.findIndex(step => step.fields.includes(field.id)) || 0) + 1}
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
                <h2 className="AdvFormBuilder-card-title">Field Properties</h2>

                {selectedField ? (
                  <Tabs defaultValue="basic" className="AdvFormBuilder-tabs">
                    <TabsList className="AdvFormBuilder-tabs-list">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="logic">Logic</TabsTrigger>
                      <TabsTrigger value="validation">Rules</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="AdvFormBuilder-tabs-content">
                      <div className="AdvFormBuilder-properties-content">
                        <div className="AdvFormBuilder-field-setting">
                          <Label htmlFor="field-label" className="AdvFormBuilder-label">Label</Label>
                          <Input
                            id="field-label"
                            value={selectedField.label}
                            onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                            className="mt-1 AdvFormBuilder-input"
                          />
                        </div>

                        <div className="AdvFormBuilder-field-setting">
                          <Label htmlFor="field-placeholder" className="AdvFormBuilder-label">Placeholder</Label>
                          <Input
                            id="field-placeholder"
                            value={selectedField.placeholder || ""}
                            onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                            className="mt-1 AdvFormBuilder-input"
                          />
                        </div>

                        <div className="AdvFormBuilder-toggle">
                          <ToggleSwitch
                            leftLabel="Optional"
                            rightLabel="Required"
                            value={selectedField.required ? "Required" : "Optional"}
                            onChange={(value) => updateField(selectedField.id, { required: value === "Required" })}
                          />
                        </div>

                        {(selectedField.type === "select" || selectedField.type === "radio" || selectedField.type === "selectboxes") && (
                          <div className="AdvFormBuilder-field-setting">
                            <Label className="AdvFormBuilder-label">Options</Label>
                            <div className="AdvFormBuilder-options">
                              {selectedField.options?.map((option, index) => (
                                <Input
                                  key={index}
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...(selectedField.options || [])];
                                    newOptions[index] = e.target.value;
                                    updateField(selectedField.id, { options: newOptions });
                                  }}
                                  className="AdvFormBuilder-input AdvFormBuilder-option-input"
                                />
                              ))}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newOptions = [...(selectedField.options || []), `Option ${(selectedField.options?.length || 0) + 1}`];
                                  updateField(selectedField.id, { options: newOptions });
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
                              <Label htmlFor="field-min" className="AdvFormBuilder-label">Minimum Value</Label>
                              <Input
                                id="field-min"
                                type="number"
                                value={selectedField.min || ""}
                                onChange={(e) => updateField(selectedField.id, { min: e.target.value })}
                                className="mt-1 AdvFormBuilder-input"
                              />
                            </div>
                            <div className="AdvFormBuilder-field-setting">
                              <Label htmlFor="field-max" className="AdvFormBuilder-label">Maximum Value</Label>
                              <Input
                                id="field-max"
                                type="number"
                                value={selectedField.max || ""}
                                onChange={(e) => updateField(selectedField.id, { max: e.target.value })}
                                className="mt-1 AdvFormBuilder-input"
                              />
                            </div>
                            <div className="AdvFormBuilder-field-setting">
                              <Label htmlFor="field-step" className="AdvFormBuilder-label">Step</Label>
                              <Input
                                id="field-step"
                                type="number"
                                value={selectedField.step || 1}
                                onChange={(e) => updateField(selectedField.id, { step: parseFloat(e.target.value) })}
                                className="mt-1 AdvFormBuilder-input"
                              />
                            </div>
                          </>
                        )}

                        {(selectedField.type === "date" || selectedField.type === "datetime" || selectedField.type === "time") && (
                          <>
                            <div className="AdvFormBuilder-field-setting">
                              <Label htmlFor="field-min-date" className="AdvFormBuilder-label">Minimum Date/Time</Label>
                              <Input
                                id="field-min-date"
                                type={selectedField.type}
                                value={selectedField.min || ""}
                                onChange={(e) => updateField(selectedField.id, { min: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div className="AdvFormBuilder-field-setting">
                              <Label htmlFor="field-max-date" className="AdvFormBuilder-label">Maximum Date/Time</Label>
                              <Input
                                id="field-max-date"
                                type={selectedField.type}
                                value={selectedField.max || ""}
                                onChange={(e) => updateField(selectedField.id, { max: e.target.value })}
                                className="mt-1 AdvFormBuilder-input"
                              />
                            </div>
                          </>
                        )}

                        {selectedField.type === "textarea" && (
                          <div className="AdvFormBuilder-field-setting">
                            <Label htmlFor="field-rows" className="AdvFormBuilder-label">Rows</Label>
                            <Input
                              id="field-rows"
                              type="number"
                              value={selectedField.rows || 4}
                              onChange={(e) => updateField(selectedField.id, { rows: parseInt(e.target.value) })}
                              className="mt-1 AdvFormBuilder-input"
                            />
                          </div>
                        )}

                        {(selectedField.type === "file" || selectedField.type === "image") && (
                          <div className="AdvFormBuilder-field-setting">
                            <Label htmlFor="field-accept" className="AdvFormBuilder-label">Accept File Types</Label>
                            <Input
                              id="field-accept"
                              value={selectedField.accept || ""}
                              onChange={(e) => updateField(selectedField.id, { accept: e.target.value })}
                              className="mt-1 AdvFormBuilder-input"
                              placeholder="e.g., .pdf,.doc,image/*"
                            />
                          </div>
                        )}

                        {selectedField.type === "table" && (
                          <>
                            <div className="AdvFormBuilder-field-setting">
                              <Label htmlFor="field-rows" className="AdvFormBuilder-label">Number of Rows</Label>
                              <Input
                                id="field-rows"
                                type="number"
                                value={selectedField.rows || 1}
                                onChange={(e) => updateField(selectedField.id, { rows: parseInt(e.target.value) })}
                                className="mt-1 AdvFormBuilder-input"
                              />
                            </div>
                            <div className="AdvFormBuilder-field-setting">
                              <Label htmlFor="field-columns" className="AdvFormBuilder-label">Number of Columns</Label>
                              <Input
                                id="field-columns"
                                type="number"
                                value={selectedField.columns || 2}
                                onChange={(e) => updateField(selectedField.id, { columns: parseInt(e.target.value) })}
                                className="mt-1 AdvFormBuilder-input"
                              />
                            </div>
                          </>
                        )}

                        {(selectedField.type === "signature" || selectedField.type === "annotation") && (
                          <>
                            <div className="AdvFormBuilder-field-setting">
                              <Label htmlFor="field-width" className="AdvFormBuilder-label">Width</Label>
                              <Input
                                id="field-width"
                                type="number"
                                value={selectedField.width || (selectedField.type === "signature" ? 300 : 400)}
                                onChange={(e) => updateField(selectedField.id, { width: parseInt(e.target.value) })}
                                className="mt-1 AdvFormBuilder-input"
                              />
                            </div>
                            <div className="AdvFormBuilder-field-setting">
                              <Label htmlFor="field-height" className="AdvFormBuilder-label">Height</Label>
                              <Input
                                id="field-height"
                                type="number"
                                value={selectedField.height || (selectedField.type === "signature" ? 100 : 200)}
                                onChange={(e) => updateField(selectedField.id, { height: parseInt(e.target.value) })}
                                className="mt-1 AdvFormBuilder-input"
                              />
                            </div>
                          </>
                        )}

                        {selectedField.type === "tabs" && (
                          <div className="AdvFormBuilder-field-setting">
                            <Label className="AdvFormBuilder-label">Tab Names</Label>
                            <div className="AdvFormBuilder-options">
                              {selectedField.options?.map((option, index) => (
                                <Input
                                  key={index}
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...(selectedField.options || [])];
                                    newOptions[index] = e.target.value;
                                    updateField(selectedField.id, { options: newOptions });
                                  }}
                                  className="AdvFormBuilder-input AdvFormBuilder-option-input"
                                />
                              ))}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newOptions = [...(selectedField.options || []), `Tab ${(selectedField.options?.length || 0) + 1}`];
                                  updateField(selectedField.id, { options: newOptions });
                                }}
                                className="AdvFormBuilder-add-option"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Tab
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="logic" className="AdvFormBuilder-tabs-content">
                      <ConditionalRuleEditor
                        field={selectedField}
                        availableFields={config.fields.filter(f => f.id !== selectedField.id)}
                        onUpdateRules={(rules) => updateField(selectedField.id, { conditionalRules: rules })}
                      />
                    </TabsContent>

                    <TabsContent value="validation" className="AdvFormBuilder-tabs-content">
                      <ValidationRuleEditor
                        field={selectedField}
                        onUpdateRules={(rules) => updateField(selectedField.id, { validationRules: rules })}
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