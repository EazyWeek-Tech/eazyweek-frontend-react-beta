import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config';

import InvoiceForm from './components/InvoiceForm';
import InvoiceSummary from './components/InvoiceSummary';
import CustomerSearch from './components/CustomerSearch';
import PaymentBlock from './components/PaymentBlock';
import CategoryTabs from './components/CategoryTabs';
import InvoiceTable from './components/InvoiceTable';
import Toast from './components/Toast';
import SalesReturn from './SalesReturn';
import PackageBalanceChecker from './components/PackageBalanceChecker';
import PromotionModal from './components/PromotionModal';
import AdvancePayment from './components/AdvancePayment';
import { useCustomerNotes } from '../../pages/Customer/CustomerDetails/CustomerNotePopup';
import './styles/InvoicePage.css';

// ── VAT rule (KEEP IN SYNC with InvoiceTable.jsx & PaymentBlock.jsx) ───────────
// base = (price - discount) * qty
//  • Citizen            → no VAT, price as-is (net = base, tax = 0, total = base)
//  • Expat, tax NOT inc → VAT added on top (tax = base*rate%, total = base + tax)
//  • Expat, tax INCLUDED→ price already has VAT; extract it
//                         (net = base/(1+rate), tax = base - net, total = base)
const computeLineAmounts = (price, discount, qty, ratePct, taxIncluded, isCitizen) => {
  const base = Math.max((parseFloat(price) || 0) - (parseFloat(discount) || 0), 0) * (parseFloat(qty) || 1);
  const rate = parseFloat(ratePct) || 0;
  const included = String(taxIncluded ?? "").trim().toLowerCase() === "yes";
  if (isCitizen) return { net: base, tax: 0, total: base, rate: 0 };
  if (included && rate > 0) {
    const net = base / (1 + rate / 100);
    return { net, tax: base - net, total: base, rate };
  }
  const tax = (base * rate) / 100;
  return { net: base, tax, total: base + tax, rate };
};

