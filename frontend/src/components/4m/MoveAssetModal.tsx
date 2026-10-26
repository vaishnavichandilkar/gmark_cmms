import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  FolderInput, 
  Loader2, 
  CheckCircle2, 
  Building2, 
  Building, 
  Cpu, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import type { TreeNodeData } from './AssetTree';

interface MoveAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceNode: TreeNodeData | null;
  onSuccess: () => void;
}

export function MoveAssetModal({
  isOpen,
  onClose,
  sourceNode,
  onSuccess,
}: MoveAssetModalProps) {
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Entities
  const [mainFacilities, setMainFacilities] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [societies, setSocieties] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  // Machine Target Mode: 'facility' | 'building' | 'machine'
  const [machineTargetMode, setMachineTargetMode] = useState<'facility' | 'building' | 'machine'>('facility');

  // Selected Destinations
  const [selectedMainFacilityId, setSelectedMainFacilityId] = useState<string>('');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedParentMachineId, setSelectedParentMachineId] = useState<string>('');

  // Facility Target Mode: 'mainFacility' | 'facility'
  const [facilityTargetMode, setFacilityTargetMode] = useState<'mainFacility' | 'facility'>('mainFacility');

  // Building Target Mode: 'society' | 'mainFacility'
  const [buildingTargetMode, setBuildingTargetMode] = useState<'society' | 'mainFacility'>('society');

  useEffect(() => {
    if (isOpen && sourceNode) {
      loadData();
      resetSelections();
    }
  }, [isOpen, sourceNode]);

  const resetSelections = () => {
    setSelectedMainFacilityId('');
    setSelectedFacilityId('');
    setSelectedSocietyId('');
    setSelectedBuildingId('');
    setSelectedParentMachineId('');
    setMachineTargetMode('facility');
    setFacilityTargetMode('mainFacility');
    setBuildingTargetMode('society');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [mfRes, fRes, sRes, bRes, mRes] = await Promise.all([
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
        api.get('/societies').catch(() => ({ data: [] })),
        api.get('/buildings').catch(() => ({ data: [] })),
        api.get('/machines').catch(() => ({ data: [] })),
      ]);
      setMainFacilities(Array.isArray(mfRes.data) ? mfRes.data : []);
      setFacilities(Array.isArray(fRes.data) ? fRes.data : []);
      setSocieties(Array.isArray(sRes.data) ? sRes.data : []);
      setBuildings(Array.isArray(bRes.data) ? bRes.data : []);
      setMachines(Array.isArray(mRes.data) ? mRes.data : []);
    } catch (err) {
      console.error('Failed to load asset destination options', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !sourceNode) return null;

  const sourceType = sourceNode.type;
  const sourceData = sourceNode.originalData;

  // Filter out self and invalid descendants
  const validFacilities = facilities.filter(f => {
    if (sourceType === 'facility') {
      if (f.id === sourceData.id) return false;
      if (f.parentFacilityId === sourceData.id) return false;
    }
    return true;
  });

  const filteredSubFacilities = validFacilities.filter(f => {
    if (!selectedMainFacilityId) return true;
    return String(f.mainFacilityId) === selectedMainFacilityId;
  });

  const filteredBuildings = buildings.filter(b => {
    if (!selectedSocietyId) return true;
    return String(b.societyId) === selectedSocietyId;
  });

  const validMachines = machines.filter(m => {
    if (sourceType === 'device') {
      return m.id !== sourceData.id && m.parentMachineId !== sourceData.id;
    }
    return true;
  });

  // Calculate destination name for preview
  const getDestinationSummary = (): { name: string; type: string } | null => {
    if (sourceType === 'device') {
      if (machineTargetMode === 'facility') {
        if (selectedFacilityId) {
          const f = facilities.find(fac => String(fac.id) === selectedFacilityId);
          return f ? { name: f.facilityName, type: 'Facility / Sub-Facility' } : null;
        }
        if (selectedMainFacilityId) {
          const mf = mainFacilities.find(m => String(m.id) === selectedMainFacilityId);
          return mf ? { name: mf.mainFacilityName, type: 'Main Facility' } : null;
        }
      } else if (machineTargetMode === 'building') {
        if (selectedBuildingId) {
          const b = buildings.find(bldg => String(bldg.id) === selectedBuildingId);
          return b ? { name: b.name, type: 'Building' } : null;
        }
        if (selectedSocietyId) {
          const s = societies.find(soc => String(soc.id) === selectedSocietyId);
          return s ? { name: s.name, type: 'Society' } : null;
        }
      } else if (machineTargetMode === 'machine') {
        if (selectedParentMachineId) {
          const m = machines.find(mac => String(mac.id) === selectedParentMachineId);
          return m ? { name: m.name, type: 'Parent Machine' } : null;
        }
      }
    } else if (sourceType === 'facility') {
      if (facilityTargetMode === 'mainFacility' && selectedMainFacilityId) {
        const mf = mainFacilities.find(m => String(m.id) === selectedMainFacilityId);
        return mf ? { name: mf.mainFacilityName, type: 'Main Facility' } : null;
      }
      if (facilityTargetMode === 'facility' && selectedFacilityId) {
        const f = facilities.find(fac => String(fac.id) === selectedFacilityId);
        return f ? { name: f.facilityName, type: 'Parent Facility' } : null;
      }
    } else if (sourceType === 'building') {
      if (buildingTargetMode === 'society' && selectedSocietyId) {
        const s = societies.find(soc => String(soc.id) === selectedSocietyId);
        return s ? { name: s.name, type: 'Society' } : null;
      }
      if (buildingTargetMode === 'mainFacility' && selectedMainFacilityId) {
        const mf = mainFacilities.find(m => String(m.id) === selectedMainFacilityId);
        return mf ? { name: mf.mainFacilityName, type: 'Main Facility' } : null;
      }
    }
    return null;
  };

  const destinationSummary = getDestinationSummary();

  const handleConfirmMove = async () => {
    if (!destinationSummary) {
      toast.error('Please select a valid destination.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Moving Machine
      if (sourceType === 'device') {
        let targetType: 'facility' | 'mainFacility' | 'building' | 'society' | 'machine';
        let targetId: number;

        if (machineTargetMode === 'facility') {
          if (selectedFacilityId) {
            targetType = 'facility';
            targetId = Number(selectedFacilityId);
          } else {
            targetType = 'mainFacility';
            targetId = Number(selectedMainFacilityId);
          }
        } else if (machineTargetMode === 'building') {
          if (selectedBuildingId) {
            targetType = 'building';
            targetId = Number(selectedBuildingId);
          } else {
            targetType = 'society';
            targetId = Number(selectedSocietyId);
          }
        } else {
          targetType = 'machine';
          targetId = Number(selectedParentMachineId);
        }

        await api.patch(`/machines/${sourceData.id}/move`, { targetType, targetId });
        toast.success(`Machine "${sourceNode.name}" successfully moved to "${destinationSummary.name}" with all details intact!`);
      } 
      // 2. Moving Facility
      else if (sourceType === 'facility') {
        let targetType: 'mainFacility' | 'facility';
        let targetId: number;

        if (facilityTargetMode === 'facility') {
          targetType = 'facility';
          targetId = Number(selectedFacilityId);
        } else {
          targetType = 'mainFacility';
          targetId = Number(selectedMainFacilityId);
        }

        await api.patch(`/facilities/${sourceData.id}/move`, { targetType, targetId });
        toast.success(`Facility "${sourceNode.name}" successfully moved to "${destinationSummary.name}"!`);
      } 
      // 3. Moving Building
      else if (sourceType === 'building') {
        const targetType = buildingTargetMode === 'mainFacility' ? 'mainFacility' : 'society';
        const targetId = buildingTargetMode === 'mainFacility' ? Number(selectedMainFacilityId) : Number(selectedSocietyId);

        await api.patch(`/buildings/${sourceData.id}/move`, { targetType, targetId });
        toast.success(`Building "${sourceNode.name}" successfully moved to "${destinationSummary.name}"!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to move asset', err);
      toast.error(err.response?.data?.message || 'Failed to move asset. Please check destination and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceIcon = () => {
    switch (sourceType) {
      case 'device':
        return <Cpu className="w-5 h-5 text-orange-600" />;
      case 'building':
        return <Building className="w-5 h-5 text-emerald-600" />;
      case 'facility':
        return <Building className="w-5 h-5 text-blue-600" />;
      default:
        return <Building2 className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => !isSubmitting && onClose()}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Move {sourceType === 'device' ? 'Machine' : sourceType === 'facility' ? 'Facility' : 'Asset'}
              </h3>
              <p className="text-xs text-gray-500">Reassign location in the asset hierarchy</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-gray-50/30">
          {/* Source Asset Card */}
          <div className="flex items-center justify-between bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                {getSourceIcon()}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Asset To Move
                </span>
                <p className="text-sm font-bold text-gray-900 truncate">{sourceNode.name}</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full capitalize shrink-0">
              {sourceType === 'device' ? 'Machine' : sourceType}
            </span>
          </div>

          {/* 1. MACHINE DESTINATION SELECTOR */}
          {sourceType === 'device' && (
            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Choose Destination Type</h4>
              </div>

              {/* Destination Mode Tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMachineTargetMode('facility')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                    machineTargetMode === 'facility'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Facility
                </button>
                <button
                  type="button"
                  onClick={() => setMachineTargetMode('building')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                    machineTargetMode === 'building'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Society / Building
                </button>
                <button
                  type="button"
                  onClick={() => setMachineTargetMode('machine')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                    machineTargetMode === 'machine'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sub-Machine
                </button>
              </div>

              {/* Mode: Facility */}
              {machineTargetMode === 'facility' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Main Facility <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedMainFacilityId}
                      onChange={(e) => {
                        setSelectedMainFacilityId(e.target.value);
                        setSelectedFacilityId('');
                      }}
                      disabled={loading || isSubmitting}
                      className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                    >
                      <option value="">-- Select Main Facility --</option>
                      {mainFacilities.map(mf => (
                        <option key={mf.id} value={mf.id}>
                          {mf.mainFacilityName} ({mf.mainFacilityCode || `MF-${mf.id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Sub-Facility (Optional)
                    </label>
                    <select
                      value={selectedFacilityId}
                      onChange={(e) => setSelectedFacilityId(e.target.value)}
                      disabled={loading || isSubmitting}
                      className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                    >
                      <option value="">
                        {selectedMainFacilityId ? '-- Assign directly to Main Facility (or select Sub-Facility) --' : '-- Choose Main Facility first --'}
                      </option>
                      {filteredSubFacilities.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.facilityName} ({f.facilityCode || `FAC-${f.id}`})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Mode: Building */}
              {machineTargetMode === 'building' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Society <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSocietyId}
                      onChange={(e) => {
                        setSelectedSocietyId(e.target.value);
                        setSelectedBuildingId('');
                      }}
                      disabled={loading || isSubmitting}
                      className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                    >
                      <option value="">-- Select Society --</option>
                      {societies.map(soc => (
                        <option key={soc.id} value={soc.id}>{soc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Building
                    </label>
                    <select
                      value={selectedBuildingId}
                      onChange={(e) => setSelectedBuildingId(e.target.value)}
                      disabled={loading || isSubmitting}
                      className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                    >
                      <option value="">
                        {selectedSocietyId ? '-- Assign directly to Society (or select Building) --' : '-- Choose Society first --'}
                      </option>
                      {filteredBuildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Mode: Sub-Machine */}
              {machineTargetMode === 'machine' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Parent Machine <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedParentMachineId}
                      onChange={(e) => setSelectedParentMachineId(e.target.value)}
                      disabled={loading || isSubmitting}
                      className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                    >
                      <option value="">-- Select Parent Machine --</option>
                      {validMachines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.machineCode || `MAC-${m.id}`})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. FACILITY DESTINATION SELECTOR */}
          {sourceType === 'facility' && (
            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Choose Facility Target</h4>

              <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFacilityTargetMode('mainFacility')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                    facilityTargetMode === 'mainFacility'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Move to Main Facility
                </button>
                <button
                  type="button"
                  onClick={() => setFacilityTargetMode('facility')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                    facilityTargetMode === 'facility'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Nest Under Facility
                </button>
              </div>

              {facilityTargetMode === 'mainFacility' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Target Main Facility <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMainFacilityId}
                    onChange={(e) => setSelectedMainFacilityId(e.target.value)}
                    disabled={loading || isSubmitting}
                    className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                  >
                    <option value="">-- Select Target Main Facility --</option>
                    {mainFacilities.map(mf => (
                      <option key={mf.id} value={mf.id}>
                        {mf.mainFacilityName} ({mf.mainFacilityCode || `MF-${mf.id}`})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Target Parent Facility <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedFacilityId}
                    onChange={(e) => setSelectedFacilityId(e.target.value)}
                    disabled={loading || isSubmitting}
                    className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                  >
                    <option value="">-- Select Target Parent Facility --</option>
                    {validFacilities.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.facilityName} ({f.facilityCode || `FAC-${f.id}`})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 3. BUILDING DESTINATION SELECTOR */}
          {sourceType === 'building' && (
            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Choose Building Target</h4>

              <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBuildingTargetMode('society')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                    buildingTargetMode === 'society'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Move to Society
                </button>
                <button
                  type="button"
                  onClick={() => setBuildingTargetMode('mainFacility')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                    buildingTargetMode === 'mainFacility'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Move to Main Facility
                </button>
              </div>

              {buildingTargetMode === 'society' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Target Society <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSocietyId}
                    onChange={(e) => setSelectedSocietyId(e.target.value)}
                    disabled={loading || isSubmitting}
                    className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                  >
                    <option value="">-- Select Target Society --</option>
                    {societies.map(soc => (
                      <option key={soc.id} value={soc.id}>{soc.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Target Main Facility <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMainFacilityId}
                    onChange={(e) => setSelectedMainFacilityId(e.target.value)}
                    disabled={loading || isSubmitting}
                    className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                  >
                    <option value="">-- Select Target Main Facility --</option>
                    {mainFacilities.map(mf => (
                      <option key={mf.id} value={mf.id}>
                        {mf.mainFacilityName} ({mf.mainFacilityCode || `MF-${mf.id}`})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Transfer Preview Card */}
          {destinationSummary && (
            <div className="flex items-center justify-between gap-3 bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/80 shadow-2xs">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">From</span>
                <span className="text-xs font-bold text-gray-800 truncate block">
                  {sourceNode.name}
                </span>
              </div>
              <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-2xs border border-blue-200 text-blue-600">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                  To ({destinationSummary.type})
                </span>
                <span className="text-xs font-bold text-blue-700 truncate block">
                  {destinationSummary.name}
                </span>
              </div>
            </div>
          )}

          {/* Assurances & Alerts */}
          {sourceType === 'device' && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900 mb-1">All Machine Details Preserved Intact</p>
                <ul className="text-emerald-800 space-y-0.5 text-[11px] list-disc list-inside">
                  <li>Specifications, Make, Model & Serial Numbers</li>
                  <li>Uploaded Manuals, Schematics & Photos</li>
                  <li>Preventive & Predictive Maintenance Schedules</li>
                  <li>All Work Orders & Audit Histories</li>
                  <li>Checkpoints, Rules & IoT MAC Bindings</li>
                </ul>
              </div>
            </div>
          )}

          {sourceType === 'facility' && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Moving this facility will automatically reassign all child facilities and machines contained within it to the target destination.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmMove}
            disabled={isSubmitting || !destinationSummary}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Moving Asset...</span>
              </>
            ) : (
              <span>Confirm & Move Asset</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
