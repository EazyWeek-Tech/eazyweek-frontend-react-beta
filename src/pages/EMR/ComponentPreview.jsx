import React from "react";

// dir: "ltr" | "rtl" — passed from FormBuilder based on selected preview language
export default function ComponentPreview({ component, compact = false, childComponents = [], allComponents = [], dir = "ltr", activeLang, onLangChange }) {
  const { componentType, label, isMandatory, config = {} } = component;
  const isRTL      = dir === "rtl";
  const fontFamily = isRTL ? "'Noto Sans Arabic', Arial, sans-serif" : "inherit";

  // Special: language toggle renders as EN | AR pill buttons
  if (componentType === "languagetoggle") {
    // activeLang + onLangChange are passed from FormBuilder preview
    // In compact (canvas) mode they are undefined — render static preview
    const isActive = (lang) => activeLang ? activeLang === lang : lang === "en";
    return (
      <div style={{ display:"flex", justifyContent: isRTL ? "flex-end" : "flex-start" }}>
        <div style={{ display:"inline-flex", background:"#f1f5f9", borderRadius:10, padding:3, gap:3 }}>
          {[
            { code:"en", flag:"🇬🇧", label:"English" },
            { code:"ar", flag:"🇸🇦", label:"العربية" },
          ].map(lang => (
            <div key={lang.code}
              onClick={() => onLangChange && onLangChange(lang.code)}
              style={{
                padding:"6px 18px", borderRadius:8,
                background: isActive(lang.code) ? "#334b71" : "transparent",
                color:      isActive(lang.code) ? "#fff" : "#64748b",
                fontWeight: isActive(lang.code) ? 800 : 700,
                fontSize:13,
                cursor: onLangChange ? "pointer" : "default",
                transition:"all .15s",
                fontFamily: lang.code === "ar" ? "'Noto Sans Arabic', Arial, sans-serif" : "inherit",
              }}>
              {lang.flag} {lang.label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const Label = () => label ? (
    <label style={{ display:"block", fontSize:compact?11:13, fontWeight:700, color:"#334b71", marginBottom:4,
      fontFamily, textAlign: isRTL ? "right" : "left" }}>
      {label}{isMandatory && <span style={{ color:"#b91c1c", marginLeft:2 }}>*</span>}
    </label>
  ) : null;

  const inp = {
    width:"100%", border:"1px solid #e7ecf4", borderRadius:6,
    padding: compact?"5px 8px":"8px 10px", fontSize:compact?11:13,
    outline:"none", boxSizing:"border-box", background:"#f8fafc", color:"#64748b",
    direction: dir, fontFamily, textAlign: isRTL ? "right" : "left",
  };

  switch (componentType) {
    case "text":
      return <div dir={dir}><Label /><input readOnly style={inp} placeholder={config.placeholder || (isRTL?"نص قصير…":"Short text…")} /></div>;

    case "textarea":
      return <div dir={dir}><Label /><textarea readOnly rows={compact?2:3} style={{...inp,resize:"none"}} placeholder={config.placeholder||(isRTL?"نص طويل…":"Long text…")} /></div>;

    case "number":
      return (
        <div dir={dir}><Label />
          <div style={{ display:"flex", alignItems:"center", gap:6, flexDirection:isRTL?"row-reverse":"row" }}>
            <input readOnly type="number" style={{...inp,width:120}} placeholder="0" />
            {config.unit && <span style={{ fontSize:12, color:"#64748b" }}>{config.unit}</span>}
          </div>
        </div>
      );

    case "date":     return <div dir={dir}><Label /><input readOnly type="date" style={inp} /></div>;
    case "time":     return <div dir={dir}><Label /><input readOnly type="time" style={inp} /></div>;
    case "datetime": return <div dir={dir}><Label /><input readOnly type="datetime-local" style={inp} /></div>;

    case "dropdown":
      return (
        <div dir={dir}><Label />
          <select disabled style={inp}>
            <option>{isRTL?"اختر…":"Select…"}</option>
            {(config.options||[]).map((o,i) => <option key={i}>{o}</option>)}
          </select>
        </div>
      );

    case "radio":
      return (
        <div dir={dir}><Label />
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, flexDirection:isRTL?"row-reverse":"row" }}>
            {(config.options||["Option 1","Option 2"]).map((o,i) => (
              <label key={i} style={{ display:"flex", alignItems:"center", gap:4, fontSize:compact?11:13, fontFamily }}>
                <input type="radio" readOnly disabled /> {o}
              </label>
            ))}
          </div>
        </div>
      );

    case "checkbox":
      return (
        <div dir={dir}><Label />
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, flexDirection:isRTL?"row-reverse":"row" }}>
            {(config.options||["Option 1","Option 2"]).map((o,i) => (
              <label key={i} style={{ display:"flex", alignItems:"center", gap:4, fontSize:compact?11:13, fontFamily }}>
                <input type="checkbox" readOnly disabled /> {o}
              </label>
            ))}
          </div>
        </div>
      );

    case "signature":
      return (
        <div dir={dir}><Label />
          <div style={{ border:"1px dashed #cbd5e1", borderRadius:8, height:compact?40:80,
            background:"#fafbfc", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:compact?11:13, color:"#94a3b8", fontFamily }}>
              ✍ {isRTL?"منطقة التوقيع":"Signature area"}
            </span>
          </div>
        </div>
      );

    case "fileupload":
      return (
        <div dir={dir}><Label />
          <div style={{ border:"1px dashed #cbd5e1", borderRadius:8, padding:compact?"8px":"16px",
            background:"#fafbfc", textAlign:"center" }}>
            <div style={{ fontSize:compact?11:13, color:"#94a3b8" }}>
              📎 {config.accept?.includes("image") ? (isRTL?"رفع صورة":"Upload Image") : (isRTL?"رفع ملف":"Upload File")}
              {config.imageType && config.imageType !== "Other" && <span style={{ marginLeft:4 }}>({config.imageType})</span>}
            </div>
          </div>
        </div>
      );

    case "annotation":
      return (
        <div dir={dir}><Label />
          <div style={{ border:"1px solid #e7ecf4", borderRadius:8, background:"#fafbfc",
            height:compact?60:120, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:compact?11:13, color:"#94a3b8" }}>🖊 {config.assetCode||"Face"}</span>
          </div>
        </div>
      );

    case "content":
      return (
        <div dir={dir} style={{ border:"1px solid #f1f5f9", borderRadius:8,
          padding:compact?"8px":"12px", background:"#fafbfc",
          fontSize:compact?11:13, color:"#334b71", fontFamily,
          textAlign: isRTL?"right":"left", lineHeight:1.6 }}
          dangerouslySetInnerHTML={{ __html: config.html || "<p>Static content</p>" }} />
      );

    case "logo": {
      const imgSrc = config.imageData || config.imageUrl || "";
      const maxW   = config.maxWidth || "160px";
      return (
        <div style={{ textAlign: config.align || "left", padding:"4px 0" }}>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt="Logo"
              style={{ maxWidth: maxW, maxHeight:80, objectFit:"contain",
                display:"inline-block" }} />
          ) : (
            // Placeholder shown when no image set yet
            <div style={{ display:"inline-flex", alignItems:"center", gap:6,
              padding:"8px 14px", background:"#e9edf5", borderRadius:8,
              border:"1px dashed #cbd5e1" }}>
              <span style={{ fontSize:16 }}>🏷</span>
              <span style={{ fontSize:compact?10:12, color:"#94a3b8", fontWeight:600 }}>
                Logo — upload in editor
              </span>
            </div>
          )}
        </div>
      );
    }

    case "columnlayout": {
      const colCount = config.columns || 2;
      // Resolve children: prefer explicitly passed childComponents, else look up from allComponents
      const resolvedChildren = childComponents.length > 0
        ? childComponents
        : allComponents.filter(c => c.parentId === component.componentId)
            .sort((a, b) => (a.columnIndex ?? 0) - (b.columnIndex ?? 0));
      return (
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${colCount}, 1fr)`, gap:compact?6:12, direction:dir }}>
          {Array.from({ length: colCount }).map((_,colIdx) => {
            const child = resolvedChildren.find(c => c.columnIndex === colIdx);
            return (
              <div key={colIdx} style={{ border:"1px solid #e7ecf4", borderRadius:6,
                padding:compact?"6px":"10px", background:"#fff", minHeight:40 }}>
                {child
                  ? <ComponentPreview component={child} compact={compact}
                      allComponents={allComponents} dir={dir} />
                  : <div style={{ fontSize:compact?10:11, color:"#cbd5e1", textAlign:"center", paddingTop:compact?6:10 }}>
                      {isRTL?"فارغ":"Empty"}
                    </div>
                }
              </div>
            );
          })}
        </div>
      );
    }

    case "collapsible":
      return (
        <div dir={dir} style={{ border:"1px solid #e7ecf4", borderRadius:8, overflow:"hidden" }}>
          <div style={{ padding:"8px 12px", background:"#f8fafc", display:"flex",
            justifyContent:"space-between", fontSize:compact?11:13, fontWeight:700, color:"#334b71", fontFamily }}>
            {config.title||"Section"} <span>▾</span>
          </div>
          {!compact && <div style={{ padding:12, fontSize:12, color:"#94a3b8" }}>Content goes here…</div>}
        </div>
      );

    case "tabs":
      return (
        <div dir={dir}>
          <div style={{ display:"flex", borderBottom:"1px solid #e7ecf4", flexDirection:isRTL?"row-reverse":"row" }}>
            {(config.tabs||["Tab 1","Tab 2"]).map((t,i) => (
              <div key={i} style={{ padding:`${compact?"4":"8"}px ${compact?"10":"16"}px`,
                fontSize:compact?10:12, fontWeight:700, fontFamily,
                color:i===0?"#334b71":"#94a3b8",
                borderBottom:i===0?"2px solid #334b71":"2px solid transparent" }}>{t}</div>
            ))}
          </div>
          {!compact && <div style={{ padding:12, fontSize:12, color:"#94a3b8" }}>Tab content…</div>}
        </div>
      );

    case "table":
      return (
        <div style={{ overflowX:"auto" }} dir={dir}>
          <Label />
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:compact?10:12 }}>
            <thead><tr>
              {(config.columns||["Col 1","Col 2"]).map((c,i) => (
                <th key={i} style={{ border:"1px solid #e7ecf4", padding:"4px 8px", background:"#f8fafc",
                  color:"#334b71", fontWeight:700, textAlign:isRTL?"right":"left", fontFamily }}>{c}</th>
              ))}
            </tr></thead>
            <tbody>
              {Array.from({ length: Math.min(config.rows||2,compact?1:3) }).map((_,i) => (
                <tr key={i}>{(config.columns||["",""]).map((_,j) => (
                  <td key={j} style={{ border:"1px solid #e7ecf4", padding:"4px 8px", height:28 }} />
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "calculated":
      return (
        <div dir={dir}><Label />
          <div style={{...inp, display:"flex", alignItems:"center", gap:6, background:"#f0f4fa"}}>
            <span style={{ fontSize:11, color:"#334b71" }}>🧮</span>
            <span style={{ fontSize:compact?10:12, color:"#94a3b8" }}>{config.formula||"= formula result"}</span>
          </div>
        </div>
      );

    case "macro":
      return (
        <div style={{ padding:compact?"4px 8px":"8px 12px", background:"#e9edf5",
          borderRadius:6, fontSize:compact?10:12, color:"#334b71", display:"inline-block" }}>
          ⚡ {config.macroType||"Macro"}
        </div>
      );

    default:
      return (
        <div style={{ padding:compact?"4px":"8px", background:"#f8fafc",
          border:"1px dashed #e7ecf4", borderRadius:6, fontSize:compact?10:12, color:"#94a3b8" }}>
          {componentType}
        </div>
      );
  }
}