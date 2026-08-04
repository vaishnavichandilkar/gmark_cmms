import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomSelect } from '../../components/CustomSelect';
import { ArrowLeft, Search, Plus, Edit, Eye, Calendar, Trash2, Edit2, Download, Filter } from 'lucide-react';
import { api } from '../../lib/api';
import { FacilityHierarchyPicker } from '../../components/FacilityHierarchyPicker';
import { MachineHierarchyPicker } from '../../components/MachineHierarchyPicker';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

export function EditMachine() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [activeTab, setActiveTab] = useState('General');
  const [saving, setSaving] = useState(false);
  
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isSparesModalOpen, setIsSparesModalOpen] = useState(false);
  const [isAmcModalOpen, setIsAmcModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isIotModalOpen, setIsIotModalOpen] = useState(false);
  const [tempMacId, setTempMacId] = useState('');
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
    costCenter: '',
    headOfDepartment: '',
    machineOwner: '',
    notes: '',
  });

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
      const [deviceRes, facilitiesRes, employeesRes] = await Promise.all([
        api.get(`/machines/${id}`),
        api.get('/facilities'),
        api.get('/employees')
      ]);
      
      const device = deviceRes.data;
      setFacilities(Array.isArray(facilitiesRes.data) ? facilitiesRes.data : []);
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
      
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
          costCenter: device.costCenter || '',
          headOfDepartment: device.headOfDepartment || '',
          machineOwner: device.machineOwner || '',
          notes: device.notes || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
        costCenter: formData.costCenter,
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

  return (
    <div className="sm:px-2 md:px-4 pb-6 pt-0 w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-800 hover:text-black mr-3 focus:outline-none flex items-center"
        >
          <ArrowLeft size={24} className="stroke-[2.5]" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Machine</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm w-full">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-w-[120px] py-3.5 px-4 text-sm font-semibold border-r border-gray-200 transition-colors ${
                activeTab === tab 
                  ? 'bg-[#00a651] text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-8 w-full">
          {activeTab === 'General' ? (
            <div className="space-y-8">
              {/* Location Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Location</h3>
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label className="flex items-center gap-3 min-w-[220px] cursor-pointer">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.isLocationPart ? 'border-[#00a651]' : 'border-gray-300'}`}>
                        {formData.isLocationPart && <div className="w-2.5 h-2.5 bg-[#00a651] rounded-full"></div>}
                      </div>
                      <input 
                        type="radio" 
                        className="hidden" 
                        checked={formData.isLocationPart}
                        onChange={() => setFormData(prev => ({ ...prev, isLocationPart: true }))}
                      />
                      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">This Machine is a part of</span>
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
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!formData.isLocationPart ? 'border-[#00a651]' : 'border-gray-300'}`}>
                      {!formData.isLocationPart && <div className="w-2.5 h-2.5 bg-[#00a651] rounded-full"></div>}
                    </div>
                    <input 
                      type="radio" 
                      className="hidden" 
                      checked={!formData.isLocationPart}
                      onChange={() => setFormData(prev => ({ ...prev, isLocationPart: false }))}
                    />
                    <span className="text-sm font-semibold text-gray-700">This Machine is not a part of another location, is located at</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Latitude<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      placeholder="Enter Latitude"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Longitude<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      placeholder="Enter Longitude"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Asset Code<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="assetCode"
                      value={formData.assetCode}
                      onChange={handleChange}
                      placeholder="Enter"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Cost Center<span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="costCenter"
                      value={formData.costCenter}
                      onChange={handleChange}
                      placeholder="Enter"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Select Head of Department<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="headOfDepartment"
                      value={formData.headOfDepartment}
                      onChange={handleChange}
                      placeholder="Select"
                      options={employees.map(e => ({ label: `${e.fullName} (${e.department || 'N/A'} - ${e.designation || e.role || 'N/A'})`, value: e.fullName }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Machine Owner<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="machineOwner"
                      value={formData.machineOwner}
                      onChange={handleChange}
                      placeholder="Select"
                      options={employees.map(e => ({ label: `${e.fullName} (${e.department || 'N/A'} - ${e.designation || e.role || 'N/A'})`, value: e.fullName }))}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Notes
                    </label>
                    <textarea 
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="notes"
                      rows={1}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 resize-none h-12"
                    ></textarea>
                  </div>
              </div>

            </div>
          ) : activeTab === 'Specification' ? (
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Upload Name Plate</label>
                <div className="w-full max-w-md">
                  <input 
                    type="file"
                    className="block w-full text-sm text-gray-600 border border-gray-500 rounded-lg p-1 cursor-pointer focus:outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 transition-colors"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Location</h3>
                <button 
                  onClick={() => setIsSpecModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00a651] hover:bg-[#009040] border border-transparent text-sm font-semibold text-white rounded-lg transition-colors shadow-sm mb-6">
                  <Plus size={18} className="stroke-[3]" />
                  Add Specification Field
                </button>
                
                {/* Render Specifications List */}
                {specifications.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {specifications.map((spec) => (
                      <div key={spec.id} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded-xl">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">{spec.title}</p>
                          <p className="text-sm font-bold text-gray-900">
                            {spec.data} <span className="text-gray-500 text-xs font-normal">{spec.unit}</span>
                          </p>
                        </div>
                        <button 
                          onClick={() => setSpecToDelete(spec.id)}
                          className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Delete Specification"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'Spares' ? (
            <div className="space-y-6 w-full">
              {/* Toolbar */}
              <div className="flex justify-end items-center gap-4">
                <button 
                  onClick={() => setIsSparesModalOpen(true)}
                  className="px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus size={16} className="stroke-[3]" /> Add Spare
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

              {/* Table */}
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
                    {[]?.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm font-medium text-gray-500 bg-white">
                          No spares added yet.
                        </td>
                      </tr>
                    ) : (
                      // Map actual spares here
                      null
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
                    className={`px-6 py-2 text-sm font-semibold transition-colors ${amcSubTab === 'AMC' ? 'bg-[#00a651] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    AMC
                  </button>
                  <button 
                    onClick={() => setAmcSubTab('Warranties')}
                    className={`px-6 py-2 text-sm font-semibold transition-colors border-l border-gray-200 ${amcSubTab === 'Warranties' ? 'bg-[#00a651] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Warranties
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsAmcModalOpen(true)}
                    className="px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Plus size={16} className="stroke-[3]" /> Add {amcSubTab}
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
                      // Map actual AMC data here
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
                    className={`px-6 py-2 text-sm font-semibold transition-colors ${purchaseSubTab === 'Machine Purchase' ? 'bg-[#00a651] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Machine Purchase
                  </button>
                  <button 
                    onClick={() => setPurchaseSubTab('Spare/Service Purchase')}
                    className={`px-6 py-2 text-sm font-semibold transition-colors border-l border-gray-200 ${purchaseSubTab === 'Spare/Service Purchase' ? 'bg-[#00a651] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Spare/Service Purchase
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsPurchaseModalOpen(true)}
                    className="px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm"
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
                      // Map actual purchase data here
                      null
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'Documents' ? (
            <div className="space-y-6 w-full">
              {/* Toolbar */}
              <div className="flex justify-end items-center">
                <div className="relative">
                  <button 
                    onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                    className="px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Plus size={16} className="stroke-[3]" /> Upload
                  </button>
                  
                  {/* Upload Dropdown */}
                  {isUploadMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                      <button 
                        onClick={() => { setUploadModalType('File'); setIsUploadMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        File
                      </button>
                      <button 
                        onClick={() => { setUploadModalType('Link'); setIsUploadMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Link
                      </button>
                      <button 
                        onClick={() => { setUploadModalType('Note'); setIsUploadMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                    {documents?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-gray-500 bg-white">
                          No documents added yet.
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc, index) => (
                        <tr key={doc.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                          <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{doc.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {doc.type === 'File' ? (
                              <a href={`http://localhost:3001${doc.content}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View File</a>
                            ) : doc.type === 'Link' ? (
                              <a href={doc.content} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{doc.content}</a>
                            ) : (
                              <span className="truncate max-w-[200px] block">{doc.content}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => setDocumentToDelete(doc.id)}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title="Delete Document"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
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
              onAddSystem={() => { setTempMacId(''); setIsIotModalOpen(true); }}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>This tab is currently under construction.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4 w-full">
        <button 
          onClick={() => navigate(-1)}
          className="px-10 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          Back
        </button>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Locations Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex items-center gap-4">
              <button onClick={() => setIsLocationModalOpen(false)} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-gray-900 mr-auto">Locations</h2>
              
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search" 
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-48"
                />
              </div>
              
              <button className="px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm">
                <Plus size={16} /> Add
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100 rounded-lg">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg w-12"><input type="checkbox" className="rounded border-gray-300" disabled /></th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">No.</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Facility Name</th>
                    <th className="px-4 py-3 rounded-r-lg text-xs font-bold text-gray-500 uppercase">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFacilities.map((facility, idx) => (
                    <tr key={facility.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => selectLocation(facility)}>
                      <td className="px-4 py-4"><input type="checkbox" className="rounded border-gray-300 text-green-500 focus:ring-green-500" checked={formData.locationId === facility.id.toString()} readOnly /></td>
                      <td className="px-4 py-4 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-700">Location</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{facility.facilityName}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{facility.facilityCode}</td>
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-[480px] p-6 shadow-xl relative">
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => setIsSpecModalOpen(false)} className="text-gray-800 hover:text-black">
                <ArrowLeft size={24} className="stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Add Specification Field</h2>
            </div>
            <div className="pl-9 mb-6">
              <p className="text-xs font-semibold text-gray-400">Asset : {formData.name || 'Machine Name F1'}</p>
            </div>
            
            <div className="space-y-4 px-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Title</label>
                <input 
                  type="text" 
                  value={specTitle}
                  onChange={(e) => setSpecTitle(e.target.value)}
                  placeholder="Enter Title"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Input Type</label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Data</label>
                  <input 
                    type={specInputType === 'number' ? 'number' : 'text'}
                    value={specData}
                    onChange={(e) => setSpecData(e.target.value)}
                    placeholder="eg. 120"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Unit</label>
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

              <div className="flex justify-center mt-6 pt-2">
                <button 
                  onClick={handleSaveSpecification}
                  disabled={savingSpec}
                  className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-[480px] p-6 shadow-xl relative">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setIsSparesModalOpen(false)} className="text-gray-800 hover:text-black">
                <ArrowLeft size={24} className="stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Add Spares</h2>
            </div>
            
            <div className="space-y-4 px-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Spare Name</label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Model Number</label>
                  <input 
                    type="text" 
                    placeholder="eg. 120"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Make</label>
                  <input 
                    type="text" 
                    placeholder="Enter Make"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Part Number</label>
                  <input 
                    type="text" 
                    placeholder="eg. 120"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Quantity Used</label>
                  <input 
                    type="text" 
                    placeholder="Enter Quantity Used"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rate (INR)</label>
                <input 
                  type="text" 
                  placeholder="Enter Rate"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="flex justify-center mt-6 pt-2">
                <button 
                  onClick={() => setIsSparesModalOpen(false)}
                  className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
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
              <button onClick={() => setIsAmcModalOpen(false)} className="text-gray-800 hover:text-black">
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
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-4 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
                    placeholder="Select Date"
                  />
                  <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date<span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-4 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
                    placeholder="Select Date"
                  />
                  <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-0" />
                </div>
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
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Warranty Provider<span className="text-red-500">*</span></label>
                <CustomSelect
                  name="warrantyProvider"
                  value=""
                  onChange={() => {}}
                  placeholder="Select Warranty"
                  options={[]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Warranty Contact Number<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter Number"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="col-span-2 flex justify-center mt-6">
                <button 
                  onClick={() => setIsAmcModalOpen(false)}
                  className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
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
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-gray-800 hover:text-black">
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
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email<span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  placeholder="email@gmail.com"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address</label>
                <textarea 
                  placeholder="Address"
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400 resize-y min-h-[64px]"
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
                  className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-xl relative">
            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setUploadModalType(null)} className="text-gray-800 hover:text-black">
                <ArrowLeft size={24} className="stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                {uploadModalType === 'File' && 'Upload Files'}
                {uploadModalType === 'Link' && 'Upload Link'}
                {uploadModalType === 'Note' && 'Upload Note'}
              </h2>
            </div>
            
            <div className="space-y-6 px-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              {uploadModalType === 'File' && (
                <div>
                  <div className="border border-gray-300 rounded-xl p-2 flex items-center mb-2">
                    <input 
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setDocFile(e.target.files[0]);
                        }
                      }}
                      className="block w-full text-sm text-gray-600 cursor-pointer focus:outline-none file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 transition-colors"
                    />
                  </div>
                  <p className="text-sm text-gray-600">Note : File Should be Manuals, Warranties, etc (Multiple files can be uploaded)</p>
                </div>
              )}

              {uploadModalType === 'Link' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">URL<span className="text-red-500">*</span></label>
                  <input 
                    type="url" 
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Enter URL"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
              )}

              {uploadModalType === 'Note' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes<span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Enter Notes"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
              )}

              <div className="flex justify-center mt-8">
                <button 
                  onClick={handleUploadDocument}
                  disabled={uploadingDoc}
                  className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-xl relative">
            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setIsIotModalOpen(false)} className="text-gray-800 hover:text-black">
                <ArrowLeft size={24} className="stroke-[2.5]" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Add MAC ID</h2>
            </div>
            
            <div className="space-y-6 px-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">MAC ID<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={tempMacId}
                  onChange={(e) => setTempMacId(e.target.value)}
                  placeholder="Enter MAC ID"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="flex justify-center mt-8">
                <button 
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await api.put(`/machines/${id}`, {
                        name: formData.name,
                        deviceId: tempMacId,
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
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        costCenter: formData.costCenter,
                        headOfDepartment: formData.headOfDepartment,
                        machineOwner: formData.machineOwner,
                        notes: formData.notes,
                      });
                      setFormData(prev => ({ ...prev, deviceId: tempMacId }));
                      setIsIotModalOpen(false);
                      toast.success('MAC ID saved successfully!');
                    } catch (error: any) {
                      console.error('Error saving MAC ID:', error);
                      toast.error(error.response?.data?.message || 'Failed to save MAC ID.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Document?</h3>
            <p className="text-sm text-gray-500 mb-8">This action cannot be undone.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setDocumentToDelete(null)}
                className="flex-1 px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteDocument}
                className="flex-1 px-6 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Specification Confirmation Modal */}
      {specToDelete && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Specification?</h3>
            <p className="text-sm text-gray-500 mb-8">This action cannot be undone.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setSpecToDelete(null)}
                className="flex-1 px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteSpecification}
                className="flex-1 px-6 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
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
  onAddSystem
}: { 
  deviceId: string, 
  onAddSystem: () => void
}) {
  const [registers, setRegisters] = useState<{register: string | number, value: string | number}[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    setInitialLoadComplete(false);

    api.get(`/devices/${deviceId}/snapshot`)
      .then((res) => {
        if (res.data?.payload?.registers) {
          const initialRegisters = res.data.payload.registers;
          initialRegisters.sort((a: any, b: any) => Number(a.register) - Number(b.register));
          setRegisters(initialRegisters);
          setLastUpdate(new Date(res.data.createdAt));
        }
        setInitialLoadComplete(true);
      })
      .catch((err) => {
        console.log('No initial snapshot found', err);
        setInitialLoadComplete(true);
      });

    const token = localStorage.getItem('token');
    const socket: Socket = io('http://localhost:3001', {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join-device', { topic: deviceId });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('device-update', (data: any) => {
      if (data.deviceId === deviceId) {
        if (data.rawRegisters && Array.isArray(data.rawRegisters)) {
          setRegisters((prev) => {
            const mergedMap = new Map<number, number | string>();
            prev.forEach((r) => mergedMap.set(Number(r.register), r.value));
            data.rawRegisters.forEach((r: any) => mergedMap.set(Number(r.register), r.value));
            const mergedList = Array.from(mergedMap.entries()).map(([register, value]) => ({ register, value }));
            mergedList.sort((a, b) => a.register - b.register);
            return mergedList;
          });
          setLastUpdate(new Date());
        }
      }
    });

    return () => {
      socket.emit('leave-device', { topic: deviceId });
      socket.disconnect();
    };
  }, [deviceId]);

  return (
    <div className="w-full min-h-[500px]">
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="flex justify-between items-center w-full mb-8">
          <div>
            {deviceId && (
              <div className="flex items-center gap-3 bg-gray-50 px-5 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-sm font-semibold text-gray-500">System MAC ID:</span>
                <span className="text-base font-black text-gray-900 tracking-wider font-mono">{deviceId}</span>
              </div>
            )}
          </div>
          <button 
            onClick={onAddSystem}
            className="flex items-center gap-2 px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
          >
            <Plus size={18} className="stroke-[3]" /> {deviceId ? 'Update System' : 'Add System'}
          </button>
        </div>

        {!deviceId ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto pb-12">
            <div className="w-full h-72 border border-gray-100 shadow-[0_0_15px_rgba(0,0,0,0.03)] rounded-2xl bg-white mb-6"></div>
            <h3 className="text-lg font-bold text-gray-600">No System Have Added</h3>
          </div>
        ) : (
          /* Live Monitor */
          <div className="space-y-6 w-full flex flex-col">
            
            {!initialLoadComplete ? (
               <div className="flex flex-col items-center justify-center py-12 border border-gray-200 rounded-xl bg-gray-50/50">
                 <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                 <h3 className="text-lg font-bold text-gray-700">Loading Device Data...</h3>
               </div>
            ) : registers.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 border border-gray-200 rounded-xl bg-gray-50/50">
                 <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                 </div>
                 <h3 className="text-lg font-bold text-gray-700">No Data Available Yet</h3>
                 <p className="text-sm text-gray-500 mt-1">Waiting for the physical device to send its first telemetry update.</p>
               </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                {registers.map((reg, idx) => (
                   <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-1">
                        Reg {reg.register}
                      </div>
                      <div className="font-mono text-lg font-black tracking-tight text-gray-900">
                        {reg.value}
                      </div>
                   </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
