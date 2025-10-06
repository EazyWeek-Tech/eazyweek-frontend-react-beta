import React, { useState } from "react";

const selectableItems = ["Select Item A", "Select Item B", "Select Item C", "Select Item D"];

export default function MixMatch() {
  const [enabled, setEnabled] = useState(true);
  const [pairs, setPairs] = useState([{ a:"", b:"", qty:1 }]);

  const addPair = () => setPairs(p => [...p, {a:"", b:"", qty:1}]);

  return (
    <>
      {/* Basic Information */}
      <section className="section">
        <h4>Basic Information</h4>
        <div className="grid-2">
          <div className="field">
            <label>Discount Name *</label>
            <input type="text" placeholder="e.g. Buy Combo A+B" />
          </div>
          <div className="field">
            <label>Application Level</label>
            <select defaultValue="Item Level">
              <option>Item Level</option>
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

      {/* Item Combinations */}
      <section className="section">
        <h4>Item Combinations</h4>
        {pairs.map((p, idx)=>(
          <div key={idx} className="grid-3" style={{marginBottom:10}}>
            <div className="field">
              <label>First Item</label>
              <select defaultValue="">
                <option value="" disabled>Select item A</option>
                {selectableItems.map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Second Item</label>
              <select defaultValue="">
                <option value="" disabled>Select item B</option>
                {selectableItems.map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Min Quantity</label>
              <input type="number" defaultValue={1}/>
            </div>
          </div>
        ))}
        <div className="row-between">
          <div />
          <button className="btn-link" onClick={addPair}>+ Add</button>
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
            <input type="number" defaultValue={0}/>
          </div>
        </div>
        <div className="help" style={{marginTop:12, background:"#ecfbef", borderColor:"#cfe9d5", color:"#1b6a32"}}>
          <strong>Example:</strong> If the combination rule is met, the discount will be applied proportionally across all matched items.
        </div>
      </section>

      <div className="btns">
        <button className="btn btn-secondary">Save as Draft</button>
        <button className="btn btn-primary">Submit & Activate</button>
      </div>
    </>
  );
}
