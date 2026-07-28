import { useState, useEffect } from 'react';
import { Plus, Pencil, Search, Building2, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';
import { TablePagination } from '../../components/TablePagination';

export function MainFacilityMaster() {
  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
      alert('Failed to delete facility.');
    }
  };

  const filteredFacilities = facilities.filter(facility => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (facility.mainFacilityCode && facility.mainFacilityCode.toLowerCase().includes(query)) ||
      (facility.mainFacilityName && facility.mainFacilityName.toLowerCase().includes(query)) ||
      (facility.mainFacilityHead && facility.mainFacilityHead.toLowerCase().includes(query)) ||
      (facility.category && facility.category.toLowerCase().includes(query)) ||
      (facility.gstNumber && facility.gstNumber.toLowerCase().includes(query))
    );
  });

  const totalItems = filteredFacilities.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentFacilities = filteredFacilities.slice(startIndex, endIndex);

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Main Facility Master</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage all main facilities in the system</p>
        </div>
        <button
          onClick={() => navigate('/master/main-facility/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Main Facility
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">Main Facility List</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search main facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all w-64"
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-gray-700 font-medium text-xs uppercase tracking-wider border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Main Facility Code</th>
                <th className="px-6 py-4 whitespace-nowrap">Main Facility Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Main Facility Head</th>
                <th className="px-6 py-4 whitespace-nowrap">Category</th>
                <th className="px-6 py-4 whitespace-nowrap">GST Number</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading main facilities...
                  </td>
                </tr>
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
                        <button
                          onClick={() => navigate(`/master/main-facility/edit/${facility.id}`)}
                          className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(facility.id)}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                        Get started by adding a new main facility to the system.
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
        message="Are you sure you want to delete this main facility? This action cannot be undone."
        onClose={() => {
          setDeleteModalOpen(false);
          setFacilityToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
