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
  Globe,
  Wrench,
  Cpu,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { api } from '../../lib/api';
import Logo4M from '../../assets/4MLogo.png';
import { validateGSTIN } from '../../utils/gstValidation';
import { fetchLocationByPincode } from '../../utils/pincodeService';

export function SignUpPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
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
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);

  // Clear errors when switching between steps so new step starts fresh without red highlights
  useEffect(() => {
    setFieldErrors({});
    setGlobalError(null);
  }, [currentStep]);

  // Post Sign-Up Package Selection Modal States
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<'CMMS' | 'IOT' | 'BOTH'>('BOTH');
  const [registeredAuthData, setRegisteredAuthData] = useState<any>(null);
  const [launching, setLaunching] = useState(false);

  const [gstChecking, setGstChecking] = useState(false);
  const [gstAvailability, setGstAvailability] = useState<{ checkedGst: string; available: boolean; message: string } | null>(null);

  useEffect(() => {
    const trimmed = formData.gstNumber.trim().toUpperCase();
    if (trimmed.length === 15) {
      const val = validateGSTIN(trimmed);
      if (val.isValid) {
        let isCancelled = false;
        setGstChecking(true);
        const timer = setTimeout(async () => {
          try {
            const res = await api.get(`/auth/check-gst?gstNumber=${encodeURIComponent(trimmed)}`);
            if (!isCancelled) {
              setGstAvailability({ checkedGst: trimmed, available: res.data.available, message: res.data.message });
              if (!res.data.available) {
                setFieldErrors(prev => ({ ...prev, gstNumber: 'This GST number is already registered.' }));
              } else {
                setFieldErrors(prev => {
                  const copy = { ...prev };
                  if (copy.gstNumber === 'This GST number is already registered.') {
                    delete copy.gstNumber;
                  }
                  return copy;
                });
              }
            }
          } catch (e) {
            console.error('Failed to check GST availability', e);
          } finally {
            if (!isCancelled) setGstChecking(false);
          }
        }, 350);

        return () => {
          isCancelled = true;
          clearTimeout(timer);
        };
      } else {
        setGstAvailability(null);
      }
    } else {
      setGstAvailability(null);
    }
  }, [formData.gstNumber]);

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

  // Step 1: Company Details Validation
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.companyName || !formData.companyName.trim()) {
      errors.companyName = 'Please enter company name.';
    }
    if (!formData.businessCategory || !formData.businessCategory.trim()) {
      errors.businessCategory = 'Please select business category.';
    }
    const trimmedGst = formData.gstNumber.trim().toUpperCase();
    if (!trimmedGst) {
      errors.gstNumber = 'Please enter a valid GST number.';
    } else {
      const gstValidation = validateGSTIN(trimmedGst);
      if (!gstValidation.isValid) {
        errors.gstNumber = gstValidation.error || 'Please enter a valid GST number.';
      } else if (gstAvailability && gstAvailability.checkedGst === trimmedGst && !gstAvailability.available) {
        errors.gstNumber = 'This GST number is already registered.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2: Address Details Validation
  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
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
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 3: Personal Details & Security Validation
  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};
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
    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }
    if (!formData.termsAccepted) {
      errors.termsAccepted = 'Please accept Terms & Conditions.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = async () => {
    if (isStepTransitioning) return;
    setGlobalError(null);
    if (currentStep === 1) {
      if (!validateStep1()) return;

      const trimmedGst = formData.gstNumber.trim().toUpperCase();
      try {
        setGstChecking(true);
        const checkRes = await api.get(`/auth/check-gst?gstNumber=${encodeURIComponent(trimmedGst)}`);
        if (!checkRes.data.available) {
          setFieldErrors(prev => ({ ...prev, gstNumber: 'This GST number is already registered.' }));
          setGstAvailability({ checkedGst: trimmedGst, available: false, message: 'This GST number is already registered.' });
          return;
        }
        setGstAvailability({ checkedGst: trimmedGst, available: true, message: 'GST number is available.' });
      } catch (e) {
        console.error('Failed to verify GST uniqueness', e);
      } finally {
        setGstChecking(false);
      }

      setIsStepTransitioning(true);
      setFieldErrors({});
      // Pre-fill State in Step 2 from validated GSTIN if state is empty
      const gstResult = validateGSTIN(formData.gstNumber);
      if (gstResult.isValid && gstResult.stateName && !formData.state) {
        setFormData(prev => ({ ...prev, state: gstResult.stateName || prev.state }));
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setIsStepTransitioning(false), 300);
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setIsStepTransitioning(true);
        setFieldErrors({});
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setIsStepTransitioning(false), 300);
      }
    }
  };

  const handlePrevStep = () => {
    if (isStepTransitioning) return;
    setGlobalError(null);
    setFieldErrors({});
    if (currentStep > 1) {
      setIsStepTransitioning(true);
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setIsStepTransitioning(false), 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStepTransitioning) return;
    setGlobalError(null);

    if (currentStep === 1) {
      handleNextStep();
      return;
    }
    if (currentStep === 2) {
      handleNextStep();
      return;
    }

    // Step 3 submission: Validate previous steps first without turning Step 3 red if an earlier step was invalid
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep3()) {
      return;
    }

    setLoading(true);

    const fullPhoneNumber = formData.phoneNumber.trim();
    
    // Construct structured payload as specified in Master Prompt
    const payload = {
      moduleAccess: selectedPackage,
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
      const res = await api.post('/auth/signup', payload);
      setRegisteredAuthData(res.data);
      setShowPackageModal(true);
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

  const handleConfirmPackage = async () => {
    setLaunching(true);
    try {
      if (registeredAuthData?.accessToken) {
        // Update user's chosen package on backend
        try {
          await api.patch('/auth/module-access', { moduleAccess: selectedPackage }, {
            headers: { Authorization: `Bearer ${registeredAuthData.accessToken}` }
          });
        } catch (e) {
          console.error('Error saving package preference:', e);
        }

        const updatedUser = { 
          ...registeredAuthData.user, 
          moduleAccess: selectedPackage 
        };

        dispatch(setCredentials({
          user: updatedUser,
          accessToken: registeredAuthData.accessToken,
          refreshToken: registeredAuthData.refreshToken,
          buildingIds: registeredAuthData.buildingIds || [],
          rememberMe: true
        }));
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Error finalizing onboarding:', err);
      navigate('/dashboard', { replace: true });
    } finally {
      setLaunching(false);
    }
  };

  // Postal code auto-lookup for PIN code
  useEffect(() => {
    const pin = (formData.postalCode || '').trim().replace(/\D/g, '');
    if (pin.length === 6) {
      let isCurrent = true;
      const fetchLocation = async () => {
        try {
          const loc = await fetchLocationByPincode(pin);
          if (loc && isCurrent) {
            setFormData(prev => ({
              ...prev,
              city: loc.city,
              state: loc.state,
              country: loc.country || 'India',
            }));
            setFieldErrors(prev => {
              const copy = { ...prev };
              delete copy.postalCode;
              delete copy.city;
              delete copy.state;
              delete copy.country;
              return copy;
            });
          }
        } catch (err) {
          console.error('Error fetching PIN location:', err);
        }
      };
      
      const timeoutId = setTimeout(fetchLocation, 250);
      return () => {
        isCurrent = false;
        clearTimeout(timeoutId);
      };
    }
  }, [formData.postalCode]);

  const inputClasses = (hasError?: boolean) => 
    `w-full px-3.5 py-2 bg-white border ${
      hasError ? 'border-red-400 focus:border-red-500 ring-1 ring-red-400' : 'border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500'
    } rounded-lg text-gray-900 text-xs sm:text-sm placeholder-gray-400 focus:outline-none transition-all`;

  const inputWithIconClasses = (hasError?: boolean) =>
    `w-full pl-9 pr-3.5 py-2 bg-white border ${
      hasError ? 'border-red-400 focus:border-red-500 ring-1 ring-red-400' : 'border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500'
    } rounded-lg text-gray-900 text-xs sm:text-sm placeholder-gray-400 focus:outline-none transition-all`;

  const labelClasses = "block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center";
  const iconClasses = "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none";
  const sectionHeaderClasses = "flex items-center gap-2 pb-2 mb-3 border-b border-gray-100 text-gray-900 font-bold text-sm sm:text-base";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden font-sans py-3 px-3 sm:py-6 sm:px-4">
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-200/40 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[860px] z-10 my-auto"
      >
        {/* Header Branding */}
        <div className="text-center mb-3 sm:mb-4">
          <div className="flex justify-center mb-2">
            <img src={Logo4M} alt="4M Solution Logo" className="h-10 sm:h-12 object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">Create Your Account</h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            Register your company and admin details to access the IoT platform
          </p>
        </div>

        {/* Form Container Card */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-xl shadow-gray-200/50 backdrop-blur-sm">
          
          {/* Global Alert Notification */}
          <AnimatePresence>
            {globalError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 shadow-sm"
              >
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span className="font-medium">{globalError}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-3 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Multi-Step Stepper Progress Bar */}
          <div className="mb-4 px-1 sm:px-4">
            <div className="relative flex items-center justify-between">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0 rounded-full" />
              <div 
                className="absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 z-0 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              />

              {[
                { number: 1, label: 'Company Details', icon: Building2 },
                { number: 2, label: 'Address Details', icon: MapPin },
                { number: 3, label: 'Personal Details', icon: User },
              ].map((step) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.number;
                const isActive = currentStep === step.number;

                return (
                  <button
                    key={step.number}
                    type="button"
                    onClick={() => {
                      if (step.number < currentStep) {
                        setFieldErrors({});
                        setGlobalError(null);
                        setCurrentStep(step.number as 1 | 2 | 3);
                      }
                    }}
                    className={`relative z-10 flex flex-col items-center group focus:outline-none ${
                      step.number < currentStep ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div 
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${
                        isCompleted
                          ? 'bg-green-600 text-white border-green-600 shadow-md scale-105'
                          : isActive
                          ? 'bg-white text-green-600 border-green-600 shadow-md ring-2 ring-green-100 scale-105'
                          : 'bg-white text-gray-400 border-gray-200'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span 
                      className={`text-[11px] font-bold mt-1 transition-colors hidden sm:block whitespace-nowrap ${
                        isActive ? 'text-green-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      Step {step.number}: {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="sm:hidden text-center mt-2">
              <span className="text-[11px] font-bold text-green-700 bg-green-50 py-1 px-2.5 rounded-full border border-green-200 inline-block">
                Step {currentStep} of 3: {currentStep === 1 ? 'Company Details' : currentStep === 2 ? 'Address Details' : 'Personal Details'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* PAGE 1: COMPANY DETAILS */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-slate-50/70 border border-gray-200/80 rounded-xl p-3.5 sm:p-4 transition-all hover:border-gray-300"
              >
                <div className={sectionHeaderClasses}>
                  <div className="p-1.5 rounded-lg bg-green-100/80 text-green-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Step 1: Company Details</h2>
                    <p className="text-[11px] text-gray-500 font-normal">Enter your business information and tax details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  
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
                      <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.companyName}</p>
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
                      <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.businessCategory}</p>
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
                        placeholder="Enter GST number (e.g. 27AAPFU0939F1ZV)"
                        className={`${inputWithIconClasses(!!fieldErrors.gstNumber)} uppercase tracking-wide font-mono text-xs sm:text-sm`}
                      />
                    </div>
                    {fieldErrors.gstNumber ? (
                      <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.gstNumber}</p>
                    ) : (
                      (() => {
                        const trimmed = formData.gstNumber.trim().toUpperCase();
                        if (trimmed.length === 15) {
                          const result = validateGSTIN(trimmed);
                          if (result.isValid) {
                            if (gstChecking) {
                              return (
                                <p className="mt-1 text-[11px] text-gray-500 font-medium animate-pulse">
                                  Verifying GST uniqueness...
                                </p>
                              );
                            }
                            if (gstAvailability && gstAvailability.checkedGst === trimmed) {
                              if (!gstAvailability.available) {
                                return (
                                  <p className="mt-1 text-[11px] text-red-500 font-semibold">
                                    ❌ This GST number is already registered with another account.
                                  </p>
                                );
                              }
                              return (
                                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>
                                    Valid GSTIN & Available: <strong>{result.stateName} ({result.stateCode})</strong> • {result.panEntityType}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>
                                  Valid GSTIN: <strong>{result.stateName} ({result.stateCode})</strong> • {result.panEntityType}
                                </span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-amber-600 font-medium">
                                <span>⚠ {result.error}</span>
                                {result.expectedCheckDigit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fixed = trimmed.slice(0, 14) + result.expectedCheckDigit;
                                      setFormData(prev => ({ ...prev, gstNumber: fixed }));
                                      if (fieldErrors.gstNumber) {
                                        setFieldErrors(prev => {
                                          const copy = { ...prev };
                                          delete copy.gstNumber;
                                          return copy;
                                        });
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded text-[11px] border border-amber-300 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                  >
                                    Fix check digit to "{result.expectedCheckDigit}"
                                  </button>
                                )}
                              </div>
                            );
                          }
                        }
                        return (
                          <p className="mt-0.5 text-[10px] text-gray-400">
                            15-character GSTIN format (State code + PAN + Entity + Z + Check digit)
                          </p>
                        );
                      })()
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* PAGE 2: ADDRESS DETAILS */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-slate-50/70 border border-gray-200/80 rounded-xl p-3.5 sm:p-4 transition-all hover:border-gray-300"
              >
                <div className={sectionHeaderClasses}>
                  <div className="p-1.5 rounded-lg bg-green-100/80 text-green-700">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Step 2: Address Details</h2>
                    <p className="text-[11px] text-gray-500 font-normal">Enter company address and location details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">

                  {/* 1. Address */}
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
                        className={`${inputClasses(!!fieldErrors.address)} resize-none py-1.5`}
                      />
                    </div>
                    {fieldErrors.address && (
                      <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.address}</p>
                    )}
                  </div>

                  {/* 2. Postal Code */}
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
                      <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.postalCode}</p>
                    )}
                  </div>

                  {/* 3. City */}
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
                      <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.city}</p>
                    )}
                  </div>

                  {/* 4. State */}
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
                      <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.state}</p>
                    )}
                  </div>

                  {/* 5. Country */}
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
                      <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.country}</p>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* PAGE 3: PERSONAL DETAILS & SECURITY */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                {/* Personal Details Card */}
                <div className="bg-slate-50/70 border border-gray-200/80 rounded-xl p-3.5 sm:p-4 transition-all hover:border-gray-300">
                  <div className={sectionHeaderClasses}>
                    <div className="p-1.5 rounded-lg bg-green-100/80 text-green-700">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Step 3: Personal Details</h2>
                      <p className="text-[11px] text-gray-500 font-normal">Account administrator contact and login details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    
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
                        <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.fullName}</p>
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
                        <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.designation}</p>
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
                        <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.email}</p>
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
                        <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.phoneNumber}</p>
                      )}
                    </div>

                  </div>
                </div>

                {/* Password and Security Card */}
                <div className="bg-slate-50/70 border border-gray-200/80 rounded-xl p-3.5 sm:p-4">
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
                        className={`${inputWithIconClasses(!!fieldErrors.password)} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {fieldErrors.password ? (
                      <p className="mt-1 text-[11px] text-red-500 font-semibold">{fieldErrors.password}</p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-gray-400">Min 8 chars, uppercase, lowercase, numbers & special chars</p>
                    )}
                  </div>
                </div>

                {/* Terms & Conditions Checkbox */}
                <div className="p-3 bg-slate-50/50 border border-gray-200/60 rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        name="termsAccepted"
                        checked={formData.termsAccepted}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          formData.termsAccepted
                            ? 'bg-green-600 border-green-600 shadow-sm'
                            : fieldErrors.termsAccepted 
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-300 bg-white group-hover:border-gray-400'
                        }`}
                      >
                        {formData.termsAccepted && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-600 select-none font-medium leading-normal">
                      I accept the <a href="#terms" onClick={(e) => e.preventDefault()} className="text-green-600 hover:underline font-semibold">Terms & Conditions</a> and <a href="#privacy" onClick={(e) => e.preventDefault()} className="text-green-600 hover:underline font-semibold">Privacy Policy</a>
                      <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>
                  {fieldErrors.termsAccepted && (
                    <p className="mt-1 text-[11px] text-red-500 font-semibold ml-6">{fieldErrors.termsAccepted}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP NAVIGATION FOOTER BUTTONS */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <button
                  key="btn-next-step"
                  type="button"
                  onClick={handleNextStep}
                  disabled={isStepTransitioning}
                  className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-500/50 shadow flex items-center gap-1.5 cursor-pointer ml-auto disabled:opacity-50"
                >
                  <span>{currentStep === 1 ? 'Next: Address' : 'Next: Personal Details'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  key="btn-submit-form"
                  type="submit"
                  disabled={loading || isStepTransitioning}
                  className="w-full sm:w-[200px] py-2.5 px-5 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-500/50 shadow disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ml-auto"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign Up</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>

          </form>
          
          {/* Sign In Navigation Link */}
          <div className="mt-3 text-center pt-2.5 border-t border-gray-100">
            <span className="text-xs text-gray-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 font-bold hover:underline transition-colors">
                Sign In
              </Link>
            </span>
          </div>

        </div>
      </motion.div>

      {/* Post Sign-Up System Package Access Selection Modal Overlay */}
      <AnimatePresence>
        {showPackageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 p-6 sm:p-8"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 border border-emerald-200 shadow-sm">
                  <Boxes className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Select Your Products</h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Choose the modules to enable for your workspace
                </p>
              </div>

              {/* Package Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                
                {/* Option 1: CMMS */}
                <div 
                  onClick={() => setSelectedPackage('CMMS')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPackage === 'CMMS'
                      ? 'border-[#00a651] bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <input 
                      type="radio" 
                      name="postPackage" 
                      checked={selectedPackage === 'CMMS'} 
                      onChange={() => setSelectedPackage('CMMS')}
                      className="w-4 h-4 text-[#00a651] focus:ring-[#00a651]"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 mb-1">CMMS</h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Maintenance & Work Orders
                    </p>
                  </div>
                </div>

                {/* Option 2: IoT SCADA */}
                <div 
                  onClick={() => setSelectedPackage('IOT')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPackage === 'IOT'
                      ? 'border-[#00a651] bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <input 
                      type="radio" 
                      name="postPackage" 
                      checked={selectedPackage === 'IOT'} 
                      onChange={() => setSelectedPackage('IOT')}
                      className="w-4 h-4 text-[#00a651] focus:ring-[#00a651]"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 mb-1">IoT SCADA</h3>
                    <p className="text-xs text-gray-500 font-medium">
                      SCADA & Live Monitoring
                    </p>
                  </div>
                </div>

                {/* Option 3: Both (CMMS + IoT) */}
                <div 
                  onClick={() => setSelectedPackage('BOTH')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                    selectedPackage === 'BOTH'
                      ? 'border-[#00a651] bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="absolute -top-3 right-4 px-2.5 py-0.5 bg-[#00a651] text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider shadow-sm">
                    Recommended
                  </span>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <input 
                      type="radio" 
                      name="postPackage" 
                      checked={selectedPackage === 'BOTH'} 
                      onChange={() => setSelectedPackage('BOTH')}
                      className="w-4 h-4 text-[#00a651] focus:ring-[#00a651]"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 mb-1">Both (CMMS + IoT)</h3>
                    <p className="text-xs text-gray-500 font-medium">
                      All Modules Included
                    </p>
                  </div>
                </div>

              </div>

              {/* Confirm Launch Button */}
              <button
                onClick={handleConfirmPackage}
                disabled={launching}
                className="w-full py-3.5 rounded-2xl bg-[#00a651] hover:bg-[#009040] text-white font-extrabold text-base transition-all shadow-lg shadow-green-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {launching ? (
                  <span>Opening Workspace...</span>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
