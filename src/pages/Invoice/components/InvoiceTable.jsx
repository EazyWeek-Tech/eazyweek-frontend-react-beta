// InvoiceTable.jsx
import React from 'react';

const InvoiceTable = ({
  items,
  onPriceChange,
  onDiscountChange,
  onDiscountPercentChange,
  onRemove,
  onCopy,                   // (idx) => void — duplicates the line into the next row
  showDiscountPercent = false,
  readOnlyInputs = false,
  customer,
  isPriceOverride,
  editableDiscount = false,
  appliedPromotions = [],   // [{ discountId, discountName, applicationLevel, itemCode, discountAmount }]
  onRemovePromotion,        // () => void — removes ALL promotions
  onRemoveManualDiscount,   // (idx) => void — removes manual discount from specific item
  onRemovePackage,          // (idx) => void — removes the applied package from specific item
}) => {
  const isCitizen = customer?.status?.toLowerCase() === 'citizen';

  // Find the single item-level promotion (max 1 per FRD)
  const itemPromo     = appliedPromotions.find(p => p.applicationLevel === "Item Level");
  // All invoice-level promotions
  const invoicePromos = appliedPromotions.filter(p => p.applicationLevel === "Invoice Level");

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
              const itemCode = item.code || item.itemCode || "";
              const hasPromo = itemPromo && (
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
                        className="copybtn"
                        title="Copy line"
                        data-tooltip-pos="left"
                        onClick={() => onCopy?.(idx)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px", marginRight: 4 }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke="#334b71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="11" height="11" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <button
                        className="delbtn"
                        title="Delete"
                        data-tooltip-pos="left"
                        onClick={() => onRemove?.(idx)}
                      >
                        <img src="images/rmove.svg" alt="Delete" />
                      </button>
                    </td>
                  </tr>

                  {/* ── Item-level promo sub-row ── */}
                  {hasPromo && (
                    <tr style={{ background: "#fff" }}>
                      <td />
                      <td colSpan={colSpan} style={{ paddingTop: 4, paddingBottom: 6 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          fontSize: 11, color: "#a9a7a7", fontWeight: 600, fontStyle: "italic"
                        }}>
                          <span style={{ fontSize: 13 }}></span>
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
                          >×</button>
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
                          display: "inline-flex", alignItems: "center", gap: 6,
                          fontSize: 11, color: "#a9a7a7", fontWeight: 600, fontStyle: "italic"
                        }}>
                          <span style={{ fontSize: 13 }}></span>
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
                          >×</button>
                        </span>
                      </td>
                    </tr>
                  )}
                  {/* ── Package Redemption sub-row (per item) ── */}
                  {(item._redeemed || item._packageCode || item._packageName) && (
                    <tr style={{ background: "#fff" }}>
                      <td />
                      <td colSpan={colSpan} style={{ paddingTop: 4, paddingBottom: 6 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          fontSize: 11, color: "#2e7d5e", fontWeight: 600, fontStyle: "italic"
                        }}>
                          
                          Package applied
                          {(item._packageName || item._packageCode) && (
                            <span style={{ color: "#666", fontWeight: 400 }}>
                              ({item._packageName || item._packageCode})
                            </span>
                          )}
                          <button
                            onClick={() => onRemovePackage?.(idx)}
                            title="Remove applied package from this item"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "#b91c1c", fontWeight: 800, fontSize: 14,
                              lineHeight: 1, padding: "0 2px", marginLeft: 2,
                            }}
                          >×</button>
                        </span>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>

        {/* ── Invoice-level promotion summary rows ── */}
        {invoicePromos.length > 0 && (
          <tfoot>
            {invoicePromos.map((promo, i) => (
              <tr key={i} style={{ background: "#f0fdf4", borderTop: "1.5px solid #bbf7d0" }}>
                <td />
                <td colSpan={isPriceOverride ? 6 : showDiscountPercent ? 7 : 6}
                    style={{ padding: "7px 10px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 12, color: "#166534", fontWeight: 600, fontStyle: "italic"
                  }}>
                    <span style={{ fontSize: 14 }}></span>
                    Invoice Promotion: {promo.discountName}
                    {promo.thresholdType && (
                      <span style={{ fontSize: 11, fontWeight: 400, color: "#4a7c5f" }}>
                        ({promo.thresholdType})
                      </span>
                    )}
                  </span>
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {promo.discountAmount > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>
                      -SAR {parseFloat(promo.discountAmount).toFixed(2)}
                    </span>
                  )}
                </td>
                <td colSpan={2} style={{ padding: "7px 6px", textAlign: "center" }}>
                  {onRemovePromotion && (
                    <button
                      onClick={() => onRemovePromotion?.()}
                      title="Remove invoice promotion"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#b91c1c", fontSize: 16, lineHeight: 1, padding: "0 4px",
                      }}
                    >×</button>
                  )}
                </td>
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default InvoiceTable;