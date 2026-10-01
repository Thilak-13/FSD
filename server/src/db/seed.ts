import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from './connection';
import { User } from '../models/User';
import { Vendor } from '../models/Vendor';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Invoice } from '../models/Invoice';
import { AuditEntry } from '../models/AuditEntry';

export const seedDatabase = async () => {
  console.log('[Seed] Connecting to MongoDB...');
  await connectDB();

  console.log('[Seed] Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Vendor.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Invoice.deleteMany({}),
    AuditEntry.deleteMany({}),
  ]);

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  console.log('[Seed] Seeding users...');
  const users = await User.insertMany([
    {
      _id: new mongoose.Types.ObjectId('650000000000000000000001'),
      name: 'Sarah Chen',
      email: 'sarah.chen@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'Admin',
      department: 'Finance Operations',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&fit=crop&crop=face',
    },
    {
      _id: new mongoose.Types.ObjectId('650000000000000000000002'),
      name: 'Marcus Vance',
      email: 'marcus.vance@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'Approver',
      department: 'Procurement & Approvals',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&fit=crop&crop=face',
    },
    {
      _id: new mongoose.Types.ObjectId('650000000000000000000003'),
      name: 'Elena Rodriguez',
      email: 'elena.rodriguez@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'Requester',
      department: 'Engineering / Facilities',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&fit=crop&crop=face',
    },
    {
      name: 'Alex Rivera',
      email: 'alex.rivera@apex.corp',
      passwordHash: defaultPasswordHash,
      role: 'Admin',
      department: 'Finance Operations',
    },
    {
      name: 'Jordan Lee',
      email: 'jordan.lee@apex.corp',
      passwordHash: defaultPasswordHash,
      role: 'Requester',
      department: 'Engineering / Facilities',
    },
  ]);
  console.log(`[Seed] Seeded ${users.length} users.`);

  console.log('[Seed] Seeding vendors...');
  const vendors = await Vendor.insertMany([
    {
      _id: new mongoose.Types.ObjectId('651000000000000000000001'),
      name: 'Apex Cloud Services',
      contactEmail: 'billing@apexcloud.io',
      paymentTerms: 'Net 30',
      address: '500 Howard St, Suite 400, San Francisco, CA 94105',
      taxId: '94-3289104',
      status: 'Active',
      phone: '+1 (415) 555-0192',
      totalInvoices: 5,
    },
    {
      _id: new mongoose.Types.ObjectId('651000000000000000000002'),
      name: 'Northwest Logistics',
      contactEmail: 'ap@northwestlogistics.com',
      paymentTerms: 'Net 15',
      address: '1200 Industrial Way, Seattle, WA 98101',
      taxId: '91-4829105',
      status: 'Active',
      phone: '+1 (206) 555-0143',
      totalInvoices: 4,
    },
    {
      _id: new mongoose.Types.ObjectId('651000000000000000000003'),
      name: 'ByteForce Technologies',
      contactEmail: 'invoices@byteforce.tech',
      paymentTerms: 'Net 45',
      address: '88 Tech Ridge Blvd, Austin, TX 78759',
      taxId: '74-9821034',
      status: 'Active',
      phone: '+1 (512) 555-0188',
      totalInvoices: 4,
    },
    {
      _id: new mongoose.Types.ObjectId('651000000000000000000004'),
      name: 'Summit Creative',
      contactEmail: 'accounts@summitcreative.agency',
      paymentTerms: 'Net 30',
      address: '240 5th Ave, Floor 8, New York, NY 10001',
      taxId: '13-7892145',
      status: 'Under Review',
      phone: '+1 (212) 555-0112',
      totalInvoices: 3,
    },
    {
      _id: new mongoose.Types.ObjectId('651000000000000000000005'),
      name: 'Pioneer Industrial',
      contactEmail: 'finance@pioneerind.com',
      paymentTerms: 'Net 60',
      address: '4500 Manufacturing Blvd, Detroit, MI 48201',
      taxId: '38-6543219',
      status: 'Active',
      phone: '+1 (313) 555-0177',
      totalInvoices: 2,
    },
  ]);
  console.log(`[Seed] Seeded ${vendors.length} vendors.`);

  const v1 = vendors[0]._id.toString();
  const v2 = vendors[1]._id.toString();
  const v3 = vendors[2]._id.toString();
  const v4 = vendors[3]._id.toString();
  const v5 = vendors[4]._id.toString();

  console.log('[Seed] Seeding purchase orders...');
  const purchaseOrders = await PurchaseOrder.insertMany([
    {
      _id: new mongoose.Types.ObjectId('652000000000000000000001'),
      poNumber: 'PO-2026-001',
      vendorId: v1,
      amount: 14500,
      description: 'Cloud Infrastructure & Reserved Instances Q3',
      createdDate: '2026-07-01',
      status: 'Partially Invoiced',
      items: [
        { id: 'poi-101', description: 'Cloud Compute Instances Tier 3', quantity: 3, unitPrice: 4000, total: 12000 },
        { id: 'poi-102', description: '24/7 Enterprise Cloud Support SLA', quantity: 1, unitPrice: 2500, total: 2500 },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('652000000000000000000002'),
      poNumber: 'PO-2026-002',
      vendorId: v1,
      amount: 8200,
      description: 'Database Backup & Data Migration Services',
      createdDate: '2026-07-15',
      status: 'Open',
      items: [
        { id: 'poi-201', description: 'Database Architecture Consulting Hours', quantity: 40, unitPrice: 180, total: 7200 },
        { id: 'poi-202', description: 'Cross-Region Storage Replication Tier 1', quantity: 2, unitPrice: 500, total: 1000 },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('652000000000000000000003'),
      poNumber: 'PO-2026-003',
      vendorId: v2,
      amount: 12000,
      description: 'Regional Freight & Distribution Contracts',
      createdDate: '2026-08-01',
      status: 'Partially Invoiced',
      items: [
        { id: 'poi-301', description: 'Pallet Shipping - Zone 1 Standard Delivery', quantity: 50, unitPrice: 160, total: 8000 },
        { id: 'poi-302', description: 'Expedited Temperature Controlled Transport', quantity: 8, unitPrice: 500, total: 4000 },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('652000000000000000000004'),
      poNumber: 'PO-2026-004',
      vendorId: v2,
      amount: 6400,
      description: 'Fleet Dedicated Delivery Services August/September',
      createdDate: '2026-08-10',
      status: 'Open',
      items: [
        { id: 'poi-401', description: 'Dedicated Van Day Routes', quantity: 32, unitPrice: 150, total: 4800 },
        { id: 'poi-402', description: 'Fuel Surcharge & Toll Reimbursement', quantity: 1, unitPrice: 1600, total: 1600 },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('652000000000000000000005'),
      poNumber: 'PO-2026-005',
      vendorId: v3,
      amount: 18500,
      description: 'Workstation Upgrades & Engineering Equipment',
      createdDate: '2026-08-15',
      status: 'Partially Invoiced',
      items: [
        { id: 'poi-501', description: 'High-Performance Developer Laptops (64GB RAM)', quantity: 5, unitPrice: 2800, total: 14000 },
        { id: 'poi-502', description: '4K IPS 32-inch Dual Monitor Setup', quantity: 10, unitPrice: 450, total: 4500 },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('652000000000000000000006'),
      poNumber: 'PO-2026-006',
      vendorId: v3,
      amount: 9800,
      description: 'Server Room Network Infrastructure Upgrade',
      createdDate: '2026-08-20',
      status: 'Open',
      items: [
        { id: 'poi-601', description: 'Managed 48-Port Gigabit PoE+ Switches', quantity: 4, unitPrice: 1800, total: 7200 },
        { id: 'poi-602', description: 'High-Density Patch Panels & Optics Cabling', quantity: 13, unitPrice: 200, total: 2600 },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('652000000000000000000007'),
      poNumber: 'PO-2026-007',
      vendorId: v4,
      amount: 15000,
      description: 'Design System Implementation & Creative Assets',
      createdDate: '2026-08-25',
      status: 'Partially Invoiced',
      items: [
        { id: 'poi-701', description: 'Design System Component Specification & Figma UI Kit', quantity: 1, unitPrice: 9500, total: 9500 },
        { id: 'poi-702', description: 'Brand Guidelines & Iconography Set', quantity: 1, unitPrice: 5500, total: 5500 },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('652000000000000000000008'),
      poNumber: 'PO-2026-008',
      vendorId: v5,
      amount: 22400,
      description: 'Facility Machinery Maintenance & Safety Kits',
      createdDate: '2026-09-01',
      status: 'Partially Invoiced',
      items: [
        { id: 'poi-801', description: 'HEPA Industrial Clean Air Filtration System', quantity: 4, unitPrice: 3600, total: 14400 },
        { id: 'poi-802', description: 'OSHA-Certified Fall Protection & Rigging Harnesses', quantity: 16, unitPrice: 500, total: 8000 },
      ],
    },
  ]);
  console.log(`[Seed] Seeded ${purchaseOrders.length} purchase orders.`);

  const p1 = purchaseOrders[0]._id.toString();
  const p2 = purchaseOrders[1]._id.toString();
  const p3 = purchaseOrders[2]._id.toString();
  const p4 = purchaseOrders[3]._id.toString();
  const p5 = purchaseOrders[4]._id.toString();
  const p6 = purchaseOrders[5]._id.toString();
  const p7 = purchaseOrders[6]._id.toString();
  const p8 = purchaseOrders[7]._id.toString();
  const uAdmin = users[0]._id.toString();
  const uRequester = users[2]._id.toString();

  console.log('[Seed] Seeding invoices...');
  const invoices = await Invoice.insertMany([
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000001'),
      invoiceNumber: 'INV-2026-001',
      vendorId: v1,
      poId: p1,
      amount: 6500,
      dueDate: '2026-10-02',
      submittedDate: '2026-09-02',
      status: 'Submitted',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-001_Apex.pdf',
      items: [
        { id: 'li-101', description: 'Cloud Compute Instances Tier 3', quantity: 1, unitPrice: 4000, total: 4000, matchedPoItemId: 'poi-101' },
        { id: 'li-102', description: '24/7 Enterprise Cloud Support SLA', quantity: 1, unitPrice: 2500, total: 2500, matchedPoItemId: 'poi-102' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000002'),
      invoiceNumber: 'INV-2026-002',
      vendorId: v2,
      poId: p4,
      amount: 4800,
      dueDate: '2026-09-18',
      submittedDate: '2026-09-10',
      status: 'Submitted',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-002_Northwest.pdf',
      items: [
        { id: 'li-201', description: 'Dedicated Van Day Routes', quantity: 32, unitPrice: 150, total: 4800, matchedPoItemId: 'poi-401' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000003'),
      invoiceNumber: 'INV-2026-003',
      vendorId: v3,
      poId: p6,
      amount: 2600,
      dueDate: '2026-10-10',
      submittedDate: '2026-09-14',
      status: 'Submitted',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-003_ByteForce.pdf',
      items: [
        { id: 'li-301', description: 'High-Density Patch Panels & Optics Cabling', quantity: 13, unitPrice: 200, total: 2600, matchedPoItemId: 'poi-602' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000004'),
      invoiceNumber: 'INV-2026-004',
      vendorId: v1,
      poId: p2,
      amount: 7200,
      dueDate: '2026-09-28',
      submittedDate: '2026-09-08',
      status: 'Under Verification',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-004_Apex.pdf',
      items: [
        { id: 'li-401', description: 'Database Architecture Consulting Hours', quantity: 40, unitPrice: 180, total: 7200, matchedPoItemId: 'poi-201' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000005'),
      invoiceNumber: 'INV-2026-005',
      vendorId: v2,
      poId: p3,
      amount: 8000,
      dueDate: '2026-09-19',
      submittedDate: '2026-09-09',
      status: 'Under Verification',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-005_NWL.pdf',
      items: [
        { id: 'li-501', description: 'Pallet Shipping - Zone 1 Standard Delivery', quantity: 50, unitPrice: 160, total: 8000, matchedPoItemId: 'poi-301' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000006'),
      invoiceNumber: 'INV-2026-006',
      vendorId: v5,
      poId: p8,
      amount: 14400,
      dueDate: '2026-10-25',
      submittedDate: '2026-09-11',
      status: 'Under Verification',
      submittedBy: uAdmin,
      attachedDocumentName: 'INV-2026-006_Pioneer.pdf',
      items: [
        { id: 'li-601', description: 'HEPA Industrial Clean Air Filtration System', quantity: 4, unitPrice: 3600, total: 14400, matchedPoItemId: 'poi-801' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000007'),
      invoiceNumber: 'INV-2026-007',
      vendorId: v3,
      poId: p5,
      amount: 14000,
      dueDate: '2026-09-30',
      submittedDate: '2026-08-28',
      status: 'Approved',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-007_ByteForce.pdf',
      items: [
        { id: 'li-701', description: 'High-Performance Developer Laptops (64GB RAM)', quantity: 5, unitPrice: 2800, total: 14000, matchedPoItemId: 'poi-501' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000008'),
      invoiceNumber: 'INV-2026-008',
      vendorId: v1,
      poId: p2,
      amount: 1000,
      dueDate: '2026-09-05',
      submittedDate: '2026-08-15',
      status: 'Approved',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-008_Apex.pdf',
      items: [
        { id: 'li-801', description: 'Cross-Region Storage Replication Tier 1', quantity: 2, unitPrice: 500, total: 1000, matchedPoItemId: 'poi-202' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000009'),
      invoiceNumber: 'INV-2026-009',
      vendorId: v2,
      poId: p4,
      amount: 1600,
      dueDate: '2026-09-22',
      submittedDate: '2026-08-30',
      status: 'Approved',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-009_NWL.pdf',
      items: [
        { id: 'li-901', description: 'Fuel Surcharge & Toll Reimbursement', quantity: 1, unitPrice: 1600, total: 1600, matchedPoItemId: 'poi-402' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000010'),
      invoiceNumber: 'INV-2026-010',
      vendorId: v5,
      poId: p8,
      amount: 8000,
      dueDate: '2026-10-15',
      submittedDate: '2026-09-01',
      status: 'Approved',
      submittedBy: uAdmin,
      attachedDocumentName: 'INV-2026-010_Pioneer.pdf',
      items: [
        { id: 'li-1001', description: 'OSHA-Certified Fall Protection & Rigging Harnesses', quantity: 16, unitPrice: 500, total: 8000, matchedPoItemId: 'poi-802' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000011'),
      invoiceNumber: 'INV-2026-011',
      vendorId: v4,
      poId: p7,
      amount: 11000,
      dueDate: '2026-09-25',
      submittedDate: '2026-09-05',
      status: 'Flagged',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-011_Summit.pdf',
      flagReason: 'Unit price discrepancy: invoiced rate $11,000 exceeds PO rate $9,500',
      items: [
        { id: 'li-1101', description: 'Design System Component Specification & Figma UI Kit', quantity: 1, unitPrice: 11000, total: 11000, matchedPoItemId: 'poi-701', priceMismatch: true },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000012'),
      invoiceNumber: 'INV-2026-012',
      vendorId: v2,
      poId: p3,
      amount: 6000,
      dueDate: '2026-09-12',
      submittedDate: '2026-08-20',
      status: 'Flagged',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-012_NWL.pdf',
      flagReason: 'Quantity overbill: invoiced for 12 shipments, but PO authorization limit is 8',
      items: [
        { id: 'li-1201', description: 'Expedited Temperature Controlled Transport', quantity: 12, unitPrice: 500, total: 6000, matchedPoItemId: 'poi-302', quantityMismatch: true },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000013'),
      invoiceNumber: 'INV-2026-013',
      vendorId: v3,
      poId: p6,
      amount: 8400,
      dueDate: '2026-10-05',
      submittedDate: '2026-09-07',
      status: 'Flagged',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-013_ByteForce.pdf',
      flagReason: 'Unit price mismatch on 48-Port Switches ($2,100 invoiced vs $1,800 PO rate)',
      items: [
        { id: 'li-1301', description: 'Managed 48-Port Gigabit PoE+ Switches', quantity: 4, unitPrice: 2100, total: 8400, matchedPoItemId: 'poi-601', priceMismatch: true },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000014'),
      invoiceNumber: 'INV-2026-014',
      vendorId: v1,
      poId: p1,
      amount: 8000,
      dueDate: '2026-09-20',
      submittedDate: '2026-08-10',
      status: 'Payment Scheduled',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-014_Apex.pdf',
      scheduledPaymentDate: '2026-09-18',
      items: [
        { id: 'li-1401', description: 'Cloud Compute Instances Tier 3', quantity: 2, unitPrice: 4000, total: 8000, matchedPoItemId: 'poi-101' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000015'),
      invoiceNumber: 'INV-2026-015',
      vendorId: v3,
      poId: p5,
      amount: 4500,
      dueDate: '2026-09-24',
      submittedDate: '2026-08-18',
      status: 'Payment Scheduled',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-015_ByteForce.pdf',
      scheduledPaymentDate: '2026-09-22',
      items: [
        { id: 'li-1501', description: '4K IPS 32-inch Dual Monitor Setup', quantity: 10, unitPrice: 450, total: 4500, matchedPoItemId: 'poi-502' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000016'),
      invoiceNumber: 'INV-2026-016',
      vendorId: v4,
      poId: p7,
      amount: 5500,
      dueDate: '2026-09-28',
      submittedDate: '2026-08-25',
      status: 'Payment Scheduled',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-016_Summit.pdf',
      scheduledPaymentDate: '2026-09-26',
      items: [
        { id: 'li-1601', description: 'Brand Guidelines & Iconography Set', quantity: 1, unitPrice: 5500, total: 5500, matchedPoItemId: 'poi-702' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000017'),
      invoiceNumber: 'INV-2026-017',
      vendorId: v2,
      poId: p3,
      amount: 4000,
      dueDate: '2026-08-15',
      submittedDate: '2026-07-20',
      status: 'Paid',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-017_NWL.pdf',
      scheduledPaymentDate: '2026-08-14',
      paidDate: '2026-08-15',
      items: [
        { id: 'li-1701', description: 'Expedited Temperature Controlled Transport', quantity: 8, unitPrice: 500, total: 4000, matchedPoItemId: 'poi-302' },
      ],
    },
    {
      _id: new mongoose.Types.ObjectId('653000000000000000000018'),
      invoiceNumber: 'INV-2026-018',
      vendorId: v1,
      poId: p1,
      amount: 2500,
      dueDate: '2026-08-20',
      submittedDate: '2026-07-25',
      status: 'Paid',
      submittedBy: uRequester,
      attachedDocumentName: 'INV-2026-018_Apex.pdf',
      scheduledPaymentDate: '2026-08-18',
      paidDate: '2026-08-19',
      items: [
        { id: 'li-1801', description: '24/7 Enterprise Cloud Support SLA', quantity: 1, unitPrice: 2500, total: 2500, matchedPoItemId: 'poi-102' },
      ],
    },
  ]);
  console.log(`[Seed] Seeded ${invoices.length} invoices.`);

  const inv1 = invoices[0]._id.toString();
  const inv4 = invoices[3]._id.toString();
  const inv7 = invoices[6]._id.toString();
  const inv11 = invoices[10]._id.toString();
  const inv14 = invoices[13]._id.toString();
  const inv17 = invoices[16]._id.toString();

  console.log('[Seed] Seeding audit log entries...');
  const audits = await AuditEntry.insertMany([
    {
      invoiceId: inv1,
      action: 'SUBMISSION',
      performedBy: 'Elena Rodriguez',
      timestamp: '2026-09-02T09:30:00Z',
      details: 'Invoice INV-2026-001 submitted for Apex Cloud Services',
    },
    {
      invoiceId: inv4,
      action: 'SUBMISSION',
      performedBy: 'Elena Rodriguez',
      timestamp: '2026-08-25T11:15:00Z',
      details: 'Invoice INV-2026-004 submitted for Northwest Logistics',
    },
    {
      invoiceId: inv4,
      action: 'VERIFICATION',
      performedBy: 'System Auto-Matcher',
      timestamp: '2026-08-25T11:16:00Z',
      details: '3-way match verified against PO-2026-003',
    },
    {
      invoiceId: inv7,
      action: 'SUBMISSION',
      performedBy: 'Elena Rodriguez',
      timestamp: '2026-08-18T14:20:00Z',
      details: 'Invoice INV-2026-007 submitted for ByteForce Technologies',
    },
    {
      invoiceId: inv7,
      action: 'APPROVAL',
      performedBy: 'Marcus Vance',
      timestamp: '2026-08-19T10:00:00Z',
      details: 'Invoice approved following PO line item validation',
    },
    {
      invoiceId: inv11,
      action: 'SUBMISSION',
      performedBy: 'Elena Rodriguez',
      timestamp: '2026-09-05T08:45:00Z',
      details: 'Invoice INV-2026-011 submitted for Summit Creative',
    },
    {
      invoiceId: inv11,
      action: 'FLAGGED',
      performedBy: 'Marcus Vance',
      timestamp: '2026-09-06T13:30:00Z',
      details: 'Unit price discrepancy on Design System Component Library UI',
    },
    {
      invoiceId: inv14,
      action: 'APPROVAL',
      performedBy: 'Marcus Vance',
      timestamp: '2026-08-10T16:00:00Z',
      details: 'Approved for disbursement',
    },
    {
      invoiceId: inv14,
      action: 'PAYMENT_SCHEDULED',
      performedBy: 'Sarah Chen',
      timestamp: '2026-08-12T09:00:00Z',
      details: 'Scheduled payment date set to 2026-09-18 via ACH',
    },
    {
      invoiceId: inv17,
      action: 'APPROVAL',
      performedBy: 'Marcus Vance',
      timestamp: '2026-07-28T10:00:00Z',
      details: 'Approved for payment',
    },
    {
      invoiceId: inv17,
      action: 'PAYMENT_COMPLETED',
      performedBy: 'Sarah Chen',
      timestamp: '2026-08-15T15:30:00Z',
      details: 'Settlement confirmed via Wire Transfer reference #WT-948201',
    },
  ]);
  console.log(`[Seed] Seeded ${audits.length} audit entries.`);

  console.log('[Seed] Database seeding completed successfully.');
};

if (require.main === module) {
  seedDatabase()
    .then(() => disconnectDB())
    .catch((err) => {
      console.error('[Seed] Seeding failed:', err);
      process.exit(1);
    });
}
