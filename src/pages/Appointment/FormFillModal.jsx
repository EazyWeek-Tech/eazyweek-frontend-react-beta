import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";
// ComponentPreview not needed in fill mode

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet  = async (url) => { const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => {
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) });
  return r.json();
};

// ─── Signature Pad ────────────────────────────────────────────────────────────
const SignaturePad = ({ onChange }) => {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches?.[0] || e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e) => { drawing.current = true; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e,c); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
  const draw  = (e) => { if (!drawing.current) return; e.preventDefault(); const c = canvasRef.current; const ctx = c.getContext("2d"); ctx.strokeStyle="#10223f"; ctx.lineWidth=2; ctx.lineCap="round"; const p = getPos(e,c); ctx.lineTo(p.x,p.y); ctx.stroke(); };
  const end   = () => { drawing.current = false; onChange(canvasRef.current.toDataURL()); };
  const clear = () => { const c = canvasRef.current; c.getContext("2d").clearRect(0,0,c.width,c.height); onChange(""); };

  return (
    <div>
      <canvas ref={canvasRef} width={400} height={120}
        style={{ border:"1px solid #e7ecf4", borderRadius:8, cursor:"crosshair", touchAction:"none", background:"#fafbfc", display:"block" }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={end} />
      <button onClick={clear} style={{ marginTop:6, fontSize:11, color:"#94a3b8", background:"none", border:"none", cursor:"pointer" }}>Clear</button>
    </div>
  );
};

// ─── Annotation Pad ───────────────────────────────────────────────────────────
const AnnotationPad = ({ assetCode, onChange }) => {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const drawing    = useRef(false);
  const [color,    setColor]    = useState("#e53e3e");
  const [size,     setSize]     = useState(3);
  const [imgLoaded,setImgLoaded]= useState(false);

  const imgUrl = `${import.meta.env.BASE_URL}emr/annotations/${assetCode?.toLowerCase().replace("anno-","")}.svg`;

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; setImgLoaded(true); const c = canvasRef.current; const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, c.width, c.height); };
    img.src = imgUrl;
  }, [assetCode]);

  const getPos = (e, c) => { const r = c.getBoundingClientRect(); const s = e.touches?.[0] || e; return { x:(s.clientX-r.left)*(c.width/r.width), y:(s.clientY-r.top)*(c.height/r.height) }; };
  const start  = (e) => { drawing.current = true; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e,c); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
  const draw   = (e) => { if (!drawing.current) return; e.preventDefault(); const c = canvasRef.current; const ctx = c.getContext("2d"); ctx.strokeStyle=color; ctx.lineWidth=size; ctx.lineCap="round"; const p = getPos(e,c); ctx.lineTo(p.x,p.y); ctx.stroke(); };
  const end    = () => { drawing.current = false; onChange(canvasRef.current.toDataURL()); };
  const clear  = () => { const c = canvasRef.current; const ctx = c.getContext("2d"); ctx.clearRect(0,0,c.width,c.height); if (imgRef.current) ctx.drawImage(imgRef.current,0,0,c.width,c.height); onChange(""); };

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
        {["#e53e3e","#2b6cb0","#276749","#744210","#000000"].map(c => (
          <div key={c} onClick={() => setColor(c)} style={{ width:20, height:20, borderRadius:"50%", background:c, cursor:"pointer", border:color===c?"3px solid #334b71":"2px solid transparent" }} />
        ))}
        <input type="range" min={1} max={8} value={size} onChange={e => setSize(parseInt(e.target.value))} style={{ width:80 }} />
        <span style={{ fontSize:11, color:"#94a3b8" }}>Size: {size}</span>
        <button onClick={clear} style={{ fontSize:11, color:"#94a3b8", background:"none", border:"none", cursor:"pointer" }}>Clear</button>
      </div>
      <canvas ref={canvasRef} width={300} height={200}
        style={{ border:"1px solid #e7ecf4", borderRadius:8, cursor:"crosshair", touchAction:"none", background:"#fafbfc", display:"block" }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={end} />
    </div>
  );
};

