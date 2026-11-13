import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AssetTree, canDragNode, getAllExpandableIds } from '../../../components/4m/AssetTree';
import type { TreeNodeData } from '../../../components/4m/AssetTree';
import { AssetDetails } from '../../../components/4m/AssetDetails';
import { MoveAssetModal } from '../../../components/4m/MoveAssetModal';
import { GiveAccessModal } from '../../../components/4m/GiveAccessModal';
import { CreateAssetModal } from '../../../components/4m/CreateAssetModal';
import { api } from '../../../lib/api';
import { Skeleton } from '../../../components/shared/ui/Skeleton';
import { ImportAssetsModal } from '../../../components/4m/ImportAssetsModal';
import { exportData } from '../../../utils/exportUtils';
import {
  X,
  Search,
  ArrowRight,
  FolderInput,
  Loader2,
  AlertCircle,
  Building2,
  Building,
  Cpu,
  CheckCircle2,
  Plus,
  ChevronDown,
  ChevronRight,
  Filter,
  Check,
  Download,
  Upload,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { navigateToDeviceDashboard } from '../../../utils/deviceRoutes';
import { hasPermission, hasAssetPermission } from '../../../utils/permissions';

export interface AssetFilterItem {
  id: string;
  label: string;
  level: number;
  match: (node: TreeNodeData) => boolean;
}

const isSpare = (node: TreeNodeData): boolean => {
  const cat = `${node.originalData?.category || ''} ${node.originalData?.machineCategory || ''} ${node.originalData?.machineSubCategory || ''} ${node.name || ''}`.toLowerCase();
  return cat.includes('spare') || cat.includes('rotating');
};

const isTool = (node: TreeNodeData): boolean => {
  const cat = `${node.originalData?.category || ''} ${node.originalData?.machineCategory || ''} ${node.originalData?.machineSubCategory || ''} ${node.name || ''}`.toLowerCase();
  return cat.includes('tool');
};

const isStorage = (node: TreeNodeData): boolean => {
  const cat = `${node.originalData?.category || ''} ${node.originalData?.subCategory || ''} ${node.originalData?.description || ''} ${node.name || ''}`.toLowerCase();
  return cat.includes('storage') || cat.includes('inventory') || cat.includes('warehouse') || cat.includes('store') || cat.includes('stock');
};

const isPlant = (node: TreeNodeData): boolean => {
  if (node.type === 'mainFacility' || node.id.startsWith('mf-')) return true;
  const cat = `${node.originalData?.category || ''} ${node.originalData?.mainFacilityName || ''} ${node.name || ''}`.toLowerCase();
  return cat.includes('plant');
};

const isBuilding = (node: TreeNodeData): boolean => {
  if (node.type === 'building' || node.id.startsWith('bldg-')) return true;
  const cat = `${node.originalData?.category || ''} ${node.name || ''}`.toLowerCase();
  return cat.includes('building');
};

const isRegion = (node: TreeNodeData): boolean => {
  if (node.type === 'society' || node.id.startsWith('soc-')) return true;
  const cat = `${node.originalData?.category || ''} ${node.name || ''}`.toLowerCase();
  return cat.includes('region') || cat.includes('zone');
};

const isMachine = (node: TreeNodeData): boolean => {
  return (
    node.type === 'device' ||
    (node.type as string) === 'machine' ||
    node.id.startsWith('mac-') ||
    node.id.startsWith('dev-')
  );
};

const isFacility = (node: TreeNodeData, isRoot = false): boolean => {
  if (isMachine(node)) return false;
  if (
    node.type === 'mainFacility' ||
    node.type === 'society' ||
    node.id.startsWith('mf-') ||
    node.id.startsWith('soc-')
  ) {
    return true;
  }
  // A node at the root of the asset tree is always a top-level facility/site
  if (isRoot) return true;
  return false;
};

const isSubFacility = (node: TreeNodeData, isRoot = false): boolean => {
  if (isMachine(node)) return false;
  // Top-level mainFacility / society is never a sub-facility
  if (
    node.type === 'mainFacility' ||
    node.type === 'society' ||
    node.id.startsWith('mf-') ||
    node.id.startsWith('soc-')
  ) {
    return false;
  }
  // Root nodes are top-level facilities, not sub-facilities
  if (isRoot) return false;
  return true;
};

const isLocationOrFacility = (node: TreeNodeData): boolean => {
  return isFacility(node, false) || isSubFacility(node, false);
};

const isPhysicalAsset = (node: TreeNodeData): boolean => {
  return isMachine(node);
};

export const ASSET_FILTERS: AssetFilterItem[] = [
  {
    id: 'type_facility',
    label: 'Facility (Top-Level)',
    level: 0,
    match: (n) => isFacility(n, false),
  },
  {
    id: 'type_sub_facility',
    label: 'Sub Facility',
    level: 1,
    match: (n) => isSubFacility(n, false),
  },
  {
    id: 'type_machine',
    label: 'Machine / Asset',
    level: 2,
    match: isMachine,
  },
  {
    id: 'assets',
    label: 'Category: Assets',
    level: 0,
    match: isPhysicalAsset,
  },
  {
    id: 'equipment',
    label: 'Category: Equipment',
    level: 1,
    match: (n) => isPhysicalAsset(n) && !isSpare(n) && !isTool(n),
  },
  {
    id: 'rotating_spares',
    label: 'Category: Rotating Spares',
    level: 2,
    match: (n) => isPhysicalAsset(n) && isSpare(n),
  },
  {
    id: 'locations_facilities',
    label: 'Category: Locations And Facilities',
    level: 0,
    match: isLocationOrFacility,
  },
  {
    id: 'buildings',
    label: 'Category: Buildings',
    level: 1,
    match: isBuilding,
  },
  {
    id: 'inventory_storage',
    label: 'Category: Inventory Storage',
    level: 1,
    match: isStorage,
  },
  {
    id: 'plants',
    label: 'Category: Plants',
    level: 1,
    match: isPlant,
  },
  {
    id: 'region',
    label: 'Category: Region',
    level: 0,
    match: isRegion,
  },
  {
    id: 'tools',
    label: 'Category: Tools',
    level: 0,
    match: (n) => isPhysicalAsset(n) && isTool(n),
  },
];

// Helper to match a node and its originalData across all fields
function nodeMatchesQuery(node: TreeNodeData, q: string): boolean {
  if (!q) return true;
  const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const textParts: string[] = [
    node.name || '',
    node.type || '',
    node.id != null ? String(node.id) : '',
  ];

  if (node.originalData && typeof node.originalData === 'object') {
    const data = node.originalData as Record<string, any>;
    for (const val of Object.values(data)) {
      if (val === null || val === undefined) continue;
      if (typeof val === 'string' || typeof val === 'number') {
        textParts.push(String(val));
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === 'string' || typeof item === 'number') {
            textParts.push(String(item));
          } else if (item && typeof item === 'object') {
            for (const subVal of Object.values(item)) {
              if (typeof subVal === 'string' || typeof subVal === 'number') {
                textParts.push(String(subVal));
              }
            }
          }
        }
      }
    }
  }

  const combinedText = textParts.join(' ').toLowerCase();
  return tokens.every(token => combinedText.includes(token));
}

