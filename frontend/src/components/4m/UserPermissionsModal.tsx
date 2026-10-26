import React, { useState, useEffect, useMemo } from 'react';
import { X, Shield, ChevronDown, ChevronRight, Building, Building2, Cpu, Globe, Sliders } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { setUser } from '../../store/slices/authSlice';
import { FacilityHierarchyPicker } from './FacilityHierarchyPicker';
import { buildFlattenedAssets, type FlattenedAssetItem } from '../../pages/4m/access/AddRole';

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
      { id: 'machine_tab_wo', name: 'WO' },
      { id: 'machine_tab_checklist', name: 'Checklist' },
      { id: 'machine_tab_schedule_maintenance', name: 'Schedule Maintenance' },
    ]
  },
  { 
    id: 'spares', 
    name: 'Spares Management',
    subModules: [
      { id: 'spare_tab_general', name: 'General' },
      { id: 'spare_tab_stock', name: 'Stock' },
      { id: 'spare_tab_machines_list', name: 'Machines List' },
      { id: 'spare_tab_specification', name: 'Specification' },
      { id: 'spare_tab_warranties', name: 'Warranties' },
      { id: 'spare_tab_suppliers', name: 'Suppliers' },
      { id: 'spare_tab_documents', name: 'Documents' },
      { id: 'spare_tab_log', name: 'Log' },
    ]
  },
  { 
    id: 'suppliers', 
    name: 'Suppliers Management',
    subModules: [
      { id: 'supplier_tab_general', name: 'General' },
      { id: 'supplier_tab_location', name: 'Location' },
      { id: 'supplier_tab_spares', name: 'Spares' },
      { id: 'supplier_tab_documents', name: 'Documents' },
      { id: 'supplier_tab_log', name: 'Log' },
    ]
  },
  { 
    id: 'schedules', 
    name: 'Schedule Maintenance',
    subModules: [
      { id: 'schedule_tab_general', name: 'General' },
      { id: 'schedule_tab_scheduling', name: 'Scheduling' },
      { id: 'schedule_tab_checkpoints', name: 'Check Points' },
      { id: 'schedule_tab_spares', name: 'Spares' },
      { id: 'schedule_tab_notifications', name: 'Notifications' },
      { id: 'schedule_tab_notes', name: 'Notes' },
      { id: 'schedule_tab_files', name: 'Files' },
      { id: 'schedule_tab_logs', name: 'Logs' },
    ]
  },
];

const allModuleIds = availableModules.flatMap(m => [m.id, ...(m.subModules?.map(s => s.id) || [])]);

