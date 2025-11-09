import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './LaserHairReductionTreatmentForm.css';

const LaserSessionForm = () => {
    const [formData, setFormData] = useState({
    chiefComplaint: '',
    diagnosis: 'Excessive Hair Growth on the Skin',
    treatmentPlan: 'Laser Hair Reduction',
    patient: '',
    dob: '',
    skinType: '',
    sex: '',
    notes: '',
    providerSignature: null,
    medicalDirectorSignature: null,
    providerName: '',
    providerDate: '',
    medicalDirectorName: '',
    medicalDirectorDate: '',
    beforePhotos: [],
    afterPhotos: [],
    treatmentSessions: [
      {
        serviceDate: '',
        treatmentProvider: '',
        treatmentArea: '',
        opticalFluence: '',
        pulseType: '',
        cooling: '',
        repeatMode: '',
        skinResponse: '',
        notes: '',
      },
    ],
  });

  const [errors, setErrors] = useState({});
  const providerSigCanvas = useRef(null);
  const medicalDirectorSigCanvas = useRef(null);
  const formRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSessionChange = (index, field, value) => {
    const updatedSessions = [...formData.treatmentSessions];
    updatedSessions[index][field] = value;
    setFormData(prev => ({
      ...prev,
      treatmentSessions: updatedSessions
    }));
  };

  const addTreatmentSession = () => {
    setFormData(prev => ({
      ...prev,
      treatmentSessions: [
        ...prev.treatmentSessions,
        {
          serviceDate: '',
          treatmentProvider: '',
          treatmentArea: '',
          opticalFluence: '',
          pulseType: '',
          cooling: '',
          repeatMode: '',
          skinResponse: '',
          notes: '',
        },
      ],
    }));
  };

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      alert('You can upload a maximum of 10 files at a time.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      [type]: files
    }));
  };

  const clearProviderSignature = () => {
    providerSigCanvas.current.clear();
    setFormData(prev => ({ ...prev, providerSignature: null }));
  };

  const clearMedicalDirectorSignature = () => {
    medicalDirectorSigCanvas.current.clear();
    setFormData(prev => ({ ...prev, medicalDirectorSignature: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.patient.trim()) newErrors.patient = 'Patient name is required';
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (!formData.skinType) newErrors.skinType = 'Skin type is required';
    if (!formData.sex) newErrors.sex = 'Sex is required';
    if (!formData.providerSignature) newErrors.providerSignature = 'Provider signature is required';
    if (!formData.medicalDirectorSignature) newErrors.medicalDirectorSignature = 'Medical director signature is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      alert('Form submitted successfully');
      console.log('Form submitted:', formData);
    }
  };

  return (
    <div className="LHRTF-form-container-1">
      <div ref={formRef} className="LHRTF-forms">
        <h1>LASER HAIR REDUCTION</h1>
        <h1>TREATMENT FORM</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div className="LHRTF-form-group">
            <label>Patient name:</label>
            <input
              type="text"
              name="patient"
              value={formData.patient}
              onChange={handleInputChange}
              placeholder="Enter patient name"
            />
            {errors.patient && <span className="LHRTF-error-message">{errors.patient}</span>}
          </div>
          <div className="form-group">
            <label>Patient name:</label>
            <input
              type="text"
              name="patient"
              value={formData.patient}
              onChange={handleInputChange}
              placeholder="Enter patient name"
            />
            {errors.patient && <span className="error-message">{errors.patient}</span>}
          </div>
          <div className="LHRTF-form-group">
            <label>DOB:</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
            />
            {errors.dob && <span className="LHRTF-error-message">{errors.dob}</span>}
          </div>
          <div className="LHRTF-form-group">
            <label>Skin Type:</label>
            <select
              name="skinType"
              value={formData.skinType}
              onChange={handleInputChange}
            >
              <option value="">Select skin type</option>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
              <option value="V">V</option>
              <option value="VI">VI</option>
            </select>
            {errors.skinType && <span className="LHRTF-error-message">{errors.skinType}</span>}
          </div>
          <div className="LHRTF-form-group">
            <label>Sex:</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleInputChange}
            >
              <option value="">Select sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.sex && <span className="LHRTF-error-message">{errors.sex}</span>}
          </div>
        </div>

        <div className="LHRTF-form-group">
          <label>Chief Complaint:</label>
          <input
            type="text"
            name="chiefComplaint"
            value={formData.chiefComplaint}
            onChange={handleInputChange}
            placeholder="Enter chief complaint"
          />
        </div>

        <div className="LHRTF-form-group">
          <label>Diagnosis:</label>
          <input
            type="text"
            name="diagnosis"
            value={formData.diagnosis}
            onChange={handleInputChange}

          />
        </div>

        <div className="LHRTF-form-group">
          <label>Treatment Plan:</label>
          <input
            type="text"
            name="treatmentPlan"
            value={formData.treatmentPlan}
            onChange={handleInputChange}

          />
        </div>

        <table className="LHRTF-treatment-table">
          <thead>
            <tr>
              <th>Service Date</th>
              <th>Treatment Provider</th>
              <th>Treatment Area</th>
              <th>Optical Fluence</th>
              <th>Pulse Type</th>
              <th>Cooling</th>
              <th>Repeat Mode</th>
              <th>Skin Response</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {formData.treatmentSessions.map((session, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="date"
                    value={session.serviceDate}
                    onChange={(e) => handleSessionChange(index, 'serviceDate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={session.treatmentProvider}
                    onChange={(e) => handleSessionChange(index, 'treatmentProvider', e.target.value)}
                    placeholder="Provider"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={session.treatmentArea}
                    onChange={(e) => handleSessionChange(index, 'treatmentArea', e.target.value)}
                    placeholder="Area"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={session.opticalFluence}
                    onChange={(e) => handleSessionChange(index, 'opticalFluence', e.target.value)}
                    placeholder="Fluence"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={session.pulseType}
                    onChange={(e) => handleSessionChange(index, 'pulseType', e.target.value)}
                    placeholder="Type"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={session.cooling}
                    onChange={(e) => handleSessionChange(index, 'cooling', e.target.value)}
                    placeholder="Cooling"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={session.repeatMode}
                    onChange={(e) => handleSessionChange(index, 'repeatMode', e.target.value)}
                    placeholder="Mode"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={session.skinResponse}
                    onChange={(e) => handleSessionChange(index, 'skinResponse', e.target.value)}
                    placeholder="Response"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={session.notes}
                    onChange={(e) => handleSessionChange(index, 'notes', e.target.value)}
                    placeholder="Notes"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" onClick={addTreatmentSession} style={{ marginBottom: '20px', padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Add Treatment Session
        </button>

        <div className="LHRTF-form-group">
          <label>NOTES:</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Notes"
          ></textarea>
        </div>
<div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div className="LHRTF-form-group" style={{ flex: 1 }}>
            <label>Provider Name : </label>
            <input
              type="text"
              name="providerName"
              value={formData.providerName}
              onChange={handleInputChange}
              placeholder="Enter provider name"
            />
          </div>
          <div className="LHRTF-form-group" style={{ flex: 1 }}>
            <label>Signature Date:</label>
            <input
              type="date"
              name="providerDate"
              value={formData.providerDate}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div className="LHRTF-signature-section">
          <h2>Provider Signature:</h2>

          <div className="LHRTF-signature-pad">
            <SignatureCanvas
              ref={providerSigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'LHRTF-sigCanvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, providerSignature: providerSigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="LHRTF-clear-signature-btn" onClick={clearProviderSignature}>
            Clear Signature
          </button>
          {errors.providerSignature && <span className="LHRTF-error-message">{errors.providerSignature}</span>}
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div className="LHRTF-form-group" style={{ flex: 1 }}>
            <label>Medical Director Name </label>
            <input
              type="text"
              name="medicalDirectorName"
              value={formData.medicalDirectorName}
              onChange={handleInputChange}
              placeholder="Enter medical director name"
            />
          </div>
          <div className="LHRTF-form-group" style={{ flex: 1 }}>
            <label>Signature Date:</label>
            <input
              type="date"
              name="medicalDirectorDate"
              value={formData.medicalDirectorDate}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="LHRTF-signature-section">
          <h2>Medical Director Signature:</h2>
          <p>Sign above</p>
          <div className="LHRTF-signature-pad">
            <SignatureCanvas
              ref={medicalDirectorSigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'LHRTF-sigCanvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, medicalDirectorSignature: medicalDirectorSigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="LHRTF-clear-signature-btn" onClick={clearMedicalDirectorSignature}>
            Clear Signature
          </button>
          {errors.medicalDirectorSignature && <span className="LHRTF-error-message">{errors.medicalDirectorSignature}</span>}
        </div>

        

       <div className="LHRTF-photo-upload-container">
      <h2 className="LHRTF-title">PHOTOS UPLOADS</h2>

      {/* BEFORE UPLOAD */}
      <div className="LHRTF-photo-upload-section">
        <h3>BEFORE</h3>
        <p className="LHRTF-label">File Upload</p>

        <div className="LHRTF-upload-box">

          <span>
            Drop files to attach, or{' '}
            <label className="LHRTF-browse">
              browse
              <input
                type="file"
                multiple
                accept=".jpg,.png,.jpeg,.pdf"
                onChange={(e) => handleFileChange(e, 'beforePhotos')}
                className="LHRTF-file-input"
              />
            </label>
          </span>
        </div>

        <p className="LHRTF-info-text">
          Upload a maximum of 10 files at a time. Each file cannot exceed 10MB. If the form has more than a total of 20 files, the form may be slow to load.
        </p>

        {formData.beforePhotos.length > 0 && (
          <div className="LHRTF-file-list">
            <ul>
              {formData.beforePhotos.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* AFTER UPLOAD */}
      <div className="LHRTF-photo-upload-section">
        <h3>AFTER</h3>
        <p className="LHRTF-label">File Upload</p>

        <div className="LHRTF-upload-box">
          <span>
            Drop files to attach, or{' '}
            <label className="LHRTF-browse">
              browse
              <input
                type="file"
                multiple
                accept=".jpg,.png,.jpeg,.pdf"
                onChange={(e) => handleFileChange(e, 'afterPhotos')}
                className="LHRTF-file-input"
              />
            </label>
          </span>
        </div>

        <p className="LHRTF-info-text">
          Upload a maximum of 10 files at a time. Each file cannot exceed 10MB. If the form has more than a total of 20 files, the form may be slow to load.
        </p>

        {formData.afterPhotos.length > 0 && (
          <div className="LHRTF-file-list">
            <ul>
              {formData.afterPhotos.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>

        <div className="LHRTF-button-group">

          <button type="submit" className="LHRTF-submit-btn" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

export default LaserSessionForm ;






