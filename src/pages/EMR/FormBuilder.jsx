import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext, DragOverlay, closestCenter, closestCorners, pointerWithin,
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

const LANG_TOGGLE_ID = "__lang_toggle__";  // fixed ID for the language toggle component

export const COMPONENT_TYPES = [
  { type:"text",         label:"Short Text",      icon:"📝", group:"Input" },
  { type:"textarea",     label:"Long Text",        icon:"📄", group:"Input" },
  { type:"number",       label:"Number",           icon:"🔢", group:"Input" },
  { type:"date",         label:"Date",             icon:"", group:"Input" },
  { type:"time",         label:"Time",             icon:"🕐", group:"Input" },
  { type:"datetime",     label:"Date & Time",      icon:"🗓", group:"Input" },
  { type:"dropdown",     label:"Dropdown",         icon:"⬇", group:"Choice" },
  { type:"radio",        label:"Radio",            icon:"🔘", group:"Choice" },
  { type:"checkbox",     label:"Checkbox",         icon:"☑", group:"Choice" },
  { type:"signature",    label:"Signature",        icon:"✍", group:"Special" },
  { type:"fileupload",   label:"File / Image",     icon:"📎", group:"Special" },
  { type:"annotation",   label:"Annotation Pad",   icon:"🖊", group:"Special" },
  { type:"macro",        label:"Macro",            icon:"⚡", group:"Special" },
  { type:"content",      label:"Static Content",   icon:"📃", group:"Content" },
  { type:"logo",         label:"Logo",             icon:"", group:"Content" },
  { type:"columnlayout", label:"Columns",          icon:"⬜", group:"Layout" },
  { type:"collapsible",  label:"Collapsible",      icon:"🗂", group:"Layout" },
  { type:"tabs",         label:"Tabs",             icon:"📑", group:"Layout" },
  { type:"table",        label:"Table",            icon:"⬛", group:"Layout" },
  { type:"calculated",   label:"Calculated",       icon:"🧮", group:"Logic" },
  { type:"conditional",  label:"Conditional",      icon:"🔀", group:"Logic" },
];

const GROUPS = ["Input","Choice","Special","Content","Layout","Logic"];
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);

// ─── Palette Item ─────────────────────────────────────────────────────────────
const PaletteItem = ({ type, label, icon }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `palette::${type}`, data: { isPalette: true, componentType: type },
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
        border:"1px solid #e7ecf4", borderRadius:8, cursor:"grab", userSelect:"none",
        background: isDragging ? "#e9edf5" : "#fff", opacity: isDragging ? 0.5 : 1,
        fontSize:12, fontWeight:600, color:"#334b71" }}>
      <span style={{ fontSize:15 }}>{icon}</span>{label}
    </div>
  );
};

