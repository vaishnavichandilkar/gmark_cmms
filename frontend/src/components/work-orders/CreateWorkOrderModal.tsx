import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  X,
  Upload,
  Film,
  Trash2,
  Eye,
  AlertTriangle,
  Cpu,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { workOrderService } from '../../services/workOrderService';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMachine?: any;
  machinesList?: any[];
  triggerType?: 'MANUAL' | 'SCHEDULED' | 'MACHINE_CARD';
  onSuccess?: () => void;
}

export function CreateWorkOrderModal({
  isOpen,
  onClose,
  preselectedMachine,
  machinesList = [],
  triggerType = 'MANUAL',
  onSuccess,
}: CreateWorkOrderModalProps) {
  const [selectedMachineId, setSelectedMachineId] = useState<number | string>('');
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [problemDescription, setProblemDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [mediaList, setMediaList] = useState<{ fileUrl: string; fileName: string; fileType: string }[]>([]);
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedMachine) {
      setSelectedMachine(preselectedMachine);
      setSelectedMachineId(preselectedMachine.id);
    } else if (machinesList.length > 0 && !selectedMachineId) {
      setSelectedMachine(machinesList[0]);
      setSelectedMachineId(machinesList[0].id);
    }
  }, [preselectedMachine, machinesList]);

  useEffect(() => {
    if (!isOpen) {
      setProblemDescription('');
      setPriority('MEDIUM');
      setMediaList([]);
      setValidationErrors({});
    }
  }, [isOpen]);

  const handleMachineSelect = (mId: string | number) => {
    setSelectedMachineId(mId);
    const found = machinesList.find(m => String(m.id) === String(mId));
    setSelectedMachine(found || null);
    if (validationErrors.machineId) {
      setValidationErrors(prev => ({ ...prev, machineId: '' }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      const fileArray = Array.from(files);
      const res = await workOrderService.uploadMediaFiles(fileArray);
      if (res && res.files) {
        setMediaList(prev => [...prev, ...res.files]);
        toast.success(`${res.files.length} file(s) attached successfully!`);
      }
    } catch (err: any) {
      const mockFiles = Array.from(files).map(f => ({
        fileName: f.name,
        fileUrl: URL.createObjectURL(f),
        fileType: f.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
      }));
      setMediaList(prev => [...prev, ...mockFiles]);
      toast.success('Media files attached!');
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaList(prev => prev.filter((_, i) => i !== index));
    toast.success('Attached file removed');
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!selectedMachineId || !selectedMachine) {
      errors.machineId = 'Machine selection is required.';
    }
    if (!problemDescription || problemDescription.trim().length < 5) {
      errors.problemDescription = 'Problem Description must be at least 5 characters long.';
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Validation Warning: Please fill in all mandatory fields before submitting.', {
        icon: '⚠️',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        machineId: Number(selectedMachineId),
        problemDescription: problemDescription.trim(),
        priority,
        triggerType,
        mediaFiles: mediaList,
      };

      const result = await workOrderService.createWorkOrder(payload);
      toast.success(`Work Order ${result?.woNumber || 'WO-2026-XXXX'} generated successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate Work Order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed inset-0 z-50 bg-white flex flex-col w-full h-full min-h-screen overflow-hidden"
      >
        {/* Full Screen Header */}
        <div className="px-6 sm:px-8 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors focus:outline-none"
              title="Back"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <Wrench size={22} />
              </div>
              <div>
                <h1 className="font-bold text-2xl text-gray-900 leading-tight">Create Work Order</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Trigger Source: <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded uppercase">{triggerType}</span>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content - Full Width Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 md:p-10 space-y-8 max-w-7xl w-full mx-auto">
          {/* Machine Selection / Auto-populated Header */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Machine Identification <span className="text-red-500">*</span>
            </label>

            {!preselectedMachine && machinesList.length > 0 ? (
              <select
                value={selectedMachineId}
                onChange={e => handleMachineSelect(e.target.value)}
                className={`w-full px-4 py-3 bg-white border ${
                  validationErrors.machineId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } rounded-xl text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all`}
              >
                <option value="">-- Select Machine --</option>
                {machinesList.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.machineCode || `ID-${m.id}`}) — {m.building || m.facility?.facilityName || 'Main Facility'}
                  </option>
                ))}
              </select>
            ) : null}

            {/* Auto-populated Read-Only Machine Metadata Card */}
            {selectedMachine ? (
              <div className="bg-green-50/50 border border-green-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="text-green-600" size={20} />
                    <span className="font-bold text-gray-900 text-base">{selectedMachine.name}</span>
                    <span className="text-xs font-mono font-bold bg-green-100 text-green-800 px-2.5 py-0.5 rounded">
                      {selectedMachine.machineCode || `MCH-${selectedMachine.id}`}
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-white text-green-700 px-3 py-1 rounded-full border border-green-200">
                    Auto-Populated Metadata
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-green-100">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">MAKE & MODEL</span>
                    <span className="font-semibold text-gray-900 text-sm truncate block mt-0.5">
                      {selectedMachine.make || 'Grundfos'} / {selectedMachine.modelNumber || 'CRN-15'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-green-100">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">SERIAL NO.</span>
                    <span className="font-semibold text-gray-900 text-sm truncate block mt-0.5">
                      {selectedMachine.serialNumber || 'SN-2026-9901'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-green-100">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">CATEGORY</span>
                    <span className="font-semibold text-gray-900 text-sm truncate block mt-0.5">
                      {selectedMachine.machineCategory || 'Hydropneumatic'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-green-100">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">FACILITY & LOCATION</span>
                    <span className="font-semibold text-gray-900 text-sm truncate block mt-0.5">
                      {selectedMachine.facility?.facilityName || selectedMachine.building?.name || 'Basement-03'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                Select a machine above to auto-populate metadata fields.
              </div>
            )}
          </div>

          {/* Problem Description & Priority Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Problem Details <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                value={problemDescription}
                onChange={e => {
                  setProblemDescription(e.target.value);
                  if (validationErrors.problemDescription) {
                    setValidationErrors(prev => ({ ...prev, problemDescription: '' }));
                  }
                }}
                placeholder="Describe the issue, abnormal noise, pressure drop, leak, or fault code..."
                className={`w-full px-4 py-3 bg-white border ${
                  validationErrors.problemDescription ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } rounded-xl text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder-gray-400`}
              />
              {validationErrors.problemDescription && (
                <p className="text-xs text-red-500 font-semibold">{validationErrors.problemDescription}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Priority Level <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(p => (
                  <label
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      priority === p
                        ? p === 'CRITICAL'
                          ? 'bg-red-500 text-white border-red-600 shadow-xs'
                          : p === 'HIGH'
                          ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                          : p === 'MEDIUM'
                          ? 'bg-green-600 text-white border-green-700 shadow-xs'
                          : 'bg-blue-500 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={priority === p}
                      onChange={() => setPriority(p)}
                      className="sr-only"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-current" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Photo & Video Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Attach Photos & Videos (Optional)
              </label>
              <span className="text-xs text-gray-400">JPG, PNG, MP4 (Max 50MB)</span>
            </div>

            <div className="border-2 border-dashed border-gray-300 hover:border-green-500 rounded-2xl p-8 text-center bg-gray-50/50 transition-colors relative cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={uploadingFiles}
              />
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 group-hover:scale-110 transition-transform flex items-center justify-center">
                  {uploadingFiles ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {uploadingFiles ? 'Uploading Files...' : 'Click or Drag & Drop Photos / Videos'}
                </span>
                <span className="text-xs text-gray-400">Attach media proof of problem for maintenance team</span>
              </div>
            </div>

            {/* Uploaded Media Thumbnails */}
            {mediaList.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {mediaList.map((m, idx) => (
                  <div
                    key={idx}
                    className="relative group bg-gray-100 rounded-xl overflow-hidden border border-gray-200 aspect-video flex items-center justify-center"
                  >
                    {m.fileType === 'VIDEO' ? (
                      <div className="flex flex-col items-center text-slate-700 p-2">
                        <Film size={28} />
                        <span className="text-[10px] truncate max-w-full font-semibold">{m.fileName}</span>
                      </div>
                    ) : (
                      <img src={m.fileUrl} alt={m.fileName} className="w-full h-full object-cover" />
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingMediaUrl(m.fileUrl)}
                        className="p-1.5 bg-white/20 hover:bg-white text-white hover:text-black rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validation Warning Alert */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
              <AlertTriangle size={18} className="text-red-500 shrink-0" />
              <span>Please fix highlighted mandatory field errors before submitting.</span>
            </div>
          )}
        </form>

        {/* Sticky Footer Bar */}
        <div className="sticky bottom-0 bg-white px-6 sm:px-8 py-4 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0 shadow-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-70 min-w-[100px]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </motion.div>

      {/* Media Viewer Modal */}
      {viewingMediaUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setViewingMediaUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
          >
            <X size={28} />
          </button>
          <img src={viewingMediaUrl} alt="Enlarged media view" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
        </div>
      )}
    </AnimatePresence>
  );
}
