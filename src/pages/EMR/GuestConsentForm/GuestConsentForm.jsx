import React, { useState, useEffect , useRef } from 'react';
import SignaturePad from '../Components/SignaturePad';
import FileUploader from '../Components/FileUploader';
import { API_BASE_URL } from "../../../config";
import { useNavigate , useSearchParams } from 'react-router-dom';

const GuestConsentForm = () => {
    const [guestSignature, setGuestSignature] = useState('');
    const [providerSignature, setProviderSignature] = useState('');
    const providerSignatureRef = useRef();
    const guestSignatureRef = useRef();
    const [toast, setToast] = useState(null);
    const [beforePhotos, setBeforePhotos] = useState([]);
    const [afterPhotos, setAfterPhotos] = useState([]);
    const [formId, setFormId] = useState(null);
    const [searchParams] = useSearchParams();
    const [custId, setCustId] = useState('');
    const [custName, setCustName] = useState('');
    const [appointmentId, setAppointmentId] = useState('');
    const idFromQuery = searchParams.get('custid');
    const nameFromQuery = searchParams.get('custname');
    const appointmentFromQuery = searchParams.get('appointmentid');
    const qp = new URLSearchParams({ custId, custName, appointmentId }).toString();

    const Toast = ({ message, type, onClose }) => {
      if (!message) return null;

      return (
        <div
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
  if (idFromQuery) setCustId(idFromQuery);
  if (nameFromQuery) setCustName(nameFromQuery);
  if (appointmentFromQuery) setAppointmentId(appointmentFromQuery);
}, [searchParams]);

    useEffect(() => {
      const fetchFormId = async () => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/forms/definition-by-name?name=GuestConsentForm`,
            {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          if (!res.ok) throw new Error('Failed to fetch form definition');
          const data = await res.json();
          setFormId(data.id);
        } catch (err) {
          console.error("Failed to fetch form definition:", err);
          alert("Cannot load form definition.");
        }
      };

      fetchFormId();
    }, []);

    const handleSubmit = async () => {

       console.log("Submit button was clicked");

      if (!formId) {
        setToast("Form is not ready to be submitted yet. Please wait...");
        return;
      }

      const form = formRef.current;
      const formData = new FormData(form);
      const jsonData = {};

      for (let [key, value] of formData.entries()) {
        if (jsonData[key]) {
          if (!Array.isArray(jsonData[key])) {
            jsonData[key] = [jsonData[key]];
          }
          jsonData[key].push(value);
        } else {
          jsonData[key] = value;
        }
      }

      jsonData.guestSignature = guestSignature;
      jsonData.providerSignature = providerSignature;
      jsonData.beforePhotos = beforePhotos;
      jsonData.afterPhotos = afterPhotos;


      const hasMeaningfulData = Object.values(jsonData).some(value => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'string') return value.trim() !== '';
        return value !== null && value !== undefined;
      });

      if (!hasMeaningfulData) {
        setToast("Form is blank. Please fill out at least one field before submitting.");
        return;
      }
      console.log("Payload to be submitted:", jsonData);
      try {
          const payload = {
                formId,
                submissionData: JSON.stringify(jsonData),
            };
          console.log("Payload being sent to backend:", payload);

          const res = await fetch(`${API_BASE_URL}/api/forms/submit?${qp}`, {
            method: 'POST',
            credentials:"include",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
              const errData = await res.text();
              throw new Error(errData);
          }
         setToast('Form submitted successfully!');
        }
        catch (err) {
            console.error("Backend error:", err.message);
            setToast('Failed to submit the form.');
        }
      };

    return (
        <>
        <div className="medical-form">
            <div className="header">
                <img src="./public/images/logo.jpeg" alt="Organization Logo" className="logo" />
                <h1>MEDICAL HISTORY FORM</h1>

            </div>
            <p className="subtitle">
                CLIENT INFORMATION AND MEDICAL HISTORY<br />
                To provide you with the most appropriate treatment,
                we need you to complete the following questionnaire.
                All the information is confidential and HIPAA Compliant
            </p>

            <form className="gst-form-grid" ref={formRef}>
                <fieldset>
                    <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Client Information</h3>
                    <div className="form-row">
                        <label>Client Name: <input type="text" name="clientName" defaultValue={custName} readOnly/></label>
                        <label>Street: <input type="text" name="street" defaultValue=""/></label>
                    </div>
                    <div className="form-row">
                        <label>City: <input type="text" name="city" defaultValue="" /></label>
                        <label>State: <input type="text" name="state"  defaultValue=""/></label>
                    </div>
                    <div className="form-row">
                        <label>Zip: <input type="text" name="zip" defaultValue=""/></label>
                        <label>Date: <input type="date" name="date" defaultValue= {new Date().toISOString().substring(0, 10)}/></label>
                    </div>
                </fieldset>

                <fieldset>

                    <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Emergency Contact(s)</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                    <label>Name: <input type="text" name="emergencyName" defaultValue=""/></label>

                    <label>Phone Number:
                      <input
                        type="text"
                        name="emergencyPhone"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        defaultValue=""
                        onInput={(e) => e.target.value = e.target.value.replace(/\D/g, '')}
                      />
                    </label>

                    <label>Primary Physician: <input type="text" name="physician" defaultValue=""/></label>

                    <label>Phone Number:
                      <input
                        type="text"
                        name="physicianPhone"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        defaultValue=""
                        onInput={(e) => e.target.value = e.target.value.replace(/\D/g, '')}
                      />
                    </label>

                    <label>Pharmacy Name: <input type="text" name="pharmacyName" defaultValue="" /></label>

                    <label>Phone Number:
                      <input
                        type="text"
                        name="pharmacyPhone"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        defaultValue=""
                        onInput={(e) => e.target.value = e.target.value.replace(/\D/g, '')}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset>
                    <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Fitzpatrick Skin Type</h3>
                    <p style={{ marginBottom: '1rem' }}>Which of the following best describes your skin using Fitzpatrick scale? Please select one:</p>
                    <div className="radio-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                        <label><input type="radio" name="fitzpatrick" value="fair" defaultChecked={false} /> Fair - always burns - never tans</label>
                        <label><input type="radio" name="fitzpatrick" value="light" defaultChecked={false}/> Light Skin Tones - can burn, sometimes tans</label>
                        <label><input type="radio" name="fitzpatrick" value="light-brown"defaultChecked={false} /> Light brown skin - burns minimally, tans easily</label>
                        <label><input type="radio" name="fitzpatrick" value="medium"defaultChecked={false} /> Medium to Olive skin tone - tans easily</label>
                        <label><input type="radio" name="fitzpatrick" value="brown"defaultChecked={false} /> Brown Skin - rarely burns, tans darkly easily</label>
                        <label><input type="radio" name="fitzpatrick" value="dark" defaultChecked={false}/> Dark brown or black skin - never burns, always tans darkly</label>
                    </div>
                </fieldset>

                <fieldset>

                        <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                            Medical History
                        </h3>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                        <div>
                            <label>Are you currently under the care of a physician for any reason?</label>
                            <div className="radio-group" style={{ display: 'flex', gap: '1rem' }}>
                                <label><input type="radio" name="underPhysician" value="yes" /> Yes</label>
                                <label><input type="radio" name="underPhysician" value="no" /> No</label>
                            </div>
                        </div>

                        <label>If Yes, for what: <input type="text" name="reasonForCare" /></label>

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
                                <label>{item.label}</label>
                                <div className="radio-group" style={{ display: 'flex', gap: '1rem' }}>
                                    <label><input type="radio" name={item.name} value="yes" /> Yes</label>
                                    <label><input type="radio" name={item.name} value="no" /> No</label>
                                </div>
                            </div>
                        ))}

                        <label>
                            Current Home Skin Care:
                            <textarea name="homeSkinCare" rows="2" style={{ width: '100%', marginTop: '0.5rem' }} />
                        </label>
                    </div>
                </fieldset>

                <fieldset>

                        <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                            Smoking / Drinking / Caffeine Intake
                        </h3>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                        <div>
                            <label>Are you a smoker?</label>
                            <div className="radio-group" style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                <label><input type="radio" name="smoker" value="yes" /> Yes</label>
                                <label><input type="radio" name="smoker" value="no" /> No</label>
                            </div>
                        </div>

                        <label>
                            If you are an ex-smoker, for how long are you smoke free?
                            <input type="text" name="smokeFreeDuration" style={{ marginLeft: '0.5rem' }} />
                        </label>

                        <label>
                            How much are (were) you smoking?
                            <input type="text" name="smokingAmount" style={{ marginLeft: '0.5rem' }} />
                        </label>

                        <label>
                            For how long?
                            <input type="text" name="smokingDuration" style={{ marginLeft: '0.5rem' }} />
                        </label>

                        <label>
                            How much alcohol do you drink per week?
                            <input type="text" name="alcoholIntake" style={{ marginLeft: '0.5rem' }} />
                        </label>

                        <label>
                            Caffeine per week?
                            <input type="text" name="caffeineIntake" style={{ marginLeft: '0.5rem' }} />
                        </label>
                    </div>
                </fieldset>

                <fieldset>

                        <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                            List Allergies
                        </h3>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                        <div className="checkbox-group" style={{ display: 'grid', gap: '0.5rem' }}>
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
                                <label key={value}>
                                    <input type="checkbox" name="allergies" value={value} /> {label}
                                </label>
                            ))}

                            <label>
                                <input type="checkbox" name="allergies" value="other" />
                                Other / Not Listed:
                                <input
                                    type="text"
                                    name="otherAllergyDetails"
                                    placeholder="Please specify"
                                    style={{ marginLeft: '0.5rem' }}
                                />
                            </label>
                        </div>
                    </div>
                </fieldset>

                <fieldset>

                        <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                            Medical History
                        </h3>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                        <div className="checkbox-group" style={{ display: 'grid', gap: '0.5rem' }}>
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
                                <label key={value}>
                                    <input type="checkbox" name="medicalHistory" value={value} /> {label}
                                </label>
                            ))}
                            <label>
                                <input type="checkbox" name="medicalHistory" value="coldSores" />
                                Mouth / Cold Sores (if yes, when was your last outbreak?)
                                <input
                                    type="text"
                                    name="coldSoreOutbreak"
                                    placeholder="Last outbreak date"
                                    style={{ marginLeft: '0.5rem' }}
                                />
                            </label>
                        </div>
                    </div>
                </fieldset>
                <fieldset>

                        <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                            Exercise
                        </h3>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
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
                                        <input type="checkbox" name="exerciseTypes" value={value} /> {label}
                                    </label>
                                ))}
                            </div>
                        </div>

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
                                        <input type="checkbox" name="exerciseFrequency" value={value} /> {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label>What is the average duration of exercise you get at one time?</label>
                            <input type="number" name="exerciseDuration" placeholder="Minutes" />
                        </div>

                        <div>
                            <label>Are you experiencing difficulty with exercise routine?</label>
                            <div className="radio-group">
                                <label><input type="radio" name="exerciseDifficulty" value="yes" /> Yes</label>
                                <label><input type="radio" name="exerciseDifficulty" value="no" /> No</label>
                            </div>
                            <label>If yes, explain:</label>
                            <input type="text" name="exerciseDifficultyExplanation" />
                        </div>

                        <div>
                            <label>Pain with exercising?</label>
                            <div className="radio-group">
                                <label><input type="radio" name="exercisePain" value="yes" /> Yes</label>
                                <label><input type="radio" name="exercisePain" value="no" /> No</label>
                            </div>
                            <label>If yes, explain:</label>
                            <input type="text" name="exercisePainExplanation" />
                        </div>

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
                                        <input type="radio" name="workoutPreference" value={value} /> {label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </fieldset>

                <fieldset>

                        <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                            Male Hormone Review
                        </h3>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                        <div>
                            <label>Date of last prostate exam:</label>
                            <div className="radio-group">
                                <label><input type="radio" name="prostateExam" value="normal" /> Normal</label>
                                <label><input type="radio" name="prostateExam" value="abnormal" /> Abnormal</label>
                            </div>
                        </div>

                        <div>
                            <label>
                                Energy on a scale of 1–10 with 1 being low:
                                <select name="energy">
                                    {[...Array(10).keys()].map(i => <option key={i + 1}>{i + 1}</option>)}
                                </select>
                            </label>
                        </div>

                        <div>
                            <label>
                                Mood on a scale of 1–10 with 1 being low:
                                <select name="mood">
                                    {[...Array(10).keys()].map(i => <option key={i + 1}>{i + 1}</option>)}
                                </select>
                            </label>
                        </div>

                        <div>
                            <label>
                                Libido on a scale of 1–10 with 1 being low:
                                <select name="libido">
                                    {[...Array(10).keys()].map(i => <option key={i + 1}>{i + 1}</option>)}
                                </select>
                            </label>
                        </div>

                        <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>
                            Please review the following list and indicate CURRENT symptoms with a "C" and PAST symptoms with a "P"
                        </p>

                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {[
                                ['bladderEmptying', 'Bladder not emptying completely'],
                                ['erectionMaintain', "Can't maintain an erection"],
                                ['crookedErection', 'Crooked/curved erection'],
                                ['streamInitiation', 'Difficulty initiating stream'],
                                ['enlargedProstate', 'Enlarged prostate'],
                                ['lessFirmErections', 'Erections less firm'],
                                ['lowerSexInterest', 'Lower sex interest'],
                            ].map(([name, label]) => (
                                <label key={name}>
                                    {label}: <input type="text" name={name} />
                                </label>
                            ))}
                        </div>
                    </div>
                </fieldset>
                <fieldset>
                  <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                    Female Hormone Review
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                    <div className="form-row">
                      <div className="gform-group">
                        <label>Date of the 1st day of last period</label>
                        <input type="date" name="lastPeriodDate" defaultValue= "" />
                      </div>
                      <div className="gform-group">
                        <label>Or Date of Menopause:</label>
                        <input type="date" name="menopauseDate" defaultValue="" />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="gform-group full-width">
                        <label>Birth Control Method:</label>
                        <textarea name="birthControlMethod" rows="2" defaultValue=""></textarea>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="gform-group full-width">
                        <label>Are you currently or do you plan on becoming pregnant?</label>
                        <input type="text" name="pregnancyIntent" defaultValue="" />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="gform-group">
                        <label>Date of last Pap test:</label>
                        <input type="date" name="papDate" defaultValue="" />
                        <div className="radio-group">
                          <label>
                            <input
                              type="radio"
                              name="papStatus"
                              value="normal"
                              defaultChecked=""
                            /> normal
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="papStatus"
                              value="abnormal"
                              defaultChecked=""
                            /> abnormal
                          </label>
                        </div>
                      </div>

                      <div className="gform-group">
                        <label>Have you ever had an abnormal Pap?</label>
                        <div className="radio-group">
                          <label>
                            <input
                              type="radio"
                              name="abnormalPap"
                              value="yes"
                              defaultChecked=""
                            /> Yes
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="abnormalPap"
                              value="no"
                              defaultChecked=""
                            /> No
                          </label>
                        </div>
                        <label>If yes, When?</label>
                        <input
                          type="date"
                          name="abnormalPapDate"
                          defaultValue=""
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="gform-group">
                        <label>Date of last Mammogram:</label>
                        <input
                          type="date"
                          name="mammogramDate"
                          defaultValue=""
                        />
                        <div className="radio-group">
                          <label>
                            <input
                              type="radio"
                              name="mammogramStatus"
                              value="normal"
                              defaultChecked=""
                            /> normal
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="mammogramStatus"
                              value="abnormal"
                              defaultChecked=""
                            /> abnormal
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>


                <section>
                    <h2>Review of Systems</h2>
                    <p>Please check any that apply:</p>

                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Adrenal</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
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
                          const value = label; // or use a slugified version
                          return (
                            <label key={`adrenal-${idx}`}>
                              <input
                                type="checkbox"
                                name="adrenal"
                                value={value}
                                defaultChecked=""
                              />{' '}
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>


                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Urinary</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                        {[
                          'Blood in urine',
                          'Urgent urination',
                          'Frequent urination'
                        ].map((label, idx) => {
                          const value = label; // or use camelCase or slugs if preferred
                          return (
                            <label key={`urinary-${idx}`}>
                              <input
                                type="checkbox"
                                name="urinary"
                                value={value}
                                defaultChecked=""
                              />{' '}
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>


                   <fieldset>
                     <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Metabolic or T4</h3>
                     <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                       {[
                         'Decreased memory/concentration',
                         'Depression/Anxiety',
                         "Can't multi-task well",
                         'Low ambition/motivation',
                         'Foggy/spacey/muddled mind',
                         'Hard to follow train of thought'
                       ].map((label, idx) => (
                         <label key={`metabolic-t4-${idx}`}>
                           <input
                             type="checkbox"
                             name="metabolicT4"
                             value={label}
                             defaultChecked=""
                           />{' '}
                           {label}
                         </label>
                       ))}
                     </div>
                   </fieldset>


                   <fieldset>
                     <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Neuro-cognitive/Psych</h3>
                     <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
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
                         <label key={`neuro-${idx}`}>
                           <input
                             type="checkbox"
                             name="neuro"
                             value={label}
                             defaultChecked=""
                           />{' '}
                           {label}
                         </label>
                       ))}
                     </div>
                   </fieldset>


                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Metabolism</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
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
                          <label key={`metabolism-${idx}`}>
                            <input
                              type="checkbox"
                              name="metabolism"
                              value={label}
                              defaultChecked=""
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>


                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                        Cardiovascular/Respiratory
                      </h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
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
                          <label key={`cardio-${idx}`}>
                            <input
                              type="checkbox"
                              name="cardio"
                              value={label}
                              defaultChecked=""
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>


                   <fieldset>
                     <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>GI</h3>
                     <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
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
                         'Black tarry stools'
                       ].map((label, idx) => (
                         <label key={`gi-${idx}`}>
                           <input
                             type="checkbox"
                             name="gi"
                             value={label}
                             defaultChecked=""
                           />{' '}
                           {label}
                         </label>
                       ))}
                     </div>
                   </fieldset>


                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Immune system</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                        {[
                          'Frequent colds or flus',
                          'Rash across face and cheeks',
                          'Patchy red rash on body',
                          'Arthritis in fingers and hands',
                          'Asthma/wheezing',
                          'Patchy hair loss'
                        ].map((label, idx) => (
                          <label key={`immune-${idx}`}>
                            <input
                              type="checkbox"
                              name="immune"
                              value={label}
                              defaultChecked=""
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Metabolic, T3, or Adrenal</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
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
                          'Chronic fatigue'
                        ].map((label, idx) => (
                          <label key={`metabolicT3-${idx}`}>
                            <input
                              type="checkbox"
                              name="metabolicT3"
                              value={label}
                              defaultChecked=""
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Hypersensitivity</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
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
                          <label key={`hypersensitivity-${idx}`}>
                            <input
                              type="checkbox"
                              name="hypersensitivity"
                              value={label}
                              defaultChecked=""
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>


                   <fieldset>
                     <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Other</h3>
                     <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                       {['Unusual bruising', 'Nose bleeds', 'Prolonged bleeding'].map((label, idx) => (
                         <label key={`other-${idx}`}>
                           <input
                             type="checkbox"
                             name="other"
                             value={label}
                             defaultChecked=""
                           />{' '}
                           {label}
                         </label>
                       ))}
                     </div>
                   </fieldset>

                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Skin Conditions</h3>
                      <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                        {['Acne', 'Melasma', 'Vitiligo', 'Keloid Scarring'].map((label, idx) => (
                          <label key={`skin-${idx}`}>
                            <input
                              type="checkbox"
                              name="skinConditions"
                              value={label}
                              defaultChecked=""
                            />{' '}
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                </section>
                <section>
                    <div style={{ gap: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
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
                          <fieldset key={key} style={{ marginBottom: '1rem' }}>
                            <legend>{label}</legend>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <label>
                                <input type="radio" name={`${key}_status`} value="Yes" /> Yes
                              </label>
                              <label>
                                <input type="radio" name={`${key}_status`} value="No" /> No
                              </label>

                              <label>
                                If so, when? <input type="text" name={`${key}_when`} />
                              </label>

                              <label>
                                Results <input type="text" name={`${key}_results`} />
                              </label>
                            </div>
                          </fieldset>
                        );
                      })}
                    </div>

                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                        Tattoos, Permanent Makeup
                      </h3>
                      <label htmlFor="tattoos" style={{ display: 'block', marginTop: '0.5rem' }}>
                        Please describe location, type, or any relevant notes:
                      </label>
                      <textarea
                        name="tattoos"
                        id="tattoos"
                        rows="2"
                        style={{ width: '100%', resize: 'vertical' }}
                      ></textarea>
                    </fieldset>


                   <fieldset>
                     <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>
                       List Medical Issues Not Listed Above
                     </h3>
                     <label htmlFor="otherMedicalIssues" style={{ display: 'block', marginTop: '0.5rem' }}>
                       Please describe any additional medical issues:
                     </label>
                     <textarea
                       name="otherMedicalIssues"
                       id="otherMedicalIssues"
                       rows="2"
                       style={{ width: '100%', resize: 'vertical' }}
                     ></textarea>
                   </fieldset>

                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Concerns</h3>
                      <div style={{ gap: '1rem', textAlign: 'left' }}>
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
                            />{" "}
                            {item}
                          </label>
                        ))}
                      </div>
                    </fieldset>


                    <p className='tandc'>
                        I certify that the preceding medical, personal and skin history statements are true and correct. I am aware that it is my responsibility to inform the Certified Advanced Esthetician at [OrganizationName] of my current medical and health conditions and to update this information at subsequent visits. A current history is essential for the provider to execute appropriate treatment procedure.
                    </p>

                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Gender Identity</h3>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {['Woman', 'Man', 'Trans woman', 'Trans man', 'Non-binary'].map((item, idx) => (
                          <label key={`gender-${idx}`}>
                            <input type="radio" name="genderIdentity" value={item} /> {item}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Gender Pronoun</h3>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {['She', 'He', 'They'].map((item, idx) => (
                          <label key={`pronoun-${idx}`} style={{ marginRight: '1rem' }}>
                            <input type="radio" name="genderPronoun" value={item} /> {item}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <label><strong>BEFORE File Upload</strong></label>
                      <FileUploader onFilesSelected={setBeforePhotos} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {beforePhotos.map((f, idx) => (
                          <img key={idx} src={f.base64Data} alt={f.fileName} style={{ width: 100, marginRight: 10 }} />
                        ))}
                      </div>

                      <label><strong>AFTER File Upload</strong></label>
                      <FileUploader onFilesSelected={setAfterPhotos} />
                      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        {afterPhotos.map((f, idx) => (
                          <img key={idx} src={f.base64Data} alt={f.fileName} style={{ width: 100, marginRight: 10 }} />
                        ))}
                      </div>
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
                        defaultValue={new Date().toISOString().substring(0, 10)}
                      />
                    </label>
                  </div>

                  <div className="form-row signature-row">
                    <label>
                      Guest Signature:
                      <SignaturePad onSave={setGuestSignature} />
                    </label>
                  </div>

                  {/* Provider Info */}
                  <div className="form-row">
                    <label>
                      Provider Name:
                      <input type="text" name="providerName" />
                    </label>

                    <label>
                      Date Signed:
                      <input
                        type="date"
                        name="providerDateSigned"
                        defaultValue={new Date().toISOString().substring(0, 10)}
                      />
                    </label>
                  </div>

                  <div className="form-row signature-row">
                    <label>
                      Provider Signature:
                      <SignaturePad onSave={setProviderSignature} />
                    </label>
                  </div>
                </section>

                <button type="submit" onClick={handleSubmit}>Submit</button>
            </form>
        </div>

        <style>
            {`
            .medical-form {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Arial', sans-serif;
  background: #fff;
  color: #333;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
}

.header {
  text-align: center;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 30px;
  justify-content: space-between;
}

.logo {
  max-width: 120px;
  margin-bottom: 1rem;
}

.subtitle {
  font-size: 0.95rem;
  color: #555;
  margin-top: 0.5rem;
  line-height: 1.5;
}

form h2,
form h3,
form legend {
  font-size: 1.2rem;
  font-weight: bold;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
  color: #2b4c7e;
  padding: 0 0 20px;
}

fieldset {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
  background: #f9f9f9;
}

label {
  display: block;
  margin: 0.5rem 0;
  font-size: 0.95rem;
}

input[type="text"],
input[type="date"],
input[type="number"],
select,
textarea {
  width: 100%;
  padding: 0.5rem;
  margin-top: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

textarea {
  min-height: 80px;
  resize: vertical;
}

input[type="radio"],
input[type="checkbox"] {
  margin-right: 0.5rem;
}
.tandc{margin: 10px 0;line-height: 180%;}
.signature-box {
  width: 100%;
  height: 150px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 0.5rem;
  position: relative;
}

.signature-actions {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.signature-actions button {
  padding: 0.3rem 0.8rem;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.signature-actions button:hover {
  background-color: #c0392b;
}

button[type="submit"] {
  margin-top: 2rem;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background-color: #2b4c7e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button[type="submit"]:hover {
  background-color: #1f375e;
}

@media (max-width: 600px) {
  .medical-form {
    padding: 1rem;
  }

  .signature-box {
    height: 120px;
  }
}
.form-section {
  margin-bottom: 2rem;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.gform-group {
  flex: 1 1 45%;
  display: flex;
  flex-direction: column;
}

.gform-group.full-width {
  flex: 1 1 100%;
}

.gform-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.gform-group input,
.gform-group textarea {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.radio-group {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}
.gst-form-grid {
  max-width: 900px;
  margin: 0 auto;
  font-family: sans-serif;
}

section {
  margin-bottom: 2rem;
}

h2 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #1f3c88;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.25rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.form-row label {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: 0.95rem;
}

.form-row input,
.form-row textarea,
.form-row select {
  padding: 0.5rem;
  font-size: 0.95rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

.signature-container {
  border: 1px solid #ccc;
  width: 100%;
  height: 120px;
  margin-top: 0.5rem;
}

.signature-pad {
  width: 100%;
  height: 100px;
}

button {
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  background-color: #1f3c88;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #3952a3;
}

.confrmwrp{max-width: 800px; margin: 0 auto;padding: 30px;}

.cnfrmcellwrp{margin: 0 0 20px;font-size: 14px; }

.cnfrmcellwrp label{margin: 0 0 10px;display: block;font-weight: bold;}

.cnfrmcellwrp input[type='checkbox']{display: inline-block;margin: 0 7px 0 0;}
            `}
        </style>
</>
    );
};


export default GuestConsentForm;
