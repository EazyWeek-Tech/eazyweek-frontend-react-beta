import React, { useState, useEffect, useCallback } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';
import { usePermissions } from '../Settings/usePermissions';
import { SOURCE_OPTIONS, formatDateTime, apiRequest } from './einvoiceUtils';

const PERM_VIEW = 'MDM.EINV.VIEW';
const PERM_MANAGE = 'MDM.EINV.MANAGE';

const EMPTY = {
  centerCode: '',
  sourceCentreId: '',
  companyName: '',
  companyNameAr: '',
  clinicName: '',
  clinicNameAr: '',
  vatNumber: '',
  branchCrn: '',
  deviceId: '',
  streetName: '',
  streetNameAr: '',
  buildingNumber: '',
  buildingNumberAr: '',
  cityName: '',
  cityNameAr: '',
  citySubdivisionName: '',
  citySubdivisionNameAr: '',
  postalZone: '',
  countryCode: 'SA',
  invoiceNoteEn: '',
  invoiceNoteAr: '',
  isActive: true,
};

function fromRow(row) {
  return {
    centerCode: row.CENTERCODE || '',
    sourceCentreId: row.SOURCECENTREID || '',
    companyName: row.COMPANYNAME || '',
    companyNameAr: row.COMPANYNAMEAR || '',
    clinicName: row.CLINICNAME || '',
    clinicNameAr: row.CLINICNAMEAR || '',
    vatNumber: row.VATNUMBER || '',
    branchCrn: row.BRANCHCRN || '',
    deviceId: row.DEVICEID || '',
    streetName: row.STREETNAME || '',
    streetNameAr: row.STREETNAMEAR || '',
    buildingNumber: row.BUILDINGNUMBER || '',
    buildingNumberAr: row.BUILDINGNUMBERAR || '',
    cityName: row.CITYNAME || '',
    cityNameAr: row.CITYNAMEAR || '',
    citySubdivisionName: row.CITYSUBDIVISIONNAME || '',
    citySubdivisionNameAr: row.CITYSUBDIVISIONNAMEAR || '',
    postalZone: row.POSTALZONE || '',
    countryCode: row.COUNTRYCODE || 'SA',
    invoiceNoteEn: row.INVOICENOTEEN || '',
    invoiceNoteAr: row.INVOICENOTEAR || '',
    isActive: row.ISACTIVE !== false && row.ISACTIVE !== 0,
  };
}

