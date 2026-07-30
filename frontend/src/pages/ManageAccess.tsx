import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Eye, Trash2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { TablePagination } from '../components/TablePagination';
import { TableActions } from '../components/TableActions';
import { exportData } from '../utils/exportUtils';

import { api } from '../lib/api';

export function ManageAccess() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchDesignations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/designations');
      setRoles(response.data.map((d: any) => ({
        id: d.id,
        roleName: d.name,
        totalUsers: d.totalUsers || 0,
        isActive: d.isActive
      })));
    } catch (err) {
      console.error('Failed to fetch designations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const confirmDelete = (id: number) => {
    setRoleToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (roleToDelete === null) return;
    try {
      await api.delete(`/designations/${roleToDelete}`);
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      fetchDesignations();
    } catch (err) {
      console.error('Failed to delete designation', err);
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    const headers = ['Designation Name', 'Total Users', 'Status'];
    const rows = filteredRoles.map(role => [
      role.roleName || '-',
      role.totalUsers?.toString() || '0',
      role.isActive ? 'Active' : 'Inactive'
    ]);
    exportData(headers, rows, 'Designation_List', 'Manage Access List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRoles = roles.filter(role => {
    const searchString = searchQuery.toLowerCase();
    const name = role.roleName.toLowerCase();

    return name.includes(searchString);
  });

  const totalItems = filteredRoles.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentRoles = filteredRoles.slice(startIndex, endIndex);

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Manage Access</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Configure designations and module permissions</p>
        </div>
        <button 
          onClick={() => navigate('/manage-access/new')}
          className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Designation
        </button>
      </div>

      {/* Search Section */}
      <TableActions
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search designations..."
        onExport={handleExport}
        onPrint={handlePrint}
      />

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">System Designations</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-medium text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Designation Name</th>
                <th className="px-6 py-4">Total Users</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center h-16">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : currentRoles.length > 0 ? (
                currentRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {role.roleName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {role.totalUsers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        role.isActive
                          ? 'bg-green-50 text-green-500 border border-green-200/50' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => navigate(`/manage-access/view/${role.id}`)}
                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => navigate(`/manage-access/edit/${role.id}`)}
                          className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDelete(role.id)}
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
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Shield className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">No designations found</p>
                      <p className="text-sm text-gray-500 max-w-sm">
                        Get started by creating a new designation.
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
        title="Delete Designation"
        message="Are you sure you want to delete this designation? Users assigned to this designation may lose access."
        onClose={() => {
          setDeleteModalOpen(false);
          setRoleToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
