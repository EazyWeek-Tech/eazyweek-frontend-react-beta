import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config';

const createDataHandler = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
  return await response.json();
};

const CustomerSearch = ({ onCustomerSelect, prefillCustid, fullName, emailId, number }) => {
  const [formData, setFormData] = useState({ mobile: '', name: '', email: '' });
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [focusedField, setFocusedField] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Prefill fields if customer data is passed via props
  useEffect(() => {
    console.log(prefillCustid)
    console.log(fullName + ","+emailId + ","+number)
    if (fullName || emailId || number) {
      setFormData({
        name: fullName,
        mobile: number,
        email: emailId
      });
      setIsReadOnly(true);  // Set form fields to read-only
    }
  }, [fullName, emailId, number]);

  // Handle input changes for mobile, name, and email fields
  const handleChange = async (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setFocusedField(field);

    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    const centerCode = stored ? JSON.parse(stored).centerCode : "";

    if (!value || value.length < 2 || !centerCode) {
      setFilteredSuggestions([]);
      return;
    }

    try {
      const url = `${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(value)}/${centerCode}`;
      const data = await createDataHandler(url);
      console.log("Fetched customer data:", data);

      const lower = value.toLowerCase();
      const filtered = data.filter((cust) =>
        (field === 'mobile' && cust.mobile?.includes(value)) ||
        (field === 'name' && `${cust.firstName} ${cust.lastName}`.toLowerCase().includes(lower)) ||
        (field === 'email' && cust.email?.toLowerCase().includes(lower))
      );

      setFilteredSuggestions(filtered);
    } catch (err) {
      console.error("Customer search failed:", err);
      setFilteredSuggestions([]);
    }
  };

  // Handle customer selection from suggestions
  const handleSelect = (cust) => {
    const status = cust.nationalityId === '84' || cust.nationalityId === 84 ? 'Citizen' : 'EXPAT';
    const enriched = { ...cust, status };

    setFormData({
      mobile: cust.mobile || '',
      name: `${cust.firstName} ${cust.lastName}`,
      email: cust.email || ''
    });

    setFilteredSuggestions([]);
    setFocusedField(null);
    onCustomerSelect?.(enriched);  // Pass the selected customer back to parent
  };

  return (
    <div className="cstsearch">
      <div className="custtl">
        <div className="sectttl">Customer Search</div>
        {fullName && emailId && number && (
          <div
            className={isReadOnly ? 'nstatus' : 'nstatus expat'}
            style={{ fontWeight: 'bold' }}
          >
            Nationality status is {isReadOnly ? 'Read Only' : 'Editable'}
          </div>
        )}
      </div>

      <form className="cstfrm">
        {['mobile', 'name', 'email'].map((field) => (
          <div className="frmdiv" style={{ position: 'relative' }} key={field}>
            <label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
            <input
              type="text"
              id={field}
              value={formData[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              onFocus={() => setFocusedField(field)}
              readOnly={isReadOnly}  // Make input field read-only if prefilled
            />
            {focusedField === field && !isReadOnly && filteredSuggestions.length > 0 && (
              <ul className="suggestion-list">
                {filteredSuggestions.map((cust, idx) => (
                  <li key={idx} onClick={() => handleSelect(cust)}>
                    {field === 'mobile' ? cust.mobile
                      : field === 'name' ? `${cust.firstName} ${cust.lastName}`
                      : cust.email || 'No email'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </form>
    </div>
  );
};

export default CustomerSearch;
