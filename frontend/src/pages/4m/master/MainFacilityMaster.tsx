import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Building2, Eye, Trash2, Filter, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { DeleteConfirmModal } from '../../../components/shared/DeleteConfirmModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import toast from 'react-hot-toast';
import { TableActions } from '../../../components/shared/TableActions';
import type { FilterOption } from '../../../components/shared/TableActions';
import { ImportModal } from '../../../components/shared/ImportModal';
import type { ImportConfig } from '../../../components/shared/ImportModal';
import { exportData } from '../../../utils/exportUtils';
import { ColumnCustomizer } from '../../../components/shared/ColumnCustomizer';
import type { ColumnDefinition } from '../../../components/shared/ColumnCustomizer';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission, hasAssetPermission } from '../../../utils/permissions';

const MAIN_FACILITY_COLUMNS: ColumnDefinition[] = [
  { id: 'no', label: 'No.', category: 'General', defaultVisible: false },
  { id: 'mainFacilityCode', label: 'Facility Code', category: 'General', required: true, defaultVisible: true },
  { id: 'mainFacilityName', label: 'Facility Name', category: 'General', required: true, defaultVisible: true },
  { id: 'mainFacilityHead', label: 'Facility Head', category: 'General', defaultVisible: true },
  { id: 'gstNumber', label: 'GST Number', category: 'Details', defaultVisible: true },
  { id: 'category', label: 'Category', category: 'Classification', defaultVisible: true },
  { id: 'subcategory', label: 'Subcategory', category: 'Classification', defaultVisible: false },
  { id: 'status', label: 'Status', category: 'Status', defaultVisible: true },
  { id: 'address', label: 'Address', category: 'Location', defaultVisible: false },
  { id: 'city', label: 'City', category: 'Location', defaultVisible: false },
  { id: 'state', label: 'State', category: 'Location', defaultVisible: false },
  { id: 'country', label: 'Country', category: 'Location', defaultVisible: false },
  { id: 'postalCode', label: 'Postal Code', category: 'Location', defaultVisible: false },
  { id: 'latitude', label: 'Latitude', category: 'Geo Coordinates', defaultVisible: false },
  { id: 'longitude', label: 'Longitude', category: 'Geo Coordinates', defaultVisible: false },
  { id: 'description', label: 'Description', category: 'Details', defaultVisible: false },
  { id: 'actions', label: 'Actions', category: 'General', required: true, defaultVisible: true },
];

const DEFAULT_MAIN_FACILITY_VISIBLE_COLUMNS = MAIN_FACILITY_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.id);

