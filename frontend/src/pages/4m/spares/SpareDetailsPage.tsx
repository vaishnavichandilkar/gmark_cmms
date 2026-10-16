import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, Printer, RotateCw, SlidersHorizontal, Plus, 
  Trash2, Search, QrCode, Save, ArrowLeft, Eye, X, FileText, ChevronDown, Calendar,
  Upload, Camera, Loader2, Image as ImageIcon, Pencil, Maximize2, Download, ZoomIn, ZoomOut
} from 'lucide-react';
import { api } from '../../../lib/api';
import { 
  spareService, type SparePart, type LocationStock, type MachineUsage, 
  type SpecificationField, type WarrantyItem, type SupplierItem, type SpareDocument, type SpareLogItem 
} from '../../../services/spareService';
import { supplierService } from '../../../services/supplierService';
import toast from 'react-hot-toast';

type TabType = 'General' | 'Stock' | 'Machines List' | 'Specification' | 'Warranties' | 'Suppliers' | 'Documents' | 'Log';

const SPARE_TABS: TabType[] = [
  'General',
  'Stock',
  'Machines List',
  'Specification',
  'Warranties',
  'Suppliers',
  'Documents',
  'Log'
];

interface LocationPickerItem {
  id: string;
  location: string;
  facilityName: string;
  code: string;
}

interface MachinePickerItem {
  id: string;
  location: string;
  machineName: string;
  code: string;
}

interface MeterUnitItem {
  id: string;
  symbol: string;
  name: string;
}

interface StockHistoryRecord {
  id: string;
  date: string;
  user: string;
  quantityBefore: number;
  quantityAfter: number;
}

