import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../config";

const GuestConsentHistoryForm = ({ custId }) => {
  const [formData, setFormData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
      const fetchGuestForm = async () => {
        try {
          const qp = new URLSearchParams({ custId, formId: 2 }).toString();
          const res = await fetch(`${API_BASE_URL}/api/forms/submission?${qp}`, {
            credentials: "include",
          });
          if (!res.ok) throw new Error(await res.text());

          const data = await res.json();
          setFormData(JSON.parse(data.submissionData));
        } catch (err) {
          console.error("Failed to load guest consent form:", err.message);
        }
      };

      fetchGuestForm();
    }, [custId]);

    if (!formData) {
      return <p>No medical history available.</p>;
    }

  return (
      <>
          <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
            <strong>{new Date().toISOString().substring(0, 10)}</strong> — Medical History
            <br />
            <span style={{ fontSize: '0.9rem', color: '#666' }}>Provider: {formData.providerName}</span>
            <br />
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{ padding: '0.4rem 0.8rem', marginTop: '0.5rem', background: '#1f3c88', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
          </div>

          {showDetails && (
            <div className="medical-form">
                          <div className="header">
                              <img src="/organization-logo.png" alt="Organization Logo" className="logo" />
                              <h1>MEDICAL HISTORY FORM</h1>

                          </div>
                          <p className="subtitle">
                                  CLIENT INFORMATION AND MEDICAL HISTORY<br />
                                  To provide you with the most appropriate treatment, we need you to complete the following questionnaire. All the information is confidential and HIPAA Compliant
                              </p>

                          <form className="gst-form-grid">
                              <fieldset>
                                  <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Client Information</h3>
                                  <div className="form-row">
                                      <label>
                                        Client Name:
                                        <input
                                          type="text"
                                          name="clientName"
                                          defaultValue={formData?.clientName || custName}
                                          readOnly
                                        />
                                      </label>

                                      <label>
                                        Street:
                                        <input
                                          type="text"
                                          name="street"
                                          defaultValue={formData?.street}
                                          readOnly
                                        />
                                      </label>
                                    </div>

                                    <div className="form-row">
                                      <label>
                                        City:
                                        <input
                                          type="text"
                                          name="city"
                                          defaultValue={formData?.city}
                                          readOnly
                                        />
                                      </label>

                                      <label>
                                        State:
                                        <input
                                          type="text"
                                          name="state"
                                          defaultValue={formData?.state}
                                          readOnly
                                        />
                                      </label>
                                    </div>

                                    <div className="form-row">
                                      <label>
                                        Zip:
                                        <input
                                          type="text"
                                          name="zip"
                                          defaultValue={formData?.zip}
                                          readOnly
                                        />
                                      </label>

                                      <label>
                                        Date:
                                        <input
                                          type="date"
                                          name="date"
                                          defaultValue={formData?.date}
                                          readOnly
                                        />
                                      </label>
                                    </div>
                              </fieldset>

                              <fieldset>
                                <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Emergency Contact(s)</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                                  <label>
                                    Name:
                                    <input
                                      type="text"
                                      name="emergencyName"
                                      defaultValue={formData?.emergencyName}
                                      readOnly
                                    />
                                  </label>

                                  <label>
                                    Phone Number:
                                    <input
                                      type="text"
                                      name="emergencyPhone"
                                      defaultValue={formData?.emergencyPhone}
                                      readOnly
                                    />
                                  </label>

                                  <label>
                                    Primary Physician:
                                    <input
                                      type="text"
                                      name="physician"
                                      defaultValue={formData?.physician}
                                      readOnly
                                    />
                                  </label>

                                  <label>
                                    Phone Number:
                                    <input
                                      type="text"
                                      name="physicianPhone"
                                      defaultValue={formData?.physicianPhone}
                                      readOnly
                                    />
                                  </label>

                                  <label>
                                    Pharmacy Name:
                                    <input
                                      type="text"
                                      name="pharmacyName"
                                      defaultValue={formData?.pharmacyName}
                                      readOnly
                                    />
                                  </label>

                                  <label>
                                    Phone Number:
                                    <input
                                      type="text"
                                      name="pharmacyPhone"
                                      defaultValue={formData?.pharmacyPhone}
                                      readOnly
                                    />
                                  </label>
                                </div>
                              </fieldset>

                              <fieldset>
                                <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Fitzpatrick Skin Type</h3>
                                <p style={{ marginBottom: '1rem' }}>
                                  Which of the following best describes your skin using Fitzpatrick scale? Please select one:
                                </p>

                                <div
                                  className="radio-group"
                                  style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}
                                >
                                  <label>
                                    <input
                                      type="radio"
                                      name="fitzpatrick"
                                      value="fair"
                                      defaultChecked={formData?.fitzpatrick === 'fair'}
                                      disabled
                                    />
                                    Fair - always burns - never tans
                                  </label>

                                  <label>
                                    <input
                                      type="radio"
                                      name="fitzpatrick"
                                      value="light"
                                      defaultChecked={formData?.fitzpatrick === 'light'}
                                      disabled
                                    />
                                    Light Skin Tones - can burn, sometimes tans
                                  </label>

                                  <label>
                                    <input
                                      type="radio"
                                      name="fitzpatrick"
                                      value="light-brown"
                                      defaultChecked={formData?.fitzpatrick === 'light-brown'}
                                      disabled
                                    />
                                    Light brown skin - burns minimally, tans easily
                                  </label>

                                  <label>
                                    <input
                                      type="radio"
                                      name="fitzpatrick"
                                      value="medium"
                                      defaultChecked={formData?.fitzpatrick === 'medium'}
                                      disabled
                                    />
                                    Medium to Olive skin tone - tans easily
                                  </label>

                                  <label>
                                    <input
                                      type="radio"
                                      name="fitzpatrick"
                                      value="brown"
                                      defaultChecked={formData?.fitzpatrick === 'brown'}
                                      disabled
                                    />
                                    Brown Skin - rarely burns, tans darkly easily
                                  </label>

                                  <label>
                                    <input
                                      type="radio"
                                      name="fitzpatrick"
                                      value="dark"
                                      defaultChecked={formData?.fitzpatrick === 'dark'}
                                      disabled
                                    />
                                    Dark brown or black skin - never burns, always tans darkly
                                  </label>
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
                                      <label>
                                        <input
                                          type="radio"
                                          name="underPhysician"
                                          value="yes"
                                          defaultChecked={formData?.underPhysician === "yes"}
                                          disabled
                                        /> Yes
                                      </label>
                                      <label>
                                        <input
                                          type="radio"
                                          name="underPhysician"
                                          value="no"
                                          defaultChecked={formData?.underPhysician === "no"}
                                          disabled
                                        /> No
                                      </label>
                                    </div>
                                  </div>

                                  <label>
                                    If Yes, for what:
                                    <input
                                      type="text"
                                      name="reasonForCare"
                                      defaultValue={formData?.reasonForCare}
                                      disabled
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
                                      <label>{item.label}</label>
                                      <div className="radio-group" style={{ display: 'flex', gap: '1rem' }}>
                                        <label>
                                          <input
                                            type="radio"
                                            name={item.name}
                                            value="yes"
                                            defaultChecked={formData?.[item.name] === "yes"}
                                            disabled
                                          /> Yes
                                        </label>
                                        <label>
                                          <input
                                            type="radio"
                                            name={item.name}
                                            value="no"
                                            defaultChecked={formData?.[item.name] === "no"}
                                            disabled
                                          /> No
                                        </label>
                                      </div>
                                    </div>
                                  ))}

                                  <label>
                                    Current Home Skin Care:
                                    <textarea
                                      name="homeSkinCare"
                                      rows="2"
                                      style={{ width: '100%', marginTop: '0.5rem' }}
                                      defaultValue={formData?.homeSkinCare}
                                      disabled
                                    />
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
                                      <label>
                                        <input
                                          type="radio"
                                          name="smoker"
                                          value="yes"
                                          defaultChecked={formData?.smoker === "yes"}
                                          disabled
                                        /> Yes
                                      </label>
                                      <label>
                                        <input
                                          type="radio"
                                          name="smoker"
                                          value="no"
                                          defaultChecked={formData?.smoker === "no"}
                                          disabled
                                        /> No
                                      </label>
                                    </div>
                                  </div>

                                  <label>
                                    If you are an ex-smoker, for how long are you smoke free?
                                    <input
                                      type="text"
                                      name="smokeFreeDuration"
                                      defaultValue={formData?.smokeFreeDuration}
                                      disabled
                                      style={{ marginLeft: '0.5rem' }}
                                    />
                                  </label>

                                  <label>
                                    How much are (were) you smoking?
                                    <input
                                      type="text"
                                      name="smokingAmount"
                                      defaultValue={formData?.smokingAmount}
                                      disabled
                                      style={{ marginLeft: '0.5rem' }}
                                    />
                                  </label>

                                  <label>
                                    For how long?
                                    <input
                                      type="text"
                                      name="smokingDuration"
                                      defaultValue={formData?.smokingDuration}
                                      disabled
                                      style={{ marginLeft: '0.5rem' }}
                                    />
                                  </label>

                                  <label>
                                    How much alcohol do you drink per week?
                                    <input
                                      type="text"
                                      name="alcoholIntake"
                                      defaultValue={formData?.alcoholIntake}
                                      disabled
                                      style={{ marginLeft: '0.5rem' }}
                                    />
                                  </label>

                                  <label>
                                    Caffeine per week?
                                    <input
                                      type="text"
                                      name="caffeineIntake"
                                      defaultValue={formData?.caffeineIntake}
                                      disabled
                                      style={{ marginLeft: '0.5rem' }}
                                    />
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
                                        <input
                                          type="checkbox"
                                          name="allergies"
                                          value={value}
                                          checked={formData?.allergies?.includes(value)}
                                          disabled
                                        /> {label}
                                      </label>
                                    ))}

                                    <label>
                                      <input
                                        type="checkbox"
                                        name="allergies"
                                        value="other"
                                        checked={formData?.allergies?.includes("other")}
                                        disabled
                                      />
                                      Other / Not Listed:
                                      <input
                                        type="text"
                                        name="otherAllergyDetails"
                                        value={formData?.otherAllergyDetails || ""}
                                        readOnly
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
                                        <input
                                          type="checkbox"
                                          name="medicalHistory"
                                          value={value}
                                          checked={formData?.medicalHistory?.includes(value)}
                                          disabled
                                        /> {label}
                                      </label>
                                    ))}

                                    <label>
                                      <input
                                        type="checkbox"
                                        name="medicalHistory"
                                        value="coldSores"
                                        checked={formData?.medicalHistory?.includes("coldSores")}
                                        disabled
                                      />
                                      Mouth / Cold Sores (if yes, when was your last outbreak?)
                                      <input
                                        type="text"
                                        name="coldSoreOutbreak"
                                        value={formData?.coldSoreOutbreak || ''}
                                        readOnly
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
                                          <input
                                            type="checkbox"
                                            name="exerciseTypes"
                                            value={value}
                                            checked={formData?.exerciseTypes?.includes(value)}
                                            disabled
                                          /> {label}
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
                                          <input
                                            type="checkbox"
                                            name="exerciseFrequency"
                                            value={value}
                                            checked={formData?.exerciseFrequency?.includes(value)}
                                            disabled
                                          /> {label}
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <label>What is the average duration of exercise you get at one time?</label>
                                    <input
                                      type="number"
                                      name="exerciseDuration"
                                      value={formData?.exerciseDuration || ''}
                                      readOnly
                                      placeholder="Minutes"
                                    />
                                  </div>

                                  <div>
                                    <label>Are you experiencing difficulty with exercise routine?</label>
                                    <div className="radio-group">
                                      <label>
                                        <input
                                          type="radio"
                                          name="exerciseDifficulty"
                                          value="yes"
                                          checked={formData?.exerciseDifficulty === 'yes'}
                                          disabled
                                        /> Yes
                                      </label>
                                      <label>
                                        <input
                                          type="radio"
                                          name="exerciseDifficulty"
                                          value="no"
                                          checked={formData?.exerciseDifficulty === 'no'}
                                          disabled
                                        /> No
                                      </label>
                                    </div>
                                    <label>If yes, explain:</label>
                                    <input
                                      type="text"
                                      name="exerciseDifficultyExplanation"
                                      value={formData?.exerciseDifficultyExplanation || ''}
                                      readOnly
                                    />
                                  </div>

                                  <div>
                                    <label>Pain with exercising?</label>
                                    <div className="radio-group">
                                      <label>
                                        <input
                                          type="radio"
                                          name="exercisePain"
                                          value="yes"
                                          checked={formData?.exercisePain === 'yes'}
                                          disabled
                                        /> Yes
                                      </label>
                                      <label>
                                        <input
                                          type="radio"
                                          name="exercisePain"
                                          value="no"
                                          checked={formData?.exercisePain === 'no'}
                                          disabled
                                        /> No
                                      </label>
                                    </div>
                                    <label>If yes, explain:</label>
                                    <input
                                      type="text"
                                      name="exercisePainExplanation"
                                      value={formData?.exercisePainExplanation || ''}
                                      readOnly
                                    />
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
                                          <input
                                            type="radio"
                                            name="workoutPreference"
                                            value={value}
                                            checked={formData?.workoutPreference === value}
                                            disabled
                                          /> {label}
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
                                      <label>
                                        <input
                                          type="radio"
                                          name="prostateExam"
                                          value="normal"
                                          checked={formData?.prostateExam === 'normal'}
                                          disabled
                                        /> Normal
                                      </label>
                                      <label>
                                        <input
                                          type="radio"
                                          name="prostateExam"
                                          value="abnormal"
                                          checked={formData?.prostateExam === 'abnormal'}
                                          disabled
                                        /> Abnormal
                                      </label>
                                    </div>
                                  </div>

                                  <div>
                                    <label>
                                      Energy on a scale of 1–10 with 1 being low:
                                      <select name="energy" value={formData?.energy || ''} disabled>
                                        {[...Array(10).keys()].map(i => (
                                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>

                                  <div>
                                    <label>
                                      Mood on a scale of 1–10 with 1 being low:
                                      <select name="mood" value={formData?.mood || ''} disabled>
                                        {[...Array(10).keys()].map(i => (
                                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>

                                  <div>
                                    <label>
                                      Libido on a scale of 1–10 with 1 being low:
                                      <select name="libido" value={formData?.libido || ''} disabled>
                                        {[...Array(10).keys()].map(i => (
                                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                                        ))}
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
                                        {label}: <input
                                          type="text"
                                          name={name}
                                          value={formData?.[name] || ''}
                                          readOnly
                                        />
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
                                      <input
                                        type="date"
                                        name="lastPeriodDate"
                                        value={formData?.lastPeriodDate || ''}
                                        readOnly
                                      />
                                    </div>
                                    <div className="gform-group">
                                      <label>Or Date of Menopause:</label>
                                      <input
                                        type="date"
                                        name="menopauseDate"
                                        value={formData?.menopauseDate || ''}
                                        readOnly
                                      />
                                    </div>
                                  </div>

                                  <div className="form-row">
                                    <div className="gform-group full-width">
                                      <label>Birth Control Method:</label>
                                      <textarea
                                        name="birthControlMethod"
                                        rows="2"
                                        value={formData?.birthControlMethod || ''}
                                        readOnly
                                      />
                                    </div>
                                  </div>

                                  <div className="form-row">
                                    <div className="gform-group full-width">
                                      <label>Are you currently or do you plan on becoming pregnant?</label>
                                      <input
                                        type="text"
                                        name="pregnancyIntent"
                                        value={formData?.pregnancyIntent || ''}
                                        readOnly
                                      />
                                    </div>
                                  </div>

                                  <div className="form-row">
                                    <div className="gform-group">
                                      <label>Date of last Pap test:</label>
                                      <input
                                        type="date"
                                        name="papDate"
                                        value={formData?.papDate || ''}
                                        readOnly
                                      />
                                      <div className="radio-group">
                                        <label>
                                          <input
                                            type="radio"
                                            name="papStatus"
                                            value="normal"
                                            checked={formData?.papStatus === 'normal'}
                                            disabled
                                          /> normal
                                        </label>
                                        <label>
                                          <input
                                            type="radio"
                                            name="papStatus"
                                            value="abnormal"
                                            checked={formData?.papStatus === 'abnormal'}
                                            disabled
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
                                            checked={formData?.abnormalPap === 'yes'}
                                            disabled
                                          /> Yes
                                        </label>
                                        <label>
                                          <input
                                            type="radio"
                                            name="abnormalPap"
                                            value="no"
                                            checked={formData?.abnormalPap === 'no'}
                                            disabled
                                          /> No
                                        </label>
                                      </div>
                                      <label>If yes, When?</label>
                                      <input
                                        type="date"
                                        name="abnormalPapDate"
                                        value={formData?.abnormalPapDate || ''}
                                        readOnly
                                      />
                                    </div>
                                  </div>

                                  <div className="form-row">
                                    <div className="gform-group">
                                      <label>Date of last Mammogram:</label>
                                      <input
                                        type="date"
                                        name="mammogramDate"
                                        value={formData?.mammogramDate || ''}
                                        readOnly
                                      />
                                      <div className="radio-group">
                                        <label>
                                          <input
                                            type="radio"
                                            name="mammogramStatus"
                                            value="normal"
                                            checked={formData?.mammogramStatus === 'normal'}
                                            disabled
                                          /> normal
                                        </label>
                                        <label>
                                          <input
                                            type="radio"
                                            name="mammogramStatus"
                                            value="abnormal"
                                            checked={formData?.mammogramStatus === 'abnormal'}
                                            disabled
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

                                {[
                                  {
                                    title: 'Adrenal',
                                    name: 'adrenal',
                                    items: [
                                      'Fainting/collapse', 'Palpitations', 'Salt craving', 'Muscle tension', 'Easily frustrated',
                                      'Sweat easily -palms/armpits', 'Sugar craving', 'Panic attacks', 'Feeling overwhelmed',
                                      'Excessive hunger', 'Prone to infection/sickly', 'Low blood pressure',
                                      'Light headed when standing up', 'Racing mind,prevent sleep',
                                      'Sluggish in the morning-slow start', 'Need sunglasses in bright light',
                                      'Low back pain-worse with fatigue/stress'
                                    ]
                                  },
                                  {
                                    title: 'Urinary',
                                    name: 'urinary',
                                    items: ['Blood in urine', 'Urgent urination', 'Frequent urination']
                                  },
                                  {
                                    title: 'Metabolic or T4',
                                    name: 'metabolicT4',
                                    items: [
                                      'Decreased memory/concentration', 'Depression/Anxiety', 'Can\'t multi-task well',
                                      'Low ambition/motivation', 'Foggy/spacey/muddled mind', 'Hard to follow train of thought'
                                    ]
                                  },
                                  {
                                    title: 'Neuro-cognitive/Psych',
                                    name: 'neuro',
                                    items: [
                                      'Loss of self-esteem', 'Feeling of hopelessness', 'Feeling defeated', 'Loss of confidence',
                                      'Mood swings', 'Sense of powerlessness', 'Decreased sense of well-being',
                                      'Apathy/losing interest in life', 'Vision deterioting', 'Hearing deteriorating',
                                      'Memory deteriorating', 'Balance deteriorating', 'Coordination deteriorating',
                                      'Change in headaches', 'Double vision', 'Dizzy/spinning'
                                    ]
                                  },
                                  {
                                    title: 'Metabolism',
                                    name: 'metabolism',
                                    items: [
                                      'Excessive thirst', 'Cannot skip meals', 'Headache if meal is missed',
                                      'Craving for sugar and carbs', 'Mid-afternoon drowsiness', 'Low energy periods relieved with foodrelieved',
                                      'Jittery/irritable episodes relieved w/food', 'Alternate between high and low moods',
                                      'Alternate between sluggish/high energy', 'High blood pressure', 'Skin tags at neck and armpits',
                                      'High cholesterol/triglycerides', 'Increased fat around abdomen', 'Prone to inflammation'
                                    ]
                                  },
                                  {
                                    title: 'Cardiovascular/Respiratory',
                                    name: 'cardio',
                                    items: [
                                      'Chest pain', 'Blood in sputum', 'Unusual cough', 'Shortness of breath', 'Swollen ankles',
                                      'Rapid heart beat', 'Leg pain with walking', 'Snoring excessively', 'Fainting/collapsing'
                                    ]
                                  },
                                  {
                                    title: 'GI',
                                    name: 'gi',
                                    items: [
                                      'Fluid retention', 'Bright blood in stool', 'Difficulty swallowing', 'Loss of appetite',
                                      'Persistent nausea', 'Bloating', 'Abdominal pain', 'Acid reflex',
                                      'Recent change in bowel habit', 'Weight loss- unexpected', 'Black tarry stools'
                                    ]
                                  },
                                  {
                                    title: 'Immune system',
                                    name: 'immune',
                                    items: [
                                      'Frequent colds or flus', 'Rash across face and cheeks', 'Patchy red rash on body',
                                      'Arthritis in fingers and hands', 'Asthma/wheezing', 'Patchy hair loss'
                                    ]
                                  },
                                  {
                                    title: 'Metabolic, T3, or Adrenal',
                                    name: 'metabolicT3',
                                    items: [
                                      'Migraines', 'Constipation', 'Fluid retention', 'Crave caffeine', 'Dry coarse skin',
                                      'Deepening voice', 'Dry or thinning hair', 'Cold hands and feet', 'Elevated cholestrol',
                                      'Low body temperature', 'Fatigue/exhausted by day\'s end', 'Brittle unhealthy nails',
                                      'Fibromyalgia', 'Chronic fatigue'
                                    ]
                                  },
                                  {
                                    title: 'Hypersensitivity',
                                    name: 'hypersensitivity',
                                    items: [
                                      'Symptoms are year around', 'Symptoms are seasonal', 'Irritated tongue',
                                      'Recurrent canker sores', 'Diarrhea/constipation', 'Dandruff/itchy scalp',
                                      'Eczema/dermatitis', 'Dizziness', 'Wheezing', 'Chronic cough', 'Sinus congestion',
                                      'Nasal congestion', 'Excessive mucus'
                                    ]
                                  },
                                  {
                                    title: 'Other',
                                    name: 'other',
                                    items: ['Unusual bruising', 'Nose bleeds', 'Prolonged bleeding']
                                  },
                                  {
                                    title: 'Skin Conditions',
                                    name: 'skinConditions',
                                    items: ['Acne', 'Melasma', 'Vitiligo', 'Keloid Scarring']
                                  }
                                ].map((section, i) => (
                                  <fieldset key={i}>
                                    <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>{section.title}</h3>
                                    <div style={{ gap: '1rem', textAlign: 'left' }}>
                                      {section.items.map((item, idx) => (
                                        <label key={`${section.name}-${idx}`}>
                                          <input
                                            type="checkbox"
                                            name={section.name}
                                            value={item}
                                            checked={formData?.[section.name]?.includes(item)}
                                            disabled
                                          />{" "}
                                          {item}
                                        </label>
                                      ))}
                                    </div>
                                  </fieldset>
                                ))}
                              </section>

                              <section>
                                <div style={{ gap: '1rem', textAlign: 'left' }}>
                                  {[
                                    'Skin/Light Energy Treatments At Another Office',
                                    'Neurotoxin (Botox, Dysport etc.)',
                                    'Fillers (Restylane, Juvederm etc.)',
                                    'Hair Removal',
                                    'Chemical Peels',
                                    'Sun Exposure/Tanning bed in last week? Tanning Habits'
                                  ].map((item, idx) => (
                                    <fieldset key={idx}>
                                      <strong>{item}</strong>
                                      <div>
                                        <label>
                                          <input type="radio" name={`treatment-${idx}`} value="Yes" disabled
                                            checked={formData?.[`treatment-${idx}`] === 'Yes'} /> Yes
                                        </label>
                                        <label>
                                          <input type="radio" name={`treatment-${idx}`} value="No" disabled
                                            checked={formData?.[`treatment-${idx}`] === 'No'} /> No
                                        </label>
                                      </div>
                                      <label>If so when? <input type="text" value={formData?.[`when-${idx}`] || ''} readOnly /></label>
                                      <label>Results <input type="text" value={formData?.[`results-${idx}`] || ''} readOnly /></label>
                                    </fieldset>
                                  ))}
                                </div>


                                <fieldset>
                                  <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Tattoos, Permanent Makeup</h3>
                                  <textarea value={formData?.tattoos || ''} rows="2" style={{ width: '100%', resize: 'vertical' }} readOnly />
                                </fieldset>

                                <fieldset>
                                  <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>List Medical Issues Not Listed Above</h3>
                                  <textarea value={formData?.otherMedicalIssues || ''} rows="2" style={{ width: '100%', resize: 'vertical' }} readOnly />
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
                                        <input type="checkbox" name="concerns" disabled
                                          checked={formData?.concerns?.includes(item)} /> {item}
                                      </label>
                                    ))}
                                  </div>
                                </fieldset>

                                <p className='tandc'>
                                  I certify that the preceding medical, personal and skin history statements are true and correct...
                                </p>

                                <fieldset>
                                  <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Gender Identity</h3>
                                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {['Woman', 'Man', 'Trans woman', 'Trans man', 'Non-binary'].map((item, idx) => (
                                      <label key={`gender-${idx}`}>
                                        <input type="radio" name="genderIdentity" disabled
                                          checked={formData?.genderIdentity === item} /> {item}
                                      </label>
                                    ))}
                                  </div>
                                </fieldset>

                                <fieldset>
                                  <h3 style={{ margin: 0, color: '#2c3e50', textAlign: 'left' }}>Gender Pronoun</h3>
                                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {['She', 'He', 'They'].map((item, idx) => (
                                      <label key={`pronoun-${idx}`} style={{ marginRight: '1rem' }}>
                                        <input type="radio" name="genderPronoun" disabled
                                          checked={formData?.genderPronoun === item} /> {item}
                                      </label>
                                    ))}
                                  </div>
                                </fieldset>

                                <fieldset>
                                  <h3>BEFORE Photos</h3>
                                  {formData?.beforePhotos?.length > 0 ? (
                                    formData.beforePhotos.map((f, idx) => (
                                      <img key={idx} src={f.base64Data} alt={f.fileName} style={{ width: 100, marginRight: 10 }} />
                                    ))
                                  ) : <p>No before photos uploaded.</p>}

                                  <h3>AFTER Photos</h3>
                                  {formData?.afterPhotos?.length > 0 ? (
                                    formData.afterPhotos.map((f, idx) => (
                                      <img key={idx} src={f.base64Data} alt={f.fileName} style={{ width: 100, marginRight: 10 }} />
                                    ))
                                  ) : <p>No after photos uploaded.</p>}
                                </fieldset>
                              </section>

                              <section>
                                <div className="form-row">
                                  <label>Guest Name:
                                    <input
                                      type="text"
                                      name="guestName"
                                      value={formData?.guestName || ''}
                                      readOnly
                                    />
                                  </label>
                                  <label>Date Signed:
                                    <input
                                      type="date"
                                      name="guestDateSigned"
                                      value={formData?.guestDateSigned || ''}
                                      readOnly
                                    />
                                  </label>
                                </div>

                                <div className="form-row signature-row">
                                  <div>
                                    <strong>Guest Signature:</strong><br />
                                    {formData?.guestSignature?.base64Data ? (
                                      <img
                                        src={formData.guestSignature.base64Data}
                                        alt="Guest Signature"
                                        style={{ width: 200, border: '1px solid #ccc', marginTop: '0.5rem' }}
                                      />
                                    ) : (
                                      <p>No signature</p>
                                    )}
                                  </div>
                                </div>

                                <div className="form-row">
                                  <label>Provider Name:
                                    <input
                                      type="text"
                                      name="providerName"
                                      value={formData?.providerName || ''}
                                      readOnly
                                    />
                                  </label>
                                  <label>Date Signed:
                                    <input
                                      type="date"
                                      name="providerDateSigned"
                                      value={formData?.providerDateSigned || ''}
                                      readOnly
                                    />
                                  </label>
                                </div>

                                <div className="form-row signature-row">
                                  <div>
                                    <strong>Provider Signature:</strong><br />
                                    {formData?.providerSignature?.base64Data ? (
                                      <img
                                        src={formData.providerSignature.base64Data}
                                        alt="Provider Signature"
                                        style={{ width: 200, border: '1px solid #ccc', marginTop: '0.5rem' }}
                                      />
                                    ) : (
                                      <p>No signature</p>
                                    )}
                                  </div>
                                </div>
                              </section>
                          </form>
                      </div>
          )}

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


  export default GuestConsentHistoryForm;