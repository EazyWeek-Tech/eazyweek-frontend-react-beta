import React from "react";

// Renders a preview of each component type — used in builder canvas and preview mode
export default function ComponentPreview({ component, compact = false }) {
  const { componentType, label, isMandatory, config = {} } = component;

  const Label = () => label ? (
    <label style={{ display:"block", fontSize: compact ? 11 : 13, fontWeight:700,
      color:"#334b71", marginBottom:4 }}>
      {label}{isMandatory && <span style={{ color:"#b91c1c", marginLeft:2 }}>*</span>}
    </label>
  ) : null;

  const inp = {
    width:"100%", border:"1px solid #e7ecf4", borderRadius:6,
    padding: compact ? "5px 8px" : "8px 10px",
    fontSize: compact ? 11 : 13, outline:"none", boxSizing:"border-box",
    background:"#f8fafc", color:"#64748b",
  };

  switch (componentType) {

    case "text":
      return <div><Label /><input readOnly style={inp} placeholder={config.placeholder || "Short text…"} /></div>;

    case "textarea":
      return <div><Label /><textarea readOnly rows={compact?2:3} style={{ ...inp, resize:"none" }} placeholder={config.placeholder || "Long text…"} /></div>;

    case "number":
      return (
        <div><Label />
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <input readOnly type="number" style={{ ...inp, width:120 }} placeholder="0" />
            {config.unit && <span style={{ fontSize:12, color:"#64748b" }}>{config.unit}</span>}
          </div>
        </div>
      );

    case "date":
      return <div><Label /><input readOnly type="date" style={inp} /></div>;

    case "time":
      return <div><Label /><input readOnly type="time" style={inp}
        min={config.min || undefined} max={config.max || undefined} /></div>;

    case "datetime":
      return <div><Label /><input readOnly type="datetime-local" style={inp}
        min={config.min || undefined} max={config.max || undefined} /></div>;

    case "dropdown":
      return (
        <div><Label />
          <select disabled style={inp}>
            <option>Select…</option>
            {(config.options || []).map((o,i) => <option key={i}>{o}</option>)}
          </select>
        </div>
      );

    case "radio":
      return (
        <div><Label />
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            {(config.options || ["Option 1","Option 2"]).map((o,i) => (
              <label key={i} style={{ display:"flex", alignItems:"center", gap:4, fontSize:compact?11:13, cursor:"default" }}>
                <input type="radio" readOnly disabled /> {o}
              </label>
            ))}
          </div>
        </div>
      );

    case "checkbox":
      return (
        <div><Label />
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            {(config.options || ["Option 1","Option 2"]).map((o,i) => (
              <label key={i} style={{ display:"flex", alignItems:"center", gap:4, fontSize:compact?11:13, cursor:"default" }}>
                <input type="checkbox" readOnly disabled /> {o}
              </label>
            ))}
          </div>
        </div>
      );

    case "signature":
      return (
        <div><Label />
          <div style={{ border:"1px dashed #cbd5e1", borderRadius:8, height:compact?40:80,
            background:"#fafbfc", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:compact?11:13, color:"#94a3b8" }}>✍ Signature area</span>
          </div>
        </div>
      );

    case "fileupload":
      return (
        <div><Label />
          <div style={{ border:"1px dashed #cbd5e1", borderRadius:8, padding:compact?"8px":"16px",
            background:"#fafbfc", textAlign:"center" }}>
            <div style={{ fontSize:compact?11:13, color:"#94a3b8" }}>
              📎 {config.accept?.includes("image") ? "Upload Image" : "Upload File"}
              {config.imageType && config.imageType !== "Other" && <span style={{ marginLeft:4 }}>({config.imageType})</span>}
            </div>
          </div>
        </div>
      );

    case "annotation":
      return (
        <div><Label />
          <div style={{ border:"1px solid #e7ecf4", borderRadius:8, overflow:"hidden",
            background:"#fafbfc", height:compact?60:120, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:compact?11:13, color:"#94a3b8" }}>
              🖊 Annotation Pad — {config.assetCode || "Face"}
            </span>
          </div>
        </div>
      );

    case "content":
      return (
        <div style={{ border:"1px solid #f1f5f9", borderRadius:8, padding:compact?"8px":"12px",
          background:"#fafbfc", fontSize:compact?11:13, color:"#334b71" }}
          dangerouslySetInnerHTML={{ __html: config.html || "<p>Static content</p>" }} />
      );

    case "logo":
      return (
        <div style={{ textAlign:config.align || "left", padding:"4px 0" }}>
          <div style={{ display:"inline-block", padding:"8px 16px", background:"#e9edf5",
            borderRadius:8, fontSize:11, color:"#334b71", fontWeight:700 }}>🏷 Logo</div>
        </div>
      );

    case "columnlayout":
      return (
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${config.columns||2}, 1fr)`, gap:8 }}>
          {Array.from({ length: config.columns || 2 }).map((_, i) => (
            <div key={i} style={{ border:"1px dashed #e7ecf4", borderRadius:6,
              padding:compact?"8px":"12px", background:"#fafbfc",
              fontSize:compact?10:12, color:"#94a3b8", textAlign:"center" }}>
              Column {i+1}
            </div>
          ))}
        </div>
      );

    case "collapsible":
      return (
        <div style={{ border:"1px solid #e7ecf4", borderRadius:8, overflow:"hidden" }}>
          <div style={{ padding:"8px 12px", background:"#f8fafc", display:"flex",
            justifyContent:"space-between", fontSize:compact?11:13, fontWeight:700, color:"#334b71" }}>
            {config.title || "Section"} <span>▾</span>
          </div>
          {!compact && <div style={{ padding:12, fontSize:12, color:"#94a3b8" }}>Content goes here…</div>}
        </div>
      );

    case "tabs":
      return (
        <div>
          <div style={{ display:"flex", borderBottom:"1px solid #e7ecf4", gap:0 }}>
            {(config.tabs || ["Tab 1","Tab 2"]).map((t,i) => (
              <div key={i} style={{ padding:`${compact?"4":"8"}px ${compact?"10":"16"}px`,
                fontSize:compact?10:12, fontWeight:700,
                color:i===0?"#334b71":"#94a3b8",
                borderBottom:i===0?"2px solid #334b71":"2px solid transparent" }}>
                {t}
              </div>
            ))}
          </div>
          {!compact && <div style={{ padding:12, fontSize:12, color:"#94a3b8" }}>Tab content…</div>}
        </div>
      );

    case "table":
      return (
        <div style={{ overflowX:"auto" }}>
          <Label />
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:compact?10:12 }}>
            <thead>
              <tr>
                {(config.columns || ["Col 1","Col 2"]).map((c,i) => (
                  <th key={i} style={{ border:"1px solid #e7ecf4", padding:"4px 8px",
                    background:"#f8fafc", color:"#334b71", fontWeight:700, textAlign:"left" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.min(config.rows||2, compact?1:3) }).map((_,i) => (
                <tr key={i}>
                  {(config.columns || ["","",""]).map((_,j) => (
                    <td key={j} style={{ border:"1px solid #e7ecf4", padding:"4px 8px", height:28 }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "calculated":
      return (
        <div><Label />
          <div style={{ ...inp, display:"flex", alignItems:"center", gap:6, background:"#f0f4fa" }}>
            <span style={{ fontSize:11, color:"#334b71" }}>🧮</span>
            <span style={{ fontSize:compact?10:12, color:"#94a3b8" }}>
              {config.formula || "= formula result"}
            </span>
          </div>
        </div>
      );

    case "conditional":
      return (
        <div style={{ border:"1px dashed #c8d5e8", borderRadius:8, padding:compact?"6px":"10px",
          background:"#f0f4fa" }}>
          <span style={{ fontSize:compact?10:12, color:"#334b71" }}>🔀 Conditional field</span>
        </div>
      );

    case "macro":
      return (
        <div style={{ padding:compact?"4px 8px":"8px 12px", background:"#e9edf5",
          borderRadius:6, fontSize:compact?10:12, color:"#334b71", display:"inline-block" }}>
          ⚡ {config.macroType || "Macro"}
        </div>
      );

    default:
      return (
        <div style={{ padding:compact?"4px":"8px", background:"#f8fafc",
          border:"1px dashed #e7ecf4", borderRadius:6,
          fontSize:compact?10:12, color:"#94a3b8" }}>
          {componentType}
        </div>
      );
  }
}