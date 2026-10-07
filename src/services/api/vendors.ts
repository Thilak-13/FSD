// src/services/api/vendors.ts
import { Vendor, NewVendorInput } from '../../types';
import { apiFetch, ApiError } from './client';

export const getVendors = async (): Promise<Vendor[]> => {
  return apiFetch<Vendor[]>('/vendors');
};

export const getVendorById = async (id: string): Promise<Vendor | null> => {
  try {
    return await apiFetch<Vendor>(`/vendors/${id}`);
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
};

export const createVendor = async (input: NewVendorInput): Promise<Vendor> => {
  return apiFetch<Vendor>('/vendors', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};
