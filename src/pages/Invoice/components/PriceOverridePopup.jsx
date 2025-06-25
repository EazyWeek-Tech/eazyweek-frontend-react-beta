import React, { useState, useEffect } from 'react';
import InvoiceTable from './InvoiceTable';
import Toast from './Toast';

const PriceOverridePopup = ({
  isActive,
  onClose,
  onApplyPriceOverride,
  items = [],
}) => {
  const [overrideItems, setOverrideItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const originals = items.map(item => ({ ...item }));
    const initialized = items.map(item => ({
      ...item,
      newPrice: item.price, // Use current price as initial value
    }));
    setOriginalItems(originals);
    setOverrideItems(initialized);
  }, [items]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handlePriceChange = (index, value) => {
    setOverrideItems(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = {
        ...updated[index],
        newPrice: value,
      };
      return updated;
    });
  };

  const handleApply = () => {
  const hasInvalid = overrideItems.some((item) => {
    const newP = parseFloat(item.newPrice);
    const original = parseFloat(item.originalPrice || item.price);
    
    // If user provided a new price, validate it
    if (!isNaN(newP)) {
      return newP < original;
    }

    return false; // Skip unchanged items
  });

  if (hasInvalid) {
    showToast('New price must be greater than or equal to original price.', 'error');
    return;
  }

  const updatedItems = overrideItems.map((item) => {
    const newP = parseFloat(item.newPrice);
    const original = parseFloat(item.originalPrice || item.price);

    return {
      ...item,
      price: !isNaN(newP) ? newP.toFixed(2) : original.toFixed(2), // use newPrice if present, else original
      newPrice: undefined,
    };
  });

  onApplyPriceOverride?.(updatedItems);
  onClose();
};


  const handleRemove = (index) => {
    setOverrideItems(prev => prev.filter((_, i) => i !== index));
    setOriginalItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className={`popouter ${isActive ? 'active' : ''}`}>
        <div className="popovrly" onClick={onClose}></div>
        <div className="popin manualdisc">
          <div className="popuphdr">
            Price Override
            <span className="clsbtn" onClick={onClose}>
              <img src="images/clsic.svg" alt="Close" />
            </span>
          </div>

          <div className="popfrm">
            <InvoiceTable
              items={overrideItems}
              onPriceChange={handlePriceChange}
              readOnlyInputs={false}
              onRemove={handleRemove}
              showDiscountPercent={false}
              isPriceOverride={true}
            />

            <div className="btnbar">
              <input
                type="button"
                className="prilnk"
                value="Apply New Price"
                onClick={handleApply}
              />
              <input
                type="button"
                className="seclnk"
                value="Cancel"
                onClick={onClose}
              />
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default PriceOverridePopup;
