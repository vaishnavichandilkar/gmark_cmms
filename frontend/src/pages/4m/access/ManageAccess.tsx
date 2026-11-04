import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Eye, Trash2, Shield, Filter, RotateCcw, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DeleteConfirmModal } from '../../../components/shared/DeleteConfirmModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableActions, type FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import { ColumnCustomizer } from '../../../components/shared/ColumnCustomizer';
import type { ColumnDefinition } from '../../../components/shared/ColumnCustomizer';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission } from '../../../utils/permissions';
import { api } from '../../../lib/api';

const MANAGE_ACCESS_COLUMNS: ColumnDefinition[] = [
  { id: 'no', label: 'No.', category: 'General', defaultVisible: false },
  { id: 'roleName', label: 'Role Name', category: 'General', required: true, defaultVisible: true },
  { id: 'totalUsers', label: 'Total Users', category: 'General', defaultVisible: true },
  { id: 'users', label: 'Assigned Users', category: 'General', defaultVisible: false },
  { id: 'status', label: 'Status', category: 'Status', defaultVisible: true },
  { id: 'action', label: 'Action', category: 'General', required: true, defaultVisible: true },
];

const DEFAULT_MANAGE_ACCESS_VISIBLE_COLUMNS = MANAGE_ACCESS_COLUMNS.filter(c => c.defaultVisible !== false).map(c => c.id);

