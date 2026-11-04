import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AssetTree, canDragNode, getAllExpandableIds } from '../../../components/4m/AssetTree';
import type { TreeNodeData } from '../../../components/4m/AssetTree';
import { AssetDetails } from '../../../components/4m/AssetDetails';
import { MoveAssetModal } from '../../../components/4m/MoveAssetModal';
import { GiveAccessModal } from '../../../components/4m/GiveAccessModal';
import { api } from '../../../lib/api';
import { Skeleton } from '../../../components/shared/ui/Skeleton';
import { X, ArrowRight, FolderInput, Loader2, AlertCircle, Building2, Building, Cpu, CheckCircle2, Shield, ChevronsDown, ChevronsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { navigateToDeviceDashboard } from '../../../utils/deviceRoutes';
import { hasAssetPermission } from '../../../utils/permissions';

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

  const handleExpandAll = () => {
    setExpandedIds(new Set(getAllExpandableIds(treeData)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
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
  }, [user]);

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
        } else if (user?.facilityId) {
          // Facility-assigned user: only see their assigned facility and all sub-facilities & machines under it
          const targetFacilityId = Number(user.facilityId);
          const allowedFacilityIds = new Set<number>([targetFacilityId]);

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

          facilities = facilities.filter((f: any) => allowedFacilityIds.has(Number(f.id)));
          machines = machines.filter((m: any) => m.facilityId && allowedFacilityIds.has(Number(m.facilityId)));
          devices = devices.filter((d: any) => d.facilityId && allowedFacilityIds.has(Number(d.facilityId)));
          mainFacilities = []; // Never show parent Main Facility (Nayabharat)
          societies = [];
          buildings = [];
        } else if (hasAssetPerms) {
          machines = machines.filter((m: any) => hasAssetPermission(user, m, 'view'));
          facilities = facilities.filter((f: any) => {
            return hasAssetPermission(user, f, 'view') ||
                   machines.some((m: any) => Number(m.facilityId) === Number(f.id));
          });
          mainFacilities = mainFacilities.filter((mf: any) => {
            return hasAssetPermission(user, mf, 'view') ||
                   facilities.some((f: any) => Number(f.mainFacilityId) === Number(mf.id)) ||
                   machines.some((m: any) => Number(m.mainFacilityId) === Number(mf.id) || m.company === String(mf.id) || m.company === mf.mainFacilityName);
          });
          societies = [];
          buildings = [];
          devices = [];
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

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8">
      {/* Tree Container */}
      <div className="w-full max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">All Assets</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Drag &amp; drop any facility or machine to reassign location • Click any asset to view details
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Expand / Collapse All Controls */}
            <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-200/80 shadow-2xs">
              <button
                type="button"
                onClick={handleExpandAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-all cursor-pointer shadow-2xs"
                title="Expand all assets in the tree"
              >
                <ChevronsDown className="w-3.5 h-3.5 text-gray-500" />
                <span>Expand All</span>
              </button>
              <div className="w-[1px] h-3.5 bg-gray-200 mx-0.5" />
              <button
                type="button"
                onClick={handleCollapseAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-all cursor-pointer shadow-2xs"
                title="Collapse all assets in the tree"
              >
                <ChevronsUp className="w-3.5 h-3.5 text-gray-500" />
                <span>Collapse All</span>
              </button>
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
            {canManageAssets && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Drag &amp; Drop Reassignment Active
              </span>
            )}
          </div>
        </div>

        {/* Quick Access Info Banner */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 border-b border-gray-100 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
              <Shield size={13} />
            </span>
            <span>
              <strong>Give Access:</strong> Click the <span className="font-semibold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-200">Access</span> button on any facility or machine node below to assign authorized users.
            </span>
          </div>
          {selectedNode && (
            <button
              type="button"
              onClick={() => handleOpenGiveAccess(selectedNode)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
            >
              <Shield size={12} />
              <span>Give Access to {selectedNode.name}</span>
            </button>
          )}
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
              onSelect={(node) => {
                setSelectedNode(node);
                if (['OPERATOR', 'VIEWER'].includes(user?.role as string) && node.type !== 'device') {
                  return;
                }
                navigate('.', { replace: true, state: { ...location.state, detailId: node.id } });
                setDetailsNode(node);
              }} 
              onDoubleClick={(node) => {
                if (['OPERATOR', 'VIEWER'].includes(user?.role as string) && node.type !== 'device') {
                  return;
                }
                navigate('.', { replace: true, state: { ...location.state, detailId: node.id } });
                setDetailsNode(node);
              }}
              selectedId={selectedNode?.id || null} 
              defaultExpanded={true}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              enableDragAndDrop={canManageAssets}
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
    </div>
  );
}
