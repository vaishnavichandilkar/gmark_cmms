import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasTabPermission } from '../../../utils/permissions';
import { ArrowLeft, Plus, Trash2, Search, RefreshCw, Sparkles, ChevronDown } from 'lucide-react';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { CustomDatePicker } from '../../../components/shared/CustomDatePicker';
import { api } from '../../../lib/api';
import { FacilityHierarchyPicker } from '../../../components/4m/FacilityHierarchyPicker';
import { MachineHierarchyPicker } from '../../../components/4m/MachineHierarchyPicker';
import { spareService } from '../../../services/spareService';
import toast from 'react-hot-toast';

const tabs = ['General', 'Specification', 'Spares', 'AMC', 'Purchase', 'Documents', 'IOT'];

export function AddMachine() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as any;
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const savedDraft = (() => {
    try {
      const saved = sessionStorage.getItem('add_machine_draft');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  const permittedTabs = tabs.filter(tab => hasTabPermission(currentUser, tab, 'view'));

  // Tab States
  const [activeTab, setActiveTab] = useState(locationState?.tab || savedDraft?.activeTab || 'General');
  const [pendingSpares, setPendingSpares] = useState<any[]>(savedDraft?.pendingSpares || []);
  const [spareSearchQuery, setSpareSearchQuery] = useState('');

  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [pendingSpecifications, setPendingSpecifications] = useState<any[]>(savedDraft?.pendingSpecifications || []);
  const [specTitle, setSpecTitle] = useState('');
  const [specInputType, setSpecInputType] = useState('text');
  const [specData, setSpecData] = useState('');
  const [specUnit, setSpecUnit] = useState('');

  const [isSparesModalOpen, setIsSparesModalOpen] = useState(false);
  const [catalogSpares, setCatalogSpares] = useState<any[]>([]);
  const [availableLocationsList, setAvailableLocationsList] = useState<string[]>([]);
  const [spareModalLocation, setSpareModalLocation] = useState('');
  const [spareModalName, setSpareModalName] = useState('');
  const [spareModalQuantity, setSpareModalQuantity] = useState<number | string>(1);
  const [spareModalRate, setSpareModalRate] = useState<number | string>('');
  const [isAmcModalOpen, setIsAmcModalOpen] = useState(false);
  const [amcSubTab, setAmcSubTab] = useState('AMC');
  const [amcSearchQuery, setAmcSearchQuery] = useState('');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseSubTab, setPurchaseSubTab] = useState('Machine Purchase');

  const [uploadModalType, setUploadModalType] = useState<'File' | 'Link' | 'Note' | null>(null);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<any[]>(savedDraft?.pendingDocuments || []);
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const [isIotModalOpen, setIsIotModalOpen] = useState(false);
  const [pendingMacId, setPendingMacId] = useState(savedDraft?.pendingMacId || '');
  const [tempMacId, setTempMacId] = useState('');
  const [pendingMachineType, setPendingMachineType] = useState(savedDraft?.pendingMachineType || 'HYPN');
  const [tempMachineType, setTempMachineType] = useState('HYPN');

  const [formData, setFormData] = useState<any>(savedDraft?.formData || {
    company: '',
    facilityId: '',
    maintenanceHead: '',
    name: '', 
    machineCode: '',
    status: 'Online',
    serialNumber: '',
    make: '',
    modelNumber: '',
    machineCategory: '',
    machineSubCategory: '',
    description: '',
    isLocationPart: false,
    locationId: '',
    parentDeviceId: '',
    latitude: '',
    longitude: '',
    assetCode: '',
    costCenter: 'CC-MAINT-01',
    headOfDepartment: '',
    machineOwner: '',
    notes: '',
  });

  const [makeOptions, setMakeOptions] = useState<string[]>(['Make 1']);
  const [modelOptions, setModelOptions] = useState<string[]>(['Model 1']);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['Category 1', 'HYPN', 'FIRE', 'STP', 'WTP', 'SUMP']);
  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>(['Sub-Category 1']);

  const handleAddOption = async (
    type: 'make' | 'modelNumber' | 'machineCategory' | 'machineSubCategory',
    value: string
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (type === 'make') {
      setMakeOptions(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    } else if (type === 'modelNumber') {
      setModelOptions(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    } else if (type === 'machineCategory') {
      setCategoryOptions(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    } else if (type === 'machineSubCategory') {
      setSubCategoryOptions(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    }

    try {
      await api.post('/machines/options', { type, value: trimmed });
    } catch (err) {
      console.error(`Failed to persist option for ${type}:`, err);
    }
  };

  // Handle return from Spares Management with a new spare
  useEffect(() => {
    if (locationState?.tab) {
      setActiveTab(locationState.tab);
    }
    const syncSpare = async () => {
      if (locationState?.newSpare) {
        const createdSpare = locationState.newSpare;
        setPendingSpares(prev => {
          if (prev.some(s => s.id === createdSpare.id)) return prev;
          return [...prev, createdSpare];
        });
      } else if (locationState?.newSpareId) {
        const spareId = Number(locationState.newSpareId);
        try {
          const createdSpare = await spareService.getById(spareId);
          if (createdSpare) {
            setPendingSpares(prev => {
              if (prev.some(s => s.id === createdSpare.id)) return prev;
              return [...prev, createdSpare];
            });
          }
        } catch (e) {
          console.error('Failed to load returned spare', e);
        }
      }
    };
    syncSpare();
  }, [locationState]);

  useEffect(() => {
    if (permittedTabs.length > 0 && !permittedTabs.includes(activeTab)) {
      setActiveTab(permittedTabs[0]);
    }
  }, [permittedTabs, activeTab]);

  const fetchNextMachineCode = async () => {
    try {
      const res = await api.get('/machines/next-machine-code');
      if (res.data?.nextCode) {
        setFormData((prev: any) => ({
          ...prev,
          machineCode: res.data.nextCode
        }));
      }
    } catch (err) {
      console.error('Failed to fetch next machine code:', err);
    }
  };

  const fetchNextAssetCode = async () => {
    try {
      const res = await api.get('/machines/next-asset-code');
      if (res.data?.nextCode) {
        setFormData((prev: any) => ({
          ...prev,
          assetCode: res.data.nextCode
        }));
      }
    } catch (err) {
      console.error('Failed to fetch next asset code:', err);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/facilities'),
      api.get('/main-facilities'),
      api.get('/employees'),
      api.get('/machines/next-codes'),
      spareService.getAll(),
    ]).then(([facRes, mainFacRes, empRes, codesRes, sparesRes]) => {
      setEmployees(empRes.data);
      if (sparesRes) {
        setCatalogSpares(sparesRes);
      }
      const locs: string[] = [];
      if (facRes?.data) {
        facRes.data.forEach((f: any) => {
          if (f.facilityName && !locs.includes(f.facilityName)) locs.push(f.facilityName);
        });
      }
      if (mainFacRes?.data) {
        mainFacRes.data.forEach((mf: any) => {
          if (mf.mainFacilityName && !locs.includes(mf.mainFacilityName)) locs.push(mf.mainFacilityName);
        });
      }
      if (locs.length === 0) {
        locs.push('Main Store', 'Building A', 'Floor 1', 'Warehouse');
      }
      setAvailableLocationsList(locs);

      if (codesRes?.data) {
        setFormData((prev: any) => ({
          ...prev,
          machineCode: prev.machineCode || codesRes.data.nextMachineCode || '',
          assetCode: prev.assetCode || codesRes.data.nextAssetCode || '',
        }));
      }
    }).catch(console.error);

    api.get('/machines/dropdown-options')
      .then(res => {
        if (res.data) {
          if (Array.isArray(res.data.makes) && res.data.makes.length > 0) {
            setMakeOptions(res.data.makes);
          }
          if (Array.isArray(res.data.modelNumbers) && res.data.modelNumbers.length > 0) {
            setModelOptions(res.data.modelNumbers);
          }
          if (Array.isArray(res.data.machineCategories) && res.data.machineCategories.length > 0) {
            setCategoryOptions(res.data.machineCategories);
          }
          if (Array.isArray(res.data.machineSubCategories) && res.data.machineSubCategories.length > 0) {
            setSubCategoryOptions(res.data.machineSubCategories);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.isLocationPart && formData.parentDeviceId) {
      api.get(`/machines/${formData.parentDeviceId}`).then((res) => {
        const parent = res.data;
        if (parent) {
          setFormData((prev: any) => ({
            ...prev,
            locationId: parent.facilityId?.toString() || parent.buildingId?.toString() || prev.locationId,
            locationType: parent.facilityId ? 'facility' : (parent.buildingId ? 'building' : (prev as any).locationType),
            latitude: parent.latitude || prev.latitude,
            longitude: parent.longitude || prev.longitude,
            assetCode: parent.assetCode || prev.assetCode,
            costCenter: parent.costCenter || prev.costCenter,
            headOfDepartment: parent.headOfDepartment || prev.headOfDepartment,
            machineOwner: parent.machineOwner || prev.machineOwner,
            notes: parent.notes || prev.notes,
          }));
        }
      }).catch(console.error);
    }
  }, [formData.parentDeviceId, formData.isLocationPart]);

  const handleChange = (e: any) => {
    const { name, value, dataset } = e.target;
    setFormData((prev: any) => {
      const updates: any = {
        ...prev,
        [name]: value,
        ...(dataset?.type ? { locationType: dataset.type } : {})
      };
      
      if (name === 'company') {
        updates.facilityId = '';
      }
      if (name === 'facilityId' && value && (!prev.locationId || prev.locationId === prev.facilityId)) {
        updates.locationId = value;
      }
      
      return updates;
    });
  };

  const handleGoBack = () => {
    const targetReturnUrl = locationState?.returnUrl || (() => {
      try {
        const draft = sessionStorage.getItem('spare_details_draft');
        return draft ? JSON.parse(draft).returnUrl : null;
      } catch {
        return null;
      }
    })();
    if (targetReturnUrl) {
      navigate(targetReturnUrl, {
        state: {
          tab: locationState?.returnTab || 'Machines List'
        }
      });
    } else {
      navigate('/machine-management');
    }
  };

  const handleOpenAddSpareModal = () => {
    setSpareModalLocation(formData.company || availableLocationsList[0] || 'Main Store');
    setSpareModalName('');
    setSpareModalQuantity(1);
    setSpareModalRate('');
    setIsSparesModalOpen(true);
  };

  const handleSelectSpareName = (val: string) => {
    setSpareModalName(val);
    const found = catalogSpares.find(s => (s.partName || s.name) === val || String(s.id) === val);
    if (found) {
      if (found.location) setSpareModalLocation(found.location);
      if (found.rate !== undefined && found.rate !== null && found.rate !== '') {
        setSpareModalRate(found.rate);
      } else if (found.unitCost !== undefined && found.unitCost !== null && found.unitCost !== '') {
        setSpareModalRate(found.unitCost);
      }
    }
  };

  const handleSaveSpareModal = () => {
    if (!spareModalName.trim()) {
      toast.error('Please select or enter a spare name');
      return;
    }

    const qty = Number(spareModalQuantity) || 1;
    const rate = Number(spareModalRate) || 0;
    const total = qty * rate;

    const found = catalogSpares.find(s => (s.partName || s.name) === spareModalName);

    const newSpareItem = {
      id: found?.id || Date.now(),
      partName: spareModalName.trim(),
      partCode: found?.partCode || `PRT-${Math.floor(100 + Math.random() * 900)}`,
      category: found?.category || 'General',
      location: spareModalLocation || found?.location || 'Main Store',
      quantityUsed: qty,
      stockQuantity: qty,
      inHandQuantity: qty,
      rate: rate,
      unitCost: rate,
      total: total,
    };

    setPendingSpares(prev => {
      const idx = prev.findIndex(s => s.id === newSpareItem.id || s.partName === newSpareItem.partName);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...newSpareItem };
        return updated;
      }
      return [...prev, newSpareItem];
    });

    toast.success('Spare added successfully');
    setIsSparesModalOpen(false);
  };

  const handleFinalSave = async () => {
    if (!formData.company || !formData.facilityId) {
      toast.error('Please select Facility and Sub-Facility.');
      setActiveTab('General');
      return;
    }

    if (!formData.name?.trim() || !formData.machineCode || !formData.serialNumber?.trim()) {
      toast.error('Please fill out Machine Name, Code, and Serial Number.');
      setActiveTab('General');
      return;
    }

    if (!formData.make || !formData.modelNumber || !formData.machineCategory || !formData.machineSubCategory) {
      toast.error('Please fill out Make, Model, Category, and Sub-Category.');
      setActiveTab('General');
      return;
    }

    if (
      !formData.locationId ||
      !formData.latitude ||
      !formData.longitude ||
      !formData.assetCode ||
      !formData.costCenter?.trim() ||
      !formData.headOfDepartment ||
      !formData.machineOwner
    ) {
      toast.error('Please fill out all required fields in the General tab.');
      setActiveTab('General');
      return;
    }

    try {
      setLoading(true);
      
      const payload: any = {
        name: formData.name,
        facilityId: formData.facilityId ? parseInt(formData.facilityId) : undefined,
        buildingId: (formData as any).locationType === 'building' || (formData as any).locationType === 'society' ? parseInt(formData.facilityId) : undefined,
        company: formData.company,
        maintenanceHead: formData.maintenanceHead,
        machineCode: formData.machineCode,
        serialNumber: formData.serialNumber,
        make: formData.make,
        modelNumber: formData.modelNumber,
        machineCategory: formData.machineCategory || pendingMachineType,
        machineSubCategory: formData.machineSubCategory,
        machineType: pendingMachineType || formData.machineCategory || 'HYPN',
        description: formData.description,
        isLocationPart: formData.isLocationPart,
        parentDeviceId: formData.isLocationPart && formData.parentDeviceId ? parseInt(formData.parentDeviceId) : undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        assetCode: formData.assetCode,
        costCenter: formData.costCenter?.trim() || 'CC-MAINT-01',
        headOfDepartment: formData.headOfDepartment,
        machineOwner: formData.machineOwner,
        notes: formData.notes,
        application: pendingMachineType || 'DOMESTIC_WATER_SYS',
        pumpType: 'WMP_BOOSTER_PUMP',
        controller: 'AIPCU',
        macType: 'Primary MAC',
      };

      // 1. Create Machine
      const machineRes = await api.post('/machines', payload);
      const newMachineId = machineRes.data.id;

      // 2. Add MAC ID
      if (pendingMacId) {
        await api.put(`/machines/${newMachineId}`, {
          ...payload,
          deviceId: pendingMacId,
          machineType: pendingMachineType,
        });
      }

      // 3. Add Specifications
      for (const spec of pendingSpecifications) {
        await api.post(`/machines/${newMachineId}/specifications`, {
          title: spec.title,
          inputType: spec.inputType,
          data: spec.data,
          unit: spec.unit
        });
      }

      // 4. Add Documents
      for (const doc of pendingDocuments) {
        if (doc.type === 'File' && doc.file) {
          const fd = new FormData();
          fd.append('name', doc.name);
          fd.append('type', 'File');
          fd.append('file', doc.file);
          await api.post(`/machines/${newMachineId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' }});
        } else {
          await api.post(`/machines/${newMachineId}/documents`, {
            name: doc.name,
            type: doc.type,
            content: doc.content
          });
        }
      }

      sessionStorage.removeItem('add_machine_draft');
      toast.success('Machine saved successfully!');

      const targetReturnUrl = locationState?.returnUrl || (() => {
        try {
          const draft = sessionStorage.getItem('spare_details_draft');
          return draft ? JSON.parse(draft).returnUrl : null;
        } catch {
          return null;
        }
      })();

      if (targetReturnUrl) {
        navigate(targetReturnUrl, {
          state: {
            tab: locationState?.returnTab || 'Machines List',
            newMachine: machineRes.data || { ...payload, id: newMachineId },
            newMachineId: newMachineId,
          }
        });
      } else {
        navigate('/machine-management');
      }
    } catch (err: any) {
      console.error('Failed to create machine', err);
      toast.error(err.response?.data?.message || 'Failed to save machine');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpec = () => {
    if (!specTitle || !specData) {
      toast.error('Please fill out required fields');
      return;
    }
    setPendingSpecifications(prev => [...prev, {
      id: Date.now(),
      title: specTitle,
      inputType: specInputType,
      data: specData,
      unit: specUnit
    }]);
    setIsSpecModalOpen(false);
    setSpecTitle('');
    setSpecData('');
    setSpecUnit('');
  };

  const handleDeleteSpec = (id: number) => {
    setPendingSpecifications(prev => prev.filter(s => s.id !== id));
  };

  const handleUploadDocument = () => {
    if (!docName) {
      toast.error('Please enter a name');
      return;
    }
    if (uploadModalType === 'File' && !docFile) {
      toast.error('Please select a file');
      return;
    }
    if ((uploadModalType === 'Link' || uploadModalType === 'Note') && !docContent) {
      toast.error('Please provide content');
      return;
    }

    setPendingDocuments(prev => [...prev, {
      id: Date.now(),
      name: docName,
      type: uploadModalType,
      content: uploadModalType !== 'File' ? docContent : null,
      file: uploadModalType === 'File' ? docFile : null,
      size: uploadModalType === 'File' && docFile ? `${(docFile.size / (1024 * 1024)).toFixed(2)} MB` : '-',
      uploadedBy: 'Admin',
      date: new Date().toISOString()
    }]);

    setUploadModalType(null);
    setDocName('');
    setDocContent('');
    setDocFile(null);
  };

  const handleDeleteDoc = (id: number) => {
    setPendingDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="sm:px-4 pb-6 pt-0 w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={handleGoBack}
          className="text-slate-700 hover:text-black mr-2.5 focus:outline-none flex items-center cursor-pointer"
        >
          <ArrowLeft size={20} className="stroke-[2.5]" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">New Machine</h1>
      </div>

      <div className="bg-white rounded-lg shadow-2xs border border-slate-200/90 w-full relative">
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/70 p-1 gap-1">
          {permittedTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-emerald-600 text-white shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >{tab}</button>
          ))}
        </div>

        <div className="p-4 sm:p-5 w-full">
          {activeTab === 'General' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Facility<span className="text-red-500">*</span></label>
                  <FacilityHierarchyPicker name="company" value={formData.company} onChange={handleChange} placeholder="Select Facility" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Sub-Facility<span className="text-red-500">*</span></label>
                  <FacilityHierarchyPicker name="facilityId" value={formData.facilityId} onChange={handleChange} placeholder="Select Sub-Facility" filterByMainFacilityId={formData.company} disabled={!formData.company} selectableTypes={['facility', 'building']} defaultExpanded={true} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Maintenance Head</label>
                  <CustomSelect name="maintenanceHead" value={formData.maintenanceHead} onChange={handleChange} placeholder="Select Head" options={employees.map(e => ({ label: `${e.designation || 'N/A'} - ${e.fullName}`, value: e.fullName }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Machine Name<span className="text-red-500">*</span></label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all" /></div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Machine Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="machineCode"
                    value={formData.machineCode}
                    onChange={handleChange}
                    readOnly
                    placeholder="Enter Machine Code"
                    className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-slate-100 border border-slate-200 rounded-md text-xs outline-none text-slate-600 font-medium cursor-not-allowed"
                  />
                </div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Status<span className="text-red-500">*</span></label><CustomSelect name="status" value={formData.status} onChange={handleChange} placeholder="Select Status" options={[{ label: 'Online', value: 'Online' }, { label: 'Offline', value: 'Offline' }]} /></div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Serial Number<span className="text-red-500">*</span></label><input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all" /></div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Make<span className="text-red-500">*</span></label>
                  <CustomSelect 
                    name="make" 
                    value={formData.make} 
                    onChange={handleChange} 
                    placeholder="Select Make" 
                    options={makeOptions} 
                    allowCustom={true} 
                    onAddOption={(val) => handleAddOption('make', val)} 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Model Number<span className="text-red-500">*</span></label>
                  <CustomSelect 
                    name="modelNumber" 
                    value={formData.modelNumber} 
                    onChange={handleChange} 
                    placeholder="Select Model Number" 
                    options={modelOptions} 
                    allowCustom={true} 
                    onAddOption={(val) => handleAddOption('modelNumber', val)} 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Machine Category<span className="text-red-500">*</span></label>
                  <CustomSelect 
                    name="machineCategory" 
                    value={formData.machineCategory} 
                    onChange={handleChange} 
                    placeholder="Select Category" 
                    options={categoryOptions} 
                    allowCustom={true} 
                    onAddOption={(val) => handleAddOption('machineCategory', val)} 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Machine Sub-Category<span className="text-red-500">*</span></label>
                  <CustomSelect 
                    name="machineSubCategory" 
                    value={formData.machineSubCategory} 
                    onChange={handleChange} 
                    placeholder="Select Sub-Category" 
                    options={subCategoryOptions} 
                    allowCustom={true} 
                    onAddOption={(val) => handleAddOption('machineSubCategory', val)} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Machine Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none h-12"></textarea>
              </div>

              <div>
                <h3 className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Location</h3>
                <div className="bg-slate-50/80 p-2 sm:p-2.5 rounded-md border border-slate-200 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <label className="flex items-center gap-2 min-w-[190px] cursor-pointer">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${formData.isLocationPart ? 'border-blue-600' : 'border-slate-300'}`}>
                        {formData.isLocationPart && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                      </div>
                      <input type="radio" checked={formData.isLocationPart} onChange={() => setFormData((prev: any) => ({...prev, isLocationPart: true}))} className="hidden" />
                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">This Machine is a part of</span>
                    </label>
                    <div className="flex-1 max-w-md">
                      <MachineHierarchyPicker name="parentDeviceId" value={formData.parentDeviceId} onChange={handleChange} disabled={!formData.isLocationPart} filterByCompany={formData.company} filterByLocationId={formData.locationId} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${!formData.isLocationPart ? 'border-blue-600' : 'border-slate-300'}`}>
                      {!formData.isLocationPart && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                    </div>
                    <input type="radio" checked={!formData.isLocationPart} onChange={() => setFormData((prev: any) => ({...prev, isLocationPart: false}))} className="hidden" />
                    <span className="text-xs font-medium text-slate-700">This Machine is not a part of another location, is located at</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Location<span className="text-red-500">*</span></label><FacilityHierarchyPicker name="locationId" value={formData.locationId} onChange={handleChange} /></div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Latitude<span className="text-red-500">*</span></label><input type="text" name="latitude" value={formData.latitude} onChange={handleChange} className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all" /></div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Longitude<span className="text-red-500">*</span></label><input type="text" name="longitude" value={formData.longitude} onChange={handleChange} className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Asset Code <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="assetCode" 
                    value={formData.assetCode} 
                    onChange={handleChange} 
                    readOnly
                    placeholder="Enter Asset Code"
                    className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-slate-100 border border-slate-200 rounded-md text-xs outline-none text-slate-600 font-medium cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Cost Center<span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="costCenter" 
                    value={formData.costCenter || 'CC-MAINT-01'} 
                    onChange={handleChange} 
                    placeholder="e.g. CC-MAINT-01" 
                    className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all" 
                  />
                </div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Select Head of Department<span className="text-red-500">*</span></label><CustomSelect name="headOfDepartment" value={formData.headOfDepartment} onChange={handleChange} options={employees.map(e => ({ label: `${e.designation || 'N/A'} - ${e.fullName}`, value: e.fullName }))} /></div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Machine Owner<span className="text-red-500">*</span></label><CustomSelect name="machineOwner" value={formData.machineOwner} onChange={handleChange} options={employees.map(e => ({ label: `${e.designation || 'N/A'} - ${e.fullName}`, value: e.fullName }))} /></div>
                <div className="col-span-1 md:col-span-4"><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none h-11"></textarea></div>
              </div>
            </div>
          )}

          {activeTab === 'Specification' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Upload Name Plate</label>
                <div className="relative max-w-md">
                  <input type="file" className="block w-full text-sm text-gray-600 border border-gray-300 rounded-xl cursor-pointer focus:outline-none file:mr-4 file:py-2.5 file:px-4 file:border-0 file:border-r file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-400 mb-4">Location</label>
                <button onClick={() => setIsSpecModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold text-sm cursor-pointer">
                  <Plus size={18} /> Add Specification Field
                </button>
                {pendingSpecifications.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {pendingSpecifications.map((spec) => (
                      <div key={spec.id} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded-xl">
                        <div><p className="text-xs text-gray-500 font-semibold mb-1">{spec.title}</p><p className="text-sm font-bold text-gray-900">{spec.data} {spec.unit}</p></div>
                        <button onClick={() => handleDeleteSpec(spec.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 cursor-pointer"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Spares' ? (
            <div className="space-y-6 w-full">
              <div className="flex justify-end items-center gap-4">
                <button 
                  type="button"
                  onClick={handleOpenAddSpareModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus size={16} className="stroke-[3]" /> Add Spare
                </button>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search" 
                    value={spareSearchQuery}
                    onChange={(e) => setSpareSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-100 rounded-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg w-12"><input type="checkbox" className="rounded border-gray-300" disabled /></th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">No.</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Make</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Model Number</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Quantity Used</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Rate</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Total</th>
                      <th className="px-4 py-3 rounded-r-lg text-xs font-bold text-gray-500 uppercase text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSpares.filter(s => 
                      (s.partName || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                      (s.partCode || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                      (s.category || '').toLowerCase().includes(spareSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm font-medium text-gray-500 bg-white">
                          No spares added yet.
                        </td>
                      </tr>
                    ) : (
                      pendingSpares.filter(s => 
                        (s.partName || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                        (s.partCode || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                        (s.category || '').toLowerCase().includes(spareSearchQuery.toLowerCase())
                      ).map((spare, index) => {
                        const qty = spare.stockQuantity || spare.inHandQuantity || 1;
                        const rate = spare.rate !== undefined ? Number(spare.rate) : spare.unitCost ? Number(spare.unitCost) : 0;
                        const total = qty * rate;
                        return (
                          <tr key={spare.id || index} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                            <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{spare.partName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{spare.category || '-'}</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">{spare.partCode || '-'}</td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-gray-800">{qty}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-800">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">₹{total.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setPendingSpares(prev => prev.filter(s => s.id !== spare.id))}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                title="Remove Spare"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'AMC' ? (
            <div className="space-y-6 w-full">
              {/* Toolbar */}
              <div className="flex justify-between items-center">
                {/* Toggle Group */}
                <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <button 
                    onClick={() => setAmcSubTab('AMC')}
                    className={`px-6 py-2 text-sm font-semibold transition-colors cursor-pointer ${amcSubTab === 'AMC' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    AMC
                  </button>
                  <button 
                    onClick={() => setAmcSubTab('Warranties')}
                    className={`px-6 py-2 text-sm font-semibold transition-colors border-l border-gray-200 cursor-pointer ${amcSubTab === 'Warranties' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Warranties
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsAmcModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[3]" /> Add {amcSubTab}
                  </button>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search" 
                      value={amcSearchQuery}
                      onChange={(e) => setAmcSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-100 rounded-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg w-12"><input type="checkbox" className="rounded border-gray-300" disabled /></th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">No.</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Provider Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Start Date</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">End Date</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{amcSubTab === 'AMC' ? 'AMC Usage' : 'Warranties Usage'}</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Certificate Number</th>
                      <th className="px-4 py-3 rounded-r-lg text-xs font-bold text-gray-500 uppercase text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[]?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm font-medium text-gray-500 bg-white">
                          No {amcSubTab} added yet.
                        </td>
                      </tr>
                    ) : (
                      null
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'Purchase' ? (
            <div className="space-y-6 w-full">
              {/* Toolbar */}
              <div className="flex justify-between items-center">
                {/* Toggle Group */}
                <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <button 
                    onClick={() => setPurchaseSubTab('Machine Purchase')}
                    className={`px-6 py-2 text-sm font-semibold transition-colors cursor-pointer ${purchaseSubTab === 'Machine Purchase' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Machine Purchase
                  </button>
                  <button 
                    onClick={() => setPurchaseSubTab('Spare/Service Purchase')}
                    className={`px-6 py-2 text-sm font-semibold transition-colors border-l border-gray-200 cursor-pointer ${purchaseSubTab === 'Spare/Service Purchase' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Spare/Service Purchase
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsPurchaseModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[3]" /> Add Purchase
                  </button>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search" 
                      className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-100 rounded-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg w-12"><input type="checkbox" className="rounded border-gray-300" disabled /></th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">No.</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Contact Number</th>
                      <th className="px-4 py-3 rounded-r-lg text-xs font-bold text-gray-500 uppercase text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[]?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-gray-500 bg-white">
                          No {purchaseSubTab} added yet.
                        </td>
                      </tr>
                    ) : (
                      null
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === 'Documents' && (
            <div className="space-y-6 w-full">
              {/* Toolbar */}
              <div className="flex justify-end items-center">
                <div className="relative">
                  <button 
                    onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[3]" /> Upload
                  </button>
                  
                  {/* Upload Dropdown */}
                  {isUploadMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                      <button 
                        onClick={() => { setUploadModalType('File'); setIsUploadMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        File
                      </button>
                      <button 
                        onClick={() => { setUploadModalType('Link'); setIsUploadMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Link
                      </button>
                      <button 
                        onClick={() => { setUploadModalType('Note'); setIsUploadMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Notes
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-100 rounded-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg w-12"><input type="checkbox" className="rounded border-gray-300" disabled /></th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">No.</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Document Type</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Document Details</th>
                      <th className="px-4 py-3 rounded-r-lg text-xs font-bold text-gray-500 uppercase text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDocuments?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-gray-500 bg-white">
                          No documents added yet.
                        </td>
                      </tr>
                    ) : (
                      pendingDocuments.map((doc, index) => (
                        <tr key={doc.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                          <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{doc.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {doc.type === 'File' ? (
                              <a href={doc.content} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View File</a>
                            ) : doc.type === 'Link' ? (
                              <a href={doc.content} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{doc.content}</a>
                            ) : (
                              <span className="truncate max-w-[200px] block">{doc.content}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors block mx-auto cursor-pointer"
                              title="Delete Document"
                            >
                              <Trash2 size={16}/>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'IOT' && (
            <div className="w-full">
              <div className="flex-1 flex flex-col w-full">
                {/* Header */}
                <div className="flex justify-between items-center w-full mb-8">
                  <div>
                    {pendingMacId && (
                      <div className="flex items-center gap-4 bg-gray-50 px-5 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500">MAC ID:</span>
                          <span className="text-sm font-black text-gray-900 tracking-wider font-mono">{pendingMacId}</span>
                        </div>
                        <div className="h-4 w-px bg-gray-300" />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500">Type:</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md uppercase">{pendingMachineType}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => { setTempMacId(pendingMacId || ''); setTempMachineType(pendingMachineType || 'HYPN'); setIsIotModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus size={18} className="stroke-[3]" /> {pendingMacId ? 'Update System' : 'Add System'}
                  </button>
                </div>

                {!pendingMacId ? (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 mt-4">
                    <div className="w-16 h-16 bg-white border border-gray-100 rounded-full flex items-center justify-center mb-4 text-blue-600 shadow-xs">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">No IoT System Configured</h3>
                    <p className="text-sm text-gray-500 text-center max-w-sm">Connect an IoT edge device to start monitoring live machine telemetry and status updates.</p>
                  </div>
                ) : (
                  /* Status when MAC ID is added */
                  <div className="space-y-6 w-full flex flex-col">
                    <div className="flex flex-col items-center justify-center py-12 border border-gray-200 rounded-xl bg-gray-50/50">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-700">No Data Available Yet</h3>
                      <p className="text-sm text-gray-500 mt-1">Waiting for the physical device to send its first telemetry update.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 w-full pt-3.5">
        <button 
          type="button"
          onClick={handleFinalSave} 
          disabled={loading} 
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-md font-semibold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Saving...' : 'Save Machine'}
        </button>
      </div>

      {/* Modals */}
      {isSpecModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-xl relative">
            <div className="flex items-center gap-4 mb-2">
              <button onClick={() => setIsSpecModalOpen(false)} className="text-gray-900 hover:text-gray-700 cursor-pointer">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Add Specification Field</h2>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-6 ml-10">Asset : {formData.name || 'Domestic Terrace Booster System'}</p>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Title</label>
                <input type="text" value={specTitle} onChange={e=>setSpecTitle(e.target.value)} placeholder="Enter Title" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Input Type</label>
                <CustomSelect name="specInputType" value={specInputType} onChange={(e) => setSpecInputType(e.target.value)} options={[{label: 'Text', value: 'Text'}, {label: 'Number', value: 'Number'}, {label: 'Boolean', value: 'Boolean'}]} placeholder="Select" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Data</label>
                  <input type="text" value={specData} onChange={e=>setSpecData(e.target.value)} placeholder="eg. 120" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Unit</label>
                  <CustomSelect name="specUnit" value={specUnit} onChange={(e) => setSpecUnit(e.target.value)} options={[{label: 'mm', value: 'mm'}, {label: 'kg', value: 'kg'}, {label: 'kW', value: 'kW'}, {label: 'V', value: 'V'}]} placeholder="Select" />
                </div>
              </div>
              <div className="flex justify-center mt-8">
                <button onClick={handleAddSpec} className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-xs cursor-pointer">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Spare Modal (Matching Figma New machine 26) */}
      {isSparesModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[440px] p-6 sm:p-7 shadow-2xl relative border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <button 
                type="button"
                onClick={() => setIsSparesModalOpen(false)} 
                className="p-1 -ml-1 text-slate-500 hover:text-slate-900 transition-colors rounded-lg cursor-pointer"
              >
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Add Spare</h2>
            </div>
            <p className="text-xs text-gray-400 font-medium ml-7 mb-6">
              Asset • {formData.name || 'Machine Name S1'}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location</label>
                <div className="relative">
                  <select
                    value={spareModalLocation}
                    onChange={(e) => setSpareModalLocation(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none pr-10 cursor-pointer"
                  >
                    <option value="">Select</option>
                    {availableLocationsList.map((loc, idx) => (
                      <option key={idx} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Spare Name</label>
                <div className="relative">
                  {catalogSpares.length > 0 ? (
                    <>
                      <select
                        value={spareModalName}
                        onChange={(e) => handleSelectSpareName(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none pr-10 cursor-pointer"
                      >
                        <option value="">Select</option>
                        {catalogSpares.map((spare) => (
                          <option key={spare.id} value={spare.partName || spare.name}>
                            {spare.partName || spare.name} {spare.partCode ? `(${spare.partCode})` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </>
                  ) : (
                    <input
                      type="text"
                      value={spareModalName}
                      onChange={(e) => setSpareModalName(e.target.value)}
                      placeholder="Select or enter spare name"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Quantity Used</label>
                  <input 
                    type="number"
                    min="1"
                    placeholder="12"
                    value={spareModalQuantity}
                    onChange={(e) => setSpareModalQuantity(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rate</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="1200"
                    value={spareModalRate}
                    onChange={(e) => setSpareModalRate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button 
                  type="button"
                  onClick={handleSaveSpareModal}
                  className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-xs cursor-pointer"
                >
                  Save Spare
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add AMC / Warranties Modal */}
      {isAmcModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-xl relative">
            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setIsAmcModalOpen(false)} className="text-gray-800 hover:text-black cursor-pointer">
                <ArrowLeft size={24} className="stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Add {amcSubTab}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-6 px-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{amcSubTab} Type<span className="text-red-500">*</span></label>
                <CustomSelect
                  name="amcType"
                  value=""
                  onChange={() => {}}
                  placeholder="Select Type"
                  options={[]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Upload {amcSubTab} Contract</label>
                <input 
                  type="file"
                  className="block w-full text-sm text-gray-600 border border-gray-500 rounded-lg p-1 cursor-pointer focus:outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Date<span className="text-red-500">*</span></label>
                <CustomDatePicker 
                  name="startDate"
                  value={null}
                  onChange={() => {}}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date<span className="text-red-500">*</span></label>
                <CustomDatePicker 
                  name="endDate"
                  value={null}
                  onChange={() => {}}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{amcSubTab} Usage Terms<span className="text-red-500">*</span></label>
                <CustomSelect
                  name="usageTerms"
                  value=""
                  onChange={() => {}}
                  placeholder={`${amcSubTab} Usage Terms`}
                  options={[]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{amcSubTab} Provider<span className="text-red-500">*</span></label>
                <CustomSelect
                  name={`${amcSubTab.toLowerCase()}Provider`}
                  value=""
                  onChange={() => {}}
                  placeholder="Select Provider"
                  options={[]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{amcSubTab} Contact Number<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter Number"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="col-span-2 flex justify-center mt-6">
                <button 
                  onClick={() => setIsAmcModalOpen(false)}
                  className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-xl relative">
            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-gray-800 hover:text-black cursor-pointer">
                <ArrowLeft size={24} className="stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Add {purchaseSubTab}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-6 px-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Supplier Name<span className="text-red-500">*</span></label>
                <CustomSelect
                  name="supplierName"
                  value=""
                  onChange={() => {}}
                  placeholder="Select"
                  options={[]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contact Number<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter Number"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email<span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  placeholder="email@gmail.com"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address</label>
                <textarea 
                  placeholder="Address"
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400 resize-y min-h-[64px]"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Upload Purchase / Invoice</label>
                <input 
                  type="file"
                  className="block w-full h-[64px] text-sm text-gray-600 border border-gray-500 rounded-lg p-3 cursor-pointer focus:outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 transition-colors"
                />
              </div>

              <div className="col-span-2 flex justify-center mt-4">
                <button 
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadModalType && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-xl relative">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{uploadModalType === 'File' ? 'Upload File' : uploadModalType === 'Link' ? 'Add Link' : 'Add Note'}</h2>
            <div className="space-y-6">
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Name</label><input type="text" value={docName} onChange={e=>setDocName(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              {uploadModalType === 'File' && (
                <div><input type="file" onChange={e=>setDocFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-gray-600 border border-gray-300 rounded-xl p-2 cursor-pointer focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" /></div>
              )}
              {(uploadModalType === 'Link' || uploadModalType === 'Note') && (
                <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">{uploadModalType === 'Link' ? 'URL' : 'Content'}</label><input type="text" value={docContent} onChange={e=>setDocContent(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              )}
              <div className="flex gap-4 mt-8">
                <button onClick={()=>setUploadModalType(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleUploadDocument} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isIotModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-xl relative">
            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setIsIotModalOpen(false)} className="text-gray-800 hover:text-black cursor-pointer">
                <ArrowLeft size={24} className="stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Add MAC ID</h2>
            </div>
            <div className="space-y-5 px-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  MAC ID<span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={tempMacId} 
                  onChange={(e) => setTempMacId(e.target.value)} 
                  placeholder="Enter MAC ID (e.g. 20260508012)" 
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400 font-mono" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Machine / System Type<span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  name="machineType"
                  value={tempMachineType}
                  onChange={(e) => setTempMachineType(e.target.value)}
                  options={[
                    { label: 'HYPN (Hydro-Pneumatic / Booster Pump System)', value: 'HYPN' },
                    { label: 'FIRE (Fire Fighting Panel System)', value: 'FIRE' },
                    { label: 'STP (Sewage Treatment Plant)', value: 'STP' },
                    { label: 'WTP (Water Treatment Plant)', value: 'WTP' },
                    { label: 'SUMP (Sump & Drainage Pump System)', value: 'SUMP' },
                    { label: 'CHILLER (HVAC & Chiller Plant)', value: 'CHILLER' },
                    { label: 'OTHER (General Industrial Machine)', value: 'OTHER' },
                  ]}
                  placeholder="Select Machine / System Type"
                  rounded="xl"
                  inputClassName="px-4 py-3"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Select the machine type to link with this IoT device (e.g. Fire Panel, HYPN Booster).
                </p>
              </div>

              <div className="flex justify-center mt-8">
                <button 
                  onClick={() => { 
                    if (!tempMacId.trim()) { 
                      toast.error('Please enter a MAC ID'); 
                      return; 
                    } 
                    setPendingMacId(tempMacId.trim()); 
                    setPendingMachineType(tempMachineType); 
                    setIsIotModalOpen(false); 
                  }} 
                  className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-xs cursor-pointer"
                >
                  Save System
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
