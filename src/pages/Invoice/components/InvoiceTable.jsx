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
  editableDiscount = false,
  appliedPromotions = [],   // [{ discountId, discountName, applicationLevel, itemCode, discountAmount }]
  onRemovePromotion,        // () => void — removes ALL item-level promotions at once
  onRemoveManualDiscount,   // (idx) => void — removes manual discount from specific item
}) => {
  const isCitizen = customer?.status?.toLowerCase() === 'citizen';

  // Find the single item-level promotion (max 1 per FRD)
  const itemPromo = appliedPromotions.find(p => p.applicationLevel === "Item Level");

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
              const price           = parseFloat(item.price) || 0;
              const originalPrice   = parseFloat(item.originalPrice || item.price);
              const newPrice        = item.newPrice ?? '';
              const discount        = parseFloat(item.discount) || 0;
              const discountPercent = price > 0 ? ((discount / price) * 100).toFixed(2) : '';
              const amountWithoutVat = Math.max(price - discount, 0);

              const taxRate = isCitizen
                ? parseFloat(item.citizentax)  || 0
                : parseFloat(item.taxpercent)  || 0;

              const tax   = (amountWithoutVat * taxRate) / 100;
              const total = amountWithoutVat + tax;

              // Check if this item has the item-level promo applied
              const itemCode    = item.code || item.itemCode || "";
              const hasPromo    = itemPromo && (
                itemPromo.itemCode === itemCode ||
                item._promotionId === itemPromo.discountId
              );

              const colSpan = isPriceOverride
                ? 9
                : showDiscountPercent ? 10 : 9;

              return (
                <React.Fragment key={idx}>
                  {/* ── Main item row ── */}
                  <tr>
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

                  {/* ── Promo sub-row (only for applicable items) ── */}
                  {hasPromo && (
                    <tr style={{ background: "#fff" }}>
                      <td />
                      <td colSpan={colSpan} style={{ paddingTop: 4, paddingBottom: 6 }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: "#a9a7a7",
                          fontWeight: 600,
                          fontStyle: "italic"
                        }}>
                          <span style={{ fontSize: 13 }}>🏷</span>
                          Promo applied: {itemPromo.discountName}
                          {itemPromo.discountAmount > 0 && (
                            <span style={{ color: "#a9a7a7", fontWeight: 400 }}>
                              (-SAR {parseFloat(itemPromo.discountAmount).toFixed(2)})
                            </span>
                          )}
                          <button
                            onClick={() => onRemovePromotion?.()}
                            title="Remove promotion from all items"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "#b91c1c", fontWeight: 400, fontSize: 14,
                              lineHeight: 1, padding: "0 2px", marginLeft: 2,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* ── Manual Discount sub-row (per item) ── */}
                  {!hasPromo && discount > 0 && item._manualDiscount && (
                    <tr style={{ background: "#fff" }}>
                      <td />
                      <td colSpan={colSpan} style={{ paddingTop: 4, paddingBottom: 6 }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: "#a9a7a7",
                          fontWeight: 600,
                           fontStyle: "italic"
                        }}>
                          <span style={{ fontSize: 13 }}>✂️</span>
                          Manual Discount applied
                          <span style={{ color: "#666", fontWeight: 400 }}>
                            (-SAR {discount.toFixed(2)})
                          </span>
                          <button
                            onClick={() => onRemoveManualDiscount?.(idx)}
                            title="Remove manual discount from this item"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "#b91c1c", fontWeight: 800, fontSize: 14,
                              lineHeight: 1, padding: "0 2px", marginLeft: 2,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable;