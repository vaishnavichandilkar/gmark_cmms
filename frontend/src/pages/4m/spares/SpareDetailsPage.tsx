import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, Printer, RotateCw, SlidersHorizontal, Plus, 
  Trash2, Search, QrCode, Save, ArrowLeft, Eye, X, FileText, ChevronDown, Calendar
} from 'lucide-react';
import { 
  spareService, type SparePart, type LocationStock, type MachineUsage, 
  type SpecificationField, type WarrantyItem, type SupplierItem, type SpareDocument, type SpareLogItem 
} from '../../../services/spareService';
import toast from 'react-hot-toast';

type TabType = 'General' | 'Stock' | 'Machines List' | 'Specification' | 'Warranties' | 'Suppliers' | 'Documents' | 'Log';

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
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [activeTab, setActiveTab] = useState<TabType>('General');
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<SparePart>>({
    partCode: '',
    partName: '',
    category: '',
    subCategory: '',
    stockQuantity: 0,
    inHandQuantity: 0,
    atSourceQuantity: 0,
    minimumQuantity: 0,
    totalStock: 0,
    unitCost: 0,
    rate: 0,
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
  const [newStockLoc, setNewStockLoc] = useState({ location: '', inHandQuantity: 0, atSourceQuantity: 0, minimumQuantity: 0 });
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // Stock Locations Selector Modal State
  const [isLocationPickerModalOpen, setIsLocationPickerModalOpen] = useState(false);
  const [locationPickerSearch, setLocationPickerSearch] = useState('');
  const [availableLocations, setAvailableLocations] = useState<LocationPickerItem[]>([]);

  // Stock History Modal State
  const [isStockHistoryModalOpen, setIsStockHistoryModalOpen] = useState(false);
  const [stockHistoryRecords] = useState<StockHistoryRecord[]>([]);

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

  // Suppliers Tab State
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', businessCategory: '', reorderDays: 0, vendorPrice: 0 });
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');

  const [isSupplierPickerModalOpen, setIsSupplierPickerModalOpen] = useState(false);
  const [supplierPickerSearch, setSupplierPickerSearch] = useState('');
  const [availableSuppliersList, setAvailableSuppliersList] = useState<any[]>([]);

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

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

  const handleChange = (field: keyof SparePart, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.partName?.trim()) {
      toast.error('Please enter a Spare Name');
      return;
    }

    try {
      if (isEditMode && id) {
        await spareService.update(Number(id), formData);
        toast.success('Spare Part updated successfully');
      } else {
        const created = await spareService.create(formData);
        toast.success('New Spare Part created successfully');
        navigate(`/spares/edit/${created.id}`);
      }
    } catch (err) {
      toast.error('Failed to save spare part');
    }
  };

  // Stock Handlers
  const handleAddStockLocation = () => {
    if (!newStockLoc.location.trim()) {
      toast.error('Please select or enter a location');
      return;
    }
    const total = Number(newStockLoc.inHandQuantity) + Number(newStockLoc.atSourceQuantity);
    const newLocObj: LocationStock = {
      id: Date.now().toString(),
      location: newStockLoc.location,
      inHandQuantity: Number(newStockLoc.inHandQuantity),
      atSourceQuantity: Number(newStockLoc.atSourceQuantity),
      minimumQuantity: Number(newStockLoc.minimumQuantity),
      totalStock: total
    };
    setFormData(prev => ({
      ...prev,
      stockLocations: [...(prev.stockLocations || []), newLocObj]
    }));
    setIsAddStockModalOpen(false);
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
    if (newMachineForm.name === 'Select') {
      toast.error('Please select a machine');
      return;
    }
    const newMachineObj: MachineUsage = {
      id: Date.now().toString(),
      location: newMachineForm.location === 'Select' ? 'Facility Name' : newMachineForm.location,
      name: newMachineForm.name,
      quantityUsed: Number(newMachineForm.quantityUsed),
      rate: Number(newMachineForm.rate),
      total: Number(newMachineForm.quantityUsed) * Number(newMachineForm.rate)
    };
    setFormData(prev => ({
      ...prev,
      machinesList: [...(prev.machinesList || []), newMachineObj]
    }));
    setIsAddMachineModalOpen(false);
    setNewMachineForm({ location: 'Select', name: 'Select', quantityUsed: 23, rate: 1000 });
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
    setNewSupplier({ name: 'Select', businessCategory: 'Select', reorderDays: 23, vendorPrice: 1000 });
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

  const tabs: TabType[] = [
    'General',
    'Stock',
    'Machines List',
    'Specification',
    'Warranties',
    'Suppliers',
    'Documents',
    'Log'
  ];

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
            onClick={() => navigate('/spares')}
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
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold border border-gray-200 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Print</span>
          </button>

          <button
            onClick={() => id && loadSpareDetails(Number(id))}
            className="p-2.5 bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 rounded-xl flex items-center justify-center transition-colors shadow-sm"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4 stroke-[2.2]" />
          </button>

          <button
            className="p-2.5 bg-[#00a651] hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-all shadow-sm"
            title="Filter"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT SUMMARY PANEL */}
        <div className="w-full lg:w-64 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-5 shrink-0">
          
          {/* Spare Image Box with Stock Badge */}
          <div className="space-y-3">
            <div className="w-full aspect-square bg-gray-50 rounded-2xl border border-gray-200 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
              <div className="w-16 h-16 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 border border-emerald-100">
                <FileText className="w-8 h-8" />
              </div>
              <span className="text-xs text-gray-400 font-medium">Click to upload image</span>
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>

            {/* Stock Badge - Green filled pill */}
            <div className="bg-[#00a651] text-white py-2 px-4 rounded-xl font-bold text-center text-sm shadow-sm">
              Stock : {formData.stockQuantity ?? 20}
            </div>
          </div>

          {/* Key Summary Labels */}
          <div className="space-y-3 pt-2 text-sm border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-400 font-semibold">Spare Name</div>
              <div className="font-bold text-gray-900">{formData.partName || 'New Spare S1'}</div>
            </div>

            <div>
              <div className="text-xs text-gray-400 font-semibold">Spare Category</div>
              <div className="font-bold text-gray-900">{formData.category || 'Spare Category'}</div>
            </div>

            <div>
              <div className="text-xs text-gray-400 font-semibold">Spare Sub-Category</div>
              <div className="font-bold text-gray-900">{formData.subCategory || 'Spare Sub-Category'}</div>
            </div>
          </div>

          {/* Action Buttons: Save & Back */}
          <div className="space-y-2.5 pt-4">
            <button
              onClick={handleSave}
              className="w-full py-2.5 px-4 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>

            <button
              onClick={() => navigate('/spares')}
              className="w-full py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* RIGHT CONTENT AREA WITH MULTI-TABS */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col min-h-[550px]">
          
          {/* HORIZONTAL TAB HEADERS */}
          <div className="flex items-center overflow-x-auto border-b border-gray-200 bg-gray-50/70 p-2 gap-1 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all rounded-lg ${
                    isActive
                      ? 'bg-[#00a651] text-white shadow-sm font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
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
                      value={formData.inHandQuantity ?? 23}
                      onChange={(e) => handleChange('inHandQuantity', Number(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">At Source Quantity</label>
                    <input
                      type="number"
                      value={formData.atSourceQuantity ?? 22}
                      onChange={(e) => handleChange('atSourceQuantity', Number(e.target.value))}
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
                      value={formData.rate ?? 23.00}
                      onChange={(e) => handleChange('rate', Number(e.target.value))}
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
                      onClick={() => setIsAddStockModalOpen(true)}
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
                              <td className="py-3 px-4 font-medium text-gray-700">{item.startDate}</td>
                              <td className="py-3 px-4 font-medium text-gray-700">{item.expiryDate}</td>
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
                            No supplier entries found. Click <button type="button" onClick={() => navigate('/suppliers/new')} className="text-[#00a651] font-bold hover:underline cursor-pointer">"+ Add"</button> to create a new supplier.
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
              <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Add Specification Field</h2>
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
                className="px-8 py-2.5 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
              >
                Save
              </button>

              <button
                onClick={() => handleSaveSpecificationField(true)}
                className="px-8 py-2.5 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
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
                <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Meter Reading Units</h2>
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
                      className="hover:bg-emerald-50/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
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
              <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Add Meter Reading Unit</h2>
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
                className="px-10 py-2.5 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
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
              <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Stock</h2>
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
                  onClick={() => setIsLocationPickerModalOpen(true)}
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
                    value={newStockLoc.inHandQuantity}
                    onChange={(e) => setNewStockLoc(prev => ({ ...prev, inHandQuantity: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">At Source Quantity</label>
                  <input
                    type="number"
                    value={newStockLoc.atSourceQuantity}
                    onChange={(e) => setNewStockLoc(prev => ({ ...prev, atSourceQuantity: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Minimum Quantity</label>
                <input
                  type="number"
                  value={newStockLoc.minimumQuantity}
                  onChange={(e) => setNewStockLoc(prev => ({ ...prev, minimumQuantity: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleAddStockLocation}
                className="px-10 py-2.5 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
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
                <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Locations</h2>
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
                  {filteredAvailableLocations.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      onClick={() => {
                        setNewStockLoc(prev => ({ ...prev, location: item.location }));
                        setIsLocationPickerModalOpen(false);
                      }}
                      className="hover:bg-emerald-50/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{item.location}</td>
                      <td className="py-3 px-4 text-gray-600">{item.facilityName}</td>
                      <td className="py-3 px-4 font-mono text-gray-600">{item.code}</td>
                    </tr>
                  ))}
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
              <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Stock History</h2>
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
              <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Add Machine</h2>
            </div>

            <div className="text-xs font-semibold text-gray-500">
              Asset : {formData.partName || 'Spare Name S1'}
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Location</label>
                <div 
                  onClick={() => setIsMachineLocationPickerOpen(true)}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <span className={newMachineForm.location !== 'Select' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {newMachineForm.location}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Machine</label>
                <div 
                  onClick={() => setIsMachinePickerModalOpen(true)}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl bg-white flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <span className={newMachineForm.name !== 'Select' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {newMachineForm.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleAddMachineSubmit}
                className="px-10 py-2.5 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
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
                <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Locations</h2>
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
                  {filteredMachineLocations.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      onClick={() => {
                        setNewMachineForm(prev => ({ ...prev, location: item.location }));
                        setIsMachineLocationPickerOpen(false);
                      }}
                      className="hover:bg-emerald-50/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{item.location}</td>
                      <td className="py-3 px-4 text-gray-600">{item.facilityName}</td>
                      <td className="py-3 px-4 font-mono text-gray-600">{item.code}</td>
                    </tr>
                  ))}
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
                <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Machines</h2>
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
                  onClick={() => {
                    const newName = `Machine Name ${availableMachinesList.length + 1}`;
                    setAvailableMachinesList(prev => [...prev, { id: Date.now().toString(), location: 'Location', machineName: newName, code: 'C1354' }]);
                    toast.success('Added machine option');
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
                    <th className="py-2.5 px-4">Machine Name</th>
                    <th className="py-2.5 px-4">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {filteredAvailableMachines.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      onClick={() => {
                        setNewMachineForm(prev => ({ ...prev, name: item.machineName, location: item.location }));
                        setIsMachinePickerModalOpen(false);
                      }}
                      className="hover:bg-emerald-50/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-4 text-gray-600">{item.location}</td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{item.machineName}</td>
                      <td className="py-3 px-4 font-mono text-gray-600">{item.code}</td>
                    </tr>
                  ))}
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
              <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Add Warranty</h2>
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
                      type="text"
                      placeholder="dd-mm-yyyy"
                      value={newWarranty.startDate}
                      onChange={(e) => setNewWarranty(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full pl-4 pr-10 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                    />
                    <Calendar className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1.5">Expiry Date</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="dd-mm-yyyy"
                      value={newWarranty.expiryDate}
                      onChange={(e) => setNewWarranty(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="w-full pl-4 pr-10 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                    />
                    <Calendar className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
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
                className="px-10 py-2.5 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
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
              <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Add Business</h2>
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
                  onClick={() => setIsSupplierPickerModalOpen(true)}
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
                  placeholder="23"
                  value={newSupplier.reorderDays}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, reorderDays: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm font-medium"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleAddSupplier}
                className="px-10 py-2.5 bg-[#00a651] hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
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
                <h2 className="text-2xl font-bold text-[#00a651] tracking-tight">Suppliers</h2>
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
                  {availableSuppliersList
                    .filter(s => s.name.toLowerCase().includes(supplierPickerSearch.toLowerCase()) || s.category.toLowerCase().includes(supplierPickerSearch.toLowerCase()))
                    .map((item, idx) => (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setNewSupplier(prev => ({ ...prev, name: item.name, businessCategory: item.category }));
                          setIsSupplierPickerModalOpen(false);
                        }}
                        className="hover:bg-emerald-50/60 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300" />
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{item.name}</td>
                        <td className="py-3 px-4 text-gray-600">{item.category}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{item.code}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
