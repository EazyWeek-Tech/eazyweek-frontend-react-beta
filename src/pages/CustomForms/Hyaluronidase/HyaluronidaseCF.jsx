import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useReactToPrint } from 'react-to-print';
import './VolumeFillingHyaluronidaseConsentForm.css';

const VolumeFillingHyaluronidaseConsentForm = () => {
  const [formData, setFormData] = useState({
    clientName: '',
    date: '',
    signature: null,
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

  const clearSignature = () => {
    sigCanvas.current.clear();
    setFormData(prev => ({ ...prev, signature: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.clientName.trim()) newErrors.clientName = 'Client name is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.signature) newErrors.signature = 'Signature is required';
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

  const handlePrint = useReactToPrint({
    content: () => formRef.current,
  });

  return (
    <div className="consent-form-container">
      <div ref={formRef} className="consent-form">
        <h1>Consent for Filler Removal Procedure (Hyaluronidase)</h1>

        <p>I, Undersigned, agree on the procedure of filler removal injection to which will be done by the Doctor.</p>

        <p>I acknowledge that I have disclosed any health problems that I have, and I am not pregnant when the procedure was done.</p>

        <p>Hyaluronidase is an enzyme that can be injected to dissolve dermal filler and is the best treatment option for those looking at dissolving lip filler and reducing any lumps or puffiness associated with dermal filler in the face or body.</p>

        <h2>WHAT DOES DERMAL FILLER DISSOLVING TREATMENT INVOLVE?</h2>

        <ol>
          <li>You will have a "Hyaluronidase consultation" with one of our Dermatologist doctors.</li>
          <li>The consultation will determine if Hyaluronidase treatment is suitable for you. If you wish to proceed with the treatment, a test patch or skin test will be scheduled, as there is a risk of a serious allergic reaction. This can be on the same day or the following day, whichever suits you.</li>
          <li>Numbing cream will be applied to the target area.</li>
        </ol>

        <h2>WHAT TO EXPECT AFTER THE PROCEDURE</h2>

        <p>You will notice a reduction in volume to the area immediately after the treatment; however, swelling is common so it may be difficult to see the full effects of filler removal treatment so quickly. We advise patients to allow 72 hours for the treatment to take full effect.</p>

        <p>For your safety, pictures of the patient will be taken before and after the medical procedure in order to determine and follow up on the efficacy of the procedure/treatment. These pictures are not for publication and advertising.</p>

        <p>I have read and understand the provided information and have had the opportunity to ask questions. I understand that my participation is voluntary and that I am free to withdraw at any time, without giving a reason and without cost.</p>

        <div className="signature-section">
          <h2>Signature:</h2>
          <p>Sign above</p>
          <div className="signature-pad">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, signature: sigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="clear-signature-btn" onClick={clearSignature}>
            Clear Signature
          </button>
          {errors.signature && <span style={{ color: 'red', fontSize: '12px', display: 'block', marginTop: '5px' }}>{errors.signature}</span>}
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Client Name: </label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              placeholder="Enter client name"
            />
            {errors.clientName && <span style={{ color: 'red', fontSize: '12px' }}>{errors.clientName}</span>}
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Date: </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
            />
            {errors.date && <span style={{ color: 'red', fontSize: '12px' }}>{errors.date}</span>}
          </div>
        </div>

        <div className="button-group">
          <button type="button" className="print-btn" onClick={handlePrint}>
            Print Form
          </button>
          <button type="submit" className="submit-btn" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default VolumeFillingHyaluronidaseConsentForm;
