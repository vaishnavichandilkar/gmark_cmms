import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Edit, Building2, MapPin, Tag, FileText, Info, Globe, Hash } from 'lucide-react';

import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { api } from '../../lib/api';
import { FacilityHierarchyPicker } from '../../components/FacilityHierarchyPicker';
import { EmployeeHierarchyPicker } from '../../components/EmployeeHierarchyPicker';
import toast from 'react-hot-toast';

export function AddFacility() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewMode = window.location.pathname.includes('/view/');

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('General');
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [_uploadModalType, setUploadModalType] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    mainFacilityId: '',
    mainFacilityHead: '',
    facilityCode: '',
    facilityName: '',
    category: '',
    description: '',
    
    // Step 2 Fields
    isLocationPart: 'false',
    parentFacilityId: '',
    address: '',
    country: 'India',
    state: '',
    city: '',
    postalCode: '',
    subCategory: '',
    latitude: '',
    longitude: '',
    facilityHeadName: '',
    notes: '',
    parentFacilityIdType: ''
  });

  const [mainFacilities, setMainFacilities] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    fetchMainFacilities();
    fetchFacilities();
    fetchEmployees();
    if (id) {
      fetchFacility();
    } else {
      fetchNextFacilityCode();
    }
  }, [id]);

  useEffect(() => {
    const fetchPostalCodeDetails = async () => {
      if (formData.postalCode && formData.postalCode.length === 6 && formData.isLocationPart === 'false' && !isViewMode) {
        try {
          const response = await api.get(`/postal-codes/${formData.postalCode}`);
          if (response.data) {
            setFormData(prev => ({
              ...prev,
              city: response.data.city,
              state: response.data.state,
              country: response.data.country || 'India',
            }));
            // Clear any errors related to these fields
            setErrors(prev => ({ ...prev, city: '', state: '', country: '' }));
          }
        } catch (error) {
          console.error('Failed to fetch postal code details', error);
          // Optional: handle not found
        }
      }
    };

    fetchPostalCodeDetails();
  }, [formData.postalCode, formData.isLocationPart, isViewMode]);

  const fetchMainFacilities = async () => {
    try {
      const response = await api.get('/main-facilities');
      setMainFacilities(response.data);
    } catch (error) {
      console.error('Failed to fetch main facilities:', error);
    }
  };

  const fetchFacilities = async () => {
    try {
      const response = await api.get('/facilities');
      setFacilities(response.data);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
    }
  };

  const fetchNextFacilityCode = async () => {
    try {
      const response = await api.get('/facilities/next-code');
      if (response.data?.nextCode) {
        setFormData(prev => ({
          ...prev,
          facilityCode: response.data.nextCode
        }));
      }
    } catch (error) {
      console.error('Failed to fetch next facility code:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees list:', error);
    }
  };

  const fetchFacility = async () => {
    try {
      setInitialLoading(true);
      const response = await api.get(`/facilities/${id}`);
      const data = response.data;
      setFormData({
        mainFacilityId: data.mainFacilityId ? data.mainFacilityId.toString() : '',
        mainFacilityHead: data.mainFacility?.mainFacilityHead || '',
        facilityCode: data.facilityCode || '',
        facilityName: data.facilityName || '',
        category: data.category || '',
        description: data.description || '',
        isLocationPart: data.isLocationPart ? 'true' : 'false',
        parentFacilityId: data.parentFacilityId ? `f-${data.parentFacilityId}` : (data.isLocationPart && data.mainFacilityId ? `mf-${data.mainFacilityId}` : ''),
        address: data.address || '',
        country: data.country || 'India',
        state: data.state || '',
        city: data.city || '',
        postalCode: data.postalCode || '',
        subCategory: data.subCategory || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        facilityHeadName: data.facilityHeadName || '',
        notes: data.notes || '',
        parentFacilityIdType: data.parentFacilityId ? 'facility' : ''
      });
    } catch (error) {
      console.error('Failed to fetch facility:', error);
      setGlobalError('Failed to load facility details.');
    } finally {
      setInitialLoading(false);
    }
  };

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.mainFacilityId) newErrors.mainFacilityId = 'Facility is required';
    if (!formData.facilityCode) newErrors.facilityCode = 'Facility Code is required';
    if (!formData.facilityName) newErrors.facilityName = 'Facility Name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: { [key: string]: string } = {};
    if (formData.isLocationPart === 'false') {
      if (!formData.address) newErrors.address = 'Address is required';
      if (!formData.country) newErrors.country = 'Country is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.city) newErrors.city = 'City is required';
    } else {
      if (!formData.parentFacilityId) newErrors.parentFacilityId = 'Parent facility is required';
    }
    
    if (!formData.subCategory) newErrors.subCategory = 'Sub-Category is required';
    if (!formData.latitude) newErrors.latitude = 'Latitude is required';
    if (!formData.longitude) newErrors.longitude = 'Longitude is required';
    if (!formData.facilityHeadName) newErrors.facilityHeadName = 'Facility Head Name is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: any) => {
    const { name, value, dataset } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-fill Facility Head
      if (name === 'mainFacilityId') {
        const facility = mainFacilities.find(f => f.id.toString() === value);
        newData.mainFacilityHead = facility ? facility.mainFacilityHead || '' : '';
      }

      if (dataset?.type) {
        (newData as any)[`${name}Type`] = dataset.type;
      }

      if (name === 'parentFacilityId' && newData.isLocationPart === 'true') {
        const type = dataset?.type || newData.parentFacilityIdType;
        if (type === 'mainFacility') {
          const mId = value;
          const parentFacility = mainFacilities.find(f => f.id.toString() === mId);
          if (parentFacility) {
            newData.address = parentFacility.address || '';
            newData.country = parentFacility.country || 'India';
            newData.state = parentFacility.state || '';
            newData.city = parentFacility.city || '';
            newData.postalCode = parentFacility.postalCode || '';
            newData.subCategory = parentFacility.subcategory || ''; // MainFacility uses 'subcategory'
            newData.latitude = parentFacility.latitude || '';
            newData.longitude = parentFacility.longitude || '';
            newData.facilityHeadName = parentFacility.mainFacilityHead || ''; // MainFacility uses 'mainFacilityHead'
          }
        } else if (type === 'facility') {
          const fId = value;
          const parentFacility = facilities.find(f => f.id.toString() === fId);
          if (parentFacility) {
            newData.address = parentFacility.address || '';
            newData.country = parentFacility.country || 'India';
            newData.state = parentFacility.state || '';
            newData.city = parentFacility.city || '';
            newData.postalCode = parentFacility.postalCode || '';
            newData.subCategory = parentFacility.subCategory || '';
            newData.latitude = parentFacility.latitude || '';
            newData.longitude = parentFacility.longitude || '';
            newData.facilityHeadName = parentFacility.facilityHeadName || '';
          }
        }
      }

      if (name === 'isLocationPart' && value === 'false') {
        newData.parentFacilityId = '';
        newData.parentFacilityIdType = '';
      }
      
      return newData;
    });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (globalError) {
      setGlobalError('');
    }
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    try {
      setLoading(true);
      setGlobalError('');

      const submitData = {
        mainFacilityId: parseInt(formData.mainFacilityId, 10),
        facilityCode: formData.facilityCode,
        facilityName: formData.facilityName,
        category: formData.category,
        description: formData.description,
        isLocationPart: formData.isLocationPart === 'true',
        parentFacilityId: formData.isLocationPart === 'true' && formData.parentFacilityId && (formData as any).parentFacilityIdType === 'facility' ? parseInt(formData.parentFacilityId, 10) : null,
        address: formData.address,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        postalCode: formData.postalCode,
        subCategory: formData.subCategory,
        latitude: formData.latitude,
        longitude: formData.longitude,
        facilityHeadName: formData.facilityHeadName,
        notes: formData.notes
      };

      if (id && !isViewMode) {
        await api.put(`/facilities/${id}`, submitData);
      } else if (!id) {
        await api.post('/facilities', submitData);
      }

      toast.success('Facility saved successfully!');
      navigate('/facility-management');
    } catch (error: any) {
      console.error('Failed to save facility:', error);
      setGlobalError(error.response?.data?.message || 'Failed to save facility details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const availableCategories = user?.role !== 'SUPER_ADMIN' && formData.mainFacilityId
    ? Array.from(new Set(facilities.filter(f => f.mainFacilityId?.toString() === formData.mainFacilityId).map(f => f.category).filter(Boolean)))
    : [];

  const availableSubCategories = user?.role !== 'SUPER_ADMIN' && formData.mainFacilityId
    ? Array.from(new Set(facilities.filter(f => f.mainFacilityId?.toString() === formData.mainFacilityId).map(f => f.subCategory).filter(Boolean)))
    : [];

  const parentFacilityOptions = [
    ...mainFacilities
      .filter(f => !formData.mainFacilityId || f.id.toString() === formData.mainFacilityId)
      .map(f => ({
        label: f.mainFacilityName + ' (Facility)',
        value: `mf-${f.id}`
      })),
    ...facilities
      .filter(f => !formData.mainFacilityId || f.mainFacilityId.toString() === formData.mainFacilityId)
      .filter(f => f.id.toString() !== id)
      .map(f => ({
        label: f.facilityName + ' (Facility)',
        value: `f-${f.id}`
      }))
  ];

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full sm:p-6 pb-10 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isViewMode ? formData.facilityName || 'View Facility' : id ? 'Edit Facility' : formData.facilityName || 'New Facility'}
        </h1>
      </div>

      {globalError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {globalError}
        </div>
      )}

      {/* Form Card */}
      <div className={isViewMode ? "" : "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full"}>
        {isViewMode ? (
          <div className="space-y-8">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-inner flex-shrink-0">
                <Building2 size={48} className="text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold mb-2">{formData.facilityName || 'Unknown Facility'}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-50 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Hash size={18} />
                    <span>{formData.facilityCode || 'N/A'}</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={18} />
                    <span>{mainFacilities.find(f => f.id.toString() === formData.mainFacilityId)?.mainFacilityName || 'No Parent Facility'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Information Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                  <Info size={20} className="text-emerald-500" />
                  Facility Information
                </h3>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Tag size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Category</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.category || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Tag size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Sub-Category</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.subCategory || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Globe size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Facility Head</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.facilityHeadName || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <FileText size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.description || '-'}</p>
                    </div>
                  </div>
                  {formData.notes && (
                    <div className="flex items-start gap-4">
                      <div className="bg-emerald-50 p-2.5 rounded-lg">
                        <FileText size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Notes</p>
                        <p className="text-base text-gray-900 font-semibold">{formData.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                  <MapPin size={20} className="text-emerald-500" />
                  Location Details
                </h3>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Building2 size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Part of Location</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {formData.isLocationPart === 'true' ? parentFacilityOptions.find(p => p.value === formData.parentFacilityId)?.label || 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <MapPin size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.address || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Globe size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">City / Postal Code</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {[formData.city, formData.postalCode].filter(Boolean).join(' - ') || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Globe size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">State / Country</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {[formData.state, formData.country].filter(Boolean).join(', ') || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <MapPin size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Coordinates</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 text-center"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <>
        {currentStep === 2 && (
          <div className="flex overflow-x-auto border-b border-gray-200">
            {['General', 'Document'].map((tab) => (
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
        )}

        {currentStep === 1 && (
          <div className="p-4 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility <span className="text-red-500">*</span>
                </label>
                <FacilityHierarchyPicker 
                  name="mainFacilityId"
                  value={formData.mainFacilityId}
                  onChange={handleChange}
                  disabled={isViewMode}
                  placeholder="Select Facility"
                  className={errors.mainFacilityId ? 'border-red-500' : ''}
                  showSocietiesAndBuildings={false}
                />
                {errors.mainFacilityId && <p className="mt-1 text-sm text-red-500">{errors.mainFacilityId}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Head <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="mainFacilityHead"
                  value={formData.mainFacilityHead}
                  placeholder="Facility Head"
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none transition-all"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Code <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="facilityCode"
                  value={formData.facilityCode}
                  onChange={handleChange}
                  readOnly
                  placeholder="e.g. FL456"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                    errors.facilityCode ? 'border-red-500' : 'border-gray-300'
                  } bg-gray-50 text-gray-500 cursor-not-allowed`}
                />
                {errors.facilityCode && <p className="mt-1 text-sm text-red-500">{errors.facilityCode}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="facilityName"
                  value={formData.facilityName}
                  onChange={handleChange}
                  disabled={isViewMode}
                  placeholder="e.g. Kolhapur"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                    errors.facilityName ? 'border-red-500' : 'border-gray-300'
                  } ${isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                />
                {errors.facilityName && <p className="mt-1 text-sm text-red-500">{errors.facilityName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Category <span className="text-red-500">*</span>
                </label>
                <input 
                  list="facility-category-options"
                  type="text" 
                  name="category"
                  placeholder="Enter or select Category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  } ${isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                />
                <datalist id="facility-category-options">
                  {availableCategories.map(c => <option key={c as string} value={c as string} />)}
                </datalist>
                {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Description <span className="text-red-500">*</span>
              </label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isViewMode}
                placeholder="Enter facility description..."
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                } ${isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
              />
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-8 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleBack}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 text-center"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && activeTab === 'General' && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Location <span className="text-red-500">*</span></h3>
            
            <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200 space-y-5 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[220px]">
                  <input 
                    type="radio" 
                    id="partOfLocation" 
                    name="isLocationPart"
                    value="true"
                    checked={formData.isLocationPart === 'true'}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 cursor-pointer"
                  />
                  <label htmlFor="partOfLocation" className="text-sm font-medium text-gray-800 whitespace-nowrap cursor-pointer">
                    This facility is a part of
                  </label>
                </div>
                <div className="flex-1 max-w-md">
                  <FacilityHierarchyPicker 
                    name="parentFacilityId"
                    value={formData.parentFacilityId}
                    onChange={handleChange}
                    disabled={isViewMode || formData.isLocationPart === 'false'}
                    placeholder="Select"
                    className={errors.parentFacilityId ? 'border-red-500' : ''}
                    showSocietiesAndBuildings={false}
                    filterByMainFacilityId={formData.mainFacilityId}
                  />
                  {errors.parentFacilityId && <p className="mt-1 text-sm text-red-500">{errors.parentFacilityId}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  id="notPartOfLocation" 
                  name="isLocationPart"
                  value="false"
                  checked={formData.isLocationPart === 'false'}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 cursor-pointer"
                />
                <label htmlFor="notPartOfLocation" className="text-sm font-medium text-gray-800 cursor-pointer">
                  This facility is not a part of another location, is located at
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mb-8">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                />
                {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input 
                  type="text" 
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all border-gray-300 ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                    errors.country ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                />
                {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                    errors.state ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                />
                {errors.state && <p className="mt-1 text-sm text-red-500">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                />
                {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Sub-Category <span className="text-red-500">*</span>
                </label>
                <input 
                  list="facility-subcategory-options"
                  type="text" 
                  name="subCategory"
                  placeholder="Enter or select Sub-Category"
                  value={formData.subCategory}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                    errors.subCategory ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                />
                <datalist id="facility-subcategory-options">
                  {availableSubCategories.map(c => <option key={c as string} value={c as string} />)}
                </datalist>
                {errors.subCategory && <p className="mt-1 text-sm text-red-500">{errors.subCategory}</p>}
              </div>
            </div>

            <div className="border-t border-gray-200 my-8"></div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-6">General Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude / Longitude <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="text-red-500 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <div className="flex-1 flex gap-3">
                    <input 
                      type="text" 
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      disabled={isViewMode || formData.isLocationPart === 'true'}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${errors.latitude ? 'border-red-500' : 'border-gray-300'} ${isViewMode || formData.isLocationPart === 'true' ? 'bg-gray-50 text-gray-500' : 'bg-gray-50 text-gray-900'}`}
                      placeholder="Latitude"
                    />
                    <input 
                      type="text" 
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      disabled={isViewMode || formData.isLocationPart === 'true'}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${errors.longitude ? 'border-red-500' : 'border-gray-300'} ${isViewMode || formData.isLocationPart === 'true' ? 'bg-gray-50 text-gray-500' : 'bg-gray-50 text-gray-900'}`}
                      placeholder="Longitude"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Head Name <span className="text-red-500">*</span>
                </label>
                <EmployeeHierarchyPicker 
                  name="facilityHeadName"
                  value={formData.facilityHeadName}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  placeholder="Select Head Name"
                  className={errors.facilityHeadName ? 'border-red-500' : ''}
                />
                {errors.facilityHeadName && <p className="mt-1 text-sm text-red-500">{errors.facilityHeadName}</p>}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={isViewMode}
                placeholder="Notes"
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none border-gray-300 ${isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-8 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleBack}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 text-center"
              >
                Back
              </button>
              {!isViewMode && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex justify-center px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              )}
            </div>
          </form>
        )}

        {currentStep === 2 && activeTab === 'Document' && (
          <div className="space-y-6 w-full p-4 sm:p-8">
            {/* Toolbar */}
            <div className="flex justify-start items-center mb-6">
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold text-sm rounded-xl flex items-center gap-2 hover:bg-gray-300 transition-colors"
                >
                  <Plus size={16} className="text-[#00a651] stroke-[3]" /> Upload
                </button>
                
                {/* Upload Dropdown */}
                {isUploadMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                    <button 
                      type="button"
                      onClick={() => { setUploadModalType('File'); setIsUploadMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      File
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setUploadModalType('Link'); setIsUploadMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Link
                    </button>
                    <button 
                      type="button"
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
                          <button type="button" className="text-gray-400 hover:text-gray-800 transition-colors">
                            <Edit size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95"
              >
                Back
              </button>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
