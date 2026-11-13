import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  FileText,
  Send,
  Trash2,
  X,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckSquare,
  Package,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scheduleService, type MaintenanceSchedule } from '../../../services/scheduleService';
import { AddScheduleCardModal } from '../../../components/schedules/AddScheduleCardModal';
import { CheckpointMasterModal } from '../../../components/checkpoints/CheckpointMasterModal';
import { workOrderService } from '../../../services/workOrderService';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { TableActions } from '../../../components/shared/TableActions';
import type { FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission } from '../../../utils/permissions';
import { ColumnCustomizer, type ColumnDefinition } from '../../../components/shared/ColumnCustomizer';

const SCHEDULE_COLUMNS: ColumnDefinition[] = [
  { id: 'no', label: 'No.', category: 'General', defaultVisible: false },
  { id: 'scheduleCode', label: 'Schedule Code', category: 'General', required: true, defaultVisible: true },
  { id: 'scheduleType', label: 'Type & Frequency', category: 'Schedule Rules', defaultVisible: true },
  { id: 'priority', label: 'Priority', category: 'General', defaultVisible: true },
  { id: 'machine', label: 'Machine Details', category: 'Asset Info', defaultVisible: true },
  { id: 'facility', label: 'Facility & Building', category: 'Asset Info', defaultVisible: true },
  { id: 'startDate', label: 'Start Date', category: 'Schedule Rules', defaultVisible: false },
  { id: 'triggerTime', label: 'Trigger Time', category: 'Schedule Rules', defaultVisible: false },
  { id: 'nextRunDate', label: 'Next Run Date', category: 'Execution', defaultVisible: true },
  { id: 'lastRunDate', label: 'Last Run Date', category: 'Execution', defaultVisible: false },
  { id: 'tolerances', label: 'Plan Tolerances (±Days)', category: 'Schedule Rules', defaultVisible: false },
  { id: 'checkpoints', label: 'Check Points / Tasks', category: 'Tasks & Spares', defaultVisible: false },
  { id: 'spares', label: 'Required Spares', category: 'Tasks & Spares', defaultVisible: false },
  { id: 'notifyUsers', label: 'Notification Users', category: 'Assignment', defaultVisible: false },
  { id: 'notes', label: 'Notes / Instructions', category: 'General', defaultVisible: false },
  { id: 'status', label: 'Status', category: 'General', defaultVisible: true },
  { id: 'createdAt', label: 'Created At', category: 'Metadata', defaultVisible: false },
  { id: 'action', label: 'Action', category: 'General', required: true, defaultVisible: true },
];

const DEFAULT_VISIBLE_COLUMNS = SCHEDULE_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.id);

