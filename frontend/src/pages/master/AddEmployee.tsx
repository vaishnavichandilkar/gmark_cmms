import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, User, Mail, Phone, Calendar, Briefcase, Building2, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { CustomSelect } from '../../components/CustomSelect';

export function AddEmployee() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
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
    salaryPayout: ''
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState('');
  const [designationsList, setDesignationsList] = useState<string[]>([]);

  useEffect(() => {
    fetchDesignations();
    if (id) {
      fetchEmployee();
    } else {
      fetchNextEmployeeCode();
    }
  }, [id]);

  const fetchDesignations = async () => {
    try {
      const response = await api.get('/designations');
      // Filter for active designations and map to name
      const activeDesignations = response.data
        .filter((d: any) => d.isActive)
        .map((d: any) => d.name);
      setDesignationsList(activeDesignations);
    } catch (err) {
      console.error('Failed to fetch designations:', err);
    }
  };

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
        salaryPayout: data.salaryPayout ? data.salaryPayout.toString() : ''
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
    
    if (name === 'mobileNumber') {
      const onlyDigits = value.replace(/\D/g, '');
      if (onlyDigits.length > 10) return;
      setFormData(prev => ({
        ...prev,
        [name]: onlyDigits
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user types
    if (error) setError('');
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.employeeCode || !formData.fullName || !formData.mobileNumber || !formData.officialEmail || !formData.dateOfJoining || !formData.dateOfBirth || !formData.department || !formData.designation) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.mobileNumber.length !== 10) {
      setError('Mobile Number must be exactly 10 digits.');
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
      <div className="sm:p-6 w-full h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="sm:p-6 pb-10 w-full h-full flex flex-col">
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
      <div className={isViewMode ? "" : "bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8"}>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {isViewMode ? (
          <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
            {/* Profile Header Banner */}
            <div className="relative rounded-3xl overflow-hidden shadow-md bg-white">
              {/* Animated Gradient Background Cover */}
              <div className="h-32 sm:h-48 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] relative overflow-hidden">
                {/* Decorative overlapping circles */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white opacity-10 blur-xl"></div>
              </div>
              
              {/* Profile Details (Overlapping) */}
              <div className="px-6 sm:px-10 pb-8 relative flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 -mt-16 sm:-mt-20">
                {/* Avatar with Ring */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-white rounded-full blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-full p-2 shadow-lg flex items-center justify-center flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center overflow-hidden border border-gray-100 relative group-hover:scale-[1.02] transition-transform duration-300">
                      <User size={64} className="text-gray-400 drop-shadow-sm" />
                    </div>
                    {/* Status Indicator */}
                    <div className="absolute bottom-3 right-3 w-5 h-5 bg-green-500 border-4 border-white rounded-full shadow-sm"></div>
                  </div>
                </div>

                {/* Name and Tags */}
                <div className="flex-1 text-center sm:text-left mb-2 sm:mb-4">
                  <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">
                    {formData.fullName || 'Unknown Employee'}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-sm font-medium text-sm">
                      <Briefcase size={16} />
                      {formData.designation || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 shadow-sm font-medium text-sm">
                      <Building2 size={16} />
                      {formData.department || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              
              {/* Contact Information Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300 group">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-xl">
                      <Phone size={22} className="text-emerald-600" />
                    </div>
                    Contact Info
                  </h3>
                </div>

                <div className="space-y-6">
                  {/* Item */}
                  <div className="flex items-center gap-5 p-3 -mx-3 rounded-2xl hover:bg-gray-50/80 transition-colors cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-gray-100">
                      <Phone size={20} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-1">Mobile Number</p>
                      <p className="text-base text-gray-900 font-bold truncate">{formData.mobileNumber || '-'}</p>
                    </div>
                  </div>

                  {/* Item */}
                  <div className="flex items-center gap-5 p-3 -mx-3 rounded-2xl hover:bg-gray-50/80 transition-colors cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-gray-100">
                      <Mail size={20} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-1">Official Email</p>
                      <p className="text-base text-gray-900 font-bold truncate">{formData.officialEmail || '-'}</p>
                    </div>
                  </div>

                  {/* Item */}
                  <div className="flex items-center gap-5 p-3 -mx-3 rounded-2xl hover:bg-gray-50/80 transition-colors cursor-default opacity-80 hover:opacity-100">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-gray-100">
                      <Mail size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-1">Personal Email</p>
                      <p className="text-base text-gray-600 font-semibold truncate">{formData.personalEmail || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Information Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300 group">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl">
                      <Briefcase size={22} className="text-blue-600" />
                    </div>
                    Work Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Item */}
                  <div className="flex flex-col gap-2 p-5 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group/item">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={16} className="text-gray-400 group-hover/item:text-blue-500 transition-colors" />
                      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Employee Code</p>
                    </div>
                    <p className="text-lg text-gray-900 font-black">{formData.employeeCode || '-'}</p>
                  </div>

                  {/* Item */}
                  <div className="flex flex-col gap-2 p-5 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group/item">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet size={16} className="text-gray-400 group-hover/item:text-green-500 transition-colors" />
                      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Salary Payout</p>
                    </div>
                    <p className="text-lg text-gray-900 font-black">{formData.salaryPayout ? `₹ ${formData.salaryPayout}` : '-'}</p>
                  </div>

                  {/* Item */}
                  <div className="flex flex-col gap-2 p-5 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group/item">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={16} className="text-gray-400 group-hover/item:text-purple-500 transition-colors" />
                      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Date of Joining</p>
                    </div>
                    <p className="text-base text-gray-900 font-bold">{formData.dateOfJoining || '-'}</p>
                  </div>

                  {/* Item */}
                  <div className="flex flex-col gap-2 p-5 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group/item">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={16} className="text-gray-400 group-hover/item:text-orange-500 transition-colors" />
                      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Date of Birth</p>
                    </div>
                    <p className="text-base text-gray-900 font-bold">{formData.dateOfBirth || '-'}</p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        ) : (
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-700"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-700"
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation <span className="text-red-500">*</span>
              </label>
              <CustomSelect 
                name="designation"
                value={formData.designation}
                options={[
                  ...designationsList,
                  { label: '+ Add new Designation', value: 'ADD_NEW_DESIGNATION', isAction: true }
                ]}
                onChange={(e) => {
                  if (e.target.value === 'ADD_NEW_DESIGNATION') {
                    navigate('/manage-access/new', { state: { returnUrl: location.pathname } });
                  } else {
                    handleChange(e);
                  }
                }}
                placeholder="Select Designation"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-10">
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
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-70 min-w-[100px]"
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
