import React, { useEffect, useRef, useState } from "react";
import ServiceBookingContainer from "./components/ServiceBookingContainer";


const AppointmentDrawer = ({
  isOpen,
  onClose,
  timeSlot,
  doctor,
  customer,
  editAppointment,
  onRefreshAppointments,
}) => {
  const drawerRef = useRef(null);
  const [resetKey, setResetKey] = useState(0);
  const [height, setHeight] = useState(433);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      setHeight(Math.min(Math.max(newHeight, 300), window.innerHeight - 50));
    };

    const stopResize = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [isResizing]);

  useEffect(() => {
    if (drawerRef.current) {
      if (isOpen) {
        drawerRef.current.classList.add("expand");
      } else {
        drawerRef.current.classList.remove("expand");
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    setResetKey((prev) => prev + 1);
    onClose();
  };

  return (
    <>
      {/* Resize Handle */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: height + "px",
            width: "100%",
            height: "10px",
            cursor: "ns-resize",
            zIndex: 1000,
          }}
          onMouseDown={() => setIsResizing(true)}
        ></div>
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`appointdrwr ${isOpen ? "expand" : ""}`}
        style={{ height: `${height}px` }}
      >
        <div className="apptfrm flxwrp">
          <div className="clpse" onClick={handleClose}>
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#000000"><path d="M480-237 240-477l51-51 189 189 189-189 51 51-240 240Zm0-240L240-717l51-51 189 189 189-189 51 51-240 240Z"/></svg>

          </div>

          <ServiceBookingContainer
            key={editAppointment?.custid || customer?.custid || resetKey}
            prefillData={editAppointment}
            customer={customer}
            doctor={doctor}
            timeSlot={timeSlot}
            onClose={handleClose}
            onRefreshAppointments={onRefreshAppointments}
          />
        </div>
      </div>
    </>
  );
};

export default AppointmentDrawer;
