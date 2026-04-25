import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config';

const createDataHandler = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
  return await response.json();
};

const CustomerSearch = ({ onCustomerSelect, prefillCustid, fullName, emailId, number, nationalityStatus: nationalityFromProps }) => {
  const [formData, setFormData] = useState({ mobile: '', name: '', email: '' });
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [focusedField, setFocusedField] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [nationalityStatus, setNationalityStatus] = useState(nationalityFromProps || "");
  const [selectedCustomer, setSelectedCustomer] = useState(null); // track who was selected

  // Prefill fields if customer data is passed via props
  useEffect(() => {
    if (fullName || emailId || number) {
      setFormData({ name: fullName, mobile: number, email: emailId });
      setIsReadOnly(true);
      if (nationalityFromProps) setNationalityStatus(nationalityFromProps);
    }
  }, [fullName, emailId, number]);

  const handleChange = async (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setFocusedField(field);

    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    const centerCode = stored ? JSON.parse(stored).centerCode : "";

    if (!value || value.length < 2 || !centerCode) {
      setFilteredSuggestions([]);
      return;
    }

    try {
      const url = `${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(value)}/${centerCode}`;
      const data = await fetch(url).then(r => r.json());

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
    const status = cust.nationalityId === '84' || cust.nationalityId === 84 ? 'Citizen' : 'Expat';
    setFormData({
      mobile: cust.mobile || '',
      name: `${cust.firstName} ${cust.lastName}`,
      email: cust.email || ''
    });
    setNationalityStatus(status);
    setFilteredSuggestions([]);
    setFocusedField(null);
    setIsReadOnly(true);
    setSelectedCustomer(cust);
    const enriched = {
      ...cust,
      status,
      recId: cust.recId || cust.recid || "",
    };
    onCustomerSelect?.(enriched);
  };

  const handleClear = () => {
    setFormData({ mobile: '', name: '', email: '' });
    setNationalityStatus('');
    setFilteredSuggestions([]);
    setFocusedField(null);
    setIsReadOnly(false);
    setSelectedCustomer(null);
    onCustomerSelect?.(null); // notify parent
  };

  return (
    <div className="cstsearch">
      <div className="custtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="sectttl">Customer Search</div>
          {nationalityStatus && (
            <div className={`nstatus ${nationalityStatus.toLowerCase()}`} style={{ fontWeight: 'bold' }}>
              Nationality Status: {nationalityStatus}
            </div>
          )}
        </div>

        {/* Clear button — only when a customer is selected or fields are prefilled */}
        {(isReadOnly || selectedCustomer) && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 32, padding: '0 14px', borderRadius: 8,
              border: '1.5px solid #d0d9e8', background: '#fff',
              color: '#64748b', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'border-color .15s, color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#cc6b5c'; e.currentTarget.style.color = '#cc6b5c'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#d0d9e8'; e.currentTarget.style.color = '#64748b'; }}
          >
            ✕ Clear
          </button>
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
              readOnly={isReadOnly}
              style={isReadOnly ? { background: '#f8fafc', color: '#334b71', fontWeight: 600 } : {}}
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