export function SpareDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const returnUrl = (location.state as any)?.returnUrl;

  const tabs = SPARE_TABS;
  const [activeTab, setActiveTab] = useState<TabType>('General');
  const [loading, setLoading] = useState(false);
  const currentTabIndex = tabs.indexOf(activeTab);

  // Form State
  const [formData, setFormData] = useState<Partial<SparePart>>({
    partCode: '',
    partName: '',
    category: '',
    subCategory: '',
    stockQuantity: 0,
    inHandQuantity: '' as any,
    atSourceQuantity: '' as any,
    minimumQuantity: '' as any,
    totalStock: 0,
    unitCost: '' as any,
    rate: '' as any,
    location: '',
    description: '',
    headOfDepartment: '',
    notes: '',
    namePlateFile: '',
    stockLocations: [],
    machinesList: [],
    customSpecifications: [],
    warrantiesList: [],
    suppliersList: [],
    documentsList: [],
    logsList: []
  });

  // Modal / Add Form States for Stock
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [newStockLoc, setNewStockLoc] = useState({ location: '', inHandQuantity: '' as any, atSourceQuantity: '' as any, minimumQuantity: '' as any });
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // Stock Locations Selector Modal State
  const [isLocationPickerModalOpen, setIsLocationPickerModalOpen] = useState(false);
  const [locationPickerSearch, setLocationPickerSearch] = useState('');
  const [availableLocations, setAvailableLocations] = useState<LocationPickerItem[]>([]);

  // Stock History Modal State
  const [isStockHistoryModalOpen, setIsStockHistoryModalOpen] = useState(false);
  const [stockHistoryRecords] = useState<StockHistoryRecord[]>([]);

  useEffect(() => {
    // 1. Restore draft if returning from Add Machine or another sub-page
    const savedDraftStr = sessionStorage.getItem('spare_details_draft');
    if (savedDraftStr) {
      try {
        const draft = JSON.parse(savedDraftStr);
        if (draft.formData) {
          setFormData(prev => ({ ...prev, ...draft.formData }));
        }
        if (draft.activeTab) {
          setActiveTab(draft.activeTab);
        }
        if (draft.newMachineForm) {
          setNewMachineForm(draft.newMachineForm);
        }
      } catch (e) {
        console.error('Failed to restore spare details draft', e);
      }
      sessionStorage.removeItem('spare_details_draft');
    }

    const stateObj = location.state as any;
    if (stateObj?.tab) {
      setActiveTab(stateObj.tab as TabType);
    }

    if (stateObj?.supplierName) {
      setFormData(prev => {
        const alreadyHas = prev.suppliersList?.some(s => s.name?.toLowerCase() === stateObj.supplierName?.toLowerCase());
        if (alreadyHas) return prev;
        return {
          ...prev,
          suppliersList: [
            ...(prev.suppliersList || []),
            {
              id: stateObj.supplierId || Date.now(),
              name: stateObj.supplierName,
              businessCategory: stateObj.supplierCategory || 'Supplier',
              reorderDays: 7,
              vendorPrice: Number(prev.rate) || Number(prev.unitCost) || 500
            }
          ]
        };
      });
    }

    // 2. Handle returning with a newly created machine
    if (stateObj?.newMachine) {
      const machine = stateObj.newMachine;
      const mName = machine.name || machine.machineName || 'New Machine';
      const mLocation = machine.building || machine.facility?.facilityName || machine.location || machine.company || 'Main Facility';

      // Refresh available machines list so the new machine appears in the picker
      fetchMachines();

      // Automatically add to machinesList
      const newMachineObj: MachineUsage = {
        id: String(machine.id || Date.now()),
        location: mLocation,
        name: mName,
        quantityUsed: 1,
        rate: 0,
        total: 0
      };

      setFormData(prev => {
        const alreadyHas = (prev.machinesList || []).some(m => m.name?.toLowerCase() === mName.toLowerCase() || String(m.id) === String(machine.id));
        if (alreadyHas) return prev;
        return {
          ...prev,
          machinesList: [...(prev.machinesList || []), newMachineObj]
        };
      });

      setNewMachineForm({
        location: mLocation,
        name: mName,
        quantityUsed: 1,
        rate: 0
      });

      setActiveTab('Machines List');
      setIsMachinePickerModalOpen(false);
      setIsAddMachineModalOpen(false);

      toast.success(`Machine "${mName}" successfully added to spare!`);
    }
  }, [location.state]);

  // Machines List Tab Modals & State
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [newMachineForm, setNewMachineForm] = useState({ location: '', name: '', quantityUsed: 0, rate: 0 });
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [machineSearchQuery, setMachineSearchQuery] = useState('');

  const [isMachineLocationPickerOpen, setIsMachineLocationPickerOpen] = useState(false);
  const [machineLocationSearch, setMachineLocationSearch] = useState('');

  const [isMachinePickerModalOpen, setIsMachinePickerModalOpen] = useState(false);
  const [machinePickerSearch, setMachinePickerSearch] = useState('');
  const [availableMachinesList, setAvailableMachinesList] = useState<MachinePickerItem[]>([]);

  // Specifications Tab Modals & State (Images 1, 2, 3, 4)
  const [isAddSpecModalOpen, setIsAddSpecModalOpen] = useState(false);
  const [specForm, setSpecForm] = useState({ fieldTitle: '', inputType: '', fieldData: '', fieldUnit: '' });

  const [isMeterUnitsModalOpen, setIsMeterUnitsModalOpen] = useState(false);
  const [meterUnitsList, setMeterUnitsList] = useState<MeterUnitItem[]>([
    { id: '1', symbol: 'h', name: 'Hours' },
    { id: '2', symbol: 'ph', name: 'Production Hours' },
    { id: '3', symbol: 'rev', name: 'Revolutions' },
    { id: '4', symbol: 'V', name: 'Volts' },
    { id: '5', symbol: 'Bar', name: 'Bar' },
  ]);

  const [isAddMeterUnitModalOpen, setIsAddMeterUnitModalOpen] = useState(false);
  const [newMeterUnitForm, setNewMeterUnitForm] = useState({ name: '', symbol: '', precision: '2' });

  // Warranties Tab State
  const [isAddWarrantyModalOpen, setIsAddWarrantyModalOpen] = useState(false);
  const [newWarranty, setNewWarranty] = useState({ documentFile: '', startDate: '', expiryDate: '', usageTerms: '', provider: '', certificateNumber: '' });
  const [selectedWarrantyIds, setSelectedWarrantyIds] = useState<string[]>([]);
  const [warrantySearchQuery, setWarrantySearchQuery] = useState('');
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const expiryDateInputRef = useRef<HTMLInputElement>(null);

  const formatDateDisplay = (d?: string) => {
    if (!d) return '-';
    if (d.includes('-')) {
      const parts = d.split('-');
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return d;
  };

  // Suppliers Tab State
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', businessCategory: '', reorderDays: '' as any, vendorPrice: '' as any });
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');

  const [isSupplierPickerModalOpen, setIsSupplierPickerModalOpen] = useState(false);
  const [supplierPickerSearch, setSupplierPickerSearch] = useState('');
  const [availableSuppliersList, setAvailableSuppliersList] = useState<any[]>([]);

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  useEffect(() => {
    fetchMachines();
    fetchLocations();
    fetchSuppliers();
  }, []);

  const fetchMachines = async () => {
    try {
      const res = await api.get('/machines');
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      const mapped: MachinePickerItem[] = data.map((m: any) => ({
        id: String(m.id),
        location: m.building || m.facility?.facilityName || m.company || 'Main Facility',
        machineName: m.name || m.machineName || 'Unnamed Machine',
        code: m.machineCode || m.assetCode || `MCH${m.id}`,
      }));
      setAvailableMachinesList(mapped);
    } catch (err) {
      console.error('Failed to load machines for picker:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/facilities');
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      const mapped: LocationPickerItem[] = data.map((f: any) => ({
        id: String(f.id),
        location: f.facilityName || 'Location',
        facilityName: f.mainFacility?.mainFacilityName || f.facilityName || 'Facility',
        code: f.facilityCode || `FAC${f.id}`,
      }));
      setAvailableLocations(mapped);
    } catch (err) {
      console.error('Failed to load locations for picker:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await supplierService.getAll();
      if (Array.isArray(data)) {
        const mapped = data.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          category: s.businessCategory || 'Supplier',
          code: s.supplierCode || `SUP${s.id}`,
        }));
        setAvailableSuppliersList(mapped);
      }
    } catch (err) {
      console.error('Failed to load suppliers for picker:', err);
    }
  };

  useEffect(() => {
    if (id) {
      loadSpareDetails(Number(id));
    }
  }, [id]);

  const loadSpareDetails = async (spareId: number) => {
    setLoading(true);
    try {
      const data = await spareService.getById(spareId);
      if (data) {
        setFormData(data);
      }
    } catch (err) {
      toast.error('Failed to load spare details');
    } finally {
      setLoading(false);
    }
  };

  const resolveImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (url.includes(':3001/uploads/')) {
        return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):3001/, '');
      }
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setUploadingImage(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      // Immediately set local preview so the image renders without delay
      setLocalPreviewUrl(base64Data);

      try {
        const uploadData = new FormData();
        uploadData.append('files', file);

        const res = await api.post('/work-orders/upload-media', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.success && res.data?.files?.[0]?.fileUrl) {
          const serverUrl = res.data.files[0].fileUrl;
          setFormData(prev => ({
            ...prev,
            imageUrl: serverUrl,
            namePlateFile: serverUrl
          }));
          toast.success('Image uploaded successfully');
          setUploadingImage(false);
          return;
        }
      } catch (uploadErr) {
        console.warn('Backend image upload fallback to local data URL', uploadErr);
      }

      setFormData(prev => ({
        ...prev,
        imageUrl: base64Data,
        namePlateFile: base64Data
      }));
      toast.success('Image uploaded successfully');
      setUploadingImage(false);
    };

    reader.onerror = () => {
      toast.error('Failed to read image file');
      setUploadingImage(false);
    };

    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalPreviewUrl('');
    setFormData(prev => ({
      ...prev,
      imageUrl: '',
      namePlateFile: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Image removed');
  };

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);

  const openImageViewer = () => {
    setImageRotation(0);
    setImageZoom(1);
    setIsImageViewerOpen(true);
  };

  const handleSaveRotation = () => {
    if (imageRotation === 0) return;
    const currentImg = localPreviewUrl || formData.imageUrl || formData.namePlateFile;
    if (!currentImg) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (imageRotation === 90 || imageRotation === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((imageRotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedDataUrl = canvas.toDataURL('image/png');
      setLocalPreviewUrl(rotatedDataUrl);
      setFormData(prev => ({
        ...prev,
        imageUrl: rotatedDataUrl,
        namePlateFile: rotatedDataUrl
      }));
      setImageRotation(0);
      toast.success('Image orientation saved');
    };
    img.src = resolveImageUrl(currentImg);
  };

  const handleDownloadImage = () => {
    const currentImg = localPreviewUrl || formData.imageUrl || formData.namePlateFile;
    if (!currentImg) return;
    const src = resolveImageUrl(currentImg);
    const link = document.createElement('a');
    link.href = src;
    link.download = `${formData.partName || 'spare'}-image.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const handleChange = (field: keyof SparePart, value: any) => {
    // Enforce strictly non-negative numbers for all numeric fields while allowing empty string when typing/deleting
    if (['inHandQuantity', 'atSourceQuantity', 'stockQuantity', 'minimumQuantity', 'totalStock', 'unitCost', 'rate'].includes(field)) {
      if (value === '' || value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'number') {
        value = Math.max(0, value);
      } else if (typeof value === 'string') {
        const num = parseFloat(value);
        value = isNaN(num) ? '' : Math.max(0, num);
      }
    }
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      if (field === 'inHandQuantity' || field === 'atSourceQuantity') {
        const inHand = field === 'inHandQuantity' ? (value === '' ? 0 : Number(value) || 0) : (prev.inHandQuantity === '' ? 0 : Number(prev.inHandQuantity) || 0);
        const atSource = field === 'atSourceQuantity' ? (value === '' ? 0 : Number(value) || 0) : (prev.atSourceQuantity === '' ? 0 : Number(prev.atSourceQuantity) || 0);
        updated.stockQuantity = inHand + atSource;
        updated.totalStock = inHand + atSource;
      }
      return updated;
    });
  };

  const handleSave = async (stayOnPage = false): Promise<boolean> => {
    if (!formData.partName?.trim()) {
      toast.error('Please enter a Spare Name');
      return false;
    }

    setLoading(true);
    try {
      const payload: Partial<SparePart> = {
        ...formData,
        inHandQuantity: Number(formData.inHandQuantity) || 0,
        atSourceQuantity: Number(formData.atSourceQuantity) || 0,
        stockQuantity: (Number(formData.inHandQuantity) || 0) + (Number(formData.atSourceQuantity) || 0),
        totalStock: (Number(formData.inHandQuantity) || 0) + (Number(formData.atSourceQuantity) || 0),
        rate: Number(formData.rate) || 0,
        unitCost: Number(formData.unitCost) || Number(formData.rate) || 0,
      };

      if (isEditMode && id) {
        await spareService.update(Number(id), payload);
        toast.success('Spare Part updated successfully');
        if (!stayOnPage) {
          if (returnUrl) {
            navigate(returnUrl, { state: { tab: 'Spares', newSpareId: Number(id), newSpare: { ...payload, id: Number(id) } } });
          } else {
            navigate('/spares');
          }
        }
        return true;
      } else {
        const created = await spareService.create(payload);
        toast.success('New Spare Part created successfully');
        if (!stayOnPage) {
          if (returnUrl) {
            navigate(returnUrl, { state: { tab: 'Spares', newSpareId: created.id, newSpare: created } });
          } else {
            navigate('/spares');
          }
        } else {
          navigate(`/spares/edit/${created.id}`, { replace: true, state: location.state });
        }
        return true;
      }
    } catch (err) {
      toast.error('Failed to save spare part');
      return false;
    } finally {
      setLoading(false);
    }
  };


  const handleBack = () => {
    const curIdx = tabs.indexOf(activeTab);
    if (curIdx > 0) {
      setActiveTab(tabs[curIdx - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (returnUrl) {
        navigate(returnUrl, { state: { tab: 'Spares' } });
      } else {
        navigate('/spares');
      }
    }
  };

  // Stock Handlers
  const handleAddStockLocation = () => {
    if (!newStockLoc.location.trim()) {
      toast.error('Please select or enter a location');
      return;
    }
    const inHand = Number(newStockLoc.inHandQuantity) || 0;
    const atSource = Number(newStockLoc.atSourceQuantity) || 0;
    const minQty = Number(newStockLoc.minimumQuantity) || 0;
    const total = inHand + atSource;
    const newLocObj: LocationStock = {
      id: Date.now().toString(),
      location: newStockLoc.location,
      inHandQuantity: inHand,
      atSourceQuantity: atSource,
      minimumQuantity: minQty,
      totalStock: total
    };
    setFormData(prev => ({
      ...prev,
      stockLocations: [...(prev.stockLocations || []), newLocObj]
    }));
    setIsAddStockModalOpen(false);
    setNewStockLoc({ location: '', inHandQuantity: '' as any, atSourceQuantity: '' as any, minimumQuantity: '' as any });
    toast.success('Added location stock');
  };

  const handleDeleteSelectedStock = () => {
    if (selectedStockIds.length === 0) {
      toast.error('Select location stock to delete');
      return;
    }
    setFormData(prev => ({
      ...prev,
      stockLocations: (prev.stockLocations || []).filter(s => !selectedStockIds.includes(String(s.id)))
    }));
    setSelectedStockIds([]);
    toast.success('Deleted selected stock entries');
  };

  // Machine List Handlers
  const handleAddMachineSubmit = () => {
    if (!newMachineForm.name || newMachineForm.name === 'Select') {
      toast.error('Please select a machine');
      return;
    }
    const newMachineObj: MachineUsage = {
      id: Date.now().toString(),
      location: (!newMachineForm.location || newMachineForm.location === 'Select') ? 'Facility Name' : newMachineForm.location,
      name: newMachineForm.name,
      quantityUsed: Number(newMachineForm.quantityUsed) || 1,
      rate: Number(newMachineForm.rate) || 0,
      total: (Number(newMachineForm.quantityUsed) || 1) * (Number(newMachineForm.rate) || 0)
    };
    setFormData(prev => ({
      ...prev,
      machinesList: [...(prev.machinesList || []), newMachineObj]
    }));
    setIsAddMachineModalOpen(false);
    setNewMachineForm({ location: '', name: '', quantityUsed: 1, rate: 0 });
    toast.success('Added machine entry');
  };

  const handleDeleteSelectedMachines = () => {
    if (selectedMachineIds.length === 0) {
      toast.error('Select machine to delete');
      return;
    }
    setFormData(prev => ({
      ...prev,
      machinesList: (prev.machinesList || []).filter(m => !selectedMachineIds.includes(String(m.id)))
    }));
    setSelectedMachineIds([]);
    toast.success('Deleted selected machine entries');
  };

  const handleGoToAddMachine = () => {
    try {
      sessionStorage.setItem('spare_details_draft', JSON.stringify({
        formData,
        activeTab: 'Machines List',
        newMachineForm,
        returnUrl: location.pathname,
        parentReturnUrl: returnUrl,
      }));
    } catch (err) {
      console.error('Failed to save spare details draft:', err);
    }

    navigate('/machine-management/new', {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Machines List',
        fromSpare: true
      }
    });
  };

  // Specification Handlers
  const handleSaveSpecificationField = (addAnother: boolean = false) => {
    if (!specForm.fieldTitle.trim()) {
      toast.error('Please enter a field title');
      return;
    }
    const valText = specForm.fieldUnit !== 'Select' ? `${specForm.fieldData} ${specForm.fieldUnit}` : specForm.fieldData;
    const newSpecObj: SpecificationField = {
      id: Date.now().toString(),
      label: specForm.fieldTitle,
      value: valText || 'Field Data'
    };
    setFormData(prev => ({
      ...prev,
      customSpecifications: [...(prev.customSpecifications || []), newSpecObj]
    }));
    toast.success(`Added specification field "${specForm.fieldTitle}"`);
    if (addAnother) {
      setSpecForm({ fieldTitle: '', inputType: 'Select', fieldData: '', fieldUnit: 'Select' });
    } else {
      setIsAddSpecModalOpen(false);
      setSpecForm({ fieldTitle: '', inputType: 'Select', fieldData: '', fieldUnit: 'Select' });
    }
  };

  const handleUpdateSpecificationField = (id: string | number, label: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customSpecifications: (prev.customSpecifications || []).map(s => s.id === id ? { ...s, label, value } : s)
    }));
  };

  const handleDeleteSpecificationField = (id: string | number) => {
    setFormData(prev => ({
      ...prev,
      customSpecifications: (prev.customSpecifications || []).filter(s => s.id !== id)
    }));
    toast.success('Removed specification field');
  };

  const handleNamePlateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, namePlateFile: file.name }));
      toast.success(`Uploaded ${file.name}`);
    }
  };

  const handleSaveMeterUnit = () => {
    if (!newMeterUnitForm.name.trim() || !newMeterUnitForm.symbol.trim()) {
      toast.error('Please enter unit name and symbol');
      return;
    }
    const unitObj: MeterUnitItem = {
      id: Date.now().toString(),
      name: newMeterUnitForm.name,
      symbol: newMeterUnitForm.symbol
    };
    setMeterUnitsList(prev => [...prev, unitObj]);
    setIsAddMeterUnitModalOpen(false);
    toast.success(`Added unit ${unitObj.name}`);
  };

  // Warranty Handlers
  const handleAddWarranty = () => {
    const newWarrantyObj: WarrantyItem = {
      id: Date.now().toString(),
      startDate: newWarranty.startDate || 'dd-mm-yyyy',
      expiryDate: newWarranty.expiryDate || 'dd-mm-yyyy',
      provider: newWarranty.provider === 'Select' ? 'Manufacturer' : newWarranty.provider,
      usage: newWarranty.usageTerms === 'Select' ? 'Meter Reading' : newWarranty.usageTerms,
      certificateNumber: newWarranty.certificateNumber || 'C2451s5'
    };
    setFormData(prev => ({
      ...prev,
      warrantiesList: [...(prev.warrantiesList || []), newWarrantyObj]
    }));
    setIsAddWarrantyModalOpen(false);
    setNewWarranty({ documentFile: 'Filename.pdf', startDate: '', expiryDate: '', usageTerms: 'Select', provider: 'Select', certificateNumber: '' });
    toast.success('Added warranty record');
  };

  const handleDeleteSelectedWarranties = () => {
    if (selectedWarrantyIds.length === 0) {
      toast.error('Select warranty to delete');
      return;
    }
    setFormData(prev => ({
      ...prev,
      warrantiesList: (prev.warrantiesList || []).filter(w => !selectedWarrantyIds.includes(String(w.id)))
    }));
    setSelectedWarrantyIds([]);
    toast.success('Deleted selected warranty records');
  };

  // Supplier Handlers
  const handleAddSupplier = () => {
    if (newSupplier.name === 'Select' || !newSupplier.name.trim()) {
      toast.error('Please select a supplier name');
      return;
    }
    const newSupplierObj: SupplierItem = {
      id: Date.now().toString(),
      name: newSupplier.name,
      businessCategory: newSupplier.businessCategory === 'Select' ? 'Manufacturer' : newSupplier.businessCategory,
      reorderDays: Number(newSupplier.reorderDays) || 23,
      vendorPrice: Number(newSupplier.vendorPrice) || 1000
    };
    setFormData(prev => ({
      ...prev,
      suppliersList: [...(prev.suppliersList || []), newSupplierObj]
    }));
    setIsAddSupplierModalOpen(false);
    setNewSupplier({ name: 'Select', businessCategory: 'Select', reorderDays: '' as any, vendorPrice: '' as any });
    toast.success('Added business supplier');
  };

  const handleDeleteSelectedSuppliers = () => {
    if (selectedSupplierIds.length === 0) {
      toast.error('Select supplier to delete');
      return;
    }
    setFormData(prev => ({
      ...prev,
      suppliersList: (prev.suppliersList || []).filter(s => !selectedSupplierIds.includes(String(s.id)))
    }));
    setSelectedSupplierIds([]);
    toast.success('Deleted selected suppliers');
  };

  // Document Handlers
  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const docObj: SpareDocument = {
        id: Date.now().toString(),
        name: file.name,
        fileType: file.type || 'Document',
        uploadDate: new Date().toISOString().split('T')[0],
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      };
      setFormData(prev => ({
        ...prev,
        documentsList: [...(prev.documentsList || []), docObj]
      }));
      toast.success(`Attached ${file.name}`);
    }
  };

  const handleDeleteSelectedDocuments = () => {
    if (selectedDocumentIds.length === 0) {
      toast.error('Select document to delete');
      return;
    }
    setFormData(prev => ({
      ...prev,
      documentsList: (prev.documentsList || []).filter(d => !selectedDocumentIds.includes(String(d.id)))
    }));
    setSelectedDocumentIds([]);
    toast.success('Deleted selected documents');
  };


  const filteredStockLocations = (formData.stockLocations || []).filter(item =>
    item.location.toLowerCase().includes(stockSearchQuery.toLowerCase())
  );

  const filteredMachinesList = (formData.machinesList || []).filter(item =>
    item.name.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
    item.location.toLowerCase().includes(machineSearchQuery.toLowerCase())
  );

  const filteredWarrantiesList = (formData.warrantiesList || []).filter(item =>
    item.provider.toLowerCase().includes(warrantySearchQuery.toLowerCase()) ||
    item.certificateNumber.toLowerCase().includes(warrantySearchQuery.toLowerCase())
  );

  const filteredSuppliersList = (formData.suppliersList || []).filter(item =>
    item.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    item.businessCategory.toLowerCase().includes(supplierSearchQuery.toLowerCase())
  );

  const filteredAvailableLocations = availableLocations.filter(loc =>
    loc.location.toLowerCase().includes(locationPickerSearch.toLowerCase()) ||
    loc.facilityName.toLowerCase().includes(locationPickerSearch.toLowerCase()) ||
    loc.code.toLowerCase().includes(locationPickerSearch.toLowerCase())
  );

  const filteredMachineLocations = availableLocations.filter(loc =>
    loc.location.toLowerCase().includes(machineLocationSearch.toLowerCase()) ||
    loc.facilityName.toLowerCase().includes(machineLocationSearch.toLowerCase()) ||
    loc.code.toLowerCase().includes(machineLocationSearch.toLowerCase())
  );

  const filteredAvailableMachines = availableMachinesList.filter(m =>
    m.machineName.toLowerCase().includes(machinePickerSearch.toLowerCase()) ||
    m.location.toLowerCase().includes(machinePickerSearch.toLowerCase()) ||
    m.code.toLowerCase().includes(machinePickerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Side: Back Arrow + Spare Name Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => returnUrl ? navigate(returnUrl, { state: { tab: 'Spares' } }) : navigate('/spares')}
            className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            title="Back to Spares List"
          >
            <ChevronLeft size={24} strokeWidth={2.5} className="text-gray-900" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {formData.partName ? `${formData.partName}` : 'New Spare S1'}
          </h1>
        </div>

        {/* Right Side Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 h-[38px] px-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>

          <button
            onClick={() => id && loadSpareDetails(Number(id))}
            className="h-[38px] w-[38px] bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          <button
            className="h-[38px] w-[38px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Filter"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT SUMMARY PANEL */}
        <div className="w-full lg:w-64 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-5 shrink-0">
          
          {/* Spare Image Box with Stock Badge */}
          <div className="space-y-3">
            {(() => {
              const currentImage = localPreviewUrl || formData.imageUrl || formData.namePlateFile;
              const displayUrl = currentImage ? resolveImageUrl(currentImage) : null;

              return (
                <>
                  <div
                    onClick={() => {
                      if (uploadingImage) return;
                      if (displayUrl) {
                        openImageViewer();
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    className={`w-full aspect-square bg-gray-50 rounded-2xl border-2 border-dashed ${
                      displayUrl ? 'border-gray-200 hover:border-blue-500' : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50/20'
                    } flex flex-col items-center justify-center relative overflow-hidden group transition-all shadow-inner cursor-pointer`}
                    title={displayUrl ? "Click to view full image" : "Click to upload image"}
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center justify-center p-4 gap-2 text-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <span className="text-xs text-gray-600 font-bold">Uploading image...</span>
                      </div>
                    ) : displayUrl ? (
                      <>
                        <img
                          src={displayUrl}
                          alt={formData.partName || 'Spare Image'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (currentImage && !target.src.includes(':3001') && !target.src.startsWith('data:')) {
                              target.src = `http://localhost:3001${currentImage.startsWith('/') ? currentImage : `/${currentImage}`}`;
                            }
                          }}
                        />
                        {/* Hover Overlay with View / Edit / Remove actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 z-10 backdrop-blur-[2px]">
                          <span className="text-[11px] font-bold text-white/90 flex items-center gap-1 mb-1">
                            <Maximize2 className="w-3.5 h-3.5" /> Click to view
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openImageViewer();
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                              title="View full image"
                            >
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                              title="Edit / Replace image"
                            >
                              <Pencil className="w-3 h-3 text-sky-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
                              title="Remove image"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center select-none">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 border border-blue-100 group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-200 shadow-xs">
                          <Upload className="w-7 h-7 stroke-[2.2]" />
                        </div>
                        <span className="text-xs font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                          Click to upload image
                        </span>
                        <span className="text-[10px] text-gray-400 mt-1">
                          PNG, JPG, WEBP up to 10MB
                        </span>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Explicit View & Edit Action Buttons under the image */}
                  {displayUrl && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={openImageViewer}
                        className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-blue-200 transition-colors shadow-xs cursor-pointer"
                        title="View image full size"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-sky-200 transition-colors shadow-xs cursor-pointer"
                        title="Edit / Replace image"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs flex items-center justify-center border border-red-200 transition-colors shadow-xs cursor-pointer"
                        title="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Stock Badge - Fiix Blue status pill */}
            <div className="bg-blue-600 text-white py-2 px-4 rounded-xl font-bold text-center text-sm shadow-xs">
              Stock : {formData.stockQuantity ?? 20}
            </div>
          </div>

          {/* Key Summary Labels */}
          <div className="space-y-3 pt-2 text-sm border-t border-slate-100">
            <div>
              <div className="text-xs text-slate-400 font-semibold">Spare Name</div>
              <div className="font-bold text-slate-900">{formData.partName || 'New Spare S1'}</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 font-semibold">Spare Category</div>
              <div className="font-bold text-slate-900">{formData.category || 'Spare Category'}</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 font-semibold">Spare Sub-Category</div>
              <div className="font-bold text-slate-900">{formData.subCategory || 'Spare Sub-Category'}</div>
            </div>
          </div>

        </div>

        {/* RIGHT CONTENT AREA WITH MULTI-TABS */}
        <div className="flex-1 w-full bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[550px]">
          
          {/* HORIZONTAL TAB HEADERS */}
          <div className="flex items-center overflow-x-auto border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all rounded-lg cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT PANELS */}
          <div className="p-6 flex-1">
            
            {/* TAB 1: GENERAL */}
            {activeTab === 'General' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Spare Name</label>
                    <input
                      type="text"
                      placeholder="Spare Name"
                      value={formData.partName || ''}
                      onChange={(e) => handleChange('partName', e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <QrCode className="w-8 h-8 text-gray-700" />
                      <div className="text-xs">
                        <div className="font-bold text-gray-800">QR Code</div>
                        <div className="text-gray-400 font-mono text-[10px]">{formData.partCode}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">In Hand Quantity</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      onKeyDown={handleNumericKeyDown}
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.select();
                      }}
                      onClick={(e) => {
                        if (e.currentTarget.value === '0') e.currentTarget.select();
                      }}
                      value={formData.inHandQuantity !== undefined && formData.inHandQuantity !== null ? formData.inHandQuantity : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        handleChange('inHandQuantity', val);
                      }}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">At Source Quantity</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      onKeyDown={handleNumericKeyDown}
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.select();
                      }}
                      onClick={(e) => {
                        if (e.currentTarget.value === '0') e.currentTarget.select();
                      }}
                      value={formData.atSourceQuantity !== undefined && formData.atSourceQuantity !== null ? formData.atSourceQuantity : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        handleChange('atSourceQuantity', val);
                      }}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Spare Description</label>
                    <textarea
                      rows={3}
                      placeholder="Description"
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Spare Code</label>
                    <input
                      type="text"
                      placeholder="S32156"
                      value={formData.partCode || ''}
                      onChange={(e) => handleChange('partCode', e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Spare Category</label>
                    <select
                      value={formData.category || 'Select'}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    >
                      <option value="Select">Select</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Valves & Piping">Valves & Piping</option>
                      <option value="Seals & Gaskets">Seals & Gaskets</option>
                      <option value="Spare Category">Spare Category</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Spare Sub-Category</label>
                    <select
                      value={formData.subCategory || 'Select'}
                      onChange={(e) => handleChange('subCategory', e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    >
                      <option value="Select">Select</option>
                      <option value="Bearings">Bearings</option>
                      <option value="Valves">Valves</option>
                      <option value="Pumps">Pumps</option>
                      <option value="Spare Sub-Category">Spare Sub-Category</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Head of Department</label>
                    <select
                      value={formData.headOfDepartment || 'Select'}
                      onChange={(e) => handleChange('headOfDepartment', e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    >
                      <option value="Select">Select</option>
                      <option value="Mechanical Department">Mechanical Department</option>
                      <option value="Electrical Department">Electrical Department</option>
                      <option value="Plumbing Department">Plumbing Department</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      onKeyDown={handleNumericKeyDown}
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.select();
                      }}
                      onClick={(e) => {
                        if (e.currentTarget.value === '0') e.currentTarget.select();
                      }}
                      value={formData.rate !== undefined && formData.rate !== null ? formData.rate : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        handleChange('rate', val);
                      }}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Notes"
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 resize-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: STOCK */}
            {activeTab === 'Stock' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-base font-bold text-gray-900">Stock Per Locations</h3>

                  <div className="flex items-center gap-2">
                    <div className="relative w-48 sm:w-60">
                      <input
                        type="text"
                        placeholder="Search"
                        value={stockSearchQuery}
                        onChange={(e) => setStockSearchQuery(e.target.value)}
                        className="w-full pl-3 pr-8 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-600" />
                    </div>

                    <button
                      onClick={() => {
                        setNewStockLoc({ location: '', inHandQuantity: '' as any, atSourceQuantity: '' as any, minimumQuantity: '' as any });
                        setIsAddStockModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-sky-600" />
                      <span>Add</span>
                    </button>

                    <button
                      onClick={handleDeleteSelectedStock}
                      className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg flex items-center justify-center transition-colors"
                      title="Delete Selected Stock"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-sky-600" />
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredStockLocations.length > 0 && selectedStockIds.length === filteredStockLocations.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStockIds(filteredStockLocations.map(s => String(s.id)));
                              } else {
                                setSelectedStockIds([]);
                              }
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                          />
                        </th>
                        <th className="py-2.5 px-4 w-12">No.</th>
                        <th className="py-2.5 px-4">Location</th>
                        <th className="py-2.5 px-4">In Hand Quantity</th>
                        <th className="py-2.5 px-4">At Source Quantity</th>
                        <th className="py-2.5 px-4">Minimum Quantity</th>
                        <th className="py-2.5 px-4">Total Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {filteredStockLocations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400 font-medium">
                            No location stock entries found.
                          </td>
                        </tr>
                      ) : (
                        filteredStockLocations.map((item, idx) => {
                          const isSelected = selectedStockIds.includes(String(item.id));
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const strId = String(item.id);
                                    setSelectedStockIds(prev => 
                                      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                                />
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-4 font-medium text-gray-800">{item.location}</td>
                              <td className="py-3 px-4 font-bold text-gray-700">{item.inHandQuantity}</td>
                              <td className="py-3 px-4 text-gray-700">{item.atSourceQuantity}</td>
                              <td className="py-3 px-4 text-gray-700">{item.minimumQuantity}</td>
                              <td className="py-3 px-4 font-bold text-emerald-600">{item.totalStock}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: MACHINES LIST */}
            {activeTab === 'Machines List' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
                  <div className="relative w-48 sm:w-60">
                    <input
                      type="text"
                      placeholder="Search"
                      value={machineSearchQuery}
                      onChange={(e) => setMachineSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-8 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-600" />
                  </div>

                  <button
                    onClick={() => setIsAddMachineModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-600" />
                    <span>Add</span>
                  </button>

                  <button
                    onClick={handleDeleteSelectedMachines}
                    className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg flex items-center justify-center transition-colors"
                    title="Delete Selected Machine Entries"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-sky-600" />
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredMachinesList.length > 0 && selectedMachineIds.length === filteredMachinesList.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMachineIds(filteredMachinesList.map(m => String(m.id)));
                              } else {
                                setSelectedMachineIds([]);
                              }
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                          />
                        </th>
                        <th className="py-2.5 px-4 w-12">No.</th>
                        <th className="py-2.5 px-4">Location</th>
                        <th className="py-2.5 px-4">Name</th>
                        <th className="py-2.5 px-4">Quantity Used in M/C</th>
                        <th className="py-2.5 px-4">Rate</th>
                        <th className="py-2.5 px-4">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {filteredMachinesList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400 font-medium">
                            No machine entries added.
                          </td>
                        </tr>
                      ) : (
                        filteredMachinesList.map((item, idx) => {
                          const isSelected = selectedMachineIds.includes(String(item.id));
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const strId = String(item.id);
                                    setSelectedMachineIds(prev => 
                                      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                                />
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-4 font-medium text-gray-700">{item.location}</td>
                              <td className="py-3 px-4 font-medium text-gray-700">{item.name}</td>
                              <td className="py-3 px-4 text-gray-700">{item.quantityUsed}</td>
                              <td className="py-3 px-4 text-gray-700">₹ {item.rate.toLocaleString()}</td>
                              <td className="py-3 px-4 font-bold text-gray-800">₹ {item.total.toLocaleString()}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: SPECIFICATION (Matching Images 1, 2, 3, 4) */}
            {activeTab === 'Specification' && (
              <div className="space-y-6 max-w-xl">
                {/* Upload Name Plate */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-2">Upload Name Plate</label>
                  <div className="flex items-center gap-3 p-1.5 border border-gray-300 rounded-xl bg-white w-full">
                    <label className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0">
                      Upload File
                      <input type="file" onChange={handleNamePlateUpload} className="hidden" />
                    </label>

                    <span className="text-xs text-gray-700 font-medium truncate flex-1">
                      {formData.namePlateFile || 'Filename.pdf'}
                    </span>

                    {formData.namePlateFile && (
                      <button 
                        onClick={() => setFormData(prev => ({ ...prev, namePlateFile: '' }))}
                        className="p-1 text-gray-500 hover:text-gray-800 mr-1"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Additional Specification Fields Cards (Image 3) */}
                <div className="space-y-4 pt-2">
                  {(formData.customSpecifications || []).map((spec) => (
                    <div key={spec.id} className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-800">{spec.label || 'Field Title'}</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={spec.value}
                          onChange={(e) => handleUpdateSpecificationField(spec.id, spec.label, e.target.value)}
                          placeholder="Field Data"
                          className="flex-1 px-4 py-3 border border-gray-400 rounded-2xl bg-white text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button 
                          onClick={() => handleDeleteSpecificationField(spec.id)}
                          className="p-3 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-xl flex items-center justify-center transition-colors"
                          title="Delete Field"
                        >
                          <Trash2 className="w-4 h-4 text-sky-600" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Specification Field Button (Triggers Modal 1) */}
                  <button
                    onClick={() => {
                      setSpecForm({ fieldTitle: '', inputType: 'Select', fieldData: '', fieldUnit: 'Select' });
                      setIsAddSpecModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-xl text-xs transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-sky-600 stroke-[2.5]" />
                    <span>Add Specification Field</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: WARRANTIES */}
            {activeTab === 'Warranties' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
                  <div className="relative w-48 sm:w-60">
                    <input
                      type="text"
                      placeholder="Search"
                      value={warrantySearchQuery}
                      onChange={(e) => setWarrantySearchQuery(e.target.value)}
                      className="w-full pl-3 pr-8 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-600" />
                  </div>

                  <button
                    onClick={() => setIsAddWarrantyModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-600" />
                    <span>Add</span>
                  </button>

                  <button
                    onClick={handleDeleteSelectedWarranties}
                    className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg flex items-center justify-center transition-colors"
                    title="Delete Selected Warranties"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-sky-600" />
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredWarrantiesList.length > 0 && selectedWarrantyIds.length === filteredWarrantiesList.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWarrantyIds(filteredWarrantiesList.map(w => String(w.id)));
                              } else {
                                setSelectedWarrantyIds([]);
                              }
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                          />
                        </th>
                        <th className="py-2.5 px-4 w-12">No.</th>
                        <th className="py-2.5 px-4">Start Date</th>
                        <th className="py-2.5 px-4">Expiry Date</th>
                        <th className="py-2.5 px-4">Warranty Provider</th>
                        <th className="py-2.5 px-4">Warranty Usage</th>
                        <th className="py-2.5 px-4">Certificate Number</th>
                        <th className="py-2.5 px-4 w-16 text-center">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {filteredWarrantiesList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400 font-medium">
                            No warranty records found.
                          </td>
                        </tr>
                      ) : (
                        filteredWarrantiesList.map((item, idx) => {
                          const isSelected = selectedWarrantyIds.includes(String(item.id));
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const strId = String(item.id);
                                    setSelectedWarrantyIds(prev => 
                                      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                                />
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-4 font-medium text-gray-700">{formatDateDisplay(item.startDate)}</td>
                              <td className="py-3 px-4 font-medium text-gray-700">{formatDateDisplay(item.expiryDate)}</td>
                              <td className="py-3 px-4 font-medium text-gray-700">{item.provider}</td>
                              <td className="py-3 px-4 text-gray-700">{item.usage}</td>
                              <td className="py-3 px-4 font-mono text-gray-600">{item.certificateNumber}</td>
                              <td className="py-3 px-4 text-center">
                                <button className="p-1 rounded-full text-cyan-600 hover:bg-cyan-50 inline-flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-cyan-600" />
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

            {/* TAB 6: SUPPLIERS */}
            {activeTab === 'Suppliers' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
                  <div className="relative w-48 sm:w-60">
                    <input
                      type="text"
                      placeholder="Search"
                      value={supplierSearchQuery}
                      onChange={(e) => setSupplierSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-8 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-600" />
                  </div>

                  <button
                    onClick={() => navigate('/suppliers/new')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-600" />
                    <span>Add</span>
                  </button>

                  <button
                    onClick={handleDeleteSelectedSuppliers}
                    className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg flex items-center justify-center transition-colors"
                    title="Delete Selected Suppliers"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-sky-600" />
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredSuppliersList.length > 0 && selectedSupplierIds.length === filteredSuppliersList.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSupplierIds(filteredSuppliersList.map(s => String(s.id)));
                              } else {
                                setSelectedSupplierIds([]);
                              }
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                          />
                        </th>
                        <th className="py-2.5 px-4 w-12">No.</th>
                        <th className="py-2.5 px-4">Supplier Name</th>
                        <th className="py-2.5 px-4">Business Category</th>
                        <th className="py-2.5 px-4">No. of Days For Reorder Delivery</th>
                        <th className="py-2.5 px-4">Vendor Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {filteredSuppliersList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">
                            No supplier entries found. Click <button type="button" onClick={() => navigate('/suppliers/new')} className="text-blue-600 font-bold hover:underline cursor-pointer">"+ Add"</button> to create a new supplier.
                          </td>
                        </tr>
                      ) : (
                        filteredSuppliersList.map((item, idx) => {
                          const isSelected = selectedSupplierIds.includes(String(item.id));
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const strId = String(item.id);
                                    setSelectedSupplierIds(prev => 
                                      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                                />
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
                              <td className="py-3 px-4 text-gray-700">{item.businessCategory}</td>
                              <td className="py-3 px-4 text-gray-700">{item.reorderDays}</td>
                              <td className="py-3 px-4 font-bold text-gray-800">₹ {item.vendorPrice.toLocaleString()}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 7: DOCUMENTS */}
            {activeTab === 'Documents' && (
              <div className="space-y-5">
                <div className="flex items-center justify-end gap-2">
                  <label className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors cursor-pointer">
                    <Plus className="w-3.5 h-3.5 text-sky-600" />
                    <span>Add</span>
                    <input type="file" onChange={handleAddDocument} className="hidden" />
                  </label>

                  <button
                    onClick={handleDeleteSelectedDocuments}
                    className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg flex items-center justify-center transition-colors"
                    title="Delete Selected Documents"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-sky-600" />
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={(formData.documentsList || []).length > 0 && selectedDocumentIds.length === (formData.documentsList || []).length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocumentIds((formData.documentsList || []).map(d => String(d.id)));
                              } else {
                                setSelectedDocumentIds([]);
                              }
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                          />
                        </th>
                        <th className="py-2.5 px-4 w-12">No.</th>
                        <th className="py-2.5 px-4">Document Name</th>
                        <th className="py-2.5 px-4">File Type</th>
                        <th className="py-2.5 px-4">Upload Date</th>
                        <th className="py-2.5 px-4">File Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {(formData.documentsList || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-gray-400 font-medium">
                            No documents uploaded yet. Click <strong className="text-sky-600">+ Add</strong> to attach files.
                          </td>
                        </tr>
                      ) : (
                        (formData.documentsList || []).map((item, idx) => {
                          const isSelected = selectedDocumentIds.includes(String(item.id));
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const strId = String(item.id);
                                    setSelectedDocumentIds(prev => 
                                      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                                />
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-4 font-semibold text-gray-800">{item.name}</td>
                              <td className="py-3 px-4 text-gray-600">{item.fileType}</td>
                              <td className="py-3 px-4 text-gray-600">{item.uploadDate}</td>
                              <td className="py-3 px-4 text-gray-600">{item.size}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 8: LOG */}
            {activeTab === 'Log' && (
              <div className="space-y-5">
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={(formData.logsList || []).length > 0 && selectedLogIds.length === (formData.logsList || []).length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLogIds((formData.logsList || []).map(l => String(l.id)));
                              } else {
                                setSelectedLogIds([]);
                              }
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                          />
                        </th>
                        <th className="py-2.5 px-4 w-12">No.</th>
                        <th className="py-2.5 px-4">Machine Name</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">User</th>
                        <th className="py-2.5 px-4">Qty Amount</th>
                        <th className="py-2.5 px-4">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {(formData.logsList || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                            No log activity records found.
                          </td>
                        </tr>
                      ) : (
                        (formData.logsList || []).map((item, idx) => {
                          const isSelected = selectedLogIds.includes(String(item.id));
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const strId = String(item.id);
                                    setSelectedLogIds(prev => 
                                      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                                />
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-4 font-semibold text-gray-800">{item.machineName || 'Machine Name'}</td>
                              <td className="py-3 px-4 text-gray-600">{item.date}</td>
                              <td className="py-3 px-4 text-gray-600">{item.user}</td>
                              <td className="py-3 px-4 text-gray-700 font-medium">{item.qtyAmount}</td>
                              <td className="py-3 px-4 font-semibold text-gray-800">₹ {item.rate.toLocaleString()}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* BOTTOM NAVIGATION / ACTION BAR (Same as Machine Management) */}
          <div className="flex justify-between items-center w-full px-6 py-4 border-t border-gray-200 bg-gray-50/60 mt-auto">
            <button
              type="button"
              onClick={handleBack}
              className="px-8 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm transition-colors shadow-sm cursor-pointer"
            >
              Back
            </button>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={loading}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Saving...' : 'Save Spare'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADD SPECIFICATION FIELD MODAL (Matching Image 1 "New Spares 12") */}
      {isAddSpecModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsAddSpecModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add Specification Field</h2>
            </div>

            {/* Asset Subheader */}
            <div className="text-xs font-semibold text-gray-500">
              Asset : {formData.partName ? `${formData.partName.replace('S1', 'F1')}` : 'Spare Name F1'}
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* Field Title */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Field Title</label>
                <input
                  type="text"
                  placeholder="eg. Voltage"
                  value={specForm.fieldTitle}
                  onChange={(e) => setSpecForm(prev => ({ ...prev, fieldTitle: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                />
              </div>

              {/* Field Input Type */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Field Input Type</label>
                <select
                  value={specForm.inputType}
                  onChange={(e) => setSpecForm(prev => ({ ...prev, inputType: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                >
                  <option value="Select">Select</option>
                  <option value="Text">Text</option>
                  <option value="Number">Number</option>
                  <option value="Dropdown">Dropdown</option>
                  <option value="Unit">Unit</option>
                </select>
              </div>

              {/* Field Data & Field Unit Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Field Data</label>
                  <input
                    type="text"
                    placeholder="eg. 120"
                    value={specForm.fieldData}
                    onChange={(e) => setSpecForm(prev => ({ ...prev, fieldData: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Field Unit</label>
                  <div 
                    onClick={() => setIsMeterUnitsModalOpen(true)}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors"
                  >
                    <span className={specForm.fieldUnit !== 'Select' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                      {specForm.fieldUnit}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => handleSaveSpecificationField(false)}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
              >
                Save
              </button>

              <button
                onClick={() => handleSaveSpecificationField(true)}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
              >
                Save & Add Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* METER READING UNITS MODAL (Matching Image 2 "New Spares 16") */}
      {isMeterUnitsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMeterUnitsModalOpen(false)} 
                  className="text-gray-900 hover:text-emerald-700 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Meter Reading Units</h2>
              </div>

              <button
                onClick={() => setIsAddMeterUnitModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-sky-600" />
                <span>Add</span>
              </button>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-4 w-10 text-center">
                      <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
                    </th>
                    <th className="py-2.5 px-4 w-12">No.</th>
                    <th className="py-2.5 px-4">Symbol</th>
                    <th className="py-2.5 px-4">Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {meterUnitsList.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      onClick={() => {
                        setSpecForm(prev => ({ ...prev, fieldUnit: item.symbol }));
                        setIsMeterUnitsModalOpen(false);
                      }}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" />
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-800">{item.symbol}</td>
                      <td className="py-3 px-4 font-medium text-gray-600">{item.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD METER READING UNIT MODAL (Matching Image 4 "Add Units / Add Meter Reading Unit") */}
      {isAddMeterUnitModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsAddMeterUnitModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add Meter Reading Unit</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Name</label>
                <input
                  type="text"
                  placeholder="Hours"
                  value={newMeterUnitForm.name}
                  onChange={(e) => setNewMeterUnitForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Symbol</label>
                <input
                  type="text"
                  placeholder="h"
                  value={newMeterUnitForm.symbol}
                  onChange={(e) => setNewMeterUnitForm(prev => ({ ...prev, symbol: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Precision</label>
                <select
                  value={newMeterUnitForm.precision}
                  onChange={(e) => setNewMeterUnitForm(prev => ({ ...prev, precision: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleSaveMeterUnit}
                className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOCK ENTRY MODAL */}
      {isAddStockModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsAddStockModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock</h2>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-500">Asset : {formData.partName || 'Spare Name S1'}</span>
              <button 
                onClick={() => setIsStockHistoryModalOpen(true)}
                className="text-sky-600 hover:text-sky-800 hover:underline font-bold"
              >
                Stock History
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Location</label>
                <div 
                  onClick={() => {
                    fetchLocations();
                    setIsLocationPickerModalOpen(true);
                  }}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <span className={newStockLoc.location ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {newStockLoc.location || 'Location'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Quantity On Hand</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    onKeyDown={handleNumericKeyDown}
                    onFocus={(e) => {
                      if (e.target.value === '0') e.target.select();
                    }}
                    onClick={(e) => {
                      if (e.currentTarget.value === '0') e.currentTarget.select();
                    }}
                    value={newStockLoc.inHandQuantity !== undefined && newStockLoc.inHandQuantity !== null ? newStockLoc.inHandQuantity : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                      setNewStockLoc(prev => ({ ...prev, inHandQuantity: val as any }));
                    }}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">At Source Quantity</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    onKeyDown={handleNumericKeyDown}
                    onFocus={(e) => {
                      if (e.target.value === '0') e.target.select();
                    }}
                    onClick={(e) => {
                      if (e.currentTarget.value === '0') e.currentTarget.select();
                    }}
                    value={newStockLoc.atSourceQuantity !== undefined && newStockLoc.atSourceQuantity !== null ? newStockLoc.atSourceQuantity : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                      setNewStockLoc(prev => ({ ...prev, atSourceQuantity: val as any }));
                    }}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Minimum Quantity</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  onKeyDown={handleNumericKeyDown}
                  onFocus={(e) => {
                    if (e.target.value === '0') e.target.select();
                  }}
                  onClick={(e) => {
                    if (e.currentTarget.value === '0') e.currentTarget.select();
                  }}
                  value={newStockLoc.minimumQuantity !== undefined && newStockLoc.minimumQuantity !== null ? newStockLoc.minimumQuantity : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                    setNewStockLoc(prev => ({ ...prev, minimumQuantity: val as any }));
                  }}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleAddStockLocation}
                className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCATIONS SELECTOR MODAL (STOCK TAB) */}
      {isLocationPickerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsLocationPickerModalOpen(false)} 
                  className="text-gray-900 hover:text-emerald-700 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Locations</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <input
                    type="text"
                    placeholder="Search"
                    value={locationPickerSearch}
                    onChange={(e) => setLocationPickerSearch(e.target.value)}
                    className="w-full pl-3 pr-7 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-cyan-600" />
                </div>

                <button
                  onClick={() => {
                    const newLocName = `Location ${availableLocations.length + 1}`;
                    setAvailableLocations(prev => [...prev, { id: Date.now().toString(), location: newLocName, facilityName: 'Facility Name', code: 'C1354' }]);
                    toast.success('Added new location');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-600" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-4 w-10 text-center">
                      <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
                    </th>
                    <th className="py-2.5 px-4 w-12">No.</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Facility Name</th>
                    <th className="py-2.5 px-4">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {filteredAvailableLocations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                        No locations found.
                      </td>
                    </tr>
                  ) : (
                    filteredAvailableLocations.map((item, idx) => (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setNewStockLoc(prev => ({ ...prev, location: item.location }));
                          setIsLocationPickerModalOpen(false);
                        }}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" />
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{item.location}</td>
                        <td className="py-3 px-4 text-gray-600">{item.facilityName}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{item.code}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STOCK HISTORY MODAL */}
      {isStockHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <button 
                onClick={() => setIsStockHistoryModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock History</h2>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-4 w-12">No.</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4 text-center">Quantity Before</th>
                    <th className="py-2.5 px-4 text-center">Quantity After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {stockHistoryRecords.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-gray-700">{item.date}</td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{item.user}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{item.quantityBefore}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">{item.quantityAfter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD MACHINE MODAL */}
      {isAddMachineModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsAddMachineModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add Machine</h2>
            </div>

            <div className="text-xs font-semibold text-gray-500">
              Asset : {formData.partName || 'Spare Name S1'}
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Location</label>
                <div 
                  onClick={() => {
                    fetchLocations();
                    setIsMachineLocationPickerOpen(true);
                  }}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <span className={newMachineForm.location && newMachineForm.location !== 'Select' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {newMachineForm.location && newMachineForm.location !== 'Select' ? newMachineForm.location : 'Select Location'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Machine</label>
                <div 
                  onClick={() => {
                    fetchMachines();
                    setIsMachinePickerModalOpen(true);
                  }}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <span className={newMachineForm.name && newMachineForm.name !== 'Select' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {newMachineForm.name && newMachineForm.name !== 'Select' ? newMachineForm.name : 'Select Machine'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleAddMachineSubmit}
                className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCATION PICKER MODAL FOR ADD MACHINE */}
      {isMachineLocationPickerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMachineLocationPickerOpen(false)} 
                  className="text-gray-900 hover:text-emerald-700 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Locations</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <input
                    type="text"
                    placeholder="Search"
                    value={machineLocationSearch}
                    onChange={(e) => setMachineLocationSearch(e.target.value)}
                    className="w-full pl-3 pr-7 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-cyan-600" />
                </div>

                <button
                  onClick={() => {
                    const newLocName = `Location ${availableLocations.length + 1}`;
                    setAvailableLocations(prev => [...prev, { id: Date.now().toString(), location: newLocName, facilityName: 'Facility Name', code: 'C1354' }]);
                    toast.success('Added location');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-600" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-4 w-10 text-center">
                      <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
                    </th>
                    <th className="py-2.5 px-4 w-12">No.</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Facility Name</th>
                    <th className="py-2.5 px-4">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {filteredMachineLocations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                        No locations found.
                      </td>
                    </tr>
                  ) : (
                    filteredMachineLocations.map((item, idx) => (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setNewMachineForm(prev => ({ ...prev, location: item.location }));
                          setIsMachineLocationPickerOpen(false);
                        }}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" />
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{item.location}</td>
                        <td className="py-3 px-4 text-gray-600">{item.facilityName}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{item.code}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MACHINES SELECTOR MODAL FOR ADD MACHINE */}
      {isMachinePickerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMachinePickerModalOpen(false)} 
                  className="text-gray-900 hover:text-emerald-700 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Machines</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <input
                    type="text"
                    placeholder="Search"
                    value={machinePickerSearch}
                    onChange={(e) => setMachinePickerSearch(e.target.value)}
                    className="w-full pl-3 pr-7 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-cyan-600" />
                </div>

                <button
                  onClick={handleGoToAddMachine}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-600" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-4 w-10 text-center">
                      <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
                    </th>
                    <th className="py-2.5 px-4 w-12">No.</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Machine Name</th>
                    <th className="py-2.5 px-4">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {filteredAvailableMachines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                        No machines found.
                      </td>
                    </tr>
                  ) : (
                    filteredAvailableMachines.map((item, idx) => (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setNewMachineForm(prev => ({ ...prev, name: item.machineName, location: item.location }));
                          setIsMachinePickerModalOpen(false);
                        }}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" />
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-4 text-gray-600">{item.location}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{item.machineName}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{item.code}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD WARRANTY MODAL (Matching Image 1 "New Spares 38" & Image 2 "Warranty Provider") */}
      {isAddWarrantyModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 space-y-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsAddWarrantyModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add Warranty</h2>
            </div>

            {/* Asset Subheader */}
            <div className="text-xs font-semibold text-gray-500">
              Asset : {formData.partName || 'Spare Name S1'}
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* Upload Document */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Upload Document</label>
                <div className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white flex items-center justify-between">
                  <label className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0">
                    Upload File
                    <input 
                      type="file" 
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setNewWarranty(prev => ({ ...prev, documentFile: f.name }));
                      }} 
                      className="hidden" 
                    />
                  </label>

                  <span className="text-xs text-gray-700 font-medium truncate flex-1 px-3">
                    {newWarranty.documentFile || 'Filename.pdf'}
                  </span>

                  {newWarranty.documentFile && (
                    <button 
                      onClick={() => setNewWarranty(prev => ({ ...prev, documentFile: '' }))}
                      className="p-1 text-gray-500 hover:text-gray-800"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 1: Start Date, Expiry Date, Warranty Usage Terms */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Start Date</label>
                  <div className="relative">
                    <input
                      ref={startDateInputRef}
                      type="date"
                      value={newWarranty.startDate}
                      onChange={(e) => setNewWarranty(prev => ({ ...prev, startDate: e.target.value }))}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      className="w-full pl-4 pr-10 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium bg-white cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          startDateInputRef.current?.showPicker?.();
                        } catch {
                          startDateInputRef.current?.focus();
                        }
                      }}
                      className="p-1 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
                      title="Open calendar"
                    >
                      <Calendar className="w-4 h-4 pointer-events-none" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Expiry Date</label>
                  <div className="relative">
                    <input
                      ref={expiryDateInputRef}
                      type="date"
                      value={newWarranty.expiryDate}
                      onChange={(e) => setNewWarranty(prev => ({ ...prev, expiryDate: e.target.value }))}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      className="w-full pl-4 pr-10 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium bg-white cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          expiryDateInputRef.current?.showPicker?.();
                        } catch {
                          expiryDateInputRef.current?.focus();
                        }
                      }}
                      className="p-1 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
                      title="Open calendar"
                    >
                      <Calendar className="w-4 h-4 pointer-events-none" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Warranty Usage Terms</label>
                  <select
                    value={newWarranty.usageTerms}
                    onChange={(e) => setNewWarranty(prev => ({ ...prev, usageTerms: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                  >
                    <option value="Select">Select</option>
                    <option value="Meter Reading">Meter Reading</option>
                    <option value="Time Period">Time Period</option>
                    <option value="Cycle Based">Cycle Based</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Warranty Provider, Certificate/Document Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Warranty Provider</label>
                  <select
                    value={newWarranty.provider}
                    onChange={(e) => setNewWarranty(prev => ({ ...prev, provider: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                  >
                    <option value="Select">Select</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Service Provider">Service Provider</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Certificate/Document Number</label>
                  <input
                    type="text"
                    placeholder="Select"
                    value={newWarranty.certificateNumber}
                    onChange={(e) => setNewWarranty(prev => ({ ...prev, certificateNumber: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleAddWarranty}
                className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BUSINESS (SUPPLIER) MODAL (Matching Image 1 "New Spares 39" & Image 2 "Business Category") */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsAddSupplierModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add Business</h2>
            </div>

            {/* Asset Subheader */}
            <div className="text-xs font-semibold text-gray-500">
              Asset : {formData.partName ? `${formData.partName.replace('S1', 'F1')}` : 'Facility Name F1'}
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* Supplier Name (Picker Trigger) */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Supplier Name</label>
                <div 
                  onClick={() => {
                    fetchSuppliers();
                    setIsSupplierPickerModalOpen(true);
                  }}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <span className={newSupplier.name !== 'Select' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {newSupplier.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </div>
              </div>

              {/* Business Category */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Business Category</label>
                <select
                  value={newSupplier.businessCategory}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, businessCategory: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                >
                  <option value="Select">Select</option>
                  <option value="Supplier">Supplier</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Service Provider">Service Provider</option>
                </select>
              </div>

              {/* No. of Days For Reorder Delivery */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">No. of Days For Reorder Delivery</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  onKeyDown={handleNumericKeyDown}
                  onFocus={(e) => {
                    if (e.target.value === '0') e.target.select();
                  }}
                  onClick={(e) => {
                    if (e.currentTarget.value === '0') e.currentTarget.select();
                  }}
                  value={newSupplier.reorderDays !== undefined && newSupplier.reorderDays !== null ? newSupplier.reorderDays : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                    setNewSupplier(prev => ({ ...prev, reorderDays: val as any }));
                  }}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleAddSupplier}
                className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIERS SELECTOR MODAL (Matching Image 3 "New Spares 40") */}
      {isSupplierPickerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSupplierPickerModalOpen(false)} 
                  className="text-gray-900 hover:text-emerald-700 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <input
                    type="text"
                    placeholder="Search"
                    value={supplierPickerSearch}
                    onChange={(e) => setSupplierPickerSearch(e.target.value)}
                    className="w-full pl-3 pr-7 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-cyan-600" />
                </div>

                <button
                  onClick={() => {
                    const newName = `Supplier Name ${availableSuppliersList.length + 1}`;
                    setAvailableSuppliersList(prev => [...prev, { id: Date.now().toString(), name: newName, category: 'Manufacturer', code: 'C1354' }]);
                    toast.success('Added supplier option');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold rounded-lg text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-600" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#dedede]/70 text-gray-700 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-4 w-10 text-center">
                      <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
                    </th>
                    <th className="py-2.5 px-4 w-12">No.</th>
                    <th className="py-2.5 px-4">Supplier Name</th>
                    <th className="py-2.5 px-4">Business Category</th>
                    <th className="py-2.5 px-4">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {(() => {
                    const filteredSuppliers = availableSuppliersList.filter(s =>
                      (s.name || '').toLowerCase().includes(supplierPickerSearch.toLowerCase()) ||
                      (s.category || '').toLowerCase().includes(supplierPickerSearch.toLowerCase()) ||
                      (s.code || '').toLowerCase().includes(supplierPickerSearch.toLowerCase())
                    );
                    if (filteredSuppliers.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                            No suppliers found.
                          </td>
                        </tr>
                      );
                    }
                    return filteredSuppliers.map((item, idx) => (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setNewSupplier(prev => ({ ...prev, name: item.name, businessCategory: item.category }));
                          setIsSupplierPickerModalOpen(false);
                        }}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" />
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{item.name}</td>
                        <td className="py-3 px-4 text-gray-600">{item.category}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{item.code}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE VIEWER / EDIT MODAL */}
      {isImageViewerOpen && (localPreviewUrl || formData.imageUrl || formData.namePlateFile) && (() => {
        const modalImg = localPreviewUrl || formData.imageUrl || formData.namePlateFile;
        const modalDisplayUrl = modalImg ? resolveImageUrl(modalImg) : '';

        return (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setIsImageViewerOpen(false)}
          >
            <div 
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {formData.partName ? `${formData.partName} - Image Preview` : 'Spare Image Preview'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      High-resolution preview & orientation controls
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsImageViewerOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Image Area */}
              <div className="flex-1 bg-gray-950 p-6 flex items-center justify-center overflow-hidden min-h-[360px] relative select-none">
                <div 
                  className="transition-transform duration-200 flex items-center justify-center"
                  style={{
                    transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                  }}
                >
                  <img
                    src={modalDisplayUrl}
                    alt={formData.partName || 'Spare Image'}
                    className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-2xl"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (modalImg && !target.src.includes(':3001') && !target.src.startsWith('data:')) {
                        target.src = `http://localhost:3001${modalImg.startsWith('/') ? modalImg : `/${modalImg}`}`;
                      }
                    }}
                  />
                </div>

                {/* Floating Zoom / Rotation Indicator */}
                {(imageRotation !== 0 || imageZoom !== 1) && (
                  <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-mono backdrop-blur-xs flex items-center gap-2">
                    <span>Zoom: {Math.round(imageZoom * 100)}%</span>
                    <span>•</span>
                    <span>Rotate: {imageRotation}°</span>
                  </div>
                )}
              </div>

              {/* Modal Footer / Toolbars */}
              <div className="px-6 py-4 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                {/* Zoom & Rotation controls */}
                <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setImageZoom(prev => Math.min(prev + 0.25, 3))}
                    className="p-1.5 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageZoom(prev => Math.max(prev - 0.25, 0.5))}
                    className="p-1.5 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageRotation(prev => (prev + 90) % 360)}
                    className="p-1.5 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span className="text-xs">Rotate</span>
                  </button>
                  {(imageRotation !== 0 || imageZoom !== 1) && (
                    <button
                      type="button"
                      onClick={() => { setImageRotation(0); setImageZoom(1); }}
                      className="px-2 py-1 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {imageRotation !== 0 && (
                    <button
                      type="button"
                      onClick={handleSaveRotation}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Apply Rotation</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Download Image"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                    title="Replace / Choose another image"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Change Image</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
