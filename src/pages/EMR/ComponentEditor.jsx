import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = async (url) => { const r = await fetch(url, { headers:{ Authorization:`Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };

// ─── Sub-components at MODULE LEVEL — prevents focus loss on re-render ────────
const F = ({ label, children, hint }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ fontSize:11, fontWeight:700, color:"#2a3b57", display:"block", marginBottom:4 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize:10, color:"#94a3b8", marginTop:3 }}>{hint}</div>}
  </div>
);

const EditorInput = ({ value, onChange, placeholder, type="text", dir }) => (
  <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} dir={dir}
    style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px",
      fontSize:12, outline:"none", boxSizing:"border-box",
      fontFamily: dir==="rtl" ? "'Noto Sans Arabic', Arial, sans-serif" : "inherit",
      textAlign: dir==="rtl" ? "right" : "left" }} />
);

const EditorTextarea = ({ value, onChange, rows=4, dir }) => (
  <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} rows={rows} dir={dir}
    style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px",
      fontSize:12, outline:"none", resize:"vertical", boxSizing:"border-box",
      fontFamily: dir==="rtl" ? "'Noto Sans Arabic', Arial, sans-serif" : "inherit",
      textAlign: dir==="rtl" ? "right" : "left" }} />
);

const EditorSelect = ({ value, onChange, options }) => (
  <select value={value ?? ""} onChange={e => onChange(e.target.value)}
    style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12, outline:"none" }}>
    {options.map(o => (
      <option key={typeof o==="string"?o:o.value} value={typeof o==="string"?o:o.value}>
        {typeof o==="string"?o:o.label}
      </option>
    ))}
  </select>
);

const EditorToggle = ({ label, value, onChange }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0" }}>
    <span style={{ fontSize:12, fontWeight:600, color:"#334b71" }}>{label}</span>
    <div style={{ width:40, height:22, borderRadius:22, background:value?"#334b71":"#d3dbe8",
      position:"relative", cursor:"pointer" }} onClick={() => onChange(!value)}>
      <div style={{ width:16, height:16, background:"#fff", borderRadius:"50%", position:"absolute",
        top:3, left:value?21:3, transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.25)" }} />
    </div>
  </div>
);

// ─── Main ComponentEditor ─────────────────────────────────────────────────────
export default function ComponentEditor({ component, onChange, onClose, isBilingual = false }) {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    if (component.componentType === "annotation") {
      authGet(`${API_BASE_URL}/api/EMR/Annotations`).then(d => setAssets(Array.isArray(d) ? d : []));
    }
  }, [component.componentType]);

  const update       = (field, value) => onChange({ ...component, [field]: value });
  const updateConfig = (field, value) => onChange({ ...component, config: { ...component.config, [field]: value } });

  const isLangToggle = component.componentType === "languagetoggle";
  const isArabic     = component.lang === "ar";
  const dir          = isArabic ? "rtl" : "ltr";

  if (isLangToggle) {
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#071D49" }}>
            🌐 Language Toggle
            <div style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginTop:1 }}>Auto-managed — always first on form</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#94a3b8" }}>×</button>
        </div>
        <div style={{ background:"#f0faf9", border:"1px solid #A7D1CD", borderRadius:8, padding:12, fontSize:12, color:"#0f766e" }}>
          This component renders as an <strong>EN | AR</strong> toggle at the top of the form. It drives all bilingual conditions automatically. It cannot be deleted while bilingual mode is on.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:13, color:"#071D49" }}>
          Edit Component
          <div style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginTop:1 }}>{component.componentType}</div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#94a3b8" }}>×</button>
      </div>

      {/* Language badge for bilingual mode */}
      {isBilingual && component.lang && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, padding:"6px 10px",
          borderRadius:8, background: isArabic?"#fef9ec":"#eff6ff",
          border: `1px solid ${isArabic?"#fcd34d":"#bfdbfe"}` }}>
          <span style={{ fontSize:18 }}>{isArabic?"🇸🇦":"🇬🇧"}</span>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color: isArabic?"#92400e":"#1d4ed8" }}>
              {isArabic ? "Arabic Version (AR)" : "English Version (EN)"}
            </div>
            {isArabic && <div style={{ fontSize:10, color:"#92400e" }}>Text will render right-to-left</div>}
          </div>
          {/* Lang switcher in editor */}
          <select value={component.lang} onChange={e => update("lang", e.target.value)}
            style={{ marginLeft:"auto", border:"1px solid #e7ecf4", borderRadius:6, padding:"3px 6px", fontSize:11 }}>
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
        </div>
      )}

      {/* Label */}
      <F label={isArabic ? "Label (Arabic)" : "Label"}>
        <EditorInput value={component.label} onChange={v => update("label", v)}
          placeholder={isArabic ? "اكتب التسمية بالعربية…" : "Field label"} dir={dir} />
      </F>

      <EditorToggle label="Required / Mandatory" value={component.isMandatory} onChange={v => update("isMandatory", v)} />

      {/* Type-specific config */}
      {["dropdown","radio","checkbox"].includes(component.componentType) && (
        <F label={isArabic?"الخيارات (سطر واحد لكل خيار)":"Options"} hint={isArabic?"خيار واحد في كل سطر":"One option per line"}>
          <EditorTextarea
            value={(component.config?.options || []).join("\n")}
            onChange={v => updateConfig("options", v.split("\n").filter(Boolean))}
            rows={5} dir={dir} />
        </F>
      )}

      {component.componentType === "columnlayout" && (
        <F label="Number of Columns">
          <EditorSelect value={String(component.config?.columns || 2)}
            onChange={v => updateConfig("columns", parseInt(v))}
            options={["1","2","3","4","5","6","7","8","9","10"]} />
        </F>
      )}

      {component.componentType === "table" && (
        <>
          <F label={isArabic ? "رؤوس الأعمدة" : "Column Headers"}>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {(component.config?.columns || ["Column 1", "Column 2"]).map((col, idx) => (
                <div key={idx} style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input
                    value={col}
                    dir={dir}
                    onChange={e => {
                      const cols = [...(component.config?.columns || [])];
                      cols[idx] = e.target.value;
                      updateConfig("columns", cols);
                    }}
                    placeholder={`Column ${idx + 1}`}
                    style={{ flex:1, border:"1px solid #e7ecf4", borderRadius:8,
                      padding:"7px 10px", fontSize:12, outline:"none", boxSizing:"border-box" }}
                  />
                  <button
                    onClick={() => {
                      const cols = (component.config?.columns || []).filter((_, i) => i !== idx);
                      updateConfig("columns", cols.length ? cols : ["Column 1"]);
                    }}
                    disabled={(component.config?.columns || []).length <= 1}
                    style={{ background:"none", border:"1px solid #e7ecf4", borderRadius:6,
                      width:28, height:28, cursor:"pointer", color:"#94a3b8", fontSize:16,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      opacity: (component.config?.columns || []).length <= 1 ? 0.3 : 1 }}>
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const cols = [...(component.config?.columns || [])];
                  cols.push(`Column ${cols.length + 1}`);
                  updateConfig("columns", cols);
                }}
                style={{ background:"#f0f4fa", border:"1px dashed #334b71", borderRadius:8,
                  padding:"6px 10px", fontSize:11, fontWeight:700, color:"#334b71",
                  cursor:"pointer", textAlign:"center" }}>
                + Add Column
              </button>
              <div style={{ fontSize:10, color:"#94a3b8" }}>
                {(component.config?.columns || []).length} column{(component.config?.columns || []).length !== 1 ? "s" : ""}
              </div>
            </div>
          </F>
          <F label="Default Rows">
            <EditorInput type="number" value={component.config?.rows || 3}
              onChange={v => updateConfig("rows", Math.min(20, parseInt(v)||1))} placeholder="1–20" />
          </F>
        </>
      )}

      {component.componentType === "collapsible" && (
        <>
          <F label={isArabic?"عنوان القسم":"Section Title"}>
            <EditorInput value={component.config?.title||""} onChange={v => updateConfig("title",v)}
              placeholder={isArabic?"عنوان القسم…":"Section title"} dir={dir} />
          </F>
          <EditorToggle label="Open by default" value={!!component.config?.defaultOpen} onChange={v => updateConfig("defaultOpen",v)} />
        </>
      )}

      {component.componentType === "tabs" && (
        <F label={isArabic?"أسماء التبويبات":"Tab Names"} hint="One per line">
          <EditorTextarea value={(component.config?.tabs||[]).join("\n")}
            onChange={v => updateConfig("tabs", v.split("\n").filter(Boolean))} rows={4} dir={dir} />
        </F>
      )}

      {component.componentType === "content" && (
        <>
          <F label={isArabic?"المحتوى (HTML)":"Content (HTML)"} hint="Basic HTML supported">
            <EditorTextarea value={component.config?.html||""} onChange={v => updateConfig("html",v)} rows={8} dir={dir} />
          </F>
          {isArabic && (
            <div style={{ fontSize:10, color:"#92400e", background:"#fef3c7", padding:"6px 8px",
              borderRadius:6, marginTop:-8 }}>
              ↔ This will render right-to-left in preview
            </div>
          )}
        </>
      )}

      {component.componentType === "fileupload" && (
        <>
          <F label="Accept">
            <EditorSelect value={component.config?.accept||"image/*"} onChange={v => updateConfig("accept",v)}
              options={["image/*","application/pdf","image/*,application/pdf",".docx,.pdf"]} />
          </F>
          <F label="Image Type">
            <EditorSelect value={component.config?.imageType||"Other"} onChange={v => updateConfig("imageType",v)}
              options={["Before","After","Other"]} />
          </F>
          <F label="Max Size (MB)">
            <EditorInput type="number" value={component.config?.maxSizeMb||5} onChange={v => updateConfig("maxSizeMb",parseInt(v))} />
          </F>
        </>
      )}

      {component.componentType === "annotation" && (
        <F label="Body Diagram">
          <EditorSelect value={component.config?.assetCode||"ANNO-FACE"} onChange={v => updateConfig("assetCode",v)}
            options={assets.length ? assets.map(a=>({value:a.assetCode,label:a.assetName})) : [
              {value:"ANNO-FACE",label:"Face — Front"},{value:"ANNO-FACE-SIDE",label:"Face — Side"},
              {value:"ANNO-BODY-FRONT",label:"Body — Front"},{value:"ANNO-BODY-BACK",label:"Body — Back"},
            ]} />
        </F>
      )}

      {component.componentType === "macro" && (
        <F label="Macro Type" hint="Auto-filled when form is displayed">
          <EditorSelect value={component.config?.macroType||"PatientName"} onChange={v => updateConfig("macroType",v)}
            options={["PatientName","PatientDOB","PatientID","Date","Time","CentreName","PractitionerName"]} />
        </F>
      )}

      {component.componentType === "logo" && (
        <>
          <F label="Alignment">
            <EditorSelect value={component.config?.align||"left"} onChange={v => updateConfig("align",v)}
              options={["left","center","right"]} />
          </F>

          <F label="Logo Image" hint="Upload an image or paste a URL">
            {/* File upload */}
            <div
              onClick={() => document.getElementById("logo-upload-input").click()}
              style={{ border:"2px dashed #e7ecf4", borderRadius:8, padding:"14px",
                textAlign:"center", cursor:"pointer", background:"#fafbfc", marginBottom:8,
                transition:"border .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="#334b71"}
              onMouseLeave={e => e.currentTarget.style.borderColor="#e7ecf4"}>
              {component.config?.imageData || component.config?.imageUrl ? (
                <div>
                  <img
                    src={component.config.imageData || component.config.imageUrl}
                    alt="Logo preview"
                    style={{ maxHeight:60, maxWidth:"100%", objectFit:"contain", marginBottom:6 }} />
                  <div style={{ fontSize:10, color:"#94a3b8" }}>Click to replace</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:22, marginBottom:4 }}>🖼</div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#64748b" }}>Click to upload logo</div>
                  <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>PNG, JPG, SVG · max 200KB</div>
                </div>
              )}
            </div>
            <input
              id="logo-upload-input"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
              style={{ display:"none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 200 * 1024) {
                  alert("Image too large. Please use an image under 200KB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                  onChange({
                    ...component,
                    config: { ...component.config, imageData: ev.target.result, imageUrl: "" }
                  });
                };
                reader.readAsDataURL(file);
                // Reset so same file can be re-selected
                e.target.value = "";
              }}
            />

            {/* URL fallback */}
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
              <div style={{ fontSize:10, color:"#94a3b8", whiteSpace:"nowrap" }}>Or URL:</div>
              <input
                value={component.config?.imageUrl || ""}
                onChange={e => onChange({
                  ...component,
                  config: { ...component.config, imageUrl: e.target.value, imageData: "" }
                })}
                placeholder="https://…"
                style={{ flex:1, border:"1px solid #e7ecf4", borderRadius:6, padding:"5px 8px",
                  fontSize:11, outline:"none" }}
              />
            </div>

            {/* Clear button */}
            {(component.config?.imageData || component.config?.imageUrl) && (
              <button
                onClick={() => onChange({
                  ...component,
                  config: { ...component.config, imageData: "", imageUrl: "" }
                })}
                style={{ marginTop:8, background:"none", border:"1px solid #e7ecf4", borderRadius:6,
                  padding:"4px 10px", fontSize:11, color:"#94a3b8", cursor:"pointer", width:"100%" }}>
                ✕ Remove image
              </button>
            )}
          </F>

          {/* Max width control */}
          <F label="Max Width" hint="e.g. 120px or 40%">
            <EditorInput
              value={component.config?.maxWidth || ""}
              onChange={v => updateConfig("maxWidth", v)}
              placeholder="e.g. 150px" />
          </F>
        </>
      )}

      {component.componentType === "calculated" && (
        <F label="Formula" hint="Use component labels in curly braces e.g. {Weight} / ({Height} * {Height})">
          <EditorTextarea value={component.config?.formula||""} onChange={v => updateConfig("formula",v)} rows={3} />
        </F>
      )}

      {component.componentType === "number" && (
        <>
          <F label="Min Value"><EditorInput type="number" value={component.config?.min??""} onChange={v=>updateConfig("min",v)} placeholder="e.g. 0"/></F>
          <F label="Max Value"><EditorInput type="number" value={component.config?.max??""} onChange={v=>updateConfig("max",v)} placeholder="e.g. 100"/></F>
          <F label="Unit" hint="Optional e.g. kg, cm, %"><EditorInput value={component.config?.unit||""} onChange={v=>updateConfig("unit",v)} placeholder="e.g. kg"/></F>
        </>
      )}

      {["text","textarea"].includes(component.componentType) && (
        <F label={isArabic?"نص العنصر النائب":"Placeholder text"}>
          <EditorInput value={component.config?.placeholder||""} onChange={v=>updateConfig("placeholder",v)}
            placeholder={isArabic?"النص النائب…":"Placeholder…"} dir={dir} />
        </F>
      )}

      {component.componentType === "time" && (
        <>
          <F label="Min Time" hint="e.g. 08:00"><EditorInput type="time" value={component.config?.min||""} onChange={v=>updateConfig("min",v)}/></F>
          <F label="Max Time" hint="e.g. 20:00"><EditorInput type="time" value={component.config?.max||""} onChange={v=>updateConfig("max",v)}/></F>
        </>
      )}

      {component.componentType === "datetime" && (
        <>
          <F label="Min Date/Time"><EditorInput type="datetime-local" value={component.config?.min||""} onChange={v=>updateConfig("min",v)}/></F>
          <F label="Max Date/Time"><EditorInput type="datetime-local" value={component.config?.max||""} onChange={v=>updateConfig("max",v)}/></F>
        </>
      )}
    </div>
  );
}