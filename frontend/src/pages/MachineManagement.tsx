import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { TablePagination } from '../components/TablePagination';

interface Device {
  id: string;
  deviceId: string;
  name: string;
  machineCode?: string;
  company?: string;
  facility?: any;
  facilityId?: number;
  make?: string;
  modelNumber?: string;
  machineCategory?: string;
  maintenanceHead?: string;
}

export function MachineManagement() {
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
      const response = await api.get('/devices');
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
      await api.delete(`/devices/${machineToDelete}`);
      setDeleteModalOpen(false);
      setMachineToDelete(null);
      fetchMachines();
    } catch (error) {
      console.error('Failed to delete machine:', error);
      alert('Failed to delete machine.');
    }
  };

  const filteredMachines = machines.filter(machine => {
    const searchString = searchQuery.toLowerCase();
    const name = (machine.name || '').toLowerCase();
    const code = (machine.machineCode || machine.deviceId || '').toLowerCase();
    const company = (machine.company || '').toLowerCase();
    const facilityName = (machine.facility?.facilityName || '').toLowerCase();
    const make = (machine.make || '').toLowerCase();
    const category = (machine.machineCategory || '').toLowerCase();

    return name.includes(searchString) || 
           code.includes(searchString) || 
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
    <div className="p-6 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Machines</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Add, edit, and monitor all hardware devices across your facilities</p>
        </div>
        <button 
          onClick={() => navigate('/machine-management/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Machine
        </button>
      </div>

      {/* Search Section */}
      <div className="flex justify-end mb-6">
        <div className="relative w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all"
            placeholder="Search machines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

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
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Facility</th>
                <th className="px-6 py-4">Make & Model</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center h-16">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : currentMachines.length > 0 ? (
                currentMachines.map((machine, index) => (
                  <tr key={machine.id || index} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {machine.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.machineCode || machine.deviceId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.facility?.facilityName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.make || machine.modelNumber ? `${machine.make || ''} ${machine.modelNumber ? `(${machine.modelNumber})` : ''}`.trim() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine.machineCategory || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => navigate(`/machine-management/edit/${machine.id}`)}
                          className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDelete(machine.id)}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
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
