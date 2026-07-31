// src/pages/Opportunity/opportunityTheme.js
//
// Single source of truth for the look of the four Opportunity form pages
// (NoShowEntryDetails, MasterLeadForm, ExternalLeadForm, ManualOppCustomerDetails).
//
// Each page previously carried its own <style jsx> block and they had drifted
// apart — three different navies, two button styles, three input heights. They
// now all render <style jsx="true">{OPP_THEME_CSS}</style> instead, so a change
// here lands on every form at once.
//
// Everything is scoped under .ewOpp (each page's root element carries it) so
// these generic class names — .col, .grid, .btn, .inp — can no longer leak into
// other modules the way they did when the same rules were global.
//
// Palette is the EazyWeek brand: Midnight Navy / Royal Blue for structure,
// Warm Coral for required + alert, Blue Grey for secondary text.

export const OPP_THEME_CSS = `
  .ewOpp {
    /* display:contents keeps the scoping wrapper out of the layout entirely —
       the page's own .pageWrap / .wrap stays the outermost box. */
    display: contents;

    --ew-navy: #05224C;
    --ew-blue: #18396E;
    --ew-blue-700: #1f4784;
    --ew-blue-soft: #eef2f9;
    --ew-coral: #DD7766;
    --ew-teal: #A7D1CD;
    --ew-grey: #85A2AA;
    --ew-grey-700: #5b7480;
    --ew-text: #1b2a41;
    --ew-line: #e3e9f2;
    --ew-surface: #ffffff;
    --ew-surface-2: #f7f9fc;
    --ew-danger: #c0392b;
    --ew-radius: 14px;
    --ew-radius-sm: 10px;
    --ew-shadow: 0 1px 2px rgba(5, 34, 76, .04), 0 8px 24px rgba(5, 34, 76, .06);
  }

  /* ---------------- Page shell ---------------- */
  .ewOpp .pageWrap,
  .ewOpp .wrap {
    max-width: 1320px;
    margin: 0 auto;
    padding: 20px 22px 8px;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
    color: var(--ew-text);
    font-size: 14px;
  }

  .ewOpp .pageHeader,
  .ewOpp .titleBlock {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin: 0 0 18px;
  }

  .ewOpp .titleBlock { flex-direction: column; gap: 4px; margin-bottom: 0; }
  .ewOpp .pageHeader .titleBlock { margin-bottom: 0; }
  .ewOpp .wrap > .titleBlock { margin-bottom: 18px; }

  .ewOpp .pageTitle {
    position: relative;
    margin: 0;
    padding-left: 14px;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -.01em;
    color: var(--ew-navy);
  }
  .ewOpp .pageTitle::before {
    content: "";
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 4px;
    border-radius: 3px;
    background: linear-gradient(180deg, var(--ew-blue), var(--ew-teal));
  }

  .ewOpp .subTitle {
    padding-left: 14px;
    font-size: 13px;
    color: var(--ew-grey-700);
  }

  /* ---------------- Section cards ---------------- */
  .ewOpp .fs {
    border: 1px solid var(--ew-line);
    border-radius: var(--ew-radius);
    background: var(--ew-surface);
    box-shadow: var(--ew-shadow);
    padding: 0 22px 22px;
    margin: 0 0 18px;
  }
  .ewOpp .fs::after { content: ""; display: table; clear: both; }

  /* A <legend> is normally painted into the fieldset's top border. Floating it
     is the only reliable way to pull it into flow as a full-width card header —
     but a float that wide squeezes the next sibling, and grid/flex containers
     don't wrap around floats, they get placed beside them and overflow. Every
     non-legend child therefore clears, which drops it cleanly below the header. */
  .ewOpp .fs legend {
    float: left;
    width: 100%;
    padding: 16px 0 12px;
    margin: 0 0 18px;
    border-bottom: 1px solid var(--ew-line);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .09em;
    text-transform: uppercase;
    color: var(--ew-blue);
  }

  .ewOpp .fs > *:not(legend) { clear: both; }

  /* ---------------- Grids ---------------- */
  .ewOpp .pageWrap,
  .ewOpp .wrap,
  .ewOpp .fs { min-width: 0; max-width: 100%; }

  .ewOpp .formGrid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 26px; }
  .ewOpp .formGrid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 26px; }
  .ewOpp .grid      { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px 26px; margin-bottom: 0; }

  .ewOpp .col {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .ewOpp .mtWide { grid-column: 1 / -1; margin-top: 4px; }

  /* ---------------- Fields ---------------- */
  .ewOpp .field,
  .ewOpp .formrow,
  .ewOpp .pair {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    margin: 0;
    font-size: 14px;
  }

  .ewOpp .field > label,
  .ewOpp .formrow > label,
  .ewOpp .lab {
    display: block;
    min-width: 0;
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .01em;
    color: var(--ew-grey-700);
  }

  .ewOpp .req { color: var(--ew-coral); font-weight: 800; }

  .ewOpp .inp {
    width: 100%;
    max-width: none;
    min-width: 0;
    height: 40px;
    padding: 0 12px;
    font: inherit;
    font-size: 14px;
    color: var(--ew-text);
    background: var(--ew-surface);
    border: 1px solid var(--ew-line);
    border-radius: var(--ew-radius-sm);
    outline: none;
    transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
  }

  .ewOpp select.inp {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 34px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2385A2AA' d='M1.4 0 6 4.6 10.6 0 12 1.4 6 7.4 0 1.4z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }

  .ewOpp .inp:hover:not(:disabled):not([readonly]) { border-color: #c9d5e6; }

  .ewOpp .inp:focus,
  .ewOpp .txta:focus {
    border-color: var(--ew-blue);
    box-shadow: 0 0 0 3px rgba(24, 57, 110, .12);
  }

  .ewOpp .inp:disabled,
  .ewOpp .inp[readonly],
  .ewOpp .txta:disabled {
    background: var(--ew-surface-2);
    color: var(--ew-grey-700);
    cursor: not-allowed;
  }

  .ewOpp .txta {
    width: 100%;
    max-width: none;
    min-height: 104px;
    padding: 10px 12px;
    font: inherit;
    font-size: 14px;
    color: var(--ew-text);
    background: var(--ew-surface);
    border: 1px solid var(--ew-line);
    border-radius: var(--ew-radius-sm);
    outline: none;
    resize: vertical;
    transition: border-color .15s ease, box-shadow .15s ease;
  }

  /* Read-only value tiles (appointment details) */
  .ewOpp .val {
    display: flex;
    align-items: center;
    height: 40px;
    max-width: none;
    padding: 0 12px;
    font-size: 14px;
    color: var(--ew-text);
    background: var(--ew-surface-2);
    border: 1px solid var(--ew-line);
    border-radius: var(--ew-radius-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Row groups that used to be flex strips */
  .ewOpp .ldform {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 18px 26px;
    align-items: start;
  }

  .ewOpp .errText {
    font-size: 12px;
    font-weight: 600;
    color: var(--ew-danger);
  }

  .ewOpp .errBox {
    padding: 10px 14px;
    margin-bottom: 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ew-danger);
    background: #fdf1ef;
    border: 1px solid #f6d5cf;
    border-radius: var(--ew-radius-sm);
  }

  .ewOpp .muted { color: var(--ew-grey); }
  .ewOpp .disabled { opacity: .65; }

  .ewOpp .load {
    padding: 28px;
    text-align: center;
    font-size: 13px;
    color: var(--ew-grey-700);
  }

  /* ---------------- Sticky action bar ---------------- */
  .ewOpp .btnRow,
  .ewOpp .btnrow {
    position: sticky;
    bottom: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 18px 0 0;
    padding: 14px 0 16px;
    background: linear-gradient(180deg, rgba(255, 255, 255, .6), #fff 42%);
    backdrop-filter: blur(6px);
    border-top: 1px solid var(--ew-line);
  }

  .ewOpp .btn {
    height: 42px;
    padding: 0 22px;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    background: var(--ew-blue);
    border: 1px solid var(--ew-blue);
    border-radius: var(--ew-radius-sm);
    cursor: pointer;
    transition: background .15s ease, box-shadow .15s ease, transform .05s ease;
  }
  .ewOpp .btn:hover:not(:disabled) { background: var(--ew-blue-700); box-shadow: 0 6px 16px rgba(24, 57, 110, .22); }
  .ewOpp .btn:active:not(:disabled) { transform: translateY(1px); }
  .ewOpp .btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }

  .ewOpp .btn.ghost {
    color: var(--ew-navy);
    background: var(--ew-surface);
    border-color: var(--ew-line);
  }
  .ewOpp .btn.ghost:hover:not(:disabled) { background: var(--ew-blue-soft); border-color: #c9d5e6; box-shadow: none; }

  /* ---------------- Toast ---------------- */
  .ewOpp .toast {
    position: fixed;
    top: 22px;
    right: 22px;
    left: auto;
    z-index: 9999;
    max-width: 380px;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    background: var(--ew-navy);
    border-left: 4px solid var(--ew-coral);
    border-radius: var(--ew-radius-sm);
    box-shadow: 0 14px 34px rgba(5, 34, 76, .28);
    display: flex;
    justify-content: center;
    text-align: center;
    animation: ewToastIn .18s ease-out;
  }
  @keyframes ewToastIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ---------------- Searchable select ---------------- */
  .ewOpp .ssWrap { position: relative; width: 100%; min-width: 0; }
  .ewOpp .ssWrap.isDisabled { opacity: .7; }

  .ewOpp .ssMenu {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 6px);
    z-index: 9999;
    max-height: 280px;
    overflow: auto;
    background: var(--ew-surface);
    border: 1px solid var(--ew-line);
    border-radius: var(--ew-radius-sm);
    box-shadow: 0 16px 34px rgba(5, 34, 76, .14);
  }

  .ewOpp .ssItem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid #eef2f7;
    cursor: pointer;
  }
  .ewOpp .ssItem:last-child { border-bottom: 0; }
  .ewOpp .ssItem:hover { background: var(--ew-surface-2); }
  .ewOpp .ssItem.active { background: var(--ew-blue-soft); }
  .ewOpp .ssItem.muted { cursor: default; color: var(--ew-grey-700); }

  .ewOpp .ssLabel {
    max-width: 80%;
    font-size: 13px;
    font-weight: 600;
    color: var(--ew-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ewOpp .ssCode { flex: 0 0 auto; font-size: 12px; font-weight: 800; color: var(--ew-grey); }

  /* ---------------- Follow-up history link ---------------- */
  .ewOpp .fuLinkRow { display: flex; align-items: flex-end; }
  .ewOpp .fuLink {
    padding: 0;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    color: var(--ew-blue);
    background: none;
    border: 0;
    cursor: pointer;
  }
  .ewOpp .fuLink:hover { text-decoration: underline; }

  /* ---------------- Modal ---------------- */
  .ewOpp .modalOverlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(5, 34, 76, .55);
    backdrop-filter: blur(3px);
  }

  .ewOpp .modalCard {
    width: 100%;
    max-width: 900px;
    max-height: 86vh;
    display: flex;
    flex-direction: column;
    background: var(--ew-surface);
    border-radius: var(--ew-radius);
    box-shadow: 0 24px 60px rgba(5, 34, 76, .32);
    overflow: hidden;
  }

  .ewOpp .modalHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--ew-line);
  }

  .ewOpp .modalTitle { font-size: 16px; font-weight: 800; color: var(--ew-navy); }

  .ewOpp .modalClose {
    width: 32px;
    height: 32px;
    font-size: 18px;
    line-height: 1;
    color: var(--ew-grey-700);
    background: var(--ew-surface-2);
    border: 1px solid var(--ew-line);
    border-radius: 8px;
    cursor: pointer;
  }
  .ewOpp .modalClose:hover { background: var(--ew-blue-soft); color: var(--ew-navy); }

  .ewOpp .modalBody { padding: 18px 20px 22px; overflow: auto; }

  /* ---------------- Tables ---------------- */
  .ewOpp .tblWrap {
    border: 1px solid var(--ew-line);
    border-radius: var(--ew-radius-sm);
    overflow: auto;
  }

  .ewOpp .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  .ewOpp .tbl th {
    position: sticky;
    top: 0;
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .07em;
    text-transform: uppercase;
    text-align: left;
    color: var(--ew-grey-700);
    background: var(--ew-surface-2);
    border-bottom: 1px solid var(--ew-line);
  }
  .ewOpp .tbl td {
    padding: 10px 12px;
    color: var(--ew-text);
    border-bottom: 1px solid #eef2f7;
  }
  .ewOpp .tbl tbody tr:last-child td { border-bottom: 0; }
  .ewOpp .tbl tbody tr:hover td { background: var(--ew-surface-2); }

  /* ---------------- Responsive ---------------- */
  @media (max-width: 1200px) {
    .ewOpp .formGrid3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 820px) {
    .ewOpp .pageWrap,
    .ewOpp .wrap { padding: 16px 14px 8px; }
    .ewOpp .formGrid3,
    .ewOpp .formGrid2,
    .ewOpp .grid,
    .ewOpp .ldform { grid-template-columns: minmax(0, 1fr); }
    .ewOpp .btnRow,
    .ewOpp .btnrow { justify-content: stretch; }
    .ewOpp .btnRow .btn,
    .ewOpp .btnrow .btn { flex: 1; }
    .ewOpp .toast { left: 14px; right: 14px; max-width: none; }
  }
`;

export default OPP_THEME_CSS;