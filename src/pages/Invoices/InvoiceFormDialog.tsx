// src/pages/Invoices/InvoiceFormDialog.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FormField } from '../../components/shared/FormField';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Invoice, NewInvoiceInput } from '../../types';
import { uploadInvoiceAttachment } from '../../services/api/invoices';

// Mirrors backend/src/middleware/upload.js so users get feedback before submitting.
const ALLOWED_ATTACHMENT_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const IS_MOCK_API = (import.meta as Record<string, any>).env?.VITE_API_MODE === 'mock';

export const validateAttachment = (file: File): string | undefined => {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    return 'Only PDF, PNG, and JPG files are allowed.';
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return 'File too large. Maximum size is 10 MB.';
  }
  return undefined;
};

export interface InvoiceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newInvoice: Invoice) => void;
}

export interface LineItemFormState {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export const InvoiceFormDialog: React.FC<InvoiceFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { vendors, purchaseOrders, createInvoice } = useData();
  const { currentUser } = useAuth();

  const [vendorId, setVendorId] = useState<string>('');
  const [poId, setPoId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [lineItems, setLineItems] = useState<LineItemFormState[]>([
    {
      id: 'item-1',
      description: '',
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  const [errors, setErrors] = useState<{
    vendorId?: string;
    invoiceNumber?: string;
    dueDate?: string;
    lineItems?: string;
    attachment?: string;
    submit?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLSelectElement | null>(null);
  const poSelectRef = useRef<HTMLSelectElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Filter Purchase Orders for selected vendor
  const availablePOs = useMemo(() => {
    if (!vendorId) return [];
    return purchaseOrders.filter((po) => po.vendorId === vendorId);
  }, [purchaseOrders, vendorId]);

  // Aggregate line item amounts guarded against NaN
  const aggregateAmount = useMemo(() => {
    return lineItems.reduce((acc, item) => {
      const q = Number(item.quantity);
      const p = Number(item.unitPrice);
      const safeQ = Number.isFinite(q) ? q : 0;
      const safeP = Number.isFinite(p) ? p : 0;
      return acc + safeQ * safeP;
    }, 0);
  }, [lineItems]);

  // Reset form and manage focus when dialog opens
  useEffect(() => {
    if (open) {
      if (typeof document !== 'undefined') {
        previousActiveElement.current = document.activeElement as HTMLElement | null;
      }

      setVendorId('');
      setPoId('');
      setInvoiceNumber('');
      setDueDate('');
      setNotes('');
      setAttachedFile(null);
      setLineItems([
        {
          id: `item-${Date.now()}-1`,
          description: '',
          quantity: 1,
          unitPrice: 0,
        },
      ]);
      setErrors({});
      setIsSubmitting(false);

      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [open]);

  // Handle keyboard Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // When vendor changes, reset selected PO unless still valid
  const handleVendorChange = (newVendorId: string) => {
    setVendorId(newVendorId);
    setPoId('');
    if (errors.vendorId) {
      setErrors((prev) => ({ ...prev, vendorId: undefined }));
    }
  };

  // When PO changes, optionally pre-populate line items if user hasn't typed anything
  const handlePoChange = (selectedPoId: string) => {
    setPoId(selectedPoId);
    if (selectedPoId) {
      const matchedPo = availablePOs.find((p) => p.id === selectedPoId);
      if (matchedPo && matchedPo.items.length > 0) {
        // If current line items are empty, pre-fill from PO
        const isCurrentEmpty =
          lineItems.length === 1 &&
          !lineItems[0].description.trim() &&
          lineItems[0].unitPrice === 0;

        if (isCurrentEmpty) {
          setLineItems(
            matchedPo.items.map((it, idx) => ({
              id: `item-${Date.now()}-${idx + 1}`,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            }))
          );
        }
      }
    }
  };

  // Line item updates
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
    if (errors.lineItems) {
      setErrors((prev) => ({ ...prev, lineItems: undefined }));
    }
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleLineItemChange = (
    id: string,
    field: keyof LineItemFormState,
    value: any
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let parsedValue = value;
        if (field === 'quantity' || field === 'unitPrice') {
          const num = Number(value);
          parsedValue = Number.isFinite(num) ? num : 0;
        }
        return {
          ...item,
          [field]: parsedValue,
        };
      })
    );
    if (errors.lineItems) {
      setErrors((prev) => ({ ...prev, lineItems: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const attachmentError = validateAttachment(file);
    setErrors((prev) => ({ ...prev, attachment: attachmentError }));
    if (attachmentError) {
      e.target.value = '';
      return;
    }
    setAttachedFile(file);
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form submission
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const newErrors: typeof errors = {};

    if (!vendorId) {
      newErrors.vendorId = 'Please select a vendor';
    }

    if (!dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    const invalidItems = lineItems.filter(
      (it) => !it.description.trim() || it.quantity <= 0 || it.unitPrice < 0
    );

    if (invalidItems.length > 0) {
      newErrors.lineItems =
        'Each line item must include a valid description, quantity (> 0), and unit price (>= 0).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const invoiceData: NewInvoiceInput = {
        invoiceNumber: invoiceNumber.trim() || undefined,
        vendorId,
        poId: poId || undefined,
        amount: aggregateAmount,
        dueDate,
        submittedBy: currentUser?.id || '',
        attachedDocumentName: attachedFile?.name,
        notes: notes.trim() || undefined,
        items: lineItems.map((item) => {
          const q = Number(item.quantity);
          const p = Number(item.unitPrice);
          const safeQ = Number.isFinite(q) ? q : 0;
          const safeP = Number.isFinite(p) ? p : 0;
          return {
            description: item.description.trim(),
            quantity: safeQ,
            unitPrice: safeP,
            total: safeQ * safeP,
          };
        }),
      };

      const created = await createInvoice(invoiceData);
      let saved = created;
      // shortcut: mock mode has no file store, so only the name is kept there.
      if (attachedFile && !IS_MOCK_API) {
        try {
          saved = await uploadInvoiceAttachment(created.id, attachedFile);
        } catch (uploadErr: any) {
          // The invoice exists already; keep the dialog open so the failure is seen, not resubmitted.
          onSuccess?.(created);
          setErrors((prev) => ({
            ...prev,
            submit: `Invoice ${created.invoiceNumber} was created, but the document failed to upload: ${
              uploadErr.message || 'unknown error'
            }. You can close this dialog.`,
          }));
          return;
        }
      }
      if (onSuccess) {
        onSuccess(saved);
      }
      onClose();
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to submit invoice',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="invoice-dialog-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-invoice-heading"
        className="invoice-dialog-container"
        data-testid="invoice-form-dialog"
      >
        {/* Header */}
        <div className="invoice-dialog-header">
          <h2 id="new-invoice-heading" className="invoice-dialog-title">
            Submit New Invoice
          </h2>
          <button
            type="button"
            className="invoice-dialog-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            data-testid="close-invoice-dialog"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="invoice-dialog-body"
          aria-label="New Invoice Form"
        >
          {errors.submit && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--spectrum-global-color-red-100, #fee2e2)',
                border: '1px solid var(--spectrum-global-color-red-400, #f87171)',
                borderRadius: '4px',
                color: 'var(--spectrum-global-color-red-700, #b91c1c)',
                fontSize: '12px',
              }}
            >
              {errors.submit}
            </div>
          )}

          {/* Row 1: Vendor & Purchase Order */}
          <div className="invoice-form-grid-2">
            <FormField
              label="Vendor"
              htmlFor="invoice-vendor-select"
              required
              error={errors.vendorId}
            >
              <select
                ref={(el) => {
                  firstInputRef.current = el;
                }}
                id="invoice-vendor-select"
                data-testid="invoice-vendor-select"
                className="invoice-form-select"
                value={vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                aria-required="true"
                aria-invalid={Boolean(errors.vendorId)}
                aria-label="Vendor"
              >
                <option value="">Select Vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Linked Purchase Order"
              htmlFor="invoice-po-select"
              hint={
                !vendorId
                  ? 'Select a vendor first'
                  : availablePOs.length === 0
                  ? 'No open POs found (Direct Invoice)'
                  : undefined
              }
            >
              <select
                ref={poSelectRef}
                id="invoice-po-select"
                data-testid="invoice-po-select"
                className="invoice-form-select"
                value={poId}
                onChange={(e) => handlePoChange(e.target.value)}
                disabled={!vendorId}
                aria-label="Linked Purchase Order"
              >
                <option value="">None / Direct Invoice</option>
                {availablePOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} — ₹{po.amount.toLocaleString('en-IN')} ({po.description})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Row 2: Invoice Number & Due Date */}
          <div className="invoice-form-grid-2">
            <FormField
              label="Invoice Number"
              htmlFor="invoice-number-input"
              hint="Leave blank to auto-generate"
              error={errors.invoiceNumber}
            >
              <input
                id="invoice-number-input"
                data-testid="invoice-number-input"
                type="text"
                className="invoice-form-input"
                placeholder="e.g. INV-2026-042"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                aria-label="Invoice Number"
              />
            </FormField>

            <FormField
              label="Due Date"
              htmlFor="invoice-due-date-input"
              required
              error={errors.dueDate}
            >
              <input
                id="invoice-due-date-input"
                data-testid="invoice-due-date-input"
                type="date"
                className="invoice-form-input"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (errors.dueDate) {
                    setErrors((prev) => ({ ...prev, dueDate: undefined }));
                  }
                }}
                aria-required="true"
                aria-invalid={Boolean(errors.dueDate)}
                aria-label="Due Date"
              />
            </FormField>
          </div>

          {/* Dynamic Line Items Section */}
          <section
            className="line-items-section"
            aria-label="Invoice Line Items"
          >
            <div className="line-items-header">
              <h3 className="line-items-heading">Line Items Breakdown</h3>
              <button
                type="button"
                data-testid="add-line-item-button"
                onClick={handleAddLineItem}
                aria-label="Add new line item"
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  borderRadius: '4px',
                  border: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
                  backgroundColor: 'var(--spectrum-global-color-gray-50, #ffffff)',
                  color: 'var(--spectrum-global-color-gray-800, #4b4b4b)',
                  cursor: 'pointer',
                }}
              >
                + Add Item
              </button>
            </div>

            {errors.lineItems && (
              <div
                role="alert"
                aria-live="polite"
                style={{
                  color: 'var(--spectrum-global-color-red-600, #c9252d)',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {errors.lineItems}
              </div>
            )}

            <div className="line-items-table-wrapper">
              <table className="line-items-table" aria-label="Invoice Line Items Table">
                <thead>
                  <tr>
                    <th style={{ width: '45%' }}>Description</th>
                    <th style={{ width: '15%' }}>Qty</th>
                    <th style={{ width: '20%' }}>Unit Price (₹)</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
                    <th style={{ width: '5%' }} aria-label="Actions">
                      <span
                        style={{
                          position: 'absolute',
                          width: '1px',
                          height: '1px',
                          padding: 0,
                          margin: '-1px',
                          overflow: 'hidden',
                          clip: 'rect(0,0,0,0)',
                          border: 0,
                        }}
                      >
                        Actions
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => {
                    const q = Number(item.quantity);
                    const p = Number(item.unitPrice);
                    const safeQ = Number.isFinite(q) ? q : 0;
                    const safeP = Number.isFinite(p) ? p : 0;
                    const lineTotal = safeQ * safeP;

                    return (
                      <tr key={item.id} data-testid={`line-item-row-${index}`}>
                        <td>
                          <input
                            type="text"
                            data-testid={`line-item-desc-${index}`}
                            className="invoice-form-input"
                            placeholder="Description"
                            value={item.description}
                            aria-label={`Item ${index + 1} description`}
                            required
                            onChange={(e) =>
                              handleLineItemChange(item.id, 'description', e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            data-testid={`line-item-qty-${index}`}
                            className="invoice-form-input"
                            min="1"
                            value={item.quantity}
                            aria-label={`Item ${index + 1} quantity`}
                            required
                            onChange={(e) =>
                              handleLineItemChange(item.id, 'quantity', e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            data-testid={`line-item-price-${index}`}
                            className="invoice-form-input"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            aria-label={`Item ${index + 1} unit price`}
                            required
                            onChange={(e) =>
                              handleLineItemChange(item.id, 'unitPrice', e.target.value)
                            }
                          />
                        </td>
                        <td
                          className="line-item-total-cell"
                          data-testid={`line-item-total-${index}`}
                        >
                          ₹{lineTotal.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="line-item-remove-btn"
                            data-testid={`remove-line-item-${index}`}
                            onClick={() => handleRemoveLineItem(item.id)}
                            disabled={lineItems.length <= 1}
                            aria-label={`Remove item ${index + 1}`}
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Line Items Aggregate Summary */}
            <div className="line-items-summary-bar">
              <span className="line-items-total-label">Total Invoice Amount:</span>
              <span
                className="line-items-total-amount"
                data-testid="invoice-aggregate-total"
              >
                ₹{aggregateAmount.toFixed(2)}
              </span>
            </div>
          </section>

          {/* Document Attachment */}
          <section className="attachment-section" aria-label="Document Attachment">
            <FormField
              label="Supporting Document (PDF, PNG, JPG)"
              htmlFor="invoice-file-input"
              hint="Max 10 MB"
              error={errors.attachment}
            >
              <input
                ref={fileInputRef}
                id="invoice-file-input"
                data-testid="invoice-file-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                aria-label="Upload supporting document"
              />

              {attachedFile ? (
                <div
                  className="attachment-badge-pill"
                  data-testid="attachment-badge"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span data-testid="attachment-name">
                    {attachedFile.name} ({(attachedFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                  <button
                    type="button"
                    className="attachment-remove-btn"
                    onClick={handleRemoveFile}
                    aria-label="Remove attached document"
                    data-testid="remove-attachment-btn"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    data-testid="attach-file-button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Choose file to attach"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      borderRadius: '4px',
                      border: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
                      backgroundColor: 'var(--spectrum-global-color-gray-50, #ffffff)',
                      color: 'var(--spectrum-global-color-gray-800, #4b4b4b)',
                      cursor: 'pointer',
                    }}
                  >
                    📎 Choose File...
                  </button>
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      color: 'var(--spectrum-global-color-gray-600, #8e8e8e)',
                    }}
                  >
                    No file selected (Optional)
                  </span>
                </div>
              )}
            </FormField>
          </section>

          {/* Optional Notes */}
          <FormField label="Notes / Comments" htmlFor="invoice-notes-input">
            <textarea
              id="invoice-notes-input"
              data-testid="invoice-notes-input"
              className="invoice-form-input"
              rows={2}
              placeholder="Additional billing context or instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Notes / Comments"
            />
          </FormField>

          {/* Footer Actions */}
          <div className="invoice-dialog-footer">
            <button
              type="button"
              data-testid="cancel-invoice-button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                borderRadius: '4px',
                border: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
                backgroundColor: 'var(--spectrum-global-color-gray-50, #ffffff)',
                color: 'var(--spectrum-global-color-gray-800, #4b4b4b)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-invoice-button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'inherit',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: isSubmitting
                  ? 'var(--spectrum-global-color-blue-400, #71a9f4)'
                  : 'var(--spectrum-global-color-blue-600, #0d66d0)',
                color: '#ffffff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
