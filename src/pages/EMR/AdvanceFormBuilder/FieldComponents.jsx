import { useState, useRef, useEffect } from "react";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Checkbox } from "../../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Label } from "../../../components/ui/label";
import { Card } from "../../../components/ui/card";
import { FileText, MapPin, Phone, Mail, Calendar, DollarSign, User, Hash, Globe, Home, Building } from "lucide-react";
import FileUploader from "../Components/FileUploader";

// Text Field Component
export const TextField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-text">
    <Label htmlFor={field.id}>
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id} 
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Email Field Component
export const EmailField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-email">
    <Label htmlFor={field.id}>
      <Mail className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="email"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Number Field Component
export const NumberField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-number">
    <Label htmlFor={field.id}>
      <Hash className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="number"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Date Field Component
export const DateField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-date">
    <Label htmlFor={field.id}>
      <Calendar className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="date"
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Time Field Component
export const TimeField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-time">
    <Label htmlFor={field.id}>
      <Calendar className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="time"
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Currency Field Component
export const CurrencyField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-currency">
    <Label htmlFor={field.id}>
      <DollarSign className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Phone Field Component
export const PhoneField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-phone">
    <Label htmlFor={field.id}>
      <Phone className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="tel"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Datetime Field Component
export const DatetimeField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-datetime">
    <Label htmlFor={field.id}>
      <Calendar className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="datetime-local"
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Address Fields Components
export const Address1Field = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-address1">
    <Label htmlFor={field.id}>
      <MapPin className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

export const Address2Field = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-address2">
    <Label htmlFor={field.id}>
      <Building className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

export const CityField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-city">
    <Label htmlFor={field.id}>
      <MapPin className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

export const PincodeField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-pincode">
    <Label htmlFor={field.id}>
      <Hash className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

export const StateField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-state">
    <Label htmlFor={field.id}>
      <Globe className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

export const CountryField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-country">
    <Label htmlFor={field.id}>
      <Globe className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Name Fields
export const FirstnameField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-firstname">
    <Label htmlFor={field.id}>
      <User className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

export const LastnameField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-lastname">
    <Label htmlFor={field.id}>
      <User className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="text"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

export const MobilephoneField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-mobilephone">
    <Label htmlFor={field.id}>
      <Phone className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="tel"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

export const HomephoneField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-homephone">
    <Label htmlFor={field.id}>
      <Home className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="tel"
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

export const BirthdayField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-birthday">
    <Label htmlFor={field.id}>
      <Calendar className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Input
      id={field.id}
      type="date"
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Textarea Field Component
export const TextareaField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-textarea">
    <Label htmlFor={field.id}>
      <FileText className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Textarea
      id={field.id}
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      rows={4}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Content Field (similar to textarea)
export const ContentField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-content">
    <Label htmlFor={field.id}>
      <FileText className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Textarea
      id={field.id}
      placeholder={field.placeholder}
      value={value || ""}
      onChange={(e) => onChange(field.id, e.target.value)}
      rows={6}
      className={error ? "form-field-error" : ""}
    />
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Checkbox Field Component
export const CheckboxField = ({ field, value, onChange, error }) => {
  const handleChange = (checked) => {
    onChange(field.id, checked);
  };

  return (
    <div className="form-field-component form-field-checkbox">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={field.id}
          checked={value || false}
          onChange={(e) => handleChange(e.target.checked)}
          className="form-checkbox"
        />
        <Label htmlFor={field.id} className="text-sm font-normal">
          {field.label}
          {field.required && <span className="form-field-required">*</span>}
        </Label>
      </div>
      {error && <span className="form-field-error-message">{error}</span>}
    </div>
  );
};

// Radio Field Component
export const RadioField = ({ field, value, onChange, error }) => {
  const handleChange = (selectedValue) => {
    onChange(field.id, selectedValue);
  };

  return (
    <div className="form-field-component form-field-radio">
      <Label>
        {field.label}
        {field.required && <span className="form-field-required">*</span>}
      </Label>
      <div className="space-y-2">
        {field.options?.map((option, index) => (
          <div key={index} className="flex items-center space-x-2 form-field-option">
            <input
              type="radio"
              id={`${field.id}-${index}`}
              name={field.id}
              value={option}
              checked={value === option}
              onChange={(e) => handleChange(e.target.value)}
              className="form-radio"
            />
            <Label htmlFor={`${field.id}-${index}`} className="text-sm font-normal">{option}</Label>
          </div>
        ))}
      </div>
      {error && <span className="form-field-error-message">{error}</span>}
    </div>
  );
};

