import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, User, Mail, Phone, Shield, Briefcase, CheckCircle2, KeyRound, Copy, Eye, EyeOff, Check, Trash2, Plus, Pencil, Calendar, Hash, AtSign } from 'lucide-react';
import { api } from '../../../lib/api';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { MultiSelect } from '../../../components/shared/MultiSelect';
import toast from 'react-hot-toast';

export function AddUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewMode = window.location.pathname.includes('/view/');

  const [formData, setFormData] = useState({
    mainFacilityId: '',
    facilityId: '',
    facilityName: '',
    deviceId: '',
    deviceName: '',
    buildingId: '',
    societyId: '',
    mainFacilityHead: '',
    category: '',
    employeeId: '',
    employeeIds: [] as string[],
    employeeContactNumber: '',
    username: '',
    companyMailId: '',
    department: '',
    designation: '',
    reportingTo: '',
    password: '',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);

  const [facilities, setFacilities] = useState<any[]>([]);
  const [subFacilities, setSubFacilities] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [existingUserId, setExistingUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [employeeConfigs, setEmployeeConfigs] = useState<Record<string, {
    role: string;
    reportingTo: string;
    status: boolean;
  }>>({});

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      
      // Fetch dependencies in parallel
      const [facilitiesRes, subFacilitiesRes, employeesRes, usersRes, designationsRes] = await Promise.allSettled([
        api.get('/main-facilities'),
        api.get('/facilities'),
        api.get('/employees'),
        api.get('/users'),
        api.get('/designations')
      ]);
      
      setFacilities(facilitiesRes.status === 'fulfilled' ? facilitiesRes.value.data : []);
      setSubFacilities(subFacilitiesRes.status === 'fulfilled' ? subFacilitiesRes.value.data : []);
      setEmployees(employeesRes.status === 'fulfilled' ? employeesRes.value.data : []);
      setUsers(usersRes.status === 'fulfilled' ? usersRes.value.data : []);

      const activeRoles = designationsRes.status === 'fulfilled'
        ? designationsRes.value.data.filter((d: any) => d.isActive).map((d: any) => d.name)
        : [];
      setRoleOptions(activeRoles);

      if (id) {
        const response = await api.get(`/users/${id}`);
        const user = response.data;
        setEditingUser(user);

        const targetEmpIdStr = user.employeeId ? user.employeeId.toString() : `user-${user.id}`;
        
        setFormData({
          mainFacilityId: user.mainFacilityId ? user.mainFacilityId.toString() : '',
          facilityId: user.facilityId ? user.facilityId.toString() : '',
          deviceId: user.deviceId || '',
          deviceName: user.deviceName || '',
          societyId: user.societyId ? user.societyId.toString() : '',
          buildingId: user.buildings && user.buildings.length > 0 ? user.buildings[0].buildingId.toString() : '',
          facilityName: user.facility?.facilityName || user.mainFacility?.mainFacilityName || user.society?.name || (user.buildings && user.buildings.length > 0 ? user.buildings[0].building?.name : ''),
          mainFacilityHead: user.facility?.facilityHeadName || user.mainFacility?.mainFacilityHead || '-',
          category: user.facility?.category || user.mainFacility?.category || (user.societyId ? 'Society' : (user.buildings && user.buildings.length > 0 ? 'Building' : '')),
          employeeId: targetEmpIdStr,
          employeeIds: [targetEmpIdStr],
          employeeContactNumber: user.employee?.mobileNumber || user.mobileNumber || '',
          username: user.username || '',
          companyMailId: user.employee?.officialEmail || user.email || '',
          department: user.employee?.department || '',
          designation: user.employee?.designation || user.designation || '',
          reportingTo: user.employee?.reportingTo || user.reportingTo || '',
          password: '',
          isActive: user.isActive !== undefined ? user.isActive : true,
        });

        setEmployeeConfigs({
          [targetEmpIdStr]: {
            role: user.designation || (activeRoles.includes(user.role) ? user.role : (activeRoles[0] || '')),
            reportingTo: user.employee?.reportingTo || user.reportingTo || '',
            status: user.isActive !== undefined ? user.isActive : true,
          }
        });
      }

      // Restore draft if returning from AddRole or AddEmployee
      const draft = sessionStorage.getItem('addUserDraft');
      const newlyAddedDesignation = sessionStorage.getItem('newlyAddedDesignation');
      const targetEmpId = sessionStorage.getItem('addUserRoleTargetEmpId');
      const newlyAddedEmployeeName = sessionStorage.getItem('newlyAddedEmployeeName');

      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          const allEmployees = employeesRes.status === 'fulfilled' ? employeesRes.value.data : [];
          let currentForm = parsed.formData || {};
          let currentConfigs = parsed.employeeConfigs || {};

          if (newlyAddedEmployeeName) {
            const matchedEmp = allEmployees.find((e: any) => 
              e.fullName?.toLowerCase().trim() === newlyAddedEmployeeName.toLowerCase().trim()
            );
            if (matchedEmp) {
              const matchedIdStr = matchedEmp.id.toString();
              const existingIds = currentForm.employeeIds || (currentForm.employeeId ? [currentForm.employeeId] : []);
              if (!existingIds.includes(matchedIdStr)) {
                currentForm.employeeIds = [...existingIds, matchedIdStr];
                currentForm.employeeId = currentForm.employeeId || matchedIdStr;
              }
              currentConfigs[matchedIdStr] = {
                role: activeRoles[0] || 'VIEWER',
                reportingTo: matchedEmp.reportingTo || '',
                status: true,
              };
              toast.success(`Employee "${matchedEmp.fullName}" added and selected!`);
            }
          }

          if (newlyAddedDesignation && targetEmpId && currentConfigs[targetEmpId]) {
            currentConfigs[targetEmpId].role = newlyAddedDesignation;
            toast.success(`Role "${newlyAddedDesignation}" added successfully!`);
          }

          setFormData(currentForm);
          setEmployeeConfigs(currentConfigs);
        } catch (e) {
          console.error('Failed to restore draft:', e);
        } finally {
          sessionStorage.removeItem('addUserDraft');
          sessionStorage.removeItem('newlyAddedDesignation');
          sessionStorage.removeItem('addUserRoleTargetEmpId');
          sessionStorage.removeItem('newlyAddedEmployeeName');
        }
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

      // Auto-fill Facility / Device details
      if (name === 'mainFacilityId') {
        const dataset = (e.target as any).dataset;
        const selectedType = dataset?.type;

        if (selectedType === 'device') {
          const deviceId = dataset?.deviceId || value;
          const deviceName = dataset?.name || '';
          const facId = dataset?.facilityId;
          const mainFacId = dataset?.mainFacilityId;
          const bldgId = dataset?.buildingId;

          newData.deviceId = deviceId;
          newData.deviceName = deviceName;

          if (facId) {
            const subFac = subFacilities.find((f: any) => f.id.toString() === facId);
            newData.facilityId = facId;
            newData.mainFacilityId = mainFacId || (subFac?.mainFacilityId ? subFac.mainFacilityId.toString() : '');
            newData.facilityName = deviceName || subFac?.facilityName || '';
            newData.mainFacilityHead = subFac?.facilityHeadName || '';
            newData.category = subFac?.category || '';
            newData.buildingId = '';
          } else if (mainFacId) {
            const mainFac = facilities.find((f: any) => f.id.toString() === mainFacId);
            newData.facilityId = '';
            newData.mainFacilityId = mainFacId;
            newData.facilityName = deviceName || mainFac?.mainFacilityName || '';
            newData.mainFacilityHead = mainFac?.mainFacilityHead || '';
            newData.category = mainFac?.category || '';
            newData.buildingId = '';
          } else if (bldgId) {
            newData.buildingId = bldgId;
            newData.facilityId = '';
            newData.mainFacilityId = '';
            newData.facilityName = deviceName;
            newData.mainFacilityHead = '';
            newData.category = '';
          }
          newData.isActive = true;
        } else if (selectedType === 'facility') {
          const cleanFacId = dataset?.id || value.replace('fac-', '');
          const subFac = subFacilities.find((f: any) => f.id.toString() === cleanFacId);
          newData.deviceId = '';
          newData.deviceName = '';
          newData.buildingId = '';
          newData.facilityId = cleanFacId;
          newData.mainFacilityId = dataset?.mainFacilityId || (subFac?.mainFacilityId ? subFac.mainFacilityId.toString() : '');
          newData.facilityName = subFac?.facilityName || dataset?.name || '';
          newData.mainFacilityHead = subFac?.facilityHeadName || '';
          newData.category = subFac?.category || '';
          newData.isActive = true;
        } else if (selectedType === 'mainFacility') {
          const cleanMainId = dataset?.id || value.replace('mf-', '');
          const mainFac = facilities.find((f: any) => f.id.toString() === cleanMainId);
          newData.deviceId = '';
          newData.deviceName = '';
          newData.buildingId = '';
          newData.societyId = '';
          newData.facilityId = '';
          newData.mainFacilityId = cleanMainId;
          newData.facilityName = mainFac?.mainFacilityName || dataset?.name || '';
          newData.mainFacilityHead = mainFac?.mainFacilityHead || '';
          newData.category = mainFac?.category || '';
          newData.isActive = true;
        } else if (selectedType === 'society') {
          const socName = dataset?.name || '';
          newData.deviceId = '';
          newData.deviceName = '';
          newData.buildingId = '';
          newData.facilityId = '';
          newData.mainFacilityId = '';
          newData.societyId = value;
          newData.facilityName = socName;
          newData.mainFacilityHead = '-';
          newData.category = 'Society';
          newData.isActive = true;
        } else if (selectedType === 'building') {
          const bldgName = dataset?.name || '';
          const socId = dataset?.societyId || '';
          newData.deviceId = '';
          newData.deviceName = '';
          newData.buildingId = value;
          newData.societyId = socId;
          newData.facilityId = '';
          newData.mainFacilityId = '';
          newData.facilityName = bldgName;
          newData.mainFacilityHead = '-';
          newData.category = 'Building';
          newData.isActive = true;
        } else {
          // Empty / reset
          newData.deviceId = '';
          newData.deviceName = '';
          newData.buildingId = '';
          newData.societyId = '';
          newData.facilityId = '';
          newData.mainFacilityId = '';
          newData.facilityName = '';
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
          newData.reportingTo = employee.reportingTo || '';
          
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
              newData.username = employee.fullName.toLowerCase().trim().replace(/\s+/g, '');
            }
          }
        } else {
          newData.employeeContactNumber = '';
          newData.companyMailId = '';
          newData.department = '';
          newData.designation = '';
          newData.reportingTo = '';
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

  const handleEmployeesChange = (selectedValues: string[]) => {
    const selectedEmps = employees.filter(emp => selectedValues.includes(emp.id.toString()));
    
    const contactNumbers = selectedEmps.map(e => e.mobileNumber).filter(Boolean).join(', ');
    const emails = selectedEmps.map(e => e.officialEmail).filter(Boolean).join(', ');
    const departments = Array.from(new Set(selectedEmps.map(e => e.department).filter(Boolean))).join(', ');
    const designations = Array.from(new Set(selectedEmps.map(e => e.designation).filter(Boolean))).join(', ');
    const reportingTo = Array.from(new Set(selectedEmps.map(e => e.reportingTo).filter(Boolean))).join(', ');

    let suggestedUsername = formData.username;
    if (selectedEmps.length > 0 && selectedEmps[0].fullName) {
      suggestedUsername = selectedEmps[0].fullName.toLowerCase().trim().replace(/\s+/g, '');
    }

    const firstSelectedId = selectedValues[0] || '';
    const existingUser = firstSelectedId ? users.find(u => u.employeeId?.toString() === firstSelectedId) : null;
    if (existingUser) {
      setExistingUserId(existingUser.id);
      suggestedUsername = existingUser.username || suggestedUsername;
    } else {
      setExistingUserId(null);
    }

    // Initialize or preserve per-employee configuration
    setEmployeeConfigs(prev => {
      const next = { ...prev };
      selectedValues.forEach(empIdStr => {
        if (!next[empIdStr]) {
          const emp = employees.find(e => e.id.toString() === empIdStr);
          next[empIdStr] = {
            role: roleOptions[0] || '',
            reportingTo: emp?.reportingTo || '',
            status: true,
          };
        }
      });
      return next;
    });

    setFormData(prev => ({
      ...prev,
      employeeIds: selectedValues,
      employeeId: firstSelectedId,
      employeeContactNumber: contactNumbers,
      companyMailId: emails,
      department: departments,
      designation: designations,
      reportingTo: reportingTo,
      username: suggestedUsername || prev.username,
    }));

    if (globalError) {
      setGlobalError('');
    }
  };

  const handleAddNewRoleRedirect = (empIdStr?: string) => {
    const draft = {
      formData,
      employeeConfigs,
    };
    sessionStorage.setItem('addUserDraft', JSON.stringify(draft));
    if (empIdStr) {
      sessionStorage.setItem('addUserRoleTargetEmpId', empIdStr);
    }

    toast('Redirecting to Access Management to add a new role...', { icon: '✨' });
    navigate('/manage-access/new', { state: { returnUrl: window.location.pathname } });
  };

  const handleAddNewEmployeeRedirect = () => {
    const draft = {
      formData,
      employeeConfigs,
    };
    sessionStorage.setItem('addUserDraft', JSON.stringify(draft));
    sessionStorage.setItem('addEmployeeOriginalReturnUrl', window.location.pathname);

    toast('Redirecting to Employee Master to add a new employee...', { icon: '✨' });
    navigate('/master/employee/new', { state: { returnUrl: window.location.pathname } });
  };

  const handleRoleChangeForEmp = (empIdStr: string, selectedValue: string) => {
    if (selectedValue === '+ Add Role') {
      handleAddNewRoleRedirect(empIdStr);
      return;
    }
    setEmployeeConfigs(prev => ({
      ...prev,
      [empIdStr]: {
        ...(prev[empIdStr] || { reportingTo: 'Admin', status: true }),
        role: selectedValue
      }
    }));
  };

  const handleReportingToChangeForEmp = (empIdStr: string, selectedValue: string) => {
    setEmployeeConfigs(prev => ({
      ...prev,
      [empIdStr]: {
        ...(prev[empIdStr] || { role: '', status: true }),
        reportingTo: selectedValue
      }
    }));
  };

  const handleStatusChangeForEmp = (empIdStr: string, isStatusActive: boolean) => {
    setEmployeeConfigs(prev => ({
      ...prev,
      [empIdStr]: {
        ...(prev[empIdStr] || { role: '', reportingTo: 'Admin' }),
        status: isStatusActive
      }
    }));
  };

  const generatePassword = () => {
    const employee = employees.find(e => e.id.toString() === formData.employeeId);
    const firstName = employee?.fullName ? employee.fullName.trim().split(' ')[0] : 'User';
    const capName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    const symbols = ['@', '#', '$', '!', '%', '&', '*'];
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const currentYear = new Date().getFullYear();
    
    const numberOptions = [
      currentYear,
      Math.floor(100 + Math.random() * 900),
      Math.floor(1000 + Math.random() * 9000),
      123,
      999,
    ];
    const randomNumber = numberOptions[Math.floor(Math.random() * numberOptions.length)];

    const newPass = `${capName}${randomSymbol}${randomNumber}`;

    setFormData(prev => ({ ...prev, password: newPass }));
    toast.success('Random password generated!');
  };

  const handleCopyPassword = () => {
    if (formData.password) {
      navigator.clipboard.writeText(formData.password);
      setCopiedPassword(true);
      toast.success('Password copied to clipboard!');
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setGlobalError('');
      
      const selectedEmpIds = formData.employeeIds && formData.employeeIds.length > 0 
        ? formData.employeeIds 
        : (formData.employeeId ? [formData.employeeId] : []);

      if (selectedEmpIds.length === 0) {
        setGlobalError('Please select at least one Employee Name.');
        toast.error('Please select at least one Employee Name.');
        setLoading(false);
        return;
      }

      const mapRole = (designation: string) => {
        const roleStr = (designation || '').toUpperCase();
        if (roleStr.includes('SUPER')) return 'SUPER_ADMIN';
        if (roleStr.includes('BUILDING')) return 'BUILDING_ADMIN';
        if (roleStr.includes('SOCIETY')) return 'SOCIETY_ADMIN';
        if (roleStr.includes('ADMIN')) return 'SOCIETY_ADMIN';
        if (roleStr.includes('OPERATOR') || roleStr.includes('SUPERVISOR') || roleStr.includes('TECHNICIAN') || roleStr.includes('ENGINEER') || roleStr.includes('MAINTENANCE') || roleStr.includes('WORKER')) return 'OPERATOR';
        if (roleStr.includes('MANAGER')) return 'BUILDING_ADMIN';
        return 'VIEWER';
      };

      let createdCount = 0;
      for (const empIdStr of selectedEmpIds) {
        const emp = effectiveEmployees.find(e => e.id.toString() === empIdStr);
        if (!emp) continue;

        const config = employeeConfigs[empIdStr] || {
          role: roleOptions[0] || 'VIEWER',
          reportingTo: emp.reportingTo || 'Admin',
          status: true
        };

        const empEmail = emp.officialEmail || (formData.companyMailId ? formData.companyMailId : `${emp.employeeCode || emp.id}@example.com`);
        
        // Directly assign username: lowercase alphanumeric
        const cleanName = emp.fullName ? emp.fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, '') : '';
        let empUsername = cleanName || (emp.employeeCode ? emp.employeeCode.toLowerCase().trim() : empEmail.split('@')[0]);

        if (selectedEmpIds.length === 1 && formData.username && formData.username.trim()) {
          empUsername = formData.username.trim();
        } else {
          const conflict = users.find(u => u.username?.toLowerCase() === empUsername.toLowerCase() && u.employeeId?.toString() !== empIdStr && (!id || u.id.toString() !== id.toString()));
          if (conflict && emp.employeeCode) {
            empUsername = `${empUsername}${emp.employeeCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          }
        }

        // Directly assign password: standard 'Welcome@123'
        const empPassword = formData.password || 'Welcome@123';
        const existingUser = users.find(u => u.employeeId?.toString() === empIdStr);

        const empPayload: any = {
          username: empUsername,
          email: empEmail,
          password: empPassword,
          firstName: emp.fullName ? emp.fullName.split(' ')[0] : undefined,
          lastName: emp.fullName ? emp.fullName.split(' ').slice(1).join(' ') : undefined,
          mobileNumber: emp.mobileNumber || '',
          role: mapRole(config.role),
          designation: config.role,
          isActive: config.status,
          employeeId: parseInt(empIdStr, 10),
          mainFacilityId: formData.mainFacilityId ? parseInt(formData.mainFacilityId, 10) : undefined,
          facilityId: formData.facilityId ? parseInt(formData.facilityId, 10) : null,
          deviceId: formData.deviceId || null,
          deviceName: formData.deviceName || null,
          buildingIds: formData.buildingId ? [parseInt(formData.buildingId, 10)] : undefined,
          societyId: formData.societyId ? parseInt(formData.societyId, 10) : undefined,
        };

        if (id) {
          if (!formData.password) {
            delete empPayload.password;
          }
          await api.put(`/users/${id}`, empPayload);
        } else if (existingUser) {
          await api.put(`/users/${existingUser.id}`, empPayload);
        } else {
          await api.post('/users', empPayload);
        }

        if (config.reportingTo) {
          await api.patch(`/employees/${empIdStr}`, { 
            reportingTo: config.reportingTo 
          }).catch(() => {});
        }
        createdCount++;
      }

      toast.success(`${createdCount} User(s) saved successfully! Default password: Welcome@123`);
      navigate('/user-management');
    } catch (err: any) {
      console.error('Error saving user:', err);
      let errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to save user. Please try again.';
      if (errMsg === 'Forbidden resource') {
        errMsg = 'Access Denied: You do not have sufficient permissions to manage user accounts. Please contact an administrator.';
      }
      setGlobalError(errMsg);
      toast.error(errMsg);
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

  const selectedEmpId = formData.employeeId;
  const selectedEmpIds = formData.employeeIds && formData.employeeIds.length > 0 
    ? formData.employeeIds 
    : (formData.employeeId ? [formData.employeeId] : []);

  const effectiveEmployees = [...employees];
  if (id && editingUser) {
    const targetEmpIdStr = editingUser.employeeId ? editingUser.employeeId.toString() : `user-${editingUser.id}`;
    const exists = effectiveEmployees.some(e => e.id.toString() === targetEmpIdStr);
    if (!exists) {
      effectiveEmployees.push({
        id: targetEmpIdStr,
        fullName: editingUser.employee?.fullName || editingUser.fullName || (editingUser.firstName || editingUser.lastName ? `${editingUser.firstName || ''} ${editingUser.lastName || ''}`.trim() : editingUser.username),
        mobileNumber: editingUser.employee?.mobileNumber || editingUser.mobileNumber || '',
        officialEmail: editingUser.employee?.officialEmail || editingUser.email || '',
        department: editingUser.employee?.department || 'N/A',
        designation: editingUser.employee?.designation || editingUser.designation || editingUser.role || 'N/A',
        reportingTo: editingUser.employee?.reportingTo || editingUser.reportingTo || 'Admin',
      });
    }
  }

  // Filter out employees who already have a user account (unless currently selected in edit mode)
  const existingUserEmpIds = new Set(
    users
      .filter((u: any) => u.employeeId && (!id || u.id.toString() !== id.toString()))
      .map((u: any) => u.employeeId.toString())
  );

  const availableEmployees = effectiveEmployees.filter(
    (emp: any) => !existingUserEmpIds.has(emp.id.toString()) || selectedEmpIds.includes(emp.id.toString())
  );

  const employeeOptions = availableEmployees.map(emp => ({
    label: `${emp.fullName} (${emp.department || 'N/A'} - ${emp.designation || 'N/A'})`,
    value: emp.id.toString()
  }));

  const getReportingOptionsForEmp = (currentEmpId?: string) => {
    const list = effectiveEmployees
      .filter(emp => !currentEmpId || emp.id.toString() !== currentEmpId.toString())
      .map(emp => emp.employeeCode ? `${emp.fullName} (${emp.employeeCode})` : emp.fullName);

    return list.length > 0 ? Array.from(new Set(list)) : ['Admin'];
  };

  const selectedEmployeesList = effectiveEmployees.filter(emp => selectedEmpIds.includes(emp.id.toString()));

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  return (
    <div className="sm:p-6 pb-10 w-full h-full flex flex-col overflow-y-auto">
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
            {id ? (isViewMode ? 'View User' : 'Edit User') : 'Add User'}
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
          {isViewMode ? (
            <button
              type="button"
              onClick={() => navigate(`/user-management/edit/${id}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Pencil size={14} />
              <span>Edit User</span>
            </button>
          ) : (
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
                <h2 className="text-3xl font-bold mb-1">
                  {editingUser?.employee?.fullName || formData.username || 'Unknown User'}
                </h2>
                <p className="text-emerald-100 text-sm font-medium mb-2">
                  @{formData.username}
                  {editingUser?.employee?.employeeCode && ` • ${editingUser.employee.employeeCode}`}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-50 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Shield size={18} />
                    <span>{editingUser?.designation || (roleOptions.includes(editingUser?.role) ? editingUser.role : (editingUser?.designation || 'No Role'))}</span>
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
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <User size={22} className="text-emerald-500" />
                  <h3 className="text-lg font-bold text-gray-800">Employee Details</h3>
                </div>
                <button
                  onClick={() => navigate(`/user-management/edit/${id}`)}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg border border-emerald-200 transition-colors shadow-sm"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Employee Name */}
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-2.5 rounded-lg">
                    <User size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Employee Name</p>
                    <p className="text-base text-gray-900 font-semibold">
                      {editingUser?.employee?.fullName || editingUser?.fullName || (editingUser?.firstName ? `${editingUser.firstName} ${editingUser.lastName || ''}`.trim() : formData.username) || '-'}
                    </p>
                  </div>
                </div>

                {/* Employee Code */}
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-2.5 rounded-lg">
                    <Hash size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Employee Code</p>
                    <p className="text-base text-gray-900 font-semibold font-mono">
                      {editingUser?.employee?.employeeCode || '-'}
                    </p>
                  </div>
                </div>

                {/* Username */}
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-2.5 rounded-lg">
                    <AtSign size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Username</p>
                    <p className="text-base text-gray-900 font-semibold">
                      {formData.username || '-'}
                    </p>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-2.5 rounded-lg">
                    <Phone size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Contact Number</p>
                    <p className="text-base text-gray-900 font-semibold">
                      {formData.employeeContactNumber || editingUser?.employee?.mobileNumber || editingUser?.mobileNumber || '-'}
                    </p>
                  </div>
                </div>

                {/* Email Address */}
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-2.5 rounded-lg">
                    <Mail size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Official Email</p>
                    <p className="text-base text-gray-900 font-semibold">
                      {formData.companyMailId || editingUser?.employee?.officialEmail || editingUser?.email || '-'}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-2.5 rounded-lg">
                    <Shield size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Role</p>
                    <p className="text-base text-gray-900 font-semibold">
                      {editingUser?.role === 'SUPER_ADMIN' ? 'Admin' : (editingUser?.designation || editingUser?.employee?.designation || '-')}
                    </p>
                  </div>
                </div>

                {/* Designation */}
                <div className="flex items-start gap-4">
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <Briefcase size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Designation</p>
                    <p className="text-base text-gray-900 font-semibold">
                      {editingUser?.employee?.designation || formData.designation || '-'}
                    </p>
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-start gap-4">
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <Briefcase size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Department</p>
                    <p className="text-base text-gray-900 font-semibold">
                      {formData.department || editingUser?.employee?.department || '-'}
                    </p>
                  </div>
                </div>

                {/* Reporting To */}
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-2.5 rounded-lg">
                    <User size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Reporting To</p>
                    <p className="text-base text-gray-900 font-semibold">
                      {formData.reportingTo || editingUser?.employee?.reportingTo || '-'}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-2.5 rounded-lg">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                      formData.isActive 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Date of Joining (if available) */}
                {editingUser?.employee?.dateOfJoining && (
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Calendar size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date of Joining</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {formatDate(editingUser.employee.dateOfJoining)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Date of Birth (if available) */}
                {editingUser?.employee?.dateOfBirth && (
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <Calendar size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                      <p className="text-base text-gray-900 font-semibold">
                        {formatDate(editingUser.employee.dateOfBirth)}
                      </p>
                    </div>
                  </div>
                )}


                {/* Login Password */}
                <div className="flex items-start gap-4 col-span-1 sm:col-span-2 lg:col-span-3 pt-4 border-t border-gray-100">
                  <div className="bg-emerald-50 p-2.5 rounded-lg">
                    <KeyRound size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Login Password</p>
                      <p className="text-base font-mono font-bold text-gray-900 mt-0.5">
                        {showPassword 
                          ? (formData.password || editingUser?.plainPassword || editingUser?.password || 'Welcome@123') 
                          : '••••••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span>{showPassword ? 'Hide Password' : 'Show Password'}</span>
                      </button>
                      {(formData.password || editingUser?.plainPassword || editingUser?.password) && (
                        <button
                          type="button"
                          onClick={() => {
                            const pwd = formData.password || editingUser?.plainPassword || editingUser?.password || 'Welcome@123';
                            if (pwd) {
                              navigator.clipboard.writeText(pwd);
                              setCopiedPassword(true);
                              toast.success('Password copied!');
                              setTimeout(() => setCopiedPassword(false), 2000);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        >
                          {copiedPassword ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{copiedPassword ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Controls Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Employee Name <span className="text-red-500">*</span>
                </label>
                <MultiSelect 
                  name="employeeIds"
                  values={formData.employeeIds && formData.employeeIds.length > 0 ? formData.employeeIds : (formData.employeeId ? [formData.employeeId] : [])}
                  onChange={handleEmployeesChange}
                  options={employeeOptions}
                  disabled={isViewMode}
                  placeholder="Select Employee(s)"
                  onAddNew={handleAddNewEmployeeRedirect}
                  addNewLabel="Add Employee"
                />
              </div>
            </div>

            {/* Selected Employees Info Table */}
            <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm min-h-[360px] pb-32">
              <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-semibold text-gray-800">Selected Employee Details</h3>
                  <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedEmployeesList.length} {selectedEmployeesList.length === 1 ? 'Employee' : 'Employees'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewEmployeeRedirect}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-300 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddNewRoleRedirect()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Role
                  </button>
                </div>
              </div>

              {selectedEmployeesList.length > 0 ? (
                <div className="overflow-x-auto pb-28 min-h-[280px]">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-medium text-xs uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3.5 whitespace-nowrap w-10 text-center">S.No</th>
                        <th className="px-3 py-3.5 whitespace-nowrap min-w-[160px]">Employee</th>
                        <th className="px-3 py-3.5 whitespace-nowrap min-w-[200px]">Role</th>
                        <th className="px-3 py-3.5 whitespace-nowrap min-w-[200px]">Reporting To</th>
                        <th className="px-3 py-3.5 whitespace-nowrap min-w-[140px]">Status</th>
                        <th className="px-3 py-3.5 whitespace-nowrap min-w-[130px]">Department</th>
                        <th className="px-3 py-3.5 whitespace-nowrap min-w-[140px]">Designation</th>
                        <th className="px-3 py-3.5 whitespace-nowrap min-w-[150px]">Contact Number</th>
                        <th className="px-3 py-3.5 whitespace-nowrap min-w-[160px]">Official Email</th>
                        <th className="px-3 py-3.5 whitespace-nowrap text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {selectedEmployeesList.map((emp, index) => {
                        const empIdStr = emp.id.toString();
                        const currentConfig = employeeConfigs[empIdStr] || {
                          role: roleOptions[0] || '',
                          reportingTo: emp.reportingTo || '',
                          status: true
                        };

                        return (
                          <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-3 py-4 whitespace-nowrap text-center text-xs font-semibold text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                                  {emp.fullName ? emp.fullName.substring(0, 2).toUpperCase() : 'EM'}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{emp.fullName || 'N/A'}</p>
                                  <div className="flex items-center gap-2">
                                    {emp.employeeCode && (
                                      <p className="text-xs text-gray-400 font-mono">{emp.employeeCode}</p>
                                    )}
                                    <p className="text-xs text-emerald-600 font-medium font-mono">
                                      @{emp.fullName ? emp.fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, '') : 'user'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <CustomSelect 
                                name={`role_${emp.id}`}
                                value={currentConfig.role}
                                options={['+ Add Role', ...roleOptions]}
                                onChange={(e) => handleRoleChangeForEmp(empIdStr, e.target.value)}
                                disabled={isViewMode}
                                placeholder="Select Role"
                              />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <CustomSelect 
                                name={`reportingTo_${emp.id}`}
                                value={currentConfig.reportingTo}
                                options={getReportingOptionsForEmp(empIdStr)}
                                onChange={(e) => handleReportingToChangeForEmp(empIdStr, e.target.value)}
                                disabled={isViewMode}
                                placeholder="Reporting To"
                                allowCustom={true}
                              />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <CustomSelect 
                                name={`status_${emp.id}`}
                                value={currentConfig.status ? 'Active' : 'Inactive'}
                                options={['Active', 'Inactive']}
                                onChange={(e) => handleStatusChangeForEmp(empIdStr, e.target.value === 'Active')}
                                disabled={isViewMode}
                                placeholder="Status"
                                showClear={false}
                              />
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {emp.department || 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap font-medium text-gray-700">
                              {emp.designation || 'N/A'}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-gray-600">
                              {emp.mobileNumber ? (
                                <div className="flex items-center gap-1.5">
                                  <Phone size={14} className="text-gray-400" />
                                  <span>{emp.mobileNumber}</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-gray-600">
                              {emp.officialEmail ? (
                                <div className="flex items-center gap-1.5">
                                  <Mail size={14} className="text-gray-400" />
                                  <span>{emp.officialEmail}</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const newIds = selectedEmpIds.filter(idStr => idStr !== empIdStr);
                                  handleEmployeesChange(newIds);
                                }}
                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                title="Remove Employee"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50/40">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <User size={24} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">No employees selected</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">Select one or more employees from the dropdown above, or create a new employee.</p>
                  <button
                    type="button"
                    onClick={handleAddNewEmployeeRedirect}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95"
                  >
                    <Plus size={14} />
                    Add Employee
                  </button>
                </div>
              )}
            </div>
          </div>
        )}



      </div>
    </div>
  );
}
