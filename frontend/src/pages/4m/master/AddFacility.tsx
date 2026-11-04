import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, Plus, Edit } from 'lucide-react';

import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { api } from '../../../lib/api';
import { FacilityHierarchyPicker } from '../../../components/4m/FacilityHierarchyPicker';
import { EmployeeHierarchyPicker } from '../../../components/4m/EmployeeHierarchyPicker';
import { hasFacilityTabPermission } from '../../../utils/permissions';
import { GiveAccessPromptModal } from '../../../components/4m/GiveAccessPromptModal';
import { GiveAccessModal } from '../../../components/4m/GiveAccessModal';
import toast from 'react-hot-toast';
import { fetchLocationByPincode } from '../../../utils/pincodeService';

const tabs = ['General', 'Document'];

export function AddFacility() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const returnUrl = (location.state as any)?.returnUrl;
  const isViewMode = window.location.pathname.includes('/view/');

  const { user } = useSelector((state: RootState) => state.auth);
  const permittedTabs = tabs.filter(tab => hasFacilityTabPermission(user, tab, 'view'));

  const [activeTab, setActiveTab] = useState('General');

  useEffect(() => {
    if (permittedTabs.length > 0 && !permittedTabs.includes(activeTab)) {
      setActiveTab(permittedTabs[0]);
    }
  }, [permittedTabs, activeTab]);

  const canEditGeneral = hasFacilityTabPermission(user, 'General', 'edit');
  const canCreateDocument = hasFacilityTabPermission(user, 'Document', 'create');
  const canDeleteDocument = hasFacilityTabPermission(user, 'Document', 'delete');

  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [_uploadModalType, setUploadModalType] = useState<string | null>(null);
  const [facilityDocuments, setFacilityDocuments] = useState<any[]>([]);

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

  const [createdFacilityForAccess, setCreatedFacilityForAccess] = useState<{ id: number; name: string; code?: string; category?: string } | null>(null);
  const [isAccessPromptOpen, setIsAccessPromptOpen] = useState(false);
  const [isGiveAccessModalOpen, setIsGiveAccessModalOpen] = useState(false);

  useEffect(() => {
    fetchMainFacilities();
    fetchFacilities();

    if (id) {
      fetchFacility();
    } else {
      let restoredDraft = false;
      const draft = sessionStorage.getItem('addFacilityDraft');
      const newlyAddedMainFacilityId = sessionStorage.getItem('newlyAddedMainFacilityId');

      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (newlyAddedMainFacilityId) {
            parsed.mainFacilityId = newlyAddedMainFacilityId;
            sessionStorage.removeItem('newlyAddedMainFacilityId');
          }
          setFormData(parsed);
          sessionStorage.removeItem('addFacilityDraft');
          restoredDraft = true;
          if (!parsed.facilityCode) {
            fetchNextFacilityCode();
          }
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }

      if (!restoredDraft) {
        fetchNextFacilityCode();
      }
    }
  }, [id]);

  useEffect(() => {
    const pin = (formData.postalCode || '').trim().replace(/\D/g, '');
    if (pin.length === 6 && formData.isLocationPart === 'false' && !isViewMode) {
      let isCurrent = true;
      const fetchPostalCodeDetails = async () => {
        try {
          const loc = await fetchLocationByPincode(pin);
          if (loc && isCurrent) {
            setFormData(prev => ({
              ...prev,
              city: loc.city,
              state: loc.state,
              country: loc.country || 'India',
            }));
            // Clear any errors related to these fields
            setErrors(prev => ({ ...prev, city: '', state: '', country: '', postalCode: '' }));
          }
        } catch (error) {
          console.error('Failed to fetch postal code details', error);
        }
      };

      fetchPostalCodeDetails();
      return () => {
        isCurrent = false;
      };
    }
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


  const fetchFacility = async () => {
    try {
      setInitialLoading(true);
      const response = await api.get(`/facilities/${id}`);
      const data = response.data;
      const initialParentFacilityId = data.parentFacilityId 
        ? `fac-${data.parentFacilityId}` 
        : (data.isLocationPart && data.mainFacilityId ? `mf-${data.mainFacilityId}` : '');
      const initialParentFacilityIdType = data.parentFacilityId 
        ? 'facility' 
        : (data.isLocationPart && data.mainFacilityId ? 'mainFacility' : '');

      setFormData({
        mainFacilityId: data.mainFacilityId ? data.mainFacilityId.toString() : '',
        mainFacilityHead: data.mainFacility?.mainFacilityHead || '',
        facilityCode: data.facilityCode || '',
        facilityName: data.facilityName || '',
        category: data.category || '',
        description: data.description || '',
        isLocationPart: data.isLocationPart ? 'true' : 'false',
        parentFacilityId: initialParentFacilityId,
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
        parentFacilityIdType: initialParentFacilityIdType
      });
      if (Array.isArray(data.documents)) {
        setFacilityDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch facility:', error);
      setGlobalError('Failed to load facility details.');
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.mainFacilityId) newErrors.mainFacilityId = 'Facility is required';
    if (!formData.facilityCode) newErrors.facilityCode = 'Facility Code is required';
    if (!formData.facilityName) newErrors.facilityName = 'Facility Name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description?.trim()) newErrors.description = 'Facility Description is required';

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
    let { name, value, dataset } = e.target;

    if (name === 'postalCode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }
    if (name === 'latitude' || name === 'longitude') {
      value = value.replace(/[^0-9.-]/g, '');
    }

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
        const cleanId = (value || '').toString().replace(/^(fac-|f-|mf-)/, '');
        if (type === 'mainFacility') {
          const parentFacility = mainFacilities.find(f => f.id.toString() === cleanId);
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
          const parentFacility = facilities.find(f => f.id.toString() === cleanId);
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

  const handleBack = () => {
    if (returnUrl) {
      navigate(returnUrl);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!validateForm()) {
      if (activeTab !== 'General') {
        setActiveTab('General');
      }
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setGlobalError('');

      const cleanMainFacilityId = (formData.mainFacilityId || '').toString().replace(/^(fac-|f-|mf-)/, '');
      const rawParentFacilityId = (formData.parentFacilityId || '').toString().replace(/^(fac-|f-|mf-)/, '');
      const parsedParentId = parseInt(rawParentFacilityId, 10);
      const isParentAFacility = (formData as any).parentFacilityIdType === 'facility' || 
        formData.parentFacilityId.startsWith('fac-') || 
        formData.parentFacilityId.startsWith('f-');

      const submitData = {
        mainFacilityId: parseInt(cleanMainFacilityId, 10),
        facilityCode: formData.facilityCode,
        facilityName: formData.facilityName,
        category: formData.category,
        description: formData.description,
        isLocationPart: formData.isLocationPart === 'true',
        parentFacilityId: formData.isLocationPart === 'true' && isParentAFacility && !isNaN(parsedParentId)
          ? parsedParentId
          : null,
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
        toast.success('Facility saved successfully!');
        navigate(returnUrl || '/facility-management');
      } else if (!id) {
        const createRes = await api.post('/facilities', submitData);
        const newFacility = createRes.data;
        toast.success('Facility saved successfully!');
        setCreatedFacilityForAccess({
          id: newFacility?.id,
          name: newFacility?.facilityName || formData.facilityName,
          code: newFacility?.facilityCode || formData.facilityCode,
          category: newFacility?.category || formData.category,
        });
        setIsAccessPromptOpen(true);
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-600"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {isViewMode ? 'View Facility' : id ? 'Edit Facility' : 'Add Facility'}
          </h1>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="h-9 px-4 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold transition-all active:scale-95 text-center cursor-pointer shadow-xs"
          >
            Back
          </button>
          {!isViewMode && (canEditGeneral || canCreateDocument) && (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="flex justify-center items-center h-9 px-5 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-semibold rounded-lg transition-colors gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed shadow-xs cursor-pointer min-w-[80px]"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                'Save'
              )}
            </button>
          )}
        </div>
      </div>

      {globalError && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-medium">
          {globalError}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden w-full">
        {/* Tabs Bar */}
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50">
          {permittedTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-w-[100px] py-2.5 px-5 text-xs font-semibold border-r border-gray-200 transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {permittedTabs.length === 0 && (
          <div className="p-10 text-center text-gray-500">
            <p className="text-xs font-medium">You do not have permission to view any tabs in this section.</p>
          </div>
        )}

        {activeTab === 'General' && permittedTabs.includes('General') && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            {/* Section 1: Facility Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                  selectableTypes={['mainFacility']}
                  onAddFacility={() => {
                    sessionStorage.setItem('addFacilityDraft', JSON.stringify(formData));
                    navigate('/master/main-facility/new', { state: { returnUrl: location.pathname } });
                  }}
                  onEmptyStateAdd={() => {
                    sessionStorage.setItem('addFacilityDraft', JSON.stringify(formData));
                    navigate('/master/main-facility/new', { state: { returnUrl: location.pathname } });
                  }}
                />
                {errors.mainFacilityId && <p className="mt-1 text-xs text-red-500">{errors.mainFacilityId}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Facility Head <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="mainFacilityHead"
                  value={formData.mainFacilityHead}
                  placeholder="Facility Head"
                  readOnly
                  className="w-full h-9 px-3 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-700 outline-none transition-all cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Facility Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="facilityCode"
                  value={formData.facilityCode}
                  onChange={handleChange}
                  readOnly
                  placeholder="e.g. FL456"
                  className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all ${
                    errors.facilityCode ? 'border-red-500' : 'border-gray-300'
                  } bg-gray-50 text-gray-500 cursor-not-allowed`}
                />
                {errors.facilityCode && <p className="mt-1 text-xs text-red-500">{errors.facilityCode}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="facilityName"
                  value={formData.facilityName}
                  onChange={handleChange}
                  disabled={isViewMode}
                  placeholder="e.g. Kolhapur"
                  className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all ${
                    errors.facilityName ? 'border-red-500' : 'border-gray-300'
                  } ${isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
                />
                {errors.facilityName && <p className="mt-1 text-xs text-red-500">{errors.facilityName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                  className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  } ${isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
                />
                <datalist id="facility-category-options">
                  {availableCategories.map(c => <option key={c as string} value={c as string} />)}
                </datalist>
                {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Facility Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isViewMode}
                placeholder="Enter facility description..."
                rows={3}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                } ${isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
              />
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
            </div>

            <div className="border-t border-gray-200 my-5"></div>

            {/* Section 2: Location Details */}
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Location <span className="text-red-500">*</span></h3>

            <div className="bg-gray-50/70 p-3.5 sm:p-4 rounded-xl border border-gray-200 space-y-3.5 mb-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-[200px]">
                  <input
                    type="radio"
                    id="partOfLocation"
                    name="isLocationPart"
                    value="true"
                    checked={formData.isLocationPart === 'true'}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-3.5 h-3.5 text-green-600 border-gray-300 focus:ring-green-500 cursor-pointer"
                  />
                  <label htmlFor="partOfLocation" className="text-xs font-semibold text-gray-800 whitespace-nowrap cursor-pointer">
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
                    selectableTypes={['mainFacility', 'facility']}
                    excludeFacilityId={id}
                    defaultExpanded={true}
                    onAddFacility={() => {
                      sessionStorage.setItem('addFacilityDraft', JSON.stringify(formData));
                      navigate('/master/facility/new', { state: { returnUrl: location.pathname } });
                    }}
                  />
                  {errors.parentFacilityId && <p className="mt-1 text-xs text-red-500">{errors.parentFacilityId}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  id="notPartOfLocation"
                  name="isLocationPart"
                  value="false"
                  checked={formData.isLocationPart === 'false'}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className="w-3.5 h-3.5 text-green-600 border-gray-300 focus:ring-green-500 cursor-pointer"
                />
                <label htmlFor="notPartOfLocation" className="text-xs font-semibold text-gray-800 cursor-pointer">
                  This facility is not a part of another location, is located at
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-5">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  rows={2.5}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all resize-none ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
                />
                {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all border-gray-300 ${
                    (isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all ${
                    errors.country ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
                />
                {errors.country && <p className="mt-1 text-xs text-red-500">{errors.country}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all ${
                    errors.state ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
                />
                {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={isViewMode || formData.isLocationPart === 'true'}
                  className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
                />
                {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                  className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all ${
                    errors.subCategory ? 'border-red-500' : 'border-gray-300'
                  } ${(isViewMode || formData.isLocationPart === 'true') ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
                />
                <datalist id="facility-subcategory-options">
                  {availableSubCategories.map(c => <option key={c as string} value={c as string} />)}
                </datalist>
                {errors.subCategory && <p className="mt-1 text-xs text-red-500">{errors.subCategory}</p>}
              </div>
            </div>

            <div className="border-t border-gray-200 my-5"></div>

            {/* Section 3: General Information */}
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">General Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Latitude / Longitude <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2.5">
                  <div className="text-red-500 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <div className="flex-1 flex gap-2.5">
                    <input
                      type="text"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      disabled={isViewMode || formData.isLocationPart === 'true'}
                      className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all ${
                        errors.latitude ? 'border-red-500' : 'border-gray-300'
                      } ${isViewMode || formData.isLocationPart === 'true' ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
                      placeholder="Latitude"
                    />
                    <input
                      type="text"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      disabled={isViewMode || formData.isLocationPart === 'true'}
                      className={`w-full h-9 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all ${
                        errors.longitude ? 'border-red-500' : 'border-gray-300'
                      } ${isViewMode || formData.isLocationPart === 'true' ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}`}
                      placeholder="Longitude"
                    />
                  </div>
                </div>
                {(errors.latitude || errors.longitude) && (
                  <p className="mt-1 text-xs text-red-500">{errors.latitude || errors.longitude}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                {errors.facilityHeadName && <p className="mt-1 text-xs text-red-500">{errors.facilityHeadName}</p>}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={isViewMode}
                placeholder="Notes"
                rows={2.5}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all resize-none border-gray-300 ${
                  isViewMode ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'
                }`}
              />
            </div>
          </form>
        )}

        {activeTab === 'Document' && permittedTabs.includes('Document') && (
          <div className="space-y-4 w-full p-4 sm:p-6">
            {/* Toolbar */}
            {canCreateDocument && !isViewMode && (
              <div className="flex justify-start items-center mb-4">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                    className="h-9 px-3.5 bg-gray-100 text-gray-800 font-semibold text-xs rounded-lg flex items-center gap-1.5 hover:bg-gray-200 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus size={14} className="text-green-600 stroke-[3]" /> Upload
                  </button>

                  {/* Upload Dropdown */}
                  {isUploadMenuOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        type="button"
                        onClick={() => { setUploadModalType('File'); setIsUploadMenuOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        File
                      </button>
                      <button
                        type="button"
                        onClick={() => { setUploadModalType('Link'); setIsUploadMenuOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Link
                      </button>
                      <button
                        type="button"
                        onClick={() => { setUploadModalType('Note'); setIsUploadMenuOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Notes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto w-full border border-gray-200 rounded-lg">
              <table className="w-full text-left whitespace-nowrap text-xs text-gray-600">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 w-10 text-center"><input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300" disabled /></th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 uppercase">No.</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 uppercase">Name</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 uppercase">Document Type</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 uppercase">Document Details</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {facilityDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-gray-500 bg-white">
                        No documents added yet.
                      </td>
                    </tr>
                  ) : (
                    facilityDocuments.map((doc, index) => (
                      <tr key={doc.id || index} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-green-500 focus:ring-green-500 cursor-pointer" />
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{index + 1}</td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-800">{doc.name || formData.facilityName || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{doc.type || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{doc.details || doc.url || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center">
                          <div className="flex justify-center">
                            {!isViewMode && (canCreateDocument || canDeleteDocument) ? (
                              <button type="button" className="text-gray-400 hover:text-gray-800 transition-colors p-1 cursor-pointer">
                                <Edit size={14} />
                              </button>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {createdFacilityForAccess && (
        <>
          <GiveAccessPromptModal
            isOpen={isAccessPromptOpen}
            targetType="facility"
            targetName={createdFacilityForAccess.name}
            targetCode={createdFacilityForAccess.code}
            onGiveAccess={() => {
              setIsAccessPromptOpen(false);
              setIsGiveAccessModalOpen(true);
            }}
            onSkip={() => {
              setIsAccessPromptOpen(false);
              navigate(returnUrl || '/facility-management');
            }}
          />

          <GiveAccessModal
            isOpen={isGiveAccessModalOpen}
            onClose={() => {
              setIsGiveAccessModalOpen(false);
              navigate(returnUrl || '/facility-management');
            }}
            targetType="facility"
            targetId={createdFacilityForAccess.id}
            targetName={createdFacilityForAccess.name}
            targetCode={createdFacilityForAccess.code}
            targetCategory={createdFacilityForAccess.category}
            onSuccess={() => {
              navigate(returnUrl || '/facility-management');
            }}
          />
        </>
      )}
    </div>
  );
}
