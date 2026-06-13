import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../../config';
// CreditNoteRedemption modal removed — CN selection is now inline in tab content
import { useNavigate, useSearchParams } from 'react-router-dom';

const TOKEN = () => {
  const t = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!t) console.warn("[PaymentBlock] No token found in localStorage or sessionStorage");
  return t;
};
const authHeaders = () => {
  const t = TOKEN();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
};

const paymentModes = [
  { label: 'Cash',               icon: 'images/cash.svg',      key: 'cash'        },
  { label: 'Credit/Debit',       icon: 'images/cardimg.svg',   key: 'credit'      },
  { label: 'Check',              icon: 'images/checkbook.svg', key: 'check'       },
  { label: 'Advance',            icon: 'images/advance.svg',   key: 'advance'     },
  { label: 'Credit Note',        icon: 'images/advance.svg',   key: 'creditnote'  },
  { label: 'Loyalty',            icon: 'images/loyalty.svg',   key: 'loyalty'     },
  { label: 'Other',              icon: 'images/other.svg',     key: 'other'       },
];

const PaymentBlock = ({
  appliedPromotions = [],
  totalAmount = 0,
  prefillPaymentData,
  invoiceItems = [],
  customer,
  appointmentID,
  centerCode,
  recId: recIdFromProp = "",
  packageRedemption = null,   // { recId, packageCode, packageName, purchaseInvoiceNum, purchaseDate, serviceCode, serviceName }
  onRedemptionComplete = null,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ---------- URL params (trimmed) ----------
  const custIdFromUrl = (searchParams.get('custid') || '').trim();
  const custNameFromUrl = (searchParams.get('custname') || '').trim();
  const appointmentIdFromUrl = (searchParams.get('appointmentid') || appointmentID || '').trim();
  const isPaymentMadeFromUrl = (searchParams.get('isPaymentMade') || '').trim();
  // recId: prefer prop (passed from parent who has it from customer select or URL), fallback to URL param
  const recIdFromUrl = (searchParams.get('recid') || '').trim();
  const recIdFromUrl_final = recIdFromProp || recIdFromUrl || customer?.recId || "";

  // ---------- session user (centerCode/createdBy) ----------
  const sessionUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const createdBy = sessionUser?.userId || '';
  const sessionCenterCode = sessionUser?.centerCode || centerCode || '';

  // ---------- Derived state ----------
  const _rawTotal = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
  // Subtract invoice-level promotion discounts so payment total reflects the actual amount due
  const _invoiceLevelDiscount = appliedPromotions
    .filter(p => p.applicationLevel === "Invoice Level")
    .reduce((sum, p) => sum + parseFloat(p.discountAmount || 0), 0);
  const parsedTotalAmount = Math.max(0, _rawTotal - _invoiceLevelDiscount);

  const [activeTab, setActiveTab] = useState('cash');
  const [amount, setAmount] = useState(parsedTotalAmount.toString());
  const [payments, setPayments] = useState([]);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);
  const [invoiceSuccessPopup, setInvoiceSuccessPopup] = useState(false);
  const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');
  const [lastGeneratedInvoiceHtml, setLastGeneratedInvoiceHtml] = useState('');
  const [submittedPayments,   setSubmittedPayments]   = useState([]);
  const [appliedCreditNotes,  setAppliedCreditNotes]  = useState([]);
  const [availableCNs,        setAvailableCNs]        = useState([]);
  const [cnLoading,           setCnLoading]           = useState(false);
  const [selectedCN,          setSelectedCN]          = useState(null);
  const [cnAmount,            setCnAmount]            = useState('');
  const [submittedInvoiceItems, setSubmittedInvoiceItems] = useState([]);
  const [submittedTotalAmount, setSubmittedTotalAmount] = useState(0);

  // Loyalty balance state
  const [loyaltyBalance, setLoyaltyBalance] = useState(null);
  const [loyaltyBalanceLoading, setLoyaltyBalanceLoading] = useState(false);
  const [centerRecId, setCenterRecId] = useState(0);
  const [loyaltyEnrollmentType, setLoyaltyEnrollmentType] = useState('ONREQUEST'); // AUTO | ONREQUEST
  const [loyaltyPointsValue, setLoyaltyPointsValue] = useState(null); // SAR value from get-points
  const [loyaltyPointsLoading, setLoyaltyPointsLoading] = useState(false);
  const [loyaltyPointsError, setLoyaltyPointsError] = useState('');
  const [centreLogo,          setCentreLogo]          = useState('');  // from CentreSettings

  // Local state from GetSelectedAppDetails API
  const [apiInvoiceItems, setApiInvoiceItems] = useState([]);
  const [apiCustomer, setApiCustomer] = useState(null);
  const [loadingAppDetails, setLoadingAppDetails] = useState(false);

  // ---------- Prefill from parent ----------
  useEffect(() => {
    if (prefillPaymentData) {
      setFormData(prefillPaymentData.fields || {});
      setAmount(prefillPaymentData.amount || parsedTotalAmount.toString());
      setActiveTab(prefillPaymentData.mode || 'cash');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillPaymentData]);

  // ---------- Fetch centre logo + settings ----------------------------------------
  useEffect(() => {
    if (!sessionCenterCode) return;
    fetch(`${API_BASE_URL}/api/Invoice/CentreSettings/${sessionCenterCode}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const cfg = d?.data ?? d;
        if (cfg?.logoUrl) setCentreLogo(cfg.logoUrl);
      })
      .catch(() => {}); // fail silently — logo is cosmetic
  }, [sessionCenterCode]);

  // ---------- Fetch loyalty program enrollmentType on mount ----------------------
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/LoyaltyProgram/program/list?pageNumber=1&pageSize=1`, {
      headers: authHeaders(),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const programs = d?.data?.data ?? d?.data ?? [];
        if (programs.length > 0) {
          setLoyaltyEnrollmentType(programs[0].enrollmentType ?? 'ONREQUEST');
        }
      })
      .catch(() => {}); // non-critical
  }, []);

  // ---------- Fetch center recId from LoadCenters ----------
  useEffect(() => {
    if (!sessionCenterCode) return;
    fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const centers = Array.isArray(data) ? data : [];
        const match = centers.find(c =>
          (c.code || '').toLowerCase() === sessionCenterCode.toLowerCase()
        );
        if (match?.recid) setCenterRecId(match.recid);
      })
      .catch(e => console.warn('LoadCenters failed:', e));
  }, [sessionCenterCode]);

  // ---------- Helpers ----------
  const splitName = (full = "") => {
    const s = String(full).trim();
    if (!s) return { firstName: "", lastName: "" };
    const parts = s.split(/\s+/);
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || ""
    };
  };

  const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== "";

  // merge two objects by preferring non-empty values from b over a
  const mergeNonEmpty = (a = {}, b = {}) => {
    const out = { ...a };
    for (const k of Object.keys(b)) {
      if (hasVal(b[k])) out[k] = b[k];
    }
    return out;
  };

  const decodePlus = (s) => {
    try {
      return decodeURIComponent(s.replace(/\+/g, ' '));
    } catch {
      return s;
    }
  };

  // ---------- Load available credit notes when CN tab activated ----------
  useEffect(() => {
    const custId = effectiveCustomer?.custId || custIdFromUrl;
    if (activeTab !== 'creditnote' || !custId) return;
    setCnLoading(true);
    fetch(`${API_BASE_URL}/api/SalesReturn/AvailableCreditNotes/${custId}`, {
      headers: authHeaders()
    })
      .then(r => r.json())
      .then(j => {
        const list = Array.isArray(j.data) ? j.data : Array.isArray(j) ? j : [];
        setAvailableCNs(list);
        setSelectedCN(null);
        setCnAmount('');
      })
      .catch(() => setAvailableCNs([]))
      .finally(() => setCnLoading(false));
  }, [activeTab, custIdFromUrl]);

  // ---------- Recompute remaining amount on payments change ----------
  useEffect(() => {
    // Invoice-level promos for display in PaymentBlock summary (mirrors InvoiceTable tfoot)
  const _invoicePromos = appliedPromotions.filter(p => p.applicationLevel === "Invoice Level");

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
               + appliedCreditNotes.reduce((sum, cn) => sum + cn.amount, 0);
    const remaining = Math.max(0, parsedTotalAmount - totalPaid);
    setAmount(remaining.toString());
  }, [payments, parsedTotalAmount, activeTab, appliedCreditNotes]);

  // ---------- Fetch Selected Appointment Details based on URL ----------
  useEffect(() => {
    // Skip if parent already supplied items — avoids duplicate fetch and false error toast
    const shouldFetch = !!appointmentIdFromUrl && !!custIdFromUrl && !!sessionCenterCode && !invoiceItems?.length;
    if (!shouldFetch) return;

    const fetchDetails = async () => {
      try {
        setLoadingAppDetails(true);
        const payload = {
          custID: custIdFromUrl,
          appointmentID: appointmentIdFromUrl,
          centerCode: sessionCenterCode
        };

        const res = await fetch(`${API_BASE_URL}/api/Appointment/GetSelectedAppDetails`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });

        const json = await res.json();
        // Unwrap Node { success, data } envelope
        const data = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];

        if (data.length > 0) {
          const mappedItems = data.map((row, idx) => ({
            lineNo:           row.lineNo       ?? idx + 1,
            code:             row.serviceCode  || "",
            name:             row.serviceName  || "",
            type:             "service",
            price:            Number(row.price ?? 0),
            discount:         Number(row.discount ?? 0),
            taxpercent:       Number(row.taxPercent ?? 0),
            citizentax:       Number(row.taxPercent ?? 0),
            practitionerCode: row.doctorId     || "",
            practitionerName: row.doctorName   || "",
            quantity:         Number(row.quantity ?? 1),
            appointmentId:    row.appointmentId || "",  // per-line REFERENCEID for invoice tracking
          }));
          setApiInvoiceItems(mappedItems);

          const d0 = data[0];
          const fullFromApi = d0?.fullName || decodePlus(custNameFromUrl);
          const { firstName: splitFirst, lastName: splitLast } = splitName(fullFromApi);
          setApiCustomer({
            custId:    d0?.custId   || custIdFromUrl || "",
            fullName:  fullFromApi  || "",
            firstName: d0?.firstName || splitFirst,
            lastName:  d0?.lastName  || splitLast,
            email:     d0?.emailId  || "",
            mobile:    d0?.number   || "",
            number:    d0?.number   || "",
            status:    String(d0?.nationalityId || "") === "84" ? "Citizen" : "Expat",
          });
        }
        // Silently skip toast — parent (index.jsx) already handles this data
      } catch (err) {
        console.error('GetSelectedAppDetails error in PaymentBlock:', err);
        // Only show toast if parent didn't already supply items
        if (!invoiceItems?.length) {
          setToast({ type: 'error', message: 'Failed to fetch appointment details.' });
        }
      } finally {
        setLoadingAppDetails(false);
      }
    };

    fetchDetails();
  }, [API_BASE_URL, appointmentIdFromUrl, custIdFromUrl, sessionCenterCode, custNameFromUrl]);

  // ---------- Effective customer (merge parent + API; parent wins if non-empty) ----------
  const effectiveCustomer = useMemo(() => {
    if (!customer && !apiCustomer) return null;
    // api first -> then parent non-empty wins
    return mergeNonEmpty(apiCustomer || {}, customer || {});
  }, [apiCustomer, customer]);

  // Derived from effective customer — must be after effectiveCustomer is defined
  const isLoyaltyEnrolled = !!(effectiveCustomer?.isLoyaltyEnrolled ?? customer?.isLoyaltyEnrolled);

  // ---------- Fetch loyalty balance when loyalty tab opened --------------------
  // Must be after isLoyaltyEnrolled is defined
  useEffect(() => {
    const effectivelyEnrolled = loyaltyEnrollmentType === 'AUTO' || isLoyaltyEnrolled;
    if (activeTab !== 'loyalty' || !recIdFromUrl_final || !effectivelyEnrolled) return;
    setLoyaltyBalanceLoading(true);
    fetch(`${API_BASE_URL}/api/v1/points/balance/${recIdFromUrl_final}`, {
      headers: authHeaders(),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setLoyaltyBalance(d?.data ?? d))
      .catch(e => console.warn('Loyalty balance fetch failed:', e))
      .finally(() => setLoyaltyBalanceLoading(false));
  }, [activeTab, recIdFromUrl_final, loyaltyEnrollmentType, isLoyaltyEnrolled]);

  // ---------- Effective items (enrich parent items from API by code/name) ----------
  const effectiveInvoiceItems = useMemo(() => {
    if (!invoiceItems?.length && apiInvoiceItems?.length) return apiInvoiceItems;

    if (invoiceItems?.length && apiInvoiceItems?.length) {
      const byCode = new Map(apiInvoiceItems.map(i => [String(i.code || "").toLowerCase(), i]));
      const byName = new Map(apiInvoiceItems.map(i => [String(i.name || "").toLowerCase(), i]));

      return invoiceItems.map(it => {
        const keyCode = String(it.code || "").toLowerCase();
        const keyName = String(it.name || "").toLowerCase();
        const match = (keyCode && byCode.get(keyCode)) || (keyName && byName.get(keyName)) || {};
        // API fills blanks; parent non-empty stays
        return mergeNonEmpty(match, it);
      });
    }

    return invoiceItems || [];
  }, [invoiceItems, apiInvoiceItems]);

  // ---------- Form helpers ----------
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id || e.target.name]: e.target.value,
    }));
  };

  const validateForm = () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setFormError('Please enter a valid amount.');
      return false;
    }

    if (activeTab === 'credit') {
      const { cardType, cardNumber, bankName, receipt, expiry } = formData;
      if (!cardType || !cardNumber || !bankName || !receipt || !expiry) {
        setFormError('Please fill all credit card details.');
        return false;
      }
    }

    if (activeTab === 'check') {
      const { checkNumber, bankName, checkDate } = formData;
      if (!checkNumber || !bankName || !checkDate) {
        setFormError('Please complete all check details.');
        return false;
      }
    }

    if (activeTab === 'loyalty') {
      const redeemAmt = parseFloat(formData.redeemAmount || '');
      if (!redeemAmt || redeemAmt <= 0) {
        setFormError('Please enter the points amount to redeem.');
        return false;
      }
      const available = loyaltyBalance?.availablePoints ?? 0;
      if (redeemAmt > available) {
        setFormError(`Cannot redeem ${redeemAmt} pts — only ${available} pts available.`);
        return false;
      }
      if (loyaltyPointsValue === null) {
        setFormError('Please click "Get Value" to convert points to SAR before adding payment.');
        return false;
      }
    }

    setFormError('');
    return true;
  };

  const handleAddPayment = () => {
    if (!validateForm()) return;

    const newPayment = {
      id: Date.now(),
      mode: paymentModes.find(m => m.key === activeTab)?.label,
      amount: parseFloat(amount),
      date: new Date().toLocaleDateString(),
      cardNumber: formData.cardNumber || ''
    };

    setPayments(prev => [...prev, newPayment]);
    setFormData({});
    setFormError('');
  };

  const handlePopupClose = () => {
    // reset and redirect to /appointment
    resetAll();
    navigate('/appointment');
  };

  const generateInvoiceHTML = (invoiceNumOverride) => {
    const isCitizen = (effectiveCustomer?.status || '').toLowerCase() === 'citizen';
    const invoiceNum = invoiceNumOverride || generatedInvoiceNumber;

    // Prefer submitted snapshots after invoice is created
    const srcItems = submittedInvoiceItems?.length ? submittedInvoiceItems : effectiveInvoiceItems;
    const srcPayments = submittedPayments?.length ? submittedPayments : payments;
    const grossTotal = submittedTotalAmount || parsedTotalAmount;

    const invoiceItemRows = srcItems.map((item, idx) => {
      const qty = Number(item.quantity ?? 1);
      const price = parseFloat(item.price) || 0;
      const discount = parseFloat(item.discount) || 0;
      const amountWithoutVat = Math.max(price - discount, 0) * qty;
      const taxRate = isCitizen ? parseFloat(item.citizentax) || 0 : parseFloat(item.taxpercent) || 0;
      const tax = (amountWithoutVat * taxRate) / 100;
      const total = amountWithoutVat + tax;
      return `
        <tr>
          <td style="border:1px solid #000;padding:6px;">${idx + 1}</td>
          <td style="border:1px solid #000;padding:6px;">${item.name}</td>
          <td style="border:1px solid #000;padding:6px;">${qty}</td>
          <td style="border:1px solid #000;padding:6px;">${price.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:6px;">${discount.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:6px;">${amountWithoutVat.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:6px;">${tax.toFixed(2)} (${taxRate.toFixed(0)}%)</td>
          <td style="border:1px solid #000;padding:6px;">${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const paymentRows = srcPayments.map((p, index) => `
      <tr>
        <td style="border:1px solid #000;padding:6px;">${index + 1}</td>
        <td style="border:1px solid #000;padding:6px;">${p.mode}</td>
        <td style="border:1px solid #000;padding:6px;">${(p.amount || 0).toFixed(2)}</td>
        <td style="border:1px solid #000;padding:6px;">${p.date || ''}</td>
      </tr>
    `).join('');

    const totalPaid = srcPayments.reduce((sum, x) => sum + (x.amount || 0), 0);
    const amountDue = Math.max(0, grossTotal - totalPaid);

    return `
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head>
        <meta charset="UTF-8" />
        <title>Invoice</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #fff; color: #000;">
        <table style="width: 600px; max-width: 600px; margin: auto; font-size: 12px; line-height: 1.6; padding: 20px; border-collapse: collapse;">
          <tr>
            <td colspan="3" style="padding-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 33%; text-align: left; vertical-align: middle;">
                    ${centreLogo ? `<img src="${centreLogo}" alt="Logo" style="max-height:80px;max-width:180px;object-fit:contain;" />` : `<img src="/images/bright.png" alt="Logo" style="max-height:80px;max-width:180px;object-fit:contain;" />`}
                  </td>
                  <td style="width: 34%; text-align: center; font-weight: bold; font-size: 16px; vertical-align: middle;">
                    Simplified Tax Invoice<br />فاتورة ضريبية مبسطة
                  </td>
                  <td style="width: 33%; text-align: right; vertical-align: middle;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoiceNum || 'Invoice')}&size=100x100" alt="QR" style="max-height: 80px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse;">
          <tr><td colspan="2"><p><strong>Invoice Number:</strong> ${invoiceNum || ''}</p></td></tr>
          <tr><td style="border:1px solid #000;padding:6px;"><strong>Buyer Name:</strong></td><td style="border:1px solid #000;padding:6px;">${effectiveCustomer?.fullName || ''}</td></tr>
          <tr><td style="border:1px solid #000;padding:6px;"><strong>Mobile:</strong></td><td style="border:1px solid #000;padding:6px;">${effectiveCustomer?.mobile || effectiveCustomer?.number || ''}</td></tr>
          <tr><td style="border:1px solid #000;padding:6px;"><strong>Nationality Status:</strong></td><td style="border:1px solid #000;padding:6px;">${effectiveCustomer?.status || ''}</td></tr>
          <tr><td style="border:1px solid #000;padding:6px;"><strong>Date:</strong></td><td style="border:1px solid #000;padding:6px;">${new Date().toLocaleDateString()}</td></tr>
          <tr><td style="border:1px solid #000;padding:6px;"><strong>Time:</strong></td><td style="border:1px solid #000;padding:6px;">${new Date().toLocaleTimeString()}</td></tr>
        </table>

        <h4 style="margin-top: 20px;">Invoice Items</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border:1px solid #000;padding:6px;">No</th>
              <th style="border:1px solid #000;padding:6px;">Item</th>
              <th style="border:1px solid #000;padding:6px;">Qty</th>
              <th style="border:1px solid #000;padding:6px;">Price</th>
              <th style="border:1px solid #000;padding:6px;">Discount</th>
              <th style="border:1px solid #000;padding:6px;">Net</th>
              <th style="border:1px solid #000;padding:6px;">VAT</th>
              <th style="border:1px solid #000;padding:6px;">Total</th>
            </tr>
          </thead>
          <tbody>${invoiceItemRows}</tbody>
        </table>

        <h4 style="margin-top: 20px;">Payment Summary</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border:1px solid #000;padding:6px;">Sr No</th>
              <th style="border:1px solid #000;padding:6px;">Mode</th>
              <th style="border:1px solid #000;padding:6px;">Amount</th>
              <th style="border:1px solid #000;padding:6px;">Date</th>
            </tr>
          </thead>
          <tbody>${paymentRows}</tbody>
        </table>

        <div style="text-align: right; margin-top: 10px;">
          <strong>Total Paid:</strong> ${totalPaid.toFixed(2)} SAR<br />
          <strong>Amount Due:</strong> ${amountDue.toFixed(2)} SAR
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintInvoice = () => {
    const html = generateInvoiceHTML();
    setLastGeneratedInvoiceHtml(html);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleEmailInvoice = async () => {
    if (!generatedInvoiceNumber) {
      setToast({ message: "Invoice number not generated yet.", type: "error" });
      return;
    }
    // Guard: ensure customer has an email address
    const emailAddr = effectiveCustomer?.email || '';
    if (!emailAddr) {
      setToast({ message: "No email address on file for this customer.", type: "error" });
      return;
    }
    // Pass invoiceNum directly so HTML is built with the correct number
    const html = generateInvoiceHTML(generatedInvoiceNumber);
    setLastGeneratedInvoiceHtml(html);

    const invoiceHtmlPayload = {
      invoiceNo: generatedInvoiceNumber,
      custID: effectiveCustomer?.custId || "",
      custEmailID: emailAddr,
      invoiceHtml: html
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/Invoice/InvoiceEmail`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(invoiceHtmlPayload)
      });
      const result = await response.json();
      if (result.success) {
        setToast({ message: `Invoice emailed to ${emailAddr}`, type: "success" });
      } else {
        setToast({ message: result.message || "Failed to send email.", type: "error" });
      }
    } catch (error) {
      console.error("Email send error:", error);
      setToast({ message: "Error while sending email.", type: "error" });
    }
  };

  const resetAll = () => {
    setPayments([]);
    setFormData({});
    setAmount(parsedTotalAmount.toString());
    setActiveTab('cash');
    setFormError('');
    setGeneratedInvoiceNumber('');
    setLastGeneratedInvoiceHtml('');
    setInvoiceSuccessPopup(false);
    // keep API-loaded items/customer (do not clear)
  };

  const handleDelete = (id) => {
    const removedPayment  = payments.find(p => p.id === id);
    const updatedPayments = payments.filter(p => p.id !== id);
    setPayments(updatedPayments);
    // Restore the removed amount back into the input field
    if (removedPayment) {
      const totalAfter = updatedPayments.reduce((s, p) => s + p.amount, 0)
                       + appliedCreditNotes.reduce((s, cn) => s + cn.amount, 0);
      setAmount((Math.max(0, parsedTotalAmount - totalAfter)).toString());
    }
  };

  const getPaymentModeKey = (label) => {
    const mode = paymentModes.find(m => m.label === label);
    return paymentModes.indexOf(mode); // 0..5
  };

  const handleSubmitInvoice = async () => {
    if (!isZeroTotal && payments.length === 0 && appliedCreditNotes.length === 0) {
      setFormError('Please add at least one payment method.');
      return;
    }
    setFormError('');

    /* if (!appointmentIdFromUrl) {
      setFormError('Missing appointment ID in URL.');
      return;
    } */

    const now = new Date().toISOString();
    const isCitizen = (effectiveCustomer?.status || '').toLowerCase() === 'citizen';

    // tax sum based on items we are actually submitting
    const tax = effectiveInvoiceItems.reduce((sum, i) => {
      const qty = Number(i.quantity ?? i.qty ?? 1);
      const price = parseFloat(i.price) || 0;
      const disc = parseFloat(i.discount) || 0;
      const netAmount = Math.max(price - disc, 0) * qty;
      const rate = isCitizen ? parseFloat(i.citizentax) || 0 : parseFloat(i.taxpercent) || 0;
      return sum + (netAmount * rate) / 100;
    }, 0);

    // Final header first/last with safe fallbacks
    const buyerFullName = effectiveCustomer?.fullName || decodePlus(custNameFromUrl) || "";
    const split = splitName(buyerFullName);
    const headerFirst = hasVal(effectiveCustomer?.firstName) ? effectiveCustomer.firstName : split.firstName;
    const headerLast  = hasVal(effectiveCustomer?.lastName)  ? effectiveCustomer.lastName  : split.lastName;

    // Header JSON
    const headerJson = [
      {
        invoiceNumber: "", // server to generate
        custId: effectiveCustomer?.custId || custIdFromUrl || "",
        firstName: headerFirst,
        lastName:  headerLast,
        gender: effectiveCustomer?.gender || "",
        mobileNumber: effectiveCustomer?.mobile || effectiveCustomer?.number || "",
        emailID: effectiveCustomer?.email || "",
        roundingOff: 0,
        netPrice: parseFloat((parsedTotalAmount - tax).toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        sumTotal: parseFloat(parsedTotalAmount.toFixed(2)),
        isClosed: 1
      }
    ];

    // Lines JSON (ensure itemCode & therapist fields)
    // Each line carries its own appointmentId (= per-line REFERENCEID from CLINIC_BOOKAPPOINTMENT)
    // so CLINIC_APPOINTMENT_INVOICE can match back to the correct appointment line
    const linesJson = effectiveInvoiceItems.map((item, index) => {
      const qty = Number(item.quantity ?? item.qty ?? 1);
      const price = parseFloat(item.price) || 0;
      const discount = parseFloat(item.discount) || 0;
      const netAmount = Math.max(price - discount, 0) * qty;
      const taxRate = isCitizen ? parseFloat(item.citizentax) || 0 : parseFloat(item.taxpercent) || 0;
      const taxAmt = (netAmount * taxRate) / 100;
      const finalAmount = netAmount + taxAmt;

      return {
        lineNo: index + 1,
        itemCode: item.code || item.itemCode || "",
        itemName: item.name || item.itemName || "",
        itemType: item.type || "service",
        qty,
        salesAmount: parseFloat(price.toFixed(2)),
        taxamount: parseFloat(taxAmt.toFixed(2)),
        finalAmount: parseFloat(finalAmount.toFixed(2)),
        discountAmount: parseFloat(discount.toFixed(2)),
        therapistCode:  item.practitionerCode || item.therapistCode || "",
        appointmentID:  item.appointmentId    || item.appointmentID || appointmentIdFromUrl || "",
        therapistName: item.practitionerName || item.therapistName || "",
        quantity: qty
      };
    });

    // Build paymentJson — includes both regular payments AND applied Credit Notes
    const cnPayments = appliedCreditNotes.map((cn, i) => ({
      lineNo:       payments.length + i + 1,
      paymentMode:  0,
      paymentName:  `Credit Note - ${cn.creditNoteNum}`,
      cardNumber:   cn.creditNoteNum,   // store CN number in cardNumber field for reference
      totalAmount:  parsedTotalAmount,
      paidAmount:   cn.amount,
      paymentDate:  now,
    }));

    const regularPayments = payments.map((p, index) => ({
      lineNo:      index + 1,
      paymentMode: getPaymentModeKey(p.mode),
      paymentName: p.mode,
      cardNumber:  p.cardNumber || "",
      totalAmount: parsedTotalAmount,
      paidAmount:  p.amount,
      paymentDate: now,
    }));

    // SP requires at least one payment line — for zero-total (package redemption),
    // send a SAR 0 "Package Redemption" entry so SP doesn't reject the payload
    // PR-012/013/014/015: Store package redemption details in payment record
    // paymentName = 'Advance Redemption', cardNumber encodes packageCode|purchaseInvoice|purchaseDate
    const zeroPayment = (isZeroTotal && regularPayments.length === 0 && cnPayments.length === 0)
      ? [{
          lineNo:      1,
          paymentMode: 0,
          paymentName: "Advance Redemption",
          cardNumber:  [
            packageRedemption?.packageCode        || "",
            packageRedemption?.purchaseInvoiceNum || "",
            packageRedemption?.purchaseDate
              ? new Date(packageRedemption.purchaseDate).toISOString().split("T")[0]
              : "",
          ].join("|"),
          totalAmount: 0,
          paidAmount:  0,
          paymentDate: now,
        }]
      : [];

    const paymentJson = [...regularPayments, ...cnPayments, ...zeroPayment];

    // Use the first paid line's appointmentId as header APPOINTMENTID
    // This ensures the SP stores the correct appointment reference
    const firstLineAppointmentId = linesJson[0]?.appointmentID || appointmentIdFromUrl || "";
    const payload = {
      appointmentID: firstLineAppointmentId,
      invoiceDate: now,
      centerCode: sessionCenterCode,
      createdBy,
      headerJson,
      linesJson,
      paymentJson,
      status: "",
      responseMessage: ""
    };

    // Debug: verify appointmentId is in each line
    console.log("linesJson appointmentIDs:", linesJson.map(l => ({ item: l.itemCode, apptId: l.appointmentID })));
    // console.log("payload", payload);

    try {
      const response = await fetch(`${API_BASE_URL}/api/Invoice`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const result = await response.json();
console.log('[PaymentBlock] Invoice API response:', result); // remove after confirmed
if (result.success) {
  setToast({ message: 'Invoice submitted successfully!', type: 'success' });


        // snapshot for print/email
        setSubmittedPayments(payments);
        setSubmittedInvoiceItems(effectiveInvoiceItems);
        setSubmittedTotalAmount(parsedTotalAmount);

        const invoiceNum = result.message || '';
        setGeneratedInvoiceNumber(invoiceNum);
        // ── Loyalty points — EARN on cash portion, REDEEMED on loyalty portion ──
        const effectivelyEnrolled = loyaltyEnrollmentType === 'AUTO' || isLoyaltyEnrolled;
        if (recIdFromUrl_final && effectivelyEnrolled) {
          const loyaltyPayment = payments.find(p => p.mode === 'Loyalty');
          const loyaltyAmount  = loyaltyPayment ? loyaltyPayment.amount : 0;
          const earnAmount     = parsedTotalAmount - loyaltyAmount; // exclude loyalty portion
          if (earnAmount > 0)  await createPointsTransaction('EARN',     earnAmount,     invoiceNum);
          if (loyaltyPayment)  await createPointsTransaction('REDEEMED', loyaltyAmount,  invoiceNum);
        }
        setInvoiceSuccessPopup(true);

        // ── Package Redemption → decrements BALANCEQTY in CLINIC_CUSTOMER_PACKAGES ──
        if (packageRedemption && invoiceNum) {
          try {
            const custId = effectiveCustomer?.custId || custIdFromUrl || "";
            await fetch(`${API_BASE_URL}/api/Package/Redeem`, {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({
                custId,
                centerCode:           sessionCenterCode,
                packageRecId:         packageRedemption.recId,
                packageCode:          packageRedemption.packageCode,
                serviceCode:          packageRedemption.serviceCode  || "",
                serviceName:          packageRedemption.serviceName  || "",
                redemptionInvoiceNum: invoiceNum,
              }),
            });
            onRedemptionComplete?.();
          } catch (e) {
            console.warn("Package redeem failed:", e.message);
          }
        }

        // ── Record Package Purchases → creates CLINIC_CUSTOMER_PACKAGES rows ──
        const packageItems = effectiveInvoiceItems.filter(i =>
          (i.type === 'package') || (i.itemType === 'package')
        );
        if (packageItems.length > 0 && invoiceNum) {
          const custId     = effectiveCustomer?.custId || custIdFromUrl || "";
          const centerCode = sessionCenterCode || "";
          for (const pkg of packageItems) {
            const packageCode = pkg.code || pkg.servicecode || pkg.itemCode || "";
            if (!packageCode) continue;
            try {
              const pkgRes = await fetch(`${API_BASE_URL}/api/Package/RecordPurchase`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                  custId,
                  centerCode,
                  invoiceNum,
                  invoiceDate: now,
                  packageCode,
                }),
              });
              const pkgJson = await pkgRes.json();
              if (!pkgJson.success) {
                console.warn(`Package ${packageCode} RecordPurchase failed:`, pkgJson.message);
              } else {
                console.log(`Package ${packageCode} recorded. Balance Qty: ${pkgJson.data?.balanceQty}`);
              }
            } catch (e) {
              console.warn(`Package ${packageCode} RecordPurchase error:`, e.message);
            }
          }
        }

        // ── Redeem applied Credit Notes → updates BALANCE in CLINIC_CREDIT_NOTES ──
        if (appliedCreditNotes.length > 0 && invoiceNum) {
          const custId = effectiveCustomer?.custId || custIdFromUrl || "";
          for (const cn of appliedCreditNotes) {
            try {
              const cnRes = await fetch(`${API_BASE_URL}/api/SalesReturn/RedeemCreditNote`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                  custId,
                  creditNoteNum: cn.creditNoteNum,
                  redeemAmount:  cn.amount,
                  invoiceNum,
                }),
              });
              const cnJson = await cnRes.json();
              if (!cnJson.success) {
                console.warn(`CN ${cn.creditNoteNum} redeem failed:`, cnJson.message);
              }
            } catch (e) {
              console.warn(`CN ${cn.creditNoteNum} redeem error:`, e.message);
            }
          }
          setAppliedCreditNotes([]); // clear after successful redemption
        }

      } else {
        setToast({ message: result.message || 'Submission failed', type: 'error' });
      }
    } catch (err) {
      console.error('Invoice submission error:', err);
      setToast({ message: err.message, type: 'error' });
    }
  };

  // ---------- Points transaction helper ----------------------------------------
  const createPointsTransaction = async (transactionType, amount, invoiceNumber) => {
    if (!recIdFromUrl_final) return;
    const now = new Date().toISOString();
    const refMatch = String(invoiceNumber).match(/(\d+)\s*$/);
    const referenceId = refMatch ? parseInt(refMatch[1], 10) : 0;
    try {
      await fetch(`${API_BASE_URL}/api/v1/points/create`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          CustomerId:         centerRecId || 0,
          MembershipId:       recIdFromUrl_final,
          ProgramId:          0,
          TransactionType:    transactionType,
          Amount:             amount,
          Points:             0,            // backend calculates from tier rules
          ReferenceId:        referenceId,
          Description:        `INV ${invoiceNumber}`,
          ExpiryDate:         now,
          TransactionDate:    now,
          PointsBalanceAfter: 0,            // backend recalculates
        }),
      });
    } catch (err) {
      console.warn('Points transaction failed (non-critical):', err);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
               + appliedCreditNotes.reduce((sum, cn) => sum + cn.amount, 0);
  // isZeroTotal: only meaningful when items exist and package redemption made it zero
  const isZeroTotal       = parsedTotalAmount <= 0 && !!packageRedemption;
  const isCompleteEnabled = isZeroTotal || Math.abs(totalPaid - parsedTotalAmount) < 0.01;
  const change = Math.max(0, parseFloat(amount || 0) - (parsedTotalAmount - totalPaid));

  return (
    <div className="pymntblock">
      <h3 className="sectttl">Mode of Payment</h3>

      {loadingAppDetails && (
        <div className="info" style={{ marginBottom: 8 }}>Loading appointment details…</div>
      )}

      {/* Loyalty enrollment status badge */}
      {effectiveCustomer && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLoyaltyEnrolled ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e6f4ef', border: '1px solid #b3d9cc', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#2e7d5e' }}>
              ★ Loyalty Member
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f4f7fb', border: '1px solid #e5ebf3', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
              Not enrolled in loyalty program
            </span>
          )}
          <span style={{ fontSize: 12, color: '#6e7b8f' }}>{effectiveCustomer.fullName || [effectiveCustomer.firstName, effectiveCustomer.lastName].filter(Boolean).join(' ')}</span>
        </div>
      )}

      <div className='outpymnt'>
        <div className="pymttabswrp">
          {paymentModes.map((mode) => (
            <div
              key={mode.key}
              className={`pymnttab ${activeTab === mode.key ? 'activetab' : ''} ${mode.key === 'creditnote' && appliedCreditNotes.length > 0 ? 'activetab' : ''}`}
              onClick={() => {
                setActiveTab(mode.key);
                setFormError('');
                setFormData({});
                setLoyaltyPointsValue(null);
                setLoyaltyPointsError('');
              }}
            >
              <img src={mode.icon} alt={mode.label} />
              <span className="pymttxt">{mode.label}</span>
            </div>
          ))}
        </div>

        <div className="pymntcnt actcont">
          <div className="frmdiv">
            <label>Amount:</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {activeTab === 'credit' && (
            <>
              <div className="frmdiv">
                <label>Card Type:</label>
                <select id="cardType" onChange={handleChange} value={formData.cardType || ''}>
                  <option value="">Select</option>
                  <option>Debit Card</option>
                  <option>Credit Card</option>
                </select>
              </div>
              <div className="frmdiv">
                <label>Card Number (last 4 digits):</label>
                <input
                  type="text"
                  id="cardNumber"
                  maxLength={4}
                  value={formData.cardNumber || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 4) handleChange({ target: { id: 'cardNumber', value: val } });
                  }}
                />
              </div>
              <div className="frmdiv">
                <label>Bank Name:</label>
                <input type="text" id="bankName" value={formData.bankName || ''} onChange={handleChange} />
              </div>
              <div className="frmdiv">
                <label>Receipt Number:</label>
                <input type="text" id="receipt" value={formData.receipt || ''} onChange={handleChange} />
              </div>
              <div className="frmdiv">
                <label>Expiry:</label>
                <input type="date" id="expiry" value={formData.expiry || ''} onChange={handleChange} />
              </div>
            </>
          )}

          {activeTab === 'check' && (
            <>
              <div className="frmdiv">
                <label>Check Number:</label>
                <input type="text" id="checkNumber" value={formData.checkNumber || ''} onChange={handleChange} />
              </div>
              <div className="frmdiv">
                <label>Bank Name:</label>
                <input type="text" id="bankName" value={formData.bankName || ''} onChange={handleChange} />
              </div>
              <div className="frmdiv">
                <label>Check Date:</label>
                <input type="date" id="checkDate" value={formData.checkDate || ''} onChange={handleChange} />
              </div>
            </>
          )}

          {activeTab === 'loyalty' && (
            <>
              {/* Not enrolled guard — skip in AUTO mode, everyone earns */}
              {loyaltyEnrollmentType !== 'AUTO' && !isLoyaltyEnrolled && (
                <div style={{ padding: '12px 14px', background: '#fdf3f3', border: '1px solid #f0c4c0', borderRadius: 8, color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>
                  ⚠ This customer is not enrolled in the loyalty program. Loyalty payments are unavailable.
                </div>
              )}

              {/* Balance display */}
              {(loyaltyEnrollmentType === 'AUTO' || isLoyaltyEnrolled) && <div className="frmdiv">
                {loyaltyBalanceLoading ? (
                  <div style={{ fontSize: 13, color: '#6e7b8f', padding: '8px 0' }}>Loading loyalty balance…</div>
                ) : loyaltyBalance ? (
                  <div style={{ background: '#f0f5ff', border: '1px solid #dce6f0', borderLeft: '4px solid #334b71', borderRadius: 8, padding: '10px 14px', marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6e7b8f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Loyalty Balance</div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#334b71', lineHeight: 1 }}>{loyaltyBalance.availablePoints?.toLocaleString() ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#6e7b8f', marginTop: 3 }}>Available pts</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#cc6b5c', lineHeight: 1 }}>{loyaltyBalance.redeemedPoints?.toLocaleString() ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#6e7b8f', marginTop: 3 }}>Redeemed</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#8da0b8', lineHeight: 1 }}>{loyaltyBalance.expiredPoints?.toLocaleString() ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#6e7b8f', marginTop: 3 }}>Expired</div>
                      </div>
                    </div>
                  </div>
                ) : !recIdFromUrl_final ? (
                  <div style={{ fontSize: 13, color: '#cc6b5c', padding: '8px 0' }}>⚠ Select a customer to view loyalty balance.</div>
                ) : null}
              </div>}

              {/* Points input + convert button */}
              {(loyaltyEnrollmentType === 'AUTO' || isLoyaltyEnrolled) && loyaltyBalance && (
                <>
                  <div className="frmdiv">
                    <label>Points to Redeem:</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        id="redeemAmount"
                        min="0"
                        max={loyaltyBalance.availablePoints ?? 0}
                        value={formData.redeemAmount || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleChange({ target: { id: 'redeemAmount', value: val } });
                          // Reset converted value when points change
                          setLoyaltyPointsValue(null);
                          setLoyaltyPointsError('');
                          setAmount('0');
                        }}
                        placeholder={`Max ${loyaltyBalance.availablePoints?.toLocaleString() ?? 0} pts`}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="pribtnblue"
                        style={{ whiteSpace: 'nowrap', padding: '0 12px', height: 38, fontSize: 13 }}
                        disabled={loyaltyPointsLoading || !formData.redeemAmount || parseFloat(formData.redeemAmount) <= 0}
                        onClick={async () => {
                          const pts = parseFloat(formData.redeemAmount || '0');
                          if (!pts || pts <= 0) return;
                          if (pts > (loyaltyBalance.availablePoints ?? 0)) {
                            setLoyaltyPointsError(`Exceeds available points (${loyaltyBalance.availablePoints?.toLocaleString()})`);
                            return;
                          }
                          setLoyaltyPointsLoading(true);
                          setLoyaltyPointsError('');
                          setLoyaltyPointsValue(null);
                          try {
                            const res = await fetch(
                              `${API_BASE_URL}/api/v1/points/get-points?customerId=${recIdFromUrl_final}&amount=${pts}&TransactionType=REDEEMED`,
                              { headers: authHeaders() }
                            );
                            if (!res.ok) throw new Error(`Failed (${res.status})`);
                            const data = await res.json();
                            // Response: { success, data: <number> }
                            const sarValue = typeof data?.data === 'number' ? data.data
                              : typeof data === 'number' ? data
                              : Number(data?.data ?? data) || 0;
                            setLoyaltyPointsValue(sarValue);
                            setAmount(String(sarValue));
                          } catch (e) {
                            setLoyaltyPointsError('Failed to fetch point value. Try again.');
                          } finally {
                            setLoyaltyPointsLoading(false);
                          }
                        }}
                      >
                        {loyaltyPointsLoading ? 'Checking…' : 'Get Value'}
                      </button>
                    </div>
                    {formData.redeemAmount && parseFloat(formData.redeemAmount) > (loyaltyBalance.availablePoints ?? 0) && (
                      <span style={{ fontSize: 11, color: '#cc6b5c', marginTop: 3, display: 'block' }}>
                        Exceeds available points ({loyaltyBalance.availablePoints?.toLocaleString()})
                      </span>
                    )}
                    {loyaltyPointsError && (
                      <span style={{ fontSize: 11, color: '#cc6b5c', marginTop: 3, display: 'block' }}>{loyaltyPointsError}</span>
                    )}
                  </div>

                  {/* Show converted SAR value */}
                  {loyaltyPointsValue !== null && (
                    <div className="frmdiv">
                      <div style={{ background: '#e6f4ef', border: '1px solid #b3d9cc', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, color: '#2e7d5e', fontWeight: 700 }}>
                          ✓ {parseFloat(formData.redeemAmount).toLocaleString()} pts = <strong>{loyaltyPointsValue} SAR</strong>
                        </span>
                        <span style={{ fontSize: 11, color: '#6e7b8f' }}>— will be applied as payment</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab !== 'creditnote' && (
            <div className="frmdiv">
              <label>Change:</label>
              <input type="text" readOnly value={change.toFixed(2)} className="rdonly" />
            </div>
          )}

          {/* Zero-total banner — shown when package redemption covers full amount */}
      {isZeroTotal && (
        <div style={{ margin:"10px 0", padding:"10px 14px", background:"#e6f4ef",
          border:"1px solid #b3d9cc", borderRadius:8, fontSize:13, color:"#2e7d5e", fontWeight:600 }}>
          ✓ Full amount covered by package redemption — no payment required.
        </div>
      )}

      {/* ── Credit Note inline tab content ── */}
          {activeTab === 'creditnote' && (
            <div style={{ padding: '4px 0' }}>
              {cnLoading ? (
                <div style={{ color: '#64748b', fontSize: 13, padding: '8px 0' }}>Loading credit notes…</div>
              ) : availableCNs.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0', textAlign: 'center' }}>
                  No valid credit notes available for this customer.
                </div>
              ) : (
                <>
                  {availableCNs.map((cn) => (
                    <div key={cn.creditNoteNum}
                      onClick={() => {
                        setSelectedCN(cn);
                        const remaining = Math.max(0, parsedTotalAmount - payments.reduce((s,p)=>s+p.amount,0) - appliedCreditNotes.reduce((s,c)=>s+c.amount,0));
                        setCnAmount(String(Math.min(cn.balance, remaining).toFixed(2)));
                      }}
                      style={{
                        border: `1.5px solid ${selectedCN?.creditNoteNum === cn.creditNoteNum ? '#334b71' : '#e2e8f0'}`,
                        borderRadius: 8, padding: '8px 12px', marginBottom: 8, cursor: 'pointer',
                        background: selectedCN?.creditNoteNum === cn.creditNoteNum ? '#f0f4fa' : '#fff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#334b71' }}>{cn.creditNoteNum}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Expires: {cn.expiryDate ? new Date(cn.expiryDate).toLocaleDateString('en-GB') : '—'}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#2e7d5e' }}>
                        SAR {Number(cn.balance).toFixed(2)}
                      </div>
                    </div>
                  ))}

                  {selectedCN && (
                    <div className="frmdiv" style={{ marginTop: 8 }}>
                      <label>Redeem Amount (max SAR {Number(selectedCN.balance).toFixed(2)}):</label>
                      <input
                        type="number" min={0.01} max={selectedCN.balance} step={0.01}
                        value={cnAmount}
                        onChange={e => setCnAmount(e.target.value)}
                        style={{ border: '1.5px solid #334b71' }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {formError && <div className="error">{formError}</div>}
          <div className="frmdiv">
            {activeTab === 'creditnote' ? (
              <button className="pribtnblue"
                disabled={!selectedCN || !cnAmount || parseFloat(cnAmount) <= 0}
                style={{ opacity: (!selectedCN || !cnAmount) ? 0.5 : 1 }}
                onClick={() => {
                  const amt = parseFloat(cnAmount);
                  if (!selectedCN) { setFormError('Please select a credit note.'); return; }
                  if (!amt || amt <= 0) { setFormError('Enter a valid redemption amount.'); return; }
                  if (amt > selectedCN.balance) { setFormError(`Amount exceeds CN balance (SAR ${selectedCN.balance.toFixed(2)}).`); return; }
                  const remaining = Math.max(0, parsedTotalAmount - payments.reduce((s,p)=>s+p.amount,0) - appliedCreditNotes.reduce((s,c)=>s+c.amount,0));
                  if (amt > remaining + 0.01) { setFormError(`Amount exceeds remaining balance (SAR ${remaining.toFixed(2)}).`); return; }
                  setAppliedCreditNotes(prev => {
                    const exists = prev.findIndex(p => p.creditNoteNum === selectedCN.creditNoteNum);
                    const entry  = { creditNoteNum: selectedCN.creditNoteNum, recId: selectedCN.recId, amount: amt, balance: selectedCN.balance };
                    if (exists >= 0) { const u=[...prev]; u[exists]=entry; return u; }
                    return [...prev, entry];
                  });
                  setFormError('');
                  setSelectedCN(null);
                  setCnAmount('');
                  setActiveTab('cash'); // switch back to cash tab after applying
                }}>
                Apply Credit Note
              </button>
            ) : (
              <button className="pribtnblue" onClick={handleAddPayment}>Add Payment</button>
            )}
          </div>
        </div>
      </div>

      <div className="pymntlines">
        <div className="payment-table">
          <h4 className="sectttl">Payment Summary</h4>
          <table className="pymntlintbl">
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
              <tr>
                <th>Sr No</th>
                <th>Mode</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(payments.length > 0 || appliedCreditNotes.length > 0) ? (
                <>
                  {payments.map((p, index) => (
                    <tr key={p.id}>
                      <td>{index + 1}</td>
                      <td>{p.mode}</td>
                      <td>{p.amount.toFixed(2)}</td>
                      <td>{p.date}</td>
                      <td>
                        <button onClick={() => handleDelete(p.id)} className="removeln">
                          <img src="images/rmove.svg" alt="Delete" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {appliedCreditNotes.map((cn, i) => (
                    <tr key={`cn-${cn.creditNoteNum}`} style={{ background: '#f0faf5' }}>
                      <td>{payments.length + i + 1}</td>
                      <td>
                        <span style={{ color: '#2e7d5e', fontWeight: 700 }}>📄 {cn.creditNoteNum}</span>
                      </td>
                      <td>{cn.amount.toFixed(2)}</td>
                      <td>{new Date().toLocaleDateString('en-GB')}</td>
                      <td>
                        <button className="removeln" onClick={() => {
                          const updated = appliedCreditNotes.filter((_,j) => j !== i);
                          setAppliedCreditNotes(updated);
                          const totalAfter = payments.reduce((s,p)=>s+p.amount,0)
                                           + updated.reduce((s,c)=>s+c.amount,0);
                          setAmount((Math.max(0, parsedTotalAmount - totalAfter)).toString());
                        }}>
                          <img src="images/rmove.svg" alt="Delete" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '10px' }}>
                    No payments added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="frmdiv totalpaidrow">
          <strong>Total Amount:</strong> {totalPaid.toFixed(2)}
          {/* {totalPaid.toFixed(2)} / {parsedTotalAmount.toFixed(2)} */}
        </div>
      </div>

      {(payments.length > 0 || appliedCreditNotes.length > 0 || (isZeroTotal && packageRedemption)) && (
        <div className="frmdiv" style={{ textAlign: 'center' }}>
          <button className="pribtnblue" onClick={handleSubmitInvoice} disabled={!isCompleteEnabled}>
            Complete Invoice
          </button>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}



      {invoiceSuccessPopup && (
        <div className="popouter active smallinvoicepopup"
  style={{ display:"flex", position:"fixed", inset:0, zIndex:9999,
    alignItems:"center", justifyContent:"center",
    background:"rgba(0,0,0,.5)" }}>
          <div className="popovrly" onClick={() => setInvoiceSuccessPopup(false)}></div>
          <div className="popin">
            <div className="popuphdr">
              Invoice Submitted
              <span className="clsbtn" onClick={handlePopupClose}>
                <img src="images/clsic.svg" alt="Close" />
              </span>
            </div>

            <div className="popfrm" style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '16px' }}>Invoice Number: {generatedInvoiceNumber}</p>
              <div className="btnbar">
                <button className="pribtnblue" onClick={handlePrintInvoice}>Print Invoice</button>
                <button className="pribtnblue" onClick={handleEmailInvoice}>Email Invoice</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentBlock;