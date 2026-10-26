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

interface MoveMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: {
    id: number | string;
    name: string;
    machineCode?: string;
    company?: string;
    building?: string;
    facilityId?: number;
    facility?: any;
  } | null;
  onSuccess: () => void;
}

export function MoveMachineModal({
  isOpen,
  onClose,
  machine,
  onSuccess,
}: MoveMachineModalProps) {
  const [mainFacilities, setMainFacilities] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedMainFacilityId, setSelectedMainFacilityId] = useState<string>('');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFacilitiesData();
      setSelectedMainFacilityId('');
      setSelectedFacilityId('');
    }
  }, [isOpen, machine]);

  const loadFacilitiesData = async () => {
    try {
      setLoadingOptions(true);
      const [mfRes, fRes] = await Promise.all([
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
      ]);
      setMainFacilities(Array.isArray(mfRes.data) ? mfRes.data : []);
      setFacilities(Array.isArray(fRes.data) ? fRes.data : []);
    } catch (err) {
      console.error('Failed to load facilities options', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  if (!isOpen || !machine) return null;

  // Filter sub-facilities by selected main facility
  const filteredSubFacilities = facilities.filter(f => {
    if (!selectedMainFacilityId) return true;
    return String(f.mainFacilityId) === selectedMainFacilityId;
  });

  const selectedMainFacilityObj = mainFacilities.find(mf => String(mf.id) === selectedMainFacilityId);
  const selectedSubFacilityObj = facilities.find(f => String(f.id) === selectedFacilityId);

  const handleConfirmMove = async () => {
    if (!selectedFacilityId && !selectedMainFacilityId) {
      toast.error('Please select a destination Facility or Sub-Facility.');
      return;
    }

    try {
      setIsSubmitting(true);
      const machineId = machine.id;

      let targetType: 'facility' | 'mainFacility' = 'facility';
      let targetId: number;

      if (selectedFacilityId) {
        targetType = 'facility';
        targetId = Number(selectedFacilityId);
      } else {
        targetType = 'mainFacility';
        targetId = Number(selectedMainFacilityId);
      }

      await api.patch(`/machines/${machineId}/move`, {
        targetType,
        targetId,
      });

      const destName = selectedSubFacilityObj?.facilityName || selectedMainFacilityObj?.mainFacilityName || 'New Facility';
      toast.success(`Machine "${machine.name}" successfully moved to "${destName}" with all details intact!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to move machine', err);
      toast.error(err.response?.data?.message || 'Failed to move machine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentFacilityName = machine.company || machine.facility?.mainFacility?.mainFacilityName || 'Main Facility';
  const currentSubFacilityName = machine.building || machine.facility?.facilityName || '-';

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
        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Move Machine to Another Facility</h3>
              <p className="text-xs text-gray-500">Reassign machine location with all existing data preserved</p>
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
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Machine Info Bar */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{machine.name}</p>
                <p className="text-[11px] font-mono text-slate-500">{machine.machineCode || `ID: ${machine.id}`}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Facility</span>
              <span className="text-xs font-semibold text-slate-700">{currentFacilityName} {currentSubFacilityName !== '-' ? `• ${currentSubFacilityName}` : ''}</span>
            </div>
          </div>

          {/* Destination Selection */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Select New Destination</h4>
            
            {/* Main Facility Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Facility / Company <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMainFacilityId}
                onChange={(e) => {
                  setSelectedMainFacilityId(e.target.value);
                  setSelectedFacilityId('');
                }}
                disabled={loadingOptions || isSubmitting}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="">-- Choose Target Facility --</option>
                {mainFacilities.map(mf => (
                  <option key={mf.id} value={mf.id}>
                    {mf.mainFacilityName} ({mf.mainFacilityCode || `MF-${mf.id}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-Facility Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Sub-Facility
              </label>
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                disabled={loadingOptions || isSubmitting}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="">
                  {selectedMainFacilityId ? '-- Assign directly to Facility (or choose sub-facility) --' : '-- Choose Facility first or select any Sub-Facility --'}
                </option>
                {filteredSubFacilities.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.facilityName} ({f.facilityCode || `FAC-${f.id}`})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer Preview */}
          {(selectedMainFacilityId || selectedFacilityId) && (
            <div className="flex items-center justify-between gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/80">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">From</span>
                <span className="text-xs font-bold text-slate-800 truncate block">
                  {currentFacilityName} {currentSubFacilityName !== '-' ? `(${currentSubFacilityName})` : ''}
                </span>
              </div>
              <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-xs border border-blue-200 text-blue-600">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">To</span>
                <span className="text-xs font-bold text-blue-700 truncate block">
                  {selectedSubFacilityObj ? `${selectedSubFacilityObj.facilityName}` : (selectedMainFacilityObj?.mainFacilityName || 'Selected Facility')}
                </span>
              </div>
            </div>
          )}

          {/* Preserved Details Callout */}
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900 mb-1">All Machine Details Will Be Maintained</p>
              <ul className="text-emerald-800 space-y-0.5 text-[11px] list-disc list-inside">
                <li>Machine Specifications, Make, Model & Serial Number</li>
                <li>Manuals, Schematics & Attached Documents</li>
                <li>Preventive & Predictive Maintenance Schedules</li>
                <li>Active & Historic Work Orders</li>
                <li>Checkpoints, Inspection Rules & IoT MAC ID Bindings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmMove}
            disabled={isSubmitting || (!selectedFacilityId && !selectedMainFacilityId)}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Moving Machine...</span>
              </>
            ) : (
              <span>Confirm & Move Machine</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
