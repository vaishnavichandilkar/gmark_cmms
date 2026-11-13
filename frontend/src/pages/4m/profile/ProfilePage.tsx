import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Shield,
  Key,
  Bell,
  Sliders,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Smartphone,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Building,
  FileText,
  AlertTriangle,
  LogOut,
  Hash,
  ShieldCheck,
  Check,
  X,
  Radio,
  Layers,
  ArrowRight,
  Camera,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { setUser, logout } from '../../../store/slices/authSlice';
import type { RootState } from '../../../store';
import { LogoutConfirmModal } from '../../../components/shared/LogoutConfirmModal';

interface NotificationSettings {
  workOrders: { inApp: boolean; email: boolean };
  schedules: { inApp: boolean; email: boolean };
  preventiveMaintenance: { inApp: boolean; email: boolean };
  breakdownDowntime: { inApp: boolean; email: boolean };
  approvals: { inApp: boolean; email: boolean };
  systemAnnouncements: { inApp: boolean; email: boolean };
}

interface UiPreferences {
  dateFormat: string;
  timeFormat: string;
  timeZone: string;
  theme: string;
}

export function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: authUser } = useSelector((state: RootState) => state.auth);

  // Tab state synced with URL query (?tab=personal|security|notifications|preferences)
  const currentTab = searchParams.get('tab') || 'personal';

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Profile data from backend
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  // Editable form fields
  const [formData, setFormData] = useState({
    fullName: '',
    designation: '',
    department: '',
    phone: '',
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    signOutOtherDevices: false,
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Active sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  // Preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationSettings>({
    workOrders: { inApp: true, email: true },
    schedules: { inApp: true, email: true },
    preventiveMaintenance: { inApp: true, email: false },
    breakdownDowntime: { inApp: true, email: true },
    approvals: { inApp: true, email: true },
    systemAnnouncements: { inApp: true, email: false },
  });

  const [uiPrefs, setUiPrefs] = useState<UiPreferences>({
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24-hour',
    timeZone: 'Asia/Kolkata',
    theme: 'light',
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Logout modal state
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Fetch complete profile on mount
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/profile/me').catch(async () => {
        // Fallback endpoint if needed
        return await api.get('/profile/me');
      });

      if (res.data) {
        setProfile(res.data);
        if (authUser) {
          dispatch(setUser({
            ...authUser,
            fullName: res.data.fullName,
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            profileImageUrl: res.data.profileImageUrl || authUser.profileImageUrl,
            moduleAccess: res.data.moduleAccess || authUser.moduleAccess,
          }));
        }
        setFormData({
          fullName: res.data.fullName || '',
          designation: res.data.designation || '',
          department: res.data.department || '',
          phone: res.data.phone || '',
        });
        if (res.data.preferences?.notificationPrefs) {
          setNotificationPrefs(res.data.preferences.notificationPrefs);
        }
        if (res.data.preferences?.uiPreferences) {
          setUiPrefs(res.data.preferences.uiPreferences);
        }
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await api.get('/api/v1/profile/sessions').catch(async () => {
        return await api.get('/profile/sessions');
      });
      if (res.data?.sessions) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (currentTab === 'security') {
      fetchSessions();
    }
  }, [currentTab]);

  // Handle personal info update
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      toast.error('Full Name must be at least 2 characters');
      return;
    }

    try {
      setSavingProfile(true);
      const payload = {
        fullName: formData.fullName.trim(),
        designation: formData.designation.trim() || undefined,
        department: formData.department.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      };

      const res = await api.patch('/api/v1/profile/me', payload).catch(async () => {
        return await api.patch('/profile/me', payload);
      });

      setProfile(res.data);
      // Update global auth user state for navbar continuity
      if (authUser) {
        dispatch(
          setUser({
            ...authUser,
            fullName: res.data.fullName,
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            designation: res.data.designation,
          }),
        );
      }
      setIsEditing(false);
      toast.success('Profile details updated successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const compressImage = (file: File, maxWidth = 512, maxHeight = 512, quality = 0.85): Promise<{ blob: Blob; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, dataUrl });
              } else {
                reject(new Error('Blob conversion failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    try {
      setUploadingAvatar(true);
      // Client-side optimize/compress to 512x512 avatar to prevent payload size issues
      const { blob, dataUrl } = await compressImage(file, 512, 512, 0.85);

      let newAvatarUrl: string | null = null;
      try {
        const formData = new FormData();
        formData.append('file', blob, 'avatar.jpg');
        const res = await api.post('/api/v1/profile/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        newAvatarUrl = res.data?.profileImageUrl || res.data?.user?.profileImageUrl;
      } catch (uploadErr) {
        // Fallback to lightweight optimized dataUrl via PATCH /me
        const patchRes = await api.patch('/api/v1/profile/me', { profileImageUrl: dataUrl });
        newAvatarUrl = patchRes.data?.profileImageUrl || dataUrl;
      }

      if (newAvatarUrl) {
        setProfile((prev: any) => ({ ...prev, profileImageUrl: newAvatarUrl }));
        dispatch(setUser({ ...authUser, profileImageUrl: newAvatarUrl }));
        toast.success('Profile image updated successfully');
      }
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Password strength checker matching signup rules
  const passwordCriteria = useMemo(() => {
    const pwd = passwordForm.newPassword;
    return {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };
  }, [passwordForm.newPassword]);

  const passwordStrengthScore = useMemo(() => {
    const { minLength, hasUpper, hasLower, hasNumber, hasSpecial } = passwordCriteria;
    let score = 0;
    if (minLength) score += 20;
    if (hasUpper) score += 20;
    if (hasLower) score += 20;
    if (hasNumber) score += 20;
    if (hasSpecial) score += 20;
    return score;
  }, [passwordCriteria]);

  const isPasswordValid = passwordStrengthScore === 100;
  const passwordsMatch =
    passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword;

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!isPasswordValid) {
      toast.error('New password does not meet the industrial security policy');
      return;
    }
    if (!passwordsMatch) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await api.post('/api/v1/profile/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        signOutOtherDevices: passwordForm.signOutOtherDevices,
      }).catch(async () => {
        return await api.post('/profile/change-password', {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          signOutOtherDevices: passwordForm.signOutOtherDevices,
        });
      });

      toast.success(res.data?.message || 'Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        signOutOtherDevices: false,
      });
      // Refresh profile to update passwordChangedAt
      fetchProfile();
      fetchSessions();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update password';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Revoke Other Sessions
  const handleRevokeOtherSessions = async () => {
    try {
      setRevokingSessions(true);
      await api.post('/api/v1/profile/revoke-other-sessions').catch(async () => {
        return await api.post('/profile/revoke-other-sessions');
      });
      toast.success('Signed out of all other active sessions');
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke other sessions');
    } finally {
      setRevokingSessions(false);
    }
  };

  // Handle Notifications preference update
  const handleToggleNotification = async (
    key: keyof NotificationSettings,
    channel: 'inApp' | 'email',
  ) => {
    const updated = {
      ...notificationPrefs,
      [key]: {
        ...notificationPrefs[key],
        [channel]: !notificationPrefs[key][channel],
      },
    };
    setNotificationPrefs(updated);

    try {
      await api.patch('/api/v1/profile/preferences', {
        notificationPrefs: updated,
      }).catch(async () => {
        return await api.patch('/profile/preferences', {
          notificationPrefs: updated,
        });
      });
      toast.success('Notification preferences updated', { id: 'notif-pref-toast' });
    } catch (err) {
      toast.error('Failed to save notification preferences');
    }
  };

  // Handle UI Preferences save
  const handleSaveUiPreferences = async (updates: Partial<UiPreferences>) => {
    const updated = { ...uiPrefs, ...updates };
    setUiPrefs(updated);

    try {
      setSavingPrefs(true);
      await api.patch('/api/v1/profile/preferences', {
        uiPreferences: updated,
      }).catch(async () => {
        return await api.patch('/profile/preferences', {
          uiPreferences: updated,
        });
      });
      toast.success('System preferences saved successfully');
    } catch (err) {
      toast.error('Failed to save system preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Logout handler
  const handleLogoutConfirm = async () => {
    try {
      await api.post('/api/v1/profile/logout').catch(() => null);
    } catch (_) {}
    setLogoutModalOpen(false);
    dispatch(logout());
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return '4M';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Not recorded';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-[#F4F6F5] p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">
            Loading 4M Profile...
          </p>
        </div>
      </div>
    );
  }

  const userRole = profile?.role || authUser?.role || 'USER';
  const roleDisplay =
    userRole === 'SUPER_ADMIN' || userRole === 'SOCIETY_ADMIN' || userRole === 'BUILDING_ADMIN' || userRole.toUpperCase().includes('ADMIN')
      ? 'ADMIN'
      : userRole.toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F6F5] text-slate-800 pb-16 font-sans">
      {/* Top Breadcrumb & Page Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {currentTab === 'security'
                ? 'Change Password'
                : currentTab === 'preferences'
                ? 'System Preferences'
                : currentTab === 'notifications'
                ? 'Notifications'
                : 'Profile'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogoutModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut size={14} className="text-rose-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Profile Summary Banner: Avatar with Image Upload & Name only */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar / Photo with Upload Trigger */}
            <div className="relative group shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />

              <div
                onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#15803D] text-white flex items-center justify-center font-bold text-xl sm:text-2xl tracking-wider shadow-xs border-2 border-emerald-800 overflow-hidden cursor-pointer relative transition-transform duration-150 group-hover:scale-[1.02]"
                title="Click to upload profile photo"
              >
                {uploadingAvatar ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : profile?.profileImageUrl || authUser?.profileImageUrl ? (
                  <img
                    src={profile?.profileImageUrl || authUser?.profileImageUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(profile?.fullName || authUser?.name || profile?.username)
                )}

                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold">
                  <Camera size={18} className="mb-0.5" />
                  <span>Upload</span>
                </div>
              </div>

              {/* Camera Action Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white text-slate-700 border border-slate-200 shadow-xs flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all cursor-pointer"
                title="Upload or change image"
              >
                <Camera size={13} />
              </button>
            </div>

            {/* Name only */}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate tracking-tight">
                {profile?.fullName || authUser?.name || profile?.username || 'Industrial User'}
              </h2>
            </div>
          </div>
        </div>

        {/* TAB 1: PERSONAL INFORMATION */}
        {currentTab === 'personal' && (
          <div className="space-y-6">
            {/* Editable Information Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="pb-4 mb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Personal Details
                </h3>
                <p className="text-xs text-slate-500">
                  Update your primary contact details and identity information
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        disabled={savingProfile}
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                        minLength={2}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-1.5">
                      Designation
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Briefcase size={15} />
                      </div>
                      <input
                        type="text"
                        disabled={savingProfile}
                        value={formData.designation}
                        onChange={(e) =>
                          setFormData({ ...formData, designation: e.target.value })
                        }
                        placeholder="e.g. Senior Plant Engineer"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-1.5">
                      Department
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 size={15} />
                      </div>
                      <input
                        type="text"
                        disabled={savingProfile}
                        value={formData.department}
                        onChange={(e) =>
                          setFormData({ ...formData, department: e.target.value })
                        }
                        placeholder="e.g. Mechanical & Maintenance"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-1.5">
                      Contact Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone size={15} />
                      </div>
                      <input
                        type="tel"
                        disabled={savingProfile}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        fullName: profile?.fullName || '',
                        designation: profile?.designation || '',
                        department: profile?.department || '',
                        phone: profile?.phone || '',
                      });
                    }}
                    disabled={savingProfile}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {savingProfile ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: SECURITY */}
        {currentTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password Form */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
              <div className="pb-4 mb-5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Key size={15} className="text-emerald-700" />
                  <span>Change Account Password</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ensure your account is protected with a strong, industrial-grade password
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-1.5">
                      Current Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Key size={15} />
                      </div>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                        }
                        required
                        placeholder="Enter current password"
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium bg-white text-slate-800 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                      >
                        {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-1.5">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock size={15} />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                        }
                        required
                        placeholder="Enter strong new password"
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium bg-white text-slate-800 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-1.5">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock size={15} />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                        }
                        required
                        placeholder="Re-enter new password"
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium bg-white text-slate-800 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {passwordForm.confirmPassword && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                        {passwordsMatch ? (
                          <>
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Passwords match</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={13} className="text-rose-500" />
                            <span className="text-rose-600 font-semibold">Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sign Out Other Devices Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={passwordForm.signOutOtherDevices}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          signOutOtherDevices: e.target.checked,
                        })
                      }
                      className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800">
                        Sign out of all other active devices after updating password
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Recommended if you suspect unauthorized access or are on a shared terminal
                      </p>
                    </div>
                  </label>
                </div>

                {/* Submit Action Bar */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {changingPassword ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Key size={14} />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                        signOutOtherDevices: false,
                      })
                    }
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {/* Active Sessions & Devices */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Active Devices & Sessions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review logged-in browsers and industrial devices associated with your account
                  </p>
                </div>
                <button
                  onClick={handleRevokeOtherSessions}
                  disabled={revokingSessions}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <LogOut size={13} />
                  <span>{revokingSessions ? 'Revoking...' : 'Sign Out Other Sessions'}</span>
                </button>
              </div>

              {loadingSessions ? (
                <div className="py-6 flex justify-center text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span>Checking active sessions...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                          {sess.device?.includes('Android') || sess.device?.includes('iOS') ? (
                            <Smartphone size={17} />
                          ) : (
                            <Laptop size={17} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {sess.device || 'Industrial Workstation'}
                            </span>
                            {sess.isCurrent && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-emerald-200/60">
                                Current Device
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>IP: {sess.ipAddress}</span>
                            <span>•</span>
                            <span>Last Active: {formatDate(sess.lastActive)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {currentTab === 'notifications' && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                CMMS Event Notification Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Configure your dispatch channels for work order triggers and maintenance alerts
              </p>
            </div>

            {/* Notification Table Header */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="py-2.5 px-4 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                      Industrial Event Trigger
                    </th>
                    <th className="py-2.5 px-4 text-[11px] font-bold tracking-wider text-slate-600 uppercase text-center w-32">
                      In-App Alert
                    </th>
                    <th className="py-2.5 px-4 text-[11px] font-bold tracking-wider text-slate-600 uppercase text-center w-32">
                      Email Dispatch
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {[
                    {
                      key: 'workOrders' as keyof NotificationSettings,
                      title: 'Work Order Assignments',
                      desc: 'Notifications when new work orders are assigned to your profile or department',
                    },
                    {
                      key: 'schedules' as keyof NotificationSettings,
                      title: 'Maintenance Schedule Reminders',
                      desc: 'Upcoming scheduled routine or calibration maintenance alerts',
                    },
                    {
                      key: 'preventiveMaintenance' as keyof NotificationSettings,
                      title: 'Preventive Maintenance (PM) Due Alerts',
                      desc: 'Alerts for impending PM checklist milestones nearing target date',
                    },
                    {
                      key: 'breakdownDowntime' as keyof NotificationSettings,
                      title: 'Breakdown & Machine Downtime Alerts',
                      desc: 'High-priority critical alerts triggered by machine stoppage or SCADA threshold breach',
                    },
                    {
                      key: 'approvals' as keyof NotificationSettings,
                      title: 'Approval Requests & Sign-offs',
                      desc: 'Notifications when work order completions or spares requests require your approval',
                    },
                    {
                      key: 'systemAnnouncements' as keyof NotificationSettings,
                      title: 'System & Plant Announcements',
                      desc: 'Platform updates, maintenance window advisories, and administrative notices',
                    },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{row.title}</span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">{row.desc}</span>
                      </td>

                      {/* In-App Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={notificationPrefs[row.key]?.inApp ?? true}
                          onClick={() => handleToggleNotification(row.key, 'inApp')}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                            (notificationPrefs[row.key]?.inApp ?? true)
                              ? 'bg-[#15803D]'
                              : 'bg-slate-300'
                          }`}
                          title={`Toggle in-app alert for ${row.title}`}
                        >
                          <span
                            className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              (notificationPrefs[row.key]?.inApp ?? true)
                                ? 'translate-x-5.5'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Email Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={notificationPrefs[row.key]?.email ?? false}
                          onClick={() => handleToggleNotification(row.key, 'email')}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                            (notificationPrefs[row.key]?.email ?? false)
                              ? 'bg-[#15803D]'
                              : 'bg-slate-300'
                          }`}
                          title={`Toggle email dispatch for ${row.title}`}
                        >
                          <span
                            className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              (notificationPrefs[row.key]?.email ?? false)
                                ? 'translate-x-5.5'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-600 flex items-center justify-between">
              <span>
                Preferences are auto-saved directly to your user account profile in the database.
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check size={14} /> Synced
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: PREFERENCES */}
        {currentTab === 'preferences' && (
          <div className="space-y-6">
            {/* System Module Access Package Selection */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Active Industrial Modules
                </h3>
                <p className="text-xs text-slate-500">
                  Select active industrial modules (multi-select enabled)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    id: 'CMMS',
                    title: 'CMMS',
                    desc: 'Work orders, schedules, assets hierarchy, and preventive maintenance',
                  },
                  {
                    id: 'IOT',
                    title: 'IoT SCADA',
                    desc: 'Sensor telemetries, device health, alert triggers, and live SCADA',
                  },
                ].map((pkg) => {
                  const currentAccess = profile?.moduleAccess || authUser?.moduleAccess || 'BOTH';
                  const isCmmsActive = currentAccess === 'BOTH' || currentAccess === 'CMMS';
                  const isIotActive = currentAccess === 'BOTH' || currentAccess === 'IOT';
                  const isSelected = pkg.id === 'CMMS' ? isCmmsActive : isIotActive;

                  return (
                    <div
                      key={pkg.id}
                      onClick={async () => {
                        let nextCmms = isCmmsActive;
                        let nextIot = isIotActive;
                        if (pkg.id === 'CMMS') nextCmms = !nextCmms;
                        else nextIot = !nextIot;

                        if (!nextCmms && !nextIot) {
                          toast.error('At least one industrial module must remain selected');
                          return;
                        }

                        const nextAccess = nextCmms && nextIot ? 'BOTH' : nextCmms ? 'CMMS' : 'IOT';
                        if (nextAccess === currentAccess) return;

                        try {
                          const updatedUser = { ...authUser, moduleAccess: nextAccess };
                          dispatch(setUser(updatedUser));
                          setProfile((prev: any) => (prev ? { ...prev, moduleAccess: nextAccess } : prev));
                          await api.patch('/auth/module-access', { moduleAccess: nextAccess });
                          toast.success(
                            nextAccess === 'BOTH'
                              ? 'Both CMMS & IoT SCADA enabled'
                              : nextAccess === 'CMMS'
                              ? 'CMMS enabled'
                              : 'IoT SCADA enabled'
                          );
                        } catch (err) {
                          toast.error('Failed to update module preferences');
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900">{pkg.title}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-[#15803D] text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {pkg.id === 'CMMS' ? 'CMMS' : 'SCADA'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{pkg.desc}</p>
                      </div>
                      <div className="shrink-0 flex items-center">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-lg bg-[#15803D] text-white flex items-center justify-center shadow-xs">
                            <Check size={14} strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg border-2 border-slate-300 bg-white hover:border-slate-400 transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}

