import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, Printer, RotateCw, SlidersHorizontal, Plus, 
  Trash2, Search, QrCode, Save, ArrowLeft, Eye, X, ChevronDown, Calendar,
  Upload, Loader2, Image as ImageIcon, Pencil, Maximize2, Download, ZoomIn, ZoomOut,
  ExternalLink
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasSpareTabPermission } from '../../../utils/permissions';
import { api, API_BASE_URL } from '../../../lib/api';
import { 
  spareService, type SparePart, type LocationStock, type MachineUsage, 
  type SpecificationField, type WarrantyItem, type SupplierItem, type SpareDocument 
} from '../../../services/spareService';
import { supplierService } from '../../../services/supplierService';
import { machineSpareSync } from '../../../utils/machineSpareSync';
import { CustomDatePicker } from '../../../components/shared/CustomDatePicker';
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
  const returnTab = (location.state as any)?.returnTab || 'Spares';

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const permittedTabs = SPARE_TABS.filter(tab => hasSpareTabPermission(currentUser, tab, 'view'));
  const tabs = permittedTabs.length > 0 ? permittedTabs : SPARE_TABS;
  const [activeTab, setActiveTab] = useState<TabType>(tabs[0] || 'General');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);

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
    // 1. Restore draft if returning from Add Machine, Add Supplier or another sub-page
    let targetTab: TabType = 'General';
    const savedDraftStr = sessionStorage.getItem('spare_details_draft');
    if (savedDraftStr) {
      try {
        const draft = JSON.parse(savedDraftStr);
        if (draft.formData) {
          setFormData(prev => ({ ...prev, ...draft.formData }));
        }
        if (draft.activeTab && SPARE_TABS.includes(draft.activeTab)) {
          targetTab = draft.activeTab;
        }
        if (draft.newMachineForm) {
          setNewMachineForm(draft.newMachineForm);
        }
        if (draft.newSupplier) {
          setNewSupplier(draft.newSupplier);
        }
      } catch (e) {
        console.error('Failed to restore spare details draft', e);
      }
      sessionStorage.removeItem('spare_details_draft');
    }

    const stateObj = location.state as any;
    if (stateObj?.spareTab && SPARE_TABS.includes(stateObj.spareTab)) {
      targetTab = stateObj.spareTab as TabType;
    } else if (stateObj?.tab && SPARE_TABS.includes(stateObj.tab)) {
      targetTab = stateObj.tab as TabType;
    }
    if (tabs.includes(targetTab)) {
      setActiveTab(targetTab);
    } else if (tabs.length > 0) {
      setActiveTab(tabs[0]);
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

      machineSpareSync.onMachineAddedToSpare(
        { id: id ? Number(id) : formData.id, partName: formData.partName || '', partCode: formData.partCode, category: formData.category, location: formData.location, rate: formData.rate, unitCost: formData.unitCost },
        newMachineObj
      );

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

    // 3. Handle returning with a newly created supplier
    if (stateObj?.newSupplier) {
      const supplier = stateObj.newSupplier;
      const sName = supplier.name || supplier.supplierName || 'New Supplier';
      const sCategory = supplier.businessCategory || supplier.categoriesList?.[0] || 'Supplier';

      fetchSuppliers();

      const newSupplierObj: SupplierItem = {
        id: String(supplier.id || Date.now()),
        name: sName,
        businessCategory: sCategory,
        reorderDays: Number(supplier.reorderDays) || 7,
        vendorPrice: Number(supplier.vendorPrice) || Number(formData.rate) || 0
      };

      setFormData(prev => {
        const alreadyHas = (prev.suppliersList || []).some(
          s => s.name?.trim().toLowerCase() === sName.trim().toLowerCase() || String(s.id) === String(supplier.id)
        );
        if (alreadyHas) return prev;
        return {
          ...prev,
          suppliersList: [...(prev.suppliersList || []), newSupplierObj]
        };
      });

      setNewSupplier({
        name: sName,
        businessCategory: sCategory,
        reorderDays: (Number(supplier.reorderDays) || 7) as any,
        vendorPrice: (Number(supplier.vendorPrice) || Number(formData.rate) || 0) as any
      });

      setActiveTab('Suppliers');
      setIsSupplierPickerModalOpen(false);
      setIsAddSupplierModalOpen(false);

      toast.success(`Supplier "${sName}" successfully added to spare!`);
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
  const [isCustomSupplierInput, setIsCustomSupplierInput] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: 'Select', businessCategory: 'Select', reorderDays: '' as any, vendorPrice: '' as any });
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');

  const [isSupplierPickerModalOpen, setIsSupplierPickerModalOpen] = useState(false);
  const [supplierPickerSearch, setSupplierPickerSearch] = useState('');
  const [availableSuppliersList, setAvailableSuppliersList] = useState<any[]>([]);

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [uploadModalType, setUploadModalType] = useState<'File' | 'Link' | 'Note' | null>(null);
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
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

      // Bidirectional sync: merge any machines that reference this spare
      setFormData(prev => {
        if (!prev.partName && !prev.id) return prev;
        const merged = machineSpareSync.getMergedMachinesForSpare(prev, prev.machinesList || [], mapped);
        if (merged.length !== (prev.machinesList || []).length || JSON.stringify(merged) !== JSON.stringify(prev.machinesList)) {
          if (id) spareService.update(Number(id), { machinesList: merged }).catch(console.warn);
          return { ...prev, machinesList: merged };
        }
        return prev;
      });
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
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          category: s.businessCategory || 'Supplier',
          code: s.supplierCode || `12064`,
        }));
        setAvailableSuppliersList(mapped);
      } else {
        setAvailableSuppliersList([
          { id: '1', name: 'Supplier Name', category: 'Manufacturer', code: '12064' },
          { id: '2', name: 'Supplier Name', category: 'Manufacturer', code: '12064' },
          { id: '3', name: 'Supplier Name', category: 'Manufacturer', code: '12064' },
        ]);
      }
    } catch (err) {
      console.error('Failed to load suppliers for picker:', err);
      setAvailableSuppliersList([
        { id: '1', name: 'Supplier Name', category: 'Manufacturer', code: '12064' },
        { id: '2', name: 'Supplier Name', category: 'Manufacturer', code: '12064' },
        { id: '3', name: 'Supplier Name', category: 'Manufacturer', code: '12064' },
      ]);
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
        const mergedMachines = machineSpareSync.getMergedMachinesForSpare(data, data.machinesList || [], availableMachinesList);
        setFormData({ ...data, machinesList: mergedMachines });
        if (mergedMachines.length !== (data.machinesList || []).length) {
          spareService.update(spareId, { machinesList: mergedMachines }).catch(console.warn);
        }
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
      if (url.includes(':3001/uploads/') || url.includes(':3002/uploads/')) {
        return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):(3001|3002)/, '');
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
        const inHand = field === 'inHandQuantity' ? (value === '' ? 0 : Number(value) || 0) : ((prev.inHandQuantity as any) === '' ? 0 : Number(prev.inHandQuantity) || 0);
        const atSource = field === 'atSourceQuantity' ? (value === '' ? 0 : Number(value) || 0) : ((prev.atSourceQuantity as any) === '' ? 0 : Number(prev.atSourceQuantity) || 0);
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
            navigate(returnUrl, { state: { tab: returnTab, newSpareId: Number(id), newSpare: { ...payload, id: Number(id) } } });
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
            navigate(returnUrl, { state: { tab: returnTab, newSpareId: created.id, newSpare: created } });
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
    const foundAvailable = availableMachinesList.find(m => m.machineName === newMachineForm.name);
    const mId = foundAvailable?.id || Date.now().toString();
    const mLocation = (!newMachineForm.location || newMachineForm.location === 'Select') ? (foundAvailable?.location || 'Main Facility') : newMachineForm.location;
    const newMachineObj: MachineUsage = {
      id: mId,
      location: mLocation,
      name: newMachineForm.name,
      quantityUsed: Number(newMachineForm.quantityUsed) || 1,
      rate: Number(newMachineForm.rate) || 0,
      total: (Number(newMachineForm.quantityUsed) || 1) * (Number(newMachineForm.rate) || 0)
    };
    setFormData(prev => ({
      ...prev,
      machinesList: [...(prev.machinesList || []), newMachineObj]
    }));

    machineSpareSync.onMachineAddedToSpare(
      { id: id ? Number(id) : formData.id, partName: formData.partName || '', partCode: formData.partCode, category: formData.category, location: formData.location, rate: formData.rate, unitCost: formData.unitCost },
      newMachineObj
    );

    setIsAddMachineModalOpen(false);
    setNewMachineForm({ location: '', name: '', quantityUsed: 1, rate: 0 });
    toast.success('Added machine entry');
  };

  const handleDeleteSelectedMachines = () => {
    if (selectedMachineIds.length === 0) {
      toast.error('Select machine to delete');
      return;
    }
    for (const mId of selectedMachineIds) {
      machineSpareSync.onMachineRemovedFromSpare(id || formData.id || formData.partName || '', mId);
    }
    setFormData(prev => ({
      ...prev,
      machinesList: (prev.machinesList || []).filter(m => !selectedMachineIds.includes(String(m.id)))
    }));
    setSelectedMachineIds([]);
    toast.success('Deleted selected machine entries');
  };

  const handleDeleteSingleMachine = (mId: string | number) => {
    machineSpareSync.onMachineRemovedFromSpare(id || formData.id || formData.partName || '', mId);
    setFormData(prev => ({
      ...prev,
      machinesList: (prev.machinesList || []).filter(m => String(m.id) !== String(mId))
    }));
    setSelectedMachineIds(prev => prev.filter(x => x !== String(mId)));
    toast.success('Machine entry removed');
  };

  const handleOpenMachine = async (item: MachineUsage) => {
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

    // 1. Try finding in availableMachinesList
    let targetId = availableMachinesList.find(
      m => String(m.id) === String(item.id) ||
           m.machineName.trim().toLowerCase() === item.name.trim().toLowerCase() ||
           m.code?.toLowerCase() === item.name.trim().toLowerCase()
    )?.id;

    // 2. If item.id is valid id, use item.id
    if (!targetId && item.id && !isNaN(Number(item.id))) {
      targetId = String(item.id);
    }

    // 3. Fallback: fetch machines directly if not found
    if (!targetId) {
      try {
        const res = await api.get('/machines');
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        const found = list.find((m: any) => 
          String(m.id) === String(item.id) ||
          (m.name || m.machineName || '').trim().toLowerCase() === item.name.trim().toLowerCase() ||
          (m.machineCode || m.assetCode || '').toLowerCase() === item.name.trim().toLowerCase()
        );
        if (found) {
          targetId = String(found.id);
        }
      } catch (e) {
        console.warn('Fallback machine search failed:', e);
      }
    }

    if (!targetId) {
      toast.error(`Unable to locate machine "${item.name}"`);
      return;
    }

    navigate(`/machine-management/edit/${targetId}`, {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Machines List',
        tab: 'General',
        spareId: id || formData.id,
        spareName: formData.partName || 'Spare'
      }
    });
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
      sessionStorage.setItem('addMachineReturnUrl', location.pathname);
      sessionStorage.setItem('addMachineReturnTab', 'Machines List');
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
  const handleGoToAddSupplier = () => {
    try {
      sessionStorage.setItem('spare_details_draft', JSON.stringify({
        formData,
        activeTab: 'Suppliers',
        newSupplier,
        returnUrl: location.pathname,
        parentReturnUrl: returnUrl,
      }));
      sessionStorage.setItem('addSupplierReturnUrl', location.pathname);
      sessionStorage.setItem('addSupplierReturnTab', 'Suppliers');
    } catch (err) {
      console.error('Failed to save spare details draft:', err);
    }

    navigate('/suppliers/new', {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Suppliers',
        fromSpare: true
      }
    });
  };

  const handleAddSupplier = () => {
    if (!newSupplier.name || newSupplier.name === 'Select' || !newSupplier.name.trim()) {
      toast.error('Please select or enter a supplier name');
      return;
    }
    const foundSupplier = availableSuppliersList.find(s => s.name?.trim().toLowerCase() === newSupplier.name.trim().toLowerCase());
    const sId = foundSupplier?.id || Date.now().toString();

    const newSupplierObj: SupplierItem = {
      id: sId,
      name: newSupplier.name.trim(),
      businessCategory: (!newSupplier.businessCategory || newSupplier.businessCategory === 'Select') ? (foundSupplier?.category || 'Supplier') : newSupplier.businessCategory,
      reorderDays: Number(newSupplier.reorderDays) || 0,
      vendorPrice: Number(newSupplier.vendorPrice) || 0
    };
    setFormData(prev => ({
      ...prev,
      suppliersList: [...(prev.suppliersList || []), newSupplierObj]
    }));

    // Bidirectional sync: add this spare to the supplier's spares list in localStorage
    try {
      const storageKey = `supplier_${sId}_spares`;
      const raw = localStorage.getItem(storageKey);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      const spareEntry = {
        id: id || formData.id || Date.now(),
        name: formData.partName || '',
        partName: formData.partName || '',
        partCode: formData.partCode || '',
        location: formData.location || 'Main Store',
        inHandQuantity: Number(formData.inHandQuantity) || 0,
        atSourceQuantity: Number(formData.atSourceQuantity) || 0,
        minimumQuantity: Number(formData.minimumQuantity) || 0,
        totalStock: Number(formData.totalStock) || 0,
      };
      if (!list.some((s: any) => s.id === spareEntry.id || (s.partName && s.partName === spareEntry.partName))) {
        list.push(spareEntry);
        localStorage.setItem(storageKey, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Failed to sync spare to supplier:', e);
    }

    setIsAddSupplierModalOpen(false);
    setIsSupplierPickerModalOpen(false);
    setIsCustomSupplierInput(false);
    setNewSupplier({ name: 'Select', businessCategory: 'Select', reorderDays: '' as any, vendorPrice: '' as any });
    toast.success('Added supplier to spare');
  };

  const handleDeleteSelectedSuppliers = () => {
    if (selectedSupplierIds.length === 0) {
      toast.error('Select supplier to delete');
      return;
    }

    // Bidirectional sync: remove this spare from the deleted suppliers' spares lists
    for (const sId of selectedSupplierIds) {
      try {
        const storageKey = `supplier_${sId}_spares`;
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const spareId = id || formData.id;
            const spareName = formData.partName?.toLowerCase();
            const filtered = list.filter((s: any) => String(s.id) !== String(spareId) && s.partName?.toLowerCase() !== spareName);
            localStorage.setItem(storageKey, JSON.stringify(filtered));
          }
        }
      } catch (e) {
        console.warn('Failed to remove spare from supplier:', e);
      }
    }

    setFormData(prev => ({
      ...prev,
      suppliersList: (prev.suppliersList || []).filter(s => !selectedSupplierIds.includes(String(s.id)))
    }));
    setSelectedSupplierIds([]);
    toast.success('Deleted selected suppliers');
  };

  const handleDeleteSingleSupplier = (sId: string | number) => {
    try {
      const storageKey = `supplier_${sId}_spares`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const spareId = id || formData.id;
          const spareName = formData.partName?.toLowerCase();
          const filtered = list.filter((s: any) => String(s.id) !== String(spareId) && s.partName?.toLowerCase() !== spareName);
          localStorage.setItem(storageKey, JSON.stringify(filtered));
        }
      }
    } catch (e) {
      console.warn('Failed to remove spare from supplier:', e);
    }

    setFormData(prev => ({
      ...prev,
      suppliersList: (prev.suppliersList || []).filter(s => String(s.id) !== String(sId))
    }));
    setSelectedSupplierIds(prev => prev.filter(x => x !== String(sId)));
    toast.success('Supplier entry removed');
  };

  const handleOpenSupplier = async (item: SupplierItem) => {
    try {
      sessionStorage.setItem('spare_details_draft', JSON.stringify({
        formData,
        activeTab: 'Suppliers',
        newMachineForm,
        newSupplier,
        returnUrl: location.pathname,
        parentReturnUrl: returnUrl,
      }));
    } catch (err) {
      console.error('Failed to save spare details draft:', err);
    }

    // 1. Try finding in availableSuppliersList
    let targetId = availableSuppliersList.find(
      s => String(s.id) === String(item.id) ||
           s.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    )?.id;

    // 2. If item.id is valid id
    if (!targetId && item.id && !isNaN(Number(item.id))) {
      targetId = String(item.id);
    }

    // 3. Fallback: fetch suppliers directly
    if (!targetId) {
      try {
        const allSuppliers = await supplierService.getAll();
        const found = allSuppliers.find(s => 
          String(s.id) === String(item.id) ||
          (s.name || (s as any).supplierName || '').trim().toLowerCase() === item.name.trim().toLowerCase()
        );
        if (found) {
          targetId = String(found.id);
        }
      } catch (e) {
        console.warn('Fallback supplier search failed:', e);
      }
    }

    if (!targetId) {
      toast.error(`Unable to locate supplier "${item.name}"`);
      return;
    }

    navigate(`/suppliers/edit/${targetId}`, {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Suppliers',
        spareId: id || formData.id,
        spareName: formData.partName || 'Spare'
      }
    });
  };

  // Document Handlers (Aligned with Machine Management)
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
    setUploadModalType(doc.type || 'File');
    setDocName(doc.name || '');
    setDocContent(doc.content || '');
    setDocFile(doc.file || null);
  };

  const handleViewDoc = (doc: any) => {
    const docType = doc.type || (doc.fileType?.includes('http') ? 'Link' : 'File');
    if (docType === 'File') {
      if (doc.file) {
        const fileUrl = URL.createObjectURL(doc.file);
        window.open(fileUrl, '_blank');
      } else if (doc.content) {
        const fullUrl = doc.content.startsWith('http') || doc.content.startsWith('data:') || doc.content.startsWith('blob:')
          ? doc.content
          : `${API_BASE_URL}${doc.content.startsWith('/') ? doc.content : `/${doc.content}`}`;
        window.open(fullUrl, '_blank');
      } else {
        toast.error('File content unavailable');
      }
    } else if (docType === 'Link') {
      const linkUrl = doc.content?.startsWith('http') ? doc.content : `https://${doc.content}`;
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
    if ((uploadModalType === 'Link' || uploadModalType === 'Note') && !docContent.trim()) {
      toast.error('Please provide content');
      return;
    }
    if (uploadModalType === 'File' && !docFile && !editingDoc?.content) {
      toast.error('File is required');
      return;
    }

    setUploadingDoc(true);
    try {
      if (editingDoc) {
        setFormData(prev => ({
          ...prev,
          documentsList: (prev.documentsList || []).map(d => {
            if (d.id === editingDoc.id) {
              return {
                ...d,
                name: docName.trim(),
                type: uploadModalType || 'File',
                content: uploadModalType !== 'File' ? docContent.trim() : (docFile ? URL.createObjectURL(docFile) : d.content),
                file: docFile || d.file,
                fileType: uploadModalType === 'File' ? (docFile?.type || d.fileType || 'Document') : (uploadModalType || 'Document'),
                size: uploadModalType === 'File' && docFile ? `${(docFile.size / (1024 * 1024)).toFixed(2)} MB` : d.size,
              };
            }
            return d;
          })
        }));
        toast.success('Document updated successfully');
      } else {
        const newDoc: SpareDocument = {
          id: Date.now().toString(),
          name: docName.trim(),
          type: uploadModalType || 'File',
          fileType: uploadModalType === 'File' ? (docFile?.type || 'Document') : (uploadModalType || 'Document'),
          uploadDate: new Date().toISOString().split('T')[0],
          size: uploadModalType === 'File' && docFile ? `${(docFile.size / (1024 * 1024)).toFixed(2)} MB` : '-',
          content: uploadModalType !== 'File' ? docContent.trim() : (docFile ? URL.createObjectURL(docFile) : ''),
          file: uploadModalType === 'File' ? docFile : null,
        };

        setFormData(prev => ({
          ...prev,
          documentsList: [...(prev.documentsList || []), newDoc]
        }));
        toast.success('Document added successfully');
      }

      setUploadModalType(null);
      setEditingDoc(null);
      setDocName('');
      setDocContent('');
      setDocFile(null);
    } catch (err) {
      console.error('Error saving document:', err);
      toast.error('Failed to save document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteSingleDocument = (docId: string | number) => {
    setFormData(prev => ({
      ...prev,
      documentsList: (prev.documentsList || []).filter(d => String(d.id) !== String(docId))
    }));
    setSelectedDocumentIds(prev => prev.filter(id => id !== String(docId)));
    toast.success('Document deleted successfully');
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

  const filteredDocumentsList = (formData.documentsList || []).filter(item =>
    (item.name || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (item.type || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (item.fileType || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (item.content || '').toLowerCase().includes(docSearchQuery.toLowerCase())
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
    <div className="space-y-4">
      {/* Breadcrumb matching Figma Screen 2 & Screen 4 */}
      <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5 pt-1">
        {returnUrl ? (
          <>
            <span 
              className="hover:text-blue-700 cursor-pointer text-blue-600 font-medium hover:underline" 
              onClick={() => navigate(returnUrl, { state: { tab: returnTab, spareTab: returnTab } })}
            >
              {(location.state as any)?.machineName ? `${(location.state as any).machineName} (${returnTab})` : 'Back to Machine'}
            </span>
            <span>/</span>
          </>
        ) : (
          <>
            <span className="hover:text-gray-800 cursor-pointer" onClick={() => navigate('/spares')}>Pages</span>
            <span>/</span>
            <span className="hover:text-gray-800 cursor-pointer" onClick={() => navigate('/spares')}>Spares</span>
            <span>/</span>
          </>
        )}
        <span className="text-gray-700">{isEditMode ? (formData.partName || 'Spare') : 'Add Spare'}</span>
        <span>/</span>
        <span className="text-emerald-700 font-semibold">{activeTab}</span>
      </div>

      {/* Top Header Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        
        {/* Left Side: Back Arrow + Spare Name Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => returnUrl ? navigate(returnUrl, { state: { tab: returnTab, spareTab: returnTab } }) : navigate('/spares')}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Spares List"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {formData.partName ? `${formData.partName}` : (isEditMode ? 'Edit Spare' : 'Add Spare')}
              </h1>
              {formData.partCode && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {formData.partCode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Update spare part specifications, stock levels, warranties, and suppliers</p>
          </div>
        </div>

        {/* Right Side Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 h-[38px] px-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* LEFT SUMMARY PANEL */}
        <div className="w-full lg:w-64 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 shrink-0">
          
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
                            if (currentImage && !target.src.startsWith('data:')) {
                              target.src = `${API_BASE_URL}${currentImage.startsWith('/') ? currentImage : `/${currentImage}`}`;
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

            {/* Stock Badge - Emerald status pill matching Figma */}
            <div className="bg-emerald-600 text-white py-2 px-4 rounded-xl font-bold text-center text-sm shadow-xs">
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
                      ? 'bg-emerald-600 text-white shadow-xs'
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

                  <div className="flex justify-end items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNewStockLoc({ location: '', inHandQuantity: '' as any, atSourceQuantity: '' as any, minimumQuantity: '' as any });
                        setIsAddStockModalOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus size={16} className="stroke-[3]" /> Add Stock
                    </button>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={stockSearchQuery}
                        onChange={(e) => setStockSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                      />
                    </div>
                    {selectedStockIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteSelectedStock}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete Selected Stock"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
                <div className="flex justify-end items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddMachineModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[3]" /> Add Machine
                  </button>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={machineSearchQuery}
                      onChange={(e) => setMachineSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                    />
                  </div>
                  {selectedMachineIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedMachines}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete Selected Machine Entries"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
                        <th className="py-2.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {filteredMachinesList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400 font-medium">
                            No machine entries added.
                          </td>
                        </tr>
                      ) : (
                        filteredMachinesList.map((item, idx) => {
                          const isSelected = selectedMachineIds.includes(String(item.id));
                          return (
                            <tr 
                              key={item.id} 
                              onClick={() => handleOpenMachine(item)}
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const strId = String(item.id);
                                    setSelectedMachineIds(prev => 
                                      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-4 font-medium text-gray-700">{item.location}</td>
                              <td className="py-3 px-4 font-medium text-gray-700">{item.name}</td>
                              <td className="py-3 px-4 text-gray-700">{item.quantityUsed}</td>
                              <td className="py-3 px-4 text-gray-700">₹ {item.rate.toLocaleString()}</td>
                              <td className="py-3 px-4 font-bold text-gray-800">₹ {item.total.toLocaleString()}</td>
                              <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMachine(item)}
                                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                                    title={`Open ${item.name} details`}
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSingleMachine(item.id)}
                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                    title="Delete Machine Entry"
                                  >
                                    <Trash2 size={15} />
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
                    type="button"
                    onClick={() => {
                      setSpecForm({ fieldTitle: '', inputType: 'Select', fieldData: '', fieldUnit: 'Select' });
                      setIsAddSpecModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[3]" /> Add Specification Field
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: WARRANTIES */}
            {activeTab === 'Warranties' && (
              <div className="space-y-5">
                <div className="flex justify-end items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddWarrantyModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[3]" /> Add Warranty
                  </button>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={warrantySearchQuery}
                      onChange={(e) => setWarrantySearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                    />
                  </div>
                  {selectedWarrantyIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedWarranties}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete Selected Warranties"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
                <div className="flex justify-end items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      fetchSuppliers();
                      setNewSupplier({ name: 'Select', businessCategory: 'Select', reorderDays: '' as any, vendorPrice: '' as any });
                      setIsCustomSupplierInput(false);
                      setIsAddSupplierModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={16} className="stroke-[3]" /> Add Supplier
                  </button>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={supplierSearchQuery}
                      onChange={(e) => setSupplierSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                    />
                  </div>
                  {selectedSupplierIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedSuppliers}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete Selected Suppliers"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
                        <th className="py-2.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {filteredSuppliersList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400 font-medium">
                            No supplier entries found. Click{" "}
                            <button
                              type="button"
                              onClick={() => {
                                fetchSuppliers();
                                setNewSupplier({ name: 'Select', businessCategory: 'Select', reorderDays: '' as any, vendorPrice: '' as any });
                                setIsCustomSupplierInput(false);
                                setIsAddSupplierModalOpen(true);
                              }}
                              className="text-emerald-600 font-bold hover:underline cursor-pointer"
                            >
                              "+ Add"
                            </button>{" "}
                            to create a new supplier.
                          </td>
                        </tr>
                      ) : (
                        filteredSuppliersList.map((item, idx) => {
                          const isSelected = selectedSupplierIds.includes(String(item.id));
                          return (
                            <tr 
                              key={item.id} 
                              onClick={() => handleOpenSupplier(item)}
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const strId = String(item.id);
                                    setSelectedSupplierIds(prev => 
                                      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
                              <td className="py-3 px-4 text-gray-700">{item.businessCategory}</td>
                              <td className="py-3 px-4 text-gray-700">{item.reorderDays}</td>
                              <td className="py-3 px-4 font-bold text-gray-800">₹ {item.vendorPrice.toLocaleString()}</td>
                              <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSupplier(item)}
                                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                                    title={`Open ${item.name} details`}
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSingleSupplier(item.id)}
                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                    title="Delete Supplier Entry"
                                  >
                                    <Trash2 size={15} />
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
            )}

            {/* TAB 7: DOCUMENTS */}
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
                      className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 text-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    {selectedDocumentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteSelectedDocuments}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete Selected Documents"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                        className="h-[38px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Plus size={16} className="stroke-[2.5]" /> Upload
                      </button>
                      
                      {/* Upload Dropdown */}
                      {isUploadMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20">
                          <button 
                            type="button"
                            onClick={() => handleOpenUpload('File')}
                            className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            File
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleOpenUpload('Link')}
                            className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            Link
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleOpenUpload('Note')}
                            className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            Notes
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto w-full border border-slate-200/90 rounded-xl">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={filteredDocumentsList.length > 0 && selectedDocumentIds.length === filteredDocumentsList.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocumentIds(filteredDocumentsList.map(d => String(d.id)));
                              } else {
                                setSelectedDocumentIds([]);
                              }
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300" 
                          />
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">No.</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Document Type</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Document Details</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDocumentsList?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-slate-500 bg-white">
                            No documents added yet.
                          </td>
                        </tr>
                      ) : (
                        filteredDocumentsList.map((doc, index) => {
                          const isSelected = selectedDocumentIds.includes(String(doc.id));
                          const docType = doc.type || (doc.fileType?.includes('http') ? 'Link' : 'File');
                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => {
                                    const strId = String(doc.id);
                                    setSelectedDocumentIds(prev => 
                                      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300" 
                                />
                              </td>
                              <td className="px-4 py-3 text-xs sm:text-sm text-slate-500 font-medium">{index + 1}</td>
                              <td className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900">{doc.name}</td>
                              <td className="px-4 py-3 text-xs sm:text-sm text-slate-600">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                  docType === 'File' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  docType === 'Link' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {docType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs sm:text-sm text-slate-600">
                                {docType === 'File' ? (
                                  <button 
                                    type="button" 
                                    onClick={() => handleViewDoc(doc)}
                                    className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium cursor-pointer flex items-center gap-1"
                                  >
                                    <span>{doc.file?.name || doc.name || 'View File'}</span>
                                  </button>
                                ) : docType === 'Link' ? (
                                  <a href={doc.content?.startsWith('http') ? doc.content : `https://${doc.content}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium truncate max-w-[200px] inline-block">{doc.content}</a>
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
                                  <button 
                                    type="button"
                                    onClick={() => handleEditDoc(doc)}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Document"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteSingleDocument(doc.id)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Document"
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
            )}

            {/* TAB 8: LOG */}
            {activeTab === 'Log' && (
              <div className="space-y-5">
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
                  <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
                  <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
                  <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddMachineModalOpen(false)} 
                  className="text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add Machine</h2>
              </div>
            </div>

            <div className="text-xs font-semibold text-gray-500">
              Asset : {formData.partName || 'Spare Name S1'}
            </div>

            <div className="space-y-4 text-xs">
              {/* Location */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Location</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={newMachineForm.location || ''}
                      onChange={(e) => setNewMachineForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium appearance-none pr-10 cursor-pointer"
                    >
                      <option value="">Select Location</option>
                      {availableLocations.map((loc) => (
                        <option key={loc.id} value={loc.location}>
                          {loc.location} {loc.code ? `(${loc.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      fetchLocations();
                      setIsMachineLocationPickerOpen(true);
                    }}
                    title="Browse locations"
                    className="h-[46px] px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-2xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-600" />
                    <span>Browse</span>
                  </button>
                </div>
              </div>

              {/* Machine */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-gray-800">Machine *</label>
                  <button
                    type="button"
                    onClick={handleGoToAddMachine}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Machine
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={newMachineForm.name || ''}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          handleGoToAddMachine();
                        } else {
                          const found = availableMachinesList.find(m => m.machineName === e.target.value);
                          setNewMachineForm(prev => ({
                            ...prev,
                            name: e.target.value,
                            location: found?.location || prev.location || 'Main Facility'
                          }));
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium appearance-none pr-10 cursor-pointer"
                    >
                      <option value="">Select Machine</option>
                      {availableMachinesList.map((m) => (
                        <option key={m.id} value={m.machineName}>
                          {m.machineName} {m.code ? `(${m.code})` : ''} - {m.location}
                        </option>
                      ))}
                      <option value="__ADD_NEW__" className="text-emerald-600 font-semibold">+ Add in Machine Management...</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      fetchMachines();
                      setIsMachinePickerModalOpen(true);
                    }}
                    title="Browse machines list"
                    className="h-[46px] px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-2xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-600" />
                    <span>Browse</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToAddMachine}
                    title="Add machine in Machine Management"
                    className="h-[46px] px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-500">
                  <span>Machine not in the list?</span>
                  <button
                    type="button"
                    onClick={handleGoToAddMachine}
                    className="text-emerald-600 hover:underline font-bold cursor-pointer"
                  >
                    + Create in Machine Management
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleAddMachineSubmit}
                className="px-10 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer"
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
                  type="button"
                  onClick={() => setIsMachineLocationPickerOpen(false)} 
                  className="text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100"
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
                  type="button"
                  onClick={() => {
                    const newLocName = `Location ${availableLocations.length + 1}`;
                    setAvailableLocations(prev => [...prev, { id: Date.now().toString(), location: newLocName, facilityName: 'Facility Name', code: 'C1354' }]);
                    toast.success('Added location');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
                  type="button"
                  onClick={() => setIsMachinePickerModalOpen(false)} 
                  className="text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100"
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
                  type="button"
                  onClick={handleGoToAddMachine}
                  title="Add machine in Machine Management"
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
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
                        No machines found. Click{" "}
                        <button
                          type="button"
                          onClick={handleGoToAddMachine}
                          className="text-emerald-600 font-bold hover:underline cursor-pointer"
                        >
                          "+ Add Machine"
                        </button>{" "}
                        to create one.
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
                  <CustomDatePicker
                    name="startDate"
                    value={newWarranty.startDate}
                    onChange={(e: any) => setNewWarranty(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Expiry Date</label>
                  <CustomDatePicker
                    name="expiryDate"
                    value={newWarranty.expiryDate}
                    onChange={(e: any) => setNewWarranty(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
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

      {/* ADD BUSINESS (SUPPLIER) MODAL (Matching Figma Screen 2 & 3) */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setIsAddSupplierModalOpen(false)} 
                className="text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add Business</h2>
            </div>

            {/* Asset Subheader matching Figma Screen 2 */}
            <div className="text-xs font-semibold text-gray-500">
              Asset : {formData.partName ? `${formData.partName.replace('S1', 'F1')}` : 'Facility Name F1'}
            </div>

            {/* Form Fields matching Figma Screen 2 */}
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
                  <span className={newSupplier.name && newSupplier.name !== 'Select' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {newSupplier.name && newSupplier.name !== 'Select' ? newSupplier.name : 'Select'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </div>
              </div>

              {/* Business Category matching Figma Screen 2 & Screen 3 */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Business Category</label>
                <div className="relative">
                  <select
                    value={newSupplier.businessCategory}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, businessCategory: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium appearance-none pr-10 cursor-pointer"
                  >
                    <option value="Select">Select</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Service Provider">Service Provider</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* No. of Days For Reorder Delivery matching Figma Screen 2 */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">No. of Days For Reorder Delivery</label>
                <input
                  type="number"
                  min="0"
                  placeholder="23"
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

            {/* Action Button matching Figma Screen 2 */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleAddSupplier}
                className="px-10 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIERS SELECTOR MODAL (Matching Figma Screen 4) */}
      {isSupplierPickerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsSupplierPickerModalOpen(false)} 
                  className="text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100"
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
                  type="button"
                  onClick={handleGoToAddSupplier}
                  title="Add supplier in Suppliers Management"
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider backdrop-blur-xs">
                  <tr className="text-slate-600 font-semibold text-xs">
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
                            No suppliers found. Click{" "}
                            <button
                              type="button"
                              onClick={handleGoToAddSupplier}
                              className="text-emerald-600 font-bold hover:underline cursor-pointer"
                            >
                              "+ Add"
                            </button>{" "}
                            to create a new supplier.
                          </td>
                        </tr>
                      );
                    }
                    return filteredSuppliers.map((item, idx) => (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setNewSupplier(prev => ({
                            ...prev,
                            name: item.name,
                            businessCategory: item.category || prev.businessCategory || 'Supplier'
                          }));
                          setIsSupplierPickerModalOpen(false);
                        }}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={newSupplier.name === item.name}
                            onChange={() => {
                              setNewSupplier(prev => ({
                                ...prev,
                                name: item.name,
                                businessCategory: item.category || prev.businessCategory || 'Supplier'
                              }));
                              setIsSupplierPickerModalOpen(false);
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 cursor-pointer" 
                          />
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
                      if (modalImg && !target.src.startsWith('data:')) {
                        target.src = `${API_BASE_URL}${modalImg.startsWith('/') ? modalImg : `/${modalImg}`}`;
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

      {/* Document Upload / Edit Modal (Aligned with Machine Management) */}
      {uploadModalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 sm:p-8 shadow-xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-6">
              <button 
                type="button"
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
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Document Title"
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
                <select
                  value={uploadModalType}
                  onChange={(e) => setUploadModalType(e.target.value as any)}
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 cursor-pointer"
                >
                  <option value="File">File</option>
                  <option value="Link">Link</option>
                  <option value="Note">Note</option>
                </select>
              </div>

              {uploadModalType === 'File' && (
                <div>
                  <div className="border border-slate-300 rounded-lg p-2 flex items-center mb-1.5">
                    <input 
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setDocFile(file);
                          if (!docName) {
                            setDocName(file.name);
                          }
                        }
                      }}
                      className="block w-full text-xs text-slate-600 cursor-pointer focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors"
                    />
                  </div>
                  {(docFile || editingDoc?.content || editingDoc?.name) && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1 truncate">
                      File: {docFile?.name || editingDoc?.name || editingDoc?.content}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">Note: Manuals, Warranties, Specifications (PDF, images, docs)</p>
                </div>
              )}

              {uploadModalType === 'Link' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">URL <span className="text-red-500">*</span></label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes <span className="text-red-500">*</span></label>
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
                  {uploadingDoc ? 'Saving...' : 'Upload'}
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
                <span className="text-xs text-slate-500 font-medium">{viewingDoc.type || 'Document'}</span>
              </div>
              <button 
                type="button"
                onClick={() => setViewingDoc(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="py-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                {viewingDoc.content || 'No text content available.'}
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button 
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
