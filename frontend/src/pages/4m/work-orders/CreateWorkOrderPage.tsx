import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Upload, Film, Trash2, Eye, Loader2, Pencil, FileText, X } from 'lucide-react';
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
  const [editingMedia, setEditingMedia] = useState<{
    index: number;
    fileName: string;
    fileUrl: string;
    fileType: string;
    newFile?: File | null;
  } | null>(null);
  const [savingMediaEdit, setSavingMediaEdit] = useState(false);

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const detectFileType = (file: File) => {
    if (file.type.startsWith('video') || file.name.match(/\.(mp4|mov|avi|wmv|webm|mkv)$/i)) return 'VIDEO';
    if (file.type.startsWith('image') || file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) return 'IMAGE';
    return 'DOCUMENT';
  };

  const isDocFile = (m: { fileName: string; fileType?: string }) => {
    return m.fileType === 'DOCUMENT' || !!m.fileName?.match(/\.(pdf|doc|docx|xls|xlsx|csv|txt|ppt|pptx)$/i);
  };

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
        fileType: detectFileType(f),
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

  const handleViewMedia = (m: { fileUrl: string; fileName: string; fileType: string }) => {
    if (isDocFile(m)) {
      window.open(m.fileUrl, '_blank');
    } else {
      setViewingMediaUrl(m.fileUrl);
    }
  };

  const handleSaveMediaEdit = async () => {
    if (!editingMedia || !editingMedia.fileName.trim()) {
      toast.error('File name is required');
      return;
    }

    setSavingMediaEdit(true);
    try {
      let updatedUrl = editingMedia.fileUrl;
      let updatedType = editingMedia.fileType;

      if (editingMedia.newFile) {
        try {
          const res = await workOrderService.uploadMediaFiles([editingMedia.newFile]);
          if (res && res.files && res.files[0]) {
            updatedUrl = res.files[0].fileUrl;
            updatedType = res.files[0].fileType || detectFileType(editingMedia.newFile);
          }
        } catch {
          updatedUrl = URL.createObjectURL(editingMedia.newFile);
          updatedType = detectFileType(editingMedia.newFile);
        }
      }

      setMediaList(prev => prev.map((item, idx) => {
        if (idx === editingMedia.index) {
          return {
            fileName: editingMedia.fileName.trim(),
            fileUrl: updatedUrl,
            fileType: updatedType,
          };
        }
        return item;
      }));

      toast.success('Attached file updated successfully');
      setEditingMedia(null);
    } catch (err) {
      toast.error('Failed to update attached file');
    } finally {
      setSavingMediaEdit(false);
    }
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
                  <div key={idx} className="relative group bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-video flex items-center justify-center">
                    {m.fileType === 'VIDEO' ? (
                      <div className="flex flex-col items-center justify-center text-slate-700 p-2 text-center h-full w-full">
                        <Film size={26} className="text-slate-600 mb-1" />
                        <span className="text-[10px] truncate max-w-full font-semibold">{m.fileName}</span>
                      </div>
                    ) : isDocFile(m) ? (
                      <div className="flex flex-col items-center justify-center p-3 text-center h-full w-full bg-slate-50">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1 shadow-2xs">
                          <FileText size={18} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800 line-clamp-2 px-1 max-w-full leading-tight" title={m.fileName}>
                          {m.fileName}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">
                          {m.fileName.split('.').pop() || 'DOC'}
                        </span>
                      </div>
                    ) : (
                      <img src={m.fileUrl} alt={m.fileName} className="w-full h-full object-cover" />
                    )}

                    {/* Always Visible Actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-slate-200/90 shadow-xs z-10">
                      <button
                        type="button"
                        onClick={() => handleViewMedia(m)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        title="View File"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMedia({ index: idx, fileName: m.fileName, fileUrl: m.fileUrl, fileType: m.fileType, newFile: null })}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        title="Edit File"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete File"
                      >
                        <Trash2 size={15} />
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
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-70 min-w-[100px] cursor-pointer"
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

      {/* Edit Media Modal */}
      {editingMedia && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Attached File</h3>
              <button
                type="button"
                onClick={() => setEditingMedia(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">File Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editingMedia.fileName}
                  onChange={e => setEditingMedia(prev => prev ? { ...prev, fileName: e.target.value } : null)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
                  placeholder="Enter file name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Replace File (Optional)</label>
                <input
                  type="file"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      const selected = e.target.files[0];
                      setEditingMedia(prev => prev ? {
                        ...prev,
                        newFile: selected,
                        fileName: prev.fileName || selected.name
                      } : null);
                    }
                  }}
                  className="block w-full text-xs text-slate-600 border border-slate-300 rounded-lg p-2 cursor-pointer focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors"
                />
                {editingMedia.newFile && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1 truncate">
                    Selected new file: {editingMedia.newFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMediaEdit}
                  disabled={savingMediaEdit}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingMediaEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {viewingMediaUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setViewingMediaUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 cursor-pointer bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <img src={viewingMediaUrl} alt="Enlarged view" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
