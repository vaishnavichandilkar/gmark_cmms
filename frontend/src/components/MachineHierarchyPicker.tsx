import React, { useState, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { api } from '../lib/api';
import { AssetTree } from './AssetTree';
import type { TreeNodeData } from './AssetTree';

interface MachineHierarchyPickerProps {
  name: string;
  value: string; // The selected device ID
  onChange: (e: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  excludeDeviceId?: string; // ID of the machine to exclude from being a parent
  filterByCompany?: string;
  filterByLocationId?: string;
}

export function MachineHierarchyPicker({
  name,
  value,
  onChange,
  placeholder = "Select Machine",
  disabled = false,
  className = "",
  excludeDeviceId,
  filterByCompany,
  filterByLocationId
}: MachineHierarchyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayValue, setDisplayValue] = useState('');

  // Fetch machines when component mounts or filters change
  useEffect(() => {
    fetchData();
  }, [value, filterByCompany, filterByLocationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/machines');
      let machines = Array.isArray(res.data) ? res.data : [];

      // Filter out the current machine so it can't be its own parent
      if (excludeDeviceId) {
        machines = machines.filter((m: any) => m.id.toString() !== excludeDeviceId);
      }

      // Filter by company (Facility)
      if (filterByCompany) {
        machines = machines.filter((m: any) => m.company === filterByCompany);
      }

      // Filter by location (Sub-Facility)
      if (filterByLocationId) {
        machines = machines.filter((m: any) => 
          m.facilityId?.toString() === filterByLocationId || 
          m.buildingId?.toString() === filterByLocationId
        );
      }

      // Find initial display value if there's a selected value
      if (value) {
        const selectedDev = machines.find((m: any) => m.id.toString() === value);
        if (selectedDev) {
          setDisplayValue(selectedDev.name);
        }
      }

      // Build tree
      const machineMap: Record<number, TreeNodeData> = {};
      
      // Initialize map
      machines.forEach((mac: any) => {
        machineMap[mac.id] = {
          id: `mac-${mac.id}`,
          name: mac.name,
          type: 'device',
          originalData: mac,
          children: []
        };
      });

      const finalTree: TreeNodeData[] = [];

      // Build hierarchy
      machines.forEach((mac: any) => {
        const node = machineMap[mac.id];
        if (mac.parentMachineId && machineMap[mac.parentMachineId]) {
          machineMap[mac.parentMachineId].children!.push(node);
        } else {
          // If no parent or parent doesn't exist (e.g. excluded), it's a root node
          finalTree.push(node);
        }
      });

      setTreeData(finalTree);

      // Restore selected node in tree if value exists
      if (value) {
        const initialSelectedDev = Object.values(machineMap).find(mac => mac.originalData.id.toString() === value);
        if (initialSelectedDev) {
          setSelectedNode(initialSelectedDev);
        }
      }

    } catch (error) {
      console.error('Error fetching machine hierarchy', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedNode) {
      onChange({
        target: {
          name,
          value: selectedNode.originalData.id.toString()
        }
      });
      setDisplayValue(selectedNode.name);
    } else {
      onChange({
        target: {
          name,
          value: ''
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
              <h2 className="text-lg font-bold text-gray-900">Select Parent Machine</h2>
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
                <div className="flex justify-center items-center h-full text-gray-400">Loading machines...</div>
              ) : (
                <div className="h-full border border-gray-200 rounded-xl overflow-hidden">
                  <AssetTree 
                    data={treeData} 
                    onSelect={setSelectedNode} 
                    selectedId={selectedNode?.id || null} 
                    defaultExpanded={true}
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
                className="px-6 py-2 rounded-xl text-sm font-semibold bg-[#00a651] text-white hover:bg-[#009040] transition-colors"
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
