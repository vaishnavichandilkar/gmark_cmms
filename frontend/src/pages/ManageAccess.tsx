import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Eye, Trash2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { TablePagination } from '../components/TablePagination';

// Mock data for Roles
const initialRoles = [
  {
    id: 1,
    roleName: 'Facility Admin',
    description: 'Full access to facility management and users',
    totalUsers: 5,
    isActive: true,
  },
  {
    id: 2,
    roleName: 'Operator',
    description: 'Can view and operate machines, no create/edit rights',
    totalUsers: 24,
    isActive: true,
  },
  {
    id: 3,
    roleName: 'Viewer',
    description: 'Read-only access across all modules',
    totalUsers: 12,
    isActive: true,
  },
  {
    id: 4,
    roleName: 'Maintenance Staff',
    description: 'Access to spares, AMC, and machine maintenance records',
    totalUsers: 8,
    isActive: false,
  }
];

export function ManageAccess() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState(initialRoles);
  const [loading, setLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const confirmDelete = (id: number) => {
    setRoleToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (roleToDelete === null) return;
    setRoles(roles.filter(r => r.id !== roleToDelete));
    setDeleteModalOpen(false);
    setRoleToDelete(null);
  };

  const filteredRoles = roles.filter(role => {
    const searchString = searchQuery.toLowerCase();
    const name = role.roleName.toLowerCase();
    const desc = role.description.toLowerCase();

    return name.includes(searchString) || desc.includes(searchString);
  });

  const totalItems = filteredRoles.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentRoles = filteredRoles.slice(startIndex, endIndex);

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Manage Access</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Configure roles and module permissions</p>
        </div>
        <button 
          onClick={() => navigate('/manage-access/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Role
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
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">System Roles</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-medium text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Role Name</th>
                <th className="px-6 py-4">Description</th>
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
                    <td className="px-6 py-4 text-gray-500 max-w-md truncate">
                      {role.description}
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
                      <p className="text-base font-medium text-gray-900 mb-1">No roles found</p>
                      <p className="text-sm text-gray-500 max-w-sm">
                        Get started by creating a new role.
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
        title="Delete Role"
        message="Are you sure you want to delete this role? Users assigned to this role may lose access."
        onClose={() => {
          setDeleteModalOpen(false);
          setRoleToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
