import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  ChevronRight,
  Trash2,
  Pencil,
  Plus,
  Search,
  Wrench,
  Wifi,
  Users,
  UserPlus,
  X,
  User as UserIcon,
  Mail,
  Phone,
  Settings,
  Sliders,
  LayoutGrid,
  FileEdit,
  Cpu
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import type { RootState } from '../store';

interface Society {
  id: string;
  name: string;
  city: string;
}

interface Tower {
  id: string;
  name: string;
  info: string;
  societyId: string;
}

interface Device {
  id: string;
  deviceId: string;
  name: string;
  towerId: string;
  application: string;
  pumpType: string;
  controller: string;
  macType: string;
  status?: string;
}

interface User {
  id: string;
  username: string;
  mobileNumber: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  profileTitle?: string;
  profileDetail?: string;
  profileImageUrl?: string;
  floorNo?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  role: string;
  isActive: boolean;
  societyId: string;
  buildingIds?: number[];
}

export function AdminPage() {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  // --- STATE ---
  const [societies, setSocieties] = useState<Society[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(() => {
    if (currentUser?.role === 'SOCIETY_ADMIN') {
      return currentUser.societyId ? currentUser.societyId.toString() : '';
    }
    return localStorage.getItem('admin_selected_society') || '';
  });

  const [towers, setTowers] = useState<Tower[]>([]);
  const [selectedTowerId, setSelectedTowerId] = useState<string>(
    localStorage.getItem('admin_selected_tower') || ''
  );

  const [devices, setDevices] = useState<Device[]>([]);

  const [loadingTowers, setLoadingTowers] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormTab, setUserFormTab] = useState<'credentials' | 'profile'>('credentials');

  useEffect(() => {
    if (isUserFormOpen) {
      setUserFormTab('credentials');
    }
  }, [isUserFormOpen]);
  const [userFormData, setUserFormData] = useState({
    username: '',
    mobileNumber: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    profileTitle: '',
    profileDetail: '',
    profileImageUrl: '',
    floorNo: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    role: 'VIEWER',
    isActive: true,
    buildingIds: [] as number[]
  });

  // Modals state
  const [isAddSocietyOpen, setIsAddSocietyOpen] = useState(false);
  const [isEditSocietyOpen, setIsEditSocietyOpen] = useState(false);
  const [isAddTowerOpen, setIsAddTowerOpen] = useState(false);
  const [isEditTowerOpen, setIsEditTowerOpen] = useState(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);

  // Device bottom action drawer state
  const [selectedActionDevice, setSelectedActionDevice] = useState<Device | null>(null);
  const [isDeviceActionSheetOpen, setIsDeviceActionSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Form states
  const [newSociety, setNewSociety] = useState({ name: '', city: '' });
  const [editSocietyData, setEditSocietyData] = useState<Society | null>(null);
  const [newTower, setNewTower] = useState({ name: '', info: '' });
  const [editTowerData, setEditTowerData] = useState<Tower | null>(null);
  const [newDevice, setNewDevice] = useState({
    name: '',
    deviceId: '',
    application: 'DOMESTIC_WATER_SYS',
    pumpType: 'WMP_BOOSTER_PUMP',
    controller: 'AIPCU',
    macType: 'Primary MAC'
  });
  const [editDeviceData, setEditDeviceData] = useState<Device | null>(null);

  // --- FETCH DATA FROM BACKEND ---
  const fetchSocieties = useCallback(() => {
    api.get('/societies')
      .then(res => {
        const data = res.data;
        if (Array.isArray(data)) {
          const formatted = data.map((s: any) => ({
            id: s.id.toString(),
            name: s.name,
            city: s.city
          }));
          setSocieties(formatted);
          if (selectedSocietyId && !formatted.some(s => s.id === selectedSocietyId)) {
            setSelectedSocietyId('');
            localStorage.removeItem('admin_selected_society');
            setSelectedTowerId('');
            localStorage.removeItem('admin_selected_tower');
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch societies:', err);
      });
  }, [selectedSocietyId]);

  const fetchTowers = useCallback((societyId: string) => {
    if (!societyId) return;
    setLoadingTowers(true);
    api.get(`/buildings?societyId=${societyId}`)
      .then(res => {
        const data = res.data;
        if (Array.isArray(data)) {
          const formatted = data.map((b: any) => ({
            id: b.id.toString(),
            name: b.name.replace(' Building', '').trim(),
            info: b.info || '0F - 0 flats',
            societyId: b.societyId.toString()
          }));
          setTowers(formatted);
          if (selectedTowerId && !formatted.some(t => t.id === selectedTowerId)) {
            setSelectedTowerId('');
            localStorage.removeItem('admin_selected_tower');
          }
        }
        setLoadingTowers(false);
      })
      .catch(err => {
        console.error('Failed to fetch towers:', err);
        setLoadingTowers(false);
      });
  }, [selectedTowerId]);

  const fetchDevices = useCallback((towerId: string) => {
    if (!towerId) return;
    setLoadingDevices(true);
    api.get(`/buildings/${towerId}/devices`)
      .then(res => {
        const data = res.data;
        if (Array.isArray(data)) {
          const formatted = data.map((d: any) => ({
            id: d.id.toString(),
            deviceId: d.deviceId,
            name: d.name,
            towerId: towerId,
            application: d.application || 'DOMESTIC_WATER_SYS',
            pumpType: d.pumpType || 'WMP_BOOSTER_PUMP',
            controller: d.controller || 'AIPCU',
            macType: d.macType || 'Primary MAC',
            status: d.status || 'offline'
          }));
          setDevices(formatted);
        }
        setLoadingDevices(false);
      })
      .catch(err => {
        console.error('Failed to fetch devices:', err);
        setLoadingDevices(false);
      });
  }, []);

  const fetchUsers = useCallback((societyId: string) => {
    if (!societyId) return;
    setLoadingUsers(true);
    api.get(`/users?societyId=${societyId}`)
      .then(res => {
        const data = res.data;
        if (Array.isArray(data)) {
          const formatted = data.map((u: any) => ({
            id: u.id.toString(),
            username: u.username,
            mobileNumber: u.mobileNumber,
            email: u.email,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            profileTitle: u.profileTitle || '',
            profileDetail: u.profileDetail || '',
            profileImageUrl: u.profileImageUrl || '',
            floorNo: u.floorNo || '',
            city: u.city || '',
            state: u.state || '',
            country: u.country || '',
            pincode: u.pincode || '',
            role: u.role || 'VIEWER',
            isActive: u.isActive !== undefined ? u.isActive : true,
            societyId: u.societyId.toString(),
            buildingIds: u.buildings ? u.buildings.map((ub: any) => ub.buildingId) : []
          }));
          setUsers(formatted);
        }
        setLoadingUsers(false);
      })
      .catch(err => {
        console.error('Failed to fetch users:', err);
        setLoadingUsers(false);
      });
  }, []);

  // --- INITIALIZE SOCIETIES ---
  useEffect(() => {
    if (currentUser?.role === 'SOCIETY_ADMIN' && currentUser.societyId) {
      const socIdStr = currentUser.societyId.toString();
      setSelectedSocietyId(socIdStr);
      localStorage.setItem('admin_selected_society', socIdStr);
    }
    fetchSocieties();
  }, [fetchSocieties, currentUser]);

  // --- LOAD TOWERS (BUILDINGS) ---
  useEffect(() => {
    if (selectedSocietyId) {
      fetchTowers(selectedSocietyId);
    } else {
      setTowers([]);
      setSelectedTowerId('');
      localStorage.removeItem('admin_selected_tower');
    }
  }, [selectedSocietyId, fetchTowers]);

  // --- LOAD DEVICES ---
  useEffect(() => {
    if (selectedTowerId) {
      fetchDevices(selectedTowerId);
    } else {
      setDevices([]);
    }
  }, [selectedTowerId, fetchDevices]);

  // --- LOAD USERS ---
  useEffect(() => {
    if (selectedSocietyId) {
      fetchUsers(selectedSocietyId);
    } else {
      setUsers([]);
    }
  }, [selectedSocietyId, fetchUsers]);

  // --- ACTIONS ---

  // Societies CRUD
  const handleAddSociety = () => {
    if (!newSociety.name.trim()) return;
    api.post('/societies', {
      name: newSociety.name,
      city: newSociety.city || 'Pune'
    })
      .then(() => {
        fetchSocieties();
        setNewSociety({ name: '', city: '' });
        setIsAddSocietyOpen(false);
      })
      .catch(err => console.error('Failed to add society:', err));
  };

  const handleEditSociety = () => {
    if (!editSocietyData || !editSocietyData.name.trim()) return;
    api.put(`/societies/${editSocietyData.id}`, {
      name: editSocietyData.name,
      city: editSocietyData.city || 'Pune'
    })
      .then(() => {
        fetchSocieties();
        setEditSocietyData(null);
        setIsEditSocietyOpen(false);
      })
      .catch(err => console.error('Failed to edit society:', err));
  };

  const handleDeleteSociety = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    api.delete(`/societies/${id}`)
      .then(() => {
        fetchSocieties();
        if (selectedSocietyId === id) {
          setSelectedSocietyId('');
          localStorage.removeItem('admin_selected_society');
          setSelectedTowerId('');
          localStorage.removeItem('admin_selected_tower');
        }
      })
      .catch(err => console.error('Failed to delete society:', err));
  };

  // Towers CRUD
  const handleAddTower = () => {
    if (!newTower.name.trim() || !selectedSocietyId) return;
    api.post('/buildings', {
      name: newTower.name,
      info: newTower.info || '0F - 0 flats',
      societyId: parseInt(selectedSocietyId, 10)
    })
      .then(() => {
        fetchTowers(selectedSocietyId);
        setNewTower({ name: '', info: '' });
        setIsAddTowerOpen(false);
      })
      .catch(err => console.error('Failed to add tower:', err));
  };

  const handleEditTower = () => {
    if (!editTowerData || !editTowerData.name.trim() || !selectedSocietyId) return;
    api.put(`/buildings/${editTowerData.id}`, {
      name: editTowerData.name,
      info: editTowerData.info || '0F - 0 flats',
      societyId: parseInt(selectedSocietyId, 10)
    })
      .then(() => {
        fetchTowers(selectedSocietyId);
        setEditTowerData(null);
        setIsEditTowerOpen(false);
      })
      .catch(err => console.error('Failed to edit tower:', err));
  };

  const handleDeleteTower = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    api.delete(`/buildings/${id}`)
      .then(() => {
        if (selectedSocietyId) {
          fetchTowers(selectedSocietyId);
        }
        if (selectedTowerId === id) {
          setSelectedTowerId('');
          localStorage.removeItem('admin_selected_tower');
        }
      })
      .catch(err => console.error('Failed to delete tower:', err));
  };

  // Devices CRUD
  const handleAddDevice = () => {
    if (!newDevice.name.trim() || !newDevice.deviceId.trim() || !selectedTowerId) return;
    api.post('/devices', {
      name: newDevice.name,
      deviceId: newDevice.deviceId,
      buildingId: parseInt(selectedTowerId, 10),
      application: newDevice.application,
      pumpType: newDevice.pumpType,
      controller: newDevice.controller,
      macType: newDevice.macType
    })
      .then(() => {
        fetchDevices(selectedTowerId);
        setNewDevice({
          name: '',
          deviceId: '',
          application: 'DOMESTIC_WATER_SYS',
          pumpType: 'WMP_BOOSTER_PUMP',
          controller: 'AIPCU',
          macType: 'Primary MAC'
        });
        setIsAddDeviceOpen(false);
      })
      .catch(err => console.error('Failed to add device:', err));
  };

  const handleEditDevice = () => {
    if (!editDeviceData || !editDeviceData.name.trim()) return;
    api.put(`/devices/${editDeviceData.id}`, {
      name: editDeviceData.name,
      deviceId: editDeviceData.deviceId,
      application: editDeviceData.application,
      pumpType: editDeviceData.pumpType,
      controller: editDeviceData.controller,
      macType: editDeviceData.macType
    })
      .then(() => {
        fetchDevices(selectedTowerId);
        setEditDeviceData(null);
        setIsEditDeviceOpen(false);
      })
      .catch(err => console.error('Failed to edit device:', err));
  };

  const handleDeleteDevice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    api.delete(`/devices/${id}`)
      .then(() => {
        fetchDevices(selectedTowerId);
      })
      .catch(err => console.error('Failed to delete device:', err));
  };

  // Users CRUD
  const handleAddUser = () => {
    if (
      !userFormData.username.trim() ||
      !userFormData.mobileNumber.trim() ||
      !userFormData.email.trim() ||
      !userFormData.password.trim() ||
      !selectedSocietyId
    ) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    api.post('/users', {
      username: userFormData.username,
      mobileNumber: userFormData.mobileNumber,
      email: userFormData.email,
      password: userFormData.password,
      firstName: userFormData.firstName || undefined,
      lastName: userFormData.lastName || undefined,
      profileTitle: userFormData.profileTitle || undefined,
      profileDetail: userFormData.profileDetail || undefined,
      profileImageUrl: userFormData.profileImageUrl || undefined,
      floorNo: userFormData.floorNo || undefined,
      city: userFormData.city || undefined,
      state: userFormData.state || undefined,
      country: userFormData.country || undefined,
      pincode: userFormData.pincode || undefined,
      role: userFormData.role,
      isActive: userFormData.isActive,
      societyId: parseInt(selectedSocietyId, 10),
      buildingIds: ['BUILDING_ADMIN', 'OPERATOR', 'VIEWER'].includes(userFormData.role)
        ? userFormData.buildingIds
        : []
    })
      .then(() => {
        fetchUsers(selectedSocietyId);
        setUserFormData({
          username: '',
          mobileNumber: '',
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          profileTitle: '',
          profileDetail: '',
          profileImageUrl: '',
          floorNo: '',
          city: '',
          state: '',
          country: '',
          pincode: '',
          role: 'VIEWER',
          isActive: true,
          buildingIds: []
        });
        setIsUserFormOpen(false);
      })
      .catch(err => {
        console.error('Failed to add user:', err);
        alert(err.response?.data?.message || 'Failed to add user');
      });
  };

  const handleEditUser = () => {
    if (!editingUser || !userFormData.username.trim() || !userFormData.mobileNumber.trim() || !userFormData.email.trim()) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    const payload: any = {
      username: userFormData.username,
      mobileNumber: userFormData.mobileNumber,
      email: userFormData.email,
      firstName: userFormData.firstName || undefined,
      lastName: userFormData.lastName || undefined,
      profileTitle: userFormData.profileTitle || undefined,
      profileDetail: userFormData.profileDetail || undefined,
      profileImageUrl: userFormData.profileImageUrl || undefined,
      floorNo: userFormData.floorNo || undefined,
      city: userFormData.city || undefined,
      state: userFormData.state || undefined,
      country: userFormData.country || undefined,
      pincode: userFormData.pincode || undefined,
      role: userFormData.role,
      isActive: userFormData.isActive,
      buildingIds: ['BUILDING_ADMIN', 'OPERATOR', 'VIEWER'].includes(userFormData.role)
        ? userFormData.buildingIds
        : []
    };

    if (userFormData.password.trim() !== '') {
      payload.password = userFormData.password;
    }

    api.put(`/users/${editingUser.id}`, payload)
      .then(() => {
        fetchUsers(selectedSocietyId);
        setEditingUser(null);
        setUserFormData({
          username: '',
          mobileNumber: '',
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          profileTitle: '',
          profileDetail: '',
          profileImageUrl: '',
          floorNo: '',
          city: '',
          state: '',
          country: '',
          pincode: '',
          role: 'VIEWER',
          isActive: true,
          buildingIds: []
        });
        setIsUserFormOpen(false);
      })
      .catch(err => {
        console.error('Failed to edit user:', err);
        alert(err.response?.data?.message || 'Failed to edit user');
      });
  };

  const handleDeleteUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this user?')) return;
    api.delete(`/users/${id}`)
      .then(() => {
        fetchUsers(selectedSocietyId);
      })
      .catch(err => console.error('Failed to delete user:', err));
  };

  // Find names for breadcrumbs
  const currentSocietyName = societies.find(s => s.id === selectedSocietyId)?.name || '';
  const currentTowerName = towers.find(t => t.id === selectedTowerId)?.name || '';

  // Filtered devices based on top-right search input query
  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDevices = devices.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.deviceId?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  return (
    <>
      <div className="h-[calc(100vh-8rem)] bg-transparent -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 text-gray-900 relative flex flex-col md:flex-row gap-6">
      
      {/* LEFT SIDEBAR: MASTER VIEW */}
      <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden h-full">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Building2 className="text-emerald-600" size={18} />
            <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">Hierarchy</span>
          </div>
          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
            <button
              onClick={() => setIsAddSocietyOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-full text-[10px] font-bold text-white transition-all shadow-sm"
            >
              <Plus size={12} /> Society
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {societies.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs italic">No societies found</div>
          ) : (
            societies.map(soc => (
              <div key={soc.id} className="flex flex-col">
                {/* Society Row */}
                <div 
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedSocietyId === soc.id ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50 border border-transparent'}`}
                  onClick={() => {
                    if (selectedSocietyId === soc.id) {
                      setSelectedSocietyId('');
                      localStorage.removeItem('admin_selected_society');
                      setSelectedTowerId('');
                      localStorage.removeItem('admin_selected_tower');
                    } else {
                      setSelectedSocietyId(soc.id);
                      localStorage.setItem('admin_selected_society', soc.id);
                      setSelectedTowerId('');
                      localStorage.removeItem('admin_selected_tower');
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${selectedSocietyId === soc.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
                      <Building2 size={16} />
                    </div>
                    <span className={`text-sm font-bold truncate max-w-[150px] transition-colors ${selectedSocietyId === soc.id ? 'text-emerald-900' : 'text-gray-700'}`}>{soc.name}</span>
                  </div>
                  <ChevronRight size={16} className={`transition-transform ${selectedSocietyId === soc.id ? 'rotate-90 text-emerald-600' : 'text-gray-300'}`} />
                </div>
                
                {/* Towers List (Expanded if selected) */}
                {selectedSocietyId === soc.id && (
                  <div className="pl-11 pr-2 py-2 space-y-1 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Towers</span>
                      {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAddTowerOpen(true);
                          }}
                          className="text-emerald-600 hover:text-emerald-700 p-1 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                    
                    {loadingTowers ? (
                      <div className="text-xs text-gray-400 py-2">Loading towers...</div>
                    ) : towers.length === 0 ? (
                      <div className="text-xs text-gray-400 italic py-2">No towers found</div>
                    ) : (
                      towers.map(tower => (
                        <div
                          key={tower.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedTowerId === tower.id ? 'bg-gray-100/80 font-bold text-gray-900 shadow-sm border border-gray-200' : 'hover:bg-gray-50 text-gray-600 font-medium border border-transparent'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedTowerId === tower.id) {
                              setSelectedTowerId('');
                              localStorage.removeItem('admin_selected_tower');
                            } else {
                              setSelectedTowerId(tower.id);
                              localStorage.setItem('admin_selected_tower', tower.id);
                            }
                          }}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${selectedTowerId === tower.id ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          <span className="text-xs truncate">{tower.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT MAIN AREA: DETAIL VIEW */}
      <div className="flex-1 flex flex-col bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden h-full min-w-0">
        {!selectedSocietyId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/30">
            <div className="w-24 h-24 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-6">
              <Building2 size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Welcome to Admin Panel</h3>
            <p className="text-sm max-w-sm">Select a society from the left sidebar to view its details, manage towers, devices, and user access.</p>
          </div>
        ) : !selectedTowerId ? (
          // Society Details & User Management
          <div className="flex flex-col h-full bg-gray-50/30">
            <div className="p-8 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold select-none mb-4">
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">All Societies</span>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="text-gray-900 font-bold">{currentSocietyName}</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{currentSocietyName}</h2>
                  <p className="text-sm text-gray-500 mt-1">Manage society details, settings, and users.</p>
                </div>
                <div className="flex items-center gap-3">
                  {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                    <>
                      <button
                        onClick={() => {
                          const soc = societies.find(s => s.id === selectedSocietyId);
                          if (soc) {
                            setEditSocietyData(soc);
                            setIsEditSocietyOpen(true);
                          }
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-700 transition-all shadow-sm flex items-center gap-2"
                      >
                        <Pencil size={14} /> Edit Society
                      </button>
                      <button
                        onClick={(e) => handleDeleteSociety(selectedSocietyId, e)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Society Users Section */}
            <div className="flex-1 flex flex-col min-h-0 m-6 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 gap-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                  <Users size={16} className="text-emerald-600" /> Users Access List
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all w-full sm:w-64"
                    />
                  </div>
                  <button
                    onClick={() => setIsUserFormOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={14} /> Add User
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                
                <table className="w-full text-left text-sm text-gray-500">
                  <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-extrabold tracking-wider">User</th>
                      <th className="px-6 py-4 font-extrabold tracking-wider">Contact</th>
                      <th className="px-6 py-4 font-extrabold tracking-wider">Role</th>
                      <th className="px-6 py-4 font-extrabold tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right font-extrabold tracking-wider w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-xs">
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-xs italic">
                          No users found in this society.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.profileImageUrl ? (
                                <img src={user.profileImageUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-200">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{user.firstName} {user.lastName}</h4>
                                <p className="text-[10px] text-gray-500 font-medium">@{user.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-gray-900">{user.email}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{user.mobileNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="text-[11px] font-bold text-gray-500 uppercase">{user.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingUser(user);
                                      setUserFormData({ ...userFormData, ...user, password: '', buildingIds: user.buildingIds || [] } as any);
                                      setIsUserFormOpen(true);
                                    }}
                                    className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteUser(user.id, e)}
                                    className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

              </div>
            </div>
          </div>
        ) : (
          // Tower Details & Devices
          <div className="flex flex-col h-full bg-gray-50/30">
            <div className="p-8 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold select-none mb-4">
                <span 
                  className="text-gray-500 hover:text-emerald-600 cursor-pointer transition-colors px-2 py-0.5 rounded hover:bg-emerald-50"
                  onClick={() => {
                    setSelectedTowerId('');
                    localStorage.removeItem('admin_selected_tower');
                  }}
                >
                  {currentSocietyName}
                </span>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded">{currentTowerName}</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{currentTowerName}</h2>
                  <p className="text-sm text-gray-500 mt-1">Manage connected IoT devices in this tower.</p>
                </div>
                <div className="flex items-center gap-3">
                  {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                    <>
                      <button
                        onClick={() => {
                          const tow = towers.find(t => t.id === selectedTowerId);
                          if (tow) {
                            setEditTowerData(tow);
                            setIsEditTowerOpen(true);
                          }
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-700 transition-all shadow-sm flex items-center gap-2"
                      >
                        <Pencil size={14} /> Edit Tower
                      </button>
                      <button
                        onClick={(e) => handleDeleteTower(selectedTowerId, e)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Devices Section */}
            <div className="flex-1 flex flex-col min-h-0 m-6 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 gap-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                  <Wifi size={16} className="text-emerald-600" /> Connected Devices
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search devices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all w-full sm:w-64"
                    />
                  </div>
                  <button
                    onClick={() => setIsAddDeviceOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={14} /> Add Device
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                
                <table className="w-full text-left text-sm text-gray-500">
                  <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-extrabold tracking-wider">Device Details</th>
                      <th className="px-6 py-4 font-extrabold tracking-wider">MAC Address</th>
                      <th className="px-6 py-4 font-extrabold tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right font-extrabold tracking-wider w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loadingDevices ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-xs">
                          Loading devices...
                        </td>
                      </tr>
                    ) : filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium text-xs">
                          No devices found for this tower.
                        </td>
                      </tr>
                    ) : (
                      filteredDevices.map(dev => (
                        <tr key={dev.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {
                            setSelectedActionDevice(dev);
                            setIsDeviceActionSheetOpen(true);
                          }}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                <Wifi size={16} />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{dev.name}</h4>
                                <p className="text-[10px] text-gray-400 font-medium">{dev.deviceId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-xs font-mono text-gray-500">{dev.macType || '-'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${dev.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                              <span className="text-[11px] font-bold text-gray-500 uppercase">{dev.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SOCIETY_ADMIN') && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditDeviceData(dev);
                                      setIsEditDeviceOpen(true);
                                    }}
                                    className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteDevice(dev.id, e)}
                                    className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

              </div>
            </div>
          </div>
        )}
      </div>

    </div>

      {/* --- MODALS --- */}

      {/* Add Society Modal */}
      {isAddSocietyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setIsAddSocietyOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Add New Society</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Society Name</label>
                <input
                  type="text"
                  placeholder="e.g. AGC House"
                  value={newSociety.name}
                  onChange={(e) => setNewSociety(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Pune"
                  value={newSociety.city}
                  onChange={(e) => setNewSociety(prev => ({ ...prev, city: e.target.value }))}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <button
                onClick={handleAddSociety}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                Create Society
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Society Modal */}
      {isEditSocietyOpen && editSocietyData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => { setEditSocietyData(null); setIsEditSocietyOpen(false); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Edit Society</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Society Name</label>
                <input
                  type="text"
                  value={editSocietyData.name}
                  onChange={(e) => setEditSocietyData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">City</label>
                <input
                  type="text"
                  value={editSocietyData.city}
                  onChange={(e) => setEditSocietyData(prev => prev ? ({ ...prev, city: e.target.value }) : null)}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <button
                onClick={handleEditSociety}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tower Modal */}
      {isAddTowerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setIsAddTowerOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Add New Tower</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Tower Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tower D"
                  value={newTower.name}
                  onChange={(e) => setNewTower(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Floors / Flats Info</label>
                <input
                  type="text"
                  placeholder="e.g. 14F - 120 flats"
                  value={newTower.info}
                  onChange={(e) => setNewTower(prev => ({ ...prev, info: e.target.value }))}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <button
                onClick={handleAddTower}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                Create Tower
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tower Modal */}
      {isEditTowerOpen && editTowerData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => { setEditTowerData(null); setIsEditTowerOpen(false); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Edit Tower</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Tower Name</label>
                <input
                  type="text"
                  value={editTowerData.name}
                  onChange={(e) => setEditTowerData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Floors / Flats Info</label>
                <input
                  type="text"
                  value={editTowerData.info}
                  onChange={(e) => setEditTowerData(prev => prev ? ({ ...prev, info: e.target.value }) : null)}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <button
                onClick={handleEditTower}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setIsAddDeviceOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Add New Device</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Device Name</label>
                <input
                  type="text"
                  placeholder="e.g. SUB SOIL PUMP-02"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Device ID / Serial</label>
                <input
                  type="text"
                  placeholder="e.g. 2026050902"
                  value={newDevice.deviceId}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, deviceId: e.target.value }))}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Application</label>
                <input
                  type="text"
                  value={newDevice.application}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, application: e.target.value }))}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Pump Type</label>
                <input
                  type="text"
                  value={newDevice.pumpType}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, pumpType: e.target.value }))}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <button
                onClick={handleAddDevice}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                Create Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {isEditDeviceOpen && editDeviceData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => { setEditDeviceData(null); setIsEditDeviceOpen(false); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Edit Device</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Device Name</label>
                <input
                  type="text"
                  value={editDeviceData.name}
                  onChange={(e) => setEditDeviceData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Device ID / Serial</label>
                <input
                  type="text"
                  value={editDeviceData.deviceId}
                  onChange={(e) => setEditDeviceData(prev => prev ? ({ ...prev, deviceId: e.target.value }) : null)}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Application</label>
                <input
                  type="text"
                  value={editDeviceData.application}
                  onChange={(e) => setEditDeviceData(prev => prev ? ({ ...prev, application: e.target.value }) : null)}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase pl-1">Pump Type</label>
                <input
                  type="text"
                  value={editDeviceData.pumpType}
                  onChange={(e) => setEditDeviceData(prev => prev ? ({ ...prev, pumpType: e.target.value }) : null)}
                  className="bg-gray-50 border border-gray-300 focus:border-green-500 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
              <button
                onClick={handleEditDevice}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Drawer Panel */}
      

      {/* User Form Modal (Add / Edit) */}
      {isUserFormOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950/95 border border-gray-200 rounded-[24px] p-6 w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.7)] hover:shadow-[0_20px_50px_rgba(6,182,212,0.15)] relative backdrop-blur-xl text-gray-900 flex flex-col max-h-[85vh] transition-all duration-300">
            <button
              onClick={() => setIsUserFormOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="p-2.5 bg-cyan-500/10 text-green-600 rounded-xl">
                <UserIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">
                  {editingUser ? 'Edit Society User' : 'Add New User'}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">
                  {editingUser ? 'Update access permissions and profile details' : 'Configure credentials and profile info'}
                </p>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-gray-50 border border-gray-100 rounded-xl mb-5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setUserFormTab('credentials')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                  userFormTab === 'credentials'
                    ? 'bg-cyan-600 text-gray-900 shadow-lg shadow-cyan-600/20'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/5'
                }`}
              >
                <Sliders size={14} />
                Access & Role
              </button>
              <button
                type="button"
                onClick={() => setUserFormTab('profile')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                  userFormTab === 'profile'
                    ? 'bg-cyan-600 text-gray-900 shadow-lg shadow-cyan-600/20'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/5'
                }`}
              >
                <UserIcon size={14} />
                Profile & Address
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
              <AnimatePresence mode="wait">
                {userFormTab === 'credentials' ? (
                  <motion.div
                    key="credentials"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4 py-1"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Username *</label>
                      <input
                        type="text"
                        placeholder="e.g. johndoe"
                        value={userFormData.username}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Email Address *</label>
                      <input
                        type="email"
                        placeholder="e.g. john@example.com"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Mobile Number *</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 9876543210"
                        value={userFormData.mobileNumber}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                        className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">
                        Password {editingUser ? '(Leave blank to keep current)' : '*'}
                      </label>
                      <input
                        type="password"
                        placeholder={editingUser ? "••••••••" : "Enter password"}
                        value={userFormData.password}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">User Role</label>
                      <div className="relative">
                        <select
                          value={userFormData.role}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value }))}
                          className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none transition-all cursor-pointer appearance-none"
                        >
                          {currentUser?.role === 'SUPER_ADMIN' && (
                            <option value="SUPER_ADMIN" className="bg-zinc-950">Super Admin (SUPER_ADMIN)</option>
                          )}
                          <option value="SOCIETY_ADMIN" className="bg-zinc-950">Society Admin (SOCIETY_ADMIN)</option>
                          <option value="BUILDING_ADMIN" className="bg-zinc-950">Building Admin (BUILDING_ADMIN)</option>
                          <option value="OPERATOR" className="bg-zinc-950">Operator (OPERATOR)</option>
                          <option value="VIEWER" className="bg-zinc-950">Viewer (VIEWER)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                          <svg className="fill-current h-3.5 w-3.5" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {['BUILDING_ADMIN', 'OPERATOR', 'VIEWER'].includes(userFormData.role) && (
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Assigned Buildings *</label>
                        <div className="max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                          <div className="grid grid-cols-2 gap-2">
                            {towers.map(t => {
                              const isChecked = userFormData.buildingIds.includes(parseInt(t.id, 10));
                              return (
                                <label
                                  key={t.id}
                                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                                    isChecked
                                      ? 'bg-green-50 border-green-200 text-gray-900 shadow-[0_0_12px_rgba(6,182,212,0.05)]'
                                      : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-zinc-200'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const idNum = parseInt(t.id, 10);
                                      setUserFormData(prev => {
                                        const newIds = e.target.checked
                                          ? [...prev.buildingIds, idNum]
                                          : prev.buildingIds.filter(id => id !== idNum);
                                        return { ...prev, buildingIds: newIds };
                                      });
                                    }}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                                      isChecked
                                        ? 'border-cyan-500 bg-cyan-600 text-gray-900'
                                        : 'border-zinc-700 bg-gray-50'
                                    }`}
                                  >
                                    {isChecked && (
                                      <svg
                                        className="w-2 h-2 fill-current text-gray-900 stroke-2"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-bold">{t.name}</span>
                                </label>
                              );
                            })}
                          </div>
                          {towers.length === 0 && (
                            <p className="text-[10px] text-gray-400 italic text-center p-3 border border-gray-100 rounded-xl bg-gray-50/20">No buildings available in this society</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-gray-100">
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Is Active Status</span>
                        <span className="text-[10px] text-gray-400 font-medium">Toggle user platform access</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={userFormData.isActive}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-gray-100 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-white peer-checked:after:translate-x-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]" />
                      </label>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4 py-1"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">First Name</label>
                        <input
                          type="text"
                          placeholder="John"
                          value={userFormData.firstName}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Last Name</label>
                        <input
                          type="text"
                          placeholder="Doe"
                          value={userFormData.lastName}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Profile Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Electrician, Resident"
                        value={userFormData.profileTitle}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, profileTitle: e.target.value }))}
                        className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Profile Detail</label>
                      <input
                        type="text"
                        placeholder="e.g. In charge of subsoil pump maintenance"
                        value={userFormData.profileDetail}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, profileDetail: e.target.value }))}
                        className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Profile Image URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/photo.jpg"
                        value={userFormData.profileImageUrl}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, profileImageUrl: e.target.value }))}
                        className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Floor No</label>
                        <input
                          type="text"
                          placeholder="e.g. 5th Floor"
                          value={userFormData.floorNo}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, floorNo: e.target.value }))}
                          className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Pincode</label>
                        <input
                          type="text"
                          placeholder="e.g. 411001"
                          value={userFormData.pincode}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, pincode: e.target.value }))}
                          className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">City</label>
                        <input
                          type="text"
                          placeholder="Pune"
                          value={userFormData.city}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">State</label>
                        <input
                          type="text"
                          placeholder="MH"
                          value={userFormData.state}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase pl-1 tracking-wider">Country</label>
                        <input
                          type="text"
                          placeholder="India"
                          value={userFormData.country}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, country: e.target.value }))}
                          className="w-full bg-gray-50/40 border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-gray-900 placeholder-zinc-700 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Footer */}
            {userFormTab === 'credentials' ? (
              <div className="border-t border-gray-100 pt-4 mt-5 flex justify-between items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsUserFormOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 hover:border-zinc-500 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={editingUser ? handleEditUser : handleAddUser}
                    className="px-5 py-2.5 border border-cyan-500/30 hover:border-cyan-500/80 rounded-xl text-xs font-bold text-green-600 hover:text-cyan-300 transition-all cursor-pointer"
                  >
                    {editingUser ? 'Save' : 'Create Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFormTab('profile')}
                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] rounded-xl text-xs font-bold text-gray-900 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] cursor-pointer"
                  >
                    Next: Profile Info
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-4 mt-5 flex justify-between items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setUserFormTab('credentials')}
                  className="px-5 py-2.5 border border-gray-200 hover:border-zinc-500 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={editingUser ? handleEditUser : handleAddUser}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] rounded-xl text-xs font-bold text-gray-900 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] cursor-pointer"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Device Action Sheet (Bottom Drawer) */}
      <AnimatePresence>
        {isDeviceActionSheetOpen && selectedActionDevice && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeviceActionSheetOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
            />
            {/* Slide up sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white/98 border-t border-gray-200 backdrop-blur-2xl z-50 rounded-t-[32px] p-6 pb-8 flex flex-col shadow-2xl max-w-lg mx-auto"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

              {/* Title Section */}
              <div className="text-center pb-4 border-b border-gray-200 mb-5">
                <h3 className="text-sm font-extrabold text-gray-900 tracking-widest uppercase mb-1">
                  {selectedActionDevice.name}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium tracking-wider">
                  DEVICE ID: {selectedActionDevice.deviceId}
                </p>
              </div>

              {/* Options List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 mb-6 custom-scrollbar">
                {[
                  {
                    id: 'config-editor',
                    title: 'Config Editor',
                    desc: 'Configure device settings and parameters',
                    icon: <Settings className="w-5 h-5" />,
                    onClick: () => showToast('Config Editor is coming soon!'),
                    color: 'text-gray-600',
                    bg: 'bg-white/5 hover:bg-white/10 border-gray-100 hover:border-gray-200'
                  },
                  {
                    id: 'device-settings',
                    title: 'Device Settings',
                    desc: 'Manage device state and data fetching',
                    icon: <Sliders className="w-5 h-5" />,
                    onClick: () => {
                      setEditDeviceData(selectedActionDevice);
                      setIsEditDeviceOpen(true);
                      setIsDeviceActionSheetOpen(false);
                    },
                    color: 'text-gray-600',
                    bg: 'bg-white/5 hover:bg-white/10 border-gray-100 hover:border-gray-200'
                  },
                  {
                    id: 'view-configer',
                    title: 'View Configer',
                    desc: 'Customize view settings and switch titles',
                    icon: <LayoutGrid className="w-5 h-5" />,
                    onClick: () => showToast('View Configer is coming soon!'),
                    color: 'text-gray-600',
                    bg: 'bg-white/5 hover:bg-white/10 border-gray-100 hover:border-gray-200'
                  },
                  {
                    id: 'edit-screen-view',
                    title: 'Edit Screen View',
                    desc: 'Customise the device screen layout for this device only',
                    icon: <FileEdit className="w-5 h-5" />,
                    onClick: () => showToast('Edit Screen View is coming soon!'),
                    color: 'text-gray-600',
                    bg: 'bg-white/5 hover:bg-white/10 border-gray-100 hover:border-gray-200'
                  },
                  {
                    id: 'user-preferences',
                    title: 'User Preferences',
                    desc: 'Manage user-specific settings',
                    icon: <UserIcon className="w-5 h-5" />,
                    onClick: () => showToast('User Preferences is coming soon!'),
                    color: 'text-gray-600',
                    bg: 'bg-white/5 hover:bg-white/10 border-gray-100 hover:border-gray-200'
                  },
                  {
                    id: 'mqtt-debugger',
                    title: 'MQTT Debugger',
                    desc: 'Monitor live device data and logs',
                    icon: <Cpu className="w-5 h-5" />,
                    onClick: () => {
                      setIsDeviceActionSheetOpen(false);
                      navigate(`/devices/${selectedActionDevice.deviceId}`);
                    },
                    color: 'text-gray-600',
                    bg: 'bg-white/5 hover:bg-white/10 border-gray-100 hover:border-gray-200'
                  },
                  {
                    id: 'delete-device',
                    title: 'Delete Device',
                    desc: 'Permanently remove device from this tower',
                    icon: <Trash2 className="w-5 h-5" />,
                    onClick: () => {
                      if (window.confirm(`Are you sure you want to delete ${selectedActionDevice.name}?`)) {
                        const dummyEvent = { stopPropagation: () => {} } as any;
                        handleDeleteDevice(selectedActionDevice.id, dummyEvent);
                        setIsDeviceActionSheetOpen(false);
                      }
                    },
                    color: 'text-red-400',
                    bg: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/10 hover:border-red-500/20'
                  }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={opt.onClick}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all active:scale-[0.99] cursor-pointer ${opt.bg}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 bg-gray-50 rounded-xl ${opt.color}`}>
                        {opt.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 tracking-wide">{opt.title}</h4>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => setIsDeviceActionSheetOpen(false)}
                className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 transition-all active:scale-[0.98] cursor-pointer text-center"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-50 border border-white/15 px-5 py-3 rounded-full text-xs font-bold text-gray-900 shadow-2xl backdrop-blur-xl z-[60] flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
