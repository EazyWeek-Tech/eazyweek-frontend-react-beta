import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { Trash2, Plus, Eye, EyeOff } from "lucide-react";
import "./form-field-properties.css";

// Props:
// - field: { conditionalRules: Array }
// - availableFields: Array<{ id: string, label: string }>
// - onUpdateRules: function
export const ConditionalRuleEditor = ({ field, availableFields, onUpdateRules }) => {
  const [rules, setRules] = useState(field.conditionalRules || []);

  const addRule = () => {
    const newRule = {
      field: "",
      operator: "equals",
      value: "",
    };
    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    onUpdateRules(updatedRules);
  };

  const updateRule = (index, updates) => {
    const updatedRules = rules.map((rule, i) =>
      i === index ? { ...rule, ...updates } : rule
    );
    setRules(updatedRules);
    onUpdateRules(updatedRules);
  };

  const deleteRule = (index) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    onUpdateRules(updatedRules);
  };

  const operators = [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
  ];

  return (
    <div className="space-y-4 FFP-field-properties">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-muted-foreground iconright" />
        <Label className="text-sm font-medium">Show this field when:</Label>
      </div>

      {rules.length === 0 ? (
        <div className="text-center p-4 border border-dashed FFP-border-builder-border rounded-lg icon">
          <EyeOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            No conditional rules set. Field is always visible.
          </p>
          <Button size="sm" variant="outline" onClick={addRule}>
            <Plus className="w-3 h-3 mr-1" />
            Add Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="FFP-border-builder-border rounded-lg p-3 animate-fade-in"
            >
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-xs">
                  Rule {index + 1}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteRule(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Field</Label>
                  <Select
                    value={rule.field}
                    onValueChange={(value) => updateRule(index, { field: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((availableField) => (
                        <SelectItem key={availableField.id} value={availableField.id}>
                          {availableField.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Condition</Label>
                  <Select
                    value={rule.operator}
                    onValueChange={(value) => updateRule(index, { operator: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={rule.value}
                    onChange={(e) => updateRule(index, { value: e.target.value })}
                    placeholder="Enter value"
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button size="sm" variant="outline" onClick={addRule} className="w-full">
            <Plus className="w-3 h-3 mr-1" />
            Add Another Rule
          </Button>
        </div>
      )}

      {rules.length > 0 && (
        <div className="text-xs text-muted-foreground .FFP-AdvFormBuilder-bg-hover p-2 rounded">
          💡 All rules must be satisfied for the field to be visible
        </div>
      )}
    </div>
  );
};
