import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';
import { api } from '../../lib/api';

export function AddMainFacility() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewMode = window.location.pathname.includes('/view/');

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
  const [employees, setEmployees] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    fetchEmployees();
    if (id) {
      fetchFacility();
    } else {
      fetchNextFacilityCode();
    }
  }, [id]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees list:', error);
    }
  };

  useEffect(() => {
    if (formData.postalCode && formData.postalCode.length === 6 && !isViewMode) {
      const fetchLocationDetails = async () => {
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${formData.postalCode}`);
          const data = await res.json();
          if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            setFormData(prev => ({
              ...prev,
              country: postOffice.Country || '',
              state: postOffice.State || '',
              city: postOffice.District || postOffice.Name || ''
            }));
          }
        } catch (err) {
          console.error('Failed to fetch location details', err);
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
        await api.post('/main-facilities', payload);
      }
      navigate('/master/main-facility');
    } catch (err: any) {
      console.error('Error saving main facility:', err);
      setGlobalError(err.response?.data?.message || 'Failed to save facility. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="p-6 w-full h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 mr-2 focus:outline-none"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {id ? (isViewMode ? 'View Main Facility' : 'Edit Main Facility') : 'New Main Facility'}
        </h1>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        
        {globalError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {globalError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
          {/* Row 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Facility Code <span className="text-red-500">*</span>
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
              Main Facility Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="mainFacilityName"
              placeholder="Enter Facility Name"
              value={formData.mainFacilityName}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Facility Head <span className="text-red-500">*</span>
            </label>
            <CustomSelect 
              name="mainFacilityHead"
              value={formData.mainFacilityHead}
              options={employees.map(emp => ({ label: emp.fullName, value: emp.fullName }))}
              onChange={handleChange}
              placeholder="Select Head"
              disabled={isViewMode}
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
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="category"
              placeholder="Enter Category"
              value={formData.category}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategory <span className="text-red-500">*</span>
            </label>
            <CustomSelect 
              name="subcategory"
              value={formData.subcategory}
              options={['Type A', 'Type B']}
              onChange={handleChange}
              placeholder="Select Subcategory"
              disabled={isViewMode}
            />
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
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
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
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
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
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
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
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
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
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
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
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
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
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
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
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
          ></textarea>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-10">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            disabled={loading}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
          >
            Back
          </button>
          {!isViewMode && (
            <button 
              type="button" 
              onClick={handleSave}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-70 min-w-[100px]"
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
