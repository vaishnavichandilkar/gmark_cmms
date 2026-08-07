import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Cpu } from 'lucide-react';
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
    const headers = ['Machine Name', 'Machine Code', 'MAC ID', 'Company', 'Facility', 'Make & Model', 'Category'];
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
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Machines</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Add, edit, and monitor all hardware devices across your facilities</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => navigate('/machine-management/new')}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Machine
          </button>
        )}
      </div>

      {/* Search Section */}
      <TableActions
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search machines..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
      />

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">All registered machines</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-medium text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Machine Name</th>
                <th className="px-6 py-4">Machine Code</th>
                <th className="px-6 py-4">MAC ID</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Facility</th>
                <th className="px-6 py-4">Make & Model</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={8} rows={5} />
              ) : currentMachines.length > 0 ? (
                currentMachines.map((machine, index) => (
                  <tr key={machine.id || index} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {machine.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.machineCode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.deviceId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.building || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.make || machine.modelNumber ? `${machine.make || ''} ${machine.modelNumber ? `(${machine.modelNumber})` : ''}`.trim() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.machineCategory || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button 
                            onClick={() => navigate(`/machine-management/edit/${machine.id}`)}
                            className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => confirmDelete(machine.id)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete"
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
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Cpu className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">No machines found</p>
                      <p className="text-sm text-gray-500 max-w-sm">
                        Get started by adding a new machine to the system.
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
