import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  QrCode,
  Plus,
  Eye,
  UserCheck,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { workOrderService, type WorkOrder } from '../../../services/workOrderService';
import { MachineScannerModal } from '../../../components/work-orders/MachineScannerModal';
import { CreateWorkOrderModal } from '../../../components/work-orders/CreateWorkOrderModal';
import { ApproveRejectWOModal } from '../../../components/work-orders/ApproveRejectWOModal';
import { TechnicianWOViewModal } from '../../../components/work-orders/TechnicianWOViewModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { TableActions } from '../../../components/shared/TableActions';
import type { FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission } from '../../../utils/permissions';
import { ColumnCustomizer, type ColumnDefinition } from '../../../components/shared/ColumnCustomizer';

const WORK_ORDER_COLUMNS: ColumnDefinition[] = [
  { id: 'woNumber', label: 'WO Code', category: 'General', required: true, defaultVisible: true },
  { id: 'machine', label: 'Machine Details', category: 'Asset Info', defaultVisible: true },
  { id: 'facility', label: 'Facility', category: 'Asset Info', defaultVisible: false },
  { id: 'problemDescription', label: 'Problem Description', category: 'Issue Details', defaultVisible: true },
  { id: 'priority', label: 'Priority', category: 'General', defaultVisible: true },
  { id: 'status', label: 'Status', category: 'General', defaultVisible: true },
  { id: 'triggerType', label: 'Trigger Type', category: 'General', defaultVisible: false },
  { id: 'creatorName', label: 'Reported By', category: 'Assignment', defaultVisible: false },
  { id: 'creatorEmail', label: 'Creator Email', category: 'Assignment', defaultVisible: false },
  { id: 'assignedTechnician', label: 'Assign To', category: 'Assignment', defaultVisible: true },
  { id: 'approvedBy', label: 'Approved By', category: 'Assignment', defaultVisible: false },
  { id: 'estimatedDates', label: 'Est. Timeline', category: 'Planning', defaultVisible: false },
  { id: 'managerRemarks', label: 'Manager Remarks', category: 'Planning', defaultVisible: false },
  { id: 'completionNotes', label: 'Completion Notes', category: 'Execution', defaultVisible: false },
  { id: 'completedAt', label: 'Completed Date', category: 'Execution', defaultVisible: false },
  { id: 'createdAt', label: 'Created At', category: 'General', defaultVisible: false },
  { id: 'actions', label: 'Action', category: 'General', required: true, defaultVisible: true },
];

const DEFAULT_WO_VISIBLE_COLUMNS = WORK_ORDER_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.id);

