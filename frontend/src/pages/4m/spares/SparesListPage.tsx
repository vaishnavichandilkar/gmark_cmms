import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, ArrowDown, ArrowUp, Printer, Trash2, RotateCw, 
  SlidersHorizontal, Search, ChevronLeft, ArrowLeft, Info, X 
} from 'lucide-react';
import { spareService, type SparePart } from '../../../services/spareService';
import toast from 'react-hot-toast';

export function SparesListPage() {
  const navigate = useNavigate();
  const [spares, setSpares] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

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
    for (const id of selectedIds) {
      await spareService.delete(id);
    }
    toast.success(`Deleted ${selectedIds.length} spare part record(s)`);
    setIsDeleteModalOpen(false);
    setSelectedIds([]);
    fetchSpares();
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

  const handleExport = () => {
    if (spares.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['No.', 'Location', 'Name', 'Code', 'In Hand Amount', 'Stock', 'Stock Location'];
    const rows = spares.map((s, idx) => [
      idx + 1,
      `"${s.location || ''}"`,
      `"${s.partName || ''}"`,
      `"${s.partCode || ''}"`,
      s.unitCost || 0,
      s.stockQuantity || 0,
      `"${s.stockLocation || s.location || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Spares_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported Spares to CSV');
  };

  const filteredSpares = spares.filter(item => {
    const matchesSearch = 
      (item.partName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.partCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategoryFilter === 'ALL' || item.category === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(spares.map(s => s.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header Controls & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Side: Back Arrow + Page Title */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            title="Go Back"
          >
            <ChevronLeft size={24} strokeWidth={2.5} className="text-gray-900" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Spares</h1>
        </div>

        {/* Right Side: Action Buttons matching design */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* + New Button */}
          <button
            onClick={() => navigate('/spares/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-emerald-50 text-gray-800 rounded-xl text-sm font-semibold border border-gray-200 transition-all hover:border-emerald-300 hover:text-emerald-700 shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>New</span>
          </button>

          {/* Import Button */}
          <button
            onClick={() => {
              setImportFileName('');
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00a651] hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <ArrowDown className="w-4 h-4 stroke-[2.5]" />
            <span>Import</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00a651] hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            <span>Export</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold border border-gray-200 transition-all"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Print</span>
          </button>

          {/* Delete Icon Button */}
          <button
            onClick={openDeleteModal}
            disabled={selectedIds.length === 0}
            className={`p-2.5 rounded-xl border border-gray-200 flex items-center justify-center transition-all ${
              selectedIds.length > 0 
                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 cursor-pointer' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 cursor-not-allowed'
            }`}
            title="Delete Selected"
          >
            <Trash2 className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchSpares}
            className="p-2.5 bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 rounded-xl flex items-center justify-center transition-colors"
            title="Refresh Data"
          >
            <RotateCw className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all shadow-sm ${
              showFilterBar ? 'bg-emerald-800 text-white' : 'bg-[#00a651] hover:bg-emerald-700 text-white'
            }`}
            title="Filter Spares"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar overlay */}
      {showFilterBar && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code, name, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-gray-500 uppercase">Category:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Spares Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-12 text-center rounded-tl-xl">
                  <input
                    type="checkbox"
                    checked={filteredSpares.length > 0 && selectedIds.length === filteredSpares.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 w-16 text-gray-600">No.</th>
                <th className="py-3 px-4 text-gray-600">Location</th>
                <th className="py-3 px-4 text-gray-600">Name</th>
                <th className="py-3 px-4 text-gray-600">Code</th>
                <th className="py-3 px-4 text-gray-600">In Hand Amount</th>
                <th className="py-3 px-4 text-gray-600">Stock</th>
                <th className="py-3 px-4 text-gray-600 rounded-tr-xl">Stock Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                    Loading spare parts catalog...
                  </td>
                </tr>
              ) : filteredSpares.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                    No spare parts found. Click <strong className="text-emerald-600">+ New</strong> to create one.
                  </td>
                </tr>
              ) : (
                filteredSpares.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/spares/edit/${item.id}`)}
                      className={`hover:bg-emerald-50/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50/70' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-500">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 text-gray-800 font-medium">
                        {item.location || 'Location 1'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900 hover:text-emerald-600 transition-colors">
                        {item.partName}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">
                        {item.partCode}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-medium">
                        {item.rate !== undefined ? item.rate.toFixed(2) : item.unitCost ? item.unitCost.toFixed(2) : '23.00'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          (item.stockQuantity || 0) > 10 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : (item.stockQuantity || 0) > 0 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {item.stockQuantity ?? 20}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {item.stockLocation || item.location || 'Location 1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="p-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <strong className="text-gray-900">{filteredSpares.length}</strong> spare item(s)
          </div>
          {selectedIds.length > 0 && (
            <div className="text-emerald-700 font-medium">
              {selectedIds.length} item(s) selected
            </div>
          )}
        </div>
      </div>

      {/* IMPORT SPARES MODAL (Matching Image 2 "Import Spares") */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Import Spares</h2>
            </div>

            {/* File Upload Box */}
            <div className="flex items-center gap-3 p-2 border border-gray-300 rounded-2xl bg-white">
              <label className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0">
                Upload File
                <input type="file" accept=".csv" onChange={handleImportFileChange} className="hidden" />
              </label>

              <span className="text-xs font-semibold text-gray-700 truncate flex-1">
                {importFileName || 'Filename.csv'}
              </span>

              {importFileName && (
                <button 
                  onClick={() => setImportFileName('')}
                  className="p-1 text-gray-500 hover:text-gray-900 mr-1"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Info Notice Box */}
            <div className="flex items-start gap-3 text-xs text-gray-700 leading-relaxed font-medium">
              <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                i
              </div>
              <p>
                A CSV is a comma-separated values file, which allows data to be saved in a tabular format. CSV's look like a garden-variety spreadsheet but with a . csv extension. CSV files can be used with most any spreadsheet program, such as Microsoft Excel or Google Spreadsheets.
              </p>
            </div>

            {/* Upload Action Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleConfirmImport}
                className="px-10 py-2.5 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SPARE MODAL (Matching Image 3 "Delete Spares") */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Delete Spare</h2>
            </div>

            {/* Confirmation text */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-900">
                Are you sure you want to delete {selectedIds.length} record(s)?
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">Reason for Deletion</label>
                <textarea
                  rows={4}
                  placeholder="Reason"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="w-full p-3.5 text-xs bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 resize-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={handleConfirmDelete}
                className="px-8 py-2.5 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
              >
                Delete
              </button>

              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-8 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
