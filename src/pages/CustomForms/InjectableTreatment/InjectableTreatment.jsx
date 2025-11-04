import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useReactToPrint } from 'react-to-print';
import './AntiAgeingInjectablesConsentForm.css';

const AntiAgeingInjectablesConsentForm = () => {
  const [formData, setFormData] = useState({
    patientName: '',
    doctorsName: '',
    age: '',
    date: '',
    services: {
      prpSkinHair: false,
      fillers: false,
      threads: false,
      mesotherapy: false,
    },
    doctorSignature: null,
    patientSignature: null,
  });

  const [errors, setErrors] = useState({});
  const doctorSigCanvas = useRef(null);
  const patientSigCanvas = useRef(null);
  const formRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name in formData.services) {
        setFormData(prev => ({
          ...prev,
          services: {
            ...prev.services,
            [name]: checked
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const clearDoctorSignature = () => {
    doctorSigCanvas.current.clear();
    setFormData(prev => ({ ...prev, doctorSignature: null }));
  };

  const clearPatientSignature = () => {
    patientSigCanvas.current.clear();
    setFormData(prev => ({ ...prev, patientSignature: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.patientName.trim()) newErrors.patientName = 'Patient name is required';
    if (!formData.doctorsName.trim()) newErrors.doctorsName = 'Doctor\'s name is required';
    if (!formData.age) newErrors.age = 'Age is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.doctorSignature) newErrors.doctorSignature = 'Doctor signature is required';
    if (!formData.patientSignature) newErrors.patientSignature = 'Patient signature is required';
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
    <div className="AAICF-consent-form-container">
      <div ref={formRef} className="AAICF-consent-form">
        <h1>Informed Consent form for patients Undergoing Injectable (PRP, Filler, Threads, Hyaluronidase, Mesotherapy) Treatment</h1>

        <div className="AAICF-form-group">
          <label>Name of Patient:</label>
          <input
            type="text"
            name="patientName"
            value={formData.patientName}
            onChange={handleInputChange}
            placeholder="Enter patient name"
          />
          {errors.patientName && <span style={{ color: 'red', fontSize: '12px' }}>{errors.patientName}</span>}
        </div>

        <p>shall be performing the following treatment on Miss/Mrs./Mr.</p>

        <h2>Services</h2>

        <div className="AAICF-checkbox-group">
          <label className="AAICF-checkbox-item">
            <input
              type="checkbox"
              name="prpSkinHair"
              checked={formData.services.prpSkinHair}
              onChange={handleInputChange}
            />
            PRP Skin/Hair
          </label>
          <label className="AAICF-checkbox-item">
            <input
              type="checkbox"
              name="fillers"
              checked={formData.services.fillers}
              onChange={handleInputChange}
            />
            Fillers
          </label>
          <label className="AAICF-checkbox-item">
            <input
              type="checkbox"
              name="threads"
              checked={formData.services.threads}
              onChange={handleInputChange}
            />
            Threads
          </label>
          <label className="AAICF-checkbox-item">
            <input
              type="checkbox"
              name="mesotherapy"
              checked={formData.services.mesotherapy}
              onChange={handleInputChange}
            />
            Mesotherapy
          </label>
        </div>

        <table className="AAICF-services-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Description of the Process</th>
              <th>Risks & Complications</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>PRP SKIN/HAIR</td>
              <td>
                A Platelet Rich Plasma (PRP) face treatment, is an advanced skin treatment that is great for skin rejuvenation. It's a treatment that uses your own blood platelets to stimulate new cell growth, helping to improve your complexion and skin texture.
                PRP is a 3-step procedure that involves having your blood: Drawn from your arm. Placed into a machine that separates the platelets from the rest of your blood. Re-injected into you (only the part of your blood that contains a high concentration of platelets).
                plasma technology for hair has almost no side effects. But in a few cases, you can suffer from these quickly treatable problems:
                <ul>
                  <li>Vertigo and the urge to vomit.</li>
                  <li>Mild pain at injection sites.</li>
                </ul>
              </td>
              <td></td>
            </tr>
            <tr>
              <td>Fillers</td>
              <td>
                Soft tissue filler injected into the skin at different depths to help fill in facial wrinkles, provide facial volume, and augment facial features: restoring a smoother appearance. Most of these wrinkle fillers are temporary because they are eventually absorbed by the body.
                <ul>
                  <li>The area to be injected is sanitized using alcohol swabs & Betadine or Chlorhexidine.</li>
                  <li>Apply anesthesia if necessary.</li>
                  <li>Injection of the concerned area.</li>
                  <li>Apply antibiotic cream on the injected area.</li>
                </ul>
              </td>
              <td>Risks: Pain, tenderness, bruising, swelling, lumps, skin rash with itching, asymmetry, acne-like eruption, delayed inflammatory reaction, vascular injury.</td>
            </tr>
            <tr>
              <td>Threads</td>
              <td>
                In order to reverse signs of aging actively, the Facelift with Threads procedure targets the tissues that cause drooping and sagging facial features. Absorbable, single-strand medical sutures made from Polydioxanone PLLA, PCL, and HA are inserted into the hypodermis layer of skin, wherever a gentle supportive lift is desired.
                <ul>
                  <li>Marking.</li>
                  <li>The area to be treated is sanitized using alcohol swabs, Betadine or Chlorhexidine.</li>
                  <li>Inject anesthesia.</li>
                  <li>Threads insertion.</li>
                </ul>
              </td>
              <td>Risks: Pain, swelling, dimpling, asymmetry, lumps, infection.</td>
            </tr>
            <tr>
              <td>Mesotherapy</td>
              <td>
                This is a procedure to treat skin pigmentation, fine lines, open pores, excess fat, and skin dryness according to the used cocktail decided by the dermatologist.
                The shot works by using "high quality" Platelet-Rich Plasma (PRP) produced from the patient's own blood. The PRP contains cell regenerating growth factors that, when injected into specific areas, trigger stem cells to increase blood flow and generate healthy tissue growth.
              </td>
              <td>Risks: slight bleeding, minor pain, day of rest may be required, urinary retention, scar formation, pelvic pain, or constant vaginal wetness.</td>
            </tr>
          </tbody>
        </table>

        <h2>Confidentiality of the treatment will be ensured by the Doctor and clinic:</h2>
        <ul>
          <li>I am aware that I have the right to refuse the treatment/procedure.</li>
          <li>I have been told about the alternatives to clinical procedures or treatment.</li>
          <li>I am aware that results can vary from one client to another and maintenance is required.</li>
          <li>I am aware that the outcome of the procedure is not always predictable. No guarantee or assurance has been given to me by anyone of the result that may be obtained.</li>
        </ul>

        <div className="AAICF-signature-section">
          <h2>Doctor Signature:</h2>
          <p>Sign above</p>
          <div className="AAICF-signature-pad">
            <SignatureCanvas
              ref={doctorSigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'AAICF-sigCanvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, doctorSignature: doctorSigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="AAICF-clear-signature-btn" onClick={clearDoctorSignature}>
            Clear Signature
          </button>
          {errors.doctorSignature && <span style={{ color: 'red', fontSize: '12px', display: 'block', marginTop: '5px' }}>{errors.doctorSignature}</span>}
        </div>

        <p>I agree that the clinic and its dermatologist shall not be held liable for any consequences of the treatment service which I may choose to take in any other clinic during or after the procedure.</p>

        <h2>Certificate of Consent</h2>
        <h2>Patient Consent statement</h2>
        <p>I have read the foregoing information, or it has been read to me. I have had the opportunity to ask questions about it and any questions that I have asked have been answered to my satisfaction. I consent voluntarily to try this new treatment and understand that I have the right to withdraw from the procedure or treatment at any time without in any way affecting my medical care.</p>

        <div className="AAICF-signature-section">
          <h2>Patient Signature:</h2>
          <p>Sign above</p>
          <div className="AAICF-signature-pad">
            <SignatureCanvas
              ref={patientSigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'AAICF-sigCanvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, patientSignature: patientSigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="AAICF-clear-signature-btn" onClick={clearPatientSignature}>
            Clear Signature
          </button>
          {errors.patientSignature && <span style={{ color: 'red', fontSize: '12px', display: 'block', marginTop: '5px' }}>{errors.patientSignature}</span>}
        </div>

        <h2>Doctor Declaration:</h2>
        <p>I have adequately explained to the patient the procedure along with risks, adverse effects, and the standard alternatives that are available for the procedure. I have permitted time and opportunity for the patient to ask questions and all questions have been answered to my knowledge.</p>

        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <div className="AAICF-form-group" style={{ flex: 1 }}>
            <label>Patient Name:</label>
            <input
              type="text"
              name="patientName"
              value={formData.patientName}
              onChange={handleInputChange}
              placeholder="Enter patient name"
            />
          </div>
          <div className="AAICF-form-group" style={{ flex: 1 }}>
            <label>Date:</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <div className="AAICF-form-group" style={{ flex: 1 }}>
            <label>Doctor's Name:</label>
            <input
              type="text"
              name="doctorsName"
              value={formData.doctorsName}
              onChange={handleInputChange}
              placeholder="Enter doctor's name"
            />
          </div>
          <div className="AAICF-form-group" style={{ flex: 1 }}>
            <label>Age:</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Enter age"
            />
          </div>
        </div>

        <div className="AAICF-button-group">
          <button type="button" className="AAICF-print-btn" onClick={handlePrint}>
            Print Form
          </button>
          <button type="submit" className="AAICF-submit-btn" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default AntiAgeingInjectablesConsentForm;
