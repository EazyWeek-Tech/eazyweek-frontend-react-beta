import "./AuditDashboard.css"

// =====================
// Existing data (kept)
// =====================
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

// kept: your original categories array (still used for Safety legend below)
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

const agentsPerformanceData = [{ name: "Agent", value: 6 }]

// =====================
// New shared palette
// =====================
const PALETTE_8 = [
  "#334b71", // deep navy
  "#cc6b5c", // warm coral
  "#F3DCB0", // soft sand
  "#8da0b8", // slate
  "#A7D1CD", // teal
  "#EDAF90", // peach
  "#e9eef5", // mist
  "#FF9F9D", // soft red
]

// =====================
// New data (added)
// =====================

// SAFETY – two periods, 8 criteria (positive values only)
const safetyAuditData = [
  {
    period: "Last 3 Months",
    "Emergency Preparedness": 12,
    "Fire Safety Compliance": 10,
    "Hazardous Materials": 8,
    "PPE Safety": 14,
    "Incident Management": 9,
    "Safety Training": 11,
    "Safety Equipment": 13,
    "Security": 7,
  },
  {
    period: "Jul",
    "Emergency Preparedness": 10,
    "Fire Safety Compliance": 9,
    "Hazardous Materials": 7,
    "PPE Safety": 12,
    "Incident Management": 8,
    "Safety Training": 10,
    "Safety Equipment": 12,
    "Security": 6,
  },
]

// GROOMING – two periods, 4 criteria
const groomingAuditData = [
  {
    period: "Last 3 Months",
    "Uniform Compliance": 15,
    "Personal Hygiene": 12,
    "Grooming Standards": 14,
    "ID Badge Visibility": 11,
  },
  {
    period: "Jul",
    "Uniform Compliance": 13,
    "Personal Hygiene": 11,
    "Grooming Standards": 12,
    "ID Badge Visibility": 10,
  },
]

// HOUSEKEEPING – two periods, 4 criteria
const housekeepingAuditData = [
  {
    period: "Last 3 Months",
    "Clinic Cleanliness": 16,
    "Restroom Hygiene": 14,
    "Waste Disposal": 12,
    "Linen Management": 13,
  },
  {
    period: "Jul",
    "Clinic Cleanliness": 14,
    "Restroom Hygiene": 12,
    "Waste Disposal": 11,
    "Linen Management": 12,
  },
]

// =====================
// Existing Line Chart
// =====================
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
            <text x="120" y={chartHeight - 10} fontSize="12" fill="#666" textAnchor="middle">
              Last 3 Months
            </text>
            <text x="320" y={chartHeight - 10} fontSize="12" fill="#666" textAnchor="middle">
              Jul
            </text>
            <polyline
              points={data
                .map((d, i) => `${120 + i * 200},${chartHeight - 30 - (d.value / maxValue) * (chartHeight - 60)}`)
                .join(" ")}
              fill="none"
              stroke={colors[0]}
              strokeWidth="2"
            />
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
            <div className="legend-color" style={{ backgroundColor: "#334b71" }}></div>
            <span>Sub-Segment</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#cc6b5c" }}></div>
            <span>Quality of Care</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#F3DCB0" }}></div>
            <span>Handover Communication</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#8da0b8" }}></div>
            <span>Learning and Greeting</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#A7D1CD" }}></div>
            <span>Quality of Call</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: "#EDAF90" }}></div>
            <span>Call Closure</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================
