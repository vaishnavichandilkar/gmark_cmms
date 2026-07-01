import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, ShieldAlert, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Password reset failed. The token may be invalid or expired.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090b11] relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[440px] px-6 z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 p-0.5 shadow-lg shadow-teal-500/20 mb-4">
            <div className="w-full h-full bg-[#0d111b] rounded-[14px] flex items-center justify-center">
              <span className="text-2xl font-black bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
                H
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create New Password</h1>
          <p className="text-sm text-gray-400 mt-1.5">Enter details to update your credentials</p>
        </div>

        <div className="backdrop-blur-xl bg-black/40 border border-white/5 rounded-2xl p-8 shadow-2xl">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Password Reset Successful</h2>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Your password has been successfully updated. You can now log in with your new credentials.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Go to Login
              </Link>
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

              {!token ? (
                <div className="text-center">
                  <p className="text-sm text-red-400 mb-4">
                    Missing reset token. Please request a new password reset link.
                  </p>
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    Request link
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3 bg-black/30 border border-white/5 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/5 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-medium text-sm transition-all focus:outline-none active:scale-[0.98] shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
