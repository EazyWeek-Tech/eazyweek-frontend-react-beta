import React from "react";

const FilterBar = ({ onCreateCase, onFilter, employeeList = [] }) => {
  const [filters, setFilters] = React.useState({
    priority: "",
    owner: "",     // ✅ will hold employeeCode
    assignTo: "",  // ✅ will hold employeeCode
    status: "",
  });

  // ---------------------------
  // Autocomplete states (UI text = name)
  // ---------------------------
  const [ownerSearch, setOwnerSearch] = React.useState("");
  const [ownerOpen, setOwnerOpen] = React.useState(false);
  const ownerWrapRef = React.useRef(null);

  const [assignSearch, setAssignSearch] = React.useState("");
  const [assignOpen, setAssignOpen] = React.useState(false);
  const assignWrapRef = React.useRef(null);

  // ---------------------------
  // ✅ IMPORTANT: functional update (no stale state)
  // ---------------------------
  const handleChange = React.useCallback(
    (key, value) => {
      setFilters((prev) => {
        const updated = { ...prev, [key]: value };
        onFilter(updated);
        return updated;
      });
    },
    [onFilter]
  );

  // ---------------------------
  // Build employees list for autocomplete
  // ✅ unique by employeeCode
  // ---------------------------
  const employees = React.useMemo(() => {
    const rows = (employeeList || [])
      .map((e) => ({
        employeeCode: (e?.employeeCode || "").trim(),
        employeeName: (e?.employeeName || "").trim(),
      }))
      .filter((e) => e.employeeCode && e.employeeName);

    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.employeeCode)) map.set(r.employeeCode, r);
    }

    // sort by name
    return Array.from(map.values()).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName)
    );
  }, [employeeList]);

  // Filter matches by name (names only shown)
  const ownerMatches = React.useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.employeeName.toLowerCase().includes(q));
  }, [employees, ownerSearch]);

  const assignMatches = React.useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.employeeName.toLowerCase().includes(q));
  }, [employees, assignSearch]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const onDown = (e) => {
      if (ownerWrapRef.current && !ownerWrapRef.current.contains(e.target)) setOwnerOpen(false);
      if (assignWrapRef.current && !assignWrapRef.current.contains(e.target)) setAssignOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ---------------------------
  // Role based Create Case (kept as your logic)
  // ---------------------------
  const userSession = JSON.parse(sessionStorage.getItem("userSession") || "{}");
  const roleName = userSession?.roleName || "";
  const ALLOWED_CREATE_CASE_ROLES = ["Admin", "Team Member", "System User"];
  const canCreateCase = ALLOWED_CREATE_CASE_ROLES.includes(roleName);

  const priorities = ["", "Normal", "High", "Low"];
  const statuses = ["", "WIP", "Open", "Closed"];

  // Autocomplete menu (shows names only)
  const Menu = ({ open, items, onPick }) => {
    if (!open) return null;
    return (
      <div
        className="autocomplete-menu"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "100%",
          zIndex: 9999,
          background: "#fff",
          border: "1px solid #ddd",
          borderTop: "none",
          maxHeight: 220,
          overflowY: "auto",
        }}
      >
        {items.length === 0 ? (
          <div style={{ padding: "8px 10px" }}>No matches</div>
        ) : (
          items.slice(0, 50).map((emp) => (
            <div
              key={emp.employeeCode}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(emp);
              }}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {emp.employeeName}
            </div>
          ))
        )}
      </div>
    );
  };

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

      {/* Owner (autocomplete UI shows name, filter stores code) */}
      <div className="pridd" ref={ownerWrapRef} style={{ position: "relative" }}>
        <div className="select-dropdown autocomp">
          <input
            type="text"
            placeholder="Owner"
            value={ownerSearch}
            onFocus={() => setOwnerOpen(true)}
            onChange={(e) => {
              const v = e.target.value;
              setOwnerSearch(v);
              setOwnerOpen(true);

              // ✅ if user is typing / clearing, we should not send random code
              // clear owner code until a selection is made
              if (!v.trim()) handleChange("owner", "");
              else handleChange("owner", ""); // keep empty until selected
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOwnerOpen(false);
            }}
            autoComplete="off"
          />
          <Menu
            open={ownerOpen}
            items={ownerMatches}
            onPick={(emp) => {
              setOwnerSearch(emp.employeeName);     // UI
              handleChange("owner", emp.employeeCode); // ✅ API value
              setOwnerOpen(false);
            }}
          />
        </div>
      </div>

      {/* Assigned To (autocomplete UI shows name, filter stores code) */}
      <div className="pridd" ref={assignWrapRef} style={{ position: "relative" }}>
        <div className="select-dropdown autocomp">
          <input
            type="text"
            placeholder="Assigned To"
            value={assignSearch}
            onFocus={() => setAssignOpen(true)}
            onChange={(e) => {
              const v = e.target.value;
              setAssignSearch(v);
              setAssignOpen(true);

              // ✅ clear assignTo code until selection is made
              if (!v.trim()) handleChange("assignTo", "");
              else handleChange("assignTo", "");
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setAssignOpen(false);
            }}
            autoComplete="off"
          />
          <Menu
            open={assignOpen}
            items={assignMatches}
            onPick={(emp) => {
              setAssignSearch(emp.employeeName);        // UI
              handleChange("assignTo", emp.employeeCode); // ✅ API value
              setAssignOpen(false);
            }}
          />
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

      {/* Create Case (kept as per your logic) */}
      {!canCreateCase && (
        <div className="pri-btn-div">
          <button className="pribtn" onClick={onCreateCase}>
            Create Case
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
