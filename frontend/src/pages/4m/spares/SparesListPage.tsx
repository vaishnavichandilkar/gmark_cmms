import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Eye, Package, ArrowLeft, X, Filter, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { spareService, type SparePart } from '../../../services/spareService';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { TableActions, type FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import { ColumnCustomizer } from '../../../components/shared/ColumnCustomizer';
import type { ColumnDefinition } from '../../../components/shared/ColumnCustomizer';
import toast from 'react-hot-toast';

const SPARES_COLUMNS: ColumnDefinition[] = [
  // General Details
  { id: 'select', label: 'Selection', category: 'General', required: true, defaultVisible: true },
  { id: 'no', label: 'No.', category: 'General', defaultVisible: true },
  { id: 'partName', label: 'Spare Name', category: 'General', required: true, defaultVisible: true },
  { id: 'partCode', label: 'Spare Code', category: 'General', defaultVisible: true },
  { id: 'category', label: 'Category', category: 'General', defaultVisible: false },
  { id: 'subCategory', label: 'Sub Category', category: 'General', defaultVisible: false },
  { id: 'headOfDepartment', label: 'Head of Department', category: 'General', defaultVisible: false },
  { id: 'description', label: 'Description', category: 'General', defaultVisible: false },
  { id: 'notes', label: 'Notes', category: 'General', defaultVisible: false },

  // Location
  { id: 'location', label: 'Location', category: 'Location', defaultVisible: true },
  { id: 'stockLocation', label: 'Stock Location', category: 'Location', defaultVisible: true },

  // Inventory / Stock
  { id: 'stockQuantity', label: 'Stock', category: 'Inventory', defaultVisible: true },
  { id: 'inHandQuantity', label: 'In Hand Quantity', category: 'Inventory', defaultVisible: false },
  { id: 'atSourceQuantity', label: 'At Source Quantity', category: 'Inventory', defaultVisible: false },
  { id: 'minimumQuantity', label: 'Min Quantity', category: 'Inventory', defaultVisible: false },
  { id: 'totalStock', label: 'Total Stock', category: 'Inventory', defaultVisible: false },
  { id: 'unitOfMeasure', label: 'UOM', category: 'Inventory', defaultVisible: false },

  // Financial
  { id: 'unitCost', label: 'Unit Cost', category: 'Financial', defaultVisible: false },
  { id: 'rate', label: 'In Hand Amount', category: 'Financial', defaultVisible: true },

  // Action
  { id: 'action', label: 'Action', category: 'General', required: true, defaultVisible: true },
];

const DEFAULT_SPARES_VISIBLE_COLUMNS = SPARES_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.id);

