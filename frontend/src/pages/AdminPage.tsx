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
  Shield
} from 'lucide-react';

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
}

export function AdminPage() {
  // --- STATE ---
  const [societies, setSocieties] = useState<Society[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(
    localStorage.getItem('admin_selected_society') || ''
  );

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
  const [isUsersDrawerOpen, setIsUsersDrawerOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
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
    role: 'COMMUNITY_USER',
    isActive: true
  });

  // Modals state
  const [isAddSocietyOpen, setIsAddSocietyOpen] = useState(false);
  const [isEditSocietyOpen, setIsEditSocietyOpen] = useState(false);
  const [isAddTowerOpen, setIsAddTowerOpen] = useState(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);

  // Form states
  const [newSociety, setNewSociety] = useState({ name: '', city: '' });
  const [editSocietyData, setEditSocietyData] = useState<Society | null>(null);
  const [newTower, setNewTower] = useState({ name: '', info: '' });
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
    fetch('http://localhost:3001/societies')
      .then(res => res.json())
      .then(data => {
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
    fetch(`http://localhost:3001/buildings?societyId=${societyId}`)
      .then(res => res.json())
      .then(data => {
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
    fetch(`http://localhost:3001/buildings/${towerId}/devices`)
      .then(res => res.json())
      .then(data => {
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
    fetch(`http://localhost:3001/users?societyId=${societyId}`)
      .then(res => res.json())
      .then(data => {
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
            role: u.role || 'COMMUNITY_USER',
            isActive: u.isActive !== undefined ? u.isActive : true,
            societyId: u.societyId.toString()
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
    fetchSocieties();
  }, [fetchSocieties]);

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
      setIsUsersDrawerOpen(false);
    }
  }, [selectedSocietyId, fetchUsers]);

  // --- ACTIONS ---

  // Societies CRUD
  const handleAddSociety = () => {
    if (!newSociety.name.trim()) return;
    fetch('http://localhost:3001/societies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newSociety.name,
        city: newSociety.city || 'Pune'
      })
    })
      .then(res => {
        if (res.ok) {
          fetchSocieties();
          setNewSociety({ name: '', city: '' });
          setIsAddSocietyOpen(false);
        }
      })
      .catch(err => console.error('Failed to add society:', err));
  };

  const handleEditSociety = () => {
    if (!editSocietyData || !editSocietyData.name.trim()) return;
    fetch(`http://localhost:3001/societies/${editSocietyData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editSocietyData.name,
        city: editSocietyData.city || 'Pune'
      })
    })
      .then(res => {
        if (res.ok) {
          fetchSocieties();
          setEditSocietyData(null);
          setIsEditSocietyOpen(false);
        }
      })
      .catch(err => console.error('Failed to edit society:', err));
  };

  const handleDeleteSociety = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`http://localhost:3001/societies/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (res.ok) {
          fetchSocieties();
          if (selectedSocietyId === id) {
            setSelectedSocietyId('');
            localStorage.removeItem('admin_selected_society');
            setSelectedTowerId('');
            localStorage.removeItem('admin_selected_tower');
          }
        }
      })
      .catch(err => console.error('Failed to delete society:', err));
  };

  // Towers CRUD
  const handleAddTower = () => {
    if (!newTower.name.trim() || !selectedSocietyId) return;
    fetch('http://localhost:3001/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTower.name,
        info: newTower.info || '0F - 0 flats',
        societyId: parseInt(selectedSocietyId, 10)
      })
    })
      .then(res => {
        if (res.ok) {
          fetchTowers(selectedSocietyId);
          setNewTower({ name: '', info: '' });
          setIsAddTowerOpen(false);
        }
      })
      .catch(err => console.error('Failed to add tower:', err));
  };

  const handleDeleteTower = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`http://localhost:3001/buildings/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (res.ok) {
          if (selectedSocietyId) {
            fetchTowers(selectedSocietyId);
          }
          if (selectedTowerId === id) {
            setSelectedTowerId('');
            localStorage.removeItem('admin_selected_tower');
          }
        }
      })
      .catch(err => console.error('Failed to delete tower:', err));
  };

  // Devices CRUD
  const handleAddDevice = () => {
    if (!newDevice.name.trim() || !newDevice.deviceId.trim() || !selectedTowerId) return;
    fetch('http://localhost:3001/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newDevice.name,
        deviceId: newDevice.deviceId,
        buildingId: parseInt(selectedTowerId, 10),
        application: newDevice.application,
        pumpType: newDevice.pumpType,
        controller: newDevice.controller,
        macType: newDevice.macType
      })
    })
      .then(res => {
        if (res.ok) {
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
        }
      })
      .catch(err => console.error('Failed to add device:', err));
  };

  const handleEditDevice = () => {
    if (!editDeviceData || !editDeviceData.name.trim()) return;
    fetch(`http://localhost:3001/devices/${editDeviceData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editDeviceData.name,
        deviceId: editDeviceData.deviceId,
        application: editDeviceData.application,
        pumpType: editDeviceData.pumpType,
        controller: editDeviceData.controller,
        macType: editDeviceData.macType
      })
    })
      .then(res => {
        if (res.ok) {
          fetchDevices(selectedTowerId);
          setEditDeviceData(null);
          setIsEditDeviceOpen(false);
        }
      })
      .catch(err => console.error('Failed to edit device:', err));
  };

  const handleDeleteDevice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`http://localhost:3001/devices/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (res.ok) {
          fetchDevices(selectedTowerId);
        }
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

    fetch('http://localhost:3001/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
        societyId: parseInt(selectedSocietyId, 10)
      })
    })
      .then(async res => {
        if (res.ok) {
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
            role: 'COMMUNITY_USER',
            isActive: true
          });
          setIsUserFormOpen(false);
        } else {
          const errorData = await res.json();
          alert(errorData.message || 'Failed to add user');
        }
      })
      .catch(err => console.error('Failed to add user:', err));
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
      isActive: userFormData.isActive
    };

    if (userFormData.password.trim() !== '') {
      payload.password = userFormData.password;
    }

    fetch(`http://localhost:3001/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (res.ok) {
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
            role: 'COMMUNITY_USER',
            isActive: true
          });
          setIsUserFormOpen(false);
        } else {
          const errorData = await res.json();
          alert(errorData.message || 'Failed to edit user');
        }
      })
      .catch(err => console.error('Failed to edit user:', err));
  };

  const handleDeleteUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this user?')) return;
    fetch(`http://localhost:3001/users/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (res.ok) {
          fetchUsers(selectedSocietyId);
        }
      })
      .catch(err => console.error('Failed to delete user:', err));
  };

  // Find names for breadcrumbs
  const currentSocietyName = societies.find(s => s.id === selectedSocietyId)?.name || '';
  const currentTowerName = towers.find(t => t.id === selectedTowerId)?.name || '';

  // Filtered devices based on top-right search input query
  const filteredDevices = devices.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.deviceId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 text-white relative flex flex-col">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        {/* Breadcrumbs / Dynamic Header title */}
        <div className="flex items-center gap-1.5 text-sm font-semibold select-none">
          {selectedSocietyId ? (
            <>
              <span
                className="text-zinc-400 hover:text-white cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedSocietyId('');
                  localStorage.removeItem('admin_selected_society');
                  setSelectedTowerId('');
                  localStorage.removeItem('admin_selected_tower');
                }}
              >
                All
              </span>
              <ChevronRight size={14} className="text-zinc-600" />
              <span
                className={`cursor-pointer transition-colors ${selectedTowerId ? 'text-zinc-400 hover:text-white' : 'text-white font-bold'}`}
                onClick={() => {
                  setSelectedTowerId('');
                  localStorage.removeItem('admin_selected_tower');
                }}
              >
                {currentSocietyName}
              </span>
              {selectedTowerId && (
                <>
                  <ChevronRight size={14} className="text-zinc-600" />
                  <span className="text-white font-bold">{currentTowerName}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-white font-black text-lg">Admin Panel</span>
          )}
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/50 border border-white/5 focus:border-blue-500/50 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none transition-all w-48 sm:w-64"
            />
          </div>
          <button className="p-2 bg-zinc-900/60 border border-white/5 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all">
            <Wrench size={16} />
          </button>
        </div>
      </div>

      {/* 3-Column Core Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-stretch mb-24">

        {/* COLUMN 1: SOCIETIES */}
        <div className="liquid-glass border border-white/5 bg-zinc-950/20 rounded-[20px] p-4 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-amber-500" size={18} />
              <span className="text-xs font-bold text-amber-500 tracking-wider uppercase">Societies</span>
            </div>
            <button
              onClick={() => setIsAddSocietyOpen(true)}
              className="p-1 hover:bg-white/5 border border-white/10 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[580px] custom-scrollbar">
            {societies.map(soc => {
              const isSelected = selectedSocietyId === soc.id;
              return (
                <div
                  key={soc.id}
                  onClick={() => {
                    setSelectedSocietyId(soc.id);
                    localStorage.setItem('admin_selected_society', soc.id);
                    setSelectedTowerId('');
                    localStorage.removeItem('admin_selected_tower');
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${isSelected
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-zinc-900/30 border-white/5 hover:bg-zinc-900/60'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{soc.name}</h4>
                      <p className="text-[10px] text-zinc-500 capitalize">{soc.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditSocietyData(soc);
                        setIsEditSocietyOpen(true);
                      }}
                      className="text-zinc-500 hover:text-white p-1 rounded"
                    >
                      <Pencil size={12} />
                    </button>
                    {soc.id !== '4' && (
                      <button
                        onClick={(e) => handleDeleteSociety(soc.id, e)}
                        className="text-zinc-600 hover:text-red-500 p-1 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <ChevronRight size={14} className={isSelected ? 'text-amber-400' : 'text-zinc-600'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: TOWERS */}
        <div className="liquid-glass border border-white/5 bg-zinc-950/20 rounded-[20px] p-4 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-purple-500" size={18} />
              <span className="text-xs font-bold text-purple-500 tracking-wider uppercase">Towers</span>
            </div>
            {selectedSocietyId && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsUsersDrawerOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 border border-white/10 hover:border-zinc-500 rounded-full text-[10px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  <Users size={10} />
                  Users
                </button>
                <button
                  onClick={() => {
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
                      role: 'COMMUNITY_USER',
                      isActive: true
                    });
                    setIsUserFormOpen(true);
                  }}
                  className="p-1 hover:bg-white/5 border border-white/10 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Add User"
                >
                  <UserPlus size={12} />
                </button>
                <button
                  onClick={() => setIsAddTowerOpen(true)}
                  className="p-1 hover:bg-white/5 border border-white/10 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[580px] custom-scrollbar">
            {!selectedSocietyId ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                &larr; Select a society
              </div>
            ) : loadingTowers ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                Loading towers...
              </div>
            ) : towers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                No towers defined
              </div>
            ) : (
              towers.map(tower => {
                const isSelected = selectedTowerId === tower.id;
                return (
                  <div
                    key={tower.id}
                    onClick={() => {
                      setSelectedTowerId(tower.id);
                      localStorage.setItem('admin_selected_tower', tower.id);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${isSelected
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : 'bg-zinc-900/30 border-white/5 hover:bg-zinc-900/60'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Building2 size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{tower.name}</h4>
                        {tower.info && <p className="text-[10px] text-zinc-500">{tower.info}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tower.id.startsWith('local-') && (
                        <button
                          onClick={(e) => handleDeleteTower(tower.id, e)}
                          className="text-zinc-600 hover:text-red-500 p-1 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <ChevronRight size={14} className={isSelected ? 'text-purple-400' : 'text-zinc-600'} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: DEVICES */}
        <div className="liquid-glass border border-white/5 bg-zinc-950/20 rounded-[20px] p-4 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-emerald-500" size={18} />
              <span className="text-xs font-bold text-emerald-500 tracking-wider uppercase">Devices</span>
            </div>
            {selectedTowerId && (
              <button
                onClick={() => setIsAddDeviceOpen(true)}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-full text-[10px] font-bold text-white transition-all cursor-pointer"
              >
                <Plus size={10} />
                Device
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[580px] custom-scrollbar">
            {!selectedTowerId ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                &larr; Select a tower
              </div>
            ) : loadingDevices ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                Loading devices...
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                No devices found
              </div>
            ) : (
              filteredDevices.map(dev => (
                <div
                  key={dev.id}
                  className="p-4 rounded-xl border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 relative flex flex-col gap-3 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <Wifi size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[11px] text-white uppercase tracking-wider leading-tight">{dev.name}</h4>
                        <p className="text-[9px] text-zinc-500 mt-1 font-medium">@ {dev.deviceId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditDeviceData(dev);
                          setIsEditDeviceOpen(true);
                        }}
                        className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
                        title="Edit Device"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteDevice(dev.id, e)}
                        className="text-zinc-400 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors"
                        title="Delete Device"
                      >
                        <Trash2 size={12} />
                      </button>
                      <span
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ml-1 ${dev.status === 'online'
                            ? 'bg-emerald-500 shadow-[0_0_8px_#10b981,0_0_4px_#10b981]'
                            : 'bg-red-500 shadow-[0_0_8px_#ef4444,0_0_4px_#ef4444]'
                          }`}
                        title={dev.status === 'online' ? 'Online' : 'Offline'}
                      />
                    </div>
                  </div>

                  {/* Metadata tags */}
                  <div className="flex flex-wrap gap-1 text-[9px] font-bold text-zinc-400 select-none">
                    <span className="px-2 py-0.5 bg-zinc-800/80 rounded border border-white/5">{dev.application}</span>
                    <span className="px-2 py-0.5 bg-zinc-800/80 rounded border border-white/5">{dev.pumpType}</span>
                    <span className="px-2 py-0.5 bg-zinc-800/80 rounded border border-white/5">{dev.controller}</span>
                    <span className="px-2 py-0.5 bg-zinc-800/80 rounded border border-white/5">{dev.macType}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* --- MODALS --- */}

      {/* Add Society Modal */}
      {isAddSocietyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setIsAddSocietyOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Add New Society</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Society Name</label>
                <input
                  type="text"
                  placeholder="e.g. AGC House"
                  value={newSociety.name}
                  onChange={(e) => setNewSociety(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Pune"
                  value={newSociety.city}
                  onChange={(e) => setNewSociety(prev => ({ ...prev, city: e.target.value }))}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
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
          <div className="bg-zinc-900 border border-white/10 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => { setEditSocietyData(null); setIsEditSocietyOpen(false); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Edit Society</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Society Name</label>
                <input
                  type="text"
                  value={editSocietyData.name}
                  onChange={(e) => setEditSocietyData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">City</label>
                <input
                  type="text"
                  value={editSocietyData.city}
                  onChange={(e) => setEditSocietyData(prev => prev ? ({ ...prev, city: e.target.value }) : null)}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
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
          <div className="bg-zinc-900 border border-white/10 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setIsAddTowerOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Add New Tower</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Tower Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tower D"
                  value={newTower.name}
                  onChange={(e) => setNewTower(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Floors / Flats Info</label>
                <input
                  type="text"
                  placeholder="e.g. 14F - 120 flats"
                  value={newTower.info}
                  onChange={(e) => setNewTower(prev => ({ ...prev, info: e.target.value }))}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
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

      {/* Add Device Modal */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setIsAddDeviceOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Add New Device</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Device Name</label>
                <input
                  type="text"
                  placeholder="e.g. SUB SOIL PUMP-02"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Device ID / Serial</label>
                <input
                  type="text"
                  placeholder="e.g. 2026050902"
                  value={newDevice.deviceId}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, deviceId: e.target.value }))}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Application</label>
                <input
                  type="text"
                  value={newDevice.application}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, application: e.target.value }))}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Pump Type</label>
                <input
                  type="text"
                  value={newDevice.pumpType}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, pumpType: e.target.value }))}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
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
          <div className="bg-zinc-900 border border-white/10 rounded-[20px] p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => { setEditDeviceData(null); setIsEditDeviceOpen(false); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold mb-4">Edit Device</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Device Name</label>
                <input
                  type="text"
                  value={editDeviceData.name}
                  onChange={(e) => setEditDeviceData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase pl-1">Device ID / Serial</label>
                <input
                  type="text"
                  value={editDeviceData.deviceId}
                  onChange={(e) => setEditDeviceData(prev => prev ? ({ ...prev, deviceId: e.target.value }) : null)}
                  className="bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all"
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
      {isUsersDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsUsersDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          />
          {/* Sliding Panel */}
          <div className="fixed top-0 right-0 h-screen w-full sm:w-[480px] bg-zinc-950/90 border-l border-white/10 backdrop-blur-xl z-50 p-6 flex flex-col shadow-2xl transition-all duration-300 transform translate-x-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Society Users</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">Manage members and access levels</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
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
                      role: 'COMMUNITY_USER',
                      isActive: true
                    });
                    setIsUserFormOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 active:scale-95 rounded-full text-[10px] font-bold text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                >
                  <Plus size={12} />
                  Add User
                </button>
                <button
                  onClick={() => setIsUsersDrawerOpen(false)}
                  className="p-1.5 hover:bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {loadingUsers ? (
                <div className="h-40 flex items-center justify-center text-zinc-500 text-xs">
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-zinc-600 text-xs italic gap-2">
                  <Users size={24} className="text-zinc-700" />
                  No users registered in this society
                </div>
              ) : (
                users.map(user => {
                  const displayName = (user.firstName || user.lastName)
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : user.username;

                  return (
                    <div
                      key={user.id}
                      className={`p-4 rounded-xl border flex items-start justify-between transition-all ${user.isActive
                          ? 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50'
                          : 'border-red-500/10 bg-red-950/5 hover:bg-red-950/10'
                        }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Profile Image / Avatar */}
                        {user.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt={displayName}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 mt-0.5"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center text-xs font-bold border border-cyan-500/20 mt-0.5 uppercase">
                            {displayName.substring(0, 2)}
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-xs text-white truncate uppercase tracking-wider">{displayName}</h4>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${user.isActive
                                  ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                                  : 'bg-red-500'
                                }`}
                              title={user.isActive ? 'Active' : 'Inactive'}
                            />
                          </div>

                          <p className="text-[10px] text-zinc-500 font-medium truncate">@{user.username}</p>

                          {user.profileTitle && (
                            <p className="text-[9px] text-cyan-400/80 font-semibold">{user.profileTitle}</p>
                          )}

                          <div className="flex flex-col gap-0.5 pt-1 text-[10px] text-zinc-400 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Mail size={10} className="text-zinc-600 flex-shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone size={10} className="text-zinc-600 flex-shrink-0" />
                              <span>{user.mobileNumber}</span>
                            </div>
                            {(user.floorNo || user.city) && (
                              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] pt-0.5">
                                <span>{user.floorNo ? `Floor ${user.floorNo}` : ''}</span>
                                {user.floorNo && user.city && <span>•</span>}
                                <span>{user.city || ''}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-1.5">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border ${user.role === 'COMMUNITY_ADMIN'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : user.role === 'COMMUNITY_WORKER'
                                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              }`}>
                              {user.role.replace('COMMUNITY_', '')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setUserFormData({
                              username: user.username,
                              mobileNumber: user.mobileNumber,
                              email: user.email,
                              password: '', // blank by default on edit
                              firstName: user.firstName || '',
                              lastName: user.lastName || '',
                              profileTitle: user.profileTitle || '',
                              profileDetail: user.profileDetail || '',
                              profileImageUrl: user.profileImageUrl || '',
                              floorNo: user.floorNo || '',
                              city: user.city || '',
                              state: user.state || '',
                              country: user.country || '',
                              pincode: user.pincode || '',
                              role: user.role,
                              isActive: user.isActive
                            });
                            setIsUserFormOpen(true);
                          }}
                          className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-white/5 transition-colors"
                          title="Edit User"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteUser(user.id, e)}
                          className="text-zinc-400 hover:text-red-400 p-1.5 rounded hover:bg-white/5 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* User Form Modal (Add / Edit) */}
      {isUserFormOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950/95 border border-white/10 rounded-[28px] p-6 w-full max-w-2xl shadow-2xl relative backdrop-blur-xl text-white flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsUserFormOpen(false)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5 border-b border-white/5 pb-3">
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <UserIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {editingUser ? 'Edit Society User' : 'Add New User'}
                </h3>
                <p className="text-[10px] text-zinc-500">Provide credentials, profile details, and address info</p>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* COLUMN 1: Basic Details & Credentials */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-1">Account & Credentials</h4>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Username *</label>
                    <input
                      type="text"
                      placeholder="e.g. johndoe"
                      value={userFormData.username}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Email Address *</label>
                    <input
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Mobile Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={userFormData.mobileNumber}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">
                      Password {editingUser ? '(Leave blank to keep current)' : '*'}
                    </label>
                    <input
                      type="password"
                      placeholder={editingUser ? "••••••••" : "Enter password"}
                      value={userFormData.password}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">User Role</label>
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="COMMUNITY_USER" className="bg-zinc-900">Community User (COMMUNITY_USER)</option>
                      <option value="COMMUNITY_WORKER" className="bg-zinc-900">Community Worker (COMMUNITY_WORKER)</option>
                      <option value="COMMUNITY_ADMIN" className="bg-zinc-900">Community Admin (COMMUNITY_ADMIN)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/25 border border-white/5 mt-2">
                    <div>
                      <span className="text-xs font-bold text-white block">Is Active Status</span>
                      <span className="text-[9px] text-zinc-500">Toggle whether user can access community features</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={userFormData.isActive}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-white" />
                    </label>
                  </div>

                </div>

                {/* COLUMN 2: Profile & Address Details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-1">Profile & Address Info</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">First Name</label>
                      <input
                        type="text"
                        placeholder="John"
                        value={userFormData.firstName}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Last Name</label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={userFormData.lastName}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Profile Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Electrician, Resident"
                      value={userFormData.profileTitle}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, profileTitle: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Profile Detail</label>
                    <input
                      type="text"
                      placeholder="e.g. In charge of subsoil pump maintenance"
                      value={userFormData.profileDetail}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, profileDetail: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Profile Image URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={userFormData.profileImageUrl}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, profileImageUrl: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Floor No</label>
                      <input
                        type="text"
                        placeholder="e.g. 5th Floor"
                        value={userFormData.floorNo}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, floorNo: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Pincode</label>
                      <input
                        type="text"
                        placeholder="e.g. 411001"
                        value={userFormData.pincode}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, pincode: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">City</label>
                      <input
                        type="text"
                        placeholder="Pune"
                        value={userFormData.city}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">State</label>
                      <input
                        type="text"
                        placeholder="MH"
                        value={userFormData.state}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase pl-1">Country</label>
                      <input
                        type="text"
                        placeholder="India"
                        value={userFormData.country}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Action Footer */}
            <div className="border-t border-white/5 pt-4 mt-5 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsUserFormOpen(false)}
                className="px-5 py-2.5 border border-white/10 hover:border-zinc-500 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={editingUser ? handleEditUser : handleAddUser}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] rounded-xl text-xs font-bold text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] cursor-pointer"
              >
                {editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
