import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
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
    faceMapper: null,
    providerName: '',
    providerSignature: null,
    signatureDate: '',
  });

  const [errors, setErrors] = useState({});
  const sigCanvas = useRef(null);
  const formRef = useRef(null);
  const faceCanvas = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [tool, setTool] = useState('pencil');
  const [startPos, setStartPos] = useState(null);
  const [rectangles, setRectangles] = useState([]);

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

  const startDrawing = (e) => {
    const canvas = faceCanvas.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setIsDrawing(true);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = faceCanvas.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'eraser') {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'pencil') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    const canvas = faceCanvas.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'line') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.stroke();
    } else if (tool === 'rectangle') {
      ctx.globalCompositeOperation = 'source-over';
      const width = x - startPos.x;
      const height = y - startPos.y;
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
      const newRect = {
        id: Date.now(),
        x: startPos.x,
        y: startPos.y,
        width,
        height,
        text: '',
      };
      setRectangles(prev => [...prev, newRect]);
    } else if (tool === 'circle') {
      ctx.globalCompositeOperation = 'source-over';
      const radius = Math.sqrt((x - startPos.x) ** 2 + (y - startPos.y) ** 2);
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.stroke();
    }

    setIsDrawing(false);
    setStartPos(null);
    setFormData(prev => ({ ...prev, faceMapper: canvas.toDataURL() }));
  };

  const clearFaceMapper = () => {
    const canvas = faceCanvas.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setRectangles([]);
    setFormData(prev => ({ ...prev, faceMapper: null }));
  };

  const updateRectangleText = (id, text) => {
    setRectangles(prev => prev.map(rect => rect.id === id ? { ...rect, text } : rect));
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
      const rectanglesData = rectangles.map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, text: rect.text }));
      const updatedFormData = { ...formData, rectangles: rectanglesData };
      alert('Form submitted successfully');
      console.log('Form submitted:', updatedFormData);
    }
  };

 

  return (
    <div className="CAF-form-container-1">
      <div ref={formRef} className="CAF-forms">
        <h1>Consultation Assessment Form</h1>

        <div className="CAF-form-group">
          <label>Date of appointment:</label>
          <input
            type="date"
            name="dateOfAppointment"
            value={formData.dateOfAppointment}
            onChange={handleInputChange}
          />
          {errors.dateOfAppointment && <span className="CAF-error-message">{errors.dateOfAppointment}</span>}
        </div>

        <div className="CAF-form-section">
          <label className="CAF-section-label">Changes in meds:</label>
          <div className="CAF-radio-row">
            <label className="CAF-radio-label">
              <input
                type="radio"
                name="changesInMeds"
                value="Yes"
                checked={formData.changesInMeds === 'Yes'}
                onChange={(e) => handleRadioChange('changesInMeds', e.target.value)}
              />
              <span>Yes</span>
            </label>

            <label className="CAF-radio-label">
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
            <span className="CAF-error-message">{errors.changesInMeds}</span>
          )}
        </div>

        <div className="CAF-form-section">
          <label className="CAF-section-label">Changes in health:</label>
          <div className="CAF-radio-row">
            <label className="CAF-radio-label">
              <input
                type="radio"
                name="changesInHealth"
                value="Yes"
                checked={formData.changesInHealth === 'Yes'}
                onChange={(e) => handleRadioChange('changesInHealth', e.target.value)}
              />
              <span>Yes</span>
            </label>

            <label className="CAF-radio-label">
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
            <span className="CAF-error-message">{errors.changesInHealth}</span>
          )}
        </div>

        <div className="CAF-form-group">
          <label>Chief Complaint:</label>
          <input
            name="chiefComplaint"
            value={formData.chiefComplaint}
            onChange={handleInputChange}

          ></input>
        </div>

        <div className="CAF-form-group">
          <label>Diagnosis:</label>
          <input
            name="diagnosis"
            value={formData.diagnosis}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="CAF-form-group">
          <label>Treatment Plan:</label>
          <input
            name="treatmentPlan"
            value={formData.treatmentPlan}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="CAF-form-group">
          <label>Subjective Notes:</label>
          <input
            name="subjectiveNotes"
            value={formData.subjectiveNotes}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="CAF-form-group">
          <label>Objective Notes:</label>
          <input
            name="objectiveNotes"
            value={formData.objectiveNotes}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="CAF-form-group">
          <label>Assessment Notes:</label>
          <input
            name="assessmentNotes"
            value={formData.assessmentNotes}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="CAF-form-group">
          <label>Planning Notes:</label>
          <input
            name="planningNotes"
            value={formData.planningNotes}
            onChange={handleInputChange}
          ></input>
        </div>


        <div className="CAF-photo-upload-container">
  <h2 className="CAF-title">PHOTOS UPLOADS</h2>

  {/* BEFORE Section */}
  <div className="CAF-photo-upload-section">
    <h3 className="CAF-label">BEFORE</h3>

    <div className="CAF-upload-box">
      <div className="CAF-upload-icon">☁️</div>
      <p>
        Drop files to attach, or{' '}
        <span
          className="CAF-browse"
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
        className="CAF-file-input"
      />
    </div>

    <p className="CAF-info-text">
      Upload a maximum of 10 files at a time. Each file cannot exceed 10MB. If
      the form has more than a total of 20 files, the form may be slow to load.
    </p>

    {formData.beforePhotos.length > 0 && (
      <div className="CAF-file-list">
        <ul>
          {formData.beforePhotos.map((file, index) => (
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      </div>
    )}
  </div>

  {/* AFTER Section */}
  <div className="CAF-photo-upload-section">
    <h3 className="CAF-label">AFTER</h3>

    <div className="CAF-upload-box">
      <div className="CAF-upload-icon">☁️</div>
      <p>
        Drop files to attach, or{' '}
        <span
          className="CAF-browse"
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
        className="CAF-file-input"
      />
    </div>

    <p className="CAF-info-text">
      Upload a maximum of 10 files at a time. Each file cannot exceed 10MB. If
      the form has more than a total of 20 files, the form may be slow to load.
    </p>

    {formData.afterPhotos.length > 0 && (
      <div className="CAF-file-list">
        <ul>
          {formData.afterPhotos.map((file, index) => (
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
</div>

        <div className="CAF-face-mapper-section">
          <div className="CAF-face-mapper-container">
            <img src="/images/facediagram.jpg" alt="Face Diagram" className="CAF-face-diagram" />
            <canvas
              ref={faceCanvas}
              width={700}
              height={700}
              className="CAF-face-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            {rectangles.map(rect => (
              <textarea
                key={rect.id}
                value={rect.text}
                onChange={(e) => updateRectangleText(rect.id, e.target.value)}
                style={{
                  position: 'absolute',
                  left: `${rect.x}px`,
                  top: `${rect.y}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  border: 'none',
                  background: 'transparent',
                  fontSize: '12px',
                  padding: '2px',
                  boxSizing: 'border-box',
                  resize: 'none',
                  overflow: 'hidden',
                }}
                placeholder="Enter text"
              />
            ))}
          </div>
          <div className="CAF-face-mapper-tools">
            <label>
              Tool:
              <select value={tool} onChange={(e) => setTool(e.target.value)}>
                <option value="pencil">Pencil</option>
                <option value="eraser">Eraser</option>
                <option value="line">Line</option>
                <option value="rectangle">Rectangle</option>
              </select>
            </label>
            <label>
              Color:
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <label>
              Brush Size:
              <input
                type="range"
                min="1"
                max="10"
                value={brushSize}
                onChange={(e) => setBrushSize(e.target.value)}
              />
            </label>
            <button type="button" className="CAF-clear-face-mapper-btn" onClick={clearFaceMapper}>
              Clear Drawing
            </button>
          </div>
        </div>

        <div className="CAF-form-group">
          <label>Provider Name:</label>
          <input
            type="text"
            name="providerName"
            value={formData.providerName}
            onChange={handleInputChange}
            placeholder="Enter provider name"
          />
          {errors.providerName && <span className="CAF-error-message">{errors.providerName}</span>}
        </div>

        <div className="CAF-signature-section">
          <h2>Signature:</h2>
          <p>Sign above</p>
          <div className="CAF-signature-pad">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'CAF-sigCanvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, providerSignature: sigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="CAF-clear-signature-btn" onClick={clearSignature}>
            Clear Signature
          </button>
          {errors.providerSignature && <span className="CAF-error-message">{errors.providerSignature}</span>}
        </div>

        <div className="CAF-form-group">
          <label>Signature Date:</label>
          <input
            type="date"
            name="signatureDate"
            value={formData.signatureDate}
            onChange={handleInputChange}
          />
          {errors.signatureDate && <span className="CAF-error-message">{errors.signatureDate}</span>}
        </div>

        <div className="CAF-button-group">

          <button type="submit" className="CAF-submit-btn" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationAssessmentForm;
