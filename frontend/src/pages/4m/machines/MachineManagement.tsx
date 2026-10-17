import { useState, useEffect } from 'react';
import { Plus, Pencil, Eye, Trash2, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { DeleteConfirmModal } from '../../../components/shared/DeleteConfirmModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { TableActions } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission } from '../../../utils/permissions';

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
  maintenanceHead?: string;
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
  const [machines, setMachines] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const handleExport = (format: 'pdf' | 'excel') => {
    const headers = ['Machine Name', 'Machine Code', 'MAC ID', 'Facility', 'Sub-Facility', 'Make & Model', 'Category'];
    const rows = filteredMachines.map(machine => [
      machine.name || '-',
      machine.machineCode || '-',
      machine.deviceId || '-',
      machine.company || '-',
      machine.building || '-',
      `${machine.make || '-'} ${machine.modelNumber || ''}`.trim(),
      machine.machineCategory || '-'
    ]);
    exportData(headers, rows, 'Machine_List', 'Machine Management List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredMachines = machines.filter(machine => {
    const searchString = searchQuery.toLowerCase();
    const name = (machine.name || '').toLowerCase();
    const code = (machine.machineCode || '').toLowerCase();
    const macId = (machine.deviceId || '').toLowerCase();
    const company = (machine.company || '').toLowerCase();
    const facilityName = (machine.building || '').toLowerCase();
    const make = (machine.make || '').toLowerCase();
    const category = (machine.machineCategory || '').toLowerCase();

    return name.includes(searchString) || 
           code.includes(searchString) || 
           macId.includes(searchString) || 
           company.includes(searchString) || 
           facilityName.includes(searchString) || 
           make.includes(searchString) ||
           category.includes(searchString);
  });

  const totalItems = filteredMachines.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentMachines = filteredMachines.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Machine Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Centralized register of assets, physical locations, and IoT hardware devices</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => navigate('/machine-management/new')}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Machine
          </button>
        )}
      </div>

      {/* Search & Actions Toolbar */}
      <TableActions
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search machines by name, code, facility, make..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
      />

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Registered Assets</h2>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-bold border border-blue-200/60">
              {totalItems} total
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Machine Name</th>
                <th className="px-5 py-3.5">Machine Code</th>
                <th className="px-5 py-3.5">MAC ID</th>
                <th className="px-5 py-3.5">Facility</th>
                <th className="px-5 py-3.5">Sub-Facility</th>
                <th className="px-5 py-3.5">Make & Model</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton columns={8} rows={5} />
              ) : currentMachines.length > 0 ? (
                currentMachines.map((machine, index) => (
                  <tr 
                    key={machine.id || index} 
                    className={`hover:bg-blue-50/40 transition-colors group ${(canEdit || canView) ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (canEdit || canView) navigate(`/machine-management/edit/${machine.id}`, { state: { tab: 'General' } });
                    }}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {machine.name || '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {machine.machineCode ? (
                        <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {machine.machineCode}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                      {machine.deviceId || '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                      {machine.company || '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                      {machine.building || '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                      {machine.make || machine.modelNumber ? `${machine.make || ''} ${machine.modelNumber ? `(${machine.modelNumber})` : ''}`.trim() : '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {machine.machineCategory ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
                          {machine.machineCategory}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!canEdit && canView && (
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
                        {canEdit && (
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
                        {canDelete && (
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 bg-slate-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                        <Cpu className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-900 mb-1">No machines found</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Get started by adding a new machine or hardware asset to the system.
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
    </div>
  );
}