const InvoicePage = () => {
  const [items, setItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [formResetKey, setFormResetKey] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [suspendedCarts, setSuspendedCarts] = useState([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [toast, setToast] = useState(null);
  const [showReturn,        setShowReturn]        = useState(false);
  const [showPkgBalance,    setShowPkgBalance]    = useState(false);
  const [showPromotion,     setShowPromotion]     = useState(false);
  const [showAdvance,       setShowAdvance]        = useState(false);
  const [appliedPromotions, setAppliedPromotions] = useState([]);
  const [packageRedemption, setPackageRedemption] = useState(null);
  const [clinicName,        setClinicName]        = useState("");
  const [selectedCustomer,  setSelectedCustomer]  = useState(null);
  const [memberFlag, setMemberFlag] = useState(null);
  useEffect(() => {
    const cid = selectedCustomer?.custId || selectedCustomer?.custid || "";
    if (!cid) { setMemberFlag(null); return; }
    (async () => {
      try {
        const tok = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
        const r = await fetch(`${API_BASE_URL}/api/Membership/CustomerStatus/${encodeURIComponent(cid)}`, { headers: { Authorization: `Bearer ${tok}` } });
        const j = await r.json(); const d = j.data || j;
        setMemberFlag(d && d.isMember ? d : null);
      } catch { setMemberFlag(null); }
    })();
  }, [selectedCustomer]);

  // ── Payment notes popup ────────────────────────────────────────────────────
  const { NotePopup: PaymentNotePopup, checkNotes: checkPaymentNotes } = useCustomerNotes();

  const [formTnput, setFormTnput] = useState({ name: '', servicecode: '', doctorId: '' });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const custidFromUrl          = searchParams.get('custid');
  const appointmentIdFromUrl   = searchParams.get('appointmentid');
  const custNameFromUrl        = searchParams.get('custname');
  const isPaidInUrl            = searchParams.get('isPaymentMade') === '1';
  const recIdFromUrl           = searchParams.get('recid')      || '';
  const lineCountFromUrl       = parseInt(searchParams.get('linecount') || '1', 10);
  const appointmentDateFromUrl = searchParams.get('appointmentdate') || '';

  /* Invoice opened from an appointment: the customer is fixed by the URL, so
     Add Customer is locked out. Creating a new customer at this point would
     silently detach the invoice from the appointment it is billing. */
  const fromAppointment = !!(appointmentIdFromUrl || custidFromUrl);

  // ── Load customer + appointment items ─────────────────────────────────────
  useEffect(() => {
    const loadCustomerAndItems = async () => {
      const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
      const centerCode = stored ? JSON.parse(stored).centerCode : "";

      if (appointmentIdFromUrl && custidFromUrl) {
        const payload = {
          custID:          custidFromUrl,
          appointmentID:   appointmentIdFromUrl,
          centerCode,
          appointmentDate: appointmentDateFromUrl || "",
        };
        try {
          const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
          const response = await fetch(`${API_BASE_URL}/api/Appointment/GetSelectedAppDetails`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });
          const json   = await response.json();
          const result = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];

          if (result.length > 0) {
            if (lineCountFromUrl > result.length) {
              console.warn(`Expected ${lineCountFromUrl} service lines but got ${result.length}`);
            }
            const mappedItems = result.map((item) => ({
              name:             item.serviceName  || "",
              code:             item.serviceCode  || "",
              servicecode:      item.serviceCode  || "",
              type:             "service",
              price:            isPaidInUrl ? 0 : parseFloat(item.price || 0),
              originalPrice:    parseFloat(item.price || 0),   // true price kept for restore (e.g. after package removal)
              discount:         0,
              taxpercent:       parseFloat(item.taxPercent || 0),
              citizentax:       parseFloat(item.taxPercent || 0),
              taxIncluded:      item.taxIncluded ?? "No",
              practitionerCode: item.doctorId    || "",
              practitionerName: item.doctorName  || "",
              quantity:         1,
              appointmentId:    item.appointmentId || "",
            }));

            setItems(mappedItems);

            const firstItem = result[0];
            setFormTnput({ name: firstItem.serviceName||'', servicecode: firstItem.serviceCode||'', doctorId: firstItem.doctorId||'' });
            const baseCust = {
              custid:   firstItem.custId   || "",
              fullName: firstItem.fullName || custNameFromUrl || "",
              number:   firstItem.number  || "",
              email:    firstItem.emailId || "",
              gender:   firstItem.gender  || "",
              status:   firstItem.customerType ||
                        (String(firstItem.nationalityId || firstItem.nationality || "") === "84" ? "Citizen" : "Expat"),
              recId:    recIdFromUrl || firstItem.recId || "",
              isLoyaltyEnrolled: false,
            };
            setSelectedCustomer(baseCust);

            // Fetch full customer details to get isLoyaltyEnrolled
            if (firstItem.custId) {
              const tok = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
              fetch(`${API_BASE_URL}/api/Customer/FetchCustomerDetails`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
                body: JSON.stringify({ custID: firstItem.custId }),
              })
                .then(r => r.ok ? r.json() : Promise.reject(r.status))
                .then(d => {
                  const det = d?.data ?? d;
                  setSelectedCustomer(prev => ({
                    ...prev,
                    status: det?.customerType || prev.status,
                    isLoyaltyEnrolled: !!(det?.isLoyaltyEnrolled ?? det?.IS_LOYALTY_ENROLLED ?? false),
                    recId: prev.recId || det?.recId || det?.recid || "",
                  }));
                })
                .catch(() => {}); // non-critical — loyalty just won't show
            }
            return;
          }
        } catch (error) {
          console.error("Error fetching appointment details:", error);
        }
      }

      if (custidFromUrl || custNameFromUrl) {
        setSelectedCustomer({
          custid:   custidFromUrl    || "",
          fullName: custNameFromUrl  || "",
          number: "", email: "", gender: "", status: "",
          recId:    recIdFromUrl     || "",
          isLoyaltyEnrolled: false,
        });
        // Fetch isLoyaltyEnrolled for URL-based customer load
        if (custidFromUrl) {
          const tok = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
          fetch(`${API_BASE_URL}/api/Customer/FetchCustomerDetails`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ custID: custidFromUrl }),
          })
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(d => {
              const det = d?.data ?? d;
              setSelectedCustomer(prev => ({
                ...prev,
                status: prev.status || det?.customerType ||
                        (String(det?.nationalityCode ?? det?.nationalityId ?? "") === "84" ? "Citizen" : "Expat"),
                isLoyaltyEnrolled: !!(det?.isLoyaltyEnrolled ?? det?.IS_LOYALTY_ENROLLED ?? false),
                recId: prev.recId || det?.recId || det?.recid || "",
              }));
            })
            .catch(() => {});
        }
      }
    };

    loadCustomerAndItems();
  }, [appointmentIdFromUrl, custidFromUrl, custNameFromUrl]);

  // ── Fire payment notes popup when invoice page loads with a customer ───────
  useEffect(() => {
    console.log("[InvoicePage] payment trigger useEffect — custidFromUrl:", custidFromUrl);
    if (custidFromUrl) {
      console.log("[InvoicePage] calling checkPaymentNotes for", custidFromUrl);
      checkPaymentNotes(custidFromUrl, "payment");
    } else {
      console.warn("[InvoicePage] no custidFromUrl — popup will not fire");
    }
  }, [custidFromUrl]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('suspendedCarts') || '[]');
    setSuspendedCarts(saved);
  }, [items]);

  const handlePriceChange    = (index, value) => { const u = [...items]; u[index].price    = value; setItems(u); };
  const handleDiscountChange = (index, value) => { const u = [...items]; u[index].discount  = value; u[index]._manualDiscount = parseFloat(value) > 0; setItems(u); };
  const handleRemove         = (index) => setItems(items.filter((_, idx) => idx !== index));
  const handleCopyItem       = (index) => setItems(prev => {
    const original = prev[index];
    if (!original) return prev;
    // Duplicate the full line — service/package, price, discount, practitioner code/name, tax fields, etc.
    // Strip the applied-promotion markers so the copy doesn't double-count a promotion that
    // appliedPromotions still tracks against the original line only.
    const copy = { ...original, _promotionId: undefined, _promotionName: undefined };
    const next = [...prev];
    next.splice(index + 1, 0, copy);
    return next;
  });
  const handleAddItem        = () => setItems([...items, { name: 'New Item', price: '', discount: '' }]);
  const handleAddFormItem    = async (newItem) => {
    // Membership invoices can't mix with other items, and only one membership
    // per invoice (FRD 5.3 rules 3 & 9).
    const isMember      = (newItem.type || newItem.itemType) === 'membership';
    const cartHasMember = items.some(i => (i.type || i.itemType) === 'membership');
    if (isMember && items.length > 0) { setToast({ message: 'A membership must be purchased on its own invoice — no other items.', type: 'error' }); return; }
    if (!isMember && cartHasMember)   { setToast({ message: 'This invoice contains a membership — no other items can be added.', type: 'error' }); return; }

    // Member pricing (FRD §7): for an active member, rewrite the line price to
    // the member price/discount; leave the Discount field empty so manual
    // discounts/promotions can still stack on top (rule 5).
    let toAdd = newItem;
    const t = String(newItem.type || newItem.itemType || '').toLowerCase();
    if (memberFlag && !newItem._membership && (t === 'service' || t === 'package')) {
      try {
        const cid = selectedCustomer?.custId || selectedCustomer?.custid || '';
        const cc  = (JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}').centerCode) || '';
        const tok = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        const res = await fetch(`${API_BASE_URL}/api/Membership/ResolveItemPricing`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify({ customerCode: cid, centerCode: cc, itemCode: newItem.code || newItem.itemCode || newItem.servicecode, itemType: t, originalPrice: parseFloat(newItem.price) || 0 }),
        });
        const j = await res.json(); const d = j.data || j;
        if (d && d.memberApplied) {
          toAdd = { ...newItem, originalPrice: parseFloat(newItem.price) || 0, price: d.effectivePrice, discount: 0,
            _memberApplied: true, _memberNote: d.note, _memberBenefit: d.benefitAmount, _memberBenefitType: d.benefitType };
        }
      } catch { /* on failure, fall back to the normal price */ }
    }
    setItems(prev => [...prev, toAdd]); setFormResetKey(prev => prev + 1);
  };
  const handleManualDiscount = (updatedItems) => setItems(updatedItems.map(item => ({ ...item, _manualDiscount: parseFloat(item.discount) > 0 })));
  const handleSuspendCart    = () => {
    if (items.length === 0) return;
    const suspended = JSON.parse(localStorage.getItem('suspendedCarts') || '[]');
    suspended.push({ id: Date.now(), timestamp: new Date().toLocaleString(), items });
    localStorage.setItem('suspendedCarts', JSON.stringify(suspended));
    setSuspendedCarts(suspended);
    setItems([]);
  };
  const handleRecallCartById = (cartId) => {
    const saved = JSON.parse(localStorage.getItem('suspendedCarts') || '[]');
    const selected = saved.find(cart => cart.id.toString() === cartId);
    if (selected) { setItems(selected.items); const updated = saved.filter(cart => cart.id.toString() !== cartId); localStorage.setItem('suspendedCarts', JSON.stringify(updated)); setSuspendedCarts(updated); }
  };
  const handleClearCart             = () => { setItems([]); setAppliedPromotions([]); };
  const handleRemoveManualDiscount  = (idx) => setItems(prev => prev.map((item, i) => i !== idx ? item : { ...item, discount: 0, _manualDiscount: false }));
  const handleRemovePromotion       = () => { setItems(prev => prev.map(item => !item._promotionId ? item : { ...item, discount: 0, _promotionId: undefined, _promotionName: undefined })); setAppliedPromotions([]); };
  const handlePromotionApply        = (result) => { if (result.updatedItems?.length) setItems(result.updatedItems); if (result.applied?.length) setAppliedPromotions(prev => [...prev, ...result.applied]); setShowPromotion(false); };
  const handlePackageRedeem         = ({ packageInfo, serviceCode }) => { setPackageRedemption(packageInfo); setItems(prev => prev.map(item => (item.code === serviceCode || item.servicecode === serviceCode) ? { ...item, _origPrice: item.price, price: 0, discount: 0, _redeemed: true, _packageCode: packageInfo.packageCode, _packageName: packageInfo.packageName } : item)); setShowPkgBalance(false); setToast({ message: `Package ${packageInfo.packageCode} applied — service set to SAR 0`, type: "success" }); };
  const handleRemovePackage         = (idx) => { setItems(prev => prev.map((item, i) => { if (i !== idx) return item; const { _redeemed, _packageCode, _packageName, _origPrice, ...rest } = item; return { ...rest, price: _origPrice != null ? _origPrice : (item.originalPrice != null ? item.originalPrice : item.price) }; })); setPackageRedemption(null); setToast({ message: "Package removed — normal payment applies", type: "info" }); };
  const handleApplyPriceOverride    = (updatedItems) => setItems(updatedItems);

  const isCitizen = selectedCustomer?.status === 'Citizen';
  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
  const discount = items.reduce((sum, i) => sum + (parseFloat(i.discount) || 0), 0);
  let tax = 0, grossTotal = 0;
  items.forEach((i) => {
    const a = computeLineAmounts(i.price, i.discount, i.quantity ?? 1, i.taxpercent, i.taxIncluded, isCitizen);
    tax += a.tax;
    grossTotal += a.total;
  });
  const roundoff = 0;
  const invoicePromoDiscount = appliedPromotions
  .filter(p => p.applicationLevel === "Invoice Level")
  .reduce((sum, p) => sum + parseFloat(p.discountAmount || 0), 0);
