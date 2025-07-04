import React from "react";

const GeneralTab = () => {
  return (
    <form>
      {/* Personal Info */}
      <div className="section">
        <h3 className="sectttl">Personal Info</h3>
        <div className="form-grid">
          <label>Customer ID <input type="text" defaultValue="BRI-0092" /></label>
          <label>First Name* <input type="text" defaultValue="Oxy" /></label>
          <label>Middle Name <input type="text" /></label>
          <label>Last Name* <input type="text" defaultValue="Abdullah" /></label>
          <label>Preferred Name <input type="text" /></label>
          <label>Email <input type="email" /></label>
          <label>Mobile Phone* <input type="text" defaultValue="+966 876543211" /></label>
          <label>Home Phone <input type="text" defaultValue="+966" /></label>
          <label>Work Phone <input type="text" defaultValue="+966" /></label>
          <label>Gender*
            <select defaultValue="Female">
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </label>
          <label>Birthday <input type="date" /></label>
          <label>Anniversary <input type="date" /></label>
          <label>Referral
            <select>
              <option>Select Source</option>
            </select>
          </label>
          <label>Ref By <input type="text" /></label>
          <label>Primary Employee <input type="text" /></label>
          <div className="checkbox-group">
            <label className="">
            <input type="checkbox" /> Block guest from editing custom data
          </label>
          </div>
          
        </div>
      </div>

      {/* Address */}
      <div className="section">
        <h3 className="sectttl">Address</h3>
        <div className="form-grid">
          <label>Address 1 <input type="text" /></label>
          <label>Address 2 <input type="text" /></label>
          <label>City <input type="text" /></label>
          <label>Nationality*
            <select defaultValue="Saudi Arabian">
              <option>Saudi Arabian</option>
              <option>Indian</option>
              <option>Other</option>
            </select>
          </label>
          <label>Country
            <select defaultValue="Saudi Arabia">
              <option>Saudi Arabia</option>
              <option>India</option>
              <option>Other</option>
            </select>
          </label>
          <label>State
            <select defaultValue="Ar Riyad">
              <option>Ar Riyad</option>
              <option>Other</option>
            </select>
          </label>
          <label>State (Other) <input type="text" /></label>
          <label>Nationality ID <input type="text" defaultValue="111114567" /></label>
        </div>
      </div>

      {/* Preferences */}
      <div className="section">
        <h3 className="sectttl">Preferences</h3>
        <div className="form-grid">
          <label>Center
            <select defaultValue="Bright Clinics">
              <option>Bright Clinics</option>
            </select>
          </label>
          <label>Language
            <select defaultValue="English - United States">
              <option>English - United States</option>
            </select>
          </label>

          <div className="checkbox-group">
            <strong>Transactional Messages:</strong>
            <label><input type="checkbox" /> Email</label>
            <label><input type="checkbox" defaultChecked /> SMS</label>
          </div>

          <div className="checkbox-group">
            <strong>Marketing Messages:</strong>
            <label><input type="checkbox" /> Email</label>
            <label><input type="checkbox" defaultChecked /> SMS</label>
            <label>
              <input type="checkbox" defaultChecked /> Receive loyalty point statement as a text message (SMS) and an email
            </label>
          </div>
        </div>
      </div>

      {/* Login Info */}
      <div className="section">
        <h3 className="sectttl">Login Info</h3>
        <div className="form-grid">
          <label>Username <input type="text" /></label>
          <label>Tags <input type="text" /></label>
          <div className="checkbox-group">
          <label>
            <input type="checkbox" /> Block guest from online appointment booking
          </label>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button type="button">Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  );
};

export default GeneralTab;
