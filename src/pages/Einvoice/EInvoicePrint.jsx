import React, { useState, useEffect, useCallback } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';
import { apiRequest } from './einvoiceUtils';

const DOC_TITLE = {
  INVOICE: { en: 'Sales', ar: 'مبيعات' },
  RETURN: { en: 'Sales Return', ar: 'مرتجع مبيعات' },
  ADVANCE: { en: 'Advance Payment', ar: 'دفعة مقدمة' },
};

/* ---- payload readers ---- */
const val = (node) => (node && node.value !== undefined ? node.value : '');
const money = (node) => `${val(node) || '0.00'} SAR`;

function addressLine(address, lang) {
  if (!address) return '';
  return [
    address.StreetName && address.StreetName[lang],
    address.BuildingNumber && address.BuildingNumber[lang],
    address.CityName && address.CityName[lang],
    address.PostalZone,
    address.CitySubdivisionName && address.CitySubdivisionName[lang],
  ]
    .filter(Boolean)
    .join(', ');
}

const EInvoicePrint = ({ recId, onBack }) => {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiRequest(`${API_BASE_URL}/api/EInvoice/${recId}`);
      setDoc(json.data.document);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [recId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="einvoice-page"><p className="row-message">Loading invoice…</p></div>;

  if (error || !doc) {
    return (
      <div className="einvoice-page">
        <button type="button" className="btn-link back-link" onClick={onBack}>Back</button>
        <div className="einvoice-empty">
          <h2>Could not open this invoice</h2>
          <p>{error || 'The document no longer exists.'}</p>
        </div>
      </div>
    );
  }

  let payload = null;
  try {
    payload = doc.REQUESTJSON ? JSON.parse(doc.REQUESTJSON).EInvoice : null;
  } catch (err) {
    payload = null;
  }

  if (!payload) {
    return (
      <div className="einvoice-page">
        <button type="button" className="btn-link back-link" onClick={onBack}>Back</button>
        <div className="einvoice-empty">
          <h2>Nothing to print yet</h2>
          <p>
            This document failed before a payload was built, so there is no reported invoice to
            print. Fix the reason shown on the detail page and retry it first.
          </p>
        </div>
      </div>
    );
  }

  const supplier = payload.AccountingSupplierParty?.Party || {};
  const customer = payload.AccountingCustomerParty?.Party || {};
  const address = supplier.PostalAddress;
  const lines = payload.InvoiceLine || [];
  const totals = payload.LegalMonetaryTotal || {};
  const taxTotal = (payload.TaxTotal || [])[0] || {};
  const kind = DOC_TITLE[doc.DOCTYPE] || DOC_TITLE.INVOICE;
  const paymentNote = payload.PaymentMeans?.[0]?.PayeeFinancialAccount?.PaymentNote || {};

  const totalRows = [
    ['Sum of Invoice line net amount', 'مجموع صافي مبلغ بند الفاتورة', money(totals.LineExtensionAmount)],
    ['Sum of allowances on document level', 'مجموع البدلات على مستوى الوثيقة', money(totals.AllowanceTotalAmount)],
    ['Invoice total amount without VAT', 'إجمالي مبلغ الفاتورة بدون ضريبة القيمة المضافة', money(totals.TaxExclusiveAmount)],
    ['Invoice total VAT amount', 'إجمالي مبلغ الفاتورة لضريبة القيمة المضافة', money(taxTotal.TaxAmount)],
    ['Invoice total amount with VAT', 'إجمالي مبلغ الفاتورة مع ضريبة القيمة المضافة', money(totals.TaxInclusiveAmount)],
    ['Payable Rounding Amount', 'مبلغ التقريب المستحق الدفع', money(totals.PaybleRoundingAmount)],
    ['Amount Due for Payment', 'المبلغ المستحق للدفع', money(totals.PayableAmount)],
  ];

  return (
    <div className="einvoice-page">
      <div className="print-toolbar">
        <button type="button" className="btn-link" onClick={onBack}>Back</button>
        <button type="button" className="btn-primary" onClick={() => window.print()}>Print</button>
      </div>

      <div className="zatca-doc" id="print-area">
        {/* ---- heading ---- */}
        <div className="zatca-head">
          <div className="zatca-logo" />
          <div className="zatca-title">
            <div className="ar">فاتورة ضريبية مبسطة</div>
            <div className="en">Simplified Tax Invoice</div>
            <div className="sub">{kind.ar} - {kind.en}</div>
          </div>
          <div className="zatca-qr">
            {doc.QRCODE
              ? <img src={`data:image/png;base64,${doc.QRCODE}`} alt="ZATCA QR code" />
              : <span className="qr-missing">QR issued on acceptance</span>}
          </div>
        </div>

        {/* ---- parties ---- */}
        <table className="zatca-party">
          <tbody>
            <tr>
              <td className="lbl">Seller Name:</td>
              <td>{supplier.PartyLegalEntity?.RegistrationName?.en}</td>
              <td dir="rtl">{supplier.PartyLegalEntity?.RegistrationName?.ar}</td>
              <td className="lbl ar" dir="rtl">اسم البائع :</td>
            </tr>
            <tr>
              <td className="lbl">Address:</td>
              <td>{addressLine(address, 'en')}</td>
              <td dir="rtl">{addressLine(address, 'ar')}</td>
              <td className="lbl ar" dir="rtl">العنوان :</td>
            </tr>
            <tr>
              <td className="lbl">VAT No.:</td>
              <td>{supplier.PartyTaxScheme?.CompanyID}</td>
              <td dir="rtl">{supplier.PartyTaxScheme?.CompanyID}</td>
              <td className="lbl ar" dir="rtl">الرقم الضريبي :</td>
            </tr>
            <tr>
              <td className="lbl">Other Seller ID:</td>
              <td>{supplier.PartyIdentification?.ID?.value}</td>
              <td dir="rtl">{supplier.PartyIdentification?.ID?.value}</td>
              <td className="lbl ar" dir="rtl">رقم تعريف آخر للبائع :</td>
            </tr>
            <tr className="spacer"><td colSpan={4} /></tr>
            <tr>
              <td className="lbl">Invoice No :</td>
              <td>{payload.ID?.en}</td>
              <td dir="rtl">{payload.ID?.ar}</td>
              <td className="lbl ar" dir="rtl">رقم الفاتورة :</td>
            </tr>
            <tr>
              <td className="lbl">Invoice Issue Date :</td>
              <td>{payload.IssueDate}</td>
              <td dir="rtl">{payload.IssueDate}</td>
              <td className="lbl ar" dir="rtl">تاريخ إصدار الفاتورة :</td>
            </tr>
            <tr>
              <td className="lbl">Invoice Issue Time :</td>
              <td>{payload.IssueTime}</td>
              <td dir="rtl">{payload.IssueTime}</td>
              <td className="lbl ar" dir="rtl">وقت إصدار الفاتورة :</td>
            </tr>
            <tr className="spacer"><td colSpan={4} /></tr>
            <tr>
              <td className="lbl">Buyer Name:</td>
              <td>{customer.PartyLegalEntity?.RegistrationName?.en}</td>
              <td dir="rtl">{customer.PartyLegalEntity?.RegistrationName?.ar}</td>
              <td className="lbl ar" dir="rtl">اسم المشتري :</td>
            </tr>
            <tr>
              <td className="lbl">Other Buyer ID:</td>
              <td>{customer.PartyIdentification?.ID?.value || ''}</td>
              <td dir="rtl">{customer.PartyIdentification?.ID?.value || ''}</td>
              <td className="lbl ar" dir="rtl">رقم تعريف آخر للمشتري :</td>
            </tr>
          </tbody>
        </table>

        {/* ---- lines ---- */}
        <table className="zatca-lines">
          <thead>
            <tr>
              <th><span className="ar">معرف سطر الفاتورة</span><span className="en">Invoice line identifier</span></th>
              <th><span className="ar">اسم العنصر</span><span className="en">Item name</span></th>
              <th><span className="ar">الكمية المفوترة</span><span className="en">Invoiced quantity</span></th>
              <th><span className="ar">السعر الإجمالي للصنف</span><span className="en">Item gross price</span></th>
              <th><span className="ar">خصم سعر السلعة</span><span className="en">Item price discount</span></th>
              <th><span className="ar">صافي سعر العنصر</span><span className="en">Item net price</span></th>
              <th><span className="ar">قيمة الخصم لسطر الفاتورة</span><span className="en">Invoice line allowance amount</span></th>
              <th><span className="ar">صافي مبلغ سطر الفاتورة</span><span className="en">Invoice line net amount</span></th>
              <th><span className="ar">نسبة ضريبة القيمة المضافة</span><span className="en">Invoiced item VAT rate %</span></th>
              <th><span className="ar">مبلغ ضريبة القيمة المضافة للسطر</span><span className="en">VAT line amount</span></th>
              <th><span className="ar">المبلغ شامل ضريبة القيمة المضافة</span><span className="en">Line amount inclusive VAT</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const allowance = line.Price?.AllowanceCharge || {};
              return (
                <tr key={line.ID}>
                  <td>{line.ID}</td>
                  <td className="item-name">
                    <div>{line.Item?.Name?.en}</div>
                    {line.Item?.Name?.ar && <div dir="rtl">{line.Item.Name.ar}</div>}
                  </td>
                  <td>{Number(val(line.InvoicedQuantity) || 0).toFixed(1)}</td>
                  <td>{val(allowance.BaseAmount) || '0.00'} SAR</td>
                  <td />
                  <td>{money(line.Price?.PriceAmount)}</td>
                  <td>{val(allowance.Amount) || ''}</td>
                  <td>{money(line.LineExtensionAmount)}</td>
                  <td>{line.Item?.ClassifiedTaxCategory?.Percent ?? '0'}</td>
                  <td>{money(line.TaxTotal?.TaxAmount)}</td>
                  <td>{money(line.TaxTotal?.RoundingAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ---- totals ---- */}
        <table className="zatca-totals">
          <tbody>
            {totalRows.map(([en, ar, amount]) => (
              <tr key={en}>
                <td className="amt">{amount}</td>
                <td>
                  <div className="ar" dir="rtl">{ar}</div>
                  <div className="en">{en}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ---- footer ---- */}
        {(paymentNote.en || paymentNote.ar) && (
          <div className="zatca-terms">
            <div>{paymentNote.en}</div>
            <div className="lbl">Payment Terms<span className="ar" dir="rtl"> شروط الدفع</span></div>
          </div>
        )}
        {payload.Note && (payload.Note.en || payload.Note.ar) && (
          <div className="zatca-note">
            <div className="lbl">Note: <span className="ar" dir="rtl">ملحوظة:</span></div>
            <div className="body">{payload.Note.en}</div>
            <div className="body ar" dir="rtl">{payload.Note.ar}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EInvoicePrint;