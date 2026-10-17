export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'import' | 'export' | 'print';

export const MACHINE_TAB_MODULE_MAP: Record<string, string> = {
  'General': 'machine_tab_general',
  'Specification': 'machine_tab_specification',
  'Spares': 'machine_tab_spares',
  'AMC': 'machine_tab_amc',
  'Purchase': 'machine_tab_purchase',
  'Documents': 'machine_tab_documents',
  'IOT': 'machine_tab_iot',
};

export const FACILITY_TAB_MODULE_MAP: Record<string, string> = {
  'General': 'facility_tab_general',
  'Document': 'facility_tab_document',
  'Documents': 'facility_tab_document',
};

export const hasPermission = (user: any, moduleId: string, action: ActionType): boolean => {
  if (!user) return false;

  // Super Admin has all permissions
  if (user?.role === 'SUPER_ADMIN') return true;

  // If no permissions array is available, deny access for security
  if (!user?.permissions || !Array.isArray(user.permissions)) return false;

  const perm = user.permissions.find((p: any) => p.moduleId === moduleId);
  
  // If the user has no permissions entry for a machine tab, fallback to parent machine_management
  if (!perm && moduleId.startsWith('machine_tab_')) {
    return hasPermission(user, 'machine_management', action);
  }

  // If the user has no permissions entry for a facility tab, fallback to parent facility_management
  if (!perm && moduleId.startsWith('facility_tab_')) {
    return hasPermission(user, 'facility_management', action);
  }

  // Convenience fallback: if checking master_main_facility but user only has facility_management permission
  if (!perm && moduleId === 'master_main_facility') {
    const fmPerm = user.permissions.find((p: any) => p.moduleId === 'facility_management');
    if (fmPerm) return hasPermission(user, 'facility_management', action);
  }

  // Convenience fallback: if checking assets but user only has machine_management or facility_management permission
  if (!perm && moduleId === 'assets') {
    const mmPerm = user.permissions.find((p: any) => p.moduleId === 'machine_management');
    if (mmPerm) return hasPermission(user, 'machine_management', action);
    const fmPerm = user.permissions.find((p: any) => p.moduleId === 'facility_management');
    if (fmPerm) return hasPermission(user, 'facility_management', action);
  }

  // If the user has no permissions entry for this module, deny access
  if (!perm) return false;

  switch (action) {
    case 'view': return !!perm.canView;
    case 'create': return !!perm.canCreate;
    case 'edit': return !!perm.canEdit;
    case 'delete': return !!perm.canDelete;
    case 'import': return !!perm.canImport;
    case 'export': return !!perm.canExport;
    case 'print': return !!perm.canPrint;
    default: return false;
  }
};

export const hasTabPermission = (user: any, tabName: string, action: ActionType = 'view', moduleType?: 'machine' | 'facility'): boolean => {
  let moduleId: string | undefined;
  if (moduleType === 'facility') {
    moduleId = FACILITY_TAB_MODULE_MAP[tabName];
  } else if (moduleType === 'machine') {
    moduleId = MACHINE_TAB_MODULE_MAP[tabName];
  } else {
    // If not specified, check machine map first, then facility map
    moduleId = MACHINE_TAB_MODULE_MAP[tabName] || FACILITY_TAB_MODULE_MAP[tabName];
  }
  return hasPermission(user, moduleId || tabName, action);
};

export const hasFacilityTabPermission = (user: any, tabName: string, action: ActionType = 'view'): boolean => {
  return hasTabPermission(user, tabName, action, 'facility');
};

