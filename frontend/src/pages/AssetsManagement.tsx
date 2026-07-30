import { useState, useEffect } from 'react';
import { AssetTree } from '../components/AssetTree';
import type { TreeNodeData } from '../components/AssetTree';
import { AssetDetails } from '../components/AssetDetails';
import { api } from '../lib/api';
import { Skeleton } from '../components/ui/Skeleton';

export function AssetsManagement() {
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all required data
      const [societiesRes, buildingsRes, devicesRes, mainFacilitiesRes, facilitiesRes] = await Promise.all([
        api.get('/societies').catch(() => ({ data: [] })),
        api.get('/buildings').catch(() => ({ data: [] })),
        api.get('/devices').catch(() => ({ data: [] })),
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
      ]);

      const societies = Array.isArray(societiesRes.data) ? societiesRes.data : [];
      const buildings = Array.isArray(buildingsRes.data) ? buildingsRes.data : [];
      const devices = Array.isArray(devicesRes.data) ? devicesRes.data : [];
      const mainFacilities = Array.isArray(mainFacilitiesRes.data) ? mainFacilitiesRes.data : [];
      const facilities = Array.isArray(facilitiesRes.data) ? facilitiesRes.data : [];

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
        
        // Attach Devices to Buildings
        devices.forEach((dev: any) => {
          // Device might have building name or building id depending on endpoint response format
          // The device endpoint returns 'building' string or building object.
          // Adjusting based on standard device response
          if (dev.building === bldg.name || dev.buildingId === bldg.id) {
            bldgNode.children!.push({
              id: `dev-${dev.id}`,
              name: dev.name || dev.systemName || dev.deviceId,
              type: 'device',
              originalData: dev
            });
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

        // Attach Devices to Facilities
        devices.forEach((dev: any) => {
          if (dev.facilityId === fac.id) {
            node.children!.push({
              id: `dev-${dev.id}`,
              name: dev.name || dev.systemName || dev.deviceId,
              type: 'device',
              originalData: dev
            });
          }
        });
      });

      // Add main facilities to tree
      finalTree.push(...mainFacNodes);

      setTreeData(finalTree);
    } catch (error) {
      console.error('Error fetching asset data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white -m-4 sm:-m-6 md:-m-8">
      {/* Left Sidebar - Tree */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 h-full">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="font-bold text-gray-900">All Assets</h2>
        </div>
        <div className="flex-1 overflow-hidden">
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
              selectedId={selectedNode?.id || null} 
            />
          )}
        </div>
      </div>

      {/* Right Content - Details */}
      <div className="flex-1 overflow-hidden">
        <AssetDetails node={selectedNode} />
      </div>
    </div>
  );
}
