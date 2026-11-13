import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ChevronLeft, Upload, Film, Trash2, Eye, Loader2, Pencil, FileText, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { workOrderService } from '../../../services/workOrderService';
import { api } from '../../../lib/api';

export function CreateWorkOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const targetMachineId = searchParams.get('machineId');
  const returnUrl = (location.state as any)?.returnUrl;
  const returnTab = (location.state as any)?.returnTab || 'WO';

  const handleBack = () => {
    if (returnUrl) {
      navigate(returnUrl, { state: { tab: returnTab, returnTab } });
    } else {
      navigate('/work-orders');
    }
  };

  const [selectedMachineId, setSelectedMachineId] = useState<number | string>('');
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [facilityOptions, setFacilityOptions] = useState<any[]>([]);
  const [subFacilityOptions, setSubFacilityOptions] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectedSubFacilityId, setSelectedSubFacilityId] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState(searchParams.get('problem') || '');
  const [status, setStatus] = useState<'Predictive' | 'Preventive' | 'Safety' | 'Breakdown'>(
    (searchParams.get('status') as any) || 'Breakdown'
  );

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

  const getMachineLocations = (m: any, facList: any[], subList: any[]) => {
    let facId = '';
    let subId = '';

    if (m.facilityId) {
      const match = subList.find(s => s.type === 'facility' && String(s.rawId) === String(m.facilityId));
      if (match) {
        subId = match.id;
        facId = match.parentFacilityId || '';
      }
    } else if (m.buildingId) {
      const match = subList.find(s => s.type === 'building' && String(s.rawId) === String(m.buildingId));
      if (match) {
        subId = match.id;
        facId = match.parentFacilityId || '';
      }
    } else if (m.building && m.building !== 'Unassigned') {
      const match = subList.find(s => s.name?.toLowerCase() === String(m.building).toLowerCase());
      if (match) {
        subId = match.id;
        facId = match.parentFacilityId || '';
      }
    }

    if (!facId) {
      if (m.facility?.mainFacilityId) {
        facId = `mf-${m.facility.mainFacilityId}`;
      } else if (m.company) {
        const match = facList.find(f => String(f.rawId) === String(m.company) || f.name?.toLowerCase() === String(m.company).toLowerCase());
        if (match) {
          facId = match.id;
        } else {
          facId = `comp-${m.company}`;
        }
      }
    }

    return { facId, subId };
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [machRes, mainFacRes, socRes, facRes, bldgRes] = await Promise.all([
        api.get('/machines').catch(() => ({ data: [] })),
        api.get('/main-facilities').catch(() => ({ data: [] })),
        api.get('/societies').catch(() => ({ data: [] })),
        api.get('/facilities').catch(() => ({ data: [] })),
        api.get('/buildings').catch(() => ({ data: [] })),
      ]);

      const machines = Array.isArray(machRes.data) ? machRes.data : (machRes.data?.data || []);
      const mainFacs = Array.isArray(mainFacRes.data) ? mainFacRes.data : [];
      const societies = Array.isArray(socRes.data) ? socRes.data : [];
      const facilities = Array.isArray(facRes.data) ? facRes.data : [];
      const buildings = Array.isArray(bldgRes.data) ? bldgRes.data : [];

      setMachinesList(machines);

      // 1. Build facility options (top-level)
      const facMap = new Map<string, any>();
      mainFacs.forEach((mf: any) => {
        facMap.set(`mf-${mf.id}`, {
          id: `mf-${mf.id}`,
          name: mf.mainFacilityName,
          rawId: mf.id,
          type: 'mainFacility',
        });
      });
      societies.forEach((s: any) => {
        facMap.set(`soc-${s.id}`, {
          id: `soc-${s.id}`,
          name: s.name,
          rawId: s.id,
          type: 'society',
        });
      });
      machines.forEach((m: any) => {
        if (m.company && isNaN(Number(m.company)) && !Array.from(facMap.values()).some(f => f.name.toLowerCase() === m.company.toLowerCase())) {
          facMap.set(`comp-${m.company}`, {
            id: `comp-${m.company}`,
            name: m.company,
            rawId: m.company,
            type: 'company',
          });
        }
      });
      const facOptionsList = Array.from(facMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setFacilityOptions(facOptionsList);

      // 2. Build sub-facility options
      const subMap = new Map<string, any>();
      facilities.forEach((f: any) => {
        subMap.set(`fac-${f.id}`, {
          id: `fac-${f.id}`,
          name: f.facilityName,
          rawId: f.id,
          parentFacilityId: f.mainFacilityId ? `mf-${f.mainFacilityId}` : null,
          type: 'facility',
        });
      });
      buildings.forEach((b: any) => {
        subMap.set(`bldg-${b.id}`, {
          id: `bldg-${b.id}`,
          name: b.name,
          rawId: b.id,
          parentFacilityId: b.societyId ? `soc-${b.societyId}` : (b.mainFacilityId ? `mf-${b.mainFacilityId}` : null),
          type: 'building',
        });
      });
      const subOptionsList = Array.from(subMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setSubFacilityOptions(subOptionsList);

      // 3. Resolve initial selection
      let initialMachine = null;
      if (targetMachineId) {
        initialMachine = machines.find((m: any) => String(m.id) === String(targetMachineId));
      }
      if (!initialMachine && machines.length > 0) {
        initialMachine = machines[0];
      }

      if (initialMachine) {
        setSelectedMachineId(initialMachine.id);
        setSelectedMachine(initialMachine);
        const { facId, subId } = getMachineLocations(initialMachine, facOptionsList, subOptionsList);
        if (facId) setSelectedFacilityId(facId);
        if (subId) setSelectedSubFacilityId(subId);
      }
    } catch (err) {
      console.error('Failed to load initial work order data:', err);
      toast.error('Failed to load machines and facilities');
    } finally {
      setLoading(false);
    }
  };

  const handleMachineSelect = (mId: string | number) => {
    setSelectedMachineId(mId);
    const found = machinesList.find(m => String(m.id) === String(mId));
    setSelectedMachine(found || null);
    if (found) {
      const { facId, subId } = getMachineLocations(found, facilityOptions, subFacilityOptions);
      if (facId) setSelectedFacilityId(facId);
      if (subId) setSelectedSubFacilityId(subId);
    }
    if (validationErrors.machineId) {
      setValidationErrors(prev => ({ ...prev, machineId: '' }));
    }
  };

  const handleFacilityChange = (facId: string) => {
    setSelectedFacilityId(facId);
    setSelectedSubFacilityId('');
    if (validationErrors.facilityId) {
      setValidationErrors(prev => ({ ...prev, facilityId: '' }));
    }

    const matching = machinesList.filter(m => {
      if (!facId) return true;
      const loc = getMachineLocations(m, facilityOptions, subFacilityOptions);
      return loc.facId === facId;
    });

    if (matching.length > 0) {
      if (!matching.some(m => String(m.id) === String(selectedMachineId))) {
        handleMachineSelect(matching[0].id);
      }
    } else {
      setSelectedMachineId('');
      setSelectedMachine(null);
    }
  };

  const handleSubFacilityChange = (subId: string) => {
    setSelectedSubFacilityId(subId);
    if (validationErrors.subFacilityId) {
      setValidationErrors(prev => ({ ...prev, subFacilityId: '' }));
    }

    if (subId && !selectedFacilityId) {
      const sub = subFacilityOptions.find(s => s.id === subId);
      if (sub?.parentFacilityId) {
        setSelectedFacilityId(sub.parentFacilityId);
        if (validationErrors.facilityId) {
          setValidationErrors(prev => ({ ...prev, facilityId: '' }));
        }
      }
    }

    const matching = machinesList.filter(m => {
      const loc = getMachineLocations(m, facilityOptions, subFacilityOptions);
      if (selectedFacilityId && loc.facId !== selectedFacilityId) return false;
      if (subId && loc.subId !== subId) return false;
      return true;
    });

    if (matching.length > 0) {
      if (!matching.some(m => String(m.id) === String(selectedMachineId))) {
        handleMachineSelect(matching[0].id);
      }
    } else {
      setSelectedMachineId('');
      setSelectedMachine(null);
    }
  };

  const availableSubFacilities = useMemo(() => {
    if (!selectedFacilityId) return subFacilityOptions;
    return subFacilityOptions.filter(s => s.parentFacilityId === selectedFacilityId);
  }, [subFacilityOptions, selectedFacilityId]);

  const filteredMachines = useMemo(() => {
    return machinesList.filter(m => {
      const loc = getMachineLocations(m, facilityOptions, subFacilityOptions);
      if (selectedFacilityId && loc.facId !== selectedFacilityId) {
        return false;
      }
      if (selectedSubFacilityId && loc.subId !== selectedSubFacilityId) {
        return false;
      }
      return true;
    });
  }, [machinesList, selectedFacilityId, selectedSubFacilityId, facilityOptions, subFacilityOptions]);

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

    if (!selectedFacilityId) {
      errors.facilityId = 'Facility is required.';
    }
    if (!selectedSubFacilityId && availableSubFacilities.length > 0) {
      errors.subFacilityId = 'Sub-Facility is required.';
    }
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        machineId: Number(selectedMachineId),
        problemDescription: problemDescription.trim(),
        priority: status === 'Breakdown' ? 'HIGH' : status === 'Safety' ? 'CRITICAL' : 'MEDIUM',
        statusType: status,
        maintenanceCategory: status.toUpperCase(),
        triggerType: status === 'Preventive' ? 'SCHEDULED' : 'MANUAL',
        mediaFiles: mediaList,
      };

      const result = await workOrderService.createWorkOrder(payload);
      toast.success(`Work Order ${result?.woNumber || 'WO-2026-XXXX'} created successfully!`);
      if (returnUrl) {
        navigate(returnUrl, { state: { tab: returnTab, returnTab } });
      } else {
        navigate('/work-orders');
      }
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
    <div className="p-3 sm:p-5 w-full h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-900 mr-2 focus:outline-none cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Add Work Order</h1>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-1.5 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-70 min-w-[80px] cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>

      {/* Form Card Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5 sm:p-5 flex-1 flex flex-col min-h-0">
        <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 flex flex-col min-h-0">
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            {/* Facility */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Facility <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedFacilityId}
                onChange={e => handleFacilityChange(e.target.value)}
                className={`w-full px-3 py-1.5 min-h-[34px] border ${
                  validationErrors.facilityId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } rounded-lg bg-white text-xs sm:text-sm text-gray-900 outline-none focus:border-green-500 transition-all cursor-pointer`}
              >
                <option value="">Select Facility</option>
                {facilityOptions.map(fac => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-Facility */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sub-Facility <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSubFacilityId}
                onChange={e => handleSubFacilityChange(e.target.value)}
                className={`w-full px-3 py-1.5 min-h-[34px] border ${
                  validationErrors.subFacilityId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } rounded-lg bg-white text-xs sm:text-sm text-gray-900 outline-none focus:border-green-500 transition-all cursor-pointer`}
              >
                <option value="">Select Sub-Facility</option>
                {availableSubFacilities.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Machine Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Machine <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMachineId}
                onChange={e => handleMachineSelect(e.target.value)}
                className={`w-full px-3 py-1.5 min-h-[34px] border ${
                  validationErrors.machineId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } rounded-lg bg-white text-xs sm:text-sm text-gray-900 outline-none focus:border-green-500 transition-all cursor-pointer`}
              >
                <option value="">{filteredMachines.length === 0 ? 'No machines available' : 'Select Machine'}</option>
                {filteredMachines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.machineCode || `ID-${m.id}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 min-h-[34px] border border-gray-300 rounded-lg bg-white text-xs sm:text-sm text-gray-900 outline-none focus:border-green-500 transition-all cursor-pointer"
              >
                <option value="Predictive">Predictive</option>
                <option value="Preventive">Preventive</option>
                <option value="Safety">Safety</option>
                <option value="Breakdown">Breakdown</option>
              </select>
            </div>
          </div>

          {/* Auto-populated Machine Details (single row layout) */}
          {selectedMachine && (
            <div className="bg-green-50/50 border border-green-200 rounded-lg px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-400 font-semibold text-[10px] uppercase shrink-0">MAKE & MODEL:</span>
                <span className="font-bold text-gray-900 text-xs truncate">{selectedMachine.make || 'Grundfos'} / {selectedMachine.modelNumber || 'CRN-15'}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-400 font-semibold text-[10px] uppercase shrink-0">SERIAL NUMBER:</span>
                <span className="font-bold text-gray-900 text-xs truncate">{selectedMachine.serialNumber || 'SN-2026-9901'}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-400 font-semibold text-[10px] uppercase shrink-0">CATEGORY:</span>
                <span className="font-bold text-gray-900 text-xs truncate">{selectedMachine.machineCategory || 'Equipment'}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-400 font-semibold text-[10px] uppercase shrink-0">MACHINE CODE:</span>
                <span className="font-bold text-gray-900 text-xs truncate">{selectedMachine.machineCode || `MCH-${selectedMachine.id}`}</span>
              </div>
            </div>
          )}

          {/* Problem Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Problem Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={problemDescription}
              onChange={e => {
                setProblemDescription(e.target.value);
                if (validationErrors.problemDescription) {
                  setValidationErrors(prev => ({ ...prev, problemDescription: '' }));
                }
              }}
              rows={4}
              placeholder="Enter detailed problem description, abnormal noise, leak, or fault details..."
              className={`w-full p-3 border ${
                validationErrors.problemDescription ? 'border-red-500 bg-red-50' : 'border-gray-300'
              } rounded-xl bg-white text-xs sm:text-sm text-gray-900 outline-none focus:border-green-500 transition-all placeholder-gray-400 resize-none min-h-[90px]`}
            />
            {validationErrors.problemDescription && (
              <p className="text-xs text-red-500 font-semibold mt-1">{validationErrors.problemDescription}</p>
            )}
          </div>

          {/* Photo & Video Upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                Attach Photos & Videos (Optional)
              </label>
              {mediaList.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {mediaList.length} file{mediaList.length > 1 ? 's' : ''} attached
                </span>
              )}
            </div>

            {mediaList.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 hover:border-green-500 rounded-xl p-4 sm:p-5 text-center bg-gray-50/70 hover:bg-green-50/20 transition-all relative flex flex-col items-center justify-center gap-2 cursor-pointer group min-h-[120px]">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  disabled={uploadingFiles}
                />
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 group-hover:border-green-300 text-green-600 group-hover:scale-105 transition-all flex items-center justify-center shadow-2xs shrink-0">
                  {uploadingFiles ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                </div>
                <div className="text-center min-w-0">
                  <p className="text-xs font-bold text-gray-800">
                    {uploadingFiles ? 'Uploading Files...' : 'Click or Drag & Drop Photos, Videos or Documents'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Attach fault photos, video clips or manuals (Max 25MB)
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 group-hover:border-emerald-500 group-hover:text-emerald-700 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs transition-all pointer-events-none shrink-0 mt-1">
                  <Upload size={13} /> Browse Files
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {/* Compact dropzone banner */}
                <div className="border-2 border-dashed border-gray-300 hover:border-green-500 rounded-xl py-2.5 px-3.5 text-center bg-gray-50/70 hover:bg-green-50/20 transition-all relative flex items-center justify-center gap-2 cursor-pointer group shrink-0">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    disabled={uploadingFiles}
                  />
                  <Upload size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-emerald-700">
                    {uploadingFiles ? 'Uploading...' : 'Click or Drop to Add More Files'}
                  </span>
                </div>

                {/* Scrollable Thumbnails row/grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-[140px] overflow-y-auto p-0.5">
                  {mediaList.map((m, idx) => (
                    <div key={idx} className="relative group bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all min-h-[90px] h-[100px] flex items-center justify-center">
                      {m.fileType === 'VIDEO' ? (
                        <div className="flex flex-col items-center justify-center text-slate-700 p-1 text-center h-full w-full">
                          <Film size={22} className="text-slate-600 mb-0.5" />
                          <span className="text-[10px] truncate max-w-full font-medium">{m.fileName}</span>
                        </div>
                      ) : isDocFile(m) ? (
                        <div className="flex flex-col items-center justify-center p-2 text-center h-full w-full bg-slate-50">
                          <FileText size={20} className="text-emerald-600 mb-1" />
                          <span className="text-[10px] font-semibold text-slate-800 truncate max-w-full" title={m.fileName}>
                            {m.fileName}
                          </span>
                        </div>
                      ) : (
                        <img src={m.fileUrl} alt={m.fileName} className="w-full h-full object-cover" />
                      )}

                      {/* Action buttons overlay */}
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewMedia(m)}
                          className="p-1.5 bg-white/95 hover:bg-emerald-600 text-slate-700 hover:text-white rounded-md transition-all cursor-pointer shadow-xs"
                          title="View File"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMedia({ index: idx, fileName: m.fileName, fileUrl: m.fileUrl, fileType: m.fileType, newFile: null })}
                          className="p-1.5 bg-white/95 hover:bg-blue-600 text-slate-700 hover:text-white rounded-md transition-all cursor-pointer shadow-xs"
                          title="Edit File"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMedia(idx)}
                          className="p-1.5 bg-white/95 hover:bg-rose-600 text-slate-700 hover:text-white rounded-md transition-all cursor-pointer shadow-xs"
                          title="Delete File"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
