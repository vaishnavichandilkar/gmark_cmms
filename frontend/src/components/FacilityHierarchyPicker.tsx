import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { api } from '../lib/api';
import { AssetTree } from './AssetTree';
import type { TreeNodeData } from './AssetTree';

interface FacilityHierarchyPickerProps {
  name: string;
  value: string; // The selected facility ID
  onChange: (e: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showSocietiesAndBuildings?: boolean;
  filterByMainFacilityId?: string;
  defaultExpanded?: boolean;
  selectableTypes?: string[];
}

export function FacilityHierarchyPicker({
  name,
  value,
  onChange,
  placeholder = "Select Facility",
  disabled = false,
  className = "",
  showSocietiesAndBuildings = true,
  filterByMainFacilityId,
  defaultExpanded = false,
  selectableTypes
}: FacilityHierarchyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterByMainFacilityId, value]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [societiesRes, buildingsRes, mainFacRes, facRes] = await Promise.all([
        showSocietiesAndBuildings ? api.get('/societies').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        showSocietiesAndBuildings ? api.get('/buildings').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] }))
      ]);

      let societies = Array.isArray(societiesRes.data) ? societiesRes.data : [];
      let buildings = Array.isArray(buildingsRes.data) ? buildingsRes.data : [];
      let mainFacilities = Array.isArray(mainFacRes.data) ? mainFacRes.data : [];
      let facilities = Array.isArray(facRes.data) ? facRes.data : [];

      if (filterByMainFacilityId) {
        mainFacilities = mainFacilities.filter((mf: any) => mf.id.toString() === filterByMainFacilityId);
        facilities = facilities.filter((fac: any) => fac.mainFacilityId?.toString() === filterByMainFacilityId);
        // We also clear societies and buildings if we are filtering by main facility
        societies = [];
        buildings = [];
      }

      // Find initial display value if there's a selected value
      if (value) {
        const selectedMf = mainFacilities.find(m => m.id.toString() === value);
        const selectedFac = facilities.find(f => f.id.toString() === value);
        
        if (selectedMf) {
          setDisplayValue(selectedMf.mainFacilityName);
        } else if (selectedFac) {
          setDisplayValue(selectedFac.facilityName);
        }
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
        const bldgNode: TreeNodeData = {
          id: `bldg-${bldg.id}`,
          name: bldg.name,
          type: 'building',
          originalData: bldg,
          children: []
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
      const mfNodesWithPrefix = mainFacilities.map((mf: any) => ({
        id: `mf-${mf.id}`,
        name: mf.mainFacilityName,
        type: 'mainFacility',
        originalData: mf,
        children: []
      }));

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
        if (fac.parentFacilityId && facMap[fac.parentFacilityId]) {
          facMap[fac.parentFacilityId].children!.push(node);
        } else if (fac.mainFacilityId) {
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
      setTreeData(finalTree);

      // Restore selected node in tree if value exists
      if (value) {
        const initialSelectedMf = mfNodesWithPrefix.find(mf => mf.originalData.id.toString() === value);
        if (initialSelectedMf) setSelectedNode(initialSelectedMf);
        else {
          const initialSelectedFac = Object.values(facMap).find(fac => fac.originalData.id.toString() === value);
          if (initialSelectedFac) setSelectedNode(initialSelectedFac);
          else {
            const initialSelectedSoc = societyNodes.find(soc => soc.originalData.id.toString() === value);
            if (initialSelectedSoc) setSelectedNode(initialSelectedSoc);
            else {
              // We'd have to search buildings too
              let found = false;
              societyNodes.forEach(s => {
                const bldg = s.children?.find(b => b.originalData.id.toString() === value);
                if (bldg) { setSelectedNode(bldg); found = true; }
              });
              if (!found) {
                finalTree.forEach(n => {
                  if (n.type === 'building' && n.originalData.id.toString() === value) {
                    setSelectedNode(n);
                  }
                });
              }
            }
          }
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
          value: selectedNode.originalData.id.toString(),
          dataset: { type: selectedNode.type }
        }
      });
      setDisplayValue(selectedNode.name);
    } else {
      onChange({
        target: {
          name,
          value: '',
          dataset: { type: '' }
        }
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
        <div className={`w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm transition-all focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 ${!displayValue ? 'text-gray-400' : 'text-gray-900'}`}>
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
