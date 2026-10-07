// src/services/api/purchaseOrders.ts
import { PurchaseOrder } from '../../types';
import { apiFetch, ApiError } from './client';

export const getPurchaseOrders = async (
  vendorId?: string
): Promise<PurchaseOrder[]> => {
  const query = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : '';
  return apiFetch<PurchaseOrder[]>(`/purchase-orders${query}`);
};

export const getPurchaseOrderById = async (
  id: string
): Promise<PurchaseOrder | null> => {
  try {
    return await apiFetch<PurchaseOrder>(`/purchase-orders/${id}`);
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
};