// Upgraded Bar Chart
// (positive-only, auto width, optional legend)
// =====================
const BarChart = ({ data, title, colors, showLegend = true }) => {
  const chartHeight = 200
  const topPad = 30
  const bottomPad = 30

  const categories = Object.keys(data[0]).filter((key) => key !== "period")
  const allVals = data.flatMap((row) =>
    categories.map((k) => Math.max(0, Number(row[k] || 0)))
  )
  const maxValue = Math.max(5, Math.max(...allVals)) + 2

  const barWidth = 24
  const barGap = 6
  const groupInnerWidth = categories.length * (barWidth + barGap)
  const groupGap = 40
  const leftPad = 60
  const rightPad = 24
  const chartWidth =
    leftPad + data.length * groupInnerWidth + (data.length - 1) * groupGap + rightPad

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-wrapper">
        <div className="chart-area">
          <svg width={chartWidth} height={chartHeight} className="bar-chart">
            {Array.from({ length: 6 }, (_, i) => (i * maxValue) / 5).map((value) => {
              const y =
                chartHeight - bottomPad - (value / maxValue) * (chartHeight - topPad - bottomPad)
              return (
                <g key={value}>
                  <line
                    x1={leftPad}
                    y1={y}
                    x2={chartWidth - rightPad}
                    y2={y}
                    stroke="#e0e0e0"
                    strokeDasharray="2,2"
                  />
                  <text x={leftPad - 10} y={y + 4} fontSize="12" fill="#666" textAnchor="end">
                    {Math.round(value)}
                  </text>
                </g>
              )
            })}

            {data.map((row, periodIdx) => {
              const startX = leftPad + periodIdx * (groupInnerWidth + groupGap)
              return (
                <g key={periodIdx}>
                  {categories.map((cat, catIdx) => {
                    const v = Math.max(0, Number(row[cat] || 0))
                    const usableH = chartHeight - topPad - bottomPad
                    const h = (v / maxValue) * usableH
                    const y = chartHeight - bottomPad - h
                    const x = startX + catIdx * (barWidth + barGap)
                    return (
                      <rect
                        key={cat}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={h}
                        fill={colors[catIdx % colors.length]}
                      />
                    )
                  })}
                  <text
                    x={startX + groupInnerWidth / 2}
                    y={chartHeight - 8}
                    fontSize="12"
                    fill="#666"
                    textAnchor="middle"
                  >
                    {row.period}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {showLegend && (
          <div className="chart-legend">
            {categories.map((category, index) => (
              <div key={category} className="legend-item">
                <div
                  className="legend-color"
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <span>{category}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =====================
// Existing Simple Bar
// =====================
const SimpleBarChart = ({ data, title }) => {
  const maxValue = 8
  const chartWidth = 400
  const chartHeight = 200

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-area">
        <svg width={chartWidth} height={chartHeight} className="simple-bar-chart">
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
          <rect
            x="180"
            y={chartHeight - 30 - (data[0].value / maxValue) * (chartHeight - 60)}
            width="40"
            height={(data[0].value / maxValue) * (chartHeight - 60)}
            fill="#ff6b6b"
          />
          <text x="200" y={chartHeight - 10} fontSize="12" fill="#666" textAnchor="middle">
            {data[0].name}
          </text>
        </svg>
      </div>
      <div className="chart-footer">Last 3 Months - Jul</div>
    </div>
  )
}

// =====================
// Main component (merged)
// =====================
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
        {/* Telephone Audit (kept) */}
        <LineChart data={telephoneAuditData} title="Telephone Audit - Criteria" colors={["#334b71"]} />

        {/* Digital Audit (kept) */}
        <BarChart
          data={digitalAuditData}
          title="Digital Audit - Criteria"
          colors={["#334b71", "#cc6b5c", "#F3DCB0", "#8da0b8", "#A7D1CD"]}
        />

        {/* Medical Audit (kept) */}
        <BarChart
          data={medicalAuditData}
          title="Medical Audit - Criteria"
          colors={["#334b71", "#cc6b5c", "#F3DCB0", "#8da0b8", "#A7D1CD"]}
        />

        {/* Safety Audit - now with real chart; keeping your original legend below */}
        <BarChart
          data={safetyAuditData}
          title="Safety Audit - Criteria"
          colors={PALETTE_8}
          showLegend={false}
        />
        <div className="chart-legend">
          {safetyAuditCategories.map((category, index) => (
            <div key={category} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: PALETTE_8[index % PALETTE_8.length] }}
              ></div>
              <span>{category}</span>
            </div>
          ))}
        </div>

        {/* Housekeeping and Grooming – now charts on the positive side */}
        <div className="housekeeping-section">
          <h3 className="section-title">Housekeeping and Grooming Audit</h3>
          <div className="housekeeping-grid">
            <div className="housekeeping-card">
              <h4 className="card-subtitle">Grooming</h4>
              <BarChart
                data={groomingAuditData}
                title="Grooming - Criteria"
                colors={[PALETTE_8[0], PALETTE_8[1], PALETTE_8[3], PALETTE_8[5]]}
              />
            </div>
            <div className="housekeeping-card">
              <h4 className="card-subtitle">Housekeeping</h4>
              <BarChart
                data={housekeepingAuditData}
                title="Housekeeping - Criteria"
                colors={[PALETTE_8[2], PALETTE_8[3], PALETTE_8[4], PALETTE_8[6]]}
              />
            </div>
          </div>
        </div>

        {/* Telephone Audit - Agents (kept) */}
        <div className="agents-section">
          <h3 className="section-title">Telephone Audit - Agents</h3>
          <SimpleBarChart data={agentsPerformanceData} title="Agents Performance" />
        </div>
      </div>

      {/* Draft and Completed Audit Tables (kept) */}
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
