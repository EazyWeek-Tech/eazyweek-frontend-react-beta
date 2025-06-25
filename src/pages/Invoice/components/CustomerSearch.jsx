import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config';

const createDataHandler = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
  return await response.json();
};

const CustomerSearch = ({ onCustomerSelect, prefillCustid }) => {
  const [formData, setFormData] = useState({ mobile: '', name: '', email: '' });
  const [suggestions, setSuggestions] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [focusedField, setFocusedField] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

 


  // Prefill from URL custid
  useEffect(() => {
    if (prefillCustid && suggestions.length > 0) {
      const match = suggestions.find(c => c.custid === prefillCustid);
      if (match) handleSelect(match);
    }
  }, [prefillCustid, suggestions]);

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



  const handleSelect = (cust) => {
    const status = cust.nationalityid === '95' || cust.nationalityid === 95 ? 'Citizen' : 'EXPAT';

    const enriched = { ...cust, status };

    setFormData({
  mobile: cust.mobile || '',
  name: `${cust.firstName} ${cust.lastName}`,
  email: cust.email || ''
});


    setFilteredSuggestions([]);
    setFocusedField(null);
    setSelectedCustomer(enriched);
    onCustomerSelect?.(enriched);
  };

  return (
    <div className="cstsearch">
      <div className="sectttl">Customer Search</div>
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
            />
            {focusedField === field && filteredSuggestions.length > 0 && (
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

      {selectedCustomer && (
        <div
          className={selectedCustomer.status === 'Citizen' ? 'nstatus' : 'nstatus expat'}
          style={{ marginTop: '10px', fontWeight: 'bold' }}
        >
          {selectedCustomer.status}
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
