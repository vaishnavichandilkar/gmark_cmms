import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Eye, Trash2, Users, Shield, Phone, Mail, Building, Building2, Cpu, Filter, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { DeleteConfirmModal } from '../../../components/shared/DeleteConfirmModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import toast from 'react-hot-toast';
import { TableActions, type FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import { UserPermissionsModal } from '../../../components/4m/UserPermissionsModal';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission } from '../../../utils/permissions';
import { ColumnCustomizer, type ColumnDefinition } from '../../../components/shared/ColumnCustomizer';

const USER_COLUMNS: ColumnDefinition[] = [
  { id: 'no', label: 'No.', category: 'General', defaultVisible: true },
  { id: 'employee', label: 'Employee', category: 'General', required: true, defaultVisible: true },
  { id: 'username', label: 'Username', category: 'General', defaultVisible: false },
  { id: 'role', label: 'Role', category: 'Access', defaultVisible: true },
  { id: 'reportingTo', label: 'Reporting To', category: 'Hierarchy', defaultVisible: true },
  { id: 'status', label: 'Status', category: 'General', defaultVisible: true },
  { id: 'accessScope', label: 'Access Scope', category: 'Access', defaultVisible: true },
  { id: 'moduleAccess', label: 'Module Access', category: 'Access', defaultVisible: false },
  { id: 'department', label: 'Department', category: 'Profile', defaultVisible: true },
  { id: 'designation', label: 'Designation', category: 'Profile', defaultVisible: true },
  { id: 'contactNumber', label: 'Contact Number', category: 'Contact', defaultVisible: false },
  { id: 'officialEmail', label: 'Official Email', category: 'Contact', defaultVisible: false },
  { id: 'city', label: 'City', category: 'Location', defaultVisible: false },
  { id: 'state', label: 'State', category: 'Location', defaultVisible: false },
  { id: 'country', label: 'Country', category: 'Location', defaultVisible: false },
  { id: 'pincode', label: 'Pincode', category: 'Location', defaultVisible: false },
  { id: 'createdAt', label: 'Date Added', category: 'System', defaultVisible: false },
  { id: 'action', label: 'Action', category: 'General', required: true, defaultVisible: true },
];

const DEFAULT_USER_VISIBLE_COLUMNS = USER_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.id);

