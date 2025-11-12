"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/* ===========================
   Utils
   =========================== */
const norm = (s) => (s ?? "").toString().trim();

// Normalize to YYYY-MM-DD from ISO or DD-MM-YYYY
function toISODateOnly(s) {
  const t = norm(s);
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const d = new Date(t);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}
const atStartOfDayZ = (dateISO) => (dateISO ? `${dateISO}T00:00:00Z` : "");
const atEndOfDayZ   = (dateISO) => (dateISO ? `${dateISO}T23:59:59Z` : "");
const pick = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v) !== "") return v;
  }
  return fallback;
};

/* ===========================
   SearchableDropdown
   =========================== */
function SearchableDropdown({
  options, value, onChange,
  placeholder = "None selected",
  multiple = false, disabled = false,
  width = "100%", maxMenuHeight = 280,
  showSelectAll = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = norm(query).toLowerCase();
    if (!q) return options;
    return options.filter((o) => norm(o.label).toLowerCase().includes(q));
  }, [options, query]);

  const isSelected = (val) => (multiple ? Array.isArray(value) && value.includes(val) : value === val);

  const displayText = useMemo(() => {
    if (multiple) {
      const vals = Array.isArray(value) ? value : [];
      if (!vals.length) return placeholder;
      const labels = vals
        .map((v) => options.find((o) => o.value === v)?.label || v)
        .filter(Boolean);
      return labels.join(", ");
    } else {
      if (!value) return placeholder;
      return options.find((o) => o.value === value)?.label || value;
    }
  }, [value, options, multiple, placeholder]);

  const toggleItem = (val) => {
    if (multiple) {
      const arr = Array.isArray(value) ? [...value] : [];
      const idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(val);
      onChange(arr);
    } else {
      onChange(val);
      setOpen(false);
    }
  };

  const clearSearch = () => setQuery("");

  const allSelected =
    multiple &&
    Array.isArray(value) &&
    filtered.length > 0 &&
    filtered.every((o) => value.includes(o.value));

  const toggleSelectAll = () => {
    if (!multiple) return;
    const arr = Array.isArray(value) ? [...value] : [];
    if (allSelected) {
      onChange(arr.filter((v) => !filtered.some((o) => o.value === v)));
    } else {
      const union = new Set(arr);
      filtered.forEach((o) => union.add(o.value));
      onChange(Array.from(union));
    }
  };

  return (
    <div className={`dd-wrap ${disabled ? "disabled" : ""}`} style={{ width }} ref={wrapRef}>
      <button
        type="button"
        className="dd-input"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`dd-text ${displayText === placeholder ? "muted" : ""}`}>
          {displayText}
        </span>
        <span className="dd-caret">▾</span>
      </button>

      {open && (
        <div className="dd-menu" style={{ maxHeight: maxMenuHeight }}>
          <div className="dd-search">
            <span className="ico">🔍</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
            {query && (
              <button className="clear" onClick={clearSearch} aria-label="Clear search">×</button>
            )}
          </div>

          {multiple && showSelectAll && (
            <label className="dd-option select-all">
              <input type="checkbox" checked={!!allSelected} onChange={toggleSelectAll} />
              <span>Select all</span>
            </label>
          )}

          <div className="dd-list" role="listbox" aria-multiselectable={multiple}>
            {filtered.map((o) => (
              <label key={o.value} className="dd-option">
                <input
                  type="checkbox"
                  checked={!!isSelected(o.value)}
                  onChange={() => toggleItem(o.value)}
                />
                <span>{o.label}</span>
              </label>
            ))}
            {!filtered.length && <div className="dd-empty">No matches</div>}
          </div>
        </div>
      )}

      <style jsx>{`
        .dd-wrap { position: relative; }
        .dd-wrap.disabled { opacity: .6; pointer-events: none; }
        .dd-input {
          width: 100%; height: 36px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
          background: #fff; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; cursor: pointer;
        }
        .dd-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dd-text.muted { color: #98a1b3; }
        .dd-caret { color: #5a6270; font-size: 12px; }
        .dd-menu {
          position: absolute; left: 0; right: 0; z-index: 30; background: #fff;
          border: 1px solid #e6ebf2; box-shadow: 0 8px 26px rgba(0,0,0,.08); border-radius: 8px; margin-top: 6px; overflow: auto; width: 280px;
        }
        .dd-search {
          display: grid; grid-template-columns: 20px 1fr 22px; align-items: center; gap: 6px;
          padding: 8px 10px; border-bottom: 1px solid #eef1f6;
        }
        .dd-search input { height: 28px; border: 1px solid #e3e8f1; border-radius: 6px; padding: 0 8px; outline: none; }
        .dd-search .ico { text-align: center; color: #7a8599; }
        .dd-search .clear { background: none; border: none; font-size: 18px; line-height: 1; color: #7a8599; cursor: pointer; }
        .dd-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; user-select: none; }
        .dd-option + .dd-option { border-top: 1px solid #f6f7fb; }
        .dd-option:hover { background: #f7f9fc; }
        .dd-option input { width: 16px; height: 16px; }
        .dd-empty { padding: 12px; color: #8a94a7; text-align: center; }
        .select-all { font-weight: 700; }
      `}</style>
    </div>
  );
}

