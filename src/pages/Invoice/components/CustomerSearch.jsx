import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config';

const CustomerSearch = ({
  onCustomerSelect,
  prefillCustid,
  fullName,
  emailId,
  number,
  nationalityStatus: nationalityFromProps,
  enrollmentType = 'ONREQUEST', // passed from parent who fetched loyalty program
}) => {
  const [formData, setFormData] = useState({ mobile: '', name: '', email: '' });
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [focusedField, setFocusedField] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [nationalityStatus, setNationalityStatus] = useState(nationalityFromProps || '');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Loyalty enrollment state
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  // Prefill from props (e.g. appointment page)
  useEffect(() => {
    if (fullName || emailId || number) {
      setFormData({ name: fullName, mobile: number, email: emailId });
      setIsReadOnly(true);
      if (nationalityFromProps) setNationalityStatus(nationalityFromProps);
    }
  }, [fullName, emailId, number]);

  const handleChange = async (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFocusedField(field);

    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    const centerCode = stored ? JSON.parse(stored).centerCode : '';

    if (!value || value.length < 2 || !centerCode) {
      setFilteredSuggestions([]);
      return;
    }

    try {
      const url = `${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(value)}/${centerCode}`;
      const data = await fetch(url).then(r => r.json());
      const lower = value.toLowerCase();
      const filtered = data.filter(cust =>
        (field === 'mobile' && cust.mobile?.includes(value)) ||
        (field === 'name' && `${cust.firstName} ${cust.lastName}`.toLowerCase().includes(lower)) ||
        (field === 'email' && cust.email?.toLowerCase().includes(lower))
      );
      setFilteredSuggestions(filtered);
    } catch (err) {
      console.error('Customer search failed:', err);
      setFilteredSuggestions([]);
    }
  };

  const handleSelect = (cust) => {
    const status = cust.nationalityId === '84' || cust.nationalityId === 84 ? 'Citizen' : 'Expat';
    setFormData({
      mobile: cust.mobile || '',
      name: `${cust.firstName} ${cust.lastName}`,
      email: cust.email || '',
    });
    setNationalityStatus(status);
    setFilteredSuggestions([]);
    setFocusedField(null);
    setIsReadOnly(true);
    setEnrollSuccess(false);
    setEnrollError('');
    const enriched = { ...cust, status, recId: cust.recId || cust.recid || '' };
    setSelectedCustomer(enriched);
    onCustomerSelect?.(enriched);
  };

  const handleClear = () => {
    setFormData({ mobile: '', name: '', email: '' });
    setNationalityStatus('');
    setFilteredSuggestions([]);
    setFocusedField(null);
    setIsReadOnly(false);
    setSelectedCustomer(null);
    setEnrollSuccess(false);
    setEnrollError('');
    onCustomerSelect?.(null);
  };

  // ── Enroll customer in loyalty program ──────────────────────────────────
  const handleEnroll = async () => {
    if (!selectedCustomer) return;
    setEnrolling(true);
    setEnrollError('');

    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    const centerCode = stored ? JSON.parse(stored).centerCode : selectedCustomer.centerCode || '';
    const custId = selectedCustomer.custId || selectedCustomer.customerId || '';

    try {
      const res = await fetch(`${API_BASE_URL}/api/Customer/EnrollLoyalty`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custId, centerCode }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const result = await res.json();
      if (result.success === false) throw new Error(result.message || 'Enrollment failed');

      // Update local state so PaymentBlock immediately re-derives isLoyaltyEnrolled = true
      const updated = { ...selectedCustomer, isLoyaltyEnrolled: true };
      setSelectedCustomer(updated);
      setEnrollSuccess(true);
      setEnrollError('');
      onCustomerSelect?.(updated);
    } catch (e) {
      setEnrollError(e.message);
    } finally {
      setEnrolling(false);
    }
  };

  // Derived
  const isEnrolled = enrollSuccess || !!selectedCustomer?.isLoyaltyEnrolled;
  const showEnrollPrompt = selectedCustomer && enrollmentType === 'ONREQUEST' && !isEnrolled;

  return (
    <div className="cstsearch">
      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="sectttl">Customer Search</div>

          {/* Nationality badge */}
          {nationalityStatus && (
            <div className={`nstatus ${nationalityStatus.toLowerCase()}`} style={{ fontWeight: 'bold' }}>
              Nationality Status: {nationalityStatus}
            </div>
          )}

          {/* Loyalty status badge */}
          {selectedCustomer && (
            isEnrolled ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#e6f4ef', border: '1px solid #b3d9cc', borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 700, color: '#2e7d5e' }}>
                ★ Loyalty Member
              </span>
            ) : enrollmentType === 'ONREQUEST' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f4f7fb', border: '1px solid #e5ebf3', borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                Not enrolled
              </span>
            ) : null
          )}
        </div>

        {/* Clear button */}
        {(isReadOnly || selectedCustomer) && (
          <button
            type="button"
            onClick={handleClear}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 14px', borderRadius: 8, border: '1.5px solid #d0d9e8', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#cc6b5c'; e.currentTarget.style.color = '#cc6b5c'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#d0d9e8'; e.currentTarget.style.color = '#64748b'; }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Search form ── */}
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

      {/* ── Loyalty enroll prompt — only for ONREQUEST + not enrolled ── */}
      {showEnrollPrompt && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: '#fffbea', border: '1px solid #f5d97a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <span style={{ fontSize: 13, color: '#7a5c00', fontWeight: 500 }}>
              This customer is not enrolled in the loyalty program.
            </span>
          </div>
          <button
            type="button"
            onClick={handleEnroll}
            disabled={enrolling}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px', borderRadius: 8, border: 'none', background: enrolling ? '#9badc7' : '#334b71', color: '#fff', fontSize: 13, fontWeight: 700, cursor: enrolling ? 'not-allowed' : 'pointer', transition: 'background .15s', fontFamily: 'inherit' }}
          >
            {enrolling ? (
              <>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'cs-spin 0.7s linear infinite' }} />
                Enrolling…
              </>
            ) : '★ Enroll in Loyalty Program'}
          </button>
        </div>
      )}

      {/* Success message */}
      {enrollSuccess && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: '#e6f4ef', border: '1px solid #b3d9cc', borderRadius: 8, color: '#2e7d5e', fontSize: 13, fontWeight: 600 }}>
          ✓ Customer successfully enrolled in the loyalty program.
        </div>
      )}

      {/* Error message */}
      {enrollError && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: '#fdf3f3', border: '1px solid #f0c4c0', borderRadius: 8, color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>
          ⚠ {enrollError}
        </div>
      )}

      <style>{`@keyframes cs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CustomerSearch;