// Select Field Component
export const SelectField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-select">
    <Label htmlFor={field.id}>
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Select value={value || ""} onValueChange={(val) => onChange(field.id, val)}>
      <SelectTrigger>
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((option, index) => (
          <SelectItem key={index} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Day Field (similar to select)
export const DayField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-day">
    <Label htmlFor={field.id}>
      <Calendar className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Select value={value || ""} onValueChange={(val) => onChange(field.id, val)}>
      <SelectTrigger>
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
          <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Gender Field (similar to select)
export const GenderField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-gender">
    <Label htmlFor={field.id}>
      <User className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <Select value={value || ""} onValueChange={(val) => onChange(field.id, val)}>
      <SelectTrigger>
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="male">Male</SelectItem>
        <SelectItem value="female">Female</SelectItem>
        <SelectItem value="other">Other</SelectItem>
      </SelectContent>
    </Select>
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Selectboxes Field Component
export const SelectboxesField = ({ field, value, onChange, error }) => (
  <div className="form-field-component form-field-selectboxes">
    <Label>
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <div className="space-y-2">
      {field.options?.map((option, index) => (
        <div key={index} className="flex items-center space-x-2 form-field-option">
          <Checkbox
            id={`${field.id}-${index}`}
            checked={(value || []).includes(option)}
            onCheckedChange={(checked) => {
              const currentValues = value || [];
              const newValues = checked
                ? [...currentValues, option]
                : currentValues.filter(v => v !== option);
              onChange(field.id, newValues);
            }}
          />
          <Label htmlFor={`${field.id}-${index}`} className="text-sm font-normal">{option}</Label>
        </div>
      ))}
    </div>
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// File Field Component
export const FileField = ({ field, value, onChange, error }) => {
  const handleFilesSelected = (files) => {
    onChange(field.id, files);
  };

  return (
    <div className="form-field-component form-field-file">
      <Label htmlFor={field.id}>
        <FileText className="w-4 h-4 mr-2" />
        {field.label}
        {field.required && <span className="form-field-required">*</span>}
      </Label>
      <FileUploader onFilesSelected={handleFilesSelected} accept={{ '*/*': [] }} />
      {value && value.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-600 mb-2">Selected Files:</p>
          <ul className="space-y-1">
            {value.map((file, index) => (
              <li key={index} className="text-sm text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {file.fileName}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <span className="form-field-error-message">{error}</span>}
    </div>
  );
};

// Image Field Component
export const ImageField = ({ field, value, onChange, error }) => {
  const handleFilesSelected = (files) => {
    onChange(field.id, files);
  };

  return (
    <div className="form-field-component form-field-image">
      <Label htmlFor={field.id}>
        <FileText className="w-4 h-4 mr-2" />
        {field.label}
        {field.required && <span className="form-field-required">*</span>}
      </Label>
      <FileUploader onFilesSelected={handleFilesSelected} accept={{ 'image/*': [] }} />
      {value && value.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-600 mb-2">Selected Images:</p>
          <ul className="space-y-1">
            {value.map((file, index) => (
              <li key={index} className="text-sm text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {file.fileName}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <span className="form-field-error-message">{error}</span>}
    </div>
  );
};

// Signature Field Component
export const SignatureField = ({ field, value, onChange, error }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      // Load existing signature if available
      if (value) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = value;
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [value]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();
    onChange(field.id, dataURL);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(field.id, null); // Clear the value
  };

  return (
    <div className="form-field-component form-field-signature">
      <Label htmlFor={field.id}>
        <FileText className="w-4 h-4 mr-2" />
        {field.label}
        {field.required && <span className="form-field-required">*</span>}
      </Label>
      <div className="border-2 border-dashed border-gray-300 p-4 text-center">
        <p className="text-sm text-gray-500 mb-2">Please sign below</p>
        <canvas
          ref={canvasRef}
          id={`signature-${field.id}`}
          className="border border-gray-200 cursor-crosshair"
          width="500"
          height="140"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        <div className="mt-2">
          <Button onClick={clearCanvas} size="sm" variant="outline">Clear Signature</Button>
        </div>
      </div>
      {error && <span className="form-field-error-message">{error}</span>}
    </div>
  );
};

import { Button } from "../../../components/ui/button";

// Table Field Component
export const TableField = ({ field, onChange, error }) => {
  const [rows, setRows] = useState(1);
  const [columns, setColumns] = useState(2);

  const addRow = () => setRows(rows + 1);
  const addColumn = () => setColumns(columns + 1);

  return (
    <div className="form-field-component form-field-table">
      <Label>
        <FileText className="w-4 h-4 mr-2" />
        {field.label}
        {field.required && <span className="form-field-required">*</span>}
      </Label>
      <div className="mb-2 flex gap-2">
        <Button onClick={addRow} size="sm" variant="outline">Add Row</Button>
        <Button onClick={addColumn} size="sm" variant="outline">Add Column</Button>
      </div>
      <div className="border border-gray-200 p-2">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              {Array.from({ length: columns }, (_, i) => (
                <th key={i} className="border border-gray-300 p-2">Column {i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }, (_, colIndex) => (
                  <td key={colIndex} className="border border-gray-300 p-2">
                    <Input
                      placeholder={`Row ${rowIndex + 1}, Col ${colIndex + 1}`}
                      onChange={(e) => onChange(`${field.id}-${rowIndex}-${colIndex}`, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <span className="form-field-error-message">{error}</span>}
    </div>
  );
};

// Annotation Field Component
export const AnnotationField = ({ field, value, onChange, error }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      // Load existing annotation if available
      if (value) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = value;
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [value]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();
    onChange(field.id, dataURL);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(field.id, null); // Clear the value
  };

  return (
    <div className="form-field-component form-field-annotation">
      <Label htmlFor={field.id}>
        <FileText className="w-4 h-4 mr-2" />
        {field.label}
        {field.required && <span className="form-field-required">*</span>}
      </Label>
      <div className="border-2 border-dashed border-gray-300 p-4 text-center">
        <p className="text-sm text-gray-500 mb-2">Draw or annotate</p>
        <canvas
          ref={canvasRef}
          id={`annotation-${field.id}`}
          className="border border-gray-200 cursor-crosshair"
          width="400"
          height="200"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        <div className="mt-2">
          <Button onClick={clearCanvas} size="sm" variant="outline">Clear Annotation</Button>
        </div>
      </div>
      {error && <span className="form-field-error-message">{error}</span>}
    </div>
  );
};

// Columns Field Component
export const ColumnsField = ({ field, onChange, error }) => (
  <div className="form-field-component form-field-columns">
    <Label>
      <FileText className="w-4 h-4 mr-2" />
      {field.label}
      {field.required && <span className="form-field-required">*</span>}
    </Label>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Column 1</Label>
        <Input placeholder="Column 1 content" onChange={(e) => onChange(`${field.id}-col1`, e.target.value)} />
      </div>
      <div>
        <Label>Column 2</Label>
        <Input placeholder="Column 2 content" onChange={(e) => onChange(`${field.id}-col2`, e.target.value)} />
      </div>
    </div>
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Panel Field Component
export const PanelField = ({ field, onChange, error }) => (
  <div className="form-field-component form-field-panel">
    <Card className="border border-gray-200 p-4">
      <h4 className="font-medium mb-2">{field.label}</h4>
      <Textarea placeholder="Panel content" rows={3} onChange={(e) => onChange(field.id, e.target.value)} />
    </Card>
    {error && <span className="form-field-error-message">{error}</span>}
  </div>
);

// Tabs Field Component
export const TabsField = ({ field, value, onChange, error }) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = field.options || ['Tab 1', 'Tab 2'];
  const tabValues = value || {};

  const handleTabChange = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  const handleContentChange = (content) => {
    const newValues = { ...tabValues, [activeTab]: content };
    onChange(field.id, newValues);
  };

  return (
    <div className="form-field-component form-field-tabs">
      <Label>
        <FileText className="w-4 h-4 mr-2" />
        {field.label}
        {field.required && <span className="form-field-required">*</span>}
      </Label>
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="flex bg-gray-50">
          {tabs.map((tabName, index) => (
            <button
              key={index}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === index
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange(index)}
            >
              {tabName}
            </button>
          ))}
        </div>
        <div className="p-4 bg-white">
          <Textarea
            placeholder={`Content for ${tabs[activeTab]}`}
            rows={4}
            value={tabValues[activeTab] || ''}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full resize-none"
          />
        </div>
      </div>
      {error && <span className="form-field-error-message">{error}</span>}
    </div>
  );
};
