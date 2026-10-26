import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Building2, Building, Cpu, Globe, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { AssetTree } from './AssetTree';
import type { TreeNodeData } from './AssetTree';

export interface InlineFacilityHierarchyTreeProps {
  value: string;
  onChange?: (e: any) => void;
  onClear?: () => void;
  isViewMode?: boolean;
  className?: string;
}

export function InlineFacilityHierarchyTree({
  value,
  onChange,
  onClear,
  isViewMode = false,
  className = '',
}: InlineFacilityHierarchyTreeProps) {
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultExpanded, setDefaultExpanded] = useState(true);

  const findSelectedNode = (nodes: TreeNodeData[], val: string): TreeNodeData | undefined => {
    if (!val) return undefined;
    const valStr = val.toString().trim();
    const normalizedVal = valStr.startsWith('f-') && !valStr.startsWith('fac-')
      ? `fac-${valStr.slice(2)}`
      : valStr;
    const cleanVal = valStr.replace(/^(fac-|mf-|f-|bldg-|soc-|dev-)/, '');

    for (const n of nodes) {
      const matchesId = n.id === valStr || n.id === normalizedVal;
      const matchesRawId = n.originalData?.id?.toString() === valStr || n.originalData?.id?.toString() === cleanVal;
      const matchesDeviceId = n.originalData?.deviceId === valStr;
      const matchesName = n.name === valStr;

      if (matchesId || matchesDeviceId || matchesRawId || matchesName) {
        return n;
      }
      if (n.children && n.children.length > 0) {
        const res = findSelectedNode(n.children, val);
        if (res) return res;
      }
    }
    return undefined;
  };

  const fetchTree = async () => {
    try {
      setLoading(true);
      const [mainFacRes, facRes, devRes, machRes] = await Promise.all([
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
        api.get('/devices').catch(() => ({ data: [] })),
        api.get('/machines').catch(() => ({ data: [] })),
      ]);

      const mainFacilities = Array.isArray(mainFacRes.data) ? mainFacRes.data : [];
      const facilities = Array.isArray(facRes.data) ? facRes.data : [];
      const rawDevices = Array.isArray(devRes.data) ? devRes.data : [];
      const rawMachines = Array.isArray(machRes.data) ? machRes.data : [];

      const mfNodesWithPrefix: TreeNodeData[] = mainFacilities.map((mf: any) => ({
        id: `mf-${mf.id}`,
        name: mf.mainFacilityName,
        type: 'mainFacility' as const,
        originalData: mf,
        children: [],
      }));

      const facMap: Record<number, TreeNodeData> = {};
      facilities.forEach((fac: any) => {
        const facDevicesList: any[] = [];
        rawMachines.forEach((m: any) => {
          if (m.facilityId === fac.id) {
            facDevicesList.push({
              ...m,
              isMachine: true,
              facilityId: fac.id,
              mainFacilityId: fac.mainFacilityId,
              deviceId: m.deviceId,
              name: m.name,
            });
          }
        });
        rawDevices.forEach((d: any) => {
          if (d.facilityId === fac.id) {
            if (!facDevicesList.some(m => m.deviceId && m.deviceId === d.deviceId)) {
              facDevicesList.push({
                ...d,
                isMachine: false,
                facilityId: fac.id,
                mainFacilityId: fac.mainFacilityId,
                deviceId: d.deviceId,
                name: d.name,
              });
            }
          }
        });

        const deviceChildren: TreeNodeData[] = facDevicesList.map((devItem: any) => ({
          id: `dev-${devItem.id}-${devItem.deviceId || ''}`,
          name: devItem.name || devItem.deviceId || 'Device',
          type: 'device',
          originalData: devItem,
          children: [],
        }));

        facMap[fac.id] = {
          id: `fac-${fac.id}`,
          name: fac.facilityName,
          type: 'facility',
          originalData: fac,
          children: deviceChildren,
        };
      });

      const rootNodes: TreeNodeData[] = [];
      facilities.forEach((fac: any) => {
        const node = facMap[fac.id];
        if (fac.parentFacilityId && facMap[fac.parentFacilityId]) {
          facMap[fac.parentFacilityId].children!.push(node);
        } else if (fac.mainFacilityId && mfNodesWithPrefix.length > 0) {
          const mainFacParent = mfNodesWithPrefix.find(mf => mf.originalData.id === fac.mainFacilityId);
          if (mainFacParent) {
            mainFacParent.children!.push(node);
          } else {
            rootNodes.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      });

      rootNodes.push(...mfNodesWithPrefix);

      // Standalone machines if no facilities
      if (facilities.length === 0 && mainFacilities.length === 0) {
        rawMachines.forEach((m: any) => {
          rootNodes.push({
            id: `dev-${m.id}-${m.deviceId || ''}`,
            name: m.name || m.deviceId || 'Device',
            type: 'device',
            originalData: m,
            children: [],
          });
        });
      }

      setTreeData(rootNodes);
    } catch (err) {
      console.error('Failed to load asset hierarchy tree:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  useEffect(() => {
    if (treeData.length > 0) {
      if (value) {
        const found = findSelectedNode(treeData, value);
        setSelectedNode(found || null);
      } else {
        setSelectedNode(null);
      }
    }
  }, [value, treeData]);

  const filterTreeNodes = (nodes: TreeNodeData[], query: string): TreeNodeData[] => {
    if (!query.trim()) return nodes;
    const lower = query.toLowerCase().trim();

    return nodes.reduce<TreeNodeData[]>((acc, node) => {
      const match = node.name.toLowerCase().includes(lower);
      const filteredChildren = node.children ? filterTreeNodes(node.children, query) : [];

      if (match || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
      return acc;
    }, []);
  };

  const displayedTreeData = useMemo(() => {
    if (!searchQuery.trim()) return treeData;
    return filterTreeNodes(treeData, searchQuery);
  }, [treeData, searchQuery]);

  const handleNodeClick = (node: TreeNodeData) => {
    if (isViewMode || !onChange) return;
    setSelectedNode(node);

    const event = {
      target: {
        name: 'assetHierarchyScope',
        value: node.id,
        selectedNode: node,
      },
    };
    onChange(event);
  };

  return (
    <div className={`w-full flex flex-col gap-3 ${className}`}>
      {/* Hierarchy Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-gray-200/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
            <Building2 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">Asset Hierarchy Tree</span>
              <span className="text-[10px] font-medium text-gray-500">
                {isViewMode ? '(Read-only view)' : 'Click any Facility, Sub-facility, or Machine to apply scope'}
              </span>
            </div>
          </div>
        </div>

        {/* Active Selection Badge & Reset Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedNode ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
              {selectedNode.type === 'device' ? (
                <Cpu size={12} className="text-orange-600" />
              ) : selectedNode.type === 'facility' ? (
                <Building size={12} className="text-emerald-600" />
              ) : (
                <Building2 size={12} className="text-emerald-600" />
              )}
              <span>Scope: {selectedNode.name}</span>
              <CheckCircle2 size={12} className="text-emerald-600" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
              <Globe size={12} className="text-gray-400" />
              <span>All Facilities & Machines (Global Scope)</span>
            </span>
          )}

          {!isViewMode && selectedNode && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Reset to All Facilities & Machines"
            >
              Reset Scope
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search facilities or machines in hierarchy..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 text-gray-800"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Tree Content Container */}
      <div className="border border-gray-200 rounded-xl bg-white p-2 min-h-[160px] max-h-[320px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-36 text-xs text-gray-400 gap-2">
            <RefreshCw size={14} className="animate-spin text-emerald-600" />
            <span>Loading asset hierarchy...</span>
          </div>
        ) : displayedTreeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 text-center text-gray-400">
            <Building2 size={24} className="text-gray-300 mb-1" />
            <p className="text-xs font-medium text-gray-600">No assets found</p>
            {searchQuery && <p className="text-[11px] text-gray-400">No match for "{searchQuery}"</p>}
          </div>
        ) : (
          <AssetTree
            data={displayedTreeData}
            onSelect={handleNodeClick}
            selectedId={selectedNode?.id || null}
            defaultExpanded={Boolean(searchQuery.trim()) || defaultExpanded}
          />
        )}
      </div>
    </div>
  );
}
