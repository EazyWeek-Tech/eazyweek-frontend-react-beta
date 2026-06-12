import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";
// ComponentPreview not needed in fill mode

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

// ─── Image compression ────────────────────────────────────────────────────────
// Resizes to max 1200px on longest side, JPEG quality 0.82.
// Typical result: 3–5 MB photo → 150–250 KB. Non-image files pass through unchanged.
const compressImage = (file) => new Promise((resolve) => {
  if (!file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = ev => resolve({ dataUrl: ev.target.result, size: file.size });
    reader.readAsDataURL(file);
    return;
  }

  const MAX_PX  = 1200;
  const QUALITY = 0.82;
  const img     = new Image();
  const objUrl  = URL.createObjectURL(file);

  img.onload = () => {
    URL.revokeObjectURL(objUrl);
    let { width, height } = img;
    if (width > MAX_PX || height > MAX_PX) {
      if (width >= height) { height = Math.round(height * MAX_PX / width); width = MAX_PX; }
      else                  { width  = Math.round(width  * MAX_PX / height); height = MAX_PX; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
    const size    = Math.round((dataUrl.length - "data:image/jpeg;base64,".length) * 0.75);
    resolve({ dataUrl, size });
  };

  img.onerror = () => {
    URL.revokeObjectURL(objUrl);
    const reader = new FileReader();
    reader.onload = ev => resolve({ dataUrl: ev.target.result, size: file.size });
    reader.readAsDataURL(file);
  };

  img.src = objUrl;
});
const authGet  = async (url) => { const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => {
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) });
  const j = await r.json();
  // Unwrap { success, data } envelope
  return j?.data !== undefined ? { ...j, ...j.data } : j;
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
// Full canvas drawing overlay on top of a body/face diagram SVG.
// Features: pen tool, 5 colours, adjustable brush size, undo, clear.
// Saves the composite image (diagram + annotations) as base64 on every stroke end.
const AnnotationPad = ({ assetCode, value, onChange }) => {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const drawing    = useRef(false);
  const history    = useRef([]);          // array of ImageData snapshots for undo
  const [color,    setColor]    = useState("#e53e3e");
  const [size,     setSize]     = useState(3);
  const [tool,     setTool]     = useState("pen"); // pen | eraser
  const [imgLoaded,setImgLoaded]= useState(false);
  const [imgError, setImgError] = useState(false);

  const W = 380, H = 260;  // canvas dimensions

  // ── Load diagram SVG ───────────────────────────────────────────────────────
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
    history.current = [];

    const slug    = (assetCode || "anno-face").toLowerCase().replace("anno-","");
    const imgUrl  = `/emr/annotations/${slug}.jpg`;

    const img = new Image();
    img.crossOrigin = "anonymous";   // avoid tainted canvas on some setups

    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, W, H);

      // Draw image scaled to fit canvas maintaining aspect ratio
      const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
      const dw    = img.naturalWidth  * scale;
      const dh    = img.naturalHeight * scale;
      const dx    = (W - dw) / 2;
      const dy    = (H - dh) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, dx, dy, dw, dh);

      // If there's a saved annotation, overlay it on top
      if (value && typeof value === "string" && value.startsWith("data:image")) {
        const overlay    = new Image();
        overlay.onload   = () => { ctx.drawImage(overlay, 0, 0, W, H); setImgLoaded(true); };
        overlay.onerror  = () => setImgLoaded(true);  // show base if overlay fails
        overlay.src      = value;
      } else {
        setImgLoaded(true);
      }
    };

    img.onerror = () => {
      // Image failed to load — show white canvas with error message
      setImgError(true);
      setImgLoaded(true);  // unhide canvas so error state shows
    };

    img.src = imgUrl;
    console.debug("[AnnotationPad] loading:", imgUrl);  // helps debug path issues
  }, [assetCode]);   // value intentionally omitted — only load on assetCode change

  // ── Canvas helpers ─────────────────────────────────────────────────────────
  const getPos = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const s = e.touches?.[0] || e;
    return { x:(s.clientX-r.left)*(W/r.width), y:(s.clientY-r.top)*(H/r.height) };
  };

  const saveSnapshot = () => {
    const c = canvasRef.current;
    history.current.push(c.getContext("2d").getImageData(0, 0, W, H));
    if (history.current.length > 30) history.current.shift(); // cap at 30 states
  };

  const redrawBase = (ctx) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    if (imgRef.current) {
      const img   = imgRef.current;
      const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
      const dw    = img.naturalWidth  * scale;
      const dh    = img.naturalHeight * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
  };

  // ── Drawing events ─────────────────────────────────────────────────────────
  const onStart = (e) => {
    e.preventDefault();
    saveSnapshot();
    drawing.current = true;
    const c   = canvasRef.current;
    const ctx = c.getContext("2d");
    const p   = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const onMove = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const c   = canvasRef.current;
    const ctx = c.getContext("2d");
    const p   = getPos(e);
    if (tool === "eraser") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = size * 4;
      ctx.lineCap   = "round";
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
      // Re-draw base image where erased to avoid transparent holes
      const erasedData = ctx.getImageData(0, 0, W, H);
      redrawBase(ctx);
      ctx.putImageData(erasedData, 0, 0);
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth   = size;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  };

  const onEnd = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const undo = () => {
    if (!history.current.length) return;
    const snap = history.current.pop();
    canvasRef.current.getContext("2d").putImageData(snap, 0, 0);
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    saveSnapshot();
    const c   = canvasRef.current;
    const ctx = c.getContext("2d");
    redrawBase(ctx);
    onChange("");
  };

  // ── Tool colours ───────────────────────────────────────────────────────────
  const COLOURS = [
    { hex:"#e53e3e", label:"Red"    },
    { hex:"#2b6cb0", label:"Blue"   },
    { hex:"#276749", label:"Green"  },
    { hex:"#744210", label:"Brown"  },
    { hex:"#000000", label:"Black"  },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center", flexWrap:"wrap" }}>

        {/* Colour swatches */}
        {COLOURS.map(cl => (
          <div key={cl.hex} title={cl.label}
            onClick={() => { setTool("pen"); setColor(cl.hex); }}
            style={{ width:22, height:22, borderRadius:"50%", background:cl.hex, cursor:"pointer",
              border: tool==="pen" && color===cl.hex ? "3px solid #334b71" : "2px solid #e7ecf4",
              flexShrink:0 }} />
        ))}

        {/* Eraser */}
        <button title="Eraser"
          onClick={() => setTool("eraser")}
          style={{ padding:"2px 10px", fontSize:12, borderRadius:6, cursor:"pointer",
            border: tool==="eraser" ? "2px solid #334b71" : "1px solid #e7ecf4",
            background: tool==="eraser" ? "#e9edf5" : "#fff",
            fontWeight: tool==="eraser" ? 700 : 400 }}>
          ✏ Eraser
        </button>

        {/* Brush size */}
        <input type="range" min={1} max={10} value={size}
          onChange={e => setSize(parseInt(e.target.value))}
          style={{ width:70 }} />
        <span style={{ fontSize:11, color:"#94a3b8", minWidth:40 }}>Size: {size}</span>

        {/* Undo */}
        <button onClick={undo} title="Undo last stroke"
          style={{ fontSize:12, padding:"2px 10px", borderRadius:6, border:"1px solid #e7ecf4",
            background:"#fff", cursor:"pointer" }}>
          ↩ Undo
        </button>

        {/* Clear */}
        <button onClick={clear} title="Clear all annotations"
          style={{ fontSize:12, padding:"2px 10px", borderRadius:6, border:"1px solid #e7ecf4",
            background:"#fff", cursor:"pointer", color:"#b91c1c" }}>
          ✕ Clear
        </button>
      </div>

      {/* Canvas */}
      {imgError ? (
        <div style={{ width:W, height:H, border:"1px solid #e7ecf4", borderRadius:8,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"#94a3b8", fontSize:13, background:"#f8fafc" }}>
          Body diagram not found. Check annotation assets are seeded.
        </div>
      ) : (
        <div style={{ position:"relative", display:"inline-block" }}>
          {!imgLoaded && (
            <div style={{ position:"absolute", inset:0, display:"flex",
              alignItems:"center", justifyContent:"center",
              background:"#f8fafc", fontSize:12, color:"#94a3b8", borderRadius:8 }}>
              Loading diagram…
            </div>
          )}
          <canvas ref={canvasRef} width={W} height={H}
            style={{ border:"1px solid #e7ecf4", borderRadius:8, cursor: tool==="eraser" ? "cell" : "crosshair",
              touchAction:"none", background:"#fafbfc", display:"block",
              opacity: 1 }}
            onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
            onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} />
        </div>
      )}
      <div style={{ fontSize:10, color:"#94a3b8", marginTop:4 }}>
        Draw on the diagram to mark treatment areas. Use Undo to remove the last stroke.
      </div>
    </div>
  );
};

