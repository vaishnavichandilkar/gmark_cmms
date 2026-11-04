import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Pencil, Eye, Truck, Filter, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supplierService, type Supplier } from '../../../services/supplierService';
import { ImportSupplierModal } from './ImportSupplierModal';
import { DeleteSupplierModal } from './DeleteSupplierModal';
import { AddEditSupplierModal } from './AddEditSupplierModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { TableActions, type FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import { ColumnCustomizer } from '../../../components/shared/ColumnCustomizer';
import type { ColumnDefinition } from '../../../components/shared/ColumnCustomizer';

const SUPPLIERS_COLUMNS: ColumnDefinition[] = [
  // General Details
  { id: 'select', label: 'Selection', category: 'General', required: true, defaultVisible: true },
  { id: 'no', label: 'No.', category: 'General', defaultVisible: true },
  { id: 'name', label: 'Supplier Name', category: 'General', required: true, defaultVisible: true },
  { id: 'supplierCode', label: 'Supplier Code', category: 'General', defaultVisible: true },
  { id: 'businessCategory', label: 'Business Category', category: 'General', defaultVisible: false },
  { id: 'businessDescription', label: 'Business Description', category: 'General', defaultVisible: false },
  { id: 'primaryCurrency', label: 'Currency', category: 'General', defaultVisible: false },
  { id: 'gstNumber', label: 'GST Number', category: 'General', defaultVisible: false },
  { id: 'notes', label: 'Notes', category: 'General', defaultVisible: false },

  // Contact
  { id: 'contactPerson', label: 'Contact Person', category: 'Contact', defaultVisible: true },
  { id: 'email', label: 'Email', category: 'Contact', defaultVisible: true },
  { id: 'secondaryEmail', label: 'Secondary Email', category: 'Contact', defaultVisible: false },
  { id: 'phone', label: 'Phone', category: 'Contact', defaultVisible: true },
  { id: 'fax', label: 'Fax', category: 'Contact', defaultVisible: false },
  { id: 'website', label: 'Website', category: 'Contact', defaultVisible: false },

  // Location
  { id: 'address', label: 'Address', category: 'Location', defaultVisible: false },
  { id: 'city', label: 'City', category: 'Location', defaultVisible: true },
  { id: 'state', label: 'State', category: 'Location', defaultVisible: false },
  { id: 'country', label: 'Country', category: 'Location', defaultVisible: false },
  { id: 'postalCode', label: 'Postal Code', category: 'Location', defaultVisible: false },
  { id: 'latitude', label: 'Latitude', category: 'Location', defaultVisible: false },
  { id: 'longitude', label: 'Longitude', category: 'Location', defaultVisible: false },

  // Status & System
  { id: 'status', label: 'Status', category: 'Status', defaultVisible: true },
  { id: 'createdAt', label: 'Date Added', category: 'System', defaultVisible: false },
  { id: 'action', label: 'Action', category: 'General', required: true, defaultVisible: true },
];

const DEFAULT_SUPPLIERS_VISIBLE_COLUMNS = SUPPLIERS_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.id);

