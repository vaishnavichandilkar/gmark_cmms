import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Search, Eye, Trash2, Filter, RotateCcw, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { DeleteConfirmModal } from '../../../components/shared/DeleteConfirmModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import toast from 'react-hot-toast';
import { TableActions } from '../../../components/shared/TableActions';
import type { FilterOption } from '../../../components/shared/TableActions';
import { ImportModal } from '../../../components/shared/ImportModal';
import type { ImportConfig } from '../../../components/shared/ImportModal';
import { exportData } from '../../../utils/exportUtils';
import { ColumnCustomizer } from '../../../components/shared/ColumnCustomizer';
import type { ColumnDefinition } from '../../../components/shared/ColumnCustomizer';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission } from '../../../utils/permissions';

const EMPLOYEE_COLUMNS: ColumnDefinition[] = [
  // General
  { id: 'employeeCode', label: 'Emp Code', category: 'General', required: true, defaultVisible: true },
  { id: 'fullName', label: 'Full Name', category: 'General', required: true, defaultVisible: true },
  { id: 'dateOfBirth', label: 'Date of Birth', category: 'General', defaultVisible: false },

  // Contact
  { id: 'mobileNumber', label: 'Mobile Number', category: 'Contact', defaultVisible: true },
  { id: 'officialEmail', label: 'Official Email', category: 'Contact', defaultVisible: true },
  { id: 'personalEmail', label: 'Personal Email', category: 'Contact', defaultVisible: false },

  // Organization
  { id: 'department', label: 'Department', category: 'Organization', defaultVisible: true },
  { id: 'designation', label: 'Designation', category: 'Organization', defaultVisible: true },
  { id: 'reportingTo', label: 'Reporting To', category: 'Organization', defaultVisible: true },
  { id: 'dateOfJoining', label: 'Date of Joining', category: 'Organization', defaultVisible: false },

  // Financial
  { id: 'salaryPayout', label: 'Salary Payout', category: 'Financial', defaultVisible: false },

  // System
  { id: 'dateAdded', label: 'Date Added', category: 'System', defaultVisible: false },
  { id: 'actions', label: 'Actions', category: 'System', required: true, defaultVisible: true },
];

const DEFAULT_EMPLOYEE_VISIBLE_COLUMNS = ['employeeCode', 'fullName', 'mobileNumber', 'officialEmail', 'department', 'designation', 'reportingTo', 'actions'];

