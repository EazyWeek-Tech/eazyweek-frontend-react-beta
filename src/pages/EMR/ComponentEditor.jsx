import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = async (url) => { const r = await fetch(url, { headers:{ Authorization:`Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };

// Right panel — edits a selected component's properties
export default function ComponentEditor({ component, onChange, onClose }) {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    if (component.componentType === "annotation") {
      authGet(`${API_BASE_URL}/api/EMR/Annotations`).then(d => setAssets(Array.isArray(d) ? d : []));
    }
  }, [component.componentType]);

  const update = (field, value) => onChange({ ...component, [field]: value });
  const updateConfig = (field, value) => onChange({ ...component, config: { ...component.config, [field]: value } });

  const F = ({ label, children, hint }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#2a3b57", display:"block", marginBottom:4 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize:10, color:"#94a3b8", marginTop:3 }}>{hint}</div>}
    </div>
  );

  const Input = ({ value, onChange, placeholder, type="text" }) => (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12, outline:"none", boxSizing:"border-box" }} />
  );

  const Select = ({ value, onChange, options }) => (
    <select value={value || ""} onChange={e => onChange(e.target.value)}
      style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12, outline:"none" }}>
      {options.map(o => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
        {typeof o === "string" ? o : o.label}
      </option>)}
    </select>
  );

  const Toggle = ({ label, value, onChange }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0" }}>
      <span style={{ fontSize:12, fontWeight:600, color:"#334b71" }}>{label}</span>
      <div style={{ width:40, height:22, borderRadius:22, background:value?"#334b71":"#d3dbe8",
        position:"relative", cursor:"pointer" }} onClick={() => onChange(!value)}>
        <div style={{ width:16, height:16, background:"#fff", borderRadius:"50%",
          position:"absolute", top:3, left:value?21:3, transition:"left .2s",
          boxShadow:"0 1px 3px rgba(0,0,0,.25)" }} />
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontWeight:800, fontSize:13, color:"#071D49" }}>
          Edit Component
          <div style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginTop:1 }}>{component.componentType}</div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#94a3b8" }}>×</button>
      </div>

      {/* Common fields */}
      <F label="Label">
        <Input value={component.label} onChange={v => update("label", v)} placeholder="Field label" />
      </F>

      <Toggle label="Required / Mandatory" value={component.isMandatory} onChange={v => update("isMandatory", v)} />

      {/* Type-specific config */}
      {["dropdown","radio","checkbox"].includes(component.componentType) && (
        <F label="Options" hint="One option per line">
          <textarea value={(component.config?.options || []).join("\n")}
            onChange={e => updateConfig("options", e.target.value.split("\n").filter(Boolean))}
            rows={5}
            style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px",
              fontSize:12, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        </F>
      )}

      {component.componentType === "columnlayout" && (
        <F label="Number of Columns">
          <Select value={String(component.config?.columns || 2)}
            onChange={v => updateConfig("columns", parseInt(v))}
            options={["1","2","3","4"]} />
        </F>
      )}

      {component.componentType === "table" && (
        <>
          <F label="Column Headers" hint="One per line">
            <textarea value={(component.config?.columns || []).join("\n")}
              onChange={e => updateConfig("columns", e.target.value.split("\n").filter(Boolean))}
              rows={3}
              style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
          </F>
          <F label="Default Rows">
            <Input type="number" value={component.config?.rows || 3}
              onChange={v => updateConfig("rows", parseInt(v))} />
          </F>
        </>
      )}

      {component.componentType === "collapsible" && (
        <>
          <F label="Section Title">
            <Input value={component.config?.title || ""}
              onChange={v => updateConfig("title", v)} placeholder="Section title" />
          </F>
          <Toggle label="Open by default"
            value={!!component.config?.defaultOpen}
            onChange={v => updateConfig("defaultOpen", v)} />
        </>
      )}

      {component.componentType === "tabs" && (
        <F label="Tab Names" hint="One per line">
          <textarea value={(component.config?.tabs || []).join("\n")}
            onChange={e => updateConfig("tabs", e.target.value.split("\n").filter(Boolean))}
            rows={4}
            style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        </F>
      )}

      {component.componentType === "content" && (
        <F label="Content (HTML)" hint="Basic HTML supported">
          <textarea value={component.config?.html || ""}
            onChange={e => updateConfig("html", e.target.value)}
            rows={6}
            style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px",
              fontSize:12, outline:"none", resize:"vertical", fontFamily:"monospace", boxSizing:"border-box" }} />
        </F>
      )}

      {component.componentType === "fileupload" && (
        <>
          <F label="Accept">
            <Select value={component.config?.accept || "image/*"}
              onChange={v => updateConfig("accept", v)}
              options={["image/*","application/pdf","image/*,application/pdf",".docx,.pdf"]} />
          </F>
          <F label="Image Type">
            <Select value={component.config?.imageType || "Other"}
              onChange={v => updateConfig("imageType", v)}
              options={["Before","After","Other"]} />
          </F>
          <F label="Max Size (MB)">
            <Input type="number" value={component.config?.maxSizeMb || 5}
              onChange={v => updateConfig("maxSizeMb", parseInt(v))} />
          </F>
        </>
      )}

      {component.componentType === "annotation" && (
        <F label="Body Diagram">
          <Select value={component.config?.assetCode || "ANNO-FACE"}
            onChange={v => updateConfig("assetCode", v)}
            options={assets.length
              ? assets.map(a => ({ value: a.assetCode, label: a.assetName }))
              : [
                  { value:"ANNO-FACE",       label:"Face — Front" },
                  { value:"ANNO-FACE-SIDE",  label:"Face — Side" },
                  { value:"ANNO-BODY-FRONT", label:"Body — Front" },
                  { value:"ANNO-BODY-BACK",  label:"Body — Back" },
                  { value:"ANNO-HAND-PALM",  label:"Hand — Palm" },
                  { value:"ANNO-HAND-BACK",  label:"Hand — Back" },
                  { value:"ANNO-SCALP",      label:"Scalp — Top" },
                ]} />
        </F>
      )}

      {component.componentType === "macro" && (
        <F label="Macro Type" hint="Auto-filled when form is displayed">
          <Select value={component.config?.macroType || "PatientName"}
            onChange={v => updateConfig("macroType", v)}
            options={["PatientName","PatientDOB","PatientID","Date","Time","CentreName","PractitionerName"]} />
        </F>
      )}

      {component.componentType === "logo" && (
        <F label="Alignment">
          <Select value={component.config?.align || "left"}
            onChange={v => updateConfig("align", v)}
            options={["left","center","right"]} />
        </F>
      )}

      {component.componentType === "calculated" && (
        <F label="Formula" hint="Use component labels in curly braces e.g. {Weight} / ({Height} * {Height})">
          <textarea value={component.config?.formula || ""}
            onChange={e => updateConfig("formula", e.target.value)}
            rows={3}
            style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px",
              fontSize:12, outline:"none", resize:"vertical", fontFamily:"monospace", boxSizing:"border-box" }} />
        </F>
      )}

      {component.componentType === "number" && (
        <>
          <F label="Min Value">
            <Input type="number" value={component.config?.min ?? ""} onChange={v => updateConfig("min", v)} placeholder="e.g. 0" />
          </F>
          <F label="Max Value">
            <Input type="number" value={component.config?.max ?? ""} onChange={v => updateConfig("max", v)} placeholder="e.g. 100" />
          </F>
          <F label="Unit" hint="Optional e.g. kg, cm, %">
            <Input value={component.config?.unit || ""} onChange={v => updateConfig("unit", v)} placeholder="e.g. kg" />
          </F>
        </>
      )}

      {["text","textarea"].includes(component.componentType) && (
        <F label="Placeholder text">
          <Input value={component.config?.placeholder || ""}
            onChange={v => updateConfig("placeholder", v)} placeholder="Placeholder…" />
        </F>
      )}
    </div>
  );
}