const EInvoiceSettings = ({ onBack }) => {
  const perms = usePermissions() || {};
  const can = (activity) =>
    typeof perms.hasPermission === 'function' ? perms.hasPermission(activity) : true;

  const [centres, setCentres] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState('');

  const [syncedKey, setSyncedKey] = useState(null);
  const [activeSource, setActiveSource] = useState('ZENOTI');
  const [cutoverDate, setCutoverDate] = useState('');

  const flash = (message, kind = 'info') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Centre`);
      const rows = Array.isArray(json.data) ? json.data : [];
      setCentres(rows);
      if (rows.length > 0) {
        setSelectedCode((prev) => prev || rows[0].CENTERCODE);
      }
    } catch (err) {
      flash(err.message, 'error');
      setCentres([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (can(PERM_VIEW)) load();
  }, [load]);

  const currentRow = centres.find((c) => c.CENTERCODE === selectedCode);
  const selectionKey = creating ? 'new' : selectedCode;

  if (!creating && currentRow && selectionKey !== syncedKey) {
    setSyncedKey(selectionKey);
    setForm(fromRow(currentRow));
    setActiveSource(currentRow.ACTIVESOURCE || 'ZENOTI');
    setCutoverDate(
      currentRow.SOURCECUTOVERDATE ? String(currentRow.SOURCECUTOVERDATE).slice(0, 10) : ''
    );
    setFormError('');
  }

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startCreate = () => {
    setCreating(true);
    setSyncedKey('new');
    setForm(EMPTY);
    setActiveSource('ZENOTI');
    setCutoverDate('');
    setFormError('');
  };

  const saveProfile = async () => {
    if (!form.centerCode || !form.companyName || !form.clinicName || !form.vatNumber) {
      setFormError('Centre code, company name, clinic name and VAT number are all required.');
      return;
    }
    if (!/^\d{15}$/.test(form.vatNumber)) {
      setFormError('A Saudi VAT number is exactly 15 digits.');
      return;
    }

    setBusy(true);
    setFormError('');
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Centre`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      flash(json.message, 'success');
      setCreating(false);
      setSelectedCode(form.centerCode);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveCutover = async () => {
    setBusy(true);
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Centre/Cutover`, {
        method: 'POST',
        body: JSON.stringify({
          centerCode: selectedCode,
          activeSource,
          cutoverDate: cutoverDate || null,
        }),
      });
      flash(json.message, 'success');
      await load();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!can(PERM_VIEW)) {
    return (
      <div className="einvoice-page">
        <div className="einvoice-empty">
          <h2>No access to e-invoice settings</h2>
          <p>Ask an administrator to grant you the E-Invoice view permission.</p>
        </div>
      </div>
    );
  }

  const editable = can(PERM_MANAGE);

  return (
    <div className="einvoice-page">
      <button type="button" className="btn-link back-link" onClick={onBack}>Back to e-invoices</button>

      <div className="einvoice-head">
        <div>
          <h1>Centre settings</h1>
          <p className="einvoice-sub">
            Seller details sent to ZATCA, and which system each centre reports from
          </p>
        </div>
        {editable && (
          <button type="button" className="btn-primary" onClick={startCreate}>Add centre</button>
        )}
      </div>

      {loading ? (
        <p className="row-message">Loading centres…</p>
      ) : centres.length === 0 && !creating ? (
        <div className="einvoice-empty">
          <h2>No centres set up yet</h2>
          <p>
            A centre needs its VAT number, CRN and address before any of its invoices can be reported.
          </p>
          {editable && (
            <button type="button" className="btn-primary" onClick={startCreate}>Add the first centre</button>
          )}
        </div>
      ) : (
        <div className="settings-layout">
          {/* ---- centre list ---- */}
          <aside className="settings-rail">
            {centres.map((c) => (
              <button
                type="button"
                key={c.CENTERCODE}
                className={!creating && c.CENTERCODE === selectedCode ? 'rail-item active' : 'rail-item'}
                onClick={() => { setCreating(false); setSyncedKey(null); setSelectedCode(c.CENTERCODE); }}>
                <span className="rail-name">{c.CLINICNAME || c.CENTERCODE}</span>
                <span className="rail-meta">{c.ACTIVESOURCE || 'ZENOTI'}</span>
              </button>
            ))}
            {creating && <div className="rail-item active">New centre</div>}
          </aside>

          <div className="settings-body">
            {/* ---- source cutover ---- */}
            {!creating && currentRow && (
              <section className="detail-card">
                <h2>Reporting source</h2>
                <p className="dialog-note">
                  Invoices are matched on their invoice date, so a late Zenoti webhook for a
                  pre-cutover sale still reports correctly.
                </p>
                <div className="field-row">
                  <div className="fld">
                    <label htmlFor="src">Reports from</label>
                    <select id="src" value={activeSource} disabled={!editable}
                      onChange={(e) => setActiveSource(e.target.value)}>
                      {SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fld">
                    <label htmlFor="cut">Switching on</label>
                    <input id="cut" type="date" value={cutoverDate} disabled={!editable}
                      onChange={(e) => setCutoverDate(e.target.value)} />
                  </div>
                  {editable && (
                    <button type="button" className="btn-primary" disabled={busy} onClick={saveCutover}>
                      Save source
                    </button>
                  )}
                </div>
                {activeSource === 'BOTH' && (
                  <p className="inline-warning">
                    While both systems are reporting, a sale recorded in each will reach ZATCA twice
                    under two numbers. Use this only for a short parallel run.
                  </p>
                )}
                {!cutoverDate && activeSource !== 'BOTH' && (
                  <p className="inline-note">
                    With no date set, only {activeSource} invoices are reported, whatever their date.
                  </p>
                )}
              </section>
            )}

            {/* ---- seller profile ---- */}
            <section className="detail-card">
              <h2>{creating ? 'New centre' : 'Seller details'}</h2>

              <div className="field-row">
                <div className="fld">
                  <label htmlFor="cc">Centre code</label>
                  <input id="cc" value={form.centerCode} disabled={!editable || !creating}
                    onChange={set('centerCode')} />
                </div>
                <div className="fld">
                  <label htmlFor="zid">Zenoti centre ID</label>
                  <input id="zid" value={form.sourceCentreId} disabled={!editable}
                    onChange={set('sourceCentreId')} placeholder="Leave blank if not on Zenoti" />
                </div>
                <div className="fld">
                  <label htmlFor="vat">VAT number</label>
                  <input id="vat" value={form.vatNumber} disabled={!editable}
                    onChange={set('vatNumber')} inputMode="numeric" maxLength={15} />
                </div>
              </div>

              <div className="field-row">
                <div className="fld">
                  <label htmlFor="co">Company name</label>
                  <input id="co" value={form.companyName} disabled={!editable} onChange={set('companyName')} />
                </div>
                <div className="fld">
                  <label htmlFor="coar">Company name (Arabic)</label>
                  <input id="coar" dir="rtl" value={form.companyNameAr} disabled={!editable}
                    onChange={set('companyNameAr')} />
                </div>
              </div>

              <div className="field-row">
                <div className="fld">
                  <label htmlFor="cl">Clinic name</label>
                  <input id="cl" value={form.clinicName} disabled={!editable} onChange={set('clinicName')} />
                </div>
                <div className="fld">
                  <label htmlFor="clar">Clinic name (Arabic)</label>
                  <input id="clar" dir="rtl" value={form.clinicNameAr} disabled={!editable}
                    onChange={set('clinicNameAr')} />
                </div>
              </div>

              <div className="field-row">
                <div className="fld">
                  <label htmlFor="crn">Branch CRN</label>
                  <input id="crn" value={form.branchCrn} disabled={!editable} onChange={set('branchCrn')} />
                </div>
                <div className="fld">
                  <label htmlFor="dev">Device ID</label>
                  <input id="dev" value={form.deviceId} disabled={!editable} onChange={set('deviceId')} />
                </div>
              </div>

              <h3>Address</h3>
              <div className="field-row">
                <div className="fld">
                  <label htmlFor="st">Street</label>
                  <input id="st" value={form.streetName} disabled={!editable} onChange={set('streetName')} />
                </div>
                <div className="fld">
                  <label htmlFor="star">Street (Arabic)</label>
                  <input id="star" dir="rtl" value={form.streetNameAr} disabled={!editable}
                    onChange={set('streetNameAr')} />
                </div>
              </div>

              <div className="field-row">
                <div className="fld">
                  <label htmlFor="bn">Building number</label>
                  <input id="bn" value={form.buildingNumber} disabled={!editable}
                    onChange={set('buildingNumber')} />
                </div>
                <div className="fld">
                  <label htmlFor="city">City</label>
                  <input id="city" value={form.cityName} disabled={!editable} onChange={set('cityName')} />
                </div>
                <div className="fld">
                  <label htmlFor="cityar">City (Arabic)</label>
                  <input id="cityar" dir="rtl" value={form.cityNameAr} disabled={!editable}
                    onChange={set('cityNameAr')} />
                </div>
              </div>

              <div className="field-row">
                <div className="fld">
                  <label htmlFor="sub">District</label>
                  <input id="sub" value={form.citySubdivisionName} disabled={!editable}
                    onChange={set('citySubdivisionName')} />
                </div>
                <div className="fld">
                  <label htmlFor="subar">District (Arabic)</label>
                  <input id="subar" dir="rtl" value={form.citySubdivisionNameAr} disabled={!editable}
                    onChange={set('citySubdivisionNameAr')} />
                </div>
                <div className="fld">
                  <label htmlFor="pz">Postal code</label>
                  <input id="pz" value={form.postalZone} disabled={!editable} onChange={set('postalZone')} />
                </div>
              </div>

              <h3>Invoice footnote</h3>
              <div className="field-row">
                <div className="fld fld-grow">
                  <label htmlFor="note">English</label>
                  <textarea id="note" rows={3} value={form.invoiceNoteEn} disabled={!editable}
                    onChange={set('invoiceNoteEn')} />
                </div>
                <div className="fld fld-grow">
                  <label htmlFor="notear">Arabic</label>
                  <textarea id="notear" dir="rtl" rows={3} value={form.invoiceNoteAr} disabled={!editable}
                    onChange={set('invoiceNoteAr')} />
                </div>
              </div>

              {formError && <p className="einvoice-error">{formError}</p>}

              {editable && (
                <div className="dialog-actions">
                  {creating && (
                    <button type="button" className="btn-ghost"
                      onClick={() => { setCreating(false); setSyncedKey(null); }}>
                      Cancel
                    </button>
                  )}
                  <button type="button" className="btn-primary" disabled={busy} onClick={saveProfile}>
                    {busy ? 'Saving…' : 'Save centre'}
                  </button>
                </div>
              )}

              {!creating && currentRow && currentRow.MODIFIEDDATE && (
                <p className="inline-note">
                  Last changed {formatDateTime(currentRow.MODIFIEDDATE)}
                  {currentRow.MODIFIEDBY ? ` by ${currentRow.MODIFIEDBY}` : ''}
                </p>
              )}
            </section>
          </div>
        </div>
      )}

      {toast && <div className={`einvoice-toast ${toast.kind}`}>{toast.message}</div>}
    </div>
  );
};

export default EInvoiceSettings;