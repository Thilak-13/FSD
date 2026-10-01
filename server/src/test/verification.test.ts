import { setupTestDB } from './setup';
import { InvoiceModel } from '../models/Invoice';
import {
  verifyInvoice,
  validateInvoiceInput,
} from '../services/verification.service';
import { PurchaseOrder } from '../types';

describe('Verification Engine Unit & Integration Tests', () => {
  setupTestDB();

  const mockPo: PurchaseOrder = {
    id: 'po-test-1',
    poNumber: 'PO-2026-001',
    vendorId: 'vendor-1',
    amount: 1000.0,
    description: 'Cloud Server Hosting & Maintenance',
    createdDate: '2026-09-01',
    status: 'Open',
    items: [
      {
        id: 'poi-1',
        description: 'Server Node Tier 1',
        quantity: 5,
        unitPrice: 150.0,
        total: 750.0,
      },
      {
        id: 'poi-2',
        description: 'Network Maintenance Hours',
        quantity: 10,
        unitPrice: 25.0,
        total: 250.0,
      },
    ],
  };

  describe('Required Field Validation', () => {
    it('passes when all required fields are provided', () => {
      const result = validateInvoiceInput({
        vendorId: 'vendor-1',
        amount: 500,
        dueDate: '2026-10-15',
        submittedBy: 'user-1',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when vendorId is missing or empty', () => {
      const result = validateInvoiceInput({
        vendorId: '',
        amount: 500,
        dueDate: '2026-10-15',
        submittedBy: 'user-1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('vendorId is required');
    });

    it('fails when amount is missing or negative', () => {
      const missingAmount = validateInvoiceInput({
        vendorId: 'vendor-1',
        dueDate: '2026-10-15',
        submittedBy: 'user-1',
      });
      expect(missingAmount.valid).toBe(false);
      expect(missingAmount.errors).toContain('amount is required and must be a number');

      const negativeAmount = validateInvoiceInput({
        vendorId: 'vendor-1',
        amount: -50,
        dueDate: '2026-10-15',
        submittedBy: 'user-1',
      });
      expect(negativeAmount.valid).toBe(false);
      expect(negativeAmount.errors).toContain('amount cannot be negative');
    });

    it('fails when dueDate or submittedBy is missing', () => {
      const result = validateInvoiceInput({
        vendorId: 'vendor-1',
        amount: 500,
        dueDate: '',
        submittedBy: '   ',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('dueDate is required');
      expect(result.errors).toContain('submittedBy is required');
    });
  });

  describe('PO Matching: No PO & Missing PO Rules', () => {
    it('returns status "Submitted" when no PO is linked', async () => {
      const result = await verifyInvoice({
        vendorId: 'vendor-1',
        amount: 500,
        dueDate: '2026-10-15',
        submittedBy: 'user-1',
        items: [
          {
            description: 'Miscellaneous Consulting',
            quantity: 2,
            unitPrice: 250,
          },
        ],
      });

      expect(result.status).toBe('Submitted');
      expect(result.flagReason).toBeUndefined();
      expect(result.discrepancies).toHaveLength(0);
    });

    it('returns status "Flagged" when poId is provided but PO does not exist', async () => {
      const result = await verifyInvoice({
        invoiceNumber: 'INV-NO-PO-1',
        vendorId: 'vendor-1',
        poId: 'po-non-existent-999',
        amount: 500,
        dueDate: '2026-10-15',
        submittedBy: 'user-1',
        items: [
          {
            description: 'Miscellaneous Consulting',
            quantity: 2,
            unitPrice: 250,
          },
        ],
      });

      expect(result.status).toBe('Flagged');
      expect(result.flagReason).toMatch(/not found/i);
    });
  });

  describe('PO Amount Tolerance (±$0.01)', () => {
    const baseItems = [
      {
        matchedPoItemId: 'poi-1',
        description: 'Server Node Tier 1',
        quantity: 5,
        unitPrice: 150.0,
      },
      {
        matchedPoItemId: 'poi-2',
        description: 'Network Maintenance Hours',
        quantity: 10,
        unitPrice: 25.0,
      },
    ];

    it('passes when invoice amount exactly equals PO amount', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-AMT-EQUAL',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 1000.0,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: baseItems,
        },
        mockPo
      );

      expect(result.status).toBe('Under Verification');
      expect(result.flagReason).toBeUndefined();
      expect(result.discrepancies).toHaveLength(0);
    });

    it('passes when invoice amount differs by +$0.01 (within tolerance)', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-AMT-PLUS-01',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 1000.01,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: baseItems,
        },
        mockPo
      );

      expect(result.status).toBe('Under Verification');
      expect(result.flagReason).toBeUndefined();
      expect(result.discrepancies).toHaveLength(0);
    });

    it('passes when invoice amount differs by -$0.01 (within tolerance)', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-AMT-MINUS-01',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 999.99,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: baseItems,
        },
        mockPo
      );

      expect(result.status).toBe('Under Verification');
      expect(result.flagReason).toBeUndefined();
      expect(result.discrepancies).toHaveLength(0);
    });

    it('flags when invoice amount differs by +$0.02 (exceeds +$0.01 tolerance)', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-AMT-PLUS-02',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 1000.02,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: baseItems,
        },
        mockPo
      );

      expect(result.status).toBe('Flagged');
      expect(result.flagReason).toMatch(/PO amount mismatch/i);
      expect(result.discrepancies.length).toBeGreaterThan(0);
    });

    it('flags when invoice amount differs by -$0.02 (exceeds -$0.01 tolerance)', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-AMT-MINUS-02',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 999.98,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: baseItems,
        },
        mockPo
      );

      expect(result.status).toBe('Flagged');
      expect(result.flagReason).toMatch(/PO amount mismatch/i);
      expect(result.discrepancies.length).toBeGreaterThan(0);
    });
  });

  describe('Line Item Unit Price Tolerance (±$0.001)', () => {
    it('passes when line item unit price differs by <= $0.001', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-PRICE-TOL-PASS',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 1000.0,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: [
            {
              matchedPoItemId: 'poi-1',
              description: 'Server Node Tier 1',
              quantity: 5,
              unitPrice: 150.001, // difference is 0.001 (within tolerance)
            },
            {
              matchedPoItemId: 'poi-2',
              description: 'Network Maintenance Hours',
              quantity: 10,
              unitPrice: 24.999, // difference is 0.001 (within tolerance)
            },
          ],
        },
        mockPo
      );

      expect(result.status).toBe('Under Verification');
      expect(result.items[0].priceMismatch).toBe(false);
      expect(result.items[1].priceMismatch).toBe(false);
    });

    it('flags and sets priceMismatch=true when unit price difference > $0.001', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-PRICE-TOL-FAIL',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 1000.0,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: [
            {
              matchedPoItemId: 'poi-1',
              description: 'Server Node Tier 1',
              quantity: 5,
              unitPrice: 150.002, // difference is 0.002 > 0.001
            },
            {
              matchedPoItemId: 'poi-2',
              description: 'Network Maintenance Hours',
              quantity: 10,
              unitPrice: 25.0,
            },
          ],
        },
        mockPo
      );

      expect(result.status).toBe('Flagged');
      expect(result.items[0].priceMismatch).toBe(true);
      expect(result.flagReason).toMatch(/unit price/i);
    });

    it('matches PO item by case-insensitive description when matchedPoItemId is omitted', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-DESC-MATCH',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 1000.0,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: [
            {
              description: 'server node tier 1', // lower case match
              quantity: 5,
              unitPrice: 150.0,
            },
            {
              description: 'NETWORK MAINTENANCE HOURS', // upper case match
              quantity: 10,
              unitPrice: 25.0,
            },
          ],
        },
        mockPo
      );

      expect(result.status).toBe('Under Verification');
      expect(result.items[0].matchedPoItemId).toBe('poi-1');
      expect(result.items[1].matchedPoItemId).toBe('poi-2');
      expect(result.items[0].priceMismatch).toBe(false);
      expect(result.items[1].priceMismatch).toBe(false);
    });
  });

  describe('Line Item Quantity Check', () => {
    it('passes when line item quantity is less than or equal to PO quantity', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-QTY-PASS',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 1000.0,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: [
            {
              matchedPoItemId: 'poi-1',
              description: 'Server Node Tier 1',
              quantity: 5, // equal to PO qty 5
              unitPrice: 150.0,
            },
            {
              matchedPoItemId: 'poi-2',
              description: 'Network Maintenance Hours',
              quantity: 8, // less than PO qty 10
              unitPrice: 25.0,
            },
          ],
        },
        mockPo
      );

      expect(result.items[0].quantityMismatch).toBe(false);
      expect(result.items[1].quantityMismatch).toBe(false);
    });

    it('flags and sets quantityMismatch=true when quantity exceeds PO quantity', async () => {
      const result = await verifyInvoice(
        {
          invoiceNumber: 'INV-QTY-FAIL',
          vendorId: 'vendor-1',
          poId: mockPo.id,
          amount: 1000.0,
          dueDate: '2026-10-15',
          submittedBy: 'user-1',
          items: [
            {
              matchedPoItemId: 'poi-1',
              description: 'Server Node Tier 1',
              quantity: 6, // exceeds PO qty 5!
              unitPrice: 150.0,
            },
            {
              matchedPoItemId: 'poi-2',
              description: 'Network Maintenance Hours',
              quantity: 10,
              unitPrice: 25.0,
            },
          ],
        },
        mockPo
      );

      expect(result.status).toBe('Flagged');
      expect(result.items[0].quantityMismatch).toBe(true);
      expect(result.flagReason).toMatch(/quantity/i);
    });
  });

  describe('Duplicate Invoice Number Check', () => {
    it('flags when invoiceNumber already exists in the database', async () => {
      // Seed an existing invoice
      await InvoiceModel.create({
        invoiceNumber: 'INV-EXISTING-001',
        vendorId: 'vendor-1',
        amount: 500,
        dueDate: '2026-10-20',
        submittedDate: '2026-09-10',
        status: 'Submitted',
        submittedBy: 'user-1',
        items: [],
      });

      // Try verifying a new invoice with the duplicate number
      const result = await verifyInvoice({
        invoiceNumber: 'INV-EXISTING-001',
        vendorId: 'vendor-1',
        amount: 500,
        dueDate: '2026-10-20',
        submittedBy: 'user-2',
        items: [],
      });

      expect(result.status).toBe('Flagged');
      expect(result.flagReason).toMatch(/duplicate/i);
      expect(result.discrepancies.some((d) => d.includes('Duplicate invoice number'))).toBe(true);
    });
  });
});
