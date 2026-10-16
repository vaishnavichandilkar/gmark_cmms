import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { hasTabPermission } from '../../../utils/permissions';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { CustomDatePicker } from '../../../components/shared/CustomDatePicker';
import { ArrowLeft, Search, Plus, Wifi, Activity, ShieldAlert, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { FacilityHierarchyPicker } from '../../../components/4m/FacilityHierarchyPicker';
import { MachineHierarchyPicker } from '../../../components/4m/MachineHierarchyPicker';
import { MachineImageCard } from '../../../components/4m/MachineImageCard';
import { spareService } from '../../../services/spareService';
import { supplierService, Supplier } from '../../../services/supplierService';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { navigateToDeviceDashboard } from '../../../utils/deviceRoutes';
import { BoosterDashboard } from '../../scada/templates/booster/BoosterDashboard';

export function EditMachine() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'General');
  const [saving, setSaving] = useState(false);
  
  const [machineSpares, setMachineSpares] = useState<any[]>([]);
  const [spareSearchQuery, setSpareSearchQuery] = useState('');

  // Handle return from Spares Management with newly created spare
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
    const syncSpare = async () => {
      if (location.state?.newSpare) {
        const spare = location.state.newSpare;
        setMachineSpares(prev => {
          if (prev.some(s => s.id === spare.id)) return prev;
          return [...prev, spare];
        });
      } else if (location.state?.newSpareId) {
        const spareId = Number(location.state.newSpareId);
        try {
          const fetchedSpare = await spareService.getById(spareId);
          if (fetchedSpare) {
            setMachineSpares(prev => {
              if (prev.some(s => s.id === fetchedSpare.id)) return prev;
              return [...prev, fetchedSpare];
            });
          }
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

  const [formData, setFormData] = useState({
    status: 'Online',
    name: '',
    deviceId: '',
    company: '',
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

  const fetchData = async () => {
    try {
      const [deviceRes, facilitiesRes, employeesRes, docsRes, suppliersData] = await Promise.all([
        api.get(`/machines/${id}`),
        api.get('/facilities'),
        api.get('/employees'),
        api.get(`/machines/${id}/documents`).catch(() => ({ data: [] })),
        supplierService.getAll().catch(() => [])
      ]);
      
      const device = deviceRes.data;
      setFacilities(Array.isArray(facilitiesRes.data) ? facilitiesRes.data : []);
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
      setDocuments(docs);

      const photoDoc = docs.find((d: any) => 
        d.type === 'File' && (
          d.name?.toLowerCase().includes('photo') || 
          d.name?.toLowerCase().includes('image') || 
          d.content?.match(/\.(jpg|jpeg|png|webp|gif)/i)
        )
      );
      
      if (device) {
        setFormData(prev => ({
          ...prev,
          status: device.status === 'online' ? 'Online' : 'Offline',
          name: device.name || '',
          deviceId: device.deviceId || '',
          company: device.company || '',
          maintenanceHead: device.maintenanceHead || '',
          machineCode: device.machineCode || '',
          serialNumber: device.serialNumber || '',
          make: device.make || '',
          modelNumber: device.modelNumber || '',
          machineCategory: device.machineCategory || '',
          machineSubCategory: device.machineSubCategory || '',
          description: device.description || '',
          isLocationPart: device.isLocationPart || false,
          locationId: device.facilityId?.toString() || device.buildingId?.toString() || '',
          locationName: device.facility?.facilityName || device.building?.name || '',
          parentDeviceId: device.parentDeviceId?.toString() || '',
          assetCode: device.assetCode || '',
          latitude: device.latitude || '',
          longitude: device.longitude || '',
          costCenter: device.costCenter || 'CC-MAINT-01',
          headOfDepartment: device.headOfDepartment || '',
          machineOwner: device.machineOwner || '',
          notes: device.notes || '',
          imageUrl: photoDoc?.content || device.imageUrl || '',
        }));
        if (photoDoc?.content) {
          setLocalPreviewUrl(photoDoc.content);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

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
    setFormData((prev) => ({ 
      ...prev, 
      [name]: value,
      ...(dataset?.type ? { locationType: dataset.type } : {})
    }));
  };

  const handleSave = async () => {
    if (!formData.assetCode) {
      toast.error('Please enter the Asset Code.');
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/machines/${id}`, {
        name: formData.name,
        deviceId: formData.deviceId,
        company: formData.company,
        maintenanceHead: formData.maintenanceHead,
        machineCode: formData.machineCode,
        serialNumber: formData.serialNumber,
        make: formData.make,
        modelNumber: formData.modelNumber,
        machineCategory: formData.machineCategory,
        machineSubCategory: formData.machineSubCategory,
        description: formData.description,
        isLocationPart: formData.isLocationPart,
        facilityId: (formData as any).locationType === 'facility' || (formData as any).locationType === 'mainFacility' ? (formData.locationId ? parseInt(formData.locationId) : undefined) : undefined,
        buildingId: (formData as any).locationType === 'building' || (formData as any).locationType === 'society' ? (formData.locationId ? parseInt(formData.locationId) : undefined) : undefined,
        parentDeviceId: formData.parentDeviceId ? parseInt(formData.parentDeviceId) : undefined,
        assetCode: formData.assetCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        costCenter: formData.costCenter?.trim() || 'CC-MAINT-01',
        headOfDepartment: formData.headOfDepartment,
        machineOwner: formData.machineOwner,
        notes: formData.notes,
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

  const handleUploadDocument = async () => {
    if (!docName) {
      toast.error('Name is required');
      return;
    }
    
    setUploadingDoc(true);
    try {
      if (uploadModalType === 'File') {
        if (!docFile) {
          toast.error('File is required');
          setUploadingDoc(false);
          return;
        }
        const formData = new FormData();
        formData.append('name', docName);
        formData.append('file', docFile);
        
        await api.post(`/machines/${id}/documents/file`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else if (uploadModalType === 'Link') {
        if (!docContent) {
          toast.error('URL is required');
          setUploadingDoc(false);
          return;
        }
        await api.post(`/machines/${id}/documents/link`, {
          name: docName,
          url: docContent
        });
      } else if (uploadModalType === 'Note') {
        if (!docContent) {
          toast.error('Note is required');
          setUploadingDoc(false);
          return;
        }
        await api.post(`/machines/${id}/documents/note`, {
          name: docName,
          note: docContent
        });
      }
      
      toast.success('Document uploaded successfully');
      setUploadModalType(null);
      setDocName('');
      setDocContent('');
      setDocFile(null);
      fetchDocuments();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      toast.error(err.response?.data?.message || 'Failed to upload document');
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

  const tabs = ['General', 'Specification', 'Spares', 'AMC', 'Purchase', 'Documents', 'IOT'];
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

  const filteredPurchases = purchases.filter(p => 
    p.subTab === purchaseSubTab &&
    (
      (p.supplierName || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      (p.contactNumber || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase())
    )
  );

  return (
    <div className="sm:px-2 md:px-4 pb-6 pt-0 w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
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
            <div className="space-y-6">
              {/* Location Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Location Hierarchy</h3>
                <div className="bg-slate-50/80 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label className="flex items-center gap-3 min-w-[220px] cursor-pointer">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.isLocationPart ? 'border-blue-600' : 'border-slate-300'}`}>
                        {formData.isLocationPart && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                      </div>
                      <input 
                        type="radio" 
                        className="hidden" 
                        checked={formData.isLocationPart}
                        onChange={() => setFormData(prev => ({ ...prev, isLocationPart: true }))}
                      />
                      <span className="text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">This Machine is a part of</span>
                    </label>
                    <div className="flex-1 max-w-md">
                      <MachineHierarchyPicker
                        name="parentDeviceId"
                        value={formData.parentDeviceId}
                        onChange={handleChange}
                        disabled={!formData.isLocationPart}
                        excludeDeviceId={id}
                        filterByCompany={formData.company}
                        filterByLocationId={formData.locationId}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${!formData.isLocationPart ? 'border-blue-600' : 'border-slate-300'}`}>
                      {!formData.isLocationPart && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                    </div>
                    <input 
                      type="radio" 
                      className="hidden" 
                      checked={!formData.isLocationPart}
                      onChange={() => setFormData(prev => ({ ...prev, isLocationPart: false }))}
                    />
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">This Machine is not a part of another location, is located at</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Location<span className="text-red-500">*</span>
                    </label>
                    <FacilityHierarchyPicker
                      name="locationId"
                      value={formData.locationId}
                      onChange={handleChange}
                      placeholder="Select"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Latitude<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      placeholder="Enter Latitude"
                      className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Longitude<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      placeholder="Enter Longitude"
                      className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Asset Code <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="assetCode" 
                      value={formData.assetCode} 
                      onChange={handleChange} 
                      readOnly
                      placeholder="Enter Asset Code"
                      className="w-full h-[38px] px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm outline-none text-slate-600 font-medium cursor-not-allowed" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Cost Center<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="costCenter"
                      value={formData.costCenter || 'CC-MAINT-01'}
                      onChange={handleChange}
                      placeholder="e.g. CC-MAINT-01"
                      className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Head of Department<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="headOfDepartment"
                      value={formData.headOfDepartment}
                      onChange={handleChange}
                      placeholder="Select"
                      options={employees.map(e => ({ label: `${e.designation || 'N/A'} - ${e.fullName}`, value: e.fullName }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Machine Owner<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="machineOwner"
                      value={formData.machineOwner}
                      onChange={handleChange}
                      placeholder="Select"
                      options={employees.map(e => ({ label: `${e.designation || 'N/A'} - ${e.fullName}`, value: e.fullName }))}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Notes
                    </label>
                    <textarea 
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Enter notes..."
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 resize-none"
                    ></textarea>
                  </div>
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
                {canCreateInTab && (
                  <button 
                    onClick={() => navigate('/spares/new', { state: { returnUrl: `/machine-management/edit/${id}`, tab: 'Spares' } })}
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
                          No spares added yet. Click "+ Add Spare" to create and link spare parts.
                        </td>
                      </tr>
                    ) : (
                      machineSpares.filter(s => 
                        (s.partName || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                        (s.partCode || '').toLowerCase().includes(spareSearchQuery.toLowerCase()) ||
                        (s.category || '').toLowerCase().includes(spareSearchQuery.toLowerCase())
                      ).map((spare, index) => {
                        const qty = spare.stockQuantity || spare.inHandQuantity || 1;
                        const rate = spare.rate !== undefined ? Number(spare.rate) : spare.unitCost ? Number(spare.unitCost) : 0;
                        const total = qty * rate;
                        return (
                          <tr key={spare.id || index} className="hover:bg-blue-50/40 transition-colors">
                            <td className="px-4 py-3"><input type="checkbox" className="rounded border-slate-300 text-blue-600" /></td>
                            <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{spare.partName}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{spare.category || '-'}</td>
                            <td className="px-4 py-3 text-sm font-mono text-slate-600">{spare.partCode || '-'}</td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-slate-800">{qty}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">₹{total.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setMachineSpares(prev => prev.filter(s => s.id !== spare.id))}
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
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3"><input type="checkbox" className="rounded border-slate-300" /></td>
                          <td className="px-4 py-3 text-xs text-slate-700 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-900">{item.supplierName}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{item.email}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{item.contactNumber}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPurchases(prev => prev.filter(p => p.id !== item.id))}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
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
              <div className="flex justify-end items-center">
                {canCreateInTab && (
                  <div className="relative">
                    <button 
                      onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                      className="h-[38px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus size={16} className="stroke-[2.5]" /> Upload
                    </button>
                    
                    {/* Upload Dropdown */}
                    {isUploadMenuOpen && (
                      <div className="absolute top-full right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20">
                        <button 
                          onClick={() => { setUploadModalType('File'); setIsUploadMenuOpen(false); }}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          File
                        </button>
                        <button 
                          onClick={() => { setUploadModalType('Link'); setIsUploadMenuOpen(false); }}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Link
                        </button>
                        <button 
                          onClick={() => { setUploadModalType('Note'); setIsUploadMenuOpen(false); }}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
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
                      <th className="px-4 py-3 w-12"><input type="checkbox" className="rounded border-slate-300 text-blue-600" disabled /></th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">No.</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Document Type</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Document Details</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-slate-500 bg-white">
                          No documents added yet.
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc, index) => (
                        <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-3"><input type="checkbox" className="rounded border-slate-300 text-blue-600" /></td>
                          <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{doc.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{doc.type}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {doc.type === 'File' ? (
                              <a href={`http://localhost:3001${doc.content}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">View File</a>
                            ) : doc.type === 'Link' ? (
                              <a href={doc.content} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{doc.content}</a>
                            ) : (
                              <span className="truncate max-w-[200px] block">{doc.content}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {canDeleteInTab && (
                              <button 
                                onClick={() => setDocumentToDelete(doc.id)}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                title="Delete Document"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            )}
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
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <p>This tab is currently under construction.</p>
            </div>
          )}
        </div>
      </div>
      </div>

      <div className="flex justify-end items-center gap-3 w-full border-t border-slate-200/90 pt-5 mt-4">
        {!canEditCurrentTab && permittedTabs.length > 0 && (
          <div className="mr-auto text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            Read-only mode for {activeTab} tab
          </div>
        )}
        <button 
          onClick={() => navigate(-1)}
          className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
        >
          Back
        </button>
        {canEditCurrentTab && (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
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

      {/* Add Spares Modal */}
      {isSparesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setIsSparesModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer">
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <h2 className="text-lg font-bold text-slate-900">Add Spares</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Spare Name</label>
                <CustomSelect
                  name="spareName"
                  value=""
                  onChange={() => {}}
                  placeholder="Select"
                  options={[]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Model Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 120"
                    className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Make</label>
                  <input 
                    type="text" 
                    placeholder="Enter Make"
                    className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Part Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 120"
                    className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quantity Used</label>
                  <input 
                    type="text" 
                    placeholder="Enter Quantity Used"
                    className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rate (INR)</label>
                <input 
                  type="text" 
                  placeholder="Enter Rate"
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-200">
                <button 
                  onClick={() => setIsSparesModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setIsSparesModalOpen(false)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
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

      {/* Document Upload Modals */}
      {uploadModalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 sm:p-8 shadow-xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setUploadModalType(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer">
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">
                {uploadModalType === 'File' && 'Upload Files'}
                {uploadModalType === 'Link' && 'Upload Link'}
                {uploadModalType === 'Note' && 'Upload Note'}
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
                  className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
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
                    className="w-full h-[38px] px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder-slate-400 resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-200">
                <button 
                  onClick={() => setUploadModalType(null)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUploadDocument}
                  disabled={uploadingDoc}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {uploadingDoc ? 'Uploading...' : uploadModalType === 'Note' ? 'Save' : 'Upload'}
                </button>
              </div>
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
