import React, { useState, useEffect } from 'react';
import { ChevronDown, X, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AssetTree } from './AssetTree';
import type { TreeNodeData } from './AssetTree';

interface EmployeeHierarchyPickerProps {
  name: string;
  value: string; // The selected employee full name
  onChange: (e: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onEmptyStateAdd?: () => void;
}

export function EmployeeHierarchyPicker({
  name,
  value,
  onChange,
  placeholder = "Select Employee",
  disabled = false,
  className = "",
  onEmptyStateAdd
}: EmployeeHierarchyPickerProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayValue, setDisplayValue] = useState(value || '');

  // Keep displayValue in sync with value prop
  useEffect(() => {
    setDisplayValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isOpen && treeData.length === 0) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees');
      const employees = Array.isArray(res.data) ? res.data : [];

      const finalTree: TreeNodeData[] = [];
      const deptMap: Record<string, TreeNodeData> = {};
      const desigMap: Record<string, TreeNodeData> = {};

      employees.forEach((emp: any) => {
        const deptName = emp.department || 'Unassigned Department';
        const desigName = emp.designation || emp.role || 'Unassigned Designation';

        // 1. Create or get Department Node
        if (!deptMap[deptName]) {
          deptMap[deptName] = {
            id: `dept-${deptName}`,
            name: deptName,
            type: 'department',
            originalData: { name: deptName },
            children: []
          };
          finalTree.push(deptMap[deptName]);
        }

        const deptNode = deptMap[deptName];
        const desigKey = `${deptName}-${desigName}`;

        // 2. Create or get Designation Node under Department
        if (!desigMap[desigKey]) {
          desigMap[desigKey] = {
            id: `desig-${desigKey}`,
            name: desigName,
            type: 'designation',
            originalData: { name: desigName },
            children: []
          };
          deptNode.children!.push(desigMap[desigKey]);
        }

        const desigNode = desigMap[desigKey];

        // 3. Add Employee Node under Designation
        desigNode.children!.push({
          id: `emp-${emp.id}`,
          name: emp.fullName,
          type: 'employee',
          originalData: emp,
          children: []
        });
      });

      // Sort departments, then designations alphabetically
      finalTree.sort((a, b) => a.name.localeCompare(b.name));
      finalTree.forEach(dept => {
        dept.children?.sort((a, b) => a.name.localeCompare(b.name));
      });

      setTreeData(finalTree);

      // Restore selected node if value exists
      if (value) {
        let foundNode: TreeNodeData | null = null;
        finalTree.forEach(dept => {
          dept.children?.forEach(desig => {
            desig.children?.forEach(empNode => {
              if (empNode.originalData.fullName === value) {
                foundNode = empNode;
              }
            });
          });
        });
        if (foundNode) {
          setSelectedNode(foundNode);
        }
      }

    } catch (error) {
      console.error('Error fetching employee hierarchy', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    // Only allow confirming if an employee is selected
    if (selectedNode && selectedNode.type === 'employee') {
      onChange({
        target: {
          name,
          value: selectedNode.originalData.fullName
        }
      });
      setDisplayValue(selectedNode.originalData.fullName);
      setIsOpen(false);
    } else if (!selectedNode) {
       // Allow clearing the selection
       onChange({
        target: {
          name,
          value: ''
        }
      });
      setDisplayValue('');
      setIsOpen(false);
    }
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
              <div>
                <h2 className="text-lg font-bold text-gray-900">Select Employee</h2>
                <p className="text-xs text-gray-500 mt-0.5">Please select a specific employee from the hierarchy.</p>
              </div>
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
                <div className="flex justify-center items-center h-full text-gray-400">
                  <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : treeData.length === 0 ? (
                <div className="h-full border border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 text-center bg-gray-50/50">
                  <div className="w-12 h-12 bg-white border border-gray-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <UserPlus className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-700 mb-1">No Employees Found</h3>
                  <p className="text-xs text-gray-500 mb-4 max-w-xs">There are no employees configured in the system yet.</p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if (onEmptyStateAdd) {
                        onEmptyStateAdd();
                      } else {
                        navigate('/master/employee/new');
                      }
                    }}
                    className="px-4 py-2 bg-[#00a651] text-white text-sm font-medium rounded-lg hover:bg-[#009040] transition-colors flex items-center gap-2"
                  >
                    <UserPlus size={16} /> Add Employee
                  </button>
                </div>
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
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="text-sm font-medium">
                {selectedNode ? (
                  selectedNode.type === 'employee' ? (
                     <span className="text-green-600 flex items-center gap-2">✓ Selected: {selectedNode.name}</span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-2">⚠ Please select an employee (not a {selectedNode.type})</span>
                  )
                ) : (
                  <span className="text-gray-500">No selection</span>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={selectedNode && selectedNode.type !== 'employee'}
                  className="px-6 py-2 rounded-xl text-sm font-semibold bg-[#00a651] text-white hover:bg-[#009040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
