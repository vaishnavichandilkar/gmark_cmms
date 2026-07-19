import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, ChevronDown, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

export function UserManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

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
      alert('Failed to delete user.');
    }
  };

  const filteredUsers = users.filter(user => {
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">Users Assign to mainfacilites</p>
        </div>
        <button 
          onClick={() => navigate('/user-management/new')}
          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New User
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
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Users assign to mainfacility</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-medium text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Job Role</th>
                <th className="px-6 py-4">Main Facility Name</th>
                <th className="px-6 py-4">Company Mail ID</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Date of Joining</th>
                <th className="px-6 py-4">Status</th>
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
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => (
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
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="font-medium text-gray-700">5</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          <span>0-0 of 0</span>
          <div className="flex items-center gap-4">
            <button className="text-gray-300 cursor-not-allowed">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="text-gray-300 cursor-not-allowed">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
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
