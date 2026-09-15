// src/services/mockApi/purchaseOrders.ts
import { PurchaseOrder } from '../../types';
import { simulateDelay } from './delay';

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-001',
    vendorId: 'vendor-1', // Apex Cloud Services
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
    id: 'po-2',
    poNumber: 'PO-2026-002',
    vendorId: 'vendor-1', // Apex Cloud Services
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
    id: 'po-3',
    poNumber: 'PO-2026-003',
    vendorId: 'vendor-2', // Northwest Logistics
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
    id: 'po-4',
    poNumber: 'PO-2026-004',
    vendorId: 'vendor-2', // Northwest Logistics
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
    id: 'po-5',
    poNumber: 'PO-2026-005',
    vendorId: 'vendor-3', // ByteForce Technologies
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
    id: 'po-6',
    poNumber: 'PO-2026-006',
    vendorId: 'vendor-3', // ByteForce Technologies
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
    id: 'po-7',
    poNumber: 'PO-2026-007',
    vendorId: 'vendor-4', // Summit Creative
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
    id: 'po-8',
    poNumber: 'PO-2026-008',
    vendorId: 'vendor-5', // Pioneer Industrial
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

let purchaseOrdersStore: PurchaseOrder[] = [...INITIAL_PURCHASE_ORDERS];

export const resetPurchaseOrders = (): void => {
  purchaseOrdersStore = [...INITIAL_PURCHASE_ORDERS];
};

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  await simulateDelay();
  return [...purchaseOrdersStore];
};

export const getPurchaseOrderById = async (
  id: string
): Promise<PurchaseOrder | null> => {
  await simulateDelay();
  const po = purchaseOrdersStore.find((p) => p.id === id);
  return po ? { ...po } : null;
};
