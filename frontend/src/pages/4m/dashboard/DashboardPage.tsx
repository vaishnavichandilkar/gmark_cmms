import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wrench, Boxes, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
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
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
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
          />

          {(selectedMainFacilityId || selectedFacilityId || selectedMachineIds.length > 0) && (
            <button
              onClick={() => {
                setSelectedMainFacilityId(null);
                setSelectedFacilityId(null);
                setSelectedMachineIds([]);
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
        <div className="flex-1 mt-2 flex flex-col gap-8">
          {selectedMachineIds.map(mId => {
            const machine = machines.find(m => m.id === mId);
            const facility = facilities.find(fac => fac.id === machine?.facilityId);
            if (!machine) return null;
            return (
              <div key={machine.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <BoosterDashboard 
                  title={machine.name} 
                  panelId={machine.deviceId} 
                  buildingName={facility?.facilityName || machine.name} 
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md bg-white p-10 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Boxes size={40} className="text-blue-500" />
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

    </div>
  );
}
