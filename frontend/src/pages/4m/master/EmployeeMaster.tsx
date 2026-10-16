import { useState, useEffect } from 'react';
import { Plus, Pencil, Search, Eye, Trash2 } from 'lucide-react';
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
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission } from '../../../utils/permissions';

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

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters]);

  const filteredEmployees = employees.filter(emp => {
    // 1. Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        (emp.employeeCode && emp.employeeCode.toLowerCase().includes(query)) ||
        (emp.fullName && emp.fullName.toLowerCase().includes(query)) ||
        (emp.mobileNumber && emp.mobileNumber.toLowerCase().includes(query)) ||
        (emp.officialEmail && emp.officialEmail.toLowerCase().includes(query)) ||
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

    return true;
  });

  // Generate dynamic filter options based on available data
  const filterOptions: FilterOption[] = [
    {
      key: 'department',
      label: 'Department',
      options: Array.from(new Set(employees.map(e => e.department).filter(Boolean)))
    },
    {
      key: 'designation',
      label: 'Designation',
      options: Array.from(new Set(employees.map(e => e.designation).filter(Boolean)))
    }
  ];

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
    const headers = ['Emp Code', 'Full Name', 'Mobile Number', 'Official Email', 'Department', 'Designation', 'Reporting To'];
    const rows = filteredEmployees.map(emp => [
      emp.employeeCode || '-',
      emp.fullName || '-',
      emp.mobileNumber || '-',
      emp.officialEmail || '-',
      emp.department || '-',
      emp.designation || '-',
      emp.reportingTo || '-'
    ]);
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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Employee Master</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage all employees in the system</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => navigate('/master/employee/new')}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add New Employee
          </button>
        )}
      </div>

      <div className="print:hidden">
        <TableActions
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search employees..."
          onImport={canImport ? () => setIsImportOpen(true) : undefined}
          onExport={canExport ? handleExport : undefined}
          onPrint={canPrint ? handlePrint : undefined}
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">Employee List</h2>
        </div>
        
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-gray-700 font-semibold text-xs uppercase tracking-wider border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-3 py-3.5 whitespace-nowrap text-left">Emp Code</th>
                <th className="px-3 py-3.5 whitespace-nowrap text-left">Full Name</th>
                <th className="px-3 py-3.5 whitespace-nowrap text-left">Mobile Number</th>
                <th className="px-3 py-3.5 whitespace-nowrap text-left">Official Email</th>
                <th className="px-3 py-3.5 whitespace-nowrap text-left">Department</th>
                <th className="px-3 py-3.5 whitespace-nowrap text-left">Designation</th>
                <th className="px-3 py-3.5 whitespace-nowrap text-left">Reporting To</th>
                <th className="px-3 py-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <TableSkeleton columns={8} rows={5} />
              ) : currentEmployees.length > 0 ? (
                currentEmployees.map((emp, index) => (
                  <tr 
                    key={index} 
                    onClick={() => navigate(`/master/employee/view/${emp.id}`)}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer text-xs sm:text-sm"
                  >
                    <td className="px-3 py-3 whitespace-nowrap font-semibold text-gray-900 font-mono">{emp.employeeCode}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-medium text-gray-800">{emp.fullName}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-600">{emp.mobileNumber}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-500 max-w-[180px] truncate">{emp.officialEmail || '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        {emp.department}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-700">{emp.designation}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-700">{emp.reportingTo || '-'}</td>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">No employees found</p>
                      <p className="text-sm text-gray-500 max-w-sm">
                        Get started by adding a new employee to the system.
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
