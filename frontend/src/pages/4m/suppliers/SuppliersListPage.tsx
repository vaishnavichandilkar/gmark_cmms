import React, { useState, useEffect } from 'react';
import { 
  Plus, ArrowDown, ArrowUp, Printer, Trash2, RefreshCw, Filter, 
  Search, ArrowLeft, Edit2, ChevronLeft, ChevronRight, Eye 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supplierService, type Supplier } from '../../../services/supplierService';
import { ImportSupplierModal } from './ImportSupplierModal';
import { DeleteSupplierModal } from './DeleteSupplierModal';
import { AddEditSupplierModal } from './AddEditSupplierModal';

export const SuppliersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  // Filter state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedCityFilter, setSelectedCityFilter] = useState('');

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
    fetchSuppliers();
  }, [searchQuery]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(suppliers.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    if (suppliers.length === 0) {
      toast.error('No suppliers to export');
      return;
    }

    const headers = ['No.', 'Supplier Code', 'Supplier Name', 'Contact Person', 'Email', 'Phone', 'GST Number', 'Address', 'City', 'State', 'Country', 'Pincode', 'Status'];
    const rows = suppliers.map((s, index) => [
      index + 1,
      `"${s.supplierCode || ''}"`,
      `"${s.name || ''}"`,
      `"${s.contactPerson || ''}"`,
      `"${s.email || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.gstNumber || ''}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      `"${s.city || ''}"`,
      `"${s.state || ''}"`,
      `"${s.country || ''}"`,
      `"${s.postalCode || ''}"`,
      `"${s.status || 'ACTIVE'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `suppliers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Suppliers list exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    if (!selectedCityFilter) return true;
    return s.city?.toLowerCase() === selectedCityFilter.toLowerCase();
  });

  const citiesList = Array.from(new Set(suppliers.map((s) => s.city).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Top Navbar Header with Search & Icons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-2 rounded-2xl">
        {/* Header Title & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-emerald-950 hover:text-emerald-800 transition-colors p-1 rounded-full hover:bg-gray-100"
            title="Go Back"
          >
            <ArrowLeft size={26} strokeWidth={2.5} />
          </button>
          <h1 className="text-2xl font-bold text-emerald-950 tracking-tight">
            Suppliers
          </h1>
        </div>

        {/* Action Toolbar Buttons matching Image 1 design */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* + New Button */}
          <button
            onClick={() => navigate('/suppliers/new')}
            className="flex items-center gap-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>New</span>
          </button>

          {/* ↓ Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-[#00a651] hover:bg-[#008f44] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <ArrowDown size={18} strokeWidth={2.5} />
            <span>Import</span>
          </button>

          {/* ↑ Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#00a651] hover:bg-[#008f44] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
            <span>Export</span>
          </button>

          {/* 🖨 Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-gray-200 cursor-pointer"
          >
            <Printer size={18} strokeWidth={2} />
            <span>Print</span>
          </button>

          {/* 🗑 Bulk Delete Icon Button */}
          <button
            onClick={() => {
              if (selectedIds.length === 0) {
                toast.error('Please select at least one supplier to delete');
                return;
              }
              setIsDeleteModalOpen(true);
            }}
            disabled={selectedIds.length === 0}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              selectedIds.length > 0
                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 shadow-xs'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Delete Selected"
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>

          {/* 🔄 Refresh Icon Button */}
          <button
            onClick={fetchSuppliers}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={18} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* 🟢 Filter Icon Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="p-2.5 rounded-xl bg-[#00a651] hover:bg-[#008f44] text-white transition-all cursor-pointer shadow-xs"
              title="Filter Options"
            >
              <Filter size={18} strokeWidth={2.5} />
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-30">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter By City</h4>
                <select
                  value={selectedCityFilter}
                  onChange={(e) => {
                    setSelectedCityFilter(e.target.value);
                    setShowFilterDropdown(false);
                  }}
                  className="w-full border border-gray-200 rounded-xl p-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                >
                  <option value="">All Cities</option>
                  {citiesList.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden print:border-none">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 print:hidden">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suppliers..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="text-xs font-semibold text-gray-500">
            Showing <span className="text-gray-900 font-bold">{filteredSuppliers.length}</span> supplier(s)
            {selectedIds.length > 0 && (
              <span className="ml-2 text-emerald-700 font-bold">({selectedIds.length} selected)</span>
            )}
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-200/70 text-gray-700 text-xs font-bold tracking-wider border-b border-gray-200">
                <th className="p-3.5 pl-4 w-10 text-center print:hidden">
                  <input
                    type="checkbox"
                    checked={suppliers.length > 0 && selectedIds.length === suppliers.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-emerald-600 rounded-xs border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5 font-bold">No.</th>
                <th className="p-3.5 font-bold">Name</th>
                <th className="p-3.5 font-bold">Code</th>
                <th className="p-3.5 font-bold">Address</th>
                <th className="p-3.5 font-bold">City</th>
                <th className="p-3.5 font-bold">State</th>
                <th className="p-3.5 font-bold">Country</th>
                <th className="p-3.5 font-bold text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-emerald-600" />
                      <span className="text-xs font-medium">Loading suppliers...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Search size={24} />
                      </div>
                      <p className="text-sm font-semibold text-gray-600">No suppliers found</p>
                      <p className="text-xs text-gray-400">Click "+ New" or "Import" to add suppliers to the list</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier, index) => {
                  const isSelected = selectedIds.includes(supplier.id);
                  return (
                    <tr
                      key={supplier.id}
                      className={`hover:bg-emerald-50/40 transition-colors ${
                        isSelected ? 'bg-emerald-50/70' : index % 2 === 1 ? 'bg-gray-50/30' : 'bg-white'
                      }`}
                    >
                      <td className="p-3.5 pl-4 text-center print:hidden">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(supplier.id)}
                          className="w-4 h-4 text-emerald-600 rounded-xs border-gray-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-semibold text-gray-600">{index + 1}</td>
                      <td className="p-3.5 font-bold text-gray-900">{supplier.name}</td>
                      <td className="p-3.5 font-medium text-emerald-800">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100 text-xs font-mono font-bold">
                          {supplier.supplierCode || '-'}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600 max-w-xs truncate" title={supplier.address || ''}>
                        {supplier.address || '-'}
                      </td>
                      <td className="p-3.5 text-gray-700 font-medium">{supplier.city || '-'}</td>
                      <td className="p-3.5 text-gray-700">{supplier.state || '-'}</td>
                      <td className="p-3.5 text-gray-700">{supplier.country || 'India'}</td>
                      <td className="p-3.5 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/suppliers/edit/${supplier.id}`)}
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Edit Supplier"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIds([supplier.id]);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Supplier"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
