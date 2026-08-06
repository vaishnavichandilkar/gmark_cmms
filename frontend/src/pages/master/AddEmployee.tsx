import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, User, Mail, Phone, Calendar, Briefcase, Building2, Wallet, Key, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/api';
import { CustomSelect } from '../../components/CustomSelect';
import { CustomDatePicker } from '../../components/CustomDatePicker';
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
    salaryPayout: '',
    username: '',
    password: '',
    createCredentials: true
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

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

  const generatePassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*";
    const all = uppercase + lowercase + numbers + special;
    let pass = "";
    pass += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    pass += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
    pass += special.charAt(Math.floor(Math.random() * special.length));
    for(let i=0; i<8; i++){
      pass += all.charAt(Math.floor(Math.random() * all.length));
    }
    return pass.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const handleNext = () => {
    if (!formData.employeeCode || !formData.fullName || !formData.mobileNumber || !formData.officialEmail || !formData.dateOfJoining || !formData.dateOfBirth || !formData.department || !formData.designation) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.mobileNumber.length !== 10) {
      setError('Mobile Number must be exactly 10 digits.');
      return;
    }
    setError('');
    
    // Auto-generate username and password if creating new
    if (!id && !formData.username) {
      setFormData(prev => ({
        ...prev,
        username: formData.fullName.toLowerCase().trim().replace(/\s+/g, '.'),
        password: generatePassword(),
        createCredentials: true
      }));
    }
    setCurrentStep(2);
  };


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
        salaryPayout: data.salaryPayout ? data.salaryPayout.toString() : '',
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
      
      const { username, password, createCredentials, ...employeeData } = formData;
      const payload: any = {
        ...employeeData,
        salaryPayout: formData.salaryPayout ? Number(formData.salaryPayout) : null
      };
      if (!payload.personalEmail) {
        payload.personalEmail = null;
      }

      let employeeId: string | number | undefined = id;
      if (id) {
        await api.patch(`/employees/${id}`, payload);
      } else {
        const empRes = await api.post('/employees', payload);
        employeeId = empRes.data.id;
        const returnUrl = location.state?.returnUrl || sessionStorage.getItem('addEmployeeOriginalReturnUrl');
        if (returnUrl) {
          sessionStorage.setItem('newlyAddedEmployeeName', formData.fullName);
        }
      }

      // Handle User Creation if credentials are provided
      if (formData.createCredentials && formData.username) {
        if (formData.password) {
          const p = formData.password;
          if (p.length < 8 || !/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) {
            setError('User created without credentials! Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.');
            setLoading(false);
            return;
          }
        }
        
        const mapRole = (designation: string) => {
          const roleStr = (designation || '').toUpperCase();
          if (roleStr.includes('ADMIN')) return 'SOCIETY_ADMIN';
          if (roleStr.includes('OPERATOR') || roleStr.includes('SUPERVISOR')) return 'OPERATOR';
          if (roleStr.includes('MANAGER')) return 'BUILDING_ADMIN';
          return 'VIEWER';
        };

        const userPayload: Record<string, any> = {
          username: formData.username,
          email: formData.officialEmail,
          firstName: formData.fullName.split(' ')[0],
          lastName: formData.fullName.split(' ').slice(1).join(' '),
          mobileNumber: formData.mobileNumber,
          role: mapRole(formData.designation),
          isActive: true,
          employeeId: employeeId ? parseInt(employeeId as string, 10) : undefined,
        };
        if (formData.password) {
          userPayload.password = formData.password;
        }

        try {
          if (!id) {
            await api.post('/users', userPayload);
          } else {
            // Check if user exists for this employee
            const existingUsers = await api.get('/users');
            const existingUser = existingUsers.data.find((u: any) => u.employeeId?.toString() === id?.toString());
            if (existingUser) {
              await api.put(`/users/${existingUser.id}`, userPayload);
            } else {
              await api.post('/users', userPayload);
            }
          }
        } catch (userErr: any) {
          console.error('Failed to save user credentials:', userErr);
          const errorMsg = userErr.response?.data?.message || userErr.response?.data?.error || 'Failed to save user credentials.';
          toast.error(`Employee saved, but: ${errorMsg}`);
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
        ) : currentStep === 1 ? (
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
              <CustomDatePicker 
                name="dateOfJoining"
                value={formData.dateOfJoining}
                onChange={handleChange}
              />
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
                    if (location.state?.returnUrl) {
                      sessionStorage.setItem('addEmployeeOriginalReturnUrl', location.state.returnUrl);
                    }
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
        ) : null}

        {currentStep === 2 && !isViewMode && (
          <div className="max-w-xl mx-auto mt-4 mb-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 sm:p-10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <Key size={32} className="text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">User Credentials</h2>
                <p className="text-gray-500 mt-2 text-sm">Review the username and set a password for this user account.</p>
              </div>

              <div className="space-y-6">
                <label className="flex items-center gap-3 cursor-pointer p-4 border border-emerald-100 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 bg-white"
                    checked={formData.createCredentials}
                    onChange={(e) => setFormData(prev => ({ ...prev, createCredentials: e.target.checked }))}
                  />
                  <span className="font-semibold text-gray-700">Create a login account for this employee</span>
                </label>

                {formData.createCredentials && (
                  <>
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-gray-50/50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password { !id && <span className="text-red-500">*</span> }
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder={id ? "Leave blank to keep unchanged" : "Password"}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pr-24 transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-2">
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                            title={showPassword ? "Hide Password" : "Show Password"}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, password: generatePassword() }))}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors focus:outline-none border border-emerald-200"
                          >
                            Generate
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-10">
          {isViewMode ? (
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
            >
              Back
            </button>
          ) : currentStep === 1 ? (
            <>
              <button 
                type="button" 
                onClick={() => navigate(-1)}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleNext}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm min-w-[100px]"
              >
                Next
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                onClick={() => setCurrentStep(1)}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Back
              </button>
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
            </>
          )}
        </div>

      </div>
    </div>
  );
}
