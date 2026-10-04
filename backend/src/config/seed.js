const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');

const DEMO_USERS = [
  {
    name: 'Elena Rodriguez',
    email: 'admin@payverify.local',
    password: 'AdminPass123!',
    role: 'Admin',
    department: 'Executive / Administration',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&fit=crop&crop=face',
  },
  {
    name: 'Marcus Vance',
    email: 'approver@payverify.local',
    password: 'ApproverPass123!',
    role: 'Approver',
    department: 'Procurement & Approvals',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&fit=crop&crop=face',
  },
  {
    name: 'Alex Rivera',
    email: 'requester@payverify.local',
    password: 'RequesterPass123!',
    role: 'Requester',
    department: 'Engineering / Facilities',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&fit=crop&crop=face',
  },
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@enterprise.com',
    password: 'SecurePassword123!',
    role: 'Admin',
    department: 'Finance Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&fit=crop&crop=face',
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
];

const DEMO_PURCHASE_ORDERS = [
  {
    poNumber: 'PO-2026-001',
    vendorName: 'Apex Cloud Services',
    amount: 14500,
    description: 'Cloud Infrastructure & Reserved Instances Q3',
    createdDate: '2026-07-01',
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
    createdDate: '2026-07-15',
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
    createdDate: '2026-08-01',
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
    createdDate: '2026-08-10',
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
    createdDate: '2026-08-15',
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
    createdDate: '2026-08-20',
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
    createdDate: '2026-08-25',
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
    createdDate: '2026-09-01',
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
];

/**
 * Seeds the database with default demo users, vendors, and purchase orders.
 * Idempotent: checks for existence before creating records.
 *
 * @param {Object} [options]
 * @param {boolean} [options.force=false] If true, forces seeding even if users exist.
 * @returns {Promise<{ usersCreated: number, vendorsCreated: number, posCreated: number }>}
 */
async function seedDatabase(options = {}) {
  const count = await User.countDocuments();
  if (count > 0 && !options.force) {
    console.log('Users exist; skipping seeding');
    return {
      usersCreated: 0,
      vendorsCreated: 0,
      posCreated: 0,
    };
  }

  // 1. Seed Demo Users
  let usersCreated = 0;
  for (const userData of DEMO_USERS) {
    const email = userData.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (!existing) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      await User.create({
        name: userData.name,
        email,
        passwordHash,
        role: userData.role,
        department: userData.department,
        avatarUrl: userData.avatarUrl,
      });
      usersCreated++;
    }
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
  let posCreated = 0;
  for (const poData of DEMO_PURCHASE_ORDERS) {
    const existing = await PurchaseOrder.findOne({ poNumber: poData.poNumber });
    if (!existing) {
      let vendor = vendorMap.get(poData.vendorName);
      if (!vendor) {
        vendor = await Vendor.findOne({ name: poData.vendorName });
      }
      if (vendor) {
        await PurchaseOrder.create({
          poNumber: poData.poNumber,
          vendorId: vendor._id,
          amount: poData.amount,
          description: poData.description,
          status: poData.status,
          createdDate: poData.createdDate,
          items: poData.items,
        });
        posCreated++;
      }
    }
  }

  return {
    usersCreated,
    vendorsCreated,
    posCreated,
  };
}

module.exports = { seedDatabase };
