import { useState, useEffect } from 'react';
import { Plus, Pencil, Eye, Trash2, Users, Shield, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { DeleteConfirmModal } from '../../../components/shared/DeleteConfirmModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import toast from 'react-hot-toast';
import { TableActions } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import { UserPermissionsModal } from '../../../components/4m/UserPermissionsModal';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission } from '../../../utils/permissions';

export function UserManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const canCreate = hasPermission(user, 'user_management', 'create');
  const canEdit = hasPermission(user, 'user_management', 'edit');
  const canDelete = hasPermission(user, 'user_management', 'delete');
  const canExport = hasPermission(user, 'user_management', 'export');
  const canPrint = hasPermission(user, 'user_management', 'print');

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  
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
    const headers = ['S.NO', 'EMPLOYEE', 'ROLE', 'REPORTING TO', 'STATUS', 'DEPARTMENT', 'DESIGNATION', 'CONTACT NUMBER', 'OFFICIAL EMAIL'];
    const rows = filteredUsers.map((user, idx) => [
      idx + 1,
      user.employee?.fullName || (user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username),
      user.designation || '-',
      user.employee?.reportingTo || user.reportingTo || 'Admin',
      user.isActive ? 'Active' : 'Inactive',
      user.employee?.department || '-',
      user.employee?.designation || '-',
      user.employee?.mobileNumber || user.mobileNumber || '-',
      user.employee?.officialEmail || user.email || '-',
    ]);
    exportData(headers, rows, 'User_List', 'User Management List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  const getInitials = (name: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/).filter(p => p && p.toLowerCase() !== 'undefined');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0]) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return 'US';
  };

  const getUserDisplayName = (user: any) => {
    if (user.employee?.fullName) return user.employee.fullName;
    const parts = [user.firstName, user.lastName].filter(p => p && p.trim() && p.toLowerCase() !== 'undefined');
    if (parts.length > 0) return parts.join(' ').trim();
    return user.username || 'User';
  };

  const filteredUsers = users.filter(user => {
    // Hide default seed system users from this list
    const seedUsernames = ['superadmin', 'societyadmin', 'buildingadmin', 'operator', 'viewer'];
    if (seedUsernames.includes(user.username)) {
      return false;
    }
    
    const searchString = searchQuery.toLowerCase();
    const name = getUserDisplayName(user).toLowerCase();
    const role = (user.role || '').toLowerCase();
    const desig = (user.employee?.designation || user.designation || '').toLowerCase();
    const facility = (user.facility?.facilityName || user.mainFacility?.mainFacilityName || (user.buildings ? user.buildings.map((b: any) => b.building?.name || '').join(' ') : '')).toLowerCase();
    const device = (user.deviceName || user.deviceId || '').toLowerCase();
    const email = (user.employee?.officialEmail || user.email || '').toLowerCase();
    const dept = (user.employee?.department || '').toLowerCase();
    const empCode = (user.employee?.employeeCode || '').toLowerCase();
    const phone = (user.employee?.mobileNumber || user.mobileNumber || '').toLowerCase();
    const reporting = (user.employee?.reportingTo || user.reportingTo || '').toLowerCase();

    return name.includes(searchString) || 
           role.includes(searchString) || 
           desig.includes(searchString) ||
           facility.includes(searchString) || 
           device.includes(searchString) ||
           email.includes(searchString) || 
           dept.includes(searchString) ||
           empCode.includes(searchString) ||
           phone.includes(searchString) ||
           reporting.includes(searchString);
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
          <p className="text-sm font-medium text-gray-500 mt-1">Manage system users, employee profiles, and assigned facilities</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => navigate('/user-management/new')}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add New User
          </button>
        )}
      </div>

      {/* Search Section */}
      <TableActions
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search users..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
      />

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">All registered users</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-medium text-xs border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-center w-12">No.</th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Reporting To</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Contact Number</th>
                <th className="px-6 py-4">Official Email</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={10} rows={5} />
              ) : currentUsers.length > 0 ? (
                currentUsers.map((listUser, index) => {
                  const empName = getUserDisplayName(listUser);
                  const initials = getInitials(empName);
                  const empCode = listUser.employee?.employeeCode;

                  return (
                    <tr 
                      key={listUser.id || index} 
                      onClick={() => navigate(`/user-management/view/${listUser.id}`)}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer text-xs sm:text-sm"
                    >
                      <td className="px-4 py-4 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                        {startIndex + index + 1}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-200 flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-xs sm:text-sm">{empName}</div>
                            {empCode && (
                              <div className="text-[10px] font-mono text-gray-400 font-medium">{empCode}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {listUser.role === 'SUPER_ADMIN' ? (
                          <span className="text-gray-400 text-xs font-medium pl-1">-</span>
                        ) : listUser.designation ? (
                          <span className="text-xs sm:text-sm font-medium text-gray-900">{listUser.designation}</span>
                        ) : (
                          <span className="text-gray-400 text-xs font-medium pl-1">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {listUser.role === 'SUPER_ADMIN' ? (
                          <span className="text-gray-400 text-xs font-medium pl-1">-</span>
                        ) : (listUser.employee?.reportingTo || listUser.reportingTo) ? (
                          <span className="text-xs sm:text-sm font-medium text-gray-800">{listUser.employee?.reportingTo || listUser.reportingTo}</span>
                        ) : (
                          <span className="text-gray-400 text-xs font-medium pl-1">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          listUser.isActive 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {listUser.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {listUser.employee?.department ? (
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {listUser.employee.department}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700">
                        {listUser.employee?.designation || listUser.designation || '-'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 font-medium">
                        {listUser.employee?.mobileNumber || listUser.mobileNumber ? (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{listUser.employee?.mobileNumber || listUser.mobileNumber}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 font-medium">
                        {listUser.employee?.officialEmail || listUser.email ? (
                          <div className="flex items-center gap-1 text-gray-700 max-w-[160px] truncate">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{listUser.employee?.officialEmail || listUser.email}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/user-management/view/${listUser.id}`); }}
                            className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/user-management/edit/${listUser.id}`); }}
                              className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserId(listUser.id);
                                setSelectedUserName(empName);
                                setPermissionsModalOpen(true);
                              }}
                              className="text-gray-400 hover:text-purple-600 p-1.5 rounded-md hover:bg-purple-50 transition-colors" title="Special Permissions"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); confirmDelete(listUser.id); }}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
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

      <UserPermissionsModal
        isOpen={permissionsModalOpen}
        onClose={() => setPermissionsModalOpen(false)}
        userId={selectedUserId}
        userName={selectedUserName}
      />
    </div>
  );
}

