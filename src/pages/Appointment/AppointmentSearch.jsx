import React, { useState, useEffect, useMemo, useRef } from "react";
import { API_BASE_URL } from "../../config";

/* ─────────────────────────────────────────────────────────────────────────────
   AppointmentSearch — the scheduler board's search box.

   The board only ever holds ONE day, so before this there was no way to find a
   booking from an appointment id or an invoice number. This box searches
   appointments across ALL dates (POST /api/Appointment/SearchAppointments) and
   keeps the existing customer lookup that lets reception book a walk-in
   straight from the header.

   Results come back in two groups:
     Appointments — matched on Appt ID, customer name/id/mobile, invoice no.
                    Picking one jumps the board to that date and opens the
                    details sidebar.
     Customers    — matched on name/mobile. Picking one fills the box; the
                    book button opens the drawer (unchanged behaviour).

   Notes carried over from earlier fixes elsewhere in the app:
     • 300ms debounce + request-sequence guard, so a slow earlier response can
       never overwrite a newer one (the old header search fired one request per
       keystroke with no ordering guarantee).
     • Outside-click (mousedown) and Escape close the panel — it previously only
       closed on select.
     • normalizeSearch() strips NBSP/zero-width and collapses whitespace runs so
       a value pasted from Word/Excel or copied off the rendered screen still
       matches (HTML collapses double spaces; the columns do not).
   ────────────────────────────────────────────────────────────────────────── */

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const authPost = async (url, payload) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json && json.message) || `POST ${url} failed`);
  return json.data ?? json;
};

const authGet = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json && json.message) || `GET ${url} failed`);
  return json.data ?? json;
};

export const normalizeSearch = (v) =>
  String(v || "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const STATUS_TINT = {
  booked:       { bg: "#EEF3FF", fg: "#2F5AA8" },
  confirmed:    { bg: "#E9F7EF", fg: "#1E7A45" },
  "checked in": { bg: "#FFF4E5", fg: "#A55B00" },
  active:       { bg: "#E6F6F4", fg: "#0E7C6B" },
  completed:    { bg: "#E8EDF7", fg: "#334B71" },
  cancelled:    { bg: "#FDECEC", fg: "#B02A2A" },
  "no show":    { bg: "#F3F0F7", fg: "#6B4E8C" },
};

const StatusChip = ({ status }) => {
  const t = STATUS_TINT[(status || "").toLowerCase()] || { bg: "#EEF1F6", fg: "#5A6B85" };
  return (
    <span style={{
      background: t.bg, color: t.fg, fontSize: 10, fontWeight: 700,
      padding: "2px 7px", borderRadius: 10, whiteSpace: "nowrap",
      fontFamily: "Lato,sans-serif", lineHeight: 1.5,
    }}>
      {status || "Booked"}
    </span>
  );
};

const prettyDate = (ymd) => {
  if (!ymd) return "";
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d.getTime())) return String(ymd);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const GroupLabel = ({ children, count }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    width: "100%", boxSizing: "border-box",
    padding: "7px 10px 5px", fontSize: 10, fontWeight: 800, letterSpacing: ".06em",
    textTransform: "uppercase", color: "#8494AC", background: "#F7F9FC",
    borderBottom: "1px solid #EDF1F7", fontFamily: "Lato,sans-serif",
    position: "sticky", top: 0, zIndex: 2,
  }}>
    <span style={{ marginRight: 8 }}>{children}</span>
    {typeof count === "number" && <span style={{ color: "#A9B5C7" }}>{count}</span>}
  </div>
);

const AppointmentSearch = ({
  centerCode = "",
  onOpenAppointment,          // (hit) => void — jump the board + open sidebar
  onBookCustomer,             // (customer) => void — open the booking drawer
  canBook = true,             // hide the book button for practitioner logins
  placeholder = "Search Appt ID, customer or invoice no…",
  limit = 25,
  width = 240,                // narrow this on iPad if .actbtnsdiv gets cramped
}) => {
  const [term,        setTerm]        = useState("");
  const [appts,       setAppts]       = useState([]);
  const [customers,   setCustomers]   = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);

  const wrapRef = useRef(null);
  const seqRef  = useRef(0);      // request-sequence guard
  const timerRef = useRef(null);  // debounce handle

  /* Close on outside click / Escape. Scoped to the wrapper so clicking a result
     still registers as a select rather than an outside click. */
  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const runSearch = (raw) => {
    const q = normalizeSearch(raw);
    if (q.length < 2) {
      setAppts([]); setCustomers([]); setSearched(false); setLoading(false);
      return;
    }
    const seq = ++seqRef.current;
    setLoading(true);

    const apptReq = authPost(`${API_BASE_URL}/api/Appointment/SearchAppointments`, {
      searchText: q, centerCode, limit,
    }).then(d => (Array.isArray(d) ? d : [])).catch(() => []);

    const custReq = authGet(
      `${API_BASE_URL}/api/Master/GetCustomerBySearchKey/${encodeURIComponent(q)}/${centerCode}`
    ).then(d => (Array.isArray(d) ? d : [])).catch(() => []);

    Promise.all([apptReq, custReq]).then(([a, c]) => {
      if (seq !== seqRef.current) return;   // a newer keystroke already won
      const ql = q.toLowerCase();
      setAppts(a);
      setCustomers(
        c.filter(i =>
          `${i.firstName || ""} ${i.lastName || ""}`.toLowerCase().includes(ql) ||
          String(i.mobile || "").includes(q)
        ).slice(0, 8)
      );
      setSearched(true);
      setLoading(false);
      setOpen(true);
    });
  };

  const handleChange = (v) => {
    setTerm(v);
    setOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(v), 300);
  };

  const clearAll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    seqRef.current++;
    setTerm(""); setAppts([]); setCustomers([]); setSearched(false); setOpen(false);
  };

  const pickAppointment = (hit) => {
    setOpen(false);
    setTerm(hit.appointmentId || "");
    if (typeof onOpenAppointment === "function") onOpenAppointment(hit);
  };

  const pickCustomer = (item) => {
    setTerm(`${item.firstName || ""} - ${item.mobile || ""}`);
    setOpen(false);
  };

  const bookCustomer = (e, item) => {
    e.stopPropagation();
    clearAll();
    if (typeof onBookCustomer === "function") onBookCustomer(item);
  };

  const hasResults = appts.length > 0 || customers.length > 0;
  const showPanel  = open && normalizeSearch(term).length >= 2;

  /* Every row pins display/width/float itself. The panel used to borrow
     .suggestionssrc from index.css, whose flex rules turned each group into a
     side-by-side column and wrapped the rows into unreadable strips. */
  const rowBase = {
    cursor: "pointer", padding: "8px 10px", borderBottom: "1px solid #F2F5FA",
    fontFamily: "Lato,sans-serif",
    display: "block", width: "100%", boxSizing: "border-box",
    float: "none", whiteSpace: "normal", margin: 0, listStyle: "none",
  };

  return (
    /* Styling is inline on purpose. The box this replaces was a bare <input>
       relying entirely on .search-container from index.css, and on the navy
       header that made it invisible — an unstyled input with a transparent
       background and no border renders as nothing at all. Inline styles beat
       any stylesheet rule short of !important, so the control always shows.
       The class name is kept only so existing selectors still find it. */
    <div
      className="search-container"
      ref={wrapRef}
      style={{
        position: "relative", display: "block", flexShrink: 0,
        width: width, minWidth: 150, marginLeft: 8,
      }}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={term}
        onFocus={() => { if (normalizeSearch(term).length >= 2) setOpen(true); }}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { if (timerRef.current) clearTimeout(timerRef.current); runSearch(term); }
        }}
        style={{
          width: "100%", height: 34, boxSizing: "border-box",
          padding: term ? "6px 26px 6px 10px" : "6px 10px", color: "#25344B",
          border: "1px solid #C8D5E8", borderRadius: 6,
          fontSize: 12, fontFamily: "Lato,sans-serif", outline: "none",
          display: "block", opacity: 1, visibility: "visible",
        }}
      />
      {term && (
        <span
          onClick={clearAll}
          title="Clear"
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            cursor: "pointer", fontSize: 15, lineHeight: 1, color: "#8494AC",
            padding: "2px 4px",
          }}
        >
          ×
        </span>
      )}

      {showPanel && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0, left: "auto",
            display: "block", flexDirection: "column",
            width: 340, maxWidth: "90vw", maxHeight: 380,
            overflowY: "auto", overflowX: "hidden", boxSizing: "border-box",
            background: "#fff", border: "1px solid #E3E9F2", borderRadius: 8,
            boxShadow: "0 6px 20px rgba(16,32,60,.16)", zIndex: 1200,
            textAlign: "left", whiteSpace: "normal", padding: 0, margin: 0,
          }}
        >
          {loading && !hasResults && (
            <div style={{ padding: "12px 10px", fontSize: 12, color: "#8494AC", fontFamily: "Lato,sans-serif" }}>
              Searching…
            </div>
          )}

          {appts.length > 0 && (
            <>
              <GroupLabel count={appts.length}>Appointments</GroupLabel>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "block", width: "100%" }}>
                {appts.map((a, i) => (
                  <li
                    key={`${a.appointmentId}-${a.lineNo}-${i}`}
                    style={rowBase}
                    onClick={() => pickAppointment(a)}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F5F8FD")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }}>
                      <span style={{
                        fontWeight: 700, fontSize: 13, color: "#25344B",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {a.fullName || a.custId || "—"}
                      </span>
                      <StatusChip status={a.status} />
                    </div>
                    <div style={{
                      fontSize: 11, color: "#5A6B85", marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {a.serviceName || "—"}
                      {a.doctorName ? ` · ${a.doctorName}` : ""}
                    </div>
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4,
                      fontSize: 10.5, color: "#8494AC",
                    }}>
                      <span style={{ fontWeight: 700, color: "#334B71" }}>{a.appointmentId}</span>
                      <span>{prettyDate(a.appointmentDate)}{a.startTime ? ` · ${a.startTime}` : ""}</span>
                      {a.invoiceNo && (
                        <span style={{
                          background: "#EAF3EC", color: "#1E7A45", padding: "1px 6px",
                          borderRadius: 8, fontWeight: 700,
                        }}>
                          {a.invoiceNo}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {customers.length > 0 && (
            <>
              <GroupLabel count={customers.length}>Customers</GroupLabel>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "block", width: "100%" }}>
                {customers.map((item, idx) => (
                  <li
                    key={`c-${idx}`}
                    style={{ ...rowBase, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
                    onClick={() => pickCustomer(item)}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F5F8FD")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{
                      fontSize: 12.5, color: "#25344B", minWidth: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.firstName} {item.lastName || ""} – {item.mobile}
                    </span>
                    {canBook && (
                      <span
                        onClick={e => bookCustomer(e, item)}
                        title="Book an appointment"
                        style={{
                          cursor: "pointer", flexShrink: 0, display: "inline-flex",
                          alignItems: "center", padding: 4, borderRadius: 4,
                        }}
                      >
                        <img
                          src={`${import.meta.env.BASE_URL}images/addapptblk.svg`}
                          alt="Book"
                          style={{ width: 16, height: 16, display: "block" }}
                        />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {!loading && searched && !hasResults && (
            <div style={{ padding: "12px 10px", fontSize: 12, color: "#8494AC", fontFamily: "Lato,sans-serif" }}>
              No appointment or customer matches “{normalizeSearch(term)}”.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AppointmentSearch;