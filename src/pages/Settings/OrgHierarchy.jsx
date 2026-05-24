import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json();
  return j.data ?? j;
};

// ── Node components ────────────────────────────────────────────────────────────
const LENode = ({ name }) => (
  <div style={{
    display:"inline-flex", alignItems:"center", gap:8,
    background:"#071D49", color:"#fff", borderRadius:10,
    padding:"10px 20px", fontWeight:800, fontSize:13,
    boxShadow:"0 4px 14px rgba(7,29,73,.25)",
  }}>
    <span style={{ fontSize:16 }}>🏢</span>
    <div>
      <div style={{ fontSize:10, opacity:0.65, textTransform:"uppercase", letterSpacing:1 }}>Legal Entity</div>
      <div>{name}</div>
    </div>
  </div>
);

const ZoneNode = ({ name }) => (
  <div style={{
    display:"inline-flex", alignItems:"center", gap:8,
    background:"#fff", border:"1.5px solid #334b71", borderRadius:10,
    padding:"8px 16px", fontWeight:700, fontSize:13,
    boxShadow:"0 2px 8px rgba(51,75,113,.1)",
  }}>
    <span style={{ fontSize:14 }}>🗺</span>
    <div>
      <div style={{ fontSize:10, color:"#94a3b8", textTransform:"uppercase", letterSpacing:1 }}>Zone</div>
      <div style={{ color:"#334b71" }}>{name}</div>
    </div>
  </div>
);

const CentreNode = ({ name, direct }) => (
  <div style={{
    display:"inline-flex", alignItems:"center", gap:8,
    background:"#fff", border:"1px solid #e7ecf4", borderRadius:10,
    padding:"7px 14px", fontWeight:600, fontSize:12,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)",
  }}>
    <span style={{ fontSize:13 }}>🏥</span>
    <div>
      <div style={{ fontSize:9, color:"#94a3b8", textTransform:"uppercase", letterSpacing:1 }}>Centre</div>
      <div style={{ color:"#334b71" }}>{name}</div>
    </div>
    {direct && (
      <span style={{ background:"#e9edf5", color:"#334b71", borderRadius:999, padding:"1px 7px", fontSize:10, fontWeight:700, marginLeft:4 }}>
        DIRECT
      </span>
    )}
  </div>
);

// Vertical connector line
const VLine = ({ height = 24 }) => (
  <div style={{ width:2, height, background:"#c8d5e8", margin:"0 auto" }} />
);

// Horizontal connector row
const HConnector = ({ count }) => {
  if (count <= 1) return <VLine />;
  return (
    <div style={{ position:"relative", height:24, margin:"0 auto" }}>
      <div style={{ position:"absolute", top:0, left:"50%", width:2, height:12, background:"#c8d5e8", transform:"translateX(-50%)" }} />
      <div style={{ position:"absolute", top:12, left:0, right:0, height:2, background:"#c8d5e8" }} />
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
      <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
      <div style={{ fontWeight:700, fontSize:15, color:"#b91c1c", marginBottom:6 }}>{error}</div>
      <div style={{ fontSize:13, color:"#64748b" }}>Please ensure at least one Legal Entity and one Centre are configured.</div>
    </div>
  );

  const allTopLevel = [...(data.zones || []), ...(data.directCentres || [])];

  return (
    <div style={{ fontFamily:"Lato,sans-serif", background:"#f7f9fc", minHeight:"100vh", color:"#10223f" }}>
      <div style={{ maxWidth:"95%", margin:"0 auto", padding:"28px 20px 60px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <span style={{ fontSize:22 }}>🏗</span>
          <div>
            <div style={{ fontWeight:800, fontSize:20, color:"#071D49" }}>Organisation Hierarchy</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
              Legal Entity → Zone (optional) → Centre
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display:"flex", gap:16, margin:"16px 0 28px", flexWrap:"wrap" }}>
          {[
            { label:"Legal Entity", value:1, color:"#071D49" },
            { label:"Zones",        value:data.totalZones,   color:"#334b71" },
            { label:"Centres",      value:data.totalCentres, color:"#2e7d5e" },
          ].map(s => (
            <div key={s.label} style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:10,
              padding:"10px 20px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
              <div style={{ fontWeight:800, fontSize:22, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Hierarchy flowchart */}
        <div style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:14,
          padding:"36px 24px", boxShadow:"0 2px 12px rgba(0,0,0,.05)", overflowX:"auto" }}>

          {/* Legal Entity — top */}
          <div style={{ textAlign:"center", marginBottom:0 }}>
            <LENode name={data.legalEntity.leName} />
          </div>

          {allTopLevel.length === 0 ? (
            <div style={{ textAlign:"center", padding:"30px 0", color:"#94a3b8", fontSize:13 }}>
              No zones or centres configured yet.
            </div>
          ) : (
            <>
              {/* Connector from LE down */}
              <VLine height={20} />

              {/* Horizontal spread */}
              <div style={{ position:"relative" }}>
                {allTopLevel.length > 1 && (
                  <div style={{ position:"absolute", top:0, left:"calc(50% / " + allTopLevel.length + ")", right:"calc(50% / " + allTopLevel.length + ")", height:2, background:"#c8d5e8" }} />
                )}
                <div style={{ display:"flex", justifyContent:"center", gap:32, flexWrap:"wrap", position:"relative" }}>
                  {/* Zones */}
                  {data.zones.map(z => (
                    <div key={z.zoneCode} style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:140 }}>
                      <VLine height={20} />
                      <ZoneNode name={z.zoneName} />
                      {z.centres.length > 0 && (
                        <>
                          <VLine height={16} />
                          <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
                            {z.centres.map(c => (
                              <div key={c.centerCode} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                                <VLine height={16} />
                                <CentreNode name={c.centreName} direct={false} />
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {z.centres.length === 0 && (
                        <div style={{ marginTop:12, fontSize:11, color:"#94a3b8" }}>No centres</div>
                      )}
                    </div>
                  ))}

                  {/* Direct centres */}
                  {data.directCentres.map(c => (
                    <div key={c.centerCode} style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:140 }}>
                      <VLine height={20} />
                      <CentreNode name={c.centreName} direct={true} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Legend */}
        <div style={{ display:"flex", gap:20, marginTop:18, flexWrap:"wrap" }}>
          {[
            { icon:"🏢", label:"Legal Entity", color:"#071D49" },
            { icon:"🗺", label:"Zone (optional grouping)", color:"#334b71" },
            { icon:"🏥", label:"Centre",       color:"#334b71" },
            { icon:"",   label:"DIRECT = Centre reports directly to Legal Entity", color:"#64748b" },
          ].map((l, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:l.color, fontWeight:600 }}>
              {l.icon && <span>{l.icon}</span>}
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}