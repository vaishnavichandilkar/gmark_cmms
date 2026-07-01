import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';

export function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to change password. Please check your current password.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-8rem)] bg-black -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 pb-12 text-white relative font-sans flex flex-col justify-center items-center">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />

      {/* Centered Container wrapper */}
      <div className="w-full max-w-lg relative z-10 flex flex-col items-center">
        {/* Header section (centered text) */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 uppercase">
            Security & Access
          </h1>
          <p className="text-sm font-semibold text-zinc-400">
            Update your credentials and manage account authentication settings.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <div className="liquid-glass border border-white/10 rounded-[28px] p-8 shadow-2xl">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Password Updated</h2>
                <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                  Your password has been changed successfully. You can now use your new password for future logins.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-[0.98] cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </motion.div>
            ) : (
              <>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-start gap-3"
                  >
                    <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="flex-1 py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
