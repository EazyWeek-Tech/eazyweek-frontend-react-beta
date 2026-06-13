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
    <div ref={wrapRef} className="form-group" style={{ position: 'relative', flex: 1, minWidth: 180 }}>
      <input
        className="frminp"
        type="text"
        placeholder={label}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        autoComplete="off"
        style={{ background: disabled ? '#f8fafc' : '#fff' }}
      />
      <label className="frmlbl">{label}</label>
      {loading && (
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 16 }}>⟳</span>
      )}
      {open && suggestions.length > 0 && (
        <ul style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, listStyle: 'none', margin: 0, padding: '4px 0', maxHeight: 220, overflowY: 'auto' }}>
          {suggestions.map((item, idx) => (
            <li key={idx}
              onMouseDown={() => { onSelect(item); setOpen(false); }}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#111827', display: 'flex', flexDirection: 'column', gap: 2 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span>{item._label}</span>
              {item._sub && <span style={{ fontSize: 11, color: '#9ca3af' }}>{item._sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── SimpleAutocomplete for product only ──────────────────────────────────────
const SimpleAutocomplete = ({ field, value, onChange, onSelect, suggestions, fieldFocused }) => (
  <div className="form-group" style={{ position: 'relative' }}>
    <input
      type="text"
      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
      id={field}
      value={value}
      onChange={e => onChange(field, e.target.value)}
      className="frminp"
    />
    <label htmlFor={field} className="frmlbl">
      {field.charAt(0).toUpperCase() + field.slice(1)}
    </label>
    {suggestions.length > 0 && fieldFocused === field && (
      <ul style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, listStyle: 'none', margin: 0, padding: '4px 0', maxHeight: 220, overflowY: 'auto' }}>
        {suggestions.map((item, idx) => (
          <li key={idx}
            onMouseDown={() => onSelect(item)}
            style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#111827' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            {item.productName || item.name}
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const InvoiceForm = ({ onAddItem, customer, showToast, onClearCart, items = [] }) => {

  // ── Service ───────────────────────────────────────────────────────────────
  const [serviceText,        setServiceText]        = useState('');
  const [serviceSuggestions, setServiceSuggestions] = useState([]);
  const [serviceLoading,     setServiceLoading]     = useState(false);
  const [selectedService,    setSelectedService]    = useState(null);

  // ── Package (now uses same AutocompleteInput as service) ─────────────────
  const [packageText,        setPackageText]        = useState('');
  const [packageSuggestions, setPackageSuggestions] = useState([]);
  const [packageLoading,     setPackageLoading]     = useState(false);
  const [selectedPackage,    setSelectedPackage]    = useState(null);

  // ── Product ───────────────────────────────────────────────────────────────
  const [productText,        setProductText]        = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [productFocused,     setProductFocused]     = useState(false);
  const [selectedProduct,    setSelectedProduct]    = useState(null);

  // ── Practitioner ──────────────────────────────────────────────────────────
  const [practText,          setPractText]          = useState('');
  const [practSuggestions,   setPractSuggestions]   = useState([]);
  const [selectedPract,      setSelectedPract]      = useState(null);
  const [allPractitioners,   setAllPractitioners]   = useState([]);

  const [giftcard,           setGiftcard]           = useState('');

  const serviceDebounce = useRef(null);
  const packageDebounce = useRef(null);
  const practDebounce   = useRef(null);

  // Load practitioners on mount
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

  // ── Service search ────────────────────────────────────────────────────────
  const handleServiceChange = useCallback((value) => {
    setServiceText(value);
    setSelectedService(null);
    // Clear package if service is being typed
    if (value) { setPackageText(''); setSelectedPackage(null); setProductText(''); setSelectedProduct(null); }
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
          _sub:   item.serviceCode
            ? `Code: ${item.serviceCode}${item.price > 0 ? ` · SAR ${parseFloat(item.price).toFixed(2)}` : ''}`
            : '',
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

  // ── Package search ────────────────────────────────────────────────────────
  const handlePackageChange = useCallback((value) => {
    setPackageText(value);
    setSelectedPackage(null);
    // Clear service/product if package is being typed
    if (value) { setServiceText(''); setSelectedService(null); setProductText(''); setSelectedProduct(null); }
    if (packageDebounce.current) clearTimeout(packageDebounce.current);
    if (!value || value.trim().length < 2) { setPackageSuggestions([]); return; }

    packageDebounce.current = setTimeout(async () => {
      const centerCode = getCenterCode();
      try {
        setPackageLoading(true);
        const json = await authFetch(
          `${API_BASE_URL}/api/Package/SearchByName/${encodeURIComponent(value.trim())}/${centerCode}`
        );
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setPackageSuggestions(list.map(item => ({
          ...item,
          _label: item.packageName || '',
          _sub:   item.packageCode
            ? `Code: ${item.packageCode}${item.price > 0 ? ` · SAR ${parseFloat(item.price).toFixed(2)}` : ''}`
            : '',
        })));
      } catch { setPackageSuggestions([]); }
      finally { setPackageLoading(false); }
    }, 300);
  }, []);

  const handlePackageSelect = useCallback((item) => {
    setPackageText(item.packageName || item._label || '');
    setSelectedPackage(item);
    setPackageSuggestions([]);
  }, []);

  // ── Practitioner search ───────────────────────────────────────────────────
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

  // ── Product search ────────────────────────────────────────────────────────
  const handleProductChange = async (field, value) => {
    setProductText(value);
    setProductFocused(true);
    setSelectedProduct(null);
    if (value) { setServiceText(''); setSelectedService(null); setPackageText(''); setSelectedPackage(null); }

    const centerCode = getCenterCode();
    if (!value || value.trim().length < 2 || !centerCode) { setProductSuggestions([]); return; }
    try {
      const json = await authFetch(
        `${API_BASE_URL}/api/Master/GetProductByName/${encodeURIComponent(value.trim())}/${centerCode}`
      );
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setProductSuggestions(list.map(item => ({ ...item, type: 'product' })));
    } catch { setProductSuggestions([]); }
  };

  const handleProductSelect = (item) => {
    setProductText(item.productName || item.name || '');
    setProductSuggestions([]);
    setProductFocused(false);
    setSelectedProduct(item);
  };

  // ── Add to invoice ────────────────────────────────────────────────────────
  const handleAdd = () => {
    const custId = customer?.custid || customer?.custId || customer?.fullName;
    if (!custId) { showToast?.("Please select a customer before adding."); return; }

    // Service
    if (serviceText) {
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

    // Package
    if (packageText) {
      if (!selectedPackage) { showToast?.("Please select a package from the dropdown."); return; }
      if (!selectedPract)   { showToast?.("Please select a practitioner."); return; }
      onAddItem?.({
        name:             selectedPackage.packageName || '',
        code:             selectedPackage.packageCode || '',
        type:             'package',
        itemType:         'package',
        price:            parseFloat(selectedPackage.price ?? 0),
        discount:         0,
        taxpercent:       selectedPackage.taxPercent ?? '0.00',
        citizentax:       selectedPackage.taxPercent ?? '0.00',
        practitionerName: selectedPract.fullName || practText,
        practitionerCode: selectedPract.practitionerCode || selectedPract.id || '',
      });
      setPackageText(''); setSelectedPackage(null); setPackageSuggestions([]);
      setPractText('');   setSelectedPract(null);   setPractSuggestions([]);
      return;
    }

    // Product
    if (productText) {
      if (!selectedProduct) { showToast?.("Please select a product from the dropdown."); return; }
      onAddItem?.({
        name:             selectedProduct.productName || selectedProduct.name || '',
        code:             selectedProduct.productCode || '',
        type:             'product',
        price:            parseFloat(selectedProduct.price || selectedProduct.packageValue || 0),
        discount:         0,
        taxpercent:       selectedProduct.taxPercent ?? '0.00',
        citizentax:       selectedProduct.taxPercent ?? '0.00',
        practitionerName: selectedPract?.fullName || practText || '',
        practitionerCode: selectedPract?.practitionerCode || selectedPract?.id || '',
      });
      setProductText(''); setSelectedProduct(null); setProductSuggestions([]);
      setPractText('');   setSelectedPract(null);   setPractSuggestions([]);
      setGiftcard('');
      return;
    }

    showToast?.("Please select a service, package, or product.");
  };

  // ── Clear cart ────────────────────────────────────────────────────────────
  const handleClearCart = () => {
    if (items.length === 0) { showToast?.("Cart is already empty."); return; }
    if (window.confirm("Void this transaction? All items in the cart will be removed.")) {
      // Clear all form fields
      setServiceText(''); setSelectedService(null); setServiceSuggestions([]);
      setPackageText('');  setSelectedPackage(null);  setPackageSuggestions([]);
      setProductText('');  setSelectedProduct(null);  setProductSuggestions([]);
      setPractText('');    setSelectedPract(null);     setPractSuggestions([]);
      setGiftcard('');
      // Clear the cart in parent
      onClearCart?.();
      showToast?.("Transaction voided.");
    }
  };

  return (
    <form className="invform">
      <div className="frmwrpinv">

        <AutocompleteInput
          label="Service"
          value={serviceText}
          onChange={handleServiceChange}
          onSelect={handleServiceSelect}
          suggestions={serviceSuggestions}
          loading={serviceLoading}
        />

        {/* Package — now uses AutocompleteInput with debounced API search */}
        <AutocompleteInput
          label="Package"
          value={packageText}
          onChange={handlePackageChange}
          onSelect={handlePackageSelect}
          suggestions={packageSuggestions}
          loading={packageLoading}
        />

        {/* Product — retains SimpleAutocomplete */}
        <SimpleAutocomplete
          field="product"
          value={productText}
          onChange={handleProductChange}
          onSelect={handleProductSelect}
          suggestions={productSuggestions}
          fieldFocused={productFocused ? "product" : null}
        />

        <AutocompleteInput
          label="Practitioner"
          value={practText}
          onChange={handlePractChange}
          onSelect={handlePractSelect}
          suggestions={practSuggestions}
          loading={false}
          disabled={allPractitioners.length === 0}
        />

        <div className="form-group">
          <input
            type="text"
            placeholder="Gift Card"
            id="giftcard"
            value={giftcard}
            onChange={e => setGiftcard(e.target.value)}
            className="frminp"
          />
          <label htmlFor="giftcard" className="frmlbl">Gift Card</label>
        </div>

        <div className="form-group frmbtngrp">
          <button type="button" className="addbtn" onClick={handleAdd}>Add</button>
        </div>

        {/* Void Transaction button */}
        <div className="form-group frmbtngrp">
          <button
            type="button"
            className="pribtnblue"
            onClick={handleClearCart}
            style={{ height: 30,padding: "0 14px", fontSize: 13, fontWeight: 700 }}
          >
            Void Transaction
          </button>
        </div>

      </div>
    </form>
  );
};

export default InvoiceForm;