export function UserManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const canCreate = hasPermission(user, 'user_management', 'create');
  const canEdit = hasPermission(user, 'user_management', 'edit');
  const canDelete = hasPermission(user, 'user_management', 'delete');
  const canExport = hasPermission(user, 'user_management', 'export');
  const canPrint = hasPermission(user, 'user_management', 'print');

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');

  // Column Visibility Customization
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('user_management_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validIds = USER_COLUMNS.map(c => c.id);
          const filtered = parsed.filter(id => validIds.includes(id));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_USER_VISIBLE_COLUMNS;
  });

  // Column-wise filters and sorting state
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    employee: '',
    username: '',
    role: '',
    reportingTo: '',
    status: '',
    accessScope: '',
    moduleAccess: '',
    department: '',
    designation: '',
    contactNumber: '',
    officialEmail: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    createdAt: '',
  });

  type UserSortKey =
    | 'employee' | 'username' | 'role' | 'reportingTo' | 'status' | 'accessScope' | 'moduleAccess'
    | 'department' | 'designation' | 'contactNumber' | 'officialEmail'
    | 'city' | 'state' | 'country' | 'pincode' | 'createdAt';

  const [sortConfig, setSortConfig] = useState<{
    key: UserSortKey;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, columnFilters]);

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

  const handleColumnFilterChange = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      employee: '',
      username: '',
      role: '',
      reportingTo: '',
      status: '',
      accessScope: '',
      moduleAccess: '',
      department: '',
      designation: '',
      contactNumber: '',
      officialEmail: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      createdAt: '',
    });
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => v.trim() !== '').length;
  }, [columnFilters]);

  const hasActiveColumnFilters = activeFilterCount > 0;

  const handleSort = (key: UserSortKey) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const uniqueRoles = useMemo(() => {
    const list = new Set<string>();
    users.forEach(u => {
      if (u.designation) list.add(u.designation);
      else if (u.role && u.role !== 'SUPER_ADMIN') list.add(u.role);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const uniqueReportingTo = useMemo(() => {
    const list = new Set<string>();
    users.forEach(u => {
      const rep = u.employee?.reportingTo || u.reportingTo;
      if (rep) list.add(rep);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const uniqueDepartments = useMemo(() => {
    const list = new Set<string>();
    users.forEach(u => {
      if (u.employee?.department) list.add(u.employee.department);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [users]);

  // Dynamic Filters for Customize Filters modal
  const filterOptions: FilterOption[] = useMemo(() => [
    ...(uniqueRoles.length > 0 ? [{
      key: 'role',
      label: 'Role / Designation',
      options: uniqueRoles
    }] : []),
    {
      key: 'status',
      label: 'Status',
      options: ['Active', 'Inactive']
    },
    ...(uniqueDepartments.length > 0 ? [{
      key: 'department',
      label: 'Department',
      options: uniqueDepartments
    }] : []),
    ...(uniqueReportingTo.length > 0 ? [{
      key: 'reportingTo',
      label: 'Reporting Manager',
      options: uniqueReportingTo
    }] : []),
  ], [uniqueRoles, uniqueDepartments, uniqueReportingTo]);

  const getAccessScopeStr = (u: any) => {
    if (u.deviceName || u.deviceId) return u.deviceName || u.deviceId;
    if (u.facility?.facilityName) return u.facility.facilityName;
    if (u.mainFacility?.mainFacilityName) return u.mainFacility.mainFacilityName;
    return '';
  };

  const filteredUsers = useMemo(() => {
    const seedUsernames = ['superadmin', 'societyadmin', 'buildingadmin', 'operator', 'viewer'];

    let result = users.filter(user => {
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

      if (searchQuery) {
        const matches = name.includes(searchString) || 
               role.includes(searchString) || 
               desig.includes(searchString) ||
               facility.includes(searchString) || 
               device.includes(searchString) ||
               email.includes(searchString) || 
               dept.includes(searchString) ||
               empCode.includes(searchString) ||
               phone.includes(searchString) ||
               reporting.includes(searchString);
        if (!matches) return false;
      }

      // Active Filters (Customize Filters)
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        if (key === 'role') {
          const userRole = (user.designation || user.role || '').toLowerCase();
          if (userRole !== value.toLowerCase().trim()) return false;
        } else if (key === 'status') {
          const statusStr = user.isActive ? 'active' : 'inactive';
          if (statusStr !== value.toLowerCase().trim()) return false;
        } else if (key === 'accessScope') {
          const scopeStr = getAccessScopeStr(user).toLowerCase();
          if (!scopeStr.includes(value.toLowerCase().trim())) return false;
        } else if (key === 'department') {
          if ((user.employee?.department || '').toLowerCase() !== value.toLowerCase().trim()) return false;
        } else if (key === 'designation') {
          const desigStr = (user.employee?.designation || user.designation || '').toLowerCase();
          if (!desigStr.includes(value.toLowerCase().trim())) return false;
        }
      }

      // Column filters
      if (columnFilters.employee) {
        const empStr = `${name} ${empCode}`.toLowerCase();
        if (!empStr.includes(columnFilters.employee.toLowerCase().trim())) return false;
      }
      if (columnFilters.username) {
        if (!(user.username || '').toLowerCase().includes(columnFilters.username.toLowerCase().trim())) return false;
      }
      if (columnFilters.role) {
        const userRole = (user.designation || user.role || '').toLowerCase();
        if (userRole !== columnFilters.role.toLowerCase().trim()) return false;
      }
      if (columnFilters.reportingTo) {
        const userRep = (user.employee?.reportingTo || user.reportingTo || '').toLowerCase();
        if (userRep !== columnFilters.reportingTo.toLowerCase().trim()) return false;
      }
      if (columnFilters.status) {
        const statusStr = user.isActive ? 'active' : 'inactive';
        if (statusStr !== columnFilters.status.toLowerCase().trim()) return false;
      }
      if (columnFilters.accessScope) {
        const scopeStr = getAccessScopeStr(user).toLowerCase();
        if (!scopeStr.includes(columnFilters.accessScope.toLowerCase().trim())) return false;
      }
      if (columnFilters.moduleAccess) {
        if ((user.moduleAccess || '').toLowerCase() !== columnFilters.moduleAccess.toLowerCase().trim()) return false;
      }
      if (columnFilters.department) {
        if ((user.employee?.department || '').toLowerCase() !== columnFilters.department.toLowerCase().trim()) return false;
      }
      if (columnFilters.designation) {
        const desigStr = (user.employee?.designation || user.designation || '').toLowerCase();
        if (!desigStr.includes(columnFilters.designation.toLowerCase().trim())) return false;
      }
      if (columnFilters.contactNumber) {
        const ph = (user.employee?.mobileNumber || user.mobileNumber || '').toLowerCase();
        if (!ph.includes(columnFilters.contactNumber.toLowerCase().trim())) return false;
      }
      if (columnFilters.officialEmail) {
        const em = (user.employee?.officialEmail || user.email || '').toLowerCase();
        if (!em.includes(columnFilters.officialEmail.toLowerCase().trim())) return false;
      }
      if (columnFilters.city) {
        if (!(user.city || '').toLowerCase().includes(columnFilters.city.toLowerCase().trim())) return false;
      }
      if (columnFilters.state) {
        if (!(user.state || '').toLowerCase().includes(columnFilters.state.toLowerCase().trim())) return false;
      }
      if (columnFilters.country) {
        if (!(user.country || '').toLowerCase().includes(columnFilters.country.toLowerCase().trim())) return false;
      }
      if (columnFilters.pincode) {
        if (!(user.pincode || '').toLowerCase().includes(columnFilters.pincode.toLowerCase().trim())) return false;
      }
      if (columnFilters.createdAt) {
        const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '';
        if (!dateStr.includes(columnFilters.createdAt.trim())) return false;
      }

      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aVal = '';
        let bVal = '';

        if (sortConfig.key === 'employee') {
          aVal = getUserDisplayName(a);
          bVal = getUserDisplayName(b);
        } else if (sortConfig.key === 'username') {
          aVal = a.username || '';
          bVal = b.username || '';
        } else if (sortConfig.key === 'role') {
          aVal = a.designation || a.role || '';
          bVal = b.designation || b.role || '';
        } else if (sortConfig.key === 'reportingTo') {
          aVal = a.employee?.reportingTo || a.reportingTo || '';
          bVal = b.employee?.reportingTo || b.reportingTo || '';
        } else if (sortConfig.key === 'status') {
          aVal = a.isActive ? 'Active' : 'Inactive';
          bVal = b.isActive ? 'Active' : 'Inactive';
        } else if (sortConfig.key === 'accessScope') {
          aVal = getAccessScopeStr(a);
          bVal = getAccessScopeStr(b);
        } else if (sortConfig.key === 'moduleAccess') {
          aVal = a.moduleAccess || '';
          bVal = b.moduleAccess || '';
        } else if (sortConfig.key === 'department') {
          aVal = a.employee?.department || '';
          bVal = b.employee?.department || '';
        } else if (sortConfig.key === 'designation') {
          aVal = a.employee?.designation || a.designation || '';
          bVal = b.employee?.designation || b.designation || '';
        } else if (sortConfig.key === 'contactNumber') {
          aVal = a.employee?.mobileNumber || a.mobileNumber || '';
          bVal = b.employee?.mobileNumber || b.mobileNumber || '';
        } else if (sortConfig.key === 'officialEmail') {
          aVal = a.employee?.officialEmail || a.email || '';
          bVal = b.employee?.officialEmail || b.email || '';
        } else if (sortConfig.key === 'city') {
          aVal = a.city || '';
          bVal = b.city || '';
        } else if (sortConfig.key === 'state') {
          aVal = a.state || '';
          bVal = b.state || '';
        } else if (sortConfig.key === 'country') {
          aVal = a.country || '';
          bVal = b.country || '';
        } else if (sortConfig.key === 'pincode') {
          aVal = a.pincode || '';
          bVal = b.pincode || '';
        } else if (sortConfig.key === 'createdAt') {
          aVal = a.createdAt || '';
          bVal = b.createdAt || '';
        }

        if (aVal.toLowerCase() < bVal.toLowerCase()) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal.toLowerCase() > bVal.toLowerCase()) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, searchQuery, columnFilters, sortConfig]);

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handleExport = (format: 'pdf' | 'excel') => {
    const exportableColumns = USER_COLUMNS.filter(c => c.id !== 'action' && visibleColumns.includes(c.id));
    const headers = exportableColumns.map(c => c.label);
    const rows = filteredUsers.map((u, idx) => exportableColumns.map(col => {
      switch (col.id) {
        case 'no': return String(idx + 1);
        case 'employee': return `${getUserDisplayName(u)} (${u.employee?.employeeCode || u.username})`;
        case 'username': return u.username || '-';
        case 'role': return u.role || '-';
        case 'reportingTo': return u.employee?.reportingTo || u.reportingTo || '-';
        case 'status': return u.isActive ? 'Active' : 'Inactive';
        case 'accessScope': return getAccessScopeStr(u) || '-';
        case 'moduleAccess': return u.moduleAccess || '-';
        case 'department': return u.employee?.department || '-';
        case 'designation': return u.employee?.designation || u.designation || '-';
        case 'contactNumber': return u.employee?.mobileNumber || u.mobileNumber || '-';
        case 'officialEmail': return u.employee?.officialEmail || u.email || '-';
        case 'city': return u.city || '-';
        case 'state': return u.state || '-';
        case 'country': return u.country || '-';
        case 'pincode': return u.pincode || '-';
        case 'createdAt': return u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-';
        default: return '';
      }
    }));
    exportData(headers, rows, 'User_List', 'Users Management List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Search & Actions Toolbar in One Row */}
      <TableActions
        title="Users"
        subtitle="Manage system users, employee profiles, and assigned facilities"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search users..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
        columnCustomizer={
          <ColumnCustomizer
            columns={USER_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="user_management_table_columns"
          />
        }
        hasActiveColumnFilters={hasActiveColumnFilters}
        onResetColumnFilters={clearAllColumnFilters}
        activeColumnFilterCount={activeFilterCount}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        actionButton={
          canCreate && (
            <button 
              onClick={() => navigate('/user-management/new')}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          )
        }
      />

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/70 text-gray-700 font-semibold text-xs border-b border-gray-200 whitespace-nowrap">
              {/* Column Title Row - Tapping main columns toggles filter row */}
              <tr 
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="cursor-pointer select-none hover:bg-slate-100/60 transition-colors whitespace-nowrap"
                title={showColumnFilters ? "Click column header to hide filters" : "Click column header to show filters"}
              >
                {visibleColumns.includes('no') && (
                  <th className="px-3 py-2.5 text-center w-10 text-gray-500 select-none">No.</th>
                )}
                
                {visibleColumns.includes('employee') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Employee</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('employee');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Employee"
                      >
                        {sortConfig?.key === 'employee' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('username') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Username</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('username');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Username"
                      >
                        {sortConfig?.key === 'username' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('role') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Role</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('role');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Role"
                      >
                        {sortConfig?.key === 'role' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('reportingTo') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Reporting To</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('reportingTo');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Reporting To"
                      >
                        {sortConfig?.key === 'reportingTo' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('status') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('status');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Status"
                      >
                        {sortConfig?.key === 'status' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('accessScope') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Access Scope</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('accessScope');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Access Scope"
                      >
                        {sortConfig?.key === 'accessScope' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('moduleAccess') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Module Access</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('moduleAccess');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Module Access"
                      >
                        {sortConfig?.key === 'moduleAccess' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('department') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Department</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('department');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Department"
                      >
                        {sortConfig?.key === 'department' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('designation') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Designation</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('designation');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Designation"
                      >
                        {sortConfig?.key === 'designation' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('contactNumber') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Contact Number</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('contactNumber');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Contact Number"
                      >
                        {sortConfig?.key === 'contactNumber' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('officialEmail') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Official Email</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('officialEmail');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Official Email"
                      >
                        {sortConfig?.key === 'officialEmail' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('city') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>City</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('city');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by City"
                      >
                        {sortConfig?.key === 'city' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('state') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>State</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('state');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by State"
                      >
                        {sortConfig?.key === 'state' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('country') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Country</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('country');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Country"
                      >
                        {sortConfig?.key === 'country' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('pincode') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Pincode</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('pincode');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Pincode"
                      >
                        {sortConfig?.key === 'pincode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('createdAt') && (
                  <th className="px-3.5 py-2.5 select-none whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Date Added</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('createdAt');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Date Added"
                      >
                        {sortConfig?.key === 'createdAt' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('action') && (
                  <th className="px-3.5 py-2.5 text-right font-semibold whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Action</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowColumnFilters(!showColumnFilters);
                        }}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                          showColumnFilters 
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                        title={showColumnFilters ? 'Click to hide column filters' : 'Click to show column filters'}
                      >
                        <Filter size={10} className={hasActiveColumnFilters ? 'text-blue-600' : 'text-gray-500'} />
                        <span>{showColumnFilters ? 'Hide' : 'Filter'}</span>
                      </button>
                    </div>
                  </th>
                )}
              </tr>

              {/* Column Filters Row */}
              {showColumnFilters && (
                <tr className="bg-blue-50/40 border-t border-blue-100/60 lowercase normal-case tracking-normal">
                  {visibleColumns.includes('no') && (
                    <th className="px-3 py-1.5 font-normal text-center"></th>
                  )}

                  {/* Employee Filter */}
                  {visibleColumns.includes('employee') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.employee}
                          onChange={(e) => handleColumnFilterChange('employee', e.target.value)}
                          placeholder="Filter name/code..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.employee && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('employee', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Username Filter */}
                  {visibleColumns.includes('username') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.username}
                          onChange={(e) => handleColumnFilterChange('username', e.target.value)}
                          placeholder="Filter username..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.username && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('username', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Role Filter */}
                  {visibleColumns.includes('role') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.role}
                          onChange={(e) => handleColumnFilterChange('role', e.target.value)}
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Roles</option>
                          {uniqueRoles.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        {columnFilters.role && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('role', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Reporting To Filter */}
                  {visibleColumns.includes('reportingTo') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.reportingTo}
                          onChange={(e) => handleColumnFilterChange('reportingTo', e.target.value)}
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Managers</option>
                          {uniqueReportingTo.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        {columnFilters.reportingTo && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('reportingTo', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Status Filter */}
                  {visibleColumns.includes('status') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.status}
                          onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        {columnFilters.status && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('status', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Access Scope Filter */}
                  {visibleColumns.includes('accessScope') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.accessScope}
                          onChange={(e) => handleColumnFilterChange('accessScope', e.target.value)}
                          placeholder="Filter facility/device..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.accessScope && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('accessScope', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Module Access Filter */}
                  {visibleColumns.includes('moduleAccess') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.moduleAccess}
                          onChange={(e) => handleColumnFilterChange('moduleAccess', e.target.value)}
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Access</option>
                          <option value="ALL">All Modules</option>
                          <option value="IOT_EMS">IoT / EMS</option>
                          <option value="4M_FACILITIES">4M Facilities</option>
                          <option value="SERVICE_AGENTS">Service Agents</option>
                        </select>
                        {columnFilters.moduleAccess && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('moduleAccess', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Department Filter */}
                  {visibleColumns.includes('department') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.department}
                          onChange={(e) => handleColumnFilterChange('department', e.target.value)}
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Depts</option>
                          {uniqueDepartments.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        {columnFilters.department && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('department', '')}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Designation Filter */}
                  {visibleColumns.includes('designation') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.designation}
                          onChange={(e) => handleColumnFilterChange('designation', e.target.value)}
                          placeholder="Filter desig..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.designation && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('designation', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Contact Number Filter */}
                  {visibleColumns.includes('contactNumber') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.contactNumber}
                          onChange={(e) => handleColumnFilterChange('contactNumber', e.target.value)}
                          placeholder="Filter phone..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.contactNumber && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('contactNumber', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Official Email Filter */}
                  {visibleColumns.includes('officialEmail') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.officialEmail}
                          onChange={(e) => handleColumnFilterChange('officialEmail', e.target.value)}
                          placeholder="Filter email..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.officialEmail && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('officialEmail', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* City Filter */}
                  {visibleColumns.includes('city') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.city}
                          onChange={(e) => handleColumnFilterChange('city', e.target.value)}
                          placeholder="Filter city..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.city && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('city', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* State Filter */}
                  {visibleColumns.includes('state') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.state}
                          onChange={(e) => handleColumnFilterChange('state', e.target.value)}
                          placeholder="Filter state..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.state && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('state', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Country Filter */}
                  {visibleColumns.includes('country') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.country}
                          onChange={(e) => handleColumnFilterChange('country', e.target.value)}
                          placeholder="Filter country..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.country && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('country', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Pincode Filter */}
                  {visibleColumns.includes('pincode') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.pincode}
                          onChange={(e) => handleColumnFilterChange('pincode', e.target.value)}
                          placeholder="Filter pincode..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.pincode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('pincode', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* CreatedAt Filter */}
                  {visibleColumns.includes('createdAt') && (
                    <th className="px-2.5 py-1.5 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.createdAt}
                          onChange={(e) => handleColumnFilterChange('createdAt', e.target.value)}
                          placeholder="Filter date..."
                          className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.createdAt && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('createdAt', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('action') && (
                    <th className="px-2.5 py-1.5 font-normal text-right">
                      {hasActiveColumnFilters && (
                        <button
                          type="button"
                          onClick={clearAllColumnFilters}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </th>
                  )}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={visibleColumns.length} rows={5} />
              ) : currentUsers.length > 0 ? (
                currentUsers.map((listUser, index) => {
                  const empName = getUserDisplayName(listUser);
                  const initials = getInitials(empName);
                  const empCode = listUser.employee?.employeeCode;

                  return (
                    <tr 
                      key={listUser.id || index} 
                      onClick={() => navigate(`/user-management/view/${listUser.id}`)}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer text-xs"
                    >
                      {visibleColumns.includes('no') && (
                        <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                          {startIndex + index + 1}
                        </td>
                      )}

                      {visibleColumns.includes('employee') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center border border-emerald-200 flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-xs">{empName}</div>
                              {empCode && (
                                <div className="text-[10px] font-mono text-gray-400 font-medium">{empCode}</div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      {visibleColumns.includes('username') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-xs font-mono text-gray-700">
                          {listUser.username || '-'}
                        </td>
                      )}

                      {visibleColumns.includes('role') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {listUser.role === 'SUPER_ADMIN' ? (
                            <span className="text-gray-400 text-xs font-medium pl-1">-</span>
                          ) : listUser.designation ? (
                            <span className="text-xs font-medium text-gray-800">{listUser.designation}</span>
                          ) : (
                            <span className="text-gray-400 text-xs font-medium pl-1">-</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.includes('reportingTo') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {listUser.role === 'SUPER_ADMIN' ? (
                            <span className="text-gray-400 text-xs font-medium pl-1">-</span>
                          ) : (listUser.employee?.reportingTo || listUser.reportingTo) ? (
                            <span className="text-xs font-medium text-gray-800">{listUser.employee?.reportingTo || listUser.reportingTo}</span>
                          ) : (
                            <span className="text-gray-400 text-xs font-medium pl-1">-</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.includes('status') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            listUser.isActive 
                              ? 'bg-green-50 text-green-700 border border-green-200' 
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            {listUser.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      )}

                      {visibleColumns.includes('accessScope') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {listUser.deviceName || listUser.deviceId ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200" title={`Device ID: ${listUser.deviceId}`}>
                              <Cpu className="w-3 h-3 text-orange-600" />
                              <span>{listUser.deviceName || listUser.deviceId}</span>
                            </span>
                          ) : listUser.facility?.facilityName ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
                              <Building className="w-3 h-3 text-green-600" />
                              <span>{listUser.facility.facilityName}</span>
                            </span>
                          ) : listUser.mainFacility?.mainFacilityName ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Building2 className="w-3 h-3 text-emerald-600" />
                              <span>{listUser.mainFacility.mainFacilityName}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs font-medium pl-1">-</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.includes('moduleAccess') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {listUser.moduleAccess || 'ALL'}
                          </span>
                        </td>
                      )}

                      {visibleColumns.includes('department') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {listUser.employee?.department ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {listUser.employee.department}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.includes('designation') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-xs font-medium text-gray-700">
                          {listUser.employee?.designation || listUser.designation || '-'}
                        </td>
                      )}

                      {visibleColumns.includes('contactNumber') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-600 font-medium">
                          {listUser.employee?.mobileNumber || listUser.mobileNumber ? (
                            <div className="flex items-center gap-1 text-gray-700">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{listUser.employee?.mobileNumber || listUser.mobileNumber}</span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}

                      {visibleColumns.includes('officialEmail') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-600 font-medium">
                          {listUser.employee?.officialEmail || listUser.email ? (
                            <div className="flex items-center gap-1 text-gray-700 max-w-[160px] truncate">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{listUser.employee?.officialEmail || listUser.email}</span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}

                      {visibleColumns.includes('city') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-700 font-medium">
                          {listUser.city || '-'}
                        </td>
                      )}

                      {visibleColumns.includes('state') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-700 font-medium">
                          {listUser.state || '-'}
                        </td>
                      )}

                      {visibleColumns.includes('country') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-700 font-medium">
                          {listUser.country || '-'}
                        </td>
                      )}

                      {visibleColumns.includes('pincode') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-700 font-mono">
                          {listUser.pincode || '-'}
                        </td>
                      )}

                      {visibleColumns.includes('createdAt') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-500">
                          {listUser.createdAt ? new Date(listUser.createdAt).toLocaleDateString() : '-'}
                        </td>
                      )}

                      {visibleColumns.includes('action') && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/user-management/view/${listUser.id}`); }}
                              className="text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors" title="View"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canEdit && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigate(`/user-management/edit/${listUser.id}`); }}
                                className="text-gray-400 hover:text-green-600 p-1 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
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
                                className="text-gray-400 hover:text-purple-600 p-1 rounded-md hover:bg-purple-50 transition-colors" 
                                title="Special Permissions"
                                aria-label="Special Permissions"
                                data-testid="special-permissions-btn"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); confirmDelete(listUser.id); }}
                                className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors" title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Users className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">No users found</p>
                      <p className="text-sm text-gray-500 max-w-sm">
                        {hasActiveColumnFilters
                          ? 'No users match the current filter criteria.'
                          : 'Get started by adding a new user to the system.'}
                      </p>
                      {hasActiveColumnFilters && (
                        <button
                          type="button"
                          onClick={clearAllColumnFilters}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                        >
                          Clear Column Filters
                        </button>
                      )}
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
        onClose={() => {
          setPermissionsModalOpen(false);
          fetchUsers();
        }}
        userId={selectedUserId}
        userName={selectedUserName}
      />
    </div>
  );
}

