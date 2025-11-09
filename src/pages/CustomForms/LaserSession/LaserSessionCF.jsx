import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import './LaserSessionConsentForm.css';

const LaserConsentForm = () => {
  const [formData, setFormData] = useState({
    clientName: '',
    date: '',
    acknowledged: false,
  });
  const [signature, setSignature] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const sigCanvas = useRef(null);
  const formRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const clearSignature = () => {
    sigCanvas.current.clear();
    setSignature(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.clientName.trim()) newErrors.clientName = 'Client name is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.acknowledged) newErrors.acknowledged = 'You must acknowledge the information';
    if (!signature) newErrors.signature = 'Signature is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setSubmitted(true);
      // Here you can handle form submission, e.g., send to API
      console.log('Form submitted:', { ...formData, signature });
      alert('Form submitted successfully!');
    }
  };

  const handlePrint = useReactToPrint({
    content: () => formRef.current,
  });

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.html(formRef.current, {
      callback: function (doc) {
        doc.save('laser-consent-form.pdf');
      },
      x: 10,
      y: 10,
      width: 190,
      windowWidth: 800
    });
  };

  if (submitted) {
  return (
    <div className="LSCF-success-message">
      <h2>Consent Form Submitted Successfully!</h2>
      <p>Thank you for your consent.</p>
      <button onClick={() => setSubmitted(false)}>
        Back to Form
      </button>
    </div>
  );
  }

  return (
    <div className="LSCF-consent-form-container">
      <div ref={formRef} className="LSCF-consent-form">
        <h1>Consent for Laser Session</h1>

        <div>
          <p>
            I undersigned, agree on conducting the procedure of laser session on , all the instructions and possible effects during or after the sessions were
            explained by the specialist.
          </p>
        </div>

        <div>
          <p>
            During laser hair removal, the laser emits light that is absorbed by the pigment (melanin) in the hair. The light energy is converted into heat, which
            damages the tubular sacs inside the skin (hair follicles) that are responsible for hair production. This damage prevents or delays hair growth.
          </p>
        </div>

        <div>
          <h3>For your safety and to ensure that the desired results are obtained, please adhere to the following instructions:</h3>
          <ul>
            <li>Some patients feel a burning or tingling sensation with each laser pulse, and they generally have moderate to mild pain.</li>
            <li>Pigmentation and minor skin burns are rare and may heal without leaving a trace if treated quickly, a dermatologist should be consulted.</li>
            <li>The result may vary from one person to another and depending on the type of hair and may require more sessions to reach the desired results.</li>
            <li>Commit to the dates of the laser sessions monthly to 6 weeks to obtain the desired results.</li>
          </ul>
        </div>

        <div>
          <h3>Note:</h3>
          <ul>
            <li>Please book a retouch appointment after the session is over.</li>
            <li>You will be reminded of the appointment by call or message.</li>
            <li>The retouch period is from 10 days to a maximum of 15 days if needed only , and thereafter a new session is counted.</li>
            <li>There is no self-done laser for any area of the body.</li>
            <li>The paid package is valid for one year only.</li>
            <li>The package amount paid for laser sessions is non-refundable</li>
            <li>I, the undersigned, acknowledge that I have read and understood the special instructions and reviewed the materials used and their expiry date.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label className="LSCF-checkbox-label">
              <input
                type="checkbox"
                name="acknowledged"
                checked={formData.acknowledged}
                onChange={handleInputChange}
              />
              I have read and understood the information provided above regarding the laser procedure, its risks, and post-treatment care.
            </label>
            {errors.acknowledged && <span className="LSCF-error-message">{errors.acknowledged}</span>}
          </div>

          <div className="LSCF-form-group">
            <label>Client Name *</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              placeholder="Enter your full name"
            />
            {errors.clientName && <span className="LSCF-error-message">{errors.clientName}</span>}
          </div>

          <div className="LSCF-form-group">
            <label>Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
            />
            {errors.date && <span className="LSCF-error-message">{errors.date}</span>}
          </div>

          <div className="LSCF-signature-section">
            <label className='LSCF-Label'>Digital Signature *</label>
            <div className="LSCF-signature-pad">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{ width: 500, height: 200, className: 'LSCF-sigCanvas' }}
                onEnd={() => setSignature(sigCanvas.current.toDataURL())}
              />
            </div>
            <button
              type="button"
              className="LSCF-clear-signature-btn"
              onClick={clearSignature}
            >
              Clear Signature
            </button>
            {errors.signature && <span className="LSCF-error-message">{errors.signature}</span>}
          </div>

          <div className="LSCF-button-group">
            <button
              type="submit"
              className="LSCF-submit-btn"
            >
              Submit Consent
            </button>
            <button
              type="button"
              className="LSCF-print-btn"
              onClick={handlePrint}
            >
              Print Form
            </button>
            <button
              type="button"
              className="LSCF-download-btn"
              onClick={handleDownloadPDF}
            >
              Download PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LaserConsentForm;
