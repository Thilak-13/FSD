const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const AuditEntry = require('../models/AuditEntry');
const NotificationRead = require('../models/NotificationRead');

const daysFromNow = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split('T')[0];
};

const dateFromNow = (days, hours = 0, minutes = 0) => {
  return new Date(Date.now() + days * 86400000 + hours * 3600000 + minutes * 60000);
};

const DEMO_USERS = [
  {
    name: 'Alex Rivera',
    email: 'alex.rivera@apex.corp',
    password: 'DemoPassword!2026',
    role: 'Admin',
    department: 'Executive / Administration',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&fit=crop&crop=face',
  },
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@apex.corp',
    password: 'DemoPassword!2026',
    role: 'Approver',
    department: 'Procurement & Approvals',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&fit=crop&crop=face',
  },
  {
    name: 'Jordan Lee',
    email: 'jordan.lee@apex.corp',
    password: 'DemoPassword!2026',
    role: 'Requester',
    department: 'Engineering / Facilities',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&fit=crop&crop=face',
  },
];

const DEMO_VENDORS = [
  {
    name: 'Apex Cloud Services',
    contactEmail: 'billing@apexcloud.io',
    paymentTerms: 'Net 30',
    address: '500 Howard St, Suite 400, San Francisco, CA 94105',
    taxId: '94-3289104',
    status: 'Active',
    phone: '+1 (415) 555-0192',
    totalInvoices: 0,
  },
  {
    name: 'Northwest Logistics',
    contactEmail: 'ap@northwestlogistics.com',
    paymentTerms: 'Net 15',
    address: '1200 Industrial Way, Seattle, WA 98101',
    taxId: '91-4829105',
    status: 'Active',
    phone: '+1 (206) 555-0143',
    totalInvoices: 0,
  },
  {
    name: 'ByteForce Technologies',
    contactEmail: 'invoices@byteforce.tech',
    paymentTerms: 'Net 45',
    address: '88 Tech Ridge Blvd, Austin, TX 78759',
    taxId: '74-9821034',
    status: 'Active',
    phone: '+1 (512) 555-0188',
    totalInvoices: 0,
  },
  {
    name: 'Summit Creative',
    contactEmail: 'accounts@summitcreative.agency',
    paymentTerms: 'Net 30',
    address: '240 5th Ave, Floor 8, New York, NY 10001',
    taxId: '13-7892145',
    status: 'Under Review',
    phone: '+1 (212) 555-0112',
    totalInvoices: 0,
  },
  {
    name: 'Pioneer Industrial',
    contactEmail: 'finance@pioneerind.com',
    paymentTerms: 'Net 60',
    address: '4500 Manufacturing Blvd, Detroit, MI 48201',
    taxId: '38-6543219',
    status: 'Active',
    phone: '+1 (313) 555-0177',
    totalInvoices: 0,
  },
  {
    name: 'Vanguard Facility Solutions',
    contactEmail: 'billing@vanguardfacility.com',
    paymentTerms: 'Net 30',
    address: '742 Industrial Pkwy, Springfield, IL 62704',
    taxId: '36-8192043',
    status: 'Active',
    phone: '+1 (217) 555-0189',
    totalInvoices: 0,
  },
];

