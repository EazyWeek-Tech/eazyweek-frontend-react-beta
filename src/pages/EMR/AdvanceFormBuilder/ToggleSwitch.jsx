import './ToggleSwitch.css';

const ToggleSwitch = ({ leftLabel = 'Left', rightLabel = 'Right', value, onChange }) => {
  return (
    <div className="AdvFormBuilder-mode-toggle-container">
      <input
        type="radio"
        id={`${leftLabel}-${rightLabel}-left`}
        name={`${leftLabel}-${rightLabel}`}
        value={leftLabel}
        checked={value === leftLabel}
        onChange={() => onChange(leftLabel)}
      />
      <label htmlFor={`${leftLabel}-${rightLabel}-left`} className="AdvFormBuilder-mode-button">
        {leftLabel}
      </label>

      <input
        type="radio"
        id={`${leftLabel}-${rightLabel}-right`}
        name={`${leftLabel}-${rightLabel}`}
        value={rightLabel}
        checked={value === rightLabel}
        onChange={() => onChange(rightLabel)}
      />
      <label htmlFor={`${leftLabel}-${rightLabel}-right`} className="AdvFormBuilder-mode-button">
        {rightLabel}
      </label>
    </div>
  );
};

export default ToggleSwitch;
