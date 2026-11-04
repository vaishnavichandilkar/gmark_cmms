import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Pencil, 
  Eye, 
  Trash2, 
  Building2, 
  Search, 
  X, 
  Filter, 
  RotateCcw, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  TableProperties, 
  FolderTree, 
  RefreshCw,
  Cpu,
  Building,
  Layers,
  ArrowRight,
  FolderInput,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { DeleteConfirmModal } from '../../../components/shared/DeleteConfirmModal';
import { TablePagination } from '../../../components/shared/TablePagination';
import { TableSkeleton } from '../../../components/shared/ui/TableSkeleton';
import { TableActions, type FilterOption } from '../../../components/shared/TableActions';
import { exportData } from '../../../utils/exportUtils';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasPermission, hasAssetPermission } from '../../../utils/permissions';
import { AssetTree, type TreeNodeData } from '../../../components/4m/AssetTree';
import { AssetDetails } from '../../../components/4m/AssetDetails';
import { ColumnCustomizer, type ColumnDefinition } from '../../../components/shared/ColumnCustomizer';
import { GiveAccessModal } from '../../../components/4m/GiveAccessModal';

const FACILITY_COLUMNS: ColumnDefinition[] = [
  // General Details
  { id: 'facilityCode', label: 'Facility Code', category: 'General', required: true, defaultVisible: true },
  { id: 'facilityName', label: 'Facility Name', category: 'General', required: true, defaultVisible: true },
  { id: 'mainFacility', label: 'Facility', category: 'General', defaultVisible: true },
  { id: 'mainFacilityHead', label: 'Facility Head', category: 'General', defaultVisible: false },
  { id: 'category', label: 'Facility Category', category: 'General', defaultVisible: true },
  { id: 'subCategory', label: 'Facility Sub-Category', category: 'General', defaultVisible: false },
  { id: 'description', label: 'Facility Description', category: 'General', defaultVisible: false },
  { id: 'facilityHeadName', label: 'Facility Head Name', category: 'General', defaultVisible: false },
  { id: 'notes', label: 'Notes', category: 'General', defaultVisible: false },

  // Location Details
  { id: 'locationType', label: 'Location Relationship', category: 'Location', defaultVisible: false },
  { id: 'parentFacility', label: 'Parent Facility', category: 'Location', defaultVisible: false },
  { id: 'address', label: 'Address', category: 'Location', defaultVisible: false },
  { id: 'city', label: 'City', category: 'Location', defaultVisible: false },
  { id: 'state', label: 'State', category: 'Location', defaultVisible: false },
  { id: 'country', label: 'Country', category: 'Location', defaultVisible: false },
  { id: 'postalCode', label: 'Postal Code', category: 'Location', defaultVisible: false },

  // Geographic Coordinates
  { id: 'latitude', label: 'Latitude', category: 'Location', defaultVisible: false },
  { id: 'longitude', label: 'Longitude', category: 'Location', defaultVisible: false },

  // System
  { id: 'dateAdded', label: 'Date Added', category: 'System', defaultVisible: true },
  { id: 'action', label: 'Action', category: 'System', required: true, defaultVisible: true },
];

const DEFAULT_FACILITY_VISIBLE_COLUMNS = ['facilityCode', 'facilityName', 'mainFacility', 'category', 'dateAdded', 'action'];

