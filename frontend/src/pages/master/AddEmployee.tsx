import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, User, Mail, Phone, Calendar, Briefcase, Building2, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { CustomSelect } from '../../components/CustomSelect';
import toast from 'react-hot-toast';

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
  
  const salaryInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusSalary, setShouldFocusSalary] = useState(false);
  
  useEffect(() => {
    if (!initialLoading && shouldFocusSalary && salaryInputRef.current) {
      salaryInputRef.current.focus();
      setShouldFocusSalary(false);
    }
  }, [initialLoading, shouldFocusSalary]);

  useEffect(() => {
    fetchDesignations();
    
    if (id) {
      fetchEmployee();
    } else {
      let restoredDraft = false;
      const draft = sessionStorage.getItem('addEmployeeDraft');
      const newDesignation = sessionStorage.getItem('newlyAddedDesignation');
      
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (newDesignation) {
            parsed.designation = newDesignation;
            sessionStorage.removeItem('newlyAddedDesignation');
            setShouldFocusSalary(true);
          }
          setFormData(parsed);
          sessionStorage.removeItem('addEmployeeDraft');
          restoredDraft = true;
          if (!parsed.employeeCode) {
            fetchNextEmployeeCode();
          }
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }
      
      if (!restoredDraft) {
        fetchNextEmployeeCode();
      }
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
      
      toast.success('Employee saved successfully!');
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
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-inner flex-shrink-0">
                <User size={48} className="text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold mb-2">{formData.fullName || 'Unknown Employee'}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-50 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={18} />
                    <span>{formData.designation || 'N/A'}</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={18} />
                    <span>{formData.department || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                  <Phone size={20} className="text-emerald-500" />
                  Contact Information
                </h3>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Phone size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Mobile Number</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.mobileNumber || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Mail size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Official Email</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.officialEmail || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Mail size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Personal Email</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.personalEmail || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Information */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                  <Briefcase size={20} className="text-emerald-500" />
                  Work Details
                </h3>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <User size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Employee Code</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.employeeCode || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Calendar size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date of Joining</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.dateOfJoining || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Calendar size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.dateOfBirth || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Wallet size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Salary Payout</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {formData.salaryPayout ? `₹ ${Number(formData.salaryPayout).toLocaleString()}` : '-'}
                      </p>
                      {formData.salaryPayout && (
                        <p className="text-xs font-medium text-emerald-600 mt-0.5">
                          ₹ {(Number(formData.salaryPayout) * 12).toLocaleString()} / year
                        </p>
                      )}
                    </div>
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
                    sessionStorage.setItem('addEmployeeDraft', JSON.stringify(formData));
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
                ref={salaryInputRef}
                type="number" 
                name="salaryPayout"
                placeholder="Enter Salary Amount"
                value={formData.salaryPayout}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
              {formData.salaryPayout && (
                <p className="text-xs font-medium text-emerald-600 mt-1.5 ml-1">
                  ₹ {(Number(formData.salaryPayout) * 12).toLocaleString()} / year
                </p>
              )}
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
