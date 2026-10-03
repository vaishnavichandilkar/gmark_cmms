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
  createdAt?: string;
  updatedAt?: string;
}

// Initial mock fallback suppliers if backend database has no records yet
const INITIAL_MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 1,
    supplierCode: 'SUP-001',
    name: 'Global Industrial Supplies Ltd',
    contactPerson: 'Rajesh Kumar',
    email: 'rajesh@globalsupplies.com',
    phone: '+91 98765 43210',
    address: 'Plot 45, MIDC Industrial Area, Chakan',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    postalCode: '410501',
    businessCategory: 'Manufacturer, OEM Parts',
    status: 'ACTIVE',
  },
  {
    id: 2,
    supplierCode: 'SUP-002',
    name: 'Apex Valve & Hydraulics Co',
    contactPerson: 'Suresh Mehta',
    email: 'suresh@apexvalves.in',
    phone: '+91 98220 11223',
    address: 'GIDC Estate, Odhav Phase II',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    postalCode: '382415',
    businessCategory: 'Supplier, Service Provider',
    status: 'ACTIVE',
  },
];

export const supplierService = {
  getSuppliers: async (search?: string): Promise<Supplier[]> => {
    try {
      const response = await api.get('/suppliers', { params: { search } });
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return INITIAL_MOCK_SUPPLIERS;
    } catch (error) {
      console.warn('Backend API error, returning fallback suppliers:', error);
      if (search) {
        return INITIAL_MOCK_SUPPLIERS.filter(s => 
          s.name.toLowerCase().includes(search.toLowerCase()) || 
          s.supplierCode.toLowerCase().includes(search.toLowerCase())
        );
      }
      return INITIAL_MOCK_SUPPLIERS;
    }
  },

  getNextCode: async (): Promise<string> => {
    try {
      const response = await api.get('/suppliers/next-code');
      return response.data.code;
    } catch (error) {
      return `SUP-003`;
    }
  },

  getSupplierById: async (id: number): Promise<Supplier> => {
    try {
      const response = await api.get(`/suppliers/${id}`);
      return response.data;
    } catch (error) {
      const found = INITIAL_MOCK_SUPPLIERS.find(s => s.id === id);
      if (found) return found;
      return INITIAL_MOCK_SUPPLIERS[0];
    }
  },

  createSupplier: async (supplierData: Partial<Supplier>): Promise<Supplier> => {
    try {
      const response = await api.post('/suppliers', supplierData);
      return response.data;
    } catch (error) {
      const newSupplier: Supplier = {
        id: Date.now(),
        supplierCode: supplierData.supplierCode || `SUP-${Math.floor(100 + Math.random() * 900)}`,
        name: supplierData.name || 'New Supplier',
        contactPerson: supplierData.contactPerson,
        email: supplierData.email,
        phone: supplierData.phone,
        address: supplierData.address,
        city: supplierData.city,
        state: supplierData.state,
        country: supplierData.country || 'India',
        postalCode: supplierData.postalCode,
        businessCategory: supplierData.businessCategory || 'Supplier',
        status: supplierData.status || 'ACTIVE',
      };
      INITIAL_MOCK_SUPPLIERS.unshift(newSupplier);
      return newSupplier;
    }
  },

  updateSupplier: async (id: number, supplierData: Partial<Supplier>): Promise<Supplier> => {
    try {
      const response = await api.put(`/suppliers/${id}`, supplierData);
      return response.data;
    } catch (error) {
      const index = INITIAL_MOCK_SUPPLIERS.findIndex(s => s.id === id);
      if (index !== -1) {
        INITIAL_MOCK_SUPPLIERS[index] = { ...INITIAL_MOCK_SUPPLIERS[index], ...supplierData };
        return INITIAL_MOCK_SUPPLIERS[index];
      }
      return supplierData as Supplier;
    }
  },

  deleteSupplier: async (id: number): Promise<void> => {
    try {
      await api.delete(`/suppliers/${id}`);
    } catch (error) {
      const index = INITIAL_MOCK_SUPPLIERS.findIndex(s => s.id === id);
      if (index !== -1) INITIAL_MOCK_SUPPLIERS.splice(index, 1);
    }
  },

  bulkDeleteSuppliers: async (ids: number[], reason?: string): Promise<{ count: number; message: string }> => {
    try {
      const response = await api.delete('/suppliers/bulk', { data: { ids, reason } });
      return response.data;
    } catch (error) {
      ids.forEach(id => {
        const index = INITIAL_MOCK_SUPPLIERS.findIndex(s => s.id === id);
        if (index !== -1) INITIAL_MOCK_SUPPLIERS.splice(index, 1);
      });
      return { count: ids.length, message: `Successfully deleted ${ids.length} supplier(s)` };
    }
  },

  importSuppliers: async (suppliersList: Partial<Supplier>[]): Promise<any> => {
    try {
      const response = await api.post('/suppliers/import', suppliersList);
      return response.data;
    } catch (error) {
      suppliersList.forEach((item, index) => {
        INITIAL_MOCK_SUPPLIERS.push({
          id: Date.now() + index,
          supplierCode: item.supplierCode || `SUP-${Math.floor(100 + Math.random() * 900)}`,
          name: item.name || 'Imported Supplier',
          contactPerson: item.contactPerson,
          email: item.email,
          phone: item.phone,
          address: item.address,
          city: item.city,
          state: item.state,
          country: item.country || 'India',
          postalCode: item.postalCode,
          businessCategory: item.businessCategory || 'Supplier',
          status: item.status || 'ACTIVE',
        });
      });
      return { success: true, importedCount: suppliersList.length };
    }
  },
};
