import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, GripVertical, Plus, Eye, Code } from "lucide-react";
import { FormFieldSelector } from "./FormFieldSelector";
import { FormPreview } from "./FormPreview";
import { useToast } from "@/hooks/use-toast";

// Note: originally from TS
// const formField = {
//   id: string,
//   type: "text" | "email" | "textarea" | "select" | "checkbox" | "radio" | "number",
//   label: string,
//   placeholder?: string,
//   required: boolean,
//   options?: string[]
// };

export const FormBuilder = () => {
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const addField = (type) => {
    const newField = {
      id: `field-${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder:
        type === "textarea" ? "Enter your message..." : `Enter your ${type}...`,
      required: false,
      options:
        type === "select" || type === "radio"
          ? ["Option 1", "Option 2"]
          : undefined,
    };
    setFields([...fields, newField]);
    setSelectedField(newField);
  };

  const updateField = (id, updates) => {
    setFields(
      fields.map((field) => (field.id === id ? { ...field, ...updates } : field))
    );
    if (selectedField?.id === id) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  const deleteField = (id) => {
    setFields(fields.filter((field) => field.id !== id));
    if (selectedField?.id === id) {
      setSelectedField(null);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFields(items);
  };

  const exportForm = () => {
    const formData = {
      title: "Custom Form",
      fields: fields.map(field => {
        const { id: _, ...rest } = field;
        return rest;
      }),
      created: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(formData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form-config.json";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Form exported successfully!",
      description: "Your form configuration has been downloaded.",
    });
  };

  if (showPreview) {
    return (
      <div className="min-h-screen bg-builder-bg">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Form Preview</h1>
            <div className="flex gap-2">
              <Button onClick={() => setShowPreview(false)} variant="outline">
                Back to Builder
              </Button>
              <Button onClick={exportForm} variant="default">
                <Code className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <FormPreview
            config={{
              title: "Form Preview",
              fields,
              steps: [
                {
                  id: "step-1",
                  title: "General",
                  fields: fields.map((f) => f.id),
                },
              ],
              isMultiStep: false,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-builder-bg">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Form Builder
            </h1>
            <p className="text-muted-foreground mt-1">
              Drag and drop to create beautiful forms
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowPreview(true)} variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button onClick={exportForm} disabled={fields.length === 0}>
              <Code className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <FormFieldSelector onAddField={addField} />
          </div>

          <div className="lg:col-span-2">
            <Card className="p-6 min-h-[600px] FFP-FFP-AdvFormBuilder-border AdvFormBuilder-shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Form Fields</h2>
                {fields.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {fields.length} field{fields.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <div className="w-24 h-24 rounded-full FFP-AdvFormBuilder-bg-hover flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No fields yet</h3>
                  <p className="text-muted-foreground">
                    Start building your form by adding fields from the sidebar
                  </p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="form-fields">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`group relative FFP-AdvFormBuilder-border rounded-lg p-4 bg-card transition-all ${
                                  snapshot.isDragging
                                    ? "AdvFormBuilder-shadow-builder rotate-2"
                                    : "hover:AdvFormBuilder-shadow-soft"
                                } ${
                                  selectedField?.id === field.id ? "border-primary" : ""
                                }`}
                                onClick={() => setSelectedField(field)}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-1 text-muted-foreground hover:text-foreground cursor-move"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Label className="font-medium">{field.label}</Label>
                                      {field.required && (
                                        <span className="text-destructive text-sm">*</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground capitalize">
                                      {field.type} field
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteField(field.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
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

          <div className="lg:col-span-1">
            <Card className="p-6 FFP-AdvFormBuilder-border AdvFormBuilder-shadow-soft sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Field Properties</h2>

              {selectedField ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="field-label">Label</Label>
                    <Input
                      id="field-label"
                      value={selectedField.label}
                      onChange={(e) =>
                        updateField(selectedField.id, { label: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="field-placeholder">Placeholder</Label>
                    <Input
                      id="field-placeholder"
                      value={selectedField.placeholder || ""}
                      onChange={(e) =>
                        updateField(selectedField.id, { placeholder: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={selectedField.required}
                      onCheckedChange={(checked) =>
                        updateField(selectedField.id, { required: checked })
                      }
                    />
                    <Label>Required field</Label>
                  </div>

                  {(selectedField.type === "select" ||
                    selectedField.type === "radio") && (
                    <div>
                      <Label>Options</Label>
                      <div className="space-y-2 mt-1">
                        {selectedField.options?.map((option, index) => (
                          <Input
                            key={index}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(selectedField.options || [])];
                              newOptions[index] = e.target.value;
                              updateField(selectedField.id, { options: newOptions });
                            }}
                          />
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newOptions = [
                              ...(selectedField.options || []),
                              `Option ${(selectedField.options?.length || 0) + 1}`,
                            ];
                            updateField(selectedField.id, { options: newOptions });
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Option
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full AdvFormBuilder-bg-hover flex items-center justify-center mx-auto mb-3">
                    <GripVertical className="w-6 h-6" />
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
