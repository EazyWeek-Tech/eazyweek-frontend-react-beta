  import React, { useState, useEffect } from 'react';
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
  centerCode
}) => {

    const parsedTotalAmount = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
  const [searchParams] = useSearchParams();
  const appointmentIdFromUrl = (searchParams.get('appointmentid') || appointmentID || '').trim();
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

 const navigate = useNavigate();


    useEffect(() => {
      
      if (prefillPaymentData) {
        setFormData(prefillPaymentData.fields || {});
        setAmount(prefillPaymentData.amount || parsedTotalAmount.toString());
        setActiveTab(prefillPaymentData.mode || 'cash');
      }
    }, [prefillPaymentData]);

    useEffect(() => {
     

    
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, parsedTotalAmount - totalPaid);
      setAmount(remaining.toString());
    }, [payments, parsedTotalAmount, activeTab]);

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
        const { loyaltyType, points } = formData;
        if (!loyaltyType || !points) {
          setFormError('Please provide loyalty type and points.');
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
 /*  const handlePopupClose = () => {
        resetAll();
        if (typeof window !== "undefined") {
    window.location.reload();        // refresh current page
  } else {
    navigate(0);                     // fallback for environments without window
  }
      }; */
const generateInvoiceHTML = () => {
  const isCitizen = customer?.status?.toLowerCase() === 'citizen';

  // Prefer submitted snapshots after invoice is created
  const srcItems = submittedInvoiceItems?.length ? submittedInvoiceItems : invoiceItems;
  const srcPayments = submittedPayments?.length ? submittedPayments : payments;
  const grossTotal = submittedTotalAmount || parsedTotalAmount;

  const invoiceItemRows = srcItems.map((item, idx) => {
    const price = parseFloat(item.price) || 0;
    const discount = parseFloat(item.discount) || 0;
    const amountWithoutVat = Math.max(price - discount, 0);
    const taxRate = isCitizen ? parseFloat(item.citizentax) || 0 : parseFloat(item.taxpercent) || 0;
    const tax = (amountWithoutVat * taxRate) / 100;
    const total = amountWithoutVat + tax;
    return `
      <tr>
        <td style="border:1px solid #000;padding:6px;">${idx + 1}</td>
        <td style="border:1px solid #000;padding:6px;">${item.name}</td>
        <td style="border:1px solid #000;padding:6px;">1</td>
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
    <html lang="en" dir="rtl">
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
        <tr><td style="border:1px solid #000;padding:6px;"><strong>Buyer Name:</strong></td><td style="border:1px solid #000;padding:6px;">${customer?.fullName || ''}</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;"><strong>Mobile:</strong></td><td style="border:1px solid #000;padding:6px;">${customer?.mobile || customer?.number || ''}</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;"><strong>Nationality Status:</strong></td><td style="border:1px solid #000;padding:6px;">${customer?.status || ''}</td></tr>
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
      custID: customer?.custId || "",
      custEmailID: customer?.email || "",
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
  console.log('reset all')
  setPayments([]);
  setFormData({});
  setAmount(parsedTotalAmount.toString());
  setActiveTab('cash');
  setFormError('');
  setGeneratedInvoiceNumber('');
  setLastGeneratedInvoiceHtml('');
  setInvoiceSuccessPopup(false);
};


    const handleDelete = (id) => {
      const updatedPayments = payments.filter(p => p.id !== id);
      setPayments(updatedPayments);
    };

    

    const handleSubmitInvoice = async () => {
  //     if (!appointmentIdFromUrl) {
  //   setFormError('Missing appointment ID in URL.');
  //   return;
  // }
  if (payments.length === 0) {
    setFormError('Please add at least one payment method.');
    return;
  }

  const now = new Date().toISOString();
  const isCitizen = customer?.status?.toLowerCase() === 'citizen';
  const tax = invoiceItems.reduce((sum, i) => {
    const price = parseFloat(i.price) || 0;
    const disc = parseFloat(i.discount) || 0;
    const netAmount = Math.max(price - disc, 0);
    const rate = isCitizen ? parseFloat(i.citizentax) || 0 : parseFloat(i.taxpercent) || 0;
    return sum + (netAmount * rate) / 100;
  }, 0);
console.log(customer)
  const headerJson = [
    {
      custId: customer?.custid || "CUST-001",
      firstName: customer?.firstName || "",
      lastName: customer?.lastName || "",
      gender: customer?.gender || "",
      mobileNumber: customer?.mobile || "",
      emailID: customer?.email || "",
      netPrice: parseFloat((parsedTotalAmount - tax).toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      roundingOff: 0,
      sumTotal: parseFloat(parsedTotalAmount.toFixed(2)),
      isClosed: 1,
      appointmentID: appointmentIdFromUrl,
    }
  ];

  const linesJson = invoiceItems.map((item, index) => {
  const price = parseFloat(item.price) || 0;
  const discount = parseFloat(item.discount) || 0;
  const netAmount = price - discount;
  const taxRate = isCitizen ? parseFloat(item.citizentax) || 0 : parseFloat(item.taxpercent) || 0;
  const tax = (netAmount * taxRate) / 100;
  const finalAmount = netAmount + tax;

  return {
    lineNo: index + 1,
    itemCode: item.code || "",
    itemName: item.name || "",
    itemType: item.type || "service",
    qty: 1,
    salesAmount: price,
    taxamount: parseFloat(tax.toFixed(2)),
    finalAmount: parseFloat(finalAmount.toFixed(2)),
    discountAmount: discount,
    therapistCode: item.practitionerCode || "",      
    therapistName: item.practitionerName || ""       
  };
});

const getPaymentModeKey = (label) => {
  const mode = paymentModes.find(m => m.label === label);
  return paymentModes.indexOf(mode); // Returns index like 0,1,2
};

  const paymentJson = payments.map((p, index) => ({
    lineNo: index + 1,
    paymentMode: getPaymentModeKey(p.mode),
    paymentName: p.mode,
    cardNumber: p.cardNumber || "",
    totalAmount: parsedTotalAmount,
    paidAmount: p.amount,
    paymentDate: now
  }));
const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || '{}');
console.log(paymentJson)
const createdBy = user?.userId || '';
const centerCode = user?.centerCode || '';

  const payload = {
   appointmentID: appointmentIdFromUrl,
    invoiceDate: now,
      createdBy, // logged-in user ID

    centerCode,
    headerJson,
    linesJson,
    paymentJson
  };
console.log("Invoice Payload", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${API_BASE_URL}/api/Invoice`, {
 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    console.log(result);
    if (result.success) {
      setToast({ message: 'Invoice submitted successfully!', type: 'success' });
      setSubmittedPayments(payments);
  setSubmittedInvoiceItems(invoiceItems);
  setSubmittedTotalAmount(parsedTotalAmount);

  setGeneratedInvoiceNumber(result.message || ''); // Adjust key based on actual API response
  setInvoiceSuccessPopup(true);
    } else {
      setToast({ message: result.message || 'Submission failed', type: 'error' });
    }
  } catch (err) {
    console.error('Invoice submission error:', err);
    setToast({ message: err.message, type: 'error' });
  }
};


    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const isCompleteEnabled = totalPaid === parsedTotalAmount;
    const change = Math.max(0, parseFloat(amount || 0) - (parsedTotalAmount - totalPaid));

    return (
      <div className="pymntblock">
        <h3 className="sectttl">Mode of Payment</h3>
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
                <div className="frmdiv">
                  <label>Loyalty Type:</label>
                  <select id="loyaltyType" onChange={handleChange} value={formData.loyaltyType || ''}>
                    <option value="">Select</option>
                    <option>Reward Points</option>
                    <option>Membership</option>
                  </select>
                </div>
                <div className="frmdiv">
                  <label>Points:</label>
                  <input type="text" id="points" value={formData.points || ''} onChange={handleChange} />
                </div>
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
