import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import { API_BASE_URL } from '../../../config';

const PACKAGE_API = `${API_BASE_URL}/api/Master/GetPackageByName`;
const SERVICE_API = `${API_BASE_URL}/api/Master/GetServiceByName`;
const PRODUCT_API = `${API_BASE_URL}/api/Master/GetProductByName`;

const createDataHandler = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
  return await response.json();
};

const InvoiceForm = ({ onAddItem, resetKey, customer, showToast }) => {
  const [formData, setFormData] = useState({
    package: '',
    product: '',
    service: '',
    practitioner: '',
    giftcard: ''
  });
  const [practitioners, setPractitioners] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState([]);
  const [fieldFocused, setFieldFocused] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const getCenterCode = () => {
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    return stored ? JSON.parse(stored).centerCode : "";
  };

  // Fetch practitioners on mount
  useEffect(() => {
    const centerCode = getCenterCode();
    if (!centerCode) return;

    createDataHandler(`${API_BASE_URL}/api/Master/LoadAllPractioner/${centerCode}`)
      .then(setPractitioners)
      .catch((err) => {
        console.error("Failed to fetch practitioners:", err);
        setPractitioners([]);
      });
  }, []);

  useEffect(() => {
    if (fieldFocused === 'practitioner' && formData.practitioner.trim() !== '') {
      const matches = practitioners.filter((p) =>
        p.name?.toLowerCase().includes(formData.practitioner.toLowerCase())
      );
      setFilteredPractitioners(matches);
    }
  }, [formData.practitioner, fieldFocused, practitioners]);

  const handleChange = async (field, value) => {
    setFormData({ ...formData, [field]: value });
    setFieldFocused(field);

    const centerCode = getCenterCode();
    if (!centerCode) return;

    if (['package', 'product', 'service'].includes(field)) {
      if (value.trim().length >= 2) {
        const encodedValue = encodeURIComponent(value.trim());

        let url = '';
        if (field === 'package') {
          url = `${PACKAGE_API}/${encodedValue}/${centerCode}`;
        } else if (field === 'product') {
          url = `${PRODUCT_API}/${encodedValue}/${centerCode}`;
        } else if (field === 'service') {
          url = `${SERVICE_API}/${encodedValue}/${centerCode}`;
        }

        try {
          const result = await createDataHandler(url);
          const suggestions = Array.isArray(result) ? result : [result];

          const matches = suggestions.map((item) => ({
            ...item,
            type: field
          }));

          setFilteredSuggestions(matches);
        } catch (error) {
          console.error(`Failed to fetch ${field} suggestions:`, error);
          setFilteredSuggestions([]);
        }
      } else {
        setFilteredSuggestions([]);
      }
    }
  };

  const handleSelect = (item) => {
    setFormData({
      package: item.packageName || item.name || '',
      product: item.productname || '',
      service: item.servicename || '',
      practitioner: '',
      giftcard: ''
    });
    setFilteredSuggestions([]);
    setFieldFocused(null);
    setSelectedItem(item);
  };

const handleSelectPractitioner = (name) => {
  setFormData((prev) => ({ ...prev, practitioner: name }));
  setFilteredPractitioners([]);
  setFieldFocused(null);
};

  const handleAdd = () => {
  if (!customer || !customer.firstName || !customer.fullName || !customer.mobile?.trim()) {
    showToast?.("Please fill in the customer details before adding a product.");
    return;
  }

  if (!formData.practitioner.trim()) {
    showToast?.("Please select a practitioner before adding the item.");
    return;
  }

  if (selectedItem) {
    let name = 'Unnamed Item';
    let code = '';
    if (selectedItem.type === 'package') {
      name = selectedItem.packageName || selectedItem.name || 'Unnamed Package';
      code = selectedItem.packageCode || selectedItem.code || '';
    } else if (selectedItem.type === 'service') {
      name = selectedItem.servicename || 'Unnamed Service';
      code = selectedItem.servicecode || selectedItem.code || '';
    } else if (selectedItem.type === 'product') {
      name = selectedItem.productname || 'Unnamed Product';
      code = selectedItem.productcode || selectedItem.code || '';
    }

    const matchedPractitioner = practitioners.find(p => p.name === formData.practitioner);

    const newItem = {
      name,
      code,
      type: selectedItem.type,
      price: selectedItem.price || selectedItem.packageValue || 0,
      discount: '',
      practitionerName: matchedPractitioner?.name || formData.practitioner,
      practitionerCode: matchedPractitioner?.id || '',
      taxpercent: selectedItem.taxpercent ?? '0.00',
      citizentax: selectedItem.citizentax ?? '0.00'
    };

    onAddItem(newItem);
    setSelectedItem(null);
  }
};




  return (
    <form className="invform">
      <div className="frmwrpinv">
        {['package', 'product', 'service'].map((field) => (
          <div className="form-group" style={{ position: 'relative' }} key={field}>
            <input
              type="text"
              placeholder=" "
              id={field}
              value={formData[field]}
              onChange={(e) => handleChange(field, e.target.value)}
            />
            <label htmlFor={field} className="frmlbl">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            {filteredSuggestions.length > 0 && fieldFocused === field && (
              <ul className="suggestion-list">
                {filteredSuggestions.map((item, idx) => (
                  <li key={idx} onClick={() => handleSelect(item)}>
                    {item.packageName || item.productname || item.servicename || item.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <div className="form-group" style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder=" "
            id="practitioner"
            value={formData.practitioner}
            onChange={(e) => handleChange('practitioner', e.target.value)}
          />
          <label htmlFor="practitioner" className="frmlbl">Practitioner</label>
          {filteredPractitioners.length > 0 && fieldFocused === 'practitioner' && (
  <ul className="suggestion-list">
    {filteredPractitioners.map((item, idx) => (
      <li key={idx} onClick={() => handleSelectPractitioner(item.name)}>
        {item.name}
      </li>
    ))}
  </ul>
)}
        </div>

        <div className="form-group">
          <input
            type="text"
            placeholder=" "
            id="giftcard"
            value={formData.giftcard}
            onChange={(e) => handleChange('giftcard', e.target.value)}
          />
          <label htmlFor="giftcard" className="frmlbl">Gift Card</label>
        </div>

        <div className="form-group frmbtngrp">
          <button type="button" className="addbtn" onClick={handleAdd}>Add Product</button>
        </div>
      </div>
    </form>
  );
};

export default InvoiceForm;