export const SuppliersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('suppliers_list_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load visible columns from localStorage', e);
    }
    return DEFAULT_SUPPLIERS_VISIBLE_COLUMNS;
  });

  // Column-wise filters and sorting state
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    name: '',
    supplierCode: '',
    businessCategory: '',
    businessDescription: '',
    primaryCurrency: '',
    gstNumber: '',
    notes: '',
    contactPerson: '',
    email: '',
    secondaryEmail: '',
    phone: '',
    fax: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    latitude: '',
    longitude: '',
    status: '',
    createdAt: '',
  });

  type SupplierSortKey =
    | 'name' | 'supplierCode' | 'businessCategory' | 'businessDescription' | 'primaryCurrency' | 'gstNumber' | 'notes'
    | 'contactPerson' | 'email' | 'secondaryEmail' | 'phone' | 'fax' | 'website'
    | 'address' | 'city' | 'state' | 'country' | 'postalCode' | 'latitude' | 'longitude'
    | 'status' | 'createdAt';

  const [sortConfig, setSortConfig] = useState<{
    key: SupplierSortKey;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await supplierService.getSuppliers(searchQuery);
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters, columnFilters]);

  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery]);

  // Extract unique values for dropdown filters
  const uniqueCities = useMemo(() => {
    const list = new Set<string>();
    suppliers.forEach(s => {
      if (s.city) list.add(s.city);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [suppliers]);

  const uniqueStatuses = useMemo(() => {
    const list = new Set<string>();
    suppliers.forEach(s => {
      if (s.status) list.add(s.status);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [suppliers]);

  const handleColumnFilterChange = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      name: '',
      supplierCode: '',
      businessCategory: '',
      businessDescription: '',
      primaryCurrency: '',
      gstNumber: '',
      notes: '',
      contactPerson: '',
      email: '',
      secondaryEmail: '',
      phone: '',
      fax: '',
      website: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      latitude: '',
      longitude: '',
      status: '',
      createdAt: '',
    });
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => v.trim() !== '').length;
  }, [columnFilters]);

  const hasActiveColumnFilters = activeFilterCount > 0;

  const handleSort = (key: SupplierSortKey) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredSuppliers.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (filteredSuppliers.length === 0) {
      toast.error('No suppliers to export');
      return;
    }

    const columnMap: { id: string; label: string; getValue: (s: Supplier, index: number) => any }[] = [
      { id: 'no', label: 'No.', getValue: (_, index) => index + 1 },
      { id: 'name', label: 'Supplier Name', getValue: s => s.name || '-' },
      { id: 'supplierCode', label: 'Supplier Code', getValue: s => s.supplierCode || '-' },
      { id: 'businessCategory', label: 'Business Category', getValue: s => s.businessCategory || '-' },
      { id: 'businessDescription', label: 'Business Description', getValue: s => s.businessDescription || '-' },
      { id: 'primaryCurrency', label: 'Currency', getValue: s => s.primaryCurrency || '-' },
      { id: 'gstNumber', label: 'GST Number', getValue: s => s.gstNumber || '-' },
      { id: 'notes', label: 'Notes', getValue: s => s.notes || '-' },
      { id: 'contactPerson', label: 'Contact Person', getValue: s => s.contactPerson || '-' },
      { id: 'email', label: 'Email', getValue: s => s.email || '-' },
      { id: 'secondaryEmail', label: 'Secondary Email', getValue: s => s.secondaryEmail || '-' },
      { id: 'phone', label: 'Phone', getValue: s => s.phone || '-' },
      { id: 'fax', label: 'Fax', getValue: s => s.fax || '-' },
      { id: 'website', label: 'Website', getValue: s => s.website || '-' },
      { id: 'address', label: 'Address', getValue: s => s.address || '-' },
      { id: 'city', label: 'City', getValue: s => s.city || '-' },
      { id: 'state', label: 'State', getValue: s => s.state || '-' },
      { id: 'country', label: 'Country', getValue: s => s.country || '-' },
      { id: 'postalCode', label: 'Postal Code', getValue: s => s.postalCode || '-' },
      { id: 'latitude', label: 'Latitude', getValue: s => s.latitude || '-' },
      { id: 'longitude', label: 'Longitude', getValue: s => s.longitude || '-' },
      { id: 'status', label: 'Status', getValue: s => s.status || 'ACTIVE' },
      { id: 'createdAt', label: 'Date Added', getValue: s => s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-' },
    ];

    const activeCols = columnMap.filter(c => visibleColumns.includes(c.id));
    const headers = activeCols.map(c => c.label);
    const rows = filteredSuppliers.map((s, index) => activeCols.map(c => c.getValue(s, index)));

    exportData(headers, rows, 'Suppliers_List', 'Suppliers Directory List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered and sorted suppliers
  const filteredSuppliers = useMemo(() => {
    let result = suppliers.filter((s) => {
      // Active Filters (Customize Filters)
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        if (key === 'city' && (s.city || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'state' && (s.state || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'country' && (s.country || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'businessCategory' && (s.businessCategory || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'status' && (s.status || 'ACTIVE').toLowerCase() !== value.toLowerCase()) return false;
      }
      if (columnFilters.name && !s.name?.toLowerCase().includes(columnFilters.name.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.supplierCode && !s.supplierCode?.toLowerCase().includes(columnFilters.supplierCode.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.businessCategory && !s.businessCategory?.toLowerCase().includes(columnFilters.businessCategory.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.businessDescription && !s.businessDescription?.toLowerCase().includes(columnFilters.businessDescription.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.primaryCurrency && !s.primaryCurrency?.toLowerCase().includes(columnFilters.primaryCurrency.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.gstNumber && !s.gstNumber?.toLowerCase().includes(columnFilters.gstNumber.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.notes && !s.notes?.toLowerCase().includes(columnFilters.notes.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.contactPerson && !s.contactPerson?.toLowerCase().includes(columnFilters.contactPerson.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.email && !s.email?.toLowerCase().includes(columnFilters.email.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.secondaryEmail && !s.secondaryEmail?.toLowerCase().includes(columnFilters.secondaryEmail.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.phone && !s.phone?.toLowerCase().includes(columnFilters.phone.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.fax && !s.fax?.toLowerCase().includes(columnFilters.fax.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.website && !s.website?.toLowerCase().includes(columnFilters.website.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.address && !s.address?.toLowerCase().includes(columnFilters.address.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.city && s.city?.toLowerCase() !== columnFilters.city.toLowerCase().trim()) {
        return false;
      }
      if (columnFilters.state && !s.state?.toLowerCase().includes(columnFilters.state.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.country && !s.country?.toLowerCase().includes(columnFilters.country.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.postalCode && !s.postalCode?.toLowerCase().includes(columnFilters.postalCode.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.latitude && !s.latitude?.toLowerCase().includes(columnFilters.latitude.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.longitude && !s.longitude?.toLowerCase().includes(columnFilters.longitude.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.status && (s.status || 'ACTIVE').toLowerCase() !== columnFilters.status.toLowerCase().trim()) {
        return false;
      }
      if (columnFilters.createdAt) {
        const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '';
        if (!dateStr.includes(columnFilters.createdAt.trim())) return false;
      }
      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aVal = (a[sortConfig.key] || '').toString().toLowerCase();
        let bVal = (b[sortConfig.key] || '').toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [suppliers, activeFilters, columnFilters, sortConfig]);

  const citiesList = useMemo(() => Array.from(new Set(suppliers.map((s) => s.city).filter(Boolean))).sort(), [suppliers]);
  const statesList = useMemo(() => Array.from(new Set(suppliers.map((s) => s.state).filter(Boolean))).sort(), [suppliers]);
  const countriesList = useMemo(() => Array.from(new Set(suppliers.map((s) => s.country).filter(Boolean))).sort(), [suppliers]);
  const categoriesList = useMemo(() => Array.from(new Set(suppliers.map((s) => s.businessCategory).filter(Boolean))).sort(), [suppliers]);

  // Dynamic Filters for Customize Filters modal
  const filterOptions: FilterOption[] = useMemo(() => [
    ...(categoriesList.length > 0 ? [{
      key: 'businessCategory',
      label: 'Business Category',
      options: categoriesList.map(c => ({ label: String(c), value: String(c) }))
    }] : []),
    {
      key: 'status',
      label: 'Status',
      options: ['ACTIVE', 'INACTIVE']
    },
    ...(citiesList.length > 0 ? [{
      key: 'city',
      label: 'City',
      options: citiesList.map(c => ({ label: String(c), value: String(c) }))
    }] : []),
    ...(statesList.length > 0 ? [{
      key: 'state',
      label: 'State',
      options: statesList.map(s => ({ label: String(s), value: String(s) }))
    }] : []),
    ...(countriesList.length > 0 ? [{
      key: 'country',
      label: 'Country',
      options: countriesList.map(c => ({ label: String(c), value: String(c) }))
    }] : []),
  ], [categoriesList, citiesList, statesList, countriesList]);

  const totalItems = filteredSuppliers.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Table Actions Toolbar in One Row */}
      <TableActions
        title="Suppliers Management"
        subtitle="Centralized directory of vendors, suppliers, and procurement partners"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search suppliers by name, code, contact, city..."
        onImport={() => setIsImportModalOpen(true)}
        onExport={handleExport}
        onPrint={handlePrint}
        columnCustomizer={
          <ColumnCustomizer
            columns={SUPPLIERS_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="suppliers_list_table_columns"
          />
        }
        hasActiveColumnFilters={hasActiveColumnFilters}
        onResetColumnFilters={clearAllColumnFilters}
        activeColumnFilterCount={activeFilterCount}
        extraActions={
          selectedIds.length > 0 && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 h-9 px-3 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer shadow-xs shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )
        }
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        actionButton={
          <button 
            onClick={() => navigate('/suppliers/new')}
            className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#00a651] hover:bg-[#009040] active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
        }
      />

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider whitespace-nowrap">
              {/* Column Title Row - Tapping main columns toggles filter row */}
              <tr 
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="cursor-pointer select-none hover:bg-slate-100/60 transition-colors whitespace-nowrap"
                title={showColumnFilters ? "Click column header to hide filters" : "Click column header to show filters"}
              >
                {visibleColumns.includes('select') && (
                  <th className="px-4 py-3.5 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={currentSuppliers.length > 0 && selectedIds.length === currentSuppliers.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                {visibleColumns.includes('no') && (
                  <th className="px-5 py-3.5 select-none">No.</th>
                )}
                
                {visibleColumns.includes('name') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Supplier Name</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('name');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Supplier Name"
                      >
                        {sortConfig?.key === 'name' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('supplierCode') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Supplier Code</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('supplierCode');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Supplier Code"
                      >
                        {sortConfig?.key === 'supplierCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('businessCategory') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('businessCategory');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Category"
                      >
                        {sortConfig?.key === 'businessCategory' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('businessDescription') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Description</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('businessDescription');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Description"
                      >
                        {sortConfig?.key === 'businessDescription' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('primaryCurrency') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Currency</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('primaryCurrency');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Currency"
                      >
                        {sortConfig?.key === 'primaryCurrency' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('gstNumber') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>GST Number</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('gstNumber');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by GST Number"
                      >
                        {sortConfig?.key === 'gstNumber' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('notes') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Notes</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('notes');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Notes"
                      >
                        {sortConfig?.key === 'notes' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('contactPerson') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Contact Person</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('contactPerson');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Contact Person"
                      >
                        {sortConfig?.key === 'contactPerson' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('email') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Email</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('email');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Email"
                      >
                        {sortConfig?.key === 'email' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('secondaryEmail') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Sec Email</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('secondaryEmail');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Secondary Email"
                      >
                        {sortConfig?.key === 'secondaryEmail' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('phone') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Phone</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('phone');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Phone"
                      >
                        {sortConfig?.key === 'phone' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('fax') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Fax</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('fax');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Fax"
                      >
                        {sortConfig?.key === 'fax' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('website') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Website</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('website');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Website"
                      >
                        {sortConfig?.key === 'website' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('address') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Address</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('address');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Address"
                      >
                        {sortConfig?.key === 'address' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('city') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>City</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('city');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by City"
                      >
                        {sortConfig?.key === 'city' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('state') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>State</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('state');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by State"
                      >
                        {sortConfig?.key === 'state' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('country') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Country</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('country');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Country"
                      >
                        {sortConfig?.key === 'country' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('postalCode') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Postal Code</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('postalCode');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Postal Code"
                      >
                        {sortConfig?.key === 'postalCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('latitude') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Latitude</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('latitude');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Latitude"
                      >
                        {sortConfig?.key === 'latitude' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('longitude') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Longitude</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('longitude');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Longitude"
                      >
                        {sortConfig?.key === 'longitude' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('status') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('status');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Status"
                      >
                        {sortConfig?.key === 'status' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('createdAt') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Date Added</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('createdAt');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Date Added"
                      >
                        {sortConfig?.key === 'createdAt' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('action') && (
                  <th className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Action</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowColumnFilters(!showColumnFilters);
                        }}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                          showColumnFilters 
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                        title={showColumnFilters ? 'Click to hide column filters' : 'Click to show column filters'}
                      >
                        <Filter size={10} className={hasActiveColumnFilters ? 'text-blue-600' : 'text-gray-500'} />
                        <span>{showColumnFilters ? 'Hide' : 'Filter'}</span>
                      </button>
                    </div>
                  </th>
                )}
              </tr>

              {/* Column Filters Row */}
              {showColumnFilters && (
                <tr className="bg-blue-50/40 border-t border-blue-100/60 lowercase normal-case tracking-normal">
                  {visibleColumns.includes('select') && (
                    <th className="px-4 py-2 font-normal"></th>
                  )}
                  {visibleColumns.includes('no') && (
                    <th className="px-5 py-2 font-normal"></th>
                  )}

                  {/* Supplier Name Filter */}
                  {visibleColumns.includes('name') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.name}
                          onChange={(e) => handleColumnFilterChange('name', e.target.value)}
                          placeholder="Filter name..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.name && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('name', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Supplier Code Filter */}
                  {visibleColumns.includes('supplierCode') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.supplierCode}
                          onChange={(e) => handleColumnFilterChange('supplierCode', e.target.value)}
                          placeholder="Filter code..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.supplierCode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('supplierCode', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Business Category Filter */}
                  {visibleColumns.includes('businessCategory') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.businessCategory}
                        onChange={(e) => handleColumnFilterChange('businessCategory', e.target.value)}
                        placeholder="Filter category..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Business Description Filter */}
                  {visibleColumns.includes('businessDescription') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.businessDescription}
                        onChange={(e) => handleColumnFilterChange('businessDescription', e.target.value)}
                        placeholder="Filter desc..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Currency Filter */}
                  {visibleColumns.includes('primaryCurrency') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.primaryCurrency}
                        onChange={(e) => handleColumnFilterChange('primaryCurrency', e.target.value)}
                        placeholder="Filter currency..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* GST Number Filter */}
                  {visibleColumns.includes('gstNumber') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.gstNumber}
                        onChange={(e) => handleColumnFilterChange('gstNumber', e.target.value)}
                        placeholder="Filter GST..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Notes Filter */}
                  {visibleColumns.includes('notes') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.notes}
                        onChange={(e) => handleColumnFilterChange('notes', e.target.value)}
                        placeholder="Filter notes..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Contact Person Filter */}
                  {visibleColumns.includes('contactPerson') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.contactPerson}
                          onChange={(e) => handleColumnFilterChange('contactPerson', e.target.value)}
                          placeholder="Filter person..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.contactPerson && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('contactPerson', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Email Filter */}
                  {visibleColumns.includes('email') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.email}
                          onChange={(e) => handleColumnFilterChange('email', e.target.value)}
                          placeholder="Filter email..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.email && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('email', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Secondary Email Filter */}
                  {visibleColumns.includes('secondaryEmail') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.secondaryEmail}
                        onChange={(e) => handleColumnFilterChange('secondaryEmail', e.target.value)}
                        placeholder="Filter sec email..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Phone Filter */}
                  {visibleColumns.includes('phone') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.phone}
                          onChange={(e) => handleColumnFilterChange('phone', e.target.value)}
                          placeholder="Filter phone..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.phone && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('phone', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Fax Filter */}
                  {visibleColumns.includes('fax') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.fax}
                        onChange={(e) => handleColumnFilterChange('fax', e.target.value)}
                        placeholder="Filter fax..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Website Filter */}
                  {visibleColumns.includes('website') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.website}
                        onChange={(e) => handleColumnFilterChange('website', e.target.value)}
                        placeholder="Filter website..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Address Filter */}
                  {visibleColumns.includes('address') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.address}
                        onChange={(e) => handleColumnFilterChange('address', e.target.value)}
                        placeholder="Filter address..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* City Filter */}
                  {visibleColumns.includes('city') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.city}
                          onChange={(e) => handleColumnFilterChange('city', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs"
                        >
                          <option value="">All Cities</option>
                          {uniqueCities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {columnFilters.city && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('city', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* State Filter */}
                  {visibleColumns.includes('state') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.state}
                        onChange={(e) => handleColumnFilterChange('state', e.target.value)}
                        placeholder="Filter state..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Country Filter */}
                  {visibleColumns.includes('country') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.country}
                        onChange={(e) => handleColumnFilterChange('country', e.target.value)}
                        placeholder="Filter country..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Postal Code Filter */}
                  {visibleColumns.includes('postalCode') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.postalCode}
                        onChange={(e) => handleColumnFilterChange('postalCode', e.target.value)}
                        placeholder="Filter postal..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Latitude Filter */}
                  {visibleColumns.includes('latitude') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.latitude}
                        onChange={(e) => handleColumnFilterChange('latitude', e.target.value)}
                        placeholder="Filter lat..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Longitude Filter */}
                  {visibleColumns.includes('longitude') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.longitude}
                        onChange={(e) => handleColumnFilterChange('longitude', e.target.value)}
                        placeholder="Filter lng..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Status Filter */}
                  {visibleColumns.includes('status') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.status}
                          onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs"
                        >
                          <option value="">All Statuses</option>
                          {uniqueStatuses.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {columnFilters.status && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('status', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Date Added Filter */}
                  {visibleColumns.includes('createdAt') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.createdAt}
                        onChange={(e) => handleColumnFilterChange('createdAt', e.target.value)}
                        placeholder="Filter date..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {visibleColumns.includes('action') && (
                    <th className="px-3 py-2 font-normal text-right">
                      {hasActiveColumnFilters && (
                        <button
                          type="button"
                          onClick={clearAllColumnFilters}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </th>
                  )}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton columns={visibleColumns.length} rows={5} />
              ) : currentSuppliers.length > 0 ? (
                currentSuppliers.map((supplier, index) => {
                  const isSelected = selectedIds.includes(supplier.id);
                  return (
                    <tr
                      key={supplier.id}
                      onClick={() => navigate(`/suppliers/edit/${supplier.id}`, { state: { tab: 'General' } })}
                      className={`hover:bg-blue-50/40 transition-colors group cursor-pointer ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {visibleColumns.includes('select') && (
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(supplier.id)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      {visibleColumns.includes('no') && (
                        <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">
                          {startIndex + index + 1}
                        </td>
                      )}
                      {visibleColumns.includes('name') && (
                        <td className="px-5 py-3.5 font-semibold text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                          {supplier.name}
                        </td>
                      )}
                      {visibleColumns.includes('supplierCode') && (
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {supplier.supplierCode ? (
                            <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                              {supplier.supplierCode}
                            </span>
                          ) : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('businessCategory') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                          {supplier.businessCategory || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('businessDescription') && (
                        <td className="px-5 py-3.5 text-slate-600 max-w-[200px] truncate" title={supplier.businessDescription || ''}>
                          {supplier.businessDescription || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('primaryCurrency') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-700">
                          {supplier.primaryCurrency || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('gstNumber') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-700">
                          {supplier.gstNumber || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('notes') && (
                        <td className="px-5 py-3.5 text-slate-600 max-w-[200px] truncate" title={supplier.notes || ''}>
                          {supplier.notes || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('contactPerson') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                          {supplier.contactPerson || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('email') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                          {supplier.email || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('secondaryEmail') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                          {supplier.secondaryEmail || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('phone') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 font-mono text-xs">
                          {supplier.phone || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('fax') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 font-mono text-xs">
                          {supplier.fax || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('website') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-blue-600 truncate max-w-[150px]">
                          {supplier.website ? (
                            <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">
                              {supplier.website}
                            </a>
                          ) : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('address') && (
                        <td className="px-5 py-3.5 text-slate-600 max-w-[200px] truncate" title={supplier.address || ''}>
                          {supplier.address || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('city') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                          {supplier.city || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('state') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                          {supplier.state || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('country') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                          {supplier.country || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('postalCode') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                          {supplier.postalCode || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('latitude') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                          {supplier.latitude || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('longitude') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                          {supplier.longitude || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                            supplier.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                              : 'bg-slate-100 text-slate-700 border border-slate-200/70'
                          }`}>
                            {supplier.status || 'ACTIVE'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('createdAt') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                          {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('action') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/suppliers/edit/${supplier.id}`, { state: { tab: 'General' } })}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                              title="View Supplier"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/suppliers/edit/${supplier.id}`, { state: { tab: 'General' } })}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIds([supplier.id]);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-slate-500 bg-slate-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                        <Truck className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-900 mb-1">No suppliers found</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {hasActiveColumnFilters
                          ? 'No suppliers match the current filter criteria.'
                          : 'Get started by adding a new supplier or vendor to the system.'}
                      </p>
                      {hasActiveColumnFilters && (
                        <button
                          type="button"
                          onClick={clearAllColumnFilters}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                        >
                          Clear Column Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>

      {/* Modals */}
      <ImportSupplierModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchSuppliers}
      />

      <DeleteSupplierModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedIds([]);
        }}
        onSuccess={() => {
          fetchSuppliers();
          setSelectedIds([]);
        }}
        selectedIds={selectedIds}
      />

      <AddEditSupplierModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setSupplierToEdit(null);
        }}
        onSuccess={fetchSuppliers}
        supplierToEdit={supplierToEdit}
      />
    </div>
  );
};
