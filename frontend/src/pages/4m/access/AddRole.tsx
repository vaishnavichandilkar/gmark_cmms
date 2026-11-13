import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, Shield, CheckCircle2, XCircle, ChevronDown, ChevronRight, Layers, User, Users, X, Plus, Trash2, Search, Sliders, Globe, Building, Building2, Cpu, Pencil } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

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
  { 
    id: 'dashboard', 
    name: 'Dashboard',
    subModules: [
      { id: 'dashboard_iot', name: 'IoT' },
      { id: 'dashboard_cmms', name: 'CMMS' },
    ]
  },
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
  { id: 'work_orders', name: 'Work Orders' },
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

export interface FlattenedAssetItem {
  id: string;
  name: string;
  type: 'mainFacility' | 'facility' | 'device';
  typeLabel: 'Facility' | 'Sub-facility' | 'Machine';
  depth: number;
  parentId?: string;
  hasChildren?: boolean;
}

export function buildFlattenedAssets(
  mainFacilities: any[],
  facilities: any[],
  machines: any[],
  devices: any[] = []
): FlattenedAssetItem[] {
  const result: FlattenedAssetItem[] = [];
  const visitedFacIds = new Set<number>();
  const visitedMachIds = new Set<number>();

  const addMachinesForFacility = (facId: number, parentKey: string, depth: number) => {
    const facMachines = machines.filter((m: any) => m.facilityId === facId && !m.parentMachineId);
    
    const recurseMachine = (mac: any, macParentKey: string, d: number) => {
      visitedMachIds.add(mac.id);
      const childMacs = machines.filter((cm: any) => cm.parentMachineId === mac.id);
      const macKey = `asset_mac_${mac.id}`;
      result.push({
        id: macKey,
        name: mac.name || mac.machineCode || mac.deviceId || 'Machine',
        type: 'device',
        typeLabel: 'Machine',
        depth: d,
        parentId: macParentKey,
        hasChildren: childMacs.length > 0,
      });
      childMacs.forEach(cm => recurseMachine(cm, macKey, d + 1));
    };

    facMachines.forEach(m => recurseMachine(m, parentKey, depth));

    const facDevices = devices.filter((dev: any) => dev.facilityId === facId);
    facDevices.forEach((dev: any) => {
      if (!facMachines.some((m: any) => m.deviceId && m.deviceId === dev.deviceId)) {
        result.push({
          id: `asset_dev_${dev.id}`,
          name: dev.name || dev.deviceId || 'Device',
          type: 'device',
          typeLabel: 'Machine',
          depth,
          parentId: parentKey,
          hasChildren: false,
        });
      }
    });
  };

  const addFacility = (fac: any, parentKey: string | undefined, depth: number) => {
    visitedFacIds.add(fac.id);
    const facKey = `asset_fac_${fac.id}`;
    
    const childFacs = facilities.filter((f: any) => f.parentFacilityId === fac.id);
    const facMachines = machines.filter((m: any) => m.facilityId === fac.id && !m.parentMachineId);
    const facDevices = devices.filter((dev: any) => dev.facilityId === fac.id);
    const hasChildren = childFacs.length > 0 || facMachines.length > 0 || facDevices.length > 0;

    result.push({
      id: facKey,
      name: fac.facilityName || fac.name || 'Sub-facility',
      type: 'facility',
      typeLabel: depth === 0 ? 'Facility' : 'Sub-facility',
      depth,
      parentId: parentKey,
      hasChildren,
    });

    childFacs.forEach(cf => addFacility(cf, facKey, depth + 1));
    addMachinesForFacility(fac.id, facKey, depth + 1);
  };

  // 1. Main Facilities
  mainFacilities.forEach((mf: any) => {
    const mfKey = `asset_mf_${mf.id}`;
    const rootSubFacs = facilities.filter(
      (f: any) => f.mainFacilityId === mf.id && (!f.parentFacilityId || f.parentFacilityId === f.id)
    );
    const mfMachines = machines.filter(
      (m: any) => !m.facilityId && (m.mainFacilityId === mf.id || m.company === String(mf.id) || m.company === mf.mainFacilityName)
    );
    const hasChildren = rootSubFacs.length > 0 || mfMachines.length > 0;

    result.push({
      id: mfKey,
      name: mf.mainFacilityName || mf.name || 'Facility',
      type: 'mainFacility',
      typeLabel: 'Facility',
      depth: 0,
      parentId: undefined,
      hasChildren,
    });

    rootSubFacs.forEach(f => addFacility(f, mfKey, 1));

    mfMachines.forEach(m => {
      visitedMachIds.add(m.id);
      const childMacs = machines.filter((cm: any) => cm.parentMachineId === m.id);
      result.push({
        id: `asset_mac_${m.id}`,
        name: m.name || m.machineCode || m.deviceId || 'Machine',
        type: 'device',
        typeLabel: 'Machine',
        depth: 1,
        parentId: mfKey,
        hasChildren: childMacs.length > 0,
      });
    });
  });

  // 2. Orphan Facilities
  const remainingFacs = facilities.filter(
    (f: any) => !visitedFacIds.has(f.id) && !f.parentFacilityId
  );
  remainingFacs.forEach(f => addFacility(f, undefined, 0));

  facilities.forEach((f: any) => {
    if (!visitedFacIds.has(f.id)) {
      addFacility(f, undefined, 0);
    }
  });

  // 3. Orphan Machines
  machines.forEach((m: any) => {
    if (!visitedMachIds.has(m.id) && !m.parentMachineId) {
      result.push({
        id: `asset_mac_${m.id}`,
        name: m.name || m.machineCode || m.deviceId || 'Machine',
        type: 'device',
        typeLabel: 'Machine',
        depth: 0,
        parentId: undefined,
        hasChildren: false,
      });
    }
  });

  return result;
}

