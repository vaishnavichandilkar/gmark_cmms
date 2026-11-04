import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Eye, Trash2, Cpu, Filter, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, X, FolderInput, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { DeleteConfirmModal } from '../../../components/shared/DeleteConfirmModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { TableActions, type FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission, hasAssetPermission } from '../../../utils/permissions';
import { MoveMachineModal } from '../../../components/4m/MoveMachineModal';
import { ColumnCustomizer, type ColumnDefinition } from '../../../components/shared/ColumnCustomizer';
import { GiveAccessModal } from '../../../components/4m/GiveAccessModal';

const MACHINE_COLUMNS: ColumnDefinition[] = [
  // General Details
  { id: 'name', label: 'Machine Name', category: 'General', required: true, defaultVisible: true },
  { id: 'machineCode', label: 'Machine Code', category: 'General', defaultVisible: true },
  { id: 'category', label: 'Category', category: 'General', defaultVisible: true },
  { id: 'subCategory', label: 'Sub-Category', category: 'General', defaultVisible: false },
  { id: 'status', label: 'Status', category: 'General', defaultVisible: false },
  { id: 'description', label: 'Description', category: 'General', defaultVisible: false },
  { id: 'machineOwner', label: 'Machine Owner', category: 'General', defaultVisible: false },
  { id: 'headOfDepartment', label: 'Head of Department', category: 'General', defaultVisible: false },
  { id: 'costCenter', label: 'Cost Center', category: 'General', defaultVisible: false },
  { id: 'notes', label: 'Notes', category: 'General', defaultVisible: false },

  // Location Details
  { id: 'company', label: 'Facility', category: 'Location', defaultVisible: true },
  { id: 'building', label: 'Sub-Facility', category: 'Location', defaultVisible: true },
  { id: 'maintenanceHead', label: 'Facility Head', category: 'Location', defaultVisible: false },
  { id: 'locationType', label: 'Location Relationship', category: 'Location', defaultVisible: false },
  { id: 'parentMachine', label: 'Parent Machine', category: 'Location', defaultVisible: false },
  { id: 'latitude', label: 'Latitude', category: 'Location', defaultVisible: false },
  { id: 'longitude', label: 'Longitude', category: 'Location', defaultVisible: false },

  // Technical Specs & IoT
  { id: 'makeModel', label: 'Make & Model', category: 'Technical Specs', defaultVisible: true },
  { id: 'make', label: 'Make', category: 'Technical Specs', defaultVisible: false },
  { id: 'modelNumber', label: 'Model Number', category: 'Technical Specs', defaultVisible: false },
  { id: 'serialNumber', label: 'Serial Number', category: 'Technical Specs', defaultVisible: false },
  { id: 'assetCode', label: 'Asset Code', category: 'Technical Specs', defaultVisible: false },
  { id: 'deviceId', label: 'MAC ID', category: 'Technical Specs', defaultVisible: true },

  // System
  { id: 'dateAdded', label: 'Date Added', category: 'System', defaultVisible: false },
  { id: 'action', label: 'Action', category: 'System', required: true, defaultVisible: true },
];

const DEFAULT_MACHINE_VISIBLE_COLUMNS = ['name', 'machineCode', 'deviceId', 'company', 'building', 'makeModel', 'category', 'action'];

interface Device {
  id: string;
  deviceId: string;
  name: string;
  machineCode?: string;
  company?: string;
  building?: string;
  facility?: any;
  facilityId?: number;
  make?: string;
  modelNumber?: string;
  machineCategory?: string;
  machineSubCategory?: string;
  maintenanceHead?: string;
  status?: string;
  serialNumber?: string;
  assetCode?: string;
  description?: string;
  isLocationPart?: boolean;
  parentMachine?: any;
  costCenter?: string;
  headOfDepartment?: string;
  machineOwner?: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
  createdAt?: string;
}

