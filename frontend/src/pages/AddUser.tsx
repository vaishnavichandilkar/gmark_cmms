import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../lib/api';
import { CustomSelect } from '../components/CustomSelect';

export function AddUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewMode = window.location.pathname.includes('/view/');

  const [formData, setFormData] = useState({
    mainFacilityId: '',
    mainFacilityHead: '',
    category: '',
    employeeId: '',
    employeeRole: '',
    employeeContactNumber: '',
    username: '',
    companyMailId: '',
    department: '',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const [facilities, setFacilities] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      
      // Fetch dependencies in parallel
      const [facilitiesRes, employeesRes] = await Promise.all([
        api.get('/main-facilities'),
        api.get('/employees')
      ]);
      
      setFacilities(facilitiesRes.data);
      setEmployees(employeesRes.data);

      if (id) {
        const response = await api.get(`/users/${id}`);
        const user = response.data;
        
        setFormData({
          mainFacilityId: user.mainFacilityId ? user.mainFacilityId.toString() : '',
          mainFacilityHead: user.mainFacility?.mainFacilityHead || '',
          category: user.mainFacility?.category || '',
          employeeId: user.employeeId ? user.employeeId.toString() : '',
          employeeRole: user.employee?.role || '',
          employeeContactNumber: user.employee?.mobileNumber || '',
          username: user.username || '',
          companyMailId: user.employee?.officialEmail || user.email || '',
          department: user.employee?.department || '',
          isActive: user.isActive !== undefined ? user.isActive : true,
        });
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setGlobalError('Failed to load form dependencies.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      };

      // Auto-fill Facility details
      if (name === 'mainFacilityId') {
        const facility = facilities.find(f => f.id.toString() === value);
        if (facility) {
          newData.mainFacilityHead = facility.mainFacilityHead || '';
          newData.category = facility.category || '';
          newData.isActive = facility.status === 'Active';
        } else {
          newData.mainFacilityHead = '';
          newData.category = '';
        }
      }

      // Auto-fill Employee details
      if (name === 'employeeId') {
        const employee = employees.find(emp => emp.id.toString() === value);
        if (employee) {
          newData.employeeRole = employee.role || '';
          newData.employeeContactNumber = employee.mobileNumber || '';
          newData.companyMailId = employee.officialEmail || '';
          newData.department = employee.department || '';
          
          if (employee.fullName) {
            newData.username = employee.fullName.toLowerCase().trim().replace(/\s+/g, '.');
          }
        } else {
          newData.employeeRole = '';
          newData.employeeContactNumber = '';
          newData.companyMailId = '';
          newData.department = '';
          newData.username = '';
        }
      }

      return newData;
    });
    
    if (globalError) {
      setGlobalError('');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setGlobalError('');
      
      if (!formData.username || !formData.companyMailId || !formData.mainFacilityId || !formData.employeeId) {
        setGlobalError('Please fill in all required fields (Main Facility, Employee, Username, and Email).');
        setLoading(false);
        return;
      }
      
      const employee = employees.find(emp => emp.id.toString() === formData.employeeId);
      
      // Determine UserRole mapping from Employee role, fallback to VIEWER
      const mapRole = (empRole: string) => {
        const roleStr = (empRole || '').toUpperCase();
        if (roleStr.includes('ADMIN')) return 'SOCIETY_ADMIN';
        if (roleStr.includes('OPERATOR') || roleStr.includes('SUPERVISOR')) return 'OPERATOR';
        if (roleStr.includes('MANAGER')) return 'BUILDING_ADMIN';
        return 'VIEWER';
      };

      const payload: any = { 
        username: formData.username,
        email: formData.companyMailId, // required by backend
        firstName: employee ? employee.fullName.split(' ')[0] : undefined,
        lastName: employee ? employee.fullName.split(' ').slice(1).join(' ') : undefined,
        mobileNumber: formData.employeeContactNumber,
        role: mapRole(formData.employeeRole),
        isActive: formData.isActive,
        employeeId: parseInt(formData.employeeId, 10),
        mainFacilityId: parseInt(formData.mainFacilityId, 10)
      };

      if (id) {
        await api.put(`/users/${id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      
      navigate('/user-management');
    } catch (err: any) {
      console.error('Error saving user:', err);
      setGlobalError(err.response?.data?.message || err.response?.data?.error || 'Failed to save user. Please try again.');
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

  // Format dropdown options
  const facilityOptions = facilities.map(f => ({
    label: f.mainFacilityName,
    value: f.id.toString()
  }));

  const employeeOptions = employees.map(emp => ({
    label: emp.fullName,
    value: emp.id.toString()
  }));

  return (
    <div className="p-6 w-full h-full flex flex-col overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 mr-2 focus:outline-none"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {id ? (isViewMode ? 'View User' : 'Edit User') : 'New User'}
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
              Main Facility <span className="text-red-500">*</span>
            </label>
            <CustomSelect 
              name="mainFacilityId"
              value={formData.mainFacilityId}
              onChange={handleChange}
              options={facilityOptions}
              disabled={isViewMode}
              placeholder="Select Facility"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Facility Head <span className="text-red-500">*</span>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="category"
              value={formData.category}
              placeholder="Category"
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none transition-all"
            />
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Name <span className="text-red-500">*</span>
            </label>
            <CustomSelect 
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              options={employeeOptions}
              disabled={isViewMode}
              placeholder="Select Employee"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Role <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="employeeRole"
              value={formData.employeeRole}
              placeholder="Employee Role"
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Contact Number <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="employeeContactNumber"
              value={formData.employeeContactNumber}
              placeholder="Contact Number"
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none transition-all"
            />
          </div>

          {/* Row 3 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="username"
              placeholder="user.name"
              value={formData.username}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Mail Id <span className="text-red-500">*</span>
            </label>
            <input 
              type="email" 
              name="companyMailId"
              value={formData.companyMailId}
              placeholder="Company Mail ID"
              onChange={handleChange}
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="department"
              value={formData.department}
              placeholder="Department"
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none transition-all"
            />
          </div>

          {/* Row 4 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="statusDisplay"
              value={formData.mainFacilityId ? (formData.isActive ? 'Active' : 'Inactive') : ''}
              placeholder="Status"
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none transition-all"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-10 border-t border-gray-100 pt-6">
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
