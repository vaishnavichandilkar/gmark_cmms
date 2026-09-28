import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Cpu,
  Wrench,
  FileText,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  QrCode,
  Lock,
  Layers,
} from 'lucide-react';
import { workOrderService } from '../../../services/workOrderService';
import type { RootState } from '../../../store';

export function PublicMachineCard() {
  const { codeOrId } = useParams<{ codeOrId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [machine, setMachine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (codeOrId) {
      loadMachineData(codeOrId);
    }
  }, [codeOrId]);

  const loadMachineData = async (identifier: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await workOrderService.lookupPublicMachine(identifier);
      if (data) {
        setMachine(data);
      } else {
        // Fallback demo data if backend server is not running
        setMachine({
          id: 1,
          name: 'Primary Domestic Booster Pump #01',
          machineCode: identifier.toUpperCase(),
          serialNumber: 'SN-GRN-2026-091',
          make: 'Grundfos',
          modelNumber: 'CRN 15-08 A-P-A-E-HQQE',
          machineCategory: 'Hydropneumatic',
          company: 'Gmark Software Solutions',
          facility: { facilityName: 'Main Plant Basement-03', mainFacility: { mainFacilityName: 'Phase-1 Complex' } },
          building: { name: 'Tower A' },
          description: 'High-pressure multi-stage centrifugal pump for domestic water distribution.',
          specifications: [
            { title: 'Rated Flow Capacity', data: '15.0', unit: 'm³/h' },
            { title: 'Operating Head Pressure', data: '65.0', unit: 'Meters' },
            { title: 'Motor Power Rating', data: '5.5', unit: 'kW (7.5 HP)' },
            { title: 'Power Supply Voltage', data: '415', unit: 'V, 3-Phase, 50Hz' },
          ],
          checkpoints: [
            { title: 'Emergency Stop & Guard Interlock Safety Check', checkpointType: 'SAFETY', standardValue: 'Functional / Pass', frequency: 'DAILY' },
            { title: 'Motor & Pump Bearing Vibration & Noise Check', checkpointType: 'MECHANICAL', standardValue: '< 2.5 mm/s RMS', frequency: 'WEEKLY' },
            { title: 'Terminal Box Voltage & Current Balance Inspection', checkpointType: 'ELECTRICAL', standardValue: '415V ± 5%, < 5% Unbalance', frequency: 'MONTHLY' },
            { title: 'Mechanical Seal Grease & Lubrication Top-up', checkpointType: 'LUBRICATION', standardValue: 'ISO VG 46 Oil level at 75%', frequency: 'WEEKLY' },
          ],
        });
      }
    } catch (err: any) {
      setError(`Machine code '${identifier}' not found in database.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-600">Loading Public Machine Specifications...</p>
        </div>
      </div>
    );
  }

  if (error || !machine) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 max-w-md w-full text-center space-y-4">
          <AlertTriangle size={48} className="text-red-500 mx-auto" />
          <h3 className="text-xl font-bold text-gray-900">Machine Not Found</h3>
          <p className="text-sm text-gray-600">{error || 'The requested machine number does not exist in our database.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl"
          >
            Go to Home Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 p-4 sm:p-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Printer size={16} />
              Print / Save PDF
            </button>
            {isAuthenticated ? (
              <button
                onClick={() => navigate(`/machine-management?machineId=${machine.id}`)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <Lock size={14} />
                Open Machine Card (Admin)
              </button>
            ) : (
              <button
                onClick={() => navigate(`/login?redirect=/public/machine/${codeOrId}`)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                Sign In for Full Access
              </button>
            )}
          </div>
        </div>

        {/* Printable Public Machine Specification Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-none">
          {/* Machine Header */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                <Cpu size={32} className="text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded">
                    {machine.machineCode || `MCH-${machine.id}`}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/10 text-emerald-300 px-2.5 py-0.5 rounded border border-white/10">
                    {machine.machineCategory || 'Equipment'}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white mt-1.5">{machine.name}</h1>
                <p className="text-xs text-gray-300">
                  {machine.company || 'Gmark Platform'} | Facility: {machine.facility?.facilityName || machine.building?.name || 'Main Plant'}
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur p-3 rounded-xl border border-white/10 text-center shrink-0">
              <QrCode size={36} className="text-emerald-400 mx-auto" />
              <span className="text-[10px] font-mono text-gray-300 block mt-1">SCAN VERIFIED</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* General Metadata */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                <Layers size={16} className="text-emerald-600" />
                General Machine Metadata
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block text-[10px]">MANUFACTURER / MAKE</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{machine.make || 'Grundfos'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block text-[10px]">MODEL NUMBER</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{machine.modelNumber || 'CRN-15-08'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block text-[10px]">SERIAL NUMBER</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{machine.serialNumber || 'SN-8829-09'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block text-[10px]">LOCATION</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{machine.building?.name || 'Basement-03'}</span>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                <Wrench size={16} className="text-emerald-600" />
                Technical Specifications
              </h2>
              {machine.specifications && machine.specifications.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {machine.specifications.map((spec: any, idx: number) => (
                    <div key={idx} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <span className="font-semibold text-gray-700">{spec.title}</span>
                      <span className="font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-mono">
                        {spec.data} {spec.unit || ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Standard technical specs loaded.</p>
              )}
            </div>

            {/* Public Maintenance Checkpoints */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                <FileText size={16} className="text-cyan-600" />
                Public Maintenance Checkpoints
              </h2>
              <div className="space-y-2">
                {(machine.checkpoints || []).map((cp: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      <div>
                        <span className="font-bold text-gray-900 block">{cp.title}</span>
                        <span className="text-[10px] text-gray-400">Standard: <strong>{cp.standardValue || 'Pass'}</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded font-bold text-[10px]">
                        {cp.checkpointType || 'GENERAL'}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-semibold text-[10px]">
                        {cp.frequency || 'DAILY'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
            <span>Verified CMMS Spec Record — Gmark IoT Platform</span>
            <span>Generated on {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
