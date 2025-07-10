import "./AuditDashboard.css"

// Data matching the screenshot
const telephoneAuditData = [
  { period: "Last 3 Months", value: 6 },
  { period: "Jul", value: 8 },
]

const digitalAuditData = [
  {
    period: "Last 3 Months",
    "General Content Form": 8,
    "ETVS Form": 10,
    "Pricing Queries": 11,
    "Pricing History": 6,
    "Service Form/Therapy Record": 14,
  },
  {
    period: "Jul",
    "General Content Form": 8,
    "ETVS Form": 10,
    "Pricing Queries": 11,
    "Pricing History": 6,
    "Service Form/Therapy Record": 14,
  },
]

const medicalAuditData = [
  {
    period: "Last 3 Months",
    "Emergency Kit": 6,
    "Equipment and Drugs": 30,
    "Infection Control": 10,
    "Medical Records": 18,
    "Open Medication / Open Items": 18,
  },
  {
    period: "Jul",
    "Emergency Kit": 6,
    "Equipment and Drugs": 30,
    "Infection Control": 10,
    "Medical Records": 18,
    "Open Medication / Open Items": 18,
  },
]

const safetyAuditCategories = [
  "Emergency Preparedness",
  "Fire Safety Compliance",
  "Hazardous Materials",
  "PPE Safety",
  "Incident Management",
  "Safety Training",
  "Safety Equipment",
  "Security",
]

const agentsPerformanceData = [{ name: "Jays", value: 6 }]

