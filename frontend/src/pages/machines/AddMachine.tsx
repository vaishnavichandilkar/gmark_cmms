import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';
import { api } from '../../lib/api';

export function AddMachine() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState<any[]>([]);

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
  });

  useEffect(() => {
    // Fetch facilities for the dropdown
    api.get('/facilities').then((res) => {
      setFacilities(res.data);
    }).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (!formData.company || !formData.facilityId) {
      alert('Please fill out the required fields.');
      return;
    }
    setStep(2);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.machineCode || !formData.serialNumber) {
      alert('Please fill out the required fields.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        deviceId: formData.machineCode, // using machineCode as deviceId since it's required by backend
        facilityId: parseInt(formData.facilityId),
        company: formData.company,
        maintenanceHead: formData.maintenanceHead,
        machineCode: formData.machineCode,
        serialNumber: formData.serialNumber,
        make: formData.make,
        modelNumber: formData.modelNumber,
        machineCategory: formData.machineCategory,
        machineSubCategory: formData.machineSubCategory,
        description: formData.description,
        application: 'DOMESTIC_WATER_SYS', // Defaults
        pumpType: 'WMP_BOOSTER_PUMP',
        controller: 'AIPCU',
        macType: 'Primary MAC',
      };

      const res = await api.post('/devices', payload);
      navigate(`/machine-management/edit/${res.data.id}`);
    } catch (err: any) {
      console.error('Failed to create machine', err);
      alert(err.response?.data?.message || 'Failed to save machine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 pb-6 pt-0 w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => step === 2 ? setStep(1) : navigate('/machine-management')}
          className="text-gray-800 hover:text-black mr-3 focus:outline-none flex items-center"
        >
          <ArrowLeft size={24} className="stroke-[2.5]" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Machine</h1>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full">
        <div className="flex flex-col md:flex-row gap-10">


          {/* Form Fields */}
          <div className="flex-1">
            {step === 1 ? (
              <div className="space-y-6 w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Select Company<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Select Company"
                      options={[{ label: 'Gritpulse', value: 'Gritpulse' }]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Select Facility<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="facilityId"
                      value={formData.facilityId}
                      onChange={handleChange}
                      placeholder="Select Facility"
                      options={facilities.map(f => ({ label: f.facilityName, value: f.id.toString() }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Select Maintenance Head
                    </label>
                    <CustomSelect
                      name="maintenanceHead"
                      value={formData.maintenanceHead}
                      onChange={handleChange}
                      placeholder="Select Head"
                      options={[
                        { label: 'Head 1', value: 'Head 1' },
                        { label: 'Head 2', value: 'Head 2' }
                      ]}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-12">
                  <button
                    onClick={handleNext}
                    className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Machine Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Machine Code<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="machineCode"
                      value={formData.machineCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Change Status<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      placeholder="Select Status"
                      options={[
                        { label: 'Online', value: 'Online' },
                        { label: 'Offline', value: 'Offline' }
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Serial Number<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="serialNumber"
                      value={formData.serialNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Make<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="make"
                      value={formData.make}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[{ label: 'Make 1', value: 'Make 1' }]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Model Number<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="modelNumber"
                      value={formData.modelNumber}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[{ label: 'Model 1', value: 'Model 1' }]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Machine Category<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="machineCategory"
                      value={formData.machineCategory}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[{ label: 'Category 1', value: 'Category 1' }]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Machine Sub-Category<span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="machineSubCategory"
                      value={formData.machineSubCategory}
                      onChange={handleChange}
                      placeholder="Select"
                      options={[{ label: 'Sub-Category 1', value: 'Sub-Category 1' }]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Machine Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Description"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-900 resize-none"
                  ></textarea>
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-10 py-2.5 bg-[#00a651] hover:bg-[#009040] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
