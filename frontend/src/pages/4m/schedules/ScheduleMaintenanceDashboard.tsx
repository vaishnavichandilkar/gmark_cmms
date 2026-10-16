import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  FileText,
  Send,
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

export function ScheduleMaintenanceDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const canCreate = hasPermission(user, 'schedules', 'create');
  const canExport = hasPermission(user, 'schedules', 'export');
  const canPrint = hasPermission(user, 'schedules', 'print');

  const [activeTypeTab, setActiveTypeTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [selectedMachineForCheckpoint, setSelectedMachineForCheckpoint] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters, activeTypeTab]);

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

  const filteredSchedules = schedules.filter(sch => {
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

    // 3. Filter by Active Filters
    for (const [key, value] of Object.entries(activeFilters)) {
      if (value && sch[key as keyof MaintenanceSchedule] !== value) return false;
    }

    return true;
  });

  // Pagination logic
  const totalItems = filteredSchedules.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentSchedules = filteredSchedules.slice(startIndex, endIndex);

  // Dynamic Filters
  const filterOptions: FilterOption[] = [
    {
      key: 'frequency',
      label: 'Frequency',
      options: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']
    },
    {
      key: 'priority',
      label: 'Priority',
      options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    }
  ];

  const handleExport = (format: 'pdf' | 'excel') => {
    const headers = ['Schedule Code', 'Type', 'Frequency', 'Priority', 'Machine', 'Facility', 'Next Run Date', 'Status'];
    const rows = filteredSchedules.map(sch => [
      sch.scheduleCode || '',
      sch.scheduleType || '',
      sch.frequency || '',
      sch.priority || '',
      sch.machine?.name || '',
      sch.machine?.facility?.facilityName || 'Main Plant',
      sch.nextRunDate ? new Date(sch.nextRunDate).toLocaleDateString() : 'Pending',
      sch.status || '',
    ]);
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

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Schedules</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage recurring preventive, predictive, and condition-based maintenance routines</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setSelectedMachineForCheckpoint(1);
              setShowCheckpointModal(true);
            }}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <FileText size={16} className="text-cyan-400" />
            Create Checkpoint
          </button>
          {canCreate && (
            <button
              onClick={() => navigate('/schedules/new')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Schedule
            </button>
          )}
        </div>
      </div>

      {/* Schedule Type Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full mb-6 print:hidden">
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
            className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTypeTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Actions Toolbar */}
      <TableActions
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search schedules..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      {/* Master Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">All maintenance schedules</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-medium text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Schedule Code</th>
                <th className="px-6 py-4 whitespace-nowrap">Type & Frequency</th>
                <th className="px-6 py-4 whitespace-nowrap">Priority</th>
                <th className="px-6 py-4 whitespace-nowrap">Machine Details</th>
                <th className="px-6 py-4 whitespace-nowrap">Facility & Building</th>
                <th className="px-6 py-4 whitespace-nowrap">Next Run Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <TableSkeleton columns={8} rows={5} />
              ) : currentSchedules.length > 0 ? (
                currentSchedules.map((sch) => (
                  <tr
                    key={sch.id}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                  >
                    {/* Schedule Code */}
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-xs">
                        {sch.scheduleCode}
                      </span>
                    </td>

                    {/* Type & Frequency */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 uppercase">
                        {sch.scheduleType}
                      </span>
                      <span className="text-xs text-gray-500 block mt-0.5">
                        {sch.frequency} (±{sch.prePlanToleranceDays || 1}d)
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-6 py-4 whitespace-nowrap">
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

                    {/* Machine Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900 block">{sch.machine?.name}</span>
                      <span className="text-xs text-gray-500">
                        {sch.machine?.make || 'Grundfos'} / {sch.machine?.modelNumber || 'CRN-15'}
                      </span>
                    </td>

                    {/* Facility & Building */}
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      <span className="font-medium block text-gray-900">{sch.machine?.facility?.facilityName || 'Main Plant'}</span>
                      <span className="text-xs text-gray-400">{sch.machine?.building?.name || 'Tower A'}</span>
                    </td>

                    {/* Next Run Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-700">
                      {sch.nextRunDate ? new Date(sch.nextRunDate).toLocaleDateString() : 'Pending'}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        {sch.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTriggerWO(sch.id); }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Trigger WO</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-gray-800">No maintenance schedules found</p>
                      <p className="text-xs text-gray-400">Get started by adding a new maintenance schedule to the system.</p>
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
    </div>
  );
}
