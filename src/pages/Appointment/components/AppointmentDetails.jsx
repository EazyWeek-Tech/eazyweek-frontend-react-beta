import React, { useEffect, useRef } from 'react';
import CustomerForm from './appointmentdrawer/components/CustomerForm'; 
import ServiceRequestForm from './appointmentdrawer/components/ServiceRequestForm';
import ServiceList from './appointmentdrawer/components/ServiceList';
import FormFooter from './appointmentdrawer/components/FormFooter';

const AppointmentDrawer = ({ isOpen, onClose }) => {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (drawerRef.current) {
      if (isOpen) {
        drawerRef.current.classList.add('expand');
      } else {
        drawerRef.current.classList.remove('expand');
      }
    }
  }, [isOpen]);

  return (
    <div ref={drawerRef} className="appointdrwr">
      <div className="">
        <span className="clpse" onClick={onClose}>
          <img src={`${import.meta.env.BASE_URL}images/collpase.svg`} alt="Collapse" />

        </span>

        <CustomerForm />
        <ServiceRequestForm />
        <ServiceList />
      </div>

      <FormFooter onCancel={onClose} />
    </div>
  );
};

export default AppointmentDrawer;
