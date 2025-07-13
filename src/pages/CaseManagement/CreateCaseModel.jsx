import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";

const CreateCaseModel = ({ isOpen, onClose, onSubmit }) => {
  const [activeTab, setActiveTab] = useState("sign-in");
  const [caseCategories, setCaseCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("");
  const [subSubCategories, setSubSubCategories] = useState([]);
  const [selectedSubCategoryCode, setSelectedSubCategoryCode] = useState("");
  const [subSubSubCategories, setSubSubSubCategories] = useState([]);
  const [selectedSubSubCategoryCode, setSelectedSubSubCategoryCode] =
    useState("");
  const [selectedSubSubSubCategoryCode, setSelectedSubSubSubCategoryCode] =
    useState("");
  const [caseMediums, setCaseMediums] = useState([]);
  const [caseSources, setCaseSources] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [specificResolutions, setSpecificResolutions] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const toastRef = useRef(null);


  useEffect(() => {
    if (toastRef.current) {
      toastRef.current.style.display = "none";
    }

    const fetchCategories = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseCategory/CaseCategory`,
          {
            method: "GET",
             credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Response for Categories");
        console.log(response);
        const data = await response.json();
        console.log("Case create fetching Categories");
        console.log(data);
        setCaseCategories(data);
      } catch (error) {
        console.error("Failed to fetch case categories:", error);
      }
    };

    // case mediums
    const fetchCaseMediums = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseDropDown/Medium`,
          {
            method: "GET",
             credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        console.log("Case create fetching Mediums");
        console.log(data);
        setCaseMediums(data);
      } catch (error) {
        console.error("Error fetching case mediums:", error);
      }
    };

    // Fetch services
    const fetchServices = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseDropDown/Service`,
          {
            method: "GET",
             credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        console.log("Case create fetching Services");
        console.log(data);
        setServices(data);
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    const fetchTherapists = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseDropDown/Medium/Doctors`,
          {
            method: "GET",
             credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        console.log("Case create fetching Therapists");
        console.log(data);
        setTherapists(
          data.filter((doc) => doc.code && doc.name !== "< - Select one - >")
        );
      } catch (error) {
        console.error("Error fetching therapists:", error);
      }
    };

    const fetchServiceCategories = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseCategory/CaseServiceCategory`,
          {
            method: "GET",
             credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        console.log("Case create fetching Service Categories");
        console.log(data);
        setServiceCategories(data);
      } catch (error) {
        console.error("Error fetching service categories:", error);
      }
    };

    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Employees`, {
          method: "GET",
           credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        console.log("Case create fetching employees");
        console.log(data);
        const validEmployees = data.filter(
          (emp) => emp.employeeCode && emp.employeeName !== "Assign To"
        );
        setEmployees(validEmployees);
      } catch (err) {
        console.error("Error fetching employees:", err);
        setEmployees([]);
      }
    };

    fetchCategories();
    fetchCaseMediums();
    fetchServices();
    fetchTherapists();
    fetchServiceCategories();
    fetchEmployees();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const fetchCustomers = async () => {
        if (!customerSearchText.trim()) {
          setCustomerOptions([]);
          return;
        }

        try {
          const res = await fetch(
            `${API_BASE_URL}/api/CaseDropDown/Customer?SearchText=${encodeURIComponent(
              customerSearchText
            )}`,
            {
              method: "GET",
               credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          const data = await res.json();
          console.log("Case create fetching Customer");
          console.log(data);
          setCustomerOptions(data);
        } catch (err) {
          console.error("Error fetching customers:", err);
          setCustomerOptions([]);
        }
      };

      fetchCustomers();
    }, 400); // debounce API calls

    return () => clearTimeout(delayDebounce);
  }, [customerSearchText]);

  useEffect(() => {
    console.log("Triggered CaseOperation fetch with:", {
      selectedCategoryCode,
      selectedSubCategoryCode,
      selectedSubSubCategoryCode,
      selectedSubSubSubCategoryCode,
    });
    if (
      selectedCategoryCode &&
      selectedSubCategoryCode &&
      selectedSubSubCategoryCode &&
      selectedSubSubSubCategoryCode
    ) {
      const fetchCaseOperationDetails = async () => {
        const url = `${API_BASE_URL}/api/CaseOperation/${selectedCategoryCode}/${selectedSubCategoryCode}/${selectedSubSubCategoryCode}/${selectedSubSubSubCategoryCode}`;

        try {
          const response = await fetch(url, {
            method: "GET",
             credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          const data = await response.json();

          if (data.priority) {
            handleChange("priority", data.priority || "");
            console.log(data.priority);
          }

          if (data.mobilephone) {
            handleChange("employeno", data.mobilephone.trim());
          }

          if (data.firstemailid && data.assignTOName) {
            handleChange("email", data.firstemailid.trim());
            handleChange("emailDisplay", data.assignTOName);
          }

          handleChange("assignedTo", data.assignTOName || "");
          handleChange("employeeCode", data.assignToCode || "");
          handleChange("assignedemailid", data.firstemailid || "");
          handleChange("cc", data.emailCC || "");
          handleChange("owner", data.firstassignmentname || "");
        } catch (error) {
          console.error("Error fetching case operation details:", error);
        }
      };

      fetchCaseOperationDetails();
    }
  }, [
    selectedCategoryCode,
    selectedSubCategoryCode,
    selectedSubSubCategoryCode,
    selectedSubSubSubCategoryCode,
  ]);

  const handleSignInClick = (e) => {
    e.preventDefault();
    setActiveTab("sign-in");
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();
    if (activeTab !== "sign-in") {
      if (toastRef.current) {
        toastRef.current.style.display = "block";
        setTimeout(() => {
          toastRef.current.style.display = "none";
        }, 3000);
      }
      return;
    }
    setActiveTab("register");
  };

  const [formValues, setFormValues] = useState({
    title: "",
    category: "",
    subcategory: "",
    subSubcategory: "",
    subSubSubcategory: "",
    caseMedium: "",
    caseSource: "",
    priority: "",
    customer: "",
    customerCode: "",
    product: "",
    service: "",
    serviceCategory: "",
    assignedTo: "",
    employeeCode: "",
    owner: "",
    issuedesciption: "",
    clientThreat: "",
    therapist: "",
    doctorCode: "",
    firsttimeresolution: "",
    response: "",
    employeno: "",
    assignedemailid: "",
    email: "",
    emailDisplay: "",
    cc: "",
    moreCC: "",
    specificResolution: "",
    remarks: "",
  });

  const handleChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormValues({
      title: "",
      category: "",
      subcategory: "",
      subSubcategory: "",
      subSubSubcategory: "",
      caseMedium: "",
      caseSource: "",
      priority: "",
      customer: "",
      customerCode: "",
      product: "",
      service: "",
      serviceCategory: "",
      assignedTo: "",
      employeeCode: "",
      owner: "",
      issuedesciption: "",
      clientThreat: "",
      therapist: "",
      doctorCode: "",
      firsttimeresolution: "",
      response: "",
      employeno: "",
      assignedemailid: "",
      email: "",
      emailDisplay: "",
      cc: "",
      moreCC: "",
      specificResolution: "",
      remarks: "",
    });

    setSelectedCategoryCode("");
    setSelectedSubCategoryCode("");
    setSelectedSubSubCategoryCode("");
    setSelectedSubSubSubCategoryCode("");
    setSubCategories([]);
    setSubSubCategories([]);
    setSubSubSubCategories([]);
    setProducts([]);
    setSpecificResolutions([]);
    setCustomerSearchText("");
    setCustomerOptions([]);
  };

  const handleSave = async () => {
    // const savedCaseNo = localStorage.getItem("lastSavedCaseNo") || "";
    const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user"));

    if (isSaving) return;
    setIsSaving(true);

    const payload = {
      casetitle: formValues.title,
      caseno: "",
      category: formValues.category,
      subCategory: formValues.subcategory,
      subSubCategory: formValues.subSubcategory,
      subSubSubCategory: formValues.subSubSubcategory,
      casemedium: formValues.caseMedium,
      casesource: formValues.caseSource,
      priority: formValues.priority,
      custID: formValues.customerCode,
      productCode: formValues.product,
      servicecode: formValues.service,
      serviceccode: formValues.serviceCategory,
      createdby: user.userId,
      createddate: new Date().toISOString(),
      issuedesciption: formValues.issuedesciption,
      clientThreat: formValues.clientThreat,
      doctorCode: formValues.doctorCode,
      firsttimeresolution: formValues.firsttimeresolution,
      response: formValues.response,
      assignedto: "",
      employeno: formValues.employeno,
      assignedemailid: formValues.email,
      cc: formValues.cc,
      moreCC: formValues.moreCC,
      categorySpecificResolution: formValues.specificResolution,
      remarks: formValues.remarks,
      casedisposition: "",
      caseWith: user.userId,
      status: "Open",
      operation: "Save",
      materialCost: 0,
      labourCost: 0,
      otherCharges: 0,
      totalCharges: 0,
      isdraft: 1,
      centercode: user.centerCode,
      departmentcode: "",
      custcliniccode: "",
    };

    console.log("Sending case payload:", payload);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CaseOperation`,
        {
          method: "POST",
           credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      console.log("Server response:", result);

      if (result.code === "200") {
        localStorage.setItem("lastSavedCaseNo", result.name);
        alert("Case saved successfully!");

        setActiveTab("register");
      } else {
        alert(`Failed to save case: ${result.name}`);
      }
    } catch (error) {
      console.error("Error during case save:", error);
      alert("Network or server error while saving the case.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    const errors = {};

    if (!formValues.employeeCode) {
      errors.employeeCode = "Assigned To is required.";
    }

    if (
      !formValues.issuedesciption ||
      formValues.issuedesciption.trim() === ""
    ) {
      errors.issuedesciption = "Issue Description is required.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    const savedCaseNo = localStorage.getItem("lastSavedCaseNo") || "";
    const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user"));

    const payload = {
      casetitle: formValues.title,
      caseno: savedCaseNo,
      category: formValues.category,
      subCategory: formValues.subcategory,
      subSubCategory: formValues.subSubcategory,
      subSubSubCategory: formValues.subSubSubcategory,
      casemedium: formValues.caseMedium,
      casesource: formValues.caseSource,
      priority: formValues.priority,
      custID: formValues.customerCode,
      productCode: formValues.product,
      servicecode: formValues.service,
      serviceccode: formValues.serviceCategory,
      createdby: user.userId,
      createddate: new Date().toISOString(),
      issuedesciption: formValues.issuedesciption,
      clientThreat: formValues.clientThreat,
      doctorCode: formValues.doctorCode,
      firsttimeresolution: formValues.firsttimeresolution,
      response: formValues.response,
      assignedto: formValues.employeeCode,
      employeno: formValues.employeno,
      assignedemailid: formValues.email,
      cc: formValues.cc,
      moreCC: formValues.moreCC,
      categorySpecificResolution: formValues.specificResolution,
      remarks: formValues.remarks,
      casedisposition: "",
      caseWith: formValues.employeeCode,
      status: "Open",
      operation: "Submit",
      materialCost: 0,
      labourCost: 0,
      otherCharges: 0,
      totalCharges: 0,
      isdraft: 0,
      centercode: user.centerCode,
      departmentcode: "",
      custcliniccode: "",
    };

    console.log("Sending case payload on submit:", payload);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/CaseOperation`,
        {
          method: "POST",
           credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      console.log("Server response:", result);

      if (result.code === "200") {
        alert("Case saved successfully!");
        onSubmit(payload);
        resetForm();
        setActiveTab("sign-in");
      } else {
        alert(`Failed to save case: ${result.name}`);
      }
    } catch (error) {
      console.error("Error during case save:", error);
      alert("Network or server error while saving the case.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-window show">
      <div>
        <h2 className="frmttl">
          Create Case
          <a onClick={onClose} className="modal-close" title="Close">
            <i className="bx bx-x"></i>
          </a>
        </h2>

        <ul className="popuptabs clearfix">
          <li>
            <a
              href="#"
              id="sign-in"
              className={`sign-in ${activeTab === "sign-in" ? "active" : ""}`}
              onClick={handleSignInClick}
            >
              General
            </a>
          </li>
          <li>
            <a
              href="#"
              id="register"
              className={`register ${
                activeTab === "register" ? "active" : ""
              } ${activeTab === "sign-in" ? "" : "disabled"}`}
              onClick={handleRegisterClick}
            >
              Issues and Responses
            </a>
          </li>

          <div ref={toastRef} className="toastmsg">
            Please fill the General Tab
          </div>
        </ul>

        <div
          className={`formwrap sign-in ${
            activeTab === "sign-in" ? "active" : ""
          }`}
        >
          {/* Title */}
          <div className="form-group">
            <label htmlFor="caseTitle">Case Title</label>
            <input
              type="text"
              id="caseTitle"
              placeholder="Enter Case Title"
              value={formValues.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </div>

          {/* Case Category */}
          <div className="form-group">
            <label htmlFor="caseCategory">Case Category</label>
            <select
              id="caseCategory"
              value={selectedCategoryCode}
              onChange={async (e) => {
                const code = e.target.value;
                setSelectedCategoryCode(code);

                if (!code) {
                  handleChange("category", "");
                  setSubCategories([]);
                  setSelectedSubCategoryCode("");
                  setSubSubCategories([]);
                  setSelectedSubSubCategoryCode("");
                  setSubSubSubCategories([]);
                  setProducts([]);
                  setSpecificResolutions([]);
                  return;
                }

                const selected = caseCategories.find(
                  (c) => c.categoryCode === code
                );
                handleChange("category", selected?.categoryCode || "");

                try {
                  const res = await fetch(
                    `${API_BASE_URL}/api/CaseCategory/CaseSubCategory?CategoryCode=${code}`,
                    {
                      method: "GET",
                       credentials: "include",
                      headers: {
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  const data = await res.json();
                  console.log("Subcategories:", data);
                  setSubCategories(data);
                } catch (error) {
                  console.error("Error fetching subcategories:", error);
                  setSubCategories([]);
                }

                // Fetch Products
                try {
                  const prodRes = await fetch(
                    `${API_BASE_URL}/api/CaseDropDown/Product?CategoryCode=${code}`,
                    {
                      method: "GET",
                       credentials: "include",
                      headers: {
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  const prodData = await prodRes.json();
                  console.log("Products:", prodData);
                  setProducts(prodData);
                } catch (err) {
                  console.error("Error fetching products:", err);
                  setProducts([]);
                }

                try {
                  const specificRes = await fetch(
                    `${API_BASE_URL}/api/CaseDropDown/Medium/SpecificResolution?CategoryCode=${code}`,
                    {
                      method: "GET",
                       credentials: "include",
                      headers: {
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  const specificData = await specificRes.json();
                  console.log("Specific Resolutions:", specificData);
                  setSpecificResolutions(specificData);
                } catch (err) {
                  console.error("Error fetching Specific Resolutions:", err);
                  setSpecificResolutions([]);
                }
              }}
            >
              <option value="">Select Category</option>
              {caseCategories.map((cat) => (
                <option key={cat.categoryCode} value={cat.categoryCode}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Category */}
          <div className="form-group">
            <label htmlFor="caseSubCategory">Case Sub Category</label>
            <select
              id="caseSubCategory"
              value={selectedSubCategoryCode}
              onChange={async (e) => {
                const code = e.target.value;
                setSelectedSubCategoryCode(code);

                if (!code) {
                  handleChange("subcategory", "");
                  setSubSubCategories([]);
                  setSelectedSubSubCategoryCode("");
                  setSubSubSubCategories([]);
                  return;
                }

                const selected = subCategories.find(
                  (s) => s.subCategoryCode === code
                );
                handleChange("subcategory", selected?.subCategoryCode || "");

                console.log(
                  "Selected Sub Category Name:",
                  selected?.subCategoryName
                );

                try {
                  const res = await fetch(
                    `${API_BASE_URL}/api/CaseCategory/CaseSubSubCategory?CategoryCode=${selectedCategoryCode}&SubCategoryCode=${code}`,
                    {
                      method: "GET",
                       credentials: "include",
                      headers: {
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  const data = await res.json();
                  console.log("Fetched Sub Sub Categories:", data);
                  setSubSubCategories(data);
                } catch (err) {
                  console.error("Error fetching sub-subcategories:", err);
                  setSubSubCategories([]);
                }
              }}
            >
              <option value="">Select Sub Category</option>
              {subCategories.map((sub) => (
                <option key={sub.subCategoryCode} value={sub.subCategoryCode}>
                  {sub.subCategoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Sub Category */}
          <div className="form-group">
            <label htmlFor="caseSubSubCategory">Case Sub Sub Category</label>
            <select
              id="caseSubSubCategory"
              value={selectedSubSubCategoryCode}
              onChange={async (e) => {
                const code = e.target.value;
                console.log(code);
                setSelectedSubSubCategoryCode(code);
                console.log(code);

                if (!code) {
                  handleChange("subSubcategory", "");
                  setSubSubSubCategories([]);
                  return;
                }

                const selected = subSubCategories.find(
                  (item) => item.subCategoryCode === code
                );

                console.log("Selected Sub Sub Category Object:", selected);
                handleChange("subSubcategory", selected?.subCategoryCode || "");

                // Fetch Sub Sub Sub Categories
                try {
                  const res = await fetch(
                    `${API_BASE_URL}/api/CaseCategory/CaseSubSubSubCategory?CategoryCode=${selectedCategoryCode}&SubCategoryCode=${selectedSubCategoryCode}&SubSubCategoryCode=${code}`,
                    {
                      method: "GET",
                       credentials: "include",
                      headers: {
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  const data = await res.json();
                  console.log("Fetched Sub Sub Sub Categories:", data);
                  setSubSubSubCategories(data);
                } catch (err) {
                  console.error("Error fetching sub sub sub categories:", err);
                  setSubSubSubCategories([]);
                }
              }}
            >
              <option value="">Select Sub Sub Category</option>
              {subSubCategories.map((item, index) => (
                <option
                  key={`${item.subCategoryCode || index}`}
                  value={item.subCategoryCode}
                >
                  {item.subSubCategoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Sub Sub Category */}
          <div className="form-group">
            <label htmlFor="caseSubSubSubCategory">
              Case Sub Sub Sub Category
            </label>
            <select
              id="caseSubSubSubCategory"
              value={selectedSubSubSubCategoryCode}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedSubSubSubCategoryCode(code);

                const selected = subSubSubCategories.find(
                  (item) => item.subSubCategoryCode === code
                );

                console.log("Selected Sub Sub Sub Category Object:", selected);

                handleChange(
                  "subSubSubcategory",
                  selected?.subSubCategoryCode || ""
                );
              }}
            >
              <option value="">Select Sub Sub Sub Category</option>
              {subSubSubCategories.map((item, index) => (
                <option
                  key={item.subSubCategoryCode || index}
                  value={item.subSubCategoryCode}
                >
                  {item.subSubSubCategoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Case Medium */}
          <div className="form-group">
            <label htmlFor="caseMedium">Case Medium</label>
            <select
              id="caseMedium"
              value={formValues.caseMedium}
              // onChange={(e) => handleChange("caseMedium", e.target.value)}
              onChange={async (e) => {
                const mediumValue = e.target.value;
                console.log("Selected Case Medium:", mediumValue);
                handleChange("caseMedium", mediumValue);

                // Only fetch if category is also selected
                if (selectedCategoryCode && mediumValue) {
                  try {
                    const res = await fetch(
                      `${API_BASE_URL}/api/CaseDropDown/Medium/Source?CategoryCode=${selectedCategoryCode}&MediumCode=${mediumValue}`,
                      {
                        method: "GET",
                         credentials: "include",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      }
                    );
                    const data = await res.json();
                    console.log("Fetched Case Sources:", data);
                    setCaseSources(data);
                  } catch (error) {
                    console.error("Failed to fetch case sources:", error);
                    setCaseSources([]);
                  }
                } else {
                  setCaseSources([]);
                }
              }}
            >
              <option value="">Select Medium</option>
              {caseMediums
                .filter((item) => item.code !== "< - Select one - >")
                .map((item, index) => (
                  <option key={index} value={item.name.trim()}>
                    {item.name.trim()}
                  </option>
                ))}
            </select>
          </div>

          {/* Case Source */}
          <div className="form-group">
            <label htmlFor="caseSource">Case Source</label>
            <select
              id="caseSource"
              value={formValues.caseSource}
              onChange={(e) => handleChange("caseSource", e.target.value)}
            >
              <option value="">Select Source</option>
              {caseSources.map((source, index) => (
                <option key={index} value={source.code}>
                  {source.name.trim()}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={formValues.priority}
              onChange={(e) => handleChange("priority", e.target.value)}
            >
              <option value="">Select Priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="customerSearch">Search Customer</label>
            <input
              type="search"
              id="customerSearch"
              placeholder="Search Customer"
              value={customerSearchText}
              onChange={(e) => setCustomerSearchText(e.target.value)}
            />
            <div className="error"></div>
          </div>

          {/* Customer */}
          <div className="form-group">
            <label htmlFor="customer">Customer</label>

            <select
              id="customer"
              value={formValues.customerCode}
              onChange={(e) => {
                const selectedCode = e.target.value;
                const selected = customerOptions.find(
                  (cust) => cust.code === selectedCode
                );
                handleChange("customerCode", selectedCode);
                handleChange("customer", selected?.name || "");
              }}
            >
              <option value="">Select Customer</option>
              {customerOptions.map((cust, index) => (
                <option key={index} value={cust.code}>
                  {cust.name.trim()}
                </option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div className="form-group">
            <label htmlFor="product">Product</label>
            <select
              id="product"
              placeholder="Enter Product"
              value={formValues.product}
              onChange={(e) => handleChange("product", e.target.value)}
            >
              <option value="">Select Product</option>
              {products
                .filter((p) => p.code !== "0")
                .map((product, index) => (
                  <option key={index} value={product.code}>
                    {product.name.trim()}
                  </option>
                ))}
            </select>
          </div>

          {/* Service */}
          <div className="form-group">
            <label htmlFor="service">Service</label>
            <select
              type="text"
              id="service"
              placeholder="Enter Service"
              value={formValues.service}
              onChange={(e) => handleChange("service", e.target.value)}
            >
              <option value="">Select Service</option>

              {services
                .filter((s) => s.code !== "0")
                .map((service, index) => (
                  <option key={index} value={service.code}>
                    {service.name.trim()}
                  </option>
                ))}
            </select>
          </div>

          {/* Service Category */}
          <div className="form-group">
            <label htmlFor="serviceCategory">Service Category</label>
            <select
              id="serviceCategory"
              value={formValues.serviceCategory}
              onChange={(e) => handleChange("serviceCategory", e.target.value)}
            >
              <option value="">Select Service Category</option>
              {serviceCategories.map((cat, index) => (
                <option key={index} value={cat.categoryCode}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To */}

          {/* <div className="form-group">
            <label htmlFor="assignedTo">Assigned To</label>
            <select
              id="assignedTo"
              value={formValues.assignedTo}
              onChange={(e) => handleChange("assignedTo", e.target.value)}
            >
              <option value="">Select Employee</option>
              {employees.map((emp, index) => (
                <option key={index} value={emp.employeeCode}>
                  {emp.employeeName}
                </option>
              ))}
            </select>
          </div> */}

          {/* Owner */}
          {/* <div className="form-group">
            <label htmlFor="owner">Owner</label>
            <input
              type="text"
              id="owner"
              placeholder="Enter Owner"
              value={formValues.owner}
              onChange={(e) => handleChange("owner", e.target.value)}
            />
          </div> */}

          <div className="form-group">
            <label htmlFor="owner">Owner</label>
            <input
              type="text"
              id="owner"
              value={`${
                JSON.parse(localStorage.getItem("user"))?.firstName || ""
              } ${JSON.parse(localStorage.getItem("user"))?.lastName || ""}`}
              readOnly
            />
          </div>

          <div className="form-group">
            <label htmlFor="createdDate">Created Date</label>
            <input type="text" id="createdDate" disabled value="4/3/2025" />
          </div>

          <div className="buttongrp">
            <a className="pribtn" onClick={handleSave}>
              Save
            </a>
            <a className="secbtn">Submit</a>
            <a className="secbtn">Assign To Next Level</a>
            <a className="secbtn">Save and Next</a>
          </div>
        </div>

        {/* Issues and Responses Tab */}
        <div
          className={`formwrap register ${
            activeTab === "register" ? "active" : ""
          }`}
        >
          <div className="form-group">
            <label htmlFor="issuedesciption">Issue Description</label>
            <textarea
              id="issuedesciption"
              rows="5"
              value={formValues.issuedesciption}
              onChange={(e) => {
                handleChange("issuedesciption", e.target.value);

                // Clear validation error when typing
                setValidationErrors((prev) => ({
                  ...prev,
                  issuedesciption: null,
                }));
              }}
              className={validationErrors.issuedesciption ? "error-border" : ""}
            ></textarea>
            {validationErrors.issuedesciption && (
              <div className="error-text">
                {validationErrors.issuedesciption}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="attachment">Attachment</label>
            <input
              type="file"
              id="attachment"
              onChange={(e) => handleChange("attachment", e.target.files[0])}
            />
            <div className="error"></div>
          </div>

          <div className="form-group">
            <label htmlFor="clientThreat">Client Threat</label>
            <select
              id="clientThreat"
              value={formValues.clientThreat}
              onChange={(e) => handleChange("clientThreat", e.target.value)}
            >
              <option value="">-- Select --</option>
              <option value="Legal">Legal</option>
              <option value="Verbal">Verbal</option>
              <option value="Written">Written</option>
              <option value="Physical">Physical</option>
            </select>
            <div className="error"></div>
          </div>

          <div className="form-group">
            <label htmlFor="therapist">Therapist</label>

            <select
              id="therapist"
              value={formValues.doctorCode}
              onChange={(e) => {
                const selectedCode = e.target.value;
                const selectedDoc = therapists.find(
                  (doc) => doc.code === selectedCode
                );
                handleChange("doctorCode", selectedCode);
                handleChange("therapist", selectedDoc?.name || "");
              }}
            >
              <option value="">Select Therapist</option>
              {therapists
                .filter((doc) => doc.code !== "")
                .map((doc, index) => (
                  <option key={index} value={doc.code}>
                    {doc.name.trim()}
                  </option>
                ))}
            </select>
            <div className="error"></div>
          </div>

          <div className="form-group">
            <label htmlFor="firsttimeresolution">First Time Resolution</label>
            <textarea
              id="firsttimeresolution"
              rows="5"
              value={formValues.firsttimeresolution}
              onChange={(e) =>
                handleChange("firsttimeresolution", e.target.value)
              }
            ></textarea>
            <div className="error"></div>
          </div>

          <div className="form-group">
            <label htmlFor="response">Add Response</label>
            <textarea
              id="response"
              rows="5"
              value={formValues.response}
              onChange={(e) => handleChange("response", e.target.value)}
            ></textarea>
            <div className="error"></div>
          </div>

          <div className="form-group">
            <label htmlFor="employeno">Employee Mobile</label>
            <input
              type="text"
              id="employeno"
              placeholder=""
              value={formValues.employeno}
              readOnly
              onClick={(e) => e.target.select()}
            />
          </div>

          {/* <div className="form-group">
            <label htmlFor="assignedTo">Assigned To</label>
            <select
              id="assignedTo"
              placeholder=""
              value={formValues.employeeCode}
              onChange={(e) => {
                const selectedCode = e.target.value;
                const selectedEmp = employees.find(
                  (emp) => emp.employeeCode === selectedCode
                );
                handleChange("employeeCode", selectedCode);
                handleChange("assignedTo", selectedEmp?.employeeCode || "");
                handleChange("employeno", selectedEmp?.mobileNo || "");
                handleChange("email", selectedEmp?.emailID || "");
                handleChange("emailDisplay", selectedEmp?.employeeName || "");
              }}
            >
              <option value="">Select Employee</option>
              {employees.map((emp, index) => (
                <option
                  key={`${emp.employeeCode}-${emp.recId}-${index}`}
                  value={emp.employeeCode}
                >
                  {emp.employeeName}
                </option>
              ))}
            </select>
          </div> */}

          <div className="form-group">
            <label htmlFor="assignedTo">Assigned To</label>
            <select
              id="assignedTo"
              value={formValues.employeeCode || ""}
              onChange={(e) => {
                const selectedCode = e.target.value;
                const selectedEmp = employees.find(
                  (emp) => emp.employeeCode === selectedCode
                );

                handleChange("employeeCode", selectedCode); //

                handleChange("employeno", selectedEmp?.mobileNo || "");
                handleChange("email", selectedEmp?.emailID || "");
                handleChange("emailDisplay", selectedEmp?.employeeName || "");

                // Clear validation error when selecting
                setValidationErrors((prev) => ({
                  ...prev,
                  employeeCode: null,
                }));
              }}
              className={validationErrors.employeeCode ? "error-border" : ""}
            >
              <option value="">Select Employee</option>
              {employees.map((emp, index) => (
                <option
                  key={`${emp.employeeCode}-${emp.recId}-${index}`}
                  value={emp.employeeCode}
                >
                  {emp.employeeName}
                </option>
              ))}
            </select>
            {validationErrors.employeeCode && (
              <div className="error-text">{validationErrors.employeeCode}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <select
              id="email"
              value={formValues.email}
              onChange={(e) => {
                const email = e.target.value;
                const selectedName =
                  e.target.options[e.target.selectedIndex].text;
                handleChange("email", email);
                handleChange("emailDisplay", selectedName);
              }}
            >
              {formValues.email && formValues.emailDisplay ? (
                <option value={formValues.email}>
                  {formValues.emailDisplay}
                </option>
              ) : (
                <option value="">No email available</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cc">CC</label>
            <select
              id="cc"
              value={formValues.cc}
              readOnly
              onChange={(e) => handleChange("cc", e.target.value)}
            >
              <option value="">Select CC</option>
              <option value={formValues.cc}>{formValues.cc}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="moreCC">More CC</label>
            <textarea
              id="moreCC"
              rows="5"
              value={formValues.moreCC}
              onChange={(e) => handleChange("moreCC", e.target.value)}
            ></textarea>
            <div className="error"></div>
          </div>

          <div className="form-group">
            <label htmlFor="specificResolution">
              Category Specific Resolution
            </label>
            <select
              id="specificResolution"
              placeholder=""
              value={formValues.specificResolution}
              onChange={(e) =>
                handleChange("specificResolution", e.target.value)
              }
            >
              <option value="">Select Specific Resolution</option>
              {specificResolutions.map((res, index) => (
                <option key={index} value={res.name.trim()}>
                  {res.name.trim()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="remarks">Remarks</label>
            <textarea
              id="remarks"
              rows="5"
              value={formValues.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
            ></textarea>
            <div className="error"></div>
          </div>

          <div className="buttongrp">
            <a className="pribtn">Save</a>
            <a className="secbtn" onClick={handleSubmit}>
              Submit
            </a>
            <a className="secbtn">Assign To Next Level</a>
            <a className="secbtn">Save and Next</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCaseModel;