// ─── Single Field Renderer (fillable) ─────────────────────────────────────────
const FieldRenderer = ({ component, value, onChange, conditions, allValues }) => {
  const { componentType, label, isMandatory, config = {}, componentId } = component;

  // Apply conditional visibility
  const isVisible = conditions.every(cond => {
    if (cond.targetCompId !== componentId) return true;
    const triggerVal = allValues[cond.triggerCompId];
    const matches    = String(triggerVal || "").toLowerCase() === String(cond.triggerValue || "").toLowerCase();
    return cond.action === "show" ? matches : !matches;
  });
  if (!isVisible) return null;

  const inp = {
    width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"10px 12px",
    fontSize:13, outline:"none", boxSizing:"border-box",
  };

  const Label = () => (
    <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#334b71", marginBottom:6 }}>
      {label}{isMandatory && <span style={{ color:"#b91c1c", marginLeft:2 }}>*</span>}
    </label>
  );

  switch (componentType) {
    case "text":
      return <div><Label /><input style={inp} value={value||""} placeholder={config.placeholder||""} onChange={e => onChange(e.target.value)} /></div>;

    case "textarea":
      return <div><Label /><textarea style={{ ...inp, minHeight:80, resize:"vertical" }} value={value||""} placeholder={config.placeholder||""} onChange={e => onChange(e.target.value)} /></div>;

    case "number":
      return (
        <div><Label />
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input type="number" style={{ ...inp, width:160 }} value={value||""} min={config.min} max={config.max} onChange={e => onChange(e.target.value)} />
            {config.unit && <span style={{ fontSize:13, color:"#64748b" }}>{config.unit}</span>}
          </div>
        </div>
      );

    case "date":
      return <div><Label /><input type="date" style={inp} value={value||""} onChange={e => onChange(e.target.value)} /></div>;

    case "time":
      return <div><Label /><input type="time" style={inp} value={value||""} onChange={e => onChange(e.target.value)} /></div>;

    case "datetime":
      return <div><Label /><input type="datetime-local" style={inp} value={value||""} onChange={e => onChange(e.target.value)} /></div>;

    case "dropdown":
      return (
        <div><Label />
          <select style={inp} value={value||""} onChange={e => onChange(e.target.value)}>
            <option value="">Select…</option>
            {(config.options||[]).map((o,i) => <option key={i} value={o}>{o}</option>)}
          </select>
        </div>
      );

    case "radio":
      return (
        <div><Label />
          <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
            {(config.options||[]).map((o,i) => (
              <label key={i} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13 }}>
                <input type="radio" name={componentId} value={o} checked={value===o} onChange={() => onChange(o)} />
                {o}
              </label>
            ))}
          </div>
        </div>
      );

    case "checkbox":
      return (
        <div><Label />
          <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
            {(config.options||[]).map((o,i) => {
              const checked = Array.isArray(value) ? value.includes(o) : false;
              return (
                <label key={i} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13 }}>
                  <input type="checkbox" checked={checked}
                    onChange={() => {
                      const arr = Array.isArray(value) ? [...value] : [];
                      onChange(checked ? arr.filter(x=>x!==o) : [...arr, o]);
                    }} />
                  {o}
                </label>
              );
            })}
          </div>
        </div>
      );

    case "signature":
      return <div><Label /><SignaturePad onChange={onChange} /></div>;

    case "annotation":
      return <div><Label /><AnnotationPad assetCode={config.assetCode || "ANNO-FACE"} onChange={onChange} /></div>;

    case "fileupload":
      return (
        <div><Label />
          <input type="file" accept={config.accept || "image/*"}
            onChange={e => {
              const file = e.target.files[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => onChange({ url: ev.target.result, fileName: file.name, fileSize: file.size, mimeType: file.type, imageType: config.imageType || "Other" });
              reader.readAsDataURL(file);
            }}
            style={{ fontSize:13 }} />
        </div>
      );

    case "content":
      return <div style={{ padding:"10px 14px", background:"#f8fafc", borderRadius:8, fontSize:13, color:"#334b71" }}
        dangerouslySetInnerHTML={{ __html: config.html || "" }} />;

    case "macro":
      const macroVal = (() => {
        const u = JSON.parse(localStorage.getItem("user")||"{}");
        switch(config.macroType) {
          case "Date":             return new Date().toLocaleDateString("en-GB");
          case "Time":             return new Date().toLocaleTimeString("en-GB");
          case "PractitionerName": return u.employeeName || u.name || "";
          case "CentreName":       return u.centreName   || u.centerName || "";
          default:                 return "";
        }
      })();
      return (
        <div style={{ padding:"8px 12px", background:"#e9edf5", borderRadius:8, fontSize:13, color:"#334b71" }}>
          ⚡ {config.macroType}: <strong>{macroVal}</strong>
        </div>
      );

    case "logo":
      return (
        <div style={{ textAlign:config.align||"left" }}>
          <div style={{ display:"inline-block", padding:"6px 14px", background:"#e9edf5", borderRadius:8, fontSize:12, color:"#334b71", fontWeight:700 }}>🏷 Logo</div>
        </div>
      );

    default:
      return null;
  }
};

