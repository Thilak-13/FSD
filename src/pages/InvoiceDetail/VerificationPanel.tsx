// src/pages/InvoiceDetail/VerificationPanel.tsx
import React, { useMemo } from 'react';
import { Invoice, PurchaseOrder, InvoiceLineItem, PurchaseOrderItem } from '../../types';
import { StatusBadge } from '../../components/shared/StatusBadge';

export interface VerificationPanelProps {
  invoice: Invoice;
  purchaseOrders: PurchaseOrder[];
  vendorName?: string;
  className?: string;
}

interface LineComparison {
  invoiceItem: InvoiceLineItem;
  poItem?: PurchaseOrderItem;
  priceMismatch: boolean;
  quantityMismatch: boolean;
  isMatched: boolean;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  invoice,
  purchaseOrders,
  vendorName,
  className,
}) => {
  const linkedPo = useMemo(() => {
    if (!invoice.poId) return undefined;
    return purchaseOrders.find((po) => po.id === invoice.poId);
  }, [invoice.poId, purchaseOrders]);

  const comparisons: LineComparison[] = useMemo(() => {
    return invoice.items.map((it) => {
      const matchedPoItem = linkedPo?.items.find(
        (poi) => poi.id === it.matchedPoItemId || poi.description.toLowerCase() === it.description.toLowerCase()
      );

      const priceMismatch =
        it.priceMismatch !== undefined
          ? it.priceMismatch
          : Boolean(matchedPoItem && Math.abs(it.unitPrice - matchedPoItem.unitPrice) > 0.01);

      const quantityMismatch =
        it.quantityMismatch !== undefined
          ? it.quantityMismatch
          : Boolean(matchedPoItem && it.quantity > matchedPoItem.quantity);

      const isMatched = Boolean(matchedPoItem && !priceMismatch && !quantityMismatch);

      return {
        invoiceItem: it,
        poItem: matchedPoItem,
        priceMismatch,
        quantityMismatch,
        isMatched,
      };
    });
  }, [invoice.items, linkedPo]);

  const totalDiscrepancies = useMemo(() => {
    return comparisons.filter((c) => c.priceMismatch || c.quantityMismatch || !c.poItem).length;
  }, [comparisons]);

  const poTotalForInvoice = useMemo(() => {
    if (!linkedPo) return 0;
    return comparisons.reduce((sum, c) => {
      return sum + (c.poItem ? c.poItem.total : 0);
    }, 0);
  }, [comparisons, linkedPo]);

  const varianceAmount = invoice.amount - (poTotalForInvoice || linkedPo?.amount || 0);

  return (
    <section
      className={`verification-panel-card ${className || ''}`.trim()}
      aria-label="PO Match Verification"
      data-testid="verification-panel"
    >
      <div className="verification-header">
        <h2 className="verification-heading">PO Match Verification</h2>
        <StatusBadge
          status={totalDiscrepancies === 0 ? 'Approved' : 'Flagged'}
          label={totalDiscrepancies === 0 ? 'Verification: Clean Match' : `Discrepancies: ${totalDiscrepancies} Detected`}
        />
      </div>

      {/* Linked PO Details */}
      {linkedPo ? (
        <div className="verification-po-card" data-testid="verification-po-details">
          <div className="invoice-detail-meta-item">
            <span className="invoice-detail-meta-label">Linked Purchase Order</span>
            <span className="invoice-detail-meta-value" data-testid="verification-po-number">
              {linkedPo.poNumber}
            </span>
          </div>
          <div className="invoice-detail-meta-item">
            <span className="invoice-detail-meta-label">PO Total Value</span>
            <span className="invoice-detail-meta-value" data-testid="verification-po-amount">
              ₹{linkedPo.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="invoice-detail-meta-item">
            <span className="invoice-detail-meta-label">Vendor</span>
            <span className="invoice-detail-meta-value" data-testid="verification-vendor-name">
              {vendorName || linkedPo.vendorId}
            </span>
          </div>
          <div className="invoice-detail-meta-item">
            <span className="invoice-detail-meta-label">PO Status</span>
            <span className="invoice-detail-meta-value">
              <StatusBadge status={linkedPo.status || 'Open'} />
            </span>
          </div>
        </div>
      ) : (
        <div
          className="status-stepper-flagged-warning"
          role="status"
          data-testid="no-linked-po-alert"
        >
          <StatusBadge status="Flagged" />
          <span>No purchase order linked to this invoice. Line items cannot be verified automatically.</span>
        </div>
      )}

      {/* Side-by-side line item comparison table */}
      <div className="verification-table-wrapper">
        <table
          className="verification-table"
          aria-label="PO Match Line Item Comparison Table"
          data-testid="verification-table"
        >
          <thead>
            <tr>
              <th>Item Description</th>
              <th className="align-right">Invoice Qty</th>
              <th className="align-right">PO Qty</th>
              <th className="align-right">Invoice Unit Price</th>
              <th className="align-right">PO Unit Price</th>
              <th className="align-right">Line Total</th>
              <th>Match Verification</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comp, idx) => {
              const { invoiceItem, poItem, priceMismatch, quantityMismatch, isMatched } = comp;
              const hasMismatch = priceMismatch || quantityMismatch;

              return (
                <tr
                  key={invoiceItem.id || idx}
                  className={hasMismatch ? 'has-mismatch' : undefined}
                  data-testid={`verification-row-${idx}`}
                >
                  <td>
                    <strong style={{ display: 'block' }}>{invoiceItem.description}</strong>
                    {poItem && poItem.description !== invoiceItem.description && (
                      <span
                        style={{
                          fontSize: 'var(--spectrum-global-dimension-size-150, 12px)',
                          color: 'var(--spectrum-global-color-gray-600, #8e8e8e)',
                        }}
                      >
                        PO Item: {poItem.description}
                      </span>
                    )}
                  </td>
                  <td className="align-right" data-testid={`row-${idx}-inv-qty`}>
                    {invoiceItem.quantity}
                  </td>
                  <td className="align-right" data-testid={`row-${idx}-po-qty`}>
                    {poItem ? poItem.quantity : '—'}
                  </td>
                  <td className="align-right" data-testid={`row-${idx}-inv-price`}>
                    ₹{invoiceItem.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="align-right" data-testid={`row-${idx}-po-price`}>
                    {poItem
                      ? `₹${poItem.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="align-right" data-testid={`row-${idx}-total`}>
                    <strong>
                      ₹{invoiceItem.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td data-testid={`row-${idx}-status`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {priceMismatch && (
                        <span data-testid="badge-price-mismatch">
                          <StatusBadge
                            variant="negative"
                            label="Price Mismatch"
                          />
                        </span>
                      )}
                      {quantityMismatch && (
                        <span data-testid="badge-qty-mismatch">
                          <StatusBadge
                            variant="negative"
                            label="Quantity Overbill"
                          />
                        </span>
                      )}
                      {!poItem && (
                        <span data-testid="badge-unmatched">
                          <StatusBadge
                            variant="negative"
                            label="Unmatched PO Line"
                          />
                        </span>
                      )}
                      {isMatched && (
                        <span data-testid="badge-matched">
                          <StatusBadge
                            variant="positive"
                            label="Matched"
                          />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Overall verification summary */}
      <div
        className={`verification-summary-banner ${totalDiscrepancies === 0 ? 'clean-match' : 'discrepancy'}`}
        data-testid="verification-summary-banner"
      >
        <div>
          <strong>
            {totalDiscrepancies === 0
              ? 'Clean Match: All line items match PO authorization.'
              : `Discrepancies Detected: ${totalDiscrepancies} variance issue(s) identified.`}
          </strong>
          <div style={{ fontSize: 'var(--spectrum-global-dimension-size-150, 12px)', marginTop: '4px' }}>
            {totalDiscrepancies === 0
              ? 'Invoice is verified and ready for approval.'
              : 'Review highlighted unit price or quantity variances before proceeding.'}
          </div>
        </div>

        <div className="verification-summary-stats">
          <div>
            <span style={{ fontSize: 'var(--spectrum-global-dimension-size-150, 12px)', display: 'block' }}>
              Invoice Total
            </span>
            <strong>
              ₹{invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          {linkedPo && (
            <>
              <div>
                <span style={{ fontSize: 'var(--spectrum-global-dimension-size-150, 12px)', display: 'block' }}>
                  PO Reference Value
                </span>
                <strong>
                  ₹{linkedPo.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 'var(--spectrum-global-dimension-size-150, 12px)', display: 'block' }}>
                  Variance
                </span>
                <strong data-testid="variance-amount">
                  ₹{Math.abs(varianceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