const getDemoPurchaseOrders = () => [
  {
    poNumber: 'PO-2026-001',
    vendorName: 'Apex Cloud Services',
    amount: 14500,
    description: 'Cloud Infrastructure & Reserved Instances Q3',
    createdDate: daysFromNow(-90),
    status: 'Partially Invoiced',
    items: [
      {
        id: 'poi-101',
        description: 'Cloud Compute Instances Tier 3',
        quantity: 3,
        unitPrice: 4000,
        total: 12000,
      },
      {
        id: 'poi-102',
        description: '24/7 Enterprise Cloud Support SLA',
        quantity: 1,
        unitPrice: 2500,
        total: 2500,
      },
    ],
  },
  {
    poNumber: 'PO-2026-002',
    vendorName: 'Apex Cloud Services',
    amount: 8200,
    description: 'Database Backup & Data Migration Services',
    createdDate: daysFromNow(-80),
    status: 'Open',
    items: [
      {
        id: 'poi-201',
        description: 'Database Architecture Consulting Hours',
        quantity: 40,
        unitPrice: 180,
        total: 7200,
      },
      {
        id: 'poi-202',
        description: 'Cross-Region Storage Replication Tier 1',
        quantity: 2,
        unitPrice: 500,
        total: 1000,
      },
    ],
  },
  {
    poNumber: 'PO-2026-003',
    vendorName: 'Northwest Logistics',
    amount: 12000,
    description: 'Regional Freight & Distribution Contracts',
    createdDate: daysFromNow(-60),
    status: 'Partially Invoiced',
    items: [
      {
        id: 'poi-301',
        description: 'Pallet Shipping - Zone 1 Standard Delivery',
        quantity: 50,
        unitPrice: 160,
        total: 8000,
      },
      {
        id: 'poi-302',
        description: 'Expedited Temperature Controlled Transport',
        quantity: 8,
        unitPrice: 500,
        total: 4000,
      },
    ],
  },
  {
    poNumber: 'PO-2026-004',
    vendorName: 'Northwest Logistics',
    amount: 6400,
    description: 'Fleet Dedicated Delivery Services August/September',
    createdDate: daysFromNow(-50),
    status: 'Open',
    items: [
      {
        id: 'poi-401',
        description: 'Dedicated Van Day Routes',
        quantity: 32,
        unitPrice: 150,
        total: 4800,
      },
      {
        id: 'poi-402',
        description: 'Fuel Surcharge & Toll Reimbursement',
        quantity: 1,
        unitPrice: 1600,
        total: 1600,
      },
    ],
  },
  {
    poNumber: 'PO-2026-005',
    vendorName: 'ByteForce Technologies',
    amount: 18500,
    description: 'Workstation Upgrades & Engineering Equipment',
    createdDate: daysFromNow(-45),
    status: 'Partially Invoiced',
    items: [
      {
        id: 'poi-501',
        description: 'High-Performance Developer Laptops (64GB RAM)',
        quantity: 5,
        unitPrice: 2800,
        total: 14000,
      },
      {
        id: 'poi-502',
        description: '4K IPS 32-inch Dual Monitor Setup',
        quantity: 10,
        unitPrice: 450,
        total: 4500,
      },
    ],
  },
  {
    poNumber: 'PO-2026-006',
    vendorName: 'ByteForce Technologies',
    amount: 9800,
    description: 'Server Room Network Infrastructure Upgrade',
    createdDate: daysFromNow(-40),
    status: 'Open',
    items: [
      {
        id: 'poi-601',
        description: 'Managed 48-Port Gigabit PoE+ Switches',
        quantity: 4,
        unitPrice: 1800,
        total: 7200,
      },
      {
        id: 'poi-602',
        description: 'High-Density Patch Panels & Optics Cabling',
        quantity: 13,
        unitPrice: 200,
        total: 2600,
      },
    ],
  },
  {
    poNumber: 'PO-2026-007',
    vendorName: 'Summit Creative',
    amount: 15000,
    description: 'Design System Implementation & Creative Assets',
    createdDate: daysFromNow(-35),
    status: 'Partially Invoiced',
    items: [
      {
        id: 'poi-701',
        description: 'Design System Component Specification & Figma UI Kit',
        quantity: 1,
        unitPrice: 9500,
        total: 9500,
      },
      {
        id: 'poi-702',
        description: 'Brand Guidelines & Iconography Set',
        quantity: 1,
        unitPrice: 5500,
        total: 5500,
      },
    ],
  },
  {
    poNumber: 'PO-2026-008',
    vendorName: 'Pioneer Industrial',
    amount: 22400,
    description: 'Facility Machinery Maintenance & Safety Kits',
    createdDate: daysFromNow(-30),
    status: 'Partially Invoiced',
    items: [
      {
        id: 'poi-801',
        description: 'HEPA Industrial Clean Air Filtration System',
        quantity: 4,
        unitPrice: 3600,
        total: 14400,
      },
      {
        id: 'poi-802',
        description: 'OSHA-Certified Fall Protection & Rigging Harnesses',
        quantity: 16,
        unitPrice: 500,
        total: 8000,
      },
    ],
  },
  {
    poNumber: 'PO-2026-009',
    vendorName: 'Pioneer Industrial',
    amount: 16000,
    description: 'Cleanroom Ventilation & Compressor Motors',
    createdDate: daysFromNow(-28),
    status: 'Partially Invoiced',
    items: [
      {
        id: 'poi-901',
        description: 'Industrial Compressor Motor Assembly',
        quantity: 2,
        unitPrice: 3200,
        total: 6400,
      },
      {
        id: 'poi-902',
        description: 'Cleanroom Airlock & Curtain Module',
        quantity: 3,
        unitPrice: 3200,
        total: 9600,
      },
    ],
  },
  {
    poNumber: 'PO-2026-010',
    vendorName: 'Vanguard Facility Solutions',
    amount: 11200,
    description: 'Commercial HVAC System Bi-Monthly Inspection',
    createdDate: daysFromNow(-25),
    status: 'Partially Invoiced',
    items: [
      {
        id: 'poi-1001',
        description: 'Commercial HVAC System Bi-Monthly Inspection',
        quantity: 4,
        unitPrice: 2800,
        total: 11200,
      },
    ],
  },
  {
    poNumber: 'PO-2026-011',
    vendorName: 'Vanguard Facility Solutions',
    amount: 7500,
    description: 'Generator Load Bank Testing & Fuel Servicing',
    createdDate: daysFromNow(-20),
    status: 'Open',
    items: [
      {
        id: 'poi-1101',
        description: 'Generator Load Bank Testing & Fuel Servicing',
        quantity: 1,
        unitPrice: 7500,
        total: 7500,
      },
    ],
  },
  {
    poNumber: 'PO-2026-012',
    vendorName: 'Apex Cloud Services',
    amount: 24000,
    description: 'Multi-Region Kubernetes Enterprise Dedicated Cluster',
    createdDate: daysFromNow(-15),
    status: 'Partially Invoiced',
    items: [
      {
        id: 'poi-1201',
        description: 'Kubernetes Dedicated Enterprise Cluster Nodes',
        quantity: 12,
        unitPrice: 2000,
        total: 24000,
      },
    ],
  },
];

