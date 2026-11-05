import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasTabPermission } from '../../../utils/permissions';
import { 
  ArrowLeft, Plus, Trash2, Search, RefreshCw, Sparkles, ChevronDown, Eye, Pencil, X,
  Wrench, Calendar, CheckSquare, Clock, AlertTriangle, FileText, CheckCircle2, ExternalLink
} from 'lucide-react';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { CustomDatePicker } from '../../../components/shared/CustomDatePicker';
import { api } from '../../../lib/api';
import { FacilityHierarchyPicker } from '../../../components/4m/FacilityHierarchyPicker';
import { MachineHierarchyPicker } from '../../../components/4m/MachineHierarchyPicker';
import { MachineImageCard } from '../../../components/4m/MachineImageCard';
import { spareService } from '../../../services/spareService';
import { supplierService, type Supplier } from '../../../services/supplierService';
import { machineSpareSync } from '../../../utils/machineSpareSync';
import { GiveAccessPromptModal } from '../../../components/4m/GiveAccessPromptModal';
import { GiveAccessModal } from '../../../components/4m/GiveAccessModal';
import toast from 'react-hot-toast';

const tabs = ['General', 'Specification', 'Spares', 'AMC', 'Purchase', 'Documents', 'IOT', 'WO', 'Checklist', 'Schedule Maintenance'];

interface AddMachineProps {
  typeSelector?: React.ReactNode;
}

