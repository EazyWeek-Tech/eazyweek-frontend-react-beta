import React, { useState } from "react";

const centers = ["All Centers", "Riyadh - Center A", "Jeddah - Center B", "Dammam - Center C"];
const items = ["Service A", "Product B", "Package C", "Service D"];

export default function SimpleDiscount() {
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
            <select defaultValue="Item Level">
              <option>Item Level</option>
              <option>Category Level</option>
              <option>Invoice Level</option>
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
          <strong>Important:</strong> Discounts will only become active once the start date is reached, regardless of the “Enable Discount” setting. Use the toggle to temporarily disable active discounts.
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
              {centers.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn-link">Select All</button>
        </div>
        <div className="warn" style={{marginTop:12}}>
          <strong>Required:</strong> Please select at least one center where this discount will apply, or use “Select All” to apply to all centers.
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
            <label>Discount Value (%)</label>
            <input type="number" defaultValue={0} />
          </div>
        </div>
      </section>

      {/* Applicable Items */}
      <section className="section">
        <h4>Applicable Items</h4>
        <div className="row-between">
          <div className="field" style={{flex:1}}>
            <label>Select an item</label>
            <select defaultValue="">
              <option value="" disabled>Select an item</option>
              {items.map(i=><option key={i}>{i}</option>)}
            </select>
          </div>
          <button className="btn-link">Add Item</button>
        </div>
        <div style={{marginTop:8}}>
          {/* tags preview */}
          <span className="tag">Service A</span>
          <span className="tag">Product B</span>
        </div>
      </section>

      <div className="btns">
        <button className="btn btn-secondary">Save as Draft</button>
        <button className="btn btn-primary">Submit & Activate</button>
      </div>
    </>
  );
}
