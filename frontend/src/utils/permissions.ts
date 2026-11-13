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

  // Super Admin and Admins have all permissions
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'SOCIETY_ADMIN') return true;

  // If no permissions array is available, deny access for security
  if (!user?.permissions || !Array.isArray(user.permissions)) return false;

  const perm = user.permissions.find((p: any) => p.moduleId === moduleId);

  // If the user has no permissions entry for a dashboard tab, fallback to parent dashboard
  if (!perm && (moduleId === 'dashboard_iot' || moduleId === 'dashboard_cmms')) {
    return hasPermission(user, 'dashboard', action);
  }

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

  // Convenience fallback: if checking master_main_facility but user only has facility_management or assets permission
  if (!perm && moduleId === 'master_main_facility') {
    const fmPerm = user.permissions.find((p: any) => p.moduleId === 'facility_management');
    if (fmPerm) return hasPermission(user, 'facility_management', action);
    const assetsPerm = user.permissions.find((p: any) => p.moduleId === 'assets');
    if (assetsPerm) return hasPermission(user, 'assets', action);
  }

  // Special check for 'assets' module:
  if (moduleId === 'assets') {
    if (action === 'view') {
      if (perm && perm.canView) return true;
      const hasAnyAssetAccess = user.permissions.some(
        (p: any) => p.moduleId?.startsWith('asset_') && p.canView
      );
      if (hasAnyAssetAccess) return true;
      const mmPerm = user.permissions.find((p: any) => p.moduleId === 'machine_management');
      if (mmPerm && mmPerm.canView) return true;
      const fmPerm = user.permissions.find((p: any) => p.moduleId === 'facility_management');
      if (fmPerm && fmPerm.canView) return true;
      return false;
    }
    if (action === 'create') {
      if (perm && perm.canCreate) return true;
      const mmPerm = user.permissions.find((p: any) => p.moduleId === 'machine_management');
      if (mmPerm && mmPerm.canCreate) return true;
      const fmPerm = user.permissions.find((p: any) => p.moduleId === 'facility_management');
      if (fmPerm && fmPerm.canCreate) return true;
      return false;
    }
  }

  // Allow viewing machine or facility details if user has asset view permissions or assets access
  if ((moduleId === 'machine_management' || moduleId === 'facility_management' || moduleId === 'master_main_facility') && action === 'view') {
    if (perm && perm.canView) return true;
    const hasAnyAssetAccess = user.permissions.some(
      (p: any) => (p.moduleId?.startsWith('asset_') || p.moduleId === 'assets') && p.canView
    );
    if (hasAnyAssetAccess) return true;
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

export const hasAssetPermission = (
  user: any,
  asset: {
    id: number | string;
    type?: 'machine' | 'facility' | 'mainFacility' | 'device';
    facilityId?: number | null;
    mainFacilityId?: number | null;
    parentFacilityId?: number | null;
    facility?: { mainFacilityId?: number | null } | null;
    deviceId?: string | null;
    mainFacilityCode?: string;
    mainFacilityName?: string;
    facilityCode?: string;
    facilityName?: string;
    machineCode?: string;
  },
  action: ActionType = 'view'
): boolean => {
  if (!user) return false;
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'SOCIETY_ADMIN') return true;
  if (!user.permissions || !Array.isArray(user.permissions)) return false;

  const actionKey = action === 'view' ? 'canView'
    : action === 'create' ? 'canCreate'
      : action === 'edit' ? 'canEdit'
        : action === 'delete' ? 'canDelete'
          : action === 'import' ? 'canImport'
            : action === 'export' ? 'canExport'
              : 'canPrint';

  // Check if user has ANY asset-level permissions configured
  const hasGranularAssetPerms = user.permissions.some((p: any) => p.moduleId?.startsWith('asset_'));

  const isMainFacility = asset.type === 'mainFacility' || (!!(asset as any).mainFacilityCode && !(asset as any).facilityCode);
  const isFacility = asset.type === 'facility' || (!!(asset as any).facilityCode && !(asset as any).machineCode);

  // If no granular asset permissions exist in user's permissions, fallback to general module permission
  if (!hasGranularAssetPerms) {
    if (isMainFacility) {
      return hasPermission(user, 'master_main_facility', action) || hasPermission(user, 'facility_management', action);
    }
    if (isFacility) {
      return hasPermission(user, 'facility_management', action);
    }
    return hasPermission(user, 'machine_management', action);
  }

  // 1. Main Facility
  if (isMainFacility) {
    const mfPerm = user.permissions.find((p: any) => p.moduleId === `asset_mf_${asset.id}`);
    if (mfPerm?.canView) return !!mfPerm[actionKey];
    if (user.mainFacilityId && Number(user.mainFacilityId) === Number(asset.id)) return true;
  } else if (isFacility) {
    // 2. Sub-Facility
    const facPerm = user.permissions.find((p: any) => p.moduleId === `asset_fac_${asset.id}`);
    if (facPerm?.canView) return !!facPerm[actionKey];

    if (user.facilityId && Number(user.facilityId) === Number(asset.id)) return true;

    if (asset.parentFacilityId) {
      const parentPerm = user.permissions.find((p: any) => p.moduleId === `asset_fac_${asset.parentFacilityId}`);
      if (parentPerm?.canView) return !!parentPerm[actionKey];
      if (user.facilityId && Number(user.facilityId) === Number(asset.parentFacilityId)) return true;
    }

    const mainFacId = asset.mainFacilityId || asset.facility?.mainFacilityId;
    if (mainFacId) {
      const mfPerm = user.permissions.find((p: any) => p.moduleId === `asset_mf_${mainFacId}`);
      if (mfPerm?.canView) return !!mfPerm[actionKey];
      if (user.mainFacilityId && Number(user.mainFacilityId) === Number(mainFacId)) return true;
    }
  } else {
    // 3. Machine / Device
    const macPerm = user.permissions.find((p: any) => p.moduleId === `asset_mac_${asset.id}`);
    if (macPerm?.canView) {
      return !!macPerm[actionKey];
    }

    if (asset.deviceId) {
      const devPerm = user.permissions.find((p: any) => p.moduleId === `asset_dev_${asset.deviceId}` || p.moduleId === `asset_dev_${asset.id}`);
      if (devPerm?.canView) {
        return !!devPerm[actionKey];
      }
    }

    if (user.deviceId && (user.deviceId === asset.deviceId || user.deviceId === String(asset.id))) {
      return true;
    }

    // Check parent facility permission: asset_fac_${facilityId} or user facilityId match
    if (asset.facilityId) {
      const facPerm = user.permissions.find((p: any) => p.moduleId === `asset_fac_${asset.facilityId}`);
      if (facPerm?.canView) {
        return !!facPerm[actionKey];
      }
      if (user.facilityId && Number(user.facilityId) === Number(asset.facilityId)) {
        return true;
      }
    }

    // Check parent facility's parent permission if available on object
    const facObj = asset.facility as any;
    if (facObj?.parentFacilityId) {
      const parentFacPerm = user.permissions.find((p: any) => p.moduleId === `asset_fac_${facObj.parentFacilityId}`);
      if (parentFacPerm?.canView) {
        return !!parentFacPerm[actionKey];
      }
      if (user.facilityId && Number(user.facilityId) === Number(facObj.parentFacilityId)) {
        return true;
      }
    }

    // Check parent main facility permission: asset_mf_${mainFacilityId}
    const mainFacId = asset.mainFacilityId || asset.facility?.mainFacilityId;
    if (mainFacId) {
      const mfPerm = user.permissions.find((p: any) => p.moduleId === `asset_mf_${mainFacId}`);
      if (mfPerm?.canView) {
        return !!mfPerm[actionKey];
      }
      if (user.mainFacilityId && Number(user.mainFacilityId) === Number(mainFacId)) {
        return true;
      }
    }
  }

  // Fallback to global assets permission if defined
  const assetsPerm = user.permissions.find((p: any) => p.moduleId === 'assets');
  if (assetsPerm?.canView) {
    return !!assetsPerm[actionKey];
  }

  return false;
};

