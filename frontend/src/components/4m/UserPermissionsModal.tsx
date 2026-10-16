import React, { useState, useEffect } from 'react';
import { X, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { setUser } from '../../store/slices/authSlice';

export interface SubModuleItem {
  id: string;
  name: string;
}

export interface ModuleItem {
  id: string;
  name: string;
  subModules?: SubModuleItem[];
}

const availableModules: ModuleItem[] = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'assets', name: 'All Assets' },
  { id: 'master_employee', name: 'Master - Employee' },
  { id: 'master_main_facility', name: 'Master - Facility' },
  { id: 'manage_access', name: 'Manage Access' },
  { id: 'user_management', name: 'User Management' },
  { 
    id: 'facility_management', 
    name: 'Facility Management',
    subModules: [
      { id: 'facility_tab_general', name: 'General' },
      { id: 'facility_tab_document', name: 'Document' },
    ]
  },
  { 
    id: 'machine_management', 
    name: 'Machine Management',
    subModules: [
      { id: 'machine_tab_general', name: 'General' },
      { id: 'machine_tab_specification', name: 'Specification' },
      { id: 'machine_tab_spares', name: 'Spares' },
      { id: 'machine_tab_amc', name: 'AMC' },
      { id: 'machine_tab_purchase', name: 'Purchase' },
      { id: 'machine_tab_documents', name: 'Documents' },
      { id: 'machine_tab_iot', name: 'IOT' },
    ]
  },
  { id: 'spares', name: 'Spares Management' },
  { id: 'suppliers', name: 'Suppliers Management' },
  { id: 'work_orders', name: 'Work Orders' },
  { id: 'schedules', name: 'Schedule Maintenance' },
];

const allModuleIds = availableModules.flatMap(m => [m.id, ...(m.subModules?.map(s => s.id) || [])]);

const isActionAllowed = (moduleId: string, action: string) => {
  if ((moduleId === 'dashboard' || moduleId === 'assets') && action !== 'view') return false;
  if (['manage_access', 'user_management', 'facility_management', 'machine_management'].includes(moduleId) && action === 'import') return false;
  
  if (moduleId.startsWith('facility_tab_')) {
    if (['import', 'export', 'print'].includes(action)) return false;
    if (moduleId === 'facility_tab_document') {
      return ['view', 'create', 'edit', 'delete'].includes(action);
    }
    return ['view', 'edit'].includes(action);
  }

  if (moduleId.startsWith('machine_tab_')) {
    if (['import', 'export', 'print'].includes(action)) return false;
    if (['machine_tab_spares', 'machine_tab_documents', 'machine_tab_specification'].includes(moduleId)) {
      return ['view', 'create', 'edit', 'delete'].includes(action);
    }
    return ['view', 'edit'].includes(action);
  }
  return true;
};

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
  userName: string;
}

