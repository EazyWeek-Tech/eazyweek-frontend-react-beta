import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";

const ExpenseTab = forwardRef((props, ref) => {
  const [materialCost, setMaterialCost] = useState("0.00");
  const [labourCost, setLabourCost] = useState("0.00");
  const [otherCharges, setOtherCharges] = useState("0.00");
  const [total, setTotal] = useState("0.00");

  useImperativeHandle(ref, () => ({
    getExpenseData: () => ({
      materialCost: materialCost || "0.00",
      labourCost: labourCost || "0.00",
      otherCharges: otherCharges || "0.00",
      total: total || "0.00",
    }),
  }));

  useEffect(() => {
    const totalValue =
      parseFloat(materialCost || "0") +
      parseFloat(labourCost || "0") +
      parseFloat(otherCharges || "0");
    setTotal(isNaN(totalValue) ? "0.00" : totalValue.toFixed(2));
  }, [materialCost, labourCost, otherCharges]);

  const rows = [
    { id: "materialCost", key: "A", label: "Material cost", value: materialCost, set: setMaterialCost },
    { id: "labourCost", key: "B", label: "Labour cost", value: labourCost, set: setLabourCost },
    { id: "otherCharges", key: "C", label: "Other charges", value: otherCharges, set: setOtherCharges },
  ];

  return (
    <div className="cd-tab expform">
      <section className="cd-section">
        <h3 className="cd-eyebrow">Cost of resolution</h3>

        <div className="cd-ledger">
          {rows.map((row) => (
            <div className="cd-ledger-row" key={row.id}>
              <label htmlFor={row.id}>
                <span className="cd-ledger-key">{row.key}</span>
                {row.label}
              </label>
              <div className="cd-amount">
                <span className="cd-cur">SAR</span>
                <input
                  type="number"
                  id={row.id}
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={row.value}
                  onChange={(e) => row.set(e.target.value)}
                />
              </div>
            </div>
          ))}

          <div className="cd-ledger-row cd-ledger-row--total">
            <label htmlFor="totalCost">
              <span className="cd-ledger-key">A+B+C</span>
              Total
            </label>
            <div className="cd-amount">
              <span className="cd-cur">SAR</span>
              <input type="text" id="totalCost" value={total} readOnly tabIndex={-1} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
});

export default ExpenseTab;