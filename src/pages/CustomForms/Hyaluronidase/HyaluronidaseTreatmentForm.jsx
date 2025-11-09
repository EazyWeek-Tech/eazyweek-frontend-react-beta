import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './HyaluronidaseTreatmentForm.css';
import FileUploader from '../../EMR/Components/FileUploader';

const HyaluronidaseTreatmentForm = () => {
  const [formData, setFormData] = useState({
    allergies: '',
    gfeComplete: false,
    noTreatmentPerformed: false,
    patientName: '',
    date: '',
    treatmentNumber: '',
    historyNSAID: '',
    pregnancy: '',
    indicationsDissolve: false,
    preProcedureDiscontinue: false,
    indications: '',
    preProcedureText: '',
    skinNumbedWith: '',
    numbingMinutes: '',
    numbingCreamRemoved: false,
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    treatmentSettings: [{
      areaTreated: '',
      product: '',
      volume: '',
      lotNumber: '',
      expiration: '',
      dateTime: '',
    }],
    postProcedureText: '',
    toleratedWell: false,
    noDiscomfort: false,
    arnicaApplied: false,
    ibuprofenGiven: false,
    postCare: '',
    postCareReviewed: false,
    additionalNotes: '',
    providerName: '',
    providerDate: '',
    providerSignature: null,
    supervisingSignature: null,
    supervisingDate: '',
    beforePhotos: [],
    afterPhotos: [],
  });

  const [errors, setErrors] = useState({});
  const providerSigCanvas = useRef(null);
  const supervisingSigCanvas = useRef(null);
  const formRef = useRef(null);
  const faceCanvas = useRef(null);
  const [rectangles, setRectangles] = useState([]);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({x: 0, y: 0});
  const [lastPos, setLastPos] = useState({x: 0, y: 0});

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

  const handleCheckboxChange = (name, checked) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleTableChange = (index, field, value) => {
    const updatedSettings = [...formData.treatmentSettings];
    updatedSettings[index][field] = value;
    setFormData(prev => ({
      ...prev,
      treatmentSettings: updatedSettings
    }));
  };

  const addRow = () => {
    setFormData(prev => ({
      ...prev,
      treatmentSettings: [...prev.treatmentSettings, {
        areaTreated: '',
        product: '',
        volume: '',
        lotNumber: '',
        expiration: '',
        dateTime: '',
      }]
    }));
  };

  const deleteRow = (index) => {
    if (formData.treatmentSettings.length > 1) {
      const updatedSettings = formData.treatmentSettings.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        treatmentSettings: updatedSettings
      }));
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

  const clearProviderSignature = () => {
    providerSigCanvas.current.clear();
    setFormData(prev => ({ ...prev, providerSignature: null }));
  };

  const clearSupervisingSignature = () => {
    supervisingSigCanvas.current.clear();
    setFormData(prev => ({ ...prev, supervisingSignature: null }));
  };

  const startDrawing = (e) => {
    const canvas = faceCanvas.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
    setLastPos({ x, y });
    if (tool === 'rectangle') {
      setRectangles(prev => [...prev, { id: Date.now(), x, y, width: 0, height: 0, text: '' }]);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = faceCanvas.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (tool === 'pencil' || tool === 'eraser' || tool === 'line') {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      if (tool === 'pencil') {
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (tool === 'line') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else if (tool === 'rectangle') {
      // Rectangle drawing is handled in real-time via state updates
    }
    setLastPos({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const updateRectangleText = (id, text) => {
    setRectangles(prev => prev.map(rect =>
      rect.id === id ? { ...rect, text } : rect
    ));
  };

  const clearFaceMapper = () => {
    const canvas = faceCanvas.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setRectangles([]);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.patientName.trim()) newErrors.patientName = 'Patient name is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.historyNSAID) newErrors.historyNSAID = 'History of recent NSAID/ASA is required';
    if (!formData.pregnancy) newErrors.pregnancy = 'Pregnancy and/or breast feeding is required';
    if (!formData.providerName.trim()) newErrors.providerName = 'Provider name is required';
    if (!formData.providerSignature) newErrors.providerSignature = 'Provider signature is required';
    if (!formData.supervisingSignature) newErrors.supervisingSignature = 'Supervising physician signature is required';
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
    <div className="HTF-form-container-1">
      <div ref={formRef} className="HTF-forms">
          <h1 className='HTF-SuperTitle'>HYALURONIDASE TREATMENT FORM</h1>
         <div className="HTF-form-row">
  <div className="HTF-form-group">
    <label>Patient Name:</label>
    <input
      type="text"
      name="patientName"
      value={formData.patientName}
      onChange={handleInputChange}
      placeholder="Enter patient name"
    />
    {errors.patientName && <span className="HTF-error-message">{errors.patientName}</span>}
  </div>

  <div className="HTF-form-group">
    <label>Date:</label>
    <input
      type="date"
      name="date"
      value={formData.date}
      onChange={handleInputChange}
    />
    {errors.date && <span className="HTF-error-message">{errors.date}</span>}
  </div>

  <div className="HTF-form-group">
    <label>Treatment Number:</label>
    <input
      type="text"
      name="treatmentNumber"
      value={formData.treatmentNumber}
      onChange={handleInputChange}
      placeholder="Enter treatment number"
    />
  </div>
</div>

        <div className="HTF-form-group">
          <label>Allergies:</label>
          <textarea
            type="text"
            name="allergies"
            value={formData.allergies}
            onChange={handleInputChange}
            placeholder="Enter allergies"
          />
        </div>

        <div className="HTF-form-section">
  <div className="HTF-checkbox-row">
    <label className="HTF-checkbox-label">
      <input
        type="checkbox"
        checked={formData.gfeComplete}
        onChange={(e) => handleCheckboxChange('gfeComplete', e.target.checked)}
      />
      <span>GFE Complete</span>
    </label>

    <label className="HTF-checkbox-label">
      <input
        type="checkbox"
        checked={formData.noTreatmentPerformed}
        onChange={(e) =>
          handleCheckboxChange('noTreatmentPerformed', e.target.checked)
        }
      />
      <span>No Treatment Performed</span>
    </label>
  </div>
</div>

<div className="HTF-form-section">
  <label className="HTF-section-label">History of recent NSAID/ASA:</label>
  <div className="HTF-radio-row">
    <label className="HTF-radio-label">
      <input
        type="radio"
        name="historyNSAID"
        value="Yes"
        checked={formData.historyNSAID === 'Yes'}
        onChange={(e) => handleRadioChange('historyNSAID', e.target.value)}
      />
      <span>Yes</span>
    </label>

    <label className="HTF-radio-label">
      <input
        type="radio"
        name="historyNSAID"
        value="No"
        checked={formData.historyNSAID === 'No'}
        onChange={(e) => handleRadioChange('historyNSAID', e.target.value)}
      />
      <span>No</span>
    </label>
  </div>
  {errors.historyNSAID && (
    <span className="HTF-error-message">{errors.historyNSAID}</span>
  )}
</div>

<div className="HTF-form-section">
  <label className="HTF-section-label">Pregnancy and/or breast feeding:</label>
  <div className="HTF-radio-row">
    <label className="HTF-radio-label">
      <input
        type="radio"
        name="pregnancy"
        value="Yes"
        checked={formData.pregnancy === 'Yes'}
        onChange={(e) => handleRadioChange('pregnancy', e.target.value)}
      />
      <span>Yes</span>
    </label>

    <label className="HTF-radio-label">
      <input
        type="radio"
        name="pregnancy"
        value="No"
        checked={formData.pregnancy === 'No'}
        onChange={(e) => handleRadioChange('pregnancy', e.target.value)}
      />
      <span>No</span>
    </label>
  </div>
  {errors.pregnancy && (
    <span className="HTF-error-message">{errors.pregnancy}</span>
  )}
</div>


        <div className="HTF-form-section">
  <div className="HTF-checkbox-row">
    <label className="HTF-checkbox-label">
      <input
        type="checkbox"
        checked={formData.indicationsDissolve}
        onChange={(e) =>
          handleCheckboxChange('indicationsDissolve', e.target.checked)
        }
      />
      <span>Dissolve hyaluronic acid fillers</span>
    </label>
  </div>
</div>

<div className="HTF-form-section">
  <label className="HTF-section-label">Pre-Procedure Text:</label>
  <div className="HTF-checkbox-row">
    <label className="HTF-checkbox-label long-text">
      <input
        type="checkbox"
        checked={formData.preProcedureDiscontinue}
        onChange={(e) =>
          handleCheckboxChange('preProcedureDiscontinue', e.target.checked)
        }
      />
      <span>
        Discontinue omega 3 fish oils, Vitamin E, St. John’s Wart, Aspirin,
        Ibuprofen, Naproxen (Aleve), and anything containing these (cold
        medicine, Alka-Seltzer, etc.) for a minimum of 3 days before your
        treatment. If you are taking a medically prescribed blood thinner or any
        type of steroid, please notify your practitioner prior to treatment.
      </span>
    </label>
  </div>
</div>



<div className="HTF-form-section">
  <label className="HTF-section-label">Skin Numbed With:</label>
  <div className="HTF-radio-row">
    <label className="HTF-radio-label">
      <input
        type="radio"
        name="skinNumbedWith"
        value="23/7% Lidocaine/Tetracaine"
        checked={formData.skinNumbedWith === '23/7% Lidocaine/Tetracaine'}
        onChange={(e) => handleRadioChange('skinNumbedWith', e.target.value)}
      />
      <span>23/7% Lidocaine/Tetracaine</span>
    </label>

    <label className="HTF-radio-label">
      <input
        type="radio"
        name="skinNumbedWith"
        value="20/8/4% BLT"
        checked={formData.skinNumbedWith === '20/8/4% BLT'}
        onChange={(e) => handleRadioChange('skinNumbedWith', e.target.value)}
      />
      <span>20/8/4% BLT</span>
    </label>
  <div className="HTF-numbing-duration">
    <label>
      For{' '}
      <input
        type="text"
        name="numbingMinutes"
        value={formData.numbingMinutes}
        onChange={handleInputChange}
        className="HTF-minutes-input"
      />{' '}
      minutes prior to treatment
    </label>
  </div>
    <label className="HTF-radio-label">
      <input
        type="radio"
        name="skinNumbedWith"
        value="Local infiltration sodium bicarb, 1% lidocaine, and epinephrine"
        checked={
          formData.skinNumbedWith ===
          'Local infiltration sodium bicarb, 1% lidocaine, and epinephrine'
        }
        onChange={(e) => handleRadioChange('skinNumbedWith', e.target.value)}
      />
      <span>
        Local infiltration sodium bicarb, 1% lidocaine, and epinephrine
      </span>
    </label>

    <label className="HTF-radio-label">
      <input
        type="radio"
        name="skinNumbedWith"
        value="Tumescent with sodium bicarb, 1% lidocaine"
        checked={
          formData.skinNumbedWith ===
          'Tumescent with sodium bicarb, 1% lidocaine'
        }
        onChange={(e) => handleRadioChange('skinNumbedWith', e.target.value)}
      />
      <span>Tumescent with sodium bicarb, 1% lidocaine</span>
    </label>
  </div>



  <label className="HTF-checkbox-label">
    <input
      type="checkbox"
      checked={formData.numbingCreamRemoved}
      onChange={(e) =>
        handleCheckboxChange('numbingCreamRemoved', e.target.checked)
      }
    />
    <span>Numbing cream removed prior to treatment</span>
  </label>
</div>


        <div className="HTF-form-group">
          <label>Chief Complaint:</label>
          <input
          type='text'
            name="chiefComplaint"
            value={formData.chiefComplaint}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="HTF-form-group">
          <label>Diagnosis:</label>
          <input
          type='text'
            name="diagnosis"
            value={formData.diagnosis}
            onChange={handleInputChange}
          ></input>
        </div>

        <div className="HTF-form-group">
          <label>Treatment Plan:</label>
          <textarea
            name="treatmentPlan"
            value={formData.treatmentPlan}
            onChange={handleInputChange}
          ></textarea>
        </div>

        <div className="HTF-face-mapper-section">
          <div className="HTF-face-mapper-container">
            <img src="/images/facediagram.jpg" alt="Face Diagram" className="HTF-face-diagram" />
            <canvas
              ref={faceCanvas}
              width={700}
              height={700}
              className="HTF-face-canvas"
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
          <div className="HTF-face-mapper-tools">
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
            <button type="button" className="HTF-clear-face-mapper-btn" onClick={clearFaceMapper}>
              Clear Drawing
            </button>
          </div>
        </div>

        <div className="HTF-TitleandButton">
           <h1>Treatment Settings:</h1>
        </div>
       <table className="HTF-treatment-table">
          <thead>
            <tr>
              <th>Area Treated</th>
              <th>Product</th>
              <th>Volume (mL)</th>
              <th>Lot Number</th>
              <th>Expiration</th>
              {/* <th>Date/Time</th> */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {formData.treatmentSettings.map((setting, index) => (
              <tr key={index}>
                <td><input type="text" value={setting.areaTreated} onChange={(e) => handleTableChange(index, 'areaTreated', e.target.value)} /></td>
                <td><input type="text" value={setting.product} onChange={(e) => handleTableChange(index, 'product', e.target.value)} /></td>
                <td><input type="text" value={setting.volume} onChange={(e) => handleTableChange(index, 'volume', e.target.value)} /></td>
                <td><input type="text" value={setting.lotNumber} onChange={(e) => handleTableChange(index, 'lotNumber', e.target.value)} /></td>
                <td><input type="date" value={setting.expiration} onChange={(e) => handleTableChange(index, 'expiration', e.target.value)} /></td>
                {/* <td><input type="datetime-local" value={setting.dateTime} onChange={(e) => handleTableChange(index, 'dateTime', e.target.value)} /></td> */}
                <td>
                  {formData.treatmentSettings.length > 1 && (
                    <button type="button" onClick={() => deleteRow(index)} className="HTF-delete-row-btn">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
                    <button type="button" onClick={addRow} className="HTF-add-row-btn">Add Row</button>

        </table>

        <div className="HTF-form-section">
          <label className="HTF-section-label">Post Procedure Text:</label>
          <div className="HTF-checkbox-row">
            <label className="HTF-checkbox-label">
              <input
                type="checkbox"
                checked={formData.toleratedWell}
                onChange={(e) => handleCheckboxChange('toleratedWell', e.target.checked)}
              />
              <span>The patient tolerated the procedure well.</span>
            </label>
            <label className="HTF-checkbox-label">
              <input
                type="checkbox"
                checked={formData.noDiscomfort}
                onChange={(e) => handleCheckboxChange('noDiscomfort', e.target.checked)}
              />
              <span>No discomfort reported by patient during or post treatment.</span>
            </label>
            <label className="HTF-checkbox-label">
              <input
                type="checkbox"
                checked={formData.arnicaApplied}
                onChange={(e) => handleCheckboxChange('arnicaApplied', e.target.checked)}
              />
              <span>Arnica applied.</span>
            </label>
            <label className="HTF-checkbox-label">
              <input
                type="checkbox"
                checked={formData.ibuprofenGiven}
                onChange={(e) => handleCheckboxChange('ibuprofenGiven', e.target.checked)}
              />
              <span>Ibuprofen 800mg given.</span>
            </label>
          </div>
        </div>

        <div className="HTF-form-section">
          <label className="HTF-section-label">Post Care:</label>
          <div className="HTF-checkbox-row">
            <label className="HTF-checkbox-label long-text">
              <input
                type="checkbox"
                checked={formData.postCareReviewed}
                onChange={(e) => handleCheckboxChange('postCareReviewed', e.target.checked)}
              />
              <span>I reviewed with the patient in detail post-care instructions. Patient should do the following for minimum 1 week: sleep on back, no exercise, and no excessive heat (saunas, Jacuzzis, etc.). No massaging treatment site unless specified by provider. No laser or resurfacing treatments for one month.</span>
            </label>
          </div>
        </div>

        <div className="HTF-form-group">
          <label>Additional Notes:</label>
          <textarea
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleInputChange}
          ></textarea>
        </div>

        <div className="HTF-form-group">
          <label>Provider Name:</label>
          <input
            type="text"
            name="providerName"
            value={formData.providerName}
            onChange={handleInputChange}
            placeholder="Enter provider name"
          />
          {errors.providerName && <span className="HTF-error-message">{errors.providerName}</span>}
        </div>

        <div className="HTF-form-group">
          <label>Date: </label>
          <input
            type="date"
            name="providerDate"
            value={formData.providerDate}
            onChange={handleInputChange}
          />
        </div>

        <div className="HTF-signature-section">
          <h2>Provider Signature:</h2>
          {/* <p>Sign above</p> */}
          <div className="HTF-signature-pad">
            <SignatureCanvas
              ref={providerSigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'HTF-sigCanvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, providerSignature: providerSigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="HTF-clear-signature-btn" onClick={clearProviderSignature}>
            Clear Signature
          </button>
          {errors.providerSignature && <span className="HTF-error-message">{errors.providerSignature}</span>}
        </div>

        <div className="HTF-form-group">
          <label>Date: </label>
          <input
            type="date"
            name="supervisingDate"
            value={formData.supervisingDate}
            onChange={handleInputChange}
          />
        </div>

        <div className="HTF-signature-section">
          <h2 style={{fontWeight:"600", marginBottom:"3px"}}>Supervising Physician Signature:</h2>
          {/* <p>Sign above</p> */}
          <div className="HTF-signature-pad">
            <SignatureCanvas
              ref={supervisingSigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'HTF-sigCanvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, supervisingSignature: supervisingSigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="HTF-clear-signature-btn" onClick={clearSupervisingSignature}>
            Clear Signature
          </button>
          {errors.supervisingSignature && <span className="HTF-error-message">{errors.supervisingSignature}</span>}
        </div>

       <div className="HTF-photo-upload-container">
      <h2 className="HTF-title">PHOTOS UPLOADS</h2>

      {/* BEFORE UPLOAD */}
      <div className="HTF-photo-upload-section">
        <h3>BEFORE</h3>
        <p className="HTF-label">File Upload</p>

        <div className="HTF-upload-box">

          <span>
              <FileUploader
                type="file"
                multiple
                accept=".jpg,.png,.jpeg,.pdf"
                onChange={(e) => handleFileChange(e, 'beforePhotos')}
                className="HTF-file-input"
              />
          </span>
        </div>

        <p className="HTF-info-text">
          Upload a maximum of 10 files at a time. Each file cannot exceed 10MB. If the form has more than a total of 20 files, the form may be slow to load.
        </p>

        {formData.beforePhotos.length > 0 && (
          <div className="HTF-file-list">
            <ul>
              {formData.beforePhotos.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* AFTER UPLOAD */}
      <div className="HTF-photo-upload-section">
        <h3>AFTER</h3>
        <p className="HTF-label">File Upload</p>

        <div className="HTF-upload-box">
          <span>
              <FileUploader
                type="file"
                multiple
                accept=".jpg,.png,.jpeg,.pdf"
                onChange={(e) => handleFileChange(e, 'afterPhotos')}
                className="HTF-file-input"
              />
          </span>
        </div>

        <p className="HTF-info-text">
          Upload a maximum of 10 files at a time. Each file cannot exceed 10MB. If the form has more than a total of 20 files, the form may be slow to load.
        </p>

        {formData.afterPhotos.length > 0 && (
          <div className="HTF-file-list">
            <ul>
              {formData.afterPhotos.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>

        <div className="HTF-button-group">
         
          <button type="submit" className="HTF-submit-btn" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default HyaluronidaseTreatmentForm;
