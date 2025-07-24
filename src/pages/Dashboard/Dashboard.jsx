import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config"; 

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts"
import {
  Calendar,
  Phone,
  FileText,
  Users,
  Receipt,
  Shield,
  Stethoscope,
  Monitor,
  PhoneCall,
  Building,
  ChevronDown,
} from "lucide-react"
import "./dashboard.css"

const Dashboard = () => {

 const currentDate = new Date();
  const monthNames = ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "September", "October", "November", "December"];
  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear().toString();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [metricsData, setMetricsData] = useState({})
  const [opportunitySummary, setOpportunitySummary] = useState([]);
  const [einvoiceSummary, setEinvoiceSummary] = useState([])
  const [loading, setLoading] = useState(true);
  const [courtesySummary, setCourtesySummary] = useState([])
    const [caseSummary, setCaseSummary] = useState([])
    const [appointmentSummary, setAppointmentSummary] = useState([])
    const [auditTrendData, setAuditTrendData] = useState([])
 const monthOptions = [
    { name: "Month", value: "0" },
    { name: "Jan", value: "Jan" },
    { name: "Feb", value: "Feb" },
    { name: "March", value: "March" },
    { name: "April", value: "April" },
    { name: "May", value: "May" },
    { name: "June", value: "June" },
    { name: "July", value: "July" },
    { name: "Aug", value: "Aug" },
    { name: "September", value: "September" },
    { name: "October", value: "October" },
    { name: "November", value: "November" },
    { name: "December", value: "December" }
  ]

  const [counts, setCounts] = useState({
  oppotunityCount: 0,
  appointmentCount: 0,
  courtesyCount: 0,
  einvoiceCount: 0,
  casesCount: 0,
  auditCount: 0,
  medicalAuditCount: 0,
  digitalAuditCount: 0,
  telephoneAuditCount: 0,
});

  

  // Custom tooltip components
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          <p className="tooltip-value">{`${payload[0].dataKey}: ${payload[0].value}`}</p>
        </div>
      )
    }
    return null
  }

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const total = courtesyCallData.reduce((sum, item) => sum + item.value, 0)
      const percentage = ((data.value / total) * 100).toFixed(1)

      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">{`Value: ${data.value}`}</p>
          <p className="tooltip-percentage">{`Percentage: ${percentage}%`}</p>
        </div>
      )
    }
    return null
  }

  const CustomCaseTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const total = caseSummaryData.reduce((sum, item) => sum + item.value, 0)
      const percentage = ((data.value / total) * 100).toFixed(1)

      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">{`Cases: ${data.value}`}</p>
          <p className="tooltip-percentage">{`Percentage: ${percentage}%`}</p>
        </div>
      )
    }
    return null
  }

  const MetricCard = ({ icon: Icon, title, value }) => (
    <div className="metric-card">
      <div className="metric-card-content">
        <Icon />
        <div>
          <p className="metric-title">{title}</p>
          <p className="metric-value">{value}</p>
        </div>
      </div>
    </div>
  )

  const ChartCard = ({ title, children, subtitle }) => (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {subtitle && <div className="chart-subtitle">{subtitle}</div>}
      {children}
    </div>
  )