const getDemoInvoices = (vendorMap, poMap, userMap) => {
  const alex = userMap.get('Alex Rivera');
  const sarah = userMap.get('Sarah Chen');
  const jordan = userMap.get('Jordan Lee');

  const apex = vendorMap.get('Apex Cloud Services');
  const northwest = vendorMap.get('Northwest Logistics');
  const byteforce = vendorMap.get('ByteForce Technologies');
  const summit = vendorMap.get('Summit Creative');
  const pioneer = vendorMap.get('Pioneer Industrial');
  const vanguard = vendorMap.get('Vanguard Facility Solutions');

  const po1 = poMap.get('PO-2026-001');
  const po2 = poMap.get('PO-2026-002');
  const po3 = poMap.get('PO-2026-003');
  const po4 = poMap.get('PO-2026-004');
  const po5 = poMap.get('PO-2026-005');
  const po6 = poMap.get('PO-2026-006');
  const po7 = poMap.get('PO-2026-007');
  const po8 = poMap.get('PO-2026-008');
  const po9 = poMap.get('PO-2026-009');
  const po10 = poMap.get('PO-2026-010');
  const po11 = poMap.get('PO-2026-011');
  const po12 = poMap.get('PO-2026-012');

  const sampleDoc = 'uploads/sample-attachment.pdf';

  return [
    // 1. Paid - t - 30 days
    {
      invoiceNumber: 'INV-2026-001',
      vendorId: apex._id,
      poId: po1?._id,
      amount: 2500,
      dueDate: daysFromNow(-15),
      submittedDate: daysFromNow(-30),
      status: 'Paid',
      scheduledPaymentDate: daysFromNow(-26),
      paidDate: daysFromNow(-25),
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-001_Apex.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Monthly 24/7 Enterprise Cloud Support SLA',
      subDays: -30,
      items: [
        {
          id: 'li-101',
          description: '24/7 Enterprise Cloud Support SLA',
          quantity: 1,
          unitPrice: 2500,
          total: 2500,
          matchedPoItemId: 'poi-102',
        },
      ],
    },
    // 2. Paid - t - 28 days
    {
      invoiceNumber: 'INV-2026-002',
      vendorId: northwest._id,
      poId: po3?._id,
      amount: 4000,
      dueDate: daysFromNow(-14),
      submittedDate: daysFromNow(-28),
      status: 'Paid',
      scheduledPaymentDate: daysFromNow(-24),
      paidDate: daysFromNow(-23),
      submittedBy: sarah._id,
      attachedDocumentName: 'INV-2026-002_NWL.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Temperature controlled expedited logistics transport',
      subDays: -28,
      items: [
        {
          id: 'li-201',
          description: 'Expedited Temperature Controlled Transport',
          quantity: 8,
          unitPrice: 500,
          total: 4000,
          matchedPoItemId: 'poi-302',
        },
      ],
    },
    // 3. Paid - t - 26 days
    {
      invoiceNumber: 'INV-2026-003',
      vendorId: byteforce._id,
      poId: po6?._id,
      amount: 2600,
      dueDate: daysFromNow(-12),
      submittedDate: daysFromNow(-26),
      status: 'Paid',
      scheduledPaymentDate: daysFromNow(-20),
      paidDate: daysFromNow(-19),
      submittedBy: alex._id,
      attachedDocumentName: 'INV-2026-003_ByteForce.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'High-density optics cabling and patch panels',
      subDays: -26,
      items: [
        {
          id: 'li-301',
          description: 'High-Density Patch Panels & Optics Cabling',
          quantity: 13,
          unitPrice: 200,
          total: 2600,
          matchedPoItemId: 'poi-602',
        },
      ],
    },
    // 4. Under Verification (Overdue) - t - 25 days
    {
      invoiceNumber: 'INV-2026-004',
      vendorId: apex._id,
      poId: po2?._id,
      amount: 1000,
      dueDate: daysFromNow(-15), // OVERDUE
      submittedDate: daysFromNow(-25),
      status: 'Under Verification',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-004_Apex.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Cross-region storage replication tier 1',
      subDays: -25,
      items: [
        {
          id: 'li-401',
          description: 'Cross-Region Storage Replication Tier 1',
          quantity: 2,
          unitPrice: 500,
          total: 1000,
          matchedPoItemId: 'poi-202',
        },
      ],
    },
    // 5. Paid - t - 23 days
    {
      invoiceNumber: 'INV-2026-005',
      vendorId: pioneer._id,
      poId: po9?._id,
      amount: 6400,
      dueDate: daysFromNow(-10),
      submittedDate: daysFromNow(-23),
      status: 'Paid',
      scheduledPaymentDate: daysFromNow(-16),
      paidDate: daysFromNow(-15),
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-005_Pioneer.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Industrial air compressor motor assembly overhaul',
      subDays: -23,
      items: [
        {
          id: 'li-501',
          description: 'Industrial Compressor Motor Assembly',
          quantity: 2,
          unitPrice: 3200,
          total: 6400,
          matchedPoItemId: 'poi-901',
        },
      ],
    },
    // 6. Approved - t - 21 days
    {
      invoiceNumber: 'INV-2026-006',
      vendorId: byteforce._id,
      poId: po5?._id,
      amount: 14000,
      dueDate: daysFromNow(14),
      submittedDate: daysFromNow(-21),
      status: 'Approved',
      submittedBy: alex._id,
      attachedDocumentName: 'INV-2026-006_ByteForce.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Developer laptop workstations 64GB RAM upgrade',
      subDays: -21,
      items: [
        {
          id: 'li-601',
          description: 'High-Performance Developer Laptops (64GB RAM)',
          quantity: 5,
          unitPrice: 2800,
          total: 14000,
          matchedPoItemId: 'poi-501',
        },
      ],
    },
    // 7. Approved - t - 20 days
    {
      invoiceNumber: 'INV-2026-007',
      vendorId: apex._id,
      poId: po1?._id,
      amount: 8000,
      dueDate: daysFromNow(15),
      submittedDate: daysFromNow(-20),
      status: 'Approved',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-007_Apex.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Cloud compute tier 3 reserved instances batch 1',
      subDays: -20,
      items: [
        {
          id: 'li-701',
          description: 'Cloud Compute Instances Tier 3',
          quantity: 2,
          unitPrice: 4000,
          total: 8000,
          matchedPoItemId: 'poi-101',
        },
      ],
    },
    // 8. Payment Scheduled - t - 19 days
    {
      invoiceNumber: 'INV-2026-008',
      vendorId: byteforce._id,
      poId: po5?._id,
      amount: 4500,
      dueDate: daysFromNow(18),
      submittedDate: daysFromNow(-19),
      status: 'Payment Scheduled',
      scheduledPaymentDate: daysFromNow(7),
      submittedBy: alex._id,
      attachedDocumentName: 'INV-2026-008_ByteForce.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Dual monitor 4k IPS engineering workstation displays',
      subDays: -19,
      items: [
        {
          id: 'li-801',
          description: '4K IPS 32-inch Dual Monitor Setup',
          quantity: 10,
          unitPrice: 450,
          total: 4500,
          matchedPoItemId: 'poi-502',
        },
      ],
    },
    // 9. Flagged (Variance outside tolerance) - t - 18 days
    {
      invoiceNumber: 'INV-2026-009',
      vendorId: apex._id,
      poId: po2?._id,
      amount: 8350,
      dueDate: daysFromNow(12),
      submittedDate: daysFromNow(-18),
      status: 'Flagged',
      flagReason: 'Amount mismatch: Invoice amount ₹8,350.00 differs from PO amount ₹8,200.00 (variance: ₹150.00 exceeds ±₹0.01 tolerance)',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-009_Apex.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Database consulting hours with unapproved surge billing',
      subDays: -18,
      items: [
        {
          id: 'li-901',
          description: 'Database Architecture Consulting Hours',
          quantity: 45,
          unitPrice: 180,
          total: 8100,
          matchedPoItemId: 'poi-201',
        },
        {
          id: 'li-902',
          description: 'Emergency Support Surcharge',
          quantity: 1,
          unitPrice: 250,
          total: 250,
        },
      ],
    },
    // 10. Approved (Overdue) - t - 17 days
    {
      invoiceNumber: 'INV-2026-010',
      vendorId: vanguard._id,
      poId: po10?._id,
      amount: 5600,
      dueDate: daysFromNow(-8), // OVERDUE
      submittedDate: daysFromNow(-17),
      status: 'Approved',
      submittedBy: sarah._id,
      attachedDocumentName: 'INV-2026-010_VFS.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'HVAC commercial central air preventative maintenance',
      subDays: -17,
      items: [
        {
          id: 'li-1001',
          description: 'Commercial HVAC System Bi-Monthly Inspection',
          quantity: 2,
          unitPrice: 2800,
          total: 5600,
          matchedPoItemId: 'poi-1001',
        },
      ],
    },
    // 11. Payment Scheduled - t - 16 days
    {
      invoiceNumber: 'INV-2026-011',
      vendorId: pioneer._id,
      poId: po8?._id,
      amount: 8000,
      dueDate: daysFromNow(20),
      submittedDate: daysFromNow(-16),
      status: 'Payment Scheduled',
      scheduledPaymentDate: daysFromNow(5),
      submittedBy: alex._id,
      attachedDocumentName: 'INV-2026-011_Pioneer.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'OSHA certified rigging equipment safety inventory',
      subDays: -16,
      items: [
        {
          id: 'li-1101',
          description: 'OSHA-Certified Fall Protection & Rigging Harnesses',
          quantity: 16,
          unitPrice: 500,
          total: 8000,
          matchedPoItemId: 'poi-802',
        },
      ],
    },
    // 12. Payment Scheduled - t - 15 days
    {
      invoiceNumber: 'INV-2026-012',
      vendorId: summit._id,
      poId: po7?._id,
      amount: 5500,
      dueDate: daysFromNow(22),
      submittedDate: daysFromNow(-15),
      status: 'Payment Scheduled',
      scheduledPaymentDate: daysFromNow(12),
      submittedBy: sarah._id,
      attachedDocumentName: 'INV-2026-012_Summit.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Brand guidelines and iconography design package',
      subDays: -15,
      items: [
        {
          id: 'li-1201',
          description: 'Brand Guidelines & Iconography Set',
          quantity: 1,
          unitPrice: 5500,
          total: 5500,
          matchedPoItemId: 'poi-702',
        },
      ],
    },
    // 13. Approved - t - 14 days
    {
      invoiceNumber: 'INV-2026-013',
      vendorId: northwest._id,
      poId: po4?._id,
      amount: 1600,
      dueDate: daysFromNow(10),
      submittedDate: daysFromNow(-14),
      status: 'Approved',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-013_NWL.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Fuel surcharge and toll reimbursement August run',
      subDays: -14,
      items: [
        {
          id: 'li-1301',
          description: 'Fuel Surcharge & Toll Reimbursement',
          quantity: 1,
          unitPrice: 1600,
          total: 1600,
          matchedPoItemId: 'poi-402',
        },
      ],
    },
    // 14. Payment Scheduled - t - 13 days
    {
      invoiceNumber: 'INV-2026-014',
      vendorId: pioneer._id,
      poId: po9?._id,
      amount: 9600,
      dueDate: daysFromNow(25),
      submittedDate: daysFromNow(-13),
      status: 'Payment Scheduled',
      scheduledPaymentDate: daysFromNow(15),
      submittedBy: alex._id,
      attachedDocumentName: 'INV-2026-014_Pioneer.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Cleanroom containment airlocks and air curtains module',
      subDays: -13,
      items: [
        {
          id: 'li-1401',
          description: 'Cleanroom Airlock & Curtain Module',
          quantity: 3,
          unitPrice: 3200,
          total: 9600,
          matchedPoItemId: 'poi-902',
        },
      ],
    },
    // 15. Under Verification (Pending approval > 3 days) - t - 12 days
    {
      invoiceNumber: 'INV-2026-015',
      vendorId: vanguard._id,
      poId: po11?._id,
      amount: 7500,
      dueDate: daysFromNow(18),
      submittedDate: daysFromNow(-12), // PENDING APPROVAL > 3 DAYS
      status: 'Under Verification',
      submittedBy: sarah._id,
      attachedDocumentName: 'INV-2026-015_VFS.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Facility emergency generator load testing and fuel service',
      subDays: -12,
      items: [
        {
          id: 'li-1501',
          description: 'Generator Load Bank Testing & Fuel Servicing',
          quantity: 1,
          unitPrice: 7500,
          total: 7500,
          matchedPoItemId: 'poi-1101',
        },
      ],
    },
    // 16. Flagged (Price mismatch) - t - 11 days
    {
      invoiceNumber: 'INV-2026-016',
      vendorId: summit._id,
      poId: po7?._id,
      amount: 11000,
      dueDate: daysFromNow(20),
      submittedDate: daysFromNow(-11),
      status: 'Flagged',
      flagReason: 'Unit price discrepancy: invoiced rate ₹11,000 exceeds PO rate ₹9,500',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-016_Summit.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Design system specifications and Figma UI Kit components',
      subDays: -11,
      items: [
        {
          id: 'li-1601',
          description: 'Design System Component Specification & Figma UI Kit',
          quantity: 1,
          unitPrice: 11000,
          total: 11000,
          matchedPoItemId: 'poi-701',
          priceMismatch: true,
        },
      ],
    },
    // 17. Approved (Overdue) - t - 10 days
    {
      invoiceNumber: 'INV-2026-017',
      vendorId: pioneer._id,
      poId: po8?._id,
      amount: 14400,
      dueDate: daysFromNow(-2), // OVERDUE
      submittedDate: daysFromNow(-10),
      status: 'Approved',
      submittedBy: alex._id,
      attachedDocumentName: 'INV-2026-017_Pioneer.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Industrial filtration system installation & certification',
      subDays: -10,
      items: [
        {
          id: 'li-1701',
          description: 'HEPA Industrial Clean Air Filtration System',
          quantity: 4,
          unitPrice: 3600,
          total: 14400,
          matchedPoItemId: 'poi-801',
        },
      ],
    },
    // 18. Payment Scheduled (Due Soon) - t - 9 days
    {
      invoiceNumber: 'INV-2026-018',
      vendorId: apex._id,
      poId: po12?._id,
      amount: 12000,
      dueDate: daysFromNow(2), // DUE SOON
      submittedDate: daysFromNow(-9),
      status: 'Payment Scheduled',
      scheduledPaymentDate: daysFromNow(2),
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-018_Apex.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Kubernetes dedicated enterprise cluster worker nodes',
      subDays: -9,
      items: [
        {
          id: 'li-1801',
          description: 'Kubernetes Dedicated Enterprise Cluster Nodes',
          quantity: 6,
          unitPrice: 2000,
          total: 12000,
          matchedPoItemId: 'poi-1201',
        },
      ],
    },
    // 19. Under Verification (Pending approval > 3 days) - t - 8 days
    {
      invoiceNumber: 'INV-2026-019',
      vendorId: northwest._id,
      poId: po3?._id,
      amount: 8000,
      dueDate: daysFromNow(20),
      submittedDate: daysFromNow(-8), // PENDING APPROVAL > 3 DAYS
      status: 'Under Verification',
      submittedBy: sarah._id,
      attachedDocumentName: 'INV-2026-019_NWL.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Pallet shipping zone 1 delivery batch weekly settlement',
      subDays: -8,
      items: [
        {
          id: 'li-1901',
          description: 'Pallet Shipping - Zone 1 Standard Delivery',
          quantity: 50,
          unitPrice: 160,
          total: 8000,
          matchedPoItemId: 'poi-301',
        },
      ],
    },
    // 20. Submitted (2-Way match non-PO, Pending approval > 3 days) - t - 7 days
    {
      invoiceNumber: 'INV-2026-020',
      vendorId: vanguard._id,
      amount: 3200,
      dueDate: daysFromNow(23),
      submittedDate: daysFromNow(-7), // PENDING APPROVAL > 3 DAYS
      status: 'Submitted',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-020_VFS.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Draft submission - Scheduled commercial janitorial & sanitation (2-way direct match)',
      subDays: -7,
      items: [
        {
          id: 'li-2001',
          description: 'Scheduled Commercial Janitorial & Sanitation',
          quantity: 1,
          unitPrice: 3200,
          total: 3200,
        },
      ],
    },
    // 21. Approved (Due Soon) - t - 6 days
    {
      invoiceNumber: 'INV-2026-021',
      vendorId: byteforce._id,
      poId: po6?._id,
      amount: 7200,
      dueDate: daysFromNow(4), // DUE SOON
      submittedDate: daysFromNow(-6),
      status: 'Approved',
      submittedBy: sarah._id,
      attachedDocumentName: 'INV-2026-021_ByteForce.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Gigabit PoE+ switches for server room network upgrade',
      subDays: -6,
      items: [
        {
          id: 'li-2101',
          description: 'Managed 48-Port Gigabit PoE+ Switches',
          quantity: 4,
          unitPrice: 1800,
          total: 7200,
          matchedPoItemId: 'poi-601',
        },
      ],
    },
    // 22. Flagged (Quantity excess) - t - 5 days
    {
      invoiceNumber: 'INV-2026-022',
      vendorId: northwest._id,
      poId: po3?._id,
      amount: 6000,
      dueDate: daysFromNow(20),
      submittedDate: daysFromNow(-5),
      status: 'Flagged',
      flagReason: 'Quantity overbill: invoiced for 12 shipments, but PO authorization limit is 8',
      submittedBy: sarah._id,
      attachedDocumentName: 'INV-2026-022_NWL.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Expedited transport exceeding PO shipment limits',
      subDays: -5,
      items: [
        {
          id: 'li-2201',
          description: 'Expedited Temperature Controlled Transport',
          quantity: 12,
          unitPrice: 500,
          total: 6000,
          matchedPoItemId: 'poi-302',
          quantityMismatch: true,
        },
      ],
    },
    // 23. Submitted (Pending approval > 3 days) - t - 4 days
    {
      invoiceNumber: 'INV-2026-023',
      vendorId: northwest._id,
      poId: po4?._id,
      amount: 4800,
      dueDate: daysFromNow(20),
      submittedDate: daysFromNow(-4), // PENDING APPROVAL > 3 DAYS
      status: 'Submitted',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-023_NWL.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Draft submission - Dedicated van routes for regional distribution',
      subDays: -4,
      items: [
        {
          id: 'li-2301',
          description: 'Dedicated Van Day Routes',
          quantity: 32,
          unitPrice: 150,
          total: 4800,
          matchedPoItemId: 'poi-401',
        },
      ],
    },
    // 24. Under Verification (Within tolerance variance +₹0.01) - t - 4 days
    {
      invoiceNumber: 'INV-2026-024',
      vendorId: northwest._id,
      poId: po4?._id,
      amount: 6400.01, // WITHIN TOLERANCE (+0.01)
      dueDate: daysFromNow(26),
      submittedDate: daysFromNow(-4), // PENDING APPROVAL > 3 DAYS
      status: 'Under Verification',
      submittedBy: alex._id,
      attachedDocumentName: 'INV-2026-024_NWL.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Dedicated fleet delivery with ₹0.01 state environmental fractional fee within tolerance',
      subDays: -4,
      items: [
        {
          id: 'li-2401',
          description: 'Dedicated Van Day Routes',
          quantity: 32,
          unitPrice: 150,
          total: 4800,
          matchedPoItemId: 'poi-401',
        },
        {
          id: 'li-2402',
          description: 'Fuel Surcharge & Toll Reimbursement',
          quantity: 1,
          unitPrice: 1600.01,
          total: 1600.01,
          matchedPoItemId: 'poi-402',
        },
      ],
    },
    // 25. Flagged (Duplicate invoice number) - t - 3 days
    {
      invoiceNumber: 'INV-2026-025',
      vendorId: byteforce._id,
      poId: po6?._id,
      amount: 2600,
      dueDate: daysFromNow(20),
      submittedDate: daysFromNow(-3),
      status: 'Flagged',
      flagReason: 'Duplicate invoice number flagged: INV-2026-003 was previously submitted and processed for this vendor',
      submittedBy: alex._id,
      attachedDocumentName: 'INV-2026-025_ByteForce.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Potential duplicate invoice submission identified during automated 3-way match validation',
      subDays: -3,
      items: [
        {
          id: 'li-2501',
          description: 'High-Density Patch Panels & Optics Cabling',
          quantity: 13,
          unitPrice: 200,
          total: 2600,
          matchedPoItemId: 'poi-602',
        },
      ],
    },
    // 26. Submitted (2-Way matching SaaS usage) - t - 2 days
    {
      invoiceNumber: 'INV-2026-026',
      vendorId: apex._id,
      amount: 1850,
      dueDate: daysFromNow(28),
      submittedDate: daysFromNow(-2),
      status: 'Submitted',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-026_Apex.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Draft submission - Serverless API Gateway regional egress (2-way matching direct SaaS)',
      subDays: -2,
      items: [
        {
          id: 'li-2601',
          description: 'API Gateway Regional Data Transfer',
          quantity: 1,
          unitPrice: 1850,
          total: 1850,
        },
      ],
    },
    // 27. Under Verification (Due soon) - t - 2 days
    {
      invoiceNumber: 'INV-2026-027',
      vendorId: apex._id,
      poId: po2?._id,
      amount: 7200,
      dueDate: daysFromNow(5), // DUE SOON
      submittedDate: daysFromNow(-2),
      status: 'Under Verification',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-027_Apex.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Database architecture consulting hours - migration phase 2',
      subDays: -2,
      items: [
        {
          id: 'li-2701',
          description: 'Database Architecture Consulting Hours',
          quantity: 40,
          unitPrice: 180,
          total: 7200,
          matchedPoItemId: 'poi-201',
        },
      ],
    },
    // 28. Submitted - t - 1 day
    {
      invoiceNumber: 'INV-2026-028',
      vendorId: byteforce._id,
      poId: po6?._id,
      amount: 2600,
      dueDate: daysFromNow(20),
      submittedDate: daysFromNow(-1),
      status: 'Submitted',
      submittedBy: alex._id,
      attachedDocumentName: 'INV-2026-028_ByteForce.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Draft submission - High-density optics patch panels',
      subDays: -1,
      items: [
        {
          id: 'li-2801',
          description: 'High-Density Patch Panels & Optics Cabling',
          quantity: 13,
          unitPrice: 200,
          total: 2600,
          matchedPoItemId: 'poi-602',
        },
      ],
    },
    // 29. Flagged (Unapproved surcharge line item) - t - 1 day
    {
      invoiceNumber: 'INV-2026-029',
      vendorId: vanguard._id,
      poId: po10?._id,
      amount: 11200,
      dueDate: daysFromNow(15),
      submittedDate: daysFromNow(-1),
      status: 'Flagged',
      flagReason: 'PO authorization discrepancy: Invoice contains unapproved overtime surcharge of ₹2,800 not defined in PO-2026-010',
      submittedBy: sarah._id,
      attachedDocumentName: 'INV-2026-029_VFS.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Discrepancy flagged: vendor included unauthorized after-hours facility rates',
      subDays: -1,
      items: [
        {
          id: 'li-2901',
          description: 'Commercial HVAC System Bi-Monthly Inspection',
          quantity: 3,
          unitPrice: 2800,
          total: 8400,
          matchedPoItemId: 'poi-1001',
        },
        {
          id: 'li-2902',
          description: 'Unauthorized Weekend Overtime Surcharge',
          quantity: 1,
          unitPrice: 2800,
          total: 2800,
        },
      ],
    },
    // 30. Submitted (Due Today) - t = 0
    {
      invoiceNumber: 'INV-2026-030',
      vendorId: apex._id,
      poId: po1?._id,
      amount: 6500,
      dueDate: daysFromNow(0), // DUE TODAY (Due soon)
      submittedDate: daysFromNow(0),
      status: 'Submitted',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-030_Apex.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Draft submission - Monthly cloud infrastructure compute and SLA services',
      subDays: 0,
      items: [
        {
          id: 'li-3001',
          description: 'Cloud Compute Instances Tier 3',
          quantity: 1,
          unitPrice: 4000,
          total: 4000,
          matchedPoItemId: 'poi-101',
        },
        {
          id: 'li-3002',
          description: '24/7 Enterprise Cloud Support SLA',
          quantity: 1,
          unitPrice: 2500,
          total: 2500,
          matchedPoItemId: 'poi-102',
        },
      ],
    },
    // 31. Under Verification (Future due date up to t + 30) - t = 0
    {
      invoiceNumber: 'INV-2026-031',
      vendorId: apex._id,
      poId: po12?._id,
      amount: 12000,
      dueDate: daysFromNow(30), // FUTURE DUE DATE UP TO T+30
      submittedDate: daysFromNow(0),
      status: 'Under Verification',
      submittedBy: jordan._id,
      attachedDocumentName: 'INV-2026-031_Apex.pdf',
      attachedDocumentPath: sampleDoc,
      notes: '3-way verification: Enterprise Kubernetes cluster additional worker nodes',
      subDays: 0,
      items: [
        {
          id: 'li-3101',
          description: 'Kubernetes Dedicated Enterprise Cluster Nodes',
          quantity: 6,
          unitPrice: 2000,
          total: 12000,
          matchedPoItemId: 'poi-1201',
        },
      ],
    },
    // 32. Submitted (2-Way matching direct facilities, future due date) - t = 0
    {
      invoiceNumber: 'INV-2026-032',
      vendorId: vanguard._id,
      amount: 2400,
      dueDate: daysFromNow(30), // FUTURE DUE DATE UP TO T+30
      submittedDate: daysFromNow(0),
      status: 'Submitted',
      submittedBy: sarah._id,
      attachedDocumentName: 'INV-2026-032_VFS.pdf',
      attachedDocumentPath: sampleDoc,
      notes: 'Draft submission - Direct facility security & sensor calibration (2-way matching)',
      subDays: 0,
      items: [
        {
          id: 'li-3201',
          description: 'Facility Environmental Sensor Recalibration & Certification',
          quantity: 1,
          unitPrice: 2400,
          total: 2400,
        },
      ],
    },
  ];
};