const total = Math.max(0, grossTotal + roundoff - invoicePromoDiscount);
  const todayDate = new Date().toISOString().split('T')[0];

  // Resolve clinic name: take topCode from the logged-in session, then look it up
  // in the Centre Hierarchy and display the matching clinic's full name
  // (e.g. "Bright" → "Bright Clinics"). Falls back to the code if no match.
  useEffect(() => {
    // Find the lookup code: prefer topCode/loginCode, but fall back to centerCode
    // (the login payload stores the centre as centerCode/centerName, not topCode).
    const pick = (o) => {
      if (!o || typeof o !== "object") return "";
      const d = o.data && typeof o.data === "object" ? o.data : null;
      return o.topCode || o.loginCode || o.centerCode
        || (d && (d.topCode || d.loginCode || d.centerCode))
        || (o.session && (o.session.topCode || o.session.loginCode || o.session.centerCode))
        || (o.user && (o.user.topCode || o.user.loginCode || o.user.centerCode)) || "";
    };
    // Find a ready-made display name (centerName) so we can show it even if the
    // hierarchy lookup misses or the code isn't in the hierarchy.
    const pickName = (o) => {
      if (!o || typeof o !== "object") return "";
      const d = o.data && typeof o.data === "object" ? o.data : null;
      return o.centerName
        || (d && d.centerName)
        || (o.session && o.session.centerName)
        || (o.user && o.user.centerName) || "";
    };
    const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || sessionStorage.getItem(k) || "null"); } catch { return null; } };
    let topCode = "", centerName = "";
    for (const key of ["userSession", "user", "session", "auth", "loginInfo", "userInfo"]) {
      const o = read(key);
      if (!topCode)    topCode    = pick(o);
      if (!centerName) centerName = pickName(o);
      if (topCode && centerName) break;
    }
    if (!topCode || !centerName) {
      for (const store of [localStorage, sessionStorage]) {
        for (let i = 0; i < store.length; i++) {
          try {
            const o = JSON.parse(store.getItem(store.key(i)));
            if (!topCode)    topCode    = pick(o);
            if (!centerName) centerName = pickName(o);
          } catch { /* not JSON */ }
        }
        if (topCode && centerName) break;
      }
    }
    // Show the best value we already have (full name beats bare code) right away.
    if (centerName) setClinicName(String(centerName).trim());
    else if (topCode) setClinicName(String(topCode).trim());
    if (!topCode && !centerName) return; // nothing to resolve

    (async () => {
      try {
        if (!topCode) return; // can't look up without a code, keep centerName
        const tok = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
        const res = await fetch(`${API_BASE_URL}/api/Settings/Centre/Hierarchy`, { headers: { Authorization: `Bearer ${tok}` } });
        const json = await res.json();
        const data = json?.data ?? json;
        const want = String(topCode).trim().toLowerCase();
        const all = [];
        if (data?.entity) all.push(data.entity);
        (data?.zones || []).forEach(z => (z.clinics || []).forEach(c => all.push(c)));
        const match = all.find(c => String(c.code || "").trim().toLowerCase() === want);
        if (match) setClinicName(String(match.name).trim());
      } catch { /* keep the name/code already shown as fallback */ }
    })();
  }, []);

  return (
    <div className="invoice-page">
      <header className="hdrclass">
        <h1 className="hdrttl">Create New Invoice</h1>
      </header>

      <main className="invoicewrp">
        <div className="invflex">
          <div className="leftsect">
            <div className="invtopwrp">
              <h3 className="sectttl" style={{ position:'relative' }}>Invoice details
                {/* Both buttons live in one flex wrapper, and the wrapper owns the
                    positioning. .bckbtn positions itself (absolute/float), so two of
                    them landed on the same spot and Home simply painted over Back.
                    Forcing the children to position:'static' inside a flex row
                    neutralises that whichever rule the class actually uses. */}
                <span style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
                  display:'inline-flex', alignItems:'center', gap:8, zIndex:2 }}>
                  {/* Back = previous screen (usually the appointment this invoice
                      came from). Falls back to the dashboard when the tab has no
                      history — e.g. the invoice URL was opened directly. */}
                  <button type="button" className="bckbtn"
                    onClick={() => {
                      if (window.history.length > 1) navigate(-1);
                      else navigate('/dashboard');
                    }}
                    style={{ position:'static', float:'none', transform:'none', margin:0,
                      background:'transparent', border:'none', font:'inherit', cursor:'pointer' }}>
                    Back
                  </button>
                  <Link to="/dashboard" className="bckbtn"
                    style={{ position:'static', float:'none', transform:'none', margin:0 }}>
                    Home
                  </Link>
                </span>
              </h3>
              <div className="invdetails">
                {[{ label: 'Invoice Date:', value: todayDate }, { label: 'Clinic Name:', value: clinicName }].map(({ label, value }, index) => (
                  <div className="inventry" key={index}>
                    <label className="inlbl">{label}</label>
                    <input type="text" className="invinp" value={value} readOnly />
                  </div>
                ))}
              </div>
              <div className="formdivwrp">
                <InvoiceForm suggestions={suggestions} onAddItem={handleAddFormItem} resetKey={formResetKey}
                  customer={selectedCustomer} showToast={(msg) => setToast({ message: msg, type: 'error' })}
                  servicename={formTnput.name} servicecode={formTnput.servicecode} doctorId={formTnput.doctorId}
                  onClearCart={handleClearCart} items={items} />
              </div>
            </div>

            <InvoiceTable items={items} onRemove={handleRemove} onCopy={handleCopyItem} readOnlyInputs={true}
              customer={selectedCustomer} appliedPromotions={appliedPromotions}
              onRemovePromotion={handleRemovePromotion} onRemoveManualDiscount={handleRemoveManualDiscount}
              onRemovePackage={handleRemovePackage} />

            <InvoiceSummary showPopup={showPopup} setShowPopup={setShowPopup}
              onRecallInvoice={() => setShowReturn(true)} onCheckPackageBalance={() => setShowPkgBalance(true)}
              onPromotion={() => setShowPromotion(true)}
              onCollectAdvance={() => setShowAdvance(true)}
              disablePackageBalance={items.some(i => i.type === 'package' || i.itemType === 'package')}
              onManualDiscount={handleManualDiscount} onClearCart={handleClearCart}
              onSuspendCart={handleSuspendCart} onRecallCartById={handleRecallCartById}
              suspendedCarts={suspendedCarts} items={items} onPriceChange={handlePriceChange}
              onDiscountChange={handleDiscountChange} onRemove={handleRemove}
              isFinalized={isFinalized} setIsFinalized={setIsFinalized}
              onApplyPriceOverride={handleApplyPriceOverride} />

            <div className="invtotalblk">
              <CustomerSearch
                onCustomerSelect={(cust) => setSelectedCustomer(cust ? { ...cust, custid: cust.custId || cust.custid || "", recId: cust.recId || cust.recid || "", isLoyaltyEnrolled: !!(cust.isLoyaltyEnrolled ?? cust.IS_LOYALTY_ENROLLED ?? false) } : null)}
                prefillCustid={custidFromUrl} fullName={selectedCustomer?.fullName}
                emailId={selectedCustomer?.email} number={selectedCustomer?.number}
                nationalityStatus={selectedCustomer?.status}
                lockedCustomer={fromAppointment}
                membership={memberFlag} />
              <div className="invttlwrp">
                {[{ label: 'Sub Total', value: subtotal }, { label: 'Discount', value: discount + invoicePromoDiscount },

                  { label: 'Tax', value: tax }, { label: 'Round Off', value: roundoff }, { label: 'Total', value: total }]
                  .map(({ label, value }, idx) => (
                    <div className={`invntry ${label === 'Total' ? 'lst' : ''}`} key={idx}>
                      <label className="invlftlbl">{label}</label>
                      <input type="number" className="invtxt" value={value.toFixed(2)} readOnly />
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <aside className="rgtsect">
            <CategoryTabs onAddItem={handleAddFormItem}
              showToast={(msg) => setToast({ message: msg, type: 'success' })}
              showErrToast={(msg) => setToast({ message: msg, type: 'error' })}
              customer={selectedCustomer} />
            <PaymentBlock totalAmount={total.toFixed(2)} invoiceItems={items}
              customer={selectedCustomer} recId={selectedCustomer?.recId || recIdFromUrl || ""}
              packageRedemption={packageRedemption} appliedPromotions={appliedPromotions}
              onRemovePromotion={handleRemovePromotion} onRemoveManualDiscount={handleRemoveManualDiscount}
              onRedemptionComplete={() => setPackageRedemption(null)} />
          </aside>
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showReturn    && <SalesReturn onClose={() => setShowReturn(false)} />}
      {showPromotion && <PromotionModal items={items} onApply={handlePromotionApply} onClose={() => setShowPromotion(false)} />}
      {showPkgBalance && <PackageBalanceChecker customer={selectedCustomer} items={items} onRedeem={handlePackageRedeem} onClose={() => setShowPkgBalance(false)} />}

      {showAdvance && (
        <div onClick={() => setShowAdvance(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 0' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:14, width:'95%', maxWidth:960, margin:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <AdvancePayment initialCustomer={selectedCustomer} onClose={() => setShowAdvance(false)} />
          </div>
        </div>
      )}

      {/* Customer Notes popup — fires when invoice page loads for a customer */}
      {PaymentNotePopup}
    </div>
  );
};

export default InvoicePage;