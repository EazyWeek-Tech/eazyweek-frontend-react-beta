import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json();
  return j.data ?? j;
};

// ── Brand palette ──────────────────────────────────────────────────────────────
const ROYAL_BLUE    = "#18396E";  // Legal Entity
const WARM_CORAL    = "#DD7766";  // Zone
const MIDNIGHT_NAVY = "#85A2AA";  // Centre, and text on the coral Zone node
const CONNECTOR     = "#c8d5e8";
const LINE          = 2;          // connector stroke width

// ── Node components ────────────────────────────────────────────────────────────
const LENode = ({ name }) => (
  <div style={{
    display:"inline-flex", alignItems:"center", gap:8,
    background:ROYAL_BLUE, color:"#fff", borderRadius:10,
    padding:"10px 20px", fontWeight:800, fontSize:13,
    boxShadow:"0 4px 14px rgba(24,57,110,.25)",
  }}>
    <div>
      <div style={{ fontSize:10, opacity:0.65, textTransform:"uppercase", letterSpacing:1 }}>Legal Entity</div>
      <div>{name}</div>
    </div>
  </div>
);

const ZoneNode = ({ name }) => (
  <div style={{
    display:"inline-flex", alignItems:"center", gap:8,
    background:WARM_CORAL, color:MIDNIGHT_NAVY,
    border:"1px solid rgba(5,34,76,.18)", borderRadius:10,
    padding:"8px 16px", fontWeight:700, fontSize:13, whiteSpace:"nowrap",
    boxShadow:"0 2px 8px rgba(5,34,76,.14)",
  }}>
    <div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,.6)", textTransform:"uppercase", textAlign:"center", letterSpacing:1 }}>Zone</div>
      <div style={{ color:"#fff" }}>{name}</div>
    </div>
  </div>
);

const CentreNode = ({ name }) => (
  <div style={{
    display:"inline-flex", alignItems:"center", gap:8,
    background:MIDNIGHT_NAVY, color:"#fff", borderRadius:10,
    padding:"7px 14px", fontWeight:600, fontSize:12, whiteSpace:"nowrap",
    boxShadow:"0 1px 4px rgba(5,34,76,.22)",
  }}>
    <div>
      <div style={{ fontSize:9, color:"rgba(255,255,255,.6)", textTransform:"uppercase", textAlign:"center", letterSpacing:1 }}>Centre</div>
      <div style={{ color:"#fff" }}>{name}</div>
    </div>
  </div>
);

// ── Connectors ─────────────────────────────────────────────────────────────────

// Plain vertical drop, centred in its flex column
const VLine = ({ height = 24 }) => (
  <div style={{ width:LINE, height, background:CONNECTOR, flexShrink:0 }} />
);

/**
 * Renders each child in its own column beneath a single continuous horizontal bus.
 *
 * Per column we draw:
 *   • a horizontal segment — half-width on the first/last column, full-width in between,
 *     so the segments of adjacent columns butt together into one unbroken line
 *   • a vertical stem from the bus down to the node
 *
 * Spacing lives on an INNER wrapper (padding), never on the column itself, otherwise
 * the margin would punch a gap into the bus — which is what was happening before.
 */
const Branch = ({ children, stem = 20, gap = 16, minWidth = 0 }) => {
  const items = React.Children.toArray(children);
  const n = items.length;
  if (n === 0) return null;

  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-start", flexWrap:"nowrap" }}>
      {items.map((child, i) => (
        <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth }}>
          <div style={{ position:"relative", alignSelf:"stretch", height:stem }}>
            {n > 1 && (
              <div style={{
                position:"absolute", top:0, height:LINE, background:CONNECTOR,
                left:  i === 0     ? `calc(50% - ${LINE / 2}px)` : 0,
                right: i === n - 1 ? `calc(50% - ${LINE / 2}px)` : 0,
              }} />
            )}
            <div style={{
              position:"absolute", top:0, left:"50%", marginLeft:-LINE / 2,
              width:LINE, height:stem, background:CONNECTOR,
            }} />
          </div>
          <div style={{ padding:`0 ${gap}px` }}>{child}</div>
        </div>
      ))}
    </div>
  );
};

export default function OrgHierarchy() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    authGet(`${API_BASE_URL}/api/Settings/Hierarchy`)
      .then(d => {
        if (d?.legalEntity) setData(d);
        else setError("Unable to view hierarchy due to missing setups.");
      })
      .catch(() => setError("Unable to view hierarchy due to missing setups."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ fontFamily:"Lato,sans-serif", padding:60, textAlign:"center", color:"#64748b" }}>
      Loading hierarchy…
    </div>
  );

  if (error) return (
    <div style={{ fontFamily:"Lato,sans-serif", padding:60, textAlign:"center" }}>
      <div style={{ fontWeight:700, fontSize:15, color:"#b91c1c", marginBottom:6 }}>{error}</div>
      <div style={{ fontSize:13, color:"#64748b" }}>Please ensure at least one Legal Entity and one Centre are configured.</div>
    </div>
  );

  const zones         = data.zones         || [];
  const directCentres = data.directCentres || [];
  const hasBranches   = zones.length + directCentres.length > 0;

  return (
    <div style={{ fontFamily:"Lato,sans-serif", minHeight:"100vh", color:"#10223f" }}>
      <div style={{ maxWidth:"100%", margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:20, color:ROYAL_BLUE }}>Organisation Hierarchy</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
              Legal Entity → Zone (optional) → Centre
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display:"flex", gap:16, margin:"16px 0 28px", flexWrap:"wrap" }}>
          {[
            { label:"Legal Entity", value:1, color:ROYAL_BLUE },
            { label:"Zones",        value:data.totalZones   ?? zones.length,         color:WARM_CORAL },
            { label:"Centres",      value:data.totalCentres ?? directCentres.length, color:MIDNIGHT_NAVY },
          ].map(s => (
            <div key={s.label} style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:10,
              padding:"10px 20px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
              <div style={{ fontWeight:800, fontSize:22, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Hierarchy flowchart */}
        <div style={{ background:"#fff", padding:"36px 10px", overflowX:"auto" }}>
          <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", minWidth:"100%" }}>

            {/* Legal Entity — top */}
            <LENode name={data.legalEntity.leName} />

            {!hasBranches ? (
              <div style={{ textAlign:"center", padding:"30px 0", color:"#94a3b8", fontSize:13 }}>
                No zones or centres configured yet.
              </div>
            ) : (
              <>
                {/* Drop from the Legal Entity onto the bus */}
                <VLine height={20} />

                <Branch stem={20} gap={16} minWidth={140}>
                  {[
                    // Zones (each with its own centre branch below)
                    ...zones.map(z => (
                      <div key={`z-${z.zoneCode}`} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                        <ZoneNode name={z.zoneName} />
                        {(z.centres || []).length > 0 ? (
                          <>
                            <VLine height={16} />
                            <Branch stem={16} gap={8}>
                              {z.centres.map(c => (
                                <CentreNode key={`c-${c.centerCode}`} name={c.centreName} />
                              ))}
                            </Branch>
                          </>
                        ) : (
                          <div style={{ marginTop:12, fontSize:11, color:"#94a3b8" }}>No centres</div>
                        )}
                      </div>
                    )),
                    // Centres attached straight to the Legal Entity
                    ...directCentres.map(c => (
                      <CentreNode key={`d-${c.centerCode}`} name={c.centreName} />
                    )),
                  ]}
                </Branch>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}