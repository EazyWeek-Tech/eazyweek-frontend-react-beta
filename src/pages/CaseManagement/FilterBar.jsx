import React from "react";

const FilterBar = ({ onCreateCase, onFilter, employeeList = [] }) => {
  const handleChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilter(updated);
  };

  const [filters, setFilters] = React.useState({
    priority: "",
    owner: "",
    assignTo: "",
    status: "",
  });

  const priorities = ["", "Normal", "High", "Low"];
  const statuses = ["", "WIP", "Open", "Closed"];

  return (
    <div className="filteroptions">
      <label>Filter By:</label>

      {/* Priority */}
      <div className="pridd">
        <div className="select-dropdown">
          <select
            value={filters.priority}
            onChange={(e) => handleChange("priority", e.target.value)}
          >
            {priorities.map((val, i) => (
              <option key={i} value={val}>
                {val || "Priority"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Owner */}
      <div className="pridd">
        <div className="select-dropdown">
          <select
            value={filters.owner}
            onChange={(e) => handleChange("owner", e.target.value)}
          >
            <option value="">Owner</option>
            {employeeList.map((emp, index) => (
              <option
                key={`${emp.employeeCode}-${index}`}
                value={emp.employeeName}
              >
                {emp.employeeName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assigned To */}
      <div className="pridd">
        <div className="select-dropdown">
          <select
            value={filters.assignTo}
            onChange={(e) => handleChange("assignTo", e.target.value)}
          >
            <option value="">Assigned To</option>
            {employeeList.map((emp, index) => (
              <option
                key={`${emp.employeeCode}-${index}`}
                value={emp.employeeName}
              >
                {emp.employeeName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status */}
      <div className="pridd">
        <div className="select-dropdown">
          <select
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            {statuses.map((val, i) => (
              <option key={i} value={val}>
                {val || "Status"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pri-btn-div">
        <button className="pribtn" onClick={onCreateCase}>
          Create Case
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