export function SparesListPage() {
  const navigate = useNavigate();
  const [spares, setSpares] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('spares_list_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load visible columns from localStorage', e);
    }
    return DEFAULT_SPARES_VISIBLE_COLUMNS;
  });

  // Column-wise Filters State
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    partName: '',
    partCode: '',
    category: '',
    subCategory: '',
    headOfDepartment: '',
    description: '',
    notes: '',
    location: '',
    stockLocation: '',
    stockQuantity: '',
    inHandQuantity: '',
    atSourceQuantity: '',
    minimumQuantity: '',
    totalStock: '',
    unitOfMeasure: '',
    unitCost: '',
    rate: '',
  });

  // Column Sorting State
  type SpareSortKey =
    | 'partName' | 'partCode' | 'category' | 'subCategory' | 'headOfDepartment' | 'description' | 'notes'
    | 'location' | 'stockLocation'
    | 'stockQuantity' | 'inHandQuantity' | 'atSourceQuantity' | 'minimumQuantity' | 'totalStock' | 'unitOfMeasure'
    | 'unitCost' | 'rate';

  const [sortConfig, setSortConfig] = useState<{
    key: SpareSortKey;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters, columnFilters]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gmark_spares_master_data_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        const dummyCodes = new Set(['SP-BRG-001', 'SP-VLV-002', 'SP-GSK-003', 'SP-PRS-004', 'SP-FLT-005', 'SP-MTR-006']);
        if (Array.isArray(parsed) && parsed.some((s: any) => dummyCodes.has(s.partCode))) {
          localStorage.removeItem('gmark_spares_master_data_v3');
        }
      }
    } catch {}
    fetchSpares();
  }, []);

  const fetchSpares = async () => {
    setLoading(true);
    try {
      const data = await spareService.getAll();
      setSpares(data);
    } catch (err) {
      toast.error('Failed to load spare parts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredSpares.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const openDeleteModal = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one spare part to delete');
      return;
    }
    setDeletionReason('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      for (const id of selectedIds) {
        await spareService.delete(id);
      }
      toast.success(`Deleted ${selectedIds.length} spare part record(s)`);
      setIsDeleteModalOpen(false);
      setSelectedIds([]);
      fetchSpares();
    } catch (err) {
      toast.error('Failed to delete selected spare parts');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFileName(file.name);
    }
  };

  const handleConfirmImport = () => {
    if (!importFileName) {
      toast.error('Please select a CSV file to upload');
      return;
    }
    toast.success(`Successfully imported spares from ${importFileName}`);
    setIsImportModalOpen(false);
    setImportFileName('');
    fetchSpares();
  };

  const uniqueLocations = useMemo(() => {
    const list = new Set<string>();
    spares.forEach(s => {
      if (s.location) list.add(s.location);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [spares]);

  const uniqueStockLocations = useMemo(() => {
    const list = new Set<string>();
    spares.forEach(s => {
      const loc = s.stockLocation || s.location;
      if (loc) list.add(loc);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [spares]);

  const uniqueCategories = useMemo(() => {
    const list = new Set<string>();
    spares.forEach(s => {
      if (s.category) list.add(s.category);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [spares]);

  const handleColumnFilterChange = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      partName: '',
      partCode: '',
      category: '',
      subCategory: '',
      headOfDepartment: '',
      description: '',
      notes: '',
      location: '',
      stockLocation: '',
      stockQuantity: '',
      inHandQuantity: '',
      atSourceQuantity: '',
      minimumQuantity: '',
      totalStock: '',
      unitOfMeasure: '',
      unitCost: '',
      rate: '',
    });
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => v.trim() !== '').length;
  }, [columnFilters]);

  const hasActiveColumnFilters = activeFilterCount > 0;

  const handleSort = (key: SpareSortKey) => {
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

  const handleExport = (format: 'pdf' | 'excel') => {
    if (filteredSpares.length === 0) {
      toast.error('No data to export');
      return;
    }
    const columnMap: { id: string; label: string; getValue: (s: SparePart, idx: number) => any }[] = [
      { id: 'no', label: 'No.', getValue: (_, idx) => idx + 1 },
      { id: 'partName', label: 'Spare Name', getValue: s => s.partName || '-' },
      { id: 'partCode', label: 'Spare Code', getValue: s => s.partCode || '-' },
      { id: 'category', label: 'Category', getValue: s => s.category || '-' },
      { id: 'subCategory', label: 'Sub Category', getValue: s => s.subCategory || '-' },
      { id: 'headOfDepartment', label: 'Head of Department', getValue: s => s.headOfDepartment || '-' },
      { id: 'description', label: 'Description', getValue: s => s.description || '-' },
      { id: 'notes', label: 'Notes', getValue: s => s.notes || '-' },
      { id: 'location', label: 'Location', getValue: s => s.location || '-' },
      { id: 'stockLocation', label: 'Stock Location', getValue: s => s.stockLocation || s.location || '-' },
      { id: 'stockQuantity', label: 'Stock', getValue: s => s.stockQuantity ?? 0 },
      { id: 'inHandQuantity', label: 'In Hand Quantity', getValue: s => s.inHandQuantity ?? 0 },
      { id: 'atSourceQuantity', label: 'At Source Quantity', getValue: s => s.atSourceQuantity ?? 0 },
      { id: 'minimumQuantity', label: 'Min Quantity', getValue: s => s.minimumQuantity ?? '-' },
      { id: 'totalStock', label: 'Total Stock', getValue: s => s.totalStock ?? '-' },
      { id: 'unitOfMeasure', label: 'UOM', getValue: s => s.unitOfMeasure || '-' },
      { id: 'unitCost', label: 'Unit Cost', getValue: s => s.unitCost != null ? `₹${Number(s.unitCost).toFixed(2)}` : '-' },
      { id: 'rate', label: 'In Hand Amount', getValue: s => `₹${s.rate !== undefined ? Number(s.rate).toFixed(2) : s.unitCost ? Number(s.unitCost).toFixed(2) : '0.00'}` },
    ];

    const activeCols = columnMap.filter(c => visibleColumns.includes(c.id));
    const headers = activeCols.map(c => c.label);
    const rows = filteredSpares.map((s, idx) => activeCols.map(c => c.getValue(s, idx)));
  };

  const filteredSpares = useMemo(() => {
    return spares.filter(item => {
      // 1. Global Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          (item.partName || '').toLowerCase().includes(q) ||
          (item.partCode || '').toLowerCase().includes(q) ||
          (item.location || '').toLowerCase().includes(q) ||
          (item.stockLocation || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 2. Active Filters (Customize Filters)
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        if (key === 'category' && (item.category || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'subCategory' && (item.subCategory || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'location' && (item.location || item.stockLocation || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'unitOfMeasure' && (item.unitOfMeasure || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'status') {
          const total = Number(item.totalStock !== undefined ? item.totalStock : item.stockQuantity || 0);
          const min = Number(item.minimumQuantity || 0);
          if (value === 'Out of Stock' && total > 0) return false;
          if (value === 'Low Stock' && (total === 0 || total > min)) return false;
          if (value === 'In Stock' && total <= min) return false;
        }
      }

      // Column-wise filters:
      if (columnFilters.partName.trim() && !(item.partName || '').toLowerCase().includes(columnFilters.partName.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.partCode.trim() && !(item.partCode || '').toLowerCase().includes(columnFilters.partCode.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.category.trim() && !(item.category || '').toLowerCase().includes(columnFilters.category.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.subCategory.trim() && !(item.subCategory || '').toLowerCase().includes(columnFilters.subCategory.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.headOfDepartment.trim() && !(item.headOfDepartment || '').toLowerCase().includes(columnFilters.headOfDepartment.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.description.trim() && !(item.description || '').toLowerCase().includes(columnFilters.description.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.notes.trim() && !(item.notes || '').toLowerCase().includes(columnFilters.notes.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.location.trim() && (item.location || '').toLowerCase() !== columnFilters.location.toLowerCase().trim()) {
        return false;
      }
      if (columnFilters.stockLocation.trim() && (item.stockLocation || item.location || '').toLowerCase() !== columnFilters.stockLocation.toLowerCase().trim()) {
        return false;
      }
      if (columnFilters.stockQuantity.trim() && !String(item.stockQuantity ?? '').includes(columnFilters.stockQuantity.trim())) {
        return false;
      }
      if (columnFilters.inHandQuantity.trim() && !String(item.inHandQuantity ?? '').includes(columnFilters.inHandQuantity.trim())) {
        return false;
      }
      if (columnFilters.atSourceQuantity.trim() && !String(item.atSourceQuantity ?? '').includes(columnFilters.atSourceQuantity.trim())) {
        return false;
      }
      if (columnFilters.minimumQuantity.trim() && !String(item.minimumQuantity ?? '').includes(columnFilters.minimumQuantity.trim())) {
        return false;
      }
      if (columnFilters.totalStock.trim() && !String(item.totalStock ?? '').includes(columnFilters.totalStock.trim())) {
        return false;
      }
      if (columnFilters.unitOfMeasure.trim() && !(item.unitOfMeasure || '').toLowerCase().includes(columnFilters.unitOfMeasure.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.unitCost.trim() && !String(item.unitCost ?? '').includes(columnFilters.unitCost.trim())) {
        return false;
      }
      if (columnFilters.rate.trim()) {
        const rateVal = String(item.rate !== undefined ? item.rate : item.unitCost || '');
        if (!rateVal.includes(columnFilters.rate.trim())) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      let valA: any = '';
      let valB: any = '';
      if (sortConfig.key === 'partName') {
        valA = a.partName || '';
        valB = b.partName || '';
      } else if (sortConfig.key === 'partCode') {
        valA = a.partCode || '';
        valB = b.partCode || '';
      } else if (sortConfig.key === 'category') {
        valA = a.category || '';
        valB = b.category || '';
      } else if (sortConfig.key === 'subCategory') {
        valA = a.subCategory || '';
        valB = b.subCategory || '';
      } else if (sortConfig.key === 'headOfDepartment') {
        valA = a.headOfDepartment || '';
        valB = b.headOfDepartment || '';
      } else if (sortConfig.key === 'description') {
        valA = a.description || '';
        valB = b.description || '';
      } else if (sortConfig.key === 'notes') {
        valA = a.notes || '';
        valB = b.notes || '';
      } else if (sortConfig.key === 'location') {
        valA = a.location || '';
        valB = b.location || '';
      } else if (sortConfig.key === 'stockLocation') {
        valA = a.stockLocation || a.location || '';
        valB = b.stockLocation || b.location || '';
      } else if (sortConfig.key === 'stockQuantity') {
        const numA = Number(a.stockQuantity ?? 0);
        const numB = Number(b.stockQuantity ?? 0);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      } else if (sortConfig.key === 'inHandQuantity') {
        const numA = Number(a.inHandQuantity ?? 0);
        const numB = Number(b.inHandQuantity ?? 0);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      } else if (sortConfig.key === 'atSourceQuantity') {
        const numA = Number(a.atSourceQuantity ?? 0);
        const numB = Number(b.atSourceQuantity ?? 0);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      } else if (sortConfig.key === 'minimumQuantity') {
        const numA = Number(a.minimumQuantity ?? 0);
        const numB = Number(b.minimumQuantity ?? 0);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      } else if (sortConfig.key === 'totalStock') {
        const numA = Number(a.totalStock ?? 0);
        const numB = Number(b.totalStock ?? 0);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      } else if (sortConfig.key === 'unitOfMeasure') {
        valA = a.unitOfMeasure || '';
        valB = b.unitOfMeasure || '';
      } else if (sortConfig.key === 'unitCost') {
        const numA = Number(a.unitCost ?? 0);
        const numB = Number(b.unitCost ?? 0);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      } else if (sortConfig.key === 'rate') {
        const numA = Number(a.rate !== undefined ? a.rate : a.unitCost || 0);
        const numB = Number(b.rate !== undefined ? b.rate : b.unitCost || 0);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }
      const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [spares, searchQuery, activeFilters, columnFilters, sortConfig]);

  const categories = useMemo(() => Array.from(new Set(spares.map(s => s.category).filter(Boolean))).sort(), [spares]);
  const subCategories = useMemo(() => Array.from(new Set(spares.map(s => s.subCategory).filter(Boolean))).sort(), [spares]);
  const locations = useMemo(() => Array.from(new Set(spares.map(s => s.location || s.stockLocation).filter(Boolean))).sort(), [spares]);
  const units = useMemo(() => Array.from(new Set(spares.map(s => s.unitOfMeasure).filter(Boolean))).sort(), [spares]);

  // Dynamic Filters for Customize Filters modal
  const filterOptions: FilterOption[] = useMemo(() => [
    ...(categories.length > 0 ? [{
      key: 'category',
      label: 'Category',
      options: categories.map(c => ({ label: String(c), value: String(c) }))
    }] : []),
    ...(subCategories.length > 0 ? [{
      key: 'subCategory',
      label: 'Sub Category',
      options: subCategories.map(c => ({ label: String(c), value: String(c) }))
    }] : []),
    {
      key: 'status',
      label: 'Stock Status',
      options: ['In Stock', 'Low Stock', 'Out of Stock']
    },
    ...(locations.length > 0 ? [{
      key: 'location',
      label: 'Storage Location / Warehouse',
      options: locations.map(l => ({ label: String(l), value: String(l) }))
    }] : []),
    ...(units.length > 0 ? [{
      key: 'unitOfMeasure',
      label: 'Unit of Measure',
      options: units.map(u => ({ label: String(u), value: String(u) }))
    }] : []),
  ], [categories, subCategories, locations, units]);

  const totalItems = filteredSpares.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentSpares = filteredSpares.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Table Actions Toolbar in One Row */}
      <TableActions
        title="Spare Management"
        subtitle="Centralized register of spare parts, inventory stock levels, and warehouse locations"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search spares by name, code, location..."
        onImport={() => {
          setImportFileName('');
          setIsImportModalOpen(true);
        }}
        onExport={handleExport}
        onPrint={handlePrint}
        columnCustomizer={
          <ColumnCustomizer
            columns={SPARES_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="spares_list_table_columns"
          />
        }
        hasActiveColumnFilters={hasActiveColumnFilters}
        onResetColumnFilters={clearAllColumnFilters}
        activeColumnFilterCount={activeFilterCount}
        extraActions={
          selectedIds.length > 0 && (
            <button
              onClick={openDeleteModal}
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
            onClick={() => navigate('/spares/new')}
            className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#00a651] hover:bg-[#009040] active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Spare</span>
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
                      checked={currentSpares.length > 0 && selectedIds.length === currentSpares.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                {visibleColumns.includes('no') && (
                  <th className="px-5 py-3.5 w-16 select-none">No.</th>
                )}
                {visibleColumns.includes('partName') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Spare Name</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('partName');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Spare Name"
                      >
                        {sortConfig?.key === 'partName' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('partCode') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Spare Code</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('partCode');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Spare Code"
                      >
                        {sortConfig?.key === 'partCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('category') && (
                  <th className="px-5 py-3.5 select-none">
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

                {visibleColumns.includes('subCategory') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Sub Category</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('subCategory');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Sub Category"
                      >
                        {sortConfig?.key === 'subCategory' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('headOfDepartment') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>HOD</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('headOfDepartment');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Head of Department"
                      >
                        {sortConfig?.key === 'headOfDepartment' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('description') && (
                  <th className="px-5 py-3.5 select-none">
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

                {visibleColumns.includes('location') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Location</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('location');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Location"
                      >
                        {sortConfig?.key === 'location' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('stockLocation') && (
                  <th className="px-5 py-3.5 select-none whitespace-nowrap min-w-[150px]">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="whitespace-nowrap">Stock Location</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('stockLocation');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Stock Location"
                      >
                        {sortConfig?.key === 'stockLocation' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('stockQuantity') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Stock</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('stockQuantity');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Stock"
                      >
                        {sortConfig?.key === 'stockQuantity' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('inHandQuantity') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>In Hand Qty</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('inHandQuantity');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by In Hand Quantity"
                      >
                        {sortConfig?.key === 'inHandQuantity' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('atSourceQuantity') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>At Source Qty</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('atSourceQuantity');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by At Source Quantity"
                      >
                        {sortConfig?.key === 'atSourceQuantity' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('minimumQuantity') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Min Qty</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('minimumQuantity');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Min Quantity"
                      >
                        {sortConfig?.key === 'minimumQuantity' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('totalStock') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Total Stock</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('totalStock');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Total Stock"
                      >
                        {sortConfig?.key === 'totalStock' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('unitOfMeasure') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>UOM</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('unitOfMeasure');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Unit of Measure"
                      >
                        {sortConfig?.key === 'unitOfMeasure' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('unitCost') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Unit Cost</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('unitCost');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Unit Cost"
                      >
                        {sortConfig?.key === 'unitCost' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('rate') && (
                  <th className="px-5 py-3.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>In Hand Amount</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('rate');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by In Hand Amount"
                      >
                        {sortConfig?.key === 'rate' ? (
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
                <tr className="bg-blue-50/40 border-t border-blue-100/60 lowercase normal-case tracking-normal whitespace-nowrap">
                  {visibleColumns.includes('select') && (
                    <th className="px-4 py-2"></th>
                  )}
                  {visibleColumns.includes('no') && (
                    <th className="px-5 py-2"></th>
                  )}
                  
                  {/* Spare Name filter */}
                  {visibleColumns.includes('partName') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.partName}
                          onChange={(e) => handleColumnFilterChange('partName', e.target.value)}
                          placeholder="Filter name..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.partName && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('partName', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Spare Code filter */}
                  {visibleColumns.includes('partCode') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.partCode}
                          onChange={(e) => handleColumnFilterChange('partCode', e.target.value)}
                          placeholder="Filter code..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.partCode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('partCode', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Category filter */}
                  {visibleColumns.includes('category') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.category}
                          onChange={(e) => handleColumnFilterChange('category', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs cursor-pointer"
                        >
                          <option value="">All Categories</option>
                          {uniqueCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {columnFilters.category && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('category', '')}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Sub Category filter */}
                  {visibleColumns.includes('subCategory') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.subCategory}
                        onChange={(e) => handleColumnFilterChange('subCategory', e.target.value)}
                        placeholder="Filter sub cat..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Head of Department filter */}
                  {visibleColumns.includes('headOfDepartment') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.headOfDepartment}
                        onChange={(e) => handleColumnFilterChange('headOfDepartment', e.target.value)}
                        placeholder="Filter HOD..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Description filter */}
                  {visibleColumns.includes('description') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.description}
                        onChange={(e) => handleColumnFilterChange('description', e.target.value)}
                        placeholder="Filter desc..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Notes filter */}
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

                  {/* Location filter */}
                  {visibleColumns.includes('location') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.location}
                          onChange={(e) => handleColumnFilterChange('location', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs cursor-pointer"
                        >
                          <option value="">All Locations</option>
                          {uniqueLocations.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                        {columnFilters.location && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('location', '')}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Stock Location filter */}
                  {visibleColumns.includes('stockLocation') && (
                    <th className="px-3 py-2 font-normal min-w-[150px] whitespace-nowrap">
                      <div className="relative min-w-[140px]">
                        <select
                          value={columnFilters.stockLocation}
                          onChange={(e) => handleColumnFilterChange('stockLocation', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs cursor-pointer"
                        >
                          <option value="">All Stock Locs</option>
                          {uniqueStockLocations.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                        {columnFilters.stockLocation && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('stockLocation', '')}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Stock filter */}
                  {visibleColumns.includes('stockQuantity') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.stockQuantity}
                          onChange={(e) => handleColumnFilterChange('stockQuantity', e.target.value)}
                          placeholder="Filter stock..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.stockQuantity && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('stockQuantity', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* In Hand Quantity filter */}
                  {visibleColumns.includes('inHandQuantity') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.inHandQuantity}
                        onChange={(e) => handleColumnFilterChange('inHandQuantity', e.target.value)}
                        placeholder="Filter in hand..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* At Source Quantity filter */}
                  {visibleColumns.includes('atSourceQuantity') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.atSourceQuantity}
                        onChange={(e) => handleColumnFilterChange('atSourceQuantity', e.target.value)}
                        placeholder="Filter at source..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Minimum Quantity filter */}
                  {visibleColumns.includes('minimumQuantity') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.minimumQuantity}
                        onChange={(e) => handleColumnFilterChange('minimumQuantity', e.target.value)}
                        placeholder="Filter min qty..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Total Stock filter */}
                  {visibleColumns.includes('totalStock') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.totalStock}
                        onChange={(e) => handleColumnFilterChange('totalStock', e.target.value)}
                        placeholder="Filter total stock..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Unit of Measure filter */}
                  {visibleColumns.includes('unitOfMeasure') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.unitOfMeasure}
                        onChange={(e) => handleColumnFilterChange('unitOfMeasure', e.target.value)}
                        placeholder="Filter UOM..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Unit Cost filter */}
                  {visibleColumns.includes('unitCost') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.unitCost}
                        onChange={(e) => handleColumnFilterChange('unitCost', e.target.value)}
                        placeholder="Filter cost..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* In Hand Amount filter */}
                  {visibleColumns.includes('rate') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.rate}
                          onChange={(e) => handleColumnFilterChange('rate', e.target.value)}
                          placeholder="Filter amount..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.rate && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('rate', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Action column reset */}
                  {visibleColumns.includes('action') && (
                    <th className="px-5 py-2 text-right">
                      {hasActiveColumnFilters && (
                        <button
                          type="button"
                          onClick={clearAllColumnFilters}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
                          title="Clear all column filters"
                        >
                          <RotateCcw size={11} />
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
              ) : currentSpares.length > 0 ? (
                currentSpares.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/spares/edit/${item.id}`, { state: { tab: 'General' } })}
                      className={`hover:bg-blue-50/40 transition-colors group cursor-pointer ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {visibleColumns.includes('select') && (
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(item.id)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      {visibleColumns.includes('no') && (
                        <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">
                          {startIndex + index + 1}
                        </td>
                      )}
                      {visibleColumns.includes('partName') && (
                        <td className="px-5 py-3.5 font-semibold text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const img = item.imageUrl || (item as any).namePlateFile;
                              if (img) {
                                const resolved = img.startsWith('data:') || img.startsWith('blob:')
                                  ? img
                                  : img.startsWith('http://') || img.startsWith('https://')
                                    ? (img.includes(':3001/uploads/') || img.includes(':3002/uploads/') ? img.replace(/^http:\/\/(localhost|127\.0\.0\.1):(3001|3002)/, '') : img)
                                    : (img.startsWith('/') ? img : `/${img}`);
                                return (
                                  <img
                                    src={resolved}
                                    alt={item.partName}
                                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      if (img && !target.src.includes(':3002') && !target.src.startsWith('data:')) {
                                        target.src = `http://localhost:3002${img.startsWith('/') ? img : `/${img}`}`;
                                      }
                                    }}
                                  />
                                );
                              }
                              return null;
                            })()}
                            <span>{item.partName}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('partCode') && (
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {item.partCode ? (
                            <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                              {item.partCode}
                            </span>
                          ) : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('category') && (
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {item.category ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                              {item.category}
                            </span>
                          ) : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('subCategory') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                          {item.subCategory || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('headOfDepartment') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                          {item.headOfDepartment || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('description') && (
                        <td className="px-5 py-3.5 text-slate-600 max-w-[200px] truncate" title={item.description || ''}>
                          {item.description || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('notes') && (
                        <td className="px-5 py-3.5 text-slate-600 max-w-[200px] truncate" title={item.notes || ''}>
                          {item.notes || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('location') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                          {item.location || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('stockLocation') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                          {item.stockLocation || item.location || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('stockQuantity') && (
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                            (item.stockQuantity || 0) > 10 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/60' 
                              : (item.stockQuantity || 0) > 0 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}>
                            {item.stockQuantity ?? 0}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('inHandQuantity') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-700">
                          {item.inHandQuantity ?? 0}
                        </td>
                      )}
                      {visibleColumns.includes('atSourceQuantity') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-700">
                          {item.atSourceQuantity ?? 0}
                        </td>
                      )}
                      {visibleColumns.includes('minimumQuantity') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-600">
                          {item.minimumQuantity ?? '-'}
                        </td>
                      )}
                      {visibleColumns.includes('totalStock') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono font-medium text-slate-800">
                          {item.totalStock ?? '-'}
                        </td>
                      )}
                      {visibleColumns.includes('unitOfMeasure') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                          {item.unitOfMeasure || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('unitCost') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-700">
                          {item.unitCost != null ? `₹${Number(item.unitCost).toFixed(2)}` : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('rate') && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-700">
                          ₹{item.rate !== undefined ? Number(item.rate).toFixed(2) : item.unitCost ? Number(item.unitCost).toFixed(2) : '0.00'}
                        </td>
                      )}
                      {visibleColumns.includes('action') && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/spares/edit/${item.id}`, { state: { tab: 'General' } })}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                              title="View Spare"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/spares/edit/${item.id}`, { state: { tab: 'General' } })}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIds([item.id]);
                                setDeletionReason('');
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
                        <Package className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-900 mb-1">No spares found</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Get started by adding a new spare part to the inventory.
                      </p>
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

      {/* IMPORT SPARES MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-xl border border-slate-200 relative">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Import Spares</h2>
            </div>

            {/* File Upload Box */}
            <div className="flex items-center gap-3 p-2 border border-slate-300 rounded-xl bg-white">
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shrink-0">
                Choose File
                <input type="file" accept=".csv" onChange={handleImportFileChange} className="hidden" />
              </label>

              <span className="text-xs font-medium text-slate-600 truncate flex-1">
                {importFileName || 'Filename.csv'}
              </span>

              {importFileName && (
                <button 
                  onClick={() => setImportFileName('')}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Info Notice Box */}
            <div className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                i
              </div>
              <p>
                A CSV is a comma-separated values file. CSV files can be created and edited with spreadsheet software like Microsoft Excel.
              </p>
            </div>

            {/* Upload Action Button */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SPARE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 relative">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Delete Spare Part</h2>
            </div>

            {/* Confirmation text */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-700">
                Are you sure you want to delete {selectedIds.length} spare part record(s)?
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Deletion</label>
                <textarea
                  rows={3}
                  placeholder="Enter reason..."
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 resize-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
