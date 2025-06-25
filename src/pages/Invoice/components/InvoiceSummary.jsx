
import React, { useState } from 'react';
import ManualDiscountPopup from './ManualDiscountPopup';
import PriceOverridePopup from './PriceOverridePopup';
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
  isFinalized,
  onApplyPriceOverride
}) => {
  const [toast, setToast] = useState(null);
  const [showPriceOverridePopup, setShowPriceOverridePopup] = useState(false);

  const handleManualDiscountClick = () => {
    if (items.length === 0) {
      setToast({ message: 'Please add a product before applying manual discount.', type: 'error' });
    } else {
      setShowPopup(true);
    }
  };

  const handlePriceOverrideClick = () => {
    if (items.length === 0) {
      setToast({ message: 'Please add a product before applying price override.', type: 'error' });
    } else {
      setShowPriceOverridePopup(true);
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

          <button
            className="pribtnblue"
            disabled={items.length === 0 || isFinalized}
            onClick={handlePriceOverrideClick}
          >
            Price Override
          </button>

          <PriceOverridePopup
            isActive={showPriceOverridePopup}
            onClose={() => setShowPriceOverridePopup(false)}
            onApplyPriceOverride={onApplyPriceOverride}
            items={items}
          />

          <button className="pribtnblue" disabled={isFinalized}>Issue Loyalty Card</button>
          <button className="pribtnblue" disabled={isFinalized}>Apply Package</button>
          <button className="pribtnblue" disabled={isFinalized}>Coupon Code</button>

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
          <img src={`${import.meta.env.BASE_URL}images/shoppingcrt.svg`} alt="Clear Cart" width={16} />
        </button>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default InvoiceSummary;
