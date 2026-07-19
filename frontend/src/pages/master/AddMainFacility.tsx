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
    status: 'Active',
    description: '',
    latitude: '',
    longitude: '',
    postalCode: ''
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    if (id) {
      fetchFacility();
    } else {
      fetchNextFacilityCode();
    }
  }, [id]);

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
        postalCode: data.postalCode || ''
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
    const { name, value } = e.target;
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex-1">
        
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
              options={['Abhi Teli', 'Rahul Sharma', 'Sneha Patil']}
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

        {/* Row 4 (Full Width) */}
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
            rows={3}
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
          ></textarea>
        </div>

        {/* Row 5 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mt-6">
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
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
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
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-10">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            disabled={loading}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
          >
            Back
          </button>
          {!isViewMode && (
            <button 
              type="button" 
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
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
