import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, Shield, CheckCircle2, XCircle, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import { MultiSelect } from '../../../components/shared/MultiSelect';

export interface SubModuleItem {
  id: string;
  name: string;
}

export interface ModuleItem {
  id: string;
  name: string;
  subModules?: SubModuleItem[];
}

export const availableModules: ModuleItem[] = [
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

export function AddRole() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isViewMode = window.location.pathname.includes('/view/');
  const returnUrl = location.state?.returnUrl;

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    roleName: '',
    isActive: true,
  });

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    facility_management: true,
    machine_management: true
  });

  // permissions state: { moduleId: { view: boolean, create: boolean, edit: boolean, delete: boolean, ... } }
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(
    allModuleIds.reduce((acc, modId) => {
      acc[modId] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
      return acc;
    }, {} as Record<string, Record<string, boolean>>)
  );
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchEmployeesAndUsers = async () => {
      try {
        const [empRes, userRes] = await Promise.allSettled([
          api.get('/employees'),
          api.get('/users'),
        ]);
        const fetchedEmployees = empRes.status === 'fulfilled' ? empRes.value.data : [];
        if (empRes.status === 'fulfilled') setEmployees(fetchedEmployees);
        if (userRes.status === 'fulfilled') setUsers(userRes.value.data);

        // Restore draft only if returning from AddEmployee in creation/edit mode
        const draft = sessionStorage.getItem('addRoleDraft');
        const newlyAddedEmployeeName = sessionStorage.getItem('newlyAddedEmployeeName');

        if (draft && !isViewMode && !id) {
          try {
            const parsed = JSON.parse(draft);
            if (parsed.formData) setFormData(parsed.formData);
            if (parsed.permissions) setPermissions(parsed.permissions);

            let restoredEmployeeIds = parsed.selectedEmployeeIds || [];
            if (newlyAddedEmployeeName) {
              const matchedEmp = fetchedEmployees.find((e: any) => 
                e.fullName?.toLowerCase().trim() === newlyAddedEmployeeName.toLowerCase().trim()
              );
              if (matchedEmp) {
                const matchedIdStr = matchedEmp.id.toString();
                if (!restoredEmployeeIds.includes(matchedIdStr)) {
                  restoredEmployeeIds = [...restoredEmployeeIds, matchedIdStr];
                }
                toast.success(`Employee "${matchedEmp.fullName}" added and selected!`);
              }
            }
            setSelectedEmployeeIds(restoredEmployeeIds);
          } catch (e) {
            console.error('Failed to restore draft in AddRole:', e);
          } finally {
            sessionStorage.removeItem('addRoleDraft');
            sessionStorage.removeItem('newlyAddedEmployeeName');
          }
        }
      } catch (err) {
        console.error('Failed to fetch employees and users:', err);
      }
    };
    fetchEmployeesAndUsers();
  }, []);

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
              next[p.moduleId] = {
                view: !!p.canView,
                create: !!p.canCreate,
                edit: !!p.canEdit,
                delete: !!p.canDelete,
                import: !!p.canImport,
                export: !!p.canExport,
                print: !!p.canPrint
              };
            });

            // Backwards compatibility: inherit tabs from parent machine_management
            const mmPerm = data.permissions.find((p: any) => p.moduleId === 'machine_management');
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
                const tabItem = data.permissions.find((p: any) => p.moduleId === tabId);
                if (next[tabId]) {
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

            // Backwards compatibility: inherit tabs from parent facility_management
            const fmPerm = data.permissions.find((p: any) => p.moduleId === 'facility_management');
            if (fmPerm) {
              const facilityTabs = [
                'facility_tab_general',
                'facility_tab_document',
              ];
              facilityTabs.forEach(tabId => {
                const tabItem = data.permissions.find((p: any) => p.moduleId === tabId);
                if (next[tabId]) {
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
        }
      } catch (err) {
        console.error('Failed to fetch designation', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDesignation();
  }, [id]);

  const toggleModuleExpand = (modId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const handlePermissionChange = (moduleId: string, action: string, checked: boolean) => {
    if (isViewMode) return;
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
    if (isViewMode) return;
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

  const areAllPermissionsSelected = () => {
    return allModuleIds.every(modId => {
      return ['view', 'create', 'edit', 'delete', 'import', 'export', 'print']
        .filter(action => isActionAllowed(modId, action))
        .every(action => permissions[modId]?.[action]);
    });
  };

  const handleSelectAllGlobal = (checked: boolean) => {
    if (isViewMode) return;
    setPermissions(prev => {
      const next = { ...prev };
      allModuleIds.forEach(modId => {
        if (!next[modId]) {
          next[modId] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
        }
        const newPerms = { ...next[modId] };
        ['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].forEach(action => {
          if (isActionAllowed(modId, action)) {
            newPerms[action] = checked;
          }
        });
        next[modId] = newPerms;
      });
      return next;
    });
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

      // If user selected employee(s), assign designation & create/update user accounts
      if (selectedEmployeeIds.length > 0) {
        const mapRole = (desigName: string) => {
          const roleStr = (desigName || '').toUpperCase();
          if (roleStr.includes('SUPER')) return 'SUPER_ADMIN';
          if (roleStr.includes('BUILDING')) return 'BUILDING_ADMIN';
          if (roleStr.includes('SOCIETY')) return 'SOCIETY_ADMIN';
          if (roleStr.includes('ADMIN')) return 'SOCIETY_ADMIN';
          if (roleStr.includes('OPERATOR') || roleStr.includes('SUPERVISOR')) return 'OPERATOR';
          if (roleStr.includes('MANAGER')) return 'BUILDING_ADMIN';
          return 'VIEWER';
        };

        for (const empIdStr of selectedEmployeeIds) {
          const emp = employees.find(e => e.id.toString() === empIdStr);
          if (!emp) continue;

          const empEmail = emp.officialEmail || `${emp.employeeCode || emp.id}@example.com`;
          const empUsername = emp.fullName ? emp.fullName.toLowerCase().trim().replace(/\s+/g, '') : empEmail;
          const existingUser = users.find(u => u.employeeId?.toString() === empIdStr);

          const userPayload: any = {
            username: empUsername,
            email: empEmail,
            firstName: emp.fullName ? emp.fullName.split(' ')[0] : undefined,
            lastName: emp.fullName ? emp.fullName.split(' ').slice(1).join(' ') : undefined,
            mobileNumber: emp.mobileNumber || '',
            role: mapRole(formData.roleName),
            designation: formData.roleName,
            isActive: formData.isActive,
            employeeId: parseInt(empIdStr, 10),
          };

          if (existingUser) {
            await api.put(`/users/${existingUser.id}`, userPayload).catch(() => {});
          } else {
            userPayload.password = 'Welcome@123';
            await api.post('/users', userPayload).catch(() => {});
          }
        }
      }

      toast.success(selectedEmployeeIds.length > 0 ? 'Software Role and User(s) saved successfully!' : 'Software Role saved successfully!');
      navigate(returnUrl || '/manage-access');
    } catch (err) {
      console.error('Failed to save software role', err);
      toast.error('Failed to save software role.');
    }
  };

  const handleAddNewEmployeeRedirect = () => {
    const draft = {
      formData,
      permissions,
      selectedEmployeeIds,
    };
    sessionStorage.setItem('addRoleDraft', JSON.stringify(draft));
    sessionStorage.setItem('addEmployeeOriginalReturnUrl', window.location.pathname);

    toast('Redirecting to Employee Master to add a new employee...', { icon: '✨' });
    navigate('/master/employee/new', { state: { returnUrl: window.location.pathname } });
  };

  // Filter out employees who already have a user account (unless already selected)
  const existingUserEmpIds = new Set(
    users
      .filter((u: any) => u.employeeId)
      .map((u: any) => u.employeeId.toString())
  );

  const availableEmployees = employees.filter(
    (emp: any) => !existingUserEmpIds.has(emp.id.toString()) || selectedEmployeeIds.includes(emp.id.toString())
  );

  const employeeOptions = availableEmployees.map((emp: any) => ({
    label: `${emp.fullName} (${emp.department || 'N/A'} - ${emp.designation || 'N/A'})`,
    value: emp.id.toString()
  }));

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
          {isViewMode ? 'View Software Role' : id ? 'Edit Software Role' : 'New Software Role'}
        </h1>
      </div>

      <div className={isViewMode ? "" : "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full"}>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium text-sm">Loading software role details...</p>
          </div>
        ) : isViewMode ? (
          <div className="space-y-8">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-inner flex-shrink-0">
                <Shield size={48} className="text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold mb-2">{formData.roleName || 'Unknown Software Role'}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-50 font-medium">
                  <div className="flex items-center gap-1.5">
                    {formData.isActive ? <CheckCircle2 size={18} className="text-green-300" /> : <CheckCircle2 size={18} className="text-gray-300" />}
                    <span>{formData.isActive ? 'Active Software Role' : 'Inactive Software Role'}</span>
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
                      <React.Fragment key={mod.id}>
                        <tr className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {mod.subModules ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleModuleExpand(mod.id)}
                                  className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                  {expandedModules[mod.id] ? (
                                    <ChevronDown className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                                <span className="font-bold text-gray-900">{mod.name}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                  {mod.subModules.length} Tabs
                                </span>
                              </div>
                            ) : (
                              mod.name
                            )}
                          </td>
                          {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                            <td key={action} className="px-6 py-4 text-center">
                              {isActionAllowed(mod.id, action) ? (
                                permissions[mod.id]?.[action] ? (
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

                        {/* Render Sub Modules in View Mode */}
                        {mod.subModules && expandedModules[mod.id] && mod.subModules.map((sub) => (
                          <tr key={sub.id} className="bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors">
                            <td className="px-6 py-3.5 text-sm pl-12">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-mono text-base">↳</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                                  Tab
                                </span>
                                <span className="text-sm font-semibold text-gray-800">{sub.name}</span>
                              </div>
                            </td>
                            {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                              <td key={action} className="px-6 py-3.5 text-center">
                                {isActionAllowed(sub.id, action) ? (
                                  permissions[sub.id]?.[action] ? (
                                    <CheckCircle2 size={18} className="text-green-500 mx-auto" />
                                  ) : (
                                    <XCircle size={18} className="text-gray-300 mx-auto" />
                                  )
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Software Role Details</h3>
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Software Role Name <span className="text-red-500">*</span>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Name
                </label>
                <MultiSelect 
                  name="selectedEmployeeIds"
                  values={selectedEmployeeIds}
                  onChange={setSelectedEmployeeIds}
                  options={employeeOptions}
                  disabled={isViewMode}
                  placeholder="Select Employee(s)"
                  onAddNew={handleAddNewEmployeeRedirect}
                  addNewLabel="Add Employee"
                />
              </div>
              
              <div className="flex items-center gap-3 mt-6 md:mt-7">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    disabled={isViewMode}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 my-8"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Module & Tab Permissions</h3>
                <p className="text-sm text-gray-500 mt-1">Select the actions this software role can perform across modules and individual machine management tabs.</p>
              </div>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={() => handleSelectAllGlobal(!areAllPermissionsSelected())}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 shadow-xs whitespace-nowrap active:scale-95 ${
                    areAllPermissionsSelected()
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  {areAllPermissionsSelected() ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

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
                    <th className="px-3 py-3 text-xs font-bold text-gray-700 text-center border-l border-gray-200 bg-gray-100/70 uppercase tracking-wider w-28">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <span>Select All</span>
                        {!isViewMode && (
                          <input 
                            type="checkbox"
                            checked={areAllPermissionsSelected()}
                            onChange={(e) => handleSelectAllGlobal(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title="Select / Deselect all permissions across all modules"
                          />
                        )}
                      </div>
                    </th>
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
                                  <ChevronDown className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <span className="font-bold text-gray-900">{mod.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
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
                                disabled={isViewMode}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                            disabled={isViewMode}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>

                      {/* Render Sub-module Tab Rows */}
                      {mod.subModules && expandedModules[mod.id] && mod.subModules.map((sub) => (
                        <tr key={sub.id} className="bg-blue-50/20 hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-2.5 text-sm pl-8">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-400 font-mono text-base">↳</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
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
                                  disabled={isViewMode}
                                  className="w-4.5 h-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          ))}

                          <td className="px-3 py-2.5 text-center border-l border-gray-200 bg-blue-50/30">
                            <input 
                              type="checkbox"
                              checked={isRowAllSelected(sub.id)}
                              onChange={(e) => handleSelectAllRow(sub.id, e.target.checked)}
                              disabled={isViewMode}
                              className="w-4.5 h-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
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
                  className="w-full sm:w-auto flex justify-center px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors items-center gap-2 active:scale-95 shadow-xs"
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
