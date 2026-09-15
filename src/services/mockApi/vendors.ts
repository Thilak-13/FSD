// src/services/mockApi/vendors.ts
import { Vendor, NewVendorInput } from '../../types';
import { simulateDelay } from './delay';

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'vendor-1',
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
    id: 'vendor-2',
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
    id: 'vendor-3',
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
    id: 'vendor-4',
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
    id: 'vendor-5',
    name: 'Pioneer Industrial',
    contactEmail: 'finance@pioneerind.com',
    paymentTerms: 'Net 60',
    address: '4500 Manufacturing Blvd, Detroit, MI 48201',
    taxId: '38-6543219',
    status: 'Active',
    phone: '+1 (313) 555-0177',
    totalInvoices: 2,
  },
];

let vendorsStore: Vendor[] = [...INITIAL_VENDORS];

export const resetVendors = (): void => {
  vendorsStore = [...INITIAL_VENDORS];
};

export const getVendors = async (): Promise<Vendor[]> => {
  await simulateDelay();
  return [...vendorsStore];
};

export const getVendorById = async (id: string): Promise<Vendor | null> => {
  await simulateDelay();
  const vendor = vendorsStore.find((v) => v.id === id);
  return vendor ? { ...vendor } : null;
};

export const createVendor = async (input: NewVendorInput): Promise<Vendor> => {
  await simulateDelay();
  const newVendor: Vendor = {
    id: `vendor-${Date.now()}`,
    name: input.name,
    contactEmail: input.contactEmail,
    paymentTerms: input.paymentTerms,
    address: input.address,
    taxId: input.taxId,
    status: input.status || 'Active',
    phone: input.phone,
    totalInvoices: 0,
  };
  vendorsStore = [newVendor, ...vendorsStore];
  return { ...newVendor };
};

export const updateVendor = async (
  id: string,
  updates: Partial<Vendor>
): Promise<Vendor> => {
  await simulateDelay();
  const index = vendorsStore.findIndex((v) => v.id === id);
  if (index === -1) {
    throw new Error(`Vendor with id ${id} not found`);
  }
  const updated: Vendor = {
    ...vendorsStore[index],
    ...updates,
  };
  vendorsStore[index] = updated;
  return { ...updated };
};
