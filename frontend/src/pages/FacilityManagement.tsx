import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

export function FacilityManagement() {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/facilities');
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
      await api.delete(`/facilities/${facilityToDelete}`);
      setDeleteModalOpen(false);
      setFacilityToDelete(null);
      fetchFacilities();
    } catch (error) {
      console.error('Failed to delete facility:', error);
      alert('Failed to delete facility. It might be linked to other records.');
    }
  };

  const filteredFacilities = facilities.filter(facility => {
    const searchString = searchQuery.toLowerCase();
    const code = (facility.facilityCode || '').toLowerCase();
    const name = (facility.facilityName || '').toLowerCase();
    const mainName = (facility.mainFacility?.mainFacilityName || '').toLowerCase();
    const category = (facility.category || '').toLowerCase();

    return code.includes(searchString) || 
           name.includes(searchString) || 
           mainName.includes(searchString) || 
           category.includes(searchString);
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facility Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage facilities and infrastructure</p>
        </div>
        <button 
          onClick={() => navigate('/master/facility/new')}
          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Facility
        </button>
      </div>

      {/* Search Section */}
      <div className="flex justify-end mb-6">
        <div className="relative w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all"
            placeholder="Search facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Facilities List</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-700 font-medium text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Facility Code</th>
                <th className="px-6 py-4">Facility Name</th>
                <th className="px-6 py-4">Main Facility</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Date Added</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center h-16">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredFacilities.length > 0 ? (
                filteredFacilities.map((facility, index) => (
                  <tr key={facility.id || index} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {facility.facilityCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{facility.facilityName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{facility.mainFacility?.mainFacilityName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{facility.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(facility.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => navigate(`/master/facility/edit/${facility.id}?view=true`)}
                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => navigate(`/master/facility/edit/${facility.id}`)}
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
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No facilities found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Facility"
        message="Are you sure you want to delete this facility? This action cannot be undone."
      />
    </div>
  );
}