// ─── Column Slot ──────────────────────────────────────────────────────────────
const ColumnSlot = ({ parentId, colIndex, child, isSelected, onSelectChild, onDeleteChild, allComponents = [] }) => {
  const slotId = `slot::${parentId}::${colIndex}`;
  const { setNodeRef, isOver } = useSortable({
    id: slotId,
    data: { isSlot: true, parentId, colIndex },
    disabled: true,   // slots are drop targets only — not draggable themselves
  });
  return (
    <div ref={setNodeRef}
      style={{ minHeight:70, border:`2px dashed ${isOver?"#334b71":"#A7D1CD"}`, borderRadius:8,
        padding:8, background: isOver?"#eef4fb":"#f8fbfc", transition:"all .15s" }}>
      {child ? (
        <div onClick={e => { e.stopPropagation(); onSelectChild(child.componentId); }}
          style={{ border:`2px solid ${isSelected?"#334b71":"#e7ecf4"}`, borderRadius:8,
            padding:"8px 10px", background:isSelected?"#f0f4fa":"#fff", cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#334b71" }}>
              {COMPONENT_TYPES.find(c => c.type === child.componentType)?.icon} {child.label}
              {child.isMandatory && <span style={{ color:"#b91c1c", marginLeft:3 }}>*</span>}
            </span>
            <button onClick={e => { e.stopPropagation(); onDeleteChild(child.componentId); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#cbd5e1", fontSize:14 }}
              onMouseEnter={e => e.target.style.color="#b91c1c"}
              onMouseLeave={e => e.target.style.color="#cbd5e1"}>×</button>
          </div>
          <div style={{ pointerEvents:"none" }}><ComponentPreview component={child} compact allComponents={allComponents} /></div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", height:54, gap:4, color:"#A7D1CD" }}>
          <span style={{ fontSize:18 }}>＋</span>
          <span style={{ fontSize:10, fontWeight:600 }}>Drop field here</span>
        </div>
      )}
    </div>
  );
};

// ─── Column Layout Canvas Item ────────────────────────────────────────────────
const ColumnLayoutItem = ({ component, isSelected, onClick, onDelete, childComponents,
  selectedId, onSelectChild, onDeleteChild, allComponents = [], isBilingual }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: component.componentId });
  const colCount = component.config?.columns || 2;
  const langBadge = isBilingual && component.lang
    ? <span style={{ fontSize:10, fontWeight:800, padding:"1px 6px", borderRadius:4,
        background: component.lang==="en"?"#dbeafe":"#fef3c7",
        color: component.lang==="en"?"#1d4ed8":"#92400e", marginLeft:6 }}>
        {component.lang.toUpperCase()}
      </span>
    : null;
  return (
    <div ref={setNodeRef}
      style={{ transform:CSS.Transform.toString(transform), transition, opacity:isDragging?0.4:1, marginBottom:8 }}>
      <div onClick={() => onClick(component.componentId)}
        style={{ border:`2px solid ${isSelected?"#334b71":"#A7D1CD"}`, borderRadius:10,
          padding:"10px 14px", background:isSelected?"#f0f4fa":"#f8fbfc", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span {...attributes} {...listeners} style={{ cursor:"grab", color:"#cbd5e1", fontSize:16, padding:"0 2px" }}>⠿</span>
            <span>⬜</span>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"#334b71" }}>{component.label || "Columns"}{langBadge}</div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>{colCount} column layout</div>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete(component.componentId); }}
            style={{ background:"none", border:"none", cursor:"pointer", color:"#cbd5e1", fontSize:16 }}
            onMouseEnter={e => e.target.style.color="#b91c1c"}
            onMouseLeave={e => e.target.style.color="#cbd5e1"}>×</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${colCount}, 1fr)`, gap:8 }}
          onClick={e => e.stopPropagation()}>
          {Array.from({ length: colCount }).map((_, colIdx) => (
            <ColumnSlot key={colIdx} parentId={component.componentId} colIndex={colIdx}
              child={childComponents.find(c => c.columnIndex === colIdx)}
              isSelected={selectedId === childComponents.find(c => c.columnIndex === colIdx)?.componentId}
              onSelectChild={onSelectChild} onDeleteChild={onDeleteChild}
              allComponents={allComponents} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Regular Canvas Item ──────────────────────────────────────────────────────
const CanvasItem = ({ component, isSelected, onClick, onDelete, allComponents = [], isBilingual, onDuplicateAsArabic }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: component.componentId });

  const isLangToggle = component.componentId === LANG_TOGGLE_ID;
  const langBadge = isBilingual && component.lang
    ? <span style={{ fontSize:10, fontWeight:800, padding:"1px 6px", borderRadius:4,
        background: component.lang==="en"?"#dbeafe":"#fef3c7",
        color: component.lang==="en"?"#1d4ed8":"#92400e", marginLeft:6 }}>
        {component.lang.toUpperCase()}
      </span>
    : null;

  return (
    <div ref={setNodeRef}
      style={{ transform:CSS.Transform.toString(transform), transition, opacity:isDragging?0.4:1, marginBottom:8 }}>
      <div onClick={() => onClick(component.componentId)}
        style={{ border:`2px solid ${isLangToggle?"#A7D1CD":isSelected?"#334b71":"#e7ecf4"}`,
          borderRadius:10, padding:"10px 14px",
          background: isLangToggle?"#f0faf9":isSelected?"#f0f4fa":"#fff",
          cursor: isLangToggle?"default":"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {!isLangToggle && (
              <span {...attributes} {...listeners}
                style={{ cursor:"grab", color:"#cbd5e1", fontSize:16, padding:"0 2px" }}>⠿</span>
            )}
            <span style={{ fontSize:13 }}>{isLangToggle ? "🌐" : COMPONENT_TYPES.find(c => c.type === component.componentType)?.icon || "📝"}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"#334b71" }}>
                {component.label}
                {langBadge}
                {isLangToggle && <span style={{ fontSize:10, color:"#64748b", fontWeight:400, marginLeft:6 }}>Auto-inserted · not deletable</span>}
              </div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>{component.componentType}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {/* "Add AR version" button — only on EN components in bilingual mode */}
            {isBilingual && component.lang === "en" && !isLangToggle && (
              <button
                onClick={e => { e.stopPropagation(); onDuplicateAsArabic(component.componentId); }}
                title="Duplicate as Arabic version"
                style={{ background:"#fef3c7", border:"1px solid #fcd34d", borderRadius:6,
                  padding:"3px 8px", fontSize:10, fontWeight:700, color:"#92400e", cursor:"pointer" }}>
                + AR
              </button>
            )}
            {!isLangToggle && (
              <button onClick={e => { e.stopPropagation(); onDelete(component.componentId); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#cbd5e1", fontSize:16 }}
                onMouseEnter={e => e.target.style.color="#b91c1c"}
                onMouseLeave={e => e.target.style.color="#cbd5e1"}>×</button>
            )}
          </div>
        </div>
        <div style={{ marginTop:8, pointerEvents:"none" }}>
          <ComponentPreview component={component} compact allComponents={allComponents} />
        </div>
      </div>
    </div>
  );
};

// ─── Main FormBuilder ─────────────────────────────────────────────────────────
export default function FormBuilder() {
  const { formCode } = useParams();
  const navigate = useNavigate();

  const [form,        setForm]        = useState(null);
  const [components,  setComponents]  = useState([]);
  const [conditions,  setConditions]  = useState([]);
  const [selectedId,  setSelectedId]  = useState(null);
  const [activeId,    setActiveId]    = useState(null);
  const [mode,        setMode]        = useState("build");
  const [previewSize, setPreviewSize] = useState("desktop");
  const [previewLang, setPreviewLang] = useState("en");
  const [saving,      setSaving]      = useState(false);
  const [isDirty,     setIsDirty]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const [groupOpen,   setGroupOpen]   = useState({ Input:true, Choice:true, Special:true, Content:false, Layout:false, Logic:false });

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance:5 } }));

  // Is bilingual mode on?
  const isBilingual = components.some(c => c.componentId === LANG_TOGGLE_ID);

  useEffect(() => {
    if (!formCode) return;
    authGet(`${API_BASE_URL}/api/EMR/Forms/${formCode}`)
      .then(data => {
        if (!data?.formCode) return;
        setForm(data);
        const conds     = data.conditions || [];
        const rawComps  = data.components  || [];
        const hasToggle = rawComps.some(c => c.componentId === LANG_TOGGLE_ID);
        // `lang` isn't stored on the component row — it lives in the language
        // condition (triggerCompId = toggle). Rehydrate it so the editor switcher
        // and badges reflect the real saved state after reload.
        const comps = hasToggle
          ? rawComps.map(c => {
              if (c.componentId === LANG_TOGGLE_ID) return c;
              const langCond = conds.find(cd => cd.triggerCompId === LANG_TOGGLE_ID && cd.targetCompId === c.componentId);
              return { ...c, lang: langCond ? langCond.triggerValue : (c.lang || "en") };
            })
          : rawComps;
        setComponents(comps);
        setConditions(conds);
      })
      .finally(() => setLoading(false));
  }, [formCode]);

  const topLevelComponents = components.filter(c => !c.parentId);
  const childrenOf = (parentId) => components.filter(c => c.parentId === parentId);
  const selectedComp = components.find(c => c.componentId === selectedId);

  // ── Enable Bilingual ───────────────────────────────────────────────────────
  const handleEnableBilingual = useCallback(() => {
    if (isBilingual) {
      // Disable: remove toggle + strip lang tags + remove lang conditions
      const ok = window.confirm("Remove bilingual mode? This will remove the language toggle and all language conditions.");
      if (!ok) return;
      setComponents(p => p
        .filter(c => c.componentId !== LANG_TOGGLE_ID)
        .map(c => { const { lang, ...rest } = c; return rest; })
      );
      setConditions(p => p.filter(c => c.triggerCompId !== LANG_TOGGLE_ID));
      setIsDirty(true);
      return;
    }

    // Enable: insert toggle at top, tag all existing components as "en", auto-wire conditions
    const toggleComp = {
      componentId:   LANG_TOGGLE_ID,
      componentType: "languagetoggle",
      label:         "Select Language",
      isMandatory:   false,
      sortOrder:     0,
      config:        { options:["en","ar"] },
      parentId:      null,
      columnIndex:   null,
      lang:          null,  // the toggle itself has no lang
    };

    // Single setComponents call — avoids double-insert of the toggle
    setComponents(prev => {
      // Guard: if toggle already exists (loaded from DB), don't insert again
      if (prev.some(c => c.componentId === LANG_TOGGLE_ID)) return prev;

      const tagged  = prev.map(c => ({ ...c, lang: c.lang || "en" }));
      const toggled = [toggleComp, ...tagged];

      // Auto-wire conditions for all top-level non-toggle components
      const newConds = tagged
        .filter(c => !c.parentId)
        .map(c => ({
          triggerCompId: LANG_TOGGLE_ID,
          triggerValue:  c.lang || "en",
          targetCompId:  c.componentId,
          action:        "show",
        }));
      setConditions(newConds);

      return toggled;
    });

    setIsDirty(true);
    showToast("Bilingual mode enabled. Existing components tagged EN. Use '+ AR' to add Arabic versions.", "success");
  }, [isBilingual]);

  // ── Duplicate component as Arabic version ─────────────────────────────────
  const handleDuplicateAsArabic = useCallback((sourceId) => {
    setComponents(prev => {
      const source = prev.find(c => c.componentId === sourceId);
      if (!source) return prev;

      const newId = uuid();
      const arComp = {
        ...source,
        componentId: newId,
        lang: "ar",
        label: source.label + " (AR)",
        // For content components, clear the html so admin fills in Arabic
        config: source.componentType === "content"
          ? { ...source.config, html: "<p></p>" }
          : source.config,
        sortOrder: prev.findIndex(c => c.componentId === sourceId) + 1,
      };

      // Insert right after the source component
      const idx = prev.findIndex(c => c.componentId === sourceId);
      const next = [...prev];
      next.splice(idx + 1, 0, arComp);

      // Add condition for this new AR component
      setConditions(p => [...p, {
        triggerCompId: LANG_TOGGLE_ID,
        triggerValue:  "ar",
        targetCompId:  newId,
        action:        "show",
      }]);

      return next;
    });
    setIsDirty(true);
    showToast("Arabic version added. Click it to edit the Arabic content.", "success");
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }) => { setActiveId(active.id); setSelectedId(null); }, []);

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const isPalette = active.data.current?.isPalette;
    const isSlot    = String(over.id).startsWith("slot::");

    if (isPalette) {
      const compType = active.data.current.componentType;
      const newId    = uuid();
      const newLang  = isBilingual ? "en" : undefined;

      if (isSlot) {
        const parts    = String(over.id).split("::");
        const parentId = parts[1];
        const colIndex = parseInt(parts[2]);
        setComponents(prev => {
          if (prev.some(c => c.parentId === parentId && c.columnIndex === colIndex)) return prev;
          return [...prev, {
            componentId: newId, componentType: compType,
            label: COMPONENT_TYPES.find(c => c.type === compType)?.label || compType,
            isMandatory: false, sortOrder: prev.length,
            config: _defaultConfig(compType), parentId, columnIndex: colIndex,
            ...(newLang ? { lang: newLang } : {}),
          }];
        });
        if (isBilingual) {
          setConditions(p => [...p, { triggerCompId: LANG_TOGGLE_ID, triggerValue:"en", targetCompId: newId, action:"show" }]);
        }
        setSelectedId(newId); setIsDirty(true); return;
      }

      setComponents(prev => {
        const newComp = {
          componentId: newId, componentType: compType,
          label: COMPONENT_TYPES.find(c => c.type === compType)?.label || compType,
          isMandatory: false, sortOrder: prev.length,
          config: _defaultConfig(compType), parentId: null, columnIndex: null,
          ...(newLang ? { lang: newLang } : {}),
        };
        const overIndex = prev.findIndex(c => c.componentId === over.id);
        if (overIndex >= 0) { const next=[...prev]; next.splice(overIndex,0,newComp); return next; }
        return [...prev, newComp];
      });
      if (isBilingual) {
        setConditions(p => [...p, { triggerCompId: LANG_TOGGLE_ID, triggerValue:"en", targetCompId: newId, action:"show" }]);
      }
      setSelectedId(newId); setIsDirty(true);
    } else {
      // Prevent dragging the lang toggle
      if (active.id === LANG_TOGGLE_ID) return;
      if (active.id !== over.id && !isSlot) {
        setComponents(prev => {
          const oi = prev.findIndex(c => c.componentId === active.id);
          const ni = prev.findIndex(c => c.componentId === over.id);
          // Don't allow dragging above the lang toggle (index 0)
          if (isBilingual && ni === 0) return prev;
          return oi !== -1 && ni !== -1 ? arrayMove(prev, oi, ni) : prev;
        });
      }
    }
  }, [isBilingual]);

  const handleCloseEditor = useCallback(() => setSelectedId(null), []);
  const handleUpdateComponent = useCallback((updated) => {
    const old = components.find(c => c.componentId === updated.componentId);
    const langChanged = isBilingual && updated.lang && old && old.lang !== updated.lang;
    // A column layout owns its children — moving it to a language moves them too.
    const childIds = (langChanged && updated.componentType === "columnlayout")
      ? components.filter(c => c.parentId === updated.componentId).map(c => c.componentId)
      : [];

    setComponents(p => p.map(c => {
      if (c.componentId === updated.componentId) return updated;
      if (childIds.includes(c.componentId)) return { ...c, lang: updated.lang };
      return c;
    }));

    // Visibility follows the condition, not the lang tag — keep them in sync so
    // switching a field to AR actually hides it in the EN view (and vice-versa).
    if (langChanged) {
      const affected = [updated.componentId, ...childIds];
      setConditions(p => {
        const cleaned = p.filter(c => !(c.triggerCompId === LANG_TOGGLE_ID && affected.includes(c.targetCompId)));
        const added   = affected.map(id => ({
          triggerCompId: LANG_TOGGLE_ID, triggerValue: updated.lang,
          targetCompId:  id, action: "show",
        }));
        return [...cleaned, ...added];
      });
    }
    setIsDirty(true);
  }, [components, isBilingual]);
  const handleDeleteComponent = useCallback((id) => {
    if (id === LANG_TOGGLE_ID) return;  // can't delete the toggle
    setComponents(p => {
      const toDelete = new Set([id]);
      p.forEach(c => { if (c.parentId === id) toDelete.add(c.componentId); });
      return p.filter(c => !toDelete.has(c.componentId));
    });
    setConditions(p => p.filter(c => c.triggerCompId !== id && c.targetCompId !== id));
    setSelectedId(p => p === id ? null : p);
    setIsDirty(true);
  }, []);

  const handleSave = async (status) => {
    setSaving(true);
    try {
      await authPut(`${API_BASE_URL}/api/EMR/Forms/${formCode}`, {
        formName: form.formName, status: status || form.status,
      });

      // Language conditions are auto-managed: regenerate them from each component's
      // lang tag so EVERY component has exactly one (children inherit their parent
      // column layout's language). This guarantees the published form filters
      // correctly — without it, an un-conditioned component shows in both languages.
      let conditionsToSave = conditions;
      if (isBilingual) {
        const langOf = (c) => {
          if (c.parentId) {
            const parent = components.find(p => p.componentId === c.parentId);
            return (parent && parent.lang) || c.lang || "en";
          }
          return c.lang || "en";
        };
        const nonLang  = conditions.filter(c => c.triggerCompId !== LANG_TOGGLE_ID);
        const langCond = components
          .filter(c => c.componentId !== LANG_TOGGLE_ID)
          .map(c => ({ triggerCompId: LANG_TOGGLE_ID, triggerValue: langOf(c), targetCompId: c.componentId, action: "show" }));
        conditionsToSave = [...nonLang, ...langCond];
      }

      // Components and conditions are independent tables — save them concurrently.
      const [compRes, condRes] = await Promise.all([
        authPost(`${API_BASE_URL}/api/EMR/Forms/SaveComponents`, {
          formCode, components: components.map((c, i) => ({ ...c, sortOrder: i })),
        }),
        authPost(`${API_BASE_URL}/api/EMR/Forms/SaveConditions`, { formCode, conditions: conditionsToSave }),
      ]);
      if (!compRes.success) throw new Error(compRes.message);
      if (!condRes.success) throw new Error(condRes.message);
      setConditions(conditionsToSave);
      setIsDirty(false);
      showToast(status === "Active" ? "Form published." : "Form saved.");
      if (status) setForm(p => ({ ...p, status }));
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:"#64748b", fontFamily:"Lato,sans-serif" }}>Loading form…</div>;
  if (!form)   return <div style={{ padding:60, textAlign:"center", color:"#b91c1c", fontFamily:"Lato,sans-serif" }}>Form not found.</div>;

  // ── Compute visible components for preview (apply conditions) ─────────────
  const getVisibleComponents = (lang) => {
    if (!isBilingual) return topLevelComponents;
    return topLevelComponents.filter(comp => {
      if (comp.componentId === LANG_TOGGLE_ID) return true;  // always show toggle
      const cond = conditions.find(c => c.targetCompId === comp.componentId && c.triggerCompId === LANG_TOGGLE_ID);
      // Fall back to the component's own language tag (defaults to "en") so an
      // un-conditioned component doesn't leak into the other language's view.
      if (!cond) return (comp.lang || "en") === lang;
      return cond.triggerValue === lang;
    });
  };

  const columnSlotIds = components
    .filter(c => c.componentType === "columnlayout")
    .flatMap(c => Array.from({ length: c.config?.columns || 2 }, (_, i) => `slot::${c.componentId}::${i}`));

  const sortableIds = [
    ...COMPONENT_TYPES.map(ct => `palette::${ct.type}`),
    ...topLevelComponents.map(c => c.componentId),
    ...columnSlotIds,
  ];

  const isRTLPreview = previewLang === "ar";

  return (
    <div style={{ fontFamily:"Lato,sans-serif", background:"#f7f9fc", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <style>{`
        .fb-toolbar { background:#fff; border-bottom:1px solid #e7ecf4; padding:12px 20px;
          display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; }
        .fb-body { display:flex; height:calc(100vh - 57px); overflow:hidden; }
        .fb-panel { width:230px; border-right:1px solid #e7ecf4; background:#fff; overflow-y:auto; padding:12px; flex-shrink:0; }
        .fb-canvas { flex:1; overflow-y:auto; padding:20px; }
        .fb-editor { width:290px; border-left:1px solid #e7ecf4; background:#fff; overflow-y:auto; padding:16px; flex-shrink:0; }
        .group-header { display:flex; justify-content:space-between; align-items:center; padding:6px 8px;
          cursor:pointer; border-radius:6px; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:.8px; }
        .group-header:hover { background:#f8fafc; }
        .tab-btn { padding:8px 16px; border:none; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; transition:all .15s; }
        .tab-btn.active { background:#334b71; color:#fff; }
        .tab-btn:not(.active) { background:#f1f5f9; color:#64748b; }
        .canvas-drop { min-height:400px; border:2px dashed #e7ecf4; border-radius:12px; padding:16px; background:#fafbfc; }
        .sec-btn { background:#fff; border:1px solid #e7ecf4; border-radius:8px; padding:8px 16px; font-weight:700; font-size:13px; color:#334b71; cursor:pointer; }
        .pub-btn { background:#2e7d5e; color:#fff; border:none; border-radius:8px; padding:9px 18px; font-weight:800; font-size:13px; cursor:pointer; }
        .bilingual-btn { border:none; border-radius:8px; padding:7px 14px; font-weight:800; font-size:12px; cursor:pointer; transition:all .15s; }
        .bilingual-btn.on  { background:#fef3c7; color:#92400e; border:1px solid #fcd34d; }
        .bilingual-btn.off { background:#f0faf9; color:#0f766e; border:1px solid #A7D1CD; }
      `}</style>

      {/* Toolbar */}
      <div className="fb-toolbar">
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button className="sec-btn" style={{ padding:"7px 12px" }}
            onClick={() => { if (isDirty && !window.confirm("Unsaved changes. Discard?")) return; navigate("/emr/forms"); }}>
            ← Back
          </button>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:"#071D49" }}>{form.formName}</div>
            <div style={{ fontSize:11, color:"#94a3b8" }}>{form.formCode} · {form.formType}</div>
          </div>
          <span style={{ padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700,
            background:form.status==="Active"?"#dcfce7":"#f1f5f9",
            color:form.status==="Active"?"#166534":"#64748b" }}>{form.status}</span>

          {/* Bilingual toggle button */}
          <button
            className={`bilingual-btn ${isBilingual?"on":"off"}`}
            onClick={handleEnableBilingual}>
            {isBilingual ? "🌐 Bilingual ON" : "🌐 Enable Bilingual"}
          </button>
        </div>

        <div style={{ display:"flex", gap:6 }}>
          {["build","preview","conditions"].map(m => (
            <button key={m} className={`tab-btn ${mode===m?"active":""}`} onClick={() => setMode(m)}>
              {m==="build"?"🔧 Build":m==="preview"?"👁 Preview":"🔀 Conditions"}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {toast && <span style={{ fontSize:12, fontWeight:600, color:toast.type==="error"?"#b91c1c":"#2e7d5e" }}>
            {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}</span>}
          <span style={{ fontSize:12, color:"#94a3b8" }}>{components.length} components</span>
          <button className="sec-btn"
            onClick={async () => { await handleSave(); navigate("/emr/forms"); }} disabled={saving}>
            {saving?"Saving…":"Save & Close"}
          </button>
          <button className="pub-btn" onClick={() => handleSave("Active")} disabled={saving}>
            {saving?"…":"✓ Publish"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="fb-body">
        <DndContext sensors={sensors}
          collisionDetection={(args) => {
            // For slot targets (horizontal grid), pointerWithin gives accurate hit detection
            // closestCenter struggles with horizontally-laid-out equal-size cells
            const slotCollisions = pointerWithin(args).filter(c => String(c.id).startsWith("slot::"));
            if (slotCollisions.length > 0) return slotCollisions;
            return closestCenter(args);
          }}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>

            {/* Left Panel */}
            {mode === "build" && (
              <div className="fb-panel">
                <div style={{ fontSize:11, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:.8, marginBottom:10 }}>Components</div>
                {GROUPS.map(group => (
                  <div key={group} style={{ marginBottom:8 }}>
                    <div className="group-header" onClick={() => setGroupOpen(p => ({ ...p, [group]:!p[group] }))}>
                      {group}<span>{groupOpen[group]?"▾":"▸"}</span>
                    </div>
                    {groupOpen[group] && (
                      <div style={{ display:"flex", flexDirection:"column", gap:4, padding:"4px 0 8px" }}>
                        {COMPONENT_TYPES.filter(c => c.group === group).map(ct => <PaletteItem key={ct.type} {...ct} />)}
                      </div>
                    )}
                  </div>
                ))}

                {/* Bilingual legend */}
                {isBilingual && (
                  <div style={{ marginTop:12, padding:10, background:"#f8fafc", borderRadius:8, border:"1px solid #e7ecf4" }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#94a3b8", marginBottom:6, textTransform:"uppercase" }}>Bilingual Mode</div>
                    <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                      <span style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:"#dbeafe", color:"#1d4ed8", fontWeight:700 }}>EN</span>
                      <span style={{ fontSize:10, color:"#64748b" }}>= English component</span>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <span style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:"#fef3c7", color:"#92400e", fontWeight:700 }}>AR</span>
                      <span style={{ fontSize:10, color:"#64748b" }}>= Arabic component</span>
                    </div>
                    <div style={{ fontSize:10, color:"#94a3b8", marginTop:6 }}>Click "+ AR" on any EN component to add its Arabic version.</div>
                  </div>
                )}
              </div>
            )}

            {/* Canvas */}
            <div className="fb-canvas">
              {mode === "build" && (
                <div className="canvas-drop">
                  {topLevelComponents.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"60px 20px", color:"#94a3b8" }}>
                      <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Start building your form</div>
                      <div style={{ fontSize:13 }}>Drag components from the left panel and drop them here</div>
                    </div>
                  ) : (
                    topLevelComponents.map(comp =>
                      comp.componentType === "columnlayout" ? (
                        <ColumnLayoutItem key={comp.componentId} component={comp}
                          isSelected={selectedId === comp.componentId}
                          onClick={setSelectedId} onDelete={handleDeleteComponent}
                          childComponents={childrenOf(comp.componentId)}
                          selectedId={selectedId} onSelectChild={setSelectedId}
                          onDeleteChild={handleDeleteComponent}
                          allComponents={components}
                          isBilingual={isBilingual} />
                      ) : (
                        <CanvasItem key={comp.componentId} component={comp}
                          isSelected={selectedId === comp.componentId}
                          onClick={setSelectedId} onDelete={handleDeleteComponent}
                          allComponents={components}
                          isBilingual={isBilingual}
                          onDuplicateAsArabic={handleDuplicateAsArabic} />
                      )
                    )
                  )}
                </div>
              )}

              {mode === "preview" && (
                <div>
                  <div style={{ display:"flex", gap:8, marginBottom:16, justifyContent:"center", alignItems:"center", flexWrap:"wrap" }}>
                    {[{ id:"desktop",label:"🖥 Desktop" },{ id:"tablet",label:"📱 Tablet" },{ id:"mobile",label:"📱 Mobile" }].map(s => (
                      <button key={s.id} className={`tab-btn ${previewSize===s.id?"active":""}`}
                        onClick={() => setPreviewSize(s.id)}>{s.label}</button>
                    ))}

                    {/* Language toggle — only in bilingual mode */}
                    {isBilingual && (
                      <div style={{ display:"flex", alignItems:"center", background:"#fff",
                        border:"1px solid #e7ecf4", borderRadius:10, padding:4, gap:4, marginLeft:8 }}>
                        <button onClick={() => setPreviewLang("en")}
                          style={{ padding:"6px 16px", borderRadius:7, border:"none", cursor:"pointer",
                            fontWeight:800, fontSize:13,
                            background: previewLang==="en" ? "#334b71" : "transparent",
                            color:      previewLang==="en" ? "#fff" : "#94a3b8" }}>
                           English
                        </button>
                        <button onClick={() => setPreviewLang("ar")}
                          style={{ padding:"6px 16px", borderRadius:7, border:"none", cursor:"pointer",
                            fontWeight:800, fontSize:13,
                            background: previewLang==="ar" ? "#334b71" : "transparent",
                            color:      previewLang==="ar" ? "#fff" : "#94a3b8" }}>
                           Arabic
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preview form */}
                  <div style={{
                    maxWidth: previewSize==="desktop"?"100%":previewSize==="tablet"?"768px":"375px",
                    margin:"0 auto", background:"#fff", border:"1px solid #e7ecf4",
                    borderRadius:12, padding:24, boxShadow:"0 2px 12px rgba(0,0,0,.06)",
                    direction: isRTLPreview ? "rtl" : "ltr",
                  }}>
                    {isRTLPreview && (
                      <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginBottom:12,
                        background:"#fef3c7", border:"1px solid #fcd34d", borderRadius:6,
                        padding:"3px 10px", fontSize:11, fontWeight:700, color:"#92400e" }}>
                        ↔ Arabic — RTL
                      </div>
                    )}
                    <div style={{ fontWeight:800, fontSize:18, color:"#071D49", marginBottom:4 }}>{form.formName}</div>
                    <div style={{ fontSize:12, color:"#94a3b8", marginBottom:20 }}>{form.formType}</div>

                    {getVisibleComponents(previewLang).map(comp => (
                      <div key={comp.componentId} style={{ marginBottom:16 }}>
                        <ComponentPreview
                          component={comp}
                          childComponents={childrenOf(comp.componentId)}
                          dir={isRTLPreview ? "rtl" : "ltr"}
                          activeLang={previewLang}
                          onLangChange={(lang) => {
                            setPreviewLang(lang);
                          }}
                        />
                      </div>
                    ))}

                    {topLevelComponents.length > 0 && (
                      <button style={{ width:"100%", marginTop:8, padding:"12px",
                        background:"#334b71", color:"#fff", border:"none",
                        borderRadius:10, fontWeight:800, fontSize:14, cursor:"pointer" }}>
                        {isRTLPreview ? "إرسال" : "Submit"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {mode === "conditions" && (
                <ConditionsPanel components={components} conditions={conditions} onChange={setConditions} />
              )}
            </div>

          </SortableContext>

          <DragOverlay>
            {activeId && (
              <div style={{ background:"#334b71", color:"#fff", borderRadius:8, padding:"8px 14px",
                fontSize:13, fontWeight:700, boxShadow:"0 4px 14px rgba(0,0,0,.2)", opacity:.9 }}>
                {COMPONENT_TYPES.find(c => `palette::${c.type}` === activeId)?.label ||
                 components.find(c => c.componentId === activeId)?.label || "Component"}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {mode === "build" && selectedComp && (
          <div className="fb-editor">
            <ComponentEditor key={selectedId} component={selectedComp}
              isBilingual={isBilingual}
              onChange={handleUpdateComponent} onClose={handleCloseEditor} />
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
  const eligible = components.filter(c => ["dropdown","radio","checkbox","languagetoggle"].includes(c.componentType));
  const addCondition = () => onChange(p => [...p, { triggerCompId:eligible[0]?.componentId||"", triggerValue:"", targetCompId:"", action:"show" }]);
  const updateCond = (i, field, val) => onChange(p => p.map((c,idx) => idx===i ? {...c,[field]:val} : c));
  const removeCond = (i) => onChange(p => p.filter((_,idx) => idx!==i));
  return (
    <div style={{ maxWidth:700, margin:"0 auto" }}>
      <div style={{ fontWeight:800, fontSize:15, color:"#071D49", marginBottom:4 }}>🔀 Conditional Logic</div>
      <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>Show or hide components based on field values. Language conditions are auto-managed in Bilingual mode.</div>
      {conditions.length === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8", fontSize:13 }}>No conditions yet.</div>}
      {conditions.map((cond,i) => (
        <div key={i} style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:10, padding:16, marginBottom:10 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 60px 1fr auto", gap:10, alignItems:"center" }}>
            <div><div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>WHEN</div>
              <select value={cond.triggerCompId} onChange={e => updateCond(i,"triggerCompId",e.target.value)}
                style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12 }}>
                <option value="">Select field…</option>
                {eligible.map(c => <option key={c.componentId} value={c.componentId}>{c.label}</option>)}
              </select></div>
            <div><div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>EQUALS</div>
              <input value={cond.triggerValue} onChange={e => updateCond(i,"triggerValue",e.target.value)} placeholder="Value…"
                style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12, boxSizing:"border-box" }} /></div>
            <div><div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>THEN</div>
              <select value={cond.action} onChange={e => updateCond(i,"action",e.target.value)}
                style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12 }}>
                <option value="show">Show</option><option value="hide">Hide</option>
              </select></div>
            <div><div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>FIELD</div>
              <select value={cond.targetCompId} onChange={e => updateCond(i,"targetCompId",e.target.value)}
                style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12 }}>
                <option value="">Select field…</option>
                {components.filter(c => c.componentId !== cond.triggerCompId).map(c => (
                  <option key={c.componentId} value={c.componentId}>{c.label}</option>
                ))}
              </select></div>
            <button onClick={() => removeCond(i)} style={{ background:"none", border:"none", cursor:"pointer", color:"#b91c1c", fontSize:18 }}>×</button>
          </div>
        </div>
      ))}
      <button onClick={addCondition}
        style={{ background:"#fff", border:"1px dashed #334b71", borderRadius:8, padding:"10px 20px",
          fontWeight:700, fontSize:13, color:"#334b71", cursor:"pointer", width:"100%", marginTop:8 }}>
        + Add Condition
      </button>
    </div>
  );
};

const _defaultConfig = (type) => {
  switch (type) {
    case "dropdown": case "radio": case "checkbox": return { options:["Option 1","Option 2","Option 3"] };
    case "columnlayout":  return { columns:2 };
    case "table":         return { columns:["Column 1","Column 2"], rows:3 };
    case "tabs":          return { tabs:["Tab 1","Tab 2"] };
    case "collapsible":   return { title:"Section", defaultOpen:false };
    case "calculated":    return { formula:"", dependsOn:[] };
    case "annotation":    return { assetCode:"ANNO-FACE" };
    case "signature":     return { label:"Sign here" };
    case "fileupload":    return { accept:"image/*", maxSizeMb:5, imageType:"Other" };
    case "content":       return { html:"<p>Add your text here</p>" };
    case "macro":         return { macroType:"PatientName" };
    case "logo":          return { align:"left" };
    case "languagetoggle":return { options:["en","ar"] };
    default:              return {};
  }
};