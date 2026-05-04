import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../../../config';

const TOKEN         = () => localStorage.getItem("token");
const authFetch     = (url) => fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }).then(r => r.json());
const getCenterCode = () => {
  try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}").centerCode || ""; }
  catch { return ""; }
};

// ── AutocompleteInput — defined OUTSIDE to prevent re-mount on keystroke ──────
const AutocompleteInput = ({ label, value, onChange, onSelect, suggestions, loading, disabled }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (suggestions.length > 0) setOpen(true); }, [suggestions]);

  return (
    <div className="form-group" style={{ position: 'relative', flex: 1, minWidth: 180 }}>
      <div style={s.floatWrap}>
        <input
          style={{ ...s.inp, background: disabled ? '#f8fafc' : '#fff' }}
          type="text"
          placeholder=" "
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          autoComplete="off"
        />
        <label style={{ ...s.floatLabel, ...(value ? s.floatLabelUp : {}) }}>{label}</label>
        {loading && <span style={s.spinner}>⟳</span>}
      </div>

      {open && suggestions.length > 0 && (
        <ul style={s.dropdown}>
          {suggestions.map((item, idx) => (
            <li key={idx}
              onMouseDown={() => { onSelect(item); setOpen(false); }}
              style={s.dropItem}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span>{item._label}</span>
              {item._sub && <span style={s.dropSub}>{item._sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── SimpleAutocomplete for package / product (existing behaviour) ─────────────
const SimpleAutocomplete = ({ field, value, onChange, onSelect, suggestions, fieldFocused }) => (
  <div className="form-group" style={{ position: 'relative' }}>
    <input
      type="text"
      placeholder=" "
      id={field}
      value={value}
      onChange={e => onChange(field, e.target.value)}
    />
    <label htmlFor={field} className="frmlbl">
      {field.charAt(0).toUpperCase() + field.slice(1)}
    </label>
    {suggestions.length > 0 && fieldFocused === field && (
      <ul className="suggestion-list">
        {suggestions.map((item, idx) => (
          <li key={idx} onClick={() => onSelect(item)}>
            {item.packageName || item.productName || item.name}
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const InvoiceForm = ({ onAddItem, customer, showToast }) => {

  // ── Service autocomplete ───────────────────────────────────────────────────
  const [serviceText,       setServiceText]       = useState('');
  const [serviceSuggestions,setServiceSuggestions]= useState([]);
  const [serviceLoading,    setServiceLoading]    = useState(false);
  const [selectedService,   setSelectedService]   = useState(null);

  // ── Practitioner autocomplete ──────────────────────────────────────────────
  const [practText,         setPractText]         = useState('');
  const [practSuggestions,  setPractSuggestions]  = useState([]);
  const [selectedPract,     setSelectedPract]     = useState(null);
  const [allPractitioners,  setAllPractitioners]  = useState([]);

  // ── Package / Product (legacy autocomplete) ────────────────────────────────
  const [packageText,       setPackageText]       = useState('');
  const [productText,       setProductText]       = useState('');
  const [legacySuggestions, setLegacySuggestions] = useState([]);
  const [legacyFocused,     setLegacyFocused]     = useState(null);
  const [selectedLegacy,    setSelectedLegacy]    = useState(null);

  // ── Gift card ──────────────────────────────────────────────────────────────
  const [giftcard,          setGiftcard]          = useState('');

  const serviceDebounce = useRef(null);
  const practDebounce   = useRef(null);

  // ── Load all practitioners for center on mount ─────────────────────────────
  useEffect(() => {
    const centerCode = getCenterCode();
    if (!centerCode) return;
    authFetch(`${API_BASE_URL}/api/Master/LoadPractitionersByClinic/${encodeURIComponent(centerCode)}`)
      .then(json => {
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setAllPractitioners(list);
      })
      .catch(() => setAllPractitioners([]));
  }, []);

  // ── Service search ─────────────────────────────────────────────────────────
  const handleServiceChange = useCallback((value) => {
    setServiceText(value);
    setSelectedService(null);
    if (serviceDebounce.current) clearTimeout(serviceDebounce.current);
    if (!value || value.trim().length < 2) { setServiceSuggestions([]); return; }

    serviceDebounce.current = setTimeout(async () => {
      const centerCode = getCenterCode();
      if (!centerCode) return;
      try {
        setServiceLoading(true);
        const json = await authFetch(
          `${API_BASE_URL}/api/Master/GetServiceByName/${encodeURIComponent(value.trim())}/${centerCode}`
        );
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setServiceSuggestions(list.map(item => ({
          ...item,
          _label: item.serviceName || item.name || '',
          _sub:   item.serviceCode ? `Code: ${item.serviceCode}` : '',
        })));
      } catch { setServiceSuggestions([]); }
      finally { setServiceLoading(false); }
    }, 300);
  }, []);

  const handleServiceSelect = useCallback((item) => {
    setServiceText(item.serviceName || item.name || '');
    setSelectedService(item);
    setServiceSuggestions([]);
  }, []);

  // ── Practitioner search (client-side filter) ───────────────────────────────
  const handlePractChange = useCallback((value) => {
    setPractText(value);
    setSelectedPract(null);
    if (practDebounce.current) clearTimeout(practDebounce.current);
    if (!value || value.trim().length < 1) { setPractSuggestions([]); return; }

    practDebounce.current = setTimeout(() => {
      const lower = value.toLowerCase();
      setPractSuggestions(
        allPractitioners
          .filter(p => (p.fullName || '').toLowerCase().includes(lower))
          .map(p => ({ ...p, _label: p.fullName || '', _sub: p.practitionerCode || '' }))
      );
    }, 150);
  }, [allPractitioners]);

  const handlePractSelect = useCallback((item) => {
    setPractText(item.fullName || item._label || '');
    setSelectedPract(item);
    setPractSuggestions([]);
  }, []);

  // ── Package / Product legacy search ───────────────────────────────────────
  const handleLegacyChange = async (field, value) => {
    if (field === 'package') setPackageText(value);
    if (field === 'product') setProductText(value);
    setLegacyFocused(field);
    setSelectedLegacy(null);

    const centerCode = getCenterCode();
    if (!value || value.trim().length < 2 || !centerCode) { setLegacySuggestions([]); return; }

    try {
      const base = field === 'package'
        ? `${API_BASE_URL}/api/Master/GetPackageByName`
        : `${API_BASE_URL}/api/Master/GetProductByName`;
      const json = await authFetch(`${base}/${encodeURIComponent(value.trim())}/${centerCode}`);
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setLegacySuggestions(list.map(item => ({ ...item, type: field })));
    } catch { setLegacySuggestions([]); }
  };

  const handleLegacySelect = (item) => {
    if (item.type === 'package') { setPackageText(item.packageName || item.name || ''); setProductText(''); }
    if (item.type === 'product') { setProductText(item.productName || item.name || ''); setPackageText(''); }
    setLegacySuggestions([]);
    setLegacyFocused(null);
    setSelectedLegacy(item);
  };

  // ── Add to invoice ─────────────────────────────────────────────────────────
  const handleAdd = () => {
    const custId = customer?.custid || customer?.custId || customer?.fullName;
    if (!custId) { showToast?.("Please select a customer before adding."); return; }

    // Service + practitioner path
    if (selectedService || serviceText) {
      if (!selectedService) { showToast?.("Please select a service from the dropdown."); return; }
      if (!selectedPract)   { showToast?.("Please select a practitioner."); return; }

      onAddItem?.({
        name:             selectedService.serviceName || selectedService.name || '',
        code:             selectedService.serviceCode || selectedService.code || '',
        type:             'service',
        price:            parseFloat(selectedService.price ?? 0),
        discount:         0,
        taxpercent:       selectedService.taxPercent ?? '0.00',
        citizentax:       selectedService.taxPercent ?? '0.00',
        practitionerName: selectedPract.fullName || practText,
        practitionerCode: selectedPract.practitionerCode || selectedPract.id || '',
      });

      setServiceText(''); setSelectedService(null); setServiceSuggestions([]);
      setPractText('');   setSelectedPract(null);   setPractSuggestions([]);
      return;
    }

    // Package / product path (legacy)
    if (selectedLegacy) {
      if (!selectedPract) { showToast?.("Please select a practitioner."); return; }

      let name = '', code = '';
      if (selectedLegacy.type === 'package') { name = selectedLegacy.packageName || ''; code = selectedLegacy.packageCode || ''; }
      if (selectedLegacy.type === 'product') { name = selectedLegacy.productName || ''; code = selectedLegacy.productCode || ''; }

      onAddItem?.({
        name, code, type: selectedLegacy.type,
        price:            parseFloat(selectedLegacy.price || selectedLegacy.packageValue || 0),
        discount:         0,
        taxpercent:       selectedLegacy.taxPercent ?? '0.00',
        citizentax:       selectedLegacy.taxPercent ?? '0.00',
        practitionerName: selectedPract.fullName || practText,
        practitionerCode: selectedPract.practitionerCode || selectedPract.id || '',
      });

      setPackageText(''); setProductText(''); setSelectedLegacy(null); setLegacySuggestions([]);
      setPractText('');   setSelectedPract(null); setPractSuggestions([]);
      setGiftcard('');
      return;
    }

    showToast?.("Please select a service, package, or product.");
  };

  return (
    <form className="invform">
      <div className="frmwrpinv">

        {/* ── Service autocomplete (new) ── */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <AutocompleteInput
            label="Service"
            value={serviceText}
            onChange={handleServiceChange}
            onSelect={handleServiceSelect}
            suggestions={serviceSuggestions}
            loading={serviceLoading}
          />
          {selectedService && (
            <div style={s.priceBadge}>
              Price: <strong>{parseFloat(selectedService.price ?? 0).toFixed(2)}</strong>
            </div>
          )}
        </div>

        {/* ── Package (legacy) ── */}
        <SimpleAutocomplete
          field="package"
          value={packageText}
          onChange={handleLegacyChange}
          onSelect={handleLegacySelect}
          suggestions={legacySuggestions}
          fieldFocused={legacyFocused}
        />

        {/* ── Product (legacy) ── */}
        <SimpleAutocomplete
          field="product"
          value={productText}
          onChange={handleLegacyChange}
          onSelect={handleLegacySelect}
          suggestions={legacySuggestions}
          fieldFocused={legacyFocused}
        />

        {/* ── Practitioner autocomplete (new) ── */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <AutocompleteInput
            label="Practitioner"
            value={practText}
            onChange={handlePractChange}
            onSelect={handlePractSelect}
            suggestions={practSuggestions}
            loading={false}
            disabled={allPractitioners.length === 0}
          />
        </div>

        {/* ── Gift Card (legacy) ── */}
        <div className="form-group">
          <input
            type="text"
            placeholder=" "
            id="giftcard"
            value={giftcard}
            onChange={e => setGiftcard(e.target.value)}
          />
          <label htmlFor="giftcard" className="frmlbl">Gift Card</label>
        </div>

        {/* ── Add button ── */}
        <div className="form-group frmbtngrp">
          <button type="button" className="addbtn" onClick={handleAdd}>
            Add
          </button>
        </div>

      </div>
    </form>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  floatWrap:   { position: 'relative' },
  inp:         { width: '100%', padding: '6px 10px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12, boxSizing: 'border-box', outline: 'none' },
  floatLabel:  { position: 'absolute', left: 12, top: 9, fontSize: 12, color: '#777', pointerEvents: 'none', transition: 'all .15s' },
  floatLabelUp:{ top: 3, fontSize: 10, color: '#777', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.04em' },
  spinner:     { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 16 },
  dropdown:    { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, listStyle: 'none', margin: 0, padding: '4px 0', maxHeight: 220, overflowY: 'auto' },
  dropItem:    { padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#111827', display: 'flex', flexDirection: 'column', gap: 2 },
  dropSub:     { fontSize: 11, color: '#9ca3af' },
  priceBadge:  { marginTop: 4, fontSize: 12, color: '#065f46', background: '#f0fdf4', border: '1px solid #6ee7b7', borderRadius: 6, padding: '3px 8px', display: 'inline-block' },
};

export default InvoiceForm;