export function AddMachine({ typeSelector }: AddMachineProps = {}) {
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

  const [createdMachineForAccess, setCreatedMachineForAccess] = useState<{
    id: number;
    name: string;
    code?: string;
    category?: string;
    redirectFn: () => void;
  } | null>(null);
  const [isAccessPromptOpen, setIsAccessPromptOpen] = useState(false);
  const [isGiveAccessModalOpen, setIsGiveAccessModalOpen] = useState(false);

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
  const [pendingPurchases, setPendingPurchases] = useState<any[]>(savedDraft?.pendingPurchases || []);
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseForm, setPurchaseForm] = useState({
    supplierName: '',
    supplierId: '',
    contactNumber: '',
    email: '',
    address: '',
    file: null as File | null,
    fileName: '',
  });

  const [uploadModalType, setUploadModalType] = useState<'File' | 'Link' | 'Note' | null>(null);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<any[]>(savedDraft?.pendingDocuments || []);
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');

  const [isIotModalOpen, setIsIotModalOpen] = useState(false);
  const [pendingMacId, setPendingMacId] = useState(savedDraft?.pendingMacId || '');
  const [tempMacId, setTempMacId] = useState('');
  const [pendingMachineType, setPendingMachineType] = useState(savedDraft?.pendingMachineType || 'HYPN');
  const [tempMachineType, setTempMachineType] = useState('HYPN');

  // WO Tab States
  const [pendingWorkOrders, setPendingWorkOrders] = useState<any[]>(savedDraft?.pendingWorkOrders || []);
  const [woSearchQuery, setWoSearchQuery] = useState('');
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [woForm, setWoForm] = useState({
    problemDescription: '',
    priority: 'MEDIUM',
    triggerType: 'MANUAL',
    assignedTechnicianId: '',
    estimatedStartDate: '',
    estimatedEndDate: '',
  });

  // Checklist Tab States
  const [pendingCheckpoints, setPendingCheckpoints] = useState<any[]>(savedDraft?.pendingCheckpoints || []);
  const [checkpointSearchQuery, setCheckpointSearchQuery] = useState('');
  const [checkpointTabMode, setCheckpointTabMode] = useState<'catalog' | 'custom'>('catalog');
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);
  const [masterCheckpoints, setMasterCheckpoints] = useState<any[]>([]);
  const [selectedMasterCheckpointId, setSelectedMasterCheckpointId] = useState<string>('');
  const [checkpointForm, setCheckpointForm] = useState({
    checkpointType: 'PREVENTIVE',
    category: 'Safety & Mechanical',
    description: '',
    frequency: 'MONTHLY',
    standardValue: '',
    unit: '',
    minValue: '',
    maxValue: '',
  });

  // Schedule Maintenance Tab States
  const [pendingSchedules, setPendingSchedules] = useState<any[]>(savedDraft?.pendingSchedules || []);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduleType: 'PREVENTIVE',
    frequency: 'MONTHLY',
    priority: 'HIGH',
    startDate: new Date().toISOString().split('T')[0],
    triggerTime: '09:00',
    prePlanToleranceDays: 1,
    postPlanToleranceDays: 1,
    notes: '',
  });

  useEffect(() => {
    api.get('/checkpoints/master').then(res => {
      if (Array.isArray(res.data)) {
        setMasterCheckpoints(res.data);
      }
    }).catch(() => {});
  }, []);

  const [formData, setFormData] = useState<any>(savedDraft?.formData || {
    company: '',
    facilityId: '',
    maintenanceHead: '',
    name: '', 
    machineCode: '',
    status: 'Online',
    imageUrl: savedDraft?.formData?.imageUrl || '',
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

  const [uploadingImage, setUploadingImage] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>(savedDraft?.formData?.imageUrl || '');

  const handleImageChange = async (file: File) => {
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setLocalPreviewUrl(base64Data);

      try {
        const uploadData = new FormData();
        uploadData.append('files', file);

        const res = await api.post('/work-orders/upload-media', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.success && res.data?.files?.[0]?.fileUrl) {
          const serverUrl = res.data.files[0].fileUrl;
          setFormData((prev: any) => ({
            ...prev,
            imageUrl: serverUrl
          }));
          toast.success('Machine image uploaded successfully');
          setUploadingImage(false);
          return;
        }
      } catch (uploadErr) {
        console.warn('Backend image upload fallback to local data URL', uploadErr);
      }

      setFormData((prev: any) => ({
        ...prev,
        imageUrl: base64Data
      }));
      toast.success('Machine image uploaded successfully');
      setUploadingImage(false);
    };

    reader.onerror = () => {
      toast.error('Failed to read image file');
      setUploadingImage(false);
    };

    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    setLocalPreviewUrl('');
    setFormData((prev: any) => ({ ...prev, imageUrl: '' }));
    toast.success('Image removed');
  };

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
        const formattedSpare = {
          id: createdSpare.id || Date.now(),
          partName: createdSpare.partName || createdSpare.name || '',
          partCode: createdSpare.partCode || '',
          category: createdSpare.category || 'General',
          location: createdSpare.location || 'Main Store',
          quantityUsed: 1,
          stockQuantity: createdSpare.stockQuantity || 1,
          inHandQuantity: createdSpare.inHandQuantity || 1,
          rate: Number(createdSpare.rate) || Number(createdSpare.unitCost) || 0,
          unitCost: Number(createdSpare.unitCost) || Number(createdSpare.rate) || 0,
          total: Number(createdSpare.rate) || Number(createdSpare.unitCost) || 0,
        };
        setPendingSpares(prev => {
          if (prev.some(s => s.id === formattedSpare.id || s.partName === formattedSpare.partName)) return prev;
          return [...prev, formattedSpare];
        });
        toast.success(`Spare "${formattedSpare.partName}" added`);
        try {
          const freshSpares = await spareService.getAll();
          if (freshSpares) setCatalogSpares(freshSpares);
        } catch (_) {}
      } else if (locationState?.newSpareId) {
        const spareId = Number(locationState.newSpareId);
        try {
          const createdSpare = await spareService.getById(spareId);
          if (createdSpare) {
            const formattedSpare = {
              id: createdSpare.id,
              partName: createdSpare.partName || (createdSpare as any).name || '',
              partCode: createdSpare.partCode || '',
              category: createdSpare.category || 'General',
              location: createdSpare.location || 'Main Store',
              quantityUsed: 1,
              stockQuantity: createdSpare.stockQuantity || 1,
              inHandQuantity: createdSpare.inHandQuantity || 1,
              rate: Number(createdSpare.rate) || Number(createdSpare.unitCost) || 0,
              unitCost: Number(createdSpare.unitCost) || Number(createdSpare.rate) || 0,
              total: Number(createdSpare.rate) || Number(createdSpare.unitCost) || 0,
            };
            setPendingSpares(prev => {
              if (prev.some(s => s.id === formattedSpare.id || s.partName === formattedSpare.partName)) return prev;
              return [...prev, formattedSpare];
            });
            toast.success(`Spare "${formattedSpare.partName}" added`);
          }
          const freshSpares = await spareService.getAll();
          if (freshSpares) setCatalogSpares(freshSpares);
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
      api.get('/users').catch(() => ({ data: [] })),
      api.get('/machines/next-codes'),
      spareService.getAll(),
      supplierService.getAll(),
    ]).then(([facRes, mainFacRes, empRes, usersRes, codesRes, sparesRes, suppliersRes]) => {
      const rawUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];
      const rawEmps = Array.isArray(empRes?.data) ? empRes.data : [];
      const enriched = rawEmps.map((emp: any) => {
        const u = rawUsers.find((user: any) => 
          user.employeeId === emp.id || 
          (user.email && emp.officialEmail && user.email.toLowerCase() === emp.officialEmail.toLowerCase()) ||
          (user.fullName && emp.fullName && user.fullName.toLowerCase() === emp.fullName.toLowerCase())
        );
        let role = emp.role;
        if (!role && u) {
          if (u.role === 'SUPER_ADMIN') {
            role = 'Admin';
          } else if (u.designation) {
            role = u.designation;
          } else if (u.role) {
            role = u.role.replace(/_/g, ' ').toLowerCase();
          }
        }
        return {
          ...emp,
          role: role || 'Staff',
        };
      });
      setEmployees(enriched);
      if (sparesRes) {
        setCatalogSpares(sparesRes);
      }
      if (suppliersRes) {
        setSuppliers(Array.isArray(suppliersRes) ? suppliersRes : []);
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
    })() || sessionStorage.getItem('addMachineReturnUrl');
    const targetReturnTab = locationState?.returnTab || sessionStorage.getItem('addMachineReturnTab') || 'Machines List';
    sessionStorage.removeItem('addMachineReturnUrl');
    sessionStorage.removeItem('addMachineReturnTab');

    if (targetReturnUrl) {
      navigate(targetReturnUrl, {
        state: {
          tab: targetReturnTab
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

  const handleNavigateToCreateSpare = () => {
    sessionStorage.setItem('add_machine_draft', JSON.stringify({
      formData,
      pendingSpares,
      pendingSpecifications,
      pendingPurchases,
      pendingDocuments,
      pendingMacId,
      pendingMachineType,
      activeTab: 'Spares',
    }));
    setIsSparesModalOpen(false);
    navigate('/spares/new', {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Spares',
        tab: 'General',
        spareTab: 'General',
      }
    });
  };

  const handleOpenSpare = async (spare: any) => {
    let targetSpareId = catalogSpares.find(
      s => (spare.id && String(s.id) === String(spare.id)) ||
           (spare.partCode && s.partCode && s.partCode.toLowerCase() === spare.partCode.toLowerCase()) ||
           (spare.partName && (s.partName || s.name) && (s.partName || s.name).trim().toLowerCase() === spare.partName.trim().toLowerCase())
    )?.id;

    if (!targetSpareId && spare.id && !isNaN(Number(spare.id))) {
      targetSpareId = spare.id;
    }

    if (!targetSpareId) {
      try {
        const allSpares = await spareService.getAll();
        const found = allSpares.find(s => 
          (spare.id && String(s.id) === String(spare.id)) ||
          (spare.partCode && s.partCode && s.partCode.toLowerCase() === spare.partCode.toLowerCase()) ||
          (spare.partName && (s.partName || (s as any).name) && (s.partName || (s as any).name).trim().toLowerCase() === spare.partName.trim().toLowerCase())
        );
        if (found) {
          targetSpareId = found.id;
        }
      } catch (e) {
        console.warn('Fallback spare search failed:', e);
      }
    }

    if (!targetSpareId) {
      toast.error(`Unable to locate spare "${spare.partName || 'part'}"`);
      return;
    }

    try {
      sessionStorage.setItem('add_machine_draft', JSON.stringify({
        formData,
        pendingSpares,
        pendingSpecifications,
        pendingPurchases,
        pendingDocuments,
        pendingMacId,
        pendingMachineType,
        activeTab: 'Spares',
      }));
    } catch (_) {}

    navigate(`/spares/edit/${targetSpareId}`, {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Spares',
        tab: 'General',
        machineName: formData.name || 'New Machine'
      }
    });
  };

  const handleOpenSupplier = async (purchase: any) => {
    let targetSupplierId = suppliers.find(
      s => (purchase.supplierId && String(s.id) === String(purchase.supplierId)) ||
           (purchase.supplierName && s.name && s.name.trim().toLowerCase() === purchase.supplierName.trim().toLowerCase())
    )?.id;

    if (!targetSupplierId && purchase.supplierId && !isNaN(Number(purchase.supplierId))) {
      targetSupplierId = purchase.supplierId;
    }

    if (!targetSupplierId) {
      try {
        const allSuppliers = await supplierService.getAll();
        const found = allSuppliers.find(s => 
          (purchase.supplierId && String(s.id) === String(purchase.supplierId)) ||
          (purchase.supplierName && s.name && s.name.trim().toLowerCase() === purchase.supplierName.trim().toLowerCase())
        );
        if (found) {
          targetSupplierId = found.id;
        }
      } catch (e) {
        console.warn('Fallback supplier search failed:', e);
      }
    }

    if (!targetSupplierId) {
      toast.error(`Unable to locate supplier "${purchase.supplierName || 'details'}"`);
      return;
    }

    try {
      sessionStorage.setItem('add_machine_draft', JSON.stringify({
        formData,
        pendingSpares,
        pendingSpecifications,
        pendingPurchases,
        pendingDocuments,
        pendingMacId,
        pendingMachineType,
        activeTab: 'Purchase',
      }));
    } catch (_) {}

    navigate(`/suppliers/edit/${targetSupplierId}`, {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Purchase',
        machineName: formData.name || 'New Machine'
      }
    });
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

      // 1.1 Attach Machine Photo Document if uploaded
      const currentPhoto = formData.imageUrl || localPreviewUrl;
      if (currentPhoto) {
        try {
          await api.post(`/machines/${newMachineId}/documents`, {
            name: 'Machine Photo',
            type: 'File',
            content: currentPhoto,
          });
        } catch (photoErr) {
          console.warn('Failed to attach machine photo document', photoErr);
        }
      }

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

      if (pendingSpares && pendingSpares.length > 0) {
        localStorage.setItem(`machine_${newMachineId}_spares`, JSON.stringify(pendingSpares));
        for (const spare of pendingSpares) {
          machineSpareSync.onSpareAddedToMachine(
            { id: newMachineId, name: formData.name, location: formData.company },
            spare
          );
        }
      }

      // 5. Add Pending Work Orders
      for (const wo of pendingWorkOrders) {
        try {
          await api.post('/work-orders', {
            machineId: newMachineId,
            problemDescription: wo.problemDescription,
            priority: wo.priority || 'MEDIUM',
            triggerType: wo.triggerType || 'MANUAL',
            assignedTechnicianId: wo.assignedTechnicianId ? Number(wo.assignedTechnicianId) : null,
            estimatedStartDate: wo.estimatedStartDate || undefined,
            estimatedEndDate: wo.estimatedEndDate || undefined,
          });
        } catch (woErr) {
          console.warn('Failed to save pending work order', woErr);
        }
      }

      // 6. Add Pending Checkpoints
      for (const cp of pendingCheckpoints) {
        try {
          await api.post('/checkpoints', {
            machineId: newMachineId,
            checkpointType: cp.checkpointType || 'PREVENTIVE',
            category: cp.category || 'General',
            description: cp.description,
            frequency: cp.frequency || 'MONTHLY',
            standardValue: cp.standardValue || undefined,
            unit: cp.unit || undefined,
            minValue: cp.minValue ? Number(cp.minValue) : undefined,
            maxValue: cp.maxValue ? Number(cp.maxValue) : undefined,
          });
        } catch (cpErr) {
          console.warn('Failed to save pending checkpoint', cpErr);
        }
      }

      // 7. Add Pending Schedules
      for (const sch of pendingSchedules) {
        try {
          await api.post('/schedules', {
            machineId: newMachineId,
            scheduleType: sch.scheduleType || 'PREVENTIVE',
            frequency: sch.frequency || 'MONTHLY',
            priority: sch.priority || 'HIGH',
            startDate: sch.startDate || new Date().toISOString(),
            triggerTime: sch.triggerTime || '09:00',
            prePlanToleranceDays: Number(sch.prePlanToleranceDays) || 1,
            postPlanToleranceDays: Number(sch.postPlanToleranceDays) || 1,
            notes: sch.notes || '',
          });
        } catch (schErr) {
          console.warn('Failed to save pending schedule', schErr);
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
      })() || sessionStorage.getItem('addMachineReturnUrl');
      const targetReturnTab = locationState?.returnTab || sessionStorage.getItem('addMachineReturnTab') || 'Machines List';
      sessionStorage.removeItem('addMachineReturnUrl');
      sessionStorage.removeItem('addMachineReturnTab');

      const handleFinalRedirect = () => {
        if (targetReturnUrl) {
          navigate(targetReturnUrl, {
            state: {
              tab: targetReturnTab,
              newMachine: machineRes.data || { ...payload, id: newMachineId },
              newMachineId: newMachineId,
            }
          });
        } else {
          navigate('/machine-management');
        }
      };

      setCreatedMachineForAccess({
        id: newMachineId,
        name: formData.name,
        code: formData.machineCode,
        category: formData.machineCategory,
        redirectFn: handleFinalRedirect,
      });
      setIsAccessPromptOpen(true);
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
    if (!docName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (uploadModalType === 'File' && !docFile && !editingDoc) {
      toast.error('Please select a file');
      return;
    }
    if ((uploadModalType === 'Link' || uploadModalType === 'Note') && !docContent.trim()) {
      toast.error('Please provide content');
      return;
    }

    if (editingDoc) {
      setPendingDocuments(prev => prev.map(d => {
        if (d.id === editingDoc.id) {
          return {
            ...d,
            name: docName.trim(),
            content: uploadModalType !== 'File' ? docContent.trim() : (docFile ? URL.createObjectURL(docFile) : d.content),
            file: docFile || d.file,
            size: uploadModalType === 'File' && docFile ? `${(docFile.size / (1024 * 1024)).toFixed(2)} MB` : d.size,
          };
        }
        return d;
      }));
      toast.success('Document updated successfully');
      setEditingDoc(null);
      setUploadModalType(null);
      setDocName('');
      setDocContent('');
      setDocFile(null);
      return;
    }

    setPendingDocuments(prev => [...prev, {
      id: Date.now(),
      name: docName.trim(),
      type: uploadModalType,
      content: uploadModalType !== 'File' ? docContent.trim() : (docFile ? URL.createObjectURL(docFile) : null),
      file: uploadModalType === 'File' ? docFile : null,
      size: uploadModalType === 'File' && docFile ? `${(docFile.size / (1024 * 1024)).toFixed(2)} MB` : '-',
      uploadedBy: 'Admin',
      date: new Date().toISOString()
    }]);

    setUploadModalType(null);
    setDocName('');
    setDocContent('');
    setDocFile(null);
    toast.success('Document added successfully');
  };

  const handleOpenUpload = (type: 'File' | 'Link' | 'Note') => {
    setEditingDoc(null);
    setUploadModalType(type);
    setDocName('');
    setDocContent('');
    setDocFile(null);
    setIsUploadMenuOpen(false);
  };

  const handleEditDoc = (doc: any) => {
    setEditingDoc(doc);
    setUploadModalType(doc.type);
    setDocName(doc.name || '');
    setDocContent(doc.content || '');
    setDocFile(doc.file || null);
  };

  const handleViewDoc = (doc: any) => {
    if (doc.type === 'File') {
      if (doc.file) {
        const fileUrl = URL.createObjectURL(doc.file);
        window.open(fileUrl, '_blank');
      } else if (doc.content) {
        const fullUrl = doc.content.startsWith('http') || doc.content.startsWith('data:')
          ? doc.content
          : `http://localhost:3002${doc.content.startsWith('/') ? doc.content : `/${doc.content}`}`;
        window.open(fullUrl, '_blank');
      } else {
        toast.error('File content unavailable');
      }
    } else if (doc.type === 'Link') {
      const linkUrl = doc.content.startsWith('http') ? doc.content : `https://${doc.content}`;
      window.open(linkUrl, '_blank');
    } else {
      setViewingDoc(doc);
    }
  };

  const handleDeleteDoc = (id: number) => {
    setPendingDocuments(prev => prev.filter(d => d.id !== id));
    toast.success('Document removed');
  };

  const supplierOptions = suppliers.map(s => ({
    label: s.supplierCode ? `${s.name} (${s.supplierCode})` : s.name,
    value: s.name,
  }));

  const handleOpenPurchaseModal = () => {
    setPurchaseForm({
      supplierName: '',
      supplierId: '',
      contactNumber: '',
      email: '',
      address: '',
      file: null,
      fileName: '',
    });
    setIsPurchaseModalOpen(true);
  };

  const handleSupplierChange = (e: { target: { name: string; value: string } }) => {
    const selectedName = e.target.value;
    const found = suppliers.find(s => s.name === selectedName);
    if (found) {
      const fullAddress = [found.address, found.city, found.state, found.postalCode].filter(Boolean).join(', ');
      setPurchaseForm(prev => ({
        ...prev,
        supplierName: found.name,
        supplierId: found.id.toString(),
        contactNumber: found.phone || found.contactPerson || prev.contactNumber,
        email: found.email || prev.email,
        address: fullAddress || prev.address,
      }));
    } else {
      setPurchaseForm(prev => ({
        ...prev,
        supplierName: selectedName,
      }));
    }
  };

  const handlePurchaseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPurchaseForm(prev => ({
        ...prev,
        file: file,
        fileName: file.name,
      }));
    }
  };

  const handleSavePurchase = () => {
    if (!purchaseForm.supplierName) {
      toast.error('Please select a supplier');
      return;
    }
    if (!purchaseForm.contactNumber) {
      toast.error('Please enter contact number');
      return;
    }
    if (!purchaseForm.email) {
      toast.error('Please enter email');
      return;
    }

    setPendingPurchases(prev => [
      ...prev,
      {
        id: Date.now(),
        subTab: purchaseSubTab,
        supplierName: purchaseForm.supplierName,
        supplierId: purchaseForm.supplierId,
        contactNumber: purchaseForm.contactNumber,
        email: purchaseForm.email,
        address: purchaseForm.address,
        file: purchaseForm.file,
        fileName: purchaseForm.fileName,
        date: new Date().toLocaleDateString('en-GB'),
      }
    ]);

    setIsPurchaseModalOpen(false);
    toast.success(`${purchaseSubTab} added successfully`);
  };

  const filteredPurchases = pendingPurchases.filter(p => 
    p.subTab === purchaseSubTab &&
    (
      (p.supplierName || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      (p.contactNumber || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase())
    )
  );

  const filteredDocuments = pendingDocuments.filter(d => 
    (d.name || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (d.type || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (d.content || '').toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  return (
    <div className="sm:px-4 pb-6 pt-0 w-full flex flex-col bg-white">
      {/* Breadcrumb if navigated from All Assets */}
      {locationState?.returnUrl === '/assets' && (
        <div className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleGoBack}
            className="hover:text-emerald-700 hover:underline cursor-pointer font-semibold text-slate-600"
          >
            All Assets
          </button>
          <span className="text-slate-400">/</span>
          <span className="text-emerald-700 font-bold">Add Machine</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleGoBack}
            className="text-slate-700 hover:text-black mr-2.5 focus:outline-none flex items-center cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft size={20} className="stroke-[2.5]" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Add Machine</h1>
        </div>

        {/* Type Selector (when rendered on unified Add Asset page) */}
        {typeSelector && (
          <div className="flex items-center justify-center my-2 sm:my-0">
            {typeSelector}
          </div>
        )}

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={handleGoBack}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            Back
          </button>
          <button 
            type="button"
            onClick={handleFinalSave} 
            disabled={loading} 
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* Left Column: Machine Image Upload Card */}
        <MachineImageCard
          imageUrl={formData.imageUrl}
          localPreviewUrl={localPreviewUrl}
          uploading={uploadingImage}
          onImageChange={handleImageChange}
          onImageRemove={handleImageRemove}
          machineName={formData.name}
          machineCategory={formData.machineCategory}
          machineSubCategory={formData.machineSubCategory}
          status={formData.status}
          onStatusClick={() => {
            setFormData((prev: any) => ({
              ...prev,
              status: prev.status === 'Online' ? 'Offline' : 'Online'
            }));
          }}
        />

        {/* Right Column: Tabbed Form Container */}
        <div className="flex-1 w-full bg-white rounded-lg shadow-2xs border border-slate-200/90 relative min-h-[550px] flex flex-col">
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
                  <CustomSelect name="maintenanceHead" value={formData.maintenanceHead} onChange={handleChange} placeholder="Select Head" options={employees.map(e => ({ label: `${e.role || 'Staff'} - ${e.fullName}`, value: e.fullName }))} />
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
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Select Head of Department<span className="text-red-500">*</span></label><CustomSelect name="headOfDepartment" value={formData.headOfDepartment} onChange={handleChange} options={employees.map(e => ({ label: `${e.role || 'Staff'} - ${e.fullName}`, value: e.fullName }))} /></div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Machine Owner<span className="text-red-500">*</span></label><CustomSelect name="machineOwner" value={formData.machineOwner} onChange={handleChange} options={employees.map(e => ({ label: `${e.role || 'Staff'} - ${e.fullName}`, value: e.fullName }))} /></div>
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
                          <tr 
                            key={spare.id || index} 
                            onClick={() => handleOpenSpare(spare)}
                            className="border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group"
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" className="rounded border-gray-300 cursor-pointer" />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{spare.partName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{spare.category || '-'}</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">{spare.partCode || '-'}</td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-gray-800">{qty}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-800">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">₹{total.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSpare(spare)}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                                  title="View Spare Details"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingSpares(prev => prev.filter(s => s.id !== spare.id))}
                                  className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                  title="Remove Spare"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
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
                    className={`px-6 py-2 text-sm font-semibold transition-colors cursor-pointer ${purchaseSubTab === 'Machine Purchase' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Machine Purchase
                  </button>
                  <button 
                    onClick={() => setPurchaseSubTab('Spare/Service Purchase')}
                    className={`px-6 py-2 text-sm font-semibold transition-colors border-l border-gray-200 cursor-pointer ${purchaseSubTab === 'Spare/Service Purchase' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Spare/Service Purchase
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleOpenPurchaseModal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[3]" /> Add Purchase
                  </button>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={purchaseSearchQuery}
                      onChange={e => setPurchaseSearchQuery(e.target.value)}
                      placeholder="Search" 
                      className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
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
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-gray-500 bg-white">
                          No {purchaseSubTab} added yet.
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((item, idx) => (
                        <tr 
                          key={item.id} 
                          onClick={() => handleOpenSupplier(item)}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-gray-300 cursor-pointer" />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-gray-900">{item.supplierName}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{item.email}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{item.contactNumber}</td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenSupplier(item)}
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                                title="View Supplier Details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingPurchases(prev => prev.filter(p => p.id !== item.id))}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === 'Documents' && (
            <div className="space-y-6 w-full">
              {/* Toolbar */}
              <div className="flex justify-between items-center">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={docSearchQuery}
                    onChange={e => setDocSearchQuery(e.target.value)}
                    placeholder="Search documents..." 
                    className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
                  />
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[3]" /> Upload
                  </button>
                  
                  {/* Upload Dropdown */}
                  {isUploadMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                      <button 
                        onClick={() => handleOpenUpload('File')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        File
                      </button>
                      <button 
                        onClick={() => handleOpenUpload('Link')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        Link
                      </button>
                      <button 
                        onClick={() => handleOpenUpload('Note')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
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
                    {filteredDocuments?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-gray-500 bg-white">
                          No documents added yet.
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map((doc, index) => (
                        <tr key={doc.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{doc.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              doc.type === 'File' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              doc.type === 'Link' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {doc.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {doc.type === 'File' ? (
                              <button 
                                type="button" 
                                onClick={() => handleViewDoc(doc)}
                                className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium cursor-pointer flex items-center gap-1"
                              >
                                <span>{doc.file?.name || doc.name || 'View File'}</span>
                              </button>
                            ) : doc.type === 'Link' ? (
                              <a href={doc.content} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{doc.content}</a>
                            ) : (
                              <span className="truncate max-w-[200px] block text-gray-700">{doc.content}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                type="button"
                                onClick={() => handleViewDoc(doc)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="View Document"
                              >
                                <Eye size={16}/>
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleEditDoc(doc)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Document"
                              >
                                <Pencil size={16}/>
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Document"
                              >
                                <Trash2 size={16}/>
                              </button>
                            </div>
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

          {activeTab === 'WO' && (
            <div className="space-y-6">
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Work Orders (WO)</h3>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {pendingWorkOrders.length} Planned
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign breakdown tasks, preventive work orders, or service requests for this machine
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={woSearchQuery}
                      onChange={(e) => setWoSearchQuery(e.target.value)}
                      placeholder="Search work orders..."
                      className="pl-9 pr-3.5 py-1.5 min-h-[34px] bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-52"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWoForm({
                        problemDescription: '',
                        priority: 'MEDIUM',
                        triggerType: 'MANUAL',
                        assignedTechnicianId: '',
                        estimatedStartDate: '',
                        estimatedEndDate: '',
                      });
                      setIsWoModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 min-h-[34px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={15} />
                    <span>Create Work Order</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left whitespace-nowrap text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12">No.</th>
                      <th className="px-4 py-3">Problem Description</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Trigger Type</th>
                      <th className="px-4 py-3">Assigned Technician</th>
                      <th className="px-4 py-3">Target Dates</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingWorkOrders.filter(wo =>
                      (wo.problemDescription || '').toLowerCase().includes(woSearchQuery.toLowerCase()) ||
                      (wo.triggerType || '').toLowerCase().includes(woSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500 bg-white">
                          <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No Work Orders Added</p>
                          <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;Create Work Order&rdquo; to schedule a job for this machine</p>
                        </td>
                      </tr>
                    ) : (
                      pendingWorkOrders
                        .filter(wo =>
                          (wo.problemDescription || '').toLowerCase().includes(woSearchQuery.toLowerCase()) ||
                          (wo.triggerType || '').toLowerCase().includes(woSearchQuery.toLowerCase())
                        )
                        .map((wo, idx) => {
                          const tech = employees.find(e => e.id?.toString() === wo.assignedTechnicianId?.toString());
                          const priorityColors: Record<string, string> = {
                            CRITICAL: 'bg-red-50 text-red-700 border-red-200',
                            HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
                            MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
                            LOW: 'bg-slate-100 text-slate-700 border-slate-200',
                          };
                          return (
                            <tr key={wo.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 max-w-[280px] truncate">
                                {wo.problemDescription}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${priorityColors[wo.priority] || priorityColors.MEDIUM}`}>
                                  {wo.priority}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-600">{wo.triggerType}</td>
                              <td className="px-4 py-3 text-slate-700 font-medium">{tech ? tech.fullName : 'Unassigned'}</td>
                              <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                                {wo.estimatedStartDate || 'Immediate'} → {wo.estimatedEndDate || 'Open'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setPendingWorkOrders(prev => prev.filter(item => item.id !== wo.id))}
                                  className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 size={15} />
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
          )}

          {activeTab === 'Checklist' && (
            <div className="space-y-6">
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Machine Checklist & Checkpoints</h3>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {pendingCheckpoints.length} Checkpoints
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure routine inspections, safety interlocks, and sensor verification parameters
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={checkpointSearchQuery}
                      onChange={(e) => setCheckpointSearchQuery(e.target.value)}
                      placeholder="Search checkpoints..."
                      className="pl-9 pr-3.5 py-1.5 min-h-[34px] bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-52"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckpointForm({
                        checkpointType: 'PREVENTIVE',
                        category: 'Safety & Mechanical',
                        description: '',
                        frequency: 'MONTHLY',
                        standardValue: '',
                        unit: '',
                        minValue: '',
                        maxValue: '',
                      });
                      setSelectedMasterCheckpointId('');
                      setCheckpointTabMode('catalog');
                      setIsCheckpointModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 min-h-[34px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={15} />
                    <span>Add Checkpoint</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left whitespace-nowrap text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12">No.</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Frequency</th>
                      <th className="px-4 py-3">Standard / Range</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingCheckpoints.filter(cp =>
                      (cp.description || '').toLowerCase().includes(checkpointSearchQuery.toLowerCase()) ||
                      (cp.category || '').toLowerCase().includes(checkpointSearchQuery.toLowerCase()) ||
                      (cp.code || '').toLowerCase().includes(checkpointSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500 bg-white">
                          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No Checkpoints Configured</p>
                          <p className="text-xs text-slate-400 mt-0.5">Add standard checklist points from catalog or create a custom checkpoint</p>
                        </td>
                      </tr>
                    ) : (
                      pendingCheckpoints
                        .filter(cp =>
                          (cp.description || '').toLowerCase().includes(checkpointSearchQuery.toLowerCase()) ||
                          (cp.category || '').toLowerCase().includes(checkpointSearchQuery.toLowerCase()) ||
                          (cp.code || '').toLowerCase().includes(checkpointSearchQuery.toLowerCase())
                        )
                        .map((cp, idx) => (
                          <tr key={cp.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-700">{cp.code || `CHK-${idx + 1}`}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                cp.checkpointType === 'PREVENTIVE' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                {cp.checkpointType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium">{cp.category || 'General'}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800 max-w-[300px] truncate">{cp.description}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium">{cp.frequency}</td>
                            <td className="px-4 py-3 text-slate-700">
                              {cp.standardValue || (cp.minValue !== undefined && cp.maxValue !== undefined ? `${cp.minValue} - ${cp.maxValue} ${cp.unit || ''}` : '-')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => setPendingCheckpoints(prev => prev.filter(item => item.id !== cp.id))}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 size={15} />
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

          {activeTab === 'Schedule Maintenance' && (
            <div className="space-y-6">
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Schedule Maintenance</h3>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {pendingSchedules.length} Active Schedules
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated recurring maintenance cycles, pre/post tolerance limits, and auto-generated work orders
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={scheduleSearchQuery}
                      onChange={(e) => setScheduleSearchQuery(e.target.value)}
                      placeholder="Search schedules..."
                      className="pl-9 pr-3.5 py-1.5 min-h-[34px] bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-52"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleForm({
                        scheduleType: 'PREVENTIVE',
                        frequency: 'MONTHLY',
                        priority: 'HIGH',
                        startDate: new Date().toISOString().split('T')[0],
                        triggerTime: '09:00',
                        prePlanToleranceDays: 1,
                        postPlanToleranceDays: 1,
                        notes: '',
                      });
                      setIsScheduleModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 min-h-[34px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={15} />
                    <span>Create Schedule</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left whitespace-nowrap text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12">No.</th>
                      <th className="px-4 py-3">Schedule Code</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Frequency</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">Tolerance (Pre/Post)</th>
                      <th className="px-4 py-3">Trigger Time</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingSchedules.filter(sch =>
                      (sch.scheduleCode || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase()) ||
                      (sch.scheduleType || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase()) ||
                      (sch.notes || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-slate-500 bg-white">
                          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No Schedules Configured</p>
                          <p className="text-xs text-slate-400 mt-0.5">Set up preventive maintenance schedules to automatically generate work orders</p>
                        </td>
                      </tr>
                    ) : (
                      pendingSchedules
                        .filter(sch =>
                          (sch.scheduleCode || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase()) ||
                          (sch.scheduleType || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase()) ||
                          (sch.notes || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase())
                        )
                        .map((sch, idx) => (
                          <tr key={sch.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{sch.scheduleCode || `SCH-DRAFT-${idx + 1}`}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {sch.scheduleType}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">{sch.frequency}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {sch.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{sch.startDate || 'Immediate'}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium">±{sch.prePlanToleranceDays || 1} Days</td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{sch.triggerTime || '09:00'}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => setPendingSchedules(prev => prev.filter(item => item.id !== sch.id))}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 size={15} />
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
        </div>
      </div>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Spare Name</label>
                  <button
                    type="button"
                    onClick={handleNavigateToCreateSpare}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus size={13} className="stroke-[2.5]" /> Add Spare
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    {catalogSpares.length > 0 ? (
                      <>
                        <select
                          value={spareModalName}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_NEW__') {
                              handleNavigateToCreateSpare();
                            } else {
                              handleSelectSpareName(e.target.value);
                            }
                          }}
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none pr-10 cursor-pointer"
                        >
                          <option value="">Select</option>
                          {catalogSpares.map((spare) => (
                            <option key={spare.id} value={spare.partName || spare.name}>
                              {spare.partName || spare.name} {spare.partCode ? `(${spare.partCode})` : ''}
                            </option>
                          ))}
                          <option value="__ADD_NEW__" className="text-emerald-600 font-semibold">+ Add in Spares Management...</option>
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
                  <button
                    type="button"
                    onClick={handleNavigateToCreateSpare}
                    title="Add spare in Spares Management"
                    className="h-[46px] px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus size={15} className="stroke-[3]" /> Add
                  </button>
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
                  Save
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
                  value={purchaseForm.supplierName}
                  onChange={handleSupplierChange}
                  placeholder="Select"
                  options={supplierOptions}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contact Number<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={purchaseForm.contactNumber}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                  placeholder="Enter Number"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email<span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  value={purchaseForm.email}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@gmail.com"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address</label>
                <textarea 
                  value={purchaseForm.address}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Address"
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400 resize-y min-h-[64px]"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Upload Purchase / Invoice</label>
                <input 
                  type="file"
                  onChange={handlePurchaseFileChange}
                  className="block w-full h-[64px] text-sm text-gray-600 border border-gray-300 rounded-xl p-3 cursor-pointer focus:outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-colors"
                />
                {purchaseForm.fileName && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1 truncate">Selected: {purchaseForm.fileName}</p>
                )}
              </div>

              <div className="col-span-2 flex justify-center mt-4">
                <button 
                  type="button"
                  onClick={handleSavePurchase}
                  className="px-10 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-sm transition-colors shadow-xs cursor-pointer"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingDoc 
                ? (uploadModalType === 'File' ? 'Edit File' : uploadModalType === 'Link' ? 'Edit Link' : 'Edit Note')
                : (uploadModalType === 'File' ? 'Upload File' : uploadModalType === 'Link' ? 'Add Link' : 'Add Note')}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name</label>
                <input 
                  type="text" 
                  value={docName} 
                  onChange={e => setDocName(e.target.value)} 
                  placeholder="Enter name"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-gray-900" 
                />
              </div>

              {uploadModalType === 'File' && (
                <div>
                  <input 
                    type="file" 
                    onChange={e => setDocFile(e.target.files ? e.target.files[0] : null)} 
                    className="block w-full text-sm text-gray-600 border border-gray-300 rounded-xl p-3 cursor-pointer focus:outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-colors" 
                  />
                  {(docFile || editingDoc?.file || editingDoc?.content) && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1.5 truncate">
                      File: {docFile?.name || editingDoc?.file?.name || editingDoc?.name || 'Attached file'}
                    </p>
                  )}
                </div>
              )}

              {(uploadModalType === 'Link' || uploadModalType === 'Note') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{uploadModalType === 'Link' ? 'URL' : 'Content'}</label>
                  {uploadModalType === 'Link' ? (
                    <input 
                      type="text" 
                      value={docContent} 
                      onChange={e => setDocContent(e.target.value)} 
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-gray-900" 
                    />
                  ) : (
                    <textarea 
                      value={docContent} 
                      onChange={e => setDocContent(e.target.value)} 
                      placeholder="Enter note..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-gray-900 resize-none" 
                    />
                  )}
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => { setUploadModalType(null); setEditingDoc(null); }} 
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleUploadDocument} 
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-xs"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note / Document Viewer Modal */}
      {viewingDoc && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setViewingDoc(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl relative border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingDoc.name}</h3>
                <span className="text-xs text-slate-500 font-medium">{viewingDoc.type}</span>
              </div>
              <button 
                onClick={() => setViewingDoc(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="py-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                {viewingDoc.content}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
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
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Create Work Order Modal */}
      {isWoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Create Work Order (WO)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Problem Description / Work Scope <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={woForm.problemDescription}
                  onChange={(e) => setWoForm(prev => ({ ...prev, problemDescription: e.target.value }))}
                  placeholder="Describe machine issue or preventive task instructions..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 h-20 resize-none text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <CustomSelect
                    name="priority"
                    value={woForm.priority}
                    onChange={(e) => setWoForm(prev => ({ ...prev, priority: e.target.value }))}
                    options={[
                      { label: 'Low', value: 'LOW' },
                      { label: 'Medium', value: 'MEDIUM' },
                      { label: 'High', value: 'HIGH' },
                      { label: 'Critical', value: 'CRITICAL' },
                    ]}
                    placeholder="Select Priority"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trigger Type</label>
                  <CustomSelect
                    name="triggerType"
                    value={woForm.triggerType}
                    onChange={(e) => setWoForm(prev => ({ ...prev, triggerType: e.target.value }))}
                    options={[
                      { label: 'Manual Request', value: 'MANUAL' },
                      { label: 'Breakdown / Fault', value: 'BREAKDOWN' },
                      { label: 'Routine Preventive', value: 'PREVENTIVE' },
                      { label: 'Sensor Alert', value: 'IOT_ALERT' },
                    ]}
                    placeholder="Select Type"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Technician / Engineer</label>
                <CustomSelect
                  name="assignedTechnicianId"
                  value={woForm.assignedTechnicianId}
                  onChange={(e) => setWoForm(prev => ({ ...prev, assignedTechnicianId: e.target.value }))}
                  options={employees.map(emp => ({
                    label: `${emp.fullName} (${emp.designation || emp.role || 'Tech'})`,
                    value: emp.id.toString(),
                  }))}
                  placeholder="Select Technician (Optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Start Date</label>
                  <CustomDatePicker
                    name="estimatedStartDate"
                    value={woForm.estimatedStartDate}
                    onChange={(e: any) => setWoForm(prev => ({ ...prev, estimatedStartDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target End Date</label>
                  <CustomDatePicker
                    name="estimatedEndDate"
                    value={woForm.estimatedEndDate}
                    onChange={(e: any) => setWoForm(prev => ({ ...prev, estimatedEndDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsWoModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!woForm.problemDescription.trim()) {
                    toast.error('Please enter a problem description');
                    return;
                  }
                  setPendingWorkOrders(prev => [
                    ...prev,
                    {
                      id: Date.now(),
                      problemDescription: woForm.problemDescription.trim(),
                      priority: woForm.priority,
                      triggerType: woForm.triggerType,
                      assignedTechnicianId: woForm.assignedTechnicianId,
                      estimatedStartDate: woForm.estimatedStartDate,
                      estimatedEndDate: woForm.estimatedEndDate,
                    }
                  ]);
                  setIsWoModalOpen(false);
                  toast.success('Work Order added to pending list');
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                Add Work Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Checkpoint Modal */}
      {isCheckpointModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Add Machine Checkpoint</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckpointModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg my-4">
              <button
                type="button"
                onClick={() => setCheckpointTabMode('catalog')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  checkpointTabMode === 'catalog'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Select From Master Catalog
              </button>
              <button
                type="button"
                onClick={() => setCheckpointTabMode('custom')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  checkpointTabMode === 'custom'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Define Custom Checkpoint
              </button>
            </div>

            {checkpointTabMode === 'catalog' ? (
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Choose Standard Checkpoint from Catalog
                  </label>
                  <CustomSelect
                    name="selectedMasterCheckpointId"
                    value={selectedMasterCheckpointId}
                    onChange={(e) => setSelectedMasterCheckpointId(e.target.value)}
                    options={masterCheckpoints.map(cp => ({
                      label: `${cp.code} • [${cp.checkpointType}] ${cp.description}`,
                      value: cp.id.toString(),
                    }))}
                    placeholder="Select a master checkpoint..."
                  />
                </div>

                {selectedMasterCheckpointId && (() => {
                  const selectedCp = masterCheckpoints.find(c => c.id.toString() === selectedMasterCheckpointId);
                  if (!selectedCp) return null;
                  return (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-700">{selectedCp.code}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {selectedCp.checkpointType}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900">{selectedCp.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1">
                        <div>Frequency: <span className="font-medium text-slate-800">{selectedCp.frequency}</span></div>
                        <div>Standard Value: <span className="font-medium text-slate-800">{selectedCp.standardValue || '-'}</span></div>
                        {selectedCp.minValue !== undefined && selectedCp.maxValue !== undefined && (
                          <div className="col-span-2">Tolerance: <span className="font-medium text-slate-800">{selectedCp.minValue} to {selectedCp.maxValue} {selectedCp.unit || ''}</span></div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3.5 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Checkpoint Type</label>
                    <CustomSelect
                      name="checkpointType"
                      value={checkpointForm.checkpointType}
                      onChange={(e) => setCheckpointForm(prev => ({ ...prev, checkpointType: e.target.value }))}
                      options={[
                        { label: 'Preventive (Pass/Fail, Visual)', value: 'PREVENTIVE' },
                        { label: 'Predictive (Quantitative, Limits)', value: 'PREDICTIVE' },
                        { label: 'Inspection / Sensory', value: 'INSPECTION' },
                      ]}
                      placeholder="Select Type"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={checkpointForm.category}
                      onChange={(e) => setCheckpointForm(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g. Safety & Interlocks"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Checkpoint Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={checkpointForm.description}
                    onChange={(e) => setCheckpointForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Specific instruction or inspection point..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 h-16 resize-none text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                    <CustomSelect
                      name="frequency"
                      value={checkpointForm.frequency}
                      onChange={(e) => setCheckpointForm(prev => ({ ...prev, frequency: e.target.value }))}
                      options={[
                        { label: 'Daily', value: 'DAILY' },
                        { label: 'Weekly', value: 'WEEKLY' },
                        { label: 'Bimonthly', value: 'BIMONTHLY' },
                        { label: 'Monthly', value: 'MONTHLY' },
                        { label: 'Quarterly', value: 'QUARTERLY' },
                        { label: 'Half Yearly', value: 'HALF_YEARLY' },
                        { label: 'Yearly', value: 'YEARLY' },
                      ]}
                      placeholder="Frequency"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Standard / Expected Value</label>
                    <input
                      type="text"
                      value={checkpointForm.standardValue}
                      onChange={(e) => setCheckpointForm(prev => ({ ...prev, standardValue: e.target.value }))}
                      placeholder="e.g. Functional / Pass"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Min Value</label>
                    <input
                      type="number"
                      step="any"
                      value={checkpointForm.minValue}
                      onChange={(e) => setCheckpointForm(prev => ({ ...prev, minValue: e.target.value }))}
                      placeholder="Optional"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Max Value</label>
                    <input
                      type="number"
                      step="any"
                      value={checkpointForm.maxValue}
                      onChange={(e) => setCheckpointForm(prev => ({ ...prev, maxValue: e.target.value }))}
                      placeholder="Optional"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={checkpointForm.unit}
                      onChange={(e) => setCheckpointForm(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="e.g. bar, mm/s"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCheckpointModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (checkpointTabMode === 'catalog') {
                    if (!selectedMasterCheckpointId) {
                      toast.error('Please select a checkpoint from the catalog');
                      return;
                    }
                    const selected = masterCheckpoints.find(c => c.id.toString() === selectedMasterCheckpointId);
                    if (selected) {
                      setPendingCheckpoints(prev => [
                        ...prev,
                        {
                          id: Date.now(),
                          code: selected.code,
                          checkpointType: selected.checkpointType,
                          category: selected.category,
                          description: selected.description,
                          frequency: selected.frequency,
                          standardValue: selected.standardValue,
                          unit: selected.unit,
                          minValue: selected.minValue,
                          maxValue: selected.maxValue,
                        }
                      ]);
                      setIsCheckpointModalOpen(false);
                      toast.success('Catalog checkpoint added');
                    }
                  } else {
                    if (!checkpointForm.description.trim()) {
                      toast.error('Please enter a description');
                      return;
                    }
                    setPendingCheckpoints(prev => [
                      ...prev,
                      {
                        id: Date.now(),
                        code: `CHK-CUST-${prev.length + 1}`,
                        checkpointType: checkpointForm.checkpointType,
                        category: checkpointForm.category || 'General',
                        description: checkpointForm.description.trim(),
                        frequency: checkpointForm.frequency,
                        standardValue: checkpointForm.standardValue,
                        unit: checkpointForm.unit,
                        minValue: checkpointForm.minValue,
                        maxValue: checkpointForm.maxValue,
                      }
                    ]);
                    setIsCheckpointModalOpen(false);
                    toast.success('Custom checkpoint added');
                  }
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                Add Checkpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Maintenance Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Add Maintenance Schedule</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Type</label>
                  <CustomSelect
                    name="scheduleType"
                    value={scheduleForm.scheduleType}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduleType: e.target.value }))}
                    options={[
                      { label: 'Preventive Servicing', value: 'PREVENTIVE' },
                      { label: 'Predictive Monitoring', value: 'PREDICTIVE' },
                      { label: 'Corrective Overhaul', value: 'CORRECTIVE' },
                    ]}
                    placeholder="Type"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                  <CustomSelect
                    name="frequency"
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, frequency: e.target.value }))}
                    options={[
                      { label: 'Daily', value: 'DAILY' },
                      { label: 'Weekly', value: 'WEEKLY' },
                      { label: 'Bimonthly', value: 'BIMONTHLY' },
                      { label: 'Monthly', value: 'MONTHLY' },
                      { label: 'Quarterly', value: 'QUARTERLY' },
                      { label: 'Half Yearly', value: 'HALF_YEARLY' },
                      { label: 'Yearly', value: 'YEARLY' },
                    ]}
                    placeholder="Frequency"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <CustomSelect
                    name="priority"
                    value={scheduleForm.priority}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, priority: e.target.value }))}
                    options={[
                      { label: 'Low', value: 'LOW' },
                      { label: 'Medium', value: 'MEDIUM' },
                      { label: 'High', value: 'HIGH' },
                      { label: 'Critical', value: 'CRITICAL' },
                    ]}
                    placeholder="Priority"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trigger Time</label>
                  <input
                    type="time"
                    value={scheduleForm.triggerTime}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, triggerTime: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <CustomDatePicker
                    name="startDate"
                    value={scheduleForm.startDate}
                    onChange={(e: any) => setScheduleForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tolerance (± Days)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={scheduleForm.prePlanToleranceDays}
                    onChange={(e) => setScheduleForm(prev => ({
                      ...prev,
                      prePlanToleranceDays: Number(e.target.value),
                      postPlanToleranceDays: Number(e.target.value),
                    }))}
                    placeholder="1"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special instructions, safety precautions..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 h-16 resize-none text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingSchedules(prev => [
                    ...prev,
                    {
                      id: Date.now(),
                      scheduleCode: `SCH-2026-${(prev.length + 1).toString().padStart(4, '0')}`,
                      scheduleType: scheduleForm.scheduleType,
                      frequency: scheduleForm.frequency,
                      priority: scheduleForm.priority,
                      startDate: scheduleForm.startDate,
                      triggerTime: scheduleForm.triggerTime,
                      prePlanToleranceDays: scheduleForm.prePlanToleranceDays,
                      postPlanToleranceDays: scheduleForm.postPlanToleranceDays,
                      notes: scheduleForm.notes,
                    }
                  ]);
                  setIsScheduleModalOpen(false);
                  toast.success('Maintenance schedule added');
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                Add Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {createdMachineForAccess && (
        <>
          <GiveAccessPromptModal
            isOpen={isAccessPromptOpen}
            targetType="machine"
            targetName={createdMachineForAccess.name}
            targetCode={createdMachineForAccess.code}
            onGiveAccess={() => {
              setIsAccessPromptOpen(false);
              setIsGiveAccessModalOpen(true);
            }}
            onSkip={() => {
              setIsAccessPromptOpen(false);
              createdMachineForAccess.redirectFn();
            }}
          />

          <GiveAccessModal
            isOpen={isGiveAccessModalOpen}
            onClose={() => {
              setIsGiveAccessModalOpen(false);
              createdMachineForAccess.redirectFn();
            }}
            targetType="machine"
            targetId={createdMachineForAccess.id}
            targetName={createdMachineForAccess.name}
            targetCode={createdMachineForAccess.code}
            targetCategory={createdMachineForAccess.category}
            onSuccess={() => {
              createdMachineForAccess.redirectFn();
            }}
          />
        </>
      )}
    </div>
  );
}
