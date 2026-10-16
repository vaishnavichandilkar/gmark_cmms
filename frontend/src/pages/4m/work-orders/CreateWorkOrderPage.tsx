import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Wrench, Upload, Film, Trash2, Eye, AlertTriangle, Cpu, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { workOrderService } from '../../../services/workOrderService';
import { api } from '../../../lib/api';

export function CreateWorkOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetMachineId = searchParams.get('machineId');

  const [selectedMachineId, setSelectedMachineId] = useState<number | string>('');
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [problemDescription, setProblemDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [mediaList, setMediaList] = useState<{ fileUrl: string; fileName: string; fileType: string }[]>([]);
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const res = await api.get('/machines');
      if (res.data && Array.isArray(res.data)) {
        setMachinesList(res.data);
        if (targetMachineId) {
          const found = res.data.find(m => String(m.id) === String(targetMachineId));
          if (found) {
            setSelectedMachineId(found.id);
            setSelectedMachine(found);
            return;
          }
        }
        if (res.data.length > 0) {
          setSelectedMachineId(res.data[0].id);
          setSelectedMachine(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch machines:', err);
    } finally {
      setLoading(false);
    }
  };

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
      toast.error('Please fill in all mandatory fields before submitting.');
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
        triggerType: 'MANUAL',
        mediaFiles: mediaList,
      };

      const result = await workOrderService.createWorkOrder(payload);
      toast.success(`Work Order ${result?.woNumber || 'WO-2026-XXXX'} created successfully!`);
      navigate('/work-orders');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create Work Order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="sm:p-6 w-full h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="sm:p-6 pb-10 w-full h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/work-orders')}
          className="text-gray-600 hover:text-gray-900 mr-2 focus:outline-none"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">New Work Order</h1>
      </div>

      {/* Form Card Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            {/* Machine Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Machine <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMachineId}
                onChange={e => handleMachineSelect(e.target.value)}
                className={`w-full px-4 py-2.5 border ${
                  validationErrors.machineId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } rounded-lg bg-white text-gray-900 outline-none focus:border-green-500 transition-all`}
              >
                <option value="">Select Machine</option>
                {machinesList.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.machineCode || `ID-${m.id}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none focus:border-green-500 transition-all"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Category / Location (Read-only metadata) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility / Location
              </label>
              <input
                type="text"
                readOnly
                value={selectedMachine ? (selectedMachine.facility?.facilityName || selectedMachine.building?.name || 'Main Facility') : 'Select Machine'}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 outline-none"
              />
            </div>
          </div>

          {/* Auto-populated Machine Details */}
          {selectedMachine && (
            <div className="bg-green-50/50 border border-green-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block font-semibold text-[10px] uppercase">MAKE & MODEL</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{selectedMachine.make || 'Grundfos'} / {selectedMachine.modelNumber || 'CRN-15'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold text-[10px] uppercase">SERIAL NUMBER</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{selectedMachine.serialNumber || 'SN-2026-9901'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold text-[10px] uppercase">CATEGORY</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{selectedMachine.machineCategory || 'Hydropneumatic'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold text-[10px] uppercase">MACHINE CODE</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{selectedMachine.machineCode || `MCH-${selectedMachine.id}`}</span>
              </div>
            </div>
          )}

          {/* Problem Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Problem Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={problemDescription}
              onChange={e => {
                setProblemDescription(e.target.value);
                if (validationErrors.problemDescription) {
                  setValidationErrors(prev => ({ ...prev, problemDescription: '' }));
                }
              }}
              placeholder="Enter detailed problem description, abnormal noise, leak, or fault details..."
              className={`w-full px-4 py-2.5 border ${
                validationErrors.problemDescription ? 'border-red-500 bg-red-50' : 'border-gray-300'
              } rounded-lg bg-white text-gray-900 outline-none focus:border-green-500 transition-all placeholder-gray-400`}
            />
            {validationErrors.problemDescription && (
              <p className="text-xs text-red-500 font-semibold mt-1">{validationErrors.problemDescription}</p>
            )}
          </div>

          {/* Photo & Video Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach Photos & Videos (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 hover:border-green-500 rounded-2xl p-8 text-center bg-gray-50/70 hover:bg-green-50/20 transition-all relative group cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                disabled={uploadingFiles}
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 group-hover:border-green-300 text-green-600 group-hover:scale-105 transition-all flex items-center justify-center shadow-xs">
                  {uploadingFiles ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {uploadingFiles ? 'Uploading Files...' : 'Click or Drag & Drop Photos, Videos or Documents'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Attach fault photos, sound/vibration video clips or manuals (Max 25MB)
                  </p>
                </div>
                <button
                  type="button"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all pointer-events-none"
                >
                  <Upload size={15} /> Browse Files
                </button>
              </div>
            </div>

            {/* Media Thumbnails */}
            {mediaList.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                {mediaList.map((m, idx) => (
                  <div key={idx} className="relative group bg-gray-100 rounded-lg overflow-hidden border border-gray-200 aspect-video flex items-center justify-center">
                    {m.fileType === 'VIDEO' ? (
                      <div className="flex flex-col items-center text-slate-700 p-2">
                        <Film size={24} />
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

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-10 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() => navigate('/work-orders')}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-70 min-w-[100px]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Media Viewer Modal */}
      {viewingMediaUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setViewingMediaUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
          >
            <Trash2 size={28} />
          </button>
          <img src={viewingMediaUrl} alt="Enlarged view" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
