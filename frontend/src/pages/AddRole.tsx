import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const availableModules = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'master_employee', name: 'Master - Employee' },
  { id: 'master_main_facility', name: 'Master - Main Facility' },
  { id: 'user_management', name: 'User Management' },
  { id: 'facility_management', name: 'Facility Management' },
  { id: 'machine_management', name: 'Machine Management' },
  { id: 'assets', name: 'All Assets' },
];

export function AddRole() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewMode = window.location.pathname.includes('/view/');

  const [formData, setFormData] = useState({
    roleName: '',
    description: '',
    isActive: true,
  });

  // permissions state: { moduleId: { view: boolean, create: boolean, edit: boolean, delete: boolean } }
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(
    availableModules.reduce((acc, mod) => {
      acc[mod.id] = { view: false, create: false, edit: false, delete: false };
      return acc;
    }, {} as Record<string, Record<string, boolean>>)
  );

  const handlePermissionChange = (moduleId: string, action: string, checked: boolean) => {
    if (isViewMode) return;
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [action]: checked
      }
    }));
  };

  const handleSelectAllRow = (moduleId: string, checked: boolean) => {
    if (isViewMode) return;
    setPermissions(prev => ({
      ...prev,
      [moduleId]: { view: checked, create: checked, edit: checked, delete: checked }
    }));
  };

  const isRowAllSelected = (moduleId: string) => {
    const p = permissions[moduleId];
    return p.view && p.create && p.edit && p.delete;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate save
    navigate('/manage-access');
  };

  return (
    <div className="w-full p-6 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/manage-access')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isViewMode ? 'View Role' : id ? 'Edit Role' : 'New Role'}
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
        <form onSubmit={handleSubmit} className="p-8">
          
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Role Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={formData.roleName}
                onChange={(e) => setFormData({...formData, roleName: e.target.value})}
                disabled={isViewMode}
                placeholder="e.g. Facility Admin"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all border-gray-300 ${isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                required
              />
            </div>
            
            <div className="flex items-center gap-3 mt-6 md:mt-8">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  disabled={isViewMode}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {formData.isActive ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                disabled={isViewMode}
                placeholder="Brief description of this role's purpose..."
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none border-gray-300 ${isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 my-8"></div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Module Permissions</h3>
          <p className="text-sm text-gray-500 mb-6">Select the actions this role can perform across different modules.</p>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700">Module</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">View</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Create</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Edit</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Delete</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center border-l border-gray-200">Select All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {availableModules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{mod.name}</td>
                    
                    {['view', 'create', 'edit', 'delete'].map(action => (
                      <td key={action} className="px-6 py-4 text-center">
                        <input 
                          type="checkbox"
                          checked={permissions[mod.id][action]}
                          onChange={(e) => handlePermissionChange(mod.id, action, e.target.checked)}
                          disabled={isViewMode}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    ))}

                    <td className="px-6 py-4 text-center border-l border-gray-200 bg-gray-50/30">
                      <input 
                        type="checkbox"
                        checked={isRowAllSelected(mod.id)}
                        onChange={(e) => handleSelectAllRow(mod.id, e.target.checked)}
                        disabled={isViewMode}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/manage-access')}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Back
            </button>
            {!isViewMode && (
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 active:scale-95"
              >
                Save
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
