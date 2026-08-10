import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Check, User, Mail, Phone, Building2, CreditCard, MapPin, Map, Globe, Hash, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/api';
import Logo4M from '../../assets/4MLogo.png';

export function SignUpPage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    phoneNumber: '',
    password: '',
    companyName: '',
    gstNumber: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    termsAccepted: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/signup', formData);
      navigate('/login', { replace: true });
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.message) {
        if (Array.isArray(errorData.message)) {
          setError(errorData.message.join(', '));
        } else {
          setError(errorData.message);
        }
      } else {
        setError('Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLocation = async () => {
      if (formData.zipCode.length === 6 && /^\d+$/.test(formData.zipCode)) {
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${formData.zipCode}`);
          const data = await response.json();
          if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            setFormData(prev => ({
              ...prev,
              city: postOffice.District || postOffice.Block || postOffice.Region || '',
              state: postOffice.State || '',
              country: postOffice.Country || 'India'
            }));
          }
        } catch (err) {
          console.error('Error fetching location', err);
        }
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchLocation();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [formData.zipCode]);

  const inputClasses = "w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all";
  const selectClasses = "w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all appearance-none";
  const labelClasses = "block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2";
  const iconClasses = "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[800px] px-6 z-10"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={Logo4M} alt="4M Logo" className="h-24 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create an account</h1>
          <p className="text-sm text-gray-500 mt-1.5">Sign up to monitor and manage your systems</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl">
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {/* Row 1 */}
              <div>
                <label className={labelClasses}>
                  Full Name<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <User className={iconClasses} />
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className={inputClasses}
                  />
                </div>
              </div>
              <div>
                <label className={labelClasses}>
                  Company Name<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Building2 className={iconClasses} />
                  <input
                    type="text"
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    className={inputClasses}
                  />
                </div>
              </div>
              <div>
                <label className={labelClasses}>
                  Work Email<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Mail className={iconClasses} />
                  <input
                    type="email"
                    name="workEmail"
                    required
                    value={formData.workEmail}
                    onChange={handleChange}
                    placeholder="Enter your work email"
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div>
                <label className={labelClasses}>
                  Phone Number<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Phone className={iconClasses} />
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    pattern="[0-9]{10}"
                    maxLength={10}
                    title="Please enter a valid 10-digit phone number"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className={inputClasses}
                  />
                </div>
              </div>
              <div>
                <label className={labelClasses}>
                  Password<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Lock className={iconClasses} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
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

              {/* Row 3 */}
              <div>
                <label className={labelClasses}>
                  GST Number<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <CreditCard className={iconClasses} />
                  <input
                    type="text"
                    name="gstNumber"
                    required
                    pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
                    maxLength={15}
                    title="Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)"
                    value={formData.gstNumber}
                    onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase();
                      handleChange(e);
                    }}
                    placeholder="Enter GST number"
                    className={inputClasses}
                  />
                </div>
              </div>
              <div>
                <label className={labelClasses}>
                  Zip / Postal Code<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Hash className={iconClasses} />
                  <input
                    type="text"
                    name="zipCode"
                    required
                    pattern="[0-9]{6}"
                    maxLength={6}
                    title="Please enter a valid 6-digit zip code"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="e.g. 411018"
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div>
                <label className={labelClasses}>
                  City<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <MapPin className={iconClasses} />
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className={inputClasses}
                  />
                </div>
              </div>
              <div>
                <label className={labelClasses}>
                  State<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Map className={iconClasses} />
                  <input
                    type="text"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                    className={inputClasses}
                  />
                </div>
              </div>
              <div>
                <label className={labelClasses}>
                  Country<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Globe className={iconClasses} />
                  <input
                    type="text"
                    name="country"
                    required
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="Country"
                    className={inputClasses}
                  />
                </div>
              </div>

            </div>

            {/* Footer Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-2 border-t border-gray-100">
              <label className="flex items-center gap-2.5 cursor-pointer group mb-6 sm:mb-0">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    required
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      formData.termsAccepted
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-300 bg-white group-hover:border-gray-400'
                    }`}
                  >
                    {formData.termsAccepted && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
                <span className="text-xs text-gray-600 select-none font-medium">I accept the Terms & Conditions</span>
              </label>

              <button
                type="submit"
                disabled={loading || !formData.termsAccepted}
                className="w-full sm:w-[200px] py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all focus:outline-none active:scale-[0.98] shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Sign Up'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-8 text-center">
            <span className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 font-semibold hover:underline">
                Sign In
              </Link>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