// Line Chart Component
const LineChart = ({ data, title, colors }) => {
  const maxValue = 10
  const chartWidth = 400
  const chartHeight = 200

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-wrapper">
        <div className="chart-area">
          <svg width={chartWidth} height={chartHeight} className="line-chart">
            {/* Grid lines */}
            {[0, 2, 4, 6, 8, 10].map((value) => (
              <g key={value}>
                <line
                  x1="50"
                  y1={chartHeight - 30 - (value / maxValue) * (chartHeight - 60)}
                  x2={chartWidth - 20}
                  y2={chartHeight - 30 - (value / maxValue) * (chartHeight - 60)}
                  stroke="#e0e0e0"
                  strokeDasharray="2,2"
                />
                <text
                  x="40"
                  y={chartHeight - 30 - (value / maxValue) * (chartHeight - 60) + 4}
                  fontSize="12"
                  fill="#666"
                  textAnchor="end"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            <text x="120" y={chartHeight - 10} fontSize="12" fill="#666" textAnchor="middle">
              Last 3 Months
            </text>
            <text x="320" y={chartHeight - 10} fontSize="12" fill="#666" textAnchor="middle">
              Jul
            </text>

            {/* Line */}
            <polyline
              points={data
                .map((d, i) => `${120 + i * 200},${chartHeight - 30 - (d.value / maxValue) * (chartHeight - 60)}`)
                .join(" ")}
              fill="none"
              stroke={colors[0]}
              strokeWidth="2"
            />

            {/* Points */}
            {data.map((d, i) => (
              <circle
                key={i}
                cx={120 + i * 200}
                cy={chartHeight - 30 - (d.value / maxValue) * (chartHeight - 60)}
                r="4"
                fill={colors[0]}
              />
            ))}
          </svg>
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#ff6b6b" }}></div>
            <span>Sub-Segment</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#4ecdc4" }}></div>
            <span>Quality of Care</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#45b7d1" }}></div>
            <span>Handover Communication</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#f9ca24" }}></div>
            <span>Learning and Greeting</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#6c5ce7" }}></div>
            <span>Quality of Call</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#a0a0a0" }}></div>
            <span>Call Closure</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Bar Chart Component
const BarChart = ({ data, title, colors }) => {
  const maxValue = Math.max(...Object.values(data[0]).filter((v) => typeof v === "number")) + 5
  const chartWidth = 400
  const chartHeight = 200
  const barWidth = 30
  const groupWidth = 160

  const categories = Object.keys(data[0]).filter((key) => key !== "period")

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-wrapper">
        <div className="chart-area">
          <svg width={chartWidth} height={chartHeight} className="bar-chart">
            {/* Grid lines */}
            {Array.from({ length: Math.ceil(maxValue / 5) + 1 }, (_, i) => i * 5).map((value) => (
              <g key={value}>
                <line
                  x1="50"
                  y1={chartHeight - 30 - (value / maxValue) * (chartHeight - 60)}
                  x2={chartWidth - 20}
                  y2={chartHeight - 30 - (value / maxValue) * (chartHeight - 60)}
                  stroke="#e0e0e0"
                  strokeDasharray="2,2"
                />
                <text
                  x="40"
                  y={chartHeight - 30 - (value / maxValue) * (chartHeight - 60) + 4}
                  fontSize="12"
                  fill="#666"
                  textAnchor="end"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* Bars */}
            {data.map((periodData, periodIndex) => (
              <g key={periodIndex}>
                {categories.map((category, categoryIndex) => {
                  const x = 80 + periodIndex * groupWidth + categoryIndex * (barWidth + 2)
                  const height = (periodData[category] / maxValue) * (chartHeight - 60)
                  const y = chartHeight - 30 - height

                  return (
                    <rect
                      key={category}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      fill={colors[categoryIndex % colors.length]}
                    />
                  )
                })}
                <text
                  x={80 + periodIndex * groupWidth + (categories.length * (barWidth + 2)) / 2}
                  y={chartHeight - 10}
                  fontSize="12"
                  fill="#666"
                  textAnchor="middle"
                >
                  {periodData.period}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="chart-legend">
          {categories.map((category, index) => (
            <div key={category} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: colors[index % colors.length] }}></div>
              <span>{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Simple Bar Chart for Agents
const SimpleBarChart = ({ data, title }) => {
  const maxValue = 8
  const chartWidth = 400
  const chartHeight = 200

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-area">
        <svg width={chartWidth} height={chartHeight} className="simple-bar-chart">
          {/* Grid lines */}
          {[0, 2, 4, 6, 8].map((value) => (
            <g key={value}>
              <line
                x1="50"
                y1={chartHeight - 30 - (value / maxValue) * (chartHeight - 60)}
                x2={chartWidth - 20}
                y2={chartHeight - 30 - (value / maxValue) * (chartHeight - 60)}
                stroke="#e0e0e0"
                strokeDasharray="2,2"
              />
              <text
                x="40"
                y={chartHeight - 30 - (value / maxValue) * (chartHeight - 60) + 4}
                fontSize="12"
                fill="#666"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          ))}

          {/* Bar */}
          <rect
            x="180"
            y={chartHeight - 30 - (data[0].value / maxValue) * (chartHeight - 60)}
            width="40"
            height={(data[0].value / maxValue) * (chartHeight - 60)}
            fill="#ff6b6b"
          />

          {/* X-axis label */}
          <text x="200" y={chartHeight - 10} fontSize="12" fill="#666" textAnchor="middle">
            {data[0].name}
          </text>
        </svg>
      </div>
      <div className="chart-footer">Last 3 Months - Jul</div>
    </div>
  )
}

const AuditDashboard = () => {
  return (
    <div className="audit-dashboard">
      {/* Header with Title and Date Controls */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="breadcrumb">
            <a href="/" className="breadcrumb-link">Dashboard</a>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Audit</span>
          </div>
          <h1 className="page-title">Audit Overview</h1>
        </div>
        <div className="header-right">
          <select className="month-select">
            <option>Month</option>
            <option>January</option>
            <option>February</option>
            <option>March</option>
            <option>April</option>
            <option>May</option>
            <option>June</option>
            <option>July</option>
            <option>August</option>
            <option>September</option>
            <option>October</option>
            <option>November</option>
            <option>December</option>
          </select>
          <select className="year-select">
            <option>2024</option>
            <option>2023</option>
            <option>2022</option>
          </select>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Telephone Audit */}
        <LineChart data={telephoneAuditData} title="Telephone Audit - Criteria" colors={["#ff6b6b"]} />

        {/* Digital Audit */}
        <BarChart
          data={digitalAuditData}
          title="Digital Audit - Criteria"
          colors={["#ff6b6b", "#4ecdc4", "#45b7d1", "#6c5ce7", "#2ed573"]}
        />

        {/* Medical Audit */}
        <BarChart
          data={medicalAuditData}
          title="Medical Audit - Criteria"
          colors={["#ff6b6b", "#f9ca24", "#45b7d1", "#6c5ce7", "#2ed573"]}
        />

        {/* Safety Audit */}
        <div className="chart-container">
          <h3 className="chart-title">Safety Audit - Criteria</h3>
          <div className="chart-wrapper">
            <div className="chart-area">
              <div className="empty-chart-message">No data available for the selected period</div>
            </div>
            <div className="chart-legend">
              {safetyAuditCategories.map((category, index) => (
                <div key={category} className="legend-item">
                  <div
                    className="legend-color"
                    style={{
                      backgroundColor: [
                        "#ff6b6b",
                        "#f9ca24",
                        "#45b7d1",
                        "#6c5ce7",
                        "#2ed573",
                        "#ff9ff3",
                        "#54a0ff",
                        "#5f27cd",
                      ][index % 8],
                    }}
                  ></div>
                  <span>{category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Housekeeping and Grooming */}
        <div className="housekeeping-section">
          <h3 className="section-title">Housekeeping and Grooming Audit</h3>
          <div className="housekeeping-grid">
            <div className="housekeeping-card">
              <h4 className="card-subtitle">Grooming</h4>
              <div className="empty-chart-area">
                <div className="empty-chart-placeholder">
                  <div className="placeholder-text">No data available</div>
                  <div className="placeholder-subtext">Audit Month: Last 3 Months - Jul</div>
                </div>
              </div>
            </div>
            <div className="housekeeping-card">
              <h4 className="card-subtitle">Housekeeping</h4>
              <div className="empty-chart-area">
                <div className="empty-chart-placeholder">
                  <div className="placeholder-text">No data available</div>
                  <div className="placeholder-subtext">Bright - LIMS - MOM</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Telephone Audit - Agents */}
        <div className="agents-section">
          <h3 className="section-title">Telephone Audit - Agents</h3>
          <SimpleBarChart data={agentsPerformanceData} title="Agents Performance" />
        </div>
      </div>

      {/* Draft and Completed Audit Tables */}
      <div className="audit-tables">
        <div className="table-card">
          <h3 className="table-title">Draft Audit MTD</h3>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Telephone</th>
                <th>WhatsApp</th>
                <th>Instagram</th>
                <th>Grooming</th>
                <th>Digital</th>
                <th>Medical</th>
                <th>Safety</th>
                <th>House Keeping</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Telephone</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <h3 className="table-title">Completed Audit MTD</h3>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Jays</th>
                <th>WhatsApp</th>
                <th>Instagram</th>
                <th>Grooming</th>
                <th>Digital</th>
                <th>Medical</th>
                <th>Safety</th>
                <th>House Keeping</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Jays</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AuditDashboard