function filterAssetTree(
  nodes: TreeNodeData[],
  criteria: {
    typeFilter: 'facility' | 'subFacility' | 'machine' | null;
    selectedFacility: string;
    selectedSubFacility: string;
    selectedMachine: string;
    categoryItem?: AssetFilterItem | null;
    searchQuery: string;
  }
): TreeNodeData[] {
  const { typeFilter, selectedFacility, selectedSubFacility, selectedMachine, categoryItem, searchQuery } = criteria;
  const q = searchQuery.toLowerCase().trim();

  const hasAnyFilter = Boolean(
    typeFilter ||
    selectedFacility ||
    selectedSubFacility ||
    selectedMachine ||
    categoryItem ||
    q
  );

  if (!hasAnyFilter) return nodes;

  // 1. When typeFilter === 'facility': return top-level facilities
  if (typeFilter === 'facility') {
    const facs: TreeNodeData[] = [];
    for (const node of nodes) {
      const isFac = isFacility(node, true);
      if (isFac) {
        if (!selectedFacility || node.name.toLowerCase() === selectedFacility.toLowerCase()) {
          if (!q || nodeMatchesQuery(node, q)) {
            facs.push({
              ...node,
              children: node.children || []
            });
          }
        }
      }
    }
    return facs;
  }

  // 2. When typeFilter === 'subFacility': return sub-facilities
  if (typeFilter === 'subFacility') {
    const subFacs: TreeNodeData[] = [];
    const collectSubFacilities = (items: TreeNodeData[], isRoot = true, facMatched = false) => {
      for (const node of items) {
        const isFac = isFacility(node, isRoot);
        const isSubFac = isSubFacility(node, isRoot);

        const currentFacMatch =
          !selectedFacility ||
          facMatched ||
          (isFac && node.name.toLowerCase() === selectedFacility.toLowerCase());

        if (isSubFac && currentFacMatch) {
          if (!selectedSubFacility || node.name.toLowerCase() === selectedSubFacility.toLowerCase()) {
            if (!q || nodeMatchesQuery(node, q)) {
              subFacs.push({
                ...node,
                children: node.children || []
              });
            }
          }
        }

        if (node.children && node.children.length > 0) {
          const nextFacMatched =
            !selectedFacility ||
            facMatched ||
            (isFac && node.name.toLowerCase() === selectedFacility.toLowerCase());

          collectSubFacilities(node.children, false, nextFacMatched);
        }
      }
    };
    collectSubFacilities(nodes, true, !selectedFacility);
    return subFacs;
  }

  // 3. When typeFilter === 'machine': return machines
  if (typeFilter === 'machine') {
    const machines: TreeNodeData[] = [];
    const collectMachines = (items: TreeNodeData[], isRoot = true, facMatched = false, subFacMatched = false) => {
      for (const node of items) {
        const isFac = isFacility(node, isRoot);
        const isSubFac = isSubFacility(node, isRoot);
        const isMac = isMachine(node);

        const currentFacMatch =
          !selectedFacility ||
          facMatched ||
          (isFac && node.name.toLowerCase() === selectedFacility.toLowerCase());

        const currentSubFacMatch =
          !selectedSubFacility ||
          subFacMatched ||
          (isSubFac && node.name.toLowerCase() === selectedSubFacility.toLowerCase());

        if (isMac && currentFacMatch && currentSubFacMatch) {
          if (!selectedMachine || node.name.toLowerCase() === selectedMachine.toLowerCase()) {
            if (!q || nodeMatchesQuery(node, q)) {
              machines.push({
                ...node,
                children: []
              });
            }
          }
        }

        if (node.children && node.children.length > 0) {
          const nextFacMatched =
            !selectedFacility ||
            facMatched ||
            (isFac && node.name.toLowerCase() === selectedFacility.toLowerCase());

          const nextSubFacMatched =
            !selectedSubFacility ||
            subFacMatched ||
            (isSubFac && node.name.toLowerCase() === selectedSubFacility.toLowerCase());

          collectMachines(node.children, false, nextFacMatched, nextSubFacMatched);
        }
      }
    };
    collectMachines(nodes, true, !selectedFacility, !selectedSubFacility);
    return machines;
  }

  // 4. When typeFilter is null ("All" type), filter the tree hierarchically
  const filterRecursive = (items: TreeNodeData[], isRootLevel = true): TreeNodeData[] => {
    const result: TreeNodeData[] = [];

    for (const node of items) {
      const isFac = isFacility(node, isRootLevel);
      const isSubFac = isSubFacility(node, isRootLevel);
      const isMac = isMachine(node);

      // Facility filter (root level check)
      if (selectedFacility && isFac && node.name.toLowerCase() !== selectedFacility.toLowerCase()) {
        continue;
      }

      // Recurse children
      const filteredChildren = node.children && node.children.length > 0
        ? filterRecursive(node.children, false)
        : [];

      // Specific Sub Facility match
      if (selectedSubFacility) {
        if (isSubFac && node.name.toLowerCase() === selectedSubFacility.toLowerCase()) {
          if (selectedMachine) {
            if (filteredChildren.length > 0) {
              result.push({ ...node, children: filteredChildren });
            }
          } else {
            result.push({ ...node, children: node.children || [] });
          }
        } else if (filteredChildren.length > 0) {
          result.push({ ...node, children: filteredChildren });
        }
        continue;
      }

      // Specific Machine match
      if (selectedMachine) {
        if (isMac && node.name.toLowerCase() === selectedMachine.toLowerCase()) {
          result.push({ ...node, children: [] });
        } else if (filteredChildren.length > 0) {
          result.push({ ...node, children: filteredChildren });
        }
        continue;
      }

      // Category match
      if (categoryItem) {
        if (categoryItem.match(node)) {
          result.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : (node.children || []) });
        } else if (filteredChildren.length > 0) {
          result.push({ ...node, children: filteredChildren });
        }
        continue;
      }

      // Text search query
      if (q) {
        const matchesSelf = nodeMatchesQuery(node, q);
        if (matchesSelf || filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : (matchesSelf ? (node.children || []) : [])
          });
        }
        continue;
      }

      // Default retain when facility is selected (and matches) or children matched
      if (selectedFacility && isFac) {
        result.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : (node.children || []) });
        continue;
      }

      result.push({ ...node, children: filteredChildren });
    }

    return result;
  };

  return filterRecursive(nodes, true);
}

