import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Mail, Shield, Building2, Key, LogOut, ArrowLeft } from 'lucide-react';
import { logout, setUser } from '../../store/slices/authSlice';
import { api } from '../../lib/api';
import type { RootState } from '../../store';

export function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, buildingIds } = useSelector((state: RootState) => state.auth);

  if (!user) return null;

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      dispatch(logout());
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-8rem)] bg-black -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 pb-12 text-white relative font-sans flex flex-col justify-center items-center">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_50%)] pointer-events-none" />

      {/* Centered Container wrapper */}
      <div className="w-full max-w-lg relative z-10 flex flex-col items-center">
        {/* Header section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 uppercase">
            User Profile
          </h1>
          <p className="text-sm font-semibold text-zinc-400">
            View your credentials and manage your account settings.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <div className="liquid-glass border border-white/10 rounded-[28px] p-8 shadow-2xl relative overflow-hidden">
            {/* Soft background glows inside the card */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* User Avatar Section */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.35)] mb-4">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-3xl font-black uppercase">
                  {user.name ? user.name[0] : 'U'}
                </div>
              </div>

              {/* User Name & Role */}
              <h2 className="text-white font-black text-xl tracking-wide leading-tight">{user.name}</h2>
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 text-purple-300">
                {user.role === 'SUPER_ADMIN' ? 'Admin' : (user.designation || user.employee?.designation || '')}
              </span>

              {/* Detail fields list */}
              <div className="w-full mt-8 space-y-4">
                {/* Email address field */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3.5 px-4 py-3 bg-black/40 border border-white/10 rounded-xl">
                    <Mail size={16} className="text-zinc-500 shrink-0" />
                    <span className="text-sm text-white select-all font-medium truncate">{user.email}</span>
                  </div>
                </div>

                {/* Society details */}
                {user.societyName && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                      Associated Society
                    </label>
                    <div className="flex items-center gap-3.5 px-4 py-3 bg-black/40 border border-white/10 rounded-xl">
                      <Building2 size={16} className="text-zinc-500 shrink-0" />
                      <span className="text-sm text-white font-medium truncate">{user.societyName}</span>
                    </div>
                  </div>
                )}

                {/* Building details */}
                {buildingIds && buildingIds.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                      Assigned Buildings
                    </label>
                    <div className="flex items-center gap-3.5 px-4 py-3 bg-black/40 border border-white/10 rounded-xl">
                      <Shield size={16} className="text-zinc-500 shrink-0" />
                      <span className="text-sm text-white font-medium">
                        {buildingIds.length} Building{buildingIds.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}
                {/* System Module Access Package Selection */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Active System Package Access
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'CMMS', label: 'CMMS Only' },
                      { id: 'IOT', label: 'IoT SCADA' },
                      { id: 'BOTH', label: 'Both (Full)' }
                    ].map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={async () => {
                          try {
                            const updatedUser = { ...user, moduleAccess: pkg.id };
                            dispatch(setUser(updatedUser));
                            await api.patch('/auth/module-access', { moduleAccess: pkg.id });
                          } catch (err) {
                            console.error('Failed to update module access:', err);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                          (user.moduleAccess || 'BOTH') === pkg.id
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                            : 'bg-black/40 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {pkg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-8 pt-4 border-t border-white/5 space-y-3">
                <button
                  onClick={() => navigate('/change-password')}
                  className="w-full py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Key size={16} />
                  Change Password
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full py-3.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 hover:text-red-100 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <LogOut size={16} />
                  Logout Account
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-purple-600/10 hover:shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <ArrowLeft size={16} />
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
