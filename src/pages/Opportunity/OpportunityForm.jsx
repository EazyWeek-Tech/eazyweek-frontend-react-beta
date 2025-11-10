"use client"

import { useNavigate } from "react-router-dom"
import { useRef, useState, useMemo, useEffect } from "react"
import { API_BASE_URL } from "../../config"

const OpportunityForm = ({ onBack, onNext, mode = "create" }) => {
  const navigate = useNavigate()
  const formRef = useRef(null)

  // ---------- CATEGORY OPTIONS ----------
  const [catLoading, setCatLoading] = useState(false)
  const [catOptions, setCatOptions] = useState([]) // [{label, value, raw}]
  useEffect(() => {
    let isMounted = true
    const loadCats = async () => {
      try {
        setCatLoading(true)
        const res = await fetch(`${API_BASE_URL}/api/Opportunity/OppLoadCategory`, { credentials: "include" })
        const data = await res.json()
        const mapped = Array.isArray(data)
          ? data.map(d => ({
              label: d.name ?? d.code ?? "",
              value: d.code ?? d.name ?? "",
              raw: d,
            }))
          : []
        if (isMounted) setCatOptions(mapped)
      } catch (e) {
        console.error("Failed to load categories", e)
        if (isMounted) setCatOptions([])
      } finally {
        if (isMounted) setCatLoading(false)
      }
    }
    loadCats()
    return () => { isMounted = false }
  }, [])

  // ---------- DYNAMIC RULES (TRANSACTION / MASTERS) ----------
  const [transactionRules, setTransactionRules] = useState([])
  const [masterRules, setMasterRules] = useState([])
  const [rulesLoading, setRulesLoading] = useState(false)

  // DB code -> internal ruleId used by RuleForm switch()
  const ruleCodeToId = {
    R1: "paidForXButNotY",
    R2: "paidForXCategoryInYDays",
    R3: "noShowAppointment",
    R4: "cancelledAppointment",
    R5: "customerSpecialDay",
    R6: "customerType",
  }
// Compute the exact noShowDays value the API expects
const computeNoShowDays = (v) => {
  if (String(v.fetchType) === "1") return "9999";                           // STATIC sentinel
  if (isCustom(v.windowType)) return String(v.customDays || "");            // user-entered number
  if (isRange(v.windowType))  return daysBetween(v.fromDate, v.toDate) || ""; // computed from dates
  return numericDays(v.windowType);                                         // 1 / 7 / 30 / 90
};

  const mapApiRule = (r) => ({
    id: ruleCodeToId[r?.code] ?? (r?.code || ""),
    title: r?.name ?? r?.code ?? "",
    desc: r?.name ?? r?.code ?? "",
    raw: r,
  })

  useEffect(() => {
    let alive = true

    const loadRules = async (type, setter) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Opportunity/OppLoadRules/${type}`, { credentials: "include" })
        const data = await res.json()
        const arr = Array.isArray(data) ? data.map(mapApiRule) : []
        if (alive) setter(arr)
      } catch (e) {
        console.error("Failed to load rules:", type, e)
        if (alive) setter([])
      }
    }

    const run = async () => {
      setRulesLoading(true)
      await Promise.all([
        loadRules("TRANSACTION", setTransactionRules),
        loadRules("MASTERS", setMasterRules),
      ])
      setRulesLoading(false)
    }

    run()
    return () => { alive = false }
  }, [])

  // Manual rule
  const manualRules = [
    { id: "manualCreateLead", title: "Create Manual Lead", desc: "Create a lead without auto-segmentation." },
  ]

  const ALL_RULES = [...transactionRules, ...masterRules, ...manualRules]
  const TX_IDS = useMemo(() => transactionRules.map(r => r.id), [transactionRules])
  const MS_IDS = useMemo(() => masterRules.map(r => r.id), [masterRules])
  const MANUAL_ID = "manualCreateLead"

  // ---------- STATE ----------
  const [opportunityName, setOpportunityName] = useState("")
  const [selectedRule, setSelectedRule] = useState("")
  const [ruleValues, setRuleValues] = useState({
    // R1
    paidForXButNotY: {
      categoryX: [],
      categoryY: [],
      fetchType: "",        // "1" | "2"
      categoryWindow: "",   // "", "1","7","30","90","0"(CUSTOM),"9999"(RANGE)
      customDays: "",
      fromDate: "",
      toDate: ""
    },
    // R2
    paidForXCategoryInYDays: {
      categoryX: [],
      fromDate1: "",
      toDate1: "",
      zDays: "",
      fromDate2: "",
      toDate2: "",
      categoryP: [],
      fetchType: ""
    },
    // R3
    noShowAppointment: {
      fetchType: "",
      windowType: "",
      customDays: "",
      fromDate: "",
      toDate: ""
    },
    // R4
    cancelledAppointment: {
      fetchType: "",
      windowType: "",
      customDays: "",
      fromDate: "",
      toDate: ""
    },
    // R5
    customerSpecialDay: { dayType: "", fetchType: "", fromDate: "", toDate: "" }, // dayType is numeric days now
    // R6
    customerType:       { type: "", fetchType: "" },
    // Manual
    manualCreateLead:   { note: "", fetchType: "" },
  })
  const [errors, setErrors] = useState({ name: "", rule: "", fields: "" })
  const nameRef = useRef(null)
  const rulesRef = useRef(null)

  // ---------- Activate Modal State ----------
  const [activateOpen, setActivateOpen] = useState(false)
  const [campStart, setCampStart] = useState("")
  const [campEnd, setCampEnd] = useState("")
  const [activateErr, setActivateErr] = useState("")

  // ---------- SCROLL WHEN RULE SELECTED ----------
  useEffect(() => {
    if (selectedRule && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      const firstInput = formRef.current.querySelector("input, select, textarea, [data-msel]")
      if (firstInput) firstInput.focus?.({ preventScroll: true })
    }
  }, [selectedRule])

  // ---------- HELPERS ----------
  const selectRule = (id) => {
    setSelectedRule(id)
    if (errors.rule || errors.fields) setErrors(prev => ({ ...prev, rule: "", fields: "" }))
  }
  const clearSelection = () => setSelectedRule("")
  const setField = (ruleId, field, value) => {
    setRuleValues(prev => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], [field]: value },
    }))
    if (errors.fields) setErrors(prev => ({ ...prev, fields: "" }))
  }

  const requiredFields = useMemo(() => ({
    paidForXButNotY: ["categoryX", "categoryY", "categoryWindow"],
    paidForXCategoryInYDays: ["categoryX", "fromDate1", "toDate1", "zDays", "fromDate2", "toDate2", "categoryP"],
    noShowAppointment: ["windowType"],
    cancelledAppointment: ["windowType"],
    customerSpecialDay: ["dayType"],
    customerType: ["type"],
    manualCreateLead: [],
  }), [])

  const isFilled = (v) => Array.isArray(v) ? v.length > 0 : (v ?? "").toString().trim() !== ""

  // window helpers
  const isCustom = (v) => String(v) === "0"
  const isRange  = (v) => String(v) === "9999"
  const numericDays = (v) => {
    const s = (v ?? "").toString()
    if (!s || isCustom(s) || isRange(s)) return ""
    return s
  }

  const isRuleValid = (ruleId) => {
    if (!ruleId) return false
    const vals = ruleValues[ruleId] || {}
    if (!["1", "2"].includes(String(vals.fetchType))) return false
    const baseReq = requiredFields[ruleId] || []
    if (!baseReq.every(k => isFilled(vals[k]))) return false

    if (ruleId === "paidForXButNotY") {
      if (isCustom(vals.categoryWindow) && !isFilled(vals.customDays)) return false
      if (String(vals.fetchType) === "2" && isRange(vals.categoryWindow)) {
        if (!isFilled(vals.fromDate) || !isFilled(vals.toDate)) return false
      }
      if (String(vals.fetchType) === "1") {
        if (!isFilled(vals.fromDate) || !isFilled(vals.toDate)) return false
      }
    }

    if (ruleId === "noShowAppointment" || ruleId === "cancelledAppointment") {
      if (isCustom(vals.windowType) && !isFilled(vals.customDays)) return false
      if (isRange(vals.windowType) && String(vals.fetchType) === "2") {
        if (!isFilled(vals.fromDate) || !isFilled(vals.toDate)) return false
      }
      if (String(vals.fetchType) === "1") {
        if (!isFilled(vals.fromDate) || !isFilled(vals.toDate)) return false
      }
    }

     if (ruleId === "noShowAppointment") {
   const nd = computeNoShowDays(vals);
   if (!nd) return false; // ensure API-required noShowDays will be present
 }
    return true
  }

  const canSubmit = opportunityName.trim() && selectedRule && isRuleValid(selectedRule)

  // ---------- UI payload (for parent) ----------
  const buildPayload = () => ({
    opportunityName: opportunityName.trim(),
    ruleId: selectedRule,
    ruleValues: ruleValues[selectedRule] || {},
    segmentationTransaction: TX_IDS.includes(selectedRule) ? selectedRule : "",
    segmentationMasters: MS_IDS.includes(selectedRule) ? selectedRule : "",
    manualBased: { createManualLead: selectedRule === MANUAL_ID },
  })

  const getSelectedRuleMeta = () => {
    const match = ALL_RULES.find(r => r.id === selectedRule)
    const ruleCode = match?.raw?.code || ""
    return { ruleCode }
  }

  // helpers
  const labelsFromValues = (vals = []) =>
    (Array.isArray(vals) ? vals : []).map(v => catOptions.find(o => o.value === v)?.label || v)

  const daysBetween = (start, end) => {
    if (!start || !end) return ""
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s) || isNaN(e)) return ""
    const ms = e.getTime() - s.getTime()
    if (ms < 0) return ""
    const d = Math.ceil(ms / (1000 * 60 * 60 * 24))
    return String(d)
  }

  const toDMY = (ymd) => {
    if (!ymd) return ""
    const [y, m, d] = (ymd || "").split("-")
    if (!y || !m || !d) return ""
    return `${d}/${m}/${y}`
  }
  const safeDMY = (ymd) => (ymd ? toDMY(ymd) : "")

  const computeWindowDays = ({ fetchType, windowSelect, fromDate, toDate, customDays }) => {
    const ft = String(fetchType || "")
    const ws = String(windowSelect || "")
    if (ft === "1") {
      // STATIC — we won’t compute here for R3 static (we use 9999),
      // but R1 static uses range days:
      return daysBetween(fromDate, toDate) || ""
    }
    if (isCustom(ws)) return "" // handled via customDays fields
    if (isRange(ws)) return daysBetween(fromDate, toDate) || ""
    return numericDays(ws)
  }

  // Build EXACT API payload
  const buildApiPayload = (/* isDraftNum, */ campaignDates) => {
    const { ruleCode } = getSelectedRuleMeta()
    const v = ruleValues[selectedRule] || {}

    const base = {
      request: "save",          // <— always "save"
      oppCode: "",
      oppName: opportunityName.trim(),
      ruleCode,
      xvalue: "",
      yvalue: "",
      zValue: "",
      pvalue: "",
      ruleDetails: JSON.stringify({ id: selectedRule, vals: v }), // overridden per R3/R4 later if needed
      ruleZFromDate: "",
      ruleZToDate: "",
      isDraft: "1",             // <— always "1"
      ruleDays: "",
      ruleType: v.fetchType ? String(v.fetchType) : "",
      ruleYFromDate: "",
      ruleYToDate: "",
      staticFromDate: "",
      staticToDate: "",
      ruleFetchType: v.fetchType ? String(v.fetchType) : "",
      ruleCustomDays: "",
      customFromDate: "",
      customToDate: "",
      campStartDate: safeDMY(campaignDates?.startDate),
      campEndDate:   safeDMY(campaignDates?.endDate),
      noShowDays: "",
      noShowCustomDays: "",
      cancelDays: "",
      cancelCustomDays: "",
      customerSpecialDays: "",
      customerType: ""
    }

    switch (selectedRule) {
      case "paidForXButNotY": { // R1
        base.xvalue = labelsFromValues(v.categoryX).join(",")
        base.yvalue = labelsFromValues(v.categoryY).join(",")

        base.ruleDays = computeWindowDays({
          fetchType: v.fetchType,
          windowSelect: v.categoryWindow,
          fromDate: v.fromDate,
          toDate: v.toDate,
          customDays: v.customDays
        })

        if (isCustom(v.categoryWindow)) base.ruleCustomDays = String(v.customDays || "")
        if (String(v.fetchType) === "2" && isRange(v.categoryWindow)) {
          base.customFromDate = safeDMY(v.fromDate)
          base.customToDate   = safeDMY(v.toDate)
        }
        if (String(v.fetchType) === "1") {
          base.staticFromDate = safeDMY(v.fromDate)
          base.staticToDate   = safeDMY(v.toDate)
        }
        break
      }

      case "paidForXCategoryInYDays": { // R2
        base.xvalue = labelsFromValues(v.categoryX).join(",")
        base.pvalue = labelsFromValues(v.categoryP).join(",")

        const yDays = daysBetween(v.fromDate1, v.toDate1)
        base.ruleDays = yDays || ""
        base.zValue   = String(v.zDays || "")

        base.ruleYFromDate = safeDMY(v.fromDate1)
        base.ruleYToDate   = safeDMY(v.toDate1)
        base.ruleZFromDate = safeDMY(v.fromDate2)
        base.ruleZToDate   = safeDMY(v.toDate2)
        break
      }

      case "noShowAppointment": { // R3
  const nDays = computeNoShowDays(v);          // always "9999" for static, else a number string
  base.noShowDays = nDays;
  base.noShowCustomDays = "";                  // your Swagger samples leave this empty
  // Dates: samples show them empty for R3; keep them blank:
  base.staticFromDate = "";
  base.staticToDate   = "";
  base.customFromDate = "";
  base.customToDate   = "";
  // Plain-text ruleDetails per your screenshots
  base.ruleDetails = `No show for ${nDays} days`;
  break;
}

      case "cancelledAppointment": { // R4
        // Allow cancelDays and allow staticFrom/To even if ruleType = "2"
        const cDays =
          String(v.fetchType) === "1"
            ? (daysBetween(v.fromDate, v.toDate) || "")
            : (String(v.customDays || "") || numericDays(v.windowType) || (isRange(v.windowType) ? daysBetween(v.fromDate, v.toDate) : ""))

        base.cancelDays = cDays
        base.cancelCustomDays = (String(v.fetchType) === "2" && isCustom(v.windowType)) ? String(v.customDays || "") : ""

        // Your sample shows static dates even with ruleType "2":
        base.staticFromDate = base.campStartDate
        base.staticToDate   = base.campEndDate


        // Keep custom range empty to match sample
        base.customFromDate = ""
        base.customToDate   = ""

        base.ruleDetails = `Cancelled appointment for ${cDays || "X"} days`
        break
      }

      case "customerSpecialDay": { // R5
        // R5 wants a numeric string in "customerSpecialDays"
        base.customerSpecialDays = String(v.dayType || "")
        base.staticFromDate = base.campStartDate
        base.staticToDate   = base.campEndDate
        base.customFromDate = ""
        base.customToDate   = ""
        base.ruleDetails = "Customer Special Day"
        break
      }

      case "customerType": { // R6
        base.customerType = v.type || ""
        break
      }

      case "manualCreateLead":
      default:
        break
    }

    // ensure any undefined become ""
    Object.keys(base).forEach(k => {
      if (base[k] === undefined || base[k] === null) base[k] = ""
    })

    return base
  }

  const postCreate = async (/* isDraftNum, */ campaignDates) => {
    const body = buildApiPayload(campaignDates)
    console.log("CreateNewOpp payload:", body)
    const res = await fetch(`${API_BASE_URL}/api/Opportunity/CreateNewOpp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })

    let data = null
    let text = ""
    try { data = await res.json() } catch (_) {
      try { text = await res.text() } catch (_) {}
    }

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || text || `HTTP ${res.status}`
      throw new Error(msg)
    }
    if (data && data.success === false) {
      throw new Error(data.message || "CreateNewOpp returned success:false")
    }
    return data || {}
  }

  // Only “Activate” flow in this screen (but posting as save/isDraft=1)
  const handleActivateClick = () => {
    setActivateErr("")
    if (!canSubmit) {
      setErrors(prev => ({
        ...prev,
        name: !opportunityName.trim() ? "Please enter an opportunity name." : "",
        rule: !selectedRule ? "Please choose one rule." : "",
        fields: selectedRule && !isRuleValid(selectedRule) ? "Please complete the required fields for the selected rule." : "",
      }))
      if (!opportunityName.trim() && nameRef.current) nameRef.current.focus()
      else if (!selectedRule && rulesRef.current) rulesRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setActivateOpen(true)
  }

  const confirmActivate = async () => {
    if (!campStart || !campEnd) {
      setActivateErr("Please select both campaign start and end dates.")
      return
    }
    if (new Date(campStart) > new Date(campEnd)) {
      setActivateErr("Start date cannot be after end date.")
      return
    }

    try {
      await postCreate({ startDate: campStart, endDate: campEnd }) // posts as request:"save", isDraft:"1"
      setActivateOpen(false)
      alert("Saved (activation-style) with request:'save' and isDraft:'1'.")
      onNext?.(buildPayload())
      navigate("/opportunity")
    } catch (e) {
      console.error(e)
      setActivateErr(e.message || "Failed to save. Please try again.")
    }
  }

  // ---------- MULTISELECT ----------
  const MultiSelect = ({
    label,
    values = [],
    onChange,
    placeholder = "None selected",
    disabledValues = []
  }) => {
    const [open, setOpen] = useState(false)
    const [q, setQ] = useState("")
    const [local, setLocal] = useState(values)

    useEffect(() => { if (open) setLocal(values) }, [open, values])

    useEffect(() => {
      const onKey = (e) => { if (e.key === "Escape") setOpen(false) }
      if (open) document.addEventListener("keydown", onKey)
      return () => document.removeEventListener("keydown", onKey)
    }, [open])

    const filtered = useMemo(() => {
      if (!q.trim()) return catOptions
      const qq = q.toLowerCase()
      return catOptions.filter(o => (o.label || "").toLowerCase().includes(qq))
    }, [q, catOptions])

    const selectableFiltered = filtered.filter(o => !disabledValues.includes(o.value))
    const allSelected = selectableFiltered.length > 0 && selectableFiltered.every(o => local.includes(o.value))

    const toggleAll = () => {
      if (allSelected) {
        const toRemove = new Set(selectableFiltered.map(o => o.value))
        setLocal(prev => prev.filter(v => !toRemove.has(v)))
      } else {
        const union = new Set(local)
        selectableFiltered.forEach(o => union.add(o.value))
        setLocal(Array.from(union))
      }
    }

    const toggleOne = (v) => {
      if (disabledValues.includes(v)) return
      setLocal(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
    }

    const closeWithCommit = (e) => {
      e.preventDefault()
      e.stopPropagation()
      onChange(local)
      setTimeout(() => setOpen(false), 0)
    }

    const shown = open ? local : values
    const buttonLabel =
      shown.length === 0
        ? placeholder
        : shown.length === 1
        ? (catOptions.find(o => o.value === shown[0])?.label ?? placeholder)
        : `${shown.length} selected`

    return (
      <div className="msel" data-msel tabIndex={0}>
        <span className="rf-label">{label}</span>
        <button
          className="msel-btn"
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen(v => !v)}
        >
          {buttonLabel}<span className="msel-caret">▾</span>
        </button>

        {open && (
          <div
            className="msel-dd"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="msel-search">
              <input
                placeholder="Search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="msel-search-input"
                onPointerDown={(e) => e.stopPropagation()}
              />
              <button className="msel-clear" type="button" onClick={() => setQ("")}>✕</button>
            </div>

            <div className="msel-row msel-selectall" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                onMouseDown={(e) => e.preventDefault()}
              />
              <span>Select all</span>
            </div>

            <div className="msel-list">
              {catLoading ? (
                <div className="msel-empty">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="msel-empty">No results</div>
              ) : (
                filtered.map(opt => {
                  const isDisabled = disabledValues.includes(opt.value)
                  const checked = local.includes(opt.value)
                  return (
                    <div
                      key={opt.value}
                      className={`msel-row ${isDisabled ? "msel-disabled" : ""}`}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <input
                        className="msel-opt"
                        data-val={opt.value}
                        type="checkbox"
                        checked={checked}
                        disabled={isDisabled}
                        onChange={() => toggleOne(opt.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>{opt.label}</span>
                    </div>
                  )
                })
              )}
            </div>

            <div className="msel-footer">
              <button
                type="button"
                className="msel-done"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={closeWithCommit}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------- Shared row: Rule Data Fetch Type ----------
  const FetchTypeRow = ({ ruleId, vals }) => (
    <div className="rf-grid" style={{ alignItems: "center", marginBottom: 8 }}>
      <label className="rf-field">
        <span className="rf-label">Segment</span>
        <select
          className="rf-input"
          value={vals.fetchType || ""}
          onChange={(e) => setField(ruleId, "fetchType", e.target.value)}
        >
          <option value="">Select</option>
          <option value="1">Static</option>
          <option value="2">Dynamic</option>
        </select>
      </label>
    </div>
  )

  // ---------- RULE FORMS ----------
  const RuleForm = ({ ruleId }) => {
    if (!ruleId) return null
    const v = ruleValues[ruleId] || {}

    switch (ruleId) {
      case "paidForXButNotY":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid">
              <MultiSelect
                label="Paid for"
                values={v.categoryX}
                onChange={(arr) => setField(ruleId, "categoryX", arr)}
              />
              <MultiSelect
                label="Category but not for"
                values={v.categoryY}
                onChange={(arr) => setField(ruleId, "categoryY", arr)}
                disabledValues={v.categoryX}
              />
              <div className="rf-grid" style={{ alignItems: "center", marginBottom: 8 }}>
                <label className="rf-field">
                  <span className="rf-label">Category for</span>
                  <select
                    className="rf-input"
                    value={v.categoryWindow}
                    onChange={(e) => {
                      const val = e.target.value
                      setField(ruleId, "categoryWindow", val)
                      if (!isCustom(val)) setField(ruleId, "customDays", "")
                      if (!isRange(val)) { setField(ruleId, "fromDate", ""); setField(ruleId, "toDate", "") }
                    }}
                    disabled={String(v.fetchType) === "1"}
                  >
                    <option value="">Select</option>
                    <option value="1">Past 1 day</option>
                    <option value="7">Past 1 Week</option>
                    <option value="30">Past 1 Month</option>
                    <option value="90">Past 3 Month</option>
                    <option value="0">Custom</option>
                    {String(v.fetchType) === "2" && <option value="9999">Date Range</option>}
                  </select>
                  <span className="rf-label">days</span>
                </label>

                {isCustom(v.categoryWindow) && (
                  <label className="rf-field">
                    <span className="rf-label">days</span>
                    <input
                      className="rf-input"
                      type="number"
                      min="1"
                      placeholder="e.g., 7"
                      value={v.customDays}
                      onChange={(e) => setField(ruleId, "customDays", e.target.value)}
                    />
                  </label>
                )}

                {isRange(v.categoryWindow) && String(v.fetchType) !== "1" && (
                  <>
                    <label className="rf-field">
                      <span className="rf-label">From Date</span>
                      <input
                        type="date"
                        className="rf-input"
                        value={v.fromDate}
                        onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                      />
                    </label>
                    <label className="rf-field">
                      <span className="rf-label">To Date</span>
                      <input
                        type="date"
                        className="rf-input"
                        value={v.toDate}
                        onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                      />
                    </label>
                  </>
                )}

                {String(v.fetchType) === "1" && (
                  <>
                    <label className="rf-field">
                      <span className="rf-label">From Date</span>
                      <input
                        type="date"
                        className="rf-input"
                        value={v.fromDate}
                        onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                      />
                    </label>
                    <label className="rf-field">
                      <span className="rf-label">To Date</span>
                      <input
                        type="date"
                        className="rf-input"
                        value={v.toDate}
                        onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          </>
        )

      case "paidForXCategoryInYDays":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid" style={{marginBottom: 10}}>
              <MultiSelect
                label="Paid for Category (X)"
                values={v.categoryX}
                onChange={(arr) => setField(ruleId, "categoryX", arr)}
              />
              <label className="rf-field">
                <span className="rf-label">From Date</span>
                <input type="date" className="rf-input" value={v.fromDate1} onChange={(e) => setField(ruleId, "fromDate1", e.target.value)} />
              </label>
              <label className="rf-field">
                <span className="rf-label">To Date</span>
                <input type="date" className="rf-input" value={v.toDate1} onChange={(e) => setField(ruleId, "toDate1", e.target.value)} />
              </label>
              <label className="rf-field">
                <span className="rf-label">Z Days</span>
                <input
                  type="number"
                  min="1"
                  className="rf-input"
                  value={v.zDays}
                  onChange={(e) => setField(ruleId, "zDays", e.target.value)}
                  placeholder="e.g., 14"
                />
              </label>
              <span className="rf-inline-note">No future appointment window</span>
            </div>

            <div className="rf-grid">
              <label className="rf-field">
                <span className="rf-label">From Date</span>
                <input type="date" className="rf-input" value={v.fromDate2} onChange={(e) => setField(ruleId, "fromDate2", e.target.value)} />
              </label>
              <label className="rf-field">
                <span className="rf-label">To Date</span>
                <input type="date" className="rf-input" value={v.toDate2} onChange={(e) => setField(ruleId, "toDate2", e.target.value)} />
              </label>
              <MultiSelect
                label="Category (P)"
                values={v.categoryP}
                onChange={(arr) => setField(ruleId, "categoryP", arr)}
              />
            </div>
          </>
        )

      case "noShowAppointment":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid" style={{ alignItems: "center" }}>
              <label className="rf-field">
                <span className="rf-label">No show appointment for</span>
                <select
                  className="rf-input"
                  value={v.windowType}
                  onChange={(e) => {
                    const t = e.target.value
                    setField(ruleId, "windowType", t)
                    if (!isCustom(t)) setField(ruleId, "customDays", "")
                    if (!isRange(t)) { setField(ruleId, "fromDate", ""); setField(ruleId, "toDate", "") }
                  }}
                  disabled={String(v.fetchType) === "1"}
                >
                  <option value="">Select</option>
                  <option value="1">Past 1 day</option>
                  <option value="7">Past 1 Week</option>
                  <option value="30">Past 1 Month</option>
                  <option value="90">Past 3 Month</option>
                  <option value="0">Custom</option>
                  {String(v.fetchType) === "2" && <option value="9999">Date Range</option>}
                </select>
              </label>

              {isCustom(v.windowType) && (
                <>
                  <span className="rf-label">days</span>
                  <input
                    className="rf-input"
                    type="number"
                    min="1"
                    placeholder="e.g., 7"
                    value={v.customDays}
                    onChange={(e) => setField(ruleId, "customDays", e.target.value)}
                  />
                </>
              )}

              {isRange(v.windowType) && String(v.fetchType) !== "1" && (
                <>
                  <label className="rf-field">
                    <span className="rf-label">From</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.fromDate}
                      onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                    />
                  </label>
                  <label className="rf-field">
                    <span className="rf-label">To</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.toDate}
                      onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                    />
                  </label>
                </>
              )}

              {String(v.fetchType) === "1" && (
                <>
                  <label className="rf-field">
                    <span className="rf-label">From Date</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.fromDate}
                      onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                    />
                  </label>
                  <label className="rf-field">
                    <span className="rf-label">To Date</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.toDate}
                      onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>
          </>
        )

      case "cancelledAppointment":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid" style={{ alignItems: "center" }}>
              <label className="rf-field">
                <span className="rf-label">Cancelled appointment for</span>
                <select
                  className="rf-input"
                  value={v.windowType}
                  onChange={(e) => {
                    const t = e.target.value
                    setField(ruleId, "windowType", t)
                    if (!isCustom(t)) setField(ruleId, "customDays", "")
                    if (!isRange(t)) { setField(ruleId, "fromDate", ""); setField(ruleId, "toDate", "") }
                  }}
                  disabled={String(v.fetchType) === "1"}
                >
                  <option value="">Select</option>
                  <option value="1">Past 1 day</option>
                  <option value="7">Past 1 Week</option>
                  <option value="30">Past 1 Month</option>
                  <option value="90">Past 3 Month</option>
                  <option value="0">Custom</option>
                  {String(v.fetchType) === "2" && <option value="9999">Date Range</option>}
                </select>
              </label>

              {isCustom(v.windowType) && (
                <>
                  <span className="rf-label">days</span>
                  <input
                    className="rf-input"
                    type="number"
                    min="1"
                    placeholder="e.g., 7"
                    value={v.customDays}
                    onChange={(e) => setField(ruleId, "customDays", e.target.value)}
                  />
                </>
              )}

              {isRange(v.windowType) && String(v.fetchType) !== "1" && (
                <>
                  <label className="rf-field">
                    <span className="rf-label">From</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.fromDate}
                      onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                    />
                  </label>
                  <label className="rf-field">
                    <span className="rf-label">To</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.toDate}
                      onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                    />
                  </label>
                </>
              )}

              {String(v.fetchType) === "1" && (
                <>
                  <label className="rf-field">
                    <span className="rf-label">From Date</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.fromDate}
                      onChange={(e) => setField(ruleId, "fromDate", e.target.value)}
                    />
                  </label>
                  <label className="rf-field">
                    <span className="rf-label">To Date</span>
                    <input
                      type="date"
                      className="rf-input"
                      value={v.toDate}
                      onChange={(e) => setField(ruleId, "toDate", e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>
          </>
        )

      case "customerSpecialDay":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid">
              <label className="rf-field">
                <span className="rf-label">Days</span>
                <input
                  type="number"
                  min="1"
                  className="rf-input"
                  value={v.dayType}
                  onChange={(e) => setField(ruleId, "dayType", e.target.value)}
                  placeholder="e.g., 30"
                />
              </label>
              <label className="rf-field">
                <span className="rf-label">From Date</span>
                <input type="date" className="rf-input" value={v.fromDate} onChange={(e) => setField(ruleId, "fromDate", e.target.value)} />
              </label>
              <label className="rf-field">
                <span className="rf-label">To Date</span>
                <input type="date" className="rf-input" value={v.toDate} onChange={(e) => setField(ruleId, "toDate", e.target.value)} />
              </label>
            </div>
          </>
        )

      case "customerType":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
            <div className="rf-grid">
              <label className="rf-field">
                <span className="rf-label">Customer type</span>
                <select className="rf-input" value={v.type} onChange={(e) => setField(ruleId, "type", e.target.value)}>
                  <option value="">Select</option>
                  <option value="New">New</option>
                  <option value="Existing">Existing</option>
                </select>
              </label>
            </div>
          </>
        )

      case "manualCreateLead":
        return (
          <>
            <FetchTypeRow ruleId={ruleId} vals={v} />
          </>
        )

      default:
        return null
    }
  }

  return (
    <>
      <style jsx>{`
        .wrap { min-height: 100vh; padding: 16px 16px 80px; }
        .hdr { margin-bottom: 16px; }
        .ttl { font-size: 22px; font-weight: 700; margin: 0 0 20px; color: #1f2937; }
        .crumb { color: #6b7280; font-size: 13px; }
        .crumb span { cursor: pointer; text-decoration: underline; }

        .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .row { margin-bottom: 12px; }
        .label { font-weight: 600; color: #374151; margin-bottom: 6px; display: inline-block; }
        .input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .input:focus { outline: none; border-color: #334b71; box-shadow: 0 0 0 3px rgba(51,75,113,.15); }

        .banner { display:flex; align-items:flex-start; gap:10px; margin:14px 0; padding:10px 12px; background:#eef6ff; border:1px solid #c7e1ff; color:#0f3566; border-radius:8px; font-size:13px; }
        .i { width:16px; height:16px; border-radius:50%; border:1px solid #9cc6ff; display:inline-flex; align-items:center; justify-content:center; font-weight:700; }
        .clear { margin-left:auto; font-size:12px; color:#334b71; text-decoration:underline; cursor:pointer; }

        .section { padding:0; border: 1px solid #e5e7eb; border-radius: 10px; margin-top: 14px; overflow: hidden; }
        .s-head { background:#f9fafb; border-bottom:1px solid #e5e7eb; padding: 10px 14px; font-weight:700; color:#111827; }
        .s-body { padding: 14px; }

        .cards { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        @media (max-width: 900px) { .cards { grid-template-columns: 1fr; } }

        .card { position:relative; border:1px solid #e5e7eb; border-radius:10px; padding:12px 12px 12px 44px; cursor:pointer; background:#fff; transition: border-color .15s, box-shadow .15s; }
        .card:hover { border-color:#cbd5e1; }
        .card:focus-within { border-color:#334b71; box-shadow:0 0 0 3px rgba(51,75,113,.15); }
        .selected { border-color:#334b71; box-shadow:0 0 0 3px rgba(51,75,113,.12); }
        .dot { position:absolute; left:12px; top:12px; width:18px; height:18px; border-radius:50%; border:2px solid #9ca3af; }
        .selected .dot { border-color:#334b71; box-shadow: inset 0 0 0 4px #334b71; }
        .ctitle { font-weight:600; color:#111827; font-size:14px; }
        .cdesc { font-size:12px; color:#4b5563; margin-top:2px; }
        .help { margin-left:6px; font-size:12px; border:1px solid #d1d5db; border-radius:50%; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; cursor:help; }

        .rf { font-size: 16px; margin-top: 14px; border:1px dashed #d1d5db; border-radius:10px; padding:14px; background:#fcfcff; }
        .rf-title { font-weight:700; color:#111827; margin-bottom:15px; }
        .rf-grid { display:flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .rf-field { display:flex; align-items: center; gap:6px; }
        .rf-label { font-size:12px; color:#374151; }
        .rf-input { padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; }
        .rf-input:focus { outline:none; border-color:#334b71; box-shadow: 0 0 0 3px rgba(51,75,113,.15); }
        .rf-inline-note { margin:8px 0; font-size:13px; color:#4b5563; }

        .err { color:#b91c1c; font-size:12px; margin-top:6px; }
        .actions { margin-top: 16px; display:flex; gap:10px; justify-content:flex-end; }
        .btn { padding:10px 18px; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
        .back { background:#6b7280; color:#fff; }
        .save { background:#334b71; color:#fff; opacity:1; }
        .save[disabled] { opacity:.5; cursor:not-allowed; }

        /* MultiSelect */
        .msel { position: relative; display:flex; align-items:center; gap:8px; }
        .msel-btn { padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; background:#fff; cursor:pointer; min-width:220px; text-align:left; }
        .msel-btn:focus { outline:none; border-color:#334b71; box-shadow:0 0 0 3px rgba(51,75,113,.15); }
        .msel-caret { float:right; }
        .msel-dd { position:absolute; z-index:9999; top:100%; left:0; margin-top:6px; width:320px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,.12); padding:8px; max-height:360px; overflow:hidden; display:flex; flex-direction:column; }
        .msel-search { display:flex; gap:6px; padding:6px; border-bottom:1px solid #eee; }
        .msel-search-input { flex:1; border:1px solid #d1d5db; border-radius:6px; padding:8px; }
        .msel-clear { border:1px solid #d1d5db; background:#fff; border-radius:6px; padding:0 8px; }
        .msel-row { display:flex; gap:8px; align-items:center; padding:6px 8px; }
        .msel-selectall { font-weight:600; }
        .msel-list { overflow:auto; max-height:220px; padding-right:4px; }
        .msel-empty { padding:10px; color:#6b7280; }
        .msel-disabled { opacity:0.5; cursor:not-allowed; }
        .msel-footer { border-top:1px solid #eee; padding:8px; display:flex; justify-content:flex-end; }
        .msel-done { padding:6px 10px; border:1px solid #d1d5db; background:#fff; border-radius:6px; cursor:pointer; font-size:12px; }
        .msel-done:focus { outline:none; border-color:#334b71; box-shadow:0 0 0 3px rgba(51,75,113,.15); }

        /* Activate Modal */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 99999; }
        .modal { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.16); padding: 16px; width: 100%; max-width: 420px; }
        .modal-title { font-weight: 700; color: #111827; margin-bottom: 12px; font-size: 16px; }
        .modal-row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
        .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top: 8px; }
        .modal-err { color:#b91c1c; font-size:12px; margin-top:4px; }
      `}</style>

      <div className="wrap">
        <div className="hdr">
          <h1 className="ttl">Opportunity</h1>
          <div className="crumb">
            <span onClick={() => navigate(-1)}>Opportunity</span> &nbsp;&gt;&nbsp; {mode === "create" ? "Create" : "Details"}
          </div>
        </div>

        <div className="panel">
          <div className="row">
            <label className="label" htmlFor="oppName">Opportunity Name</label>
            <input
              id="oppName"
              className="input"
              value={opportunityName}
              onChange={(e) => { setOpportunityName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: "" })) }}
              ref={nameRef}
              placeholder="Enter opportunity name"
            />
            {errors.name ? <div className="err">{errors.name}</div> : null}
          </div>

          <div className="banner">
            <span className="i">i</span>
            <span><strong>Choose exactly one rule</strong> below. The form for that rule will appear inline.</span>
            {selectedRule ? <span className="clear" onClick={clearSelection}>Clear selection</span> : null}
          </div>

          {/* RULE SELECTION */}
          <div ref={rulesRef}>
            <div className="section">
              <div className="s-head">+ Segmentation Based on Transaction</div>
              <div className="s-body">
                {rulesLoading && transactionRules.length === 0 ? (
                  <div className="banner"><span className="i">i</span> Loading transaction rules…</div>
                ) : (
                  <div className="cards" role="radiogroup" aria-label="Transaction rules">
                    {transactionRules.map(r => {
                      const sel = selectedRule === r.id
                      return (
                        <label
                          key={r.id}
                          className={`card ${sel ? "selected" : ""}`}
                          htmlFor={`rule-${r.id}`}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRule(r.id) } }}
                        >
                          <input id={`rule-${r.id}`} className="sr" type="radio" name="globalRule" checked={sel} onChange={() => selectRule(r.id)} style={{ position: "absolute", opacity: 0 }} />
                          <span className="dot" aria-hidden="true" />
                          <div className="ctitle">
                            {r.title} {r.help ? <span className="help" title={r.help}>i</span> : null}
                          </div>
                          <div className="cdesc">{r.desc}</div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="section">
              <div className="s-head">+ Segmentation Based on Masters</div>
              <div className="s-body">
                {rulesLoading && masterRules.length === 0 ? (
                  <div className="banner"><span className="i">i</span> Loading master rules…</div>
                ) : (
                  <div className="cards" role="radiogroup" aria-label="Master rules">
                    {masterRules.map(r => {
                      const sel = selectedRule === r.id
                      return (
                        <label
                          key={r.id}
                          className={`card ${sel ? "selected" : ""}`}
                          htmlFor={`rule-${r.id}`}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRule(r.id) } }}
                        >
                          <input id={`rule-${r.id}`} className="sr" type="radio" name="globalRule" checked={sel} onChange={() => selectRule(r.id)} style={{ position: "absolute", opacity: 0 }} />
                          <span className="dot" aria-hidden="true" />
                          <div className="ctitle">{r.title}</div>
                          <div className="cdesc">{r.desc}</div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="section">
              <div className="s-head">+ Manual Based:</div>
              <div className="s-body">
                <div className="cards" role="radiogroup" aria-label="Manual rules">
                  {manualRules.map(r => {
                    const sel = selectedRule === r.id
                    return (
                      <label
                        key={r.id}
                        className={`card ${sel ? "selected" : ""}`}
                        htmlFor={`rule-${r.id}`}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRule(r.id) } }}
                      >
                        <input id={`rule-${r.id}`} className="sr" type="radio" name="globalRule" checked={sel} onChange={() => selectRule(r.id)} style={{ position: "absolute", opacity: 0 }} />
                        <span className="dot" aria-hidden="true" />
                        <div className="ctitle">{r.title}</div>
                        <div className="cdesc">{r.desc}</div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* INLINE RULE FORM */}
          {selectedRule ? (
            <div className="rf" aria-live="polite" ref={formRef}>
              <div className="rf-title">
                Selected Rule:&nbsp;
                {ALL_RULES.find(r => r.id === selectedRule)?.title || selectedRule}
              </div>
              <RuleForm ruleId={selectedRule} />
              {errors.fields ? <div className="err">{errors.fields}</div> : null}
            </div>
          ) : null}

          {/* Actions */}
          <div className="actions">
            <button className="btn back" type="button" onClick={onBack}>Back</button>
            <button className="btn save" type="button" onClick={handleActivateClick} disabled={!canSubmit}>Activate</button>
          </div>
        </div>
      </div>

      {/* Activate Modal (posts as save/isDraft=1) */}
      {activateOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-title">Set Campaign Dates</div>
            <div className="modal-row">
              <label className="rf-field" style={{flex: 1}}>
                <span className="rf-label">Start Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={campStart}
                  onChange={(e) => { setCampStart(e.target.value); setActivateErr("") }}
                />
              </label>
              <label className="rf-field" style={{flex: 1}}>
                <span className="rf-label">End Date</span>
                <input
                  type="date"
                  className="rf-input"
                  value={campEnd}
                  onChange={(e) => { setCampEnd(e.target.value); setActivateErr("") }}
                />
              </label>
            </div>
            {activateErr ? <div className="modal-err">{activateErr}</div> : null}
            <div className="modal-actions">
              <button className="btn back" type="button" onClick={() => setActivateOpen(false)}>Cancel</button>
              <button className="btn save" type="button" onClick={confirmActivate}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default OpportunityForm
