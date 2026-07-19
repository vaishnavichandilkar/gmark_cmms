import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { CustomSelect } from '../../components/CustomSelect';

export function AddEmployee() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewMode = window.location.pathname.includes('/view/');

  const [formData, setFormData] = useState({
    employeeCode: '',
    fullName: '',
    mobileNumber: '',
    officialEmail: '',
    personalEmail: '',
    dateOfJoining: '',
    dateOfBirth: '',
    department: '',
    designation: '',
    salaryPayout: '',
    role: ''
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchEmployee();
    } else {
      fetchNextEmployeeCode();
    }
  }, [id]);

  const fetchNextEmployeeCode = async () => {
    try {
      setInitialLoading(true);
      const response = await api.get('/employees/next-code');
      setFormData(prev => ({
        ...prev,
        employeeCode: response.data.nextCode
      }));
    } catch (err) {
      console.error('Failed to fetch next employee code:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchEmployee = async () => {
    try {
      setInitialLoading(true);
      const response = await api.get(`/employees/${id}`);
      const data = response.data;
      
      // Format dates for input type="date"
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
      };

      setFormData({
        employeeCode: data.employeeCode || '',
        fullName: data.fullName || '',
        mobileNumber: data.mobileNumber || '',
        officialEmail: data.officialEmail || '',
        personalEmail: data.personalEmail || '',
        dateOfJoining: formatDate(data.dateOfJoining),
        dateOfBirth: formatDate(data.dateOfBirth),
        department: data.department || '',
        designation: data.designation || '',
        salaryPayout: data.salaryPayout ? data.salaryPayout.toString() : '',
        role: data.role || ''
      });
    } catch (err) {
      console.error('Failed to fetch employee details:', err);
      setError('Failed to load employee details.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (error) setError('');
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.employeeCode || !formData.fullName || !formData.mobileNumber || !formData.officialEmail || !formData.dateOfJoining || !formData.dateOfBirth || !formData.department || !formData.designation || !formData.role) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const payload: any = {
        ...formData,
        salaryPayout: formData.salaryPayout ? Number(formData.salaryPayout) : null
      };
      if (!payload.personalEmail) {
        payload.personalEmail = null;
      }

      if (id) {
        await api.patch(`/employees/${id}`, payload);
      } else {
        await api.post('/employees', payload);
      }
      
      // Navigate back to the list on success
      navigate('/master/employee');
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setError(err.response?.data?.message || 'Failed to save employee. Please try again.');
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
    <div className="p-6 w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 mr-2 focus:outline-none"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {id ? (isViewMode ? 'View Employee' : 'Edit Employee') : 'New Employee'}
        </h1>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex-1 overflow-y-auto">
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
          {/* Row 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Code <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="employeeCode"
              placeholder="Enter Employee Code"
              value={formData.employeeCode}
              onChange={handleChange}
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="fullName"
              placeholder="Enter Full Name"
              value={formData.fullName}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="mobileNumber"
              placeholder="Enter Mobile Number"
              value={formData.mobileNumber}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Official Email <span className="text-red-500">*</span>
            </label>
            <input 
              type="email" 
              name="officialEmail"
              placeholder="Enter Official Email"
              value={formData.officialEmail}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal Email
            </label>
            <input 
              type="email" 
              name="personalEmail"
              placeholder="Enter Personal Email"
              value={formData.personalEmail}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Joining <span className="text-red-500">*</span>
            </label>
            <input 
              type="date" 
              name="dateOfJoining"
              value={formData.dateOfJoining}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-700 ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Row 3 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input 
              type="date" 
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-700 ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <CustomSelect 
              name="department"
              value={formData.department}
              options={['General', 'Engineering', 'HR', 'Finance']}
              onChange={handleChange}
              placeholder="Select Department"
              disabled={isViewMode}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation <span className="text-red-500">*</span>
            </label>
            <CustomSelect 
              name="designation"
              value={formData.designation}
              options={['Supervisor', 'Manager', 'Staff']}
              onChange={handleChange}
              placeholder="Select Designation"
              disabled={isViewMode}
            />
          </div>

          {/* Row 4 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salary Payout
            </label>
            <input 
              type="number" 
              name="salaryPayout"
              placeholder="Enter Salary Amount"
              value={formData.salaryPayout}
              onChange={handleChange}
              readOnly={isViewMode}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${isViewMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <CustomSelect 
              name="role"
              value={formData.role}
              options={['Manager', 'Admin', 'User']}
              onChange={handleChange}
              placeholder="Select Role"
              disabled={isViewMode}
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
