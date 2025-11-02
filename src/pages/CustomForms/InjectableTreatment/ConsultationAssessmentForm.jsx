import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useReactToPrint } from 'react-to-print';
import './ConsultationAssessmentForm.css';

const ConsultationAssessmentForm = () => {
  const [formData, setFormData] = useState({
    dateOfAppointment: '',
    changesInMeds: '',
    changesInHealth: '',
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    subjectiveNotes: '',
    objectiveNotes: '',
    assessmentNotes: '',
    planningNotes: '',
    beforePhotos: [],
    afterPhotos: [],
    providerName: '',
    providerSignature: null,
    signatureDate: '',
  });

  const [errors, setErrors] = useState({});
  const sigCanvas = useRef(null);
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

  const handleRadioChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
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

  const clearSignature = () => {
    sigCanvas.current.clear();
    setFormData(prev => ({ ...prev, providerSignature: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.dateOfAppointment) newErrors.dateOfAppointment = 'Date of appointment is required';
    if (!formData.changesInMeds) newErrors.changesInMeds = 'Changes in meds is required';
    if (!formData.changesInHealth) newErrors.changesInHealth = 'Changes in health is required';
    if (!formData.providerName.trim()) newErrors.providerName = 'Provider name is required';
    if (!formData.providerSignature) newErrors.providerSignature = 'Provider signature is required';
    if (!formData.signatureDate) newErrors.signatureDate = 'Signature date is required';
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
    <div className="form-container-1">
      <div ref={formRef} className="forms">
        <h1>Consultation Assessment Form</h1>

        <div className="form-group">
          <label>Date of appointment:</label>
          <input
            type="date"
            name="dateOfAppointment"
            value={formData.dateOfAppointment}
            onChange={handleInputChange}
          />
          {errors.dateOfAppointment && <span className="error-message">{errors.dateOfAppointment}</span>}
        </div>

        <div className="form-section">
          <label className="section-label">Changes in meds:</label>
          <div className="radio-row">
            <label className="radio-label">
              <input
                type="radio"
                name="changesInMeds"
                value="Yes"
                checked={formData.changesInMeds === 'Yes'}
                onChange={(e) => handleRadioChange('changesInMeds', e.target.value)}
              />
              <span>Yes</span>
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="changesInMeds"
                value="No"
                checked={formData.changesInMeds === 'No'}
                onChange={(e) => handleRadioChange('changesInMeds', e.target.value)}
              />
              <span>No</span>
            </label>
          </div>
          {errors.changesInMeds && (
            <span className="error-message">{errors.changesInMeds}</span>
          )}
        </div>

        <div className="form-section">
          <label className="section-label">Changes in health:</label>
          <div className="radio-row">
            <label className="radio-label">
              <input
                type="radio"
                name="changesInHealth"
                value="Yes"
                checked={formData.changesInHealth === 'Yes'}
                onChange={(e) => handleRadioChange('changesInHealth', e.target.value)}
              />
              <span>Yes</span>
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="changesInHealth"
                value="No"
                checked={formData.changesInHealth === 'No'}
                onChange={(e) => handleRadioChange('changesInHealth', e.target.value)}
              />
              <span>No</span>
            </label>
          </div>
          {errors.changesInHealth && (
            <span className="error-message">{errors.changesInHealth}</span>
          )}
        </div>

        <div className="form-group">
          <label>Chief Complaint:</label>
          <input
            name="chiefComplaint"
            value={formData.chiefComplaint}
            onChange={handleInputChange}
            
          ></input>
        </div>

        <div className="form-group">
          <label>Diagnosis:</label>
          <input
            name="diagnosis"
            value={formData.diagnosis}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="form-group">
          <label>Treatment Plan:</label>
          <input
            name="treatmentPlan"
            value={formData.treatmentPlan}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="form-group">
          <label>Subjective Notes:</label>
          <input
            name="subjectiveNotes"
            value={formData.subjectiveNotes}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="form-group">
          <label>Objective Notes:</label>
          <input
            name="objectiveNotes"
            value={formData.objectiveNotes}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="form-group">
          <label>Assessment Notes:</label>
          <input
            name="assessmentNotes"
            value={formData.assessmentNotes}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="form-group">
          <label>Planning Notes:</label>
          <input
            name="planningNotes"
            value={formData.planningNotes}
            onChange={handleInputChange}
          ></input>
        </div>


        <div className="photo-upload-container">
  <h2 className="title">PHOTOS UPLOADS</h2>

  {/* BEFORE Section */}
  <div className="photo-upload-section">
    <h3 className="label">BEFORE</h3>

    <div className="upload-box">
      <div className="upload-icon">☁️</div>
      <p>
        Drop files to attach, or{' '}
        <span
          className="browse"
          onClick={() => document.getElementById('beforeUpload').click()}
        >
          browse
        </span>
      </p>
      <input
        id="beforeUpload"
        type="file"
        multiple
        accept=".jpg,.png,.jpeg,.pdf"
        onChange={(e) => handleFileChange(e, 'beforePhotos')}
        className="file-input"
      />
    </div>

    <p className="info-text">
      Upload a maximum of 10 files at a time. Each file cannot exceed 10MB. If
      the form has more than a total of 20 files, the form may be slow to load.
    </p>

    {formData.beforePhotos.length > 0 && (
      <div className="file-list">
        <ul>
          {formData.beforePhotos.map((file, index) => (
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      </div>
    )}
  </div>

  {/* AFTER Section */}
  <div className="photo-upload-section">
    <h3 className="label">AFTER</h3>

    <div className="upload-box">
      <div className="upload-icon">☁️</div>
      <p>
        Drop files to attach, or{' '}
        <span
          className="browse"
          onClick={() => document.getElementById('afterUpload').click()}
        >
          browse
        </span>
      </p>
      <input
        id="afterUpload"
        type="file"
        multiple
        accept=".jpg,.png,.jpeg,.pdf"
        onChange={(e) => handleFileChange(e, 'afterPhotos')}
        className="file-input"
      />
    </div>

    <p className="info-text">
      Upload a maximum of 10 files at a time. Each file cannot exceed 10MB. If
      the form has more than a total of 20 files, the form may be slow to load.
    </p>

    {formData.afterPhotos.length > 0 && (
      <div className="file-list">
        <ul>
          {formData.afterPhotos.map((file, index) => (
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
</div>


        <div className="form-group">
          <label>Provider Name:</label>
          <input
            type="text"
            name="providerName"
            value={formData.providerName}
            onChange={handleInputChange}
            placeholder="Enter provider name"
          />
          {errors.providerName && <span className="error-message">{errors.providerName}</span>}
        </div>

        <div className="signature-section">
          <h2>Signature:</h2>
          <p>Sign above</p>
          <div className="signature-pad">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, providerSignature: sigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="clear-signature-btn" onClick={clearSignature}>
            Clear Signature
          </button>
          {errors.providerSignature && <span className="error-message">{errors.providerSignature}</span>}
        </div>

        <div className="form-group">
          <label>Signature Date:</label>
          <input
            type="date"
            name="signatureDate"
            value={formData.signatureDate}
            onChange={handleInputChange}
          />
          {errors.signatureDate && <span className="error-message">{errors.signatureDate}</span>}
        </div>

        <div className="button-group">
         
          <button type="submit" className="submit-btn" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationAssessmentForm;
