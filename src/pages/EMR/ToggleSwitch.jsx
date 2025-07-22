import React from 'react';
import './ToggleSwitch.css';

const ToggleSwitch = ({ activeTab, onTabChange }) => {
  return (
    <div className="mode-toggle-container">

      <input
        type="radio"
        id="builderMode"
        name="formMode"
        value="builder"
        checked={activeTab === 'builder'}
        onChange={() => onTabChange('builder')}
      />
      <label htmlFor="builderMode" className="mode-button">
        Builder
      </label>


      <input
        type="radio"
        id="previewMode"
        name="formMode"
        value="preview"
        checked={activeTab === 'preview'}
        onChange={() => onTabChange('preview')}
      />
      <label htmlFor="previewMode" className="mode-button">
        Preview
      </label>
    </div>
  );
};

export default ToggleSwitch;
