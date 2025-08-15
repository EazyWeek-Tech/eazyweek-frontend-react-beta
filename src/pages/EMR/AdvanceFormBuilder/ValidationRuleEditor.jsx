import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Shield, AlertTriangle } from "lucide-react";

export const ValidationRuleEditor = ({ field, onUpdateRules }) => {
  const [rules, setRules] = useState(field.validationRules || []);

  const addRule = () => {
    const newRule = {
      type: "min_length",
      value: "",
      message: "This field is invalid"
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

  const validationTypes = [
    { value: "min_length", label: "Minimum Length", hasValue: true },
    { value: "max_length", label: "Maximum Length", hasValue: true },
    { value: "pattern", label: "Pattern/Regex", hasValue: true },
    { value: "custom", label: "Custom Rule", hasValue: false },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Validation Rules</Label>
      </div>

      {rules.length === 0 ? (
        <div className="text-center p-4 border border-dashed border-builder-border rounded-lg">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            No validation rules set. Only basic type validation will apply.
          </p>
          <Button size="sm" variant="outline" onClick={addRule}>
            <Plus className="w-3 h-3 mr-1" />
            Add Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => {
            const ruleType = validationTypes.find(type => type.value === rule.type);

            return (
              <div key={index} className="border border-builder-border rounded-lg p-3 animate-fade-in">
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
                    <Label className="text-xs">Validation Type</Label>
                    <Select
                      value={rule.type}
                      onValueChange={(value) => updateRule(index, { type: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {validationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {ruleType?.hasValue && (
                    <div>
                      <Label className="text-xs">
                        {rule.type === "pattern" ? "Pattern (Regex)" : "Value"}
                      </Label>
                      <Input
                        value={rule.value.toString()}
                        onChange={(e) => updateRule(index, {
                          value: rule.type === "min_length" || rule.type === "max_length"
                            ? parseInt(e.target.value) || 0
                            : e.target.value
                        })}
                        placeholder={
                          rule.type === "pattern"
                            ? "^[a-zA-Z0-9]+$"
                            : rule.type.includes("length")
                              ? "0"
                              : "Enter value"
                        }
                        type={rule.type.includes("length") ? "number" : "text"}
                        className="h-8"
                      />
                      {rule.type === "pattern" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Use regex pattern (e.g., ^[A-Z]{2}\d{4}$ for 2 letters + 4 digits)
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Error Message</Label>
                    <Textarea
                      value={rule.message}
                      onChange={(e) => updateRule(index, { message: e.target.value })}
                      placeholder="Enter custom error message"
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <Button size="sm" variant="outline" onClick={addRule} className="w-full">
            <Plus className="w-3 h-3 mr-1" />
            Add Validation Rule
          </Button>
        </div>
      )}

      {rules.length > 0 && (
        <div className="text-xs text-muted-foreground bg-builder-hover p-2 rounded">
          💡 Validation rules are checked when the user submits the form
        </div>
      )}
    </div>
  );
};