export function AssetsManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [detailsNode, setDetailsNode] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMove, setPendingMove] = useState<{ source: TreeNodeData; target: TreeNodeData } | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveModalNode, setMoveModalNode] = useState<TreeNodeData | null>(null);
  const [giveAccessTarget, setGiveAccessTarget] = useState<{
    id: number | string;
    name: string;
    code?: string;
    category?: string;
    type: 'facility' | 'machine' | 'mainFacility';
  } | null>(null);

  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);

  // Import & Export States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Asset Filter States
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'facility' | 'subFacility' | 'machine' | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [selectedSubFacility, setSelectedSubFacility] = useState<string>('');
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Dynamic lists from treeData for dropdown selectors
  const { uniqueFacilitiesList, availableSubFacilities, availableMachines } = useMemo(() => {
    const allFacs = new Set<string>();
    const scopedSubFacs = new Set<string>();
    const scopedMacs = new Set<string>();

    const traverse = (nodes: TreeNodeData[], isRoot = true, facActive = false, subFacActive = false) => {
      for (const node of nodes) {
        const isFac = isFacility(node, isRoot);
        const isSubFac = isSubFacility(node, isRoot);
        const isMac = isMachine(node);

        if (isFac) {
          allFacs.add(node.name);
        }

        const isCurrentFacActive =
          !selectedFacility ||
          facActive ||
          (isFac && node.name.toLowerCase() === selectedFacility.toLowerCase());

        const isCurrentSubFacActive =
          !selectedSubFacility ||
          subFacActive ||
          (isSubFac && node.name.toLowerCase() === selectedSubFacility.toLowerCase());

        if (isSubFac && isCurrentFacActive) {
          scopedSubFacs.add(node.name);
        }

        if (isMac && isCurrentFacActive && isCurrentSubFacActive) {
          scopedMacs.add(node.name);
        }

        if (node.children && node.children.length > 0) {
          traverse(
            node.children,
            false,
            isCurrentFacActive,
            isCurrentSubFacActive
          );
        }
      }
    };

    traverse(treeData, true, !selectedFacility, !selectedSubFacility);

    return {
      uniqueFacilitiesList: Array.from(allFacs).sort((a, b) => a.localeCompare(b)),
      availableSubFacilities: Array.from(scopedSubFacs).sort((a, b) => a.localeCompare(b)),
      availableMachines: Array.from(scopedMacs).sort((a, b) => a.localeCompare(b)),
    };
  }, [treeData, selectedFacility, selectedSubFacility]);

  const activeFilterItem = useMemo(() => {
    return ASSET_FILTERS.find(f => f.id === activeFilterId) || null;
  }, [activeFilterId]);

  const filteredTreeData = useMemo(() => {
    return filterAssetTree(treeData, {
      typeFilter: selectedTypeFilter,
      selectedFacility,
      selectedSubFacility,
      selectedMachine,
      categoryItem: activeFilterItem,
      searchQuery,
    });
  }, [treeData, selectedTypeFilter, selectedFacility, selectedSubFacility, selectedMachine, activeFilterItem, searchQuery]);

  const hasActiveFilters = Boolean(
    selectedTypeFilter ||
    selectedFacility ||
    selectedSubFacility ||
    selectedMachine ||
    searchQuery.trim()
  );

  const activeFilterCount = (
    (selectedTypeFilter ? 1 : 0) +
    (selectedFacility ? 1 : 0) +
    (selectedSubFacility ? 1 : 0) +
    (selectedMachine ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0)
  );

  const clearAllFilters = () => {
    setSelectedTypeFilter(null);
    setSelectedFacility('');
    setSelectedSubFacility('');
    setSelectedMachine('');
    setActiveFilterId(null);
    setSearchQuery('');
  };

  useEffect(() => {
    if (hasActiveFilters && filteredTreeData.length > 0) {
      setExpandedIds(new Set(getAllExpandableIds(filteredTreeData)));
    }
  }, [hasActiveFilters, filteredTreeData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    if (isFilterOpen || isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFilterOpen, isExportMenuOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isFilterOpen) setIsFilterOpen(false);
        if (isExportMenuOpen) setIsExportMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterOpen, isExportMenuOpen]);

  const flattenTreeForExport = (nodes: TreeNodeData[], parentPath: string = '', level: number = 0): any[][] => {
    const rows: any[][] = [];

    for (const node of nodes) {
      let typeLabel = 'Asset';
      if (node.type === 'mainFacility') typeLabel = 'Main Facility (Plant)';
      else if (node.type === 'facility') typeLabel = 'Sub Facility';
      else if (node.type === 'building') typeLabel = 'Building';
      else if (node.type === 'society') typeLabel = 'Society / Region';
      else if (node.type === 'device') typeLabel = 'Machine / Equipment';

      const code = node.originalData?.machineCode || node.originalData?.facilityCode || node.originalData?.mainFacilityCode || node.originalData?.code || '-';
      const category = node.originalData?.machineCategory || node.originalData?.category || '-';
      const subCategory = node.originalData?.machineSubCategory || node.originalData?.subCategory || '-';
      const make = node.originalData?.make || '-';
      const model = node.originalData?.modelNumber || '-';
      const status = node.originalData?.status || 'Active';
      const indentPrefix = '  '.repeat(level);

      rows.push([
        rows.length + 1,
        `${indentPrefix}${node.name}`,
        typeLabel,
        code,
        category,
        subCategory,
        parentPath || 'Top Level',
        make,
        model,
        status
      ]);

      if (node.children && node.children.length > 0) {
        const childRows = flattenTreeForExport(node.children, node.name, level + 1);
        rows.push(...childRows);
      }
    }

    return rows;
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    const headers = [
      'No.',
      'Asset Name',
      'Asset Type',
      'Asset Code',
      'Category',
      'Sub Category',
      'Parent Location',
      'Make',
      'Model Number',
      'Status'
    ];

    const dataToExport = hasActiveFilters ? filteredTreeData : treeData;
    const rows = flattenTreeForExport(dataToExport);

    rows.forEach((r, idx) => {
      r[0] = (idx + 1).toString();
    });

    const filterNameParts: string[] = [];
    if (selectedFacility) filterNameParts.push(selectedFacility);
    if (selectedSubFacility) filterNameParts.push(selectedSubFacility);
    if (selectedMachine) filterNameParts.push(selectedMachine);
    if (selectedTypeFilter) filterNameParts.push(selectedTypeFilter);

    const filename = hasActiveFilters && filterNameParts.length > 0
      ? `Assets_List_${filterNameParts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_')}`
      : 'Assets_Hierarchy_List';
    const title = hasActiveFilters && filterNameParts.length > 0
      ? `Asset Hierarchy List - ${filterNameParts.join(' / ')}`
      : 'Asset Management Hierarchy List';

    exportData(headers, rows, filename, title, format);
    toast.success(`Assets exported successfully as ${format.toUpperCase()}`);
  };

  const handleSelectFilter = (id: string | null) => {
    if (!id || activeFilterId === id) {
      setActiveFilterId(null);
    } else {
      setActiveFilterId(id);
    }
    setIsFilterOpen(false);
  };

  const handleExpandAll = () => {
    setExpandedIds(new Set(getAllExpandableIds(filteredTreeData)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const isAnyExpanded = expandedIds.size > 0;

  const handleToggleExpandAll = () => {
    if (isAnyExpanded) {
      handleCollapseAll();
    } else {
      handleExpandAll();
    }
  };

  const handleToggleExpand = (nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleOpenGiveAccess = (node: TreeNodeData) => {
    const raw = node.originalData || {};
    let targetType: 'facility' | 'machine' | 'mainFacility' = 'facility';
    let targetId: number | string = raw.id || node.id;
    let targetName = node.name;
    let targetCode = raw.machineCode || raw.facilityCode || raw.mainFacilityCode || raw.code || '';
    let targetCategory = raw.category || raw.machineCategory || '';

    if (node.type === 'device') {
      targetType = 'machine';
      targetId = raw.id || node.id;
    } else if (node.type === 'mainFacility' || node.type === 'society') {
      targetType = 'mainFacility';
      targetId = raw.id || node.id;
    } else {
      targetType = 'facility';
      targetId = raw.id || node.id;
    }

    setGiveAccessTarget({
      id: targetId,
      name: targetName,
      code: targetCode,
      category: targetCategory,
      type: targetType,
    });
  };

  const canManageAssets = ['SUPER_ADMIN', 'SOCIETY_ADMIN', 'BUILDING_ADMIN'].includes(user?.role as string);

  useEffect(() => {
    fetchData();
  }, [user, location.key]);

  // Handle auto-expand and selection when returning from creating Facility, Subfacility, or Machine
  useEffect(() => {
    const state = location.state as any;
    const targetMachineId = state?.newMachineId;
    const targetFacilityId = state?.newFacilityId;

    if ((targetMachineId || targetFacilityId) && treeData.length > 0) {
      const findPath = (
        nodes: TreeNodeData[],
        predicate: (n: TreeNodeData) => boolean,
        path: string[] = []
      ): { node: TreeNodeData; ancestors: string[] } | null => {
        for (const n of nodes) {
          if (predicate(n)) return { node: n, ancestors: path };
          if (n.children && n.children.length > 0) {
            const res = findPath(n.children, predicate, [...path, n.id]);
            if (res) return res;
          }
        }
        return null;
      };

      const predicate = (n: TreeNodeData) => {
        if (targetMachineId) {
          return (
            n.id === `mac-${targetMachineId}` ||
            n.id === `dev-${targetMachineId}` ||
            n.originalData?.id?.toString() === targetMachineId.toString()
          );
        }
        if (targetFacilityId) {
          return (
            n.id === `fac-${targetFacilityId}` ||
            n.id === `mf-${targetFacilityId}` ||
            n.originalData?.id?.toString() === targetFacilityId.toString()
          );
        }
        return false;
      };

      const result = findPath(treeData, predicate);
      if (result) {
        setExpandedIds(prev => new Set([...prev, ...result.ancestors, result.node.id]));
        setSelectedNode(result.node);
        setTimeout(() => {
          const el = document.getElementById(`asset-node-${result.node.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 150);
      }
      // Clean up state without refreshing
      navigate('.', { replace: true, state: {} });
    }
  }, [treeData, location.state]);

  // Restore detailsNode from location state if we navigate back
  useEffect(() => {
    if (treeData.length > 0 && location.state?.detailId) {
      const findNode = (nodes: TreeNodeData[], id: string): TreeNodeData | null => {
        for (const n of nodes) {
          if (n.id === id) return n;
          if (n.children) {
            const found = findNode(n.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      const node = findNode(treeData, location.state.detailId);
      if (node && (!detailsNode || detailsNode.id !== node.id)) {
        setDetailsNode(node);
      }
    }
  }, [treeData, location.state?.detailId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all required data
      const [societiesRes, buildingsRes, machinesRes, devicesRes, mainFacilitiesRes, facilitiesRes] = await Promise.all([
        api.get('/societies').catch(() => ({ data: [] })),
        api.get('/buildings').catch(() => ({ data: [] })),
        api.get('/machines').catch(() => ({ data: [] })),
        api.get('/devices').catch(() => ({ data: [] })),
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
      ]);

      let societies = Array.isArray(societiesRes.data) ? societiesRes.data : [];
      let buildings = Array.isArray(buildingsRes.data) ? buildingsRes.data : [];
      let machines = Array.isArray(machinesRes.data) ? machinesRes.data : [];
      let devices = Array.isArray(devicesRes.data) ? devicesRes.data : [];
      let mainFacilities = Array.isArray(mainFacilitiesRes.data) ? mainFacilitiesRes.data : [];
      let facilities = Array.isArray(facilitiesRes.data) ? facilitiesRes.data : [];

      if (user?.role !== 'SUPER_ADMIN') {
        const hasAssetPerms = user?.permissions?.some((p: any) => p.moduleId?.startsWith('asset_'));

        if (user?.deviceId) {
          // Device operator/assigned user (e.g. Mahendra Powar): only see their assigned device/machine
          machines = machines.filter((m: any) => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
          devices = devices.filter((d: any) => d.deviceId === user.deviceId || d.id?.toString() === user.deviceId);
          mainFacilities = [];
          facilities = [];
          societies = [];
          buildings = [];
        } else if (user?.facilityId || hasAssetPerms) {
          // Facility-assigned user or granular asset permissions:
          // Collect all allowed facility IDs from user.facilityId and asset_fac_ permissions
          const allowedFacilityIds = new Set<number>();
          if (user?.facilityId) allowedFacilityIds.add(Number(user.facilityId));
          user?.permissions?.forEach((p: any) => {
            const match = p.moduleId?.match(/^asset_fac_(\d+)$/);
            if (match && p.canView) allowedFacilityIds.add(Number(match[1]));
          });

          // Recursively expand to all descendant sub-facilities under allowed facilities
          let added = true;
          while (added) {
            added = false;
            facilities.forEach((f: any) => {
              if (f.parentFacilityId && allowedFacilityIds.has(Number(f.parentFacilityId)) && !allowedFacilityIds.has(Number(f.id))) {
                allowedFacilityIds.add(Number(f.id));
                added = true;
              }
            });
          }

          // Filter machines: include if directly granted, or if its facilityId is in allowedFacilityIds (direct access inheritance)
          machines = machines.filter((m: any) => {
            if (m.facilityId && allowedFacilityIds.has(Number(m.facilityId))) return true;
            return hasAssetPermission(user, m, 'view');
          });

          // Filter facilities: include if in allowedFacilityIds, or directly granted, or has visible child machines
          facilities = facilities.filter((f: any) => {
            if (allowedFacilityIds.has(Number(f.id))) return true;
            return hasAssetPermission(user, f, 'view') ||
              machines.some((m: any) => Number(m.facilityId) === Number(f.id));
          });

          // Filter main facilities: only retain if user has mainFacilityId or explicit permission
          mainFacilities = mainFacilities.filter((mf: any) => {
            if (user?.mainFacilityId && Number(user.mainFacilityId) === Number(mf.id)) return true;
            return hasAssetPermission(user, mf, 'view') ||
              (!user?.facilityId && facilities.some((f: any) => Number(f.mainFacilityId) === Number(mf.id))) ||
              (!user?.facilityId && machines.some((m: any) => Number(m.mainFacilityId) === Number(mf.id) || m.company === String(mf.id) || m.company === mf.mainFacilityName));
          });
          societies = [];
          buildings = [];
          devices = devices.filter((d: any) => d.facilityId && allowedFacilityIds.has(Number(d.facilityId)));
        } else if (user?.mainFacilityId) {
          mainFacilities = mainFacilities.filter((mf: any) => mf.id === user.mainFacilityId);
          // Only show facilities that belong to this main facility
          facilities = facilities.filter((f: any) => f.mainFacilityId === user.mainFacilityId);
          societies = [];
          buildings = [];
          devices = [];
        } else if (user?.societyId) {
          societies = societies.filter((s: any) => s.id === user.societyId);
          buildings = buildings.filter((b: any) => b.societyId === user.societyId);
          devices = devices.filter((d: any) => d.buildingId && buildings.some(b => b.id === d.buildingId));
          mainFacilities = [];
          facilities = [];
        } else {
          // Operator/Viewer fallback: only show facilities/buildings where they actually have assigned machines/devices
          const assignedFacilityIds = new Set(machines.map((m: any) => m.facilityId).filter(Boolean).map(Number));
          const assignedBuildingIds = new Set([
            ...machines.map((m: any) => m.buildingId).filter(Boolean),
            ...devices.map((d: any) => d.buildingId).filter(Boolean),
          ]);

          facilities = facilities.filter((f: any) => assignedFacilityIds.has(Number(f.id)));
          buildings = buildings.filter((b: any) => assignedBuildingIds.has(b.id));

          // Retain mainFacilities that are parents to the retained facilities
          const activeMainFacIds = new Set(facilities.map((f: any) => f.mainFacilityId).filter(Boolean).map(Number));
          mainFacilities = mainFacilities.filter((mf: any) => activeMainFacIds.has(Number(mf.id)));

          // Retain societies that are parents to the retained buildings
          const activeSocIds = new Set(buildings.map((b: any) => b.societyId).filter(Boolean));
          societies = societies.filter((s: any) => activeSocIds.has(s.id));
        }
      }

      // Pre-process machine hierarchy
      const machineMap: Record<number, TreeNodeData> = {};
      machines.forEach((mac: any) => {
        machineMap[mac.id] = {
          id: `mac-${mac.id}`,
          name: mac.name || mac.machineCode || mac.deviceId || 'Unknown Machine',
          type: 'device',
          originalData: mac,
          children: []
        };
      });

      const rootMachines: TreeNodeData[] = [];
      machines.forEach((mac: any) => {
        const node = machineMap[mac.id];
        if (mac.parentMachineId && machineMap[mac.parentMachineId]) {
          machineMap[mac.parentMachineId].children!.push(node);
        } else {
          rootMachines.push(node);
        }
      });

      // Pre-process device items for buildings
      const deviceNodes: TreeNodeData[] = devices.map((dev: any) => ({
        id: `dev-${dev.id}`,
        name: dev.name || dev.deviceId || 'Unknown Device',
        type: 'device',
        originalData: dev,
        children: []
      }));

      // We will build two main branches for this demonstration:
      // 1. Societies -> Buildings -> Devices
      // 2. Main Facilities -> Facilities (Nested)

      const finalTree: TreeNodeData[] = [];

      // 1. Societies Nodes
      const societyNodes: TreeNodeData[] = societies.map((soc: any) => ({
        id: `soc-${soc.id}`,
        name: soc.name,
        type: 'society',
        originalData: soc,
        children: []
      }));

      // 2. Main Facilities Nodes
      const mainFacNodes: TreeNodeData[] = mainFacilities.map((mf: any) => ({
        id: `mf-${mf.id}`,
        name: mf.mainFacilityName,
        type: 'mainFacility',
        originalData: mf,
        children: []
      }));

      // Attach Buildings to Societies or Main Facilities
      buildings.forEach((bldg: any) => {
        const bldgNode: TreeNodeData = {
          id: `bldg-${bldg.id}`,
          name: bldg.name,
          type: 'building',
          originalData: bldg,
          children: []
        };

        // Attach Root Machines to Buildings
        rootMachines.forEach((macNode) => {
          if (macNode.originalData.buildingId === bldg.id) {
            bldgNode.children!.push(macNode);
          }
        });

        // Attach Devices to Buildings
        deviceNodes.forEach((devNode) => {
          if (devNode.originalData.buildingId === bldg.id) {
            bldgNode.children!.push(devNode);
          }
        });

        // Attach building to Main Facility or Society
        if (bldg.mainFacilityId && mainFacNodes.length > 0) {
          const mainFacParent = mainFacNodes.find(mf => mf.originalData.id === bldg.mainFacilityId);
          if (mainFacParent) {
            mainFacParent.children!.push(bldgNode);
          } else {
            finalTree.push(bldgNode);
          }
        } else {
          const socParent = societyNodes.find(s => s.originalData.id === bldg.societyId);
          if (socParent) {
            socParent.children!.push(bldgNode);
          } else {
            finalTree.push(bldgNode);
          }
        }
      });

      // Add societies to tree
      finalTree.push(...societyNodes);

      const facMap: Record<number, TreeNodeData> = {};
      facilities.forEach((fac: any) => {
        facMap[fac.id] = {
          id: `fac-${fac.id}`,
          name: fac.facilityName,
          type: 'facility',
          originalData: fac,
          children: []
        };
      });

      facilities.forEach((fac: any) => {
        const node = facMap[fac.id];

        // Attach Root Machines to Facilities
        rootMachines.forEach((macNode) => {
          if (Number(macNode.originalData.facilityId) === Number(fac.id)) {
            node.children!.push(macNode);
          }
        });

        if (fac.parentFacilityId && facMap[fac.parentFacilityId]) {
          facMap[fac.parentFacilityId].children!.push(node);
        } else if (fac.mainFacilityId && mainFacNodes.length > 0) {
          const mainFacParent = mainFacNodes.find(mf => mf.originalData.id === fac.mainFacilityId);
          if (mainFacParent) {
            mainFacParent.children!.push(node);
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

      // Add main facilities to tree
      finalTree.push(...mainFacNodes);

      // Branch 3: Direct Machines/Devices (when device-assigned or standalone)
      if (user?.deviceId || (facilities.length === 0 && buildings.length === 0 && mainFacilities.length === 0 && societies.length === 0)) {
        rootMachines.forEach((macNode) => {
          if (!finalTree.some(t => t.id === macNode.id)) {
            finalTree.push(macNode);
          }
        });
        deviceNodes.forEach((devNode) => {
          if (!finalTree.some(t => t.id === devNode.id)) {
            finalTree.push(devNode);
          }
        });
      }

      // Sort tree alphabetically (with numeric awareness)
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
      setExpandedIds(new Set(getAllExpandableIds(finalTree)));
    } catch (error) {
      console.error('Error fetching asset data:', error);
    } finally {
      setLoading(false);
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
      await fetchData();
    } catch (error: any) {
      console.error('Error moving asset:', error);
      const msg = error.response?.data?.message || 'Failed to move asset. Please try again.';
      toast.error(msg);
    } finally {
      setIsMoving(false);
    }
  };

  const handleNodeClick = (node: TreeNodeData) => {
    setSelectedNode(node);

    // 1. Machine / Device: Open full Machine Details (/machine-management/edit/:id)
    if (node.type === 'device' || (node.type as string) === 'machine' || node.id.startsWith('mac-') || node.originalData?.machineCode) {
      const machineId = node.originalData?.id || node.id.replace(/^(mac|dev)-/, '');
      if (machineId) {
        navigate(`/machine-management/edit/${machineId}`, {
          state: { returnUrl: '/assets' }
        });
        return;
      }
    }

    // 2. Facility / Sub-Facility: Open Facility Details
    if (node.type === 'facility' || node.id.startsWith('fac-')) {
      const facilityId = node.originalData?.id || node.id.replace(/^fac-/, '');
      if (facilityId) {
        const canEditFacility = hasPermission(user, 'facility_management', 'edit');
        navigate(canEditFacility ? `/master/facility/edit/${facilityId}` : `/master/facility/view/${facilityId}`, {
          state: { returnUrl: '/assets' }
        });
        return;
      }
    }

    // 3. Main Facility: Open Main Facility Details
    if (node.type === 'mainFacility' || node.id.startsWith('mf-')) {
      const mainFacilityId = node.originalData?.id || node.id.replace(/^mf-/, '');
      if (mainFacilityId) {
        const canEditMainFacility = hasPermission(user, 'master_main_facility', 'edit') || hasPermission(user, 'facility_management', 'edit');
        navigate(canEditMainFacility ? `/master/main-facility/edit/${mainFacilityId}` : `/master/main-facility/view/${mainFacilityId}`, {
          state: { returnUrl: '/assets' }
        });
        return;
      }
    }

    // 4. Building: Open in-place Asset Details modal
    if (node.type === 'building' || node.id.startsWith('bldg-')) {
      setDetailsNode(node);
      return;
    }

    // 5. Society: Open in-place Asset Details modal
    if (node.type === 'society' || node.id.startsWith('soc-')) {
      setDetailsNode(node);
      return;
    }

    // Fallback: Open modal
    setDetailsNode(node);
  };

  return (
    <div className="w-full h-[calc(100vh-76px)] flex flex-col">
      {/* Tree Container */}
      <div className="w-full bg-white border border-gray-200 rounded-xl shadow-xs flex flex-col h-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shrink-0">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                id="btn-toggle-expand-all"
                onClick={handleToggleExpandAll}
                className="w-6 h-6 -ml-1 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                title={isAnyExpanded ? "Collapse all assets" : "Expand all assets"}
                aria-label={isAnyExpanded ? "Collapse all assets" : "Expand all assets"}
              >
                {isAnyExpanded ? (
                  <ChevronDown className="w-4.5 h-4.5 text-gray-700 stroke-[2.2]" />
                ) : (
                  <ChevronRight className="w-4.5 h-4.5 text-gray-700 stroke-[2.2]" />
                )}
              </button>
              <h2
                className="text-lg font-bold text-gray-900 cursor-pointer select-none hover:text-emerald-700 transition-colors"
                onClick={handleToggleExpandAll}
                title={isAnyExpanded ? "Click to collapse all assets" : "Click to expand all assets"}
              >
                All Assets
              </h2>
              {/* Active Filter Chips */}
              {selectedTypeFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                  <span>Type: {selectedTypeFilter === 'subFacility' ? 'Sub Facility' : selectedTypeFilter === 'facility' ? 'Facility' : 'Machine'}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTypeFilter(null);
                    }}
                    className="p-0.5 rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    title="Remove type filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedFacility && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <Building2 size={12} className="text-emerald-600" />
                  <span>Facility: {selectedFacility}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFacility('');
                    }}
                    className="p-0.5 rounded-full hover:bg-emerald-200/80 text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                    title="Remove facility filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedSubFacility && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs">
                  <Building size={12} className="text-teal-600" />
                  <span>Sub Facility: {selectedSubFacility}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSubFacility('');
                    }}
                    className="p-0.5 rounded-full hover:bg-teal-200/80 text-teal-600 hover:text-teal-800 transition-colors cursor-pointer"
                    title="Remove sub facility filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedMachine && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                  <Cpu size={12} className="text-amber-600" />
                  <span>Machine: {selectedMachine}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMachine('');
                    }}
                    className="p-0.5 rounded-full hover:bg-amber-200/80 text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
                    title="Remove machine filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <Search size={11} className="text-emerald-600" />
                  <span>Search: "{searchQuery.trim()}"</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                    }}
                    className="p-0.5 rounded-full hover:bg-emerald-200/80 text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer hover:underline px-1.5 py-0.5"
                  title="Clear all active filters"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input where user can search anything */}
            <div className="relative w-full sm:w-60 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything (name, code, make, model...)"
                className="w-full pl-8.5 pr-8 h-9 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-slate-800 placeholder-slate-400 bg-white transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {canManageAssets && selectedNode && canDragNode(selectedNode, canManageAssets) && (
              <button
                type="button"
                onClick={() => setMoveModalNode(selectedNode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
                title={`Move "${selectedNode.name}" to another location`}
              >
                <FolderInput className="w-3.5 h-3.5" />
                <span>Move Selected Asset</span>
              </button>
            )}

            {/* Import Button */}
            <button
              type="button"
              id="btn-import-assets"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Import assets from Excel"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import</span>
            </button>

            {/* Export Menu Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                id="btn-export-assets"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-50/60 border border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300 text-emerald-700 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                title="Export assets"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-emerald-400" />
              </button>
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      handleExport('excel');
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Export as Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExport('pdf');
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-500" />
                    <span>Export as PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Asset Filter Button & Popover */}
            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                id="btn-asset-filter"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 border rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap ${hasActiveFilters
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-emerald-50'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                title="Filter assets by facility, sub facility, machine, or category"
              >
                <Filter className={`w-3.5 h-3.5 ${hasActiveFilters ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {isFilterOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* Top Bar: SET FILTER */}
                  <div className="px-3.5 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                        SET FILTER
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(false)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Quick Filter by Type Pills */}
                  <div className="p-3 bg-slate-50/80 border-b border-slate-200/80">
                    <div className="text-[11px] font-semibold text-slate-600 mb-1.5">Asset Level / Type</div>
                    <div className="grid grid-cols-4 gap-1 bg-slate-200/70 p-1 rounded-lg">
                      {[
                        { key: null, label: 'All' },
                        { key: 'facility', label: 'Facility' },
                        { key: 'subFacility', label: 'Sub Facility' },
                        { key: 'machine', label: 'Machine' },
                      ].map((tab) => (
                        <button
                          key={tab.label}
                          type="button"
                          onClick={() => setSelectedTypeFilter(tab.key as any)}
                          className={`py-1 text-center rounded-md text-[11px] font-medium transition-all cursor-pointer ${selectedTypeFilter === tab.key
                              ? 'bg-white text-emerald-700 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Hierarchy Dropdown Selectors (Facility, Sub Facility, Machine) */}
                  <div className="p-3 space-y-2.5 border-b border-slate-200/80 bg-white">
                    {/* Facility Select */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Facility (Plant / Site)
                      </label>
                      <select
                        value={selectedFacility}
                        onChange={(e) => {
                          setSelectedFacility(e.target.value);
                          setSelectedSubFacility('');
                          setSelectedMachine('');
                        }}
                        className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">All Facilities</option>
                        {uniqueFacilitiesList.map((fac) => (
                          <option key={fac} value={fac}>{fac}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sub Facility Select */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Sub Facility (Building / Location)
                      </label>
                      <select
                        value={selectedSubFacility}
                        onChange={(e) => {
                          setSelectedSubFacility(e.target.value);
                          setSelectedMachine('');
                        }}
                        className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">All Sub Facilities</option>
                        {availableSubFacilities.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>

                    {/* Machine Select */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Machine / Asset
                      </label>
                      <select
                        value={selectedMachine}
                        onChange={(e) => setSelectedMachine(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">All Machines</option>
                        {availableMachines.map((mac) => (
                          <option key={mac} value={mac}>{mac}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Popover Footer */}
                  <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {hasActiveFilters ? `${activeFilterCount} filter(s) active` : 'No filters applied'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* + Add New Button */}
            <button
              type="button"
              id="btn-add-new-asset"
              onClick={() => setIsCreateAssetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#00a651] hover:bg-[#009040] active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-2">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4 rounded shrink-0" />
                  <Skeleton className={`h-4 rounded ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
                </div>
              ))}
            </div>
          ) : filteredTreeData.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Filter className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">No assets match the selected filter</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Try selecting a different facility, sub-facility, machine, or category, or clear all filters.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <AssetTree
              data={filteredTreeData}
              onSelect={handleNodeClick}
              onDoubleClick={handleNodeClick}
              selectedId={selectedNode?.id || null}
              defaultExpanded={true}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              enableDragAndDrop={canManageAssets && !hasActiveFilters}
              onDropNode={(source, target) => {
                if (!canManageAssets) {
                  toast.error('You do not have permission to reassign assets.');
                  return;
                }
                setPendingMove({ source, target });
              }}
              onMove={(node) => {
                if (!canManageAssets) {
                  toast.error('You do not have permission to reassign assets.');
                  return;
                }
                setMoveModalNode(node);
              }}
              onGiveAccess={handleOpenGiveAccess}
            />
          )}
        </div>
      </div>

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
                onClick={() => !isMoving && setPendingMove(null)}
                disabled={isMoving}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
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
                      ) : pendingMove.target.type === 'facility' ? (
                        <Building className="w-3.5 h-3.5 text-blue-600" />
                      ) : pendingMove.target.type === 'building' ? (
                        <Building className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Cpu className="w-3.5 h-3.5 text-orange-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informational Callout */}
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
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                disabled={isMoving}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-75"
              >
                {isMoving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Moving Asset...
                  </>
                ) : (
                  'Confirm & Move'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup */}
      {detailsNode && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setDetailsNode(null);
            navigate('.', { replace: true, state: { ...location.state, detailId: null } });
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setDetailsNode(null);
                navigate('.', { replace: true, state: { ...location.state, detailId: null } });
              }}
              className="absolute top-4 right-4 z-50 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors shadow-sm"
            >
              <X size={18} className="text-gray-700" />
            </button>
            <div className="flex-1 overflow-hidden">
              <AssetDetails
                node={detailsNode}
                onRefresh={fetchData}
                onMoveNode={(node) => {
                  setDetailsNode(null);
                  setMoveModalNode(node);
                }}
                onGiveAccess={handleOpenGiveAccess}
              />
            </div>
          </div>
        </div>
      )}

      {/* Direct Move Asset Modal */}
      <MoveAssetModal
        isOpen={!!moveModalNode}
        sourceNode={moveModalNode}
        onClose={() => setMoveModalNode(null)}
        onSuccess={() => {
          setMoveModalNode(null);
          fetchData();
        }}
      />

      {/* Give Access Modal for Any Selected Facility or Machine */}
      {giveAccessTarget && (
        <GiveAccessModal
          isOpen={!!giveAccessTarget}
          onClose={() => setGiveAccessTarget(null)}
          targetType={giveAccessTarget.type}
          targetId={giveAccessTarget.id}
          targetName={giveAccessTarget.name}
          targetCode={giveAccessTarget.code}
          targetCategory={giveAccessTarget.category}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* Create New Asset Selection Modal */}
      <CreateAssetModal
        isOpen={isCreateAssetModalOpen}
        onClose={() => setIsCreateAssetModalOpen(false)}
      />

      {/* Bulk Import Assets Modal */}
      {isImportModalOpen && (
        <ImportAssetsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            fetchData();
          }}
          existingTreeData={treeData}
        />
      )}
    </div>
  );
}
