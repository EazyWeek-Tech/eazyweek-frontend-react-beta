import React, { useState } from "react";
import { Routes, Route } from 'react-router-dom';
import AddCustomerModal from "./components/AddCustomerModal";
import SchedulerGrid from "./components/SchedulerGrid";
import InvoicePage from "../Invoice";
import ConsultationPage from "../EMR/ConsultationForm"

const Appointment = () => {
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState(null);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <SchedulerGrid
              onAddCustomer={() => setShowAddCustomer(true)}
              newCustomer={newCustomerData}
            />

            {showAddCustomer && (
              <AddCustomerModal
                onClose={() => setShowAddCustomer(false)}
                onCustomerAdded={(cust) => {
                  setNewCustomerData(cust); // Pass to SchedulerGrid
                  setShowAddCustomer(false); // Close modal
                }}
              />
            )}
          </>
        }
      />
      <Route path="/payment" element={<InvoicePage />} />
    </Routes>
  );
};

export default Appointment;
