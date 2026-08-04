import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Trash2, Calendar } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';
import { api } from '../../lib/api';
import { FacilityHierarchyPicker } from '../../components/FacilityHierarchyPicker';
import { MachineHierarchyPicker } from '../../components/MachineHierarchyPicker';
import toast from 'react-hot-toast';

const tabs = ['General', 'Specification', 'Spares', 'AMC', 'Purchase', 'Documents', 'IOT'];

export function AddMachine() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [mainFacilities, setMainFacilities] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Step 3 States
  const [activeTab, setActiveTab] = useState('General');
  
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [pendingSpecifications, setPendingSpecifications] = useState<any[]>([]);
  const [specTitle, setSpecTitle] = useState('');
  const [specInputType, setSpecInputType] = useState('text');
  const [specData, setSpecData] = useState('');
  const [specUnit, setSpecUnit] = useState('');

  const [uploadModalType, setUploadModalType] = useState<'File' | 'Link' | 'Note' | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<any[]>([]);
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const [isIotModalOpen, setIsIotModalOpen] = useState(false);
  const [pendingMacId, setPendingMacId] = useState('');
  const [tempMacId, setTempMacId] = useState('');

  const [formData, setFormData] = useState({
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
    costCenter: '',
    headOfDepartment: '',
    machineOwner: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/facilities'),
      api.get('/main-facilities'),
      api.get('/employees')
    ]).then(([facRes, mainFacRes, empRes]) => {
      setFacilities(facRes.data);
      setMainFacilities(mainFacRes.data);
      setEmployees(empRes.data);
    }).catch(console.error);
  }, []);

  const handleChange = (e: any) => {
    const { name, value, dataset } = e.target;
    setFormData((prev) => {
      const updates: any = {
        ...prev,
        [name]: value,
        ...(dataset?.type ? { locationType: dataset.type } : {})
      };
      
      if (name === 'company') {
        updates.facilityId = '';
      }
      
      return updates;
    });
  };

  const handleNextStep1 = () => {
    if (!formData.company || !formData.facilityId) {
      toast.error('Please fill out the required fields.');
      return;
    }
    // Pre-fill locationId with facilityId for General tab
    setFormData(prev => ({ ...prev, locationId: prev.facilityId }));
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!formData.name || !formData.machineCode || !formData.serialNumber) {
      toast.error('Please fill out the required fields.');
      return;
    }
    setStep(3);
  };

  const handleFinalSave = async () => {
    try {
      setLoading(true);
      
      const payload: any = {
        name: formData.name,
        facilityId: (formData as any).locationType === 'facility' || (formData as any).locationType === 'mainFacility' ? parseInt(formData.facilityId) : undefined,
        buildingId: (formData as any).locationType === 'building' || (formData as any).locationType === 'society' ? parseInt(formData.facilityId) : undefined,
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
        parentDeviceId: formData.isLocationPart && formData.parentDeviceId ? parseInt(formData.parentDeviceId) : undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        assetCode: formData.assetCode,
        costCenter: formData.costCenter,
        headOfDepartment: formData.headOfDepartment,
        machineOwner: formData.machineOwner,
        notes: formData.notes,
        application: 'DOMESTIC_WATER_SYS',
        pumpType: 'WMP_BOOSTER_PUMP',
        controller: 'AIPCU',
        macType: 'Primary MAC',
      };

      // 1. Create Machine
      const machineRes = await api.post('/machines', payload);
      const newMachineId = machineRes.data.id;

      // 2. Add MAC ID
      if (pendingMacId) {
        await api.put(`/machines/${newMachineId}`, { ...payload, deviceId: pendingMacId });
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

      toast.success('Machine saved successfully!');
      navigate('/machine-management');
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
    <div className="sm:px-6 pb-6 pt-0 w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => step === 3 ? setStep(2) : step === 2 ? setStep(1) : navigate('/machine-management')}
          className="text-gray-800 hover:text-black mr-3 focus:outline-none flex items-center"
        >
          <ArrowLeft size={24} className="stroke-[2.5]" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Machine</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8 w-full relative">
        {step === 1 && (
          <div className="space-y-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company<span className="text-red-500">*</span></label>
                <FacilityHierarchyPicker name="company" value={formData.company} onChange={handleChange} placeholder="Select Facility" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Facility<span className="text-red-500">*</span></label>
                <FacilityHierarchyPicker name="facilityId" value={formData.facilityId} onChange={handleChange} placeholder="Select Sub-Facility" filterByMainFacilityId={formData.company} disabled={!formData.company} selectableTypes={['facility', 'building']} defaultExpanded={true} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Maintenance Head</label>
                <CustomSelect name="maintenanceHead" value={formData.maintenanceHead} onChange={handleChange} placeholder="Select Head" options={employees.map(e => ({ label: `${e.fullName} (${e.department || 'N/A'})`, value: e.fullName }))} />
              </div>
            </div>
            <div className="flex justify-end mt-12">
              <button onClick={handleNextStep1} className="w-full sm:w-auto px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm">Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Machine Name<span className="text-red-500">*</span></label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all" /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Machine Code<span className="text-red-500">*</span></label><input type="text" name="machineCode" value={formData.machineCode} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all" /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Status<span className="text-red-500">*</span></label><CustomSelect name="status" value={formData.status} onChange={handleChange} placeholder="Select Status" options={[{ label: 'Online', value: 'Online' }, { label: 'Offline', value: 'Offline' }]} /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Serial Number<span className="text-red-500">*</span></label><input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all" /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Make<span className="text-red-500">*</span></label><CustomSelect name="make" value={formData.make} onChange={handleChange} placeholder="Select" options={[{ label: 'Make 1', value: 'Make 1' }]} /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Model Number<span className="text-red-500">*</span></label><CustomSelect name="modelNumber" value={formData.modelNumber} onChange={handleChange} placeholder="Select" options={[{ label: 'Model 1', value: 'Model 1' }]} /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Machine Category<span className="text-red-500">*</span></label><CustomSelect name="machineCategory" value={formData.machineCategory} onChange={handleChange} placeholder="Select" options={[{ label: 'Category 1', value: 'Category 1' }]} /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Machine Sub-Category<span className="text-red-500">*</span></label><CustomSelect name="machineSubCategory" value={formData.machineSubCategory} onChange={handleChange} placeholder="Select" options={[{ label: 'Sub-Category 1', value: 'Sub-Category 1' }]} /></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Machine Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"></textarea>
            </div>
            <div className="flex justify-end mt-8">
              <button onClick={handleNextStep2} className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="w-full">
            <div className="flex overflow-x-auto border-b border-gray-200 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`min-w-[120px] py-3.5 px-4 text-sm font-semibold border-r border-gray-200 transition-colors ${activeTab === tab ? 'bg-[#00a651] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >{tab}</button>
              ))}
            </div>

            <div className="w-full">
              {activeTab === 'General' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-4">Location</h3>
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <label className="flex items-center gap-3 min-w-[220px] cursor-pointer">
                          <input type="radio" checked={formData.isLocationPart} onChange={() => setFormData(prev => ({...prev, isLocationPart: true}))} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">This Machine is a part of</span>
                        </label>
                        <div className="flex-1 max-w-md">
                          <MachineHierarchyPicker name="parentDeviceId" value={formData.parentDeviceId} onChange={handleChange} disabled={!formData.isLocationPart} filterByCompany={formData.company} filterByLocationId={formData.locationId} />
                        </div>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" checked={!formData.isLocationPart} onChange={() => setFormData(prev => ({...prev, isLocationPart: false}))} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                        <span className="text-sm font-semibold text-gray-700">This Machine is not a part of another location, is located at</span>
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Location<span className="text-red-500">*</span></label><FacilityHierarchyPicker name="locationId" value={formData.locationId} onChange={handleChange} /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Latitude<span className="text-red-500">*</span></label><input type="text" name="latitude" value={formData.latitude} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Longitude<span className="text-red-500">*</span></label><input type="text" name="longitude" value={formData.longitude} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Asset Code<span className="text-red-500">*</span></label><input type="text" name="assetCode" value={formData.assetCode} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Cost Center<span className="text-red-500">*</span></label><input type="text" name="costCenter" value={formData.costCenter} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Head of Department<span className="text-red-500">*</span></label><CustomSelect name="headOfDepartment" value={formData.headOfDepartment} onChange={handleChange} options={employees.map(e => ({ label: e.fullName, value: e.fullName }))} /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Machine Owner<span className="text-red-500">*</span></label><CustomSelect name="machineOwner" value={formData.machineOwner} onChange={handleChange} options={employees.map(e => ({ label: e.fullName, value: e.fullName }))} /></div>
                    <div className="col-span-3"><label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none h-12"></textarea></div>
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
                    <button onClick={() => setIsSpecModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg transition-colors font-semibold text-sm">
                      <Plus size={18} /> Add Specification Field
                    </button>
                    {pendingSpecifications.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {pendingSpecifications.map((spec) => (
                          <div key={spec.id} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded-xl">
                            <div><p className="text-xs text-gray-500 font-semibold mb-1">{spec.title}</p><p className="text-sm font-bold text-gray-900">{spec.data} {spec.unit}</p></div>
                            <button onClick={() => handleDeleteSpec(spec.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'Spares' || activeTab === 'AMC' || activeTab === 'Purchase' ? (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>This tab is currently under construction.</p>
                </div>
              ) : null}

              {activeTab === 'Documents' && (
                <div className="space-y-6">
                  <div className="flex gap-4 mb-6">
                    <button onClick={() => setUploadModalType('File')} className="px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-lg flex items-center gap-2 transition-colors"><Plus size={16} /> Upload Document</button>
                    <button onClick={() => setUploadModalType('Link')} className="px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-lg flex items-center gap-2 transition-colors"><Plus size={16} /> Link Upload</button>
                    <button onClick={() => setUploadModalType('Note')} className="px-4 py-2 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-lg flex items-center gap-2 transition-colors"><Plus size={16} /> Note Upload</button>
                  </div>
                  {pendingDocuments.length > 0 && (
                    <div className="overflow-x-auto w-full"><table className="w-full text-left whitespace-nowrap"><thead className="bg-gray-100 rounded-lg"><tr><th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase rounded-l-lg">Name</th><th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Size</th><th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Uploaded By</th><th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Type</th><th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Date</th><th className="px-4 py-3 rounded-r-lg w-12 text-center">Action</th></tr></thead><tbody>{pendingDocuments.map(doc => (<tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors"><td className="px-4 py-4 text-sm text-gray-900 font-semibold">{doc.name}</td><td className="px-4 py-4 text-sm text-gray-600">{doc.size}</td><td className="px-4 py-4 text-sm text-gray-600">{doc.uploadedBy}</td><td className="px-4 py-4 text-sm text-gray-600"><span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${doc.type==='File'?'bg-blue-50 text-blue-600':doc.type==='Link'?'bg-purple-50 text-purple-600':'bg-amber-50 text-amber-600'}`}>{doc.type}</span></td><td className="px-4 py-4 text-sm text-gray-600">{new Date(doc.date).toLocaleDateString()}</td><td className="px-4 py-4"><button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 block mx-auto"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
                  )}
                </div>
              )}

              {activeTab === 'IOT' && (
                <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                  {pendingMacId ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-500 mb-2">Primary MAC ID</p>
                      <h3 className="text-3xl font-bold text-gray-900 mb-6 font-mono tracking-wider">{pendingMacId}</h3>
                      <button onClick={() => setIsIotModalOpen(true)} className="px-6 py-2 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all shadow-sm">Change MAC ID</button>
                    </div>
                  ) : (
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-blue-600 font-bold text-xl">IoT</span></div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No System Connected</h3>
                      <p className="text-gray-500 text-sm mb-8 leading-relaxed">Connect this machine to an IoT device by adding its MAC ID to enable real-time monitoring and analytics.</p>
                      <button onClick={() => setIsIotModalOpen(true)} className="px-8 py-3 bg-[#00a651] hover:bg-[#009040] text-white font-semibold text-sm rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"><Plus size={18} className="stroke-[3]"/> Add System</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-4 w-full border-t border-gray-100 pt-6">
              <button onClick={handleFinalSave} disabled={loading} className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50">{loading ? 'Saving...' : 'Save Machine'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isSpecModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-xl relative">
            <div className="flex items-center gap-4 mb-2">
              <button onClick={() => setIsSpecModalOpen(false)} className="text-gray-900 hover:text-gray-700">
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
                <button onClick={handleAddSpec} className="px-12 py-3 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm">Save</button>
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
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Name</label><input type="text" value={docName} onChange={e=>setDocName(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" /></div>
              {uploadModalType === 'File' && (
                <div><input type="file" onChange={e=>setDocFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-gray-600 border border-gray-300 rounded-xl p-2 cursor-pointer focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" /></div>
              )}
              {(uploadModalType === 'Link' || uploadModalType === 'Note') && (
                <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">{uploadModalType === 'Link' ? 'URL' : 'Content'}</label><input type="text" value={docContent} onChange={e=>setDocContent(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" /></div>
              )}
              <div className="flex gap-4 mt-8"><button onClick={()=>setUploadModalType(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors">Cancel</button><button onClick={handleUploadDocument} className="flex-1 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors">Save</button></div>
            </div>
          </div>
        </div>
      )}

      {isIotModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-xl relative">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add MAC ID</h2>
            <div className="space-y-6">
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">MAC ID</label><input type="text" value={tempMacId} onChange={e=>setTempMacId(e.target.value)} placeholder="Enter MAC ID" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" /></div>
              <div className="flex gap-4 mt-8"><button onClick={()=>setIsIotModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors">Cancel</button><button onClick={() => { setPendingMacId(tempMacId); setIsIotModalOpen(false); }} className="flex-1 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors">Save</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
