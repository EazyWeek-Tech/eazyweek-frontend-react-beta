"use client"

import { useState } from "react"

const CreateRuleForm = ({ opportunityData, onBack, onSave, onActivate }) => {
  const [ruleConfig, setRuleConfig] = useState({
    dataFetchType: "",
    paidFor: "",
    categoryButNotFor: "",
    categoryFor: "",
    days: "",               // <-- will be used as "custom days" when ruleDays === "0"
    // ✅ ensure ruleDays init is a string
    ruleDays: opportunityData?.ruleDays ? String(opportunityData.ruleDays) : "",
    campStartDate: "",      // dd/MM/yyyy
    campEndDate: "",        // dd/MM/yyyy
    customFromDate: "",     // dd/MM/yyyy (backend uses these as “static” in R1)
    customToDate: "",       // dd/MM/yyyy
    ruleCustomDays: "",     // mirrors "days" when ruleDays === "0"
    // (placeholders if you need them downstream)
    xvalue: "",
    yvalue: "",
    zValue: "",
    pvalue: "",
    ruleZFromDate: "",
    ruleZToDate: "",
    ruleYFromDate: "",
    ruleYToDate: "",
    noShowDays: "",
    noShowCustomDays: "",
    cancelDays: "",
    cancelCustomDays: "",
    customerSpecialDays: "",
    customerType: "",
  })

  const [errors, setErrors] = useState({})

  // helpers
  const str = (v) => (v ?? "").toString().trim()
  const ddmmyyyy = (s) => str(s)
  const resolveFetchTypeFromRuleDays = (ruleDays) => (ruleDays === "9999" ? "1" : "2")

  // 🔹 NEW: derive from upstream JSON if user hasn’t touched select yet
  const parseJsonSafe = (raw) => {
    try {
      if (!raw) return null
      if (typeof raw === "object") return raw
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const deriveFromUpstream = () => {
    // try a few places where the earlier screen may have put the JSON
    const upstream =
      parseJsonSafe(opportunityData?.ruleDetails) ||
      parseJsonSafe(opportunityData?.preRuleDetails) ||
      null

    const vals = upstream?.vals || {}
    const fetchTypeStr = str(vals.fetchType) // often "1" or "2" (string)
    const categoryWindow = str(vals.categoryWindow) // "1","7","30","90"
    const customDays = str(vals.customDays) // number as string or ""
    const fromDate = str(vals.fromDate) // dd/MM/yyyy
    const toDate = str(vals.toDate) // dd/MM/yyyy

    let derivedRuleDays = ""
    let derivedFetchType = ""
    let derivedCustomDays = ""
    let derivedCampStart = ""
    let derivedCampEnd = ""

    // decide ruleDays:
    // priority: date range > custom > categoryWindow
    if (fromDate && toDate) {
      derivedRuleDays = "9999"
      derivedCampStart = fromDate
      derivedCampEnd = toDate
    } else if (customDays) {
      derivedRuleDays = "0"
      derivedCustomDays = customDays
    } else if (categoryWindow) {
      derivedRuleDays = categoryWindow
    }

    // fetchType: prefer explicit upstream if valid, else infer from ruleDays
    if (fetchTypeStr === "1" || fetchTypeStr === "2") {
      derivedFetchType = fetchTypeStr
    } else {
      derivedFetchType = resolveFetchTypeFromRuleDays(derivedRuleDays)
    }

    return {
      ruleDays: derivedRuleDays,
      ruleFetchType: derivedFetchType,
      ruleCustomDays: derivedCustomDays,
      campStartDate: derivedCampStart,
      campEndDate: derivedCampEnd,
    }
  }

  const handleSelectChange = (field, value) => {
    setRuleConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleBack = () => {
    if (onBack) onBack()
  }

  // ✅ validator (now uses derived fallback if select is blank)
  const validate = (ruleCode, ruleDaysFromState) => {
    const upstream = deriveFromUpstream()
    const effectiveRuleDays = str(ruleDaysFromState || upstream.ruleDays)
    const e = {}

    if (!effectiveRuleDays) {
      e.ruleDays = "Please select Rule Days."
    }

    if (effectiveRuleDays === "0") {
      const n = Number(ruleConfig.days || ruleConfig.ruleCustomDays || upstream.ruleCustomDays)
      if (!n || Number.isNaN(n) || n < 1) {
        e.days = "Enter custom days (minimum 1)."
      }
    }

    if (effectiveRuleDays === "9999") {
      const start = ruleConfig.campStartDate || upstream.campStartDate
      const end = ruleConfig.campEndDate || upstream.campEndDate
      if (!start || !end) {
        e.dateRange = "Select campaign start/end dates (dd/MM/yyyy)."
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ✅ payload builder with upstream-derived fallback
  const buildOppPayload = (isDraft /* "1" | "0" */) => {
    const ruleCode = str(opportunityData?.selectedRuleCode || opportunityData?.selectedRules?.[0])

    const upstream = deriveFromUpstream()

    // choose ruleDays from state, else upstream
    let ruleDaysSelected = str(ruleConfig.ruleDays || upstream.ruleDays)
    // choose fetch type (mirror to ruleType)
    let ruleFetchType =
      ruleDaysSelected ? resolveFetchTypeFromRuleDays(ruleDaysSelected) : upstream.ruleFetchType

    // if ruleType from UI was a word like "TRANSACTION", normalize to "1"/"2" if possible
    const normalizedRuleTypeLabel = str(ruleConfig.dataFetchType || opportunityData?.ruleType)
    if (!ruleFetchType) {
      // crude normalization from possible labels; keep existing if already "1"/"2"
      const label = normalizedRuleTypeLabel.toUpperCase()
      if (label.includes("STATIC")) ruleFetchType = "1"
      else if (label.includes("TRANS") || label.includes("RELAT") || label.includes("BATCH") || label.includes("REAL")) ruleFetchType = "2"
    }

    // Decide final days/custom/dates
    let finalRuleDays = ruleDaysSelected
    let ruleCustomDays = str(ruleConfig.ruleCustomDays || ruleConfig.days || upstream.ruleCustomDays)

    // date range
    let campStartDate = ddmmyyyy(ruleConfig.campStartDate || upstream.campStartDate)
    let campEndDate = ddmmyyyy(ruleConfig.campEndDate || upstream.campEndDate)

    if (finalRuleDays === "0") {
      if (!ruleCustomDays) ruleCustomDays = "1"
    }
    if (finalRuleDays === "9999") {
      // must have dates; if still empty, leave as "" and validator will catch
    }

    // If still nothing (edge), try last fallback from upstream categoryWindow
    if (!finalRuleDays) {
      finalRuleDays = str(upstream.ruleDays)
    }
    // last-resort: if still empty, use "30" (keeps backend happy; validator should stop this earlier)
    if (!finalRuleDays) finalRuleDays = "30"
    if (!ruleFetchType) ruleFetchType = resolveFetchTypeFromRuleDays(finalRuleDays)
    const ruleType = ruleFetchType // mirror

    return {
      // Identifiers/names
      oppCode: str(opportunityData?.opportunityCode),
      oppName: str(opportunityData?.opportunityName),

      // Core rule code
      ruleCode: str(ruleCode),

      // Optional values
      xvalue: str(ruleConfig.xvalue || opportunityData?.xvalue),
      yvalue: str(ruleConfig.yvalue || opportunityData?.yvalue),
      zValue: str(ruleConfig.zValue),
      pvalue: str(ruleConfig.pvalue),

      // Human-readable details (kept as-is; not required by backend)
      ruleDetails: str(
        opportunityData?.ruleDetails ||
          [
            ruleConfig.paidFor && `Paid for: ${ruleConfig.paidFor}`,
            ruleConfig.categoryButNotFor && `But not for: ${ruleConfig.categoryButNotFor}`,
            ruleConfig.categoryFor && `Category for: ${ruleConfig.categoryFor}`,
            finalRuleDays && `Days: ${finalRuleDays === "0" ? ruleCustomDays : finalRuleDays}`,
            finalRuleDays === "9999" && campStartDate && campEndDate && `DateRange: ${campStartDate} – ${campEndDate}`,
          ]
            .filter(Boolean)
            .join(" | ")
      ),

      // Z & Y windows (pass through if you ever use them)
      ruleZFromDate: str(ruleConfig.ruleZFromDate),
      ruleZToDate: str(ruleConfig.ruleZToDate),

      isDraft: str(isDraft),

      // === Critical for repo ===
      ruleDays: str(finalRuleDays),         // "1","7","30","90","0","9999" (never blank now)
      ruleType: str(ruleType),              // "1"/"2"
      ruleYFromDate: str(ruleConfig.ruleYFromDate),
      ruleYToDate: str(ruleConfig.ruleYToDate),

      // Static (repo often reads these from “customFrom/To” for R1)
      staticFromDate: str(ruleConfig.staticFromDate),
      staticToDate: str(ruleConfig.staticToDate),

      ruleFetchType: str(ruleFetchType),    // "1" static/date-range, "2" relative

      ruleCustomDays: str(ruleCustomDays),  // used when ruleDays === "0"
      customFromDate: ddmmyyyy(ruleConfig.customFromDate),
      customToDate: ddmmyyyy(ruleConfig.customToDate),

      campStartDate: campStartDate,
      campEndDate: campEndDate,

      // Rule-specific (leave "" when N/A)
      noShowDays: str(ruleConfig.noShowDays),
      noShowCustomDays: str(ruleConfig.noShowCustomDays),
      cancelDays: str(ruleConfig.cancelDays),
      cancelCustomDays: str(ruleConfig.cancelCustomDays),
      customerSpecialDays: str(ruleConfig.customerSpecialDays),
      customerType: str(ruleConfig.customerType),
    }
  }

  const handleSave = () => {
    const ruleCode = str(opportunityData?.selectedRuleCode || opportunityData?.selectedRules?.[0])
    const upstream = deriveFromUpstream()
    const ruleDaysSelected = str(ruleConfig.ruleDays || upstream.ruleDays)
    if (!validate(ruleCode, ruleDaysSelected)) return
    if (onSave) onSave(buildOppPayload("1"))
  }

  const handleActivate = () => {
    const ruleCode = str(opportunityData?.selectedRuleCode || opportunityData?.selectedRules?.[0])
    const upstream = deriveFromUpstream()
    const ruleDaysSelected = str(ruleConfig.ruleDays || upstream.ruleDays)
    if (!validate(ruleCode, ruleDaysSelected)) return
    if (onActivate) onActivate(buildOppPayload("0"))
  }

  // Get the first selected rule for display
  const selectedRule = opportunityData?.selectedRules?.[0] || "No rule selected"

  return (
    <>
      <style jsx>{`
        .create-rule-container {
        }

        .breadcrumb {
          font-size: 14px;
          color: #6c757d;
          margin-bottom: 30px;
        }

        .breadcrumb-link {
          color: #334b71;
          text-decoration: none;
          cursor: pointer;
        }

        .breadcrumb-link:hover {
          text-decoration: underline;
        }

        .breadcrumb-separator {
          margin: 0 8px;
          color: #6c757d;
        }

        .breadcrumb-current {
          color: #6c757d;
        }

        .form-container {
          background: white;
          border-radius: 8px;
          
          margin-bottom: 20px;
          max-width: 1200px;
        }

        .form-row {
          display: flex;
          align-items: center;
          margin-bottom: 30px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .form-label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
          min-width: 150px;
        }

        .form-input {
          padding: 12px 16px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.3s ease;
          min-width: 300px;
        }

        .form-input:focus {
          outline: none;
          border-color: #334b71;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .form-select {
          padding: 12px 16px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
          min-width: 150px;
        }

        .form-select:focus {
          outline: none;
          border-color: #334b71;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .selected-rule-container {
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }

        .selected-rule-label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
          margin-bottom: 10px;
        }

        .selected-rule-value {
          font-size: 16px;
          color: #495057;
          font-weight: 500;
        }

        .rule-config-section {
          margin-top: 30px;
          padding-top: 30px;
          border-top: 1px solid #dee2e6;
        }

        .config-row {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .config-label {
          font-size: 14px;
          color: #495057;
          font-weight: 500.
        }

        .none-selected-btn {
          padding: 8px 16px;
          background-color: #f8f9fa;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .none-selected-btn:hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
        }

        .action-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 40px;
          padding-top: 30px;
          border-top: 1px solid #dee2e6;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
          min-width: 100px;
        }

        .btn-back {
          background-color: #6c757d;
          color: white;
        }

        .btn-back:hover {
          background-color: #5a6268;
          transform: translateY(-1px);
        }

        .btn-save {
          background-color: #28a745;
          color: white;
        }

        .btn-save:hover {
          background-color: #218838;
          transform: translateY(-1px);
        }

        .btn-activate {
          background-color: #334b71;
          color: white;
        }

        .btn-activate:hover {
          background-color: #2a3f5f;
          transform: translateY(-1px);
        }

        .error {
          font-size: 12px;
          color: #c0392b;
          margin-top: -12px;
        }

        @media (max-width: 768px) {
          .create-rule-container {
            padding: 15px;
          }

          .form-container {
            padding: 20px;
          }

          .form-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .form-label {
            min-width: auto;
          }

          .form-input,
          .form-select {
            min-width: 100%;
          }

          .config-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="create-rule-container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span className="breadcrumb-link">Opportunity</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-current">Create Rule</span>
        </div>

        {/* Form Container */}
        <div className="form-container">
          {/* Opportunity Name */}
          <div className="form-row">
            <label className="form-label">Opportunity Name :</label>
            <input type="text" value={opportunityData?.opportunityName || ""} className="form-input" readOnly />
          </div>

          {/* Selected Rule */}
          <div className="selected-rule-container">
            <div className="selected-rule-label">Selected Rule:</div>
            <div className="selected-rule-value">{opportunityData?.selectedRules?.[0] || "No rule selected"}</div>
          </div>

          {/* Segment (not used by backend ruleDays checks, left intact) */}
          <div className="form-row">
            <label className="form-label">Segment</label>
            <select
              className="form-select"
              value={ruleConfig.dataFetchType}
              onChange={(e) => handleSelectChange("dataFetchType", e.target.value)}
            >
              <option value="">Select</option>
              <option value="realtime">Real Time</option>
              <option value="batch">Batch</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {/* Rule Configuration Section */}
          <div className="rule-config-section">
            <div className="config-row">
              <span className="config-label">Paid for</span>
              <button className="none-selected-btn" onClick={() => { /* Handle category selection */ }}>
                {ruleConfig.paidFor ? ruleConfig.paidFor : "None selected"}
              </button>

              <span className="config-label">Category but not for</span>
              <button className="none-selected-btn" onClick={() => { /* Handle category selection */ }}>
                {ruleConfig.categoryButNotFor ? ruleConfig.categoryButNotFor : "None selected"}
              </button>

              <span className="config-label">Category for</span>
              <select
                className="form-select"
                value={ruleConfig.categoryFor}
                onChange={(e) => handleSelectChange("categoryFor", e.target.value)}
              >
                <option value="">Select</option>
                <option value="consultation">Consultation</option>
                <option value="treatment">Treatment</option>
                <option value="procedure">Procedure</option>
              </select>

              <span className="config-label">days</span>

              {/* Rule Days select */}
              <select
                className="form-select rf-input"
                value={ruleConfig.ruleDays}
                onChange={(e) => {
                  const v = String(e.target.value)
                  setRuleConfig((prev) => {
                    const isCustom = v === "0"
                    const isDateRange = v === "9999"
                    return {
                      ...prev,
                      ruleDays: v,
                      days: !isCustom && !isDateRange ? v : prev.days,
                      ruleCustomDays: isCustom ? (prev.ruleCustomDays || prev.days || "") : prev.ruleCustomDays,
                    }
                  })
                }}
              >
                <option value="">Select</option>
                <option value="1">Past 1 day</option>
                <option value="7">Past 1 Week</option>
                <option value="30">Past 1 Month</option>
                <option value="90">Past 3 Month</option>
                <option value="0">Custom</option>
                <option value="9999">Date Range</option>
              </select>

              {/* Custom days input when ruleDays === "0" */}
              {ruleConfig.ruleDays === "0" && (
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Custom days e.g., 45"
                  className="form-input"
                  value={ruleConfig.days}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, "")
                    setRuleConfig((prev) => ({
                      ...prev,
                      days: v,
                      ruleCustomDays: v,
                    }))
                  }}
                />
              )}
            </div>

            {/* Date range fields only when Date Range is chosen */}
            {ruleConfig.ruleDays === "9999" && (
              <div className="config-row">
                <span className="config-label">Campaign Start (dd/MM/yyyy)</span>
                <input
                  type="text"
                  placeholder="dd/MM/yyyy"
                  className="form-input"
                  value={ruleConfig.campStartDate}
                  onChange={(e) => handleSelectChange("campStartDate", e.target.value)}
                />
                <span className="config-label">Campaign End (dd/MM/yyyy)</span>
                <input
                  type="text"
                  placeholder="dd/MM/yyyy"
                  className="form-input"
                  value={ruleConfig.campEndDate}
                  onChange={(e) => handleSelectChange("campEndDate", e.target.value)}
                />
              </div>
            )}

            {/* Errors */}
            {errors.ruleDays && <div className="error">{errors.ruleDays}</div>}
            {errors.days && <div className="error">{errors.days}</div>}
            {errors.dateRange && <div className="error">{errors.dateRange}</div>}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button type="button" className="btn btn-back" onClick={handleBack}>
              Back
            </button>
            <button type="button" className="btn btn-save" onClick={handleSave}>
              Save
            </button>
            <button type="button" className="btn btn-activate" onClick={handleActivate}>
              Activate
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default CreateRuleForm