// ─── Single Field Renderer (fillable) ─────────────────────────────────────────
const FieldRenderer = ({ component, value, onChange, conditions, allValues, allComponents = [] }) => {
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
      return <div><Label /><input type="time" style={inp} value={value||""}
        min={config.min || undefined} max={config.max || undefined}
        onChange={e => onChange(e.target.value)} /></div>;

    case "datetime":
      return <div><Label /><input type="datetime-local" style={inp} value={value||""}
        min={config.min || undefined} max={config.max || undefined}
        onChange={e => onChange(e.target.value)} /></div>;

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
      return <div><Label /><AnnotationPad assetCode={config.assetCode || "ANNO-FACE"} value={value} onChange={onChange} /></div>;

    case "fileupload":
      return (
        <div><Label />
          <input type="file" accept={config.accept || "image/*"}
            onChange={e => {
              const file = e.target.files[0]; if (!file) return;
              compressImage(file).then(({ dataUrl, size }) => {
                onChange({
                  url:       dataUrl,
                  fileName:  file.name,
                  fileSize:  size,
                  mimeType:  file.type.startsWith("image/") ? "image/jpeg" : file.type,
                  imageType: config.imageType || "Other",
                });
              });
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

    case "calculated": {
      // Evaluate formula: replace {Label} tokens with the current value of that field
      const computeResult = () => {
        try {
          let expr = config.formula || "";
          if (!expr.trim()) return "—";

          // Build label → value map from all sibling components
          // Normalise keys: trim whitespace + lowercase for case-insensitive matching
          const labelMap = {};
          for (const comp of allComponents) {
            const v   = allValues[comp.componentId];
            const key = (comp.label || "").trim().toLowerCase();
            labelMap[key] = (v !== undefined && v !== "" && !isNaN(Number(v)))
              ? Number(v) : 0;
          }

          // Replace {Label} tokens with their numeric values
          // Also normalise the token: trim + lowercase to match labelMap keys
          const populated = expr.replace(/\{([^}]+)\}/g, (_, lbl) => {
            const key = lbl.trim().toLowerCase();
            return key in labelMap ? labelMap[key] : 0;
          });

          // Debug: if all tokens resolved to 0, formula may be empty fields — that's OK
          // "Invalid formula" only shows if result is NaN after evaluation

          // Evaluate safely using Function constructor
          // eslint-disable-next-line no-new-func
          const result = new Function(`"use strict"; return (${populated})`)();
          if (!isFinite(result) || isNaN(result)) {
            // NaN/Infinity usually means empty fields (0/0) — show dash until fields are filled
            return "—";
          }
          return Math.round(result * 100) / 100;
        } catch {
          return "Formula error";
        }
      };

      const result = computeResult();
      return (
        <div>
          <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#334b71", marginBottom:6 }}>
            {label}{isMandatory && <span style={{ color:"#b91c1c", marginLeft:2 }}>*</span>}
          </label>
          <div style={{ display:"flex", alignItems:"center", gap:10,
            border:"1px solid #c8d5e8", borderRadius:8, padding:"10px 14px",
            background:"#f0f4fa", fontSize:13 }}>
            <span style={{ fontSize:11, color:"#334b71" }}>🧮</span>
            <strong style={{ color:"#334b71", fontSize:15 }}>{result}</strong>
            <span style={{ fontSize:11, color:"#94a3b8", marginLeft:4 }}>
              = {config.formula || "no formula set"}
            </span>
          </div>
        </div>
      );
    }

    case "table": {
      // config.columns: array of {label, type} objects (or legacy strings)
      const cols = (config.columns || []).map(c =>
        typeof c === "string" ? { label: c, type: "text" } : c
      );
      const defRows  = Math.max(1, config.rows || 3);
      const emptyRow = () => Object.fromEntries(cols.map((_, i) => [`col${i}`, ""]));

      // Seed from defaultRows if no saved value yet
      const seedRows = Array.isArray(config.defaultRows) && config.defaultRows.length > 0
        ? config.defaultRows
        : Array.from({ length: defRows }, emptyRow);

      const rows = Array.isArray(value) && value.length > 0 ? value : seedRows;

      const updateCell = (ri, ci, v) => {
        const next = rows.map((r, idx) =>
          idx === ri ? { ...r, [`col${ci}`]: v } : r
        );
        onChange(next);
      };

      const addRow    = () => onChange([...rows, emptyRow()]);
      const removeRow = (ri) => {
        const next = rows.filter((_, idx) => idx !== ri);
        onChange(next.length ? next : [emptyRow()]);
      };

      return (
        <div style={{ display:"block", width:"100%" }}>
          <Label />
          <div style={{ overflowX:"auto", border:"1px solid #e7ecf4", borderRadius:8 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr>
                  {cols.map((col, ci) => (
                    <th key={ci} style={{
                      border:"1px solid #e7ecf4", padding:"8px 10px",
                      background:"#f8fafc", color:"#334b71", fontWeight:700,
                      textAlign:"left", whiteSpace:"nowrap", fontSize:12,
                    }}>
                      {col.label}
                    </th>
                  ))}
                  <th style={{ background:"#f8fafc", border:"1px solid #e7ecf4", width:32 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {cols.map((col, ci) => {
                      const cellVal = row[`col${ci}`] ?? "";
                      const isFirst = ci === 0 && typeof (config.defaultRows?.[ri]?.col0) === "string" && config.defaultRows[ri].col0;
                      // Col 0 with a pre-seeded name renders as read-only label
                      if (isFirst && !value?.length) {
                        return (
                          <td key={ci} style={{ border:"1px solid #e7ecf4", padding:"6px 10px",
                            fontWeight:600, color:"#334b71", background:"#f8fafc", fontSize:13 }}>
                            {config.defaultRows[ri].col0}
                          </td>
                        );
                      }
                      // Col 0 when value is saved
                      if (ci === 0 && col.type === "text") {
                        return (
                          <td key={ci} style={{ border:"1px solid #e7ecf4", padding:2 }}>
                            <input value={cellVal} onChange={e => updateCell(ri, ci, e.target.value)}
                              style={{ width:"100%", border:"none", outline:"none", padding:"6px 8px",
                                fontSize:13, background:"transparent", boxSizing:"border-box",
                                fontWeight: ri < (config.defaultRows?.length || 0) ? 600 : 400,
                                color:"#334b71" }} />
                          </td>
                        );
                      }
                      if (col.type === "date") {
                        return (
                          <td key={ci} style={{ border:"1px solid #e7ecf4", padding:2 }}>
                            <input type="date" value={cellVal}
                              onChange={e => updateCell(ri, ci, e.target.value)}
                              style={{ width:"100%", border:"none", outline:"none", padding:"6px 8px",
                                fontSize:13, background:"transparent", boxSizing:"border-box",
                                minWidth:130 }} />
                          </td>
                        );
                      }
                      if (col.type === "number") {
                        return (
                          <td key={ci} style={{ border:"1px solid #e7ecf4", padding:2 }}>
                            <input type="number" value={cellVal}
                              onChange={e => updateCell(ri, ci, e.target.value)}
                              style={{ width:"100%", border:"none", outline:"none", padding:"6px 8px",
                                fontSize:13, background:"transparent", boxSizing:"border-box" }} />
                          </td>
                        );
                      }
                      if (col.type === "dropdown") {
                        return (
                          <td key={ci} style={{ border:"1px solid #e7ecf4", padding:2 }}>
                            <select value={cellVal} onChange={e => updateCell(ri, ci, e.target.value)}
                              style={{ width:"100%", border:"none", outline:"none", padding:"6px 8px",
                                fontSize:13, background:"transparent", cursor:"pointer" }}>
                              <option value="">—</option>
                              {(col.options || []).map((o, oi) => <option key={oi} value={o}>{o}</option>)}
                            </select>
                          </td>
                        );
                      }
                      // default: text
                      return (
                        <td key={ci} style={{ border:"1px solid #e7ecf4", padding:2 }}>
                          <input value={cellVal} onChange={e => updateCell(ri, ci, e.target.value)}
                            placeholder="—"
                            style={{ width:"100%", border:"none", outline:"none", padding:"6px 8px",
                              fontSize:13, background:"transparent", boxSizing:"border-box" }} />
                        </td>
                      );
                    })}
                    <td style={{ border:"1px solid #e7ecf4", textAlign:"center", padding:4 }}>
                      <button onClick={() => removeRow(ri)} disabled={rows.length <= 1}
                        style={{ background:"none", border:"none", cursor:"pointer",
                          color:"#94a3b8", fontSize:16, opacity: rows.length <= 1 ? 0.3 : 1 }}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addRow}
            style={{ marginTop:8, padding:"5px 14px", fontSize:12, fontWeight:700,
              color:"#334b71", background:"#f0f4fa",
              border:"1px dashed #334b71", borderRadius:7, cursor:"pointer" }}>
            + Add Row
          </button>
        </div>
      );
    }

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
  whenToFill,           // "Before Service Starts" | "After Service Starts"
  onComplete,           // called when all required forms are submitted
  onClose,
  macroContext = {},    // EMR-FB-019: { customerName, serviceName, centreName, practitionerName, appointmentDate }
  isCustomerFormEdit = false,  // true = edit mode from C360
  existingRecId = null,        // recId of customer form row to pre-populate
  formCodeOverride = null,     // formCode when in edit mode
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

  // Load forms — either appointment flow or Customer Form edit mode
  useEffect(() => {
    if (isCustomerFormEdit && formCodeOverride) {
      // C360 Fill/Edit mode: load form definition, optionally pre-fill from existing submission
      const loadEdit = async () => {
        const def = await authGet(`${API_BASE_URL}/api/EMR/Forms/${formCodeOverride}`);
        const syntheticForm = { formCode: formCodeOverride, formName: def?.formName || "Customer Form" };
        setForms([syntheticForm]);
        setFormDef(def);

        if (existingRecId) {
          // Edit mode: pre-fill from the existing submission
          const sub = await authGet(`${API_BASE_URL}/api/EMR/Submissions/${existingRecId}`);
          setValues(sub?.responseData || {});
        } else {
          // New fill: start with empty values (macro fields populated by macroContext)
          setValues({});
        }
      };
      loadEdit().finally(() => setLoading(false));
      return;
    }

    // ── Customer Form path (formCodeOverride set, no whenToFill) ────────────
    if (formCodeOverride && !whenToFill) {
      const loadCustomer = async () => {
        // Load form definition
        const def = await authGet(`${API_BASE_URL}/api/EMR/Forms/${formCodeOverride}`);
        if (!def || !def.formCode) throw new Error(`Form ${formCodeOverride} not found or inactive`);
        const syntheticForm = { formCode: formCodeOverride, formName: def?.formName || "Customer Form" };
        setForms([syntheticForm]);
        setFormDef(def);

        // Check if customer has already submitted this form — load existing response if so
        if (custId) {
          try {
            const customerForms = await authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`);
            // Response: { submissions: [], customerForms: [...] }
            const cfInner = customerForms?.data ?? customerForms;
            const cfList = [
              ...(Array.isArray(cfInner?.customerForms) ? cfInner.customerForms : []),
              ...(Array.isArray(cfInner?.submissions)   ? cfInner.submissions   : []),
              ...(Array.isArray(cfInner)                ? cfInner               : []),
            ];
            const existing = cfList.find(f => f.formCode === formCodeOverride && (f.submissionId || f.recId));
            const subId = existing?.submissionId || existing?.recId;
            if (subId) {
              const sub = await authGet(`${API_BASE_URL}/api/EMR/Submissions/${subId}`);
              if (sub?.responseData && Object.keys(sub.responseData).length > 0) {
                setValues(sub.responseData);
                return; // skip macro prefill — existing data takes priority
              }
            }
          } catch (e) {
            console.warn("[FormFillModal] Could not load existing submission:", e.message);
          }
        }
        // No existing submission — start fresh with macro prefill
        setValues({});
      };
      loadCustomer()
        .catch(err => { console.error("[FormFillModal] Customer form load error:", err); showToast(err.message); })
        .finally(() => setLoading(false));
      return;
    }

    // ── Service forms path (consent/treatment) ───────────────────────────────
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
    setErrors({});

    // EMR-FB-019: pre-populate macro fields from appointment context
    const macroValues = {};
    const macroMap = {
      customer_name:    macroContext.customerName    || "",
      service_name:     macroContext.serviceName     || "",
      centre_name:      macroContext.centreName      || "",
      practitioner_name:macroContext.practitionerName|| "",
      appointment_date: macroContext.appointmentDate
        ? new Date(macroContext.appointmentDate).toLocaleDateString("en-GB") : "",
    };
    for (const comp of (def?.components || [])) {
      if (comp.componentType === "macro" && comp.config?.macroField) {
        macroValues[comp.componentId] = macroMap[comp.config.macroField] ?? "";
      }
    }

    // Customer data prefill — match by label (case-insensitive) for text/date/dropdown fields
    // Used by Medical History and similar Customer forms opened from appointment sidebar
    if (macroContext.customerName || macroContext.MobileNumber || macroContext.Gender) {
      // Build label → prefill value map
      const labelPrefill = {};
      if (macroContext.customerName) {
        ["full name", "patient name", "name", "customer name"].forEach(k => labelPrefill[k] = macroContext.customerName);
      }
      if (macroContext.MobileNumber) {
        ["phone", "phone number", "mobile", "mobile number", "contact number"].forEach(k => labelPrefill[k] = macroContext.MobileNumber);
      }
      if (macroContext.Gender) {
        ["gender", "sex"].forEach(k => labelPrefill[k] = macroContext.Gender);
      }
      if (macroContext.appointmentDate) {
        // Prefill today's date for "Date" fields that are likely "Date of today" not DOB
        // Only prefill DOB if explicitly provided
      }

      for (const comp of (def?.components || [])) {
        // Only prefill fillable input types — not content/signature/calculated
        if (["content", "logo", "macro", "signature", "calculated", "annotation"].includes(comp.componentType)) continue;
        // Don't overwrite if already set
        if (macroValues[comp.componentId]) continue;
        const labelKey = (comp.label || "").trim().toLowerCase();
        if (labelKey in labelPrefill && labelPrefill[labelKey]) {
          // For dropdown: only set if the value matches one of the options
          if (comp.componentType === "dropdown") {
            const opts = comp.config?.options || [];
            const match = opts.find(o => o.toLowerCase() === labelPrefill[labelKey].toLowerCase());
            if (match) macroValues[comp.componentId] = match;
          } else {
            macroValues[comp.componentId] = labelPrefill[labelKey];
          }
        }
      }
    }

    setValues(macroValues);
  };

  const currentForm = forms[formIndex];

  const validate = () => {
    if (!formDef) return true;
    const e = {};
    for (const comp of formDef.components || []) {
      if (!comp.isMandatory) continue;
      // Skip non-fillable component types — user cannot input values into these
      if (["columnlayout", "calculated", "content", "logo", "annotation", "languagetoggle"].includes(comp.componentType)) continue;
      const val = values[comp.componentId];
      // Signature: must have actual drawn data (not just empty string)
      if (comp.componentType === "signature") {
        const empty = !val || (typeof val === "string" && (val.trim() === "" || val === "data:,"));
        if (empty) e[comp.componentId] = "Signature is required.";
        continue;
      }
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
      const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");

      // Customer Form: either C360 edit OR first-visit from appointment flow
      // Detected by: isCustomerFormEdit flag (C360) OR formCodeOverride present with no whenToFill (appointment)
      const isCustomerFormSubmit = isCustomerFormEdit || (formCodeOverride && !whenToFill);
      if (isCustomerFormSubmit) {
        const res = await authPost(`${API_BASE_URL}/api/EMR/Forms/SubmitCustomer`, {
          formCode:    currentForm.formCode,
          custId,
          centerCode,
          responseData:values,
          filledBy:    u.employeeCode || custId,
        });
        if (!res.success) throw new Error(res.message);
        onComplete();
        return;
      }

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

  const updateValue = (compId, val, isColumnLayout = false) => {
    if (isColumnLayout && val && typeof val === "object" && !Array.isArray(val)) {
      // Spread child component values directly into top-level values
      setValues(p => ({ ...p, ...val }));
    } else {
      setValues(p => ({ ...p, [compId]: val }));
    }
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
              {(formDef.components || []).filter(c => !c.parentId).map(comp => (
                <div key={comp.componentId} style={{ marginBottom:18 }}>
                  <FieldRenderer
                    component={comp}
                    value={values[comp.componentId]}
                    onChange={val => updateValue(comp.componentId, val, comp.componentType === "columnlayout")}
                    conditions={formDef.conditions || []}
                    allValues={values}
                    allComponents={formDef.components || []}
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