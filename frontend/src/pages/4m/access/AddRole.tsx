import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

const availableModules = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'assets', name: 'All Assets' },
  { id: 'master_employee', name: 'Master - Employee' },
  { id: 'master_main_facility', name: 'Master - Facility' },
  { id: 'manage_access', name: 'Manage Access' },
  { id: 'user_management', name: 'User Management' },
  { id: 'facility_management', name: 'Facility Management' },
  { id: 'machine_management', name: 'Machine Management' },
];

const isActionAllowed = (moduleId: string, action: string) => {
  if ((moduleId === 'dashboard' || moduleId === 'assets') && action !== 'view') return false;
  if (['manage_access', 'user_management', 'facility_management', 'machine_management'].includes(moduleId) && action === 'import') return false;
  return true;
};

export function AddRole() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isViewMode = window.location.pathname.includes('/view/');
  const returnUrl = location.state?.returnUrl;

  const [formData, setFormData] = useState({
    roleName: '',
    isActive: true,
  });

  // permissions state: { moduleId: { view: boolean, create: boolean, edit: boolean, delete: boolean } }
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(
    availableModules.reduce((acc, mod) => {
      acc[mod.id] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
      return acc;
    }, {} as Record<string, Record<string, boolean>>)
  );
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDesignation = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await api.get(`/designations/${id}`);
        const data = res.data;
        setFormData({
          roleName: data.name,
          isActive: data.isActive,
        });

        // Set permissions
        if (data.permissions) {
          setPermissions(prev => {
            const next = { ...prev };
            data.permissions.forEach((p: any) => {
              if (next[p.moduleId]) {
                next[p.moduleId] = {
                  view: p.canView || false,
                  create: p.canCreate || false,
                  edit: p.canEdit || false,
                  delete: p.canDelete || false,
                  import: p.canImport || false,
                  export: p.canExport || false,
                  print: p.canPrint || false
                };
              }
            });
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to fetch designation', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDesignation();
  }, [id]);

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
    setPermissions(prev => {
      const next = { ...prev };
      const newPerms = { ...next[moduleId] };
      ['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].forEach(action => {
        if (isActionAllowed(moduleId, action)) {
          newPerms[action] = checked;
        }
      });
      next[moduleId] = newPerms;
      return next;
    });
  };

  const isRowAllSelected = (moduleId: string) => {
    return ['view', 'create', 'edit', 'delete', 'import', 'export', 'print']
      .filter(action => isActionAllowed(moduleId, action))
      .every(action => permissions[moduleId][action]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payloadPermissions = Object.entries(permissions).map(([moduleId, perms]) => ({
        moduleId,
        canView: perms.view,
        canCreate: perms.create,
        canEdit: perms.edit,
        canDelete: perms.delete,
        canImport: perms.import,
        canExport: perms.export,
        canPrint: perms.print,
      }));

      const payload = {
        name: formData.roleName,
        isActive: formData.isActive,
        permissions: payloadPermissions,
      };

      if (id) {
        await api.put(`/designations/${id}`, payload);
      } else {
        await api.post('/designations', payload);
        if (returnUrl) {
          sessionStorage.setItem('newlyAddedDesignation', formData.roleName);
        }
      }
      toast.success('Designation saved successfully!');
      navigate(returnUrl || '/manage-access');
    } catch (err) {
      console.error('Failed to save designation', err);
      toast.error('Failed to save designation.');
    }
  };

  return (
    <div className="w-full sm:p-6 pb-10 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(returnUrl || '/manage-access')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isViewMode ? 'View Designation' : id ? 'Edit Designation' : 'New Designation'}
        </h1>
      </div>

      <div className={isViewMode ? "" : "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full"}>
        {isViewMode ? (
          <div className="space-y-8">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-inner flex-shrink-0">
                <Shield size={48} className="text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold mb-2">{formData.roleName || 'Unknown Designation'}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-50 font-medium">
                  <div className="flex items-center gap-1.5">
                    {formData.isActive ? <CheckCircle2 size={18} className="text-green-300" /> : <CheckCircle2 size={18} className="text-gray-300" />}
                    <span>{formData.isActive ? 'Active Designation' : 'Inactive Designation'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                <Shield size={20} className="text-emerald-500" />
                Module Permissions
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700">Module</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">View</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Create</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Edit</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Delete</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Import</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Export</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Print</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {availableModules.map((mod) => (
                      <tr key={mod.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{mod.name}</td>
                        {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                          <td key={action} className="px-6 py-4 text-center">
                            {isActionAllowed(mod.id, action) ? (
                              permissions[mod.id][action] ? (
                                <CheckCircle2 size={20} className="text-green-500 mx-auto" />
                              ) : (
                                <XCircle size={20} className="text-gray-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate(returnUrl || '/manage-access')}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 text-center"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-8">
            
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Designation Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation Name <span className="text-red-500">*</span>
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
            
            </div>

          <div className="border-t border-gray-200 my-8"></div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Module Permissions</h3>
          <p className="text-sm text-gray-500 mb-6">Select the actions this designation can perform across different modules.</p>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700">Module</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">View</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Create</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Edit</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Delete</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Import</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Export</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center">Print</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700 text-center border-l border-gray-200">Select All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {availableModules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{mod.name}</td>
                    
                    {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                      <td key={action} className="px-6 py-4 text-center">
                        {isActionAllowed(mod.id, action) ? (
                          <input 
                            type="checkbox"
                            checked={permissions[mod.id][action]}
                            onChange={(e) => handlePermissionChange(mod.id, action, e.target.checked)}
                            disabled={isViewMode}
                            className="w-6 h-6 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    ))}

                    <td className="px-6 py-4 text-center border-l border-gray-200 bg-gray-50/30">
                      <input 
                        type="checkbox"
                        checked={isRowAllSelected(mod.id)}
                        onChange={(e) => handleSelectAllRow(mod.id, e.target.checked)}
                        disabled={isViewMode}
                        className="w-6 h-6 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate(returnUrl || '/manage-access')}
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 text-center"
            >
              Back
            </button>
            {!isViewMode && (
              <button
                type="submit"
                className="w-full sm:w-auto flex justify-center px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors items-center gap-2 active:scale-95"
              >
                Save
              </button>
            )}
          </div>
          </form>
        )}
      </div>
    </div>
  );
}
