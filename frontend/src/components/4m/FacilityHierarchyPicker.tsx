import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, X, Building2, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { AssetTree } from './AssetTree';
import type { TreeNodeData } from './AssetTree';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

interface FacilityHierarchyPickerProps {
  name: string;
  value: string; // The selected facility ID
  onChange: (e: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showSocietiesAndBuildings?: boolean;
  showDevices?: boolean;
  filterByMainFacilityId?: string;
  defaultExpanded?: boolean;
  selectableTypes?: string[];
  scopeByUser?: boolean;
  onEmptyStateAdd?: () => void;
}

export function FacilityHierarchyPicker({
  name,
  value,
  onChange,
  placeholder = "Select Facility",
  disabled = false,
  className = "",
  showSocietiesAndBuildings = true,
  showDevices = false,
  filterByMainFacilityId,
  defaultExpanded = false,
  selectableTypes,
  scopeByUser = false,
  onEmptyStateAdd
}: FacilityHierarchyPickerProps) {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterByMainFacilityId, value]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [societiesRes, buildingsRes, mainFacRes, facRes, devRes, machRes] = await Promise.all([
        showSocietiesAndBuildings ? api.get('/societies').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        showSocietiesAndBuildings ? api.get('/buildings').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
        showDevices ? api.get('/devices').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        showDevices ? api.get('/machines').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);

      let societies = Array.isArray(societiesRes.data) ? societiesRes.data : [];
      let buildings = Array.isArray(buildingsRes.data) ? buildingsRes.data : [];
      let mainFacilities = Array.isArray(mainFacRes.data) ? mainFacRes.data : [];
      let facilities = Array.isArray(facRes.data) ? facRes.data : [];
      let rawDevices = Array.isArray(devRes.data) ? devRes.data : [];
      let rawMachines = Array.isArray(machRes.data) ? machRes.data : [];

      if (scopeByUser && user?.role !== 'SUPER_ADMIN') {
        if (user?.deviceId) {
          rawMachines = rawMachines.filter((m: any) => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
          rawDevices = rawDevices.filter((d: any) => d.deviceId === user.deviceId || d.id?.toString() === user.deviceId);
          mainFacilities = [];
          facilities = [];
          societies = [];
          buildings = [];
        } else if (user?.facilityId) {
          const targetFacilityId = Number(user.facilityId);
          const allowedFacilityIds = new Set<number>([targetFacilityId]);

          let added = true;
          while (added) {
            added = false;
            facilities.forEach((f: any) => {
              if (f.parentFacilityId && allowedFacilityIds.has(f.parentFacilityId) && !allowedFacilityIds.has(f.id)) {
                allowedFacilityIds.add(f.id);
                added = true;
              }
            });
          }

          facilities = facilities.filter((f: any) => allowedFacilityIds.has(f.id));
          rawMachines = rawMachines.filter((m: any) => m.facilityId && allowedFacilityIds.has(m.facilityId));
          rawDevices = rawDevices.filter((d: any) => d.facilityId && allowedFacilityIds.has(d.facilityId));
          mainFacilities = [];
          societies = [];
          buildings = [];
        } else if (user?.mainFacilityId) {
          mainFacilities = mainFacilities.filter((mf: any) => mf.id === user.mainFacilityId);
          facilities = facilities.filter((f: any) => f.mainFacilityId === user.mainFacilityId);
          societies = [];
          buildings = [];
        } else if (user?.societyId) {
          societies = societies.filter((s: any) => s.id === user.societyId);
          buildings = buildings.filter((b: any) => b.societyId === user.societyId);
          mainFacilities = [];
          facilities = [];
        }
      }

      if (filterByMainFacilityId) {
        mainFacilities = mainFacilities.filter((mf: any) => mf.id.toString() === filterByMainFacilityId);
        facilities = facilities.filter((fac: any) => fac.mainFacilityId?.toString() === filterByMainFacilityId);
        // We also clear societies and buildings if we are filtering by main facility
        societies = [];
        buildings = [];
      }

      // Build tree
      const finalTree: TreeNodeData[] = [];

      // Branch 1: Societies Hierarchy
      const societyNodes: TreeNodeData[] = societies.map((soc: any) => ({
        id: `soc-${soc.id}`,
        name: soc.name,
        type: 'society',
        originalData: soc,
        children: []
      }));

      buildings.forEach((bldg: any) => {
        const bldgDevicesList: any[] = [];
        if (showDevices) {
          rawDevices.forEach((d: any) => {
            if (d.buildingId === bldg.id) {
              bldgDevicesList.push({
                ...d,
                isMachine: false,
                facilityId: null,
                mainFacilityId: null,
                buildingId: bldg.id,
                societyId: bldg.societyId,
                deviceId: d.deviceId,
                name: d.name
              });
            }
          });
          rawMachines.forEach((m: any) => {
            if (m.buildingId === bldg.id) {
              if (!bldgDevicesList.some(d => d.deviceId && d.deviceId === m.deviceId)) {
                bldgDevicesList.push({
                  ...m,
                  isMachine: true,
                  facilityId: null,
                  mainFacilityId: null,
                  buildingId: bldg.id,
                  societyId: bldg.societyId,
                  deviceId: m.deviceId,
                  name: m.name
                });
              }
            }
          });
        }

        const deviceChildren: TreeNodeData[] = bldgDevicesList.map((devItem: any) => ({
          id: `dev-${devItem.id}-${devItem.deviceId || ''}`,
          name: devItem.name || devItem.deviceId || 'Device',
          type: 'device',
          originalData: devItem,
          children: []
        }));

        const bldgNode: TreeNodeData = {
          id: `bldg-${bldg.id}`,
          name: bldg.name,
          type: 'building',
          originalData: bldg,
          children: deviceChildren
        };

        const socParent = societyNodes.find(s => s.originalData.id === bldg.societyId);
        if (socParent) {
          socParent.children!.push(bldgNode);
        } else {
          finalTree.push(bldgNode);
        }
      });
      finalTree.push(...societyNodes);

      // Branch 2: Facilities Hierarchy
      const mfNodesWithPrefix: TreeNodeData[] = mainFacilities.map((mf: any) => ({
        id: `mf-${mf.id}`,
        name: mf.mainFacilityName,
        type: 'mainFacility' as const,
        originalData: mf,
        children: []
      }));

      const facMap: Record<number, TreeNodeData> = {};
      facilities.forEach((fac: any) => {
        const facDevicesList: any[] = [];
        if (showDevices) {
          rawMachines.forEach((m: any) => {
            if (m.facilityId === fac.id) {
              facDevicesList.push({
                ...m,
                isMachine: true,
                facilityId: fac.id,
                mainFacilityId: fac.mainFacilityId,
                buildingId: null,
                societyId: null,
                deviceId: m.deviceId,
                name: m.name
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
                  buildingId: null,
                  societyId: null,
                  deviceId: d.deviceId,
                  name: d.name
                });
              }
            }
          });
        }

        const deviceChildren: TreeNodeData[] = facDevicesList.map((devItem: any) => ({
          id: `dev-${devItem.id}-${devItem.deviceId || ''}`,
          name: devItem.name || devItem.deviceId || 'Device',
          type: 'device',
          originalData: devItem,
          children: []
        }));

        facMap[fac.id] = {
          id: `fac-${fac.id}`,
          name: fac.facilityName,
          type: 'facility',
          originalData: fac,
          children: deviceChildren
        };
      });

      facilities.forEach((fac: any) => {
        const node = facMap[fac.id];
        if (fac.parentFacilityId && facMap[fac.parentFacilityId]) {
          facMap[fac.parentFacilityId].children!.push(node);
        } else if (fac.mainFacilityId && mfNodesWithPrefix.length > 0) {
          const mainFacParent = mfNodesWithPrefix.find(mf => mf.originalData.id === fac.mainFacilityId);
          if (mainFacParent) {
            mainFacParent.children!.push(node);
          } else {
            finalTree.push(node);
          }
        } else {
          finalTree.push(node);
        }
      });

      finalTree.push(...mfNodesWithPrefix);

      // Direct machines/devices if device-restricted or standalone
      if ((scopeByUser && user?.deviceId) || (facilities.length === 0 && buildings.length === 0 && mainFacilities.length === 0 && societies.length === 0)) {
        rawMachines.forEach((m: any) => {
          const devNode: TreeNodeData = {
            id: `dev-${m.id}-${m.deviceId || ''}`,
            name: m.name || m.deviceId || 'Device',
            type: 'device',
            originalData: m,
            children: []
          };
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

      // Restore selected node in tree if value exists
      if (value) {
        const findNode = (nodes: TreeNodeData[]): TreeNodeData | undefined => {
          for (const n of nodes) {
            if (
              n.originalData?.id?.toString() === value ||
              n.originalData?.deviceId === value ||
              n.id === value ||
              n.name === value
            ) {
              if (!selectableTypes || selectableTypes.includes(n.type)) {
                return n;
              }
            }
            if (n.children && n.children.length > 0) {
              const res = findNode(n.children);
              if (res) return res;
            }
          }
          return undefined;
        };

        const initialSelected = findNode(finalTree);
        if (initialSelected) {
          setSelectedNode(initialSelected);
          setDisplayValue(initialSelected.name);
        }
      }

    } catch (error) {
      console.error('Error fetching facility hierarchy', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedNode) {
      onChange({
        target: {
          name,
          value: selectedNode.type === 'device' && selectedNode.originalData?.deviceId
            ? selectedNode.originalData.deviceId
            : selectedNode.originalData?.id?.toString() || '',
          dataset: {
            type: selectedNode.type,
            id: selectedNode.originalData?.id?.toString() || '',
            deviceId: selectedNode.originalData?.deviceId || '',
            name: selectedNode.name,
            facilityId: selectedNode.originalData?.facilityId?.toString() || '',
            mainFacilityId: selectedNode.originalData?.mainFacilityId?.toString() || '',
            buildingId: selectedNode.originalData?.buildingId?.toString() || '',
            societyId: selectedNode.originalData?.societyId?.toString() || '',
          }
        },
        selectedNode
      });
      setDisplayValue(selectedNode.name);
    } else {
      onChange({
        target: {
          name,
          value: '',
          dataset: { type: '' }
        },
        selectedNode: null
      });
      setDisplayValue('');
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Dropdown Trigger */}
      <div 
        className={`relative w-full ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <div className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg transition-all focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 ${!displayValue ? 'text-gray-500' : 'text-gray-900'}`}>
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronDown size={18} className="text-gray-400" />
        </div>
      </div>

      {/* Modal Popup */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Select Facility Hierarchy</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Tree */}
            <div className="flex-1 overflow-hidden p-2 bg-white min-h-[300px]">
              {loading ? (
                <div className="flex justify-center items-center h-full text-gray-400">Loading hierarchy...</div>
              ) : treeData.length === 0 ? (
                <div className="h-full border border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 text-center bg-gray-50/50">
                  <div className="w-12 h-12 bg-white border border-gray-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <Building2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-700 mb-1">No Facilities Found</h3>
                  <p className="text-xs text-gray-500 mb-4 max-w-xs">There are no facilities configured in the system yet.</p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if (onEmptyStateAdd) {
                        onEmptyStateAdd();
                      } else if (selectableTypes?.includes('mainFacility') || name === 'company') {
                        navigate('/master/main-facility/new');
                      } else {
                        navigate('/master/facility/new');
                      }
                    }}
                    className="px-4 py-2 bg-[#00a651] text-white text-sm font-medium rounded-lg hover:bg-[#009040] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} /> Add Facility
                  </button>
                </div>
              ) : (
                <div className="h-full border border-gray-200 rounded-xl overflow-hidden">
                  <AssetTree 
                    data={treeData} 
                    onSelect={setSelectedNode} 
                    selectedId={selectedNode?.id || null} 
                    defaultExpanded={defaultExpanded}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                disabled={!selectedNode || (selectableTypes && !selectableTypes.includes(selectedNode.type))}
                className="px-6 py-2 rounded-xl text-sm font-semibold bg-[#00a651] text-white hover:bg-[#009040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
