import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wrench, Boxes, RotateCcw, Server, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { MultiSelect } from '../../../components/shared/MultiSelect';
import { BoosterDashboard } from '../../scada/templates/booster/BoosterDashboard';
import { FirePanelDashboard } from '../../scada/templates/fire-panel/FirePanelDashboard';
import { api } from '../../../lib/api';
import type { RootState } from '../../../store';

export function DashboardPage() {
  const { user, buildingIds } = useSelector((state: RootState) => state.auth);

  const [mainFacilities, setMainFacilities] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [societies, setSocieties] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  const [selectedMainFacilityId, setSelectedMainFacilityId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [activeMachineId, setActiveMachineId] = useState<string | null>(null);
  
  const [isTabsExpanded, setIsTabsExpanded] = useState(false);

  // Default selection logic
  const defaultSelectionKey = `dashboard_default_selection_${user?.id}`;
  const getSavedDefault = () => {
    try {
      const saved = localStorage.getItem(defaultSelectionKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };
  const [savedDefault, setSavedDefault] = useState<any>(getSavedDefault());
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);
  const [isMachineDropdownOpen, setIsMachineDropdownOpen] = useState(false);
  const [dismissedSelection, setDismissedSelection] = useState<string | null>(null);
  const hasInitialized = React.useRef(false);

  // Initialize from saved default or user's assigned scope once data is loaded
  useEffect(() => {
    if (!hasInitialized.current && (machines.length > 0 || devices.length > 0 || facilities.length > 0)) {
      if (savedDefault) {
        // Find valid assets (either in machines or devices)
        const validAssets: string[] = [];
        savedDefault.machineIds?.forEach((id: string) => {
          if (id.startsWith('m_') && machines.find(m => m.id === Number(id.replace('m_','')))) validAssets.push(id);
          if (id.startsWith('d_') && devices.find(d => d.id === Number(id.replace('d_','')))) validAssets.push(id);
        });

        if (validAssets.length > 0) {
          hasInitialized.current = true;
          setSelectedMainFacilityId(savedDefault.mainFacilityId);
          setSelectedFacilityId(savedDefault.facilityId);
          setSelectedMachineIds(validAssets);
          return;
        }
      }

      // If user is assigned to a device (e.g. Mahendra Powar):
      if (user?.deviceId) {
        const targetMachine = machines.find(m => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
        const targetDevice = devices.find(d => d.deviceId === user.deviceId || d.id?.toString() === user.deviceId);
        
        const targetFacId = targetMachine?.facilityId || user.facilityId;
        const targetFac = facilities.find(f => f.id === targetFacId);
        const targetMfId = targetFac?.mainFacilityId || user.mainFacilityId;

        if (targetMfId) setSelectedMainFacilityId(`mf_${targetMfId}`);
        if (targetFacId) setSelectedFacilityId(`f_${targetFacId}`);

        if (targetMachine) {
          setSelectedMachineIds([`m_${targetMachine.id}`]);
          hasInitialized.current = true;
          return;
        } else if (targetDevice) {
          setSelectedMachineIds([`d_${targetDevice.id}`]);
          hasInitialized.current = true;
          return;
        }
      }

      // If user is assigned to a facility (e.g. Shabaj Mujawar):
      if (user?.facilityId) {
        const targetFacId = Number(user.facilityId);
        const targetFac = facilities.find(f => f.id === targetFacId);
        const targetMfId = targetFac?.mainFacilityId || user.mainFacilityId;

        if (targetMfId) setSelectedMainFacilityId(`mf_${targetMfId}`);
        setSelectedFacilityId(`f_${targetFacId}`);

        const facMachines = machines.filter(m => m.facilityId === targetFacId);
        if (facMachines.length > 0) {
          setSelectedMachineIds([`m_${facMachines[0].id}`]);
        }
        hasInitialized.current = true;
        return;
      }

      // If user is assigned to a main facility (e.g. Vallabh Ghatge):
      if (user?.mainFacilityId) {
        const targetMfId = Number(user.mainFacilityId);
        setSelectedMainFacilityId(`mf_${targetMfId}`);

        const childFacs = facilities.filter(f => f.mainFacilityId === targetMfId);
        if (childFacs.length > 0) {
          setSelectedFacilityId(`f_${childFacs[0].id}`);
          const facMachines = machines.filter(m => m.facilityId === childFacs[0].id);
          if (facMachines.length > 0) {
            setSelectedMachineIds([`m_${facMachines[0].id}`]);
          }
        }
        hasInitialized.current = true;
        return;
      }

      // Default fallback
      if (mainFacilities.length > 0) {
        const firstMf = mainFacilities[0];
        setSelectedMainFacilityId(`mf_${firstMf.id}`);
        const childFacs = facilities.filter(f => f.mainFacilityId === firstMf.id);
        if (childFacs.length > 0) {
          setSelectedFacilityId(`f_${childFacs[0].id}`);
          const facMachines = machines.filter(m => m.facilityId === childFacs[0].id);
          if (facMachines.length > 0) {
            setSelectedMachineIds([`m_${facMachines[0].id}`]);
          }
        }
        hasInitialized.current = true;
      }
    }
  }, [machines, devices, facilities, mainFacilities, savedDefault, user]);

  // Prompt to save logic
  useEffect(() => {
    if (selectedMachineIds.length > 0 && selectedFacilityId && selectedMainFacilityId && !isMachineDropdownOpen) {
      const currentSelectionStr = JSON.stringify({
        mainFacilityId: selectedMainFacilityId,
        facilityId: selectedFacilityId,
        machineIds: [...selectedMachineIds].sort()
      });

      const isDifferentFromSaved = !savedDefault ||
        savedDefault.mainFacilityId !== selectedMainFacilityId ||
        savedDefault.facilityId !== selectedFacilityId ||
        JSON.stringify(savedDefault.machineIds.sort()) !== JSON.stringify([...selectedMachineIds].sort());

      const isNotDismissed = dismissedSelection !== currentSelectionStr;

      if (isDifferentFromSaved && isNotDismissed) {
        setShowDefaultPrompt(true);
      } else {
        setShowDefaultPrompt(false);
      }
    } else {
      setShowDefaultPrompt(false);
    }
  }, [selectedMachineIds, selectedFacilityId, selectedMainFacilityId, savedDefault, dismissedSelection, isMachineDropdownOpen]);

  const handleSaveDefault = () => {
    const newDefault = {
      mainFacilityId: selectedMainFacilityId,
      facilityId: selectedFacilityId,
      machineIds: selectedMachineIds
    };
    localStorage.setItem(defaultSelectionKey, JSON.stringify(newDefault));
    setSavedDefault(newDefault);
    setShowDefaultPrompt(false);
  };

  const handleDismissDefault = () => {
    const currentSelectionStr = JSON.stringify({
      mainFacilityId: selectedMainFacilityId,
      facilityId: selectedFacilityId,
      machineIds: [...selectedMachineIds].sort()
    });
    setDismissedSelection(currentSelectionStr);
    setShowDefaultPrompt(false);
  };

  useEffect(() => {
    if (selectedMachineIds.length > 0) {
      if (!activeMachineId || !selectedMachineIds.includes(activeMachineId)) {
        setActiveMachineId(selectedMachineIds[0]);
      }
    } else {
      setActiveMachineId(null);
    }
  }, [selectedMachineIds]);

  useEffect(() => {
    if (selectedMachineIds.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('dashboard-', '');
            if (id) setActiveMachineId(id);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-10% 0px -10% 0px' }
    );

    const timeout = setTimeout(() => {
      selectedMachineIds.forEach((mId) => {
        const el = document.getElementById(`dashboard-${mId}`);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [selectedMachineIds]);

  useEffect(() => {
    Promise.all([
      api.get('/main-facilities').catch(() => ({ data: [] })),
      api.get('/facilities').catch(() => ({ data: [] })),
      api.get('/societies').catch(() => ({ data: [] })),
      api.get('/buildings').catch(() => ({ data: [] })),
      api.get('/machines').catch(() => ({ data: [] })),
      api.get('/devices').catch(() => ({ data: [] }))
    ]).then(([mfRes, fRes, sRes, bRes, mRes, dRes]) => {
      setMainFacilities(Array.isArray(mfRes.data) ? mfRes.data : []);
      setFacilities(Array.isArray(fRes.data) ? fRes.data : []);
      setSocieties(Array.isArray(sRes.data) ? sRes.data : []);
      setBuildings(Array.isArray(bRes.data) ? bRes.data : []);
      setMachines(Array.isArray(mRes.data) ? mRes.data : []);
      setDevices(Array.isArray(dRes.data) ? dRes.data : []);
    }).catch(console.error);
  }, [user]);

  const visibleMainFacilities = React.useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') {
      return mainFacilities;
    }
    if (user?.deviceId) {
      const targetMachine = machines.find(m => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
      const targetFacId = targetMachine?.facilityId || user.facilityId;
      const targetFac = facilities.find(f => f.id === targetFacId);
      const targetMfId = targetFac?.mainFacilityId || user.mainFacilityId;
      if (targetMfId) {
        return mainFacilities.filter(mf => mf.id === targetMfId);
      }
      return mainFacilities;
    }
    if (user?.facilityId) {
      const targetFac = facilities.find(f => f.id === Number(user.facilityId));
      const targetMfId = targetFac?.mainFacilityId || user.mainFacilityId;
      if (targetMfId) {
        return mainFacilities.filter(mf => mf.id === targetMfId);
      }
      return mainFacilities;
    }
    if (user?.mainFacilityId) {
      return mainFacilities.filter(mf => mf.id === user.mainFacilityId);
    }
    if (user?.societyId || (buildingIds && buildingIds.length > 0)) {
      return [];
    }
    return mainFacilities;
  }, [mainFacilities, facilities, machines, user, buildingIds]);

  const visibleSocieties = React.useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') {
      return societies;
    }
    if (user?.mainFacilityId || user?.facilityId || user?.deviceId) {
      return [];
    }
    if (user?.societyId) {
      return societies.filter(s => s.id === user.societyId);
    }
    if (buildingIds && buildingIds.length > 0) {
      const allowedSocIds = new Set(buildings.filter(b => buildingIds.includes(b.id)).map(b => b.societyId));
      return societies.filter(s => allowedSocIds.has(s.id));
    }
    return societies;
  }, [societies, buildings, user, buildingIds]);

  const visibleFacilities = React.useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') {
      return facilities;
    }
    if (user?.deviceId) {
      const targetMachine = machines.find(m => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
      const targetFacId = targetMachine?.facilityId || user.facilityId;
      if (targetFacId) {
        return facilities.filter(f => f.id === targetFacId);
      }
      return facilities;
    }
    if (user?.facilityId) {
      const targetFacId = Number(user.facilityId);
      const allowedFacilityIds = new Set<number>([targetFacId]);
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
      return facilities.filter(f => allowedFacilityIds.has(f.id));
    }
    if (user?.mainFacilityId) {
      return facilities.filter(f => f.mainFacilityId === user.mainFacilityId);
    }
    return facilities;
  }, [facilities, machines, user]);

  const visibleBuildings = React.useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') {
      return buildings;
    }
    if (user?.societyId) {
      return buildings.filter(b => b.societyId === user.societyId);
    }
    if (buildingIds && buildingIds.length > 0) {
      return buildings.filter(b => buildingIds.includes(b.id));
    }
    return buildings;
  }, [buildings, user, buildingIds]);

  // Combined dropdown options
  const combinedMainOptions = React.useMemo(() => {
    return [
      ...visibleMainFacilities.map(mf => ({ label: mf.mainFacilityName, value: `mf_${mf.id}` })),
      ...visibleSocieties.map(s => ({ label: s.name, value: `soc_${s.id}` }))
    ];
  }, [visibleMainFacilities, visibleSocieties]);

  const combinedSubOptions = React.useMemo(() => {
    if (!selectedMainFacilityId) return [];
    if (selectedMainFacilityId.startsWith('mf_')) {
      const mfId = Number(selectedMainFacilityId.replace('mf_', ''));
      return visibleFacilities.filter(f => f.mainFacilityId === mfId).map(f => ({ label: f.facilityName, value: `f_${f.id}` }));
    }
    if (selectedMainFacilityId.startsWith('soc_')) {
      const socId = Number(selectedMainFacilityId.replace('soc_', ''));
      return visibleBuildings.filter(b => b.societyId === socId).map(b => ({ label: b.name, value: `b_${b.id}` }));
    }
    return [];
  }, [selectedMainFacilityId, visibleFacilities, visibleBuildings]);

  const filteredMachines = React.useMemo(() => {
    let result: any[] = [];
    if (!selectedFacilityId) return [];
    if (selectedFacilityId.startsWith('f_')) {
      const fId = Number(selectedFacilityId.replace('f_', ''));
      result = machines.filter(m => m.facilityId === fId).map(m => ({ ...m, uniqueId: `m_${m.id}` }));
    } else if (selectedFacilityId.startsWith('b_')) {
      const bId = Number(selectedFacilityId.replace('b_', ''));
      const bldgMachines = machines.filter(m => m.buildingId === bId).map(m => ({ ...m, uniqueId: `m_${m.id}` }));
      const bldgDevices = devices.filter(d => d.buildingId === bId).map(d => ({ ...d, uniqueId: `d_${d.id}` }));
      result = [...bldgMachines, ...bldgDevices];
    }

    if (user?.deviceId) {
      result = result.filter(m => m.deviceId === user.deviceId || m.id?.toString() === user.deviceId);
    }
    return result;
  }, [selectedFacilityId, machines, devices, user]);
  
  const getAssetDetails = (uniqueId: string) => {
    if (uniqueId.startsWith('m_')) {
      const m = machines.find(m => m.id === Number(uniqueId.replace('m_', '')));
      return m ? { ...m, uniqueId } : null;
    }
    if (uniqueId.startsWith('d_')) {
      const d = devices.find(d => d.id === Number(uniqueId.replace('d_', '')));
      return d ? { ...d, uniqueId } : null;
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full mx-auto min-h-full">

      {/* Sticky Header Section */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md pt-4 pb-6 -mt-4 -mx-4 px-4 sm:-mt-6 sm:-mx-6 sm:px-6 md:-mt-8 md:-mx-8 md:px-8 border-b border-gray-100 mb-8 shadow-sm">
        {/* Top Bar for Asset Selection */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-[#00a651] flex items-center justify-center">
              <Boxes size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Select Asset</h2>
              <p className="text-xs text-gray-500 font-medium">Choose a machine to view its dashboard</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <CustomSelect
              name="mainFacility"
              placeholder="Facility..."
              className="w-full md:w-48"
              value={selectedMainFacilityId || ''}
              options={combinedMainOptions}
              onChange={(e) => {
                const val = e.target.value || null;
                setSelectedMainFacilityId(val);
                setSelectedFacilityId(null);
                setSelectedMachineIds([]);
              }}
            />

            <CustomSelect
              name="facility"
              placeholder="Sub-Facility..."
              className="w-full md:w-48"
              disabled={!selectedMainFacilityId}
              value={selectedFacilityId || ''}
              options={combinedSubOptions}
              onChange={(e) => {
                const val = e.target.value || null;
                setSelectedFacilityId(val);
                setSelectedMachineIds([]);
              }}
            />

            <MultiSelect
              name="machine"
              placeholder="Machines..."
              className="w-full md:w-64"
              disabled={!selectedFacilityId}
              values={selectedMachineIds}
              options={filteredMachines.map(m => ({ label: m.name, value: m.uniqueId }))}
              onChange={(selectedValues) => {
                setSelectedMachineIds(selectedValues);
              }}
              onToggle={(isOpen) => {
                setIsMachineDropdownOpen(isOpen);
              }}
            />

            {(selectedMainFacilityId || selectedFacilityId || selectedMachineIds.length > 0) && (
              <button
                onClick={() => {
                  setSelectedMainFacilityId(null);
                  setSelectedFacilityId(null);
                  setSelectedMachineIds([]);
                  setSavedDefault(null);
                  localStorage.removeItem(defaultSelectionKey);
                }}
                className="p-2 md:p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center justify-center"
                title="Reset Filters"
              >
                <RotateCcw size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Navigation Icons */}
        {selectedMachineIds.length > 1 && (
          <div className="px-2 w-full">
            <div className="flex flex-wrap gap-4 items-center">
              {(isTabsExpanded ? selectedMachineIds : selectedMachineIds.slice(0, 3)).map(mId => {
                const machine = getAssetDetails(mId);
                if (!machine) return null;
                const isActive = activeMachineId === mId;
                return (
                  <button
                    key={mId}
                    onClick={() => {
                      setActiveMachineId(mId);
                      document.getElementById(`dashboard-${mId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${isActive
                        ? 'bg-gradient-to-r from-[#00a651] to-[#009040] text-white border border-[#00a651] shadow-green-500/20 ring-2 ring-green-500/20'
                        : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                      }`}
                  >
                    <Server size={18} className={isActive ? 'text-green-100' : 'text-gray-400'} />
                    <span className="truncate max-w-[200px]">{machine.name}</span>
                  </button>
                );
              })}
              
              {selectedMachineIds.length > 3 && (
                <button
                  onClick={() => setIsTabsExpanded(!isTabsExpanded)}
                  className="flex items-center whitespace-nowrap gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors shadow-sm"
                >
                  {isTabsExpanded ? (
                    <>Show Less</>
                  ) : (
                    <>+ {selectedMachineIds.length - 3} More</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedMachineIds.length > 0 ? (
        <div className="flex-1 mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-10 w-full pb-12">
            {selectedMachineIds.map(mId => {
              const machine = getAssetDetails(mId);
              if (!machine) return null;
              
              let buildingName = machine.name;
              if (machine.facilityId) {
                const facility = facilities.find(fac => fac.id === machine.facilityId);
                if (facility) buildingName = facility.facilityName;
              } else if (machine.buildingId) {
                const building = buildings.find(b => b.id === machine.buildingId);
                if (building) buildingName = building.name;
              }
              
              const isFirePanel = machine.template === 'fire-panel' || (machine.deviceId && devices.find(d => d.deviceId === machine.deviceId)?.template === 'fire-panel');

              return (
                <div 
                  key={machine.uniqueId} 
                  id={`dashboard-${machine.uniqueId}`}
                  className="scroll-mt-64 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full flex-shrink-0 relative"
                  style={{ minHeight: '800px' }}
                >
                  {isFirePanel ? (
                    <FirePanelDashboard
                      title={machine.name}
                      panelId={machine.deviceId}
                      buildingName={buildingName}
                    />
                  ) : (
                    <BoosterDashboard
                      title={machine.name}
                      panelId={machine.deviceId}
                      buildingName={buildingName}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 mt-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden text-center max-w-lg w-full bg-white/80 backdrop-blur-xl p-12 rounded-[2rem] border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,166,81,0.15)] group hover:shadow-[0_20px_60px_-15px_rgba(0,166,81,0.25)] transition-all duration-500"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-green-50/80 to-transparent pointer-events-none rounded-[2rem]" />
            
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative w-28 h-28 mx-auto mb-8"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00a651]/10 to-[#00a651]/5 rounded-3xl rotate-6 group-hover:rotate-12 transition-transform duration-500" />
              <div className="absolute inset-0 bg-white rounded-3xl -rotate-3 group-hover:-rotate-6 transition-transform duration-500 shadow-xl shadow-green-500/10 border border-green-50 flex items-center justify-center backdrop-blur-sm">
                <Boxes size={44} strokeWidth={1.5} className="text-[#00a651]" />
              </div>
            </motion.div>
            
            <div className="relative">
              <h1 className="text-3xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                System Overview
              </h1>
              <p className="text-[1.05rem] text-gray-500 leading-relaxed font-medium">
                Select one or more assets from the top menu to monitor their real-time <span className="text-gray-700 font-semibold">SCADA metrics</span>.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Save Default Selection Modal */}
      <AnimatePresence>
        {showDefaultPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-50 text-[#00a651] rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 shadow-sm">
                  <Save size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Save as Default View?</h3>
                <p className="text-gray-500 mb-8 px-2 text-sm leading-relaxed">
                  Would you like to automatically load these selected machines every time you visit the dashboard?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDismissDefault}
                    className="flex-1 px-4 py-2.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-800 font-semibold transition-colors"
                  >
                    No, thanks
                  </button>
                  <button
                    onClick={handleSaveDefault}
                    className="flex-1 px-4 py-2.5 rounded-xl text-white bg-[#00a651] hover:bg-[#009040] shadow-sm shadow-green-500/20 font-semibold transition-colors"
                  >
                    Yes, save it
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
