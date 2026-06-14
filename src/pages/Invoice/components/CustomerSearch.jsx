import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../../config';
// NOTE: adjust this relative path to wherever CustomerMaster.jsx lives in your tree.
import { CustomerFormPanel } from '../../Masters/CustomerMaster';

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const CustomerSearch = ({
  onCustomerSelect,
  fullName,
  emailId,
  number,
  nationalityStatus: nationalityFromProps,
}) => {
  const [searchText,       setSearchText]       = useState('');
  const [suggestions,      setSuggestions]      = useState([]);
  const [searching,        setSearching]        = useState(false);
  const [showDropdown,     setShowDropdown]     = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [nationalityStatus,setNationalityStatus]= useState(nationalityFromProps || '');
  const [mobile,           setMobile]           = useState('');
  const [email,            setEmail]            = useState('');
  const [name,             setName]             = useState('');
  const [showAddCustomer,  setShowAddCustomer]  = useState(false);
  const [enrolling,        setEnrolling]        = useState(false);

  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  // Prefill from props (appointment mode)
  useEffect(() => {
    if (fullName || emailId || number) {
      setName(fullName     || '');
      setMobile(number     || '');
      setEmail(emailId     || '');
      setSearchText(fullName || '');
      if (nationalityFromProps) setNationalityStatus(nationalityFromProps);
    }
  }, [fullName, emailId, number, nationalityFromProps]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getCenterCode = () => {
    try {
      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      return stored ? JSON.parse(stored).centerCode : '';
    } catch { return ''; }
  };

  // ── Search handler ─────────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    setShowDropdown(true);
    setSuggestions([]);

    if (selectedCustomer) {
      setSelectedCustomer(null);
      setMobile(''); setEmail(''); setName('');
      setNationalityStatus('');
      onCustomerSelect?.(null);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.trim().length < 2) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      const centerCode = getCenterCode();
      if (!centerCode) return;
      try {
        setSearching(true);
        const res = await fetch(
          `${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(value.trim())}/${centerCode}`,
          { headers: { Authorization: `Bearer ${TOKEN()}` } }
        );
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setSuggestions(list);
        setShowDropdown(true);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 300);
  };

  // ── Select handler ─────────────────────────────────────────────────────────
  const handleSelect = (cust) => {
    const firstName = cust.firstName || cust.FIRST_NAME || '';
    const lastName  = cust.lastName  || cust.LAST_NAME  || '';
    const fullName  = [firstName, lastName].filter(Boolean).join(' ').trim() || cust.fullName || '';
    const mobile    = cust.mobile    || cust.NUMBER     || cust.number       || cust.mobilePhone || '';
    const email     = cust.email     || cust.EMAIL      || cust.emailId      || '';
    const custId    = cust.custId    || cust.custid     || cust.CUSTID       || '';
    const recId     = cust.recId     || cust.recid      || cust.RECID        || '';
    const natId     = String(cust.nationalityId || cust.NATIONALITY_ID || '');
    const status    = natId === '84' ? 'Citizen' : 'Expat';

    setSearchText(fullName);
    setName(fullName);
    setMobile(mobile);
    setEmail(email);
    setNationalityStatus(status);
    setSuggestions([]);
    setShowDropdown(false);

    const enriched = {
      ...cust,
      custId, custid: custId,
      fullName, firstName, lastName,
      mobile, number: mobile,
      email, status, recId,
      isLoyaltyEnrolled: !!(cust.isLoyaltyEnrolled ?? cust.IS_LOYALTY_ENROLLED ?? false),
    };
    setSelectedCustomer(enriched);
    onCustomerSelect?.(enriched);
  };

  const handleClear = () => {
    setSearchText(''); setName(''); setMobile(''); setEmail('');
    setNationalityStatus(''); setSuggestions([]); setShowDropdown(false);
    setSelectedCustomer(null);
    onCustomerSelect?.(null);
  };

  // ── New customer created from the Invoice page ───────────────────────────────
  const handleCustomerCreated = (saved) => {
    setShowAddCustomer(false);
    if (!saved) return;
    const firstName = saved.firstName || '';
    const lastName  = saved.lastName  || '';
    const full      = [firstName, lastName].filter(Boolean).join(' ').trim() || saved.preferredName || '';
    const mob       = saved.mobilePhone || saved.mobile || '';
    const eml       = saved.email || '';
    const custId    = saved.custId || saved.customerId || saved.custid || '';
    const status    = saved.customerType || '';

    const enriched = {
      ...saved,
      custId, custid: custId,
      fullName: full, firstName, lastName,
      mobile: mob, number: mob,
      email: eml, status,
      recId: saved.recId || saved.recid || '',
      isLoyaltyEnrolled: !!saved.isLoyaltyEnrolled,
    };
    setSearchText(full);
    setName(full); setMobile(mob); setEmail(eml);
    setNationalityStatus(status);
    setSelectedCustomer(enriched);
    onCustomerSelect?.(enriched);
  };

  // ── Enroll a searched customer into the loyalty program ──────────────────────
  const handleEnrollLoyalty = async () => {
    if (!selectedCustomer?.custId || enrolling) return;
    setEnrolling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Customer/EnrollLoyalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({ custId: selectedCustomer.custId, centerCode: getCenterCode() }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.success ?? json.Success ?? res.ok) {
        const updated = { ...selectedCustomer, isLoyaltyEnrolled: true };
        setSelectedCustomer(updated);
        onCustomerSelect?.(updated);
      }
    } catch { /* leave unenrolled on failure */ }
    finally { setEnrolling(false); }
  };

  const isSelected = !!selectedCustomer;

  return (
    <div className="cstsearch">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div className="sectttl">Customer Search</div>
          {nationalityStatus && (
            <span className={`nstatus ${nationalityStatus.toLowerCase()}`} style={{ fontWeight:'bold' }}>
              Nationality Status: {nationalityStatus}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {!isSelected && (
            <button type="button" onClick={() => setShowAddCustomer(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:5, height:32, padding:'0 14px', borderRadius:8, border:'none', background:'#334b71', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              + Add Customer
            </button>
          )}
          {isSelected && (
            <button type="button" onClick={handleClear}
              style={{ display:'inline-flex', alignItems:'center', gap:5, height:32, padding:'0 14px', borderRadius:8, border:'1.5px solid #d0d9e8', background:'#fff', color:'#64748b', fontSize:12, fontWeight:600, cursor:'pointer' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='#cc6b5c'; e.currentTarget.style.color='#cc6b5c'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='#d0d9e8'; e.currentTarget.style.color='#64748b'; }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Search box */}
      <div ref={wrapperRef} style={{ position:'relative', marginBottom:12 }}>
        <div style={{ position:'relative' }}>
          <input
            type="text"
            placeholder="Search by name, mobile or email…"
            value={searchText}
            onChange={handleSearchChange}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            readOnly={isSelected}
            style={{
              width:'100%', padding:'9px 36px 9px 12px',
              border: isSelected ? '1.5px solid #6ee7b7' : '1px solid #ced4da',
              borderRadius:8, fontSize:14, boxSizing:'border-box',
              background: isSelected ? '#f0fdf4' : '#fff',
              color: isSelected ? '#065f46' : '#111',
              outline:'none',
            }}
          />
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'#9ca3af', pointerEvents:'none' }}>
            {searching ? '⟳' : isSelected ? '✓' : '🔍'}
          </span>
        </div>

        {/* Dropdown results */}
        {showDropdown && suggestions.length > 0 && !isSelected && (
          <ul style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:999, listStyle:'none', margin:0, padding:'4px 0', maxHeight:240, overflowY:'auto' }}>
            {suggestions.map((cust, idx) => {
              const full = `${cust.firstName || ''} ${cust.lastName || ''}`.trim();
              return (
                <li key={idx}
                  onMouseDown={() => handleSelect(cust)}
                  style={{ padding:'10px 14px', cursor:'pointer', borderBottom: idx < suggestions.length-1 ? '1px solid #f3f4f6' : 'none', display:'flex', flexDirection:'column', gap:2 }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}
                >
                  <span style={{ fontWeight:600, fontSize:14, color:'#111827' }}>{full || 'Unknown'}</span>
                  <span style={{ fontSize:12, color:'#6b7280', display:'flex', gap:12 }}>
                    {cust.mobile && <span>📱 {cust.mobile}</span>}
                    {cust.email  && <span>✉ {cust.email}</span>}
                    {cust.custId && <span style={{ color:'#9ca3af' }}>{cust.custId}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* No results */}
        {showDropdown && !searching && searchText.length >= 2 && suggestions.length === 0 && !isSelected && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#9ca3af', zIndex:999, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
            No customers found for "{searchText}"
          </div>
        )}
      </div>

      {/* Prefilled fields after selection */}
      {isSelected && (
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <ReadOnlyField label="Name"   value={name}   />
          <ReadOnlyField label="Mobile" value={mobile} />
          <ReadOnlyField label="Email"  value={email}  />
        </div>
      )}

      {/* Loyalty enrollment for a selected customer */}
      {isSelected && (
        <div style={{ marginTop:10 }}>
          {selectedCustomer.isLoyaltyEnrolled ? (
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'#166534' }}>
              ✓ Enrolled in loyalty program
            </span>
          ) : (
            <label style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13, color:'#334b71', cursor: enrolling ? 'wait' : 'pointer' }}>
              <input type="checkbox" checked={false} disabled={enrolling} onChange={handleEnrollLoyalty} />
              {enrolling ? 'Enrolling…' : 'Enroll in loyalty program'}
            </label>
          )}
        </div>
      )}

      {/* Add Customer panel (reuses the CustomerMaster form) */}
      {showAddCustomer && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', justifyContent:'flex-end' }}>
          <div style={{ width:500, maxWidth:'95%', background:'#fff', height:'100vh', boxShadow:'-4px 0 24px rgba(0,0,0,0.15)' }}>
            <CustomerFormPanel onSaved={handleCustomerCreated} onClose={() => setShowAddCustomer(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

const ReadOnlyField = ({ label, value }) => (
  <div style={{ flex:'1 1 160px', minWidth:140 }}>
    <div style={{ fontSize:11, fontWeight:600, color:'#6b7280', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
    <div style={{ padding:'7px 10px', background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:6, fontSize:13, color:'#334b71', fontWeight:600, minHeight:34 }}>
      {value || <span style={{ color:'#d1d5db' }}>—</span>}
    </div>
  </div>
);

export default CustomerSearch;