export function ManageAccess() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const canCreate = hasPermission(user, 'manage_access', 'create');
  const canEdit = hasPermission(user, 'manage_access', 'edit');
  const canDelete = hasPermission(user, 'manage_access', 'delete');
  const canExport = hasPermission(user, 'manage_access', 'export');
  const canPrint = hasPermission(user, 'manage_access', 'print');

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('manage_access_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load visible columns from localStorage', e);
    }
    return DEFAULT_MANAGE_ACCESS_VISIBLE_COLUMNS;
  });

  // Column-wise filters and sorting state
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    roleName: '',
    totalUsers: '',
    users: '',
    status: '',
  });

  const [sortConfig, setSortConfig] = useState<{
    key: 'roleName' | 'totalUsers' | 'status';
    direction: 'asc' | 'desc';
  } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, columnFilters]);

  const handleColumnFilterChange = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      roleName: '',
      totalUsers: '',
      users: '',
      status: '',
    });
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => v.trim() !== '').length;
  }, [columnFilters]);

  const hasActiveColumnFilters = activeFilterCount > 0;

  const handleSort = (key: 'roleName' | 'totalUsers' | 'status') => {
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

  const fetchDesignations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/designations');
      setRoles(response.data.map((d: any) => ({
        id: d.id,
        roleName: d.name,
        totalUsers: d.totalUsers || 0,
        users: d.users || [],
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

  const uniqueRoleNames = useMemo(() => {
    return Array.from(new Set(roles.map(r => r.roleName).filter(Boolean))).sort();
  }, [roles]);

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      options: ['Active', 'Inactive']
    },
    ...(uniqueRoleNames.length > 0 ? [{
      key: 'roleName',
      label: 'Role Name',
      options: uniqueRoleNames
    }] : []),
    {
      key: 'hasUsers',
      label: 'Assigned Users State',
      options: ['With Assigned Users', 'No Users (0)']
    }
  ], [uniqueRoleNames]);

  const filteredRoles = useMemo(() => {
    let result = roles.filter(role => {
      // 1. Search Query
      if (searchQuery) {
        const searchString = searchQuery.toLowerCase();
        const name = (role.roleName || '').toLowerCase();
        const userNames = (role.users || []).map((u: any) => (u.name || '').toLowerCase()).join(' ');
        if (!name.includes(searchString) && !userNames.includes(searchString)) return false;
      }

      // Active Filters (Customize Filters)
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        if (key === 'status') {
          const statusStr = role.isActive ? 'Active' : 'Inactive';
          if (statusStr.toLowerCase() !== value.toLowerCase()) return false;
        } else if (key === 'roleName') {
          if ((role.roleName || '').toLowerCase() !== value.toLowerCase()) return false;
        } else if (key === 'hasUsers') {
          const count = role.totalUsers || (role.users || []).length;
          if (value === 'With Assigned Users' && count === 0) return false;
          if (value === 'No Users (0)' && count > 0) return false;
        }
      }

      // 2. Column Filters
      if (columnFilters.roleName && !role.roleName?.toLowerCase().includes(columnFilters.roleName.toLowerCase())) {
        return false;
      }

      if (columnFilters.totalUsers) {
        const filterStr = columnFilters.totalUsers.trim().toLowerCase();
        const countMatch = role.totalUsers?.toString().includes(filterStr);
        const nameMatch = (role.users || []).some((u: any) => (u.name || '').toLowerCase().includes(filterStr));
        if (!countMatch && !nameMatch) return false;
      }

      if (columnFilters.users) {
        const filterStr = columnFilters.users.trim().toLowerCase();
        const userMatch = (role.users || []).some((u: any) => (u.name || '').toLowerCase().includes(filterStr));
        if (!userMatch) return false;
      }

      if (columnFilters.status) {
        const statusStr = role.isActive ? 'Active' : 'Inactive';
        if (statusStr.toLowerCase() !== columnFilters.status.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'status') {
          aVal = a.isActive ? 'Active' : 'Inactive';
          bVal = b.isActive ? 'Active' : 'Inactive';
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [roles, searchQuery, columnFilters, sortConfig]);

  const totalItems = filteredRoles.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentRoles = filteredRoles.slice(startIndex, endIndex);

  const handleExport = (format: 'pdf' | 'excel') => {
    const columnMap: { id: string; label: string; getValue: (role: any, idx: number) => string }[] = [
      { id: 'no', label: 'No.', getValue: (_r, idx) => (idx + 1).toString() },
      { id: 'roleName', label: 'Role Name', getValue: role => role.roleName || '-' },
      { id: 'totalUsers', label: 'Total Users', getValue: role => (role.totalUsers || 0).toString() },
      { id: 'users', label: 'Assigned Users', getValue: role => (role.users || []).map((u: any) => u.name).join(', ') || 'None' },
      { id: 'status', label: 'Status', getValue: role => role.isActive ? 'Active' : 'Inactive' },
    ];

    const activeCols = columnMap.filter(c => visibleColumns.includes(c.id));
    const headers = activeCols.map(c => c.label);
    const rows = filteredRoles.map((role, idx) => activeCols.map(c => c.getValue(role, idx)));
    exportData(headers, rows, 'Role_List', 'Manage Access List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Search & Actions Toolbar in One Row */}
      <TableActions
        title="Manage Access"
        subtitle="Configure roles and module permissions"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search roles..."
        onExport={canExport ? handleExport : undefined}
        onPrint={canPrint ? handlePrint : undefined}
        columnCustomizer={
          <ColumnCustomizer
            columns={MANAGE_ACCESS_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="manage_access_table_columns"
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
              onClick={() => navigate('/manage-access/new')}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Role</span>
            </button>
          )
        }
      />

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-gray-700 font-semibold text-xs uppercase tracking-wider border-b border-gray-200 sticky top-0 whitespace-nowrap">
              {/* Column Title Row - Tapping main columns toggles filter row */}
              <tr 
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="cursor-pointer select-none hover:bg-slate-100/60 transition-colors whitespace-nowrap"
                title={showColumnFilters ? "Click column header to hide filters" : "Click column header to show filters"}
              >
                {visibleColumns.includes('no') && (
                  <th className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-semibold text-gray-500 w-12 select-none">
                    No.
                  </th>
                )}

                {visibleColumns.includes('roleName') && (
                  <th className="px-6 py-3.5 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Role Name</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('roleName');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Role Name"
                      >
                        {sortConfig?.key === 'roleName' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('totalUsers') && (
                  <th className="px-6 py-3.5 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Total Users</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('totalUsers');
                        }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Total Users"
                      >
                        {sortConfig?.key === 'totalUsers' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('users') && (
                  <th className="px-6 py-3.5 whitespace-nowrap text-left select-none">
                    <span>Assigned Users</span>
                  </th>
                )}

                {visibleColumns.includes('status') && (
                  <th className="px-6 py-3.5 whitespace-nowrap text-left select-none">
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

                {visibleColumns.includes('action') && (
                  <th className="px-6 py-3.5 whitespace-nowrap text-right">
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
                  {/* Serial No. Filter (Empty) */}
                  {visibleColumns.includes('no') && (
                    <th className="px-4 py-2 font-normal text-center"></th>
                  )}

                  {/* Role Name Filter */}
                  {visibleColumns.includes('roleName') && (
                    <th className="px-4 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.roleName}
                          onChange={(e) => handleColumnFilterChange('roleName', e.target.value)}
                          placeholder="Filter role..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.roleName && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('roleName', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Total Users Filter */}
                  {visibleColumns.includes('totalUsers') && (
                    <th className="px-4 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.totalUsers}
                          onChange={(e) => handleColumnFilterChange('totalUsers', e.target.value)}
                          placeholder="Filter users count..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.totalUsers && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('totalUsers', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Assigned Users Filter */}
                  {visibleColumns.includes('users') && (
                    <th className="px-4 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.users}
                          onChange={(e) => handleColumnFilterChange('users', e.target.value)}
                          placeholder="Filter users..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.users && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('users', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Status Filter */}
                  {visibleColumns.includes('status') && (
                    <th className="px-4 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.status}
                          onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal pr-6 shadow-2xs"
                        >
                          <option value="">All Statuses</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                        {columnFilters.status && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('status', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Action Column Filter (Empty) */}
                  {visibleColumns.includes('action') && (
                    <th className="px-4 py-2 text-right font-normal">
                      {hasActiveColumnFilters && (
                        <button
                          type="button"
                          onClick={clearAllColumnFilters}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                          title="Clear all"
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
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center h-16">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : currentRoles.length > 0 ? (
                currentRoles.map((role, index) => (
                  <tr 
                    key={role.id} 
                    onClick={() => navigate(`/manage-access/view/${role.id}`)}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                  >
                    {visibleColumns.includes('no') && (
                      <td className="px-4 py-4 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                        {startIndex + index + 1}
                      </td>
                    )}
                    {visibleColumns.includes('roleName') && (
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {role.roleName}
                      </td>
                    )}
                    {visibleColumns.includes('totalUsers') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {role.totalUsers}
                      </td>
                    )}
                    {visibleColumns.includes('users') && (
                      <td className="px-6 py-4 max-w-xs text-xs text-gray-600 truncate">
                        {(role.users && role.users.length > 0) ? (
                          role.users.map((u: any) => u.name).join(', ')
                        ) : (
                          <span className="text-gray-400 italic">No assigned users</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes('status') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          role.isActive
                            ? 'bg-green-50 text-green-500 border border-green-200/50' 
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('action') && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/manage-access/view/${role.id}`); }}
                            className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/manage-access/edit/${role.id}`); }}
                              className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); confirmDelete(role.id); }}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Shield className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        {hasActiveColumnFilters ? 'No roles match your column filters' : 'No roles found'}
                      </p>
                      <p className="text-sm text-gray-500 max-w-sm mb-4">
                        {hasActiveColumnFilters
                          ? 'Try modifying or clearing your column filter values to view results.'
                          : 'Get started by creating a new role.'}
                      </p>
                      {hasActiveColumnFilters && (
                        <button
                          type="button"
                          onClick={clearAllColumnFilters}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
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
