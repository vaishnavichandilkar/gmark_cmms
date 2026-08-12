import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wrench, Boxes, RotateCcw, Server, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { MultiSelect } from '../../../components/shared/MultiSelect';
import { BoosterDashboard } from '../../scada/templates/booster/BoosterDashboard';
import { api } from '../../../lib/api';
import type { RootState } from '../../../store';

export function DashboardPage() {
  const { user, buildingIds } = useSelector((state: RootState) => state.auth);

  const [mainFacilities, setMainFacilities] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  const [selectedMainFacilityId, setSelectedMainFacilityId] = useState<number | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [selectedMachineIds, setSelectedMachineIds] = useState<number[]>([]);
  const [activeMachineId, setActiveMachineId] = useState<number | null>(null);

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

  // Initialize from saved default once data is loaded
  useEffect(() => {
    if (!hasInitialized.current && machines.length > 0) {
      hasInitialized.current = true;
      if (savedDefault) {
        const validMachines = machines.filter(m => savedDefault.machineIds.includes(m.id));
        if (validMachines.length > 0) {
          setSelectedMainFacilityId(savedDefault.mainFacilityId);
          setSelectedFacilityId(savedDefault.facilityId);
          setSelectedMachineIds(validMachines.map(m => m.id));
        }
      }
    }
  }, [machines, savedDefault]);

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
  }, [selectedMachineIds, activeMachineId]);

  useEffect(() => {
    Promise.all([
      api.get('/main-facilities'),
      api.get('/facilities'),
      api.get('/machines')
    ]).then(([mfRes, fRes, mRes]) => {
      setMainFacilities(mfRes.data);
      setFacilities(fRes.data);
      setMachines(mRes.data);
    }).catch(console.error);
  }, []);

  const isLimitedAccess = ['OPERATOR', 'VIEWER', 'BUILDING_ADMIN'].includes(user?.role);

  const visibleFacilities = React.useMemo(() => {
    if (isLimitedAccess && buildingIds && buildingIds.length > 0) {
      return facilities.filter(f => buildingIds.includes(f.id));
    }
    return facilities;
  }, [facilities, isLimitedAccess, buildingIds]);

  const visibleMainFacilities = React.useMemo(() => {
    if (isLimitedAccess && buildingIds && buildingIds.length > 0) {
      const allowedMainFacilityIds = new Set(visibleFacilities.map(f => f.mainFacilityId));
      return mainFacilities.filter(mf => allowedMainFacilityIds.has(mf.id));
    }
    return mainFacilities;
  }, [mainFacilities, visibleFacilities, isLimitedAccess, buildingIds]);

  return (
    <div className="h-full flex flex-col w-full mx-auto min-h-[calc(100vh-8rem)]">

      {/* Top Bar for Asset Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
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
            value={selectedMainFacilityId?.toString() || ''}
            options={visibleMainFacilities.map(mf => ({ label: mf.mainFacilityName, value: mf.id.toString() }))}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
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
            value={selectedFacilityId?.toString() || ''}
            options={visibleFacilities.filter(f => f.mainFacilityId === selectedMainFacilityId).map(f => ({ label: f.facilityName, value: f.id.toString() }))}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              setSelectedFacilityId(val);
              setSelectedMachineIds([]);
            }}
          />

          <MultiSelect
            name="machine"
            placeholder="Machines..."
            className="w-full md:w-64"
            disabled={!selectedFacilityId}
            values={selectedMachineIds.map(id => id.toString())}
            options={machines.filter(m => m.facilityId === selectedFacilityId).map(m => ({ label: m.name, value: m.id.toString() }))}
            onChange={(selectedValues) => {
              setSelectedMachineIds(selectedValues.map(v => Number(v)));
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

      {selectedMachineIds.length > 0 ? (
        <div className="flex-1 mt-2 flex flex-col gap-4">

          {/* Quick Navigation Icons */}
          {selectedMachineIds.length > 1 && (
            <div className="flex flex-wrap gap-3 pb-2">
              {selectedMachineIds.map(mId => {
                const machine = machines.find(m => m.id === mId);
                if (!machine) return null;
                const isActive = activeMachineId === mId;
                return (
                  <button
                    key={mId}
                    onClick={() => setActiveMachineId(mId)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${isActive
                        ? 'bg-gradient-to-r from-[#00a651] to-[#009040] text-white border border-[#00a651] shadow-green-500/20 ring-2 ring-green-500/20'
                        : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                      }`}
                  >
                    <Server size={18} className={isActive ? 'text-green-100' : 'text-gray-400'} />
                    <span>{machine.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Machine Dashboard */}
          {activeMachineId && machines.find(m => m.id === activeMachineId) && (
            (() => {
              const machine = machines.find(m => m.id === activeMachineId);
              const facility = facilities.find(fac => fac.id === machine?.facilityId);
              return (
                <div key={machine!.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
                  <BoosterDashboard
                    title={machine!.name}
                    panelId={machine!.deviceId}
                    buildingName={facility?.facilityName || machine!.name}
                  />
                </div>
              );
            })()
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md bg-white p-10 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Boxes size={40} className="text-[#00a651]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              System Overview
            </h1>
            <p className="text-gray-500 leading-relaxed">
              Select one or more assets from the top menu to monitor their real-time SCADA metrics.
            </p>
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
