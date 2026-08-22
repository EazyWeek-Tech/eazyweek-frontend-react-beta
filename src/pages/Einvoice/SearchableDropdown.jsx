import React, { useState, useEffect, useMemo, useRef } from 'react';

const norm = (s) => (s ?? "").toString().trim();

function SearchableDropdown({ options, value, onChange, placeholder="None selected", multiple=false, disabled=false, width="100%", maxMenuHeight=280, showSelectAll=true, disabledValues=[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) { if(!wrapRef.current)return; if(!wrapRef.current.contains(e.target))setOpen(false); }
    document.addEventListener("mousedown", onDocClick);
    return ()=>document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(()=>{ const q=norm(query).toLowerCase(); if(!q)return options; return options.filter((o)=>norm(o.label).toLowerCase().includes(q)); },[options,query]);
  const isDisabledOption = (val)=>Array.isArray(disabledValues)&&disabledValues.includes(val);
  const isSelected = (val)=>multiple?Array.isArray(value)&&value.includes(val):value===val;

  const displayText = useMemo(()=>{
    if(multiple){ const vals=Array.isArray(value)?value:[]; if(!vals.length)return placeholder; return vals.map((v)=>options.find((o)=>o.value===v)?.label||v).filter(Boolean).join(", "); }
    if(!value)return placeholder;
    return options.find((o)=>o.value===value)?.label||value;
  },[value,options,multiple,placeholder]);

  const toggleItem = (val)=>{
    if(isDisabledOption(val))return;
    if(multiple){ const arr=Array.isArray(value)?[...value]:[]; const idx=arr.indexOf(val); if(idx>=0)arr.splice(idx,1); else arr.push(val); onChange(arr); }
    else{ onChange(val); setOpen(false); }
  };

  const allSelected = multiple&&Array.isArray(value)&&filtered.length>0&&filtered.every((o)=>value.includes(o.value));
  const toggleSelectAll = ()=>{
    if(!multiple)return;
    const selectable=filtered.filter((o)=>!isDisabledOption(o.value));
    const arr=Array.isArray(value)?[...value]:[];
    const allSel=selectable.length>0&&selectable.every((o)=>arr.includes(o.value));
    if(allSel){ onChange(arr.filter((v)=>!selectable.some((o)=>o.value===v))); }
    else{ const union=new Set(arr); selectable.forEach((o)=>union.add(o.value)); onChange(Array.from(union)); }
  };

  return (
    <div className={`dd-wrap ${disabled?"disabled":""}`} style={{width}} ref={wrapRef}>
      <button type="button" className="dd-input" onClick={()=>!disabled&&setOpen((v)=>!v)} disabled={disabled} aria-haspopup="listbox" aria-expanded={open}>
        <span className={`dd-text ${displayText===placeholder?"muted":""}`}>{displayText}</span>
        <span className="dd-caret">▾</span>
      </button>
      {open&&(
        <div className="dd-menu" style={{maxHeight:maxMenuHeight}}>
          <div className="dd-search">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search"/>
            {query&&<button className="clear" onClick={()=>setQuery("")} aria-label="Clear">×</button>}
          </div>
          {multiple&&showSelectAll&&(
            <label className="dd-option select-all">
              <input type="checkbox" checked={!!allSelected} onChange={toggleSelectAll}/>
              <span>Select all</span>
            </label>
          )}
          <div className="dd-list" role="listbox" aria-multiselectable={multiple}>
            {filtered.map((o)=>(
              <label key={o.value} className="dd-option">
                <input type="checkbox" checked={!!isSelected(o.value)} onChange={()=>toggleItem(o.value)} disabled={isDisabledOption(o.value)}/>
                <span style={isDisabledOption(o.value)?{opacity:0.6}:undefined}>{o.label}</span>
              </label>
            ))}
            {!filtered.length&&<div className="dd-empty">No matches</div>}
          </div>
        </div>
      )}
      <style jsx>{`
        .dd-wrap{position:relative}
        .dd-wrap.disabled{opacity:.6;pointer-events:none}
        .dd-input{width:100%;height:36px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:1px solid #e7ecf4;border-radius:8px;padding:0 10px;cursor:pointer;font-size:13px;color:#10223f;font-family:Lato,sans-serif}
        .dd-input:hover{border-color:#cdd6e6}
        .dd-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .dd-text.muted{color:#94a3b8}
        .dd-caret{color:#64748b;font-size:12px}
        .dd-menu{position:absolute;left:0;right:0;z-index:30;background:#fff;border:1px solid #e7ecf4;box-shadow:0 8px 26px rgba(16,34,63,.10);border-radius:10px;margin-top:6px;overflow:auto;width:280px}
        .dd-search{display:grid;grid-template-columns:1fr 22px;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #eef2f7}
        .dd-search input{height:30px;width:100%;border:1px solid #e7ecf4;border-radius:6px;padding:0 10px;outline:none;font-size:13px;color:#10223f;font-family:Lato,sans-serif}
        .dd-search input:focus{border-color:#334b71}
        .dd-search .clear{background:none;border:none;font-size:18px;line-height:1;color:#94a3b8;cursor:pointer}
        .dd-option{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;user-select:none;font-size:13px;color:#10223f}
        .dd-option+.dd-option{border-top:1px solid #f1f4f9}
        .dd-option:hover{background:#f4f6fa}
        .dd-option input{width:16px;height:16px;accent-color:#334b71}
        .dd-empty{padding:12px;color:#94a3b8;text-align:center;font-size:13px}
        .select-all{font-weight:700}
      `}</style>
    </div>
  );
}

export default SearchableDropdown;