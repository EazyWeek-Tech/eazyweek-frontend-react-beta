import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { API_BASE_URL } from "../../config";
import ComponentEditor from "./ComponentEditor";
import ComponentPreview from "./ComponentPreview";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet  = async (url) => { const r = await fetch(url, { headers:{ Authorization:`Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => { const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) }); return r.json(); };
const authPut  = async (url, body) => { const r = await fetch(url, { method:"PUT",  headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) }); return r.json(); };

// ─── 21 Component Types ───────────────────────────────────────────────────────
export const COMPONENT_TYPES = [
  // Input fields
  { type:"text",        label:"Short Text",     icon:"📝", group:"Input" },
  { type:"textarea",    label:"Long Text",       icon:"📄", group:"Input" },
  { type:"number",      label:"Number",          icon:"🔢", group:"Input" },
  { type:"date",        label:"Date",            icon:"📅", group:"Input" },
  { type:"time",        label:"Time",            icon:"🕐", group:"Input" },
  { type:"datetime",    label:"Date & Time",     icon:"🗓", group:"Input" },
  // Choice
  { type:"dropdown",    label:"Dropdown",        icon:"⬇", group:"Choice" },
  { type:"radio",       label:"Radio",           icon:"🔘", group:"Choice" },
  { type:"checkbox",    label:"Checkbox",        icon:"☑", group:"Choice" },
  // Special
  { type:"signature",   label:"Signature",       icon:"✍", group:"Special" },
  { type:"fileupload",  label:"File / Image",    icon:"📎", group:"Special" },
  { type:"annotation",  label:"Annotation Pad",  icon:"🖊", group:"Special" },
  { type:"macro",       label:"Macro",           icon:"⚡", group:"Special" },
  // Content
  { type:"content",     label:"Static Content",  icon:"📃", group:"Content" },
  { type:"logo",        label:"Logo",            icon:"🏷", group:"Content" },
  // Layout
  { type:"columnlayout",label:"Columns",         icon:"⬜", group:"Layout" },
  { type:"collapsible", label:"Collapsible",     icon:"🗂", group:"Layout" },
  { type:"tabs",        label:"Tabs",            icon:"📑", group:"Layout" },
  { type:"table",       label:"Table",           icon:"⬛", group:"Layout" },
  // Logic
  { type:"calculated",  label:"Calculated",      icon:"🧮", group:"Logic" },
  { type:"conditional", label:"Conditional",     icon:"🔀", group:"Logic" },
];

const GROUPS = ["Input","Choice","Special","Content","Layout","Logic"];

const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);

// ─── Palette Item (drag source from panel) ────────────────────────────────────
const PaletteItem = ({ type, label, icon }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `palette::${type}`,
    data: { isPalette: true, componentType: type },
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
        border:"1px solid #e7ecf4", borderRadius:8, cursor:"grab", userSelect:"none",
        background: isDragging ? "#e9edf5" : "#fff",
        opacity: isDragging ? 0.5 : 1, fontSize:12, fontWeight:600, color:"#334b71",
        transition:"background .1s" }}>
      <span style={{ fontSize:15 }}>{icon}</span>
      {label}
    </div>
  );
};

// ─── Canvas Item (sortable component in builder) ──────────────────────────────
const CanvasItem = ({ component, isSelected, onClick, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: component.componentId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={{ ...style, position:"relative", marginBottom:8 }}>
      <div onClick={() => onClick(component.componentId)}
        style={{ border:`2px solid ${isSelected?"#334b71":"#e7ecf4"}`,
          borderRadius:10, padding:"10px 14px", background:isSelected?"#f0f4fa":"#fff",
          cursor:"pointer", transition:"all .1s" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {/* Drag handle */}
            <span {...attributes} {...listeners}
              style={{ cursor:"grab", color:"#cbd5e1", fontSize:16, lineHeight:1, padding:"0 2px" }}>
              ⠿
            </span>
            <span style={{ fontSize:13 }}>
              {COMPONENT_TYPES.find(c => c.type === component.componentType)?.icon || "📝"}
            </span>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"#334b71" }}>
                {component.label || COMPONENT_TYPES.find(c => c.type === component.componentType)?.label || component.componentType}
                {component.isMandatory && <span style={{ color:"#b91c1c", marginLeft:4 }}>*</span>}
              </div>
              <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>{component.componentType}</div>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete(component.componentId); }}
            style={{ background:"none", border:"none", cursor:"pointer", color:"#cbd5e1",
              fontSize:16, padding:"2px 6px", borderRadius:4 }}
            onMouseEnter={e => e.target.style.color="#b91c1c"}
            onMouseLeave={e => e.target.style.color="#cbd5e1"}>
            ×
          </button>
        </div>

        {/* Inline preview */}
        <div style={{ marginTop:8, pointerEvents:"none" }}>
          <ComponentPreview component={component} compact />
        </div>
      </div>
    </div>
  );
};

// ─── Main FormBuilder ─────────────────────────────────────────────────────────
export default function FormBuilder() {
  const { formCode } = useParams();
  const navigate     = useNavigate();

  const [form,        setForm]        = useState(null);
  const [components,  setComponents]  = useState([]);
  const [conditions,  setConditions]  = useState([]);
  const [selectedId,  setSelectedId]  = useState(null);
  const [activeId,    setActiveId]    = useState(null);
  const [mode,        setMode]        = useState("build");  // build | preview | conditions
  const [previewSize, setPreviewSize] = useState("desktop");
  const [saving,      setSaving]      = useState(false);
  const [isDirty,     setIsDirty]     = useState(false);  // true when unsaved changes exist
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const [groupOpen,   setGroupOpen]   = useState({ Input:true, Choice:true, Special:true, Content:false, Layout:false, Logic:false });

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Load form
  useEffect(() => {
    if (!formCode) return;
    authGet(`${API_BASE_URL}/api/EMR/Forms/${formCode}`)
      .then(data => {
        if (!data?.formCode) return;
        setForm(data);
        setComponents(data.components || []);
        setConditions(data.conditions || []);
      })
      .finally(() => setLoading(false));
  }, [formCode]);

  const selectedComp = components.find(c => c.componentId === selectedId);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id);
    setSelectedId(null);
  }, []);

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null);
    if (!over) return;

    const isPalette = active.data.current?.isPalette;

    if (isPalette) {
      const compType = active.data.current.componentType;
      const newId    = uuid();  // generate once, reuse in both closures

      setComponents(prev => {
        const newComp = {
          componentId:   newId,
          componentType: compType,
          label:         COMPONENT_TYPES.find(c => c.type === compType)?.label || compType,
          isMandatory:   false,
          sortOrder:     prev.length,
          config:        _defaultConfig(compType),
          parentId:      null,
        };
        const overIndex = prev.findIndex(c => c.componentId === over.id);
        if (overIndex >= 0) {
          const next = [...prev];
          next.splice(overIndex, 0, newComp);
          return next;
        }
        return [...prev, newComp];
      });
      setSelectedId(newId);
      setIsDirty(true);
    } else {
      if (active.id !== over.id) {
        setComponents(prev => {
          const oldIndex = prev.findIndex(c => c.componentId === active.id);
          const newIndex = prev.findIndex(c => c.componentId === over.id);
          if (oldIndex !== -1 && newIndex !== -1)
            return arrayMove(prev, oldIndex, newIndex);
          return prev;
        });
      }
    }
  }, []);  // stable — functional updaters mean no dependency on [components]

  const handleCloseEditor = useCallback(() => setSelectedId(null), []);

  const handleDeleteComponent = useCallback((id) => {
    setComponents(p => p.filter(c => c.componentId !== id));
    setConditions(p => p.filter(c => c.triggerCompId !== id && c.targetCompId !== id));
    setSelectedId(p => p === id ? null : p);
    setIsDirty(true);
  }, []);

  // Stable reference — uses functional updater, no deps needed
  // This is the KEY fix: previously this was recreated on every render, causing
  // ComponentEditor to lose focus after each keystroke
  const handleUpdateComponent = useCallback((updated) => {
    setComponents(p => p.map(c => c.componentId === updated.componentId ? updated : c));
    setIsDirty(true);
  }, []);  // ← [] means this function reference never changes → editor never remounts

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (status) => {
    setSaving(true);
    try {
      // 1. Update form status if changed
      await authPut(`${API_BASE_URL}/api/EMR/Forms/${formCode}`, {
        formName: form.formName,
        status:   status || form.status,
      });

      // 2. Save components
      const compRes = await authPost(`${API_BASE_URL}/api/EMR/Forms/SaveComponents`, {
        formCode, components: components.map((c, i) => ({ ...c, sortOrder: i })),
      });
      if (!compRes.success) throw new Error(compRes.message);

      // 3. Save conditions
      const condRes = await authPost(`${API_BASE_URL}/api/EMR/Forms/SaveConditions`, {
        formCode, conditions,
      });
      if (!condRes.success) throw new Error(condRes.message);

      setIsDirty(false);
      showToast(status === "Active" ? "Form published and Active." : "Form saved.");
      if (status) setForm(p => ({ ...p, status }));
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:"#64748b", fontFamily:"Lato,sans-serif" }}>Loading form…</div>;
  if (!form)   return <div style={{ padding:60, textAlign:"center", color:"#b91c1c", fontFamily:"Lato,sans-serif" }}>Form not found.</div>;

  // ── Component IDs for sortable context ────────────────────────────────────
  const sortableIds = [
    ...COMPONENT_TYPES.map(ct => `palette::${ct.type}`),
    ...components.map(c => c.componentId),
  ];

  return (
    <div style={{ fontFamily:"Lato,sans-serif", background:"#f7f9fc", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <style>{`
        .fb-toolbar { background:#fff; border-bottom:1px solid #e7ecf4; padding:12px 20px;
          display:flex; align-items:center; justify-content:space-between; gap:12; position:sticky; top:0; z-index:100; }
        .fb-body { display:flex; height:calc(100vh - 57px); overflow:hidden; }
        .fb-panel { width:230px; border-right:1px solid #e7ecf4; background:#fff;
          overflow-y:auto; padding:12px; flex-shrink:0; }
        .fb-canvas { flex:1; overflow-y:auto; padding:20px; }
        .fb-editor { width:280px; border-left:1px solid #e7ecf4; background:#fff;
          overflow-y:auto; padding:16px; flex-shrink:0; }
        .group-header { display:flex; justify-content:space-between; align-items:center;
          padding:6px 8px; cursor:pointer; border-radius:6px; font-size:11px;
          font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:.8px; }
        .group-header:hover { background:#f8fafc; }
        .tab-btn { padding:8px 16px; border:none; border-radius:8px; font-weight:700;
          font-size:13px; cursor:pointer; transition:all .15s; }
        .tab-btn.active { background:#334b71; color:#fff; }
        .tab-btn:not(.active) { background:#f1f5f9; color:#64748b; }
        .canvas-drop { min-height:400px; border:2px dashed #e7ecf4; border-radius:12px;
          padding:16px; background:#fafbfc; }
        .canvas-drop.over { border-color:#334b71; background:#f0f4fa; }
        .pri-btn { background:#334b71; color:#fff; border:none; border-radius:8px;
          padding:9px 18px; font-weight:800; font-size:13px; cursor:pointer; }
        .pri-btn:disabled { opacity:.55; cursor:not-allowed; }
        .sec-btn { background:#fff; border:1px solid #e7ecf4; border-radius:8px;
          padding:8px 16px; font-weight:700; font-size:13px; color:#334b71; cursor:pointer; }
        .pub-btn { background:#2e7d5e; color:#fff; border:none; border-radius:8px;
          padding:9px 18px; font-weight:800; font-size:13px; cursor:pointer; }
      `}</style>

      {/* Toolbar */}
      <div className="fb-toolbar">
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button className="sec-btn" style={{ padding:"7px 12px" }}
            onClick={() => {
              if (isDirty) {
                const ok = window.confirm(
                  "You have unsaved changes.\n\nClick OK to discard and go back, or Cancel to stay and save."
                );
                if (!ok) return;
              }
              navigate("/emr/forms");
            }}>
            ← Back
          </button>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:"#071D49" }}>{form.formName}</div>
            <div style={{ fontSize:11, color:"#94a3b8" }}>{form.formCode} · {form.formType}</div>
          </div>
          <span style={{ padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700,
            background: form.status==="Active"?"#dcfce7":"#f1f5f9",
            color:      form.status==="Active"?"#166534":"#64748b" }}>
            {form.status}
          </span>
        </div>

        {/* Mode tabs */}
        <div style={{ display:"flex", gap:6 }}>
          {["build","preview","conditions"].map(m => (
            <button key={m} className={`tab-btn ${mode===m?"active":""}`} onClick={() => setMode(m)}>
              {m==="build"?"🔧 Build":m==="preview"?"👁 Preview":"🔀 Conditions"}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {toast && (
            <span style={{ fontSize:12, fontWeight:600,
              color:toast.type==="error"?"#b91c1c":"#2e7d5e" }}>
              {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
            </span>
          )}
          <span style={{ fontSize:12, color:"#94a3b8" }}>{components.length} components</span>
          <button className="sec-btn"
            onClick={async () => {
              await handleSave();
              navigate("/emr/forms");
            }}
            disabled={saving}>
            {saving ? "Saving…" : "Save & Close"}
          </button>
          <button className="pub-btn" onClick={() => handleSave("Active")} disabled={saving}>
            {saving ? "…" : "✓ Publish"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="fb-body">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>

            {/* ── Left Panel — Component Palette ── */}
            {mode === "build" && (
              <div className="fb-panel">
                <div style={{ fontSize:11, fontWeight:800, color:"#94a3b8", textTransform:"uppercase",
                  letterSpacing:.8, marginBottom:10 }}>Components</div>
                {GROUPS.map(group => (
                  <div key={group} style={{ marginBottom:8 }}>
                    <div className="group-header" onClick={() => setGroupOpen(p => ({ ...p, [group]:!p[group] }))}>
                      {group}
                      <span>{groupOpen[group]?"▾":"▸"}</span>
                    </div>
                    {groupOpen[group] && (
                      <div style={{ display:"flex", flexDirection:"column", gap:4, padding:"4px 0 8px" }}>
                        {COMPONENT_TYPES.filter(c => c.group === group).map(ct => (
                          <PaletteItem key={ct.type} {...ct} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Centre — Canvas ── */}
            <div className="fb-canvas">
              {mode === "build" && (
                <>
                  <div className="canvas-drop">
                    {components.length === 0 ? (
                      <div style={{ textAlign:"center", padding:"60px 20px", color:"#94a3b8" }}>
                        <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
                        <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Start building your form</div>
                        <div style={{ fontSize:13 }}>Drag components from the left panel and drop them here</div>
                      </div>
                    ) : (
                      components.map(comp => (
                        <CanvasItem key={comp.componentId} component={comp}
                          isSelected={selectedId === comp.componentId}
                          onClick={setSelectedId}
                          onDelete={handleDeleteComponent} />
                      ))
                    )}
                  </div>
                </>
              )}

              {mode === "preview" && (
                <div>
                  {/* Preview size selector */}
                  <div style={{ display:"flex", gap:8, marginBottom:16, justifyContent:"center" }}>
                    {[
                      { id:"desktop",  label:"🖥 Desktop",  width:"100%" },
                      { id:"tablet",   label:"📱 Tablet",   width:768 },
                      { id:"mobile",   label:"📱 Mobile",   width:375 },
                    ].map(s => (
                      <button key={s.id} className={`tab-btn ${previewSize===s.id?"active":""}`}
                        onClick={() => setPreviewSize(s.id)}>{s.label}</button>
                    ))}
                  </div>
                  <div style={{ maxWidth: previewSize==="desktop"?"100%":previewSize==="tablet"?"768px":"375px",
                    margin:"0 auto", background:"#fff", border:"1px solid #e7ecf4",
                    borderRadius:12, padding:24, boxShadow:"0 2px 12px rgba(0,0,0,.06)" }}>
                    <div style={{ fontWeight:800, fontSize:18, color:"#071D49", marginBottom:4 }}>{form.formName}</div>
                    <div style={{ fontSize:12, color:"#94a3b8", marginBottom:20 }}>{form.formType}</div>
                    {components.map(comp => (
                      <div key={comp.componentId} style={{ marginBottom:16 }}>
                        <ComponentPreview component={comp} />
                      </div>
                    ))}
                    {components.length > 0 && (
                      <button style={{ width:"100%", marginTop:8, padding:"12px",
                        background:"#334b71", color:"#fff", border:"none",
                        borderRadius:10, fontWeight:800, fontSize:14, cursor:"pointer" }}>
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              )}

              {mode === "conditions" && (
                <ConditionsPanel
                  components={components}
                  conditions={conditions}
                  onChange={setConditions}
                />
              )}
            </div>

          </SortableContext>

          {/* Drag overlay */}
          <DragOverlay>
            {activeId && (
              <div style={{ background:"#334b71", color:"#fff", borderRadius:8,
                padding:"8px 14px", fontSize:13, fontWeight:700,
                boxShadow:"0 4px 14px rgba(0,0,0,.2)", opacity:.9 }}>
                {COMPONENT_TYPES.find(c => `palette::${c.type}` === activeId)?.label ||
                 components.find(c => c.componentId === activeId)?.label || "Component"}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* ── Right Panel — Component Editor ──────────────────────────────────
            IMPORTANT: kept OUTSIDE DndContext intentionally.
            dnd-kit's PointerSensor attaches global pointer listeners that
            steal focus from inputs on every re-render when the editor is
            inside the DnD tree. Placing it outside fixes the one-letter bug. */}
        {mode === "build" && selectedComp && (
          <div className="fb-editor">
            <ComponentEditor
              key={selectedId}
              component={selectedComp}
              onChange={handleUpdateComponent}
              onClose={handleCloseEditor}
            />
          </div>
        )}

        {mode === "build" && !selectedComp && (
          <div className="fb-editor" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ textAlign:"center", color:"#94a3b8", padding:20 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>👆</div>
              <div style={{ fontSize:13, fontWeight:600 }}>Click a component to edit its properties</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Conditions Panel ─────────────────────────────────────────────────────────
const ConditionsPanel = ({ components, conditions, onChange }) => {
  const eligible = components.filter(c => ["dropdown","radio","checkbox"].includes(c.componentType));

  const addCondition = () => onChange(p => [...p, {
    triggerCompId: eligible[0]?.componentId || "",
    triggerValue:  "",
    targetCompId:  "",
    action:        "show",
  }]);

  const updateCond = (i, field, val) =>
    onChange(p => p.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const removeCond = (i) => onChange(p => p.filter((_, idx) => idx !== i));

  return (
    <div style={{ maxWidth:700, margin:"0 auto" }}>
      <div style={{ fontWeight:800, fontSize:15, color:"#071D49", marginBottom:4 }}>🔀 Conditional Logic</div>
      <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
        Show or hide components based on other field values. Circular dependencies are not allowed.
      </div>

      {conditions.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8", fontSize:13 }}>
          No conditions added yet. Click "+ Add Condition" to start.
        </div>
      )}

      {conditions.map((cond, i) => (
        <div key={i} style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:10, padding:16, marginBottom:10 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 60px 1fr auto", gap:10, alignItems:"center" }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>WHEN</div>
              <select value={cond.triggerCompId} onChange={e => updateCond(i,"triggerCompId",e.target.value)}
                style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12 }}>
                <option value="">Select field…</option>
                {eligible.map(c => <option key={c.componentId} value={c.componentId}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>EQUALS</div>
              <input value={cond.triggerValue} onChange={e => updateCond(i,"triggerValue",e.target.value)}
                placeholder="Value…"
                style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12, boxSizing:"border-box" }} />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>THEN</div>
              <select value={cond.action} onChange={e => updateCond(i,"action",e.target.value)}
                style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12 }}>
                <option value="show">Show</option>
                <option value="hide">Hide</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>FIELD</div>
              <select value={cond.targetCompId} onChange={e => updateCond(i,"targetCompId",e.target.value)}
                style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12 }}>
                <option value="">Select field…</option>
                {components.filter(c => c.componentId !== cond.triggerCompId).map(c => (
                  <option key={c.componentId} value={c.componentId}>{c.label}</option>
                ))}
              </select>
            </div>
            <button onClick={() => removeCond(i)}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#b91c1c", fontSize:18 }}>×</button>
          </div>
        </div>
      ))}

      <button onClick={addCondition}
        style={{ background:"#fff", border:"1px dashed #334b71", borderRadius:8,
          padding:"10px 20px", fontWeight:700, fontSize:13, color:"#334b71", cursor:"pointer", width:"100%", marginTop:8 }}>
        + Add Condition
      </button>
    </div>
  );
};

// ─── Default config per component type ───────────────────────────────────────
const _defaultConfig = (type) => {
  switch (type) {
    case "dropdown":
    case "radio":
    case "checkbox":    return { options: ["Option 1", "Option 2", "Option 3"] };
    case "columnlayout":return { columns: 2 };
    case "table":       return { columns: ["Column 1", "Column 2"], rows: 3 };
    case "tabs":        return { tabs: ["Tab 1", "Tab 2"] };
    case "collapsible": return { title: "Section", defaultOpen: false };
    case "calculated":  return { formula: "", dependsOn: [] };
    case "annotation":  return { assetCode: "ANNO-FACE" };
    case "signature":   return { label: "Sign here" };
    case "fileupload":  return { accept: "image/*", maxSizeMb: 5, imageType: "Other" };
    case "content":     return { html: "<p>Add your text here</p>" };
    case "macro":       return { macroType: "PatientName" };
    case "logo":        return { align: "left" };
    default:            return {};
  }
};