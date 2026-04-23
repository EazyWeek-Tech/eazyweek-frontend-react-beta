import React from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import CustomerDetails from "./CustomerDetails/CustomerDetails";
import './CustomerDetails.css';

const Customer = () => {
  const [searchParams] = useSearchParams();
  const custId = searchParams.get("custid") || "";
  const recId = searchParams.get("recid") || "";
  const navigate = useNavigate();

  console.log(custId);

  return (
    <>
      <button className="backbtn" onClick={() => navigate(-1)}>
            Back
          </button>

      {/* Pass custid to CustomerDetails */}
      <CustomerDetails custId={custId} recId={recId} />

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
