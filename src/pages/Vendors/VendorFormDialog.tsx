import React, { useState, useEffect, useRef } from 'react';
import { FormField } from '../../components/shared/FormField';
import { useData } from '../../context/DataContext';
import { Vendor, NewVendorInput, PaymentTerms } from '../../types';

export interface VendorFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newVendor: Vendor) => void;
}

export const VendorFormDialog: React.FC<VendorFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { createVendor } = useData();

  const [name, setName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('Net 30');
  const [taxId, setTaxId] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [errors, setErrors] = useState<{
    name?: string;
    contactEmail?: string;
    taxId?: string;
    submit?: string;
  }>({});

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management and form reset on open
  useEffect(() => {
    if (open) {
      if (typeof document !== 'undefined') {
        previousActiveElement.current = document.activeElement as HTMLElement | null;
      }

      setName('');
      setContactEmail('');
      setPaymentTerms('Net 30');
      setTaxId('');
      setAddress('');
      setPhone('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (!contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (!taxId.trim()) {
      newErrors.taxId = 'Tax ID is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const vendorData: NewVendorInput = {
        name: name.trim(),
        contactEmail: contactEmail.trim(),
        paymentTerms,
        address: address.trim() || 'Address not specified',
        taxId: taxId.trim(),
        phone: phone.trim() || undefined,
        status: 'Active',
      };

      const created = await createVendor(vendorData);
      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to create vendor',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="vendor-dialog-overlay"
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
        aria-labelledby="new-vendor-heading"
        className="vendor-dialog-container"
        data-testid="vendor-form-dialog"
      >
        {/* Header */}
        <div className="vendor-dialog-header">
          <h2 id="new-vendor-heading" className="vendor-dialog-title">
            Add New Vendor
          </h2>
          <button
            type="button"
            className="vendor-dialog-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            data-testid="close-vendor-dialog"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="vendor-dialog-body"
          aria-label="New Vendor Form"
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

          {/* Company Name */}
          <FormField
            label="Company Name"
            htmlFor="vendor-name-input"
            required
            error={errors.name}
          >
            <input
              ref={firstInputRef}
              id="vendor-name-input"
              data-testid="vendor-name-input"
              type="text"
              className="vendor-form-input"
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              aria-label="Company Name"
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
            />
          </FormField>

          {/* Row: Contact Email & Tax ID */}
          <div className="vendor-form-grid-2">
            <FormField
              label="Contact Email"
              htmlFor="vendor-email-input"
              required
              error={errors.contactEmail}
            >
              <input
                id="vendor-email-input"
                data-testid="vendor-email-input"
                type="email"
                className="vendor-form-input"
                placeholder="billing@acme.com"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  if (errors.contactEmail) {
                    setErrors((prev) => ({ ...prev, contactEmail: undefined }));
                  }
                }}
                aria-label="Contact Email"
                aria-required="true"
                aria-invalid={Boolean(errors.contactEmail)}
              />
            </FormField>

            <FormField
              label="Tax ID"
              htmlFor="vendor-tax-id-input"
              required
              error={errors.taxId}
            >
              <input
                id="vendor-tax-id-input"
                data-testid="vendor-tax-id-input"
                type="text"
                className="vendor-form-input"
                placeholder="e.g. 12-3456789"
                value={taxId}
                onChange={(e) => {
                  setTaxId(e.target.value);
                  if (errors.taxId) {
                    setErrors((prev) => ({ ...prev, taxId: undefined }));
                  }
                }}
                aria-label="Tax ID"
                aria-required="true"
                aria-invalid={Boolean(errors.taxId)}
              />
            </FormField>
          </div>

          {/* Row: Payment Terms & Phone */}
          <div className="vendor-form-grid-2">
            <FormField
              label="Payment Terms"
              htmlFor="vendor-payment-terms-select"
            >
              <select
                id="vendor-payment-terms-select"
                data-testid="vendor-payment-terms-select"
                className="vendor-form-select"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                aria-label="Payment Terms"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
              </select>
            </FormField>

            <FormField
              label="Phone (Optional)"
              htmlFor="vendor-phone-input"
            >
              <input
                id="vendor-phone-input"
                data-testid="vendor-phone-input"
                type="tel"
                className="vendor-form-input"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-label="Phone (Optional)"
              />
            </FormField>
          </div>

          {/* Business Address */}
          <FormField
            label="Business Address"
            htmlFor="vendor-address-input"
            hint="Street address, City, State, ZIP"
          >
            <input
              id="vendor-address-input"
              data-testid="vendor-address-input"
              type="text"
              className="vendor-form-input"
              placeholder="e.g. 100 Main St, Suite 200, San Francisco, CA 94105"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              aria-label="Business Address"
            />
          </FormField>

          {/* Actions */}
          <div className="vendor-dialog-footer">
            <button
              type="button"
              className="vendor-btn-secondary"
              data-testid="cancel-vendor-button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Cancel"
              style={{
                padding: '7px 16px',
                borderRadius: '16px',
                border: '1px solid #cacaca',
                backgroundColor: '#ffffff',
                color: '#2c2c2c',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="vendor-btn-accent"
              data-testid="submit-vendor-button"
              disabled={isSubmitting}
              aria-label={isSubmitting ? 'Adding...' : 'Add Vendor'}
              style={{
                padding: '7px 16px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: '#0265dc',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? 'Adding...' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
