import React, { useState, useEffect , useRef , useCallback  } from 'react';
import SignaturePad from '../Components/SignaturePad';
import FileUploader from '../Components/FileUploader';
import { API_BASE_URL } from "../../../config";
import { useNavigate , useSearchParams } from 'react-router-dom';
import './GuestConsentForm.css';

const GuestConsentForm = () => {
        const navigate = useNavigate();

        const handleBack = () => navigate(-1);

        // Signatures
        const [guestSignature, setGuestSignature] = useState('');
        const [providerSignature, setProviderSignature] = useState('');
        const guestSignatureRef = useRef();
        const providerSignatureRef = useRef();
        const formRef = useRef();

        // Photos
        const [beforePhotos, setBeforePhotos] = useState([]);
        const [afterPhotos, setAfterPhotos] = useState([]);

        // Form & toast
        const [formId, setFormId] = useState(null);
        const [toast, setToast] = useState({ message: "", type: "" });

        // Query params
        const [searchParams] = useSearchParams();
        const custId = searchParams.get('custid');
        const custName = searchParams.get('custname');
        const appointmentId = searchParams.get('appointmentid');

        const qp = new URLSearchParams({ custId, custName, appointmentId }).toString();


    const [formValues, setFormValues] = useState({
                clientName: custName || "",
                street: "",
                city: "",
                state: "",
                zip: "",
                date: new Date().toISOString().substring(0, 10),
                emergencyName: "",
                emergencyPhone: "",
                physician: "",
                physicianPhone: "",
                pharmacyName: "",
                pharmacyPhone: "",
                fitzpatrick: "",
                allergies: [],
                otherAllergyDetails: "",
                treatments: {},
                guestDateSigned: new Date().toISOString().substring(0, 10),
                providerName: "",
                providerDateSigned: new Date().toISOString().substring(0, 10),
                guestSignature: "",
                providerSignature: "",
                exerciseTypes: [],
                exerciseFrequency: [],
                exerciseDuration: "",
                exerciseDifficulty: "",
                exerciseDifficultyExplanation: "",
                exercisePain: "",
                exercisePainExplanation: "",
                workoutPreference: "",
                maleHormone: {
                  prostateExam: "",
                  energy: "",
                  mood: "",
                  libido: "",
                  symptoms: {},
                },
                femaleHormone: {
                  lastPeriodDate: "",
                  menopauseDate: "",
                  birthControlMethod: "",
                  pregnancyIntent: "",
                  papDate: "",
                  papStatus: "",
                  abnormalPap: "",
                  abnormalPapDate: "",
                  mammogramDate: "",
                  mammogramStatus: "",
                },
                adrenal: [],
                urinary: [],
                metabolicT4: [],
                reasonForCare: "",
                  accutane: "",
                  antibiotics: "",
                  birthControl: "",
                  hormoneSupplements: "",
                  aspirinUse: "",
                  retinA: "",
                  acneMeds: "",
                  antidepressants: "",
                  homeSkinCare: "",
                  smoker: "",
                  smokeFreeDuration: "",
                  smokingAmount: "",
                  smokingDuration: "",
                  alcoholIntake: "",
                  caffeineIntake: "",
                currentMedications: [],
                medicalHistory: [],
                neuro: [],
                metabolism: [],
                cardio: [],
                gi: [],
                immune: [],
                metabolicT3: [],
                hypersensitivity: [],
                other: [],
                skinConditions: [],
                tattoos: "",
                otherMedicalIssues: "",
                concerns: [],
                genderIdentity: "",
                genderPronoun: "",
                beforePhotos: [],
                afterPhotos: [],
              });

    const handleProviderSignatureSave = useCallback((signature) => {
        setFormValues(prev => ({ ...prev, providerSignature: signature }));
    }, [setFormValues]);

    const handleGuestSignatureSave = useCallback((signature) => {
            setFormValues(prev => ({ ...prev, guestSignature: signature }));
        }, [setFormValues]);

    const handleChange = (e) => {
      const { name, value, type } = e.target; // removed checked
      let newValue = value;

      if (["emergencyPhone", "physicianPhone", "pharmacyPhone"].includes(name)) {
        newValue = newValue.replace(/\D/g, "");
      }

      setFormValues(prev => ({ ...prev, [name]: newValue }));
    };

    const handleTreatmentChange = (treatmentKey, field, value) => {
      setFormValues(prev => ({
        ...prev,
        treatments: {
          ...(prev.treatments || {}),
          [treatmentKey]: {
            ...(prev.treatments?.[treatmentKey] || {}),
            [field]: value,
          }
        }
      }));
    };

    const handleCheckboxChange = (e, fieldName) => {
      const { value, checked } = e.target;

      setFormValues(prev => {
        const currentSet = new Set(prev[fieldName] || []);
        if (checked) {
          currentSet.add(value);
        } else {
          currentSet.delete(value);
        }
        return { ...prev, [fieldName]: Array.from(currentSet) };
      });
    };


    const Toast = ({ message, type = 'error', onClose }) => {
      if (!message) return null;

      React.useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
      }, [message, onClose]);

      return (
        <div
          role="alert"
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

    useEffect(() => {
      let isMounted = true;

      const fetchFormId = async () => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/form/definition-by-name?name=GuestConsentForm`,
            {
              method: 'GET',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            }
          );

          if (!res.ok) throw new Error('Failed to fetch form definition');

          const data = await res.json();
          if (isMounted && data?.id) {
            setFormId(data.id);
          }
        } catch (err) {
          console.error("Failed to fetch form definition:", err);
          setToast({ message: "Cannot load form definition.", type: "error" });
        }
      };

      fetchFormId();

      return () => { isMounted = false }; // cleanup
    }, []);

    const handleBeforePhotosChange = (e) => {
      setBeforePhotos(Array.from(e.target.files));
    };

    const handleAfterPhotosChange = (e) => {
      setAfterPhotos(Array.from(e.target.files));
    };

   const handleSubmit = async (e) => {
     e.preventDefault();
     console.log("Submit button clicked");

     if (!formId) {
       setToast({ message: "Form is not ready to be submitted yet. Please wait...", type: "error" });
       return;
     }

     try {
       // Get form field values
       const formDataObj = Object.fromEntries(new FormData(formRef.current).entries());

       // Convert files to Base64
       const beforeFilesBase64 = (
         await Promise.all(beforePhotos.map(async (file) => {
           const base64 = await convertFileToBase64(file);
           if (!base64) return null;
           return {
             fileName: file.name,
             fileType: file.type,
             base64Data: base64.split(",").pop(),
           };
         }))
       ).filter(Boolean);

       const afterFilesBase64 = (
         await Promise.all(afterPhotos.map(async (file) => {
            const base64 = await convertFileToBase64(file);
            if (!base64) return null;
            return {
                fileName: file.name,
                fileType: file.type,
                base64Data: base64.split(",").pop(),
           };
         }))
       ).filter(Boolean);

       // Final JSON object to send
       const jsonData = {
         ...formDataObj,
         guestSignature: formValues.guestSignature || "",
         providerSignature: formValues.providerSignature || "",
         beforePhotos: beforeFilesBase64,
         afterPhotos: afterFilesBase64,
       };

        console.log("Final Payload:", jsonData);

       const hasData = Object.values(jsonData).some(val =>
         Array.isArray(val) ? val.length > 0 : val?.toString().trim() !== ""
       );

       if (!hasData) {
         setToast({ message: "Form is blank. Fill at least one field.", type: "error" });
         return;
       }

       console.log(" Submitting this object:", {
         formId,
         submissionData: jsonData
       });

       const res = await fetch(`${API_BASE_URL}/api/forms/submit?${qp}`, {
         method: "POST",
         credentials: "include",
         headers: {
           "Content-Type": "application/json"
         },
         body: JSON.stringify({
           formId,
           submissionData: JSON.stringify(jsonData),
         }),
       });

       if (!res.ok) throw new Error(`Form submission failed: ${res.status}`);

       const data = await res.json();
       setToast({ message: "Form submitted successfully!", type: "success" });
       console.log("Server response:", data);

     } catch (err) {
       console.error("Failed to submit form:", err);
       setToast({ message: "Failed to submit form.", type: "error" });
     }
   };

    const convertFileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        if (file.base64Data && file.fileName) return resolve(file.base64Data); // return string

        if (!(file instanceof Blob)) return resolve(null);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result); // returns string
        reader.onerror = (error) => reject(error);
      });
    };

    return (
        <>
        <div className="medical-form">
            {/* Header Section */}
            <div className="form-header sticky-header">
                <img src="/images/logonew.png" alt="Organization Logo" className="logo" />
                <h1 className="page-title">MEDICAL HISTORY FORM</h1>
                <p className="subtitle">
                    CLIENT INFORMATION AND MEDICAL HISTORY<br />
                    To provide you with the most appropriate treatment,
                    we need you to complete the following questionnaire.
                    All the information is confidential and HIPAA Compliant
                </p>
            </div>

            {/* Scrollable Content */}
            <div className="form-content">
                <form className="gst-form-grid" ref={formRef} onSubmit={handleSubmit}>
              <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                <h3 className="section-title">Client Information</h3>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                    Client Name:
                    <input
                      type="text"
                      name="clientName"
                      value={formValues.clientName}
                      readOnly
                      style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                    Street:
                    <input
                      type="text"
                      name="street"
                      value={formValues.street}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </label>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                    City:
                    <input
                      type="text"
                      name="city"
                      value={formValues.city}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                    State:
                    <input
                      type="text"
                      name="state"
                      value={formValues.state}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </label>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                    Zip:
                    <input
                      type="text"
                      name="zip"
                      value={formValues.zip}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                    Date:
                    <input
                      type="date"
                      name="date"
                      value={formValues.date || ''}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </label>
                </div>
              </fieldset>


                <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                  <h3 className="section-title">Emergency Contact(s)</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1rem', textAlign: 'left' }}>
                    <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                      Name:
                      <input
                        type="text"
                        name="emergencyName"
                        value={formValues.emergencyName}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                      />
                    </label>

                    <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                      Phone Number:
                      <input
                        type="text"
                        name="emergencyPhone"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={formValues.emergencyPhone}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                      />
                    </label>

                    <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                      Primary Physician:
                      <input
                        type="text"
                        name="physician"
                        value={formValues.physician}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                      />
                    </label>

                    <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                      Phone Number:
                      <input
                        type="text"
                        name="physicianPhone"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={formValues.physicianPhone}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                      />
                    </label>

                    <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                      Pharmacy Name:
                      <input
                        type="text"
                        name="pharmacyName"
                        value={formValues.pharmacyName}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                      />
                    </label>

                    <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                      Phone Number:
                      <input
                        type="text"
                        name="pharmacyPhone"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={formValues.pharmacyPhone}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                  <h3 className="section-title">Fitzpatrick Skin Type</h3>
                  <p style={{ marginBottom: '1rem', fontSize: '14px', lineHeight: '20px' }}>
                    Which of the following best describes your skin using Fitzpatrick scale? Please select one:
                  </p>

                  <div className="radio-group" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', textAlign: 'left' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                      <input
                        type="radio"
                        name="fitzpatrick"
                        value="fair"
                        checked={formValues.fitzpatrick === "fair"}
                        onChange={handleChange}
                      /> Fair - always burns - never tans
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                      <input
                        type="radio"
                        name="fitzpatrick"
                        value="light"
                        checked={formValues.fitzpatrick === "light"}
                        onChange={handleChange}
                      /> Light Skin Tones - can burn, sometimes tans
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                      <input
                        type="radio"
                        name="fitzpatrick"
                        value="light-brown"
                        checked={formValues.fitzpatrick === "light-brown"}
                        onChange={handleChange}
                      /> Light brown skin - burns minimally, tans easily
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                      <input
                        type="radio"
                        name="fitzpatrick"
                        value="medium"
                        checked={formValues.fitzpatrick === "medium"}
                        onChange={handleChange}
                      /> Medium to Olive skin tone - tans easily
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                      <input
                        type="radio"
                        name="fitzpatrick"
                        value="brown"
                        checked={formValues.fitzpatrick === "brown"}
                        onChange={handleChange}
                      /> Brown Skin - rarely burns, tans darkly easily
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                      <input
                        type="radio"
                        name="fitzpatrick"
                        value="dark"
                        checked={formValues.fitzpatrick === "dark"}
                        onChange={handleChange}
                      /> Dark brown or black skin - never burns, always tans darkly
                    </label>
                  </div>
                </fieldset>


                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">Medical History</h3>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1rem', textAlign: 'left' }}>
                        <div>
                          <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>Are you currently under the care of a physician for any reason?</label>
                          <div className="radio-group" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                              <input
                                type="radio"
                                name="underPhysician"
                                value="yes"
                                checked={formValues.underPhysician === "yes"}
                                onChange={handleChange}
                              /> Yes
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                              <input
                                type="radio"
                                name="underPhysician"
                                value="no"
                                checked={formValues.underPhysician === "no"}
                                onChange={handleChange}
                              /> No
                            </label>
                          </div>
                        </div>

                        <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                          If Yes, for what:
                          <input
                            type="text"
                            name="reasonForCare"
                            value={formValues.reasonForCare}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                          />
                        </label>

                        {[
                          { name: 'accutane', label: 'Accutane in the last 12 Months?' },
                          { name: 'antibiotics', label: 'Antibiotics in the last 30 Days?' },
                          { name: 'birthControl', label: 'Birth Control Pills or IUD?' },
                          { name: 'hormoneSupplements', label: 'Hormone Supplements / Prescribed Hormones?' },
                          { name: 'aspirinUse', label: 'Aspirin, Ibuprofen Use?' },
                          { name: 'retinA', label: 'Retin A, Tretinoin?' },
                          { name: 'acneMeds', label: 'Differin or Acne Medication, Metro Gel, Metro Cream?' },
                          { name: 'antidepressants', label: 'Antidepressants?' }
                        ].map((item, idx) => (
                          <div key={idx}>
                            <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>{item.label}</label>
                            <div className="radio-group" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                                <input
                                  type="radio"
                                  name={item.name}
                                  value="yes"
                                  checked={formValues[item.name] === "yes"}
                                  onChange={handleChange}
                                /> Yes
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                                <input
                                  type="radio"
                                  name={item.name}
                                  value="no"
                                  checked={formValues[item.name] === "no"}
                                  onChange={handleChange}
                                /> No
                              </label>
                            </div>
                          </div>
                        ))}

                        <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                          Current Home Skin Care:
                          <textarea
                            name="homeSkinCare"
                            rows="2"
                            style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                            value={formValues.homeSkinCare}
                            onChange={handleChange}
                          />
                        </label>
                      </div>
                    </fieldset>

                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">
                        Smoking / Drinking / Caffeine Intake
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1rem', textAlign: 'left' }}>
                        <div>
                          <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>Are you a smoker?</label>
                          <div className="radio-group" style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                              <input
                                type="radio"
                                name="smoker"
                                value="yes"
                                checked={formValues.smoker === "yes"}
                                onChange={handleChange}
                              /> Yes
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                              <input
                                type="radio"
                                name="smoker"
                                value="no"
                                checked={formValues.smoker === "no"}
                                onChange={handleChange}
                              /> No
                            </label>
                          </div>
                        </div>

                        <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                          If you are an ex-smoker, for how long are you smoke free?
                          <input
                            type="text"
                            name="smokeFreeDuration"
                            value={formValues.smokeFreeDuration}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                          />
                        </label>

                        <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                          How much are (were) you smoking?
                          <input
                            type="text"
                            name="smokingAmount"
                            value={formValues.smokingAmount}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                          />
                        </label>

                        <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                          For how long?
                          <input
                            type="text"
                            name="smokingDuration"
                            value={formValues.smokingDuration}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                          />
                        </label>

                        <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                          How much alcohol do you drink per week?
                          <input
                            type="text"
                            name="alcoholIntake"
                            value={formValues.alcoholIntake}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                          />
                        </label>

                        <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '14px', lineHeight: '20px' }}>
                          Caffeine per week?
                          <input
                            type="text"
                            name="caffeineIntake"
                            value={formValues.caffeineIntake}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                          />
                        </label>
                      </div>
                    </fieldset>

                <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                  <h3 className="section-title">List Allergies</h3>

                  <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
    textAlign: 'left'
  }}
>
  <div
    className="checkbox-group"
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)', // ✅ 2 columns
      gap: '0.75rem 1rem', // vertical and horizontal gap
      alignItems: 'start'
    }}
  >
    {[
      ['sunReactions', 'Sun Reactions'],
      ['medicationAllergies', 'Medication Allergies'],
      ['foodAllergies', 'Food Allergies'],
      ['aspirinAllergy', 'Aspirin Allergy'],
      ['latexAllergy', 'Latex or Nitrile Allergy'],
      ['hydrocortisoneAllergy', 'Hydrocortisone Allergy'],
      ['lidocaineAllergy', 'Numbing Agent / Lidocaine Allergy'],
      ['hydroquinoneAllergy', 'Hydroquinone Allergy']
    ].map(([value, label]) => (
      <label
        key={value}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '14px',
          lineHeight: '20px'
        }}
      >
        <input
          type="checkbox"
          name="allergies"
          value={value}
          checked={formValues.allergies.includes(value)}
          onChange={(e) => handleCheckboxChange(e, 'allergies')}
        />
        {label}
      </label>
    ))}

    {/* Other Option */}
    <div style={{ gridColumn: '1 / -1' }}>
      {/* Makes this span both columns */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '14px',
          lineHeight: '20px'
        }}
      >
        <input
          type="checkbox"
          name="allergies"
          value="other"
          checked={formValues.allergies.includes('other')}
          onChange={(e) => handleCheckboxChange(e, 'allergies')}
        />
        Other / Not Listed:
      </label>
      <input
        type="text"
        name="otherAllergyDetails"
        value={formValues.otherAllergyDetails}
        onChange={handleChange}
        placeholder="Please specify"
        style={{
          width: '100%',
          padding: '0.5rem',
          marginTop: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxSizing: 'border-box'
        }}
      />
    </div>
  </div>
</div>

                </fieldset>

                <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                  <h3 className="section-title">Current Medications</h3>
                 <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)', // ✅ 2 columns
    gap: '0.75rem 1rem', // vertical and horizontal spacing
    textAlign: 'left',
    alignItems: 'start'
  }}
>
  {[
    'Birth Control',
    'Hormone Replacement Therapy',
    'Thyroid Medication',
    'Blood Pressure Medication',
    'Cholesterol Medication',
    'Diabetes Medication',
    'Antidepressants',
    'Antianxiety',
    'Antihistamines',
    'Steroids',
    'Antibiotics',
    'Pain Medication',
    'Other'
  ].map((label, idx) => (
    <label
      key={`medications-${idx}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '14px',
        lineHeight: '20px'
      }}
    >
      <input
        type="checkbox"
        name="currentMedications"
        value={label}
        checked={formValues.currentMedications.includes(label)}
        onChange={(e) => handleCheckboxChange(e, 'currentMedications')}
      />
      {label}
    </label>
  ))}
