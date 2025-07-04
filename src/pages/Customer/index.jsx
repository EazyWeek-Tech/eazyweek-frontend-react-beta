import React from "react";
import CustomerDetails from "./CustomerDetails/CustomerDetails";
import './CustomerDetails.css' 

const Customer = () => {
  return(
    <>
    <header className="cstheader">
      <div className="custnmwrp">
          <div>Oxy Abdullah</div>
      </div>

      <div className="cstactionbtn">

      </div>
    </header>
     <CustomerDetails />

     <style>{`
     .cstactionbtn{display: flex; gap: 15px; align-items: center;}
        .cstheader{z-index:2; position: sticky; top:0; box-shadow: 2px 2px 5px #ccc; padding: 20px 15px; background: #334B71; font-size: 18px; font-family: 'Inter'; display: flex; justify-content: space-between; align-items: center; color: #fff;}
     `}</style>
    </>
  );
};

export default Customer;
