import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../../config';
import { useNavigate, useSearchParams } from 'react-router-dom';

const paymentModes = [
  { label: 'Cash', icon: 'images/cash.svg', key: 'cash' },
  { label: 'Credit/Debit', icon: 'images/cardimg.svg', key: 'credit' },
  { label: 'Check', icon: 'images/checkbook.svg', key: 'check' },
  { label: 'Advance', icon: 'images/advance.svg', key: 'advance' },
  { label: 'Loyalty', icon: 'images/loyalty.svg', key: 'loyalty' },
  { label: 'Other', icon: 'images/other.svg', key: 'other' }
];

const PaymentBlock = ({
  totalAmount = 0,
  prefillPaymentData,
  invoiceItems = [],
  customer,
  appointmentID,
  centerCode,
  recId: recIdFromProp = ""
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
  const parsedTotalAmount = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;

  const [activeTab, setActiveTab] = useState('cash');
  const [amount, setAmount] = useState(parsedTotalAmount.toString());
  const [payments, setPayments] = useState([]);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);
  const [invoiceSuccessPopup, setInvoiceSuccessPopup] = useState(false);
  const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');
  const [lastGeneratedInvoiceHtml, setLastGeneratedInvoiceHtml] = useState('');
  const [submittedPayments, setSubmittedPayments] = useState([]);
  const [submittedInvoiceItems, setSubmittedInvoiceItems] = useState([]);
  const [submittedTotalAmount, setSubmittedTotalAmount] = useState(0);

  // Loyalty balance state
  const [loyaltyBalance, setLoyaltyBalance] = useState(null);
  const [loyaltyBalanceLoading, setLoyaltyBalanceLoading] = useState(false);
  const [centerRecId, setCenterRecId] = useState(0);

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

  // ---------- Fetch loyalty balance when loyalty tab is active ----------
  useEffect(() => {
    if (activeTab !== 'loyalty' || !recIdFromUrl_final) return;
    setLoyaltyBalanceLoading(true);
    fetch(`${API_BASE_URL}/api/v1/points/balance/${recIdFromUrl_final}`, {
      credentials: 'include',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setLoyaltyBalance(d))
      .catch(e => console.warn('Loyalty balance fetch failed:', e))
      .finally(() => setLoyaltyBalanceLoading(false));
  }, [activeTab, recIdFromUrl_final]);

  // ---------- Fetch center recId from LoadCenters ----------
  useEffect(() => {
    if (!sessionCenterCode) return;
    fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: 'include' })
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

  // ---------- Recompute remaining amount on payments change ----------
  useEffect(() => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, parsedTotalAmount - totalPaid);
    setAmount(remaining.toString());
  }, [payments, parsedTotalAmount, activeTab]);

  // ---------- Fetch Selected Appointment Details based on URL ----------
  useEffect(() => {
    const shouldFetch = !!appointmentIdFromUrl && !!custIdFromUrl && !!sessionCenterCode;
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
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const mappedItems = data.map((row, idx) => ({
            lineNo: row.lineNo ?? idx + 1,
            code: row.serviceCode || "",
            name: row.serviceName || "",
            type: "service",
            price: Number(row.price ?? 0),
            discount: Number(row.discount ?? 0),
            taxpercent: Number(row.taxPercent ?? 0),
            citizentax: Number(row.taxPercent ?? 0),
            practitionerCode: row.doctorId || "",
            practitionerName: row.doctorName || "",
            quantity: Number(row.quantity ?? 1),
          }));
          setApiInvoiceItems(mappedItems);

          // Customer fields
          const firstFromApi = data[0]?.firstName || "";
          const lastFromApi = data[0]?.lastName || "";
          const fullFromApi = data[0]?.fullName || decodePlus(custNameFromUrl);
          const { firstName: splitFirst, lastName: splitLast } = splitName(fullFromApi);

          setApiCustomer({
            custId: data[0]?.custId || custIdFromUrl || "",
            fullName: fullFromApi || "",
            firstName: firstFromApi || splitFirst,
            lastName: lastFromApi || splitLast,
            email: data[0]?.emailId || "",
            mobile: data[0]?.number || "",
            number: data[0]?.number || "",
            status: "", // not provided by this API
          });
        } else {
          setToast({ type: 'error', message: 'Could not load appointment details.' });
        }
      } catch (err) {
        console.error('GetSelectedAppDetails error:', err);
        setToast({ type: 'error', message: 'Failed to fetch appointment details.' });
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

  const generateInvoiceHTML = () => {
    const isCitizen = (effectiveCustomer?.status || '').toLowerCase() === 'citizen';

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
                    <img src="/images/bright.png" alt="Logo" style="max-height: 180px;" />
                  </td>
                  <td style="width: 34%; text-align: center; font-weight: bold; font-size: 16px; vertical-align: middle;">
                    Simplified Tax Invoice<br />فاتورة ضريبية مبسطة
                  </td>
                  <td style="width: 33%; text-align: right; vertical-align: middle;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(generatedInvoiceNumber || 'Invoice')}&size=100x100" alt="QR" style="max-height: 80px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse;">
          <tr><td colspan="2"><p><strong>Invoice Number:</strong> ${generatedInvoiceNumber || ''}</p></td></tr>
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
    const html = generateInvoiceHTML();
    setLastGeneratedInvoiceHtml(html);

    const invoiceHtmlPayload = {
      invoiceNo: generatedInvoiceNumber,
      custID: effectiveCustomer?.custId || "",
      custEmailID: effectiveCustomer?.email || "",
      invoiceHtml: html
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/Invoice/InvoiceEmail`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceHtmlPayload)
      });
      const result = await response.json();
      if (result.success) {
        setToast({ message: "Invoice email sent successfully!", type: "success" });
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
    const updatedPayments = payments.filter(p => p.id !== id);
    setPayments(updatedPayments);
  };

  const getPaymentModeKey = (label) => {
    const mode = paymentModes.find(m => m.label === label);
    return paymentModes.indexOf(mode); // 0..5
  };

  const handleSubmitInvoice = async () => {
    if (payments.length === 0) {
      setFormError('Please add at least one payment method.');
      return;
    }

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
        therapistCode: item.practitionerCode || item.therapistCode || "",
        therapistName: item.practitionerName || item.therapistName || "",
        quantity: qty
      };
    });

    const paymentJson = payments.map((p, index) => ({
      lineNo: index + 1,
      paymentMode: getPaymentModeKey(p.mode),
      paymentName: p.mode,
      cardNumber: p.cardNumber || "",
      totalAmount: parsedTotalAmount,
      paidAmount: p.amount,
      paymentDate: now
    }));

    const payload = {
      appointmentID: appointmentIdFromUrl || "",
      invoiceDate: now,
      centerCode: sessionCenterCode,
      createdBy,
      headerJson,
      linesJson,
      paymentJson,
      status: "",
      responseMessage: ""
    };

    // Optional debug
    // console.log("effectiveCustomer", effectiveCustomer);
    // console.log("effectiveInvoiceItems", effectiveInvoiceItems);
    // console.log("payload", payload);

    try {
      const response = await fetch(`${API_BASE_URL}/api/Invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        setToast({ message: 'Invoice submitted successfully!', type: 'success' });

        // snapshot for print/email
        setSubmittedPayments(payments);
        setSubmittedInvoiceItems(effectiveInvoiceItems);
        setSubmittedTotalAmount(parsedTotalAmount);

        const invoiceNum = result.message || '';
        setGeneratedInvoiceNumber(invoiceNum);
        if (recIdFromUrl_final) {
          const loyaltyPayment = payments.find(p => p.mode === 'Loyalty');
          if (loyaltyPayment) {
            createPointsTransaction('REDEEMED', loyaltyPayment.amount, invoiceNum);
          } else {
            createPointsTransaction('EARN', parsedTotalAmount, invoiceNum);
          }
        }
        setInvoiceSuccessPopup(true);
      } else {
        setToast({ message: result.message || 'Submission failed', type: 'error' });
      }
    } catch (err) {
      console.error('Invoice submission error:', err);
      setToast({ message: err.message, type: 'error' });
    }
  };

  // ---------- Points transaction helper ----------
  const createPointsTransaction = async (transactionType, invoiceTotal, invoiceNumber) => {
    if (!recIdFromUrl_final) return;
    const now = new Date().toISOString();
    try {
      await fetch(`${API_BASE_URL}/api/v1/points/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: centerRecId || 0,
          membershipId: recIdFromUrl_final,
          programId: 0,
          transactionType,
          amount: invoiceTotal,
          points: 0,
          referenceId: 0,
          description: `INV ${invoiceNumber}`,
          expiryDate: now,
          transactionDate: now,
          status: '1',
          pointsBalanceAfter: 0,
        }),
      });
    } catch (err) {
      console.warn('Points transaction failed (non-critical):', err);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const isCompleteEnabled = totalPaid === parsedTotalAmount;
  const change = Math.max(0, parseFloat(amount || 0) - (parsedTotalAmount - totalPaid));

  return (
    <div className="pymntblock">
      <h3 className="sectttl">Mode of Payment</h3>

      {loadingAppDetails && (
        <div className="info" style={{ marginBottom: 8 }}>Loading appointment details…</div>
      )}

      <div className='outpymnt'>
        <div className="pymttabswrp">
          {paymentModes.map((mode) => (
            <div
              key={mode.key}
              className={`pymnttab ${activeTab === mode.key ? 'activetab' : ''}`}
              onClick={() => {
                setActiveTab(mode.key);
                setFormError('');
                setFormData({});
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
              {/* Balance display */}
              <div className="frmdiv">
                {loyaltyBalanceLoading ? (
                  <div style={{ fontSize: 13, color: '#6e7b8f', padding: '8px 0' }}>Loading loyalty balance…</div>
                ) : loyaltyBalance ? (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6e7b8f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Loyalty Balance</div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{display:'flex', gap: 20, alignItems:'center'}}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#334b71', lineHeight: 1 }}>{loyaltyBalance.availablePoints?.toLocaleString() ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#6e7b8f', marginTop: 3 }}>Available pts</div>
                      </div>
                     
                    </div>
                  </div>
                ) : !recIdFromUrl_final ? (
                  <div style={{ fontSize: 13, color: '#cc6b5c', padding: '8px 0' }}>⚠ Select a customer to view loyalty balance.</div>
                ) : null}
              </div>

              {/* Redeem input */}
              {loyaltyBalance && (
                <div className="frmdiv">
                  <label>Points to Redeem:</label>
                  <input
                    type="number"
                    id="redeemAmount"
                    min="0"
                    max={loyaltyBalance.availablePoints ?? 0}
                    value={formData.redeemAmount || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleChange({ target: { id: 'redeemAmount', value: val } });
                      setAmount(val || '0');
                    }}
                    placeholder={`Max ${loyaltyBalance.availablePoints?.toLocaleString() ?? 0} pts`}
                  />
                  {formData.redeemAmount && parseFloat(formData.redeemAmount) > (loyaltyBalance.availablePoints ?? 0) && (
                    <span style={{ fontSize: 11, color: '#cc6b5c', marginTop: 3, display: 'block' }}>
                      Exceeds available points ({loyaltyBalance.availablePoints?.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          <div className="frmdiv">
            <label>Change:</label>
            <input type="text" readOnly value={change.toFixed(2)} className="rdonly" />
          </div>

          {formError && <div className="error">{formError}</div>}
          <div className="frmdiv">
            <button className="pribtnblue" onClick={handleAddPayment}>Add Payment</button>
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
              {payments.length > 0 ? (
                payments.map((p, index) => (
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
                ))
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

      {payments.length > 0 && (
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
        <div className="popouter active smallinvoicepopup">
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