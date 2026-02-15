import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../config";

const createDataHandler = async (url, payload = null) => {
  const options = payload
    ? {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    : {};
  const response = await fetch(url, options);
  if (!response.ok) throw new Error("Fetch error");
  return await response.json();
};

const FilterHeader = ({ countsOverride }) => {
  const [counts, setCounts] = useState({});
  const [selectedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const stored =localStorage.getItem("user") || sessionStorage.getItem("user");
    const centerCode = stored ? JSON.parse(stored).centerCode : "";

    const payload = {
      appointmentDate: selectedDate,
      searchText: "",
      centerCode: centerCode,
    };

    createDataHandler(`${API_BASE_URL}/api/Appointment/AppDashBoardCount`, payload)
      .then((res) => {
        if (res?.success) {
          setCounts({
            Completed: res.completed || 0,
            PaymentPending: res.paymentPending || 0,
            Active: res.active || 0,
            CheckedIn: res.checkedIn || 0,
            Confirmed: res.confirm || 0,
            Booked: res.booked || 0,
            Cancelled: res.cancelled || 0,
            NoShow: res.noShow || 0,
          });
        }
      })
      .catch(console.error);
  }, [selectedDate]);

  // Prefer live overrides from the grid when provided
  const val = (key, fallback) =>
    typeof countsOverride?.[key] === 'number' ? countsOverride[key] : (counts[key] || fallback || 0);

  const Completed   = val('Completed', 0);
  const PaymentPend = val('PaymentPending', 0);
  const Active      = val('Active', 0);
  const CheckedIn   = val('CheckedIn', 0);
  const Confirmed   = val('Confirmed', 0);
  const Booked      = val('Booked', 0);

  return (
    <header className="fltrhdr">
      <div className="fltroptflx">
        <div className="viewfilter">
          <span className="viewrm viewtb">Rooms</span>
          <span className="viewdoc viewtb active">Practitioners</span>
        </div>

        <div className="vwextrabtns">
          <div className="apptstatus">
            <div className="completed statcell">
              <div className="stimg">
                <img
                  src={`${import.meta.env.BASE_URL}images/completed.svg`}
                  alt="Completed"
                />
                Completed
              </div>
              <div className="statno">{Completed}</div>
            </div>

            <div className="pndpay statcell">
              <div className="stimg">
                <img
                  src={`${import.meta.env.BASE_URL}images/paymentpend.svg`}
                  alt="Payment Pending"
                />
                Payment Pending
              </div>
              <div className="statno">{PaymentPend}</div>
            </div>

            <div className="ongngappt statcell">
              <div className="stimg">
                <img
                  src={`${import.meta.env.BASE_URL}images/ongoing.png`}
                  alt="Active/Ongoing"
                />
                Active/Ongoing
              </div>
              <div className="statno">{Active}</div>
            </div>

            <div className="checkin statcell">
              <div className="stimg">
                <img
                  src={`${import.meta.env.BASE_URL}images/checkin.svg`}
                  alt="Checked In"
                />
                Checked In
              </div>
              <div className="statno">{CheckedIn}</div>
            </div>

            <div className="confirmed statcell">
              <div className="stimg">
                <img
                  src={`${import.meta.env.BASE_URL}images/confirmed.png`}
                  alt="Confirmed"
                />
                Confirmed
              </div>
              <div className="statno">{Confirmed}</div>
            </div>

            <div className="booked statcell">
              <div className="stimg">
                <img
                  src={`${import.meta.env.BASE_URL}images/booked.svg`}
                  alt="Booked"
                />
                Booked
              </div>
              <div className="statno">{Booked}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default FilterHeader;
