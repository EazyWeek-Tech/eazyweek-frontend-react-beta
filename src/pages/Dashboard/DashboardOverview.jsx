"use client"

import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const DashboardOverview = () => {
  const [selectedMonth, setSelectedMonth] = useState("Month")
  const [selectedYear, setSelectedYear] = useState("2025")
  const [metricsData, setMetricsData] = useState([])

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Dashboard/DashboardOverView`)
      .then(res => res.json())
      .then(data => {
        const api = data[0] || {};
        const updated = [
          { title: "Opportunity", value: api.oppotunityCount, icon: "/images/icons/opportunity.png", color: "#4F46E5" },
          { title: "Appointments", value: api.appointmentCount, icon: "/images/icons/appointments.png", color: "#059669" },
          { title: "Courtesy Call", value: api.courtesyCount, icon: "/images/icons/courtesy-call.png", color: "#DC2626" },
          { title: "Cases", value: api.casesCount, icon: "/images/icons/cases.png", color: "#7C3AED" },
          { title: "E-Invoices", value: api.einvoiceCount, icon: "/images/icons/e-invoices.png", color: "#EA580C" },
          { title: "Audit", value: api.auditCount, icon: "/images/icons/audit.png", color: "#0891B2" },
          { title: "Medical Audit", value: api.medicalAuditCount, icon: "/images/icons/medical-audit.png", color: "#16A34A" },
          { title: "Digital Audit", value: api.digitalAuditCount, icon: "/images/icons/digital-audit.png", color: "#2563EB" },
          { title: "Telephone Audit", value: api.telephoneAuditCount, icon: "/images/icons/telephone-audit.png", color: "#7C2D12" }
        ];
        setMetricsData(updated);

        console.log(data)
      })
      .catch(err => console.error("Failed to fetch dashboard overview:", err))
  }, [])

  return (
    <>
      <style jsx>{`
        .dashboard-container {
          padding: 24px;
          background-color: #f8fafc;
          min-height: 100vh;
          font-family: 'Lato', "Segoe UI", "Roboto", sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .dashboard-title {
          font-size: 28px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .header-filters {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .filter-select {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          min-width: 100px;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .metric-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .metric-icon {
          width: 20px;
          height: 20px;
          object-fit: contain;
        }

        .metric-title {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .metric-value {
          font-size: 32px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 24px;
        }

        .chart-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .chart-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 20px;
        }

        .chart-placeholder {
          height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          border-radius: 8px;
          border: 2px dashed #d1d5db;
          color: #6b7280;
          font-size: 14px;
          position: relative;
        }

        .audit-trend-chart {
          height: 250px;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          padding: 20px 0;
        }

        .audit-bar {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }

        .audit-label {
          width: 80px;
          font-size: 12px;
          color: #6b7280;
          text-align: right;
          margin-right: 16px;
        }

        .audit-bar-container {
          flex: 1;
          height: 20px;
          background: #f1f5f9;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .audit-bar-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 10px;
          transition: width 0.3s ease;
        }

        .opportunity-summary-chart {
          height: 250px;
          display: flex;
          align-items: end;
          justify-content: space-around;
          padding: 20px 0;
          gap: 12px;
        }

        .opp-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }

        .opp-bar-container {
          width: 40px;
          height: 150px;
          background: #f1f5f9;
          border-radius: 4px;
          position: relative;
          margin-bottom: 8px;
        }

        .opp-bar-fill {
          position: absolute;
          bottom: 0;
          width: 100%;
          border-radius: 4px;
          transition: height 0.3s ease;
        }

        .opp-bar-label {
          font-size: 11px;
          color: #6b7280;
          text-align: center;
        }

        .einvoice-chart {
          height: 250px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 20px 0;
        }

        .einvoice-bar {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }

        .einvoice-label {
          width: 60px;
          font-size: 12px;
          color: #6b7280;
          margin-right: 16px;
        }

        .einvoice-bar-container {
          flex: 1;
          height: 24px;
          background: #f1f5f9;
          border-radius: 12px;
          overflow: hidden;
        }

        .einvoice-bar-fill {
          height: 100%;
          border-radius: 12px;
          transition: width 0.3s ease;
        }

        .pie-chart-container {
          height: 250px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .pie-chart {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          position: relative;
          background: conic-gradient(
            #3b82f6 0deg 100.8deg,
            #ef4444 100.8deg 247.68deg,
            #f3f4f6 247.68deg 360deg
          );
        }

        .pie-chart-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
        }

        .pie-legend {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        .donut-chart {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: conic-gradient(
            #3b82f6 0deg 120deg,
            #ef4444 120deg 240deg,
            #10b981 240deg 360deg
          );
          position: relative;
        }

        .donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100px;
          height: 100px;
          background: white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .donut-total {
          font-size: 10px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .donut-number {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
        }

        .case-summary-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
        }

        .case-total {
          font-size: 14px;
          color: #1e293b;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 16px;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .header-filters {
            justify-content: center;
          }

          .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
          }

          .charts-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .chart-card {
            padding: 16px;
          }

          .pie-chart-container {
            flex-direction: column;
            height: auto;
            gap: 16px;
          }
        }
      `}</style>

      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Overview</h1>
          <div className="header-filters">
            <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="Month">Month</option>
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>
            <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="metrics-grid">
          {metricsData.map((metric, index) => (
            <div key={index} className="metric-card">
              <div className="metric-header">
                <img src={metric.icon || "/placeholder.svg"} alt={metric.title} className="metric-icon" />
                <span className="metric-title">{metric.title}</span>
              </div>
              <div className="metric-value" style={{ color: metric.color }}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Audit Trend Chart */}
          <div className="chart-card">
            <div className="chart-title">Audit Trend</div>
            <div className="audit-trend-chart">
              <div className="audit-bar">
                <div className="audit-label">Bright</div>
                <div className="audit-bar-container">
                  <div className="audit-bar-fill" style={{ width: "85%" }}></div>
                </div>
              </div>
              <div className="audit-bar">
                <div className="audit-label">Instagram</div>
                <div className="audit-bar-container">
                  <div className="audit-bar-fill" style={{ width: "65%" }}></div>
                </div>
              </div>
              <div className="audit-bar">
                <div className="audit-label">Telephone</div>
                <div className="audit-bar-container">
                  <div className="audit-bar-fill" style={{ width: "45%" }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Opportunity Summary Chart */}
          <div className="chart-card">
            <div className="chart-title">Opportunity Summary</div>
            <div className="opportunity-summary-chart">
              <div className="opp-bar">
                <div className="opp-bar-container">
                  <div className="opp-bar-fill" style={{ height: "80%", backgroundColor: "#1e40af" }}></div>
                </div>
                <div className="opp-bar-label">Total</div>
              </div>
              <div className="opp-bar">
                <div className="opp-bar-container">
                  <div className="opp-bar-fill" style={{ height: "60%", backgroundColor: "#dc2626" }}></div>
                </div>
                <div className="opp-bar-label">Open</div>
              </div>
              <div className="opp-bar">
                <div className="opp-bar-container">
                  <div className="opp-bar-fill" style={{ height: "40%", backgroundColor: "#16a34a" }}></div>
                </div>
                <div className="opp-bar-label">Closed</div>
              </div>
              <div className="opp-bar">
                <div className="opp-bar-container">
                  <div className="opp-bar-fill" style={{ height: "20%", backgroundColor: "#ca8a04" }}></div>
                </div>
                <div className="opp-bar-label">Converted</div>
              </div>
              <div className="opp-bar">
                <div className="opp-bar-container">
                  <div className="opp-bar-fill" style={{ height: "10%", backgroundColor: "#7c3aed" }}></div>
                </div>
                <div className="opp-bar-label">WIP</div>
              </div>
            </div>
          </div>

          {/* E-Invoice Summary Chart */}
          <div className="chart-card">
            <div className="chart-title">E-Invoice Summary</div>
            <div className="einvoice-chart">
              <div className="einvoice-bar">
                <div className="einvoice-label">Sent</div>
                <div className="einvoice-bar-container">
                  <div className="einvoice-bar-fill" style={{ width: "75%", backgroundColor: "#1e40af" }}></div>
                </div>
              </div>
              <div className="einvoice-bar">
                <div className="einvoice-label">Succeed</div>
                <div className="einvoice-bar-container">
                  <div className="einvoice-bar-fill" style={{ width: "60%", backgroundColor: "#16a34a" }}></div>
                </div>
              </div>
              <div className="einvoice-bar">
                <div className="einvoice-label">Failed</div>
                <div className="einvoice-bar-container">
                  <div className="einvoice-bar-fill" style={{ width: "15%", backgroundColor: "#dc2626" }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Completed Appointment vs Courtesy Call Status */}
          <div className="chart-card">
            <div className="chart-title">Completed Appointment vs Courtesy Call Status</div>
            <div className="pie-chart-container">
              <div className="pie-chart">
                <div className="pie-chart-center">Total Completed Appointments: 93</div>
              </div>
              <div className="pie-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: "#3b82f6" }}></div>
                  <span>Courtesy Call Completed</span>
                  <span style={{ marginLeft: "auto", fontWeight: "600" }}>28.0%</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: "#ef4444" }}></div>
                  <span>Pending Courtesy Call</span>
                  <span style={{ marginLeft: "auto", fontWeight: "600" }}>68.8%</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: "#f3f4f6" }}></div>
                  <span>No Courtesy Call</span>
                </div>
              </div>
            </div>
          </div>

          {/* Case Summary Chart */}
          <div className="chart-card">
            <div className="chart-title">Case Summary</div>
            <div className="pie-chart-container">
              <div className="donut-chart">
                <div className="donut-center">
                  <div className="donut-total">Total Completed</div>
                  <div className="donut-number">255</div>
                </div>
              </div>
              <div className="pie-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: "#3b82f6" }}></div>
                  <span>WIP</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: "#ef4444" }}></div>
                  <span>Open</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: "#10b981" }}></div>
                  <span>Closed</span>
                </div>
              </div>
            </div>
            <div className="case-summary-info">
              <div className="case-total">Total Completed Cases: 255</div>
            </div>
          </div>

          {/* Appointment Summary Chart */}
          <div className="chart-card">
            <div className="chart-title">Appointment Summary</div>
            <div className="chart-placeholder">
              Appointment Summary Chart
              <br />
              (Chart implementation pending)
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DashboardOverview