export const getDescendantAssetIds = (rootId: string, items: FlattenedAssetItem[]): string[] => {
  const result: string[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    items.forEach(item => {
      if (item.parentId === current) {
        result.push(item.id);
        queue.push(item.id);
      }
    });
  }
  return result;
};

const isActionAllowed = (moduleId: string, action: string) => {
  if ((moduleId === 'dashboard' || moduleId.startsWith('dashboard_')) && action !== 'view') return false;
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
    dashboard: true,
    facility_management: true,
    machine_management: true,
    spares: true,
    suppliers: true,
    schedules: true,
    assets: true,
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
  const [designationUsers, setDesignationUsers] = useState<any[]>([]);
  const [allDesignations, setAllDesignations] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
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

  // Facility & Machine Access Scope state
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
    displayLabel: 'All Facilities & Machines (Global Scope)',
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
        displayLabel: 'All Facilities & Machines (Global Scope)',
        scopeType: 'all',
      });
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [empRes, userRes, allDesigRes, desigRes, mainFacRes, facRes, machRes, devRes] = await Promise.allSettled([
          api.get('/employees'),
          api.get('/users'),
          api.get('/designations'),
          id ? api.get(`/designations/${id}`) : Promise.resolve(null),
          api.get('/main-facilities'),
          api.get('/facilities'),
          api.get('/machines'),
          api.get('/devices'),
        ]);

        const fetchedEmployees = empRes.status === 'fulfilled' ? (empRes.value?.data || []) : [];
        const fetchedUsers = userRes.status === 'fulfilled' ? (userRes.value?.data || []) : [];
        const fetchedAllDesignations = allDesigRes.status === 'fulfilled' && Array.isArray(allDesigRes.value?.data) ? allDesigRes.value.data : [];
        setEmployees(fetchedEmployees);
        setUsers(fetchedUsers);
        setAllDesignations(fetchedAllDesignations);

        const mainFacilities = mainFacRes.status === 'fulfilled' && Array.isArray(mainFacRes.value?.data) ? mainFacRes.value.data : [];
        const facilities = facRes.status === 'fulfilled' && Array.isArray(facRes.value?.data) ? facRes.value.data : [];
        const machines = machRes.status === 'fulfilled' && Array.isArray(machRes.value?.data) ? machRes.value.data : [];
        const devices = devRes.status === 'fulfilled' && Array.isArray(devRes.value?.data) ? devRes.value.data : [];

        const flat = buildFlattenedAssets(mainFacilities, facilities, machines, devices);
        setFlattenedAssets(flat);

        if (desigRes.status === 'fulfilled' && desigRes.value?.data) {
          const data = desigRes.value.data;
          setFormData({
            roleName: data.name,
            isActive: data.isActive,
          });
          setDesignationUsers(data.users || []);

          // Set permissions
          if (data.permissions) {
            setPermissions(prev => {
              const next = { ...prev };

              // Initialize all flat assets in next
              flat.forEach(asset => {
                if (!next[asset.id]) {
                  next[asset.id] = {
                    view: false,
                    create: false,
                    edit: false,
                    delete: false,
                    import: false,
                    export: false,
                    print: false,
                  };
                }
              });

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

              // Backwards compatibility for dashboard: inherit submodules from parent dashboard if not individually set
              const dashPerm = data.permissions.find((p: any) => p.moduleId === 'dashboard');
              if (dashPerm) {
                ['dashboard_iot', 'dashboard_cmms'].forEach(subId => {
                  if (!data.permissions.some((p: any) => p.moduleId === subId)) {
                    next[subId] = {
                      view: !!dashPerm.canView,
                      create: false,
                      edit: false,
                      delete: false,
                      import: false,
                      export: false,
                      print: false,
                    };
                  }
                });
              }

              // Backwards compatibility for assets: inherit from parent assets row if not individually set
              const assetsPerm = data.permissions.find((p: any) => p.moduleId === 'assets');
              if (assetsPerm) {
                flat.forEach(asset => {
                  const assetPerm = data.permissions.find((p: any) => p.moduleId === asset.id);
                  if (!assetPerm) {
                    next[asset.id] = {
                      view: assetsPerm.canView || false,
                      create: assetsPerm.canCreate || false,
                      edit: assetsPerm.canEdit || false,
                      delete: assetsPerm.canDelete || false,
                      import: false,
                      export: assetsPerm.canExport || false,
                      print: assetsPerm.canPrint || false,
                    };
                  }
                });
              }

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
                  'machine_tab_wo',
                  'machine_tab_checklist',
                  'machine_tab_schedule_maintenance',
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

              // Backwards compatibility: inherit tabs from parent spares
              const sparesPerm = data.permissions.find((p: any) => p.moduleId === 'spares');
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
                  const tabItem = data.permissions.find((p: any) => p.moduleId === tabId);
                  if (next[tabId]) {
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

              // Backwards compatibility: inherit tabs from parent suppliers
              const suppliersPerm = data.permissions.find((p: any) => p.moduleId === 'suppliers');
              if (suppliersPerm) {
                const supplierTabs = [
                  'supplier_tab_general',
                  'supplier_tab_location',
                  'supplier_tab_spares',
                  'supplier_tab_documents',
                  'supplier_tab_log',
                ];
                supplierTabs.forEach(tabId => {
                  const tabItem = data.permissions.find((p: any) => p.moduleId === tabId);
                  if (next[tabId]) {
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

              // Backwards compatibility: inherit tabs from parent schedules
              const schedulesPerm = data.permissions.find((p: any) => p.moduleId === 'schedules');
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
                  const tabItem = data.permissions.find((p: any) => p.moduleId === tabId);
                  if (next[tabId]) {
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
          }

          // Automatically populate all assigned employee IDs for this role
          const roleNameLower = (data.name || '').trim().toLowerCase();
          const directAssigned: string[] = Array.isArray(data.assignedEmployeeIds) ? data.assignedEmployeeIds : [];
          
          const fromUsers = fetchedUsers
            .filter((u: any) => u.designation && u.designation.trim().toLowerCase() === roleNameLower && u.employeeId)
            .map((u: any) => u.employeeId.toString());

          const fromEmps = fetchedEmployees
            .filter((e: any) => e.designation && e.designation.trim().toLowerCase() === roleNameLower)
            .map((e: any) => e.id.toString());

          const initialIds = Array.from(new Set([...directAssigned, ...fromUsers, ...fromEmps]));
          setSelectedEmployeeIds(initialIds);

          // Populate access scope if exists on designation or its users
          if (data.accessScope) {
            const sc = data.accessScope;
            let sType: 'all' | 'mainFacility' | 'facility' | 'device' = 'all';
            let sLabel = 'All Facilities & Machines (Global Scope)';
            if (sc.deviceId || sc.deviceName) {
              sType = 'device';
              sLabel = `Machine: ${sc.deviceName || sc.deviceId}`;
            } else if (sc.facilityId || sc.facilityName) {
              sType = 'facility';
              sLabel = `Sub-facility: ${sc.facilityName || sc.facilityId}`;
            } else if (sc.mainFacilityId || sc.mainFacilityName) {
              sType = 'mainFacility';
              sLabel = `Facility: ${sc.mainFacilityName || sc.mainFacilityId}`;
            }
            setAccessScope({
              mainFacilityId: sc.mainFacilityId || '',
              facilityId: sc.facilityId || '',
              deviceId: sc.deviceId || '',
              deviceName: sc.deviceName || '',
              displayLabel: sLabel,
              scopeType: sType,
            });
          } else {
            const userWithScope = (data.users || []).find((u: any) => u.deviceId || u.facilityId || u.mainFacilityId) ||
              fetchedUsers.find((u: any) => (u.designation && u.designation.trim().toLowerCase() === roleNameLower) && (u.deviceId || u.facilityId || u.mainFacilityId));
            if (userWithScope) {
              let sType: 'all' | 'mainFacility' | 'facility' | 'device' = 'all';
              let sLabel = 'All Facilities & Machines (Global Scope)';
              if (userWithScope.deviceId || userWithScope.deviceName) {
                sType = 'device';
                sLabel = `Machine: ${userWithScope.deviceName || userWithScope.deviceId}`;
              } else if (userWithScope.facilityId || userWithScope.facility?.facilityName || userWithScope.facilityName) {
                sType = 'facility';
                sLabel = `Sub-facility: ${userWithScope.facility?.facilityName || userWithScope.facilityName || userWithScope.facilityId}`;
              } else if (userWithScope.mainFacilityId || userWithScope.mainFacility?.mainFacilityName || userWithScope.mainFacilityName) {
                sType = 'mainFacility';
                sLabel = `Facility: ${userWithScope.mainFacility?.mainFacilityName || userWithScope.mainFacilityName || userWithScope.mainFacilityId}`;
              }
              setAccessScope({
                mainFacilityId: userWithScope.mainFacilityId ? userWithScope.mainFacilityId.toString() : '',
                facilityId: userWithScope.facilityId ? userWithScope.facilityId.toString() : '',
                deviceId: userWithScope.deviceId || '',
                deviceName: userWithScope.deviceName || '',
                displayLabel: sLabel,
                scopeType: sType,
              });
            }
          }

        } else if (!id && !isViewMode) {
          // Initialize flat asset permissions for new role
          setPermissions(prev => {
            const next = { ...prev };
            flat.forEach(asset => {
              if (!next[asset.id]) {
                next[asset.id] = {
                  view: false,
                  create: false,
                  edit: false,
                  delete: false,
                  import: false,
                  export: false,
                  print: false,
                };
              }
            });
            return next;
          });

          // Restore draft only if returning from AddEmployee in creation mode
          const draft = sessionStorage.getItem('addRoleDraft');
          const newlyAddedEmployeeName = sessionStorage.getItem('newlyAddedEmployeeName');

          if (draft) {
            try {
              const parsed = JSON.parse(draft);
              if (parsed.formData) setFormData(parsed.formData);
              if (parsed.permissions) {
                setPermissions(prev => {
                  const merged = { ...prev, ...parsed.permissions };
                  // Ensure flat assets exist
                  flat.forEach(asset => {
                    if (!merged[asset.id]) {
                      merged[asset.id] = {
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                        import: false,
                        export: false,
                        print: false,
                      };
                    }
                  });
                  return merged;
                });
              }
              if (parsed.accessScope) setAccessScope(parsed.accessScope);

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
        }
      } catch (err) {
        console.error('Failed to load role and employees:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
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

      // If toggling dashboard view, cascade to dashboard_iot and dashboard_cmms
      if (moduleId === 'dashboard' && action === 'view') {
        ['dashboard_iot', 'dashboard_cmms'].forEach(subId => {
          if (!next[subId]) {
            next[subId] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
          }
          next[subId].view = checked;
        });
      }

      // If checking dashboard submodule view, ensure parent dashboard view is checked
      if (moduleId.startsWith('dashboard_') && checked && action === 'view') {
        if (!next.dashboard) {
          next.dashboard = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
        }
        next.dashboard.view = true;
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

      // If toggling a facility or main facility, cascade action to all its descendant facilities and machines
      if (moduleId.startsWith('asset_fac_') || moduleId.startsWith('asset_mf_')) {
        const descendantIds = getDescendantAssetIds(moduleId, flattenedAssets);
        descendantIds.forEach(dId => {
          if (!next[dId]) {
            next[dId] = { view: false, create: false, edit: false, delete: false, import: false, export: false, print: false };
          }
          if (isActionAllowed(dId, action)) {
            next[dId] = {
              ...next[dId],
              [action]: checked,
            };
            if (checked && action !== 'view') {
              next[dId].view = true;
            }
            if (!checked && action === 'view') {
              ['create', 'edit', 'delete', 'import', 'export', 'print'].forEach(act => {
                next[dId][act] = false;
              });
            }
          }
        });
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
    if (isViewMode) return;
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

      // If toggling parent module with subModules, also cascade to all sub-tabs
      const targetMod = availableModules.find(m => m.id === moduleId);
      if (targetMod?.subModules) {
        targetMod.subModules.forEach(sub => updateMod(sub.id));
      }

      // If toggling parent assets, cascade to all asset sub-rows
      if (moduleId === 'assets') {
        flattenedAssets.forEach(a => updateMod(a.id));
      }

      // If toggling a facility or main facility, cascade to all descendant facilities and machines
      if (moduleId.startsWith('asset_fac_') || moduleId.startsWith('asset_mf_')) {
        const descendantIds = getDescendantAssetIds(moduleId, flattenedAssets);
        descendantIds.forEach(dId => updateMod(dId));
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
    const allIds = [...allModuleIds, ...flattenedAssets.map(a => a.id)];
    return allIds.every(modId => {
      return ['view', 'create', 'edit', 'delete', 'import', 'export', 'print']
        .filter(action => isActionAllowed(modId, action))
        .every(action => permissions[modId]?.[action]);
    });
  };

  const handleSelectAllGlobal = (checked: boolean) => {
    if (isViewMode) return;
    setPermissions(prev => {
      const next = { ...prev };
      const allIds = [...allModuleIds, ...flattenedAssets.map(a => a.id)];
      allIds.forEach(modId => {
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
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
          if (roleStr.includes('OPERATOR') || roleStr.includes('SUPERVISOR') || roleStr.includes('TECHNICIAN') || roleStr.includes('ENGINEER') || roleStr.includes('MAINTENANCE') || roleStr.includes('WORKER')) return 'OPERATOR';
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
            mainFacilityId: accessScope.mainFacilityId ? parseInt(accessScope.mainFacilityId, 10) : null,
            facilityId: accessScope.facilityId ? parseInt(accessScope.facilityId, 10) : null,
            deviceId: accessScope.deviceId || null,
            deviceName: accessScope.deviceName || null,
          };

          let savedUserId: number | null = existingUser ? existingUser.id : null;
          if (existingUser) {
            await api.put(`/users/${existingUser.id}`, userPayload).catch(() => {});
          } else {
            userPayload.password = 'Welcome@123';
            const createRes = await api.post('/users', userPayload).catch(() => null);
            if (createRes?.data?.id) savedUserId = createRes.data.id;
          }

          // Ensure permissions and access scope are also synchronized on the user record
          if (savedUserId) {
            await api.put(`/users/${savedUserId}/permissions`, {
              mainFacilityId: accessScope.mainFacilityId ? parseInt(accessScope.mainFacilityId, 10) : null,
              facilityId: accessScope.facilityId ? parseInt(accessScope.facilityId, 10) : null,
              deviceId: accessScope.deviceId || null,
              deviceName: accessScope.deviceName || null,
            }).catch(() => {});
          }

          // Sync designation in Employee record as well
          await api.patch(`/employees/${empIdStr}`, { designation: formData.roleName }).catch(() => {});
        }

        // Unassign designation from users who were unselected
        const previouslyAssignedUsers = users.filter((u: any) => 
          u.designation && u.designation.trim().toLowerCase() === formData.roleName?.trim().toLowerCase()
        );
        for (const prevUser of previouslyAssignedUsers) {
          if (prevUser.employeeId && !selectedEmployeeIds.includes(prevUser.employeeId.toString())) {
            await api.put(`/users/${prevUser.id}`, { designation: null }).catch(() => {});
            await api.patch(`/employees/${prevUser.employeeId}`, { designation: 'Staff' }).catch(() => {});
          }
        }
      }

      toast.success(selectedEmployeeIds.length > 0 ? 'Role and User(s) saved successfully!' : 'Role saved successfully!');
      navigate(returnUrl || '/manage-access');
    } catch (err) {
      console.error('Failed to save role', err);
      toast.error('Failed to save role.');
    }
  };

  const handleAddNewEmployeeRedirect = () => {
    const draft = {
      formData,
      permissions,
      selectedEmployeeIds,
      accessScope,
    };
    sessionStorage.setItem('addRoleDraft', JSON.stringify(draft));
    sessionStorage.setItem('addEmployeeOriginalReturnUrl', window.location.pathname);

    toast('Redirecting to Employee Master to add a new employee...', { icon: '✨' });
    navigate('/master/employee/new', { state: { returnUrl: window.location.pathname } });
  };

  // Derive full employee/user details for all selected IDs
  const selectedEmployeesList = useMemo(() => {
    return selectedEmployeeIds.map((idStr: string) => {
      const emp = employees.find(e => e.id.toString() === idStr);
      if (emp) {
        return {
          id: idStr,
          fullName: emp.fullName || `Employee #${idStr}`,
          employeeCode: emp.employeeCode || `EMP${idStr}`,
          department: emp.department || 'N/A',
          designation: emp.designation || formData.roleName,
          officialEmail: emp.officialEmail,
        };
      }
      const desigUser = designationUsers.find(u => u.employeeId?.toString() === idStr || u.id.toString() === idStr);
      if (desigUser) {
        return {
          id: idStr,
          fullName: desigUser.name || `User #${idStr}`,
          employeeCode: desigUser.employeeCode || `EMP#${idStr}`,
          department: desigUser.department || 'Maintenance',
          designation: formData.roleName,
          officialEmail: desigUser.email,
        };
      }
      const usr = users.find(u => u.employeeId?.toString() === idStr || u.id.toString() === idStr);
      if (usr) {
        return {
          id: idStr,
          fullName: usr.firstName ? `${usr.firstName} ${usr.lastName || ''}`.trim() : (usr.username || 'User'),
          employeeCode: usr.employeeCode || `EMP#${usr.id}`,
          department: usr.department || 'General',
          designation: usr.designation || formData.roleName,
          officialEmail: usr.email,
        };
      }
      return { id: idStr, fullName: `Employee #${idStr}`, employeeCode: '', department: '' };
    });
  }, [selectedEmployeeIds, employees, designationUsers, users, formData.roleName]);

  // Helper to determine if an employee already has a role assigned
  const hasAssignedRole = (empIdStr: string, emp?: any) => {
    // 1. If currently selected for this role in the UI, they are assigned
    if (selectedEmployeeIds.includes(empIdStr)) return true;

    // 2. Check all designations / roles in the system
    for (const desig of allDesignations) {
      // When in edit mode, ignore the current role being edited
      if (id && desig.id?.toString() === id.toString()) continue;

      const assignedIds: string[] = desig.assignedEmployeeIds || (desig.users || []).map((u: any) => u.employeeId?.toString()).filter(Boolean);
      if (assignedIds.includes(empIdStr)) {
        return true;
      }
      if (emp?.designation && desig.name && emp.designation.trim().toLowerCase() === desig.name.trim().toLowerCase()) {
        return true;
      }
    }

    // 3. Check users list
    const linkedUser = users.find((u: any) => u.employeeId?.toString() === empIdStr || u.id?.toString() === empIdStr);
    if (linkedUser) {
      const uDesig = (linkedUser.designation || '').trim();
      if (uDesig && !['staff', 'unassigned', 'none', ''].includes(uDesig.toLowerCase())) {
        if (id && formData.roleName && uDesig.toLowerCase() === formData.roleName.trim().toLowerCase()) {
          return false;
        }
        return true;
      }
      if (linkedUser.role && linkedUser.role !== 'VIEWER') {
        return true;
      }
    }

    // 4. Check employee record designation
    if (emp && emp.designation) {
      const empDesig = emp.designation.trim();
      if (empDesig && !['staff', 'unassigned', 'none', ''].includes(empDesig.toLowerCase())) {
        if (id && formData.roleName && empDesig.toLowerCase() === formData.roleName.trim().toLowerCase()) {
          return false;
        }
        return true;
      }
    }

    return false;
  };

  const employeeOptions = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    const seenValues = new Set<string>();

    // Add only employees who do not currently have a role assigned
    for (const emp of employees) {
      const val = emp.id.toString();
      if (!seenValues.has(val)) {
        if (!hasAssignedRole(val, emp)) {
          list.push({
            label: `${emp.fullName} (${emp.employeeCode || 'EMP' + val} • ${emp.department || 'General'})`,
            value: val,
          });
          seenValues.add(val);
        }
      }
    }

    // Add any standalone user who is not an employee and has no role assigned
    for (const u of users) {
      const val = u.employeeId?.toString() || u.id.toString();
      if (!seenValues.has(val)) {
        if (!hasAssignedRole(val, null)) {
          const uName = (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username) || u.email;
          list.push({
            label: `${uName} (${u.employeeCode || 'EMP#' + u.id} • ${u.designation || 'Staff'})`,
            value: val,
          });
          seenValues.add(val);
        }
      }
    }

    return list;
  }, [employees, users, allDesignations, selectedEmployeeIds, id, formData.roleName]);

  const availableUnassignedEmployees = useMemo(() => {
    return employeeOptions.filter(opt => !selectedEmployeeIds.includes(opt.value));
  }, [employeeOptions, selectedEmployeeIds]);

  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeDropdownSearch, setEmployeeDropdownSearch] = useState('');
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDropdownEmployees = useMemo(() => {
    if (!employeeDropdownSearch.trim()) return availableUnassignedEmployees;
    const q = employeeDropdownSearch.toLowerCase().trim();
    return availableUnassignedEmployees.filter(opt => opt.label.toLowerCase().includes(q));
  }, [availableUnassignedEmployees, employeeDropdownSearch]);

  const [employeeTableSearch, setEmployeeTableSearch] = useState('');
  const filteredAssignedEmployees = useMemo(() => {
    if (!employeeTableSearch.trim()) return selectedEmployeesList;
    const q = employeeTableSearch.toLowerCase().trim();
    return selectedEmployeesList.filter((e: any) => 
      e.fullName?.toLowerCase().includes(q) ||
      e.employeeCode?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.officialEmail?.toLowerCase().includes(q)
    );
  }, [selectedEmployeesList, employeeTableSearch]);

  return (
    <div className="w-full sm:p-6 pb-10 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => navigate(returnUrl || '/manage-access')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            title="Go Back"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isViewMode ? 'View Role' : id ? 'Edit Role' : 'Add Role'}
          </h1>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(returnUrl || '/manage-access')}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            Back
          </button>
          {isViewMode ? (
            <button
              type="button"
              onClick={() => navigate(`/manage-access/edit/${id}`, { state: { returnUrl: location.state?.returnUrl || '/manage-access' } })}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Pencil size={14} />
              <span>Edit Role</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-70 min-w-[80px] cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div className={isViewMode ? "" : "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full"}>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium text-sm">Loading role details...</p>
          </div>
        ) : isViewMode ? (
          <div className="space-y-8">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-inner flex-shrink-0">
                  <Shield size={48} className="text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-3xl font-bold mb-2">{formData.roleName || 'Unknown Role'}</h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-50 font-medium">
                    <div className="flex items-center gap-1.5">
                      {formData.isActive ? <CheckCircle2 size={18} className="text-green-300" /> : <CheckCircle2 size={18} className="text-gray-300" />}
                      <span>{formData.isActive ? 'Active Role' : 'Inactive Role'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/manage-access/edit/${id}`, { state: { returnUrl: location.state?.returnUrl || '/manage-access' } })}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer backdrop-blur-xs shrink-0"
              >
                <Pencil size={16} />
                <span>Edit Role</span>
              </button>
            </div>

            {/* Assigned Employees / Role Holders Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      Assigned Employees / Users
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedEmployeesList.length === 1 
                        ? '1 user currently assigned to this role' 
                        : `${selectedEmployeesList.length} users currently assigned to this role`}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200">
                  {selectedEmployeesList.length} Total
                </span>
              </div>

              {selectedEmployeesList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {selectedEmployeesList.map((emp: any) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all shadow-2xs"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                        {emp.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{emp.fullName}</p>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                          {emp.employeeCode && (
                            <span className="font-mono text-[11px] bg-gray-200/70 px-1 py-0.2 rounded text-gray-700">
                              {emp.employeeCode}
                            </span>
                          )}
                          <span>{emp.department || 'General'}</span>
                        </p>
                        {emp.officialEmail && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{emp.officialEmail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-400 text-sm italic">
                  No employees or users currently assigned to this role.
                </div>
              )}
            </div>

            {/* Permissions Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                <Shield size={20} className="text-emerald-500" />
                Module Permissions
              </h3>
              <div className="overflow-auto max-h-[calc(100vh-220px)] min-h-[380px] rounded-lg border border-gray-100 shadow-2xs relative">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20 shadow-xs">
                    <tr>
                      <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 px-6 py-4 text-sm font-bold text-gray-700">Module</th>
                      <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 px-6 py-4 text-sm font-bold text-gray-700 text-center">View</th>
                      <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 px-6 py-4 text-sm font-bold text-gray-700 text-center">Create</th>
                      <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 px-6 py-4 text-sm font-bold text-gray-700 text-center">Edit</th>
                      <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 px-6 py-4 text-sm font-bold text-gray-700 text-center">Delete</th>
                      <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 px-6 py-4 text-sm font-bold text-gray-700 text-center">Import</th>
                      <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 px-6 py-4 text-sm font-bold text-gray-700 text-center">Export</th>
                      <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 px-6 py-4 text-sm font-bold text-gray-700 text-center">Print</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {availableModules.map((mod) => (
                      <React.Fragment key={mod.id}>
                        <tr className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
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
                                    <ChevronDown className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                                <span className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{mod.name}</span>
                                {mod.id === 'assets' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
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

                        {/* Render Asset Hierarchy Sub-rows in View Mode */}
                        {mod.id === 'assets' && expandedModules['assets'] && (
                          visibleAssets.length === 0 ? (
                            <tr className="bg-emerald-50/10">
                              <td colSpan={8} className="px-8 py-3 text-xs text-gray-400 italic">
                                {flattenedAssets.length === 0 ? "No facilities or machines configured." : "All items collapsed."}
                              </td>
                            </tr>
                          ) : (
                            visibleAssets.map((asset) => {
                              const isCollapsed = !!collapsedAssetIds[asset.id];
                              return (
                                <tr key={asset.id} className="bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors">
                                  <td 
                                    className="py-3 text-sm"
                                    style={{ paddingLeft: `${32 + Math.min(asset.depth, 4) * 20}px` }}
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
                                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-emerald-200/60 text-emerald-700 transition-colors cursor-pointer shrink-0"
                                          title={isCollapsed ? "Expand subtree" : "Collapse subtree"}
                                        >
                                          {isCollapsed ? (
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      ) : (
                                        <span className="w-5 inline-block text-center text-emerald-400 font-mono text-base shrink-0">↳</span>
                                      )}
                                      {asset.type === 'mainFacility' ? (
                                        <div className="w-5 h-5 rounded bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0" title="Facility">
                                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                                        </div>
                                      ) : asset.type === 'facility' ? (
                                        <div className="w-5 h-5 rounded bg-teal-50 border border-teal-200/80 flex items-center justify-center shrink-0" title="Sub-facility">
                                          <Building className="w-3.5 h-3.5 text-teal-600" />
                                        </div>
                                      ) : (
                                        <div className="w-5 h-5 rounded bg-purple-50 border border-purple-200/80 flex items-center justify-center shrink-0" title="Machine">
                                          <Cpu className="w-3.5 h-3.5 text-purple-600" />
                                        </div>
                                      )}
                                      <span className={`text-sm font-semibold text-gray-800 ${asset.hasChildren ? 'group-hover:text-emerald-800' : ''}`}>
                                        {asset.name}
                                      </span>
                                    </div>
                                  </td>
                                  {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                                    <td key={action} className="px-6 py-3 text-center">
                                      {isActionAllowed(asset.id, action) ? (
                                        permissions[asset.id]?.[action] ? (
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
                              );
                            })
                          )
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Role Details</h3>
              <div className="flex items-center gap-3">
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
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 items-end mb-6">
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

              {!isViewMode && (
                <div className="relative" ref={employeeDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign Employee to Role
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                    className={`w-full px-4 py-2.5 text-sm bg-white border rounded-lg flex items-center justify-between text-left transition-all shadow-2xs cursor-pointer ${
                      isEmployeeDropdownOpen 
                        ? 'border-green-500 ring-2 ring-green-500/20' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-gray-400 font-normal truncate">
                      Select Employee
                    </span>
                    <ChevronDown size={16} className={`text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${isEmployeeDropdownOpen ? 'rotate-180 text-green-600' : ''}`} />
                  </button>

                  {isEmployeeDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      {availableUnassignedEmployees.length > 3 && (
                        <div className="p-2 border-b border-gray-100 bg-gray-50/70">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Filter employee..."
                              value={employeeDropdownSearch}
                              onChange={(e) => setEmployeeDropdownSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-800 placeholder-gray-400"
                              autoFocus
                            />
                          </div>
                        </div>
                      )}

                      <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                        {filteredDropdownEmployees.length > 0 ? (
                          filteredDropdownEmployees.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                if (!selectedEmployeeIds.includes(opt.value)) {
                                  setSelectedEmployeeIds((prev: string[]) => [...prev, opt.value]);
                                }
                                setIsEmployeeDropdownOpen(false);
                                setEmployeeDropdownSearch('');
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm text-gray-700 hover:bg-green-50/70 hover:text-green-900 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                  {opt.label.charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate font-medium">{opt.label}</span>
                              </div>
                              <Plus size={14} className="text-gray-300 group-hover:text-green-600 transition-colors shrink-0 ml-2" />
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-gray-400">
                            {availableUnassignedEmployees.length === 0 
                              ? 'All available employees are assigned' 
                              : 'No matching employees found'}
                          </div>
                        )}
                      </div>

                      {/* Add Employee Button at the bottom of the dropdown list */}
                      <div className="p-2 border-t border-gray-200 bg-gray-50/90">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEmployeeDropdownOpen(false);
                            handleAddNewEmployeeRedirect();
                          }}
                          className="w-full py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus size={14} />
                          <span>Add Employee</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Small Table: Employees assigned to this Role */}
            <div className="mb-8 bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-800">
                        Employees Assigned to {formData.roleName ? `"${formData.roleName}"` : 'Role'}
                      </h4>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        {selectedEmployeesList.length} Assigned
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Employees listed in this table hold the {formData.roleName || 'selected'} role
                    </p>
                  </div>
                </div>
              </div>

              {/* Search filter if more than 3 employees */}
              {selectedEmployeesList.length > 3 && (
                <div className="mb-2.5">
                  <div className="relative max-w-xs">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search assigned employees..."
                      value={employeeTableSearch}
                      onChange={(e) => setEmployeeTableSearch(e.target.value)}
                      className="w-full pl-7 pr-6 py-1 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-400"
                    />
                    {employeeTableSearch && (
                      <button
                        type="button"
                        onClick={() => setEmployeeTableSearch('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Small Table Component */}
              {selectedEmployeesList.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/90 text-gray-600 font-semibold uppercase tracking-wider border-b border-gray-200 text-[11px]">
                      <tr>
                        <th className="px-4 py-2.5">Employee Code</th>
                        <th className="px-4 py-2.5">Employee Name</th>
                        <th className="px-4 py-2.5">Department</th>
                        <th className="px-4 py-2.5">Role / Designation</th>
                        <th className="px-4 py-2.5">Email</th>
                        {!isViewMode && <th className="px-4 py-2.5 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredAssignedEmployees.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                              {emp.employeeCode || `EMP#${emp.id}`}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                                {emp.fullName?.charAt(0)?.toUpperCase() || 'E'}
                              </div>
                              <span className="font-semibold text-gray-800">{emp.fullName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                              {emp.department || 'Maintenance'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-600 font-medium">
                            {formData.roleName || emp.designation || 'Staff'}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                            {emp.officialEmail || '-'}
                          </td>
                          {!isViewMode && (
                            <td className="px-4 py-2.5 whitespace-nowrap text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedEmployeeIds((prev: string[]) => prev.filter((id: string) => id !== emp.id.toString()))}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors cursor-pointer border border-rose-200"
                                title={`Remove ${emp.fullName} from role`}
                              >
                                <Trash2 size={12} />
                                <span>Remove</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center bg-white rounded-lg border border-dashed border-gray-200 text-gray-500">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-700">No employees assigned to this role</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Select employees from the dropdown above to assign them to this role.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 my-8"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Module Permissions</h3>
                <p className="text-sm text-gray-500 mt-1">Select the actions this role can perform across modules.</p>
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

            <div className="overflow-auto max-h-[calc(100vh-220px)] min-h-[380px] rounded-lg border border-gray-200 bg-white shadow-2xs relative">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20 shadow-xs">
                  <tr>
                    <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider">Module</th>
                    <th className="sticky top-0 z-20 bg-gray-100 border-b border-r border-gray-200 px-3 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-28">
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
                    <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">View</th>
                    <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Create</th>
                    <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Edit</th>
                    <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Delete</th>
                    <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Import</th>
                    <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Export</th>
                    <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-2 py-3 text-xs font-bold text-gray-700 text-center uppercase tracking-wider w-16">Print</th>
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
                                  <ChevronDown className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <span className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{mod.name}</span>
                              {mod.id === 'assets' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
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

                        <td className="px-3 py-3 text-center border-r border-gray-200 bg-gray-50/30">
                          <input 
                            type="checkbox"
                            checked={isRowAllSelected(mod.id)}
                            onChange={(e) => handleSelectAllRow(mod.id, e.target.checked)}
                            disabled={isViewMode}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
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
                      </tr>


                      {/* Render Sub-module Tab Rows */}
                      {mod.subModules && expandedModules[mod.id] && mod.subModules.map((sub) => (
                        <tr key={sub.id} className="bg-blue-50/20 hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-2.5 text-sm pl-8">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-400 font-mono text-base">↳</span>
                              <span className="text-sm font-semibold text-gray-800">{sub.name}</span>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-center border-r border-gray-200 bg-blue-50/30">
                            <input 
                              type="checkbox"
                              checked={isRowAllSelected(sub.id)}
                              onChange={(e) => handleSelectAllRow(sub.id, e.target.checked)}
                              disabled={isViewMode}
                              className="w-4.5 h-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
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
                        </tr>
                      ))}

                      {/* Render Asset Hierarchy Sub-rows */}
                      {mod.id === 'assets' && expandedModules['assets'] && (
                        visibleAssets.length === 0 ? (
                          <tr className="bg-blue-50/10">
                            <td colSpan={9} className="px-8 py-3 text-xs text-gray-400 italic">
                              {flattenedAssets.length === 0 ? "No facilities or machines found. Create facilities and machines to set individual asset permissions." : "All items collapsed."}
                            </td>
                          </tr>
                        ) : (
                          visibleAssets.map((asset) => {
                            const isCollapsed = !!collapsedAssetIds[asset.id];
                            return (
                              <tr key={asset.id} className="bg-blue-50/20 hover:bg-blue-50/40 transition-colors">
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
                                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-blue-200/60 text-blue-700 transition-colors cursor-pointer shrink-0"
                                        title={isCollapsed ? "Expand subtree" : "Collapse subtree"}
                                      >
                                        {isCollapsed ? (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    ) : (
                                      <span className="w-5 inline-block text-center text-blue-400 font-mono text-base shrink-0">↳</span>
                                    )}
                                    {asset.type === 'mainFacility' ? (
                                      <div className="w-5 h-5 rounded bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0" title="Facility">
                                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                      </div>
                                    ) : asset.type === 'facility' ? (
                                      <div className="w-5 h-5 rounded bg-teal-50 border border-teal-200/80 flex items-center justify-center shrink-0" title="Sub-facility">
                                        <Building className="w-3.5 h-3.5 text-teal-600" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded bg-purple-50 border border-purple-200/80 flex items-center justify-center shrink-0" title="Machine">
                                        <Cpu className="w-3.5 h-3.5 text-purple-600" />
                                      </div>
                                    )}
                                    <span className={`text-sm font-semibold text-gray-800 ${asset.hasChildren ? 'group-hover:text-blue-800' : ''}`}>
                                      {asset.name}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-3 py-2.5 text-center border-r border-gray-200 bg-blue-50/30">
                                  <input 
                                    type="checkbox"
                                    checked={isRowAllSelected(asset.id)}
                                    onChange={(e) => handleSelectAllRow(asset.id, e.target.checked)}
                                    disabled={isViewMode}
                                    className="w-4.5 h-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>

                                {['view', 'create', 'edit', 'delete', 'import', 'export', 'print'].map(action => (
                                  <td key={action} className="px-2 py-2.5 text-center">
                                    {isActionAllowed(asset.id, action) ? (
                                      <input 
                                        type="checkbox"
                                        checked={permissions[asset.id]?.[action] || false}
                                        onChange={(e) => handlePermissionChange(asset.id, action, e.target.checked)}
                                        disabled={isViewMode}
                                        className="w-4.5 h-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                ))}
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


          </form>
        )}
      </div>
    </div>
  );
}