useEffect(() => {
   const fetchDashboardOverview = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Dashboard/DashboardOverView`, {
        credentials: "include",
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCounts(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard overview:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchDashboardOverview();

    fetch(`${API_BASE_URL}/api/Dashboard/DashboardOppSummary`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        const api = data[0] || {};
        const formatted = [
          { name: "Total", value: api.total, fill: "#3E5D8A" },
          { name: "Open", value: api.open, fill: "#C66752" },
          { name: "Closed", value: api.closed, fill: "#e9edf5" },
          { name: "Converted", value: api.converted, fill: "#2a3850" },
          { name: "WIP", value: api.wip, fill: "#e6a787" }
        ];
        setOpportunitySummary(formatted);
      })
      .catch(err => console.error("Failed to fetch opportunity summary:", err))

    fetch(`${API_BASE_URL}/api/Dashboard/DashboardEinvoiceSummary`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        const api = data[0] || {};
        const formatted = [
          { name: "Total", value: api.total, fill: "#3E5D8A" },
          { name: "Success", value: api.success, fill: "#C66752" },
          { name: "Failed", value: api.failed, fill: "#e9edf5" }
        ];
        setEinvoiceSummary(formatted);
      })
      .catch(err => console.error("Failed to fetch e-invoice summary:", err))

    fetch(`${API_BASE_URL}/api/Dashboard/DashboardCourtesyStatus`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        const api = data[0] || {};
        const formatted = [
          { name: "Completed", value: api.completed, fill: "#3E5D8A" },
          { name: "Pending", value: api.pending, fill: "#C66752" },
          { name: "WIP", value: api.wip, fill: "#e6a787" }
        ];
        setCourtesySummary(formatted);
      })
      .catch(err => console.error("Failed to fetch courtesy summary:", err))

      fetch(`${API_BASE_URL}/api/Dashboard/DashboardCaseSummary`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        const api = data[0] || {};
        const formatted = [
          { name: "WIP", value: api.wip, fill: "#e6a787" },
          { name: "Open", value: api.open, fill: "#C66752" },
          { name: "Closed", value: api.closed, fill: "#5a805d" },
          { name: "Resolved", value: api.resolved, fill: "#335436" },
          { name: "Unresolved", value: api.unresolved, fill: "#8d6e67" }
        ];
        setCaseSummary(formatted);
      })
      .catch(err => console.error("Failed to fetch case summary:", err))

      fetch(`${API_BASE_URL}/api/Dashboard/DashboardApppointmentSummary`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        const api = data[0] || {};
        const formatted = [
          { name: "Booked", value: api.booked, fill: "#3E5D8A" },
          { name: "Cancelled", value: api.cancelled, fill: "#C66752" },
          { name: "Check-In", value: api.checkIn, fill: "#5a805d" },
          { name: "Completed", value: api.complete, fill: "#2a3850" },
          { name: "Confirmed", value: api.confirm, fill: "#e6a787" },
          { name: "No Show", value: api.noShow, fill: "#e9edf5" },
          { name: "Active", value: api.active, fill: "#8d6e67" }
        ];
        setAppointmentSummary(formatted);
      })
      .catch(err => console.error("Failed to fetch appointment summary:", err))
   

  }, []);

  
  useEffect(() => {
    if (selectedMonth === "0") return;
    fetch(`${API_BASE_URL}/api/Dashboard/DashboardAuditTrend`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedMonth, selectedYear })
    })
      .then(res => res.json())
      .then(data => {
        const parsed = data.map(row => ({
          name: row.audtiSegment,
          completed: row.bright || 0
        }));
        setAuditTrendData(parsed);
      })
      .catch(err => console.error("Failed to fetch audit trend data:", err))
  }, [selectedMonth, selectedYear])



  return (
     <>
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <h1>Overview</h1>
        <div className="header-controls">
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="seldd">
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>{m.name}</option>
          ))}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="seldd">
          {["2023","2024","2025"].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
        </div>
      </div>

      {/* Metrics Cards */}
    {loading ? (
  <div className="loader-wrapper">
    <div className="loader"></div>
  </div>
) : (
  <div className="metrics-grid">
    <MetricCard icon={Users} title="Opportunity" value={counts.oppotunityCount} />
    <MetricCard icon={Calendar} title="Appointments" value={counts.appointmentCount} />
    <MetricCard icon={Phone} title="Courtesy Call" value={counts.courtesyCount} />
    <MetricCard icon={FileText} title="Cases" value={counts.casesCount} />
    <MetricCard icon={Receipt} title="E-Invoices" value={counts.einvoiceCount} />
    <MetricCard icon={Shield} title="Audit" value={counts.auditCount} />
    <MetricCard icon={Stethoscope} title="Medical Audit" value={counts.medicalAuditCount} />
    <MetricCard icon={Monitor} title="Digital Audit" value={counts.digitalAuditCount} />
    <MetricCard icon={PhoneCall} title="Telephone Audit" value={counts.telephoneAuditCount} />
    <MetricCard icon={Building} title="Safety Audit" value="2" />
  </div>
)}


      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Audit Trend */}
        <ChartCard title="Audit Trend">
          <div className="chart-container" style={{ height: "300px" }}>
               <ResponsiveContainer width="100%" height={300}>
          <BarChart data={auditTrendData} layout="vertical" margin={{ left: 80, right: 30, top: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" fill="#3E5D8A" />
          </BarChart>
        </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Opportunity Summary */}
        <ChartCard title="Opportunity Summary">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
          <BarChart data={opportunitySummary}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value">
              {opportunitySummary.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* E-Invoice Summary - Updated to match the image */}
        <ChartCard title="E-Invoice Summary">
          <div className="chart-container">
             <ResponsiveContainer width="100%" height="100%">
          <BarChart data={einvoiceSummary} layout="vertical" margin={{ left: 80, right: 30, top: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={50} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value">
              {einvoiceSummary.map((entry, index) => (
                <Cell key={`cell-einvoice-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Completed Appointment vs Courtesy Call Status */}
        <ChartCard title="Completed Appointment vs Courtesy Call Status" subtitle="Total Completed Appointment: 103">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="110%">
          <PieChart>
            <Pie
              data={courtesySummary}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label
            >
              {courtesySummary.map((entry, index) => (
                <Cell key={`cell-courtesy-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="bottom-row">
        {/* Case Summary */}
        <ChartCard title="Case Summary" subtitle="Total Completed Cases: 263">
          <div className="chart-container" style={{ height: "250px" }}>
             <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={caseSummary}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label
            >
              {caseSummary.map((entry, index) => (
                <Cell key={`cell-case-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Appointment Summary */}
        <ChartCard title="Appointment Summary">
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={appointmentSummary}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value">
              {appointmentSummary.map((entry, index) => (
                <Cell key={`cell-appointment-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>

    <style jsx="true">{`.loader-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loader {
  border: 6px solid #f3f3f3;
  border-top: 6px solid #3E5D8A; /* Match your theme color */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 0.8s linear infinite;
}

.seldd{padding: 10px; background: #eff6ff; border-radius: 8px; border: none; font-family: 'Lato', sans-serif}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`}

    </style>

   </>
  )
}

export default Dashboard