export function UserPermissionsModal({ isOpen, onClose, userId, userName }: UserPermissionsModalProps) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [loading, setLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    facility_management: true,
    machine_management: true
  });

  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(
    allModuleIds.reduce((acc, modId) => {
      acc[modId] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
      return acc;
    }, {} as Record<string, Record<string, boolean>>)
  );

  useEffect(() => {
    if (!isOpen || !userId) return;
    
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        // Fetch user permissions info from backend
        const res = await api.get(`/users/${userId}/permissions`);
        const raw = res.data;
        const userOverrides = Array.isArray(raw) ? raw : (raw?.userOverrides || []);
        let basePermissions: any[] = Array.isArray(raw?.basePermissions) ? raw.basePermissions : [];

        // If basePermissions is still empty, construct default baseline for all available modules
        if (basePermissions.length === 0) {
          basePermissions = allModuleIds.map(modId => ({
            moduleId: modId,
            canView: true,
            canCreate: ['master_employee', 'master_main_facility', 'user_management', 'facility_management', 'machine_management', 'facility_tab_document', 'machine_tab_spares', 'machine_tab_documents', 'machine_tab_specification'].includes(modId),
            canEdit: ['master_employee', 'master_main_facility', 'user_management', 'facility_management', 'machine_management', 'facility_tab_general', 'facility_tab_document', 'machine_tab_general', 'machine_tab_specification', 'machine_tab_spares', 'machine_tab_amc', 'machine_tab_purchase', 'machine_tab_documents', 'machine_tab_iot'].includes(modId),
            canDelete: ['master_employee', 'master_main_facility', 'user_management', 'facility_management', 'machine_management'].includes(modId),
            canImport: ['master_employee', 'master_main_facility'].includes(modId),
            canExport: !modId.includes('_tab_'),
            canPrint: !modId.includes('_tab_'),
          }));
        }

        // Check if userOverrides actually has any active/truthy permissions
        const hasActiveOverrides = userOverrides.some((up: any) => 
          up.canView || up.canCreate || up.canEdit || up.canDelete || up.canImport || up.canExport || up.canPrint
        );

        // Merge them: Start with base, then overwrite with overrides if active overrides exist
        let merged: any[] = [...basePermissions];
        if (hasActiveOverrides) {
          userOverrides.forEach((up: any) => {
            const index = merged.findIndex(p => p.moduleId === up.moduleId);
            if (index >= 0) {
              merged[index] = { ...merged[index], ...up };
            } else {
              merged.push(up);
            }
          });
        }

        // Set state
        setPermissions(prev => {
          const next = { ...prev };
          merged.forEach((p: any) => {
            if (next[p.moduleId]) {
              next[p.moduleId] = {
                view: !!p.canView,
                create: !!p.canCreate,
                edit: !!p.canEdit,
                delete: !!p.canDelete,
                import: !!p.canImport,
                export: !!p.canExport,
                print: !!p.canPrint
              };
            }
          });

          // Inherit machine tabs if parent machine_management is configured
          const mmPerm = merged.find((p: any) => p.moduleId === 'machine_management');
          if (mmPerm) {
            const machineTabs = [
              'machine_tab_general',
              'machine_tab_specification',
              'machine_tab_spares',
              'machine_tab_amc',
              'machine_tab_purchase',
              'machine_tab_documents',
              'machine_tab_iot',
            ];
            machineTabs.forEach(tabId => {
              const hasOverride = userOverrides.some((p: any) => p.moduleId === tabId);
              if (!hasOverride && next[tabId]) {
                const tabItem = merged.find((p: any) => p.moduleId === tabId);
                next[tabId] = {
                  view: tabItem ? !!tabItem.canView : (mmPerm.canView || false),
                  create: isActionAllowed(tabId, 'create') ? (tabItem && tabItem.canCreate ? !!tabItem.canCreate : (mmPerm.canCreate || false)) : false,
                  edit: tabItem ? !!tabItem.canEdit : (mmPerm.canEdit || false),
                  delete: isActionAllowed(tabId, 'delete') ? (tabItem && tabItem.canDelete ? !!tabItem.canDelete : (mmPerm.canDelete || false)) : false,
                  import: false,
                  export: false,
                  print: false,
                };
              }
            });
          }

          // Inherit facility tabs if parent facility_management is configured
          const fmPerm = merged.find((p: any) => p.moduleId === 'facility_management');
          if (fmPerm) {
            const facilityTabs = [
              'facility_tab_general',
              'facility_tab_document',
            ];
            facilityTabs.forEach(tabId => {
              const hasOverride = userOverrides.some((p: any) => p.moduleId === tabId);
              if (!hasOverride && next[tabId]) {
                const tabItem = merged.find((p: any) => p.moduleId === tabId);
                next[tabId] = {
                  view: tabItem ? !!tabItem.canView : (fmPerm.canView || false),
                  create: isActionAllowed(tabId, 'create') ? (tabItem && tabItem.canCreate ? !!tabItem.canCreate : (fmPerm.canCreate || false)) : false,
                  edit: tabItem ? !!tabItem.canEdit : (fmPerm.canEdit || false),
                  delete: isActionAllowed(tabId, 'delete') ? (tabItem && tabItem.canDelete ? !!tabItem.canDelete : (fmPerm.canDelete || false)) : false,
                  import: false,
                  export: false,
                  print: false,
                };
              }
            });
          }

          return next;
        });

      } catch (err) {
        console.error('Failed to fetch permissions', err);
        toast.error('Failed to load user permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const toggleModuleExpand = (modId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const handlePermissionChange = (moduleId: string, action: string, checked: boolean) => {
    setPermissions(prev => {
      const next = {
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          [action]: checked
        }
      };

      // If a tab view is enabled, ensure parent module view is enabled
      if (moduleId.startsWith('machine_tab_') && checked && action === 'view') {
        next.machine_management = {
          ...next.machine_management,
          view: true
        };
      }
      if (moduleId.startsWith('facility_tab_') && checked && action === 'view') {
        next.facility_management = {
          ...next.facility_management,
          view: true
        };
      }

      // If parent module view is disabled, disable view for all tabs
      if (moduleId === 'machine_management' && action === 'view' && !checked) {
        const mod = availableModules.find(m => m.id === 'machine_management');
        mod?.subModules?.forEach(sub => {
          if (next[sub.id]) {
            next[sub.id] = {
              ...next[sub.id],
              view: false
            };
          }
        });
      }
      if (moduleId === 'facility_management' && action === 'view' && !checked) {
        const mod = availableModules.find(m => m.id === 'facility_management');
        mod?.subModules?.forEach(sub => {
          if (next[sub.id]) {
            next[sub.id] = {
              ...next[sub.id],
              view: false
            };
          }
        });
      }

      return next;
    });
  };

  const handleSelectAllRow = (moduleId: string, checked: boolean) => {
    setPermissions(prev => {
      const next = { ...prev };
      
      const updateMod = (mId: string) => {
        if (!next[mId]) return;
        const newPerms = { ...next[mId] };
        ['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].forEach(action => {
          if (isActionAllowed(mId, action)) {
            newPerms[action] = checked;
          }
        });
        next[mId] = newPerms;
      };

      updateMod(moduleId);

      // If toggling parent machine_management or facility_management, also cascade to all sub-tabs
      if (moduleId === 'machine_management' || moduleId === 'facility_management') {
        const mod = availableModules.find(m => m.id === moduleId);
        mod?.subModules?.forEach(sub => updateMod(sub.id));
      }

      return next;
    });
  };

  const isRowAllSelected = (moduleId: string) => {
    if (!permissions[moduleId]) return false;
    return ['view', 'create', 'edit', 'delete', 'import', 'export', 'print']
      .filter(action => isActionAllowed(moduleId, action))
      .every(action => permissions[moduleId][action]);
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      setLoading(true);
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

      await api.put(`/users/${userId}/permissions`, payloadPermissions);
      toast.success('User permissions updated successfully!');

      // If updating the currently logged in user, refresh their profile in Redux immediately
      if (currentUser?.id === userId) {
        try {
          const meRes = await api.get('/auth/me');
          if (meRes.data?.user) {
            dispatch(setUser(meRes.data.user));
          }
        } catch (e) {
          console.error('Failed to refresh active session after permissions update', e);
        }
      }

      onClose();
    } catch (err) {
      console.error('Failed to save permissions', err);
      toast.error('Failed to save permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Special Permissions</h2>
              <p className="text-sm text-gray-500">Managing overrides for {userName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider">Module / Tab</th>
                    <th className="px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">View</th>
                    <th className="px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Create</th>
                    <th className="px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Edit</th>
                    <th className="px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Delete</th>
                    <th className="px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Import</th>
                    <th className="px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Export</th>
                    <th className="px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Print</th>
                    <th className="px-3 py-3 text-xs font-bold text-gray-700 text-center border-l border-gray-200 uppercase tracking-wider w-28">Select All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {availableModules.map((mod) => (
                    <React.Fragment key={mod.id}>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {mod.subModules ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleModuleExpand(mod.id)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors"
                                title={expandedModules[mod.id] ? "Collapse tabs" : "Expand tabs"}
                              >
                                {expandedModules[mod.id] ? (
                                  <ChevronDown className="w-4 h-4 text-purple-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <span className="font-bold text-gray-900">{mod.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                                {mod.subModules.length} Tabs
                              </span>
                            </div>
                          ) : (
                            mod.name
                          )}
                        </td>
                        
                        {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                          <td key={action} className="px-2 py-3 text-center">
                            {isActionAllowed(mod.id, action) ? (
                              <input 
                                type="checkbox"
                                checked={permissions[mod.id]?.[action] || false}
                                onChange={(e) => handlePermissionChange(mod.id, action, e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        ))}

                        <td className="px-3 py-3 text-center border-l border-gray-200 bg-gray-50/30">
                          <input 
                            type="checkbox"
                            checked={isRowAllSelected(mod.id)}
                            onChange={(e) => handleSelectAllRow(mod.id, e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>
                      </tr>

                      {/* Render Sub-module Tab Rows */}
                      {mod.subModules && expandedModules[mod.id] && mod.subModules.map((sub) => (
                        <tr key={sub.id} className="bg-purple-50/20 hover:bg-purple-50/40 transition-colors">
                          <td className="px-4 py-2.5 text-sm pl-8">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400 font-mono text-base">↳</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded border border-purple-200">
                                Tab
                              </span>
                              <span className="text-sm font-semibold text-gray-800">{sub.name}</span>
                            </div>
                          </td>

                          {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                            <td key={action} className="px-2 py-2.5 text-center">
                              {isActionAllowed(sub.id, action) ? (
                                <input 
                                  type="checkbox"
                                  checked={permissions[sub.id]?.[action] || false}
                                  onChange={(e) => handlePermissionChange(sub.id, action, e.target.checked)}
                                  className="w-4.5 h-4.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          ))}

                          <td className="px-3 py-2.5 text-center border-l border-gray-200 bg-purple-50/30">
                            <input 
                              type="checkbox"
                              checked={isRowAllSelected(sub.id)}
                              onChange={(e) => handleSelectAllRow(sub.id, e.target.checked)}
                              className="w-4.5 h-4.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}
