import React, { useState } from 'react';
import ManualDiscountPopup from './ManualDiscountPopup';
import Toast from './Toast';

const InvoiceSummary = ({
  showPopup,
  setShowPopup,
  onManualDiscount,
  items,
  onPriceChange,
  onDiscountChange,
  onRemove,
  onClearCart,
  onSuspendCart,
  onRecallCartById,
  suspendedCarts,
  isFinalized
}) => {
  const [toast, setToast] = useState(null);

  const handleManualDiscountClick = () => {
    if (items.length === 0) {
      setToast({ message: 'Please add a product before applying manual discount.', type: 'error' });
    } else {
      setShowPopup(true);
    }
  };

  const handleClearCartClick = () => {
    onClearCart();
    setToast({ message: 'Cart cleared.', type: 'info' });
  };

  const handleSuspendCartClick = () => {
    if (items.length === 0) {
      setToast({ message: 'Cart is empty. Nothing to suspend.', type: 'warning' });
      return;
    }
    onSuspendCart();
    setToast({ message: 'Cart suspended.', type: 'success' });
  };

  const handleRecallChange = (e) => {
    const cartId = e.target.value;
    if (cartId) {
      onRecallCartById(cartId);
      setToast({ message: 'Suspended cart recalled.', type: 'success' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = async () => {
    try {
      const response = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      if (response.ok) {
        setToast({ message: 'Invoice emailed successfully.', type: 'success' });
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      setToast({ message: 'Error sending invoice.', type: 'error' });
    }
  };

  return (
    <div className="rghtdiv">
      <div className="actwrp btnflxinv">
        <div className="invlftdiv">
          <button
            onClick={handleManualDiscountClick}
            className="pribtnblue"
            disabled={items.length === 0 || isFinalized}
            style={items.length === 0 || isFinalized ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            Manual Discount
          </button>

          <ManualDiscountPopup
            isActive={showPopup}
            onClose={() => setShowPopup(false)}
            onApplyDiscount={onManualDiscount}
            items={items}
            onPriceChange={onPriceChange}
            onDiscountChange={onDiscountChange}
            onRemove={onRemove}
          />

          {['Issue Loyalty Card', 'Price Override', 'Apply Package', 'Coupon Code'].map((action, index) => (
            <button key={index} className="pribtnblue" disabled={isFinalized}>
              {action}
            </button>
          ))}

         

          {suspendedCarts.length > 0 && (
            <select className="recallselect" onChange={handleRecallChange} defaultValue="">
              <option value="" disabled>Select suspended cart</option>
              {suspendedCarts.map(cart => (
                <option key={cart.id} value={cart.id}>
                  {`Cart Suspended @ ${cart.timestamp}`}
                </option>
              ))}
            </select>
          )}
        </div>

         <button className="pribtnblue tooltip" onClick={handleClearCartClick} disabled={isFinalized} data-tooltip="Clear Cart" data-tooltip-pos="down">
            <img src={`${import.meta.env.BASE_URL}images/shoppingcrt.svg`} alt="Clear Cart" width={16}  />
          </button>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default InvoiceSummary;
