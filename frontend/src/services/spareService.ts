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

const INITIAL_MOCK_SPARES: SparePart[] = [
  {
    id: 1,
    partCode: 'S32156',
    partName: 'New Spare S1',
    category: 'Spare Category',
    subCategory: 'Spare Sub-Category',
    stockQuantity: 20,
    inHandQuantity: 23,
    atSourceQuantity: 22,
    minimumQuantity: 10,
    totalStock: 45,
    unitOfMeasure: 'PCS',
    unitCost: 23.00,
    rate: 23.00,
    location: 'Location 1',
    stockLocation: 'Location 1',
    description: 'Description',
    headOfDepartment: 'Select',
    notes: 'Notes',
    namePlateFile: 'Filename.pdf',
    stockLocations: [
      { id: '1', location: 'Location', inHandQuantity: 23, atSourceQuantity: 23, minimumQuantity: 23, totalStock: 23 },
      { id: '2', location: 'Location', inHandQuantity: 23, atSourceQuantity: 23, minimumQuantity: 23, totalStock: 23 },
      { id: '3', location: 'Location', inHandQuantity: 23, atSourceQuantity: 23, minimumQuantity: 23, totalStock: 23 },
    ],
    machinesList: [
      { id: '1', location: 'Facility Name', name: 'Machine Name', quantityUsed: 23, rate: 1000, total: 23000 },
      { id: '2', location: 'Facility Name', name: 'Machine Name', quantityUsed: 23, rate: 1000, total: 23000 },
      { id: '3', location: 'Facility Name', name: 'Machine Name', quantityUsed: 23, rate: 1000, total: 23000 },
      { id: '4', location: 'Facility Name', name: 'Machine Name', quantityUsed: 23, rate: 1000, total: 23000 },
      { id: '5', location: 'Facility Name', name: 'Machine Name', quantityUsed: 23, rate: 1000, total: 23000 },
      { id: '6', location: 'Facility Name', name: 'Machine Name', quantityUsed: 23, rate: 1000, total: 23000 },
    ],
    customSpecifications: [
      { id: '1', label: 'Material Grade', value: 'Stainless Steel 316' }
    ],
    warrantiesList: [
      { id: '1', startDate: 'dd-mm-yyyy', expiryDate: 'dd-mm-yyyy', provider: 'Manufacturer Name', usage: 'Meter Reading', certificateNumber: 'C2451s5' },
      { id: '2', startDate: 'dd-mm-yyyy', expiryDate: 'dd-mm-yyyy', provider: 'Manufacturer Name', usage: 'Meter Reading', certificateNumber: 'C2451s5' },
      { id: '3', startDate: 'dd-mm-yyyy', expiryDate: 'dd-mm-yyyy', provider: 'Manufacturer Name', usage: 'Meter Reading', certificateNumber: 'C2451s5' },
      { id: '4', startDate: 'dd-mm-yyyy', expiryDate: 'dd-mm-yyyy', provider: 'Manufacturer Name', usage: 'Meter Reading', certificateNumber: 'C2451s5' },
      { id: '5', startDate: 'dd-mm-yyyy', expiryDate: 'dd-mm-yyyy', provider: 'Manufacturer Name', usage: 'Meter Reading', certificateNumber: 'C2451s5' },
      { id: '6', startDate: 'dd-mm-yyyy', expiryDate: 'dd-mm-yyyy', provider: 'Manufacturer Name', usage: 'Meter Reading', certificateNumber: 'C2451s5' },
    ],
    suppliersList: [
      { id: '1', name: 'Global Supplier', businessCategory: 'OEM Parts', reorderDays: 7, vendorPrice: 1000 }
    ],
    documentsList: [
      { id: '1', name: 'Technical_Specification.pdf', fileType: 'PDF Document', uploadDate: '2026-09-28', size: '1.2 MB' }
    ],
    logsList: [
      { id: '1', machineName: 'Primary Booster Pump', date: '2026-09-28 10:00', user: 'Admin User', qtyAmount: 23, rate: 1000 },
      { id: '2', machineName: 'Secondary Booster Pump', date: '2026-09-27 15:30', user: 'Technician User', qtyAmount: 10, rate: 1000 },
      { id: '3', machineName: 'Flushing System Pump', date: '2026-09-25 09:15', user: 'Supervisor User', qtyAmount: 5, rate: 1000 },
    ]
  },
  {
    id: 2,
    partCode: 'SP-BRG-001',
    partName: 'Heavy Duty Ball Bearing 6205-2RS',
    category: 'Mechanical',
    subCategory: 'Bearings',
    stockQuantity: 45,
    inHandQuantity: 45,
    atSourceQuantity: 10,
    minimumQuantity: 15,
    totalStock: 55,
    unitOfMeasure: 'PCS',
    unitCost: 1250.00,
    rate: 1250.00,
    location: 'Bin A-12',
    stockLocation: 'Main Store - Rack 3',
    description: 'Deep groove ball bearing for pump shaft assembly.',
    headOfDepartment: 'Mechanical Department',
    notes: 'Keep lubricated with high-temp grease.',
    stockLocations: [
      { id: '1', location: 'Main Store - Rack 3', inHandQuantity: 45, atSourceQuantity: 10, minimumQuantity: 15, totalStock: 55 }
    ]
  }
];

