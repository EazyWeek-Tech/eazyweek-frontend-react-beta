import './ToggleSwitch.css';

const ToggleSwitch = ({ leftLabel = 'Left', rightLabel = 'Right', value, onChange }) => {
  return (
    <div className="mode-toggle-container">
      <input
        type="radio"
        id={`${leftLabel}-${rightLabel}-left`}
        name={`${leftLabel}-${rightLabel}`}
        value={leftLabel}
        checked={value === leftLabel}
        onChange={() => onChange(leftLabel)}
      />
      <label htmlFor={`${leftLabel}-${rightLabel}-left`} className="mode-button">
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
      <label htmlFor={`${leftLabel}-${rightLabel}-right`} className="mode-button">
        {rightLabel}
      </label>
    </div>
  );
};

export default ToggleSwitch;
