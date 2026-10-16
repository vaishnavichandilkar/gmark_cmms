import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supplierService, type Supplier } from '../../../services/supplierService';
import { ImportSupplierModal } from './ImportSupplierModal';
import { DeleteSupplierModal } from './DeleteSupplierModal';
import { AddEditSupplierModal } from './AddEditSupplierModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { TableActions, type FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';

export const SuppliersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await supplierService.getSuppliers(searchQuery);
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters]);

  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredSuppliers.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (filteredSuppliers.length === 0) {
      toast.error('No suppliers to export');
      return;
    }

    const headers = ['No.', 'Supplier Code', 'Supplier Name', 'Contact Person', 'Email', 'Phone', 'City', 'State', 'Status'];
    const rows = filteredSuppliers.map((s, index) => [
      index + 1,
      s.supplierCode || '-',
      s.name || '-',
      s.contactPerson || '-',
      s.email || '-',
      s.phone || '-',
      s.city || '-',
      s.state || '-',
      s.status || 'ACTIVE',
    ]);

    exportData(headers, rows, 'Suppliers_List', 'Suppliers Directory List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    if (activeFilters.city && s.city?.toLowerCase() !== activeFilters.city.toLowerCase()) {
      return false;
    }
    return true;
  });

  const citiesList = Array.from(new Set(suppliers.map((s) => s.city).filter(Boolean)));
  const filterOptions: FilterOption[] = citiesList.length > 0 ? [
    {
      key: 'city',
      label: 'City',
      options: citiesList.map(c => ({ label: String(c), value: String(c) }))
    }
  ] : [];

  const totalItems = filteredSuppliers.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Suppliers</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage vendors, suppliers, and procurement partners</p>
        </div>
        <button 
          onClick={() => navigate('/suppliers/new')}
          className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Supplier
        </button>
      </div>

      {/* Table Actions Toolbar */}
      <TableActions
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search suppliers..."
        onImport={() => setIsImportModalOpen(true)}
        onExport={handleExport}
        onPrint={handlePrint}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">All registered suppliers</h2>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-medium text-xs border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={currentSuppliers.length > 0 && selectedIds.length === currentSuppliers.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4">No.</th>
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Supplier Code</th>
                <th className="px-6 py-4">Contact Person</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={10} rows={5} />
              ) : currentSuppliers.length > 0 ? (
                currentSuppliers.map((supplier, index) => {
                  const isSelected = selectedIds.includes(supplier.id);
                  return (
                    <tr
                      key={supplier.id}
                      onClick={() => navigate(`/suppliers/edit/${supplier.id}`)}
                      className={`hover:bg-blue-50/40 transition-colors group cursor-pointer ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(supplier.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-500 whitespace-nowrap">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                        {supplier.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600 whitespace-nowrap">
                        {supplier.supplierCode || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {supplier.contactPerson || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {supplier.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {supplier.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {supplier.city || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          supplier.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {supplier.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/suppliers/edit/${supplier.id}`)}
                            className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIds([supplier.id]);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No suppliers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>

      {/* Modals */}
      <ImportSupplierModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchSuppliers}
      />

      <DeleteSupplierModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedIds([]);
        }}
        onSuccess={() => {
          fetchSuppliers();
          setSelectedIds([]);
        }}
        selectedIds={selectedIds}
      />

      <AddEditSupplierModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setSupplierToEdit(null);
        }}
        onSuccess={fetchSuppliers}
        supplierToEdit={supplierToEdit}
      />
    </div>
  );
};
