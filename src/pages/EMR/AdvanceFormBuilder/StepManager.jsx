import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, GripVertical, Trash2, Layers } from "lucide-react";

export const StepManager = ({ steps, fields, onUpdateSteps }) => {
  const addStep = () => {
    const newStep = {
      id: `step-${Date.now()}`,
      title: `Step ${steps.length + 1}`,
      description: "",
      fields: []
    };
    onUpdateSteps([...steps, newStep]);
  };

  const updateStep = (stepId, updates) => {
    const updatedSteps = steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    );
    onUpdateSteps(updatedSteps);
  };

  const deleteStep = (stepId) => {
    if (steps.length <= 1) return;
    
    const stepToDelete = steps.find(step => step.id === stepId);
    const updatedSteps = steps.filter(step => step.id !== stepId);
    
    if (stepToDelete && stepToDelete.fields.length > 0) {
      updatedSteps[0].fields = [...updatedSteps[0].fields, ...stepToDelete.fields];
    }
    
    onUpdateSteps(updatedSteps);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onUpdateSteps(items);
  };

  const moveFieldToStep = (fieldId, targetStepId) => {
    const updatedSteps = steps.map(step => ({
      ...step,
      fields: step.id === targetStepId 
        ? [...step.fields.filter(id => id !== fieldId), fieldId]
        : step.fields.filter(id => id !== fieldId)
    }));
    onUpdateSteps(updatedSteps);
  };

  return (
    <Card className="p-6 FFP-AdvFormBuilder-border AdvFormBuilder-shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">Form Steps</h2>
        </div>
        <Badge variant="outline">{steps.length} steps</Badge>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="form-steps">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {steps.map((step, index) => (
                <Draggable key={step.id} draggableId={step.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`FFP-AdvFormBuilder-border rounded-lg p-3 bg-card transition-all ${
                        snapshot.isDragging ? "AdvFormBuilder-shadow-builder rotate-1" : "hover:AdvFormBuilder-shadow-soft"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          {...provided.dragHandleProps}
                          className="mt-1 text-muted-foreground hover:text-foreground cursor-move"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Step {index + 1}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {step.fields.length} fields
                            </Badge>
                          </div>
                          
                          <Input
                            value={step.title}
                            onChange={(e) => updateStep(step.id, { title: e.target.value })}
                            className="h-8 font-medium"
                            placeholder="Step title"
                          />
                          
                          <Input
                            value={step.description || ""}
                            onChange={(e) => updateStep(step.id, { description: e.target.value })}
                            className="h-8 text-sm"
                            placeholder="Step description (optional)"
                          />
                        </div>
                        
                        {steps.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteStep(step.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      {fields.length > 0 && (
                        <div className="mt-3 pt-3 border-t FFP-AdvFormBuilder-border">
                          <Label className="text-xs text-muted-foreground">Assigned Fields:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {step.fields.map(fieldId => {
                              const field = fields.find(f => f.id === fieldId);
                              return field ? (
                                <Badge key={fieldId} variant="outline" className="text-xs">
                                  {field.label}
                                </Badge>
                              ) : null;
                            })}
                            {step.fields.length === 0 && (
                              <span className="text-xs text-muted-foreground">No fields assigned</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      <Button 
        size="sm" 
        variant="outline" 
        onClick={addStep}
        className="w-full mt-3"
      >
        <Plus className="w-3 h-3 mr-1" />
        Add Step
      </Button>
      
      {fields.length > 0 && (
        <div className="mt-4 p-3 AdvFormBuilder-bg-hover rounded-lg">
          <Label className="text-xs font-medium">Quick Field Assignment:</Label>
          <div className="grid grid-cols-1 gap-1 mt-2">
            {fields.map(field => {
              const currentStep = steps.find(step => step.fields.includes(field.id));
              return (
                <div key={field.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">{field.label}</span>
                  <select
                    value={currentStep?.id || ""}
                    onChange={(e) => moveFieldToStep(field.id, e.target.value)}
                    className="ml-2 px-1 py-0.5 FFP-AdvFormBuilder-border rounded text-xs"
                  >
                    {steps.map((step, index) => (
                      <option key={step.id} value={step.id}>
                        Step {index + 1}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};


