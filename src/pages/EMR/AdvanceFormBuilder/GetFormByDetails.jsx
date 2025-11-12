import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormPreview } from "./FormPreview";
import "./FormPreview.css";
import { API_BASE_URL } from "../../../config";

const GetFormByDetails = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [configData, setConfigData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Fetch all forms for dropdown
  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/form`);
        if (!res.ok) throw new Error("Failed to load forms");
        const data = await res.json();
        setForms(data);
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
  }, []);

  // ✅ Fetch form details when selected
  const handleFormSelect = async (e) => {
    const id = e.target.value;
    setSelectedFormId(id);
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE_URL}/api/form/definition-by-name?name=${id}`);
      if (!res.ok) throw new Error("Failed to load form details");
      const data = await res.json();
      setConfigData(data);
    } catch (err) {
      setError(err.message || "Error fetching form data");
      setConfigData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = () => {
    navigate("/custom-forms/form-builder");
  };

  const parsedSchema =
    configData && configData.schemaJson
      ? JSON.parse(configData.schemaJson)
      : null;

      console.log("parsedSchema",parsedSchema)

  return (
    <div className="AdvFormBuilder-container">
      <div className="AdvFormBuilder-wrapper">
        <div className="Form-Data-flex">
          <h1 className="AdvFormBuilder-title">Form Preview</h1>
          <button onClick={handleNavigate} className="formpreview-bydata">
            + Add
          </button>
        </div>

        {/* 🔽 Dropdown */}
        <div className="GP-form-dropdown-container">
          <label htmlFor="formSelect" className="form-label">
            Select Form:
          </label>
          <select
            id="formSelect"
            className="GP-form-dropdown"
            value={selectedFormId}
            onChange={handleFormSelect}
          >
            <option value="">-- Choose a form --</option>
            {forms.map((form) => (
              <option key={form.id} value={form.name}>
                {form.name || `Form ${form.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* 💬 Loading / Error / Preview */}
        {loading && <p className="GP-loading-text">Loading...</p>}
        {error && <p className="GP-error-text">{error}</p>}

        {!loading && parsedSchema && (
          <div className="GP-form-preview-wrapper">
            <FormPreview config={parsedSchema} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GetFormByDetails;
