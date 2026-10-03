import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Check, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  CreditCard, 
  MapPin, 
  Hash, 
  Lock, 
  Eye, 
  EyeOff,
  UserCheck,
  CheckCircle2,
  Briefcase,
  Globe
} from 'lucide-react';
import { api } from '../../lib/api';
import Logo4M from '../../assets/4MLogo.png';

export function SignUpPage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    // Company Details
    companyName: '',
    businessCategory: '',
    gstNumber: '',
    address: '',
    postalCode: '',
    city: '',
    state: '',
    country: 'India',

    // Personal Details
    fullName: '',
    designation: '',
    email: '',
    phoneNumber: '',

    // Password & Security
    password: '',
    termsAccepted: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let updatedVal: any = type === 'checkbox' ? checked : value;
    
    if (name === 'gstNumber') {
      updatedVal = value.toUpperCase().replace(/\s+/g, '');
    }

    if (name === 'phoneNumber') {
      updatedVal = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData(prev => ({ ...prev, [name]: updatedVal }));

    // Clear field-level error when user starts correcting
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  // Frontend validation helper
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Company Details Validation
    if (!formData.companyName || !formData.companyName.trim()) {
      errors.companyName = 'Please enter company name.';
    }

    if (!formData.businessCategory || !formData.businessCategory.trim()) {
      errors.businessCategory = 'Please select business category.';
    }

    const trimmedGst = formData.gstNumber.trim();
    if (!trimmedGst) {
      errors.gstNumber = 'Please enter a valid GST number.';
    } else {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(trimmedGst)) {
        errors.gstNumber = 'Please enter a valid GST number.';
      }
    }

    if (!formData.address || !formData.address.trim()) {
      errors.address = 'Please enter complete company address.';
    }

    const trimmedPostal = formData.postalCode.trim();
    if (!trimmedPostal) {
      errors.postalCode = 'Please enter a valid postal code.';
    } else if (formData.country === 'India' && !/^\d{6}$/.test(trimmedPostal)) {
      errors.postalCode = 'Please enter a valid postal code.';
    }

    if (!formData.city || !formData.city.trim()) {
      errors.city = 'Please enter city.';
    }

    if (!formData.state || !formData.state.trim()) {
      errors.state = 'Please select state.';
    }

    if (!formData.country || !formData.country.trim()) {
      errors.country = 'Please select country.';
    }

    // 2. Personal Details Validation
    if (!formData.fullName || !formData.fullName.trim()) {
      errors.fullName = 'Please enter your full name.';
    }

    if (!formData.designation || !formData.designation.trim()) {
      errors.designation = 'Please enter your designation.';
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      errors.email = 'Please enter a valid email address.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address.';
      }
    }

    const trimmedPhone = formData.phoneNumber.trim();
    if (!trimmedPhone) {
      errors.phoneNumber = 'Please enter a valid phone number.';
    } else if (trimmedPhone.length !== 10 || !/^\d{10}$/.test(trimmedPhone)) {
      errors.phoneNumber = 'Please enter a valid 10-digit phone number.';
    }

    // 3. Password Validation
    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    // 4. Terms Validation
    if (!formData.termsAccepted) {
      errors.termsAccepted = 'Please accept Terms & Conditions.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      // Scroll to top error or first field error
      return;
    }

    setLoading(true);

    const fullPhoneNumber = formData.phoneNumber.trim();
    
    // Construct structured payload as specified in Master Prompt
    const payload = {
      company: {
        companyName: formData.companyName.trim(),
        businessCategory: formData.businessCategory.trim(),
        gstNumber: formData.gstNumber.trim().toUpperCase(),
        address: formData.address.trim(),
        postalCode: formData.postalCode.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim()
      },
      personal: {
        fullName: formData.fullName.trim(),
        designation: formData.designation.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: fullPhoneNumber
      },
      // Top-level aliases for compatibility
      companyName: formData.companyName.trim(),
      businessCategory: formData.businessCategory.trim(),
      gstNumber: formData.gstNumber.trim().toUpperCase(),
      address: formData.address.trim(),
      postalCode: formData.postalCode.trim(),
      zipCode: formData.postalCode.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      country: formData.country.trim(),
      fullName: formData.fullName.trim(),
      designation: formData.designation.trim(),
      workEmail: formData.email.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      phoneNumber: fullPhoneNumber,
      password: formData.password,
      termsAccepted: formData.termsAccepted
    };

    try {
      await api.post('/auth/signup', payload);
      setSuccessMessage('Registration successful! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      const responseData = err.response?.data;
      const message = responseData?.message;

      if (message) {
        const errorText = Array.isArray(message) ? message.join(', ') : message;
        
        // Map backend duplicate error messages directly to specific fields
        if (errorText.toLowerCase().includes('gst')) {
          setFieldErrors(prev => ({ ...prev, gstNumber: 'This GST number is already registered.' }));
          setGlobalError('This GST number is already registered.');
        } else if (errorText.toLowerCase().includes('email')) {
          setFieldErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
          setGlobalError('This email is already registered.');
        } else {
          setGlobalError(errorText);
        }
      } else {
        setGlobalError('Registration failed. Please verify your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Postal code auto-lookup for India PIN code
  useEffect(() => {
    const fetchLocation = async () => {
      const pin = formData.postalCode.trim();
      if (formData.country === 'India' && pin.length === 6 && /^\d+$/.test(pin)) {
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
          const data = await response.json();
          if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            setFormData(prev => ({
              ...prev,
              city: prev.city || postOffice.District || postOffice.Block || postOffice.Region || '',
              state: prev.state || postOffice.State || ''
            }));
          }
        } catch (err) {
          console.error('Error fetching PIN location:', err);
        }
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchLocation();
    }, 400);
    
    return () => clearTimeout(timeoutId);
  }, [formData.postalCode, formData.country]);

  const inputClasses = (hasError?: boolean) => 
    `w-full px-4 py-3 bg-white border ${
      hasError ? 'border-red-400 focus:border-red-500 ring-1 ring-red-400' : 'border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500'
    } rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none transition-all`;

  const inputWithIconClasses = (hasError?: boolean) =>
    `w-full pl-10 pr-4 py-3 bg-white border ${
      hasError ? 'border-red-400 focus:border-red-500 ring-1 ring-red-400' : 'border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500'
    } rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none transition-all`;

  const labelClasses = "block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center";
  const iconClasses = "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none";
  const sectionHeaderClasses = "flex items-center gap-2.5 pb-3 mb-5 border-b border-gray-100 text-gray-900 font-bold text-base";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans py-10 px-4">
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-200/40 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[920px] z-10"
      >
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={Logo4M} alt="4M Solution Logo" className="h-20 object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Create Your Account</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            Register your company and admin details to access the IoT platform
          </p>
        </div>

        {/* Form Container Card */}
        <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-gray-200/60 backdrop-blur-sm">
          
          {/* Global Alert Notification */}
          <AnimatePresence>
            {globalError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-8 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3 shadow-sm"
              >
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                <span className="font-medium">{globalError}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-3 shadow-sm"
              >
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-10" noValidate>
            
            {/* ========================================================================= */}
            {/* SECTION A: COMPANY DETAILS */}
            {/* ========================================================================= */}
            <div className="bg-slate-50/70 border border-gray-200/80 rounded-2xl p-6 sm:p-7 transition-all hover:border-gray-300">
              <div className={sectionHeaderClasses}>
                <div className="p-2 rounded-xl bg-green-100/80 text-green-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Company Details</h2>
                  <p className="text-xs text-gray-500 font-normal">Enter your business information and tax details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                
                {/* 1. Company Name */}
                <div>
                  <label className={labelClasses}>
                    Company Name<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className={iconClasses} />
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Enter company name"
                      className={inputWithIconClasses(!!fieldErrors.companyName)}
                    />
                  </div>
                  {fieldErrors.companyName && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.companyName}</p>
                  )}
                </div>

                {/* 2. Business Category */}
                <div>
                  <label className={labelClasses}>
                    Business Category<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className={iconClasses} />
                    <input
                      type="text"
                      name="businessCategory"
                      value={formData.businessCategory}
                      onChange={handleChange}
                      placeholder="Enter business category"
                      className={inputWithIconClasses(!!fieldErrors.businessCategory)}
                    />
                  </div>
                  {fieldErrors.businessCategory && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.businessCategory}</p>
                  )}
                </div>

                {/* 3. GST Number */}
                <div className="md:col-span-2">
                  <label className={labelClasses}>
                    GST Number<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className={iconClasses} />
                    <input
                      type="text"
                      name="gstNumber"
                      maxLength={15}
                      value={formData.gstNumber}
                      onChange={handleChange}
                      placeholder="Enter GST number (e.g. 27ABCDE1234F1Z5)"
                      className={`${inputWithIconClasses(!!fieldErrors.gstNumber)} uppercase tracking-wide font-mono text-sm`}
                    />
                  </div>
                  {fieldErrors.gstNumber ? (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.gstNumber}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-gray-400">15-character GSTIN format</p>
                  )}
                </div>

                {/* 4. Address (Full Width - FIRST) */}
                <div className="md:col-span-2">
                  <label className={labelClasses}>
                    Address<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      name="address"
                      rows={2}
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter company address details..."
                      className={`${inputClasses(!!fieldErrors.address)} resize-none py-2.5`}
                    />
                  </div>
                  {fieldErrors.address && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.address}</p>
                  )}
                </div>

                {/* 5. Postal Code */}
                <div>
                  <label className={labelClasses}>
                    Postal Code<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Hash className={iconClasses} />
                    <input
                      type="text"
                      name="postalCode"
                      maxLength={6}
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="Enter postal code"
                      className={inputWithIconClasses(!!fieldErrors.postalCode)}
                    />
                  </div>
                  {fieldErrors.postalCode && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.postalCode}</p>
                  )}
                </div>

                {/* 6. City */}
                <div>
                  <label className={labelClasses}>
                    City<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className={iconClasses} />
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter city"
                      className={inputWithIconClasses(!!fieldErrors.city)}
                    />
                  </div>
                  {fieldErrors.city && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.city}</p>
                  )}
                </div>

                {/* 7. State */}
                <div>
                  <label className={labelClasses}>
                    State<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className={iconClasses} />
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Enter state"
                      className={inputWithIconClasses(!!fieldErrors.state)}
                    />
                  </div>
                  {fieldErrors.state && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.state}</p>
                  )}
                </div>

                {/* 8. Country */}
                <div>
                  <label className={labelClasses}>
                    Country<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Globe className={iconClasses} />
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Enter country"
                      className={inputWithIconClasses(!!fieldErrors.country)}
                    />
                  </div>
                  {fieldErrors.country && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.country}</p>
                  )}
                </div>

              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION B: PERSONAL DETAILS */}
            {/* ========================================================================= */}
            <div className="bg-slate-50/70 border border-gray-200/80 rounded-2xl p-6 sm:p-7 transition-all hover:border-gray-300">
              <div className={sectionHeaderClasses}>
                <div className="p-2 rounded-xl bg-green-100/80 text-green-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Personal Details</h2>
                  <p className="text-xs text-gray-500 font-normal">Account administrator contact and login details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                
                {/* 1. Full Name */}
                <div>
                  <label className={labelClasses}>
                    Full Name<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <User className={iconClasses} />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      className={inputWithIconClasses(!!fieldErrors.fullName)}
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.fullName}</p>
                  )}
                </div>

                {/* 2. Designation */}
                <div>
                  <label className={labelClasses}>
                    Designation<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <UserCheck className={iconClasses} />
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="Enter designation"
                      className={inputWithIconClasses(!!fieldErrors.designation)}
                    />
                  </div>
                  {fieldErrors.designation && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.designation}</p>
                  )}
                </div>

                {/* 3. Email Address */}
                <div>
                  <label className={labelClasses}>
                    Email Address<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Mail className={iconClasses} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter email address"
                      className={inputWithIconClasses(!!fieldErrors.email)}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.email}</p>
                  )}
                </div>

                {/* 4. Phone Number */}
                <div>
                  <label className={labelClasses}>
                    Phone Number<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Phone className={iconClasses} />
                    <input
                      type="tel"
                      name="phoneNumber"
                      maxLength={10}
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                      className={inputWithIconClasses(!!fieldErrors.phoneNumber)}
                    />
                  </div>
                  {fieldErrors.phoneNumber && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.phoneNumber}</p>
                  )}
                </div>

              </div>
            </div>

            {/* ========================================================================= */}
            {/* PASSWORD AND ACCOUNT SECURITY */}
            {/* ========================================================================= */}
            <div className="bg-slate-50/70 border border-gray-200/80 rounded-2xl p-6 sm:p-7">
              <div>
                <label className={labelClasses}>
                  Password<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Lock className={iconClasses} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`${inputWithIconClasses(!!fieldErrors.password)} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.password}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-gray-400">Min 8 chars, uppercase, lowercase, numbers & special chars</p>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* FOOTER ACTIONS AND TERMS */}
            {/* ========================================================================= */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-gray-100 gap-4">
              
              {/* Terms & Conditions Checkbox */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        formData.termsAccepted
                          ? 'bg-green-600 border-green-600 shadow-sm'
                          : fieldErrors.termsAccepted 
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300 bg-white group-hover:border-gray-400'
                      }`}
                    >
                      {formData.termsAccepted && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 select-none font-medium leading-normal">
                    I accept the <a href="#terms" onClick={(e) => e.preventDefault()} className="text-green-600 hover:underline font-semibold">Terms & Conditions</a> and <a href="#privacy" onClick={(e) => e.preventDefault()} className="text-green-600 hover:underline font-semibold">Privacy Policy</a>
                    <span className="text-red-500 ml-1">*</span>
                  </span>
                </label>
                {fieldErrors.termsAccepted && (
                  <p className="mt-1.5 text-xs text-red-500 font-semibold">{fieldErrors.termsAccepted}</p>
                )}
              </div>

              {/* Sign Up Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-[220px] py-3.5 px-6 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-500/50 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>

            </div>

          </form>
          
          {/* Sign In Navigation Link */}
          <div className="mt-8 text-center pt-6 border-t border-gray-100">
            <span className="text-sm text-gray-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 font-bold hover:underline transition-colors">
                Sign In
              </Link>
            </span>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