// ─── Main FormFillModal ───────────────────────────────────────────────────────
export default function FormFillModal({
  appointmentId,
  serviceCode,
  custId,
  centerCode,
  whenToFill,         // "Before Service Starts" | "After Service Starts"
  onComplete,         // called when all required forms are submitted
  onClose,
}) {
  const [forms,      setForms]      = useState([]);
  const [formIndex,  setFormIndex]  = useState(0);
  const [formDef,    setFormDef]    = useState(null);
  const [values,     setValues]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [errors,     setErrors]     = useState({});
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type="error") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // Load appointment forms
  useEffect(() => {
    const params = new URLSearchParams({ serviceCode, custId });
    authGet(`${API_BASE_URL}/api/EMR/Appointment/${appointmentId}/Forms?${params}`)
      .then(data => {
        // Filter forms for this status change that are not yet submitted
        const pending = (data.serviceForms || []).filter(f =>
          f.whenToFill === whenToFill && !f.isSubmitted
        );
        setForms(pending);
        if (pending.length === 0) { onComplete(); return; }
        loadFormDef(pending[0].formCode);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadFormDef = async (formCode) => {
    const def = await authGet(`${API_BASE_URL}/api/EMR/Forms/${formCode}`);
    setFormDef(def);
    setValues({});
    setErrors({});
  };

  const currentForm = forms[formIndex];

  const validate = () => {
    if (!formDef) return true;
    const e = {};
    for (const comp of formDef.components || []) {
      if (!comp.isMandatory) continue;
      const val = values[comp.componentId];
      const empty = val === undefined || val === null || val === "" ||
        (Array.isArray(val) && val.length === 0);
      if (empty) e[comp.componentId] = "This field is required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { showToast("Please fill all required fields."); return; }
    setSubmitting(true);
    try {
      const u   = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const res = await authPost(`${API_BASE_URL}/api/EMR/Forms/Submit`, {
        formCode:      currentForm.formCode,
        appointmentId,
        custId,
        serviceCode,
        centerCode,
        responseData:  values,
        filledBy:      u.employeeCode || "",
        filledByName:  u.employeeName || u.name || "",
      });
      if (!res.success) throw new Error(res.message);

      // Move to next form or complete
      const nextIndex = formIndex + 1;
      if (nextIndex < forms.length) {
        setFormIndex(nextIndex);
        loadFormDef(forms[nextIndex].formCode);
      } else {
        onComplete();
      }
    } catch (e) { showToast(e.message || "Failed to submit form."); }
    finally { setSubmitting(false); }
  };

  const updateValue = (compId, val) => {
    setValues(p => ({ ...p, [compId]: val }));
    if (errors[compId]) setErrors(p => { const e = {...p}; delete e[compId]; return e; });
  };

  if (loading) return (
    <div className="popouter" style={{ display:"flex", zIndex:9999 }}>
      <div className="popovrly" />
      <div className="popin" style={{ textAlign:"center", padding:60 }}>Loading forms…</div>
    </div>
  );

  if (forms.length === 0) return null;

  const progress = Math.round(((formIndex) / forms.length) * 100);

  return (
    <div className="popouter" style={{ display:"flex", zIndex:9999 }}>
      <div className="popovrly" onClick={onClose} />
      <div className="popin" style={{ maxWidth:680, width:"95%", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div className="popuphdr" style={{ flexShrink:0 }}>
          <div>
            <div>{formDef?.formName || currentForm?.formName || "Form"}</div>
            <div style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginTop:2 }}>
              {formIndex + 1} of {forms.length} · {whenToFill}
            </div>
          </div>
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>

        {/* Progress bar */}
        {forms.length > 1 && (
          <div style={{ height:4, background:"#f1f5f9", flexShrink:0 }}>
            <div style={{ height:"100%", background:"#334b71", width:`${progress}%`, transition:"width .3s" }} />
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{ margin:"8px 20px 0", padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600,
            background:"#fdf3f3", border:"1px solid #f0c4c0", color:"#b91c1c", flexShrink:0 }}>
            ⚠ {toast.msg}
          </div>
        )}

        {/* Form fields — scrollable */}
        <div className="popfrm" style={{ flex:1, overflowY:"auto" }}>
          {formDef ? (
            <div>
              {(formDef.components || []).map(comp => (
                <div key={comp.componentId} style={{ marginBottom:18 }}>
                  <FieldRenderer
                    component={comp}
                    value={values[comp.componentId]}
                    onChange={val => updateValue(comp.componentId, val)}
                    conditions={formDef.conditions || []}
                    allValues={values}
                  />
                  {errors[comp.componentId] && (
                    <div style={{ color:"#b91c1c", fontSize:11, marginTop:4 }}>
                      ⚠ {errors[comp.componentId]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading form…</div>
          )}
        </div>

        {/* Footer */}
        <div className="btnbar" style={{ flexShrink:0, borderTop:"1px solid #f1f5f9", paddingTop:14 }}>
          {!currentForm?.isMandatory && (
            <button className="seclnk" onClick={onClose}>Skip</button>
          )}
          <button className="pribtnblue" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : formIndex < forms.length - 1 ? "Submit & Next →" : "Submit Form ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}