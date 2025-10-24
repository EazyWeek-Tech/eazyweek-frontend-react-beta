import React, { useRef, useState, useCallback, useEffect } from 'react';
import FaceMapper from '../Components/FaceMapper';
import SignaturePad from '../Components/SignaturePad';
import FileUploader from '../Components/FileUploader';
import './ConsultationForm.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from "../../../config";

function ConsultationForm() {
  const [formData, setFormData] = useState({
    appointmentDate: '',
    changesInMeds: false,
    changesInHealth: false,
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    subjectiveNotes: '',
    objectiveNotes: '',
    assessmentNotes: '',
    planningNotes: '',
    providerName: '',
    signatureDate: ''
  });

  const [signature, setSignature] = useState('');
  const [files, setFiles] = useState([]);
  const [faceZones, setFaceZones] = useState([]);
  const faceMapperRef = useRef();
  const signatureRef = useRef();
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [isValidForm, setIsValidForm] = useState(false);
  const [showViewHistory, setShowViewHistory] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const custId = searchParams.get('custid');
  const custName = searchParams.get('custname');
  const appointmentId = searchParams.get('appointmentid');

  const qp = new URLSearchParams({ custId, custName, appointmentId }).toString();


  const resetForm = useCallback(() => {
    setFormData({
      appointmentDate: '',
      changesInMeds: false,
      changesInHealth: false,
      chiefComplaint: '',
      diagnosis: '',
      treatmentPlan: '',
      subjectiveNotes: '',
      objectiveNotes: '',
      assessmentNotes: '',
      planningNotes: '',
      providerName: '',
      signatureDate: ''
    });
    setSignature('');
    setFiles([]);
    faceMapperRef.current?.reset();
    signatureRef.current?.clear();
    setErrors({});
  }, []);


  const handleBack = () => navigate(-1);


  const goToHistory = () => {
    if (!custId) return alert("No customer ID available.");
    navigate(`/consultation/history?custid=${custId}`);
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };


  const validateForm = useCallback(() => {
    const requiredFields = ['appointmentDate', 'chiefComplaint', 'diagnosis', 'treatmentPlan'];
    const newErrors = {};

    requiredFields.forEach((field) => {
      if (!formData[field]?.trim()) {
        newErrors[field] = 'This field is required';
      }
    });

    // Validate appointment date
    if (formData.appointmentDate) {
      const appointmentDate = new Date(formData.appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        newErrors.appointmentDate = 'Appointment date cannot be in the past';
      }
    }

    // Validate signature
    if (!signature.trim()) {
      newErrors.signature = 'Signature is required';
    }

    // Validate provider name
    if (!formData.providerName?.trim()) {
      newErrors.providerName = 'Provider name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, signature]);


  useEffect(() => {
    setIsValidForm(validateForm());
  }, [formData, signature, validateForm]);

  /** Submit Form */
  const handleSubmit = async () => {
    console.log("Submit button was clicked");

    if (!validateForm()) return;

    const payload = {
      ...formData,
      signature: signature,
      signatureDate: formData.signatureDate || new Date().toISOString().substring(0, 10),
      faceZones: faceZones.map((zone) => {
                   if (zone.x !== undefined && zone.y !== undefined) {
                     return {
                       type: 'point',
                       label: zone.label || '',
                       coordinates: [zone.x, zone.y],
                       note: zone.note || null,
                     };
                   } else if (Array.isArray(zone.points)) {
                     return {
                       type: zone.tool || 'pen',
                       label: zone.label || '',
                       coordinates: zone.points,
                       note: zone.note || null,
                     };
                   } else {
                     return null;
                   }
                 }).filter(Boolean),
      files: files.map(file => ({
        fileName: file.name || file.fileName,
        fileType: file.type || file.fileType,
        base64Data: (file.base64Data || file.base64 || '').split(',').pop()
      }))
    };

    console.log("Payload being sent to backend:", JSON.stringify(payload, null, 2));

    try {
      const res = await fetch(`${API_BASE_URL}/api/consultation/submit?${qp}`, {
        method: 'POST',
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      console.log("API Response:", result);

      if (result?.success) {
        setToast({ message: result.message || "Consultation Form saved successfully!", type: "success" });
        resetForm();
        setShowViewHistory(true);
      } else {
        setToast({ message: result.message || "Save failed. Please try again.", type: "error" });
      }
    } catch (error) {
      console.error("Error:", error);
      setToast({ message: "Error while saving Consultation Form.", type: "error" });
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="medical-form">
      {/* Header Section */}
      <div className="form-header sticky-header">
        {showViewHistory && <button onClick={goToHistory} className="btn-primary" style={{ position: 'absolute', left: '15px' }}>View History</button>}
        <h1 className='page-title' style={{ textAlign: 'center', margin: 0 }}>Consultation Form</h1>
        <button onClick={handleBack} className="bckbtn tooltip" data-tooltip="Back" data-tooltip-pos="down" style={{ backgroundColor: 'blue', position: 'absolute', right: '15px' }}>
          <img src={`/images/homeicon.svg`} width="18" height="18" alt="Back" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="form-content">

      {/* Basic Information Section */}
      <div className="form-section">
        <h3 className="section-title">Basic Information</h3>
        <Field 
          label="Appointment Date" 
          type="date" 
          name="appointmentDate" 
          value={formData.appointmentDate} 
          onChange={handleInputChange} 
          error={errors.appointmentDate} 
          required={true}
        />
        <CheckboxGroup 
          label="Changes in Health" 
          name="changesInHealth" 
          value={formData.changesInHealth} 
          setValue={(val) => setFormData(prev => ({ ...prev, changesInHealth: val }))} 
        />
        <CheckboxGroup 
          label="Changes in Meds" 
          name="changesInMeds" 
          value={formData.changesInMeds} 
          setValue={(val) => setFormData(prev => ({ ...prev, changesInMeds: val }))} 
        />
      </div>

      {/* Medical Notes Section */}
      <div className="form-section">
        <h3 className="section-title">Medical Notes</h3>
        {['chiefComplaint', 'diagnosis', 'treatmentPlan'].map((field, idx) => (
          <Field 
            key={idx} 
            label={capitalize(field)} 
            name={field} 
            value={formData[field]} 
            onChange={handleInputChange} 
            error={errors[field]} 
            required={true}
            type="textarea"
          />
        ))}
      </div>

      {/* SOAP Notes Section */}
      <div className="form-section">
        <h3 className="section-title">SOAP Notes</h3>
        {['subjectiveNotes', 'objectiveNotes', 'assessmentNotes', 'planningNotes'].map((field, idx) => (
          <Field 
            key={idx} 
            label={capitalize(field)} 
            name={field} 
            value={formData[field]} 
            onChange={handleInputChange} 
            error={errors[field]} 
            type="textarea"
          />
        ))}
      </div>

      {/* Media Section */}
      <div className="form-section">
        <h3 className="section-title">Photos & Face Mapping</h3>
        <div className="media-upload">
          <h3 className="subsection-title">Photos Upload</h3>
          <FileUploader onFilesSelected={setFiles} />
          {files.length > 0 && (
            <div className="file-list">
              <h4>Uploaded Files:</h4>
              <ul>
                {files.map((file, index) => (
                  <li key={index}>
                    📄 {file.name || file.fileName}
                    <button 
                      type="button" 
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      className="remove-file-btn"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="face-mapping">
          <h3 className="subsection-title">Face Mapping</h3>
          <FaceMapper 
            ref={faceMapperRef}  
            onDrawingComplete={({ lines, points }) => setFaceZones([...points, ...lines])} 
          />
        </div>
      </div>

      {/* Provider Information Section */}
      <div className="form-section">
        <h3 className="section-title">Provider Information</h3>
        <Field 
          label="Provider Name" 
          name="providerName" 
          value={formData.providerName} 
          onChange={handleInputChange} 
          error={errors.providerName}
          required={true}
        />
        <Field 
          label="Signature Date" 
          type="date" 
          name="signatureDate" 
          value={formData.signatureDate} 
          onChange={handleInputChange} 
        />
      </div>

      {/* Signature Section */}
      <div className="form-section">
        <h3 className="section-title">Digital Signature</h3>
        <div className='cnfrmcellwrp'>
          <label><strong>Provider Signature *</strong></label>
          <SignaturePad ref={signatureRef} onSave={setSignature} />
          {errors.signature && <p className="error-text show">{errors.signature}</p>}
        </div>
      </div>

      {/* Submit Section */}
      <div className="form-section submit-section">
        <button
          onClick={handleSubmit}
          className="btn-submit pribtn"
          disabled={!isValidForm}
        >
          {isValidForm ? 'Submit Consultation' : 'Please fill required fields'}
        </button>
        {!isValidForm && (
          <p className="validation-message">
            Please complete all required fields and provide a signature to submit.
          </p>
        )}
      </div>



      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      </div>
    </div>
  );
}

const Field = ({ label, name, value, onChange, type = "text", required = false, error }) => (
  <div className='cnfrmcellwrp'>
    <label><strong>{label}{required && <span className="required-asterisk"> *</span>}</strong></label>
    {type === "textarea" ? (
      <textarea 
        name={name} 
        value={value} 
        onChange={onChange} 
        className={error ? "input-error" : ""}
        rows={4}
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    ) : (
      <input 
        type={type} 
        name={name} 
        value={value} 
        onChange={onChange} 
        className={error ? "input-error" : ""}
        placeholder={type === "date" ? "" : `Enter ${label.toLowerCase()}...`}
      />
    )}
    {error && <p className="error-text show">{error}</p>}
  </div>
);

const CheckboxGroup = ({ label, value, setValue }) => (
  <div className='cnfrmcellwrp'>
    <label><strong>{label}</strong></label>
    <div className="checkbox-group">
      <label className="radio-option">
        <input 
          type="radio" 
          name={label.replace(/\s+/g, '')} 
          checked={value === true} 
          onChange={() => setValue(true)} 
        />
        <span>Yes</span>
      </label>
      <label className="radio-option">
        <input 
          type="radio" 
          name={label.replace(/\s+/g, '')} 
          checked={value === false} 
          onChange={() => setValue(false)} 
        />
        <span>No</span>
      </label>
    </div>
  </div>
);

const Toast = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: type === 'success' ? '#4caf50' : '#f44336',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '5px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
        fontSize: '16px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          color: 'white',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
};


const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export default ConsultationForm;