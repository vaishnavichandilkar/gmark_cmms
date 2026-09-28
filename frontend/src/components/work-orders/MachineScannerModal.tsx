import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Search,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  ArrowRight,
  X,
  Camera,
  Layers,
  Wrench,
  Building2,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { workOrderService } from '../../services/workOrderService';
import type { RootState } from '../../store';

interface MachineScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMachineForWO?: (machine: any) => void;
}

export function MachineScannerModal({ isOpen, onClose, onSelectMachineForWO }: MachineScannerModalProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [inputCode, setInputCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundMachine, setFoundMachine] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCheckpointsModal, setShowCheckpointsModal] = useState(false);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputCode('');
      setFoundMachine(null);
      setErrorMsg(null);
      setIsScanning(false);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    setIsScanning(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        toast.error('Camera API not supported on this browser/device');
        setIsScanning(false);
      }
    } catch (err) {
      toast.error('Unable to access camera. Please check permissions or enter machine number manually.');
      setIsScanning(false);
    }
  };

  const handleLookup = async (codeToSearch?: string) => {
    const query = (codeToSearch || inputCode).trim();
    if (!query) {
      setErrorMsg('Please enter a machine number or scan QR code');
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);
    setFoundMachine(null);

    try {
      const machine = await workOrderService.lookupPublicMachine(query);
      if (machine) {
        setFoundMachine(machine);
        toast.success(`Machine ${machine.name} (${machine.machineCode || machine.id}) validated!`);
      } else {
        setErrorMsg(`Machine Code "${query}" does not exist in the database. Please verify and try again.`);
      }
    } catch (err: any) {
      setErrorMsg(`Machine Code "${query}" not found in database. Re-enter a valid machine number.`);
    } finally {
      setIsSearching(false);
    }
  };

  // Mock QR scan trigger for testing
  const simulateQRScan = (sampleCode: string) => {
    setInputCode(sampleCode);
    stopCamera();
    handleLookup(sampleCode);
  };

  const handleViewCheckpoints = async () => {
    if (!foundMachine) return;
    const list = await workOrderService.getPublicMachineCheckpoints(foundMachine.id);
    setCheckpoints(list && list.length > 0 ? list : foundMachine.checkpoints || []);
    setShowCheckpointsModal(true);
  };

  const handleOpenMachineCard = () => {
    if (!isAuthenticated) {
      toast.error('Authentication required to open secure machine card. Redirecting to login...');
      onClose();
      navigate('/login?redirect=/machine-management');
      return;
    }
    onClose();
    navigate(`/machine-management?machineId=${foundMachine.id}`);
  };

  const handleCreateWO = () => {
    if (!isAuthenticated) {
      toast.error('User authorization required to create Work Order. Please log in.');
      onClose();
      navigate('/login?redirect=/work-orders');
      return;
    }
    if (onSelectMachineForWO) {
      onSelectMachineForWO(foundMachine);
      onClose();
    } else {
      onClose();
      navigate(`/work-orders/new?machineId=${foundMachine.id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
                <QrCode size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Machine Identification</h3>
                <p className="text-xs text-emerald-100">QR Code Scanner & Manual Database Lookup</p>
              </div>
            </div>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Input Options / QR Camera */}
            <div className="space-y-4">
              {isScanning ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-emerald-500 shadow-inner">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-emerald-400/60 rounded-xl m-8 pointer-events-none animate-pulse" />
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <span className="text-xs bg-black/70 text-white px-3 py-1 rounded-full backdrop-blur">
                      Point camera at Machine QR Code
                    </span>
                  </div>
                  <button
                    onClick={stopCamera}
                    className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur"
                  >
                    Stop Scanner
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={startCamera}
                    className="flex-1 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl border border-emerald-200 flex items-center justify-center gap-2 transition-all hover:shadow-sm"
                  >
                    <Camera size={18} />
                    Scan Machine QR Code
                  </button>
                  <div className="flex items-center text-xs text-gray-400 justify-center">OR</div>
                  <div className="flex-1 text-xs text-gray-500 flex items-center gap-1.5 justify-center">
                    Simulate Sample QR:
                    <button
                      type="button"
                      onClick={() => simulateQRScan('MCH-HYPN-001')}
                      className="px-2 py-1 bg-gray-100 hover:bg-emerald-600 hover:text-white rounded text-[11px] font-mono transition-colors"
                    >
                      MCH-001
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateQRScan('MCH-FIRE-002')}
                      className="px-2 py-1 bg-gray-100 hover:bg-emerald-600 hover:text-white rounded text-[11px] font-mono transition-colors"
                    >
                      MCH-002
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Entry Form */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Manual Machine Code / Serial No. Entry
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={inputCode}
                      onChange={e => {
                        setInputCode(e.target.value);
                        setErrorMsg(null);
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleLookup()}
                      placeholder="e.g. MCH-HYPN-001 or serial number..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={() => handleLookup()}
                    disabled={isSearching}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 shrink-0"
                  >
                    {isSearching ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                    Validate
                  </button>
                </div>
              </div>
            </div>

            {/* Real-time Error Alert */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3 text-sm"
              >
                <AlertTriangle className="shrink-0 text-red-500 mt-0.5" size={18} />
                <div className="flex-1">
                  <p className="font-bold text-red-800">Machine Validation Failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
                </div>
              </motion.div>
            )}

            {/* Found Machine Card & Actions */}
            {foundMachine && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-4 shadow-sm"
              >
                {/* Machine Summary */}
                <div className="flex items-start justify-between border-b border-emerald-200/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-600 font-bold">
                      <Layers size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          {foundMachine.machineCode || `ID-${foundMachine.id}`}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {foundMachine.machineCategory || foundMachine.machineType || 'General'}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-base mt-1">{foundMachine.name}</h4>
                      <p className="text-xs text-gray-500">
                        Make: <span className="font-medium text-gray-800">{foundMachine.make || 'N/A'}</span> | Model: <span className="font-medium text-gray-800">{foundMachine.modelNumber || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                </div>

                {/* Location & Metadata info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <Building2 size={14} className="text-emerald-600 shrink-0" />
                    <span className="truncate text-gray-700">
                      Facility: <strong>{foundMachine.facility?.facilityName || foundMachine.building?.name || 'Main Plant'}</strong>
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <Wrench size={14} className="text-emerald-600 shrink-0" />
                    <span className="truncate text-gray-700">
                      Serial: <strong>{foundMachine.serialNumber || 'SN-8829-09'}</strong>
                    </span>
                  </div>
                </div>

                {/* Public vs Restricted Action Buttons */}
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Available Machine Actions
                  </div>

                  {/* Public Views Group */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/public/machine/${foundMachine.machineCode || foundMachine.id}`);
                      }}
                      className="py-2.5 px-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-xs rounded-xl border border-gray-200 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Eye size={15} className="text-emerald-600" />
                      View Spec / PDF
                    </button>
                    <button
                      onClick={handleViewCheckpoints}
                      className="py-2.5 px-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-xs rounded-xl border border-gray-200 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <FileText size={15} className="text-cyan-600" />
                      View Checkpoints
                    </button>
                  </div>

                  {/* Restricted Views Group */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
                    <button
                      onClick={handleOpenMachineCard}
                      className="py-2.5 px-3 bg-white hover:bg-slate-800 hover:text-white text-gray-900 font-semibold text-xs rounded-xl border border-gray-300 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      {!isAuthenticated && <Lock size={13} className="text-amber-500" />}
                      Open Machine Card
                    </button>
                    <button
                      onClick={handleCreateWO}
                      className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      {!isAuthenticated && <Lock size={13} className="text-white/80" />}
                      Create Work Order
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Checkpoints Modal */}
      {showCheckpointsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden"
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-cyan-400" />
                <h4 className="font-bold text-base">Machine Checkpoints (Public)</h4>
              </div>
              <button
                onClick={() => setShowCheckpointsModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {checkpoints.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No maintenance checkpoints recorded.</p>
              ) : (
                checkpoints.map((cp: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{cp.title}</span>
                      <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded font-semibold text-[10px]">
                        {cp.checkpointType || 'GENERAL'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-500 pt-1">
                      <span>Standard: <strong className="text-gray-800">{cp.standardValue || 'OK'}</strong></span>
                      <span>Freq: <strong className="text-gray-800">{cp.frequency || 'DAILY'}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => setShowCheckpointsModal(false)}
                className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