export function MainFacilityMaster() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const canCreate = hasPermission(user, 'master_main_facility', 'create');
  const canEdit = hasPermission(user, 'master_main_facility', 'edit');
  const canDelete = hasPermission(user, 'master_main_facility', 'delete');
  const canExport = hasPermission(user, 'master_main_facility', 'export');
  const canPrint = hasPermission(user, 'master_main_facility', 'print');
  const canImport = hasPermission(user, 'master_main_facility', 'import');

  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<any[]>([]);

  const permittedFacilities = useMemo(() => {
    return facilities.filter(f => hasAssetPermission(user, f, 'view'));
  }, [facilities, user]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('main_facility_master_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load visible columns from localStorage', e);
    }
    return DEFAULT_MAIN_FACILITY_VISIBLE_COLUMNS;
  });

  // Column-wise filters and sorting state
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    mainFacilityCode: '',
    mainFacilityName: '',
    mainFacilityHead: '',
    gstNumber: '',
    category: '',
    subcategory: '',
    status: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    latitude: '',
    longitude: '',
    description: '',
  });

  const [sortConfig, setSortConfig] = useState<{
    key: 'mainFacilityCode' | 'mainFacilityName' | 'mainFacilityHead' | 'gstNumber' | 'category' | 'subcategory' | 'status' | 'address' | 'city' | 'state' | 'country' | 'postalCode' | 'latitude' | 'longitude' | 'description';
    direction: 'asc' | 'desc';
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters, columnFilters]);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/main-facilities');
      setFacilities(response.data);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setFacilityToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (facilityToDelete === null) return;
    try {
      await api.delete(`/main-facilities/${facilityToDelete}`);
      setDeleteModalOpen(false);
      setFacilityToDelete(null);
      fetchFacilities();
    } catch (error) {
      console.error('Failed to delete facility:', error);
      toast.error('Failed to delete facility.');
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    const columnMap: { id: string; label: string; getValue: (f: any, idx: number) => string }[] = [
      { id: 'no', label: 'No.', getValue: (_f, idx) => (idx + 1).toString() },
      { id: 'mainFacilityCode', label: 'Facility Code', getValue: f => f.mainFacilityCode || '-' },
      { id: 'mainFacilityName', label: 'Facility Name', getValue: f => f.mainFacilityName || '-' },
      { id: 'mainFacilityHead', label: 'Facility Head', getValue: f => f.mainFacilityHead || '-' },
      { id: 'gstNumber', label: 'GST Number', getValue: f => f.gstNumber || '-' },
      { id: 'category', label: 'Category', getValue: f => f.category || '-' },
      { id: 'subcategory', label: 'Subcategory', getValue: f => f.subcategory || '-' },
      { id: 'status', label: 'Status', getValue: f => f.status || '-' },
      { id: 'address', label: 'Address', getValue: f => f.address || '-' },
      { id: 'city', label: 'City', getValue: f => f.city || '-' },
      { id: 'state', label: 'State', getValue: f => f.state || '-' },
      { id: 'country', label: 'Country', getValue: f => f.country || '-' },
      { id: 'postalCode', label: 'Postal Code', getValue: f => f.postalCode || '-' },
      { id: 'latitude', label: 'Latitude', getValue: f => f.latitude || '-' },
      { id: 'longitude', label: 'Longitude', getValue: f => f.longitude || '-' },
      { id: 'description', label: 'Description', getValue: f => f.description || '-' },
    ];

    const activeCols = columnMap.filter(c => visibleColumns.includes(c.id));
    const headers = activeCols.map(c => c.label);
    const rows = filteredFacilities.map((facility, idx) => activeCols.map(c => c.getValue(facility, idx)));
    exportData(headers, rows, 'Main_Facility_List', 'Main Facility Master List', format);
  };

  const handleImportData = async (data: any[]) => {
    for (const row of data) {
      const payload = {
        mainFacilityCode: row['Facility Code'] || row['mainFacilityCode'] || '',
        mainFacilityName: row['Facility Name'] || row['mainFacilityName'] || '',
        mainFacilityHead: row['Facility Head'] || row['mainFacilityHead'] || '',
        gstNumber: row['GST Number'] || row['gstNumber'] || '',
        category: row['Category'] || row['category'] || '',
        subcategory: row['Subcategory'] || row['subcategory'] || '',
        status: row['Status'] || row['status'] || 'Active',
      };
      
      if (!payload.mainFacilityCode && !payload.mainFacilityName) continue;

      try {
        await api.post('/main-facilities', payload);
      } catch (err) {
        console.error('Failed to import row', row, err);
      }
    }
    fetchFacilities();
  };

  const importConfig: ImportConfig = {
    title: 'Main Facilities',
    expectedHeaders: ['Facility Code', 'Facility Name', 'Facility Head', 'Category', 'GST Number', 'Status'],
    onImport: handleImportData,
    onClose: () => setIsImportOpen(false)
  };

  const handlePrint = () => {
    window.print();
  };

  const handleColumnFilterChange = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      mainFacilityCode: '',
      mainFacilityName: '',
      mainFacilityHead: '',
      gstNumber: '',
      category: '',
      subcategory: '',
      status: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      latitude: '',
      longitude: '',
      description: '',
    });
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => v.trim() !== '').length;
  }, [columnFilters]);

  const hasActiveColumnFilters = activeFilterCount > 0;

  const handleSort = (key: 'mainFacilityCode' | 'mainFacilityName' | 'mainFacilityHead' | 'gstNumber' | 'category' | 'subcategory' | 'status' | 'address' | 'city' | 'state' | 'country' | 'postalCode' | 'latitude' | 'longitude' | 'description') => {
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

  const uniqueCategories = useMemo(() => {
    const list = new Set<string>();
    permittedFacilities.forEach(f => {
      if (f.category) list.add(f.category);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [permittedFacilities]);

  const uniqueStatuses = useMemo(() => {
    const list = new Set<string>();
    permittedFacilities.forEach(f => {
      if (f.status) list.add(f.status);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [permittedFacilities]);

  const filteredFacilities = useMemo(() => {
    let result = permittedFacilities.filter(facility => {
      // 1. Filter by Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          (facility.mainFacilityCode && facility.mainFacilityCode.toLowerCase().includes(query)) ||
          (facility.mainFacilityName && facility.mainFacilityName.toLowerCase().includes(query)) ||
          (facility.mainFacilityHead && facility.mainFacilityHead.toLowerCase().includes(query)) ||
          (facility.category && facility.category.toLowerCase().includes(query)) ||
          (facility.subcategory && facility.subcategory.toLowerCase().includes(query)) ||
          (facility.gstNumber && facility.gstNumber.toLowerCase().includes(query)) ||
          (facility.address && facility.address.toLowerCase().includes(query)) ||
          (facility.city && facility.city.toLowerCase().includes(query)) ||
          (facility.state && facility.state.toLowerCase().includes(query)) ||
          (facility.country && facility.country.toLowerCase().includes(query)) ||
          (facility.postalCode && facility.postalCode.toLowerCase().includes(query)) ||
          (facility.description && facility.description.toLowerCase().includes(query))
        );
        if (!matchesSearch) return false;
      }

      // 2. Filter by Active Filters
      for (const [key, value] of Object.entries(activeFilters)) {
        if (facility[key] !== value) return false;
      }

      // 3. Column Filters
      if (columnFilters.mainFacilityCode && !facility.mainFacilityCode?.toLowerCase().includes(columnFilters.mainFacilityCode.toLowerCase())) {
        return false;
      }
      if (columnFilters.mainFacilityName && !facility.mainFacilityName?.toLowerCase().includes(columnFilters.mainFacilityName.toLowerCase())) {
        return false;
      }
      if (columnFilters.mainFacilityHead && !facility.mainFacilityHead?.toLowerCase().includes(columnFilters.mainFacilityHead.toLowerCase())) {
        return false;
      }
      if (columnFilters.gstNumber && !facility.gstNumber?.toLowerCase().includes(columnFilters.gstNumber.toLowerCase())) {
        return false;
      }
      if (columnFilters.category && facility.category?.toLowerCase() !== columnFilters.category.toLowerCase()) {
        return false;
      }
      if (columnFilters.subcategory && !facility.subcategory?.toLowerCase().includes(columnFilters.subcategory.toLowerCase())) {
        return false;
      }
      if (columnFilters.status && facility.status?.toLowerCase() !== columnFilters.status.toLowerCase()) {
        return false;
      }
      if (columnFilters.address && !facility.address?.toLowerCase().includes(columnFilters.address.toLowerCase())) {
        return false;
      }
      if (columnFilters.city && !facility.city?.toLowerCase().includes(columnFilters.city.toLowerCase())) {
        return false;
      }
      if (columnFilters.state && !facility.state?.toLowerCase().includes(columnFilters.state.toLowerCase())) {
        return false;
      }
      if (columnFilters.country && !facility.country?.toLowerCase().includes(columnFilters.country.toLowerCase())) {
        return false;
      }
      if (columnFilters.postalCode && !facility.postalCode?.toLowerCase().includes(columnFilters.postalCode.toLowerCase())) {
        return false;
      }
      if (columnFilters.latitude && !facility.latitude?.toLowerCase().includes(columnFilters.latitude.toLowerCase())) {
        return false;
      }
      if (columnFilters.longitude && !facility.longitude?.toLowerCase().includes(columnFilters.longitude.toLowerCase())) {
        return false;
      }
      if (columnFilters.description && !facility.description?.toLowerCase().includes(columnFilters.description.toLowerCase())) {
        return false;
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
  }, [facilities, searchQuery, activeFilters, columnFilters, sortConfig]);

  const uniqueSubCategories = useMemo(() => {
    const list = new Set<string>();
    facilities.forEach(f => {
      if (f.subcategory) list.add(f.subcategory);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [facilities]);

  const uniqueStates = useMemo(() => {
    const list = new Set<string>();
    facilities.forEach(f => {
      if (f.state) list.add(f.state);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [facilities]);

  const uniqueCountries = useMemo(() => {
    const list = new Set<string>();
    facilities.forEach(f => {
      if (f.country) list.add(f.country);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [facilities]);

  // Dynamic Filters for Customize Filters modal
  const filterOptions: FilterOption[] = useMemo(() => [
    ...(uniqueCategories.length > 0 ? [{
      key: 'category',
      label: 'Category',
      options: uniqueCategories
    }] : []),
    ...(uniqueSubCategories.length > 0 ? [{
      key: 'subcategory',
      label: 'Subcategory',
      options: uniqueSubCategories
    }] : []),
    ...(uniqueStatuses.length > 0 ? [{
      key: 'status',
      label: 'Status',
      options: uniqueStatuses
    }] : []),
    ...(uniqueStates.length > 0 ? [{
      key: 'state',
      label: 'State',
      options: uniqueStates
    }] : []),
    ...(uniqueCountries.length > 0 ? [{
      key: 'country',
      label: 'Country',
      options: uniqueCountries
    }] : []),
  ], [uniqueCategories, uniqueSubCategories, uniqueStatuses, uniqueStates, uniqueCountries]);

  const totalItems = filteredFacilities.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentFacilities = filteredFacilities.slice(startIndex, endIndex);

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      <div className="print:hidden">
        <TableActions
          title="Facility Master"
          subtitle="Manage all main facilities in the system"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search main facilities..."
          onImport={canImport ? () => setIsImportOpen(true) : undefined}
          onExport={canExport ? handleExport : undefined}
          onPrint={canPrint ? handlePrint : undefined}
          columnCustomizer={
            <ColumnCustomizer
              columns={MAIN_FACILITY_COLUMNS}
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
              storageKey="main_facility_master_table_columns"
            />
          }
          hasActiveColumnFilters={hasActiveColumnFilters}
          onResetColumnFilters={clearAllColumnFilters}
          activeColumnFilterCount={activeFilterCount}
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          actionButton={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/facility-management')}
                className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Facility Management</span>
              </button>
              {canCreate && (
                <button
                  onClick={() => navigate('/master/main-facility/new')}
                  className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#00a651] hover:bg-[#009040] active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Facility</span>
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-gray-700 font-semibold text-xs uppercase tracking-wider border-b border-gray-200 sticky top-0 whitespace-nowrap">
              {/* Column Title Row - Tapping main columns toggles filter row */}
              <tr 
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="cursor-pointer select-none hover:bg-slate-100/60 transition-colors whitespace-nowrap"
                title={showColumnFilters ? "Click column header to hide filters" : "Click column header to show filters"}
              >
                {visibleColumns.includes('no') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-center text-xs font-semibold text-gray-500 w-12 select-none">
                    No.
                  </th>
                )}

                {visibleColumns.includes('mainFacilityCode') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility Code</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('mainFacilityCode');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility Code"
                      >
                        {sortConfig?.key === 'mainFacilityCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('mainFacilityName') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility Name</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('mainFacilityName');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility Name"
                      >
                        {sortConfig?.key === 'mainFacilityName' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('mainFacilityHead') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility Head</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('mainFacilityHead');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility Head"
                      >
                        {sortConfig?.key === 'mainFacilityHead' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('category') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('category');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Category"
                      >
                        {sortConfig?.key === 'category' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('gstNumber') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
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

                {visibleColumns.includes('category') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('category');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Category"
                      >
                        {sortConfig?.key === 'category' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('subcategory') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Subcategory</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('subcategory');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Subcategory"
                      >
                        {sortConfig?.key === 'subcategory' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('status') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
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

                {visibleColumns.includes('address') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
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
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
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
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
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
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
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
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
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
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
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
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
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

                {visibleColumns.includes('description') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Description</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('description');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Description"
                      >
                        {sortConfig?.key === 'description' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('actions') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Actions</span>
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
                  {/* No. Column Filter placeholder */}
                  {visibleColumns.includes('no') && (
                    <th className="px-3 py-2 font-normal text-center"></th>
                  )}

                  {/* Facility Code Filter */}
                  {visibleColumns.includes('mainFacilityCode') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.mainFacilityCode}
                          onChange={(e) => handleColumnFilterChange('mainFacilityCode', e.target.value)}
                          placeholder="Filter code..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.mainFacilityCode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('mainFacilityCode', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Facility Name Filter */}
                  {visibleColumns.includes('mainFacilityName') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.mainFacilityName}
                          onChange={(e) => handleColumnFilterChange('mainFacilityName', e.target.value)}
                          placeholder="Filter name..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.mainFacilityName && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('mainFacilityName', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Facility Head Filter */}
                  {visibleColumns.includes('mainFacilityHead') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.mainFacilityHead}
                          onChange={(e) => handleColumnFilterChange('mainFacilityHead', e.target.value)}
                          placeholder="Filter head..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.mainFacilityHead && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('mainFacilityHead', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* GST Number Filter */}
                  {visibleColumns.includes('gstNumber') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.gstNumber}
                          onChange={(e) => handleColumnFilterChange('gstNumber', e.target.value)}
                          placeholder="Filter GST..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.gstNumber && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('gstNumber', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Category Filter */}
                  {visibleColumns.includes('category') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.category}
                          onChange={(e) => handleColumnFilterChange('category', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Categories</option>
                          {uniqueCategories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {columnFilters.category && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('category', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Subcategory Filter */}
                  {visibleColumns.includes('subcategory') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.subcategory}
                          onChange={(e) => handleColumnFilterChange('subcategory', e.target.value)}
                          placeholder="Filter subcategory..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.subcategory && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('subcategory', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Status Filter */}
                  {visibleColumns.includes('status') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.status}
                          onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
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

                  {/* Address Filter */}
                  {visibleColumns.includes('address') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.address}
                          onChange={(e) => handleColumnFilterChange('address', e.target.value)}
                          placeholder="Filter address..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.address && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('address', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* City Filter */}
                  {visibleColumns.includes('city') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.city}
                          onChange={(e) => handleColumnFilterChange('city', e.target.value)}
                          placeholder="Filter city..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.city && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('city', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* State Filter */}
                  {visibleColumns.includes('state') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.state}
                          onChange={(e) => handleColumnFilterChange('state', e.target.value)}
                          placeholder="Filter state..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.state && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('state', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Country Filter */}
                  {visibleColumns.includes('country') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.country}
                          onChange={(e) => handleColumnFilterChange('country', e.target.value)}
                          placeholder="Filter country..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.country && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('country', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Postal Code Filter */}
                  {visibleColumns.includes('postalCode') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.postalCode}
                          onChange={(e) => handleColumnFilterChange('postalCode', e.target.value)}
                          placeholder="Filter code..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.postalCode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('postalCode', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Latitude Filter */}
                  {visibleColumns.includes('latitude') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.latitude}
                          onChange={(e) => handleColumnFilterChange('latitude', e.target.value)}
                          placeholder="Filter lat..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.latitude && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('latitude', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Longitude Filter */}
                  {visibleColumns.includes('longitude') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.longitude}
                          onChange={(e) => handleColumnFilterChange('longitude', e.target.value)}
                          placeholder="Filter lng..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.longitude && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('longitude', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Description Filter */}
                  {visibleColumns.includes('description') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.description}
                          onChange={(e) => handleColumnFilterChange('description', e.target.value)}
                          placeholder="Filter description..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.description && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('description', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('actions') && (
                    <th className="px-2.5 py-2 font-normal text-right">
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
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <TableSkeleton columns={visibleColumns.length} rows={5} />
              ) : currentFacilities.length > 0 ? (
                currentFacilities.map((facility, index) => (
                  <tr 
                    key={index} 
                    onClick={() => {
                      const canEditFacility = canEdit && hasAssetPermission(user, facility, 'edit');
                      const canViewFacility = hasAssetPermission(user, facility, 'view');
                      if (canEditFacility || canViewFacility) {
                        navigate(canEditFacility ? `/master/main-facility/edit/${facility.id}` : `/master/main-facility/view/${facility.id}`);
                      }
                    }}
                    className={`hover:bg-gray-50/50 transition-colors group text-xs sm:text-sm ${((canEdit && hasAssetPermission(user, facility, 'edit')) || hasAssetPermission(user, facility, 'view')) ? 'cursor-pointer' : ''}`}
                  >
                    {visibleColumns.includes('no') && (
                      <td className="px-3.5 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                        {startIndex + index + 1}
                      </td>
                    )}
                    {visibleColumns.includes('mainFacilityCode') && (
                      <td className="px-3.5 py-3 whitespace-nowrap font-semibold text-gray-900 font-mono">{facility.mainFacilityCode}</td>
                    )}
                    {visibleColumns.includes('mainFacilityName') && (
                      <td className="px-3.5 py-3 whitespace-nowrap font-medium text-gray-800">{facility.mainFacilityName}</td>
                    )}
                    {visibleColumns.includes('mainFacilityHead') && (
                      <td className="px-3.5 py-3 whitespace-nowrap text-gray-600">{facility.mainFacilityHead}</td>
                    )}
                    {visibleColumns.includes('gstNumber') && (
                      <td className="px-3.5 py-3 whitespace-nowrap text-gray-500">{facility.gstNumber}</td>
                    )}
                    {visibleColumns.includes('category') && (
                      <td className="px-3.5 py-3 whitespace-nowrap text-gray-600">{facility.category}</td>
                    )}
                    {visibleColumns.includes('subcategory') && (
                      <td className="px-3.5 py-3 whitespace-nowrap text-gray-600">{facility.subcategory || '-'}</td>
                    )}
                    {visibleColumns.includes('status') && (
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${facility.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {facility.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('address') && (
                      <td className="px-3.5 py-3 max-w-[200px] truncate text-gray-600" title={facility.address}>{facility.address || '-'}</td>
                    )}
                    {visibleColumns.includes('city') && (
                      <td className="px-3.5 py-3 whitespace-nowrap text-gray-600">{facility.city || '-'}</td>
                    )}
                    {visibleColumns.includes('state') && (
                      <td className="px-3.5 py-3 whitespace-nowrap text-gray-600">{facility.state || '-'}</td>
                    )}
                    {visibleColumns.includes('country') && (
                      <td className="px-3.5 py-3 whitespace-nowrap text-gray-600">{facility.country || '-'}</td>
                    )}
                    {visibleColumns.includes('postalCode') && (
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-gray-500">{facility.postalCode || '-'}</td>
                    )}
                    {visibleColumns.includes('latitude') && (
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-gray-500">{facility.latitude || '-'}</td>
                    )}
                    {visibleColumns.includes('longitude') && (
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-gray-500">{facility.longitude || '-'}</td>
                    )}
                    {visibleColumns.includes('description') && (
                      <td className="px-3.5 py-3 max-w-[220px] truncate text-gray-500" title={facility.description}>{facility.description || '-'}</td>
                    )}
                    {visibleColumns.includes('actions') && (
                      <td className="px-3.5 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasAssetPermission(user, facility, 'view') && (!canEdit || !hasAssetPermission(user, facility, 'edit')) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/master/main-facility/view/${facility.id}`); }}
                              className="text-gray-500 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && hasAssetPermission(user, facility, 'edit') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/master/main-facility/edit/${facility.id}`); }}
                              className="text-gray-500 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && hasAssetPermission(user, facility, 'delete') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); confirmDelete(facility.id); }}
                              className="text-gray-500 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">No main facilities found</p>
                      <p className="text-sm text-gray-500 max-w-sm">
                        {hasActiveColumnFilters
                          ? 'No main facilities match the current filter criteria.'
                          : 'Get started by adding a new facility to the system.'}
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
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
        />
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Facility"
        message="Are you sure you want to delete this facility? This action cannot be undone."
        onClose={() => {
          setDeleteModalOpen(false);
          setFacilityToDelete(null);
        }}
        onConfirm={handleDelete}
      />
      
      {isImportOpen && <ImportModal config={importConfig} />}
    </div>
  );
}
