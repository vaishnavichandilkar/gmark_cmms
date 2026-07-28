import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomSelect } from '../../components/CustomSelect';
import { ArrowLeft, Search, Plus, Edit, Eye, Calendar } from 'lucide-react';
import { api } from '../../lib/api';

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
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [uploadModalType, setUploadModalType] = useState<'File' | 'Link' | 'Note' | null>(null);
  const [amcSubTab, setAmcSubTab] = useState('AMC');
  const [purchaseSubTab, setPurchaseSubTab] = useState('Machine Purchase');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [locationSearch, setLocationSearch] = useState('');

  const [formData, setFormData] = useState({
    status: 'Online',
    name: '',
    mainFacilityName: 'New Facility F1',
    facilityCategory: 'Facility Category',
    facilitySubCategory: 'Facility Sub-Category',
    
    isLocationPart: false, // false means "not part of another location, is located at"
    locationId: '',
    locationName: '',
    
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

  const fetchData = async () => {
    try {
      const [deviceRes, facilitiesRes] = await Promise.all([
        api.get(`/devices`), // In a real app we'd fetch the specific device by ID
        api.get('/facilities')
      ]);
      
      const device = Array.isArray(deviceRes.data) ? deviceRes.data.find((d: any) => d.id === Number(id)) : null;
      setFacilities(Array.isArray(facilitiesRes.data) ? facilitiesRes.data : []);
      
      if (device) {
        setFormData(prev => ({
          ...prev,
          status: device.status === 'online' ? 'Online' : 'Offline',
          isLocationPart: device.isLocationPart || false,
          locationId: device.facilityId?.toString() || '',
          locationName: device.facility?.facilityName || '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/devices/${id}`, {
        isLocationPart: formData.isLocationPart,
        facilityId: formData.locationId ? parseInt(formData.locationId) : undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        costCenter: formData.costCenter,
        headOfDepartment: formData.headOfDepartment,
        machineOwner: formData.machineOwner,
        notes: formData.notes,
      });
      alert('Machine saved successfully!');
    } catch (error) {
      console.error('Error saving machine:', error);
      alert('Failed to save machine.');
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
    f.facilityName.toLowerCase().includes(locationSearch.toLowerCase()) || 
    f.facilityCode.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const tabs = ['General', 'Specification', 'Spares', 'AMC', 'Purchase', 'Documents', 'IOT'];

  return (
    <div className="px-6 pb-6 pt-0 w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/machine-management')}
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
              className={`flex-1 min-w-[120px] py-3.5 px-4 text-sm font-semibold border-r border-gray-200 transition-colors ${
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
                      <CustomSelect
                        name="locationId"
                        value={formData.locationId}
                        onChange={handleChange}
                        disabled={!formData.isLocationPart}
                        placeholder="Select"
                        options={facilities.map(f => ({ label: f.facilityName, value: f.id.toString() }))}
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
                    <CustomSelect
                      name="locationId"
                      value={formData.locationId}
                      onChange={handleChange}
                      placeholder="Select"
                      options={facilities.map(f => ({ label: f.facilityName, value: f.id.toString() }))}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
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
                      options={[
                        { label: 'Head 1', value: 'Head 1' }
                      ]}
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
                      options={[
                        { label: 'Owner 1', value: 'Owner 1' }
                      ]}
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
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-sm font-semibold text-gray-800 rounded-lg transition-colors">
                  <Plus size={18} className="text-[#00a651] stroke-[3]" />
                  Add Specification Field
                </button>
              </div>
            </div>
          ) : activeTab === 'Spares' ? (
            <div className="space-y-6 w-full">
              {/* Toolbar */}
              <div className="flex justify-end items-center gap-4">
                <button 
                  onClick={() => setIsSparesModalOpen(true)}
                  className="px-4 py-2 bg-green-50 text-green-600 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-green-100 transition-colors"
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
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <tr key={num} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4"><input type="checkbox" className="rounded border-gray-300 text-green-500 focus:ring-green-500" /></td>
                        <td className="px-4 py-4 text-sm text-gray-500">{num}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Facility Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Spare Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Spare Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700 text-center">23</td>
                        <td className="px-4 py-4 text-sm text-gray-700 text-right">₹ 1,000</td>
                        <td className="px-4 py-4 text-sm text-gray-700 text-right">₹ 23,000</td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <div className="flex justify-center">
                            <button className="text-gray-400 hover:text-gray-800 transition-colors">
                              <Edit size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                    className="px-4 py-2 bg-green-50 text-green-600 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-green-100 transition-colors"
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
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <tr key={num} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4"><input type="checkbox" className="rounded border-gray-300 text-green-500 focus:ring-green-500" /></td>
                        <td className="px-4 py-4 text-sm text-gray-500">{num}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Facility Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">dd-mm-yyyy</td>
                        <td className="px-4 py-4 text-sm text-gray-700">dd-mm-yyyy</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Spare Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Spare Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button className="text-gray-400 hover:text-gray-800 transition-colors" title="View">
                              <Eye size={18} />
                            </button>
                            <button className="text-[#a1a1aa] hover:text-[#00a651] transition-colors" title="Edit">
                              <Edit size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                    className="px-4 py-2 bg-green-50 text-green-600 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-green-100 transition-colors"
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
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <tr key={num} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4"><input type="checkbox" className="rounded border-gray-300 text-green-500 focus:ring-green-500" /></td>
                        <td className="px-4 py-4 text-sm text-gray-500">{num}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Facility Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Spare Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Spare Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <div className="flex items-center justify-center gap-3">
                            <button className="text-gray-400 hover:text-gray-800 transition-colors" title="View">
                              <Eye size={18} />
                            </button>
                            <button className="text-[#a1a1aa] hover:text-[#00a651] transition-colors" title="Edit">
                              <Edit size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'Documents' ? (
            <div className="space-y-6 w-full">
              {/* Toolbar */}
              <div className="flex justify-start items-center">
                <div className="relative">
                  <button 
                    onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-gray-300 transition-colors"
                  >
                    <Plus size={16} className="text-[#00a651] stroke-[3]" /> Upload
                  </button>
                  
                  {/* Upload Dropdown */}
                  {isUploadMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
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
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <tr key={num} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4"><input type="checkbox" className="rounded border-gray-300 text-green-500 focus:ring-green-500" /></td>
                        <td className="px-4 py-4 text-sm text-gray-500">{num}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Facility Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Spare Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">Spare Name</td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <div className="flex justify-center">
                            <button className="text-gray-400 hover:text-gray-800 transition-colors">
                              <Edit size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'IOT' ? (
            <div className="space-y-6 w-full flex flex-col items-center">
              {/* Toolbar */}
              <div className="flex justify-end w-full">
                <button 
                  onClick={() => setIsIotModalOpen(true)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-gray-300 transition-colors"
                >
                  <Plus size={16} className="text-[#00a651] stroke-[3]" /> Add System
                </button>
              </div>

              {/* Empty State */}
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-[480px] h-64 border border-gray-200 rounded-2xl mb-8 flex items-center justify-center bg-gray-50/50">
                </div>
                <h3 className="text-xl font-bold text-gray-700">No System Have Added</h3>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>This tab is currently under construction.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4 w-full">
        <button 
          onClick={() => navigate('/machine-management')}
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
              
              <button className="px-4 py-2 bg-green-50 text-green-600 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-green-100 transition-colors">
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
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Field Title</label>
                <input 
                  type="text" 
                  placeholder="Enter Title"
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Field Input Type</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]"
                >
                  <option value="">Select</option>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">Field Data</label>
                  <input 
                    type="text" 
                    placeholder="eg. 120"
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">Field Unit</label>
                  <select 
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]"
                  >
                    <option value="">Select</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-center mt-6 pt-2">
                <button 
                  onClick={() => setIsSpecModalOpen(false)}
                  className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                >
                  Save
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
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Spare Name</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]"
                >
                  <option value="">Select</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">Model Number</label>
                  <input 
                    type="text" 
                    placeholder="eg. 120"
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">Make</label>
                  <input 
                    type="text" 
                    placeholder="Enter Make"
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">Part Number</label>
                  <input 
                    type="text" 
                    placeholder="eg. 120"
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">Quantity Used</label>
                  <input 
                    type="text" 
                    placeholder="Enter Quantity Used"
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Rate (INR)</label>
                <input 
                  type="text" 
                  placeholder="Enter Rate"
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
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
                <label className="block text-xs font-bold text-gray-900 mb-1.5">{amcSubTab} Type<span className="text-red-500">*</span></label>
                <select className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]">
                  <option value="">Select Type</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Upload {amcSubTab} Contract</label>
                <input 
                  type="file"
                  className="block w-full text-sm text-gray-600 border border-gray-500 rounded-lg p-1 cursor-pointer focus:outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Start Date<span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-4 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
                    placeholder="Select Date"
                  />
                  <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">End Date<span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-4 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
                    placeholder="Select Date"
                  />
                  <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-0" />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-900 mb-1.5">{amcSubTab} Usage Terms<span className="text-red-500">*</span></label>
                <select className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]">
                  <option value="">{amcSubTab} Usage Terms</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Warranty Provider<span className="text-red-500">*</span></label>
                <select className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]">
                  <option value="">Select Warranty</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Warranty Contact Number<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter Number"
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
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
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Supplier Name<span className="text-red-500">*</span></label>
                <select className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]">
                  <option value="">Select</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Contact Number<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter Number"
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Email<span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  placeholder="email@gmail.com"
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Address</label>
                <textarea 
                  placeholder="Address"
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400 resize-y min-h-[64px]"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Upload Purchase / Invoice</label>
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
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  {uploadModalType === 'File' && 'File Name'}
                  {uploadModalType === 'Link' && 'Name'}
                  {uploadModalType === 'Note' && 'Name'}
                  <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Enter Name"
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              {uploadModalType === 'File' && (
                <div>
                  <div className="border border-gray-400 rounded-xl p-2 flex items-center mb-2">
                    <input 
                      type="file"
                      className="block w-full text-sm text-gray-600 cursor-pointer focus:outline-none file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 transition-colors"
                    />
                  </div>
                  <p className="text-sm text-gray-600">Note : File Should be Manuals, Warranties, etc (Multiple files can be uploaded)</p>
                </div>
              )}

              {uploadModalType === 'Link' && (
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">URL<span className="text-red-500">*</span></label>
                  <input 
                    type="url" 
                    placeholder="Enter URL"
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
              )}

              {uploadModalType === 'Note' && (
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">Notes<span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="Enter Notes"
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
              )}

              <div className="flex justify-center mt-8">
                <button 
                  onClick={() => setUploadModalType(null)}
                  className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                >
                  {uploadModalType === 'Note' ? 'Save' : 'Upload'}
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
                <label className="block text-xs font-bold text-gray-900 mb-1.5">MAC ID<span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter"
                  className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="flex justify-center mt-8">
                <button 
                  onClick={() => setIsIotModalOpen(false)}
                  className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
