import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Printer, RefreshCw, Filter, MapPin, ChevronDown, Check, Upload, 
  Image as ImageIcon, QrCode, Plus, Trash2, FileText, Search, ExternalLink 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supplierService, type Supplier } from '../../../services/supplierService';
import { SelectLocationPickerModal } from '../../../components/4m/SelectLocationPickerModal';
import { SelectSparePickerModal } from '../../../components/4m/SelectSparePickerModal';
import { INDIAN_STATES } from '../../../constants/states';

type TabType = 'General' | 'Location' | 'Spares' | 'Documents' | 'Log';

export const AddSupplierPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [step, setStep] = useState<1 | 2>(isEditMode ? 2 : 1);
  const [activeTab, setActiveTab] = useState<TabType>('General');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
  const [newSpareForm, setNewSpareForm] = useState({
    name: '',
    location: '',
    inHandQuantity: 0,
    atSourceQuantity: 0,
    minimumQuantity: 0,
    totalStock: 0,
  });

  const filteredSparesList = supplierSpares.filter((item) =>
    (item.name || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
    (item.location || '').toLowerCase().includes(spareSearchQuery.toLowerCase())
  );

  const handleAddSpareRecord = () => {
    if (!newSpareForm.name.trim()) {
      toast.error('Please enter a spare part name');
      return;
    }
    const newRecord = {
      id: Date.now(),
      name: newSpareForm.name,
      location: newSpareForm.location || '',
      inHandQuantity: newSpareForm.inHandQuantity || 0,
      atSourceQuantity: newSpareForm.atSourceQuantity || 0,
      minimumQuantity: newSpareForm.minimumQuantity || 0,
      totalStock: newSpareForm.totalStock || 0,
    };
    setSupplierSpares([...supplierSpares, newRecord]);
    setIsAddSpareModalOpen(false);
    setNewSpareForm({ name: '', location: '', inHandQuantity: 0, atSourceQuantity: 0, minimumQuantity: 0, totalStock: 0 });
    toast.success('Spare part added to supplier catalog');
  };

  const handleDeleteSelectedSpares = () => {
    if (selectedSpareIds.length === 0) {
      toast.error('Select at least one spare part to delete');
      return;
    }
    setSupplierSpares(supplierSpares.filter((s) => !selectedSpareIds.includes(s.id)));
    setSelectedSpareIds([]);
    toast.success('Deleted selected spare parts');
  };

  const [supplierDocuments, setSupplierDocuments] = useState<any[]>([]);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('File');
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep = () => {
    if (!formData.name?.trim()) {
      toast.error('Supplier Name is required');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Supplier Name is required');
      setStep(1);
      return;
    }

    if (formData.phone && formData.phone.length > 0 && formData.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Supplier> = {
        supplierCode: formData.supplierCode,
        name: formData.name,
        status: formData.status || 'ACTIVE',
        businessCategory: formData.categoriesList?.join(', ') || formData.businessCategory,
        businessDescription: formData.businessDescription,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        fax: formData.fax,
        website: formData.website,
        primaryCurrency: formData.primaryCurrency || 'INR',
        email: formData.email,
        secondaryEmail: formData.secondaryEmail,
        gstNumber: formData.gstNumber,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country || 'India',
        postalCode: formData.postalCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        notes: formData.notes,
      };

      if (isEditMode && id) {
        await supplierService.updateSupplier(Number(id), payload);
        toast.success('Supplier updated successfully');
      } else {
        await supplierService.createSupplier(payload);
        toast.success('Supplier created successfully');
      }
      navigate('/suppliers');
    } catch (err: any) {
      console.error('Failed to save supplier:', err);
      toast.error(err?.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSpare = () => {
    if (!newSpareName.trim()) {
      toast.error('Enter spare name');
      return;
    }
    setSupplierSpares([
      ...supplierSpares,
      {
        id: Date.now(),
        name: newSpareName,
        code: `PRT-${Math.floor(100 + Math.random() * 900)}`,
        category: 'General',
        vendorPrice: Number(newSparePrice) || 500,
        stock: 10,
      },
    ]);
    setNewSpareName('');
    setNewSparePrice('');
    toast.success('Added spare part link');
  };

  const handleAddDoc = () => {
    if (!docName.trim()) {
      toast.error('Enter document name');
      return;
    }
    setSupplierDocuments([
      ...supplierDocuments,
      {
        id: Date.now(),
        name: docName,
        type: docType,
        uploadedAt: new Date().toISOString().slice(0, 10),
      },
    ]);
    setDocName('');
    toast.success('Added document record');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Controls Bar matching Screenshot 3 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Pages / Suppliers / New Supplier {step === 2 ? `/ ${activeTab}` : ''}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => (step === 2 ? setStep(1) : navigate('/suppliers'))}
              className="text-emerald-950 hover:text-emerald-800 transition-colors p-1 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <ArrowLeft size={24} strokeWidth={2.5} />
            </button>
            <h1 className="text-2xl font-bold text-emerald-950 tracking-tight">
              {isEditMode ? `Edit Supplier S${step}` : `New Supplier S${step}`}
            </h1>
          </div>
        </div>

        {/* Action icons top right matching Screenshot 3 */}
        <div className="flex items-center gap-2">
          {/* Map Button */}
          <button
            onClick={() => setActiveTab('Location')}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-gray-200 cursor-pointer"
          >
            <MapPin size={18} className="text-red-500 fill-red-500" />
            <span>Map</span>
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-gray-200 cursor-pointer"
          >
            <Printer size={18} />
            <span>Print</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              if (isEditMode && id) fetchSupplierDetails(Number(id));
              else fetchNextCode();
            }}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Filter Button */}
          <button
            className="p-2.5 rounded-xl bg-[#00a651] text-white hover:bg-[#008f44] transition-all cursor-pointer shadow-xs"
            title="Filter Options"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {step === 1 ? (
        /* STEP 1 (S1) - Basic Info & Logo Entry */
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-md p-6 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Image / Logo Card & Status Pill */}
            <div className="md:col-span-4 flex flex-col items-center justify-center pt-2">
              <label className="relative group cursor-pointer w-48 h-56 rounded-2xl border-2 border-gray-300 border-dashed hover:border-emerald-500 bg-gray-50 flex flex-col items-center justify-center overflow-hidden transition-all shadow-xs">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Supplier Logo"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-emerald-600 transition-colors p-4 text-center">
                    <ImageIcon size={40} strokeWidth={1.5} />
                    <span className="text-xs font-semibold">Upload Logo / Photo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {/* Status Green Badge */}
              <div className="mt-6 w-48 text-center">
                <span
                  className={`inline-block w-full text-center py-2 px-8 rounded-2xl font-bold text-sm text-white shadow-md transition-all ${
                    formData.status === 'ACTIVE'
                      ? 'bg-[#00e600] text-white shadow-green-200'
                      : 'bg-gray-400 text-white'
                  }`}
                >
                  {formData.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Right Fields Form */}
            <div className="md:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                {/* Supplier Name */}
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    Supplier Name
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

              {/* Next Button */}
              <div className="pt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-[#00a651] hover:bg-[#008f44] text-white px-12 py-3 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer min-w-[140px]"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STEP 2 (S2) - TABBED VIEW MATCHING SCREENSHOT 3 */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar Summary Card matching Screenshot 3 */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-200/80 shadow-md p-6 flex flex-col items-center text-center">
            {/* Logo placeholder */}
            <div className="w-40 h-48 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden mb-4 shadow-xs">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Supplier Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon size={48} className="text-gray-300" />
              )}
            </div>

            {/* Active Pill Badge */}
            <span className="w-40 text-center py-1.5 px-6 rounded-2xl font-bold text-sm bg-[#00e600] text-white shadow-sm mb-6">
              {formData.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </span>

            {/* Labels & Values matching Screenshot 3 */}
            <div className="w-full text-left space-y-4 text-xs font-semibold px-2 mb-8">
              <div>
                <p className="text-gray-400 font-medium mb-0.5">Supplier Name</p>
                <p className="text-gray-900 font-bold text-sm">{formData.name || 'New Supplier S1'}</p>
              </div>

              <div>
                <p className="text-gray-400 font-medium mb-0.5">Business Category</p>
                <p className="text-gray-900 font-bold text-sm">
                  {formData.categoriesList?.join(', ') || formData.businessCategory || 'Business Category'}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium mb-0.5">Vendor Code</p>
                <p className="text-gray-900 font-bold text-sm">{formData.supplierCode || 'Vendor Code'}</p>
              </div>
            </div>

            {/* Left Action Buttons: Save & Back matching Screenshot 3 */}
            <div className="w-full flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="w-44 bg-[#00a651] hover:bg-[#008f44] text-white py-2.5 px-8 rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-44 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2.5 px-8 rounded-2xl font-bold text-sm transition-all cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>

          {/* Right Main Tabbed Container matching Screenshot 3 */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-200/80 shadow-md overflow-hidden min-h-[520px] flex flex-col">
            {/* Top 5 Tabs Bar matching Screenshot 3 */}
            <div className="flex items-center border-b border-gray-200 bg-gray-100/60 overflow-x-auto">
              {(['General', 'Location', 'Spares', 'Documents', 'Log'] as TabType[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-3.5 text-sm font-bold transition-all cursor-pointer border-r border-gray-200/80 shrink-0 ${
                      isActive
                        ? 'bg-[#00a651] text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-gray-200/70 text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="p-6 md:p-8 flex-1">
              {/* TAB 1: GENERAL (Contact details matching Screenshot 3) */}
              {activeTab === 'General' && (
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-gray-400 tracking-wide uppercase">
                    Contact
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

                  {/* Row 2: Web Site, Primary Currency */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
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
                        placeholder="email.1@gmail.com"
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
                  {/* Top Toolbar Bar matching Screenshot 5 */}
                  <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
                    {/* Search Input Box */}
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        value={spareSearchQuery}
                        onChange={(e) => setSpareSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full bg-gray-100 border border-gray-200 rounded-2xl pl-4 pr-10 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                      />
                      <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-600 stroke-[2.5]" />
                    </div>

                    {/* + Add Button */}
                    <button
                      type="button"
                      onClick={() => navigate('/spares/new')}
                      className="flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-2 rounded-2xl text-xs transition-all cursor-pointer shadow-2xs"
                      title="Go to Spare Management"
                    >
                      <Plus size={16} strokeWidth={2.5} className="text-sky-600" />
                      <span>Add</span>
                    </button>

                    {/* 🗑 Delete Icon Button */}
                    <button
                      type="button"
                      onClick={handleDeleteSelectedSpares}
                      disabled={selectedSpareIds.length === 0}
                      className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                        selectedSpareIds.length > 0
                          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 shadow-2xs'
                          : 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
                      }`}
                      title="Delete Selected Spares"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>

                  {/* Spares Table matching Screenshot 5 */}
                  <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-200/80 text-gray-700 font-bold uppercase border-b border-gray-200">
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={supplierSpares.length > 0 && selectedSpareIds.length === supplierSpares.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedSpareIds(supplierSpares.map((s) => s.id));
                                else setSelectedSpareIds([]);
                              }}
                              className="w-3.5 h-3.5 text-emerald-600 rounded-xs border-gray-300 focus:ring-emerald-500 cursor-pointer"
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
                      <tbody className="divide-y divide-gray-100 text-gray-600">
                        {filteredSparesList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-10 text-gray-400 font-medium">
                              No spare parts found. Click <button type="button" onClick={() => navigate('/spares/new')} className="text-emerald-600 font-bold hover:underline cursor-pointer">"+ Add"</button> to open Spare Management.
                            </td>
                          </tr>
                        ) : (
                          filteredSparesList.map((item, index) => {
                            const isSelected = selectedSpareIds.includes(item.id);
                            return (
                              <tr key={item.id} className={`hover:bg-emerald-50/30 transition-colors ${isSelected ? 'bg-emerald-50/60' : ''}`}>
                                <td className="p-3 text-center">
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
                                <td className="p-3 font-medium text-gray-700">{item.location || 'Location'}</td>
                                <td className="p-3 font-semibold text-gray-800">{item.name || 'Spare Name'}</td>
                                <td className="p-3 text-center font-bold text-gray-700">{item.inHandQuantity ?? 23}</td>
                                <td className="p-3 text-center font-bold text-gray-700">{item.atSourceQuantity ?? 23}</td>
                                <td className="p-3 text-center font-bold text-gray-700">{item.minimumQuantity ?? 23}</td>
                                <td className="p-3 text-center font-bold text-gray-900">{item.totalStock ?? 23}</td>
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
                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                              Spare Name
                            </label>
                            <div className="relative flex items-center">
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
                                className="absolute right-3.5 text-gray-600 cursor-pointer pointer-events-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                              Minimum Quantity
                            </label>
                            <input
                              type="number"
                              value={newSpareForm.minimumQuantity}
                              onChange={(e) => setNewSpareForm({ ...newSpareForm, minimumQuantity: Number(e.target.value) })}
                              placeholder="23"
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
                              value={newSpareForm.inHandQuantity}
                              onChange={(e) => setNewSpareForm({ ...newSpareForm, inHandQuantity: Number(e.target.value) })}
                              placeholder="23"
                              className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                              At Source Quantity
                            </label>
                            <input
                              type="number"
                              value={newSpareForm.atSourceQuantity}
                              onChange={(e) => setNewSpareForm({ ...newSpareForm, atSourceQuantity: Number(e.target.value) })}
                              placeholder="22"
                              className="w-full border border-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                            />
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={handleAddSpareRecord}
                            className="bg-[#00a651] hover:bg-[#008f44] text-white px-10 py-2.5 rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer min-w-[130px]"
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
                  {/* Top Toolbar Bar matching Screenshot 7 */}
                  <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
                    {/* + Add Button */}
                    <button
                      type="button"
                      onClick={() => setIsAddDocModalOpen(true)}
                      className="flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-2 rounded-2xl text-xs transition-all cursor-pointer shadow-2xs"
                    >
                      <Plus size={16} strokeWidth={2.5} className="text-sky-600" />
                      <span>Add</span>
                    </button>

                    {/* 🗑 Delete Icon Button */}
                    <button
                      type="button"
                      onClick={handleDeleteSelectedDocs}
                      disabled={selectedDocIds.length === 0}
                      className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                        selectedDocIds.length > 0
                          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 shadow-2xs'
                          : 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
                      }`}
                      title="Delete Selected Documents"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>

                  {/* Documents Table List */}
                  <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-200/80 text-gray-700 font-bold uppercase border-b border-gray-200">
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={supplierDocuments.length > 0 && selectedDocIds.length === supplierDocuments.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedDocIds(supplierDocuments.map((d) => d.id));
                                else setSelectedDocIds([]);
                              }}
                              className="w-3.5 h-3.5 text-emerald-600 rounded-xs border-gray-300 focus:ring-emerald-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-3 text-center">No.</th>
                          <th className="p-3">Document Name</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Uploaded Date</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-600">
                        {supplierDocuments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-400 font-medium">
                              No documents uploaded. Click "+ Add" to upload documents.
                            </td>
                          </tr>
                        ) : (
                          supplierDocuments.map((doc, index) => {
                            const isSelected = selectedDocIds.includes(doc.id);
                            return (
                              <tr key={doc.id} className={`hover:bg-emerald-50/30 transition-colors ${isSelected ? 'bg-emerald-50/60' : ''}`}>
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
                            className="bg-[#00a651] text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-[#008f44]"
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

                  <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 text-xs font-bold uppercase border-b border-gray-200">
                          <th className="p-3">Action</th>
                          <th className="p-3">Date & Time</th>
                          <th className="p-3">User</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                        <tr>
                          <td className="p-3 font-semibold text-emerald-700">Created Supplier Record</td>
                          <td className="p-3">{new Date().toLocaleDateString()}</td>
                          <td className="p-3 font-medium">Admin User</td>
                        </tr>
                        <tr>
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
      )}
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
        onSelectSpare={(spr) => {
          setNewSpareForm((prev) => ({ ...prev, name: spr.spareName, location: spr.location || prev.location }));
        }}
      />
    </div>
  );
};
