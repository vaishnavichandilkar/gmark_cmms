import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, User, Mail, Phone, Calendar, Briefcase, Building2, Wallet } from 'lucide-react';
import { api } from '../../../lib/api';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { CustomDatePicker } from '../../../components/shared/CustomDatePicker';
import toast from 'react-hot-toast';

function parseDateParts(dateVal: string | Date): { year: number; month: number; day: number } | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      };
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

function isAtLeast18YearsApart(dobVal: string | Date, dojVal: string | Date): boolean {
  const dob = parseDateParts(dobVal);
  const doj = parseDateParts(dojVal);
  if (!dob || !doj) return true;

  let age = doj.year - dob.year;
  const monthDiff = doj.month - dob.month;
  if (monthDiff < 0 || (monthDiff === 0 && doj.day < dob.day)) {
    age--;
  }
  return age >= 18;
}

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
    salaryPayout: '',
    reportingTo: '',
    username: '',
    password: '',
    createCredentials: true
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportingOptions, setReportingOptions] = useState<string[]>([]);
  
  const salaryInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusSalary, setShouldFocusSalary] = useState(false);

  const isAgeInvalid = Boolean(
    formData.dateOfBirth &&
    formData.dateOfJoining &&
    !isAtLeast18YearsApart(formData.dateOfBirth, formData.dateOfJoining)
  );

  const minDojDate = React.useMemo(() => {
    if (!formData.dateOfBirth) return undefined;
    const parsed = parseDateParts(formData.dateOfBirth);
    if (!parsed) return undefined;
    return new Date(parsed.year + 18, parsed.month - 1, parsed.day);
  }, [formData.dateOfBirth]);

  const maxDobDate = React.useMemo(() => {
    if (!formData.dateOfJoining) return undefined;
    const parsed = parseDateParts(formData.dateOfJoining);
    if (!parsed) return undefined;
    return new Date(parsed.year - 18, parsed.month - 1, parsed.day);
  }, [formData.dateOfJoining]);
  
  useEffect(() => {
    if (!initialLoading && shouldFocusSalary && salaryInputRef.current) {
      salaryInputRef.current.focus();
      setShouldFocusSalary(false);
    }
  }, [initialLoading, shouldFocusSalary]);

  useEffect(() => {
    fetchReportingEmployees();
    
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
          setFormData({
            ...parsed,
            reportingTo: parsed.reportingTo || ''
          });
          sessionStorage.removeItem('addEmployeeDraft');
          restoredDraft = true;
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }
      
      if (!restoredDraft) {
        setFormData(prev => ({ ...prev, employeeCode: '' }));
      }
    }
  }, [id]);

  const fetchReportingEmployees = async () => {
    try {
      const response = await api.get('/employees');
      const allEmployees = response.data || [];
      const availableEmployees = allEmployees.filter((emp: any) => !id || emp.id.toString() !== id.toString());
      
      const empList = availableEmployees.map((emp: any) => 
        emp.employeeCode ? `${emp.fullName} (${emp.employeeCode})` : emp.fullName
      );

      // Only show 'Admin' if no employees exist in the system
      const options = empList.length > 0 ? empList : ['Admin'];
      setReportingOptions(Array.from(new Set(options)));
    } catch (err) {
      console.error('Failed to fetch reporting employees:', err);
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
        reportingTo: data.reportingTo || '',
        username: '',
        password: '',
        createCredentials: false
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
    } else if (name === 'salaryPayout') {
      if (value.startsWith('-') || Number(value) < 0) return;
      setFormData(prev => ({
        ...prev,
        [name]: value
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
    if (
      !formData.employeeCode ||
      !formData.fullName ||
      !formData.mobileNumber ||
      !formData.officialEmail ||
      !formData.dateOfJoining ||
      !formData.dateOfBirth ||
      !formData.department ||
      !formData.designation
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.officialEmail.trim()) {
      setError('Official Email is required.');
      return;
    }

    if (!emailRegex.test(formData.officialEmail.trim())) {
      setError('Please enter a valid Official Email address.');
      return;
    }

    if (formData.personalEmail && formData.personalEmail.trim()) {
      if (!emailRegex.test(formData.personalEmail.trim())) {
        setError('Please enter a valid Personal Email address.');
        return;
      }
      if (formData.personalEmail.trim().toLowerCase() === formData.officialEmail.trim().toLowerCase()) {
        setError('Personal Email must be different from Official Email.');
        return;
      }
    }

    if (formData.mobileNumber.length !== 10) {
      setError('Mobile Number must be exactly 10 digits.');
      return;
    }

    if (formData.salaryPayout && Number(formData.salaryPayout) < 0) {
      setError('Salary Payout cannot be negative.');
      return;
    }

    if (formData.dateOfBirth && formData.dateOfJoining && !isAtLeast18YearsApart(formData.dateOfBirth, formData.dateOfJoining)) {
      setError('Employee must be at least 18 years old on the date of joining (minimum 18 years difference between Date of Birth and Date of Joining).');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { username, password, createCredentials, ...employeeData } = formData;
      const payload: any = {
        ...employeeData,
        salaryPayout: formData.salaryPayout ? Number(formData.salaryPayout) : null,
        officialEmail: formData.officialEmail || null,
        personalEmail: formData.personalEmail || null,
        reportingTo: formData.reportingTo || null,
      };

      if (id) {
        await api.patch(`/employees/${id}`, payload);
      } else {
        await api.post('/employees', payload);
        const returnUrl = location.state?.returnUrl || sessionStorage.getItem('addEmployeeOriginalReturnUrl');
        if (returnUrl) {
          sessionStorage.setItem('newlyAddedEmployeeName', formData.fullName);
        }
      }
      
      toast.success('Employee saved successfully!');
      // Navigate back to the list on success
      const finalReturnUrl = location.state?.returnUrl || sessionStorage.getItem('addEmployeeOriginalReturnUrl');
      sessionStorage.removeItem('addEmployeeOriginalReturnUrl');
      navigate(finalReturnUrl || '/master/employee');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            className="text-gray-600 hover:text-gray-900 mr-2 focus:outline-none cursor-pointer"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {id ? (isViewMode ? 'View Employee' : 'Edit Employee') : 'Add Employee'}
          </h1>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            Back
          </button>
          {!isViewMode && (
            <button 
              type="button" 
              onClick={handleSave}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-70 min-w-[80px] cursor-pointer"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save'
              )}
            </button>
          )}
        </div>
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
                        {formData.salaryPayout && Number(formData.salaryPayout) >= 0 ? `₹ ${Number(formData.salaryPayout).toLocaleString()}` : '-'}
                      </p>
                      {formData.salaryPayout && Number(formData.salaryPayout) >= 0 && (
                        <p className="text-xs font-medium text-emerald-600 mt-0.5">
                          ₹ {(Number(formData.salaryPayout) * 12).toLocaleString()} / year
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <User size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Reporting To</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.reportingTo || '-'}</p>
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all"
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
                required
                className={`w-full px-4 py-2.5 border ${
                  !formData.officialEmail && error ? 'border-red-500 bg-red-50/50' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all`}
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
                className={`w-full px-4 py-2.5 border ${
                  formData.personalEmail && formData.officialEmail && formData.personalEmail.trim().toLowerCase() === formData.officialEmail.trim().toLowerCase()
                    ? 'border-red-500 bg-red-50/50'
                    : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all`}
              />
              {formData.personalEmail && formData.officialEmail && formData.personalEmail.trim().toLowerCase() === formData.officialEmail.trim().toLowerCase() && (
                <p className="text-xs text-red-500 font-semibold mt-1">
                  Personal email must be different from official email
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Joining <span className="text-red-500">*</span>
              </label>
              <CustomDatePicker 
                name="dateOfJoining"
                value={formData.dateOfJoining}
                onChange={handleChange}
                minDate={minDojDate}
                hasError={isAgeInvalid || (!formData.dateOfJoining && Boolean(error))}
              />
              {isAgeInvalid && (
                <p className="text-xs text-red-500 font-semibold mt-1">
                  Date of Joining must be at least 18 years after Date of Birth
                </p>
              )}
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <CustomDatePicker 
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                maxDate={maxDobDate}
                hasError={isAgeInvalid || (!formData.dateOfBirth && Boolean(error))}
              />
              {isAgeInvalid && (
                <p className="text-xs text-red-500 font-semibold mt-1">
                  Employee must be at least 18 years old on Date of Joining
                </p>
              )}
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
              <input 
                type="text" 
                name="designation"
                placeholder="Enter Designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all"
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
                min="0"
                placeholder="Enter Salary Amount"
                value={formData.salaryPayout}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none transition-all"
              />
              {formData.salaryPayout && Number(formData.salaryPayout) >= 0 && (
                <p className="text-xs font-medium text-emerald-600 mt-1.5 ml-1">
                  ₹ {(Number(formData.salaryPayout) * 12).toLocaleString()} / year
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reporting To
              </label>
              <CustomSelect 
                name="reportingTo"
                value={formData.reportingTo}
                options={reportingOptions}
                onChange={handleChange}
                placeholder="Select Reporting To"
                allowCustom={true}
              />
            </div>
          </div>
        )}



      </div>
    </div>
  );
}