export function MachineManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const canView = hasPermission(user, 'machine_management', 'view');
  const canCreate = hasPermission(user, 'machine_management', 'create');
  const canEdit = hasPermission(user, 'machine_management', 'edit');
  const canDelete = hasPermission(user, 'machine_management', 'delete');
  const canExport = hasPermission(user, 'machine_management', 'export');
  const canPrint = hasPermission(user, 'machine_management', 'print');

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [machines, setMachines] = useState<Device[]>([]);

  const permittedMachines = useMemo(() => {
    return machines.filter(m => hasAssetPermission(user, m, 'view'));
  }, [machines, user]);

  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null);
  const [selectedMachineToMove, setSelectedMachineToMove] = useState<Device | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [giveAccessTarget, setGiveAccessTarget] = useState<{
    id: number | string;
    name: string;
    code?: string;
    category?: string;
  } | null>(null);

  // Column Visibility Customization
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('machine_management_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validIds = MACHINE_COLUMNS.map(c => c.id);
          const filtered = parsed.filter(id => validIds.includes(id));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_MACHINE_VISIBLE_COLUMNS;
  });
  
  // Column-wise Filters State
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    name: '',
    machineCode: '',
    deviceId: '',
    company: '',
    maintenanceHead: '',
    building: '',
    makeModel: '',
    make: '',
    modelNumber: '',
    serialNumber: '',
    category: '',
    subCategory: '',
    status: '',
    description: '',
    machineOwner: '',
    headOfDepartment: '',
    costCenter: '',
    notes: '',
    locationType: '',
    parentMachine: '',
    assetCode: '',
    latitude: '',
    longitude: '',
    dateAdded: '',
  });

  // Column Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, columnFilters]);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const response = await api.get('/machines');
      setMachines(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch machines:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setMachineToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (machineToDelete === null) return;
    try {
      await api.delete(`/machines/${machineToDelete}`);
      setDeleteModalOpen(false);
      setMachineToDelete(null);
      fetchMachines();
    } catch (error) {
      console.error('Failed to delete machine:', error);
      toast.error('Failed to delete machine.');
    }
  };

  // Extract unique values for dropdown filters
  const uniqueFacilities = useMemo(() => {
    const list = new Set<string>();
    permittedMachines.forEach(m => {
      if (m.company) list.add(m.company);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [permittedMachines]);

  const uniqueSubFacilities = useMemo(() => {
    const list = new Set<string>();
    permittedMachines.forEach(m => {
      if (m.building) list.add(m.building);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [permittedMachines]);

  const uniqueCategories = useMemo(() => {
    const list = new Set<string>();
    permittedMachines.forEach(m => {
      if (m.machineCategory) list.add(m.machineCategory);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [permittedMachines]);

  const uniqueSubCategories = useMemo(() => {
    const list = new Set<string>();
    permittedMachines.forEach(m => {
      if (m.machineSubCategory) list.add(m.machineSubCategory);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [permittedMachines]);

  const handleColumnFilterChange = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      name: '',
      machineCode: '',
      deviceId: '',
      company: '',
      maintenanceHead: '',
      building: '',
      makeModel: '',
      make: '',
      modelNumber: '',
      serialNumber: '',
      category: '',
      subCategory: '',
      status: '',
      description: '',
      machineOwner: '',
      headOfDepartment: '',
      costCenter: '',
      notes: '',
      locationType: '',
      parentMachine: '',
      assetCode: '',
      latitude: '',
      longitude: '',
      dateAdded: '',
    });
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => v.trim() !== '').length;
  }, [columnFilters]);

  const hasActiveColumnFilters = activeFilterCount > 0;

  const handleSort = (key: string) => {
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
    const exportableColumns = MACHINE_COLUMNS.filter(c => c.id !== 'action' && visibleColumns.includes(c.id));
    const headers = exportableColumns.map(c => c.label);
    const rows = filteredMachines.map(machine => exportableColumns.map(col => {
      switch (col.id) {
        case 'name': return machine.name || '-';
        case 'machineCode': return machine.machineCode || '-';
        case 'deviceId': return machine.deviceId || '-';
        case 'company': return machine.company || '-';
        case 'maintenanceHead': return machine.maintenanceHead || '-';
        case 'building': return machine.building || '-';
        case 'makeModel': return `${machine.make || '-'} ${machine.modelNumber || ''}`.trim();
        case 'make': return machine.make || '-';
        case 'modelNumber': return machine.modelNumber || '-';
        case 'serialNumber': return machine.serialNumber || '-';
        case 'category': return machine.machineCategory || '-';
        case 'subCategory': return machine.machineSubCategory || '-';
        case 'status': return machine.status || 'Online';
        case 'description': return machine.description || '-';
        case 'machineOwner': return machine.machineOwner || '-';
        case 'headOfDepartment': return machine.headOfDepartment || '-';
        case 'costCenter': return machine.costCenter || '-';
        case 'notes': return machine.notes || '-';
        case 'locationType': return machine.isLocationPart ? 'Part of Location' : 'Standalone';
        case 'parentMachine': return machine.parentMachine?.name || '-';
        case 'assetCode': return machine.assetCode || '-';
        case 'latitude': return machine.latitude || '-';
        case 'longitude': return machine.longitude || '-';
        case 'dateAdded': return machine.createdAt ? new Date(machine.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-';
        default: return '';
      }
    }));
    exportData(headers, rows, 'Machine_List', 'Machine Management List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  const uniqueCompanies = useMemo(() => {
    const list = new Set<string>();
    permittedMachines.forEach(m => { if (m.company) list.add(m.company); });
    return Array.from(list).sort();
  }, [permittedMachines]);

  const uniqueBuildings = useMemo(() => {
    const list = new Set<string>();
    permittedMachines.forEach(m => { if (m.building) list.add(m.building); });
    return Array.from(list).sort();
  }, [permittedMachines]);

  const uniqueMakes = useMemo(() => {
    const list = new Set<string>();
    permittedMachines.forEach(m => { if (m.make) list.add(m.make); });
    return Array.from(list).sort();
  }, [permittedMachines]);

  const filterOptions: FilterOption[] = useMemo(() => [
    ...(uniqueCompanies.length > 0 ? [{
      key: 'company',
      label: 'Facility / Company',
      options: uniqueCompanies
    }] : []),
    {
      key: 'status',
      label: 'Status',
      options: ['Online', 'Offline', 'Maintenance', 'Inactive']
    },
    ...(uniqueCategories.length > 0 ? [{
      key: 'category',
      label: 'Category',
      options: uniqueCategories
    }] : []),
    ...(uniqueSubCategories.length > 0 ? [{
      key: 'subCategory',
      label: 'Sub Category',
      options: uniqueSubCategories
    }] : []),
    ...(uniqueBuildings.length > 0 ? [{
      key: 'building',
      label: 'Building / Tower',
      options: uniqueBuildings
    }] : []),
    ...(uniqueMakes.length > 0 ? [{
      key: 'make',
      label: 'Make / Manufacturer',
      options: uniqueMakes
    }] : []),
  ], [uniqueCompanies, uniqueCategories, uniqueSubCategories, uniqueBuildings, uniqueMakes]);

  const filteredMachines = useMemo(() => {
    return permittedMachines.filter(machine => {
      // 1. Global Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesGlobal = 
          (machine.name || '').toLowerCase().includes(q) ||
          (machine.machineCode || '').toLowerCase().includes(q) ||
          (machine.deviceId || '').toLowerCase().includes(q) ||
          (machine.company || '').toLowerCase().includes(q) ||
          (machine.maintenanceHead || '').toLowerCase().includes(q) ||
          (machine.building || '').toLowerCase().includes(q) ||
          (machine.make || '').toLowerCase().includes(q) ||
          (machine.modelNumber || '').toLowerCase().includes(q) ||
          (machine.serialNumber || '').toLowerCase().includes(q) ||
          (machine.machineCategory || '').toLowerCase().includes(q) ||
          (machine.machineSubCategory || '').toLowerCase().includes(q) ||
          (machine.description || '').toLowerCase().includes(q) ||
          (machine.machineOwner || '').toLowerCase().includes(q) ||
          (machine.headOfDepartment || '').toLowerCase().includes(q) ||
          (machine.costCenter || '').toLowerCase().includes(q) ||
          (machine.assetCode || '').toLowerCase().includes(q) ||
          (machine.notes || '').toLowerCase().includes(q);
        if (!matchesGlobal) return false;
      }

      // Active Filters (Customize Filters)
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        if (key === 'company' && (machine.company || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'status' && !(machine.status || 'online').toLowerCase().includes(value.toLowerCase())) return false;
        if (key === 'category' && (machine.machineCategory || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'subCategory' && (machine.machineSubCategory || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'building' && (machine.building || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'make' && (machine.make || '').toLowerCase() !== value.toLowerCase()) return false;
      }

      // 2. Column-wise Filters
      if (columnFilters.name.trim() && !(machine.name || '').toLowerCase().includes(columnFilters.name.toLowerCase().trim())) return false;
      if (columnFilters.machineCode.trim() && !(machine.machineCode || '').toLowerCase().includes(columnFilters.machineCode.toLowerCase().trim())) return false;
      if (columnFilters.deviceId.trim() && !(machine.deviceId || '').toLowerCase().includes(columnFilters.deviceId.toLowerCase().trim())) return false;
      if (columnFilters.company.trim() && (machine.company || '').toLowerCase() !== columnFilters.company.toLowerCase().trim()) return false;
      if (columnFilters.maintenanceHead.trim() && !(machine.maintenanceHead || '').toLowerCase().includes(columnFilters.maintenanceHead.toLowerCase().trim())) return false;
      if (columnFilters.building.trim() && (machine.building || '').toLowerCase() !== columnFilters.building.toLowerCase().trim()) return false;
      if (columnFilters.makeModel.trim()) {
        const combined = `${machine.make || ''} ${machine.modelNumber || ''}`.toLowerCase();
        if (!combined.includes(columnFilters.makeModel.toLowerCase().trim())) return false;
      }
      if (columnFilters.make.trim() && !(machine.make || '').toLowerCase().includes(columnFilters.make.toLowerCase().trim())) return false;
      if (columnFilters.modelNumber.trim() && !(machine.modelNumber || '').toLowerCase().includes(columnFilters.modelNumber.toLowerCase().trim())) return false;
      if (columnFilters.serialNumber.trim() && !(machine.serialNumber || '').toLowerCase().includes(columnFilters.serialNumber.toLowerCase().trim())) return false;
      if (columnFilters.category.trim() && (machine.machineCategory || '').toLowerCase() !== columnFilters.category.toLowerCase().trim()) return false;
      if (columnFilters.subCategory.trim() && (machine.machineSubCategory || '').toLowerCase() !== columnFilters.subCategory.toLowerCase().trim()) return false;
      if (columnFilters.status.trim() && !(machine.status || 'online').toLowerCase().includes(columnFilters.status.toLowerCase().trim())) return false;
      if (columnFilters.description.trim() && !(machine.description || '').toLowerCase().includes(columnFilters.description.toLowerCase().trim())) return false;
      if (columnFilters.machineOwner.trim() && !(machine.machineOwner || '').toLowerCase().includes(columnFilters.machineOwner.toLowerCase().trim())) return false;
      if (columnFilters.headOfDepartment.trim() && !(machine.headOfDepartment || '').toLowerCase().includes(columnFilters.headOfDepartment.toLowerCase().trim())) return false;
      if (columnFilters.costCenter.trim() && !(machine.costCenter || '').toLowerCase().includes(columnFilters.costCenter.toLowerCase().trim())) return false;
      if (columnFilters.notes.trim() && !(machine.notes || '').toLowerCase().includes(columnFilters.notes.toLowerCase().trim())) return false;
      if (columnFilters.locationType.trim()) {
        const typeStr = machine.isLocationPart ? 'part' : 'standalone';
        if (!typeStr.includes(columnFilters.locationType.toLowerCase().trim())) return false;
      }
      if (columnFilters.parentMachine.trim() && !(machine.parentMachine?.name || '').toLowerCase().includes(columnFilters.parentMachine.toLowerCase().trim())) return false;
      if (columnFilters.assetCode.trim() && !(machine.assetCode || '').toLowerCase().includes(columnFilters.assetCode.toLowerCase().trim())) return false;
      if (columnFilters.latitude.trim() && !(machine.latitude || '').toLowerCase().includes(columnFilters.latitude.toLowerCase().trim())) return false;
      if (columnFilters.longitude.trim() && !(machine.longitude || '').toLowerCase().includes(columnFilters.longitude.toLowerCase().trim())) return false;
      if (columnFilters.dateAdded.trim()) {
        const dt = machine.createdAt ? new Date(machine.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '';
        if (!dt.toLowerCase().includes(columnFilters.dateAdded.toLowerCase().trim())) return false;
      }

      return true;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      let valA = '';
      let valB = '';
      const key = sortConfig.key;
      if (key === 'name') { valA = a.name || ''; valB = b.name || ''; }
      else if (key === 'machineCode') { valA = a.machineCode || ''; valB = b.machineCode || ''; }
      else if (key === 'deviceId') { valA = a.deviceId || ''; valB = b.deviceId || ''; }
      else if (key === 'company') { valA = a.company || ''; valB = b.company || ''; }
      else if (key === 'maintenanceHead') { valA = a.maintenanceHead || ''; valB = b.maintenanceHead || ''; }
      else if (key === 'building') { valA = a.building || ''; valB = b.building || ''; }
      else if (key === 'makeModel') { valA = `${a.make || ''} ${a.modelNumber || ''}`; valB = `${b.make || ''} ${b.modelNumber || ''}`; }
      else if (key === 'make') { valA = a.make || ''; valB = b.make || ''; }
      else if (key === 'modelNumber') { valA = a.modelNumber || ''; valB = b.modelNumber || ''; }
      else if (key === 'serialNumber') { valA = a.serialNumber || ''; valB = b.serialNumber || ''; }
      else if (key === 'category') { valA = a.machineCategory || ''; valB = b.machineCategory || ''; }
      else if (key === 'subCategory') { valA = a.machineSubCategory || ''; valB = b.machineSubCategory || ''; }
      else if (key === 'status') { valA = a.status || ''; valB = b.status || ''; }
      else if (key === 'description') { valA = a.description || ''; valB = b.description || ''; }
      else if (key === 'machineOwner') { valA = a.machineOwner || ''; valB = b.machineOwner || ''; }
      else if (key === 'headOfDepartment') { valA = a.headOfDepartment || ''; valB = b.headOfDepartment || ''; }
      else if (key === 'costCenter') { valA = a.costCenter || ''; valB = b.costCenter || ''; }
      else if (key === 'notes') { valA = a.notes || ''; valB = b.notes || ''; }
      else if (key === 'locationType') { valA = a.isLocationPart ? '1' : '0'; valB = b.isLocationPart ? '1' : '0'; }
      else if (key === 'parentMachine') { valA = a.parentMachine?.name || ''; valB = b.parentMachine?.name || ''; }
      else if (key === 'assetCode') { valA = a.assetCode || ''; valB = b.assetCode || ''; }
      else if (key === 'latitude') { valA = a.latitude || ''; valB = b.latitude || ''; }
      else if (key === 'longitude') { valA = a.longitude || ''; valB = b.longitude || ''; }
      else if (key === 'dateAdded') { valA = a.createdAt || ''; valB = b.createdAt || ''; }

      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [machines, searchQuery, columnFilters, sortConfig]);

  const totalItems = filteredMachines.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentMachines = filteredMachines.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Search & Actions Toolbar in One Row */}
      <TableActions
        title="Machine Management"
        subtitle="Centralized register of assets, physical locations, and IoT hardware devices"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search machines by name, code, facility, make..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
        columnCustomizer={
          <ColumnCustomizer
            columns={MACHINE_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="machine_management_table_columns"
          />
        }
        hasActiveColumnFilters={hasActiveColumnFilters}
        onResetColumnFilters={clearAllColumnFilters}
        activeColumnFilterCount={activeFilterCount}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        actionButton={
          canCreate && (
            <button 
              onClick={() => navigate('/machine-management/new')}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#00a651] hover:bg-[#009040] active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Machine</span>
            </button>
          )
        }
      />

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider whitespace-nowrap">
              {/* Column Title Row - Tapping main columns toggles filter row */}
              <tr 
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="cursor-pointer select-none hover:bg-slate-100/60 transition-colors whitespace-nowrap"
                title={showColumnFilters ? "Click column header to hide filters" : "Click column header to show filters"}
              >
                {/* General Details */}
                {visibleColumns.includes('name') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Machine Name</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('name'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Machine Name"
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

                {visibleColumns.includes('machineCode') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Machine Code</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('machineCode'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Machine Code"
                      >
                        {sortConfig?.key === 'machineCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('category') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('category'); }}
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
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Sub-Category</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('subCategory'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Sub-Category"
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

                {visibleColumns.includes('status') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('status'); }}
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

                {visibleColumns.includes('description') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Description</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('description'); }}
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

                {visibleColumns.includes('machineOwner') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Machine Owner</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('machineOwner'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Machine Owner"
                      >
                        {sortConfig?.key === 'machineOwner' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('headOfDepartment') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Head of Department</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('headOfDepartment'); }}
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

                {visibleColumns.includes('costCenter') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Cost Center</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('costCenter'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Cost Center"
                      >
                        {sortConfig?.key === 'costCenter' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('notes') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Notes</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('notes'); }}
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

                {/* Location Details */}
                {visibleColumns.includes('company') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('company'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility"
                      >
                        {sortConfig?.key === 'company' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('building') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Sub-Facility</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('building'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Sub-Facility"
                      >
                        {sortConfig?.key === 'building' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('maintenanceHead') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility Head</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('maintenanceHead'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility Head"
                      >
                        {sortConfig?.key === 'maintenanceHead' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('locationType') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Location Type</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('locationType'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Location Type"
                      >
                        {sortConfig?.key === 'locationType' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('parentMachine') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Parent Machine</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('parentMachine'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Parent Machine"
                      >
                        {sortConfig?.key === 'parentMachine' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('latitude') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Latitude</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('latitude'); }}
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
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Longitude</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('longitude'); }}
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

                {/* Technical Specs & IoT */}
                {visibleColumns.includes('makeModel') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Make & Model</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('makeModel'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Make & Model"
                      >
                        {sortConfig?.key === 'makeModel' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('make') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Make</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('make'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Make"
                      >
                        {sortConfig?.key === 'make' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('modelNumber') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Model Number</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('modelNumber'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Model Number"
                      >
                        {sortConfig?.key === 'modelNumber' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('serialNumber') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Serial Number</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('serialNumber'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Serial Number"
                      >
                        {sortConfig?.key === 'serialNumber' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('assetCode') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Asset Code</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('assetCode'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Asset Code"
                      >
                        {sortConfig?.key === 'assetCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('deviceId') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>MAC ID</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('deviceId'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by MAC ID"
                      >
                        {sortConfig?.key === 'deviceId' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {/* System */}
                {visibleColumns.includes('dateAdded') && (
                  <th className="px-3.5 py-2.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Date Added</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('dateAdded'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Date Added"
                      >
                        {sortConfig?.key === 'dateAdded' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('action') && (
                  <th className="px-3.5 py-2.5 text-right">
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
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title={showColumnFilters ? 'Click to hide column filters' : 'Click to show column filters'}
                      >
                        <Filter size={10} className={hasActiveColumnFilters ? 'text-blue-600' : 'text-slate-500'} />
                        <span>{showColumnFilters ? 'Hide' : 'Filter'}</span>
                      </button>
                    </div>
                  </th>
                )}
              </tr>

              {/* Column Filters Row */}
              {showColumnFilters && (
                <tr className="bg-blue-50/40 border-t border-blue-100/60 lowercase normal-case tracking-normal">
                  {/* Machine Name filter */}
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

                  {/* Machine Code filter */}
                  {visibleColumns.includes('machineCode') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.machineCode}
                          onChange={(e) => handleColumnFilterChange('machineCode', e.target.value)}
                          placeholder="Filter code..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.machineCode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('machineCode', '')}
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
                          {uniqueCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Sub-Category filter */}
                  {visibleColumns.includes('subCategory') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.subCategory}
                          onChange={(e) => handleColumnFilterChange('subCategory', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs cursor-pointer"
                        >
                          <option value="">All Sub-Categories</option>
                          {uniqueSubCategories.map((subCat) => (
                            <option key={subCat} value={subCat}>{subCat}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Status filter */}
                  {visibleColumns.includes('status') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.status}
                        onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                        placeholder="Filter status..."
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

                  {/* Machine Owner filter */}
                  {visibleColumns.includes('machineOwner') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.machineOwner}
                        onChange={(e) => handleColumnFilterChange('machineOwner', e.target.value)}
                        placeholder="Filter owner..."
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

                  {/* Cost Center filter */}
                  {visibleColumns.includes('costCenter') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.costCenter}
                        onChange={(e) => handleColumnFilterChange('costCenter', e.target.value)}
                        placeholder="Filter CC..."
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

                  {/* Facility filter */}
                  {visibleColumns.includes('company') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.company}
                          onChange={(e) => handleColumnFilterChange('company', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs cursor-pointer"
                        >
                          <option value="">All Facilities</option>
                          {uniqueFacilities.map((fac) => (
                            <option key={fac} value={fac}>{fac}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Sub-Facility filter */}
                  {visibleColumns.includes('building') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.building}
                          onChange={(e) => handleColumnFilterChange('building', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs cursor-pointer"
                        >
                          <option value="">All Sub-Facilities</option>
                          {uniqueSubFacilities.map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Maintenance Head filter */}
                  {visibleColumns.includes('maintenanceHead') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.maintenanceHead}
                        onChange={(e) => handleColumnFilterChange('maintenanceHead', e.target.value)}
                        placeholder="Filter head..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Location Type filter */}
                  {visibleColumns.includes('locationType') && (
                    <th className="px-3 py-2 font-normal">
                      <select
                        value={columnFilters.locationType}
                        onChange={(e) => handleColumnFilterChange('locationType', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs cursor-pointer"
                      >
                        <option value="">All Types</option>
                        <option value="part">Part of Location</option>
                        <option value="standalone">Standalone</option>
                      </select>
                    </th>
                  )}

                  {/* Parent Machine filter */}
                  {visibleColumns.includes('parentMachine') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.parentMachine}
                        onChange={(e) => handleColumnFilterChange('parentMachine', e.target.value)}
                        placeholder="Filter parent..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Latitude filter */}
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

                  {/* Longitude filter */}
                  {visibleColumns.includes('longitude') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.longitude}
                        onChange={(e) => handleColumnFilterChange('longitude', e.target.value)}
                        placeholder="Filter lon..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Make & Model filter */}
                  {visibleColumns.includes('makeModel') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.makeModel}
                        onChange={(e) => handleColumnFilterChange('makeModel', e.target.value)}
                        placeholder="Filter make/model..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Make filter */}
                  {visibleColumns.includes('make') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.make}
                        onChange={(e) => handleColumnFilterChange('make', e.target.value)}
                        placeholder="Filter make..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Model Number filter */}
                  {visibleColumns.includes('modelNumber') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.modelNumber}
                        onChange={(e) => handleColumnFilterChange('modelNumber', e.target.value)}
                        placeholder="Filter model..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Serial Number filter */}
                  {visibleColumns.includes('serialNumber') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.serialNumber}
                        onChange={(e) => handleColumnFilterChange('serialNumber', e.target.value)}
                        placeholder="Filter serial..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Asset Code filter */}
                  {visibleColumns.includes('assetCode') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.assetCode}
                        onChange={(e) => handleColumnFilterChange('assetCode', e.target.value)}
                        placeholder="Filter asset..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* MAC ID filter */}
                  {visibleColumns.includes('deviceId') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.deviceId}
                        onChange={(e) => handleColumnFilterChange('deviceId', e.target.value)}
                        placeholder="Filter MAC..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Date Added filter */}
                  {visibleColumns.includes('dateAdded') && (
                    <th className="px-3 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.dateAdded}
                        onChange={(e) => handleColumnFilterChange('dateAdded', e.target.value)}
                        placeholder="Filter date..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
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
                <TableSkeleton columns={visibleColumns.length} rows={rowsPerPage} />
              ) : currentMachines.length > 0 ? (
                currentMachines.map((machine, index) => (
                  <tr 
                    key={machine.id || index} 
                    className={`hover:bg-blue-50/40 transition-colors group ${((canEdit && hasAssetPermission(user, machine, 'edit')) || (canView && hasAssetPermission(user, machine, 'view'))) ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if ((canEdit && hasAssetPermission(user, machine, 'edit')) || (canView && hasAssetPermission(user, machine, 'view'))) {
                        navigate(`/machine-management/edit/${machine.id}`, { state: { tab: 'General' } });
                      }
                    }}
                  >
                    {/* General Details */}
                    {visibleColumns.includes('name') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {machine.name || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('machineCode') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {machine.machineCode ? (
                          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                            {machine.machineCode}
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.includes('category') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {machine.machineCategory ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
                            {machine.machineCategory}
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.includes('subCategory') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {machine.machineSubCategory ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                            {machine.machineSubCategory}
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.includes('status') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {machine.status || 'Online'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('description') && (
                      <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate" title={machine.description || ''}>
                        {machine.description || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('machineOwner') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                        {machine.machineOwner || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('headOfDepartment') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                        {machine.headOfDepartment || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('costCenter') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 font-mono text-xs">
                        {machine.costCenter || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('notes') && (
                      <td className="px-3.5 py-2.5 text-slate-500 max-w-xs truncate" title={machine.notes || ''}>
                        {machine.notes || '-'}
                      </td>
                    )}

                    {/* Location Details */}
                    {visibleColumns.includes('company') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                        {machine.company || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('building') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                        {machine.building || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('maintenanceHead') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                        {machine.maintenanceHead || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('locationType') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          machine.isLocationPart 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {machine.isLocationPart ? 'Part of Location' : 'Standalone'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('parentMachine') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                        {machine.parentMachine?.name || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('latitude') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {machine.latitude || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('longitude') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {machine.longitude || '-'}
                      </td>
                    )}

                    {/* Technical Specs & IoT */}
                    {visibleColumns.includes('makeModel') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                        {machine.make || machine.modelNumber ? `${machine.make || ''} ${machine.modelNumber ? `(${machine.modelNumber})` : ''}`.trim() : '-'}
                      </td>
                    )}
                    {visibleColumns.includes('make') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                        {machine.make || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('modelNumber') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                        {machine.modelNumber || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('serialNumber') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-xs text-slate-600">
                        {machine.serialNumber || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('assetCode') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-xs text-slate-700">
                        {machine.assetCode || '-'}
                      </td>
                    )}
                    {visibleColumns.includes('deviceId') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-xs text-slate-600">
                        {machine.deviceId || '-'}
                      </td>
                    )}

                    {/* System */}
                    {visibleColumns.includes('dateAdded') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500">
                        {machine.createdAt ? new Date(machine.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                      </td>
                    )}
                    {visibleColumns.includes('action') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(!canEdit || !hasAssetPermission(user, machine, 'edit')) && (canView && hasAssetPermission(user, machine, 'view')) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/machine-management/edit/${machine.id}`, { state: { tab: 'General' } });
                              }}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer" title="View Machine"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && hasAssetPermission(user, machine, 'edit') && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/machine-management/edit/${machine.id}`, { state: { tab: 'General' } });
                              }}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer" title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setGiveAccessTarget({
                                id: machine.id,
                                name: machine.name,
                                code: machine.machineCode,
                                category: machine.machineCategory,
                              });
                            }}
                            className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer" 
                            title="Give Access / Assign Users"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          {canEdit && hasAssetPermission(user, machine, 'edit') && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMachineToMove(machine);
                                setIsMoveModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer" 
                              title="Move Machine to Facility"
                            >
                              <FolderInput className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && hasAssetPermission(user, machine, 'delete') && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(machine.id);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer" title="Delete"
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
                  <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-slate-500 bg-slate-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                        <Cpu className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-900 mb-1">
                        {hasActiveColumnFilters || searchQuery ? 'No matching machines found' : 'No machines found'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {hasActiveColumnFilters || searchQuery 
                          ? 'Try adjusting or clearing your column filters or search term to see more results.'
                          : 'Get started by adding a new machine or hardware asset to the system.'}
                      </p>
                      {(hasActiveColumnFilters || searchQuery) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            clearAllColumnFilters();
                          }}
                          className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <RotateCcw size={12} />
                          <span>Clear All Filters</span>
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
        title="Delete Machine"
        message="Are you sure you want to delete this machine? This action cannot be undone."
        onClose={() => {
          setDeleteModalOpen(false);
          setMachineToDelete(null);
        }}
        onConfirm={handleDelete}
      />

      <MoveMachineModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setSelectedMachineToMove(null);
        }}
        machine={selectedMachineToMove}
        onSuccess={fetchMachines}
      />

      {giveAccessTarget && (
        <GiveAccessModal
          isOpen={!!giveAccessTarget}
          onClose={() => setGiveAccessTarget(null)}
          targetType="machine"
          targetId={giveAccessTarget.id}
          targetName={giveAccessTarget.name}
          targetCode={giveAccessTarget.code}
          targetCategory={giveAccessTarget.category}
          onSuccess={fetchMachines}
        />
      )}
    </div>
  );
}
