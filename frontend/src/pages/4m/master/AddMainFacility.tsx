import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, Building2, MapPin, Tag, CheckCircle2, User, Globe, Hash } from 'lucide-react';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { EmployeeHierarchyPicker } from '../../../components/4m/EmployeeHierarchyPicker';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export function AddMainFacility() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isViewMode = window.location.pathname.includes('/view/');
  const returnUrl = location.state?.returnUrl;

  const [formData, setFormData] = useState({
    mainFacilityCode: '',
    mainFacilityName: '',
    mainFacilityHead: '',
    gstNumber: '',
    category: '',
    subcategory: '',
    status: '',
    description: '',
    latitude: '',
    longitude: '',
    postalCode: '',
    address: '',
    country: '',
    state: '',
    city: ''
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const [mainFacilities, setMainFacilities] = useState<any[]>([]);

  const { user } = useSelector((state: RootState) => state.auth);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    fetchMainFacilities();
    
    let restoredDraft = false;
    const draft = sessionStorage.getItem('addMainFacilityDraft');
    const newEmployeeName = sessionStorage.getItem('newlyAddedEmployeeName');
    
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (newEmployeeName) {
          parsed.mainFacilityHead = newEmployeeName;
          sessionStorage.removeItem('newlyAddedEmployeeName');
        }
        setFormData(parsed);
        sessionStorage.removeItem('addMainFacilityDraft');
        restoredDraft = true;
        if (!parsed.mainFacilityCode && !id) {
          fetchNextFacilityCode();
        }
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }
    
    if (id) {
      if (!restoredDraft) fetchFacility();
    } else {
      if (!restoredDraft) fetchNextFacilityCode();
    }
  }, [id]);


  const fetchMainFacilities = async () => {
    try {
      const response = await api.get('/main-facilities');
      setMainFacilities(response.data);
    } catch (error) {
      console.error('Failed to fetch main facilities:', error);
    }
  };

  useEffect(() => {
    if (formData.postalCode && formData.postalCode.length === 6 && !isViewMode) {
      const fetchLocationDetails = async () => {
        try {
          const response = await api.get(`/postal-codes/${formData.postalCode}`);
          if (response.data) {
            setFormData(prev => ({
              ...prev,
              city: response.data.city,
              state: response.data.state,
              country: response.data.country || 'India',
            }));
            setErrors(prev => ({ ...prev, city: '', state: '', country: '' }));
          }
        } catch (error) {
          console.error('Failed to fetch postal code details', error);
        }
      };
      fetchLocationDetails();
    }
  }, [formData.postalCode, isViewMode]);

  const fetchFacility = async () => {
    try {
      setInitialLoading(true);
      const response = await api.get(`/main-facilities/${id}`);
      const data = response.data;
      setFormData({
        mainFacilityCode: data.mainFacilityCode || '',
        mainFacilityName: data.mainFacilityName || '',
        mainFacilityHead: data.mainFacilityHead || '',
        gstNumber: data.gstNumber || '',
        category: data.category || '',
        subcategory: data.subcategory || '',
        status: data.status || 'Active',
        description: data.description || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        postalCode: data.postalCode || '',
        address: data.address || '',
        country: data.country || '',
        state: data.state || '',
        city: data.city || ''
      });
    } catch (error) {
      console.error('Failed to fetch facility:', error);
      setGlobalError('Failed to load facility details.');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchNextFacilityCode = async () => {
    try {
      const response = await api.get('/main-facilities/next-code');
      if (response.data?.nextCode) {
        setFormData(prev => ({
          ...prev,
          mainFacilityCode: response.data.nextCode
        }));
      }
    } catch (error) {
      console.error('Failed to fetch next facility code:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    
    // Restrict postalCode to numbers only and max 6 digits
    if (name === 'postalCode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }
    
    // Auto-capitalize GST Number and enforce max 15 length
    if (name === 'gstNumber') {
      value = value.toUpperCase().slice(0, 15);
    }
    
    // Restrict latitude and longitude to valid coordinate characters (numbers, dot, minus)
    if (name === 'latitude' || name === 'longitude') {
      value = value.replace(/[^0-9.-]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (globalError) {
      setGlobalError('');
    }
  };

  const handleSave = async () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.mainFacilityCode) newErrors.mainFacilityCode = 'Facility Code is required';
    if (!formData.mainFacilityName) newErrors.mainFacilityName = 'Facility Name is required';
    if (!formData.mainFacilityHead) newErrors.mainFacilityHead = 'Facility Head is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.subcategory) newErrors.subcategory = 'Subcategory is required';
    if (!formData.status) newErrors.status = 'Status is required';
    if (!formData.address) newErrors.address = 'Address is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      setGlobalError('');
      
      const payload: any = { ...formData };
      if (!payload.description) payload.description = null;
      if (!payload.latitude) payload.latitude = null;
      if (!payload.longitude) payload.longitude = null;
      if (!payload.postalCode) payload.postalCode = null;
      if (!payload.address) payload.address = null;
      if (!payload.country) payload.country = null;
      if (!payload.state) payload.state = null;
      if (!payload.city) payload.city = null;

      if (id) {
        await api.patch(`/main-facilities/${id}`, payload);
      } else {
        const res = await api.post('/main-facilities', payload);
        if (returnUrl) {
          sessionStorage.setItem('newlyAddedMainFacilityId', res.data.id.toString());
        }
      }
      toast.success('Facility saved successfully!');
      navigate(returnUrl || '/master/main-facility');
    } catch (err: any) {
      console.error('Error saving facility:', err);
      setGlobalError(err.response?.data?.message || 'Failed to save facility. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const availableCategories = user?.role !== 'SUPER_ADMIN' 
    ? Array.from(new Set(mainFacilities.map(f => f.category).filter(Boolean)))
    : [];

  const availableSubCategories = user?.role !== 'SUPER_ADMIN'
    ? Array.from(new Set(mainFacilities.map(f => f.subcategory).filter(Boolean)))
    : [];

  if (initialLoading) {
    return (
      <div className="sm:p-6 w-full h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="sm:p-6 pb-10 w-full h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 mr-2 focus:outline-none"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {id ? (isViewMode ? 'View Facility' : 'Edit Facility') : 'New Facility'}
        </h1>
      </div>

      {/* Form Container */}
      <div className={isViewMode ? "" : "bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8"}>
        
        {globalError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {globalError}
          </div>
        )}

        {isViewMode ? (
          <div className="space-y-8">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-inner flex-shrink-0">
                <Building2 size={48} className="text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold mb-2">{formData.mainFacilityName || 'Unknown Facility'}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-50 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Hash size={18} />
                    <span>{formData.mainFacilityCode || 'N/A'}</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    {formData.status === 'Active' ? <CheckCircle2 size={18} className="text-green-300" /> : <CheckCircle2 size={18} className="text-gray-300" />}
                    <span>{formData.status || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Information Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                  <Tag size={20} className="text-emerald-500" />
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
                      <p className="text-sm font-medium text-gray-500">Subcategory</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.subcategory || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Globe size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">GST Number</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.gstNumber || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <User size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Facility Head</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.mainFacilityHead || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Building2 size={18} className="text-gray-500" />
                    </div>
                    <div className="w-full">
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="text-base text-gray-900 font-semibold break-words">{formData.description || '-'}</p>
                    </div>
                  </div>
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
                      <MapPin size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.address || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Globe size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">City / Postal Code</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {[formData.city, formData.postalCode].filter(Boolean).join(' - ') || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Globe size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">State / Country</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {[formData.state, formData.country].filter(Boolean).join(', ') || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <MapPin size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Coordinates (Lat, Long)</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
          {/* Row 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Code <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="mainFacilityCode"
              placeholder="Enter Facility Code"
              value={formData.mainFacilityCode}
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="mainFacilityName"
              placeholder="Enter Facility Name"
              value={formData.mainFacilityName}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Head <span className="text-red-500">*</span>
            </label>
            <EmployeeHierarchyPicker 
              name="mainFacilityHead"
              value={formData.mainFacilityHead}
              onChange={handleChange}
              placeholder="Select Head"
              disabled={isViewMode}
              onEmptyStateAdd={() => {
                sessionStorage.setItem('addMainFacilityDraft', JSON.stringify(formData));
                navigate('/master/employee/new', { state: { returnUrl: location.pathname } });
              }}
            />
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Number
            </label>
            <input 
              type="text" 
              name="gstNumber"
              placeholder="Enter GST Number"
              value={formData.gstNumber}
              onChange={handleChange}
              readOnly={isViewMode}
              maxLength={15}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <input 
              list="category-options"
              type="text" 
              name="category"
              placeholder="Enter or select Category"
              value={formData.category}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
            <datalist id="category-options">
              {availableCategories.map(c => <option key={c as string} value={c as string} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategory <span className="text-red-500">*</span>
            </label>
            <input 
              list="subcategory-options"
              type="text" 
              name="subcategory"
              placeholder="Enter or select Subcategory"
              value={formData.subcategory}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
            <datalist id="subcategory-options">
              {availableSubCategories.map(c => <option key={c as string} value={c as string} />)}
            </datalist>
          </div>

          {/* Row 3 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <CustomSelect 
              name="status"
              value={formData.status}
              options={['Active', 'Inactive']}
              onChange={handleChange}
              placeholder="Select Status"
              disabled={isViewMode}
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <textarea 
            name="address"
            placeholder="Enter Full Address"
            value={formData.address}
            onChange={handleChange}
            readOnly={isViewMode}
            rows={2}
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all resize-none ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
          ></textarea>
        </div>

        {/* Row 5 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="postalCode"
              placeholder="Enter Postal Code"
              value={formData.postalCode}
              onChange={handleChange}
              readOnly={isViewMode}
              maxLength={6}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input 
              type="text" 
              name="country"
              placeholder="Enter Country"
              value={formData.country}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input 
              type="text" 
              name="state"
              placeholder="Enter State"
              value={formData.state}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        {/* Row 6 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input 
              type="text" 
              name="city"
              placeholder="Enter City"
              value={formData.city}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="latitude"
              placeholder="Enter Latitude"
              value={formData.latitude}
              onChange={handleChange}
              readOnly={isViewMode}
              maxLength={15}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="longitude"
              placeholder="Enter Longitude"
              value={formData.longitude}
              onChange={handleChange}
              readOnly={isViewMode}
              maxLength={15}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea 
            name="description"
            placeholder="Enter Description"
            value={formData.description}
            onChange={handleChange}
            readOnly={isViewMode}
            rows={2}
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all resize-none ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
          ></textarea>
        </div>
        </>
        )}

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-10 border-t border-gray-100 pt-6">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
          >
            Back
          </button>
          {!isViewMode && (
            <button 
              type="button" 
              onClick={handleSave}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all shadow-xs disabled:opacity-70 min-w-[100px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save'
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
