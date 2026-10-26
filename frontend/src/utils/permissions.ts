export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'import' | 'export' | 'print';

export const MACHINE_TAB_MODULE_MAP: Record<string, string> = {
  'General': 'machine_tab_general',
  'Specification': 'machine_tab_specification',
  'Spares': 'machine_tab_spares',
  'AMC': 'machine_tab_amc',
  'Purchase': 'machine_tab_purchase',
  'Documents': 'machine_tab_documents',
  'IOT': 'machine_tab_iot',
  'WO': 'machine_tab_wo',
  'Checklist': 'machine_tab_checklist',
  'Schedule Maintenance': 'machine_tab_schedule_maintenance',
};

export const FACILITY_TAB_MODULE_MAP: Record<string, string> = {
  'General': 'facility_tab_general',
  'Document': 'facility_tab_document',
  'Documents': 'facility_tab_document',
};

export const SPARE_TAB_MODULE_MAP: Record<string, string> = {
  'General': 'spare_tab_general',
  'Stock': 'spare_tab_stock',
  'Machines List': 'spare_tab_machines_list',
  'Specification': 'spare_tab_specification',
  'Warranties': 'spare_tab_warranties',
  'Suppliers': 'spare_tab_suppliers',
  'Documents': 'spare_tab_documents',
  'Log': 'spare_tab_log',
};

export const SUPPLIER_TAB_MODULE_MAP: Record<string, string> = {
  'General': 'supplier_tab_general',
  'Location': 'supplier_tab_location',
  'Spares': 'supplier_tab_spares',
  'Documents': 'supplier_tab_documents',
  'Log': 'supplier_tab_log',
};

export const SCHEDULE_TAB_MODULE_MAP: Record<string, string> = {
  'GENERAL': 'schedule_tab_general',
  'General': 'schedule_tab_general',
  '1. General': 'schedule_tab_general',
  'SCHEDULING': 'schedule_tab_scheduling',
  'Scheduling': 'schedule_tab_scheduling',
  '2. Scheduling': 'schedule_tab_scheduling',
  'CHECKPOINTS': 'schedule_tab_checkpoints',
  'Check Points': 'schedule_tab_checkpoints',
  'Checkpoints': 'schedule_tab_checkpoints',
  '3. Check Points': 'schedule_tab_checkpoints',
  'SPARES': 'schedule_tab_spares',
  'Spares': 'schedule_tab_spares',
  '4. Spares': 'schedule_tab_spares',
  'NOTIFICATIONS': 'schedule_tab_notifications',
  'Notifications': 'schedule_tab_notifications',
  '5. Notifications': 'schedule_tab_notifications',
  'NOTES': 'schedule_tab_notes',
  'Notes': 'schedule_tab_notes',
  '6. Notes': 'schedule_tab_notes',
  'FILES': 'schedule_tab_files',
  'Files': 'schedule_tab_files',
  '7. Files': 'schedule_tab_files',
  'LOGS': 'schedule_tab_logs',
  'Logs': 'schedule_tab_logs',
  '8. Logs': 'schedule_tab_logs',
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

  // If the user has no permissions entry for a spare tab, fallback to parent spares
  if (!perm && moduleId.startsWith('spare_tab_')) {
    return hasPermission(user, 'spares', action);
  }

  // If the user has no permissions entry for a supplier tab, fallback to parent suppliers
  if (!perm && moduleId.startsWith('supplier_tab_')) {
    return hasPermission(user, 'suppliers', action);
  }

  // If the user has no permissions entry for a schedule tab, fallback to parent schedules
  if (!perm && moduleId.startsWith('schedule_tab_')) {
    return hasPermission(user, 'schedules', action);
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

export const hasTabPermission = (user: any, tabName: string, action: ActionType = 'view', moduleType?: 'machine' | 'facility' | 'spare' | 'supplier' | 'schedule'): boolean => {
  let moduleId: string | undefined;
  if (moduleType === 'facility') {
    moduleId = FACILITY_TAB_MODULE_MAP[tabName];
  } else if (moduleType === 'machine') {
    moduleId = MACHINE_TAB_MODULE_MAP[tabName];
  } else if (moduleType === 'spare') {
    moduleId = SPARE_TAB_MODULE_MAP[tabName];
  } else if (moduleType === 'supplier') {
    moduleId = SUPPLIER_TAB_MODULE_MAP[tabName];
  } else if (moduleType === 'schedule') {
    moduleId = SCHEDULE_TAB_MODULE_MAP[tabName];
  } else {
    // If not specified, check in order: machine, facility, spare, supplier, schedule
    moduleId = MACHINE_TAB_MODULE_MAP[tabName] || FACILITY_TAB_MODULE_MAP[tabName] || SPARE_TAB_MODULE_MAP[tabName] || SUPPLIER_TAB_MODULE_MAP[tabName] || SCHEDULE_TAB_MODULE_MAP[tabName];
  }
  return hasPermission(user, moduleId || tabName, action);
};

export const hasFacilityTabPermission = (user: any, tabName: string, action: ActionType = 'view'): boolean => {
  return hasTabPermission(user, tabName, action, 'facility');
};

export const hasSpareTabPermission = (user: any, tabName: string, action: ActionType = 'view'): boolean => {
  return hasTabPermission(user, tabName, action, 'spare');
};

export const hasSupplierTabPermission = (user: any, tabName: string, action: ActionType = 'view'): boolean => {
  return hasTabPermission(user, tabName, action, 'supplier');
};

export const hasScheduleTabPermission = (user: any, tabName: string, action: ActionType = 'view'): boolean => {
  return hasTabPermission(user, tabName, action, 'schedule');
};

