import React, { useState, useEffect, useRef } from "react"; // <-- Import useRef here
import { Link } from 'react-router-dom';
import { API_BASE_URL } from "../../../config";
import '../index.css';

const AppointmentHeader = ({ onAddAppointment, onAddCustomer, onDateChange }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestionsRef = useRef(null);  // <-- useRef for managing suggestions list
  const [todayDate, setTodayDate] = useState("");
  const [noResults, setNoResults] = useState(false);

  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    setTodayDate(formattedDate);
    onDateChange(formattedDate);  // Pass selected date to parent component
  }, []);

  const fetchSuggestions = async (query) => {
    const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
    const centerCode = stored ? JSON.parse(stored).centerCode : "";
    if (!query || query.length < 2) {
      setSuggestions([]);
      setActiveIndex(-1);
      setNoResults(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(query)}/${centerCode}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.json();

      const filtered = data.filter((item) => {
        const firstName = item.firstName?.toLowerCase() || "";
        const lastName = item.lastName?.toLowerCase() || "";
        const fullName = `${firstName} ${lastName}`;
        return (
          firstName.includes(query.toLowerCase()) ||
          (item.mobile || "").includes(query) ||
          fullName.includes(query.toLowerCase())
        );
      });

      setSuggestions(filtered);
      setActiveIndex(0);
      setNoResults(filtered.length === 0);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setSuggestions([]);
      setActiveIndex(-1);
      setNoResults(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchSuggestions(value);
  };

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleBookAppointment(suggestions[activeIndex]);
      } else {
        console.log("Search triggered for:", searchTerm);
      }
    }
  };

  const handleSuggestionClick = (item) => {
    const fullText = `${item.firstName} - ${item.mobile}`;
    setSearchTerm(fullText);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const handleBookAppointment = (item) => {
    setSuggestions([]);
    setActiveIndex(-1);
    setSearchTerm("");
    onAddAppointment?.(item);
  };

  const handleDateChange = (e) => {
    const selected = e.target.value;
    setTodayDate(selected);
    onDateChange(selected);  // Pass the selected date back to the parent
    console.log(selected)
  };

  return (
    <header className="appthdr">
      <div className="flx-spcbt">
        <div>
          <Link to="/dashboard" title="Dashboard" className="tooltip" data-tooltip="Dashboard" data-tooltip-pos="right">
            <img src={`${import.meta.env.BASE_URL}images/homeicon.svg`} width="18" height="18" alt="Home" />
          </Link>
        </div>

        <div className="datepkrdiv">
          <input
            type="date"
            id="date"
            value={todayDate}
            onChange={handleDateChange}
          />
        </div>

        <div className="actbtnsdiv">
          <div
            className="apptimg tooltip"
            data-tooltip="Add Appointment"
            data-tooltip-pos="down"
            onClick={() => onAddAppointment(null)}
          >
            <img
              src={`${import.meta.env.BASE_URL}images/addappt.svg`}
              alt="Add Appointment"
            />
          </div>

          <div
            className="apptstgs tooltip"
            data-tooltip="Settings"
            data-tooltip-pos="down"
          >
            <img
              src={`${import.meta.env.BASE_URL}images/settings.svg`}
              alt="Settings"
            />
          </div>

          <span
            className="apptstgs tooltip"
            data-tooltip="Add Customer"
            data-tooltip-pos="down"
            onClick={onAddCustomer}
          >
            <img
              src={`${import.meta.env.BASE_URL}images/addcustwhite.svg`}
              alt="Add Customer"
            />
          </span>

          <img
            src={`${import.meta.env.BASE_URL}images/reports.svg`}
            alt="View Reports"
          />

          <div className="search-container" style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="text"
                id="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {(suggestions.length > 0 || noResults) && (
              <div className="suggestionssrc" ref={suggestionsRef}>
                <ul>
                  {suggestions.map((item, index) => (
                    <li
                      key={index}
                      onClick={() => handleSuggestionClick(item)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: index === activeIndex ? "#eef" : "transparent",
                        padding: "4px 8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{item.firstName} – {item.mobile}</span>

                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookAppointment(item);
                        }}
                        className="bookappt"
                      >
                        <img
                          src={`${import.meta.env.BASE_URL}images/addapptblk.svg`}
                          alt="Book"
                        />
                      </span>
                    </li>
                  ))}
                  {noResults && (
                    <li style={{ padding: "4px 8px", color: "#888" }}>No matches found</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppointmentHeader;
