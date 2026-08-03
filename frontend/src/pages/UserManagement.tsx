import { useState, useEffect } from 'react';
import { Plus, Pencil, Eye, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { TablePagination } from '../components/TablePagination';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import toast from 'react-hot-toast';
import { TableActions } from '../components/TableActions';
import { exportData } from '../utils/exportUtils';

export function UserManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setUserToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (userToDelete === null) return;
    try {
      await api.delete(`/users/${userToDelete}`);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user.');
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    const headers = ['Name', 'Designation', 'Facility Name', 'Official Email', 'Department', 'Date of Joining', 'Status'];
    const rows = filteredUsers.map(user => [
      user.employee?.fullName || (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username),
      user.employee?.role || user.role || '-',
      user.mainFacility?.mainFacilityName || '-',
      user.employee?.officialEmail || user.email || '-',
      user.employee?.department || '-',
      user.employee?.dateOfJoining ? new Date(user.employee.dateOfJoining).toLocaleDateString('en-GB').replace(/\//g, '-') : '-',
      user.isActive ? 'Active' : 'Inactive'
    ]);
    exportData(headers, rows, 'User_List', 'User Management List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredUsers = users.filter(user => {
    // Hide default seed system users from this list
    const seedUsernames = ['superadmin', 'societyadmin', 'buildingadmin', 'operator', 'viewer'];
    if (seedUsernames.includes(user.username)) {
      return false;
    }
    
    const searchString = searchQuery.toLowerCase();
    const name = (user.employee?.fullName || (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username)).toLowerCase();
    const role = (user.employee?.role || user.role || '').toLowerCase();
    const facility = (user.mainFacility?.mainFacilityName || '').toLowerCase();
    const email = (user.employee?.officialEmail || user.email || '').toLowerCase();
    const dept = (user.employee?.department || '').toLowerCase();

    return name.includes(searchString) || 
           role.includes(searchString) || 
           facility.includes(searchString) || 
           email.includes(searchString) || 
           dept.includes(searchString);
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Users</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Users assigned to main facilities</p>
        </div>
        <button 
          onClick={() => navigate('/user-management/new')}
          className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Search Section */}
      <TableActions
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search users..."
        onExport={handleExport}
        onPrint={handlePrint}
      />

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">Users assigned to facility</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-medium text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Facility Name</th>
                <th className="px-6 py-4">Official Email</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Date of Joining</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={8} rows={5} />
              ) : currentUsers.length > 0 ? (
                currentUsers.map((user, index) => (
                  <tr key={user.id || index} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.employee?.fullName || (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.employee?.role || user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.mainFacility?.mainFacilityName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.employee?.officialEmail || user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.employee?.department || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.employee?.dateOfJoining 
                        ? new Date(user.employee.dateOfJoining).toLocaleDateString('en-GB').replace(/\//g, '-') 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-50 text-green-500 border border-green-200/50' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => navigate(`/user-management/view/${user.id}`)}
                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => navigate(`/user-management/edit/${user.id}`)}
                          className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDelete(user.id)}
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
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Users className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">No users found</p>
                      <p className="text-sm text-gray-500 max-w-sm">
                        Get started by adding a new user to the system.
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
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