export function FacilityManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const canCreate = hasPermission(user, 'facility_management', 'create');
  const canEdit = hasPermission(user, 'facility_management', 'edit');
  const canDelete = hasPermission(user, 'facility_management', 'delete');
  const canExport = hasPermission(user, 'facility_management', 'export');
  const canPrint = hasPermission(user, 'facility_management', 'print');

  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<any[]>([]);

  const permittedFacilities = useMemo(() => {
    return facilities.filter(f => hasAssetPermission(user, f, 'view'));
  }, [facilities, user]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Column Visibility Customization
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('facility_management_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validIds = FACILITY_COLUMNS.map(c => c.id);
          const filtered = parsed.filter(id => validIds.includes(id));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_FACILITY_VISIBLE_COLUMNS;
  });

  // View Switcher State: 'tree' vs 'table' (Hierarchy view first by default)
  const [activeView, setActiveView] = useState<'tree' | 'table'>('tree');
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [detailsNode, setDetailsNode] = useState<TreeNodeData | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ source: TreeNodeData; target: TreeNodeData } | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [giveAccessTarget, setGiveAccessTarget] = useState<{
    id: number;
    name: string;
    code?: string;
    category?: string;
  } | null>(null);
  
  // Column-wise Filters State
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState<{
    facilityCode: string;
    facilityName: string;
    mainFacility: string;
    mainFacilityHead: string;
    category: string;
    subCategory: string;
    description: string;
    locationType: string;
    parentFacility: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: string;
    longitude: string;
    facilityHeadName: string;
    notes: string;
    dateAdded: string;
  }>({
    facilityCode: '',
    facilityName: '',
    mainFacility: '',
    mainFacilityHead: '',
    category: '',
    subCategory: '',
    description: '',
    locationType: '',
    parentFacility: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    latitude: '',
    longitude: '',
    facilityHeadName: '',
    notes: '',
    dateAdded: '',
  });

  // Column Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, columnFilters]);

  useEffect(() => {
    fetchFacilities();
    fetchTreeData();
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

  const fetchTreeData = async () => {
    try {
      setTreeLoading(true);
      const [mainFacilitiesRes, facilitiesRes, machinesRes] = await Promise.all([
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
        api.get('/machines').catch(() => ({ data: [] })),
      ]);

      let mainFacilities = Array.isArray(mainFacilitiesRes.data) ? mainFacilitiesRes.data : [];
      let rawFacilities = Array.isArray(facilitiesRes.data) ? facilitiesRes.data : [];
      let rawMachines = Array.isArray(machinesRes.data) ? machinesRes.data : [];

      // Scoping by user access level if not SUPER_ADMIN
      if (user?.role !== 'SUPER_ADMIN') {
        const hasAssetPerms = user?.permissions?.some((p: any) => p.moduleId?.startsWith('asset_'));
        if (hasAssetPerms) {
          rawMachines = rawMachines.filter((m: any) => hasAssetPermission(user, m, 'view'));
          rawFacilities = rawFacilities.filter((f: any) => {
            return hasAssetPermission(user, f, 'view') ||
                   rawMachines.some((m: any) => m.facilityId === f.id);
          });
          mainFacilities = mainFacilities.filter((mf: any) => {
            return hasAssetPermission(user, mf, 'view') ||
                   rawFacilities.some((f: any) => f.mainFacilityId === mf.id) ||
                   rawMachines.some((m: any) => m.mainFacilityId === mf.id || m.company === String(mf.id) || m.company === mf.mainFacilityName);
          });
        } else if (user?.deviceId) {
          rawMachines = rawMachines.filter((m: any) => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
          rawFacilities = [];
          mainFacilities = [];
        } else if (user?.facilityId) {
          const targetFacilityId = Number(user.facilityId);
          const allowedIds = new Set<number>([targetFacilityId]);
          let added = true;
          while (added) {
            added = false;
            rawFacilities.forEach((f: any) => {
              if (f.parentFacilityId && allowedIds.has(Number(f.parentFacilityId)) && !allowedIds.has(Number(f.id))) {
                allowedIds.add(Number(f.id));
                added = true;
              }
            });
          }
          rawFacilities = rawFacilities.filter((f: any) => allowedIds.has(Number(f.id)));
          rawMachines = rawMachines.filter((m: any) => m.facilityId && allowedIds.has(Number(m.facilityId)));
          mainFacilities = [];
        } else if (user?.mainFacilityId) {
          mainFacilities = mainFacilities.filter((mf: any) => mf.id === user.mainFacilityId);
          rawFacilities = rawFacilities.filter((f: any) => f.mainFacilityId === user.mainFacilityId);
        }
      }

      // 1. Process machines
      const machineMap: Record<number, TreeNodeData> = {};
      rawMachines.forEach((mac: any) => {
        machineMap[mac.id] = {
          id: `mac-${mac.id}`,
          name: mac.name || mac.machineCode || mac.deviceId || 'Unknown Machine',
          type: 'device',
          originalData: mac,
          children: []
        };
      });

      const rootMachines: TreeNodeData[] = [];
      rawMachines.forEach((mac: any) => {
        const node = machineMap[mac.id];
        if (mac.parentMachineId && machineMap[mac.parentMachineId]) {
          machineMap[mac.parentMachineId].children!.push(node);
        } else {
          rootMachines.push(node);
        }
      });

      // 2. Main Facilities
      const mainFacNodes: TreeNodeData[] = mainFacilities.map((mf: any) => ({
        id: `mf-${mf.id}`,
        name: mf.mainFacilityName,
        type: 'mainFacility',
        originalData: mf,
        children: []
      }));

      // 3. Sub-Facilities
      const facMap: Record<number, TreeNodeData> = {};
      rawFacilities.forEach((fac: any) => {
        facMap[fac.id] = {
          id: `fac-${fac.id}`,
          name: fac.facilityName,
          type: 'facility',
          originalData: fac,
          children: []
        };
      });

      const finalTree: TreeNodeData[] = [];

      rawFacilities.forEach((fac: any) => {
        const node = facMap[fac.id];
        // Attach machines to sub-facility
        rootMachines.forEach((macNode) => {
          if (Number(macNode.originalData.facilityId) === Number(fac.id)) {
            node.children!.push(macNode);
          }
        });

        if (fac.parentFacilityId && facMap[fac.parentFacilityId]) {
          facMap[fac.parentFacilityId].children!.push(node);
        } else if (fac.mainFacilityId && mainFacNodes.length > 0) {
          const parentMf = mainFacNodes.find(mf => mf.originalData.id === fac.mainFacilityId);
          if (parentMf) {
            parentMf.children!.push(node);
          } else {
            finalTree.push(node);
          }
        } else {
          finalTree.push(node);
        }
      });

      // Attach direct Root Machines to Main Facilities (if machine has no sub-facility)
      mainFacNodes.forEach((mfNode) => {
        rootMachines.forEach((macNode) => {
          if (!macNode.originalData.facilityId && !macNode.originalData.buildingId) {
            const mfIdStr = String(mfNode.originalData.id);
            if (macNode.originalData.company === mfIdStr || macNode.originalData.company === mfNode.originalData.mainFacilityName) {
              if (!mfNode.children!.some(c => c.id === macNode.id)) {
                mfNode.children!.push(macNode);
              }
            }
          }
        });
      });

      finalTree.push(...mainFacNodes);

      if (user?.deviceId || (rawFacilities.length === 0 && mainFacilities.length === 0)) {
        rootMachines.forEach((macNode) => {
          if (!finalTree.some(t => t.id === macNode.id)) {
            finalTree.push(macNode);
          }
        });
      }

      // Sort alphabetically
      const sortTree = (nodes: TreeNodeData[]) => {
        nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            sortTree(node.children);
          }
        });
      };
      sortTree(finalTree);

      setTreeData(finalTree);
    } catch (err) {
      console.error('Failed to load tree data', err);
    } finally {
      setTreeLoading(false);
    }
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    const { source, target } = pendingMove;

    try {
      setIsMoving(true);

      // 1. Moving Machine / Device
      if (source.type === 'device') {
        const machineId = source.originalData.id;
        let targetType: 'facility' | 'mainFacility' | 'building' | 'society' | 'machine' | 'device';
        const targetId = target.originalData.id;

        if (target.type === 'facility') {
          targetType = 'facility';
        } else if (target.type === 'mainFacility') {
          targetType = 'mainFacility';
        } else if (target.type === 'building') {
          targetType = 'building';
        } else if (target.type === 'society') {
          targetType = 'society';
        } else if (target.type === 'device') {
          targetType = 'machine';
        } else {
          toast.error('Invalid destination for machine');
          setIsMoving(false);
          return;
        }

        await api.patch(`/machines/${machineId}/move`, { targetType, targetId });
        toast.success(`Successfully moved "${source.name}" to "${target.name}" with all details intact!`);
      } 
      // 2. Moving Facility
      else if (source.type === 'facility') {
        const facilityId = source.originalData.id;
        let targetType: 'mainFacility' | 'facility';
        const targetId = target.originalData.id;

        if (target.type === 'mainFacility') {
          targetType = 'mainFacility';
        } else if (target.type === 'facility') {
          targetType = 'facility';
        } else {
          toast.error('Invalid destination for facility');
          setIsMoving(false);
          return;
        }

        await api.patch(`/facilities/${facilityId}/move`, { targetType, targetId });
        toast.success(`Successfully moved "${source.name}" to "${target.name}"`);
      } 
      // 3. Moving Building
      else if (source.type === 'building') {
        const buildingId = source.originalData.id;
        const targetType = target.type === 'mainFacility' ? 'mainFacility' : 'society';
        const targetId = target.originalData.id;
        await api.patch(`/buildings/${buildingId}/move`, { targetType, targetId });
        toast.success(`Successfully moved "${source.name}" to "${target.name}"`);
      }

      setPendingMove(null);
      await fetchTreeData();
      await fetchFacilities();
    } catch (error: any) {
      console.error('Error moving asset:', error);
      const msg = error.response?.data?.message || 'Failed to move asset. Please try again.';
      toast.error(msg);
    } finally {
      setIsMoving(false);
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
      toast.error('Failed to delete facility. It might be linked to other records.');
    }
  };

  // Extract unique options for dropdown filters
  const uniqueMainFacilities = useMemo(() => {
    const names = new Set<string>();
    permittedFacilities.forEach(f => {
      const name = f.mainFacility?.mainFacilityName;
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [permittedFacilities]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    permittedFacilities.forEach(f => {
      if (f.category) cats.add(f.category);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [permittedFacilities]);

  const uniqueSubCategories = useMemo(() => {
    const subCats = new Set<string>();
    permittedFacilities.forEach(f => {
      if (f.subCategory) subCats.add(f.subCategory);
    });
    return Array.from(subCats).sort((a, b) => a.localeCompare(b));
  }, [permittedFacilities]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    permittedFacilities.forEach(f => {
      if (f.city) cities.add(f.city);
    });
    return Array.from(cities).sort((a, b) => a.localeCompare(b));
  }, [permittedFacilities]);

  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    permittedFacilities.forEach(f => {
      if (f.state) states.add(f.state);
    });
    return Array.from(states).sort((a, b) => a.localeCompare(b));
  }, [permittedFacilities]);


  // Dynamic Filters for Customize Filters modal
  const filterOptions: FilterOption[] = useMemo(() => [
    ...(uniqueMainFacilities.length > 0 ? [{
      key: 'mainFacility',
      label: 'Main Facility',
      options: uniqueMainFacilities
    }] : []),
    ...(uniqueCategories.length > 0 ? [{
      key: 'category',
      label: 'Category',
      options: uniqueCategories
    }] : []),
    ...(uniqueSubCategories.length > 0 ? [{
      key: 'subCategory',
      label: 'Sub Category',
      options: uniqueSubCategories
    }] : []),
    ...(uniqueCities.length > 0 ? [{
      key: 'city',
      label: 'City',
      options: uniqueCities
    }] : []),
    ...(uniqueStates.length > 0 ? [{
      key: 'state',
      label: 'State',
      options: uniqueStates
    }] : []),
  ], [uniqueMainFacilities, uniqueCategories, uniqueSubCategories, uniqueCities, uniqueStates]);

  const handleColumnFilterChange = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      facilityCode: '',
      facilityName: '',
      mainFacility: '',
      mainFacilityHead: '',
      category: '',
      subCategory: '',
      description: '',
      locationType: '',
      parentFacility: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      latitude: '',
      longitude: '',
      facilityHeadName: '',
      notes: '',
      dateAdded: '',
    });
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => v.trim() !== '').length;
  }, [columnFilters]);

  const hasActiveColumnFilters = activeFilterCount > 0;

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  // Filtered and sorted facilities
  const filteredFacilities = useMemo(() => {
    return permittedFacilities.filter(facility => {
      // 1. Global Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (facility.facilityCode || '').toLowerCase();
        const name = (facility.facilityName || '').toLowerCase();
        const mainName = (facility.mainFacility?.mainFacilityName || '').toLowerCase();
        const mainHead = (facility.mainFacility?.mainFacilityHead || '').toLowerCase();
        const category = (facility.category || '').toLowerCase();
        const subCategory = (facility.subCategory || '').toLowerCase();
        const desc = (facility.description || '').toLowerCase();
        const parentName = (facility.parentFacility?.facilityName || '').toLowerCase();
        const address = (facility.address || '').toLowerCase();
        const city = (facility.city || '').toLowerCase();
        const state = (facility.state || '').toLowerCase();
        const country = (facility.country || '').toLowerCase();
        const postalCode = (facility.postalCode || '').toLowerCase();
        const headName = (facility.facilityHeadName || '').toLowerCase();
        const notes = (facility.notes || '').toLowerCase();

        const matchesGlobal = 
          code.includes(q) || 
          name.includes(q) || 
          mainName.includes(q) || 
          mainHead.includes(q) ||
          category.includes(q) ||
          subCategory.includes(q) ||
          desc.includes(q) ||
          parentName.includes(q) ||
          address.includes(q) ||
          city.includes(q) ||
          state.includes(q) ||
          country.includes(q) ||
          postalCode.includes(q) ||
          headName.includes(q) ||
          notes.includes(q);

        if (!matchesGlobal) return false;
      }

      // Active Filters (Customize Filters)
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        if (key === 'category' && (facility.category || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'subCategory' && (facility.subCategory || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'mainFacility' && (facility.mainFacility?.mainFacilityName || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'city' && (facility.city || '').toLowerCase() !== value.toLowerCase()) return false;
        if (key === 'state' && (facility.state || '').toLowerCase() !== value.toLowerCase()) return false;
      }

      // 2. Column-wise Filters
      if (columnFilters.facilityCode.trim() && !(facility.facilityCode || '').toLowerCase().includes(columnFilters.facilityCode.toLowerCase().trim())) return false;
      if (columnFilters.facilityName.trim() && !(facility.facilityName || '').toLowerCase().includes(columnFilters.facilityName.toLowerCase().trim())) return false;
      if (columnFilters.mainFacility.trim() && (facility.mainFacility?.mainFacilityName || '').toLowerCase() !== columnFilters.mainFacility.toLowerCase().trim()) return false;
      if (columnFilters.mainFacilityHead.trim() && !(facility.mainFacility?.mainFacilityHead || '').toLowerCase().includes(columnFilters.mainFacilityHead.toLowerCase().trim())) return false;
      if (columnFilters.category.trim() && (facility.category || '').toLowerCase() !== columnFilters.category.toLowerCase().trim()) return false;
      if (columnFilters.subCategory.trim() && (facility.subCategory || '').toLowerCase() !== columnFilters.subCategory.toLowerCase().trim()) return false;
      if (columnFilters.description.trim() && !(facility.description || '').toLowerCase().includes(columnFilters.description.toLowerCase().trim())) return false;
      if (columnFilters.locationType.trim()) {
        const typeStr = facility.isLocationPart ? 'part' : 'standalone';
        if (!typeStr.includes(columnFilters.locationType.toLowerCase().trim())) return false;
      }
      if (columnFilters.parentFacility.trim() && !(facility.parentFacility?.facilityName || '').toLowerCase().includes(columnFilters.parentFacility.toLowerCase().trim())) return false;
      if (columnFilters.address.trim() && !(facility.address || '').toLowerCase().includes(columnFilters.address.toLowerCase().trim())) return false;
      if (columnFilters.city.trim() && !(facility.city || '').toLowerCase().includes(columnFilters.city.toLowerCase().trim())) return false;
      if (columnFilters.state.trim() && !(facility.state || '').toLowerCase().includes(columnFilters.state.toLowerCase().trim())) return false;
      if (columnFilters.country.trim() && !(facility.country || '').toLowerCase().includes(columnFilters.country.toLowerCase().trim())) return false;
      if (columnFilters.postalCode.trim() && !(facility.postalCode || '').toLowerCase().includes(columnFilters.postalCode.toLowerCase().trim())) return false;
      if (columnFilters.latitude.trim() && !(facility.latitude || '').toLowerCase().includes(columnFilters.latitude.toLowerCase().trim())) return false;
      if (columnFilters.longitude.trim() && !(facility.longitude || '').toLowerCase().includes(columnFilters.longitude.toLowerCase().trim())) return false;
      if (columnFilters.facilityHeadName.trim() && !(facility.facilityHeadName || '').toLowerCase().includes(columnFilters.facilityHeadName.toLowerCase().trim())) return false;
      if (columnFilters.notes.trim() && !(facility.notes || '').toLowerCase().includes(columnFilters.notes.toLowerCase().trim())) return false;
      if (columnFilters.dateAdded.trim()) {
        const formattedDate = facility.createdAt 
          ? new Date(facility.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') 
          : '';
        if (!formattedDate.toLowerCase().includes(columnFilters.dateAdded.toLowerCase().trim())) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      let valA = '';
      let valB = '';
      const key = sortConfig.key;

      if (key === 'facilityCode') { valA = a.facilityCode || ''; valB = b.facilityCode || ''; }
      else if (key === 'facilityName') { valA = a.facilityName || ''; valB = b.facilityName || ''; }
      else if (key === 'mainFacility') { valA = a.mainFacility?.mainFacilityName || ''; valB = b.mainFacility?.mainFacilityName || ''; }
      else if (key === 'mainFacilityHead') { valA = a.mainFacility?.mainFacilityHead || ''; valB = b.mainFacility?.mainFacilityHead || ''; }
      else if (key === 'category') { valA = a.category || ''; valB = b.category || ''; }
      else if (key === 'subCategory') { valA = a.subCategory || ''; valB = b.subCategory || ''; }
      else if (key === 'description') { valA = a.description || ''; valB = b.description || ''; }
      else if (key === 'locationType') { valA = a.isLocationPart ? '1' : '0'; valB = b.isLocationPart ? '1' : '0'; }
      else if (key === 'parentFacility') { valA = a.parentFacility?.facilityName || ''; valB = b.parentFacility?.facilityName || ''; }
      else if (key === 'address') { valA = a.address || ''; valB = b.address || ''; }
      else if (key === 'city') { valA = a.city || ''; valB = b.city || ''; }
      else if (key === 'state') { valA = a.state || ''; valB = b.state || ''; }
      else if (key === 'country') { valA = a.country || ''; valB = b.country || ''; }
      else if (key === 'postalCode') { valA = a.postalCode || ''; valB = b.postalCode || ''; }
      else if (key === 'latitude') { valA = a.latitude || ''; valB = b.latitude || ''; }
      else if (key === 'longitude') { valA = a.longitude || ''; valB = b.longitude || ''; }
      else if (key === 'facilityHeadName') { valA = a.facilityHeadName || ''; valB = b.facilityHeadName || ''; }
      else if (key === 'notes') { valA = a.notes || ''; valB = b.notes || ''; }
      else if (key === 'dateAdded') { valA = a.createdAt || ''; valB = b.createdAt || ''; }

      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [facilities, searchQuery, columnFilters, sortConfig]);

  const totalItems = filteredFacilities.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const currentFacilities = filteredFacilities.slice(startIndex, endIndex);

  const handleExport = (format: 'pdf' | 'excel') => {
    const exportableColumns = FACILITY_COLUMNS.filter(c => c.id !== 'action' && visibleColumns.includes(c.id));
    const headers = exportableColumns.map(c => c.label);
    const rows = filteredFacilities.map(facility => exportableColumns.map(col => {
      switch (col.id) {
        case 'facilityCode': return facility.facilityCode || '-';
        case 'facilityName': return facility.facilityName || '-';
        case 'mainFacility': return facility.mainFacility?.mainFacilityName || '-';
        case 'mainFacilityHead': return facility.mainFacility?.mainFacilityHead || '-';
        case 'category': return facility.category || '-';
        case 'subCategory': return facility.subCategory || '-';
        case 'description': return facility.description || '-';
        case 'locationType': return facility.isLocationPart ? 'Part of Facility' : 'Direct / Standalone';
        case 'parentFacility': return facility.parentFacility?.facilityName || '-';
        case 'address': return facility.address || '-';
        case 'city': return facility.city || '-';
        case 'state': return facility.state || '-';
        case 'country': return facility.country || 'India';
        case 'postalCode': return facility.postalCode || '-';
        case 'latitude': return facility.latitude || '-';
        case 'longitude': return facility.longitude || '-';
        case 'facilityHeadName': return facility.facilityHeadName || '-';
        case 'notes': return facility.notes || '-';
        case 'dateAdded': return facility.createdAt ? new Date(facility.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-';
        default: return '';
      }
    }));
    exportData(headers, rows, 'Facility_List', 'Facility Management List', format);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sm:p-2 md:p-4 bg-white min-h-screen">
      {/* Header Section (Tree View Only - Table View uses unified TableActions) */}
      {activeView === 'tree' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 print:hidden">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Facility Management</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage facilities, sub-facilities, and infrastructure hierarchy</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {/* Segmented View Switcher */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-2xs h-9">
              <button
                type="button"
                id="btn-hierarchy-tree-view"
                onClick={() => {
                  setActiveView('tree');
                  if (treeData.length === 0) {
                    fetchTreeData();
                  }
                }}
                className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer bg-white text-emerald-700 shadow-xs border border-gray-200/80 font-bold"
              >
                <FolderTree className="w-3 h-3" />
                <span>Hierarchy Tree View</span>
              </button>
              <button
                type="button"
                id="btn-table-view"
                onClick={() => setActiveView('table')}
                className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-gray-600 hover:text-gray-900"
              >
                <TableProperties className="w-3 h-3" />
                <span>Table View</span>
              </button>
            </div>

            <button 
              type="button"
              onClick={() => navigate('/master/main-facility')}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Facility Master</span>
            </button>
            {canCreate && (
              <button 
                onClick={() => navigate('/master/facility/new')}
                className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#00a651] hover:bg-[#009040] active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Facility</span>
              </button>
            )}
          </div>
        </div>
      )}

      {activeView === 'tree' ? (
        /* Hierarchy Tree View (Same like All Assets) */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[620px]">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">Facility & Asset Hierarchy</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {treeData.length} Root {treeData.length === 1 ? 'Node' : 'Nodes'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Unified hierarchical view (Facility → Sub-facility → Machine) • Click any node to inspect full details
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Drag &amp; Drop Reassignment Active
              </span>
              <button
                type="button"
                onClick={fetchTreeData}
                disabled={treeLoading}
                className="flex items-center gap-1 h-6 px-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-gray-200 rounded-md transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={11} className={treeLoading ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
                <span>{treeLoading ? 'Refreshing...' : 'Refresh Tree'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {treeLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-4 h-4 bg-gray-200 rounded shrink-0" />
                    <div className={`h-4 bg-gray-200 rounded ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
                  </div>
                ))}
              </div>
            ) : treeData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <FolderTree className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-base font-semibold text-gray-900 mb-1">No Hierarchy Nodes Found</p>
                <p className="text-sm text-gray-500 max-w-sm">
                  Add facilities and machines to populate the unified asset hierarchy tree.
                </p>
              </div>
            ) : (
              <AssetTree 
                data={treeData} 
                onSelect={(node) => {
                  setSelectedNode(node);
                  setDetailsNode(node);
                }} 
                onDoubleClick={(node) => {
                  setDetailsNode(node);
                }}
                selectedId={selectedNode?.id || null} 
                defaultExpanded={true}
                enableDragAndDrop={true}
                onDropNode={(source, target) => {
                  setPendingMove({ source, target });
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Search & Actions Bar - Unified in ONE Row */}
          <TableActions
            title="Facility Management"
            subtitle="Manage facilities, sub-facilities, and infrastructure hierarchy"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search facilities..."
            onExport={canExport ? handleExport : undefined}
            onPrint={canPrint ? handlePrint : undefined}
            columnCustomizer={
              <ColumnCustomizer
                columns={FACILITY_COLUMNS}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
                storageKey="facility_management_table_columns"
              />
            }
            hasActiveColumnFilters={hasActiveColumnFilters}
            onResetColumnFilters={clearAllColumnFilters}
            activeColumnFilterCount={activeFilterCount}
            filterOptions={filterOptions}
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
            extraActions={
              <div className="flex items-center gap-1.5">
                {/* Segmented View Switcher */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-2xs h-9">
                  <button
                    type="button"
                    id="btn-hierarchy-tree-view"
                    onClick={() => {
                      setActiveView('tree');
                      if (treeData.length === 0) {
                        fetchTreeData();
                      }
                    }}
                    className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-gray-600 hover:text-gray-900"
                  >
                    <FolderTree className="w-3 h-3" />
                    <span>Hierarchy Tree View</span>
                  </button>
                  <button
                    type="button"
                    id="btn-table-view"
                    onClick={() => setActiveView('table')}
                    className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer bg-white text-gray-900 shadow-xs border border-gray-200/80 font-bold"
                  >
                    <TableProperties className="w-3 h-3" />
                    <span>Table View</span>
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => navigate('/master/main-facility')}
                  className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Facility Master</span>
                </button>
              </div>
            }
            actionButton={
              canCreate && (
                <button
                  onClick={() => navigate('/master/facility/new')}
                  className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#00a651] hover:bg-[#009040] active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Facility</span>
                </button>
              )
            }
          />

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/70 text-gray-700 font-semibold text-xs border-b border-gray-200 whitespace-nowrap">
              {/* Column Title Row - Tapping main columns toggles filter row */}
              <tr 
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="cursor-pointer select-none hover:bg-gray-100/60 transition-colors whitespace-nowrap"
                title={showColumnFilters ? "Click column header to hide filters" : "Click column header to show filters"}
              >
                {visibleColumns.includes('facilityCode') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility Code</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('facilityCode');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility Code"
                      >
                        {sortConfig?.key === 'facilityCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('facilityName') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility Name</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('facilityName');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility Name"
                      >
                        {sortConfig?.key === 'facilityName' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('mainFacility') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('mainFacility');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility"
                      >
                        {sortConfig?.key === 'mainFacility' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('mainFacilityHead') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility Head</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('mainFacilityHead');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility Head"
                      >
                        {sortConfig?.key === 'mainFacilityHead' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('category') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('category');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Category"
                      >
                        {sortConfig?.key === 'category' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('subCategory') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Sub-Category</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('subCategory');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Sub-Category"
                      >
                        {sortConfig?.key === 'subCategory' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('description') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Description</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('description');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Description"
                      >
                        {sortConfig?.key === 'description' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('facilityHeadName') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Facility Head Name</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('facilityHeadName');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Facility Head Name"
                      >
                        {sortConfig?.key === 'facilityHeadName' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('notes') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Notes</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('notes');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Notes"
                      >
                        {sortConfig?.key === 'notes' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('locationType') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Location Type</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('locationType');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Location Type"
                      >
                        {sortConfig?.key === 'locationType' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('parentFacility') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Parent Facility</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('parentFacility');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Parent Facility"
                      >
                        {sortConfig?.key === 'parentFacility' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('address') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Address</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('address');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Address"
                      >
                        {sortConfig?.key === 'address' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('city') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>City</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('city');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by City"
                      >
                        {sortConfig?.key === 'city' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('state') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>State</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('state');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by State"
                      >
                        {sortConfig?.key === 'state' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('country') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Country</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('country');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Country"
                      >
                        {sortConfig?.key === 'country' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('postalCode') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Postal Code</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('postalCode');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Postal Code"
                      >
                        {sortConfig?.key === 'postalCode' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('latitude') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Latitude</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('latitude');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Latitude"
                      >
                        {sortConfig?.key === 'latitude' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('longitude') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Longitude</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('longitude');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Longitude"
                      >
                        {sortConfig?.key === 'longitude' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('dateAdded') && (
                  <th className="px-3 py-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Date Added</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort('dateAdded');
                        }}
                        className="p-0.5 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Sort by Date Added"
                      >
                        {sortConfig?.key === 'dateAdded' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-emerald-600" /> : <ArrowDown size={13} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={12} className="text-gray-400 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                )}

                {visibleColumns.includes('action') && (
                  <th className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Action</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowColumnFilters(!showColumnFilters);
                        }}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                          showColumnFilters 
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                        title={showColumnFilters ? 'Click to hide column filters' : 'Click to show column filters'}
                      >
                        <Filter size={10} className={hasActiveColumnFilters ? 'text-blue-600' : 'text-gray-500'} />
                        <span>{showColumnFilters ? 'Hide' : 'Filter'}</span>
                      </button>
                    </div>
                  </th>
                )}
              </tr>

              {/* Column-wise Filter Inputs Row */}
              {showColumnFilters && (
                <tr className="bg-slate-50/95 border-t border-gray-200 font-normal">
                  {/* Filter: Facility Code */}
                  {visibleColumns.includes('facilityCode') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter code..."
                          value={columnFilters.facilityCode}
                          onChange={(e) => handleColumnFilterChange('facilityCode', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.facilityCode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('facilityCode', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Facility Name */}
                  {visibleColumns.includes('facilityName') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter name..."
                          value={columnFilters.facilityName}
                          onChange={(e) => handleColumnFilterChange('facilityName', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.facilityName && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('facilityName', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Facility (Main Facility) */}
                  {visibleColumns.includes('mainFacility') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.mainFacility}
                          onChange={(e) => handleColumnFilterChange('mainFacility', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 shadow-2xs cursor-pointer font-normal"
                        >
                          <option value="">All Facilities</option>
                          {uniqueMainFacilities.map((mfName) => (
                            <option key={mfName} value={mfName}>{mfName}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Filter: Main Facility Head */}
                  {visibleColumns.includes('mainFacilityHead') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter head..."
                          value={columnFilters.mainFacilityHead}
                          onChange={(e) => handleColumnFilterChange('mainFacilityHead', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.mainFacilityHead && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('mainFacilityHead', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Category */}
                  {visibleColumns.includes('category') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.category}
                          onChange={(e) => handleColumnFilterChange('category', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 shadow-2xs cursor-pointer font-normal"
                        >
                          <option value="">All Categories</option>
                          {uniqueCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Filter: Sub-Category */}
                  {visibleColumns.includes('subCategory') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.subCategory}
                          onChange={(e) => handleColumnFilterChange('subCategory', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 shadow-2xs cursor-pointer font-normal"
                        >
                          <option value="">All Sub-Categories</option>
                          {uniqueSubCategories.map((subCat) => (
                            <option key={subCat} value={subCat}>{subCat}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Filter: Description */}
                  {visibleColumns.includes('description') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter desc..."
                          value={columnFilters.description}
                          onChange={(e) => handleColumnFilterChange('description', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.description && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('description', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Facility Head Name */}
                  {visibleColumns.includes('facilityHeadName') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter head name..."
                          value={columnFilters.facilityHeadName}
                          onChange={(e) => handleColumnFilterChange('facilityHeadName', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.facilityHeadName && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('facilityHeadName', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Notes */}
                  {visibleColumns.includes('notes') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter notes..."
                          value={columnFilters.notes}
                          onChange={(e) => handleColumnFilterChange('notes', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.notes && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('notes', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Location Type */}
                  {visibleColumns.includes('locationType') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.locationType}
                          onChange={(e) => handleColumnFilterChange('locationType', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 shadow-2xs cursor-pointer font-normal"
                        >
                          <option value="">All Types</option>
                          <option value="part">Part of Location</option>
                          <option value="standalone">Standalone</option>
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Filter: Parent Facility */}
                  {visibleColumns.includes('parentFacility') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter parent..."
                          value={columnFilters.parentFacility}
                          onChange={(e) => handleColumnFilterChange('parentFacility', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.parentFacility && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('parentFacility', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Address */}
                  {visibleColumns.includes('address') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter address..."
                          value={columnFilters.address}
                          onChange={(e) => handleColumnFilterChange('address', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.address && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('address', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: City */}
                  {visibleColumns.includes('city') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.city}
                          onChange={(e) => handleColumnFilterChange('city', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 shadow-2xs cursor-pointer font-normal"
                        >
                          <option value="">All Cities</option>
                          {uniqueCities.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Filter: State */}
                  {visibleColumns.includes('state') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <select
                          value={columnFilters.state}
                          onChange={(e) => handleColumnFilterChange('state', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 shadow-2xs cursor-pointer font-normal"
                        >
                          <option value="">All States</option>
                          {uniqueStates.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  )}

                  {/* Filter: Country */}
                  {visibleColumns.includes('country') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter country..."
                          value={columnFilters.country}
                          onChange={(e) => handleColumnFilterChange('country', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.country && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('country', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Postal Code */}
                  {visibleColumns.includes('postalCode') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter postal..."
                          value={columnFilters.postalCode}
                          onChange={(e) => handleColumnFilterChange('postalCode', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.postalCode && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('postalCode', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Latitude */}
                  {visibleColumns.includes('latitude') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter lat..."
                          value={columnFilters.latitude}
                          onChange={(e) => handleColumnFilterChange('latitude', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.latitude && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('latitude', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Longitude */}
                  {visibleColumns.includes('longitude') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter lon..."
                          value={columnFilters.longitude}
                          onChange={(e) => handleColumnFilterChange('longitude', e.target.value)}
                          className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.longitude && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('longitude', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Filter: Date Added */}
                  {visibleColumns.includes('dateAdded') && (
                    <th className="px-3 py-2 font-normal">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filter date..."
                          value={columnFilters.dateAdded}
                          onChange={(e) => handleColumnFilterChange('dateAdded', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800 shadow-2xs font-normal"
                        />
                        {columnFilters.dateAdded && (
                          <button
                            type="button"
                            onClick={() => handleColumnFilterChange('dateAdded', '')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  )}

                  {/* Action Column: Reset */}
                  {visibleColumns.includes('action') && (
                    <th className="px-6 py-2 text-right font-normal">
                      {hasActiveColumnFilters ? (
                        <button
                          type="button"
                          onClick={clearAllColumnFilters}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                          title="Clear all column filters"
                        >
                          <X size={11} />
                          <span>Clear</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">No filters</span>
                      )}
                    </th>
                  )}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton columns={visibleColumns.length} rows={5} />
              ) : currentFacilities.length > 0 ? (
                currentFacilities.map((facility, index) => (
                  <tr 
                    key={facility.id || index} 
                    onClick={() => {
                      const canEditFacility = canEdit && hasAssetPermission(user, facility, 'edit');
                      const canViewFacility = hasAssetPermission(user, facility, 'view');
                      if (canEditFacility || canViewFacility) {
                        navigate(canEditFacility ? `/master/facility/edit/${facility.id}` : `/master/facility/view/${facility.id}`);
                      }
                    }}
                    className={`hover:bg-gray-50/50 transition-colors group ${((canEdit && hasAssetPermission(user, facility, 'edit')) || hasAssetPermission(user, facility, 'view')) ? 'cursor-pointer' : ''}`}
                  >
                    {/* Facility Code */}
                    {visibleColumns.includes('facilityCode') && (
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                        {facility.facilityCode}
                      </td>
                    )}

                    {/* Facility Name */}
                    {visibleColumns.includes('facilityName') && (
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800">
                        {facility.facilityName}
                      </td>
                    )}

                    {/* Facility (Main Facility) */}
                    {visibleColumns.includes('mainFacility') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {facility.mainFacility?.mainFacilityName || '-'}
                      </td>
                    )}

                    {/* Facility Head */}
                    {visibleColumns.includes('mainFacilityHead') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {facility.mainFacility?.mainFacilityHead || '-'}
                      </td>
                    )}

                    {/* Category */}
                    {visibleColumns.includes('category') && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {facility.category || '-'}
                        </span>
                      </td>
                    )}

                    {/* Sub-Category */}
                    {visibleColumns.includes('subCategory') && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        {facility.subCategory ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {facility.subCategory}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}

                    {/* Description */}
                    {visibleColumns.includes('description') && (
                      <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={facility.description || ''}>
                        {facility.description || '-'}
                      </td>
                    )}

                    {/* Facility Head Name */}
                    {visibleColumns.includes('facilityHeadName') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                        {facility.facilityHeadName || '-'}
                      </td>
                    )}

                    {/* Notes */}
                    {visibleColumns.includes('notes') && (
                      <td className="px-3 py-2 text-gray-500 max-w-xs truncate" title={facility.notes || ''}>
                        {facility.notes || '-'}
                      </td>
                    )}

                    {/* Location Relationship */}
                    {visibleColumns.includes('locationType') && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          facility.isLocationPart 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {facility.isLocationPart ? 'Part of Location' : 'Standalone'}
                        </span>
                      </td>
                    )}

                    {/* Parent Facility */}
                    {visibleColumns.includes('parentFacility') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {facility.parentFacility?.facilityName || '-'}
                      </td>
                    )}

                    {/* Address */}
                    {visibleColumns.includes('address') && (
                      <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={facility.address || ''}>
                        {facility.address || '-'}
                      </td>
                    )}

                    {/* City */}
                    {visibleColumns.includes('city') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {facility.city || '-'}
                      </td>
                    )}

                    {/* State */}
                    {visibleColumns.includes('state') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {facility.state || '-'}
                      </td>
                    )}

                    {/* Country */}
                    {visibleColumns.includes('country') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {facility.country || '-'}
                      </td>
                    )}

                    {/* Postal Code */}
                    {visibleColumns.includes('postalCode') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {facility.postalCode || '-'}
                      </td>
                    )}

                    {/* Latitude */}
                    {visibleColumns.includes('latitude') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                        {facility.latitude || '-'}
                      </td>
                    )}

                    {/* Longitude */}
                    {visibleColumns.includes('longitude') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                        {facility.longitude || '-'}
                      </td>
                    )}

                    {/* Date Added */}
                    {visibleColumns.includes('dateAdded') && (
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {facility.createdAt ? new Date(facility.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                      </td>
                    )}

                    {/* Action */}
                    {visibleColumns.includes('action') && (
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasAssetPermission(user, facility, 'view') && (!canEdit || !hasAssetPermission(user, facility, 'edit')) && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/master/facility/view/${facility.id}`); }}
                              className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setGiveAccessTarget({
                                id: facility.id,
                                name: facility.facilityName,
                                code: facility.facilityCode,
                                category: facility.category,
                              });
                            }}
                            className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer" 
                            title="Give Access / Assign Users"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          {canEdit && hasAssetPermission(user, facility, 'edit') && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/master/facility/edit/${facility.id}`); }}
                              className="text-gray-400 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors" title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && hasAssetPermission(user, facility, 'delete') && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); confirmDelete(facility.id); }}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        {hasActiveColumnFilters || searchQuery ? 'No matching facilities found' : 'No facilities found'}
                      </p>
                      <p className="text-sm text-gray-500 max-w-sm">
                        {hasActiveColumnFilters || searchQuery 
                          ? 'Try adjusting or clearing your column filters or search term to see more results.'
                          : 'Get started by adding a new facility to the system.'}
                      </p>
                      {(hasActiveColumnFilters || searchQuery) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            clearAllColumnFilters();
                          }}
                          className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <RotateCcw size={12} />
                          <span>Clear All Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
        />
      </div>
    </>
  )}

  {/* Asset Details Modal (matching All Assets) */}
  {detailsNode && (
    <div 
      className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => setDetailsNode(null)}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button"
          onClick={() => setDetailsNode(null)}
          className="absolute top-4 right-4 z-50 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors shadow-xs cursor-pointer"
          title="Close details"
        >
          <X size={18} className="text-gray-700" />
        </button>
        <div className="flex-1 overflow-hidden">
          <AssetDetails node={detailsNode} />
        </div>
      </div>
    </div>
  )}

  {/* Move Confirmation Modal */}
  {pendingMove && (
    <div 
      className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => !isMoving && setPendingMove(null)}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Confirm Asset Reassignment</h3>
              <p className="text-xs text-gray-500">Move asset to a new location in the hierarchy</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => !isMoving && setPendingMove(null)}
            disabled={isMoving}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
            {/* Source Item */}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Moving {pendingMove.source.type === 'device' ? 'Machine' : pendingMove.source.type === 'facility' ? 'Facility' : 'Asset'}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  {pendingMove.source.type === 'device' ? (
                    <Cpu className="w-3.5 h-3.5 text-orange-600" />
                  ) : (
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                  )}
                </div>
                <span className="text-sm font-bold text-gray-900 truncate">
                  {pendingMove.source.name}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 text-gray-500">
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </div>

            {/* Target Item */}
            <div className="flex-1 min-w-0 text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Destination
              </span>
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-bold text-gray-900 truncate">
                  {pendingMove.target.name}
                </span>
                <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  {pendingMove.target.type === 'mainFacility' ? (
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informational Callouts */}
          {pendingMove.source.type === 'facility' && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Moving this facility will automatically reassign all child facilities and machines contained within it to the target destination.
              </p>
            </div>
          )}

          {pendingMove.source.type === 'device' && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900 mb-0.5">All Machine Details Will Be Maintained</p>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Specifications, uploaded manuals, maintenance schedules, work orders, checkpoints, and IoT MAC ID telemetry bindings will be safely preserved under the new location.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setPendingMove(null)}
            disabled={isMoving}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmMove}
            disabled={isMoving}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-75 cursor-pointer"
          >
            {isMoving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Moving Asset...</span>
              </>
            ) : (
              <span>Confirm &amp; Move</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )}

  <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Facility"
        message="Are you sure you want to delete this facility? This action cannot be undone."
      />

      {giveAccessTarget && (
        <GiveAccessModal
          isOpen={!!giveAccessTarget}
          onClose={() => setGiveAccessTarget(null)}
          targetType="facility"
          targetId={giveAccessTarget.id}
          targetName={giveAccessTarget.name}
          targetCode={giveAccessTarget.code}
          targetCategory={giveAccessTarget.category}
          onSuccess={() => {
            fetchFacilities();
          }}
        />
      )}
    </div>
  );
}