/**
 * Seeds the database with default demo users, vendors, purchase orders, invoices, and audit entries.
 * Idempotent: skips if users already exist unless options.force is true.
 *
 * @param {Object} [options]
 * @param {boolean} [options.force=false] If true, forces re-seeding even if records exist.
 * @returns {Promise<{ usersCreated: number, vendorsCreated: number, posCreated: number, purchaseOrdersCreated: number, invoicesCreated: number, auditEntriesCreated: number }>}
 */
async function seedDatabase(options = {}) {
  // Ensure sample upload attachment exists on disk for attachment download tests and previews
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const samplePdfPath = path.join(uploadsDir, 'sample-attachment.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    fs.writeFileSync(samplePdfPath, '%PDF-1.4 PayVerify E2E Attachment\n%%EOF');
  }

  const userCount = await User.countDocuments();
  if (userCount > 0 && !options.force) {
    console.log('Users exist; skipping seeding');
    return {
      usersCreated: 0,
      vendorsCreated: 0,
      posCreated: 0,
      purchaseOrdersCreated: 0,
      invoicesCreated: 0,
      auditEntriesCreated: 0,
    };
  }

  if (options.force) {
    await NotificationRead.deleteMany({});
    await AuditEntry.deleteMany({});
    await Invoice.deleteMany({});
    await PurchaseOrder.deleteMany({});
    await Vendor.deleteMany({});
    await User.deleteMany({});
  }

  // 1. Seed Demo Users
  let usersCreated = 0;
  const userMap = new Map();
  for (const userData of DEMO_USERS) {
    const email = userData.email.toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      user = await User.create({
        name: userData.name,
        email,
        passwordHash,
        role: userData.role,
        department: userData.department,
        avatarUrl: userData.avatarUrl,
      });
      usersCreated++;
    }
    userMap.set(user.name, user);
  }

  // 2. Seed Demo Vendors
  let vendorsCreated = 0;
  const vendorMap = new Map();
  for (const vendorData of DEMO_VENDORS) {
    let vendor = await Vendor.findOne({ name: vendorData.name });
    if (!vendor) {
      vendor = await Vendor.create(vendorData);
      vendorsCreated++;
    }
    vendorMap.set(vendor.name, vendor);
  }

  // 3. Seed Demo Purchase Orders
  let purchaseOrdersCreated = 0;
  const poMap = new Map();
  const demoPOs = getDemoPurchaseOrders();
  for (const poData of demoPOs) {
    let po = await PurchaseOrder.findOne({ poNumber: poData.poNumber });
    if (!po) {
      let vendor = vendorMap.get(poData.vendorName);
      if (!vendor) {
        vendor = await Vendor.findOne({ name: poData.vendorName });
      }
      if (vendor) {
        po = await PurchaseOrder.create({
          poNumber: poData.poNumber,
          vendorId: vendor._id,
          amount: poData.amount,
          description: poData.description,
          status: poData.status,
          createdDate: poData.createdDate,
          items: poData.items,
        });
        purchaseOrdersCreated++;
      }
    }
    if (po) {
      poMap.set(po.poNumber, po);
    }
  }

  // 4. Seed Demo Invoices & Audit Entries
  let invoicesCreated = 0;
  let auditEntriesCreated = 0;
  const vendorInvoiceCounts = new Map();

  const alex = userMap.get('Alex Rivera');
  const sarah = userMap.get('Sarah Chen');
  const jordan = userMap.get('Jordan Lee');

  const demoInvoices = getDemoInvoices(vendorMap, poMap, userMap);

  for (const invData of demoInvoices) {
    let invoice = await Invoice.findOne({ invoiceNumber: invData.invoiceNumber });
    if (!invoice) {
      const { subDays, ...invoiceFields } = invData;
      invoice = await Invoice.create(invoiceFields);
      invoicesCreated++;

      // Track vendor invoice count
      const vId = invoice.vendorId.toString();
      vendorInvoiceCounts.set(vId, (vendorInvoiceCounts.get(vId) || 0) + 1);

      // Generate audit entries for status transitions
      const subUser =
        invoice.submittedBy.toString() === alex._id.toString()
          ? alex
          : invoice.submittedBy.toString() === sarah._id.toString()
          ? sarah
          : jordan;

      const auditEntriesToInsert = [];

      // 1. SUBMISSION
      auditEntriesToInsert.push({
        invoiceId: invoice._id,
        action: 'SUBMISSION',
        performedBy: subUser._id,
        timestamp: dateFromNow(subDays, 9, 30),
        details: `Invoice ${invoice.invoiceNumber} submitted by ${subUser.name} for amount ₹${invoice.amount.toLocaleString('en-IN')}`,
      });

      // 2. VERIFICATION (all non-Submitted statuses)
      if (invoice.status !== 'Submitted' && invoice.status !== 'Draft') {
        auditEntriesToInsert.push({
          invoiceId: invoice._id,
          action: 'VERIFICATION',
          performedBy: alex._id,
          timestamp: dateFromNow(subDays, 14, 15),
          details: invoice.poId
            ? `3-way match verification performed by ${alex.name} against purchase order`
            : `2-way match verification performed by ${alex.name} against direct service contract`,
        });
      }

      // 3. APPROVAL (Approved, Payment Scheduled, Paid)
      if (
        invoice.status === 'Approved' ||
        invoice.status === 'Payment Scheduled' ||
        invoice.status === 'Paid'
      ) {
        auditEntriesToInsert.push({
          invoiceId: invoice._id,
          action: 'APPROVAL',
          performedBy: sarah._id,
          timestamp: dateFromNow(subDays + 1, 11, 0),
          details: `Invoice approved by ${sarah.name} following price and quantity verification`,
        });
      }

      // 4. FLAGGED
      if (invoice.status === 'Flagged') {
        auditEntriesToInsert.push({
          invoiceId: invoice._id,
          action: 'FLAGGED',
          performedBy: sarah._id,
          timestamp: dateFromNow(subDays + 1, 10, 30),
          details: `Flagged by ${sarah.name}: ${invoice.flagReason || 'Requires review'}`,
        });
      }

      // 5. PAYMENT_SCHEDULED (Payment Scheduled, Paid)
      if (invoice.status === 'Payment Scheduled' || invoice.status === 'Paid') {
        auditEntriesToInsert.push({
          invoiceId: invoice._id,
          action: 'PAYMENT_SCHEDULED',
          performedBy: alex._id,
          timestamp: dateFromNow(subDays + 2, 15, 0),
          details: `Payment scheduled by ${alex.name} for disbursement on ${invoice.scheduledPaymentDate}`,
        });
      }

      // 6. PAYMENT_COMPLETED (Paid)
      if (invoice.status === 'Paid') {
        auditEntriesToInsert.push({
          invoiceId: invoice._id,
          action: 'PAYMENT_COMPLETED',
          performedBy: alex._id,
          timestamp: new Date(invoice.paidDate ? `${invoice.paidDate}T16:30:00.000Z` : Date.now()),
          details: `Disbursement executed and settled via ACH by ${alex.name} on ${invoice.paidDate}`,
        });
      }

      if (auditEntriesToInsert.length > 0) {
        await AuditEntry.insertMany(auditEntriesToInsert);
        auditEntriesCreated += auditEntriesToInsert.length;
      }
    }
  }

  // Update totalInvoices on vendors
  for (const [vId, count] of vendorInvoiceCounts.entries()) {
    await Vendor.updateOne({ _id: vId }, { $set: { totalInvoices: count } });
  }

  // Pre-seed a few read notifications so user sees realistic read/unread states
  if (jordan) {
    const overdueFirst = await Invoice.findOne({ invoiceNumber: 'INV-2026-004' });
    if (overdueFirst) {
      await NotificationRead.create({
        userId: jordan._id.toString(),
        notificationKey: `notif-overdue-${overdueFirst._id}`,
        readAt: dateFromNow(-14, 10, 0),
      });
    }
  }

  return {
    usersCreated,
    vendorsCreated,
    posCreated: purchaseOrdersCreated,
    purchaseOrdersCreated,
    invoicesCreated,
    auditEntriesCreated,
  };
}

module.exports = { seedDatabase };
