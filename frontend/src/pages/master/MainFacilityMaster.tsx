import { useState, useEffect } from 'react';
import { Plus, Pencil, Building2, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import toast from 'react-hot-toast';
import { TableActions } from '../../components/TableActions';
import type { FilterOption } from '../../components/TableActions';
import { ImportModal } from '../../components/ImportModal';
import type { ImportConfig } from '../../components/ImportModal';
import { exportData } from '../../utils/exportUtils';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { hasPermission } from '../../utils/permissions';

export function MainFacilityMaster() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const canCreate = hasPermission(user, 'master_main_facility', 'create');
  const canEdit = hasPermission(user, 'master_main_facility', 'edit');
  const canDelete = hasPermission(user, 'master_main_facility', 'delete');
  const canExport = hasPermission(user, 'master_main_facility', 'export');
  const canPrint = hasPermission(user, 'master_main_facility', 'print');
  const canImport = hasPermission(user, 'master_main_facility', 'import');

  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters]);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/main-facilities');
      setFacilities(response.data);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setFacilityToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (facilityToDelete === null) return;
    try {
      await api.delete(`/main-facilities/${facilityToDelete}`);
      setDeleteModalOpen(false);
      setFacilityToDelete(null);
      fetchFacilities();
    } catch (error) {
      console.error('Failed to delete facility:', error);
      toast.error('Failed to delete facility.');
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    const headers = ['Facility Code', 'Facility Name', 'Facility Head', 'Category', 'GST Number', 'Status'];
    const rows = filteredFacilities.map(facility => [
      facility.mainFacilityCode || '-',
      facility.mainFacilityName || '-',
      facility.mainFacilityHead || '-',
      facility.category || '-',
      facility.gstNumber || '-',
      facility.status || '-'
    ]);
    exportData(headers, rows, 'Main_Facility_List', 'Main Facility Master List', format);
  };

  const handleImportData = async (data: any[]) => {
    for (const row of data) {
      const payload = {
        mainFacilityCode: row['Facility Code'] || row['mainFacilityCode'] || '',
        mainFacilityName: row['Facility Name'] || row['mainFacilityName'] || '',
        mainFacilityHead: row['Facility Head'] || row['mainFacilityHead'] || '',
        category: row['Category'] || row['category'] || '',
        gstNumber: row['GST Number'] || row['gstNumber'] || '',
        status: row['Status'] || row['status'] || 'Active',
      };
      
      if (!payload.mainFacilityCode && !payload.mainFacilityName) continue;

      try {
        await api.post('/main-facilities', payload);
      } catch (err) {
        console.error('Failed to import row', row, err);
      }
    }
    fetchFacilities();
  };

  const importConfig: ImportConfig = {
    title: 'Main Facilities',
    expectedHeaders: ['Facility Code', 'Facility Name', 'Facility Head', 'Category', 'GST Number', 'Status'],
    onImport: handleImportData,
    onClose: () => setIsImportOpen(false)
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredFacilities = facilities.filter(facility => {
    // 1. Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        (facility.mainFacilityCode && facility.mainFacilityCode.toLowerCase().includes(query)) ||
        (facility.mainFacilityName && facility.mainFacilityName.toLowerCase().includes(query)) ||
        (facility.mainFacilityHead && facility.mainFacilityHead.toLowerCase().includes(query)) ||
        (facility.category && facility.category.toLowerCase().includes(query)) ||
        (facility.gstNumber && facility.gstNumber.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }

    // 2. Filter by Active Filters
    for (const [key, value] of Object.entries(activeFilters)) {
      if (facility[key] !== value) return false;
    }

    return true;
  });

  // Generate dynamic filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'category',
      label: 'Category',
      options: Array.from(new Set(facilities.map(f => f.category).filter(Boolean)))
    },
    {
      key: 'status',
      label: 'Status',
      options: Array.from(new Set(facilities.map(f => f.status).filter(Boolean)))
    }
  ];

  const totalItems = filteredFacilities.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentFacilities = filteredFacilities.slice(startIndex, endIndex);

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Facility Master</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage all main facilities in the system</p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/master/main-facility/new')}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Facility
          </button>
        )}
      </div>

      <div className="print:hidden">
        <TableActions
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search main facilities..."
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
          <h2 className="text-base font-semibold text-gray-800">Facility List</h2>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-gray-700 font-medium text-xs uppercase tracking-wider border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Facility Code</th>
                <th className="px-6 py-4 whitespace-nowrap">Facility Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Facility Head</th>
                <th className="px-6 py-4 whitespace-nowrap">Category</th>
                <th className="px-6 py-4 whitespace-nowrap">GST Number</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <TableSkeleton columns={7} rows={5} />
              ) : currentFacilities.length > 0 ? (
                currentFacilities.map((facility, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{facility.mainFacilityCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{facility.mainFacilityName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{facility.mainFacilityHead}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{facility.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{facility.gstNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${facility.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {facility.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/master/main-facility/view/${facility.id}`)}
                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/master/main-facility/edit/${facility.id}`)}
                            className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => confirmDelete(facility.id)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete"
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
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">No main facilities found</p>
                      <p className="text-sm text-gray-500 max-w-sm">
                        Get started by adding a new facility to the system.
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
        title="Delete Facility"
        message="Are you sure you want to delete this facility? This action cannot be undone."
        onClose={() => {
          setDeleteModalOpen(false);
          setFacilityToDelete(null);
        }}
        onConfirm={handleDelete}
      />
      
      {isImportOpen && <ImportModal config={importConfig} />}
    </div>
  );
}
