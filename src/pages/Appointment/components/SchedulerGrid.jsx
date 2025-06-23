// AppointmentScheduler.jsx
import React, { useState, useEffect } from "react";
import AppointmentDrawer from './appointmentdrawer/AppointmentDrawer';
import AppointmentDetails from './Sidebar';
import FilterHeader from './FilterHeader';
import AppointmentHeader from './AppointmentHeader';
import { API_BASE_URL } from "../../../config";



const fetchData = async (url, payload = null) => {
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

const convertTo24Hour = (time12h) => {
  if (!time12h) return '';
  const [time, modifier] = time12h.trim().split(' ');
  let [hours, minutes] = time.split(':');
  if (modifier === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
  if (modifier === 'AM' && hours === '12') hours = '00';
  return `${hours.padStart(2, '0')}:${minutes}`;
};

const AppointmentScheduler = ({ onAddCustomer, newCustomer }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editData, setEditData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const timeSlots = [...Array(145)].map((_, i) => {
    const base = new Date(`1970-01-01T10:00:00`);
    base.setMinutes(base.getMinutes() + i * 5);
    return base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  useEffect(() => {
    if (newCustomer) {
      setSelectedCustomer(newCustomer);
      setEditData(null);
      setIsDrawerOpen(true);
    }
  }, [newCustomer]);

   useEffect(() => {
  const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
  const centerCode = stored ? JSON.parse(stored).centerCode : "";

  const fetchDoctors = async () => {
    try {
      const data = await fetchData(`${API_BASE_URL}/api/Master/LoadAllPractioner/${centerCode}`);
      const doctorNames = data.map((doc) => doc.name);
      console.log(doctorNames);
      setDoctors(doctorNames);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  fetchDoctors();
  fetchAppointments(selectedDate);
}, [selectedDate]);


  useEffect(() => {
    window.refreshAppointments = () => {
      fetchAppointments(selectedDate);
    };
  }, [selectedDate]);

  const fetchAppointments = async (date, cusID = null) => {
    try {
      const payload = {
        appointmentdate: date,
        searchtext: '',
        ...(cusID && { cusid: cusID }),
      };
      const data = await fetchData('/AppointmentDetailsHandler.ashx', payload);
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const normalizeTime = (t) => {
    if (!t) return '';
    const d = new Date(`1970-01-01T${convertTo24Hour(t.trim())}`);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  };

  const normalizeDoctorName = (name) => name?.replace(/^Dr\.?\s*/i, '').trim().toLowerCase();

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'booked': return 'bked';
      case 'confirmed': return 'cnfrmd';
      case 'completed': return 'donest';
      case 'active': return 'active';
      case 'checked in': return 'chkinst';
      case 'no show': return 'noshow';
      case 'cancelled': return 'cancelled';
      default: return '';
    }
  };

  // 🔁 Get max stacked appointments per doctor
  const maxAppointmentsPerDoctor = doctors.map((doctor) => {
    let maxStack = 1;
    timeSlots.forEach((time) => {
      const slotTime = normalizeTime(time);
      const count = appointments.filter((appt) =>
        normalizeTime(appt.starttime) === slotTime &&
        normalizeDoctorName(appt.doctorname) === normalizeDoctorName(doctor)
      ).length;
      if (count > maxStack) maxStack = count;
    });
    return maxStack;
  });

  const renderAppointments = (time, doctor) => {
  const slotTime = normalizeTime(time);
  const filtered = appointments.filter((appt) =>
    normalizeTime(appt.starttime) === slotTime &&
    normalizeDoctorName(appt.doctorname) === normalizeDoctorName(doctor)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {filtered.map((appt, idx) => {
        const duration = parseInt(appt.duration?.replace(/\D/g, ''), 10) || 5;
        const width = duration * 14;
        const statusClass = getStatusClass(appt.status);
        const extraClass = duration === 5 ? 'smllappt' : '';

        return (
          <div
            key={appt.appointmentId || idx}
            className={`appcell ${statusClass} ${extraClass}`}
            style={{
              width: `${width}px`,
              minWidth: '50px'
            }}
          >
            <div className="ptflx">
              <div className="ptnm">{appt.fullname}</div>
              <div className={`aptst ${statusClass}`}>
                <span></span>{appt.status || 'Booked'}
              </div>
            </div>
            <div className="apptype"><strong>{appt?.servicename || 'N/A'}</strong></div>
            <span className="expopup" onClick={() => {
              setSelectedAppointment(appt);
              setIsSidebarOpen(true);
            }}>
              <img src={`${import.meta.env.BASE_URL}images/expand.svg`} alt="Expand" />
            </span>
          </div>
        );
      })}
    </div>
  );
};


  return (
    <section className="calsection">
      <AppointmentHeader
        onAddAppointment={(customer) => {
          setSelectedCustomer(customer);
          setIsDrawerOpen(true);
        }}
        onAddCustomer={onAddCustomer}
       onDateChange={(date) => {
  setSelectedDate(date);
  fetchAppointments(date); // ✅ remove cusid filter
}}

      />

      <FilterHeader />

      <div className="msttbl">
        <div className="lfthrdiv">
          <div className="lftcol sticky-header">
            <div className="lftmin lgndiv">
              <div className="lgndth">
                <div className="vertxt">Doctors</div>
                <div className="hrtxt">Time</div>
              </div>
            </div>
          </div>
          <div className="lftcol sticky-header">
            <div className="lftmin">
              {doctors.map((doctor, index) => (
                <div
                  key={index}
                  className="lfttm tblcell"
                  style={{ height: `${80 + (maxAppointmentsPerDoctor[index] - 1) * 15}px` }}
                >
                  {doctor}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rgtcol">
          {timeSlots.map((time, rowIndex) => (
            <div className="cldrrow" key={rowIndex}>
              <div className="cldrttl clnctm sticky-time">{time}</div>
              {doctors.map((doctor, colIndex) => (
                <div
                  key={colIndex}
                  className="cldrcol clncoff"
                  onDoubleClick={() => {
                    setSelectedTimeSlot(time);
                    setSelectedDoctor(doctor);
                    setEditData(null);
                    setIsDrawerOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    minHeight: `${80 + (maxAppointmentsPerDoctor[colIndex] - 1) * 15}px`
                  }}
                >
                  {renderAppointments(time, doctor)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {isSidebarOpen && selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          onClose={() => setIsSidebarOpen(false)}
          onEdit={(appt) => {
            setEditData({ ...appt });
            setSelectedTimeSlot(appt.starttime);
            setSelectedDoctor(appt.doctorname);
            setSelectedAppointment(null);
            setIsSidebarOpen(false);
            setIsDrawerOpen(true);
          }}
        />
      )}

      {isDrawerOpen && (
        <AppointmentDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          customer={selectedCustomer}
          timeSlot={selectedTimeSlot}
          doctor={selectedDoctor}
          editAppointment={editData}
          onRefreshAppointments={() => fetchAppointments(selectedDate)} 
        />
      )}
    </section>
  );
};

export default AppointmentScheduler;
