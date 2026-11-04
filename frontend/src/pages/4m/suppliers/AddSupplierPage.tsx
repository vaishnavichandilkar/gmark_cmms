import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Printer, Filter, MapPin, ChevronDown, Upload, 
  Image as ImageIcon, QrCode, Plus, Trash2, FileText, Search,
  Eye, Pencil, Maximize2, Loader2, X, ZoomIn, ZoomOut, RotateCw
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasSupplierTabPermission } from '../../../utils/permissions';
import { toast } from 'react-hot-toast';
import { supplierService, type Supplier } from '../../../services/supplierService';
import { spareService } from '../../../services/spareService';
import { SelectLocationPickerModal } from '../../../components/4m/SelectLocationPickerModal';
import { SelectSparePickerModal } from '../../../components/4m/SelectSparePickerModal';
import { INDIAN_STATES } from '../../../constants/states';
import { fetchLocationByPincode } from '../../../utils/pincodeService';

type TabType = 'General' | 'Location' | 'Spares' | 'Documents' | 'Log';

const SUPPLIER_TABS: TabType[] = ['General', 'Location', 'Spares', 'Documents', 'Log'];

export const AddSupplierPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const permittedTabs = SUPPLIER_TABS.filter(tab => hasSupplierTabPermission(currentUser, tab, 'view'));
  const supplierTabs = permittedTabs.length > 0 ? permittedTabs : SUPPLIER_TABS;

  const [activeTab, setActiveTab] = useState<TabType>(supplierTabs[0] || 'General');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (supplierTabs.length > 0 && !supplierTabs.includes(activeTab)) {
      setActiveTab(supplierTabs[0]);
    }
  }, [supplierTabs, activeTab]);


  // Form State matching all screenshots
  const [formData, setFormData] = useState<Partial<Supplier> & {
    businessDescription?: string;
    categoriesList?: string[];
    logoUrl?: string;
  }>({
    supplierCode: '',
    name: '',
    status: 'ACTIVE',
    businessDescription: '',
    businessCategory: 'Supplier',
    categoriesList: ['Supplier'],
    contactPerson: '',
    phone: '',
    fax: '',
    website: '',
    primaryCurrency: 'INR',
    email: '',
    secondaryEmail: '',
    gstNumber: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    latitude: '',
    longitude: '',
    notes: '',
    logoUrl: '',
  });

  // Business Category Dropdown state (Screenshot 2)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryOptions = ['Supplier', 'Manufacturer', 'Service Provider'];

  // Local tab states for Spares & Documents
  const [supplierSpares, setSupplierSpares] = useState<any[]>([]);
  const [spareSearchQuery, setSpareSearchQuery] = useState('');
  const [selectedSpareIds, setSelectedSpareIds] = useState<number[]>([]);
  const [isAddSpareModalOpen, setIsAddSpareModalOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isSparePickerOpen, setIsSparePickerOpen] = useState(false);

  useEffect(() => {
    const pin = (formData.postalCode || '').trim().replace(/\D/g, '');
    if (pin.length === 6) {
      let isCurrent = true;
      fetchLocationByPincode(pin).then(loc => {
        if (loc && isCurrent) {
          setFormData(prev => ({
            ...prev,
            city: loc.city,
            state: loc.state,
            country: loc.country || 'India',
          }));
        }
      });
      return () => {
        isCurrent = false;
      };
    }
  }, [formData.postalCode]);
  const [newSpareForm, setNewSpareForm] = useState({
    name: '',
    location: '',
    inHandQuantity: '' as any,
    atSourceQuantity: '' as any,
    minimumQuantity: '' as any,
    totalStock: 0,
  });

  const filteredSparesList = supplierSpares.filter((item) =>
    (item.name || item.partName || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
    (item.location || item.stockLocation || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
    (item.code || item.partCode || '').toLowerCase().includes(spareSearchQuery.toLowerCase())
  );

  const saveDraft = (overrideData?: any) => {
    const dataToSave = {
      formData: overrideData || formData,
      activeTab,
      localPreviewUrl,
    };
    sessionStorage.setItem('supplier_page_draft', JSON.stringify(dataToSave));
  };

  const loadSpares = async (extraSpare?: any) => {
    try {
      const all = await spareService.getAll();
      const currentName = (formData.name || '').trim().toLowerCase();
      const currentId = id ? String(id) : '';

      // Find spares where suppliersList explicitly has this supplier name or ID
      const linked = all.filter((s) =>
        s.suppliersList?.some((sup) => 
          (currentName && sup.name?.trim().toLowerCase() === currentName) ||
          (currentId && String(sup.id) === currentId)
        )
      );

      // Check localStorage for spares explicitly added to this supplier
      let localSpares: any[] = [];
      if (id) {
        try {
          const raw = localStorage.getItem(`supplier_${id}_spares`);
          if (raw) localSpares = JSON.parse(raw);
        } catch {}
      }

      // DO NOT FALL BACK TO all CATALOG SPARES!
      // Only include spares that are specifically linked to this supplier
      let list: any[] = [...linked];
      for (const loc of localSpares) {
        if (!list.some(s => s.id === loc.id || (s.partCode && s.partCode === loc.partCode) || (s.partName && s.partName === loc.partName))) {
          list.push(loc);
        }
      }

      if (extraSpare) {
        const exists = list.some((s) => s.id === extraSpare.id || s.partCode === extraSpare.partCode);
        if (!exists) {
          list = [extraSpare, ...list];
        }
      }

      setSupplierSpares(list);
    } catch (err) {
      console.warn('Failed to load spares', err);
    }
  };

  const handleNavigateToCreateSpare = () => {
    saveDraft({
      ...formData,
      __newSpareDraft: newSpareForm,
      __isAddSpareModalOpen: true,
    });
    setIsSparePickerOpen(false);
    setIsAddSpareModalOpen(false);
    navigate('/spares/new', {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Spares',
        tab: 'General',
      }
    });
  };

  const handleAddSpareRecord = () => {
    if (!newSpareForm.name.trim()) {
      toast.error('Please enter a spare part name');
      return;
    }
    const newRecord = {
      id: Date.now(),
      name: newSpareForm.name,
      partName: newSpareForm.name,
      location: newSpareForm.location || 'Main Store',
      inHandQuantity: newSpareForm.inHandQuantity || 0,
      atSourceQuantity: newSpareForm.atSourceQuantity || 0,
      minimumQuantity: newSpareForm.minimumQuantity || 0,
      totalStock: (Number(newSpareForm.inHandQuantity) || 0) + (Number(newSpareForm.atSourceQuantity) || 0) || newSpareForm.totalStock || 0,
    };
    const updated = [...supplierSpares, newRecord];
    setSupplierSpares(updated);
    if (id) {
      localStorage.setItem(`supplier_${id}_spares`, JSON.stringify(updated));
    }

    // Bidirectional sync: link this supplier inside that spare's suppliersList
    spareService.getAll().then((allSpares) => {
      const match = allSpares.find((s) =>
        s.partName?.trim().toLowerCase() === newRecord.partName.trim().toLowerCase() ||
        (s.partCode && s.partCode.trim().toLowerCase() === newRecord.partName.trim().toLowerCase())
      );
      if (match) {
        const curSuppliers = Array.isArray(match.suppliersList) ? [...match.suppliersList] : [];
        const supName = (formData.name || '').trim();
        if (supName && !curSuppliers.some((sup) => sup.name?.trim().toLowerCase() === supName.toLowerCase())) {
          curSuppliers.push({
            id: id ? String(id) : Date.now().toString(),
            name: supName,
            businessCategory: formData.categoriesList?.[0] || formData.businessCategory || 'Supplier',
            reorderDays: 7,
            vendorPrice: Number(match.rate) || Number(match.unitCost) || 0,
          });
          spareService.update(match.id, { suppliersList: curSuppliers }).catch(console.warn);
        }
      }
    }).catch(console.warn);

    setIsAddSpareModalOpen(false);
    setNewSpareForm({ name: '', location: '', inHandQuantity: '' as any, atSourceQuantity: '' as any, minimumQuantity: '' as any, totalStock: 0 });
    toast.success('Spare part added to supplier catalog');
  };

  const handleDeleteSelectedSpares = () => {
    if (selectedSpareIds.length === 0) {
      toast.error('Select at least one spare part to delete');
      return;
    }
    const toDelete = supplierSpares.filter((s) => selectedSpareIds.includes(s.id));
    const remaining = supplierSpares.filter((s) => !selectedSpareIds.includes(s.id));
    setSupplierSpares(remaining);
    if (id) {
      localStorage.setItem(`supplier_${id}_spares`, JSON.stringify(remaining));
    }
    setSelectedSpareIds([]);

    // Remove this supplier from deleted spares in Spare Management
    spareService.getAll().then((allSpares) => {
      const supName = (formData.name || '').trim().toLowerCase();
      for (const d of toDelete) {
        const dName = (d.partName || d.name || '').trim().toLowerCase();
        const match = allSpares.find((s) => s.partName?.trim().toLowerCase() === dName || s.id === d.id);
        if (match && Array.isArray(match.suppliersList)) {
          const updatedSuppliers = match.suppliersList.filter((sup) => sup.name?.trim().toLowerCase() !== supName);
          spareService.update(match.id, { suppliersList: updatedSuppliers }).catch(console.warn);
        }
      }
    }).catch(console.warn);

    toast.success('Deleted selected spare parts');
  };

  const handleOpenSpare = async (item: any) => {
    let targetSpareId = item.id;
    if (!targetSpareId || isNaN(Number(targetSpareId))) {
      try {
        const allSpares = await spareService.getAll();
        const found = allSpares.find(s => 
          String(s.id) === String(item.id) ||
          s.partName.trim().toLowerCase() === (item.partName || item.name || '').trim().toLowerCase() ||
          (s.partCode && item.partCode && s.partCode.toLowerCase() === item.partCode.toLowerCase())
        );
        if (found) targetSpareId = found.id;
      } catch (e) {
        console.warn('Fallback spare search failed:', e);
      }
    }

    if (!targetSpareId) {
      toast.error(`Unable to locate spare "${item.partName || item.name || 'part'}"`);
      return;
    }

    navigate(`/spares/edit/${targetSpareId}`, {
      state: {
        returnUrl: location.pathname,
        returnTab: 'Spares',
        supplierId: id,
        supplierName: formData.name || 'Supplier'
      }
    });
  };

  const [supplierDocuments, setSupplierDocuments] = useState<any[]>([]);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('File');
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);

  const filteredDocs = supplierDocuments.filter((d) =>
    (d.name || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (d.type || '').toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  const handleDeleteSelectedDocs = () => {
    if (selectedDocIds.length === 0) {
      toast.error('Select at least one document to delete');
      return;
    }
    setSupplierDocuments(supplierDocuments.filter((d) => !selectedDocIds.includes(d.id)));
    setSelectedDocIds([]);
    toast.success('Deleted selected documents');
  };

  useEffect(() => {
    // Restore any saved draft from sessionStorage
    const saved = sessionStorage.getItem('supplier_page_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          const { __newSpareDraft, __isAddSpareModalOpen, ...restFormData } = parsed.formData;
          setFormData((prev) => ({ ...prev, ...restFormData }));
          if (__newSpareDraft) {
            setNewSpareForm((prev) => ({ ...prev, ...__newSpareDraft }));
          }
        }
        if (parsed.activeTab) {
          setActiveTab(parsed.activeTab);
        }
        if (parsed.localPreviewUrl) {
          setLocalPreviewUrl(parsed.localPreviewUrl);
        }
      } catch (e) {
        console.warn('Failed to restore draft', e);
      }
    }

    const stateObj = location.state as any;
    if (stateObj?.tab) {
      setActiveTab(stateObj.tab as TabType);
    }

    if (stateObj?.newSpare) {
      const createdSpare = stateObj.newSpare;
      const spareName = createdSpare.partName || createdSpare.name || '';
      const spareLocation = createdSpare.location || createdSpare.stockLocation || 'Main Store';

      setSupplierSpares((prev) => {
        const exists = prev.some((s) => s.id === createdSpare.id || s.partCode === createdSpare.partCode);
        if (exists) return prev;
        return [createdSpare, ...prev];
      });
      loadSpares(createdSpare);

      // Re-open Add Spare modal and pre-fill newly created spare
      setNewSpareForm((prev) => ({
        ...prev,
        name: spareName,
        location: spareLocation || prev.location || 'Main Store',
        minimumQuantity: createdSpare.minQuantity ?? createdSpare.minimumQuantity ?? prev.minimumQuantity ?? '',
        inHandQuantity: createdSpare.inHandQuantity ?? prev.inHandQuantity ?? '',
        atSourceQuantity: createdSpare.atSourceQuantity ?? prev.atSourceQuantity ?? '',
      }));
      setIsAddSpareModalOpen(true);
      toast.success(`Spare "${spareName}" created! You can now adjust quantities and click Save.`);
    } else {
      loadSpares();
    }
  }, [location.state]);

  useEffect(() => {
    if (activeTab === 'Spares') {
      loadSpares();
    }
  }, [activeTab]);

  useEffect(() => {
    if (isEditMode && id) {
      fetchSupplierDetails(Number(id));
    } else {
      fetchNextCode();
    }
  }, [id]);

  const fetchNextCode = async () => {
    try {
      const code = await supplierService.getNextCode();
      setFormData((prev) => ({ ...prev, supplierCode: code }));
    } catch (err) {
      console.error('Failed to get next supplier code:', err);
    }
  };

  const fetchSupplierDetails = async (supplierId: number) => {
    setLoading(true);
    try {
      const data = await supplierService.getSupplierById(supplierId);
      const categories = data.businessCategory
        ? data.businessCategory.split(',').map((c) => c.trim())
        : ['Supplier'];

      setFormData({
        ...data,
        categoriesList: categories,
      });
    } catch (err) {
      console.error('Failed to load supplier details:', err);
      toast.error('Failed to load supplier details');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    const current = formData.categoriesList || [];
    let updated: string[];

    if (current.includes(category)) {
      updated = current.filter((c) => c !== category);
    } else {
      updated = [...current, category];
    }

    setFormData({
      ...formData,
      categoriesList: updated,
      businessCategory: updated.join(', '),
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);

  const openImageViewer = () => {
    setImageRotation(0);
    setImageZoom(1);
    setIsImageViewerOpen(true);
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLocalPreviewUrl('');
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Image removed');
  };

  const processImageFile = (file: File) => {
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
    reader.onload = () => {
      const base64Data = reader.result as string;
      setLocalPreviewUrl(base64Data);
      setFormData((prev) => ({ ...prev, logoUrl: base64Data }));
      setUploadingImage(false);
      toast.success('Image uploaded successfully');
    };
    reader.onerror = () => {
      setUploadingImage(false);
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processImageFile(file);
    }
  };

  const renderProfileCard = (_isStep1: boolean = false) => {
    const currentImage = localPreviewUrl || formData.logoUrl;

    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 flex flex-col text-left">
        {/* Upload Dropzone matching Spare Management Screenshot */}
        <div className="space-y-3">
          <div
            onClick={() => {
              if (uploadingImage) return;
              if (currentImage) {
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
            className={`w-full aspect-square bg-gray-50/50 rounded-2xl border-2 border-dashed ${
              currentImage
                ? 'border-gray-200 hover:border-emerald-500'
                : 'border-emerald-400 hover:border-emerald-500 hover:bg-emerald-50/20'
            } flex flex-col items-center justify-center relative overflow-hidden group transition-all shadow-inner cursor-pointer`}
            title={currentImage ? 'Click to view full image' : 'Click to upload image'}
          >
            {uploadingImage ? (
              <div className="flex flex-col items-center justify-center p-4 gap-2 text-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <span className="text-xs text-gray-600 font-bold">Uploading image...</span>
              </div>
            ) : currentImage ? (
              <>
                <img
                  src={currentImage}
                  alt={formData.name || 'Supplier Logo'}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
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
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 border border-emerald-100 group-hover:bg-emerald-100 group-hover:scale-110 transition-all duration-200 shadow-sm">
                  <Upload className="w-7 h-7 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">
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
          {currentImage && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openImageViewer}
                className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-emerald-200 transition-colors shadow-xs cursor-pointer"
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
        </div>

        {/* Active Pill Badge matching Screenshot */}
        <div className={`w-full py-2.5 px-4 rounded-xl font-bold text-center text-sm shadow-sm transition-colors ${
          formData.status === 'ACTIVE'
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-400 text-white'
        }`}>
          {formData.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </div>

        {/* Key Summary Labels matching Screenshot */}
        <div className="space-y-3 pt-3 text-sm border-t border-gray-100 w-full text-left">
          <div>
            <div className="text-xs text-gray-400 font-semibold">Supplier Name</div>
            <div className="font-bold text-gray-900">{formData.name || 'New Supplier S1'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400 font-semibold">Business Category</div>
            <div className="font-bold text-gray-900">
              {formData.categoriesList?.join(', ') || formData.businessCategory || 'Supplier'}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 font-semibold">Vendor Code</div>
            <div className="font-bold text-gray-900">{formData.supplierCode || 'SUP-001'}</div>
          </div>
        </div>
      </div>
    );
  };

  const buildPayload = (): Partial<Supplier> => {
    return {
      supplierCode: formData.supplierCode || undefined,
      name: formData.name?.trim() || '',
      status: formData.status || 'ACTIVE',
      businessCategory: formData.categoriesList?.join(', ') || formData.businessCategory || undefined,
      businessDescription: formData.businessDescription || undefined,
      contactPerson: formData.contactPerson || undefined,
      phone: formData.phone?.trim() ? formData.phone.trim() : undefined,
      fax: formData.fax || undefined,
      website: formData.website || undefined,
      primaryCurrency: formData.primaryCurrency || 'INR',
      email: formData.email || undefined,
      secondaryEmail: formData.secondaryEmail || undefined,
      gstNumber: formData.gstNumber || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      country: formData.country || 'India',
      postalCode: formData.postalCode || undefined,
      latitude: formData.latitude || undefined,
      longitude: formData.longitude || undefined,
      notes: formData.notes || undefined,
      logoUrl: localPreviewUrl || formData.logoUrl || undefined,
    };
  };

  const handleNextTab = () => {
    if (activeTab === 'General' && !formData.name?.trim()) {
      toast.error('Supplier Name is required');
      return;
    }
    saveDraft();
    const curIdx = supplierTabs.indexOf(activeTab);
    if (curIdx < supplierTabs.length - 1) {
      setActiveTab(supplierTabs[curIdx + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handlePrevTab = () => {
    saveDraft();
    const curIdx = supplierTabs.indexOf(activeTab);
    if (curIdx > 0) {
      setActiveTab(supplierTabs[curIdx - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const targetReturnUrl = (location.state as any)?.returnUrl || sessionStorage.getItem('addSupplierReturnUrl');
      const targetReturnTab = (location.state as any)?.returnTab || sessionStorage.getItem('addSupplierReturnTab') || 'Suppliers';
      if (targetReturnUrl) {
        sessionStorage.removeItem('addSupplierReturnUrl');
        sessionStorage.removeItem('addSupplierReturnTab');
        navigate(targetReturnUrl, { state: { tab: targetReturnTab } });
      } else {
        navigate('/suppliers');
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Supplier Name is required');
      setActiveTab('General');
      return;
    }

    if (formData.phone && formData.phone.length > 0 && formData.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload();

      let createdSupplier: any = null;
      if (isEditMode && id) {
        createdSupplier = await supplierService.updateSupplier(Number(id), payload);
        toast.success('Supplier updated successfully');
      } else {
        createdSupplier = await supplierService.createSupplier(payload);
        toast.success('Supplier created successfully');
      }
      sessionStorage.removeItem('supplier_page_draft');

      const targetReturnUrl = (location.state as any)?.returnUrl || sessionStorage.getItem('addSupplierReturnUrl');
      const targetReturnTab = (location.state as any)?.returnTab || sessionStorage.getItem('addSupplierReturnTab') || 'Suppliers';
      sessionStorage.removeItem('addSupplierReturnUrl');
      sessionStorage.removeItem('addSupplierReturnTab');

      if (targetReturnUrl) {
        navigate(targetReturnUrl, {
          state: {
            tab: targetReturnTab,
            newSupplier: createdSupplier || { ...payload, name: payload.name || formData.name }
          }
        });
      } else {
        navigate('/suppliers');
      }
    } catch (err: any) {
      console.error('Failed to save supplier:', err);
      toast.error(err?.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const targetReturnUrl = (location.state as any)?.returnUrl || sessionStorage.getItem('addSupplierReturnUrl');
              const targetReturnTab = (location.state as any)?.returnTab || sessionStorage.getItem('addSupplierReturnTab') || 'Suppliers';
              if (targetReturnUrl) {
                sessionStorage.removeItem('addSupplierReturnUrl');
                sessionStorage.removeItem('addSupplierReturnTab');
                navigate(targetReturnUrl, { state: { tab: targetReturnTab } });
              } else {
                navigate('/suppliers');
              }
            }}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {isEditMode ? (formData.name || 'Edit Supplier') : 'Add Supplier'}
              </h1>
              {formData.supplierCode && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {formData.supplierCode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Centralized profile, contact credentials, catalog spares, and locations</p>
          </div>
        </div>

        {/* Action controls top right */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const targetReturnUrl = (location.state as any)?.returnUrl || sessionStorage.getItem('addSupplierReturnUrl');
              const targetReturnTab = (location.state as any)?.returnTab || sessionStorage.getItem('addSupplierReturnTab') || 'Suppliers';
              if (targetReturnUrl) {
                sessionStorage.removeItem('addSupplierReturnUrl');
                sessionStorage.removeItem('addSupplierReturnTab');
                navigate(targetReturnUrl, { state: { tab: targetReturnTab } });
              } else {
                navigate('/suppliers');
              }
            }}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>

          {/* Map Button */}
          <button
            onClick={() => {
              setActiveTab('Location');
            }}
            className="flex items-center gap-1.5 h-[38px] px-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all shadow-xs cursor-pointer"
          >
            <MapPin size={16} className="text-rose-500 fill-rose-500" />
            <span>Map</span>
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 h-[38px] px-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all shadow-xs cursor-pointer"
          >
            <Printer size={16} className="text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Unified Tabbed Layout matching Machine & Spare Management */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* Left Profile Card */}
        <div className="w-full lg:w-64 shrink-0">
          {renderProfileCard()}
        </div>

        {/* Right Main Tabbed Container matching Machine Management */}
        <div className="flex-1 w-full bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden min-h-[550px] flex flex-col">
          {/* Top Tabs Bar */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1">
            {(['General', 'Location', 'Spares', 'Documents', 'Log'] as TabType[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
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

          {/* Tab Contents */}
          <div className="p-6 md:p-8 flex-1">
            {/* TAB 1: GENERAL (Merged Basic Details + Contact & Compliance) */}
            {activeTab === 'General' && (
              <div className="space-y-6">
                {/* Basic Details Section */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    {/* Supplier Name */}
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Supplier Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Supplier Name"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder-gray-400"
                      />
                    </div>

                    {/* QR Code Placeholder */}
                    <div className="flex flex-col items-center justify-center p-2 text-gray-400 border border-gray-200 rounded-xl bg-gray-50 shrink-0 w-24 h-24">
                      <QrCode size={32} className="text-gray-600 mb-1" />
                      <span className="text-[10px] font-bold text-gray-600">QR Code</span>
                      {formData.supplierCode && (
                        <span className="text-[9px] font-mono text-gray-400">{formData.supplierCode}</span>
                      )}
                    </div>
                  </div>

                  {/* Change Status Dropdown */}
                  <div className="w-full sm:w-1/2">
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Change Status
                    </label>
                    <div className="relative">
                      <select
                        value={formData.status || 'ACTIVE'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none cursor-pointer pr-10"
                      >
                        <option value="ACTIVE" className="text-emerald-600 font-bold">Active</option>
                        <option value="INACTIVE" className="text-gray-600 font-bold">Inactive</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                    </div>
                  </div>

                  {/* Business Description */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Business Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.businessDescription || ''}
                      onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                      placeholder="Description"
                      className="w-full border border-gray-400 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none placeholder-gray-400"
                    />
                  </div>

                  {/* Business Category & Vendor Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Business Category Dropdown */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Business Category
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 bg-white flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <span className="truncate">
                          {formData.categoriesList && formData.categoriesList.length > 0
                            ? formData.categoriesList.join(', ')
                            : 'Select'}
                        </span>
                        <ChevronDown size={18} className="text-gray-600 shrink-0 ml-2" />
                      </button>

                      {/* Multiselect Popup */}
                      {isCategoryDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 z-30 space-y-2">
                          <div className="text-xs font-bold text-gray-800 px-2 py-1 border-b border-gray-100">
                            Business Category
                          </div>
                          {categoryOptions.map((cat) => {
                            const isSelected = (formData.categoriesList || []).includes(cat);
                            return (
                              <div
                                key={cat}
                                onClick={() => handleCategoryToggle(cat)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-300 hover:bg-emerald-50/50 cursor-pointer transition-colors"
                              >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'border-sky-500 bg-sky-500' : 'border-gray-400'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{cat}</span>
                              </div>
                            );
                          })}
                          <div className="pt-2 text-right">
                            <button
                              type="button"
                              onClick={() => setIsCategoryDropdownOpen(false)}
                              className="text-xs font-bold text-emerald-600 hover:underline px-2 py-1"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Vendor Code */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Vendor Code
                      </label>
                      <input
                        type="text"
                        value={formData.supplierCode || ''}
                        onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                        placeholder="Select"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Details Section */}
                <div className="pt-6 border-t border-gray-100 space-y-6">
                  <h4 className="text-xs font-bold text-gray-400 tracking-wide uppercase">
                    Contact Details
                  </h4>

                  {/* Row 1: Primary Contact, Phone, Fax */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Primary Contact
                      </label>
                      <input
                        type="text"
                        value={formData.contactPerson || ''}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        placeholder="Primary Contact"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Phone
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.phone || ''}
                        onChange={(e) => {
                          const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, phone: onlyDigits });
                        }}
                        placeholder="10-digit Phone Number"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Fax
                      </label>
                      <input
                        type="text"
                        value={formData.fax || ''}
                        onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                        placeholder="Fax"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Row 2: Web Site, Primary Currency, GST Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Web Site
                      </label>
                      <input
                        type="text"
                        value={formData.website || ''}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="www.website.com"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Primary Currency
                      </label>
                      <div className="relative">
                        <select
                          value={formData.primaryCurrency || 'INR'}
                          onChange={(e) => setFormData({ ...formData, primaryCurrency: e.target.value })}
                          className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none cursor-pointer pr-10"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="AED">AED</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        GST Number
                      </label>
                      <input
                        type="text"
                        value={formData.gstNumber || ''}
                        onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                        placeholder="GST Number"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Row 3: Primary Email, Secondary Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Primary Email
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email.1@gmail.com"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Secondary Email
                      </label>
                      <input
                        type="email"
                        value={formData.secondaryEmail || ''}
                        onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })}
                        placeholder="email.2@gmail.com"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Row 4: Notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Notes
                    </label>
                    <textarea
                      rows={4}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes"
                      className="w-full border border-gray-400 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}

              {/* TAB 2: LOCATION MATCHING SCREENSHOT */}
              {activeTab === 'Location' && (
                <div className="space-y-6">
                  {/* Address Textarea */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Address
                    </label>
                    <textarea
                      rows={4}
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street name, etc."
                      className="w-full border border-gray-400 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none placeholder-gray-400"
                    />
                  </div>

                  {/* City & State */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        State
                      </label>
                      <div className="relative">
                        <select
                          value={formData.state || ''}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none cursor-pointer pr-10"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Country & Postal Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Country
                      </label>
                      <div className="relative">
                        <select
                          value={formData.country || 'India'}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none cursor-pointer pr-10"
                        >
                          <option value="">Select</option>
                          <option value="India">India</option>
                          <option value="USA">USA</option>
                          <option value="UK">UK</option>
                          <option value="Germany">Germany</option>
                          <option value="UAE">UAE</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={formData.postalCode || ''}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="412566"
                        className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SPARES MATCHING SCREENSHOT 5 */}
              {activeTab === 'Spares' && (
                <div className="space-y-4">
                  {/* Top Toolbar matching Machine Management */}
                  <div className="flex justify-end items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNewSpareForm({ name: '', location: '', inHandQuantity: '' as any, atSourceQuantity: '' as any, minimumQuantity: '' as any, totalStock: 0 });
                        setIsAddSpareModalOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus size={16} className="stroke-[3]" /> Add Spare
                    </button>

                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={spareSearchQuery}
                        onChange={(e) => setSpareSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                      />
                    </div>

                    {selectedSpareIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteSelectedSpares}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete Selected Spares"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Spares Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={supplierSpares.length > 0 && selectedSpareIds.length === supplierSpares.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedSpareIds(supplierSpares.map((s) => s.id));
                                else setSelectedSpareIds([]);
                              }}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-3 text-center">No.</th>
                          <th className="p-3">Location</th>
                          <th className="p-3">Spare Name</th>
                          <th className="p-3 text-center">In Hand Quantity</th>
                          <th className="p-3 text-center">At Source Quantity</th>
                          <th className="p-3 text-center">Minimum Quantity</th>
                          <th className="p-3 text-center">Total Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredSparesList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-10 text-gray-400 font-medium">
                              No spare parts found. Click{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  setNewSpareForm({ name: '', location: '', inHandQuantity: '' as any, atSourceQuantity: '' as any, minimumQuantity: '' as any, totalStock: 0 });
                                  setIsAddSpareModalOpen(true);
                                }}
                                className="text-emerald-600 font-bold hover:underline cursor-pointer"
                              >
                                "+ Add Spare"
                              </button>{' '}
                              to add a spare.
                            </td>
                          </tr>
                        ) : (
                          filteredSparesList.map((item, index) => {
                            const isSelected = selectedSpareIds.includes(item.id);
                            return (
                            <tr 
                              key={item.id} 
                              onClick={() => handleOpenSpare(item)}
                              className="hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedSpareIds((prev) =>
                                      prev.includes(item.id) ? prev.filter((i) => i !== item.id) : [...prev, item.id]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded-xs border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-center font-medium">{index + 1}</td>
                              <td className="p-3 font-medium text-gray-700">{item.location || item.stockLocation || 'Main Store'}</td>
                              <td className="p-3 font-semibold text-gray-800">{item.partName || item.name || 'Spare Name'}</td>
                              <td className="p-3 text-center font-bold text-gray-700">{item.inHandQuantity ?? 0}</td>
                              <td className="p-3 text-center font-bold text-gray-700">{item.atSourceQuantity ?? 0}</td>
                              <td className="p-3 text-center font-bold text-gray-700">{item.minimumQuantity ?? 0}</td>
                              <td className="p-3 text-center font-bold text-emerald-600">{item.totalStock ?? item.stockQuantity ?? 0}</td>
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Spare Modal matching Screenshot 6 */}
                  {isAddSpareModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                      <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 border border-gray-100">
                        {/* Header with back arrow */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              type="button"
                              onClick={() => setIsAddSpareModalOpen(false)}
                              className="text-emerald-800 hover:text-emerald-900 transition-colors p-1 rounded-full hover:bg-emerald-50 cursor-pointer"
                            >
                              <ArrowLeft size={22} strokeWidth={2.5} />
                            </button>
                            <h3 className="text-xl font-bold text-emerald-950 tracking-tight">
                              Add Spare
                            </h3>
                          </div>
                          <p className="text-xs font-semibold text-gray-500 pl-8">
                            Asset : {formData.name || 'Supplier Name S1'}
                          </p>
                        </div>

                        {/* Location Dropdown / Picker */}
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1.5">
                            Location
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              readOnly
                              value={newSpareForm.location || ''}
                              onClick={() => setIsLocationPickerOpen(true)}
                              placeholder="Select Location"
                              className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer pr-10"
                            />
                            <ChevronDown
                              size={18}
                              onClick={() => setIsLocationPickerOpen(true)}
                              className="absolute right-3.5 text-gray-600 cursor-pointer pointer-events-none"
                            />
                          </div>
                        </div>

                        {/* Spare Name & Minimum Quantity */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-xs font-bold text-gray-800">
                                Spare Name
                              </label>
                              <button
                                type="button"
                                onClick={handleNavigateToCreateSpare}
                                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer hover:underline"
                              >
                                <Plus size={13} className="stroke-[2.5]" /> Add Spare
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  readOnly
                                  value={newSpareForm.name || ''}
                                  onClick={() => setIsSparePickerOpen(true)}
                                  placeholder="Select Spare"
                                  className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer pr-10"
                                />
                                <ChevronDown
                                  size={18}
                                  onClick={() => setIsSparePickerOpen(true)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 cursor-pointer pointer-events-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleNavigateToCreateSpare}
                                title="Add spare in Spare Management"
                                className="h-[46px] px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              >
                                <Plus size={15} className="stroke-[3]" /> Add
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                              Minimum Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              onFocus={(e) => {
                                if (e.target.value === '0') e.target.select();
                              }}
                              onClick={(e) => {
                                if (e.currentTarget.value === '0') e.currentTarget.select();
                              }}
                              value={newSpareForm.minimumQuantity !== undefined && newSpareForm.minimumQuantity !== null ? newSpareForm.minimumQuantity : ''}
                              onChange={(e) => setNewSpareForm({ ...newSpareForm, minimumQuantity: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) as any })}
                              className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                            />
                          </div>
                        </div>

                        {/* In Hand Quantity & At Source Quantity */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                              In Hand Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              onFocus={(e) => {
                                if (e.target.value === '0') e.target.select();
                              }}
                              onClick={(e) => {
                                if (e.currentTarget.value === '0') e.currentTarget.select();
                              }}
                              value={newSpareForm.inHandQuantity !== undefined && newSpareForm.inHandQuantity !== null ? newSpareForm.inHandQuantity : ''}
                              onChange={(e) => setNewSpareForm({ ...newSpareForm, inHandQuantity: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) as any })}
                              className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                              At Source Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              onFocus={(e) => {
                                if (e.target.value === '0') e.target.select();
                              }}
                              onClick={(e) => {
                                if (e.currentTarget.value === '0') e.currentTarget.select();
                              }}
                              value={newSpareForm.atSourceQuantity !== undefined && newSpareForm.atSourceQuantity !== null ? newSpareForm.atSourceQuantity : ''}
                              onChange={(e) => setNewSpareForm({ ...newSpareForm, atSourceQuantity: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) as any })}
                              className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                            />
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={handleAddSpareRecord}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-2.5 rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer min-w-[130px]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DOCUMENTS MATCHING SCREENSHOT 7 */}
              {activeTab === 'Documents' && (
                <div className="space-y-4">
                  {/* Top Toolbar matching Machine Management */}
                  <div className="flex justify-end items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddDocModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus size={16} className="stroke-[3]" /> Add Document
                    </button>

                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                      />
                    </div>

                    {selectedDocIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteSelectedDocs}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete Selected Documents"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Documents Table List */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={filteredDocs.length > 0 && selectedDocIds.length === filteredDocs.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedDocIds(filteredDocs.map((d) => d.id));
                                else setSelectedDocIds([]);
                              }}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-3 text-center">No.</th>
                          <th className="p-3">Document Name</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Uploaded Date</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredDocs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                              No documents found.
                            </td>
                          </tr>
                        ) : (
                          filteredDocs.map((doc, index) => {
                            const isSelected = selectedDocIds.includes(doc.id);
                            return (
                              <tr key={doc.id} className={`hover:bg-blue-50/40 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}>
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedDocIds((prev) =>
                                        prev.includes(doc.id) ? prev.filter((i) => i !== doc.id) : [...prev, doc.id]
                                      );
                                    }}
                                    className="w-3.5 h-3.5 text-emerald-600 rounded-xs border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3 text-center font-medium">{index + 1}</td>
                                <td className="p-3 font-semibold text-gray-800 flex items-center gap-2">
                                  <FileText size={16} className="text-emerald-600 shrink-0" />
                                  <span>{doc.name}</span>
                                </td>
                                <td className="p-3 font-medium text-emerald-800">
                                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                    {doc.type}
                                  </span>
                                </td>
                                <td className="p-3 text-gray-500">{doc.uploadedAt}</td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSupplierDocuments(supplierDocuments.filter((d) => d.id !== doc.id))}
                                    className="text-red-500 hover:text-red-700 p-1 rounded-md"
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

                  {/* Add Document Modal */}
                  {isAddDocModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-gray-100">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                          <button
                            type="button"
                            onClick={() => setIsAddDocModalOpen(false)}
                            className="text-emerald-800 hover:text-emerald-900 transition-colors p-1 rounded-full hover:bg-emerald-50 cursor-pointer"
                          >
                            <ArrowLeft size={20} strokeWidth={2.5} />
                          </button>
                          <h3 className="text-lg font-bold text-gray-900">Add Document</h3>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Document Title *</label>
                          <input
                            type="text"
                            value={docName}
                            onChange={(e) => setDocName(e.target.value)}
                            placeholder="Document Title"
                            className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          >
                            <option value="File">File</option>
                            <option value="Link">Link</option>
                            <option value="Note">Note</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-3">
                          <button
                            type="button"
                            onClick={() => setIsAddDocModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!docName.trim()) return toast.error('Enter document title');
                              setSupplierDocuments([
                                ...supplierDocuments,
                                { id: Date.now(), name: docName, type: docType, uploadedAt: new Date().toISOString().slice(0, 10) },
                              ]);
                              setDocName('');
                              setIsAddDocModalOpen(false);
                              toast.success('Added document');
                            }}
                            className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-blue-700"
                          >
                            Upload
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: LOG */}
              {activeTab === 'Log' && (
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-gray-400 tracking-wide uppercase">
                    Audit Log & Activity History
                  </h4>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                          <th className="p-3">Action</th>
                          <th className="p-3">Date & Time</th>
                          <th className="p-3">User</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        <tr className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3 font-semibold text-emerald-700">Created Supplier Record</td>
                          <td className="p-3">{new Date().toLocaleDateString()}</td>
                          <td className="p-3 font-medium">Admin User</td>
                        </tr>
                        <tr className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3 font-semibold text-blue-700">Updated Status to Active</td>
                          <td className="p-3">{new Date().toLocaleDateString()}</td>
                          <td className="p-3 font-medium">Admin User</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      {/* Select Location Picker Modal matching Screenshot 8 */}
      <SelectLocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        onSelectLocation={(loc) => {
          setNewSpareForm((prev) => ({ ...prev, location: loc.location }));
        }}
      />

      {/* Select Spare Picker Modal matching Screenshot 8 */}
      <SelectSparePickerModal
        isOpen={isSparePickerOpen}
        onClose={() => setIsSparePickerOpen(false)}
        onAddNewSpare={handleNavigateToCreateSpare}
        onSelectSpare={(spr) => {
          setNewSpareForm((prev) => ({ ...prev, name: spr.spareName, location: spr.location || prev.location }));
        }}
      />

      {/* IMAGE VIEWER / EDIT MODAL matching Spare Management */}
      {isImageViewerOpen && (localPreviewUrl || formData.logoUrl) && (() => {
        const modalImg = localPreviewUrl || formData.logoUrl;

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
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {formData.name ? `${formData.name} - Logo Preview` : 'Supplier Logo Preview'}
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
                    src={modalImg}
                    alt={formData.name || 'Supplier Logo'}
                    className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-2xl"
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
                  <button
                    type="button"
                    onClick={() => {
                      setImageRotation(0);
                      setImageZoom(1);
                    }}
                    className="p-1.5 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
                    title="Reset view"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImageViewerOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-sky-600" />
                    <span>Replace Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImageViewerOpen(false)}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
