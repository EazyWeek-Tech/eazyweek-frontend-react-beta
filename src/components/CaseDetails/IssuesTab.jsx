import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";

const API_BASE_URL = "https://insightweb-hkhqgch8hadvcbb0.uaenorth-01.azurewebsites.net";
const IssuesTab = forwardRef(({ data }, ref) => {
  const [formValues, setFormValues] = useState({ ...data });
  const [employees, setEmployees] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [therapistClicked, setTherapistClicked] = useState(false);
  const [responses, setResponses] = useState([]);

  useImperativeHandle(ref, () => ({
    getIssuesData: () => formValues,
  }));

  useEffect(() => {
    if (data) setFormValues({ ...data });
  }, [data]);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseResponse/${data.caseNo}/ActualResponse`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );
        const result = await res.json();
        setResponses(result);
      } catch (error) {
        console.error("Error fetching responses:", error);
      }
    };
    if (data?.caseNo) fetchResponses();
  }, [data.caseNo]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Employees`);
        const result = await response.json();
        const valid = result.filter((e) => e.employeeCode && e.employeeName !== "Assign To");
        setEmployees(valid);

        const matched = valid.find(
          (e) => e.employeeName.trim().toLowerCase() === (data.assignedTo || "").trim().toLowerCase()
        );
        if (matched) {
          setFormValues((prev) => ({
            ...prev,
            assignedTo: matched.employeeName,
            employeeMobile: matched.mobileNo || "",
            email: matched.emailID || "",
          }));
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, [data.assignedTo]);

  const fetchTherapists = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/CaseDropDown/Medium/Doctors`);
      const result = await response.json();
      setTherapists(result.filter((doc) => doc.code && doc.name !== "< - Select one - >"));
    } catch (error) {
      console.error("Error fetching therapists:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (name === "assignedTo") {
      const selected = employees.find((emp) => emp.employeeName.trim() === value.trim());
      setFormValues((prev) => ({
        ...prev,
        assignedTo: selected?.employeeName || "",
        employeeMobile: selected?.mobileNo || "",
        email: selected?.emailID || "",
      }));
    } else {
      setFormValues((prev) => ({
        ...prev,
        [name]: type === "file" ? files[0] : value,
      }));
    }
  };

  return (
    <form className="issueform tabform">
      <div className="form-group">
        <label>Issue Description</label>
        <textarea name="issueDescription" value={formValues.issueDescription || ""} onChange={handleChange} rows="5" />
      </div>

      <div className="form-group">
        <label>Attachment</label>
        <input type="file" name="attachment" onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Client Threat</label>
        <select name="clientThreat" value={formValues.clientThreat || ""} onChange={handleChange}>
          <option value="">-- Select --</option>
          <option value="Legal">Legal</option>
          <option value="Verbal">Verbal</option>
          <option value="Written">Written</option>
          <option value="Physical">Physical</option>
        </select>
      </div>

      <div className="form-group">
        <label>Therapist</label>
        <select
          name="therapist"
          value={formValues.therapist || ""}
          onChange={handleChange}
          onClick={() => {
            if (!therapistClicked) {
              fetchTherapists();
              setTherapistClicked(true);
            }
          }}
        >
          <option value="">Select Therapist</option>
          {therapists.map((doc, index) => (
            <option key={index} value={doc.name}>
              {doc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>First Time Resolution</label>
        <textarea
          name="firstTimeResolution"
          value={formValues.firstTimeResolution || ""}
          onChange={handleChange}
          rows="5"
        />
      </div>

      <div className="form-group">
        <label>Add Response</label>
        <textarea name="response" value={formValues.response || ""} onChange={handleChange} rows="5" />
      </div>

      <div className="form-group">
        <label>Assigned To</label>
        <select name="assignedTo" value={formValues.assignedTo || ""} onChange={handleChange}>
          <option value="">Select User</option>
          {employees.map((emp, index) => (
            <option key={index} value={emp.employeeName}>
              {emp.employeeName}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Employee Mobile</label>
        <input type="text" name="employeeMobile" value={formValues.employeeMobile || ""} onChange={handleChange} />
      </div>

      <div className="tablewrp">
        <table cellSpacing={0} className="respTable">
          <thead>
            <tr className="Hrline">
              <th width="160">Response Code</th>
              <th>Details</th>
              <th>Response By</th>
            </tr>
          </thead>
         <tbody>
  {responses.length > 0 ? (
    responses.map((res, idx) => (
      <tr key={idx} className="Hrline">
        <td>{res.reseponseCode || "-"}</td>
        <td>{res.responseDetails || "-"}</td>
        <td>{res.responseBy || "-"}</td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="3" style={{ textAlign: "center" }}>
        No responses available.
      </td>
    </tr>
  )}
</tbody>

        </table>
      </div>

      <div className="emaildiv">
        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" value={formValues.email || ""} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>CC</label>
          <input type="text" name="cc" value={formValues.cc || ""} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>More CC</label>
          <textarea name="moreCc" value={formValues.moreCc || ""} onChange={handleChange} rows="5" />
        </div>

        <div className="form-group">
          <label>Category Specific Resolution</label>
          <select
            name="categoryResolution"
            value={formValues.categoryResolution || ""}
            onChange={handleChange}
          >
            <option value="">Select</option>
            <option value="Resolved">Resolved</option>
            <option value="Unresolved">Unresolved</option>
          </select>
        </div>

        <div className="form-group">
          <label>Remarks</label>
          <textarea name="remarks" value={formValues.remarks || ""} onChange={handleChange} rows="5" />
        </div>
      </div>
    </form>
  );
});

export default IssuesTab;
