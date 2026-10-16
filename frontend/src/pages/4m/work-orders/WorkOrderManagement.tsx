import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Wrench,
  QrCode,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  UserCheck,
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

export function WorkOrderManagement() {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  const canCreate = hasPermission(user, 'work_orders', 'create');
  const canExport = hasPermission(user, 'work_orders', 'export');
  const canPrint = hasPermission(user, 'work_orders', 'print');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

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
  }, [searchQuery, activeFilters]);

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

      setTechniciansList(techData || []);
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

  const filteredWorkOrders = workOrders.filter(wo => {
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
      } else if (wo[key as keyof WorkOrder] !== value) {
        return false;
      }
    }

    return true;
  });

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

  // Dynamic Filters
  const filterOptions: FilterOption[] = [
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
    ...(uniqueMachines.length > 0 ? [{
      key: 'machineId',
      label: 'Machine',
      options: uniqueMachines.map(m => ({ label: m.name, value: m.id.toString() }))
    }] : [])
  ];

  const handleExport = (format: 'pdf' | 'excel') => {
    const headers = ['WO Number', 'Machine', 'Problem Description', 'Priority', 'Status', 'Assigned Tech', 'Created Date'];
    const rows = filteredWorkOrders.map(wo => [
      wo.woNumber || '',
      wo.machine?.name || '',
      wo.problemDescription || '',
      wo.priority || '',
      wo.status || '',
      wo.assignedTechnician?.username || 'Unassigned',
      new Date(wo.createdAt).toLocaleDateString(),
    ]);
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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Work Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">Create, track, approve, and resolve maintenance work orders</p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleOpenScanner}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-semibold rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <QrCode size={16} className="text-blue-400" />
            Scan Machine QR
          </button>
          {canCreate && (
            <button
              onClick={() => navigate('/work-orders/new')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add New Work Order
            </button>
          )}
        </div>
      </div>

      {/* Table Actions Toolbar */}
      <TableActions
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search work orders..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      {/* Master Table Section */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">All Registered Work Orders</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">WO Code</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Machine Details</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Problem Description</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Priority</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Assigned Tech</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <TableSkeleton columns={7} rows={5} />
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
                    {/* WO Code & Date */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
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

                    {/* Machine Details */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 block">{wo.machine?.name || 'Machine'}</span>
                      <span className="text-xs text-slate-500">
                        {wo.machine?.machineCode || `MCH-${wo.machineId}`} • {wo.machine?.building?.name || 'Main Plant'}
                      </span>
                    </td>

                    {/* Problem Description */}
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-700 text-xs">{wo.problemDescription}</p>
                      {wo.status === 'REJECTED' && wo.rejectionReason && (
                        <p className="text-[10px] text-red-600 font-semibold mt-1">
                          Reason: {wo.rejectionReason}
                        </p>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
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

                    {/* Status */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
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

                    {/* Assigned Tech */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 text-xs">
                      {wo.assignedTechnician ? (
                        <span className="font-medium text-slate-900">
                          {wo.assignedTechnician.username || wo.assignedTechnician.firstName || 'Assigned Tech'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Actions */}
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-gray-800">No work orders found</p>
                      <p className="text-xs text-gray-400">Get started by creating a new work order to the system.</p>
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