const isActionAllowed = (moduleId: string, action: string) => {
  if (moduleId === 'dashboard' && action !== 'view') return false;
  if (['manage_access', 'user_management', 'facility_management', 'machine_management', 'assets'].includes(moduleId) && action === 'import') return false;
  if (moduleId.startsWith('asset_') && action === 'import') return false;
  
  if (moduleId.startsWith('facility_tab_')) {
    if (['import', 'export', 'print'].includes(action)) return false;
    if (moduleId === 'facility_tab_document') {
      return ['view', 'create', 'edit', 'delete'].includes(action);
    }
    return ['view', 'edit'].includes(action);
  }

  if (moduleId.startsWith('machine_tab_')) {
    if (['import', 'export', 'print'].includes(action)) return false;
    if (['machine_tab_spares', 'machine_tab_documents', 'machine_tab_specification', 'machine_tab_wo', 'machine_tab_checklist', 'machine_tab_schedule_maintenance'].includes(moduleId)) {
      return ['view', 'create', 'edit', 'delete'].includes(action);
    }
    return ['view', 'edit'].includes(action);
  }

  if (moduleId.startsWith('spare_tab_')) {
    if (['import', 'export', 'print'].includes(action)) return false;
    if (moduleId === 'spare_tab_log') {
      return ['view'].includes(action);
    }
    return ['view', 'create', 'edit', 'delete'].includes(action);
  }

  if (moduleId.startsWith('supplier_tab_')) {
    if (['import', 'export', 'print'].includes(action)) return false;
    if (moduleId === 'supplier_tab_log') {
      return ['view'].includes(action);
    }
    return ['view', 'create', 'edit', 'delete'].includes(action);
  }

  if (moduleId.startsWith('schedule_tab_')) {
    if (['import', 'export', 'print'].includes(action)) return false;
    if (moduleId === 'schedule_tab_logs') {
      return ['view'].includes(action);
    }
    return ['view', 'create', 'edit', 'delete'].includes(action);
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
    machine_management: true,
    spares: true,
    suppliers: true,
    schedules: true,
    assets: true,
  });
  const [flattenedAssets, setFlattenedAssets] = useState<FlattenedAssetItem[]>([]);
  const [collapsedAssetIds, setCollapsedAssetIds] = useState<Record<string, boolean>>({});

  const toggleAssetExpand = (assetId: string) => {
    setCollapsedAssetIds(prev => ({
      ...prev,
      [assetId]: !prev[assetId]
    }));
  };

  const assetMap = useMemo(() => {
    const map = new Map<string, FlattenedAssetItem>();
    flattenedAssets.forEach(a => map.set(a.id, a));
    return map;
  }, [flattenedAssets]);

  const visibleAssets = useMemo(() => {
    return flattenedAssets.filter(asset => {
      let currParentId = asset.parentId;
      while (currParentId) {
        if (collapsedAssetIds[currParentId]) {
          return false;
        }
        const parentItem = assetMap.get(currParentId);
        currParentId = parentItem?.parentId;
      }
      return true;
    });
  }, [flattenedAssets, collapsedAssetIds, assetMap]);

  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(
    allModuleIds.reduce((acc, modId) => {
      acc[modId] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
      return acc;
    }, {} as Record<string, Record<string, boolean>>)
  );

  const [accessScope, setAccessScope] = useState<{
    mainFacilityId: string;
    facilityId: string;
    deviceId: string;
    deviceName: string;
    displayLabel: string;
    scopeType: 'all' | 'mainFacility' | 'facility' | 'device';
  }>({
    mainFacilityId: '',
    facilityId: '',
    deviceId: '',
    deviceName: '',
    displayLabel: 'All Facilities & Machines (Unrestricted)',
    scopeType: 'all',
  });

  const handleScopeChange = (e: any) => {
    const dataset = e.target.dataset || {};
    const type = dataset.type;
    const val = e.target.value;

    if (type === 'device') {
      const devId = dataset.deviceId || val;
      const devName = dataset.name || devId;
      const fId = dataset.facilityId || '';
      const mfId = dataset.mainFacilityId || '';
      setAccessScope({
        deviceId: devId,
        deviceName: devName,
        facilityId: fId,
        mainFacilityId: mfId,
        displayLabel: `Machine: ${devName}`,
        scopeType: 'device',
      });
    } else if (type === 'facility') {
      const fId = dataset.id || val;
      const fName = dataset.name || fId;
      const mfId = dataset.mainFacilityId || '';
      setAccessScope({
        deviceId: '',
        deviceName: '',
        facilityId: fId,
        mainFacilityId: mfId,
        displayLabel: `Sub-facility: ${fName}`,
        scopeType: 'facility',
      });
    } else if (type === 'mainFacility') {
      const mfId = dataset.id || val;
      const mfName = dataset.name || mfId;
      setAccessScope({
        deviceId: '',
        deviceName: '',
        facilityId: '',
        mainFacilityId: mfId,
        displayLabel: `Facility: ${mfName}`,
        scopeType: 'mainFacility',
      });
    } else {
      setAccessScope({
        deviceId: '',
        deviceName: '',
        facilityId: '',
        mainFacilityId: '',
        displayLabel: 'All Facilities & Machines (Unrestricted)',
        scopeType: 'all',
      });
    }
  };

  useEffect(() => {
    if (!isOpen || !userId) return;
    
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        // Fetch user permissions info and asset hierarchy from backend
        const [permRes, mainFacRes, facRes, machRes, devRes] = await Promise.allSettled([
          api.get(`/users/${userId}/permissions`),
          api.get('/main-facilities'),
          api.get('/facilities'),
          api.get('/machines'),
          api.get('/devices'),
        ]);

        const raw = permRes.status === 'fulfilled' ? permRes.value?.data : null;
        const mainFacilities = mainFacRes.status === 'fulfilled' && Array.isArray(mainFacRes.value?.data) ? mainFacRes.value.data : [];
        const facilities = facRes.status === 'fulfilled' && Array.isArray(facRes.value?.data) ? facRes.value.data : [];
        const machines = machRes.status === 'fulfilled' && Array.isArray(machRes.value?.data) ? machRes.value.data : [];
        const devices = devRes.status === 'fulfilled' && Array.isArray(devRes.value?.data) ? devRes.value.data : [];

        const flat = buildFlattenedAssets(mainFacilities, facilities, machines, devices);
        setFlattenedAssets(flat);

        // Extract assigned facility / sub-facility / machine scope
        const devId = raw?.deviceId || '';
        const devName = raw?.deviceName || '';
        const facId = raw?.facilityId ? raw.facilityId.toString() : '';
        const facName = raw?.facility?.facilityName || '';
        const mainFacId = raw?.mainFacilityId ? raw.mainFacilityId.toString() : '';
        const mainFacName = raw?.mainFacility?.mainFacilityName || '';

        let calculatedLabel = 'All Facilities & Machines (Unrestricted)';
        let calculatedType: 'all' | 'mainFacility' | 'facility' | 'device' = 'all';

        if (devId || devName) {
          calculatedLabel = `Machine: ${devName || devId}`;
          calculatedType = 'device';
        } else if (facId || facName) {
          calculatedLabel = `Sub-facility: ${facName || facId}`;
          calculatedType = 'facility';
        } else if (mainFacId || mainFacName) {
          calculatedLabel = `Facility: ${mainFacName || mainFacId}`;
          calculatedType = 'mainFacility';
        }

        setAccessScope({
          mainFacilityId: mainFacId,
          facilityId: facId,
          deviceId: devId,
          deviceName: devName,
          displayLabel: calculatedLabel,
          scopeType: calculatedType,
        });
        const userOverrides = Array.isArray(raw) ? raw : (raw?.userOverrides || []);
        let basePermissions: any[] = Array.isArray(raw?.basePermissions) ? raw.basePermissions : [];

        // If basePermissions is still empty, construct default baseline for all available modules
        if (basePermissions.length === 0) {
          basePermissions = allModuleIds.map(modId => ({
            moduleId: modId,
            canView: true,
            canCreate: ['master_employee', 'master_main_facility', 'user_management', 'facility_management', 'machine_management', 'spares', 'suppliers', 'schedules', 'facility_tab_document', 'machine_tab_spares', 'machine_tab_documents', 'machine_tab_specification', 'machine_tab_wo', 'machine_tab_checklist', 'machine_tab_schedule_maintenance', 'spare_tab_general', 'spare_tab_stock', 'spare_tab_machines_list', 'spare_tab_specification', 'spare_tab_warranties', 'spare_tab_suppliers', 'spare_tab_documents', 'supplier_tab_general', 'supplier_tab_location', 'supplier_tab_spares', 'supplier_tab_documents', 'schedule_tab_general', 'schedule_tab_scheduling', 'schedule_tab_checkpoints', 'schedule_tab_spares', 'schedule_tab_notifications', 'schedule_tab_notes', 'schedule_tab_files'].includes(modId),
            canEdit: ['master_employee', 'master_main_facility', 'user_management', 'facility_management', 'machine_management', 'spares', 'suppliers', 'schedules', 'facility_tab_general', 'facility_tab_document', 'machine_tab_general', 'machine_tab_specification', 'machine_tab_spares', 'machine_tab_amc', 'machine_tab_purchase', 'machine_tab_documents', 'machine_tab_iot', 'machine_tab_wo', 'machine_tab_checklist', 'machine_tab_schedule_maintenance', 'spare_tab_general', 'spare_tab_stock', 'spare_tab_machines_list', 'spare_tab_specification', 'spare_tab_warranties', 'spare_tab_suppliers', 'spare_tab_documents', 'supplier_tab_general', 'supplier_tab_location', 'supplier_tab_spares', 'supplier_tab_documents', 'schedule_tab_general', 'schedule_tab_scheduling', 'schedule_tab_checkpoints', 'schedule_tab_spares', 'schedule_tab_notifications', 'schedule_tab_notes', 'schedule_tab_files'].includes(modId),
            canDelete: ['master_employee', 'master_main_facility', 'user_management', 'facility_management', 'machine_management', 'spares', 'suppliers', 'schedules'].includes(modId),
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

          // Initialize flat assets
          flat.forEach(asset => {
            if (!next[asset.id]) {
              next[asset.id] = {
                view: false,
                create: false,
                edit: false,
                delete: false,
                import: false,
                export: false,
                print: false
              };
            }
          });

          merged.forEach((p: any) => {
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

          // Inherit assets parent permissions for flat assets if not explicitly overridden
          const assetsPerm = merged.find((p: any) => p.moduleId === 'assets');
          if (assetsPerm) {
            flat.forEach(asset => {
              const hasOverride = userOverrides.some((p: any) => p.moduleId === asset.id);
              if (!hasOverride && next[asset.id]) {
                const item = merged.find((p: any) => p.moduleId === asset.id);
                next[asset.id] = {
                  view: item ? !!item.canView : (assetsPerm.canView || false),
                  create: isActionAllowed(asset.id, 'create') ? (item && item.canCreate ? !!item.canCreate : (assetsPerm.canCreate || false)) : false,
                  edit: item ? !!item.canEdit : (assetsPerm.canEdit || false),
                  delete: isActionAllowed(asset.id, 'delete') ? (item && item.canDelete ? !!item.canDelete : (assetsPerm.canDelete || false)) : false,
                  import: false,
                  export: item ? !!item.canExport : (assetsPerm.canExport || false),
                  print: item ? !!item.canPrint : (assetsPerm.canPrint || false),
                };
              }
            });
          }

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
              'machine_tab_wo',
              'machine_tab_checklist',
              'machine_tab_schedule_maintenance',
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

          // Inherit spares tabs if parent spares is configured
          const sparesPerm = merged.find((p: any) => p.moduleId === 'spares');
          if (sparesPerm) {
            const spareTabs = [
              'spare_tab_general',
              'spare_tab_stock',
              'spare_tab_machines_list',
              'spare_tab_specification',
              'spare_tab_warranties',
              'spare_tab_suppliers',
              'spare_tab_documents',
              'spare_tab_log',
            ];
            spareTabs.forEach(tabId => {
              const hasOverride = userOverrides.some((p: any) => p.moduleId === tabId);
              if (!hasOverride && next[tabId]) {
                const tabItem = merged.find((p: any) => p.moduleId === tabId);
                next[tabId] = {
                  view: tabItem ? !!tabItem.canView : (sparesPerm.canView || false),
                  create: isActionAllowed(tabId, 'create') ? (tabItem && tabItem.canCreate ? !!tabItem.canCreate : (sparesPerm.canCreate || false)) : false,
                  edit: isActionAllowed(tabId, 'edit') ? (tabItem && tabItem.canEdit ? !!tabItem.canEdit : (sparesPerm.canEdit || false)) : false,
                  delete: isActionAllowed(tabId, 'delete') ? (tabItem && tabItem.canDelete ? !!tabItem.canDelete : (sparesPerm.canDelete || false)) : false,
                  import: false,
                  export: false,
                  print: false,
                };
              }
            });
          }

          // Inherit suppliers tabs if parent suppliers is configured
          const suppliersPerm = merged.find((p: any) => p.moduleId === 'suppliers');
          if (suppliersPerm) {
            const supplierTabs = [
              'supplier_tab_general',
              'supplier_tab_location',
              'supplier_tab_spares',
              'supplier_tab_documents',
              'supplier_tab_log',
            ];
            supplierTabs.forEach(tabId => {
              const hasOverride = userOverrides.some((p: any) => p.moduleId === tabId);
              if (!hasOverride && next[tabId]) {
                const tabItem = merged.find((p: any) => p.moduleId === tabId);
                next[tabId] = {
                  view: tabItem ? !!tabItem.canView : (suppliersPerm.canView || false),
                  create: isActionAllowed(tabId, 'create') ? (tabItem && tabItem.canCreate ? !!tabItem.canCreate : (suppliersPerm.canCreate || false)) : false,
                  edit: isActionAllowed(tabId, 'edit') ? (tabItem && tabItem.canEdit ? !!tabItem.canEdit : (suppliersPerm.canEdit || false)) : false,
                  delete: isActionAllowed(tabId, 'delete') ? (tabItem && tabItem.canDelete ? !!tabItem.canDelete : (suppliersPerm.canDelete || false)) : false,
                  import: false,
                  export: false,
                  print: false,
                };
              }
            });
          }

          // Inherit schedules tabs if parent schedules is configured
          const schedulesPerm = merged.find((p: any) => p.moduleId === 'schedules');
          if (schedulesPerm) {
            const scheduleTabs = [
              'schedule_tab_general',
              'schedule_tab_scheduling',
              'schedule_tab_checkpoints',
              'schedule_tab_spares',
              'schedule_tab_notifications',
              'schedule_tab_notes',
              'schedule_tab_files',
              'schedule_tab_logs',
            ];
            scheduleTabs.forEach(tabId => {
              const hasOverride = userOverrides.some((p: any) => p.moduleId === tabId);
              if (!hasOverride && next[tabId]) {
                const tabItem = merged.find((p: any) => p.moduleId === tabId);
                next[tabId] = {
                  view: tabItem ? !!tabItem.canView : (schedulesPerm.canView || false),
                  create: isActionAllowed(tabId, 'create') ? (tabItem && tabItem.canCreate ? !!tabItem.canCreate : (schedulesPerm.canCreate || false)) : false,
                  edit: isActionAllowed(tabId, 'edit') ? (tabItem && tabItem.canEdit ? !!tabItem.canEdit : (schedulesPerm.canEdit || false)) : false,
                  delete: isActionAllowed(tabId, 'delete') ? (tabItem && tabItem.canDelete ? !!tabItem.canDelete : (schedulesPerm.canDelete || false)) : false,
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
          ...(prev[moduleId] || { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false }),
          [action]: checked
        }
      };

      // If user checks any action other than view, automatically check view as well
      if (checked && action !== 'view') {
        next[moduleId].view = true;
      }

      // If user unchecks view, uncheck all other actions for this module
      if (!checked && action === 'view') {
        ['create', 'edit', 'delete', 'import', 'export', 'print'].forEach(act => {
          next[moduleId][act] = false;
        });
      }

      // If an asset view is enabled, ensure parent assets module view is enabled
      if (moduleId.startsWith('asset_') && checked && action === 'view') {
        if (!next.assets) {
          next.assets = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
        }
        next.assets = {
          ...next.assets,
          view: true
        };
      }

      // If parent assets module is toggled, cascade that action to all flattened assets
      if (moduleId === 'assets') {
        flattenedAssets.forEach(a => {
          if (!next[a.id]) {
            next[a.id] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
          }
          if (isActionAllowed(a.id, action)) {
            next[a.id] = {
              ...next[a.id],
              [action]: checked
            };
            if (checked && action !== 'view') {
              next[a.id].view = true;
            }
            if (!checked && action === 'view') {
              ['create', 'edit', 'delete', 'import', 'export', 'print'].forEach(act => {
                next[a.id][act] = false;
              });
            }
          }
        });
      }

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
      if (moduleId.startsWith('spare_tab_') && checked && action === 'view') {
        next.spares = {
          ...next.spares,
          view: true
        };
      }
      if (moduleId.startsWith('supplier_tab_') && checked && action === 'view') {
        next.suppliers = {
          ...next.suppliers,
          view: true
        };
      }
      if (moduleId.startsWith('schedule_tab_') && checked && action === 'view') {
        next.schedules = {
          ...next.schedules,
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
      if (moduleId === 'spares' && action === 'view' && !checked) {
        const mod = availableModules.find(m => m.id === 'spares');
        mod?.subModules?.forEach(sub => {
          if (next[sub.id]) {
            next[sub.id] = {
              ...next[sub.id],
              view: false
            };
          }
        });
      }
      if (moduleId === 'suppliers' && action === 'view' && !checked) {
        const mod = availableModules.find(m => m.id === 'suppliers');
        mod?.subModules?.forEach(sub => {
          if (next[sub.id]) {
            next[sub.id] = {
              ...next[sub.id],
              view: false
            };
          }
        });
      }
      if (moduleId === 'schedules' && action === 'view' && !checked) {
        const mod = availableModules.find(m => m.id === 'schedules');
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
        if (!next[mId]) {
          next[mId] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
        }
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

      // If toggling parent assets, cascade to all asset sub-rows
      if (moduleId === 'assets') {
        flattenedAssets.forEach(a => updateMod(a.id));
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

      await api.put(`/users/${userId}/permissions`, {
        permissions: payloadPermissions,
        mainFacilityId: accessScope.mainFacilityId ? parseInt(accessScope.mainFacilityId, 10) : null,
        facilityId: accessScope.facilityId ? parseInt(accessScope.facilityId, 10) : null,
        deviceId: accessScope.deviceId || null,
        deviceName: accessScope.deviceName || null,
      });
      toast.success('User permissions and access scope updated successfully!');

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
            <>
              {/* Asset Hierarchy Access Scope Card */}
              <div className="mb-6 p-4 sm:p-5 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 via-purple-50/20 to-white shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                      <Sliders size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Asset Access Scope</h3>
                      <p className="text-xs text-gray-500">
                        Give access based on Facility, Sub-facility, or Machine from the hierarchy tree
                      </p>
                    </div>
                  </div>

                  {/* Current Active Scope Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500">Current Scope:</span>
                    {accessScope.scopeType === 'device' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                        <Cpu size={13} className="text-orange-600" />
                        <span>{accessScope.displayLabel}</span>
                      </span>
                    ) : accessScope.scopeType === 'facility' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                        <Building size={13} className="text-green-600" />
                        <span>{accessScope.displayLabel}</span>
                      </span>
                    ) : accessScope.scopeType === 'mainFacility' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Building2 size={13} className="text-emerald-600" />
                        <span>{accessScope.displayLabel}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        <Globe size={13} className="text-gray-500" />
                        <span>All Facilities & Machines</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center mt-3 pt-3 border-t border-gray-200/60">
                  <div className="sm:col-span-8">
                    <FacilityHierarchyPicker
                      name="userScope"
                      value={
                        accessScope.deviceId
                          ? accessScope.deviceId
                          : accessScope.facilityId
                          ? `fac-${accessScope.facilityId}`
                          : accessScope.mainFacilityId
                          ? `mf-${accessScope.mainFacilityId}`
                          : ''
                      }
                      onChange={handleScopeChange}
                      placeholder="Select Facility, Sub-facility, or Machine"
                      showDevices={true}
                      showSocietiesAndBuildings={false}
                      selectableTypes={['mainFacility', 'facility', 'device']}
                      allowClear={true}
                    />
                  </div>
                  <div className="sm:col-span-4 flex items-center justify-end">
                    {accessScope.scopeType !== 'all' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAccessScope({
                            deviceId: '',
                            deviceName: '',
                            facilityId: '',
                            mainFacilityId: '',
                            displayLabel: 'All Facilities & Machines (Unrestricted)',
                            scopeType: 'all',
                          });
                          toast.success('Access reset to all facilities');
                        }}
                        className="w-full sm:w-auto text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Reset to All Facilities
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">User has unrestricted access across all assets</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider">Module</th>
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
                          {mod.subModules || (mod.id === 'assets' && flattenedAssets.length > 0) ? (
                            <div 
                              className="flex items-center gap-2 cursor-pointer select-none group"
                              onClick={() => toggleModuleExpand(mod.id)}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleModuleExpand(mod.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                                title={expandedModules[mod.id] ? "Collapse" : "Expand"}
                              >
                                {expandedModules[mod.id] ? (
                                  <ChevronDown className="w-4 h-4 text-purple-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <span className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{mod.name}</span>
                              {mod.id === 'assets' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                                  {flattenedAssets.length} Assets
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{mod.name}</span>
                            </div>
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

                      {/* Render Asset Hierarchy Sub-rows */}
                      {mod.id === 'assets' && expandedModules['assets'] && (
                        visibleAssets.length === 0 ? (
                          <tr className="bg-purple-50/10">
                            <td colSpan={9} className="px-8 py-3 text-xs text-gray-400 italic">
                              {flattenedAssets.length === 0 ? "No facilities or machines found." : "All items collapsed."}
                            </td>
                          </tr>
                        ) : (
                          visibleAssets.map((asset) => {
                            const isCollapsed = !!collapsedAssetIds[asset.id];
                            return (
                              <tr key={asset.id} className="bg-purple-50/20 hover:bg-purple-50/40 transition-colors">
                                <td 
                                  className="py-2.5 text-sm"
                                  style={{ paddingLeft: `${24 + Math.min(asset.depth, 4) * 20}px` }}
                                >
                                  <div 
                                    className={`flex items-center gap-2 ${asset.hasChildren ? 'cursor-pointer select-none group' : ''}`}
                                    onClick={() => asset.hasChildren && toggleAssetExpand(asset.id)}
                                  >
                                    {asset.hasChildren ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleAssetExpand(asset.id);
                                        }}
                                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-purple-200/60 text-purple-700 transition-colors cursor-pointer shrink-0"
                                        title={isCollapsed ? "Expand subtree" : "Collapse subtree"}
                                      >
                                        {isCollapsed ? (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    ) : (
                                      <span className="w-5 inline-block text-center text-purple-400 font-mono text-base shrink-0">↳</span>
                                    )}
                                    {asset.type === 'mainFacility' ? (
                                      <div className="w-5 h-5 rounded bg-purple-50 border border-purple-200/80 flex items-center justify-center shrink-0" title="Facility">
                                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                                      </div>
                                    ) : asset.type === 'facility' ? (
                                      <div className="w-5 h-5 rounded bg-teal-50 border border-teal-200/80 flex items-center justify-center shrink-0" title="Sub-facility">
                                        <Building className="w-3.5 h-3.5 text-teal-600" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded bg-indigo-50 border border-indigo-200/80 flex items-center justify-center shrink-0" title="Machine">
                                        <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                                      </div>
                                    )}
                                    <span className={`text-sm font-semibold text-gray-800 ${asset.hasChildren ? 'group-hover:text-purple-800' : ''}`}>
                                      {asset.name}
                                    </span>
                                  </div>
                                </td>

                                {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                                  <td key={action} className="px-2 py-2.5 text-center">
                                    {isActionAllowed(asset.id, action) ? (
                                      <input 
                                        type="checkbox"
                                        checked={permissions[asset.id]?.[action] || false}
                                        onChange={(e) => handlePermissionChange(asset.id, action, e.target.checked)}
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
                                    checked={isRowAllSelected(asset.id)}
                                    onChange={(e) => handleSelectAllRow(asset.id, e.target.checked)}
                                    className="w-4.5 h-4.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
