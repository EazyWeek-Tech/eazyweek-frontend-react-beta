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

    <>
    <style>
          {`
            .gcfform.medical-form {
  margin: 0 auto;
  padding: 0;
  font-family: 'Arial', sans-serif;
  background: #fff;
  color: #333;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.gcfform .cnfrmcellwrp .radio-option{display: flex; gap: 10px; align-items: center;}

.gcfform .form-header {
  flex-shrink: 0;
  background: #fff;
  padding: 1rem 0;
  
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-content: space-between;
  position: relative;
  z-index: 10;
}

.gcfform fieldset{margin: 0 0 20px;}

.gcfform fieldset textarea, .gcfform fieldset input[type='text'], .gcfform fieldset input[type='date'], .gcfform fieldset  select{padding: 6px 10px; border-radius: 7px;border: 1px solid #ccc;}

.checkbox-group{display: flex; flex-direction: column; gap: 10px; font-size: 14px;}

.gcfform fieldset label{display: flex; gap: 5px; align-items: center;}

.gcfform .logo {
  max-width: 120px;
  margin: 0 auto;
}

.gcfform .page-title {
  font-size: 1.8rem;
  font-weight: bold;
  color: #2b4c7e;
  margin: 0 !important;
}

.gcfform .subtitle {
  font-size: 0.95rem;
  color: #555;
  margin: 0;
  line-height: 1.5;
  padding: 0 1rem;
}

.gcfform .form-content {
  flex: 1;
  padding: 0 30px 30px 30px;
  position: relative;
  z-index: 1;
}

.gcfform .form h2,
.gcfform .form h3,
.gcfform .form legend {
  font-size: 1.2rem;
  font-weight: bold;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
  color: #2b4c7e;
  padding: 0 0 20px;
}

.gcfform .fieldset {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
  background: #f9f9f9;
}

.gcfform .label {
  display: block;
  margin: 0.5rem 0;
  font-size: 14px;
  line-height: 20px;
}

.gcfform .checkbox-group label input {
  margin: 0;
}

.gcfform .form h2, 
.gcfform .form h3, 
.gcfform .form legend {
  position: relative; 
  top: 9px; 
  font-size: 20px; 
  line-height: 24px;
}

.gcfform .input[type="text"],
.gcfform .input[type="date"],
.gcfform .input[type="number"],
.gcfform .select,
.gcfform .textarea {
  width: 100%;
  padding: 0.5rem;
  margin-top: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.gcfform .textarea {
  min-height: 80px;
  resize: vertical;
}

.gcfform .input[type="radio"],
.gcfform .input[type="checkbox"] {
  margin-right: 0.5rem;
}

.gcfform .tandc {
  margin: 10px 0;
  line-height: 180%;
}

.gcfform .signature-box {
  width: 100%;
  height: 150px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 0.5rem;
  position: relative;
}

.gcfform .signature-actions {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.gcfform .signature-actions button {
  padding: 0.3rem 0.8rem;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.gcfform .signature-actions button:hover {
  background-color: #c0392b;
}

.gcfform .button[type="submit"] {
  margin: 0 auto;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background-color: #2b4c7e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.gcfform .button[type="submit"]:hover {
  background-color: #1f375e;
}

@media (max-width: 600px) {
  .gcfform .medical-form {
    padding: 0;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .gcfform .form-header {
    padding: 0.5rem 15px;
    position: sticky;
    top: 0;
    z-index: 1000;
  }

  .gcfform .form-content {
    padding: 0 15px 15px 15px;
    max-height: calc(100vh - 150px);
  }

  .gcfform .page-title {
    font-size: 1.4rem;
    margin: 0.5rem 0;
  }

  .gcfform .subtitle {
    font-size: 0.85rem;
    padding: 0 0.5rem;
  }

  .gcfform .logo {
    max-width: 100px;
  }
}

.gcfform .form-section {
 max-width: 70%;
 margin: 0 auto 20px;
}
.cnfrmcellwrp textarea{width: 70%; font-family:'Arial'; padding: 6px 10px;}
.gcfform .form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.gcfform .gform-group {
  flex: 1 1 45%;
  display: flex;
  flex-direction: column;
}

.gcfform .gform-group.full-width {
  flex: 1 1 100%;
}

.gcfform .gform-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  display: inline;
}

.gcfform .gform-group input,
.gcfform .gform-group textarea {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  display: inline;
  width: auto;
}

.gcfform .radio-group {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.gcfform .gst-form-grid {
  max-width: 70%;
  width: 100%;
  margin: 0 auto;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gcfform .section {
  margin-bottom: 2rem;
}

.gcfform .h2 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #1f3c88;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.25rem;
}

.gcfform .form-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.gcfform .form-row label {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: 0.95rem;
}

.gcfform .form-row input,
.gcfform .form-row textarea,
.gcfform .form-row select {
  padding: 0.5rem;
  font-size: 0.95rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

.gcfform .signature-container {
  border: 1px solid #ccc;
  width: 100%;
  height: 120px;
  margin-top: 0.5rem;
}

.gcfform .signature-pad {
  width: 100%;
  height: 100px;
}

.gcfform .button {
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  background-color: #1f3c88;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.gcfform .button:hover {
  background-color: #3952a3;
}

.gcfform .confrmwrp {
  max-width: 800px; 
  margin: 0 auto;
  padding: 30px;
}

.gcfform .cnfrmcellwrp {
  margin: 0 0 20px;
  font-size: 14px; 
}

.gcfform .cnfrmcellwrp label {
  margin: 0 0 10px;
  display: block;
  font-weight: bold;
}

.gcfform .cnfrmcellwrp input[type='checkbox'] {
  display: inline-block;
  margin: 0 7px 0 0;
}

@media (max-width: 600px) {
  .gcfform .medical-form {
    padding: 0;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
  }
  
  .gcfform .form-header {
    padding: 0.5rem 15px;
    position: sticky;
    top: 0;
    z-index: 1000;
  }
  
  .gcfform .form-content {
    padding: 0 15px 15px 15px;
    max-height: calc(100vh - 150px);
  }
  
  .gcfform .page-title {
    font-size: 1.4rem;
    margin: 0.5rem 0;
  }
  
  .gcfform .subtitle {
    font-size: 0.85rem;
    padding: 0 0.5rem;
  }
  
  .gcfform .logo {
    max-width: 100px;
  }
}

.gcfform .section-title {
  font-size: 1.3rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #d0d0d0;
}

.gcfsbmit{ background: #334B71;
  padding: 10px 14px;
  font-family: Inter;
  font-weight: 600;
  font-size: 15px;
  line-height: 20px;
  letter-spacing: 0%;
  border: none;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  max-width: 100px;
  margin: 0 auto;
  }


          `}
        </style>
        <div className="gcfform medical-form">
      {/* Header Section */}
      <div className="form-header sticky-header">
        {showViewHistory && <button onClick={goToHistory} className="btn-primary" style={{ position: 'absolute', left: '15px' }}>View History</button>}
         <button
    type="button"
    onClick={handleBack}
    className="bckbtn"
    style={{
      position: 'absolute',
      left: 16,
      top: 16,
      background: '#334B71',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      padding: '8px 12px',
      fontWeight: 600,
      cursor: 'pointer'
    }}
  >
    ← Back
  </button>
        
        <h1 className='page-title' style={{ textAlign: 'center', margin: 0 }}>Treatment Form</h1>
        
      </div>

      {/* Scrollable Content */}
      <div className="gcfform form-content">

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
    </>
    
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