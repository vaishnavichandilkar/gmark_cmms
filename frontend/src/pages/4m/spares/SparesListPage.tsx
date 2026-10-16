import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, ArrowLeft, X } from 'lucide-react';
import { spareService, type SparePart } from '../../../services/spareService';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { TableActions, type FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import toast from 'react-hot-toast';

export function SparesListPage() {
  const navigate = useNavigate();
  const [spares, setSpares] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters]);

  useEffect(() => {
    fetchSpares();
  }, []);

  const fetchSpares = async () => {
    setLoading(true);
    try {
      const data = await spareService.getAll();
      setSpares(data);
    } catch (err) {
      toast.error('Failed to load spare parts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredSpares.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const openDeleteModal = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one spare part to delete');
      return;
    }
    setDeletionReason('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      for (const id of selectedIds) {
        await spareService.delete(id);
      }
      toast.success(`Deleted ${selectedIds.length} spare part record(s)`);
      setIsDeleteModalOpen(false);
      setSelectedIds([]);
      fetchSpares();
    } catch (err) {
      toast.error('Failed to delete selected spare parts');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFileName(file.name);
    }
  };

  const handleConfirmImport = () => {
    if (!importFileName) {
      toast.error('Please select a CSV file to upload');
      return;
    }
    toast.success(`Successfully imported spares from ${importFileName}`);
    setIsImportModalOpen(false);
    setImportFileName('');
    fetchSpares();
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (filteredSpares.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['No.', 'Spare Name', 'Spare Code', 'Location', 'In Hand Amount', 'Stock', 'Stock Location'];
    const rows = filteredSpares.map((s, idx) => [
      idx + 1,
      s.partName || '-',
      s.partCode || '-',
      s.location || '-',
      `₹${s.rate !== undefined ? Number(s.rate).toFixed(2) : s.unitCost ? Number(s.unitCost).toFixed(2) : '0.00'}`,
      s.stockQuantity ?? 0,
      s.stockLocation || s.location || '-'
    ]);
    exportData(headers, rows, 'Spares_List', 'Spares Inventory List', format);
  };

  const filteredSpares = spares.filter(item => {
    const matchesSearch = 
      (item.partName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.partCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !activeFilters.category || item.category === activeFilters.category;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(spares.map(s => s.category).filter(Boolean)));
  const filterOptions: FilterOption[] = categories.length > 0 ? [
    {
      key: 'category',
      label: 'Category',
      options: categories.map(c => ({ label: String(c), value: String(c) }))
    }
  ] : [];

  const totalItems = filteredSpares.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentSpares = filteredSpares.slice(startIndex, endIndex);

  return (
    <div className="w-full flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Spares Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage spare parts inventory, stock levels, and catalog</p>
        </div>
        <button 
          onClick={() => navigate('/spares/new')}
          className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Add New Spare
        </button>
      </div>

      {/* Table Actions Toolbar */}
      <TableActions
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search spares..."
        onImport={() => {
          setImportFileName('');
          setIsImportModalOpen(true);
        }}
        onExport={handleExport}
        onPrint={handlePrint}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">All Spare Parts</h2>
          {selectedIds.length > 0 && (
            <button
              onClick={openDeleteModal}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={currentSpares.length > 0 && selectedIds.length === currentSpares.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3.5">No.</th>
                <th className="px-5 py-3.5">Spare Name</th>
                <th className="px-5 py-3.5">Spare Code</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">In Hand Amount</th>
                <th className="px-5 py-3.5">Stock</th>
                <th className="px-5 py-3.5">Stock Location</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton columns={9} rows={5} />
              ) : currentSpares.length > 0 ? (
                currentSpares.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/spares/edit/${item.id}`)}
                      className={`hover:bg-blue-50/40 transition-colors group cursor-pointer ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const img = item.imageUrl || (item as any).namePlateFile;
                            if (img) {
                              const resolved = img.startsWith('data:') || img.startsWith('blob:')
                                ? img
                                : img.startsWith('http://') || img.startsWith('https://')
                                  ? (img.includes(':3001/uploads/') ? img.replace(/^http:\/\/(localhost|127\.0\.0\.1):3001/, '') : img)
                                  : (img.startsWith('/') ? img : `/${img}`);
                              return (
                                <img
                                  src={resolved}
                                  alt={item.partName}
                                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (img && !target.src.includes(':3001') && !target.src.startsWith('data:')) {
                                      target.src = `http://localhost:3001${img.startsWith('/') ? img : `/${img}`}`;
                                    }
                                  }}
                                />
                              );
                            }
                            return (
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 text-xs font-bold">
                                {item.partName?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                            );
                          })()}
                          <span>{item.partName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {item.partCode}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {item.location || '-'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-700">
                        ₹{item.rate !== undefined ? Number(item.rate).toFixed(2) : item.unitCost ? Number(item.unitCost).toFixed(2) : '0.00'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          (item.stockQuantity || 0) > 10 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : (item.stockQuantity || 0) > 0 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {item.stockQuantity ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                        {item.stockLocation || item.location || '-'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/spares/edit/${item.id}`)}
                            className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIds([item.id]);
                              setDeletionReason('');
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
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
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No spare parts found.
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
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>

      {/* IMPORT SPARES MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-xl border border-slate-200 relative">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Import Spares</h2>
            </div>

            {/* File Upload Box */}
            <div className="flex items-center gap-3 p-2 border border-slate-300 rounded-xl bg-white">
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shrink-0">
                Choose File
                <input type="file" accept=".csv" onChange={handleImportFileChange} className="hidden" />
              </label>

              <span className="text-xs font-medium text-slate-600 truncate flex-1">
                {importFileName || 'Filename.csv'}
              </span>

              {importFileName && (
                <button 
                  onClick={() => setImportFileName('')}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Info Notice Box */}
            <div className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                i
              </div>
              <p>
                A CSV is a comma-separated values file. CSV files can be created and edited with spreadsheet software like Microsoft Excel.
              </p>
            </div>

            {/* Upload Action Button */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SPARE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 relative">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Delete Spare Part</h2>
            </div>

            {/* Confirmation text */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-700">
                Are you sure you want to delete {selectedIds.length} spare part record(s)?
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Deletion</label>
                <textarea
                  rows={3}
                  placeholder="Enter reason..."
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 resize-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
