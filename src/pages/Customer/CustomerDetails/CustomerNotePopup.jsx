/**
 * CustomerNotePopup
 * -----------------
 * Usage:
 *   import { useCustomerNotes } from "./CustomerNotePopup";
 *
 *   const { NotePopup, checkNotes } = useCustomerNotes();
 *
 *   // Trigger:
 *   await checkNotes(custId, "checkin");  // "booking" | "payment"
 *
 *   // Render once in JSX:
 *   <NotePopup />
 */

import { useState, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const CONTEXT_CFG = {
  checkin: { title: "Check-In Alert",   icon: "🔔", color: "#1d4ed8", bg: "#dbeafe" },
  booking: { title: "Booking Alert",    icon: "📅", color: "#065f46", bg: "#d1fae5" },
  payment: { title: "Payment Alert",    icon: "💳", color: "#92400e", bg: "#fef3c7" },
};

// ── Stable modal component (not recreated on every render) ────────────────────
const NoteModal = ({ notes, context, onDismiss }) => {
  if (!notes || notes.length === 0 || !context) return null;
  const cfg = CONTEXT_CFG[context] || CONTEXT_CFG.checkin;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onDismiss} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.48)", zIndex: 9998,
      }} />

      {/* Modal */}
      <div role="dialog" aria-modal="true" style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "min(480px, 94vw)", maxHeight: "80vh",
        background: "#fff", borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        zIndex: 9999, display: "flex", flexDirection: "column",
        overflow: "hidden", fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px", background: cfg.bg,
          borderBottom: `3px solid ${cfg.color}`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 22 }}>{cfg.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: cfg.color }}>{cfg.title}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {notes.length} note{notes.length !== 1 ? "s" : ""} for this customer
            </div>
          </div>
          <button onClick={onDismiss} aria-label="Close" style={{
            background: "none", border: "none", fontSize: 20,
            cursor: "pointer", color: "#6b7280", lineHeight: 1, padding: "0 4px",
          }}>✕</button>
        </div>

        {/* Notes */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {notes.map((n, i) => (
            <div key={n.recId || i} style={{
              background: "#f8fafc", borderRadius: 10, padding: "12px 16px",
              borderLeft: `4px solid ${cfg.color}`,
            }}>
              <p style={{ margin: 0, fontSize: 14, color: "#1b2636", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {n.note}
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
                {n.createdBy && <span>By {n.createdBy}</span>}
                {n.createdDate && (
                  <span>{new Date(n.createdDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #f0f2f5", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onDismiss} style={{
            height: 38, padding: "0 24px", border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            background: cfg.color, color: "#fff",
          }}>
            Acknowledged ✓
          </button>
        </div>
      </div>
    </>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useCustomerNotes = () => {
  const [state, setState] = useState({ notes: [], context: null, visible: false });

  const checkNotes = useCallback(async (custId, ctx) => {
    console.log("[NotePopup] checkNotes called", { custId, ctx });
    if (!custId || !ctx) { console.warn("[NotePopup] missing custId or ctx"); return; }
    try {
      const token = TOKEN();
      console.log("[NotePopup] token present:", !!token);
      const url = `${API_BASE_URL}/api/Customer/ContextNotes/${encodeURIComponent(custId)}/${ctx}`;
      console.log("[NotePopup] fetching:", url);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      console.log("[NotePopup] response status:", res.status);
      if (!res.ok) { console.warn("[NotePopup] API error", res.status); return; }
      const json = await res.json();
      console.log("[NotePopup] raw response:", json);
      const data = json?.data ?? json;
      const list = Array.isArray(data) ? data : [];
      console.log(`[NotePopup] ${ctx} → ${list.length} note(s) for ${custId}`);
      if (list.length > 0) {
        console.log("[NotePopup] setting visible=true");
        setState({ notes: list, context: ctx, visible: true });
      } else {
        console.warn("[NotePopup] no notes found — popup will NOT show");
      }
    } catch (e) {
      console.error("[NotePopup] fetch error:", e);
    }
  }, []);

  const dismiss = useCallback(() => {
    setState({ notes: [], context: null, visible: false });
  }, []);

  // Stable NotePopup — reads from state, not recreated per render
  console.log("[NotePopup] render state:", state.visible, state.notes?.length, state.context);
  const NotePopup = state.visible
    ? <NoteModal notes={state.notes} context={state.context} onDismiss={dismiss} />
    : null;

  return { NotePopup, checkNotes };
};