import React, { useState, useEffect, useCallback } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';
import { usePermissions } from '../Settings/usePermissions';
import {
  docTypeLabel,
  docTypeClass,
  statusClass,
  formatSAR,
  formatDateTime,
  prettyJson,
  apiRequest,
} from './einvoiceUtils';

const PERM_VIEW = 'EINV.VIEW';
const PERM_MANAGE = 'EINV.MANAGE';

const EInvoiceDetail = ({ recId, onBack, onOpenPrint }) => {
  const perms = usePermissions() || {};
  const can = (activity) =>
    typeof perms.hasPermission === 'function' ? perms.hasPermission(activity) : true;

  const [doc, setDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [payloadTab, setPayloadTab] = useState('request');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/${recId}`);
      setDoc(json.data.document);
      setMessages(json.data.messages || []);
    } catch (err) {
      setError(err.message);
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [recId]);

  useEffect(() => {
    if (can(PERM_VIEW)) load();
  }, [load]);

  const handleRetry = async () => {
    setBusy(true);
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/Retry`, {
        method: 'POST',
        body: JSON.stringify({ recIds: [recId] }),
      });
      const outcome = (json.data || [])[0] || {};
      setToast({
        message: outcome.status === 'Success' ? 'Reported to ZATCA' : json.message,
        kind: outcome.status === 'Success' ? 'success' : 'error',
      });
      setTimeout(() => setToast(null), 4000);
      load();
    } catch (err) {
      setToast({ message: err.message, kind: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  if (!can(PERM_VIEW)) {
    return (
      <div className="einvoice-page">
        <div className="einvoice-empty">
          <h2>No access to e-invoices</h2>
          <p>Ask an administrator to grant you the E-Invoice view permission.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="einvoice-page">
        <button type="button" className="btn-link back-link" onClick={onBack}>Back to e-invoices</button>
        <p className="row-message">Loading document…</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="einvoice-page">
        <button type="button" className="btn-link back-link" onClick={onBack}>Back to e-invoices</button>
        <div className="einvoice-empty">
          <h2>Could not open this document</h2>
          <p>{error || 'The document no longer exists.'}</p>
          <button type="button" className="btn-primary" onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  const errors = messages.filter((m) => m.type === 'Error');
  const warnings = messages.filter((m) => m.type === 'Warning');

  return (
    <div className="einvoice-page">
      <button type="button" className="btn-link back-link" onClick={onBack}>Back to e-invoices</button>

      {/* ---- header ---- */}
      <div className="einvoice-head">
        <div>
          <h1>{doc.ZATCAINVOICENO || doc.POSINVOICENO || `Document ${doc.RECID}`}</h1>
          <p className="einvoice-sub">
            {doc.CLINICNAME || doc.CENTERCODE} · sourced from {doc.SOURCETYPE}
          </p>
        </div>
        <div className="head-actions">
          <span className={`status ${statusClass(doc.STATUS)}`}>{doc.STATUS}</span>
          {onOpenPrint && (
            <button type="button" className="btn-ghost" onClick={() => onOpenPrint(recId)}>Print</button>
          )}
          {can(PERM_MANAGE) && doc.STATUS !== 'Success' && (
            <button type="button" className="btn-primary" disabled={busy} onClick={handleRetry}>
              {busy ? 'Retrying…' : 'Retry submission'}
            </button>
          )}
        </div>
      </div>

      {/* ---- outcome ---- */}
      {errors.length > 0 && (
        <div className="einvoice-messages error">
          <h2>Why this failed</h2>
          <ul>
            {errors.map((m, i) => (
              <li key={i}>
                <span className="msg-code">{m.code || 'ERROR'}</span>
                <span className="msg-text">{m.message}</span>
                <span className="msg-source">{m.source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="einvoice-messages warning">
          <h2>Warnings from ClearTax</h2>
          <ul>
            {warnings.map((m, i) => (
              <li key={i}>
                <span className="msg-code">{m.code || 'WARNING'}</span>
                <span className="msg-text">{m.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- summary ---- */}
      <div className="detail-grid">
        <section className="detail-card">
          <h2>Document</h2>
          <dl>
            <dt>Type</dt>
            <dd><span className={`type-badge ${docTypeClass(doc.DOCTYPE)}`}>{docTypeLabel(doc.DOCTYPE)}</span></dd>
            <dt>ZATCA number</dt>
            <dd>{doc.ZATCAINVOICENO || 'Not yet allocated'}</dd>
            <dt>Source invoice</dt>
            <dd>{doc.POSINVOICENO || doc.SOURCEID}</dd>
            <dt>Invoice date</dt>
            <dd>{formatDateTime(doc.INVOICEDATE)}</dd>
            <dt>Issued</dt>
            <dd>{doc.ISSUEDATE ? `${doc.ISSUEDATE} ${doc.ISSUETIME || ''}` : '—'}</dd>
            {doc.RESOLVEDINVOICENO && (
              <>
                <dt>Resolved as</dt>
                <dd>{doc.RESOLVEDINVOICENO}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="detail-card">
          <h2>Customer</h2>
          <dl>
            <dt>Name</dt>
            <dd>{doc.CUSTOMERNAME || '—'}</dd>
            <dt>Customer ID</dt>
            <dd>{doc.CUSTID || '—'}</dd>
            <dt>Net</dt>
            <dd>{formatSAR(doc.NETAMOUNT)}</dd>
            <dt>VAT</dt>
            <dd>{formatSAR(doc.TAXAMOUNT)}</dd>
            <dt>Total</dt>
            <dd className="strong">{formatSAR(doc.GROSSAMOUNT)}</dd>
          </dl>
        </section>

        <section className="detail-card">
          <h2>ZATCA</h2>
          <dl>
            <dt>UUID</dt>
            <dd className="mono">{doc.ZATCAUUID || '—'}</dd>
            <dt>ICV</dt>
            <dd className="mono">{doc.ICV || '—'}</dd>
            <dt>Attempts</dt>
            <dd>{doc.ATTEMPTS}</dd>
            <dt>Last attempt</dt>
            <dd>{formatDateTime(doc.LASTATTEMPTAT)}</dd>
          </dl>
          {doc.QRCODE && (
            <div className="qr-block">
              <img src={`data:image/png;base64,${doc.QRCODE}`} alt="ZATCA QR code" />
            </div>
          )}
        </section>
      </div>

      {/* ---- raw exchange ---- */}
      <section className="detail-card wide">
        <div className="payload-tabs">
          <button
            type="button"
            className={payloadTab === 'request' ? 'active' : ''}
            onClick={() => setPayloadTab('request')}>
            Request sent
          </button>
          <button
            type="button"
            className={payloadTab === 'response' ? 'active' : ''}
            onClick={() => setPayloadTab('response')}>
            Response received
          </button>
          {doc.INVOICEXML && (
            <button
              type="button"
              className={payloadTab === 'xml' ? 'active' : ''}
              onClick={() => setPayloadTab('xml')}>
              Signed XML
            </button>
          )}
        </div>
        <pre className="payload">
          {payloadTab === 'request'
            ? prettyJson(doc.REQUESTJSON) || 'Nothing was sent — the document failed before submission.'
            : payloadTab === 'response'
            ? prettyJson(doc.RESPONSEJSON) || 'No response was received.'
            : doc.INVOICEXML}
        </pre>
      </section>

      {toast && <div className={`einvoice-toast ${toast.kind}`}>{toast.message}</div>}
    </div>
  );
};

export default EInvoiceDetail;