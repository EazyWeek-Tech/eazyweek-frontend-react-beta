import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Crumb, Toast } from "./VendorUI";
import { getVendor } from "./vendorApi";
import "./vendor.css";

/* ---- summary line ---- */
function summarise(v) {
  const good = ["Before Time", "On Time"].includes(v.deliveryPattern);
  const late = ["Occasionally Late", "Always Late"].includes(v.deliveryPattern);
  const strong = ["Exceeds Expectation", "Meets Expectation"].includes(
    v.qualityLevel
  );
  if (v.isBlocked)
    return "This vendor is blocked for further transactions and cannot be selected on a new purchase order.";
  if (!v.isActive)
    return "This vendor is still in Draft and is not yet available for purchase orders.";
  if (good && strong)
    return "This vendor delivers on or ahead of schedule with dependable quality — a strong candidate for upcoming purchase orders.";
  if (late)
    return "Delivery has slipped against lead time on this vendor — allow extra buffer when the order is time-sensitive.";
  return "Performance is not fully assessed yet. Update Quality Level, Response Time and Delivery Pattern after the next order.";
}

const line = (parts) => parts.filter(Boolean).join(", ");

export default function VendorRecord({ canEdit = true }) {
  const navigate = useNavigate();
  const { vendorCode } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const data = await getVendor(vendorCode);
        if (alive) setVendor(data);
      } catch (err) {
        if (alive) setToast({ type: "error", message: err.message });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [vendorCode]);

  if (loading) {
    return (
      <div className="vm-scope">
        <div className="vm-card vm-loading">Loading vendor…</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="vm-scope">
        <div className="vm-card vm-empty">
          <b>Vendor not found</b>
          It may have been removed, or belongs to another legal entity.
        </div>
        <Toast toast={toast} onClear={clearToast} />
      </div>
    );
  }

  const creditLimit =
    vendor.creditLimit === "" || vendor.creditLimit === null || vendor.creditLimit === undefined
      ? null
      : `Credit Limit: ${vendor.currency || "SAR"} ${Number(
          vendor.creditLimit
        ).toLocaleString()}`;

  return (
    <div className="vm-scope">
      <Crumb
        items={[
          { label: "Supply Chain" },
          {
            label: "Vendor Management",
            onClick: () => navigate("/supply-chain/vendors"),
          },
          { label: vendor.vendorCode },
        ]}
      />

      <div className="vm-head">
        <div>
          <h1 className="vm-title">{vendor.vendorName}</h1>
          <div className="vm-subtitle">
            {vendor.vendorCode}
            {vendor.legalEntityName ? (
              <>
                {" · "}Legal Entity: <b>{vendor.legalEntityName}</b>
              </>
            ) : null}
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            className="vm-btn vm-btn-ghost"
            onClick={() =>
              navigate(
                `/supply-chain/vendors/${encodeURIComponent(vendor.vendorCode)}/edit`
              )
            }
          >
            Edit Vendor
          </button>
        )}
      </div>

      {/* ---- status badge cluster ---- */}
      <div className="vm-badge-cluster">
        <Badge
          tone={vendor.isActive ? "green" : "grey"}
          value={vendor.isActive ? "✓ Active" : "Draft"}
        />
        {vendor.isBlocked && <Badge tone="coral" value="Blocked" />}
        <span className="vm-bc-item">
          Delivery: <Badge value={vendor.deliveryPattern || "Not Defined"} />
        </span>
        <span className="vm-bc-item">
          Quality: <Badge value={vendor.qualityLevel || "Not Defined"} />
        </span>
        <span className="vm-bc-item">
          Response: <Badge value={vendor.responseTime || "Not Defined"} />
        </span>
      </div>

      <div className="vm-notice vm-notice-info">{summarise(vendor)}</div>

      {/* ---- summary cards ---- */}
      <div className="vm-record-grid">
        <div className="vm-card">
          <h2 className="vm-section-title">General</h2>
          <dl className="vm-kv">
            <dt>Vendor Group</dt>
            <dd>{vendor.vendorGroupName || vendor.vendorGroupCode || "NA"}</dd>
          </dl>
          <dl className="vm-kv">
            <dt>Address</dt>
            <dd>
              {line([vendor.addressLine1, vendor.addressLine2])}
              <br />
              {line([vendor.city, vendor.stateRegion, vendor.postalCode])}
              <br />
              {vendor.country}
            </dd>
          </dl>
          <dl className="vm-kv">
            <dt>Payment Terms</dt>
            <dd>
              {vendor.paymentTerms || "—"}
              <span className="vm-dot">·</span>
              {vendor.currency || "—"}
              {creditLimit && (
                <>
                  <span className="vm-dot">·</span>
                  {creditLimit}
                </>
              )}
            </dd>
          </dl>
          <dl className="vm-kv">
            <dt>Registration</dt>
            <dd>
              {vendor.regDocNumber || "—"}
              {vendor.regDocName && (
                <>
                  <span className="vm-dot">·</span>
                  {vendor.regDocUrl ? (
                    <a
                      href={vendor.regDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="vm-cell-name"
                    >
                      {vendor.regDocName}
                    </a>
                  ) : (
                    vendor.regDocName
                  )}
                </>
              )}
            </dd>
          </dl>
          <dl className="vm-kv">
            <dt>Bank Details</dt>
            <dd>
              {vendor.bankName || "—"}
              {vendor.iban && (
                <>
                  <span className="vm-dot">·</span>IBAN {vendor.iban}
                </>
              )}
              <br />
              {line([
                vendor.accountHolderName,
                vendor.accountNumber && `A/C ${vendor.accountNumber}`,
                vendor.swiftCode,
                vendor.branchName,
              ])}
            </dd>
          </dl>
        </div>

        <div className="vm-card">
          <h2 className="vm-section-title">Remarks</h2>
          {vendor.remarks ? (
            <p className="vm-remarks">{vendor.remarks}</p>
          ) : (
            <p className="vm-hint">
              No remarks recorded. Add certifications, handling instructions or
              prior issues from Edit Vendor.
            </p>
          )}
        </div>
      </div>

      <Toast toast={toast} onClear={clearToast} />
    </div>
  );
}