export function ScheduleMaintenanceDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const canCreate = hasPermission(user, 'schedules', 'create');
  const canExport = hasPermission(user, 'schedules', 'export');
  const canPrint = hasPermission(user, 'schedules', 'print');

  const [activeTypeTab, setActiveTypeTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Column Visibility Customization
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('schedule_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  // Column-wise filters and sorting state
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    scheduleCode: '',
    scheduleType: '',
    frequency: '',
    priority: '',
    machine: '',
    facility: '',
    status: '',
    startDate: '',
    triggerTime: '',
    notes: '',
  });

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [selectedMachineForCheckpoint, setSelectedMachineForCheckpoint] = useState<number>(1);
  const [scheduleToDelete, setScheduleToDelete] = useState<MaintenanceSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters, activeTypeTab, columnFilters]);

  useEffect(() => {
    fetchSchedulesData();
    fetchMachines();
  }, [activeTypeTab]);

  const fetchSchedulesData = async () => {
    setLoading(true);
    try {
      const data = await scheduleService.getSchedules({ type: activeTypeTab });
      if (data && Array.isArray(data)) {
        setSchedules(data);
      } else {
        setSchedules(getMockSchedules());
      }
    } catch (err) {
      setSchedules(getMockSchedules());
    } finally {
      setLoading(false);
    }
  };

  const fetchMachines = async () => {
    try {
      const data = await workOrderService.lookupPublicMachine('1');
      if (data) setMachinesList([data]);
    } catch (err) {
      setMachinesList([]);
    }
  };

  const getMockSchedules = (): MaintenanceSchedule[] => [
    {
      id: 1,
      scheduleCode: 'SCH-2026-0001',
      scheduleType: 'PREVENTIVE',
      frequency: 'MONTHLY',
      priority: 'HIGH',
      status: 'ACTIVE',
      machineId: 1,
      machine: {
        id: 1,
        name: 'Primary Domestic Booster Pump #01',
        machineCode: 'MCH-HYPN-001',
        make: 'Grundfos',
        modelNumber: 'CRN-15-08',
        facility: { facilityName: 'Main Plant Basement-03' },
        building: { name: 'Tower A' },
      },
      prePlanToleranceDays: 2,
      postPlanToleranceDays: 2,
      triggerTime: '09:00',
      startDate: new Date().toISOString(),
      nextRunDate: new Date(Date.now() + 86400000 * 12).toISOString(),
      completedBy: 'Rajesh Kumar (Sr. Tech)',
      notes: 'Bi-monthly preventive pump shaft alignment and bearing vibration check',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      scheduleCode: 'SCH-2026-0002',
      scheduleType: 'PREDICTIVE',
      frequency: 'QUARTERLY',
      priority: 'CRITICAL',
      status: 'ACTIVE',
      machineId: 2,
      machine: {
        id: 2,
        name: 'STP Submersible Sump Pump #02',
        machineCode: 'MCH-STP-002',
        make: 'Kirloskar',
        modelNumber: 'dSub-400',
        facility: { facilityName: 'STP Plant Facility' },
        building: { name: 'STP Complex' },
      },
      prePlanToleranceDays: 3,
      postPlanToleranceDays: 3,
      triggerTime: '10:00',
      startDate: new Date().toISOString(),
      nextRunDate: new Date(Date.now() + 86400000 * 28).toISOString(),
      completedBy: 'Anil Verma (Vibration Specialist)',
      notes: 'Predictive thermography & 3-axis vibration spectrum diagnostic schedule',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      scheduleCode: 'SCH-2026-0003',
      scheduleType: 'CONDITION',
      frequency: 'WEEKLY',
      priority: 'MEDIUM',
      status: 'ACTIVE',
      machineId: 3,
      machine: {
        id: 3,
        name: 'Terrace Flushing Booster System',
        machineCode: 'MCH-FIRE-003',
        make: 'Wilo',
        modelNumber: 'Helix-V',
        facility: { facilityName: 'Flushing System Facility' },
        building: { name: 'Tower B' },
      },
      prePlanToleranceDays: 1,
      postPlanToleranceDays: 1,
      triggerTime: '08:30',
      startDate: new Date().toISOString(),
      nextRunDate: new Date(Date.now() + 86400000 * 4).toISOString(),
      completedBy: 'Suresh Patil (Technician)',
      notes: 'Condition-based differential pressure switch calibration and filter mesh check',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const handleColumnFilterChange = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      scheduleCode: '',
      scheduleType: '',
      frequency: '',
      priority: '',
      machine: '',
      facility: '',
      status: '',
      startDate: '',
      triggerTime: '',
      notes: '',
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

  const uniqueFacilities = useMemo(() => {
    const list = new Set<string>();
    schedules.forEach(s => {
      const fac = s.machine?.facility?.facilityName || s.machine?.building?.name;
      if (fac) list.add(fac);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [schedules]);

  const uniqueStatuses = useMemo(() => {
    const list = new Set<string>();
    schedules.forEach(s => {
      if (s.status) list.add(s.status);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    let result = schedules.filter(sch => {
      // 1. Filter by Active Type Tab
      if (activeTypeTab !== 'ALL' && sch.scheduleType !== activeTypeTab) return false;

      // 2. Filter by Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCode = sch.scheduleCode?.toLowerCase().includes(q);
        const matchMachine = sch.machine?.name?.toLowerCase().includes(q);
        const matchNotes = sch.notes?.toLowerCase().includes(q);
        if (!matchCode && !matchMachine && !matchNotes) return false;
      }

      // 3. Filter by Active Filters (Customize Filters)
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value || value === 'All') continue;
        if (key === 'facility') {
          const facName = sch.machine?.facility?.facilityName || '';
          const bldName = sch.machine?.building?.name || '';
          const full = `${facName} ${bldName}`.toLowerCase();
          const target = value.toLowerCase();
          if (facName.toLowerCase() !== target && bldName.toLowerCase() !== target && !full.includes(target)) {
            return false;
          }
        } else if (key === 'machine') {
          const mName = sch.machine?.name || '';
          const mCode = sch.machine?.machineCode || '';
          const mMake = sch.machine?.make || '';
          const target = value.toLowerCase();
          if (mName.toLowerCase() !== target && !mName.toLowerCase().includes(target) && !mCode.toLowerCase().includes(target) && !mMake.toLowerCase().includes(target)) {
            return false;
          }
        } else if (key === 'scheduleType') {
          if (sch.scheduleType?.toUpperCase() !== value.toUpperCase()) return false;
        } else if (key === 'frequency') {
          if (sch.frequency?.toUpperCase() !== value.toUpperCase()) return false;
        } else if (key === 'priority') {
          if (sch.priority?.toUpperCase() !== value.toUpperCase()) return false;
        } else if (key === 'status') {
          if (sch.status?.toUpperCase() !== value.toUpperCase()) return false;
        } else if (sch[key as keyof MaintenanceSchedule]?.toString().toUpperCase() !== value.toUpperCase()) {
          return false;
        }
      }

      // 4. Column Filters
      if (columnFilters.scheduleCode && !sch.scheduleCode?.toLowerCase().includes(columnFilters.scheduleCode.toLowerCase())) {
        return false;
      }
      if (columnFilters.scheduleType && sch.scheduleType?.toUpperCase() !== columnFilters.scheduleType.toUpperCase()) {
        return false;
      }
      if (columnFilters.frequency && sch.frequency?.toUpperCase() !== columnFilters.frequency.toUpperCase()) {
        return false;
      }
      if (columnFilters.priority && sch.priority?.toUpperCase() !== columnFilters.priority.toUpperCase()) {
        return false;
      }
      if (columnFilters.machine) {
        const mStr = `${sch.machine?.name || ''} ${sch.machine?.make || ''} ${sch.machine?.modelNumber || ''}`.toLowerCase();
        if (!mStr.includes(columnFilters.machine.toLowerCase())) return false;
      }
      if (columnFilters.facility) {
        const facStr = `${sch.machine?.facility?.facilityName || ''} ${sch.machine?.building?.name || ''}`.toLowerCase();
        if (!facStr.includes(columnFilters.facility.toLowerCase())) return false;
      }
      if (columnFilters.status && sch.status?.toUpperCase() !== columnFilters.status.toUpperCase()) {
        return false;
      }
      if (columnFilters.startDate && !sch.startDate?.toLowerCase().includes(columnFilters.startDate.toLowerCase())) {
        return false;
      }
      if (columnFilters.triggerTime && !sch.triggerTime?.toLowerCase().includes(columnFilters.triggerTime.toLowerCase())) {
        return false;
      }
      if (columnFilters.notes && !sch.notes?.toLowerCase().includes(columnFilters.notes.toLowerCase())) {
        return false;
      }

      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aVal = '';
        let bVal = '';

        if (sortConfig.key === 'scheduleCode') {
          aVal = a.scheduleCode || '';
          bVal = b.scheduleCode || '';
        } else if (sortConfig.key === 'scheduleType') {
          aVal = a.scheduleType || '';
          bVal = b.scheduleType || '';
        } else if (sortConfig.key === 'priority') {
          aVal = a.priority || '';
          bVal = b.priority || '';
        } else if (sortConfig.key === 'machine') {
          aVal = a.machine?.name || '';
          bVal = b.machine?.name || '';
        } else if (sortConfig.key === 'facility') {
          aVal = a.machine?.facility?.facilityName || '';
          bVal = b.machine?.facility?.facilityName || '';
        } else if (sortConfig.key === 'startDate') {
          aVal = a.startDate || '';
          bVal = b.startDate || '';
        } else if (sortConfig.key === 'triggerTime') {
          aVal = a.triggerTime || '';
          bVal = b.triggerTime || '';
        } else if (sortConfig.key === 'nextRunDate') {
          aVal = a.nextRunDate || '';
          bVal = b.nextRunDate || '';
        } else if (sortConfig.key === 'lastRunDate') {
          aVal = a.lastRunDate || '';
          bVal = b.lastRunDate || '';
        } else if (sortConfig.key === 'status') {
          aVal = a.status || '';
          bVal = b.status || '';
        } else if (sortConfig.key === 'createdAt') {
          aVal = a.createdAt || '';
          bVal = b.createdAt || '';
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [schedules, activeTypeTab, searchQuery, activeFilters, columnFilters, sortConfig]);

  // Pagination logic
  const totalItems = filteredSchedules.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentSchedules = filteredSchedules.slice(startIndex, endIndex);

  // Dynamic Machines list for filters
  const uniqueMachines = useMemo(() => {
    const list = new Set<string>();
    schedules.forEach(s => {
      const m = s.machine?.name;
      if (m) list.add(m);
    });
    return Array.from(list).sort();
  }, [schedules]);

  // Dynamic Filters for Customize Filters modal
  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'scheduleType',
      label: 'Schedule Type',
      options: ['PREVENTIVE', 'PREDICTIVE', 'CONDITION', 'BREAKDOWN']
    },
    {
      key: 'frequency',
      label: 'Frequency',
      options: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']
    },
    {
      key: 'priority',
      label: 'Priority',
      options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    },
    {
      key: 'status',
      label: 'Status',
      options: ['ACTIVE', 'PAUSED', 'INACTIVE', 'COMPLETED']
    },
    ...(uniqueFacilities.length > 0 ? [{
      key: 'facility',
      label: 'Facility',
      options: uniqueFacilities
    }] : []),
    ...(uniqueMachines.length > 0 ? [{
      key: 'machine',
      label: 'Machine / Asset',
      options: uniqueMachines
    }] : []),
  ], [uniqueFacilities, uniqueMachines]);

  const handleExport = (format: 'pdf' | 'excel') => {
    const exportableColumns = SCHEDULE_COLUMNS.filter(c => c.id !== 'action' && visibleColumns.includes(c.id));
    const headers = exportableColumns.map(c => c.label);
    const rows = filteredSchedules.map((sch, idx) => exportableColumns.map(col => {
      switch (col.id) {
        case 'no': return (idx + 1).toString();
        case 'scheduleCode': return sch.scheduleCode || '';
        case 'scheduleType': return `${sch.scheduleType || ''} (${sch.frequency || ''})`;
        case 'priority': return sch.priority || '';
        case 'machine': return `${sch.machine?.name || ''} ${sch.machine?.make ? `(${sch.machine.make})` : ''}`;
        case 'facility': return `${sch.machine?.facility?.facilityName || 'Main Plant'} / ${sch.machine?.building?.name || 'Tower A'}`;
        case 'startDate': return sch.startDate ? new Date(sch.startDate).toLocaleDateString() : '-';
        case 'triggerTime': return sch.triggerTime || '-';
        case 'nextRunDate': return sch.nextRunDate ? new Date(sch.nextRunDate).toLocaleDateString() : 'Pending';
        case 'lastRunDate': return sch.lastRunDate ? new Date(sch.lastRunDate).toLocaleDateString() : 'Never';
        case 'tolerances': return `Pre: ±${sch.prePlanToleranceDays || 1}d, Post: ±${sch.postPlanToleranceDays || 1}d`;
        case 'checkpoints': return `${sch.tasks?.length || 0} tasks`;
        case 'spares': return `${sch.spares?.length || 0} spares`;
        case 'notifyUsers': return Array.isArray(sch.notifyUsers) ? sch.notifyUsers.join(', ') : (sch.notifyUsers || '-');
        case 'notes': return sch.notes || '-';
        case 'status': return sch.status || '';
        case 'createdAt': return sch.createdAt ? new Date(sch.createdAt).toLocaleDateString() : '-';
        default: return '';
      }
    }));
    exportData(headers, rows, 'Schedule_Maintenance_List', 'Schedule Maintenance List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTriggerWO = async (schedId: number) => {
    try {
      const res = await scheduleService.triggerScheduleWO(schedId);
      toast.success(
        `Work Order #${res.workOrder?.woNumber || 'WO-2026-XXXX'} triggered! Notifications dispatched.`
      );
      fetchSchedulesData();
    } catch (err: any) {
      toast.error('Failed to trigger work order from schedule.');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    setDeletingSchedule(true);
    try {
      await scheduleService.deleteSchedule(scheduleToDelete.id);
      toast.success('Maintenance schedule deleted successfully');
      setScheduleToDelete(null);
      fetchSchedulesData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete maintenance schedule');
    } finally {
      setDeletingSchedule(false);
    }
  };

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Table Actions Toolbar in One Row */}
      <TableActions
        title="Schedule Maintenance"
        subtitle="Manage recurring preventive, predictive, and condition-based maintenance routines"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search schedules..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
        columnCustomizer={
          <ColumnCustomizer
            columns={SCHEDULE_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="schedule_table_columns"
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
              onClick={() => {
                setSelectedMachineForCheckpoint(1);
                setShowCheckpointModal(true);
              }}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold rounded-lg text-xs transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <FileText size={14} className="text-cyan-400" />
              <span>Create Checkpoint</span>
            </button>
            {canCreate && (
              <button
                onClick={() => navigate('/schedules/new')}
                className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#00a651] hover:bg-[#009040] active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Schedule</span>
              </button>
            )}
          </div>
        }
      />

      {/* Schedule Type Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full mb-4 print:hidden">
        {[
          { id: 'ALL', label: 'All Schedules' },
          { id: 'PREVENTIVE', label: 'Preventive' },
          { id: 'PREDICTIVE', label: 'Predictive' },
          { id: 'CONDITION', label: 'Condition Based' },
          { id: 'BREAKDOWN', label: 'Breakdown Routines' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTypeTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTypeTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Master Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-semibold text-xs border-b border-gray-200 whitespace-nowrap">
              {/* Column Title Row - Tapping main columns toggles filter row */}
              <tr 
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="cursor-pointer select-none hover:bg-slate-100/60 transition-colors whitespace-nowrap"
                title={showColumnFilters ? "Click column header to hide filters" : "Click column header to show filters"}
              >
                {visibleColumns.includes('no') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap text-center text-xs font-semibold text-gray-500 w-12 select-none">
                    No.
                  </th>
                )}

                {visibleColumns.includes('scheduleCode') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Schedule Code</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('scheduleCode');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Schedule Code"
                      >
                        {sortConfig?.key === 'scheduleCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('scheduleType') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Type & Frequency</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('scheduleType');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Type & Frequency"
                      >
                        {sortConfig?.key === 'scheduleType' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('priority') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Priority</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('priority');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Priority"
                      >
                        {sortConfig?.key === 'priority' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('machine') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Machine Details</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('machine');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Machine Details"
                      >
                        {sortConfig?.key === 'machine' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('facility') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility & Building</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('facility');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility & Building"
                      >
                        {sortConfig?.key === 'facility' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('startDate') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Start Date</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('startDate');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Start Date"
                      >
                        {sortConfig?.key === 'startDate' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('triggerTime') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Trigger Time</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('triggerTime');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Trigger Time"
                      >
                        {sortConfig?.key === 'triggerTime' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('nextRunDate') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Next Run Date</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('nextRunDate');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Next Run Date"
                      >
                        {sortConfig?.key === 'nextRunDate' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('lastRunDate') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Last Run Date</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('lastRunDate');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Last Run Date"
                      >
                        {sortConfig?.key === 'lastRunDate' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('tolerances') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <span>Plan Tolerances</span>
                  </th>
                )}

                {visibleColumns.includes('checkpoints') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <span>Check Points</span>
                  </th>
                )}

                {visibleColumns.includes('spares') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <span>Required Spares</span>
                  </th>
                )}

                {visibleColumns.includes('notifyUsers') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <span>Notification Users</span>
                  </th>
                )}

                {visibleColumns.includes('notes') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <span>Notes / Instructions</span>
                  </th>
                )}

                {visibleColumns.includes('status') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
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
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Created At</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('createdAt');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Created At"
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
                  <th className="px-3.5 py-2.5 whitespace-nowrap text-right">
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
                  {/* No. Column Filter placeholder */}
                  {visibleColumns.includes('no') && (
                    <th className="px-3 py-2 font-normal text-center"></th>
                  )}

                  {/* Schedule Code Filter */}
                  {visibleColumns.includes('scheduleCode') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.scheduleCode || ''}
                          onChange={(e) => handleColumnFilterChange('scheduleCode', e.target.value)}
                          placeholder="Filter code..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.scheduleCode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('scheduleCode', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Type & Frequency Filter */}
                  {visibleColumns.includes('scheduleType') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="flex flex-col gap-1">
                        <div className="relative">
                          <select
                            value={columnFilters.scheduleType || ''}
                            onChange={(e) => handleColumnFilterChange('scheduleType', e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs"
                          >
                            <option value="">All Types</option>
                            <option value="PREVENTIVE">Preventive</option>
                            <option value="PREDICTIVE">Predictive</option>
                            <option value="CONDITION">Condition</option>
                            <option value="BREAKDOWN">Breakdown</option>
                          </select>
                        </div>
                        <div className="relative">
                          <select
                            value={columnFilters.frequency || ''}
                            onChange={(e) => handleColumnFilterChange('frequency', e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs"
                          >
                            <option value="">All Frequencies</option>
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="QUARTERLY">Quarterly</option>
                            <option value="YEARLY">Yearly</option>
                          </select>
                        </div>
                      </div>
                    </th>
                  )}

                  {/* Priority Filter */}
                  {visibleColumns.includes('priority') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.priority || ''}
                          onChange={(e) => handleColumnFilterChange('priority', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Priorities</option>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                        {columnFilters.priority && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('priority', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Machine Details Filter */}
                  {visibleColumns.includes('machine') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.machine || ''}
                          onChange={(e) => handleColumnFilterChange('machine', e.target.value)}
                          placeholder="Filter machine..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.machine && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('machine', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Facility & Building Filter */}
                  {visibleColumns.includes('facility') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.facility || ''}
                          onChange={(e) => handleColumnFilterChange('facility', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Facilities</option>
                          {uniqueFacilities.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        {columnFilters.facility && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('facility', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Start Date Filter */}
                  {visibleColumns.includes('startDate') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.startDate || ''}
                          onChange={(e) => handleColumnFilterChange('startDate', e.target.value)}
                          placeholder="Filter start date..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                      </div>
                    </th>
                  )}

                  {/* Trigger Time Filter */}
                  {visibleColumns.includes('triggerTime') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.triggerTime || ''}
                          onChange={(e) => handleColumnFilterChange('triggerTime', e.target.value)}
                          placeholder="Filter time..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                      </div>
                    </th>
                  )}

                  {/* Next Run Date */}
                  {visibleColumns.includes('nextRunDate') && (
                    <th className="px-3 py-2 font-normal"></th>
                  )}

                  {/* Last Run Date */}
                  {visibleColumns.includes('lastRunDate') && (
                    <th className="px-3 py-2 font-normal"></th>
                  )}

                  {/* Plan Tolerances */}
                  {visibleColumns.includes('tolerances') && (
                    <th className="px-3 py-2 font-normal"></th>
                  )}

                  {/* Check Points */}
                  {visibleColumns.includes('checkpoints') && (
                    <th className="px-3 py-2 font-normal"></th>
                  )}

                  {/* Required Spares */}
                  {visibleColumns.includes('spares') && (
                    <th className="px-3 py-2 font-normal"></th>
                  )}

                  {/* Notification Users */}
                  {visibleColumns.includes('notifyUsers') && (
                    <th className="px-3 py-2 font-normal"></th>
                  )}

                  {/* Notes Filter */}
                  {visibleColumns.includes('notes') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.notes || ''}
                          onChange={(e) => handleColumnFilterChange('notes', e.target.value)}
                          placeholder="Filter notes..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                      </div>
                    </th>
                  )}

                  {/* Status Filter */}
                  {visibleColumns.includes('status') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.status || ''}
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

                  {/* Created At */}
                  {visibleColumns.includes('createdAt') && (
                    <th className="px-3 py-2 font-normal"></th>
                  )}

                  {/* Action filter / clear */}
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
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <TableSkeleton columns={visibleColumns.length} rows={5} />
              ) : currentSchedules.length > 0 ? (
                currentSchedules.map((sch, index) => (
                  <tr
                    key={sch.id}
                    onClick={() => navigate(`/schedules/edit/${sch.id}`)}
                    className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                  >
                    {/* No. */}
                    {visibleColumns.includes('no') && (
                      <td className="px-3.5 py-2.5 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                        {startIndex + index + 1}
                      </td>
                    )}

                    {/* Schedule Code */}
                    {visibleColumns.includes('scheduleCode') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-gray-900">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-300 px-2 py-0.5 rounded border border-gray-200 text-xs transition-colors">
                          {sch.scheduleCode}
                        </span>
                      </td>
                    )}

                    {/* Type & Frequency */}
                    {visibleColumns.includes('scheduleType') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 uppercase">
                          {sch.scheduleType}
                        </span>
                        <span className="text-xs text-gray-500 block mt-0.5">
                          {sch.frequency} (±{sch.prePlanToleranceDays || 1}d)
                        </span>
                      </td>
                    )}

                    {/* Priority */}
                    {visibleColumns.includes('priority') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            sch.priority === 'CRITICAL'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : sch.priority === 'HIGH'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-green-50 text-green-700 border border-green-200'
                          }`}
                        >
                          {sch.priority}
                        </span>
                      </td>
                    )}

                    {/* Machine Details */}
                    {visibleColumns.includes('machine') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-gray-900 block">{sch.machine?.name}</span>
                        <span className="text-xs text-gray-500">
                          {sch.machine?.make || 'Grundfos'} / {sch.machine?.modelNumber || 'CRN-15'}
                        </span>
                      </td>
                    )}

                    {/* Facility & Building */}
                    {visibleColumns.includes('facility') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-gray-700">
                        <span className="font-medium block text-gray-900">{sch.machine?.facility?.facilityName || 'Main Plant'}</span>
                        <span className="text-xs text-gray-400">{sch.machine?.building?.name || 'Tower A'}</span>
                      </td>
                    )}

                    {/* Start Date */}
                    {visibleColumns.includes('startDate') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-700 font-medium">
                        {sch.startDate ? new Date(sch.startDate).toLocaleDateString() : '-'}
                      </td>
                    )}

                    {/* Trigger Time */}
                    {visibleColumns.includes('triggerTime') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          <Clock size={12} className="text-slate-500" />
                          {sch.triggerTime || '09:00'}
                        </span>
                      </td>
                    )}

                    {/* Next Run Date */}
                    {visibleColumns.includes('nextRunDate') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs font-medium text-gray-700">
                        {sch.nextRunDate ? new Date(sch.nextRunDate).toLocaleDateString() : 'Pending'}
                      </td>
                    )}

                    {/* Last Run Date */}
                    {visibleColumns.includes('lastRunDate') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-500">
                        {sch.lastRunDate ? new Date(sch.lastRunDate).toLocaleDateString() : 'Never'}
                      </td>
                    )}

                    {/* Tolerances */}
                    {visibleColumns.includes('tolerances') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-slate-600">
                        <span className="font-medium">Pre: ±{sch.prePlanToleranceDays || 1}d</span>
                        <span className="text-slate-400 mx-1">•</span>
                        <span className="font-medium">Post: ±{sch.postPlanToleranceDays || 1}d</span>
                      </td>
                    )}

                    {/* Check Points */}
                    {visibleColumns.includes('checkpoints') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                          <CheckSquare size={12} className="text-cyan-600" />
                          {sch.tasks?.length || 0} tasks
                        </span>
                      </td>
                    )}

                    {/* Required Spares */}
                    {visibleColumns.includes('spares') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs">
                        {sch.spares && sch.spares.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Package size={12} className="text-amber-600" />
                            {sch.spares.length} spares
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </td>
                    )}

                    {/* Notification Users */}
                    {visibleColumns.includes('notifyUsers') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-600 max-w-[200px] truncate" title={Array.isArray(sch.notifyUsers) ? sch.notifyUsers.join(', ') : sch.notifyUsers || ''}>
                        {Array.isArray(sch.notifyUsers) && sch.notifyUsers.length > 0 
                          ? sch.notifyUsers.join(', ') 
                          : (sch.notifyUsers || '-')}
                      </td>
                    )}

                    {/* Notes */}
                    {visibleColumns.includes('notes') && (
                      <td className="px-3.5 py-2.5 text-xs text-gray-600 max-w-[220px] truncate" title={sch.notes || ''}>
                        {sch.notes || '-'}
                      </td>
                    )}

                    {/* Status */}
                    {visibleColumns.includes('status') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          {sch.status}
                        </span>
                      </td>
                    )}

                    {/* Created At */}
                    {visibleColumns.includes('createdAt') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-500">
                        {sch.createdAt ? new Date(sch.createdAt).toLocaleDateString() : '-'}
                      </td>
                    )}

                    {/* Actions */}
                    {visibleColumns.includes('action') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerWO(sch.id);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            title="Trigger Work Order"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Trigger WO</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-gray-800">No maintenance schedules found</p>
                      <p className="text-xs text-gray-400">
                        {hasActiveColumnFilters
                          ? 'No maintenance schedules match the current filter criteria.'
                          : 'Get started by adding a new maintenance schedule to the system.'}
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

        {/* Pagination Footer */}
        <TablePagination
          totalItems={totalItems}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); }}
        />
      </div>

      {/* Modals */}
      <AddScheduleCardModal
        isOpen={showAddScheduleModal}
        onClose={() => setShowAddScheduleModal(false)}
        machinesList={machinesList}
        onSuccess={fetchSchedulesData}
      />

      <CheckpointMasterModal
        isOpen={showCheckpointModal}
        onClose={() => setShowCheckpointModal(false)}
        machineId={selectedMachineForCheckpoint}
        onSuccess={fetchSchedulesData}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {scheduleToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Delete Schedule</h2>
                  <p className="text-xs text-slate-500 font-mono">{scheduleToDelete.scheduleCode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleToDelete(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete maintenance schedule <strong className="font-semibold text-slate-800">{scheduleToDelete.scheduleCode}</strong> for machine <strong className="font-semibold text-slate-800">{scheduleToDelete.machine?.name || 'Unknown'}</strong>? This will remove all associated schedule tasks, spares, and configuration.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingSchedule}
                onClick={() => setScheduleToDelete(null)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingSchedule}
                onClick={handleDeleteSchedule}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold rounded-lg text-xs transition-all shadow-xs cursor-pointer flex items-center gap-2"
              >
                {deletingSchedule ? 'Deleting...' : 'Delete Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
