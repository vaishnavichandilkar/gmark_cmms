import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasTabPermission } from '../../../utils/permissions';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { CustomDatePicker } from '../../../components/shared/CustomDatePicker';
import { 
  ArrowLeft, Search, Plus, Wifi, Activity, ShieldAlert, RefreshCw, Sparkles, Trash2, Eye, Pencil, X, ChevronDown,
  Wrench, Calendar, CheckSquare, Clock, AlertTriangle, FileText, CheckCircle2, ExternalLink
} from 'lucide-react';
import { api } from '../../../lib/api';
import { FacilityHierarchyPicker } from '../../../components/4m/FacilityHierarchyPicker';
import { MachineHierarchyPicker } from '../../../components/4m/MachineHierarchyPicker';
import { MachineImageCard } from '../../../components/4m/MachineImageCard';
import { spareService } from '../../../services/spareService';
import { supplierService, type Supplier } from '../../../services/supplierService';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { machineSpareSync } from '../../../utils/machineSpareSync';
import { navigateToDeviceDashboard } from '../../../utils/deviceRoutes';
import { BoosterDashboard } from '../../scada/templates/booster/BoosterDashboard';
import { TechnicianWOViewModal } from '../../../components/work-orders/TechnicianWOViewModal';

export function EditMachine() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState(
    location.state?.tab || 
    location.state?.returnTab || 
    new URLSearchParams(location.search).get('tab') || 
    'General'
  );
  const [saving, setSaving] = useState(false);
  const returnUrl = (location.state as any)?.returnUrl;
  const returnTab = (location.state as any)?.returnTab;

  useEffect(() => {
    const tabParam = location.state?.tab || location.state?.returnTab || new URLSearchParams(location.search).get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
      if (tabParam === 'WO') {
        fetchWorkOrders();
      }
    }
  }, [location.state, location.search]);

  const handleBack = () => {
    if (returnUrl) {
      navigate(returnUrl, { state: { tab: returnTab, spareTab: returnTab } });
    } else {
      navigate(-1);
    }
  };

  const handleOpenSpare = async (spare: any) => {
    // 1. Try finding in catalogSpares
    let targetSpareId = catalogSpares.find(
      s => (spare.id && String(s.id) === String(spare.id)) ||
           (spare.partCode && s.partCode && s.partCode.toLowerCase() === spare.partCode.toLowerCase()) ||
           (spare.partName && (s.partName || s.name) && (s.partName || s.name).trim().toLowerCase() === spare.partName.trim().toLowerCase())
    )?.id;

    // 2. If not found and spare.id is numeric, use spare.id
    if (!targetSpareId && spare.id && !isNaN(Number(spare.id))) {
      targetSpareId = spare.id;
    }

    // 3. Fallback: query spareService directly
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

    navigate(`/spares/edit/${targetSpareId}`, {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Spares',
        tab: 'General',
        machineId: id,
        machineName: formData.name || 'Machine'
      }
    });
  };

  const [selectedWOForView, setSelectedWOForView] = useState<any>(null);
  const [showWOViewModal, setShowWOViewModal] = useState(false);

  const handleOpenWorkOrder = (wo: any) => {
    setSelectedWOForView(wo);
    setShowWOViewModal(true);
  };

  const handleOpenSchedule = (sch: any) => {
    navigate(`/schedules/edit/${sch.id}`, {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Schedule Maintenance',
        machineId: id,
        machineName: formData.name || 'Machine'
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

    navigate(`/suppliers/edit/${targetSupplierId}`, {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Purchase',
        machineName: formData.name || 'Machine'
      }
    });
  };
  
  const [machineSpares, setMachineSpares] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem(`machine_${id}_spares`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [spareSearchQuery, setSpareSearchQuery] = useState('');
  const [catalogSpares, setCatalogSpares] = useState<any[]>([]);
  const [availableLocationsList, setAvailableLocationsList] = useState<string[]>([]);
  const [spareModalLocation, setSpareModalLocation] = useState('');
  const [spareModalName, setSpareModalName] = useState('');
  const [spareModalQuantity, setSpareModalQuantity] = useState<number | string>(1);
  const [spareModalRate, setSpareModalRate] = useState<number | string>('');

  useEffect(() => {
    if (id) {
      localStorage.setItem(`machine_${id}_spares`, JSON.stringify(machineSpares));
    }
  }, [id, machineSpares]);

  const handleOpenAddSpareModal = () => {
    setSpareModalLocation(formData.company || availableLocationsList[0] || 'Main Store');
    setSpareModalName('');
    setSpareModalQuantity(1);
    setSpareModalRate('');
    setIsSparesModalOpen(true);
  };

  const handleNavigateToCreateSpare = () => {
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

    setMachineSpares(prev => {
      const idx = prev.findIndex(s => s.id === newSpareItem.id || s.partName === newSpareItem.partName);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...newSpareItem };
        return updated;
      }
      return [...prev, newSpareItem];
    });

    if (id) {
      machineSpareSync.onSpareAddedToMachine(
        { id, name: formData.name || 'Machine', location: formData.company || spareModalLocation },
        newSpareItem
      );
    }

    toast.success('Spare added successfully');
    setIsSparesModalOpen(false);
  };

  // Handle return from Spares Management with newly created spare
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
    const syncSpare = async () => {
      if (location.state?.newSpare) {
        const spare = location.state.newSpare;
        const formattedSpare = {
          id: spare.id || Date.now(),
          partName: spare.partName || spare.name || '',
          partCode: spare.partCode || '',
          category: spare.category || 'General',
          location: spare.location || 'Main Store',
          quantityUsed: 1,
          stockQuantity: spare.stockQuantity || 1,
          inHandQuantity: spare.inHandQuantity || 1,
          rate: Number(spare.rate) || Number(spare.unitCost) || 0,
          unitCost: Number(spare.unitCost) || Number(spare.rate) || 0,
          total: Number(spare.rate) || Number(spare.unitCost) || 0,
        };
        setMachineSpares(prev => {
          if (prev.some(s => s.id === formattedSpare.id || s.partName === formattedSpare.partName)) return prev;
          return [...prev, formattedSpare];
        });
        if (id) {
          machineSpareSync.onSpareAddedToMachine(
            { id, name: formData.name || 'Machine', location: formData.company || formattedSpare.location },
            formattedSpare
          );
        }
        toast.success(`Spare "${formattedSpare.partName}" added`);
        try {
          const freshSpares = await spareService.getAll();
          if (freshSpares) setCatalogSpares(freshSpares);
        } catch (_) {}
      } else if (location.state?.newSpareId) {
        const spareId = Number(location.state.newSpareId);
        try {
          const fetchedSpare = await spareService.getById(spareId);
          if (fetchedSpare) {
            const formattedSpare = {
              id: fetchedSpare.id,
              partName: fetchedSpare.partName || (fetchedSpare as any).name || '',
              partCode: fetchedSpare.partCode || '',
              category: fetchedSpare.category || 'General',
              location: fetchedSpare.location || 'Main Store',
              quantityUsed: 1,
              stockQuantity: fetchedSpare.stockQuantity || 1,
              inHandQuantity: fetchedSpare.inHandQuantity || 1,
              rate: Number(fetchedSpare.rate) || Number(fetchedSpare.unitCost) || 0,
              unitCost: Number(fetchedSpare.unitCost) || Number(fetchedSpare.rate) || 0,
              total: Number(fetchedSpare.rate) || Number(fetchedSpare.unitCost) || 0,
            };
            setMachineSpares(prev => {
              if (prev.some(s => s.id === formattedSpare.id || s.partName === formattedSpare.partName)) return prev;
              return [...prev, formattedSpare];
            });
            if (id) {
              machineSpareSync.onSpareAddedToMachine(
                { id, name: formData.name || 'Machine', location: formData.company || formattedSpare.location },
                formattedSpare
              );
            }
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
  }, [location.state]);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isSparesModalOpen, setIsSparesModalOpen] = useState(false);
  const [isAmcModalOpen, setIsAmcModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isIotModalOpen, setIsIotModalOpen] = useState(false);
  const [tempMacId, setTempMacId] = useState('');
  const [tempMachineType, setTempMachineType] = useState('HYPN');
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [uploadModalType, setUploadModalType] = useState<'File' | 'Link' | 'Note' | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  
  // Document states
  const [documents, setDocuments] = useState<any[]>([]);
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  
  // Specification states
  const [specifications, setSpecifications] = useState<any[]>([]);
  const [specTitle, setSpecTitle] = useState('');
  const [specInputType, setSpecInputType] = useState('text');
  const [specData, setSpecData] = useState('');
  const [specUnit, setSpecUnit] = useState('');
  const [savingSpec, setSavingSpec] = useState(false);
  const [specToDelete, setSpecToDelete] = useState<number | null>(null);
  const [amcSubTab, setAmcSubTab] = useState('AMC');
  const [purchaseSubTab, setPurchaseSubTab] = useState('Machine Purchase');
  const [purchases, setPurchases] = useState<any[]>([]);
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
  const [facilities, setFacilities] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [locationSearch, setLocationSearch] = useState('');

  // WO Tab States
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loadingWo, setLoadingWo] = useState(false);
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
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
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
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
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

  const [formData, setFormData] = useState({
    status: 'Online',
    name: '',
    deviceId: '',
    company: '',
    facilityId: '',
    maintenanceHead: '',
    machineCode: '',
    serialNumber: '',
    make: '',
    modelNumber: '',
    machineCategory: '',
    machineSubCategory: '',
    description: '',
    mainFacilityName: 'New Facility F1',
    facilityCategory: 'Facility Category',
    facilitySubCategory: 'Facility Sub-Category',
    
    isLocationPart: false,
    locationId: '',
    locationType: '',
    locationName: '',
    parentDeviceId: '',
    assetCode: '',
    
    latitude: '',
    longitude: '',
    costCenter: 'CC-MAINT-01',
    headOfDepartment: '',
    machineOwner: '',
    notes: '',
    imageUrl: '',
  });

  const [makeOptions, setMakeOptions] = useState<string[]>(['Make 1']);
  const [modelOptions, setModelOptions] = useState<string[]>(['Model 1']);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['Category 1', 'HYPN', 'FIRE', 'STP', 'WTP', 'SUMP']);
  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>(['Sub-Category 1']);
  const initialLoadRef = useRef(true);

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

  const [uploadingImage, setUploadingImage] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');

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

        const serverUrl = res.data?.success && res.data?.files?.[0]?.fileUrl ? res.data.files[0].fileUrl : base64Data;

        setFormData(prev => ({
          ...prev,
          imageUrl: serverUrl
        }));

        if (id) {
          try {
            await api.post(`/machines/${id}/documents`, {
              name: 'Machine Photo',
              type: 'File',
              content: serverUrl
            });
            fetchDocuments();
          } catch (docErr) {
            console.warn('Could not save photo to machine documents', docErr);
          }
        }

        toast.success('Machine image uploaded successfully');
        setUploadingImage(false);
        return;
      } catch (uploadErr) {
        console.warn('Backend image upload fallback to local data URL', uploadErr);
      }

      setFormData(prev => ({
        ...prev,
        imageUrl: base64Data
      }));
      if (id) {
        try {
          await api.post(`/machines/${id}/documents`, {
            name: 'Machine Photo',
            type: 'File',
            content: base64Data
          });
          fetchDocuments();
        } catch {}
      }
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
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    toast.success('Image removed');
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'Documents' && id) {
      fetchDocuments();
    } else if (activeTab === 'Specification' && id) {
      fetchSpecifications();
    } else if (activeTab === 'Checklist' && id) {
      fetchCheckpoints();
    } else if (activeTab === 'Schedule Maintenance' && id) {
      fetchSchedules();
    } else if (activeTab === 'WO' && id) {
      fetchWorkOrders();
    }
  }, [activeTab, id]);

  const fetchSpecifications = async () => {
    try {
      const res = await api.get(`/machines/${id}/specifications`);
      setSpecifications(res.data);
    } catch (err) {
      console.error('Error fetching specifications:', err);
    }
  };

  const handleSaveSpecification = async () => {
    if (!specTitle || !specInputType || !specData) {
      toast.error('Please fill required fields (Title, Type, Data)');
      return;
    }
    
    setSavingSpec(true);
    try {
      await api.post(`/machines/${id}/specifications`, {
        title: specTitle,
        inputType: specInputType,
        data: specData,
        unit: specUnit || undefined
      });
      toast.success('Specification added successfully');
      setSpecTitle('');
      setSpecInputType('text');
      setSpecData('');
      setSpecUnit('');
      setIsSpecModalOpen(false);
      fetchSpecifications();
    } catch (err: any) {
      console.error('Error saving specification:', err);
      toast.error(err.response?.data?.message || 'Failed to save specification');
    } finally {
      setSavingSpec(false);
    }
  };

  const executeDeleteSpecification = async () => {
    if (!specToDelete) return;
    try {
      await api.delete(`/machines/${id}/specifications/${specToDelete}`);
      toast.success('Specification deleted successfully');
      fetchSpecifications();
    } catch (err: any) {
      console.error('Error deleting specification:', err);
      toast.error(err.response?.data?.message || 'Failed to delete specification');
    } finally {
      setSpecToDelete(null);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/machines/${id}/documents`);
      setDocuments(res.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const fetchWorkOrders = async () => {
    if (!id) return;
    try {
      setLoadingWo(true);
      const res = await api.get('/work-orders', { params: { machineId: id } });
      setWorkOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching work orders:', err);
    } finally {
      setLoadingWo(false);
    }
  };

  const fetchCheckpoints = async () => {
    if (!id) return;
    try {
      setLoadingCheckpoints(true);
      const [cpsRes, masterRes] = await Promise.all([
        api.get(`/checkpoints/machine/${id}`).catch(() => ({ data: [] })),
        api.get('/checkpoints/master').catch(() => ({ data: [] })),
      ]);
      setCheckpoints(Array.isArray(cpsRes.data) ? cpsRes.data : []);
      if (Array.isArray(masterRes.data)) setMasterCheckpoints(masterRes.data);
    } catch (err) {
      console.error('Error fetching checkpoints:', err);
    } finally {
      setLoadingCheckpoints(false);
    }
  };

  const fetchSchedules = async () => {
    if (!id) return;
    try {
      setLoadingSchedules(true);
      const res = await api.get('/schedules', { params: { machineId: id } });
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchData = async () => {
    try {
      fetchWorkOrders();
      fetchCheckpoints();
      fetchSchedules();
      const [deviceRes, facilitiesRes, employeesRes, usersRes, docsRes, suppliersData, optionsRes, sparesData, mainFacRes] = await Promise.all([
        api.get(`/machines/${id}`),
        api.get('/facilities'),
        api.get('/employees'),
        api.get('/users').catch(() => ({ data: [] })),
        api.get(`/machines/${id}/documents`).catch(() => ({ data: [] })),
        supplierService.getAll().catch(() => []),
        api.get('/machines/dropdown-options').catch(() => ({ data: null })),
        spareService.getAll().catch(() => []),
        api.get('/main-facilities').catch(() => ({ data: [] })),
      ]);
      
      const device = deviceRes.data;
      setFacilities(Array.isArray(facilitiesRes.data) ? facilitiesRes.data : []);
      const rawUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];
      const rawEmps = Array.isArray(employeesRes?.data) ? employeesRes.data : [];
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
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      if (Array.isArray(sparesData)) {
        setCatalogSpares(sparesData);
        setMachineSpares(prev => {
          const merged = machineSpareSync.getMergedSparesForMachine(id || '', device?.name || '', prev, sparesData);
          if (id && merged.length > 0) {
            localStorage.setItem(`machine_${id}_spares`, JSON.stringify(merged));
          }
          return merged;
        });
      }
      const locs: string[] = [];
      if (Array.isArray(facilitiesRes?.data)) {
        facilitiesRes.data.forEach((f: any) => {
          if (f.facilityName && !locs.includes(f.facilityName)) locs.push(f.facilityName);
        });
      }
      if (Array.isArray(mainFacRes?.data)) {
        mainFacRes.data.forEach((mf: any) => {
          if (mf.mainFacilityName && !locs.includes(mf.mainFacilityName)) locs.push(mf.mainFacilityName);
        });
      }
      if (locs.length === 0) {
        locs.push('Main Store', 'Building A', 'Floor 1', 'Warehouse');
      }
      setAvailableLocationsList(locs);
      const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
      setDocuments(docs);

      if (optionsRes?.data) {
        if (Array.isArray(optionsRes.data.makes) && optionsRes.data.makes.length > 0) {
          setMakeOptions(optionsRes.data.makes);
        }
        if (Array.isArray(optionsRes.data.modelNumbers) && optionsRes.data.modelNumbers.length > 0) {
          setModelOptions(optionsRes.data.modelNumbers);
        }
        if (Array.isArray(optionsRes.data.machineCategories) && optionsRes.data.machineCategories.length > 0) {
          setCategoryOptions(optionsRes.data.machineCategories);
        }
        if (Array.isArray(optionsRes.data.machineSubCategories) && optionsRes.data.machineSubCategories.length > 0) {
          setSubCategoryOptions(optionsRes.data.machineSubCategories);
        }
      }

      const photoDoc = docs.find((d: any) => 
        d.type === 'File' && (
          d.name?.toLowerCase().includes('photo') || 
          d.name?.toLowerCase().includes('image') || 
          d.content?.match(/\.(jpg|jpeg|png|webp|gif)/i)
        )
      );
      
      if (device) {
        const isDeviceBuilding = !!device.buildingId;
        const subFacilityId = device.facilityId?.toString() || device.buildingId?.toString() || '';

        setFormData(prev => ({
          ...prev,
          status: (device.status || 'Online').toLowerCase() === 'offline' ? 'Offline' : 'Online',
          name: device.name || '',
          deviceId: device.deviceId || '',
          company: device.company || device.facility?.mainFacilityId?.toString() || '',
          facilityId: subFacilityId,
          maintenanceHead: device.maintenanceHead || '',
          machineCode: device.machineCode || '',
          serialNumber: device.serialNumber || '',
          make: device.make || '',
          modelNumber: device.modelNumber || '',
          machineCategory: device.machineCategory || '',
          machineSubCategory: device.machineSubCategory || '',
          description: device.description || '',
          isLocationPart: device.isLocationPart || false,
          locationId: subFacilityId,
          locationType: isDeviceBuilding ? 'building' : 'facility',
          locationName: device.facility?.facilityName || device.building?.name || '',
          parentDeviceId: device.parentMachineId?.toString() || device.parentDeviceId?.toString() || '',
          assetCode: device.assetCode || '',
          latitude: device.latitude || '',
          longitude: device.longitude || '',
          costCenter: device.costCenter || 'CC-MAINT-01',
          headOfDepartment: device.headOfDepartment || '',
          machineOwner: device.machineOwner || '',
          notes: device.notes || '',
          imageUrl: photoDoc?.content || device.imageUrl || '',
        }));

        if (device.make) setMakeOptions(prev => prev.includes(device.make) ? prev : [...prev, device.make]);
        if (device.modelNumber) setModelOptions(prev => prev.includes(device.modelNumber) ? prev : [...prev, device.modelNumber]);
        if (device.machineCategory) setCategoryOptions(prev => prev.includes(device.machineCategory) ? prev : [...prev, device.machineCategory]);
        if (device.machineSubCategory) setSubCategoryOptions(prev => prev.includes(device.machineSubCategory) ? prev : [...prev, device.machineSubCategory]);

        if (photoDoc?.content) {
          setLocalPreviewUrl(photoDoc.content);
        } else if (device.imageUrl) {
          setLocalPreviewUrl(device.imageUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setTimeout(() => {
        initialLoadRef.current = false;
      }, 500);
    }
  };

  useEffect(() => {
    if (initialLoadRef.current) {
      return;
    }
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

  const fetchNextAssetCode = async () => {
    try {
      const res = await api.get('/machines/next-asset-code');
      if (res.data?.nextCode) {
        setFormData(prev => ({
          ...prev,
          assetCode: res.data.nextCode
        }));
        toast.success(`Generated Asset Code: ${res.data.nextCode}`);
      }
    } catch (err) {
      console.error('Failed to fetch next asset code:', err);
      toast.error('Failed to auto-generate asset code.');
    }
  };

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

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Please enter Machine Name.');
      setActiveTab('General');
      return;
    }
    if (!formData.assetCode) {
      toast.error('Please enter the Asset Code.');
      setActiveTab('General');
      return;
    }
    
    setSaving(true);
    try {
      const targetId = formData.facilityId || formData.locationId;
      const isBuilding = (formData as any).locationType === 'building' || (formData as any).locationType === 'society';

      await api.put(`/machines/${id}`, {
        name: formData.name,
        deviceId: formData.deviceId || null,
        company: formData.company,
        facilityId: isBuilding ? null : (targetId ? parseInt(targetId) : null),
        buildingId: isBuilding ? (targetId ? parseInt(targetId) : null) : null,
        maintenanceHead: formData.maintenanceHead,
        machineCode: formData.machineCode,
        serialNumber: formData.serialNumber,
        make: formData.make,
        modelNumber: formData.modelNumber,
        machineCategory: formData.machineCategory,
        machineSubCategory: formData.machineSubCategory,
        description: formData.description,
        isLocationPart: formData.isLocationPart,
        parentDeviceId: formData.isLocationPart && formData.parentDeviceId ? parseInt(formData.parentDeviceId) : null,
        assetCode: formData.assetCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        costCenter: formData.costCenter?.trim() || 'CC-MAINT-01',
        headOfDepartment: formData.headOfDepartment,
        machineOwner: formData.machineOwner,
        notes: formData.notes,
        status: formData.status || 'Online',
      });
      toast.success('Machine saved successfully!');
    } catch (error: any) {
      console.error('Error saving machine:', error);
      toast.error(error.response?.data?.message || 'Failed to save machine.');
    } finally {
      setSaving(false);
    }
  };

  const selectLocation = (facility: any) => {
    setFormData(prev => ({
      ...prev,
      locationId: facility.id.toString(),
      locationName: facility.facilityName
    }));
    setIsLocationModalOpen(false);
  };

  const filteredFacilities = facilities.filter(f => 
    (f?.facilityName || '').toLowerCase().includes(locationSearch.toLowerCase()) || 
    (f?.facilityCode || '').toLowerCase().includes(locationSearch.toLowerCase())
  );

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
    setDocFile(null);
  };

  const handleViewDoc = (doc: any) => {
    if (doc.type === 'File') {
      if (doc.content) {
        const fullUrl = doc.content.startsWith('http') || doc.content.startsWith('data:')
          ? doc.content
          : `http://localhost:3002${doc.content.startsWith('/') ? doc.content : `/${doc.content}`}`;
        window.open(fullUrl, '_blank');
      } else {
        toast.error('File URL is not available');
      }
    } else if (doc.type === 'Link') {
      const linkUrl = doc.content.startsWith('http') ? doc.content : `https://${doc.content}`;
      window.open(linkUrl, '_blank');
    } else {
      setViewingDoc(doc);
    }
  };

  const handleUploadDocument = async () => {
    if (!docName.trim()) {
      toast.error('Name is required');
      return;
    }
    
    setUploadingDoc(true);
    try {
      if (editingDoc) {
        if (uploadModalType === 'File') {
          const formData = new FormData();
          formData.append('name', docName.trim());
          if (docFile) {
            formData.append('file', docFile);
          }
          await api.put(`/machines/${id}/documents/${editingDoc.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else if (uploadModalType === 'Link') {
          if (!docContent.trim()) {
            toast.error('URL is required');
            setUploadingDoc(false);
            return;
          }
          await api.put(`/machines/${id}/documents/${editingDoc.id}`, {
            name: docName.trim(),
            url: docContent.trim()
          });
        } else if (uploadModalType === 'Note') {
          if (!docContent.trim()) {
            toast.error('Note content is required');
            setUploadingDoc(false);
            return;
          }
          await api.put(`/machines/${id}/documents/${editingDoc.id}`, {
            name: docName.trim(),
            note: docContent.trim()
          });
        }
        toast.success('Document updated successfully');
      } else {
        if (uploadModalType === 'File') {
          if (!docFile) {
            toast.error('File is required');
            setUploadingDoc(false);
            return;
          }
          const formData = new FormData();
          formData.append('name', docName.trim());
          formData.append('file', docFile);
          
          await api.post(`/machines/${id}/documents/file`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else if (uploadModalType === 'Link') {
          if (!docContent.trim()) {
            toast.error('URL is required');
            setUploadingDoc(false);
            return;
          }
          await api.post(`/machines/${id}/documents/link`, {
            name: docName.trim(),
            url: docContent.trim()
          });
        } else if (uploadModalType === 'Note') {
          if (!docContent.trim()) {
            toast.error('Note is required');
            setUploadingDoc(false);
            return;
          }
          await api.post(`/machines/${id}/documents/note`, {
            name: docName.trim(),
            note: docContent.trim()
          });
        }
        toast.success('Document uploaded successfully');
      }
      
      setUploadModalType(null);
      setEditingDoc(null);
      setDocName('');
      setDocContent('');
      setDocFile(null);
      fetchDocuments();
    } catch (err: any) {
      console.error('Error saving document:', err);
      toast.error(err.response?.data?.message || 'Failed to save document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const executeDeleteDocument = async () => {
    if (!documentToDelete) return;
    try {
      await api.delete(`/machines/${id}/documents/${documentToDelete}`);
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      toast.error(err.response?.data?.message || 'Failed to delete document');
    } finally {
      setDocumentToDelete(null);
    }
  };

  const tabs = ['General', 'Specification', 'Spares', 'AMC', 'Purchase', 'Documents', 'IOT', 'WO', 'Checklist', 'Schedule Maintenance'];
  const permittedTabs = tabs.filter(tab => hasTabPermission(currentUser, tab, 'view'));

  useEffect(() => {
    if (permittedTabs.length > 0 && !permittedTabs.includes(activeTab)) {
      setActiveTab(permittedTabs[0]);
    }
  }, [permittedTabs, activeTab]);

  const canEditCurrentTab = hasTabPermission(currentUser, activeTab, 'edit');
  const canCreateInTab = hasTabPermission(currentUser, activeTab, 'create');
  const canDeleteInTab = hasTabPermission(currentUser, activeTab, 'delete');

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

  const handleSavePurchase = async () => {
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

    const newPurchase = {
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
    };

    setPurchases(prev => [...prev, newPurchase]);

    // If an invoice file was uploaded, save it to machine documents
    if (purchaseForm.file && id) {
      try {
        const uploadData = new FormData();
        uploadData.append('name', `${purchaseSubTab} Invoice - ${purchaseForm.supplierName}`);
        uploadData.append('file', purchaseForm.file);
        await api.post(`/machines/${id}/documents/file`, uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fetchDocuments();
      } catch (uploadErr) {
        console.warn('Could not upload purchase invoice document:', uploadErr);
      }
    }

    setIsPurchaseModalOpen(false);
    toast.success(`${purchaseSubTab} added successfully`);
  };

  const [submittingWo, setSubmittingWo] = useState(false);
  const [submittingCheckpoint, setSubmittingCheckpoint] = useState(false);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const handleCreateWorkOrder = async () => {
    if (!woForm.problemDescription.trim()) {
      toast.error('Please enter a problem description');
      return;
    }
    if (!id) return;
    try {
      setSubmittingWo(true);
      await api.post('/work-orders', {
        machineId: Number(id),
        problemDescription: woForm.problemDescription.trim(),
        priority: woForm.priority,
        triggerType: woForm.triggerType,
        assignedTechnicianId: woForm.assignedTechnicianId ? Number(woForm.assignedTechnicianId) : undefined,
      });
      toast.success('Work Order created successfully');
      setIsWoModalOpen(false);
      setWoForm({
        problemDescription: '',
        priority: 'MEDIUM',
        triggerType: 'MANUAL',
        assignedTechnicianId: '',
        estimatedStartDate: '',
        estimatedEndDate: '',
      });
      fetchWorkOrders();
    } catch (err: any) {
      console.error('Error creating work order:', err);
      toast.error(err.response?.data?.message || 'Failed to create work order');
    } finally {
      setSubmittingWo(false);
    }
  };

  const handleCreateCheckpoint = async () => {
    if (!id) return;
    try {
      setSubmittingCheckpoint(true);
      if (checkpointTabMode === 'catalog') {
        if (!selectedMasterCheckpointId) {
          toast.error('Please select a checkpoint from the catalog');
          return;
        }
        const selected = masterCheckpoints.find(c => c.id.toString() === selectedMasterCheckpointId);
        if (!selected) return;

        await api.post('/checkpoints', {
          machineId: Number(id),
          checkpointType: selected.checkpointType,
          description: selected.description,
          frequency: selected.frequency,
          standardValue: selected.standardValue,
          unit: selected.unit,
          minValue: selected.minValue !== undefined && selected.minValue !== null ? Number(selected.minValue) : undefined,
          maxValue: selected.maxValue !== undefined && selected.maxValue !== null ? Number(selected.maxValue) : undefined,
          category: selected.category,
        });
        toast.success('Checkpoint added successfully');
      } else {
        if (!checkpointForm.description.trim()) {
          toast.error('Please enter checkpoint description');
          return;
        }
        await api.post('/checkpoints', {
          machineId: Number(id),
          checkpointType: checkpointForm.checkpointType,
          description: checkpointForm.description.trim(),
          frequency: checkpointForm.frequency,
          standardValue: checkpointForm.standardValue || undefined,
          unit: checkpointForm.unit || undefined,
          minValue: checkpointForm.minValue ? Number(checkpointForm.minValue) : undefined,
          maxValue: checkpointForm.maxValue ? Number(checkpointForm.maxValue) : undefined,
          category: checkpointForm.category || 'General',
        });
        toast.success('Custom checkpoint added successfully');
      }
      setIsCheckpointModalOpen(false);
      fetchCheckpoints();
    } catch (err: any) {
      console.error('Error saving checkpoint:', err);
      toast.error(err.response?.data?.message || 'Failed to save checkpoint');
    } finally {
      setSubmittingCheckpoint(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!id) return;
    try {
      setSubmittingSchedule(true);
      await api.post('/schedules', {
        machineId: Number(id),
        scheduleType: scheduleForm.scheduleType,
        frequency: scheduleForm.frequency,
        priority: scheduleForm.priority,
        startDate: scheduleForm.startDate,
        triggerTime: scheduleForm.triggerTime,
        prePlanToleranceDays: scheduleForm.prePlanToleranceDays,
        postPlanToleranceDays: scheduleForm.postPlanToleranceDays,
        notes: scheduleForm.notes,
      });
      toast.success('Maintenance schedule created successfully');
      setIsScheduleModalOpen(false);
      fetchSchedules();
    } catch (err: any) {
      console.error('Error creating schedule:', err);
      toast.error(err.response?.data?.message || 'Failed to create schedule');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.subTab === purchaseSubTab &&
    (
      (p.supplierName || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      (p.contactNumber || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase())
    )
  );

  const filteredDocuments = documents.filter(doc => 
    (doc?.name || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (doc?.type || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (doc?.content || '').toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  return (
    <div className="sm:px-2 md:px-4 pb-6 pt-0 w-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {formData.name || 'Edit Machine'}
              </h1>
              {formData.machineCode && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {formData.machineCode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Update asset profile, specifications, spares, and IoT telemetry</p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          {!canEditCurrentTab && permittedTabs.length > 0 && (
            <div className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              Read-only mode ({activeTab})
            </div>
          )}
          <button 
            type="button"
            onClick={handleBack}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
          >
            Back
          </button>
          {canEditCurrentTab && (
            <button 
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
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
            setFormData(prev => ({
              ...prev,
              status: prev.status === 'Online' ? 'Offline' : 'Online'
            }));
          }}
        />

        {/* Right Column: Tabbed Form Container */}
        <div className="flex-1 w-full bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col min-h-[550px]">
          {/* Tabs */}
          {permittedTabs.length > 0 && (
            <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1">
              {permittedTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

        {/* Content Area */}
        <div className="p-6 w-full">
          {permittedTabs.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No Tab Access</h3>
              <p className="text-sm text-slate-500 mt-1">You do not have permission to view any tabs for this machine.</p>
            </div>
          ) : activeTab === 'General' ? (
            <div className="space-y-3">
              {/* Facility & Management */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Facility<span className="text-red-500">*</span></label>
                  <FacilityHierarchyPicker name="company" value={formData.company} onChange={handleChange} placeholder="Select Facility" disabled={!canEditCurrentTab} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Sub-Facility<span className="text-red-500">*</span></label>
                  <FacilityHierarchyPicker name="facilityId" value={formData.facilityId} onChange={handleChange} placeholder="Select Sub-Facility" filterByMainFacilityId={formData.company} disabled={!formData.company || !canEditCurrentTab} selectableTypes={['facility', 'building']} defaultExpanded={true} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Maintenance Head</label>
                  <CustomSelect name="maintenanceHead" value={formData.maintenanceHead} onChange={handleChange} placeholder="Select Head" options={employees.map(e => ({ label: `${e.role || 'Staff'} - ${e.fullName}`, value: e.fullName }))} disabled={!canEditCurrentTab} />
                </div>
              </div>

              {/* Machine Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Machine Name<span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} disabled={!canEditCurrentTab} className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed" />
                </div>
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
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Status<span className="text-red-500">*</span></label>
                  <CustomSelect name="status" value={formData.status} onChange={handleChange} placeholder="Select Status" options={[{ label: 'Online', value: 'Online' }, { label: 'Offline', value: 'Offline' }]} disabled={!canEditCurrentTab} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Serial Number<span className="text-red-500">*</span></label>
                  <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} disabled={!canEditCurrentTab} className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Make<span className="text-red-500">*</span></label>
                  <CustomSelect 
                    name="make" 
                    value={formData.make} 
                    onChange={handleChange} 
                    placeholder="Select Make" 
                    options={makeOptions} 
                    allowCustom={canEditCurrentTab} 
                    onAddOption={(val) => handleAddOption('make', val)} 
                    disabled={!canEditCurrentTab}
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
                    allowCustom={canEditCurrentTab} 
                    onAddOption={(val) => handleAddOption('modelNumber', val)} 
                    disabled={!canEditCurrentTab}
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
                    allowCustom={canEditCurrentTab} 
                    onAddOption={(val) => handleAddOption('machineCategory', val)} 
                    disabled={!canEditCurrentTab}
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
                    allowCustom={canEditCurrentTab} 
                    onAddOption={(val) => handleAddOption('machineSubCategory', val)} 
                    disabled={!canEditCurrentTab}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Machine Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} disabled={!canEditCurrentTab} rows={2} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none h-12 disabled:bg-slate-100 disabled:cursor-not-allowed"></textarea>
              </div>

              {/* Location Hierarchy */}
              <div>
                <h3 className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Location Hierarchy</h3>
                <div className="bg-slate-50/80 p-2 sm:p-2.5 rounded-md border border-slate-200 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <label className={`flex items-center gap-2 min-w-[190px] ${canEditCurrentTab ? 'cursor-pointer' : 'cursor-default'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${formData.isLocationPart ? 'border-blue-600' : 'border-slate-300'}`}>
                        {formData.isLocationPart && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                      </div>
                      <input type="radio" checked={formData.isLocationPart} disabled={!canEditCurrentTab} onChange={() => setFormData((prev: any) => ({...prev, isLocationPart: true}))} className="hidden" />
                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">This Machine is a part of</span>
                    </label>
                    <div className="flex-1 max-w-md">
                      <MachineHierarchyPicker name="parentDeviceId" value={formData.parentDeviceId} onChange={handleChange} disabled={!formData.isLocationPart || !canEditCurrentTab} filterByCompany={formData.company} filterByLocationId={formData.locationId} excludeDeviceId={id} />
                    </div>
                  </div>
                  <label className={`flex items-center gap-2 ${canEditCurrentTab ? 'cursor-pointer' : 'cursor-default'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${!formData.isLocationPart ? 'border-blue-600' : 'border-slate-300'}`}>
                      {!formData.isLocationPart && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                    </div>
                    <input type="radio" checked={!formData.isLocationPart} disabled={!canEditCurrentTab} onChange={() => setFormData((prev: any) => ({...prev, isLocationPart: false}))} className="hidden" />
                    <span className="text-xs font-medium text-slate-700">This Machine is not a part of another location, is located at</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Location<span className="text-red-500">*</span></label><FacilityHierarchyPicker name="locationId" value={formData.locationId} onChange={handleChange} disabled={!canEditCurrentTab} /></div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Latitude<span className="text-red-500">*</span></label><input type="text" name="latitude" value={formData.latitude} onChange={handleChange} disabled={!canEditCurrentTab} className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed" /></div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Longitude<span className="text-red-500">*</span></label><input type="text" name="longitude" value={formData.longitude} onChange={handleChange} disabled={!canEditCurrentTab} className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed" /></div>
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
                    disabled={!canEditCurrentTab}
                    placeholder="e.g. CC-MAINT-01" 
                    className="w-full px-2.5 py-1 min-h-[32px] h-8 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed" 
                  />
                </div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Select Head of Department<span className="text-red-500">*</span></label><CustomSelect name="headOfDepartment" value={formData.headOfDepartment} onChange={handleChange} disabled={!canEditCurrentTab} options={employees.map(e => ({ label: `${e.role || 'Staff'} - ${e.fullName}`, value: e.fullName }))} /></div>
                <div><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Machine Owner<span className="text-red-500">*</span></label><CustomSelect name="machineOwner" value={formData.machineOwner} onChange={handleChange} disabled={!canEditCurrentTab} options={employees.map(e => ({ label: `${e.role || 'Staff'} - ${e.fullName}`, value: e.fullName }))} /></div>
                <div className="col-span-1 md:col-span-4"><label className="block text-[11px] font-medium text-slate-600 mb-0.5">Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} disabled={!canEditCurrentTab} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none h-11 disabled:bg-slate-100 disabled:cursor-not-allowed"></textarea></div>
              </div>
            </div>
          ) : activeTab === 'Specification' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Upload Name Plate</label>
                <div className="w-full max-w-md">
                  <input 
                    type="file"
                    className="block w-full text-xs text-slate-600 border border-slate-300 rounded-lg p-1.5 cursor-pointer focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Specifications</h3>
                  {canCreateInTab && (
                    <button 
                      onClick={() => setIsSpecModalOpen(true)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-semibold text-white rounded-lg transition-all shadow-xs cursor-pointer">
                      <Plus size={16} className="stroke-[2.5]" />
                      Add Specification Field
                    </button>
                  )}
                </div>
                
                {/* Render Specifications List */}
                {specifications.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    {specifications.map((spec) => (
                      <div key={spec.id} className="flex justify-between items-center bg-slate-50 border border-slate-200/90 p-4 rounded-xl">
                        <div>
                          <p className="text-xs text-slate-500 font-semibold mb-1">{spec.title}</p>
                          <p className="text-sm font-bold text-slate-900">
                            {spec.data} <span className="text-slate-500 text-xs font-normal">{spec.unit}</span>
                          </p>
                        </div>
                        {canDeleteInTab && (
                          <button 
                            onClick={() => setSpecToDelete(spec.id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                            title="Delete Specification"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'Spares' ? (
            <div className="space-y-5 w-full">
              {/* Toolbar */}
              <div className="flex justify-between items-center gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search spares..." 
                    value={spareSearchQuery}
                    onChange={(e) => setSpareSearchQuery(e.target.value)}
                    className="h-[38px] pl-9 pr-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 w-64"
                  />
                </div>
                {(canCreateInTab || canEditCurrentTab) && (
                  <button 
                    type="button"
                    onClick={handleOpenAddSpareModal}
                    className="h-[38px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[2.5]" /> Add Spare
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full border border-slate-200/90 rounded-xl">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-12"><input type="checkbox" className="rounded border-slate-300 text-blue-600" disabled /></th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">No.</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Make</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Model Number</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Quantity Used</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Rate</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Total</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {machineSpares.filter(s => 
                      (s.partName || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                      (s.partCode || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                      (s.category || '').toLowerCase().includes(spareSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm font-medium text-slate-500 bg-white">
                          No spares added yet.{' '}
                          {(canCreateInTab || canEditCurrentTab) && (
                            <button
                              type="button"
                              onClick={handleOpenAddSpareModal}
                              className="text-blue-600 hover:underline font-semibold ml-1 cursor-pointer"
                            >
                              Click here to Add Spare
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      machineSpares.filter(s => 
                        (s.partName || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                        (s.partCode || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                        (s.category || '').toLowerCase().includes(spareSearchQuery.toLowerCase())
                      ).map((spare, index) => {
                        const qty = spare.quantityUsed || spare.stockQuantity || spare.inHandQuantity || 1;
                        const rate = spare.rate !== undefined && spare.rate !== null ? Number(spare.rate) : spare.unitCost ? Number(spare.unitCost) : 0;
                        const total = spare.total !== undefined ? Number(spare.total) : qty * rate;
                        return (
                          <tr 
                            key={spare.id || index} 
                            onClick={() => handleOpenSpare(spare)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" className="rounded border-slate-300 text-blue-600 cursor-pointer" />
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{spare.partName}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{spare.category || '-'}</td>
                            <td className="px-4 py-3 text-sm font-mono text-slate-600">{spare.partCode || '-'}</td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-slate-800">{qty}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">₹{total.toFixed(2)}</td>
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
                                  onClick={() => {
                                    setMachineSpares(prev => prev.filter(s => s.id !== spare.id));
                                    if (id) {
                                      machineSpareSync.onSpareRemovedFromMachine(id, spare);
                                    }
                                  }}
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
            <div className="space-y-5 w-full">
              {/* Toolbar */}
              <div className="flex justify-between items-center">
                {/* Toggle Group */}
                <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <button 
                    onClick={() => setAmcSubTab('AMC')}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${amcSubTab === 'AMC' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    AMC
                  </button>
                  <button 
                    onClick={() => setAmcSubTab('Warranties')}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-colors border-l border-slate-200 cursor-pointer ${amcSubTab === 'Warranties' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Warranties
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      className="h-[38px] pl-9 pr-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 w-56"
                    />
                  </div>
                  <button 
                    onClick={() => setIsAmcModalOpen(true)}
                    className="h-[38px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[2.5]" /> Add {amcSubTab}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full border border-slate-200/90 rounded-xl">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-12"><input type="checkbox" className="rounded border-slate-300 text-blue-600" disabled /></th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">No.</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Provider Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Start Date</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">End Date</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">{amcSubTab === 'AMC' ? 'AMC Usage' : 'Warranties Usage'}</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Certificate Number</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[]?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm font-medium text-slate-500 bg-white">
                          No {amcSubTab} added yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'Purchase' ? (
            <div className="space-y-5 w-full">
              {/* Toolbar */}
              <div className="flex justify-between items-center">
                {/* Toggle Group */}
                <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <button 
                    onClick={() => setPurchaseSubTab('Machine Purchase')}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${purchaseSubTab === 'Machine Purchase' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Machine Purchase
                  </button>
                  <button 
                    onClick={() => setPurchaseSubTab('Spare/Service Purchase')}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-colors border-l border-slate-200 cursor-pointer ${purchaseSubTab === 'Spare/Service Purchase' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Spare/Service Purchase
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={purchaseSearchQuery}
                      onChange={e => setPurchaseSearchQuery(e.target.value)}
                      placeholder="Search..." 
                      className="h-[38px] pl-9 pr-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 w-56"
                    />
                  </div>
                  <button 
                    onClick={handleOpenPurchaseModal}
                    className="h-[38px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[2.5]" /> Add Purchase
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full border border-slate-200/90 rounded-xl">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-12"><input type="checkbox" className="rounded border-slate-300 text-emerald-600" disabled /></th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">No.</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Contact Number</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-slate-500 bg-white">
                          No {purchaseSubTab} added yet.
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((item, idx) => (
                        <tr 
                          key={item.id} 
                          onClick={() => handleOpenSupplier(item)}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-slate-300 cursor-pointer" />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-900">{item.supplierName}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{item.email}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{item.contactNumber}</td>
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
                                onClick={() => setPurchases(prev => prev.filter(p => p.id !== item.id))}
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
          ) : activeTab === 'Documents' ? (
            <div className="space-y-5 w-full">
              {/* Toolbar */}
              <div className="flex justify-between items-center">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={docSearchQuery}
                    onChange={e => setDocSearchQuery(e.target.value)}
                    placeholder="Search documents..." 
                    className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 text-slate-900"
                  />
                </div>

                {canCreateInTab && (
                  <div className="relative">
                    <button 
                      onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                      className="h-[38px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus size={16} className="stroke-[2.5]" /> Upload
                    </button>
                    
                    {/* Upload Dropdown */}
                    {isUploadMenuOpen && (
                      <div className="absolute top-full right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20">
                        <button 
                          onClick={() => handleOpenUpload('File')}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          File
                        </button>
                        <button 
                          onClick={() => handleOpenUpload('Link')}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          Link
                        </button>
                        <button 
                          onClick={() => handleOpenUpload('Note')}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          Notes
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full border border-slate-200/90 rounded-xl">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-12"><input type="checkbox" className="rounded border-slate-300 text-emerald-600" disabled /></th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">No.</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Document Type</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Document Details</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocuments?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-slate-500 bg-white">
                          No documents added yet.
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map((doc, index) => (
                        <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3"><input type="checkbox" className="rounded border-slate-300 text-emerald-600" /></td>
                          <td className="px-4 py-3 text-xs sm:text-sm text-slate-500 font-medium">{index + 1}</td>
                          <td className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900">{doc.name}</td>
                          <td className="px-4 py-3 text-xs sm:text-sm text-slate-600">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              doc.type === 'File' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              doc.type === 'Link' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {doc.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs sm:text-sm text-slate-600">
                            {doc.type === 'File' ? (
                              <button 
                                type="button" 
                                onClick={() => handleViewDoc(doc)}
                                className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium cursor-pointer flex items-center gap-1"
                              >
                                <span>{doc.name || 'View File'}</span>
                              </button>
                            ) : doc.type === 'Link' ? (
                              <a href={doc.content} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{doc.content}</a>
                            ) : (
                              <span className="truncate max-w-[200px] block text-slate-700">{doc.content}</span>
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
                                <Eye size={16} />
                              </button>
                              {canEditCurrentTab && (
                                <button 
                                  type="button"
                                  onClick={() => handleEditDoc(doc)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Document"
                                >
                                  <Pencil size={16} />
                                </button>
                              )}
                              {canDeleteInTab && (
                                <button 
                                  type="button"
                                  onClick={() => setDocumentToDelete(doc.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Document"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'IOT' ? (
            <IOTTabContent 
              deviceId={formData.deviceId}
              deviceData={formData}
              onAddSystem={() => { 
                if (!canEditCurrentTab) {
                  toast.error('You do not have permission to edit IOT settings.');
                  return;
                }
                setTempMacId(formData.deviceId || ''); 
                setTempMachineType((formData as any).machineType || formData.machineCategory || 'HYPN'); 
                setIsIotModalOpen(true); 
              }}
            />
          ) : activeTab === 'WO' ? (
            <div className="space-y-6">
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Work Orders (WO)</h3>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {workOrders.length} Work Orders
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track breakdown requests, preventive tasks, and service orders logged for this machine
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={woSearchQuery}
                      onChange={(e) => setWoSearchQuery(e.target.value)}
                      placeholder="Search work orders..."
                      className="pl-9 pr-3.5 py-1.5 min-h-[34px] bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-56"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchWorkOrders()}
                    disabled={loadingWo}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Refresh Work Orders"
                  >
                    <RefreshCw size={14} className={loadingWo ? 'animate-spin text-emerald-600' : ''} />
                  </button>
                  {canCreateInTab && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/work-orders/new?machineId=${id}`, {
                          state: {
                            returnUrl: location.pathname,
                            returnTab: 'WO',
                            tab: 'WO'
                          }
                        });
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 min-h-[34px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      <Plus size={15} />
                      <span>Create Work Order</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/work-orders')}
                    className="flex items-center gap-1 px-3 py-1.5 min-h-[34px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    title="Open Work Order Management"
                  >
                    <span>All Orders</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>



              {/* Table */}
              <div className="overflow-x-auto w-full border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left whitespace-nowrap text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12">No.</th>
                      <th className="px-4 py-3">WO Number</th>
                      <th className="px-4 py-3">Problem Description</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assigned Technician</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingWo ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          <RefreshCw size={20} className="animate-spin text-emerald-600 mx-auto mb-2" />
                          <span>Loading work orders...</span>
                        </td>
                      </tr>
                    ) : workOrders.filter(wo =>
                      (wo.woNumber || '').toLowerCase().includes(woSearchQuery.toLowerCase()) ||
                      (wo.problemDescription || '').toLowerCase().includes(woSearchQuery.toLowerCase()) ||
                      (wo.status || '').toLowerCase().includes(woSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500 bg-white">
                          <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No Work Orders for this Machine</p>
                          <p className="text-xs text-slate-400 mt-0.5">Create a breakdown or preventive work order to start tracking maintenance</p>
                          {canCreateInTab && (
                            <button
                              type="button"
                              onClick={() => {
                                navigate(`/work-orders/new?machineId=${id}`, {
                                  state: {
                                    returnUrl: location.pathname,
                                    returnTab: 'WO',
                                    tab: 'WO'
                                  }
                                });
                              }}
                              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              <Plus size={14} />
                              <span>Create First Work Order</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      workOrders
                        .filter(wo =>
                          (wo.woNumber || '').toLowerCase().includes(woSearchQuery.toLowerCase()) ||
                          (wo.problemDescription || '').toLowerCase().includes(woSearchQuery.toLowerCase()) ||
                          (wo.status || '').toLowerCase().includes(woSearchQuery.toLowerCase())
                        )
                        .map((wo, idx) => {
                          const priorityColors: Record<string, string> = {
                            CRITICAL: 'bg-red-50 text-red-700 border-red-200',
                            HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
                            MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
                            LOW: 'bg-slate-100 text-slate-700 border-slate-200',
                          };
                          const statusColors: Record<string, string> = {
                            PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
                            APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
                            IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                            COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
                            REJECTED: 'bg-red-50 text-red-700 border-red-200',
                          };
                          return (
                            <tr 
                              key={wo.id} 
                              onClick={() => handleOpenWorkOrder(wo)}
                              className="hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                              <td className="px-4 py-3 font-mono font-bold text-blue-600">{wo.woNumber}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 max-w-[280px] truncate">
                                {wo.problemDescription}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${priorityColors[wo.priority] || priorityColors.MEDIUM}`}>
                                  {wo.priority}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${statusColors[wo.status] || statusColors.PENDING_APPROVAL}`}>
                                  {(wo.status || '').replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-700">
                                {wo.assignedTechnician ? (wo.assignedTechnician.fullName || wo.assignedTechnician.name) : 'Unassigned'}
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                                {wo.estimatedStartDate ? new Date(wo.estimatedStartDate).toLocaleDateString() : 'Immediate'}
                              </td>
                              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenWorkOrder(wo)}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                  title="View Work Order"
                                >
                                  <Eye size={15} />
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
          ) : activeTab === 'Checklist' ? (
            <div className="space-y-6">
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Machine Checklist & Checkpoints</h3>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {checkpoints.length} Checkpoints
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live inspection parameters, sensor thresholds, and operational checklists linked to this machine
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={checkpointSearchQuery}
                      onChange={(e) => setCheckpointSearchQuery(e.target.value)}
                      placeholder="Search checkpoints..."
                      className="pl-9 pr-3.5 py-1.5 min-h-[34px] bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-56"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchCheckpoints()}
                    disabled={loadingCheckpoints}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Refresh Checkpoints"
                  >
                    <RefreshCw size={14} className={loadingCheckpoints ? 'animate-spin text-emerald-600' : ''} />
                  </button>
                  {canCreateInTab && (
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
                  )}
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
                    {loadingCheckpoints ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          <RefreshCw size={20} className="animate-spin text-emerald-600 mx-auto mb-2" />
                          <span>Loading checkpoints...</span>
                        </td>
                      </tr>
                    ) : checkpoints.filter(cp => {
                      const desc = cp.description || cp.checkpointMaster?.description || '';
                      const cat = cp.category || cp.checkpointMaster?.category || '';
                      const code = cp.checkpointMaster?.code || cp.code || '';
                      return desc.toLowerCase().includes(checkpointSearchQuery.toLowerCase()) ||
                             cat.toLowerCase().includes(checkpointSearchQuery.toLowerCase()) ||
                             code.toLowerCase().includes(checkpointSearchQuery.toLowerCase());
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500 bg-white">
                          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No Checkpoints for this Machine</p>
                          <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;Add Checkpoint&rdquo; to attach standard inspection parameters</p>
                        </td>
                      </tr>
                    ) : (
                      checkpoints
                        .filter(cp => {
                          const desc = cp.description || cp.checkpointMaster?.description || '';
                          const cat = cp.category || cp.checkpointMaster?.category || '';
                          const code = cp.checkpointMaster?.code || cp.code || '';
                          return desc.toLowerCase().includes(checkpointSearchQuery.toLowerCase()) ||
                                 cat.toLowerCase().includes(checkpointSearchQuery.toLowerCase()) ||
                                 code.toLowerCase().includes(checkpointSearchQuery.toLowerCase());
                        })
                        .map((cp, idx) => {
                          const code = cp.checkpointMaster?.code || cp.code || `CHK-${idx + 1}`;
                          const type = cp.checkpointType || cp.checkpointMaster?.checkpointType || 'PREVENTIVE';
                          const category = cp.category || cp.checkpointMaster?.category || 'General';
                          const description = cp.description || cp.checkpointMaster?.description || '';
                          const frequency = cp.frequency || cp.checkpointMaster?.frequency || 'MONTHLY';
                          const stdVal = cp.standardValue || cp.checkpointMaster?.standardValue;
                          const minVal = cp.minValue ?? cp.checkpointMaster?.minValue;
                          const maxVal = cp.maxValue ?? cp.checkpointMaster?.maxValue;
                          const unit = cp.unit || cp.checkpointMaster?.unit || '';

                          return (
                            <tr key={cp.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-700">{code}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  type === 'PREVENTIVE' 
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}>
                                  {type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-medium">{category}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 max-w-[300px] truncate">{description}</td>
                              <td className="px-4 py-3 text-slate-600 font-medium">{frequency}</td>
                              <td className="px-4 py-3 text-slate-700">
                                {stdVal || (minVal !== undefined && maxVal !== undefined ? `${minVal} - ${maxVal} ${unit}` : '-')}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {canDeleteInTab && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await api.delete(`/checkpoints/${cp.id}`);
                                        toast.success('Checkpoint deleted');
                                        fetchCheckpoints();
                                      } catch (err: any) {
                                        console.error('Error deleting checkpoint:', err);
                                        toast.error(err.response?.data?.message || 'Failed to delete checkpoint');
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                    title="Remove Checkpoint"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'Schedule Maintenance' ? (
            <div className="space-y-6">
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Schedule Maintenance</h3>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {schedules.length} Active Schedules
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated servicing calendar, recurring work order generator, and SLA tolerance limits
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={scheduleSearchQuery}
                      onChange={(e) => setScheduleSearchQuery(e.target.value)}
                      placeholder="Search schedules..."
                      className="pl-9 pr-3.5 py-1.5 min-h-[34px] bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-56"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchSchedules()}
                    disabled={loadingSchedules}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Refresh Schedules"
                  >
                    <RefreshCw size={14} className={loadingSchedules ? 'animate-spin text-emerald-600' : ''} />
                  </button>
                  {canCreateInTab && (
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
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/schedules')}
                    className="flex items-center gap-1 px-3 py-1.5 min-h-[34px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    title="Open Schedules Dashboard"
                  >
                    <span>Dashboard</span>
                    <ExternalLink size={13} />
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
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">Tolerance</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingSchedules ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                          <RefreshCw size={20} className="animate-spin text-emerald-600 mx-auto mb-2" />
                          <span>Loading schedules...</span>
                        </td>
                      </tr>
                    ) : schedules.filter(sch =>
                      (sch.scheduleCode || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase()) ||
                      (sch.scheduleType || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase()) ||
                      (sch.notes || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-slate-500 bg-white">
                          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No Schedules Configured</p>
                          <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;Create Schedule&rdquo; to establish automated servicing routines</p>
                        </td>
                      </tr>
                    ) : (
                      schedules
                        .filter(sch =>
                          (sch.scheduleCode || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase()) ||
                          (sch.scheduleType || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase()) ||
                          (sch.notes || '').toLowerCase().includes(scheduleSearchQuery.toLowerCase())
                        )
                        .map((sch, idx) => (
                          <tr 
                            key={sch.id} 
                            onClick={() => handleOpenSchedule(sch)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 font-medium text-slate-500">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{sch.scheduleCode}</td>
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
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {sch.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                              {sch.startDate ? new Date(sch.startDate).toLocaleDateString() : 'Immediate'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium">±{sch.prePlanToleranceDays || 1} Days</td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{sch.triggerTime || '09:00'}</td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleOpenSchedule(sch)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Edit Schedule Maintenance"
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <p>This tab is currently under construction.</p>
            </div>
          )}
        </div>
      </div>
      </div>



      {/* Locations Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center gap-3">
              <button onClick={() => setIsLocationModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer">
                <ArrowLeft size={18} className="stroke-[2.5]" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 mr-auto">Locations</h2>
              
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="h-[38px] pl-9 pr-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 w-48"
                />
              </div>
              
              <button className="h-[38px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer">
                <Plus size={16} /> Add
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-12"><input type="checkbox" className="rounded border-slate-300 text-blue-600" disabled /></th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">No.</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Facility Name</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFacilities.map((facility, idx) => (
                    <tr key={facility.id} className="hover:bg-blue-50/40 cursor-pointer transition-colors" onClick={() => selectLocation(facility)}>
                      <td className="px-4 py-3.5"><input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={formData.locationId === facility.id.toString()} readOnly /></td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-700">Location</td>
                      <td className="px-4 py-3.5 text-sm text-slate-700">{facility.facilityName}</td>
                      <td className="px-4 py-3.5 text-sm font-mono text-slate-700">{facility.facilityCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Specification Field Modal */}
      {isSpecModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => setIsSpecModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer">
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <h2 className="text-lg font-bold text-slate-900">Add Specification Field</h2>
            </div>
            <div className="pl-8 mb-5">
              <p className="text-xs font-semibold text-slate-400">Asset: {formData.name || 'Machine'}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Field Title</label>
                <input 
                  type="text" 
                  value={specTitle}
                  onChange={(e) => setSpecTitle(e.target.value)}
                  placeholder="Enter Title"
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Field Input Type</label>
                <CustomSelect
                  name="fieldInputType"
                  value={specInputType}
                  onChange={(e: any) => setSpecInputType(e.target.value)}
                  placeholder="Select"
                  options={[
                    { label: 'Text', value: 'text' },
                    { label: 'Number', value: 'number' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Field Data</label>
                  <input 
                    type={specInputType === 'number' ? 'number' : 'text'}
                    value={specData}
                    onChange={(e) => setSpecData(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Field Unit</label>
                  <CustomSelect
                    name="fieldUnit"
                    value={specUnit}
                    onChange={(e: any) => setSpecUnit(e.target.value)}
                    placeholder="Select"
                    options={[
                      { label: 'kg', value: 'kg' },
                      { label: 'm', value: 'm' }
                    ]}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-200">
                <button 
                  onClick={() => setIsSpecModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSpecification}
                  disabled={savingSpec}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingSpec ? 'Saving...' : 'Save'}
                </button>
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
                  className="px-10 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-sm transition-colors shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 shadow-xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setIsAmcModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer">
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">Add {amcSubTab}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{amcSubTab} Type<span className="text-red-500">*</span></label>
                <CustomSelect
                  name="amcType"
                  value=""
                  onChange={() => {}}
                  placeholder="Select Type"
                  options={[]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Upload {amcSubTab} Contract</label>
                <input 
                  type="file"
                  className="block w-full text-xs text-slate-600 border border-slate-300 rounded-lg p-1.5 cursor-pointer focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Date<span className="text-red-500">*</span></label>
                <CustomDatePicker 
                  name="startDate"
                  value={null}
                  onChange={() => {}}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">End Date<span className="text-red-500">*</span></label>
                <CustomDatePicker 
                  name="endDate"
                  value={null}
                  onChange={() => {}}
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{amcSubTab} Usage Terms<span className="text-red-500">*</span></label>
                <CustomSelect
                  name="usageTerms"
                  value=""
                  onChange={() => {}}
                  placeholder={`${amcSubTab} Usage Terms`}
                  options={[]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{amcSubTab} Provider<span className="text-red-500">*</span></label>
                <CustomSelect
                  name={`${amcSubTab.toLowerCase()}Provider`}
                  value=""
                  onChange={() => {}}
                  placeholder={`Select Provider`}
                  options={[]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{amcSubTab} Contact Number<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter Number"
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4 pt-3 border-t border-slate-200">
                <button 
                  onClick={() => setIsAmcModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setIsAmcModalOpen(false)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 shadow-xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setIsPurchaseModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer">
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">Add {purchaseSubTab}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supplier Name<span className="text-red-500">*</span></label>
                <CustomSelect
                  name="supplierName"
                  value={purchaseForm.supplierName}
                  onChange={handleSupplierChange}
                  placeholder="Select"
                  options={supplierOptions}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Number<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={purchaseForm.contactNumber}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                  placeholder="Enter Number"
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email<span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  value={purchaseForm.email}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address</label>
                <textarea 
                  value={purchaseForm.address}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Address"
                  rows={2}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 placeholder-slate-400 resize-none h-[64px]"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Upload Purchase / Invoice</label>
                <input 
                  type="file"
                  onChange={handlePurchaseFileChange}
                  className="block w-full h-[64px] text-xs text-slate-600 border border-slate-300 rounded-lg p-2 cursor-pointer focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors"
                />
                {purchaseForm.fileName && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1 truncate">Selected: {purchaseForm.fileName}</p>
                )}
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4 pt-3 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSavePurchase}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload/Edit Modals */}
      {uploadModalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 sm:p-8 shadow-xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => { setUploadModalType(null); setEditingDoc(null); }} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">
                {editingDoc 
                  ? (uploadModalType === 'File' ? 'Edit File' : uploadModalType === 'Link' ? 'Edit Link' : 'Edit Note')
                  : (uploadModalType === 'File' ? 'Upload File' : uploadModalType === 'Link' ? 'Upload Link' : 'Upload Note')}
              </h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {uploadModalType === 'File' && 'File Name'}
                  {uploadModalType === 'Link' && 'Name'}
                  {uploadModalType === 'Note' && 'Name'}
                  <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Enter Name"
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 placeholder-slate-400"
                />
              </div>

              {uploadModalType === 'File' && (
                <div>
                  <div className="border border-slate-300 rounded-lg p-2 flex items-center mb-1.5">
                    <input 
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setDocFile(e.target.files[0]);
                        }
                      }}
                      className="block w-full text-xs text-slate-600 cursor-pointer focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors"
                    />
                  </div>
                  {(docFile || editingDoc?.content) && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1 truncate">
                      File: {docFile?.name || editingDoc?.name || editingDoc?.content}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">Note: Manuals, Warranties, Specifications (PDF, images, docs)</p>
                </div>
              )}

              {uploadModalType === 'Link' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">URL<span className="text-red-500">*</span></label>
                  <input 
                    type="url" 
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 placeholder-slate-400"
                  />
                </div>
              )}

              {uploadModalType === 'Note' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes<span className="text-red-500">*</span></label>
                  <textarea 
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Enter notes..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 placeholder-slate-400 resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => { setUploadModalType(null); setEditingDoc(null); }}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleUploadDocument}
                  disabled={uploadingDoc}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {uploadingDoc ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note / Document Viewer Modal */}
      {viewingDoc && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setViewingDoc(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-xl relative border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewingDoc.name}</h3>
                <span className="text-xs text-slate-500 font-medium">{viewingDoc.type}</span>
              </div>
              <button 
                onClick={() => setViewingDoc(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="py-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                {viewingDoc.content}
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button 
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add MAC ID Modal */}
      {isIotModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setIsIotModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer">
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">Add MAC ID</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  MAC ID<span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={tempMacId}
                  onChange={(e) => setTempMacId(e.target.value)}
                  placeholder="Enter MAC ID (e.g. 20260508012)"
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Select the machine type to link with this IoT device (e.g. Fire Panel, HYPN Booster).
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-200">
                <button 
                  onClick={() => setIsIotModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!tempMacId.trim()) {
                      toast.error('Please enter a MAC ID');
                      return;
                    }
                    try {
                      setSaving(true);
                      await api.put(`/machines/${id}`, {
                        name: formData.name,
                        deviceId: tempMacId.trim(),
                        machineType: tempMachineType,
                        company: formData.company,
                        maintenanceHead: formData.maintenanceHead,
                        machineCode: formData.machineCode,
                        serialNumber: formData.serialNumber,
                        make: formData.make,
                        modelNumber: formData.modelNumber,
                        machineCategory: tempMachineType || formData.machineCategory,
                        machineSubCategory: formData.machineSubCategory,
                        description: formData.description,
                        isLocationPart: formData.isLocationPart,
                        facilityId: (formData as any).locationType === 'facility' || (formData as any).locationType === 'mainFacility' ? (formData.locationId ? parseInt(formData.locationId) : undefined) : undefined,
                        buildingId: (formData as any).locationType === 'building' || (formData as any).locationType === 'society' ? (formData.locationId ? parseInt(formData.locationId) : undefined) : undefined,
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        costCenter: formData.costCenter?.trim() || 'CC-MAINT-01',
                        headOfDepartment: formData.headOfDepartment,
                        machineOwner: formData.machineOwner,
                        notes: formData.notes,
                      });
                      setFormData(prev => ({ 
                        ...prev, 
                        deviceId: tempMacId.trim(),
                        machineType: tempMachineType,
                        machineCategory: tempMachineType || prev.machineCategory,
                      }));
                      setIsIotModalOpen(false);
                      toast.success('MAC ID and Machine Type saved successfully!');
                    } catch (error: any) {
                      console.error('Error saving MAC ID:', error);
                      toast.error(error.response?.data?.message || 'Failed to save MAC ID.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Document?</h3>
            <p className="text-xs text-slate-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDocumentToDelete(null)}
                className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteDocument}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Specification Confirmation Modal */}
      {specToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Specification?</h3>
            <p className="text-xs text-slate-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setSpecToDelete(null)}
                className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteSpecification}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
              >
                Delete
              </button>
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWorkOrder}
                disabled={submittingWo}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submittingWo ? 'Creating...' : 'Create Work Order'}
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCheckpoint}
                disabled={submittingCheckpoint}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submittingCheckpoint ? 'Adding...' : 'Add Checkpoint'}
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSchedule}
                disabled={submittingSchedule}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submittingSchedule ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technician WO View Modal */}
      <TechnicianWOViewModal
        isOpen={showWOViewModal}
        onClose={() => setShowWOViewModal(false)}
        workOrder={selectedWOForView}
        onSuccess={fetchWorkOrders}
      />
    </div>
  );
}

function IOTTabContent({ 
  deviceId,
  deviceData,
  onAddSystem
}: { 
  deviceId: string, 
  deviceData: any,
  onAddSystem: () => void
}) {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="flex justify-between items-center w-full mb-6">
          <div>
            {deviceId && (
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">System MAC ID:</span>
                <span className="text-sm font-bold text-slate-900 tracking-wider font-mono">{deviceId}</span>
              </div>
            )}
          </div>
          <button 
            onClick={onAddSystem}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <Plus size={16} className="stroke-[2.5]" /> {deviceId ? 'Update System' : 'Add System'}
          </button>
        </div>

        {!deviceId ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 mt-2">
            <div className="w-14 h-14 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-3 text-blue-600 shadow-2xs">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No IoT System Configured</h3>
            <p className="text-xs text-slate-500 text-center max-w-sm">Connect an IoT edge device to start monitoring live machine telemetry and status updates.</p>
          </div>
        ) : (
          <div className="w-full h-[600px] overflow-y-auto mt-2 rounded-xl border border-slate-200">
            <BoosterDashboard 
              title={deviceData.name || 'Machine Dashboard'}
              panelId={deviceId}
              buildingName={deviceData.locationName || 'N/A'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
