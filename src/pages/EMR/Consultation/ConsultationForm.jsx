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
      if (!formData[field]?.trim()) newErrors[field] = 'This field is required';
    });

    if (!signature.trim()) newErrors.signature = 'Signature is required';

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
    <div className='confrmwrp'>
      <button onClick={goToHistory} className="btn-primary">View History</button>
      <div className="invflex">
        <div className="leftsect">
          <button onClick={handleBack} className="bckbtn tooltip" data-tooltip="Back" data-tooltip-pos="down" >
            <img src={`${import.meta.env.BASE_URL}images/homeicon.svg`} width="18" height="18" alt="Home" />
          </button>
        </div>
      </div>
      <h1 className='page-title'>Consultation Form</h1>
      <Field label="Appointment Date" type="date" name="appointmentDate" value={formData.appointmentDate} onChange={handleInputChange} error={errors.appointmentDate} />
      <CheckboxGroup label="Changes in Health" name="changesInHealth" value={formData.changesInHealth} setValue={(val) => setFormData(prev => ({ ...prev, changesInHealth: val }))} />
      <CheckboxGroup label="Changes in Meds" name="changesInMeds" value={formData.changesInMeds} setValue={(val) => setFormData(prev => ({ ...prev, changesInMeds: val }))} />
      {['chiefComplaint', 'diagnosis', 'treatmentPlan', 'subjectiveNotes', 'objectiveNotes', 'assessmentNotes', 'planningNotes'].map((field, idx) => (
        <Field key={idx} label={capitalize(field)} name={field} value={formData[field]} onChange={handleInputChange} error={errors[field]} required={['chiefComplaint', 'diagnosis', 'treatmentPlan'].includes(field)} />
      ))}
      <h2 className='cnfrmcellwrp'>Photos Upload</h2>
      <FileUploader onFilesSelected={setFiles} />
      {files.length > 0 && (
        <ul style={{ marginTop: '1rem' }}>
          {files.map((file, index) => <li key={index}>📄 {file.name || file.fileName}</li>)}
        </ul>
      )}
      <FaceMapper ref={faceMapperRef}  onDrawingComplete={({ lines, points }) => setFaceZones([...points, ...lines])} />
      <Field label="Provider Name" name="providerName" value={formData.providerName} onChange={handleInputChange} />
      <div className='cnfrmcellwrp'>
        <SignaturePad ref={signatureRef} onSave={setSignature} />
        {errors.signature && <p className="error-text">{errors.signature}</p>}
      </div>
      <Field label="Signature Date" type="date" name="signatureDate" value={formData.signatureDate} onChange={handleInputChange} />
      <button onClick={handleSubmit} className="btn-submit pribtn" disabled={!isValidForm}>Submit Consultation</button>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

const Field = ({ label, name, value, onChange, type = "text", required = false, error }) => (
  <div className='cnfrmcellwrp'>
    <label><strong>{label}{required && <span style={{ color: 'red' }}> *</span>}</strong></label>
    <input type={type} name={name} value={value} onChange={onChange} className={error ? "input-error" : ""} />
    {error && <p className="error-text">{error}</p>}
  </div>
);

const CheckboxGroup = ({ label, value, setValue }) => (
  <div className='cnfrmcellwrp'>
    <label><strong>{label}</strong></label>
    <div style={{ display: 'flex', gap: '1rem' }}>
      <label><input type="radio" checked={value === true} onChange={() => setValue(true)} /> Yes</label>
      <label><input type="radio" checked={value === false} onChange={() => setValue(false)} /> No</label>
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
