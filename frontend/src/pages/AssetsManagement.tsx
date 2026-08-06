import { useState, useEffect } from 'react';
import { AssetTree } from '../components/AssetTree';
import type { TreeNodeData } from '../components/AssetTree';
import { AssetDetails } from '../components/AssetDetails';
import { api } from '../lib/api';
import { Skeleton } from '../components/ui/Skeleton';
import { X } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export function AssetsManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [detailsNode, setDetailsNode] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all required data
      const [societiesRes, buildingsRes, machinesRes, mainFacilitiesRes, facilitiesRes] = await Promise.all([
        api.get('/societies').catch(() => ({ data: [] })),
        api.get('/buildings').catch(() => ({ data: [] })),
        api.get('/machines').catch(() => ({ data: [] })),
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
      ]);

      let societies = Array.isArray(societiesRes.data) ? societiesRes.data : [];
      let buildings = Array.isArray(buildingsRes.data) ? buildingsRes.data : [];
      let machines = Array.isArray(machinesRes.data) ? machinesRes.data : [];
      let mainFacilities = Array.isArray(mainFacilitiesRes.data) ? mainFacilitiesRes.data : [];
      let facilities = Array.isArray(facilitiesRes.data) ? facilitiesRes.data : [];

      if (user?.role !== 'SUPER_ADMIN') {
        if (user?.mainFacilityId) {
          mainFacilities = mainFacilities.filter((mf: any) => mf.id === user.mainFacilityId);
          // Only show facilities that belong to this main facility
          facilities = facilities.filter((f: any) => f.mainFacilityId === user.mainFacilityId);
          societies = [];
          buildings = [];
        } else if (user?.societyId) {
          societies = societies.filter((s: any) => s.id === user.societyId);
          buildings = buildings.filter((b: any) => b.societyId === user.societyId);
          mainFacilities = [];
          facilities = [];
        } else {
          // Operator/Viewer fallback: only show facilities/buildings where they actually have assigned machines
          const assignedFacilityIds = new Set(machines.map((m: any) => m.facilityId).filter(Boolean));
          const assignedBuildingIds = new Set(machines.map((m: any) => m.buildingId).filter(Boolean));
          
          facilities = facilities.filter((f: any) => assignedFacilityIds.has(f.id));
          buildings = buildings.filter((b: any) => assignedBuildingIds.has(b.id));

          // Retain mainFacilities that are parents to the retained facilities
          const activeMainFacIds = new Set(facilities.map((f: any) => f.mainFacilityId).filter(Boolean));
          mainFacilities = mainFacilities.filter((mf: any) => activeMainFacIds.has(mf.id));

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

      // We will build two main branches for this demonstration:
      // 1. Societies -> Buildings -> Devices
      // 2. Main Facilities -> Facilities (Nested)

      const finalTree: TreeNodeData[] = [];

      // Branch 1: Societies Hierarchy
      const societyNodes: TreeNodeData[] = societies.map((soc: any) => ({
        id: `soc-${soc.id}`,
        name: soc.name,
        type: 'society',
        originalData: soc,
        children: []
      }));

      // Attach Buildings to Societies
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

        // Attach building to society
        const socParent = societyNodes.find(s => s.originalData.id === bldg.societyId);
        if (socParent) {
          socParent.children!.push(bldgNode);
        } else {
          // If no society found, just add at root for this branch
          finalTree.push(bldgNode); 
        }
      });

      // Add societies to tree
      finalTree.push(...societyNodes);

      // Branch 2: Facilities Hierarchy
      const mainFacNodes: TreeNodeData[] = mainFacilities.map((mf: any) => ({
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
          const mainFacParent = mainFacNodes.find(mf => mf.originalData.id === fac.mainFacilityId);
          if (mainFacParent) {
            mainFacParent.children!.push(node);
          } else {
            finalTree.push(node);
          }
        } else {
          finalTree.push(node);
        }

        // Attach Root Machines to Facilities
        rootMachines.forEach((macNode) => {
          if (macNode.originalData.facilityId === fac.id) {
            node.children!.push(macNode);
          }
        });
      });

      // Add main facilities to tree
      finalTree.push(...mainFacNodes);

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
    } catch (error) {
      console.error('Error fetching asset data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8">
      {/* Tree Container */}
      <div className="w-full max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-lg font-bold text-gray-900">All Assets</h2>
          <p className="text-sm text-gray-500">Double-click an asset to view its details</p>
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
          ) : (
            <AssetTree 
              data={treeData} 
              onSelect={setSelectedNode} 
              onDoubleClick={setDetailsNode}
              selectedId={selectedNode?.id || null} 
            />
          )}
        </div>
      </div>

      {/* Modal Popup */}
      {detailsNode && (
        <div 
          className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDetailsNode(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setDetailsNode(null)}
              className="absolute top-4 right-4 z-50 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors shadow-sm"
            >
              <X size={18} className="text-gray-700" />
            </button>
            <div className="flex-1 overflow-hidden">
              <AssetDetails node={detailsNode} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
