import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import CustomerDetails from "./CustomerDetails/CustomerDetails";
import './CustomerDetails.css';

const Customer = () => {
  const [searchParams] = useSearchParams();
  const custId = searchParams.get("custid") || "";

  console.log(custId)

  return (
    <>
     

      {/* Pass custid to CustomerDetails */}
      <CustomerDetails custId={custId} />

      <style>{`

      .custnmwrp{
        display: flex;
        justify-content: space-between;
      }
        .cstactionbtn {
          display: flex;
          gap: 15px;
          align-items: center;
        }
        
      `}</style>
    </>
  );
};

export default Customer;
