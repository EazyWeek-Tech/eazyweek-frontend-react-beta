import React, { useEffect, useState } from "react";

const createDataHandler = async (url, payload = null) => {
  const options = payload
    ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    : {};
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('Fetch error');
  return await response.json();
};

const FilterHeader = () => {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    createDataHandler("/AppointmentCountHandler.ashx")
  // createDataHandler("https://mocki.io/v1/794ebde2-d262-4e15-8feb-e7b75862fbb8")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          const raw = res[0];
          setCounts({
            Completed: raw.Completed,
            PaymentPending: raw.PaymentPending || 0,
            Active: raw.Active,
            CheckedIn: raw.CheckedIn,
            Confirmed: raw.Confirm,
            Booked: raw.Booked
          });
        }
      })
      .catch(console.error);
  }, []);

  const {
    Completed = 0,
    PaymentPending = 0,
    Active = 0,
    CheckedIn = 0,
    Confirmed = 0,
    Booked = 0,
  } = counts;

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
                <img src={`${import.meta.env.BASE_URL}images/completed.svg`} alt="Completed" />
                Completed
              </div>
              <div className="statno">{Completed}</div>
            </div>

            <div className="pndpay statcell">
              <div className="stimg">
                <img src={`${import.meta.env.BASE_URL}images/paymentpend.svg`} alt="Payment Pending" />
                Payment Pending
              </div>
              <div className="statno">{PaymentPending}</div>
            </div>

            <div className="ongngappt statcell">
              <div className="stimg">
                <img src={`${import.meta.env.BASE_URL}images/ongoing.png`} alt="Active/Ongoing" />
                Active/Ongoing
              </div>
              <div className="statno">{Active}</div>
            </div>

            <div className="checkin statcell">
              <div className="stimg">
                <img src={`${import.meta.env.BASE_URL}images/checkin.svg`} alt="Checked In" />
                Checked In
              </div>
              <div className="statno">{CheckedIn}</div>
            </div>

            <div className="confirmed statcell">
              <div className="stimg">
                <img src={`${import.meta.env.BASE_URL}images/confirmed.png`} alt="Confirmed" />
                Confirmed
              </div>
              <div className="statno">{Confirmed}</div>
            </div>

            <div className="booked statcell">
              <div className="stimg">
                <img src={`${import.meta.env.BASE_URL}images/booked.svg`} alt="Booked" />
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