export function WorkOrderManagement() {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const canCreate = hasPermission(user, 'work_orders', 'create');
  const canExport = hasPermission(user, 'work_orders', 'export');
  const canPrint = hasPermission(user, 'work_orders', 'print');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Column Visibility Customization
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('work_orders_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_WO_VISIBLE_COLUMNS;
  });

  // Column-wise filters and sorting state
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    woNumber: '',
    machine: '',
    facility: '',
    problemDescription: '',
    priority: '',
    status: '',
    triggerType: '',
    creatorName: '',
    creatorEmail: '',
    assignedTechnician: '',
    approvedBy: '',
    managerRemarks: '',
    completionNotes: '',
    completedAt: '',
    createdAt: '',
  });

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMachineForWO, setSelectedMachineForWO] = useState<any>(null);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedWOForReview, setSelectedWOForReview] = useState<WorkOrder | null>(null);

  const [showTechModal, setShowTechModal] = useState(false);
  const [selectedWOForTech, setSelectedWOForTech] = useState<WorkOrder | null>(null);

  // Data states
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [techniciansList, setTechniciansList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters, columnFilters]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [woData, techData] = await Promise.all([
        workOrderService.getWorkOrders(),
        workOrderService.getTechniciansList(),
      ]);

      if (woData && Array.isArray(woData)) {
        setWorkOrders(woData);
      } else {
        setWorkOrders(getMockWorkOrders());
      }

      if (techData && Array.isArray(techData)) {
        const effectiveAdminId = user?.adminId || user?.id || user?.userId;
        const myUsers = techData.filter((u: any) =>
          u.adminId === effectiveAdminId ||
          u.id === effectiveAdminId ||
          u.id === user?.id ||
          u.id === user?.userId
        );
        setTechniciansList(myUsers);
      }
    } catch (err) {
      setWorkOrders(getMockWorkOrders());
    } finally {
      setLoading(false);
    }
  };

  const getMockWorkOrders = (): WorkOrder[] => [
    {
      id: 101,
      woNumber: 'WO-2026-0001',
      machineId: 1,
      machine: {
        id: 1,
        name: 'Primary Domestic Booster Pump #01',
        machineCode: 'MCH-HYPN-001',
        make: 'Grundfos',
        modelNumber: 'CRN-15',
        building: { name: 'Tower A' },
      },
      problemDescription: 'Abnormal vibration and mechanical seal leakage observed during peak pressure cycle.',
      priority: 'HIGH',
      status: 'PENDING_APPROVAL',
      triggerType: 'MANUAL',
      creatorName: 'Operator Anil Deshmukh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      media: [],
    },
    {
      id: 102,
      woNumber: 'WO-2026-0002',
      machineId: 2,
      machine: {
        id: 2,
        name: 'STP Submersible Sump Pump #02',
        machineCode: 'MCH-STP-002',
        make: 'Kirloskar',
        modelNumber: 'dSub-400',
        building: { name: 'STP Plant' },
      },
      problemDescription: 'Motor tripping on high current overload fault. Needs bearing inspection and seal grease replacement.',
      priority: 'CRITICAL',
      status: 'APPROVED',
      triggerType: 'MANUAL',
      creatorName: 'Manager Vikram Singh',
      assignedTechnicianId: 1,
      assignedTechnician: { username: 'Rajesh Kumar (Technician)' },
      estimatedStartDate: new Date().toISOString(),
      estimatedEndDate: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 103,
      woNumber: 'WO-2026-0003',
      machineId: 3,
      machine: {
        id: 3,
        name: 'Terrace Flushing Booster System',
        machineCode: 'MCH-FIRE-003',
        make: 'Wilo',
        modelNumber: 'Helix-V',
        building: { name: 'Tower B' },
      },
      problemDescription: 'Routine scheduled bi-weekly pressure switch calibration and filter mesh cleaning.',
      priority: 'LOW',
      status: 'REJECTED',
      triggerType: 'SCHEDULED',
      rejectionReason: 'Duplicate work order created. Serviced under PM routine WO-2026-0098.',
      rejectedAt: new Date().toISOString(),
      creatorName: 'Scheduler Bot',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
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
      woNumber: '',
      machine: '',
      facility: '',
      problemDescription: '',
      priority: '',
      status: '',
      triggerType: '',
      creatorName: '',
      creatorEmail: '',
      assignedTechnician: '',
      approvedBy: '',
      managerRemarks: '',
      completionNotes: '',
      completedAt: '',
      createdAt: '',
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

  const uniqueTechnicians = useMemo(() => {
    const list = new Set<string>();
    workOrders.forEach(w => {
      if (w.assignedTechnician) {
        const name = w.assignedTechnician.firstName 
          ? `${w.assignedTechnician.firstName} ${w.assignedTechnician.lastName || ''}`.trim()
          : w.assignedTechnician.username || '';
        if (name) list.add(name);
      }
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [workOrders]);

  const filteredWorkOrders = useMemo(() => {
    let result = workOrders.filter(wo => {
      // 1. Filter by Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNumber = wo.woNumber?.toLowerCase().includes(q);
        const matchProblem = wo.problemDescription?.toLowerCase().includes(q);
        const matchMachine = wo.machine?.name?.toLowerCase().includes(q);
        const matchCode = wo.machine?.machineCode?.toLowerCase().includes(q);
        if (!matchNumber && !matchProblem && !matchMachine && !matchCode) return false;
      }

      // 2. Filter by Active Filters
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        if (key === 'status') {
          if (value === 'IN_PROGRESS' && wo.status !== 'APPROVED' && wo.status !== 'IN_PROGRESS') return false;
          else if (value === 'COMPLETED' && wo.status !== 'COMPLETED' && wo.status !== 'CLOSED') return false;
          else if (value !== 'IN_PROGRESS' && value !== 'COMPLETED' && wo.status !== value) return false;
        } else if (key === 'priority') {
          if (wo.priority !== value) return false;
        } else if (key === 'machineId') {
          if (wo.machineId?.toString() !== value) return false;
        } else if (key === 'triggerType') {
          if (wo.triggerType !== value) return false;
        } else if (key === 'facility') {
          const fName = wo.machine?.facility?.facilityName || wo.machine?.building?.name || '';
          if (fName !== value) return false;
        } else if (key === 'technician') {
          const techName = wo.assignedTechnician ? (wo.assignedTechnician.firstName ? `${wo.assignedTechnician.firstName} ${wo.assignedTechnician.lastName || ''}`.trim() : wo.assignedTechnician.username || '') : '';
          if (techName !== value) return false;
        } else if (wo[key as keyof WorkOrder] !== value) {
          return false;
        }
      }

      // 3. Column-wise filters
      if (columnFilters.woNumber && !wo.woNumber?.toLowerCase().includes(columnFilters.woNumber.toLowerCase())) {
        return false;
      }
      if (columnFilters.machine) {
        const machStr = `${wo.machine?.name || ''} ${wo.machine?.machineCode || ''} ${wo.machine?.building?.name || ''}`.toLowerCase();
        if (!machStr.includes(columnFilters.machine.toLowerCase())) return false;
      }
      if (columnFilters.facility) {
        const facStr = (wo.machine?.facility?.facilityName || wo.machine?.building?.name || '').toLowerCase();
        if (!facStr.includes(columnFilters.facility.toLowerCase().trim())) return false;
      }
      if (columnFilters.problemDescription && !wo.problemDescription?.toLowerCase().includes(columnFilters.problemDescription.toLowerCase())) {
        return false;
      }
      if (columnFilters.priority && wo.priority?.toUpperCase() !== columnFilters.priority.toUpperCase()) {
        return false;
      }
      if (columnFilters.status && wo.status?.toUpperCase() !== columnFilters.status.toUpperCase()) {
        return false;
      }
      if (columnFilters.triggerType && wo.triggerType?.toUpperCase() !== columnFilters.triggerType.toUpperCase()) {
        return false;
      }
      if (columnFilters.creatorName && !wo.creatorName?.toLowerCase().includes(columnFilters.creatorName.toLowerCase())) {
        return false;
      }
      if (columnFilters.creatorEmail && !wo.creatorEmail?.toLowerCase().includes(columnFilters.creatorEmail.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.assignedTechnician) {
        const techName = wo.assignedTechnician
          ? (wo.assignedTechnician.firstName 
              ? `${wo.assignedTechnician.firstName} ${wo.assignedTechnician.lastName || ''}`.trim()
              : wo.assignedTechnician.username || '')
          : 'Unassigned';
        if (columnFilters.assignedTechnician === 'Unassigned') {
          if (wo.assignedTechnician) return false;
        } else if (!techName.toLowerCase().includes(columnFilters.assignedTechnician.toLowerCase())) {
          return false;
        }
      }
      if (columnFilters.approvedBy) {
        const approver = (wo.approvedBy?.name || wo.approvedBy?.fullName || wo.approvedBy?.username || '').toLowerCase();
        if (!approver.includes(columnFilters.approvedBy.toLowerCase().trim())) return false;
      }
      if (columnFilters.managerRemarks && !wo.managerRemarks?.toLowerCase().includes(columnFilters.managerRemarks.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.completionNotes && !wo.completionNotes?.toLowerCase().includes(columnFilters.completionNotes.toLowerCase().trim())) {
        return false;
      }
      if (columnFilters.completedAt && !(wo.completedAt ? new Date(wo.completedAt).toLocaleDateString() : '').includes(columnFilters.completedAt.trim())) {
        return false;
      }
      if (columnFilters.createdAt && !new Date(wo.createdAt).toLocaleDateString().includes(columnFilters.createdAt)) {
        return false;
      }

      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aVal = '';
        let bVal = '';

        if (sortConfig.key === 'woNumber') {
          aVal = a.woNumber || '';
          bVal = b.woNumber || '';
        } else if (sortConfig.key === 'machine') {
          aVal = a.machine?.name || '';
          bVal = b.machine?.name || '';
        } else if (sortConfig.key === 'facility') {
          aVal = a.machine?.facility?.facilityName || a.machine?.building?.name || '';
          bVal = b.machine?.facility?.facilityName || b.machine?.building?.name || '';
        } else if (sortConfig.key === 'problemDescription') {
          aVal = a.problemDescription || '';
          bVal = b.problemDescription || '';
        } else if (sortConfig.key === 'priority') {
          aVal = a.priority || '';
          bVal = b.priority || '';
        } else if (sortConfig.key === 'status') {
          aVal = a.status || '';
          bVal = b.status || '';
        } else if (sortConfig.key === 'triggerType') {
          aVal = a.triggerType || '';
          bVal = b.triggerType || '';
        } else if (sortConfig.key === 'creatorName') {
          aVal = a.creatorName || '';
          bVal = b.creatorName || '';
        } else if (sortConfig.key === 'creatorEmail') {
          aVal = a.creatorEmail || '';
          bVal = b.creatorEmail || '';
        } else if (sortConfig.key === 'assignedTechnician') {
          aVal = a.assignedTechnician?.firstName || a.assignedTechnician?.username || '';
          bVal = b.assignedTechnician?.firstName || b.assignedTechnician?.username || '';
        } else if (sortConfig.key === 'approvedBy') {
          aVal = a.approvedBy?.name || a.approvedBy?.fullName || a.approvedBy?.username || '';
          bVal = b.approvedBy?.name || b.approvedBy?.fullName || b.approvedBy?.username || '';
        } else if (sortConfig.key === 'estimatedDates') {
          aVal = a.estimatedStartDate || '';
          bVal = b.estimatedStartDate || '';
        } else if (sortConfig.key === 'managerRemarks') {
          aVal = a.managerRemarks || '';
          bVal = b.managerRemarks || '';
        } else if (sortConfig.key === 'completionNotes') {
          aVal = a.completionNotes || '';
          bVal = b.completionNotes || '';
        } else if (sortConfig.key === 'completedAt') {
          aVal = a.completedAt || '';
          bVal = b.completedAt || '';
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
  }, [workOrders, searchQuery, activeFilters, columnFilters, sortConfig]);

  // Extract unique machines list from workOrders for machine filter
  const uniqueMachines = Array.from(
    new Map(
      workOrders
        .filter(w => w.machine?.id && w.machine?.name)
        .map(w => [w.machine!.id, { id: w.machine!.id, name: w.machine!.name }])
    ).values()
  );

  // Pagination logic
  const totalItems = filteredWorkOrders.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentWorkOrders = filteredWorkOrders.slice(startIndex, endIndex);

  // Dynamic Facilities list for filters
  const uniqueFacilities = useMemo(() => {
    const list = new Set<string>();
    workOrders.forEach(w => {
      const f = w.machine?.facility?.facilityName || w.machine?.building?.name;
      if (f) list.add(f);
    });
    return Array.from(list).sort();
  }, [workOrders]);

  // Dynamic Filters for Customize Filters modal
  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
        { label: 'Assigned / In Progress', value: 'IN_PROGRESS' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Revision Requested', value: 'REVISION_REQUESTED' },
        { label: 'Completed & Closed', value: 'COMPLETED' },
        { label: 'Rejected', value: 'REJECTED' },
      ]
    },
    {
      key: 'priority',
      label: 'Priority',
      options: [
        { label: 'Low Priority', value: 'LOW' },
        { label: 'Medium Priority', value: 'MEDIUM' },
        { label: 'High Priority', value: 'HIGH' },
        { label: 'Critical Emergency', value: 'CRITICAL' },
      ]
    },
    {
      key: 'triggerType',
      label: 'Trigger Type',
      options: [
        { label: 'Manual Trigger', value: 'MANUAL' },
        { label: 'Preventive Schedule', value: 'PREVENTIVE' },
        { label: 'Predictive Alert', value: 'PREDICTIVE' },
        { label: 'Condition Based', value: 'CONDITION' },
        { label: 'Breakdown / Emergency', value: 'BREAKDOWN' },
      ]
    },
    ...(uniqueFacilities.length > 0 ? [{
      key: 'facility',
      label: 'Facility / Location',
      options: uniqueFacilities
    }] : []),
    ...(uniqueMachines.length > 0 ? [{
      key: 'machineId',
      label: 'Machine / Asset',
      options: uniqueMachines.map(m => ({ label: m.name, value: m.id.toString() }))
    }] : []),
    ...(uniqueTechnicians.length > 0 ? [{
      key: 'technician',
      label: 'Assigned Technician',
      options: uniqueTechnicians
    }] : []),
  ], [uniqueFacilities, uniqueMachines, uniqueTechnicians]);

  const handleExport = (format: 'pdf' | 'excel') => {
    const exportableColumns = WORK_ORDER_COLUMNS.filter(c => c.id !== 'actions' && visibleColumns.includes(c.id));
    const headers = exportableColumns.map(c => c.label);
    const rows = filteredWorkOrders.map(wo => exportableColumns.map(col => {
      switch (col.id) {
        case 'woNumber': return wo.woNumber || '';
        case 'machine': return `${wo.machine?.name || ''} (${wo.machine?.machineCode || ''})`;
        case 'facility': return wo.machine?.facility?.facilityName || wo.machine?.building?.name || '-';
        case 'problemDescription': return wo.problemDescription || '';
        case 'priority': return wo.priority || '';
        case 'status': return wo.status || '';
        case 'triggerType': return wo.triggerType || '';
        case 'creatorName': return wo.creatorName || '-';
        case 'creatorEmail': return wo.creatorEmail || '-';
        case 'assignedTechnician':
          return wo.assignedTechnician
            ? (wo.assignedTechnician.firstName 
                ? `${wo.assignedTechnician.firstName} ${wo.assignedTechnician.lastName || ''}`.trim()
                : wo.assignedTechnician.username || '')
            : 'Unassigned';
        case 'approvedBy':
          return wo.approvedBy?.name || wo.approvedBy?.fullName || wo.approvedBy?.username || '-';
        case 'estimatedDates':
          return wo.estimatedStartDate
            ? `${new Date(wo.estimatedStartDate).toLocaleDateString()} - ${wo.estimatedEndDate ? new Date(wo.estimatedEndDate).toLocaleDateString() : 'TBD'}`
            : 'Not Scheduled';
        case 'managerRemarks': return wo.managerRemarks || '-';
        case 'completionNotes': return wo.completionNotes || '-';
        case 'completedAt': return wo.completedAt ? new Date(wo.completedAt).toLocaleDateString() : '-';
        case 'createdAt': return new Date(wo.createdAt).toLocaleDateString();
        default: return '';
      }
    }));
    exportData(headers, rows, 'Work_Orders_List', 'Work Orders List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenScanner = () => {
    setShowScannerModal(true);
  };

  const handleSelectMachineFromScanner = (machine: any) => {
    setSelectedMachineForWO(machine);
    setShowCreateModal(true);
  };

  const handleOpenReview = (wo: WorkOrder) => {
    setSelectedWOForReview(wo);
    setShowApproveModal(true);
  };

  const handleOpenTechnician = (wo: WorkOrder) => {
    setSelectedWOForTech(wo);
    setShowTechModal(true);
  };

  return (
    <div className="w-full flex flex-col">
      {/* Table Actions & Header Toolbar in One Row */}
      <TableActions
        title="Work Orders"
        subtitle="Create, track, approve, and resolve maintenance work orders"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search work orders..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        columnCustomizer={
          <ColumnCustomizer
            columns={WORK_ORDER_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="work_orders_table_columns"
          />
        }
        hasActiveColumnFilters={hasActiveColumnFilters}
        onResetColumnFilters={clearAllColumnFilters}
        activeColumnFilterCount={activeFilterCount}
        actionButton={
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleOpenScanner}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-semibold rounded-lg text-xs transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <QrCode size={14} className="text-blue-400" />
              <span>Scan QR</span>
            </button>
            {canCreate && (
              <button
                onClick={() => navigate('/work-orders/new')}
                className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#00a651] hover:bg-[#009040] active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Work Order</span>
              </button>
            )}
          </div>
        }
      />

      {/* Master Table Section */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
              {/* Column Title Row - Tapping main columns toggles filter row */}
              <tr 
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="cursor-pointer select-none hover:bg-slate-100/60 transition-colors whitespace-nowrap"
                title={showColumnFilters ? "Click column header to hide filters" : "Click column header to show filters"}
              >
                {visibleColumns.includes('woNumber') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>WO Code</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('woNumber');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by WO Code"
                      >
                        {sortConfig?.key === 'woNumber' ? (
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
                      <span>Facility</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('facility');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility"
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

                {visibleColumns.includes('problemDescription') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Problem Description</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('problemDescription');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Problem Description"
                      >
                        {sortConfig?.key === 'problemDescription' ? (
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

                {visibleColumns.includes('triggerType') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Trigger Type</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('triggerType');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Trigger Type"
                      >
                        {sortConfig?.key === 'triggerType' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('creatorName') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Reported By</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('creatorName');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Reported By"
                      >
                        {sortConfig?.key === 'creatorName' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('creatorEmail') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Creator Email</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('creatorEmail');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Creator Email"
                      >
                        {sortConfig?.key === 'creatorEmail' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('assignedTechnician') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Assign To</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('assignedTechnician');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Assign To"
                      >
                        {sortConfig?.key === 'assignedTechnician' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('approvedBy') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Approved By</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('approvedBy');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Approved By"
                      >
                        {sortConfig?.key === 'approvedBy' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('estimatedDates') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Est. Timeline</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('estimatedDates');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Est. Timeline"
                      >
                        {sortConfig?.key === 'estimatedDates' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('managerRemarks') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Manager Remarks</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('managerRemarks');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Manager Remarks"
                      >
                        {sortConfig?.key === 'managerRemarks' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('completionNotes') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Completion Notes</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('completionNotes');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Completion Notes"
                      >
                        {sortConfig?.key === 'completionNotes' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('completedAt') && (
                  <th className="px-3.5 py-2.5 whitespace-nowrap select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Completed Date</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('completedAt');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Completed Date"
                      >
                        {sortConfig?.key === 'completedAt' ? (
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

                {visibleColumns.includes('actions') && (
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
                  {/* WO Code Filter */}
                  {visibleColumns.includes('woNumber') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.woNumber}
                          onChange={(e) => handleColumnFilterChange('woNumber', e.target.value)}
                          placeholder="Filter code..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.woNumber && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('woNumber', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Machine Filter */}
                  {visibleColumns.includes('machine') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.machine}
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

                  {/* Facility Filter */}
                  {visibleColumns.includes('facility') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.facility}
                          onChange={(e) => handleColumnFilterChange('facility', e.target.value)}
                          placeholder="Filter facility..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.facility && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('facility', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Problem Description Filter */}
                  {visibleColumns.includes('problemDescription') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.problemDescription}
                          onChange={(e) => handleColumnFilterChange('problemDescription', e.target.value)}
                          placeholder="Filter problem..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.problemDescription && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('problemDescription', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Priority Filter */}
                  {visibleColumns.includes('priority') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.priority}
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

                  {/* Status Filter */}
                  {visibleColumns.includes('status') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.status}
                          onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Statuses</option>
                          <option value="PENDING_APPROVAL">Pending Approval</option>
                          <option value="APPROVED">Approved</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="REVISION_REQUESTED">Revision Requested</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CLOSED">Closed</option>
                          <option value="REJECTED">Rejected</option>
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

                  {/* Trigger Type Filter */}
                  {visibleColumns.includes('triggerType') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.triggerType}
                          onChange={(e) => handleColumnFilterChange('triggerType', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Triggers</option>
                          <option value="MANUAL">Manual</option>
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="BREAKDOWN">Breakdown</option>
                          <option value="EMERGENCY">Emergency</option>
                        </select>
                        {columnFilters.triggerType && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('triggerType', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Creator Filter */}
                  {visibleColumns.includes('creatorName') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.creatorName}
                          onChange={(e) => handleColumnFilterChange('creatorName', e.target.value)}
                          placeholder="Filter reporter..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.creatorName && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('creatorName', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Creator Email Filter */}
                  {visibleColumns.includes('creatorEmail') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.creatorEmail}
                          onChange={(e) => handleColumnFilterChange('creatorEmail', e.target.value)}
                          placeholder="Filter email..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.creatorEmail && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('creatorEmail', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Assign To Filter */}
                  {visibleColumns.includes('assignedTechnician') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.assignedTechnician}
                          onChange={(e) => handleColumnFilterChange('assignedTechnician', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Assignees</option>
                          <option value="Unassigned">Unassigned</option>
                          {uniqueTechnicians.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        {columnFilters.assignedTechnician && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('assignedTechnician', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Approved By Filter */}
                  {visibleColumns.includes('approvedBy') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.approvedBy}
                          onChange={(e) => handleColumnFilterChange('approvedBy', e.target.value)}
                          placeholder="Filter approver..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.approvedBy && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('approvedBy', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Estimated Dates */}
                  {visibleColumns.includes('estimatedDates') && (
                    <th className="px-3 py-2 font-normal">
                      <span className="text-[11px] text-gray-400 italic">Timeline</span>
                    </th>
                  )}

                  {/* Manager Remarks Filter */}
                  {visibleColumns.includes('managerRemarks') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.managerRemarks}
                          onChange={(e) => handleColumnFilterChange('managerRemarks', e.target.value)}
                          placeholder="Filter remarks..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.managerRemarks && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('managerRemarks', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Completion Notes Filter */}
                  {visibleColumns.includes('completionNotes') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.completionNotes}
                          onChange={(e) => handleColumnFilterChange('completionNotes', e.target.value)}
                          placeholder="Filter notes..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.completionNotes && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('completionNotes', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Completed Date Filter */}
                  {visibleColumns.includes('completedAt') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.completedAt}
                          onChange={(e) => handleColumnFilterChange('completedAt', e.target.value)}
                          placeholder="Filter date..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.completedAt && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('completedAt', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Created At Filter */}
                  {visibleColumns.includes('createdAt') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.createdAt}
                          onChange={(e) => handleColumnFilterChange('createdAt', e.target.value)}
                          placeholder="Filter date..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.createdAt && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('createdAt', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('actions') && (
                    <th className="px-3 py-2 font-normal text-right">
                      {hasActiveColumnFilters && (
                        <button
                          type="button"
                          onClick={clearAllColumnFilters}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </th>
                  )}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <TableSkeleton columns={visibleColumns.length} rows={5} />
              ) : currentWorkOrders.length > 0 ? (
                currentWorkOrders.map((wo) => (
                  <tr
                    key={wo.id}
                    onClick={() => {
                      if (wo.status === 'PENDING_APPROVAL') handleOpenReview(wo);
                      else handleOpenTechnician(wo);
                    }}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    {/* WO Code */}
                    {visibleColumns.includes('woNumber') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                            {wo.woNumber}
                          </span>
                          {wo.isEscalated && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded">
                              ESCALATED
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block mt-1">
                          {new Date(wo.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    )}

                    {/* Machine Details */}
                    {visibleColumns.includes('machine') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{wo.machine?.name || 'Machine'}</span>
                        <span className="text-xs text-slate-500">
                          {wo.machine?.machineCode || `MCH-${wo.machineId}`} • {wo.machine?.building?.name || 'Main Plant'}
                        </span>
                      </td>
                    )}

                    {/* Facility */}
                    {visibleColumns.includes('facility') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-slate-700 font-medium">
                        {wo.machine?.facility?.facilityName || wo.machine?.building?.name || '-'}
                      </td>
                    )}

                    {/* Problem Description */}
                    {visibleColumns.includes('problemDescription') && (
                      <td className="px-3.5 py-2.5 max-w-xs">
                        <p className="line-clamp-2 text-slate-700 text-xs">{wo.problemDescription}</p>
                        {wo.status === 'REJECTED' && wo.rejectionReason && (
                          <p className="text-[10px] text-red-600 font-semibold mt-1">
                            Reason: {wo.rejectionReason}
                          </p>
                        )}
                      </td>
                    )}

                    {/* Priority */}
                    {visibleColumns.includes('priority') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            wo.priority === 'CRITICAL'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : wo.priority === 'HIGH'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : wo.priority === 'MEDIUM'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {wo.priority}
                        </span>
                      </td>
                    )}

                    {/* Status */}
                    {visibleColumns.includes('status') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                            wo.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : wo.status === 'APPROVED' || wo.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : wo.status === 'REVISION_REQUESTED'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : wo.status === 'COMPLETED' || wo.status === 'CLOSED'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {wo.status.replace('_', ' ')}
                        </span>
                      </td>
                    )}

                    {/* Trigger Type */}
                    {visibleColumns.includes('triggerType') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium border border-slate-200">
                          {wo.triggerType || 'MANUAL'}
                        </span>
                      </td>
                    )}

                    {/* Reported By / Creator */}
                    {visibleColumns.includes('creatorName') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-slate-800 font-medium">
                        {wo.creatorName || 'Operator'}
                      </td>
                    )}

                    {/* Creator Email */}
                    {visibleColumns.includes('creatorEmail') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-slate-600">
                        {wo.creatorEmail || '-'}
                      </td>
                    )}

                    {/* Assign To */}
                    {visibleColumns.includes('assignedTechnician') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 text-xs">
                        {wo.assignedTechnician ? (
                          <span className="font-medium text-slate-900">
                            {wo.assignedTechnician.firstName
                              ? `${wo.assignedTechnician.firstName} ${wo.assignedTechnician.lastName || ''}`.trim()
                              : wo.assignedTechnician.username || 'Assigned Tech'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                    )}

                    {/* Approved By */}
                    {visibleColumns.includes('approvedBy') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-slate-700 font-medium">
                        {wo.approvedBy?.name || wo.approvedBy?.fullName || wo.approvedBy?.username || '-'}
                      </td>
                    )}

                    {/* Est Timeline */}
                    {visibleColumns.includes('estimatedDates') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-slate-600">
                        {wo.estimatedStartDate ? (
                          <span>
                            {new Date(wo.estimatedStartDate).toLocaleDateString()}
                            {wo.estimatedEndDate && ` → ${new Date(wo.estimatedEndDate).toLocaleDateString()}`}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unscheduled</span>
                        )}
                      </td>
                    )}

                    {/* Manager Remarks */}
                    {visibleColumns.includes('managerRemarks') && (
                      <td className="px-3.5 py-2.5 max-w-xs text-xs text-slate-600">
                        <span className="line-clamp-2">{wo.managerRemarks || '-'}</span>
                      </td>
                    )}

                    {/* Completion Notes */}
                    {visibleColumns.includes('completionNotes') && (
                      <td className="px-3.5 py-2.5 max-w-xs text-xs text-slate-600">
                        <span className="line-clamp-2">{wo.completionNotes || '-'}</span>
                      </td>
                    )}

                    {/* Completed Date */}
                    {visibleColumns.includes('completedAt') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-slate-600">
                        {wo.completedAt ? new Date(wo.completedAt).toLocaleDateString() : '-'}
                      </td>
                    )}

                    {/* Created At */}
                    {visibleColumns.includes('createdAt') && (
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-slate-600">
                        {new Date(wo.createdAt).toLocaleDateString()}
                      </td>
                    )}

                    {/* Actions */}
                    {visibleColumns.includes('actions') && (
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          {wo.status === 'PENDING_APPROVAL' ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenReview(wo); }}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                              title="Review"
                            >
                              <UserCheck className="w-4 h-4" />
                              <span>Review</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenTechnician(wo); }}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
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
                        <Wrench className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-gray-800">No work orders found</p>
                      <p className="text-xs text-gray-400">
                        {hasActiveColumnFilters
                          ? 'No work orders match the current filter criteria.'
                          : 'Get started by creating a new work order to the system.'}
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
      <MachineScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onSelectMachineForWO={handleSelectMachineFromScanner}
      />

      <CreateWorkOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        preselectedMachine={selectedMachineForWO}
        machinesList={machinesList}
        onSuccess={fetchInitialData}
      />

      <ApproveRejectWOModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        workOrder={selectedWOForReview}
        techniciansList={techniciansList}
        onSuccess={fetchInitialData}
      />

      <TechnicianWOViewModal
        isOpen={showTechModal}
        onClose={() => setShowTechModal(false)}
        workOrder={selectedWOForTech}
        onSuccess={fetchInitialData}
      />
    </div>
  );
}
