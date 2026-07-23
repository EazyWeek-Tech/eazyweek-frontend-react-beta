import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import CustomerDetails from "./CustomerDetails/CustomerDetails";
import { API_BASE_URL } from "../../config";
import './CustomerDetails.css';

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const getCenterCode = () => (getUser().centerCode || "").trim();

// FetchCustomerDetails may return the row directly, wrapped in { data }, or as a single-row array.
const pickRecId = (payload) => {
  const d = payload?.data ?? payload;
  const row = Array.isArray(d) ? d[0] : d;
  if (!row || typeof row !== "object") return "";
  const v =
    row.recId ??
    row.recID ??
    row.RECID ??
    row.custRecId ??
    row.CUSTRECID ??
    row.customerRecId ??
    "";
  return v === null || v === undefined ? "" : String(v).trim();
};

const Customer = () => {
  const [searchParams] = useSearchParams();
  const custId   = searchParams.get("custid") || "";
  const urlRecId = searchParams.get("recid")  || "";
  const navigate = useNavigate();

  const [recId, setRecId]         = useState(urlRecId);
  const [resolving, setResolving] = useState(false);

  // Entry from the appointment sidebar omits `recid` from the URL, which leaves the
  // Loyalty and Invoice tabs without a record ID. Resolve it from custId in that case.
  useEffect(() => {
    setRecId(urlRecId);

    if (urlRecId || !custId) {
      setResolving(false);
      return;
    }

    const ac = new AbortController();
    setResolving(true);

    fetch(`${API_BASE_URL}/api/Customer/FetchCustomerDetails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN()}`,
      },
      body: JSON.stringify({ custId, centerCode: getCenterCode() }),
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => {
        const resolved = pickRecId(json);
        if (resolved) {
          setRecId(resolved);
        } else {
          console.warn("[Customer] Could not resolve recId from FetchCustomerDetails:", json);
        }
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          console.warn("[Customer] recId lookup failed for custId:", custId, e);
        }
      })
      .finally(() => setResolving(false));

    return () => ac.abort();
  }, [custId, urlRecId]);

  return (
    <>
      <button className="backbtn" onClick={() => navigate(-1)}>
        Back
      </button>

      {resolving ? (
        <div className="cust-resolving">Loading customer…</div>
      ) : (
        <CustomerDetails custId={custId} recId={recId} />
      )}

      <style>{`
        .custnmwrp {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          background: #f9f9f9;
          border-bottom: 1px solid #ddd;
        }
        .cstactionbtn {
          display: flex;
          gap: 15px;
          align-items: center;
        }
        .cust-resolving {
          padding: 30px;
          font-size: 14px;
          color: #6e7b8f;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .backbtn {
          background-color: #324e78;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          position: absolute;
          top: 20px;
          right: 20px;
        }
        .backbtn:hover {
          background-color: #223b5c;
        }
      `}</style>
    </>
  );
};

export default Customer;