</div>

                </fieldset>

                <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                  <h3 className="section-title">Medical History</h3>

                  <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
    textAlign: 'left'
  }}
>
  <div
    className="checkbox-group"
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)', // ✅ Two columns
      gap: '0.75rem 1rem',
      alignItems: 'start'
    }}
  >
    {[
      ['cancer', 'Cancer (of any kind)'],
      ['skinRashes', 'Skin Rashes'],
      ['skinDiscoloration', 'Skin Discolorations'],
      ['skinIssues', 'Skin Issues/Problems'],
      ['slowHealing', 'Slow Healing'],
      ['severeScars', 'Scars (Severe)'],
      ['bruiseEasily', 'Bruise Easily'],
      ['fainting', 'Fainting'],
      ['headInjury', 'Head Injury'],
      ['lightheaded', 'Light Headed / Dizzy'],
      ['headaches', 'Headaches / Migraines'],
      ['seizures', 'Epilepsy / Seizures'],
      ['visionProblems', 'Vision / Eye Problems (i.e. glaucoma, dry eyes)'],
      ['respiratoryIssues', 'Respiratory Issues (i.e. asthma, bronchitis, emphysema)'],
      ['diabetes', 'Diabetics'],
      ['thyroidIssues', 'Thyroid Issues'],
      ['earIssues', 'Ear Infections / Issues'],
      ['heartProblems', 'Heart Problems (i.e. irregular heartbeat, chest pain)'],
      ['heartDisease', 'Heart Disease'],
      ['arthritis', 'Arthritis'],
      ['backPain', 'Back Injury / Pain'],
      ['bleedingDisorder', 'Bleeding Disorder / Tendency'],
      ['sinusIssues', 'Sinus Issues'],
      ['bloodPressure', 'High or Low Blood Pressure'],
      ['liverDisease', 'Liver Disease'],
      ['kidneyDisease', 'Kidney Disease'],
      ['giProblems', 'Gastrointestinal Problems (i.e. nausea, vomiting, diarrhea)'],
      ['autoimmuneDisorder', 'Autoimmune Disorder (i.e. rheumatoid arthritis)'],
      ['weakImmuneSystem', 'Weakened Immune System'],
      ['hiv', 'HIV'],
      ['aids', 'AIDS']
    ].map(([value, label]) => (
      <label
        key={value}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '14px',
          lineHeight: '20px'
        }}
      >
        <input
          type="checkbox"
          name="medicalHistory"
          value={value}
          checked={formValues.medicalHistory.includes(value)}
          onChange={(e) => handleCheckboxChange(e, 'medicalHistory')}
        />
        {label}
      </label>
    ))}

    {/* ✅ Cold Sores Section - spans both columns */}
    <div style={{ gridColumn: '1 / -1' }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '14px',
          lineHeight: '20px'
        }}
      >
        <input
          type="checkbox"
          name="medicalHistory"
          value="coldSores"
          checked={formValues.medicalHistory.includes('coldSores')}
          onChange={(e) => handleCheckboxChange(e, 'medicalHistory')}
        />
        Mouth / Cold Sores (if yes, when was your last outbreak?)
      </label>

      <input
        type="text"
        name="coldSoreOutbreak"
        value={formValues.coldSoreOutbreak}
        onChange={handleChange}
        placeholder="Last outbreak date"
        style={{
          width: '100%',
          padding: '0.5rem',
          marginTop: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxSizing: 'border-box'
        }}
      />
    </div>
  </div>
