import React, { useState, useEffect } from 'react';
import InvoiceTable from './InvoiceTable';
import Toast from './Toast';

const ManualDiscountPopup = ({
  isActive,
  onClose,
  onApplyDiscount,
  items,
}) => {
  const [manualItems, setManualItems] = useState([]);
  const [enteredCode, setEnteredCode] = useState('');
  const [showApprovalInput, setShowApprovalInput] = useState(false);
  const [toast, setToast] = useState(null);
  const [discountPercent, setDiscountPercent] = useState('');

  // Re-seed the scratchpad every time the popup OPENS, from the live invoice
  // items. Keying only on `items` failed: removing rows inside the popup empties
  // manualItems but never touches the parent `items` (removing here doesn't
  // delete from the real invoice), so on reopen the array reference is unchanged,
  // the effect doesn't re-run, and the table shows the emptied copy. Depending on
  // isActive resets the working copy — and the approval flow — on each open.
  useEffect(() => {
    if (!isActive) return;
    setManualItems(items.map(item => ({ ...item })));
    setShowApprovalInput(false);
    setEnteredCode('');
  }, [isActive, items]);

  useEffect(() => {
    const totalPrice = manualItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const totalDiscount = manualItems.reduce((sum, item) => sum + (parseFloat(item.discount) || 0), 0);
    if (totalPrice > 0) {
      setDiscountPercent(((totalDiscount / totalPrice) * 100).toFixed(2));
    } else {
      setDiscountPercent('');
    }
  }, [manualItems]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleSendForApproval = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('approvalCode', code);
    setShowApprovalInput(true);
    showToast(`Approval Code Sent: ${code}`, 'info');
  };

  const handleValidateCode = () => {
    const storedCode = localStorage.getItem('approvalCode');
    if (enteredCode === storedCode) {
      showToast('Discount Approved', 'success');
      onApplyDiscount?.(manualItems);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      showToast('Invalid Approval Code', 'error');
    }
  };

  const handlePriceChange = (index, value) => {
    const updated = [...manualItems];
    updated[index].price = value;
    setManualItems(updated);
  };

  const handleDiscountChange = (index, value) => {
  const updated = [...manualItems];
  const price = parseFloat(updated[index].price) || 0;
  const discount = parseFloat(value) || 0;

  if (discount > price) {
    showToast('Discount cannot exceed price.', 'error');
    return;
  }

  updated[index].discount = value;
  setManualItems(updated);
};


  const handleDiscountPercentChange = (index, value) => {
  const percent = parseFloat(value) || 0;
  if (percent > 100) {
    showToast('Discount percent cannot exceed 100%.', 'error');
    return;
  }

  const updated = [...manualItems];
  const price = parseFloat(updated[index].price) || 0;
  if (price > 0) {
    updated[index].discount = ((percent / 100) * price).toFixed(2);
  }
  setManualItems(updated);
};


  const handleRemove = (index) => {
    const updated = manualItems.filter((_, i) => i !== index);
    setManualItems(updated);
  };

  return (
    <>
      <div className={`popouter ${isActive ? 'active' : ''}`}>
        <div className="popovrly" onClick={onClose}></div>
        <div className="popin manualdisc">
          <div className="popuphdr">
            Manual Discount
            <span className="clsbtn" onClick={onClose}>
              <img src="images/clsic.svg" alt="Close" />
            </span>
          </div>

          <div className="popfrm">
            <InvoiceTable
              items={manualItems}
              onPriceChange={handlePriceChange}
              onDiscountChange={handleDiscountChange}
              onDiscountPercentChange={handleDiscountPercentChange}
              onRemove={handleRemove}
              showDiscountPercent={true}
              readOnlyInputs={false}
              editableDiscount={true} 
            />

            <div className="frmdiv">
              <label htmlFor="discper">Total Discount Percentage (%):</label>
              <input type="number" id="discper" value={discountPercent} readOnly />
            </div>

            {showApprovalInput && (
              <div className="frmdiv approvalcodebox">
               
                <label htmlFor="approvalcode" className='appvlcode'>Enter Approval Code:</label>
                <input
                  type="number"
                  id="approvalcode"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                />
                <button onClick={handleValidateCode} className="validbtn">Validate</button>
              </div>
            )}

            <div className="btnbar">
              <input
                type="button"
                className="prilnk"
                value="Send for Approval"
                onClick={handleSendForApproval}
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

export default ManualDiscountPopup;