/* ===========================
   Page: Opportunity Detailed Report
   =========================== */
const OPP_DETAIL_ENDPOINT = `${API_BASE_URL}/api/Opportunity/OppDetailReport`;

export default function OpportunityDetailedReport() {
  const navigate = useNavigate();
  const { state } = useLocation() || {};

  // dates
  const [fromDate, setFromDate] = useState(toISODateOnly(state?.fromDate) || "");
  const [toDate, setToDate]     = useState(toISODateOnly(state?.toDate)   || "");

  // filters (as requested)
  const [campaignStatusCode, setCampaignStatusCode] = useState(""); // "1" | "2"
  const [oppRuleCode, setOppRuleCode] = useState("");               // "R1".."R7"
  const [clinicCode, setClinicCode] = useState(state?.clinic ? norm(state.clinic) : "");
  const [oppNames, setOppNames] = useState(
    Array.isArray(state?.oppNames) ? state.oppNames.map(norm) :
    state?.oppName ? [norm(state.oppName)] : []
  );

  // options
  const campaignStatusOptions = [
    { value: "1", label: "Active" },
    { value: "2", label: "Expired" },
  ];
  const oppRuleOptions = [
    { value: "R1", label: "Paid for X but not for Y" },
    { value: "R2", label: "Paid for X Category in Y days and No future appointment in Z days for Category P" },
    { value: "R3", label: "No show appointment for X days" },
    { value: "R4", label: "Cancelled appointment for X days" },
    { value: "R5", label: "Manual Lead" },
    { value: "R6", label: "Customer Special Day" },
    { value: "R7", label: "Customer Type" },
  ];
  const [clinics, setClinics] = useState([]);           // [{value,label}]
  const [oppNameOptions, setOppNameOptions] = useState([]); // [{value,label}]

  // table
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  const showToast = (message, type = "error", ms = 2200) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  /* ---- Load masters only (NO data fetch on mount) ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Clinics
        try {
          const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" });
          const d = await r.json();
          const list = (Array.isArray(d) ? d : d ? [d] : []).map((x) => ({
            value: x.code ?? x.centerCode ?? norm(x.name),
            label: x.name ?? x.centerName ?? (x.code ?? ""),
          }));
          setClinics(list);
          if (clinicCode && !list.some(o => o.value === clinicCode)) {
            setClinicCode("");
          }
        } catch { setClinics([]); }

      } catch (e) {
        console.error(e);
        showToast("Failed to load filters");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Fetch report (only on View) ---- */
  const loadDetailed = async () => {
    setLoading(true);
    setPage(1);
    try {
      // Use "0" when both dates provided (as per your swagger/cURL)
      const df = toISODateOnly(fromDate) && toISODateOnly(toDate) ? "0" : "";

      const body = {
        fromDate: atStartOfDayZ(toISODateOnly(fromDate)),
        toDate:   atEndOfDayZ(toISODateOnly(toDate)),
        oppStatus: campaignStatusCode || "",      // "1" | "2"
        clinicCode: clinicCode || "",
        oppRule: oppRuleCode || "",               // "R1".."R7"
        oppName: (oppNames || []).join(","),      // CSV
        dateFlag: df,
      };

      const r = await fetch(OPP_DETAIL_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const arr = Array.isArray(d) ? d : d ? [d] : [];

      const normalized = arr.map((x, i) => {
        const fmt = (s) => {
          const iso = toISODateOnly(s);
          if (!iso) return "";
          const d = new Date(iso);
          return isNaN(d)
            ? ""
            : new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(d);
        };

        const fromRaw    = pick(x, ["fromDate", "campaignFromDate"]);
        const toRaw      = pick(x, ["toDate", "campaignToDate"]);
        const createdRaw = pick(x, ["createdDate", "createdOn"]);

        const yesNo = (v) => {
          const s = String(v ?? "").toLowerCase();
          if (["1", "true", "y", "yes"].includes(s)) return "YES";
          if (["0", "false", "n", "no"].includes(s)) return "NO";
          return s ? "YES" : "NO";
        };

        return {
          key:           pick(x, ["oppCode", "opportunityCode", "code", "id"], `row-${i}`),
          oppCode:       pick(x, ["oppCode", "opportunityCode", "code"]),
          fromDate:      fmt(fromRaw),
          toDate:        fmt(toRaw),
          createdDate:   fmt(createdRaw),

          // Lead fields (best-effort mapping)
          leadId:        pick(x, ["leadId", "leadID", "leadCode", "customerId", "custId", "id"]),
          leadName:      pick(x, ["leadName", "customerName", "custName", "name"]),

          oppName:       pick(x, ["oppName", "opportunityName", "nameOfOpp"]),
          campaignStatus:pick(x, ["campaignStatus", "campaignState", "statusCampaign"]),
          converted:     yesNo(pick(x, ["converted", "isConverted"])),
          oppStatus:     pick(x, ["statusName", "oppStatus", "status"]),
          createdBy:     pick(x, ["createdByName", "createdBy", "ownerName"]),
          closedBy:      pick(x, ["closedByName", "closedBy"]),
          wip:           yesNo(pick(x, ["wip", "isWip"])),
          clinic:        pick(x, ["centerName", "clinicName", "center"]),
        };
      });

      setRows(normalized);

      // Rebuild Opp Name options from results
      const uniqOppNames = Array.from(
        new Map(
          normalized
            .filter(r => norm(r.oppName))
            .map(r => [norm(r.oppName), { value: norm(r.oppName), label: norm(r.oppName) }])
        ).values()
      ).sort((a,b) => a.label.localeCompare(b.label));
      setOppNameOptions(uniqOppNames);

      // Keep only selected names that still exist
      if (oppNames?.length) {
        const allowed = new Set(uniqOppNames.map(o => o.value));
        setOppNames(oppNames.filter(v => allowed.has(v)));
      }

    } catch (e) {
      console.error(e);
      showToast("Failed to load opportunity report");
      setRows([]);
      setOppNameOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Click to open a row
  function onClickOpp(code) {
    if (!code) return;
    navigate(`/opportunity/view/${encodeURIComponent(code)}`, { state: { from: "opp-detail" } });
  }

  /* ===========================
     Export to Excel (.xlsx)
     =========================== */
  async function exportExcel() {
    if (!rows.length) return;

    const headers = [
      "From Date","To Date","Created Date","Lead ID","Lead Name","OppName",
      "Campaign Status","Converted","OppStatus","Created By","Closed By","WIP","Clinic",
    ];

    const aoa = [headers, ...rows.map(r => [
      r.fromDate, r.toDate, r.createdDate, r.leadId ?? "", r.leadName ?? "", r.oppName ?? "",
      r.campaignStatus ?? "", r.converted ?? "", r.oppStatus ?? "",
      r.createdBy ?? "", r.closedBy ?? "", r.wip ?? "", r.clinic ?? "",
    ])];

    const XLSX = (await import("xlsx")).default || (await import("xlsx"));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // autosize columns
    const colWidths = headers.map((h, idx) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(r => String([
          r.fromDate, r.toDate, r.createdDate, r.leadId, r.leadName, r.oppName,
          r.campaignStatus, r.converted, r.oppStatus, r.createdBy, r.closedBy, r.wip, r.clinic
        ][idx] ?? "").length)
      );
      return { wch: Math.min(Math.max(12, maxLen + 2), 40) };
    });
    ws["!cols"] = colWidths;

    // enable autofilter on header
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: aoa.length - 1, c: headers.length - 1 },
      }),
    };

    XLSX.utils.book_append_sheet(wb, ws, "Opportunity Detail");
    const fname = `Opportunity_Detailed_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  return (
    <div className="wrap">
      <h1 className="title">Opportunity Detail Report</h1>
      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("/")}>DashBoard</span>
        <span className="sep"> &gt; </span>
        <span className="crumb-dim">Opportunity Detail</span>
      </div>

      <div className="filters">
        <div className="grid">
          <div className="frow">
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(toISODateOnly(e.target.value))} />
          </div>

          <div className="frow">
            <label>Campaign Status</label>
            <SearchableDropdown
              options={campaignStatusOptions}
              value={campaignStatusCode}
              onChange={setCampaignStatusCode}
              placeholder="None selected"
              multiple={false}
            />
          </div>

          <div className="frow">
            <label>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(toISODateOnly(e.target.value))} />
          </div>

          <div className="frow">
            <label>Opp Rule</label>
            <SearchableDropdown
              options={oppRuleOptions}
              value={oppRuleCode}
              onChange={setOppRuleCode}
              placeholder="None selected"
              multiple={false}
            />
          </div>

          <div className="frow">
            <label>Opp Name</label>
            <SearchableDropdown
              options={oppNameOptions}
              value={oppNames}
              onChange={setOppNames}
              multiple
              placeholder="None selected"
            />
          </div>

          <div className="frow">
            <label>Clinic</label>
            <SearchableDropdown
              options={clinics}
              value={clinicCode}
              onChange={setClinicCode}
              placeholder="None selected"
              multiple={false}
            />
          </div>
        </div>

        <div className="actions">
          <button className="btn" onClick={loadDetailed} disabled={loading}>View</button>
          <button className="btn" onClick={exportExcel} disabled={!rows.length}>Export</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>From Date</th>
              <th>To Date</th>
              <th>Created Date</th>
              <th>Lead ID</th>
              <th>Lead Name</th>
              <th>OppName</th>
              <th>Campaign Status</th>
              <th>Converted</th>
              <th>OppStatus</th>
              <th>Created By</th>
              <th>Closed By</th>
              <th>WIP</th>
              <th>Clinic</th>
            </tr>
          </thead>
          <tbody>
            {loading && (<tr><td colSpan={13} className="loading">Loading…</td></tr>)}
            {!loading && !pageRows.length && (<tr><td colSpan={13} className="empty">No data</td></tr>)}
            {!loading && pageRows.map((r, idx) => (
              <tr key={`${r.key}-${idx}`}>
                <td>
                  <button className="link" onClick={() => onClickOpp(r.oppCode)}>
                    {r.fromDate}
                  </button>
                </td>
                <td>{r.toDate}</td>
                <td>{r.createdDate}</td>
                <td>{r.leadId}</td>
                <td>{r.leadName}</td>
                <td>
                  <a className="link" onClick={() => onClickOpp(r.oppCode)}>
                    {r.oppName}
                  </a>
                </td>
                <td>{r.campaignStatus}</td>
                <td>{r.converted}</td>
                <td>
                  <a className="link" onClick={() => onClickOpp(r.oppCode)}>
                    {r.oppStatus}
                  </a>
                </td>
                <td>{r.createdBy}</td>
                <td>{r.closedBy}</td>
                <td>{r.wip}</td>
                <td>{r.clinic}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pager">
          <button className="pagebtn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span className="pageno">{page}</span>
          <button className="pagebtn" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</button>
          <span className="pagecount">/ {pageCount}</span>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .title { font-size: 22px; font-weight: 700; color: #0b1f3a; margin: 0 0 6px; }
        .breadcrumb { color: #5e6a7b; margin: 18px 0; }
        .crumb-link { color: #2e5aac; cursor: pointer; }
        .crumb-dim { color: #8893a5; }
        .sep { margin: 0 6px; }

        .filters { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 16px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px 18px; }
        .frow { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 14px; font-weight: 700; color: #5a6270; }
        input[type="date"] {
          height: 36px; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; outline: none; background: #fff;
        }

        .actions { margin-top: 10px; display: flex; gap: 12px; justify-content: flex-end; }
        .btn { background: #112032; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }

        .table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 10px 0; }
        table.tbl { width: 100%; border-collapse: separate; border-spacing: 0 0; }
        .tbl thead th {
          text-align: left; font-size: 13px; color: #6c7688; font-weight: 700;
          padding: 10px 14px; border-bottom: 1px solid #eef1f6; position: sticky; top: 0; background: #fff; z-index: 1;
        }
        .tbl tbody td { font-size: 14px; color: #1b2636; padding: 12px 14px; border-bottom: 1px solid #f1f4f9; vertical-align: top; line-height: 1.35; }
        .link { background: none; border: none;  cursor: pointer; padding: 0; text-decoration: none; }
        .loading, .empty { text-align: center; color: #6b7280; padding: 18px; }

        .pager { display: flex; align-items: center; gap: 8px; justify-content: flex-end; padding: 10px 14px; }
        .pagebtn { background: #0f1f33; color: white; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
        .pageno, .pagecount { color: #4b5563; font-weight: 600; }

        .toast { position: fixed; bottom: 16px; right: 16px; color:#fff; background:#d7263d; padding:10px 14px; border-radius:8px; font-weight:600; box-shadow:0 6px 18px rgba(0,0,0,0.15); z-index:9999; }
        .toast.success { background:#138a36; }

        @media (max-width: 1100px) { .grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
