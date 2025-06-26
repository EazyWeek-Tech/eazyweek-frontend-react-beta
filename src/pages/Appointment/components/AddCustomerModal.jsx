import React, { useState, useEffect } from "react";
import Toast from "./Toast";
import { API_BASE_URL } from "../../../config";

const AddCustomerModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    mobile: "",
    firstName: "",
    lastName: "",
    email: "",
    gender: "",
    nationalityCountry: "10", // Default to Saudi
    nationality: "",
    nationalityLabel: "",
    nationalityStatus: "",
    nationalitynumber: ""
  });

  const [errors, setErrors] = useState({});
  const [countryOptions, setCountryOptions] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchNationalities = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Master/Nationality/${formData.nationalityCountry}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setCountryOptions(data);
          setFormData((prev) => ({
            ...prev,
            nationality: data[0]?.id?.toString() || "",
            nationalityLabel: data[0]?.name || ""
          }));
        }
      } catch (err) {
        console.error("Nationality fetch error:", err);
      }
    };

    if (formData.nationalityCountry) fetchNationalities();
  }, [formData.nationalityCountry]);

  useEffect(() => {
    const status = formData.nationality === "84" ? "Citizen" : "Expat";
    setFormData((prev) => ({ ...prev, nationalityStatus: status }));
  }, [formData.nationality]);

  const validateField = (fieldId, value) => {
    let error = "";
    switch (fieldId) {
      case "mobile":
        if (!value || !/^\d{10}$/.test(value)) error = "Mobile number must be 10 digits.";
        break;
      case "firstName":
        if (!value) error = "First name is required.";
        break;
      case "lastName":
        if (!value) error = "Last name is required.";
        break;
      case "email":
        if (!value || !/\S+@\S+\.\S+/.test(value)) error = "Enter a valid email.";
        break;
      case "gender":
        if (!value) error = "Select gender.";
        break;
      case "nationality":
        if (!value) error = "Select nationality.";
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [fieldId]: error }));
  };

  const validateForm = () => {
    const formErrors = {};
    let isValid = true;

    if (!formData.mobile || !/^\d{10}$/.test(formData.mobile)) {
      formErrors.mobile = "Mobile number must be 10 digits.";
      isValid = false;
    }
    if (!formData.firstName) {
      formErrors.firstName = "First name is required.";
      isValid = false;
    }
    if (!formData.lastName) {
      formErrors.lastName = "Last name is required.";
      isValid = false;
    }
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      formErrors.email = "Enter a valid email.";
      isValid = false;
    }
    if (!formData.gender) {
      formErrors.gender = "Select gender.";
      isValid = false;
    }
    if (!formData.nationality) {
      formErrors.nationality = "Select nationality.";
      isValid = false;
    }

    setErrors(formErrors);
    return isValid;
  };

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === "nationality") {
      const selected = countryOptions.find((c) => c.id === value);
      setFormData((prev) => ({
        ...prev,
        nationality: value,
        nationalityLabel: selected?.name || ""
      }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    validateField(id, value);
  };

  const createDataHandler = async (dataToSubmit) => {
    console.log('Customer Data:', dataToSubmit);

    try {
      const response = await fetch(`${API_BASE_URL}/api/Appointment/CreateCustomer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
      });

      const data = await response.json();
      console.log('API Response:', data);
      if (response.ok && data.success) {
        setToast({ message: "Customer added successfully!", type: "success" });
        setTimeout(() => onClose(), 2000);
      } else {
        setToast({ message: data.message || "Failed to add customer.", type: "error" });
      }
    } catch (error) {
      console.error(error);
      setToast({ message: "An error occurred. Try again later.", type: "error" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
      const centerCode = stored ? JSON.parse(stored).centerCode : "";

      const payload = {
  id: "",
  mobile: formData.mobile,
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,
  gender: formData.gender,
  nationalityId: Number(formData.nationality),
  nationalityStatus: formData.nationalityStatus,
  centerCode: centerCode,
  fullName: `${formData.firstName} ${formData.lastName}`.trim(),
  custId: ""
};


      createDataHandler(payload);
      console.log(payload)
    }
  };

  return (
    <div className="popouter" id="addcust">
      <div className="popovrly"></div>
      <div className="popin">
        <div className="popuphdr">
          Add Customer
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>

        <div className="popfrm">
          <form onSubmit={handleSubmit}>
            {["mobile", "firstName", "lastName", "email"].map((field) => (
              <div className="frmdiv" key={field}>
                <label htmlFor={field}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}: <span className="rd">*</span>
                </label>
                <div className="inptdiv">
                  <input
                    type="text"
                    id={field}
                    value={formData[field]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors[field] && <div className="error">{errors[field]}</div>}
                </div>
              </div>
            ))}

            <div className="frmdiv">
              <label htmlFor="gender">Gender: <span className="rd">*</span></label>
              <div className="inptdiv">
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && <div className="error">{errors.gender}</div>}
              </div>
            </div>

            <div className="frmdiv">
              <label htmlFor="nationalityCountry">Country:</label>
              <div className="inptdiv">
                <select
                  id="nationalityCountry"
                  value={formData.nationalityCountry}
                  onChange={handleChange}
                >
                  <option value="10">Saudi Arabia</option>
                  <option value="91">Spain</option>
                </select>
              </div>
            </div>

            <div className="frmdiv">
              <label htmlFor="nationality">Nationality: <span className="rd">*</span></label>
              <div className="inptdiv">
                <select
                  id="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <option value="">Select Nationality</option>
                  {countryOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {errors.nationality && <div className="error">{errors.nationality}</div>}
              </div>
            </div>

            {formData.nationality === "84" && (
              <div className="frmdiv">
                <div>Citizenship status of customer is {formData.nationalityStatus}</div>
              </div>
            )}

            <div className="btnbar">
              <input type="submit" className="prilnk" value="Add Customer" />
              <input type="button" className="seclnk" value="Cancel" onClick={onClose} />
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AddCustomerModal;
