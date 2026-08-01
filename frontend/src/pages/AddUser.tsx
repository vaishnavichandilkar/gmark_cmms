import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, User, Mail, Phone, Building2, Shield, Briefcase, CheckCircle2, Eye, EyeOff, Key } from 'lucide-react';
import { api } from '../lib/api';
import { FacilityHierarchyPicker } from '../components/FacilityHierarchyPicker';
import { CustomSelect } from '../components/CustomSelect';
import toast from 'react-hot-toast';

export function AddUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewMode = window.location.pathname.includes('/view/');

  const [formData, setFormData] = useState({
    mainFacilityId: '',
    mainFacilityHead: '',
    category: '',
    employeeId: '',
    employeeContactNumber: '',
    username: '',
    companyMailId: '',
    department: '',
    designation: '',
    password: '',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

  const [facilities, setFacilities] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [existingUserId, setExistingUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      
      // Fetch dependencies in parallel
      const [facilitiesRes, employeesRes, usersRes] = await Promise.all([
        api.get('/main-facilities'),
        api.get('/employees'),
        api.get('/users')
      ]);
      
      setFacilities(facilitiesRes.data);
      setEmployees(employeesRes.data);
      setUsers(usersRes.data);

      if (id) {
        const response = await api.get(`/users/${id}`);
        const user = response.data;
        
        setFormData({
          mainFacilityId: user.mainFacilityId ? user.mainFacilityId.toString() : '',
          mainFacilityHead: user.mainFacility?.mainFacilityHead || '',
          category: user.mainFacility?.category || '',
          employeeId: user.employeeId ? user.employeeId.toString() : '',
          employeeContactNumber: user.employee?.mobileNumber || '',
          username: user.username || '',
          companyMailId: user.employee?.officialEmail || user.email || '',
          department: user.employee?.department || '',
          designation: user.employee?.designation || '',
          password: '',
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
    if (!formData.mainFacilityId || !formData.employeeId || !formData.companyMailId) {
      setGlobalError('Please fill in all required fields (Facility, Employee, and Email) before continuing.');
      return;
    }
    setGlobalError('');
    if (!id && !formData.password) {
      setFormData(prev => ({ ...prev, password: generatePassword() }));
    }
    setCurrentStep(2);
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
          newData.employeeContactNumber = employee.mobileNumber || '';
          newData.companyMailId = employee.officialEmail || '';
          newData.department = employee.department || '';
          newData.designation = employee.designation || '';
          
          // Check if employee already has a user account
          // Since setUsers might be empty initially if they navigate from another page quickly,
          // we should ideally wait for it, but fetchInitialData ensures it's populated.
          const existingUser = users.find(u => u.employeeId?.toString() === value);
          if (existingUser) {
            setExistingUserId(existingUser.id);
            newData.username = existingUser.username || '';
          } else {
            setExistingUserId(null);
            if (employee.fullName) {
              newData.username = employee.fullName.toLowerCase().trim().replace(/\s+/g, '.');
            }
          }
        } else {
          newData.employeeContactNumber = '';
          newData.companyMailId = '';
          newData.department = '';
          newData.designation = '';
          newData.username = '';
          setExistingUserId(null);
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
        setGlobalError('Please fill in all required fields (Username, Email).');
        setLoading(false);
        return;
      }

      if (formData.password) {
        const p = formData.password;
        if (p.length < 8 || !/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) {
          setGlobalError('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.');
          setLoading(false);
          return;
        }
      }
      
      const employee = employees.find(emp => emp.id.toString() === formData.employeeId);
      
      // Determine UserRole mapping from Employee designation, fallback to VIEWER
      const mapRole = (designation: string) => {
        const roleStr = (designation || '').toUpperCase();
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
        role: mapRole(formData.designation),
        isActive: formData.isActive,
        employeeId: parseInt(formData.employeeId, 10),
        mainFacilityId: parseInt(formData.mainFacilityId, 10)
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (id) {
        await api.put(`/users/${id}`, payload);
      } else if (existingUserId) {
        await api.put(`/users/${existingUserId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      
      toast.success('User saved successfully!');
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
      <div className="sm:p-6 w-full h-full flex items-center justify-center">
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
    label: `${emp.fullName} (${emp.department || 'N/A'} - ${emp.designation || emp.role || 'N/A'})`,
    value: emp.id.toString()
  }));

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
          {id ? (isViewMode ? 'View User' : 'Edit User') : 'New User'}
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
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-inner flex-shrink-0">
                <User size={48} className="text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold mb-2">{formData.username || 'Unknown User'}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-50 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Shield size={18} />
                    <span>{formData.designation || 'No Designation'}</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    {formData.isActive ? <CheckCircle2 size={18} className="text-green-300" /> : <CheckCircle2 size={18} className="text-gray-300" />}
                    <span>{formData.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                  <User size={20} className="text-emerald-500" />
                  Employee Details
                </h3>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Phone size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Number</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.employeeContactNumber || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Mail size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email Address</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.companyMailId || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Briefcase size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Department</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.department || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Briefcase size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Designation</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.designation || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Information */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                  <Building2 size={20} className="text-emerald-500" />
                  Facility Information
                </h3>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-lg">
                      <Building2 size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Main Facility</p>
                      <p className="text-base text-gray-900 font-semibold">
                         {facilityOptions.find(f => f.value === formData.mainFacilityId)?.label || '-'}
                      </p>
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
                      <Briefcase size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Category</p>
                      <p className="text-base text-gray-900 font-semibold">{formData.category || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
          
          {/* Row 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility <span className="text-red-500">*</span>
            </label>
            <FacilityHierarchyPicker 
              name="mainFacilityId"
              value={formData.mainFacilityId}
              onChange={handleChange}
              disabled={isViewMode}
              placeholder="Select Facility"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Head <span className="text-red-500">*</span>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="designation"
              value={formData.designation}
              placeholder="Designation"
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none transition-all"
            />
          </div>

          {/* Row 3 */}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Official Email <span className="text-red-500">*</span>
            </label>
            <input 
              type="email" 
              name="companyMailId"
              value={formData.companyMailId}
              placeholder="Enter Official Email"
              onChange={handleChange}
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none transition-all"
            />
          </div>
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
          )}

          {currentStep === 2 && (
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
                </div>
              </div>
            </div>
          )}
          </>
        )}

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-10 border-t border-gray-100 pt-6">
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
              {existingUserId ? (
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
              ) : (
                <button 
                  type="button" 
                  onClick={handleNext}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm min-w-[100px]"
                >
                  Next
                </button>
              )}
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
