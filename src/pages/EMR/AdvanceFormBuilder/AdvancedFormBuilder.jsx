import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
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
import { useToast } from "./use-toast";
import "./AdvanceFormBuilder.css";

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
  const { toast } = useToast();

  const addField = (type) => {
    const newField = {
      id: `field-${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: type === "textarea" ? "Enter your message..." : `Enter your ${type}...`,
      required: false,
      options: type === "select" || type === "radio" ? ["Option 1", "Option 2"] : undefined,
      conditionalRules: [],
      validationRules: [],
      step: 0,
    };
    
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

    const items = Array.from(config.fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setConfig({ ...config, fields: items });
  };

  const exportForm = () => {
    const exportData = {
      ...config,
      created: new Date().toISOString(),
      version: "2.0"
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "advanced-form-config.json";
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Form exported successfully!",
      description: "Your advanced form configuration has been downloaded.",
    });
  };

  const toggleMultiStep = () => {
    setConfig({ ...config, isMultiStep: !config.isMultiStep });
  };

  if (currentView === "preview") {
    return (
      <div className="form-preview-container">
        <div className="form-preview-wrapper">
          <div className="form-preview-header">
            <div>
              <h1 className="form-preview-title">Form Preview</h1>
              <p className="form-preview-subtitle">
                {config.isMultiStep ? `Multi-step form with ${config.steps.length} steps` : "Single page form"}
              </p>
            </div>
            <div className="form-preview-actions">
              <Button onClick={() => setCurrentView("builder")} variant="outline">
                Back to Builder
              </Button>
              <Button onClick={exportForm} variant="default">
                <Code className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <FormPreview config={config} />
        </div>
      </div>
    );
  }

  return (
    <div className="form-builder-container">
      <div className="form-builder-wrapper">
        <div className="form-builder-header">
          <div>
            <h1 className="form-builder-title">
              Advanced Form Builder
            </h1>
            <p className="form-builder-subtitle">
              Create sophisticated forms with conditional logic & multi-step workflows
              {config.isMultiStep && (
                <Badge variant="secondary">
                  <Layers className="w-3 h-1 mr-1" />
                  Multi-Step
                </Badge>
              )}
            </p>
          </div>
          <div className="form-builder-actions">
            <Button onClick={() => setCurrentView("preview")} variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button onClick={exportForm} disabled={config.fields.length === 0}>
              <Code className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="form-builder-grid">
          {/* Field Selector & Form Settings */}
          <div className="form-builder-sidebar">
            <Card className="form-builder-card">
              <div className="form-builder-card-header">
                <h2 className="form-builder-card-title">Form Settings</h2>
                <Settings className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="form-builder-form-settings">
                <div className="form-builder-form-setting">
                  <Label htmlFor="form-title">Form Title</Label>
                  <Input
                    id="form-title"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="form-builder-toggle">
                  <Switch
                    checked={config.isMultiStep}
                    onCheckedChange={toggleMultiStep}
                  />
                  <Label>Multi-step form</Label>
                </div>
              </div>
            </Card>

            <FormFieldSelector onAddField={addField} />

            {config.isMultiStep && (
              <StepManager
                steps={config.steps}
                fields={config.fields}
                onUpdateSteps={(steps) => setConfig({ ...config, steps })}
              />
            )}
          </div>

          {/* Form Builder */}
          <div className="form-builder-main">
            <Card className="form-builder-card form-builder-fields-container">
              <div className="form-builder-fields-header">
                <div className="form-builder-fields-header-left">
                  <h2 className="form-builder-card-title">Form Fields</h2>
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

              {config.fields.length === 0 ? (
                <div className="form-builder-empty-state">
                  <div className="form-builder-empty-icon">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="form-builder-empty-title">No fields yet</h3>
                  <p className="form-builder-empty-text">
                    Start building your {config.isMultiStep ? "multi-step " : ""}form by adding fields from the sidebar
                  </p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="form-fields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="form-builder-fields-list">
                        {config.fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`form-builder-field ${snapshot.isDragging ? "dragging" : ""} ${selectedField?.id === field.id ? "selected" : ""}`}
                                onClick={() => setSelectedField(field)}
                              >
                                <div className="form-builder-field-content">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="form-builder-field-drag-handle"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <div className="form-builder-field-info">
                                    <div className="form-builder-field-label">
                                      <Label className="font-medium">{field.label}</Label>
                                      {field.required && (
                                        <span className="form-builder-field-required">*</span>
                                      )}
                                      {field.conditionalRules && field.conditionalRules.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          Conditional
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="form-builder-field-type">
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
                                    className="form-builder-field-delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </Card>
          </div>

          {/* Advanced Field Editor */}
          <div className="form-builder-properties">
            <Card className="form-builder-card">
              <h2 className="form-builder-card-title">Field Properties</h2>

              {selectedField ? (
                <Tabs defaultValue="basic" className="form-builder-tabs">
                  <TabsList className="form-builder-tabs-list">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="logic">Logic</TabsTrigger>
                    <TabsTrigger value="validation">Rules</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="form-builder-tabs-content">
                    <div className="form-builder-properties-content">
                      <div className="form-builder-field-setting">
                        <Label htmlFor="field-label">Label</Label>
                        <Input
                          id="field-label"
                          value={selectedField.label}
                          onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      <div className="form-builder-field-setting">
                        <Label htmlFor="field-placeholder">Placeholder</Label>
                        <Input
                          id="field-placeholder"
                          value={selectedField.placeholder || ""}
                          onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      <div className="form-builder-toggle">
                        <Switch
                          checked={selectedField.required}
                          onCheckedChange={(checked) => updateField(selectedField.id, { required: checked })}
                        />
                        <Label>Required field</Label>
                      </div>

                      {(selectedField.type === "select" || selectedField.type === "radio") && (
                        <div className="form-builder-field-setting">
                          <Label>Options</Label>
                          <div className="form-builder-options">
                            {selectedField.options?.map((option, index) => (
                              <Input
                                key={index}
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(selectedField.options || [])];
                                  newOptions[index] = e.target.value;
                                  updateField(selectedField.id, { options: newOptions });
                                }}
                                className="form-builder-option-input"
                              />
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newOptions = [...(selectedField.options || []), `Option ${(selectedField.options?.length || 0) + 1}`];
                                updateField(selectedField.id, { options: newOptions });
                              }}
                              className="form-builder-add-option"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Option
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="logic" className="form-builder-tabs-content">
                    <ConditionalRuleEditor
                      field={selectedField}
                      availableFields={config.fields.filter(f => f.id !== selectedField.id)}
                      onUpdateRules={(rules) => updateField(selectedField.id, { conditionalRules: rules })}
                    />
                  </TabsContent>

                  <TabsContent value="validation" className="form-builder-tabs-content">
                    <ValidationRuleEditor
                      field={selectedField}
                      onUpdateRules={(rules) => updateField(selectedField.id, { validationRules: rules })}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="form-builder-no-selection">
                  <div className="form-builder-no-selection-icon">
                    <Settings className="w-6 h-6" />
                  </div>
                  <p>Select a field to edit its properties</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