function getStoredSpares(): SparePart[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse spares from localStorage', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_SPARES));
  return INITIAL_MOCK_SPARES;
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
        if (Array.isArray(data) && data.length > 0) {
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
    return spares.find(s => s.id === Number(id)) || spares[0] || null;
  },

  async create(data: Partial<SparePart>): Promise<SparePart> {
    const spares = getStoredSpares();
    const newId = Date.now();
    const newSpare: SparePart = {
      id: newId,
      partCode: data.partCode || `S${Math.floor(10000 + Math.random() * 90000)}`,
      partName: data.partName || 'New Spare',
      category: data.category || 'Spare Category',
      subCategory: data.subCategory || 'Spare Sub-Category',
      stockQuantity: Number(data.stockQuantity ?? 20),
      inHandQuantity: Number(data.inHandQuantity ?? 23),
      atSourceQuantity: Number(data.atSourceQuantity ?? 22),
      minimumQuantity: Number(data.minimumQuantity ?? 10),
      totalStock: Number(data.totalStock ?? 45),
      unitOfMeasure: data.unitOfMeasure || 'PCS',
      unitCost: Number(data.unitCost ?? 23.00),
      rate: Number(data.rate ?? 23.00),
      location: data.location || 'Location 1',
      stockLocation: data.stockLocation || 'Location 1',
      description: data.description || '',
      headOfDepartment: data.headOfDepartment || '',
      notes: data.notes || '',
      namePlateFile: data.namePlateFile || 'Filename.pdf',
      stockLocations: data.stockLocations || [
        { id: '1', location: 'Location', inHandQuantity: 23, atSourceQuantity: 23, minimumQuantity: 23, totalStock: 23 },
        { id: '2', location: 'Location', inHandQuantity: 23, atSourceQuantity: 23, minimumQuantity: 23, totalStock: 23 },
        { id: '3', location: 'Location', inHandQuantity: 23, atSourceQuantity: 23, minimumQuantity: 23, totalStock: 23 }
      ],
      machinesList: data.machinesList || [
        { id: '1', location: 'Facility Name', name: 'Machine Name', quantityUsed: 23, rate: 1000, total: 23000 },
        { id: '2', location: 'Facility Name', name: 'Machine Name', quantityUsed: 23, rate: 1000, total: 23000 }
      ],
      customSpecifications: data.customSpecifications || [
        { id: '1', label: 'Material Grade', value: 'Stainless Steel 316' }
      ],
      warrantiesList: data.warrantiesList || [
        { id: '1', startDate: 'dd-mm-yyyy', expiryDate: 'dd-mm-yyyy', provider: 'Manufacturer Name', usage: 'Meter Reading', certificateNumber: 'C2451s5' }
      ],
      suppliersList: data.suppliersList || [],
      documentsList: data.documentsList || [],
      logsList: data.logsList || [
        { id: '1', machineName: 'Primary Booster Pump', date: new Date().toLocaleString(), user: 'Admin User', qtyAmount: 23, rate: 1000 }
      ]
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
