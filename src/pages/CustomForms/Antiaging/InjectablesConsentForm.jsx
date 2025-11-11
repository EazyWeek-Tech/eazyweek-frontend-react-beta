import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useReactToPrint } from 'react-to-print';
import './InjectablesConsentForm.css';

const InjectablesConsentForm = () => {
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
      alert('Consent saved successfully');
      console.log('Form submitted:', formData);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => formRef.current,
  });

  return (
    <div className="icf-container">
      <div ref={formRef} className="icf-form">
        <h1 className="icf-header">Informed Consent form for patients Undergoing Injectable (PRP, Filler, Threads, Hyaluronidase, Mesotherapy) Treatment</h1>

        <div className="icf-form-group">
          <label className="icf-label">Name of Patient:</label>
          <input
            type="text"
            name="patientName"
            value={formData.patientName}
            onChange={handleInputChange}
            placeholder="Enter patient name"
            className="icf-input"
          />
          {errors.patientName && <span className="icf-error">{errors.patientName}</span>}
        </div>

        <p className="icf-paragraph">shall be performing the following treatment on Miss/Mrs./Mr.</p>

        <h2 className="icf-section-header">Services</h2>

        <div className="icf-checkbox-group">
          <label className="icf-checkbox-item">
            <input
              type="checkbox"
              name="prpSkinHair"
              checked={formData.services.prpSkinHair}
              onChange={handleInputChange}
              className="icf-checkbox"
            />
            PRP Skin/Hair
          </label>
          <label className="icf-checkbox-item">
            <input
              type="checkbox"
              name="fillers"
              checked={formData.services.fillers}
              onChange={handleInputChange}
              className="icf-checkbox"
            />
            Fillers
          </label>
          <label className="icf-checkbox-item">
            <input
              type="checkbox"
              name="threads"
              checked={formData.services.threads}
              onChange={handleInputChange}
              className="icf-checkbox"
            />
            Threads
          </label>
          <label className="icf-checkbox-item">
            <input
              type="checkbox"
              name="mesotherapy"
              checked={formData.services.mesotherapy}
              onChange={handleInputChange}
              className="icf-checkbox"
            />
            Mesotherapy
          </label>
        </div>

        <table className="icf-services-table">
          <thead>
            <tr>
              <th className="icf-table-header">Service</th>
              <th className="icf-table-header">Description of the Process</th>
              <th className="icf-table-header">Risks & Complications</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="icf-table-cell">PRP SKIN/HAIR</td>
              <td className="icf-table-cell">
                A Platelet Rich Plasma (PRP) face treatment, is an advanced skin treatment that is great for skin rejuvenation. It's a treatment that uses your own blood platelets to stimulate new cell growth, helping to improve your complexion and skin texture.
                <br /><br />
                PRP is a 3-step procedure that involves having your blood: Drawn from your arm. Placed into a machine that separates the platelets from the rest of your blood. Re-injected into you (only the part of your blood that contains a high concentration of platelets).
                <br /><br />
                plasma technology for hair has almost no side effects. But in a few cases, you can suffer from these quickly treatable problems:
                <ul className="icf-table-list">
                  <li>Vertigo and the urge to vomit.</li>
                  <li>Mild pain at injection sites.</li>
                </ul>
              </td>
              <td className="icf-table-cell"></td>
            </tr>
            <tr>
              <td className="icf-table-cell">Fillers</td>
              <td className="icf-table-cell">
                soft tissue filler injected into the skin at different depths to help fill in facial wrinkles, provide facial volume, and augment facial features: restoring a smoother appearance. Most of these wrinkle fillers are temporary because they are eventually absorbed by the body.
                <ul className="icf-table-list">
                  <li>The area to be injected is sanitized using alcohol swabs & Betadine or Chlorhexidine.</li>
                  <li>Apply anesthesia if Necessary.</li>
                  <li>Injection of the concerned area.</li>
                  <li>apply Antibiotic cream on the injected area.</li>
                </ul>
              </td>
              <td className="icf-table-cell">
                <ul className="icf-table-list">
                  <li>Pain, tenderness,bruising, swelling, lumps.</li>
                  <li>skin rash with itching, and asymmetry.</li>
                  <li>acne-like skin eruption, delayed inflammatory reaction, vascular injury.</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td className="icf-table-cell">Threads</td>
              <td className="icf-table-cell">
                In order to reverse signs of aging actively, the Facelift with Threads procedure targets the tissues that cause drooping and sagging facial features. Absorbable, single-strand medical sutures made from Polydioxanone PLLA, PCL, and HA are inserted into the hypodermis layer of skin, wherever a gentle supportive lift is desired. The carefully configured thread system lifts facial tissue, keeps it suspended in place, and improves microcirculation. An interesting phenomenon now begins to take place.
                <ul className="icf-table-list">
                  <li>Marking.</li>
                  <li>The area to be treated is sanitized using alcohol swabs, Betadine or Chlorhexidine.</li>
                  <li>Inject Anesthesia.</li>
                  <li>Threads insertion.</li>
                </ul>
              </td>
              <td className="icf-table-cell">
                <ul className="icf-table-list">
                  <li>Pain.</li>
                  <li>Swelling.</li>
                  <li>Dimpling.</li>
                  <li>Asymmetry.</li>
                  <li>Lumps.</li>
                  <li>Infection.</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td className="icf-table-cell">Mesotherapy</td>
              <td className="icf-table-cell">
                This is a procedure to treat skin pigmentation , Fine Lines, Open pores, Excess fat, and skin dryness according to the used cocktail decided by the dermatologist.
                <br /><br />
                The shot works by using "high quality" Platelet-Rich Plasma (PRP) produced from the patient's own blood. The PRP contains cell regenerating growth factors that, when injected into specific areas of the vagina, trigger stem cells to increase blood flow and generate healthy tissue growth as well as help improve the vascularization of the area.
              </td>
              <td className="icf-table-cell">
                <ul className="icf-table-list">
                  <li>slight bleeding.</li>
                  <li>minor pain.</li>
                  <li>Some patients may require a day of rest, while others can resume normal activities a few hours following the treatment.</li>
                  <li>may include urinary retention issues.</li>
                  <li>scar formation, pelvic pain, and constant vaginal wetness.</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>

        <h2 className="icf-section-header">Confidentiality of the treatment will be ensured by the Doctor and clinic:</h2>
        <ul className="icf-list">
          <li>I am aware that I have the right to refuse the treatment/procedure.</li>
          <li>I have been told about the alternatives to clinical procedures or treatment.</li>
          <li>I am aware that results can vary from one client to another and maintenance is required.</li>
          <li>I am aware that the outcome of the procedure is not always predictable. No guarantee or assurance has been given to me by anyone of the result that may be obtained.</li>
        </ul>

        <div className="icf-signature-section">
          <h2 className="icf-signature-header">Doctor Signature:</h2>
          <div className="icf-signature-pad">
            <SignatureCanvas
              ref={doctorSigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'icf-sig-canvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, doctorSignature: doctorSigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="icf-clear-btn" onClick={clearDoctorSignature}>
            Clear Signature
          </button>
          {errors.doctorSignature && <span className="icf-error">{errors.doctorSignature}</span>}
        </div>

        <p className="icf-paragraph">I agree that the clinic and its dermatologist shall not be held liable for any consequences of the treatment service which I may choose to take in any other clinic during or after the procedure.</p>

        <h2 className="icf-section-header">Certificate of Consent</h2>
        <h2 className="icf-sub-header">Patient Consent statement</h2>
        <p className="icf-paragraph">I have read the foregoing information, or it has been read to me. I have had the opportunity to ask questions about it and any questions that I have asked have been answered to my satisfaction. I consent voluntarily to try this new treatment and understand that I have the right to withdraw from the procedure or treatment at any time without in any way affecting my medical care.</p>

        <div className="icf-signature-section">
          <h2 className="icf-signature-header">Patient Signature:</h2>
          <div className="icf-signature-pad">
            <SignatureCanvas
              ref={patientSigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'icf-sig-canvas' }}
              onEnd={() => setFormData(prev => ({ ...prev, patientSignature: patientSigCanvas.current.toDataURL() }))}
            />
          </div>
          <button type="button" className="icf-clear-btn" onClick={clearPatientSignature}>
            Clear Signature
          </button>
          {errors.patientSignature && <span className="icf-error">{errors.patientSignature}</span>}
        </div>

        <h2 className="icf-section-header">Doctor Declaration:</h2>
        <p className="icf-paragraph">I have adequately explained to the patient the procedure along with risks, adverse effects, and the standard alternatives that are available for the procedure. I have permitted time and opportunity for the patient to ask questions and all questions have been answered to my knowledge.</p>

        <div className="icf-form-row">
          <div className="icf-form-group">
            <label className="icf-label">Patient Name:</label>
            <input
              type="text"
              name="patientName"
              value={formData.patientName}
              onChange={handleInputChange}
              placeholder="Enter patient name"
              className="icf-input"
            />
          </div>
          <div className="icf-form-group">
            <label className="icf-label">Date:</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="icf-input"
            />
          </div>
        </div>

        <div className="icf-form-row">
          <div className="icf-form-group">
            <label className="icf-label">Doctor's Name:</label>
            <input
              type="text"
              name="doctorsName"
              value={formData.doctorsName}
              onChange={handleInputChange}
              placeholder="Enter doctor's name"
              className="icf-input"
            />
          </div>
          <div className="icf-form-group">
            <label className="icf-label">Age:</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Enter age"
              className="icf-input"
            />
          </div>
        </div>

        <div className="icf-button-group">
          <button type="button" className="icf-print-btn" onClick={handlePrint}>
            Print Form
          </button>
          <button type="submit" className="icf-save-btn" onClick={handleSubmit}>
            Save Consent
          </button>
        </div>
      </div>
    </div>
  );
};

export default InjectablesConsentForm;
