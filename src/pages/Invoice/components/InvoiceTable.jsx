// InvoiceTable.jsx
import React from 'react';

const InvoiceTable = ({
  items,
  onPriceChange,
  onDiscountChange,
  onDiscountPercentChange,
  onRemove,
  showDiscountPercent = false,
  readOnlyInputs = false,
  customer,
  isPriceOverride,
  editableDiscount = false,   // <— NEW
}) => {
  const isCitizen = customer?.status?.toLowerCase() === 'citizen';

  return (
    <div className="invtable">
      <table id="invctable">
        <thead>
          <tr>
            <th>No.</th>
            <th>Item</th>
            <th>Quantity</th>
            {isPriceOverride ? (
              <>
                <th>Original Price</th>
                <th>New Price</th>
              </>
            ) : (
              <th>Price</th>
            )}
            {!isPriceOverride && (
              <>
                <th>Discount</th>
                {showDiscountPercent && <th>Discount %</th>}
              </>
            )}
            <th>Amount without VAT</th>
            <th>VAT</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={10}>
                <div className="emptytable">
                  <p className="nodata">No invoice items added yet.</p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const price = parseFloat(item.price) || 0;
              const originalPrice = parseFloat(item.originalPrice || item.price);
              const newPrice = item.newPrice ?? '';
              const discount = parseFloat(item.discount) || 0;
              const discountPercent = price > 0 ? ((discount / price) * 100).toFixed(2) : '';
              const amountWithoutVat = Math.max(price - discount, 0);

              const taxRate = isCitizen
                ? parseFloat(item.citizentax) || 0
                : parseFloat(item.taxpercent) || 0;

              const tax = (amountWithoutVat * taxRate) / 100;
              const total = amountWithoutVat + tax;

              return (
                <tr key={idx}>
                  <td className="invno">{idx + 1}</td>
                  <td>{item.name}</td>
                  <td className="qtyno">1</td>

                  {isPriceOverride ? (
                    <>
                      <td>{originalPrice.toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          value={newPrice}
                          onChange={(e) => onPriceChange?.(idx, e.target.value)}
                          readOnly={readOnlyInputs}
                        />
                      </td>
                    </>
                  ) : (
                    <td className="prcval">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => onPriceChange?.(idx, e.target.value)}
                        readOnly={readOnlyInputs}
                      />
                    </td>
                  )}

                  {!isPriceOverride && (
                    <>
                      <td>
                        {/* Now controlled by editableDiscount */}
                        <input
                          type="text"
                          value={item.discount || ''}
                          onChange={(e) => onDiscountChange?.(idx, e.target.value)}
                          disabled={!editableDiscount || readOnlyInputs}
                          title={!editableDiscount ? "Discount amount is controlled by Discount %" : undefined}
                        />
                      </td>

                      {showDiscountPercent && (
                        <td>
                          <input
                            type="number"
                            value={item.discountPercent || discountPercent}
                            onChange={(e) => onDiscountPercentChange?.(idx, e.target.value)}
                            readOnly={readOnlyInputs}
                          />
                        </td>
                      )}
                    </>
                  )}

                  <td className="discno">{amountWithoutVat.toFixed(2)}</td>
                  <td className="discno">
                    {tax.toFixed(2)}{' '}
                    <span style={{ color: '#888' }}>({taxRate.toFixed(0)}%)</span>
                  </td>
                  <td className="discno">{total.toFixed(2)}</td>
                  <td className="actbtncell">
                    <button
                      className="delbtn tooltip"
                      data-tooltip="Delete"
                      data-tooltip-pos="left"
                      onClick={() => onRemove?.(idx)}
                    >
                      <img src="images/rmove.svg" alt="Delete" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable;
