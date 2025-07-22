import React, { useState } from 'react';
import FaceMapper from './FaceMapper';
import SignaturePad from './SignaturePad';
import FileUploader from './FileUploader';

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
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const requiredFields = ['appointmentDate', 'chiefComplaint', 'diagnosis', 'treatmentPlan'];
    const newErrors = {};

    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });

    if (!signature || signature.trim() === '') {
      newErrors.signature = 'Signature is required';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
        const firstErrorField = Object.keys(newErrors)[0];
        const el = document.getElementById(firstErrorField);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
      console.log("Submit button was clicked");
      const cleanedZones = faceZones.map(zone => ({
        ...zone,
        note: zone.note ?? ''
      }));
      const processedFiles = files.map(file => {
         const base64Raw = (file.base64Data || file.base64 || '').split(',').pop();
         return {
           fileName: file.name || file.fileName,
           fileType: file.type || file.fileType,
           base64Data: base64Raw
         };
       });
   if (!validateForm()) {
       console.warn("Form validation failed");
       return; // prevent submission if invalid
     }
    const payload = {
      ...formData,
        chiefComplaint: formData.chiefComplaint || '',
        diagnosis: formData.diagnosis || '',
        treatmentPlan: formData.treatmentPlan || '',
        subjectiveNotes: formData.subjectiveNotes || '',
        objectiveNotes: formData.objectiveNotes || '',
        assessmentNotes: formData.assessmentNotes || '',
        planningNotes: formData.planningNotes || '',
        providerName: formData.providerName || '',
        signature: signature || '',
        signatureDate: formData.signatureDate || new Date().toISOString().substring(0, 10),
        faceZones: cleanedZones,
        files: processedFiles
    };

    console.log("Payload being sent to backend:", JSON.stringify({ formDto: payload }, null, 2));
    console.log("Files:", processedFiles);

    try {
      const res = await fetch('https://localhost:7259/api/consultation/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Consultation saved!');
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
              setFaceZones([]);
      } else {
          const err = await res.json().catch(() => ({ message: "Unknown error" }));
          console.error("Backend error:", err);
          alert('Error: ' + err.message);
      }
    } catch (error) {
      console.error("Error in fetch:", error);
        alert('Network or server error: ' + error.message);
    }
  };

  return (
    <div style={{
      maxWidth: '900px',
      marginLeft: '2rem',
      padding: '0',
      textAlign: 'left'
    }}>
      <h1>Consultation Form</h1>

      <label style={{ display: 'block', marginBottom: '0.25rem' }}><strong>Appointment Date</strong></label>
      <input
        type="date"
        name="appointmentDate"
        onChange={handleInputChange}
        style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
      />

      <div style={{ marginBottom: '1rem' }}>
        <label><strong>Changes in Health</strong></label>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={formData.changesInHealth === true}
              onChange={() => setFormData(prev => ({ ...prev, changesInHealth: true }))}
            />
            Yes
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={formData.changesInHealth === false}
              onChange={() => setFormData(prev => ({ ...prev, changesInHealth: false }))}
            />
            No
          </label>
        </div>
      </div>

      {/* Changes in Meds */}
      <div style={{ marginBottom: '1rem' }}>
        <label><strong>Changes in Meds</strong></label>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={formData.changesInMeds === true}
              onChange={() => setFormData(prev => ({ ...prev, changesInMeds: true }))}
            />
            Yes
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={formData.changesInMeds === false}
              onChange={() => setFormData(prev => ({ ...prev, changesInMeds: false }))}
            />
            No
          </label>
        </div>
      </div>

      {[
        { id: 'chiefComplaint', label: 'Chief Complaint', required: true },
        { id: 'diagnosis', label: 'Diagnosis', required: true },
        { id: 'treatmentPlan', label: 'Treatment Plan', required: true },
        { id: 'subjectiveNotes', label: 'Subjective Notes', required: false },
        { id: 'objectiveNotes', label: 'Objective Notes', required: false },
        { id: 'assessmentNotes', label: 'Assessment Notes', required: false },
        { id: 'planningNotes', label: 'Planning Notes', required: false }
      ].map(field => (
        <div key={field.id}>
          <label htmlFor={field.id} style={{ display: 'block', marginBottom: '0.25rem' }}>
            <strong>
              {field.label}
              {field.required && <span style={{ color: 'red' }}> *</span>}
            </strong>
          </label>
          <input
                id={field.id}
                name={field.id}
                type="text"
                required={field.required}
                value={formData[field.id]}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  marginBottom: errors[field.id] ? '0.25rem' : '1rem',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: errors[field.id] ? '2px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: errors[field.id] ? '#fff8f8' : 'white'
                }}
              />
              {errors[field.id] && (
                <div style={{ color: 'red', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {errors[field.id]}
                </div>
              )}
            </div>
      ))}

    <h2 style={{ marginTop: '2rem' }}>Photos Upload</h2>
    <FileUploader onFilesSelected={setFiles} />
    {files.length > 0 && (
      <div style={{ marginTop: '1rem' }}>
        <strong>Uploaded Files:</strong>
        <ul style={{ paddingLeft: '1rem', fontSize: '0.95rem' }}>
          {files.map((file, index) => (
            <li key={index}>
              📄 {file.name || file.fileName} ({Math.round((file.size || 0) / 1024)} KB)
            </li>
          ))}
        </ul>
      </div>
    )}

    <FaceMapper
      onDrawingComplete={({ lines, points }) => {
        const zones = [
          ...points.map(p => ({
            type: 'point',
            label: p.label,
            coordinates: [Math.round(Number(p.x)), Math.round(Number(p.y))],
            note: ''
          })),
          ...lines.map(l => ({
            type: l.tool,
            label: l.label || '',
            coordinates: l.points.flat().map(n => Math.round(Number(n))),
            note: ''
          }))
        ];
        setFaceZones(zones);
      }}
    />

    <label style={{ display: 'block', marginBottom: '0.25rem' }}><strong>Provider Name</strong></label>
        <input
            type="text"
            name="providerName"
            onChange={handleInputChange}
            style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
        />

      <SignaturePad onSave={setSignature} />
      {errors.signature && (
        <div style={{ color: 'red', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {errors.signature}
        </div>
      )}

      <label style={{ display: 'block', marginBottom: '0.25rem' }}><strong>Signature Date</strong></label>
            <input
              type="date"
              name="signatureDate"
              onChange={handleInputChange}
              style={{ width: '100%', marginBottom: '1.5rem', padding: '0.5rem' }}
      />

      <div style={{ marginTop: '1.5rem' }}>
        <button
          onClick={handleSubmit}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Submit Consultation
        </button>
      </div>
    </div>
  );
}

export default ConsultationForm;
