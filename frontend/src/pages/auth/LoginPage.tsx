import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User, ShieldAlert, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { setCredentials } from '../../store/slices/authSlice';
import Logo4M from '../../assets/4MLogo.png';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const dispatch = useDispatch();



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      const { user, accessToken, refreshToken, buildingIds } = response.data;

      dispatch(setCredentials({ user, accessToken, refreshToken, buildingIds, rememberMe }));
      navigate('/', { replace: true });
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.message) {
        if (Array.isArray(errorData.message)) {
          setError(errorData.message.join(', '));
        } else {
          setError(errorData.message);
        }
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[420px] px-2 sm:px-4 z-10"
      >
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <img src={Logo4M} alt="4M Logo" className="h-14 sm:h-16 object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Welcome back</h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">Sign in to control & monitor your systems</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-xl">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-3"
            >
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                USERNAME OR EMAIL
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      rememberMe
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-300 bg-white group-hover:border-gray-400'
                    }`}
                  >
                    {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
                <span className="text-xs text-gray-600 select-none">Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all focus:outline-none active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-green-600 font-semibold hover:underline">
                Sign Up
              </Link>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
