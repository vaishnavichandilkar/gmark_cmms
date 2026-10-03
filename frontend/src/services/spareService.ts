export interface LocationStock {
  id: string | number;
  location: string;
  inHandQuantity: number;
  atSourceQuantity: number;
  minimumQuantity: number;
  totalStock: number;
}

export interface MachineUsage {
  id: string | number;
  location: string;
  name: string;
  quantityUsed: number;
  rate: number;
  total: number;
}

export interface SpecificationField {
  id: string | number;
  label: string;
  value: string;
}

export interface WarrantyItem {
  id: string | number;
  startDate: string;
  expiryDate: string;
  provider: string;
  usage: string;
  certificateNumber: string;
}

export interface SupplierItem {
  id: string | number;
  name: string;
  businessCategory: string;
  reorderDays: number;
  vendorPrice: number;
}

export interface SpareDocument {
  id: string | number;
  name: string;
  fileType: string;
  uploadDate: string;
  size: string;
}

export interface SpareLogItem {
  id: string | number;
  machineName: string;
  date: string;
  user: string;
  qtyAmount: number;
  rate: number;
}

export interface SparePart {
  id: number;
  partCode: string;
  partName: string;
  category: string;
  subCategory?: string;
  stockQuantity: number;
  inHandQuantity: number;
  atSourceQuantity: number;
  minimumQuantity?: number;
  totalStock?: number;
  unitOfMeasure?: string;
  unitCost: number;
  rate?: number;
  location: string;
  stockLocation?: string;
  description?: string;
  headOfDepartment?: string;
  notes?: string;
  imageUrl?: string;
  qrCode?: string;
  namePlateFile?: string;
  stockLocations?: LocationStock[];
  machinesList?: MachineUsage[];
  customSpecifications?: SpecificationField[];
  specifications?: Record<string, string>;
  warrantiesList?: WarrantyItem[];
  suppliersList?: SupplierItem[];
  documentsList?: SpareDocument[];
  logsList?: SpareLogItem[];
  logs?: { id: string; date: string; user: string; action: string; details: string }[];
}

const STORAGE_KEY = 'gmark_spares_master_data_v3';

const INITIAL_MOCK_SPARES: SparePart[] = [];

function getStoredSpares(): SparePart[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse spares from localStorage', e);
  }
  return [];
}

function saveStoredSpares(spares: SparePart[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spares));
}

export const spareService = {
  async getAll(): Promise<SparePart[]> {
    try {
      const response = await fetch('/api/spare-parts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend fetch failed, falling back to stored spares', err);
    }
    return getStoredSpares();
  },

  async getById(id: number): Promise<SparePart | null> {
    try {
      const response = await fetch(`/api/spare-parts/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Backend getById failed', err);
    }
    const spares = getStoredSpares();
    return spares.find(s => s.id === Number(id)) || null;
  },

  async create(data: Partial<SparePart>): Promise<SparePart> {
    const spares = getStoredSpares();
    const newId = Date.now();
    const newSpare: SparePart = {
      id: newId,
      partCode: data.partCode || `S${Math.floor(10000 + Math.random() * 90000)}`,
      partName: data.partName || '',
      category: data.category || '',
      subCategory: data.subCategory || '',
      stockQuantity: Number(data.stockQuantity ?? 0),
      inHandQuantity: Number(data.inHandQuantity ?? 0),
      atSourceQuantity: Number(data.atSourceQuantity ?? 0),
      minimumQuantity: Number(data.minimumQuantity ?? 0),
      totalStock: Number(data.totalStock ?? 0),
      unitOfMeasure: data.unitOfMeasure || 'PCS',
      unitCost: Number(data.unitCost ?? 0),
      rate: Number(data.rate ?? 0),
      location: data.location || '',
      stockLocation: data.stockLocation || '',
      description: data.description || '',
      headOfDepartment: data.headOfDepartment || '',
      notes: data.notes || '',
      namePlateFile: data.namePlateFile || '',
      stockLocations: data.stockLocations || [],
      machinesList: data.machinesList || [],
      customSpecifications: data.customSpecifications || [],
      warrantiesList: data.warrantiesList || [],
      suppliersList: data.suppliersList || [],
      documentsList: data.documentsList || [],
      logsList: data.logsList || []
    };

    try {
      const response = await fetch('/api/spare-parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(newSpare)
      });
      if (response.ok) {
        const created = await response.json();
        spares.unshift(created);
        saveStoredSpares(spares);
        return created;
      }
    } catch (err) {
      console.warn('Backend create failed, saving to localStorage', err);
    }

    spares.unshift(newSpare);
    saveStoredSpares(spares);
    return newSpare;
  },

  async update(id: number, data: Partial<SparePart>): Promise<SparePart> {
    const spares = getStoredSpares();
    const index = spares.findIndex(s => s.id === Number(id));
    let updatedSpare: SparePart;

    if (index >= 0) {
      updatedSpare = { ...spares[index], ...data };
      spares[index] = updatedSpare;
    } else {
      updatedSpare = { id, ...data } as SparePart;
      spares.push(updatedSpare);
    }
    saveStoredSpares(spares);

    try {
      await fetch(`/api/spare-parts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.warn('Backend update failed', err);
    }

    return updatedSpare;
  },

  async delete(id: number): Promise<boolean> {
    const spares = getStoredSpares().filter(s => s.id !== Number(id));
    saveStoredSpares(spares);
    try {
      await fetch(`/api/spare-parts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
    } catch (err) {
      console.warn('Backend delete failed', err);
    }
    return true;
  }
};