</div>

                </fieldset>

                <fieldset>
                  <h3 className="section-title">Exercise</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                    {/* Exercise Types */}
                    <div>
                      <label>Type of exercise(s) you currently participate in:</label>
                      <div className="checkbox-group">
                        {[
                          ['weightLifting', 'Weight Lifting'],
                          ['bicycling', 'Bicycling'],
                          ['yoga', 'Yoga'],
                          ['aerobic', 'Elcardio / Aerobic'],
                          ['running', 'Running'],
                          ['swimming', 'Swimming'],
                          ['walking', 'Walking'],
                          ['other', 'Other']
                        ].map(([value, label]) => (
                          <label key={value}>
                            <input
                              type="checkbox"
                              name="exerciseTypes"
                              value={value}
                              checked={formValues.exerciseTypes.includes(value)}
                              onChange={(e) => handleCheckboxChange(e, "exerciseTypes")}
                            /> {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Exercise Frequency */}
                    <div>
                      <label>How often do you exercise?</label>
                      <div className="checkbox-group">
                        {[
                          ['once', 'Once/week'],
                          ['twice', 'Twice/week'],
                          ['three', '3 times/week'],
                          ['four', '4 times/week'],
                          ['fivePlus', '5 or more times/week']
                        ].map(([value, label]) => (
                          <label key={value}>
                            <input
                              type="checkbox"
                              name="exerciseFrequency"
                              value={value}
                              checked={formValues.exerciseFrequency.includes(value)}
                              onChange={(e) => handleCheckboxChange(e, "exerciseFrequency")}
                            /> {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Exercise Duration */}
                   <div
  style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr', // ✅ exactly 2 columns
    gap: '1.5rem',
    textAlign: 'left',
    alignItems: 'start'
  }}
>
  {/* Average duration of exercise */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontWeight: '500' }}>Average duration of exercise (minutes):</label>
    <input
      type="number"
      name="exerciseDuration"
      value={formValues.exerciseDuration}
      onChange={handleChange}
      placeholder="Minutes"
      style={{
        padding: '0.5rem',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box'
      }}
    />
  </div>

  {/* Difficulty */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontWeight: '500' }}>Are you experiencing difficulty with exercise routine?</label>
    <div style={{ display: 'flex', gap: '1rem' }}>
      <label>
        <input
          type="radio"
          name="exerciseDifficulty"
          value="yes"
          checked={formValues.exerciseDifficulty === "yes"}
          onChange={handleChange}
        /> Yes
      </label>
      <label>
        <input
          type="radio"
          name="exerciseDifficulty"
          value="no"
          checked={formValues.exerciseDifficulty === "no"}
          onChange={handleChange}
        /> No
      </label>
    </div>
    <label>If yes, explain:</label>
    <input
      type="text"
      name="exerciseDifficultyExplanation"
      value={formValues.exerciseDifficultyExplanation}
      onChange={handleChange}
      placeholder="Explain here..."
      style={{
        padding: '0.5rem',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box'
      }}
    />
  </div>

  {/* Pain */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
    {/* ✅ span both columns */}
    <label style={{ fontWeight: '500' }}>Pain with exercising?</label>
    <div style={{ display: 'flex', gap: '1rem' }}>
      <label>
        <input
          type="radio"
          name="exercisePain"
          value="yes"
          checked={formValues.exercisePain === "yes"}
          onChange={handleChange}
        /> Yes
      </label>
      <label>
        <input
          type="radio"
          name="exercisePain"
          value="no"
          checked={formValues.exercisePain === "no"}
          onChange={handleChange}
        /> No
      </label>
    </div>
    <label>If yes, explain:</label>
    <input
      type="text"
      name="exercisePainExplanation"
      value={formValues.exercisePainExplanation}
      onChange={handleChange}
      placeholder="Explain here..."
      style={{
        padding: '0.5rem',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box'
      }}
    />
  </div>
</div>


                    {/* Workout Preference */}
                    <div>
                      <label>Workout preferences:</label>
                      <div className="radio-group">
                        {[
                          ['alone', 'Alone'],
                          ['partner', 'With a Partner'],
                          ['class', 'Class'],
                          ['gym', 'Gym'],
                          ['trainer', 'With a Trainer'],
                          ['other', 'Other']
                        ].map(([value, label]) => (
                          <label key={value}>
                            <input
                              type="radio"
                              name="workoutPreference"
                              value={value}
                              checked={formValues.workoutPreference === value}
                              onChange={handleChange}
                            /> {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </fieldset>


               <fieldset>
  <h3 className="section-title">
    Male Hormone Review
  </h3>

  <div style={{ display: 'grid', gap: '1rem', textAlign: 'left', gridTemplateColumns: '1fr 1fr' }}>
    {/* Prostate Exam */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>Date of last prostate exam:</label>
      <div className="radio-group" style={{ display: 'flex', gap: '1rem' }}>
        <label>
          <input
            type="radio"
            name="prostateExam"
            value="normal"
            checked={formValues.prostateExam === "normal"}
            onChange={handleChange}
          /> Normal
        </label>
        <label>
          <input
            type="radio"
            name="prostateExam"
            value="abnormal"
            checked={formValues.prostateExam === "abnormal"}
            onChange={handleChange}
          /> Abnormal
        </label>
      </div>
    </div>

    {/* Energy */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>
        Energy (1–10):
        <select name="energy" value={formValues.energy} onChange={handleChange}>
          {[...Array(10).keys()].map(i => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
      </label>
    </div>

    {/* Mood */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>
        Mood (1–10):
        <select name="mood" value={formValues.mood} onChange={handleChange}>
          {[...Array(10).keys()].map(i => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
      </label>
    </div>

    {/* Libido */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>
        Libido (1–10):
        <select name="libido" value={formValues.libido} onChange={handleChange}>
          {[...Array(10).keys()].map(i => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
      </label>
    </div>

    {/* Instruction text spanning 2 columns */}
    <p style={{ fontStyle: 'italic', fontSize: '0.95rem', gridColumn: '1 / -1' }}>
      Please review the following list and indicate CURRENT symptoms with a "C" and PAST symptoms with a "P"
    </p>

    {/* Symptom Inputs */}
    {[ 
      'bladderEmptying',
      'erectionMaintain',
      'crookedErection',
      'streamInitiation',
      'enlargedProstate',
      'lessFirmErections',
      'lowerSexInterest'
    ].map(name => (
      <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label>
          {name}: 
          <input 
            type="text" 
            name={name} 
            value={formValues[name]} 
            onChange={handleChange} 
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        </label>
      </div>
    ))}
  </div>
</fieldset>


            <fieldset>
  <h3 className="section-title">
    Female Hormone Review
  </h3>

  <div
    style={{
      display: 'grid',
      gap: '1rem',
      gridTemplateColumns: '1fr 1fr', // 2 columns layout
      textAlign: 'left',
    }}
  >
    {/* Last period / Menopause */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>Date of the 1st day of last period</label>
      <input
        type="date"
        name="lastPeriodDate"
        value={formValues.lastPeriodDate || ''}
        onChange={handleChange}
      />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>Or Date of Menopause:</label>
      <input
        type="date"
        name="menopauseDate"
        value={formValues.menopauseDate || ''}
        onChange={handleChange}
      />
    </div>

    {/* Birth Control Method */}
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>Birth Control Method:</label>
      <textarea
        name="birthControlMethod"
        rows="2"
        value={formValues.birthControlMethod}
        onChange={handleChange}
        style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
      ></textarea>
    </div>

    {/* Pregnancy Intent */}
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>Are you currently or do you plan on becoming pregnant?</label>
      <input
        type="text"
        name="pregnancyIntent"
        value={formValues.pregnancyIntent}
        onChange={handleChange}
        style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
      />
    </div>

    {/* Pap Test */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>Date of last Pap test:</label>
      <input
        type="date"
        name="papDate"
        value={formValues.papDate || ''}
        onChange={handleChange}
      />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <label>
          <input
            type="radio"
            name="papStatus"
            value="normal"
            checked={formValues.papStatus === 'normal'}
            onChange={handleChange}
          /> Normal
        </label>
        <label>
          <input
            type="radio"
            name="papStatus"
            value="abnormal"
            checked={formValues.papStatus === 'abnormal'}
            onChange={handleChange}
          /> Abnormal
        </label>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>Have you ever had an abnormal Pap?</label>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <label>
          <input
            type="radio"
            name="abnormalPap"
            value="yes"
            checked={formValues.abnormalPap === 'yes'}
            onChange={handleChange}
          /> Yes
        </label>
        <label>
          <input
            type="radio"
            name="abnormalPap"
            value="no"
            checked={formValues.abnormalPap === 'no'}
            onChange={handleChange}
          /> No
        </label>
      </div>
      <label>If yes, When?</label>
      <input
        type="date"
        name="abnormalPapDate"
        value={formValues.abnormalPapDate || ''}
        onChange={handleChange}
      />
    </div>

    {/* Mammogram */}
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>Date of last Mammogram:</label>
      <input
        type="date"
        name="mammogramDate"
        value={formValues.mammogramDate || ''}
        onChange={handleChange}
      />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <label>
          <input
            type="radio"
            name="mammogramStatus"
            value="normal"
            checked={formValues.mammogramStatus === 'normal'}
            onChange={handleChange}
          /> Normal
        </label>
        <label>
          <input
            type="radio"
            name="mammogramStatus"
            value="abnormal"
            checked={formValues.mammogramStatus === 'abnormal'}
            onChange={handleChange}
          /> Abnormal
        </label>
      </div>
    </div>
  </div>
</fieldset>


                <section>
                    <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Review of Systems</h2>
                    <p style={{ fontSize: '14px', lineHeight: '20px', marginBottom: '1rem' }}>Please check any that apply:</p>

                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">Adrenal</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {[
                          'Fainting/collapse',
                          'Palpitations',
                          'Salt craving',
                          'Muscle tension',
                          'Easily frustrated',
                          'Sweat easily -palms/armpits',
                          'Sugar craving',
                          'Panic attacks',
                          'Feeling overwhelmed',
                          'Excessive hunger',
                          'Prone to infection/sickly',
                          'Low blood pressure',
                          'Light headed when standing up',
                          'Racing mind,prevent sleep',
                          'Sluggish in the morning-slow start',
                          'Need sunglasses in bright light',
                          'Low back pain-worse with fatigue/stress'
                        ].map((label, idx) => {
                          return (
                            <label key={`adrenal-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                              <input
                                type="checkbox"
                                name="adrenal"
                                value={label}
                                checked={formValues.adrenal.includes(label)}
                                onChange={(e) => handleCheckboxChange(e, "adrenal")}
                              />{' '}
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>


                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">Urinary</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {[
                          'Blood in urine',
                          'Urgent urination',
                          'Frequent urination'
                        ].map((label, idx) => (
                          <label key={`urinary-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                            <input
                              type="checkbox"
                              name="urinary"
                              value={label}
                              checked={formValues.urinary.includes(label)}
                             onChange={(e) => handleCheckboxChange(e, "urinary")}
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>


                   <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                     <h3 className="section-title">
                       Metabolic, T3, or Adrenal
                     </h3>
                     <div
                       style={{
                         gap: '1rem',
                         textAlign: 'left',
                         display: 'grid',
                         gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                       }}
                     >
                       {[
                         'Migraines',
                         'Constipation',
                         'Fluid retention',
                         'Crave caffeine',
                         'Dry coarse skin',
                         'Deepening voice',
                         'Dry or thinning hair',
                         'Cold hands and feet',
                         'Elevated cholestrol',
                         'Low body temperature',
                         "Fatigue/exhausted by day's end",
                         'Brittle unhealthy nails',
                         'Fibromyalgia',
                         'Chronic fatigue',
                       ].map((label, idx) => (
                         <label key={`metabolicT3-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                           <input
                             type="checkbox"
                             name="metabolicT3"
                             value={label}
                             checked={formValues.metabolicT3.includes(label)}
                             onChange={(e) => handleCheckboxChange(e, "metabolicT3")}
                           />{' '}
                           {label}
                         </label>
                       ))}
                     </div>
                   </fieldset>

                   <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                     <h3 className="section-title">
                       Neuro-cognitive / Psych
                     </h3>
                     <div
                       style={{
                         gap: '1rem',
                         textAlign: 'left',
                         display: 'grid',
                         gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
                       }}
                     >
                       {[
                         'Loss of self-esteem',
                         'Feeling of hopelessness',
                         'Feeling defeated',
                         'Loss of confidence',
                         'Mood swings',
                         'Sense of powerlessness',
                         'Decreased sense of well-being',
                         'Apathy/losing interest in life',
                         'Vision deterioting',
                         'Hearing deteriorating',
                         'Memory deteriorating',
                         'Balance deteriorating',
                         'Coordination deteriorating',
                         'Change in headaches',
                         'Double vision',
                         'Dizzy/spinning'
                       ].map((label, idx) => (
                         <label key={`neuro-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                           <input
                             type="checkbox"
                             name="neuro"
                             value={label}
                             checked={formValues.neuro.includes(label)}
                            onChange={(e) => handleCheckboxChange(e, "neuro")}
                           />{' '}
                           {label}
                         </label>
                       ))}
                     </div>
                   </fieldset>


                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">Metabolism</h3>
                      <div
                        style={{
                          gap: '1rem',
                          textAlign: 'left',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
                        }}
                      >
                        {[
                          'Excessive thirst',
                          'Cannot skip meals',
                          'Headache if meal is missed',
                          'Craving for sugar and carbs',
                          'Mid-afternoon drowsiness',
                          'Low energy periods relieved with foodrelieved',
                          'Jittery/irritable episodes relieved w/food',
                          'Alternate between high and low moods',
                          'Alternate between sluggish/high energy',
                          'High blood pressure',
                          'Skin tags at neck and armpits',
                          'High cholesterol/triglycerides',
                          'Increased fat around abdomen',
                          'Prone to inflammation'
                        ].map((label, idx) => (
                          <label key={`metabolism-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                            <input
                              type="checkbox"
                              name="metabolism"
                              value={label}
                              checked={formValues.metabolism.includes(label)}
                              onChange={(e) => handleCheckboxChange(e, "metabolism")}
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">
                        Cardiovascular/Respiratory
                      </h3>
                      <div
                        style={{
                          gap: '1rem',
                          textAlign: 'left',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
                        }}
                      >
                        {[
                          'Chest pain',
                          'Blood in sputum',
                          'Unusual cough',
                          'Shortness of breath',
                          'Swollen ankles',
                          'Rapid heart beat',
                          'Leg pain with walking',
                          'Snoring excessively',
                          'Fainting/collapsing'
                        ].map((label, idx) => (
                          <label key={`cardio-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                            <input
                              type="checkbox"
                              name="cardio"
                              value={label}
                              checked={formValues.cardio.includes(label)}
                              onChange={(e) => handleCheckboxChange(e, "cardio")}
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                   <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                     <h3 className="section-title">GI</h3>
                     <div
                       style={{
                         gap: '1rem',
                         textAlign: 'left',
                         display: 'grid',
                         gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                       }}
                     >
                       {[
                         'Fluid retention',
                         'Bright blood in stool',
                         'Difficulty swallowing',
                         'Loss of appetite',
                         'Persistent nausea',
                         'Bloating',
                         'Abdominal pain',
                         'Acid reflux',
                         'Recent change in bowel habit',
                         'Weight loss- unexpected',
                         'Black tarry stools',
                       ].map((label, idx) => (
                         <label key={`gi-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                           <input
                             type="checkbox"
                             name="gi"
                             value={label}
                             checked={formValues.gi.includes(label)}
                             onChange={(e) => handleCheckboxChange(e, "gi")}
                           />{' '}
                           {label}
                         </label>
                       ))}
                     </div>
                   </fieldset>

                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">Immune system</h3>
                      <div
                        style={{
                          gap: '1rem',
                          textAlign: 'left',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        }}
                      >
                        {[
                          'Frequent colds or flus',
                          'Rash across face and cheeks',
                          'Patchy red rash on body',
                          'Arthritis in fingers and hands',
                          'Asthma/wheezing',
                          'Patchy hair loss',
                        ].map((label, idx) => (
                          <label key={`immune-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                            <input
                              type="checkbox"
                              name="immune"
                              value={label}
                              checked={formValues.immune.includes(label)}
                             onChange={(e) => handleCheckboxChange(e, "immune")}
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">Hypersensitivity</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {[
                          'Symptoms are year around',
                          'Symptoms are seasonal',
                          'Irritated tongue',
                          'Recurrent canker sores',
                          'Diarrhea/constipation',
                          'Dandruff/itchy scalp',
                          'Eczema/dermatitis',
                          'Dizziness',
                          'Wheezing',
                          'Chronic cough',
                          'Sinus congestion',
                          'Nasal congestion',
                          'Excessive mucus'
                        ].map((label, idx) => (
                          <label key={`hypersensitivity-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                            <input
                              type="checkbox"
                              name="hypersensitivity"
                              value={label}
                              checked={formValues.hypersensitivity.includes(label)}
                              onChange={(e) => handleCheckboxChange(e, "hypersensitivity")}
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">Other</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {['Unusual bruising', 'Nose bleeds', 'Prolonged bleeding'].map((label, idx) => (
                          <label key={`other-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                            <input
                              type="checkbox"
                              name="other"
                              value={label}
                              checked={formValues.other.includes(label)}
                              onChange={(e) => handleCheckboxChange(e, "other")}
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                      <h3 className="section-title">Skin Conditions</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {['Acne', 'Melasma', 'Vitiligo', 'Keloid Scarring'].map((label, idx) => (
                          <label key={`skin-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', lineHeight: '20px' }}>
                            <input
                              type="checkbox"
                              name="skinConditions"
                              value={label}
                              checked={formValues.skinConditions.includes(label)}
                               onChange={(e) => handleCheckboxChange(e, "skinConditions")}
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                </section>

                <section>
                  {/* Treatment History */}
                  <div style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
                    {[
                      'Skin/Light Energy Treatments At Another Office',
                      'Neurotoxin (Botox, Dysport etc.)',
                      'Fillers (Restylane, Juvederm etc.)',
                      'Hair Removal',
                      'Chemical Peels',
                      'Sun Exposure/Tanning bed in last week? Tanning Habits',
                    ].map((label, idx) => {
                      const key = `treatment_${idx}`;
                      return (
                        <fieldset key={key} style={{ border: '1px solid var(--hgh-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem', background: 'var(--pribg-color)' }}>
                          <h3 className="section-title">{label}</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label>
                              <input
                                type="radio"
                                name={`${key}_status`}
                                value="Yes"
                                checked={formValues.treatments?.[key]?.status === 'Yes'}
                                onChange={() => handleTreatmentChange(key, 'status', 'Yes')}
                              /> Yes
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`${key}_status`}
                                value="No"
                                checked={formValues.treatments?.[key]?.status === 'No'}
                                onChange={() => handleTreatmentChange(key, 'status', 'No')}
                              /> No
                            </label>

                            <label>
                              If so, when?
                              <input
                                type="text"
                                name={`${key}_when`}
                                value={formValues.treatments?.[key]?.when || ''}
                                onChange={e => handleTreatmentChange(key, 'when', e.target.value)}
                              />
                            </label>

                            <label>
                              Results
                              <input
                                type="text"
                                name={`${key}_results`}
                                value={formValues.treatments?.[key]?.results || ''}
                                onChange={e => handleTreatmentChange(key, 'results', e.target.value)}
                              />
                            </label>
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>

                  {/* Tattoos */}
                  <fieldset>
                  <h3 className="section-title">Tattoos, Permanent Makeup</h3>
                    <label>Please describe location, type, or any relevant notes:</label>
                    <textarea
                      name="tattoos"
                      rows="2"
                      style={{ width: '100%' }}
                      value={formValues.tattoos || ''}
                      onChange={handleChange}
                    />
                  </fieldset>

                  {/* Other Medical Issues */}
                  <fieldset>
                    <h3 className="section-title">List Medical Issues Not Listed Above</h3>
                    <label>Please describe any additional medical issues:</label>
                    <textarea
                      name="otherMedicalIssues"
                      rows="2"
                      style={{ width: '100%' }}
                      value={formValues.otherMedicalIssues || ''}
                      onChange={handleChange}
                    />
                  </fieldset>

                  {/* Concerns */}
                  <fieldset>
                    <h3 className="section-title">Concerns</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {[
                        "I'm concerned about facial or body hair and would like information on how to get rid of it",
                        "I'm concerned about broken capillaries on my face",
                        "I'm concerned about the fine lines around my eyes",
                        "I'm concerned about the lines around my mouth",
                        "I'm concerned about pigmentation or age spots",
                        "I'm concerned about stretch marks or scars"
                      ].map((item, idx) => (
                        <label key={`concern-${idx}`}>
                          <input
                            type="checkbox"
                            name="concerns"
                            value={item}
                            checked={formValues.concerns?.includes(item)}
                            onChange={e => handleCheckboxChange(e, 'concerns')}
                          /> {item}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <p className='tandc'>
                    I certify that the preceding medical, personal and skin history statements are true and correct...
                  </p>

                  {/* Gender Identity */}
                  <fieldset>
                  <h3 className="section-title">Gender Identity</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {['Woman', 'Man', 'Trans woman', 'Trans man', 'Non-binary'].map((item, idx) => (
                        <label key={`gender-${idx}`}>
                          <input
                            type="radio"
                            name="genderIdentity"
                            value={item}
                            checked={formValues.genderIdentity === item}
                            onChange={handleChange}
                          /> {item}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Gender Pronoun */}
                  <fieldset>
                  <h3 className="section-title">Gender Pronoun</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {['She', 'He', 'They'].map((item, idx) => (
                        <label key={`pronoun-${idx}`}>
                          <input
                            type="radio"
                            name="genderPronoun"
                            value={item}
                            checked={formValues.genderPronoun === item}
                            onChange={handleChange}
                          /> {item}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* File Uploads */}
                  <fieldset>
                    <h3 className="section-title">Before File Upload</h3>
                    <FileUploader
                      onFilesSelected={async (files) => {
                        const processedFiles = await Promise.all(
                          files.map(async (file) => {
                              // If file is already processed by FileUploader (has base64Data and fileName), use it
                                                          if (file && (file.base64Data || file.base64) && (file.fileName || file.name)) {
                                                            return {
                                                              fileName: file.fileName || file.name,
                                                              fileType: file.fileType || file.type || '',
                                                              base64Data: file.base64Data || file.base64
                                                            };
                                                          }

                                                          // Otherwise treat it as a File/Blob and convert
                            const base64 = await convertFileToBase64(file);
                            return {
                              fileName: file.name,
                              fileType: file.type,
                              base64Data: base64 ? base64.split(',').pop() : ''
                            };
                          })
                        );

                         // replace existing beforePhotos
                                                setFormValues(prev => ({ ...prev, beforePhotos: processedFiles }));
                      }}
                    />
                    {Array.isArray(formValues.beforePhotos) && formValues.beforePhotos.length > 0 && (
                                          <ul>
                                            {formValues.beforePhotos.map((file, index) => (
                                              <li key={index}>📄 {file.fileName || file.name}</li>
                                            ))}
                                          </ul>
                                        )}

                    <h3 className="section-title">After File Upload</h3>
                    <FileUploader
                      onFilesSelected={async (files) => {
                        const processedFiles = await Promise.all(
                          files.map(async (file) => {
                              if (file && (file.base64Data || file.base64) && (file.fileName || file.name)) {
                                                            return {
                                                              fileName: file.fileName || file.name,
                                                              fileType: file.fileType || file.type || '',
                                                              base64Data: file.base64Data || file.base64
                                                            };
                                                          }

                            const base64 = await convertFileToBase64(file);
                            return {
                              fileName: file.name,
                              fileType: file.type,
                              base64Data: base64 ? base64.split(',').pop() : ''
                            };
                          })
                        );

                         setFormValues(prev => ({ ...prev, afterPhotos: processedFiles }));
                      }}
                    />
                    {Array.isArray(formValues.afterPhotos) && formValues.afterPhotos.length > 0 && (
                                          <ul>
                                            {formValues.afterPhotos.map((file, index) => (
                                              <li key={index}>📄 {file.fileName || file.name}</li>
                                            ))}
                                          </ul>
                                        )}
                  </fieldset>
                </section>

                <section>
                  {/* Guest Info */}
                  <div className="form-row">
                    <label>
                      Guest Name:
                      <input type="text" name="guestName" value={custName} readOnly />
                    </label>

                    <label>
                      Date Signed:
                      <input
                        type="date"
                        name="guestDateSigned"
                        value={formValues.guestDateSigned || '' }
                        onChange={handleChange}
                      />
                    </label>
                  </div>

                  <div className="">
                    <label>
                      Guest Signature: </label>
                      <div className="cnfrmcellwrp" onClick={(e) => e.stopPropagation()}>
                        <SignaturePad
                           ref={guestSignatureRef}
                           onSave={handleGuestSignatureSave}
                           />
                      </div>
                  </div>

                  {/* Provider Info */}
                  <div className="form-row">
                    <label>
                      Provider Name:
                      <input type="text" name="providerName" value={formValues.providerName || ''} onChange={handleChange} />
                    </label>

                    <label>
                      Date Signed:
                      <input type="date" name="providerDateSigned" value={formValues.providerDateSigned || ''} onChange={handleChange} />
                    </label>
                  </div>



                  <div className="">
                    <label>
                      Provider Signature: </label>
                      <div className="cnfrmcellwrp" onClick={(e) => e.stopPropagation()}>
                          <SignaturePad
                              ref={providerSignatureRef}
                              onSave={handleProviderSignatureSave}
                          />
                      </div>
                  </div>
                </section>

                <button type="submit">Submit</button>
                </form>
            </div>
          

            {/* Toast messages */}
            {toast && (
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
              />
            )}
        </div>
        </>
    );
};


export default GuestConsentForm;
