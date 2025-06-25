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
      total: total || "0.00"
    }),
  }));

  useEffect(() => {
    const totalValue =
      parseFloat(materialCost || "0") +
      parseFloat(labourCost || "0") +
      parseFloat(otherCharges || "0");
    setTotal(isNaN(totalValue) ? "0.00" : totalValue.toFixed(2));
  }, [materialCost, labourCost, otherCharges]);

  return (
    <form className="expform tabform">
      <div className="form-group">
        <label htmlFor="materialCost">Material Cost (A)</label>
        <input
          type="number"
          id="materialCost"
          placeholder="Enter Material Cost"
          value={materialCost}
          onChange={(e) => setMaterialCost(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="labourCost">Labour Cost (B)</label>
        <input
          type="number"
          id="labourCost"
          placeholder="Enter Labour Cost"
          value={labourCost}
          onChange={(e) => setLabourCost(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="otherCharges">Other Charges (C)</label>
        <input
          type="number"
          id="otherCharges"
          placeholder="Enter Other Charges"
          value={otherCharges}
          onChange={(e) => setOtherCharges(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="totalCost">Total (A + B + C)</label>
        <input
          type="text"
          id="totalCost"
          placeholder="Total Cost"
          value={total}
          readOnly
        />
      </div>
    </form>
  );
});

export default ExpenseTab;
