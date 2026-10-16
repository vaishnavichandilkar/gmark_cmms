import { api } from '../lib/api';

export interface Supplier {
  id: number;
  supplierCode: string;
  name: string;
  contactPerson?: string;
  email?: string;
  secondaryEmail?: string;
  phone?: string;
  fax?: string;
  website?: string;
  primaryCurrency?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
  businessCategory?: string;
  businessDescription?: string;
  status?: string;
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const supplierService = {
  getSuppliers: async (search?: string): Promise<Supplier[]> => {
    try {
      const response = await api.get('/suppliers', { params: { search } });
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      throw error;
    }
  },

  getAll: async (search?: string): Promise<Supplier[]> => {
    return supplierService.getSuppliers(search);
  },

  getNextCode: async (): Promise<string> => {
    try {
      const response = await api.get('/suppliers/next-code');
      return response.data.code;
    } catch (error) {
      return `SUP-001`;
    }
  },

  getSupplierById: async (id: number): Promise<Supplier> => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  },

  createSupplier: async (supplierData: Partial<Supplier>): Promise<Supplier> => {
    const response = await api.post('/suppliers', supplierData);
    return response.data;
  },

  updateSupplier: async (id: number, supplierData: Partial<Supplier>): Promise<Supplier> => {
    const response = await api.put(`/suppliers/${id}`, supplierData);
    return response.data;
  },

  deleteSupplier: async (id: number): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },

  bulkDeleteSuppliers: async (ids: number[], reason?: string): Promise<{ count: number; message: string }> => {
    const response = await api.delete('/suppliers/bulk', { data: { ids, reason } });
    return response.data;
  },

  importSuppliers: async (suppliersList: Partial<Supplier>[]): Promise<any> => {
    const response = await api.post('/suppliers/import', suppliersList);
    return response.data;
  },
};
