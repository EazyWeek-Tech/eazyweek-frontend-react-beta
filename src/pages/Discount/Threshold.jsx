import React, { useState } from "react";

export default function Threshold() {
  const [enabled, setEnabled] = useState(true);

  return (
    <>
      {/* Basic Information */}
      <section className="section">
        <h4>Basic Information</h4>
        <div className="grid-2">
          <div className="field">
            <label>Discount Name *</label>
            <input type="text" placeholder="e.g. Bulk Purchase Discount" />
          </div>
          <div className="field">
            <label>Application Level</label>
            <select defaultValue="Invoice Level">
              <option>Invoice Level</option>
              <option>Item Level</option>
              <option>Category Level</option>
            </select>
          </div>
          <div className="field">
            <label>Start Date *</label>
            <input type="date" />
          </div>
          <div className="field">
            <label>End Date *</label>
            <input type="date" />
          </div>
        </div>
        <div className="inline" style={{marginTop:10}}>
          <div className={`switch ${enabled ? "on":""}`} onClick={()=>setEnabled(v=>!v)}>
            <div className="knob" />
          </div>
          <div className="muted">Enable Discount</div>
        </div>
        <div className="help" style={{marginTop:12}}>
          <strong>Important:</strong> Discounts will only become active once the start date is reached, regardless of the “Enable Discount” toggle.
        </div>
      </section>

      {/* Center Selection */}
      <section className="section">
        <h4>Center Selection <span style={{color:"#cc5454"}}>*</span></h4>
        <div className="row-between">
          <div className="field" style={{flex:1}}>
            <label>Applicable Centers</label>
            <select defaultValue="">
              <option value="" disabled>Select centers where discount applies</option>
              <option>All Centers</option>
              <option>Riyadh - Center A</option>
              <option>Jeddah - Center B</option>
              <option>Dammam - Center C</option>
            </select>
          </div>
          <button className="btn-link">Select All</button>
        </div>
        <div className="warn" style={{marginTop:12}}>
          <strong>Required:</strong> Please select at least one center where this discount will apply, or use “Select All” to apply to all centers.
        </div>
      </section>

      {/* Threshold Configuration */}
      <section className="section">
        <h4>Threshold Configuration</h4>
        <div className="grid-2">
          <div className="field">
            <label>Threshold Type</label>
            <select defaultValue="Minimum Value ($)">
              <option>Minimum Value ($)</option>
              <option>Minimum Quantity</option>
            </select>
          </div>
          <div className="field">
            <label>Threshold Value *</label>
            <input type="number" defaultValue={0} />
          </div>
        </div>

        <div style={{marginTop:10}}>
          <label style={{fontWeight:800, fontSize:12}}>Threshold Applies To</label>
          <div className="inline" style={{marginTop:8}}>
            <label className="inline"><input type="radio" name="thApply" defaultChecked />&nbsp;All Items (Products, Services, Packages)</label>
          </div>
          <div className="inline" style={{marginTop:6}}>
            <label className="inline"><input type="radio" name="thApply" />&nbsp;Specific Categories, Item Types or Items</label>
          </div>
        </div>

        <div className="help" style={{marginTop:12}}>
          <strong>How it works:</strong> When customers spend $X or more (or meet any quantity), the discount will be applied proportionally to all qualifying items in their cart.
        </div>
      </section>

      {/* Discount Configuration */}
      <section className="section">
        <h4>Discount Configuration</h4>
        <div className="grid-2">
          <div className="field">
            <label>Discount Type</label>
            <select defaultValue="Percentage (%)">
              <option>Percentage (%)</option>
              <option>Fixed Amount</option>
            </select>
          </div>
          <div className="field">
            <label>Discount Value (%) *</label>
            <input type="number" defaultValue={0} />
          </div>
        </div>
        <div className="help" style={{marginTop:12, background:"#ecfbef", borderColor:"#cfe9d5", color:"#1b6a32"}}>
          <strong>Example:</strong> If threshold is met, customers will receive 0% off applied proportionally across all items that contributed to meeting the threshold.
        </div>
      </section>

      <div className="btns">
        <button className="btn btn-secondary">Save as Draft</button>
        <button className="btn btn-primary">Submit & Activate</button>
      </div>
    </>
  );
}