export function EmployeeMaster() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const canCreate = hasPermission(user, 'master_employee', 'create');
  const canEdit = hasPermission(user, 'master_employee', 'edit');
  const canDelete = hasPermission(user, 'master_employee', 'delete');
  const canExport = hasPermission(user, 'master_employee', 'export');
  const canPrint = hasPermission(user, 'master_employee', 'print');
  const canImport = hasPermission(user, 'master_employee', 'import');

  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('employee_master_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load visible columns from localStorage', e);
    }
    return DEFAULT_EMPLOYEE_VISIBLE_COLUMNS;
  });

  // Column-wise filters and sorting state
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    employeeCode: '',
    fullName: '',
    mobileNumber: '',
    officialEmail: '',
    personalEmail: '',
    department: '',
    designation: '',
    reportingTo: '',
    dateOfBirth: '',
    dateOfJoining: '',
    salaryPayout: '',
    dateAdded: '',
  });

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters, columnFilters]);

  const handleColumnFilterChange = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      employeeCode: '',
      fullName: '',
      mobileNumber: '',
      officialEmail: '',
      personalEmail: '',
      department: '',
      designation: '',
      reportingTo: '',
      dateOfBirth: '',
      dateOfJoining: '',
      salaryPayout: '',
      dateAdded: '',
    });
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => v.trim() !== '').length;
  }, [columnFilters]);

  const hasActiveColumnFilters = activeFilterCount > 0;

  const handleSort = (key: string) => {
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

  const uniqueDepartments = useMemo(() => {
    const list = new Set<string>();
    employees.forEach(e => {
      if (e.department) list.add(String(e.department).trim());
    });
    return Array.from(list).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const uniqueDesignations = useMemo(() => {
    const list = new Set<string>();
    employees.forEach(e => {
      if (e.designation) list.add(String(e.designation).trim());
    });
    return Array.from(list).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const uniqueReportingTo = useMemo(() => {
    const list = new Set<string>();
    employees.forEach(e => {
      if (e.reportingTo) list.add(String(e.reportingTo).trim());
    });
    return Array.from(list).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      // 1. Filter by Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          (emp.employeeCode && emp.employeeCode.toLowerCase().includes(query)) ||
          (emp.fullName && emp.fullName.toLowerCase().includes(query)) ||
          (emp.mobileNumber && emp.mobileNumber.toLowerCase().includes(query)) ||
          (emp.officialEmail && emp.officialEmail.toLowerCase().includes(query)) ||
          (emp.personalEmail && emp.personalEmail.toLowerCase().includes(query)) ||
          (emp.department && emp.department.toLowerCase().includes(query)) ||
          (emp.designation && emp.designation.toLowerCase().includes(query)) ||
          (emp.reportingTo && emp.reportingTo.toLowerCase().includes(query))
        );
        if (!matchesSearch) return false;
      }

      // 2. Filter by Active Filters
      for (const [key, value] of Object.entries(activeFilters)) {
        if (emp[key] !== value) return false;
      }

      // 3. Column Filters
      if (columnFilters.employeeCode && !emp.employeeCode?.toLowerCase().includes(columnFilters.employeeCode.toLowerCase())) return false;
      if (columnFilters.fullName && !emp.fullName?.toLowerCase().includes(columnFilters.fullName.toLowerCase())) return false;
      if (columnFilters.mobileNumber && !emp.mobileNumber?.toLowerCase().includes(columnFilters.mobileNumber.toLowerCase())) return false;
      if (columnFilters.officialEmail && !emp.officialEmail?.toLowerCase().includes(columnFilters.officialEmail.toLowerCase())) return false;
      if (columnFilters.personalEmail && !emp.personalEmail?.toLowerCase().includes(columnFilters.personalEmail.toLowerCase())) return false;
      if (columnFilters.department && emp.department?.toLowerCase() !== columnFilters.department.toLowerCase()) return false;
      if (columnFilters.designation && emp.designation?.toLowerCase() !== columnFilters.designation.toLowerCase()) return false;
      if (columnFilters.reportingTo && emp.reportingTo?.toLowerCase() !== columnFilters.reportingTo.toLowerCase()) return false;
      if (columnFilters.salaryPayout && !String(emp.salaryPayout || '').toLowerCase().includes(columnFilters.salaryPayout.toLowerCase())) return false;
      if (columnFilters.dateOfBirth && !String(emp.dateOfBirth || '').toLowerCase().includes(columnFilters.dateOfBirth.toLowerCase())) return false;
      if (columnFilters.dateOfJoining && !String(emp.dateOfJoining || '').toLowerCase().includes(columnFilters.dateOfJoining.toLowerCase())) return false;
      if (columnFilters.dateAdded) {
        const dt = emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '';
        if (!dt.toLowerCase().includes(columnFilters.dateAdded.toLowerCase())) return false;
      }

      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aVal = (a[sortConfig.key] || '').toString().toLowerCase();
        let bVal = (b[sortConfig.key] || '').toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [employees, searchQuery, activeFilters, columnFilters, sortConfig]);

  const uniqueSalaryPayouts = useMemo(() => {
    const list = new Set<string>();
    employees.forEach(e => {
      if (e.salaryPayout !== null && e.salaryPayout !== undefined && e.salaryPayout !== '') {
        list.add(String(e.salaryPayout).trim());
      }
    });
    return Array.from(list).filter(Boolean).sort((a, b) => Number(a) - Number(b));
  }, [employees]);

  // Dynamic Filters for Customize Filters modal
  const filterOptions: FilterOption[] = useMemo(() => [
    ...(uniqueDepartments.length > 0 ? [{
      key: 'department',
      label: 'Department',
      options: uniqueDepartments
    }] : []),
    ...(uniqueDesignations.length > 0 ? [{
      key: 'designation',
      label: 'Designation',
      options: uniqueDesignations
    }] : []),
    ...(uniqueReportingTo.length > 0 ? [{
      key: 'reportingTo',
      label: 'Reporting Manager',
      options: uniqueReportingTo
    }] : []),
    ...(uniqueSalaryPayouts.length > 0 ? [{
      key: 'salaryPayout',
      label: 'Salary Payout Mode',
      options: uniqueSalaryPayouts
    }] : []),
  ], [uniqueDepartments, uniqueDesignations, uniqueReportingTo, uniqueSalaryPayouts]);

  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setEmployeeToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (employeeToDelete === null) return;
    try {
      await api.delete(`/employees/${employeeToDelete}`);
      setDeleteModalOpen(false);
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete employee.');
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    const columnMap: { id: string; label: string; getValue: (emp: any) => string }[] = [
      { id: 'employeeCode', label: 'Emp Code', getValue: emp => emp.employeeCode || '-' },
      { id: 'fullName', label: 'Full Name', getValue: emp => emp.fullName || '-' },
      { id: 'dateOfBirth', label: 'Date of Birth', getValue: emp => emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString('en-GB').replace(/\//g, '-') : '-' },
      { id: 'mobileNumber', label: 'Mobile Number', getValue: emp => emp.mobileNumber || '-' },
      { id: 'officialEmail', label: 'Official Email', getValue: emp => emp.officialEmail || '-' },
      { id: 'personalEmail', label: 'Personal Email', getValue: emp => emp.personalEmail || '-' },
      { id: 'department', label: 'Department', getValue: emp => emp.department || '-' },
      { id: 'designation', label: 'Designation', getValue: emp => emp.designation || '-' },
      { id: 'reportingTo', label: 'Reporting To', getValue: emp => emp.reportingTo || '-' },
      { id: 'dateOfJoining', label: 'Date of Joining', getValue: emp => emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-GB').replace(/\//g, '-') : '-' },
      { id: 'salaryPayout', label: 'Salary Payout', getValue: emp => emp.salaryPayout != null ? `₹${emp.salaryPayout}` : '-' },
      { id: 'dateAdded', label: 'Date Added', getValue: emp => emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-' },
    ];

    const activeCols = columnMap.filter(c => visibleColumns.includes(c.id));
    const headers = activeCols.map(c => c.label);
    const rows = filteredEmployees.map(emp => activeCols.map(c => c.getValue(emp)));
    exportData(headers, rows, 'Employee_List', 'Employee Master List', format);
  };

  const handleImportData = async (data: any[]) => {
    // Process each row and create employee
    for (const row of data) {
      const payload = {
        employeeCode: row['Emp Code'] || row['employeeCode'] || '',
        fullName: row['Full Name'] || row['fullName'] || '',
        mobileNumber: row['Mobile Number'] || row['mobileNumber'] || '',
        officialEmail: row['Official Email'] || row['officialEmail'] || '',
        department: row['Department'] || row['department'] || '',
        designation: row['Designation'] || row['designation'] || '',
        reportingTo: row['Reporting To'] || row['reportingTo'] || '',
        dateOfJoining: row['Date Of Joining'] || row['dateOfJoining'] || new Date().toISOString(),
        dateOfBirth: row['Date Of Birth'] || row['dateOfBirth'] || '1990-01-01T00:00:00.000Z',
      };
      
      // Skip empty rows
      if (!payload.employeeCode && !payload.fullName) continue;

      try {
        await api.post('/employees', payload);
      } catch (err) {
        console.error('Failed to import row', row, err);
        // Continue with other rows even if one fails
      }
    }
    fetchEmployees();
  };

  const importConfig: ImportConfig = {
    title: 'Employees',
    expectedHeaders: ['Emp Code', 'Full Name', 'Mobile Number', 'Official Email', 'Department', 'Designation', 'Reporting To'],
    onImport: handleImportData,
    onClose: () => setIsImportOpen(false)
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      <div className="print:hidden">
        <TableActions
          title="Employee Master"
          subtitle="Manage all employees in the system"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search employees..."
          onImport={canImport ? () => setIsImportOpen(true) : undefined}
          onExport={canExport ? handleExport : undefined}
          onPrint={canPrint ? handlePrint : undefined}
          columnCustomizer={
            <ColumnCustomizer
              columns={EMPLOYEE_COLUMNS}
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
              storageKey="employee_master_table_columns"
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
                onClick={() => navigate('/master/employee/new')}
                className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Employee</span>
              </button>
            )
          }
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-gray-700 font-semibold text-xs uppercase tracking-wider border-b border-gray-200 sticky top-0 whitespace-nowrap">
              {/* Column Title Row - Tapping main columns toggles filter row */}
              <tr 
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="cursor-pointer select-none hover:bg-slate-100/60 transition-colors whitespace-nowrap"
                title={showColumnFilters ? "Click column header to hide filters" : "Click column header to show filters"}
              >                {/* General */}
                {visibleColumns.includes('employeeCode') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Emp Code</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('employeeCode'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Emp Code"
                      >
                        {sortConfig?.key === 'employeeCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('fullName') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Full Name</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('fullName'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Full Name"
                      >
                        {sortConfig?.key === 'fullName' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('dateOfBirth') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Date of Birth</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('dateOfBirth'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Date of Birth"
                      >
                        {sortConfig?.key === 'dateOfBirth' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {/* Contact */}
                {visibleColumns.includes('mobileNumber') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Mobile Number</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('mobileNumber'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Mobile Number"
                      >
                        {sortConfig?.key === 'mobileNumber' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('officialEmail') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Official Email</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('officialEmail'); }}
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

                {visibleColumns.includes('personalEmail') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Personal Email</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('personalEmail'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Personal Email"
                      >
                        {sortConfig?.key === 'personalEmail' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {/* Organization */}
                {visibleColumns.includes('department') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Department</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('department'); }}
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
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Designation</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('designation'); }}
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

                {visibleColumns.includes('reportingTo') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Reporting To</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('reportingTo'); }}
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

                {visibleColumns.includes('dateOfJoining') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Date of Joining</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('dateOfJoining'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Date of Joining"
                      >
                        {sortConfig?.key === 'dateOfJoining' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {/* Financial */}
                {visibleColumns.includes('salaryPayout') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Salary Payout</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('salaryPayout'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Salary Payout"
                      >
                        {sortConfig?.key === 'salaryPayout' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {/* System */}
                {visibleColumns.includes('dateAdded') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-left select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Date Added</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSort('dateAdded'); }}
                        className="p-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Sort by Date Added"
                      >
                        {sortConfig?.key === 'dateAdded' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('actions') && (
                  <th className="px-3.5 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Actions</span>
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
                  {/* Emp Code Filter */}
                  {visibleColumns.includes('employeeCode') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.employeeCode}
                          onChange={(e) => handleColumnFilterChange('employeeCode', e.target.value)}
                          placeholder="Filter code..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.employeeCode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('employeeCode', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Full Name Filter */}
                  {visibleColumns.includes('fullName') && (
                    <th className="px-2.5 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          value={columnFilters.fullName}
                          onChange={(e) => handleColumnFilterChange('fullName', e.target.value)}
                          placeholder="Filter name..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal pr-6 shadow-2xs"
                        />
                        {columnFilters.fullName && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('fullName', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* DOB Filter */}
                  {visibleColumns.includes('dateOfBirth') && (
                    <th className="px-2.5 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.dateOfBirth}
                        onChange={(e) => handleColumnFilterChange('dateOfBirth', e.target.value)}
                        placeholder="Filter DOB..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Mobile Filter */}
                  {visibleColumns.includes('mobileNumber') && (
                    <th className="px-2.5 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.mobileNumber}
                        onChange={(e) => handleColumnFilterChange('mobileNumber', e.target.value)}
                        placeholder="Filter mobile..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Official Email Filter */}
                  {visibleColumns.includes('officialEmail') && (
                    <th className="px-2.5 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.officialEmail}
                        onChange={(e) => handleColumnFilterChange('officialEmail', e.target.value)}
                        placeholder="Filter email..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Personal Email Filter */}
                  {visibleColumns.includes('personalEmail') && (
                    <th className="px-2.5 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.personalEmail}
                        onChange={(e) => handleColumnFilterChange('personalEmail', e.target.value)}
                        placeholder="Filter personal email..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Department Filter */}
                  {visibleColumns.includes('department') && (
                    <th className="px-2.5 py-2 font-normal">
                      <select
                        value={columnFilters.department}
                        onChange={(e) => handleColumnFilterChange('department', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs"
                      >
                        <option value="">All Departments</option>
                        {uniqueDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </th>
                  )}

                  {/* Designation Filter */}
                  {visibleColumns.includes('designation') && (
                    <th className="px-2.5 py-2 font-normal">
                      <select
                        value={columnFilters.designation}
                        onChange={(e) => handleColumnFilterChange('designation', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs"
                      >
                        <option value="">All Designations</option>
                        {uniqueDesignations.map(desig => (
                          <option key={desig} value={desig}>{desig}</option>
                        ))}
                      </select>
                    </th>
                  )}

                  {/* Reporting To Filter */}
                  {visibleColumns.includes('reportingTo') && (
                    <th className="px-2.5 py-2 font-normal">
                      <select
                        value={columnFilters.reportingTo}
                        onChange={(e) => handleColumnFilterChange('reportingTo', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-normal shadow-2xs"
                      >
                        <option value="">All Reporting</option>
                        {uniqueReportingTo.map(rep => (
                          <option key={rep} value={rep}>{rep}</option>
                        ))}
                      </select>
                    </th>
                  )}

                  {/* Date of Joining Filter */}
                  {visibleColumns.includes('dateOfJoining') && (
                    <th className="px-2.5 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.dateOfJoining}
                        onChange={(e) => handleColumnFilterChange('dateOfJoining', e.target.value)}
                        placeholder="Filter DOJ..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Salary Payout Filter */}
                  {visibleColumns.includes('salaryPayout') && (
                    <th className="px-2.5 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.salaryPayout}
                        onChange={(e) => handleColumnFilterChange('salaryPayout', e.target.value)}
                        placeholder="Filter salary..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Date Added Filter */}
                  {visibleColumns.includes('dateAdded') && (
                    <th className="px-2.5 py-2 font-normal">
                      <input
                        type="text"
                        value={columnFilters.dateAdded}
                        onChange={(e) => handleColumnFilterChange('dateAdded', e.target.value)}
                        placeholder="Filter date..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 font-normal shadow-2xs"
                      />
                    </th>
                  )}

                  {/* Action Column Filter (Empty) */}
                  {visibleColumns.includes('actions') && (
                    <th className="px-2.5 py-2 text-center font-normal">
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
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <TableSkeleton columns={visibleColumns.length} rows={5} />
              ) : currentEmployees.length > 0 ? (
                currentEmployees.map((emp, index) => (
                  <tr 
                    key={index} 
                    onClick={() => navigate(`/master/employee/view/${emp.id}`)}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer text-xs sm:text-sm"
                  >
                    {/* General */}
                    {visibleColumns.includes('employeeCode') && (
                      <td className="px-3 py-3 whitespace-nowrap font-semibold text-gray-900 font-mono">{emp.employeeCode}</td>
                    )}
                    {visibleColumns.includes('fullName') && (
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-gray-800">{emp.fullName}</td>
                    )}
                    {visibleColumns.includes('dateOfBirth') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-600">
                        {emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                      </td>
                    )}

                    {/* Contact */}
                    {visibleColumns.includes('mobileNumber') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-600">{emp.mobileNumber}</td>
                    )}
                    {visibleColumns.includes('officialEmail') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-500 max-w-[180px] truncate">{emp.officialEmail || '-'}</td>
                    )}
                    {visibleColumns.includes('personalEmail') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-500 max-w-[180px] truncate">{emp.personalEmail || '-'}</td>
                    )}

                    {/* Organization */}
                    {visibleColumns.includes('department') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          {emp.department}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('designation') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700">{emp.designation}</td>
                    )}
                    {visibleColumns.includes('reportingTo') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700">{emp.reportingTo || '-'}</td>
                    )}
                    {visibleColumns.includes('dateOfJoining') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-600">
                        {emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                      </td>
                    )}

                    {/* Financial */}
                    {visibleColumns.includes('salaryPayout') && (
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-gray-700">
                        {emp.salaryPayout != null ? `₹${emp.salaryPayout}` : '-'}
                      </td>
                    )}

                    {/* System */}
                    {visibleColumns.includes('dateAdded') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-500">
                        {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                      </td>
                    )}
                    {visibleColumns.includes('actions') && (
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/master/employee/view/${emp.id}`); }}
                            className="text-gray-500 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/master/employee/edit/${emp.id}`); }}
                              className="text-gray-500 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); confirmDelete(emp.id); }}
                              className="text-gray-500 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete"
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
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        {hasActiveColumnFilters ? 'No employees match your column filters' : 'No employees found'}
                      </p>
                      <p className="text-sm text-gray-500 max-w-sm mb-4">
                        {hasActiveColumnFilters
                          ? 'Try modifying or clearing your column filter values to view results.'
                          : 'Get started by adding a new employee to the system.'}
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
        title="Delete Employee"
        message="Are you sure you want to delete this employee? This action cannot be undone."
        onClose={() => {
          setDeleteModalOpen(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={handleDelete}
      />
      
      {isImportOpen && <ImportModal config={importConfig} />}
    </div>
  );
}
